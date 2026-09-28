import {unlimitedAllowance,countsAsRequest} from './allowances.mjs';
import { randomUUID } from 'node:crypto';
import { hash, requireValue } from './domain.mjs';

export const safeJob = j => ({ id:j.id, kind:j.kind, state:j.state, message:j.message, created:j.created, paperId:j.paperId, artifactId:j.artifactId, creditCost:j.credit?.amount || 0 });
export function visibleArtifacts(store, paper, user) {
  return store.db.prepare("SELECT owner,body FROM artifacts WHERE json_extract(body,'$.paperId')=?").all(paper.id)
    .filter(r => paper.visibility === 'public' || r.owner === user?.id)
    .map(r=>({...JSON.parse(r.body),_owner:r.owner})).filter(a=>a.revision===paper.revision&&(a.visibility==='public'||a._owner===user?.id)).map(({_owner,...a})=>a);
}
// The same SQLite transaction owns lookup, creation and subscription. A public
// translation has one job across accounts and processes; private text never shares.
export function requestArtifact(store, config, user, paper, fields) {
  const db=store.db;
  const key=hash(JSON.stringify(['artifact-v3',paper.id,paper.revision,fields.kind,fields.language,fields.sectionId||'',paper.visibility==='public'?'public':user.id]));
  db.exec('BEGIN IMMEDIATE');
  try {
    const previous=visibleArtifacts(store,paper,user).find(a=>a.visibility===paper.visibility&&a.kind===fields.kind&&a.language===fields.language&&(a.sectionId||'')===(fields.sectionId||''));
    let job=store.job(db.prepare('SELECT job FROM artifact_requests WHERE key=?').get(key)?.job || '');
    // Also join in-flight jobs created before v3 or a model configuration change.
    if (!job) job=db.prepare('SELECT j.body FROM artifact_requests r JOIN jobs j ON j.id=r.job WHERE r.paper=? AND r.revision=?').all(paper.id,paper.revision)
      .map(r=>JSON.parse(r.body)).find(j=>j.kind===fields.kind&&j.language===fields.language&&(j.sectionId||'')===(fields.sectionId||'')&&j.visibility===paper.visibility&&(paper.visibility==='public'||j.owner===user.id));
    if(!job) {
      requireValue(unlimitedAllowance(config,user.id) || store.jobs(user.id).filter(j=>j.created>Date.now()-86400_000&&countsAsRequest(j)).length < (config.maxJobsPerUserPerDay||20), 'Today’s request allowance is full. Try tomorrow.',429);
      job={id:randomUUID(),requestedBy:user.id,owner:paper.visibility==='public'?paper.owner:user.id,dedupe:key,created:Date.now(),state:previous?'completed':'queued',message:previous?'Ready':'Waiting to start',paperId:paper.id,revision:paper.revision,visibility:paper.visibility,...fields,...(previous?{artifactId:previous.id}:{})};
      store.saveJob(job);
    }
    db.prepare('INSERT OR REPLACE INTO artifact_requests VALUES(?,?,?,?)').run(key,paper.id,paper.revision,job.id);
    db.prepare('INSERT OR IGNORE INTO job_subscriptions VALUES(?,?)').run(user.id,job.id);
    db.exec('COMMIT');return job;
  } catch(e){db.exec('ROLLBACK');throw e;}
}

// Preserve math, figure references and link targets exactly. The model only
// translates prose. Each durable chunk can be resumed without repeating finished work.
export function translationChunks(text, max=5000) {
  const protectedText=[];
  let prefix='OI'+hash(text).slice(0,12)+'_';while(text.includes('⟦'+prefix))prefix+='x';
  const tokenPattern=new RegExp('⟦'+prefix+'(\\d{6})⟧','g');
  const pattern=/```[\s\S]*?```|\\begin\{(equation\*?|align\*?|gather\*?|math|displaymath)\}[\s\S]*?\\end\{\1\}|\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|(?<!\\)\$(?!\$)(?:\\.|[^$\n])+?(?<!\\)\$|!\[[^\]]*\]\([^\n)]+\)|\\includegraphics(?:\[[^\]]*\])?\{[^}]+\}|\\(?:cite|ref|label)\{[^}]+\}|https?:\/\/[^\s<>"})]+/g;
  const masked=text.replace(pattern,value=>{const token=`⟦${prefix}${String(protectedText.length).padStart(6,'0')}⟧`;protectedText.push(value);return token;});
  const chunks=[];let current='';
  for(const block of masked.split(/(\n\s*\n)/)) {
    let rest=block;
    while(rest.length>max) {
      if(current){chunks.push(current);current='';}
      let split=rest.lastIndexOf(' ',max);if(split<max/2)split=rest.lastIndexOf('\n',max);if(split<1)split=max;
      // Never split a preservation marker.
      const start=rest.lastIndexOf('⟦',split),end=rest.indexOf('⟧',start);if(start>=0&&end>=split)split=start||end+1;
      chunks.push(rest.slice(0,split));rest=rest.slice(split);
    }
    if(current.length+rest.length>max){chunks.push(current);current='';}current+=rest;
  }
  if(current.trim())chunks.push(current);
  return {chunks,example:`⟦${prefix}000000⟧`,restore(output,input){
    const tokens=s=>[...s.matchAll(tokenPattern)].map(m=>m[0]);
    const expected=tokens(input),actual=tokens(output);
    requireValue(expected.length===actual.length&&expected.every((v,i)=>v===actual[i]),'The translation did not preserve every equation and figure. Please retry this section.',502);
    return output.replace(tokenPattern,(_,i)=>protectedText[Number(i)]);
  }};
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Store } from '../server/store.mjs';
import { createApp } from '../server/app.mjs';
import { makePaper, hash } from '../server/domain.mjs';
import { sourceKey, reusablePaper } from '../server/import-reuse.mjs';
import { mathpix } from '../server/providers.mjs';
import { requestArtifact } from '../server/artifacts.mjs';
import { creditSummary, creditTransaction, reserveImport, finishImportCredits } from '../server/credits.mjs';
import { visibleComments } from '../server/community.mjs';

function fixture() {
  const dir=mkdtempSync(join(tmpdir(),'onlyideas-reuse-')),store=new Store(dir);
  return {dir,store,close(){store.close();rmSync(dir,{recursive:true,force:true})}};
}
const source='https://arxiv.org/pdf/2205.01833v2';
const pdf=Buffer.from('%PDF- exact byte identity fixture');
function paper(store,visibility='public') {
  const id=randomUUID();
  store.saveJob({id,owner:'author',kind:'import',dedupe:id,created:Date.now(),state:'completed',sourceDigest:hash(pdf),paperId:id});
  return store.savePaper({...makePaper({id,owner:'author',title:'Shared research',source,language:'en',mmd:'# Research\n\nOriginal prose and $E=mc^2$.\n\n![Figure](figures/a.png)',assets:[{path:'figures/a.png',bytes:3}]}),visibility});
}

test('source aliases preserve arXiv revisions and query parameters that can select other content',()=>{
  assert.equal(sourceKey(source),sourceKey('https://www.arxiv.org/abs/2205.01833v2?utm_source=reading#page=2'));
  assert.notEqual(sourceKey(source),sourceKey('https://arxiv.org/pdf/2205.01833v1'));
  assert.equal(sourceKey(source),sourceKey('https://doi.org/10.48550/arXiv.2205.01833v2'));
  assert.notEqual(sourceKey(source),sourceKey('https://arxiv.org/pdf/2205.01833'));
  assert.notEqual(sourceKey(source),sourceKey(source+'?version=3'));
  assert.notEqual(sourceKey(source),sourceKey('https://arxiv.org.evil.test/pdf/2205.01833v2'));
  assert.equal(sourceKey('https://user:password@arxiv.org/pdf/2205.01833v2'),null);
  assert.equal(sourceKey('https://www.nature.com/articles/s41534-019-0145-z.pdf'),sourceKey('https://www.nature.com/articles/s41534-019-0145-z'));
});

test('readers, uploaded files and agent imports reuse one public paper and its figures with no conversion or credit hold',async()=>{
  const f=fixture(),origin='http://127.0.0.1:4182',config={origin,credits:{enabled:true},agentWorkerToken:'fixture-worker'};
  const p=paper(f.store);mkdirSync(join(f.dir,'papers',p.id,'figures'),{recursive:true});writeFileSync(join(f.dir,'papers',p.id,'figures/a.png'),'PNG');
  const before=f.store.db.prepare('SELECT body FROM papers WHERE id=?').get(p.id).body;
  const app=createApp(f.store,config,{worker:false});await new Promise(r=>app.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.address().port;
  const tokens=Array.from({length:8},(_,i)=>f.store.createSession({id:'reader-'+i,name:'Reader '+i}));
  const call=async(path,{token=tokens[0],method='GET',body,headers={}}={})=>{
    const r=await fetch(base+path,{method,headers:{Origin:origin,Cookie:'onlyideas-local='+token,'Content-Type':'application/json',...headers},...(body!==undefined?{body:Buffer.isBuffer(body)?body:JSON.stringify(body)}:{})});
    return {status:r.status,data:r.headers.get('content-type')?.startsWith('application/json')?await r.json():await r.text()};
  };
  try {
    const results=await Promise.all(tokens.map((token,i)=>call('/api/import',{token,method:'POST',headers:{'X-Request-Id':randomUUID()},body:{url:i%2?source:'https://arxiv.org/abs/2205.01833v2',title:'Another reader label',language:'en',sharing:'shared'}})));
    for(const r of results){assert.equal(r.status,202);assert.equal(r.data.job.state,'completed');assert.equal(r.data.job.paperId,p.id);assert.equal(r.data.job.reused,true);}
    const uploaded=await call('/api/import',{method:'POST',headers:{'Content-Type':'application/pdf','X-Request-Id':randomUUID(),'X-Paper-Title':'Upload','X-Paper-Sharing':'private'},body:pdf});
    assert.equal(uploaded.data.job.paperId,p.id);assert.equal(uploaded.data.job.id,results[0].data.job.id);
    const attached=await call('/api/attachments',{method:'POST',headers:{'Content-Type':'application/pdf','X-File-Name':'paper.pdf'},body:pdf});
    assert.equal(attached.status,202);assert.equal(attached.data.attachment.state,'ready');assert.equal(attached.data.attachment.paperId,p.id);
    assert.equal(existsSync(join(f.dir,'jobs',attached.data.attachment.id)),false);
    const chat=(await call('/api/chats',{method:'POST',body:{}})).data.chat;
    await call('/api/chats/'+chat.id+'/messages',{method:'POST',body:{text:'Explain the equation',attachments:[attached.data.attachment.id]}});
    const task=await fetch(base+'/api/worker/claim',{method:'POST',headers:{Authorization:'Bearer fixture-worker'}}).then(r=>r.json());
    assert.match(task.task.documents[0].text,/E=mc\^2/);
    f.store.db.prepare('INSERT INTO chat_messages VALUES(?,?,?,?,?)').run(randomUUID(),chat.id,'assistant',JSON.stringify({text:'Found',papers:[{id:'found',pdfUrl:source,title:'Research'}]}),Date.now());
    const agent=await call('/api/chats/'+chat.id+'/import',{method:'POST',body:{paperId:'found',sharing:'shared'}});
    assert.equal(agent.data.job.paperId,p.id);assert.equal(agent.data.job.state,'completed');
    assert.equal((await call('/content/'+p.id+'/figures/a.png')).data,'PNG');
    assert.equal(f.store.db.prepare('SELECT count(*) n FROM papers').get().n,1);
    assert.equal(f.store.db.prepare("SELECT count(*) n FROM jobs WHERE state='queued'").get().n,0);
    assert.equal(f.store.db.prepare('SELECT count(*) n FROM credit_holds').get().n,0);
    assert.equal(f.store.db.prepare('SELECT body FROM papers WHERE id=?').get(p.id).body,before);
    assert.equal((await call('/api/import',{method:'POST',headers:{'X-Request-Id':randomUUID()},body:{url:'https://arxiv.org/pdf/2205.01833v1',title:'Different revision'}})).status,202);
    p.visibility='private';f.store.savePaper(p);
    assert.equal((await call('/api/attachments/'+attached.data.attachment.id)).data.attachment.state,'failed');
    assert.equal((await call('/api/papers/'+p.id)).status,404);
  } finally {await new Promise(r=>app.close(r));f.close()}
});

test('private, blocked, suspended and withdrawn papers cannot be reused by other readers; migrations preserve bodies',()=>{
  const f=fixture();try {
    const p=paper(f.store,'private');assert.equal(reusablePaper(f.store,'reader',{url:source}),null);
    assert.equal(reusablePaper(f.store,'author',{url:source}).id,p.id);
    p.visibility='public';f.store.savePaper(p);
    f.store.db.prepare('INSERT INTO blocks VALUES(?,?,?)').run('reader','author','Author');assert.equal(reusablePaper(f.store,'reader',{sourceDigest:hash(pdf)}),null);
    f.store.db.prepare('DELETE FROM blocks').run();f.store.db.prepare('INSERT INTO suspensions VALUES(?,?)').run('author',Date.now());assert.equal(reusablePaper(f.store,'reader',{url:source}),null);
    f.store.db.prepare('DELETE FROM suspensions').run();const before=f.store.db.prepare('SELECT body FROM papers').get().body;
    f.store.db.prepare('DELETE FROM paper_import_keys').run();f.store.db.prepare("DELETE FROM credit_meta WHERE name IN ('paper_import_index_v1','paper_import_index_v2','paper_import_index_v3')").run();const reopened=new Store(f.dir);
    assert.equal(reusablePaper(reopened,'reader',{sourceDigest:hash(pdf)}).id,p.id);assert.equal(reopened.db.prepare('SELECT body FROM papers').get().body,before);reopened.close();
  } finally {f.close()}
});

test('worker rechecks the cache before downloading or calling Mathpix and refunds an earlier reservation',async()=>{
  const f=fixture(),config={credits:{enabled:true},maxPages:30};try {
    const p=paper(f.store),job={id:randomUUID(),owner:'reader',kind:'import',url:source,sharing:'private',dedupe:'late-publication',created:Date.now(),state:'queued'};
    creditTransaction(f.store,()=>{reserveImport(f.store,config,job,30);f.store.saveJob(job)});
    assert.equal(creditSummary(f.store,'reader',config).balance,0);
    const result=await mathpix(job,config,f.store);assert.deepEqual(result,{paperId:p.id,reused:true});
    Object.assign(job,result);creditTransaction(f.store,()=>finishImportCredits(f.store,job,true));assert.equal(creditSummary(f.store,'reader',config).balance,30);
    const uploaded={id:randomUUID(),owner:'reader',kind:'import',created:Date.now(),dedupe:'bytes',state:'queued'};f.store.saveJob(uploaded);
    mkdirSync(join(f.dir,'jobs',uploaded.id),{recursive:true});writeFileSync(join(f.dir,'jobs',uploaded.id,'source.pdf'),pdf);
    assert.deepEqual(await mathpix(uploaded,{mathpix:{appId:'unused',appKey:'unused'}},f.store),result);
    assert.equal(existsSync(join(f.dir,'jobs',uploaded.id,'source.pdf')),false);
  } finally {f.close()}
});

test('changing the model reuses completed and concurrent translations; private artifacts never become public',()=>{
  const f=fixture();try {
    const p=paper(f.store),config={model:{name:'first'}};
    const j=requestArtifact(f.store,config,{id:'reader'},p,{kind:'translation',language:'ja'});
    const other=requestArtifact(f.store,{model:{name:'second'}},{id:'another'},p,{kind:'translation',language:'ja'});assert.equal(other.id,j.id);
    const artifact={id:j.id,paperId:p.id,revision:p.revision,kind:'translation',language:'ja',sectionId:null,visibility:'public',model:'first',text:'Translated'};
    f.store.db.prepare('INSERT INTO artifacts VALUES(?,?,?)').run(j.id,p.owner,JSON.stringify(artifact));f.store.saveJob({...j,state:'completed',artifactId:j.id});
    // A restored artifact without its request row is still reusable.
    f.store.db.prepare('DELETE FROM artifact_requests').run();
    const reused=requestArtifact(f.store,{model:{name:'third'}},{id:'new-reader'},p,{kind:'translation',language:'ja'});assert.equal(reused.state,'completed');assert.equal(reused.artifactId,j.id);
    f.store.db.prepare('UPDATE artifacts SET body=?').run(JSON.stringify({...artifact,visibility:'private',language:'fr'}));
    const fresh=requestArtifact(f.store,config,{id:'author'},p,{kind:'translation',language:'fr'});assert.equal(fresh.state,'queued');assert.equal(fresh.artifactId,undefined);
  } finally {f.close()}
});

test('an import already submitted before the identity migration is never queued twice',async()=>{
  const f=fixture(),origin='http://127.0.0.1:4182',app=createApp(f.store,{origin,mathpix:{appKey:'unused'}},{worker:false});
  await new Promise(r=>app.listen(0,'127.0.0.1',r));
  try {
    const owner='reader',old={id:randomUUID(),owner,kind:'import',url:source,dedupe:'import:'+hash(source),created:Date.now(),state:'running',submittedAt:Date.now(),pdfId:'existing-provider-receipt'};f.store.saveJob(old);
    const token=f.store.createSession({id:owner,name:'Reader'});
    const r=await fetch('http://127.0.0.1:'+app.address().port+'/api/import',{method:'POST',headers:{Origin:origin,Cookie:'onlyideas-local='+token,'Content-Type':'application/json','X-Request-Id':randomUUID()},body:JSON.stringify({url:'https://arxiv.org/abs/2205.01833v2',title:'Research'})});
    assert.equal(r.status,202);assert.equal((await r.json()).job.id,old.id);assert.equal(f.store.db.prepare('SELECT count(*) n FROM jobs').get().n,1);
  } finally {await new Promise(r=>app.close(r));f.close()}
});

test('discussion opens on the latest 200 visible comments in chronological order',()=>{
  const f=fixture();try {
    for(let i=0;i<250;i++) f.store.db.prepare('INSERT INTO comments VALUES(?,?,?,?,?)').run('c'+i,'paper','author',JSON.stringify({id:'c'+i,owner:'author',visibility:'public',moderation:'approved',text:'Comment '+i}),i);
    for(let i=250;i<470;i++) f.store.db.prepare('INSERT INTO comments VALUES(?,?,?,?,?)').run('c'+i,'paper','other',JSON.stringify({id:'c'+i,owner:'other',visibility:'pending',moderation:'pending',text:'Pending'}),i);
    const visible=visibleComments(f.store,'paper',{id:'reader'});assert.equal(visible.length,200);assert.equal(visible[0].id,'c50');assert.equal(visible.at(-1).id,'c249');
  } finally {f.close()}
});

test('verified DOI and retrieved-source aliases reuse one transcript and translation across different indexes',()=>{
 const f=fixture();try{
  const id=randomUUID(),doi='10.1234/event.2024',landing='https://publisher.test/article/'+doi;
  f.store.saveJob({id,owner:'author',kind:'import',dedupe:id,created:Date.now(),state:'completed',url:'https://arxiv.org/pdf/2401.12345',sourcePage:'https://arxiv.org/abs/2401.12345',downloadedFrom:'https://repository.test/event.pdf',metadata:{doi},paperIdentity:{state:'matched',doiMatch:true}});
  const p=f.store.savePaper({...makePaper({id,owner:'author',title:'Event sensor research',source:'https://arxiv.org/pdf/2401.12345',mmd:'Original research prose.'}),visibility:'public'});
  for(const fields of [{url:'https://doi.org/'+doi},{url:landing,metadata:{doi}},{url:'https://repository.test/event.pdf'}])assert.equal(reusablePaper(f.store,'new-reader',fields).id,p.id);
  assert.equal(reusablePaper(f.store,'new-reader',{url:'https://arxiv.org/pdf/2401.12345v2',metadata:{doi}}),null);
  assert.equal(reusablePaper(f.store,'new-reader',{url:'https://arxiv.org/pdf/2401.12345v2',sourcePage:'https://doi.org/'+doi,metadata:{doi}}),null);
  const j=requestArtifact(f.store,{model:{name:'first'}},{id:'reader'},p,{kind:'translation',language:'zh-Hans'});
  const reused=reusablePaper(f.store,'new-reader',{url:landing,metadata:{doi}});
  assert.equal(requestArtifact(f.store,{model:{name:'second'}},{id:'new-reader'},reused,{kind:'translation',language:'zh-Hans'}).id,j.id);
  const raw=f.store.db.prepare('SELECT body FROM papers WHERE id=?').get(id).body;
  f.store.db.prepare("DELETE FROM credit_meta WHERE name='paper_import_index_v3'").run();f.store.db.prepare('DELETE FROM paper_import_keys').run();
  const reopened=new Store(f.dir);assert.equal(reusablePaper(reopened,'third-reader',{url:'https://doi.org/'+doi}).id,id);assert.equal(reopened.db.prepare('SELECT body FROM papers WHERE id=?').get(id).body,raw);reopened.close();
 }finally{f.close()}
});

test('an uploaded or unverified bibliographic DOI cannot poison shared identity aliases',()=>{
 const f=fixture();try{
  for(const uploaded of [false,true]){
   const id=randomUUID(),doi='10.1234/claim.'+uploaded;
   f.store.saveJob({id,owner:'author',kind:'import',dedupe:id,created:Date.now(),state:'completed',metadata:{doi},...(uploaded?{uploadSource:'https://doi.org/'+doi,paperIdentity:{state:'matched',doiMatch:true}}:{})});
   f.store.savePaper({...makePaper({id,owner:'author',title:'Claimed title',source:uploaded?'https://doi.org/'+doi:'https://example.org/'+id,mmd:'Different bytes '+id}),visibility:'public',doi,...(uploaded?{provenance:{userSupplied:true}}:{})});
   assert.equal(reusablePaper(f.store,'reader',{url:'https://doi.org/'+doi}),null);
  }
 }finally{f.close()}
});

test('approved publication runs before a concurrent import so it reuses the finished shared transcript',async()=>{
 const f=fixture();try{
  const p=paper(f.store,'private'),publish={id:randomUUID(),owner:p.owner,kind:'publish',reviewed:true,dedupe:'publish-fixture',paperId:p.id,state:'queued',created:Date.now()};
  const follower={id:randomUUID(),owner:'new-reader',kind:'import',sharing:'shared',url:source,dedupe:'waiting-import',state:'queued',created:publish.created-100};
  f.store.saveJob(follower);f.store.saveJob(publish);
  assert.equal(f.store.claimJob().id,publish.id);
  f.store.savePaper({...p,visibility:'public'});f.store.saveJob({...publish,state:'completed'});
  const next=f.store.claimJob();assert.equal(next.id,follower.id);
  assert.deepEqual(await mathpix(next,{},f.store),{paperId:p.id,reused:true});
 }finally{f.close()}
});

test('the reading room and search show one canonical public work without deleting private or versioned records',async()=>{
 const {libraryPapers,libraryCards}=await import('../server/library-search.mjs');const f=fixture();try{
  const doi='10.1234/same-work',ids=[];
  for(const url of ['https://doi.org/'+doi,'https://arxiv.org/pdf/2401.10000','https://arxiv.org/pdf/2401.10000v2']){
   const id=randomUUID();ids.push(id);f.store.saveJob({id,owner:'author',kind:'import',dedupe:id,created:Date.now(),state:'completed',url,metadata:{doi},paperIdentity:{state:'matched',doiMatch:true}});
   f.store.savePaper({...makePaper({id,owner:'author',title:'The same published work',mmd:'Version '+id,source:url,doi}),visibility:'public'});
  }
  const privateID=randomUUID();f.store.savePaper(makePaper({id:privateID,owner:'reader',title:'Private annotations',mmd:'My personal research',doi}));
  assert.deepEqual(new Set(libraryPapers(f.store,{id:'reader'}).map(p=>p.id)),new Set([ids[0],ids[2],privateID]));
  assert.equal(libraryCards(f.store,null).length,2);assert.equal(f.store.paper(ids[1]).id,ids[1]);
 }finally{f.close()}
});

import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.mjs';import {createApp} from '../server/app.mjs';import {makePaper} from '../server/domain.mjs';
import {respond} from '../worker/paper-agent.mjs';import {generateArtifact} from '../server/providers.mjs';
import {parseCrossref,queryCrossref} from '../server/crossref.mjs';import {rankResearch} from '../server/research-ranking.mjs';import {searchOptions,searchIndexes} from '../server/research-indexes.mjs';
import {checkPaperIdentity} from '../server/pdf-identity.mjs';import {createDiscovery} from '../server/discovery.mjs';

async function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'oi-agent-')),store=new Store(dir),origin='http://127.0.0.1:4182',config={origin,agentWorkerToken:'worker-fixture',model:{url:'https://model.invalid/chat',name:'fixture'},mathpix:{appKey:'fixture'},credits:{enabled:false}};
 const app=createApp(store,config,{worker:false});await new Promise(r=>app.listen(0,'127.0.0.1',r));const token=store.createSession({id:'reader',name:'Reader'}),other=store.createSession({id:'other'});
 const call=async(path,body,who=token,worker=false)=>{const r=await fetch('http://127.0.0.1:'+app.address().port+'/api'+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(worker?{Authorization:'Bearer worker-fixture'}:{Cookie:'onlyideas-local='+who})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()}};
 const chat=(await call('/chats',{})).chat;
 const task=async(text,extra={})=>{await call('/chats/'+chat.id+'/messages',{text,agentActions:true,sharing:'shared',language:'en',...extra});return (await call('/worker/claim',{},token,true)).task};
 const finish=(t,result)=>call('/worker/result',{id:t.id,lease:t.lease,result},token,true);
 return {store,config,call,task,finish,chat,token,other,async close(){await new Promise(r=>app.close(r));store.close();rmSync(dir,{recursive:true,force:true})}};
}
test('one chat request imports, then summarizes a real transcript; retry and history reload reuse durable jobs',async()=>{
 const f=await fixture();try{
  const card={id:'observed-index-id',title:'Observed imaging research',authors:'Researcher',source:'https://example.org/research',pdfUrl:'https://example.org/research.pdf'};
  const t=await f.task('Fetch this paper and summarize it');assert.equal((await f.finish(t,{text:'Plan',papers:[card],actions:[{kind:'digest',target:card.id,language:'en'}]})).status,200);
  let history=await f.call('/chats/'+f.chat.id),action=history.messages.at(-1).actions[0],imported=f.store.job(action.jobId);assert.equal(imported.kind,'import');assert.equal(imported.sharing,'shared');assert.equal(action.state,'running');
  const paper=f.store.savePaper(makePaper({id:imported.id,owner:'reader',title:card.title,mmd:'# Observations\n\nWe counted 42 observations in this imaging experiment.\n\n# Limits\n\nOnly one specimen was studied.',source:card.source}));
  f.store.saveJob({...imported,state:'completed',paperId:paper.id,message:'Ready'});
  history=await f.call('/chats/'+f.chat.id);action=history.messages.at(-1).actions[0];const digest=f.store.job(action.jobId);assert.equal(digest.kind,'digest');
  const result=await generateArtifact(digest,f.config,f.store,async()=>({choices:[{message:{content:'# Findings\n42 observations [Observations].\n# Limits\nOne specimen [Limits].'},finish_reason:'stop'}]}));f.store.saveJob({...digest,...result,state:'completed',message:'Ready'});
  history=await f.call('/chats/'+f.chat.id);action=history.messages.at(-1).actions[0];assert.equal(action.state,'completed');assert.equal(action.artifactId,digest.id);assert.equal(action.paperId,paper.id);
  const again=await f.task('Summarize it');const response=await respond(again,{},()=>{});assert.equal(response.actions[0].kind,'digest');assert.equal((await f.finish(again,response)).status,200);
  assert.equal((await f.call('/chats/'+f.chat.id)).messages.at(-1).actions[0].artifactId,digest.id);assert.equal(f.store.jobs('reader').length,2);
 }finally{await f.close()}
});
test('agent saves persist, paragraph translation uses the selected sentence, and private targets remain isolated',async()=>{
 const f=await fixture();try{
  const p=f.store.savePaper(makePaper({id:randomUUID(),owner:'reader',title:'Imaging observations',mmd:'# Study\n\nWe counted forty two observations today. All samples were recorded.'}));
  let t=await f.task('Save this paper');await f.finish(t,{text:'Save',papers:[{paperId:p.id}],actions:[{kind:'save',target:p.id}]});assert.equal((await f.call('/saved')).papers[0].id,p.id);
  t=await f.task('Translate this paper paragraph 1 sentence 2 into Chinese');const plan=await respond(t,{},()=>{});assert.equal(plan.actions[0].language,'zh-Hans');assert.equal(plan.actions[0].sentence,2);await f.finish(t,plan);
  const action=(await f.call('/chats/'+f.chat.id)).messages.at(-1).actions[0],job=f.store.job(action.jobId);assert.equal(job.kind,'translation');assert.match(job.segmentId,/-2$/);
  const strange=(await f.call('/chats',{},f.other)).chat;await f.call('/chats/'+strange.id+'/messages',{text:'Read private',agentActions:true},f.other);const thief=(await f.call('/worker/claim',{},f.token,true)).task;
  assert.equal((await f.call('/worker/paper',{id:thief.id,lease:thief.lease,paperId:p.id},f.token,true)).status,404);
  assert.equal((await f.finish(thief,{text:'Forged',papers:[{paperId:p.id}],actions:[{kind:'save',target:p.id}]})).status,404);
 }finally{await f.close()}
});
test('private conversion requires existing credit consent, unknown action targets never enqueue work, and recovery updates chat',async()=>{
 const f=await fixture();try{
  const card={id:'metadata',title:'Specific observations',source:'https://example.org/article',pdfUrl:''};
  let t=await f.task('Fetch this',{sharing:'private'});await f.finish(t,{text:'Plan',papers:[card],actions:[{kind:'import',target:card.id}]});let action=(await f.call('/chats/'+f.chat.id)).messages.at(-1).actions[0];assert.equal(action.state,'needs_input');assert.equal(f.store.jobs('reader').length,0);
  t=await f.task('Save that');await f.finish(t,{text:'Plan',papers:[],actions:[{kind:'save',target:'invented'}]});assert.match((await f.call('/chats/'+f.chat.id)).messages.at(-1).text,/Choose a paper/);assert.equal(f.store.jobs('reader').length,0);
  t=await f.task('Download this');await f.finish(t,{text:'Plan',papers:[card],actions:[{kind:'import',target:card.id}]});action=(await f.call('/chats/'+f.chat.id)).messages.at(-1).actions[0];const j=f.store.job(action.jobId);f.store.saveJob({...j,state:'failed',message:'Source blocked'});assert.equal((await f.call('/chats/'+f.chat.id)).messages.at(-1).actions[0].state,'failed');
  const p=f.store.savePaper(makePaper({id:randomUUID(),owner:'reader',title:card.title,mmd:'An actual upload recovered this article.'}));f.store.saveJob({...j,state:'completed',paperId:p.id,message:'Recovered'});assert.equal((await f.call('/chats/'+f.chat.id)).messages.at(-1).actions[0].state,'completed');
 }finally{await f.close()}
});
test('PDF identity checks line-wrapped titles and DOI, rejects unrelated papers, and flags unreadable scans',()=>{
 const expected={title:'Self-calibrated neuromorphic hyperspectral derivative imaging',authors:'Rongzhou Chen',doi:'10.1364/OPTICA.585766'};
 const text='Optica 2026\nSelf-calibrated neuromorphic hyperspectral\nderivative imaging\nRongzhou Chen and Edmund Lam\nDOI 10.1364/OPTICA.585766\nWe demonstrate event camera imaging in biological specimens. '.repeat(2);
 assert.equal(checkPaperIdentity(text,expected).state,'matched');assert.equal(checkPaperIdentity('',expected).state,'uncertain');
 assert.equal(checkPaperIdentity('The ecology of tropical birds\nA. Ornithologist\n'+('Population counts and migration patterns across forests. '.repeat(6)),expected).state,'mismatch');
 assert.notEqual(checkPaperIdentity('A different title\n'+('The references discuss '+expected.doi+' and unknown claims. ').repeat(4),expected).state,'matched');
});
test('Crossref finds an approximate title despite other provider outages and preserves DOI, author, source evidence',async()=>{
 const work={title:['Self-calibrated neuromorphic hyperspectral derivative imaging'],DOI:'10.1364/OPTICA.585766',author:[{given:'Rongzhou',family:'Chen'}],published:{'date-parts':[[2026,3,25]]},'container-title':['Optica'],type:'journal-article',link:[{URL:'https://publisher.org/unknown-access.pdf','content-type':'application/pdf'}]};
 const fixture=Buffer.from(JSON.stringify({message:{items:[work],'total-results':1}}));let url;
 const result=await searchIndexes({q:'Self calibrated neuromorphic hyperspectral this paper'},async value=>{if(value.includes('crossref')){url=new URL(value);return fixture}const e=Error('limited');e.upstreamStatus=429;throw e});
 assert.equal(result.papers[0].doi,'10.1364/optica.585766');assert.equal(result.papers[0].pdfUrl,'');assert.equal(result.papers[0].authors,'Rongzhou Chen');assert.doesNotMatch(url.searchParams.get('query.bibliographic'),/this|paper/);assert.ok(result.unavailable.includes('openalex'));
 const ranked=rankResearch([{title:'Unrelated optics'},...parseCrossref(JSON.parse(fixture))],'self calibratd neuromorphic hyperspectral');assert.match(ranked[0].title,/Self-calibrated/);
 await queryCrossref(searchOptions({q:'10.1364/OPTICA.585766'}),async u=>{assert.match(u,/works\/10.1364%2Foptica.585766/);return Buffer.from(JSON.stringify({message:work}))});
});
test('home recommendations use topic interests across authors and retain explicit personal preferences',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'oi-focus-')),store=new Store(dir),queries=[];
 try{const d=createDiscovery(store,{search:async o=>{queries.push(o.q);return {papers:[{id:o.q,title:o.q+' research',authors:'Another researcher',source:'https://example.org/'+encodeURIComponent(o.q),doi:'',year:'2026'}]}}});
 const r=await d.find({},null);assert.equal(r.focused,true);assert.ok(queries.includes('neuromorphic imaging'));assert.ok(queries.includes('event cameras'));assert.equal(r.papers.length,2);
 store.db.prepare('INSERT INTO reading_preferences VALUES(?,?)').run('reader',JSON.stringify({interests:'organoid imaging'}));
 const custom=await d.find({},{id:'reader'});assert.deepEqual(custom.interests,['organoid imaging']);assert.equal(custom.papers[0].title,'organoid imaging research');
 }finally{store.close();rmSync(dir,{recursive:true,force:true})}
});

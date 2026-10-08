import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store.mjs';
import { createApp } from '../server/app.mjs';
import { parseArxiv, directPaper, respond } from '../worker/paper-agent.mjs';

test('private chats isolate accounts, authenticate workers, recover leases and deduplicate imports', async () => {
  const dir=mkdtempSync(join(tmpdir(),'onlyideas-chat-')), store=new Store(dir);
  const origin='http://127.0.0.1:4182', workerToken='test-only-worker-token';
  const app=createApp(store,{origin,agentWorkerToken:workerToken},{worker:false});
  await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${app.address().port}`;
  const a=store.createSession({id:'a',name:'A'}),b=store.createSession({id:'b',name:'B'});
  async function call(path,{token=a,worker,method='GET',body,from=origin}={}) {
    const response=await fetch(base+'/api'+path,{method,headers:{Origin:from,...(worker?{Authorization:`Bearer ${worker}`}:{Cookie:`onlyideas-local=${token}`}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:response.status,data:await response.json()};
  }
  try {
    assert.equal((await call('/chats',{token:''})).status,401);
    assert.equal((await call('/chats',{method:'POST',body:{},from:'https://evil.test'})).status,403);
    const {data:{chat}}=await call('/chats',{method:'POST',body:{}});
    assert.equal((await call('/chats/'+chat.id,{token:b})).status,404);
    assert.equal((await call('/chats',{token:b})).data.chats.length,0);
    const path='/chats/'+chat.id;
    assert.equal((await call(path+'/messages',{method:'POST',body:{text:'Find quantum research'}})).status,200);
    assert.equal((await call(path+'/messages',{method:'POST',body:{text:'Again'}})).status,409);
    assert.equal((await call('/worker/claim',{method:'POST',body:{}})).status,401);
    assert.equal((await call('/worker/claim',{method:'POST',worker:'wrong',body:{}})).status,401);
    assert.equal((await call('/worker/claim',{worker:workerToken})).status,405);
    const claim=()=>call('/worker/claim',{method:'POST',worker:workerToken,body:{}});
    const first=(await claim()).data.task;
    assert.equal(first.messages.at(-1).text,'Find quantum research');
    assert.equal((await claim()).data.task,null);
    store.db.prepare("UPDATE chat_tasks SET body=json_set(body,'$.leaseUntil',0) WHERE id=?").run(first.id);
    const second=(await claim()).data.task;
    assert.notEqual(first.lease,second.lease);
    const result={text:'One paper',papers:[{title:'Original paper',pdfUrl:'https://arxiv.org/pdf/1706.03762',authors:'Authors'}]};
    const finish=(task)=>call('/worker/result',{method:'POST',worker:workerToken,body:{id:task.id,lease:task.lease,result}});
    assert.equal((await finish(first)).status,409);
    assert.equal((await finish(second)).status,200);
    assert.equal((await finish(second)).status,409);
    const thread=(await call(path)).data;
    assert.equal(thread.pending.length,0);assert.equal(thread.messages.length,2);
    const paperId=thread.messages[1].papers[0].id;
    assert.equal((await call(path+'/import',{token:b,method:'POST',body:{paperId}})).status,404);
    assert.equal((await call(path+'/import',{method:'POST',body:{paperId:'invented'}})).status,400);
    const imported=()=>call(path+'/import',{method:'POST',body:{paperId}});
    const job=(await imported()).data.job;
    assert.equal(job.owner,'a');assert.equal(job.metadata.license,'private');
    assert.equal((await imported()).data.job.id,job.id);
    await call(path+'/messages',{method:'POST',body:{text:'Another topic'}});
    const pending=(await claim()).data.task;
    assert.equal((await call(path,{method:'DELETE'})).status,200);
    assert.equal((await finish(pending)).status,409);
    assert.equal(store.db.prepare('SELECT count(*) AS n FROM chat_messages').get().n,0);
  } finally {await new Promise(resolve=>app.close(resolve));store.close();rmSync(dir,{recursive:true,force:true});}
});

test('paper agent uses observed metadata and validates direct PDFs before offering conversion',async()=>{
  const papers=parseArxiv('<feed><entry><id>http://arxiv.org/abs/1706.03762v7</id><title>Attention &amp; learning</title><author><name>A. Author</name></author><summary>Observed abstract</summary><published>2017-06-12</published></entry></feed>');
  assert.equal(papers[0].title,'Attention & learning');assert.equal(papers[0].year,'2017');
  assert.equal(directPaper('Read https://arxiv.org/abs/1706.03762').pdfUrl,'https://arxiv.org/pdf/1706.03762');
  assert.equal(directPaper('Find Attention Is All You Need, arXiv 1706.03762v7').pdfUrl,'https://arxiv.org/pdf/1706.03762v7');
  assert.equal(directPaper('Find paper 1512.03385').pdfUrl,'https://arxiv.org/pdf/1512.03385');
  assert.equal(directPaper('Use reading size 1820.00001'),null);
  assert.throws(()=>directPaper('https://user:password@example.org/paper.pdf'),/public HTTPS/);
  const events=[];
  const task={text:'Read https://arxiv.org/abs/1706.03762',messages:[]};
  const answer=await respond(task,{},s=>events.push(s),{download:async()=>Buffer.from('%PDF-1.4\nOriginal')});
  assert.equal(answer.papers.length,1);assert.match(events[0],/Downloading/);
  const blocked=await respond(task,{},()=>{},{download:async()=>Buffer.from('<html>login</html>')});assert.equal(blocked.papers[0].pdfUrl,'');assert.match(blocked.text,/upload your copy/);
  const search=await respond({text:'attention learning',messages:[]},{},()=>{},{search:async q=>{assert.equal(q,'attention learning');return papers;}});
  assert.deepEqual(search.papers,papers);
});

test('local model plans use the current question and cannot manufacture paper results',async()=>{
  let query;
  const result=await respond({text:'Find physics papers',messages:[{role:'user',text:'Find physics papers'}]},{model:{url:'http://127.0.0.1:18639/v1/chat/completions',name:'local'}},()=>{},{provider:async(url,options)=>{const body=JSON.parse(options.body);assert.equal(body.think,false);assert.equal(body.messages.at(-1).content,'Find physics papers');return {choices:[{message:{content:'<think>internal reasoning</think>{"action":"search","query":"quantum entanglement","message":"Invented paper"}'}}]};},search:async q=>{query=q;return []}});
  assert.equal(query,'physics');assert.deepEqual(result.papers,[]);assert.doesNotMatch(result.text,/Invented/);
});

test('agent search survives planning-model 503 and includes metadata without PDFs',async()=>{
 const paper={title:'Quantum experiments',source:'https://doi.org/10.1234/example',pdfUrl:'',authors:'Observed Author'};
 const answer=await respond({text:'Please find papers about quantum experiments',messages:[]},{model:{url:'https://model.test/chat',name:'test'}},()=>{},{provider:async()=>{throw Error('Provider returned HTTP 503')},search:async q=>{assert.equal(q,'quantum experiments');return [paper]}});
 assert.deepEqual(answer.papers,[paper]);assert.doesNotMatch(answer.text,/503/);
 const saved={...paper,paperId:'saved-paper',id:'saved-paper'};
 const offline=await respond({text:'Find quantum experiments',messages:[],library:[saved]},{},()=>{},{search:async()=>{throw Error('Index offline')}});
 assert.equal(offline.papers[0].paperId,'saved-paper');assert.match(offline.text,/from your library/);
});

test('agent cards can import metadata-only sources and reuse only the requesting reader’s transcripts',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'onlyideas-agent-cards-')),store=new Store(dir),origin='http://127.0.0.1:4182';
 const {makePaper}=await import('../server/domain.mjs');const privatePaper=store.savePaper(makePaper({id:crypto.randomUUID(),owner:'reader',title:'My quantum notes',mmd:'Original private text'}));
 const app=createApp(store,{origin,agentWorkerToken:'test-worker',mathpix:{appKey:'fixture'}},{worker:false});await new Promise(r=>app.listen(0,'127.0.0.1',r));const session=store.createSession({id:'reader'}),other=store.createSession({id:'other'});
 const call=async(path,body,token=session,worker=false)=>{const r=await fetch('http://127.0.0.1:'+app.address().port+'/api'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(worker?{Authorization:'Bearer test-worker'}:{Cookie:'onlyideas-local='+token})},body:JSON.stringify(body)});return {status:r.status,data:await r.json()}};
 try{
 const chat=(await call('/chats',{})).data.chat;await call('/chats/'+chat.id+'/messages',{text:'Find quantum papers'});const task=(await call('/worker/claim',{},session,true)).data.task;assert.ok(task.library.some(p=>p.paperId===privatePaper.id));
 const finished=await call('/worker/result',{id:task.id,lease:task.lease,result:{text:'Observed results',papers:[{paperId:privatePaper.id},{title:'Metadata only',source:'https://doi.org/10.1234/paper',pdfUrl:''}]}},session,true);assert.equal(finished.status,200);
 const cards=JSON.parse(store.db.prepare('SELECT body FROM chat_messages WHERE id=?').get(task.id).body).papers;
 const reused=await call('/chats/'+chat.id+'/import',{paperId:cards[0].id});assert.equal(reused.data.paperId,privatePaper.id);assert.equal(reused.data.job.reused,true);
 const imported=await call('/chats/'+chat.id+'/import',{paperId:cards[1].id,sharing:'shared'});assert.equal(imported.data.job.url,'https://doi.org/10.1234/paper');assert.equal(imported.data.job.sharing,'shared');
 assert.ok(store.db.prepare('SELECT 1 FROM discovery_items WHERE id=?').get(cards[1].id));
 const stranger=(await call('/chats',{},other)).data.chat;await call('/chats/'+stranger.id+'/messages',{text:'Find quantum'},other);const task2=(await call('/worker/claim',{},session,true)).data.task;assert.equal(task2.library.length,0);
 const denied=await call('/worker/result',{id:task2.id,lease:task2.lease,result:{text:'Must be denied',papers:[{paperId:privatePaper.id}]}},session,true);assert.equal(denied.status,404);
 }finally{await new Promise(r=>app.close(r));store.close();rmSync(dir,{recursive:true,force:true})}
});

test('new DOI and URL requests cannot select an older card, and old attachments do not hijack later paper actions',async()=>{
 const old={id:'old',paperId:'old-paper',title:'Quantum experiments',source:'https://example.org/old'};
 const correct={id:'new',title:'Self-calibrated neuromorphic hyperspectral derivative imaging',doi:'10.1364/optica.585766',source:'https://doi.org/10.1364/optica.585766',pdfUrl:''};
 const base={agentActions:true,language:'en',messages:[{role:'assistant',text:'Found',papers:[old]}],library:[old]};
 let lookups=0;
 const found=await respond({...base,text:'Download 10.1364/OPTICA.585766'},{codex:{enabled:true}},()=>{},{search:async q=>{assert.equal(q,correct.doi);return [correct]},codex:async q=>{lookups++;assert.equal(q,correct.doi);return [{...correct,pdfUrl:'https://university.org/paper.pdf'}]}});
 assert.equal(found.papers[0].title,correct.title);assert.equal(found.papers[0].pdfUrl,'https://university.org/paper.pdf');assert.equal(found.actions[0].target,'new');assert.equal(lookups,1);
 const linked=await respond({...base,text:'Download https://arxiv.org/abs/1512.03385'},{},()=>{});
 assert.equal(linked.papers[0].source,'https://arxiv.org/abs/1512.03385');assert.notEqual(linked.actions[0].target,old.paperId);
 const saved=await respond({...base,text:'Save this paper',hasNewAttachments:false,documents:[{name:'Earlier notes',text:'Unrelated'}]},{},()=>{});
 assert.equal(saved.actions[0].kind,'save');assert.equal(saved.actions[0].target,old.paperId);
});

test('a concrete download and summary request searches even when the planner gives a generic reply',async()=>{
 const card={id:'imaging',title:'Self-calibrated neuromorphic hyperspectral derivative imaging',source:'https://doi.org/10.1364/optica.585766',pdfUrl:'https://university.org/paper.pdf'};
 const answer=await respond({text:'Download self calibrated neuromorphic hyperspectral imaging and summarize it',agentActions:true,language:'en',messages:[]},{model:{url:'https://model.test/chat',name:'local'}},()=>{},{provider:async()=>({choices:[{message:{content:'{"action":"reply"}'}}]}),search:async query=>{assert.equal(query,'self calibrated neuromorphic hyperspectral imaging');return [card]}});
 assert.equal(answer.papers[0].id,card.id);assert.equal(answer.actions[0].kind,'digest');
});

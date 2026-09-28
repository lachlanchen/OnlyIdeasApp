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
  await assert.rejects(respond(task,{},()=>{},{download:async()=>Buffer.from('<html>login</html>')}),/instead of a PDF/);
  const search=await respond({text:'quantum entanglement',messages:[]},{},()=>{},{search:async q=>{assert.equal(q,'quantum entanglement');return papers;}});
  assert.deepEqual(search.papers,papers);
});

test('local model plans use the current question and cannot manufacture paper results',async()=>{
  let query;
  const result=await respond({text:'Find physics papers',messages:[{role:'user',text:'Find physics papers'}]},{model:{url:'http://127.0.0.1:18639/v1/chat/completions',name:'local'}},()=>{},{provider:async(url,options)=>{const body=JSON.parse(options.body);assert.equal(body.think,false);assert.equal(body.messages.at(-1).content,'Find physics papers');return {choices:[{message:{content:'<think>internal reasoning</think>{"action":"search","query":"quantum entanglement","message":"Invented paper"}'}}]};},search:async q=>{query=q;return []}});
  assert.equal(query,'quantum entanglement');assert.deepEqual(result.papers,[]);assert.doesNotMatch(result.text,/Invented/);
});

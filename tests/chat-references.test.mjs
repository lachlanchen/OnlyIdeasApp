import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.mjs';
import {makePaper} from '../server/domain.mjs';
import {createApp} from '../server/app.mjs';
import {resolveChatReferences} from '../server/chat-references.mjs';
import {observedCards,targetCard} from '../worker/planning.mjs';

test('paper mentions and both quote roles are owned, bounded, durable and rechecked on claim',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'onlyideas-reference-')),store=new Store(dir),origin='http://127.0.0.1:4182';
 const app=createApp(store,{origin,agentWorkerToken:'fixture'},{worker:false});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const a=store.createSession({id:'a',name:'A'}),b=store.createSession({id:'b',name:'B'});
 const paper=store.savePaper(makePaper({id:randomUUID(),owner:'a',title:'Saved optics paper',mmd:'Original existing transcript'}));
 const call=async(path,body,token=a)=>{const r=await fetch('http://127.0.0.1:'+app.address().port+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(token==='worker'?{Authorization:'Bearer fixture'}:{Cookie:'onlyideas-local='+token})},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,data:await r.json()}};
 try{
  assert.equal((await call('/api/paper-mentions?q=optics')).data.papers[0].id,paper.id);
  assert.deepEqual((await call('/api/paper-mentions?q=optics',null,b)).data.papers,[]);
  const chat=(await call('/api/chats',{})).data.chat,other=(await call('/api/chats',{},b)).data.chat;
  const quoteId=randomUUID();store.db.prepare('INSERT INTO chat_messages VALUES(?,?,?,?,?)').run(quoteId,chat.id,'assistant',JSON.stringify({text:'A previous explanation'}),Date.now());
  const send=body=>call('/api/chats/'+chat.id+'/messages',body);
  assert.equal((await call('/api/chats/'+other.id+'/messages',{text:'Explain',paperIds:[paper.id]},b)).status,404);
  assert.equal((await call('/api/chats/'+other.id+'/messages',{text:'Explain',quoteId},b)).status,404);
  assert.equal((await send({text:'Explain',paperIds:Array(4).fill(paper.id)})).status,400);
  const accepted=await send({text:'Explain this method',paperIds:[paper.id],quoteId,quote:{text:'FORGED'}});assert.equal(accepted.status,200);
  const messages=(await call('/api/chats/'+chat.id)).data.messages;
  assert.equal(accepted.data.messageId,messages.at(-1).id);assert.equal(messages.at(-1).quote.text,'A previous explanation');assert.equal(messages.at(-1).references[0].title,paper.title);
  const task=(await call('/api/worker/claim',{},'worker')).data.task;
  assert.equal(task.references[0].paperId,paper.id);assert.equal(task.quote.id,quoteId);assert.equal(task.text,'Explain this method');
  const cards=observedCards({...task,library:[{id:'wrong',paperId:'wrong',title:'Unrelated'}]});assert.equal(targetCard(task,cards).paperId,paper.id);
  const userQuote=resolveChatReferences(store,'a',chat.id,{quoteId:messages.at(-1).id});assert.equal(userQuote.quote.role,'user');
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM jobs').get().n,0,'Mentioning does not refetch or transcribe');
  await call('/api/worker/result',{id:task.id,lease:task.lease,result:{text:'Done'}},'worker');
  await send({text:'Explain again',paperIds:[paper.id]});store.db.prepare('DELETE FROM papers WHERE id=?').run(paper.id);
  assert.equal((await call('/api/worker/claim',{},'worker')).data.task,null);
  assert.match((await call('/api/chats/'+chat.id)).data.messages.at(-1).text,/no longer available/);
 }finally{await new Promise(r=>app.close(r));store.close();rmSync(dir,{recursive:true,force:true})}
});

test('public share previews escape metadata and deny private content even with owner credentials',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'onlyideas-share-')),store=new Store(dir),origin='http://127.0.0.1:4182';
 const app=createApp(store,{origin},{worker:false});await new Promise(r=>app.listen(0,'127.0.0.1',r));const session=store.createSession({id:'a',name:'A'});
 const p=store.savePaper({...makePaper({id:randomUUID(),owner:'a',title:'Optics <script>bad()</script>',authors:'A & B',mmd:'Body'}),visibility:'public'}),secret=store.savePaper(makePaper({id:randomUUID(),owner:'a',title:'Private manuscript',mmd:'Secret'}));
 const base='http://127.0.0.1:'+app.address().port;
 try{const r=await fetch(base+'/share/paper/'+p.id),html=await r.text();assert.equal(r.status,200);assert.match(html,/og:title/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/6816392935/);assert.match(html,/art.onlyideas.app:\/\/paper\//);
 const denied=await fetch(base+'/share/paper/'+secret.id,{headers:{Cookie:'onlyideas-local='+session}});assert.equal(denied.status,404);assert.doesNotMatch(await denied.text(),/Private manuscript|Secret/);
 store.savePaper({...p,visibility:'private'});assert.equal((await fetch(base+'/share/paper/'+p.id)).status,404);
 }finally{await new Promise(r=>app.close(r));store.close();rmSync(dir,{recursive:true,force:true})}
});

test('a question about multiple mentions reuses their transcripts and carries the quoted context',async()=>{
 const {respond}=await import('../worker/paper-agent.mjs');const reads=[];
 const references=[{id:'one',paperId:'one',title:'First optics paper'},{id:'two',paperId:'two',title:'Second optics paper'}];
 const result=await respond({text:'Compare the two methods',references,quote:{id:'quote',role:'assistant',text:'Earlier comparison'},messages:[]},{model:{url:'https://model.test/chat',name:'fixture'}},()=>{},{readPaper:async id=>{reads.push(id);return{paper:{title:id,source:'https://example.org/'+id,text:'Transcript '+id}}},search:async()=>{throw Error('Must not search')},download:async()=>{throw Error('Must not download')},provider:async(url,options)=>{const payload=JSON.parse(options.body),data=JSON.parse(payload.messages.at(-1).content);assert.equal(data.question,'Compare the two methods');assert.equal(data.papers.length,2);assert.equal(data.quotedMessage.text,'Earlier comparison');return{choices:[{finish_reason:'stop',message:{content:'Source-based comparison'}}]}}});
 assert.deepEqual(reads,['one','two']);assert.equal(result.text,'Source-based comparison');assert.deepEqual(result.papers,references);
});

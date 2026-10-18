import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.mjs';
import {createApp} from '../server/app.mjs';
import {createResearchPreferences} from '../server/research-preferences.mjs';
import {previousDefaultInterests,interestTopics} from '../server/research-focus.mjs';

test('interest onboarding preserves saved topics, dismissal and notification settings',()=>{
 const dir=mkdtempSync(join(tmpdir(),'oi-interests-')),store=new Store(dir),prefs=createResearchPreferences(store),user={id:'reader'};
 try {
  assert.deepEqual(prefs.status(user),{state:'pending',interests:''});assert.deepEqual(interestTopics(store,user),[]);
  store.db.prepare('INSERT INTO reading_preferences VALUES(?,?)').run(user.id,JSON.stringify({interests:previousDefaultInterests,dailyTime:'08:30',dailyEnabled:true,discipline:'31'}));
  assert.equal(prefs.status(user).state,'chosen');assert.equal(prefs.status(user).interests,previousDefaultInterests);
  prefs.update(user,{skip:true});assert.equal(prefs.status(user).interests,previousDefaultInterests);
  prefs.update(user,{text:'history, climate'});
  const stored=JSON.parse(store.db.prepare('SELECT body FROM reading_preferences WHERE owner=?').get(user.id).body);
  assert.equal(stored.dailyTime,'08:30');assert.equal(stored.dailyEnabled,true);assert.equal(stored.discipline,'');assert.deepEqual(interestTopics(store,user),['history','climate']);
  assert.throws(()=>prefs.update(user,{text:'x'.repeat(121)}));assert.throws(()=>prefs.update(user,{text:' \n '}));
  prefs.update({id:'other'},{skip:true});assert.deepEqual(prefs.status({id:'other'}),{state:'skipped',interests:''});
 }finally{store.close();rmSync(dir,{recursive:true,force:true})}
});

test('Agent interest updates work without a model, isolate accounts and retry without duplicate messages',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'oi-interest-api-')),store=new Store(dir),origin='http://127.0.0.1:4182',config={origin};
 const app=createApp(store,config,{worker:false});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const a=store.createSession({id:'a'}),b=store.createSession({id:'b'});
 const call=async(path,body,token=a)=>{const r=await fetch(`http://127.0.0.1:${app.address().port}/api${path}`,{method:body?'POST':'GET',headers:{Origin:origin,Cookie:`onlyideas-local=${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()}};
 try {
  assert.equal((await call('/chats')).data.recommendations.state,'pending');
  const request={text:'history, climate',requestId:randomUUID()};
  const first=await call('/chats/interests',request);assert.equal(first.status,200);assert.equal(first.data.messages.length,2);
  const repeated=await call('/chats/interests',request);assert.equal(repeated.data.chat.id,first.data.chat.id);assert.deepEqual(repeated.data.messages,first.data.messages);
  assert.equal(store.db.prepare('SELECT count(*) n FROM chat_tasks').get().n,0);
  assert.equal((await call('/chats/interests',request,b)).status,404);
  assert.equal((await call('/chats/interests',{...request,text:'different'})).status,409);
  assert.equal((await call('/chats/interests',{text:'biology',requestId:randomUUID(),chatId:first.data.chat.id},b)).status,404);
  assert.equal((await call('/chats/interests',{skip:true})).data.recommendations.state,'chosen');
  assert.equal((await call('/chats',undefined,b)).data.recommendations.state,'pending');
  assert.equal((await call('/chats/interests',{text:'x'.repeat(121),requestId:randomUUID()})).status,400);
  assert.equal(store.db.prepare('SELECT count(*) n FROM chats').get().n,1);
  // An ordinary research turn still queues normally; preference messages are
  // excluded from the model context so they cannot replace the current request.
  config.agentWorkerToken='fixture';
  assert.equal((await call('/chats/'+first.data.chat.id+'/messages',{text:'Find an optics paper'})).status,200);
  const r=await fetch(`http://127.0.0.1:${app.address().port}/api/worker/claim`,{method:'POST',headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},body:'{}'});
  const task=(await r.json()).task;assert.equal(task.text,'Find an optics paper');assert.equal(task.messages.length,1);assert.equal(task.messages[0].text,'Find an optics paper');
 } finally {await new Promise(r=>app.close(r));store.close();rmSync(dir,{recursive:true,force:true})}
});

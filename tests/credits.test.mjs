import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Store } from '../server/store.mjs';
import { makePaper } from '../server/domain.mjs';
import { createApp } from '../server/app.mjs';
import { deleteAccount } from '../server/community.mjs';
import { createChats } from '../server/chat.mjs';
import { convertAttachment } from '../server/attachments.mjs';
import { creditTransaction as tx, creditSummary, reserveImport, finishImportCredits, retryImportCredits, rewardPublication, seedCreditPublications, publicationAliases } from '../server/credits.mjs';
const config={credits:{enabled:true},maxPages:30};
function fixture(t) {
  const dir=mkdtempSync(join(tmpdir(),'onlyideas-credits-')),store=new Store(dir);
  t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
  return {store,dir};
}
const balance=store=>creditSummary(store,'reader',config).balance;
const job=(fields={})=>({id:randomUUID(),owner:'reader',kind:'import',sharing:'private',...fields});
const reserve=(store,j,limit=30)=>tx(store,()=>reserveImport(store,config,j,limit));
const finish=(store,j,success=true)=>tx(store,()=>finishImportCredits(store,j,success));
function published(store, fields={}) {
  const j=job({kind:'markdown',sharing:'shared',...fields});reserve(store,j);
  const paper=makePaper({id:j.id,title:'Research',mmd:fields.mmd||randomUUID(),owner:j.owner,source:fields.source||'',license:'CC-BY-4.0'});
  paper.visibility='public';paper.publication={commit:'abc'};store.savePaper(paper);
  return {...j,kind:'publish',paperId:j.id,reviewed:true};
}
test('welcome and ledger persist; private reservation settles actual pages once without expiration',t=>{
  const {store,dir}=fixture(t);assert.equal(balance(store),30);assert.equal(balance(store),30);
  const j=job();reserve(store,j);assert.equal(balance(store),0);assert.equal(creditSummary(store,'reader',config).held,30);
  reserve(store,j);j.pages=4;finish(store,j);finish(store,j);assert.equal(balance(store),26);
  assert.equal(creditSummary(store,'reader',config).held,0);
  const second=new Store(dir);assert.equal(balance(second),26);second.close();
  assert.deepEqual(store.db.prepare('SELECT delta FROM credit_ledger ORDER BY rowid').all().map(x=>x.delta),[30,-30,26]);
});
test('consent, integer limits, insufficient balance and transaction rollback protect credits',t=>{
  const {store}=fixture(t);assert.equal(balance(store),30);
  for(const limit of [undefined,NaN,Infinity,'30',29,30.5])assert.throws(()=>tx(store,()=>reserveImport(store,config,job(),limit)),/Confirm/);
  const j=job({pages:25});reserve(store,j);assert.equal(balance(store),5);
  assert.throws(()=>reserve(store,job()),/Not enough/);
  assert.equal(balance(store),5);
  assert.throws(()=>tx(store,()=>{reserveImport(store,config,job({kind:'attachment',ext:'txt'}),1);throw Error('queue failed');}),/queue failed/);
  assert.equal(balance(store),5);
});
test('failures refund once; retry needs new consent and reservation; old attempt cannot refund new attempt',t=>{
  const {store}=fixture(t),j=job({pages:6});reserve(store,j);const old=structuredClone(j);
  finish(store,j,false);finish(store,j,false);assert.equal(balance(store),30);
  assert.throws(()=>tx(store,()=>retryImportCredits(store,j,undefined)),/Confirm/);
  tx(store,()=>retryImportCredits(store,j,6));assert.equal(balance(store),24);
  finish(store,old,false);assert.equal(balance(store),24);finish(store,j);assert.equal(balance(store),24);
});
test('shared imports cost no credits; legacy jobs and disabled rollout are not charged',t=>{
  const {store}=fixture(t),shared=job({sharing:'shared'});reserve(store,shared,undefined);finish(store,shared);assert.equal(balance(store),30);
  const legacy=job();finish(store,legacy);assert.equal(balance(store),30);
  const disabled=job();tx(store,()=>reserveImport(store,{},disabled));assert.equal(disabled.credit,undefined);
});
test('reward follows approved publication, canonical/content aliases prevent rewards across users',t=>{
  const {store}=fixture(t);seedCreditPublications(store,config);
  const first=published(store,{source:'https://arxiv.org/pdf/2205.01833v2.pdf',mmd:'One unique paper'});
  assert.equal(tx(store,()=>rewardPublication(store,{...first,reviewed:false})),0);
  assert.equal(tx(store,()=>rewardPublication(store,first)),10);assert.equal(balance(store),40);
  assert.equal(tx(store,()=>rewardPublication(store,first)),0);
  const second=published(store,{owner:'other',source:'https://arxiv.org/abs/2205.01833',mmd:'Different OCR of same paper'});
  assert.equal(tx(store,()=>rewardPublication(store,second)),0);
  const third=published(store,{owner:'third',source:'https://example.org/new-source',mmd:'One  unique\n paper'});
  assert.equal(tx(store,()=>rewardPublication(store,third)),0);
  assert.equal(creditSummary(store,'other',config).balance,30);
});
test('preexisting public papers seed duplicate prevention and are not rewarded retroactively',t=>{
  const {store}=fixture(t),p=makePaper({id:'old',owner:'reader',title:'Old',mmd:'Existing community research',source:'https://doi.org/10.1234/paper'});p.visibility='public';store.savePaper(p);
  seedCreditPublications(store,config);seedCreditPublications(store,config);
  const duplicate=published(store,{source:'https://publisher.test/10.1234/paper?utm_source=x'});
  assert.equal(tx(store,()=>rewardPublication(store,duplicate)),0);assert.equal(balance(store),30);
  assert.ok(publicationAliases(p).some(a=>publicationAliases({...p,source:'https://publisher.test/10.1234/paper'}).includes(a)));
});
test('daily reward ceiling is durable and never retries a capped award later',t=>{
  const {store}=fixture(t);seedCreditPublications(store,config);
  const jobs=Array.from({length:6},()=>published(store));
  assert.deepEqual(jobs.map(j=>tx(store,()=>rewardPublication(store,j))),[10,10,10,10,10,0]);
  assert.equal(balance(store),80);
  store.db.prepare('UPDATE credit_rewards SET created=0').run();
  assert.equal(tx(store,()=>rewardPublication(store,jobs[5])),0);assert.equal(balance(store),80);
});
test('independent processes cannot overspend or grant duplicate welcome credits',async t=>{
  const {store,dir}=fixture(t),exec=promisify(execFile);
  const script=`import {Store} from './server/store.mjs';import {creditTransaction,reserveImport} from './server/credits.mjs';const s=new Store(process.argv[1]);try{creditTransaction(s,()=>reserveImport(s,{credits:{enabled:true}},JSON.parse(process.argv[2]),30));console.log('reserved')}catch(e){console.log(e.status)}finally{s.close()}`;
  const results=await Promise.all(Array.from({length:5},()=>exec(process.execPath,['--input-type=module','-e',script,dir,JSON.stringify(job({pages:10}))])));
  assert.equal(results.filter(r=>r.stdout.trim()==='reserved').length,3);
  assert.equal(results.filter(r=>r.stdout.trim()==='402').length,2);assert.equal(balance(store),0);
  assert.equal(store.db.prepare("SELECT count(*) AS n FROM credit_ledger WHERE kind='welcome'").get().n,1);
});
test('account deletion removes private ledger and prevents repeat welcome grants after sign-in',async t=>{
  const {store}=fixture(t);createChats(store,{});const user={id:'github:42'};
  assert.equal(creditSummary(store,user.id,config).balance,30);
  await deleteAccount(store,user);
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM credit_ledger').get().n,0);
  const next=store.identity(user.id);assert.notEqual(next,user.id);
  assert.equal(creditSummary(store,next,config).balance,0);
  assert.throws(()=>creditSummary(store,user.id,config),/no longer/);
});
test('API requires consent, isolates balances, dedupes uploads and shares converted attachments',async t=>{
  const {store}=fixture(t),origin='http://127.0.0.1:4182',app=createApp(store,{...config,origin},{worker:false});
  await new Promise(r=>app.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>app.close(r)));
  const base=`http://127.0.0.1:${app.address().port}`,token=store.createSession({id:'reader'}),other=store.createSession({id:'other'});
  const call=async(path,{method='GET',body,headers={},auth=token}={})=>{const res=await fetch(base+'/api'+path,{method,headers:{Origin:origin,...(auth?{Cookie:`onlyideas-local=${auth}`}:{}) ,...(typeof body==='object'?{'Content-Type':'application/json'}:{}),...headers},body:typeof body==='object'?JSON.stringify(body):body});return {status:res.status,data:await res.json()};};
  assert.equal((await call('/credits',{auth:null})).status,401);
  const body={requestId:randomUUID(),title:'Mine',mmd:'Private math $x^2$',sharing:'private'};
  assert.equal((await call('/papers/markdown',{method:'POST',body})).status,428);
  assert.equal(store.paper(body.requestId),null);
  assert.equal((await call('/papers/markdown',{method:'POST',body:{...body,creditLimit:1}})).status,201);
  assert.equal((await call('/papers/markdown',{method:'POST',body:{...body,creditLimit:1}})).status,200);
  assert.equal((await call('/credits')).data.balance,29);assert.equal((await call('/credits',{auth:other})).data.balance,30);
  const options={method:'POST',headers:{'X-File-Name':'research.txt','X-Paper-Sharing':'shared'},body:'My reusable original research'};
  const uploaded=await call('/attachments',options);assert.equal(uploaded.status,202);
  const duplicate=await call('/attachments',options);assert.equal(duplicate.data.attachment.id,uploaded.data.attachment.id);
  const j=store.job(uploaded.data.attachment.jobId);assert.equal(j.sharing,'shared');
  const result=await convertAttachment(j,{},store);assert.equal(store.paper(result.paperId).sharing,'awaiting_review');
  assert.equal(store.paper(result.paperId).visibility,'private');assert.equal((await call('/credits')).data.balance,29);
  // A crash after durable conversion can resume without the deleted source file.
  assert.deepEqual(await convertAttachment(j,{},store),result);
});

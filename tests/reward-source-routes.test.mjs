import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,chmodSync,symlinkSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {request as httpRequest} from 'node:http';
import {Store} from '../server/store.mjs';import {createRewardEvidence} from '../server/reward-evidence.mjs';import {createRewardSourceRoutes,readSourceSecret} from '../server/reward-source-routes.mjs';import {PROFILE_BINDING as B} from '../server/lazyingart-profile.mjs';
const {createApp}=await import(process.env.ONLYIDEAS_SOURCE_CANDIDATE_APP||'../server/app.mjs');
const subject='la_'+'1'.repeat(32),secret='s'.repeat(64),origin='https://agent.onlyideas.art';
const common={schema_version:1,issuer:B.issuer,subject,actor:B.clientId,nonce:'a'.repeat(48)};
async function fixture(t,{qualified=true,deadlineMs=4000,enabled=true}={}){
 const dir=mkdtempSync(join(tmpdir(),'oi-source-routes-')),secretFile=join(dir,'source.secret');writeFileSync(secretFile,secret,{mode:0o600});const store=new Store(dir);t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true})});
 const s={store,dir,secretFile,scope:'lac.points.intents.write',subject,error:null,hook:null};
 const authorize=async(owner,scope,options)=>{assert.equal(owner,'reader');await s.hook?.(options);if(s.error)throw s.error;return{...B,subject:s.subject,scope:s.scope}};
 s.evidence=createRewardEvidence(store,{authorize});s.event=await s.evidence.checkIn({id:'reader'});
 const config={origin,rewardSource:{enabled,secretFile}};
 const app=createApp(store,config,{worker:false,rewardSourceOptions:{deadlineMs,...(qualified?{authorization:{qualified:true,binding:B,prove:authorize}}:{})}});
 await new Promise(r=>app.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{app.close(r);app.closeAllConnections()}));
 s.call=(path,data,options={})=>new Promise((resolve,reject)=>{
  const body=options.raw??JSON.stringify(data);const req=httpRequest(`http://127.0.0.1:${app.address().port}`+path,{method:options.method||'POST',headers:{Host:new URL(origin).host,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'X-Lac-Source-Key':secret,...options.headers}},res=>{let raw='';res.setEncoding('utf8');res.on('data',chunk=>raw+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:raw?JSON.parse(raw):null}))});req.on('error',reject);req.end(body);
 });s.query={...common,evidence_ref:s.event.evidence_ref};s.eligibility={...common,policy_id:s.event.policy_id,policy_version:s.event.policy_version,phase:'award',event:s.event};return s;
}
test('real source routes authenticate exact requests, preserve event and return fresh nonce-bound evidence',async t=>{
 const s=await fixture(t);const a=await s.call('/api/lac/source/v1/evidence',s.query);assert.equal(a.status,200);assert.equal(a.headers['cache-control'],'no-store');assert.equal(a.headers['access-control-allow-origin'],undefined);assert.equal(a.body.nonce,common.nonce);assert.equal(a.body.evidence.event_id,s.event.event_id);assert.equal(a.body.evidence.facts.activity_rule,'onlyideas-daily-check-in-v1');assert.equal((await s.call('/api/lac/source/v1/eligibility',s.eligibility)).body.eligible,true);assert.equal(s.store.db.prepare('SELECT count(*) n FROM credit_ledger').get().n,0);
 const retry=await s.call('/api/lac/source/v1/evidence',{...s.query,nonce:'b'.repeat(48)});assert.equal(retry.body.nonce,'b'.repeat(48));assert.deepEqual(retry.body.evidence,a.body.evidence);
 for(const headers of [{'X-Lac-Source-Key':''},{'X-Lac-Source-Key':'x'.repeat(64)},{Origin:origin},{Origin:''},{Cookie:''},{Authorization:'Bearer app-token'}])assert.equal((await s.call('/api/lac/source/v1/evidence',s.query,{headers})).status,401);
 assert.equal((await s.call('/api/lac/source/v1/evidence',s.query,{method:'GET'})).status,405);
 for(const path of ['/api/lac/source/v1/evidence?x=1','/api/lac/source/v1/evidence/','/api/lac/source/v1/final','/api/lac/source/v1/unknown'])assert.equal((await s.call(path,s.query)).status,404);
 assert.equal((await s.call('/api/lac/source/v1/evidence',s.query,{headers:{Host:'foreign.invalid'}})).status,404);
 for(const data of [{...s.query,actor:'bunko-server'},{...s.query,nonce:'short'},{...s.query,extra:true}])assert.equal((await s.call('/api/lac/source/v1/evidence',data)).status,400);
 assert.equal((await s.call('/api/lac/source/v1/evidence',null,{raw:JSON.stringify(s.query).replace('"schema_version":1','"schema_version":1,"schema_version":1')})).status,400);
 assert.equal((await s.call('/api/lac/source/v1/evidence',null,{raw:'x'.repeat(8193)})).status,413);
});
test('original subject, current consent, held/deleted state and outages cannot become eligibility',async t=>{
 const s=await fixture(t);s.scope='profile';assert.equal((await s.call('/api/lac/source/v1/eligibility',s.eligibility)).body.eligible,false);s.scope='lac.points.intents.write';s.subject='la_'+'2'.repeat(32);assert.equal((await s.call('/api/lac/source/v1/evidence',s.query)).body.evidence,null);s.subject=subject;
 s.error=Error('private secret upstream');const outage=await s.call('/api/lac/source/v1/eligibility',s.eligibility);assert.equal(outage.status,503);assert.ok(!JSON.stringify(outage.body).includes('private'));s.error=null;
 s.evidence.hold('reader');assert.equal((await s.call('/api/lac/source/v1/eligibility',s.eligibility)).body.eligible,false);await s.evidence.resume('reader');s.evidence.remove('reader');assert.equal((await s.call('/api/lac/source/v1/evidence',s.query)).body.evidence,null);
});
test('transport can qualify empty reads while absent operation proof fails closed for existing events',async t=>{
 const s=await fixture(t,{qualified:false});assert.equal((await s.call('/api/lac/source/v1/evidence',s.query)).status,503);assert.equal((await s.call('/api/lac/source/v1/eligibility',s.eligibility)).status,503);
 assert.equal((await s.call('/api/lac/source/v1/evidence',{...s.query,evidence_ref:'unknown'})).body.evidence,null);assert.equal((await s.call('/api/lac/source/v1/eligibility',{...s.eligibility,event:{...s.event,evidence_ref:'unknown'}})).body.eligible,false);
});
test('deadline aborts fresh proof and closes the response without leaking a later success',async t=>{
 const s=await fixture(t,{deadlineMs:40});let aborted=false;s.hook=({signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(Error('aborted'))},{once:true}));
 const start=Date.now(),r=await s.call('/api/lac/source/v1/evidence',s.query);assert.equal(r.status,503);assert.ok(Date.now()-start<1000);assert.equal(aborted,true);
});
test('timed-out proofs retain concurrency slots until they settle',async t=>{
 const s=await fixture(t,{deadlineMs:100}),releases=[];let entered;const started=new Promise(r=>entered=r);
 s.hook=()=>new Promise(r=>{releases.push(r);if(releases.length===4)entered()});
 const pending=Array.from({length:4},()=>s.call('/api/lac/source/v1/evidence',s.query));await started;
 assert.equal((await s.call('/api/lac/source/v1/evidence',s.query)).status,503);
 for(const result of await Promise.all(pending))assert.equal(result.status,503);
 assert.equal((await s.call('/api/lac/source/v1/evidence',s.query)).status,503);
 s.hook=null;releases.forEach(r=>r());await new Promise(r=>setImmediate(r));assert.equal((await s.call('/api/lac/source/v1/evidence',s.query)).status,200);
});
test('disabled configuration performs no secret I/O or source-table migration; key permissions are enforced',t=>{
 const dir=mkdtempSync(join(tmpdir(),'oi-source-key-')),store=new Store(dir);t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true})});assert.equal(createRewardSourceRoutes(store,{origin,rewardSource:{enabled:false,secretFile:'/nonexistent'}}).enabled,false);assert.equal(store.db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='lac_source_evidence'").get().n,0);
 const file=join(dir,'key');writeFileSync(file,secret,{mode:0o600});assert.equal(readSourceSecret(file),secret);chmodSync(file,0o644);assert.throws(()=>readSourceSecret(file),{status:503});chmodSync(file,0o600);symlinkSync(file,join(dir,'symlink'));assert.throws(()=>readSourceSecret(join(dir,'symlink')),{status:503});assert.throws(()=>readSourceSecret('relative'),{status:503});
});

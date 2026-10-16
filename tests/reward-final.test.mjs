import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Worker} from 'node:worker_threads';
import {execFileSync} from 'node:child_process';
import {Store} from '../server/store.mjs';
import {hash} from '../server/domain.mjs';
import {PROFILE_BINDING as B} from '../server/lazyingart-profile.mjs';
import {canonicalEvidence,createRewardEvidence} from '../server/reward-evidence.mjs';
import {createRewardSource} from '../server/reward-source.mjs';

const day=86400,subject='la_'+'1'.repeat(32),secret='s'.repeat(64);
async function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'oi-final-'));
 const s={dir,store:new Store(dir),time:1900000000000,proofCalls:0,withdrawn:false};
 s.authorize=async()=>{s.proofCalls++;if(s.withdrawn)throw Error('withdrawn');return{...B,subject}};
 s.open=()=>{s.evidence=createRewardEvidence(s.store,{authorize:s.authorize,now:()=>s.time});s.source=createRewardSource({secret,evidence:s.evidence,now:()=>s.time})};
 s.open();t.after(()=>{s.store.close();rmSync(dir,{recursive:true,force:true})});
 s.event=await s.evidence.checkIn({id:'reader'});
 s.binding={issuer:B.issuer,subject,actor:B.clientId};
 s.decision={contract:'app-lac-source-final-v1',decision_id:'final_'+'a'.repeat(32),receipt_id:'receipt-original',...s.binding,event:s.event,outcome:'expired_pending',awarded_points:'0',finalized_at:Math.floor(s.time/1000)};
 s.deliver=(decision=s.decision,nonce='a'.repeat(48),extra={})=>s.source.handle({operation:'final',method:'POST',headers:{'x-lac-source-key':secret,'content-type':'application/json'},body:Buffer.from(JSON.stringify({schema_version:1,...s.binding,nonce,decision})),...extra});
 s.adopt=(decision=s.decision)=>s.evidence.adoptFinal({...s.binding,decision});
 s.rows=()=>s.store.db.prepare('SELECT * FROM lac_source_finals').all();
 s.restart=()=>{s.store.close();s.store=new Store(dir);s.open()};
 return s;
}

test('final decision is durable before ACK; lost response and restart preserve digest and first adoption',async t=>{
 const s=await fixture(t);s.evidence.bindIntake({...s.binding,event:s.event,receipt_id:s.decision.receipt_id});
 s.time+=7*day*1000;
 await s.deliver(); // discard the first response as if delivery lost it
 const original=s.rows();assert.equal(original.length,1);
 assert.equal(original[0].adopted,Math.floor(s.time/1000));
 assert.equal(original[0].decision,canonicalEvidence(s.decision));
 s.restart();s.time+=day*1000;
 const ack=await s.deliver(s.decision,'b'.repeat(48));
 assert.deepEqual(ack,{schema_version:1,actor:B.clientId,nonce:'b'.repeat(48),as_of:Math.floor(s.time/1000),decision_sha256:hash(canonicalEvidence(s.decision))});
 assert.deepEqual(s.rows(),original);
 const freshProcess=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',`
  import {Store} from ${JSON.stringify(new URL('../server/store.mjs',import.meta.url).href)};
  import {createRewardEvidence} from ${JSON.stringify(new URL('../server/reward-evidence.mjs',import.meta.url).href)};
  import {createRewardSource} from ${JSON.stringify(new URL('../server/reward-source.mjs',import.meta.url).href)};
  import {readFileSync} from 'node:fs';
  const input=JSON.parse(readFileSync(0,'utf8')),store=new Store(input.dir);
  try{
   const evidence=createRewardEvidence(store,{authorize:async()=>{throw Error('no consent')},now:()=>input.time});
   const source=createRewardSource({secret:input.secret,evidence,now:()=>input.time});
   const ack=await source.handle({operation:'final',method:'POST',headers:{'x-lac-source-key':input.secret,'content-type':'application/json'},body:Buffer.from(JSON.stringify(input.query))});
   console.log(JSON.stringify(ack));
  }finally{store.close()}
 `],{input:JSON.stringify({dir:s.dir,time:s.time,secret,query:{schema_version:1,...s.binding,decision:s.decision,nonce:'c'.repeat(48)}}),encoding:'utf8',stdio:['pipe','pipe','pipe']}));
 assert.deepEqual(freshProcess,{...ack,nonce:'c'.repeat(48)});assert.deepEqual(s.rows(),original);
 assert.equal(s.store.db.prepare('SELECT count(*) n FROM credit_ledger').get().n,0);
 await assert.rejects(s.evidence.read({...s.binding,reference:s.event.evidence_ref,scope:'lac.points.intents.write'}),{status:404});
 assert.equal(await s.evidence.eligible({...s.binding,policy_id:s.event.policy_id,policy_version:1,phase:'award',event:s.event}),false);
});

test('source key reconciles held, deleted or withdrawn accounts without new consent or eligibility',async t=>{
 const s=await fixture(t);s.evidence.hold('reader');s.evidence.remove('reader');s.withdrawn=true;
 s.store.db.prepare('INSERT INTO deleted_accounts VALUES(?)').run('reader');
 const calls=s.proofCalls;assert.equal((await s.deliver()).decision_sha256,hash(canonicalEvidence(s.decision)));assert.equal(s.proofCalls,calls);
 assert.equal(s.store.db.prepare('SELECT state FROM lac_source_evidence').get().state,'deleted');
 assert.equal(await s.evidence.eligible({...s.binding,policy_id:s.event.policy_id,policy_version:1,phase:'award',event:s.event}),false);
});

test('retention uses the later of seal and first durable adoption with an exact 90-day boundary',async t=>{
 const s=await fixture(t),sealed=s.decision.finalized_at;
 s.time+=(200*day)*1000;s.adopt();const adopted=Math.floor(s.time/1000);
 assert.equal(s.evidence.purge(),0);
 s.time=(adopted+90*day-1)*1000;assert.equal(s.evidence.purge(),0);
 s.adopt();assert.equal(s.rows()[0].adopted,adopted);
 s.time=(adopted+90*day)*1000;assert.equal(s.evidence.purge(),1);
 assert.equal(s.rows().length,0);assert.equal(s.store.db.prepare('SELECT count(*) n FROM lac_source_evidence').get().n,0);
 await assert.rejects(s.deliver(),{status:409});assert.ok(adopted>sealed);
});

test('allowed clock skew uses final time for retention when it is later than adoption',async t=>{
 const s=await fixture(t);s.decision.finalized_at+=30;s.adopt();
 s.time=(s.decision.finalized_at+90*day-1)*1000;assert.equal(s.evidence.purge(),0);
 s.time+=1000;assert.equal(s.evidence.purge(),1);
});

test('pending intake and legacy decided timestamps never authorize purge',async t=>{
 const s=await fixture(t);s.evidence.bindIntake({...s.binding,event:s.event,receipt_id:s.decision.receipt_id});
 s.store.db.prepare('UPDATE lac_source_evidence SET decided=?').run(Math.floor(s.time/1000));
 s.time+=500*day*1000;assert.equal(s.evidence.purge(),0);assert.equal(s.rows().length,0);
 assert.equal(s.store.db.prepare('SELECT count(*) n FROM lac_source_intakes').get().n,1);
 assert.equal(s.evidence.decided,undefined);
});

test('unknown evidence, original identity/event/digest and known receipt conflicts remain unresolved',async t=>{
 const s=await fixture(t);s.evidence.bindIntake({...s.binding,event:s.event,receipt_id:s.decision.receipt_id});
 const variants=[
  {...s.decision,subject:'la_'+'2'.repeat(32)}, {...s.decision,actor:'bunko-server'},
  {...s.decision,issuer:'https://other.invalid'}, {...s.decision,receipt_id:'other-receipt'},
  ...Object.entries({policy_id:'different',policy_version:2,event_id:'other',occurred_at:s.event.occurred_at-1,evidence_ref:'unknown',evidence_sha256:'0'.repeat(64)}).map(([k,v])=>({...s.decision,event:{...s.event,[k]:v}}))
 ];
 for(const value of variants)await assert.rejects(s.deliver(value),{status:409});
 assert.equal(s.rows().length,0);
 s.store.db.prepare("UPDATE lac_source_evidence SET record=replace(record,'onlyideas-server','different-actor')").run();
 await assert.rejects(s.deliver(),{status:409});
});

test('adopted finals reject changed decision ID, receipt, outcome, amount and time',async t=>{
 const s=await fixture(t);s.adopt();const before=s.rows();
 for(const change of [{decision_id:'final_'+'b'.repeat(32)},{receipt_id:'other'},{outcome:'reversed'},{outcome:'awarded',awarded_points:'5'},{finalized_at:s.decision.finalized_at+1}])await assert.rejects(s.deliver({...s.decision,...change}),{status:409});
 assert.deepEqual(s.rows(),before);
 assert.throws(()=>s.evidence.bindIntake({...s.binding,event:s.event,receipt_id:'wrong'}),{status:409});
 s.evidence.bindIntake({...s.binding,event:s.event,receipt_id:s.decision.receipt_id});
});

test('decision and receipt identifiers cannot be reused for another durable event',async t=>{
 const s=await fixture(t);s.adopt();s.time+=day*1000;
 const event=await s.evidence.checkIn({id:'reader'}),next={...s.decision,event,finalized_at:Math.floor(s.time/1000)};
 assert.throws(()=>s.evidence.bindIntake({...s.binding,event,receipt_id:s.decision.receipt_id}),{status:409});
 await assert.rejects(s.deliver({...next,receipt_id:'second'}),{status:409});
 await assert.rejects(s.deliver({...next,decision_id:'final_'+'b'.repeat(32)}),{status:409});
 assert.equal(s.rows().length,1);
});

test('wire types, duplicate/extra keys, amount and timestamp validation precede adoption',async t=>{
 const s=await fixture(t);
 for(const change of [{contract:'other'},{decision_id:'final_BAD'},{receipt_id:''},{extra:1},{finalized_at:true},{finalized_at:0},{finalized_at:s.decision.finalized_at-1},{finalized_at:s.decision.finalized_at+31},{finalized_at:2**53},{outcome:'pending'},{awarded_points:'01'},{awarded_points:'-1'},{awarded_points:0},{awarded_points:'5'},{awarded_points:'1e2'}])await assert.rejects(s.deliver({...s.decision,...change}),{status:400});
 const data={schema_version:1,...s.binding,nonce:'a'.repeat(48),decision:s.decision};
 for(const body of [JSON.stringify({...data,extra:true}),JSON.stringify(data).replace('"receipt_id":','"receipt_id":"dup","receipt_id":'),JSON.stringify({...data,decision:{...s.decision,event:{...s.event,amount:5}}})])await assert.rejects(s.deliver(s.decision,undefined,{body:Buffer.from(body)}),{status:400});
 assert.equal(s.rows().length,0);
});

test('a write failure returns 503 with no partial adoption; retry succeeds after storage recovers',async t=>{
 const s=await fixture(t);
 s.store.db.exec("CREATE TRIGGER fail_final BEFORE INSERT ON lac_source_finals BEGIN SELECT RAISE(ABORT,'private storage detail'); END;");
 await assert.rejects(s.deliver(),e=>e.status===503&&!e.message.includes('private'));assert.equal(s.rows().length,0);
 s.store.db.exec('DROP TRIGGER fail_final');assert.equal((await s.deliver()).decision_sha256,hash(canonicalEvidence(s.decision)));
});

test('bounded purge removes evidence/intake/final atomically and leaves unresolved work',async t=>{
 const s=await fixture(t);s.evidence.bindIntake({...s.binding,event:s.event,receipt_id:s.decision.receipt_id});s.adopt();
 s.time+=day*1000;const pending=await s.evidence.checkIn({id:'reader'});
 s.time+=90*day*1000;
 s.store.db.exec("CREATE TRIGGER fail_purge BEFORE DELETE ON lac_source_finals BEGIN SELECT RAISE(ABORT,'private failure'); END;");
 assert.throws(()=>s.evidence.purge(),{status:503});assert.equal(s.rows().length,1);assert.equal(s.store.db.prepare('SELECT count(*) n FROM lac_source_intakes').get().n,1);assert.equal(s.store.db.prepare('SELECT count(*) n FROM lac_source_evidence').get().n,2);
 s.store.db.exec('DROP TRIGGER fail_purge');assert.equal(s.evidence.purge({limit:1}),1);
 assert.equal(s.store.db.prepare('SELECT reference FROM lac_source_evidence').get().reference,pending.evidence_ref);
 for(const limit of [0,1001,1.5,true])assert.throws(()=>s.evidence.purge({limit}),{status:400});
});

test('in-flight eligibility cannot succeed after final adoption',async t=>{
 const s=await fixture(t);const evidence=createRewardEvidence(s.store,{now:()=>s.time,authorize:async()=>{s.adopt();return{...B,subject}}});
 assert.equal(await evidence.eligible({...s.binding,policy_id:s.event.policy_id,policy_version:1,phase:'award',event:s.event}),false);
 await assert.rejects(s.evidence.checkIn({id:'reader'}),{status:409});
});

test('independent SQLite writers adopt one immutable final and reject a competing outcome',async t=>{
 const s=await fixture(t),start=new SharedArrayBuffer(4),gate=new Int32Array(start);
 const decisions=[s.decision,s.decision,{...s.decision,outcome:'awarded',awarded_points:'5'}];
 const workers=decisions.map(decision=>new Worker(`
  const {parentPort,workerData}=require('node:worker_threads');
  (async()=>{
   const {Store}=await import(workerData.storeModule);
   const {createRewardEvidence}=await import(workerData.evidenceModule);
   const store=new Store(workerData.dir);
   const evidence=createRewardEvidence(store,{authorize:async()=>{throw Error('no consent')},now:()=>workerData.time});
   parentPort.postMessage({ready:true});Atomics.wait(new Int32Array(workerData.start),0,0);
   try{parentPort.postMessage({digest:evidence.adoptFinal(workerData.input)})}
   catch(error){parentPort.postMessage({status:error.status})}finally{store.close()}
  })().catch(error=>{throw error});
 `,{eval:true,workerData:{dir:s.dir,time:s.time,start,input:{...s.binding,decision},storeModule:new URL('../server/store.mjs',import.meta.url).href,evidenceModule:new URL('../server/reward-evidence.mjs',import.meta.url).href}}));
 t.after(()=>Promise.all(workers.map(w=>w.terminate())));
 const results=workers.map(w=>new Promise((resolve,reject)=>{w.on('message',v=>{if(!v.ready)resolve(v)});w.on('error',reject)}));
 await Promise.all(workers.map(w=>new Promise((resolve,reject)=>{w.once('message',v=>{assert.equal(v.ready,true);resolve()});w.on('error',reject)})));
 Atomics.store(gate,0,1);Atomics.notify(gate,0);
 const outcome=await Promise.all(results);assert.equal(s.rows().length,1);
 const row=s.rows()[0];for(const [i,result] of outcome.entries())if(row.decision===canonicalEvidence(decisions[i]))assert.equal(result.digest,row.digest);else assert.equal(result.status,409);
});

test('a SQLite lock is unavailable within the transport deadline and does not persist a partial final',async t=>{
 const s=await fixture(t),other=new Store(s.dir);t.after(()=>other.close());
 other.db.exec('BEGIN IMMEDIATE');const started=Date.now();
 await assert.rejects(s.deliver(),{status:503});assert.ok(Date.now()-started<2500);
 assert.equal(s.rows().length,0);assert.equal(s.store.db.prepare('PRAGMA busy_timeout').get().timeout,15000);
 other.db.exec('ROLLBACK');await s.deliver();assert.equal(s.rows().length,1);
});

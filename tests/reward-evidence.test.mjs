import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {Store} from '../server/store.mjs';import {hash} from '../server/domain.mjs';import {PROFILE_BINDING as B} from '../server/lazyingart-profile.mjs';import {canonicalEvidence,createRewardEvidence} from '../server/reward-evidence.mjs';
function fixture(t){const dir=mkdtempSync(join(tmpdir(),'onlyideas-rewards-')),store=new Store(dir);t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true})});const s={store,time:1900000000000,identity:{...B,subject:'la_'+'1'.repeat(32)},active:true};s.authorize=async(owner,scope)=>{assert.equal(owner,'reader');assert.ok(scope.startsWith('lac.points.'));if(!s.active)throw Error('consent revoked');return s.identity};s.evidence=createRewardEvidence(store,{authorize:s.authorize,now:()=>s.time});s.read=intent=>s.evidence.read({issuer:B.issuer,actor:B.clientId,subject:s.identity.subject,reference:intent.evidence_ref,scope:'lac.points.intents.write'});return s}
test('daily check-in is durable and idempotent; source never grants a local or shared balance',async t=>{
 const s=fixture(t),a=await s.evidence.checkIn({id:'reader'}),b=await s.evidence.checkIn({id:'reader'});assert.deepEqual(a,b);
 const result=await s.read(a);assert.equal(result.eligible,true);assert.equal(hash(canonicalEvidence(result.record)),a.evidence_sha256);assert.equal(result.record.facts.activity_rule,'onlyideas-daily-check-in-v1');
 assert.equal(s.store.db.prepare('SELECT count(*) AS n FROM credit_ledger').get().n,0);
 s.evidence=createRewardEvidence(s.store,{authorize:s.authorize,now:()=>s.time});assert.deepEqual(await s.evidence.checkIn({id:'reader'}),a);
 s.time+=86400_000;assert.notEqual((await s.evidence.checkIn({id:'reader'})).event_id,a.event_id);
});
test('revoked consent, wrong account, held work and deletion deny evidence',async t=>{
 const s=fixture(t),a=await s.evidence.checkIn({id:'reader'});s.active=false;await assert.rejects(s.read(a));s.active=true;
 await assert.rejects(s.evidence.read({issuer:B.issuer,actor:'bunko-server',subject:s.identity.subject,reference:a.evidence_ref,scope:'lac.points.intents.write'}));
 s.evidence.hold('reader');await assert.rejects(s.read(a));await assert.rejects(s.evidence.checkIn({id:'reader'}));s.identity.subject='la_'+'2'.repeat(32);await s.evidence.resume('reader');await assert.rejects(s.read(a));
 s.identity.subject='la_'+'1'.repeat(32);await s.evidence.resume('reader');assert.equal((await s.read(a)).eligible,true);
 s.evidence.remove('reader');await s.evidence.resume('reader');await assert.rejects(s.read(a));await assert.rejects(s.evidence.checkIn({id:'reader'}));
});
test('eligibility pins the full original event; evidence retention never removes undecided rows',async t=>{
 const s=fixture(t),a=await s.evidence.checkIn({id:'reader'}),q={issuer:B.issuer,subject:s.identity.subject,actor:B.clientId,policy_id:a.policy_id,policy_version:1,phase:'intake',event:a};
 assert.equal(await s.evidence.eligible(q),true);assert.equal(await s.evidence.eligible({...q,event:{...a,event_id:'different'}}),false);
 assert.equal(await s.evidence.eligible({...q,policy_id:'lac-approved-public-paper'}),false);
 s.time+=91*86400_000;assert.equal(s.evidence.purge(),0);s.evidence.decided(a.evidence_ref,s.identity.subject);assert.equal(s.evidence.purge(),0);
 s.time+=91*86400_000;assert.equal(s.evidence.purge(),1);assert.equal(await s.evidence.eligible(q),false);
});
test('suspension while authorization is in flight cannot create activity evidence',async t=>{
 const s=fixture(t);const evidence=createRewardEvidence(s.store,{now:()=>s.time,authorize:async()=>{s.store.db.prepare('INSERT INTO suspensions VALUES(?,?)').run('reader',s.time);return s.identity}});
 await assert.rejects(evidence.checkIn({id:'reader'}));assert.equal(s.store.db.prepare('SELECT count(*) AS n FROM lac_source_evidence').get().n,0);
});
test('canonical evidence uses exact sorted JSON and rejects malformed numeric/text claims',()=>{
 assert.equal(canonicalEvidence({z:'研究',a:{two:2,one:1}}),'{"a":{"one":1,"two":2},"z":"研究"}');
 for(const v of [NaN,Infinity,1.5,9007199254740992,'\ud800',undefined])assert.throws(()=>canonicalEvidence({v}));
});

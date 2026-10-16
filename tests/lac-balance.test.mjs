import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {createHash} from 'node:crypto';
import {createLacBalance,validateLacSnapshot,LAC_READ,LAC_ASSET} from '../server/lac-balance.mjs';
const issuer='https://chat.lazying.art',sub='la_'+'a'.repeat(32);
export function snapshot({subject=sub,revision='2',awarded='5',asOf=1900000000}={}){return {schema_version:1,contract:LAC_READ.contract,as_of:asOf,account:{issuer,subject},balance_id:'lac_fun_points_'+createHash('sha256').update(JSON.stringify([issuer,subject,LAC_READ.asset])).digest('hex'),revision,asset:{...LAC_ASSET},ledger:'fun_points',pending_points:'3',awarded_points:awarded,reversed_points:'2',counts:{pending:1,awarded:1,reversed:1},spendable:false,aggregation:'canonical_account_snapshot_do_not_sum_across_apps'}}
function fixture(t,client='bunko'){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());const binding={issuer,clientId:client+'-server',audience:client+'-service',redirectUri:client==='bunko'?'https://llm.lazying.art/bunko/oauth/lazyingart/callback':'https://agent.onlyideas.art/api/auth/lazyingart/callback'};
 const s={db,binding,time:1900000000000,subject:sub,generation:'v1',state:'active',calls:0,value:snapshot()};
 s.profile={enabled:true,connection:()=>({issuer,subject:s.subject,generation:s.generation,state:s.state}),proof:async()=>({identity:{issuer,subject:s.subject},accessToken:'profile-secret-must-not-be-forwarded'})};
 s.provider={qualified:true,binding,contract:LAC_READ.contract,scope:LAC_READ.scope,origin:LAC_READ.origin,audience:LAC_READ.audience,authorize:async args=>{assert.equal('accessToken' in args,false);return {issuer,subject:args.subject,actor:binding.clientId,sourceAudience:binding.audience,scope:LAC_READ.scope}},balance:async()=>{s.calls++;return s.value}};
 s.options={binding,profile:s.profile,provider:s.provider,now:()=>s.time};s.read=createLacBalance(db,{enabled:true},s.options);return s;
}
test('disabled or missing provider creates no ledger, revision state or network calls',()=>{
 const db=new DatabaseSync(':memory:');try{assert.deepEqual(createLacBalance(db,{}),{enabled:false});assert.deepEqual(createLacBalance(db,{enabled:true},{profile:{enabled:true}}),{enabled:false});assert.equal(db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='lac_read_revisions'").get().n,0)}finally{db.close()}
});
test('both app bindings read the same canonical net balance without copying app credit totals',async t=>{
 for(const client of ['bunko','onlyideas']){const s=fixture(t,client);s.db.exec('CREATE TABLE local_credits(balance INTEGER);INSERT INTO local_credits VALUES(45)');const a=await s.read.read('local-account');assert.equal(a.balance,'5');assert.equal(a.pending,'3');await s.read.read('local-account');assert.equal(s.db.prepare('SELECT balance FROM local_credits').get().balance,45);assert.equal(s.db.prepare('SELECT count(*) n FROM lac_read_revisions').get().n,1)}
});
test('no consent or wrong actor/scope fails before the resource call; no profile token is passed',async t=>{
 const s=fixture(t);s.provider.authorize=async()=>({issuer,subject:sub,actor:s.binding.clientId,sourceAudience:s.binding.audience,scope:'profile'});await assert.rejects(s.read.read('reader'),{code:'points_consent_required'});assert.equal(s.calls,0);
 assert.throws(()=>createLacBalance(s.db,{enabled:true},{...s.options,provider:{...s.provider,binding:{...s.binding,clientId:'platform'}}}),{code:'points_not_qualified'});
});
test('a valid zero is distinct from an outage and all amounts retain integer precision',async t=>{
 const s=fixture(t);s.value=snapshot({awarded:'0'});assert.equal((await s.read.read('reader')).balance,'0');s.provider.balance=async()=>{throw Error('unavailable')};await assert.rejects(s.read.read('reader'));
 const v=snapshot({awarded:'9223372036854775807'});assert.equal(validateLacSnapshot(v,{issuer,subject:sub,now:s.time}).awarded_points,'9223372036854775807');
});
test('strict asset, identity, schema, precision and freshness validation',()=>{
 const mutations=[v=>v.asset.on_chain=true,v=>v.asset.decimals=18,v=>v.account.subject='la_'+'b'.repeat(32),v=>v.awarded_points=5,v=>v.awarded_points='01',v=>v.awarded_points='9223372036854775808',v=>v.counts.pending=true,v=>v.as_of-=61,v=>v.as_of+=31,v=>v.extra='ignored?',v=>v.balance_id='wrong',v=>v.contract='app-fun-points-v1'];
 for(const mutate of mutations){const v=snapshot();mutate(v);assert.throws(()=>validateLacSnapshot(v,{issuer,subject:sub,now:1900000000000}),{code:'points_snapshot_invalid'})}
});
test('durable revisions reject rollback and conflicting content after restart',async t=>{
 const s=fixture(t);await s.read.read('reader');s.read=createLacBalance(s.db,{enabled:true},s.options);s.value=snapshot({revision:'1'});await assert.rejects(s.read.read('reader'));
 s.value=snapshot({awarded:'7'});await assert.rejects(s.read.read('reader'),{code:'points_snapshot_conflict'});
 s.value=snapshot({revision:'3',awarded:'7'});assert.equal((await s.read.read('reader')).balance,'7');
});
test('unlink/account replacement during a resource request cannot return the old balance',async t=>{
 const s=fixture(t);let release;s.provider.balance=async()=>{await new Promise(r=>{release=r});return s.value};const p=s.read.read('reader');await new Promise(r=>setImmediate(r));s.generation='v2';s.subject='la_'+'b'.repeat(32);release();await assert.rejects(p,{code:'points_identity_changed'});assert.equal(s.db.prepare('SELECT count(*) n FROM lac_read_revisions').get().n,0);
});
test('concurrent slow older read cannot overwrite a newer revision',async t=>{
 const s=fixture(t);let release,first=true;s.provider.balance=async()=>{if(first){first=false;await new Promise(r=>{release=r});return snapshot({revision:'2'})}return snapshot({revision:'3'})};const old=s.read.read('reader');await new Promise(r=>setImmediate(r));await s.read.read('reader');release();await assert.rejects(old,{code:'points_snapshot_rollback'});
});
test('missing link and revoked profile request reconnection, while refresh contention stays unavailable',async t=>{
 const s=fixture(t);s.state='disconnected';await assert.rejects(s.read.read('reader'),{code:'points_link_required'});s.state='refreshing';await assert.rejects(s.read.read('reader'),{code:'points_session_unavailable'});s.state='active';s.profile.proof=async()=>{throw Object.assign(Error('revoked'),{code:'reconnect_required'})};await assert.rejects(s.read.read('reader'),{code:'points_link_required'});assert.equal(s.calls,0);
});

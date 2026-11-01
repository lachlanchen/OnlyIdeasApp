import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {Store} from '../server/store.mjs';
import {createApp} from '../server/app.mjs';
import {creditResetSettings,updateCreditResetSettings,creditSummary,creditTransaction,grantDailyCredits,reserveImport,finishImportCredits,retryImportCredits,deleteCredits} from '../server/credits.mjs';
const DAY=86400_000, monday=Date.UTC(2026,10,2), sunday=monday-1;
const earning={credits:{earningEnabled:true,dailyBonusEnabled:true}}, spending={credits:{enabled:true}};
function fixture(t){const dir=mkdtempSync(join(tmpdir(),'onlyideas-expiry-')),store=new Store(dir);t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true})});return{store,dir}}
const summary=(s,now)=>creditSummary(s,'reader',{},now);
const job=(pages=20)=>({id:randomUUID(),owner:'reader',kind:'import',sharing:'private',pages});
const reserve=(s,j,now)=>creditTransaction(s,()=>reserveImport(s,spending,j,j.pages,now));
const finish=(s,j,success,now)=>creditTransaction(s,()=>finishImportCredits(s,j,success,now));

test('weekly default ends exactly on UTC Monday, not seven days after each grant',t=>{
 const {store}=fixture(t);
 assert.equal(creditResetSettings(store,sunday).nextAt,monday);
 assert.equal(creditResetSettings(store,monday).nextAt,monday+7*DAY);
 grantDailyCredits(store,'reader',earning,sunday-2*DAY);grantDailyCredits(store,'reader',earning,sunday);
 assert.equal(summary(store,sunday).balance,200);assert.equal(summary(store,sunday).expiring.nextAt,monday);
 assert.equal(summary(store,monday).balance,0);assert.equal(summary(store,monday).balance,0);
 assert.equal(store.db.prepare("SELECT count(*) n FROM credit_ledger WHERE kind='daily_expired'").get().n,2);
 grantDailyCredits(store,'reader',earning,monday);
 assert.equal(summary(store,monday).balance,100);assert.equal(summary(store,monday).expiring.nextAt,monday+7*DAY);
});
test('reset consumes unused bonus only; paid, contribution and pre-policy balances remain',t=>{
 const {store}=fixture(t);
 for(const [id,delta,kind] of [['paid',200,'subscription'],['old',100,'daily_bonus'],['reward',10,'public_reward']])store.db.prepare('INSERT INTO credit_ledger VALUES(?,?,?,?,?,?)').run(id,'reader',delta,kind,null,sunday-10*DAY);
 grantDailyCredits(store,'reader',earning,sunday);
 assert.equal(summary(store,monday).balance,310);
 assert.equal(summary(store,monday).expiring.amount,0);
 assert.deepEqual(store.db.prepare("SELECT delta FROM credit_ledger WHERE id IN ('paid','old','reward') ORDER BY id").all().map(x=>x.delta),[100,200,10]);
});
test('imports spend soonest-expiring credits first and expire only their unused remainder',t=>{
 const {store}=fixture(t);grantDailyCredits(store,'reader',earning,sunday);
 const j=job(40);reserve(store,j,sunday);finish(store,j,true,sunday);
 // Welcome is independent and stays available after the 60 unused bonus expires.
 assert.equal(summary(store,sunday).balance,90);assert.equal(summary(store,sunday).expiring.amount,60);
 assert.equal(summary(store,monday).balance,30);
});
test('a held reservation survives the boundary; expired bonus refunds never resurrect',t=>{
 const {store}=fixture(t);grantDailyCredits(store,'reader',earning,sunday);const j=job(80);reserve(store,j,sunday);
 assert.equal(summary(store,monday).balance,30);assert.equal(summary(store,monday).held,80);
 finish(store,j,false,monday);finish(store,j,false,monday);
 assert.equal(summary(store,monday).balance,30);assert.equal(summary(store,monday).held,0);
 assert.equal(store.db.prepare("SELECT delta FROM credit_ledger WHERE id=?").get('expire-refund:'+j.id+':0').delta,-80);
});
test('partial completion refunds permanent funds and expires only returned daily funds',t=>{
 const {store}=fixture(t);store.db.prepare('INSERT INTO credit_ledger VALUES(?,?,?,?,?,?)').run('paid','reader',200,'subscription',null,sunday);
 grantDailyCredits(store,'reader',earning,sunday);const j=job(150);reserve(store,j,sunday);j.pages=20;
 finish(store,j,true,monday);assert.equal(summary(store,monday).balance,230);
 assert.equal(store.db.prepare("SELECT delta FROM credit_ledger WHERE id=?").get('expire-refund:'+j.id+':0').delta,-80);
});
test('refund before reset returns the original lot with its original deadline',t=>{
 const {store}=fixture(t);grantDailyCredits(store,'reader',earning,sunday);const j=job(80);reserve(store,j,sunday);
 finish(store,j,false,sunday);assert.equal(summary(store,sunday).expiring.amount,100);
 assert.equal(summary(store,monday).balance,30);
});
test('retry after boundary cannot spend an expired grant or duplicate its expiry',t=>{
 const {store}=fixture(t);grantDailyCredits(store,'reader',earning,sunday);const j=job(80);reserve(store,j,sunday);finish(store,j,false,sunday);
 assert.throws(()=>creditTransaction(store,()=>retryImportCredits(store,j,80,monday)),/Not enough credits/);
 assert.equal(summary(store,monday).balance,30);assert.equal(summary(store,monday).balance,30);
});
test('admin policy persists across stores, changes future grants only, and rejects stale edits',t=>{
 const {store,dir}=fixture(t);grantDailyCredits(store,'reader',earning,sunday-2*DAY);
 const changed=updateCreditResetSettings(store,'admin',{days:1,revision:1},sunday-DAY);
 assert.equal(changed.days,1);assert.equal(changed.nextAt,monday-DAY);
 grantDailyCredits(store,'reader',earning,sunday);
 const lots=store.db.prepare('SELECT expires FROM credit_bonus_lots ORDER BY id').all();assert.ok(lots.every(x=>x.expires===monday));
 const reopened=new Store(dir);try{assert.equal(creditResetSettings(reopened).days,1)}finally{reopened.close()}
 assert.throws(()=>updateCreditResetSettings(store,'admin',{days:14,revision:1}),/changed/);
 for(const days of [0,-1,366,1.5,'7',null])assert.throws(()=>updateCreditResetSettings(store,'admin',{days,revision:2}),/between/);
 assert.equal(store.db.prepare('SELECT count(*) n FROM credit_reset_audit').get().n,1);
});
test('daily reset mode expires at UTC midnight and preserves independently dated lots',t=>{
 const {store}=fixture(t);grantDailyCredits(store,'reader',earning,sunday-2*DAY);
 updateCreditResetSettings(store,'admin',{days:1,revision:1},sunday-2*DAY);
 grantDailyCredits(store,'reader',earning,sunday-DAY);
 assert.equal(summary(store,sunday).balance,100);assert.equal(summary(store,monday).balance,0);
});
test('expiry write failure rolls back both ledger and remaining bonus',t=>{
 const {store}=fixture(t);grantDailyCredits(store,'reader',earning,sunday);
 store.db.exec("CREATE TRIGGER fail_expiry BEFORE INSERT ON credit_ledger WHEN NEW.kind='daily_expired' BEGIN SELECT RAISE(ABORT,'expiry failed'); END");
 assert.throws(()=>summary(store,monday),/expiry failed/);
 assert.equal(store.db.prepare('SELECT remaining FROM credit_bonus_lots').get().remaining,100);
 store.db.exec('DROP TRIGGER fail_expiry');assert.equal(summary(store,monday).balance,0);
});
test('independent balance readers expire the same grant exactly once',async t=>{
 const {store,dir}=fixture(t);grantDailyCredits(store,'reader',earning,sunday);
 const script=`import{Store}from'./server/store.mjs';import{creditSummary}from'./server/credits.mjs';const s=new Store(process.argv[1]);try{console.log(creditSummary(s,'reader',{},Number(process.argv[2])).balance)}finally{s.close()}`;
 const results=await Promise.all(Array.from({length:4},()=>promisify(execFile)(process.execPath,['--input-type=module','-e',script,dir,String(monday)])));
 assert.deepEqual(results.map(r=>Number(r.stdout.trim())),[0,0,0,0]);
 assert.equal(store.db.prepare("SELECT count(*) n FROM credit_ledger WHERE kind='daily_expired'").get().n,1);
});
test('account deletion removes bonus allocations and lots without removing deduplication',t=>{
 const {store}=fixture(t);grantDailyCredits(store,'reader',earning,sunday);reserve(store,job(),sunday);
 creditTransaction(store,()=>deleteCredits(store,'reader'));
 for(const table of ['credit_bonus_lots','credit_hold_bonus'])assert.equal(store.db.prepare(`SELECT count(*) n FROM ${table}`).get().n,0);
 assert.equal(grantDailyCredits(store,'reader',earning,sunday),0);
});
test('only active admins can edit; CSRF and revision checks preserve settings and billing configuration',async t=>{
 const {store}=fixture(t),origin='http://127.0.0.1:4182',config={...earning,origin,publicationReviewers:['admin']};
 const frozen=JSON.stringify(config),app=createApp(store,config,{worker:false});await new Promise(r=>app.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>app.close(r)));
 const sessions={admin:store.createSession({id:'admin'}),reader:store.createSession({id:'reader'})};
 const call=async(who,body,requestOrigin=origin)=>{const r=await fetch(`http://127.0.0.1:${app.address().port}/api/admin/credits/reset`,{method:body?'PUT':'GET',headers:{Origin:requestOrigin,...(who?{Cookie:'onlyideas-local='+sessions[who]}:{}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return{status:r.status,data:await r.json()}};
 assert.equal((await call(null)).status,401);assert.equal((await call('reader')).status,403);
 assert.equal((await call('admin')).data.days,7);
 assert.equal((await call('admin',{days:1,revision:1},'https://evil.invalid')).status,403);
 assert.equal((await call('admin',{days:1,revision:1})).data.days,1);
 assert.equal((await call('admin',{days:14,revision:1})).status,409);
 store.db.prepare('INSERT INTO suspensions VALUES(?,?)').run('admin',Date.now());assert.equal((await call('admin',{days:7,revision:2})).status,401);
 assert.equal(JSON.stringify(config),frozen);
});

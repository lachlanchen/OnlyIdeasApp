import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID,generateKeyPairSync} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {Store} from '../server/store.mjs';
import {creditSummary,creditTransaction,reserveImport,finishImportCredits} from '../server/credits.mjs';
import {billingAccount,applyVerifiedPurchase,activePlan,deleteBillingAccount} from '../server/billing-ledger.mjs';
import {appleProof,googleProof,createPurchaseVerifiers,verifyAppleSigned} from '../server/purchase-verification.mjs';
import {VerificationStatus} from '@apple/app-store-server-library';
const config={credits:{enabled:true}};
function fixture(t){const directory=mkdtempSync(join(tmpdir(),'onlyideas-billing-')),store=new Store(directory);t.after(()=>{store.close();rmSync(directory,{recursive:true,force:true});});return {directory,store};}
function proof(store,fields={}){return {platform:'apple',environment:'Sandbox',accountToken:billingAccount(store,'reader'),receipt:randomUUID(),subscription:'subscription-one',product:'art.onlyideas.reader.monthly',expires:Date.now()+30*86400_000,observed:Date.now(),purchased:Date.now(),paid:true,revoked:false,state:'active',...fields};}
const balance=store=>creditSummary(store,'reader',config).balance;
test('monthly grants persist, renew once, restore without doubling, and expired benefits preserve credits',t=>{
 const {store}=fixture(t),p=proof(store);assert.equal(balance(store),30);
 assert.equal(applyVerifiedPurchase(store,p,'reader').awarded,200);
 assert.equal(applyVerifiedPurchase(store,p,'reader').awarded,0);assert.equal(balance(store),230);assert.equal(activePlan(store,'reader').agentTurns,40);
 assert.equal(applyVerifiedPurchase(store,{...p,receipt:'renewal-2',observed:p.observed+1},'reader').awarded,200);assert.equal(balance(store),430);
 applyVerifiedPurchase(store,{...p,receipt:'renewal-2',observed:p.observed+2,state:'expired',expires:Date.now()-1},'reader');
 assert.equal(activePlan(store,'reader'),null);assert.equal(balance(store),430);
});
test('wrong account, product, provider and malformed proof cannot grant anything',t=>{
 const {store}=fixture(t),p=proof(store);billingAccount(store,'other');
 assert.throws(()=>applyVerifiedPurchase(store,p,'other'),/another OnlyIdeas account/);
 assert.throws(()=>applyVerifiedPurchase(store,{...p,product:'fake'},'reader'),/Unrecognized/);
 assert.throws(()=>applyVerifiedPurchase(store,{...p,environment:'Xcode'},'reader'),/Unsupported/);
 assert.throws(()=>applyVerifiedPurchase(store,{...p,expires:Infinity},'reader'),/dates/);
 assert.equal(balance(store),30);
});
test('refunds reverse a grant once, preserve an audit trail and block spending after refund debt',t=>{
 const {store}=fixture(t),p=proof(store);applyVerifiedPurchase(store,p,'reader');
 for(let i=0;i<8;i++)creditTransaction(store,()=>{const j={id:randomUUID(),owner:'reader',kind:'import',pages:25,sharing:'private'};reserveImport(store,config,j,25);finishImportCredits(store,j,true);});
 assert.equal(balance(store),30);
 const refund={...p,state:'revoked',revoked:true,observed:p.observed+1};applyVerifiedPurchase(store,refund);applyVerifiedPurchase(store,refund);
 assert.equal(balance(store),-170);assert.equal(activePlan(store,'reader'),null);
 assert.throws(()=>creditTransaction(store,()=>reserveImport(store,config,{id:randomUUID(),owner:'reader',kind:'markdown'},1)),/Not enough/);
 assert.equal(store.db.prepare("SELECT count(*) AS n FROM credit_ledger WHERE kind='purchase_refund'").get().n,1);
});
test('refund arriving first and out-of-order old active receipts cannot restore revoked credit or benefits',t=>{
 const {store}=fixture(t),p=proof(store);
 applyVerifiedPurchase(store,{...p,revoked:true,state:'revoked',observed:p.observed+1});
 assert.equal(applyVerifiedPurchase(store,p,'reader').awarded,0);
 assert.equal(applyVerifiedPurchase(store,{...p,observed:p.observed+2},'reader').awarded,0);
 assert.equal(balance(store),30);assert.equal(activePlan(store,'reader'),null);
});
test('simultaneous receipt delivery from independent processes grants once',async t=>{
 const {directory,store}=fixture(t),p=proof(store),exec=promisify(execFile);
 const script=`import {Store} from './server/store.mjs';import {applyVerifiedPurchase} from './server/billing-ledger.mjs';const store=new Store(process.argv[1]);try{console.log(applyVerifiedPurchase(store,JSON.parse(process.argv[2]),'reader').awarded)}finally{store.close()}`;
 const outputs=await Promise.all(Array.from({length:6},()=>exec(process.execPath,['--input-type=module','-e',script,directory,JSON.stringify(p)])));
 assert.equal(outputs.filter(r=>r.stdout.trim()==='200').length,1);assert.equal(balance(store),230);
});
test('a delayed refund of an older renewal does not disable a newer paid period',t=>{
 const {store}=fixture(t),old=proof(store);applyVerifiedPurchase(store,old,'reader');
 const renewal={...old,receipt:'next-cycle',purchased:old.purchased+1000,observed:old.observed+1000,expires:old.expires+30*86400_000};
 applyVerifiedPurchase(store,renewal,'reader');
 applyVerifiedPurchase(store,{...old,revoked:true,state:'revoked',observed:old.observed+5000});
 assert.equal(balance(store),230);assert.equal(activePlan(store,'reader').id,'reader');
});
test('deletion closes receipt ownership; pending payments grant nothing; expired receipts do not unlock service',t=>{
 const {store}=fixture(t),p=proof(store);assert.equal(applyVerifiedPurchase(store,{...p,paid:false,state:'pending'},'reader').awarded,0);assert.equal(activePlan(store,'reader'),null);
 const receipt={...p,expires:Date.now()-1,state:'expired'};assert.equal(applyVerifiedPurchase(store,receipt,'reader').awarded,200);assert.equal(activePlan(store,'reader'),null);
 creditTransaction(store,()=>deleteBillingAccount(store,'reader'));
 assert.throws(()=>applyVerifiedPurchase(store,p,'reader'),/another OnlyIdeas account/);
 assert.equal(applyVerifiedPurchase(store,{...p,receipt:'after-deletion'}).awarded,0);
 assert.equal(store.db.prepare('SELECT count(*) AS n FROM billing_subscriptions').get().n,0);
});
test('provider mappers require the real app, account binding and a paid matching order',()=>{
 const t={bundleId:'art.onlyideas.app',type:'Auto-Renewable Subscription',inAppOwnershipType:'PURCHASED',productId:'art.onlyideas.reader.monthly',appAccountToken:randomUUID(),transactionId:'12345',originalTransactionId:'12345',purchaseDate:Date.now()-1000,expiresDate:Date.now()+86400_000,signedDate:Date.now(),environment:'Sandbox',price:2990};
 assert.equal(appleProof(t).paid,true);assert.equal(appleProof({...t,price:0}).paid,false);
 assert.throws(()=>appleProof({...t,bundleId:'another.app'}),/not an OnlyIdeas/);
 assert.throws(()=>appleProof({...t,appAccountToken:null}),/binding/);
 const token='a-real-store-token',product='onlyideas_reader_monthly',orderId='GPA.0000.0000';
 const purchase={lineItems:[{productId:product,latestSuccessfulOrderId:orderId,expiryTime:new Date(Date.now()+86400_000).toISOString()}],externalAccountIdentifiers:{obfuscatedExternalAccountId:randomUUID()},subscriptionState:'SUBSCRIPTION_STATE_ACTIVE',testPurchase:{}};
 const order={orderId,purchaseToken:token,state:'PROCESSED',createTime:new Date().toISOString(),lineItems:[{productId:product,subscriptionDetails:{basePlanId:'monthly'}}]};
 assert.equal(googleProof(purchase,order,token).paid,true);
 assert.equal(googleProof(purchase,{...order,state:'PENDING'},token).paid,false);
 assert.equal(googleProof(purchase,{...order,state:'REFUNDED'},token).revoked,true);
 assert.throws(()=>googleProof(purchase,order,'stolen-token'),/mismatched/);
 assert.throws(()=>googleProof({...purchase,externalAccountIdentifiers:{}},order,token),/binding/);
});
test('official Apple verifier rejects unsigned forged receipts before any transaction lookup',async t=>{
 const {directory}=fixture(t),key=join(directory,'test-private.p8');
 const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 writeFileSync(key,privateKey.export({format:'pem',type:'pkcs8'}),{mode:0o600});
 const verifier=createPurchaseVerifiers({billing:{allowSandbox:true,apple:{keyFile:key,keyId:'TESTKEY',issuerId:randomUUID()}}});
 const fake=Buffer.from(JSON.stringify({alg:'none'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({bundleId:'art.onlyideas.app',transactionId:'123',environment:'Sandbox'})).toString('base64url')+'.fake';
 await assert.rejects(verifier.apple(fake),/signature could not be verified/);
});

test('sandbox notification fallback handles the SDK app-ID check without bypassing verification',async()=>{
 const calls=[],signed='opaque-signed-test-notification';
 const reject=status=>({verifier:{verifyAndDecodeNotification:async()=>{calls.push(status);throw Object.assign(new Error('SDK rejected'),{status});}}});
 const sandbox={verifier:{verifyAndDecodeNotification:async value=>{assert.equal(value,signed);calls.push('sandbox verified');return {notificationType:'TEST',data:{bundleId:'art.onlyideas.app',environment:'Sandbox'}};}}};
 const production=reject(VerificationStatus.INVALID_APP_IDENTIFIER);
 const result=await verifyAppleSigned(new Map([['Production',production],['Sandbox',sandbox]]),signed,true);
 assert.equal(result.environment,'Sandbox');assert.equal(result.decoded.notificationType,'TEST');assert.deepEqual(calls,[VerificationStatus.INVALID_APP_IDENTIFIER,'sandbox verified']);
 calls.length=0;
 await assert.rejects(verifyAppleSigned(new Map([['Production',production]]),signed,true),/environment is not enabled/);
 await assert.rejects(verifyAppleSigned(new Map([['Production',production],['Sandbox',reject(VerificationStatus.INVALID_APP_IDENTIFIER)]]),signed,true),/environment is not enabled/);
 calls.length=0;
 await assert.rejects(verifyAppleSigned(new Map([['Production',reject(VerificationStatus.VERIFICATION_FAILURE)],['Sandbox',sandbox]]),signed,true),/signature could not be verified/);
 assert.deepEqual(calls,[VerificationStatus.VERIFICATION_FAILURE]);
});

test('purchase service persists before acknowledgement and recovers after restart without a second grant',async t=>{
 const {store}=fixture(t);const {createBilling}=await import('../server/billing.mjs');const p=proof(store,{platform:'google',product:'onlyideas_reader_monthly'}),token='a-provider-token-that-is-long-enough';let fails=true;
 const verifiers={ready:{google:true},google:async()=>({proofs:[p],source:{token,orders:[p.receipt]},acknowledge:async()=>{assert.equal(balance(store),230);if(fails)throw Error('provider timeout');}})};
 const billing=createBilling(store,{...config,billing:{enabled:true,allowSandbox:true,sandboxAccounts:['reader']}},{verifiers,poll:false});t.after(()=>billing.stop());
 await assert.rejects(billing.purchase('google',{purchaseToken:token},{id:'reader'}),/timeout/);assert.equal(balance(store),230);
 assert.equal(store.db.prepare('SELECT count(*) n FROM billing_sources').get().n,1);
 billing.stop();fails=false;
 const resumed=createBilling(store,{...config,billing:{enabled:true,allowSandbox:true,sandboxAccounts:['reader']}},{verifiers,poll:false});t.after(()=>resumed.stop());
 store.db.prepare('UPDATE billing_sources SET next=0').run();await resumed.reconcile();
 assert.equal(balance(store),230);assert.equal(store.db.prepare('SELECT failures FROM billing_sources').get().failures,0);
});
test('HTTP purchase boundary requires a session and ignores forged amounts and ownership fields',async t=>{
 const {store}=fixture(t);const {createApp}=await import('../server/app.mjs');const p=proof(store);let seen=0;
 const verifiers={ready:{apple:true},apple:async signed=>{assert.equal(signed,'verified-jws');seen++;return p;}};
 const server=createApp(store,{...config,billing:{enabled:true,allowSandbox:true,sandboxAccounts:['reader']},development:true,origin:'http://127.0.0.1:4182'},{worker:false,billingOptions:{verifiers,poll:false}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base=`http://127.0.0.1:${server.address().port}`;
 const token=store.createSession({id:'reader',name:'Reader',login:'reader'});
 const send=(cookie,body)=>fetch(base+'/api/billing/apple',{method:'POST',headers:{Origin:'http://127.0.0.1:4182','Content-Type':'application/json',...(cookie?{Cookie:'onlyideas-local='+cookie}:{})},body:JSON.stringify(body)});
 assert.equal((await send(null,{signedTransaction:'verified-jws'})).status,401);assert.equal(seen,0);
 const result=await send(token,{signedTransaction:'verified-jws',credits:999999,accountToken:'evil',product:'studio'});
 assert.equal(result.status,200);assert.equal((await result.json()).awarded,200);assert.equal(balance(store),230);
 const other=store.createSession({id:'other',name:'Other',login:'other'});
 assert.equal((await send(other,{signedTransaction:'verified-jws'})).status,403);assert.equal(balance(store),230);
});
test('disabled purchase service exposes no products and never calls the provider',async t=>{
 const {store}=fixture(t);const {createBilling}=await import('../server/billing.mjs');
 const billing=createBilling(store,config,{verifiers:{ready:{apple:true},apple:async()=>{throw Error('must not run');}},poll:false});t.after(()=>billing.stop());
 assert.equal(billing.catalog({id:'reader'}).enabled,false);assert.equal(billing.catalog({id:'reader'}).plans.length,3);
 await assert.rejects(billing.purchase('apple',{signedTransaction:'x'},{id:'reader'}),/not available/);
});
test('sandbox receipts cannot fund an ordinary production reader account',async t=>{
 const {store}=fixture(t);const {createBilling}=await import('../server/billing.mjs');const p=proof(store);
 const billing=createBilling(store,{...config,billing:{enabled:true,allowSandbox:true,sandboxAccounts:[]}},{verifiers:{ready:{apple:true},apple:async()=>p},poll:false});t.after(()=>billing.stop());
 await assert.rejects(billing.purchase('apple',{signedTransaction:'test'},{id:'reader'}),/configured test accounts/);
 assert.equal(balance(store),30);assert.equal(store.db.prepare('SELECT count(*) n FROM billing_sources').get().n,0);
});
test('account-scoped rollout keeps old clients uncharged and subscriptions hidden',async t=>{
 const {store}=fixture(t);const {createBilling}=await import('../server/billing.mjs');const rollout={credits:{enabled:true,accounts:['tester']},billing:{enabled:true}};
 assert.equal(creditSummary(store,'reader',rollout).enabled,false);
 assert.equal(creditSummary(store,'tester',rollout).balance,30);
 const old={id:randomUUID(),owner:'reader',kind:'markdown',sharing:'private'};reserveImport(store,rollout,old,undefined);assert.equal(old.credit,undefined);
 const billing=createBilling(store,rollout,{verifiers:{ready:{apple:true}},poll:false});t.after(()=>billing.stop());
 assert.equal(billing.catalog({id:'reader'}).enabled,false);
 await assert.rejects(billing.purchase('apple',{}, {id:'reader'}),/not available/);
});
test('Play verifies batched renewal history and can reconcile refunds after a token expires',async()=>{
 const token='test-provider-token-long-enough',accountToken=randomUUID(),product='onlyideas_reader_monthly',base='GPA.1234-5678-9012-34567',latest=base+'..0';let expired=false,acknowledged=0;
 const date=new Date().toISOString(),expiry=new Date(Date.now()+86400_000).toISOString();
 const googleAuth={getClient:async()=>({request:async request=>{
   if(request.url.includes('/subscriptionsv2/')){
     if(expired)throw Object.assign(Error('gone'),{response:{status:410}});
     return {data:{lineItems:[{productId:product,latestSuccessfulOrderId:latest,expiryTime:expiry}],externalAccountIdentifiers:{obfuscatedExternalAccountId:accountToken},subscriptionState:'SUBSCRIPTION_STATE_ACTIVE',acknowledgementState:'ACKNOWLEDGEMENT_STATE_PENDING'}};
   }
   if(request.url.includes('/orders:batchGet')){
     const ids=new URL(request.url).searchParams.getAll('orderIds');assert.deepEqual(new Set(ids),new Set([base,latest]));
     return {data:{orders:ids.map(id=>({orderId:id,purchaseToken:token,state:expired?'REFUNDED':'PROCESSED',createTime:date,lineItems:[{productId:product,subscriptionDetails:{basePlanId:'monthly',servicePeriodEndTime:expiry}}]}))}};
   }
   if(request.url.endsWith(':acknowledge')){acknowledged++;return {data:{}};}
   throw Error('Unexpected provider route');
 }})};
 const verifier=createPurchaseVerifiers({}, {googleAuth});const first=await verifier.google(token);
 assert.equal(first.proofs.length,2);assert.equal(acknowledged,0);await first.acknowledge();assert.equal(acknowledged,1);
 expired=true;const old=await verifier.google(token,first.source.orders,first.source);
 assert.ok(old.proofs.every(p=>p.revoked&&p.accountToken===accountToken));await old.acknowledge();assert.equal(acknowledged,1);
});

test('public plan discovery stays visible while purchases and account data stay gated',async t=>{
 const {store}=fixture(t);const {createApp}=await import('../server/app.mjs');
 const app=createApp(store,{development:true,origin:'http://127.0.0.1:4182'},{worker:false});
 await new Promise(r=>app.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>app.close(r)));
 const base='http://127.0.0.1:'+app.address().port;
 const res=await fetch(base+'/api/billing'),catalog=await res.json();assert.equal(res.status,200);
 assert.equal(catalog.enabled,false);assert.equal(catalog.accountToken,null);assert.equal(catalog.quota,null);assert.equal(catalog.signInRequired,true);assert.deepEqual(catalog.subscriptions,[]);
 assert.deepEqual(catalog.plans.map(p=>[p.targetUSD,p.pages,p.fetches]),[['2.99',200,60],['14.99',1200,300],['29.99',2600,700]]);
 assert.equal(store.db.prepare('SELECT count(*) n FROM billing_accounts').get().n,0);
 const purchase=await fetch(base+'/api/billing/checkout',{method:'POST',headers:{Origin:'http://127.0.0.1:4182','Content-Type':'application/json'},body:JSON.stringify({plan:'reader'})});assert.equal(purchase.status,401);
});

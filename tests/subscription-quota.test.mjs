import{test}from'node:test';import assert from'node:assert/strict';import{mkdtempSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{randomUUID}from'node:crypto';import{Store}from'../server/store.mjs';import{billingAccount,applyVerifiedPurchase,deleteBillingAccount}from'../server/billing-ledger.mjs';import{quotaSummary,reserveSubscriptionQuota,finishSubscriptionQuota,trialEligible}from'../server/subscription-quota.mjs';
const config={credits:{enabled:true},billing:{quotasEnabled:true}};
function fixture(t){const d=mkdtempSync(join(tmpdir(),'oi-quota-')),store=new Store(d);t.after(()=>{store.close();rmSync(d,{recursive:true,force:true})});return store}
function purchase(s,extra={}){return {platform:'apple',environment:'Sandbox',accountToken:billingAccount(s,'reader'),receipt:randomUUID(),subscription:'sub-one',product:'art.onlyideas.reader.monthly',expires:Date.now()+30*86400_000,observed:Date.now(),purchased:Date.now(),paid:true,revoked:false,state:'active',...extra}}
const job=(id,pages,url='https://example.org/open.pdf')=>({id,owner:'reader',kind:'import',pages,url});
test('paid quotas are receipt-period scoped, retries and failures refund, reuse is free, and renewal resets once',t=>{
 const s=fixture(t),p=purchase(s);applyVerifiedPurchase(s,p,'reader');assert.equal(quotaSummary(s,config,'reader').pages,200);
 const j=job('a',120);reserveSubscriptionQuota(s,config,j);reserveSubscriptionQuota(s,config,j);assert.equal(quotaSummary(s,config,'reader').usedPages,120);
 assert.throws(()=>reserveSubscriptionQuota(s,config,job('b',81)),/quota/);finishSubscriptionQuota(s,j,false);assert.equal(quotaSummary(s,config,'reader').usedPages,0);
 reserveSubscriptionQuota(s,config,j);finishSubscriptionQuota(s,j,true);finishSubscriptionQuota(s,j,true);assert.equal(quotaSummary(s,config,'reader').usedFetches,1);
 reserveSubscriptionQuota(s,config,{...job('reuse',500),reused:true});assert.equal(quotaSummary(s,config,'reader').usedPages,120);
 applyVerifiedPurchase(s,{...p,receipt:'next',purchased:p.purchased+1,expires:p.expires+30*86400_000,observed:p.observed+2},'reader');assert.equal(quotaSummary(s,config,'reader').usedPages,0);
});
test('seven-day trial gets one 50-page allowance across providers; pending proof grants none and revoked periods lose access',t=>{
 const s=fixture(t);assert.equal(trialEligible(s,'reader'),true);
 const p=purchase(s,{paid:false,trial:true,expires:Date.now()+7*86400_000});applyVerifiedPurchase(s,p,'reader');assert.equal(quotaSummary(s,config,'reader').pages,50);assert.equal(trialEligible(s,'reader'),false);
 reserveSubscriptionQuota(s,config,job('trial',40));finishSubscriptionQuota(s,job('trial',40),true);
 applyVerifiedPurchase(s,{...p,platform:'stripe',product:'onlyideas_studio_monthly_v1',receipt:'second-trial',subscription:'stripe-second',observed:p.observed+1},'reader');assert.equal(quotaSummary(s,config,'reader').remainingPages,10);
 applyVerifiedPurchase(s,{...p,revoked:true,state:'revoked',observed:p.observed+2});assert.equal(quotaSummary(s,config,'reader').trial,false);
});
test('uncertain provider receipts keep reservations; owner exemption and rollout scope remain server controlled',t=>{
 const s=fixture(t);const j=job('uncertain',20);reserveSubscriptionQuota(s,config,j);finishSubscriptionQuota(s,{...j,submittedAt:Date.now()},false);assert.equal(quotaSummary(s,config,'reader').usedPages,20);
 assert.throws(()=>reserveSubscriptionQuota(s,config,job('other',20)),/quota/);
 reserveSubscriptionQuota(s,{...config,allowanceExemptAccounts:['reader']},job('owner',5000));assert.equal(s.db.prepare('SELECT count(*) n FROM subscription_usage').get().n,1);
 reserveSubscriptionQuota(s,{...config,credits:{enabled:true,accounts:['pilot']}},job('not-pilot',5000));
 deleteBillingAccount(s,'reader');assert.equal(s.db.prepare('SELECT count(*) n FROM subscription_usage').get().n,0);
});

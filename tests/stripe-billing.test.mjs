import{test}from'node:test';import assert from'node:assert/strict';import{createHmac,randomUUID}from'node:crypto';import{mkdtempSync,rmSync,writeFileSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{Store}from'../server/store.mjs';import{createStripeBilling,stripeSignature}from'../server/stripe-billing.mjs';import{billingAccount,applyVerifiedPurchase,deleteBillingAccount}from'../server/billing-ledger.mjs';import{quotaSummary}from'../server/subscription-quota.mjs';
function fixture(t){const dir=mkdtempSync(join(tmpdir(),'oi-stripe-')),store=new Store(dir);t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true})});writeFileSync(join(dir,'key'),'sk_test_fixture',{mode:0o600});writeFileSync(join(dir,'hook'),'whsec_fixture',{mode:0o600});const config={origin:'https://onlyideas.invalid',credits:{enabled:true},billing:{enabled:true,quotasEnabled:true,stripe:{portalConfiguration:'bpc_onlyideas',keyFile:join(dir,'key'),webhookSecretFile:join(dir,'hook'),prices:{reader:'price_reader',researcher:'price_researcher',studio:'price_studio'}}}};return{store,config}}
const sign=raw=>{const t=Math.floor(Date.now()/1000);return 't='+t+',v1='+createHmac('sha256','whsec_fixture').update(t+'.').update(raw).digest('hex')};
test('Stripe raw-body signature rejects tampering, stale timestamps and malformed digests',()=>{const raw=Buffer.from('{"exact":"payload"}');stripeSignature(raw,sign(raw),'whsec_fixture');assert.throws(()=>stripeSignature(Buffer.from('{}'),sign(raw),'whsec_fixture'));assert.throws(()=>stripeSignature(raw,sign(raw),'wrong'));assert.throws(()=>stripeSignature(raw,sign(raw),'whsec_fixture',Date.now()+400_000));assert.throws(()=>stripeSignature(raw,'t=bad,v1=a','whsec_fixture'))});
test('PWA checkout fixes the plan price, account binding, seven-day trial and URLs; double click reuses checkout',async t=>{
 const {store,config}=fixture(t),calls=[];let sessions=0;
 const stripe=createStripeBilling(store,config,{transport:async(url,options)=>{const u=new URL(url),v=Object.fromEntries(new URLSearchParams(options.body));calls.push({path:u.pathname,v,headers:options.headers});let data;
  if(u.pathname==='/v1/prices/price_reader')data={id:'price_reader',active:true,livemode:false,currency:'usd',unit_amount:299,recurring:{interval:'month',interval_count:1}};
  else if(u.pathname==='/v1/customers')data={id:'cus_reader'};
  else if(u.pathname==='/v1/checkout/sessions'){sessions++;data={id:'cs_trial',url:'https://checkout.stripe.com/c/pay/test',livemode:false};assert.equal(v['adaptive_pricing[enabled]'],'false');assert.equal(v['subscription_data[trial_period_days]'],'7');assert.equal(v['line_items[0][price]'],'price_reader');assert.equal(v['subscription_data[metadata][account_token]'],billingAccount(store,'reader'));assert.equal(v.success_url,config.origin+'/?billing=success')}
  else throw Error('Unexpected '+url);return new Response(JSON.stringify(data));}});
 assert.equal(stripe.ready,true);const first=await stripe.checkout({id:'reader'},'reader');assert.deepEqual(await stripe.checkout({id:'reader'},'reader'),first);assert.equal(sessions,1);
 await assert.rejects(stripe.checkout({id:'reader'},'invented'));await assert.rejects(stripe.checkout({id:'reader'},'studio'),/current checkout/);
 assert.ok(calls.every(c=>c.headers['Stripe-Version']==='2024-06-20'));
});
test('only a verified bound invoice grants quotas/credits; refunds revoke once and unrelated app webhooks are ignored',async t=>{
 const {store,config}=fixture(t),accountToken=billingAccount(store,'reader');let refunded=false,bad=false,pending=false;
 store.db.exec('CREATE TABLE billing_stripe_customers(owner TEXT PRIMARY KEY,customer TEXT UNIQUE NOT NULL)');store.db.prepare('INSERT INTO billing_stripe_customers VALUES(?,?)').run('reader','cus_reader');
 const price={id:'price_reader',active:true,livemode:false,currency:'usd',unit_amount:299,recurring:{interval:'month',interval_count:1}},start=Math.floor(Date.now()/1000)-10,end=start+30*86400;
 const sub={id:'sub_reader',customer:'cus_reader',livemode:false,metadata:{app:'onlyideas',account_token:accountToken},status:'active',items:{data:[{quantity:1,price}]}},invoice={id:'in_paid',subscription:'sub_reader',customer:'cus_reader',livemode:false,status:'paid',amount_paid:299,currency:'usd',charge:'ch_paid',lines:{data:[{price:'price_reader',quantity:1,period:{start,end}}]}};
 const stripe=createStripeBilling(store,config,{transport:async(url)=>{const p=new URL(url).pathname;return new Response(JSON.stringify(p.startsWith('/v1/subscriptions/')?sub:p==='/v1/invoices'?{data:pending?[]:[{...invoice,customer:bad?'cus_other':'cus_reader'}]}:p==='/v1/charges/ch_paid'?{customer:'cus_reader',livemode:false,refunded}:{}))}});
 let result=await stripe.verify('sub_reader');assert.equal(applyVerifiedPurchase(store,result.proofs[0],'reader').awarded,200);assert.equal(applyVerifiedPurchase(store,result.proofs[0],'reader').awarded,0);assert.equal(quotaSummary(store,config,'reader').pages,200);
 bad=true;await assert.rejects(stripe.verify('sub_reader'),/ownership/);bad=false;refunded=true;result=await stripe.verify('sub_reader');applyVerifiedPurchase(store,result.proofs[0],'reader');assert.equal(quotaSummary(store,config,'reader').pages,30);
 const raw=Buffer.from(JSON.stringify({livemode:false,type:'customer.subscription.updated',data:{object:{id:'sub_other',metadata:{app:'echomind'}}}}));assert.equal(await stripe.notification({headers:{'stripe-signature':sign(raw)}},raw),null);
 pending=true;assert.equal((await stripe.verify('sub_reader')).proofs.length,0);pending=false;
 deleteBillingAccount(store,'reader');const closed=Buffer.from(JSON.stringify({livemode:false,type:'customer.subscription.updated',data:{object:sub}}));assert.equal(await stripe.notification({headers:{'stripe-signature':sign(closed)}},closed),null);assert.equal(store.db.prepare('SELECT count(*) n FROM billing_subscriptions').get().n,0);
});
test('new webhook formats resolve invoice and charge links through the pinned API, including refunds',async t=>{
 const {store,config}=fixture(t),accountToken=billingAccount(store,'reader'),calls=[];
 const start=Math.floor(Date.now()/1000)-10,end=start+30*86400;
 const price={id:'price_reader',active:true,livemode:false,currency:'usd',unit_amount:299,recurring:{interval:'month',interval_count:1}};
 const sub={id:'sub_reader',customer:'cus_reader',livemode:false,metadata:{app:'onlyideas',account_token:accountToken},status:'active',items:{data:[{quantity:1,price}]}};
 const invoice={id:'in_paid',subscription:'sub_reader',customer:'cus_reader',livemode:false,status:'paid',amount_paid:299,currency:'usd',charge:'ch_paid',lines:{data:[{price:'price_reader',quantity:1,period:{start,end}}]}};
 let refunded=false;
 const stripe=createStripeBilling(store,config,{transport:async(url,options)=>{
  assert.equal(options.headers['Stripe-Version'],'2024-06-20');const path=new URL(url).pathname;calls.push(path);
  const data=path==='/v1/invoices/in_paid'?invoice:path==='/v1/invoices'?{data:[invoice]}:path==='/v1/subscriptions/sub_reader'?sub:path==='/v1/charges/ch_paid'?{id:'ch_paid',invoice:'in_paid',customer:'cus_reader',livemode:false,refunded}:null;
  assert.ok(data,'Unexpected provider request '+path);return new Response(JSON.stringify(data));
 }});
 store.db.prepare('INSERT INTO billing_stripe_customers VALUES(?,?)').run('reader','cus_reader');
 async function deliver(type,object){const raw=Buffer.from(JSON.stringify({livemode:false,type,api_version:'2025-12-15.clover',data:{object}}));return stripe.notification({headers:{'stripe-signature':sign(raw)}},raw)}
 let result=await deliver('invoice.paid',{id:'in_paid',object:'invoice',parent:{subscription_details:{subscription:'sub_reader'}}});
 assert.equal(applyVerifiedPurchase(store,result.proofs[0],'reader').awarded,200);assert.equal(quotaSummary(store,config,'reader').pages,200);
 refunded=true;calls.length=0;
 result=await deliver('charge.refunded',{id:'ch_paid',object:'charge',refunded:true});
 assert.deepEqual(calls.slice(0,2),['/v1/charges/ch_paid','/v1/invoices/in_paid']);
 applyVerifiedPurchase(store,result.proofs[0],'reader');assert.equal(quotaSummary(store,config,'reader').pages,30);
 result=await deliver('charge.refunded',{id:'ch_paid',object:'charge',refunded:true});applyVerifiedPurchase(store,result.proofs[0],'reader');
 assert.equal(store.db.prepare("SELECT count(*) n FROM credit_ledger WHERE kind='purchase_refund'").get().n,1);
});

function nativePurchase(store){return applyVerifiedPurchase(store,{platform:'apple',environment:'Sandbox',accountToken:billingAccount(store,'reader'),receipt:randomUUID(),subscription:'native-subscription',product:'art.onlyideas.reader.monthly',observed:Date.now(),purchased:Date.now(),expires:Date.now()+86400_000,paid:true,revoked:false,state:'active'},'reader')}
function checkoutProvider(store,{loseResponse=false,nativeDuringCreate=false,expiryFails=false}={}){
 const calls=[];let creates=0,status='open';
 return {calls,get creates(){return creates},get status(){return status},retryExpiry(){expiryFails=false},transport:async(url,options)=>{
  const path=new URL(url).pathname,values=Object.fromEntries(new URLSearchParams(options.body));calls.push({path,method:options.method,values,key:options.headers['Idempotency-Key']});let data;
  if(path==='/v1/prices/price_reader')data={id:'price_reader',active:true,livemode:false,currency:'usd',unit_amount:299,recurring:{interval:'month',interval_count:1}};
  else if(path==='/v1/customers')data={id:'cus_reader'};
  else if(path==='/v1/checkout/sessions'){
   creates++;if(nativeDuringCreate){nativeDuringCreate=false;nativePurchase(store)}
   if(loseResponse){loseResponse=false;throw Error('connection lost after provider creation')}
   data={id:'cs_existing',url:'https://checkout.stripe.com/c/pay/existing',livemode:false};
  }else if(path==='/v1/checkout/sessions/cs_existing'&&options.method==='GET')data={id:'cs_existing',livemode:false,status};
  else if(path==='/v1/checkout/sessions/cs_existing/expire'){
   if(expiryFails)return new Response('{}',{status:503});status='expired';data={id:'cs_existing',livemode:false,status};
  }else throw Error('Unexpected '+options.method+' '+path);
  return new Response(JSON.stringify(data));
 }};
}
test('known native purchase rejects checkout before creating an operation or calling Stripe',async t=>{
 const {store,config}=fixture(t),provider=checkoutProvider(store),stripe=createStripeBilling(store,config,provider);nativePurchase(store);
 await assert.rejects(stripe.checkout({id:'reader'},'reader'),/existing subscription/);
 assert.equal(provider.calls.length,0);assert.equal(store.db.prepare('SELECT count(*) n FROM billing_stripe_checkout').get().n,0);
});
test('saved checkout is expired when a native purchase arrives; failed expiry remains retryable',async t=>{
 const {store,config}=fixture(t),provider=checkoutProvider(store,{expiryFails:true}),stripe=createStripeBilling(store,config,provider);
 await stripe.checkout({id:'reader'},'reader');nativePurchase(store);
 await assert.rejects(stripe.checkout({id:'reader'},'reader'),/unavailable/);
 assert.equal(provider.status,'open');assert.equal(provider.creates,1);
 provider.retryExpiry();await assert.rejects(stripe.checkout({id:'reader'},'reader'),/existing subscription/);
 assert.equal(provider.status,'expired');assert.equal(provider.creates,1);
 await assert.rejects(stripe.checkout({id:'reader'},'reader'),/existing subscription/);
 assert.equal(provider.calls.filter(c=>c.path.endsWith('/expire')).length,2);
});
test('unknown checkout outcome recovers the original key and trial parameters before expiring after native purchase',async t=>{
 const {store,config}=fixture(t),provider=checkoutProvider(store,{loseResponse:true}),stripe=createStripeBilling(store,config,provider);
 await assert.rejects(stripe.checkout({id:'reader'},'reader'),/connection lost/);
 nativePurchase(store);await assert.rejects(stripe.checkout({id:'reader'},'reader'),/existing subscription/);
 const creates=provider.calls.filter(c=>c.path==='/v1/checkout/sessions');assert.equal(creates.length,2);
 assert.equal(creates[0].key,creates[1].key);assert.deepEqual(creates[0].values,creates[1].values);assert.equal(creates[1].values['subscription_data[trial_period_days]'],'7');assert.equal(provider.status,'expired');
});
test('native purchase during checkout creation expires the new session instead of returning its URL',async t=>{
 const {store,config}=fixture(t),provider=checkoutProvider(store,{nativeDuringCreate:true}),stripe=createStripeBilling(store,config,provider);
 await assert.rejects(stripe.checkout({id:'reader'},'reader'),/existing subscription/);
 assert.equal(provider.status,'expired');assert.equal(provider.creates,1);
});
test('sales closure rejects new Checkout while retaining the configured provider',async t=>{
 const {store,config}=fixture(t);config.billing.salesEnabled=false;const provider=checkoutProvider(store),stripe=createStripeBilling(store,config,provider);
 assert.equal(stripe.ready,true);await assert.rejects(stripe.checkout({id:'reader'},'reader'),/not available/);assert.equal(provider.calls.length,0);
});

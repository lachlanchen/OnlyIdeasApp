import {readFileSync,lstatSync} from 'node:fs';
import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {hash,requireValue} from './domain.mjs';
import {plans} from './plans.mjs';
import {billingAccount,hasBlockingPurchase} from './billing-ledger.mjs';
import {creditTransaction} from './credits.mjs';
import {trialEligible,trialPolicy} from './subscription-quota.mjs';
const version='2024-06-20';
const privateValue=path=>{const s=lstatSync(path);requireValue(s.isFile()&&!s.isSymbolicLink()&&!(s.mode&0o077),'Stripe credentials must be owner-only.');return readFileSync(path,'utf8').trim()};
export function stripeSignature(raw,signature,secret,now=Date.now()){
 const values=String(signature||'').split(',').map(v=>v.split('=')),timestamp=values.find(([k])=>k==='t')?.[1];
 requireValue(/^\d+$/.test(timestamp||'')&&Math.abs(now/1000-Number(timestamp))<=300,'Invalid payment notification.',400);
 const expected=createHmac('sha256',secret).update(timestamp+'.').update(raw).digest();
 requireValue(values.some(([k,v])=>k==='v1'&&/^[a-f0-9]{64}$/i.test(v||'')&&timingSafeEqual(expected,Buffer.from(v,'hex'))),'Invalid payment notification.',400);
}
const stripeID=value=>typeof value==='object'?value?.id:value;
export function createStripeBilling(store,config,{transport=fetch}={}){
 const settings=config.billing?.stripe||{};
 const key=settings.keyFile?privateValue(settings.keyFile):'',secret=settings.webhookSecretFile?privateValue(settings.webhookSecretFile):'';
 const ready=!!key&&!!secret&&/^bpc_\w+$/.test(settings.portalConfiguration||'')&&plans.every(p=>/^price_\w+$/.test(settings.prices?.[p.id]||''));
 const live=key.startsWith('sk_live_');
 if(key)requireValue(live||key.startsWith('sk_test_'),'Invalid Stripe configuration.');
 store.db.exec(`CREATE TABLE IF NOT EXISTS billing_stripe_customers(owner TEXT PRIMARY KEY,customer TEXT UNIQUE NOT NULL);
 CREATE TABLE IF NOT EXISTS billing_stripe_checkout(owner TEXT PRIMARY KEY,id TEXT NOT NULL,plan TEXT NOT NULL,session TEXT,url TEXT,expires INTEGER NOT NULL);`);
 creditTransaction(store,()=>{if(!store.db.prepare('PRAGMA table_info(billing_stripe_checkout)').all().some(c=>c.name==='request'))store.db.exec('ALTER TABLE billing_stripe_checkout ADD COLUMN request TEXT')});
 const requireReady=()=>requireValue(ready&&config.billing?.enabled===true,'Web subscriptions are not available yet.',503);
 async function api(method,path,values,idempotency){
  const headers={Authorization:'Bearer '+key,'Stripe-Version':version};const request={method,headers,redirect:'error',signal:AbortSignal.timeout(30_000)};
  if(values){headers['Content-Type']='application/x-www-form-urlencoded';request.body=new URLSearchParams(values)}if(idempotency)headers['Idempotency-Key']=idempotency;
  const r=await transport('https://api.stripe.com/v1'+path,request);requireValue(r.ok,'The payment service is unavailable. Your allowance has not changed.',503);return r.json();
 }
 const bound=subscription=>{
  requireValue(subscription.metadata?.app==='onlyideas'&&subscription.livemode===live,'Unrecognized OnlyIdeas subscription.',400);
  const accountToken=subscription.metadata.account_token,row=store.db.prepare('SELECT owner FROM billing_accounts WHERE token=? AND closed=0').get(accountToken||'');
  requireValue(row,'This subscription account is unavailable.',409);
  const customer=store.db.prepare('SELECT customer FROM billing_stripe_customers WHERE owner=?').get(row.owner);
  requireValue(customer?.customer===stripeID(subscription.customer),'Subscription ownership mismatch.',409);
  return accountToken;
 };
 const validPrice=price=>{
  const plan=plans.find(p=>settings.prices[p.id]===stripeID(price));requireValue(plan&&price.active&&price.currency==='usd'&&price.unit_amount===Math.round(Number(plan.targetUSD)*100)&&price.recurring?.interval==='month'&&price.recurring.interval_count===1&&price.livemode===live,'Subscription pricing changed. Please refresh Plans.',409);return plan;
 };
 async function verifySubscription(id){
  requireValue(/^sub_\w+$/.test(id||''),'Invalid subscription.');
  const subscription=await api('GET','/subscriptions/'+encodeURIComponent(id)+'?expand[]=items.data.price');
  const accountToken=bound(subscription),items=subscription.items?.data;
  requireValue(items?.length===1&&items[0].quantity===1,'Unrecognized subscription items.',409);
  const plan=validPrice(items[0].price),now=Date.now(),environment=live?'Production':'Sandbox',proofs=[];
  const common={platform:'stripe',environment,accountToken,subscription:id,product:plan.stripe,observed:now};
  if(subscription.trial_start&&subscription.trial_end){
   const expires=subscription.trial_end*1000;
   proofs.push({...common,receipt:id+':trial',purchased:subscription.trial_start*1000,expires,trial:true,paid:false,revoked:false,state:subscription.status==='trialing'&&expires>now?'active':'expired'});
  }
  const invoices=await api('GET','/invoices?'+new URLSearchParams({subscription:id,limit:'100'}));
  requireValue(!invoices.has_more,'Subscription history needs reconciliation before restoration.',503);
  for(const invoice of invoices.data||[]){
   requireValue(stripeID(invoice.subscription)===id&&stripeID(invoice.customer)===stripeID(subscription.customer)&&invoice.livemode===live,'Invoice ownership mismatch.',409);
   if(invoice.status!=='paid'||invoice.amount_paid<=0)continue;
   requireValue(!invoice.lines?.has_more,'Invoice history needs reconciliation.',503);
   const line=invoice.lines?.data?.find(l=>stripeID(l.price)===items[0].price.id&&!l.proration);
   if(!line)continue;
   const expected=Math.round(Number(plan.targetUSD)*100);
   // Current Checkout sells full-price monthly plans. Discounts, credit-balance
   // funding, prorations and upgrades need their own qualified lineage contract;
   // an invoice marked paid is not by itself proof of this plan's payment.
   requireValue(invoice.currency==='usd'&&line.currency==='usd'&&line.quantity===1&&line.amount===expected&&stripeID(line.subscription)===id&&invoice.lines.data.length===1&&invoice.subtotal===expected&&Number.isSafeInteger(invoice.total)&&invoice.total>=expected&&invoice.amount_due===invoice.total&&invoice.amount_paid===invoice.total&&invoice.amount_remaining===0&&!(invoice.total_discount_amounts||[]).some(d=>d.amount!==0)&&Number.isSafeInteger(line.period?.start)&&Number.isSafeInteger(line.period?.end)&&line.period.end>line.period.start&&line.period.end-line.period.start<=32*86400,'Subscription payment needs reconciliation.',409);
   const expires=line.period.end*1000,purchased=line.period.start*1000;
   requireValue(/^ch_\w+$/.test(stripeID(invoice.charge)||''),'Subscription payment needs reconciliation.',409);
   const charge=await api('GET','/charges/'+encodeURIComponent(stripeID(invoice.charge)));
   requireValue(charge.id===stripeID(invoice.charge)&&stripeID(charge.invoice)===invoice.id&&stripeID(charge.customer)===stripeID(subscription.customer)&&charge.livemode===live,'Charge ownership mismatch.',409);
   requireValue(charge.currency==='usd'&&charge.paid===true&&charge.captured===true&&charge.status==='succeeded'&&charge.amount===invoice.amount_paid&&charge.amount_captured===invoice.amount_paid&&Number.isSafeInteger(charge.amount_refunded)&&charge.amount_refunded>=0,'Subscription payment needs reconciliation.',409);
   const revoked=(invoice.post_payment_credit_notes_amount||0)>0||charge.amount_refunded>0||charge.refunded===true||charge.disputed===true;
   proofs.push({...common,receipt:invoice.id,purchased,expires,paid:true,trial:false,revoked,state:revoked?'revoked':expires<=now||['canceled','unpaid','incomplete_expired','paused'].includes(subscription.status)?'expired':'active'});
  }
  return {proofs,source:{subscription:id,transaction:id,environment}};
 }
 const savedCheckout=owner=>store.db.prepare('SELECT * FROM billing_stripe_checkout WHERE owner=?').get(owner);
 async function createSession(checkout,values){
  const session=await api('POST','/checkout/sessions',values,'onlyideas-checkout-'+checkout.id);
  requireValue(session.livemode===live&&/^cs_\w+$/.test(session.id||'')&&new URL(session.url).origin==='https://checkout.stripe.com','Invalid checkout response.',502);
  store.db.prepare('UPDATE billing_stripe_checkout SET session=?,url=? WHERE owner=? AND id=?').run(session.id,session.url,checkout.owner,checkout.id);
  return session;
 }
 async function requireNoPurchase(owner){
  store.requireActive(owner);
  if(!hasBlockingPurchase(store,owner))return;
  const saved=savedCheckout(owner);
  // A timed-out create retains the exact request and idempotency key. Recover
  // that outcome before expiring it; never create a second checkout to retry.
  let id=saved?.session;
  if(!id&&saved?.request&&saved.expires>Date.now())id=(await createSession(saved,JSON.parse(saved.request))).id;
  if(id){
   const session=await api('GET','/checkout/sessions/'+encodeURIComponent(id));
   requireValue(session.id===id&&session.livemode===live,'Invalid checkout response.',502);
   if(session.status==='open')await api('POST','/checkout/sessions/'+encodeURIComponent(id)+'/expire',{});
   else requireValue(['expired','complete'].includes(session.status),'Checkout needs reconciliation.',503);
  }
  requireValue(false,'Manage your existing subscription before starting another.',409);
 }
 return {ready,
  async checkout(user,planID){
   requireReady();store.requireActive(user.id);const plan=plans.find(p=>p.id===planID);requireValue(plan,'Choose a plan.');
   await requireNoPurchase(user.id);
   requireValue(config.billing?.salesEnabled!==false,'Subscriptions are not available yet.',503);
   const accountToken=billingAccount(store,user.id);
   const checkout=creditTransaction(store,()=>{const saved=savedCheckout(user.id);if(saved&&saved.expires>Date.now()){requireValue(saved.plan===planID,'Complete or let the current checkout expire before choosing another plan.',409);return saved}const next={owner:user.id,id:randomUUID(),plan:planID,expires:Date.now()+31*60_000};store.db.prepare('INSERT OR REPLACE INTO billing_stripe_checkout(owner,id,plan,session,url,expires,request) VALUES(?,?,?,NULL,NULL,?,NULL)').run(user.id,next.id,planID,next.expires);return next});
   if(checkout.url)return {url:checkout.url};
   let values=checkout.request?JSON.parse(checkout.request):null;
   if(!values){
    const price=await api('GET','/prices/'+encodeURIComponent(settings.prices[plan.id]));validPrice(price);
    let customer=store.db.prepare('SELECT customer FROM billing_stripe_customers WHERE owner=?').get(user.id)?.customer;
    if(!customer){const c=await api('POST','/customers',{'metadata[app]':'onlyideas','metadata[account_token]':accountToken},'onlyideas-customer-'+accountToken);store.requireActive(user.id);customer=c.id;store.db.prepare('INSERT OR IGNORE INTO billing_stripe_customers VALUES(?,?)').run(user.id,customer)}
    // Pin the original USD/trial contract for idempotent unknown-outcome recovery.
    values={mode:'subscription',customer,'adaptive_pricing[enabled]':'false','line_items[0][price]':price.id,'line_items[0][quantity]':'1',success_url:config.origin+'/?billing=success',cancel_url:config.origin+'/?billing=cancel',client_reference_id:accountToken,'subscription_data[metadata][app]':'onlyideas','subscription_data[metadata][account_token]':accountToken,'metadata[app]':'onlyideas',expires_at:String(Math.floor(checkout.expires/1000)),payment_method_collection:'always',billing_address_collection:'auto'};
    if(trialEligible(store,user.id))values['subscription_data[trial_period_days]']=String(trialPolicy.days);
    await requireNoPurchase(user.id);
    store.db.prepare('UPDATE billing_stripe_checkout SET request=? WHERE owner=? AND id=?').run(JSON.stringify(values),user.id,checkout.id);
   }
   const session=await createSession(checkout,values);
   await requireNoPurchase(user.id);
   return {url:session.url};
  },
  async portal(user){requireReady();const customer=store.db.prepare('SELECT customer FROM billing_stripe_customers WHERE owner=?').get(user.id)?.customer;requireValue(customer,'No web subscription was found.',404);const session=await api('POST','/billing_portal/sessions',{customer,configuration:settings.portalConfiguration,return_url:config.origin+'/?billing=return'});requireValue(new URL(session.url).origin==='https://billing.stripe.com','Invalid billing response.',502);return {url:session.url}},
  async restore(user){
   requireReady();const customer=store.db.prepare('SELECT customer FROM billing_stripe_customers WHERE owner=?').get(user.id)?.customer;if(!customer)return [];
   const subscriptions=await api('GET','/subscriptions?'+new URLSearchParams({customer,status:'all',limit:'100'}));requireValue(!subscriptions.has_more,'Subscription history needs reconciliation.',503);
   const results=[];for(const s of subscriptions.data||[])if(s.metadata?.app==='onlyideas'){const result=await verifySubscription(s.id);if(result.proofs.length)results.push(result)}return results;
  },
  verify:verifySubscription,
  async notification(req,raw){
   requireReady();stripeSignature(raw,req.headers['stripe-signature'],secret);const event=JSON.parse(raw.toString());requireValue(event.livemode===live,'Invalid payment environment.',400);
   const object=event.data?.object;let id;
   if(event.type.startsWith('customer.subscription.')){if(object?.metadata?.app!=='onlyideas')return null;id=object.id}
   else if(event.type.startsWith('invoice.')){
    // Webhook versions are independent of our API version. Basil+ moved these links.
    const invoice=object?.subscription?object:await api('GET','/invoices/'+encodeURIComponent(object?.id||''));
    id=stripeID(invoice.subscription);
   }
   else if(event.type==='checkout.session.completed'){if(object?.metadata?.app!=='onlyideas')return null;id=stripeID(object.subscription)}
   else if(event.type.startsWith('charge.')){
    const charge=object?.object==='dispute'||!object?.invoice?await api('GET','/charges/'+encodeURIComponent(stripeID(object?.object==='dispute'?object.charge:object?.id)||'')):object;
    if(!charge?.invoice)return null;const invoice=await api('GET','/invoices/'+encodeURIComponent(stripeID(charge.invoice)));id=stripeID(invoice.subscription);
   }
   if(!id)return null;
   // Shared Stripe account: ignore unrelated products without changing them.
   const subscription=await api('GET','/subscriptions/'+encodeURIComponent(id));if(subscription.metadata?.app!=='onlyideas')return null;
   // A deleted account stays deleted; acknowledge provider retries without grants.
   const account=store.db.prepare('SELECT closed FROM billing_accounts WHERE token=?').get(subscription.metadata.account_token||'');
   if(account?.closed)return null;
   const result=await verifySubscription(id);return result.proofs.length?result:null;
  },
 };
}

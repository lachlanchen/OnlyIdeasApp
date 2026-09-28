import {createStripeBilling} from './stripe-billing.mjs';
import {requireValue,hash} from './domain.mjs';
import {creditTransaction,creditSummary,creditsEnabled} from './credits.mjs';
import {applyVerifiedPurchase,billingCatalog} from './billing-ledger.mjs';
import {createPurchaseVerifiers} from './purchase-verification.mjs';

// Provider tokens and reconciliation cursors stay in the private app database.
// No route accepts client-supplied credits, plan IDs or account bindings.
export function createBilling(store,config,{verifiers=createPurchaseVerifiers(config),poll=true}={}) {
  const enabled=config.credits?.enabled===true&&config.billing?.enabled===true;
  let stopped=false,running=false;
  const stripe=createStripeBilling(store,config),ready={...verifiers.ready,stripe:stripeReady()};
  function stripeReady(){return stripe.ready}
  const requireReady=platform=>requireValue(enabled&&ready[platform],'Subscriptions are not available yet.',503);
  function persist(platform,source,proofs,requester) {
    requireValue(!stopped,'Purchase verification is restarting. Restore your purchase in a moment.',503);
    return creditTransaction(store,()=>{
      let awarded=0,account=null;
      for(const proof of proofs) {
        const bound=store.db.prepare('SELECT * FROM billing_accounts WHERE token=?').get(proof.accountToken);
        // Apple history may contain purchases made under another app login.
        if(!bound || (requester&&bound.owner!==requester)) {
          if(proofs.length===1)applyVerifiedPurchase(store,proof,requester);
          continue;
        }
        if(account&&account.token!==bound.token)continue;
        if(proof.environment==='Sandbox')requireValue(config.billing?.allowSandbox===true&&config.billing?.sandboxAccounts?.includes(bound.owner),'Sandbox purchases are limited to configured test accounts.',403);
        account=bound;awarded+=applyVerifiedPurchase(store,proof,requester).awarded;
      }
      requireValue(account,'Sign in with the OnlyIdeas account used for this purchase.',409);
      if(!account.closed) {
        const id=hash(platform+':'+(source.token||source.environment+':'+source.transaction));
        const prior=store.db.prepare('SELECT * FROM billing_sources WHERE id=?').get(id);
        requireValue(!prior||prior.owner===account.owner,'Subscription ownership mismatch.',409);
        const old=prior?JSON.parse(prior.body):{};
        if(platform==='google')source={...source,orders:[...new Set([...(old.orders||[]),...(source.orders||[])])].slice(-100)};
        else if(!Object.hasOwn(source,'revision')&&old.revision)source={...source,revision:old.revision};
        store.db.prepare('INSERT OR REPLACE INTO billing_sources VALUES(?,?,?,?,?,0)').run(id,account.owner,platform,JSON.stringify(source),Date.now()+15*60_000);
      }
      return {awarded};
    });
  }
  async function apple(signed,requester) {
    requireReady('apple');const proof=await verifiers.apple(signed);
    return persist('apple',{transaction:proof.subscription,environment:proof.environment},[proof],requester);
  }
  async function google(token,requester,orders=[]) {
    requireReady('google');
    const saved=typeof token==='string'?store.db.prepare('SELECT body FROM billing_sources WHERE id=?').get(hash('google:'+token)):null;
    const prior=saved?JSON.parse(saved.body):null;
    const verified=await verifiers.google(token,[...new Set([...orders,...(prior?.orders||[])])],prior);
    const result=persist('google',verified.source,verified.proofs,requester);
    // Grant is already durable. An acknowledgement timeout must leave a retry,
    // never roll back a paid customer's balance or acknowledge before granting.
    await verified.acknowledge();return result;
  }
  async function reconcile() {
    if(stopped||running||!enabled)return;
    running=true;
    try {
      const due=store.db.prepare('SELECT * FROM billing_sources WHERE next<=? ORDER BY next LIMIT 20').all(Date.now());
      for(const item of due) {
        if(stopped)break;
        if(!store.db.prepare('UPDATE billing_sources SET next=? WHERE id=? AND next<=?').run(Date.now()+15*60_000,item.id,Date.now()).changes)continue;
        try {
          const source=JSON.parse(item.body);
          if(item.platform==='apple') {
            const result=await verifiers.appleHistory(source);
            if(stopped)break;
            if(result.proofs.length)persist('apple',result.source,result.proofs,item.owner);
            else store.db.prepare('UPDATE billing_sources SET body=?,failures=0 WHERE id=?').run(JSON.stringify(result.source),item.id);
            if(result.more)store.db.prepare('UPDATE billing_sources SET next=0 WHERE id=?').run(item.id);
          } else if(item.platform==='stripe'){const result=await stripe.verify(source.subscription);if(!stopped&&result.proofs.length)persist('stripe',result.source,result.proofs,item.owner)}
          else await google(source.token,item.owner,source.orders);
        } catch {
          if(stopped)break;
          // Deliberately omit provider errors: they can contain signed receipts
          // or purchase tokens. Durable failure count is safe operator evidence.
          store.db.prepare('UPDATE billing_sources SET failures=failures+1,next=? WHERE id=?').run(Date.now()+Math.min(3600_000,60_000*2**Math.min(item.failures,6)),item.id);
        }
      }
    } finally {running=false;}
  }
  const timer=enabled&&poll?setInterval(()=>void reconcile(),60_000):null;timer?.unref();
  return {
    catalog:user=>billingCatalog(store,config,user,ready),
    async web(action,body,user){
      requireReady('stripe');store.requireActive(user.id);requireValue(creditsEnabled(config,user.id),'Subscriptions are not available yet.',503);
      if(action==='restore'){for(const result of await stripe.restore(user))persist('stripe',result.source,result.proofs,user.id);return {ok:true,...billingCatalog(store,config,user,ready)}}
      return action==='checkout'?stripe.checkout(user,body.plan):stripe.portal(user);
    },
    async stripeNotification(req,raw){requireReady('stripe');const result=await stripe.notification(req,raw);if(result)persist('stripe',result.source,result.proofs);return {ok:true}},
    async purchase(platform,body,user) {
      requireValue(['apple','google'].includes(platform),'Unknown purchase provider.');
      store.requireActive(user.id);
      requireValue(creditsEnabled(config,user.id),'Subscriptions are not available yet.',503);
      const result=platform==='apple'?await apple(body.signedTransaction,user.id):await google(body.purchaseToken,user.id);
      return {...result,...billingCatalog(store,config,user,ready),credits:creditSummary(store,user.id,config)};
    },
    async notification(platform,req,body) {
      requireReady(platform);
      if(platform==='apple') {
        const proof=await verifiers.appleNotification(body.signedPayload);
        if(proof)persist('apple',{transaction:proof.subscription,environment:proof.environment},[proof]);
      } else {
        const source=await verifiers.googleNotification(req,body);
        if(source)await google(source.token,undefined,source.orders);
      }
      return {ok:true};
    },
    reconcile,
    stop(){stopped=true;if(timer)clearInterval(timer);},
  };
}

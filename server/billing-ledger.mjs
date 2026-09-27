import { randomUUID } from 'node:crypto';
import { hash, requireValue } from './domain.mjs';
import { creditTransaction,creditsEnabled } from './credits.mjs';
import { planForProduct, plans } from './plans.mjs';

export function initBilling(store) {
  store.db.exec(`
    CREATE TABLE IF NOT EXISTS billing_accounts(owner TEXT PRIMARY KEY, token TEXT UNIQUE NOT NULL, closed INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS billing_receipts(id TEXT PRIMARY KEY, owner TEXT NOT NULL, platform TEXT NOT NULL, product TEXT NOT NULL, credits INTEGER NOT NULL, state TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS billing_subscriptions(id TEXT PRIMARY KEY, owner TEXT NOT NULL, platform TEXT NOT NULL, product TEXT NOT NULL, expires INTEGER NOT NULL, state TEXT NOT NULL, observed INTEGER NOT NULL, purchased INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS billing_sources(id TEXT PRIMARY KEY, owner TEXT NOT NULL, platform TEXT NOT NULL, body TEXT NOT NULL, next INTEGER NOT NULL DEFAULT 0, failures INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS billing_due ON billing_sources(next);
    CREATE INDEX IF NOT EXISTS billing_entitlements ON billing_subscriptions(owner,expires);
  `);
}
export function billingAccount(store, owner) {
  return creditTransaction(store, () => {
    store.requireActive(owner);
    store.db.prepare('INSERT OR IGNORE INTO billing_accounts(owner,token) VALUES(?,?)').run(owner, randomUUID());
    return store.db.prepare('SELECT token FROM billing_accounts WHERE owner=? AND closed=0').get(owner).token;
  });
}
export function activePlan(store, owner) {
  if (!owner) return null;
  const products = store.db.prepare("SELECT platform,product FROM billing_subscriptions WHERE owner=? AND expires>? AND state IN ('active','grace')").all(owner, Date.now());
  return products.map(p=>planForProduct(p.platform,p.product)).filter(Boolean).sort((a,b)=>b.agentTurns-a.agentTurns)[0] || null;
}
export function subscriptionSummary(store, owner) {
  const existing=store.db.prepare("SELECT 1 FROM billing_subscriptions WHERE owner=? AND (state IN ('paused','pending') OR (state IN ('active','grace') AND expires>?)) LIMIT 1").get(owner,Date.now());
  return { canSubscribe:!existing, plan:activePlan(store,owner)?.id || null,
    subscriptions:store.db.prepare('SELECT platform,product,expires,state FROM billing_subscriptions WHERE owner=? ORDER BY expires DESC').all(owner) };
}

// Internal boundary: proof must come from the provider verifier, never a request
// body. Transaction IDs are global, bound to the opaque purchase account token.
export function applyVerifiedPurchase(store, proof, requester) {
  requireValue(['apple','google'].includes(proof.platform) && ['Production','Sandbox'].includes(proof.environment), 'Unsupported purchase provider.');
  const plan=planForProduct(proof.platform,proof.product);
  requireValue(plan && typeof proof.receipt==='string' && proof.receipt.length>0 && proof.receipt.length<300, 'Unrecognized purchase.');
  requireValue(typeof proof.subscription==='string' && proof.subscription.length>0 && proof.subscription.length<300, 'Unrecognized subscription.');
  requireValue(Number.isSafeInteger(proof.expires) && Number.isSafeInteger(proof.observed) && proof.observed>0 && Number.isSafeInteger(proof.purchased) && proof.purchased>0, 'Invalid purchase dates.');
  requireValue(['active','grace','expired','revoked','pending','paused'].includes(proof.state), 'Invalid purchase state.');
  requireValue(typeof proof.paid==='boolean' && typeof proof.revoked==='boolean','Missing purchase status.');
  return creditTransaction(store, () => {
    const account=store.db.prepare('SELECT owner,closed FROM billing_accounts WHERE token=?').get(proof.accountToken);
    requireValue(account,'Sign in with the OnlyIdeas account used for this purchase.',409);
    requireValue(!requester || (!account.closed && account.owner===requester),'This purchase belongs to another OnlyIdeas account.',403);
    const owner=account.owner, prefix=`${proof.platform}:${proof.environment}:`;
    const id=hash(prefix+proof.receipt), subscription=hash(prefix+proof.subscription);
    const prior=store.db.prepare('SELECT * FROM billing_receipts WHERE id=?').get(id);
    requireValue(!prior || (prior.owner===owner && prior.product===proof.product),'Purchase receipt mismatch.',409);
    let awarded=0;
    if (!account.closed && proof.revoked && prior?.state==='granted') {
      store.db.prepare('INSERT INTO credit_ledger VALUES(?,?,?,?,?,?)').run(`store-refund:${id}`,owner,-prior.credits,'purchase_refund',null,Date.now());
      store.db.prepare("UPDATE billing_receipts SET state='revoked' WHERE id=?").run(id);
    } else if (!prior && proof.revoked) {
      // Refunds arriving before purchase callbacks prevent a later replay grant.
      store.db.prepare('INSERT INTO billing_receipts VALUES(?,?,?,?,?,?,?)').run(id,owner,proof.platform,proof.product,0,'revoked',Date.now());
    } else if (!account.closed && !prior && proof.paid && !proof.revoked) {
      awarded=plan.credits;
      store.db.prepare('INSERT INTO credit_ledger VALUES(?,?,?,?,?,?)').run(`subscription:${id}`,owner,awarded,'subscription',null,Date.now());
      store.db.prepare('INSERT INTO billing_receipts VALUES(?,?,?,?,?,?,?)').run(id,owner,proof.platform,proof.product,awarded,'granted',Date.now());
    }
    const saved=store.db.prepare('SELECT * FROM billing_subscriptions WHERE id=?').get(subscription);
    requireValue(!saved || saved.owner===owner,'Subscription ownership mismatch.',409);
    if (!account.closed && (!saved || proof.purchased>saved.purchased || (proof.purchased===saved.purchased && (proof.observed>saved.observed || (proof.observed===saved.observed && proof.revoked))))) {
      // An old unrevoked receipt cannot resurrect a revoked renewal's benefits.
      const state=proof.revoked || prior?.state==='revoked' ? 'revoked':proof.state;
      store.db.prepare('INSERT OR REPLACE INTO billing_subscriptions VALUES(?,?,?,?,?,?,?,?)').run(subscription,owner,proof.platform,proof.product,proof.expires,state,proof.observed,proof.purchased);
    }
    return { awarded, ...subscriptionSummary(store,owner) };
  });
}
export function deleteBillingAccount(store, owner) {
  const tombstone='deleted:'+hash(owner);
  store.db.prepare('UPDATE billing_accounts SET owner=?,closed=1 WHERE owner=?').run(tombstone,owner);
  store.db.prepare('UPDATE billing_receipts SET owner=? WHERE owner=?').run(tombstone,owner);
  store.db.prepare('DELETE FROM billing_subscriptions WHERE owner=?').run(owner);
  store.db.prepare('DELETE FROM billing_sources WHERE owner=?').run(owner);
}

export function billingCatalog(store,config,user,ready={}) {
  const enabled=creditsEnabled(config,user.id) && config.billing?.enabled===true && (ready.apple===true || ready.google===true);
  return { enabled, providers:{apple:enabled&&ready.apple===true,google:enabled&&ready.google===true}, accountToken:enabled?billingAccount(store,user.id):null,
    plans:enabled?plans.map(({targetUSD,...p})=>p):[], ...subscriptionSummary(store,user.id) };
}

import {hash,requireValue} from './domain.mjs';
import {plans,planForProduct} from './plans.mjs';
import {creditTransaction,creditsEnabled} from './credits.mjs';
import {unlimitedAllowance,allowanceAccount} from './allowances.mjs';
export const trialPolicy=Object.freeze({days:7,pages:50,fetches:10});
export const freeQuota=Object.freeze({pages:30,fetches:10});
export function initSubscriptionQuota(store){store.db.exec(`
 CREATE TABLE IF NOT EXISTS billing_periods(id TEXT PRIMARY KEY,owner TEXT NOT NULL,platform TEXT NOT NULL,product TEXT NOT NULL,starts INTEGER NOT NULL,ends INTEGER NOT NULL,pages INTEGER NOT NULL,fetches INTEGER NOT NULL,trial INTEGER NOT NULL,state TEXT NOT NULL,observed INTEGER NOT NULL,subscription TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS billing_period_owner ON billing_periods(owner,ends);
 CREATE TABLE IF NOT EXISTS billing_trials(identity TEXT PRIMARY KEY,period TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS subscription_usage(job TEXT PRIMARY KEY,owner TEXT NOT NULL,period TEXT NOT NULL,pages INTEGER NOT NULL,fetches INTEGER NOT NULL,state TEXT NOT NULL);
`)}
const trialIdentity=(store,owner)=>store.db.prepare('SELECT id FROM identities WHERE account=? ORDER BY id LIMIT 1').get(owner)?.id||hash(owner);
export const trialEligible=(store,owner)=>!store.db.prepare('SELECT 1 FROM billing_trials WHERE identity=?').get(trialIdentity(store,owner))&&!store.db.prepare('SELECT 1 FROM billing_receipts WHERE owner=? LIMIT 1').get(owner);
export function recordPeriod(store,proof,owner,id,subscription){
 const prior=store.db.prepare('SELECT * FROM billing_periods WHERE id=?').get(id);
 if(prior&&(prior.state==='revoked'||prior.observed>proof.observed))return;
 const plan=planForProduct(proof.platform,proof.product),trial=proof.trial===true;
 if(!proof.paid&&!trial&&!prior)return;
 let state=proof.revoked?'revoked':proof.state;
 if(trial){
  requireValue(proof.expires>proof.purchased&&proof.expires-proof.purchased<=8*86400_000,'Invalid trial period.',502);
  const identity=trialIdentity(store,owner),used=store.db.prepare('SELECT period FROM billing_trials WHERE identity=?').get(identity);
  if(used&&used.period!==id)return;
  store.db.prepare('INSERT OR IGNORE INTO billing_trials VALUES(?,?)').run(identity,id);
 }
 const pages=trial?trialPolicy.pages:plan.pages,fetches=trial?trialPolicy.fetches:plan.fetches;
 store.db.prepare('INSERT OR REPLACE INTO billing_periods VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id,owner,proof.platform,proof.product,proof.purchased,proof.expires,pages,fetches,trial?1:0,state,proof.observed,subscription);
}
export function quotaPeriod(store,owner,now=Date.now()){
 const paid=store.db.prepare("SELECT p.* FROM billing_periods p JOIN billing_subscriptions s ON s.id=p.subscription WHERE p.owner=? AND p.starts<=? AND p.ends>? AND p.state IN ('active','grace') AND s.state IN ('active','grace') AND s.expires>? ORDER BY p.pages DESC,p.starts DESC LIMIT 1").get(owner,now,now,now);
 if(paid)return {...paid,plan:planForProduct(paid.platform,paid.product)?.id};
 const date=new Date(now),starts=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1),ends=Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1);
 return {id:'free:'+starts,owner,starts,ends,...freeQuota,trial:0,plan:null};
}
export function quotaSummary(store,config,owner){
 const period=quotaPeriod(store,owner),usage=store.db.prepare("SELECT coalesce(sum(pages),0) AS pages,coalesce(sum(fetches),0) AS fetches FROM subscription_usage WHERE owner=? AND period=? AND state IN ('reserved','used','uncertain')").get(owner,period.id);
 return {enabled:config.billing?.quotasEnabled===true&&creditsEnabled(config,owner),unlimited:unlimitedAllowance(config,owner),plan:period.plan,trial:!!period.trial,starts:period.starts,ends:period.ends,pages:period.pages,fetches:period.fetches,usedPages:usage.pages,usedFetches:usage.fetches,remainingPages:Math.max(0,period.pages-usage.pages),remainingFetches:Math.max(0,period.fetches-usage.fetches)};
}
export function reserveSubscriptionQuota(store,config,job){
 const owner=allowanceAccount(job);
 if(config.billing?.quotasEnabled!==true||!creditsEnabled(config,owner)||unlimitedAllowance(config,owner)||job.reused)return;
 creditTransaction(store,()=>{
  const prior=store.db.prepare('SELECT * FROM subscription_usage WHERE job=?').get(job.id);
  if(prior&&prior.state!=='released')return;
  const period=quotaPeriod(store,owner),summary=quotaSummary(store,config,owner),pages=job.pages,fetches=job.url?1:0;
  requireValue(Number.isSafeInteger(pages)&&pages>0,'The PDF page count is unavailable.',409);
  requireValue(pages<=summary.remainingPages,'Your transcription page quota is used. Open Plans for your remaining allowance and renewal date.',402);
  requireValue(fetches<=summary.remainingFetches,'Your new-paper fetch quota is used. Existing papers stay free to read.',402);
  store.db.prepare("INSERT OR REPLACE INTO subscription_usage VALUES(?,?,?,?,?,'reserved')").run(job.id,owner,period.id,pages,fetches);
 });
}
export function finishSubscriptionQuota(store,job,success){
 const state=success&&!job.reused?'used':((job.submittedAt&&!job.pdfId)||(job.ocrSubmittedAt&&!job.ocrResult&&job.ocrText===undefined))&&!job.reused?'uncertain':'released';
 store.db.prepare("UPDATE subscription_usage SET state=? WHERE job=? AND state<>'used'").run(state,job.id);
}
export function deleteSubscriptionQuota(store,owner){store.db.prepare('DELETE FROM subscription_usage WHERE owner=?').run(owner);store.db.prepare('DELETE FROM billing_periods WHERE owner=?').run(owner)}

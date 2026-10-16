/** App-owned read-only consumer of LinkPrivate's consent-backed points port.
 * No grant, transfer, policy, token exchange or purchased-credit mutation here.
 */
import {createHash} from 'node:crypto';
export const LAC_READ = Object.freeze({contract:'app-lac-fun-points-v1',scope:'lac.points.balance.read',origin:'https://coin.lazying.art',audience:'lazyingart-fun-points-api',asset:'lazyingart.fun-points.v1'});
export const LAC_ASSET = Object.freeze({asset_id:LAC_READ.asset,kind:'nonmonetary_points',symbol:'LAC',decimals:0,transferable:false,purchasable:false,redeemable:false,cash_value:false,spendable:false,on_chain:false});
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keys=(v,k)=>object(v)&&Object.keys(v).sort().join('|')===[...k].sort().join('|');
const exact=(v,e)=>keys(v,Object.keys(e))&&Object.entries(e).every(([k,x])=>v[k]===x);
const amount=v=>typeof v==='string'&&/^(0|[1-9][0-9]{0,18})$/.test(v)&&BigInt(v)<=9223372036854775807n;
const integer=v=>Number.isSafeInteger(v)&&v>=0;
const subject=v=>typeof v==='string'&&/^la_[A-Za-z0-9_-]{16,160}$/.test(v);
const check=(value,code='points_snapshot_invalid')=>{if(!value)throw new LacReadError(code)};
export class LacReadError extends Error {constructor(code){super(code);this.code=code}}
export function validateLacSnapshot(value,{issuer,subject:sub,now=Date.now(),minimumRevision='0'}) {
 const k=['schema_version','contract','as_of','account','balance_id','revision','asset','ledger','pending_points','awarded_points','reversed_points','counts','spendable','aggregation'];
 const id='lac_fun_points_'+createHash('sha256').update(JSON.stringify([issuer,sub,LAC_READ.asset])).digest('hex');
 check(issuer==='https://chat.lazying.art'&&subject(sub)&&keys(value,k)&&value.schema_version===1&&value.contract===LAC_READ.contract);
 check(exact(value.account,{issuer,subject:sub})&&value.balance_id===id&&exact(value.asset,LAC_ASSET));
 check(value.ledger==='fun_points'&&value.spendable===false&&value.aggregation==='canonical_account_snapshot_do_not_sum_across_apps');
 const time=Math.floor(now/1000);
 check(integer(value.as_of)&&value.as_of>0&&value.as_of>=time-60&&value.as_of<=time+30);
 check(['revision','pending_points','awarded_points','reversed_points'].every(k=>amount(value[k]))&&amount(minimumRevision)&&BigInt(value.revision)>=BigInt(minimumRevision));
 check(keys(value.counts,['pending','awarded','reversed'])&&Object.values(value.counts).every(integer));
 return structuredClone(value);
}
export function createLacBalance(db,config,{binding,profile,provider,now=Date.now}={}) {
 // A runtime flag alone cannot advertise a nonexistent SDK/consent implementation.
 if(config?.enabled!==true||profile?.enabled!==true||provider?.qualified!==true)return Object.freeze({enabled:false});
 check(exact(provider.binding,binding)&&provider.contract===LAC_READ.contract&&provider.scope===LAC_READ.scope&&provider.origin===LAC_READ.origin&&provider.audience===LAC_READ.audience,'points_not_qualified');
 check(typeof provider.authorize==='function'&&typeof provider.balance==='function'&&typeof profile.proof==='function'&&typeof profile.connection==='function','points_not_qualified');
 db.exec('CREATE TABLE IF NOT EXISTS lac_read_revisions(issuer TEXT NOT NULL,subject TEXT NOT NULL,revision TEXT NOT NULL,fingerprint TEXT NOT NULL,PRIMARY KEY(issuer,subject))');
 const revisions=db.prepare('SELECT revision,fingerprint FROM lac_read_revisions WHERE issuer=? AND subject=?');
 function connection(owner){const c=profile.connection(owner);check(c&&!['disconnected','reauthorize'].includes(c.state),'points_link_required');check(c.state==='active','points_session_unavailable');return c}
 async function read(owner){
  check(typeof owner==='string'&&owner.length>0,'points_link_required');
  connection(owner);
  let proof;try{proof=await profile.proof(owner)}catch(e){if(e.code==='reconnect_required')throw new LacReadError('points_link_required');throw e}
  const original=connection(owner);
  check(proof.identity.issuer===binding.issuer&&proof.identity.subject===original.subject&&original.issuer===binding.issuer,'points_identity_changed');
  const same=()=>{const c=connection(owner);check(c.generation===original.generation&&c.subject===original.subject&&c.issuer===original.issuer,'points_identity_changed')};
  // This must be the separate fresh operation-consent proof, never profile scope.
  const authorization=await provider.authorize({owner,issuer:binding.issuer,subject:original.subject});same();
  check(exact(authorization,{issuer:binding.issuer,subject:original.subject,actor:binding.clientId,sourceAudience:binding.audience,scope:LAC_READ.scope}),'points_consent_required');
  const previous=revisions.get(binding.issuer,original.subject);
  const raw=await provider.balance({owner,issuer:binding.issuer,subject:original.subject,minimumRevision:previous?.revision||'0'});same();
  const value=validateLacSnapshot(raw,{issuer:binding.issuer,subject:original.subject,now:now(),minimumRevision:previous?.revision||'0'});
  // Identical ledger revision must describe the same balance; as_of may refresh.
  const {as_of,...stable}=value,fingerprint=createHash('sha256').update(JSON.stringify([stable.balance_id,stable.revision,stable.awarded_points,stable.pending_points,stable.reversed_points,stable.counts.pending,stable.counts.awarded,stable.counts.reversed])).digest('hex');
  db.exec('BEGIN IMMEDIATE');
  try{
   same();const latest=revisions.get(binding.issuer,original.subject);
   check(!latest||BigInt(value.revision)>=BigInt(latest.revision),'points_snapshot_rollback');
   check(!latest||value.revision!==latest.revision||fingerprint===latest.fingerprint,'points_snapshot_conflict');
   db.prepare('INSERT INTO lac_read_revisions VALUES(?,?,?,?) ON CONFLICT(issuer,subject) DO UPDATE SET revision=excluded.revision,fingerprint=excluded.fingerprint').run(binding.issuer,original.subject,value.revision,fingerprint);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  // Net awarded is already canonical. No addition across apps or subtraction.
  return {state:'ready',balance:value.awarded_points,pending:value.pending_points,asOf:value.as_of,revision:value.revision};
 }
 return Object.freeze({enabled:true,read});
}

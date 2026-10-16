/** Durable source evidence. Coin owns awards; this module never changes balances. */
import {AppError,hash,requireValue} from './domain.mjs';
import {creditTransaction as tx} from './credits.mjs';
import {PROFILE_BINDING as B} from './lazyingart-profile.mjs';
export function canonicalEvidence(value){
 if(value===null||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'){requireValue(Number.isSafeInteger(value),'Invalid evidence number.');return JSON.stringify(value)}
 if(typeof value==='string'){requireValue(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value),'Invalid evidence text.');return JSON.stringify(value)}
 if(Array.isArray(value))return '['+value.map(canonicalEvidence).join(',')+']';
 requireValue(value&&Object.getPrototypeOf(value)===Object.prototype,'Invalid evidence object.');
 return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalEvidence(value[k])).join(',')+'}';
}
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join('|')===[...keys].sort().join('|');
const identifier=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/.test(v);
const positive=v=>Number.isSafeInteger(v)&&v>0;
const eventKeys=['policy_id','policy_version','event_id','occurred_at','evidence_ref','evidence_sha256'];
const retentionSeconds=90*86400;
export function createRewardEvidence(store,{authorize,now=()=>Date.now()}={}){
 requireValue(typeof authorize==='function','A qualified rewards authorization source is required.');
 store.db.exec(`CREATE TABLE IF NOT EXISTS lac_source_evidence(
   reference TEXT PRIMARY KEY,owner TEXT NOT NULL,subject TEXT NOT NULL,event TEXT UNIQUE NOT NULL,
   kind TEXT NOT NULL,occurred INTEGER NOT NULL,record TEXT NOT NULL,digest TEXT NOT NULL,
   state TEXT NOT NULL DEFAULT 'active',decided INTEGER);
   CREATE INDEX IF NOT EXISTS lac_source_owner ON lac_source_evidence(owner,occurred);
   CREATE TABLE IF NOT EXISTS lac_source_intakes(
     reference TEXT PRIMARY KEY,receipt TEXT UNIQUE NOT NULL);
   CREATE TABLE IF NOT EXISTS lac_source_finals(
     reference TEXT PRIMARY KEY,decision_id TEXT UNIQUE NOT NULL,receipt TEXT UNIQUE NOT NULL,
     decision TEXT NOT NULL,digest TEXT NOT NULL,finalized INTEGER NOT NULL,adopted INTEGER NOT NULL);`);
 const finalized=reference=>!!store.db.prepare('SELECT 1 FROM lac_source_finals WHERE reference=?').get(reference);
 function sameIdentity(identity,subject){requireValue(identity?.issuer===B.issuer&&identity.clientId===B.clientId&&identity.audience===B.audience&&/^la_[a-f0-9]{32}$/.test(identity.subject)&&(!subject||identity.subject===subject),'Reconnect the original LazyingArt account.',401)}
 async function checkIn(user){
   store.requireActive(user.id);
   // This dependency must freshly validate separate points-operation consent,
   // not merely a profile token or an object from the client's request body.
   const identity=await authorize(user.id,'lac.points.intents.write');sameIdentity(identity);
   const occurred=Math.floor(now()/1000),day=Math.floor(occurred/86400),key=hash(canonicalEvidence([B.issuer,identity.subject,day]));
   const reference='onlyideas-daily-'+key,event='oi-daily-'+key;
   return tx(store,()=>{
     store.requireActive(user.id);
     const existing=store.db.prepare('SELECT * FROM lac_source_evidence WHERE reference=?').get(reference);
     if(existing){requireValue(existing.owner===user.id&&existing.subject===identity.subject,'Reward identity conflict.',409);requireValue(existing.state==='active'&&!finalized(reference),'This activity is no longer eligible.',409);return intent(existing)}
     const record={schema:'lac-reward-evidence-v1',issuer:B.issuer,subject:identity.subject,actor:B.clientId,event_id:event,occurred_at:occurred,evidence_ref:reference,kind:'daily-activity',review_reference:'oi-checkin-'+key,
       facts:{source_record_id:event,activity_rule:'onlyideas-daily-check-in-v1',successful_activity:true,server_observed:true}};
     const raw=canonicalEvidence(record);requireValue(Buffer.byteLength(raw)<=8192,'Evidence is too large.');
     store.db.prepare('INSERT INTO lac_source_evidence(reference,owner,subject,event,kind,occurred,record,digest) VALUES(?,?,?,?,?,?,?,?)').run(reference,user.id,identity.subject,event,record.kind,occurred,raw,hash(raw));
     return intent(store.db.prepare('SELECT * FROM lac_source_evidence WHERE reference=?').get(reference));
   });
 }
 const intent=row=>({policy_id:'lac-daily-activity',policy_version:1,event_id:row.event,occurred_at:row.occurred,evidence_ref:row.reference,evidence_sha256:row.digest});
 async function read({issuer,subject,actor,reference,scope,signal}){
   requireValue(issuer===B.issuer&&actor===B.clientId&&['lac.points.intents.write','lac.points.intents.reverse'].includes(scope),'Evidence not available.',404);
   const row=store.db.prepare('SELECT * FROM lac_source_evidence WHERE reference=? AND subject=?').get(reference,subject);
   requireValue(row&&row.state==='active'&&store.active(row.owner)&&!finalized(reference),'Evidence not available.',404);
   const identity=await authorize(row.owner,scope,{signal});sameIdentity(identity,subject);
   const current=store.db.prepare('SELECT * FROM lac_source_evidence WHERE reference=?').get(reference);
   requireValue(current?.state==='active'&&store.active(row.owner)&&!finalized(reference),'Evidence not available.',404);
   return {record:JSON.parse(row.record),eligible:true};
 }
 async function eligible({issuer,subject,actor,policy_id,policy_version,phase,event,signal}){
   if(policy_id!=='lac-daily-activity'||policy_version!==1||!['intake','award'].includes(phase))return false;
   const row=store.db.prepare('SELECT * FROM lac_source_evidence WHERE reference=? AND subject=?').get(event.evidence_ref,subject);
   if(!row||row.state!=='active'||!store.active(row.owner)||canonicalEvidence(intent(row))!==canonicalEvidence(event))return false;
   try{return (await read({issuer,subject,actor,reference:row.reference,scope:'lac.points.intents.write',signal})).eligible}
   catch(e){if([401,403,404].includes(e.status))return false;throw e}
 }
 function hold(owner){store.db.prepare("UPDATE lac_source_evidence SET state='held' WHERE owner=? AND state='active'").run(owner)}
 // A verified original-subject reconnection can resume only that subject's rows.
 async function resume(owner){store.requireActive(owner);const identity=await authorize(owner,'lac.points.intents.write');sameIdentity(identity);store.requireActive(owner);store.db.prepare("UPDATE lac_source_evidence SET state='active' WHERE owner=? AND subject=? AND state='held'").run(owner,identity.subject)}
 function remove(owner){store.db.prepare("UPDATE lac_source_evidence SET state='deleted' WHERE owner=?").run(owner)}
 function validateBinding({issuer,subject,actor,event}){
   requireValue(issuer===B.issuer&&actor===B.clientId&&typeof subject==='string'&&/^la_[a-f0-9]{32}$/.test(subject),'Source decision binding conflict.',409);
   requireValue(exact(event,eventKeys)&&identifier(event.policy_id)&&positive(event.policy_version)&&identifier(event.event_id)&&positive(event.occurred_at)&&identifier(event.evidence_ref)&&typeof event.evidence_sha256==='string'&&/^[a-f0-9]{64}$/.test(event.evidence_sha256),'Invalid source decision.');
 }
 function original(binding){
   const row=store.db.prepare('SELECT * FROM lac_source_evidence WHERE reference=?').get(binding.event.evidence_ref);
   requireValue(row&&row.subject===binding.subject&&canonicalEvidence(intent(row))===canonicalEvidence(binding.event),'Source decision binding conflict.',409);
   const record=JSON.parse(row.record);
   requireValue(record.issuer===binding.issuer&&record.actor===binding.actor&&record.subject===binding.subject&&record.event_id===row.event&&record.evidence_ref===row.reference&&record.occurred_at===row.occurred&&hash(canonicalEvidence(record))===row.digest,'Source decision binding conflict.',409);
   return row;
 }
 function storage(operation){
   let timeout;
   try{
     timeout=store.db.prepare('PRAGMA busy_timeout').get().timeout;
     store.db.exec('PRAGMA busy_timeout=1000');
     return tx(store,operation);
   }catch(error){
     if(error instanceof AppError)throw error;
     throw new AppError('Source temporarily unavailable.',503);
   }finally{if(timeout!==undefined)store.db.exec(`PRAGMA busy_timeout=${timeout}`)}
 }
 // Internal trusted delivery seam, after full intake-receipt verification.
 // This is not an HTTP route, SDK ACK hook or retention start signal.
 function bindIntake(binding){
   requireValue(exact(binding,['issuer','subject','actor','event','receipt_id'])&&identifier(binding.receipt_id),'Invalid source receipt.');
   validateBinding(binding);
   return storage(()=>{
     const row=original(binding),old=store.db.prepare('SELECT * FROM lac_source_intakes WHERE reference=? OR receipt=?').all(row.reference,binding.receipt_id);
     requireValue(old.every(r=>r.reference===row.reference&&r.receipt===binding.receipt_id),'Source receipt conflict.',409);
     const finals=store.db.prepare('SELECT reference,receipt FROM lac_source_finals WHERE reference=? OR receipt=?').all(row.reference,binding.receipt_id);
     requireValue(finals.every(r=>r.reference===row.reference&&r.receipt===binding.receipt_id),'Source receipt conflict.',409);
     if(!old.length)store.db.prepare('INSERT INTO lac_source_intakes VALUES(?,?)').run(row.reference,binding.receipt_id);
     return binding.receipt_id;
   });
 }
 function adoptFinal({issuer,subject,actor,decision}){
   requireValue(exact(decision,['contract','decision_id','receipt_id','issuer','subject','actor','event','outcome','awarded_points','finalized_at'])&&decision.contract==='app-lac-source-final-v1'&&typeof decision.decision_id==='string'&&/^final_[a-f0-9]{32}$/.test(decision.decision_id)&&identifier(decision.receipt_id),'Invalid source decision.');
   validateBinding(decision);
   requireValue(decision.issuer===issuer&&decision.subject===subject&&decision.actor===actor,'Source decision binding conflict.',409);
   requireValue(positive(decision.finalized_at)&&decision.finalized_at>=decision.event.occurred_at,'Invalid source decision time.');
   requireValue(['expired_pending','reversed','awarded'].includes(decision.outcome)&&typeof decision.awarded_points==='string'&&/^(0|[1-9][0-9]*)$/.test(decision.awarded_points)&&(decision.outcome==='awarded'||decision.awarded_points==='0'),'Invalid source decision outcome.');
   const raw=canonicalEvidence(decision);requireValue(Buffer.byteLength(raw)<=8192,'Source decision too large.');
   return storage(()=>{
     const adopted=Math.floor(now()/1000);
     requireValue(positive(adopted)&&decision.finalized_at<=adopted+30,'Invalid source decision time.');
     const row=original(decision);
     const known=store.db.prepare('SELECT * FROM lac_source_intakes WHERE reference=? OR receipt=?').all(row.reference,decision.receipt_id);
     requireValue(known.every(r=>r.reference===row.reference&&r.receipt===decision.receipt_id),'Source receipt conflict.',409);
     const matches=store.db.prepare('SELECT * FROM lac_source_finals WHERE reference=? OR decision_id=? OR receipt=?').all(row.reference,decision.decision_id,decision.receipt_id);
     requireValue(matches.every(r=>r.reference===row.reference&&r.decision===raw),'Source final decision conflict.',409);
     if(matches.length){requireValue(matches[0].digest===hash(raw),'Source temporarily unavailable.',503);return matches[0].digest}
     const digest=hash(raw);
     store.db.prepare('INSERT INTO lac_source_finals VALUES(?,?,?,?,?,?,?)').run(row.reference,decision.decision_id,decision.receipt_id,raw,digest,decision.finalized_at,adopted);
     return digest;
   });
 }
 // Explicit bounded maintenance only. No caller, timer or public route enables
 // this automatically. The legacy `decided` column never authorizes deletion.
 function purge({limit=1000}={}){
   requireValue(Number.isSafeInteger(limit)&&limit>=1&&limit<=1000,'Invalid retention limit.');
   const cutoff=Math.floor(now()/1000)-retentionSeconds;
   return storage(()=>{
     const rows=store.db.prepare('SELECT reference FROM lac_source_finals WHERE max(finalized,adopted)<=? ORDER BY max(finalized,adopted),reference LIMIT ?').all(cutoff,limit);
     for(const {reference} of rows){
       store.db.prepare('DELETE FROM lac_source_evidence WHERE reference=?').run(reference);
       store.db.prepare('DELETE FROM lac_source_intakes WHERE reference=?').run(reference);
       store.db.prepare('DELETE FROM lac_source_finals WHERE reference=?').run(reference);
     }
     return rows.length;
   });
 }
 return {checkIn,read,eligible,hold,resume,remove,bindIntake,adoptFinal,purge};
}

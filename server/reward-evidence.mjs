/** Durable source evidence. Coin owns awards; this module never changes balances. */
import {hash,requireValue} from './domain.mjs';
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
export function createRewardEvidence(store,{authorize,now=()=>Date.now()}={}){
 requireValue(typeof authorize==='function','A qualified rewards authorization source is required.');
 store.db.exec(`CREATE TABLE IF NOT EXISTS lac_source_evidence(
   reference TEXT PRIMARY KEY,owner TEXT NOT NULL,subject TEXT NOT NULL,event TEXT UNIQUE NOT NULL,
   kind TEXT NOT NULL,occurred INTEGER NOT NULL,record TEXT NOT NULL,digest TEXT NOT NULL,
   state TEXT NOT NULL DEFAULT 'active',decided INTEGER);
   CREATE INDEX IF NOT EXISTS lac_source_owner ON lac_source_evidence(owner,occurred);`);
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
     if(existing){requireValue(existing.owner===user.id&&existing.subject===identity.subject,'Reward identity conflict.',409);requireValue(existing.state==='active','Reconnect rewards before retrying this activity.',409);return intent(existing)}
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
   requireValue(row&&row.state==='active'&&store.active(row.owner),'Evidence not available.',404);
   const identity=await authorize(row.owner,scope,{signal});sameIdentity(identity,subject);
   const current=store.db.prepare('SELECT * FROM lac_source_evidence WHERE reference=?').get(reference);
   requireValue(current?.state==='active'&&store.active(row.owner),'Evidence not available.',404);
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
 // Called only after the trusted delivery layer validates a final Coin receipt.
 function decided(reference,subject){store.db.prepare('UPDATE lac_source_evidence SET decided=? WHERE reference=? AND subject=?').run(Math.floor(now()/1000),reference,subject)}
 // Maintenance is explicit. Backups and outbox history have separate retention.
 function purge(){const cutoff=Math.floor(now()/1000)-90*86400;return tx(store,()=>store.db.prepare('DELETE FROM lac_source_evidence WHERE reference IN (SELECT reference FROM lac_source_evidence WHERE decided IS NOT NULL AND decided<? LIMIT 1000)').run(cutoff).changes)}
 return {checkIn,read,eligible,hold,resume,remove,decided,purge};
}

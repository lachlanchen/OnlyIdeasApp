/** Authenticated Coin-to-app evidence reads. No user token or award endpoint. */
import {timingSafeEqual} from 'node:crypto';
import {AppError,requireValue} from './domain.mjs';
import {uniqueJSON,PROFILE_BINDING as B} from './lazyingart-profile.mjs';
const exact=(v,ks)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(' ')===[...ks].sort().join(' ');
const id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/.test(v);
export function createRewardSource({secret,evidence,now=()=>Date.now()}){
 requireValue(typeof secret==='string'&&/^[A-Za-z0-9_-]{32,128}$/.test(secret),'Invalid rewards source configuration.');
 const expected=Buffer.from(secret);
 function authorized(headers){const value=headers['x-lac-source-key'];if(typeof value!=='string'||['origin','cookie','authorization'].some(k=>Object.hasOwn(headers,k)))return false;const supplied=Buffer.from(value);return supplied.length===expected.length&&timingSafeEqual(supplied,expected)}
 async function handle({operation,method,headers,body,signal}){
   requireValue(authorized(headers),'Source authorization required.',401);
   requireValue(method==='POST','Method not allowed.',405);
   requireValue(headers['content-type']==='application/json'&&Buffer.isBuffer(body)&&body.length<=8192,'Invalid source request.');
   let data;try{data=uniqueJSON(body)}catch{throw new AppError('Invalid source request.',400)}
   const common=['schema_version','issuer','subject','actor','nonce'];
   requireValue(['evidence','eligibility'].includes(operation)&&exact(data,[...common,...(operation==='evidence'?['evidence_ref']:['policy_id','policy_version','phase','event'])]),'Invalid source request.');
   requireValue(data.schema_version===1&&data.issuer===B.issuer&&data.actor===B.clientId&&typeof data.subject==='string'&&/^la_[a-f0-9]{32}$/.test(data.subject)&&typeof data.nonce==='string'&&/^[a-f0-9]{48}$/.test(data.nonce),'Invalid source request.');
   let result;
   if(operation==='evidence'){
     requireValue(id(data.evidence_ref),'Invalid source request.');
     try{result=(await evidence.read({...data,reference:data.evidence_ref,scope:'lac.points.intents.write',signal})).record}
     catch(e){if([401,403,404].includes(e.status))result=null;else throw new AppError('Source temporarily unavailable.',503)}
   }else{
     requireValue(id(data.policy_id)&&Number.isSafeInteger(data.policy_version)&&data.policy_version>0&&['intake','award'].includes(data.phase)&&exact(data.event,['policy_id','policy_version','event_id','occurred_at','evidence_ref','evidence_sha256']),'Invalid source request.');
     const e=data.event;requireValue(e.policy_id===data.policy_id&&e.policy_version===data.policy_version&&id(e.event_id)&&id(e.evidence_ref)&&Number.isSafeInteger(e.occurred_at)&&e.occurred_at>0&&typeof e.evidence_sha256==='string'&&/^[a-f0-9]{64}$/.test(e.evidence_sha256),'Invalid source request.');
     try{result=await evidence.eligible({...data,signal})}catch{throw new AppError('Source temporarily unavailable.',503)}
   }
   return {schema_version:1,actor:B.clientId,nonce:data.nonce,as_of:Math.floor(now()/1000),[operation==='evidence'?'evidence':'eligible']:result};
 }
 return {authorized,handle};
}

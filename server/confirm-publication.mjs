import {randomUUID} from 'node:crypto';
import {requireValue,mayPublish} from './domain.mjs';
import {sharingConsent} from './sharing-consent.mjs';

// Publication is one transaction: permission, visibility and the review record
// must succeed together. No conversion, credit charge or duplicate publication.
export function confirmPublication(store,user,id,body,acceptTerms){
 store.db.exec('BEGIN IMMEDIATE');
 try{
  store.requireActive(user.id);
  const p=store.paper(id);requireValue(p?.owner===user.id,'Only the owner can publish.',403);
  requireValue(!body.revision||body.revision===p.revision,'The paper changed. Reload before publishing.',409);
  const previous=store.existing(p.owner,`publish:${p.id}:${p.revision}`);
  const consent=sharingConsent({license:body.license,attestation:body.attestation},'shared');requireValue(consent,'Confirm sharing permission.');
  requireValue(body.acceptTerms===true,'Please read and accept the Community Terms.');
  if(p.visibility==='public'){
   requireValue(p.license===body.license,'This paper is already public under its existing permission.',409);
   store.db.exec('COMMIT');return {paper:p,job:previous,alreadyPublic:true};
  }
  requireValue(!['queued','running'].includes(previous?.state),'This paper is already publishing.',409);
  requireValue(previous?.reviewDecision!=='reject','A moderator declined this publication. Contact support before sharing it again.',409);
  const next={...p,license:consent.license,source:String(body.source||p.source||''),visibility:'public',sharing:'awaiting_review',provenance:{...p.provenance,verification:'uploader-confirmed',attestation:true,confirmedAt:consent.confirmedAt}};
  mayPublish(next,true);acceptTerms(store,user,true);
  const job={...(previous||{id:randomUUID(),owner:p.owner,kind:'publish',paperId:p.id,dedupe:`publish:${p.id}:${p.revision}`,created:Date.now()}),state:'awaiting_review',reviewed:false,message:'Shared · administrator review pending'};
  for(const k of ['reviewFingerprint','reviewDecision','leaseUntil','error'])delete job[k];
  store.savePaper(next);store.saveJob(job);store.db.exec('COMMIT');return {paper:next,job};
 }catch(e){store.db.exec('ROLLBACK');throw e;}
}

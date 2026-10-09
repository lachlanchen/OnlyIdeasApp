export type ReviewDraft={license:string;evidenceUrl:string;note:string;contentChecked:boolean;rightsChecked:boolean;token:string}
export const reviewableStates=['awaiting_review','changes_requested','declined','publication_failed']
export const reviewLicenses=['CC0-1.0','CC-BY-4.0','CC-BY-SA-4.0','author-permission']
type QuickEntry={token:string;state:string;paper:{license:string;source:string;provenance?:{licenseUrl?:string}}}
// Clicking Quick approve is the reviewer's explicit permission/content attestation.
// A missing license is never inferred: the reviewer chooses it for the batch.
export function quickApprovalDraft(entry:QuickEntry,draft?:ReviewDraft,missingLicense=''):ReviewDraft {
  const current=draft?.token===entry.token?draft:undefined
  const license=current?.license||entry.paper.license
  return {
    token:entry.token,
    license:reviewLicenses.includes(license)?license:missingLicense,
    evidenceUrl:current?.evidenceUrl??(entry.paper.provenance?.licenseUrl||entry.paper.source),
    note:('Quick approval: administrator confirmed redistribution permission and checked the transcript, equations, figures and content.'+(current?.note.trim()?' '+current.note.trim():'')).slice(0,2000),
    rightsChecked:true,contentChecked:true,
  }
}
export function approvalNeeds(entry:{token:string;state:string},draft?:ReviewDraft):string[]{
  if(!reviewableStates.includes(entry.state))return ['Publication is already in progress. Refresh the queue.']
  if(!draft)return ['Open this paper to complete its review.']
  if(draft.token!==entry.token)return ['Review this paper again; it has changed.']
  const needs:string[]=[]
  if(!reviewLicenses.includes(draft.license))needs.push('Choose a verified license.')
  let validURL=false
  try{const url=new URL(draft.evidenceUrl);validURL=url.protocol==='https:'&&!url.username&&!url.password&&!url.hash}catch{/* Show the missing field below. */}
  if(!validURL)needs.push('Add a valid HTTPS permission evidence URL.')
  if(draft.note.trim().length<10||draft.note.length>2000)needs.push('Write a review note (at least 10 characters).')
  if(!draft.rightsChecked)needs.push('I checked permission to redistribute the text and figures.')
  if(!draft.contentChecked)needs.push('I checked the transcript, equations, figures and content.')
  return needs
}

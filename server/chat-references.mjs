import {requireValue} from './domain.mjs';
import {canReusePaper} from './import-reuse.mjs';
import {paperMetadata} from './paper-metadata.mjs';

/** IDs, never client-provided excerpts, establish chat context. */
export function resolveChatReferences(store, owner, chat, input={}) {
 const ids=input.paperIds ?? [];
 requireValue(Array.isArray(ids)&&ids.length<=3&&ids.every(id=>typeof id==='string'&&/^[\w-]{1,120}$/.test(id)),'Choose up to three papers.');
 const references=[...new Set(ids)].map(id=>{
  const p=store.paper(id);requireValue(canReusePaper(store,p,owner),'Paper not found.',404);
  return {...paperMetadata(p),id:p.id,paperId:p.id,title:p.title,authors:p.authors||'',source:p.source||'',summary:'',pdfUrl:''};
 });
 let quote;
 if(input.quoteId){
  requireValue(typeof input.quoteId==='string','Choose a message from this conversation.');
  const row=store.db.prepare('SELECT id,role,body FROM chat_messages WHERE id=? AND chat=?').get(input.quoteId,chat);
  requireValue(row&&['user','assistant'].includes(row.role),'Message not found in this conversation.',404);
  quote={id:row.id,role:row.role,text:String(JSON.parse(row.body).text||'').slice(0,1600)};
 }
 return {references,...(quote?{quote}:{})};
}

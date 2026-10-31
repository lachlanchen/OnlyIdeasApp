import {downloadPublic} from './network.mjs';
import {requireValue,AppError} from './domain.mjs';
import {recommendationOptions} from './recommendation-options.mjs';
import {readPreferences,savePreferences} from './reading-preferences.mjs';
import {cleanPreferenceText,cleanInterests,preferenceLimits} from './preference-cleanup.mjs';
import {withJournalMetric} from './journal-metrics.mjs';

const key=value=>value.normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]/gu,'');
const sourceID=value=>String(value||'').replace(/^https:\/\/openalex\.org\//,'');
const issn=value=>/^\d{4}-\d{3}[\dX]$/i.test(value);
const aliases={pnas:'S125754415',光学:'S4210197940',自然:'S137773608',科学:'S3880285',细胞:'S110447773'};
const curated=recommendationOptions.journals.map(withJournalMetric);
const canonical=row=>{
 const id=sourceID(row?.id);
 if(!/^S\d+$/.test(id)||row.type!=='journal'||!Array.isArray(row.issn)||!row.issn.some(issn))return null;
 let name;try{name=cleanPreferenceText(row.display_name,160,'journal')}catch{return null}
 if(!name)return null;
 return withJournalMetric({id,name,issn:[...new Set(row.issn.filter(issn).map(s=>s.toUpperCase()))].slice(0,4),source:'https://openalex.org/'+id});
};

// One bounded resolver serves settings, explicit chat commands and model plans.
// Only selected canonical journals persist in an account. Searches never create
// a global, ever-growing catalogue or accept a model's fabricated source ID.
export function createPreferenceGate(store,{download=downloadPublic,now=Date.now}={}) {
 const cache=new Map(),pending=new Map();
 function remember(query,rows){
  const at=now();for(const [k,v]of cache)if(at-v.at>86400_000)cache.delete(k);
  for(const k of [query,...rows.map(x=>x.id)]){cache.delete(k);cache.set(k,{at,rows})}
  while(cache.size>128)cache.delete(cache.keys().next().value);
 }
 async function resolve(query) {
  const text=cleanPreferenceText(query,preferenceLimits.journalQueryCharacters,'journal');
  requireValue(text,'Enter a journal name or ISSN.');
  const match=curated.find(j=>key(j.name)===key(text)||j.id===text||j.id===aliases[key(text)]);
  if(match)return [match];
  const cached=cache.get(key(text))||cache.get(text);
  if(cached&&now()-cached.at<86400_000)return cached.rows;
  const queryKey=key(text);if(pending.has(queryKey))return pending.get(queryKey);
  requireValue(pending.size<4,'Journal lookup is busy. Please try again shortly.',429);
  const operation=(async()=>{
   const url=new URL(/^S\d+$/.test(text)?'https://api.openalex.org/sources/'+text:'https://api.openalex.org/sources');
   if(!/^S\d+$/.test(text))url.search=new URLSearchParams(issn(text)?{filter:'issn:'+text}:{search:text,filter:'type:journal',per_page:'6'});
   let data;try{data=JSON.parse((await download(url.href,{maxBytes:350_000,timeout:8000,redirects:0})).toString())}
   catch{throw new AppError('Journal lookup is temporarily unavailable. Your choices have not changed.',503)}
   const rows=(Array.isArray(data.results)?data.results:[data]).map(canonical).filter(Boolean);
   const exact=rows.filter(j=>key(j.name)===key(text)||j.id===text||j.issn.includes(text.toUpperCase()));
   const result=[...new Map((exact.length?exact:rows).map(j=>[j.id,j])).values()].slice(0,6);
   remember(queryKey,result);return result;
  })();pending.set(queryKey,operation);
  try{return await operation}finally{pending.delete(queryKey)}
 }
 function options(user){const p=user?readPreferences(store,user):{};return {...recommendationOptions,journals:[...curated,...(p.customJournals||[]).map(withJournalMetric)],limits:preferenceLimits}}
 async function prepare(user,body) {
  store.requireActive(user.id);
  requireValue(body&&typeof body==='object'&&!Array.isArray(body),'Choose valid reading preferences.');
  const old=readPreferences(store,user),patch={...body},resolvedJournals=[];
  // Capture the revision BEFORE network I/O, including old clients without one.
  if(patch.revision!==undefined)requireValue(patch.revision===old.revision,'Your preferences changed elsewhere. Reopen settings and try again.',409);
  patch.revision=old.revision;
  if('interests'in patch)patch.interests=cleanInterests(patch.interests);
  if('journalNames'in patch){
   requireValue(!('journals'in patch),'Choose journal names or journal IDs, not both.');
   requireValue(Array.isArray(patch.journalNames)&&patch.journalNames.length>0&&patch.journalNames.length<=4,'Add up to 4 journals at a time.');
   requireValue(['add','remove','replace'].includes(patch.journalOperation||'add'),'Choose a journal action.');
   const ids=[];
   for(const rawName of patch.journalNames){
    const name=cleanPreferenceText(rawName,160,'journal');requireValue(name,'Enter a journal name or ISSN.');
    const local=options(user).journals.filter(j=>key(j.name)===key(name)||j.id===name);
    const rows=local.length?local:await resolve(name);
    const exact=rows.filter(j=>key(j.name)===key(name)||j.id===name||j.id===aliases[key(name)]||j.issn?.includes(name.toUpperCase()));
    requireValue(exact.length===1,rows.length?'Which journal? Use its full name or ISSN: '+rows.map(j=>j.name).join('; '):'No verified journal matched. Try its full name or ISSN.');
    ids.push(exact[0].id);resolvedJournals.push(exact[0]);
   }
   patch.journals=patch.journalOperation==='remove'?old.journals.filter(id=>!ids.includes(id)):patch.journalOperation==='replace'?ids:[...new Set([...old.journals,...ids])];
   patch.journalScope='selected';delete patch.journalNames;delete patch.journalOperation;
  }
  if('journals'in patch){
   requireValue(Array.isArray(patch.journals)&&patch.journals.length<=preferenceLimits.journals,'Keep up to 24 journals. Remove one before adding another.');
   const known=new Set([...options(user).journals,...resolvedJournals].map(j=>j.id));
   for(const id of new Set(patch.journals)){
    requireValue(typeof id==='string'&&/^S\d+$/.test(id),'Choose a verified journal.');
    if(!known.has(id)){const rows=await resolve(id),row=rows.find(j=>j.id===id);requireValue(row,'Choose a verified journal.');resolvedJournals.push(row)}
   }
  }
  return {patch,resolvedJournals};
 }
 return {resolve,options,prepare,async apply(user,body){const {patch,resolvedJournals}=await prepare(user,body);return savePreferences(store,user,patch,{resolvedJournals})}};
}

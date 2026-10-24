import type {ResearchHit} from './Discovery'

// One replaceable first page, not a growing history of feeds or search queries.
export const recommendationCacheKey='onlyideas.recommendations.v1'
export const recommendationFreshMs=5*60_000
export const recommendationMaxAgeMs=7*86400_000
export const recommendationMaxBytes=512_000
export type RecommendationSnapshot={version:1;scope:string;at:number;papers:ResearchHit[];nextPage:number|null}
export function feedPage(value:unknown):number|null {
 return typeof value==='number'&&Number.isInteger(value)&&value>1&&value<=100?value:null
}
export function readRecommendations(storage:Storage,scope:string,now=Date.now()):RecommendationSnapshot|null {
 try {
  const raw=storage.getItem(recommendationCacheKey);if(!raw)return null
  if(new TextEncoder().encode(raw).length>recommendationMaxBytes){storage.removeItem(recommendationCacheKey);return null}
  const v=JSON.parse(raw)
  if(v.version!==1||!Number.isFinite(v.at)||v.at>now||now-v.at>recommendationMaxAgeMs||!Array.isArray(v.papers)||v.papers.length>60||!v.papers.every((p:ResearchHit)=>p&&typeof p.id==='string'&&typeof p.title==='string'&&typeof p.source==='string'&&typeof p.authors==='string')){
   storage.removeItem(recommendationCacheKey);return null
  }
  return v.scope===scope?{...v,nextPage:feedPage(v.nextPage)}:null
 }catch{return null}
}
export function saveRecommendations(storage:Storage,scope:string,papers:ResearchHit[],nextPage:unknown,now=Date.now()) {
 try {
  if(papers.length>60)return // Never truncate a page and silently skip its remainder.
  const raw=JSON.stringify({version:1,scope,at:now,papers,nextPage:feedPage(nextPage)})
  if(new TextEncoder().encode(raw).length<=recommendationMaxBytes)storage.setItem(recommendationCacheKey,raw)
 }catch{/* Storage denial/quota cannot prevent reading. */}
}
export function clearRecommendations(){try{localStorage.removeItem(recommendationCacheKey)}catch{}}
export function appendResearch(old:ResearchHit[],incoming:ResearchHit[]) {
 const seen=new Set(old.map(p=>p.id));return [...old,...incoming.filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true})]
}

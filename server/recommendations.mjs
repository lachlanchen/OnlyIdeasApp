import {downloadPublic} from './network.mjs';
import {parseOpenAlex} from './research-indexes.mjs';
import {requireValue} from './domain.mjs';

// Exact journal identities resolved from their ISSNs on 2026-10-24. This is an
// editorial starting shelf, not an impact-factor score or a search restriction.
export const recommendationJournals = [
 ['S137773608','Nature'], ['S3880285','Science'], ['S110447773','Cell'],
 ['S125754415','Proceedings of the National Academy of Sciences'],
 ['S4210197940','Optica'], ['S120392215','Nature Photonics'],
 ['S127827428','Nature Methods'], ['S2764624792','Nature Biomedical Engineering'],
 ['S64187185','Nature Communications'], ['S2737427234','Science Advances'],
 ['S2498964232','Light Science & Applications'], ['S106963461','Nature Biotechnology'],
 ['S203256638','Nature Medicine'],
];
const journalIDs = new Set(recommendationJournals.map(([id])=>id));
const lanes = [
 {name:'Imaging',terms:['imaging','microscopy','tomography','holography','hyperspectral'],match:/\b(imaging|microscop\w*|tomograph\w*|holograph\w*|hyperspectral)\b/i},
 {name:'Optics',terms:['optical','optics','photonic','photonics','metasurface','laser'],match:/\b(optical|optics|photonic\w*|metasurface\w*|laser\w*)\b/i},
 {name:'Biomedicine',terms:['biomedical','organoid','cellular','cancer','neural','neuron','therapeutic','tissue','clinical','diagnostic','proteomics'],match:/\b(biomedical|organoid\w*|cellular|cancer\w*|neural|neuron\w*|therapeutic\w*|tissue\w*|clinical|diagnostic\w*|proteomic\w*)\b/i},
];
export const recommendationPolicy='english-imaging-optics-biomedicine-v1';

export function usefulRecommendation(p,now=new Date()) {
 if(!journalIDs.has(p.journalId)||p.language!=='en'||p.retracted||!p.openAccess||!['article','review'].includes(p.type))return false;
 const title=String(p.title||'').trim(),letters=title.match(/[a-z]/gi)||[];
 if(title.length<20||title.length>300||letters.length<12)return false;
 if(letters.filter(c=>c===c.toUpperCase()).length/letters.length>.9)return false;
 if(/^(?:publisher |author )?(?:correction|erratum|corrigendum|retraction|retracted|editorial|cover|contents|index to)\b/i.test(title))return false;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(p.publicationDate||'')||p.publicationDate>now.toISOString().slice(0,10))return false;
 return lanes.some(l=>l.match.test(title));
}

export function balanceRecommendations(groups,limit=12) {
 const cursors=groups.map(()=>0),seen=new Set(),journals=new Map(),papers=[];
 // Alternate subjects; no single journal can occupy more than three cards.
 while(papers.length<limit){
  let added=false;
  for(let i=0;i<groups.length&&papers.length<limit;i++){
   while(cursors[i]<groups[i].length){
    const p=groups[i][cursors[i]++],key=p.doi?.toLowerCase()||p.source||p.id;
    if(seen.has(key)||(journals.get(p.journalId)||0)>=3)continue;
    seen.add(key);journals.set(p.journalId,(journals.get(p.journalId)||0)+1);papers.push(p);added=true;break;
   }
  }
  if(!added)break;
 }
 return papers.sort((a,b)=>b.publicationDate.localeCompare(a.publicationDate));
}

export async function queryRecommendations({page=1}={},download=downloadPublic,{timeout=10000}={}) {
 requireValue(Number.isInteger(page)&&page>=1&&page<=100,'Refine the search to see more papers.');
 const controller=new AbortController(),deadline=Date.now()+timeout,today=new Date().toISOString().slice(0,10);
 let expire;const expired=new Promise((_,reject)=>{expire=reject});
 const timer=setTimeout(()=>{const error=Error('Recommendation index deadline');controller.abort(error);expire(error)},timeout);
 try {
  const results=await Promise.allSettled(lanes.map(async lane=>{
   const filters=['primary_location.source.id:'+Array.from(journalIDs).join('|'),'language:en','type:article|review','is_oa:true','is_retracted:false',
    'from_publication_date:'+String(new Date().getUTCFullYear()-2)+'-01-01','to_publication_date:'+today,'title.search:'+lane.terms.join('|')];
   const url=new URL('https://api.openalex.org/works');
   url.search=new URLSearchParams({filter:filters.join(','),sort:'publication_date:desc',per_page:'30',page:String(page),
    select:'id,title,language,is_retracted,authorships,publication_year,publication_date,primary_topic,primary_location,best_oa_location,locations,abstract_inverted_index,doi,type,open_access'});
   const bytes=await Promise.race([download(url.href,{maxBytes:3_500_000,timeout,deadline,signal:controller.signal}),expired]);
   const data=JSON.parse(bytes.toString());
   return {papers:parseOpenAlex(data).filter(p=>usefulRecommendation(p)&&lane.match.test(p.title)),hasMore:page*30<(data.meta?.count||0)};
  }));
  requireValue(results.some(r=>r.status==='fulfilled'),'Research recommendations are temporarily unavailable. Try again shortly.',503);
  const papers=balanceRecommendations(results.map(r=>r.status==='fulfilled'?r.value.papers:[]));
  return {papers,nextPage:page<12&&results.some(r=>r.status==='fulfilled'&&r.value.hasMore)?page+1:null,
   focused:true,recommendationPolicy,interests:lanes.map(l=>l.name),sources:['openalex'],
   unavailable:results.some(r=>r.status==='rejected')?['openalex']:[]};
 } finally {clearTimeout(timer)}
}

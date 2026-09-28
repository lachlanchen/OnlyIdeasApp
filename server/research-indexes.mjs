import { readFileSync } from 'node:fs';
import { downloadPublic } from './network.mjs';
import { requireValue,hash } from './domain.mjs';
import {queryCrossref} from './crossref.mjs';
import {rankResearch,doiIn} from './research-ranking.mjs';
export const taxonomy=JSON.parse(readFileSync(new URL('./disciplines.json',import.meta.url)));
const plain=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(Number(n),0x10ffff))).replace(/\s+/g,' ').trim();
const field=(entry,name)=>plain(entry.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`))?.[1]);
const safeURL=v=>{try{const u=new URL(v);if(u.protocol==='http:')u.protocol='https:';return u.protocol==='https:'&&!u.username&&!u.password&&!u.port?u.href:''}catch{return ''}};
const last=v=>String(v||'').split('/').at(-1);
export function parseArxiv(xml) {
 return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0,30).flatMap(([,e])=>{
  const id=field(e,'id').split('/abs/')[1];if(!id||!/^[a-zA-Z0-9.\/-]+$/.test(id))return [];
  const category=e.match(/<arxiv:primary_category[^>]*term="([^"]+)"/)?.[1]||e.match(/<category[^>]*term="([^"]+)"/)?.[1];
  const primary=taxonomy.arxiv.find(d=>d.children.some(c=>c.id===category)),secondary=primary?.children.find(c=>c.id===category);
  const source=`https://arxiv.org/abs/${id}`;
  return [{id:hash(source).slice(0,24),title:field(e,'title').slice(0,300),authors:[...e.matchAll(/<author>([\s\S]*?)<\/author>/g)].map(([,a])=>field(a,'name')).join(', ').slice(0,500),summary:field(e,'summary').slice(0,1800),pdfUrl:`https://arxiv.org/pdf/${id}`,source,year:field(e,'published').slice(0,4),publicationDate:field(e,'published').slice(0,10),doi:field(e,'arxiv:doi'),journal:field(e,'arxiv:journal_ref'),discipline:primary?.name||'',subdiscipline:secondary?.name||category||'',disciplineId:primary?.id||'',subdisciplineId:category||'',index:'arxiv',type:'preprint',metadataSource:source}];
 });
}
export function parseOpenAlex(data,repository,includeMetadata=false) {
 return (data.results||[]).slice(0,30).flatMap(p=>{
  const locations=[p.best_oa_location,...(p.locations||[])].filter(l=>l&&(!repository||last(l.source?.id)===repository));
  const loc=locations.find(l=>l.is_oa!==false&&safeURL(l.pdf_url));
  const landing=loc||locations.find(l=>l.is_oa)||(!repository?(p.primary_location||p.best_oa_location):null);
  const openAccess=!!(p.open_access?.is_oa||locations.some(l=>l.is_oa));
  if(!p.title||(!includeMetadata&&(!landing||!openAccess))||(repository&&!landing))return [];
  const source=safeURL(landing?.landing_page_url)||safeURL(p.doi)||safeURL(p.id);if(!source)return [];
  const words=[];for(const [word,positions]of Object.entries(p.abstract_inverted_index||{}))for(const pos of positions)if(Number.isInteger(pos)&&pos>=0&&pos<400)words[pos]=word;
  const topic=p.primary_topic,venue=p.primary_location?.source;
  return [{id:hash(p.id).slice(0,24),title:plain(p.title).slice(0,300),authors:(p.authorships||[]).slice(0,12).map(a=>plain(a.author?.display_name)).filter(Boolean).join(', ').slice(0,500),summary:words.join(' ').slice(0,1800),pdfUrl:loc?safeURL(loc.pdf_url):'',downloadSources:[...new Set(locations.filter(l=>l.is_oa===true).map(l=>safeURL(l.pdf_url)).filter(Boolean))].slice(0,4),source,year:String(p.publication_year||''),publicationDate:p.publication_date||'',journal:venue?.type==='journal'?plain(venue.display_name):'',journalId:venue?.type==='journal'?last(venue.id):'',doi:String(p.doi||'').replace(/^https?:\/\/(?:dx\.)?doi.org\//,''),discipline:plain(topic?.field?.display_name),subdiscipline:plain(topic?.subfield?.display_name),disciplineId:last(topic?.field?.id),subdisciplineId:last(topic?.subfield?.id),index:'openalex',type:p.type||'',metadataSource:p.id,openAccess}];
 });
}
export function searchOptions(raw={}) {
 const source=['all','openalex','arxiv'].includes(raw.source)?raw.source:'all';
 const tree=taxonomy[source==='arxiv'?'arxiv':'openalex'];
 const field=String(raw.discipline||''),sub=String(raw.subdiscipline||'');
 requireValue(!field||tree.some(d=>d.id===field),'Choose a discipline.');
 requireValue(!sub||tree.some(d=>(!field||d.id===field)&&d.children.some(c=>c.id===sub)),'Choose a secondary discipline.');
 const year=v=>{if(!v)return '';requireValue(/^\d{4}$/.test(String(v))&&+v>=1800&&+v<=new Date().getUTCFullYear(),'Choose a valid publication year.');return String(v)};
 const from=year(raw.from),to=year(raw.to);requireValue(!from||!to||from<=to,'The start year must precede the end year.');
 const page=Number(raw.page||1);requireValue(Number.isInteger(page)&&page>=1&&page<=100,'Refine the search to see more papers.');
 return {q:String(raw.q||'').trim().slice(0,250),source,discipline:field,subdiscipline:sub,from,to,journal:String(raw.journal||'').trim().slice(0,120),sort:raw.sort==='latest'||!raw.q?'latest':'relevance',page};
}
// One outbound arXiv request at a time, at least three seconds apart.
let arxivTail=Promise.resolve(),lastArxiv=0;
async function arxivDownload(url,download){const run=arxivTail.catch(()=>{}).then(async()=>{const delay=Math.max(0,3100-(Date.now()-lastArxiv));if(delay)await new Promise(r=>setTimeout(r,delay));lastArxiv=Date.now();return download(url,{maxBytes:2_000_000,timeout:15000})});arxivTail=run.then(()=>{},()=>{});return run}
export async function queryArxiv(o,download=downloadPublic) {
 const terms=o.q.replace(/[^\p{L}\p{N}\s-]/gu,' ').trim().split(/\s+/).filter(Boolean).slice(0,14);
 const clauses=[];if(terms.length)clauses.push(terms.map(t=>`all:${t}`).join(' AND '));
 if(o.subdiscipline)clauses.push(`cat:${o.subdiscipline}`);
 else if(o.discipline){const d=taxonomy.arxiv.find(x=>x.id===o.discipline);if(d)clauses.push('('+d.children.map(c=>`cat:${c.id}`).join(' OR ')+')')}
 if(o.journal)clauses.push('jr:"'+o.journal.replace(/[^\p{L}\p{N}\s.-]/gu,' ')+'"');
 if(o.from||o.to)clauses.push(`submittedDate:[${o.from||'1991'}01010000 TO ${o.to||new Date().getUTCFullYear()}12312359]`);
 if(!clauses.length)clauses.push('all:*');
 const url=new URL('https://export.arxiv.org/api/query');url.search=new URLSearchParams({search_query:clauses.join(' AND '),...(o.page>1?{start:String((o.page-1)*12)}:{}),max_results:'12',...(o.sort==='latest'?{sortBy:'submittedDate',sortOrder:'descending'}:{})}).toString().replaceAll('%3A',':');
 try {const xml=(await arxivDownload(url.href,download)).toString(),papers=parseArxiv(xml),total=Number(xml.match(/<opensearch:totalResults[^>]*>(\d+)</)?.[1]||0);return {papers,hasMore:o.page*12<total};}
 catch(error){
  // OpenAlex also indexes arXiv itself. Preserve repository restriction; don't
  // silently approximate arXiv category or journal filters in another taxonomy.
  if(o.discipline||o.subdiscipline||o.journal)throw error;
  return {...await queryOpenAlex({...o,repository:'S4306400194'},download),fallback:'openalex'};
 }
}
// Retry one temporary index failure; never loop on access denials or rate limits.
async function indexBytes(url,options,download){
 for(let attempt=0;;attempt++){try{return await download(url,options)}catch(e){if(attempt||![500,502,503,504].includes(e.upstreamStatus))throw e;await new Promise(r=>setTimeout(r,300));}}
}
export async function queryOpenAlex(o,download=downloadPublic) {
 const filters=[...(!o.q?['is_oa:true','has_pdf_url:true']:[]),'type:article|preprint|review','to_publication_date:'+new Date().toISOString().slice(0,10)];
 if(o.repository)filters.push('locations.source.id:'+o.repository);
 if(o.discipline)filters.push('primary_topic.field.id:'+o.discipline);
 if(o.subdiscipline)filters.push('primary_topic.subfield.id:'+o.subdiscipline);
 if(o.from||o.to)filters.push('publication_year:'+(o.from||'1800')+'-'+(o.to||new Date().getUTCFullYear()));
 if(o.journal){const url=new URL('https://api.openalex.org/sources');url.search=new URLSearchParams({search:o.journal,filter:'type:journal',per_page:'10',select:'id,display_name'});const matches=JSON.parse((await indexBytes(url.href,{maxBytes:500_000,timeout:10000},download)).toString()).results||[];if(!matches.length)return {papers:[],hasMore:false};filters.push('primary_location.source.id:'+matches.map(s=>last(s.id)).filter(s=>/^S\d+$/.test(s)).join('|'))}
 const url=new URL('https://api.openalex.org/works');url.search=new URLSearchParams({filter:filters.join(','),per_page:'12',page:String(o.page),select:'id,title,authorships,publication_year,publication_date,primary_topic,primary_location,best_oa_location,locations,abstract_inverted_index,doi,type,open_access',...(o.q?{search:o.q}:{}),...(o.sort==='latest'?{sort:'publication_date:desc'}:{})});
 const data=JSON.parse((await indexBytes(url.href,{maxBytes:3_500_000,timeout:10000},download)).toString());return {papers:parseOpenAlex(data,o.repository,!!o.q),hasMore:o.page*12<(data.meta?.count||0)};
}
export async function searchIndexes(raw={},download=downloadPublic) {
 const o=searchOptions(raw);const names=o.source==='arxiv'?['arxiv']:o.source==='openalex'||o.discipline||o.subdiscipline?['openalex']:o.q?(doiIn(o.q)?['crossref','openalex']:['crossref','openalex','arxiv']):o.journal?['openalex']:['openalex','arxiv'];
 const results=await Promise.allSettled(names.map(n=>n==='arxiv'?queryArxiv(o,download):n==='crossref'?queryCrossref(o,download):queryOpenAlex(o,download)));
 const papers=[],seen=new Set(),unavailable=[];let hasMore=false,ok=0;
 results.forEach((r,i)=>{if(r.status==='rejected'){unavailable.push(names[i]);return}ok++;if(r.value.fallback)unavailable.push(names[i]);hasMore ||= r.value.hasMore;for(const p of r.value.papers){const key=p.doi?.toLowerCase()||p.source;if(!seen.has(key)){papers.push(p);seen.add(key)}else{const index=papers.findIndex(x=>(x.doi?.toLowerCase()||x.source)===key);if(index>=0&&p.pdfUrl&&!papers[index].pdfUrl)papers[index]={...papers[index],...p};}}});
 requireValue(ok,'Research indexes are temporarily unavailable. Try again shortly.',503);
 if(o.sort==='latest')papers.sort((a,b)=>b.publicationDate.localeCompare(a.publicationDate));
 return {papers:o.sort==='relevance'?rankResearch(papers,o.q):papers,nextPage:hasMore&&o.page<100?o.page+1:null,unavailable,sources:names};
}

import {libraryCards,matchLibrary,matchesFilters} from './library-search.mjs';
import { searchIndexes, searchOptions, taxonomy } from './research-indexes.mjs';
import { hash,requireValue } from './domain.mjs';
import { recoveryJob } from './import-recovery.mjs';
import { reusablePaper } from './import-reuse.mjs';
import {interestTopics} from './research-focus.mjs';
import {researchScore,arxivIn,doiIn} from './research-ranking.mjs';
import {queryRecommendations,recommendationPolicy} from './recommendations.mjs';
export function createDiscovery(store,{search=searchIndexes,recommend=queryRecommendations}={}) {
 const db=store.db;
 db.exec(`CREATE TABLE IF NOT EXISTS discovery_pages(key TEXT PRIMARY KEY,body TEXT NOT NULL,updated INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS discovery_items(id TEXT PRIMARY KEY,body TEXT NOT NULL,updated INTEGER NOT NULL);`);
 db.exec('CREATE TABLE IF NOT EXISTS paper_items(id TEXT PRIMARY KEY,body TEXT NOT NULL)');
 const pending=new Map();let requests=[];
 const pageData=async(key,refresh,ttl,load,fallback)=>{
  const row=db.prepare('SELECT * FROM discovery_pages WHERE key=?').get(key);
  if(row&&Date.now()-row.updated<(refresh==='1'?60_000:ttl))return JSON.parse(row.body);
  requireValue(pending.has(key)||pending.size<4,'Research search is busy. Try again shortly.',429);
  if(!pending.has(key))pending.set(key,(async()=>{
   requests=requests.filter(t=>Date.now()-t<3600_000);requireValue(requests.length<80,'Research search is busy. Try again shortly.',429);requests.push(Date.now());
   try {
    const result=await load(),now=Date.now();
    // Do not turn a partial response into a fresh, apparently complete page.
    if(result.papers.length||!result.unavailable?.length){
     db.prepare('INSERT OR REPLACE INTO discovery_pages VALUES(?,?,?)').run(key,JSON.stringify(result),now);
     for(const p of result.papers)db.prepare('INSERT OR REPLACE INTO discovery_items VALUES(?,?,?)').run(p.id,JSON.stringify(p),now);
     db.prepare('DELETE FROM discovery_pages WHERE key NOT IN (SELECT key FROM discovery_pages ORDER BY updated DESC LIMIT 500)').run();
     db.prepare("DELETE FROM discovery_items WHERE id NOT IN (SELECT id FROM discovery_items ORDER BY updated DESC LIMIT 5000) AND NOT EXISTS (SELECT 1 FROM paper_items WHERE json_extract(body,'$.ref')='r-'||discovery_items.id)").run();
    } else if(row&&Date.now()-row.updated<7*86400_000)return {...JSON.parse(row.body),stale:true};
    return result;
   }catch(e){if(row&&Date.now()-row.updated<7*86400_000)return {...JSON.parse(row.body),stale:true};if(fallback)return fallback();throw e}
  })().finally(()=>pending.delete(key)));
  return pending.get(key);
 };
 const identify=(p,user)=>{const recovered=user?recoveryJob(store,user.id,'r:'+p.id):null;const existing=(recovered?.state==='completed'?store.paper(recovered.paperId):null)||reusablePaper(store,user?.id||'',{url:p.pdfUrl,sourcePage:p.source,metadata:p});const failed=user&&!existing?db.prepare("SELECT body FROM jobs WHERE owner=? AND state='failed' AND json_extract(body,'$.url')=? ORDER BY created DESC LIMIT 1").get(user.id,p.pdfUrl||p.source||''):null;const job=failed?JSON.parse(failed.body):null;const denied=job&&!job.pdfId&&(job.errorCode==='source_access_denied'||/HTTP (401|403)/.test(job.message||''));return {...p,...(existing?{paperId:existing.id}:{}),...(recovered&&recovered.state!=='failed'?{recoveryJobId:recovered.id}:{}),...(denied?{failedJobId:job.id,fetchUnavailable:'This repository blocks automatic PDF downloads. Open the source page or upload your PDF.'}:{})}};
 return {
 taxonomy,identify,
 item(id,user){const row=db.prepare('SELECT body FROM discovery_items WHERE id=?').get(id);requireValue(row,'Refresh the search and select a paper.',404);return identify(JSON.parse(row.body),user)},
 async find(raw,user){
  if(!String(raw.q||'').trim()&&(!raw.source||raw.source==='all')&&!raw.discipline&&!raw.subdiscipline&&!raw.journal&&!raw.from&&!raw.to&&raw.feed!=='all'){
   const topics=interestTopics(store,user),page=Number(raw.page||1);requireValue(Number.isInteger(page)&&page>=1&&page<=100,'Refine the search to see more papers.');
   if(topics.length){
    const selected=topics.slice((page-1)%Math.ceil(topics.length/2)*2,((page-1)%Math.ceil(topics.length/2)+1)*2),indexPage=Math.floor((page-1)/Math.ceil(topics.length/2))+1;
    const results=await Promise.allSettled(selected.map(q=>this.find({q,source:'all',sort:'latest',refresh:raw.refresh,page:indexPage,from:String(new Date().getUTCFullYear()-3)},user)));
    const groups=results.map((r,i)=>r.status==='fulfilled'?r.value.papers.filter(p=>researchScore(p,selected[i])>=4):[]),papers=[],seen=new Set();
    for(let i=0;i<12;i++)for(const group of groups){const p=group[i];if(!p)continue;const id=p.doi?.toLowerCase()||p.source||p.id;if(!seen.has(id)){seen.add(id);papers.push(p)}}
    papers.sort((a,b)=>String(b.publicationDate||b.year||'').localeCompare(String(a.publicationDate||a.year||'')));
    return {papers:papers.slice(0,12),focused:true,interests:topics,nextPage:page<12?page+1:null,unavailable:[...new Set(results.flatMap(r=>r.status==='fulfilled'?r.value.unavailable||[]:['research']))],stale:results.some(r=>r.status==='fulfilled'&&r.value.stale)};
   }
   // An editorial default is separate from a reader's saved interests and from
   // unrestricted explicit search. Never fall back to the old global firehose.
   const key=hash(JSON.stringify([recommendationPolicy,page]));
   const data=await pageData(key,raw.refresh,3600_000,()=>recommend({page}));
   return {...data,papers:data.papers.map(p=>identify(p,user))};
  }
  const o=searchOptions(raw),key=hash(JSON.stringify(['discovery-v6',o]));
  const data=await pageData(key,raw.refresh,o.q?600_000:3600_000,()=>search(o),o.q?()=>{
   const cached=db.prepare('SELECT body FROM discovery_items ORDER BY updated DESC LIMIT 2000').all().map(r=>JSON.parse(r.body)).filter(p=>matchesFilters(p,o));
   return {papers:matchLibrary(cached,o.q),nextPage:null,stale:true,unavailable:[o.source==='arxiv'?'arxiv':'openalex']};
  }:null);
  const exactArxiv=arxivIn(o.q),exactDOI=doiIn(o.q);
  const local=o.q&&o.page===1?matchLibrary(libraryCards(store,user).filter(p=>matchesFilters(p,o)),o.q).filter(p=>{
   if(exactArxiv){const id=arxivIn(p.source);return /v\d+$/.test(exactArxiv)?id===exactArxiv:id.replace(/v\d+$/,'')===exactArxiv;}
   return !exactDOI||doiIn(p.doi||p.source)===exactDOI;
  }):[];
  const online=data.papers.map(p=>identify(p,user));
  return {...data,papers:[...local,...online.filter(p=>!local.some(l=>l.paperId===p.paperId||l.source&&l.source===p.source))]};
 }
 };
}

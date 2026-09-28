import { searchIndexes, searchOptions, taxonomy } from './research-indexes.mjs';
import { hash,requireValue } from './domain.mjs';
import { recoveryJob } from './import-recovery.mjs';
import { reusablePaper } from './import-reuse.mjs';
export function createDiscovery(store,{search=searchIndexes}={}) {
 const db=store.db;
 db.exec(`CREATE TABLE IF NOT EXISTS discovery_pages(key TEXT PRIMARY KEY,body TEXT NOT NULL,updated INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS discovery_items(id TEXT PRIMARY KEY,body TEXT NOT NULL,updated INTEGER NOT NULL);`);
 db.exec('CREATE TABLE IF NOT EXISTS paper_items(id TEXT PRIMARY KEY,body TEXT NOT NULL)');
 const pending=new Map();let requests=[];
 const identify=(p,user)=>{const recovered=user?recoveryJob(store,user.id,'r:'+p.id):null;const existing=(recovered?.state==='completed'?store.paper(recovered.paperId):null)||reusablePaper(store,user?.id||'',{url:p.pdfUrl})||reusablePaper(store,user?.id||'',{url:p.source});const failed=user&&!existing?db.prepare("SELECT body FROM jobs WHERE owner=? AND state='failed' AND json_extract(body,'$.url')=? ORDER BY created DESC LIMIT 1").get(user.id,p.pdfUrl):null;const job=failed?JSON.parse(failed.body):null;const denied=job&&!job.pdfId&&(job.errorCode==='source_access_denied'||/HTTP (401|403)/.test(job.message||''));return {...p,...(existing?{paperId:existing.id}:{}),...(recovered&&recovered.state!=='failed'?{recoveryJobId:recovered.id}:{}),...(denied?{failedJobId:job.id,fetchUnavailable:'This repository blocks automatic PDF downloads. Open the source page or upload your PDF.'}:{})}};
 return {
 taxonomy,identify,
 item(id,user){const row=db.prepare('SELECT body FROM discovery_items WHERE id=?').get(id);requireValue(row,'Refresh the search and select a paper.',404);return identify(JSON.parse(row.body),user)},
 async find(raw,user){
  const o=searchOptions(raw),key=hash(JSON.stringify(o)),row=db.prepare('SELECT * FROM discovery_pages WHERE key=?').get(key);
  const ttl=o.q?600_000:3600_000;let data;
  if(row&&Date.now()-row.updated<ttl)data=JSON.parse(row.body);
  else {
   requireValue(pending.has(key)||pending.size<4,'Research search is busy. Try again shortly.',429);
   if(!pending.has(key))pending.set(key,(async()=>{
    requests=requests.filter(t=>Date.now()-t<3600_000);requireValue(requests.length<80,'Research search is busy. Try again shortly.',429);requests.push(Date.now());
    try {
     const result=await search(o),now=Date.now();
     db.prepare('INSERT OR REPLACE INTO discovery_pages VALUES(?,?,?)').run(key,JSON.stringify(result),now);
     for(const p of result.papers)db.prepare('INSERT OR REPLACE INTO discovery_items VALUES(?,?,?)').run(p.id,JSON.stringify(p),now);
     db.prepare('DELETE FROM discovery_pages WHERE key NOT IN (SELECT key FROM discovery_pages ORDER BY updated DESC LIMIT 500)').run();
     db.prepare("DELETE FROM discovery_items WHERE id NOT IN (SELECT id FROM discovery_items ORDER BY updated DESC LIMIT 5000) AND NOT EXISTS (SELECT 1 FROM paper_items WHERE json_extract(body,'$.ref')='r-'||discovery_items.id)").run();
     return result;
    }catch(e){if(row&&Date.now()-row.updated<7*86400_000)return {...JSON.parse(row.body),stale:true};throw e}
   })().finally(()=>pending.delete(key)));
   data=await pending.get(key);
  }
  return {...data,papers:data.papers.map(p=>identify(p,user))};
 }
 };
}

import {randomUUID,timingSafeEqual} from 'node:crypto';
import {AppError,hash,requireValue} from './domain.mjs';
import {extractWebArticle} from './web-article.mjs';

// No chats, account details, uploaded files, or provider credentials enter this queue.
export function retrievalURL(value) {
 try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&!/[?&](?:token|key|auth|signature|x-amz-credential|x-amz-signature)=/i.test(u.search)?u.href:'';} catch{return '';}
}
export function retrievalTask(job) {
 const doi=String(job.metadata?.doi||'').trim();
 const urls=[job.url,...(job.downloadSources||[]),job.sourcePage,...(/^10\.\d{4,9}\/\S+$/i.test(doi)?['https://doi.org/'+doi]:[])].map(retrievalURL).filter(Boolean);
 if(!(job.discoveryId&&String(job.metadata?.title||'').length>=12)&&!/^10\.\d{4,9}\/\S+$/i.test(doi)&&!urls.some(u=>/^https:\/\/(?:arxiv\.org\/(?:abs|pdf|html)\/|pmc\.ncbi\.nlm\.nih\.gov\/articles\/PMC)/.test(u)))return null;
 return {metadata:{title:String(job.metadata?.title||'').slice(0,500),doi:doi.slice(0,200)},urls:[...new Set(urls)].slice(0,6)};
}
export function initBrowserRetrieval(store) {
 store.db.exec(`CREATE TABLE IF NOT EXISTS browser_retrieval(id TEXT PRIMARY KEY,parent TEXT UNIQUE NOT NULL,owner TEXT NOT NULL,parent_lease TEXT NOT NULL,state TEXT NOT NULL,task TEXT NOT NULL,deadline INTEGER NOT NULL,lease TEXT,lease_until INTEGER,attempts INTEGER NOT NULL DEFAULT 0,result TEXT,bytes BLOB);
 CREATE TABLE IF NOT EXISTS browser_worker_status(id INTEGER PRIMARY KEY CHECK(id=1),seen INTEGER NOT NULL);`);
}
export function createBrowserRetrieval(store,config,{now=Date.now,pause=ms=>new Promise(r=>setTimeout(r,ms))}={}) {
 const enabled=()=>config.browserRetrieval?.enabled===true&&String(config.browserRetrieval?.token||'').length>=32;
 const row=id=>store.db.prepare('SELECT * FROM browser_retrieval WHERE id=?').get(id);
 const alive=r=>r&&r.deadline>now()&&store.active(r.owner)&&store.job(r.parent)?.state==='running'&&store.job(r.parent)?.lease===r.parent_lease;
 function prune(){
  for(const r of store.db.prepare('SELECT * FROM browser_retrieval').all())if(!alive(r))store.db.prepare('DELETE FROM browser_retrieval WHERE id=?').run(r.id);
 }
 function leased(id,lease){const r=row(id);requireValue(alive(r)&&r.state==='running'&&r.lease===lease&&r.lease_until>now(),'Retrieval lease expired.',409);return r;}
 return {
  authorized(req){const expected=config.browserRetrieval?.token||'';return enabled()&&timingSafeEqual(Buffer.from(hash(String(req.headers.authorization||'').replace(/^Bearer /,''))),Buffer.from(hash(expected)));},
  claim(){
   store.db.prepare('INSERT INTO browser_worker_status VALUES(1,?) ON CONFLICT(id) DO UPDATE SET seen=excluded.seen').run(now());prune();
   store.db.exec('BEGIN IMMEDIATE');try{
    const r=store.db.prepare("SELECT * FROM browser_retrieval WHERE state='queued' OR (state='running' AND lease_until<? AND attempts<2) ORDER BY deadline LIMIT 1").get(now());
    if(!r){store.db.exec('COMMIT');return {task:null};}
    const lease=randomUUID();store.db.prepare("UPDATE browser_retrieval SET state='running',lease=?,lease_until=?,attempts=attempts+1 WHERE id=?").run(lease,now()+60_000,r.id);store.db.exec('COMMIT');
    return {task:{id:r.id,lease,deadline:r.deadline,...JSON.parse(r.task)}};
   }catch(e){store.db.exec('ROLLBACK');throw e;}
  },
  heartbeat({id,lease}){leased(id,lease);store.db.prepare('UPDATE browser_retrieval SET lease_until=? WHERE id=?').run(now()+60_000,id);return {ok:true};},
  finish({id,lease,url,format,error},bytes=Buffer.alloc(0)){
   const r=leased(id,lease);
   if(error){store.db.prepare("UPDATE browser_retrieval SET state='failed',result=? WHERE id=?").run(JSON.stringify({error:'source_browser_unavailable'}),id);return {ok:true};}
   const source=retrievalURL(url);requireValue(source,'Invalid retrieval source.');requireValue(bytes.length>0&&bytes.length<=20_000_000,'Invalid retrieval size.');
   if(format==='pdf')requireValue(bytes.subarray(0,5).toString()==='%PDF-','Invalid PDF.');
   else {requireValue(format==='html'&&bytes.length<=2_000_000,'Invalid article format.');requireValue(extractWebArticle(bytes.toString(),source,JSON.parse(r.task).metadata),'The retrieved page is not the requested full article.');}
   store.db.prepare("UPDATE browser_retrieval SET state='completed',result=?,bytes=? WHERE id=?").run(JSON.stringify({url:source,format}),bytes,id);return {ok:true};
  },
  async retrieve(job){
   const task=retrievalTask(job);if(!enabled()||!task)return null;
   const seen=store.db.prepare('SELECT seen FROM browser_worker_status WHERE id=1').get()?.seen||0;if(now()-seen>45_000)return null;
   prune();const existing=store.db.prepare('SELECT * FROM browser_retrieval WHERE parent=?').get(job.id);
   const id=existing?.id||randomUUID(),deadline=existing?.deadline||now()+Math.min(config.browserRetrieval.timeoutMs||420_000,480_000);
   if(!existing)store.db.prepare("INSERT INTO browser_retrieval(id,parent,owner,parent_lease,state,task,deadline) VALUES(?,?,?,?,'queued',?,?)").run(id,job.id,job.owner,job.lease,JSON.stringify(task),deadline);
   job.message='Trying a real browser and alternate open-access copies…';store.saveJob(job);
   try{
    while(now()<deadline){
     const r=row(id);if(!alive(r))throw new AppError('This download was interrupted. Please retry.',409);
     if(r.state==='failed')return null;
     if(r.state==='completed'){
      const result=JSON.parse(r.result),bytes=Buffer.from(r.bytes);return {...result,bytes,browserAssisted:true,...(result.format==='html'?{article:extractWebArticle(bytes.toString(),result.url,job.metadata)}:{})};
     }
     await pause(1000);
    }
    return null;
   }finally{store.db.prepare('DELETE FROM browser_retrieval WHERE id=?').run(id);}
  }
 };
}

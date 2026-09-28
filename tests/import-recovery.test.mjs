import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.mjs';
import {createApp} from '../server/app.mjs';
import {createDiscovery} from '../server/discovery.mjs';
import {makePaper,hash} from '../server/domain.mjs';
import {completeRecovery} from '../server/import-recovery.mjs';
import {reusablePaper} from '../server/import-reuse.mjs';
import {downloadPaperPDF,citationPDFs} from '../server/paper-download.mjs';

test('contextual PDF recovery keeps source metadata, isolates accounts and deduplicates simultaneous uploads',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'oi-recovery-')),store=new Store(dir),origin='http://127.0.0.1:4182';
 const server=createApp(store,{origin,mathpix:{appKey:'fixture'},credits:{enabled:false}},{worker:false});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port,owner={id:'reader'},other={id:'other'},token=store.createSession(owner),otherToken=store.createSession(other);
 const card={id:'indexed-paper',title:'An actual indexed title',authors:'Researcher',source:'https://journal.org/article',pdfUrl:'https://journal.org/a.pdf',year:'2025'};
 store.db.prepare('INSERT INTO discovery_items VALUES(?,?,?)').run(card.id,JSON.stringify(card),Date.now());
 const failed={id:randomUUID(),owner:owner.id,kind:'import',dedupe:'old',state:'failed',message:'HTTP 403',errorCode:'source_access_denied',url:card.pdfUrl,sourcePage:card.source,discoveryId:card.id,sharing:'shared',metadata:card,created:Date.now()};store.saveJob(failed);
 const upload=async(headers={},as=token)=>{const r=await fetch(base+'/api/import',{method:'POST',headers:{Origin:origin,Cookie:'onlyideas-local='+as,'Content-Type':'application/pdf','X-Request-Id':randomUUID(),'X-Paper-Sharing':'shared','X-Paper-Match-Confirm':hash(Buffer.from('%PDF- fixture bytes')),...headers},body:Buffer.from('%PDF- fixture bytes')});return {status:r.status,...await r.json()}};
 try{
  assert.equal((await upload({'X-Recovery-Job-Id':failed.id},otherToken)).status,404);
  const uncertain=await upload({'X-Research-Id':card.id,'X-Paper-Match-Confirm':''});
  assert.equal(uncertain.status,409);assert.equal(uncertain.code,'pdf_match_uncertain');assert.equal(store.jobs(owner.id).length,1);
  assert.equal((await upload({'X-Research-Id':card.id,'X-Paper-Match-Confirm':'a-different-file'})).status,409);
  const results=await Promise.all([upload({'X-Research-Id':card.id}),upload({'X-Recovery-Job-Id':failed.id})]);
  assert.equal(results[0].status,202);assert.equal(results[1].status,202);assert.equal(results[0].job.id,results[1].job.id);
  const job=store.job(results[0].job.id);assert.equal(job.metadata.title,card.title);assert.equal(job.metadata.year,'2025');assert.equal(job.uploadSource,card.source);assert.equal(job.url,null);
  assert.equal(store.job(failed.id).state,'failed');
  const paper=makePaper({id:job.id,owner:owner.id,title:card.title,source:card.source,mmd:'Converted research'});paper.provenance={userSupplied:true,source:card.source};store.savePaper(paper);job.state='completed';job.paperId=paper.id;store.saveJob(job);completeRecovery(store,job);
  assert.equal(store.job(failed.id).paperId,paper.id);assert.equal(store.job(failed.id).state,'completed');
  assert.equal((await upload({'X-Recovery-Job-Id':failed.id})).job.id,failed.id);
  const discovery=createDiscovery(store);assert.equal(discovery.item(card.id,owner).paperId,paper.id);assert.equal(discovery.item(card.id,other).paperId,undefined);
  // Claimed source never poisons other readers' source identity, even if published.
  paper.visibility='public';store.savePaper(paper);assert.equal(reusablePaper(store,other.id,{url:card.source}),null);
 }finally{await new Promise(r=>server.close(r));store.close();rmSync(dir,{recursive:true,force:true})}
});

test('download retries transient errors, uses redirected citation base and does not retry denied sources',async()=>{
 let calls=[];const result=await downloadPaperPDF({url:'https://repo.org/entry'},{pause:async()=>{},download:async u=>{calls.push(u);if(calls.length===1){const e=Error('temporary');e.upstreamStatus=503;throw e}if(u==='https://repo.org/entry')return {url:'https://repo.org/moved/article/',bytes:Buffer.from('<meta name=citation_pdf_url content="paper.pdf">')};return Buffer.from('%PDF-found')}});
 assert.equal(result.url,'https://repo.org/moved/article/paper.pdf');assert.equal(calls.length,3);
 assert.deepEqual(citationPDFs('<meta content="a.pdf?x=1&#38;y=2" name=citation_pdf_url>','https://repo.org/'),['https://repo.org/a.pdf?x=1&y=2']);
 calls=[];await assert.rejects(downloadPaperPDF({url:'https://repo.org/denied',downloadSources:['https://repo.org/denied']},{download:async u=>{calls.push(u);const e=Error('denied');e.upstreamStatus=403;throw e}}),e=>e.code==='source_access_denied');assert.equal(calls.length,1);
});

test('exact OpenAlex work refresh can recover via an OA landing page without trusting a different work',async()=>{
 const job={url:'https://repo.org/old.pdf',metadata:{metadataSource:'https://openalex.org/W123'}};
 const result=await downloadPaperPDF(job,{download:async u=>{if(u.endsWith('old.pdf'))throw Error('HTTP 403');if(u.includes('api.openalex'))return Buffer.from(JSON.stringify({id:'https://openalex.org/W123',locations:[{is_oa:false,pdf_url:'https://wrong.org/p.pdf'},{is_oa:true,landing_page_url:'https://repo.org/article'}]}));if(u.endsWith('/article'))return Buffer.from('<meta name="citation_pdf_url" content="/new.pdf">');assert.equal(u,'https://repo.org/new.pdf');return Buffer.from('%PDF-new')}});
 assert.equal(result.url,'https://repo.org/new.pdf');
});

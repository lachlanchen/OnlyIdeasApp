import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../server/store.mjs';
import {createApp} from '../server/app.mjs';
import {createBrowserRetrieval,retrievalTask,retrievalURL} from '../server/browser-retrieval.mjs';
import {downloadPaperPDF} from '../server/paper-download.mjs';
import {repositoryCandidates} from '../server/retrieval-sources.mjs';
import {acceptedBrowserResult,retrieveWithBrowser} from '../worker/retrieval-worker.mjs';
import {publicTarget,publicAddress} from '../worker/browser/public-proxy.mjs';
const config={browserRetrieval:{enabled:true,token:'r'.repeat(40)}};
const job={id:'job',owner:'owner',kind:'import',dedupe:'a',state:'running',lease:'parent-lease',created:1,url:'https://example.org/paper.pdf',metadata:{title:'A specific study about organoid imaging',doi:'10.1234/example'}};
function fixture(t){const dir=mkdtempSync(join(tmpdir(),'oi-browser-')),store=new Store(dir);store.saveJob({...job});t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});return store;}
test('fallback follows cheap attempts and an immediate PDF never starts a browser',async()=>{
 let browser=0;const result=await downloadPaperPDF({url:job.url},{download:async()=>Buffer.from('%PDF-ok'),browserFallback:async()=>{browser++;}});assert.equal(result.bytes.toString(),'%PDF-ok');assert.equal(browser,0);
 const recovered=await downloadPaperPDF({url:job.url},{download:async()=>{throw Error('HTTP 403');},browserFallback:async()=>{browser++;return {bytes:Buffer.from('%PDF-browser'),url:job.url};}});assert.equal(recovered.bytes.toString(),'%PDF-browser');assert.equal(browser,1);
});
test('queue carries only bibliographic data, requires its own token, consumes bytes once',async t=>{
 const store=fixture(t),r=createBrowserRetrieval(store,config,{pause:async()=>{const {task}=r.claim();assert.deepEqual(Object.keys(task).sort(),['deadline','id','lease','metadata','urls']);assert.throws(()=>r.finish({...task,lease:'wrong',format:'pdf',url:job.url},Buffer.from('%PDF-valid')));r.heartbeat(task);r.finish({...task,format:'pdf',url:job.url},Buffer.from('%PDF-valid'));}});
 assert.equal(r.authorized({headers:{authorization:'Bearer chat-token'}}),false);r.claim();
 const result=await r.retrieve({...job,privateNote:'never send',attachments:['private.pdf']});assert.equal(result.browserAssisted,true);assert.equal(store.db.prepare('select count(*) n from browser_retrieval').get().n,0);assert.equal(result.bytes.toString(),'%PDF-valid');
});
test('worker leases survive reclaim but old leases and deleted accounts cannot return results',async t=>{
 const store=fixture(t);let now=10000,old,done=false;const r=createBrowserRetrieval(store,config,{now:()=>now,pause:async()=>{
  if(done)return;done=true;old=r.claim().task;now+=61000;const next=r.claim().task;assert.notEqual(old.lease,next.lease);assert.throws(()=>r.heartbeat(old));
  store.db.prepare('insert into deleted_accounts values(?)').run(job.owner);assert.throws(()=>r.finish({...next,format:'pdf',url:job.url},Buffer.from('%PDF-valid')));
 }});r.claim();await assert.rejects(r.retrieve({...job}),/interrupted/);assert.equal(store.db.prepare('select count(*) n from browser_retrieval').get().n,0);
});
test('disabled or offline fallback is immediate and tasks exclude credential URLs',async t=>{
 const store=fixture(t);assert.equal(await createBrowserRetrieval(store,config).retrieve({...job}),null);
 assert.equal(await createBrowserRetrieval(store,{}).retrieve({...job}),null);
 assert.equal(retrievalURL('https://example.org/a?token=secret'),'');assert.equal(retrievalURL('http://example.org/a'),'');assert.equal(retrievalTask({url:'https://example.org/private-file'}),null);
});
test('browser egress rejects private, mapped, rebinding and non-HTTPS targets before connecting',async()=>{
 for(const address of ['127.0.0.1','10.1.2.3','169.254.169.254','::1','::ffff:192.168.0.1','fc00::1','0.0.0.0'])assert.equal(publicAddress(address),false,address);
 await assert.rejects(publicTarget('localhost:443',async()=>[{address:'127.0.0.1',family:4}]));
 await assert.rejects(publicTarget('example.org:443',async()=>[{address:'8.8.8.8',family:4},{address:'10.0.0.1',family:4}]));
 await assert.rejects(publicTarget('example.org:22'));await assert.rejects(publicTarget('user:pass@example.org:443'));
 assert.equal((await publicTarget('example.org:443',async()=>[{address:'8.8.8.8',family:4}])).address,'8.8.8.8');
});
test('repository APIs accept exact DOI public PDF and reject mismatched records',async()=>{
 const task={metadata:{doi:'10.5281/zenodo.123'},urls:[]};const data={doi:task.metadata.doi,metadata:{access_right:'open'},files:[{key:'paper.pdf',links:{self:'https://zenodo.org/api/file.pdf'}}]};
 assert.deepEqual(await repositoryCandidates(task,{download:async()=>Buffer.from(JSON.stringify(data))}),['https://zenodo.org/api/file.pdf']);data.doi='10.5281/zenodo.124';assert.deepEqual(await repositoryCandidates(task,{download:async()=>Buffer.from(JSON.stringify(data))}),[]);
});
test('browser result and Codex candidates must identify the requested paper exactly',async()=>{
 const bytes=Buffer.from('%PDF-valid').toString('base64');const good={url:job.url,format:'pdf',bytes,text:job.metadata.title+'\n'+('Research details '.repeat(30))};
 assert.ok(acceptedBrowserResult({result:good},job.metadata));assert.equal(acceptedBrowserResult({result:{...good,text:'A different study about bears. '.repeat(60)}},job.metadata),null);
 let calls=0;const {result,reports}=await retrieveWithBrowser({metadata:job.metadata,urls:[job.url]},{codex:{enabled:true}},{candidates:async()=>[],research:async()=>[{doi:'10.1234/wrong',pdfUrl:'https://wrong.org/p.pdf'},{doi:job.metadata.doi,pdfUrl:'https://right.org/p.pdf'}],browser:async task=>{calls++;if(calls===1)return {result:null};assert.deepEqual(task.urls,['https://right.org/p.pdf']);return {result:good};}});assert.ok(result);assert.equal(calls,2);assert.equal(reports.at(-1).verifiedCandidates,1);
});
test('HTTP retrieval endpoint never accepts the ordinary chat token',async t=>{
 const store=fixture(t),server=createApp(store,{...config,agentWorkerToken:'chat-secret'},{worker:false});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const url='http://127.0.0.1:'+server.address().port+'/api/worker/retrieval/claim';
 assert.equal((await fetch(url,{method:'POST',headers:{Authorization:'Bearer chat-secret'}})).status,401);
 assert.equal((await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+config.browserRetrieval.token}})).status,200);
});

test('fast full text normalizes stale PMC PDF URLs before costly conversion',async()=>{
 const seen=[];const paragraphs='<p>'+('Measurements of calibrated cerebral organoids show consistent signals. '.repeat(8))+'</p>';
 const article='<html><title>A specific study about organoid imaging</title><article><h1>A specific study about organoid imaging</h1><h2>Methods</h2>'+paragraphs.repeat(12)+'</article></html>';
 const found=await downloadPaperPDF({...job,url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC1234/pdf/main.pdf'},{allowHTML:true,download:async url=>{seen.push(url);return Buffer.from(article);}});
 assert.deepEqual(seen,['https://pmc.ncbi.nlm.nih.gov/articles/PMC1234/']);assert.equal(found.format,'html');
});

test('HTTPS downloader accepts complete 203 but rejects partial 206 responses',async t=>{
 const {default:https}=await import('node:https'),{EventEmitter}=await import('node:events'),{downloadPublic}=await import('../server/network.mjs');let status=203;
 t.mock.method(https,'get',(_url,options,callback)=>{const req=new EventEmitter();req.destroy=e=>{if(e)req.emit('error',e);req.emit('close');};queueMicrotask(()=>{const res=new EventEmitter();res.statusCode=status;res.headers={};res.complete=true;res.resume=()=>{};callback(res);res.emit('data',Buffer.from('complete article'));res.emit('end');req.emit('close');});return req;});
 assert.equal((await downloadPublic('https://example.org/',{resolver:async()=>[{address:'8.8.8.8',family:4}]})).toString(),'complete article');status=206;
 await assert.rejects(downloadPublic('https://example.org/',{resolver:async()=>[{address:'8.8.8.8',family:4}]}),/206/);
});

test('verified TechRxiv version resolves a concept DOI but a different published DOI is excluded',async()=>{
 const metadata={doi:'10.36227/techrxiv.1234',title:'A specific study about organoid imaging'};let n=0;
 const {reports}=await retrieveWithBrowser({metadata,urls:['https://doi.org/'+metadata.doi]},{codex:{enabled:true}},{candidates:async()=>[],research:async()=>[{doi:metadata.doi+'.v1',title:metadata.title,pdfUrl:'https://repo.org/version1.pdf'},{doi:'10.2345/published',title:metadata.title,pdfUrl:'https://repo.org/different.pdf'}],browser:async task=>{if(n++)assert.deepEqual(task.urls,['https://repo.org/version1.pdf']);return {result:null};}});
 assert.equal(reports.at(-1).verifiedCandidates,1);
});

test('existing public transcript bypasses every retrieval and conversion path',async t=>{
 const {makePaper}=await import('../server/domain.mjs'),{mathpix}=await import('../server/providers.mjs');const store=fixture(t);
 const p=makePaper({id:'existing',owner:'another-reader',title:job.metadata.title,source:job.url,mmd:'Already converted paper'});p.visibility='public';store.savePaper(p);
 const result=await mathpix({...job},config,store);assert.equal(result.paperId,p.id);assert.equal(result.reused,true);assert.equal(store.db.prepare('select count(*) n from browser_retrieval').get().n,0);
});

test('Europe PMC lookup only uses an exact open-access DOI match',async()=>{
 const task={metadata:{doi:'10.1234/example'},urls:[]};
 const urls=await repositoryCandidates(task,{download:async url=>Buffer.from(JSON.stringify(url.includes('europepmc')?{resultList:{result:[{doi:'10.1234/other',isOpenAccess:'Y',pmcid:'PMC9'},{doi:task.metadata.doi,isOpenAccess:'N',pmcid:'PMC8'},{doi:task.metadata.doi,isOpenAccess:'Y',pmcid:'PMC7'}]}}:{}))});
 assert.deepEqual(urls,['https://pmc.ncbi.nlm.nih.gov/articles/PMC7/']);
});

test('Codex workers serialize across processes and recover a crashed lock holder without spending quota',async t=>{
 const {spawn}=await import('node:child_process'),{writeFile}=await import('node:fs/promises'),{codexResearch}=await import('../worker/codex-research.mjs'),{hash}=await import('../server/domain.mjs');
 const dir=mkdtempSync(join(tmpdir(),'oi-codex-lock-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const query='10.1234/lock-test',papers=[{doi:query,title:'Verified cached result'}];
 await writeFile(join(dir,'search-'+hash(query)+'.json'),JSON.stringify({day:new Date().toISOString().slice(0,10),papers}));
 const holder=spawn('/usr/bin/flock',['-F',join(dir,'research.flock'),process.execPath,'-e',"process.stdout.write('locked');process.stdin.resume()"],{stdio:['pipe','pipe','pipe']});
 await new Promise((resolve,reject)=>{holder.stdout.once('data',resolve);holder.once('error',reject);});let done=false;
 const result=codexResearch(query,{codex:{enabled:true,stateDir:dir,executable:'/does-not-run-because-cached'}}).then(v=>{done=true;return v;});
 await new Promise(r=>setTimeout(r,70));assert.equal(done,false);holder.kill('SIGKILL');assert.deepEqual(await result,papers);
 assert.deepEqual(await codexResearch(query,{codex:{enabled:true,stateDir:dir,executable:'/does-not-run-because-cached'}}),papers);
});

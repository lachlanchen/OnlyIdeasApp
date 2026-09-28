import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Worker} from 'node:worker_threads';
import {execFileSync} from 'node:child_process';
import {zipSync,strToU8} from 'fflate';
import {Store} from '../server/store.mjs';
import {makePaper} from '../server/domain.mjs';
import {requestArtifact,visibleArtifacts,translationChunks} from '../server/artifacts.mjs';
import {generateArtifact} from '../server/providers.mjs';
import {inspectAttachment,uploadAttachment,convertAttachment,attachment} from '../server/attachments.mjs';
import {createApp} from '../server/app.mjs';
import {respond} from '../worker/paper-agent.mjs';
const config={model:{name:'test-model',url:'https://model.example.test/chat'},mathpix:{appKey:'test',appId:'test'},agentWorkerToken:'test-worker'};
function fixture(){const dir=mkdtempSync(join(tmpdir(),'onlyideas-workflow-')),store=new Store(dir);return {dir,store,close(){store.close();rmSync(dir,{recursive:true,force:true})}}}
const enqueue=store=>(user,fields)=>store.saveJob({...fields,owner:user.id,created:Date.now(),state:'queued'});
const paper=(store,visibility='public',mmd='# Research\n\nA meaningful paragraph about wavefunctions and probabilities. $E=mc^2$\n\n![plot](figures/a.png)')=>store.savePaper({...makePaper({id:randomUUID(),owner:'author',title:'Real workflow fixture',language:'en',mmd}),visibility});

test('concurrent processes share one public translation, one lease and private subscriber lists',async()=>{
 const f=fixture();try{
  const p=paper(f.store);
  const workerCode=`const {parentPort,workerData}=require('node:worker_threads');(async()=>{const {Store}=await import(workerData.root+'/server/store.mjs');const {requestArtifact}=await import(workerData.root+'/server/artifacts.mjs');const s=new Store(workerData.dir);const job=requestArtifact(s,workerData.config,{id:workerData.user},s.paper(workerData.paper),{kind:'translation',language:'ja'});const claimed=s.claimJob();parentPort.postMessage({job:job.id,claimed:claimed?.id});s.close()})().catch(e=>{throw e})`;
  const results=await Promise.all(Array.from({length:12},(_,i)=>new Promise((res,rej)=>{const w=new Worker(workerCode,{eval:true,workerData:{dir:f.dir,root:resolve('.'),config,user:'reader-'+i,paper:p.id}});w.once('message',res);w.once('error',rej)})));
  assert.equal(new Set(results.map(r=>r.job)).size,1);assert.equal(results.filter(r=>r.claimed).length,1);
  assert.equal(f.store.db.prepare('SELECT count(*) n FROM jobs').get().n,1);
  assert.equal(f.store.jobs('outsider').length,0);assert.equal(f.store.jobs('reader-5').length,1);
  const job=f.store.job(results[0].job);f.store.saveJob({...job,leaseUntil:0});const second=new Store(f.dir);const claimed=second.claimJob();assert.notEqual(claimed.lease,job.lease);assert.equal(f.store.claimJob(),null);second.close();
  const renewed=makePaper({...p,mmd:p.mmd+'\n\nNew revision'});f.store.savePaper(renewed);
  const next=requestArtifact(f.store,config,{id:'reader-5'},renewed,{kind:'translation',language:'ja'});assert.notEqual(next.id,job.id);
 }finally{f.close()}
});

test('translation chunks preserve TeX, code and figures, reject loss/reordering and survive marker-like source',()=>{
 const math='\\begin{align}\na&=b\\\\\nc&=d\n\\end{align}';const original='# Heading\n\n'+('A research paragraph with $E=mc^2$ and words. '.repeat(320))+'\n\n'+math+'\n\n![Fig 1](figures/plot.png)\n\n```tex\n\\alpha\n```\n\nOriginal literal ⟦OI000001⟧.';
 const c=translationChunks(original);assert.ok(c.chunks.length>=3);assert.equal(c.chunks.map(x=>c.restore(x,x)).join(''),original);
 const marked=c.chunks.find(s=>s.includes(c.example));assert.throws(()=>c.restore(marked.replace(c.example,''),marked),/preserve every/);
 assert.throws(()=>c.restore(marked+c.example,marked),/preserve every/);
 assert.equal(c.chunks.map(x=>c.restore(x,x)).join('').includes(math),true);
});

test('long translation resumes durable chunks after provider failure and fences a replaced lease',async()=>{
 const f=fixture();try{
  const p=paper(f.store,'public',Array.from({length:8},(_,i)=>'## Section '+i+'\n\n'+('Prose with $x_i^2$ for section '+i+'. ').repeat(70)).join('\n\n'));
  const j=requestArtifact(f.store,config,{id:'reader'},p,{kind:'translation',language:'zh-Hans'});let job=f.store.claimJob(),calls=0;
  const provider=async(u,o)=>{calls++;if(calls===2)throw Error('temporary provider outage');return {choices:[{message:{content:JSON.parse(o.body).messages.at(-1).content}}]}};
  await assert.rejects(generateArtifact(job,config,f.store,provider),/outage/);
  const checkpoint=f.store.db.prepare('SELECT key,body FROM translation_pieces ORDER BY key').all();assert.ok(checkpoint.length>0);
  let resumed=0;await generateArtifact(job,config,f.store,async(u,o)=>{resumed++;return {choices:[{message:{content:JSON.parse(o.body).messages.at(-1).content}}]}});
  assert.ok(resumed>0);for(const cached of checkpoint)assert.deepEqual(f.store.db.prepare('SELECT key,body FROM translation_pieces WHERE key=?').get(cached.key),cached);
  assert.equal(visibleArtifacts(f.store,p,null).length,1);assert.match(visibleArtifacts(f.store,p,null)[0].text,/\$x_i\^2\$/);
  f.store.saveJob({...job,state:'completed',artifactId:job.id});assert.equal(requestArtifact(f.store,config,{id:'different-reader'},p,{kind:'translation',language:'zh-Hans'}).id,j.id);
  const other=requestArtifact(f.store,config,{id:'reader'},p,{kind:'translation',language:'ja'});job=f.store.claimJob();
  await assert.rejects(generateArtifact(job,config,f.store,async(u,o)=>{f.store.saveJob({...job,lease:'replacement'});return {choices:[{message:{content:JSON.parse(o.body).messages.at(-1).content}}]}}),/no longer active/);
  assert.equal(f.store.db.prepare('SELECT id FROM artifacts WHERE id=?').get(other.id),undefined);
 }finally{f.close()}
});

test('private artifacts stay private after the original is shared',async()=>{
 const f=fixture();try{const p=paper(f.store,'private');const j=requestArtifact(f.store,config,{id:'author'},p,{kind:'translation',language:'fr'});await generateArtifact(j,config,f.store,async(u,o)=>({choices:[{message:{content:JSON.parse(o.body).messages.at(-1).content}}]}));assert.equal(visibleArtifacts(f.store,p,{id:'author'}).length,1);assert.equal(visibleArtifacts(f.store,p,{id:'intruder'}).length,0);p.visibility='public';f.store.savePaper(p);assert.equal(visibleArtifacts(f.store,p,null).length,0);}finally{f.close()}
});

test('attachment validation rejects executable content, traversal, invalid UTF-8 and oversized images',()=>{
 for(const [bytes,name]of [[Buffer.from('MZ'),'payload.exe'],[Buffer.from('fake'),'wrong.pdf'],[Buffer.from([255,254]),'text.txt'],[Buffer.from('ok'),'../bad.txt'],[Buffer.from('fake'),'fake.png']])assert.throws(()=>inspectAttachment(bytes,name));
 const zip=zipSync({'[Content_Types].xml':strToU8('xml'),'word/document.xml':strToU8('xml'),'../x':strToU8('bad')});assert.throws(()=>inspectAttachment(Buffer.from(zip),'bad.docx'),/safe document/);
 const bomb=zipSync({'[Content_Types].xml':strToU8('xml'),'word/document.xml':new Uint8Array(8_000_001)});assert.throws(()=>inspectAttachment(Buffer.from(bomb),'big.docx'),/safe document/);
 assert.equal(inspectAttachment(Buffer.from('\\section{Hello}\n$x^2$'),'paper.tex').ext,'tex');
});

test('simultaneous attachments dedupe per owner, text becomes a private readable paper, deletion cannot resurrect data',async()=>{
 const f=fixture();try{
  const bytes=Buffer.from('# Personal notes\n\nA paragraph with $E=mc^2$.');const upload=user=>uploadAttachment(f.store,config,{id:user},bytes,'notes.md',enqueue(f.store));
  const a=await Promise.all(Array.from({length:8},()=>upload('alice')));assert.equal(new Set(a.map(x=>x.id)).size,1);const b=await upload('bob');assert.notEqual(a[0].id,b.id);
  assert.throws(()=>attachment(f.store,a[0].id,'bob'),/not found/);
  const job=f.store.job(a[0].id),result=await convertAttachment(job,config,f.store);f.store.saveJob({...job,...result,state:'completed'});
  assert.equal(attachment(f.store,job.id,'alice').state,'ready');assert.equal(f.store.paper(result.paperId).visibility,'private');assert.match(f.store.paper(result.paperId).mmd,/\$E=mc\^2\$/);assert.equal(existsSync(join(f.dir,'jobs',job.id,'source.md')),false);
  f.store.db.prepare('INSERT INTO deleted_accounts VALUES(?)').run('deleted');await assert.rejects(upload('deleted'),/no longer available/);
  assert.equal(f.store.db.prepare('SELECT count(*) n FROM attachments WHERE owner=?').get('deleted').n,0);
 }finally{f.close()}
});

test('DOCX conversion retains equations and embedded figure bytes without fetching links',async()=>{
 const f=fixture();try{
  const pandoc=process.env.ONLYIDEAS_TEST_PANDOC||'pandoc';
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=','base64');writeFileSync(join(f.dir,'figure.png'),png);
  writeFileSync(join(f.dir,'source.md'),'# Equation and figure\n\nA meaningful figure and formula. $E=mc^2$\n\n![Original figure]('+join(f.dir,'figure.png')+')');
  execFileSync(pandoc,[join(f.dir,'source.md'),'-o',join(f.dir,'source.docx')]);
  const a=await uploadAttachment(f.store,config,{id:'alice'},readFileSync(join(f.dir,'source.docx')),'science.docx',enqueue(f.store));const result=await convertAttachment(f.store.job(a.id),{...config,pandoc},f.store);const p=f.store.paper(result.paperId);
  assert.match(p.mmd,/mc\^\{?2/);assert.equal(p.assets.length,1);assert.deepEqual(readFileSync(join(f.dir,'papers',p.id,p.assets[0].path)),png);assert.match(p.mmd,/figures\/[a-f0-9]+\.png/);
 }finally{f.close()}
});

test('image OCR keeps the original image, reuses its saved result and blocks uncertain charged retries',async()=>{
 const f=fixture();try{
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=','base64');const a=await uploadAttachment(f.store,config,{id:'alice'},png,'equation.png',enqueue(f.store));const j=f.store.job(a.id);let calls=0;
  const result=await convertAttachment(j,config,f.store,{provider:async(u,o)=>{calls++;const b=JSON.parse(o.body);assert.equal(b.improve_mathpix,false);assert.match(b.src,/^data:image\/jpeg;base64,/);return {text:'Equation: $E=mc^2$'}}});assert.equal(calls,1);const p=f.store.paper(result.paperId);assert.equal(p.assets.length,1);assert.match(p.mmd,/Original image/);
  writeFileSync(join(f.dir,'jobs',j.id,'source.png'),png);await convertAttachment(f.store.job(j.id),config,f.store,{provider:async()=>{calls++;throw Error('must not call')}});assert.equal(calls,1);
  // A durable paper is sufficient to resume. Without it or an OCR receipt,
  // an uncertain provider submission must still never be sent a second time.
  f.store.db.prepare('DELETE FROM papers WHERE id=?').run(j.id);
  writeFileSync(join(f.dir,'jobs',j.id,'source.png'),png);const ambiguous={...j,ocrText:undefined,ocrResult:undefined};await assert.rejects(convertAttachment(ambiguous,config,f.store),/receipt is uncertain/);
 }finally{f.close()}
});

test('attachment chat waits for conversion, isolates documents, retains follow-up context and respects reader language',async()=>{
 const f=fixture(),origin='http://127.0.0.1:4182',app=createApp(f.store,{...config,origin},{worker:false});await new Promise(r=>app.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.address().port;
 const a=f.store.createSession({id:'alice',name:'Alice'}),b=f.store.createSession({id:'bob',name:'Bob'});
 const call=async(path,{token=a,method='GET',body,worker=false}={})=>{const r=await fetch(base+'/api'+path,{method,headers:{Origin:origin,...(worker?{Authorization:'Bearer '+config.agentWorkerToken}:{Cookie:'onlyideas-local='+token}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()}};
 try{
  const file=await uploadAttachment(f.store,config,{id:'alice'},Buffer.from('# Private\n\nWe measured 42 photons. $E=mc^2$'),'experiment.md',enqueue(f.store));
  const chat=(await call('/chats',{method:'POST',body:{}})).data.chat;
  assert.equal((await call('/attachments/'+file.id,{token:b})).status,404);
  assert.equal((await call('/chats/'+chat.id+'/messages',{method:'POST',body:{text:'Explain this result',attachments:[file.id],language:'ja'}})).status,200);
  const claim=()=>call('/worker/claim',{method:'POST',body:{},worker:true});assert.equal((await claim()).data.task,null);
  const j=f.store.job(file.id);const r=await convertAttachment(j,config,f.store);f.store.saveJob({...j,...r,state:'completed'});
  const task=(await claim()).data.task;assert.equal(task.documents.length,1);assert.match(task.documents[0].text,/42 photons/);assert.equal(task.language,'ja');assert.equal((await claim()).data.task,null);
  const result=await respond(task,{model:config.model},()=>{}, {provider:async(u,o)=>{const body=JSON.parse(o.body);assert.match(body.messages[0].content,/日本語/);assert.match(body.messages.at(-1).content,/untrusted/);assert.match(body.messages.at(-1).content,/42 photons/);return {choices:[{message:{content:'42個の光子を測定しました。'}}]}}});
  await call('/worker/result',{method:'POST',worker:true,body:{id:task.id,lease:task.lease,result}});
  assert.equal((await call('/chats/'+chat.id,{token:b})).status,404);
  await call('/chats/'+chat.id+'/messages',{method:'POST',body:{text:'And the equation?',language:'en'}});assert.equal((await claim()).data.task.documents.length,1);
  const p=paper(f.store,'private');assert.equal((await call('/papers/'+p.id+'/assist',{method:'POST',body:{kind:'translation',language:'ja'}})).status,404);
 }finally{await new Promise(r=>app.close(r));f.close()}
});

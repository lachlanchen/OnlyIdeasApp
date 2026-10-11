import {repositoryCandidates} from '../server/retrieval-sources.mjs';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,rm,readFile,mkdir,stat,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {codexResearch} from './codex-research.mjs';
import {extractWebArticle} from '../server/web-article.mjs';
import {checkPaperIdentity} from '../server/pdf-identity.mjs';
import {retrievalURL} from '../server/browser-retrieval.mjs';
import {downloadPublic} from '../server/network.mjs';
const exec=promisify(execFile),sleep=ms=>new Promise(r=>setTimeout(r,ms));
export function acceptedBrowserResult(output,metadata){
 const candidates=output.result?.candidates||[output.result];
 for(const result of candidates){if(!result||!retrievalURL(result.url))continue;const bytes=Buffer.from(result.bytes||'','base64');if(bytes.length>20_000_000)continue;
  if(result.format==='pdf'&&bytes.subarray(0,5).toString()==='%PDF-'&&checkPaperIdentity(result.text,metadata).state==='matched')return {...result,bytes};
  if(result.format==='html'&&bytes.length<=2_000_000){const article=extractWebArticle(bytes.toString(),result.url,metadata);if(article&&checkPaperIdentity(article.title+'\n'+article.html.replace(/<[^>]*>/g,' ').slice(0,5000),metadata).state==='matched')return {...result,bytes};}
 }
 return null;
}
export async function dockerRetrieve(task,config){
 const state=resolve(config.stateDir);await mkdir(state,{recursive:true,mode:0o700});const dir=await mkdtemp(join(state,'browser-'));
 const name='onlyideas-retrieval-'+randomUUID(),proxy=name+'-proxy';
 const image=config.image||'onlyideas-retrieval:20261011';
 // Configuration is operator-owned; no task text enters a command or argument.
 const shared=['--init','--label','art.lazying.project=onlyideas-retrieval','--read-only','--cap-drop=ALL','--security-opt','no-new-privileges','--pids-limit','180','--memory','768m','--cpus','1.5','--tmpfs','/tmp:rw,nosuid,size=384m','--mount',`type=bind,src=${dir},dst=/proxy`];
 try{
  await exec('docker',['run','-d','--name',proxy,...shared,image,'public-proxy.mjs'],{timeout:30_000,maxBuffer:100_000});
  let ready=false;for(let i=0;i<50;i++){try{ready=(await stat(join(dir,'egress.sock'))).isSocket();if(ready)break;}catch{}await sleep(100);}if(!ready)throw Error('Browser proxy did not start');
  const args=['run','--rm','-i','--name',name,...shared,'--network','none','--security-opt','seccomp='+resolve(config.seccomp),image,'browser.mjs'];
  const output=await new Promise((resolve,reject)=>{
   const child=spawn('docker',args,{stdio:['pipe','pipe','pipe']});let stdout=[],stderr=[],size=0,stopped=false;
   const timer=setTimeout(()=>{stopped=true;void exec('docker',['rm','-f',name]).catch(()=>{});},Math.min(task.timeoutMs||90_000,120_000)+15_000);
   child.stdout.on('data',c=>{size+=c.length;if(size>35_000_000){stopped=true;void exec('docker',['rm','-f',name]).catch(()=>{});}else stdout.push(c);});
   child.stderr.on('data',c=>{if(Buffer.concat(stderr).length<20_000)stderr.push(c);});
   child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('close',code=>{clearTimeout(timer);if(code||stopped)reject(Error('Browser retrieval failed: '+Buffer.concat(stderr).toString().slice(-2000)));else resolve(JSON.parse(Buffer.concat(stdout).toString()));});child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(task));
  });
  return output;
 }finally{await exec('docker',['rm','-f',name,proxy],{timeout:20_000}).catch(()=>{});await rm(dir,{recursive:true,force:true});}
}
export async function retrieveWithBrowser(task,config,{browser=dockerRetrieve,research=codexResearch,candidates=repositoryCandidates}={}){
 const deadline=Math.min(task.deadline||Infinity,Date.now()+380_000),reports=[];
 const extra=await candidates(task);
 const urls=[...new Set([...extra,...task.urls])];
 async function attempt(list,stage){if(!list.length||deadline-Date.now()<5000)return null;const output=await browser({...task,urls:list,timeoutMs:Math.min(90_000,deadline-Date.now()-2000)},config);reports.push({stage,findings:output.findings,browserVersion:output.browserVersion});return acceptedBrowserResult(output,task.metadata);}
 let result=await attempt(urls,'browser');
 if(!result&&config.codex?.enabled&&task.metadata.doi&&deadline-Date.now()>45_000){
  try{const found=await research(task.metadata.doi,{...config,codex:{...config.codex,timeoutMs:Math.min(config.codex.timeoutMs||210_000,deadline-Date.now()-35_000)}});
   const exact=found.filter(p=>{const requested=task.metadata.doi.toLowerCase(),actual=String(p.doi||'').toLowerCase();return actual===requested||(/^10\.36227\/techrxiv\.\d+$/.test(requested)&&actual.startsWith(requested+'.v')&&/^\d+$/.test(actual.slice(requested.length+2))&&checkPaperIdentity(p.title+'\n'+String(p.summary||''),task.metadata).state==='matched');});
   const alternate=[...new Set(exact.flatMap(p=>[p.pdfUrl,...(p.downloadSources||[]),p.sourcePage,p.source]).map(retrievalURL).filter(Boolean))].filter(u=>!urls.includes(u));
   result=await attempt(alternate,'codex-browser');reports.push({stage:'codex',verifiedCandidates:alternate.length});
  }catch(e){reports.push({stage:'codex',available:false});}
 }
 return {result,reports};
}
export async function runRetrievalWorker(config){
 if(!/^https:\/\//.test(config.origin)||!config.token||!config.stateDir||!config.seccomp)throw Error('Protected retrieval configuration required');
 let stopped=false;process.once('SIGTERM',()=>{stopped=true;});process.once('SIGINT',()=>{stopped=true;});
 async function api(action,body,bytes){const response=await fetch(config.origin+'/api/worker/retrieval/'+action,{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+config.token,...(bytes?{'Content-Type':'application/octet-stream','X-Retrieval-Result':Buffer.from(JSON.stringify(body)).toString('base64url')}:{'Content-Type':'application/json'})},body:bytes||JSON.stringify(body),signal:AbortSignal.timeout(bytes?45_000:15_000)});if(!response.ok)throw Error('Retrieval API '+response.status);return response.json();}
 while(!stopped){let task,timer;try{
  ({task}=await api('claim',{}));if(!task){await sleep(5000);continue;}
  timer=setInterval(()=>void api('heartbeat',{id:task.id,lease:task.lease}).catch(()=>{}),20_000);
  const {result,reports}=await retrieveWithBrowser(task,config);
  await mkdir(config.stateDir,{recursive:true,mode:0o700});await writeFile(join(config.stateDir,'last-retrieval.json'),JSON.stringify({at:new Date().toISOString(),doi:task.metadata.doi,reports,success:!!result}),{mode:0o600});
  if(result)await api('result',{id:task.id,lease:task.lease,url:result.url,format:result.format},result.bytes);else await api('failed',{id:task.id,lease:task.lease});
  console.log(JSON.stringify({event:'retrieval',id:task.id,success:!!result,format:result?.format}));
 }catch(e){console.error('Retrieval worker attempt failed.');if(task)await api('failed',{id:task.id,lease:task.lease}).catch(()=>{});await sleep(5000);}finally{clearInterval(timer);}}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const path=process.env.ONLYIDEAS_RETRIEVAL_CONFIG;if(!path||(await stat(path)).mode&0o077)throw Error('Retrieval config must be mode 600');await runRetrievalWorker(JSON.parse(await readFile(path,'utf8')));}

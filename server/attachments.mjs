import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { unzipSync } from 'fflate';
import sharp from 'sharp';
import { hash, requireValue, makePaper } from './domain.mjs';
import { providerJSON } from './network.mjs';
import { requestSharing } from './sharing.mjs';
import { canReusePaper, reusablePaper } from './import-reuse.mjs';
const exec=promisify(execFile);
const types={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',txt:'text/plain',md:'text/markdown',mmd:'text/markdown',csv:'text/csv',json:'application/json',tex:'text/plain'};
export function inspectAttachment(bytes, name) {
  requireValue(typeof name==='string'&&name.length<=240&&!/[\x00-\x1f/\\]/.test(name),'Choose a file with a simple name.');
  const ext=extname(name).slice(1).toLowerCase(),mime=types[ext];
  requireValue(mime,'Choose PDF, DOCX, PNG, JPEG, WebP, Markdown, text, CSV, JSON or TeX.');
  requireValue(bytes.length>0&&bytes.length<=(mime.startsWith('image/')?8_000_000:20_000_000),'The attachment exceeds its size limit.',413);
  if(ext==='pdf')requireValue(bytes.subarray(0,5).toString()==='%PDF-','Choose a valid PDF.');
  else if(ext==='docx') {
    let total=0,count=0;
    const files=unzipSync(bytes,{filter:f=>{total+=f.originalSize;count++;requireValue(count<=500&&total<=40_000_000&&f.originalSize<=8_000_000&&!f.name.startsWith('/')&&!f.name.includes('\\')&&!f.name.includes(':')&&!f.name.split('/').includes('..'),'The Word file exceeds safe document limits.');return !f.name.endsWith('/');}});
    requireValue(files['word/document.xml']&&files['[Content_Types].xml'],'Choose a valid DOCX file.');
    return {ext,mime,files};
  } else if(ext==='png')requireValue(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&bytes.length>=24&&bytes.readUInt32BE(16)*bytes.readUInt32BE(20)<=30_000_000,'Choose a PNG image under 30 megapixels.');
  else if(ext==='jpg'||ext==='jpeg')requireValue(bytes[0]===255&&bytes[1]===216&&bytes[2]===255,'Choose a valid JPEG image.');
  else if(ext==='webp')requireValue(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP','Choose a valid WebP image.');
  else {requireValue(bytes.length<=2_000_000,'Text attachments must be at most 2 MB.',413);const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);requireValue(!text.includes('\0'),'Choose a UTF-8 text file.');}
  return {ext,mime};
}
export function attachment(store,id,owner) {
  const row=store.db.prepare('SELECT body FROM attachments WHERE id=? AND owner=?').get(id,owner);
  requireValue(row,'Attachment not found.',404);
  const data=JSON.parse(row.body),job=store.job(data.jobId);
  if (job?.paperId && !canReusePaper(store,store.paper(job.paperId),owner)) return {...data,state:'failed',message:'Attachment unavailable'};
  return {...data,state:job?.state==='completed'?'ready':job?.state||'failed',message:job?.message||'Attachment unavailable',paperId:job?.paperId};
}
export async function uploadAttachment(store,config,user,bytes,name,enqueue,{sharing='private',creditLimit,inspectPDF}={}) {
  const {ext,mime}=inspectAttachment(bytes,name),digest=hash(bytes),old=store.db.prepare('SELECT id FROM attachments WHERE owner=? AND digest=?').get(user.id,digest);
  if(old)return attachment(store,old.id,user.id);
  const cached = reusablePaper(store,user.id,{sourceDigest:digest});
  if(!cached && (ext==='pdf'||mime.startsWith('image/')))requireValue(config.mathpix?.appKey,'Document recognition is not connected yet.',503);
  const id=randomUUID(),directory=join(store.directory,'jobs',id);await mkdir(directory,{recursive:true,mode:0o700});
  await writeFile(join(directory,'source.'+ext),bytes,{mode:0o600});
  let committed=false,transaction=false;
  try {
    const pages=!cached&&ext==='pdf'&&sharing!=='shared'&&config.credits?.enabled===true?await inspectPDF(join(directory,'source.pdf'),config.maxPages||30):undefined;
    store.requireActive(user.id);store.db.exec('BEGIN IMMEDIATE');transaction=true;
    const previous=store.db.prepare('SELECT id FROM attachments WHERE owner=? AND digest=?').get(user.id,digest);
    if(previous){store.db.exec('COMMIT');committed=true;await rm(directory,{recursive:true,force:true});return attachment(store,previous.id,user.id);}
    const job=enqueue(user,{id,kind:'attachment',dedupe:'attachment:'+digest,ext,mime,sharing,creditLimit,pages,sourceDigest:digest,metadata:{title:name.replace(/\.[^.]+$/,''),language:'en',license:'private',category:'Uploads'}});
    const data={id,name,mime,bytes:bytes.length,jobId:job.id};
    store.db.prepare('INSERT INTO attachments VALUES(?,?,?,?)').run(id,user.id,digest,JSON.stringify(data));store.db.exec('COMMIT');committed=true;
    if(job.reused || job.id!==id) await rm(directory,{recursive:true,force:true});
    return attachment(store,id,user.id);
  }catch(e){if(transaction&&!committed)store.db.exec('ROLLBACK');await rm(directory,{recursive:true,force:true});throw e;}
}
export async function convertAttachment(job,config,store,{mathpix,provider=providerJSON}={}) {
  const completed=store.paper(job.id);
  if(completed?.owner===job.owner) { requestSharing(store,completed,job.sharing); return {paperId:completed.id}; }
  const cached = reusablePaper(store,job.owner,job,job.id);
  if(cached) { await rm(join(store.directory,'jobs',job.id,'source.'+job.ext),{force:true});return {paperId:cached.id,reused:true}; }
  if(job.ext==='pdf')return mathpix(job,config,store);
  const directory=join(store.directory,'jobs',job.id),file=join(directory,'source.'+job.ext),bytes=await readFile(file);
  const inspected=inspectAttachment(bytes,'file.'+job.ext);let mmd='',assets=[];
  if(job.mime.startsWith('image/')) {
    requireValue(!job.ocrSubmittedAt||job.ocrText!==undefined||job.ocrResult,'The image conversion receipt is uncertain. Contact support before retrying to avoid another charge.',409);
    if(job.ocrText===undefined) {
      const count=store.db.prepare("SELECT count(*) AS n FROM jobs WHERE created>? AND json_extract(body,'$.ocrSubmittedAt') IS NOT NULL").get(Date.now()-86400_000).n;
      requireValue(count<(config.maxImagesPerDay||50),'Today’s image allowance is full. Try tomorrow.',429);
      if(!job.ocrResult) {
        let image=await sharp(bytes,{limitInputPixels:30_000_000}).rotate().flatten({background:'#ffffff'}).resize({width:2000,height:2000,fit:'inside',withoutEnlargement:true}).jpeg({quality:88}).toBuffer();
        if(image.length>1_400_000)image=await sharp(image).resize({width:1600,height:1600,fit:'inside'}).jpeg({quality:65}).toBuffer();
        requireValue(image.length<=1_400_000,'The attachment exceeds its size limit.',413);
        job.ocrSubmittedAt=Date.now();store.saveJob(job);
        const r=await provider('https://api.mathpix.com/v3/text',{method:'POST',headers:{'Content-Type':'application/json',app_id:config.mathpix.appId,app_key:config.mathpix.appKey},body:JSON.stringify({src:`data:image/jpeg;base64,${image.toString('base64')}`,formats:['text'],enable_document_layout:true,math_inline_delimiters:['$','$'],math_display_delimiters:['$$','$$'],improve_mathpix:false})});
        job.ocrResult={text:String(r.text||''),error:r.error_info?.id||r.error||null};store.requireActive(job.owner);store.saveJob(job);
      }
      const result=job.ocrResult;
      requireValue(!result.error||['image_no_content','image_unsupported_content','math_confidence'].includes(result.error),'The image could not be recognized. Try a clearer image.',502);
      job.ocrText=result.text||'No machine-readable text was found. View the original image below.';
      if(result.error==='math_confidence')job.ocrText='Recognition is uncertain. Check the original image.\n\n'+job.ocrText;
      store.requireActive(job.owner);store.saveJob(job);
    }
    const path=`figures/${hash(bytes).slice(0,24)}.${job.ext}`;assets=[{path,data:bytes,bytes:bytes.length}];
    mmd=(job.ocrText||'')+`\n\n![Original image](${path})\n`;
  } else if(job.ext==='docx') {
    // No extraction/network option: Pandoc only reads the validated input archive.
    const r=await exec(config.pandoc||'pandoc',['--sandbox','-f','docx','-t','markdown','--wrap=none',file],{timeout:30_000,maxBuffer:3_000_000});mmd=r.stdout;
    for(const [name,data]of Object.entries(inspected.files)) {
      const ext=name.match(/^word\/media\/[^/]+\.(png|jpe?g|webp|gif)$/i)?.[1];if(!ext)continue;
      const path=`figures/${hash(data).slice(0,24)}.${ext.toLowerCase()}`;mmd=mmd.split(name.replace(/^word\//,'')).join(path);assets.push({path,data:Buffer.from(data),bytes:data.length});
    }
    requireValue(!/!\[[^\]]*\]\((?!figures\/)/.test(mmd),'The Word document contains unsupported linked figures. Export it as PDF to preserve them.');
  } else {
    mmd=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    requireValue(!/!\[[^\]]*\]\(|\\includegraphics|<img\b/i.test(mmd),'Upload the PDF or Word document to preserve embedded figures.');
    if(['txt','csv','json'].includes(job.ext))mmd='```'+(job.ext==='json'?'json':'text')+'\n'+mmd.replace(/```/g,'` ` `')+'\n```';
  }
  store.requireActive(job.owner);
  for(const a of assets){await mkdir(join(store.directory,'papers',job.id,'figures'),{recursive:true,mode:0o700});await writeFile(join(store.directory,'papers',job.id,a.path),a.data,{mode:0o600});}
  const paper=makePaper({...job.metadata,id:job.id,owner:job.owner,mmd,assets:assets.map(({path,bytes})=>({path,bytes}))});store.savePaper(paper);await rm(file,{force:true});
  requestSharing(store,paper,job.sharing);
  return {paperId:paper.id};
}

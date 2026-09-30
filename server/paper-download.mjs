import {downloadPublic} from './network.mjs';
import {AppError} from './domain.mjs';
const safe=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')?u.href:''}catch{return ''}};
const decode=v=>v.replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#(?:39|x27);/gi,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(Number(n),0x10ffff)));
export function citationPDFs(html,base) {
 return [...html.matchAll(/<meta\b[^>]*>/gi)].flatMap(([tag])=>{
  const attrs=Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gs)].map(m=>[m[1].toLowerCase(),decode(m[2]??m[3]??m[4])]));
  if(!/^(bepress_)?citation_pdf_url$/i.test(attrs.name||''))return [];
  try{return [safe(new URL(attrs.content,base).href)].filter(Boolean)}catch{return []}
 }).slice(0,3);
}
const transient=e=>[408,429,500,502,503,504].includes(e.upstreamStatus)||['ETIMEDOUT','ECONNRESET','EAI_AGAIN','ECONNREFUSED','ERR_STREAM_PREMATURE_CLOSE'].includes(e.code)||/took too long|socket hang up|aborted/i.test(e.message);
// Bounded retries apply only to temporary failures, never repeated 401/403s.
// Every redirect and alternate location still passes pinned public-DNS checks.
export async function downloadPaperPDF(job,{download=downloadPublic,pause=ms=>new Promise(r=>setTimeout(r,ms)),now=Date.now}={}) {
 const deadline=now()+90_000,attempted=new Set(),pages=new Set();let last,blocked=false,transfers=0;
 async function get(url,maxBytes,timeout){
  for(let n=0;n<2;n++){
   if(++transfers>14||now()>=deadline)throw last||new AppError('The source took too long to respond.');
   try{const result=await download(url,{maxBytes,timeout:Math.min(timeout,deadline-now()),withMetadata:true});return Buffer.isBuffer(result)?{bytes:result,url}:result}
   catch(e){last=e;if(n||!transient(e)||now()+1200>=deadline)throw e;await pause(Math.min(e.retryAfterMs||750,1200));}
  }
 }
 async function attempt(url){url=safe(url);if(!url||attempted.has(url)||attempted.size>=8||now()>=deadline)return;attempted.add(url);try{
  const result=await get(url,20_000_000,25000);
  if(result.bytes.subarray(0,5).toString()==='%PDF-')return result;
  if(result.bytes.length<2_000_000)for(const pdf of citationPDFs(result.bytes.toString(),result.url)){const found=await attempt(pdf);if(found)return found}
  last=new AppError('The source supplied a web page instead of a PDF.');
 }catch(e){last=e;blocked ||= e.upstreamStatus===403||e.upstreamStatus===401||/HTTP (401|403)/.test(e.message)}}
 async function landing(url){url=safe(url);if(!url||attempted.has(url)||pages.has(url)||pages.size>=3||now()>=deadline)return;pages.add(url);try{
  const result=await get(url,2_000_000,12000);
  if(result.bytes.subarray(0,5).toString()==='%PDF-')return result;
  for(const pdf of citationPDFs(result.bytes.toString(),result.url)){const found=await attempt(pdf);if(found)return found}
 }catch(e){last=e;blocked ||= e.upstreamStatus===403||e.upstreamStatus===401||/HTTP (401|403)/.test(e.message)}}
 for(const url of [...new Set([job.url,...(job.downloadSources||[])])].slice(0,4)){const result=await attempt(url);if(result)return result}
 // Refresh the exact index ID/DOI; never choose a different paper by title.
 const work=/^https:\/\/openalex\.org\/W\d+$/.test(job.metadata?.metadataSource||'')?job.metadata.metadataSource:null;
 const doi=/^10\.\d{4,9}\/\S+$/i.test(job.metadata?.doi||'')?job.metadata.doi:null;
 if(work||doi){try{
  const query=work?work.split('/').at(-1):'https://doi.org/'+doi;
  const data=JSON.parse((await get('https://api.openalex.org/works/'+encodeURIComponent(query),2_000_000,12000)).bytes.toString());
  if(work?data.id===work:String(data.doi).toLowerCase()==='https://doi.org/'+doi.toLowerCase()){
   const locations=[data.best_oa_location,...(data.locations||[])].filter(l=>l?.is_oa===true);
   for(const location of locations){const result=await attempt(location.pdf_url);if(result)return result}
   for(const location of locations){const result=await landing(location.landing_page_url);if(result)return result}
  }
 }catch(e){last=e}}
 const result=await landing(job.sourcePage);if(result)return result;
 const error=new AppError(blocked?'This repository blocks automatic PDF downloads (403). Open the source page and upload the PDF, or try another open-access copy. No conversion was charged.':(last?.message?.includes('instead of a PDF')?'The source supplied a web page instead of a PDF. ':'')+'The PDF could not be downloaded. Try again, open the source, or upload your PDF. No conversion was charged.',422);
 error.code=blocked?'source_access_denied':'source_pdf_unavailable';throw error;
}

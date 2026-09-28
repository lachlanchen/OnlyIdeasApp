import {downloadPublic} from './network.mjs';
import {AppError,requireValue} from './domain.mjs';
const safe=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port?u.href:''}catch{return ''}};
const decode=v=>v.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
export function citationPDFs(html,base) {
 return [...html.matchAll(/<meta\b[^>]*>/gi)].flatMap(([tag])=>{
  const attrs=Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map(m=>[m[1].toLowerCase(),decode(m[3])]));
  if(!/^(bepress_)?citation_pdf_url$/i.test(attrs.name||''))return [];
  try{return [safe(new URL(attrs.content,base).href)].filter(Boolean)}catch{return []}
 }).slice(0,3);
}
// Only URLs supplied by the same indexed work or its citation metadata are used.
// Every candidate and redirect still passes the public HTTPS/DNS/size checks.
export async function downloadPaperPDF(job,{download=downloadPublic}={}) {
 const candidates=[job.url,...(job.downloadSources||[])].map(safe).filter(Boolean);
 const attempted=new Set();let last,blocked=false;
 async function attempt(url){if(!url||attempted.has(url)||attempted.size>=5)return;attempted.add(url);try{
  const bytes=await download(url,{maxBytes:20_000_000,timeout:30000});
  if(bytes.subarray(0,5).toString()==='%PDF-')return {bytes,url};
  if(bytes.length<2_000_000)for(const pdf of citationPDFs(bytes.toString(),url)){const result=await attempt(pdf);if(result)return result}
  last=new AppError('The source supplied a web page instead of a PDF.');
 }catch(e){last=e;blocked ||= e.upstreamStatus===403||e.upstreamStatus===401||/HTTP (401|403)/.test(e.message)}}
 for(const url of [...new Set(candidates)].slice(0,4)){const result=await attempt(url);if(result)return result}
 // Refresh the same indexed work once; do not guess substitutes from its title.
 if(job.discoveryId&&/^https:\/\/openalex\.org\/W\d+$/.test(job.metadata?.metadataSource||'')){
  try{const data=JSON.parse((await download('https://api.openalex.org/works/'+job.metadata.metadataSource.split('/').at(-1),{maxBytes:2_000_000,timeout:12000})).toString());
   if(data.id===job.metadata.metadataSource)for(const location of [data.best_oa_location,...(data.locations||[])]){if(location?.is_oa!==true)continue;const result=await attempt(safe(location.pdf_url));if(result)return result}
  }catch{}
 }
 // The canonical article page can advertise an updated public PDF URL.
 if(job.sourcePage&&safe(job.sourcePage)&&!attempted.has(job.sourcePage)){
  try{const html=await download(job.sourcePage,{maxBytes:2_000_000,timeout:15000});for(const url of citationPDFs(html.toString(),job.sourcePage)){const result=await attempt(url);if(result)return result}}catch{}
 }
 const error=new AppError(blocked?'This repository blocks automatic PDF downloads (403). Open the source page and upload the PDF, or try another open-access copy. No conversion was charged.':last?.message||'No readable open-access PDF was found. Open the source page or upload your copy.',422);
 error.code=blocked?'source_access_denied':'source_pdf_unavailable';throw error;
}

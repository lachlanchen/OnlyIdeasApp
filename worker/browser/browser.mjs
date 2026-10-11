import {chromium} from 'playwright-core';
import net from 'node:net';
import {readFile,stat,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
// Network namespace has no interfaces except loopback. This socket is the only
// egress path; its separate proxy pins DNS and refuses non-public IPs.
const relay=net.createServer(client=>{const upstream=net.connect('/proxy/egress.sock');client.on('error',()=>upstream.destroy());upstream.on('error',()=>client.destroy());client.on('close',()=>upstream.destroy());upstream.on('close',()=>client.destroy());client.pipe(upstream);upstream.pipe(client);});
await new Promise(r=>relay.listen(3128,'127.0.0.1',r));
const input=[];for await(const c of process.stdin){input.push(c);if(Buffer.concat(input).length>16_000)throw Error('Task too large');}
const task=JSON.parse(Buffer.concat(input));
const safe=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')?u.href:'';}catch{return '';}};
let browser;
const findings=[],queue=[...new Set(task.urls.map(safe).filter(Boolean))].slice(0,8),seen=new Set();
const deadline=Date.now()+Math.min(task.timeoutMs||90_000,120_000);
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,chromiumSandbox:true,proxy:{server:'http://127.0.0.1:3128',bypass:'<-loopback>'},args:['--disable-dev-shm-usage','--disable-quic','--disable-background-networking','--disable-component-update','--force-webrtc-ip-handling-policy=disable_non_proxied_udp']});
 const context=await browser.newContext({acceptDownloads:true,serviceWorkers:'block',viewport:{width:1280,height:900}});
 context.setDefaultTimeout(12_000);
 // Third-party ads/media are unnecessary for paper retrieval. Native TLS and
 // cookies from this fresh context are retained for ordinary publisher flows.
 await context.route('**/*',route=>{const request=route.request();if(!safe(request.url())||['media','font','websocket'].includes(request.resourceType()))return route.abort();return route.continue();});
 context.on('page',p=>{if(context.pages().length>1)void p.close();});
 let result=null;
 for(let i=0;i<queue.length&&seen.size<8&&Date.now()<deadline;i++){
  const url=queue[i];if(seen.has(url))continue;seen.add(url);
  const page=await context.newPage();let downloaded;
  const pending=[];
  async function capturePDF(bytes,url){
   if(bytes.length>20_000_000||bytes.subarray(0,5).toString()!=='%PDF-')return;
   const folder=await mkdtemp('/tmp/paper-');try{const file=folder+'/paper.pdf';await writeFile(file,bytes);const text=(await exec('pdftotext',['-f','1','-l','2',file,'-'],{timeout:8000,maxBuffer:150_000})).stdout;
    const words=String(task.metadata?.title||'').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[],header=text.slice(0,5000).toLowerCase();if(words.length>=3&&words.filter(w=>header.includes(w)).length/words.length<.8)return;
    downloaded={url:safe(url),format:'pdf',bytes:bytes.toString('base64'),text};
   }finally{await rm(folder,{recursive:true,force:true});}
  }
  page.on('response',response=>{if(/application\/pdf/i.test(response.headers()['content-type']||'')&&Number(response.headers()['content-length']||0)<=20_000_000){pending.push(response.body().then(b=>capturePDF(b,response.url())).catch(()=>{}));}});
  page.on('download',d=>{const promise=(async()=>{
   const file=await d.path();if(!file)return;if((await stat(file)).size>20_000_000)return;const bytes=await readFile(file);if(bytes.length>20_000_000||bytes.subarray(0,5).toString()!=='%PDF-')return;
   const text=(await exec('pdftotext',['-f','1','-l','2',file,'-'],{timeout:8000,maxBuffer:150_000})).stdout;
   const words=String(task.metadata?.title||'').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[];const header=text.slice(0,5000).toLowerCase();if(words.length>=3&&words.filter(w=>header.includes(w)).length/words.length<.8)return;
   downloaded={url:safe(d.url()),format:'pdf',bytes:bytes.toString('base64'),text};
  })().catch(()=>{});pending.push(promise);});
  try{
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:Math.min(18000,Math.max(1000,deadline-Date.now()))}).catch(()=>null);
   if(response?.ok()&&/text\/html/i.test(response.headers()['content-type']||'')&&Number(response.headers()['content-length']||0)<=2_000_000){
    const source=await response.text().catch(()=>'');
    const titleWords=String(task.metadata?.title||'').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[],header=source.slice(0,60000).toLowerCase();
    if(source.length<=2_000_000&&titleWords.length>=3&&titleWords.filter(w=>header.includes(w)).length/titleWords.length>.85&&/<article\b|class=["'][^"']*(?:ltx_document|article-body)/i.test(source)&&(source.match(/<p\b/gi)||[]).length>12){
     result={candidates:[{url:safe(response.url()),format:'html',bytes:Buffer.from(source).toString('base64')}]};findings.push({url:safe(response.url()),status:response.status(),fullText:true});break;
    }
   }
   await page.waitForTimeout(response?.ok()?1000:350);
   await Promise.all(pending);
   if(downloaded){result=downloaded;break;}
   const final=safe(page.url());if(!final){findings.push({url,status:response?.status()||null,unavailable:true});continue;}
   if(/application\/pdf/i.test(response?.headers()['content-type']||'')){
    const pdf=await context.request.get(url,{timeout:15000});if(pdf.ok()&&Number(pdf.headers()['content-length']||0)<=20_000_000)await capturePDF(await pdf.body(),pdf.url());await pdf.dispose();if(downloaded){result=downloaded;break;}
   }
   await page.waitForLoadState('load',{timeout:6000}).catch(()=>{});
   await page.waitForFunction(()=>document.documentElement&&document.body?.innerText.length>100,{timeout:5000}).catch(()=>{});
   const info=await page.evaluate(()=>({title:document.title,text:document.body?.innerText.slice(0,1500)||'',html:document.documentElement.outerHTML,links:[...document.querySelectorAll('meta[name="citation_pdf_url"],meta[name="bepress_citation_pdf_url"],a[href]')].map(a=>({url:a.content?new URL(a.content,location.href).href:a.href,label:a.textContent?.trim().slice(0,150)||'',meta:!!a.content})).filter(a=>a.meta||((/\b(?:download|pdf|full text)\b/i.test(a.label)||/\.pdf(?:[?#]|$)/i.test(a.url))&&new URL(a.url).origin===location.origin&&!/\.(?:mp4|zip|pptx?)(?:[?#]|$)/i.test(a.url)&&a.url.split('#')[0]!==location.href.split('#')[0])).slice(0,40)}));
   const challenge=/^(?:just a moment|access denied|robot check|checking your browser|captcha)/i.test(info.title)||/verify you are human|complete the security check|enable javascript and cookies to continue/i.test(info.text);
   findings.push({url:final,status:response?.status()||null,title:info.title.slice(0,200),blocked:challenge,htmlBytes:Buffer.byteLength(info.html),excerpt:info.text.slice(0,300),links:challenge?[]:info.links.slice(0,12).map(l=>l.url)});
   if(challenge)continue;
   // Candidate full text is re-validated by the host and again by the API.
   if(info.html.length<=2_000_000&&await page.locator('article,.ltx_document,[itemprop="articleBody"],.c-article-body,#artText,.article-body').count()){
    const html={url:final,format:'html',bytes:Buffer.from(info.html).toString('base64')};
    // Keep several pages: an abstract shell must not hide a later PDF.
    if(!result)result={candidates:[]};if(result.candidates)result.candidates.push(html);
    const titleWords=String(task.metadata?.title||'').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[];const title=info.title.toLowerCase();if(titleWords.length>=3&&titleWords.filter(w=>title.includes(w)).length/titleWords.length>.8&&await page.locator('article p,.ltx_document p,[itemprop=articleBody] p,.c-article-body p,#artText p,.article-body p').count()>12)break;
   }
   for(const link of info.links.sort((a,b)=>Number(a.meta)-Number(b.meta))){const next=safe(link.url);if(next&&!seen.has(next)&&!queue.includes(next)&&queue.length<16)queue.splice(i+1,0,next);}
  }catch(e){findings.push({url,error:String(e.message).split('\n')[0].slice(0,140)});}finally{await page.close().catch(()=>{});}
 }
 console.log(JSON.stringify({result,findings,browserVersion:browser.version()}));
}finally{await browser?.close();relay.close();}

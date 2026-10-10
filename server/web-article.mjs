import {JSDOM} from 'jsdom';
import sharp from 'sharp';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {downloadPublic} from './network.mjs';
import {hash,requireValue} from './domain.mjs';
import {checkPaperIdentity} from './pdf-identity.mjs';
const exec=promisify(execFile);
const https=(value,base)=>{try{const u=new URL(value,base);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')?u.href:''}catch{return ''}};
// No scripts, resources or navigation are enabled in this parser.
export function extractWebArticle(html,url,expected={}) {
 if(Buffer.byteLength(html)>2_000_000)return null;
 const dom=new JSDOM(html,{url});
 try {
  const d=dom.window.document;
  const root=d.querySelector('.ltx_document, [itemprop="articleBody"], .c-article-body, #artText, .article-body, article');
  if(!root)return null;
  root.querySelectorAll('nav,header,footer,aside,form,button,iframe,object,embed,style,noscript,[hidden],[aria-hidden="true"],.references-list,.cookie-banner').forEach(n=>n.remove());
  // Preserve MathJax source before removing every other executable element.
  root.querySelectorAll('script[type^="math/tex"]').forEach(n=>{const span=d.createElement('span'),block=/mode=display/.test(n.type);span.className='math '+(block?'display':'inline');span.textContent=(block?'\\[':'\\(')+n.textContent+(block?'\\]':'\\)');n.replaceWith(span)});
  root.querySelectorAll('script').forEach(n=>n.remove());
  const text=root.textContent.replace(/\s+/g,' ').trim(),paragraphs=[...root.querySelectorAll('p')].filter(p=>p.textContent.trim().length>50);
  // Abstract-only landing pages, authentication/error shells and menus cannot
  // masquerade as a completed transcript.
  if(text.length<1800||paragraphs.length<4||(!root.querySelector('h2,h3,section')&&text.length<4000))return null;
  const title=d.querySelector('meta[name="citation_title"]')?.content||root.querySelector('h1')?.textContent||d.querySelector('h1')?.textContent||d.title;
  if(expected.doi&&checkPaperIdentity(title+'\n'+text.slice(0,5000),expected).state==='mismatch')return null;
  const figureSources=[];
  for(const img of root.querySelectorAll('img')){
   const source=https(img.getAttribute('data-src')||img.getAttribute('src'),url);
   if(!source){img.replaceWith(d.createTextNode(img.alt||''));continue;}
   if(Number(img.getAttribute('width'))===1||Number(img.getAttribute('height'))===1){img.remove();continue;}
   figureSources.push({source,img});
  }
  if(figureSources.length>40)return null;
  root.querySelectorAll('a').forEach(a=>{const link=https(a.getAttribute('href'),url);if(link)a.setAttribute('href',link);else a.removeAttribute('href')});
  // Strip event/style/remote attributes. Preserve structural table/MathML data.
  for(const el of root.querySelectorAll('*'))for(const a of [...el.attributes])if(/^on/i.test(a.name)||['style','srcset','data-src','poster'].includes(a.name))el.removeAttribute(a.name);
  const licenseLink=[...d.querySelectorAll('a[rel~="license"],link[rel~="license"]')].map(n=>https(n.getAttribute('href'),url)).find(Boolean);
  const licenses={'https://creativecommons.org/licenses/by/4.0/':'CC-BY-4.0','https://creativecommons.org/licenses/by-sa/4.0/':'CC-BY-SA-4.0','https://creativecommons.org/publicdomain/zero/1.0/':'CC0-1.0'};
  return {title:String(title||expected.title||'Research article').trim().slice(0,300),html:root.outerHTML,figures:figureSources.map(({source,img},i)=>{const marker=`onlyideas-figure-${i}`;img.setAttribute('src',marker);return {source,marker}}),renderHTML:root.outerHTML,license:licenses[licenseLink],licenseUrl:licenseLink};
 }finally{dom.window.close()}
}
// Pandoc escapes citation brackets as \[...\]. The scientific renderer
// reserves those delimiters for display math; entities preserve literal brackets.
export function readableWebMarkdown(markdown) {
 return markdown.replace(/(?<!\\)(\$\$[\s\S]*?\$\$|\$(?:\\.|[^$\\])+\$)|\\([[\]])/g,
  (whole,math,bracket)=>math|| (bracket==='['?'&#91;':'&#93;'));
}
export async function convertWebArticle(article,{pandoc='pandoc',download=downloadPublic}={}) {
 let html=article.renderHTML,assets=[],total=0;const seen=new Map();
 for(const figure of article.figures){
  let asset=seen.get(figure.source);
  if(!asset){
   const result=await download(figure.source,{maxBytes:5_000_000,timeout:15000});const bytes=Buffer.isBuffer(result)?result:result.bytes;
   // Decode and re-encode to reject HTML, tracking markup and active SVG content.
   const data=await sharp(bytes,{limitInputPixels:30_000_000}).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).png().toBuffer();
   total+=data.length;requireValue(total<=20_000_000,'The article figures exceed the import limit. Try the PDF.');
   asset={path:`figures/${hash(data).slice(0,24)}.png`,data,bytes:data.length};assets.push(asset);seen.set(figure.source,asset);
  }
  html=html.split('src="'+figure.marker+'"').join('src="'+asset.path+'"');
 }
 const dir=await mkdtemp(join(tmpdir(),'onlyideas-html-'));
 try{const file=join(dir,'article.html');await writeFile(file,html,{mode:0o600});
  const {stdout}=await exec(pandoc,['--sandbox','-f','html','-t','gfm+tex_math_dollars-tex_math_gfm-raw_html','--wrap=none',file],{timeout:30000,maxBuffer:3_000_000});
  const mmd=readableWebMarkdown(stdout);
  requireValue(mmd.trim().length>500,'The article did not contain enough readable full text. Try its PDF.');
  requireValue(!/!\[[^\]]*\]\((?!figures\/)/.test(mmd),'An article figure could not be preserved. Try its PDF.');
  return {mmd,assets};
 }finally{await rm(dir,{recursive:true,force:true})}
}

import { watchProse } from './watch-prose'
import { paragraphActions } from './paragraphs'
import {cleanDocument,pairReading,readingMode,type ReadingView,type ReadingMode} from './parallel-reader'
import './native-reader.css'
const rendererUrl = './native-math.js'
type DocumentData = { reading?:ReadingView; mode?:ReadingMode; labels?:{source:string;translation:string;partial:string}; attribution?:string; mmd: string; figures?: Record<string,string>; fontSize?: number; dark?: boolean; comments?:boolean; commentLabel?:string; language?:string }
const host = window as unknown as { markdownToHTML: (s: string,o: object)=>string; OnlyIdeasRender:(p:DocumentData)=>void; OnlyIdeasStyle:(size:number,dark:boolean)=>void; OnlyIdeasMode:(mode:ReadingMode)=>void; webkit?: {messageHandlers:{onlyideas:{postMessage:(s:object)=>void}}}; NativeReader?:{selection:(s:string)=>void;ready?:()=>void;paragraph?:(quote:string,id:string)=>void} }
const root=document.getElementById('paper')!
host.OnlyIdeasStyle=(size,dark)=>{document.documentElement.style.setProperty('--size',`${Math.max(15,Math.min(72,size))}px`);document.documentElement.dataset.theme=dark?'dark':'light'}
host.OnlyIdeasMode=mode=>readingMode(root,mode)
let ready=false,pending:DocumentData|undefined
host.OnlyIdeasRender=p=>{
  if(!ready){pending=p;return}
  host.OnlyIdeasStyle(p.fontSize||18,!!p.dark)
  const render=(text:string)=>host.markdownToHTML(text,{htmlTags:false,lineNumbering:true,width:Math.max(280,root.clientWidth),linkify:false,typographer:false,accessibility:{assistiveMml:true},outMath:{include_svg:true}})
  root.innerHTML=cleanDocument(render(p.mmd))
  if(p.comments)paragraphActions(root,p.commentLabel||'Discuss paragraph',(quote,paragraphId)=>{host.webkit?.messageHandlers.onlyideas.postMessage({action:'paragraph',quote,paragraphId});host.NativeReader?.paragraph?.(quote,paragraphId)})
  const sourceProse=watchProse(root)
  if(p.reading)pairReading(root,p.reading,render,p.labels||{source:p.language||'Original',translation:p.reading.language,partial:'Remaining passages use the original.'})
  root.dataset.readingMode=p.mode||'original'
  for(const img of root.querySelectorAll('img')) {img.removeAttribute('style');img.removeAttribute('width');img.removeAttribute('height');const path=img.getAttribute('src')?.replace(/^\.\//,'')||'';const data=p.figures?.[path];if(data&&/^data:image\/(?:png|jpeg|gif|webp|svg\+xml);base64,/.test(data))img.src=data;else img.replaceWith(document.createTextNode('[Figure not downloaded]'))}
  for(const a of root.querySelectorAll('a')) {const href=a.getAttribute('href')||'';if(!href.startsWith('#'))a.removeAttribute('href')}
  root.dir=p.language==='ar'?'rtl':'ltr'
  if(p.attribution){const credit=document.createElement('footer');credit.className='source-attribution';credit.textContent=p.attribution;root.append(credit)}
  host.webkit?.messageHandlers.onlyideas.postMessage({watchProse:sourceProse})
  root.dataset.ready='true'
}
const script=document.createElement('script');script.src=rendererUrl;script.onload=()=>{ready=true;if(pending)host.OnlyIdeasRender(pending);host.NativeReader?.ready?.();host.webkit?.messageHandlers.onlyideas.postMessage({ready:true})};script.onerror=()=>{root.textContent='The equation renderer could not load. Reopen this paper to try again.'};document.head.append(script)
document.addEventListener('selectionchange',()=>{const text=window.getSelection()?.toString().trim().slice(0,2000)||'';host.webkit?.messageHandlers.onlyideas.postMessage({quote:text});host.NativeReader?.selection(text)})

import { watchProse } from './watch-prose'
import { paragraphActions } from './paragraphs'
import DOMPurify from 'dompurify'
import './native-reader.css'
const rendererUrl = './native-math.js'
type DocumentData = { mmd: string; figures?: Record<string,string>; fontSize?: number; dark?: boolean; comments?:boolean; commentLabel?:string; language?:string }
const host = window as unknown as { markdownToHTML: (s: string,o: object)=>string; OnlyIdeasRender:(p:DocumentData)=>void; OnlyIdeasStyle:(size:number,dark:boolean)=>void; webkit?: {messageHandlers:{onlyideas:{postMessage:(s:object)=>void}}}; NativeReader?:{selection:(s:string)=>void;ready?:()=>void;paragraph?:(quote:string,id:string)=>void} }
const root=document.getElementById('paper')!
host.OnlyIdeasStyle=(size,dark)=>{document.documentElement.style.setProperty('--size',`${Math.max(15,Math.min(72,size))}px`);document.documentElement.dataset.theme=dark?'dark':'light'}
let ready=false,pending:DocumentData|undefined
host.OnlyIdeasRender=p=>{
  if(!ready){pending=p;return}
  host.OnlyIdeasStyle(p.fontSize||18,!!p.dark)
  const html=host.markdownToHTML(p.mmd,{htmlTags:false,width:Math.max(280,root.clientWidth),linkify:false,typographer:false,accessibility:{assistiveMml:true},outMath:{include_svg:true}})
  root.innerHTML=DOMPurify.sanitize(html,{USE_PROFILES:{html:true,svg:true,mathMl:true},ADD_TAGS:['mjx-container','mjx-assistive-mml'],ADD_ATTR:['jax','focusable','viewBox'],FORBID_TAGS:['style','script','iframe','object','embed','form','input','button'],FORBID_ATTR:['srcdoc','srcset']})
  for(const img of root.querySelectorAll('img')) {img.removeAttribute('style');img.removeAttribute('width');img.removeAttribute('height');const path=img.getAttribute('src')?.replace(/^\.\//,'')||'';const data=p.figures?.[path];if(data&&/^data:image\/(?:png|jpeg|gif|webp|svg\+xml);base64,/.test(data))img.src=data;else img.replaceWith(document.createTextNode('[Figure not downloaded]'))}
  for(const a of root.querySelectorAll('a')) {const href=a.getAttribute('href')||'';if(!href.startsWith('#'))a.removeAttribute('href')}
  root.dir=p.language==='ar'?'rtl':'ltr'
  if(p.comments)paragraphActions(root,p.commentLabel||'Discuss paragraph',(quote,paragraphId)=>{host.webkit?.messageHandlers.onlyideas.postMessage({action:'paragraph',quote,paragraphId});host.NativeReader?.paragraph?.(quote,paragraphId)})
  host.webkit?.messageHandlers.onlyideas.postMessage({watchProse:watchProse(root)})
  root.dataset.ready='true'
}
const script=document.createElement('script');script.src=rendererUrl;script.onload=()=>{ready=true;if(pending)host.OnlyIdeasRender(pending);host.NativeReader?.ready?.();host.webkit?.messageHandlers.onlyideas.postMessage({ready:true})};script.onerror=()=>{root.textContent='The equation renderer could not load. Reopen this paper to try again.'};document.head.append(script)
document.addEventListener('selectionchange',()=>{const text=window.getSelection()?.toString().trim().slice(0,2000)||'';host.webkit?.messageHandlers.onlyideas.postMessage({quote:text});host.NativeReader?.selection(text)})

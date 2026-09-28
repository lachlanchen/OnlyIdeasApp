import DOMPurify from 'dompurify'
import './parallel-reader.css'
export type ReadingMode='original'|'translation'|'interlaced'
export type ReadingView={paperId:string;revision:string;language:string;sourceLanguage:string;mmd:string;translated:number;total:number;complete:boolean;blocks:{id:string;start:number;end:number;targetStart:number;targetEnd:number;available:number;needed:number;content:boolean}[]}
export const cleanDocument=(html:string)=>DOMPurify.sanitize(html,{USE_PROFILES:{html:true,svg:true,mathMl:true},ADD_TAGS:['mjx-container','mjx-assistive-mml'],ADD_ATTR:['jax','focusable','viewBox','data_line_start','data_line_end'],FORBID_TAGS:['style','script','iframe','object','embed','form','input','button'],FORBID_ATTR:['srcdoc','srcset']})
// Both documents render as a whole before pairing, retaining equation numbering
// and cross-references. Source-line ranges avoid guessing from translated prose.
export function pairReading(root:HTMLElement,view:ReadingView,render:(text:string)=>string,labels:{source:string;translation:string;partial:string}) {
 const translated=document.createElement('div');translated.innerHTML=cleanDocument(render(view.mmd))
 const blocks=view.blocks.filter(b=>b.content),parents=blocks.map((_,i)=>i)
 const find=(i:number):number=>parents[i]===i?i:parents[i]=find(parents[i])
 const nodes=(container:HTMLElement,target:boolean)=>Array.from(container.querySelectorAll<HTMLElement>('[data_line_start]')).filter(n=>!n.parentElement?.closest('[data_line_start]')).map(node=>{
  const start=Number(node.getAttribute('data_line_start')),end=Number(node.getAttribute('data_line_end'))
  const indices=blocks.flatMap((b,i)=>((target?b.targetStart:b.start)<=end&&(target?b.targetEnd:b.end)>=start)?[i]:[])
  for(const i of indices.slice(1))parents[find(i)]=find(indices[0])
  return {node,indices}
 })
 const originalNodes=nodes(root,false),targetNodes=nodes(translated,true)
 const groups=new Map<number,{original:HTMLElement[];target:HTMLElement[];blocks:number[]}>()
 blocks.forEach((_,i)=>{const key=find(i);if(!groups.has(key))groups.set(key,{original:[],target:[],blocks:[]});groups.get(key)!.blocks.push(i)})
 for(const [items,key] of [[originalNodes,'original'],[targetNodes,'target']] as const)for(const item of items)if(item.indices.length)groups.get(find(item.indices[0]))![key].push(item.node)
 // Namespace generated equation/heading IDs; both readings may coexist.
 for(const node of translated.querySelectorAll<HTMLElement>('[id]'))node.id='translation-'+node.id
 for(const link of translated.querySelectorAll('[href],[xlink\\:href]'))for(const attr of ['href','xlink:href']){const value=link.getAttribute(attr);if(value?.startsWith('#'))link.setAttribute(attr,'#translation-'+value.slice(1))}
 for(const group of groups.values()){
  if(!group.original.length||!group.target.length||!group.blocks.some(i=>blocks[i].available>0))continue
  // An unexpected renderer range must leave the original readable.
  if(group.original.some(n=>n.parentElement!==group.original[0].parentElement))continue
  const pair=document.createElement('div');pair.className='reading-pair';pair.dataset.passage=blocks[group.blocks[0]].id
  const source=document.createElement('div');source.className='reading-source';source.lang=view.sourceLanguage;source.dir=view.sourceLanguage==='ar'?'rtl':'ltr'
  const target=document.createElement('div');target.className='reading-translation';target.lang=view.language;target.dir=view.language==='ar'?'rtl':'ltr'
  const label=(text:string)=>{const el=document.createElement('div');el.className='reading-language-label';el.textContent=text;return el}
  source.append(label(labels.source));target.append(label(labels.translation))
  group.original[0].before(pair);source.append(...group.original);target.append(...group.target);pair.append(source,target)
  if(group.blocks.some(i=>blocks[i].available<blocks[i].needed)){const note=label(labels.partial);note.classList.add('reading-partial');target.append(note)}
  // Keep figures/display equations once in interlaced mode, present in either
  // single-language mode. Captions and prose remain beside their translation.
  target.querySelectorAll('img,.math-block').forEach(n=>n.classList.add('reading-repeated-visual'))
  // Discussion actions retain their canonical source quote and stable ID.
  const actions=document.createElement('div');actions.className='reading-pair-actions'
  source.querySelectorAll<HTMLButtonElement>('.paragraph-comment').forEach(button=>actions.append(button))
  if(actions.childNodes.length)pair.append(actions)
 }
}
export function readingMode(root:HTMLElement,mode:ReadingMode){
 const anchor=Array.from(root.querySelectorAll<HTMLElement>('.reading-pair')).find(n=>n.getBoundingClientRect().bottom>0)
 const top=anchor?.getBoundingClientRect().top
 root.dataset.readingMode=mode
 if(anchor&&top!==undefined){const delta=anchor.getBoundingClientRect().top-top;if(Math.abs(delta)>1)window.scrollBy(0,delta)}
}

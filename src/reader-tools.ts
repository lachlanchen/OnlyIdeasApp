import {anchorSelection,corpus,locate,type Annotation} from './reader-anchors'
import './reader-tools.css'
export type ReaderCall=(resource:'annotations'|'notes',method:'GET'|'PUT',body?:unknown)=>Promise<any>
export function mountReaderTools(root:HTMLElement,options:{revision:string;language:string;call?:ReaderCall;translate?:(s:string)=>string}){
 const t=options.translate||((s:string)=>s),bar=document.createElement('div');bar.className='reader-tools';bar.dataset.readerTools='true';bar.setAttribute('aria-label',t('Reading tools'));root.before(bar)
 const status=document.createElement('span');status.className='reader-tools-status';status.setAttribute('role','status')
 let dirtyCheck:(()=>boolean)|undefined
 let generation=0
 let active=true,items:Annotation[]=[],selection:Annotation|null=null,query='',current=0,hits:HTMLElement[]=[],dialog:HTMLDialogElement|null=null
 const abort=new AbortController(),on=(el:EventTarget,event:string,fn:EventListener)=>el.addEventListener(event,fn,el===document||el===root||el instanceof Node&&root.contains(el)?{signal:abort.signal}:undefined)
 const button=(label:string,fn:()=>void,into:HTMLElement=bar)=>{const b=document.createElement('button');b.type='button';b.textContent=t(label);on(b,'click',fn);into.append(b);return b}
 const say=(s:string)=>{if(active)status.textContent=t(s)}
 let backdrop:HTMLElement|null=null
 const close=(force=false)=>{if(!force&&dirtyCheck?.()&&dialog){if(!dialog.querySelector('.reader-discard')){const row=document.createElement('div');row.className='reader-discard';const label=document.createElement('p');label.textContent=t('Discard unsaved changes?');row.append(label);button('Discard',()=>{close(true)},row);button('Keep editing',()=>row.remove(),row);dialog.append(row);row.querySelector('button')?.focus()}return false}dirtyCheck=undefined;dialog?.close?.();dialog?.remove();backdrop?.remove();backdrop=null;dialog=null;return true}
 function modal(title:string){close(true);const d=document.createElement('dialog');dialog=d;d.className='reader-dialog';d.dataset.readerTools='true';const top=document.createElement('header'),h=document.createElement('h2');h.textContent=t(title);top.append(h);button('Close',()=>{close()},top);d.append(top);document.body.append(d);on(d,'cancel',e=>{e.preventDefault();close()});if(d.showModal)d.showModal();else{d.setAttribute('open','');d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.style.position='fixed';d.style.inset='5vh 0 auto';d.style.zIndex='1001';backdrop=document.createElement('div');backdrop.className='reader-dialog-backdrop';document.body.append(backdrop)};return d}
 async function call(resource:'annotations'|'notes',method:'GET'|'PUT',body?:unknown){if(!options.call)throw Error(t('Sign in to save private notes and highlights.'));return options.call(resource,method,body)}
 function redraw(){
  root.querySelectorAll('mark[data-reader-mark]').forEach(mark=>{const p=mark.parentNode;mark.replaceWith(...Array.from(mark.childNodes));p?.normalize()});hits=[]
  const found=new Set<string>()
  const languages=new Set([options.language,...items.map(a=>a.language),...Array.from(root.querySelectorAll<HTMLElement>('.reading-translation')).map(n=>n.lang)])
  for(const language of languages){const c=corpus(root,language,options.language),ranges:{start:number;end:number;id?:string;color?:string;search?:number}[]=[]
   for(const a of items.filter(a=>a.language===language&&!a.deleted)){const at=locate(c.text,a);if(at>=0)ranges.push({start:at,end:at+a.quote.length,id:a.id,color:a.color})}
   const visible=language===options.language?root.dataset.readingMode!=='translation':root.dataset.readingMode!=='original'
   if(query&&visible){const lower=c.text.toLocaleLowerCase(),q=query.toLocaleLowerCase();let at=lower.indexOf(q),n=0;while(at>=0&&n<500){ranges.push({start:at,end:at+q.length,search:n++});at=lower.indexOf(q,at+Math.max(1,q.length))}}
   for(const entry of c.nodes){const covers=ranges.filter(r=>r.start<entry.end&&r.end>entry.start);if(!covers.length)continue
    const cuts=[...new Set([entry.start,entry.end,...covers.flatMap(r=>[Math.max(entry.start,r.start),Math.min(entry.end,r.end)])])].sort((a,b)=>a-b),frag=document.createDocumentFragment()
    for(let i=0;i<cuts.length-1;i++){const text=entry.node.data.slice(cuts[i]-entry.start,cuts[i+1]-entry.start),rs=covers.filter(r=>r.start<=cuts[i]&&r.end>=cuts[i+1]);if(!rs.length){frag.append(text);continue}
     const mark=document.createElement('mark');mark.dataset.readerMark='true';mark.textContent=text;const annotation=rs.find(r=>r.id);if(annotation){mark.dataset.annotation=annotation.id;mark.dataset.color=annotation.color;mark.title=t('Private highlight')}
     const hit=rs.find(r=>r.search!==undefined);if(hit){mark.classList.add('reader-match');const key=language+':'+hit.search;if(!found.has(key)){found.add(key);hits.push(mark)}}frag.append(mark)
    }entry.node.replaceWith(frag)
   }
  }
 }
 async function load(){const requestGeneration=generation;const result=await call('annotations','GET');if(!active||generation!==requestGeneration)return;items=result.annotations||[];redraw()}
 async function persist(a:Annotation){generation++;const result=await call('annotations','PUT',a);if(!active)return;items=items.filter(x=>x.id!==a.id);if(!result.annotation.deleted)items.push(result.annotation);redraw();say('Saved privately.')}
 function edit(a:Annotation){const d=modal('Private note'),q=document.createElement('blockquote');q.textContent=a.quote;d.append(q)
  const note=document.createElement('textarea');note.rows=5;note.maxLength=5000;note.placeholder=t('Write a private note…');note.setAttribute('aria-label',t('Private note'));note.value=a.note;d.append(note)
  const colors=document.createElement('div');colors.className='reader-colors';d.append(colors);let color=a.color;dirtyCheck=()=>note.value!==a.note||color!==a.color
  for(const value of ['yellow','green','pink','blue']){const b=button(value,()=>{color=value;for(const child of colors.children)child.setAttribute('aria-pressed',String(child===b))},colors);b.dataset.color=value;b.setAttribute('aria-pressed',String(value===color))}
  const error=document.createElement('p');error.setAttribute('role','status');d.append(error)
  const save=button('Save',async()=>{save.disabled=true;try{await persist({...a,note:note.value,color,operation:crypto.randomUUID()});close(true)}catch(e){error.textContent=(e as Error).message}finally{save.disabled=false}},d)
  if(a.version)button('Delete highlight',async()=>{try{await persist({...a,deleted:true,operation:crypto.randomUUID()});close(true)}catch(e){error.textContent=(e as Error).message}},d)
 }
 button('Contents',()=>{const d=modal('Contents'),list=document.createElement('nav');list.className='reader-contents';d.append(list);const headings=Array.from(root.querySelectorAll<HTMLElement>('h1,h2,h3,h4')).filter(h=>root.dataset.readingMode==='translation'?!h.closest('.reading-source'):!h.closest('.reading-translation'))
  headings.forEach(h=>{const b=button(h.textContent?.trim()||t('Section'),()=>{close();h.scrollIntoView({block:'start'});h.tabIndex=-1;h.focus({preventScroll:true})},list);b.style.paddingInlineStart=`${12+(Number(h.tagName[1])-1)*12}px`});if(!headings.length)list.textContent=t('This paper has no section headings.')})
 const search=document.createElement('div');search.className='reader-search';search.hidden=true
 const searchInput=document.createElement('input');searchInput.type='search';searchInput.maxLength=200;searchInput.placeholder=t('Search this paper');searchInput.setAttribute('aria-label',t('Search this paper'))
 const count=document.createElement('span');count.setAttribute('role','status')
 const go=(delta:number)=>{if(hits.length){current=(current+delta+hits.length)%hits.length;hits[current].scrollIntoView({block:'center'});hits.forEach((h,i)=>h.classList.toggle('reader-current',i===current))}count.textContent=hits.length?`${current+1} / ${hits.length}`:t('No matches')}
 button('Search',()=>{search.hidden=!search.hidden;if(!search.hidden)searchInput.focus();else{query='';searchInput.value='';redraw()}})
 search.append(searchInput,count);button('Previous',()=>go(-1),search);button('Next',()=>go(1),search);button('Done',()=>{search.hidden=true;query='';searchInput.value='';redraw()},search)
 on(searchInput,'input',()=>{query=searchInput.value.trim();current=0;redraw();go(0)})
 on(searchInput,'keydown',((e:KeyboardEvent)=>{if(e.key==='Enter'){e.preventDefault();go(e.shiftKey?-1:1)}}) as EventListener)
 button('Highlights',async()=>{const d=modal('Highlights');const body=document.createElement('div');d.append(body);body.textContent=t('Loading…');try{await load();if(dialog!==d)return;body.textContent='';if(!items.length)body.textContent=t('Select a passage to highlight it or add a private note.');for(const a of items){const row=document.createElement('div');row.className='reader-highlight-row';button(a.quote,()=>{close();const mark=Array.from(root.querySelectorAll<HTMLElement>('[data-annotation]')).find(n=>n.dataset.annotation===a.id);if(mark)mark.scrollIntoView({block:'center'});else edit(a)},row);if(a.note){const p=document.createElement('p');p.textContent=a.note;row.append(p)}button('Edit',()=>edit(a),row);body.append(row)}}catch(e){body.textContent=(e as Error).message}})
 button('Notes',async()=>{const d=modal('Private notebook'),note=document.createElement('textarea'),message=document.createElement('p');note.rows=12;note.maxLength=50000;note.setAttribute('aria-label',t('Private notes'));note.disabled=true;d.append(note,message);let version='',savedText='';dirtyCheck=()=>!note.disabled&&note.value!==savedText;const save=button('Save',async()=>{save.disabled=true;try{const result=await call('notes','PUT',{text:note.value,version});if(dialog===d){version=result.version;savedText=note.value;message.textContent=t('Saved privately.')}}catch(e){message.textContent=(e as Error).message}finally{save.disabled=false}},d);save.disabled=true;try{const data=await call('notes','GET');if(dialog!==d)return;note.value=data.text;savedText=data.text;version=data.version;note.disabled=false;save.disabled=false}catch(e){message.textContent=(e as Error).message}})
 const selectionBar=document.createElement('span');selectionBar.className='reader-selection';selectionBar.hidden=true
 button('Highlight',async()=>{if(!selection)return;const a=selection;try{await persist(a);selectionBar.hidden=true;window.getSelection()?.removeAllRanges()}catch(e){say((e as Error).message)}},selectionBar)
 button('Add note',()=>{if(selection)edit(selection)},selectionBar);bar.append(selectionBar,status,search)
 on(document,'keydown',((e:KeyboardEvent)=>{if(!dialog)return;if(e.key==='Escape'){e.preventDefault();close()}if(e.key==='Tab'){const focusable=Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),textarea:not(:disabled),input:not(:disabled)'));const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}) as EventListener)
 on(document,'selectionchange',()=>{selection=anchorSelection(root,options.revision,options.language);selectionBar.hidden=!selection})
 on(bar,'pointerdown',((e:PointerEvent)=>{if((e.target as HTMLElement).closest('.reader-selection'))e.preventDefault()}) as EventListener)
 on(root,'click',((e:MouseEvent)=>{const target=e.target as HTMLElement,img=target.closest('img');if(img){e.preventDefault();zoom(img as HTMLImageElement);return}const id=target.closest<HTMLElement>('[data-annotation]')?.dataset.annotation;if(id&&!window.getSelection()?.toString()){const a=items.find(x=>x.id===id);if(a)edit(a)}}) as EventListener)
 function zoom(img:HTMLImageElement){const d=modal('Figure');d.classList.add('reader-image-dialog');const controls=document.createElement('div'),viewport=document.createElement('div'),copy=img.cloneNode(false) as HTMLImageElement;copy.removeAttribute('loading');copy.style.maxWidth='none';viewport.className='reader-image-viewport';viewport.append(copy);let factor=1
  const scale=()=>{copy.style.width=`${Math.max(280,Math.min(img.naturalWidth||800,window.innerWidth-64))*factor}px`};button('−',()=>{factor=Math.max(.5,factor/1.4);scale()},controls);button('Reset',()=>{factor=1;scale()},controls);button('+',()=>{factor=Math.min(8,factor*1.4);scale()},controls);d.append(controls,viewport);scale()
  // Browser/WebView pinch remains available; controls and scrolling work with mouse/keyboard.
 }
 root.querySelectorAll<HTMLImageElement>('img').forEach(img=>{img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label',t('Zoom figure')+(img.alt?': '+img.alt:''));on(img,'keydown',((e:KeyboardEvent)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();zoom(img)}}) as EventListener)})
 const observer=new MutationObserver(()=>{if(query)redraw()});observer.observe(root,{attributes:true,attributeFilter:['data-reading-mode']})
 if(options.call)void load().catch(()=>{})
 return ()=>{active=false;abort.abort();observer.disconnect();close(true);bar.remove();}
}

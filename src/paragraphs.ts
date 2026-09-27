export function paragraphActions(root:HTMLElement,label:string,discuss:(quote:string,id:string)=>void) {
 const counts=new Map<string,number>()
 for(const paragraph of root.querySelectorAll<HTMLElement>('p,li,blockquote,div')) {
  if(paragraph.closest('.author,td,th,pre,code,svg,mjx-container,mjx-assistive-mml')||paragraph.querySelector('p,li,blockquote,div'))continue
  const clone=paragraph.cloneNode(true) as HTMLElement;clone.querySelectorAll('mjx-assistive-mml,.paragraph-comment').forEach(n=>n.remove())
  const quote=clone.textContent?.replace(/\s+/g,' ').trim()||'';if(quote.length<40)continue
  let hash=2166136261;for(const letter of quote)hash=Math.imul(hash^letter.codePointAt(0)!,16777619)
  const key=(hash>>>0).toString(16),n=(counts.get(key)||0)+1;counts.set(key,n);const id=`p-${key}-${n}`
  paragraph.dataset.paragraph=id
  const button=document.createElement('button');button.type='button';button.className='paragraph-comment';button.setAttribute('aria-label',label);button.title=label
  button.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h6"/></svg>'
  button.addEventListener('pointerdown',e=>e.preventDefault())
  button.addEventListener('click',e=>{e.stopPropagation();discuss(quote.slice(0,1200),id)})
  paragraph.append(button)
 }
}

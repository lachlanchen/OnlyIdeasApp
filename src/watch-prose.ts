/** Bounded rendered prose for the explicit public-paper Watch action. */
export function watchProse(root: HTMLElement): string {
  const prose:string[]=[]
  for(const element of root.querySelectorAll<HTMLElement>('p,li,blockquote,div')) {
    if(element.closest('.author,td,th,pre,code,svg,mjx-container,mjx-assistive-mml')||element.querySelector('p,li,blockquote,div'))continue
    const copy=element.cloneNode(true) as HTMLElement;copy.querySelectorAll('.paragraph-comment').forEach(n=>n.remove())
    if(copy.querySelector('mjx-container,svg,img,table')){if(prose.length)break;continue}
    const text=copy.textContent?.replace(/\s+/g,' ').trim()||''
    if(text.length<80)continue
    if(prose.length>=24||new TextEncoder().encode([...prose,text].join('\n\n')).length>12000)break
    prose.push(text)
  }
  return prose.join('\n\n')
}

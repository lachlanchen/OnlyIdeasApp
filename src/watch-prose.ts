import type {ReadingMode} from './parallel-reader'
/** Plain, bounded text from the rendered edition. Never export math accessibility
 * markup, hidden translations, discussion controls or attribution as prose. */
export function watchProse(root: HTMLElement, mode: ReadingMode = 'original'): string {
 const prose: string[] = []
 for (const element of root.querySelectorAll<HTMLElement>('p,li,blockquote,div')) {
  if (element.closest('.author,.reading-language-label,.reading-pair-actions,.source-attribution,td,th,pre,code,svg,mjx-container,mjx-assistive-mml') || element.querySelector('p,li,blockquote,div')) continue
  const target=element.closest<HTMLElement>('.reading-translation'),source=element.closest<HTMLElement>('.reading-source')
  if (mode==='original' && target || mode==='translation' && !target) continue
  const copy=element.cloneNode(true) as HTMLElement
  copy.querySelectorAll('.paragraph-comment').forEach(n=>n.remove())
  if(copy.querySelector('mjx-container,svg,img,table')) {if(prose.length) break;continue}
  const text=copy.textContent?.replace(/\s+/g,' ').trim() || ''
  if (!text || (text.length<80 && !/[.!?。！？…]$/.test(text))) continue
  const language=(target || source)?.lang
  const block=mode==='interlaced' && language ? `[${language}] ${text}` : text
  if(prose.length>=24 || new TextEncoder().encode([...prose,block].join('\n\n')).length>12000) break
  prose.push(block)
 }
 return prose.join('\n\n')
}
export function watchEditions(root: HTMLElement): Record<ReadingMode,string> {
 return {original:watchProse(root),translation:watchProse(root,'translation'),interlaced:watchProse(root,'interlaced')}
}

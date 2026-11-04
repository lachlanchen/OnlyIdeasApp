/** Keep a passage, rather than a pixel offset, when a reading surface reflows.
 * Works with an element scroller or the document. No storage or network effects.
 */
export function preserveReadingViewport(scroller: HTMLElement, content: HTMLElement, selector: string, options?: { followEnd: () => boolean }) {
  if (typeof ResizeObserver === 'undefined') return () => {}
  const documentScroll = scroller === document.scrollingElement
  const eventTarget = documentScroll ? window : scroller
  const top = () => documentScroll ? 0 : scroller.getBoundingClientRect().top
  let width = content.clientWidth
  let height = scroller.clientHeight
  let contentHeight = content.clientHeight
  let followedEnd = options?.followEnd() ?? false
  let anchor: { node: HTMLElement; fraction: number; offset: number } | undefined
  let atStart = scroller.scrollTop < 1
  const capture = () => {
    // A browser can emit scroll after reflow but before ResizeObserver. Do not
    // replace the old passage with the one at the old pixel position.
    if (content.clientWidth <= 0 || scroller.clientHeight <= 0 || width !== content.clientWidth || height !== scroller.clientHeight || contentHeight !== content.clientHeight) return
    followedEnd = options?.followEnd() ?? false
    atStart = scroller.scrollTop < 1
    const edge = top() + 12
    const nodes = Array.from(content.querySelectorAll<HTMLElement>(selector))
    const node = nodes.find(n => n.getBoundingClientRect().height > 0 && n.getBoundingClientRect().bottom > edge)
    if (!node) { anchor = undefined; return }
    const rect = node.getBoundingClientRect()
    anchor = { node, fraction: Math.max(0, (edge - rect.top) / rect.height), offset: Math.max(0, rect.top - edge) }
  }
  capture()
  const observer = new ResizeObserver(() => {
    // Scene/display transitions can briefly give an existing view zero space.
    // Keep the last visible anchor until there is a usable reading pane again.
    if (content.clientWidth <= 0 || scroller.clientHeight <= 0) return
    const changed = width !== content.clientWidth || height !== scroller.clientHeight || contentHeight !== content.clientHeight
    width = content.clientWidth
    height = scroller.clientHeight
    contentHeight = content.clientHeight
    if (!changed) return
    // Keep the latest message visible through a keyboard/fold transition. A
    // browser-generated scroll during reflow must not turn following off.
    if (options && (followedEnd || options.followEnd())) scroller.scrollTop = scroller.scrollHeight
    else if (atStart) scroller.scrollTop = 0
    else if (anchor?.node.isConnected) {
      const rect = anchor.node.getBoundingClientRect()
      scroller.scrollTop += rect.top + anchor.fraction * rect.height - anchor.offset - top() - 12
    }
    capture()
  })
  observer.observe(content)
  if (scroller !== content) observer.observe(scroller)
  eventTarget.addEventListener('scroll', capture, { passive: true })
  return () => { observer.disconnect(); eventTarget.removeEventListener('scroll', capture) }
}

/** Restore a stable source passage after a translated document replaces its DOM. */
export function captureReadingPosition(content:HTMLElement) {
  const scroller=document.scrollingElement as HTMLElement|null
  if(!scroller)return()=>{}
  const atStart=scroller.scrollTop<1,edge=12
  const node=Array.from(content.querySelectorAll<HTMLElement>('.reading-pair,[data_line_start]')).find(n=>{const r=n.getBoundingClientRect();return r.height>0&&r.bottom>edge})
  if(!node)return()=>{}
  const rect=node.getBoundingClientRect(),passage=node.closest<HTMLElement>('[data-passage]')?.dataset.passage
  const line=node.getAttribute('data_line_start')||node.querySelector('[data_line_start]')?.getAttribute('data_line_start')
  const fraction=Math.max(0,(edge-rect.top)/rect.height),offset=Math.max(0,rect.top-edge)
  return()=>{
    if(atStart){scroller.scrollTop=0;return}
    let target=passage?Array.from(content.querySelectorAll<HTMLElement>('[data-passage]')).find(n=>n.dataset.passage===passage):undefined
    target ||= Array.from(content.querySelectorAll<HTMLElement>('[data_line_start]')).find(n=>n.getAttribute('data_line_start')===line&&!n.closest('.reading-translation'))
    if(target&&target.getBoundingClientRect().height<=0)target=target.closest<HTMLElement>('.reading-pair')||undefined
    if(!target)return
    const next=target.getBoundingClientRect();if(next.height>0)scroller.scrollTop+=next.top+fraction*next.height-offset-edge
  }
}

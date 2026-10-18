/** Keep a passage, rather than a pixel offset, when a reading surface reflows.
 * Works with an element scroller or the document. No storage or network effects.
 */
export function preserveReadingViewport(scroller: HTMLElement, content: HTMLElement, selector: string) {
  if (typeof ResizeObserver === 'undefined') return () => {}
  const documentScroll = scroller === document.scrollingElement
  const eventTarget = documentScroll ? window : scroller
  const top = () => documentScroll ? 0 : scroller.getBoundingClientRect().top
  let width = content.clientWidth
  let height = scroller.clientHeight
  let anchor: { node: HTMLElement; fraction: number; offset: number } | undefined
  let atStart = scroller.scrollTop < 1
  const capture = () => {
    // A browser can emit scroll after reflow but before ResizeObserver. Do not
    // replace the old passage with the one at the old pixel position.
    if (width !== content.clientWidth || height !== scroller.clientHeight) return
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
    const changed = width !== content.clientWidth || height !== scroller.clientHeight
    width = content.clientWidth
    height = scroller.clientHeight
    if (!changed) return
    if (atStart) scroller.scrollTop = 0
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

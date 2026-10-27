/** Re-measure an existing editor when its pane or keyboard changes size. */
export function fitComposer(element: HTMLTextAreaElement, maximum = 144) {
  const available = window.visualViewport?.height ?? window.innerHeight
  const limit = Math.min(maximum, Math.max(44, available * .28))
  const row = element.parentElement
  const minimum = row?.style.getPropertyValue('min-height') ?? ''
  const priority = row?.style.getPropertyPriority('min-height') ?? ''
  // Measuring with height:auto briefly grows the neighboring message viewport
  // and clamps its scrollTop. Hold this row while measuring so a resize cannot
  // silently move the latest message out of view.
  if (row) row.style.minHeight = `${row.getBoundingClientRect().height}px`
  try {
    element.style.height = 'auto'
    const natural = element.scrollHeight
    element.style.height = `${Math.min(limit, Math.max(44, natural))}px`
    element.style.overflowY = natural > limit ? 'auto' : 'hidden'
  } finally {
    if (minimum) row?.style.setProperty('min-height', minimum, priority)
    else row?.style.removeProperty('min-height')
  }
}

export function observeComposer(element: HTMLTextAreaElement, maximum = 144) {
  let width = element.clientWidth
  const fit = () => fitComposer(element, maximum)
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
    if (width === element.clientWidth) return
    width = element.clientWidth
    fit()
  })
  observer?.observe(element)
  element.addEventListener('input', fit)
  window.addEventListener('resize', fit)
  window.visualViewport?.addEventListener('resize', fit)
  fit()
  return () => {
    observer?.disconnect()
    element.removeEventListener('input', fit)
    window.removeEventListener('resize', fit)
    window.visualViewport?.removeEventListener('resize', fit)
  }
}

import { useEffect, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import type { Paper } from './api'
import bundleUrl from 'mathpix-markdown-it/es5/bundle.js?url'

type RendererWindow = Window & { markdownToHTML?: (text: string, options: Record<string, unknown>) => string }
let renderer: Promise<void> | undefined
function loadRenderer() {
  return renderer ||= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script'); script.src = bundleUrl; script.async = true
    script.onload = () => resolve(); script.onerror = () => { renderer = undefined; script.remove(); reject(new Error('Renderer unavailable')) }
    document.head.append(script)
  })
}
export function ReaderContent({ paper, onSelection, onSection }: { paper: Paper; onSelection?: (quote: string, section: string) => void; onSection?: (section: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setError('')
    loadRenderer().then(() => {
      if (!active || !ref.current) return
      const render = (window as RendererWindow).markdownToHTML
      if (!render) throw new Error('Renderer unavailable')
      const rendered = render(paper.mmd || '', { htmlTags: false, width: Math.max(280, ref.current.clientWidth), linkify: false, openLinkInNewWindow: true, accessibility: { assistiveMml: true }, outMath: { include_svg: true } })
      const clean = DOMPurify.sanitize(rendered, { USE_PROFILES: { html: true, svg: true, mathMl: true }, ADD_TAGS: ['mjx-container', 'mjx-assistive-mml'], ADD_ATTR: ['jax', 'focusable', 'viewBox'], FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'button'], FORBID_ATTR: ['srcdoc', 'srcset'] })
      const template = document.createElement('template'); template.innerHTML = clean
      template.content.querySelectorAll('img').forEach(img => {
        const path = img.getAttribute('src')?.replace(/^\.\//, '')
        if (!path || !paper.assets.some(a => a.path === path)) { img.replaceWith(document.createTextNode('[Figure unavailable in this version]')); return }
        img.src = `/content/${paper.id}/${path}`; img.loading = 'lazy'; img.decoding = 'async'
      })
      template.content.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href') || ''
        if (!href.startsWith('#') && !/^https?:\/\//i.test(href)) link.removeAttribute('href')
        link.rel = 'noopener noreferrer'; if (!href.startsWith('#')) link.target = '_blank'
      })
      // Render the entire paper together so equation numbers and cross-references survive.
      // Then associate each top-level heading block with the stable source section.
      const wrapper = document.createElement('div'); let index = -1, section: HTMLElement | undefined
      for (const node of Array.from(template.content.childNodes)) {
        const heading = node instanceof HTMLElement && node.matches('h1,h2,h3')
        if (!section || heading) {
          if (!section && node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) continue
          index++
          section = document.createElement('section')
          const id = paper.sections?.[index]?.id || `derived-${paper.id}-${index}`
          section.id = id; section.dataset.section = id; section.className = 'paper-section'
          wrapper.append(section)
        }
        section.append(node)
      }
      const firstHeading = wrapper.querySelector('h1,h2,h3')
      if (firstHeading?.textContent?.trim().toLowerCase() === paper.title.trim().toLowerCase()) firstHeading.remove()
      ref.current.replaceChildren(wrapper)
    }).catch(() => { if (active) setError('The equation renderer could not load. Reload to try again; the original text is below.') })
    return () => { active = false }
  }, [paper])
  function select() {
    const selection = window.getSelection(), text = selection?.toString().trim() || ''
    const element = selection?.anchorNode?.parentElement
    if (text && ref.current?.contains(element || null)) onSelection?.(text.slice(0, 1200), element?.closest<HTMLElement>('[data-section]')?.dataset.section || paper.sections?.[0]?.id || '')
  }
  return <div className="paper-content" onPointerUp={select} onKeyUp={select} onClick={e => { const element = e.target as HTMLElement; const id = element.closest<HTMLElement>('[data-section]')?.dataset.section; if (id) onSection?.(id) }}>
    {error ? <><p role="alert">{error}</p><pre>{paper.mmd}</pre></> : <div ref={ref} aria-label="Paper text"><p className="muted">Preparing the reading view…</p></div>}
  </div>
}

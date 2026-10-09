import { useEffect, useRef, useState } from 'react'
import { paragraphActions } from './paragraphs'
import { t,languageNames } from './i18n'
import {cleanDocument,pairReading,readingMode,type ReadingView,type ReadingMode} from './parallel-reader'
import type { Paper } from './api'
import bundleUrl from '../.generated/document-math.js?url'
import { request, native } from './native'
import { downloadedPaper, offlineSession } from './offline'

type RendererWindow = Window & { markdownToHTML?: (text: string, options: Record<string, unknown>) => string }
let renderer: Promise<void> | undefined
function loadRenderer() {
  return renderer ||= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script'); script.src = bundleUrl; script.async = true
    script.onload = () => resolve(); script.onerror = () => { renderer = undefined; script.remove(); reject(new Error('Renderer unavailable')) }
    document.head.append(script)
  })
}
export function ReaderContent({ paper, reading, mode='original', assetBase, onSelection, onSection, onParagraph }: { paper: Paper; assetBase?:string; reading?:ReadingView; mode?:ReadingMode; onSelection?: (quote: string, section: string) => void; onSection?: (section: string) => void; onParagraph?:(quote:string,id:string)=>void }) {
  const ref = useRef<HTMLDivElement>(null)
  const currentMode = useRef(mode)
  currentMode.current = mode
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const objectURLs: string[] = []
    setError('')
    loadRenderer().then(async () => {
      if (!active || !ref.current) return
      const render = (window as RendererWindow).markdownToHTML
      if (!render) throw new Error('Renderer unavailable')
      const renderText=(text:string)=>render(text,{htmlTags:false,lineNumbering:true,width:Math.max(280,ref.current!.clientWidth),linkify:false,typographer:false,openLinkInNewWindow:true,accessibility:{assistiveMml:true},outMath:{include_svg:true}})
      const container=document.createElement('div');container.innerHTML=cleanDocument(renderText(paper.mmd||''))
      if(onParagraph)paragraphActions(container,t('Discuss paragraph'),onParagraph)
      if(reading)pairReading(container,reading,renderText,{source:languageNames[paper.language]||paper.language,translation:(languageNames[reading.language]||reading.language)+' · '+t('AI translation'),partial:t('Remaining passages use the original.')})
      const template = document.createElement('template');template.content.append(...Array.from(container.childNodes))
      const saved = assetBase ? undefined : await downloadedPaper(paper.id, (await offlineSession())?.user?.id)
      for (const img of template.content.querySelectorAll('img')) {
        const path = img.getAttribute('src')?.replace(/^\.\//, '')
        if (!path || !paper.assets.some(a => a.path === path)) { img.replaceWith(document.createTextNode('[Figure unavailable in this version]')); continue }
        const cached = saved?.paper.revision === paper.revision ? saved.figures[path] : undefined
        if (native || cached) {
          try {
            const blob = cached || await request(`${assetBase || `/content/${paper.id}`}/${path}`).then(r => { if (!r.ok) throw new Error(); return r.blob() })
            if (!active) return
            if (!blob) throw new Error('Figure unavailable')
            const url = URL.createObjectURL(blob); objectURLs.push(url); img.src = url
          } catch { img.replaceWith(document.createTextNode('[Figure unavailable. Connect and reopen this paper.]')); continue }
        } else img.src = `${assetBase || `/content/${paper.id}`}/${path}`
        img.removeAttribute('style'); img.removeAttribute('width'); img.removeAttribute('height')
        img.loading = 'lazy'; img.decoding = 'async'
      }
      if (!active || !ref.current) return
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
      ref.current.dataset.readingMode=currentMode.current
    }).catch(() => { if (active) setError(t("The equation renderer could not load. Reload to try again; the original text is below.")) })
    return () => { active = false; objectURLs.forEach(url => URL.revokeObjectURL(url)) }
  }, [paper,reading,assetBase])
  useEffect(()=>{if(ref.current)readingMode(ref.current,mode)},[mode])
  function select() {
    const selection = window.getSelection(), text = selection?.toString().trim() || ''
    const element = selection?.anchorNode?.parentElement
    if (text && ref.current?.contains(element || null)) onSelection?.(text.slice(0, 1200), element?.closest<HTMLElement>('[data-section]')?.dataset.section || paper.sections?.[0]?.id || '')
  }
  return <div className="paper-content" dir={paper.language==='ar'?'rtl':'ltr'} onPointerUp={select} onKeyUp={select} onClick={e => { const element = e.target as HTMLElement; const id = element.closest<HTMLElement>('[data-section]')?.dataset.section; if (id) onSection?.(id) }}>
    {error ? <><p role="alert">{error}</p><pre>{paper.mmd}</pre></> : <div ref={ref} aria-label={t("Paper text")}><p className="muted">{t("Preparing the reading view…")}</p></div>}
  </div>
}

import type { Paper, Session } from './api'
import { request, native, hasToken } from './native'
import type {ReadingView} from './parallel-reader'
type Download = { key: string; owner: string; paper: Paper; figures: Record<string, Blob>; pinned?: boolean; accessed?: number; readings?:Record<string,ReadingView> }
let generation = 0
window.addEventListener('storage', e => { if (e.key === 'onlyideas-offline-session') generation++ })
const database = new Promise<IDBDatabase>((resolve, reject) => {
  const r = indexedDB.open('onlyideas-reading', 1)
  r.onupgradeneeded = () => r.result.createObjectStore('papers', { keyPath: 'key' })
  r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error)
})
async function records(): Promise<Download[]> {
  const db = await database
  return new Promise((resolve, reject) => { const r = db.transaction('papers').objectStore('papers').getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
}
export async function offlineSession(): Promise<Session | null> {
  if (native && !await hasToken()) return null
  try { return JSON.parse(localStorage.getItem('onlyideas-offline-session') || 'null') } catch { return null }
}
export function rememberSession(s: Session) {
  let previous: string | undefined
  try { previous = JSON.parse(localStorage.getItem('onlyideas-offline-session') || 'null')?.user?.id } catch { /* invalid local metadata */ }
  if (previous !== s.user?.id) generation++
  if (s.user) localStorage.setItem('onlyideas-offline-session', JSON.stringify(s))
  else localStorage.removeItem('onlyideas-offline-session')
}
export async function downloadedPapers(owner?: string) { return (await records()).filter(r => r.owner === 'public' || r.owner === owner).map(r => r.paper) }
export async function downloadedPaper(id: string, owner?: string) { return (await records()).find(r => r.paper.id === id && (r.owner === 'public' || r.owner === owner)) }
export async function downloadPaper(paper: Paper, owner?: string, pinned = true) {
  const epoch = generation, existing = await downloadedPaper(paper.id, owner)
  if (paper.visibility !== 'public' && !owner) throw new Error('Sign in to save this paper on your device.')
  const figures: Record<string, Blob> = {}; let bytes = new Blob([paper.mmd || '']).size
  for (const asset of paper.assets) {
    if (generation !== epoch) return
    let blob = existing?.paper.revision === paper.revision ? existing.figures[asset.path] : undefined
    if (!blob) {
      const r = await request(`/content/${paper.id}/${asset.path}`)
      if (!r.ok) throw new Error('A figure could not be downloaded. Please try again.')
      blob = await r.blob()
    }
    bytes += blob.size
    if (bytes > 50_000_000) throw new Error('This paper is too large to save offline (50 MB limit).')
    figures[asset.path] = blob
  }
  const all = await records()
  if (pinned && all.filter(r=>r.pinned !== false).length >= 30 && (!existing || existing.pinned === false)) throw new Error('You have 30 pinned papers. Unpin one before adding another.')
  const scope = paper.visibility === 'public' ? 'public' : owner!
  const db = await database
  if (epoch !== generation) return
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('papers', 'readwrite')
    const next = { key: `${scope}:${paper.id}`, owner: scope, paper, figures, pinned: pinned || (existing ? existing.pinned !== false : false), accessed: Date.now(),readings:existing?.paper.revision===paper.revision&&existing.owner===scope?existing.readings:undefined } satisfies Download
    for (const r of all) if (r.paper.id === paper.id && r.key !== next.key) tx.objectStore('papers').delete(r.key)
    tx.objectStore('papers').put(next)
    const recent = [...all.filter(r=>r.key !== next.key), next].filter(r=>r.pinned === false).sort((a,b)=>(b.accessed||0)-(a.accessed||0))
    let bytes = 0
    recent.forEach((r,i)=>{ bytes += new Blob([r.paper.mmd||'']).size + Object.values(r.figures).reduce((n,b)=>n+b.size,0); if(i>=20 || bytes>150_000_000) tx.objectStore('papers').delete(r.key) })
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
  })
}
export async function cacheReading(view:ReadingView,owner?:string){
 const epoch=generation,saved=await downloadedPaper(view.paperId,owner);if(!saved||saved.paper.revision!==view.revision)return
 const db=await database;if(epoch!==generation)return
 await new Promise<void>((resolve,reject)=>{const tx=db.transaction('papers','readwrite'),r=tx.objectStore('papers').get(saved.key);r.onsuccess=()=>{const current=r.result as Download|undefined;if(current?.paper.revision===view.revision)tx.objectStore('papers').put({...current,readings:{...current.readings,[view.language]:view}})};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})
}
export async function removeDownload(id: string, owner?: string) {
  const db = await database, all = await records()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('papers', 'readwrite')
    for (const r of all) if (r.paper.id === id && (r.owner === 'public' || r.owner === owner)) tx.objectStore('papers').delete(r.key)
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
  })
}
export async function clearPrivateDownloads() {
  generation++
  localStorage.removeItem('onlyideas-library')
  const all = await records(), db = await database
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('papers', 'readwrite')
    for (const r of all) if (r.owner !== 'public') tx.objectStore('papers').delete(r.key)
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
  })
  localStorage.removeItem('onlyideas-offline-session')
  for (const key of Object.keys(localStorage)) if (/^onlyideas:/.test(key)) localStorage.removeItem(key)
}

export function rememberLibrary(papers: Paper[], owner?: string) { localStorage.setItem('onlyideas-library', JSON.stringify({ owner: owner || 'public', papers })) }
export async function cachedLibrary(owner?: string): Promise<Paper[]> {
  try { const saved = JSON.parse(localStorage.getItem('onlyideas-library') || 'null'); if (saved?.owner === (owner || 'public')) return saved.papers } catch { /* fall back to readable cached papers */ }
  return downloadedPapers(owner)
}
export async function reconcileCache(papers: Paper[], owner?: string) {
  const epoch = generation, visible = new Map(papers.map(p=>[p.id,p])), all = await records()
  for (const r of all) {
    if (epoch !== generation) return
    const summary = visible.get(r.paper.id)
    if ((r.owner === 'public' || r.owner === owner) && (!summary || summary.visibility !== r.paper.visibility)) await removeDownload(r.paper.id, owner)
  }
  for (const summary of papers.slice(0,3)) {
    if (epoch !== generation) return
    const saved = await downloadedPaper(summary.id,owner)
    if (saved?.paper.revision === summary.revision && saved.paper.visibility === summary.visibility && saved.paper.title === summary.title) continue
    try {
      const response = await request(`/api/papers/${summary.id}`)
      if (!response.ok) continue
      const {paper} = await response.json()
      if (epoch === generation) await downloadPaper(paper, owner, false)
    } catch { /* A network interruption must not hide the saved library. */ }
  }
}

export async function unpinPaper(id: string, owner?: string) {
  const r = await downloadedPaper(id,owner); if (!r) return
  const db = await database
  await new Promise<void>((resolve,reject)=>{ const tx=db.transaction('papers','readwrite'); tx.objectStore('papers').put({...r,pinned:false,accessed:Date.now()}); tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error) })
}

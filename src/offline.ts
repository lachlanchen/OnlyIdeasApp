import type { Paper, Session } from './api'
import { request, native, hasToken } from './native'
type Download = { key: string; owner: string; paper: Paper; figures: Record<string, Blob> }
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
  if (!native || !await hasToken()) return null
  try { return JSON.parse(localStorage.getItem('onlyideas-offline-session') || 'null') } catch { return null }
}
export function rememberSession(s: Session) {
  if (native && s.user) localStorage.setItem('onlyideas-offline-session', JSON.stringify(s))
  else localStorage.removeItem('onlyideas-offline-session')
}
export async function downloadedPapers(owner?: string) { return (await records()).filter(r => r.owner === 'public' || r.owner === owner).map(r => r.paper) }
export async function downloadedPaper(id: string, owner?: string) { return (await records()).find(r => r.paper.id === id && (r.owner === 'public' || r.owner === owner)) }
export async function downloadPaper(paper: Paper, owner?: string) {
  if (paper.visibility !== 'public' && !owner) throw new Error('Sign in to save this paper on your device.')
  const figures: Record<string, Blob> = {}; let bytes = new Blob([paper.mmd || '']).size
  for (const asset of paper.assets) {
    const r = await request(`/content/${paper.id}/${asset.path}`)
    if (!r.ok) throw new Error('A figure could not be downloaded. Please try again.')
    const blob = await r.blob(); bytes += blob.size
    if (bytes > 50_000_000) throw new Error('This paper is too large to save offline (50 MB limit).')
    figures[asset.path] = blob
  }
  const all = await records()
  if (all.length >= 30 && !all.some(r => r.paper.id === paper.id)) throw new Error('You have 30 downloaded papers. Remove one before adding another.')
  const scope = paper.visibility === 'public' ? 'public' : owner!
  const db = await database
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('papers', 'readwrite')
    tx.objectStore('papers').put({ key: `${scope}:${paper.id}`, owner: scope, paper, figures } satisfies Download)
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
  })
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
  const all = await records(), db = await database
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('papers', 'readwrite')
    for (const r of all) if (r.owner !== 'public') tx.objectStore('papers').delete(r.key)
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
  })
  localStorage.removeItem('onlyideas-offline-session')
  for (const key of Object.keys(localStorage)) if (/^onlyideas:/.test(key)) localStorage.removeItem(key)
}

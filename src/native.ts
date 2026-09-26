import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { SecureStorage, KeychainAccess } from '@aparajita/capacitor-secure-storage'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export const native = Capacitor.isNativePlatform()
export const serviceOrigin = native ? 'https://agent.onlyideas.art' : ''
const sessionKey = 'onlyideas.session.v1', flowKey = 'onlyideas.login.v1'
let sessionToken: string | null = null
let tokenRevision = 0
const ready = native ? SecureStorage.get(sessionKey, false, false).then(value => { sessionToken = typeof value === 'string' ? value : null }) : Promise.resolve()
export async function hasToken() { await ready; return !!sessionToken }
export async function authRevision() { await ready; return tokenRevision }
// Credentials never enter localStorage, a link, a log or the share sheet.
export async function saveToken(value: string | null) {
  if (!native) return
  await ready
  if (sessionToken === value) return
  const previous = sessionToken
  sessionToken = value
  tokenRevision++
  try {
    if (value) await SecureStorage.set(sessionKey, value, false, false, KeychainAccess.whenUnlockedThisDeviceOnly)
    else await SecureStorage.remove(sessionKey, false)
  } catch (error) { sessionToken = previous; tokenRevision++; throw error }
}
export async function request(path: string, options: RequestInit = {}) {
  await ready
  const headers = new Headers(options.headers)
  if (typeof options.body === 'string' && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (native) { headers.set('X-OnlyIdeas-Client', 'native'); if (sessionToken) headers.set('Authorization', `Bearer ${sessionToken}`) }
  return fetch(serviceOrigin + path, { ...options, headers, credentials: native ? 'omit' : 'same-origin', signal: options.signal || AbortSignal.timeout(60_000) })
}
const random = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
async function authPost(path: string, data: object) {
  const r = await request(`/api/auth/native/${path}`, { method: 'POST', body: JSON.stringify(data) })
  const result = await r.json()
  if (!r.ok) throw new Error(result.error || 'Sign-in could not finish. Please try again.')
  return result
}
let completing: Promise<boolean> | undefined
let authGeneration = 0
export function completeSignIn(): Promise<boolean> {
  if (!native) return Promise.resolve(false)
  return completing ||= (async () => {
    const generation = authGeneration
    const stored = await SecureStorage.get(flowKey, false, false)
    if (typeof stored !== 'string') return false
    const data = JSON.parse(stored)
    if (data.expires < Date.now()) { await cancelSignIn(); throw new Error('Sign-in expired. Please try again.') }
    const result = await authPost('complete', { flow: data.flow, verifier: data.verifier })
    if (result.pending) return false
    if (generation !== authGeneration) return false
    await saveToken(result.token)
    await SecureStorage.remove(flowKey, false)
    await Browser.close().catch(() => {})
    window.dispatchEvent(new Event('onlyideas:signed-in'))
    return true
  })().finally(() => { completing = undefined })
}
export async function cancelSignIn() { authGeneration++; if (native) { await SecureStorage.remove(flowKey, false); await Browser.close().catch(() => {}) } }
export async function signIn() {
  if (!native) { window.location.assign('/api/auth/github'); return }
  authGeneration++
  const verifier = random()
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  const challenge = btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const flow = await authPost('start', { challenge })
  const url = new URL(flow.url)
  if (url.origin !== serviceOrigin || url.pathname !== '/api/auth/github') throw new Error('Invalid sign-in address.')
  await SecureStorage.set(flowKey, JSON.stringify({ ...flow, verifier, expires: Date.now() + 600_000 }), false, false, KeychainAccess.whenUnlockedThisDeviceOnly)
  await Browser.open({ url: flow.url, toolbarColor: '#244f45' })
}
export async function openExternal(url: string) {
  if (!/^https?:\/\//i.test(url)) return
  if (native) await Browser.open({ url, toolbarColor: '#244f45' })
  else window.open(url, '_blank', 'noopener,noreferrer')
}
export async function clearExportCache() {
  if (native) await Filesystem.rmdir({ directory: Directory.Cache, path: 'exports', recursive: true }).catch(() => {})
}
export async function exportMarkdown(id: string, text: string) {
  const filename = `${id}.mmd`
  if (native) {
    const file = await Filesystem.writeFile({ directory: Directory.Cache, path: `exports/${filename}`, data: text, encoding: Encoding.UTF8, recursive: true })
    await Share.share({ title: 'Original paper · OnlyIdeas', files: [file.uri], dialogTitle: 'Save or share Markdown' })
    // A receiving Android app may read the URI after the chooser has resolved.
    // Keep the app-private cache until the next cold launch or sign-out.
  } else {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }))
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
export function initNative() {
  if (!native) return
  void clearExportCache()
  document.documentElement.dataset.native = Capacitor.getPlatform()
  const finish = () => completeSignIn().catch(e => { window.dispatchEvent(new CustomEvent('onlyideas:auth-error', { detail: e.message })); return false })
  void App.addListener('appUrlOpen', ({ url }) => { if (url.startsWith('art.onlyideas.app://oauth/complete?')) void finish() })
  void App.addListener('appStateChange', async ({ isActive }) => { if (isActive && !await finish()) window.dispatchEvent(new Event('onlyideas:resume')) })
  void Browser.addListener('browserFinished', finish)
  void App.addListener('backButton', () => {
    const dialog = document.querySelector('dialog[open]')
    if (dialog) { dialog.dispatchEvent(new Event('cancel')); return }
    const close = document.querySelector<HTMLButtonElement>('.panel-close')
    if (close && getComputedStyle(close).display !== 'none') { close.click(); return }
    const back = document.querySelector<HTMLButtonElement>('.reading-toolbar > button')
    if (back) back.click(); else void App.minimizeApp()
  })
  document.addEventListener('click', e => {
    const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]')
    if (anchor && /^https?:/.test(anchor.getAttribute('href') || '')) { e.preventDefault(); void openExternal(anchor.href) }
  })
  let edge: { x: number; y: number } | undefined
  document.addEventListener('touchstart', e => {
    const p = e.touches[0], target = e.target as HTMLElement
    edge = e.touches.length === 1 && p.clientX < 22 && !target.closest('input,textarea,dialog,.reading-panel') && !window.getSelection()?.toString() ? { x: p.clientX, y: p.clientY } : undefined
  }, { passive: true })
  document.addEventListener('touchend', e => {
    const p = e.changedTouches[0]
    if (edge && p.clientX - edge.x > 90 && Math.abs(p.clientY - edge.y) < 40 && !window.getSelection()?.toString()) document.querySelector<HTMLButtonElement>('.reading-toolbar > button')?.click()
    edge = undefined
  }, { passive: true })
  void finish()
}

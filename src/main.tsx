import {Discovery,fuzzyMatch,metadata,type ResearchHit} from './Discovery'
import {PaperActions} from './PaperActions'
import {CreditsPanel,SharingOptions,authorizeImport} from './Credits'
import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, FileText, GitFork as Github, Globe2, Library, Loader2, MessageCircle, Plus, Search, Sparkles, StickyNote, Sun, Moon, X, Bookmark, Send, Languages, LockKeyhole, ExternalLink } from 'lucide-react'
import { api, post, APIError, type Paper, type Session, type Comment, type Job, type Artifact } from './api'
import { ReaderContent } from './ReaderContent'
import { initNative, signIn, cancelSignIn, completeSignIn, saveToken, authRevision, exportMarkdown, clearExportCache } from './native'
import { rememberSession, offlineSession, downloadedPapers, downloadedPaper, downloadPaper, removeDownload, clearPrivateDownloads, cachedLibrary, rememberLibrary, reconcileCache, unpinPaper } from './offline'
import { Agent } from './Agent'
import { t, useLanguage, setLanguage, languageNames } from './i18n'
import './style.css'
import './refresh.css'

const labels: Record<string, string> = { en: 'English', 'zh-Hans': '简体中文', 'zh-Hant': '繁體中文', ja: '日本語', ko: '한국어', ar: 'العربية', fr: 'Français', de: 'Deutsch', es: 'Español', ru: 'Русский', vi: 'Tiếng Việt' }
initNative()
function App() {
  const language=useLanguage()
  const [page, setPage] = useState('library')
  const openRequest = useRef(0)
  function clearPaper() { openRequest.current++; setPaper(null) }
  const [session, setSession] = useState<Session | null>(null), [papers, setPapers] = useState<Paper[]>([]), [paper, setPaper] = useState<Paper | null>(null)
  const [loading, setLoading] = useState(true), [message, setMessage] = useState(''), [query, setQuery] = useState(''), [shelf, setShelf] = useState('All papers')
  const [add, setAdd] = useState(false), [login, setLogin] = useState(false), [jobs, setJobs] = useState<Job[]>([]), [jobPanel, setJobPanel] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('onlyideas-theme') || 'system')
  const [savedState, setSavedState] = useState<{owner?:string;items:ResearchHit[]}>({items:[]})
  const savedItems = savedState.owner === session?.user?.id ? savedState.items : []
  const bookmarks = savedItems.flatMap(p => [p.id,p.paperId,p.ref].filter((id):id is string => !!id))
  const saving = useRef(new Set<string>())
  useEffect(() => {
    const owner = session?.user?.id; let active = true, request = 0
    if (!owner) { setSavedState({items:[]}); setShelf(s => s === 'Saved' ? 'All papers' : s); return }
    const refreshSaved = async () => { const n = ++request; try { const r = await api<{papers:ResearchHit[]}>('/saved'); if (active && n === request) setSavedState({owner,items:r.papers}) } catch {} }
    void refreshSaved()
    window.addEventListener('onlyideas:paper-saved',refreshSaved); window.addEventListener('focus',refreshSaved); window.addEventListener('online',refreshSaved)
    return () => { active = false; window.removeEventListener('onlyideas:paper-saved',refreshSaved); window.removeEventListener('focus',refreshSaved); window.removeEventListener('online',refreshSaved) }
  }, [session?.user?.id])
  const [offline, setOffline] = useState(false), [authBusy, setAuthBusy] = useState(false)
  const notify = (s: string) => setMessage(t(s))
  const refresh = async () => {
    const revision = await authRevision()
    if (loading) {
      const cached = await offlineSession(), list = await cachedLibrary(cached?.user?.id)
      if (list.length) { setSession(cached); setPapers(list); setLoading(false) }
    }
    try {
      const s = await api<Session>('/session')
      if (revision !== await authRevision()) return refresh()
      if (!s.user) { await saveToken(null); await clearPrivateDownloads() }
      rememberSession(s); setSession(s)
      const p = await api<{ papers: Paper[] }>('/papers'); if (revision !== await authRevision()) return; setPapers(p.papers); setOffline(false); rememberLibrary(p.papers,s.user?.id); void reconcileCache(p.papers,s.user?.id).catch(()=>{})
    } catch (e) {
      if (revision !== await authRevision()) return refresh()
      const cached = await offlineSession(); const saved = await downloadedPapers(cached?.user?.id)
      setSession(cached); setPapers(saved); setOffline(true)
      if (!saved.length) notify(t("The library could not connect. Check your connection and tap Try again."))
    } finally { setLoading(false) }
  }
  useEffect(() => {
    const signed = () => { setLogin(false); setAuthBusy(false); void refresh() }
    const error = (e: Event) => { notify((e as CustomEvent).detail); setAuthBusy(false) }
    const resume = () => { void refresh() }
    window.addEventListener('onlyideas:signed-in', signed); window.addEventListener('onlyideas:auth-error', error); window.addEventListener('onlyideas:resume', resume); window.addEventListener('online', resume)
    return () => { window.removeEventListener('onlyideas:signed-in', signed); window.removeEventListener('onlyideas:auth-error', error); window.removeEventListener('onlyideas:resume', resume); window.removeEventListener('online', resume) }
  }, [])
  useEffect(() => {
    if (!authBusy) return
    const timer = setInterval(() => { void completeSignIn().catch(e => { notify(e.message); setAuthBusy(false) }) }, 2500)
    return () => clearInterval(timer)
  }, [authBusy])
  useEffect(() => { refresh().catch(e => { notify(e.message); setLoading(false) }) }, [])
  useEffect(() => { const media=matchMedia('(prefers-color-scheme: dark)');const update=()=>{document.documentElement.dataset.theme=theme==='system'?(media.matches?'dark':'light'):theme};update();localStorage.setItem('onlyideas-theme',theme);media.addEventListener('change',update);return()=>media.removeEventListener('change',update) }, [theme])
  useEffect(() => { if (!message) return; const t = setTimeout(() => setMessage(''), 8000); return () => clearTimeout(t) }, [message])
  useEffect(() => {
    if (!session?.user) { setJobs([]); return }
    let active = true
    const poll = () => api<{ jobs: Job[] }>('/jobs').then(r => { if (active) setJobs(r.jobs) }).catch(() => {})
    void poll(); const timer = setInterval(poll, 4000); return () => { active = false; clearInterval(timer) }
  }, [session?.user?.id])
  useEffect(() => { if (jobs.some(j => j.state === 'completed')) api<{ papers: Paper[] }>('/papers').then(r => setPapers(r.papers)).catch(() => {}) }, [jobs.filter(j => j.state === 'completed').length])
  async function deleteMyAccount() {
    if (!confirm(t("Permanently delete your account, cloud papers, notes, comments and chats? Previously published GitHub copies and others’ copies may remain under their public license. This cannot be undone."))) return
    try {
      await api('/account', { method: 'DELETE', body: JSON.stringify({confirm:'DELETE'}) })
      await saveToken(null); await cancelSignIn(); await clearPrivateDownloads(); await clearExportCache()
      const prefix = `onlyideas:${session?.user?.id}:`
      Object.keys(localStorage).filter(k=>k.startsWith(prefix)).forEach(k=>localStorage.removeItem(k))
      clearPaper(); setSession(null); await refresh(); notify(t("Your account has been deleted."))
    } catch (e) { notify((e as Error).message) }
  }
  async function open(p: Paper) {
    const request = ++openRequest.current, revision = await authRevision(), owner = session?.user?.id
    const saved = await downloadedPaper(p.id, owner)
    if (request !== openRequest.current) return
    if (saved) { setPaper(saved.paper); setPage('library'); window.scrollTo(0, 0) }
    try {
      const result = await api<{ paper: Paper }>(`/papers/${p.id}`)
      if (request !== openRequest.current || revision !== await authRevision()) return
      setPaper(current => current?.id === p.id && current.revision === result.paper.revision && current.title === result.paper.title && current.visibility === result.paper.visibility ? current : result.paper)
      setPage('library'); if (!saved) window.scrollTo(0, 0)
      void downloadPaper(result.paper, owner, false).catch(()=>{})
    } catch (e) {
      if (request !== openRequest.current) return
      if (e instanceof APIError && [401,403,404].includes(e.status)) { await removeDownload(p.id,owner); clearPaper(); notify(e.message) }
      else if (!saved) notify((e as Error).message)
    }
  }
  useEffect(()=>{const id=new URLSearchParams(location.search).get('paper');if(id&&/^[\w-]+$/.test(id))void open({id}as Paper)},[session?.user?.id])
  async function save(id: string) {
    if (needLogin() || saving.current.has(id)) return
    saving.current.add(id)
    try { await api('/items/'+id,{method:'PUT',body:JSON.stringify({saved:!bookmarks.includes(id)})}); window.dispatchEvent(new Event('onlyideas:paper-saved')) }
    catch(e) { notify((e as Error).message) } finally { saving.current.delete(id) }
  }
  const needLogin = () => { if (!session?.user) { setLogin(true); return true } return false }
  const activeJobs = jobs.filter(j => ['queued', 'running'].includes(j.state))
  const filtered = papers.filter(p => (shelf !== 'Saved' || bookmarks.includes(p.id)) && (shelf !== 'My library' || p.visibility === 'private') && fuzzyMatch(query,`${p.title} ${p.authors} ${p.category} ${metadata(p)} ${p.doi||''}`))
  return <>
    <header className="app-header">
      <button className="brand" onClick={() => { clearPaper(); setPage('library') }} aria-label={t("OnlyIdeas home")}><img src="/mark.svg" alt=""/><span>OnlyIdeas<span className="brand-dot">.</span></span></button>
      <nav>{[['library','Library'],['agent','Agent']].map(([id,name])=><button key={id} className={page===id?'nav-active':''} onClick={()=>{if(id==='library')clearPaper();setPage(id)}}>{t(name)}</button>)}</nav>
      <div className="header-actions"><button className="icon-button" aria-label={t("Toggle theme")} onClick={() => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={18}/> : <Sun size={18}/>}</button><button className="account" aria-label={t("Open profile")} onClick={() => setPage('profile')}>{session?.user ? session.user.login : t("Profile")}</button></div>
    </header>
    {offline && <div className="connection-notice" role="status"><span>{t("Offline reading · downloaded papers")}</span><button onClick={() => void refresh()}>{t("Try again")}</button></div>}
    {page === 'profile' ? <main className="profile-page"><header><span className="profile-avatar">{session?.user?.name?.[0] || '◉'}</span><h1>{session?.user?.name || t('Your reading space')}</h1><p>{session?.user ? `@${session.user.login}` : t("Sign in to keep your papers and conversations together.")}</p></header>{session?.user && <CreditsPanel key={session.user.id}/>}<section><h2>{t("Reading preferences")}</h2><label>{t("App language")}<select aria-label={t("App language")} value={language} onChange={e=>setLanguage(e.target.value)}><option value="system">{t("System")}</option>{Object.entries(languageNames).map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></label><label>{t("Text size")}<select defaultValue={localStorage.getItem('onlyideas-text-size') || '18'} onChange={e=>{localStorage.setItem('onlyideas-text-size',e.target.value);notify(t("Text size saved for the next paper you open."))}}>{[15,16,18,20,22,24,28,32].map(v=><option key={v} value={v}>{v} px</option>)}</select></label><label>{t("Appearance")}<select value={theme} onChange={e=>setTheme(e.target.value)}><option value="system">{t("System")}</option><option value="light">{t("Light")}</option><option value="dark">{t("Dark")}</option></select></label></section><section><h2>{t("Your library")}</h2><p>{papers.filter(p=>p.visibility==='private').length} {t("private papers ·")}{savedItems.length} {t("saved")}</p><button className="secondary" onClick={()=>setPage('agent')}>{t("Your agent conversations")}</button></section><section><h2>{t("Account")}</h2>{session?.user && <><button className="secondary" onClick={async()=>{const reason=prompt(t("Which paper or AI response concerns you, and why?"));if(reason)try{await post('/reports',{reason});notify(t("Report sent for review."))}catch(e){notify((e as Error).message)}}}>{t("Report content")}</button><BlockedReaders notify={notify}/><button className="sign-out" onClick={deleteMyAccount}>{t("Delete account")}</button></>}{session?.user ? <button className="sign-out" onClick={async()=>{if(!confirm(t("Sign out on this device? Private offline downloads will be removed.")))return;try{await post('/auth/logout',{})}catch{}await saveToken(null);await cancelSignIn();await clearPrivateDownloads();await clearExportCache();clearPaper();setSession(null);await refresh()}}>{t("Sign out")}</button> : <button className="primary" onClick={()=>setLogin(true)}>{t("Sign in with GitHub")}</button>}<p><a href="https://lachlan.lazying.art/OnlyIdeasApp/privacy.html">{t("Privacy")}</a> · <a href="https://lachlan.lazying.art/OnlyIdeasApp/terms.html">{t("Community Terms")}</a> · <a href="https://lachlan.lazying.art/OnlyIdeasApp/support.html">{t("Support")}</a></p><p className="muted">{t("OnlyIdeas 1.0 · Private papers stay in your account. Agent conversations are saved so you can return to them.")}</p></section></main> : page === 'agent' ? <Agent viewJobs={()=>setJobPanel(true)} hasJobs={!!session?.user&&jobs.length>0} signedIn={!!session?.user} login={()=>setLogin(true)} notify={notify} openPaper={id=>void open({id} as Paper)}/> : paper ? <Reading key={`${paper.id}:${session?.user?.id || 'visitor'}`} paper={paper} session={session} notify={notify} needLogin={needLogin} onBack={() => setPaper(null)} save={() => save(paper.id)} saved={bookmarks.includes(paper.id)} jobs={jobs} onRefresh={() => open(paper)}/> : <main className="library-layout">
      <aside className="sidebar"><div className="sidebar-label">{t("YOUR READING SPACE")}</div>{[['All papers', Library], ['My library', BookOpen], ['Saved', Bookmark]].map(([name, Icon]) => { const C = Icon as typeof Library; return <button key={t(name as string)} className={shelf === name ? 'selected' : ''} onClick={() => { if(name === 'Saved' && needLogin()) return; setShelf(name as string) }}><C size={18}/>{t(name as string)}{name === 'All papers' && <span>{papers.length}</span>}</button> })}<div className="sidebar-label collections">{t("COLLECTIONS")}</div><button onClick={() => setQuery('Start here')}><span className="collection-dot"/>{t("Start here")}</button><button onClick={() => setQuery('Research')}><span className="collection-dot ochre"/>{t("Research desk")}</button><div className="sidebar-note"><span>✳</span><p>{t("A little curiosity.")}<br/>{t("A new connection.")}</p><small>{t("Make room for the next idea.")}</small></div><a className="github-link" href="https://github.com/lachlanchen/OnlyIdeasApp" target="_blank" rel="noreferrer"><Github size={15}/> {t("Built in the open")}<ArrowRight size={13}/></a></aside>
      <div className="library-main">
        {shelf !== 'My library' && <Discovery key={session?.user?.id || 'visitor'} saved={shelf === 'Saved'} setSaved={v=>setShelf(v?'Saved':'All papers')} local={filtered} query={query} setQuery={setQuery} open={p=>void open(p)} needLogin={needLogin} notify={notify} requests={()=>setJobPanel(true)}/>}
        {shelf !== 'Saved' && <section className="shelf"><div className="shelf-title"><div><h2>{shelf === 'All papers' ? t("The reading room") : t(shelf)}</h2><p>{shelf === 'All papers' ? t("A place to begin. A thought to come back to.") : t("Your own corner of the reading room.")}</p></div><label className="search"><Search size={17}/><input aria-label={t("Search library")} placeholder={t("Find a paper or an idea")} value={query} onChange={e => setQuery(e.target.value)}/></label></div>
          <div className="shelf-tabs"><button className="active" onClick={() => setQuery('')}>{t("Everything")}<span>{papers.length}</span></button><button onClick={() => setQuery('Start here')}>{t("Start here")}</button><button onClick={() => setQuery('Research')}>{t("Research")}</button><div className="shelf-view">{filtered.length} {t(filtered.length === 1 ? 'paper' : 'papers')}</div></div>
          {loading ? <div className="empty"><Loader2 className="spin"/> {t("Opening the library…")}</div> : <div className="paper-grid">{filtered.map((p, i) => <article className="paper-card" key={p.id}><button className={`paper-cover cover-${i % 3}`} onClick={() => open(p)}><span className="cover-series">{p.category} <span>↗</span></span><div className="cover-symbol">{p.sample ? '∴' : '∫'}</div><h3>{p.title}</h3><div className="cover-rule"/><span className="cover-foot">{p.sample ? t("AN INVITATION TO READ") : t("ONE PAPER. MANY PERSPECTIVES.")}</span></button><div className="card-meta"><strong className="language-tag">{labels[p.language] || p.language}</strong>{p.visibility === 'private' ? <span><LockKeyhole size={12}/> {t("Private")}</span> : <span>{p.sample ? t("Original sample") : t("Open library")}</span>}</div><button className="card-title" onClick={() => open(p)}>{p.title}</button><p className="card-authors">{p.authors || t('Personal paper')}</p><p className="research-meta">{metadata(p)}</p><PaperActions key={session?.user?.id || 'visitor'} reference={p.id} title={p.title} needLogin={needLogin} notify={notify}/><div className="card-footer"><span>{Math.max(1, Math.ceil((p.words || 250) / 220))} {t("min read")}</span><button onClick={() => open(p)}>{t("Open paper")}<ArrowRight size={14}/></button></div></article>)}<button className="add-card" onClick={() => { if (!needLogin()) setAdd(true) }}><span className="add-circle"><Plus size={25}/></span><h3>{t("Bring something")}<br/>{t("worth thinking about.")}</h3><p>{t("An open-access paper.")}<br/>{t("Your own work. A new question.")}</p><span>{t("Add to your library")}<ArrowRight size={15}/></span></button></div>}
          {!loading && !filtered.length && <p className="muted">{t("No papers here yet. Add a paper or try another search.")}</p>}
        </section>}
        <footer className="library-footer"><span>{t("Read with care. Share with curiosity.")}</span><span>OnlyIdeas · by LazyingArt</span></footer>
      </div>
    </main>}
    <nav className="mobile-navigation">{[['library','Library'],['agent','Agent'],['profile','Profile']].map(([id,name])=><button key={id} className={page===id?'selected':''} onClick={()=>{if(id==='library')clearPaper();setPage(id)}}>{t(name)}</button>)}</nav>
    {page!=='agent' && session?.user && jobs.length > 0 && <button className="job-pill" onClick={() => setJobPanel(true)}>{activeJobs.length ? <Loader2 className="spin" size={16}/> : <Check size={16}/>} {activeJobs.length ? `${activeJobs.length} request in progress` : t("Your requests")}</button>}
    {message && <div className="toast" role="status">{message}<button aria-label={t("Dismiss")} onClick={() => setMessage('')}><X size={16}/></button></div>}
    {login && <Modal title={t("A place for your ideas")} close={() => { setLogin(false); setAuthBusy(false); void cancelSignIn() }}><p>{t("Sign in to keep your papers, save notes, and join the conversation.")}</p><div className="login-mark"><img src="/mark.svg" alt=""/></div>{session?.capabilities.login ? <button className="primary block" disabled={authBusy} onClick={async () => { setAuthBusy(true); try { await signIn() } catch (e) { setAuthBusy(false); notify((e as Error).message) } }}>{authBusy ? <Loader2 className="spin" size={18}/> : <Github size={18}/>} {authBusy ? t("Waiting for sign-in…") : t("Continue with GitHub")}</button> : <p className="notice">{t("GitHub sign-in is being connected. Public papers are ready to read.")}</p>}{session?.development && <button className="secondary block" onClick={async () => { try { await post('/auth/local', {}); await refresh(); setLogin(false) } catch (e) { notify((e as Error).message) } }}>{t("Continue in local preview")}</button>}<p className="fine">{t("Your session stays signed in across visits. You can sign out at any time. Choose Shared or Only me before importing. Your notes and chats stay private.")}</p></Modal>}
    {add && session && <ImportModal session={session!} close={() => setAdd(false)} done={async p => { await refresh(); setAdd(false); if (p) await open(p); else setJobPanel(true) }} notify={notify}/>}
    {jobPanel && <Modal title={t("Your requests")} close={() => setJobPanel(false)}><p className="muted">{t("You can leave and come back. Requests are saved to your account.")}</p>{jobs.map(j => <div className="job-row" key={j.id}><div>{j.state === 'completed' ? <Check size={18}/> : j.state === 'failed' ? <X size={18}/> : <Loader2 className="spin" size={18}/>}</div><div><strong>{['import','attachment'].includes(j.kind) ? t("Readable paper") : j.kind === 'digest' ? t("Reading guide") : j.kind === 'publish' ? t("Public library") : t("Translation")}</strong><p>{j.message}</p>{j.state === 'failed' && <button className="text-button" onClick={async () => { try { const creditLimit=j.creditCost?await authorizeImport(false,0,0,j.creditCost):0;if(creditLimit===null)return;await post(`/jobs/${j.id}/retry`, {creditLimit}); notify(t("Request queued to resume.")) } catch (e) { notify((e as Error).message) } }}>{t("Try again")}</button>}{j.paperId && j.state === 'completed' && <button className="text-button" onClick={() => { setJobPanel(false); void open({ id: j.paperId } as Paper) }}>{t("Open paper")}<ArrowRight size={14}/></button>}</div></div>)}</Modal>}
  </>
}

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { ref.current?.showModal() }, [])
  return <dialog ref={ref} onCancel={close} onClick={e => { if (e.target === ref.current) close() }}><div className="modal"><div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={close} aria-label={t("Close")}><X size={20}/></button></div>{children}</div></dialog>
}
function ImportModal({ session, close, done, notify }: { session: Session; close: () => void; done: (p?: Paper) => Promise<void>; notify: (s: string) => void }) {
  const [kind, setKind] = useState('pdf'), [title, setTitle] = useState(''), [url, setUrl] = useState(''), [file, setFile] = useState<File | null>(null), [text, setText] = useState(''), [lang, setLang] = useState('en'), [busy, setBusy] = useState(false)
  const request = useRef(crypto.randomUUID())
  const [sharing,setSharing]=useState('shared')
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    try {
      const creditLimit=await authorizeImport(sharing==='shared',kind==='markdown'?0:1,kind==='markdown'?1:0);if(creditLimit===null)return
      if (kind === 'markdown') { const result = await post<{ paper: Paper }>('/papers/markdown', { title, language: lang, mmd: text, sharing, creditLimit, requestId: request.current }); await done(result.paper) }
      else if (kind === 'pdf' && file) { await api('/import', { method: 'POST', headers: { 'Content-Type': 'application/pdf', 'X-Request-Id': request.current, 'X-Paper-Title': encodeURIComponent(title), 'X-Paper-Language': lang, 'X-Paper-Sharing': sharing, 'X-Credit-Limit':String(creditLimit) }, body: file }); await done() }
      else if (kind === 'url') { await api('/import', { method: 'POST', headers: { 'X-Request-Id': request.current }, body: JSON.stringify({ title, url, language: lang, sharing, creditLimit }) }); await done() }
      else throw new Error('Choose a PDF first.')
    } catch (e) { notify((e as Error).message) } finally { setBusy(false) }
  }
  return <Modal title={t("Add something worth reading")} close={close}><SharingOptions sharing={sharing} setSharing={setSharing}/><div className="segmented">{[['pdf', 'Upload PDF'], ['url', 'Open-access link'], ['markdown', 'Markdown']].map(([id, name]) => <button className={kind === id ? 'active' : ''} key={id} onClick={() => setKind(id)}>{t(name)}</button>)}</div><form onSubmit={submit}><label>{t("Paper title")}<input required maxLength={300} placeholder={t("A title for your reading shelf")} value={title} onChange={e => setTitle(e.target.value)}/></label><label>{t("Original language")}<select aria-label={t("Read in")} value={lang} onChange={e => setLang(e.target.value)}>{Object.entries(labels).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>{kind === 'pdf' && <label className="file-drop"><FileText size={26}/><strong>{file?.name || 'Choose a PDF'}</strong><span>{t("Up to 20 MB ·")}{session.maxPages} {t("pages")}</span><input type="file" accept="application/pdf,.pdf" required onChange={e => { const f = e.target.files?.[0]; if (f) { if (f.size > 20_000_000) { notify(t("Choose a PDF smaller than 20 MB.")); e.target.value = ''; return } setFile(f); if (!title) setTitle(f.name.replace(/\.pdf$/i, '')) } }}/></label>}{kind === 'url' && <label>{t("Direct open-access PDF URL")}<input required type="url" placeholder="https://…/paper.pdf" value={url} onChange={e => setUrl(e.target.value)}/><small>{t("Use a freely accessible PDF link. Paywalled pages cannot be imported.")}</small></label>}{kind === 'markdown' && <label>{t("Paper text")}<textarea required rows={8} placeholder={'# Your paper\n\nEquations such as $E=mc^2$ are welcome.'} value={text} onChange={e => setText(e.target.value)}/><small>{t("Text and equations. For a paper with figures, use PDF import.")}</small></label>}{kind !== 'markdown' && <p className="notice">{session.capabilities.pdf ? t("The PDF will be sent to Mathpix to recognize text, equations and figures. Conversion uses your shared page allowance.") : t("PDF conversion is being connected. You can import Markdown now.")}</p>}<div className="form-footer"><span><LockKeyhole size={14}/> {sharing === 'shared' ? t("Shared after review") : t("Only me")}</span><button className="primary" disabled={busy || (kind !== 'markdown' && !session.capabilities.pdf)}>{busy ? <Loader2 className="spin" size={16}/> : <Plus size={16}/>} {kind === 'markdown' ? t("Add paper") : t("Convert & add")}</button></div></form></Modal>
}

function Reading({ paper, session, notify, needLogin, onBack, save, saved, jobs, onRefresh }: { paper: Paper; session: Session | null; notify: (s: string) => void; needLogin: () => boolean; onBack: () => void; save: () => void; saved: boolean; jobs: Job[]; onRefresh: () => void }) {
  const [tab, setTab] = useState('conversation'), [panel, setPanel] = useState(window.matchMedia('(min-width: 641px)').matches), [quote, setQuote] = useState(''), [section, setSection] = useState(''), [comments, setComments] = useState<Comment[]>([]), [draft, setDraft] = useState(''), [notes, setNotes] = useState(''), [lang, setLang] = useState('zh-Hans'), [artifacts, setArtifacts] = useState<Artifact[]>([]), [busy, setBusy] = useState(false), [size, setSize] = useState(Number(localStorage.getItem('onlyideas-text-size') || '18')), [publish, setPublish] = useState(false)
  const [downloaded, setDownloaded] = useState(false), [downloading, setDownloading] = useState(false)
  useEffect(() => { void downloadedPaper(paper.id, session?.user?.id).then(r => setDownloaded(!!r && r.pinned !== false)) }, [paper.id, session?.user?.id])
  async function toggleDownload() {
    setDownloading(true)
    try { if (downloaded) { await unpinPaper(paper.id, session?.user?.id); setDownloaded(false); notify(t("Unpinned. Recent papers stay in the automatic cache.")) } else { await downloadPaper(paper, session?.user?.id); setDownloaded(true); notify(t("Paper and figures saved for offline reading.")) } } catch (e) { notify((e as Error).message) } finally { setDownloading(false) }
  }
  const scope = `onlyideas:${session?.user?.id || 'visitor'}:${paper.id}`
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const scrollDiscussion = useRef(true)
  const commentId = useRef(localStorage.getItem(`${scope}:comment-id`) || crypto.randomUUID())
  useEffect(() => { localStorage.setItem(`${scope}:comment-id`, commentId.current) }, [scope])
  async function load() {
    const r = await api<{ comments: Comment[] }>(`/papers/${paper.id}/comments`); setComments(r.comments); setCommentsLoaded(true)
    const a = await api<{ artifacts: Artifact[] }>(`/papers/${paper.id}/artifacts`); setArtifacts(a.artifacts)
  }
  useEffect(() => { void load().catch(e => notify(e.message)); setDraft(localStorage.getItem(`${scope}:draft`) || ''); setQuote(''); setSection(''); if (session?.user) api<{ text: string }>(`/papers/${paper.id}/notes`).then(r => setNotes(r.text)).catch(e => notify(e.message)) }, [paper.id, session?.user?.id])
  useEffect(() => { void load().catch(() => {}) }, [jobs.filter(j => j.state === 'completed').length])
  useEffect(() => { localStorage.setItem(`${scope}:draft`, draft) }, [draft, scope])
  useEffect(() => { localStorage.setItem('onlyideas-text-size', String(size)) }, [size])
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [paragraph,setParagraph]=useState(''),[readLanguage,setReadLanguage]=useState('original'),[translationJob,setTranslationJob]=useState('')
  const translated=artifacts.find(a=>a.kind==='translation'&&!a.sectionId&&a.language===readLanguage)
  async function fetchLanguage(language:string){if(language==='original'){setReadLanguage(language);return}const ready=artifacts.find(a=>a.kind==='translation'&&!a.sectionId&&a.language===language);if(ready){setReadLanguage(language);return}if(needLogin())return;try{const result=await post<{job:Job}>(`/papers/${paper.id}/assist`,{kind:'translation',language});setTranslationJob(result.job.id);setReadLanguage(language);notify(t("Translation requested. Existing work is reused."))}catch(e){notify((e as Error).message)}}
  async function send() {
    if (needLogin()) return
    if (paper.visibility === 'public' && !acceptedTerms) { notify(t("Please read and accept the Community Terms.")); return }
    setBusy(true)
    try { await post(`/papers/${paper.id}/comments`, { id: commentId.current, text: draft, sectionId: section || null, paragraphId:paragraph||null, quote, revision: paper.revision, acceptTerms: acceptedTerms }); commentId.current = crypto.randomUUID(); localStorage.setItem(`${scope}:comment-id`, commentId.current); setDraft(''); setQuote(''); scrollDiscussion.current = true; await load(); notify(t(paper.visibility === 'public' ? 'Your comment is waiting for community review.' : 'Your private comment is saved.')) } catch (e) { notify((e as Error).message) } finally { setBusy(false) }
  }
  async function assist(kind: string) { if (needLogin()) return; try { await post(`/papers/${paper.id}/assist`, { kind, language: lang, sectionId: section || null }); notify(t("Request saved. You can keep reading while it’s prepared.")) } catch (e) { notify((e as Error).message) } }
  const discussionBody = useRef<HTMLElement>(null)
  useEffect(() => { scrollDiscussion.current = true }, [panel, tab, paragraph, section])
  useEffect(() => {
    if (!panel || tab !== 'conversation' || !commentsLoaded || !scrollDiscussion.current) return
    const frame = requestAnimationFrame(() => {
      const body = discussionBody.current
      if (body) { body.scrollTop = body.scrollHeight; scrollDiscussion.current = false }
    })
    return () => cancelAnimationFrame(frame)
  }, [panel, tab, paragraph, section, comments, commentsLoaded])
  const visibleComments = comments.filter(c => paragraph ? c.paragraphId===paragraph : !section || c.sectionId === section)
  return <main className={`reading-layout ${panel ? '' : 'panel-hidden'}`}>
    <div className="reading-toolbar"><button className="text-button" onClick={onBack}><ArrowLeft size={17}/> {t("Library")}</button><span className="reader-breadcrumb">{paper.category} <ChevronRight size={12}/> <strong>{labels[paper.language]}</strong></span><div><button className="icon-button" onClick={save} aria-label={saved ? t("Unsave paper") : t("Save paper")}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'}/></button><button className="icon-button" aria-label={t("Decrease text size")} onClick={() => setSize(Math.max(15, size - 1))}>{t("A−")}</button><button className="icon-button" aria-label={t("Increase text size")} onClick={() => setSize(Math.min(34, size + 1))}>{t("A+")}</button><button className="icon-button" onClick={() => setPanel(!panel)} aria-label={t("Toggle discussion panel")}><MessageCircle size={18}/></button></div></div>
    <aside className="contents"><span className="sidebar-label">{t("IN THIS PAPER")}</span>{paper.sections?.map((s, i) => <button key={s.id} className={section === s.id ? 'active' : ''} onClick={() => { setSection(s.id); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); localStorage.setItem(`${scope}:progress`, s.id) }}><span>{String(i + 1).padStart(2, '0')}</span>{s.title}</button>)}<button className="text-button" onClick={() => void exportMarkdown(paper.id, paper.mmd || '').catch(e => notify(e.message))}><ArrowDownToLine size={14}/> {t("Original Markdown")}</button>{paper.source && <a className="text-button" href={paper.source} target="_blank" rel="noreferrer"><ExternalLink size={14}/> {t("Source")}</a>}{paper.isOwner && paper.visibility === 'private' && <button className="text-button" onClick={() => setPublish(true)}><Globe2 size={14}/> {t("Share with the library")}</button>}</aside>
    <article className="reader-article" style={{ '--reading-size': `${size}px` } as React.CSSProperties}><div className="reader-meta"><span className="eyebrow">{paper.sample ? t("AN ORIGINAL READING SAMPLE") : paper.visibility === 'private' ? t("YOUR PRIVATE LIBRARY") : t("FROM THE READING ROOM")}</span><span className="language-tag">{labels[paper.language]}</span></div><h1>{paper.title}</h1><p className="byline">{paper.authors || t('Your personal paper')}</p><div className="paper-actions"><button className="text-button" disabled={downloading} onClick={() => void toggleDownload()}>{downloading ? <Loader2 className="spin" size={14}/> : downloaded ? <Check size={14}/> : <ArrowDownToLine size={14}/>} {downloading ? t("Saving figures…") : downloaded ? t("Kept offline · Unpin") : t("Keep offline")}</button><button className="text-button" onClick={() => void exportMarkdown(paper.id, paper.mmd || '').catch(e => notify(e.message))}><ExternalLink size={14}/> {t("Export Markdown")}</button></div><label className="reader-language">{t("Read in")}<select aria-label={t("Paper language")} value={readLanguage} onChange={e=>void fetchLanguage(e.target.value)}><option value="original">{t("Original")}</option>{Object.entries(labels).map(([id,name])=><option key={id} value={id}>{name}{artifacts.some(a=>a.kind==='translation'&&!a.sectionId&&a.language===id)?' ✓':''}</option>)}</select></label>{readLanguage!=='original'&&<p className="generated-label" role="status">{translated?t("AI translation · Check against the original."):jobs.some(j=>j.id===translationJob&&j.state==='failed')?t("Translation failed. Open Your requests to retry."):t("Preparing this language. You can keep reading the original.")}</p>}<div className="reading-rule"/><ReaderContent paper={translated?{...paper,mmd:translated.text,language:readLanguage,sections:[]}:paper} onParagraph={translated?undefined:(q,id)=>{setQuote(q);setParagraph(id);setSection('');setTab('conversation');setPanel(true)}} onSelection={translated?undefined:(q, s) => { setQuote(q); setSection(s);setParagraph('') }} onSection={s => { localStorage.setItem(`${scope}:progress`, s) }}/><div className="end-mark">✳</div><p className="reader-end">{t("The paper ends. The conversation can keep going.")}</p><button className="secondary" onClick={() => { setTab('conversation'); setPanel(true); document.getElementById('comment-draft')?.focus() }}><MessageCircle size={16}/> {t("Add your perspective")}</button></article>
    {panel && <aside className="reading-panel" ref={discussionBody}><div className="panel-tabs">{[['conversation', MessageCircle, 'Discuss'], ['notes', StickyNote, 'Notes'], ['assistant', Sparkles, 'Explore']].map(([id, Icon, name]) => { const C = Icon as typeof Sparkles; return <button key={id as string} className={tab === id ? 'active' : ''} onClick={() => setTab(id as string)}><C size={16}/>{t(name as string)}</button> })}<button className="panel-close icon-button" aria-label={t("Close reading panel")} onClick={() => setPanel(false)}><X size={18}/></button></div><div className="panel-body">
      {tab === 'conversation' && <><div className="panel-heading"><h2>{t("In the margins")}</h2><span>{comments.length}</span></div><p className="muted">{t("A question, a connection, another way to see it.")}</p>{(section||paragraph) && <button className="section-filter" onClick={() => { setSection('');setParagraph(''); setQuote('') }}>{t("This passage")}<X size={12}/></button>}{quote && <blockquote className="selected-quote">{quote}<button className="text-button" onClick={() => { setTab('conversation'); document.getElementById('comment-draft')?.focus() }}>{t("Discuss selection")}<ArrowRight size={13}/></button></blockquote>}{visibleComments.length ? visibleComments.map(c => <div className="comment" key={c.id}><div className="comment-author"><span className="avatar">{c.author[0]?.toUpperCase()}</span><strong>{c.author}</strong><small>{new Date(c.createdAt).toLocaleDateString()}</small></div>{c.quote && <blockquote>{c.quote}</blockquote>}<p>{c.text}</p>{c.pending && <p className="muted">{t("Waiting for community review")}</p>}<div className="comment-actions">{!c.canDelete && <button onClick={async()=>{if(needLogin())return;if(!confirm(t('Block {name}? Their contributions will be hidden and interaction prevented.',{name:c.author})))return;try{await post(`/comments/${c.id}/block`,{});await load()}catch(e){notify((e as Error).message)}}}>{t("Block reader")}</button>}{c.canDelete && <button onClick={async () => { if (!window.confirm(t("Delete your comment?"))) return; try { await api(`/comments/${c.id}`, { method: 'DELETE' }); await load() } catch (e) { notify((e as Error).message) } }}>{t("Delete")}</button>}<button onClick={async () => { if (needLogin()) return; const reason = window.prompt(t("What should the moderator review?")); if (reason) try { await post(`/comments/${c.id}/report`, { reason }); notify(t("Report saved for the moderator.")) } catch (e) { notify((e as Error).message) } }}>{t("Report")}</button></div></div>) : <div className="conversation-empty"><MessageCircle size={28}/><h3>{t("Leave the first thought.")}</h3><p>{t("What caught your attention?")}<br/>{t("There’s room for your question here.")}</p></div>}<div className="composer">{paper.visibility === 'public' && <label className="check-label"><input type="checkbox" checked={acceptedTerms} onChange={e=>setAcceptedTerms(e.target.checked)}/>{t("I accept the")}<a href="https://lachlan.lazying.art/OnlyIdeasApp/terms.html" target="_blank" rel="noreferrer">{t("Community Terms")}</a>{t(". Public comments are reviewed.")}</label>}<textarea id="comment-draft" aria-label={t("Your comment")} placeholder={t("I’m wondering…")} maxLength={5000} rows={4} value={draft} onChange={e => setDraft(e.target.value)}/><div><small>{paper.visibility === 'private' ? t("Private paper thread") : t("Public after community review")}</small><button className="primary" disabled={!draft.trim() || busy} onClick={send}>{busy ? <Loader2 className="spin" size={14}/> : <Send size={14}/>} {t("Post")}</button></div></div><p className="fine">{t("Stay curious and kind. Discuss the idea, credit the source.")}</p></>}
      {tab === 'notes' && <><h2>{t("Your notebook")}</h2><p className="muted"><LockKeyhole size={13}/> {t("Only you can read these notes.")}</p><textarea className="notes" aria-label={t("Private notes")} rows={15} placeholder={t("Keep a thought for later…")} value={notes} onChange={e => setNotes(e.target.value)}/><button className="primary" onClick={async () => { if (needLogin()) return; try { await api(`/papers/${paper.id}/notes`, { method: 'PUT', body: JSON.stringify({ text: notes }) }); notify(t("Private notes saved.")) } catch (e) { notify((e as Error).message) } }}><Check size={15}/> {t("Save notes")}</button></>}
      {tab === 'assistant' && <><h2>{t("Another way in")}</h2><p className="muted">{t("A reading guide or a translation, with the source always close by.")}</p><label>{t("Read in")}<select aria-label={t("Read in")} value={lang} onChange={e => setLang(e.target.value)}>{Object.entries(labels).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label>{t("Passage")}<select aria-label={t("Passage")} value={section} onChange={e => setSection(e.target.value)}><option value="">{t("Whole paper")}</option>{paper.sections?.map(s => <option value={s.id} key={s.id}>{s.title}</option>)}</select></label><button className="explore-action" onClick={() => assist('digest')}><Sparkles size={20}/><span><strong>{t("Create a reading guide")}</strong><small>{t("Question, evidence, limits & next ideas")}</small></span><ArrowRight size={16}/></button><button className="explore-action" onClick={() => assist('translation')}><Languages size={20}/><span><strong>{t("Translate this passage")}</strong><small>{t("Keep equations and figures in place")}</small></span><ArrowRight size={16}/></button>{!session?.capabilities.assistant && <p className="notice">{t("The reading assistant is being connected. Your original paper is ready to read.")}</p>}<p className="fine">{t("Generated text can be wrong. Check claims against the source. A request may use your shared model allowance.")}</p>{artifacts.map(a => <details className="artifact" key={a.id}><summary>{a.kind === 'digest' ? t("Reading guide") : t("Translation")} · <strong>{labels[a.language]}</strong></summary><span className="generated-label">{t("AI generated ·")}{a.model}</span><ReaderContent paper={{ ...paper, mmd: a.text, sections: [] }}/></details>)}</>}
    </div></aside>}
    {quote && !panel && <button className="selection-bubble primary" onClick={() => { setPanel(true); setTab('conversation') }}><MessageCircle size={16}/> {t("Discuss selection")}</button>}
    {publish && <PublishModal paper={paper} close={() => setPublish(false)} notify={notify} onRefresh={onRefresh}/>}
  </main>
}
function PublishModal({ paper, close, notify, onRefresh }: { paper: Paper; close: () => void; notify: (s: string) => void; onRefresh: () => void }) {
  const [license, setLicense] = useState('CC-BY-4.0'), [source, setSource] = useState(paper.source), [agree, setAgree] = useState(false), [busy, setBusy] = useState(false)
  return <Modal title={t("Share with the reading room")} close={close}><p>{t("After community review, this publishes the paper text and figures to the public OnlyIdeas-papers repository. Your private notebook stays private.")}</p><label>{t("Permission")}<select value={license} onChange={e => setLicense(e.target.value)}><option>{t("CC-BY-4.0")}</option><option>{t("CC-BY-SA-4.0")}</option><option>{t("CC0-1.0")}</option><option value="author-permission">{t("I have the author’s permission")}</option></select></label><label>{t("Source or permission URL")}<input type="url" placeholder="https://…" value={source} onChange={e => setSource(e.target.value)}/></label><label className="check-label"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)}/> {t("I have the right to publish this paper and its figures publicly under this permission and I accept the")}<a href="https://lachlan.lazying.art/OnlyIdeasApp/terms.html" target="_blank" rel="noreferrer">{t("Community Terms")}</a>.</label><button disabled={!agree || busy} className="primary block" onClick={async () => { setBusy(true); try { await post(`/papers/${paper.id}/publish`, { license, source, attestation: agree, acceptTerms: agree }); notify(t("Publication request saved. Watch Your requests for its result.")); onRefresh(); close() } catch (e) { notify((e as Error).message) } finally { setBusy(false) } }}><Globe2 size={17}/> {t("Request publication")}</button></Modal>
}

function BlockedReaders({notify}: {notify:(s:string)=>void}) {
  const [readers,setReaders] = useState<{id:string;name:string}[]>([])
  const load = () => api<{blocks:{id:string;name:string}[]}>('/blocks').then(r=>setReaders(r.blocks)).catch(e=>notify(e.message))
  useEffect(()=>{void load()},[])
  return <div><h3>{t("Blocked readers")}</h3>{readers.length ? readers.map(r=><p key={r.id}>{r.name} <button onClick={async()=>{try{await api(`/blocks/${r.id}`,{method:'DELETE'});await load()}catch(e){notify((e as Error).message)}}}>{t("Unblock")}</button></p>):<p className="muted">{t("No blocked readers.")}</p>}</div>
}

class ReadingRoomBoundary extends React.Component<{ children: React.ReactNode }, { interrupted: boolean }> {
  state = { interrupted: false }
  static getDerivedStateFromError() { return { interrupted: true } }
  render() { return this.state.interrupted ? <main className="recovery"><img src="/mark.svg" width="52" height="52" alt=""/><h1>{t("Let’s open the reading room again.")}</h1><p>{t("Something interrupted this view. Reopen the library to try again.")}</p><button className="primary" onClick={() => window.location.reload()}>{t("Reopen library")}</button></main> : this.props.children }
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><ReadingRoomBoundary><App/></ReadingRoomBoundary></React.StrictMode>)

import {useEffect,useRef,useState} from 'react'
import {CheckCheck,RefreshCw,ShieldCheck,ArrowLeft} from 'lucide-react'
import {api,post,type Paper,type Session} from './api'
import {ReaderContent} from './ReaderContent'
import {t} from './i18n'
import './publication-review.css'

export const reviewLabels:Record<string,string>={awaiting_review:'Awaiting review',changes_requested:'Changes requested',publishing:'Publishing',shared:'Shared',declined:'Not approved',publication_failed:'Publication failed',private:'Only me'}
type Entry={id:string;token:string;state:string;created:number;message:string;paper:Paper}
type Queue={items:Entry[];counts:Record<string,number>;total:number;offset:number}
type Decision={id:string;created:number;reviewer:string;action:string;reason?:string;evidence?:{license:string;url:string;note:string}}
type Detail=Entry&{history:Decision[]}
type Draft={license:string;evidenceUrl:string;note:string;contentChecked:boolean;rightsChecked:boolean;token:string}
export function SharingStatus({paper}:{paper:Paper}) {
  const state=paper.review?.state||paper.sharing||'private'
  if(paper.visibility==='public'||state==='private')return null
  return <aside className="sharing-status" role="status"><ShieldCheck size={18}/><div><strong>{t(reviewLabels[state]||'Awaiting review')}</strong><p>{paper.review?.message||t('OnlyIdeas administrators check sharing permission, text and figures. Approved papers become available to everyone.')}</p></div></aside>
}
export function PublicationReview({session,login,back}:{session:Session|null;login:()=>void;back:()=>void}) {
  const [state,setState]=useState('awaiting_review'),[query,setQuery]=useState(''),[offset,setOffset]=useState(0)
  const [queue,setQueue]=useState<Queue>(),[detail,setDetail]=useState<Detail>(),[selected,setSelected]=useState<string[]>([])
  const [drafts,setDrafts]=useState<Record<string,Draft>>({}),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
  const [action,setAction]=useState(''),[reason,setReason]=useState(''),[loading,setLoading]=useState(false)
  const generation=useRef(0),previewRequest=useRef(0)
  const allowed=!!session?.capabilities.publicationReview
  async function refresh(){const g=++generation.current;setLoading(true);setSelected([]);setDetail(undefined);setDrafts({});previewRequest.current++
    try{const result=await api<Queue>(`/admin/publications?state=${state}&offset=${offset}&q=${encodeURIComponent(query)}`);if(g===generation.current){setQueue(result);setError('')}}catch(e){if(g===generation.current)setError((e as Error).message)}finally{if(g===generation.current)setLoading(false)}}
  useEffect(()=>{if(allowed)void refresh();else{generation.current++;previewRequest.current++;setQueue(undefined);setDetail(undefined);setSelected([]);setDrafts({})}return()=>{generation.current++;previewRequest.current++}},[allowed,session?.user?.id,state,offset])
  async function preview(entry:Entry){const g=generation.current,n=++previewRequest.current;setError('');setDetail(undefined)
    try{const value=await api<Detail>(`/admin/publications/${entry.id}`);if(g!==generation.current||n!==previewRequest.current)return;setDetail(value);setDrafts(current=>current[entry.id]?.token===value.token?current:{...current,[entry.id]:{license:value.paper.license,evidenceUrl:value.paper.provenance?.licenseUrl||value.paper.source,note:'',contentChecked:false,rightsChecked:false,token:value.token}})}catch(e){if(g===generation.current&&n===previewRequest.current)setError((e as Error).message)}}
  const draft=detail?drafts[detail.id]:undefined
  function edit(patch:Partial<Draft>){if(detail&&draft)setDrafts(d=>({...d,[detail.id]:{...draft,...patch}}))}
  const canApprove=selected.length>0&&selected.every(id=>{const d=drafts[id],entry=queue?.items.find(i=>i.id===id);return d&&d.token===entry?.token&&d.rightsChecked&&d.contentChecked&&['CC0-1.0','CC-BY-4.0','CC-BY-SA-4.0','author-permission'].includes(d.license)&&d.note.trim().length>=10&&d.evidenceUrl.startsWith('https://')})
  async function decide(){const g=generation.current;setBusy(true);setError('');try{await post('/admin/publications/batch',{action,reason,items:selected.map(id=>({id,token:queue?.items.find(i=>i.id===id)?.token,...(action==='approve'?drafts[id]:{})}))});if(g!==generation.current)return;setAction('');setReason('');setNotice(t('Review decisions saved. Approved papers appear after publication completes.'));await refresh()}catch(e){if(g===generation.current)setError((e as Error).message)}finally{setBusy(false)}}
  if(!allowed)return <main className="review-page"><button className="text-button" onClick={back}><ArrowLeft size={16}/>{t('Library')}</button><h1>{t('Publication review')}</h1><p>{t('Only designated OnlyIdeas administrators can review sharing requests.')}</p>{!session?.user&&<button className="primary" onClick={login}>{t('Sign in with GitHub')}</button>}</main>
  return <main className="review-page" data-testid="publication-review">
    <header className="review-heading"><div><span className="eyebrow">OnlyIdeas · {t('Administration')}</span><h1><ShieldCheck/>{t('Publication review')}</h1><p>{t('Check permission and readability, then publish once for everyone.')}</p></div><button className="secondary" disabled={loading||busy} onClick={()=>void refresh()}><RefreshCw size={16}/>{t('Refresh')}</button></header>
    <div className="review-filters"><label>{t('Status')}<select aria-label={t('Status')} value={state} onChange={e=>{setState(e.target.value);setOffset(0)}}>{['awaiting_review','changes_requested','publishing','shared','declined','publication_failed','all'].map(s=><option key={s} value={s}>{t(s==='all'?'All papers':reviewLabels[s])}{s==='all'?'':` · ${queue?.counts[s]||0}`}</option>)}</select></label><form onSubmit={e=>{e.preventDefault();if(offset)setOffset(0);else void refresh()}}><label>{t('Search library')}<input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('Title, author or DOI')}/></label><button className="secondary">{t('Search')}</button></form></div>
    {error&&<p className="review-error" role="alert">{error}</p>}{notice&&<p className="sharing-status" role="status">{notice}</p>}
    <div className="review-batch"><strong>{t('{count} selected',{count:selected.length})}</strong><button className="primary" disabled={busy||loading||!canApprove} onClick={()=>{setReason('');setAction('approve')}}><CheckCheck size={16}/>{t('Approve selected')}</button><button className="secondary" disabled={busy||loading||!selected.length} onClick={()=>{setReason('');setAction('changes')}}>{t('Request changes')}</button><button className="secondary" disabled={busy||loading||!selected.length} onClick={()=>{setReason('');setAction('reject')}}>{t('Decline')}</button>{state==='publication_failed'&&<button className="secondary" disabled={busy||loading||!selected.length} onClick={()=>{setReason('');setAction('retry')}}>{t('Retry publication')}</button>}</div>
    <div className="review-workspace"><section className="review-list" aria-label={t('Review queue')}>
      {loading?<p>{t('Loading…')}</p>:!queue?.items.length?<p className="empty">{t('No papers waiting in this view.')}</p>:queue.items.map(entry=><article className={'review-row'+(detail?.id===entry.id?' current':'')} key={entry.id}>
        <input type="checkbox" aria-label={t('Select')+' '+entry.paper.title} disabled={busy||!['awaiting_review','changes_requested','declined','publication_failed'].includes(entry.state)||(!selected.includes(entry.id)&&selected.length>=20)} checked={selected.includes(entry.id)} onChange={e=>setSelected(s=>e.target.checked?[...s,entry.id]:s.filter(id=>id!==entry.id))}/>
        <button onClick={()=>void preview(entry)}><span className="review-status">{t(reviewLabels[entry.state])}</span><h2>{entry.paper.title}</h2><p>{entry.paper.authors}</p><small>{new Date(entry.created).toLocaleDateString()} · {entry.paper.assets.length} {t('Figures')}</small></button>
      </article>)}
      <div className="review-pagination"><button className="secondary" disabled={offset===0||loading||busy} onClick={()=>setOffset(n=>Math.max(0,n-50))}>{t('Previous')}</button><span>{queue?.total||0} {t('papers')}</span><button className="secondary" disabled={!queue||offset+50>=queue.total||loading||busy} onClick={()=>setOffset(n=>n+50)}>{t('Next')}</button></div>
    </section><section className="review-detail" aria-label={t('Paper review')}>
      {!detail?<div className="review-placeholder"><ShieldCheck size={32}/><h2>{t('Open a paper to review')}</h2><p>{t('Only papers submitted for sharing appear here. Personal notes and conversations remain private.')}</p></div>:<>
        <h2>{detail.paper.title}</h2><p>{detail.paper.authors}</p><div className="review-links">{detail.paper.source.startsWith('https://')&&<a href={detail.paper.source} target="_blank" rel="noreferrer">{t('Original source')} ↗</a>}<span>{detail.paper.doi}</span><span>{detail.paper.license}</span></div>
        {['awaiting_review','changes_requested','declined','publication_failed'].includes(detail.state)&&draft&&<fieldset className="review-checks" disabled={busy}><legend>{t('Permission & quality')}</legend>
          <label>{t('Verified license')}<select aria-label={t('Verified license')} value={draft.license} onChange={e=>edit({license:e.target.value})}><option value="private">{t('Not verified')}</option>{['CC0-1.0','CC-BY-4.0','CC-BY-SA-4.0','author-permission'].map(v=><option key={v}>{v}</option>)}</select></label>
          <label>{t('Permission evidence URL')}<input type="url" value={draft.evidenceUrl} onChange={e=>edit({evidenceUrl:e.target.value})}/></label>
          <label>{t('Private review note')}<textarea value={draft.note} maxLength={2000} onChange={e=>edit({note:e.target.value})}/></label>
          <label className="review-check"><input type="checkbox" checked={draft.rightsChecked} onChange={e=>edit({rightsChecked:e.target.checked})}/>{t('I checked permission to redistribute the text and figures.')}</label>
          <label className="review-check"><input type="checkbox" checked={draft.contentChecked} onChange={e=>edit({contentChecked:e.target.checked})}/>{t('I checked the transcript, equations, figures and content.')}</label>
        </fieldset>}
        <details className="review-history"><summary>{t('Decision history')} · {detail.history.length}</summary>{detail.history.map(h=><div key={h.id}><strong>{t(({approve:'Approved',changes:'Changes requested',reject:'Not approved',retry:'Retry publication'} as Record<string,string>)[h.action]||h.action)}</strong><small>{new Date(h.created).toLocaleString()} · {h.reviewer}</small><p>{h.reason||h.evidence?.note}</p>{h.evidence&&<p>{h.evidence.license} · <a href={h.evidence.url} target="_blank" rel="noreferrer">{t('Permission evidence URL')}</a></p>}</div>)}</details>
        <ReaderContent key={detail.id+detail.token} paper={detail.paper} assetBase={`/api/admin/publications/${detail.id}`}/>
      </>}
    </section></div>
    {action&&<div className="modal-backdrop"><section className="review-confirm" role="dialog" aria-modal="true" aria-label={t('Confirm review')}><h2>{t('Confirm review')}</h2><p>{t('{count} selected',{count:selected.length})} · {t(({approve:'Approve selected',changes:'Request changes',reject:'Decline',retry:'Retry publication'} as Record<string,string>)[action])}</p>{['changes','reject'].includes(action)?<label>{t('Message to contributor')}<textarea autoFocus value={reason} maxLength={1000} onChange={e=>setReason(e.target.value)}/></label>:<p>{t('Approved papers and figures will be published for everyone. This does not share personal notes or chats.')}</p>}<div><button className="secondary" disabled={busy} onClick={()=>setAction('')}>{t('Cancel')}</button><button className="primary" disabled={busy||(['changes','reject'].includes(action)&&reason.trim().length<10)} onClick={()=>void decide()}>{busy?t('Saving…'):t('Confirm')}</button></div></section></div>}
  </main>
}

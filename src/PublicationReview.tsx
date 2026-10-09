import {useEffect,useRef,useState} from 'react'
import {CheckCheck,RefreshCw,ShieldCheck,ArrowLeft} from 'lucide-react'
import {api,post,type Paper,type Session} from './api'
import {ReaderContent} from './ReaderContent'
import {t} from './i18n'
import {approvalNeeds,quickApprovalDraft,reviewLicenses,reviewableStates,type ReviewDraft} from './publication-approval'
import './publication-review.css'

export const reviewLabels:Record<string,string>={awaiting_review:'Awaiting review',changes_requested:'Changes requested',publishing:'Publishing',shared:'Shared',declined:'Not approved',publication_failed:'Publication failed',private:'Only me'}
type Entry={id:string;token:string;state:string;created:number;message:string;paper:Paper}
type Queue={items:Entry[];counts:Record<string,number>;total:number;offset:number}
type Decision={id:string;created:number;reviewer:string;action:string;reason?:string;evidence?:{license:string;url:string;note:string}}
type Detail=Entry&{history:Decision[]}
export function SharingStatus({paper}:{paper:Paper}) {
  const state=paper.review?.state||paper.sharing||'private'
  if(paper.visibility==='public'||state==='private')return null
  return <aside className="sharing-status" role="status"><ShieldCheck size={18}/><div><strong>{t(reviewLabels[state]||'Awaiting review')}</strong><p>{paper.review?.message||t('OnlyIdeas administrators check sharing permission, text and figures. Approved papers become available to everyone.')}</p></div></aside>
}
export function PublicationReview({session,login,back}:{session:Session|null;login:()=>void;back:()=>void}) {
  const [state,setState]=useState('awaiting_review'),[query,setQuery]=useState(''),[offset,setOffset]=useState(0)
  const [queue,setQueue]=useState<Queue>(),[detail,setDetail]=useState<Detail>(),[selected,setSelected]=useState<string[]>([])
  const [drafts,setDrafts]=useState<Record<string,ReviewDraft>>({}),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
  const [action,setAction]=useState(''),[reason,setReason]=useState(''),[loading,setLoading]=useState(false)
  const [missingLicense,setMissingLicense]=useState('')
  const generation=useRef(0),previewRequest=useRef(0),focusOnReview=useRef(false),decisionPending=useRef(false)
  const allowed=!!session?.capabilities.publicationReview
  async function refresh(){const g=++generation.current;setLoading(true);setSelected([]);setDetail(undefined);setDrafts({});setMissingLicense('');previewRequest.current++
    try{const result=await api<Queue>(`/admin/publications?state=${state}&offset=${offset}&q=${encodeURIComponent(query)}`);if(g===generation.current){setQueue(result);setError('')}}catch(e){if(g===generation.current)setError((e as Error).message)}finally{if(g===generation.current)setLoading(false)}}
  useEffect(()=>{if(allowed)void refresh();else{generation.current++;previewRequest.current++;setQueue(undefined);setDetail(undefined);setSelected([]);setDrafts({});setMissingLicense('')}return()=>{generation.current++;previewRequest.current++}},[allowed,session?.user?.id,state,offset])
  async function preview(entry:Entry,focus=false){const g=generation.current,n=++previewRequest.current;focusOnReview.current=focus;setError('');setDetail(undefined)
    try{const value=await api<Detail>(`/admin/publications/${entry.id}`);if(g!==generation.current||n!==previewRequest.current)return;
      const {mmd,sections,...summary}=value.paper
      // The queue may have been loaded before another reviewer changed the paper.
      // Keep its token in sync with this fresh preview so approval can become ready.
      setQueue(q=>q?{...q,items:q.items.map(i=>i.id===value.id?{id:value.id,token:value.token,state:value.state,created:value.created,message:value.message,paper:summary}:i)}:q)
      if(!reviewableStates.includes(value.state))setSelected(s=>s.filter(id=>id!==value.id))
      setDetail(value);setDrafts(current=>current[entry.id]?.token===value.token?current:{...current,[entry.id]:{license:value.paper.license,evidenceUrl:value.paper.provenance?.licenseUrl||value.paper.source,note:'',contentChecked:false,rightsChecked:false,token:value.token}})
    }catch(e){if(g===generation.current&&n===previewRequest.current)setError((e as Error).message)}}
  const draft=detail?drafts[detail.id]:undefined
  function edit(patch:Partial<ReviewDraft>){if(detail&&draft)setDrafts(d=>({...d,[detail.id]:{...draft,...patch}}))}
  const selectedEntries=selected.flatMap(id=>{const entry=queue?.items.find(i=>i.id===id);return entry?[entry]:[]})
  const incomplete=selectedEntries.filter(entry=>approvalNeeds(entry,drafts[entry.id]).length>0)
  const canApprove=selected.length>0&&selectedEntries.length===selected.length&&incomplete.length===0
  const quickItems=selectedEntries.map(entry=>({id:entry.id,...quickApprovalDraft(entry,drafts[entry.id],missingLicense)}))
  const quickNeeds=selectedEntries.map((entry,i)=>({entry,needs:approvalNeeds(entry,quickItems[i])})).filter(row=>row.needs.length)
  const missingLicenseCount=selectedEntries.filter(entry=>!reviewLicenses.includes(quickApprovalDraft(entry,drafts[entry.id]).license)).length
  const needs=detail?approvalNeeds(detail,draft):[]
  function focusChecks(){const panel=document.getElementById('review-checks');panel?.scrollIntoView({block:'start',behavior:'smooth'});panel?.focus({preventScroll:true})}
  useEffect(()=>{if(detail&&draft&&focusOnReview.current){focusOnReview.current=false;focusChecks()}},[detail,draft])
  function prepareApproval(){
    if(busy||loading||!selected.length)return
    if(canApprove){setReason('');setAction('approve');return}
    const entry=incomplete[0];if(!entry)return
    setNotice(t('Complete the highlighted review before approving.'))
    if(detail?.id===entry.id&&draft?.token===entry.token)focusChecks();else void preview(entry,true)
  }
  function selectEntry(entry:Entry,checked:boolean){setSelected(s=>checked?[...s,entry.id]:s.filter(id=>id!==entry.id));setMissingLicense('');setNotice('');setError('')}
  async function sendDecision(nextAction:string,items:object[]){if(decisionPending.current)return;decisionPending.current=true;const g=generation.current;setBusy(true);setError('');try{await post('/admin/publications/batch',{action:nextAction,reason:nextAction==='approve'?'':reason,items});if(g!==generation.current)return;setAction('');setReason('');setNotice(t('Review decisions saved. Approved papers appear after publication completes.'));await refresh()}catch(e){if(g===generation.current)setError((e as Error).message)}finally{decisionPending.current=false;setBusy(false)}}
  function decide(){return sendDecision(action,selected.map(id=>({id,token:queue?.items.find(i=>i.id===id)?.token,...(action==='approve'?drafts[id]:{})})))}
  function quickApprove(){
    if(busy||loading||decisionPending.current||!selected.length)return
    if(selectedEntries.length!==selected.length){setError(t('This paper or review changed. Refresh and review it again.'));return}
    const missing=quickNeeds[0]
    if(missing){
      if(missing.needs.includes('Choose a verified license.'))document.getElementById('quick-review-license')?.focus()
      else void preview(missing.entry,true)
      setError(`${missing.entry.paper.title}: ${missing.needs.map(need=>t(need)).join(' ')}`)
      return
    }
    void sendDecision('approve',quickItems)
  }
  if(!allowed)return <main className="review-page"><button className="text-button" onClick={back}><ArrowLeft size={16}/>{t('Library')}</button><h1>{t('Publication review')}</h1><p>{t('Only designated OnlyIdeas administrators can review sharing requests.')}</p>{!session?.user&&<button className="primary" onClick={login}>{t('Sign in with GitHub')}</button>}</main>
  return <main className="review-page" data-testid="publication-review">
    <header className="review-heading"><div><span className="eyebrow">OnlyIdeas · {t('Administration')}</span><h1><ShieldCheck/>{t('Publication review')}</h1><p>{t('Check permission and readability, then publish once for everyone.')}</p></div><button className="secondary" disabled={loading||busy} onClick={()=>void refresh()}><RefreshCw size={16}/>{t('Refresh')}</button></header>
    <div className="review-filters"><label>{t('Status')}<select aria-label={t('Status')} value={state} onChange={e=>{setState(e.target.value);setOffset(0)}}>{['awaiting_review','changes_requested','publishing','shared','declined','publication_failed','all'].map(s=><option key={s} value={s}>{t(s==='all'?'All papers':reviewLabels[s])}{s==='all'?'':` · ${queue?.counts[s]||0}`}</option>)}</select></label><form onSubmit={e=>{e.preventDefault();if(offset)setOffset(0);else void refresh()}}><label>{t('Search library')}<input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('Title, author or DOI')}/></label><button className="secondary">{t('Search')}</button></form></div>
    {error&&<p className="review-error" role="alert">{error}</p>}{notice&&<p className="sharing-status" role="status">{notice}</p>}
    <div className="review-batch"><strong aria-live="polite">{t('{count} selected',{count:selected.length})}{selected.length>0&&<small>{t('{ready} of {count} ready',{ready:selectedEntries.length-quickNeeds.length,count:selected.length})}</small>}</strong><button className="primary" data-testid="quick-approve" aria-describedby="quick-review-help" disabled={busy||loading||!selected.length} onClick={quickApprove}><CheckCheck size={16}/>{busy?t('Saving…'):t('Quick approve')}</button><button className="secondary" data-testid="approve-selected" disabled={busy||loading||!selected.length} onClick={prepareApproval}>{t('Detailed review')}</button><button className="secondary" disabled={busy||loading||!selected.length} onClick={()=>{setReason('');setAction('changes')}}>{t('Request changes')}</button><button className="secondary" disabled={busy||loading||!selected.length} onClick={()=>{setReason('');setAction('reject')}}>{t('Decline')}</button>{state==='publication_failed'&&<button className="secondary" disabled={busy||loading||!selected.length} onClick={()=>{setReason('');setAction('retry')}}>{t('Retry publication')}</button>}
      <p id="quick-review-help" className="quick-review-help">{t('Click Quick approve to confirm sharing permission and that the selected papers’ text, equations and figures are ready. Your confirmation is recorded automatically; no second popup.')}</p>
      {missingLicenseCount>0&&<label className="quick-review-license">{t('Permission for {count} papers without a supported license',{count:missingLicenseCount})}<select id="quick-review-license" data-testid="quick-review-license" value={missingLicense} disabled={busy||loading} onChange={e=>{setMissingLicense(e.target.value);setError('')}}><option value="">{t('Choose a verified license.')}</option>{reviewLicenses.map(license=><option key={license} value={license}>{license==='author-permission'?t('Author permission confirmed'):license}</option>)}</select><small>{t('Choose only permission you have verified. Recorded licenses are kept.')}</small></label>}
    </div>
    <div className="review-workspace"><section className="review-list" aria-label={t('Review queue')}>
      {loading?<p>{t('Loading…')}</p>:!queue?.items.length?<p className="empty">{t('No papers waiting in this view.')}</p>:queue.items.map(entry=><article className={'review-row'+(detail?.id===entry.id?' current':'')} key={entry.id}>
        <input type="checkbox" aria-label={t('Select')+' '+entry.paper.title} disabled={busy||loading||!reviewableStates.includes(entry.state)||(!selected.includes(entry.id)&&selected.length>=20)} checked={selected.includes(entry.id)} onChange={e=>selectEntry(entry,e.target.checked)}/>
        <button onClick={()=>void preview(entry)}><span className="review-status">{t(reviewLabels[entry.state])}</span><h2>{entry.paper.title}</h2><p>{entry.paper.authors}</p><small>{new Date(entry.created).toLocaleDateString()} · {entry.paper.assets.length} {t('Figures')}</small></button>
      </article>)}
      <div className="review-pagination"><button className="secondary" disabled={offset===0||loading||busy} onClick={()=>setOffset(n=>Math.max(0,n-50))}>{t('Previous')}</button><span>{queue?.total||0} {t('papers')}</span><button className="secondary" disabled={!queue||offset+50>=queue.total||loading||busy} onClick={()=>setOffset(n=>n+50)}>{t('Next')}</button></div>
    </section><section className="review-detail" aria-label={t('Paper review')}>
      {!detail?<div className="review-placeholder"><ShieldCheck size={32}/><h2>{t('Open a paper to review')}</h2><p>{t('Only papers submitted for sharing appear here. Personal notes and conversations remain private.')}</p></div>:<>
        <h2>{detail.paper.title}</h2><p>{detail.paper.authors}</p><div className="review-links">{detail.paper.source.startsWith('https://')&&<a href={detail.paper.source} target="_blank" rel="noreferrer">{t('Original source')} ↗</a>}<span>{detail.paper.doi}</span><span>{detail.paper.license}</span></div>
        {reviewableStates.includes(detail.state)&&draft&&<fieldset id="review-checks" tabIndex={-1} className="review-checks" disabled={busy}><legend>{t('Permission & quality')}</legend>
          <div className={'review-readiness'+(!needs.length?' ready':'')} aria-live="polite" data-testid="review-readiness"><strong>{t(needs.length?'Review checklist':'Ready for approval')}</strong>{needs.length>0&&<ul>{needs.map(need=><li key={need}>{t(need)}</li>)}</ul>}</div>
          <label>{t('Verified license')}<select aria-label={t('Verified license')} value={draft.license} onChange={e=>edit({license:e.target.value})}><option value="private">{t('Not verified')}</option>{['CC0-1.0','CC-BY-4.0','CC-BY-SA-4.0','author-permission'].map(v=><option key={v}>{v}</option>)}</select></label>
          <label>{t('Permission evidence URL')}<input type="url" value={draft.evidenceUrl} onChange={e=>edit({evidenceUrl:e.target.value})}/></label>
          <label>{t('Private review note')}<textarea aria-label={t('Private review note')} aria-describedby="review-note-help" value={draft.note} minLength={10} maxLength={2000} onChange={e=>edit({note:e.target.value})}/><small id="review-note-help">{t('Write a review note (at least 10 characters).')}</small></label>
          <label className="review-check"><input type="checkbox" checked={draft.rightsChecked} onChange={e=>edit({rightsChecked:e.target.checked})}/>{t('I checked permission to redistribute the text and figures.')}</label>
          <label className="review-check"><input type="checkbox" checked={draft.contentChecked} onChange={e=>edit({contentChecked:e.target.checked})}/>{t('I checked the transcript, equations, figures and content.')}</label>
          {selected.includes(detail.id)&&needs.length===0&&<button type="button" className="primary" disabled={busy||loading} onClick={prepareApproval}>{t(canApprove?'Approve selected':'Review next selected paper')}</button>}
        </fieldset>}
        <details className="review-history"><summary>{t('Decision history')} · {detail.history.length}</summary>{detail.history.map(h=><div key={h.id}><strong>{t(({approve:'Approved',changes:'Changes requested',reject:'Not approved',retry:'Retry publication'} as Record<string,string>)[h.action]||h.action)}</strong><small>{new Date(h.created).toLocaleString()} · {h.reviewer}</small><p>{h.reason||h.evidence?.note}</p>{h.evidence&&<p>{h.evidence.license} · <a href={h.evidence.url} target="_blank" rel="noreferrer">{t('Permission evidence URL')}</a></p>}</div>)}</details>
        <ReaderContent key={detail.id+detail.token} paper={detail.paper} assetBase={`/api/admin/publications/${detail.id}`}/>
      </>}
    </section></div>
    {action&&<div className="modal-backdrop"><section className="review-confirm" role="dialog" aria-modal="true" aria-label={t('Confirm review')}><h2>{t('Confirm review')}</h2><p>{t('{count} selected',{count:selected.length})} · {t(({approve:'Approve selected',changes:'Request changes',reject:'Decline',retry:'Retry publication'} as Record<string,string>)[action])}</p>{['changes','reject'].includes(action)?<label>{t('Message to contributor')}<textarea autoFocus value={reason} maxLength={1000} onChange={e=>setReason(e.target.value)}/></label>:<p>{t('Approved papers and figures will be published for everyone. This does not share personal notes or chats.')}</p>}<div><button className="secondary" disabled={busy} onClick={()=>setAction('')}>{t('Cancel')}</button><button className="primary" disabled={busy||(['changes','reject'].includes(action)&&reason.trim().length<10)} onClick={()=>void decide()}>{busy?t('Saving…'):t('Confirm')}</button></div></section></div>}
  </main>
}

import {useEffect,useRef,useState} from 'react'
import {api,type Paper,type Artifact,type Job} from './api'
import {t,languageNames} from './i18n'
type Piece={id:string;text:string;display?:string;sentences:{id:string;text:string;display?:string}[]}
type Request={id:string;language:string;segmentId:string}
export function PieceTranslation({paper,language,quote,needLogin,notify,onLanguageChange,onOpen}:{onOpen:(language:string)=>void;paper:Paper;language:string;quote:string;needLogin:()=>boolean;notify:(s:string)=>void;onLanguageChange:(s:string)=>void}) {
 const [pieces,setPieces]=useState<Piece[]>([]),[paragraph,setParagraph]=useState(''),[sentence,setSentence]=useState(''),[artifacts,setArtifacts]=useState<Artifact[]>([])
 const [pending,setPending]=useState(false),[request,setRequest]=useState<Request|null>(null),[status,setStatus]=useState<Job|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
 const epoch=useRef(0),sending=useRef(false)
 const selected=pieces.find(p=>p.id===paragraph),id=sentence||paragraph,ready=artifacts.find(a=>a.kind==='translation'&&a.language===language&&a.segmentId===id)
 const selectedRequest=request?.language===language&&request.segmentId===id
 useEffect(()=>{
  const generation=++epoch.current,controller=new AbortController();sending.current=false
  setPieces([]);setArtifacts([]);setParagraph('');setSentence('');setRequest(null);setStatus(null);setError('');setPending(false)
  void Promise.allSettled([
   api<{segments:Piece[]}>(`/papers/${paper.id}/segments`,{signal:controller.signal}),
   api<{artifacts:Artifact[]}>(`/papers/${paper.id}/artifacts`,{signal:controller.signal})
  ]).then(([segments,translations])=>{
   if(controller.signal.aborted||epoch.current!==generation)return
   if(segments.status==='fulfilled')setPieces(segments.value.segments);else setError(segments.reason.message)
   if(translations.status==='fulfilled')setArtifacts(translations.value.artifacts);else setError(translations.reason.message)
  })
  return()=>{epoch.current++;controller.abort()}
 },[paper.id,paper.revision,attempt])
 useEffect(()=>{
  const found=pieces.find(p=>quote&&p.text.replace(/\s+/g,' ').includes(quote.replace(/\s+/g,' ').slice(0,80)))
  setParagraph(current=>found?.id||(pieces.some(p=>p.id===current)?current:pieces[0]?.id||''));setSentence('')
 },[pieces,quote])
 useEffect(()=>{
  if(!request)return
  const controller=new AbortController(),generation=epoch.current,deadline=Date.now()+15*60_000;let timer:ReturnType<typeof setTimeout>
  const current=()=>!controller.signal.aborted&&epoch.current===generation
  const poll=async()=>{
   let interrupted=false
   try{
    const progress=await api<{job:Job}>(`/jobs/${request.id}`,{signal:controller.signal})
    if(!current())return
    setStatus(progress.job)
    const saved=await api<{artifacts:Artifact[]}>(`/papers/${paper.id}/artifacts`,{signal:controller.signal})
    if(!current())return
    setArtifacts(saved.artifacts)
    if(saved.artifacts.some(a=>a.kind==='translation'&&a.language===request.language&&a.segmentId===request.segmentId)){setRequest(null);setError('');return}
    if(progress.job.state==='failed'){setError(progress.job.message);setRequest(null);return}
    setError('')
   }catch(e){if(!current())return;setError((e as Error).message);if([401,403,404].includes((e as {status:number}).status)){setRequest(null);return}interrupted=true}
   if(!current())return
   if(Date.now()>=deadline){setRequest(null);return}
   timer=setTimeout(()=>void poll(),interrupted||document.visibilityState==='hidden'?15000:2500)
  }
  void poll()
  return()=>{controller.abort();clearTimeout(timer)}
 },[request,paper.id,paper.revision])
 async function translate(){
  if(!id||sending.current||needLogin())return
  const generation=epoch.current;sending.current=true;setPending(true);setError('')
  try{
   const result=await api<{job:Job}>(`/papers/${paper.id}/assist`,{method:'POST',body:JSON.stringify({kind:'translation',language,segmentId:id})})
   if(generation!==epoch.current)return
   setStatus(result.job);setRequest({id:result.job.id,language,segmentId:id})
   notify(t(result.job.state==='failed'?result.job.message:'Translation requested. Existing work is reused.'))
  }catch(e){if(generation===epoch.current)setError((e as Error).message)}
  finally{if(generation===epoch.current){sending.current=false;setPending(false)}}
 }
 return <section className="piece-translation"><h3>{t('Translate a paragraph or sentence')}</h3><p className="muted">{t('Only missing pieces use the model. Saved translations are reused.')}</p>
  {error&&<div role="alert"><p>{t(error)}</p>{!pieces.length&&<button className="secondary" onClick={()=>setAttempt(v=>v+1)}>{t('Try again')}</button>}</div>}
  <label>{t('Read in')}<select value={language} onChange={e=>onLanguageChange(e.target.value)}>{Object.entries(languageNames).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>
  <label>{t('Paragraph')}<select value={paragraph} onChange={e=>{setParagraph(e.target.value);setSentence('')}}>{pieces.map((p,i)=><option key={p.id} value={p.id}>{i+1}. {(p.display||p.text).slice(0,85)}</option>)}</select></label>
  <label>{t('Sentence')}<select value={sentence} onChange={e=>setSentence(e.target.value)}><option value="">{t('Entire paragraph')}</option>{selected?.sentences.filter(s=>s.text.trim()).map((s,i)=><option key={s.id} value={s.id}>{i+1}. {(s.display||s.text).slice(0,85)}</option>)}</select></label>
  {selected&&<details><summary>{t('This passage')}</summary><blockquote>{sentence?(selected.sentences.find(s=>s.id===sentence)?.display||selected.sentences.find(s=>s.id===sentence)?.text):(selected.display||selected.text)}</blockquote></details>}
  {selectedRequest&&status&&<p role="status">{t(status.message)}</p>}
  {ready?<button className="secondary" onClick={()=>onOpen(language)}>{t('Open in reader')}</button>:<button className="secondary" disabled={!id||pending||!!selectedRequest} onClick={()=>void translate()}>{t(pending||selectedRequest?'Translating…':error?'Try again':'Translate this passage')}</button>}
 </section>
}

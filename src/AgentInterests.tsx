import {clearRecommendations} from './recommendation-cache'
import {useEffect,useRef,useState} from 'react'
import {post} from './api'
import {t} from './i18n'

export type Recommendations={state:'pending'|'chosen'|'skipped';interests:string}
export function AgentInterests({value,chatId,updated,saved}:{value:Recommendations;chatId:string;updated:(v:Recommendations)=>void;saved:(id:string)=>void}) {
 const [open,setOpen]=useState(value.state==='pending'),[text,setText]=useState(value.interests),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const live=useRef(true),attempt=useRef({text:'',id:''})
 useEffect(()=>{live.current=true;return()=>{live.current=false}},[])
 async function submit(skip=false){
  setBusy(true);setError('')
  if(attempt.current.text!==text||!attempt.current.id)attempt.current={text,id:crypto.randomUUID()}
  try{const r=await post<{recommendations:Recommendations;chat?:{id:string}}>('/chats/interests',skip?{skip:true}:{text,chatId,requestId:attempt.current.id});if(!live.current)return;clearRecommendations();updated(r.recommendations);window.dispatchEvent(new Event('onlyideas:refresh-library'));setOpen(false);if(r.chat)saved(r.chat.id)}
  catch(e){if(live.current)setError((e as Error).message)}finally{if(live.current)setBusy(false)}
 }
 return <section className="agent-interests">
  <button type="button" className="text-button" aria-expanded={open} onClick={()=>{setText(value.interests);setOpen(!open)}}>{t(open?'What would you like to follow?':'Reading interests')}</button>
  {open&&<form onSubmit={e=>{e.preventDefault();void submit()}}>
   <p>{t('Tell me a few topics you enjoy. I can use them for your daily papers.')}</p>
   <label><span className="sr-only">{t('Topics you enjoy')}</span><input aria-label={t('Topics you enjoy')} value={text} maxLength={120} placeholder={t('For example: health, technology, art or climate')} onChange={e=>setText(e.target.value)}/></label>
   <div className="interest-actions"><button className="primary" disabled={busy||!text.trim()}>{t('Save interests')}</button><button type="button" disabled={busy} onClick={()=>value.state==='pending'?void submit(true):setOpen(false)}>{t(value.state==='pending'?'Not now':'Cancel')}</button></div>
   {error&&<p role="alert">{error}</p>}
  </form>}
 </section>
}

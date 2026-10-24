import {useEffect,useRef,useState} from 'react'
import {api} from './api'
import {t,languageNames} from './i18n'
import {clearRecommendations} from './recommendation-cache'

type Option={id:string;name:string}
export type ReadingPreferences={interests:string;topics:string[];journals:string[];journalScope:'all'|'selected';revision:string;discipline:string;language:string;dailyEnabled:boolean;dailyTime:string;timezone:string;commentAlerts:boolean;likeAlerts:boolean}
type Choices={topics:Option[];journals:Option[];defaults:Pick<ReadingPreferences,'interests'|'topics'|'journals'|'journalScope'>}
export function ResearchPreferences({close,saved}:{close:()=>void;saved?:()=>void}) {
 const [prefs,setPrefs]=useState<ReadingPreferences>(),[choices,setChoices]=useState<Choices>(),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const live=useRef(true),dialog=useRef<HTMLDialogElement>(null)
 async function load(){setError('');try{const [r,c]=await Promise.all([api<{preferences:ReadingPreferences}>('/preferences'),api<Choices>('/preferences/options')]);if(live.current){setPrefs(r.preferences);setChoices(c)}}catch(e){if(live.current)setError((e as Error).message)}}
 useEffect(()=>{live.current=true;dialog.current?.showModal();void load();return()=>{live.current=false}},[])
 async function save(){if(!prefs)return;setBusy(true);setError('');try{await api('/preferences',{method:'PUT',body:JSON.stringify(prefs)});if(!live.current)return;clearRecommendations();window.dispatchEvent(new Event('onlyideas:preferences-changed'));window.dispatchEvent(new Event('onlyideas:refresh-library'));saved?.();close()}catch(e){if(live.current)setError((e as Error).message)}finally{if(live.current)setBusy(false)}}
 function toggle(key:'topics'|'journals',id:string){if(prefs)setPrefs({...prefs,[key]:prefs[key].includes(id)?prefs[key].filter(x=>x!==id):[...prefs[key],id]})}
 const valid=!!prefs&&(prefs.topics.length>0||!!prefs.interests.trim())&&(prefs.journalScope==='all'||prefs.journals.length>0)
 return <dialog className="research-preferences" ref={dialog} onCancel={e=>{e.preventDefault();close()}} aria-labelledby="research-preferences-title">
  <header><div><span className="eyebrow">OnlyIdeas</span><h2 id="research-preferences-title">{t('Tune your feed')}</h2></div><button aria-label={t('Close')} onClick={close}>×</button></header>
  <div className="research-preferences-body">
   {!prefs&&!error&&<p role="status">{t('Loading…')}</p>}
   {prefs&&choices&&<>
    <fieldset><legend>{t('Topics')}</legend><div className="preference-chips">{choices.topics.map(o=><button type="button" key={o.id} aria-pressed={prefs.topics.includes(o.id)} onClick={()=>toggle('topics',o.id)}>{t(o.name)}</button>)}</div></fieldset>
    <label className="preference-custom">{t('Your interests')}<input aria-label={t('Your interests')} value={prefs.interests} maxLength={120} placeholder={t('Add keywords, separated by commas')} onChange={e=>setPrefs({...prefs,interests:e.target.value})}/></label>
    <fieldset><legend>{t('Journals')}</legend><label className="check-label"><input type="checkbox" checked={prefs.journalScope==='all'} onChange={e=>setPrefs({...prefs,journalScope:e.target.checked?'all':'selected'})}/>{t('All journals')}</label>{prefs.journalScope==='selected'&&<div className="preference-chips journals">{choices.journals.map(o=><button type="button" key={o.id} aria-pressed={prefs.journals.includes(o.id)} onClick={()=>toggle('journals',o.id)}>{o.name==='Proceedings of the National Academy of Sciences'?'PNAS':o.name}</button>)}</div>}</fieldset>
    <details><summary>{t('Language & notifications')}</summary><label>{t('Preferred reading language')}<select value={prefs.language} onChange={e=>setPrefs({...prefs,language:e.target.value})}>{Object.entries(languageNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>{([['dailyEnabled','Daily reading reminder'],['commentAlerts','Comment notifications'],['likeAlerts','Like notifications']]as const).map(([key,label])=><label className="check-label" key={key}><input type="checkbox" checked={prefs[key]} onChange={e=>setPrefs({...prefs,[key]:e.target.checked})}/>{t(label)}</label>)}{prefs.dailyEnabled&&<label>{t('Daily time')}<input type="time" value={prefs.dailyTime} onChange={e=>setPrefs({...prefs,dailyTime:e.target.value,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone})}/><small>{prefs.timezone}</small></label>}</details>
    <p className="muted">{t('You can also ask Agent to change these choices.')}</p>
    <button className="text-button" onClick={()=>setPrefs({...prefs,...choices.defaults,discipline:''})}>{t('Restore recommended defaults')}</button>
   </>}
   {error&&<p role="alert">{t(error)} <button onClick={()=>void load()}>{t('Reload settings')}</button></p>}
  </div>
  <footer><button onClick={close}>{t('Cancel')}</button><button className="primary" disabled={!valid||busy} onClick={()=>void save()}>{t(busy?'Saving…':'Save preferences')}</button></footer>
 </dialog>
}

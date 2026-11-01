import {useEffect,useRef,useState} from 'react'
import {api} from './api'
import {t} from './i18n'

type Settings={days:number;revision:number;nextAt:number;timezone:string}
export function CreditSettings(){
 const [settings,setSettings]=useState<Settings>(),[days,setDays]=useState('7'),[error,setError]=useState(''),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false)
 const alive=useRef(false),pending=useRef(false)
 useEffect(()=>{alive.current=true;void api<Settings>('/admin/credits/reset').then(value=>{if(alive.current){setSettings(value);setDays(String(value.days))}}).catch(e=>{if(alive.current)setError(e.message)});return()=>{alive.current=false}},[])
 async function save(){
  if(!settings||pending.current)return
  const value=Number(days)
  if(!Number.isSafeInteger(value)||value<1||value>365){setError(t('Choose a reset period between 1 and 365 days.'));return}
  pending.current=true;setBusy(true);setSaved(false);setError('')
  try{const result=await api<Settings>('/admin/credits/reset',{method:'PUT',body:JSON.stringify({days:value,revision:settings.revision})});if(alive.current){setSettings(result);setDays(String(result.days));setSaved(true);window.dispatchEvent(new Event('onlyideas:credits-changed'))}}
  catch(e){if(alive.current)setError((e as Error).message)}
  finally{pending.current=false;if(alive.current)setBusy(false)}
 }
 return <details className="credit-settings"><summary>{t('Daily credit settings')}</summary>
  <p>{t('Unused daily credits reset on Mondays at 00:00 UTC by default.')}</p>
  <label>{t('Daily credit reset period (days)')}<input type="number" min="1" max="365" step="1" value={days} disabled={busy||!settings} onChange={e=>{setDays(e.target.value);setSaved(false)}}/></label>
  <p className="fine">{t('Use 1 for daily resets or 7 for weekly resets. Changes apply to new grants; existing expiry dates stay the same.')}</p>
  <button className="secondary" disabled={busy||!settings||Number(days)===settings.days} onClick={()=>void save()}>{t('Save credit settings')}</button>
  {saved&&<p role="status">{t('Credit settings saved. No app update is needed.')}</p>}
  {error&&<p role="alert">{error}</p>}
 </details>
}

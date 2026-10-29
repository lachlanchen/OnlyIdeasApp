import {confirmSharing,clearSharingChoices,type SharingChoice} from './sharing-consent'
import {authRevision} from './native'
import { useEffect, useState } from 'react'
import { api,type Session } from './api'
import { t } from './i18n'
export type Credits = { enabled:boolean; earningEnabled?:boolean; balance:number; held:number; maxPDF:number; daily?:{enabled:boolean;amount:number;nextAt:number}; policy:{publication:number;rewardPerDay:number}; history:{kind:string;delta:number;created:number}[] }
export const creditLabels:Record<string,string>={welcome:'Welcome credits',private_import:'Private import',unused_reservation:'Unused reservation',failed_import:'Import refund',public_reward:'Public contribution',subscription:'Monthly plan credits',purchase_refund:'Purchase refund'}
async function authorizeCredits(pdfs=0,others=0,retryCost=0):Promise<number|null> {
 const credits=await api<Credits>('/credits')
 if(!credits.enabled)return 0
 const total=retryCost||pdfs*credits.maxPDF+others
 if(!window.confirm(t('Use up to {count} credits? Failed imports and unused credits are refunded.',{count:total})))return null
 return retryCost||(pdfs?credits.maxPDF:1)
}
export async function authorizeImport(shared:boolean,pdfs=0,others=0,key=''):Promise<(SharingChoice&{creditLimit:number})|null>{
 const revision=await authRevision(),session=await api<Session>('/session')
 if(!session.user||revision!==await authRevision())return null
 const choice:SharingChoice=shared?await confirmSharing(session.user.id,key):{sharing:'private'}
 if(revision!==await authRevision())return null
 const creditLimit=choice.sharing==='shared'?0:await authorizeCredits(pdfs,others)
 return creditLimit===null||revision!==await authRevision()?null:{...choice,creditLimit}
}
// A retry preserves server-stored visibility and permission; it never asks for a new license.
export const authorizeRetry=(cost:number)=>cost>0?authorizeCredits(0,0,cost):Promise.resolve(0)
export function CreditRules({credits}:{credits:Credits}) {
 return <>{credits.daily?.enabled&&<p>{t('Get {count} credits each day you use OnlyIdeas. Unused credits carry over. Resets at 00:00 UTC.',{count:credits.daily.amount})}</p>}<p>{t('Shared papers earn {reward} credits once approved and published. Duplicate papers earn no extra credits. Up to {limit} credits per day.',{reward:credits.policy.publication,limit:credits.policy.rewardPerDay})}</p>{credits.enabled&&<p>{t('Private PDFs cost 1 credit per page; other files cost 1 credit. Credits never expire.')}</p>}</>
}
export function CreditsPanel() {
 const [credits,setCredits]=useState<Credits|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
 useEffect(()=>{
  const refresh=()=>setAttempt(n=>n+1),visible=()=>{if(document.visibilityState==='visible')refresh()}
  const events=['online','pageshow','onlyideas:resume']
  events.forEach(name=>window.addEventListener(name,refresh));document.addEventListener('visibilitychange',visible)
  return()=>{events.forEach(name=>window.removeEventListener(name,refresh));document.removeEventListener('visibilitychange',visible)}
 },[])
 useEffect(()=>{let active=true;api<Credits>('/credits').then(c=>{if(active){setCredits(c);setError('')}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[attempt])
 return <section className="credit-panel"><h2>{t('LAC · LazyingArt Coins')}</h2>{!credits&&!error&&<p role="status">{t('Loading balance…')}</p>}{credits&&<><div className="credit-balance"><strong>{credits.balance}</strong><span>{t('OnlyIdeas balance')}</span></div><p className="fine">{t('Non-transferable app credits. No cash value.')}</p>{credits.held>0&&<p>{t('Reserved for imports')}: {credits.held}</p>}{(credits.earningEnabled??credits.enabled)?<CreditRules credits={credits}/>:<p>{t('Earning and spending are not enabled for this account. Your balance is preserved.')}</p>}<details><summary>{t('Credit history')}</summary><ul className="credit-history">{credits.history.map((item,i)=><li key={i}><span>{t(creditLabels[item.kind]||item.kind)}<small>{new Date(item.created).toLocaleDateString()}</small></span><strong>{item.delta>0?'+':''}{item.delta}</strong></li>)}</ul></details></>}{error&&<div role="status"><p>{t('Could not refresh your balance.')}{credits&&' '+t('Last known balance')}</p><button className="secondary" onClick={()=>setAttempt(v=>v+1)}>{t('Retry')}</button></div>}</section>
}
export function SharingOptions({sharing,setSharing}:{sharing:string;setSharing:(s:string)=>void}) {
 const [credits,setCredits]=useState<Credits|null>(null)
 useEffect(()=>{let active=true;api<Credits>('/credits').then(c=>{if(active)setCredits(c)}).catch(()=>{});return()=>{active=false}},[])
 return <details className="sharing-options"><summary>{t(sharing==='shared'?'Shared reading room':'Only me')} · {t('Options')}</summary><div className="sharing-popover"><label>{t('Paper sharing')}<select aria-label={t('Paper visibility')} value={sharing} onChange={e=>setSharing(e.target.value)}><option value="shared">{t('Shared reading room')}</option><option value="private">{t('Only me')}</option></select></label><p>{t('Choose a license when uploading. Confirmed sharing is immediate, with administrator review afterward.')}</p><p>{t('Share your own work or papers you have permission to publish.')}</p>{credits&&(credits.earningEnabled??credits.enabled)&&<CreditRules credits={credits}/>}<button type="button" className="text-button" onClick={async()=>{const s=await api<Session>('/session');if(s.user){clearSharingChoices(s.user.id);window.alert(t('Sharing choices reset. Choose again on your next import. Existing papers are unchanged.'))}}}>{t('Reset saved sharing choices')}</button><p>{t('Your chats and notes stay private.')}</p><p>{t('PDF and image recognition uses Mathpix. Word and text files are converted on the server.')}</p></div></details>
}

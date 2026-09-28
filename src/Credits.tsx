import { useEffect, useState } from 'react'
import { api } from './api'
import { t } from './i18n'
export type Credits = { enabled:boolean; balance:number; held:number; maxPDF:number; policy:{publication:number;rewardPerDay:number}; history:{kind:string;delta:number;created:number}[] }
export const creditLabels:Record<string,string>={welcome:'Welcome credits',private_import:'Private import',unused_reservation:'Unused reservation',failed_import:'Import refund',public_reward:'Public contribution',subscription:'Monthly plan credits',purchase_refund:'Purchase refund'}
export async function authorizeImport(shared:boolean, pdfs=0, others=0, retryCost=0):Promise<number|null> {
  if(shared) return 0
  const credits=await api<Credits>('/credits')
  if(!credits.enabled) return 0
  const total=retryCost || pdfs*credits.maxPDF+others
  if(!window.confirm(t('Use up to {count} credits? Failed imports and unused credits are refunded.',{count:total})))return null
  return retryCost || (pdfs?credits.maxPDF:1)
}
export function CreditRules({credits}:{credits:Credits}) {
 return <><p>{t('Shared papers earn {reward} credits once approved and published. Duplicate papers earn no extra credits. Up to {limit} credits per day.',{reward:credits.policy.publication,limit:credits.policy.rewardPerDay})}</p><p>{t('Private PDFs cost 1 credit per page; other files cost 1 credit. Credits never expire.')}</p></>
}
export function CreditsPanel() {
 const [credits,setCredits]=useState<Credits|null>(null),[error,setError]=useState('')
 useEffect(()=>{let active=true;api<Credits>('/credits').then(c=>{if(active)setCredits(c)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[])
 if(!credits?.enabled&&!error)return null
 return <><section className="credit-panel"><h2>{t('Reading credits')}</h2>{error?<p role="status">{t(error)}</p>:credits&&<><div className="credit-balance"><strong>{credits.balance}</strong><span>{t('Available credits')}</span></div>{credits.held>0&&<p>{t('Reserved for imports')}: {credits.held}</p>}<CreditRules credits={credits}/><details><summary>{t('Credit history')}</summary><ul className="credit-history">{credits.history.map((item,i)=><li key={i}><span>{t(creditLabels[item.kind]||item.kind)}<small>{new Date(item.created).toLocaleDateString()}</small></span><strong>{item.delta>0?'+':''}{item.delta}</strong></li>)}</ul></details></>}</section></>
}
export function SharingOptions({sharing,setSharing}:{sharing:string;setSharing:(s:string)=>void}) {
 const [credits,setCredits]=useState<Credits|null>(null)
 useEffect(()=>{let active=true;api<Credits>('/credits').then(c=>{if(active)setCredits(c)}).catch(()=>{});return()=>{active=false}},[])
 return <details className="sharing-options"><summary>{t(sharing==='shared'?'Shared reading room':'Only me')} · {t('Options')}</summary><div className="sharing-popover"><label>{t('Paper sharing')}<select aria-label={t('Paper visibility')} value={sharing} onChange={e=>setSharing(e.target.value)}><option value="shared">{t('Shared reading room')}</option><option value="private">{t('Only me')}</option></select></label><p>{t('Shared after source and community review.')}</p><p>{t('Share your own work or papers you have permission to publish.')}</p>{credits?.enabled&&<CreditRules credits={credits}/>}<p>{t('Your chats and notes stay private.')}</p><p>{t('PDF and image recognition uses Mathpix. Word and text files are converted on the server.')}</p></div></details>
}

import {useEffect,useState} from 'react'
import {api,post} from './api'
import {sharedSignIn} from './native'
import {t} from './i18n'
export function SharedAccount({notify}:{notify:(message:string)=>void}){
 const [status,setStatus]=useState<{linked:boolean;state:string}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 useEffect(()=>{let active=true;api<{linked:boolean;state:string}>('/auth/lazyingart/status').then(s=>{if(active)setStatus(s)}).catch(()=>{if(active)setError(t('Could not load account connection.'))});return()=>{active=false}},[])
 async function connect(){setBusy(true);try{await sharedSignIn('link')}catch(e){notify((e as Error).message);setBusy(false)}}
 return <section><h2>{t('LazyingArt account')}</h2><p>{t('Connect the same account across LazyingArt apps. Your papers, chats and purchases stay in OnlyIdeas.')}</p>{error&&<p role="status">{error}</p>}{status?.linked?<><p>{t('Account connected')}</p><button className="secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await post('/auth/lazyingart/disconnect',{});setStatus({linked:false,state:'disconnected'})}catch(e){notify((e as Error).message)}finally{setBusy(false)}}}>{t('Disconnect LazyingArt')}</button></>:<button className="secondary" disabled={busy||!status} onClick={()=>void connect()}>{t('Connect LazyingArt')}</button>}</section>
}

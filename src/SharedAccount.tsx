import {useEffect,useRef,useState} from 'react'
import {api,post} from './api'
import {sharedSignIn} from './native'
import {t} from './i18n'
type Connection = {linked:boolean;state:string}
export function SharedAccount({notify,signedOut}:{notify:(message:string)=>void;signedOut:()=>Promise<void>}) {
 const [status,setStatus]=useState<Connection|null>(null),[error,setError]=useState('')
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[attempt,setAttempt]=useState(0)
 const lifetime=useRef(0),request=useRef(0),working=useRef(false)
 useEffect(()=>{
  lifetime.current++
  const refresh=()=>setAttempt(n=>n+1)
  const visible=()=>{if(document.visibilityState==='visible')refresh()}
  const events=['online','pageshow','onlyideas:resume','onlyideas:signed-in','onlyideas:auth-error']
  events.forEach(name=>window.addEventListener(name,refresh))
  document.addEventListener('visibilitychange',visible)
  return()=>{lifetime.current++;request.current++;events.forEach(name=>window.removeEventListener(name,refresh));document.removeEventListener('visibilitychange',visible)}
 },[])
 useEffect(()=>{
  let active=true
  const id=++request.current
  setLoading(true);setError('')
  api<Connection>('/auth/lazyingart/status').then(s=>{if(active&&id===request.current)setStatus(s)}).catch(()=>{
   if(active&&id===request.current)setError(t('Could not load account connection.'))
  }).finally(()=>{if(active&&id===request.current)setLoading(false)})
  return()=>{active=false}
 },[attempt])
 async function connect() {
  if(working.current)return
  const generation=lifetime.current;working.current=true;setBusy(true)
  try{await sharedSignIn('link')}
  catch(e){if(generation===lifetime.current)notify((e as Error).message)}
  finally{working.current=false;if(generation===lifetime.current)setBusy(false)}
 }
 async function disconnect() {
  if(working.current)return
  const generation=lifetime.current;working.current=true;request.current++;setBusy(true)
  try{
   const result=await post<{signedOut:boolean}>('/auth/lazyingart/disconnect',{})
   if(generation!==lifetime.current)return
   if(result.signedOut)await signedOut()
   else setStatus({linked:false,state:'disconnected'})
  }catch(e){if(generation===lifetime.current)notify((e as Error).message)}
  finally{working.current=false;if(generation===lifetime.current){setBusy(false);setAttempt(n=>n+1)}}
 }
 const refreshing=status?.state==='refreshing'
 return <section className="shared-account">
  <h2>{t('LazyingArt account')}</h2>
  <p>{t('Connect the same account across LazyingArt apps. Your papers, chats and purchases stay in OnlyIdeas.')}</p>
  {loading?<p role="status">{t('Checking account connection…')}</p>:error?<div role="status"><p>{error}</p><button className="secondary" disabled={busy} onClick={()=>setAttempt(n=>n+1)}>{t('Retry')}</button></div>:refreshing?<div role="status"><p>{t('Updating account connection…')}</p><button className="secondary" disabled={busy} onClick={()=>setAttempt(n=>n+1)}>{t('Retry')}</button></div>:status?.linked?<>
   <p>{t('Account connected')}</p>
   <button className="secondary" disabled={busy} onClick={()=>void disconnect()}>{t('Disconnect LazyingArt')}</button>
  </>:<button className="secondary" disabled={busy||!status} onClick={()=>void connect()}>{t(status?.state==='reauthorize'?'Reconnect LazyingArt':'Connect LazyingArt')}</button>}
 </section>
}

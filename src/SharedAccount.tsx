import {useEffect,useRef,useState} from 'react'
import {api,post} from './api'
import {sharedSignIn,cancelSharedSignIn} from './native'
import {t} from './i18n'
type Connection = {linked:boolean;state:string;reauthentication?:string}
export function SharedAccount({notify,signedOut}:{notify:(message:string)=>void;signedOut:()=>Promise<void>}) {
 const [status,setStatus]=useState<Connection|null>(null),[error,setError]=useState('')
 const [connectionError,setConnectionError]=useState(''),[connectionCode,setConnectionCode]=useState('')
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[attempt,setAttempt]=useState(0)
 const lifetime=useRef(0),request=useRef(0),working=useRef(false)
 useEffect(()=>{
  lifetime.current++
  const refresh=()=>setAttempt(n=>n+1)
  const visible=()=>{if(document.visibilityState==='visible')refresh()}
  const events=['online','pageshow','onlyideas:resume','onlyideas:signed-in','onlyideas:auth-error','lazyingart:connection-changed']
  events.forEach(name=>window.addEventListener(name,refresh))
  document.addEventListener('visibilitychange',visible)
  return()=>{cancelSharedSignIn();lifetime.current++;request.current++;events.forEach(name=>window.removeEventListener(name,refresh));document.removeEventListener('visibilitychange',visible)}
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
 async function connect(mode:'link'|'reauthenticate'='link') {
  if(working.current)return
  const generation=lifetime.current;working.current=true;setBusy(true);setConnectionError('');setConnectionCode('')
  try{await sharedSignIn(mode);if(generation===lifetime.current)setAttempt(n=>n+1)}
  catch(e){if(generation===lifetime.current){const failure=e as Error&{code?:string};setConnectionError(failure.name==='AbortError'?'Connection cancelled. Your app account is unchanged.':failure.message);setConnectionCode(failure.code||'')}}
  finally{working.current=false;if(generation===lifetime.current)setBusy(false)}
 }
 async function disconnect() {
  if(working.current)return
  const generation=lifetime.current;working.current=true;request.current++;setBusy(true)
  try{
   const result=await post<{signedOut:boolean}>('/auth/lazyingart/disconnect',{})
   if(generation!==lifetime.current)return
   window.dispatchEvent(new Event('lazyingart:connection-changed'))
   if(result.signedOut)await signedOut()
   else setStatus({linked:false,state:'disconnected'})
  }catch(e){if(generation===lifetime.current)notify((e as Error).message)}
  finally{working.current=false;if(generation===lifetime.current){setBusy(false);setAttempt(n=>n+1)}}
 }
 const refreshing=status?.state==='refreshing'
 return <section className="shared-account">
  <h2>{t('LazyingArt account')}</h2>
  <h3>{t('Sign-in methods')}</h3>
  {status?.reauthentication&&<p>{status.reauthentication==='apple'?'Apple':status.reauthentication==='lazyingart'?'LazyingArt':'GitHub'}</p>}
  <p>{t('Start from the app account with the data and plan you want to keep. Connecting never combines accounts or transfers a plan.')}</p>
  {connectionError&&<div role="status"><p>{t(connectionError)}</p>{connectionCode==='local_reauthentication_required'&&status?.reauthentication==='github'&&<button className="secondary" disabled={busy} onClick={()=>void connect('reauthenticate')}>{t('Continue with GitHub')}</button>}<button className="secondary" onClick={()=>setConnectionError('')}>{t('Cancel')}</button></div>}
  <p>{t('Connect the same account across LazyingArt apps. Your papers, chats and purchases stay in OnlyIdeas.')}</p>
  {loading?<p role="status">{t('Checking account connection…')}</p>:error?<div role="status"><p>{error}</p><button className="secondary" disabled={busy} onClick={()=>setAttempt(n=>n+1)}>{t('Retry')}</button></div>:refreshing?<div role="status"><p>{t('Updating account connection…')}</p><button className="secondary" disabled={busy} onClick={()=>setAttempt(n=>n+1)}>{t('Retry')}</button></div>:status?.linked?<>
   <p>{t('Account connected')}</p>
   <button className="secondary" disabled={busy} onClick={()=>void disconnect()}>{t('Disconnect LazyingArt')}</button>
  </>:<button className="secondary" disabled={busy||!status} onClick={()=>void connect()}>{t(connectionCode==='account_already_linked'?'Choose another LazyingArt account':status?.state==='reauthorize'?'Reconnect LazyingArt':'Connect LazyingArt')}</button>}
  {busy&&<button className="secondary" onClick={cancelSharedSignIn}>{t('Cancel')}</button>}
 </section>
}

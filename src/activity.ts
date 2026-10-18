import {post} from './api'

// One foreground-use request per visible visit, triggered by interaction. The
// server validates identity/consent and deduplicates the canonical daily event.
// Background polls and sign-in callbacks never call this hook.
export function observeForegroundUse(signedIn:()=>boolean) {
 let sent=false
 const resume=()=>{if(document.visibilityState==='visible')sent=false}
 const use=()=>{if(sent||document.visibilityState!=='visible'||!signedIn())return;sent=true;void post('/lac/activity',{kind:'foreground'}).catch(()=>{})}
 document.addEventListener('visibilitychange',resume)
 document.addEventListener('pointerdown',use,{passive:true})
 document.addEventListener('keydown',use)
 return ()=>{document.removeEventListener('visibilitychange',resume);document.removeEventListener('pointerdown',use);document.removeEventListener('keydown',use)}
}

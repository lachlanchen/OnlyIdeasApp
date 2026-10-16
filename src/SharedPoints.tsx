import {useEffect,useRef,useState} from 'react'
export type SharedPointsState = {state:'ready';balance:string;pending:string;asOf:number;revision:string}|{state:'unavailable'|'link-required'|'consent-required'}
export function SharedPoints({load,text}:{load:()=>Promise<SharedPointsState>;text:(key:string)=>string}) {
 const [result,setResult]=useState<{attempt:number;value:SharedPointsState}|null>(null),[attempt,setAttempt]=useState(0)
 const read=useRef(load)
 useEffect(()=>{read.current=load},[load])
 const value=result?.attempt===attempt?result.value:null
 useEffect(()=>{const refresh=()=>setAttempt(n=>n+1),visible=()=>{if(document.visibilityState==='visible')refresh()};const events=['online','pageshow','onlyideas:resume','onlyideas:signed-in','onlyideas:auth-error','lazyingart:connection-changed'];events.forEach(name=>window.addEventListener(name,refresh));document.addEventListener('visibilitychange',visible);const timer=setInterval(visible,60000);return()=>{events.forEach(name=>window.removeEventListener(name,refresh));document.removeEventListener('visibilitychange',visible);clearInterval(timer)}},[])
 useEffect(()=>{let active=true;read.current().then(value=>{if(active)setResult({attempt,value})}).catch(()=>{if(active)setResult({attempt,value:{state:'unavailable'}})});return()=>{active=false}},[attempt])
 return <section className="shared-points" aria-label={text('Shared LAC points')}>
  <h3>{text('Shared LAC points')}</h3>
  <p>{text('Recognition points across linked LazyingArt apps. Separate from app credits and purchases.')}</p>
  {!value?<p role="status">{text('Loading shared points…')}</p>:value.state==='ready'?<>
   <p><strong data-testid="shared-lac-balance">{value.balance}</strong> LAC</p>
   {value.pending!=='0'&&<p>{text('Pending recognition')}: {value.pending}</p>}
   <p>{text('Non-transferable. No cash value, purchases or redemption.')}</p>
  </>:<p role="status">{text(value.state==='link-required'?'Connect your LazyingArt account to view shared points.':value.state==='consent-required'?'Reading shared points requires separate consent.':'Shared points are temporarily unavailable.')}</p>}
  {value&&<button type="button" className="secondary" onClick={()=>setAttempt(n=>n+1)}>{text('Refresh shared points')}</button>}
 </section>
}

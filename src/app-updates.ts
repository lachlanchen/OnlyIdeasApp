import {isSnoozed,type UpdateCandidate} from './update-policy'
export type UpdateState = {status:'idle'|'checking'|'current'|'error';candidate:UpdateCandidate|null;snoozed:boolean}
const interval=6*3600000,key='onlyideas.update-snooze.v1'
export class WebUpdates {
  private state:UpdateState={status:'idle',candidate:null,snoozed:false}
  private listeners=new Set<()=>void>()
  private pending?:Promise<void>
  private checkedAt=0
  private started=false
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn)}}
  snapshot=()=>this.state
  private set(patch:Partial<UpdateState>){this.state={...this.state,...patch};this.listeners.forEach(fn=>fn())}
  private snoozed(candidate:UpdateCandidate){try{return isSnoozed(JSON.parse(localStorage.getItem(key)||'null'),candidate.key)}catch{return false}}
  start=()=>{
    if(this.started)return;this.started=true;void this.check()
    const resume=()=>{if(document.visibilityState!=='hidden')void this.check()}
    document.addEventListener('visibilitychange',resume)
    window.addEventListener('online',()=>{void this.check(true)})
    window.setInterval(resume,interval)
  }
  check=(force=false):Promise<void>=>{
    if(this.pending)return this.pending
    if(!force&&Date.now()-this.checkedAt<interval){if(this.state.candidate)this.set({snoozed:this.snoozed(this.state.candidate)});return Promise.resolve()}
    this.pending=this.load().finally(()=>{this.pending=undefined});return this.pending
  }
  private async load(){
    this.set({status:'checking'})
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000)
    try{
      const response=await fetch('/web-release.json',{cache:'no-store',credentials:'omit',signal:abort.signal})
      if(!response.ok)throw Error('Unavailable')
      const release=await response.json()
      if(release?.schema!==1||typeof release.version!=='string'||!/^\d+(\.\d+){0,3}$/.test(release.version)||typeof release.revision!=='string'||!(/^[a-f0-9]{64}$/).test(release.revision))throw Error('Invalid deployment')
      const candidate=release.revision===__APP_REVISION__?null:{key:'web:'+release.revision,version:release.version}
      this.checkedAt=Date.now();this.set({status:'current',candidate,snoozed:candidate?this.snoozed(candidate):false})
    }catch{this.checkedAt=Date.now()-interval+15*60000;this.set({status:'error'})}
    finally{clearTimeout(timer)}
  }
  dismiss=()=>{if(!this.state.candidate)return;try{localStorage.setItem(key,JSON.stringify({key:this.state.candidate.key,at:Date.now()}))}catch{}this.set({snoozed:true})}
  apply=()=>{if(this.state.candidate&&this.state.status==='current'&&navigator.onLine!==false)window.location.reload()}
}
export const webUpdates=new WebUpdates()

import {useRef,useState} from 'react'
import {api,type Job} from './api'
import {authorizeImport} from './Credits'
import {t} from './i18n'
export function UploadPaper({researchId,jobId,shared=true,needLogin,notify,done}:{researchId?:string;jobId?:string;shared?:boolean;needLogin:()=>boolean;notify:(s:string)=>void;done:()=>void}) {
 const input=useRef<HTMLInputElement>(null),[busy,setBusy]=useState(false)
 return <><button className="secondary" disabled={busy} onClick={()=>{if(!needLogin())input.current?.click()}}>{t(busy?'Adding your paper…':'Upload my PDF')}</button><input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;setBusy(true)
  try{if(file.size>20_000_000)throw Error(t('Choose a PDF smaller than 20 MB.'));const limit=await authorizeImport(shared,1);if(limit===null)return;
   const r=await api<{job:Job}>('/import',{method:'POST',headers:{'Content-Type':'application/pdf','X-Request-Id':crypto.randomUUID(),'X-Paper-Sharing':shared?'shared':'private','X-Credit-Limit':String(limit),...(jobId?{'X-Recovery-Job-Id':jobId}:{'X-Research-Id':researchId!})},body:file});
   notify(t(r.job.state==='completed'?'Ready · existing paper reused':r.job.state==='failed'?r.job.message:'PDF queued for conversion.'));done()
  }catch(error){notify((error as Error).message)}finally{setBusy(false)}
 }}/></>
}

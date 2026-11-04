import {useEffect,useState} from 'react'
import {api} from './api'
import {downloadedPaper,cacheReading} from './offline'
import type {ReadingView,ReadingMode} from './parallel-reader'

export function sameReadingView(a:ReadingView|undefined,b:ReadingView){
 return !!a&&a.paperId===b.paperId&&a.revision===b.revision&&a.language===b.language&&a.sourceLanguage===b.sourceLanguage&&a.mmd===b.mmd&&a.translated===b.translated&&a.total===b.total&&a.complete===b.complete&&JSON.stringify(a.blocks)===JSON.stringify(b.blocks)
}
/** Cache paints first, but can never replace a newer network response. */
export function usePaperReading(paper:{id:string;revision:string;language:string},accountID:string|undefined,completedJobs:number){
 const key='onlyideas:reading:'+paper.id
 const savedLanguage=()=>{try{return sessionStorage.getItem(key)}catch{return null}}
 const [readLanguage,setReadLanguage]=useState(()=>savedLanguage()||(paper.language.startsWith('zh')?'en':'zh-Hans'))
 const [mode,setMode]=useState<ReadingMode>(()=>savedLanguage()?'interlaced':'original'),[reading,setReading]=useState<ReadingView>(),[reload,setReload]=useState(0)
 useEffect(()=>{
  let active=true,networkArrived=false;const controller=new AbortController()
  void downloadedPaper(paper.id,accountID).then(saved=>{
   const cached=saved?.paper.revision===paper.revision?saved.readings?.[readLanguage]:undefined
   if(active&&!networkArrived&&cached&&cached.paperId===paper.id&&cached.revision===paper.revision&&cached.language===readLanguage)setReading(current=>sameReadingView(current,cached)?current:cached)
  }).catch(()=>{})
  void api<ReadingView>(`/papers/${paper.id}/reading?language=${readLanguage}`,{signal:controller.signal}).then(value=>{
   if(!active||value.paperId!==paper.id||value.revision!==paper.revision||value.language!==readLanguage||typeof value.mmd!=='string'||!Array.isArray(value.blocks))return
   networkArrived=true;setReading(current=>sameReadingView(current,value)?current:value);void cacheReading(value,accountID).catch(()=>{})
  }).catch(()=>{})
  return()=>{active=false;controller.abort()}
 },[paper.id,paper.revision,readLanguage,accountID,completedJobs,reload])
 async function fetchLanguage(language:string){
  try{sessionStorage.setItem(key,language)}catch{ /* Reading still works without persistent storage. */ }
  if(language!==readLanguage)setReading(undefined)
  setReadLanguage(language);setMode('interlaced');setReload(value=>value+1)
 }
 return {readLanguage,reading,mode,setMode,fetchLanguage}
}

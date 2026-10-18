import {useEffect,useState} from 'react'
import {api} from './api'
import {t} from './i18n'
export type PaperReference={id:string;title:string;authors?:string}
export type MessageQuote={id:string;role:string;text:string}
export function PaperMentionPicker({query,select,close}:{query:string;select:(p:PaperReference)=>void;close:()=>void}) {
 const [papers,setPapers]=useState<PaperReference[]>([]),[error,setError]=useState('')
 useEffect(()=>{let active=true;setError('');const timer=setTimeout(()=>{void api<{papers:PaperReference[]}>('/paper-mentions?q='+encodeURIComponent(query)).then(r=>{if(active)setPapers(r.papers)}).catch(e=>{if(active)setError(e.message)})},160);return()=>{active=false;clearTimeout(timer)}},[query])
 return <section className="mention-picker" aria-label={t('Mention a paper')}><header><strong>{t('Mention a paper')}</strong><button type="button" onClick={close} aria-label={t('Close')}>×</button></header>{error?<p role="status">{error}</p>:papers.length?papers.map(p=><button type="button" key={p.id} onClick={()=>select(p)}><span>@</span><span><strong>{p.title}</strong><small>{p.authors}</small></span></button>):<p>{t('Search your reading library')}</p>}</section>
}

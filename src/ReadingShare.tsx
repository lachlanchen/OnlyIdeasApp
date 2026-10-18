import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {Share2,X,Copy,MessageCircle,BookMarked,Lightbulb} from 'lucide-react'
import {Capacitor} from '@capacitor/core'
import {Share} from '@capacitor/share'
import {t as translateDefault} from './i18n'
import './reading-share.css'

export function ReadingShare({title,url,app='OnlyIdeas',translate=translateDefault}:{title:string;url:string;app?:string;translate?:(key:string)=>string}) {
 const [open,setOpen]=useState(false),[notice,setNotice]=useState('')
 const t=translate
 const panel=useRef<HTMLElement>(null)
 useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;document.body.style.overflow='hidden';panel.current?.querySelector<HTMLButtonElement>('button')?.focus();return()=>{document.body.style.overflow=overflow;previous?.focus()}},[open])
 const text=title+'\n'+url
 async function copy(value=text){await navigator.clipboard.writeText(value)}
 async function action(kind:string){
  try {
   if(kind==='system'||kind==='wechat') {
    
    if(Capacitor.isNativePlatform())await Share.share({title,text,dialogTitle:t('Share')})
    else if(navigator.share)await navigator.share({title,text:title,url})
    else {await copy();setNotice(t('Link copied. Paste it into your chat.'));return}
    setOpen(false)
   } else if(kind==='copy'){await copy();setNotice(t('Copied'))}
   else if(kind==='echo'){await copy();setNotice(t('Copied. Paste into EchoMind to choose who to send it to.'))}
   else {await copy((kind==='save'?t('Save this to my reading list:'):t('Help me explore research ideas from:'))+'\n'+text);setNotice(t('Copied. Paste into AiMemo and review before sending.'))}
  }catch(error){if((error as Error).name!=='AbortError')setNotice(t('Could not share. Try copying the link.'))}
 }
 return <><button type="button" onClick={()=>{setOpen(true);setNotice('')}} aria-label={t('Share')}><Share2 size={17}/><span>{t('Share')}</span></button>{open&&createPortal(<div className="reading-share-backdrop" onClick={e=>{if(e.target===e.currentTarget)setOpen(false)}}><section ref={panel} className="reading-share" role="dialog" aria-modal="true" aria-label={t('Share')} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setOpen(false)};if(e.key==='Tab'){const buttons=Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')||[]),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}}><header><strong>{t('Share')}</strong><button type="button" autoFocus aria-label={t('Close')} onClick={()=>setOpen(false)}><X size={20}/></button></header><div className="reading-share-card"><img src="./apple-touch-icon.png" alt=""/><span><small>{app}</small><strong>{title}</strong></span></div><div className="reading-share-options"><button type="button" onClick={()=>void action('system')}><Share2 size={20}/>{t('Share via…')}</button><button type="button" onClick={()=>void action('wechat')}><MessageCircle size={20}/>{t('WeChat · choose in share sheet')}</button><button type="button" onClick={()=>void action('echo')}><MessageCircle size={20}/>{t('Copy for EchoMind')}</button><button type="button" onClick={()=>void action('save')}><BookMarked size={20}/>{t('AiMemo · save to read later')}</button><button type="button" onClick={()=>void action('ideas')}><Lightbulb size={20}/>{t('AiMemo · explore ideas')}</button><button type="button" onClick={()=>void action('copy')}><Copy size={20}/>{t('Copy link')}</button></div><p role="status">{notice}</p></section></div>,document.body)}</>
}

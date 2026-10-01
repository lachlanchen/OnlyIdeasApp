import {useEffect,useState} from 'react'
import {Capacitor} from '@capacitor/core'
import {X} from 'lucide-react'
import {t} from './i18n'
import defaults from '../public/store-availability.json'
import './store-links.css'

type Platform='ios'|'android'|'macos'
type Availability=Record<Platform,boolean>
const urls:Record<Platform,string>={
  ios:'https://apps.apple.com/app/id6816392935?platform=iphone',
  macos:'https://apps.apple.com/app/id6816392935?platform=mac',
  android:'https://play.google.com/store/apps/details?id=art.onlyideas.app',
}
function platform():Platform|null{
  const n=navigator
  if(/android/i.test(n.userAgent))return 'android'
  if(/iphone|ipad|ipod/i.test(n.userAgent)||(n.platform==='MacIntel'&&n.maxTouchPoints>1))return 'ios'
  return /mac/i.test(n.platform)?'macos':null
}
const dismissalKey=(p:Platform|null)=>'onlyideas.store-prompt.v1.'+p
function dismissed(p:Platform|null){
  try{const at=Number(localStorage.getItem(dismissalKey(p)));return at>0&&at<=Date.now()&&Date.now()-at<30*86400000}catch{return false}
}

export function StoreLinks({prompt=false}:{prompt?:boolean}){
  const [device]=useState(platform)
  const [hidden,setHidden]=useState(()=>dismissed(device))
  const [available,setAvailable]=useState<Availability>(defaults)
  const native=Capacitor.isNativePlatform()
  useEffect(()=>{
    if(native)return
    let active=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000)
    void fetch('/store-availability.json',{cache:'no-store',credentials:'omit',signal:controller.signal})
      .then(r=>{if(!r.ok)throw Error('Unavailable');return r.json()})
      .then(v=>{if(active&&v?.schema===1&&['ios','android','macos'].every(k=>typeof v[k]==='boolean'))setAvailable(v)})
      .catch(()=>{}).finally(()=>clearTimeout(timer))
    return()=>{active=false;clearTimeout(timer);controller.abort()}
  },[native])
  if(native||(prompt&&(!device||hidden||!available[device])))return null
  const dismiss=()=>{try{localStorage.setItem(dismissalKey(device),String(Date.now()))}catch{}setHidden(true)}
  const order:Platform[]=device?[device,...(['ios','android','macos'] as Platform[]).filter(p=>p!==device)]:['ios','android','macos']
  const name=(p:Platform)=>p==='android'?t('Open Google Play'):p==='macos'?'Mac App Store':t('Open App Store')+' · iPhone / iPad'
  return <section className={'store-access'+(prompt?' store-suggestion':'')} aria-label={t('Get the app')}>
    <div><h2>{t('Get the app')}</h2><p>{t('Read in the native app, or keep reading here.')}</p></div>
    <div className="store-access-actions">{(prompt&&device?[device]:order).map(p=>available[p]
      ?<a key={p} href={urls[p]} target="_blank" rel="noopener noreferrer" onClick={prompt?dismiss:undefined}>{name(p)} ↗</a>
      :<span className="store-pending" key={p}>{p==='android'?'Google Play':p==='macos'?'Mac App Store':'App Store · iPhone / iPad'} <small>{t('Coming soon')}</small></span>)}
      {prompt&&<button type="button" onClick={dismiss}>{t('Keep reading here')}</button>}
    </div>
    {prompt&&<button type="button" className="store-access-close" onClick={dismiss} aria-label={t('Close')}><X size={18}/></button>}
  </section>
}

import { useSyncExternalStore } from 'react'
import source from '../public/locales.json'
const catalog=source as Record<string,Record<string,string>>
export const languageNames:Record<string,string>={en:'English','zh-Hans':'简体中文','zh-Hant':'繁體中文',ja:'日本語',ko:'한국어',ar:'العربية',es:'Español',fr:'Français',de:'Deutsch',ru:'Русский',vi:'Tiếng Việt'}
export function normalizeLanguage(value:string){const v=value.toLowerCase();if(v.startsWith('zh'))return /hant|tw|hk|mo/.test(v)?'zh-Hant':'zh-Hans';return Object.keys(languageNames).find(l=>v===l||v.startsWith(l+'-'))||'en'}
export const languageChoice=()=>localStorage.getItem('onlyideas-language')||'system'
export const currentLanguage=()=>normalizeLanguage(languageChoice()==='system'?(navigator.languages?.[0]||navigator.language):languageChoice())
export function t(key:string,values:Record<string,string|number>={}){const progress=key.match(/^Translating (\d+)\/(\d+)$/);if(progress){key="Translating {current}/{total}";values={current:progress[1],total:progress[2]}}let text=catalog[currentLanguage()]?.[key]||key;for(const [k,v]of Object.entries(values))text=text.replaceAll('{'+k+'}',String(v));return text}
function apply(){document.documentElement.lang=currentLanguage();document.documentElement.dir=currentLanguage()==='ar'?'rtl':'ltr'}
export function setLanguage(value:string){localStorage.setItem('onlyideas-language',value);apply();window.dispatchEvent(new Event('onlyideas:language'))}
const subscribe=(fn:()=>void)=>{window.addEventListener('onlyideas:language',fn);return()=>window.removeEventListener('onlyideas:language',fn)}
export const useLanguage=()=>useSyncExternalStore(subscribe,languageChoice)
apply()

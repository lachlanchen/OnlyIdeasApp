import {useEffect,useSyncExternalStore} from 'react'
import {RefreshCw} from 'lucide-react'
import {webUpdates} from './app-updates'
import {t} from './i18n'
import './app-updates.css'
export function useAppUpdates(){const state=useSyncExternalStore(webUpdates.subscribe,webUpdates.snapshot);useEffect(()=>webUpdates.start(),[]);return {...state,check:webUpdates.check,dismiss:webUpdates.dismiss,apply:webUpdates.apply}}
type Props={updates:ReturnType<typeof useAppUpdates>;canReload:boolean}
export function AppUpdatePrompt({updates,canReload}:Props){
  if(!updates.candidate||updates.snoozed||!canReload)return null
  return <aside className="app-update-card" aria-label={t('Update available')}><RefreshCw size={20} aria-hidden="true"/><div><strong>{t('Update available')} · {updates.candidate.version}</strong><p>{t('A new version is ready. Update when you have finished reading or writing.')}</p><div className="app-update-actions"><button className="primary" disabled={updates.status!=='current'} onClick={()=>{if(canReload)updates.apply()}}>{t('Update & reload')}</button><button onClick={updates.dismiss}>{t('Later')}</button></div></div></aside>
}
export function AppUpdateSettings({updates,canReload}:Props){return <section className="app-update-settings"><h2>{t('App updates')}</h2><p>{t('Installed version')}: {__APP_VERSION__}</p><p role="status">{t(updates.status==='checking'?'Checking for updates…':updates.status==='error'?'Could not check for updates. Try again when online.':updates.candidate?'Update available':updates.status==='current'?'You’re up to date.':'')}</p><div className="app-update-actions"><button className="secondary" disabled={updates.status==='checking'} onClick={()=>void updates.check(true)}>{t('Check for updates')}</button>{updates.candidate&&<button className="primary" disabled={!canReload||updates.status!=='current'} onClick={()=>{if(canReload)updates.apply()}}>{t('Update & reload')}</button>}</div>{updates.candidate&&!canReload&&<p>{t('Return to the library and finish writing before updating.')}</p>}</section>}

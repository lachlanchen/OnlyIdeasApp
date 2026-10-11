import {t} from './i18n'
export type SharingConsent={license:string;attestation:true}
export type SharingChoice={sharing:'shared'|'private';sharingConsent?:SharingConsent}
export const consentHeaders=(choice:SharingChoice):Record<string,string>=>choice.sharing==='shared'&&choice.sharingConsent?{'X-Paper-License':choice.sharingConsent.license,'X-Paper-Rights':'confirmed'}:{}
const storageKey=(account:string)=>`onlyideas:${account}:sharing-choices`
export const clearSharingChoices=(account:string)=>localStorage.removeItem(storageKey(account))
export async function materialKey(value:string|Blob):Promise<string>{
 const bytes=typeof value==='string'?new TextEncoder().encode(value):await value.arrayBuffer()
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('')
}
function savedChoices(account:string):Record<string,SharingChoice>{try{return JSON.parse(localStorage.getItem(storageKey(account))||'{}')}catch{return {}}}
export function confirmSharing(account:string,key:string):Promise<SharingChoice>{
 const saved=savedChoices(account)[key]
 if(saved&&(saved.sharing==='private'||saved.sharing==='shared'&&(!saved.sharingConsent||['CC-BY-4.0','CC-BY-SA-4.0','CC0-1.0','author-permission'].includes(saved.sharingConsent.license)&&saved.sharingConsent.attestation===true)))return Promise.resolve(saved)
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog'),form=document.createElement('form');form.className='modal';form.method='dialog'
  const heading=document.createElement('h2');heading.textContent=t('Share this material?')
  const info=document.createElement('p');info.textContent=t('Confirm sharing permission for the text and all figures. Uploads are shared immediately and reviewed afterward.')+' '+t('Cancel keeps this material private. Your choice is remembered for this material.')
  const select=document.createElement('select');select.setAttribute('aria-label',t('Sharing license'))
  for(const license of ['CC-BY-4.0','CC-BY-SA-4.0','CC0-1.0','author-permission']){const o=document.createElement('option');o.value=license;o.textContent=license==='author-permission'?t('I have author permission'):license;select.append(o)}
  const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';label.append(check,document.createTextNode(t('I confirm permission to share the text and all figures under this license.')))
  const share=document.createElement('button');share.className='primary';share.textContent=t('Confirm & share');share.disabled=true;check.onchange=()=>{share.disabled=!check.checked}
  const review=document.createElement('button');review.type='button';review.className='secondary';review.textContent=t('Request review first')
  const cancel=document.createElement('button');cancel.type='button';cancel.className='text-button';cancel.textContent=t('Cancel')
  let done=false;const finish=(choice:SharingChoice)=>{if(done)return;done=true;dialog.close();dialog.remove();if(key){const entries=Object.entries(savedChoices(account)).filter(([id])=>id!==key).slice(-127);try{localStorage.setItem(storageKey(account),JSON.stringify(Object.fromEntries([...entries,[key,choice]])))}catch{/* Storage can be unavailable; the current choice still applies. */}}resolve(choice)}
  form.onsubmit=e=>{e.preventDefault();if(check.checked){finish({sharing:'shared',sharingConsent:{license:select.value,attestation:true}})}};review.onclick=()=>finish({sharing:'shared'});cancel.onclick=()=>finish({sharing:'private'});dialog.oncancel=e=>{e.preventDefault();finish({sharing:'private'})}
  form.append(heading,info,select,label,share,review,cancel);dialog.append(form);document.body.append(dialog);dialog.showModal()
 })
}

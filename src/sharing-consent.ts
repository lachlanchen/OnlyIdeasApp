import {t} from './i18n'
export type SharingConsent={license:string;attestation:true}
let current:SharingConsent|null=null
export const uploadConsent=()=>current
export const consentHeaders=():Record<string,string>=>current?{'X-Paper-License':current.license,'X-Paper-Rights':'confirmed'}:{}
export function confirmSharing():Promise<boolean>{
 current=null
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog'),form=document.createElement('form');form.className='modal';form.method='dialog'
  const heading=document.createElement('h2');heading.textContent=t('Share this material?')
  const info=document.createElement('p');info.textContent=t('Confirm sharing permission for the text and all figures. Uploads are shared immediately and reviewed afterward.')
  const select=document.createElement('select');select.setAttribute('aria-label',t('Sharing license'))
  for(const license of ['CC-BY-4.0','CC-BY-SA-4.0','CC0-1.0','author-permission']){const o=document.createElement('option');o.value=license;o.textContent=license==='author-permission'?t('I have author permission'):license;select.append(o)}
  const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';label.append(check,document.createTextNode(t('I confirm permission to share the text and all figures under this license.')))
  const share=document.createElement('button');share.className='primary';share.textContent=t('Confirm & share');share.disabled=true;check.onchange=()=>{share.disabled=!check.checked}
  const review=document.createElement('button');review.type='button';review.className='secondary';review.textContent=t('Request review first')
  const cancel=document.createElement('button');cancel.type='button';cancel.className='text-button';cancel.textContent=t('Cancel')
  let done=false;const finish=(ok:boolean)=>{if(done)return;done=true;dialog.close();dialog.remove();resolve(ok)}
  form.onsubmit=e=>{e.preventDefault();if(check.checked){current={license:select.value,attestation:true};finish(true)}};review.onclick=()=>finish(true);cancel.onclick=()=>finish(false);dialog.oncancel=e=>{e.preventDefault();finish(false)}
  form.append(heading,info,select,label,share,review,cancel);dialog.append(form);document.body.append(dialog);dialog.showModal()
 })
}

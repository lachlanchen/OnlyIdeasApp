import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
async function fixture(t){
 const dom=new JSDOM('<!doctype html>',{url:'https://onlyideas.invalid',runScripts:'outside-only'});t.after(()=>dom.window.close());
 const w=dom.window;w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.epoch=1;w.owner='alice';w.creditReads=0;w.confirm=()=>true;
 w.api=async path=>path==='/session'?{user:{id:w.owner}}:(w.creditReads++,{enabled:true,maxPDF:30});
 const bundle=await build({stdin:{contents:"export * from './src/sharing-consent';export {authorizeImport,authorizeRetry} from './src/Credits'",resolveDir:process.cwd()},bundle:true,format:'iife',globalName:'Sharing',write:false,plugins:[{name:'fixtures',setup(b){b.onResolve({filter:/^\.\/(api|native|i18n)$/},a=>['Credits.tsx','sharing-consent.ts'].some(n=>a.importer.endsWith(n))?{path:a.path,namespace:'fixture'}:null);b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='./api'?'export const api=(...a)=>window.api(...a)':a.path==='./native'?'export const authRevision=async()=>window.epoch':'export const t=k=>k',loader:'js'}))}}]});
 w.eval(bundle.outputFiles[0].text+';window.Sharing=Sharing');return w;
}
const tick=()=>new Promise(r=>setTimeout(r,0));
test('cancel means private, the exact material is remembered, other accounts/materials require their own choice',async t=>{
 const w=await fixture(t),s=w.Sharing;
 let pending=s.authorizeImport(true,1,0,'paper-a');await tick();
 [...w.document.querySelectorAll('button')].find(b=>b.textContent==='Cancel').click();
 const permission=await pending;assert.equal(permission.sharing,'private');assert.equal(permission.creditLimit,30);assert.equal(permission.sharingConsent,undefined);
 assert.equal((await s.authorizeImport(true,1,0,'paper-a')).sharing,'private');assert.equal(w.document.querySelector('dialog'),null);
 pending=s.confirmSharing('alice','paper-b');assert.ok(w.document.querySelector('dialog'));
 const check=w.document.querySelector('input');check.checked=true;check.dispatchEvent(new w.Event('change'));w.document.querySelector('select').value='CC0-1.0';w.document.querySelector('button.primary').click();
 assert.equal((await pending).sharingConsent.license,'CC0-1.0');assert.equal((await s.confirmSharing('alice','paper-b')).sharingConsent.license,'CC0-1.0');
 pending=s.confirmSharing('bob','paper-b');assert.ok(w.document.querySelector('dialog'));w.document.querySelector('dialog').dispatchEvent(new w.Event('cancel',{cancelable:true}));assert.equal((await pending).sharing,'private');
 s.clearSharingChoices('alice');pending=s.confirmSharing('alice','paper-a');assert.ok(w.document.querySelector('dialog'));w.document.querySelector('dialog').dispatchEvent(new w.Event('cancel',{cancelable:true}));await pending;
});
test('retry never opens license prompt, preserves costs, and account switch discards pending authorization',async t=>{
 const w=await fixture(t),s=w.Sharing;assert.equal(await s.authorizeRetry(0),0);assert.equal(w.creditReads,0);assert.equal(await s.authorizeRetry(12),12);assert.equal(w.document.querySelector('dialog'),null);
 const pending=s.authorizeImport(true,1,0,'paper');await tick();w.epoch++;w.owner='bob';const check=w.document.querySelector('input');check.checked=true;check.dispatchEvent(new w.Event('change'));w.document.querySelector('button.primary').click();assert.equal(await pending,null);
});

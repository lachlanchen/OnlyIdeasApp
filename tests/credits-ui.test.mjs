import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';
const balance={enabled:true,balance:45,held:0,maxPDF:30,policy:{publication:10,rewardPerDay:50},history:[{kind:'welcome',delta:45,created:1}]};
async function fixture(t){
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://onlyideas.invalid',runScripts:'outside-only',virtualConsole:new VirtualConsole()});t.after(()=>dom.window.close());
 const result=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {CreditsPanel} from './src/Credits';const root=createRoot(document.getElementById('root'));window.render=key=>flushSync(()=>root.render(<CreditsPanel key={key}/>));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic',plugins:[{name:'credit-fixture',setup(b){b.onResolve({filter:/^\.\/(api|native|i18n|sharing-consent)$/},a=>a.importer.endsWith('Credits.tsx')?{path:a.path,namespace:'fixture'}:null);b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='./api'?'export const api=(...a)=>window.api(...a);':a.path==='./native'?'export const authRevision=async()=>1;':a.path==='./sharing-consent'?'export const confirmSharing=()=>{};export const clearSharingChoices=()=>{};':'export const t=k=>k;',loader:'js'}))}}]});
 dom.window.eval(result.outputFiles[0].text);
 return {w:dom.window,settle:async()=>{for(let i=0;i<5;i++)await new Promise(r=>setTimeout(r,5))}};
}
test('balance has a visible loading state and can recover from an error without hiding the section',async t=>{
 const {w,settle}=await fixture(t);let reject;w.api=()=>new Promise((_,r)=>{reject=r});w.render('reader');await settle();
 assert.match(w.document.body.textContent,/LAC · LazyingArt Coins.*Loading balance/s);
 reject(Error('offline'));await settle();assert.match(w.document.body.textContent,/Could not refresh/);
 w.api=async()=>balance;[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Retry').click();await settle();
 assert.equal(w.document.querySelector('.credit-balance strong').textContent,'45');assert.match(w.document.body.textContent,/OnlyIdeas balance/);
});
test('disabled earning preserves visible saved balance and an old account response cannot replace a new account',async t=>{
 const {w,settle}=await fixture(t);let resolve;w.api=()=>new Promise(r=>{resolve=r});w.render('account-A');await settle();
 w.api=async()=>({...balance,enabled:false,balance:7});w.render('account-B');await settle();resolve(balance);await settle();
 assert.equal(w.document.querySelector('.credit-balance strong').textContent,'7');assert.match(w.document.body.textContent,/Your balance is preserved/);
});

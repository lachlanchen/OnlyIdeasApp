import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';

async function fixture(t){
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://onlyideas.invalid',runScripts:'outside-only',virtualConsole:new VirtualConsole()});t.after(()=>dom.window.close());
 const result=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {SharedAccount} from './src/SharedAccount';const root=createRoot(document.getElementById('root'));window.render=key=>flushSync(()=>root.render(<SharedAccount key={key} notify={m=>window.notices.push(m)} signedOut={async()=>{window.signouts++}}/>));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic',plugins:[{name:'account-fixture',setup(b){b.onResolve({filter:/^\.\/(api|native|i18n)$/},a=>a.importer.endsWith('SharedAccount.tsx')?{path:a.path,namespace:'fixture'}:null);b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='./api'?'export const api=(...a)=>window.api(...a);export const post=(...a)=>window.post(...a);':a.path==='./native'?'export const sharedSignIn=(...a)=>window.connect(...a);':'export const t=k=>k;',loader:'js'}))}}]});
 const w=dom.window;w.notices=[];w.signouts=0;w.connect=async()=>{};
 w.eval(result.outputFiles[0].text);
 return {w,button:label=>[...w.document.querySelectorAll('button')].find(b=>b.textContent===label),settle:async()=>{for(let i=0;i<5;i++)await new Promise(r=>setTimeout(r,5))}};
}
test('failed status can retry; a refresh lease never asks for consent and reconnect remains explicit',async t=>{
 const {w,button,settle}=await fixture(t);let starts=0;w.connect=async()=>{starts++};
 w.api=async()=>{throw Error('offline')};w.render('reader');await settle();
 assert.match(w.document.body.textContent,/Could not load account connection/);assert.equal(button('Connect LazyingArt'),undefined);
 w.api=async()=>({linked:false,state:'refreshing'});button('Retry').click();await settle();
 assert.match(w.document.body.textContent,/Updating account connection/);assert.equal(button('Connect LazyingArt'),undefined);assert.equal(starts,0);
 w.api=async()=>({linked:false,state:'reauthorize'});button('Retry').click();await settle();
 assert.ok(button('Reconnect LazyingArt'));assert.equal(starts,0);
 button('Reconnect LazyingArt').click();await settle();assert.equal(starts,1);assert.equal(button('Reconnect LazyingArt').disabled,false);
});
test('browser return releases the button; resume refreshes status without another authorization',async t=>{
 const {w,button,settle}=await fixture(t);let finish,starts=0;
 w.api=async()=>({linked:false,state:'unlinked'});w.connect=()=>{starts++;return new Promise(r=>{finish=r})};w.render('reader');await settle();
 button('Connect LazyingArt').click();button('Connect LazyingArt').click();await settle();assert.equal(starts,1);assert.equal(button('Connect LazyingArt').disabled,true);
 finish();await settle();assert.equal(button('Connect LazyingArt').disabled,false);
 w.api=async()=>({linked:true,state:'active'});w.dispatchEvent(new w.Event('onlyideas:resume'));await settle();
 assert.match(w.document.body.textContent,/Account connected/);assert.ok(button('Disconnect LazyingArt'));assert.equal(starts,1);
 w.api=async()=>{throw Error('offline')};w.dispatchEvent(new w.Event('online'));await settle();
 assert.equal(button('Connect LazyingArt'),undefined);assert.equal(button('Disconnect LazyingArt'),undefined);assert.ok(button('Retry'));
});
test('late reads cannot cross account changes or replace a completed disconnect',async t=>{
 const {w,button,settle}=await fixture(t);let oldRead;
 w.api=()=>new Promise(r=>{oldRead=r});w.render('account-A');await settle();
 w.api=async()=>({linked:true,state:'active'});w.render('account-B');await settle();oldRead({linked:false,state:'unlinked'});await settle();assert.ok(button('Disconnect LazyingArt'));
 let finish;w.post=()=>new Promise(r=>{finish=r});button('Disconnect LazyingArt').click();await settle();
 let stale;w.api=()=>new Promise(r=>{stale=r});w.dispatchEvent(new w.Event('onlyideas:resume'));await settle();
 w.api=async()=>({linked:false,state:'disconnected'});finish({signedOut:false});await settle();stale({linked:true,state:'active'});await settle();
 assert.ok(button('Connect LazyingArt'));assert.equal(button('Disconnect LazyingArt'),undefined);assert.equal(w.signouts,0);
});
test('a late disconnect cannot sign out a newly mounted account',async t=>{
 const {w,button,settle}=await fixture(t);let finish;
 w.api=async()=>({linked:true,state:'active'});w.post=()=>new Promise(r=>{finish=r});w.render('account-A');await settle();button('Disconnect LazyingArt').click();await settle();
 w.render('account-B');await settle();finish({signedOut:true});await settle();assert.equal(w.signouts,0);assert.ok(button('Disconnect LazyingArt'));
});

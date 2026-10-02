import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';
const catalog={enabled:true,newPurchaseEnabled:true,providers:{stripe:true},canSubscribe:true,trialEligible:false,plan:null,subscriptions:[],quota:null,plans:[{id:'reader',name:'Reader',targetUSD:'2.99',credits:200,pages:200,fetches:60,agentTurns:40}]};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
async function fixture(t){
 const errors=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://onlyideas.invalid',runScripts:'outside-only',virtualConsole:console});t.after(()=>dom.window.close());
 const result=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {Subscriptions} from './src/Subscriptions';const root=createRoot(document.getElementById('root'));window.render=key=>flushSync(()=>root.render(key===null?null:<Subscriptions key={key}/>));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic',plugins:[{name:'billing-fixtures',setup(b){b.onResolve({filter:/^\.\/(api|native|i18n)$/},args=>args.importer.endsWith('Subscriptions.tsx')?{path:args.path,namespace:'fixture'}:null);b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='./api'?'export const api=(...a)=>window.api(...a);export const post=(...a)=>window.post(...a);':args.path==='./native'?'export const native=false;':'export const t=k=>k;',loader:'js'}))}}]});
 dom.window.eval(result.outputFiles[0].text);const w=dom.window;w.api=async()=>catalog;w.post=async()=>catalog;
 const settle=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setTimeout(r,5))};
 const click=text=>{const button=[...w.document.querySelectorAll('button')].find(b=>b.textContent===text);assert.ok(button,text);button.click()};
 return {w,errors,settle,click};
}
test('late checkout after an account remount cannot navigate the next account to the old payment session',async t=>{
 const {w,errors,settle,click}=await fixture(t),pending=deferred();w.post=()=>pending.promise;
 w.render('account-A');await settle();click('Subscribe');await settle();
 w.api=async()=>({...catalog,enabled:false,newPurchaseEnabled:false});w.render('account-B');await settle();
 pending.resolve({url:'https://checkout.stripe.com/c/pay/account-A'});await settle();
 assert.deepEqual(errors,[]);assert.equal(w.location.href,'https://onlyideas.invalid/');assert.ok([...w.document.querySelectorAll('button')].find(b=>b.textContent==='Coming soon').disabled);
});
test('late restore cannot install the previous account catalog; absent purchase capability is unavailable but Restore remains',async t=>{
 const {w,settle,click}=await fixture(t),pending=deferred();w.post=()=>pending.promise;
 w.render('account-A');await settle();click('Restore purchases');await settle();
 w.api=async()=>({...catalog,newPurchaseEnabled:undefined,plans:[{...catalog.plans[0],name:'Account B plan'}]});w.render('account-B');await settle();
 pending.resolve({...catalog,plans:[{...catalog.plans[0],name:'Account A plan'}]});await settle();
 assert.match(w.document.body.textContent,/Account B plan/);assert.doesNotMatch(w.document.body.textContent,/Account A plan/);
 const buttons=[...w.document.querySelectorAll('button')];assert.equal(buttons.find(b=>b.textContent==='Subscribe').disabled,true);assert.equal(buttons.find(b=>b.textContent==='Restore purchases').disabled,false);
});

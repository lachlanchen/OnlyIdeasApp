import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';
const ready=balance=>({state:'ready',balance,pending:'0',asOf:1900000000,revision:'1'});
async function fixture(t){
 const dom=new JSDOM('<div id="root"></div>',{url:'https://fixture.invalid',runScripts:'outside-only',virtualConsole:new VirtualConsole()});t.after(()=>dom.window.close());
 const result=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {SharedPoints} from './src/SharedPoints';const root=createRoot(document.getElementById('root'));window.render=key=>flushSync(()=>root.render(<SharedPoints key={key} text={k=>k} load={()=>window.load()}/>));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic'});
 dom.window.eval(result.outputFiles[0].text);return{w:dom.window,settle:async()=>{for(let i=0;i<6;i++)await new Promise(r=>setTimeout(r,5))}};
}
test('shared LAC preserves integer precision, distinguishes zero from outage and resumes',async t=>{
 const{w,settle}=await fixture(t);w.load=async()=>ready('9223372036854775807');w.render('a');await settle();assert.equal(w.document.querySelector('strong').textContent,'9223372036854775807');
 w.load=async()=>{throw Error('offline')};w.dispatchEvent(new w.Event('onlyideas:resume'));await settle();assert.match(w.document.body.textContent,/temporarily unavailable/);assert.equal(w.document.querySelector('strong'),null);
 w.load=async()=>ready('0');w.dispatchEvent(new w.Event('online'));await settle();assert.equal(w.document.querySelector('strong').textContent,'0');
});
test('account switch and link withdrawal discard stale shared balances',async t=>{
 const{w,settle}=await fixture(t);let finish;w.load=()=>new Promise(r=>finish=r);w.render('a');await settle();w.load=async()=>ready('7');w.render('b');await settle();finish(ready('900'));await settle();assert.equal(w.document.querySelector('strong').textContent,'7');
 w.load=async()=>({state:'link-required'});w.dispatchEvent(new w.Event('lazyingart:connection-changed'));await settle();assert.equal(w.document.querySelector('strong'),null);assert.match(w.document.body.textContent,/Connect your LazyingArt account/);
});
test('profile linking alone never displays points without separate consent',async t=>{
 const{w,settle}=await fixture(t);w.load=async()=>({state:'consent-required'});w.render('a');await settle();assert.equal(w.document.querySelector('strong'),null);assert.match(w.document.body.textContent,/requires separate consent/);assert.equal(w.document.querySelectorAll('button').length,1);
});

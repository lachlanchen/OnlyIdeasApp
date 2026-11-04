import{test}from'node:test';import assert from'node:assert/strict';import{build}from'esbuild';import{JSDOM,VirtualConsole}from'jsdom';
const view=text=>({paperId:'one',revision:'v1',language:'zh-Hans',sourceLanguage:'en',mmd:text,translated:1,total:1,complete:true,blocks:[]});
async function fixture(t){
 const dom=new JSDOM('<div id="root"></div>',{url:'https://onlyideas.invalid',runScripts:'outside-only',virtualConsole:new VirtualConsole()});t.after(()=>dom.window.close());
 const bundle=await build({stdin:{contents:`import React from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{usePaperReading}from'./src/usePaperReading';function App({account}){const state=usePaperReading({id:'one',revision:'v1',language:'en'},account,0);window.reading=state;return <p>{state.reading?.mmd||'Original'}</p>}const root=createRoot(document.getElementById('root'));window.render=(account='reader')=>flushSync(()=>root.render(<App key={account} account={account}/>));`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,format:'iife',jsx:'automatic',plugins:[{name:'reading-fixture',setup(b){b.onResolve({filter:/^\.\/(api|offline)$/},a=>a.importer.endsWith('usePaperReading.ts')?{path:a.path,namespace:'fixture'}:null);b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='./api'?'export const api=(...a)=>window.api(...a);':'export const downloadedPaper=(...a)=>window.downloadedPaper(...a);export const cacheReading=async(...a)=>window.cacheReading(...a);',loader:'js'}))}}]});
 dom.window.cacheReading=()=>{};dom.window.eval(bundle.outputFiles[0].text);const settle=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setTimeout(r,5))};return{w:dom.window,settle};
}
test('late offline cache cannot overwrite a fresh translation, and reopening the same language keeps it visible',async t=>{
 const{w,settle}=await fixture(t);let cache,network,requests=0;
 w.downloadedPaper=()=>new Promise(resolve=>{cache=resolve});w.api=()=>{requests++;return requests===1?Promise.resolve(view('Fresh translation')):new Promise(resolve=>{network=resolve})};
 w.render();await settle();const first=w.reading.reading;assert.equal(w.document.body.textContent,'Fresh translation');
 cache({paper:{revision:'v1'},readings:{'zh-Hans':view('Old cache')}});await settle();assert.equal(w.document.body.textContent,'Fresh translation');
 await w.reading.fetchLanguage('zh-Hans');await settle();assert.equal(requests,2);assert.equal(w.document.body.textContent,'Fresh translation');
 network(view('Fresh translation'));await settle();assert.equal(w.reading.reading,first,'unchanged data retains the rendered document identity');
});
test('account switching rejects late old responses; a network failure retains the new account cache',async t=>{
 const{w,settle}=await fixture(t);let old;
 w.downloadedPaper=async(_id,account)=>account==='second'?{paper:{revision:'v1'},readings:{'zh-Hans':view('Current cached reading')}}:null;
 w.api=()=>new Promise(resolve=>{old=resolve});w.render('first');await settle();
 w.api=async()=>{throw Error('Offline')};w.render('second');await settle();old(view('Old account reading'));await settle();
 assert.equal(w.document.body.textContent,'Current cached reading');
});

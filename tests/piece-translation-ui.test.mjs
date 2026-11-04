import{test}from'node:test';import assert from'node:assert/strict';import{build}from'esbuild';import{JSDOM,VirtualConsole}from'jsdom';
async function fixture(t){
 const dom=new JSDOM('<div id="root"></div>',{url:'https://onlyideas.invalid',runScripts:'outside-only',virtualConsole:new VirtualConsole()});t.after(()=>dom.window.close());
 const bundle=await build({stdin:{contents:`import React from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{PieceTranslation}from'./src/PieceTranslation';const root=createRoot(document.getElementById('root'));window.render=(id='one')=>flushSync(()=>root.render(<PieceTranslation paper={{id,revision:'v1'}} language='zh-Hans' quote='' needLogin={()=>false} notify={()=>{}} onLanguageChange={()=>{}} onOpen={language=>window.opened=language}/>));`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,format:'iife',jsx:'automatic',plugins:[{name:'piece-fixture',setup(b){b.onResolve({filter:/^\.\/(api|i18n)$/},a=>a.importer.endsWith('PieceTranslation.tsx')?{path:a.path,namespace:'fixture'}:null);b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='./api'?'export const api=(...a)=>window.api(...a);':"export const t=k=>k;export const languageNames={'zh-Hans':'Chinese'};",loader:'js'}))}}]});
 dom.window.eval(bundle.outputFiles[0].text);const settle=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setTimeout(r,5))};return{w:dom.window,settle};
}
const segments={segments:[{id:'p1',text:'Optical imaging.',sentences:[{id:'s1',text:'Optical imaging.'}]}]};
test('failed translation is visible and retry rejoins work instead of remaining in an endless refresh state',async t=>{
 const{w,settle}=await fixture(t);let submissions=0,ready=false;
 w.api=async(path,options={})=>{
  if(path.endsWith('/segments'))return segments;
  if(path.endsWith('/artifacts'))return{artifacts:ready?[{id:'a',kind:'translation',language:'zh-Hans',segmentId:'p1',text:'光学成像。'}]:[]};
  if(path.endsWith('/assist')){submissions++;ready=submissions>1;return{job:{id:'job',state:'queued',message:'Waiting to start'}}}
  if(path==='/jobs/job')return{job:{id:'job',state:ready?'completed':'failed',message:ready?'Ready':'Translation service interrupted'}};
  throw Error(path+JSON.stringify(options));
 };w.render();await settle();[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Translate this passage').click();await settle();
 assert.match(w.document.querySelector('[role=alert]').textContent,/Translation service interrupted/);
 const retry=[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Try again');assert.equal(retry.disabled,false);retry.click();retry.click();await settle();
 assert.equal(submissions,2,'the pending latch prevents duplicate submissions');
 const open=[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Open in reader');assert.ok(open);open.click();assert.equal(w.opened,'zh-Hans');
});
test('late artifact responses cannot replace another paper and missing initial data can be retried',async t=>{
 const{w,settle}=await fixture(t);let late,fail=true;
 w.api=async path=>{
  if(path==='/papers/one/segments')return new Promise(resolve=>{late=resolve});
  if(path.endsWith('/segments')){if(fail)throw Error('Offline');return segments}
  return{artifacts:[]};
 };w.render('one');await settle();w.render('two');await settle();assert.match(w.document.body.textContent,/Offline/);
 late({segments:[{id:'old',text:'Wrong private text',sentences:[]}]});await settle();assert.doesNotMatch(w.document.body.textContent,/Wrong private text/);
 fail=false;[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Try again').click();await settle();assert.match(w.document.body.textContent,/Optical imaging/);
});

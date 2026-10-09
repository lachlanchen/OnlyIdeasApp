import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';

async function fixture(t){
  const errors=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://onlyideas.invalid/admin',runScripts:'outside-only',virtualConsole:console});t.after(()=>dom.window.close());
  const bundle=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{PublicationReview}from'./src/PublicationReview';import{approvalNeeds}from'./src/publication-approval';const root=createRoot(document.getElementById('root'));window.render=()=>flushSync(()=>root.render(<PublicationReview session={{user:{id:'admin'},capabilities:{publicationReview:true}}} login={()=>{}} back={()=>{}}/>));window.approvalNeeds=approvalNeeds;`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,format:'iife',jsx:'automatic',plugins:[{name:'review-fixtures',setup(b){b.onResolve({filter:/\.css$/},()=>({path:'style',namespace:'fixture'}));b.onResolve({filter:/^\.\/(api|i18n|ReaderContent)$/},a=>a.importer.endsWith('PublicationReview.tsx')?{path:a.path,namespace:'fixture'}:null);b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='./api'?'export const api=(...a)=>window.api(...a);export const post=(...a)=>window.post(...a);':a.path==='./i18n'?"export const t=(k,v={})=>Object.entries(v).reduce((s,[a,b])=>s.replaceAll('{'+a+'}',b),k);":a.path==='./ReaderContent'?'export const ReaderContent=()=>null;':'',loader:'js'}))}}]});
  const w=dom.window;w.HTMLElement.prototype.scrollIntoView=function(){w.scrolled=this.id};
  const entry={id:'one',token:'old-token',state:'awaiting_review',created:Date.now(),message:'Needs review',paper:{id:'paper-one',title:'Fixture paper',authors:'QA',source:'https://example.org/paper',license:'CC-BY-4.0',assets:[]}};
  const calls=[];let published=false;
  w.api=async path=>path.startsWith('/admin/publications?')?{items:published?[]:[entry],counts:{awaiting_review:published?0:1},total:published?0:1,offset:0}:{...entry,token:'fresh-token',history:[]};
  w.post=async(path,body)=>{calls.push({path,body});published=true;return {items:[]}};
  w.eval(bundle.outputFiles[0].text);
  const settle=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setTimeout(r,5))};
  const click=selector=>{const el=w.document.querySelector(selector);assert.ok(el,selector);el.click()};
  const note=value=>{const el=w.document.querySelector('textarea');Object.getOwnPropertyDescriptor(w.HTMLTextAreaElement.prototype,'value').set.call(el,value);el.dispatchEvent(new w.Event('input',{bubbles:true}))};
  return {w,entry,errors,calls,settle,click,note};
}

test('selected approval guides missing fields; fresh preview token can complete a real confirmation',async t=>{
  const {w,errors,calls,settle,click,note}=await fixture(t);w.render();await settle();
  assert.equal(w.document.querySelector('[data-testid=approve-selected]').disabled,true);
  click('.review-row input');await settle();
  assert.equal(w.document.querySelector('[data-testid=approve-selected]').disabled,false);
  assert.equal(w.scrolled,'review-checks');assert.match(w.document.querySelector('[data-testid=review-readiness]').textContent,/at least 10 characters/);
  click('[data-testid=approve-selected]');await settle();assert.equal(w.document.querySelector('[role=dialog]'),null);assert.equal(calls.length,0);
  note('Short');click('.review-check input');click('.review-check:nth-last-of-type(1) input');await settle();
  assert.match(w.document.querySelector('[data-testid=review-readiness]').textContent,/at least 10 characters/);
  note('Verified the source license, text and figures.');await settle();
  assert.match(w.document.querySelector('[data-testid=review-readiness]').textContent,/Ready for approval/);
  assert.match(w.document.querySelector('.review-batch strong').textContent,/1 of 1 ready/);
  click('[data-testid=approve-selected]');await settle();assert.ok(w.document.querySelector('[role=dialog]'));
  click('[role=dialog] .primary');await settle();assert.equal(calls.length,1);assert.equal(calls[0].body.items[0].token,'fresh-token');assert.equal(calls[0].body.action,'approve');assert.deepEqual(errors,[]);
});

test('readiness lists unsupported licenses and URLs before sending any approval',async t=>{
  const {w,entry}=await fixture(t);const ready={license:'CC-BY-4.0',evidenceUrl:'https://example.org/license',note:'Verified text and all figures.',rightsChecked:true,contentChecked:true,token:entry.token};
  assert.equal(w.approvalNeeds(entry,ready).length,0);
  assert.match(w.approvalNeeds(entry,{...ready,license:'private'}).join(' '),/verified license/);
  for(const evidenceUrl of ['https://','http://example.org/license','https://u:secret@example.org','https://example.org/#private'])assert.match(w.approvalNeeds(entry,{...ready,evidenceUrl}).join(' '),/valid HTTPS/);
  assert.match(w.approvalNeeds(entry,{...ready,token:'stale'}).join(' '),/changed/);
  assert.match(w.approvalNeeds(entry).join(' '),/Open this paper/);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';

test('the actual Profile keeps one account, balance and plan section across resume and account switches',async t=>{
 const errors=[],log=new VirtualConsole();log.on('error',(...args)=>errors.push(args.join(' ')));log.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://onlyideas.invalid',runScripts:'outside-only',virtualConsole:log});t.after(()=>dom.window.close());
 const w=dom.window;w.fetch=async()=>({ok:false});w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.IntersectionObserver=class{observe(){}disconnect(){}};
 let owner='reader-A',balance=30,connection='active';
 w.api=async path=>{
  if(path==='/session')return{user:{id:owner,name:'Fixture reader',login:'fixture'},capabilities:{lazyingart:true},languages:{en:'English'}};
  if(path==='/auth/lazyingart/status')return{linked:connection==='active',state:connection};
  if(path==='/credits')return{enabled:false,earningEnabled:true,balance,held:0,policy:{publication:10,rewardPerDay:50},history:[]};
  if(path==='/billing')return{enabled:false,providers:{stripe:false},plans:[],subscriptions:[],quota:null};
  if(path==='/inbox')return{unread:0};
  if(path==='/jobs')return{jobs:[]};
  if(path==='/blocks')return{blocks:[]};
  return{papers:[],results:[],items:[],taxonomy:{}};
 };
 const native=`export const native=false,serviceOrigin='';export const authRevision=async()=>0;export const hasToken=async()=>false;${['saveToken','request','completeSignIn','cancelSignIn','cancelSharedSignIn','signIn','sharedSignIn','openExternal','clearExportCache','exportMarkdown','initNative'].map(n=>`export const ${n}=async()=>{};`).join('')}`;
 const offline=`export const offlineSession=async()=>null;export const downloadedPapers=async()=>[];export const cachedLibrary=async()=>[];${['rememberSession','downloadedPaper','downloadPaper','cacheReading','removeDownload','clearPrivateDownloads','rememberLibrary','reconcileCache','unpinPaper'].map(n=>`export const ${n}=async()=>{};`).join('')}`;
 const result=await build({entryPoints:['src/main.tsx'],bundle:true,write:false,format:'iife',jsx:'automatic',define:{__APP_VERSION__:'"1.0.10"',__APP_REVISION__:JSON.stringify('a'.repeat(64))},plugins:[{name:'profile-fixture',setup(b){
  b.onResolve({filter:/^\.\/(api|native|offline)$/},a=>({path:a.path,namespace:'fixture'}));
  b.onResolve({filter:/\.css$|\?url$/},a=>({path:a.path,namespace:'empty'}));
  b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'export default "";',loader:'js'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='./native'?native:a.path==='./offline'?offline:'export const api=(...a)=>window.api(...a);export const post=(...a)=>window.api(...a);export class APIError extends Error{}',loader:'js'}));
 }}]});
 w.eval(result.outputFiles[0].text);
 const settle=async()=>{for(let i=0;i<10;i++)await new Promise(r=>setTimeout(r,5))};await settle();
 const profile=w.document.querySelector('[aria-label="Open profile"]');assert.ok(profile,JSON.stringify(errors));profile.click();await settle();
 const check=()=>{for(const selector of ['.credit-panel','.shared-account','.subscription-panel'])assert.equal(w.document.querySelectorAll(selector).length,1,selector)};
 check();assert.equal(w.document.querySelector('.credit-balance strong').textContent,'30');
 for(const state of ['refreshing','reauthorize','active','active']){connection=state;w.dispatchEvent(new w.Event('onlyideas:resume'));await settle();check()}
 owner='reader-B';balance=7;w.dispatchEvent(new w.Event('onlyideas:resume'));await settle();check();
 assert.equal(w.document.querySelector('.credit-balance strong').textContent,'7');assert.deepEqual(errors,[]);
});

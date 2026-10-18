import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {linkFailure} from '../server/account-link-errors.mjs';

test('connection UI refuses collisions, offers same-account reauth and retains a draft',async t=>{
 const dom=new JSDOM('<div id="root"></div><textarea id="draft">Keep this research idea</textarea>',{url:'https://onlyideas.invalid',runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window;
 let code='account_already_linked',attempts=[],cancelled=0;
 w.api=async()=>({linked:false,state:'unlinked',reauthentication:'github'});
 w.connect=async mode=>{attempts.push(mode);throw Object.assign(Error(linkFailure(code).message),{code})};w.cancel=()=>cancelled++;
 const result=await build({stdin:{contents:'import React from "react";import{createRoot}from"react-dom/client";import{SharedAccount}from"./src/SharedAccount";createRoot(document.getElementById("root")).render(<SharedAccount notify={()=>{throw Error("Unexpected toast")}} signedOut={async()=>{throw Error("Unexpected logout")}}/>);',resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic',plugins:[{name:'fixture',setup(b){b.onResolve({filter:/^\.\/(native|api)$/},a=>({path:a.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'js',contents:a.path==='./api'?'export const api=(...a)=>window.api(...a);export const post=()=>{throw Error("Unexpected mutation")};':'export const sharedSignIn=(...a)=>window.connect(...a);export const cancelSharedSignIn=()=>window.cancel();'}))}}]});w.eval(result.outputFiles[0].text);
 const settle=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setTimeout(r,5))};const click=label=>{const button=[...w.document.querySelectorAll('button')].find(b=>b.textContent===label);assert.ok(button,label);button.click()};await settle();
 click('Connect LazyingArt');await settle();assert.match(w.document.body.textContent,/Linking was refused/);assert.equal(w.document.getElementById('draft').value,'Keep this research idea');
 code='local_reauthentication_required';click('Choose another LazyingArt account');await settle();assert.match(w.document.body.textContent,/same app account/);click('Continue with GitHub');await settle();assert.deepEqual(attempts,['link','link','reauthenticate']);
 assert.equal(w.document.getElementById('draft').value,'Keep this research idea');assert.ok(![...w.document.querySelectorAll('button')].some(b=>/merge|manage account/i.test(b.textContent)));assert.equal(cancelled,0);
});

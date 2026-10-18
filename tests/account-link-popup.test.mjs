import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';

async function fixture(t){
 const dom=new JSDOM('<textarea>Keep my draft</textarea>',{url:'https://onlyideas.invalid/agent',runScripts:'outside-only'});t.after(()=>dom.window.close());
 const w=dom.window;Object.defineProperty(w,'crypto',{value:webcrypto});Object.assign(w,{Headers,Response,AbortController,AbortSignal,TextEncoder});
 const popup={location:{href:'about:blank'},opener:w,close(){this.closed=true},closed:false};w.open=()=>popup;
 const result=await build({stdin:{contents:'import {sharedSignIn,cancelSharedSignIn} from "./src/native";window.start=sharedSignIn;window.cancel=cancelSharedSignIn;',resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'iife',plugins:[{name:'platform-fixture',setup(b){b.onResolve({filter:/^@(capacitor|aparajita)\//},a=>({path:a.path,namespace:'platform'}));b.onLoad({filter:/.*/,namespace:'platform'},()=>({loader:'js',contents:'export const Capacitor={isNativePlatform:()=>false},App={},Browser={},SecureStorage={},KeychainAccess={},Filesystem={},Directory={},Encoding={},Share={};'}))}}]});w.eval(result.outputFiles[0].text);
 return {w,popup};
}
for(const mode of ['link','reauthenticate'])test(`PWA ${mode} uses bound popup completion without replacing the reader`,async t=>{
 const {w,popup}=await fixture(t),calls=[];let changed=0;w.addEventListener('lazyingart:connection-changed',()=>changed++);
 w.fetch=async(path,options)=>{calls.push({path,body:JSON.parse(options.body),options});return new Response(JSON.stringify(path.endsWith('/start')?{flow:'f'.repeat(43),url:'https://onlyideas.invalid/api/auth/'+(mode==='link'?'lazyingart?ticket=fixture':'github?flow=fixture')}:{linked:true}),{status:200})};
 await w.start(mode);
 assert.deepEqual(calls.map(c=>c.path),[mode==='link'?'/api/auth/lazyingart/start':'/api/auth/reauth/start','/api/auth/lazyingart/complete']);
 assert.match(calls[0].body.challenge,/^[\w-]{43}$/);assert.match(calls[1].body.verifier,/^[\w-]{43}$/);assert.equal(calls[0].options.credentials,'same-origin');
 assert.equal(w.location.pathname,'/agent');assert.equal(w.document.querySelector('textarea').value,'Keep my draft');assert.equal(popup.closed,true);assert.equal(popup.opener,null);assert.equal(changed,1);
});
test('PWA collision is actionable and cancels only its own proof-bound attempt',async t=>{
 const {w,popup}=await fixture(t),calls=[];
 w.fetch=async(path,options)=>{calls.push({path,body:JSON.parse(options.body)});return new Response(JSON.stringify(path.endsWith('/start')?{flow:'f'.repeat(43),url:'https://onlyideas.invalid/api/auth/lazyingart?ticket=fixture'}:path.endsWith('/complete')?{error:'Linking was refused.',code:'account_already_linked',action:'choose_account'}:{cancelled:true}),{status:path.endsWith('/complete')?409:200})};
 await assert.rejects(w.start('link'),{code:'account_already_linked',action:'choose_account'});await new Promise(r=>setImmediate(r));
 assert.equal(calls.at(-1).path,'/api/auth/lazyingart/cancel');assert.equal(calls[1].body.verifier,calls.at(-1).body.verifier);assert.equal(popup.closed,true);assert.equal(w.location.pathname,'/agent');assert.equal(w.document.querySelector('textarea').value,'Keep my draft');
});

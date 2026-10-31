import {build} from 'esbuild';
import {createServer} from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {Store} from '../server/store.mjs';
import {createPreferenceGate} from '../server/research-preference-gate.mjs';
import {readPreferences} from '../server/reading-preferences.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.JOURNAL_UI_OUTPUT||'.runtime/journals-20261031/ui';await mkdir(out,{recursive:true});
const dir=mkdtempSync(join(tmpdir(),'oi-journal-ui-')),store=new Store(dir),user={id:'synthetic-journal-reader'};
store.db.exec('CREATE TABLE IF NOT EXISTS reading_preferences(owner TEXT PRIMARY KEY,body TEXT NOT NULL)');
const gate=createPreferenceGate(store,{download:async()=>Buffer.from(JSON.stringify({results:[{id:'https://openalex.org/S4210199334',display_name:'Advanced Photonics',type:'journal',issn:['2577-5421']}]}))});
const source=`import React from 'react';import {createRoot} from 'react-dom/client';import {ResearchPreferences} from './src/ResearchPreferences';window.mount=()=>{window.journalReactRoot ||= createRoot(document.getElementById('root'));window.journalReactRoot.render(<ResearchPreferences close={()=>window.journalReactRoot.render(null)} />)};window.mount();`;
const bundle=await build({stdin:{contents:source,loader:'tsx',resolveDir:process.cwd()},bundle:true,format:'iife',write:false,jsx:'automatic',plugins:[{name:'fixture-api',setup(b){b.onResolve({filter:/^\.\/api$/},a=>a.importer.endsWith('/ResearchPreferences.tsx')?{path:a.path,namespace:'fixture'}:null);b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export const api=async(path,options={})=>{const r=await fetch('/api'+path,{...options,headers:{'Content-Type':'application/json'}});const d=await r.json();if(!r.ok)throw Error(d.message);return d}`,loader:'js'}))}}]});
const css=await readFile('src/style.css','utf8')+'\n'+await readFile('src/research-preferences.css','utf8');
const server=createServer(async(req,res)=>{try{
 if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');return res.end(bundle.outputFiles[0].text)}
 if(req.url.startsWith('/api/')){
  let data={};if(req.method!=='GET'){let text='';for await(const chunk of req)text+=chunk;data=JSON.parse(text)}
  const result=req.url==='/api/preferences/options'?gate.options(user):req.url==='/api/preferences/resolve'?{journals:await gate.resolve(data.query)}:{preferences:req.method==='PUT'?await gate.apply(user,data):readPreferences(store,user)};
  res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(result));
 }
 res.setHeader('Content-Type','text/html');res.end(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script>localStorage.setItem('onlyideas-language',new URLSearchParams(location.search).get('lang')||'en')</script><script src="/fixture.js"></script>`);
}catch(e){res.writeHead(e.status||400,{'Content-Type':'application/json'});res.end(JSON.stringify({message:e.message}))}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser,page;const checks=[],errors=[];
try{
 browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true});page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const [width,lang,dark]of [[320,'en',false],[390,'zh-Hans',true],[1024,'en',false]]){
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:'+server.address().port+'/?lang='+lang);await page.locator('.journal-choice').first().waitFor();
  await page.evaluate(dark=>{document.documentElement.dataset.theme=dark?'dark':'light'},dark);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('.journal-lookup summary').click();await page.locator('.journal-lookup input').fill('Advanced Photonics');await page.locator('.journal-lookup > button').click();await page.locator('.journal-result').click();
  const selected=page.locator('.journal-choice button').filter({hasText:'Advanced Photonics'});assert.equal(await selected.count(),1);assert.equal(await selected.getAttribute('aria-pressed'),'true');
  assert.equal(readPreferences(store,user).customJournals,undefined);
  await page.locator('.journal-lookup input').fill('Advanced Photonics');await page.locator('.journal-lookup > button').click();await page.locator('.journal-result').click();assert.equal(await selected.count(),1);
  assert.match(await page.locator('.journal-choice a').first().textContent(),/JIF.*2025/);
  await page.locator('.research-preferences-body').evaluate(el=>el.scrollTop=0);
  await page.screenshot({path:out+'/'+width+'-'+lang+'.png'});
  await page.locator('.research-preferences footer button').first().click();assert.equal(readPreferences(store,user).customJournals,undefined);
  checks.push(width+'px/'+lang+': canonical selection deduplicates, metric is dated, Cancel preserves saved choices, no page overflow');
 }
 await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.locator('.journal-lookup summary').click();await page.locator('.journal-lookup input').fill('Advanced Photonics');await page.locator('.journal-lookup > button').click();await page.locator('.journal-result').click();await page.locator('.research-preferences footer button').last().click();
 await page.waitForFunction(()=>!document.querySelector('.research-preferences'));assert.equal(readPreferences(store,user).customJournals.length,1);checks.push('Save persists one canonical journal through the real preference gate');assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,syntheticAccount:true,provider:'synthetic canonical journal metadata; separate real resolver checks recorded',checks},null,2));console.log(checks.join('\n'));
}catch(e){if(page){await page.screenshot({path:out+'/failure.png'});await writeFile(out+'/failure.json',JSON.stringify({errors,body:await page.locator('body').innerText(),message:e.message},null,2))}throw e}finally{await browser?.close();await new Promise(r=>server.close(r));store.close();rmSync(dir,{recursive:true,force:true})}

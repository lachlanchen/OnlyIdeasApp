import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {Store} from '../server/store.mjs';import {makePaper} from '../server/domain.mjs';import {createApp} from '../server/app.mjs';import {saveAnnotation,annotations} from '../server/annotations.mjs';import {defaultJournalIDs,recommendationSelection} from '../server/recommendation-options.mjs';
const entry=revision=>({id:randomUUID(),operation:randomUUID(),version:0,revision,language:'en',quote:'Optical imaging',prefix:'',suffix:' measures',start:0,note:'Compare this result',color:'yellow'});
test('private highlights survive restart, isolate owners, reject stale edits and deduplicate uncertain retries',()=>{
 const dir=mkdtempSync(join(tmpdir(),'oi-annotations-'));let store=new Store(dir);
 try{const p=makePaper({id:'paper',owner:'a',mmd:'Optical imaging measures tissue.',title:'Imaging'});store.savePaper(p);const input=entry(p.revision),first=saveAnnotation(store,'a',p,input);assert.equal(first.version,1);assert.deepEqual(saveAnnotation(store,'a',p,input),first);assert.equal(annotations(store,'b',p.id).length,0);
  assert.throws(()=>saveAnnotation(store,'a',p,{...input,operation:randomUUID(),note:'Stale'}),/another device/);
  store.close();store=new Store(dir);assert.equal(annotations(store,'a',p.id)[0].note,input.note);
  const edit=saveAnnotation(store,'a',p,{...first,operation:randomUUID(),note:'Updated',quote:'Tampered anchor',color:'blue'});assert.equal(edit.quote,input.quote);assert.equal(edit.version,2);
  const removed=saveAnnotation(store,'a',p,{...edit,operation:randomUUID(),deleted:true});assert.equal(annotations(store,'a',p.id).length,0);assert.deepEqual(saveAnnotation(store,'a',p,{...edit,operation:removed.operation,deleted:true}),removed);
  assert.throws(()=>saveAnnotation(store,'a',p,{...entry('old'),revision:'old'}),/paper changed/);
  for(const bad of [{quote:''},{color:'script'},{note:'x'.repeat(5001)},{start:-1},{prefix:'x'.repeat(65)}])assert.throws(()=>saveAnnotation(store,'a',p,{...entry(p.revision),...bad}));
 }finally{store.close();rmSync(dir,{recursive:true,force:true})}
});
test('annotation API enforces paper access/auth and private notes have optimistic concurrency',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'oi-notes-api-')),store=new Store(dir),origin='http://127.0.0.1:4182',app=createApp(store,{origin},{worker:false});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const a=store.createSession({id:'a'}),b=store.createSession({id:'b'}),p=store.savePaper(makePaper({id:'paper',owner:'a',title:'Paper',mmd:'Optical imaging measures tissue.'}));
 const call=async(resource,token=a,body)=>{const r=await fetch(`http://127.0.0.1:${app.address().port}/api/papers/paper/${resource}`,{method:body?'PUT':'GET',headers:{Origin:origin,'Content-Type':'application/json',Cookie:`onlyideas-local=${token}`},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,body:await r.json(),cache:r.headers.get('cache-control')}};
 try{assert.equal((await call('annotations','')).status,404);assert.equal((await call('annotations',b)).status,404);assert.equal((await call('annotations',a,entry(p.revision))).status,200);
  p.visibility='public';store.savePaper(p);assert.equal((await call('annotations','')).status,401);assert.deepEqual((await call('annotations',b)).body.annotations,[]);assert.match((await call('annotations')).cache,/no-store/);
  const switched=await fetch(`http://127.0.0.1:${app.address().port}/api/papers/paper/notes`,{method:'PUT',headers:{Origin:origin,Cookie:`onlyideas-local=${b}`,'Content-Type':'application/json','X-OnlyIdeas-Account':'a'},body:JSON.stringify({text:'Old account draft'})});assert.equal(switched.status,409);
  const preflight=await fetch(`http://127.0.0.1:${app.address().port}/api/papers/paper/annotations`,{method:'OPTIONS',headers:{Origin:'https://localhost','Access-Control-Request-Method':'PUT','Access-Control-Request-Headers':'x-onlyideas-account,authorization,content-type'}});assert.match(preflight.headers.get('access-control-allow-headers'),/X-OnlyIdeas-Account/);
  const note=await call('notes');const saved=await call('notes',a,{text:'Private thought',version:note.body.version});assert.equal(saved.status,200);assert.equal((await call('notes',a,{text:'Stale text',version:note.body.version})).status,409);assert.equal((await call('notes',a,{text:'Private thought',version:note.body.version})).status,200);assert.equal((await call('notes',b)).body.text,'');
 }finally{await new Promise(r=>app.close(r));store.close();rmSync(dir,{recursive:true,force:true})}
});
test('Nature Science Cell are defaults without rewriting chosen journals',()=>{assert.deepEqual(defaultJournalIDs,['S137773608','S3880285','S110447773']);assert.deepEqual(recommendationSelection({journals:['S4210197940']}).journals,['S4210197940']);assert.equal(recommendationSelection({journalScope:'all'}).journalScope,'all')});

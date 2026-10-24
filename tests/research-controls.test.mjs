import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../server/store.mjs';
import {createApp} from '../server/app.mjs';
import {readPreferences,savePreferences} from '../server/reading-preferences.mjs';
import {localPreferenceCommand,preferenceIntent} from '../server/preference-commands.mjs';
import {queryRecommendations} from '../server/recommendations.mjs';
import {createDiscovery} from '../server/discovery.mjs';
import {respond} from '../worker/paper-agent.mjs';

async function fixture(t){const dir=mkdtempSync(join(tmpdir(),'oi-controls-')),store=new Store(dir),config={origin:'http://127.0.0.1:4182',agentWorkerToken:'fixture'};
 const app=createApp(store,config,{worker:false});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>app.close(r));store.close();rmSync(dir,{recursive:true,force:true})});
 const tokens={alice:store.createSession({id:'alice'}),bob:store.createSession({id:'bob'})};
 const call=async(path,body,owner='alice',method=body?'POST':'GET')=>{const r=await fetch(`http://127.0.0.1:${app.address().port}/api${path}`,{method,headers:{Origin:config.origin,'Content-Type':'application/json',...(owner==='worker'?{Authorization:'Bearer fixture'}:{Cookie:'onlyideas-local='+tokens[owner]})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()}};
 return {store,config,call,chat:async()=> (await call('/chats',{})).chat.id};
}
test('journal/topic edits persist, isolate accounts, preserve notifications and reject stale or invalid whole edits',async t=>{
 const f=await fixture(t),a={id:'alice'},b={id:'bob'};
 const first=readPreferences(f.store,a);
 savePreferences(f.store,a,{dailyTime:'08:30',dailyEnabled:true});
 assert.throws(()=>savePreferences(f.store,a,{revision:first.revision,interests:'climate'}),/changed elsewhere/);
 const next=savePreferences(f.store,a,{topics:['microscopy'],journals:['S127827428','S4210197940'],journalScope:'selected',interests:'organoids'});
 assert.equal(next.dailyTime,'08:30');assert.equal(next.dailyEnabled,true);assert.equal(next.recommendationsVersion,1);
 assert.equal(readPreferences(f.store,b).interests,'');assert.notEqual(next.revision,readPreferences(f.store,b).revision);
 for(const patch of [{topics:['injected']},{journals:[]},{topics:[],interests:''},{journalScope:'bogus'},{dailyTime:'88:99',interests:'erase'}])assert.throws(()=>savePreferences(f.store,a,patch));
 assert.deepEqual(readPreferences(f.store,a),next);
 const response=await f.call('/preferences',{...next,interests:'new microscopy'},'alice','PUT');assert.equal(response.status,200);assert.equal(response.preferences.interests,'new microscopy');
});
test('chat changes named selections without model turns; exact journal names, add/remove/reset/show and normal research stay separate',async t=>{
 const f=await fixture(t),id=await f.chat();f.config.agentWorkerToken='';
 const send=text=>f.call('/chats/'+id+'/messages',{text});
 let r=await send('Follow microscopy and organoids mainly in Nature Methods and Optica');assert.equal(r.status,200);assert.equal(r.queued,false);
 let p=readPreferences(f.store,{id:'alice'});assert.deepEqual(p.topics,['microscopy','organoids']);assert.deepEqual(p.journals,['S127827428','S4210197940']);assert.equal(p.journals.includes('S137773608'),false);
 await send('Add optics to my topics');p=readPreferences(f.store,{id:'alice'});assert.ok(p.topics.includes('microscopy'));assert.ok(p.topics.includes('optics'));
 await send('Unfollow organoids');assert.equal(readPreferences(f.store,{id:'alice'}).topics.includes('organoids'),false);
 const revision=readPreferences(f.store,{id:'alice'}).revision;await send('Show my interests');assert.equal(readPreferences(f.store,{id:'alice'}).revision,revision);
 assert.equal((await f.call('/chats/'+id+'/messages',{text:'Reset my interests'},'bob')).status,404);
 await send('Reset my recommendations');assert.equal(readPreferences(f.store,{id:'alice'}).topics.length,3);
 assert.equal(f.store.db.prepare('SELECT count(*) n FROM chat_tasks').get().n,0);
 for(const text of ['Find papers about organoids in Nature','Explain the paper “Follow imaging”','Do not change my interests','What is a journal?'])assert.equal(preferenceIntent(text),null);
 f.config.agentWorkerToken='fixture';assert.equal((await send('Find microscopy papers')).queued,true);
 assert.equal((await f.call('/worker/claim',{},'worker')).task.preferenceRequest,undefined);
});
test('model tool uses only current preference request; server refuses stale plans, extra capabilities and unrequested action claims',async t=>{
 const f=await fixture(t),id=await f.chat();
 await f.call('/chats/'+id+'/messages',{text:'Change my recommendations to focus on cancer immunotherapy'});
 const {task}=await f.call('/worker/claim',{},'worker');assert.equal(task.preferenceRequest,true);
 let searches=0;const result=await respond(task,{model:{url:'https://example.org/model',name:'fixture'}},async()=>{}, {search:async()=>{searches++;throw Error('Research called')},provider:async(_url,o)=>{
  const body=JSON.parse(o.body);assert.equal(body.messages.at(-1).content,task.text);assert.equal(body.messages.length,2);
  return {choices:[{finish_reason:'stop',message:{content:JSON.stringify({patch:{interests:'cancer immunotherapy',topics:[]}})}}]};
 }});assert.equal(searches,0);
 assert.equal((await f.call('/worker/result',{id:task.id,lease:task.lease,result},'worker')).status,200);
 assert.equal(readPreferences(f.store,{id:'alice'}).interests,'cancer immunotherapy');
 for(const bad of [{interests:'bad',owner:'bob'},{interests:'bad',journals:['Sfake']}]){
  await f.call('/chats/'+id+'/messages',{text:'Change my recommendations to new interests'});const {task:t}=await f.call('/worker/claim',{},'worker');
  const before=readPreferences(f.store,{id:'alice'});await f.call('/worker/result',{id:t.id,lease:t.lease,result:{text:'Done',preferencePatch:bad}},'worker');assert.deepEqual(readPreferences(f.store,{id:'alice'}),before);
 }
 await f.call('/chats/'+id+'/messages',{text:'Change my recommendations to molecular mechanisms of melanoma'});const {task:stale}=await f.call('/worker/claim',{},'worker');savePreferences(f.store,{id:'alice'},{interests:'newer choice'});
 await f.call('/worker/result',{id:stale.id,lease:stale.lease,result:{text:'Done',preferencePatch:{interests:'stale choice'}}},'worker');assert.equal(readPreferences(f.store,{id:'alice'}).interests,'newer choice');
 const chat=await f.call('/chats/'+id);assert.match(chat.messages.at(-1).text,/changed elsewhere/);
});
test('custom selection separates metadata cache keys, reuses equal choices and leaves explicit search unrestricted',async t=>{
 const f=await fixture(t),calls=[],search=[];const d=createDiscovery(f.store,{recommend:async o=>{calls.push(o);return{papers:[],nextPage:null}},search:async o=>{search.push(o);return{papers:[],nextPage:null}}});
 const chosen={topics:['microscopy'],journals:['S4210197940'],journalScope:'selected',interests:''};
 savePreferences(f.store,{id:'alice'},chosen);savePreferences(f.store,{id:'bob'},chosen);
 await d.find({}, {id:'alice'});await d.find({}, {id:'bob'});assert.equal(calls.length,1);assert.deepEqual(calls[0].selection.topics,['microscopy']);
 savePreferences(f.store,{id:'alice'},{journals:['S127827428']});await d.find({}, {id:'alice'});assert.equal(calls.length,2);
 await d.find({q:'history in any journal'}, {id:'alice'});assert.equal(search[0].q,'history in any journal');
});
test('one selected journal can fill a page, exact upstream selections and English quality survive customization',async()=>{
 const urls=[];const result=await queryRecommendations({selection:{topics:['microscopy'],journals:['S4210197940'],journalScope:'selected',interests:''}},async url=>{
  const u=new URL(url);urls.push(u);return Buffer.from(JSON.stringify({meta:{count:20},results:Array.from({length:15},(_,n)=>({id:'https://openalex.org/W'+n,title:'Microscopy of living tissue sample '+n,language:n===14?'id':'en',type:'article',publication_date:'2026-01-10',publication_year:2026,primary_location:{source:{id:'https://openalex.org/S4210197940',display_name:'Optica',type:'journal'}},best_oa_location:{is_oa:true,landing_page_url:'https://example.org/'+n},open_access:{is_oa:true}}))}));
 });assert.equal(result.papers.length,12);assert.equal(urls.length,1);assert.match(urls[0].searchParams.get('filter'),/primary_location.source.id:S4210197940,/);assert.ok(result.papers.every(x=>x.language==='en'));
});

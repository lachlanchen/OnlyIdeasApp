import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../server/store.mjs';
import {createApp} from '../server/app.mjs';
import {createPreferenceGate} from '../server/research-preference-gate.mjs';
import {readPreferences,savePreferences} from '../server/reading-preferences.mjs';
import {cleanInterests} from '../server/preference-cleanup.mjs';
import {dynamicPreferenceCommand} from '../server/preference-commands.mjs';
import {createResearchPreferences} from '../server/research-preferences.mjs';
const journal=(id='S900001',name='Advanced Photonics')=>({id:'https://openalex.org/'+id,display_name:name,type:'journal',issn:['2577-5421'],summary_stats:{'2yr_mean_citedness':999}});
function fixture(t,options={}){const dir=mkdtempSync(join(tmpdir(),'oi-gate-')),store=new Store(dir);store.db.exec('CREATE TABLE IF NOT EXISTS reading_preferences(owner TEXT PRIMARY KEY,body TEXT NOT NULL)');t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true})});return {store,gate:createPreferenceGate(store,options),user:{id:'alice'}}}
const bytes=rows=>Buffer.from(JSON.stringify({results:rows}));

test('one canonical journal is reused across names, IDs, repeated requests and settings',async t=>{
 let calls=0;const {store,gate,user}=fixture(t,{download:async()=>{calls++;return bytes([journal()])}});
 const initial=readPreferences(store,user);
 const p=await gate.apply(user,{journalNames:['Advanced Photonics'],journalOperation:'add'});
 assert.equal(calls,1);assert.equal(p.journals.length,4);assert.equal(p.customJournals.length,1);
 assert.ok(initial.journals.every(id=>p.journals.includes(id)));assert.equal(p.customJournals[0].impactFactor,undefined);
 for(let i=0;i<3;i++)await gate.apply(user,{journalNames:['advanced photonics'],journalOperation:'add'});
 const saved=await gate.apply(user,{journals:['S900001','S900001']});assert.deepEqual(saved.journals,['S900001']);assert.equal(saved.customJournals.length,1);assert.equal(calls,1);
 assert.equal(gate.options(user).journals.filter(j=>j.id==='S900001').length,1);
 assert.equal(gate.options({id:'bob'}).journals.some(j=>j.id==='S900001'),false);
 await gate.apply(user,{journalNames:['Nature'],journalOperation:'replace'});assert.equal(readPreferences(store,user).customJournals,undefined);
 assert.equal(gate.options(user).journals.some(j=>j.id==='S900001'),false);
});
test('unknown IDs require verified journal metadata, not a fabricated model or client descriptor',async t=>{
 const {store,gate,user}=fixture(t,{download:async()=>bytes([{...journal(),type:'repository'},journal('S900002','Different Journal')])});
 const before=readPreferences(store,user);
 await assert.rejects(gate.apply(user,{journals:['S900001'],customJournals:[{id:'S900001',name:'Forged'}]}),/verified journal/);
 assert.deepEqual(readPreferences(store,user),before);
 assert.equal((await gate.resolve('repository')).some(j=>j.id==='S900001'),false);
});
test('ambiguous and missing names never silently select the first search hit',async t=>{
 const {store,gate,user}=fixture(t,{download:async url=>bytes(new URL(url).searchParams.get('search')==='missing'?[]:[journal('S900001','Advanced Photonics'),journal('S900002','Advanced Photonics Nexus')])});
 const before=readPreferences(store,user);
 await assert.rejects(gate.apply(user,{journalNames:['Photonics']}),/Which journal/);
 await assert.rejects(gate.apply(user,{journalNames:['missing']}),/No verified journal/);
 assert.deepEqual(readPreferences(store,user),before);
 assert.equal((await gate.apply(user,{journalNames:['Advanced Photonics Nexus']})).customJournals[0].id,'S900002');
});
test('lookup deduplicates simultaneous requests and bounds its public endpoint and response budget',async t=>{
 let release,calls=0;const hold=new Promise(r=>release=r),requests=[];
 const {gate}=fixture(t,{download:async(url,options)=>{calls++;requests.push({url,options});await hold;return bytes([journal()])}});
 const one=gate.resolve('Advanced Photonics'),two=gate.resolve('advanced photonics');release();await Promise.all([one,two]);assert.equal(calls,1);
 const u=new URL(requests[0].url);assert.equal(u.origin,'https://api.openalex.org');assert.equal(u.pathname,'/sources');assert.equal(requests[0].options.timeout,8000);assert.equal(requests[0].options.maxBytes,350000);assert.equal(requests[0].options.redirects,0);
 for(const query of ['https://127.0.0.1/secret','<script>alert(1)</script>',42,' '])await assert.rejects(gate.resolve(query));
 assert.equal(calls,1);
 const translated=await gate.resolve('光学');assert.equal(translated.some(j=>j.id==='S4210197940'),false);assert.equal(calls,2);
});
test('stale edits and account suspension during a lookup cannot overwrite preferences',async t=>{
 let release,entered;const started=new Promise(r=>entered=r),hold=new Promise(r=>release=r);
 const {store,gate,user}=fixture(t,{download:async()=>{entered();await hold;return bytes([journal()])}});
 const pending=gate.apply(user,{journalNames:['Advanced Photonics']});await started;
 savePreferences(store,user,{interests:'newer choice'});release();await assert.rejects(pending,/changed elsewhere/);assert.equal(readPreferences(store,user).interests,'newer choice');
 const blocked={id:'blocked'};store.db.prepare('INSERT INTO suspensions VALUES(?,?)').run(blocked.id,'{}');await assert.rejects(gate.apply(blocked,{journalNames:['Advanced Photonics']}));
});
test('lookup failure is recoverable and leaves every saved setting unchanged',async t=>{
 let fail=true;const {store,gate,user}=fixture(t,{download:async()=>{if(fail)throw Error('Offline');return bytes([journal()])}});
 const before=readPreferences(store,user);await assert.rejects(gate.apply(user,{journalNames:['Advanced Photonics']}),/temporarily unavailable/);assert.deepEqual(readPreferences(store,user),before);
 fail=false;assert.ok((await gate.apply(user,{journalNames:['Advanced Photonics']})).journals.includes('S900001'));
});
test('journal list is finite, and reset/removal prunes unused custom metadata',async t=>{
 const {store,gate,user}=fixture(t,{download:async url=>{const id=new URL(url).pathname.split('/').at(-1);return Buffer.from(JSON.stringify(journal(id,'Journal '+id)))}});
 const journals=Array.from({length:24},(_,i)=>'S'+(900000+i));await gate.apply(user,{journals});assert.equal(readPreferences(store,user).customJournals.length,24);
 const before=readPreferences(store,user);await assert.rejects(gate.apply(user,{journals:[...journals,'S999999']}),/24 journals/);assert.deepEqual(readPreferences(store,user),before);
 await gate.apply(user,{journals:['S137773608']});assert.equal(readPreferences(store,user).customJournals,undefined);
});
test('interest cleanup is Unicode-aware, bounded and shared with explicit chat operations',()=>{
 assert.equal(cleanInterests(' Optics, optics；Ｏｐｔｉｃｓ; Organoids\norganoids '),'Optics, Organoids');
 assert.equal(cleanInterests('光学，光学；成像'),'光学, 成像');
 assert.throws(()=>cleanInterests('<script>bad</script>'));assert.throws(()=>cleanInterests('a,b,c,d,e,f,g,h,i'),/8 interests/);
 assert.throws(()=>cleanInterests('x'.repeat(121)),/120|shorter/);
 const p={interests:'optics, organoids'};assert.equal(dynamicPreferenceCommand('Add optics; quantum imaging to my interests',p).patch.interests,'optics, organoids, quantum imaging');
 assert.equal(dynamicPreferenceCommand('Remove OPTICS from my interests',p).patch.interests,'organoids');
 assert.equal(dynamicPreferenceCommand('添加期刊 Advanced Photonics',p).patch.journalNames[0],'Advanced Photonics');
});
test('a first interest choice keeps Nature/Science/Cell defaults; saved legacy choices are preserved',t=>{
 const {store,user}=fixture(t);const onboarding=createResearchPreferences(store);
 onboarding.update(user,{text:'quantum imaging, QUANTUM IMAGING'});
 const p=readPreferences(store,user);assert.equal(p.interests,'quantum imaging');assert.deepEqual(p.journals,['S137773608','S3880285','S110447773']);assert.deepEqual(p.topics,[]);assert.equal(p.recommendationsVersion,1);
 store.db.prepare('INSERT INTO reading_preferences VALUES(?,?)').run('legacy',JSON.stringify({interests:'climate',dailyTime:'08:30'}));
 onboarding.update({id:'legacy'},{text:'history, HISTORY'});const legacy=readPreferences(store,{id:'legacy'});assert.equal(legacy.interests,'history');assert.equal(legacy.dailyTime,'08:30');assert.equal(legacy.recommendationsVersion,undefined);
});
test('chat and settings share the gate, require account proof, and preserve ordinary research requests',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'oi-gate-api-')),store=new Store(dir),origin='http://127.0.0.1:4182';
 const app=createApp(store,{origin},{worker:false,preferenceOptions:{download:async()=>bytes([journal()])}});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>app.close(r));store.close();rmSync(dir,{recursive:true,force:true})});
 const token=store.createSession({id:'alice'}),base='http://127.0.0.1:'+app.address().port;
 const call=async(path,body,method=body?'POST':'GET',auth=true)=>{const r=await fetch(base+'/api'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(auth?{Cookie:'onlyideas-local='+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()}};
 assert.equal((await call('/preferences/resolve',{query:'Advanced Photonics'},'POST',false)).status,401);
 const chat=(await call('/chats',{})).chat.id;
 assert.equal((await call('/chats/'+chat+'/messages',{text:'Add journal Advanced Photonics'})).queued,false);
 let p=(await call('/preferences')).preferences;assert.ok(p.journals.includes('S900001'));
 assert.equal((await call('/preferences/options')).journals.some(j=>j.id==='S900001'),true);
 await call('/chats/'+chat+'/messages',{text:'Add quantum imaging to my interests'});p=(await call('/preferences')).preferences;assert.equal(p.interests,'quantum imaging');
 assert.equal((await call('/preferences',{...p,interests:'Quantum imaging, quantum imaging'},'PUT')).preferences.interests,'Quantum imaging');
 const revision=readPreferences(store,{id:'alice'}).revision;await call('/chats/'+chat+'/messages',{text:'Show my journals'});
 assert.match((await call('/chats/'+chat)).messages.at(-1).text,/Advanced Photonics/);
 assert.equal(readPreferences(store,{id:'alice'}).revision,revision);
 assert.equal(store.db.prepare('SELECT count(*) n FROM chat_tasks').get().n,0);
 assert.equal((await call('/chats/'+chat+'/messages',{text:'Find a paper in Advanced Photonics'})).status,503);
 assert.equal(readPreferences(store,{id:'alice'}).revision,revision);
});

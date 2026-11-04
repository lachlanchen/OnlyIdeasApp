import{test}from'node:test';import assert from'node:assert/strict';import{mkdtempSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{randomUUID}from'node:crypto';
import{Store}from'../server/store.mjs';import{createApp}from'../server/app.mjs';import{makePaper}from'../server/domain.mjs';
test('single-job progress is owner/subscriber scoped even when the job is outside the recent list',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'onlyideas-progress-')),store=new Store(dir),origin='http://127.0.0.1:4182';
 const paper=store.savePaper({...makePaper({id:randomUUID(),owner:'author',title:'Public optics',mmd:'Real test text'}),visibility:'public'});
 const id=randomUUID();store.saveJob({id,owner:'author',kind:'translation',paperId:paper.id,dedupe:'shared-translation',state:'failed',message:'Provider unavailable; saved pieces remain.',created:1,secret:'private fixture'});
 store.db.prepare('INSERT INTO job_subscriptions VALUES(?,?)').run('reader',id);
 for(let i=0;i<85;i++)store.saveJob({id:randomUUID(),owner:'reader',kind:'translation',dedupe:'recent-'+i,state:'completed',created:100+i});
 const app=createApp(store,{origin},{worker:false});await new Promise(r=>app.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>app.close(r));store.close();rmSync(dir,{recursive:true,force:true})});
 const tokens=Object.fromEntries(['author','reader','other'].map(id=>[id,store.createSession({id})]));
 const call=async who=>{const r=await fetch(`http://127.0.0.1:${app.address().port}/api/jobs/${id}`,{headers:who?{Cookie:'onlyideas-local='+tokens[who]}:{}});return{status:r.status,data:await r.json()}};
 assert.equal((await call()).status,401);assert.equal((await call('other')).status,404);
 assert.equal(store.jobs('reader').some(j=>j.id===id),false);
 const result=await call('reader');assert.equal(result.status,200);assert.equal(result.data.job.state,'failed');assert.equal(result.data.job.message,'Provider unavailable; saved pieces remain.');assert.ok(!JSON.stringify(result.data).includes('private fixture'));
 paper.visibility='private';store.savePaper(paper);assert.equal((await call('reader')).status,404);assert.equal((await call('author')).status,200);
 paper.visibility='public';store.savePaper(paper);store.db.prepare('INSERT INTO blocks VALUES(?,?,?)').run('reader','author','Author');assert.equal((await call('reader')).status,404);
})

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.mjs';
import {makePaper} from '../server/domain.mjs';
import {createApp} from '../server/app.mjs';
import {requestSharing} from '../server/sharing.mjs';
import {createPublicationReview,publicationFingerprint,paperReviewStatus} from '../server/publication-review.mjs';
import {publishPaper} from '../server/providers.mjs';

const admin={id:'admin',name:'Admin',login:'admin'};
function fixture(){const dir=mkdtempSync(join(tmpdir(),'onlyideas-review-')),store=new Store(dir),config={publicationReviewers:['admin']},review=createPublicationReview(store,config);
  const add=(sharing='shared')=>{const paper=makePaper({id:randomUUID(),owner:'contributor',title:'Event microscopy',mmd:'# Event microscopy\n\nTest $x^2$ with attribution.',source:'https://example.org/research'});store.savePaper(paper);return {paper,job:requestSharing(store,paper,sharing)}};
  return {dir,store,config,review,add,close(){store.close();rmSync(dir,{recursive:true,force:true})}};}
function approval(entry){return {id:entry.id,token:entry.token,license:'CC-BY-4.0',evidenceUrl:'https://example.org/research/license',note:'Verified source license, text and all figures.',contentChecked:true,rightsChecked:true}}

test('review queue exposes only sharing requests, and only to exact designated active accounts',()=>{const f=fixture();try{
 const shared=f.add(),privatePaper=f.add('private');
 assert.throws(()=>f.review.list(null),/Administrator/);assert.throws(()=>f.review.list({id:'reader',login:'admin'}),/Administrator/);
 assert.equal(f.review.list(admin).items.length,1);assert.equal(f.review.list(admin).items[0].paper.id,shared.paper.id);
 assert.throws(()=>f.review.detail(admin,privatePaper.paper.id),/not found/);
 f.store.db.prepare('INSERT INTO suspensions VALUES(?,?)').run(admin.id,Date.now());assert.throws(()=>f.review.list(admin),/Administrator/);
}finally{f.close()}});

test('batch approval is atomic, version-bound and non-replayable; private audit never enters paper metadata',()=>{const f=fixture();try{
 const a=f.add(),b=f.add();const entries=f.review.list(admin).items;
 assert.throws(()=>f.review.decide(admin,{action:'approve',items:[approval(entries[0]),{...approval(entries[1]),token:'stale'}]}),/changed/);
 assert.equal(f.store.job(a.job.id).state,'awaiting_review');assert.equal(f.store.job(b.job.id).state,'awaiting_review');assert.equal(f.store.db.prepare('SELECT count(*) n FROM publication_reviews').get().n,0);
 const body={action:'approve',items:entries.map(approval)};f.review.decide(admin,body);
 assert.throws(()=>f.review.decide(admin,body),/changed/);assert.equal(f.store.db.prepare('SELECT count(*) n FROM publication_reviews').get().n,2);
 const paper=f.store.paper(a.paper.id),job=f.store.job(a.job.id);assert.equal(paper.visibility,'private');assert.equal(paper.sharing,'publishing');assert.equal(job.reviewFingerprint,publicationFingerprint(paper));
 assert.ok(!JSON.stringify(paper).includes('Verified source license'));assert.ok(!JSON.stringify(paper).includes('reviewer'));
 assert.equal(f.review.detail(admin,a.job.id).history[0].reviewer,'admin');
}finally{f.close()}});

test('approval requires per-paper rights, quality checks, supported license and evidence',()=>{const f=fixture();try{
 f.add();const entry=f.review.list(admin).items[0];
 for(const patch of [{rightsChecked:false},{contentChecked:false},{license:'CC-BY-NC-4.0'},{evidenceUrl:'https://user:secret@example.org/license'},{note:''}])assert.throws(()=>f.review.decide(admin,{action:'approve',items:[{...approval(entry),...patch}]}));
 const p=f.store.paper(entry.paper.id);p.mmd+='\nA new figure';f.store.savePaper(p);
 assert.throws(()=>f.review.decide(admin,{action:'approve',items:[approval(entry)]}),/changed/);
 assert.equal(f.store.db.prepare('SELECT count(*) n FROM publication_reviews').get().n,0);
}finally{f.close()}});

test('changes, decline, re-review and publication failure retry preserve visibility and decision history',async()=>{const f=fixture();try{
 const {paper,job}=f.add();let entry=f.review.detail(admin,job.id);
 f.review.decide(admin,{action:'changes',reason:'Please provide the publisher license notice.',items:[entry]});
 assert.equal(paperReviewStatus(f.store,f.store.paper(paper.id)).state,'changes_requested');
 assert.match(paperReviewStatus(f.store,f.store.paper(paper.id)).message,/publisher license/);
 requestSharing(f.store,f.store.paper(paper.id),'shared');assert.equal(f.store.paper(paper.id).sharing,'changes_requested');
 entry=f.review.detail(admin,job.id);f.review.decide(admin,{action:'reject',reason:'The source does not permit redistribution.',items:[entry]});assert.equal(f.store.paper(paper.id).sharing,'declined');
 entry=f.review.detail(admin,job.id);f.review.decide(admin,{action:'approve',items:[approval(entry)]});
 const j=f.store.job(job.id);j.state='failed';j.message='Temporary Git connection failure';f.store.saveJob(j);
 assert.equal(paperReviewStatus(f.store,f.store.paper(paper.id)).state,'publication_failed');
 entry=f.review.detail(admin,job.id);f.review.decide(admin,{action:'retry',items:[entry]});assert.equal(f.store.job(job.id).state,'queued');
 const changed=f.store.paper(paper.id);changed.mmd+='\nChanged after approval';f.store.savePaper(changed);
 await assert.rejects(publishPaper(f.store.job(job.id),{},f.store),/changed after review/);
 assert.equal(f.store.paper(paper.id).visibility,'private');assert.equal(f.review.detail(admin,job.id).history.length,4);
}finally{f.close()}});

test('review HTTP authorization, CSRF, preview assets, owner status and public metadata boundaries',async()=>{const f=fixture();const origin='http://127.0.0.1:4182';const app=createApp(f.store,{...f.config,origin,github:{checkout:'/not-used'}},{worker:false});await new Promise(r=>app.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.address().port}`;
 const tokens={admin:f.store.createSession(admin),reader:f.store.createSession({id:'reader',name:'Reader',login:'reader'}),contributor:f.store.createSession({id:'contributor',name:'Contributor',login:'contributor'})};
 const call=async(path,user,body,from=origin)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:from,...(user?{Cookie:`onlyideas-local=${tokens[user]}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:(r.headers.get('content-type')||'').includes('json')?await r.json():await r.text()}};
 try{
  const {paper,job}=f.add();paper.assets=[{path:'figures/test.png'}];f.store.savePaper(paper);mkdirSync(join(f.dir,'papers',paper.id,'figures'),{recursive:true});writeFileSync(join(f.dir,'papers',paper.id,'figures/test.png'),'figure');
  const path='/api/admin/publications';assert.equal((await call(path)).status,401);assert.equal((await call(path,'reader')).status,403);assert.equal((await call(`${path}/${job.id}/figures/test.png`,'reader')).status,403);
  assert.equal((await call(`/api/session`,'admin')).data.capabilities.publicationReview,true);assert.equal((await call(`/api/session`,'reader')).data.capabilities.publicationReview,false);
  assert.equal((await call(`${path}/${job.id}/figures/test.png`,'admin')).data,'figure');assert.equal((await call(`/content/${paper.id}/figures/test.png`,'admin')).status,404,'admin preview must not broaden ordinary private paper access');
  const entry=(await call(path,'admin')).data.items[0],body={action:'approve',items:[approval(entry)]};
  assert.equal((await call(path+'/batch','admin',body,'https://evil.test')).status,403);assert.equal((await call(path+'/batch','reader',body)).status,403);assert.equal((await call(path+'/batch','admin',body)).status,200);
  assert.equal((await call('/api/papers','reader')).data.papers.length,0);assert.equal((await call(`/api/papers/${paper.id}`,'contributor')).data.paper.review.state,'publishing');
  const published=f.store.paper(paper.id);published.visibility='public';published.sharing='shared';f.store.savePaper(published);
  const publicResult=(await call('/api/papers')).data.papers[0];assert.equal(publicResult.visibility,'public');assert.equal(publicResult.owner,undefined);assert.equal(publicResult.review,undefined);assert.equal(publicResult.mmd,undefined);
  assert.ok(!JSON.stringify(publicResult).includes('Verified source license'));
 }finally{await new Promise(r=>app.close(r));f.close()}
});

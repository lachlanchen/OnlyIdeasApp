import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';
import{Store}from'../server/store.mjs';import{makePaper}from'../server/domain.mjs';
import{confirmPublication}from'../server/confirm-publication.mjs';import{requestSharing}from'../server/sharing.mjs';
import{respond}from'../worker/paper-agent.mjs';import{researchPapers}from'../worker/research-backends.mjs';import{agintiArguments,parseAgintiResearch}from'../worker/aginti-research.mjs';
const title='Polarization Holographic 4D Phenotyping Reveals Nanoplastic Induced Dysfunction in Zooplankton';
const card={id:'index-id',title,doi:'10.1002/advs.77832',source:'https://doi.org/10.1002/advs.77832',pdfUrl:'https://example.org/paper.pdf'};
test('direct LLM planning and index results satisfy normal research without either agent helper',async()=>{
 const calls=[];const result=await respond({text:'Can you find my polarization holographic paper about nanoplastics in zooplankton?',language:'en',messages:[],library:[],agentActions:true},{model:{url:'https://example.org/chat',name:'model'},aginti:{enabled:true},codex:{enabled:true}},async()=>{}, {
  provider:async()=>{calls.push('llm');return{choices:[{message:{content:JSON.stringify({action:'search',query:title})}}]}},
  search:async()=>{calls.push('indexes');return[card]},
  codex:async()=>{calls.push('codex');return[]},aginti:async()=>{calls.push('aginti');return[]}
 });
 assert.equal(result.papers[0].doi,card.doi);assert.deepEqual(calls,['llm','indexes']);
});
test('long specific paper title remains actionable during planner outage and reuses saved transcript',async()=>{
 let research=0;const result=await respond({text:title+' help me download this paper',language:'en',messages:[],library:[{...card,paperId:'existing'}],agentActions:true},{model:{url:'https://example.org/chat',name:'model'},aginti:{enabled:true},codex:{enabled:true}},async()=>{}, {provider:async()=>{throw Error('HTTP 503')},search:async()=>[],aginti:async()=>{research++;return[]},codex:async()=>{research++;throw Error('allowance')}});
 assert.equal(result.papers[0].paperId,'existing');assert.equal(result.actions[0].kind,'import');assert.equal(research,0);
});
test('AgInTi recovers a title when indexes, planner and Codex allowance fail',async()=>{
 let codex=0;const result=await respond({text:title+' help me download this paper',language:'en',messages:[],library:[],agentActions:true},{model:{url:'https://example.org/chat',name:'model'},aginti:{enabled:true},codex:{enabled:true}},async()=>{}, {provider:async()=>{throw Error('HTTP 503')},search:async()=>[],aginti:async()=>[card],codex:async()=>{codex++;throw Error('allowance')}});
 assert.equal(result.papers[0].doi,card.doi);assert.equal(result.actions[0].kind,'import');assert.equal(codex,1);
});
test('independent research backend failure is bounded and preserves final recovery',async()=>{
 const calls=[];assert.deepEqual(await researchPapers('topic',{aginti:{enabled:true},codex:{enabled:true}},{aginti:async()=>{calls.push('aginti');throw Error('unavailable')},codex:async()=>{calls.push('codex');throw Error('quota exhausted')}}),[]);assert.deepEqual(calls,['codex','aginti']);
 const args=agintiArguments({model:'deepseek-flash'},'/temporary/task');for(const v of ['--no-shell','--no-file-tools','--no-wrappers','--no-mcp','--no-auxiliary-tools','--no-parallel-scouts','--dynamic-steps','off'])assert.ok(args.includes(v));assert.ok(!args.includes('--allow-destructive'));
 assert.throws(()=>parseAgintiResearch(JSON.stringify({ok:false,result:'{"papers":[]}'})));assert.throws(()=>parseAgintiResearch(JSON.stringify({ok:true,result:'not JSON'})));
});
test('verified Codex research succeeds without starting AgInTi',async()=>{
 const calls=[];const result=await researchPapers('public title',{codex:{enabled:true},aginti:{enabled:true}},{codex:async()=>{calls.push('codex');return[card]},aginti:async()=>{calls.push('aginti');return[]}});
 assert.deepEqual(result,[card]);assert.deepEqual(calls,['codex']);
});
test('empty Codex results recover with AgInTi and disabled backends are skipped',async()=>{
 for(const enabled of [true,false]){
  const calls=[];const result=await researchPapers('public title',{codex:{enabled},aginti:{enabled:true}},{codex:async()=>{calls.push('codex');return[]},aginti:async()=>{calls.push('aginti');return[card]}});
  assert.deepEqual(result,[card]);assert.deepEqual(calls,enabled?['codex','aginti']:['aginti']);
 }
});
test('expired research deadline never starts another helper',async()=>{
 let calls=0;const run=async()=>{calls++;return[card]};
 assert.deepEqual(await researchPapers('public title',{researchDeadline:Date.now()-1,codex:{enabled:true},aginti:{enabled:true}},{codex:run,aginti:run}),[]);assert.equal(calls,0);
});
function fixture(){const dir=mkdtempSync(join(tmpdir(),'onlyideas-publication-'));const store=new Store(dir);const paper=makePaper({id:'paper',owner:'owner',title:'Owned research',source:'https://example.org/paper',mmd:'# Research\n\nOriginal content.'});store.savePaper(paper);return {store,paper,close(){store.close();rmSync(dir,{recursive:true,force:true})}}}
const permission=p=>({license:'author-permission',source:p.source,revision:p.revision,attestation:true,acceptTerms:true});
test('owner makes pending private paper public once, reuses transcript and review, and preserves private notes',()=>{const f=fixture();try{
 const queued=requestSharing(f.store,f.paper,'shared');f.store.db.prepare('INSERT INTO notes VALUES(?,?,?)').run('owner','paper','Private note');
 const result=confirmPublication(f.store,{id:'owner'},'paper',permission(f.paper),()=>{});
 assert.equal(result.job.id,queued.id);assert.equal(result.paper.visibility,'public');assert.equal(result.paper.revision,f.paper.revision);assert.equal(result.paper.mmd,f.paper.mmd);assert.equal(result.job.state,'awaiting_review');assert.equal(result.job.reviewed,false);
 assert.equal(confirmPublication(f.store,{id:'owner'},'paper',permission(f.paper),()=>{}).alreadyPublic,true);assert.equal(f.store.jobs('owner').length,1);assert.equal(f.store.db.prepare('SELECT body FROM notes').get().body,'Private note');
}finally{f.close()}});
test('publication rejects cross-account, missing consent, stale revisions and moderator rejection',()=>{const f=fixture();try{
 assert.throws(()=>confirmPublication(f.store,{id:'other'},'paper',permission(f.paper),()=>{}),/owner/);
 for(const change of [{attestation:false},{acceptTerms:false},{revision:'old'},{license:'private'}])assert.throws(()=>confirmPublication(f.store,{id:'owner'},'paper',{...permission(f.paper),...change},()=>{}));
 const j=requestSharing(f.store,f.paper,'shared');f.store.saveJob({...j,state:'failed',reviewDecision:'reject'});assert.throws(()=>confirmPublication(f.store,{id:'owner'},'paper',permission(f.paper),()=>{}),/moderator/);assert.equal(f.store.paper('paper').visibility,'private');
}finally{f.close()}});
test('publication storage failure rolls back public visibility and accepted terms',()=>{const f=fixture();try{
 f.store.saveJob=()=>{throw Error('disk failure')};assert.throws(()=>confirmPublication(f.store,{id:'owner'},'paper',permission(f.paper),(s,u)=>s.db.prepare('INSERT INTO terms VALUES(?,?)').run(u.id,'version')),/disk failure/);
 assert.equal(f.store.paper('paper').visibility,'private');assert.equal(f.store.db.prepare('SELECT count(*) n FROM terms').get().n,0);
}finally{f.close()}});

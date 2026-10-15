import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {hash} from '../server/domain.mjs';
import {cachedResearchPapers} from '../worker/research-backends.mjs';
import {respond} from '../worker/paper-agent.mjs';

const doi='10.1002/adpr.202500181';
const card={id:'mesh',title:'Metasurface-Encoded Single-Pixel Hyperspectral Imaging',doi,source:'https://doi.org/'+doi,pdfUrl:'https://publisher.example/paper.pdf'};
test('public research cache requires current day and exact DOI, ignores malformed/unsafe fields',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'onlyideas-source-'));const config={codex:{enabled:true,stateDir:dir}},file=join(dir,'search-'+hash(doi)+'.json');
 try{
  assert.deepEqual(await cachedResearchPapers(doi,config),[]);
  await writeFile(file,JSON.stringify({day:'2000-01-01',papers:[card]}));assert.deepEqual(await cachedResearchPapers(doi,config),[]);
  await writeFile(file,JSON.stringify({day:new Date().toISOString().slice(0,10),papers:[{...card,doi:'10.1002/another'},{...card,pdfUrl:'file:///private/document',downloadSources:9},{...card,pdfUrl:'https://author.example/paper.pdf',downloadSources:['https://author.example/paper.pdf','https://secret@example.org/p.pdf']}]}));
  const result=await cachedResearchPapers(doi,config);assert.equal(result.length,2);assert.equal(result[0].pdfUrl,'');assert.deepEqual(result[0].downloadSources,[]);assert.deepEqual(result[1].downloadSources,['https://author.example/paper.pdf']);
  assert.deepEqual(await cachedResearchPapers(doi,{codex:{enabled:false,stateDir:dir}}),[]);
  await writeFile(file,'broken');assert.deepEqual(await cachedResearchPapers(doi,config),[]);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('a verified cached author PDF is reused before another paid research attempt',async()=>{
 let paidCalls=0;
 const result=await respond({text:'Metasurface‐Encoded Single‐Pixel Hyperspectral Imaging help me download this paper',agentActions:true,messages:[]},{codex:{enabled:true}},()=>{},{search:async()=>[card],cachedResearch:async query=>{assert.equal(query,doi);return [{...card,pdfUrl:'https://author.example/paper.pdf'}]},codex:async()=>{paidCalls++;return []}});
 assert.equal(result.actions[0].kind,'import');assert.equal(result.papers[0].pdfUrl,'https://author.example/paper.pdf');assert.equal(result.papers[0].pdfNeedsVerification,true);assert.deepEqual(result.papers[0].downloadSources,['https://author.example/paper.pdf','https://publisher.example/paper.pdf']);assert.equal(paidCalls,0);
});

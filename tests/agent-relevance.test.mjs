import {test} from 'node:test';
import assert from 'node:assert/strict';
import {respond} from '../worker/paper-agent.mjs';
import {targetCard,needsQueryPlanning,literalResearchQuery} from '../worker/planning.mjs';

const config={model:{url:'https://model.test/chat',name:'fixture'}};
const model=value=>({choices:[{message:{content:typeof value==='string'?value:JSON.stringify(value)},finish_reason:'stop'}]});
test('Chinese conversational literature requests search scientific concepts and compare relevant abstracts',async()=>{
 const text='我想了解事件相机用于单分子荧光显微镜的相关论文，请总结研究进展和未来机会。';
 const relevant={id:'fluorescence',title:'Event cameras for single molecule fluorescence microscopy',source:'https://example.org/fluorescence',summary:'An event sensor records fluorescence localizations.'};
 const irrelevant={id:'policy',title:'哪些因素阻碍我们一起行动',source:'https://example.org/policy',summary:'A social policy review.'};
 const queries=[];let calls=0;
 const result=await respond({text,language:'zh-Hans',agentActions:true,messages:[{role:'user',text}],library:[]},config,()=>{},{
  provider:async(_,options)=>{
   const body=JSON.parse(options.body);calls++;
   if(calls===1){assert.equal(body.messages.at(-1).content,text);return model({action:'search',query:'event camera single molecule fluorescence microscopy',queries:['neuromorphic fluorescence microscopy']});}
   const evidence=JSON.parse(body.messages.at(-1).content);assert.equal(evidence.question,text);assert.deepEqual(evidence.papers.map(p=>p.title),[relevant.title]);
   return model('这是基于摘要的概览：[1] 研究了事件传感器的荧光定位。');
  },search:async q=>{queries.push(q);return [irrelevant,relevant]}
 });
 assert.deepEqual(queries,['event camera single molecule fluorescence microscopy','neuromorphic fluorescence microscopy']);
 assert.deepEqual(result.papers,[relevant]);assert.equal(result.actions,undefined);assert.match(result.text,/摘要/);assert.equal(calls,2);
});
test('an unavailable interpreter does not return unrelated literal multilingual matches',async()=>{
 let searches=0;
 const result=await respond({text:'请找事件相机与荧光显微镜的论文',messages:[]},config,()=>{},{provider:async()=>{throw Error('503')},search:async()=>{searches++;return [{title:'Unrelated'}]}});
 assert.equal(searches,0);assert.deepEqual(result.papers,[]);assert.match(result.text,/interpret.*reliably/);
});
test('unrelated library content is never an implicit this-paper or first-paper target',async()=>{
 const old={id:'old',paperId:'old',title:'Graph theory in forests',source:'https://example.org/graph'};
 for(const text of ['Explain this','Download the first paper'])assert.equal(targetCard({text,messages:[],library:[old]}),null);
 let reads=0;
 const result=await respond({text:'How does fluorescence work?',agentActions:true,messages:[],library:[old]},config,()=>{},{provider:async()=>model({action:'explain',target:'old'}),readPaper:async()=>{reads++;throw Error('Wrong paper')}});
 assert.equal(reads,0);assert.deepEqual(result.papers,[]);
});
test('zero-relevance index results do not become recommended papers',async()=>{
 const result=await respond({text:'event camera fluorescence',messages:[]},{},()=>{},{search:async()=>[{title:'Medieval taxation',source:'https://example.org/tax'}]});
 assert.deepEqual(result.papers,[]);
});

test('this in a new concrete topic cannot reuse a previous unrelated result',()=>{
 const old={id:'old',paperId:'old',title:'Graph theory in forests',source:'https://example.org/graph'};
 const context={messages:[{role:'assistant',papers:[old]}],library:[old]};
 assert.equal(targetCard({...context,text:'Download this new paper about event cameras'}),null);
 assert.equal(targetCard({...context,text:'下载这个事件相机的论文'}),null);
 assert.equal(targetCard({...context,text:'Translate this paper paragraph 1 sentence 2 into Chinese'}).id,old.id);
});

const metasurface={id:'mesh',title:'Metasurface‐Encoded Single‐Pixel Hyperspectral Imaging',doi:'10.1002/adpr.202500181',source:'https://doi.org/10.1002/adpr.202500181',pdfUrl:'https://author.example/paper.pdf'};
test('publisher typography is not a translation requirement and request filler is removed',()=>{
 for(const dash of ['-','‐','‑','–','—']){
  const text=`Metasurface${dash}Encoded Single${dash}Pixel Hyperspectral Imaging help me download this paper`;
  assert.equal(needsQueryPlanning(text),false);
  assert.equal(literalResearchQuery(text),'metasurface encoded single pixel hyperspectral imaging');
 }
 assert.equal(literalResearchQuery('Could you please download the paper “Metasurface‐Encoded Single‐Pixel Hyperspectral Imaging”?'),'metasurface encoded single pixel hyperspectral imaging');
 assert.equal(needsQueryPlanning('请找事件相机与荧光显微镜的论文'),true);
});
test('an exact title remains searchable through planner outage, malformed output and empty plans',async()=>{
 const text='Metasurface‐Encoded Single‐Pixel Hyperspectral Imaging help me download this paper';
 for(const provider of [async()=>{throw Error('503')},async()=>model('not json'),async()=>model({action:'search',query:''}),async()=>model({action:'reply',message:'Try later'}),async()=>model({action:'search',query:'medieval taxation'})]){
  const queries=[];
  const result=await respond({text,agentActions:true,messages:[],library:[]},config,()=>{},{provider,search:async q=>{queries.push(q);return [{title:'Medieval taxation',source:'https://example.org/tax'},metasurface]}});
  assert.deepEqual(queries,['metasurface encoded single pixel hyperspectral imaging']);
  assert.deepEqual(result.papers,[metasurface]);assert.equal(result.actions[0].kind,'import');
 }
});
test('an ambiguous title lookup asks for selection instead of importing the first partial match',async()=>{
 const papers=[{id:'a',title:'Metasurface-Encoded Single-Pixel Hyperspectral Imaging with neural reconstruction',source:'https://example.org/a'},{id:'b',title:'Metasurface-Encoded Single-Pixel Hyperspectral Imaging with spectral filters',source:'https://example.org/b'}];
 const result=await respond({text:'Metasurface‐Encoded Single‐Pixel Hyperspectral Imaging help me download this paper',agentActions:true,messages:[]},{},()=>{},{search:async()=>papers});
 assert.equal(result.papers.length,2);assert.equal(result.actions,undefined);assert.match(result.text,/Choose the paper/);
});
test('search failures are distinguished from no matches, without fabricating downloads',async()=>{
 const task={text:'Metasurface‐Encoded Single‐Pixel Hyperspectral Imaging help me download this paper',agentActions:true,messages:[]};
 const failed=await respond(task,{},()=>{},{search:async()=>{throw Error('503')}});
 assert.match(failed.text,/search is temporarily unavailable/);assert.equal(failed.actions,undefined);
 const empty=await respond(task,{},()=>{},{search:async()=>[]});assert.match(empty.text,/No matching paper/);assert.equal(empty.actions,undefined);
});
test('a related older card cannot substitute for a new exact title',async()=>{
 const old={id:'old-related',paperId:'old-related',title:'Single-Pixel Hyperspectral Imaging with broadband detectors',source:'https://example.org/older'};
 const task={text:'Metasurface‐Encoded Single‐Pixel Hyperspectral Imaging help me download this paper',agentActions:true,messages:[{role:'assistant',papers:[old]}],library:[old]};
 assert.equal(targetCard(task),null);
 const result=await respond(task,{},()=>{},{search:async()=>[metasurface]});
 assert.equal(result.papers[0].doi,metasurface.doi);assert.equal(result.actions[0].target,metasurface.id);
 const extended={...old,title:'Metasurface-Encoded Single-Pixel Hyperspectral Imaging with neural spectral reconstruction'};
 assert.equal(targetCard({...task,library:[extended],messages:[{role:'assistant',papers:[extended]}]}),null);
 const partial=await respond({...task,library:[],messages:[]},{},()=>{},{search:async()=>[extended]});
 assert.equal(partial.actions,undefined);assert.match(partial.text,/Choose the paper/);
});
test('the reported title works without a model or research helper and reuses saved papers',async()=>{
 let searches=0;
 const task={text:'Metasurface‐Encoded Single‐Pixel Hyperspectral Imaging help me download this paper',agentActions:true,messages:[],library:[]};
 const deps={search:async()=>{searches++;return [metasurface]},codex:async()=>{throw Error('unexpected helper')},aginti:async()=>{throw Error('unexpected helper')}};
 const first=await respond(task,{},()=>{},deps);assert.equal(first.actions[0].kind,'import');assert.equal(searches,1);
 const saved={...metasurface,paperId:'saved-transcript'};
 const reused=await respond({...task,library:[saved]},config,()=>{},{...deps,provider:async()=>{throw Error('Saved paper must not need a model')}});
 assert.equal(reused.papers[0].paperId,'saved-transcript');assert.equal(searches,1);
});

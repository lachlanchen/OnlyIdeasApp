import {test} from 'node:test';
import assert from 'node:assert/strict';
import {respond} from '../worker/paper-agent.mjs';
import {targetCard} from '../worker/planning.mjs';

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

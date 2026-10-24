import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../server/store.mjs';
import {makePaper} from '../server/domain.mjs';
import {createDiscovery} from '../server/discovery.mjs';
import {queryRecommendations,usefulRecommendation,balanceRecommendations,recommendationJournals} from '../server/recommendations.mjs';

const card={id:'optics-fixture',title:'Optical imaging of living tissue with a new microscope',journalId:'S4210197940',journal:'Optica',
 language:'en',type:'article',openAccess:true,publicationDate:'2026-01-10',source:'https://example.org/optics',doi:'10.1234/optics'};
function fixture(){const dir=mkdtempSync(join(tmpdir(),'recommendations-')),store=new Store(dir);return{store,close(){store.close();rmSync(dir,{recursive:true,force:true})}}}

test('default shelf excludes wrong journal/language, retractions, corrections, future dates and shouting titles without changing paper titles',()=>{
 assert.equal(usefulRecommendation(card),true);
 for(const change of [{journalId:'S999'},{language:'id'},{language:''},{retracted:true},{openAccess:false},{type:'editorial'},
  {publicationDate:'2999-01-01'},{title:'OPTICAL IMAGING OF LIVING TISSUE WITH A NEW MICROSCOPE'},
  {title:'Author Correction: Optical imaging of living tissue'}, {title:'Roman history and the economics of trade'}])assert.equal(usefulRecommendation({...card,...change}),false,JSON.stringify(change));
 assert.equal(usefulRecommendation({...card,title:'DNA and RNA imaging using a new optical microscope'}),true);
 assert.equal(card.title,'Optical imaging of living tissue with a new microscope');
});

test('subject balancing deduplicates DOI and caps each journal at three cards',()=>{
 const groups=Array.from({length:3},(_,i)=>Array.from({length:12},(_,n)=>({...card,id:`${i}-${n}`,doi:`10.1234/${i}-${n}`,journalId:recommendationJournals[n%6][0]})));
 groups[1].unshift(groups[0][0]);
 const papers=balanceRecommendations(groups);assert.equal(papers.length,12);assert.equal(new Set(papers.map(p=>p.doi)).size,12);
 assert.ok(new Set(papers.map(p=>p.journalId)).size>=4);
 for(const id of new Set(papers.map(p=>p.journalId)))assert.ok(papers.filter(p=>p.journalId===id).length<=3);
 assert.deepEqual(new Set(papers.map(p=>p.id.split('-')[0])),new Set(['0','1','2']));
});

test('provider uses exact verified journals, English, research types and three title-scoped queries; filters bad returned records too',async()=>{
 const urls=[];
 const result=await queryRecommendations({page:2},async url=>{
  const u=new URL(url);urls.push(u);const i=urls.length-1,title=['Imaging living cells through tissue','A photonic laser for optical measurements','An organoid model for cancer treatment'][i];
  const work={id:'https://openalex.org/W'+(i+1),title,language:'en',type:'article',publication_date:'2026-01-10',publication_year:2026,
   primary_location:{source:{id:'https://openalex.org/'+recommendationJournals[i][0],display_name:recommendationJournals[i][1],type:'journal'}},
   best_oa_location:{is_oa:true,landing_page_url:`https://example.org/${i}`,pdf_url:`https://example.org/${i}.pdf`},open_access:{is_oa:true}};
  return Buffer.from(JSON.stringify({meta:{count:500},results:[work,{...work,id:'https://openalex.org/Wbad'+i,language:'id'},
   {...work,id:'https://openalex.org/Wcaps'+i,title:title.toUpperCase()}]}));
 });
 assert.equal(urls.length,3);assert.equal(result.papers.length,3);assert.equal(result.nextPage,3);
 for(const u of urls){assert.equal(u.searchParams.get('page'),'2');assert.equal(u.searchParams.get('per_page'),'30');assert.equal(u.searchParams.get('sort'),'publication_date:desc');
  const f=u.searchParams.get('filter');assert.match(f,/language:en/);assert.match(f,/is_retracted:false/);assert.match(f,/type:article\|review/);assert.match(f,/title.search:/);assert.match(f,/primary_location.source.id:S137773608\|S3880285/);assert.equal(u.searchParams.has('search'),false)}
});

test('slow recommendation requests are cancelled and all-provider failure is explicit',async()=>{
 let cancelled=0;const start=Date.now();
 await assert.rejects(queryRecommendations({},(_url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{cancelled++;reject(signal.reason)},{once:true})),{timeout:40}),/temporarily unavailable/);
 assert.equal(cancelled,3);assert.ok(Date.now()-start<1000);
});

test('default metadata cache coalesces users and resolves existing private/public papers per reader',async()=>{
 const f=fixture();let calls=0;const d=createDiscovery(f.store,{search:async()=>{throw Error('Unrestricted query used')},recommend:async()=>{calls++;await new Promise(r=>setTimeout(r,10));return{papers:[card],nextPage:2}}});
 try{
  const p=f.store.savePaper({...makePaper({owner:'owner',id:'cached-optics',title:card.title,source:card.source,mmd:'Stored source'}),visibility:'private'});
  const [a,b]=await Promise.all([d.find({}, {id:'owner'}),d.find({}, {id:'other'})]);assert.equal(calls,1);assert.equal(a.papers[0].paperId,p.id);assert.equal(b.papers[0].paperId,undefined);
  assert.equal(d.item(card.id,{id:'other'}).title,card.title);
  p.visibility='public';f.store.savePaper(p);assert.equal((await d.find({}, {id:'other'})).papers[0].paperId,p.id);assert.equal(calls,1);
 }finally{f.close()}
});

test('defaults preserve saved interests and explicit search stays unrestricted',async()=>{
 const f=fixture(),queries=[];let defaults=0;const d=createDiscovery(f.store,{search:async o=>{queries.push(o);return{papers:[],nextPage:null}},recommend:async()=>{defaults++;return{papers:[card],nextPage:2}}});
 try{
  f.store.db.prepare('INSERT INTO reading_preferences VALUES(?,?)').run('reader',JSON.stringify({interests:'history, climate'}));
  await d.find({}, {id:'reader'});assert.deepEqual(queries.map(q=>q.q),['history','climate']);assert.equal(defaults,0);
  await d.find({q:'a non-English paper'});await d.find({feed:'all'});await d.find({journal:'Other Journal'});assert.equal(defaults,0);
  await d.find({});assert.equal(defaults,1);assert.equal(JSON.parse(f.store.db.prepare('SELECT body FROM reading_preferences WHERE owner=?').get('reader').body).interests,'history, climate');
 }finally{f.close()}
});

test('refresh retains only the same curated policy cache; outages never refill with unrelated global papers',async()=>{
 const f=fixture();let fail=false,calls=0;const d=createDiscovery(f.store,{search:async()=>({papers:[{...card,title:'Unrelated global metadata'}]}),recommend:async()=>{calls++;if(fail)throw Error('Offline');return{papers:[card],nextPage:2}}});
 try{
  await d.find({feed:'all'});fail=true;await assert.rejects(d.find({}),/Offline/);
  fail=false;await d.find({});const at=Date.now()-61_000;f.store.db.prepare('UPDATE discovery_pages SET updated=?').run(at);fail=true;
  const r=await d.find({refresh:'1'});assert.equal(r.stale,true);assert.equal(r.papers[0].title,card.title);assert.equal(calls,3);
  assert.ok(f.store.db.prepare('SELECT updated FROM discovery_pages').all().every(r=>r.updated===at));
 }finally{f.close()}
});

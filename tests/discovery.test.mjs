import {test} from 'node:test';import assert from 'node:assert/strict';import{mkdtempSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{randomUUID}from'node:crypto';
import{Store}from'../server/store.mjs';import{createApp}from'../server/app.mjs';import{makePaper}from'../server/domain.mjs';import{searchOptions,parseArxiv,parseOpenAlex,queryOpenAlex,queryArxiv}from'../server/research-indexes.mjs';import{createDiscovery}from'../server/discovery.mjs';import{createPaperSocial}from'../server/paper-social.mjs';import{moderate}from'../server/community.mjs';
const card={id:'sample-observed-metadata',title:'Quantum memory',authors:'A. Researcher',source:'https://arxiv.org/abs/2205.01833v2',pdfUrl:'https://arxiv.org/pdf/2205.01833v2',doi:'',year:'2022',discipline:'Physics',subdiscipline:'Quantum Physics',index:'arxiv'};
function fixture(){const dir=mkdtempSync(join(tmpdir(),'discovery-'));const store=new Store(dir);return{store,close(){store.close();rmSync(dir,{recursive:true,force:true})}}}
test('discipline filters reject mismatched hierarchy, injection, inverted years and unbounded pages',()=>{assert.equal(searchOptions({source:'openalex',discipline:'31',subdiscipline:'3107'}).subdiscipline,'3107');for(const raw of [{discipline:'31',subdiscipline:'1702'},{discipline:'31,is_oa:false'},{from:'2025',to:'2000'},{page:101},{source:'arxiv',subdiscipline:'bogus'}])assert.throws(()=>searchOptions(raw));});
test('metadata preserves observed hierarchy, journal, DOI, publication year and arXiv revision',()=>{const a=parseArxiv('<feed><entry><id>http://arxiv.org/abs/2205.01833v2</id><title>Quantum memory</title><published>2022-05-04T00:00:00Z</published><arxiv:primary_category term="quant-ph"/><arxiv:journal_ref>Physical Review 12</arxiv:journal_ref><arxiv:doi>10.1234/test</arxiv:doi></entry></feed>')[0];assert.equal(a.discipline,'Physics');assert.equal(a.subdiscipline,'Quantum Physics');assert.equal(a.year,'2022');assert.equal(a.doi,'10.1234/test');assert.match(a.pdfUrl,/v2$/);const p=parseOpenAlex({results:[{id:'https://openalex.org/W1',title:'Actual paper',publication_year:2020,publication_date:'2020-03-01',open_access:{is_oa:true},primary_location:{source:{id:'S1',type:'journal',display_name:'Journal'}},primary_topic:{field:{id:'fields/31',display_name:'Physics'},subfield:{id:'subfields/3107',display_name:'Optics'}},best_oa_location:{is_oa:true,pdf_url:'https://example.org/paper.pdf',landing_page_url:'https://example.org/paper'}}]})[0];assert.equal(p.journal,'Journal');assert.equal(p.subdiscipline,'Optics');assert.equal(p.publicationDate,'2020-03-01');assert.equal(parseOpenAlex({results:[{id:'x',title:'Closed',best_oa_location:{is_oa:false,pdf_url:'https://example.org/a'}}]}).length,0);});
test('OpenAlex applies server filters, journal ID lookup and lazy pagination without a PDF download',async()=>{const urls=[];await queryOpenAlex(searchOptions({source:'openalex',discipline:'31',subdiscipline:'3107',from:'2020',to:'2025',journal:'Physical Review',page:2}),async url=>{urls.push(new URL(url));return Buffer.from(JSON.stringify(urls.length===1?{results:[{id:'https://openalex.org/S42'}]}:{results:[],meta:{count:24}}))});assert.equal(urls.length,2);assert.equal(urls[1].searchParams.get('page'),'2');assert.match(urls[1].searchParams.get('filter'),/primary_location.source.id:S42/);assert.match(urls[1].searchParams.get('filter'),/primary_topic.subfield.id:3107/);assert.match(urls[1].searchParams.get('filter'),/publication_year:2020-2025/);});
test('concurrent discovery shares cached metadata while existing-paper matching respects every reader',async()=>{const f=fixture();let calls=0;const d=createDiscovery(f.store,{search:async()=>{calls++;await new Promise(r=>setTimeout(r,20));return {papers:[card],nextPage:2}}});try{const p=f.store.savePaper({...makePaper({id:randomUUID(),owner:'owner',title:'Stored',mmd:'Original text',source:card.pdfUrl}),visibility:'private'});const [a,b]=await Promise.all([d.find({feed:'all'}, {id:'owner'}),d.find({feed:'all'}, {id:'other'})]);assert.equal(calls,1);assert.equal(a.papers[0].paperId,p.id);assert.equal(b.papers[0].paperId,undefined);p.visibility='public';f.store.savePaper(p);assert.equal((await d.find({feed:'all'}, {id:'other'})).papers[0].paperId,p.id);f.store.db.prepare('INSERT INTO blocks VALUES(?,?,?)').run('other','owner','Owner');assert.equal((await d.find({feed:'all'}, {id:'other'})).papers[0].paperId,undefined);assert.equal(calls,1)}finally{f.close()}});
test('saved papers, likes and item comments persist, stay private and honor moderation/withdrawal',async()=>{const f=fixture(),a={id:'a',name:'A'},b={id:'b',name:'B'};const d=createDiscovery(f.store,{search:async()=>({papers:[card]})});await d.find({},a);const social=createPaperSocial(f.store,d),ref='r-'+card.id;try{social.update(ref,a,{saved:true,liked:true});social.update(ref,a,{saved:true,liked:true});assert.equal(social.state(ref,b).likes,1);assert.equal(social.state(ref,b).saved,false);assert.equal(social.saved(a).length,1);const id=randomUUID();social.post(ref,a,{id,text:'Whole-paper discussion',acceptTerms:true});assert.equal(social.comments(ref,b).comments.length,0);assert.equal(social.comments(ref,a).comments.length,1);moderate(f.store,'approve-comment',id);assert.equal(social.comments(ref,b).comments.length,1);const p=f.store.savePaper({...makePaper({id:randomUUID(),owner:'owner',title:'Stored',source:card.pdfUrl,mmd:'Original'}),visibility:'public'});assert.equal(social.state(p.id,a).saved,true);assert.equal(social.comments(p.id,b).comments.length,1);p.visibility='private';f.store.savePaper(p);assert.throws(()=>social.state(ref,b));assert.throws(()=>social.state(p.id,b));assert.equal(social.state(p.id,{id:'owner'}).shareUrl,null);}finally{f.close()}});
test('one tap imports verified cached metadata, repeated taps reuse job, existing papers bypass Mathpix',async()=>{const f=fixture(),origin='http://127.0.0.1:4182';const app=createApp(f.store,{origin,mathpix:{appKey:'fixture'},maxJobsPerUserPerDay:20},{worker:false,discoveryOptions:{search:async()=>({papers:[card],nextPage:null})}});await new Promise(r=>app.listen(0,'127.0.0.1',r));const token=f.store.createSession({id:'reader',name:'Reader'});const call=async(path,body)=>{const r=await fetch('http://127.0.0.1:'+app.address().port+path,{method:body?'POST':'GET',headers:{Origin:origin,Cookie:'onlyideas-local='+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,data:await r.json()}};try{await call('/api/discovery');const responses=await Promise.all(Array.from({length:5},()=>call('/api/discovery/import',{id:card.id,title:'Untrusted override',url:'https://evil.invalid'})));assert.equal(new Set(responses.map(r=>r.data.job.id)).size,1);const job=responses[0].data.job;assert.equal(f.store.job(job.id).metadata.title,card.title);assert.equal(f.store.job(job.id).metadata.year,'2022');assert.equal(f.store.job(job.id).sharing,'shared');assert.equal(f.store.db.prepare('SELECT count(*) AS n FROM papers').get().n,0);assert.equal((await call('/api/discovery/import',{id:'invented'})).status,404);f.store.savePaper({...makePaper({id:randomUUID(),owner:'author',title:'Converted',mmd:'Text',source:card.pdfUrl}),visibility:'public'});const r=await call('/api/discovery/import',{id:card.id});assert.equal(r.data.reused,true);assert.ok(r.data.paperId);assert.equal(f.store.db.prepare('SELECT count(*) AS n FROM jobs').get().n,1)}finally{await new Promise(r=>app.close(r));f.close()}});

test('arXiv outage fallback restricts results to the arXiv repository and preserves source attribution',async()=>{
 const calls=[];const r=await queryArxiv(searchOptions({source:'arxiv',q:'quantum'}),async url=>{calls.push(new URL(url));if(url.includes('export.arxiv'))throw Error('Temporary index outage');return Buffer.from(JSON.stringify({meta:{count:1},results:[{id:'https://openalex.org/W1',title:'Observed arXiv paper',open_access:{is_oa:true},locations:[{is_oa:true,pdf_url:'https://arxiv.org/pdf/1234.12345',landing_page_url:'https://arxiv.org/abs/1234.12345',source:{id:'https://openalex.org/S4306400194'}}]}]}))});
 assert.equal(r.fallback,'openalex');assert.equal(r.papers[0].source,'https://arxiv.org/abs/1234.12345');assert.match(calls[1].searchParams.get('filter'),/locations.source.id:S4306400194/);assert.equal(r.papers[0].index,'openalex');
});

test('online keyword searches retain closed and PDF-less metadata without claiming an open PDF',async()=>{
 const work={id:'https://openalex.org/W123',doi:'https://doi.org/10.1234/closed',title:'Closed quantum paper',open_access:{is_oa:false},primary_location:{is_oa:false,pdf_url:'https://publisher.org/restricted.pdf',landing_page_url:'https://publisher.org/article'}};
 let url;const result=await queryOpenAlex(searchOptions({q:'quantum'}),async u=>{url=new URL(u);return Buffer.from(JSON.stringify({results:[work],meta:{count:1}}))});
 assert.ok(!url.searchParams.get('filter').includes('is_oa:true'));assert.equal(result.papers.length,1);assert.equal(result.papers[0].pdfUrl,'');assert.equal(result.papers[0].openAccess,false);assert.equal(result.papers[0].source,'https://publisher.org/article');
 assert.equal(parseOpenAlex({results:[work]}).length,0);
});

test('search outages retain accessible local transcripts and do not leak private libraries',async()=>{
 const f=fixture();try{const paper=f.store.savePaper({...makePaper({id:randomUUID(),owner:'owner',title:'Quantum manuscript',mmd:'Private transcript'}),visibility:'private'});
 const discovery=createDiscovery(f.store,{search:async()=>{throw Error('HTTP 503')}});
 const mine=await discovery.find({q:'quantum'},{id:'owner'});assert.equal(mine.papers[0].paperId,paper.id);assert.equal(mine.stale,true);
 assert.equal((await discovery.find({q:'quantum'},{id:'stranger'})).papers.length,0);
 }finally{f.close()}
});

test('direct arXiv imports gain a searchable title from their actual transcript without overriding supplied titles',async()=>{
 const {transcriptTitle}=await import('../server/paper-metadata.mjs');
 assert.equal(transcriptTitle('arXiv 1207.2376',String.raw`\title{Quantum Entanglement of \textbf{High Angular Momenta}}`),'Quantum Entanglement of High Angular Momenta');
 assert.equal(transcriptTitle('Owner chosen title','# Extracted title'),'Owner chosen title');
 assert.equal(transcriptTitle('arXiv 1207.2376','No declared title'),'arXiv 1207.2376');
});

test('slow indexes are cancelled while completed bibliographic results remain available',async()=>{
 const {searchIndexes}=await import('../server/research-indexes.mjs');let cancelled=false;
 const start=Date.now();const result=await searchIndexes({q:'quantum memory'},async(url,options)=>{
  if(url.includes('crossref'))return Buffer.from(JSON.stringify({message:{items:[{DOI:'10.1234/memory',title:['Quantum memory'],type:'journal-article'}]}}));
  return new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>{cancelled=true;reject(options.signal.reason)},{once:true})});
 },{timeout:100});
 assert.equal(result.papers[0].title,'Quantum memory');assert.ok(result.unavailable.includes('openalex'));assert.equal(cancelled,true);assert.ok(Date.now()-start<2000);
});
test('Crossref figure and dataset records do not masquerade as research papers',async()=>{
 const {parseCrossref}=await import('../server/crossref.mjs');
 const items=['component','dataset','journal-article','posted-content'].map(type=>({type,DOI:'10.1234/'+type,title:[type]}));
 assert.deepEqual(parseCrossref({message:{items}}).map(x=>x.type),['journal-article','posted-content']);
});

test('pasted arXiv URLs and DOIs resolve exact repository metadata rather than keyword lookalikes',async()=>{
 const {searchIndexes}=await import('../server/research-indexes.mjs');const {arxivIn}=await import('../server/research-ranking.mjs');
 assert.equal(arxivIn('https://arxiv.org/pdf/2205.01833v2.pdf'),'2205.01833v2');
 const result=await searchIndexes({q:'10.48550/arXiv.2205.01833'},async url=>{assert.equal(url,'https://arxiv.org/abs/2205.01833');return Buffer.from('<meta name="citation_title" content="Actual title"><meta name="citation_author" content="A. Author"><meta name="citation_arxiv_id" content="2205.01833"><meta name="citation_date" content="2022/05/04">')});
 assert.equal(result.papers.length,1);assert.equal(result.papers[0].title,'Actual title');assert.equal(result.papers[0].pdfUrl,'https://arxiv.org/pdf/2205.01833');
});
test('unknown DOI never returns papers that merely mention it in their abstracts',async()=>{
 const {searchIndexes}=await import('../server/research-indexes.mjs');
 const result=await searchIndexes({q:'10.1234/unknown'},async url=>Buffer.from(JSON.stringify(url.includes('crossref')?{message:{DOI:'10.1234/lookalike',title:['Unrelated']}}:{id:'https://openalex.org/W9',doi:'https://doi.org/10.1234/lookalike',title:'Unrelated'})));
 assert.deepEqual(result.papers,[]);
});

test('versioned arXiv links accept canonical citation IDs only with the requested version on the page',async()=>{
 const {queryArxivExact}=await import('../server/research-indexes.mjs');
 const html='<meta name="citation_arxiv_id" content="2205.01833"><meta name="citation_title" content="Exact paper"><strong>arXiv:2205.01833v2</strong>';
 const result=await queryArxivExact('2205.01833v2',async()=>Buffer.from(html));assert.equal(result.papers[0].pdfUrl,'https://arxiv.org/pdf/2205.01833v2');
 await assert.rejects(queryArxivExact('2205.01833v1',async()=>Buffer.from(html)),/different paper/);
});

test('unversioned arXiv search retains the observed revision for exact transcript reuse',async()=>{
 const {queryArxivExact}=await import('../server/research-indexes.mjs');
 const r=await queryArxivExact('2205.01833',async()=>Buffer.from('<meta name="citation_arxiv_id" content="2205.01833"><meta name="citation_title" content="Paper"><meta property="og:url" content="https://arxiv.org/abs/2205.01833v2">'));
 assert.equal(r.papers[0].source,'https://arxiv.org/abs/2205.01833v2');assert.equal(r.papers[0].pdfUrl,'https://arxiv.org/pdf/2205.01833v2');
});

test('an exact arXiv revision does not open a different cached revision',async()=>{
 const f=fixture();try{
 f.store.savePaper({...makePaper({id:randomUUID(),owner:'owner',title:'Existing paper',source:'https://arxiv.org/abs/2205.01833v2',mmd:'Version two'}),visibility:'public'});
 const d=createDiscovery(f.store,{search:async()=>({papers:[],nextPage:null})});
 assert.equal((await d.find({q:'https://arxiv.org/abs/2205.01833v1'})).papers.length,0);
 assert.equal((await d.find({q:'https://arxiv.org/abs/2205.01833v2'})).papers.length,1);
 }finally{f.close()}
});

test('unknown exact identifiers return no match rather than a misleading provider outage',async()=>{
 const {searchIndexes}=await import('../server/research-indexes.mjs');
 for(const q of ['10.1234/nonexistent','arxiv:9999.99999']){
 const result=await searchIndexes({q},async()=>{const e=Error('HTTP 404');e.upstreamStatus=404;throw e});assert.deepEqual(result.papers,[]);assert.deepEqual(result.unavailable,[]);
 }
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {Store} from '../server/store.mjs';
import {makePaper} from '../server/domain.mjs';
import {createApp} from '../server/app.mjs';
import {requestSharing} from '../server/sharing.mjs';
import {sharingConsent} from '../server/sharing-consent.mjs';
import {createPublicationReview} from '../server/publication-review.mjs';
import {extractWebArticle,convertWebArticle,readableWebMarkdown} from '../server/web-article.mjs';
import {downloadPaperPDF} from '../server/paper-download.mjs';
import {compactChatHistory} from '../server/chat-context.mjs';
const paragraph='Measurements reveal reproducible optical signals across repeated imaging experiments. The samples were calibrated against an independent reference and the experimental uncertainties were reported for every condition. ';
const html=`<html><head><meta name="citation_title" content="Optical event microscopy"><link rel="license" href="https://creativecommons.org/licenses/by/4.0/"></head><body><nav>Account sign in</nav><article><h1>Optical event microscopy</h1><h2 class="ltx_title" id="methods"><span class="ltx_tag">1 </span>Methods</h2>${Array.from({length:12},()=>'<p>'+paragraph+'</p>').join('')}<p>Equation <math><semantics><mrow><mi>E</mi><mo>=</mo><mi>m</mi><msup><mi>c</mi><mn>2</mn></msup></mrow><annotation encoding="application/x-tex">E=mc^2</annotation></semantics></math></p><figure><img src="/images/figure.png" alt="Optical setup"><figcaption>Figure 1. Measured optical setup.</figcaption></figure><table><caption>Table 1. Measurements</caption><tr><th>Sample</th><th>Signal</th></tr><tr><td>A</td><td>42</td></tr></table><script>process.exit(1)</script></article></body></html>`;

test('full-text HTML preserves equations, tables, captions and locally cached figures without executing scripts',async()=>{
 const article=extractWebArticle(html,'https://example.org/article',{title:'Optical event microscopy',doi:'10.1234/example'});assert.ok(article);assert.equal(article.license,'CC-BY-4.0');assert.doesNotMatch(article.renderHTML,/<script|Account sign in/);
 const image=await sharp({create:{width:40,height:30,channels:3,background:'#abcdef'}}).png().toBuffer();let calls=0;
 const converted=await convertWebArticle(article,{pandoc:process.env.ONLYIDEAS_TEST_PANDOC||'pandoc',download:async url=>{calls++;assert.equal(url,'https://example.org/images/figure.png');return image}});
 assert.match(converted.mmd,/E\s*=\s*m\s*c\^/);assert.match(converted.mmd,/Figure 1/);assert.match(converted.mmd,/Table 1/);assert.match(converted.mmd,/42/);assert.match(converted.mmd,/figures\/[a-f\d]+\.png/);assert.equal(converted.assets.length,1);assert.equal(calls,1);assert.doesNotMatch(converted.mmd,/:::|\{[.#]ltx_|\{#methods/);assert.match(converted.mmd,/\|.*Sample.*Signal.*\|/);
});
test('HTML alternatives reject abstract-only, blocked pages and wrong-paper identity; full text skips PDF download',async()=>{
 assert.equal(extractWebArticle('<article><h1>Abstract</h1><p>'+paragraph+'</p></article>','https://example.org/'),null);
 assert.equal(extractWebArticle(html,'https://example.org/',{doi:'10.1234/no',title:'Unrelated economic stock market history'}),null);
 let calls=[];const result=await downloadPaperPDF({url:'https://example.org/full',metadata:{title:'Optical event microscopy'}},{allowHTML:true,download:async url=>{calls.push(url);return {bytes:Buffer.from(html),url}}});assert.equal(result.format,'html');assert.equal(calls.length,1);
 const broken=extractWebArticle(html,'https://example.org/');await assert.rejects(()=>convertWebArticle(broken,{download:async()=>Buffer.from('<html>Access denied</html>')}),/unsupported|format|Input buffer/i);
});
test('chat context is bounded and keeps recent exact paper references while compacting old abstracts',()=>{
 const rows=Array.from({length:100},(_,i)=>({role:i%2?'assistant':'user',text:'text '.repeat(3000),papers:i%2?[{id:'paper-'+i,title:'Research '+i,summary:'abstract '.repeat(3000)}]:[]}));
 const compact=compactChatHistory(rows);assert.ok(JSON.stringify(compact).length<=18100);assert.equal(compact.at(-1).papers[0].id,'paper-99');assert.ok(compact.length<=16);assert.ok(compact.some(m=>m.text.includes('abbreviated')));
});
test('confirmed new uploads share immediately, reviews can withdraw them, and cached permission is rechecked',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'onlyideas-refresh-')),store=new Store(dir),config={origin:'http://127.0.0.1:4182',publicationReviewers:['admin']};const app=createApp(store,config,{worker:false});await new Promise(r=>app.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.address().port;
 try{
  const p=makePaper({id:randomUUID(),owner:'uploader',title:'Original optics paper',mmd:'# Original\n\nOriginal text.'});store.savePaper(p);
  assert.equal(sharingConsent({license:'CC-BY-4.0',attestation:true},'private'),null);assert.throws(()=>sharingConsent({license:'private',attestation:true},'shared'),/license/);
  const j=requestSharing(store,p,'shared',sharingConsent({license:'author-permission',attestation:true},'shared'));assert.equal(p.visibility,'public');assert.equal(j.state,'awaiting_review');
  const first=await fetch(base+'/api/papers/'+p.id);assert.equal(first.status,200);const tag=first.headers.get('etag');assert.ok(tag);await first.text();
  const same=await fetch(base+'/api/papers/'+p.id,{headers:{'If-None-Match':tag}});assert.equal(same.status,304);assert.equal(await same.text(),'');
  p.title='Updated optics paper';store.savePaper(p);const changed=await fetch(base+'/api/papers/'+p.id,{headers:{'If-None-Match':tag}});assert.equal(changed.status,200);assert.notEqual(changed.headers.get('etag'),tag);await changed.text();
  const reviewer=createPublicationReview(store,config),admin={id:'admin'};const entry=reviewer.list(admin).items[0];assert.equal(entry.paper.id,p.id);
  reviewer.decide(admin,{action:'reject',reason:'Removed on owner request pending clarification.',items:[{id:entry.id,token:entry.token}]});assert.equal(store.paper(p.id).visibility,'private');
  const denied=await fetch(base+'/api/papers/'+p.id,{headers:{'If-None-Match':tag}});assert.equal(denied.status,404);assert.equal(denied.headers.get('etag'),null);
  const privatePaper=makePaper({id:randomUUID(),owner:'uploader',title:'Personal notes',mmd:'Private notes'});store.savePaper(privatePaper);requestSharing(store,privatePaper,'private',{license:'author-permission',attestation:true});assert.equal(privatePaper.visibility,'private');
 }finally{await new Promise(r=>app.close(r));store.close();rmSync(dir,{recursive:true,force:true})}
});

test('HTML citation brackets cannot become display equations and real TeX stays intact',()=>{
 const source=String.raw`Citations \[[1](https://example.org/ref)\] and $\left[x\right]$; display $$a=\left[b\right]$$.`;
 const out=readableWebMarkdown(source);assert.ok(out.includes('&#91;[1](https://example.org/ref)&#93;'));assert.ok(out.includes(String.raw`$\left[x\right]$`));assert.ok(out.includes(String.raw`$$a=\left[b\right]$$`));
});

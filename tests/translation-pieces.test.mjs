import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.mjs';import {makePaper} from '../server/domain.mjs';import {requestArtifact,visibleArtifacts,translationChunks} from '../server/artifacts.mjs';import {generateArtifact} from '../server/providers.mjs';import {paperSegments} from '../server/translation-pieces.mjs';
const config={model:{name:'test',url:'https://model.test/chat'}};
function fixture(){const dir=mkdtempSync(join(tmpdir(),'oi-pieces-')),store=new Store(dir);const paper=store.savePaper({...makePaper({id:randomUUID(),owner:'author',title:'Physics',mmd:'# Physics\n\nThe energy is $E=mc^2$. This second sentence keeps its figure.\n\n![Experiment](figures/a.png)\n\nAnother paragraph about the experiment.'}),visibility:'public'});return {store,paper,close(){store.close();rmSync(dir,{recursive:true,force:true})}}}
const echo=async(u,o)=>({choices:[{message:{content:JSON.parse(o.body).messages.at(-1).content}}]});
test('Mathpix captions translate prose while retaining figure, TeX commands and nested metadata',()=>{
 const source=String.raw`\begin{figure}
\includegraphics[width=300pt]{figures/physics.png}
\captionsetup{labelformat=empty}
\caption{The \textbf{energy} is \(E=mc^2\).}
\end{figure}

\footnotetext{Author \textsuperscript{1} and affiliation.}`;
 const protectedSource=translationChunks(source),input=protectedSource.chunks.join('');
 assert.ok(input.includes('The '));assert.ok(input.includes('energy'));
 assert.ok(!/[\\{}]/.test(input));assert.ok(!input.includes('figures/physics.png'));assert.ok(!input.includes('affiliation'));
 const output=protectedSource.restore(input.replace('The ','この ').replace('energy','エネルギー'),input);
 assert.equal(output,source.replace('The ','この ').replace('energy','エネルギー'));
 assert.equal(paperSegments(source).map(p=>p.text).join(''),source);
});
test('paragraphs and sentences reconstruct original math/figures and full translations reuse sentence requests',async()=>{
 const f=fixture();try{const units=paperSegments(f.paper.mmd);assert.equal(units.map(p=>p.text).join(''),f.paper.mmd);assert.equal(units.flatMap(p=>p.sentences).map(s=>s.text).join(''),f.paper.mmd);
 const sentence=units.find(p=>p.text.startsWith('The energy')).sentences[0];let j=requestArtifact(f.store,config,{id:'first'},f.paper,{kind:'translation',language:'ja',segmentId:sentence.id});await generateArtifact(j,config,f.store,echo);
 const cached=f.store.db.prepare('SELECT key,body FROM translation_pieces').all();let sent=[];j=requestArtifact(f.store,config,{id:'second'},f.paper,{kind:'translation',language:'ja'});await generateArtifact(j,config,f.store,async(u,o)=>{sent.push(JSON.parse(o.body).messages.at(-1).content);return echo(u,o)});
 for(const c of cached)assert.deepEqual(f.store.db.prepare('SELECT key,body FROM translation_pieces WHERE key=?').get(c.key),c);
 assert.ok(!sent.some(text=>text.includes('The energy')));const full=visibleArtifacts(f.store,f.paper,null).find(a=>!a.segmentId);assert.equal(full.text,f.paper.mmd);
 const paragraph=units.find(p=>p.text.startsWith('The energy'));j=requestArtifact(f.store,config,{id:'third'},f.paper,{kind:'translation',language:'ja',segmentId:paragraph.id});await generateArtifact(j,config,f.store,async()=>{throw Error('Already translated; no model request allowed')});
 assert.equal(visibleArtifacts(f.store,f.paper,null).find(a=>a.segmentId===paragraph.id).text,paragraph.text);
 }finally{f.close()}
});
test('a model dropping math markers falls back to prose-only translation with original math retained',async()=>{const f=fixture();try{const j=requestArtifact(f.store,config,{id:'reader'},f.paper,{kind:'translation',language:'zh-Hans'});let fallback=0;await generateArtifact(j,config,f.store,async(u,o)=>{const input=JSON.parse(o.body).messages.at(-1).content;if(input.startsWith('['))return {choices:[{message:{content:JSON.stringify(JSON.parse(input).map(x=>({...x,text:x.text.replace(/⟦OI[^⟧]+⟧/g,'')})))}}]};fallback++;assert.ok(!input.includes('⟦OI'));return {choices:[{message:{content:input}}]}});const text=visibleArtifacts(f.store,f.paper,null)[0].text;assert.ok(fallback>0);assert.ok(text.includes('$E=mc^2$'));assert.ok(text.includes('![Experiment](figures/a.png)'));}finally{f.close()}});

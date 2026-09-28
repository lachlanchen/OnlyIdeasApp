import {test} from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import{readFileSync,mkdtempSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{buildSync}from'esbuild';
import{Store}from'../server/store.mjs';import{makePaper}from'../server/domain.mjs';import{readingView}from'../server/translation-pieces.mjs';import{requestArtifact}from'../server/artifacts.mjs';import{generateArtifact}from'../server/providers.mjs';
test('interlaced whole-document rendering keeps math, figure paths, source discussion anchors and safe links',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'oi-parallel-')),store=new Store(dir),dom=new JSDOM('<!doctype html>',{runScripts:'outside-only'});
 try{
  const mmd=String.raw`\title{Source paper}

Original prose about the energy $E=mc^2$. Another original sentence describes the experiment in enough detail for discussion.

\begin{equation}
y=x+1
\end{equation}

Original final paragraph with a figure.

![Figure](figures/a.png)

\begin{figure}
\includegraphics{figures/b.png}
\caption{Original caption of the experiment.}
\end{figure}`;
  const paper=store.savePaper({...makePaper({id:'paired-paper',owner:'owner',title:'Source paper',mmd}),visibility:'public'}),config={model:{name:'fixture',url:'https://model.invalid'}};
  const job=requestArtifact(store,config,{id:'reader'},paper,{kind:'translation',language:'zh-Hans'});
  await generateArtifact(job,config,store,async(u,o)=>({choices:[{message:{content:JSON.stringify(JSON.parse(JSON.parse(o.body).messages.at(-1).content).map(x=>({...x,text:x.text.replaceAll('Original','中文')})))}}]}));
  const view=readingView(store,paper,null,'zh-Hans');assert.equal(view.complete,true);
  dom.window.eval(readFileSync('.generated/document-math.js','utf8'));
  const bundle=buildSync({stdin:{contents:"export * from './src/parallel-reader';export * from './src/paragraphs'",resolveDir:process.cwd()},bundle:true,format:'iife',globalName:'Reader',loader:{'.css':'empty'},write:false}).outputFiles[0].text;
  dom.window.eval(bundle+';window.Reader=Reader');const {Reader}=dom.window,root=dom.window.document.createElement('article');dom.window.document.body.append(root);
  const render=text=>dom.window.markdownToHTML(text,{htmlTags:false,lineNumbering:true,accessibility:{assistiveMml:true},outMath:{include_svg:true}});
  root.innerHTML=Reader.cleanDocument(render(mmd));let clicked;
  Reader.paragraphActions(root,'Discuss',(quote,id)=>clicked={quote,id});const anchors=[...root.querySelectorAll('[data-paragraph]')].map(n=>n.dataset.paragraph);
  Reader.pairReading(root,view,render,{source:'English',translation:'中文 · AI',partial:'Partial'});
  assert.ok(root.querySelectorAll('.reading-pair').length>=2);assert.match(root.textContent,/中文/);
  assert.deepEqual([...root.querySelectorAll('[data-paragraph]')].map(n=>n.dataset.paragraph),anchors);
  root.querySelector('.reading-pair-actions button').click();assert.ok(anchors.includes(clicked.id));assert.match(clicked.quote,/Original/);
  assert.equal(root.querySelectorAll('img:not(.reading-repeated-visual)').length,2);
  assert.equal(root.querySelectorAll('.reading-repeated-visual').length,1);
  assert.ok(root.querySelector('mjx-container'));
  Reader.readingMode(root,'translation');assert.equal(root.dataset.readingMode,'translation');Reader.readingMode(root,'interlaced');assert.equal(root.dataset.readingMode,'interlaced');
  assert.ok(!root.querySelector('script,iframe'));const ids=[...root.querySelectorAll('[id]')].map(n=>n.id);assert.equal(new Set(ids).size,ids.length);
 }finally{dom.window.close();store.close();rmSync(dir,{recursive:true,force:true})}
});

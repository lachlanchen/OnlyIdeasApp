import {test} from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {buildSync} from 'esbuild';
test('Watch editions preserve short CJK prose, language order and source isolation without actions or math',()=>{
 const dom=new JSDOM('<!doctype html>',{runScripts:'outside-only'});dom.window.TextEncoder=TextEncoder;
 try{
 dom.window.eval(buildSync({entryPoints:['src/watch-prose.ts'],bundle:true,format:'iife',globalName:'Watch',write:false}).outputFiles[0].text+';window.Watch=Watch');
 const root=dom.window.document.createElement('article');root.innerHTML='<div class="author">Author</div><div class="reading-pair"><div class="reading-source" lang="en"><div class="reading-language-label">English</div><p>Short original.</p></div><div class="reading-translation" lang="zh-Hans"><div class="reading-language-label">中文</div><p>简短译文。</p><div class="reading-language-label reading-partial">Missing pieces</div></div><div class="reading-pair-actions"><button>Discuss</button></div></div><div><mjx-container><svg></svg></mjx-container></div><p>After math.</p>';
 const result=dom.window.Watch.watchEditions(root);
 assert.equal(result.original,'Short original.');assert.equal(result.translation,'简短译文。');assert.equal(result.interlaced,'[en] Short original.\n\n[zh-Hans] 简短译文。');
 root.innerHTML='<p>Only original.</p>';assert.equal(dom.window.Watch.watchEditions(root).translation,'');
 root.innerHTML='<p>'+ '文'.repeat(6000)+'</p>';assert.equal(dom.window.Watch.watchEditions(root).original,'');
 }finally{dom.window.close()}
});

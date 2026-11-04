import{test}from'node:test';import assert from'node:assert/strict';import{build}from'esbuild';import{JSDOM}from'jsdom';
test('translation DOM replacement restores the same source passage rather than its old pixel offset',async()=>{
 const dom=new JSDOM('<main id="paper"><p data_line_start="10">Original</p></main>',{runScripts:'outside-only'}),w=dom.window;
 try{Object.defineProperty(w.document,'scrollingElement',{value:w.document.documentElement});w.document.documentElement.scrollTop=500;
 const bundle=await build({stdin:{contents:"export{captureReadingPosition}from'./src/reading-viewport'",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'Positions'});w.eval(bundle.outputFiles[0].text);
 const root=w.document.getElementById('paper');root.firstChild.getBoundingClientRect=()=>({top:-88,bottom:112,height:200});const restore=w.Positions.captureReadingPosition(root);
 root.innerHTML='<div class="reading-pair" data-passage="same"><div class="reading-source"><p data_line_start="10">Original</p></div><div class="reading-translation">Translated</div></div>';
 const pair=root.firstChild;pair.getBoundingClientRect=()=>({top:212,bottom:612,height:400});pair.querySelector('p').getBoundingClientRect=()=>({height:0});restore();assert.equal(w.document.documentElement.scrollTop,900);
 const again=w.Positions.captureReadingPosition(root);root.innerHTML='<div class="reading-pair" data-passage="same">Updated</div>';root.firstChild.getBoundingClientRect=()=>({top:312,bottom:712,height:400});again();assert.equal(w.document.documentElement.scrollTop,1000);
 w.document.documentElement.scrollTop=0;const start=w.Positions.captureReadingPosition(root);w.document.documentElement.scrollTop=300;start();assert.equal(w.document.documentElement.scrollTop,0);
 }finally{w.close()}
})

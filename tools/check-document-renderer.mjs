import {JSDOM} from 'jsdom'
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import { buildSync } from 'esbuild'
const dom = new JSDOM('<!doctype html>',{runScripts:'outside-only'})
try {
 dom.window.eval(readFileSync('.generated/document-math.js','utf8'))
 const input=String.raw`# Reading check

\[E=mc^2\]

| x | y |
|---|---|
| 2 | 4 |

![Figure](figures/fixture.png)

<script>window.injection=1</script>`
 const html=dom.window.markdownToHTML(input,{htmlTags:false,linkify:false,typographer:false,accessibility:{assistiveMml:true},outMath:{include_svg:true}})
 assert.match(html, /mjx-container/);assert.match(html,/<table/);assert.match(html,/figures\/fixture.png/);assert.doesNotMatch(html,/<script>/)
 dom.window.TextEncoder=TextEncoder
 dom.window.eval(buildSync({entryPoints:['src/watch-prose.ts'],bundle:true,format:'iife',globalName:'WatchProse',write:false}).outputFiles[0].text+';window.WatchProse=WatchProse;')
 const article=dom.window.document.createElement('article')
 const prose='This is a real paragraph of readable research prose, sufficiently long to be useful on a small watch display.'
 article.innerHTML=`<div class="author">${prose}</div><div>${prose}<button class="paragraph-comment"><svg></svg>Discuss paragraph</button></div><div><mjx-container><svg></svg></mjx-container></div><div>Should stop before this subsequent text. ${prose}</div>`
 assert.equal(dom.window.WatchProse.watchProse(article),prose)
 article.innerHTML=`<div>${prose}<img src="data:image/png;base64,AAAA"></div><div>${prose}</div>`
 assert.equal(dom.window.WatchProse.watchProse(article),prose)
 article.innerHTML=Array.from({length:100},()=>`<div>${'文'.repeat(150)}</div>`).join('')
 assert.ok(new TextEncoder().encode(dom.window.WatchProse.watchProse(article)).length<=12000)
 assert.ok(dom.window.WatchProse.watchProse(article).split('\n\n').length<=24)
 console.log('Watch prose: author/action exclusion, math/figure boundaries, Unicode and block limits passed.')
 console.log('Compiled browser renderer: equation, table, figure and HTML escaping passed.')
}finally{dom.window.close()}

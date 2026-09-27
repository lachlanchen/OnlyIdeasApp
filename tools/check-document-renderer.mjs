import {JSDOM} from 'jsdom'
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
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
 console.log('Compiled browser renderer: equation, table, figure and HTML escaping passed.')
}finally{dom.window.close()}

import { build } from 'esbuild'
import assert from 'node:assert/strict'
import { writeFile, mkdir } from 'node:fs/promises'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const source = process.argv[2] || 'src/reading-viewport.ts'
const output = process.argv[3] || '.runtime/compatibility-20261018'
await mkdir(output, { recursive: true })
const bundle = await build({ entryPoints: [source], bundle: true, write: false, format: 'iife', globalName: 'ReadingViewport', target: 'safari15' })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true })
const checks = []
try {
  for (const documentScroll of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;font:18px/1.7 sans-serif}#scroller{${documentScroll ? '' : 'height:80vh;overflow:auto;'}padding:12px 18px}article{max-width:820px;margin:auto}p{margin:0 0 28px}textarea{width:100%;height:50px}rt{font-size:.5em}</style><textarea id="draft">Unsent draft — 未送信のメモ</textarea><div id="scroller"><article>${Array.from({length:70},(_,i)=>`<p data-passage="${i}"><ruby>日本語<rt>にほんご</rt></ruby> ${('Reading and translation stay together. 原文和翻译一起阅读。 ').repeat(8)}</p>`).join('')}</article></div>`)
    await page.addScriptTag({ content: bundle.outputFiles[0].text })
    await page.evaluate(documentScroll => {
      window.testScroller = documentScroll ? document.scrollingElement : document.getElementById('scroller')
      window.stopReadingViewport = ReadingViewport.preserveReadingViewport(window.testScroller, document.querySelector('article'), '[data-passage]')
      const node = document.querySelector('[data-passage="20"]')
      const edge = documentScroll ? 0 : window.testScroller.getBoundingClientRect().top
      window.testScroller.scrollTop += node.getBoundingClientRect().top - edge + node.getBoundingClientRect().height * .3 - 12
    }, documentScroll)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const point = () => page.evaluate(documentScroll => {
      const edge = (documentScroll ? 0 : window.testScroller.getBoundingClientRect().top) + 12
      const node = [...document.querySelectorAll('[data-passage]')].find(n => n.getBoundingClientRect().bottom > edge)
      const rect = node.getBoundingClientRect()
      return { passage: node.dataset.passage, fraction: (edge - rect.top) / rect.height, draft: document.getElementById('draft').value, fits: document.documentElement.scrollWidth <= innerWidth + 1 }
    }, documentScroll)
    const before = await point()
    for (const [width,height] of [[844,390],[760,800],[320,640],[1024,768],[390,844]]) {
      await page.setViewportSize({width,height}); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      const after = await point()
      assert.equal(after.passage,before.passage,`${documentScroll ? 'document' : 'element'} passage at ${width}`)
      assert.ok(Math.abs(after.fraction-before.fraction)<.03,`within-passage position at ${width}: ${JSON.stringify(after)}`)
      assert.equal(after.draft,before.draft); assert.ok(after.fits)
      checks.push(`${documentScroll ? 'document' : 'element'} ${width}x${height}: passage, draft and width preserved`)
    }
    await page.screenshot({ path: `${output}/viewport-${documentScroll ? 'document' : 'element'}.png` })
    await page.evaluate(()=>window.stopReadingViewport())
    await page.close()
  }
  await writeFile(`${output}/viewport-result.json`, JSON.stringify({ source, checks, evidence:'Chromium responsive fixture; not an iPhone Duo simulator or Monterey runtime test' },null,2)+'\n')
  console.log(JSON.stringify({passed:checks.length,source}))
} finally { await browser.close() }

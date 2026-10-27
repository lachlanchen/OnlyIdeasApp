import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const [scrollSource = 'src/reading-viewport.ts', composerSource = 'src/composer-viewport.ts', output = '.runtime/adaptive-chat'] = process.argv.slice(2)
await mkdir(output, { recursive: true })
const bundle = await build({ stdin: { contents: `export { preserveReadingViewport } from './${scrollSource}'; export { observeComposer } from './${composerSource}'`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'Adaptive', target: 'safari15' })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true })
const checks = []
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setContent(`<style>
    *{box-sizing:border-box}body{margin:0;font:18px/1.6 sans-serif}
    main{height:100vh;display:flex;flex-direction:column;padding:0 var(--right,12px) 0 var(--left,12px)}
    header{flex-shrink:0;min-height:44px}#scroller{flex:1;min-height:0;overflow:auto;overflow-anchor:none}
    #contents{display:flow-root}.message{margin:12px 0 28px;padding:12px;border:1px solid #aaa;border-radius:16px;overflow-wrap:anywhere}
    form{display:flex;flex-shrink:0;align-items:flex-end;gap:6px;padding:8px 0}textarea{flex:1;width:0;min-width:0;resize:none;font:16px/24px sans-serif;padding:10px 0;min-height:44px;border:0}button{width:44px;height:44px;flex-shrink:0}
  </style><main><header>Reading conversation · 阅读对话</header><div id="scroller"><div id="contents">${Array.from({ length: 40 }, (_, i) => `<article class="message" data-message="${i}">${i} ${('A saved question and its answer. 阅读同一个段落。 ').repeat(14)}</article>`).join('')}</div></div><form><button type="button">@</button><textarea aria-label="Draft">An unsent question with enough detail to wrap when the reading pane becomes narrow.</textarea><button type="submit">↑</button></form></main>`)
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  await page.evaluate(() => {
    window.follow = false; window.sends = 0
    document.querySelector('form').addEventListener('submit', event => { event.preventDefault(); window.sends++ })
    window.stopViewport = Adaptive.preserveReadingViewport(document.querySelector('#scroller'), document.querySelector('#contents'), '.message', { followEnd: () => window.follow })
    window.stopComposer = Adaptive.observeComposer(document.querySelector('textarea'))
  })
  const settle = () => page.evaluate(() => new Promise((resolve, reject) => {
    let previous = '', stable = 0, frames = 0
    const sample = () => {
      const scroll = document.querySelector('#scroller'), editor = document.querySelector('textarea')
      const current = [innerWidth, innerHeight, scroll.clientWidth, scroll.clientHeight, scroll.scrollTop, scroll.scrollHeight, editor.clientHeight].join(':')
      stable = current === previous ? stable + 1 : 0; previous = current
      if (stable >= 4) resolve(null)
      else if (++frames >= 60) reject(new Error('Layout did not settle'))
      else requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  }))
  await settle()
  await page.evaluate(() => {
    const scroll = document.querySelector('#scroller'), node = document.querySelector('[data-message="17"]')
    scroll.scrollTop += node.getBoundingClientRect().top - scroll.getBoundingClientRect().top + node.clientHeight * .4 - 12
    document.querySelector('textarea').setSelectionRange(8, 18)
  })
  await settle()
  const snapshot = () => page.evaluate(() => {
    const scroll = document.querySelector('#scroller'), edge = scroll.getBoundingClientRect().top + 12
    const node = [...document.querySelectorAll('.message')].find(n => n.getBoundingClientRect().bottom > edge)
    const rect = node.getBoundingClientRect(), editor = document.querySelector('textarea')
    return { id: node.dataset.message, fraction: (edge - rect.top) / rect.height, draft: editor.value, selection: [editor.selectionStart, editor.selectionEnd], editorHeight: editor.clientHeight, fits: document.documentElement.scrollWidth <= innerWidth, end: scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight, sends: window.sends }
  })
  const before = await snapshot()
  for (const [width, height, left, right] of [[780,720,12,58],[390,720,58,12],[720,390,12,72],[320,360,0,28],[1024,768,76,12],[390,844,12,12]]) {
    await page.evaluate(([left,right]) => { document.body.style.setProperty('--left', `${left}px`); document.body.style.setProperty('--right', `${right}px`) }, [left,right])
    await page.setViewportSize({ width, height }); await settle()
    const after = await snapshot()
    assert.equal(after.id, before.id, `reading message at ${width}x${height}`)
    assert.ok(Math.abs(after.fraction - before.fraction) < .035, JSON.stringify({ before, after, width }))
    assert.equal(after.draft, before.draft); assert.deepEqual(after.selection, before.selection)
    assert.ok(after.fits); assert.ok(after.editorHeight <= Math.max(44, height * .28) + 1); assert.equal(after.sends, 0)
    checks.push(`Earlier message, draft and selection retained at ${width}x${height}, insets ${left}/${right}`)
  }
  await page.evaluate(() => { document.querySelector('main').style.display = 'none' })
  await settle()
  await page.setViewportSize({ width: 760, height: 720 })
  await page.evaluate(() => { document.querySelector('main').style.display = '' })
  await settle()
  const restored = await snapshot()
  assert.equal(restored.id, before.id)
  assert.ok(Math.abs(restored.fraction - before.fraction) < .035)
  assert.equal(restored.draft, before.draft)
  checks.push('Temporary zero-size pane preserves the last visible message and draft')
  await page.evaluate(() => { window.follow = true; const scroll = document.querySelector('#scroller'); scroll.scrollTop = scroll.scrollHeight })
  await settle()
  for (const [width, height] of [[760,720],[320,360],[390,844]]) {
    await page.setViewportSize({ width, height }); await settle()
    const after = await snapshot()
    assert.ok(after.end < 2, `follow latest at ${width}x${height}: ${JSON.stringify(after)}`)
    checks.push(`Latest message stays above composer at ${width}x${height}`)
  }
  await page.evaluate(() => { const message = document.createElement('article'); message.className = 'message'; message.dataset.message = '40'; message.textContent = 'A new answer after resizing.'; document.querySelector('#contents').append(message) })
  await settle(); assert.ok((await snapshot()).end < 2)
  checks.push('New answer remains visible after resizing; no submission triggered')
  assert.deepEqual(errors, [])
  await page.screenshot({ path: `${output}/chat-narrow.png` })
  await page.evaluate(() => { window.stopViewport(); window.stopComposer() })
  await writeFile(`${output}/result.json`, JSON.stringify({ checks, scrollSource, composerSource, evidence: 'Chromium synthetic resize/keyboard-height fixture; not iPhone Duo runtime qualification' }, null, 2) + '\n')
  console.log(JSON.stringify({ passed: checks.length, output }))
} finally { await browser.close() }

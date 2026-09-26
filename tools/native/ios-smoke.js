(async () => {
  const report = { platform: window.Capacitor?.getPlatform(), checks: [] };
  const wait = async (fn, label) => { const until = Date.now() + 90000; while (!fn()) { if (Date.now() > until) throw new Error('Timed out: ' + label); await new Promise(r => setTimeout(r, 250)); } };
  const button = text => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === text);
  const check = (label, ok) => { if (!ok) throw new Error(label); report.checks.push(label); };
  try {
    await wait(() => button('Open paper'), 'library');
    check('native iOS bridge', report.platform === 'ios');
    check('library fits viewport', document.documentElement.scrollWidth <= innerWidth + 1);
    const offline = !!document.querySelector('.connection-notice');
    button('Open paper').click();
    await wait(() => document.querySelector('.paper-content mjx-container') && [...document.querySelectorAll('.paper-content img')].some(i => i.complete && i.naturalWidth > 0), 'equation and figure');
    check('equations rendered', !!document.querySelector('.paper-content mjx-container svg'));
    check('figure preserved', [...document.querySelectorAll('.paper-content img')].every(i => i.complete && i.naturalWidth > 0));
    check('reader fits viewport', document.documentElement.scrollWidth <= innerWidth + 1);
    const before = parseFloat(getComputedStyle(document.querySelector('.paper-content')).fontSize);
    document.querySelector('[aria-label="Increase text size"]').click();
    await wait(() => parseFloat(getComputedStyle(document.querySelector('.paper-content')).fontSize) > before, 'text sizing');
    check('reader text control', true);
    if (!offline && button('Read offline')) { button('Read offline').click(); await wait(() => button('Downloaded · Remove'), 'offline download'); }
    check(offline ? 'download survives a disconnected cold launch' : 'paper and figures downloaded', !!button('Downloaded · Remove'));
    document.querySelector('[aria-label="Toggle discussion panel"]').click();
    await wait(() => document.querySelector('.reading-panel'), 'discussion panel');
    check('native discussion panel', true);
    document.querySelector('[aria-label="Close reading panel"]').click();
    report.ok = true;
  } catch (e) { report.ok = false; report.error = e.message; }
  window.__onlyideasSmoke = report;
})();

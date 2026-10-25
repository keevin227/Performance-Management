/* Screenshot every slide and step of the deck for visual review.
 *   cd site && python3 -m http.server 8770 &
 *   node scripts/screenshot.cjs [outDir] [slides e.g. 1,3,5]
 * Uses the preinstalled Playwright/Chromium. Writes sNN_step.png files. */
const { chromium } = require('playwright');
const out = process.argv[2] || 'shots';
const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
(async () => {
  require('fs').mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://127.0.0.1:8770/#1'); await p.waitForTimeout(1500);
  const n = await p.evaluate(() => Deck.slides.length);
  for (let i = 0; i < n; i++) {
    if (only && !only.includes(i + 1)) continue;
    const steps = await p.evaluate(i => { const s = Deck.slides[i]; return Math.max(+s.dataset.steps || 0, ...[...s.querySelectorAll('[data-f]')].map(e => +e.dataset.f)); }, i);
    for (let st = 0; st <= steps; st++) {
      await p.evaluate(([i, st]) => Deck.go(i, st), [i, st]);
      await p.waitForTimeout(st === 0 ? 4500 : 2600);
      await p.screenshot({ path: `${out}/s${String(i + 1).padStart(2, '0')}_${st}.png` });
    }
  }
  console.log('errors:', errs);
  await b.close();
})();

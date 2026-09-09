const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
const urls = [...new Set([...source.matchAll(/source: '(\/videos\/cat\/transparent-v3\/[^']+)'/g)].map(match => match[1]))];
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:5238/');
    const results = [];
    for (const url of urls) {
      const result = await page.evaluate(async url => {
        const video = document.createElement('video');
        video.muted = true;
        await new Promise((resolve, reject) => { video.onloadeddata = resolve; video.onerror = reject; video.src = url; });
        await new Promise((resolve, reject) => { video.requestVideoFrameCallback(resolve); video.play().catch(reject); });
        video.pause();
        const c = document.createElement('canvas'); c.width = 942; c.height = 1672;
        const ctx = c.getContext('2d'); ctx.drawImage(video, 0, 0);
        const pixels = ctx.getImageData(0, 0, 942, 1672).data;
        let wall = 0, opaqueCat = 0;
        for (let i = 3; i < pixels.length; i += 4) {
          if (i < 942 * 600 * 4) wall += pixels[i];
          else if (pixels[i] > 240) opaqueCat++;
        }
        const duration = video.duration;
        video.removeAttribute('src'); video.load();
        return { url, wall, opaqueCat, duration };
      }, url);
      assert.equal(result.wall, 0); assert.ok(result.opaqueCat > 10000, JSON.stringify(result));
      results.push(result);
    }
    assert.equal(results.length, 15);
    fs.writeFileSync(path.join(root, 'artifacts/room-shop-fixed/alpha-check.json'), JSON.stringify(results, null, 2));
    console.log('PASS: all 15 animations have transparent walls and opaque cat interiors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

// Run against the built preview; tests use an isolated browser profile.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const output = path.join(__dirname, '../artifacts/cat-transitions');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.addInitScript(() => {
      window.transitionAudit = [];
      new MutationObserver(records => {
        for (const record of records) for (const node of record.addedNodes) {
          if (node.classList?.contains('cat-transition-frame')) {
            window.transitionAudit.push({ at: performance.now(), count: document.querySelectorAll('.cat-transition-frame').length });
          }
        }
      }).observe(document, { childList: true, subtree: true });
    });
    const url = `${process.env.PREVIEW_URL || 'http://127.0.0.1:5238'}/?test=shop&v=cat-transitions-v1`;
    const load = async () => {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.querySelector('.cat-animation.is-active')?.currentTime > .1);
    };
    const idleReturned = async () => {
      await page.waitForFunction(() => !document.querySelector('#catChromaCanvas').classList.contains('is-active') && document.querySelector('.cat-animation.is-active')?.currentSrc.includes('/sit-idle-loop.webm'));
      await page.waitForFunction(() => !document.querySelector('.cat-transition-frame'));
      assert.equal(await page.locator('.cat-animation.is-active').count(), 1);
    };
    await load();
    const head = await page.locator('[data-cat-head]').boundingBox();
    await page.mouse.move(head.x + head.width / 2, head.y + head.height / 2);
    await page.mouse.down();
    await page.waitForFunction(() => document.querySelector('#catChromaSource').currentTime > 1);
    // Reproduce a stale non-idle clip in the first slot before releasing.
    await page.evaluate(() => { document.querySelector('.cat-animation').src = '/videos/cat/unified-head-v3/sit-tail.mp4'; });
    await page.screenshot({ path: path.join(output, 'head-before-release.png') });
    const transitionsBefore = await page.evaluate(() => transitionAudit.length);
    await page.mouse.up();
    await idleReturned();
    assert.ok(await page.evaluate(() => transitionAudit.length) > transitionsBefore);
    await page.screenshot({ path: path.join(output, 'head-return-idle.png') });
    console.log('PASS: release preserves a transition frame and returns to actual idle, not stale tail');

    await load();
    await page.locator('[data-cat-scratch]').click();
    await page.waitForFunction(() => document.querySelector('#catChromaSource').currentTime > 2.5);
    assert.equal(await page.locator('#catChromaCanvas').evaluate(canvas => canvas.classList.contains('is-active')), true);
    await idleReturned();
    console.log('PASS: scratch completes its return pose instead of truncating at 2.2 seconds');

    await load();
    await page.mouse.move(30, 400);
    await page.mouse.down();
    await page.waitForFunction(() => document.querySelector('#catChromaSource').currentSrc.includes('mouse-look'));
    const seeks = await page.evaluate(async () => {
      const video = document.querySelector('#catChromaSource');
      const times = [];
      await new Promise(resolve => {
        const listener = () => times.push(video.currentTime);
        video.addEventListener('seeked', listener);
        setTimeout(() => { video.removeEventListener('seeked', listener); resolve(); }, 1200);
      });
      return times;
    });
    assert.ok(seeks.length > 1, JSON.stringify(seeks));
    assert.ok(seeks.some(time => time > 1), 'Gaze must actually advance, not repeatedly seek to zero');
    assert.ok(seeks.length < 100, 'Gaze seeking must settle without a busy loop');
    for (let i = 1; i < seeks.length; i++) assert.ok(Math.abs(seeks[i] - seeks[i-1]) <= .241);
    await page.mouse.up();
    await idleReturned();
    console.log('PASS: gaze moves through intermediate poses and returns to idle');

    await load();
    await page.mouse.move(head.x + head.width / 2, head.y + head.height / 2);
    for (let i = 0; i < 4; i++) {
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(250);
    }
    await idleReturned();
    console.log('PASS: quick repeated taps do not leave a stuck interaction');

    await page.evaluate(() => {
      const key = 'cat-companion-focus-v1';
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      saved.reminders = [{ id: 98765, title: 'Animation test', at: Date.now() + 3000, completed: false, repeat: 'none', subtasks: [] }];
      localStorage.setItem(key, JSON.stringify(saved));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.mouse.move(head.x + head.width / 2, head.y + head.height / 2);
    await page.mouse.down();
    await page.waitForFunction(() => document.querySelector('#catChromaSource').currentSrc.includes('head-pet') && document.querySelector('#catChromaSource').currentTime > .2);
    await page.waitForFunction(() => document.querySelector('#catChromaSource').currentSrc.includes('paw-scratch') && document.querySelector('#catChromaSource').currentTime > .3);
    await page.mouse.up();
    assert.ok(await page.locator('#catChromaCanvas').evaluate(canvas => canvas.classList.contains('is-active')));
    await page.locator('#openReminderBell').click();
    await page.waitForFunction(() => !document.querySelector('#catChromaCanvas').classList.contains('is-active'), { timeout: 12000 });
    await page.waitForFunction(() => document.querySelector('.cat-animation.is-active')?.currentSrc.includes('sit-idle-loop'));
    await page.evaluate(() => localStorage.clear());
    console.log('PASS: reminder safely interrupts held petting, then hands back to idle');

    await load();
    await page.waitForTimeout(11000);
    const transitions = await page.evaluate(() => transitionAudit);
    assert.ok(transitions.length >= 2);
    assert.ok(transitions.every(event => event.count <= 1));
    assert.equal(await page.locator('.cat-animation.is-active').count(), 1);
    assert.ok(!await page.locator('.cat-animation.is-active').evaluate(video => video.currentSrc.includes('?play=')));
    await page.setViewportSize({ width: 430, height: 932 });
    await page.screenshot({ path: path.join(output, 'mobile.png') });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'browser-check.json'), JSON.stringify({ errors, transitions, seeks, checks: ['head-release', 'stale-idle-slot', 'full-scratch', 'gaze-intermediate-poses', 'rapid-taps', 'reminder-return', 'automatic-transitions', 'single-overlay', 'cacheable-sources'] }, null, 2));
    console.log('PASS: automatic transitions, one overlay, no page errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

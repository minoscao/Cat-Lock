const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const out = path.join(root, 'artifacts/room-shop-fixed');
fs.mkdirSync(out, { recursive: true });
const source = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
const items = [...source.matchAll(/makeRoomShopItem\('([^']+)', '([^']+)', (\d+),/g)].map(m => ({ id: m[1], slot: m[2], price: Number(m[3]) }));
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 470, height: 836 } });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto('http://127.0.0.1:5238/?test=shop&v=room-fixed-v1', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('.cat-animation.is-active')?.currentTime > .1);
    const transparency = await page.evaluate(() => {
      const video = document.querySelector('.cat-animation.is-active');
      const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
      const ctx = c.getContext('2d'); ctx.drawImage(video, 0, 0);
      return { wall: ctx.getImageData(50, 200, 1, 1).data[3], cat: ctx.getImageData(460, 1080, 1, 1).data[3] };
    });
    assert.equal(transparency.wall, 0); assert.ok(transparency.cat > 240);
    const patch = { x: 10, y: 180, width: 70, height: 80 };
    const wallBefore = await page.screenshot({ clip: patch });
    await page.waitForTimeout(6500);
    assert.deepEqual(await page.screenshot({ clip: patch }), wallBefore, 'Wall pixels changed across an animation switch');
    await page.evaluate(() => { window.savedCatLayer = document.querySelector('.cat-video-layer'); });
    await page.locator('#editDuration').click();
    assert.equal(await page.evaluate(() => window.savedCatLayer === document.querySelector('.cat-video-layer')), true);
    await page.locator('#durationForm button').click();
    await page.locator('#openCollection').click();
    for (const item of items) {
      await page.locator(`[data-room-shop-item="${item.id}"]`).click();
      await page.waitForFunction(id => document.querySelector(`[data-room-shop-item="${id}"]`)?.disabled, item.id);
      const state = await page.evaluate(() => JSON.parse(localStorage.getItem('cat-companion-focus-v1')));
      assert.ok(state.roomShopOwned.includes(item.id));
      assert.equal(state.roomShopEquipped[item.slot], item.id);
      await page.locator('#closeCollection').click();
      await page.waitForTimeout(220);
      await page.screenshot({ path: path.join(out, `${item.id}.png`) });
      await page.locator('#openCollection').click();
    }
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('cat-companion-focus-v1')));
    assert.equal(state.fish, 500 - items.reduce((sum, i) => sum + i.price, 0));
    await page.locator('#closeCollection').click();
    await page.reload({ waitUntil: 'networkidle' });
    const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('cat-companion-focus-v1')));
    assert.deepEqual(restored.roomShopEquipped, state.roomShopEquipped);
    assert.equal(await page.locator('#roomShopLayer .room-shop-scene-item').count(), 3);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'check.json'), JSON.stringify({ transparency, staticWall: true, preservedVideoOnUIEdit: true, purchased: items.length, fish: restored.fish, restored: restored.roomShopEquipped, errors }, null, 2));
    console.log('PASS: transparent cat, static background, persistent player, 30 purchases and reload');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

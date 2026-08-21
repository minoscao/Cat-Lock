const FOCUS_SECONDS = 60;
const STORAGE_KEY = 'cat-companion-focus-v1';
const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
const state = { fish: 0, pawDays: {}, active: false, remaining: FOCUS_SECONDS, view: 'room', note: '它已经在地毯上等你了。', ...saved };
const furniture = [
  ['沙发', '霸占座位、靠着抱枕、睡到四脚朝天。'],
  ['猫爬架', '看窗外、待在高处、抓抓柱子。']
];
const cats = [['橘猫', '暖暖的短毛橘猫外观。'], ['灰猫', '安静的烟灰色短毛猫外观。'], ['三花', '不规则斑块的三花猫外观。']];
const catActions = {
  idle: { source: '/videos/cat/sit-blink.mp4' },
  blink: { source: '/videos/cat/sit-blink.mp4' },
  groom: { source: '/videos/cat/sit-to-groom.mp4' },
  sleepDown: { source: '/videos/cat/sit-to-sleep.mp4' },
  sleeping: { source: '/videos/cat/sleeping.mp4' },
  wake: { source: '/videos/cat/sleep-to-sit.mp4' }
};
const ACTION_PAUSE_MS = 8 * 1000;
const WAKE_AT_REMAINING = 18;
const app = document.querySelector('#app');
let ticker;
let catRenderFrame;
let activeCatVideo;
let catPauseTimer;
let catAnchor;
let catIsSleeping = false;
let wakeRequested = false;
let catSleepAnchor;

function todayKey() { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); }
function todayPaws() { return state.pawDays[todayKey()] || 0; }
function formatTime(seconds) { return `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, '0')}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`; }
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify({ fish: state.fish, pawDays: state.pawDays })); }

function render() {
  const isCloseView = state.view === 'rug' || state.view === 'reward';
  const showEntryCat = state.active && state.view === 'rug';
  const focusControl = state.active
    ? `<div class="focus-state"><p>安静坐一会儿</p><strong id="countdown">${formatTime(state.remaining)}</strong><button class="quiet-button" id="stopFocus" type="button">先停在这里</button></div>`
    : state.view === 'reward'
      ? `<div class="reward-state"><p>这 1 分钟，你做得很好。</p><strong>小鱼干 +1</strong><small>今日爪印 +1</small></div>`
    : `<button class="start-button" id="startFocus" type="button"><span>和猫一起坐一会儿</span><small>1 分钟（测试）</small></button>`;
  app.innerHTML = `<section class="room ${state.active ? 'is-focusing' : ''} ${isCloseView ? 'is-close' : ''}">
    <div class="room-art" aria-hidden="true"></div><div class="focus-art" aria-hidden="true"></div><div class="sun-wash" aria-hidden="true"></div>
    ${showEntryCat ? '<div class="cat-video-layer" aria-hidden="true"><canvas id="catVideoCanvas"></canvas></div>' : ''}
    <header class="topbar"><div class="brand"><span>我的房间</span><small>有猫陪着，慢慢来</small></div><div class="status-group"><span class="paws">今日爪印 <b>${todayPaws()}</b></span><button class="fish-wallet" id="openCollection" type="button">小鱼干 <b>${state.fish}</b></button></div></header>
    <section class="focus-panel" aria-live="polite">${focusControl}<p class="room-note">${state.note}</p></section>
    <button class="collection-button" id="openCollectionBottom" type="button" aria-label="打开收藏"><img src="/icons/shopping-bag.svg" alt=""></button>
    <aside class="collection-drawer" id="collectionDrawer" aria-hidden="true"><div class="drawer-sheet"><div class="drawer-head"><div><p>我的收藏</p><h1>慢慢把房间填满</h1></div><button class="close-button" id="closeCollection" type="button" aria-label="关闭收藏">x</button></div><section class="owned-section"><span class="section-label">已经拥有</span><div class="owned-items"><span>虎斑白猫</span><span>圆地毯</span></div></section><section class="shop-section"><div class="section-title"><span>互动家具</span><small>售价待定</small></div><div class="collection-list">${furniture.map(([name, detail]) => `<article><div class="item-icon">+</div><div><h2>${name}</h2><p>${detail}</p></div><span>家具</span></article>`).join('')}</div></section><section class="shop-section"><div class="section-title"><span>更多猫咪</span><small>售价待定</small></div><div class="collection-list">${cats.map(([name, detail]) => `<article><div class="item-icon">+</div><div><h2>${name}</h2><p>${detail}</p></div><span>外观</span></article>`).join('')}</div></section><p class="drawer-foot">家具会带来新的猫咪日常；具体价格等内容数量确定后再一起调整。</p></div></aside>
    <div class="reward-toast" id="rewardToast" role="status" aria-live="polite"></div>
  </section>`;
  document.querySelector('#startFocus')?.addEventListener('click', startFocus);
  document.querySelector('#stopFocus')?.addEventListener('click', stopFocus);
  document.querySelector('#openCollection')?.addEventListener('click', openCollection);
  document.querySelector('#openCollectionBottom')?.addEventListener('click', openCollection);
  document.querySelector('#closeCollection')?.addEventListener('click', closeCollection);
  document.querySelector('#collectionDrawer')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeCollection(); });
}
function clearCatVideo() {
  cancelAnimationFrame(catRenderFrame);
  clearTimeout(catPauseTimer);
  activeCatVideo?.pause();
  activeCatVideo = undefined;
  catAnchor = undefined;
  catSleepAnchor = undefined;
  catIsSleeping = false;
  wakeRequested = false;
}
function cleanGreenScreen(frame, width, height) {
  const background = new Uint8Array(width * height);
  for (let index = 0; index < frame.data.length; index += 4) {
    const red = frame.data[index];
    const green = frame.data[index + 1];
    const blue = frame.data[index + 2];
    const greenDifference = green - Math.max(red, blue);
    if (green > 85 && greenDifference > 22) {
      background[index / 4] = 1;
      frame.data[index + 3] *= Math.max(0, Math.min(1, (52 - greenDifference) / 30));
    }
  }
  for (let pixel = 0; pixel < background.length; pixel += 1) {
    if (background[pixel]) continue;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const neighbours = [pixel - 1, pixel + 1, pixel - width, pixel + width];
    const touchesBackground = neighbours.some((neighbour) => neighbour >= 0 && neighbour < background.length && background[neighbour] && (x > 0 || neighbour !== pixel - 1) && (x < width - 1 || neighbour !== pixel + 1) && (y > 0 || neighbour !== pixel - width) && (y < height - 1 || neighbour !== pixel + width));
    if (!touchesBackground) continue;
    const index = pixel * 4;
    const red = frame.data[index];
    const green = frame.data[index + 1];
    const blue = frame.data[index + 2];
    const greenDifference = green - Math.max(red, blue);
    if (green > 65 && greenDifference > 5) {
      frame.data[index + 3] *= Math.max(.1, Math.min(1, (26 - greenDifference) / 21));
      frame.data[index + 1] = Math.min(green, Math.max(red, blue) + 5);
    }
  }
}
function findCatAnchor(frame, width, height) {
  let minX = width;
  let maxX = -1;
  let maxY = -1;
  for (let index = 0; index < frame.data.length; index += 4) {
    if (frame.data[index + 3] < 45) continue;
    const pixel = index / 4;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (maxX < 0) return undefined;

  const centralLeft = minX + (maxX - minX) * .22;
  const centralRight = maxX - (maxX - minX) * .22;
  let contactY = -1;
  for (let index = 0; index < frame.data.length; index += 4) {
    if (frame.data[index + 3] < 110) continue;
    const pixel = index / 4;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x < centralLeft || x > centralRight) continue;
    contactY = Math.max(contactY, y);
  }
  if (contactY < 0) return { x: (minX + maxX) / 2, y: maxY };

  let groundX = 0;
  let groundY = 0;
  let groundPixels = 0;
  for (let index = 0; index < frame.data.length; index += 4) {
    if (frame.data[index + 3] < 110) continue;
    const pixel = index / 4;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x < centralLeft || x > centralRight || y < contactY - 5) continue;
    groundX += x;
    groundY += y;
    groundPixels += 1;
  }
  return groundPixels ? { x: groundX / groundPixels, y: groundY / groundPixels } : { x: (minX + maxX) / 2, y: maxY };
}
function playCatVideo(source, loop, onEnded, freezeOnLoad = false) {
  cancelAnimationFrame(catRenderFrame);
  activeCatVideo?.pause();
  const canvas = document.querySelector('#catVideoCanvas');
  if (!canvas) return;
  const layer = canvas.parentElement;
  layer.classList.toggle('is-idle', freezeOnLoad);
  const context = canvas.getContext('2d');
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = 480;
  sourceCanvas.height = 270;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  const video = document.createElement('video');
  activeCatVideo = video;
  video.src = source;
  video.muted = true;
  video.playsInline = true;
  video.loop = loop;
  let clipOffset;
  const stabilizePosition = [catActions.sleepDown.source, catActions.sleeping.source, catActions.wake.source].includes(source);
  const lockClipPosition = [catActions.sleeping.source, catActions.wake.source].includes(source);
  const renderFrame = () => {
    if (activeCatVideo !== video) return;
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      sourceContext.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
      sourceContext.drawImage(video, 0, 0, sourceCanvas.width, sourceCanvas.height);
      const frame = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
      cleanGreenScreen(frame, sourceCanvas.width, sourceCanvas.height);
      sourceContext.putImageData(frame, 0, 0);
      const anchor = findCatAnchor(frame, sourceCanvas.width, sourceCanvas.height);
      if (anchor) {
        if (stabilizePosition && catAnchor) {
          catSleepAnchor ||= { ...catAnchor };
          if (!clipOffset || !lockClipPosition) clipOffset = { x: catSleepAnchor.x - anchor.x, y: catSleepAnchor.y - anchor.y };
          catAnchor = { ...catSleepAnchor };
        } else {
          if (!clipOffset) clipOffset = catAnchor ? { x: catAnchor.x - anchor.x, y: catAnchor.y - anchor.y } : { x: 0, y: 0 };
          catAnchor = { x: anchor.x + clipOffset.x, y: anchor.y + clipOffset.y };
        }
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(sourceCanvas, clipOffset.x, clipOffset.y, canvas.width, canvas.height);
      }
    }
    if (!freezeOnLoad) catRenderFrame = requestAnimationFrame(renderFrame);
  };
  video.addEventListener('loadeddata', () => {
    if (canvas.width !== 480 || canvas.height !== 270) {
      canvas.width = 480;
      canvas.height = 270;
    }
    if (freezeOnLoad) {
      video.addEventListener('seeked', renderFrame, { once: true });
      video.currentTime = .12;
      return;
    }
    renderFrame();
    video.play();
  }, { once: true });
  video.addEventListener('ended', () => { if (activeCatVideo === video) onEnded?.(); });
}
function showSeatedPose() { playCatVideo(catActions.idle.source, false, undefined, true); }
function playAwakeAction(action, next) {
  playCatVideo(action.source, false, () => {
    showSeatedPose();
    catPauseTimer = setTimeout(() => {
      if (state.active) next();
    }, ACTION_PAUSE_MS);
  });
}
function playSleepingLoop() {
  if (!state.active) return;
  if (wakeRequested) {
    playCatVideo(catActions.wake.source, false, () => {
      catIsSleeping = false;
      showSeatedPose();
    });
    return;
  }
  playCatVideo(catActions.sleeping.source, false, playSleepingLoop);
}
function startCatSequence() {
  catAnchor = undefined;
  catSleepAnchor = undefined;
  catIsSleeping = false;
  wakeRequested = false;
  playAwakeAction(catActions.blink, () => playAwakeAction(catActions.groom, () => {
    catIsSleeping = true;
    playCatVideo(catActions.sleepDown.source, false, playSleepingLoop);
  }));
}
function startFocus() { state.active = true; state.view = 'rug'; state.remaining = FOCUS_SECONDS; state.note = '它已经在地毯上坐好，安静陪着你。'; render(); startCatSequence(); clearInterval(ticker); ticker = setInterval(() => { state.remaining -= 1; const c = document.querySelector('#countdown'); if (c) c.textContent = formatTime(state.remaining); if (state.remaining <= WAKE_AT_REMAINING) wakeRequested = true; if (state.remaining <= 0) completeFocus(); }, 1000); }
function stopFocus() { clearInterval(ticker); clearCatVideo(); state.active = false; state.view = 'room'; state.remaining = FOCUS_SECONDS; state.note = '没关系，它打了个哈欠，还会在这里等你。'; render(); }
function completeFocus() { clearInterval(ticker); clearCatVideo(); state.active = false; state.view = 'reward'; state.remaining = FOCUS_SECONDS; state.fish += 1; state.pawDays[todayKey()] = todayPaws() + 1; state.note = '它慢慢睁开眼睛，好像知道你刚刚做完了一件事。'; save(); render(); setTimeout(() => { state.view = 'room'; render(); }, 3600); }
function openCollection() { const d = document.querySelector('#collectionDrawer'); d.classList.add('open'); d.setAttribute('aria-hidden', 'false'); }
function closeCollection() { const d = document.querySelector('#collectionDrawer'); d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); }
render();

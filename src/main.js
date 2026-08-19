const FOCUS_SECONDS = 25 * 60;
const STORAGE_KEY = 'cat-companion-focus-v1';
const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
const state = { fish: 0, pawDays: {}, active: false, remaining: FOCUS_SECONDS, view: 'room', note: '它已经在地毯上等你了。', ...saved };
const furniture = [
  ['沙发', '霸占座位、靠着抱枕、睡到四脚朝天。'],
  ['猫爬架', '看窗外、待在高处、抓抓柱子。']
];
const cats = [['橘猫', '暖暖的短毛橘猫外观。'], ['灰猫', '安静的烟灰色短毛猫外观。'], ['三花', '不规则斑块的三花猫外观。']];
const app = document.querySelector('#app');
let ticker;

function todayKey() { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); }
function todayPaws() { return state.pawDays[todayKey()] || 0; }
function formatTime(seconds) { return `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, '0')}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`; }
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify({ fish: state.fish, pawDays: state.pawDays })); }

function render() {
  const isCloseView = state.view === 'rug' || state.view === 'reward';
  const focusControl = state.active
    ? `<div class="focus-state"><p>安静坐一会儿</p><strong id="countdown">${formatTime(state.remaining)}</strong><button class="quiet-button" id="stopFocus" type="button">先停在这里</button></div>`
    : state.view === 'reward'
      ? `<div class="reward-state"><p>这 25 分钟，你做得很好。</p><strong>小鱼干 +1</strong><small>今日爪印 +1</small></div>`
    : `<button class="start-button" id="startFocus" type="button"><span>和猫一起坐一会儿</span><small>25 分钟</small></button>`;
  app.innerHTML = `<section class="room ${state.active ? 'is-focusing' : ''} ${isCloseView ? 'is-close' : ''}">
    <div class="room-art" aria-hidden="true"></div><div class="focus-art" aria-hidden="true"></div><div class="sun-wash" aria-hidden="true"></div>
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
function startFocus() { state.active = true; state.view = 'rug'; state.remaining = FOCUS_SECONDS; state.note = '它在阳光里摊开肚皮，安静地陪你坐着。'; render(); clearInterval(ticker); ticker = setInterval(() => { state.remaining -= 1; const c = document.querySelector('#countdown'); if (c) c.textContent = formatTime(state.remaining); if (state.remaining <= 0) completeFocus(); }, 1000); }
function stopFocus() { clearInterval(ticker); state.active = false; state.view = 'room'; state.remaining = FOCUS_SECONDS; state.note = '没关系，它打了个哈欠，还会在这里等你。'; render(); }
function completeFocus() { clearInterval(ticker); state.active = false; state.view = 'reward'; state.remaining = FOCUS_SECONDS; state.fish += 1; state.pawDays[todayKey()] = todayPaws() + 1; state.note = '它慢慢睁开眼睛，好像知道你刚刚做完了一件事。'; save(); render(); setTimeout(() => { state.view = 'room'; render(); }, 3600); }
function openCollection() { const d = document.querySelector('#collectionDrawer'); d.classList.add('open'); d.setAttribute('aria-hidden', 'false'); }
function closeCollection() { const d = document.querySelector('#collectionDrawer'); d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); }
render();

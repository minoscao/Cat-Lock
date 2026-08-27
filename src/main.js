const DEFAULT_FOCUS_SECONDS = 13 * 60;
const SIT_PHASE_SECONDS = 5 * 60;
const PRONE_SLEEP_PHASE_SECONDS = 3 * 60;
const STORAGE_KEY = 'cat-companion-focus-v1';
const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
const state = {
  fish: 0,
  focusRecords: [],
  active: false,
  duration: DEFAULT_FOCUS_SECONDS,
  remaining: DEFAULT_FOCUS_SECONDS,
  endsAt: null,
  purpose: '',
  musicVolume: 55,
  catVolume: 70,
  editingDuration: false,
  editingPurpose: false,
  settingsOpen: false,
  statsOpen: false,
  statsPeriod: 'week',
  statsYear: new Date().getFullYear(),
  statsMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  statsSelectedDay: null,
  statsSelectedMonthDay: new Date().getDate() - 1,
  statsSelectedYearMonth: new Date().getMonth(),
  statsPickerOpen: null,
  statsDay: new Date(),
  calendarOpen: false,
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  calendarPickerOpen: null,
  view: 'rug',
  note: '它已经在地毯上等你了。',
  ...saved
};
const furniture = [
  ['沙发', '霸占座位、靠着抱枕、睡到四脚朝天。'],
  ['猫爬架', '看窗外、待在高处、抓抓柱子。']
];
const cats = [['橘猫', '暖暖的短毛橘猫外观。'], ['灰猫', '安静的烟灰色短毛猫外观。'], ['三花', '不规则斑块的三花猫外观。']];
const catActions = {
  idle: { source: '/videos/cat/scene-figure-layout-controls/sit-idle-loop.mp4', duration: 5090 },
  blink: { source: '/videos/cat/scene-figure-layout-controls/sit-blink.mp4', duration: 5090 },
  closer: { source: '/videos/cat/scene-figure-layout-controls/sit-closer.mp4', duration: 5090 },
  tail: { source: '/videos/cat/scene-figure-layout-controls/sit-tail.mp4', duration: 5090 },
  sleepDown: { source: '/videos/cat/scene-figure-layout-controls/sleep-enter.mp4', duration: 4090 },
  sleeping: { source: '/videos/cat/scene-figure-layout-controls/prone-sleep.mp4', duration: 5090 },
  wake: { source: '/videos/cat/scene-figure-layout-controls/stretch-wake.mp4', sound: '/audio/prone-wake-meow.mp4', duration: 8080 },
  bellyEnter: { source: '/videos/cat/scene-figure-layout-controls/sleep-to-belly.mp4', duration: 4090 },
  bellySleeping: { source: '/videos/cat/scene-figure-layout-controls/belly-loop.mp4', duration: 5040 },
  bellyWake: { source: '/videos/cat/scene-figure-layout-controls/belly-wake.mp4', sound: '/audio/belly-wake-meow.mp4', duration: 6080 }
};
const ACTION_PAUSE_MS = 8 * 1000;
const FOCUS_NOTIFICATION_ID = 1001;
const app = document.querySelector('#app');
let ticker;
let catPauseTimer;
let catPlaybackTimer;
let activeCatPlayback;
let activeCatSlot = -1;
const catWakeSound = new Audio();
let catPose = 'sitting';
let sleepRequested = false;
let sleepBranch;
let finishRequested = false;
let earlyFinishRequested = false;
let sittingActionRequested = false;
let nextCloserAt = 120;
let lobbyIdleRounds = 0;

async function scheduleFocusEndNotification() {
  const notifications = window.Capacitor?.Plugins?.LocalNotifications;
  if (!window.Capacitor?.isNativePlatform?.() || !notifications || !state.endsAt) return;
  const endsAt = state.endsAt;
  const permission = await notifications.requestPermissions().catch(() => undefined);
  if (permission?.display !== 'granted' || !state.active || state.endsAt !== endsAt) return;
  await notifications.schedule({
    notifications: [{
      id: FOCUS_NOTIFICATION_ID,
      title: '专注完成',
      body: state.purpose ? `“${state.purpose}”已经完成啦。` : '小猫已经等你回来啦。',
      schedule: { at: new Date(endsAt) }
    }]
  }).catch(() => {});
}
function cancelFocusEndNotification() {
  const notifications = window.Capacitor?.Plugins?.LocalNotifications;
  if (!window.Capacitor?.isNativePlatform?.() || !notifications) return;
  notifications.cancel({ notifications: [{ id: FOCUS_NOTIFICATION_ID }] }).catch(() => {});
}
function playCatWakeSound(source) {
  catWakeSound.pause();
  catWakeSound.src = source;
  catWakeSound.currentTime = 0;
  catWakeSound.volume = state.catVolume / 100;
  catWakeSound.play().catch(() => {});
}
function requestFocusLock() {
  const focusLock = window.Capacitor?.Plugins?.FocusLock;
  if (!window.Capacitor?.isNativePlatform?.() || !focusLock) return;
  focusLock.start().catch(() => {});
}
function releaseFocusLock() {
  const focusLock = window.Capacitor?.Plugins?.FocusLock;
  if (!window.Capacitor?.isNativePlatform?.() || !focusLock) return;
  focusLock.stop().catch(() => {});
}

function formatTime(seconds) { return `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, '0')}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`; }
function formatMinutes(seconds) { const minutes = Math.round(seconds / 60); return `${minutes} 分钟`; }
function dayKey(date) { const d = date || new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); }
function recordsForDay(date) { const key = dayKey(date); return state.focusRecords.filter(record => dayKey(new Date(record.completedAt)) === key); }
function totalSeconds(records) { return records.reduce((sum, record) => sum + record.duration, 0); }
function chartScale(values) {
  const minutes = Math.max(...values, 0) / 60;
  if (!minutes) return 0;
  const target = minutes * 1.15;
  const base = 10 ** Math.floor(Math.log10(target));
  const step = [1, 2, 5, 10].find(value => value * base >= target) * base;
  return step * 60;
}
function chartPoints(values, max) {
  if (!max) return [];
  return values.map((value, index) => value ? { value, index, point: `${44 + index * 260 / Math.max(values.length - 1, 1)},${96 - value / max * 72}` } : null).filter(Boolean);
}
function chartBars(values, max, selectedIndex) {
  if (!max) return '';
  const step = 260 / values.length;
  const width = Math.min(22, step * .58);
  return values.map((value, index) => {
    if (!value) return '';
    const height = Math.max(5, value / max * 72);
    return `<rect class="stats-bar ${index === selectedIndex ? 'is-selected' : ''}" data-chart-index="${index}" x="${44 + index * step + (step - width) / 2}" y="${96 - height}" width="${width}" height="${height}" rx="${width / 2}"><title>${formatMinutes(value)}</title></rect>`;
  }).join('');
}
function chartYAxis(max) {
  const labels = [[24, max], [60, max / 2], [96, 0]];
  return `${labels.map(([y, value]) => `<text class="stats-y-label" x="37" y="${y + 4}" text-anchor="end">${Math.round(value / 60)}分</text>`).join('')}<path class="stats-grid" d="M44 24H304M44 60H304M44 96H304"></path>`;
}
function emptyChartYAxis() {
  return `<text class="stats-y-label" x="37" y="28" text-anchor="end">--</text><text class="stats-y-label" x="37" y="64" text-anchor="end">--</text><text class="stats-y-label" x="37" y="100" text-anchor="end">0分</text><path class="stats-grid" d="M44 24H304M44 60H304M44 96H304"></path>`;
}
function monthLabel(date) { return `${date.getMonth() + 1} 月`; }
function firstFocusDate() {
  if (!state.focusRecords.length) return new Date();
  return new Date(Math.min(...state.focusRecords.map(record => record.completedAt)));
}
function hasFocusInMonth(year, month) {
  return state.focusRecords.some(record => {
    const date = new Date(record.completedAt);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}
function hasFocusInYear(year) { return state.focusRecords.some(record => new Date(record.completedAt).getFullYear() === year); }
function hasFocusOnDay(year, month, day) {
  return state.focusRecords.some(record => {
    const date = new Date(record.completedAt);
    return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
  });
}
function pickerButton(label, key, menu) {
  return `<div class="stats-picker-field"><button class="stats-picker-trigger" type="button" data-picker-toggle="${key}" aria-expanded="${state.statsPickerOpen === key}"><span>${label}</span><i aria-hidden="true"></i></button>${state.statsPickerOpen === key ? `<div class="stats-picker-menu">${menu}</div>` : ''}</div>`;
}
function calendarPickerButton(label, key, menu) {
  return `<div class="calendar-picker-field"><button class="calendar-picker-trigger" type="button" data-calendar-toggle="${key}" aria-expanded="${state.calendarPickerOpen === key}"><span>${label}</span><i aria-hidden="true"></i></button>${state.calendarPickerOpen === key ? `<div class="calendar-picker-menu">${menu}</div>` : ''}</div>`;
}
function renderCalendarPicker() {
  if (!state.calendarOpen) return '';
  const now = new Date();
  const first = firstFocusDate();
  const yearOptions = Array.from({ length: now.getFullYear() - first.getFullYear() + 1 }, (_, index) => {
    const year = first.getFullYear() + index;
    return `<button type="button" data-calendar-choice="year" data-calendar-value="${year}" ${hasFocusInYear(year) ? '' : 'disabled'}>${year}年</button>`;
  }).join('');
  const monthOptions = Array.from({ length: 12 }, (_, month) => `<button type="button" data-calendar-choice="month" data-calendar-value="${month}" ${hasFocusInMonth(state.calendarYear, month) ? '' : 'disabled'}>${month + 1}月</button>`).join('');
  const firstWeekday = (new Date(state.calendarYear, state.calendarMonth, 1).getDay() + 6) % 7;
  const days = new Date(state.calendarYear, state.calendarMonth + 1, 0).getDate();
  const dayCells = Array.from({ length: firstWeekday + days }, (_, index) => {
    if (index < firstWeekday) return '<span class="calendar-day is-blank"></span>';
    const day = index - firstWeekday + 1;
    const active = hasFocusOnDay(state.calendarYear, state.calendarMonth, day);
    const selected = state.statsDay.getFullYear() === state.calendarYear && state.statsDay.getMonth() === state.calendarMonth && state.statsDay.getDate() === day;
    return `<button class="calendar-day ${active ? 'has-record' : ''} ${selected ? 'is-selected' : ''}" type="button" data-calendar-day="${day}" ${active ? '' : 'disabled'}>${day}</button>`;
  }).join('');
  return `<section class="stats-calendar" aria-label="选择专注日期"><header><div><p>选择日期</p><strong>有记录的日期可以查看</strong></div><button class="close-button" id="closeCalendar" type="button" aria-label="关闭日历">x</button></header><div class="calendar-selectors">${calendarPickerButton(`${state.calendarYear}年`, 'year', yearOptions)}${calendarPickerButton(`${state.calendarMonth + 1}月`, 'month', monthOptions)}</div><div class="calendar-weekdays"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div><div class="calendar-grid">${dayCells}</div></section>`;
}
function statsPicker(period) {
  const now = new Date();
  const first = firstFocusDate();
  if (period === 'day') {
    return `<div class="stats-picker"><button class="stats-picker-trigger" id="openCalendar" type="button"><span>${state.statsDay.getFullYear()}年${state.statsDay.getMonth() + 1}月${state.statsDay.getDate()}日</span><i aria-hidden="true"></i></button></div>`;
  }
  if (period === 'month') {
    const yearOptions = Array.from({ length: now.getFullYear() - first.getFullYear() + 1 }, (_, index) => {
      const year = first.getFullYear() + index;
      const active = hasFocusInYear(year);
      return `<button type="button" data-picker-choice="month-year" data-picker-value="${year}" ${active ? '' : 'disabled'}>${year}年</button>`;
    }).join('');
    const monthOptions = Array.from({ length: 12 }, (_, month) => {
      const inRange = (state.statsMonth.getFullYear() > first.getFullYear() || month >= first.getMonth()) && (state.statsMonth.getFullYear() < now.getFullYear() || month <= now.getMonth());
      const active = inRange && hasFocusInMonth(state.statsMonth.getFullYear(), month);
      return `<button type="button" data-picker-choice="month-month" data-picker-value="${month}" ${active ? '' : 'disabled'}>${month + 1}月</button>`;
    }).join('');
    return `<div class="stats-picker stats-month-picker">${pickerButton(`${state.statsMonth.getFullYear()}年`, 'month-year', yearOptions)}${pickerButton(`${state.statsMonth.getMonth() + 1}月`, 'month-month', monthOptions)}</div>`;
  }
  const options = Array.from({ length: now.getFullYear() - first.getFullYear() + 1 }, (_, index) => {
    const year = first.getFullYear() + index;
    const active = hasFocusInYear(year);
    return `<button type="button" data-picker-choice="year" data-picker-value="${year}" ${active ? '' : 'disabled'}>${year}年</button>`;
  }).join('');
  return `<div class="stats-picker">${pickerButton(`${state.statsYear}年`, 'year', options)}</div>`;
}
function statsSelectionLabel(index, series) {
  if (state.statsPeriod === 'week') {
    return '当日累计专注';
  }
  if (state.statsPeriod === 'month') {
    const month = new Date(state.statsMonth);
    return `${month.getMonth() + 1}月${index + 1}日累计专注`;
  }
  return `${index + 1}月累计专注`;
}
function selectStatsChartIndex(index) {
  const series = statsSeries(state.statsPeriod);
  const selectedIndex = Math.min(Math.max(index, 0), series.values.length - 1);
  if (state.statsPeriod === 'week') state.statsSelectedDay = selectedIndex;
  if (state.statsPeriod === 'month') state.statsSelectedMonthDay = selectedIndex;
  if (state.statsPeriod === 'year') state.statsSelectedYearMonth = selectedIndex;
  document.querySelector('#statsSelectedLabel')?.replaceChildren(statsSelectionLabel(selectedIndex, series));
  document.querySelector('#statsSelectedDuration')?.replaceChildren(formatMinutes(series.values[selectedIndex] || 0));
  document.querySelectorAll('[data-chart-index]').forEach(point => point.classList.toggle('is-selected', Number(point.dataset.chartIndex) === selectedIndex));
  const position = 44 + selectedIndex * 260 / Math.max(series.values.length - 1, 1);
  document.querySelector('.stats-scrubber-line')?.setAttribute('x1', position);
  document.querySelector('.stats-scrubber-line')?.setAttribute('x2', position);
}
function statsSeries(period) {
  const now = new Date();
  if (period === 'day') {
    const day = new Date(state.statsDay);
    const values = Array.from({ length: 6 }, (_, index) => {
      const startHour = index * 4;
      return totalSeconds(recordsForDay(day).filter(record => new Date(record.completedAt).getHours() >= startHour && new Date(record.completedAt).getHours() < startHour + 4));
    });
    return { labels: ['0 点', '12 点', '24 点'], values, title: '今天的专注时段', total: values.reduce((sum, value) => sum + value, 0) };
  }
  if (period === 'month') {
    const month = new Date(state.statsMonth);
    const isCurrentMonth = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const observedDays = isCurrentMonth ? now.getDate() : days;
    const values = Array.from({ length: days }, (_, index) => totalSeconds(recordsForDay(new Date(month.getFullYear(), month.getMonth(), index + 1))));
    const total = values.reduce((sum, value) => sum + value, 0);
    return { labels: ['1 日', `${Math.ceil(days / 2)} 日`, `${days} 日`], values, title: `${month.getFullYear()} 年 ${monthLabel(month)}`, total, average: total / observedDays, averageLabel: '日均专注' };
  }
  if (period === 'year') {
    const year = state.statsYear;
    const months = 12;
    const observedMonths = year === now.getFullYear() ? now.getMonth() + 1 : months;
    const values = Array.from({ length: months }, (_, index) => totalSeconds(state.focusRecords.filter(record => { const d = new Date(record.completedAt); return d.getFullYear() === year && d.getMonth() === index; })));
    const total = values.reduce((sum, value) => sum + value, 0);
    return { labels: ['1 月', `${Math.ceil(months / 2)} 月`, `${months} 月`], values, title: `${year} 年`, total, average: total / observedMonths, averageLabel: '月均专注' };
  }
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(now); date.setDate(now.getDate() - 6 + index); return date; });
  const values = days.map(date => totalSeconds(recordsForDay(date)));
  const total = values.reduce((sum, value) => sum + value, 0);
  return { labels: [days[0].toLocaleDateString('zh-CN', { weekday: 'short' }), days[3].toLocaleDateString('zh-CN', { weekday: 'short' }), '今天'], values, days, title: `${days[0].getMonth() + 1}月${days[0].getDate()}日-${now.getMonth() + 1}月${now.getDate()}日`, total, average: total / 7, averageLabel: '每日平均专注' };
}
function renderStatsDrawer() {
  const periods = [['day', '日'], ['week', '最近7天'], ['month', '月'], ['year', '年']];
  const now = new Date();
  const series = statsSeries(state.statsPeriod);
  const records = state.statsPeriod === 'day' ? recordsForDay(state.statsDay) : state.focusRecords.slice(0, 3);
  const selectedMonth = new Date(state.statsMonth);
  const picker = state.statsPeriod === 'day' || state.statsPeriod === 'month' || state.statsPeriod === 'year' ? statsPicker(state.statsPeriod) : '';
  const chartMax = chartScale(series.values);
  const points = chartPoints(series.values, chartMax);
  const selectedIndex = state.statsPeriod === 'week'
    ? (state.statsSelectedDay == null ? null : Math.min(Math.max(state.statsSelectedDay, 0), series.values.length - 1))
    : state.statsPeriod === 'month'
      ? Math.min(Math.max(state.statsSelectedMonthDay, 0), series.values.length - 1)
      : Math.min(Math.max(state.statsSelectedYearMonth, 0), series.values.length - 1);
  const chart = state.statsPeriod === 'week'
    ? chartBars(series.values, chartMax, selectedIndex)
    : `<polyline class="stats-line" points="${points.map(item => item.point).join(' ')}"></polyline>${points.map(item => `<circle class="stats-point ${item.index === selectedIndex ? 'is-selected' : ''}" data-chart-index="${item.index}" cx="${item.point.split(',')[0]}" cy="${item.point.split(',')[1]}" r="3"><title>${formatMinutes(item.value)}</title></circle>`).join('')}`;
  const chartOverview = `<div class="stats-chart-head">${state.statsPeriod === 'week' ? `<span>${series.title}</span>` : ''}<strong>${formatMinutes(series.average)}</strong><small>${series.averageLabel}</small></div>`;
  const selectedLabel = selectedIndex == null ? '' : statsSelectionLabel(selectedIndex, series);
  const totalLabel = state.statsPeriod === 'week'
    ? '近7天累计专注'
    : state.statsPeriod === 'month'
      ? '月度累计专注'
      : '年度累计专注';
  const selectedDetail = state.statsPeriod === 'week' && selectedIndex == null ? '' : `<div><span id="statsSelectedLabel">${selectedLabel}</span><strong id="statsSelectedDuration">${formatMinutes(series.values[selectedIndex] || 0)}</strong></div>`;
  const periodDetails = state.statsPeriod === 'day' ? '' : `<div class="stats-period-details"><div><span>${totalLabel}</span><strong>${formatMinutes(series.total)}</strong></div>${selectedDetail}</div>`;
  const scrubber = state.statsPeriod === 'month' || state.statsPeriod === 'year'
    ? `<input class="stats-scrubber" id="statsScrubber" type="range" min="0" max="${series.values.length - 1}" value="${selectedIndex}" aria-label="选择${state.statsPeriod === 'month' ? '日期' : '月份'}">`
    : '';
  const scrubberLine = scrubber ? `<line class="stats-scrubber-line" x1="${44 + selectedIndex * 260 / Math.max(series.values.length - 1, 1)}" y1="24" x2="${44 + selectedIndex * 260 / Math.max(series.values.length - 1, 1)}" y2="96"></line>` : '';
  const selectionHint = state.statsPeriod === 'week' && selectedIndex == null ? '<p class="stats-selection-hint">点选柱状图可查看当日数据</p>' : '';
  const plot = `<div class="stats-plot"><svg viewBox="0 0 320 112" role="img" aria-label="${series.title}专注时长${state.statsPeriod === 'week' ? '柱状图' : '曲线'}">${chartMax ? chartYAxis(chartMax) : emptyChartYAxis()}${scrubberLine}${chart}</svg>${scrubber}</div><div class="stats-axis"><span>${series.labels[0]}</span><span>${series.labels[1]}</span><span>${series.labels[2]}</span></div>`;
  const chartSection = state.statsPeriod === 'day' ? '' : `<section class="stats-chart ${chartMax ? '' : 'stats-chart-empty'}">${chartOverview}${plot}${selectionHint}${periodDetails}${chartMax ? '' : '<p>还没有可统计的专注时长。</p>'}</section>`;
  const recordTitle = state.statsPeriod === 'day' ? '当日专注记录' : '最近完成';
  const todaySummary = state.statsPeriod === 'day' ? `<div class="stats-summary stats-day-summary"><div><span>今日专注时间</span><strong>${formatMinutes(totalSeconds(records))}</strong></div></div>` : '';
  const recordTime = record => state.statsPeriod === 'day'
    ? new Date(record.completedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
    : new Date(record.completedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  const recordsSection = state.statsPeriod === 'day' ? `<section class="stats-records"><div class="stats-records-head"><span>${recordTitle}</span></div>${records.length ? records.map(record => `<article><div><strong>${escapeHtml(record.purpose || '专注')}</strong><span>${recordTime(record)} 完成</span></div><b>${formatMinutes(record.duration)}</b></article>`).join('') : '<p class="stats-empty">完成一次专注后，这里会记录这段时间。</p>'}</section>` : '';
  return `<aside class="stats-drawer ${state.statsOpen ? 'open' : ''}" id="statsDrawer" aria-hidden="${state.statsOpen ? 'false' : 'true'}"><section class="stats-sheet" aria-labelledby="statsTitle"><header class="stats-head"><div><h1 id="statsTitle">记录小猫陪你走过的时光</h1></div><button class="close-button" id="closeStats" type="button" aria-label="关闭统计">x</button></header><div class="stats-tabs" role="tablist">${periods.map(([value, label]) => `<button class="${state.statsPeriod === value ? 'is-active' : ''}" type="button" data-stats-period="${value}" role="tab" aria-selected="${state.statsPeriod === value}">${label}</button>`).join('')}</div>${picker}${todaySummary}${chartSection}${recordsSection}${renderCalendarPicker()}</section></aside>`;
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify({ fish: state.fish, focusRecords: state.focusRecords, active: state.active, duration: state.duration, remaining: state.remaining, endsAt: state.endsAt, purpose: state.purpose, musicVolume: state.musicVolume, catVolume: state.catVolume })); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }

function render() {
  const isCloseView = state.view === 'rug' || state.view === 'reward';
  const showEntryCat = state.view === 'rug' || state.view === 'reward';
  const focusControl = state.active
    ? `<div class="timer-setup focus-running"><div class="timer-row"><strong id="countdown" class="running-countdown">${formatTime(state.remaining)}</strong></div><p class="focus-title task-title">${escapeHtml(state.purpose || '专注')}</p></div>`
    : state.view === 'reward'
      ? `<div class="reward-state"><p>这段时间，你做得很好。</p><strong>小鱼干 +1</strong></div>`
      : `<div class="timer-setup"><div class="timer-row"><button class="duration-button" id="editDuration" type="button" aria-label="设置专注时长"><strong>${formatTime(state.duration)}</strong></button><button class="purpose-button" id="editPurpose" type="button" aria-label="填写本次专注内容" title="填写本次专注内容"><img class="note-icon" src="/icons/notebook-pen.svg" alt=""></button></div><p class="focus-title">${escapeHtml(state.purpose || '专注')}</p>${state.editingDuration ? `<form class="inline-editor" id="durationForm"><label>分钟<input id="durationInput" type="number" min="1" max="180" value="${Math.round(state.duration / 60)}" inputmode="numeric" required></label><button type="submit">确定</button></form>` : ''}${state.editingPurpose ? `<form class="inline-editor purpose-editor" id="purposeForm"><input id="purposeInput" type="text" maxlength="24" value="${escapeHtml(state.purpose)}" placeholder="例如：整理今天的方案" required><button type="submit">确定</button></form>` : ''}<button class="start-button" id="startFocus" type="button"><span>开始</span></button></div>`;
  app.innerHTML = `<section class="room ${state.active ? 'is-focusing' : ''} ${isCloseView ? 'is-close' : ''}">
    <div class="room-art" aria-hidden="true"></div><div class="focus-art" aria-hidden="true"></div><div class="sun-wash" aria-hidden="true"></div>
    ${showEntryCat ? '<div class="cat-video-layer" aria-hidden="true"><video class="cat-animation is-active" muted playsinline preload="auto" poster="/images/cat-room/figure-layout-controls-idle-poster.png"></video><video class="cat-animation" muted playsinline preload="auto" poster="/images/cat-room/figure-layout-controls-idle-poster.png"></video></div>' : ''}
    <header class="topbar"><button class="top-icon-button shop-top-button" id="openCollection" type="button" aria-label="打开商城，拥有 ${state.fish} 条小鱼干"><img src="/icons/shopping-bag.svg" alt=""><span class="fish-count"><img src="/icons/fish-simple.svg" alt="">x <b>${state.fish}</b></span></button><button class="top-icon-button settings-top-button" id="openSettings" type="button" aria-label="打开系统设置"><img src="/icons/settings.svg" alt=""></button></header>
    ${!state.active && state.view === 'rug' ? '<button class="stats-button" id="openStats" type="button" aria-label="查看专注统计" title="专注统计"><img src="/icons/paw-chart.svg" alt=""></button>' : ''}
    <section class="focus-panel" aria-live="polite">${focusControl}<p class="room-note">${state.note}</p></section>
    ${state.active ? '<div class="finish-slider" id="finishSlider"><div class="finish-track"><span class="finish-track-copy">右滑放弃</span><span class="finish-track-chevron" aria-hidden="true">››</span><input id="finishFocus" type="range" min="0" max="100" value="0" aria-label="向右滑动铃铛提前结束专注"></div></div>' : ''}
    <aside class="collection-drawer" id="collectionDrawer" aria-hidden="true"><div class="drawer-sheet"><div class="drawer-head"><div><p>我的收藏</p><h1>慢慢把房间填满</h1></div><button class="close-button" id="closeCollection" type="button" aria-label="关闭收藏">x</button></div><section class="owned-section"><span class="section-label">已经拥有</span><div class="owned-items"><span>虎斑白猫</span><span>圆地毯</span></div></section><section class="shop-section"><div class="section-title"><span>互动家具</span><small>售价待定</small></div><div class="collection-list">${furniture.map(([name, detail]) => `<article><div class="item-icon">+</div><div><h2>${name}</h2><p>${detail}</p></div><span>家具</span></article>`).join('')}</div></section><section class="shop-section"><div class="section-title"><span>更多猫咪</span><small>售价待定</small></div><div class="collection-list">${cats.map(([name, detail]) => `<article><div class="item-icon">+</div><div><h2>${name}</h2><p>${detail}</p></div><span>外观</span></article>`).join('')}</div></section><p class="drawer-foot">家具会带来新的猫咪日常；具体价格等内容数量确定后再一起调整。</p></div></aside>
    <aside class="settings-drawer ${state.settingsOpen ? 'open' : ''}" id="settingsDrawer" aria-hidden="${state.settingsOpen ? 'false' : 'true'}"><section class="settings-sheet" aria-labelledby="settingsTitle"><header class="settings-head"><div><p>系统设置</p><h1 id="settingsTitle">陪伴的声音</h1></div><button class="close-button" id="closeSettings" type="button" aria-label="关闭系统设置">x</button></header><div class="sound-setting"><div><label for="musicVolume">背景音乐</label><output id="musicVolumeValue">${state.musicVolume}%</output></div><input id="musicVolume" type="range" min="0" max="100" value="${state.musicVolume}" aria-label="背景音乐音量"></div><div class="sound-setting"><div><label for="catVolume">猫咪声音</label><output id="catVolumeValue">${state.catVolume}%</output></div><input id="catVolume" type="range" min="0" max="100" value="${state.catVolume}" aria-label="猫咪声音音量"></div><p class="settings-hint">新的陪伴选项会慢慢放在这里。</p></section></aside>
    ${renderStatsDrawer()}
    <div class="reward-toast" id="rewardToast" role="status" aria-live="polite"></div>
  </section>`;
  document.querySelector('#startFocus')?.addEventListener('click', startFocus);
  document.querySelector('#editDuration')?.addEventListener('click', () => { state.editingDuration = !state.editingDuration; state.editingPurpose = false; render(); });
  document.querySelector('#editPurpose')?.addEventListener('click', () => { state.editingPurpose = !state.editingPurpose; state.editingDuration = false; render(); });
  document.querySelector('#durationForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const minutes = Number(document.querySelector('#durationInput').value);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 180) return;
    state.duration = Math.round(minutes) * 60;
    state.remaining = state.duration;
    state.editingDuration = false;
    render();
  });
  document.querySelector('#purposeForm')?.addEventListener('submit', event => {
    event.preventDefault();
    state.purpose = document.querySelector('#purposeInput').value.trim();
    state.editingPurpose = false;
    render();
  });
  document.querySelector('#openCollection')?.addEventListener('click', openCollection);
  document.querySelector('#closeCollection')?.addEventListener('click', closeCollection);
  document.querySelector('#collectionDrawer')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeCollection(); });
  document.querySelector('#openSettings')?.addEventListener('click', openSettings);
  document.querySelector('#closeSettings')?.addEventListener('click', closeSettings);
  document.querySelector('#settingsDrawer')?.addEventListener('click', event => { if (event.target === event.currentTarget) closeSettings(); });
  document.querySelector('#openStats')?.addEventListener('click', openStats);
  document.querySelector('#closeStats')?.addEventListener('click', closeStats);
  document.querySelector('#statsDrawer')?.addEventListener('click', event => { if (event.target === event.currentTarget) closeStats(); });
  document.querySelectorAll('[data-stats-period]').forEach(button => button.addEventListener('click', () => { state.statsPeriod = button.dataset.statsPeriod; render(); openStats(); }));
  document.querySelectorAll('[data-picker-toggle]').forEach(button => button.addEventListener('click', () => {
    state.statsPickerOpen = state.statsPickerOpen === button.dataset.pickerToggle ? null : button.dataset.pickerToggle;
    render();
    openStats();
  }));
  document.querySelectorAll('[data-picker-choice]').forEach(button => button.addEventListener('click', () => {
    const choice = button.dataset.pickerChoice;
    const value = Number(button.dataset.pickerValue);
    if (choice === 'month-year') {
      const year = value;
      const month = hasFocusInMonth(year, state.statsMonth.getMonth())
        ? state.statsMonth.getMonth()
        : Array.from({ length: 12 }, (_, index) => index).find(index => hasFocusInMonth(year, index));
      state.statsMonth = new Date(year, month, 1);
    }
    if (choice === 'month-month') state.statsMonth = new Date(state.statsMonth.getFullYear(), value, 1);
    if (choice === 'year') state.statsYear = value;
    state.statsPickerOpen = null;
    state.statsSelectedMonthDay = 0;
    state.statsSelectedYearMonth = 0;
    render();
    openStats();
  }));
  document.querySelector('#openCalendar')?.addEventListener('click', () => {
    state.calendarYear = state.statsDay.getFullYear();
    state.calendarMonth = state.statsDay.getMonth();
    state.calendarOpen = true;
    state.calendarPickerOpen = null;
    render();
    openStats();
  });
  document.querySelector('#closeCalendar')?.addEventListener('click', () => {
    state.calendarOpen = false;
    state.calendarPickerOpen = null;
    render();
    openStats();
  });
  document.querySelectorAll('[data-calendar-toggle]').forEach(button => button.addEventListener('click', () => {
    state.calendarPickerOpen = state.calendarPickerOpen === button.dataset.calendarToggle ? null : button.dataset.calendarToggle;
    render();
    openStats();
  }));
  document.querySelectorAll('[data-calendar-choice]').forEach(button => button.addEventListener('click', () => {
    const choice = button.dataset.calendarChoice;
    const value = Number(button.dataset.calendarValue);
    if (choice === 'year') {
      state.calendarYear = value;
      state.calendarMonth = hasFocusInMonth(value, state.calendarMonth) ? state.calendarMonth : Array.from({ length: 12 }, (_, index) => index).find(index => hasFocusInMonth(value, index));
    }
    if (choice === 'month') state.calendarMonth = value;
    state.calendarPickerOpen = null;
    render();
    openStats();
  }));
  document.querySelectorAll('[data-calendar-day]').forEach(button => button.addEventListener('click', () => {
    state.statsDay = new Date(state.calendarYear, state.calendarMonth, Number(button.dataset.calendarDay));
    state.calendarOpen = false;
    render();
    openStats();
  }));
  document.querySelectorAll('[data-chart-index]').forEach(point => point.addEventListener('click', () => {
    const index = Number(point.dataset.chartIndex);
    if (state.statsPeriod === 'week' && state.statsSelectedDay === index) state.statsSelectedDay = null;
    else selectStatsChartIndex(index);
    render();
    openStats();
  }));
  document.querySelector('#statsScrubber')?.addEventListener('input', event => selectStatsChartIndex(Number(event.target.value)));
  document.querySelector('#musicVolume')?.addEventListener('input', event => { state.musicVolume = Number(event.target.value); document.querySelector('#musicVolumeValue').textContent = `${state.musicVolume}%`; save(); });
  document.querySelector('#catVolume')?.addEventListener('input', event => { state.catVolume = Number(event.target.value); catWakeSound.volume = state.catVolume / 100; document.querySelector('#catVolumeValue').textContent = `${state.catVolume}%`; save(); });
  document.querySelector('#finishFocus')?.addEventListener('input', updateFinishSlider);
  document.querySelector('#finishFocus')?.addEventListener('change', resetFinishSlider);
  if (state.editingDuration || state.editingPurpose) requestAnimationFrame(() => document.querySelector('#durationInput, #purposeInput')?.focus());
  if (!state.active && state.view === 'rug') startLobbySequence();
}
function clearCatVideo() {
  clearTimeout(catPauseTimer);
  clearTimeout(catPlaybackTimer);
  activeCatPlayback = undefined;
  activeCatSlot = -1;
  catWakeSound.pause();
  catWakeSound.currentTime = 0;
  sleepRequested = false;
  sleepBranch = undefined;
  finishRequested = false;
  earlyFinishRequested = false;
  sittingActionRequested = false;
  nextCloserAt = 120;
  lobbyIdleRounds = 0;
  catPose = 'sitting';
}
function playCatVideo(source, onEnded, loop = false) {
  clearTimeout(catPlaybackTimer);
  const videos = [...document.querySelectorAll('.cat-animation')];
  if (!videos.length) return;
  const action = Object.values(catActions).find(item => item.source === source);
  const playbackId = `${source}?play=${Date.now()}`;
  const nextSlot = activeCatSlot === 0 ? 1 : 0;
  const nextVideo = videos[nextSlot];
  const currentVideo = activeCatSlot >= 0 ? videos[activeCatSlot] : undefined;
  activeCatPlayback = playbackId;
  let switched = false;
  const switchWhenFirstFramePaints = () => {
    if (switched || activeCatPlayback !== playbackId) return;
    switched = true;
    currentVideo?.pause();
    currentVideo?.classList.remove('is-active');
    nextVideo.classList.add('is-active');
    activeCatSlot = nextSlot;
    if (action?.sound) playCatWakeSound(action.sound);
    if (!loop) {
      catPlaybackTimer = setTimeout(() => {
        if (activeCatPlayback !== playbackId) return;
        onEnded?.();
      }, action?.duration || 5000);
    }
  };
  nextVideo.oncanplay = () => {
    if (activeCatPlayback !== playbackId) return;
    nextVideo.loop = loop;
    nextVideo.currentTime = 0;
    nextVideo.play().then(() => {
      if (typeof nextVideo.requestVideoFrameCallback === 'function') {
        const fallback = setTimeout(switchWhenFirstFramePaints, 180);
        nextVideo.requestVideoFrameCallback(() => {
          clearTimeout(fallback);
          switchWhenFirstFramePaints();
        });
      } else {
        requestAnimationFrame(() => requestAnimationFrame(switchWhenFirstFramePaints));
      }
    }).catch(switchWhenFirstFramePaints);
  };
  nextVideo.src = playbackId;
  nextVideo.load();
}
function showSeatedPose() {
  catPose = 'sitting';
  playSeatedIdleLoop();
}
function startLobbySequence() {
  if (state.active || state.view !== 'rug') return;
  playCatVideo(catActions.idle.source, () => {
    if (state.active || state.view !== 'rug') return;
    lobbyIdleRounds += 1;
    if (lobbyIdleRounds < 2) {
      startLobbySequence();
      return;
    }
    lobbyIdleRounds = 0;
    const action = [catActions.blink, catActions.tail][Math.floor(Math.random() * 2)];
    playCatVideo(action.source, startLobbySequence);
  });
}
function elapsedFocusSeconds() {
  return state.duration - state.remaining;
}
function canScheduleSittingAction() {
  return state.active && catPose === 'sitting' && !finishRequested && (!sleepRequested || sleepBranch === 'wake');
}
function scheduleSittingAction() {
  clearTimeout(catPauseTimer);
  catPauseTimer = setTimeout(() => {
    advanceCatTimeline();
    if (canScheduleSittingAction()) sittingActionRequested = true;
  }, ACTION_PAUSE_MS);
}
function playSeatedIdleLoop() {
  if (!state.active || catPose !== 'sitting') return;
  playCatVideo(catActions.idle.source, () => {
    advanceCatTimeline();
    if (catPose !== 'sitting') return;
    if (finishRequested) {
      completeFocus();
      return;
    }
    if (sittingActionRequested) {
      sittingActionRequested = false;
      const elapsed = elapsedFocusSeconds();
      const action = elapsed >= nextCloserAt
        ? (nextCloserAt = elapsed + 120, catActions.closer)
        : [catActions.blink, catActions.tail][Math.floor(Math.random() * 2)];
      playAwakeAction(action);
      return;
    }
    playSeatedIdleLoop();
  });
}
function playAwakeAction(action) {
  if (catPose !== 'sitting') return;
  catPose = 'awake-action';
  playCatVideo(action.source, () => {
    catPose = 'sitting';
    advanceCatTimeline();
    if (canScheduleSittingAction()) {
      playSeatedIdleLoop();
      scheduleSittingAction();
    }
  });
}
function playSleepingLoop() {
  if (!state.active || catPose !== 'sleeping') return;
  if (earlyFinishRequested) {
    beginEarlyWake();
    return;
  }
  if (sleepBranch || elapsedFocusSeconds() >= SIT_PHASE_SECONDS + PRONE_SLEEP_PHASE_SECONDS) {
    beginSleepBranch();
    return;
  }
  playCatVideo(catActions.sleeping.source, playSleepingLoop);
}
function beginSleep() {
  if (catPose !== 'sitting') return;
  catPose = 'lying-down';
  playCatVideo(catActions.sleepDown.source, () => {
    catPose = 'sleeping';
    if (earlyFinishRequested) {
      beginEarlyWake();
      return;
    }
    playSleepingLoop();
  });
}
function beginSleepBranch() {
  if (catPose !== 'sleeping') return;
  sleepBranch ||= Math.random() < .5 ? 'wake' : 'belly';
  if (sleepBranch === 'belly') {
    catPose = 'rolling-over';
    playCatVideo(catActions.bellyEnter.source, () => {
      catPose = 'belly-sleeping';
      if (earlyFinishRequested) {
        beginEarlyWake();
        return;
      }
      playBellySleepingLoop();
    });
    return;
  }
  catPose = 'waking';
  playCatVideo(catActions.wake.source, () => {
    catPose = 'sitting';
    if (earlyFinishRequested) {
      finishFocusEarly();
      return;
    }
    advanceCatTimeline();
    if (canScheduleSittingAction()) {
      playSeatedIdleLoop();
      scheduleSittingAction();
    }
  });
}
function playBellySleepingLoop() {
  if (!state.active || catPose !== 'belly-sleeping') return;
  if (elapsedFocusSeconds() >= state.duration) {
    beginBellyWake();
    return;
  }
  playCatVideo(catActions.bellySleeping.source, undefined, true);
}
function beginBellyWake() {
  if (catPose !== 'belly-sleeping') return;
  catPose = 'belly-waking';
  playCatVideo(catActions.bellyWake.source, () => {
    catPose = 'sitting';
    if (earlyFinishRequested) {
      finishFocusEarly();
      return;
    }
    completeFocus();
  });
}
function beginFinishWake() {
  if (catPose === 'belly-sleeping') {
    beginBellyWake();
    return;
  }
  if (catPose !== 'sleeping') return;
  catPose = 'waking';
  playCatVideo(catActions.wake.source, () => {
    catPose = 'sitting';
    completeFocus();
  });
}
function beginEarlyWake() {
  if (!state.active || !earlyFinishRequested) return;
  if (catPose === 'belly-sleeping') {
    catPose = 'belly-waking';
    playCatVideo(catActions.bellyWake.source, () => {
      catPose = 'sitting';
      finishFocusEarly();
    });
    return;
  }
  catPose = 'waking';
  playCatVideo(catActions.wake.source, () => {
    catPose = 'sitting';
    finishFocusEarly();
  });
}
function advanceCatTimeline() {
  if (!state.active) return;
  if (earlyFinishRequested) return;
  const elapsed = elapsedFocusSeconds();
  if (elapsed >= state.duration) {
    finishRequested = true;
    beginFinishWake();
    if (catPose === 'sitting') completeFocus();
    return;
  }
  if (elapsed >= SIT_PHASE_SECONDS && !sleepRequested) {
    sleepRequested = true;
    if (catPose === 'sitting') beginSleep();
    return;
  }
  if (sleepRequested && !sleepBranch && catPose === 'sitting') {
    beginSleep();
    return;
  }
  if (sleepRequested && catPose === 'sleeping' && elapsed >= SIT_PHASE_SECONDS + PRONE_SLEEP_PHASE_SECONDS) {
    sleepBranch ||= Math.random() < .5 ? 'wake' : 'belly';
  }
}
function startCatSequence() {
  sleepRequested = false;
  sleepBranch = undefined;
  finishRequested = false;
  earlyFinishRequested = false;
  sittingActionRequested = false;
  nextCloserAt = 120;
  catPose = 'sitting';
  showSeatedPose();
  scheduleSittingAction();
}
function syncFocusClock() {
  if (!state.active || !state.endsAt) return;
  state.remaining = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
  const countdown = document.querySelector('#countdown');
  if (countdown) countdown.textContent = formatTime(state.remaining);
  save();
  advanceCatTimeline();
}
function startFocusClock() { clearInterval(ticker); syncFocusClock(); ticker = setInterval(syncFocusClock, 1000); }
function startFocus() { clearCatVideo(); state.active = true; state.view = 'rug'; state.remaining = state.duration; state.endsAt = Date.now() + state.duration * 1000; state.editingDuration = false; state.editingPurpose = false; state.note = '它已经在地毯上坐好，安静陪着你。'; save(); requestFocusLock(); void scheduleFocusEndNotification(); render(); startCatSequence(); startFocusClock(); }
function updateFinishSlider(event) {
  const slider = event.currentTarget;
  const progress = Number(slider.value);
  slider.style.setProperty('--finish-progress', `${progress}%`);
  if (progress >= 92) endFocusEarly();
}
function resetFinishSlider(event) {
  const slider = event.currentTarget;
  if (Number(slider.value) >= 92) return;
  slider.value = '0';
  slider.style.setProperty('--finish-progress', '0%');
}
function endFocusEarly() {
  if (!state.active) return;
  clearInterval(ticker);
  earlyFinishRequested = true;
  document.querySelector('#finishSlider')?.remove();
  if (catPose === 'sleeping' || catPose === 'belly-sleeping') {
    beginEarlyWake();
    return;
  }
  if (['lying-down', 'sleeping', 'rolling-over', 'waking', 'belly-waking'].includes(catPose)) return;
  finishFocusEarly();
}
function finishFocusEarly() {
  clearCatVideo();
  releaseFocusLock();
  cancelFocusEndNotification();
  state.active = false;
  state.endsAt = null;
  state.view = 'rug';
  state.remaining = state.duration;
  state.note = '铃铛轻轻响了一声，它会在这里等你下次回来。';
  save();
  render();
}
function completeFocus() { clearInterval(ticker); clearCatVideo(); releaseFocusLock(); cancelFocusEndNotification(); state.active = false; state.endsAt = null; state.view = 'reward'; state.remaining = state.duration; state.fish += 1; state.focusRecords.unshift({ completedAt: Date.now(), duration: state.duration, purpose: state.purpose }); state.focusRecords = state.focusRecords.slice(0, 2000); state.note = '它慢慢睁开眼睛，好像知道你刚刚做完了一件事。'; save(); render(); setTimeout(() => { state.view = 'rug'; render(); }, 3600); }
function openCollection() { const d = document.querySelector('#collectionDrawer'); d.classList.add('open'); d.setAttribute('aria-hidden', 'false'); }
function closeCollection() { const d = document.querySelector('#collectionDrawer'); d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); }
function openSettings() {
  state.settingsOpen = true;
  const drawer = document.querySelector('#settingsDrawer');
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
}
function closeSettings() {
  state.settingsOpen = false;
  const drawer = document.querySelector('#settingsDrawer');
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
}
function openStats() { state.statsOpen = true; const drawer = document.querySelector('#statsDrawer'); drawer?.classList.add('open'); drawer?.setAttribute('aria-hidden', 'false'); }
function closeStats() { state.statsOpen = false; const drawer = document.querySelector('#statsDrawer'); drawer?.classList.remove('open'); drawer?.setAttribute('aria-hidden', 'true'); }
if (state.active && state.endsAt) {
  state.remaining = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
  if (state.remaining > 0) {
    render();
    startCatSequence();
    requestFocusLock();
    startFocusClock();
  } else {
    completeFocus();
  }
} else {
  state.active = false;
  state.endsAt = null;
  render();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncFocusClock(); });

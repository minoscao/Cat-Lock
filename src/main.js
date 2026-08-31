const DEFAULT_FOCUS_SECONDS = 13 * 60;
const SIT_PHASE_SECONDS = 5 * 60;
const PRONE_SLEEP_PHASE_SECONDS = 3 * 60;
const STORAGE_KEY = 'cat-companion-focus-v1';
const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
const state = {
  fish: 0,
  focusRecords: [],
  reminders: [],
  completedSubtasks: [],
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
  remindersOpen: false,
  reminderView: 'overview',
  reminderComposerOpen: false,
  reminderEditingId: null,
  reminderSwipeId: null,
  reminderExpandedId: null,
  completedClearOpen: false,
  planAddDate: null,
  todayAddPeriod: null,
  reminderReturnScrollTop: null,
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
  bellyWake: { source: '/videos/cat/scene-figure-layout-controls/belly-wake.mp4', sound: '/audio/belly-wake-meow.mp4', duration: 6080 },
  pawScratch: { source: '/videos/cat/scene-figure-layout-controls/paw-scratch.mp4', sound: '/audio/prone-wake-meow.mp4', duration: 3200 }
};
const ACTION_PAUSE_MS = 8 * 1000;
const FOCUS_NOTIFICATION_ID = 1001;
const REMINDER_NOTIFICATION_BASE = 200000;
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
let reminderReactionPlaying = false;
let catChromaFrame;
let activeChromaVideo;

function localNotifications() { return window.Capacitor?.Plugins?.LocalNotifications; }
function urgentAlarm() { return window.Capacitor?.Plugins?.UrgentAlarm; }
function nextReminderId() { return Math.max(0, ...state.reminders.map(reminder => reminder.id)) + 1; }
function reminderNotificationId(reminder) { return REMINDER_NOTIFICATION_BASE + reminder.id; }
function reminderNotificationAt(reminder) { return reminder.at - (Number(reminder.advanceMinutes) || 0) * 60 * 1000; }
function reminderSchedule(reminder) {
  const at = new Date(reminderNotificationAt(reminder));
  const repeat = reminder.repeat === 'custom' && Number(reminder.repeatEvery) === 1 ? ({ day: 'daily', week: 'weekly', month: 'monthly' }[reminder.repeatUnit] || 'none') : reminder.repeat;
  if (repeat === 'daily') return { on: { hour: at.getHours(), minute: at.getMinutes() }, repeats: true };
  if (repeat === 'weekly') return { on: { weekday: at.getDay() + 1, hour: at.getHours(), minute: at.getMinutes() }, repeats: true };
  if (repeat === 'monthly') return { on: { day: at.getDate(), hour: at.getHours(), minute: at.getMinutes() }, repeats: true };
  return { at };
}
function formatReminderTime(value) {
  return `提醒事项 ${new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}
function formatAllReminderTime(value) {
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDay = new Date(date);
  targetDay.setHours(0, 0, 0, 0);
  const dayOffset = Math.round((targetDay - today) / 86400000);
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const label = dayOffset === 0 ? '今天' : dayOffset === 1 ? '明天' : dayOffset === 2 ? '后天' : `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  return `${label} ${time}`;
}
async function scheduleReminderNotification(reminder) {
  if (reminder.urgent && urgentAlarm()) {
    try {
      await urgentAlarm().schedule({ id: reminder.id, title: reminder.title, at: reminderNotificationAt(reminder) });
      return;
    } catch (_) {
      state.note = '请允许精确闹钟权限，才能启用紧急提醒。';
    }
  }
  const notifications = localNotifications();
  if (!window.Capacitor?.isNativePlatform?.() || !notifications || reminder.completed) return;
  const permission = await notifications.requestPermissions().catch(() => undefined);
  if (permission?.display !== 'granted') return;
  await notifications.schedule({ notifications: [{
    id: reminderNotificationId(reminder),
    title: '小猫提醒你',
    body: reminder.description || reminder.title,
    schedule: reminderSchedule(reminder)
  }] }).catch(() => {});
}
function cancelReminderNotification(reminder) {
  if (reminder.urgent && urgentAlarm()) urgentAlarm().cancel({ id: reminder.id }).catch(() => {});
  const notifications = localNotifications();
  if (!window.Capacitor?.isNativePlatform?.() || !notifications) return;
  notifications.cancel({ notifications: [{ id: reminderNotificationId(reminder) }] }).catch(() => {});
}
function playReminderReaction(reminderId) {
  const reminder = state.reminders.find(item => item.id === reminderId);
  if (!reminder || state.active || state.view !== 'rug') return;
  reminderReactionPlaying = true;
  clearCatVideo();
  state.note = `它扒拉着爪子提醒你：${reminder.title}`;
  render();
  playChromaCatVideo(catActions.pawScratch, () => {
    reminderReactionPlaying = false;
    state.note = '它又在地毯上安静等着你了。';
    render();
  });
}
function initializeReminderNotifications() {
  const notifications = localNotifications();
  if (!window.Capacitor?.isNativePlatform?.() || !notifications) return;
  notifications.addListener('localNotificationActionPerformed', event => {
    const reminderId = Number(event.notification?.id) - REMINDER_NOTIFICATION_BASE;
    if (reminderId > 0) setTimeout(() => playReminderReaction(reminderId), 250);
  });
}

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
  return `<aside class="stats-drawer ${state.statsOpen ? 'open' : ''}" id="statsDrawer" aria-hidden="${state.statsOpen ? 'false' : 'true'}"><section class="stats-sheet" aria-labelledby="statsTitle"><header class="stats-head"><div><p>专注统计</p><h1 id="statsTitle">小猫陪你走过的时光</h1></div><button class="close-button" id="closeStats" type="button" aria-label="关闭统计">x</button></header><div class="stats-tabs" role="tablist">${periods.map(([value, label]) => `<button class="${state.statsPeriod === value ? 'is-active' : ''}" type="button" data-stats-period="${value}" role="tab" aria-selected="${state.statsPeriod === value}">${label}</button>`).join('')}</div>${picker}${todaySummary}${chartSection}${recordsSection}${renderCalendarPicker()}</section></aside>`;
}
function reminderInputValue(time = Date.now() + 30 * 60 * 1000) {
  const date = new Date(time - new Date().getTimezoneOffset() * 60000);
  return date.toISOString().slice(0, 16);
}
function reminderDateValue(time = Date.now() + 30 * 60 * 1000) { return reminderInputValue(time).slice(0, 10); }
function reminderTimeValue(time = Date.now() + 30 * 60 * 1000) { return reminderInputValue(time).slice(11); }
function reminderDateLabel(value) { const date = new Date(`${value}T00:00`); return `${date.getMonth() + 1}月${date.getDate()}日`; }
function isSameReminderDay(time, reference = new Date()) { const date = new Date(time); return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth() && date.getDate() === reference.getDate(); }
function renderReminderDrawer() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const pending = state.reminders.filter(reminder => !reminder.completed).sort((a, b) => a.at - b.at);
  const completed = state.reminders.filter(reminder => reminder.completed).sort((a, b) => b.at - a.at);
  const completedSubtasks = state.completedSubtasks || [];
  const filters = {
    today: { title: '今天', icon: 'calendar-outline.svg', items: pending.filter(reminder => isSameReminderDay(reminder.at)), tone: 'today' },
    planned: { title: '计划', icon: 'calendar-days.svg', items: pending.filter(reminder => reminder.at >= todayStart.getTime()), tone: 'planned' },
    all: { title: '全部', icon: 'archive.svg', items: pending, tone: 'all' },
    marked: { title: '标记', icon: 'paw-solid.svg', items: pending.filter(reminder => reminder.flagged), tone: 'marked' },
    urgent: { title: '紧急', icon: 'alarm-clock.svg', items: pending.filter(reminder => reminder.urgent), tone: 'urgent' },
    completed: { title: '完成', icon: 'check.svg', items: completed, subtasks: completedSubtasks, tone: 'completed' }
  };
  const item = reminder => {
    const isAllView = state.reminderView === 'all';
    const usesCalendarTime = isAllView || ['marked', 'urgent'].includes(state.reminderView);
    const subtasks = (reminder.subtasks || []).filter(task => task && !task.startsWith('[done] '));
    const expanded = isAllView && state.reminderExpandedId === reminder.id;
    const inlineSubtasks = expanded ? `<div class="reminder-inline-subtasks">${subtasks.map(task => `<span><i aria-hidden="true"></i>${escapeHtml(task.replace(/^\[done\]\s*/, ''))}</span>`).join('')}</div>` : '';
    const subtaskToggle = isAllView && subtasks.length ? `<button class="reminder-inline-toggle ${expanded ? 'is-expanded' : ''}" type="button" data-reminder-inline-toggle="${reminder.id}" aria-label="${expanded ? '收起' : '展开'} ${subtasks.length} 个子任务" aria-expanded="${expanded}"><b>${subtasks.length}</b><i aria-hidden="true"></i></button>` : '';
    return `<div class="reminder-swipe ${state.reminderSwipeId === reminder.id ? 'is-open' : ''}"><div class="reminder-actions" aria-label="提醒操作"><button class="reminder-action is-edit" type="button" data-reminder-edit="${reminder.id}" aria-label="编辑提醒"><img src="/icons/notebook-pen.svg" alt=""><span>编辑</span></button><button class="reminder-action is-mark" type="button" data-reminder-mark="${reminder.id}" aria-label="${reminder.flagged ? '取消标记' : '标记'}提醒"><img src="/icons/paw-print.svg" alt=""><span>标记</span></button><button class="reminder-action is-delete" type="button" data-reminder-delete="${reminder.id}" aria-label="删除提醒"><img src="/icons/trash-2.svg" alt=""><span>删除</span></button></div><article class="reminder-item ${reminder.completed ? 'is-complete' : ''} ${isAllView && subtasks.length ? 'has-inline-subtasks' : ''}" data-reminder-row="${reminder.id}"><button class="reminder-check" type="button" data-reminder-toggle="${reminder.id}" aria-label="${reminder.completed ? '恢复' : '完成'}提醒">${reminder.completed ? '✓' : ''}</button><div><strong>${escapeHtml(reminder.title)}</strong>${reminder.description ? `<em>${escapeHtml(reminder.description)}</em>` : ''}<span class="reminder-time">${usesCalendarTime ? formatAllReminderTime(reminder.at) : formatReminderTime(reminder.at)}${reminder.urgent ? '<img src="/icons/alarm-clock.svg" alt="紧急提醒">' : ''}</span>${inlineSubtasks}</div><span class="reminder-mark-slot">${reminder.flagged ? '<img class="reminder-paw-mark" src="/icons/paw-solid.svg" alt="已标记">' : ''}${subtaskToggle}</span></article></div>`;
  };
  const timeOfDay = reminder => {
    const hour = new Date(reminder.at).getHours();
    return hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上';
  };
  const renderTodayGroups = items => {
    const groups = ['上午', '下午', '晚上'];
    return `<div class="reminder-time-groups">${groups.map(label => {
      const selected = state.todayAddPeriod === label;
      return `<section class="reminder-time-group ${selected ? 'is-add-open' : ''}"><h3><button type="button" data-today-period="${label}">${label}</button>${selected ? `<button class="plan-day-add" type="button" data-today-add="${label}" aria-label="为${label}新建提醒">＋</button>` : ''}</h3>${items.filter(reminder => timeOfDay(reminder) === label).map(item).join('')}</section>`;
    }).join('')}</div>${items.length ? '' : '<p class="reminder-empty reminder-day-empty">今天还没有提醒事项。</p>'}`;
  };
  const renderPlanTimeline = items => {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
    const calendarDayLabel = date => `${date.getFullYear() === todayStart.getFullYear() ? '' : `${date.getFullYear()}年`}${date.getMonth() + 1}月${date.getDate()}日 周${weekdays[date.getDay()]}`;
    const dayLabel = (date, offset) => offset === 0 ? '今天' : offset === 1 ? '明天' : offset === 2 ? '后天' : calendarDayLabel(date);
    const renderDay = (date, label) => {
      const entries = items.filter(reminder => isSameReminderDay(reminder.at, date));
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const selected = state.planAddDate === value;
      return `<section class="plan-day ${entries.length ? 'has-items' : 'is-empty'} ${selected ? 'is-add-open' : ''}"><h3><button type="button" data-plan-day="${value}">${label}</button>${selected ? `<button class="plan-day-add" type="button" data-plan-add="${value}" aria-label="为${label}新建提醒">＋</button>` : ''}</h3>${entries.map(item).join('')}</section>`;
    };
    const week = Array.from({ length: 7 }, (_, offset) => renderDay(addDays(todayStart, offset), dayLabel(addDays(todayStart, offset), offset))).join('');
    const afterWeek = addDays(todayStart, 7).getTime();
    const firstFutureMonth = new Date(addDays(todayStart, 7).getFullYear(), addDays(todayStart, 7).getMonth(), 1);
    const months = Array.from({ length: 12 }, (_, offset) => {
      const monthStart = new Date(firstFutureMonth.getFullYear(), firstFutureMonth.getMonth() + offset, 1);
      const monthEnd = new Date(firstFutureMonth.getFullYear(), firstFutureMonth.getMonth() + offset + 1, 1);
      const entries = items.filter(reminder => reminder.at >= Math.max(afterWeek, monthStart.getTime()) && reminder.at < monthEnd.getTime());
      const label = offset === 0 ? `${monthStart.getMonth() + 1}月其他时间` : `${monthStart.getFullYear() === todayStart.getFullYear() ? '' : `${monthStart.getFullYear()}年`}${monthStart.getMonth() + 1}月`;
      const periodStart = new Date(Math.max(afterWeek, monthStart.getTime()));
      const value = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}-${String(periodStart.getDate()).padStart(2, '0')}`;
      const selected = state.planAddDate === value;
      const byDay = [...new Set(entries.map(reminder => new Date(reminder.at).toDateString()))].map(value => {
        const date = new Date(value);
        return `<section class="plan-month-day"><h4>${calendarDayLabel(date)}</h4>${entries.filter(reminder => isSameReminderDay(reminder.at, date)).map(item).join('')}</section>`;
      }).join('');
      return `<section class="plan-month ${entries.length ? 'has-items' : 'is-empty'} ${selected ? 'is-add-open' : ''}"><h3><button type="button" data-plan-period="${value}">${label}</button>${selected ? `<button class="plan-day-add" type="button" data-plan-add="${value}" aria-label="为${label}新建提醒">＋</button>` : ''}</h3>${byDay}</section>`;
    }).join('');
    return `<div class="reminder-plan-timeline">${week}${months}</div>`;
  };
  const editingReminder = state.reminders.find(reminder => reminder.id === state.reminderEditingId);
  const date = !editingReminder && state.planAddDate ? state.planAddDate : reminderDateValue(editingReminder?.at);
  const time = !editingReminder && state.todayAddPeriod ? ({ '上午': '09:00', '下午': '14:00', '晚上': '19:00' }[state.todayAddPeriod]) : reminderTimeValue(editingReminder?.at);
  const completedSubtaskItem = subtask => `<article class="reminder-item is-complete reminder-completed-subtask"><span class="reminder-check">✓</span><div><strong>${escapeHtml(subtask.title)}</strong><span class="reminder-time">来自：${escapeHtml(subtask.parentTitle)}</span></div></article>`;
  const cards = Object.entries(filters).map(([key, filter]) => {
    const icon = key === 'today' ? `<i class="reminder-calendar-date" aria-label="今天 ${new Date().getDate()} 日">${new Date().getDate()}</i>` : `<img src="/icons/${filter.icon}" alt="">`;
    const count = key === 'completed' ? '' : `<b>${filter.items.length + (filter.subtasks?.length || 0)}</b>`;
    return `<button class="reminder-summary-card is-${filter.tone}" type="button" data-reminder-filter="${key}">${icon}<span>${filter.title}</span>${count}</button>`;
  }).join('');
  const activeFilter = filters[state.reminderView];
  const listItems = activeFilter?.items || [];
  const listSubtasks = activeFilter?.subtasks || [];
  const listContent = state.reminderView === 'today'
    ? renderTodayGroups(listItems)
    : state.reminderView === 'planned'
      ? renderPlanTimeline(listItems)
      : listItems.length || listSubtasks.length
        ? `${listItems.map(item).join('')}${listSubtasks.map(completedSubtaskItem).join('')}`
        : `<p class="reminder-empty">${state.reminderView === 'completed' ? '还没有完成项目。' : '这里暂时没有提醒。'}</p>`;
  const completedSummary = state.reminderView === 'completed' ? `<p class="completed-summary"><span>${listItems.length + listSubtasks.length} 项完成</span><button id="openCompletedClear" type="button">清除</button></p>${state.completedClearOpen ? '<section class="completed-clear-menu" role="dialog" aria-label="清除完成项目"><p>清除完成的提醒事项</p><button id="clearAllCompleted" type="button">所有完成项目</button></section>' : ''}` : '';
  const list = activeFilter ? `<section class="reminder-detail"><header><button class="reminder-back" id="backToReminderOverview" type="button" aria-label="返回提醒概览">‹</button><div class="reminder-detail-title"><h2>${activeFilter.title}</h2>${completedSummary}</div></header><div class="reminder-list">${listContent}</div></section>` : '';
  const composer = state.reminderComposerOpen ? `<section class="reminder-composer"><header><div><p>${editingReminder ? '编辑提醒' : '新建提醒'}</p><h2>${editingReminder ? '改一改提醒内容' : '让小猫准时叫你'}</h2></div><button class="close-button" id="closeReminderComposer" type="button" aria-label="关闭提醒编辑">×</button></header><form class="reminder-form" id="reminderForm"><label class="reminder-field"><span>标题</span><input id="reminderTitle" type="text" maxlength="40" value="${escapeHtml(editingReminder?.title || '')}" placeholder="新增事件提醒"></label><label class="reminder-field"><span>事件内容</span><textarea id="reminderDescription" maxlength="120" placeholder="补充一点细节（选填）">${escapeHtml(editingReminder?.description || '')}</textarea></label><div class="reminder-schedule"><button id="openReminderDate" type="button"><span>日期</span><b id="reminderDateLabel">${reminderDateLabel(date)}</b></button><button id="openReminderTime" type="button"><span>时间</span><b id="reminderTimeLabel">${time}</b></button><input id="reminderDate" type="date" value="${date}" required><input id="reminderTime" type="time" value="${time}" required></div><label class="reminder-field"><span>事件子任务</span><textarea id="reminderSubtasks" maxlength="240" placeholder="一行一个子任务（选填）">${escapeHtml((editingReminder?.subtasks || []).join('\n'))}</textarea></label><div class="reminder-options"><label class="reminder-switch"><span><b>紧急提醒</b><small>到点后会像闹钟一样持续响</small></span><input id="reminderUrgent" type="checkbox" ${editingReminder?.urgent ? 'checked' : ''}><i aria-hidden="true"></i></label><label class="reminder-switch"><span><b>标记提醒</b><small>列表右侧会留下猫爪</small></span><input id="reminderFlagged" type="checkbox" ${editingReminder?.flagged ? 'checked' : ''}><i aria-hidden="true"></i></label></div><div class="reminder-settings"><label>是否重复<select id="reminderRepeat"><option value="none" ${!editingReminder?.repeat || editingReminder.repeat === 'none' ? 'selected' : ''}>不重复</option><option value="daily" ${editingReminder?.repeat === 'daily' ? 'selected' : ''}>每天</option><option value="weekly" ${editingReminder?.repeat === 'weekly' ? 'selected' : ''}>每周</option><option value="monthly" ${editingReminder?.repeat === 'monthly' ? 'selected' : ''}>每月</option><option value="custom" ${editingReminder?.repeat === 'custom' ? 'selected' : ''}>自定义</option></select></label><label>提前提醒<select id="reminderAdvance"><option value="0" ${!editingReminder?.advanceMode && (editingReminder?.advanceMinutes || 0) === 0 ? 'selected' : ''}>准时提醒</option><option value="5" ${!editingReminder?.advanceMode && editingReminder?.advanceMinutes === 5 ? 'selected' : ''}>提前 5 分钟</option><option value="15" ${!editingReminder?.advanceMode && editingReminder?.advanceMinutes === 15 ? 'selected' : ''}>提前 15 分钟</option><option value="30" ${!editingReminder?.advanceMode && editingReminder?.advanceMinutes === 30 ? 'selected' : ''}>提前 30 分钟</option><option value="60" ${!editingReminder?.advanceMode && editingReminder?.advanceMinutes === 60 ? 'selected' : ''}>提前 1 小时</option><option value="1440" ${!editingReminder?.advanceMode && editingReminder?.advanceMinutes === 1440 ? 'selected' : ''}>提前 1 天</option><option value="custom" ${editingReminder?.advanceMode === 'custom' ? 'selected' : ''}>自定义</option></select></label></div><div class="reminder-custom-panel" id="repeatCustomPanel" ${editingReminder?.repeat === 'custom' ? '' : 'hidden'}><strong>自定义重复</strong><label>每隔<input id="reminderRepeatEvery" type="number" min="1" max="99" value="${editingReminder?.repeatEvery || 1}"></label><select id="reminderRepeatUnit"><option value="day" ${!editingReminder?.repeatUnit || editingReminder.repeatUnit === 'day' ? 'selected' : ''}>天</option><option value="week" ${editingReminder?.repeatUnit === 'week' ? 'selected' : ''}>周</option><option value="month" ${editingReminder?.repeatUnit === 'month' ? 'selected' : ''}>个月</option></select><label>结束重复<select id="reminderRepeatEnd"><option value="never" ${!editingReminder?.repeatEndAt ? 'selected' : ''}>永不</option><option value="date" ${editingReminder?.repeatEndAt ? 'selected' : ''}>于日期</option></select></label><input id="reminderRepeatEndDate" type="date" value="${editingReminder?.repeatEndAt || ''}" ${editingReminder?.repeatEndAt ? '' : 'hidden'}></div><div class="reminder-custom-panel" id="advanceCustomPanel" ${editingReminder?.advanceMode === 'custom' ? '' : 'hidden'}><strong>自定义提前提醒</strong><label>提前<input id="reminderAdvanceAmount" type="number" min="1" max="999" value="${editingReminder?.advanceAmount || 1}"></label><select id="reminderAdvanceUnit"><option value="minute" ${!editingReminder?.advanceUnit || editingReminder.advanceUnit === 'minute' ? 'selected' : ''}>分钟</option><option value="hour" ${editingReminder?.advanceUnit === 'hour' ? 'selected' : ''}>小时</option><option value="day" ${editingReminder?.advanceUnit === 'day' ? 'selected' : ''}>天</option><option value="week" ${editingReminder?.advanceUnit === 'week' ? 'selected' : ''}>周</option></select></div><button class="reminder-submit" type="submit">${editingReminder ? '保存修改' : '添加提醒'}</button></form></section>` : '';
  const body = state.reminderView === 'overview' ? `<div class="reminder-summary-grid">${cards}</div><p class="reminder-summary-note">点选分类，查看小猫替你记住的事。</p>` : list;
  const addButton = ['planned', 'today'].includes(state.reminderView) ? '' : '<button class="reminder-add-button" id="openReminderComposer" type="button" aria-label="新建提醒">＋</button>';
  const heading = state.reminderView === 'overview' ? '<div><p>提醒事项</p><h1 id="remindersTitle">重要的事小猫替你记着</h1></div>' : '';
  const sheetLabel = state.reminderView === 'overview' ? 'aria-labelledby="remindersTitle"' : 'aria-label="提醒列表"';
  return `<aside class="reminders-drawer ${state.remindersOpen ? 'open' : ''}" id="remindersDrawer" aria-hidden="${state.remindersOpen ? 'false' : 'true'}"><section class="reminders-sheet ${state.reminderView === 'overview' ? '' : 'is-detail'}" ${sheetLabel}><header class="reminders-head">${heading}${state.reminderView === 'overview' ? '<button class="close-button" id="closeReminders" type="button" aria-label="关闭提醒">×</button>' : ''}</header>${body}${addButton}${composer}</section></aside>`;
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify({ fish: state.fish, focusRecords: state.focusRecords, reminders: state.reminders, completedSubtasks: state.completedSubtasks, active: state.active, duration: state.duration, remaining: state.remaining, endsAt: state.endsAt, purpose: state.purpose, musicVolume: state.musicVolume, catVolume: state.catVolume })); }
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
    ${showEntryCat ? '<div class="cat-video-layer" aria-hidden="true"><video class="cat-animation is-active" muted playsinline preload="auto" poster="/images/cat-room/figure-layout-controls-idle-poster.png"></video><video class="cat-animation" muted playsinline preload="auto" poster="/images/cat-room/figure-layout-controls-idle-poster.png"></video><canvas class="cat-chroma-canvas" id="catChromaCanvas"></canvas></div>' : ''}
    <header class="topbar"><button class="top-icon-button shop-top-button" id="openCollection" type="button" aria-label="打开商城，拥有 ${state.fish} 条小鱼干"><img src="/icons/shopping-bag.svg" alt=""><span class="fish-count"><img src="/icons/fish-simple.svg" alt="">x <b>${state.fish}</b></span></button><button class="top-icon-button settings-top-button" id="openSettings" type="button" aria-label="打开系统设置"><img src="/icons/settings.svg" alt=""></button></header>
    ${!state.active && state.view === 'rug' ? '<button class="stats-button" id="openStats" type="button" aria-label="查看专注统计" title="专注统计"><img src="/icons/paw-chart.svg" alt=""></button><button class="reminders-button" id="openReminders" type="button" aria-label="打开提醒事项" title="提醒事项"><img src="/icons/reminder-list.svg" alt=""></button>' : ''}
    <section class="focus-panel" aria-live="polite">${focusControl}<p class="room-note">${state.note}</p></section>
    ${state.active ? '<div class="finish-slider" id="finishSlider"><div class="finish-track"><span class="finish-track-copy">右滑放弃</span><span class="finish-track-chevron" aria-hidden="true">››</span><input id="finishFocus" type="range" min="0" max="100" value="0" aria-label="向右滑动铃铛提前结束专注"></div></div>' : ''}
    <aside class="collection-drawer" id="collectionDrawer" aria-hidden="true"><div class="drawer-sheet"><div class="drawer-head"><div><p>我的收藏</p><h1>慢慢把房间填满</h1></div><button class="close-button" id="closeCollection" type="button" aria-label="关闭收藏">x</button></div><section class="owned-section"><span class="section-label">已经拥有</span><div class="owned-items"><span>虎斑白猫</span><span>圆地毯</span></div></section><section class="shop-section"><div class="section-title"><span>互动家具</span><small>售价待定</small></div><div class="collection-list">${furniture.map(([name, detail]) => `<article><div class="item-icon">+</div><div><h2>${name}</h2><p>${detail}</p></div><span>家具</span></article>`).join('')}</div></section><section class="shop-section"><div class="section-title"><span>更多猫咪</span><small>售价待定</small></div><div class="collection-list">${cats.map(([name, detail]) => `<article><div class="item-icon">+</div><div><h2>${name}</h2><p>${detail}</p></div><span>外观</span></article>`).join('')}</div></section><p class="drawer-foot">家具会带来新的猫咪日常；具体价格等内容数量确定后再一起调整。</p></div></aside>
    <aside class="settings-drawer ${state.settingsOpen ? 'open' : ''}" id="settingsDrawer" aria-hidden="${state.settingsOpen ? 'false' : 'true'}"><section class="settings-sheet" aria-labelledby="settingsTitle"><header class="settings-head"><div><p>系统设置</p><h1 id="settingsTitle">陪伴的声音</h1></div><button class="close-button" id="closeSettings" type="button" aria-label="关闭系统设置">x</button></header><div class="sound-setting"><div><label for="musicVolume">背景音乐</label><output id="musicVolumeValue">${state.musicVolume}%</output></div><input id="musicVolume" type="range" min="0" max="100" value="${state.musicVolume}" aria-label="背景音乐音量"></div><div class="sound-setting"><div><label for="catVolume">猫咪声音</label><output id="catVolumeValue">${state.catVolume}%</output></div><input id="catVolume" type="range" min="0" max="100" value="${state.catVolume}" aria-label="猫咪声音音量"></div><p class="settings-hint">新的陪伴选项会慢慢放在这里。</p></section></aside>
    ${renderReminderDrawer()}
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
  document.querySelector('#openReminders')?.addEventListener('click', openReminders);
  document.querySelector('#closeReminders')?.addEventListener('click', closeReminders);
  document.querySelector('#remindersDrawer')?.addEventListener('click', event => { if (event.target === event.currentTarget) closeReminders(); });
  document.querySelectorAll('[data-reminder-filter]').forEach(button => button.addEventListener('click', () => { state.completedClearOpen = false; state.reminderView = button.dataset.reminderFilter; render(); openReminders(); }));
  document.querySelector('#backToReminderOverview')?.addEventListener('click', () => { state.completedClearOpen = false; state.reminderView = 'overview'; render(); openReminders(); });
  document.querySelector('#openCompletedClear')?.addEventListener('click', () => { state.completedClearOpen = !state.completedClearOpen; render(); openReminders(); });
  document.querySelector('#clearAllCompleted')?.addEventListener('click', () => {
    state.reminders = state.reminders.filter(reminder => !reminder.completed);
    state.completedSubtasks = [];
    state.completedClearOpen = false;
    save();
    render();
    openReminders();
  });
  const rememberReminderScroll = () => { state.reminderReturnScrollTop = document.querySelector('.reminders-sheet')?.scrollTop || 0; };
  document.querySelector('#openReminderComposer')?.addEventListener('click', () => { rememberReminderScroll(); state.reminderEditingId = null; state.reminderComposerOpen = true; render(); openReminders(); });
  const togglePlanAdd = value => {
    const sheet = document.querySelector('.reminders-sheet');
    const scrollTop = sheet?.scrollTop || 0;
    state.planAddDate = state.planAddDate === value ? null : value;
    render();
    openReminders();
    requestAnimationFrame(() => { const nextSheet = document.querySelector('.reminders-sheet'); if (nextSheet) nextSheet.scrollTop = scrollTop; });
  };
  document.querySelectorAll('[data-plan-day]').forEach(button => button.addEventListener('click', () => togglePlanAdd(button.dataset.planDay)));
  document.querySelectorAll('[data-plan-period]').forEach(button => button.addEventListener('click', () => togglePlanAdd(button.dataset.planPeriod)));
  document.querySelectorAll('[data-plan-add]').forEach(button => button.addEventListener('click', () => { rememberReminderScroll(); state.planAddDate = button.dataset.planAdd; state.reminderEditingId = null; state.reminderComposerOpen = true; render(); openReminders(); }));
  const toggleTodayAdd = value => {
    const sheet = document.querySelector('.reminders-sheet');
    const scrollTop = sheet?.scrollTop || 0;
    state.todayAddPeriod = state.todayAddPeriod === value ? null : value;
    render();
    openReminders();
    requestAnimationFrame(() => { const nextSheet = document.querySelector('.reminders-sheet'); if (nextSheet) nextSheet.scrollTop = scrollTop; });
  };
  document.querySelectorAll('[data-today-period]').forEach(button => button.addEventListener('click', () => toggleTodayAdd(button.dataset.todayPeriod)));
  document.querySelectorAll('[data-today-add]').forEach(button => button.addEventListener('click', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    rememberReminderScroll();
    state.planAddDate = reminderDateValue(today.getTime());
    state.reminderEditingId = null;
    state.reminderComposerOpen = true;
    render();
    openReminders();
  }));
  document.querySelector('#closeReminderComposer')?.addEventListener('click', () => {
    const reminderScrollTop = state.reminderReturnScrollTop ?? 0;
    state.planAddDate = null;
    state.todayAddPeriod = null;
    state.reminderEditingId = null;
    state.reminderComposerOpen = false;
    render();
    openReminders();
    requestAnimationFrame(() => {
      const sheet = document.querySelector('.reminders-sheet');
      if (sheet) sheet.scrollTop = reminderScrollTop;
      state.reminderReturnScrollTop = null;
    });
  });
  document.querySelector('#reminderForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const reminderScrollTop = state.reminderReturnScrollTop ?? (document.querySelector('.reminders-sheet')?.scrollTop || 0);
    const title = document.querySelector('#reminderTitle').value.trim() || '新增事件提醒';
    const description = document.querySelector('#reminderDescription').value.trim();
    const subtasks = document.querySelector('#reminderSubtasks').value.split('\n').map(item => item.trim()).filter(Boolean);
    const at = new Date(`${document.querySelector('#reminderDate').value}T${document.querySelector('#reminderTime').value}`).getTime();
    const urgent = document.querySelector('#reminderUrgent')?.checked || false;
    const flagged = document.querySelector('#reminderFlagged')?.checked || false;
    const repeat = document.querySelector('#reminderRepeat').value;
    const repeatEvery = Number(document.querySelector('#reminderRepeatEvery')?.value) || 1;
    const repeatUnit = document.querySelector('#reminderRepeatUnit')?.value || 'day';
    const repeatEndAt = document.querySelector('#reminderRepeatEnd')?.value === 'date' ? document.querySelector('#reminderRepeatEndDate')?.value || '' : '';
    const advanceMode = document.querySelector('#reminderAdvance').value === 'custom' ? 'custom' : '';
    const advanceAmount = Number(document.querySelector('#reminderAdvanceAmount')?.value) || 1;
    const advanceUnit = document.querySelector('#reminderAdvanceUnit')?.value || 'minute';
    const advanceMinutes = advanceMode ? advanceAmount * ({ minute: 1, hour: 60, day: 1440, week: 10080, month: 43200 }[advanceUnit] || 1) : Number(document.querySelector('#reminderAdvance').value);
    if (!Number.isFinite(at) || at <= Date.now()) return;
    const reminder = state.reminders.find(item => item.id === state.reminderEditingId);
    if (reminder) {
      cancelReminderNotification(reminder);
      reminder.title = title;
      reminder.description = description;
      reminder.subtasks = subtasks;
      reminder.at = at;
      reminder.flagged = flagged;
      reminder.urgent = urgent;
      reminder.repeat = repeat;
      reminder.repeatEvery = repeatEvery;
      reminder.repeatUnit = repeatUnit;
      reminder.repeatEndAt = repeatEndAt;
      reminder.advanceMinutes = advanceMinutes;
      reminder.advanceMode = advanceMode;
      reminder.advanceAmount = advanceAmount;
      reminder.advanceUnit = advanceUnit;
    } else {
      state.reminders.push({ id: nextReminderId(), title, description, subtasks, at, completed: false, flagged, urgent, repeat, repeatEvery, repeatUnit, repeatEndAt, advanceMinutes, advanceMode, advanceAmount, advanceUnit });
    }
    const savedReminder = reminder || state.reminders[state.reminders.length - 1];
    save();
    void scheduleReminderNotification(savedReminder);
    state.reminderComposerOpen = false;
    state.reminderEditingId = null;
    state.reminderSwipeId = null;
    state.planAddDate = null;
    state.todayAddPeriod = null;
    state.reminderView = isSameReminderDay(savedReminder.at) ? 'today' : 'planned';
    render();
    openReminders();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const sheet = document.querySelector('.reminders-sheet');
      if (sheet) sheet.scrollTop = reminderScrollTop;
      state.reminderReturnScrollTop = null;
    }));
  });
  const closeReminderPicker = () => document.querySelector('#reminderPicker')?.remove();
  const openReminderDatePicker = () => {
    closeReminderPicker();
    const input = document.querySelector('#reminderDate');
    let view = new Date(`${input.value}T00:00`);
    const composer = document.querySelector('.reminder-composer');
    composer.insertAdjacentHTML('beforeend', '<section class="reminder-picker" id="reminderPicker"><header><button class="reminder-back" id="closeReminderPicker" type="button" aria-label="返回提醒编辑">‹</button><h2>选择日期</h2></header><div id="reminderPickerContent"></div></section>');
    const picker = document.querySelector('#reminderPicker');
    let dateMode = 'calendar';
    let yearStart = view.getFullYear() - 5;
    const draw = () => {
      const year = view.getFullYear();
      const month = view.getMonth();
      if (dateMode === 'year') {
        const years = Array.from({ length: 12 }, (_, index) => yearStart + index).map(value => `<button class="${year === value ? 'is-selected' : ''}" type="button" data-reminder-year-choice="${value}">${value}年</button>`).join('');
        picker.querySelector('#reminderPickerContent').innerHTML = `<div class="reminder-date-nav"><button type="button" data-reminder-year-step="-12" aria-label="上一组年份">‹</button><strong>选择年份</strong><button type="button" data-reminder-year-step="12" aria-label="下一组年份">›</button></div><div class="reminder-date-quick-grid">${years}</div>`;
        picker.querySelectorAll('[data-reminder-year-step]').forEach(button => button.addEventListener('click', () => { yearStart += Number(button.dataset.reminderYearStep); draw(); }));
        picker.querySelectorAll('[data-reminder-year-choice]').forEach(button => button.addEventListener('click', () => { view = new Date(Number(button.dataset.reminderYearChoice), month, 1); dateMode = 'calendar'; draw(); }));
        return;
      }
      if (dateMode === 'month') {
        const months = Array.from({ length: 12 }, (_, index) => `<button class="${month === index ? 'is-selected' : ''}" type="button" data-reminder-month-choice="${index}">${index + 1}月</button>`).join('');
        picker.querySelector('#reminderPickerContent').innerHTML = `<div class="reminder-date-nav"><button type="button" data-reminder-date-mode="calendar" aria-label="返回月历">‹</button><strong>${year}年</strong><span></span></div><div class="reminder-date-quick-grid">${months}</div>`;
        picker.querySelector('[data-reminder-date-mode]')?.addEventListener('click', () => { dateMode = 'calendar'; draw(); });
        picker.querySelectorAll('[data-reminder-month-choice]').forEach(button => button.addEventListener('click', () => { view = new Date(year, Number(button.dataset.reminderMonthChoice), 1); dateMode = 'calendar'; draw(); }));
        return;
      }
      const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
      const days = new Date(year, month + 1, 0).getDate();
      const cells = Array.from({ length: firstWeekday + days }, (_, index) => {
        if (index < firstWeekday) return '<span></span>';
        const day = index - firstWeekday + 1;
        const value = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return `<button class="${input.value === value ? 'is-selected' : ''}" type="button" data-reminder-date-choice="${value}">${day}</button>`;
      }).join('');
      picker.querySelector('#reminderPickerContent').innerHTML = `<div class="reminder-date-nav"><button type="button" data-reminder-date-step="-1" aria-label="上个月">‹</button><strong><button type="button" data-reminder-date-mode="year">${year}年</button><button type="button" data-reminder-date-mode="month">${month + 1}月</button></strong><button type="button" data-reminder-date-step="1" aria-label="下个月">›</button></div><div class="reminder-picker-weekdays"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div><div class="reminder-picker-calendar">${cells}</div>`;
      picker.querySelectorAll('[data-reminder-date-step]').forEach(button => button.addEventListener('click', () => { view = new Date(year, month + Number(button.dataset.reminderDateStep), 1); draw(); }));
      picker.querySelectorAll('[data-reminder-date-mode]').forEach(button => button.addEventListener('click', () => { dateMode = button.dataset.reminderDateMode; yearStart = year - 5; draw(); }));
      picker.querySelectorAll('[data-reminder-date-choice]').forEach(button => button.addEventListener('click', () => { input.value = button.dataset.reminderDateChoice; document.querySelector('#reminderDateLabel').textContent = reminderDateLabel(input.value); closeReminderPicker(); }));
    };
    draw();
    picker.querySelector('#closeReminderPicker').addEventListener('click', closeReminderPicker);
  };
  const openReminderTimePicker = () => {
    closeReminderPicker();
    const input = document.querySelector('#reminderTime');
    let [hour, minute] = input.value.split(':').map(Number);
    const composer = document.querySelector('.reminder-composer');
    composer.insertAdjacentHTML('beforeend', '<section class="reminder-picker" id="reminderPicker"><header><button class="reminder-back" id="closeReminderPicker" type="button" aria-label="返回提醒编辑">‹</button><h2>选择时间</h2></header><div class="reminder-time-picker"><div class="reminder-time-head"><span>时</span><span>分</span></div><div class="reminder-time-columns" id="reminderTimeColumns"></div></div></section>');
    const picker = document.querySelector('#reminderPicker');
    const draw = () => {
      picker.querySelector('#reminderTimeColumns').innerHTML = `<div>${Array.from({ length: 24 }, (_, value) => `<button class="${hour === value ? 'is-selected' : ''}" type="button" data-reminder-hour="${value}">${String(value).padStart(2, '0')}</button>`).join('')}</div><div>${Array.from({ length: 60 }, (_, value) => `<button class="${minute === value ? 'is-selected' : ''}" type="button" data-reminder-minute="${value}">${String(value).padStart(2, '0')}</button>`).join('')}</div>`;
      picker.querySelectorAll('[data-reminder-hour]').forEach(button => button.addEventListener('click', () => { hour = Number(button.dataset.reminderHour); input.value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`; document.querySelector('#reminderTimeLabel').textContent = input.value; draw(); }));
      picker.querySelectorAll('[data-reminder-minute]').forEach(button => button.addEventListener('click', () => { minute = Number(button.dataset.reminderMinute); input.value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`; document.querySelector('#reminderTimeLabel').textContent = input.value; draw(); }));
      picker.querySelector('.is-selected')?.scrollIntoView({ block: 'center' });
    };
    draw();
    picker.querySelector('#closeReminderPicker').addEventListener('click', closeReminderPicker);
  };
  document.querySelector('#openReminderDate')?.addEventListener('click', openReminderDatePicker);
  document.querySelector('#openReminderTime')?.addEventListener('click', openReminderTimePicker);
  document.querySelector('#reminderDescription')?.setAttribute('placeholder', '备注');
  document.querySelector('#reminderDate')?.addEventListener('change', event => { document.querySelector('#reminderDateLabel').textContent = reminderDateLabel(event.target.value); });
  document.querySelector('#reminderTime')?.addEventListener('change', event => { document.querySelector('#reminderTimeLabel').textContent = event.target.value; });
  const subtaskInput = document.querySelector('#reminderSubtasks');
  const subtaskField = subtaskInput?.closest('.reminder-field');
  const decodeSubtasks = value => value.split('\n').filter(Boolean).map(line => ({ title: line.replace(/^\[done\]\s*/, ''), completed: line.startsWith('[done] ') }));
  const encodeSubtasks = items => items.map(item => `${item.completed ? '[done] ' : ''}${item.title.trim()}`).filter(Boolean).join('\n');
  const updateSubtaskSummary = () => {
    const count = decodeSubtasks(subtaskInput.value).length;
    document.querySelector('[data-subtask-count]')?.replaceChildren(document.createTextNode(count ? `${count} 项` : '添加子任务'));
  };
  if (subtaskField) {
    subtaskField.classList.add('is-subtask-field');
    subtaskInput.classList.add('subtask-storage');
    subtaskField.insertAdjacentHTML('beforeend', '<button class="reminder-subtask-entry" id="openSubtaskEditor" type="button"><span>子任务</span><b data-subtask-count></b><i>›</i></button>');
    updateSubtaskSummary();
  }
  document.querySelector('#openSubtaskEditor')?.addEventListener('click', () => {
    const composer = document.querySelector('.reminder-composer');
    const items = decodeSubtasks(subtaskInput.value);
    composer.insertAdjacentHTML('beforeend', '<section class="reminder-subtasks-editor" id="reminderSubtasksEditor"><header><button class="reminder-back" id="closeSubtaskEditor" type="button" aria-label="返回提醒编辑">‹</button><h2>子任务</h2></header><div class="reminder-subtask-list" id="reminderSubtaskList"></div><div class="reminder-subtask-add"><input id="newSubtaskTitle" type="text" maxlength="60" placeholder="添加一个子任务"><button id="addSubtaskItem" type="button">添加</button></div></section>');
    const editor = document.querySelector('#reminderSubtasksEditor');
    const drawSubtasks = () => {
      const list = editor.querySelector('#reminderSubtaskList');
      list.innerHTML = items.map((item, index) => `<div class="reminder-subtask-row"><button class="reminder-subtask-check ${item.completed ? 'is-complete' : ''}" type="button" data-subtask-toggle="${index}" aria-label="${item.completed ? '恢复' : '完成'}子任务">${item.completed ? '✓' : ''}</button><input type="text" maxlength="60" value="${escapeHtml(item.title)}" data-subtask-title="${index}"><button class="reminder-subtask-remove" type="button" data-subtask-remove="${index}" aria-label="删除子任务"><img src="/icons/trash-2.svg" alt=""></button></div>`).join('') || '<p class="reminder-subtask-empty">还没有子任务。</p>';
      list.querySelectorAll('[data-subtask-toggle]').forEach(button => button.addEventListener('click', () => { items[Number(button.dataset.subtaskToggle)].completed = !items[Number(button.dataset.subtaskToggle)].completed; drawSubtasks(); }));
      list.querySelectorAll('[data-subtask-title]').forEach(input => input.addEventListener('input', () => { items[Number(input.dataset.subtaskTitle)].title = input.value; }));
      list.querySelectorAll('[data-subtask-remove]').forEach(button => button.addEventListener('click', () => { items.splice(Number(button.dataset.subtaskRemove), 1); drawSubtasks(); }));
    };
    const closeEditor = () => { subtaskInput.value = encodeSubtasks(items); updateSubtaskSummary(); editor.remove(); };
    drawSubtasks();
    editor.querySelector('#closeSubtaskEditor').addEventListener('click', closeEditor);
    editor.querySelector('#addSubtaskItem').addEventListener('click', () => {
      const input = editor.querySelector('#newSubtaskTitle');
      const title = input.value.trim();
      if (!title) return;
      items.push({ title, completed: false });
      input.value = '';
      drawSubtasks();
      input.focus();
    });
    editor.querySelector('#newSubtaskTitle').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); editor.querySelector('#addSubtaskItem').click(); } });
  });
  const repeatSelect = document.querySelector('#reminderRepeat');
  const advanceSelect = document.querySelector('#reminderAdvance');
  const addReminderSettingLabel = (select, label, icon) => {
    const field = select?.closest('label');
    if (!field || field.querySelector('.reminder-setting-label')) return;
    [...field.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).forEach(node => node.remove());
    field.insertAdjacentHTML('afterbegin', `<span class="reminder-setting-label"><img class="reminder-option-icon" src="/icons/${icon}" alt="">${label}</span>`);
  };
  const addSelectOptions = (select, options) => {
    if (!select) return;
    options.forEach(([value, label]) => {
      if (!select.querySelector(`option[value="${value}"]`)) select.insertAdjacentHTML('beforeend', `<option value="${value}">${label}</option>`);
    });
  };
  addReminderSettingLabel(repeatSelect, '重复', 'repeat.svg');
  addReminderSettingLabel(advanceSelect, '提前提醒', 'bell.svg');
  addSelectOptions(repeatSelect, [['hourly', '每小时'], ['weekdays', '工作日'], ['weekends', '周末'], ['biweekly', '每两周'], ['quarterly', '每 3 个月'], ['semiannual', '每 6 个月']]);
  addSelectOptions(advanceSelect, [['2880', '提前 2 天'], ['10080', '提前 1 周'], ['43200', '提前 1 个月']]);
  const advanceUnitSelect = document.querySelector('#reminderAdvanceUnit');
  addSelectOptions(advanceUnitSelect, [['month', '个月']]);
  const neverOption = repeatSelect?.querySelector('option[value="none"]');
  const noneOption = advanceSelect?.querySelector('option[value="0"]');
  if (neverOption) neverOption.textContent = '永不';
  if (noneOption) noneOption.textContent = '无';
  [repeatSelect, advanceSelect].forEach(select => {
    const custom = select?.querySelector('option[value="custom"]');
    if (custom) select.append(custom);
  });
  const repeatCustomPanel = document.querySelector('#repeatCustomPanel');
  const advanceCustomPanel = document.querySelector('#advanceCustomPanel');
  repeatSelect?.closest('label')?.after(repeatCustomPanel);
  advanceSelect?.closest('label')?.after(advanceCustomPanel);
  const currentEditingReminder = state.reminders.find(item => item.id === state.reminderEditingId);
  if (currentEditingReminder?.repeat) repeatSelect.value = currentEditingReminder.repeat;
  if (currentEditingReminder?.advanceMode !== 'custom' && Number.isFinite(currentEditingReminder?.advanceMinutes)) advanceSelect.value = String(currentEditingReminder.advanceMinutes);
  document.querySelector('#reminderRepeat')?.addEventListener('change', event => { repeatCustomPanel.hidden = event.target.value !== 'custom'; });
  document.querySelector('#reminderAdvance')?.addEventListener('change', event => { advanceCustomPanel.hidden = event.target.value !== 'custom'; });
  document.querySelector('#reminderRepeatEnd')?.addEventListener('change', event => { document.querySelector('#reminderRepeatEndDate').hidden = event.target.value !== 'date'; });
  document.querySelectorAll('[data-reminder-toggle]').forEach(button => button.addEventListener('click', () => {
    const reminder = state.reminders.find(item => item.id === Number(button.dataset.reminderToggle));
    if (!reminder) return;
    reminder.completed = !reminder.completed;
    if (reminder.completed) cancelReminderNotification(reminder);
    else void scheduleReminderNotification(reminder);
    save();
    render();
    openReminders();
  }));
  document.querySelectorAll('[data-reminder-edit]').forEach(button => button.addEventListener('click', () => {
    state.reminderEditingId = Number(button.dataset.reminderEdit);
    state.reminderSwipeId = null;
    state.reminderComposerOpen = true;
    render();
    openReminders();
  }));
  document.querySelectorAll('[data-reminder-mark]').forEach(button => button.addEventListener('click', () => {
    const reminder = state.reminders.find(item => item.id === Number(button.dataset.reminderMark));
    if (!reminder) return;
    reminder.flagged = !reminder.flagged;
    state.reminderSwipeId = null;
    save();
    render();
    openReminders();
  }));
  document.querySelectorAll('[data-reminder-delete]').forEach(button => button.addEventListener('click', () => {
    const index = state.reminders.findIndex(item => item.id === Number(button.dataset.reminderDelete));
    if (index < 0) return;
    cancelReminderNotification(state.reminders[index]);
    state.reminders.splice(index, 1);
    save();
    render();
    openReminders();
  }));
  document.querySelectorAll('[data-reminder-row]').forEach(row => {
    const reminder = state.reminders.find(item => item.id === Number(row.dataset.reminderRow));
    const subtasks = Array.isArray(reminder?.subtasks) ? reminder.subtasks.filter(item => item && !item.startsWith('[done] ')) : [];
    if (state.reminderView === 'all' || !reminder || !subtasks.length) return;
    row.querySelector('.reminder-time')?.insertAdjacentHTML('beforeend', `<button class="reminder-subtask-link" type="button" data-reminder-subtasks="${reminder.id}">${subtasks.length} 个子任务</button>`);
  });
  document.querySelectorAll('[data-reminder-subtasks]').forEach(button => button.addEventListener('click', () => {
    const reminder = state.reminders.find(item => item.id === Number(button.dataset.reminderSubtasks));
    if (!reminder) return;
    const items = (reminder.subtasks || []).filter(item => item && !item.startsWith('[done] ')).map(line => ({ title: line.replace(/^\[done\]\s*/, '') }));
    const sheet = document.querySelector('.reminders-sheet');
    sheet.insertAdjacentHTML('beforeend', '<section class="reminder-subtasks-editor reminder-list-subtasks-editor" id="reminderListSubtasksEditor"><header><button class="reminder-back" id="closeReminderListSubtasks" type="button" aria-label="返回提醒列表">‹</button><h2>子任务</h2></header><div class="reminder-subtask-list" id="reminderListSubtaskItems"></div></section>');
    const editor = document.querySelector('#reminderListSubtasksEditor');
    const drawItems = () => {
      const list = editor.querySelector('#reminderListSubtaskItems');
      list.innerHTML = items.map((item, index) => `<div class="reminder-subtask-row ${item.completing ? 'is-completing' : ''}"><button class="reminder-subtask-check ${item.completing ? 'is-complete' : ''}" type="button" data-list-subtask-toggle="${index}" aria-label="完成子任务" ${item.completing ? 'disabled' : ''}>${item.completing ? '✓' : ''}</button><strong>${escapeHtml(item.title)}</strong></div>`).join('') || '<p class="reminder-subtask-empty">子任务已全部完成。</p>';
      list.querySelectorAll('[data-list-subtask-toggle]').forEach(toggle => toggle.addEventListener('click', () => {
        const index = Number(toggle.dataset.listSubtaskToggle);
        const completingSubtask = items[index];
        if (!completingSubtask || completingSubtask.completing) return;
        completingSubtask.completing = true;
        drawItems();
        setTimeout(() => {
          const completingIndex = items.indexOf(completingSubtask);
          if (completingIndex < 0) return;
          const [completedSubtask] = items.splice(completingIndex, 1);
          state.completedSubtasks = state.completedSubtasks || [];
          state.completedSubtasks.unshift({ id: Date.now(), title: completedSubtask.title, parentTitle: reminder.title, completedAt: Date.now() });
          reminder.subtasks = items.map(item => item.title);
          save();
          document.querySelectorAll(`[data-reminder-subtasks="${reminder.id}"]`).forEach(link => {
            if (items.length) link.textContent = `${items.length} 个子任务`;
            else link.remove();
          });
          drawItems();
        }, 3000);
      }));
    };
    drawItems();
    editor.querySelector('#closeReminderListSubtasks').addEventListener('click', () => editor.remove());
  }));
  document.querySelectorAll('[data-reminder-inline-toggle]').forEach(button => button.addEventListener('click', () => {
    const sheet = document.querySelector('.reminders-sheet');
    const scrollTop = sheet?.scrollTop || 0;
    const reminderId = Number(button.dataset.reminderInlineToggle);
    state.reminderExpandedId = state.reminderExpandedId === reminderId ? null : reminderId;
    render();
    openReminders();
    requestAnimationFrame(() => { const nextSheet = document.querySelector('.reminders-sheet'); if (nextSheet) nextSheet.scrollTop = scrollTop; });
  }));
  document.querySelectorAll('[data-reminder-row]').forEach(row => {
    let startX = null;
    row.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      startX = event.clientX;
    });
    row.addEventListener('pointerup', event => {
      if (startX == null) return;
      const deltaX = event.clientX - startX;
      startX = null;
      const reminderId = Number(row.dataset.reminderRow);
      if (deltaX < -32) state.reminderSwipeId = reminderId;
      else if (deltaX > 32 || state.reminderSwipeId === reminderId) state.reminderSwipeId = null;
      else return;
      const reminderScrollTop = document.querySelector('.reminders-sheet')?.scrollTop || 0;
      render();
      openReminders();
      requestAnimationFrame(() => {
        const sheet = document.querySelector('.reminders-sheet');
        if (sheet) sheet.scrollTop = reminderScrollTop;
      });
    });
    row.addEventListener('pointercancel', () => { startX = null; });
  });
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
  if (!state.active && state.view === 'rug' && !reminderReactionPlaying) startLobbySequence();
}
function clearCatVideo() {
  clearTimeout(catPauseTimer);
  clearTimeout(catPlaybackTimer);
  cancelAnimationFrame(catChromaFrame);
  activeChromaVideo?.pause();
  activeChromaVideo = undefined;
  document.querySelector('#catChromaCanvas')?.classList.remove('is-active');
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
function playChromaCatVideo(action, onEnded) {
  const canvas = document.querySelector('#catChromaCanvas');
  if (!canvas) return onEnded?.();
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const video = document.createElement('video');
  activeChromaVideo = video;
  video.src = action.source;
  video.muted = true;
  video.playsInline = true;
  video.addEventListener('loadeddata', () => {
    if (activeChromaVideo !== video) return;
    canvas.width = 480;
    canvas.height = 270;
    canvas.classList.add('is-active');
    const drawFrame = () => {
      if (activeChromaVideo !== video) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < frame.data.length; index += 4) {
        const red = frame.data[index];
        const green = frame.data[index + 1];
        const blue = frame.data[index + 2];
        const greenLead = green - Math.max(red, blue);
        if (green > 78 && greenLead > 18) frame.data[index + 3] = Math.max(0, Math.min(255, (42 - greenLead) * 8));
      }
      context.putImageData(frame, 0, 0);
      catChromaFrame = requestAnimationFrame(drawFrame);
    };
    playCatWakeSound(action.sound);
    video.play().catch(() => {});
    drawFrame();
  }, { once: true });
  video.addEventListener('ended', () => {
    if (activeChromaVideo !== video) return;
    cancelAnimationFrame(catChromaFrame);
    canvas.classList.remove('is-active');
    activeChromaVideo = undefined;
    onEnded?.();
  }, { once: true });
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
  nextVideo.onloadeddata = () => {
    if (activeCatPlayback !== playbackId) return;
    nextVideo.loop = loop;
    nextVideo.currentTime = 0;
    currentVideo?.pause();
    currentVideo?.classList.remove('is-active');
    nextVideo.classList.add('is-active');
    activeCatSlot = nextSlot;
    if (action?.sound) playCatWakeSound(action.sound);
    nextVideo.play().catch(() => {});
    if (!loop) {
      catPlaybackTimer = setTimeout(() => {
        if (activeCatPlayback !== playbackId) return;
        onEnded?.();
      }, action?.duration || 5000);
    }
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
function openReminders() { state.remindersOpen = true; const drawer = document.querySelector('#remindersDrawer'); drawer?.classList.add('open'); drawer?.setAttribute('aria-hidden', 'false'); }
function closeReminders() { state.remindersOpen = false; state.reminderView = 'overview'; state.reminderComposerOpen = false; state.reminderEditingId = null; state.reminderSwipeId = null; state.completedClearOpen = false; const drawer = document.querySelector('#remindersDrawer'); drawer?.classList.remove('open'); drawer?.setAttribute('aria-hidden', 'true'); }
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
initializeReminderNotifications();
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncFocusClock(); });

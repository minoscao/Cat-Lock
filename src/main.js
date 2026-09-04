const DEFAULT_FOCUS_SECONDS = 13 * 60;
const SIT_PHASE_SECONDS = 5 * 60;
const PRONE_SLEEP_PHASE_SECONDS = 3 * 60;
const STORAGE_KEY = 'cat-companion-focus-v1';
const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
const LANGUAGE_META = {
  'zh-CN': { tag: 'zh-CN', font: 'ZCOOL KuaiLe' },
  en: { tag: 'en-US', font: 'DynaPuff' },
  ms: { tag: 'ms-MY', font: 'DynaPuff' }
};
const COPY = {
  'zh-CN': {
    settings: '系统设置', language: '语言', music: '背景音乐', catSound: '猫咪声音',
    profile: '你的小档案', nickname: '昵称', nicknamePlaceholder: '猫咪怎么称呼你？', birthday: '生日', birthdayHint: '生日惊喜会在以后慢慢出现。',
    settingsHint: '语言、音量和小档案都会保存在这台设备上。', reminder: '提醒事项', focus: '专注', minutes: '分钟', today: '今天', tomorrow: '明天', yesterday: '昨天', beforeYesterday: '前天', afterTomorrow: '后天',
    hourly: '每小时', daily: '每天', weekly: '每周', monthly: '每月', weekdays: '工作日', weekends: '周末', biweekly: '每两周', quarterly: '每 3 个月', semiannual: '每 6 个月',
    completedAt: '完成时间：', notify: '提醒事项', nicknameFallback: '主人',
    settlementComplete: '哇，太棒啦！{cat}陪{owner}完成了任务，干得漂亮喵~', settlementEarly: '{owner}，{cat}陪你先休息一下也没关系，下次我们一定能一起坚持到最后喵~', settlementGift: '送你', settlementReceive: '开心收下', settlementContinue: '下次继续'
  },
  en: {
    settings: 'Settings', language: 'Language', music: 'Background music', catSound: 'Cat sounds',
    profile: 'About you', nickname: 'Nickname', nicknamePlaceholder: 'What should kitty call you?', birthday: 'Birthday', birthdayHint: 'Birthday surprises will arrive in a future update.',
    settingsHint: 'Language, sound, and profile details stay on this device.', reminder: 'Reminder', focus: 'Focus', minutes: 'min', today: 'Today', tomorrow: 'Tomorrow', yesterday: 'Yesterday', beforeYesterday: 'Two days ago', afterTomorrow: 'The day after tomorrow',
    hourly: 'Every hour', daily: 'Every day', weekly: 'Every week', monthly: 'Every month', weekdays: 'Weekdays', weekends: 'Weekends', biweekly: 'Every two weeks', quarterly: 'Every 3 months', semiannual: 'Every 6 months',
    completedAt: 'Completed: ', notify: 'Reminder', nicknameFallback: 'friend',
    settlementComplete: 'Wow, amazing! {cat} helped {owner} finish the task. Great job, meow~', settlementEarly: 'It is okay to rest a while, {owner}. {cat} will be here with you. We will make it to the end together next time, meow~', settlementGift: 'A gift for you', settlementReceive: 'Gladly accept', settlementContinue: 'Keep going'
  },
  ms: {
    settings: 'Tetapan', language: 'Bahasa', music: 'Muzik latar', catSound: 'Suara si comel',
    profile: 'Tentang awak', nickname: 'Nama panggilan', nicknamePlaceholder: 'Si comel patut panggil awak apa?', birthday: 'Hari jadi', birthdayHint: 'Kejutan hari jadi akan hadir dalam kemas kini akan datang.',
    settingsHint: 'Bahasa, bunyi dan maklumat peribadi disimpan pada peranti ini.', reminder: 'Peringatan', focus: 'Fokus', minutes: 'min', today: 'Hari ini', tomorrow: 'Esok', yesterday: 'Semalam', beforeYesterday: 'Dua hari lepas', afterTomorrow: 'Lusa',
    hourly: 'Setiap jam', daily: 'Setiap hari', weekly: 'Setiap minggu', monthly: 'Setiap bulan', weekdays: 'Hari bekerja', weekends: 'Hujung minggu', biweekly: 'Setiap dua minggu', quarterly: 'Setiap 3 bulan', semiannual: 'Setiap 6 bulan',
    completedAt: 'Selesai: ', notify: 'Peringatan', nicknameFallback: 'kawan',
    settlementComplete: 'Wah, hebatnya! {cat} menemani {owner} menyiapkan tugasan. Hebat, meow~', settlementEarly: 'Tidak mengapa untuk berehat dulu, {owner}. {cat} akan menemani awak. Lain kali kita akan sampai ke penghujung bersama, meow~', settlementGift: 'Hadiah untuk awak', settlementReceive: 'Terima dengan gembira', settlementContinue: 'Teruskan lagi'
  }
};
function copy(key) { return COPY[state.locale]?.[key] || COPY['zh-CN'][key] || key; }
function localeTag() { return LANGUAGE_META[state.locale]?.tag || 'zh-CN'; }
function ownerName() { return state.ownerName?.trim() || copy('nicknameFallback'); }
function catName() { return state.catName?.trim() || (state.locale === 'en' ? 'Kitty' : state.locale === 'ms' ? 'Si comel' : '咪咪'); }
function settlementCopy(key) { return copy(key).replace('{owner}', escapeHtml(ownerName())).replace('{cat}', escapeHtml(catName())); }
function catReminderCopy(title) {
  if (state.locale === 'en') return `Hey ${ownerName()}, kitty says it is time for ${title}.`;
  if (state.locale === 'ms') return `${ownerName()}, si comel kata sudah tiba masa untuk: ${title}.`;
  return `${ownerName()}，小猫提醒你：${title}`;
}
function reminderLeadTime(reminder) {
  const minutes = Math.max(0, Math.ceil((reminder.at - Date.now()) / 60000));
  if (state.locale === 'en') return minutes ? `${minutes} minute${minutes === 1 ? '' : 's'} to go` : 'it is time now';
  if (state.locale === 'ms') return minutes ? `tinggal ${minutes} minit` : 'sudah tiba masanya';
  return minutes ? `还剩 ${minutes} 分钟` : '已经到时间了';
}
function bellReminderCopy(reminder) {
  const title = reminderTitleLabel(reminder.title);
  if (state.locale === 'en') return `${ownerName()}, ${catName()} says: ${title} is ${reminderLeadTime(reminder)}. Time to get ready, meow~`;
  if (state.locale === 'ms') return `${ownerName()}, ${catName()} ingatkan: ${reminderLeadTime(reminder)} sebelum ${title}. Jom bersiap, meow~`;
  if (reminder.at <= Date.now() || !(Number(reminder.advanceMinutes) > 0)) return `${ownerName()}，${catName()}提醒你：[${title}]已经到时间了，抓紧行动起来吧喵~`;
  return `${ownerName()}，${catName()}提醒你：离[${title}]${reminderLeadTime(reminder)}，抓紧行动起来吧喵~`;
}
function subtaskCountLabel(count) {
  if (state.locale === 'en') return `${count} ${count === 1 ? 'subtask' : 'subtasks'}`;
  if (state.locale === 'ms') return `${count} subtugas`;
  return `${count} 个子任务`;
}
function defaultReminderTitle() {
  return state.locale === 'en' ? 'New reminder' : state.locale === 'ms' ? 'Peringatan baharu' : '新增事件提醒';
}
function yearMonthLabel(date) {
  if (state.locale === 'zh-CN') return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  return new Intl.DateTimeFormat(localeTag(), { year: 'numeric', month: 'long' }).format(date);
}
function pickerWeekdays() {
  if (state.locale === 'zh-CN') return ['一', '二', '三', '四', '五', '六', '日'];
  const monday = new Date(2026, 7, 3);
  return Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(localeTag(), { weekday: 'short' }).format(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index)));
}
function pickerUnit(type) {
  if (state.locale === 'en') return type === 'hour' ? 'Hour' : 'Minute';
  if (state.locale === 'ms') return type === 'hour' ? 'Jam' : 'Minit';
  return type === 'hour' ? '时' : '分';
}
function reminderTitleLabel(title) {
  return title === '新增事件提醒' ? defaultReminderTitle() : title;
}
function completedItemsLabel(count) {
  if (state.locale === 'en') return `${count} completed`;
  if (state.locale === 'ms') return `${count} selesai`;
  return `${count} 项完成`;
}
function fromReminderLabel(title) {
  if (state.locale === 'en') return `From: ${title}`;
  if (state.locale === 'ms') return `Daripada: ${title}`;
  return `来自：${title}`;
}
function monthSectionLabel(date, isFirst) {
  if (state.locale === 'zh-CN') return isFirst ? `${date.getMonth() + 1}月其他时间` : `${date.getFullYear() === new Date().getFullYear() ? '' : `${date.getFullYear()}年`}${date.getMonth() + 1}月`;
  return isFirst ? `${new Intl.DateTimeFormat(localeTag(), { month: 'long' }).format(date)} ${state.locale === 'ms' ? 'dan seterusnya' : 'and later'}` : yearMonthLabel(date);
}
function localeCalendarDay(date) {
  if (state.locale === 'zh-CN') {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return `${date.getFullYear() === new Date().getFullYear() ? '' : `${date.getFullYear()}年`}${date.getMonth() + 1}月${date.getDate()}日 周${weekdays[date.getDay()]}`;
  }
  return new Intl.DateTimeFormat(localeTag(), {
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    month: 'short', day: 'numeric', weekday: 'short'
  }).format(date);
}
const STATIC_COPY = {
  en: {
    '我的收藏': 'My collection', '慢慢把房间填满': 'Make this room yours', '已经拥有': 'Already yours', '虎斑白猫': 'Tabby cat', '圆地毯': 'Round rug', '互动家具': 'Interactive furniture', '售价待定': 'Coming soon', '家具': 'Furniture', '更多猫咪': 'More cats', '外观': 'Look',
    '这段时间，你做得很好。': 'You did wonderfully.', '小鱼干 +1': 'Fish treat +1', '开始': 'Start', '确定': 'Done', '分钟': 'minutes', '右滑放弃': 'Slide to stop', '例如：整理今天的方案': 'Ex. Plan today',
    '提醒事项': 'Reminders', '重要的事小猫替你记着': 'Kitty remembers what matters', '今天': 'Today', '计划': 'Schedule', '全部': 'All', '标记': 'Flagged', '紧急': 'Urgent', '完成': 'Completed', '清除': 'Clear', '已逾期': 'Overdue', '上午': 'Morning', '下午': 'Afternoon', '晚上': 'Evening',
    '新建提醒': 'New reminder', '编辑提醒': 'Edit reminder', '改一改提醒内容': 'Make this reminder yours', '让小猫准时叫你': 'Let kitty remind you on time', '标题': 'Title', '事件内容': 'Note', '日期': 'Date', '时间': 'Time', '事件子任务': 'Subtasks', '紧急提醒': 'Urgent reminder', '标记提醒': 'Mark reminder', '是否重复': 'Repeat', '提前提醒': 'Early reminder', '不重复': 'Does not repeat', '每天': 'Every day', '每周': 'Every week', '每月': 'Every month', '自定义': 'Custom', '准时提醒': 'At time of reminder', '保存修改': 'Save changes', '添加提醒': 'Add reminder', '子任务': 'Subtasks', '添加': 'Add',
    '点选分类，查看小猫替你记住的事。': 'Choose a list to see what kitty is keeping safe for you.', '这里暂时没有提醒。': 'Nothing waiting here yet.', '还没有完成项目。': 'No completed reminders yet.',
    '专注统计': 'Focus stats', '小猫陪你走过的时光': 'Time spent together', '日': 'Day', '最近7天': 'Last 7 days', '月': 'Month', '年': 'Year', '当日专注记录': 'Today\'s focus', '最近完成': 'Recently completed',
    '沙发': 'Sofa', '猫爬架': 'Cat tree', '橘猫': 'Orange cat', '灰猫': 'Grey cat', '三花': 'Calico cat', '霸占座位、靠着抱枕、睡到四脚朝天。': 'Claim the best seat, lean on cushions, nap without a care.', '看窗外、待在高处、抓抓柱子。': 'Watch the window, perch up high, and scratch away.', '暖暖的短毛橘猫外观。': 'A warm, short-haired orange coat.', '安静的烟灰色短毛猫外观。': 'A calm, smoky-grey short-haired coat.', '不规则斑块的三花猫外观。': 'A playful calico coat with uneven patches.',
    '每小时': 'Every hour', '工作日': 'Weekdays', '周末': 'Weekends', '每两周': 'Every two weeks', '每 3 个月': 'Every 3 months', '每 6 个月': 'Every 6 months', '永不': 'Never', '无': 'None', '天': 'days', '周': 'weeks', '个月': 'months', '小时': 'hours', '提前': 'Remind me', '结束重复': 'Ends', '于日期': 'On date', '自定义重复': 'Custom repeat', '自定义提前提醒': 'Custom early reminder',
    '它已经在地毯上等你了。': 'Kitty is waiting for you on the rug.', '它又在地毯上安静等着你了。': 'Kitty is back on the rug, waiting quietly.', '铃铛轻轻响了一声，它会在这里等你下次回来。': 'The bell gave a soft ring. Kitty will wait here for your return.', '它慢慢睁开眼睛，好像知道你刚刚做完了一件事。': 'Kitty slowly opens its eyes, as if it knows you have finished something.'
  },
  ms: {
    '我的收藏': 'Koleksi saya', '慢慢把房间填满': 'Hiasi ruang ini perlahan-lahan', '已经拥有': 'Sudah dimiliki', '虎斑白猫': 'Kucing tabby putih', '圆地毯': 'Permaidani bulat', '互动家具': 'Perabot interaktif', '售价待定': 'Akan datang', '家具': 'Perabot', '更多猫咪': 'Lebih banyak kucing', '外观': 'Gaya',
    '这段时间，你做得很好。': 'Awak memang hebat.', '小鱼干 +1': 'Snek ikan +1', '开始': 'Mula', '确定': 'Simpan', '分钟': 'minit', '右滑放弃': 'Gelongsor untuk berhenti', '例如：整理今天的方案': 'Cth. Rancang hari ini',
    '提醒事项': 'Peringatan', '重要的事小猫替你记着': 'Si comel ingat yang penting', '今天': 'Hari ini', '计划': 'Jadual', '全部': 'Semua', '标记': 'Ditanda', '紧急': 'Segera', '完成': 'Selesai', '清除': 'Kosongkan', '已逾期': 'Tertunggak', '上午': 'Pagi', '下午': 'Petang', '晚上': 'Malam',
    '新建提醒': 'Peringatan baharu', '编辑提醒': 'Sunting peringatan', '改一改提醒内容': 'Kemaskan peringatan ini', '让小猫准时叫你': 'Biarkan si comel ingatkan awak tepat pada waktunya', '标题': 'Tajuk', '事件内容': 'Catatan', '日期': 'Tarikh', '时间': 'Masa', '事件子任务': 'Subtugas', '紧急提醒': 'Peringatan segera', '标记提醒': 'Tandakan peringatan', '是否重复': 'Ulang', '提前提醒': 'Peringatan awal', '不重复': 'Tidak berulang', '每天': 'Setiap hari', '每周': 'Setiap minggu', '每月': 'Setiap bulan', '自定义': 'Tersuai', '准时提醒': 'Pada waktunya', '保存修改': 'Simpan perubahan', '添加提醒': 'Tambah peringatan', '子任务': 'Subtugas', '添加': 'Tambah',
    '点选分类，查看小猫替你记住的事。': 'Pilih senarai untuk melihat perkara yang si comel simpan untuk awak.', '这里暂时没有提醒。': 'Belum ada peringatan di sini.', '还没有完成项目。': 'Belum ada peringatan selesai.',
    '专注统计': 'Statistik fokus', '小猫陪你走过的时光': 'Saat bersama si comel', '日': 'Hari', '最近7天': '7 hari terakhir', '月': 'Bulan', '年': 'Tahun', '当日专注记录': 'Fokus hari ini', '最近完成': 'Baru selesai',
    '沙发': 'Sofa', '猫爬架': 'Pokok kucing', '橘猫': 'Kucing oren', '灰猫': 'Kucing kelabu', '三花': 'Kucing calico', '霸占座位、靠着抱枕、睡到四脚朝天。': 'Berehat di tempat terbaik, bersandar pada kusyen, lalu tidur lena.', '看窗外、待在高处、抓抓柱子。': 'Lihat ke luar, duduk tinggi dan garu tiang.', '暖暖的短毛橘猫外观。': 'Bulu oren pendek yang hangat.', '安静的烟灰色短毛猫外观。': 'Bulu kelabu asap yang tenang.', '不规则斑块的三花猫外观。': 'Bulu calico dengan tompok yang ceria.',
    '每小时': 'Setiap jam', '工作日': 'Hari bekerja', '周末': 'Hujung minggu', '每两周': 'Setiap dua minggu', '每 3 个月': 'Setiap 3 bulan', '每 6 个月': 'Setiap 6 bulan', '永不': 'Tidak pernah', '无': 'Tiada', '天': 'hari', '周': 'minggu', '个月': 'bulan', '小时': 'jam', '提前': 'Ingatkan saya', '结束重复': 'Tamat', '于日期': 'Pada tarikh', '自定义重复': 'Ulangan tersuai', '自定义提前提醒': 'Peringatan awal tersuai',
    '它已经在地毯上等你了。': 'Si comel sedang menunggu awak di atas permaidani.', '它又在地毯上安静等着你了。': 'Si comel kembali menunggu awak dengan tenang.', '铃铛轻轻响了一声，它会在这里等你下次回来。': 'Loceng berbunyi perlahan. Si comel akan menunggu awak kembali.', '它慢慢睁开眼睛，好像知道你刚刚做完了一件事。': 'Si comel membuka mata perlahan-lahan, seolah-olah tahu awak baru selesai sesuatu.'
  }
};
Object.assign(STATIC_COPY.en, {
  '新增事件提醒': 'Reminder title', '备注': 'Add a note (optional)', '补充一点细节（选填）': 'Add a little detail (optional)', '一行一个子任务（选填）': 'One subtask per line (optional)', '添加子任务': 'Add subtasks',
  '重复': 'Repeat', '提前 5 分钟': '5 minutes early', '提前 15 分钟': '15 minutes early', '提前 30 分钟': '30 minutes early', '提前 1 小时': '1 hour early', '提前 1 天': '1 day early', '提前 2 天': '2 days early', '提前 1 周': '1 week early', '提前 1 个月': '1 month early',
  '到点后会像闹钟一样持续响': 'Keeps ringing like an alarm when it is due', '列表右侧会留下猫爪': 'Shows a paw mark in your list', '每隔': 'Every', '添加一个子任务': 'Add a subtask', '还没有子任务。': 'No subtasks yet.', '恢复': 'Mark incomplete', '取消完成': 'Mark incomplete', '删除子任务': 'Delete subtask', '返回提醒编辑': 'Back to reminder editor', '完成提醒事项吗？': 'Mark this reminder complete?', '此提醒事项含有未完成的子任务，也将标记完成。': 'Its unfinished subtasks will be marked complete too.', '取消': 'Cancel', '上个月': 'Previous month', '下个月': 'Next month', '家具会带来新的猫咪日常；具体价格等内容数量确定后再一起调整。': 'Furniture will bring more little cat moments. Prices will be set once the collection is ready.', '每日平均专注': 'Average focus per day', '点选柱状图可查看当日数据': 'Select a bar to view that day.', '近7天累计专注': 'Focus total for the last 7 days', '还没有可统计的专注时长。': 'No focus time to show yet.'
});
Object.assign(STATIC_COPY.ms, {
  '新增事件提醒': 'Tajuk peringatan', '备注': 'Tambah catatan (pilihan)', '补充一点细节（选填）': 'Tambah sedikit butiran (pilihan)', '一行一个子任务（选填）': 'Satu subtugas setiap baris (pilihan)', '添加子任务': 'Tambah subtugas',
  '重复': 'Ulang', '提前 5 分钟': '5 minit awal', '提前 15 分钟': '15 minit awal', '提前 30 分钟': '30 minit awal', '提前 1 小时': '1 jam awal', '提前 1 天': '1 hari awal', '提前 2 天': '2 hari awal', '提前 1 周': '1 minggu awal', '提前 1 个月': '1 bulan awal',
  '到点后会像闹钟一样持续响': 'Berbunyi berterusan seperti penggera apabila tiba masa', '列表右侧会留下猫爪': 'Menunjukkan tanda tapak kaki dalam senarai', '每隔': 'Setiap', '添加一个子任务': 'Tambah subtugas', '还没有子任务。': 'Belum ada subtugas.', '恢复': 'Tandakan belum selesai', '取消完成': 'Tandakan belum selesai', '删除子任务': 'Padam subtugas', '返回提醒编辑': 'Kembali ke sunting peringatan', '完成提醒事项吗？': 'Tandakan peringatan ini selesai?', '此提醒事项含有未完成的子任务，也将标记完成。': 'Subtugas yang belum selesai juga akan ditandakan selesai.', '取消': 'Batal', '上个月': 'Bulan lalu', '下个月': 'Bulan depan', '家具会带来新的猫咪日常；具体价格等内容数量确定后再一起调整。': 'Perabot akan membawa lebih banyak detik manis bersama si comel. Harga akan ditetapkan apabila koleksi siap.', '每日平均专注': 'Purata fokus harian', '点选柱状图可查看当日数据': 'Pilih bar untuk melihat data hari itu.', '近7天累计专注': 'Jumlah fokus 7 hari terakhir', '还没有可统计的专注时长。': 'Belum ada masa fokus untuk dipaparkan.'
});
function localizeStaticInterface() {
  const dictionary = STATIC_COPY[state.locale];
  if (!dictionary) return;
  const blocked = 'input, textarea, .reminder-item, .task-title';
  const walker = document.createTreeWalker(app, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    if (node.parentElement?.closest(blocked)) return;
    const source = node.nodeValue.trim();
    if (dictionary[source]) node.nodeValue = node.nodeValue.replace(source, dictionary[source]);
  });
  app.querySelectorAll('[placeholder], [title], [aria-label]').forEach(element => {
    ['placeholder', 'title', 'aria-label'].forEach(attribute => {
      const source = element.getAttribute(attribute);
      if (dictionary[source]) element.setAttribute(attribute, dictionary[source]);
    });
  });
}
const state = {
  fish: 0,
  focusRecords: [],
  reminders: [],
  completedSubtasks: [],
  reminderLastTriggeredAt: {},
  active: false,
  duration: DEFAULT_FOCUS_SECONDS,
  remaining: DEFAULT_FOCUS_SECONDS,
  endsAt: null,
  purpose: '',
  musicVolume: 55,
  catVolume: 70,
  locale: 'zh-CN',
  ownerName: '',
  ownerNameLocked: false,
  catName: '',
  catNameLocked: false,
  birthday: '',
  birthdayUpdatedAt: null,
  profileEditing: null,
  editingDuration: false,
  editingPurpose: false,
  settingsOpen: false,
  remindersOpen: false,
  reminderView: 'overview',
  reminderComposerOpen: false,
  reminderEditingId: null,
  reminderSwipeId: null,
  reminderExpandedId: null,
  reminderSubtaskHighlightId: null,
  completingSubtasks: [],
  reminderSubtaskSourceView: null,
  reminderSubtaskSourceScrollTop: 0,
  completedClearOpen: false,
  reminderDraft: null,
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
if (!saved.reminderLastTriggeredAt) {
  const now = Date.now();
  state.reminderLastTriggeredAt = Object.fromEntries(
    state.reminders
      .filter(reminder => !reminder.completed && reminder.at - (Number(reminder.advanceMinutes) || 0) * 60000 <= now)
      .map(reminder => [reminder.id, now])
  );
}
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
  pawScratch: { source: '/videos/cat/scene-figure-layout-controls/paw-scratch-composited.mp4', sound: '/audio/paw-scratch-meow.mp3', duration: 6040, composited: true }
};
const ACTION_PAUSE_MS = 8 * 1000;
const FOCUS_NOTIFICATION_ID = 1001;
const REMINDER_NOTIFICATION_BASE = 200000;
const app = document.querySelector('#app');
const roomArtFrame = new Image();
roomArtFrame.src = '/images/cat-room/sofa-rug-focus-figure-layout-controls-v1.png';
let ticker;
let visibleDueReminderKey = null;
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
let activeReminderReactionId = null;
let reminderBellTargetId = null;
let reminderBellAcknowledged = false;
let reminderBellDialogId = null;
let reminderReactionStopTimer;
let catChromaFrame;
let catVideoFrameCallback;
let catChromaSettleTimer;
let activeChromaVideo;
let catAudioPrimed = false;
let focusSettlement = null;

function localNotifications() { return window.Capacitor?.Plugins?.LocalNotifications; }
function urgentAlarm() { return window.Capacitor?.Plugins?.UrgentAlarm; }
function nextReminderId() { return Math.max(0, ...state.reminders.map(reminder => reminder.id)) + 1; }
function reminderNotificationId(reminder) { return REMINDER_NOTIFICATION_BASE + reminder.id; }
function reminderNotificationAt(reminder) { return reminder.at - (Number(reminder.advanceMinutes) || 0) * 60 * 1000; }
function dueReminder() {
  return state.reminders
    .filter(reminder => !reminder.completed && reminderNotificationAt(reminder) <= Date.now())
    .sort((first, second) => reminderNotificationAt(second) - reminderNotificationAt(first))[0];
}
function dueReminderCount() {
  return state.reminders.filter(reminder => !reminder.completed && reminderNotificationAt(reminder) <= Date.now()).length;
}
function refreshDueReminderBadge() {
  const button = document.querySelector('#openReminders');
  if (!button) return;
  const count = dueReminderCount();
  const badge = button.querySelector('.reminder-due-badge');
  button.setAttribute('aria-label', count ? `打开提醒事项，${count} 个已提醒未完成任务` : '打开提醒事项');
  if (!count) {
    badge?.remove();
    return;
  }
  if (badge) {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.setAttribute('aria-label', `${count} 个已提醒未完成任务`);
    return;
  }
  button.insertAdjacentHTML('beforeend', `<span class="reminder-due-badge" aria-label="${count} 个已提醒未完成任务">${count > 99 ? '99+' : count}</span>`);
}
function nextReminderAlertAt(reminder) {
  const lastTriggeredAt = Number(state.reminderLastTriggeredAt?.[reminder.id]);
  if (!lastTriggeredAt) return reminderNotificationAt(reminder) <= Date.now() ? reminderNotificationAt(reminder) : null;
  if (!reminderRepeatLabel(reminder)) return null;
  const advanceMs = (Number(reminder.advanceMinutes) || 0) * 60000;
  const nextEventAt = nextReminderOccurrence(reminder, lastTriggeredAt + advanceMs);
  const nextAlertAt = nextEventAt - advanceMs;
  return nextAlertAt <= Date.now() ? nextAlertAt : null;
}
function nextReminderAlert() {
  return state.reminders
    .filter(reminder => !reminder.completed)
    .map(reminder => ({ reminder, at: nextReminderAlertAt(reminder) }))
    .filter(item => item.at !== null)
    .sort((first, second) => second.at - first.at)[0];
}
function syncDueReminderBell() {
  if (reminderReactionPlaying) return;
  const nextAlert = !state.active && state.view === 'rug' ? nextReminderAlert() : null;
  const nextDueReminderKey = nextAlert ? `${nextAlert.reminder.id}:${nextAlert.at}` : null;
  if (nextDueReminderKey === visibleDueReminderKey) return;
  visibleDueReminderKey = nextDueReminderKey;
  if (nextAlert) playReminderReaction(nextAlert.reminder.id);
  else render();
}
function reminderSchedule(reminder) {
  const at = new Date(reminderNotificationAt(reminder));
  return { at };
}
function nextReminderOccurrence(reminder, reference = Date.now()) {
  if (!reminderRepeatLabel(reminder)) return null;
  const next = new Date(reminder.at);
  const increment = () => {
    if (reminder.repeat === 'hourly') next.setHours(next.getHours() + 1);
    else if (reminder.repeat === 'daily') next.setDate(next.getDate() + 1);
    else if (reminder.repeat === 'weekly') next.setDate(next.getDate() + 7);
    else if (reminder.repeat === 'biweekly') next.setDate(next.getDate() + 14);
    else if (reminder.repeat === 'monthly') next.setMonth(next.getMonth() + 1);
    else if (reminder.repeat === 'quarterly') next.setMonth(next.getMonth() + 3);
    else if (reminder.repeat === 'semiannual') next.setMonth(next.getMonth() + 6);
    else if (reminder.repeat === 'custom') {
      const every = Number(reminder.repeatEvery) || 1;
      if (reminder.repeatUnit === 'month') next.setMonth(next.getMonth() + every);
      else next.setDate(next.getDate() + every * (reminder.repeatUnit === 'week' ? 7 : 1));
    }
    else next.setDate(next.getDate() + 1);
  };
  do { increment(); } while (next.getTime() <= reference || (reminder.repeat === 'weekdays' && [0, 6].includes(next.getDay())) || (reminder.repeat === 'weekends' && ![0, 6].includes(next.getDay())));
  const endAt = reminder.repeatEndAt ? new Date(`${reminder.repeatEndAt}T23:59:59.999`).getTime() : Infinity;
  return next.getTime() <= endAt ? next.getTime() : null;
}
function formatReminderTime(value) {
  return `${copy('notify')} ${new Date(value).toLocaleTimeString(localeTag(), { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}
function formatAllReminderTime(value) {
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDay = new Date(date);
  targetDay.setHours(0, 0, 0, 0);
  const dayOffset = Math.round((targetDay - today) / 86400000);
  const time = date.toLocaleTimeString(localeTag(), { hour: '2-digit', minute: '2-digit', hour12: false });
  const label = dayOffset === -2 ? copy('beforeYesterday') : dayOffset === -1 ? copy('yesterday') : dayOffset === 0 ? copy('today') : dayOffset === 1 ? copy('tomorrow') : dayOffset === 2 ? copy('afterTomorrow') : date.toLocaleDateString(localeTag(), { year: 'numeric', month: state.locale === 'zh-CN' ? 'long' : 'short', day: 'numeric' });
  return `${label} ${time}`;
}
function formatReminderDay(value) {
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDay = new Date(date);
  targetDay.setHours(0, 0, 0, 0);
  const dayOffset = Math.round((targetDay - today) / 86400000);
  return dayOffset === -2 ? copy('beforeYesterday') : dayOffset === -1 ? copy('yesterday') : dayOffset === 0 ? copy('today') : dayOffset === 1 ? copy('tomorrow') : dayOffset === 2 ? copy('afterTomorrow') : date.toLocaleDateString(localeTag(), { year: 'numeric', month: state.locale === 'zh-CN' ? 'long' : 'short', day: 'numeric' });
}
function reminderRepeatLabel(reminder) {
  const labels = { hourly: copy('hourly'), daily: copy('daily'), weekly: copy('weekly'), monthly: copy('monthly'), weekdays: copy('weekdays'), weekends: copy('weekends'), biweekly: copy('biweekly'), quarterly: copy('quarterly'), semiannual: copy('semiannual') };
  if (reminder.repeat === 'custom') {
    const units = state.locale === 'ms' ? { day: 'hari', week: 'minggu', month: 'bulan' } : state.locale === 'en' ? { day: 'day', week: 'week', month: 'month' } : { day: '天', week: '周', month: '个月' };
    const amount = reminder.repeatEvery || 1;
    return state.locale === 'zh-CN' ? `每 ${amount}${units[reminder.repeatUnit] || '天'}` : `${state.locale === 'ms' ? 'Setiap' : 'Every'} ${amount} ${units[reminder.repeatUnit] || units.day}${amount > 1 && state.locale === 'en' ? 's' : ''}`;
  }
  return labels[reminder.repeat] || '';
}
function formatCompletedAt(value) { return `${copy('completedAt')}${formatAllReminderTime(value)}`; }
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
    title: state.locale === 'ms' ? 'Pesanan daripada si comel' : state.locale === 'en' ? 'A note from kitty' : '小猫提醒你',
    body: reminder.description || catReminderCopy(reminder.title),
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
  if (activeReminderReactionId === reminderId) return;
  state.reminderLastTriggeredAt ||= {};
  state.reminderLastTriggeredAt[reminderId] = nextReminderAlertAt(reminder) || reminderNotificationAt(reminder);
  save();
  activeReminderReactionId = reminderId;
  reminderBellTargetId = reminderId;
  reminderBellAcknowledged = false;
  reminderReactionPlaying = true;
  clearCatVideo();
  state.note = catReminderCopy(reminder.title);
  render();
  requestAnimationFrame(() => {
    if (activeReminderReactionId !== reminderId) return;
    playChromaCatVideo(catActions.pawScratch, () => {
      finishReminderReaction(reminderId);
    }, true);
  });
}
function finishReminderReaction(reminderId) {
  if (activeReminderReactionId !== reminderId) return;
  clearTimeout(reminderReactionStopTimer);
  reminderReactionStopTimer = undefined;
  activeReminderReactionId = null;
  reminderReactionPlaying = false;
  state.note = '它又在地毯上安静等着你了。';
  render();
}
function acknowledgeReminderBell() {
  if (!activeReminderReactionId) return;
  const reminderId = activeReminderReactionId;
  reminderBellAcknowledged = true;
  if (activeChromaVideo) activeChromaVideo.loop = false;
  catWakeSound.loop = false;
  document.querySelector('#openReminderBell')?.classList.remove('is-ringing');
  const video = activeChromaVideo;
  const remainingMs = Number.isFinite(video?.duration)
    ? Math.max(0, (video.duration - video.currentTime) * 1000)
    : catActions.pawScratch.duration;
  clearTimeout(reminderReactionStopTimer);
  reminderReactionStopTimer = setTimeout(() => {
    if (activeReminderReactionId !== reminderId || !reminderBellAcknowledged) return;
    clearCatVideo();
    finishReminderReaction(reminderId);
  }, Math.max(remainingMs + 160, 500));
}
function acknowledgeCompletedReminder(reminderId) {
  if (activeReminderReactionId !== reminderId) return;
  acknowledgeReminderBell();
}
function showReminderCompletionPending(reminderId) {
  const check = document.querySelector(`[data-reminder-toggle="${reminderId}"]`);
  const item = check?.closest('.reminder-item');
  item?.classList.add('is-complete', 'is-completing');
  if (check) check.textContent = '✓';
}
function completeReminderFromBell(reminder) {
  reminderBellTargetId = null;
  cancelReminderNotification(reminder);
  const nextAt = nextReminderOccurrence(reminder);
  reminder.completed = true;
  reminder.completedAt = Date.now();
  if (nextAt) {
    const pendingSubtasks = (reminder.subtasks || [])
      .filter(task => task && !task.startsWith('[done] '))
      .map(task => task.replace(/^\[done\]\s*/, ''));
    const nextReminder = {
      ...reminder,
      id: nextReminderId(),
      at: nextAt,
      completed: false,
      completedAt: null,
      completing: false,
      subtasks: pendingSubtasks,
      repeatSubtasks: pendingSubtasks,
      subtaskTotal: pendingSubtasks.length
    };
    state.reminders.push(nextReminder);
    void scheduleReminderNotification(nextReminder);
  }
  save();
}
function openReminderBellDialog(reminder) {
  if (!reminder || document.querySelector('#reminderBellDialog')) return;
  acknowledgeReminderBell();
  reminderBellDialogId = reminder.id;
  mountReminderBellDialog(reminder);
}
function mountReminderBellDialog(reminder) {
  if (!reminder || document.querySelector('#reminderBellDialog')) return;
  const isChinese = state.locale === 'zh-CN';
  const isMalay = state.locale === 'ms';
  const later = isChinese ? '再等等' : isMalay ? 'Tunggu sekejap' : 'Not yet';
  const done = isChinese ? '放心吧' : isMalay ? 'Saya akan buat' : 'I\'ve got it';
  app.insertAdjacentHTML('beforeend', `<section class="bell-reminder-backdrop" id="reminderBellDialog" role="dialog" aria-modal="true" aria-labelledby="bellReminderTitle"><div class="bell-reminder-dialog"><img class="bell-note-art" src="/images/reminders/cat-stationery-note.png" alt=""><h2 id="bellReminderTitle">${escapeHtml(bellReminderCopy(reminder))}</h2>${reminder.description ? `<span class="bell-reminder-detail">${escapeHtml(reminder.description)}</span>` : ''}<div class="bell-reminder-actions"><button id="bellReminderLater" type="button">${later}<img src="/icons/paw-print.svg" alt=""></button><button id="bellReminderDone" type="button">${done}<img src="/icons/paw-print.svg" alt=""></button></div></div></section>`);
  const dialog = document.querySelector('#reminderBellDialog');
  dialog.querySelector('#bellReminderLater').addEventListener('click', () => {
    reminderBellDialogId = null;
    dialog.remove();
  });
  dialog.querySelector('#bellReminderDone').addEventListener('click', () => {
    completeReminderFromBell(reminder);
    reminderBellDialogId = null;
    dialog.remove();
    refreshDueReminderBadge();
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
function playCatWakeSound(source, loop = false) {
  if (!source) return;
  catWakeSound.pause();
  if (!catWakeSound.src.endsWith(source)) catWakeSound.src = source;
  catWakeSound.currentTime = 0;
  catWakeSound.loop = loop;
  catWakeSound.volume = state.catVolume / 100;
  catWakeSound.play().catch(() => {});
}
function primeCatAudio() {
  if (catAudioPrimed) return;
  catWakeSound.src = '/audio/paw-scratch-meow.mp3';
  catWakeSound.preload = 'auto';
  catWakeSound.volume = 0;
  catWakeSound.play().then(() => {
    catWakeSound.pause();
    catWakeSound.currentTime = 0;
    catWakeSound.volume = state.catVolume / 100;
    catAudioPrimed = true;
    if (activeReminderReactionId && !reminderBellAcknowledged) playCatWakeSound(catActions.pawScratch.sound);
  }).catch(() => {});
}
function stopCatWakeSound() {
  catWakeSound.pause();
  catWakeSound.currentTime = 0;
  catWakeSound.loop = false;
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
function formatMinutes(seconds) { const minutes = Math.round(seconds / 60); return state.locale === 'zh-CN' ? `${minutes} 分钟` : `${minutes} ${copy('minutes')}`; }
function chartMinutes(minutes) { return state.locale === 'zh-CN' ? `${minutes}分` : `${minutes} ${copy('minutes')}`; }
function shortDate(date) { return new Intl.DateTimeFormat(localeTag(), { month: 'short', day: 'numeric' }).format(date); }
function statsYearLabel(year) { return state.locale === 'zh-CN' ? `${year}年` : String(year); }
function statsMonthLabel(year, month, style = 'long') {
  return state.locale === 'zh-CN' ? `${month + 1}月` : new Intl.DateTimeFormat(localeTag(), { month: style }).format(new Date(year, month, 1));
}
function statsDateLabel(date) {
  return state.locale === 'zh-CN'
    ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    : new Intl.DateTimeFormat(localeTag(), { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}
function statsMonthYearLabel(year, month) {
  return state.locale === 'zh-CN'
    ? `${year}年${month + 1}月`
    : new Intl.DateTimeFormat(localeTag(), { year: 'numeric', month: 'long' }).format(new Date(year, month, 1));
}
function statsText(key) {
  const labels = {
    todayTotal: ['今日专注时间', 'Today\'s focus', 'Fokus hari ini'],
    dayTotal: ['当日累计专注', 'Day total', 'Jumlah hari ini'],
    monthTotal: ['月度累计专注', 'Month total', 'Jumlah bulan'],
    yearTotal: ['年度累计专注', 'Year total', 'Jumlah tahun'],
    dailyAverage: ['日均专注', 'Daily average', 'Purata harian'],
    monthlyAverage: ['月均专注', 'Monthly average', 'Purata bulanan'],
    timeOfDay: ['今天的专注时段', 'Focus today', 'Fokus hari ini'],
    selectDate: ['选择日期', 'Choose a date', 'Pilih tarikh'],
    recordedDates: ['有记录的日期可以查看', 'Dates with records are available.', 'Tarikh yang mempunyai rekod boleh dilihat.']
  };
  return labels[key][state.locale === 'en' ? 1 : state.locale === 'ms' ? 2 : 0];
}
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
  return `${labels.map(([y, value]) => `<text class="stats-y-label" x="37" y="${y + 4}" text-anchor="end">${chartMinutes(Math.round(value / 60))}</text>`).join('')}<path class="stats-grid" d="M44 24H304M44 60H304M44 96H304"></path>`;
}
function emptyChartYAxis() {
  return `<text class="stats-y-label" x="37" y="28" text-anchor="end">--</text><text class="stats-y-label" x="37" y="64" text-anchor="end">--</text><text class="stats-y-label" x="37" y="100" text-anchor="end">${chartMinutes(0)}</text><path class="stats-grid" d="M44 24H304M44 60H304M44 96H304"></path>`;
}
function monthLabel(date) { return state.locale === 'zh-CN' ? `${date.getMonth() + 1} 月` : new Intl.DateTimeFormat(localeTag(), { month: 'short' }).format(date); }
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
    return `<button type="button" data-calendar-choice="year" data-calendar-value="${year}" ${hasFocusInYear(year) ? '' : 'disabled'}>${statsYearLabel(year)}</button>`;
  }).join('');
  const monthOptions = Array.from({ length: 12 }, (_, month) => `<button type="button" data-calendar-choice="month" data-calendar-value="${month}" ${hasFocusInMonth(state.calendarYear, month) ? '' : 'disabled'}>${statsMonthLabel(state.calendarYear, month)}</button>`).join('');
  const firstWeekday = (new Date(state.calendarYear, state.calendarMonth, 1).getDay() + 6) % 7;
  const days = new Date(state.calendarYear, state.calendarMonth + 1, 0).getDate();
  const dayCells = Array.from({ length: firstWeekday + days }, (_, index) => {
    if (index < firstWeekday) return '<span class="calendar-day is-blank"></span>';
    const day = index - firstWeekday + 1;
    const active = hasFocusOnDay(state.calendarYear, state.calendarMonth, day);
    const selected = active && state.statsDay.getFullYear() === state.calendarYear && state.statsDay.getMonth() === state.calendarMonth && state.statsDay.getDate() === day;
    return `<button class="calendar-day ${active ? 'has-record' : ''} ${selected ? 'is-selected' : ''}" type="button" data-calendar-day="${day}" ${active ? '' : 'disabled'}>${day}</button>`;
  }).join('');
  return `<section class="stats-calendar" aria-label="${statsText('selectDate')}"><header><div><p>${statsText('selectDate')}</p><strong>${statsText('recordedDates')}</strong></div><button class="close-button" id="closeCalendar" type="button" aria-label="Close calendar">x</button></header><div class="calendar-selectors">${calendarPickerButton(statsYearLabel(state.calendarYear), 'year', yearOptions)}${calendarPickerButton(statsMonthLabel(state.calendarYear, state.calendarMonth), 'month', monthOptions)}</div><div class="calendar-weekdays">${pickerWeekdays().map(day => `<span>${day}</span>`).join('')}</div><div class="calendar-grid">${dayCells}</div></section>`;
}
function statsPicker(period) {
  const now = new Date();
  const first = firstFocusDate();
  if (period === 'day') {
    return `<div class="stats-picker"><button class="stats-picker-trigger" id="openCalendar" type="button"><span>${statsDateLabel(state.statsDay)}</span><i aria-hidden="true"></i></button></div>`;
  }
  if (period === 'month') {
    const yearOptions = Array.from({ length: now.getFullYear() - first.getFullYear() + 1 }, (_, index) => {
      const year = first.getFullYear() + index;
      const active = hasFocusInYear(year);
      return `<button type="button" data-picker-choice="month-year" data-picker-value="${year}" ${active ? '' : 'disabled'}>${statsYearLabel(year)}</button>`;
    }).join('');
    const monthOptions = Array.from({ length: 12 }, (_, month) => {
      const inRange = (state.statsMonth.getFullYear() > first.getFullYear() || month >= first.getMonth()) && (state.statsMonth.getFullYear() < now.getFullYear() || month <= now.getMonth());
      const active = inRange && hasFocusInMonth(state.statsMonth.getFullYear(), month);
      return `<button type="button" data-picker-choice="month-month" data-picker-value="${month}" ${active ? '' : 'disabled'}>${statsMonthLabel(state.statsMonth.getFullYear(), month)}</button>`;
    }).join('');
    return `<div class="stats-picker stats-month-picker">${pickerButton(statsYearLabel(state.statsMonth.getFullYear()), 'month-year', yearOptions)}${pickerButton(statsMonthLabel(state.statsMonth.getFullYear(), state.statsMonth.getMonth()), 'month-month', monthOptions)}</div>`;
  }
  const options = Array.from({ length: now.getFullYear() - first.getFullYear() + 1 }, (_, index) => {
    const year = first.getFullYear() + index;
    const active = hasFocusInYear(year);
    return `<button type="button" data-picker-choice="year" data-picker-value="${year}" ${active ? '' : 'disabled'}>${statsYearLabel(year)}</button>`;
  }).join('');
  return `<div class="stats-picker">${pickerButton(statsYearLabel(state.statsYear), 'year', options)}</div>`;
}
function statsSelectionLabel(index, series) {
  if (state.statsPeriod === 'week') {
    const date = series.days[index];
    return state.locale === 'zh-CN'
      ? `${date.getMonth() + 1}月${date.getDate()}日累计专注`
      : `${shortDate(date)} ${state.locale === 'ms' ? 'jumlah' : 'total'}`;
  }
  if (state.statsPeriod === 'month') {
    const month = new Date(state.statsMonth);
    const date = new Date(month.getFullYear(), month.getMonth(), index + 1);
    return state.locale === 'zh-CN' ? `${month.getMonth() + 1}月${index + 1}日累计专注` : `${shortDate(date)} ${state.locale === 'ms' ? 'jumlah' : 'total'}`;
  }
  return state.locale === 'zh-CN' ? `${index + 1}月累计专注` : `${statsMonthLabel(state.statsYear, index, 'short')} ${state.locale === 'ms' ? 'jumlah' : 'total'}`;
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
    return { labels: state.locale === 'zh-CN' ? ['0 点', '12 点', '24 点'] : ['00', '12', '24'], values, title: statsText('timeOfDay'), total: values.reduce((sum, value) => sum + value, 0) };
  }
  if (period === 'month') {
    const month = new Date(state.statsMonth);
    const isCurrentMonth = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const observedDays = isCurrentMonth ? now.getDate() : days;
    const values = Array.from({ length: days }, (_, index) => totalSeconds(recordsForDay(new Date(month.getFullYear(), month.getMonth(), index + 1))));
    const total = values.reduce((sum, value) => sum + value, 0);
    const labels = state.locale === 'zh-CN' ? ['1 日', `${Math.ceil(days / 2)} 日`, `${days} 日`] : ['1', `${Math.ceil(days / 2)}`, `${days}`];
    return { labels, values, title: statsMonthYearLabel(month.getFullYear(), month.getMonth()), total, average: total / observedDays, averageLabel: statsText('dailyAverage') };
  }
  if (period === 'year') {
    const year = state.statsYear;
    const months = 12;
    const observedMonths = year === now.getFullYear() ? now.getMonth() + 1 : months;
    const values = Array.from({ length: months }, (_, index) => totalSeconds(state.focusRecords.filter(record => { const d = new Date(record.completedAt); return d.getFullYear() === year && d.getMonth() === index; })));
    const total = values.reduce((sum, value) => sum + value, 0);
    const labels = state.locale === 'zh-CN' ? ['1 月', `${Math.ceil(months / 2)} 月`, `${months} 月`] : ['1', `${Math.ceil(months / 2)}`, `${months}`];
    return { labels, values, title: statsYearLabel(year), total, average: total / observedMonths, averageLabel: statsText('monthlyAverage') };
  }
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(now); date.setDate(now.getDate() - 6 + index); return date; });
  const values = days.map(date => totalSeconds(recordsForDay(date)));
  const total = values.reduce((sum, value) => sum + value, 0);
  return { labels: [days[0].toLocaleDateString(localeTag(), { weekday: 'short' }), days[3].toLocaleDateString(localeTag(), { weekday: 'short' }), copy('today')], values, days, title: `${shortDate(days[0])} - ${shortDate(now)}`, total, average: total / 7, averageLabel: state.locale === 'zh-CN' ? '每日平均专注' : state.locale === 'ms' ? 'Purata fokus harian' : 'Average focus per day' };
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
    ? (state.locale === 'zh-CN' ? '近7天累计专注' : state.locale === 'ms' ? 'Jumlah 7 hari terakhir' : 'Last 7 days total')
    : state.statsPeriod === 'month'
      ? statsText('monthTotal')
      : statsText('yearTotal');
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
  const todaySummary = state.statsPeriod === 'day' ? `<div class="stats-summary stats-day-summary"><div><span>${statsText('todayTotal')}</span><strong>${formatMinutes(totalSeconds(records))}</strong></div></div>` : '';
  const recordTime = record => state.statsPeriod === 'day'
    ? new Date(record.completedAt).toLocaleTimeString(localeTag(), { hour: '2-digit', minute: '2-digit', hour12: false })
    : new Date(record.completedAt).toLocaleDateString(localeTag(), { month: 'numeric', day: 'numeric' });
  const recordsSection = state.statsPeriod === 'day' ? `<section class="stats-records"><div class="stats-records-head"><span>${recordTitle}</span></div>${records.length ? records.map(record => `<article><div><strong>${escapeHtml(record.purpose || '专注')}</strong><span>${recordTime(record)} 完成</span></div><b>${formatMinutes(record.duration)}</b></article>`).join('') : '<p class="stats-empty">完成一次专注后，这里会记录这段时间。</p>'}</section>` : '';
  return `<aside class="stats-drawer ${state.statsOpen ? 'open' : ''}" id="statsDrawer" aria-hidden="${state.statsOpen ? 'false' : 'true'}"><section class="stats-sheet" aria-labelledby="statsTitle"><header class="stats-head"><div><p>专注统计</p><h1 id="statsTitle">小猫陪你走过的时光</h1></div><button class="close-button" id="closeStats" type="button" aria-label="关闭统计">x</button></header><div class="stats-tabs" role="tablist">${periods.map(([value, label]) => `<button class="${state.statsPeriod === value ? 'is-active' : ''}" type="button" data-stats-period="${value}" role="tab" aria-selected="${state.statsPeriod === value}">${label}</button>`).join('')}</div>${picker}${todaySummary}${chartSection}${recordsSection}${renderCalendarPicker()}</section></aside>`;
}
function reminderInputValue(time = Date.now()) {
  const date = new Date(time - new Date().getTimezoneOffset() * 60000);
  return date.toISOString().slice(0, 16);
}
function reminderDateValue(time = Date.now()) { return reminderInputValue(time).slice(0, 10); }
function reminderTimeValue(time = Date.now()) { return reminderInputValue(time).slice(11); }
function calendarInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function calendarInputLabel(value, fallback = 'YYYY-MM-DD') {
  if (!value) return fallback;
  const date = new Date(`${value}T00:00`);
  return state.locale === 'zh-CN'
    ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    : new Intl.DateTimeFormat(localeTag(), { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}
function openSharedDatePicker({ input, trigger, min = '', max = '', fallback = Date.now(), onChange, closeOnSelect = true }) {
  document.querySelector('#sharedDatePicker')?.remove();
  const current = input.value ? new Date(`${input.value}T00:00`) : new Date(fallback);
  let view = new Date(current.getFullYear(), current.getMonth(), 1);
  let mode = 'calendar';
  const anchor = trigger.closest('.date-picker-anchor');
  if (!anchor) return;
  anchor.insertAdjacentHTML('afterend', '<section class="shared-date-picker" id="sharedDatePicker"><div id="sharedDatePickerContent"></div></section>');
  const picker = document.querySelector('#sharedDatePicker');
  const renderPicker = () => {
    const year = view.getFullYear();
    const month = view.getMonth();
    if (mode === 'quick') {
      const minYear = min ? Number(min.slice(0, 4)) : 1900;
      const maxYear = max ? Number(max.slice(0, 4)) : new Date().getFullYear() + 20;
      const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index)
        .map(value => `<button class="${year === value ? 'is-selected' : ''}" type="button" data-shared-year="${value}">${state.locale === 'zh-CN' ? `${value}年` : value}</button>`).join('');
      const months = Array.from({ length: 12 }, (_, index) => `<button class="${month === index ? 'is-selected' : ''}" type="button" data-shared-month-choice="${index}">${state.locale === 'zh-CN' ? `${index + 1}月` : new Intl.DateTimeFormat(localeTag(), { month: 'long' }).format(new Date(year, index, 1))}</button>`).join('');
      picker.querySelector('#sharedDatePickerContent').innerHTML = `<button class="reminder-picker-title" type="button" data-shared-mode="calendar">${yearMonthLabel(view)} <i>⌄</i></button><div class="reminder-wheel-columns shared-date-wheel"><div>${years}</div><div>${months}</div></div>`;
      const bindQuickColumn = (column, selector, apply) => {
        const buttons = [...column.querySelectorAll(selector)];
        const updateTitle = () => {
          const title = picker.querySelector('.reminder-picker-title');
          if (title) title.innerHTML = `${yearMonthLabel(view)} <i>⌄</i>`;
        };
        const pick = button => {
          if (!button) return;
          buttons.forEach(item => item.classList.toggle('is-selected', item === button));
          apply(Number(button.dataset.sharedYear ?? button.dataset.sharedMonthChoice));
          updateTitle();
        };
        const syncToCenter = () => {
          const center = column.getBoundingClientRect().top + column.clientHeight / 2;
          const closest = buttons.reduce((nearest, button) => {
            const distance = Math.abs(button.getBoundingClientRect().top + button.offsetHeight / 2 - center);
            return !nearest || distance < nearest.distance ? { button, distance } : nearest;
          }, null);
          pick(closest?.button);
        };
        buttons.forEach(button => button.addEventListener('click', () => {
          column.scrollTo({ top: button.offsetTop - 76, behavior: 'smooth' });
          pick(button);
        }));
        let dragStart = null;
        column.addEventListener('pointerdown', event => {
          dragStart = { id: event.pointerId, y: event.clientY, top: column.scrollTop };
          column.setPointerCapture(event.pointerId);
        });
        column.addEventListener('pointermove', event => {
          if (!dragStart || dragStart.id !== event.pointerId) return;
          column.scrollTop = dragStart.top + dragStart.y - event.clientY;
        });
        column.addEventListener('pointerup', event => {
          if (dragStart?.id !== event.pointerId) return;
          dragStart = null;
          syncToCenter();
        });
        let scrolling = false;
        column.addEventListener('scroll', () => {
          if (scrolling) return;
          scrolling = true;
          requestAnimationFrame(() => {
            scrolling = false;
            syncToCenter();
          });
        });
        requestAnimationFrame(() => {
          const selected = buttons.find(button => button.classList.contains('is-selected'));
          if (selected) column.scrollTop = selected.offsetTop - 76;
          syncToCenter();
        });
      };
      picker.querySelector('[data-shared-mode]')?.addEventListener('click', () => { mode = 'calendar'; renderPicker(); });
      const [yearColumn, monthColumn] = picker.querySelectorAll('.shared-date-wheel > div');
      bindQuickColumn(yearColumn, '[data-shared-year]', value => { view = new Date(value, view.getMonth(), 1); });
      bindQuickColumn(monthColumn, '[data-shared-month-choice]', value => { view = new Date(view.getFullYear(), value, 1); });
      return;
    }
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const cells = Array.from({ length: firstWeekday + days }, (_, index) => {
      if (index < firstWeekday) return '<span></span>';
      const day = index - firstWeekday + 1;
      const value = calendarInputValue(new Date(year, month, day));
      const disabled = (min && value < min) || (max && value > max);
      return `<button class="${input.value === value ? 'is-selected' : ''}" type="button" data-shared-date="${value}" ${disabled ? 'disabled' : ''}>${day}</button>`;
    }).join('');
    picker.querySelector('#sharedDatePickerContent').innerHTML = `<div class="reminder-date-nav"><strong><button type="button" data-shared-mode="quick">${yearMonthLabel(view)} <i>›</i></button></strong><span><button type="button" data-shared-month="-1" aria-label="Previous month">‹</button><button type="button" data-shared-month="1" aria-label="Next month">›</button></span></div><div class="reminder-picker-weekdays">${pickerWeekdays().map(day => `<span>${day}</span>`).join('')}</div><div class="reminder-picker-calendar">${cells}</div>`;
    picker.querySelector('[data-shared-mode]')?.addEventListener('click', () => { mode = 'quick'; renderPicker(); });
    picker.querySelectorAll('[data-shared-month]').forEach(button => button.addEventListener('click', () => {
      view = new Date(year, month + Number(button.dataset.sharedMonth), 1);
      renderPicker();
    }));
    picker.querySelectorAll('[data-shared-date]').forEach(button => button.addEventListener('click', () => {
      input.value = button.dataset.sharedDate;
      trigger.querySelector('b, span')?.replaceChildren(calendarInputLabel(input.value));
      onChange?.(input.value);
      if (closeOnSelect) picker.remove();
      else renderPicker();
    }));
  };
  renderPicker();
}
function attachSharedDatePickerControl({ input, triggerId, label = '', fallback, min, max, onChange, closeOnSelect }) {
  if (!input || document.querySelector(`#${triggerId}`)) return;
  input.type = 'hidden';
  input.insertAdjacentHTML('beforebegin', `<div class="date-picker-anchor"><button class="shared-date-trigger" id="${triggerId}" type="button">${label ? `<span>${escapeHtml(label)}</span>` : ''}<b>${calendarInputLabel(input.value, 'YYYY-MM-DD')}</b></button></div>`);
  input.previousElementSibling.append(input);
  const trigger = document.querySelector(`#${triggerId}`);
  trigger.addEventListener('click', () => openSharedDatePicker({ input, trigger, fallback, min, max, onChange, closeOnSelect }));
}
function profileCopy(key) {
  const text = {
    owner: ['主人昵称', 'Your name', 'Nama anda'],
    cat: ['猫咪昵称', 'Kitty\'s name', 'Nama si comel'],
    birthday: ['生日', 'Birthday', 'Hari jadi'],
    unset: ['未设置', 'Not set', 'Belum ditetapkan'],
    edit: ['编辑', 'Edit', 'Sunting'],
    confirmInput: ['确认', 'Confirm', 'Sahkan'],
    namesTitle: ['确认昵称吗？', 'Confirm these names?', 'Sahkan nama ini?'],
    namesBody: ['再次修改需要使用道具「改名卡」。', 'Changing it again will require a Rename Card.', 'Untuk menukar lagi, Kad Tukar Nama diperlukan.'],
    birthdayTitle: ['确认生日吗？', 'Confirm birthday?', 'Sahkan hari jadi?'],
    birthdayBody: ['提交后，生日每年只能修改一次。', 'After submitting, birthday can be changed once every 365 days.', 'Selepas dihantar, hari jadi hanya boleh diubah sekali setiap 365 hari.'],
    cancel: ['再想想', 'Not yet', 'Fikir dulu'],
    confirm: ['确认提交', 'Confirm', 'Sahkan']
  };
  return text[key]?.[state.locale === 'zh-CN' ? 0 : state.locale === 'en' ? 1 : 2] || '';
}
function canEditBirthday() {
  return !state.birthdayUpdatedAt || Date.now() - state.birthdayUpdatedAt >= 365 * 24 * 60 * 60 * 1000;
}
function openProfileConfirmation(kind, onConfirm) {
  if (document.querySelector('#profileConfirmation')) return;
  const isBirthday = kind === 'birthday';
  app.insertAdjacentHTML('beforeend', `<section class="profile-confirm-backdrop" id="profileConfirmation" role="dialog" aria-modal="true" aria-labelledby="profileConfirmTitle"><div class="profile-confirm-dialog"><h2 id="profileConfirmTitle">${profileCopy(isBirthday ? 'birthdayTitle' : 'namesTitle')}</h2><p>${profileCopy(isBirthday ? 'birthdayBody' : 'namesBody')}</p><div><button id="cancelProfileConfirm" type="button">${profileCopy('cancel')}</button><button id="confirmProfileConfirm" type="button">${profileCopy('confirm')}</button></div></div></section>`);
  const dialog = document.querySelector('#profileConfirmation');
  dialog.querySelector('#cancelProfileConfirm').addEventListener('click', () => dialog.remove());
  dialog.querySelector('#confirmProfileConfirm').addEventListener('click', () => {
    onConfirm();
    dialog.remove();
  });
}
function setupProfileControls() {
  const section = document.querySelector('.profile-section');
  if (!section) return;
  const editing = state.profileEditing;
  const row = (kind, label, value, locked) => `<div class="profile-display-row"><span>${label}</span><div><b>${escapeHtml(value || profileCopy('unset'))}</b>${locked ? '' : `<button class="profile-edit-button" type="button" data-profile-edit="${kind}" aria-label="${profileCopy('edit')} ${label}" title="${profileCopy('edit')}"><img src="/icons/notebook-pen.svg" alt=""></button>`}</div></div>`;
  const nameEditor = ['owner', 'cat'].includes(editing)
    ? `<form class="profile-editor" id="profileNameForm"><input id="profileNameInput" type="text" maxlength="24" value="${escapeHtml(editing === 'owner' ? state.ownerName : state.catName || catName())}" autofocus><button type="submit">${profileCopy('confirmInput')}</button></form>`
    : '';
  const birthdayEditor = editing === 'birthday'
    ? `<div class="profile-editor profile-birthday-editor"><input id="birthday" type="hidden" value="${escapeHtml(state.birthdayDraft || state.birthday)}"><button id="confirmBirthdayEdit" type="button">${profileCopy('confirmInput')}</button></div>`
    : '';
  section.innerHTML = `<h2>${copy('profile')}</h2>${row('owner', profileCopy('owner'), state.ownerName, state.ownerNameLocked)}${editing === 'owner' ? nameEditor : ''}${row('cat', profileCopy('cat'), state.catName || catName(), state.catNameLocked)}${editing === 'cat' ? nameEditor : ''}${row('birthday', profileCopy('birthday'), calendarInputLabel(state.birthday, profileCopy('unset')), !canEditBirthday())}${birthdayEditor}<p class="settings-hint">${copy('birthdayHint')}</p>`;
  section.querySelectorAll('[data-profile-edit]').forEach(button => button.addEventListener('click', () => {
    state.profileEditing = button.dataset.profileEdit;
    render();
    openSettings();
  }));
  const nameForm = document.querySelector('#profileNameForm');
  nameForm?.addEventListener('submit', event => {
    event.preventDefault();
    const value = document.querySelector('#profileNameInput').value.trim();
    const kind = state.profileEditing;
    if (!value) return;
    openProfileConfirmation('names', () => {
      if (kind === 'owner') {
        state.ownerName = value;
        state.ownerNameLocked = true;
      } else {
        state.catName = value;
        state.catNameLocked = true;
      }
      state.profileEditing = null;
      save();
      render();
      openSettings();
    });
  });
  const birthdayInput = document.querySelector('#birthday');
  if (!birthdayInput) return;
  attachSharedDatePickerControl({
    input: birthdayInput,
    triggerId: 'openBirthdayDate',
    fallback: birthdayInput.value ? new Date(`${birthdayInput.value}T00:00`) : new Date(2000, 0, 1),
    max: reminderDateValue(),
    onChange: value => { state.birthdayDraft = value; },
    closeOnSelect: false
  });
  document.querySelector('#confirmBirthdayEdit')?.addEventListener('click', () => {
    const value = state.birthdayDraft || birthdayInput.value;
    if (!value) return;
    document.querySelector('#sharedDatePicker')?.remove();
    openProfileConfirmation('birthday', () => {
      state.birthday = value;
      state.birthdayUpdatedAt = Date.now();
      delete state.birthdayDraft;
      state.profileEditing = null;
      save();
      render();
      openSettings();
    });
  });
  requestAnimationFrame(() => {
    if (state.profileEditing === 'birthday') document.querySelector('#openBirthdayDate')?.click();
    if (['owner', 'cat'].includes(state.profileEditing)) document.querySelector('#profileNameInput')?.focus();
  });
}
function reminderDateLabel(value) {
  const date = new Date(`${value}T00:00`);
  return state.locale === 'zh-CN'
    ? `${date.getMonth() + 1}月${date.getDate()}日`
    : date.toLocaleDateString(localeTag(), { month: 'short', day: 'numeric' });
}
function isSameReminderDay(time, reference = new Date()) { const date = new Date(time); return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth() && date.getDate() === reference.getDate(); }
function renderReminderDrawer() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const now = Date.now();
  const pending = state.reminders.filter(reminder => !reminder.completed).sort((a, b) => a.at - b.at);
  const completed = state.reminders.filter(reminder => reminder.completed).sort((a, b) => b.at - a.at);
  const completedSubtasks = state.completedSubtasks || [];
  const belongsToReminder = (subtask, reminder) => subtask.parentId === reminder.id || (!subtask.parentId && subtask.parentTitle === reminder.title && Math.abs((subtask.completedAt || 0) - (reminder.completedAt || 0)) < 5000);
  const hasRecurringSuccessor = reminder => state.reminders.some(candidate => candidate.id !== reminder.id && ((candidate.recurrenceRootId && candidate.recurrenceRootId === (reminder.recurrenceRootId || reminder.id)) || (!candidate.recurrenceRootId && candidate.repeat && candidate.repeat !== 'none' && candidate.title === reminder.title && candidate.at > reminder.at)));
  const isRecurringCompletion = reminder => Boolean(reminder.repeat && reminder.repeat !== 'none') || hasRecurringSuccessor(reminder);
  const unfinishedSubtasksFor = items => [
    ...items.flatMap(reminder => (reminder.subtasks || []).filter(task => task && !task.startsWith('[done] '))),
    ...completedSubtasks.filter(subtask => subtask.completed === false && !subtask.returnedToPending && items.some(reminder => belongsToReminder(subtask, reminder)))
  ];
  const overdueItems = pending.filter(reminder => reminder.at < todayStart.getTime());
  const todayItems = pending.filter(reminder => isSameReminderDay(reminder.at));
  const plannedItems = pending.filter(reminder => reminder.at >= todayStart.getTime());
  const markedItems = pending.filter(reminder => reminder.flagged);
  const urgentItems = pending.filter(reminder => reminder.urgent);
  const filters = {
    today: { title: '今天', icon: 'calendar-outline.svg', items: [...overdueItems, ...todayItems], subtasks: unfinishedSubtasksFor([...overdueItems, ...todayItems]), tone: 'today' },
    planned: { title: '计划', icon: 'calendar-days.svg', items: [...overdueItems, ...plannedItems], subtasks: unfinishedSubtasksFor([...overdueItems, ...plannedItems]), tone: 'planned' },
    all: { title: '全部', icon: 'archive.svg', items: pending, subtasks: unfinishedSubtasksFor(pending), tone: 'all' },
    marked: { title: '标记', icon: 'paw-solid.svg', items: markedItems, subtasks: unfinishedSubtasksFor(markedItems), tone: 'marked' },
    urgent: { title: '紧急', icon: 'alarm-clock.svg', items: urgentItems, subtasks: unfinishedSubtasksFor(urgentItems), tone: 'urgent' },
    completed: { title: '完成', icon: 'check.svg', items: completed, subtasks: completedSubtasks, tone: 'completed' }
  };
  const subtaskListFilter = { title: '提醒事项', items: pending, tone: 'all' };
  const completedSubtaskListFilter = { title: '提醒事项', items: [...state.reminders].sort((a, b) => a.at - b.at), tone: 'all' };
  const item = reminder => {
    const isCompletedSubtaskView = state.reminderView === 'completed-subtasks';
    const isInlineSubtaskView = ['all', 'subtasks', 'completed-subtasks'].includes(state.reminderView);
    const usesCalendarTime = isInlineSubtaskView || ['marked', 'urgent'].includes(state.reminderView);
    const storedSubtasks = (reminder.subtasks || []).filter(task => task && !task.startsWith('[done] '));
    const completedSubtaskRecords = isCompletedSubtaskView
      ? state.completedSubtasks.filter(subtask => subtask.parentId === reminder.id || (!subtask.parentId && subtask.parentTitle === reminder.title && Math.abs((subtask.completedAt || 0) - (reminder.completedAt || 0)) < 5000)).sort((a, b) => Number(a.completed !== false) - Number(b.completed !== false))
      : [];
    const subtasks = completedSubtaskRecords.length ? completedSubtaskRecords : storedSubtasks;
    const expanded = isInlineSubtaskView && state.reminderExpandedId === reminder.id;
    const selectedForSubtasks = ['subtasks', 'completed-subtasks'].includes(state.reminderView) && state.reminderSubtaskHighlightId === reminder.id;
    const inlineSubtasks = expanded ? `<div class="reminder-inline-subtasks">${completedSubtaskRecords.length
      ? completedSubtaskRecords.map(subtask => `<button class="${subtask.completed === false ? 'is-unchecked' : 'is-completing'}" type="button" data-reminder-completed-subtask="${subtask.id}" aria-label="${subtask.completed === false ? '完成' : '取消完成'}子任务：${escapeHtml(subtask.title)}"><i aria-hidden="true"></i>${escapeHtml(subtask.title)}</button>`).join('')
      : (reminder.subtasks || []).map((task, index) => {
        if (!task || task.startsWith('[done] ')) return '';
        const isSubtaskCompleting = state.completingSubtasks.some(entry => entry.reminderId === reminder.id && entry.index === index);
        return `<button class="${isSubtaskCompleting ? 'is-completing' : ''}" type="button" data-reminder-inline-subtask="${reminder.id}" data-reminder-inline-subtask-index="${index}" aria-label="${isSubtaskCompleting ? '取消完成' : '完成'}子任务：${escapeHtml(task)}"><i aria-hidden="true"></i>${escapeHtml(task.replace(/^\[done\]\s*/, ''))}</button>`;
      }).join('')}</div>` : '';
    const subtaskToggle = isInlineSubtaskView && subtasks.length ? `<button class="reminder-inline-toggle ${expanded ? 'is-expanded' : ''}" type="button" data-reminder-inline-toggle="${reminder.id}" aria-label="${expanded ? '收起' : '展开'} ${subtaskCountLabel(subtasks.length)}" aria-expanded="${expanded}"><b>${subtasks.length}</b><i aria-hidden="true"></i></button>` : '';
    const isOverdue = !reminder.completed && reminder.at < now;
    const usesOverdueStyle = isOverdue && !['completed', 'completed-subtasks', 'subtasks'].includes(state.reminderView);
    const timeText = new Date(reminder.at).toLocaleTimeString(localeTag(), { hour: '2-digit', minute: '2-digit', hour12: false });
    const repeatLabel = reminderRepeatLabel(reminder);
    const timeMarkup = state.reminderView === 'completed'
      ? `${copy('notify')} ${formatAllReminderTime(reminder.at)}`
      : usesOverdueStyle && state.reminderView === 'today'
        ? `${copy('notify')} <b class="reminder-overdue-time">${formatAllReminderTime(reminder.at)}</b>`
        : usesOverdueStyle && state.reminderView === 'planned'
          ? `${copy('notify')} <b class="reminder-overdue-time">${timeText}</b>`
          : usesOverdueStyle
            ? `<b class="reminder-overdue-time">${formatAllReminderTime(reminder.at)}</b>`
      : (usesCalendarTime ? formatAllReminderTime(reminder.at) : formatReminderTime(reminder.at));
    const urgentIcon = reminder.urgent ? `<img class="${usesOverdueStyle ? 'is-urgent-today' : ''}" src="/icons/alarm-clock.svg" alt="紧急提醒">` : '';
    const repeatMarkup = state.reminderView !== 'completed' && repeatLabel ? `<b class="reminder-repeat ${usesOverdueStyle ? 'is-overdue' : ''}"><img src="/icons/repeat.svg" alt="">${repeatLabel}</b>` : '';
    const isCompleting = Boolean(reminder.completing);
    const isComplete = reminder.completed || isCompleting;
    const isRecurringCompletedItem = state.reminderView === 'completed' && isRecurringCompletion(reminder);
    const completedSubtaskCount = state.reminderView === 'completed' && !isRecurringCompletedItem
      ? Math.max(
        Number(reminder.subtaskTotal) || 0,
        (reminder.subtasks || []).filter(Boolean).length,
        state.completedSubtasks.filter(subtask => subtask.parentId === reminder.id || (!subtask.parentId && subtask.parentTitle === reminder.title && Math.abs((subtask.completedAt || 0) - (reminder.completedAt || 0)) < 5000)).length
      )
      : 0;
    const completedSubtaskSummary = completedSubtaskCount ? `<button class="reminder-completed-subtask-count" type="button" data-reminder-completed-subtasks="${reminder.id}">${subtaskCountLabel(completedSubtaskCount)}</button>` : '';
    const completedAt = reminder.completed && state.reminderView === 'completed' ? `<span class="reminder-completed-at">${formatCompletedAt(reminder.completedAt || Math.min(Date.now(), reminder.at))}</span>` : '';
    return `<div class="reminder-swipe ${state.reminderSwipeId === reminder.id ? 'is-open' : ''}"><div class="reminder-actions" aria-label="提醒操作"><button class="reminder-action is-edit" type="button" data-reminder-edit="${reminder.id}" aria-label="编辑提醒"><img src="/icons/notebook-pen.svg" alt=""><span>编辑</span></button><button class="reminder-action is-mark" type="button" data-reminder-mark="${reminder.id}" aria-label="${reminder.flagged ? '取消标记' : '标记'}提醒"><img src="/icons/paw-print.svg" alt=""><span>标记</span></button><button class="reminder-action is-delete" type="button" data-reminder-delete="${reminder.id}" aria-label="删除提醒"><img src="/icons/trash-2.svg" alt=""><span>删除</span></button></div><article class="reminder-item ${isComplete ? 'is-complete' : ''} ${isCompleting ? 'is-completing' : ''} ${isInlineSubtaskView && subtasks.length ? 'has-inline-subtasks' : ''} ${selectedForSubtasks ? 'is-subtask-focus' : ''} ${isRecurringCompletedItem ? 'is-recurring-completion' : ''}" data-reminder-row="${reminder.id}"><button class="reminder-check" type="button" data-reminder-toggle="${reminder.id}" aria-label="${isCompleting ? '取消完成' : reminder.completed ? '恢复' : '完成'}提醒">${isComplete ? '✓' : ''}</button><div><strong>${escapeHtml(reminderTitleLabel(reminder.title))}</strong>${reminder.description ? `<em>${escapeHtml(reminder.description)}</em>` : ''}<span class="reminder-time">${timeMarkup}${repeatMarkup}${urgentIcon}${completedSubtaskSummary}</span>${completedAt}${inlineSubtasks}</div><span class="reminder-mark-slot">${reminder.flagged ? '<img class="reminder-paw-mark" src="/icons/paw-solid.svg" alt="已标记">' : ''}${subtaskToggle}</span></article></div>`;
  };
  const timeOfDay = reminder => {
    const hour = new Date(reminder.at).getHours();
    return hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上';
  };
  const renderTodayGroups = items => {
    const groups = ['上午', '下午', '晚上'];
    const overdue = items.filter(reminder => reminder.at < todayStart.getTime());
    const current = items.filter(reminder => reminder.at >= todayStart.getTime());
    return `${overdue.length ? `<section class="reminder-overdue-today">${overdue.map(item).join('')}</section>` : ''}<div class="reminder-time-groups">${groups.map(label => {
      const selected = state.todayAddPeriod === label;
      return `<section class="reminder-time-group ${selected ? 'is-add-open' : ''}"><h3><button type="button" data-today-period="${label}">${label}</button>${selected ? `<button class="plan-day-add" type="button" data-today-add="${label}" aria-label="为${label}新建提醒">＋</button>` : ''}</h3>${current.filter(reminder => timeOfDay(reminder) === label).map(item).join('')}</section>`;
    }).join('')}</div>${items.length ? '' : '<p class="reminder-empty reminder-day-empty">今天还没有提醒事项。</p>'}`;
  };
  const renderPlanTimeline = items => {
    const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
    const calendarDayLabel = date => localeCalendarDay(date);
    const dayLabel = (date, offset) => offset === 0 ? copy('today') : offset === 1 ? copy('tomorrow') : offset === 2 ? copy('afterTomorrow') : calendarDayLabel(date);
    const overdueDayLabel = date => {
      const offset = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - todayStart) / 86400000);
      return offset === -1 ? copy('yesterday') : offset === -2 ? copy('beforeYesterday') : calendarDayLabel(date);
    };
    const renderDay = (date, label) => {
      const entries = items.filter(reminder => isSameReminderDay(reminder.at, date));
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const selected = state.planAddDate === value;
      return `<section class="plan-day ${entries.length ? 'has-items' : 'is-empty'} ${selected ? 'is-add-open' : ''}"><h3><button type="button" data-plan-day="${value}">${label}</button>${selected ? `<button class="plan-day-add" type="button" data-plan-add="${value}" aria-label="为${label}新建提醒">＋</button>` : ''}</h3>${entries.map(item).join('')}</section>`;
    };
    const overdue = items.filter(reminder => reminder.at < todayStart.getTime());
    const overdueDates = [...new Set(overdue.map(reminder => new Date(reminder.at).toDateString()))];
    const overdueContent = overdue.length ? `<section class="plan-overdue"><h3>已逾期</h3>${overdueDates.map(value => {
      const date = new Date(value);
      return `<section class="plan-overdue-day"><h4>${overdueDayLabel(date)}</h4>${overdue.filter(reminder => isSameReminderDay(reminder.at, date)).map(item).join('')}</section>`;
    }).join('')}</section>` : '';
    const week = Array.from({ length: 7 }, (_, offset) => renderDay(addDays(todayStart, offset), dayLabel(addDays(todayStart, offset), offset))).join('');
    const afterWeek = addDays(todayStart, 7).getTime();
    const firstFutureMonth = new Date(addDays(todayStart, 7).getFullYear(), addDays(todayStart, 7).getMonth(), 1);
    const months = Array.from({ length: 12 }, (_, offset) => {
      const monthStart = new Date(firstFutureMonth.getFullYear(), firstFutureMonth.getMonth() + offset, 1);
      const monthEnd = new Date(firstFutureMonth.getFullYear(), firstFutureMonth.getMonth() + offset + 1, 1);
      const entries = items.filter(reminder => reminder.at >= Math.max(afterWeek, monthStart.getTime()) && reminder.at < monthEnd.getTime());
      const label = monthSectionLabel(monthStart, offset === 0);
      const periodStart = new Date(Math.max(afterWeek, monthStart.getTime()));
      const value = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}-${String(periodStart.getDate()).padStart(2, '0')}`;
      const selected = state.planAddDate === value;
      const byDay = [...new Set(entries.map(reminder => new Date(reminder.at).toDateString()))].map(value => {
        const date = new Date(value);
        return `<section class="plan-month-day"><h4>${calendarDayLabel(date)}</h4>${entries.filter(reminder => isSameReminderDay(reminder.at, date)).map(item).join('')}</section>`;
      }).join('');
      return `<section class="plan-month ${entries.length ? 'has-items' : 'is-empty'} ${selected ? 'is-add-open' : ''}"><h3><button type="button" data-plan-period="${value}">${label}</button>${selected ? `<button class="plan-day-add" type="button" data-plan-add="${value}" aria-label="为${label}新建提醒">＋</button>` : ''}</h3>${byDay}</section>`;
    }).join('');
    return `<div class="reminder-plan-timeline">${overdueContent}${week}${months}</div>`;
  };
  const editingReminder = state.reminders.find(reminder => reminder.id === state.reminderEditingId);
  const date = state.reminderDraft?.date || (!editingReminder && state.planAddDate ? state.planAddDate : reminderDateValue(editingReminder?.at));
  const time = state.reminderDraft?.time || reminderTimeValue(editingReminder?.at);
  const completedSubtaskItem = subtask => {
    const parent = state.reminders.find(reminder => reminder.id === subtask.parentId);
    const canRestoreToCycle = parent?.completed && isRecurringCompletion(parent);
    const check = canRestoreToCycle
      ? `<button class="reminder-check" type="button" data-reminder-completed-subtask="${subtask.id}" aria-label="取消完成子任务：${escapeHtml(subtask.title)}">✓</button>`
      : '<span class="reminder-check">✓</span>';
    return `<article class="reminder-item is-complete reminder-completed-subtask">${check}<div><strong>${escapeHtml(subtask.title)}</strong><span class="reminder-time">${escapeHtml(fromReminderLabel(reminderTitleLabel(subtask.parentTitle)))}</span><span class="reminder-completed-at">${formatCompletedAt(subtask.completedAt)}</span></div></article>`;
  };
  const cards = Object.entries(filters).map(([key, filter]) => {
    const icon = key === 'today' ? `<i class="reminder-calendar-date" aria-label="今天 ${new Date().getDate()} 日">${new Date().getDate()}</i>` : `<img src="/icons/${filter.icon}" alt="">`;
    const count = key === 'completed' ? '' : `<b>${filter.items.length}</b>`;
    return `<button class="reminder-summary-card is-${filter.tone}" type="button" data-reminder-filter="${key}">${icon}<span>${filter.title}</span>${count}</button>`;
  }).join('');
  const activeFilter = state.reminderView === 'subtasks' ? subtaskListFilter : state.reminderView === 'completed-subtasks' ? completedSubtaskListFilter : filters[state.reminderView];
  const listItems = activeFilter?.items || [];
  const listSubtasks = state.reminderView === 'completed' ? (activeFilter?.subtasks || []).filter(subtask => subtask.completed !== false) : [];
  const completedContent = () => {
    const entries = [
      ...listItems.map(reminder => ({ time: reminder.completedAt || Math.min(Date.now(), reminder.at), html: item(reminder) })),
      ...listSubtasks.map(subtask => ({ time: subtask.completedAt, html: completedSubtaskItem(subtask) }))
    ].sort((a, b) => b.time - a.time);
    const groups = entries.reduce((result, entry) => {
      const label = formatReminderDay(entry.time);
      (result[label] ||= []).push(entry.html);
      return result;
    }, {});
    return Object.entries(groups).map(([label, entries]) => `<section class="reminder-completed-group"><h3>${label}</h3>${entries.join('')}</section>`).join('');
  };
  const listContent = state.reminderView === 'today'
    ? renderTodayGroups(listItems)
    : state.reminderView === 'planned'
      ? renderPlanTimeline(listItems)
      : state.reminderView === 'completed' && (listItems.length || listSubtasks.length)
        ? completedContent()
      : listItems.length || listSubtasks.length
        ? `${listItems.map(item).join('')}${listSubtasks.map(completedSubtaskItem).join('')}`
        : `<p class="reminder-empty">${state.reminderView === 'completed' ? '还没有完成项目。' : '这里暂时没有提醒。'}</p>`;
  const completedSummary = ['completed', 'completed-subtasks'].includes(state.reminderView) ? `<p class="completed-summary"><span>${completedItemsLabel(completed.length + completedSubtasks.filter(subtask => subtask.completed !== false).length)}</span><button id="openCompletedClear" type="button">清除</button></p>${state.completedClearOpen ? '<section class="completed-clear-menu" role="dialog" aria-label="清除完成项目"><p>清除完成的提醒事项</p><button id="clearAllCompleted" type="button">所有完成项目</button></section>' : ''}` : '';
  const list = activeFilter ? `<section class="reminder-detail"><header><button class="reminder-back" id="backToReminderOverview" type="button" aria-label="返回提醒概览">‹</button><div class="reminder-detail-title"><h2>${activeFilter.title}</h2>${completedSummary}</div></header><div class="reminder-list">${listContent}</div></section>` : '';
  const composer = state.reminderComposerOpen ? `<section class="reminder-composer"><header><div><p>${editingReminder ? '编辑提醒' : '新建提醒'}</p><h2>${editingReminder ? '改一改提醒内容' : '让小猫准时叫你'}</h2></div><button class="close-button" id="closeReminderComposer" type="button" aria-label="关闭提醒编辑">×</button></header><form class="reminder-form" id="reminderForm"><label class="reminder-field"><span>标题</span><input id="reminderTitle" type="text" maxlength="40" value="${escapeHtml(editingReminder ? reminderTitleLabel(editingReminder.title) : '')}" placeholder="新增事件提醒"></label><label class="reminder-field"><span>事件内容</span><textarea id="reminderDescription" maxlength="120" placeholder="补充一点细节（选填）">${escapeHtml(editingReminder?.description || '')}</textarea></label><div class="reminder-schedule"><button id="openReminderDate" type="button"><span>日期</span><b id="reminderDateLabel">${reminderDateLabel(date)}</b></button><button id="openReminderTime" type="button"><span>时间</span><b id="reminderTimeLabel">${time}</b></button><input id="reminderDate" type="date" value="${date}" required><input id="reminderTime" type="time" value="${time}" required></div><label class="reminder-field"><span>事件子任务</span><textarea id="reminderSubtasks" maxlength="240" placeholder="一行一个子任务（选填）">${escapeHtml(state.reminderDraft?.subtasks ?? (editingReminder?.subtasks || []).join('\n'))}</textarea></label><div class="reminder-options"><label class="reminder-switch"><span><b>紧急提醒</b><small>到点后会像闹钟一样持续响</small></span><input id="reminderUrgent" type="checkbox" ${editingReminder?.urgent ? 'checked' : ''}><i aria-hidden="true"></i></label><label class="reminder-switch"><span><b>标记提醒</b><small>列表右侧会留下猫爪</small></span><input id="reminderFlagged" type="checkbox" ${editingReminder?.flagged ? 'checked' : ''}><i aria-hidden="true"></i></label></div><div class="reminder-settings"><label>是否重复<select id="reminderRepeat"><option value="none" ${!editingReminder?.repeat || editingReminder.repeat === 'none' ? 'selected' : ''}>不重复</option><option value="daily" ${editingReminder?.repeat === 'daily' ? 'selected' : ''}>每天</option><option value="weekly" ${editingReminder?.repeat === 'weekly' ? 'selected' : ''}>每周</option><option value="monthly" ${editingReminder?.repeat === 'monthly' ? 'selected' : ''}>每月</option><option value="custom" ${editingReminder?.repeat === 'custom' ? 'selected' : ''}>自定义</option></select></label><label>提前提醒<select id="reminderAdvance"><option value="0" ${!editingReminder?.advanceMode && (editingReminder?.advanceMinutes || 0) === 0 ? 'selected' : ''}>准时提醒</option><option value="5" ${!editingReminder?.advanceMode && editingReminder?.advanceMinutes === 5 ? 'selected' : ''}>提前 5 分钟</option><option value="15" ${!editingReminder?.advanceMode && editingReminder?.advanceMinutes === 15 ? 'selected' : ''}>提前 15 分钟</option><option value="30" ${!editingReminder?.advanceMode && editingReminder?.advanceMinutes === 30 ? 'selected' : ''}>提前 30 分钟</option><option value="60" ${!editingReminder?.advanceMode && editingReminder?.advanceMinutes === 60 ? 'selected' : ''}>提前 1 小时</option><option value="1440" ${!editingReminder?.advanceMode && editingReminder?.advanceMinutes === 1440 ? 'selected' : ''}>提前 1 天</option><option value="custom" ${editingReminder?.advanceMode === 'custom' ? 'selected' : ''}>自定义</option></select></label></div><div class="reminder-custom-panel" id="repeatCustomPanel" ${editingReminder?.repeat === 'custom' ? '' : 'hidden'}><strong>自定义重复</strong><label>每隔<input id="reminderRepeatEvery" type="number" min="1" max="99" value="${editingReminder?.repeatEvery || 1}"></label><select id="reminderRepeatUnit"><option value="day" ${!editingReminder?.repeatUnit || editingReminder.repeatUnit === 'day' ? 'selected' : ''}>天</option><option value="week" ${editingReminder?.repeatUnit === 'week' ? 'selected' : ''}>周</option><option value="month" ${editingReminder?.repeatUnit === 'month' ? 'selected' : ''}>个月</option></select><label>结束重复<select id="reminderRepeatEnd"><option value="never" ${!editingReminder?.repeatEndAt ? 'selected' : ''}>永不</option><option value="date" ${editingReminder?.repeatEndAt ? 'selected' : ''}>于日期</option></select></label><input id="reminderRepeatEndDate" type="date" value="${editingReminder?.repeatEndAt || ''}" ${editingReminder?.repeatEndAt ? '' : 'hidden'}></div><div class="reminder-custom-panel" id="advanceCustomPanel" ${editingReminder?.advanceMode === 'custom' ? '' : 'hidden'}><strong>自定义提前提醒</strong><label>提前<input id="reminderAdvanceAmount" type="number" min="1" max="999" value="${editingReminder?.advanceAmount || 1}"></label><select id="reminderAdvanceUnit"><option value="minute" ${!editingReminder?.advanceUnit || editingReminder.advanceUnit === 'minute' ? 'selected' : ''}>分钟</option><option value="hour" ${editingReminder?.advanceUnit === 'hour' ? 'selected' : ''}>小时</option><option value="day" ${editingReminder?.advanceUnit === 'day' ? 'selected' : ''}>天</option><option value="week" ${editingReminder?.advanceUnit === 'week' ? 'selected' : ''}>周</option></select></div><button class="reminder-submit" type="submit">${editingReminder ? '保存修改' : '添加提醒'}</button></form></section>` : '';
  const body = state.reminderView === 'overview' ? `<div class="reminder-summary-grid">${cards}</div><p class="reminder-summary-note">点选分类，查看小猫替你记住的事。</p>` : list;
  const addButton = ['planned', 'today', 'completed', 'completed-subtasks'].includes(state.reminderView) ? '' : '<button class="reminder-add-button" id="openReminderComposer" type="button" aria-label="新建提醒">＋</button>';
  const heading = state.reminderView === 'overview' ? '<div><p>提醒事项</p><h1 id="remindersTitle">重要的事小猫替你记着</h1></div>' : '';
  const sheetLabel = state.reminderView === 'overview' ? 'aria-labelledby="remindersTitle"' : 'aria-label="提醒列表"';
  return `<aside class="reminders-drawer ${state.remindersOpen ? 'open' : ''}" id="remindersDrawer" aria-hidden="${state.remindersOpen ? 'false' : 'true'}"><section class="reminders-sheet ${state.reminderView === 'overview' ? '' : 'is-detail'}" ${sheetLabel}><header class="reminders-head">${heading}${state.reminderView === 'overview' ? '<button class="close-button" id="closeReminders" type="button" aria-label="关闭提醒">×</button>' : ''}</header>${body}${addButton}${composer}</section></aside>`;
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify({ fish: state.fish, focusRecords: state.focusRecords, reminders: state.reminders, completedSubtasks: state.completedSubtasks, reminderLastTriggeredAt: state.reminderLastTriggeredAt, active: state.active, duration: state.duration, remaining: state.remaining, endsAt: state.endsAt, purpose: state.purpose, musicVolume: state.musicVolume, catVolume: state.catVolume, locale: state.locale, ownerName: state.ownerName, ownerNameLocked: state.ownerNameLocked, catName: state.catName, catNameLocked: state.catNameLocked, birthday: state.birthday, birthdayUpdatedAt: state.birthdayUpdatedAt })); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }
function renderFocusSettlement() {
  if (state.view !== 'reward' || !focusSettlement) return '';
  const complete = focusSettlement.kind === 'complete';
  const message = settlementCopy(complete ? 'settlementComplete' : 'settlementEarly');
  const button = copy(complete ? 'settlementReceive' : 'settlementContinue');
  return `<section class="focus-settlement-backdrop" role="dialog" aria-modal="true" aria-labelledby="focusSettlementTitle"><div class="focus-settlement-card ${complete ? 'is-complete' : 'is-early'}"><img class="focus-settlement-art" src="/images/settlement/focus-reward-card-final.png" alt=""><div class="focus-settlement-content"><h2 id="focusSettlementTitle">${message}</h2>${complete ? `<p class="focus-settlement-gift"><span>${copy('settlementGift')}</span><span class="focus-settlement-fish-count"><img src="/icons/fish-simple.svg" alt="${state.locale === 'zh-CN' ? '小鱼干' : state.locale === 'ms' ? 'snek ikan' : 'fish treat'}"><span>×1</span></span></p>` : ''}<button id="confirmFocusSettlement" type="button">${button}<img src="/icons/paw-print.svg" alt=""></button></div></div></section>`;
}

function render() {
  document.documentElement.lang = localeTag();
  document.documentElement.dataset.locale = state.locale;
  // List views can rerender freely without resetting the in-progress reminder clip.
  const preservedReminderCatLayer = activeReminderReactionId && reminderReactionPlaying
    ? document.querySelector('.cat-video-layer')
    : null;
  preservedReminderCatLayer?.remove();
  const isCloseView = state.view === 'rug' || state.view === 'reward';
  const showEntryCat = state.view === 'rug' || state.view === 'reward';
  const activeDueReminder = !state.active && state.view === 'rug' ? dueReminder() : null;
  const activeDueReminderCount = !state.active && state.view === 'rug' ? dueReminderCount() : 0;
  const dueReminderBadge = activeDueReminderCount ? `<span class="reminder-due-badge" aria-label="${activeDueReminderCount} 个已提醒未完成任务">${activeDueReminderCount > 99 ? '99+' : activeDueReminderCount}</span>` : '';
  const focusControl = state.active
    ? `<div class="timer-setup focus-running"><div class="timer-row"><strong id="countdown" class="running-countdown">${formatTime(state.remaining)}</strong></div><p class="focus-title task-title">${escapeHtml(state.purpose || copy('focus'))}</p></div>`
    : state.view === 'reward'
      ? '<div class="reward-state" aria-hidden="true"></div>'
      : `<div class="timer-setup"><div class="timer-row"><button class="duration-button" id="editDuration" type="button" aria-label="设置专注时长"><strong>${formatTime(state.duration)}</strong></button><button class="purpose-button" id="editPurpose" type="button" aria-label="填写本次专注内容" title="填写本次专注内容"><img class="note-icon" src="/icons/notebook-pen.svg" alt=""></button></div><p class="focus-title">${escapeHtml(state.purpose || copy('focus'))}</p>${state.editingDuration ? `<form class="inline-editor" id="durationForm"><label>分钟<input id="durationInput" type="number" min="1" max="180" value="${Math.round(state.duration / 60)}" inputmode="numeric" required></label><button type="submit">确定</button></form>` : ''}${state.editingPurpose ? `<form class="inline-editor purpose-editor" id="purposeForm"><input id="purposeInput" type="text" maxlength="24" value="${escapeHtml(state.purpose)}" placeholder="例如：整理今天的方案"><button type="submit">确定</button></form>` : ''}<button class="start-button" id="startFocus" type="button"><span>开始</span></button></div>`;
  app.innerHTML = `<section class="room ${state.active ? 'is-focusing' : ''} ${isCloseView ? 'is-close' : ''}">
    <div class="room-art" aria-hidden="true"></div><div class="focus-art" aria-hidden="true"></div><div class="sun-wash" aria-hidden="true"></div>
    ${showEntryCat ? `<div class="cat-video-layer" aria-hidden="true"><video class="cat-animation is-active" src="${catActions.idle.source}" autoplay loop muted playsinline preload="auto" poster="/images/cat-room/figure-layout-controls-idle-poster.png"></video><video class="cat-animation" muted playsinline preload="auto" poster="/images/cat-room/figure-layout-controls-idle-poster.png"></video><video class="cat-chroma-source" id="catChromaSource" playsinline preload="auto"></video><canvas class="cat-chroma-canvas" id="catChromaCanvas"></canvas></div>` : ''}
    <header class="topbar"><button class="top-icon-button shop-top-button" id="openCollection" type="button" aria-label="打开商城，拥有 ${state.fish} 条小鱼干"><img src="/icons/shopping-bag.svg" alt=""><span class="fish-count"><img src="/icons/fish-simple.svg" alt="">x <b>${state.fish}</b></span></button><button class="top-icon-button settings-top-button" id="openSettings" type="button" aria-label="打开系统设置"><img src="/icons/settings.svg" alt=""></button></header>
    ${!state.active && state.view === 'rug' ? `<button class="stats-button" id="openStats" type="button" aria-label="查看专注统计" title="专注统计"><img src="/icons/paw-chart.svg" alt=""></button><button class="reminders-button" id="openReminders" type="button" aria-label="${activeDueReminderCount ? `打开提醒事项，${activeDueReminderCount} 个已提醒未完成任务` : '打开提醒事项'}" title="提醒事项"><img src="/icons/reminder-list.svg" alt="">${dueReminderBadge}</button><button class="reminder-bell ${activeReminderReactionId && !reminderBellAcknowledged ? 'is-ringing' : ''}" id="openReminderBell" type="button" aria-label="${activeDueReminder ? `查看到时提醒：${escapeHtml(reminderTitleLabel(activeDueReminder.title))}` : '打开提醒事项'}" title="提醒"><img src="/icons/bell.svg" alt=""></button>` : ''}
    <section class="focus-panel" aria-live="polite">${focusControl}<p class="room-note">${state.note}</p></section>
    ${state.active ? '<div class="finish-slider" id="finishSlider"><div class="finish-track"><span class="finish-track-copy">右滑放弃</span><span class="finish-track-chevron" aria-hidden="true">››</span><input id="finishFocus" type="range" min="0" max="100" value="0" aria-label="向右滑动铃铛提前结束专注"></div></div>' : ''}
    ${renderFocusSettlement()}
    <aside class="collection-drawer" id="collectionDrawer" aria-hidden="true"><div class="drawer-sheet"><div class="drawer-head"><div><p>我的收藏</p><h1>慢慢把房间填满</h1></div><button class="close-button" id="closeCollection" type="button" aria-label="关闭收藏">x</button></div><section class="owned-section"><span class="section-label">已经拥有</span><div class="owned-items"><span>虎斑白猫</span><span>圆地毯</span></div></section><section class="shop-section"><div class="section-title"><span>互动家具</span><small>售价待定</small></div><div class="collection-list">${furniture.map(([name, detail]) => `<article><div class="item-icon">+</div><div><h2>${name}</h2><p>${detail}</p></div><span>家具</span></article>`).join('')}</div></section><section class="shop-section"><div class="section-title"><span>更多猫咪</span><small>售价待定</small></div><div class="collection-list">${cats.map(([name, detail]) => `<article><div class="item-icon">+</div><div><h2>${name}</h2><p>${detail}</p></div><span>外观</span></article>`).join('')}</div></section><p class="drawer-foot">家具会带来新的猫咪日常；具体价格等内容数量确定后再一起调整。</p></div></aside>
    <aside class="settings-drawer ${state.settingsOpen ? 'open' : ''}" id="settingsDrawer" aria-hidden="${state.settingsOpen ? 'false' : 'true'}"><section class="settings-sheet" aria-label="${copy('settings')}"><header class="settings-head"><div><p>${copy('settings')}</p></div><button class="close-button" id="closeSettings" type="button" aria-label="Close settings">x</button></header><section class="settings-section"><label class="settings-select" for="languageSelect"><span>${copy('language')}</span><select id="languageSelect"><option value="zh-CN" ${state.locale === 'zh-CN' ? 'selected' : ''}>中文</option><option value="en" ${state.locale === 'en' ? 'selected' : ''}>English</option><option value="ms" ${state.locale === 'ms' ? 'selected' : ''}>Bahasa Melayu</option></select></label><div class="sound-setting"><div><label for="musicVolume">${copy('music')}</label><output id="musicVolumeValue">${state.musicVolume}%</output></div><input id="musicVolume" type="range" min="0" max="100" value="${state.musicVolume}" aria-label="${copy('music')}"></div><div class="sound-setting"><div><label for="catVolume">${copy('catSound')}</label><output id="catVolumeValue">${state.catVolume}%</output></div><input id="catVolume" type="range" min="0" max="100" value="${state.catVolume}" aria-label="${copy('catSound')}"></div></section><section class="settings-section profile-section"><h2>${copy('profile')}</h2><label class="settings-profile-field" for="ownerName"><span>${copy('nickname')}</span><input id="ownerName" type="text" maxlength="24" value="${escapeHtml(state.ownerName)}"></label><label class="settings-profile-field" for="birthday"><span>${copy('birthday')}</span><input id="birthday" type="text" inputmode="numeric" maxlength="10" value="${escapeHtml(state.birthday)}" placeholder="YYYY-MM-DD"></label><p class="settings-hint">${copy('birthdayHint')}</p></section></aside>
    ${renderReminderDrawer()}
    ${renderStatsDrawer()}
    <div class="reward-toast" id="rewardToast" role="status" aria-live="polite"></div>
  </section>`;
  if (preservedReminderCatLayer && showEntryCat) {
    app.querySelector('.cat-video-layer')?.replaceWith(preservedReminderCatLayer);
    activeChromaVideo?.play().catch(() => {});
  }
  document.title = state.locale === 'zh-CN' ? '和猫一起坐一会儿' : state.locale === 'ms' ? 'Duduk sebentar bersama si comel' : 'Sit with your cat for a while';
  const dialogReminder = state.reminders.find(reminder => reminder.id === reminderBellDialogId && !reminder.completed);
  if (dialogReminder) mountReminderBellDialog(dialogReminder);
  else reminderBellDialogId = null;
  localizeStaticInterface();
  document.querySelector('#startFocus')?.addEventListener('click', startFocus);
  document.querySelector('#confirmFocusSettlement')?.addEventListener('click', () => {
    focusSettlement = null;
    state.view = 'rug';
    state.note = '它又在地毯上安静等着你了。';
    render();
  });
  document.querySelector('#openReminderBell')?.addEventListener('click', () => {
    const reminder = state.reminders.find(item => item.id === reminderBellTargetId && !item.completed)
      || state.reminders.find(item => item.id === activeReminderReactionId && !item.completed)
      || dueReminder();
    if (reminder) openReminderBellDialog(reminder);
  });
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
  document.querySelectorAll('[data-reminder-filter]').forEach(button => button.addEventListener('click', () => {
    state.completedClearOpen = false;
    state.reminderSwipeId = null;
    state.reminderView = button.dataset.reminderFilter;
    render();
    openReminders();
  }));
  document.querySelector('#backToReminderOverview')?.addEventListener('click', () => {
    state.completedClearOpen = false;
    const sourceView = state.reminderSubtaskSourceView;
    const sourceScrollTop = state.reminderSubtaskSourceScrollTop;
    state.reminderView = sourceView || 'overview';
    state.reminderSubtaskSourceView = null;
    state.reminderSubtaskSourceScrollTop = 0;
    state.reminderExpandedId = null;
    state.reminderSubtaskHighlightId = null;
    state.reminderSwipeId = null;
    render();
    openReminders();
    if (sourceView) requestAnimationFrame(() => {
      const sheet = document.querySelector('.reminders-sheet');
      if (sheet) sheet.scrollTop = sourceScrollTop;
    });
  });
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
  document.querySelector('#openReminderComposer')?.addEventListener('click', () => { rememberReminderScroll(); state.reminderDraft = null; state.reminderEditingId = null; state.reminderComposerOpen = true; render(); openReminders(); });
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
  document.querySelectorAll('[data-plan-add]').forEach(button => button.addEventListener('click', () => { rememberReminderScroll(); state.reminderDraft = null; state.planAddDate = button.dataset.planAdd; state.reminderEditingId = null; state.reminderComposerOpen = true; render(); openReminders(); }));
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
    state.reminderDraft = null;
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
    state.reminderDraft = null;
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
    const title = document.querySelector('#reminderTitle').value.trim() || defaultReminderTitle();
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
    if (!Number.isFinite(at)) return;
    const reminder = state.reminders.find(item => item.id === state.reminderEditingId);
    if (reminder) {
      cancelReminderNotification(reminder);
      reminder.title = title;
      reminder.description = description;
      reminder.subtasks = subtasks;
      reminder.repeatSubtasks = subtasks;
      reminder.subtaskTotal = Math.max(Number(reminder.subtaskTotal) || 0, subtasks.length);
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
      state.reminders.push({ id: nextReminderId(), title, description, subtasks, repeatSubtasks: subtasks, subtaskTotal: subtasks.length, at, completed: false, flagged, urgent, repeat, repeatEvery, repeatUnit, repeatEndAt, advanceMinutes, advanceMode, advanceAmount, advanceUnit });
    }
    const savedReminder = reminder || state.reminders[state.reminders.length - 1];
    save();
    void scheduleReminderNotification(savedReminder);
    state.reminderComposerOpen = false;
    state.reminderEditingId = null;
    state.reminderSwipeId = null;
    state.planAddDate = null;
    state.todayAddPeriod = null;
    state.reminderDraft = null;
    state.reminderView = isSameReminderDay(savedReminder.at) ? 'today' : 'planned';
    render();
    openReminders();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const sheet = document.querySelector('.reminders-sheet');
      if (sheet) sheet.scrollTop = reminderScrollTop;
      state.reminderReturnScrollTop = null;
    }));
  });
  const persistReminderDraft = () => {
    const dateInput = document.querySelector('#reminderDate');
    const timeInput = document.querySelector('#reminderTime');
    const subtaskInput = document.querySelector('#reminderSubtasks');
    state.reminderDraft = {
      ...(state.reminderDraft || {}),
      ...(dateInput?.value ? { date: dateInput.value } : {}),
      ...(timeInput?.value ? { time: timeInput.value } : {}),
      ...(subtaskInput ? { subtasks: subtaskInput.value } : {})
    };
  };
  const closeReminderPicker = () => { persistReminderDraft(); document.querySelector('#reminderPicker')?.remove(); };
  const openInlineReminderPicker = (kind, markup) => {
    const current = document.querySelector('#reminderPicker');
    if (current?.dataset.kind === kind) {
      closeReminderPicker();
      return null;
    }
    closeReminderPicker();
    document.querySelector('.reminder-schedule')?.insertAdjacentHTML('afterend', `<section class="reminder-inline-picker" id="reminderPicker" data-kind="${kind}">${markup}</section>`);
    return document.querySelector('#reminderPicker');
  };
  const openReminderDatePicker = () => {
    const input = document.querySelector('#reminderDate');
    let view = new Date(`${input.value}T00:00`);
    const picker = openInlineReminderPicker('date', '<div id="reminderPickerContent"></div>');
    if (!picker) return;
    let dateMode = 'calendar';
    let yearStart = view.getFullYear() - 5;
    const setDate = (year, month, day = new Date(`${input.value}T00:00`).getDate()) => {
      const safeDay = Math.min(day, new Date(year, month + 1, 0).getDate());
      input.value = `${year}-${String(month + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
      document.querySelector('#reminderDateLabel').textContent = reminderDateLabel(input.value);
      persistReminderDraft();
    };
    const bindWheel = (column, selector, onSelect) => {
      const buttons = [...column.querySelectorAll(selector)];
      const select = button => {
        if (!button || button.classList.contains('is-selected')) return;
        buttons.forEach(item => item.classList.toggle('is-selected', item === button));
        onSelect(button);
      };
      let scrolling = false;
      column.addEventListener('scroll', () => {
        if (scrolling) return;
        scrolling = true;
        requestAnimationFrame(() => {
          scrolling = false;
          const center = column.getBoundingClientRect().top + column.clientHeight / 2;
          const nearest = buttons.reduce((best, button) => Math.abs(button.getBoundingClientRect().top + button.offsetHeight / 2 - center) < Math.abs(best.getBoundingClientRect().top + best.offsetHeight / 2 - center) ? button : best, buttons[0]);
          select(nearest);
        });
      });
      requestAnimationFrame(() => { column.scrollTop = buttons.findIndex(button => button.classList.contains('is-selected')) * 38; });
    };
    const draw = () => {
      const year = view.getFullYear();
      const month = view.getMonth();
      if (dateMode === 'wheel') {
        const years = Array.from({ length: 15 }, (_, index) => yearStart + index).map(value => `<button class="${year === value ? 'is-selected' : ''}" type="button" data-reminder-wheel-year="${value}">${state.locale === 'zh-CN' ? `${value}年` : value}</button>`).join('');
        const months = Array.from({ length: 12 }, (_, index) => `<button class="${month === index ? 'is-selected' : ''}" type="button" data-reminder-wheel-month="${index}">${state.locale === 'zh-CN' ? `${index + 1}月` : new Intl.DateTimeFormat(localeTag(), { month: 'long' }).format(new Date(year, index, 1))}</button>`).join('');
        picker.querySelector('#reminderPickerContent').innerHTML = `<button class="reminder-picker-title" type="button" data-reminder-date-mode="calendar">${yearMonthLabel(view)} <i>⌄</i></button><div class="reminder-wheel-columns reminder-date-wheel"><div>${years}</div><div>${months}</div></div>`;
        picker.querySelector('[data-reminder-date-mode]')?.addEventListener('click', () => { dateMode = 'calendar'; draw(); });
        const [yearColumn, monthColumn] = picker.querySelectorAll('.reminder-date-wheel > div');
        const selectedDay = new Date(`${input.value}T00:00`).getDate();
        const syncWheelTitle = () => { picker.querySelector('.reminder-picker-title').innerHTML = `${yearMonthLabel(view)} <i>⌄</i>`; };
        bindWheel(yearColumn, '[data-reminder-wheel-year]', button => {
          view = new Date(Number(button.dataset.reminderWheelYear), view.getMonth(), 1);
          setDate(view.getFullYear(), view.getMonth(), selectedDay);
          syncWheelTitle();
        });
        bindWheel(monthColumn, '[data-reminder-wheel-month]', button => {
          view = new Date(view.getFullYear(), Number(button.dataset.reminderWheelMonth), 1);
          setDate(view.getFullYear(), view.getMonth(), selectedDay);
          syncWheelTitle();
        });
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
      picker.querySelector('#reminderPickerContent').innerHTML = `<div class="reminder-date-nav"><strong><button type="button" data-reminder-date-mode="wheel">${yearMonthLabel(view)} <i>›</i></button></strong><span><button type="button" data-reminder-date-step="-1" aria-label="${state.locale === 'en' ? 'Previous month' : state.locale === 'ms' ? 'Bulan lalu' : '上个月'}">‹</button><button type="button" data-reminder-date-step="1" aria-label="${state.locale === 'en' ? 'Next month' : state.locale === 'ms' ? 'Bulan depan' : '下个月'}">›</button></span></div><div class="reminder-picker-weekdays">${pickerWeekdays().map(day => `<span>${day}</span>`).join('')}</div><div class="reminder-picker-calendar">${cells}</div>`;
      picker.querySelectorAll('[data-reminder-date-step]').forEach(button => button.addEventListener('click', () => { view = new Date(year, month + Number(button.dataset.reminderDateStep), 1); draw(); }));
      picker.querySelectorAll('[data-reminder-date-mode]').forEach(button => button.addEventListener('click', () => { dateMode = button.dataset.reminderDateMode; yearStart = year - 7; draw(); }));
      picker.querySelectorAll('[data-reminder-date-choice]').forEach(button => button.addEventListener('click', () => { input.value = button.dataset.reminderDateChoice; document.querySelector('#reminderDateLabel').textContent = reminderDateLabel(input.value); persistReminderDraft(); draw(); }));
    };
    draw();
  };
  const openReminderTimePicker = () => {
    const input = document.querySelector('#reminderTime');
    let [hour, minute] = input.value.split(':').map(Number);
    const picker = openInlineReminderPicker('time', `<div class="reminder-time-picker"><div class="reminder-time-head"><span>${pickerUnit('hour')}</span><span>${pickerUnit('minute')}</span></div><div class="reminder-time-columns" id="reminderTimeColumns"></div></div>`);
    if (!picker) return;
    const draw = () => {
      picker.querySelector('#reminderTimeColumns').innerHTML = `<div>${Array.from({ length: 24 }, (_, value) => `<button class="${hour === value ? 'is-selected' : ''}" type="button" data-reminder-hour="${value}">${String(value).padStart(2, '0')}</button>`).join('')}</div><div>${Array.from({ length: 60 }, (_, value) => `<button class="${minute === value ? 'is-selected' : ''}" type="button" data-reminder-minute="${value}">${String(value).padStart(2, '0')}</button>`).join('')}</div>`;
      const sync = () => { input.value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`; document.querySelector('#reminderTimeLabel').textContent = input.value; persistReminderDraft(); };
      const bindWheel = (column, selector, current, set) => {
        const buttons = [...column.querySelectorAll(selector)];
        const select = button => {
          if (!button || button.classList.contains('is-selected')) return;
          buttons.forEach(item => item.classList.toggle('is-selected', item === button));
          set(Number(button.dataset[current]));
          sync();
        };
        let scrolling = false;
        column.addEventListener('scroll', () => {
          if (scrolling) return;
          scrolling = true;
          requestAnimationFrame(() => {
            scrolling = false;
            const center = column.getBoundingClientRect().top + column.clientHeight / 2;
            select(buttons.reduce((best, button) => Math.abs(button.getBoundingClientRect().top + button.offsetHeight / 2 - center) < Math.abs(best.getBoundingClientRect().top + best.offsetHeight / 2 - center) ? button : best, buttons[0]));
          });
        });
        let dragStart = null;
        column.addEventListener('pointerdown', event => {
          dragStart = { pointerId: event.pointerId, y: event.clientY, scrollTop: column.scrollTop };
          column.setPointerCapture(event.pointerId);
        });
        column.addEventListener('pointermove', event => {
          if (!dragStart || dragStart.pointerId !== event.pointerId) return;
          column.scrollTop = dragStart.scrollTop + dragStart.y - event.clientY;
        });
        const stopDragging = event => {
          if (!dragStart || dragStart.pointerId !== event.pointerId) return;
          dragStart = null;
          column.releasePointerCapture(event.pointerId);
        };
        column.addEventListener('pointerup', stopDragging);
        column.addEventListener('pointercancel', stopDragging);
        requestAnimationFrame(() => { column.scrollTop = buttons.findIndex(button => button.classList.contains('is-selected')) * 38; });
      };
      const [hourColumn, minuteColumn] = picker.querySelectorAll('.reminder-time-columns > div');
      bindWheel(hourColumn, '[data-reminder-hour]', 'reminderHour', value => { hour = value; });
      bindWheel(minuteColumn, '[data-reminder-minute]', 'reminderMinute', value => { minute = value; });
    };
    draw();
  };
  document.querySelector('#openReminderDate')?.addEventListener('click', openReminderDatePicker);
  document.querySelector('#openReminderTime')?.addEventListener('click', openReminderTimePicker);
  document.querySelector('#reminderDescription')?.setAttribute('placeholder', '备注');
  document.querySelector('#reminderDate')?.addEventListener('change', event => { document.querySelector('#reminderDateLabel').textContent = reminderDateLabel(event.target.value); persistReminderDraft(); });
  document.querySelector('#reminderTime')?.addEventListener('change', event => { document.querySelector('#reminderTimeLabel').textContent = event.target.value; persistReminderDraft(); });
  const subtaskInput = document.querySelector('#reminderSubtasks');
  const subtaskField = subtaskInput?.closest('.reminder-field');
  const decodeSubtasks = value => value.split('\n').filter(Boolean).map(line => ({ title: line.replace(/^\[done\]\s*/, ''), completed: line.startsWith('[done] ') }));
  const encodeSubtasks = items => items.map(item => `${item.completed ? '[done] ' : ''}${item.title.trim()}`).filter(Boolean).join('\n');
  const updateSubtaskSummary = value => {
    const count = decodeSubtasks(value ?? subtaskInput.value).length;
    const summary = subtaskField?.querySelector('[data-subtask-count]');
    if (summary) summary.textContent = count ? subtaskCountLabel(count) : (state.locale === 'en' ? 'Add subtasks' : state.locale === 'ms' ? 'Tambah subtugas' : '添加子任务');
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
    localizeStaticInterface();
    const editor = document.querySelector('#reminderSubtasksEditor');
    const syncSubtasks = () => {
      const value = encodeSubtasks(items);
      subtaskInput.value = value;
      state.reminderDraft = { ...(state.reminderDraft || {}), subtasks: value };
      const editingReminder = state.reminders.find(item => item.id === state.reminderEditingId);
      if (editingReminder) {
        editingReminder.subtasks = value.split('\n').filter(Boolean);
        editingReminder.subtaskTotal = Math.max(Number(editingReminder.subtaskTotal) || 0, decodeSubtasks(value).length);
      }
      updateSubtaskSummary(value);
    };
    const drawSubtasks = () => {
      const list = editor.querySelector('#reminderSubtaskList');
      list.innerHTML = items.map((item, index) => `<div class="reminder-subtask-row ${item.completed ? 'is-complete' : ''}"><button class="reminder-subtask-check ${item.completed ? 'is-complete' : ''}" type="button" data-subtask-toggle="${index}" aria-label="${item.completed ? '恢复' : '完成'}子任务">${item.completed ? '✓' : ''}</button><input type="text" maxlength="60" value="${escapeHtml(item.title)}" data-subtask-title="${index}"><button class="reminder-subtask-remove" type="button" data-subtask-remove="${index}" aria-label="删除子任务"><img src="/icons/trash-2.svg" alt=""></button></div>`).join('') || '<p class="reminder-subtask-empty">还没有子任务。</p>';
      localizeStaticInterface();
      list.querySelectorAll('[data-subtask-toggle]').forEach(button => button.addEventListener('click', () => { items[Number(button.dataset.subtaskToggle)].completed = !items[Number(button.dataset.subtaskToggle)].completed; syncSubtasks(); drawSubtasks(); }));
      list.querySelectorAll('[data-subtask-title]').forEach(input => input.addEventListener('input', () => { items[Number(input.dataset.subtaskTitle)].title = input.value; syncSubtasks(); }));
      list.querySelectorAll('[data-subtask-remove]').forEach(button => button.addEventListener('click', () => { items.splice(Number(button.dataset.subtaskRemove), 1); syncSubtasks(); drawSubtasks(); }));
    };
    const closeEditor = () => {
      syncSubtasks();
      if (state.reminderEditingId != null) save();
      editor.remove();
    };
    drawSubtasks();
    editor.querySelector('#closeSubtaskEditor').addEventListener('click', closeEditor);
    editor.querySelector('#addSubtaskItem').addEventListener('click', () => {
      const input = editor.querySelector('#newSubtaskTitle');
      const title = input.value.trim();
      if (!title) return;
      items.push({ title, completed: false });
      syncSubtasks();
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
  ['none', 'hourly', 'daily', 'weekdays', 'weekends', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'custom'].forEach(value => {
    const option = repeatSelect?.querySelector(`option[value="${value}"]`);
    if (option) repeatSelect.append(option);
  });
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
  const repeatField = repeatSelect?.closest('label');
  if (repeatSelect && repeatField) {
    repeatSelect.classList.add('reminder-native-select');
    const selectedRepeatLabel = repeatSelect.options[repeatSelect.selectedIndex]?.textContent || '永不';
    repeatField.insertAdjacentHTML('beforeend', `<button class="reminder-repeat-picker-trigger" id="openRepeatPicker" type="button" aria-expanded="false"><span>${escapeHtml(selectedRepeatLabel)}</span><i aria-hidden="true"></i></button><div class="reminder-repeat-picker-menu" id="repeatPickerMenu" hidden>${[...repeatSelect.options].map(option => `<button type="button" data-repeat-value="${option.value}" class="${option.value === repeatSelect.value ? 'is-selected' : ''}">${escapeHtml(option.textContent)}</button>`).join('')}</div>`);
    const trigger = document.querySelector('#openRepeatPicker');
    const menu = document.querySelector('#repeatPickerMenu');
    trigger?.addEventListener('click', () => {
      menu.hidden = !menu.hidden;
      trigger.setAttribute('aria-expanded', String(!menu.hidden));
    });
    menu?.querySelectorAll('[data-repeat-value]').forEach(button => button.addEventListener('click', () => {
      repeatSelect.value = button.dataset.repeatValue;
      trigger.querySelector('span').textContent = button.textContent;
      menu.querySelectorAll('button').forEach(option => option.classList.toggle('is-selected', option === button));
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      repeatSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }));
  }
  document.querySelector('#reminderRepeat')?.addEventListener('change', event => { repeatCustomPanel.hidden = event.target.value !== 'custom'; });
  document.querySelector('#reminderAdvance')?.addEventListener('change', event => { advanceCustomPanel.hidden = event.target.value !== 'custom'; });
  const repeatEndInput = document.querySelector('#reminderRepeatEndDate');
  if (repeatEndInput) {
    attachSharedDatePickerControl({
      input: repeatEndInput,
      triggerId: 'openRepeatEndDate',
      label: state.locale === 'en' ? 'Ends on' : state.locale === 'ms' ? 'Berakhir pada' : '截止日期',
      fallback: document.querySelector('#reminderDate')?.value ? new Date(`${document.querySelector('#reminderDate').value}T00:00`) : Date.now(),
      min: document.querySelector('#reminderDate')?.value || ''
    });
    const repeatEndAnchor = repeatEndInput.closest('.date-picker-anchor');
    if (repeatEndAnchor) repeatEndAnchor.hidden = document.querySelector('#reminderRepeatEnd')?.value !== 'date';
    document.querySelector('#reminderRepeatEnd')?.addEventListener('change', event => {
      if (repeatEndAnchor) repeatEndAnchor.hidden = event.target.value !== 'date';
      document.querySelector('#sharedDatePicker')?.remove();
    });
  }
  const finishReminder = (reminder, reminderScrollTop) => {
    const restorePosition = () => requestAnimationFrame(() => {
      const sheet = document.querySelector('.reminders-sheet');
      if (sheet) sheet.scrollTop = reminderScrollTop;
    });
    reminder.completing = true;
    cancelReminderNotification(reminder);
    // Completing is the only list action that may end an active reminder reaction.
    const stopsActiveReaction = activeReminderReactionId === reminder.id;
    acknowledgeCompletedReminder(reminder.id);
    if (stopsActiveReaction) showReminderCompletionPending(reminder.id);
    if (!stopsActiveReaction) {
      render();
      openReminders();
      restorePosition();
    }
    reminder.completionTimer = setTimeout(() => {
      delete reminder.completionTimer;
      const nextAt = nextReminderOccurrence(reminder);
      reminder.subtaskTotal = Math.max(Number(reminder.subtaskTotal) || 0, (reminder.subtasks || []).filter(Boolean).length);
      const pendingSubtasks = (reminder.subtasks || []).filter(task => task && !task.startsWith('[done] '));
      if (pendingSubtasks.length && !nextAt) {
        state.completedSubtasks = state.completedSubtasks || [];
        state.completedSubtasks = state.completedSubtasks.filter(subtask => !(subtask.parentId === reminder.id && subtask.returnedToPending && pendingSubtasks.includes(subtask.title)));
        state.completedSubtasks.unshift(...pendingSubtasks.map((task, index) => ({ id: Date.now() + index, title: task.replace(/^\[done\]\s*/, ''), parentId: reminder.id, parentTitle: reminder.title, completedAt: Date.now() })));
        reminder.subtasks = (reminder.subtasks || []).filter(task => task.startsWith('[done] '));
      }
      reminder.completing = false;
      reminder.completed = true;
      reminder.completedAt = Date.now();
      if (nextAt) {
        const nextReminder = {
          id: nextReminderId(),
          title: reminder.title,
          description: reminder.description,
          subtasks: pendingSubtasks.map(task => task.replace(/^\[done\]\s*/, '')),
          repeatSubtasks: pendingSubtasks.map(task => task.replace(/^\[done\]\s*/, '')),
          subtaskTotal: pendingSubtasks.length,
          at: nextAt,
          completed: false,
          flagged: reminder.flagged,
          urgent: reminder.urgent,
          repeat: reminder.repeat,
          recurrenceRootId: reminder.recurrenceRootId || reminder.id,
          repeatEvery: reminder.repeatEvery,
          repeatUnit: reminder.repeatUnit,
          repeatEndAt: reminder.repeatEndAt,
          advanceMinutes: reminder.advanceMinutes,
          advanceMode: reminder.advanceMode,
          advanceAmount: reminder.advanceAmount,
          advanceUnit: reminder.advanceUnit
        };
        state.reminders.push(nextReminder);
        void scheduleReminderNotification(nextReminder);
      }
      save();
      if (!stopsActiveReaction) {
        render();
        openReminders();
        restorePosition();
      }
    }, 3000);
  };
  const confirmReminderCompletion = (reminder, reminderScrollTop) => {
    const sheet = document.querySelector('.reminders-sheet');
    sheet.insertAdjacentHTML('beforeend', '<section class="reminder-confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="reminderConfirmTitle"><div class="reminder-confirm-dialog"><h2 id="reminderConfirmTitle">完成提醒事项吗？</h2><p>此提醒事项含有未完成的子任务，也将标记完成。</p><div><button id="cancelReminderCompletion" type="button">取消</button><button id="confirmReminderCompletion" type="button">完成</button></div></div></section>');
    const dialog = sheet.querySelector('.reminder-confirm-backdrop');
    dialog.querySelector('#cancelReminderCompletion').addEventListener('click', () => dialog.remove());
    dialog.querySelector('#confirmReminderCompletion').addEventListener('click', () => {
      dialog.remove();
      finishReminder(reminder, reminderScrollTop);
    });
  };
  document.querySelectorAll('[data-reminder-toggle]').forEach(button => button.addEventListener('click', () => {
    const reminder = state.reminders.find(item => item.id === Number(button.dataset.reminderToggle));
    if (!reminder) return;
    const reminderScrollTop = document.querySelector('.reminders-sheet')?.scrollTop || 0;
    const restorePosition = () => requestAnimationFrame(() => {
      const sheet = document.querySelector('.reminders-sheet');
      if (sheet) sheet.scrollTop = reminderScrollTop;
    });
    if (reminder.completing) {
      clearTimeout(reminder.completionTimer);
      delete reminder.completionTimer;
      reminder.completing = false;
      state.reminderSwipeId = null;
      void scheduleReminderNotification(reminder);
      render();
      openReminders();
      restorePosition();
      return;
    }
    if (reminder.completed) {
      const relatedSubtasks = state.completedSubtasks.filter(subtask => subtask.parentId === reminder.id || (!subtask.parentId && subtask.parentTitle === reminder.title && Math.abs((subtask.completedAt || 0) - (reminder.completedAt || 0)) < 5000));
      if (relatedSubtasks.length) {
        if (state.reminderView === 'completed-subtasks') {
          const unfinishedSubtasks = relatedSubtasks.filter(subtask => subtask.completed === false);
          reminder.subtasks = [...(reminder.subtasks || []), ...unfinishedSubtasks.map(subtask => subtask.title).filter(title => !reminder.subtasks?.includes(title))];
          unfinishedSubtasks.forEach(subtask => { subtask.returnedToPending = true; });
        } else {
          reminder.subtasks = [...(reminder.subtasks || []), ...relatedSubtasks.map(subtask => subtask.completed === false ? subtask.title : `[done] ${subtask.title}`)];
          state.completedSubtasks = state.completedSubtasks.filter(subtask => !relatedSubtasks.includes(subtask));
        }
      }
      reminder.completed = false;
      reminder.completedAt = null;
      if (reminderRepeatLabel(reminder)) reminder.repeat = 'none';
      void scheduleReminderNotification(reminder);
      save();
      render();
      openReminders();
      restorePosition();
      return;
    }
    const pendingSubtasks = (reminder.subtasks || []).filter(task => task && !task.startsWith('[done] '));
    if (pendingSubtasks.length && !nextReminderOccurrence(reminder)) {
      confirmReminderCompletion(reminder, reminderScrollTop);
      return;
    }
    finishReminder(reminder, reminderScrollTop);
  }));
  document.querySelectorAll('[data-reminder-edit]').forEach(button => button.addEventListener('click', () => {
    state.reminderDraft = null;
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
    if (['all', 'subtasks', 'completed-subtasks'].includes(state.reminderView) || row.classList.contains('is-recurring-completion') || !reminder || !subtasks.length) return;
    row.querySelector('.reminder-time')?.insertAdjacentHTML('beforeend', `<button class="reminder-subtask-link" type="button" data-reminder-subtasks="${reminder.id}">${subtaskCountLabel(subtasks.length)}</button>`);
  });
  document.querySelectorAll('[data-reminder-subtasks]').forEach(button => button.addEventListener('click', () => {
    const sheet = document.querySelector('.reminders-sheet');
    state.reminderSubtaskSourceView = state.reminderView;
    state.reminderSubtaskSourceScrollTop = sheet?.scrollTop || 0;
    state.reminderExpandedId = Number(button.dataset.reminderSubtasks);
    state.reminderSubtaskHighlightId = state.reminderExpandedId;
    state.reminderSwipeId = null;
    state.reminderView = 'subtasks';
    render();
    openReminders();
    setTimeout(() => {
      if (state.reminderView !== 'subtasks' || state.reminderSubtaskHighlightId !== state.reminderExpandedId) return;
      const scrollTop = document.querySelector('.reminders-sheet')?.scrollTop || 0;
      state.reminderSubtaskHighlightId = null;
      render();
      openReminders();
      requestAnimationFrame(() => {
        const nextSheet = document.querySelector('.reminders-sheet');
        if (nextSheet) nextSheet.scrollTop = scrollTop;
      });
    }, 2000);
  }));
  document.querySelectorAll('[data-reminder-completed-subtasks]').forEach(button => button.addEventListener('click', () => {
    const sheet = document.querySelector('.reminders-sheet');
    state.reminderSubtaskSourceView = 'completed';
    state.reminderSubtaskSourceScrollTop = sheet?.scrollTop || 0;
    state.reminderExpandedId = Number(button.dataset.reminderCompletedSubtasks);
    state.reminderSubtaskHighlightId = state.reminderExpandedId;
    state.reminderSwipeId = null;
    state.reminderView = 'completed-subtasks';
    render();
    openReminders();
    requestAnimationFrame(() => {
      document.querySelector(`[data-reminder-row="${state.reminderExpandedId}"]`)?.scrollIntoView({ block: 'center' });
    });
    setTimeout(() => {
      if (state.reminderView !== 'completed-subtasks' || state.reminderSubtaskHighlightId !== state.reminderExpandedId) return;
      const scrollTop = document.querySelector('.reminders-sheet')?.scrollTop || 0;
      state.reminderSubtaskHighlightId = null;
      render();
      openReminders();
      requestAnimationFrame(() => {
        const nextSheet = document.querySelector('.reminders-sheet');
        if (nextSheet) nextSheet.scrollTop = scrollTop;
      });
    }, 2000);
  }));
  document.querySelectorAll('[data-reminder-inline-toggle]').forEach(button => button.addEventListener('click', () => {
    const sheet = document.querySelector('.reminders-sheet');
    const scrollTop = sheet?.scrollTop || 0;
    const reminderId = Number(button.dataset.reminderInlineToggle);
    state.reminderExpandedId = state.reminderExpandedId === reminderId ? null : reminderId;
    state.reminderSwipeId = null;
    render();
    openReminders();
    requestAnimationFrame(() => { const nextSheet = document.querySelector('.reminders-sheet'); if (nextSheet) nextSheet.scrollTop = scrollTop; });
  }));
  document.querySelectorAll('[data-reminder-inline-subtask]').forEach(button => button.addEventListener('click', () => {
    const reminder = state.reminders.find(item => item.id === Number(button.dataset.reminderInlineSubtask));
    const index = Number(button.dataset.reminderInlineSubtaskIndex);
    const task = reminder?.subtasks?.[index];
    if (!reminder || !task || task.startsWith('[done] ')) return;
    const scrollTop = document.querySelector('.reminders-sheet')?.scrollTop || 0;
    const existing = state.completingSubtasks.find(entry => entry.reminderId === reminder.id && entry.index === index);
    if (existing) {
      clearTimeout(existing.timer);
      state.completingSubtasks = state.completingSubtasks.filter(entry => entry !== existing);
      render();
      openReminders();
      requestAnimationFrame(() => {
        const sheet = document.querySelector('.reminders-sheet');
        if (sheet) sheet.scrollTop = scrollTop;
      });
      return;
    }
    const completing = { reminderId: reminder.id, index, task, timer: null };
    state.completingSubtasks.push(completing);
    completing.timer = setTimeout(() => {
      const currentIndex = reminder.subtasks?.indexOf(task) ?? -1;
      state.completingSubtasks = state.completingSubtasks.filter(entry => entry !== completing);
      if (currentIndex < 0) return;
      reminder.subtaskTotal = Math.max(Number(reminder.subtaskTotal) || 0, (reminder.subtasks || []).filter(Boolean).length);
      state.completedSubtasks = state.completedSubtasks || [];
      state.completedSubtasks.unshift({ id: Date.now(), title: task.replace(/^\[done\]\s*/, ''), parentId: reminder.id, parentTitle: reminder.title, completedAt: Date.now() });
      reminder.subtasks.splice(currentIndex, 1);
      save();
      render();
      openReminders();
      requestAnimationFrame(() => {
        const sheet = document.querySelector('.reminders-sheet');
        if (sheet) sheet.scrollTop = scrollTop;
      });
    }, 3000);
    render();
    openReminders();
    requestAnimationFrame(() => {
      const sheet = document.querySelector('.reminders-sheet');
      if (sheet) sheet.scrollTop = scrollTop;
    });
  }));
  document.querySelectorAll('[data-reminder-completed-subtask]').forEach(button => button.addEventListener('click', () => {
    const subtask = state.completedSubtasks.find(item => item.id === Number(button.dataset.reminderCompletedSubtask));
    if (!subtask) return;
    const scrollTop = document.querySelector('.reminders-sheet')?.scrollTop || 0;
    subtask.completed = subtask.completed === false;
    const parent = state.reminders.find(reminder => reminder.id === subtask.parentId);
    const latestRecurringReminder = parent && parent.completed
      ? state.reminders
        .filter(reminder => !reminder.completed && reminder.repeat && reminder.repeat !== 'none' && (reminder.recurrenceRootId === (parent.recurrenceRootId || parent.id) || (!reminder.recurrenceRootId && reminder.title === parent.title && reminder.at > parent.at)))
        .sort((a, b) => b.at - a.at)[0]
      : null;
    if (parent && !parent.completed && subtask.completed) {
      parent.subtasks = (parent.subtasks || []).filter(task => task !== subtask.title);
      state.completedSubtasks = state.completedSubtasks.filter(item => item === subtask || item.parentId !== subtask.parentId || item.title !== subtask.title);
      delete subtask.returnedToPending;
    } else if (parent && !parent.completed && subtask.completed === false && !subtask.returnedToPending) {
      parent.subtasks = [...(parent.subtasks || []), subtask.title];
      subtask.returnedToPending = true;
    } else if (latestRecurringReminder) {
      if (subtask.completed === false) {
        if (!latestRecurringReminder.subtasks?.includes(subtask.title)) latestRecurringReminder.subtasks = [...(latestRecurringReminder.subtasks || []), subtask.title];
      } else {
        latestRecurringReminder.subtasks = (latestRecurringReminder.subtasks || []).filter(task => task !== subtask.title);
      }
      latestRecurringReminder.repeatSubtasks = [...(latestRecurringReminder.subtasks || [])];
      latestRecurringReminder.subtaskTotal = Math.max(Number(latestRecurringReminder.subtaskTotal) || 0, latestRecurringReminder.subtasks.length);
    }
    save();
    render();
    openReminders();
    requestAnimationFrame(() => {
      const sheet = document.querySelector('.reminders-sheet');
      if (sheet) sheet.scrollTop = scrollTop;
    });
  }));
  document.querySelectorAll('.reminder-swipe').forEach(swipe => {
    let startX = null;
    let mayOpen = false;
    swipe.addEventListener('pointerdown', event => {
      startX = event.clientX;
      mayOpen = !event.target.closest('button') || Boolean(event.target.closest('.reminder-actions'));
    });
    swipe.addEventListener('pointerup', event => {
      if (startX == null) return;
      const deltaX = event.clientX - startX;
      startX = null;
      const reminderId = Number(swipe.querySelector('[data-reminder-row]')?.dataset.reminderRow);
      if (deltaX < -32 && mayOpen) state.reminderSwipeId = reminderId;
      else if (deltaX > 32 && state.reminderSwipeId === reminderId) state.reminderSwipeId = null;
      else return;
      event.preventDefault();
      const reminderScrollTop = document.querySelector('.reminders-sheet')?.scrollTop || 0;
      render();
      openReminders();
      requestAnimationFrame(() => {
        const sheet = document.querySelector('.reminders-sheet');
        if (sheet) sheet.scrollTop = reminderScrollTop;
      });
    });
    swipe.addEventListener('pointercancel', () => { startX = null; });
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
  document.querySelector('#catVolume')?.addEventListener('input', event => { state.catVolume = Number(event.target.value); catWakeSound.volume = state.catVolume / 100; if (activeChromaVideo) activeChromaVideo.volume = state.catVolume / 100; document.querySelector('#catVolumeValue').textContent = `${state.catVolume}%`; save(); });
  document.querySelector('#languageSelect')?.addEventListener('change', event => { state.locale = event.target.value; save(); render(); openSettings(); });
  setupProfileControls();
  document.querySelector('#finishFocus')?.addEventListener('input', updateFinishSlider);
  document.querySelector('#finishFocus')?.addEventListener('change', resetFinishSlider);
  if (state.editingDuration || state.editingPurpose) requestAnimationFrame(() => document.querySelector('#durationInput, #purposeInput')?.focus());
  localizeStaticInterface();
  if (!state.active && state.view === 'rug' && !reminderReactionPlaying) startLobbySequence();
}
function clearCatVideo() {
  clearTimeout(catPauseTimer);
  clearTimeout(catPlaybackTimer);
  clearTimeout(catChromaSettleTimer);
  clearTimeout(reminderReactionStopTimer);
  reminderReactionStopTimer = undefined;
  cancelAnimationFrame(catChromaFrame);
  if (catVideoFrameCallback && activeChromaVideo?.cancelVideoFrameCallback) activeChromaVideo.cancelVideoFrameCallback(catVideoFrameCallback);
  catVideoFrameCallback = undefined;
  activeChromaVideo?.pause();
  activeChromaVideo = undefined;
  const chromaCanvas = document.querySelector('#catChromaCanvas');
  chromaCanvas?.classList.remove('is-active', 'is-scaled');
  chromaCanvas?.style.removeProperty('--cat-chroma-scale');
  chromaCanvas?.style.removeProperty('--cat-chroma-y');
  document.querySelectorAll('.cat-animation').forEach(video => {
    video.pause();
    video.classList.remove('is-active');
  });
  activeCatPlayback = undefined;
  activeCatSlot = -1;
  stopCatWakeSound();
  sleepRequested = false;
  sleepBranch = undefined;
  finishRequested = false;
  earlyFinishRequested = false;
  sittingActionRequested = false;
  nextCloserAt = 120;
  lobbyIdleRounds = 0;
  catPose = 'sitting';
}
function drawRoomArtFrame(context, canvas) {
  if (!roomArtFrame.complete || !roomArtFrame.naturalWidth) return;
  const scale = Math.max(canvas.width / roomArtFrame.naturalWidth, canvas.height / roomArtFrame.naturalHeight) * 1.01;
  const width = roomArtFrame.naturalWidth * scale;
  const height = roomArtFrame.naturalHeight * scale;
  context.drawImage(roomArtFrame, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
}
function playChromaCatVideo(action, onEnded, loop = false) {
  const canvas = document.querySelector('#catChromaCanvas');
  if (!canvas) return onEnded?.();
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const video = document.querySelector('#catChromaSource');
  if (!video) return onEnded?.();
  activeChromaVideo = video;
  // Reminder reactions start without a user gesture, so the browser only permits video playback when muted.
  video.muted = true;
  video.volume = state.catVolume / 100;
  video.playsInline = true;
  let drawFrame;
  video.addEventListener('loadeddata', () => {
    if (activeChromaVideo !== video) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * pixelRatio);
    canvas.height = Math.round(canvas.width * canvas.clientHeight / canvas.clientWidth);
    canvas.classList.add('is-active');
    video.loop = false;
    drawFrame = (scheduleNext = true) => {
      if (activeChromaVideo !== video) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (action.composited) {
        const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
        const width = video.videoWidth * scale;
        const height = video.videoHeight * scale;
        context.drawImage(video, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      } else {
        drawRoomArtFrame(context, canvas);
      if (action.cropSquare) {
        const sourceHeight = video.videoHeight;
        const sourceWidth = Math.min(video.videoWidth, action.cropWidth || sourceHeight);
        const sourceX = (video.videoWidth - sourceWidth) / 2;
        const scale = action.scale || 1;
        const offsetY = Number.parseFloat(action.offsetY || '0') / 100 * canvas.height;
        const destinationHeight = Math.min(canvas.width, canvas.height) * scale;
        const destinationWidth = destinationHeight * sourceWidth / sourceHeight;
        context.drawImage(video, sourceX, 0, sourceWidth, sourceHeight, (canvas.width - destinationWidth) / 2, canvas.height - destinationHeight + offsetY, destinationWidth, destinationHeight);
      } else {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      }
      if (!action.composited) {
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < frame.data.length; index += 4) {
        const red = frame.data[index];
        const green = frame.data[index + 1];
        const blue = frame.data[index + 2];
        const maximum = Math.max(red, green, blue);
        const minimum = Math.min(red, green, blue);
        const difference = maximum - minimum;
        const saturation = maximum ? difference / maximum : 0;
        const hue = difference ? 60 * (((red === maximum ? (green - blue) / difference : green === maximum ? 2 + (blue - red) / difference : 4 + (red - green) / difference) + 6) % 6) : 0;
        if (hue > 85 && hue < 170 && saturation > .07) {
          frame.data[index + 3] = Math.max(0, Math.min(255, (.5 - saturation) / .43 * 255));
          frame.data[index + 1] = Math.max(red, blue) + 2;
        } else if (green > red + 12 && green > blue + 12) {
          frame.data[index + 1] = Math.max(red, blue) + 2;
        }
        const greenEdge = green - Math.max(red, blue);
        if (green > 76 && greenEdge > 12) {
          frame.data[index + 3] = Math.min(frame.data[index + 3], Math.max(0, Math.min(255, (42 - greenEdge) * 9)));
          frame.data[index + 1] = Math.max(red, blue) + 1;
        }
      }
      context.putImageData(frame, 0, 0);
      }
      if (!scheduleNext) return;
      if (action.composited && video.requestVideoFrameCallback) {
        catVideoFrameCallback = video.requestVideoFrameCallback(drawFrame);
      } else {
        catChromaFrame = requestAnimationFrame(drawFrame);
      }
    };
    video.play().then(() => playCatWakeSound(action.sound)).catch(() => {});
    drawFrame();
  }, { once: true });
  video.src = action.source;
  video.load();
  video.onended = () => {
    if (activeChromaVideo !== video) return;
    if (loop && !reminderBellAcknowledged) {
      if (catVideoFrameCallback && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(catVideoFrameCallback);
      catVideoFrameCallback = undefined;
      video.currentTime = 0;
      video.play().then(() => {
        playCatWakeSound(action.sound);
        drawFrame?.();
      }).catch(() => {});
      return;
    }
    cancelAnimationFrame(catChromaFrame);
    if (catVideoFrameCallback && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(catVideoFrameCallback);
    catVideoFrameCallback = undefined;
    drawFrame?.(false);
    activeChromaVideo = undefined;
    stopCatWakeSound();
    if (action.composited) {
      // Hold the final paw frame over the idle loop so differently cut source clips never hard-cut.
      const idleVideo = document.querySelector('.cat-animation');
      if (idleVideo) {
        idleVideo.loop = true;
        idleVideo.currentTime = 0;
        idleVideo.classList.add('is-active');
        idleVideo.play().catch(() => {});
      }
      requestAnimationFrame(() => canvas.classList.remove('is-active'));
      catChromaSettleTimer = setTimeout(() => onEnded?.(), 340);
      return;
    }
    canvas.classList.remove('is-active');
    onEnded?.();
  };
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
    nextVideo.play().then(() => {
      if (action?.sound) playCatWakeSound(action.sound);
    }).catch(() => {});
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
  state.view = 'reward';
  state.remaining = state.duration;
  state.note = '它轻轻碰了碰你的手，想和你说句话。';
  focusSettlement = { kind: 'early' };
  save();
  render();
}
function completeFocus() { clearInterval(ticker); clearCatVideo(); releaseFocusLock(); cancelFocusEndNotification(); state.active = false; state.endsAt = null; state.view = 'reward'; state.remaining = state.duration; state.fish += 1; state.focusRecords.unshift({ completedAt: Date.now(), duration: state.duration, purpose: state.purpose }); state.focusRecords = state.focusRecords.slice(0, 2000); state.note = '它慢慢睁开眼睛，好像知道你刚刚做完了一件事。'; focusSettlement = { kind: 'complete' }; save(); render(); }
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
function closeReminders() { state.remindersOpen = false; state.reminderView = 'overview'; state.reminderComposerOpen = false; state.reminderEditingId = null; state.reminderSwipeId = null; state.reminderExpandedId = null; state.reminderSubtaskHighlightId = null; state.reminderSubtaskSourceView = null; state.reminderSubtaskSourceScrollTop = 0; state.completedClearOpen = false; const drawer = document.querySelector('#remindersDrawer'); drawer?.classList.remove('open'); drawer?.setAttribute('aria-hidden', 'true'); }
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
syncDueReminderBell();
setInterval(syncDueReminderBell, 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    syncFocusClock();
    syncDueReminderBell();
  }
});
document.addEventListener('pointerdown', primeCatAudio, { once: true, capture: true });

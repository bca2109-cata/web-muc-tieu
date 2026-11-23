/* Hằng số, xử lý ngày và các phép tính thuần (không đụng tới giao diện) */
var App = window.App || (window.App = {});

App.C = {
  GROUPS: [
    { key: 'Công việc', label: 'Công việc' },
    { key: 'Học tập', label: 'Học tập / kỹ năng' },
    { key: 'Sức khỏe', label: 'Sức khỏe / thói quen' }
  ],
  PERIOD_TYPES: ['Năm', 'Quý', 'Tháng', 'Tuần'],
  GOAL_STATUS: ['Đang làm', 'Hoàn thành', 'Tạm dừng'],
  PRIORITY: ['Cao', 'Trung bình', 'Thấp'],
  TASK_STATUS: ['Cần làm', 'Đang làm', 'Xong'],
  DONE: 'Xong',
  MISC: 'Việc lặt vặt',
  TOP3_MAX: 3,
  COLUMNS: {
    Goals: ['id', 'name', 'group', 'period_type', 'period_value', 'start_date', 'end_date', 'progress_mode', 'unit', 'target', 'actual', 'status', 'note', 'created_at', 'updated_at', 'importance'],
    // GĐ6 thêm 7 cột cuối, bản sửa sau nghiệm thu thêm cột bucket (Giờ làm / Buổi tối cho việc không gắn mục tiêu). Cột priority giữ dữ liệu cũ, không dùng nữa (chỉ đọc khi is_important còn trống)
    Tasks: ['id', 'title', 'goal_id', 'due_date', 'priority', 'status', 'is_top3', 'top3_date', 'recurring_rule', 'parent_recurring_id', 'done_at', 'note', 'created_at', 'updated_at', 'icon', 'due_time',
      'do_date', 'duration_min', 'is_important', 'parent_id', 'first_step', 'defer_count', 'inbox_since', 'bucket', 'pinned'],
    Habits: ['id', 'name', 'goal_id', 'frequency', 'active', 'created_at', 'updated_at'],
    HabitLogs: ['id', 'habit_id', 'date', 'done', 'created_at', 'updated_at'],
    Reviews: ['id', 'period_type', 'period_value', 'good', 'bad', 'next', 'created_at', 'updated_at', 'rating', 'hide_from'],
    Interruptions: ['id', 'date', 'title', 'duration_min', 'created_at'],
    Settings: ['id', 'work_start', 'work_end', 'lunch_min', 'fixed_min', 'buffer_pct', 'evening_min', 'review_weekday', 'review_time', 'weekend_min', 'evening_start']
  },
  // Tên sheet -> khóa trong state
  TABLES: { Goals: 'goals', Tasks: 'tasks', Habits: 'habits', HabitLogs: 'habitLogs', Reviews: 'reviews', Interruptions: 'interruptions', Settings: 'settings' },
  // Thời lượng chọn nhanh (phút). Việc con chỉ chọn 15 / 30 / 60
  DURATIONS: [15, 30, 60, 120, 240],
  CHILD_DURATIONS: [15, 30, 60],
  DEFAULT_DURATION: 30,
  BIG_MIN: 120
};

App.util = {
  uuid: function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  },
  pad: function (n) { return (n < 10 ? '0' : '') + n; },
  // Dấu thời gian giờ máy: yyyy-mm-dd HH:mm:ss
  now: function () {
    var d = new Date(), p = App.util.pad;
    return App.date.today() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  },
  esc: function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  },
  // Lớp CSS cho nhóm, ví dụ "g-Công-việc"
  groupClass: function (group) { return 'g-' + String(group || '').replace(/\s+/g, '-'); },
  // Bọc các con số trong chuỗi để hiện chữ số đậm, thẳng hàng
  numify: function (s) { return App.util.esc(s).replace(/\d+([\/.:-]\d+)*%?/g, '<span class="num">$&</span>'); },
  isTrue: function (v) { return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1'; }
};

/* Ngày luôn ở dạng chuỗi yyyy-mm-dd. Tính toán bằng UTC để không lệch múi giờ. */
App.date = (function () {
  var pad = function (n) { return App.util.pad(n); };
  var DAY = 86400000;
  var WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  function toStr(d) { return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function parse(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  }
  function isValid(s) { var d = parse(s); return !!d && toStr(d) === String(s).slice(0, 10); }
  function today() {
    if (App.config && App.config.todayOverride) return App.config.todayOverride;
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  // Giờ hiện tại HH:mm (bản mock giả lập được bằng ?now=17:45)
  function nowHM() {
    if (App.config && App.config.nowOverride) return App.config.nowOverride;
    var d = new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function addDays(s, n) { var d = parse(s); return toStr(new Date(d.getTime() + n * DAY)); }
  function diffDays(a, b) { return Math.round((parse(b) - parse(a)) / DAY); }
  function fmt(s) {
    var d = parse(s);
    return d ? pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear() : '';
  }
  function weekday(s) { var d = parse(s); return d ? WEEKDAYS[d.getUTCDay()] : ''; }
  function lastDayOfMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

  // Tuần ISO 8601: bắt đầu thứ Hai, tuần 1 chứa ngày 4/1
  function isoWeek(s) {
    var d = parse(s);
    var dow = d.getUTCDay() || 7;
    d = new Date(d.getTime() + (4 - dow) * DAY);
    var y = d.getUTCFullYear();
    var week = Math.ceil(((d - Date.UTC(y, 0, 1)) / DAY + 1) / 7);
    return { year: y, week: week };
  }
  function isoWeekMonday(y, w) {
    var jan4 = new Date(Date.UTC(y, 0, 4));
    var dow = jan4.getUTCDay() || 7;
    return toStr(new Date(jan4.getTime() + ((1 - dow) + (w - 1) * 7) * DAY));
  }

  return {
    toStr: toStr, parse: parse, isValid: isValid, today: today, nowHM: nowHM, addDays: addDays, diffDays: diffDays,
    fmt: fmt, weekday: weekday, lastDayOfMonth: lastDayOfMonth, isoWeek: isoWeek, isoWeekMonday: isoWeekMonday
  };
})();

/* Kỳ của mục tiêu. Giá trị lưu: Năm "2026", Quý "2027-Q1", Tháng "2026-11", Tuần "2026-W48" */
App.period = (function () {
  var D = App.date, pad = function (n) { return App.util.pad(n); };

  function valueOf(type, dateStr) {
    if (type === 'Ngày') return String(dateStr).slice(0, 10);
    var d = D.parse(dateStr), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
    if (type === 'Năm') return String(y);
    if (type === 'Quý') return y + '-Q' + Math.ceil(m / 3);
    if (type === 'Tháng') return y + '-' + pad(m);
    var w = D.isoWeek(dateStr);
    return w.year + '-W' + pad(w.week);
  }

  function range(type, value) {
    var v = String(value || ''), m;
    if (type === 'Ngày') return D.isValid(v) && v.length === 10 ? { start: v, end: v } : null;
    if (type === 'Năm' && (m = /^(\d{4})$/.exec(v))) {
      return { start: m[1] + '-01-01', end: m[1] + '-12-31' };
    }
    if (type === 'Quý' && (m = /^(\d{4})-Q([1-4])$/.exec(v))) {
      var y = +m[1], q = +m[2], m1 = (q - 1) * 3 + 1, m3 = q * 3;
      return { start: y + '-' + pad(m1) + '-01', end: y + '-' + pad(m3) + '-' + pad(D.lastDayOfMonth(y, m3)) };
    }
    if (type === 'Tháng' && (m = /^(\d{4})-(\d{2})$/.exec(v))) {
      return { start: v + '-01', end: v + '-' + pad(D.lastDayOfMonth(+m[1], +m[2])) };
    }
    if (type === 'Tuần' && (m = /^(\d{4})-W(\d{2})$/.exec(v))) {
      var mon = D.isoWeekMonday(+m[1], +m[2]);
      return { start: mon, end: D.addDays(mon, 6) };
    }
    return null;
  }

  function label(type, value) {
    var v = String(value || ''), m;
    if (type === 'Ngày') return 'Ngày ' + D.fmt(v);
    if (type === 'Năm') return 'Năm ' + v;
    if (type === 'Quý' && (m = /^(\d{4})-Q(\d)$/.exec(v))) return 'Q' + m[2] + '/' + m[1];
    if (type === 'Tháng' && (m = /^(\d{4})-(\d{2})$/.exec(v))) return 'Tháng ' + m[2] + '/' + m[1];
    if (type === 'Tuần' && (m = /^(\d{4})-W(\d{2})$/.exec(v))) return 'Tuần ' + (+m[2]) + '/' + m[1];
    return v;
  }

  // Danh sách giá trị kỳ quanh hôm nay để chọn trong form
  function options(type, todayStr) {
    var out = [], d = D.parse(todayStr), y = d.getUTCFullYear(), i;
    if (type === 'Năm') {
      for (i = y - 1; i <= y + 3; i++) out.push(String(i));
    } else if (type === 'Quý') {
      for (i = y - 1; i <= y + 1; i++) for (var q = 1; q <= 4; q++) out.push(i + '-Q' + q);
    } else if (type === 'Tháng') {
      var mm = d.getUTCMonth();
      for (i = -6; i <= 14; i++) {
        var t = new Date(Date.UTC(y, mm + i, 1));
        out.push(t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1));
      }
    } else {
      var monday = D.addDays(todayStr, 1 - (d.getUTCDay() || 7));
      for (i = -8; i <= 30; i++) out.push(valueOf('Tuần', D.addDays(monday, i * 7)));
    }
    return out;
  }

  return { valueOf: valueOf, range: range, label: label, options: options };
})();

App.logic = {
  /* Tiến độ của mục tiêu.
     Theo task: số task xong / tổng task gắn với mục tiêu (không tính việc lặp mẫu, có tính mọi lần lặp đã sinh).
     Theo chỉ số: thực tế / target.
     Theo thói quen: số ngày đã tick / số ngày cần làm từ đầu kỳ đến hôm nay (đọc thói quen từ store). */
  goalProgress: function (goal, tasks) {
    if (goal.progress_mode === 'habit') {
      var st = App.store && App.store.get ? App.store.get() : {};
      return App.logic.habitProgress(goal, st.habits || [], st.habitLogs || [], App.date.today());
    }
    if (goal.progress_mode === 'metric') {
      var target = App.logic.num(goal.target), actual = App.logic.num(goal.actual);
      return { mode: 'metric', done: actual, total: target, unit: goal.unit || '',
        pct: target > 0 ? Math.min(100, Math.max(0, Math.round(actual / target * 100))) : 0 };
    }
    // Việc cha đã chia nhỏ không tính, chỉ tính các việc con (tránh đếm hai lần)
    var parents = App.logic.parentIds(tasks);
    var mine = tasks.filter(function (t) { return t.goal_id === goal.id && !App.logic.isTemplate(t) && !parents[t.id]; });
    var done = mine.filter(function (t) { return t.status === App.C.DONE; }).length;
    var total = mine.length;
    var pct = total ? Math.round(done / total * 100) : 0;
    return { mode: 'task', done: done, total: total, pct: pct };
  },
  /* Tiến độ tính tại một ngày đã qua (cuối kỳ trong tab Tổng kết).
     Theo task: task đã có vào ngày đó (lần lặp tính theo hạn, task khác theo ngày tạo), xong khi done_at không muộn hơn ngày đó.
     Theo thói quen: các ngày cần làm đến hết ngày đó.
     Theo chỉ số: Sheet không lưu lịch sử, nên lấy giá trị hiện tại; nếu mục tiêu được sửa sau ngày đó thì đánh dấu approx. */
  goalProgressAt: function (goal, tasks, asOf) {
    var L = App.logic, D = App.date;
    if (goal.progress_mode === 'habit') {
      var st = App.store && App.store.get ? App.store.get() : {};
      return L.habitProgress(goal, st.habits || [], st.habitLogs || [], asOf, true);
    }
    if (goal.progress_mode === 'metric') {
      var p = L.goalProgress(goal, tasks), upd = String(goal.updated_at || '').slice(0, 10);
      p.approx = !D.isValid(upd) || upd > asOf;
      return p;
    }
    var parents = L.parentIds(tasks);
    var mine = tasks.filter(function (t) {
      if (t.goal_id !== goal.id || L.isTemplate(t) || parents[t.id]) return false;
      var born = t.parent_recurring_id ? t.due_date : String(t.created_at || '').slice(0, 10);
      return !D.isValid(born) || born <= asOf;
    });
    var done = mine.filter(function (t) {
      var d = String(t.done_at || '').slice(0, 10);
      return t.status === App.C.DONE && (!D.isValid(d) || d <= asOf);
    }).length;
    return { mode: 'task', done: done, total: mine.length, pct: mine.length ? Math.round(done / mine.length * 100) : 0 };
  },
  // Đọc số từ Sheet (có thể là chữ, có dấu phẩy thập phân)
  num: function (v) {
    var n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
    return isFinite(n) ? n : 0;
  },
  // Viết số gọn: 12, 2.5 (không đuôi .0)
  fmtNum: function (n) { return String(Math.round(n * 100) / 100); },
  // Số để hiển thị: dấu phẩy thập phân kiểu Việt Nam (lưu vẫn dùng dấu chấm)
  fmtVi: function (n) { return App.logic.fmtNum(n).replace('.', ','); },
  // % thời gian của kỳ đã qua (tính cả hôm nay)
  timePct: function (g, today) {
    var D = App.date;
    if (!D.isValid(g.start_date) || !D.isValid(g.end_date) || g.end_date < g.start_date) return 0;
    if (today < g.start_date) return 0;
    if (today > g.end_date) return 100;
    return Math.round((D.diffDays(g.start_date, today) + 1) / (D.diffDays(g.start_date, g.end_date) + 1) * 100);
  },
  /* Chậm tiến độ: mục tiêu đang làm, đang trong kỳ, đã qua ít nhất 10% thời gian,
     và % đạt được thấp hơn một nửa % thời gian đã qua */
  slowInfo: function (g, tasks, today) {
    if (g.status !== 'Đang làm' || !g.start_date || today < g.start_date || today > g.end_date) return null;
    var time = App.logic.timePct(g, today), p = App.logic.goalProgress(g, tasks);
    if (time < 10 || p.pct >= 100 || p.pct >= time / 2) return null;
    return { time: time, pct: p.pct };
  },

  /* Task lặp. Việc mẫu: có recurring_rule, không có parent_recurring_id, không hiện trong danh sách và không tính %.
     Mỗi ngày khớp quy tắc sinh một lần lặp (id = id mẫu + ngày, nên 2 máy cùng sinh không bị trùng).
     Quy tắc lưu bằng chữ: "Hằng ngày" hoặc "Hằng tuần: T2, T4, T6" (CN là Chủ nhật). */
  WEEKDAY_CODES: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  RECUR_BACKFILL_DAYS: 30,
  isTemplate: function (t) { return !!t.recurring_rule && !t.parent_recurring_id; },
  // Lần lặp của ngày đã qua mà chưa làm: chỉ tính vào %, không coi là trễ hạn
  isMissed: function (t, today) { return !!t.parent_recurring_id && t.status !== App.C.DONE && !!t.due_date && t.due_date < today; },
  parseRule: function (rule) {
    var r = String(rule || '').trim();
    if (!r) return null;
    if (/^hằng ngày$/i.test(r)) return { daily: true, days: [0, 1, 2, 3, 4, 5, 6] };
    var codes = App.logic.WEEKDAY_CODES, days = [];
    r.replace(/^hằng tuần:\s*/i, '').split(/[,\s]+/).forEach(function (c) {
      var i = codes.indexOf(c.toUpperCase());
      if (i >= 0 && days.indexOf(i) < 0) days.push(i);
    });
    return days.length ? { daily: false, days: days.sort() } : null;
  },
  makeRule: function (days) {
    if (!days.length) return '';
    if (days.length === 7) return 'Hằng ngày';
    var codes = App.logic.WEEKDAY_CODES;
    // Thứ 2 trước, Chủ nhật cuối
    return 'Hằng tuần: ' + days.slice().sort(function (a, b) { return ((a + 6) % 7) - ((b + 6) % 7); })
      .map(function (d) { return codes[d]; }).join(', ');
  },
  ruleLabel: function (rule) {
    var p = App.logic.parseRule(rule);
    if (!p) return '';
    if (p.daily) return 'Hằng ngày';
    var days = p.days.slice().sort(function (a, b) { return ((a + 6) % 7) - ((b + 6) % 7); });
    var wk = days.filter(function (d) { return d; }).map(function (d) { return String(d + 1); });
    return (wk.length ? 'Thứ ' + wk.join(', ') : '') + (days.indexOf(0) >= 0 ? (wk.length ? ', ' : '') + 'Chủ nhật' : '');
  },
  ruleMatches: function (rule, date) {
    var p = App.logic.parseRule(rule), d = App.date.parse(date);
    return !!p && !!d && p.days.indexOf(d.getUTCDay()) >= 0;
  },
  /* Các lần lặp cần sinh thêm: từ ngày bắt đầu của mẫu (tối đa 30 ngày gần nhất) đến hôm nay.
     GĐ6: mỗi lần lặp có Ngày sẽ làm = đúng ngày đó, thời lượng và mức quan trọng lấy theo mẫu.
     Việc lặp hằng ngày trùng tên với một thói quen đang theo thì không sinh (chỉ hiện ở phần Thói quen). */
  recurringToCreate: function (tasks, today, habits) {
    var L = App.logic, D = App.date, have = {}, out = [];
    tasks.forEach(function (t) { have[t.id] = true; });
    var floor = D.addDays(today, 1 - L.RECUR_BACKFILL_DAYS);
    tasks.filter(L.isTemplate).forEach(function (tpl) {
      var rule = L.parseRule(tpl.recurring_rule);
      if (rule && rule.daily && L.similarHabit(tpl.title, habits || [])) return;
      var start = D.isValid(tpl.due_date) ? tpl.due_date : String(tpl.created_at || '').slice(0, 10);
      if (!D.isValid(start)) start = today;
      if (start < floor) start = floor;
      for (var d = start; d <= today; d = D.addDays(d, 1)) {
        var id = tpl.id + '-' + d;
        if (have[id] || !L.ruleMatches(tpl.recurring_rule, d)) continue;
        have[id] = true;
        out.push(L.newTask({
          id: id, title: tpl.title, goal_id: tpl.goal_id, due_date: d, due_time: L.isTime(tpl.due_time) ? tpl.due_time : '', icon: tpl.icon,
          parent_recurring_id: tpl.id, do_date: d, duration_min: String(L.duration(tpl)), is_important: L.isImportant(tpl) ? 'TRUE' : 'FALSE',
          first_step: tpl.first_step || '', inbox_since: '', bucket: tpl.bucket || ''
        }));
      }
    });
    return out;
  },

  /* Thói quen. Tần suất lưu như luật lặp của task ("Hằng ngày", "Hằng tuần: T2, T4, T6").
     Mỗi ô tick là một dòng HabitLogs: id = id thói quen + "-" + ngày, done TRUE/FALSE.
     Chỉ đếm ngày cần làm. Hôm nay chưa tick thì chưa tính là lỡ. */
  habitActive: function (h) { return String(h.active).toUpperCase() !== 'FALSE'; },
  habitLogId: function (habitId, date) { return habitId + '-' + date; },
  isHabitDay: function (h, date) { return App.logic.ruleMatches(h.frequency, date); },
  // Các ngày đã tick: { 'yyyy-mm-dd': true }
  habitDone: function (h, logs) {
    var m = {};
    logs.forEach(function (l) { if (l.habit_id === h.id && App.util.isTrue(l.done)) m[l.date] = true; });
    return m;
  },
  // Ngày bắt đầu theo dõi: ngày tạo, hoặc ngày tick sớm nhất nếu sớm hơn (tick bù)
  habitStart: function (h, done) {
    var s = String(h.created_at || '').slice(0, 10);
    Object.keys(done).forEach(function (d) { if (!App.date.isValid(s) || d < s) s = d; });
    return App.date.isValid(s) ? s : App.date.today();
  },
  // Chuỗi hiện tại và chuỗi dài nhất
  habitStreak: function (h, logs, today) {
    var L = App.logic, D = App.date, done = L.habitDone(h, logs), run = 0, best = 0;
    for (var d = L.habitStart(h, done); d <= today; d = D.addDays(d, 1)) {
      if (!L.isHabitDay(h, d)) continue;
      if (done[d]) { run++; if (run > best) best = run; }
      else if (d !== today) run = 0;
    }
    return { current: run, best: best };
  },
  // closed = true: ngày "today" là ngày đã qua (tính tiến độ tại cuối một kỳ cũ), ngày đó chưa tick cũng tính
  habitProgress: function (goal, habits, logs, today, closed) {
    var L = App.logic, D = App.date, done = 0, total = 0, n = 0;
    habits.forEach(function (h) {
      if (h.goal_id !== goal.id) return;
      n++;
      // Thói quen tạm dừng: chỉ tính ngày đã tick, ngày bỏ trống không kéo % xuống
      var m = L.habitDone(h, logs), from = L.habitStart(h, m), on = L.habitActive(h);
      if (D.isValid(goal.start_date) && goal.start_date > from) from = goal.start_date;
      var to = D.isValid(goal.end_date) && goal.end_date < today ? goal.end_date : today;
      for (var d = from; d <= to; d = D.addDays(d, 1)) {
        if (!L.isHabitDay(h, d)) continue;
        if (m[d]) { done++; total++; } else if (on && (closed || d !== today)) total++;
      }
    });
    return { mode: 'habit', done: done, total: total, habits: n, pct: total ? Math.min(100, Math.round(done / total * 100)) : 0 };
  },
  newHabit: function (fields) {
    var now = App.util.now();
    return Object.assign({ id: App.util.uuid(), name: '', goal_id: '', frequency: 'Hằng ngày', active: 'TRUE', created_at: now, updated_at: now }, fields || {});
  },

  // ≥ 100% đạt, 80–99% gần đạt, < 80% cần chú ý
  level: function (pct) { return pct >= 100 ? 'ok' : pct >= 80 ? 'pr' : 'warn'; },
  levelLabel: function (pct) { return pct >= 100 ? 'Đạt' : pct >= 80 ? 'Gần đạt' : 'Cần chú ý'; },

  isDone: function (t) { return t.status === App.C.DONE; },
  // Lần lặp đã qua ngày không tính là trễ hạn (xem isMissed)
  isOverdue: function (t, today) { return !!t.due_date && t.due_date < today && t.status !== App.C.DONE && !t.parent_recurring_id; },
  // Sắp đến hạn: chưa xong, hạn từ hôm nay đến hôm nay + SOON_DAYS (dùng chung cho mọi tab)
  SOON_DAYS: 2,
  isDueSoon: function (t, today) {
    return !!t.due_date && t.status !== App.C.DONE &&
      t.due_date >= today && t.due_date <= App.date.addDays(today, App.logic.SOON_DAYS);
  },
  isTop3Today: function (t, today) { return App.util.isTrue(t.is_top3) && t.top3_date === today && !App.logic.isMissed(t, today); },

  /* Ưu tiên (GĐ6): mỗi việc chỉ có Quan trọng có / không. Cột is_important còn trống (dữ liệu trước GĐ6) thì đọc theo ưu tiên Cao.
     Gấp do web tự tính: chưa xong và hạn chót trong 2 ngày tới hoặc đã quá hạn. */
  isImportant: function (t) {
    var v = String(t.is_important == null ? '' : t.is_important).toUpperCase();
    return v === '' ? t.priority === 'Cao' : v === 'TRUE';
  },
  isUrgent: function (t, today) {
    return !!t.due_date && t.status !== App.C.DONE && t.due_date <= App.date.addDays(today, App.logic.SOON_DAYS);
  },
  impRank: function (t) { return App.logic.isImportant(t) ? 0 : 1; },
  // Thời lượng (phút), để trống thì 30 phút
  duration: function (t) {
    var n = parseInt(t && t.duration_min, 10);
    return n > 0 ? n : App.C.DEFAULT_DURATION;
  },
  deferCount: function (t) { var n = parseInt(t && t.defer_count, 10); return n > 0 ? n : 0; },
  // Việc cha: có ít nhất một việc con (parent_id trỏ tới). Trả về { id: số việc con }
  parentIds: function (tasks) {
    var m = {};
    tasks.forEach(function (t) { if (t.parent_id) m[t.parent_id] = (m[t.parent_id] || 0) + 1; });
    return m;
  },
  children: function (tasks, id) { return tasks.filter(function (t) { return t.parent_id === id; }); },
  // Việc từ 2 giờ trở lên chưa chia nhỏ thì không xếp được vào ngày
  needsSplit: function (t, tasks) {
    return App.logic.duration(t) >= App.C.BIG_MIN && !App.logic.parentIds(tasks)[t.id];
  },
  // Ngày sẽ làm. Lần lặp sinh trước GĐ6 chưa có do_date thì coi là đúng ngày của nó
  doDate: function (t) {
    if (App.date.isValid(t.do_date)) return t.do_date;
    return t.parent_recurring_id && App.date.isValid(t.due_date) ? t.due_date : '';
  },
  // Kho: việc chưa xong, chưa có Ngày sẽ làm (không tính việc lặp mẫu)
  inInbox: function (t) { return !App.logic.isTemplate(t) && t.status !== App.C.DONE && !App.logic.doDate(t); },
  // Việc đã về kho vì chưa xong (dời ít nhất 1 lần) trong 2 ngày gần nhất
  justReturned: function (t, today) {
    return !App.logic.doDate(t) && App.logic.deferCount(t) > 0 && App.date.isValid(t.inbox_since) && t.inbox_since >= App.date.addDays(today, -1) && !App.logic.isDone(t);
  },
  inboxDays: function (t, today) {
    var s = String(t.inbox_since || t.created_at || '').slice(0, 10);
    return App.date.isValid(s) ? Math.max(0, App.date.diffDays(s, today)) : 0;
  },
  // Viết thời lượng: 15p, 1h, 1h30, 5h15
  fmtMin: function (m) {
    m = Math.round(m || 0);
    var neg = m < 0; m = Math.abs(m);
    var h = Math.floor(m / 60), r = m % 60;
    return (neg ? '-' : '') + (h ? h + 'h' + (r ? App.util.pad(r) : '') : r + 'p');
  },
  DURATION_LABELS: { 15: '15p', 30: '30p', 60: '1h', 120: '2h', 240: 'Nửa ngày' },

  // Việc chưa xong lên trước, rồi việc quan trọng, rồi theo hạn
  sortTasks: function (list) {
    var L = App.logic;
    return list.slice().sort(function (a, b) {
      var d = (L.isDone(a) ? 1 : 0) - (L.isDone(b) ? 1 : 0);
      if (d) return d;
      d = L.impRank(a) - L.impRank(b);
      if (d) return d;
      d = (a.due_date || '9999') < (b.due_date || '9999') ? -1 : (a.due_date || '9999') > (b.due_date || '9999') ? 1 : 0;
      if (d) return d;
      return (a.created_at || '') < (b.created_at || '') ? -1 : 1;
    });
  },
  // Việc sắp đến hạn (xem isDueSoon), hạn sớm trước rồi việc quan trọng trước
  upcoming: function (tasks, today) {
    var L = App.logic;
    return tasks.filter(function (t) { return L.isDueSoon(t, today); })
      .sort(function (a, b) { return a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : L.impRank(a) - L.impRank(b); });
  },

  /* Ma trận 4 ô, web tự xếp (GĐ6): Quan trọng do người dùng đánh dấu, Gấp = quá hạn hoặc hạn chót trong 2 ngày tới.
     1 Khẩn cấp, 2 Làm sau, 3 Làm trong ngày / Nhượng quyền, 4 Dời hôm sau */
  quadrant: function (t, today) {
    var imp = App.logic.isImportant(t);
    var urg = !!t.due_date && t.due_date <= App.date.addDays(today, App.logic.SOON_DAYS);
    return imp && urg ? 1 : imp ? 2 : urg ? 3 : 4;
  },
  QUADRANTS: {
    1: { label: 'Khẩn cấp', short: 'Khẩn cấp', icon: 'flame', hint: 'Quan trọng và gấp', act: 'Việc cần làm ngay' },
    2: { label: 'Làm sau', short: 'Làm sau', icon: 'calendar', hint: 'Quan trọng, chưa gấp', act: 'Chọn ngày làm, đừng để tới sát hạn' },
    3: { label: 'Làm trong ngày / Nhượng quyền', short: 'Trong ngày', icon: 'hourglass', hint: 'Gấp, không quan trọng', act: 'Làm nhanh trong ngày hoặc nhờ người khác' },
    4: { label: 'Dời hôm sau', short: 'Dời', icon: 'refresh', hint: 'Không quan trọng, không gấp', act: 'Dời lại hoặc bỏ qua' }
  },

  /* Giờ hạn chót (GĐ5) không còn bắt buộc từ GĐ6 */
  isTime: function (v) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || '')); },
  // Khóa sắp xếp theo ngày rồi giờ; việc không có hạn xếp cuối
  dueKey: function (t) {
    return t.due_date ? t.due_date + ' ' + (App.logic.isTime(t.due_time) ? t.due_time : '23:59') : '9999';
  },
  doneDay: function (t) { return String(t.done_at || '').slice(0, 10); },
  /* Việc của ngày D (GĐ6): việc có Ngày sẽ làm = D, cộng việc đã xong trong ngày D.
     Việc cha đã chia nhỏ không hiện (từng việc con có ngày riêng). Việc quá hạn chót hiện riêng (overdueList). */
  dayList: function (tasks, day) {
    var L = App.logic, parents = L.parentIds(tasks);
    return tasks.filter(function (t) {
      if (L.isTemplate(t) || parents[t.id]) return false;
      if (L.isDone(t) && L.doneDay(t) === day) return true;
      return L.doDate(t) === day;
    }).sort(function (a, b) { var x = L.dueKey(a), y = L.dueKey(b); return x < y ? -1 : x > y ? 1 : L.impRank(a) - L.impRank(b); });
  },
  // Việc quá hạn chót tính đến ngày D, chưa xong, không nằm trong danh sách của ngày D (cảnh báo ở Agenda)
  overdueList: function (tasks, day) {
    var L = App.logic, parents = L.parentIds(tasks);
    return tasks.filter(function (t) {
      if (L.isTemplate(t) || parents[t.id] || t.parent_recurring_id || !t.due_date || t.due_date >= day) return false;
      var dd = L.doneDay(t);
      if (L.isDone(t) && (!dd || dd <= day)) return false;
      return L.doDate(t) !== day;
    }).sort(function (a, b) { return L.dueKey(a) < L.dueKey(b) ? -1 : 1; });
  },
  // Trạng thái đến hạn so với ngày D: over (hạn trước D), due (hạn ngày D), later (hạn sau D hoặc chưa có hạn)
  dueState: function (t, day) { return !t.due_date || t.due_date > day ? 'later' : t.due_date < day ? 'over' : 'due'; },
  // Việc đã xong tính đến hết ngày D
  doneBy: function (t, day) { var d = App.logic.doneDay(t); return App.logic.isDone(t) && (!d || d <= day); },
  // Số liệu biểu đồ tổng quan của ngày D (tab Tổng kết, kỳ Ngày)
  dayStats2: function (list, day) {
    var L = App.logic, s = { total: list.length, done: 0, due: {}, quad: {} };
    ['over', 'due', 'later'].forEach(function (k) { s.due[k] = { done: 0, open: 0 }; s.quad[k] = [0, 0, 0, 0]; });
    list.forEach(function (t) {
      var k = L.dueState(t, day), done = L.doneBy(t, day);
      if (done) s.done++;
      s.due[k][done ? 'done' : 'open']++;
      s.quad[k][L.quadrant(t, day) - 1]++;
    });
    return s;
  },

  // Tên việc gần giống tên thói quen: so từ (bỏ dấu), chỉ số Jaccard từ 0,6
  similar: function (a, b) {
    var L = App.logic;
    function set(s) { var m = {}; L.plain(s).split(' ').forEach(function (w) { if (w) m[w] = true; }); return m; }
    var x = set(a), y = set(b), inter = 0, uni = {};
    Object.keys(x).forEach(function (k) { uni[k] = true; if (y[k]) inter++; });
    Object.keys(y).forEach(function (k) { uni[k] = true; });
    var n = Object.keys(uni).length;
    return n ? inter / n : 0;
  },
  similarHabit: function (title, habits) {
    var L = App.logic;
    return habits.filter(L.habitActive).find(function (h) { return L.similar(title, h.name) >= 0.6; }) || null;
  },

  // Mức quan trọng của mục tiêu: 1 đến 3 trái tim, để trống thì coi là 2
  importance: function (g) {
    var n = parseInt(g && g.importance, 10);
    return n >= 1 && n <= 3 ? n : 2;
  },

  // Nhãn thời gian còn lại của mục tiêu: { text, kind: hot | warm | calm | plain }
  goalDeadline: function (g, today) {
    if (g.status === 'Hoàn thành') return { text: 'Hoàn thành', kind: 'calm' };
    if (g.status === 'Tạm dừng') return { text: 'Tạm dừng', kind: 'plain' };
    if (!App.date.isValid(g.end_date)) return null;
    var d = App.date.diffDays(today, g.end_date);
    if (d < 0) return { text: 'Quá hạn ' + (-d) + ' ngày', kind: 'hot' };
    if (d === 0) return { text: 'Hết hạn hôm nay', kind: 'hot' };
    return { text: 'Còn ' + d + ' ngày', kind: d <= 3 ? 'hot' : d <= 10 ? 'warm' : 'calm' };
  },

  // Đoán icon theo tên việc. Từ khóa có dấu để phân biệt "họp"/"hợp", "sách"/"sạch".
  // Tên gõ không dấu thì so với từ khóa đã bỏ dấu. Khớp theo từ, từ khóa dài nhất thắng.
  ICON_RULES: [
    ['mail', ['email', 'mail', 'gửi thư', 'hộp thư']],
    ['phone', ['gọi điện', 'điện thoại', 'gọi cho', 'call', 'nhắn tin']],
    ['users', ['họp', 'meeting', 'phỏng vấn', 'gặp', 'hẹn']],
    ['chart', ['biểu đồ', 'số liệu', 'kpi', 'doanh thu', 'thống kê', 'dashboard', 'dữ liệu']],
    ['doc', ['báo cáo', 'tài liệu', 'hợp đồng', 'văn bản', 'slide', 'kế hoạch', 'đề xuất', 'nhận xét', 'tổng hợp']],
    ['laptop', ['code', 'lập trình', 'website', 'web', 'máy tính', 'phần mềm', 'excel', 'power bi']],
    ['book', ['đọc sách', 'sách', 'đọc', 'truyện']],
    ['grad', ['học', 'khóa học', 'bài', 'ôn thi', 'thi', 'chứng chỉ', 'kiểm tra', 'tiếng anh', 'ôn tập']],
    ['pencil', ['viết', 'ghi chép', 'nhật ký', 'soạn', 'vẽ']],
    ['shoe', ['chạy', 'chạy bộ', 'đi bộ', 'bước', 'giày']],
    ['dumbbell', ['tập', 'gym', 'yoga', 'thể dục', 'bơi', 'đạp xe']],
    ['tooth', ['răng', 'nha khoa']],
    ['pill', ['thuốc', 'khám', 'bác sĩ', 'bệnh viện', 'vitamin', 'sức khỏe']],
    ['food', ['ăn', 'nấu', 'cơm', 'bữa', 'nhà hàng', 'ăn sáng']],
    ['drop', ['uống nước', 'nước']],
    ['moon', ['ngủ', 'nghỉ ngơi', 'thiền']],
    ['home', ['dọn nhà', 'nhà cửa', 'giặt', 'rửa', 'vệ sinh', 'lau', 'dọn']],
    ['wallet', ['tiền', 'thanh toán', 'hóa đơn', 'chuyển khoản', 'ngân hàng', 'lương', 'bảo hiểm', 'đóng phí']],
    ['cart', ['mua', 'siêu thị', 'chợ', 'đặt hàng']],
    ['car', ['xe', 'ô tô', 'oto', 'xăng', 'bảo dưỡng']],
    ['plane', ['du lịch', 'máy bay', 'khách sạn', 'chuyến bay']],
    ['gift', ['quà', 'sinh nhật', 'tặng', 'kỷ niệm']],
    ['music', ['nhạc', 'đàn', 'hát', 'piano', 'guitar']]
  ],
  TASK_ICONS: ['note', 'mail', 'phone', 'users', 'chart', 'doc', 'laptop', 'book', 'grad', 'pencil', 'shoe', 'dumbbell',
    'tooth', 'pill', 'food', 'drop', 'moon', 'home', 'wallet', 'cart', 'car', 'plane', 'gift', 'music'],
  // Chữ thường, giữ dấu tiếng Việt, ký tự khác thành khoảng trắng
  words: function (s) {
    return String(s || '').normalize('NFC').toLowerCase().replace(/[^0-9a-zà-ỹđ]+/g, ' ').trim();
  },
  plain: function (s) {
    return App.logic.words(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  },
  guessIcon: function (title) {
    var L = App.logic, text = L.words(title);
    var noMarks = text === L.plain(title);
    var hay = ' ' + text + ' ', best = 'note', bestLen = 0;
    L.ICON_RULES.forEach(function (r) {
      r[1].forEach(function (k) {
        var key = noMarks ? L.plain(k) : k;
        if (key.length > bestLen && hay.indexOf(' ' + key + ' ') >= 0) { best = r[0]; bestLen = key.length; }
      });
    });
    return best;
  },
  iconOf: function (t) {
    return App.logic.TASK_ICONS.indexOf(t.icon) >= 0 ? t.icon : App.logic.guessIcon(t.title);
  },

  /* Việc ghim đầu ngày (GĐ7): việc lặp mẫu có `pinned` = số thứ tự (1, 2, ...). Lần lặp lấy thứ tự theo việc mẫu.
     pinMap: { id việc mẫu: thứ tự }; pinOrder(t, pm): thứ tự ghim của việc t (0 = không ghim). */
  pinMap: function (tasks) {
    var m = {};
    tasks.forEach(function (t) { var n = parseInt(t.pinned, 10); if (App.logic.isTemplate(t) && n > 0) m[t.id] = n; });
    return m;
  },
  pinOrder: function (t, pm) {
    if (App.logic.isTemplate(t)) return pm[t.id] || 0;
    return t.parent_recurring_id ? pm[t.parent_recurring_id] || 0 : 0;
  },

  // Việc không gắn mục tiêu: nhớ lựa chọn Giờ làm / Buổi tối của lần trước (mặc định buổi tối)
  lastBucket: function () { try { return localStorage.getItem('lp_nogoal_bucket') === 'work' ? 'work' : 'evening'; } catch (e) { return 'evening'; } },
  rememberBucket: function (b) { try { localStorage.setItem('lp_nogoal_bucket', b === 'work' ? 'work' : 'evening'); } catch (e) { /* bỏ qua */ } },

  newTask: function (fields) {
    var now = App.util.now();
    var t = {
      id: App.util.uuid(), title: '', goal_id: '', due_date: '', due_time: '', priority: '',
      status: 'Cần làm', is_top3: 'FALSE', top3_date: '', recurring_rule: '', parent_recurring_id: '',
      done_at: '', note: '', created_at: now, updated_at: now, icon: '',
      do_date: '', duration_min: String(App.C.DEFAULT_DURATION), is_important: 'FALSE', parent_id: '', first_step: '', defer_count: '0', inbox_since: '', bucket: '', pinned: ''
    };
    Object.assign(t, fields || {});
    if (!t.icon) t.icon = App.logic.guessIcon(t.title);
    // Không có Ngày sẽ làm thì vào kho từ hôm nay
    if (!t.do_date && !t.inbox_since && !App.logic.isTemplate(t)) t.inbox_since = App.date.today();
    return t;
  },

  newGoal: function (fields) {
    var now = App.util.now(), today = App.date.today();
    var pv = App.period.valueOf('Tháng', today), r = App.period.range('Tháng', pv);
    var g = {
      id: App.util.uuid(), name: '', group: 'Công việc', period_type: 'Tháng', period_value: pv,
      start_date: r.start, end_date: r.end, progress_mode: 'task', unit: '', target: '', actual: '',
      status: 'Đang làm', note: '', created_at: now, updated_at: now, importance: '2'
    };
    return Object.assign(g, fields || {});
  }
};

/* Tổng kết ngày / tuần / tháng / năm (chốt GĐ4, mở rộng GĐ5):
   - Tỷ lệ hoàn thành: việc có hạn trong kỳ (đến hôm nay) đã xong / tổng số việc đó.
   - Việc đã xong: việc (không tính việc lặp mẫu) có done_at trong kỳ.
   - % đúng hạn: trong số việc xong trong kỳ có hạn chót, bao nhiêu % xong không muộn hơn hạn.
   - % trung bình mục tiêu: các mục tiêu không Tạm dừng có thời gian chạm vào kỳ, % tính tại cuối kỳ (kỳ đang diễn ra: hôm nay). */
App.summary = (function () {
  var D = App.date, P = App.period;
  var TYPES = ['Ngày', 'Tuần', 'Tháng', 'Năm'];
  // Gộp biểu đồ: không lớn hơn kỳ. Kỳ Ngày thì xem 7 ngày tính đến ngày đó.
  var GRANS = { 'Ngày': ['day'], 'Tuần': ['day'], 'Tháng': ['day', 'week'], 'Năm': ['day', 'week', 'month'] };
  var GRAN_DEFAULT = { 'Ngày': 'day', 'Tuần': 'day', 'Tháng': 'day', 'Năm': 'month' };

  /* Tỷ lệ hoàn thành theo mốc: trong số việc có hạn rơi vào mốc, bao nhiêu việc đã xong.
     Tính cả lần lặp bỏ lỡ (chưa xong). Mốc sau hôm nay để trống. */
  function rate(state, start, end, gran, today) {
    var L = App.logic, map = {}, list = [];
    for (var d = start; d <= end; d = D.addDays(d, 1)) {
      var key = gran === 'month' ? d.slice(0, 7) : gran === 'week' ? D.isoWeek(d).year + '-' + D.isoWeek(d).week : d;
      var b = map[key];
      if (!b) { b = map[key] = { key: key, start: d, end: d, due: 0, done: 0, week: D.isoWeek(d).week }; list.push(b); }
      b.end = d;
    }
    state.tasks.forEach(function (t) {
      if (L.isTemplate(t) || !D.isValid(t.due_date) || t.due_date < start || t.due_date > end || t.due_date > today) return;
      for (var i = 0; i < list.length; i++) {
        if (t.due_date <= list[i].end) { list[i].due++; if (L.isDone(t)) list[i].done++; break; }
      }
    });
    return list.map(function (b) {
      b.future = b.start > today;
      b.pct = b.due ? Math.round(b.done / b.due * 100) : null;
      return b;
    });
  }

  // Tổng kết thói quen trong kỳ: số ngày cần làm (đến hôm nay, từ ngày tạo), số ngày đã tick
  function habitSum(state, start, end, today) {
    var L = App.logic;
    return state.habits.map(function (h) {
      var done = L.habitDone(h, state.habitLogs), need = 0, did = 0;
      var from = String(h.created_at || '').slice(0, 10);
      for (var d = start; d <= end && d <= today; d = D.addDays(d, 1)) {
        if ((D.isValid(from) && d < from) || !L.isHabitDay(h, d)) continue;
        need++; if (done[d]) did++;
      }
      return { habit: h, need: need, did: did, pct: need ? Math.round(did / need * 100) : null, streak: L.habitStreak(h, state.habitLogs, today) };
    }).filter(function (x) { return x.need || x.did; });
  }

  function current(type, today) { return P.valueOf(type, today); }
  // Kỳ liền trước / liền sau
  function shift(type, value, dir) {
    var r = P.range(type, value);
    if (!r) return value;
    return P.valueOf(type, dir < 0 ? D.addDays(r.start, -1) : D.addDays(r.end, 1));
  }

  function build(state, type, value, today) {
    var L = App.logic, r = P.range(type, value);
    var tasks = state.tasks.filter(function (t) { return !L.isTemplate(t); });
    var done = tasks.filter(function (t) {
      var d = String(t.done_at || '').slice(0, 10);
      return L.isDone(t) && D.isValid(d) && d >= r.start && d <= r.end;
    });
    var withDue = done.filter(function (t) { return D.isValid(t.due_date); });
    var onTime = withDue.filter(function (t) { return String(t.done_at).slice(0, 10) <= t.due_date; }).length;

    var goals = state.goals.filter(function (g) {
      return g.status !== 'Tạm dừng' && D.isValid(g.start_date) && D.isValid(g.end_date) && g.start_date <= r.end && g.end_date >= r.start;
    }).map(function (g) {
      var asOf = r.end < today ? r.end : today;
      var p = asOf === today ? L.goalProgress(g, state.tasks) : L.goalProgressAt(g, state.tasks, asOf);
      return { goal: g, pct: p.pct, approx: !!p.approx && asOf !== today };
    });
    var avg = goals.length ? Math.round(goals.reduce(function (a, x) { return a + x.pct; }, 0) / goals.length) : 0;

    // Số việc xong theo từng ngày của kỳ (ngày sau hôm nay để trống)
    var byDay = {};
    done.forEach(function (t) { var d = String(t.done_at).slice(0, 10); byDay[d] = (byDay[d] || 0) + 1; });
    var days = [];
    for (var d = r.start; d <= r.end; d = D.addDays(d, 1)) days.push({ date: d, n: byDay[d] || 0, future: d > today });
    // Gộp theo tuần (tuần cắt theo kỳ, bắt đầu thứ Hai)
    var weeks = [];
    days.forEach(function (x) {
      var wk = D.isoWeek(x.date).week, last = weeks[weeks.length - 1];
      if (!last || last.week !== wk) weeks.push(last = { week: wk, start: x.date, end: x.date, n: 0, future: true });
      last.end = x.date; last.n += x.n; if (!x.future) last.future = false;
    });

    var dueAll = 0, dueDone = 0;
    tasks.forEach(function (t) {
      if (!D.isValid(t.due_date) || t.due_date < r.start || t.due_date > r.end || t.due_date > today) return;
      dueAll++; if (L.isDone(t)) dueDone++;
    });
    return {
      type: type, value: value, start: r.start, end: r.end,
      dueAll: dueAll, dueDone: dueDone, ratePct: dueAll ? Math.round(dueDone / dueAll * 100) : null,
      habits: habitSum(state, r.start, r.end, today),
      doneCount: done.length, onTime: onTime, withDue: withDue.length,
      onTimePct: withDue.length ? Math.round(onTime / withDue.length * 100) : null,
      goals: goals, avg: goals.length ? avg : null, days: days, weeks: weeks
    };
  }

  function findReview(reviews, type, value) {
    return reviews.find(function (x) { return x.period_type === type && x.period_value === value; }) || null;
  }

  return { TYPES: TYPES, GRANS: GRANS, GRAN_DEFAULT: GRAN_DEFAULT, current: current, shift: shift, build: build, rate: rate, habitSum: habitSum, findReview: findReview };
})();

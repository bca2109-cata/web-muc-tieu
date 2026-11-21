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
    Tasks: ['id', 'title', 'goal_id', 'due_date', 'priority', 'status', 'is_top3', 'top3_date', 'recurring_rule', 'parent_recurring_id', 'done_at', 'note', 'created_at', 'updated_at', 'icon'],
    Habits: ['id', 'name', 'goal_id', 'frequency', 'active', 'created_at', 'updated_at'],
    HabitLogs: ['id', 'habit_id', 'date', 'done', 'created_at', 'updated_at'],
    Reviews: ['id', 'period_type', 'period_value', 'good', 'bad', 'next', 'created_at', 'updated_at']
  },
  // Tên sheet -> khóa trong state
  TABLES: { Goals: 'goals', Tasks: 'tasks', Habits: 'habits', HabitLogs: 'habitLogs', Reviews: 'reviews' }
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
    toStr: toStr, parse: parse, isValid: isValid, today: today, addDays: addDays, diffDays: diffDays,
    fmt: fmt, weekday: weekday, lastDayOfMonth: lastDayOfMonth, isoWeek: isoWeek, isoWeekMonday: isoWeekMonday
  };
})();

/* Kỳ của mục tiêu. Giá trị lưu: Năm "2026", Quý "2027-Q1", Tháng "2026-11", Tuần "2026-W48" */
App.period = (function () {
  var D = App.date, pad = function (n) { return App.util.pad(n); };

  function valueOf(type, dateStr) {
    var d = D.parse(dateStr), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
    if (type === 'Năm') return String(y);
    if (type === 'Quý') return y + '-Q' + Math.ceil(m / 3);
    if (type === 'Tháng') return y + '-' + pad(m);
    var w = D.isoWeek(dateStr);
    return w.year + '-W' + pad(w.week);
  }

  function range(type, value) {
    var v = String(value || ''), m;
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
     Theo chỉ số: thực tế / target. */
  goalProgress: function (goal, tasks) {
    if (goal.progress_mode === 'metric') {
      var target = App.logic.num(goal.target), actual = App.logic.num(goal.actual);
      return { mode: 'metric', done: actual, total: target, unit: goal.unit || '',
        pct: target > 0 ? Math.min(100, Math.max(0, Math.round(actual / target * 100))) : 0 };
    }
    var mine = tasks.filter(function (t) { return t.goal_id === goal.id && !App.logic.isTemplate(t); });
    var done = mine.filter(function (t) { return t.status === App.C.DONE; }).length;
    var total = mine.length;
    var pct = total ? Math.round(done / total * 100) : 0;
    return { mode: 'task', done: done, total: total, pct: pct };
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
  // Các lần lặp cần sinh thêm: từ ngày bắt đầu của mẫu (tối đa 30 ngày gần nhất) đến hôm nay
  recurringToCreate: function (tasks, today) {
    var L = App.logic, D = App.date, have = {}, out = [];
    tasks.forEach(function (t) { have[t.id] = true; });
    var floor = D.addDays(today, 1 - L.RECUR_BACKFILL_DAYS);
    tasks.filter(L.isTemplate).forEach(function (tpl) {
      var start = D.isValid(tpl.due_date) ? tpl.due_date : String(tpl.created_at || '').slice(0, 10);
      if (!D.isValid(start)) start = today;
      if (start < floor) start = floor;
      for (var d = start; d <= today; d = D.addDays(d, 1)) {
        var id = tpl.id + '-' + d;
        if (have[id] || !L.ruleMatches(tpl.recurring_rule, d)) continue;
        have[id] = true;
        out.push(L.newTask({
          id: id, title: tpl.title, goal_id: tpl.goal_id, due_date: d, priority: tpl.priority, icon: tpl.icon,
          parent_recurring_id: tpl.id
        }));
      }
    });
    return out;
  },

  // ≥ 100% đạt, 80–99% gần đạt, < 80% cần chú ý
  level: function (pct) { return pct >= 100 ? 'ok' : pct >= 80 ? 'pr' : 'warn'; },
  levelLabel: function (pct) { return pct >= 100 ? 'Đạt' : pct >= 80 ? 'Gần đạt' : 'Cần chú ý'; },

  isDone: function (t) { return t.status === App.C.DONE; },
  // Lần lặp đã qua ngày không tính là trễ hạn (xem isMissed)
  isOverdue: function (t, today) { return !!t.due_date && t.due_date < today && t.status !== App.C.DONE && !t.parent_recurring_id; },
  // Đến hạn hôm nay hoặc ngày mai
  isDueSoon: function (t, today) {
    return !!t.due_date && t.status !== App.C.DONE &&
      (t.due_date === today || t.due_date === App.date.addDays(today, 1));
  },
  isTop3Today: function (t, today) { return App.util.isTrue(t.is_top3) && t.top3_date === today && !App.logic.isMissed(t, today); },

  /* Danh sách việc hôm nay (bảng và biểu đồ): việc chưa xong có hạn đến ngày mai (gồm trễ hạn) hoặc nằm trong Top 3,
     cộng việc đã xong hôm nay. Chưa xong xếp trước, rồi theo hạn sớm nhất, rồi theo ưu tiên. */
  workList: function (tasks, today) {
    var L = App.logic, tmr = App.date.addDays(today, 1);
    return tasks.filter(function (t) {
      if (L.isDone(t)) return t.done_at === today;
      return L.isTop3Today(t, today) || (!!t.due_date && t.due_date <= tmr);
    }).sort(function (a, b) {
      var d = (L.isDone(a) ? 1 : 0) - (L.isDone(b) ? 1 : 0);
      if (d) return d;
      var da = a.due_date || '9999', db = b.due_date || '9999';
      if (da !== db) return da < db ? -1 : 1;
      return L.priorityRank(a.priority) - L.priorityRank(b.priority);
    });
  },
  // Đếm tỷ trọng cho biểu đồ. Độ khẩn cấp chỉ tính việc chưa xong.
  dayStats: function (list, today) {
    var L = App.logic, tmr = App.date.addDays(today, 1);
    var s = { total: list.length, done: 0, status: { done: 0, doing: 0, todo: 0 }, pri: { hi: 0, mid: 0, low: 0 },
      urg: { over: 0, today: 0, tmr: 0, other: 0 } };
    list.forEach(function (t) {
      if (L.isDone(t)) { s.done++; s.status.done++; }
      else if (t.status === 'Đang làm') s.status.doing++;
      else s.status.todo++;
      s.pri[t.priority === 'Cao' ? 'hi' : t.priority === 'Thấp' ? 'low' : 'mid']++;
      if (L.isDone(t)) return;
      s.urg[!t.due_date ? 'other' : t.due_date < today ? 'over' : t.due_date === today ? 'today' : t.due_date === tmr ? 'tmr' : 'other']++;
    });
    return s;
  },
  // Việc sắp đến hạn: chưa xong, hạn từ ngày kia đến 7 ngày tới (đến ngày mai đã nằm trong bảng hôm nay)
  upcoming: function (tasks, today) {
    var L = App.logic, from = App.date.addDays(today, 2), to = App.date.addDays(today, 7);
    return tasks.filter(function (t) { return !L.isDone(t) && !!t.due_date && t.due_date >= from && t.due_date <= to; })
      .sort(function (a, b) { return a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : L.priorityRank(a.priority) - L.priorityRank(b.priority); });
  },
  // Gợi ý điền Top 3 còn trống: việc trễ hạn trước, rồi việc ô Khẩn cấp
  top3Suggest: function (tasks, today, room) {
    var L = App.logic;
    var pool = tasks.filter(function (t) { return !L.isDone(t) && !L.isTop3Today(t, today); });
    var byDue = function (a, b) {
      return a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : L.priorityRank(a.priority) - L.priorityRank(b.priority);
    };
    var over = pool.filter(function (t) { return L.isOverdue(t, today); }).sort(byDue);
    var urgent = pool.filter(function (t) { return !L.isOverdue(t, today) && L.quadrant(t, today) === 1; }).sort(byDue);
    return over.concat(urgent).slice(0, Math.max(0, room));
  },

  // Top 3 hôm trước chưa xong thì giữ lại sang hôm nay
  top3CarryOver: function (tasks, today) {
    return tasks.filter(function (t) {
      return App.util.isTrue(t.is_top3) && t.top3_date && t.top3_date < today && t.status !== App.C.DONE && !App.logic.isMissed(t, today);
    });
  },

  priorityRank: function (p) { return { 'Cao': 0, 'Trung bình': 1, 'Thấp': 2 }[p] != null ? { 'Cao': 0, 'Trung bình': 1, 'Thấp': 2 }[p] : 1; },

  // Việc chưa xong lên trước, rồi theo ưu tiên, rồi theo hạn
  sortTasks: function (list) {
    var L = App.logic;
    return list.slice().sort(function (a, b) {
      var d = (L.isDone(a) ? 1 : 0) - (L.isDone(b) ? 1 : 0);
      if (d) return d;
      d = L.priorityRank(a.priority) - L.priorityRank(b.priority);
      if (d) return d;
      d = (a.due_date || '9999') < (b.due_date || '9999') ? -1 : (a.due_date || '9999') > (b.due_date || '9999') ? 1 : 0;
      if (d) return d;
      return (a.created_at || '') < (b.created_at || '') ? -1 : 1;
    });
  },

  /* Ma trận 4 ô. Quan trọng = ưu tiên Cao. Gấp = trễ hạn, hạn hôm nay hoặc ngày mai.
     1 Khẩn cấp, 2 Lên lịch, 3 Xử lý sau, 4 Xem xét */
  quadrant: function (t, today) {
    var imp = t.priority === 'Cao';
    var urg = !!t.due_date && t.due_date <= App.date.addDays(today, 1);
    return imp && urg ? 1 : imp ? 2 : urg ? 3 : 4;
  },
  QUADRANTS: {
    1: { label: 'Khẩn cấp', icon: 'flame', hint: 'Quan trọng và khẩn cấp', act: 'Xử lý ngay lập tức' },
    2: { label: 'Lên lịch', icon: 'calendar', hint: 'Quan trọng, không khẩn cấp', act: 'Lập kế hoạch, đặt thời hạn rõ ràng' },
    3: { label: 'Xử lý sau', icon: 'hourglass', hint: 'Khẩn cấp, không quan trọng', act: 'Giao người khác hoặc xử lý nhanh' },
    4: { label: 'Xem xét', icon: 'refresh', hint: 'Không quan trọng, không khẩn cấp', act: 'Cắt giảm hoặc bỏ nếu không phục vụ mục tiêu' }
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

  newTask: function (fields) {
    var now = App.util.now();
    var t = {
      id: App.util.uuid(), title: '', goal_id: '', due_date: App.date.today(), priority: 'Trung bình',
      status: 'Cần làm', is_top3: 'FALSE', top3_date: '', recurring_rule: '', parent_recurring_id: '',
      done_at: '', note: '', created_at: now, updated_at: now, icon: ''
    };
    Object.assign(t, fields || {});
    if (!t.icon) t.icon = App.logic.guessIcon(t.title);
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

/* Lập kế hoạch ngày (GĐ6): quỹ giờ, gợi ý buổi sáng, việc đột xuất, chuyển việc về kho.
   Chỉ tính toán, không đụng tới giao diện hay bộ nhớ trình duyệt. */
var App = window.App || (window.App = {});

App.plan = (function () {
  var D = App.date;

  // Cài đặt mặc định: 8h00 đến 17h30, nghỉ trưa 1h30, báo cáo daily 30 phút, dự phòng 30%, tối 1h30, cuối tuần 4 giờ, xem lại kho Thứ Sáu 16h30
  var DEFAULTS = {
    id: 'main', work_start: '08:00', work_end: '17:30', lunch_min: '90', fixed_min: '30', buffer_pct: '30',
    evening_min: '90', review_weekday: '5', review_time: '16:30', weekend_min: '240'
  };
  var BUCKETS = {
    work: { label: 'Giờ làm', short: 'Giờ làm' },
    evening: { label: 'Buổi tối', short: 'Tối' },
    personal: { label: 'Cuối tuần', short: 'Cuối tuần' }
  };

  function minutes(hm) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || '')); return m ? +m[1] * 60 + +m[2] : null; }
  function num(v, d) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) && n >= 0 ? n : d; }

  function settings(state) {
    var row = ((state && state.settings) || []).find(function (r) { return r.id === 'main'; }) || {};
    var s = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      var v = row[k];
      s[k] = v === '' || v == null ? DEFAULTS[k] : String(v);
    });
    ['work_start', 'work_end', 'review_time'].forEach(function (k) { if (!App.logic.isTime(s[k])) s[k] = DEFAULTS[k]; });
    if (!(+s.review_weekday >= 0 && +s.review_weekday <= 6)) s.review_weekday = DEFAULTS.review_weekday;
    return s;
  }
  // Quỹ giờ làm = (giờ làm − nghỉ trưa − việc cố định) × (100% − dự phòng)
  function workNet(s) {
    var span = minutes(s.work_end) - minutes(s.work_start);
    if (!(span > 0)) span = 570;
    return Math.max(0, span - num(s.lunch_min, 90) - num(s.fixed_min, 30));
  }
  function workBudget(s) {
    var pct = Math.min(100, num(s.buffer_pct, 30));
    return Math.max(0, Math.round(workNet(s) * (100 - pct) / 100));
  }
  function isWeekend(day) { var d = D.parse(day); var w = d ? d.getUTCDay() : 1; return w === 0 || w === 6; }
  function caps(s, day) {
    return isWeekend(day) ? { personal: Math.round(num(s.weekend_min, 240)) } : { work: workBudget(s), evening: Math.round(num(s.evening_min, 90)) };
  }
  function goalsMap(state) { var m = {}; (state.goals || []).forEach(function (g) { m[g.id] = g; }); return m; }
  /* Việc thuộc mục tiêu nhóm Công việc xếp vào giờ làm, mục tiêu nhóm khác xếp vào buổi tối.
     Việc không gắn mục tiêu (Việc lặt vặt) theo lựa chọn Giờ làm / Buổi tối của chính việc đó (cột bucket), mặc định buổi tối.
     Cuối tuần chung một quỹ. */
  function bucketOf(t, goals, day) {
    if (isWeekend(day)) return 'personal';
    var g = t.goal_id ? goals[t.goal_id] : null;
    if (g) return g.group === 'Công việc' ? 'work' : 'evening';
    return t.bucket === 'work' ? 'work' : 'evening';
  }
  // Lần lặp của đúng ngày D: việc đã xếp sẵn theo lịch, không gợi ý bỏ và không đưa về kho
  function isFixed(t, day) { return !!t.parent_recurring_id && App.logic.doDate(t) === day; }
  function interruptions(state, day) {
    return (state.interruptions || []).filter(function (x) { return x.date === day; })
      .sort(function (a, b) { return String(a.created_at) < String(b.created_at) ? -1 : 1; });
  }

  /* Quỹ giờ của ngày D: mỗi quỹ có cap (quỹ), intr (đột xuất, trừ vào giờ làm hoặc quỹ cuối tuần),
     avail = cap − intr, planned (tổng thời lượng việc có Ngày sẽ làm = D), done (phần đã xong), over (> 0 là quá tải) */
  function load(state, day) {
    var L = App.logic, s = settings(state), goals = goalsMap(state), cp = caps(s, day), parents = L.parentIds(state.tasks);
    var intr = interruptions(state, day), intrMin = intr.reduce(function (a, x) { return a + L.duration(x); }, 0);
    var keys = Object.keys(cp), by = {};
    keys.forEach(function (k, i) {
      var iv = i === 0 ? intrMin : 0;
      by[k] = { key: k, label: BUCKETS[k].label, short: BUCKETS[k].short, cap: cp[k], intr: iv, avail: cp[k] - iv, planned: 0, done: 0, count: 0 };
    });
    var list = state.tasks.filter(function (t) { return !L.isTemplate(t) && !parents[t.id] && L.doDate(t) === day; });
    list.forEach(function (t) {
      var b = by[bucketOf(t, goals, day)], m = L.duration(t);
      b.planned += m; b.count++;
      if (L.isDone(t)) b.done += m;
    });
    var buckets = keys.map(function (k) { var b = by[k]; b.over = b.planned - b.avail; return b; });
    return { day: day, weekend: isWeekend(day), settings: s, buckets: buckets, by: by, intr: intr, intrMin: intrMin, tasks: list, goals: goals };
  }

  // Xếp việc của ngày theo thứ tự đã chốt (order: danh sách id), việc chưa có trong thứ tự xếp sau
  function ordered(list, order) {
    var idx = {};
    (order || []).forEach(function (id, i) { idx[id] = i; });
    return list.map(function (t, i) { return [t, idx[t.id] != null ? idx[t.id] : 1e6 + i]; })
      .sort(function (a, b) { return a[1] - b[1]; }).map(function (x) { return x[0]; });
  }

  /* Việc sẽ không kịp trong ngày D: đi theo thứ tự danh sách, mỗi quỹ còn (avail − phần đã xong) phút.
     Từ việc đầu tiên vượt quỹ trở về cuối danh sách là không kịp. */
  function overflow(state, day, order) {
    var L = App.logic, ld = load(state, day), out = [];
    var left = {};
    ld.buckets.forEach(function (b) { left[b.key] = b.avail - b.done; });
    var stop = {};
    // Lần lặp chiếm quỹ trước, không bao giờ nằm trong danh sách "không kịp" (không đưa về kho được)
    ld.tasks.forEach(function (t) { if (!L.isDone(t) && isFixed(t, day)) left[bucketOf(t, ld.goals, day)] -= L.duration(t); });
    ordered(ld.tasks.filter(function (t) { return !L.isDone(t) && !isFixed(t, day); }), order).forEach(function (t) {
      var k = bucketOf(t, ld.goals, day), m = L.duration(t);
      if (!stop[k] && m <= left[k]) { left[k] -= m; return; }
      stop[k] = true;
      out.push(t);
    });
    return out;
  }

  // Lý do ngắn cho từng việc trong gợi ý
  function reasons(t, today) {
    var L = App.logic, r = [];
    if (t.due_date && !L.isDone(t)) {
      if (t.due_date < today) r.push('Quá hạn ' + D.diffDays(t.due_date, today) + ' ngày');
      else if (t.due_date === today) r.push('Hạn hôm nay');
      else if (L.isUrgent(t, today)) r.push(t.due_date === D.addDays(today, 1) ? 'Hạn ngày mai' : 'Hạn ngày kia');
    }
    if (L.isImportant(t)) r.push('Quan trọng');
    var dc = L.deferCount(t);
    if (dc) r.push('Đã dời ' + dc + ' lần');
    if (!L.doDate(t)) { var n = L.inboxDays(t, today); if (n) r.push('Nằm kho ' + n + ' ngày'); }
    if (!r.length && L.doDate(t) === today) r.push('Đã đặt hôm nay');
    return r;
  }

  /* Nhóm ưu tiên khi gợi ý:
     1 quá hạn chót hoặc hạn hôm nay, 2 quan trọng và gấp, 3 quan trọng, Ngày sẽ làm = hôm nay,
     4 quan trọng trong kho (dời nhiều, nằm kho lâu trước), 5 không quan trọng nhưng gấp, 6 việc đã đặt hôm nay còn lại. */
  function tier(t, today) {
    var L = App.logic, imp = L.isImportant(t), urg = L.isUrgent(t, today), dd = L.doDate(t);
    if (t.due_date && t.due_date <= today) return 1;
    if (imp && urg) return 2;
    if (imp && dd === today) return 3;
    if (imp && !dd) return 4;
    if (urg) return 5;
    if (dd === today) return 6;
    return 0;
  }
  var TIER_LABELS = ['', 'Quá hạn / hạn hôm nay', 'Quan trọng và gấp', 'Quan trọng, đã đặt hôm nay', 'Quan trọng, trong kho', 'Gấp, không quan trọng', 'Đã đặt hôm nay'];

  /* Gợi ý buổi sáng cho ngày today: danh sách có thứ tự, không vượt quỹ còn lại của từng buổi.
     Trả về { items: [{t, bucket, tier, reasons, first}], skipped: [{t, bucket}], split: [việc cần chia nhỏ], load } */
  function suggest(state, today) {
    var L = App.logic, ld = load(state, today), parents = L.parentIds(state.tasks);
    var left = {};
    ld.buckets.forEach(function (b) { left[b.key] = b.avail - b.done; });
    var pool = [], split = [];
    state.tasks.forEach(function (t) {
      if (L.isTemplate(t) || L.isDone(t) || parents[t.id]) return;
      var dd = L.doDate(t);
      if (t.parent_recurring_id && dd !== today) return;
      if (!(dd === today || !dd || (t.due_date && t.due_date <= today))) return;
      var tr = tier(t, today);
      if (!tr) return;
      if (L.needsSplit(t, state.tasks)) { split.push(t); return; }
      pool.push({ t: t, tier: tr, bucket: bucketOf(t, ld.goals, today) });
    });
    function cmp(a, b) {
      if (a.tier !== b.tier) return a.tier - b.tier;
      var x = a.t, y = b.t, d;
      if (a.tier === 4 || a.tier === 3) {
        d = L.deferCount(y) - L.deferCount(x); if (d) return d;
        d = L.inboxDays(y, today) - L.inboxDays(x, today); if (d) return d;
      }
      d = (x.due_date || '9999') < (y.due_date || '9999') ? -1 : (x.due_date || '9999') > (y.due_date || '9999') ? 1 : 0; if (d) return d;
      d = L.impRank(x) - L.impRank(y); if (d) return d;
      d = L.deferCount(y) - L.deferCount(x); if (d) return d;
      return String(x.created_at || '') < String(y.created_at || '') ? -1 : 1;
    }
    pool.sort(cmp);
    var picked = {}, skipped = [];
    ld.buckets.forEach(function (b) { picked[b.key] = []; });
    // Lần lặp của hôm nay đã xếp sẵn: trừ vào quỹ trước, luôn nằm trong danh sách, phần quỹ còn lại mới dành cho việc khác
    pool.forEach(function (p) { if (isFixed(p.t, today)) { p.fixed = true; left[p.bucket] -= L.duration(p.t); } });
    pool.forEach(function (p) {
      var m = L.duration(p.t);
      if (p.fixed) picked[p.bucket].push(p);
      else if (m <= left[p.bucket]) { left[p.bucket] -= m; picked[p.bucket].push(p); }
      else skipped.push(p);
    });
    // Việc quan trọng lớn nhất làm đầu tiên sau báo cáo sáng, nếu không vướng việc hạn hôm nay
    var first = ld.weekend ? 'personal' : 'work', fl = picked[first];
    if (fl.length && !fl.some(function (p) { return p.tier === 1; })) {
      var big = null;
      fl.forEach(function (p) { if (!p.fixed && L.isImportant(p.t) && (!big || L.duration(p.t) > L.duration(big.t))) big = p; });
      if (big) { fl.splice(fl.indexOf(big), 1); fl.unshift(big); big.first = true; }
    }
    var items = [];
    ld.buckets.forEach(function (b) {
      picked[b.key].forEach(function (p) {
        p.reasons = reasons(p.t, today);
        if (p.fixed) p.reasons.unshift('Việc lặp lại, đã xếp sẵn');
        if (p.first) p.reasons.unshift('Việc lớn nhất, làm đầu tiên');
        items.push(p);
      });
    });
    skipped.forEach(function (p) { p.reasons = reasons(p.t, today); });
    return { items: items, skipped: skipped, split: split, load: ld, left: left };
  }

  /* Sang ngày mới: việc có Ngày sẽ làm trước hôm nay mà chưa xong thì về kho (xóa do_date, dời +1, inbox_since = hôm nay).
     Ngày thường, từ giờ hết làm (17h30): việc nhóm Công việc có Ngày sẽ làm = hôm nay cũng về kho (việc vừa sửa sau giờ đó thì giữ).
     Lần lặp không chuyển (vẫn là việc của đúng ngày đó). Hạn chót giữ nguyên. */
  function rolloverRows(state, today, nowHM) {
    var L = App.logic, s = settings(state), goals = goalsMap(state);
    var after = !isWeekend(today) && String(nowHM) >= s.work_end;
    var cut = today + ' ' + s.work_end;
    return state.tasks.filter(function (t) {
      if (L.isTemplate(t) || L.isDone(t) || t.parent_recurring_id || !D.isValid(t.do_date)) return false;
      if (t.do_date < today) return true;
      return after && t.do_date === today && bucketOf(t, goals, today) === 'work' && String(t.updated_at || '') < cut;
    }).map(function (t) {
      var row = Object.assign({}, t, { do_date: '', defer_count: String(L.deferCount(t) + 1), inbox_since: today });
      if (App.util.isTrue(t.is_top3)) { row.is_top3 = 'FALSE'; row.top3_date = ''; }
      return row;
    });
  }

  // Đưa một việc về kho bằng tay (không kịp trong ngày): dời +1
  function toInbox(t, today, countDefer) {
    var L = App.logic;
    var row = Object.assign({}, t, { do_date: '', inbox_since: today });
    if (countDefer) row.defer_count = String(L.deferCount(t) + 1);
    if (App.util.isTrue(t.is_top3) && t.top3_date === today) { row.is_top3 = 'FALSE'; row.top3_date = ''; }
    return row;
  }

  // Kiểm tra khi đặt một việc vào ngày D: quỹ của buổi đó sau khi thêm việc này
  function fit(state, day, t) {
    var ld = load(state, day), k = bucketOf(t, ld.goals, day), b = ld.by[k];
    var already = App.logic.doDate(t) === day && state.tasks.some(function (x) { return x.id === t.id; });
    var total = b.planned + (already ? 0 : App.logic.duration(t));
    return { bucket: k, label: b.label, total: total, avail: b.avail, cap: b.cap, over: total - b.avail };
  }

  // Đột xuất trung bình mỗi ngày làm việc trong 14 ngày gần nhất, kèm gợi ý % dự phòng
  function interruptionStats(state, today) {
    var L = App.logic, s = settings(state), from = D.addDays(today, -13), sum = 0, n = 0, days = 0;
    (state.interruptions || []).forEach(function (x) {
      if (x.date >= from && x.date <= today) { sum += L.duration(x); n++; }
    });
    for (var d = from; d <= today; d = D.addDays(d, 1)) if (!isWeekend(d)) days++;
    var avg = days ? Math.round(sum / days) : 0, net = workNet(s);
    var pct = net ? Math.min(80, Math.round(avg / net * 100 / 5) * 5) : 0;
    return { from: from, sum: sum, count: n, days: days, avg: avg, suggestPct: pct, currentPct: Math.round(num(s.buffer_pct, 30)), net: net };
  }

  function newInterruption(fields) {
    return Object.assign({ id: App.util.uuid(), date: D.today(), title: '', duration_min: '30', created_at: App.util.now() }, fields || {});
  }

  return {
    DEFAULTS: DEFAULTS, BUCKETS: BUCKETS, TIER_LABELS: TIER_LABELS, minutes: minutes, settings: settings, workNet: workNet, workBudget: workBudget,
    isFixed: isFixed, isWeekend: isWeekend, caps: caps, bucketOf: bucketOf, goalsMap: goalsMap, interruptions: interruptions, load: load, ordered: ordered,
    overflow: overflow, reasons: reasons, tier: tier, suggest: suggest, rolloverRows: rolloverRows, toInbox: toInbox, fit: fit,
    interruptionStats: interruptionStats, newInterruption: newInterruption
  };
})();

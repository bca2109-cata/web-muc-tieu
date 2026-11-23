/* Lập kế hoạch ngày (GĐ6): quỹ giờ, gợi ý buổi sáng, việc đột xuất, chuyển việc về kho.
   Chỉ tính toán, không đụng tới giao diện hay bộ nhớ trình duyệt. */
var App = window.App || (window.App = {});

App.plan = (function () {
  var D = App.date;

  /* Cài đặt mặc định: 8h00 đến 17h30, nghỉ trưa 12h00 (1h30), dự phòng 30%, tối 1h30 từ 20h00, cuối tuần 4 giờ, xem lại kho Thứ Sáu 16h30.
     GĐ7: bỏ "việc cố định" (cột fixed_min giữ lại nhưng không dùng), thay bằng tổng thời lượng việc ghim đầu ngày. */
  var DEFAULTS = {
    id: 'main', work_start: '08:00', work_end: '17:30', lunch_min: '90', buffer_pct: '30',
    evening_min: '90', evening_start: '20:00', review_weekday: '5', review_time: '16:30', weekend_min: '240'
  };
  var LUNCH_START = 720; // 12:00
  var BUCKETS = {
    work: { label: 'Giờ làm', short: 'Giờ làm' },
    evening: { label: 'Buổi tối', short: 'Tối' },
    personal: { label: 'Cuối tuần', short: 'Cuối tuần' }
  };

  // Màn hình bỏ việc lặp mẫu khỏi state.tasks (để riêng ở state.templates), nhưng việc ghim cần đọc cả việc mẫu
  function allT(state) { return state.templates && state.templates.length ? state.tasks.concat(state.templates) : state.tasks; }
  function minutes(hm) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || '')); return m ? +m[1] * 60 + +m[2] : null; }
  function num(v, d) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) && n >= 0 ? n : d; }

  function settings(state) {
    var row = ((state && state.settings) || []).find(function (r) { return r.id === 'main'; }) || {};
    var s = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      var v = row[k];
      s[k] = v === '' || v == null ? DEFAULTS[k] : String(v);
    });
    ['work_start', 'work_end', 'review_time', 'evening_start'].forEach(function (k) { if (!App.logic.isTime(s[k])) s[k] = DEFAULTS[k]; });
    if (!(+s.review_weekday >= 0 && +s.review_weekday <= 6)) s.review_weekday = DEFAULTS.review_weekday;
    return s;
  }
  // Quỹ giờ làm = (giờ làm − nghỉ trưa − tổng việc ghim của ngày) × (100% − dự phòng)
  function workNet(s, pinMin) {
    var span = minutes(s.work_end) - minutes(s.work_start);
    if (!(span > 0)) span = 570;
    return Math.max(0, span - num(s.lunch_min, 90) - (pinMin || 0));
  }
  function workBudget(s, pinMin) {
    var pct = Math.min(100, num(s.buffer_pct, 30));
    return Math.max(0, Math.round(workNet(s, pinMin) * (100 - pct) / 100));
  }
  function isWeekend(day) { var d = D.parse(day); var w = d ? d.getUTCDay() : 1; return w === 0 || w === 6; }
  function caps(s, day, pinMin) {
    return isWeekend(day) ? { personal: Math.round(num(s.weekend_min, 240)) } : { work: workBudget(s, pinMin), evening: Math.round(num(s.evening_min, 90)) };
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
    var L = App.logic, s = settings(state), goals = goalsMap(state), parents = L.parentIds(state.tasks);
    var pins = pinnedOf(state, day), pinMin = pins.reduce(function (a, t) { return a + L.duration(t); }, 0), cp = caps(s, day, pinMin);
    var intr = interruptions(state, day), intrMin = intr.reduce(function (a, x) { return a + L.duration(x); }, 0);
    var keys = Object.keys(cp), by = {};
    keys.forEach(function (k, i) {
      var iv = i === 0 ? intrMin : 0;
      by[k] = { key: k, label: BUCKETS[k].label, short: BUCKETS[k].short, cap: cp[k], intr: iv, avail: cp[k] - iv, planned: 0, done: 0, count: 0 };
    });
    var pm = L.pinMap(allT(state));
    // Việc ghim đã trừ khỏi quỹ nên không tính vào "đã xếp"
    var list = state.tasks.filter(function (t) { return !L.isTemplate(t) && !parents[t.id] && L.doDate(t) === day && !L.pinOrder(t, pm); });
    list.forEach(function (t) {
      var b = by[bucketOf(t, goals, day)], m = L.duration(t);
      b.planned += m; b.count++;
      if (L.isDone(t)) b.done += m;
    });
    var buckets = keys.map(function (k) { var b = by[k]; b.over = b.planned - b.avail; return b; });
    return { day: day, weekend: isWeekend(day), settings: s, buckets: buckets, by: by, intr: intr, intrMin: intrMin, tasks: list, goals: goals, pins: pins, pinMin: pinMin };
  }

  // Việc ghim đầu ngày của ngày D (lần lặp của việc mẫu có ghim), theo thứ tự người dùng đặt
  function pinnedOf(state, day) {
    var L = App.logic, all = allT(state), pm = L.pinMap(all);
    var list = state.tasks.filter(function (t) { return !L.isTemplate(t) && L.doDate(t) === day && L.pinOrder(t, pm); });
    // Ngày sau hôm nay chưa có lần lặp: lấy từ lịch lặp của việc mẫu (việc ảo, chỉ để tính quỹ và giờ)
    if (day > D.today()) {
      var have = {};
      list.forEach(function (t) { have[t.parent_recurring_id] = true; });
      all.forEach(function (t) {
        if (!L.isTemplate(t) || !pm[t.id] || have[t.id] || !L.ruleMatches(t.recurring_rule, day)) return;
        var start = D.isValid(t.due_date) ? t.due_date : String(t.created_at || '').slice(0, 10);
        if (day < start) return;
        list.push(Object.assign({}, t, { id: t.id + '-' + day, parent_recurring_id: t.id, recurring_rule: '', do_date: day, due_date: day, status: 'Cần làm', virtual: true }));
      });
    }
    return list.sort(function (a, b) { return (L.pinOrder(a, pm) - L.pinOrder(b, pm)) || (String(a.created_at) < String(b.created_at) ? -1 : 1); });
  }
  function pinnedTemplates(state) {
    var L = App.logic;
    return allT(state).filter(function (t) { return L.isTemplate(t) && L.pinOrder(t, L.pinMap(allT(state))); })
      .sort(function (a, b) { return +a.pinned - +b.pinned; });
  }

  /* Giờ dự kiến bắt đầu từng việc chưa xong của ngày D (chỉ để tham khảo, không phải lịch cứng).
     ids: thứ tự danh sách (việc ghim luôn đứng đầu). Bắt đầu từ giờ bắt đầu ngày, bỏ qua nghỉ trưa (12h00 + lunch_min),
     việc đột xuất chèn tại giờ ghi làm lùi các việc sau. Bây giờ muộn hơn giờ dự kiến đầu tiên thì tính lại từ bây giờ.
     Buổi tối tính từ evening_start. Cuối tuần không tính giờ. Trả về { id: { start, end, late } } (phút trong ngày). */
  function schedule(state, day, nowHM, ids) {
    var L = App.logic, s = settings(state), out = {};
    if (isWeekend(day)) return out;
    var goals = goalsMap(state), byId = {}, pm = L.pinMap(allT(state));
    state.tasks.forEach(function (t) { byId[t.id] = t; });
    var seq = (ids || []).map(function (id) { return byId[id]; }).filter(function (t) { return t && !L.isDone(t) && L.doDate(t) === day; });
    var pins = pinnedOf(state, day).filter(function (t) { return !L.isDone(t); }), rest = seq.filter(function (t) { return !L.pinOrder(t, pm); });
    var wStart = minutes(s.work_start), wEnd = minutes(s.work_end), lunchEnd = LUNCH_START + num(s.lunch_min, 90), eStart = minutes(s.evening_start);
    var now = day === D.today() && nowHM && minutes(nowHM) != null ? minutes(nowHM) : null;
    var blocks = interruptions(state, day).map(function (x) {
      var m = /(\d{1,2}):(\d{2})/.exec(String(x.created_at || ''));
      return m ? { at: +m[1] * 60 + +m[2], len: L.duration(x), used: false } : null;
    }).filter(Boolean).sort(function (a, b) { return a.at - b.at; });
    // Tiến n phút làm việc từ c, bỏ qua nghỉ trưa (chỉ buổi làm)
    function advance(c, n, lunch) {
      while (n > 0) {
        if (lunch && c >= LUNCH_START && c < lunchEnd) c = lunchEnd;
        var room = lunch && c < LUNCH_START ? LUNCH_START - c : n;
        var step = Math.min(n, room);
        c += step; n -= step;
      }
      if (lunch && c >= LUNCH_START && c < lunchEnd) c = c === LUNCH_START ? c : lunchEnd;
      return c;
    }
    function run(list, start, lunch, limit) {
      var c = start;
      list.forEach(function (t) {
        if (lunch && c >= LUNCH_START && c < lunchEnd) c = lunchEnd;
        var st = c, en = advance(c, L.duration(t), lunch);
        blocks.forEach(function (b) { if (!b.used && b.at >= st && b.at < en && lunch) { b.used = true; en = advance(en, b.len, lunch); } });
        out[t.id] = { start: st, end: en, late: !!limit && en > limit };
        c = en;
        blocks.forEach(function (b) { if (!b.used && b.at <= c && lunch) { b.used = true; c = advance(c, b.len, lunch); } });
      });
      return c;
    }
    function work(list, start) { return run(list, start, true, wEnd); }
    var first = pins.concat(rest.filter(function (t) { return bucketOf(t, goals, day) === 'work'; }));
    var start = wStart;
    if (now != null && now > start) start = now;
    // Muộn hơn giờ dự kiến của việc đầu tiên thì tính lại từ bây giờ: đột xuất đã ghi trước bây giờ chỉ chặn nếu còn đang chạy
    if (now != null) blocks.forEach(function (b) { if (b.at + b.len > start && b.at <= start) { start = b.at + b.len; } if (b.at < start) b.used = true; });
    work(first, start);
    run(rest.filter(function (t) { return bucketOf(t, goals, day) !== 'work'; }), eStart, false, 0);
    return out;
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
    if (L.justReturned(t, today)) r.push('Chưa xong hôm trước, vừa về kho');
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
    var pool = [], split = [], pmap = L.pinMap(allT(state));
    state.tasks.forEach(function (t) {
      if (L.isTemplate(t) || L.isDone(t) || parents[t.id] || L.pinOrder(t, pmap)) return;
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

  /* ---------- Cân việc mới (GĐ7 phần B) ---------- */
  function nextWorkday(day) { var d = D.addDays(day, 1); while (isWeekend(d)) d = D.addDays(d, 1); return d; }
  // Lý do một việc hôm nay không được tự đề xuất đẩy ('' = được phép)
  function protectedReason(t, today, pm) {
    var L = App.logic;
    if (L.pinOrder(t, pm)) return 'Việc ghim';
    if (t.parent_recurring_id) return 'Việc lặp lại';
    if (t.due_date && t.due_date < today) return 'Đã quá hạn';
    if (t.due_date && t.due_date === today) return 'Hạn chót hôm nay';
    if (L.isTop3Today(t, today)) return 'Trong 3 việc chính';
    return '';
  }
  /* Đặt việc mới nt (chưa lưu) vào ma trận cạnh các việc hôm nay và tính phương án:
     today: làm hôm nay, nếu quỹ không đủ thì đề xuất đẩy sang ngày làm việc kế tiếp những việc ô thấp nhất rồi hạn chót xa nhất
       (không bao giờ tự đề xuất việc ghim, quá hạn, hạn hôm nay, 3 việc chính; người dùng tự chọn đẩy thì vẫn được: others);
     day: ngày làm việc gần nhất sau hôm nay còn đủ quỹ mà vẫn trước hạn chót;
     inbox: luôn có. Việc từ 2 giờ trở lên (big) chỉ được vào kho. */
  function balance(state, nt, today) {
    var L = App.logic, goals = goalsMap(state), pm = L.pinMap(allT(state)), dur = L.duration(nt);
    var bucket = bucketOf(nt, goals, today), out = { quadrant: L.quadrant(nt, today), big: dur >= App.C.BIG_MIN, dur: dur, bucket: bucket };
    var ld = load(state, today), b = ld.by[bucket];
    out.label = b ? b.label : '';
    out.free = b ? b.avail - b.planned : 0;
    out.need = Math.max(0, dur - out.free);
    var nd = nextWorkday(today);
    out.pushDay = nd;
    var cands = ld.tasks.filter(function (t) { return !L.isDone(t) && bucketOf(t, goals, today) === bucket; }).map(function (t) {
      return { t: t, reason: protectedReason(t, today, pm), q: L.quadrant(t, today), min: L.duration(t) };
    });
    out.others = cands.filter(function (c) { return c.reason; });
    var allowed = cands.filter(function (c) { return !c.reason; }).sort(function (a, b2) {
      if (a.q !== b2.q) return b2.q - a.q; // ô 4 thấp nhất trước
      var da = a.t.due_date || '9999-12-31', db = b2.t.due_date || '9999-12-31';
      if (da !== db) return da < db ? 1 : -1; // hạn chót xa nhất trước
      return b2.min - a.min;
    });
    out.push = []; var freed = 0;
    if (out.need > 0) allowed.forEach(function (c) { if (freed < out.need) { out.push.push(c); freed += c.min; } });
    out.freed = freed;
    out.todayOk = !out.big && (out.need === 0 || freed >= out.need);
    out.allowed = allowed;
    // Ngày làm việc gần nhất còn đủ quỹ và trước hạn chót
    out.day = '';
    if (!out.big) {
      var limit = D.isValid(nt.due_date) ? nt.due_date : '';
      for (var d = nd, i = 0; i < 21; d = nextWorkday(d), i++) {
        if (limit && d > limit) break;
        var l2 = load(state, d), b2 = l2.by[bucketOf(nt, goals, d)];
        if (b2 && b2.avail - b2.planned >= dur) { out.day = d; break; }
      }
    }
    return out;
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
    var avg = days ? Math.round(sum / days) : 0, net = workNet(s, pinnedTemplates(state).reduce(function (a, t) { return a + L.duration(t); }, 0));
    var pct = net ? Math.min(80, Math.round(avg / net * 100 / 5) * 5) : 0;
    return { from: from, sum: sum, count: n, days: days, avg: avg, suggestPct: pct, currentPct: Math.round(num(s.buffer_pct, 30)), net: net };
  }

  function newInterruption(fields) {
    return Object.assign({ id: App.util.uuid(), date: D.today(), title: '', duration_min: '30', created_at: App.util.now() }, fields || {});
  }

  return {
    DEFAULTS: DEFAULTS, BUCKETS: BUCKETS, TIER_LABELS: TIER_LABELS, minutes: minutes, settings: settings, workNet: workNet, workBudget: workBudget,
    isFixed: isFixed, nextWorkday: nextWorkday, balance: balance, protectedReason: protectedReason, pinnedOf: pinnedOf, pinnedTemplates: pinnedTemplates, schedule: schedule, isWeekend: isWeekend, caps: caps, bucketOf: bucketOf, goalsMap: goalsMap, interruptions: interruptions, load: load, ordered: ordered,
    overflow: overflow, reasons: reasons, tier: tier, suggest: suggest, rolloverRows: rolloverRows, toInbox: toInbox, fit: fit,
    interruptionStats: interruptionStats, newInterruption: newInterruption
  };
})();

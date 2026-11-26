/* V2 · Phần 1: màn Agenda (route `agenda`). Dữ liệu và logic lấy qua LP.logic.routines, LP.logic.tasks, LP.stats.
   Hai chế độ: Checklist và Toàn cảnh (dòng thời gian). Ngày đã qua chỉ xem.
   Soát cuối ngày nằm ở soat.js, mở bằng #/agenda?soat=1 (route `soat` chưa có trong config.ROUTES, xem YEU-CAU-CHUNG).
   Hàm tạm viết trong file này có tiền tố tam_. */
var LP = window.LP || (window.LP = {});

LP.agenda = (function () {
  var D = LP.date, esc = LP.ui.esc, icon = LP.ui.icon, num = LP.util.num, truthy = LP.util.truthy;
  var R = LP.logic.routines, T = LP.logic.tasks, ST = LP.stats;
  var MODE_KEY = 'lpv2_ag_mode', ORDER_KEY = 'lpv2_ag_order';
  var MORE = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="19" cy="12" r="1.7" fill="currentColor"/></svg>';
  var notified = {};
  var st = null, sub = '';   // sub: '' | 'soat' | 'ton' (màn con mở bằng tham số của route agenda)

  function lsGet(k, def) { try { var v = localStorage.getItem(k); return v == null ? def : v; } catch (e) { return def; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } }
  function S() { return LP.store.get(); }
  function readOnly() { return st.date < D.today(); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dateLabel(d) { return D.weekdayName(d) + ', ' + D.fmtFull(d); }
  function pill(t, k) { return LP.ui.pill(t, k); }

  /* ---------- Trạng thái theo giờ (chỉ hôm nay) ---------- */
  // Trễ: quá giờ. Đến giờ: còn không quá 15 phút nữa là tới giờ.
  function timeState(time, done) {
    if (!st || st.date !== D.today() || done || !time) return {};
    var t = D.timeToMin(time), n = D.timeToMin(D.now());
    if (t == null) return {};
    if (n > t) return { late: n - t };
    if (t - n <= 15) return { due: true };
    return {};
  }
  function lateText(n) { return 'Trễ ' + (n < 60 ? n + ' phút' : D.fmtMin(n)); }
  function statePill(s) {
    if (s.late != null) return pill(lateText(s.late), 'late');
    if (s.due) return '<span class="pill ag-pill-due">Đến giờ</span>';
    return '';
  }
  function stateCls(s) { return s.late != null ? ' is-late' : s.due ? ' is-due' : ''; }

  /* ---------- Khóa và "Từ hôm qua" (giữ lại mục vừa tick để còn bỏ tick được) ---------- */
  function entryKey(e) { return e.kind === 'item' ? 'i|' + e.routineId + '|' + e.itemId + '|' + e.runDate : 't|' + e.taskId; }

  function tam_overdueStep(task, from) {
    return T.stepsOf(task.id).filter(function (s) { return s.status !== 'done' && s.do_date && s.do_date === from; })[0] || null;
  }

  // Làm giàu một mục tồn bằng dữ liệu hiện tại. Trả null nếu mục không còn thuộc khối tồn (đã đặt vào hôm nay, bỏ qua...).
  function decorate(e) {
    var k = entryKey(e), o = { key: k, e: e, kind: e.kind, source: e.source, title: e.title, parent: '', done: false, setTime: '', origTime: '', from: '', label: e.label };
    if (e.kind === 'item') {
      var c = R.checkOf(e.routineId, e.itemId, e.runDate);
      if (c && c.status === 'skipped') return null;
      if (e.source !== 'plus1' && !(c && (c.status === 'carried' || c.status === 'done'))) return null;   // đã trả về tồn chưa xử lý (bỏ giờ)
      var it = LP.store.find('RoutineItems', e.itemId);
      o.done = !!c && c.status === 'done';
      o.setTime = e.setTime || '';
      o.origTime = it ? it.time || '' : '';
      o.from = e.since || e.runDate;
      if (c && c.status === 'carried' && e.source === 'missed') o.source = 'carried';
      return o;
    }
    var t = LP.store.find('Tasks', e.taskId);
    if (!t || t.status === 'cancelled') return null;
    if (st.stepOf[k] === undefined) { var sp0 = tam_overdueStep(t, e.fromDate); st.stepOf[k] = sp0 ? sp0.id : ''; }
    var sp = st.stepOf[k] ? LP.store.find('TaskSteps', st.stepOf[k]) : null;
    o.done = sp ? sp.status === 'done' : t.status === 'done';
    if (!o.done) {
      var f = sp ? sp.do_date : T.nextDo(t);
      if (f && f >= st.date) return null; // đã được xếp vào hôm nay hoặc sau đó: sang "Việc hôm nay"
    }
    o.title = sp ? sp.title : t.title;
    o.parent = sp ? t.title : '';
    o.from = e.fromDate;
    o.label = 'tồn từ ' + D.fmt(e.fromDate);
    o.task = t; o.step = sp;
    return o;
  }

  // Mục ĐÃ QUYẾT làm hôm nay: +1 của lượt trước, đã "Mang sang mai", hoặc đã xếp giờ. Giữ lại mục vừa tick để còn bỏ tick được.
  function leftEntries() {
    if (!D.isWorkday(st.date)) return [];   // ngày nghỉ / Chủ nhật: mục đã quyết chờ tới ngày làm việc kế tiếp
    R.leftovers(st.date, { all: true, decided: true, withDone: true }).forEach(function (e) {
      var k = entryKey(e);
      if (!st.snapMap[k]) st.snapOrder.push(k);
      st.snapMap[k] = e;
    });
    var out = [];
    st.snapOrder.forEach(function (k) { var d = decorate(st.snapMap[k]); if (d) out.push(d); });
    return out;
  }

  /* ---------- Thành phần nhỏ ---------- */
  function tickBtn(act, attrs, done, label, fk) {
    return '<button type="button" class="tick" data-act="' + act + '" ' + attrs + ' data-fk="' + esc(fk) + '" aria-pressed="' + (done ? 'true' : 'false') +
      '" aria-label="' + esc((done ? 'Bỏ tick: ' : 'Đánh dấu xong: ') + label) + '"' + (readOnly() ? ' disabled' : '') + '><span class="dot">' + (done ? icon('check') : '') + '</span></button>';
  }
  function barHtml(done, total) {
    var pct = total ? Math.round(done * 100 / total) : 0, cls = pct >= 100 ? 'b-ok' : pct >= 80 ? 'b-pr' : 'b-warn';
    return '<div class="bar14" role="img" aria-label="' + done + ' trên ' + total + '">' + (pct ? '<span class="' + cls + '" style="width:' + pct + '%"></span>' : '') + '</div>';
  }
  function srcPill(o) {
    if (o.source === 'plus1') {
      var s = timeState(o.setTime || o.origTime, o.done);
      return s.late != null ? pill(lateText(s.late), 'late') : pill('Chưa xong', 'undone');
    }
    if (o.source === 'missed') return pill('Bỏ sót', 'missed');
    return pill('Chưa xong', 'undone');
  }
  function entrySub(o) {
    var parts = [];
    if (o.parent) parts.push('Ad-hoc: ' + o.parent);
    parts.push(o.label);
    if (o.kind === 'item' && o.source !== 'plus1') parts.push('tồn từ ' + D.fmt(o.from));
    if (o.kind === 'item' && o.origTime) parts.push('giờ gốc ' + o.origTime);
    if (o.setTime) parts.push('đã xếp ' + o.setTime);
    return parts.join(' · ');
  }

  /* Hình khung chào theo buổi (nét như App.views.sun của web cũ, màu cố định) */
  function helloArt(h) {
    var sun = '<g stroke="#f2a33a" stroke-width="6" stroke-linecap="round"><path d="M60 8v12M60 100v12M8 60h12M100 60h12M23 23l8 8M89 89l8 8M23 97l8-8M89 31l8-8"/></g>' +
      '<circle cx="60" cy="60" r="28" fill="#ffd56b" stroke="#f2a33a" stroke-width="4"/>' +
      '<circle cx="51" cy="57" r="3.4" fill="#3b2235"/><circle cx="69" cy="57" r="3.4" fill="#3b2235"/>' +
      '<path d="M52 67q8 7 16 0" stroke="#3b2235" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="45" cy="66" r="4" fill="#ff9fb8" opacity=".8"/><circle cx="75" cy="66" r="4" fill="#ff9fb8" opacity=".8"/>';
    var body;
    if (h >= 18) {
      body = '<path d="M72 22a38 38 0 1 0 28 62 32 32 0 0 1-28-62z" fill="#ffe9a6" stroke="#f2c14e" stroke-width="4" stroke-linejoin="round"/>' +
        '<circle cx="62" cy="60" r="2.8" fill="#3b2235"/><path d="M52 70q7 6 14 0" stroke="#3b2235" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<circle cx="50" cy="68" r="3.6" fill="#ff9fb8" opacity=".8"/>' +
        '<g fill="#ffd56b" stroke="#f2a33a" stroke-width="2" stroke-linejoin="round"><path d="M100 22l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6-4.4-4.2 6-.8z"/>' +
        '<path d="M22 30l1.8 3.8 4.2.6-3 2.9.7 4.1-3.7-2-3.7 2 .7-4.1-3-2.9 4.2-.6z"/><path d="M96 92l1.6 3.4 3.8.5-2.7 2.6.6 3.7-3.3-1.8-3.3 1.8.6-3.7-2.7-2.6 3.8-.5z"/></g>';
    } else {
      body = sun;
      if (h >= 13) body += '<g fill="#fff" stroke="#bfe3f5" stroke-width="3" stroke-linejoin="round"><path d="M70 100a12 12 0 0 1 2-23 16 16 0 0 1 30 4 10 10 0 0 1-2 19z"/></g>';
    }
    return '<svg class="ag-sun" width="76" height="76" viewBox="0 0 120 120" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  /* ---------- Đầu trang ---------- */
  function headHtml(extra) {
    var d = st.date, t = D.today(), pills = '';
    if (d < t) pills += pill('Đã qua · chỉ xem', 'plain'); else if (d > t) pills += pill('Sắp tới', 'note');
    if (D.isDayOff(d)) pills += pill('Ngày nghỉ', 'missed'); else if (D.dow(d) === 7) pills += pill('Chủ nhật', 'plain');
    var tools = '';
    if (d !== t) tools += '<button type="button" class="chip" data-act="today">Về hôm nay</button>';
    if (!readOnly()) tools += '<button type="button" class="btn btn-soft" data-act="off">' + icon('calendar', 'ic18') + (D.isDayOff(d) ? 'Bỏ đánh dấu ngày nghỉ' : 'Đánh dấu ngày nghỉ') + '</button>';
    var h = parseInt(D.now().slice(0, 2), 10);
    var hello = d !== t ? 'Agenda' : h < 11 ? 'Chào buổi sáng!' : h < 13 ? 'Chào buổi trưa!' : h < 18 ? 'Chào buổi chiều!' : 'Chào buổi tối!';
    var rel = d === t ? 'Hôm nay' : d === D.add(t, -1) ? 'Hôm qua' : d === D.add(t, 1) ? 'Ngày mai' : d < t ? 'Ngày đã qua' : 'Ngày sắp tới';
    var fl = LP.flowers.html;
    return '<div class="ag-head"><section class="ag-hello" aria-label="Chào">' + helloArt(d === t ? h : 8) + fl('daisy', 44, 2, 'ag-hello-f1') + fl('sakura', 26, 8, 'ag-hello-f2') +
      '<h1>' + hello + '</h1><div class="ag-date" role="group" aria-label="Chọn ngày xem">' +
      '<button type="button" class="ag-daybtn" data-act="prev" aria-label="Ngày trước">' + icon('back', 'ic18') + '</button>' +
      '<span class="ag-daypick"><span class="ag-dayrel">' + rel + '</span><span class="ag-daylabel">' + esc(dateLabel(d)) + '</span></span>' +
      '<button type="button" class="ag-daybtn" data-act="next" aria-label="Ngày sau">' + icon('back', 'ic18 ag-flip') + '</button></div></section>' +
      '<div class="ag-side">' + (pills || tools ? '<div class="ag-sub"><div class="ag-pills">' + pills + '</div><div class="ag-tools">' + tools + '</div></div>' : '') + (extra || '') + '</div></div>';
  }

  /* ---------- Dải 3 biểu đồ ---------- */
  function ringHtml(done, total) {
    var pct = total ? Math.round(done * 100 / total) : null, C = 2 * Math.PI * 41, lvl = ST.level(pct);
    var fg = pct ? '<circle class="fg s-' + lvl + '" cx="52" cy="52" r="41" stroke-dasharray="' + (C * pct / 100).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 52 52)"/>' : '';
    return '<svg class="ag-ring" viewBox="0 0 104 104" role="img" aria-label="Hoàn thành ' + done + ' trên ' + total + '"><circle class="tr" cx="52" cy="52" r="41"/>' + fg +
      '<text class="big" x="52" y="55">' + (total ? done + '/' + total : '–') + '</text><text class="small" x="52" y="72">' + (pct == null ? 'không có lượt' : pct + '%') + '</text></svg>';
  }
  function sixDays() {
    var end = D.isWorkday(st.date) ? st.date : D.prevWorkday(st.date), days = [end], today = D.today();
    for (var i = 0; i < 5; i++) days.unshift(D.prevWorkday(days[0]));
    return days.map(function (d) {
      var pct = null;
      if (d < today) pct = ST.completion(d, d, 'day')[0].pct;
      else if (d === today) { var s = R.summary(d), t = ST.taskCounts(d), den = s.total - s.skipped + t.total; pct = den ? Math.round((s.done + t.done) * 100 / den) : null; }
      return { d: d, pct: pct, now: d >= today };
    });
  }
  function chartsHtml(cards, tasks) {
    var done = 0, total = 0;
    // Vòng đếm luồng hôm nay: hạng mục cố định + mục đã quyết làm hôm nay (T+1, mang sang) + việc. Không đếm mục sót chưa quyết.
    cards.forEach(function (c) { done += c.done; total += c.total; });
    tasks.forEach(function (x) { total++; if (x.done) done++; });
    var cap = T.capacity(st.date), ev = cap.evening;
    var facts = '<div class="ag-fact' + (ev.over ? ' is-over' : '') + '"><b>Quỹ Personal</b><span class="num">' + D.fmtMin(ev.used) + ' / ' + D.fmtMin(ev.quota) + '</span>' + (ev.over ? ' vượt quỹ' : '') + '</div>' +
      '<div class="ag-fact"><b>Giờ chen ngang</b><span class="num">' + D.fmtMin(cap.interruptionMin) + '</span></div>';
    var blocks = '';
    function blk(name, d, t) { blocks += '<div class="ag-blk"><span class="ag-blk-name">' + esc(name) + '</span><span class="num">' + d + '/' + t + '</span>' + barHtml(d, t) + '</div>'; }
    cards.forEach(function (c) { blk(c.routine.name, c.done, c.total); });
    var ad = tasks.filter(function (x) { return x.task.kind !== 'canhan'; }), cn = tasks.filter(function (x) { return x.task.kind === 'canhan'; });
    function dn(l) { return l.filter(function (x) { return x.done; }).length; }
    if (ad.length) blk('Ad-hoc hôm nay', dn(ad), ad.length);
    if (cn.length) blk('Personal hôm nay', dn(cn), cn.length);
    if (!blocks) blocks = '<p class="ag-empty">Hôm nay chưa có khối nào.</p>';
    var cols = sixDays().map(function (x) {
      var h = x.pct == null ? 0 : Math.max(4, Math.round(x.pct * 0.8)); // 80px = 100%
      var cls = x.pct == null ? 'is-none' : x.now ? 'is-now' : x.pct >= 100 ? 'b-ok' : x.pct >= 80 ? 'b-pr' : 'b-warn';
      return '<div class="ag-col" aria-label="' + D.fmt(x.d) + ': ' + (x.pct == null ? 'không có số liệu' : x.pct + '%') + '"><span class="ag-col-val num">' + (x.pct == null ? '–' : x.pct + '%') + '</span>' +
        '<span class="ag-col-bar ' + cls + '" style="height:' + (x.pct == null ? 3 : h) + 'px"></span>' +
        '<span class="ag-col-lbl' + (x.now ? ' is-now' : '') + '">' + D.weekdayShort(x.d) + '<br>' + D.fmt(x.d) + '</span></div>';
    }).join('');
    return '<div class="ag-charts">' +
      '<section class="card ag-chart" aria-label="Hoàn thành hôm nay"><h2>Hoàn thành ' + (st.date === D.today() ? 'hôm nay' : D.fmt(st.date)) + '</h2><div class="ag-ring-wrap">' + ringHtml(done, total) + '<div class="ag-facts">' + facts + '</div></div></section>' +
      '<section class="card ag-chart" aria-label="Tiến độ theo khối"><h2>Tiến độ theo khối</h2>' + blocks + '</section>' +
      '<section class="card ag-chart" aria-label="6 ngày làm việc gần nhất"><h2>6 ngày làm việc gần nhất</h2><div class="ag-cols">' + cols + '</div></section></div>';
  }

  function switchHtml() {
    var m = st.mode;
    var h = '<div class="ag-bar-top"><div class="ag-switch" role="group" aria-label="Chế độ xem">' +
      '<button type="button" class="chip' + (m === 'checklist' ? ' is-on' : '') + '" data-act="mode" data-mode="checklist" aria-pressed="' + (m === 'checklist') + '">' + icon('list', 'ic18') + 'Checklist</button>' +
      '<button type="button" class="chip' + (m === 'overview' ? ' is-on' : '') + '" data-act="mode" data-mode="overview" aria-pressed="' + (m === 'overview') + '">' + icon('clock', 'ic18') + 'Toàn cảnh</button></div>';
    if (m === 'overview') {
      h += '<div class="ag-switch" role="group" aria-label="Thứ tự">' +
        '<button type="button" class="chip' + (st.order === 'asc' ? ' is-on' : '') + '" data-act="order" data-order="asc" aria-pressed="' + (st.order === 'asc') + '">Sớm → muộn</button>' +
        '<button type="button" class="chip' + (st.order === 'desc' ? ' is-on' : '') + '" data-act="order" data-order="desc" aria-pressed="' + (st.order === 'desc') + '">Muộn → sớm</button></div>';
    }
    return h + '</div>';
  }

  /* ---------- Checklist ---------- */
  // Hạng mục xếp theo giờ. Hạng mục không giờ giữ vị trí trong mẫu (đi theo hạng mục có giờ đứng trước nó)
  function sortedItems(items) {
    var carry = -1;
    var keyed = items.map(function (m, i) { var t = D.timeToMin(m.time); if (t != null) carry = t; return { m: m, k: t != null ? t : carry, i: i }; });
    keyed.sort(function (a, b) { return a.k - b.k || a.i - b.i; });
    return keyed.map(function (x) { return x.m; });
  }
  // Các "đơn vị" của một thẻ: hạng mục của lượt hôm nay + mục đã quyết làm hôm nay (nhãn "Tồn từ")
  function buildCards(runs, decided) {
    var byR = {}, list = [];
    runs.forEach(function (run, i) { var c = { routine: run.routine, run: run, own: run.items, ton: [], idx: i, fake: false }; byR[run.routine.id] = c; list.push(c); });
    decided.forEach(function (o) {
      if (o.kind !== 'item') return;
      var rid = o.e.routineId, c = byR[rid];
      if (!c) {
        var r = R.byId(rid); if (!r) return;
        c = { routine: r, run: { routine: r, runDate: st.date, items: [], total: 0, done: 0, remainDays: null }, own: [], ton: [], idx: list.length, fake: true };
        byR[rid] = c; list.push(c);
      }
      c.ton.push(o);
    });
    list.forEach(function (c) {
      c.total = c.own.length + c.ton.length;
      c.done = c.own.filter(function (m) { return m.done; }).length + c.ton.filter(function (o) { return o.done; }).length;
    });
    return list;
  }
  function unitsOf(c) {
    var u = [];
    c.own.forEach(function (m) { u.push({ time: m.time, done: m.done, m: m }); });
    c.ton.forEach(function (o) { u.push({ time: o.setTime || o.origTime, done: o.done, o: o }); });
    return u;
  }
  function runInfo(c) {
    var items = sortedItems(unitsOf(c)), first = items.filter(function (u) { return !u.done; })[0], last = '';
    function seen(ck) { if (ck && ck.done_at) { var t = ck.done_at.slice(11, 16); if (t > last) last = t; } }
    c.own.forEach(function (m) { if (m.done) seen(m.check); });
    c.ton.forEach(function (o) { if (o.done) seen(R.checkOf(o.e.routineId, o.e.itemId, o.e.runDate)); });
    var fin = c.total > 0 && c.done === c.total;
    var tm = first ? D.timeToMin(first.time) : null;
    return { c: c, run: c.run, items: items, fin: fin, last: last, idx: c.idx, key: fin ? 99999 : tm == null ? 1440 : tm };
  }
  function tomorrowLine(run) {
    var its = R.itemsOf(run.routine, run.runDate).filter(function (it) { return (parseInt(it.day_offset, 10) || 0) > 0; });
    if (!its.length) return '';
    var nd = D.addWorkdays(run.runDate, 1), lbl = nd === D.add(run.runDate, 1) ? 'Ngày mai' : D.weekdayName(nd);
    return its.map(function (it) { return lbl + (it.time ? ' ' + it.time : '') + ' · ' + it.title; }).join('  |  ');
  }
  function itemRow(run, m) {
    var s = timeState(m.time, m.done), r = run.routine;
    var doneAt = m.done && m.check && m.check.done_at ? 'xong lúc ' + m.check.done_at.slice(11, 16) : '';
    var sub = [m.item.note, doneAt].filter(Boolean).join(' · ');
    var link = m.item.link ? '<a class="ag-link" href="' + esc(m.item.link) + '" target="_blank" rel="noopener" aria-label="Mở liên kết: ' + esc(m.item.title) + '">' + icon('doc', 'ic18') + '</a>' : '';
    return '<li class="ag-item' + (m.done ? ' is-done' : '') + stateCls(s) + '">' +
      tickBtn('tick-item', 'data-r="' + esc(r.id) + '" data-i="' + esc(m.item.id) + '" data-d="' + esc(m.runDate) + '"', m.done, m.item.title, 'i|' + r.id + '|' + m.item.id) +
      '<span class="ag-time num">' + esc(m.time || '') + '</span>' +
      '<div class="ag-main"><div class="ag-title">' + esc(m.item.title) + '</div>' + (sub ? '<div class="ag-sub">' + esc(sub) + '</div>' : '') + '</div>' +
      '<div class="ag-aside">' + statePill(s) + link + '</div></li>';
  }
  function docLink(r) {
    return r.doc_id ? '<button type="button" class="chip" data-act="doc" data-doc="' + esc(r.doc_id) + '" data-head="' + esc(r.heading_id || '') + '">' + icon('note', 'ic18') + 'Ghi chú</button>' : '';
  }
  function runCard(ri) {
    var r = ri.c.routine, run = ri.run;
    if (ri.fin && !st.open[r.id]) {
      return '<button type="button" class="card ag-run-done" data-act="expand" data-run="' + esc(r.id) + '" aria-expanded="false">' + icon('check', 'ic18') +
        '<span class="txt">' + esc(r.name) + ' · xong' + (ri.last ? ' lúc ' + esc(ri.last) : '') + '</span>' +
        '<span class="flowers" aria-hidden="true">' + LP.flowers.html('sakura', 20, 1) + LP.flowers.html('daisy', 18, 4, 'overlap') + '</span></button>';
    }
    var tl = ri.c.fake ? '' : tomorrowLine(run);
    return '<section class="card ag-run' + (ri.fin ? ' is-done' : '') + '" aria-label="' + esc(r.name) + '">' +
      '<div class="ag-sec-head"><h2>' + esc(r.name) + '</h2>' + LP.ui.importance(r.importance) +
      (run.remainDays != null ? pill('còn ' + run.remainDays + ' ngày', 'note') : '') +
      '<span class="num">' + ri.c.done + '/' + ri.c.total + '</span>' + docLink(r) +
      (ri.fin ? '<button type="button" class="icon-btn" data-act="collapse" data-run="' + esc(r.id) + '" aria-label="Thu gọn">' + icon('up') + '</button>' : '') + '</div>' +
      '<ul class="ag-ul">' + ri.items.map(function (u) { return u.m ? itemRow(run, u.m) : tonRow(u.o); }).join('') + '</ul>' +
      (tl ? '<p class="ag-run-foot">' + esc(tl) + '</p>' : '') + '</section>';
  }
  // Mục đã quyết làm hôm nay, nằm trong khối của nó, đúng giờ (hoặc giờ đã đặt), kèm nhãn nhỏ "Tồn từ dd/mm"
  function tonRow(o) {
    var t = o.setTime || o.origTime, s = timeState(t, o.done);
    return '<li class="ag-item' + (o.done ? ' is-done' : '') + stateCls(s) + '">' + tickBtn('tick-left', 'data-key="' + esc(o.key) + '"', o.done, o.title, o.key) +
      '<span class="ag-time num">' + esc(t || '') + '</span>' +
      '<div class="ag-main"><div class="ag-title">' + esc(o.title) + '</div>' + (o.setTime ? '<div class="ag-sub">đã xếp ' + esc(o.setTime) + '</div>' : '') + '</div>' +
      '<div class="ag-aside">' + pill('Tồn từ ' + D.fmt(o.from), 'note') + (o.done ? '' : statePill(s) + skipBtn(o)) + '</div></li>';
  }
  function skipBtn(o) {
    if (readOnly()) return '';
    return '<button type="button" class="chip" data-act="' + (o.kind === 'item' ? 'skip-left' : 'cancel-left') + '" data-key="' + esc(o.key) + '">' + (o.kind === 'item' ? 'Bỏ qua' : 'Hủy việc') + '</button>';
  }
  function taskInfoSub(x) {
    var t = x.task, parts = [];
    if (x.step) parts.push((t.kind === 'canhan' ? 'Personal: ' : 'Ad-hoc: ') + t.title);
    if (t.requester) parts.push('Người đặt: ' + t.requester);
    if (t.due_date) parts.push('Hạn ' + D.fmt(t.due_date) + (t.due_time ? ' ' + t.due_time : ''));
    var p = T.progress(t);
    if (p.hasSteps) parts.push('bước ' + p.done + '/' + p.total);
    return parts.join(' · ');
  }
  function tonFlag(t) { return t.carried_from && t.carried_from < st.date ? pill('Tồn từ ' + D.fmt(t.carried_from), 'note') : ''; }
  function taskRow(x) {
    var t = x.task, s = timeState(x.time, x.done), id = t.id, sid = x.step ? x.step.id : '';
    var attrs = 'data-task="' + esc(id) + '" data-step="' + esc(sid) + '"';
    return '<li class="ag-item' + (x.done ? ' is-done' : '') + stateCls(s) + '">' + tickBtn('tick-task', attrs, x.done, x.title, 't|' + id + '|' + sid) +
      (x.time ? '<span class="ag-time num">' + esc(x.time) + '</span>' : '') +
      '<div class="ag-main"><div class="ag-title">' + esc(x.title) + '</div><div class="ag-sub">' + esc(taskInfoSub(x)) + '</div></div>' +
      '<div class="ag-aside">' + tonFlag(t) + statePill(s) + LP.ui.importance(t.importance) + LP.ui.urgency(T.urgency(t, st.date)) +
      (readOnly() ? '' : '<button type="button" class="icon-btn ag-more" data-act="more" ' + attrs + ' aria-label="Thêm tùy chọn: ' + esc(x.title) + '">' + MORE + '</button>') + '</div></li>';
  }
  function habitsDue() {
    return S().habits.filter(function (h) { return truthy(h.active) && ST.habitDue(h, st.date); })
      .sort(function (a, b) { return (a.time || '99:99') < (b.time || '99:99') ? -1 : 1; });
  }
  function habitChip(h) {
    var on = ST.habitDone(h, st.date), n = ST.streak(h, st.date);
    return '<button type="button" class="chip' + (on ? ' is-on' : '') + '" data-act="tick-habit" data-h="' + esc(h.id) + '" data-fk="h|' + esc(h.id) + '" aria-pressed="' + on + '"' + (readOnly() ? ' disabled' : '') + '>' +
      (n > 0 ? '<span class="ag-streak" title="Chuỗi ' + n + ' ngày">' + icon('flame', 'ic18') + '<span class="num">' + n + '</span></span>' : '') +
      esc(h.name) + (h.time ? ' <span class="muted num">' + esc(h.time) + '</span>' : '') + '</button>';
  }

  // Dòng mảnh ở đầu trang: mục SÓT CHƯA QUYẾT (không giới hạn ngày). Không có thì ẩn.
  function pendingLine() {
    if (readOnly()) return '';
    var n = R.leftovers(D.today(), { all: true, pending: true }).length;   // luôn tính theo hôm nay, khớp Soát và Tồn tổng
    if (n <= 0) return '';
    return '<div class="ag-pending"><span><b class="num">' + n + '</b> mục tồn chưa xử lý</span><button type="button" class="chip" data-act="ton">Xử lý</button></div>';
  }

  function taskSection(title, list, empty) {
    return '<section class="card ag-tasks" aria-label="' + esc(title) + '"><div class="ag-sec-head"><h2>' + esc(title) + '</h2>' +
      (list.length ? '<span class="num">' + list.filter(function (x) { return x.done; }).length + '/' + list.length + '</span>' : '') + '</div>' +
      (list.length ? '<ul class="ag-ul">' + list.map(taskRow).join('') + '</ul>' : '<p class="ag-empty">' + empty + '</p>') + '</section>';
  }

  function checklistHtml(cards, tasks, habits) {
    var h = '<div class="ag-list">';
    var infos = cards.map(runInfo).sort(function (a, b) { return a.key - b.key || a.idx - b.idx; });
    h += '<div class="ag-runs">' + (infos.length ? infos.map(runCard).join('') :
      '<section class="card"><h2>Daily</h2><p class="ag-empty">' + (D.isWorkday(st.date) ? 'Hôm nay không có lượt Daily nào.' : 'Ngày nghỉ, không có lượt Daily.') + '</p></section>') + '</div>';
    var ad = tasks.filter(function (x) { return x.task.kind !== 'canhan'; }), cn = tasks.filter(function (x) { return x.task.kind === 'canhan'; });
    if (ad.length) h += taskSection('Ad-hoc hôm nay', ad, '');
    if (cn.length) h += taskSection('Personal hôm nay', cn, '');
    if (!tasks.length) h += taskSection('Ad-hoc / Personal ' + (st.date === D.today() ? 'hôm nay' : D.fmt(st.date)), [], 'Không có việc nào có ngày làm là hôm nay.');
    h += '<section class="card ag-habits" aria-label="Thói quen"><div class="ag-sec-head"><h2>Thói quen</h2></div>' +
      (habits.length ? '<div class="chips">' + habits.map(habitChip).join('') + '</div>' : '<p class="ag-empty">Không có thói quen nào hôm nay.</p>') + '</section>';
    if (st.date === D.today()) h += '<div class="ag-foot"><button type="button" class="btn btn-primary" data-act="soat">' + icon('moon', 'ic18') + 'Soát cuối ngày</button></div>';
    return h + '</div>';
  }

  /* ---------- Toàn cảnh ---------- */
  function placeBox(forKey, attrs) {
    if (readOnly()) return '';
    return '<div class="ag-place"><input type="time" class="input" data-for="' + esc(forKey) + '" aria-label="Chọn giờ"><button type="button" class="btn btn-soft" data-act="place" data-for="' + esc(forKey) + '" ' + attrs + '>Đặt giờ</button></div>';
  }
  function tlRow(r) {
    var s = r.state || {};
    var status = r.done ? pill('Xong', 'ok') : s.late != null ? pill(lateText(s.late), 'late') : s.due ? '<span class="pill ag-pill-due">Đến giờ</span>' : pill('Chưa làm', 'undone');
    return '<div class="ag-tl-row' + (r.done ? ' is-done' : '') + stateCls(s) + '">' +
      '<div class="ag-c-time num' + (r.est ? ' is-est' : '') + '">' + (r.time ? (r.est ? '~' : '') + esc(r.time) : '') + '</div>' +
      '<div class="ag-c-main">' + r.tick + '<div class="ag-main"><div class="ag-title">' + esc(r.title) + (r.flag ? ' ' + r.flag : '') + '</div>' + (r.sub ? '<div class="ag-sub">' + esc(r.sub) + '</div>' : '') + '</div></div>' +
      '<div class="ag-c-meta"><span class="ag-c-belong">' + esc(r.belong || '') + '</span><span class="ag-c-level">' + (r.hearts || '') + (r.urg || '') + '</span><span class="ag-c-due">' + esc(r.due || '') + '</span></div>' +
      '<div class="ag-c-status">' + status + '</div>' + (r.extra ? '<div class="ag-c-place">' + r.extra + '</div>' : '') + '</div>';
  }
  function segOf(min) { return min < 720 ? 'SÁNG' : min <= 1050 ? 'CHIỀU' : 'TỐI'; }

  function overviewHtml(cards, tasks, habits) {
    var rows = [], undated = [], ro = readOnly(), seq = 0;
    // Hạng mục của lượt hôm nay + mục đã quyết làm hôm nay (nhãn "Tồn từ dd/mm", đúng giờ hoặc giờ đã đặt)
    cards.forEach(function (c) {
      var prevMin = null, prevEst = 15, r = c.routine;
      c.own.forEach(function (m) {
        var own = D.timeToMin(m.time), min = own, est = false;
        if (own == null && prevMin != null) { min = prevMin + prevEst; est = true; }
        if (min != null) prevMin = min;
        prevEst = num(m.item.est_min) || 15;
        var row = {
          t: min, time: min == null ? '' : D.minToTime(min), est: est, done: m.done, state: timeState(m.time, m.done), title: m.item.title, sub: m.item.note || '',
          belong: r.name, hearts: LP.ui.importance(r.importance), due: r.done_before ? 'trước ' + r.done_before : '',
          tick: tickBtn('tick-item', 'data-r="' + esc(r.id) + '" data-i="' + esc(m.item.id) + '" data-d="' + esc(m.runDate) + '"', m.done, m.item.title, 'i|' + r.id + '|' + m.item.id)
        };
        if (min == null) undated.push(row); else { row.i = seq++; rows.push(row); }
      });
      c.ton.forEach(function (o) {
        var t = o.setTime || o.origTime, min = D.timeToMin(t);
        var row = {
          t: min, time: t || '', done: o.done, state: timeState(t, o.done), title: o.title, flag: pill('Tồn từ ' + D.fmt(o.from), 'note'), sub: '',
          belong: r.name, hearts: LP.ui.importance(r.importance), due: '',
          tick: tickBtn('tick-left', 'data-key="' + esc(o.key) + '"', o.done, o.title, o.key),
          extra: o.done || ro ? '' : (o.setTime ? '<button type="button" class="btn btn-soft" data-act="unplace" data-key="' + esc(o.key) + '">Bỏ giờ</button> ' : '') + skipBtn(o)
        };
        if (min == null) undated.push(row); else { row.i = seq++; rows.push(row); }
      });
    });
    // Việc
    tasks.forEach(function (x) {
      var t = x.task, sid = x.step ? x.step.id : '', attrs = 'data-task="' + esc(t.id) + '" data-step="' + esc(sid) + '"';
      var row = {
        t: D.timeToMin(x.time), time: x.time || '', done: x.done, state: timeState(x.time, x.done), title: x.title,
        flag: tonFlag(t), sub: x.step ? (t.kind === 'canhan' ? 'Personal: ' : 'Ad-hoc: ') + t.title : (t.requester ? 'Người đặt: ' + t.requester : ''),
        belong: t.kind === 'canhan' ? 'Personal' : 'Ad-hoc', hearts: LP.ui.importance(t.importance), urg: LP.ui.urgency(T.urgency(t, st.date)),
        due: t.due_date ? 'Hạn ' + D.fmt(t.due_date) + (t.due_time ? ' ' + t.due_time : '') : '',
        tick: tickBtn('tick-task', attrs, x.done, x.title, 't|' + t.id + '|' + sid)
      };
      if (x.time) { row.extra = x.done || ro ? '' : '<button type="button" class="btn btn-soft" data-act="unplace-task" ' + attrs + '>Bỏ giờ</button>'; row.i = seq++; rows.push(row); }
      else { row.extra = x.done ? '' : placeBox('t|' + t.id + '|' + sid, attrs); undated.push(row); }
    });
    // Thói quen
    habits.forEach(function (hb) {
      var on = ST.habitDone(hb, st.date), n = ST.streak(hb, st.date);
      var tick = '<button type="button" class="tick" data-act="tick-habit" data-h="' + esc(hb.id) + '" data-fk="h|' + esc(hb.id) + '" aria-pressed="' + on + '" aria-label="' + esc((on ? 'Bỏ tick: ' : 'Đánh dấu xong: ') + hb.name) + '"' + (ro ? ' disabled' : '') + '><span class="dot">' + (on ? icon('check') : '') + '</span></button>';
      var row = { t: D.timeToMin(hb.time), time: hb.time || '', done: on, state: timeState(hb.time, on), title: hb.name, flag: n > 0 ? '<span class="ag-streak">' + icon('flame', 'ic18') + '<span class="num">' + n + '</span></span>' : '', belong: 'Thói quen', tick: tick };
      if (hb.time) { row.i = seq++; rows.push(row); } else undated.push(row);
    });
    // Vạch "Bây giờ"
    if (st.date === D.today()) {
      var nm = D.timeToMin(D.now());
      rows.push({ t: nm, now: true, i: -1, html: '<div class="ag-now">Bây giờ ' + esc(D.now()) + '</div>' });
    }
    rows.sort(function (a, b) { return a.t - b.t || a.i - b.i; });
    if (st.order === 'desc') rows.reverse();

    var h = '';
    var tl = '<div class="ag-tl-head" aria-hidden="true"><span>Giờ</span><span>Tên</span><span>Thuộc</span><span>Mức độ</span><span>Hạn</span><span>Trạng thái</span></div>', seg = '';
    rows.forEach(function (r) {
      if (r.t != null) { var sg = segOf(r.t); if (sg !== seg) { seg = sg; tl += '<div class="ag-seg">' + sg + '</div>'; } }
      tl += r.now ? r.html : tlRow(r);
    });
    if (undated.length) {
      tl += '<div class="ag-seg">TRONG NGÀY · CHƯA ĐẶT GIỜ</div>' + undated.map(tlRow).join('');
    }
    if (!rows.length && !undated.length) tl += '<p class="ag-empty">Chưa có gì trên dòng thời gian.</p>';
    h += '<section class="card ag-tl" aria-label="Dòng thời gian">' + tl + '</section>';
    if (st.date === D.today()) h += '<div class="ag-foot"><button type="button" class="btn btn-primary" data-act="soat">' + icon('moon', 'ic18') + 'Soát cuối ngày</button></div>';
    return h;
  }

  /* ---------- Vẽ lại ---------- */
  function render() {
    if (!st || sub) return;
    var y = window.scrollY, ae = document.activeElement, fk = ae && ae.getAttribute ? ae.getAttribute('data-fk') : null;
    var cards = buildCards(R.runsFor(st.date), leftEntries()), tasks = T.tasksFor(st.date), habits = habitsDue();
    st.lastNow = D.now();
    st.el.innerHTML = '<div class="ag">' + headHtml(pendingLine()) + chartsHtml(cards, tasks) + switchHtml() +
      (st.mode === 'overview' ? overviewHtml(cards, tasks, habits) : checklistHtml(cards, tasks, habits)) + '</div>';
    if (fk) {
      var cand = st.el.querySelectorAll('[data-fk]');
      for (var i = 0; i < cand.length; i++) if (cand[i].getAttribute('data-fk') === fk) { try { cand[i].focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ } break; }
    }
    window.scrollTo(0, y);
  }
  function schedule() {
    if (!st || st.dirty) return;
    st.dirty = true;
    Promise.resolve().then(function () { if (st) { st.dirty = false; render(); } });
  }
  function typing() { var a = document.activeElement; return !!(st && a && st.el.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)); }

  /* ---------- Thao tác ---------- */
  function fx(b, big) { try { var r = b.getBoundingClientRect(); LP.flowers.burst(r.left + r.width / 2, r.top + r.height / 2, !!big); } catch (e) { /* bỏ qua */ } }
  function runFinished(rid) { return R.runsFor(st.date).some(function (x) { return x.routine.id === rid && x.total > 0 && x.done === x.total; }); }

  function setEntryTime(key, time) {
    var e = st.snapMap[key]; if (!e) return;
    if (e.kind === 'item') {
      var cur = R.checkOf(e.routineId, e.itemId, e.runDate), extra = { set_time: time };
      if (!cur || !cur.note || /^xep-gio/.test(cur.note)) extra.note = 'xep-gio:' + st.date;
      R.check(e.routineId, e.itemId, e.runDate, cur ? cur.status : 'carried', extra);
      return;
    }
    var t = LP.store.find('Tasks', e.taskId), sid = st.stepOf[key], sp = sid ? LP.store.find('TaskSteps', sid) : null;
    if (!t) return;
    if (sp) {
      LP.store.upsert('TaskSteps', Object.assign({}, sp, { do_date: st.date, do_time: time }));
      LP.store.upsert('Tasks', Object.assign({}, LP.store.find('Tasks', t.id), { carried_from: e.fromDate }));
    } else {
      LP.store.upsert('Tasks', Object.assign({}, t, { do_date: st.date, do_time: time, carried_from: e.fromDate }));
    }
  }
  function clearEntryTime(key) {
    var e = st.snapMap[key]; if (!e || e.kind !== 'item') return;
    var cur = R.checkOf(e.routineId, e.itemId, e.runDate); if (!cur) return;
    if (/^(?:xep-gio|dua)/.test(cur.note || '') && cur.status === 'carried') R.check(e.routineId, e.itemId, e.runDate, '');
    else R.check(e.routineId, e.itemId, e.runDate, cur.status, { set_time: '' });
  }
  function setTaskTime(taskId, stepId, time) {
    var t = LP.store.find('Tasks', taskId), sp = stepId ? LP.store.find('TaskSteps', stepId) : null;
    if (sp) LP.store.upsert('TaskSteps', Object.assign({}, sp, { do_time: time }));
    else if (t) LP.store.upsert('Tasks', Object.assign({}, t, { do_time: time }));
  }
  // Bỏ giờ: việc đã tồn từ ngày trước thì quay về ngày gốc (lại vào khối tồn), việc thường chỉ bỏ giờ
  function clearTaskTime(taskId, stepId) {
    var t = LP.store.find('Tasks', taskId), sp = stepId ? LP.store.find('TaskSteps', stepId) : null; if (!t) return;
    var back = t.carried_from && t.carried_from < st.date ? t.carried_from : '';
    if (sp) {
      LP.store.upsert('TaskSteps', Object.assign({}, sp, { do_time: '', do_date: back || sp.do_date }));
      if (back) LP.store.upsert('Tasks', Object.assign({}, t, { carried_from: '' }));
    } else {
      LP.store.upsert('Tasks', Object.assign({}, t, { do_time: '', do_date: back || t.do_date, carried_from: back ? '' : t.carried_from }));
    }
  }

  function goDate(d) { LP.router.go('agenda', d === D.today() ? {} : { date: d }); }
  function findInput(forKey) {
    var all = st.el.querySelectorAll('input[data-for]');
    for (var i = 0; i < all.length; i++) if (all[i].getAttribute('data-for') === forKey) return all[i];
    return null;
  }

  var ACTIONS = {
    prev: function () { goDate(D.add(st.date, -1)); },
    next: function () { goDate(D.add(st.date, 1)); },
    today: function () { goDate(D.today()); },
    mode: function (b) { st.mode = b.getAttribute('data-mode'); lsSet(MODE_KEY, st.mode); render(); },
    order: function (b) { st.order = b.getAttribute('data-order'); lsSet(ORDER_KEY, st.order); render(); },
    expand: function (b) { st.open[b.getAttribute('data-run')] = true; render(); },
    collapse: function (b) { st.open[b.getAttribute('data-run')] = false; render(); },
    soat: function () { LP.router.go('agenda', { soat: '1' }); },
    ton: function () { LP.router.go('agenda', { ton: '1' }); },
    off: function () {
      var d = st.date, row = S().daysOff.filter(function (r) { return r.date === d; })[0];
      LP.ui.confirm(row ? 'Bỏ đánh dấu ngày nghỉ' : 'Đánh dấu ngày nghỉ',
        row ? 'Ngày ' + D.fmt(d) + ' sẽ lại là ngày làm việc, các lượt Daily hiện lại.' : 'Ngày ' + D.fmt(d) + ' sẽ là ngày nghỉ: không có lượt Daily, Quỹ Ad-hoc về 0.',
        { ok: row ? 'Bỏ đánh dấu' : 'Đánh dấu nghỉ' }).then(function (yes) {
        if (!yes) return;
        if (row) LP.store.remove('DaysOff', row.id); else LP.store.upsert('DaysOff', { date: d, note: '' });
      });
    },
    'tick-item': function (b) {
      var rid = b.getAttribute('data-r'), iid = b.getAttribute('data-i'), d = b.getAttribute('data-d');
      var cur = R.checkOf(rid, iid, d), done = !(cur && cur.status === 'done');
      if (done) fx(b, false);
      R.check(rid, iid, d, done ? 'done' : '');
      if (done && runFinished(rid)) { LP.ui.toast(LP.flowers.cheerText(), { cheer: true }); fx(b, true); }
    },
    'tick-left': function (b) {
      var key = b.getAttribute('data-key'), o = st.snapMap[key] && decorate(st.snapMap[key]); if (!o) return;
      var e = o.e;
      if (e.kind === 'item') {
        if (o.done) { var back = st.prevSt[key]; R.check(e.routineId, e.itemId, e.runDate, back !== undefined ? back : ((o.setTime || e.source === 'carried') ? 'carried' : '')); }
        else { fx(b, false); var c0 = R.checkOf(e.routineId, e.itemId, e.runDate); st.prevSt[key] = c0 ? c0.status : ''; R.check(e.routineId, e.itemId, e.runDate, 'done'); }
      } else if (o.step) { if (!o.done) fx(b, false); T.toggleStep(o.step); }
      else { if (!o.done) fx(b, false); T.setDone(o.task, !o.done); }
    },
    'tick-task': function (b) {
      var t = LP.store.find('Tasks', b.getAttribute('data-task')), sid = b.getAttribute('data-step'); if (!t) return;
      var sp = sid ? LP.store.find('TaskSteps', sid) : null;
      var wasDone = sp ? sp.status === 'done' : t.status === 'done';
      if (!wasDone) fx(b, false);
      if (sp) T.toggleStep(sp); else T.setDone(t, !wasDone);
    },
    'tick-habit': function (b) {
      var hid = b.getAttribute('data-h'), d = st.date;
      var log = S().habitLogs.filter(function (l) { return l.habit_id === hid && l.date === d; })[0];
      var on = !!log && truthy(log.done);
      if (!on) fx(b, false);
      LP.store.upsert('HabitLogs', log ? Object.assign({}, log, { done: on ? 'FALSE' : 'TRUE' }) : { habit_id: hid, date: d, done: 'TRUE' });
    },
    place: function (b) {
      var inp = findInput(b.getAttribute('data-for')), v = inp ? inp.value : '';
      if (!D.isTime(v)) { LP.ui.toast('Chọn giờ trước rồi bấm Đặt giờ nhé.'); return; }
      var key = b.getAttribute('data-key');
      if (key) setEntryTime(key, v); else setTaskTime(b.getAttribute('data-task'), b.getAttribute('data-step'), v);
    },
    'skip-left': function (b) {
      var e = st.snapMap[b.getAttribute('data-key')]; if (!e || e.kind !== 'item') return;
      R.check(e.routineId, e.itemId, e.runDate, 'skipped', { note: 'Bỏ qua từ Agenda', set_time: '' });
      LP.ui.toast('Đã bỏ qua "' + e.title + '".', { actionLabel: 'Hoàn tác', actionIcon: 'back', action: function () { R.check(e.routineId, e.itemId, e.runDate, ''); } });
    },
    'cancel-left': function (b) {
      var o = st.snapMap[b.getAttribute('data-key')] && decorate(st.snapMap[b.getAttribute('data-key')]); if (!o || !o.task) return;
      cancelWithUndo(o.task);
    },
    unplace: function (b) { clearEntryTime(b.getAttribute('data-key')); },
    'unplace-task': function (b) { clearTaskTime(b.getAttribute('data-task'), b.getAttribute('data-step')); },
    doc: function (b) { LP.ui.docSheet(b.getAttribute('data-doc'), b.getAttribute('data-head')); },
    more: function (b) { taskMenu(b.getAttribute('data-task'), b.getAttribute('data-step')); }
  };

  function cancelWithUndo(task) {
    var prev = Object.assign({}, task);   // hoàn tác khôi phục đúng trạng thái cũ (todo/done, done_at)
    T.setCancelled(task, true);
    LP.ui.toast('Đã hủy việc "' + task.title + '".', { actionLabel: 'Hoàn tác', actionIcon: 'back', action: function () { LP.store.upsert('Tasks', prev); } });
  }

  function onClick(ev) {
    var b = ev.target.closest('[data-act]');
    if (!b || b.disabled || !st || !st.el.contains(b)) return;
    var fn = ACTIONS[b.getAttribute('data-act')];
    if (fn) fn(b, ev);
  }

  /* ---------- Menu ⋯ của việc ---------- */
  function taskMenu(taskId, stepId) {
    var t = LP.store.find('Tasks', taskId); if (!t) return;
    var sp = stepId ? LP.store.find('TaskSteps', stepId) : null;
    var s = LP.ui.sheet(sp ? sp.title : t.title,
      '<div class="choice-list"><button type="button" class="btn" data-m="date">' + icon('calendar', 'ic18') + 'Đổi ngày làm</button>' +
      '<button type="button" class="btn" data-m="edit">' + icon('edit', 'ic18') + 'Sửa</button>' +
      '<button type="button" class="btn" data-m="note">' + icon('note', 'ic18') + 'Mở ghi chú</button>' +
      (t.status === 'done' ? '' : '<button type="button" class="btn btn-danger" data-m="cancel">' + icon('close', 'ic18') + 'Hủy việc</button>') + '</div>');
    s.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return;
      var m = b.getAttribute('data-m');
      s.close();
      if (m === 'date') changeDate(t, sp);
      else if (m === 'cancel') cancelWithUndo(t);
      else if (m === 'edit') {
        if (LP.quickAdd && LP.quickAdd.edit) LP.quickAdd.edit('task', t.id);
        else LP.ui.toast('Form sửa việc đang làm (Phần 5 sẽ nối vào).');
      } else if (t.doc_id) LP.ui.docSheet(t.doc_id, t.heading_id);
      else LP.ui.toast('Mục này chưa gắn ghi chú.');
    });
  }
  function changeDate(t, sp) {
    var cur = (sp && sp.do_date) || t.do_date || st.date;
    var s = LP.ui.sheet('Đổi ngày làm', '<label class="field"><span>Ngày làm mới</span><input class="input" type="date" id="ag-newdate" value="' + esc(cur) + '"></label>' +
      '<p class="form-error" id="ag-newdate-err" hidden>Chọn một ngày hợp lệ.</p>' +
      '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn" data-close>Hủy</button><button type="button" class="btn btn-primary" id="ag-newdate-ok">Lưu</button></div>');
    s.el.querySelector('#ag-newdate-ok').addEventListener('click', function () {
      var v = s.el.querySelector('#ag-newdate').value;
      if (!D.isValid(v)) { s.el.querySelector('#ag-newdate-err').hidden = false; return; }
      if (sp) LP.store.upsert('TaskSteps', Object.assign({}, sp, { do_date: v }));
      else LP.store.upsert('Tasks', Object.assign({}, t, { do_date: v }));
      s.close();
      LP.ui.toast('Đã đổi ngày làm sang ' + D.fmt(v) + '.');
    });
  }

  /* ---------- Thông báo tới giờ (chạy nền ở mọi tab của web) ---------- */
  function notifyCandidates(d) {
    var out = [];
    R.runsFor(d).forEach(function (run) {
      run.items.forEach(function (m) {
        if (m.time && !m.done && !m.status) out.push({ key: 'i|' + run.routine.id + '|' + m.item.id + '|' + d, title: m.item.title, time: m.time, from: run.routine.name });
      });
    });
    R.leftovers(d, { all: true, decided: true }).forEach(function (e) {   // mục đã quyết làm hôm nay: báo theo giờ đã đặt hoặc giờ gốc
      if (e.time) out.push({ key: 'l|' + e.routineId + '|' + e.itemId + '|' + e.runDate, title: e.title, time: e.time, from: e.label });
    });
    T.tasksFor(d).forEach(function (x) {
      if (x.time && !x.done) out.push({ key: 't|' + x.task.id + '|' + (x.step ? x.step.id : ''), title: x.title, time: x.time, from: 'Ad-hoc / Personal' });
    });
    S().habits.forEach(function (h) {
      if (truthy(h.active) && h.time && ST.habitDue(h, d) && !ST.habitDone(h, d)) out.push({ key: 'h|' + h.id, title: h.name, time: h.time, from: 'Thói quen' });
    });
    return out;
  }
  // Báo khi vừa tới giờ (trong 5 phút đầu). Mục đã tick trước giờ thì không báo. Mỗi mục báo một lần mỗi ngày.
  function checkNotify() {
    if (!LP.store.isReady()) return;
    var d = D.today(), n = D.timeToMin(D.now());
    notifyCandidates(d).forEach(function (c) {
      var t = D.timeToMin(c.time), k = d + '|' + c.key;
      if (t == null || n < t || n - t > 5 || notified[k]) return;
      notified[k] = true;
      LP.notify.show(c.title, 'Đến giờ ' + c.time + (c.from ? ' · ' + c.from : ''), k);
    });
  }

  /* ---------- Vòng đời ---------- */
  function mount(el, params) {
    params = params || {};
    sub = params.ton ? 'ton' : params.soat ? 'soat' : '';
    if (sub === 'ton') return LP.ton.mount(el, params);
    if (sub === 'soat') return LP.soat.mount(el, params);
    var d = params.date && D.isValid(params.date) ? params.date : D.today();
    st = { el: el, date: d, mode: lsGet(MODE_KEY, 'checklist') === 'overview' ? 'overview' : 'checklist', order: lsGet(ORDER_KEY, 'asc') === 'desc' ? 'desc' : 'asc',
      snapOrder: [], snapMap: {}, stepOf: {}, prevSt: {}, open: {}, dirty: false, lastNow: '' };
    el.addEventListener('click', onClick);
    LP.store.on('change', schedule);
    render();
  }
  function unmount() {
    if (sub) { var was = sub; sub = ''; if (was === 'ton') LP.ton.unmount(); else LP.soat.unmount(); return; }
    if (!st) return;
    st.el.removeEventListener('click', onClick);
    LP.store.off('change', schedule);
    st = null;
  }

  // Mỗi 30 giây: cập nhật "Trễ N phút" khi sang phút mới, và kiểm tra thông báo
  setInterval(function () {
    if (st && !sub && D.now() !== st.lastNow && !typing()) render();
    checkNotify();
  }, 30000);
  LP.router.on('route', function () { checkNotify(); });

  LP.router.register('agenda', { title: 'Agenda', mount: mount, unmount: unmount });
  return { checkNotify: checkNotify };
})();

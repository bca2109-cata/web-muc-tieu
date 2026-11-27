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

  var tam_cute = LP.cute.html;

  /* Hình khung chào theo buổi: bút chì màu + màu nước (sáng, trưa: mặt trời · chiều: mặt trời có mây · tối: mặt trăng có sao).
     Trả về nội dung <svg viewBox 0 0 120 120>. Id filter/clipPath có tiền tố lp; trang chỉ có một khung chào. */
  var CRES = 'M70 16 C44 18 22 40 24 64 C26 88 48 106 78 104 C90 103 98 98 104 92 C84 94 62 82 56 62 C50 42 58 26 70 16 Z';
  var SUN = 'M60 30 C77 29 91 43 90 61 C89 78 76 91 59 90 C42 89 30 76 31 59 C32 43 44 31 60 30 Z';
  var CLOUD = 'M66 104 C56 104 52 96 57 90 C55 82 63 76 71 79 C74 71 86 69 92 76 C99 74 106 80 104 87 C110 89 110 99 103 103 C95 105 76 105 66 104 Z';
  function hatch(step, col, w) {
    var h = '';
    for (var x = -40; x < 160; x += step) h += '<line x1="' + x + '" y1="0" x2="' + (x + 60) + '" y2="120"/>';
    return '<g stroke="' + col + '" stroke-width="' + w + '" opacity=".75" filter="url(#lpw2)">' + h + '</g>';
  }
  var ART_DEFS = '<defs>' +
    '<filter id="lpwc" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="2" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="6" result="d"/><feGaussianBlur in="d" stdDeviation="1"/></filter>' +
    '<filter id="lpw1" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="turbulence" baseFrequency=".05" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="3.5"/></filter>' +
    '<filter id="lpw2"><feTurbulence type="turbulence" baseFrequency=".06" numOctaves="2" seed="9"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter>' +
    '<filter id="lpw3" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="turbulence" baseFrequency=".04" numOctaves="1" seed="5"/><feDisplacementMap in="SourceGraphic" scale="2"/></filter>' +
    '<clipPath id="lpcm"><path d="' + CRES + '"/></clipPath><clipPath id="lpcs"><path d="' + SUN + '"/></clipPath><clipPath id="lpcc"><path d="' + CLOUD + '"/></clipPath></defs>';
  function artShape(d, clip, wash, hcol, line) {
    return '<path d="' + d + '" fill="' + wash + '" opacity=".9" filter="url(#lpwc)"/>' +
      '<g clip-path="url(#' + clip + ')">' + hatch(6, hcol, 2) + '</g>' +
      '<path d="' + d + '" fill="none" stroke="' + line + '" stroke-width="2.6" stroke-linejoin="round" filter="url(#lpw1)"/>' +
      '<path d="' + d + '" fill="none" stroke="' + line + '" stroke-width="1.1" opacity=".5" transform="translate(1.5 -1)" filter="url(#lpw2)"/>';
  }
  function artMoon() {
    return ART_DEFS + artShape(CRES, 'lpcm', '#ffe08f', '#f3c95b', '#c98a2a') +
      '<g stroke="#e29a2f" stroke-width="2.4" stroke-linecap="round" filter="url(#lpw1)"><path d="M98 18v16M90 26h16"/><path d="M102 66v10M97 71h10"/><path d="M22 22v9M17.5 26.5h9"/></g>' +
      '<g fill="#f6c95a" filter="url(#lpwc)"><circle cx="86" cy="46" r="2.6"/><circle cx="30" cy="44" r="2"/><circle cx="88" cy="98" r="2.4"/></g>';
  }
  function artSun(cloud) {
    var rays = [[60, 8, 60, 22], [60, 99, 60, 111], [9, 60, 22, 60], [98, 60, 112, 60], [24, 24, 33, 33], [88, 88, 96, 96], [24, 96, 33, 87], [88, 32, 97, 23]]
      .map(function (r, i) { var k = i % 2 ? 0.85 : 1; return '<path d="M' + r[0] + ' ' + r[1] + 'L' + (r[0] + (r[2] - r[0]) * k).toFixed(1) + ' ' + (r[1] + (r[3] - r[1]) * k).toFixed(1) + '"/>'; }).join('');
    var s = ART_DEFS + '<g stroke="#e8902c" stroke-width="3.4" stroke-linecap="round" filter="url(#lpw3)">' + rays + '</g>' + artShape(SUN, 'lpcs', '#ffd36e', '#f2b544', '#cf7f1f');
    if (cloud) s += '<path d="' + CLOUD + '" fill="#fff" filter="url(#lpwc)"/>' + '<path d="' + CLOUD + '" fill="#dcefff" opacity=".55" filter="url(#lpwc)"/>' +
      '<g clip-path="url(#lpcc)">' + hatch(7, '#b9d8ec', 1.6) + '</g>' +
      '<path d="' + CLOUD + '" fill="none" stroke="#7fa9c6" stroke-width="2.4" stroke-linejoin="round" filter="url(#lpw1)"/>';
    return s;
  }
  function helloArt(h) {
    var body = h >= 18 ? artMoon() : artSun(h >= 13);
    return '<svg class="ag-sun" width="84" height="84" viewBox="0 0 120 120" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  function helloBalloons() {
    return [['ag-b1', '#ff6f91', '#ffb3c6'], ['ag-b2', '#5aa9f0', '#b5d8fb'], ['ag-b3', '#ffc83d', '#ffe9a6']].map(function (b) {
      return '<svg class="ag-balloon ' + b[0] + '" viewBox="0 0 30 60" width="26" height="52"><path d="M15 44Q11 52 16 59" fill="none" stroke="#9a7a8a" stroke-width="1"/>' +
        '<path d="M15 41l-3.500 4.500h7z" fill="' + b[1] + '"/><ellipse cx="15" cy="20" rx="12.500" ry="18" fill="' + b[1] + '"/><ellipse cx="10.500" cy="13" rx="3.500" ry="6" fill="#fff" opacity=".5" transform="rotate(20 10.500 13)"/></svg>';
    }).join('');
  }
  function helloConfetti() {
    var cols = ['#ff6f91', '#ffd25a', '#5cc49a', '#5aa9f0', '#a68bf0', '#ff9a4d'], o = '';
    for (var i = 0; i < 16; i++) {
      o += '<i class="ag-cf" style="left:' + (4 + i * 6) % 98 + '%;background:' + cols[i % 6] + ';animation-duration:' + (6 + (i * 7) % 5) + 's;animation-delay:-' + (i * 13) % 9 + 's;' + (i % 3 === 0 ? 'border-radius:50%;' : i % 3 === 1 ? 'width:4px;height:9px;' : '') + '"></i>';
    }
    return o;
  }
  // Trang trí khung chào (27/11): cầu vồng và mây sau mặt trời, cờ tam giác phía trên, hạt lấp lánh, trái tim bay
  function helloDeco() {
    function u(id, cls) { return '<svg class="ag-dc ' + cls + '" viewBox="0 0 24 24" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
    var arcs = ['#ff6f91', '#ff9a4d', '#ffd25a', '#5cc49a', '#5aa9f0', '#a68bf0'].map(function (c, i) {
      var r = 78 - i * 8;
      return '<path d="M' + (120 - r) + ' 120A' + r + ' ' + r + ' 0 0 1 ' + (120 + r) + ' 120" fill="none" stroke="' + c + '" stroke-width="8"/>';
    }).join('');
    return '<span class="ag-deco" aria-hidden="true">' +
      '<svg class="ag-rainbow" viewBox="0 0 240 120" width="150" height="75">' + arcs + '</svg>' +
      '<svg class="ag-cloud ag-cloud1" viewBox="0 0 60 30" width="46" height="23"><path d="M10 28a9 9 0 0 1 1-18 12 12 0 0 1 23-2 10 10 0 0 1 16 8 7 7 0 0 1 0 12z" fill="#fff" opacity=".95"/></svg>' +
      '<svg class="ag-cloud ag-cloud2" viewBox="0 0 60 30" width="38" height="19"><path d="M10 28a9 9 0 0 1 1-18 12 12 0 0 1 23-2 10 10 0 0 1 16 8 7 7 0 0 1 0 12z" fill="#fff" opacity=".9"/></svg>' +
      '<span class="ag-bunting"></span>' + helloBalloons() + helloConfetti() + '<i class="ag-shoot"></i>' +
      u('f-spark', 'ag-s1') + u('f-spark', 'ag-s2') + u('f-spark', 'ag-s3') + u('f-heart', 'ag-h1') + u('f-heart', 'ag-h2') + u('f-heart', 'ag-h3') +
      '<i class="ag-dot ag-d1"></i><i class="ag-dot ag-d2"></i><i class="ag-dot ag-d3"></i><i class="ag-dot ag-d4"></i></span>';
  }

  /* ---------- Đầu trang ---------- */
  function headHtml(extra) {
    var d = st.date, t = D.today(), pills = '';
    if (d < t) pills += pill('Đã qua · chỉ xem', 'plain'); else if (d > t) pills += pill('Sắp tới', 'note');
    if (D.isDayOff(d)) pills += pill('Ngày nghỉ', 'missed'); else if (D.dow(d) === 7) pills += pill('Chủ nhật', 'plain');
    var tools = '';
    if (d !== t) tools += '<button type="button" class="chip" data-act="today">Về hôm nay</button>';
    if (!readOnly()) tools += '<button type="button" class="chip" data-act="off">' + icon('calendar', 'ic18') + (D.isDayOff(d) ? 'Bỏ đánh dấu ngày nghỉ' : 'Đánh dấu ngày nghỉ') + '</button>';
    var h = parseInt(D.now().slice(0, 2), 10);
    var left = st.left || 0, tot = st.tot || 0;
    var hello = !tot ? 'Hôm nay chưa có việc nào.' : left ? 'Hôm nay còn ' + left + ' việc cần làm.' : 'Xong hết việc hôm nay.';
    var rel = d === t ? 'Hôm nay' : d === D.add(t, -1) ? 'Hôm qua' : d === D.add(t, 1) ? 'Ngày mai' : d < t ? 'Ngày đã qua' : 'Ngày sắp tới';
    var fl = LP.flowers.html;
    return '<div class="ag-head"><section class="ag-hello" aria-label="Chào">' + helloArt(d === t ? h : 8) + fl('daisy', 44, 2, 'ag-hello-f1') + fl('sakura', 26, 8, 'ag-hello-f2') +
      helloDeco() + '<h1>' + esc(D.weekdayName(d) + ', ') + '<span class="ag-dnum">' + esc(D.fmt(d)) + '</span></h1>' + (d === t ? '<p class="ag-greet">' + hello + '</p>' : '') + '<div class="ag-date" role="group" aria-label="Chọn ngày xem">' +
      '<button type="button" class="ag-daybtn" data-act="prev" aria-label="Ngày trước">' + icon('back', 'ic18') + '</button>' +
      '<span class="ag-daypick"><span class="ag-dayrel">' + rel + '</span></span>' +
      '<button type="button" class="ag-daybtn" data-act="next" aria-label="Ngày sau">' + icon('back', 'ic18 ag-flip') + '</button></div></section>' +
      '<div class="ag-side">' + (pills || tools ? '<div class="ag-sub"><div class="ag-pills">' + pills + '</div><div class="ag-tools">' + tools + '</div></div>' : '') + (extra || '') + '</div></div>';
  }

  /* ---------- Dải 3 biểu đồ ---------- */
  function ringHtml(done, total) {
    var pct = total ? Math.round(done * 100 / total) : null, C = 2 * Math.PI * 41, lvl = ST.level(pct);
    var fg = pct ? '<circle class="fg s-' + lvl + '" cx="52" cy="52" r="41" stroke-dasharray="' + (C * pct / 100).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 52 52)"/>' : '';
    return '<svg class="ag-ring" viewBox="0 0 104 104" role="img" aria-label="Hoàn thành ' + done + ' trên ' + total + '"><circle class="tr" cx="52" cy="52" r="41"/>' + fg +
      '<text class="big" x="52" y="55">' + (total ? done + '/' + total : '0') + '</text><text class="small" x="52" y="72">' + (pct == null ? 'việc ' + (st.date === D.today() ? 'hôm nay' : D.fmt(st.date)) : pct + '%') + '</text></svg>';
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
    // Hạng mục Bỏ qua không tính vào mẫu số (cùng quy tắc với Tổng kết: done / (tổng − bỏ qua))
    cards.forEach(function (c) { done += c.done; total += c.total - c.own.filter(function (m) { return m.status === 'skipped'; }).length; });
    tasks.forEach(function (x) { total++; if (x.done) done++; });
    var cap = T.capacity(st.date), ev = cap.evening;
    var facts = (total ? '' : '<p class="ag-empty">Chưa có việc nào để hoàn thành.</p>');
    function quota(name, q, note) {
      var pct = q.quota > 0 ? Math.min(100, Math.round(q.used * 100 / q.quota)) : (q.used > 0 ? 100 : 0);
      return '<div class="ag-fact' + (q.over ? ' is-over' : '') + '"><div class="ag-fact-head"><b>' + name + '</b><span class="num">' + D.fmtMin(q.used) + ' / ' + D.fmtMin(q.quota) + '</span>' + (q.over ? '<span class="ag-over"> · vượt quỹ</span>' : '') + '</div>' +
        '<div class="ag-mini" role="img" aria-label="' + name + ': đã dùng ' + D.fmtMin(q.used) + ' trên quỹ ' + D.fmtMin(q.quota) + (q.over ? ', vượt quỹ' : '') + '">' + (pct ? '<span style="width:' + pct + '%"></span>' : '') + '</div>' +
        (note ? '<small>' + note + '</small>' : '') + '</div>';
    }
    if (cap.work.quota > 0) facts += quota('Ad-hoc', cap.work, cap.interruptionMin > 0 ? 'gồm ' + D.fmtMin(cap.interruptionMin) + ' chen ngang' : 'chưa có chen ngang');
    facts += quota('Personal', ev, '');
    var blocks = '';
    function blk(name, d, t) { blocks += '<div class="ag-blk"><span class="ag-blk-name">' + esc(name) + '</span><span class="num">' + d + '/' + t + '</span>' + barHtml(d, t) + '</div>'; }
    cards.forEach(function (c) { blk(c.routine.name, c.done, c.total); });
    var ad = tasks.filter(function (x) { return x.task.kind !== 'canhan'; }), cn = tasks.filter(function (x) { return x.task.kind === 'canhan'; });
    function dn(l) { return l.filter(function (x) { return x.done; }).length; }
    if (ad.length) blk('Ad-hoc hôm nay', dn(ad), ad.length);
    if (cn.length) blk('Personal hôm nay', dn(cn), cn.length);
    var noBlocks = !blocks;
    if (noBlocks) blocks = '<p class="ag-empty">Chưa có khối nào ' + (st.date === D.today() ? 'hôm nay' : D.fmt(st.date)) + ' · <a class="ag-inline" href="#/mau?id=new">+ Tạo Daily</a></p>';
    var six = sixDays(), hasSix = six.some(function (x) { return x.pct != null; });
    var cols = six.map(function (x) {
      var h = x.pct == null ? 0 : Math.max(4, Math.round(x.pct * 0.8)); // 80px = 100%
      var cls = x.pct == null ? 'is-none' : x.now ? 'is-now' : x.pct >= 100 ? 'b-ok' : x.pct >= 80 ? 'b-pr' : 'b-warn';
      return '<div class="ag-col" aria-label="' + D.fmt(x.d) + ': ' + (x.pct == null ? 'không có số liệu' : x.pct + '%') + '"><span class="ag-col-val num">' + (x.pct == null ? '–' : x.pct + '%') + '</span>' +
        '<span class="ag-col-bar ' + cls + '" style="height:' + (x.pct == null ? 3 : h) + 'px"></span>' +
        '<span class="ag-col-lbl' + (x.now ? ' is-now' : '') + '">' + D.weekdayShort(x.d) + '<br>' + D.fmt(x.d) + '</span></div>';
    }).join('');
    return '<div class="ag-charts">' +
      '<section class="card ag-chart" aria-label="Hoàn thành hôm nay"><h2>Hoàn thành ' + (st.date === D.today() ? 'hôm nay' : D.fmt(st.date)) + '</h2><div class="ag-ring-wrap">' + ringHtml(done, total) + '<div class="ag-facts">' + facts + '</div></div></section>' +
      '<section class="card ag-chart' + (noBlocks ? ' is-slim' : '') + '" aria-label="Tiến độ theo khối"><h2>Tiến độ theo khối</h2>' + blocks + '</section>' +
      '<section class="card ag-chart" aria-label="6 ngày làm việc gần nhất"><h2>6 ngày làm việc gần nhất</h2>' + (hasSix ? '<div class="ag-cols">' + cols + '</div>' : '<p class="ag-empty">Chưa có số liệu 6 ngày gần nhất.</p>') + '</section></div>';
  }

  function switchHtml() {
    var m = st.mode;
    var h = '<div class="ag-bar-top"><div class="ag-switch" role="group" aria-label="Chế độ xem">' +
      '<button type="button" class="chip' + (m === 'checklist' ? ' is-on' : '') + '" data-act="mode" data-mode="checklist" aria-pressed="' + (m === 'checklist') + '">' + icon('list', 'ic18') + 'Checklist</button>' +
      '<button type="button" class="chip' + (m === 'overview' ? ' is-on' : '') + '" data-act="mode" data-mode="overview" aria-pressed="' + (m === 'overview') + '">' + icon('clock', 'ic18') + 'Toàn cảnh</button></div>';
    if (m === 'overview') {
      h += '<button type="button" class="chip ag-order" data-act="order" data-order="' + (st.order === 'asc' ? 'desc' : 'asc') + '" title="Bấm để đảo thứ tự">' + (st.order === 'asc' ? 'Sớm → muộn' : 'Muộn → sớm') + ' ⇅</button>';
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
      '<div class="ag-main"><div class="ag-title">' + tam_cute(m.item.title) + esc(m.item.title) + '</div>' + (sub ? '<div class="ag-sub">' + esc(sub) + '</div>' : '') + '</div>' +
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
      '<div class="ag-sec-head"><h2>' + tam_cute(r.name, 'clipboard') + esc(r.name) + '</h2>' + LP.ui.importance(r.importance) +
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
      '<div class="ag-main"><div class="ag-title">' + tam_cute(o.title) + esc(o.title) + '</div>' + (o.setTime ? '<div class="ag-sub">đã xếp ' + esc(o.setTime) + '</div>' : '') + '</div>' +
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
      '<div class="ag-main"><div class="ag-title">' + tam_cute(x.title) + esc(x.title) + '</div><div class="ag-sub">' + esc(taskInfoSub(x)) + '</div></div>' +
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
      tam_cute(h.name, 'sprout') + esc(h.name) + (h.time ? ' <span class="muted num">' + esc(h.time) + '</span>' : '') + '</button>';
  }

  // Dòng mảnh ở đầu trang: mục SÓT CHƯA QUYẾT (không giới hạn ngày). Không có thì ẩn.
  function pendingLine() {
    if (readOnly()) return '';
    var n = R.leftovers(D.today(), { all: true, pending: true }).length;   // luôn tính theo hôm nay, khớp Soát và Tồn tổng
    if (n <= 0) return '';
    return '<div class="ag-pending"><span><b class="num">' + n + '</b> mục tồn chưa xử lý</span><button type="button" class="chip" data-act="ton">Xử lý</button></div>';
  }

  function taskSection(title, list, empty) {
    return '<section class="card ag-tasks" aria-label="' + esc(title) + '"><div class="ag-sec-head"><h2>' + tam_cute('', /Ad-hoc/.test(title) ? 'case' : 'house') + esc(title) + '</h2>' +
      (list.length ? '<span class="num">' + list.filter(function (x) { return x.done; }).length + '/' + list.length + '</span>' : '') + '</div>' +
      (list.length ? '<ul class="ag-ul">' + list.map(taskRow).join('') + '</ul>' : '<p class="ag-empty">' + empty + '</p>' + (readOnly() ? '' : '<div class="ag-empty-act"><button type="button" class="btn btn-soft" data-act="add" data-kind="adhoc">' + icon('plus', 'ic18') + 'Thêm Ad-hoc</button><button type="button" class="btn btn-soft" data-act="add" data-kind="canhan">' + icon('plus', 'ic18') + 'Thêm Personal</button></div>')) + '</section>';
  }

  function checklistHtml(cards, tasks, habits) {
    var h = '<div class="ag-list">';
    var infos = cards.map(runInfo).sort(function (a, b) { return a.key - b.key || a.idx - b.idx; });
    h += '<div class="ag-runs">' + (infos.length ? infos.map(runCard).join('') :
      '<section class="card"><h2>Daily</h2><p class="ag-empty">' + (D.isWorkday(st.date) ? 'Chưa có Daily nào ' + (st.date === D.today() ? 'hôm nay' : D.fmt(st.date)) + '.' : 'Ngày nghỉ, chưa có Daily.') + '</p>' + (D.isWorkday(st.date) ? '<div class="ag-empty-act"><a class="btn btn-soft" href="#/mau?id=new">' + icon('plus', 'ic18') + 'Tạo Daily</a></div>' : '') + '</section>') + '</div>';
    var ad = tasks.filter(function (x) { return x.task.kind !== 'canhan'; }), cn = tasks.filter(function (x) { return x.task.kind === 'canhan'; });
    h += '<div class="ag-cola">';
    if (ad.length) h += taskSection('Ad-hoc hôm nay', ad, '');
    if (cn.length) h += taskSection('Personal hôm nay', cn, '');
    if (!tasks.length) h += taskSection('Ad-hoc / Personal ' + (st.date === D.today() ? 'hôm nay' : D.fmt(st.date)), [], 'Chưa có việc nào có ngày làm ' + (st.date === D.today() ? 'là hôm nay' : 'ngày này') + '.');
    h += '<section class="card ag-habits" aria-label="Thói quen"><div class="ag-sec-head"><h2>' + tam_cute('', 'sprout') + 'Thói quen</h2></div>' +
      (habits.length ? '<div class="chips">' + habits.map(habitChip).join('') + '</div>' : '<p class="ag-empty">Không có thói quen nào hôm nay.</p>') + '</section></div>';
    if (st.date === D.today()) h += '<div class="ag-foot"><button type="button" class="btn btn-primary" data-act="soat">' + icon('moon', 'ic18') + 'Soát cuối ngày</button></div>';
    return h + '</div>';
  }

  /* ---------- Toàn cảnh ---------- */
  function placeBox(forKey, attrs) {
    if (readOnly()) return '';
    return '<div class="ag-place"><input type="text" inputmode="numeric" maxlength="5" placeholder="hh:mm" autocomplete="off" data-time class="input" data-for="' + esc(forKey) + '" aria-label="Chọn giờ"><button type="button" class="btn btn-soft" data-act="place" data-for="' + esc(forKey) + '" ' + attrs + '>Đặt giờ</button></div>';
  }
  function tlRow(r) {
    var s = r.state || {};
    var status = r.done ? pill('Xong', 'ok') : s.late != null ? pill(lateText(s.late), 'late') : s.due ? '<span class="pill ag-pill-due">Đến giờ</span>' : pill('Chưa làm', 'undone');
    return '<div class="ag-tl-row' + (r.done ? ' is-done' : '') + stateCls(s) + '">' +
      '<div class="ag-c-time num' + (r.est ? ' is-est' : '') + '">' + (r.time ? (r.est ? '~' : '') + esc(r.time) : '') + '</div>' +
      '<div class="ag-c-main">' + r.tick + '<div class="ag-main"><div class="ag-title">' + tam_cute(r.title) + esc(r.title) + (r.flag ? ' ' + r.flag : '') + '</div>' + (r.sub ? '<div class="ag-sub">' + esc(r.sub) + '</div>' : '') + '</div></div>' +
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
    (function () {   // số liệu cho lời chào (cùng cách đếm với vòng Hoàn thành)
      var dn = 0, tt = 0;
      cards.forEach(function (c) { dn += c.done; tt += c.total - c.own.filter(function (m) { return m.status === 'skipped'; }).length; });
      tasks.forEach(function (x) { tt++; if (x.done) dn++; });
      st.tot = tt; st.left = tt - dn;
    })();
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
        row ? 'Ngày ' + D.fmt(d) + ' sẽ lại là ngày làm việc, các lượt Daily hiện lại.' : 'Ngày ' + D.fmt(d) + ' sẽ là ngày nghỉ: chưa có Daily nào, Quỹ Ad-hoc về 0.',
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
    add: function (b) { if (LP.quickAdd && LP.quickAdd.open) LP.quickAdd.open(b.getAttribute('data-kind')); },
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

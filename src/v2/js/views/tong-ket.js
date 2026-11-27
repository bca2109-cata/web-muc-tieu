/* V2 · Phần 4: Tổng kết (route tong-ket). Chọn kỳ Tuần / Tháng / Quý / Năm, 5 khối cố định.
   Mọi số lấy từ LP.stats. Bấm cột hoặc dòng thì mở tấm trượt liệt kê chi tiết. Nhớ kỳ chọn lần cuối (chỉ loại kỳ). */
var LP = window.LP || (window.LP = {});

LP.tongKet = (function () {
  var D = LP.date, esc = LP.ui.esc, icon = LP.ui.icon, num = LP.util.num;
  var KEY = 'lpv2_tk_unit', UNITS = [['week', 'Tuần'], ['month', 'Tháng'], ['quarter', 'Quý'], ['year', 'Năm']];
  var root = null, onChange = null, st = { unit: 'month', anchor: '' }, cur = null;

  function S() { return LP.store.get(); }
  function loadUnit() { try { var u = localStorage.getItem(KEY); return UNITS.some(function (x) { return x[0] === u; }) ? u : 'month'; } catch (e) { return 'month'; } }
  function saveUnit(u) { try { localStorage.setItem(KEY, u); } catch (e) { /* bỏ qua */ } }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- Kỳ ---------- */
  function range(unit, anchor) {
    var y = anchor.slice(0, 4), f, t, label, value;
    if (unit === 'week') { f = D.startOfWeek(anchor); t = D.add(f, 6); label = 'Tuần ' + D.fmt(f) + ' – ' + D.fmtFull(t); value = f; }
    else if (unit === 'month') { f = D.monthStart(anchor); t = D.monthEnd(anchor); label = 'Tháng ' + anchor.slice(5, 7) + '/' + y; value = anchor.slice(0, 7); }
    else if (unit === 'quarter') {
      var q = Math.floor((+anchor.slice(5, 7) - 1) / 3); f = y + '-' + pad(q * 3 + 1) + '-01'; t = D.monthEnd(D.addMonths(f, 2));
      label = 'Quý ' + (q + 1) + '/' + y; value = y + '-Q' + (q + 1);
    } else { f = y + '-01-01'; t = y + '-12-31'; label = 'Năm ' + y; value = y; }
    return { unit: unit, from: f, to: t, label: label, value: value };
  }
  function shift(unit, anchor, dir) {
    if (unit === 'week') return D.add(anchor, 7 * dir);
    return D.addMonths(anchor, (unit === 'month' ? 1 : unit === 'quarter' ? 3 : 12) * dir);
  }

  /* ---------- Số liệu ---------- */
  function metrics(r) {
    var today = D.today(), days = LP.stats.completion(r.from, r.to, 'day'), m = { done: 0, total: 0, missed: 0, missedDays: 0 };
    days.forEach(function (b) { m.done += b.done; m.total += b.total; m.missed += b.missed; if (b.missed > 0) m.missedDays++; });
    m.pct = m.total ? Math.round(m.done * 100 / m.total) : null;
    m.days = days;
    m.ad = LP.stats.adhocStatus(r.from, r.to);
    m.adOpen = m.ad.doing + m.ad.overdue;
    var ib = LP.stats.interruptions(r.from, r.to, 'month'); m.intMin = 0; m.intCount = 0;
    ib.forEach(function (b) { m.intMin += b.minutes; m.intCount += b.count; });
    var last = r.to < today ? r.to : today;
    m.workdays = last >= r.from ? D.range(r.from, last).filter(D.isWorkday).length : 0;
    m.intAvg = m.workdays ? Math.round(m.intMin / m.workdays) : null;
    return m;
  }
  // Cột biểu đồ: ngày (tuần, tháng) hoặc tháng (quý, năm), gộp từ số liệu từng ngày của LP.stats.completion
  function columns(r, m) {
    var today = D.today();
    if (r.unit === 'week' || r.unit === 'month') {
      return m.days.map(function (b) {
        return { from: b.from, to: b.to, label: D.fmt(b.from), wd: D.weekdayShort(b.from), done: b.done, total: b.total, missed: b.missed, pct: b.pct, now: b.from <= today && today <= b.to, day: true };
      });
    }
    var out = [], cur = r.from;
    while (cur <= r.to) {
      var e = D.monthEnd(cur), c = { from: cur, to: e, label: 'T' + parseInt(cur.slice(5, 7), 10), done: 0, total: 0, missed: 0, now: cur <= today && today <= e };
      m.days.forEach(function (b) { if (b.from >= cur && b.from <= e) { c.done += b.done; c.total += b.total; c.missed += b.missed; } });
      c.pct = c.total ? Math.round(c.done * 100 / c.total) : null;
      out.push(c); cur = D.addMonths(cur, 1);
    }
    return out;
  }
  function tasksIn(r) {
    return S().tasks.filter(function (t) {
      var d = t.due_date || t.do_date;
      return (t.kind === 'adhoc' || t.kind === 'canhan') && t.status !== 'cancelled' && d && d >= r.from && d <= r.to;
    });
  }
  function adhocList(r) {
    var today = D.today(), out = { dung: [], tre: [], mo: [] };
    S().tasks.forEach(function (t) {
      if (t.kind !== 'adhoc' || t.status === 'cancelled' || !t.due_date || t.due_date < r.from || t.due_date > r.to) return;
      if (t.status === 'done') (((t.done_at || '').slice(0, 10) > t.due_date) ? out.tre : out.dung).push(t);
      else (t.due_date < today ? out.tre : out.mo).push(t);
    });
    return out;
  }
  // Mức khẩn tính tại ngày làm (hạn hôm nay hoặc đã quá = rất khẩn, trong 2 ngày = khẩn), dùng đúng hàm chung
  function urgOf(t) {
    if (!t.due_date) return '';
    return LP.logic.tasks.urgency(Object.assign({}, t, { status: 'todo' }), t.do_date || LP.date.today()) || 'binh-thuong';
  }
  function levels(r) {
    var out = [1, 2, 3].map(function (l) { return { level: l, total: 0, 'rat-khan': 0, khan: 0, 'binh-thuong': 0, list: [] }; });
    tasksIn(r).forEach(function (t) {
      var o = out[Math.max(1, Math.min(3, parseInt(t.importance, 10) || 1)) - 1], u = urgOf(t) || 'binh-thuong';
      o.total++; o[u]++; o.list.push(t);
    });
    return out;
  }

  /* ---------- Thành phần vẽ ---------- */
  function ring(pct, cls, size) {
    var r = 20, c = 2 * Math.PI * r, p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
    return '<svg class="mt-ring" width="' + (size || 56) + '" height="' + (size || 56) + '" viewBox="0 0 48 48" aria-hidden="true">' +
      '<circle cx="24" cy="24" r="' + r + '" class="mt-rtrack"/>' +
      (p ? '<circle cx="24" cy="24" r="' + r + '" class="mt-rfill mt-s-' + cls + '" stroke-dasharray="' + (c * p / 100).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 24 24)"/>' : '') +
      '<text x="24" y="28.5" text-anchor="middle" class="mt-rtext">' + (pct == null ? '–' : pct + '%') + '</text></svg>';
  }
  function delta(curV, prevV, unitTxt, goodUp, fmt) {
    fmt = fmt || function (v) { return String(v); };
    if (prevV == null) return '';   // kỳ trước không có số liệu thì ẩn hẳn dòng so sánh
    if (curV == null) return '<span class="mt-cmp"><span>Kỳ trước: ' + fmt(prevV) + unitTxt + '</span></span>';
    var d = curV - prevV;
    if (d === 0) return '<span class="mt-cmp">' + icon('check', 'ic14') + '<span>Bằng kỳ trước (' + fmt(prevV) + unitTxt + ')</span></span>';
    var good = (d > 0) === goodUp;
    return '<span class="mt-cmp ' + (good ? 'is-good' : 'is-bad') + '">' + icon(d > 0 ? 'up' : 'down', 'ic14') + '<span>' + (d > 0 ? 'Tăng ' : 'Giảm ') + '<span class="num">' + fmt(Math.abs(d)) + '</span>' + unitTxt + ' so với kỳ trước (' + fmt(prevV) + unitTxt + ')</span></span>';
  }
  function tile(k, label, ic, val, raw, sub, cmp) {
    return '<div class="mt-tile' + (k === 'pct' ? ' mt-tile-hero' : '') + '" data-k="' + k + '" data-val="' + esc(raw) + '"><div class="mt-tl">' + esc(label) + '</div>' +
      '<div class="mt-tv num">' + val + '</div><div class="mt-ts">' + sub + '</div>' + cmp + '</div>';
  }
  function block(title, ic, inner, cls) {
    return '<section class="card mt-block ' + (cls || '') + '"><h2 class="mt-h">' + esc(title) + '</h2>' + inner + '</section>';
  }
  function cell(title, inner) { return '<div class="mt-cell"><h3 class="mt-h3">' + esc(title) + '</h3>' + inner + '</div>'; }
  function empty(txt) { return '<p class="muted mt-none">' + esc(txt) + '</p>'; }

  // Đường cong mượt kiểu "monotone": đi qua đúng từng điểm, không vọt quá 100% hay dưới 0.
  function smoothPath(pts) {
    if (pts.length < 2) return '';
    var n = pts.length, d = [], m = [], k;
    for (k = 0; k < n - 1; k++) d.push((pts[k + 1][1] - pts[k][1]) / (pts[k + 1][0] - pts[k][0]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (k = 1; k < n - 1; k++) m[k] = d[k - 1] * d[k] <= 0 ? 0 : (d[k - 1] + d[k]) / 2;
    for (k = 0; k < n - 1; k++) {
      if (d[k] === 0) { m[k] = 0; m[k + 1] = 0; continue; }
      var a = m[k] / d[k], b = m[k + 1] / d[k], h = a * a + b * b;
      if (h > 9) { var t = 3 / Math.sqrt(h); m[k] = t * a * d[k]; m[k + 1] = t * b * d[k]; }
    }
    var f = function (v) { return Math.round(v * 10) / 10; };
    var out = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
    for (k = 0; k < n - 1; k++) {
      var dx = (pts[k + 1][0] - pts[k][0]) / 3;
      out += 'C' + f(pts[k][0] + dx) + ' ' + f(pts[k][1] + m[k] * dx) + ' ' + f(pts[k + 1][0] - dx) + ' ' + f(pts[k + 1][1] - m[k + 1] * dx) + ' ' + f(pts[k + 1][0]) + ' ' + f(pts[k + 1][1]);
    }
    return out;
  }

  function barChart(cols, r) {
    var n = cols.length, showNum = n <= 12, every = n > 12 ? 5 : 1, unitW = cols[0] && cols[0].day ? 'ngày' : 'tháng';
    // Trục dọc bắt đầu từ mức thấp nhất (làm tròn xuống 20) để thấy rõ lên xuống
    var minP = cols.reduce(function (m, c) { return c.pct != null && c.pct < m ? c.pct : m; }, 100);
    var y0 = 0;   // trục dọc luôn từ 0% đến 100%
    if (!cols.some(function (c) { return c.pct != null; })) return '<p class="muted mt-none">Chưa có số liệu</p>';
    var Y = function (v) { return (Math.min(100, Math.max(y0, v)) - y0) * 100 / (100 - y0); };
    // Ngày không có mục (cuối tuần, chưa tới) thì đường nối thẳng qua các điểm có số
    var seg = [];
    cols.forEach(function (c, i) { if (c.pct != null) seg.push([(i + 0.5) * 1000 / n, 100 - Y(c.pct)]); });
    var segs = seg.length ? [seg] : [];
    var lines = '', fills = '';
    segs.forEach(function (s) {
      var p = smoothPath(s);
      if (!p) return;
      fills += '<path class="mt-tfill" fill="url(#mt-tgrad)" d="' + p + 'L' + s[s.length - 1][0] + ' 100L' + s[0][0] + ' 100Z"/>';
      lines += '<path class="mt-tline" d="' + p + '"/>';
    });
    var svg = '<svg class="mt-trend" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="mt-tgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".22"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>' +
      '<rect class="mt-tband" x="0" y="0" width="1000" height="' + (100 - Y(80)) + '"/>' + fills + lines + '</svg>';
    var area = cols.map(function (c, i) {
      var has = c.pct != null, low = has && c.pct < 80;
      var aria = (c.day ? c.wd + ' ' : '') + c.label + ': ' + (has ? c.pct + '% (' + c.done + '/' + c.total + ')' : 'không có hạng mục');
      return '<button type="button" class="mt-col' + (c.now ? ' is-now' : '') + '" data-col="' + i + '" aria-label="' + esc(aria) + '" title="' + esc(aria) + '">' +
        (has ? '<span class="mt-dot' + (low ? ' is-low' : '') + (c.now ? ' is-now' : '') + '" style="bottom:' + Y(c.pct) + '%"></span>' +
          (low || showNum ? '<span class="mt-cv num' + (low ? ' is-low' : '') + '" style="' + (low ? 'top:calc(' + (100 - Y(c.pct)) + '% + 10px)' : 'bottom:calc(' + Y(c.pct) + '% + 9px)') + '">' + c.pct + '%</span>' : '') : '') +
        '</button>';
    }).join('');
    var labs = cols.map(function (c, i) {
      var show = n <= 12 || (c.day ? c.wd === 'T2' : i % every === 0);
      return '<span class="mt-cl' + (c.now ? ' is-now' : '') + '">' + (show ? (c.day && n <= 12 ? '<span class="mt-wd">' + c.wd + '</span>' : '') + '<span class="num">' + c.label + '</span>' : '') + '</span>';
    }).join('');
    var withPct = cols.filter(function (c) { return c.pct != null; }), hi = null, lo = null;
    withPct.forEach(function (c) { if (!hi || c.pct > hi.pct) hi = c; if (!lo || c.pct < lo.pct) lo = c; });
    // Trung bình cả kỳ = tổng mục xong / tổng mục (khớp ô Hoàn thành ở Tổng quan)
    var sumD = withPct.reduce(function (t, c) { return t + (c.done || 0); }, 0), sumT = withPct.reduce(function (t, c) { return t + (c.total || 0); }, 0);
    var avg = sumT ? Math.round(sumD * 100 / sumT) : null;
    var under = withPct.filter(function (c) { return c.pct < 80; }).length;
    var avgLine = avg == null ? '' : '<i class="mt-lavg" style="bottom:' + Y(avg) + '%"><span class="num">TB ' + avg + '%</span></i>';
    return '<div class="mt-chart is-trend" data-n="' + n + '" data-axis="' + (cols[0] && cols[0].day ? 'ngay' : 'thang') + '"><div class="mt-yax"><span>100%</span><span style="top:' + (100 - Y(80)) + '%">80%</span><span>' + '0%' + '</span></div>' +
      '<div class="mt-plot"><div class="mt-area">' + svg + '<i class="mt-l80" style="top:' + (100 - Y(80)) + '%"></i>' + avgLine + area + '</div><div class="mt-labs">' + labs + '</div></div></div>' +
      '<div class="mt-legend"><span><i class="mt-sw mt-sw-band"></i>≥ 80%</span><span><i class="mt-sw mt-sw-low"></i>Dưới 80%</span><span><i class="mt-sw mt-sw-avg"></i>Trung bình kỳ</span></div>' +
      (hi ? '<p class="muted mt-sum">Tốt nhất <span class="num">' + esc(hi.label) + '</span> (<span class="num">' + hi.pct + '%</span>), thấp nhất <span class="num">' + esc(lo.label) + '</span> (<span class="num">' + lo.pct + '%</span>). ' +
        (under ? '<span class="num">' + under + '</span> ' + unitW + ' dưới mốc 80%.' : 'Không ' + unitW + ' nào dưới mốc 80%.') + ' Bấm một điểm để xem chi tiết.</p>' : '');
  }

  function donut(a, total) {
    var segs = [['dung', 'Đúng hạn', a.dung.length, 'var(--cv-done)'], ['tre', 'Trễ', a.tre.length, 'var(--cv-over)'], ['mo', 'Còn mở', a.mo.length, 'var(--cv-doing)']];
    var R = 48, C = 2 * Math.PI * R, off = 0, arcs = '';
    segs.forEach(function (s) {
      if (!s[2]) return;
      var len = C * s[2] / total;
      arcs += '<circle cx="60" cy="60" r="' + R + '" fill="none" stroke="' + s[3] + '" stroke-width="16" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 60 60)"/>';
      off += len;
    });
    var pct = total ? Math.round(a.dung.length * 100 / total) : null;
    return '<div class="mt-donut"><svg viewBox="0 0 120 120" width="140" height="140" role="img" aria-label="Đúng hạn ' + (pct == null ? 0 : pct) + '%: ' + segs.map(function (s) { return s[1] + ' ' + s[2]; }).join(', ') + '">' +
      '<circle cx="60" cy="60" r="' + R + '" fill="none" stroke="var(--track)" stroke-width="16"/>' + arcs +
      '<text x="60" y="62" text-anchor="middle" class="mt-dpct">' + (pct == null ? '–' : pct + '%') + '</text><text x="60" y="80" text-anchor="middle" class="mt-dsub">đúng hạn</text></svg>' +
      '<ul class="mt-dleg">' + segs.map(function (s) {
        return '<li><button type="button" data-seg="' + s[0] + '"><i class="mt-sw" style="background:' + s[3] + '"></i><span>' + s[1] + '</span><span class="num mt-dn">' + s[2] + '</span></button></li>';
      }).join('') + '</ul></div>';
  }

  /* ---------- Vẽ cả màn ---------- */
  function nextWord(u) { return { week: 'Tuần', month: 'Tháng', quarter: 'Quý', year: 'Năm' }[u] || 'Kỳ'; }
  function review(r) {
    var rv = S().reviews.filter(function (x) { return x.period_type === r.unit && x.period_value === r.value; })[0] || {};
    function ta(name, label, ic, ph) { return '<label class="field"><span>' + icon(ic, 'ic14') + label + '</span><textarea class="textarea" name="' + name + '" rows="2" maxlength="600" placeholder="' + esc(ph) + '">' + esc(rv[name] || '') + '</textarea></label>'; }
    return '<form class="mt-review" data-review novalidate>' + ta('good', 'Làm tốt', 'sparkle', 'Điều làm tốt…') + ta('bad', 'Chưa tốt', 'alert', 'Điều cần đổi…') + ta('next', 'Kỳ sau ưu tiên', 'flag', nextWord(r.unit) + ' sau tập trung…') +
      '<button type="submit" class="btn btn-primary" data-save>' + icon('check') + '<span>Lưu nhìn lại</span></button></form>';
  }

  function render() {
    if (!root) return;
    var today = D.today(), r = range(st.unit, st.anchor), pr = range(st.unit, shift(st.unit, st.anchor, -1));
    var m = metrics(r), pm = metrics(pr), cols = columns(r, m), top = LP.stats.missedTop(r.from, r.to, 5);
    var a = adhocList(r), adTotal = a.dung.length + a.tre.length + a.mo.length, lv = levels(r);
    var ib = LP.stats.interruptions(r.from, r.to, st.unit === 'week' ? 'day' : st.unit === 'month' ? 'week' : 'month');
    var habits = LP.stats.habits(r.from, r.to);
    cur = { r: r, m: m, cols: cols, top: top, a: a, lv: lv, ib: ib, habits: habits };
    var isNow = r.from <= today && today <= r.to, canNext = r.to < today;

    var head = '<div class="page-head mt-head"><h1>Tổng kết</h1><div class="mt-switch" role="group" aria-label="Chọn kỳ">' + UNITS.map(function (u) {
      return '<button type="button" data-unit="' + u[0] + '" aria-pressed="' + (u[0] === st.unit) + '" class="' + (u[0] === st.unit ? 'on' : '') + '">' + u[1] + '</button>';
    }).join('') + '</div></div>' +
      '<div class="mt-nav"><button type="button" class="icon-btn" data-nav="-1" aria-label="Kỳ trước">' + icon('back') + '</button>' +
      '<div class="mt-period" aria-live="polite"><span class="mt-plabel">' + esc(r.label) + '</span>' + (isNow ? ' ' + LP.ui.pill('Đang diễn ra', 'note') : '') + '</div>' +
      '<button type="button" class="icon-btn mt-next" data-nav="1" aria-label="Kỳ sau"' + (canNext ? '' : ' disabled') + '>' + icon('back') + '</button></div>';

    var per = { week: 'Tuần', month: 'Tháng', quarter: 'Quý', year: 'Năm' }[st.unit] || 'Kỳ';
    var say = m.pct == null ? '' : '<p class="mt-say">' + per + ' này bạn xong <b class="num">' + m.pct + '%</b> việc' +
      (pm.total === 0 || pm.pct == null ? '' : m.pct > pm.pct ? ', <b class="mt-up">tốt hơn</b> kỳ trước' : m.pct < pm.pct ? ', <b class="mt-down">thấp hơn</b> kỳ trước' : ', bằng kỳ trước') +
      (m.missed ? '. Có <b class="num">' + m.missed + '</b> Daily bị sót.' : '. Không có Daily bị sót.') + '</p>';
    var b1 = block('Tổng quan', 'grid', say + '<div class="mt-tiles">' +
      tile('pct', 'Hoàn thành', 'check', m.pct == null ? '–' : m.pct + '%', m.pct == null ? '' : m.pct, m.total ? m.done + '/' + m.total + ' mục' : 'Chưa có số liệu', delta(m.pct, pm.pct, '%', true)) +
      tile('missed', 'Daily bị sót', 'alert', m.total ? String(m.missed) : '–', m.total ? m.missed : '', m.total ? (m.missed ? 'trong ' + m.missedDays + ' ngày' : 'Không bị sót') : 'Chưa có số liệu', m.total && pm.total ? delta(m.missed, pm.missed, '', false) : '') +
      tile('adhoc', 'Ad-hoc đúng hạn', 'flag', m.ad.done + '/' + m.ad.total, m.ad.done + '/' + m.ad.total, 'còn mở ' + m.adOpen, delta(m.ad.total ? Math.round(m.ad.done * 100 / m.ad.total) : null, pm.ad.total ? Math.round(pm.ad.done * 100 / pm.ad.total) : null, '%', true)) +
      tile('int', 'Chen ngang mỗi ngày', 'bolt', m.intAvg == null ? '–' : D.fmtMin(m.intAvg), m.intAvg == null ? '' : m.intAvg, m.intCount + ' lần, ' + D.fmtMin(m.intMin) + ' tổng', delta(m.intAvg, pm.intCount ? pm.intAvg : null, '', false, function (v) { return D.fmtMin(v); })) +
      '</div>');

    var b2 = block('Tỷ lệ hoàn thành công việc', 'barchart', barChart(cols, r));

    var missRows = top.length ? '<ol class="mt-rank">' + top.map(function (t, i) {
      return '<li><button type="button" data-miss="' + i + '"><span class="mt-rn num">' + (i + 1) + '</span><span class="mt-rt"><span class="mt-rtitle">' + LP.cute.html(t.title) + esc(t.title) + '</span><span class="muted">' + esc(t.routineName) + '</span>' +
        '<span class="bar14 mt-mini"><span class="b-warn" style="width:' + Math.round(t.count * 100 / top[0].count) + '%"></span></span></span><span class="num mt-rc">' + t.count + ' lần</span></button></li>';
    }).join('') + '</ol>' : (m.total ? '<p class="mt-good">' + LP.flowers.html('sakura', 22, 1) + 'Không có Daily bị sót</p>' : '<p class="muted mt-none">Chưa có Daily</p>');
    var b3 = block('Daily và Ad-hoc', 'list', '<div class="mt-two">' + cell('Daily hay bị sót', missRows) +
      cell('Ad-hoc có hạn trong kỳ', adTotal ? donut(a, adTotal) : empty('Chưa có Ad-hoc')) + '</div>');

    var maxL = Math.max.apply(null, lv.map(function (x) { return x.total; }).concat([1]));
    var stack = lv.some(function (x) { return x.total; }) ? '<ul class="mt-stack">' + lv.map(function (x) {
      var parts = [['rat-khan', 'rất khẩn'], ['khan', 'khẩn'], ['binh-thuong', 'bình thường']].filter(function (k) { return x[k[0]]; }).map(function (k) { return x[k[0]] + ' ' + k[1]; }).join(' · ');
      return '<li><button type="button" data-lvl="' + x.level + '"' + (x.total ? '' : ' class="is-zero"') + '><span class="mt-slab">' + LP.ui.importance(x.level) + '<span class="mt-sname">' + ['Bình thường', 'Quan trọng', 'Rất quan trọng'][x.level - 1] + '</span></span>' +
        '<span class="mt-sbody">' +
        '<span class="bar14 mt-sbar" style="width:' + (x.total ? Math.max(14, Math.round(x.total * 100 / maxL)) : 0) + '%">' +
        ['rat-khan', 'khan', 'binh-thuong'].map(function (k) { return x[k] ? '<span class="mt-u-' + k + '" style="flex:' + x[k] + '" title="' + x[k] + '"></span>' : ''; }).join('') +
        '</span><span class="mt-sparts">' + (parts || 'Chưa có việc') + '</span></span><span class="num mt-stot">' + x.total + ' việc</span></button></li>';
    }).join('') + '</ul><div class="mt-legend"><span><i class="mt-sw mt-u-rat-khan"></i>Rất khẩn</span><span><i class="mt-sw mt-u-khan"></i>Khẩn</span><span><i class="mt-sw mt-u-binh-thuong"></i>Bình thường</span></div>' : empty('Chưa có việc');
    var maxI = Math.max.apply(null, ib.map(function (x) { return x.minutes; }).concat([1]));
    var intRows = ib.some(function (x) { return x.count; }) ? '<ul class="mt-hbars">' + ib.map(function (x, i) {
      var lab = st.unit === 'week' ? D.weekdayShort(x.from) + ' ' + D.fmt(x.from) : st.unit === 'month' ? D.fmt(x.from) + (x.to !== x.from ? '–' + D.fmt(x.to) : '') : x.label;
      return '<li><button type="button" data-int="' + i + '"' + (x.count ? '' : ' class="is-zero"') + '><span class="mt-hl num">' + esc(lab) + '</span><span class="mt-ht"><span class="mt-hf" style="width:' + (x.minutes ? Math.max(3, Math.round(x.minutes * 100 / maxI)) : 0) + '%"></span></span><span class="num mt-hv">' + (x.count ? D.fmtMin(x.minutes) : '0') + '</span></button></li>';
    }).join('') + '</ul>' : empty('Không có Chen ngang');
    var b4 = block('Mức quan trọng và Chen ngang', 'hourglass', '<div class="mt-two">' + cell('Mức quan trọng và mức khẩn', stack) + cell('Chen ngang theo ' + (st.unit === 'week' ? 'ngày' : st.unit === 'month' ? 'tuần' : 'tháng'), intRows) + '</div>');

    var hab = habits.length ? '<ul class="mt-habs">' + habits.map(function (x, i) {
      return '<li><button type="button" data-hab="' + i + '" data-id="' + esc(x.habit.id) + '">' + ring(x.pct, LP.stats.level(x.pct) || 'warn') +
        '<span class="mt-rt"><span class="mt-rtitle">' + esc(x.habit.name) + '</span><span class="muted"><span class="num mt-hdone">' + x.done + '/' + x.expected + '</span> ngày</span></span>' +
        (x.streak ? '<span class="mt-streak on">' + icon('flame', 'ic18') + '<span class="num">' + x.streak + '</span></span>' : '') + '</button></li>';
    }).join('') + '</ul>' : empty('Chưa có thói quen') + '<button type="button" class="btn mt-addhab" data-addhab>' + icon('plus') + 'Thêm thói quen</button>';
    var b5 = block('Thói quen', 'leaf', hab);
    var b6 = block('Nhìn lại ' + r.label.toLowerCase(), 'list', review(r));

    // Kỳ trống (không lượt Daily, việc, Chen ngang, lượt thói quen): gộp một dòng, ẩn các khối biểu đồ, giữ Nhìn lại
    var noData = !m.total && !tasksIn(r).length && !m.intCount && !habits.some(function (x) { return x.done > 0; });
    if (noData) {
      b1 = block('Tổng quan', 'grid', empty('Kỳ này chưa có số liệu'));
      root.innerHTML = '<section class="mt-page mt-tk is-empty">' + head + b1 + b6 + '</section>';
    } else root.innerHTML = '<section class="mt-page mt-tk">' + head + b1 + b2 + b3 + b4 + b5 + b6 + '</section>';
  }

  /* ---------- Chi tiết trong tấm trượt ---------- */
  function listHtml(rows, emptyTxt) {
    if (!rows.length) return '<p class="muted">' + esc(emptyTxt || 'Không có gì') + '</p>';
    return '<ul class="mt-dlist">' + rows.map(function (x) {
      return '<li><span class="mt-dmain">' + esc(x[0]) + '</span>' + (x[1] ? '<span class="muted">' + esc(x[1]) + '</span>' : '') + (x[2] ? LP.ui.pill(x[2][0], x[2][1]) : '') + '</li>';
    }).join('') + '</ul>';
  }
  var STATUS = { done: ['Xong', 'ok'], skipped: ['Bỏ qua', 'plain'], carried: ['Mang sang', 'note'] };
  function taskRows(list) {
    return list.map(function (t) {
      return [t.title, (t.kind === 'adhoc' ? 'Ad-hoc' : 'Personal') + (t.due_date ? ', hạn ' + D.fmt(t.due_date) : ''), t.status === 'done' ? ['Xong', 'ok'] : null];
    });
  }
  function openCol(c) {
    var html = '<p class="mt-dsum"><span class="num">' + c.done + '</span> xong, <span class="num">' + c.missed + '</span> bị sót trên <span class="num">' + c.total + '</span> mục' + (c.pct == null ? '' : ' (<span class="num">' + c.pct + '%</span>)') + '.</p>';
    if (c.day) {
      var rows = [];
      LP.logic.routines.runsFor(c.from).forEach(function (run) {
        run.items.forEach(function (m) { rows.push([m.item.title, m.routine.name, STATUS[m.status] || ['Bỏ sót', 'missed']]); });
      });
      LP.logic.tasks.tasksFor(c.from).forEach(function (x) { rows.push([x.title, x.task.kind === 'canhan' ? 'Personal' : 'Ad-hoc', x.done ? ['Xong', 'ok'] : ['Chưa xong', 'plain']]); });
      html += listHtml(rows, 'Không có mục');
    } else {
      var t = LP.stats.missedTop(c.from, c.to, 8);
      html += '<h3 class="mt-h3">Hay bị sót trong tháng</h3>' + listHtml(t.map(function (x) { return [x.title, x.routineName, [x.count + ' lần', 'missed']]; }), 'Không có Daily bị sót');
    }
    LP.ui.sheet('Hoàn thành ' + (c.day ? c.wd + ' ' : '') + (c.day ? D.fmt(c.from) : c.label), html);
  }

  function onClick(e) {
    var t = e.target.closest('[data-unit],[data-nav],[data-col],[data-addhab],[data-miss],[data-seg],[data-lvl],[data-int],[data-hab]');
    if (!t || !cur) return;
    if (t.hasAttribute('data-unit')) { st.unit = t.getAttribute('data-unit'); saveUnit(st.unit); st.anchor = D.today(); render(); }
    else if (t.hasAttribute('data-nav')) { var a = shift(st.unit, st.anchor, +t.getAttribute('data-nav')); if (+t.getAttribute('data-nav') > 0 && range(st.unit, st.anchor).to >= D.today()) return; st.anchor = a; render(); }
    else if (t.hasAttribute('data-col')) openCol(cur.cols[+t.getAttribute('data-col')]);
    else if (t.hasAttribute('data-addhab')) LP.thoiQuen.openForm();
    else if (t.hasAttribute('data-miss')) {
      var x = cur.top[+t.getAttribute('data-miss')];
      LP.ui.sheet('Daily bị sót: ' + x.title, '<p class="muted">' + esc(x.routineName) + ', <span class="num">' + x.count + '</span> lần.</p>' + listHtml(x.dates.map(function (d) { return [D.weekdayName(d) + ' ' + D.fmt(d), '', ['Bỏ sót', 'missed']]; })));
    } else if (t.hasAttribute('data-seg')) {
      var k = t.getAttribute('data-seg'), names = { dung: 'Ad-hoc đúng hạn', tre: 'Ad-hoc trễ (xong trễ hoặc quá hạn chưa xong)', mo: 'Ad-hoc còn mở' };
      LP.ui.sheet(names[k], listHtml(taskRows(cur.a[k]), 'Không có việc'));
    } else if (t.hasAttribute('data-lvl')) {
      var l = cur.lv[+t.getAttribute('data-lvl') - 1];
      LP.ui.sheet('Mức quan trọng ' + l.level + ': ' + l.total + ' việc', listHtml(l.list.map(function (x) {
        var u = urgOf(x); return [x.title, (x.kind === 'adhoc' ? 'Ad-hoc' : 'Personal') + (x.due_date ? ', hạn ' + D.fmt(x.due_date) : ''), u === 'rat-khan' ? ['Rất khẩn', 'late'] : u === 'khan' ? ['Khẩn', 'missed'] : null];
      }), 'Không có việc'));
    } else if (t.hasAttribute('data-int')) {
      var b = cur.ib[+t.getAttribute('data-int')];
      var rows = S().interruptions.filter(function (i) { return i.date >= b.from && i.date <= b.to; }).sort(function (p, q) { return p.date < q.date ? -1 : 1; })
        .map(function (i) { return [i.title, D.weekdayShort(i.date) + ' ' + D.fmt(i.date), [D.fmtMin(num(i.duration_min)), 'plain']]; });
      LP.ui.sheet('Chen ngang ' + D.fmt(b.from) + (b.to !== b.from ? ' – ' + D.fmt(b.to) : ''), listHtml(rows, 'Không có Chen ngang'));
    } else if (t.hasAttribute('data-hab')) {
      var h = cur.habits[+t.getAttribute('data-hab')], today = D.today(), last = cur.r.to < today ? cur.r.to : today, rows2 = [];
      if (cur.r.from <= last) D.range(cur.r.from, last).forEach(function (d) {
        if (LP.stats.habitDue(h.habit, d)) rows2.push([D.weekdayShort(d) + ' ' + D.fmt(d), '', LP.stats.habitDone(h.habit, d) ? ['Đã làm', 'ok'] : ['Chưa làm', 'undone']]);
      });
      LP.ui.sheet(h.habit.name, '<p class="mt-dsum"><span class="num">' + h.done + '/' + h.expected + '</span> ngày, chuỗi hiện tại <span class="num">' + h.streak + '</span>, dài nhất trong kỳ <span class="num">' + h.best + '</span>.</p>' + listHtml(rows2.reverse(), 'Chưa có ngày nào'));
    }
  }
  function onSubmit(e) {
    var f = e.target.closest('[data-review]');
    if (!f) return;
    e.preventDefault();
    var r = cur.r, old = S().reviews.filter(function (x) { return x.period_type === r.unit && x.period_value === r.value; })[0];
    LP.store.upsert('Reviews', Object.assign({}, old || {}, { period_type: r.unit, period_value: r.value, good: f.elements['good'].value.trim(), bad: f.elements['bad'].value.trim(), next: f.elements['next'].value.trim() }));
    var what = r.unit === 'month' ? 'tháng ' + parseInt(String(r.value).slice(5, 7), 10) : r.label.toLowerCase();
    LP.ui.toast('Đã lưu nhìn lại ' + what, { cheer: true });
    var b = f.querySelector('[data-save]');
    if (b) { b.disabled = true; b.querySelector('span').textContent = 'Đã lưu'; setTimeout(function () { if (b.isConnected) { b.disabled = false; b.querySelector('span').textContent = 'Lưu nhìn lại'; } }, 2000); }
  }

  function mount(el) {
    root = el; st.unit = loadUnit(); st.anchor = D.today();
    el.onclick = onClick; el.onsubmit = onSubmit;
    onChange = function (d) { if (root && root.isConnected && !(d && d.sheet === 'Reviews')) render(); };
    LP.store.on('change', onChange);
    render();
  }
  function unmount() {
    if (onChange) LP.store.off('change', onChange);
    if (root) { root.onclick = null; root.onsubmit = null; }
    root = null; onChange = null; cur = null;
  }

  LP.router.register('tong-ket', { title: 'Tổng kết', mount: mount, unmount: unmount });
  return { range: range, metrics: metrics, adhocList: adhocList, levels: levels, state: function () { return st; } };
})();

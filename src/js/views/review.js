/* Tab Tổng kết: kỳ Ngày / Tuần / Tháng / Năm, chỉ số, biểu đồ đường tỷ lệ hoàn thành, cột % từng mục tiêu, tổng kết thói quen, review có mức hài lòng */
var App = window.App || (window.App = {});
App.views = App.views || {};

App.views.charts = (function () {
  var esc = App.util.esc;
  var GROUP_VAR = { 'Công việc': '--cv-work', 'Học tập': '--cv-study', 'Sức khỏe': '--cv-health' };

  // Bề ngang chỗ vẽ: đo theo khung nội dung hiện tại (thẻ có lề 18px mỗi bên)
  function width() {
    var v = document.getElementById('view');
    var w = v ? v.clientWidth - 32 : 340;
    if (window.innerWidth >= 900) w = Math.min(w, 1088) / 2 - 14;
    return Math.max(220, Math.round(w - 36));
  }

  // Đường cong mượt qua các điểm, không vọt quá đỉnh / đáy (nội suy đơn điệu)
  function smooth(P) {
    if (P.length < 3) return P.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var n = P.length, dx = [], m = [], t = [];
    for (var i = 0; i < n - 1; i++) { dx[i] = P[i + 1][0] - P[i][0]; m[i] = (P[i + 1][1] - P[i][1]) / dx[i]; }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : 3 * (dx[i - 1] + dx[i]) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
    var d = 'M' + P[0][0].toFixed(1) + ' ' + P[0][1].toFixed(1);
    for (i = 0; i < n - 1; i++) {
      var h = dx[i] / 3;
      d += ' C' + (P[i][0] + h).toFixed(1) + ' ' + (P[i][1] + h * t[i]).toFixed(1) + ' ' + (P[i + 1][0] - h).toFixed(1) + ' ' + (P[i + 1][1] - h * t[i + 1]).toFixed(1) + ' ' + P[i + 1][0].toFixed(1) + ' ' + P[i + 1][1].toFixed(1);
    }
    return d;
  }

  /* Biểu đồ đường tỷ lệ hoàn thành (0 đến 100%). pts: [{label, tip, pct (null = không có việc có hạn), done, due, future}] */
  function line(pts, opt) {
    var W = width(), H = 210, ml = 40, mr = 14, mt = 18, mb = 30;
    var iw = W - ml - mr, ih = H - mt - mb;
    var x = function (i) { return ml + (pts.length === 1 ? iw / 2 : i * iw / (pts.length - 1)); };
    var y = function (v) { return mt + ih - v / 100 * ih; };
    var svg = '<svg class="chart-svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opt.aria) + '">';
    for (var k = 0; k <= 4; k++) {
      var gy = y(k * 25);
      svg += '<line class="ch-grid' + (k ? '' : ' ch-base') + '" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + gy + '" y2="' + gy + '"/>' +
        '<text class="ch-ylab" x="' + (ml - 8) + '" y="' + (gy + 4) + '" text-anchor="end">' + k * 25 + '%</text>';
    }
    var every = pts.length > 12 ? Math.ceil(pts.length / Math.max(4, Math.floor(iw / 44))) : 1;
    pts.forEach(function (p, i) {
      var last = pts.length - 1;
      if (i !== last && (i % every || last - i < every / 2)) return;
      svg += '<text class="ch-xlab" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(p.label) + '</text>';
    });
    var P = [];
    pts.forEach(function (p, i) { if (!p.future && p.pct !== null) P.push([x(i), y(p.pct), p.pct, i]); });
    if (P.length) {
      var d = smooth(P);
      svg += '<path class="ch-area" d="' + d + ' L' + P[P.length - 1][0].toFixed(1) + ' ' + y(0) + ' L' + P[0][0].toFixed(1) + ' ' + y(0) + 'Z"/>';
      svg += '<path class="ch-line" d="' + d + '"/>';
      P.forEach(function (q, j) { if (P.length <= 14 || j === P.length - 1) svg += '<circle class="ch-dot" cx="' + q[0] + '" cy="' + q[1] + '" r="4"/>'; });
      var lastP = P[P.length - 1];
      svg += '<text class="ch-val" x="' + Math.min(lastP[0], W - mr - 14) + '" y="' + Math.max(12, lastP[1] - 10) + '" text-anchor="middle">' + lastP[2] + '%</text>';
    }
    var band = pts.length === 1 ? iw : iw / (pts.length - 1);
    pts.forEach(function (p, i) {
      var tip = p.tip + ': ' + (p.future ? 'chưa tới' : p.pct === null ? 'không có việc có hạn' : p.pct + '% (xong ' + p.done + '/' + p.due + ' việc)');
      svg += '<rect class="ch-hit" x="' + Math.max(0, x(i) - band / 2) + '" y="' + mt + '" width="' + band + '" height="' + ih + '"' +
        ' data-tip="' + esc(tip) + '" data-cx="' + x(i) + '" data-cy="' + (p.future || p.pct === null ? '' : y(p.pct)) + '"/>';
    });
    svg += '<line class="ch-cross" x1="0" x2="0" y1="' + mt + '" y2="' + (mt + ih) + '" hidden/>';
    svg += '<circle class="ch-dot ch-hover" r="5" cx="0" cy="0" hidden/>';
    return '<div class="chart" data-chart>' + svg + '</svg><div class="chart-tip" hidden></div></div>';
  }

  /* Biểu đồ thanh % từng mục tiêu, xếp theo nhóm, tô theo màu nhóm */
  function goalBars(items) {
    var order = App.C.GROUPS.map(function (g) { return g.key; });
    items = items.slice().sort(function (a, b) {
      var ga = order.indexOf(a.goal.group), gb = order.indexOf(b.goal.group);
      return ga !== gb ? (ga < 0 ? 9 : ga) - (gb < 0 ? 9 : gb) : b.pct - a.pct;
    });
    var used = order.filter(function (k) { return items.some(function (x) { return x.goal.group === k; }); });
    var legend = '<ul class="ch-legend">' + used.map(function (k) {
      var n = items.filter(function (x) { return x.goal.group === k; }).length;
      return '<li><i style="background:var(' + GROUP_VAR[k] + ')"></i>' + esc(k) + ' <span class="num">' + n + '</span></li>';
    }).join('') + '</ul>';
    // Biểu đồ cột đứng: mỗi cột một mục tiêu, nhiều mục tiêu thì vuốt ngang trong khung
    return legend + '<div class="gcols-wrap"><ul class="gcols">' + items.map(function (x) {
      var g = x.goal, c = GROUP_VAR[g.group] || '--muted', m = App.comp.groupMeta(g.group);
      var tip = g.name + ': ' + x.pct + '%' + (x.approx ? ' (số hiện tại)' : '');
      return '<li><button type="button" class="gcol" data-action="open-goal" data-id="' + esc(g.id) + '" title="' + esc(tip) + '" aria-label="' + esc(tip) + '">' +
        '<span class="num gcol-val">' + x.pct + '%' + (x.approx ? '<sup>*</sup>' : '') + '</span>' +
        '<span class="gcol-track"><span class="gcol-fill" style="height:' + x.pct + '%;background:var(' + c + ')"></span></span>' +
        '<span class="gcol-name">' + App.ui.icon(m.icon, 'ic14') + '<span>' + esc(g.name) + '</span></span></button></li>';
    }).join('') + '</ul></div>';
  }

  // Chú thích nổi khi rê chuột hoặc chạm vào biểu đồ
  function bind() {
    function show(hit) {
      var box = hit.closest('[data-chart]'), tip = box && box.querySelector('.chart-tip');
      if (!tip) return;
      var cx = +hit.getAttribute('data-cx'), cy = hit.getAttribute('data-cy');
      var cross = box.querySelector('.ch-cross'), dot = box.querySelector('.ch-hover');
      cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.removeAttribute('hidden');
      if (cy !== '') { dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.removeAttribute('hidden'); } else dot.setAttribute('hidden', '');
      tip.textContent = hit.getAttribute('data-tip');
      tip.hidden = false;
      var bw = box.clientWidth, tw = tip.offsetWidth;
      tip.style.left = Math.max(0, Math.min(bw - tw, cx - tw / 2)) + 'px';
    }
    function hide(box) {
      if (!box) return;
      var tip = box.querySelector('.chart-tip');
      if (tip) tip.hidden = true;
      box.querySelectorAll('.ch-cross,.ch-hover').forEach(function (el) { el.setAttribute('hidden', ''); });
    }
    document.addEventListener('pointermove', function (e) {
      var hit = e.target.closest && e.target.closest('.ch-hit');
      if (hit) show(hit);
    });
    document.addEventListener('pointerout', function (e) {
      var box = e.target.closest && e.target.closest('[data-chart]');
      if (box && !box.contains(e.relatedTarget)) hide(box);
    });
  }

  return { line: line, goalBars: goalBars, bind: bind, width: width };
})();
App.views.charts.bind();

/* Việc đột xuất 14 ngày gần nhất (GĐ6): trung bình mỗi ngày làm việc, gợi ý % dự phòng cho sát thực tế */
App.views.intrStat = function (state, today) {
  var L = App.logic, icon = App.ui.icon, x = App.plan.interruptionStats(state, today), f = L.fmtMin;
  var body = x.count
    ? '<p class="is-main"><span class="num is-big">' + f(x.avg) + '</span> mỗi ngày làm việc</p>' +
      '<p class="muted">' + '<span class="num">' + x.count + '</span> việc, tổng <span class="num">' + f(x.sum) + '</span> trong <span class="num">' + x.days + '</span> ngày làm việc (từ <span class="num">' + App.date.fmt(x.from).slice(0, 5) + '</span>).</p>' +
      '<p class="info-line">' + icon('sparkle', 'ic14') + '<span>Dự phòng đang đặt <span class="num">' + x.currentPct + '%</span> (khoảng <span class="num">' + f(x.net * x.currentPct / 100) + '</span> mỗi ngày). ' +
      (x.count < 5 ? 'Ghi thêm việc đột xuất vài ngày nữa (ít nhất 5 việc) để web gợi ý % dự phòng sát thực tế.' : Math.abs(x.suggestPct - x.currentPct) < 5 ? 'Khớp với thực tế, giữ nguyên.' : 'Theo số thực tế, nên đặt khoảng <b class="num">' + x.suggestPct + '%</b>. Đổi ở Cài đặt, mục Quỹ giờ.') + '</span></p>'
    : '<p class="muted">Chưa ghi việc đột xuất nào trong 14 ngày gần nhất. Mỗi khi có việc chen ngang, bấm nút Đột xuất ở Agenda để ghi lại.</p>';
  return '<section class="card intr-stat" aria-labelledby="is-title"><h2 id="is-title" class="ov-h">' + icon('bolt', 'ic14') + ' Việc đột xuất, 14 ngày gần nhất</h2>' + body + '</section>';
};

App.views.review = function (state, ui) {
  var S = App.summary, L = App.logic, D = App.date, P = App.period, esc = App.util.esc, icon = App.ui.icon, fl = App.flowers.html, Ch = App.views.charts;
  var today = D.today();
  var type = S.TYPES.indexOf(ui.revType) >= 0 ? ui.revType : 'Tuần';
  var cur = S.current(type, today);
  var value = ui.revValue && P.range(type, ui.revValue) && ui.revValue <= cur ? ui.revValue : cur;
  var s = S.build(state, type, value, today);
  var isDay = type === 'Ngày';
  var range = isDay ? D.weekday(s.start) : s.start.slice(0, 4) === s.end.slice(0, 4) && type !== 'Năm' ? D.fmt(s.start).slice(0, 5) + ' đến ' + D.fmt(s.end) : D.fmt(s.start) + ' đến ' + D.fmt(s.end);
  var ICONS = { 'Ngày': 'sun', 'Tuần': 'list', 'Tháng': 'calendar', 'Năm': 'grid' };
  var inPeriod = { 'Ngày': 'trong ngày', 'Tuần': 'trong tuần', 'Tháng': 'trong tháng', 'Năm': 'trong năm' }[type];

  var html = '<div class="page-head"><h1>' + fl('sunflower', 30, 4) + 'Tổng kết</h1></div>';
  html += '<div class="habit-bar rev-bar"><span class="seg-switch" role="group" aria-label="Loại kỳ">' +
    S.TYPES.map(function (t) {
      return '<button type="button" data-action="rev-type" data-type="' + t + '" aria-pressed="' + (t === type) + '"' + (t === type ? ' class="on"' : '') + '>' +
        icon(ICONS[t] === 'sun' ? 'calcheck' : ICONS[t], 'ic14') + t + '</button>';
    }).join('') + '</span><span class="habit-nav">' +
    '<button type="button" class="round" data-action="rev-shift" data-dir="-1" aria-label="' + type + ' trước">' + icon('back', 'ic18') + '</button>' +
    '<span class="habit-range"><strong>' + App.util.numify(P.label(type, value)) + '</strong><small>' + App.util.numify(range) + '</small></span>' +
    '<button type="button" class="round" data-action="rev-shift" data-dir="1" aria-label="' + type + ' sau"' + (value >= cur ? ' disabled' : '') + '>' + icon('back', 'ic18 flip') + '</button>' +
    '</span></div>';

  // Các con số chính
  function stat(ic, big, label, sub) {
    return '<li class="card stat"><span class="stat-ic">' + icon(ic, 'ic18') + '</span><span class="stat-big num">' + big + '</span>' +
      '<span class="stat-label">' + label + '</span>' + (sub ? '<span class="stat-sub">' + sub + '</span>' : '') + '</li>';
  }
  html += '<ul class="stats stats4">' +
    stat('chart', s.ratePct === null ? '–' : s.ratePct + '%', 'tỷ lệ hoàn thành',
      s.dueAll ? 'xong <span class="num">' + s.dueDone + '/' + s.dueAll + '</span> việc có hạn' : 'Chưa có việc nào đến hạn') +
    stat('check', s.doneCount, 'việc đã xong', inPeriod) +
    stat('clock', s.onTimePct === null ? '–' : s.onTimePct + '%', 'xong đúng hạn',
      s.withDue ? '<span class="num">' + s.onTime + '/' + s.withDue + '</span> việc có hạn' : 'Chưa có việc có hạn nào xong') +
    stat('target', s.avg === null ? '–' : s.avg + '%', 'trung bình mục tiêu',
      s.goals.length ? '<span class="num">' + s.goals.length + '</span> mục tiêu trong kỳ' : 'Không có mục tiêu trong kỳ') +
    '</ul>';
  html += App.views.intrStat(state, today);
  // Kỳ Ngày: biểu đồ tổng quan của ngày (GĐ6 chuyển từ Agenda sang đây)
  if (isDay) html += App.views.overview(L.dayStats2(L.dayList(state.tasks, value).concat(L.overdueList(state.tasks, value)), value), 'ngày <span class="num">' + D.fmt(value) + '</span>');

  // Biểu đồ đường mượt: tỷ lệ hoàn thành theo mốc (gộp theo Ngày / Tuần / Tháng, không lớn hơn kỳ)
  var grans = S.GRANS[type], gran = grans.indexOf(ui.revChart) >= 0 ? ui.revChart : S.GRAN_DEFAULT[type];
  var GN = { day: 'Ngày', week: 'Tuần', month: 'Tháng' };
  var cStart = isDay ? D.addDays(s.start, -6) : s.start;
  var WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  var pts = S.rate(state, cStart, s.end, gran, today).map(function (b) {
    var wd = WD[D.parse(b.start).getUTCDay()];
    var label = gran === 'month' ? 'Th' + (+b.start.slice(5, 7)) : gran === 'week' ? 'T' + b.week
      : type === 'Tháng' ? String(+b.start.slice(8)) : type === 'Năm' ? D.fmt(b.start).slice(0, 5) : wd;
    var tip = gran === 'month' ? 'Tháng ' + b.start.slice(5, 7) + '/' + b.start.slice(0, 4)
      : gran === 'week' ? 'Tuần ' + b.week + ' (' + D.fmt(b.start).slice(0, 5) + ' đến ' + D.fmt(b.end).slice(0, 5) + ')' : wd + ' ' + D.fmt(b.start).slice(0, 5);
    return { label: label, tip: tip, pct: b.pct, done: b.done, due: b.due, future: b.future };
  });
  var any = pts.some(function (p) { return !p.future && p.pct !== null; });
  html += '<div class="rev-cols"><section class="block" aria-labelledby="rv-line"><h2 class="sec-title" id="rv-line">' + fl('sprig', 24, 1) + '<span>Tỷ lệ hoàn thành</span>' +
    (grans.length > 1 ? '<span class="seg-switch" role="group" aria-label="Gộp theo">' + grans.map(function (g) {
      return '<button type="button" data-action="rev-chart" data-chart="' + g + '" aria-pressed="' + (g === gran) + '"' + (g === gran ? ' class="on"' : '') + '>' + GN[g] + '</button>';
    }).join('') + '</span>' : '') +
    '</h2><div class="card chart-card">' +
    (any ? '' : '<p class="muted chart-empty">Chưa có việc nào đến hạn trong khoảng này.</p>') +
    Ch.line(pts, { aria: 'Biểu đồ tỷ lệ hoàn thành theo ' + GN[gran].toLowerCase() + ', ' + P.label(type, value) + (s.ratePct === null ? '' : ', cả kỳ ' + s.ratePct + '%') }) +
    '<p class="hint">' + icon('sparkle', 'ic14') + 'Mỗi điểm = số việc đã xong / số việc có hạn trong ' + GN[gran].toLowerCase() + ' đó.' + (isDay ? ' Kỳ Ngày hiện 7 ngày tính đến ngày đang xem.' : '') + '</p>' +
    '<details class="ch-table"><summary>' + icon('list', 'ic14') + 'Xem bảng số liệu</summary><table><thead><tr><th>' + GN[gran] + '</th><th>Xong / có hạn</th><th>Tỷ lệ</th></tr></thead><tbody>' +
    pts.map(function (p) {
      return '<tr><td>' + App.util.numify(p.tip) + '</td><td class="num">' + (p.future ? '–' : p.done + '/' + p.due) + '</td><td class="num">' + (p.future || p.pct === null ? '–' : p.pct + '%') + '</td></tr>';
    }).join('') + '</tbody></table></details></div></section>';

  // Cột % từng mục tiêu trong kỳ
  html += '<section class="block" aria-labelledby="rv-bars"><h2 class="sec-title" id="rv-bars">' + fl('tulip', 24, 6) + '<span>Tiến độ mục tiêu</span>' +
    (s.goals.length ? '<span class="badge num">' + s.goals.length + '</span>' : '') + '</h2>' +
    (s.goals.length
      ? '<div class="card chart-card">' + Ch.goalBars(s.goals) + '<p class="hint">' + icon('sparkle', 'ic14') + 'Mục tiêu có thời gian chạm vào kỳ này, trừ mục tiêu Tạm dừng. Số % tính đến ' + (s.end < today ? 'cuối kỳ' : 'hôm nay') + '. Bấm vào cột để mở mục tiêu.' +
        (s.goals.some(function (x) { return x.approx; }) ? ' Dấu * là mục tiêu theo chỉ số đã cập nhật sau kỳ này, đang hiện số hiện tại.' : '') + '</p></div>'
      : App.views.emptyCard('Không có mục tiêu nào trong ' + App.util.numify(P.label(type, value)) + '.', 'Mục tiêu có ngày bắt đầu đến ngày kết thúc chạm vào kỳ này sẽ hiện ở đây.')) +
    '</section></div>';

  // Tổng kết thói quen
  html += '<section class="block" aria-labelledby="rv-hab"><h2 class="sec-title" id="rv-hab">' + fl('daisy', 24, 2) + '<span>Thói quen</span>' +
    (s.habits.length ? '<span class="badge num">' + s.habits.length + '</span>' : '') + '</h2>' +
    (s.habits.length
      ? '<ul class="card hsum">' + s.habits.map(function (x) {
        var pct = x.pct === null ? 0 : x.pct;
        return '<li><div class="hsum-top"><a class="hsum-name" href="#/thoi-quen">' + esc(x.habit.name) + (L.habitActive(x.habit) ? '' : ' <span class="muted">(tạm dừng)</span>') + '</a>' +
          '<span class="hsum-fig">đã làm <span class="num">' + x.did + '/' + x.need + '</span> ngày</span></div>' +
          App.comp.progressBar(pct) + '<div class="hsum-streak">' + App.views.habitParts.streakLine(x.streak) + '</div></li>';
      }).join('') + '</ul><p class="hint">' + icon('sparkle', 'ic14') + 'Số ngày đã tick / số ngày cần làm trong kỳ, tính đến hôm nay. Chuỗi là chuỗi hiện tại.</p>'
      : '<p class="muted soon-none">Kỳ này không có thói quen nào cần làm.</p>') + '</section>';

  // Review có mức hài lòng
  var rv = S.findReview(state.reviews, type, value) || {};
  function area(name, ic, label, ph) {
    return '<label class="field"><span>' + icon(ic, 'ic14') + label + '</span><textarea class="textarea" id="rv-' + name + '" name="' + name + '" maxlength="2000" placeholder="' + ph + '">' + esc(rv[name] || '') + '</textarea></label>';
  }
  var lv = +rv.rating || 0;
  var rating = '<fieldset class="field rating"><legend>' + icon('flower', 'ic14') + 'Mức hài lòng <small class="muted">(hoa càng tươi càng hài lòng)</small></legend><div class="rt-list">' +
    [1, 2, 3, 4, 5].map(function (n) {
      return '<label class="rt"><input type="radio" name="rating" value="' + n + '"' + (n === lv ? ' checked' : '') + '>' +
        App.views.bloom(n, 44) + '<span class="rt-lbl"><span class="num">' + n + '</span> ' + App.views.BLOOM_LABELS[n] + '</span></label>';
    }).join('') + '</div></fieldset>';
  var fields = isDay
    ? area('next', 'flag', 'Cần chú ý gì cho hôm sau?', 'Sẽ hiện ở đầu Agenda ngày hôm sau') +
      area('good', 'heart', 'Hôm nay có gì muốn chia sẻ?', 'Điều vui, điều học được, điều muốn nhớ')
    : area('good', 'heart', 'Làm tốt gì?', 'Điều mình hài lòng trong kỳ này') +
      area('bad', 'alert', 'Chưa tốt gì? Cần cải thiện gì?', 'Sẽ hiện ở Agenda suốt kỳ sau') +
      area('next', 'flag', 'Kỳ sau ưu tiên gì?', 'Một đến ba việc quan trọng nhất kỳ sau');
  var note = isDay ? 'Phần "Cần chú ý" sẽ hiện ở đầu Agenda ngày ' + D.fmt(D.addDays(value, 1)) + '.'
    : type === 'Năm' ? '' : 'Phần "Chưa tốt" và "Kỳ sau ưu tiên" sẽ hiện ở Agenda mọi ngày của ' + type.toLowerCase() + ' sau, bấm Ẩn để tắt.';
  html += '<section class="block" aria-labelledby="rv-note"><h2 class="sec-title" id="rv-note">' + fl('daisy', 24, 5) + '<span>Review ' + App.util.numify(P.label(type, value)) + '</span></h2>' +
    '<form class="card review-form" data-form="review" data-type="' + type + '" data-value="' + esc(value) + '" novalidate>' + rating + fields +
    (note ? '<p class="hint">' + icon('bell', 'ic14') + '<span>' + App.util.numify(note) + '</span></p>' : '') +
    '<div class="review-foot"><span class="muted review-when">' + (rv.updated_at ? 'Đã lưu lúc ' + App.util.numify(rv.updated_at.slice(11, 16) + ' ' + D.fmt(rv.updated_at.slice(0, 10))) : 'Chưa có review cho kỳ này.') + '</span>' +
    '<button type="submit" class="btn btn-primary">' + icon('check', 'ic18') + 'Lưu review</button></div></form></section>';

  // Các review đã lưu, mới nhất trước
  var ORDER = { 'Ngày': 0, 'Tuần': 1, 'Tháng': 2, 'Năm': 3 };
  var saved = state.reviews.filter(function (x) { return S.TYPES.indexOf(x.period_type) >= 0 && P.range(x.period_type, x.period_value); })
    .sort(function (a, b) { return P.range(b.period_type, b.period_value).end.localeCompare(P.range(a.period_type, a.period_value).end) || ORDER[a.period_type] - ORDER[b.period_type]; });
  if (saved.length) {
    html += '<section class="block" aria-labelledby="rv-old"><h2 class="sec-title" id="rv-old">' + fl('lavender', 24, 3) + '<span>Review đã lưu</span><span class="badge num">' + saved.length + '</span></h2>' +
      '<ul class="task-list">' + saved.slice(0, 60).map(function (x) {
        var on = x.period_type === type && x.period_value === value;
        var first = [x.good, x.bad, x.next].filter(function (t) { return String(t || '').trim(); })[0] || '';
        var r = +x.rating || 0;
        return '<li class="task' + (on ? ' is-current' : '') + '">' + (r ? '<span class="ticon tplain rv-bloom" title="' + App.views.BLOOM_LABELS[r] + '">' + App.views.bloom(r, 34) + '</span>' : '<span class="ticon tplain">' + icon('note') + '</span>') +
          '<button type="button" class="task-body" data-action="rev-open" data-type="' + esc(x.period_type) + '" data-value="' + esc(x.period_value) + '"' + (on ? ' aria-current="true"' : '') + '>' +
          '<span class="task-title">' + App.util.numify(P.label(x.period_type, x.period_value)) + (on ? ' <span class="muted">(đang xem)</span>' : '') + '</span>' +
          '<span class="meta"><span class="rv-snip">' + (r ? '<span class="sr-only">Mức hài lòng ' + r + '. </span>' : '') + esc(first) + '</span></span></button></li>';
      }).join('') + '</ul></section>';
  }
  return html;
};

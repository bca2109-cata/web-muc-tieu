/* Tab Tổng kết: chỉ số của tuần / tháng, biểu đồ đường số việc xong, biểu đồ thanh % từng mục tiêu, ghi chú review 3 câu */
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

  /* Biểu đồ đường một chuỗi. pts: [{label, tip, n, future}] */
  function line(pts, opt) {
    var W = width(), H = 200, ml = 30, mr = 14, mt = 18, mb = 30;
    var iw = W - ml - mr, ih = H - mt - mb;
    var max = Math.max(4, Math.max.apply(null, pts.map(function (p) { return p.n; })));
    var step = Math.ceil(max / 4), top = step * 4;
    var x = function (i) { return ml + (pts.length === 1 ? iw / 2 : i * iw / (pts.length - 1)); };
    var y = function (n) { return mt + ih - n / top * ih; };
    var svg = '<svg class="chart-svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opt.aria) + '">';
    // Lưới ngang mờ và nhãn trục số
    for (var k = 0; k <= 4; k++) {
      var gy = y(k * step);
      svg += '<line class="ch-grid' + (k ? '' : ' ch-base') + '" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + gy + '" y2="' + gy + '"/>' +
        '<text class="ch-ylab" x="' + (ml - 8) + '" y="' + (gy + 4) + '" text-anchor="end">' + k * step + '</text>';
    }
    // Nhãn trục ngày: thưa bớt khi nhiều điểm
    var every = pts.length > 12 ? Math.ceil(pts.length / Math.max(4, Math.floor(iw / 44))) : 1;
    pts.forEach(function (p, i) {
      var last = pts.length - 1;
      if (i !== last && (i % every || last - i < every / 2)) return;
      svg += '<text class="ch-xlab" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(p.label) + '</text>';
    });
    var past = pts.filter(function (p) { return !p.future; });
    if (past.length) {
      var d = past.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.n).toFixed(1); }).join(' ');
      svg += '<path class="ch-area" d="' + d + ' L' + x(past.length - 1).toFixed(1) + ' ' + y(0) + ' L' + x(0).toFixed(1) + ' ' + y(0) + 'Z"/>';
      svg += '<path class="ch-line" d="' + d + '"/>';
      var peak = 0;
      past.forEach(function (p, i) { if (p.n > past[peak].n) peak = i; });
      past.forEach(function (p, i) {
        if (pts.length <= 12 || i === peak) svg += '<circle class="ch-dot" cx="' + x(i) + '" cy="' + y(p.n) + '" r="4"/>';
      });
      if (past[peak].n) svg += '<text class="ch-val" x="' + x(peak) + '" y="' + (y(past[peak].n) - 10) + '" text-anchor="middle">' + past[peak].n + '</text>';
    }
    // Vùng rê chuột / chạm: rộng hơn điểm, hiện số của ngày đó
    var band = pts.length === 1 ? iw : iw / (pts.length - 1);
    pts.forEach(function (p, i) {
      var tip = p.tip + ': ' + (p.future ? 'chưa tới' : p.n + ' việc xong');
      svg += '<rect class="ch-hit" x="' + Math.max(0, x(i) - band / 2) + '" y="' + mt + '" width="' + band + '" height="' + ih + '"' +
        ' data-tip="' + esc(tip) + '" data-cx="' + x(i) + '" data-cy="' + (p.future ? '' : y(p.n)) + '"/>';
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

App.views.review = function (state, ui) {
  var S = App.summary, D = App.date, P = App.period, esc = App.util.esc, icon = App.ui.icon, fl = App.flowers.html, Ch = App.views.charts;
  var today = D.today();
  var type = S.TYPES.indexOf(ui.revType) >= 0 ? ui.revType : 'Tuần';
  var cur = S.current(type, today);
  var value = ui.revValue && P.range(type, ui.revValue) && ui.revValue <= cur ? ui.revValue : cur;
  var s = S.build(state, type, value, today);
  var isWeek = type === 'Tuần';
  var range = D.fmt(s.start).slice(0, 5) + ' đến ' + D.fmt(s.end);

  var html = '<div class="page-head"><h1>' + fl('sunflower', 30, 4) + 'Tổng kết</h1></div>';
  html += '<div class="habit-bar"><span class="seg-switch" role="group" aria-label="Loại kỳ">' +
    S.TYPES.map(function (t) {
      return '<button type="button" data-action="rev-type" data-type="' + t + '" aria-pressed="' + (t === type) + '"' + (t === type ? ' class="on"' : '') + '>' +
        icon(t === 'Tuần' ? 'list' : 'calendar', 'ic14') + t + '</button>';
    }).join('') + '</span><span class="habit-nav">' +
    '<button type="button" class="round" data-action="rev-shift" data-dir="-1" aria-label="' + type + ' trước">' + icon('back', 'ic18') + '</button>' +
    '<span class="habit-range"><strong>' + App.util.numify(P.label(type, value)) + '</strong><small>' + App.util.numify(range) + '</small></span>' +
    '<button type="button" class="round" data-action="rev-shift" data-dir="1" aria-label="' + type + ' sau"' + (value >= cur ? ' disabled' : '') + '>' + icon('back', 'ic18 flip') + '</button>' +
    '</span></div>';

  // Ba con số chính
  function stat(ic, big, label, sub) {
    return '<li class="card stat"><span class="stat-ic">' + icon(ic, 'ic18') + '</span><span class="stat-big num">' + big + '</span>' +
      '<span class="stat-label">' + label + '</span>' + (sub ? '<span class="stat-sub">' + sub + '</span>' : '') + '</li>';
  }
  html += '<ul class="stats">' +
    stat('check', s.doneCount, 'việc đã xong', isWeek ? 'trong tuần' : 'trong tháng') +
    stat('clock', s.onTimePct === null ? '–' : s.onTimePct + '%', 'xong đúng hạn',
      s.withDue ? '<span class="num">' + s.onTime + '/' + s.withDue + '</span> việc có hạn' : 'Chưa có việc có hạn nào xong') +
    stat('target', s.avg === null ? '–' : s.avg + '%', 'trung bình mục tiêu',
      s.goals.length ? '<span class="num">' + s.goals.length + '</span> mục tiêu trong kỳ' : 'Không có mục tiêu trong kỳ') +
    '</ul>';

  // Biểu đồ đường: việc xong theo ngày (tháng thì chọn được theo tuần)
  var byWeek = !isWeek && ui.revChart === 'week';
  var WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  var pts = byWeek
    ? s.weeks.map(function (w) { return { label: 'Tuần ' + w.week, tip: 'Tuần ' + w.week + ' (' + D.fmt(w.start).slice(0, 5) + ' đến ' + D.fmt(w.end).slice(0, 5) + ')', n: w.n, future: w.future }; })
    : s.days.map(function (x) {
      var wd = WD[D.parse(x.date).getUTCDay()];
      return { label: isWeek ? wd : String(+x.date.slice(8)), tip: wd + ' ' + D.fmt(x.date).slice(0, 5), n: x.n, future: x.future };
    });
  html += '<div class="rev-cols"><section class="block" aria-labelledby="rv-line"><h2 class="sec-title" id="rv-line">' + fl('sprig', 24, 1) + '<span>Việc xong theo ' + (byWeek ? 'tuần' : 'ngày') + '</span>' +
    (isWeek ? '' : '<span class="seg-switch" role="group" aria-label="Gộp theo">' +
      '<button type="button" data-action="rev-chart" data-chart="day" aria-pressed="' + !byWeek + '"' + (!byWeek ? ' class="on"' : '') + '>Ngày</button>' +
      '<button type="button" data-action="rev-chart" data-chart="week" aria-pressed="' + byWeek + '"' + (byWeek ? ' class="on"' : '') + '>Tuần</button></span>') +
    '</h2><div class="card chart-card">' +
    (s.doneCount ? '' : '<p class="muted chart-empty">Chưa có việc nào xong trong kỳ này.</p>') +
    Ch.line(pts, { aria: 'Biểu đồ số việc xong theo ' + (byWeek ? 'tuần' : 'ngày') + ', ' + P.label(type, value) + ', tổng ' + s.doneCount + ' việc' }) +
    '<details class="ch-table"><summary>' + icon('list', 'ic14') + 'Xem bảng số liệu</summary><table><thead><tr><th>' + (byWeek ? 'Tuần' : 'Ngày') + '</th><th>Việc xong</th></tr></thead><tbody>' +
    pts.map(function (p) { return '<tr><td>' + App.util.numify(p.tip) + '</td><td class="num">' + (p.future ? '–' : p.n) + '</td></tr>'; }).join('') +
    '</tbody></table></details></div></section>';

  // Biểu đồ thanh: % từng mục tiêu trong kỳ
  html += '<section class="block" aria-labelledby="rv-bars"><h2 class="sec-title" id="rv-bars">' + fl('tulip', 24, 6) + '<span>Tiến độ mục tiêu</span>' +
    (s.goals.length ? '<span class="badge num">' + s.goals.length + '</span>' : '') + '</h2>' +
    (s.goals.length
      ? '<div class="card chart-card">' + Ch.goalBars(s.goals) + '<p class="hint">' + icon('sparkle', 'ic14') + 'Mục tiêu có thời gian chạm vào kỳ này, trừ mục tiêu Tạm dừng. Số % tính đến ' + (s.end < today ? 'cuối kỳ' : 'hôm nay') + '. Bấm vào cột để mở mục tiêu.' +
        (s.goals.some(function (x) { return x.approx; }) ? ' Dấu * là mục tiêu theo chỉ số đã cập nhật sau kỳ này, đang hiện số hiện tại.' : '') + '</p></div>'
      : App.views.emptyCard('Không có mục tiêu nào trong ' + P.label(type, value) + '.', 'Mục tiêu có ngày bắt đầu đến ngày kết thúc chạm vào kỳ này sẽ hiện ở đây.')) +
    '</section></div>';

  // Review 3 câu, lưu theo kỳ
  var rv = S.findReview(state.reviews, type, value) || {};
  function area(name, ic, label, ph) {
    return '<label class="field"><span>' + icon(ic, 'ic14') + label + '</span><textarea class="textarea" id="rv-' + name + '" name="' + name + '" maxlength="2000" placeholder="' + ph + '">' + esc(rv[name] || '') + '</textarea></label>';
  }
  html += '<section class="block" aria-labelledby="rv-note"><h2 class="sec-title" id="rv-note">' + fl('daisy', 24, 5) + '<span>Review ' + App.util.numify(P.label(type, value)) + '</span></h2>' +
    '<form class="card review-form" data-form="review" data-type="' + type + '" data-value="' + esc(value) + '" novalidate>' +
    area('good', 'heart', 'Làm tốt gì?', 'Điều mình hài lòng trong kỳ này') +
    area('bad', 'alert', 'Chưa tốt gì?', 'Điều cần làm khác đi') +
    area('next', 'flag', 'Kỳ sau ưu tiên gì?', 'Một đến ba việc quan trọng nhất kỳ sau') +
    '<div class="review-foot"><span class="muted review-when">' + (rv.updated_at ? 'Đã lưu lúc ' + App.util.numify(rv.updated_at.slice(11, 16) + ' ' + D.fmt(rv.updated_at.slice(0, 10))) : 'Chưa có review cho kỳ này.') + '</span>' +
    '<button type="submit" class="btn btn-primary">' + icon('check', 'ic18') + 'Lưu review</button></div></form></section>';

  // Các review đã lưu, mới nhất trước
  var saved = state.reviews.filter(function (x) { return S.TYPES.indexOf(x.period_type) >= 0 && P.range(x.period_type, x.period_value); })
    .sort(function (a, b) { return P.range(b.period_type, b.period_value).start.localeCompare(P.range(a.period_type, a.period_value).start) || (a.period_type === 'Tuần' ? 1 : -1); });
  if (saved.length) {
    html += '<section class="block" aria-labelledby="rv-old"><h2 class="sec-title" id="rv-old">' + fl('lavender', 24, 3) + '<span>Review đã lưu</span><span class="badge num">' + saved.length + '</span></h2>' +
      '<ul class="task-list">' + saved.map(function (x) {
        var on = x.period_type === type && x.period_value === value;
        var first = [x.good, x.bad, x.next].filter(function (t) { return String(t || '').trim(); })[0] || '';
        return '<li class="task' + (on ? ' is-current' : '') + '"><span class="ticon tplain">' + icon('note') + '</span>' +
          '<button type="button" class="task-body" data-action="rev-open" data-type="' + esc(x.period_type) + '" data-value="' + esc(x.period_value) + '"' + (on ? ' aria-current="true"' : '') + '>' +
          '<span class="task-title">' + App.util.numify(P.label(x.period_type, x.period_value)) + (on ? ' <span class="muted">(đang xem)</span>' : '') + '</span>' +
          '<span class="meta"><span class="rv-snip">' + esc(first) + '</span></span></button></li>';
      }).join('') + '</ul></section>';
  }
  return html;
};

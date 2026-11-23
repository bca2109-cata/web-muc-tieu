/* Tab Ma trận (GĐ7 phần B): 4 ô Quan trọng x Gấp, phạm vi Hôm nay / Tuần này / Kho, thanh quỹ giờ của phạm vi,
   nút "Cân việc mới". Bấm thẻ để đổi nhanh Quan trọng, Ngày làm, Hạn chót. Ô do web tự xếp, không có ô nhập tay. */
var App = window.App || (window.App = {});
App.views = App.views || {};

App.views.matrix = function (state, ui) {
  var C = App.comp, L = App.logic, D = App.date, P = App.plan, icon = App.ui.icon, esc = App.util.esc;
  var today = D.today();
  var scope = ui.mxScope === 'week' || ui.mxScope === 'inbox' ? ui.mxScope : 'today';
  var goalsById = {};
  state.goals.forEach(function (g) { goalsById[g.id] = g; });
  var parents = L.parentIds(state.tasks);

  // Danh sách theo phạm vi
  var weekEnd = today;
  for (var i = 0; i < 7; i++) { var wd = D.addDays(today, i); weekEnd = wd; if (D.parse(wd).getUTCDay() === 0) break; }
  var list;
  if (scope === 'today') list = L.dayList(state.tasks, today);
  else if (scope === 'week') list = state.tasks.filter(function (t) { var d = L.doDate(t); return !parents[t.id] && d && d >= today && d <= weekEnd; });
  else list = state.tasks.filter(function (t) { return !parents[t.id] && !L.isDone(t) && !L.doDate(t); });
  // Việc mới đang cân (xem trước phía sau hộp thoại): đánh dấu nổi bật
  var pv = ui.mxNew;
  if (pv) list = list.concat([Object.assign({}, pv, { do_date: scope === 'inbox' ? '' : today, __new: true })]);

  var ctx = { today: today, day: today, goalsById: goalsById, kids: C.kidsMap(state.tasks), scope: 'matrix', flashId: ui.flashId, hideGoal: true };
  if (scope === 'today') {
    var seq = App.views.sortRows(L.dayList(state.tasks, today), { key: 'plan', dir: 1 }, today, App.app.planOrder(today)).map(function (t) { return t.id; });
    ctx.sched = P.schedule(state, today, D.nowHM(), seq);
    ctx.pins = {};
    P.pinnedOf(state, today).forEach(function (t) { ctx.pins[t.id] = true; });
  }

  // Thanh quỹ của phạm vi
  function bar(label, ic, planned, cap, done) {
    var over = planned > cap, w = function (m) { return cap ? Math.min(100, m / cap * 100).toFixed(1) + '%' : '0%'; };
    return '<div class="bd-row' + (over ? ' is-over' : '') + '"><p class="bd-lbl"><span class="bd-name">' + icon(ic, 'ic14') + label + '</span><span class="bd-fig">Đã xếp <span class="num">' + L.fmtMin(planned) + ' / ' + L.fmtMin(cap) + '</span></span></p>' +
      '<div class="bd-track" role="img" aria-label="' + label + ': đã xếp ' + L.fmtMin(planned) + ' trên ' + L.fmtMin(cap) + '">' +
      (done ? '<span class="bd-seg bd-done" style="width:' + w(done) + '"></span>' : '') + '<span class="bd-seg bd-open" style="width:' + w(Math.max(0, planned - done)) + '"></span></div>' +
      (over ? '<p class="bd-warn">' + icon('alert', 'ic14') + '<span>Quá tải <span class="num">' + (planned - cap) + '</span> phút.</span></p>' : '') + '</div>';
  }
  var budget;
  if (scope === 'inbox') {
    var sum = list.reduce(function (a, t) { return a + (t.__new ? 0 : L.duration(t)); }, 0), n = list.filter(function (t) { return !t.__new; }).length;
    budget = '<p class="info-line">' + icon('box', 'ic14') + '<span>Kho có <span class="num">' + n + '</span> việc, tổng <span class="num">' + L.fmtMin(sum) + '</span>. Kho không có quỹ giờ.</span></p>';
  } else {
    var rows = {}, days = scope === 'today' ? [today] : [];
    if (scope === 'week') for (var d = today; d <= weekEnd; d = D.addDays(d, 1)) days.push(d);
    var agg = {};
    days.forEach(function (d) {
      P.load(state, d).buckets.forEach(function (b) {
        var a = agg[b.key] || (agg[b.key] = { label: b.label, planned: 0, cap: 0, done: 0 });
        a.planned += b.planned; a.cap += b.avail; a.done += b.done;
      });
    });
    var ico = { work: 'brief', evening: 'moon', personal: 'home' };
    budget = Object.keys(agg).map(function (k) { return bar(agg[k].label, ico[k] || 'hourglass', agg[k].planned, agg[k].cap, agg[k].done); }).join('');
  }
  var title = scope === 'today' ? 'Quỹ giờ hôm nay' : scope === 'week' ? 'Quỹ giờ tuần này (đến ' + D.weekday(weekEnd) + ' ' + D.fmt(weekEnd).slice(0, 5) + ')' : 'Kho việc';

  function meta(t) {
    var dn = L.doDate(t), sc = ctx.sched && ctx.sched[t.id];
    return '<span class="meta mx-meta">' + (ctx.pins && ctx.pins[t.id] ? C.tag('twarm', 'flag', 'Ghim') : '') +
      (sc ? C.tag('tplain', 'clock', '<span class="num">' + C.hm(sc.start) + '</span>', 'Giờ dự kiến bắt đầu') : '') + C.durTag(t) +
      (dn ? C.tag('tplain', 'calendar', dn === today ? 'Làm hôm nay' : 'Làm ' + D.weekday(dn).replace('Thứ ', 'T') + ' ' + D.fmt(dn).slice(0, 5)) : C.tag('tplain', 'box', 'Kho')) +
      (t.due_date ? C.dueTag(t, today) : '') + (sc && sc.late ? C.tag('tq1', 'alert', 'Không kịp hôm nay') : '') + '</span>';
  }
  function card(t) {
    var done = L.isDone(t);
    return '<li class="mx-card' + (t.__new ? ' mx-new' : '') + (done ? ' is-done' : '') + (ctx.flashId === t.id ? ' mx-flash' : '') + '">' +
      (t.__new ? '<span class="mx-badge">Việc mới</span>' : C.tickButton(t, ctx)) +
      '<button type="button" class="qname" data-action="mx-edit" data-id="' + esc(t.id) + '" title="Bấm để đổi nhanh: Quan trọng, Ngày làm, Hạn chót">' + icon(L.iconOf(t), 'ic14') + '<span>' + esc(t.title) + (L.isImportant(t) ? '' : '') + '</span></button>' + meta(t) + '</li>';
  }
  var cells = [1, 2, 3, 4].map(function (q) {
    var Q = L.QUADRANTS[q];
    var items = list.filter(function (t) { return L.quadrant(t, today) === q; }).sort(function (a, b) {
      var pa = ctx.pins && ctx.pins[a.id] ? 0 : 1, pb = ctx.pins && ctx.pins[b.id] ? 0 : 1;
      return (pa - pb) || ((L.isDone(a) ? 1 : 0) - (L.isDone(b) ? 1 : 0)) || (L.dueKey(a) < L.dueKey(b) ? -1 : L.dueKey(a) > L.dueKey(b) ? 1 : 0);
    });
    var open = items.filter(function (t) { return !L.isDone(t) && !t.__new; }).length;
    return '<section class="q q' + q + '" aria-label="' + Q.label + ': ' + Q.hint + '"><h3 title="' + Q.hint + '">' + icon(Q.icon, 'ic18') + '<span class="q-name">' + Q.label + '</span><span class="num qn">' + open + '</span></h3>' +
      '<p class="q-act">' + Q.hint + '. ' + Q.act + '</p><ul>' + (items.length ? items.map(card).join('') : '<li class="none">Trống, nhẹ nhàng ghê</li>') + '</ul></section>';
  }).join('');

  var scopes = [['today', 'Hôm nay'], ['week', 'Tuần này'], ['inbox', 'Kho']];
  return '<section class="mxtab"><div class="mx-head"><h1>Ma trận</h1><span class="seg-switch" role="group" aria-label="Phạm vi">' +
    scopes.map(function (s) { return '<button type="button" data-action="mx-scope" data-scope="' + s[0] + '" aria-pressed="' + (scope === s[0]) + '"' + (scope === s[0] ? ' class="on"' : '') + '>' + s[1] + '</button>'; }).join('') + '</span></div>' +
    '<button type="button" class="btn btn-primary mx-new-btn" data-action="balance-open">' + icon('plus', 'ic18') + 'Cân việc mới</button>' +
    '<section class="card budget" aria-labelledby="mx-bd-title"><h2 id="mx-bd-title" class="bd-h">' + icon('hourglass', 'ic18') + '<span>' + title + '</span></h2>' + budget + '</section>' +
    '<p class="hint">' + icon('sparkle', 'ic14') + 'Web tự xếp ô: Quan trọng do bạn đánh dấu, gấp là hạn chót trong 2 ngày tới hoặc đã quá hạn. Bấm tên việc để đổi nhanh Quan trọng, Ngày làm, Hạn chót.</p>' +
    '<div class="mx"><div class="mx-top" aria-hidden="true"><span>' + icon('flame', 'ic14') + 'Khẩn cấp</span><span>Không khẩn cấp</span></div>' +
    '<div class="mx-side" aria-hidden="true"><span>Quan trọng</span><span>Không quan trọng</span></div><div class="matrix">' + cells + '</div></div></section>';
};

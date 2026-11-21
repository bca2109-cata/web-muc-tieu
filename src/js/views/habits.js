/* Tab Thói quen: lưới tick theo ngày (7 ngày hoặc cả tháng), chuỗi ngày liên tiếp; khối thói quen hôm nay ở tab Hôm nay */
var App = window.App || (window.App = {});
App.views = App.views || {};

App.views.habitParts = (function () {
  var L = App.logic, D = App.date, esc = App.util.esc, icon = App.ui.icon;
  var WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  function wd(d) { return WD[D.parse(d).getUTCDay()]; }
  function dayNum(d) { return String(+d.slice(8, 10)); }

  // Một ô tick. Ngày tương lai và ngày không cần làm thì không bấm được.
  function cell(h, d, done, today, withWd) {
    var top = withWd ? '<span class="hc-wd">' + wd(d) + '</span>' : '';
    var num = '<span class="hc-day num">' + dayNum(d) + '</span>';
    var when = D.weekday(d) + ' ' + D.fmt(d);
    if (d > today) return '<span class="hc hc-future" aria-hidden="true">' + top + num + '</span>';
    if (!L.isHabitDay(h, d)) return '<span class="hc hc-off" title="' + esc(when) + ': không cần làm">' + top + num + '</span>';
    var on = !!done[d];
    return '<button type="button" class="hc' + (on ? ' hc-done' : d < today ? ' hc-miss' : '') + (d === today ? ' hc-today' : '') + '"' +
      ' data-action="habit-tick" data-id="' + esc(h.id) + '" data-date="' + d + '" aria-pressed="' + on + '"' +
      ' aria-label="' + esc(h.name) + ', ' + esc(when) + ': ' + (on ? 'đã làm' : 'chưa làm') + '">' + top + num +
      '<span class="hc-mark">' + icon(on ? 'check' : 'plus', 'ic14') + '</span></button>';
  }

  function streakLine(s) {
    return '<span class="streak">' + icon('flame', 'ic14') + 'Chuỗi <span class="num">' + s.current + '</span> ngày' +
      '<span class="muted"> · dài nhất <span class="num">' + s.best + '</span></span></span>';
  }

  function tags(h, goalsById) {
    var g = h.goal_id ? goalsById[h.goal_id] : null;
    return App.comp.tag('tplain', 'refresh', App.util.numify(L.ruleLabel(h.frequency) || 'Hằng ngày')) +
      (g ? App.comp.tag(App.comp.groupMeta(g.group).cls + ' goal-tag', App.comp.groupMeta(g.group).icon, esc(g.name)) : '');
  }

  return { cell: cell, streakLine: streakLine, tags: tags, wd: wd };
})();

App.views.habits = function (state, ui) {
  var L = App.logic, D = App.date, P = App.views.habitParts, esc = App.util.esc, icon = App.ui.icon, fl = App.flowers.html;
  var today = D.today();
  var goalsById = {};
  state.goals.forEach(function (g) { goalsById[g.id] = g; });
  var active = state.habits.filter(L.habitActive).sort(function (a, b) { return (a.created_at || '') < (b.created_at || '') ? -1 : 1; });
  var paused = state.habits.filter(function (h) { return !L.habitActive(h); });
  var mode = ui.habitView === 'month' ? 'month' : 'week', shift = Math.min(0, ui.habitShift || 0);

  // Khoảng ngày đang xem
  var days = [], label, lead = 0;
  if (mode === 'week') {
    var end = D.addDays(today, shift * 7);
    for (var i = 6; i >= 0; i--) days.push(D.addDays(end, -i));
    label = D.fmt(days[0]).slice(0, 5) + ' đến ' + D.fmt(end);
  } else {
    var t = D.parse(today), first = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + shift, 1));
    var y = first.getUTCFullYear(), m = first.getUTCMonth();
    var startStr = y + '-' + App.util.pad(m + 1) + '-01';
    for (var d = startStr; D.parse(d).getUTCMonth() === m; d = D.addDays(d, 1)) days.push(d);
    lead = (first.getUTCDay() + 6) % 7; // ô trống trước ngày 1 (tuần bắt đầu thứ 2)
    label = 'Tháng ' + App.util.pad(m + 1) + '/' + y;
  }

  var dueToday = active.filter(function (h) { return L.isHabitDay(h, today); });
  var doneToday = dueToday.filter(function (h) { return L.habitDone(h, state.habitLogs)[today]; }).length;

  var html = '<div class="page-head"><h1>' + fl('daisy', 30, 5) + 'Thói quen</h1>' +
    '<button type="button" class="btn btn-primary" data-action="new-habit">' + icon('plus', 'ic18') + 'Thêm thói quen</button></div>';

  if (!state.habits.length) {
    return html + App.views.emptyCard('Chưa có thói quen nào. Tạo thói quen đầu tiên?', 'Ví dụ: đọc sách 20 phút, tập thể dục, ngủ trước 23 giờ.',
      '<button type="button" class="btn btn-primary" data-action="new-habit">' + icon('plus', 'ic18') + 'Tạo thói quen</button>');
  }

  if (dueToday.length) {
    html += '<p class="habit-sum">' + icon('calcheck', 'ic18') + 'Hôm nay đã làm <span class="num">' + doneToday + '/' + dueToday.length + '</span> thói quen</p>';
  }
  html += '<div class="habit-bar"><span class="seg-switch" role="group" aria-label="Cách xem">' +
    '<button type="button" data-action="habit-view" data-view="week" aria-pressed="' + (mode === 'week') + '"' + (mode === 'week' ? ' class="on"' : '') + '>' + icon('list', 'ic14') + '<span class="num">7</span> ngày</button>' +
    '<button type="button" data-action="habit-view" data-view="month" aria-pressed="' + (mode === 'month') + '"' + (mode === 'month' ? ' class="on"' : '') + '>' + icon('calendar', 'ic14') + 'Tháng</button>' +
    '</span><span class="habit-nav">' +
    '<button type="button" class="round" data-action="habit-shift" data-dir="-1" aria-label="' + (mode === 'week' ? '7 ngày trước' : 'Tháng trước') + '">' + icon('back', 'ic18') + '</button>' +
    '<span class="habit-range">' + App.util.numify(label) + '</span>' +
    '<button type="button" class="round" data-action="habit-shift" data-dir="1" aria-label="' + (mode === 'week' ? '7 ngày sau' : 'Tháng sau') + '"' + (shift >= 0 ? ' disabled' : '') + '>' + icon('back', 'ic18 flip') + '</button>' +
    '</span></div>';

  if (!active.length) {
    html += '<p class="muted soon-none">Mọi thói quen đang tạm dừng. Bấm vào tên ở dưới để bật lại.</p>';
  }
  html += '<div class="habit-list">' + active.map(function (h) {
    var done = L.habitDone(h, state.habitLogs), s = L.habitStreak(h, state.habitLogs, today);
    var grid = mode === 'week'
      ? '<div class="hgrid hweek">' + days.map(function (d) { return P.cell(h, d, done, today, true); }).join('') + '</div>'
      : '<div class="hgrid hmonth"><div class="hm-head" aria-hidden="true">' + ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>' +
        '<div class="hm-days">' + new Array(lead + 1).join('<span class="hc hc-blank"></span>') +
        days.map(function (d) { return P.cell(h, d, done, today, false); }).join('') + '</div></div>';
    return '<article class="card habit">' +
      '<div class="habit-head"><button type="button" class="habit-name" data-action="edit-habit" data-id="' + esc(h.id) + '">' +
      '<span class="h-title">' + esc(h.name) + '</span><span class="meta">' + P.tags(h, goalsById) + '</span></button>' +
      P.streakLine(s) + '</div>' + grid + '</article>';
  }).join('') + '</div>';

  if (paused.length) {
    html += '<section class="block" aria-labelledby="hp-title"><h2 class="sec-title" id="hp-title">' + fl('lavender', 24, 3) +
      '<span>Tạm dừng</span><span class="badge num">' + paused.length + '</span></h2><ul class="task-list">' +
      paused.map(function (h) {
        return '<li class="task"><span class="ticon tplain">' + icon('pause') + '</span>' +
          '<button type="button" class="task-body" data-action="edit-habit" data-id="' + esc(h.id) + '"><span class="task-title">' + esc(h.name) + '</span>' +
          '<span class="meta">' + P.tags(h, goalsById) + '</span></button></li>';
      }).join('') + '</ul></section>';
  }
  html += '<p class="hint">' + icon('sparkle', 'ic14') + 'Bấm vào ô để tick hoặc bỏ tick, kể cả ngày đã qua. Chuỗi chỉ đếm ngày cần làm; hôm nay chưa tick thì chuỗi chưa mất.</p>';
  return html;
};

// Khối "Thói quen hôm nay" ở tab Hôm nay
App.views.habitToday = function (state, today) {
  var L = App.logic, P = App.views.habitParts, esc = App.util.esc, icon = App.ui.icon, fl = App.flowers.html;
  var list = state.habits.filter(function (h) { return L.habitActive(h) && L.isHabitDay(h, today); });
  var head = '<section class="block" aria-labelledby="ht-title"><h2 class="sec-title" id="ht-title">' + fl('daisy', 24, 5) + '<span>Thói quen hôm nay</span>';
  if (!list.length) {
    return head + '</h2><p class="muted soon-none">' + (state.habits.length ? 'Hôm nay không có thói quen nào cần làm.' : 'Chưa có thói quen. Tạo ở tab Thói quen.') + '</p></section>';
  }
  var n = 0;
  var items = list.map(function (h) {
    var on = !!L.habitDone(h, state.habitLogs)[today], s = L.habitStreak(h, state.habitLogs, today);
    if (on) n++;
    return '<li class="task' + (on ? ' is-done' : '') + '"><button type="button" class="tick" data-action="habit-tick" data-id="' + esc(h.id) + '" data-date="' + today + '"' +
      ' aria-pressed="' + on + '" aria-label="' + esc(h.name) + ': ' + (on ? 'đã làm, bấm để bỏ tick' : 'chưa làm, bấm để tick') + '"><span class="dot">' + icon('check') + '</span></button>' +
      '<a class="task-body" href="#/thoi-quen"><span class="task-title">' + esc(h.name) + '</span><span class="meta">' + P.streakLine(s) + '</span></a></li>';
  }).join('');
  return head + '<span class="badge num">' + n + '/' + list.length + '</span></h2><ul class="task-list habit-today">' + items + '</ul></section>';
};

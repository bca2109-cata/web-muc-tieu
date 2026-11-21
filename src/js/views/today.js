/* Tab Hôm nay: khung chào, ô thêm nhanh, Top 3, việc hôm nay (dạng danh sách hoặc ma trận 4 ô) */
var App = window.App || (window.App = {});
App.views = App.views || {};

App.views.today = function (state, ui) {
  var C = App.comp, L = App.logic, D = App.date, icon = App.ui.icon, fl = App.flowers.html;
  var today = D.today(), tomorrow = D.addDays(today, 1);
  var goalsById = {};
  state.goals.forEach(function (g) { goalsById[g.id] = g; });
  var ctx = { today: today, goalsById: goalsById, flashId: ui.flashId };

  var top3 = L.sortTasks(state.tasks.filter(function (t) { return L.isTop3Today(t, today); }));
  var rest = state.tasks.filter(function (t) { return !L.isTop3Today(t, today); });
  var overdue = L.sortTasks(rest.filter(function (t) { return L.isOverdue(t, today); }));
  var dueToday = L.sortTasks(rest.filter(function (t) {
    // Việc xong hôm nay vẫn hiện (gạch ngang) để thấy mình đã làm được gì
    return t.due_date === today || (L.isDone(t) && t.done_at === today && t.due_date < today);
  }));
  var dueTomorrow = L.sortTasks(rest.filter(function (t) { return t.due_date === tomorrow && (!L.isDone(t) || t.done_at === today); }));
  // Ma trận: mọi việc chưa xong, cộng việc vừa xong hôm nay
  var forMatrix = rest.filter(function (t) { return !L.isDone(t) || t.done_at === today; });

  var top3Done = top3.filter(L.isDone).length;
  var nowCount = state.tasks.filter(function (t) { return !L.isDone(t) && L.quadrant(t, today) === 1; }).length;
  var doneToday = state.tasks.filter(function (t) { return L.isDone(t) && t.done_at === today; }).length;
  var h = new Date().getHours();
  var hello = h < 11 ? 'Chào buổi sáng!' : h < 13 ? 'Chào buổi trưa!' : h < 18 ? 'Chào buổi chiều!' : 'Chào buổi tối!';

  var html = '<div class="today-cols"><div class="today-main">';
  html += '<section class="hello">' + App.views.sun() + fl('daisy', 44, 2, 'hello-f1') + fl('sakura', 26, 8, 'hello-f2') +
    '<h1>' + hello + '</h1><p>' + icon('calendar', 'ic14') + D.weekday(today) + ', <span class="num">' + D.fmt(today) + '</span></p>' +
    '<div class="stats">' +
    '<span class="chip">' + icon('star', 'ic14') + '<span><span class="num">' + top3Done + '/' + top3.length + '</span> Top 3</span></span>' +
    '<span class="chip c-q1">' + icon('flame', 'ic14') + '<span><span class="num">' + nowCount + '</span> làm ngay</span></span>' +
    '<span class="chip c-ok">' + icon('check', 'ic14') + '<span><span class="num">' + doneToday + '</span> đã xong</span></span>' +
    '</div></section>';

  html += C.quickAdd('quick-add-today', 'Hôm nay mình sẽ làm gì nè?');

  html += '<section class="block" aria-labelledby="top3-title"><h2 class="sec-title" id="top3-title">' + fl('sakura', 24, 1) +
    '<span>Top <span class="num">3</span> hôm nay</span><span class="badge num">' + top3.length + '/' + App.C.TOP3_MAX + '</span></h2>' +
    '<ul class="notes">' + top3.map(function (t, i) { return C.topNote(t, i, ctx); }).join('') +
    (top3.length < App.C.TOP3_MAX
      ? '<li class="note empty">' + icon('star', 'ic14') + '<span>' + (top3.length ? 'Còn chỗ trống. ' : '') + 'Bấm ngôi sao ở một việc để đưa lên đây</span></li>'
      : '') + '</ul></section>';

  html += '</div><div class="today-side">';
  var mode = ui.todayView === 'list' ? 'list' : 'matrix';
  html += '<section class="block" aria-labelledby="tasks-title"><h2 class="sec-title" id="tasks-title">' + fl('sunflower', 24, 4) +
    '<span>Việc hôm nay</span><span class="seg-switch" role="group" aria-label="Cách xem">' +
    '<button type="button" data-action="today-view" data-view="list" aria-pressed="' + (mode === 'list') + '"' + (mode === 'list' ? ' class="on"' : '') + '>' + icon('list', 'ic14') + 'Danh sách</button>' +
    '<button type="button" data-action="today-view" data-view="matrix" aria-pressed="' + (mode === 'matrix') + '"' + (mode === 'matrix' ? ' class="on"' : '') + '>' + icon('grid', 'ic14') + 'Ma trận</button>' +
    '</span></h2>';

  function section(title, iconName, list, cls) {
    if (!list.length) return '';
    return '<div class="sub-block"><h3 class="sub-title ' + (cls || '') + '">' + icon(iconName, 'ic14') + title +
      '<span class="badge num">' + list.length + '</span></h3>' + C.taskList(list, ctx) + '</div>';
  }

  if (mode === 'matrix') {
    html += forMatrix.length
      ? '<p class="hint">' + icon('sparkle', 'ic14') + 'Gồm mọi việc chưa xong. Quan trọng là ưu tiên Cao, gấp là trễ hạn hoặc hạn đến ngày mai.</p>' + C.matrix(forMatrix, ctx)
      : App.views.emptyCard('Không còn việc nào chưa xong. Thảnh thơi ghê!', 'Gõ tên việc vào ô ở trên rồi bấm Enter để thêm.');
  } else if (!overdue.length && !dueToday.length && !dueTomorrow.length) {
    html += App.views.emptyCard(top3.length ? 'Không còn việc nào khác hạn hôm nay.' : 'Hôm nay chưa có việc nào.',
      'Gõ tên việc vào ô ở trên rồi bấm Enter để thêm.');
  } else {
    html += section('Trễ hạn', 'alert', overdue, 'is-warn');
    html += section('Hạn hôm nay', 'clock', dueToday, '');
    html += section('Sắp đến hạn: ngày mai', 'calendar', dueTomorrow, '');
  }
  html += '</section></div></div>';
  return html;
};

// Mặt trời cười trong khung chào (hình trang trí, màu cố định)
App.views.sun = function () {
  return '<svg class="sun" width="76" height="76" viewBox="0 0 120 120" aria-hidden="true" focusable="false">' +
    '<g stroke="#f2a33a" stroke-width="6" stroke-linecap="round"><path d="M60 8v12M60 100v12M8 60h12M100 60h12M23 23l8 8M89 89l8 8M23 97l8-8M89 31l8-8"/></g>' +
    '<circle cx="60" cy="60" r="28" fill="#ffd56b" stroke="#f2a33a" stroke-width="4"/>' +
    '<circle cx="51" cy="57" r="3.4" fill="#3b2235"/><circle cx="69" cy="57" r="3.4" fill="#3b2235"/>' +
    '<path d="M52 67q8 7 16 0" stroke="#3b2235" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="45" cy="66" r="4" fill="#ff9fb8" opacity=".8"/><circle cx="75" cy="66" r="4" fill="#ff9fb8" opacity=".8"/></svg>';
};

App.views.emptyCard = function (title, sub, button) {
  var fl = App.flowers.html;
  return '<div class="card empty">' + fl('tulip', 34, 1) + fl('daisy', 28, 3) + fl('tulip', 34, 4) +
    '<p class="empty-title">' + title + '</p>' + (sub ? '<p class="muted">' + sub + '</p>' : '') + (button || '') + '</div>';
};

// Tab chưa làm tới
App.views.soon = function (name) {
  var fl = App.flowers.html, icon = App.ui.icon;
  var INFO = {
    task: { title: 'Task', icon: 'list', when: 'Danh sách đủ bộ lọc theo trạng thái, ưu tiên, mục tiêu và hạn.' },
    'thoi-quen': { title: 'Thói quen', icon: 'calcheck', when: 'Lưới tick theo ngày và chuỗi ngày liên tiếp. Làm ở Giai đoạn 3.' },
    'tong-ket': { title: 'Tổng kết', icon: 'barchart', when: 'Chỉ số, biểu đồ và ghi chú review. Làm ở Giai đoạn 4.' }
  };
  var x = INFO[name] || INFO.task;
  return '<div class="card soon-card">' +
    '<div class="soon-flowers">' + fl('tulip', 44, 1) + fl('hydrangea', 38, 9) + fl('sunflower', 40, 4) + fl('lavender', 44, 3) + fl('tulip', 44, 6) + '</div>' +
    '<h1>' + icon(x.icon) + 'Tab ' + x.title + ' sắp có</h1>' +
    '<p>Khu vườn này đang được trồng, ghé lại sau nhé.</p><p class="muted">' + x.when + '</p>' +
    '<a class="btn btn-soft" href="#/hom-nay">' + icon('home', 'ic18') + 'Về Hôm nay</a></div>';
};

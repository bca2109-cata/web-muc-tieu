/* Tab Hôm nay: Top 3, việc trễ hạn, việc hôm nay, việc ngày mai, ô thêm nhanh */
var App = window.App || (window.App = {});
App.views = App.views || {};

App.views.today = function (state, ui) {
  var C = App.comp, L = App.logic, D = App.date, esc = App.util.esc;
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

  function section(title, list, cls, emptyText) {
    if (!list.length && !emptyText) return '';
    return '<section class="section"><h2 class="section-title ' + (cls || '') + '">' + title +
      (list.length ? ' <span class="count num">' + list.length + '</span>' : '') + '</h2>' +
      (list.length ? C.taskList(list, ctx) : '<div class="card empty small"><p>' + emptyText + '</p></div>') + '</section>';
  }

  var html = '<div class="page-head"><h1>Hôm nay<span class="sub">' + D.weekday(today) +
    ', <span class="num">' + D.fmt(today) + '</span></span></h1></div>';

  html += C.quickAdd('quick-add-today', 'Thêm việc, gõ tên rồi Enter');

  html += '<section class="section top3" aria-labelledby="top3-title"><h2 class="section-title" id="top3-title">Top <span class="num">3</span> hôm nay ' +
    '<span class="count num">' + top3.length + '/' + App.C.TOP3_MAX + '</span></h2>' +
    (top3.length
      ? C.taskList(top3, ctx)
      : '<p class="top3-empty">Chưa chọn việc nào. Bấm hình ngôi sao ở một việc bên dưới để đưa vào Top 3.</p>') +
    '</section>';

  var nothing = !overdue.length && !dueToday.length && !dueTomorrow.length;
  if (nothing && !top3.length) {
    html += '<div class="card empty"><p>Hôm nay chưa có việc nào.</p><p class="muted">Gõ tên việc vào ô ở trên rồi bấm Enter để thêm.</p></div>';
  } else {
    html += section(App.ui.icon('alert', 'icon-sm') + 'Trễ hạn', overdue, 'is-warn');
    html += section('Việc hôm nay', dueToday, '', nothing ? '' : 'Không còn việc nào hạn hôm nay.');
    html += section('Sắp đến hạn: ngày mai', dueTomorrow, '');
  }
  return html;
};

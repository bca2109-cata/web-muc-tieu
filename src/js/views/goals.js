/* Tab Mục tiêu: danh sách thẻ (lọc theo nhóm) và trang chi tiết một mục tiêu */
var App = window.App || (window.App = {});
App.views = App.views || {};

App.views.goals = function (state, ui) {
  var C = App.comp, esc = App.util.esc;
  var filter = ui.groupFilter || '';
  var chips = [{ key: '', label: 'Tất cả' }].concat(App.C.GROUPS);

  var html = '<div class="page-head"><h1>Mục tiêu</h1>' +
    '<button type="button" class="btn btn-primary" data-action="new-goal">' + App.ui.icon('plus', 'icon-sm') + 'Thêm mục tiêu</button></div>';

  html += '<div class="filters" role="group" aria-label="Lọc theo nhóm">' + chips.map(function (c) {
    return '<button type="button" class="chip ' + (c.key ? App.util.groupClass(c.key) : '') + (filter === c.key ? ' is-on' : '') +
      '" data-action="filter-group" data-group="' + esc(c.key) + '" aria-pressed="' + (filter === c.key) + '">' +
      (c.key ? '<i class="dot"></i>' : '') + esc(c.key ? c.key : c.label) + '</button>';
  }).join('') + '</div>';

  // Đang làm lên trước, rồi Tạm dừng, cuối cùng Hoàn thành
  var order = { 'Đang làm': 0, 'Tạm dừng': 1, 'Hoàn thành': 2 };
  var list = state.goals.filter(function (g) { return !filter || g.group === filter; })
    .sort(function (a, b) {
      return (order[a.status] || 0) - (order[b.status] || 0) || ((a.end_date || '') < (b.end_date || '') ? -1 : 1);
    });

  if (!state.goals.length) {
    html += '<div class="card empty"><p>Chưa có mục tiêu nào. Tạo mục tiêu đầu tiên?</p>' +
      '<button type="button" class="btn btn-primary" data-action="new-goal">' + App.ui.icon('plus', 'icon-sm') + 'Tạo mục tiêu</button></div>';
  } else if (!list.length) {
    html += '<div class="card empty"><p>Chưa có mục tiêu nào trong nhóm ' + esc(filter) + '. Tạo mục tiêu đầu tiên?</p>' +
      '<button type="button" class="btn btn-primary" data-action="new-goal" data-group="' + esc(filter) + '">' +
      App.ui.icon('plus', 'icon-sm') + 'Tạo mục tiêu</button></div>';
  } else {
    html += '<div class="goal-grid">' + list.map(function (g) { return C.goalCard(g, state.tasks); }).join('') + '</div>';
  }
  return html;
};

App.views.goalDetail = function (state, ui, id) {
  var C = App.comp, L = App.logic, D = App.date, esc = App.util.esc;
  var g = state.goals.find(function (x) { return x.id === id; });
  var back = '<button type="button" class="back" data-action="go" data-href="#/muc-tieu">' + App.ui.icon('back', 'icon-sm') + 'Mục tiêu</button>';
  if (!g) {
    return back + '<div class="card empty"><p>Không tìm thấy mục tiêu này. Có thể nó đã bị xóa.</p></div>';
  }
  var today = D.today();
  var p = L.goalProgress(g, state.tasks);
  var goalsById = {}; goalsById[g.id] = g;
  var tasks = L.sortTasks(state.tasks.filter(function (t) { return t.goal_id === g.id; }));

  var html = back + '<section class="card detail-head ' + App.util.groupClass(g.group) + '">' +
    '<div class="goal-top">' + C.groupPill(g.group) + C.periodPill(g) + C.goalStatusPill(g.status) + '</div>' +
    '<h1>' + esc(g.name) + '</h1>' + C.progressBar(p.pct, true) +
    '<div class="goal-foot">' + (p.total ? '<span class="num">' + p.done + '/' + p.total + '</span> task đã xong · ' + L.levelLabel(p.pct) : 'Chưa có task nào') + '</div>' +
    '<dl class="facts">' +
    '<dt>Thời gian</dt><dd><span class="num">' + D.fmt(g.start_date) + '</span> đến <span class="num">' + D.fmt(g.end_date) + '</span></dd>' +
    '<dt>Trạng thái</dt><dd>' + esc(g.status) + '</dd>' +
    '<dt>Tính tiến độ</dt><dd>Theo task</dd>' +
    (g.note ? '<dt>Ghi chú</dt><dd>' + esc(g.note) + '</dd>' : '') +
    '</dl><div class="actions">' +
    '<button type="button" class="btn" data-action="edit-goal" data-id="' + esc(g.id) + '">' + App.ui.icon('edit', 'icon-sm') + 'Sửa</button>' +
    '<button type="button" class="btn btn-danger" data-action="delete-goal" data-id="' + esc(g.id) + '">' + App.ui.icon('trash', 'icon-sm') + 'Xóa</button>' +
    '</div></section>';

  html += '<section class="section" style="margin-top:18px"><h2 class="section-title">Task của mục tiêu' +
    (tasks.length ? ' <span class="count num">' + tasks.length + '</span>' : '') + '</h2>' +
    C.quickAdd('quick-add-goal', 'Thêm task, gõ tên rồi Enter', g.id) +
    (tasks.length
      ? C.taskList(tasks, { today: today, goalsById: goalsById, hideGoal: true, flashId: ui.flashId })
      : '<div class="card empty small"><p>Mục tiêu này chưa có task. Gõ tên task vào ô ở trên rồi bấm Enter.</p></div>') +
    '</section>';
  return html;
};

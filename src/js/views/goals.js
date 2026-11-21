/* Tab Mục tiêu: danh sách thẻ (lọc theo nhóm) và trang chi tiết một mục tiêu */
var App = window.App || (window.App = {});
App.views = App.views || {};

App.views.goals = function (state, ui) {
  var C = App.comp, esc = App.util.esc, icon = App.ui.icon, fl = App.flowers.html;
  var today = App.date.today();
  var filter = ui.groupFilter || '';
  var chips = [{ key: '', label: 'Tất cả' }].concat(App.C.GROUPS);

  var html = '<div class="page-head"><h1>' + fl('tulip', 30, 1) + 'Mục tiêu của mình</h1>' +
    '<button type="button" class="btn btn-primary" data-action="new-goal">' + icon('plus', 'ic18') + 'Thêm mục tiêu</button></div>';

  html += '<div class="filters" role="group" aria-label="Lọc theo nhóm">' + chips.map(function (c) {
    var m = c.key ? C.groupMeta(c.key) : null;
    return '<button type="button" class="fl' + (m ? ' fl-' + m.key : '') + (filter === c.key ? ' on' : '') +
      '" data-action="filter-group" data-group="' + esc(c.key) + '" aria-pressed="' + (filter === c.key) + '">' +
      icon(m ? m.icon : 'grid', 'ic14') + esc(c.key ? c.key : c.label) + '</button>';
  }).join('') + '</div>';

  // Đang làm lên trước, rồi Tạm dừng, cuối cùng Hoàn thành
  var order = { 'Đang làm': 0, 'Tạm dừng': 1, 'Hoàn thành': 2 };
  var list = state.goals.filter(function (g) { return !filter || g.group === filter; })
    .sort(function (a, b) {
      return (order[a.status] || 0) - (order[b.status] || 0) || ((a.end_date || '') < (b.end_date || '') ? -1 : 1);
    });

  if (!state.goals.length) {
    html += App.views.emptyCard('Chưa có mục tiêu nào. Tạo mục tiêu đầu tiên?', '',
      '<button type="button" class="btn btn-primary" data-action="new-goal">' + icon('plus', 'ic18') + 'Tạo mục tiêu</button>');
  } else if (!list.length) {
    html += App.views.emptyCard('Chưa có mục tiêu nào trong nhóm ' + esc(filter) + '. Tạo mục tiêu đầu tiên?', '',
      '<button type="button" class="btn btn-primary" data-action="new-goal" data-group="' + esc(filter) + '">' + icon('plus', 'ic18') + 'Tạo mục tiêu</button>');
  } else {
    html += '<div class="goal-grid">' + list.map(function (g) { return C.goalCard(g, state.tasks, today); }).join('') + '</div>';
  }
  return html;
};

App.views.goalDetail = function (state, ui, id) {
  var C = App.comp, L = App.logic, D = App.date, esc = App.util.esc, icon = App.ui.icon;
  var g = state.goals.find(function (x) { return x.id === id; });
  var back = '<button type="button" class="back" data-action="go" data-href="#/muc-tieu">' + icon('back', 'ic18') + 'Mục tiêu</button>';
  if (!g) {
    return back + App.views.emptyCard('Không tìm thấy mục tiêu này. Có thể nó đã bị xóa.', '');
  }
  var today = D.today();
  var p = L.goalProgress(g, state.tasks), m = C.groupMeta(g.group), f = App.flowers.pick(g.id);
  var goalsById = {}; goalsById[g.id] = g;
  var tasks = L.sortTasks(state.tasks.filter(function (t) { return t.goal_id === g.id; }));

  var html = back + '<section class="goal goal-detail g-' + m.key + '"><span class="tape" aria-hidden="true"></span>' +
    App.flowers.html(f.name, 40, f.tone, 'corner') +
    '<div class="goal-row"><span class="sticker">' + icon(m.icon) + '</span><div class="goal-main">' +
    '<h1 class="goal-name">' + esc(g.name) + '</h1>' +
    '<div class="meta">' + C.groupTag(g.group) + C.periodTag(g) + C.deadlineTag(g, today) + C.hearts(g) + '</div></div></div>' +
    C.progressBar(p.pct, true) +
    '<div class="goal-foot"><span>' + icon('check', 'ic14') + (p.total ? '<span><span class="num">' + p.done + '/' + p.total + '</span> task xong</span>' : '<span>Chưa có task</span>') + '</span>' +
    C.goalStatusLine(g, p) + '</div>' +
    '<dl class="facts">' +
    '<dt>' + icon('calendar', 'ic14') + 'Thời gian</dt><dd><span class="num">' + D.fmt(g.start_date) + '</span> đến <span class="num">' + D.fmt(g.end_date) + '</span></dd>' +
    '<dt>' + icon('flag', 'ic14') + 'Trạng thái</dt><dd>' + esc(g.status) + '</dd>' +
    '<dt>' + icon('barchart', 'ic14') + 'Tính tiến độ</dt><dd>Theo task</dd>' +
    (g.note ? '<dt>' + icon('text', 'ic14') + 'Ghi chú</dt><dd>' + esc(g.note) + '</dd>' : '') +
    '</dl><div class="actions">' +
    '<button type="button" class="btn btn-soft" data-action="edit-goal" data-id="' + esc(g.id) + '">' + icon('edit', 'ic18') + 'Sửa</button>' +
    '<button type="button" class="btn btn-danger" data-action="delete-goal" data-id="' + esc(g.id) + '">' + icon('trash', 'ic18') + 'Xóa</button>' +
    '</div></section>';

  html += '<section class="block"><h2 class="sec-title">' + App.flowers.html('sprig', 24, 1) + '<span>Task của mục tiêu</span>' +
    (tasks.length ? '<span class="badge num">' + tasks.length + '</span>' : '') + '</h2>' +
    C.quickAdd('quick-add-goal', 'Thêm task, gõ tên rồi Enter', g.id) +
    (tasks.length
      ? C.taskList(tasks, { today: today, goalsById: goalsById, hideGoal: true, flashId: ui.flashId })
      : App.views.emptyCard('Mục tiêu này chưa có task.', 'Gõ tên task vào ô ở trên rồi bấm Enter.')) +
    '</section>';
  return html;
};

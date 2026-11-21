/* Mẩu HTML dùng lại ở nhiều màn hình */
var App = window.App || (window.App = {});

App.comp = (function () {
  var esc = function (s) { return App.util.esc(s); };
  var icon = function (n, c) { return App.ui.icon(n, c); };
  var L = App.logic, D = App.date;

  function progressBar(pct, big) {
    var lv = L.level(pct);
    var w = Math.max(0, Math.min(100, pct));
    return '<div class="progress lv-' + lv + '" title="' + L.levelLabel(pct) + '">' +
      '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Tiến độ">' +
      '<i style="width:' + w + '%"></i></div>' +
      '<span class="pct num' + (big ? ' big' : '') + '">' + pct + '%</span></div>';
  }

  function groupPill(group) {
    return '<span class="pill ' + App.util.groupClass(group) + '"><i class="dot"></i>' + esc(group) + '</span>';
  }

  function goalStatusPill(status) {
    if (status === 'Hoàn thành') return '<span class="pill pill-ok">Hoàn thành</span>';
    if (status === 'Tạm dừng') return '<span class="pill pill-low">Tạm dừng</span>';
    return '';
  }

  function periodPill(g) {
    return '<span class="pill">' + App.util.numify(App.period.label(g.period_type, g.period_value)) + '</span>';
  }

  // ctx: { today, goalsById, hideGoal, flashId }
  function taskRow(t, ctx) {
    var done = L.isDone(t);
    var overdue = L.isOverdue(t, ctx.today);
    var soon = L.isDueSoon(t, ctx.today);
    var top = L.isTop3Today(t, ctx.today);
    var g = t.goal_id ? ctx.goalsById[t.goal_id] : null;
    var meta = [];

    if (!ctx.hideGoal) {
      meta.push(g
        ? '<span class="goal-name ' + App.util.groupClass(g.group) + '"><i class="dot"></i>' + esc(g.name) + '</span>'
        : '<span class="goal-name">' + esc(App.C.MISC) + '</span>');
    }
    if (t.due_date) meta.push('<span class="num' + (overdue ? ' is-late' : '') + '">' + D.fmt(t.due_date) + '</span>');
    if (overdue) meta.push('<span class="pill pill-warn">Trễ hạn</span>');
    else if (soon) meta.push('<span class="pill pill-pr">Sắp đến hạn</span>');
    if (t.priority === 'Cao') meta.push('<span class="pill pill-high">Ưu tiên cao</span>');
    else if (t.priority === 'Thấp') meta.push('<span class="pill pill-low">Ưu tiên thấp</span>');
    if (t.status === 'Đang làm') meta.push('<span class="pill">Đang làm</span>');

    var star = (!done || top)
      ? '<button type="button" class="icon-btn star' + (top ? ' is-on' : '') + '" data-action="toggle-top3" data-id="' + esc(t.id) + '"' +
        ' aria-pressed="' + top + '" aria-label="' + (top ? 'Bỏ khỏi Top 3' : 'Đưa vào Top 3 hôm nay') + ': ' + esc(t.title) + '">' + icon('star') + '</button>'
      : '';

    return '<li class="task' + (done ? ' is-done' : '') + (overdue ? ' is-overdue' : '') + '">' +
      '<button type="button" class="check' + (ctx.flashId === t.id ? ' pop' : '') + '" data-action="toggle-task" data-id="' + esc(t.id) + '"' +
      ' aria-pressed="' + done + '" aria-label="' + (done ? 'Bỏ đánh dấu xong' : 'Đánh dấu xong') + ': ' + esc(t.title) + '">' +
      '<span class="box">' + icon('check') + '</span></button>' +
      '<button type="button" class="task-body" data-action="open-task" data-id="' + esc(t.id) + '">' +
      '<span class="task-title">' + esc(t.title) + '</span>' +
      (meta.length ? '<span class="task-meta">' + meta.join('') + '</span>' : '') +
      '</button>' + star + '</li>';
  }

  function taskList(tasks, ctx) {
    return '<ul class="task-list">' + tasks.map(function (t) { return taskRow(t, ctx); }).join('') + '</ul>';
  }

  function goalCard(g, tasks) {
    var p = L.goalProgress(g, tasks);
    return '<button type="button" class="goal-card ' + App.util.groupClass(g.group) + '" data-action="open-goal" data-id="' + esc(g.id) + '">' +
      '<span class="goal-top">' + groupPill(g.group) + periodPill(g) + goalStatusPill(g.status) + '</span>' +
      '<h3>' + esc(g.name) + '</h3>' + progressBar(p.pct) +
      '<div class="goal-foot">' + (p.total
        ? '<span class="num">' + p.done + '/' + p.total + '</span> task đã xong'
        : 'Chưa có task nào') + '</div></button>';
  }

  function quickAdd(id, placeholder, goalId) {
    return '<form class="quick-add" data-form="quick-add"' + (goalId ? ' data-goal="' + esc(goalId) + '"' : '') + '>' +
      '<label class="sr-only" for="' + id + '">Tên việc mới</label>' +
      '<input id="' + id + '" class="input" name="title" autocomplete="off" maxlength="200" placeholder="' + esc(placeholder) + '">' +
      '<button type="submit" class="btn btn-primary" aria-label="Thêm việc">' + icon('plus') + '</button></form>';
  }

  return {
    progressBar: progressBar, groupPill: groupPill, goalStatusPill: goalStatusPill, periodPill: periodPill,
    taskRow: taskRow, taskList: taskList, goalCard: goalCard, quickAdd: quickAdd
  };
})();

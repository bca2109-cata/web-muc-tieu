/* Tab Mục tiêu: danh sách thẻ (lọc theo kỳ và nhóm) và trang chi tiết một mục tiêu */
var App = window.App || (window.App = {});
App.views = App.views || {};

App.views.goals = function (state, ui) {
  var C = App.comp, esc = App.util.esc, icon = App.ui.icon, fl = App.flowers.html;
  var today = App.date.today();
  var filter = ui.groupFilter || '';
  var chips = [{ key: '', label: 'Tất cả' }].concat(App.C.GROUPS);

  var html = '<div class="page-head"><h1>' + fl('tulip', 30, 1) + 'Mục tiêu của mình</h1>' +
    '<button type="button" class="btn btn-primary" data-action="new-goal">' + icon('plus', 'ic18') + 'Thêm mục tiêu</button></div>';

  // Lọc kỳ: '' = đang diễn ra, 'all' = tất cả, hoặc một loại kỳ kèm kỳ cụ thể
  var pType = ui.periodType || '', pVal = ui.periodValue || '';
  var isType = App.C.PERIOD_TYPES.indexOf(pType) >= 0;
  var pChips = [{ key: '', label: 'Đang diễn ra', icon: 'clock' }]
    .concat(App.C.PERIOD_TYPES.map(function (t) { return { key: t, label: t, icon: 'calendar' }; }))
    .concat([{ key: 'all', label: 'Tất cả', icon: 'grid' }]);
  html += '<div class="filters" role="group" aria-label="Lọc theo kỳ">' + pChips.map(function (c) {
    return '<button type="button" class="fl' + (pType === c.key ? ' on' : '') + '" data-action="filter-period" data-type="' + c.key +
      '" aria-pressed="' + (pType === c.key) + '">' + icon(c.icon, 'ic14') + c.label + '</button>';
  }).join('') + '</div>';
  if (isType) {
    // Kỳ quanh hôm nay, cộng các kỳ đã có mục tiêu
    var vals = App.period.options(pType, today);
    state.goals.forEach(function (g) { if (g.period_type === pType && vals.indexOf(g.period_value) < 0) vals.push(g.period_value); });
    vals.sort();
    html += '<label class="period-pick"><span>' + icon('calendar', 'ic14') + 'Kỳ</span><select class="select" name="period-value">' +
      vals.map(function (v) {
        var n = state.goals.filter(function (g) { return g.period_type === pType && g.period_value === v; }).length;
        return '<option value="' + esc(v) + '"' + (v === pVal ? ' selected' : '') + '>' + esc(App.period.label(pType, v)) + (n ? ' (' + n + ')' : '') + '</option>';
      }).join('') + '</select></label>';
  }

  html += '<div class="filters" role="group" aria-label="Lọc theo nhóm">' + chips.map(function (c) {
    var m = c.key ? C.groupMeta(c.key) : null;
    return '<button type="button" class="fl' + (m ? ' fl-' + m.key : '') + (filter === c.key ? ' on' : '') +
      '" data-action="filter-group" data-group="' + esc(c.key) + '" aria-pressed="' + (filter === c.key) + '">' +
      icon(m ? m.icon : 'grid', 'ic14') + esc(c.key ? c.key : c.label) + '</button>';
  }).join('') + '</div>';

  // Đang làm lên trước, rồi Tạm dừng, cuối cùng Hoàn thành
  var order = { 'Đang làm': 0, 'Tạm dừng': 1, 'Hoàn thành': 2 };
  function inPeriod(g) {
    if (pType === 'all') return true;
    if (isType) return g.period_type === pType && g.period_value === pVal;
    return !!g.start_date && g.start_date <= today && (!g.end_date || today <= g.end_date);
  }
  var periodName = pType === 'all' ? '' : isType ? App.period.label(pType, pVal) : 'đang diễn ra';
  var list = state.goals.filter(function (g) { return inPeriod(g) && (!filter || g.group === filter); })
    .sort(function (a, b) {
      return (order[a.status] || 0) - (order[b.status] || 0) || ((a.end_date || '') < (b.end_date || '') ? -1 : 1);
    });

  if (!state.goals.length) {
    html += App.views.emptyCard('Chưa có mục tiêu nào. Tạo mục tiêu đầu tiên?', '',
      '<button type="button" class="btn btn-primary" data-action="new-goal">' + icon('plus', 'ic18') + 'Tạo mục tiêu</button>');
  } else if (!list.length) {
    var where = (periodName ? (isType ? ' cho ' : ' ') + periodName : '') + (filter ? ' trong nhóm ' + filter : '');
    html += App.views.emptyCard('Chưa có mục tiêu nào' + esc(where) + '. Tạo mục tiêu đầu tiên?', '',
      '<button type="button" class="btn btn-primary" data-action="new-goal" data-group="' + esc(filter) + '"' +
      (isType ? ' data-ptype="' + esc(pType) + '" data-pvalue="' + esc(pVal) + '"' : '') + '>' + icon('plus', 'ic18') + 'Tạo mục tiêu</button>');
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
  var slow = L.slowInfo(g, state.tasks, today), metric = p.mode === 'metric';
  var goalsById = {}; goalsById[g.id] = g;
  var tasks = L.sortTasks(state.tasks.filter(function (t) { return t.goal_id === g.id; }));

  var html = back + '<section class="goal goal-detail g-' + m.key + '"><span class="tape" aria-hidden="true"></span>' +
    App.flowers.html(f.name, 40, f.tone, 'corner') +
    '<div class="goal-row"><span class="sticker">' + icon(m.icon) + '</span><div class="goal-main">' +
    '<h1 class="goal-name">' + esc(g.name) + '</h1>' +
    '<div class="meta">' + C.groupTag(g.group) + C.periodTag(g) + C.deadlineTag(g, today) + C.hearts(g) + '</div></div></div>' +
    C.progressBar(p.pct, true) +
    '<div class="goal-foot"><span>' + C.progressCount(p) + '</span>' + C.goalStatusLine(g, p, slow) + '</div>' +
    (slow ? '<p class="slow-note">' + icon('alert', 'ic14') + '<span>Đã qua <span class="num">' + slow.time + '%</span> thời gian của kỳ, mới đạt <span class="num">' + slow.pct + '%</span>. Cần tăng tốc.</span></p>' : '') +
    (metric ? '<button type="button" class="btn btn-primary metric-add" data-action="metric-add" data-id="' + esc(g.id) + '">' + icon('plus', 'ic18') + 'Cập nhật' + (g.unit ? ' ' + esc(g.unit) : '') + '</button>' : '') +
    '<dl class="facts">' +
    '<dt>' + icon('calendar', 'ic14') + 'Thời gian</dt><dd><span class="num">' + D.fmt(g.start_date) + '</span> đến <span class="num">' + D.fmt(g.end_date) + '</span></dd>' +
    '<dt>' + icon('flag', 'ic14') + 'Trạng thái</dt><dd>' + esc(g.status) + '</dd>' +
    '<dt>' + icon('barchart', 'ic14') + 'Tính tiến độ</dt><dd>' + (metric
      ? 'Theo chỉ số: đạt <span class="num">' + L.fmtVi(p.done) + '</span> trên <span class="num">' + L.fmtVi(p.total) + '</span>' + (g.unit ? ' ' + esc(g.unit) : '')
      : p.mode === 'habit' ? 'Theo thói quen: đã tick <span class="num">' + p.done + '</span> trên <span class="num">' + p.total + '</span> ngày cần làm, tính đến hôm nay'
      : 'Theo task') + '</dd>' +
    '<dt>' + icon('clock', 'ic14') + 'Thời gian đã qua</dt><dd><span class="num">' + L.timePct(g, today) + '%</span></dd>' +
    (g.note ? '<dt>' + icon('text', 'ic14') + 'Ghi chú</dt><dd>' + esc(g.note) + '</dd>' : '') +
    '</dl><div class="actions">' +
    '<button type="button" class="btn btn-soft" data-action="edit-goal" data-id="' + esc(g.id) + '">' + icon('edit', 'ic18') + 'Sửa</button>' +
    '<button type="button" class="btn btn-danger" data-action="delete-goal" data-id="' + esc(g.id) + '">' + icon('trash', 'ic18') + 'Xóa</button>' +
    '</div></section>';

  // Thói quen gắn với mục tiêu (luôn hiện khi tính theo thói quen)
  var habits = state.habits.filter(function (h) { return h.goal_id === g.id; });
  if (habits.length || p.mode === 'habit') {
    html += '<section class="block"><h2 class="sec-title">' + App.flowers.html('daisy', 24, 5) + '<span>Thói quen của mục tiêu</span>' +
      (habits.length ? '<span class="badge num">' + habits.length + '</span>' : '') +
      '<button type="button" class="btn btn-soft sec-btn" data-action="new-habit" data-goal="' + esc(g.id) + '">' + icon('plus', 'ic18') + 'Thêm thói quen</button></h2>' +
      (habits.length ? '<ul class="task-list">' + habits.map(function (h) {
        var s = L.habitStreak(h, state.habitLogs, today), on = L.habitActive(h);
        return '<li class="task"><span class="ticon tplain">' + icon(on ? 'calcheck' : 'pause') + '</span>' +
          '<button type="button" class="task-body" data-action="edit-habit" data-id="' + esc(h.id) + '"><span class="task-title">' + esc(h.name) + '</span>' +
          '<span class="meta">' + C.tag('tplain', 'refresh', App.util.numify(L.ruleLabel(h.frequency) || 'Hằng ngày')) +
          (on ? App.views.habitParts.streakLine(s) : C.tag('tplain', 'pause', 'Tạm dừng')) + '</span></button></li>';
      }).join('') + '</ul>'
        : App.views.emptyCard('Mục tiêu này chưa có thói quen.', 'Bấm "Thêm thói quen" để tạo và gắn vào mục tiêu.')) + '</section>';
  }

  html += '<section class="block"><h2 class="sec-title">' + App.flowers.html('sprig', 24, 1) + '<span>Task của mục tiêu</span>' +
    (tasks.length ? '<span class="badge num">' + tasks.length + '</span>' : '') + '</h2>' +
    C.quickAdd('quick-add-goal', 'Thêm task, gõ tên rồi Enter', g.id) +
    (tasks.length
      ? C.taskList(tasks, { today: today, goalsById: goalsById, hideGoal: true, flashId: ui.flashId })
      : App.views.emptyCard('Mục tiêu này chưa có task.', 'Gõ tên task vào ô ở trên rồi bấm Enter.')) +
    '</section>';
  return html;
};

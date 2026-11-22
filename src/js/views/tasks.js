/* Tab Task: mọi việc, lọc theo trạng thái hoàn thành, trạng thái đến hạn, mức quan trọng (ưu tiên), mức khẩn cấp (ô ma trận),
   mục tiêu, khoảng ngày đến hạn; bấm tiêu đề cột để sắp xếp; danh sách việc lặp lại */
var App = window.App || (window.App = {});
App.views = App.views || {};

App.views.tasks = function (state, ui) {
  var C = App.comp, L = App.logic, D = App.date, esc = App.util.esc, icon = App.ui.icon, fl = App.flowers.html;
  var today = D.today();
  var f = ui.taskFilter;
  var goalsById = {};
  state.goals.forEach(function (g) { goalsById[g.id] = g; });
  var ctx = { today: today, goalsById: goalsById, flashId: ui.flashId, sort: ui.taskSort, scope: 'task' };

  var DUE = {
    '': function () { return true; },
    over: function (t) { return L.dueState(t, today) === 'over'; },
    due: function (t) { return L.dueState(t, today) === 'due'; },
    later: function (t) { return !!t.due_date && L.dueState(t, today) === 'later'; },
    none: function (t) { return !t.due_date; },
    missed: function (t) { return L.isMissed(t, today); }
  };
  var list = state.tasks.filter(function (t) {
    // Lần lặp bỏ lỡ chỉ hiện khi chọn lọc "Lần lặp bỏ lỡ"
    if (f.due !== 'missed' && L.isMissed(t, today)) return false;
    if (f.status === 'open' && L.isDone(t)) return false;
    if (f.status && f.status !== 'open' && t.status !== f.status) return false;
    if (f.priority && (t.priority || 'Trung bình') !== f.priority) return false;
    if (f.goal === '__misc' && t.goal_id && goalsById[t.goal_id]) return false;
    if (f.goal && f.goal !== '__misc' && t.goal_id !== f.goal) return false;
    if (f.quad && String(L.quadrant(t, today)) !== f.quad) return false;
    if ((f.from || f.to) && !t.due_date) return false;
    if (f.from && t.due_date < f.from) return false;
    if (f.to && t.due_date > f.to) return false;
    return (DUE[f.due] || DUE['']) (t);
  });

  function select(name, label, iconName, opts) {
    return '<label class="tf"><span>' + icon(iconName, 'ic14') + label + '</span><select class="select" data-filter="' + name + '">' +
      opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (f[name] === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') +
      '</select></label>';
  }
  var goalOpts = [['', 'Tất cả'], ['__misc', App.C.MISC]].concat(state.goals.map(function (g) { return [g.id, g.name]; }));
  var changed = f.status !== 'open' || f.priority || f.goal || f.due || f.quad || f.from || f.to;
  function dateBox(name, label) {
    return '<label class="tf"><span>' + icon('calendar', 'ic14') + label + '</span><input class="input" type="date" data-filter="' + name + '" value="' + esc(f[name] || '') + '"></label>';
  }
  var quadOpts = [['', 'Tất cả']].concat([1, 2, 3, 4].map(function (q) { return [String(q), L.QUADRANTS[q].label]; }));

  var html = '<div class="page-head"><h1>' + fl('lavender', 30, 3) + 'Tất cả việc</h1></div>';
  html += C.quickAdd('quick-add-task', 'Thêm việc, gõ tên rồi Enter');
  html += '<section class="card task-filters" aria-label="Bộ lọc">' +
    select('status', 'Hoàn thành', 'check', [['open', 'Chưa xong'], ['Xong', 'Xong'], ['', 'Tất cả'], ['Cần làm', 'Cần làm'], ['Đang làm', 'Đang làm']]) +
    select('due', 'Đến hạn', 'clock', [['', 'Tất cả'], ['over', 'Quá hạn'], ['due', 'Đến hạn hôm nay'], ['later', 'Chưa đến hạn'], ['none', 'Chưa có hạn'], ['missed', 'Lần lặp bỏ lỡ']]) +
    select('priority', 'Quan trọng', 'up', [['', 'Tất cả'], ['Cao', 'Cao'], ['Trung bình', 'Trung bình'], ['Thấp', 'Thấp']]) +
    select('quad', 'Khẩn cấp', 'flame', quadOpts) +
    select('goal', 'Mục tiêu', 'target', goalOpts) +
    '<div class="tf-range">' + dateBox('from', 'Hạn từ ngày') + dateBox('to', 'Đến ngày') + '</div>' +
    '<div class="tf-foot"><p class="hint">' + icon('sparkle', 'ic14') + 'Bấm tên cột trong bảng để sắp xếp.</p>' +
    (changed ? '<button type="button" class="btn btn-soft tf-reset" data-action="task-reset">' + icon('refresh', 'ic14') + 'Bỏ lọc</button>' : '') +
    '</div></section>';

  html += '<section class="block" aria-labelledby="tl-title"><h2 class="sec-title" id="tl-title">' + fl('sprig', 24, 1) +
    '<span>Danh sách việc</span><span class="badge num">' + list.length + '</span></h2>' +
    (list.length ? App.views.taskTable(list, ctx)
      : App.views.emptyCard(state.tasks.length ? 'Không có việc nào khớp bộ lọc.' : 'Chưa có việc nào.',
        state.tasks.length ? 'Đổi bộ lọc hoặc bấm Bỏ lọc.' : 'Gõ tên việc vào ô ở trên rồi bấm Enter để thêm.')) + '</section>';

  // Việc lặp lại (việc mẫu)
  var tpls = state.templates.slice().sort(function (a, b) { return a.title < b.title ? -1 : 1; });
  html += '<section class="block" aria-labelledby="rc-title"><h2 class="sec-title" id="rc-title">' + fl('daisy', 24, 5) +
    '<span>Việc lặp lại</span><span class="badge num">' + tpls.length + '</span></h2>' +
    (tpls.length ? '<ul class="task-list recur-list">' + tpls.map(function (t) {
      var g = t.goal_id ? goalsById[t.goal_id] : null;
      return '<li class="task"><span class="ticon tplain">' + icon(L.iconOf(t)) + '</span>' +
        '<button type="button" class="task-body" data-action="open-task" data-id="' + esc(t.id) + '">' +
        '<span class="task-title">' + esc(t.title) + '</span><span class="meta">' +
        C.tag('tplain', 'refresh', App.util.numify(L.ruleLabel(t.recurring_rule))) +
        C.tag('tplain', 'calendar', 'Từ <span class="num">' + D.fmt(t.due_date) + '</span>') +
        (g ? C.tag(C.groupMeta(g.group).cls + ' goal-tag', C.groupMeta(g.group).icon, esc(g.name)) : C.tag('tplain', 'tag', esc(App.C.MISC))) +
        '</span></button></li>';
    }).join('') + '</ul>'
      : '<p class="muted soon-none">Chưa có việc lặp lại. Bấm "Thêm đầy đủ" rồi chọn Lặp lại để tạo.</p>') + '</section>';
  return html;
};

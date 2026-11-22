/* Tab Task: hai màn
   - Tất cả việc: lọc theo trạng thái hoàn thành, đến hạn, Quan trọng, ô ma trận, mục tiêu, khoảng hạn chót; bấm tiêu đề cột để sắp xếp
   - Kho (GĐ6): việc chưa có Ngày sẽ làm; sắp theo nằm kho lâu nhất / dời nhiều nhất, lọc theo mục tiêu; nút Xem lại kho
   cùng danh sách việc lặp lại */
var App = window.App || (window.App = {});
App.views = App.views || {};

App.views.tasks = function (state, ui) {
  var C = App.comp, L = App.logic, D = App.date, esc = App.util.esc, icon = App.ui.icon, fl = App.flowers.html;
  var today = D.today();
  var goalsById = {};
  state.goals.forEach(function (g) { goalsById[g.id] = g; });
  var kids = C.kidsMap(state.tasks);
  var ctx = { today: today, goalsById: goalsById, flashId: ui.flashId, sort: ui.taskSort, scope: 'task', kids: kids };
  var inbox = state.tasks.filter(function (t) { return L.inInbox(t); });
  var view = ui.taskView === 'inbox' ? 'inbox' : 'all';

  var html = '<div class="page-head"><h1>' + fl('lavender', 30, 3) + (view === 'inbox' ? 'Kho việc' : 'Tất cả việc') + '</h1>' +
    '<span class="seg-switch" role="group" aria-label="Màn xem">' +
    '<button type="button" data-action="task-view" data-view="all" aria-pressed="' + (view === 'all') + '"' + (view === 'all' ? ' class="on"' : '') + '>' + icon('list', 'ic14') + 'Tất cả</button>' +
    '<button type="button" data-action="task-view" data-view="inbox" aria-pressed="' + (view === 'inbox') + '"' + (view === 'inbox' ? ' class="on"' : '') + '>' + icon('box', 'ic14') + 'Kho <span class="num">' + inbox.length + '</span></button>' +
    '</span></div>';
  html += C.quickAdd('quick-add-task', 'Thêm việc, gõ tên rồi Enter', '', 'kho');

  if (view === 'inbox') return html + App.views.inbox(state, ui, inbox, ctx);

  var f = ui.taskFilter;
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
    if (f.imp === 'yes' && !L.isImportant(t)) return false;
    if (f.imp === 'no' && L.isImportant(t)) return false;
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
  var changed = f.status !== 'open' || f.imp || f.goal || f.due || f.quad || f.from || f.to;
  function dateBox(name, label) {
    return '<label class="tf"><span>' + icon('calendar', 'ic14') + label + '</span><input class="input" type="date" data-filter="' + name + '" value="' + esc(f[name] || '') + '"></label>';
  }
  var quadOpts = [['', 'Tất cả']].concat([1, 2, 3, 4].map(function (q) { return [String(q), L.QUADRANTS[q].label]; }));

  html += '<section class="card task-filters" aria-label="Bộ lọc">' +
    select('status', 'Hoàn thành', 'check', [['open', 'Chưa xong'], ['Xong', 'Xong'], ['', 'Tất cả'], ['Cần làm', 'Cần làm'], ['Đang làm', 'Đang làm']]) +
    select('due', 'Hạn chót', 'clock', [['', 'Tất cả'], ['over', 'Quá hạn'], ['due', 'Đến hạn hôm nay'], ['later', 'Chưa đến hạn'], ['none', 'Chưa có hạn'], ['missed', 'Lần lặp bỏ lỡ']]) +
    select('imp', 'Quan trọng', 'heart', [['', 'Tất cả'], ['yes', 'Quan trọng'], ['no', 'Không quan trọng']]) +
    select('quad', 'Ô ma trận', 'flame', quadOpts) +
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
      var rule = L.parseRule(t.recurring_rule), dup = rule && rule.daily ? L.similarHabit(t.title, state.habits) : null;
      return '<li class="task"><span class="ticon tplain">' + icon(L.iconOf(t)) + '</span>' +
        '<button type="button" class="task-body" data-action="open-task" data-id="' + esc(t.id) + '">' +
        '<span class="task-title">' + esc(t.title) + '</span><span class="meta">' +
        C.tag('tplain', 'refresh', App.util.numify(L.ruleLabel(t.recurring_rule))) +
        C.tag('tplain', 'calendar', 'Từ <span class="num">' + D.fmt(t.due_date) + '</span>') + C.durTag(t) +
        (dup ? C.tag('twarm', 'alert', 'Trùng thói quen "' + esc(dup.name) + '", không tạo việc') : '') +
        (g ? C.tag(C.groupMeta(g.group).cls + ' goal-tag', C.groupMeta(g.group).icon, esc(g.name)) : C.tag('tplain', 'tag', esc(App.C.MISC))) +
        '</span></button></li>';
    }).join('') + '</ul>'
      : '<p class="muted soon-none">Chưa có việc lặp lại. Bấm "Thêm đầy đủ" rồi chọn Lặp lại để tạo.</p>') + '</section>';
  return html;
};

/* Màn Kho: sắp theo nằm kho lâu nhất / dời nhiều nhất / quan trọng trước, lọc theo mục tiêu.
   Mỗi việc có nút đặt nhanh Ngày sẽ làm (Hôm nay, Mai), việc lớn có nút Chia nhỏ. */
App.views.inbox = function (state, ui, inbox, ctx) {
  var C = App.comp, L = App.logic, D = App.date, esc = App.util.esc, icon = App.ui.icon, fl = App.flowers.html;
  var today = ctx.today, sort = ui.inboxSort || 'age', goal = ui.inboxGoal || '';
  var list = inbox.filter(function (t) {
    if (goal === '__misc') return !t.goal_id || !ctx.goalsById[t.goal_id];
    return !goal || t.goal_id === goal;
  });
  var CMP = {
    age: function (a, b) { return L.inboxDays(b, today) - L.inboxDays(a, today) || L.deferCount(b) - L.deferCount(a); },
    defer: function (a, b) { return L.deferCount(b) - L.deferCount(a) || L.inboxDays(b, today) - L.inboxDays(a, today); },
    imp: function (a, b) { return L.impRank(a) - L.impRank(b) || (L.dueKey(a) < L.dueKey(b) ? -1 : L.dueKey(a) > L.dueKey(b) ? 1 : 0) || L.inboxDays(b, today) - L.inboxDays(a, today); }
  };
  list.sort(CMP[sort] || CMP.age);
  var goalOpts = [['', 'Tất cả'], ['__misc', App.C.MISC]].concat(state.goals.map(function (g) { return [g.id, g.name]; }));
  var html = '<section class="card task-filters inbox-filters" aria-label="Sắp xếp và lọc kho">' +
    '<label class="tf"><span>' + icon('sort', 'ic14') + 'Sắp xếp</span><select class="select" name="inbox-sort">' +
    [['age', 'Nằm kho lâu nhất'], ['defer', 'Dời nhiều nhất'], ['imp', 'Quan trọng, hạn gần trước']].map(function (o) {
      return '<option value="' + o[0] + '"' + (sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('') + '</select></label>' +
    '<label class="tf"><span>' + icon('target', 'ic14') + 'Mục tiêu</span><select class="select" name="inbox-goal">' +
    goalOpts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (goal === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>' +
    '<div class="tf-foot"><p class="hint">' + icon('sparkle', 'ic14') + 'Kho là việc chưa có Ngày sẽ làm. Việc chưa xong của ngày trước tự về đây, số lần dời tăng thêm 1.</p>' +
    (inbox.length ? '<button type="button" class="btn btn-primary" data-action="inbox-review">' + icon('box', 'ic18') + 'Xem lại kho</button>' : '') + '</div></section>';
  html += '<section class="block" aria-labelledby="ib-title"><h2 class="sec-title" id="ib-title">' + fl('sprig', 24, 1) +
    '<span>Việc trong kho</span><span class="badge num">' + list.length + '</span></h2>';
  if (!list.length) return html + App.views.emptyCard(inbox.length ? 'Không có việc nào khớp bộ lọc.' : 'Kho trống.', inbox.length ? 'Đổi mục tiêu ở bộ lọc.' : 'Việc thêm mà chưa chọn ngày sẽ nằm ở đây.') + '</section>';
  html += '<ul class="task-list inbox-list">' + list.map(function (t) {
    var q = L.quadrant(t, today), n = L.inboxDays(t, today), g = t.goal_id ? ctx.goalsById[t.goal_id] : null;
    var big = L.needsSplit(t, state.tasks), kids = ctx.kids[t.id];
    return '<li class="task"><span class="qbar b' + q + '"></span>' + C.tickButton(t, ctx) +
      '<button type="button" class="task-body" data-action="open-task" data-id="' + esc(t.id) + '"><span class="task-title">' + esc(t.title) + '</span>' + C.firstStep(t) +
      '<span class="meta">' + (kids ? C.kidsTag(t, ctx) : C.durTag(t)) + C.impTag(t) + C.deferTag(t) +
      C.tag('tplain', 'box', n ? 'Nằm kho <span class="num">' + n + '</span> ngày' : 'Vào kho hôm nay') +
      (t.due_date ? C.dueTag(t, today) : '') +
      (g ? C.tag(C.groupMeta(g.group).cls + ' goal-tag', C.groupMeta(g.group).icon, esc(g.name)) : C.tag('tplain', 'tag', esc(App.C.MISC))) +
      '</span></button><span class="ib-acts">' +
      (kids ? '<span class="muted ib-note">Xếp ngày cho từng việc con</span>'
        : big ? '<button type="button" class="btn btn-soft" data-action="split-task" data-id="' + esc(t.id) + '">' + icon('list', 'ic14') + 'Chia nhỏ</button>'
        : '<button type="button" class="btn btn-soft" data-action="do-day" data-id="' + esc(t.id) + '" data-day="' + today + '">Hôm nay</button>' +
          '<button type="button" class="btn btn-soft" data-action="do-day" data-id="' + esc(t.id) + '" data-day="' + D.addDays(today, 1) + '">Mai</button>') +
      '</span></li>';
  }).join('') + '</ul></section>';
  return html;
};

/* Mẩu HTML dùng lại ở nhiều màn hình */
var App = window.App || (window.App = {});

App.comp = (function () {
  var esc = function (s) { return App.util.esc(s); };
  var icon = function (n, c) { return App.ui.icon(n, c); };
  var fl = function (n, size, tone, cls, style) { return App.flowers.html(n, size, tone, cls, style); };
  var L = App.logic, D = App.date;

  var GROUP_META = {
    'Công việc': { cls: 'tw', key: 'w', icon: 'brief' },
    'Học tập': { cls: 'ts', key: 's', icon: 'book' },
    'Sức khỏe': { cls: 'th', key: 'h', icon: 'leaf' }
  };
  function groupMeta(group) { return GROUP_META[group] || { cls: 'tplain', key: 'x', icon: 'tag' }; }

  // Nhãn tròn có icon. html đã được thoát ký tự từ trước
  function tag(cls, iconName, html, title) {
    return '<span class="tag ' + cls + '"' + (title ? ' title="' + esc(title) + '"' : '') + '>' + icon(iconName, 'ic14') + '<span>' + html + '</span></span>';
  }

  function progressBar(pct, big) {
    var lv = L.level(pct);
    var w = Math.max(0, Math.min(100, pct));
    return '<span class="progress lv-' + lv + (big ? ' big' : '') + '" title="' + L.levelLabel(pct) + '">' +
      '<span class="track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Tiến độ">' +
      '<i style="width:' + w + '%"></i></span>' +
      '<span class="pct num">' + pct + '%</span></span>';
  }

  function groupTag(group) {
    var m = groupMeta(group);
    return tag(m.cls, m.icon, esc(group));
  }

  function periodTag(g) {
    return tag(groupMeta(g.group).cls, 'calendar', App.util.numify(App.period.label(g.period_type, g.period_value)));
  }

  function deadlineTag(g, today) {
    var d = L.goalDeadline(g, today);
    if (!d) return '';
    var ic = d.kind === 'plain' ? 'pause' : g.status === 'Hoàn thành' ? 'check' : 'clock';
    return tag(d.kind === 'plain' ? 'tplain' : 't' + d.kind, ic, App.util.numify(d.text));
  }

  function hearts(g) {
    var n = L.importance(g), out = '';
    for (var i = 1; i <= 3; i++) out += icon('heart', i <= n ? 'fill' : '');
    return '<span class="hearts" title="Mức quan trọng: ' + n + ' trên 3" aria-label="Mức quan trọng ' + n + ' trên 3">' + out + '</span>';
  }

  // Nhãn hạn của task: "Trễ 2 ngày", "Hôm nay", "Ngày mai", hoặc ngày dd/mm/yyyy
  function dueTag(t, today) {
    if (!t.due_date) return tag('tplain', 'clock', 'Chưa có hạn');
    if (L.isMissed(t, today)) return tag('tplain', 'refresh', 'Bỏ lỡ <span class="num">' + D.fmt(t.due_date) + '</span>', 'Lần lặp đã qua ngày, vẫn tính vào % mục tiêu');
    if (L.isOverdue(t, today)) return tag('tq1', 'clock', 'Trễ <span class="num">' + D.diffDays(t.due_date, today) + '</span> ngày');
    if (L.isDueSoon(t, today)) {
      var when = t.due_date === today ? 'hôm nay' : t.due_date === D.addDays(today, 1) ? 'ngày mai' : 'ngày kia';
      return tag('twarm', 'clock', '<span class="soon-lbl">Sắp đến hạn: </span>' + when, 'Sắp đến hạn: ' + when);
    }
    if (t.due_date === today) return tag('tplain', 'clock', 'Hôm nay');
    if (t.due_date === D.addDays(today, 1)) return tag('tplain', 'clock', 'Ngày mai');
    return tag('tplain', 'clock', '<span class="num">' + D.fmt(t.due_date) + '</span>');
  }

  function quadTag(q) {
    var Q = L.QUADRANTS[q];
    return tag('tq' + q, Q.icon, Q.label, Q.hint);
  }

  function tickButton(t, ctx) {
    var done = L.isDone(t);
    return '<button type="button" class="tick' + (ctx.flashId === t.id ? ' tick-pop' : '') + '" data-action="toggle-task" data-id="' + esc(t.id) + '"' +
      ' aria-pressed="' + done + '" aria-label="' + (done ? 'Bỏ đánh dấu xong' : 'Đánh dấu xong') + ': ' + esc(t.title) + '">' +
      '<span class="dot">' + icon('check') + '</span></button>';
  }

  function starButton(t, ctx) {
    var top = L.isTop3Today(t, ctx.today);
    if (L.isDone(t) && !top) return '';
    return '<button type="button" class="act star' + (top ? ' is-on' : '') + '" data-action="toggle-top3" data-id="' + esc(t.id) + '"' +
      ' aria-pressed="' + top + '" aria-label="' + (top ? 'Bỏ khỏi Top 3' : 'Đưa vào Top 3 hôm nay') + ': ' + esc(t.title) + '">' + icon('star') + '</button>';
  }

  function taskMeta(t, ctx, q) {
    var meta = [quadTag(q), dueTag(t, ctx.today)];
    if (t.priority === 'Cao') meta.push(tag('tpri', 'up', 'Cao'));
    else if (t.priority === 'Thấp') meta.push(tag('tplain', 'down', 'Thấp'));
    if (t.status === 'Đang làm') meta.push(tag('tplain', 'play', 'Đang làm'));
    if (t.parent_recurring_id) meta.push(tag('tplain', 'refresh', 'Lặp lại'));
    if (!ctx.hideGoal) {
      var g = t.goal_id ? ctx.goalsById[t.goal_id] : null;
      meta.push(g ? tag(groupMeta(g.group).cls + ' goal-tag', groupMeta(g.group).icon, esc(g.name)) : tag('tplain', 'tag', esc(App.C.MISC)));
    }
    return '<span class="meta">' + meta.join('') + '</span>';
  }

  // ctx: { today, goalsById, hideGoal, flashId }
  function taskRow(t, ctx) {
    var done = L.isDone(t), q = L.quadrant(t, ctx.today);
    return '<li class="task' + (done ? ' is-done' : '') + '">' +
      (done ? '' : '<span class="qbar b' + q + '"></span>') + tickButton(t, ctx) +
      '<span class="ticon tq' + q + '">' + icon(L.iconOf(t)) + '</span>' +
      '<button type="button" class="task-body" data-action="open-task" data-id="' + esc(t.id) + '">' +
      '<span class="task-title">' + esc(t.title) + '</span>' + (done ? '' : taskMeta(t, ctx, q)) + '</button>' +
      starButton(t, ctx) + '</li>';
  }

  function taskList(tasks, ctx) {
    return '<ul class="task-list">' + tasks.map(function (t) { return taskRow(t, ctx); }).join('') + '</ul>';
  }

  // Tờ giấy note Top 3
  var PINS = [['tulip', 1], ['daisy', 3], ['plumeria', 6]];
  function topNote(t, i, ctx) {
    var done = L.isDone(t), q = L.quadrant(t, ctx.today);
    var g = t.goal_id ? ctx.goalsById[t.goal_id] : null;
    return '<li class="note' + (done ? ' is-done' : '') + '">' + fl(PINS[i][0], 28, PINS[i][1], 'pin') +
      '<span class="rank num" aria-hidden="true">' + (i + 1) + '</span>' + tickButton(t, ctx) +
      '<span class="ticon tq' + q + '">' + icon(L.iconOf(t)) + '</span>' +
      '<button type="button" class="task-body" data-action="open-task" data-id="' + esc(t.id) + '">' +
      '<span class="task-title">' + esc(t.title) + '</span>' +
      (done ? '' : '<span class="meta">' + quadTag(q) + dueTag(t, ctx.today) +
        (g ? tag(groupMeta(g.group).cls + ' goal-tag', groupMeta(g.group).icon, esc(g.name)) : '') + '</span>') +
      '</button>' + starButton(t, ctx) + '</li>';
  }

  // Ma trận 4 ô
  function matrix(tasks, ctx) {
    var out = '<div class="matrix">';
    [1, 2, 3, 4].forEach(function (q) {
      var Q = L.QUADRANTS[q];
      var items = L.sortTasks(tasks.filter(function (t) { return L.quadrant(t, ctx.today) === q; }));
      var open = items.filter(function (t) { return !L.isDone(t); }).length;
      out += '<section class="q q' + q + '" aria-label="' + Q.label + ': ' + Q.hint + '"><h3 title="' + Q.hint + '">' + icon(Q.icon, 'ic14') + Q.label +
        '<span class="num qn">' + open + '</span></h3><p class="q-act">' + Q.act + '</p><ul>' +
        (items.length ? items.map(function (t) {
          return '<li class="' + (L.isDone(t) ? 'is-done' : '') + '">' + tickButton(t, ctx) +
            '<button type="button" class="qname" data-action="open-task" data-id="' + esc(t.id) + '" title="' + esc(t.title) + '">' +
            icon(L.iconOf(t), 'ic14') + '<span>' + esc(t.title) + '</span></button></li>';
        }).join('') : '<li class="none">Trống, nhẹ nhàng ghê</li>') + '</ul></section>';
    });
    return out + '</div>';
  }

  function goalStatusLine(g, p, slow) {
    if (slow) return '<span class="lv-text-warn" title="Đã qua ' + slow.time + '% thời gian, mới đạt ' + slow.pct + '%">' + icon('alert', 'ic14') + 'Chậm tiến độ</span>';
    if (!p.total) return '<span class="muted">' + icon('sparkle', 'ic14') + (p.mode === 'metric' ? 'Đặt chỉ tiêu để bắt đầu' : 'Thêm task để bắt đầu') + '</span>';
    var lv = L.level(p.pct);
    if (lv === 'ok') return '<span class="lv-text-ok">' + fl('sakura', 16, 1) + 'Đạt rồi, giỏi quá!</span>';
    if (lv === 'pr') return '<span class="lv-text-pr">' + icon('flag', 'ic14') + 'Sắp tới đích</span>';
    return '<span class="lv-text-warn">' + icon('alert', 'ic14') + 'Cần tăng tốc</span>';
  }

  // Số đã làm trên tổng: "3/8 task xong" hoặc "12/50 km"
  function progressCount(p) {
    if (p.mode === 'metric') {
      return icon('chart', 'ic14') + '<span><span class="num">' + L.fmtVi(p.done) + '/' + L.fmtVi(p.total) + '</span>' + (p.unit ? ' ' + esc(p.unit) : '') + '</span>';
    }
    return icon('check', 'ic14') + (p.total ? '<span><span class="num">' + p.done + '/' + p.total + '</span> task xong</span>' : '<span>Chưa có task</span>');
  }

  function goalCard(g, tasks, today) {
    var p = L.goalProgress(g, tasks), m = groupMeta(g.group), f = App.flowers.pick(g.id);
    var slow = L.slowInfo(g, tasks, today);
    return '<button type="button" class="goal g-' + m.key + '" data-action="open-goal" data-id="' + esc(g.id) + '">' +
      '<span class="tape" aria-hidden="true"></span>' + (f.tone % 2 ? fl(f.name, 34, f.tone, 'corner') : '') +
      '<span class="goal-row"><span class="sticker">' + icon(m.icon) + '</span><span class="goal-main">' +
      '<span class="goal-name">' + esc(g.name) + '</span>' +
      '<span class="meta">' + periodTag(g) + deadlineTag(g, today) + hearts(g) + '</span></span></span>' +
      progressBar(p.pct) +
      '<span class="goal-foot"><span>' + progressCount(p) + '</span>' +
      goalStatusLine(g, p, slow) + '</span></button>';
  }

  function quickAdd(id, placeholder, goalId) {
    return '<form class="quick-add" data-form="quick-add"' + (goalId ? ' data-goal="' + esc(goalId) + '"' : '') + '>' +
      '<label class="qa-field" for="' + id + '">' + icon('pencil') + '<span class="sr-only">Tên việc mới</span>' +
      '<input id="' + id + '" name="title" autocomplete="off" maxlength="200" placeholder="' + esc(placeholder) + '"></label>' +
      '<button type="submit" class="fab" aria-label="Thêm việc">' + icon('plus') + '</button>' +
      '<button type="button" class="btn btn-soft qa-full" data-action="new-task"' + (goalId ? ' data-goal="' + esc(goalId) + '"' : '') +
      ' title="Mở form đủ trường: hạn, ưu tiên, mục tiêu, lặp lại">' + icon('edit', 'ic18') + 'Thêm đầy đủ</button></form>';
  }

  return {
    tag: tag, groupMeta: groupMeta, progressBar: progressBar, groupTag: groupTag, periodTag: periodTag, deadlineTag: deadlineTag,
    hearts: hearts, taskRow: taskRow, tickButton: tickButton, starButton: starButton, dueTag: dueTag, quadTag: quadTag, taskList: taskList, topNote: topNote, matrix: matrix, goalCard: goalCard,
    goalStatusLine: goalStatusLine, progressCount: progressCount, quickAdd: quickAdd
  };
})();

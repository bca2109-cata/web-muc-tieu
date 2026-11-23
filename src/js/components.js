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
  // today: ngày đang xem (Agenda có thể xem ngày khác hôm nay). Có giờ hạn thì ghi kèm giờ.
  function dueTag(t, today) {
    if (!t.due_date) return tag('tplain', 'clock', 'Chưa có hạn');
    var hm = L.isTime(t.due_time) ? ' <span class="num tm">' + t.due_time + '</span>' : '';
    if (L.isMissed(t, today)) return tag('tplain', 'refresh', 'Bỏ lỡ <span class="num">' + D.fmt(t.due_date) + '</span>', 'Lần lặp đã qua ngày, vẫn tính vào % mục tiêu');
    if (L.isOverdue(t, today)) return tag('tq1', 'clock', 'Trễ <span class="num">' + D.diffDays(t.due_date, today) + '</span> ngày');
    if (L.isDueSoon(t, today)) {
      var when = t.due_date === today ? 'hôm nay' : t.due_date === D.addDays(today, 1) ? 'ngày mai' : 'ngày kia';
      return tag('twarm', 'clock', '<span class="soon-lbl">Sắp đến hạn: </span>' + when + hm, 'Sắp đến hạn: ' + when);
    }
    if (t.due_date === today) return tag('tplain', 'clock', 'Hôm nay' + hm);
    if (t.due_date === D.addDays(today, 1)) return tag('tplain', 'clock', 'Ngày mai' + hm);
    return tag('tplain', 'clock', '<span class="num">' + D.fmt(t.due_date) + '</span>' + hm);
  }

  function quadTag(q) {
    var Q = L.QUADRANTS[q];
    return tag('tq' + q, Q.icon, Q.short, Q.label + ': ' + Q.hint);
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
      ' aria-pressed="' + top + '" aria-label="' + (top ? 'Bỏ khỏi 3 việc chính' : 'Đưa vào 3 việc chính hôm nay') + ': ' + esc(t.title) + '">' + icon('star') + '</button>';
  }

  // Thời lượng, Quan trọng, số lần dời, tiến độ việc con (GĐ6)
  function durTag(t) { return tag('tplain', 'hourglass', '<span class="num">' + L.fmtMin(L.duration(t)) + '</span>', 'Thời lượng ước lượng'); }
  function impTag(t) { return L.isImportant(t) ? tag('tpri', 'heart', 'Quan trọng') : ''; }
  function deferTag(t) {
    var n = L.deferCount(t);
    var out = n ? tag(n >= 3 ? 'tq1' : 'twarm', 'refresh', 'Đã dời <span class="num">' + n + '</span> lần') : '';
    // Việc chưa xong vừa tự về kho (hôm qua hoặc hôm nay)
    if (L.justReturned(t, App.date.today())) out += tag('twarm', 'box', 'Chưa xong, vừa về kho');
    return out;
  }
  function kidsTag(t, ctx) {
    var all = ctx.kids && ctx.kids[t.id];
    if (!all || !all.length) return '';
    var done = all.filter(L.isDone).length;
    return tag('tplain', 'list', '<span class="num">' + done + '/' + all.length + '</span> việc con', 'Việc lớn đã chia nhỏ');
  }
  // Bản đồ id việc cha -> danh sách việc con
  function kidsMap(tasks) {
    var m = {};
    tasks.forEach(function (t) { if (t.parent_id) (m[t.parent_id] = m[t.parent_id] || []).push(t); });
    return m;
  }

  function fmtHM(m) { return Math.floor(m / 60) + ':' + ('0' + (m % 60)).slice(-2); }
  function taskMeta(t, ctx, q) {
    var meta = [quadTag(q), dueTag(t, ctx.day || ctx.today)];
    // Giờ dự kiến bắt đầu (GĐ7), chỉ để tham khảo
    var sc = ctx.sched && ctx.sched[t.id];
    if (sc) {
      meta.unshift(tag('tplain', 'clock', '<span class="num">' + fmtHM(sc.start) + '</span>', 'Giờ dự kiến bắt đầu, chỉ để tham khảo'));
      if (sc.late) meta.push(tag('tq1', 'alert', 'Không kịp hôm nay'));
    }
    if (ctx.pins && ctx.pins[t.id]) meta.unshift(tag('twarm', 'flag', 'Ghim đầu ngày'));
    if (kidsTag(t, ctx)) meta.push(kidsTag(t, ctx)); else meta.push(durTag(t));
    if (impTag(t)) meta.push(impTag(t));
    if (deferTag(t)) meta.push(deferTag(t));
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
    var done = L.isDone(t), q = L.quadrant(t, ctx.day || ctx.today);
    return '<li class="task' + (done ? ' is-done' : '') + '">' +
      (done ? '' : '<span class="qbar b' + q + '"></span>') + tickButton(t, ctx) +
      '<span class="ticon tq' + q + '">' + icon(L.iconOf(t)) + '</span>' +
      '<button type="button" class="task-body" data-action="open-task" data-id="' + esc(t.id) + '">' +
      '<span class="task-title">' + esc(t.title) + '</span>' + (done ? '' : firstStep(t) + taskMeta(t, ctx, q)) + '</button>' +
      starButton(t, ctx) + '</li>';
  }
  // Bước đầu tiên: một dòng ngắn ngay dưới tên việc
  function firstStep(t) {
    return t.first_step ? '<span class="first-step">' + icon('play', 'ic12') + '<span>' + esc(t.first_step) + '</span></span>' : '';
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
      (done ? '' : firstStep(t) + '<span class="meta">' + quadTag(q) + durTag(t) + dueTag(t, ctx.today) +
        (g ? tag(groupMeta(g.group).cls + ' goal-tag', groupMeta(g.group).icon, esc(g.name)) : '') + '</span>') +
      '</button>' + starButton(t, ctx) + '</li>';
  }

  /* Ma trận 4 ô có 2 trục: cột Khẩn cấp / Không khẩn cấp, hàng Quan trọng / Không quan trọng.
     Thứ tự đọc: ô 1 trên trái, ô 2 trên phải, ô 3 dưới trái, ô 4 dưới phải. */
  function matrix(tasks, ctx) {
    var day = ctx.day || ctx.today;
    var out = '<div class="mx">' +
      '<div class="mx-top" aria-hidden="true"><span>' + icon('flame', 'ic14') + 'Khẩn cấp</span><span>Không khẩn cấp</span></div>' +
      '<div class="mx-side" aria-hidden="true"><span>Quan trọng</span><span>Không quan trọng</span></div>' +
      '<div class="matrix">';
    [1, 2, 3, 4].forEach(function (q) {
      var Q = L.QUADRANTS[q];
      var items = tasks.filter(function (t) { return L.quadrant(t, day) === q; }).sort(function (a, b) {
        return ((L.isDone(a) ? 1 : 0) - (L.isDone(b) ? 1 : 0)) || (L.dueKey(a) < L.dueKey(b) ? -1 : L.dueKey(a) > L.dueKey(b) ? 1 : 0);
      });
      var open = items.filter(function (t) { return !L.isDone(t); }).length;
      out += '<section class="q q' + q + '" aria-label="' + Q.label + ': ' + Q.hint + '"><h3 title="' + Q.hint + '">' + icon(Q.icon, 'ic18') + '<span class="q-name">' + Q.label + '</span>' +
        '<span class="num qn">' + open + '</span></h3><p class="q-act">' + Q.hint + '. ' + Q.act + '</p><ul>' +
        (items.length ? items.map(function (t) {
          return '<li class="' + (L.isDone(t) ? 'is-done' : '') + '">' + tickButton(t, ctx) +
            '<button type="button" class="qname" data-action="open-task" data-id="' + esc(t.id) + '" title="' + esc(t.title) + '">' +
            icon(L.iconOf(t), 'ic14') + '<span>' + esc(t.title) + '</span></button></li>';
        }).join('') : '<li class="none">Trống, nhẹ nhàng ghê</li>') + '</ul></section>';
    });
    return out + '</div></div>';
  }

  function goalStatusLine(g, p, slow) {
    if (slow) return '<span class="lv-text-warn" title="Đã qua ' + slow.time + '% thời gian, mới đạt ' + slow.pct + '%">' + icon('alert', 'ic14') + 'Chậm tiến độ</span>';
    if (!p.total) return '<span class="muted">' + icon('sparkle', 'ic14') +
      (p.mode === 'metric' ? 'Đặt chỉ tiêu để bắt đầu' : p.mode === 'habit' ? (p.habits ? 'Tick thói quen để bắt đầu' : 'Gắn thói quen để bắt đầu') : 'Thêm task để bắt đầu') + '</span>';
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
    if (p.mode === 'habit') {
      return icon('calcheck', 'ic14') + (p.habits ? '<span><span class="num">' + p.done + '/' + p.total + '</span> ngày đã tick</span>' : '<span>Chưa có thói quen</span>');
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

  /* Chọn nhanh Ngày sẽ làm: Hôm nay, Mai, 5 ngày tiếp theo theo thứ, hoặc Kho.
     extra: một ngày khác cần có trong danh sách (Agenda đang xem ngày đó) */
  var WD_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  function dayChoices(today, extra) {
    var out = [{ v: today, label: 'Hôm nay' }, { v: D.addDays(today, 1), label: 'Mai' }];
    for (var i = 2; i <= 6; i++) {
      var d = D.addDays(today, i);
      out.push({ v: d, label: WD_SHORT[D.parse(d).getUTCDay()] + ' <span class="num">' + D.fmt(d).slice(0, 5) + '</span>', title: D.weekday(d) + ' ' + D.fmt(d) });
    }
    if (extra && D.isValid(extra) && !out.some(function (c) { return c.v === extra; })) out.unshift({ v: extra, label: '<span class="num">' + D.fmt(extra).slice(0, 5) + '</span>' });
    out.push({ v: 'kho', label: icon('box', 'ic14') + 'Kho' });
    return out;
  }
  function chips(name, list, selected, label, idp) {
    return '<div class="chips" role="radiogroup" aria-label="' + label + '">' + list.map(function (c, i) {
      return '<label' + (c.title ? ' title="' + esc(c.title) + '"' : '') + '><input type="radio" id="' + idp + '-' + i + '" name="' + name + '" value="' + esc(c.v) + '"' + (String(c.v) === String(selected) ? ' checked' : '') + '><span>' + c.label + '</span></label>';
    }).join('') + '</div>';
  }

  /* Ô thêm nhanh (GĐ6): gõ tên, chọn thời lượng, chọn Ngày sẽ làm hoặc Kho, bật Quan trọng, rồi Enter.
     Lựa chọn giữ trong App.app.quickPrefs(id) để vẽ lại không mất. defDay: ngày chọn sẵn (rỗng = Kho). */
  function quickAdd(id, placeholder, goalId, defDay) {
    var today = App.date.today();
    var q = App.app.quickPrefs(id, defDay || 'kho', goalId);
    var state = App.store.get();
    var gid = goalId || q.goal;
    var warn = '';
    var probe = { id: '__new', goal_id: gid, bucket: gid ? '' : q.bucket, duration_min: String(q.dur), do_date: q.day === 'kho' ? '' : q.day };
    if (q.day !== 'kho' && D.isValid(q.day)) {
      if (q.dur >= App.C.BIG_MIN) warn = '<p class="qa-warn">' + icon('alert', 'ic14') + '<span>Việc từ <span class="num">2</span> giờ trở lên phải chia nhỏ trước khi xếp vào ngày. Bấm thêm thì việc vào Kho, rồi bấm Chia nhỏ.</span></p>';
      else {
        var f = App.plan.fit(state, q.day, probe);
        if (f.over > 0) warn = '<p class="qa-warn">' + icon('alert', 'ic14') + '<span>' + esc(D.weekday(q.day)) + ' <span class="num">' + D.fmt(q.day).slice(0, 5) + '</span> đã đầy quỹ ' + f.label.toLowerCase() + ': thêm việc này là <span class="num">' + L.fmtMin(f.total) + ' / ' + L.fmtMin(f.avail) + '</span>.</span></p>';
        else warn = '<p class="qa-ok">' + icon('check', 'ic14') + '<span>' + f.label + ' ' + (q.day === today ? 'hôm nay' : esc(D.weekday(q.day))) + ': <span class="num">' + L.fmtMin(f.total) + ' / ' + L.fmtMin(f.avail) + '</span></span></p>';
      }
    }
    var goalSel = goalId ? '' : '<label class="qa-goal"><span class="sr-only">Mục tiêu</span><select class="select" name="qa-goal" id="' + id + '-goal">' +
      '<option value="">' + esc(App.C.MISC) + '</option>' + state.goals.filter(function (g) { return g.status === 'Đang làm' || g.id === q.goal; }).map(function (g) {
        return '<option value="' + esc(g.id) + '"' + (g.id === q.goal ? ' selected' : '') + '>' + esc(g.name) + '</option>';
      }).join('') + '</select></label>';
    var dayLbl = q.day === 'kho' || !D.isValid(q.day) ? 'Kho' : q.day === today ? 'hôm nay' : D.weekday(q.day) + ' ' + D.fmt(q.day).slice(0, 5);
    var sum = (L.DURATION_LABELS[q.dur] || L.fmtMin(q.dur)) + ', ' + dayLbl + (q.imp ? ', quan trọng' : '');
    return '<form class="quick-add' + (q.open ? ' is-open' : '') + '" data-form="quick-add" data-qa="' + id + '"' + (goalId ? ' data-goal="' + esc(goalId) + '"' : '') + '>' +
      '<label class="qa-field" for="' + id + '">' + icon('pencil') + '<span class="sr-only">Tên việc mới</span>' +
      '<input id="' + id + '" name="title" autocomplete="off" maxlength="200" placeholder="' + esc(placeholder) + '"></label>' +
      '<button type="submit" class="fab" aria-label="Thêm việc">' + icon('plus') + '</button>' +
      '<button type="button" class="btn btn-soft qa-full" data-action="new-task"' + (goalId ? ' data-goal="' + esc(goalId) + '"' : '') + ' data-day="' + esc(q.day === 'kho' ? '' : q.day) + '"' +
      ' title="Mở form đủ trường: hạn chót, bước đầu tiên, lặp lại, ghi chú">' + icon('edit', 'ic18') + 'Thêm đầy đủ</button>' +
      '<button type="button" class="btn btn-soft qa-toggle" data-action="qa-toggle" data-qa="' + id + '" aria-expanded="' + (q.open ? 'true' : 'false') + '">' + icon('settings', 'ic14') + '<span>Tùy chọn: ' + sum + '</span></button>' +
      '<div class="qa-opts">' +
      '<div class="qa-line"><span class="qa-lbl">' + icon('hourglass', 'ic14') + 'Thời lượng</span>' +
      chips('qa-dur', App.C.DURATIONS.map(function (m) { return { v: m, label: L.DURATION_LABELS[m] }; }), q.dur, 'Thời lượng', id + '-dur') + '</div>' +
      '<div class="qa-line"><span class="qa-lbl">' + icon('calendar', 'ic14') + 'Ngày làm</span>' + chips('qa-day', dayChoices(today, q.day !== 'kho' ? q.day : ''), q.day, 'Ngày sẽ làm', id + '-day') + '</div>' +
      '<div class="qa-line"><label class="chip-toggle"><input type="checkbox" name="qa-imp" id="' + id + '-imp"' + (q.imp ? ' checked' : '') + '><span>' + icon('heart', 'ic14') + 'Quan trọng</span></label>' + goalSel + '</div>' +
      (gid ? '' : '<div class="qa-line"><span class="qa-lbl">' + icon('clock', 'ic14') + 'Tính vào</span>' + chips('qa-bucket', [{ v: 'work', label: 'Giờ làm' }, { v: 'evening', label: 'Buổi tối' }], q.bucket, 'Tính vào giờ làm hay buổi tối', id + '-bucket') + '</div>') +
      '<div class="qa-msg" aria-live="polite">' + warn + '</div></div></form>';
  }

  return {
    tag: tag, groupMeta: groupMeta, progressBar: progressBar, groupTag: groupTag, periodTag: periodTag, deadlineTag: deadlineTag,
    hearts: hearts, durTag: durTag, impTag: impTag, deferTag: deferTag, kidsTag: kidsTag, kidsMap: kidsMap, firstStep: firstStep, chips: chips, dayChoices: dayChoices, taskRow: taskRow, tickButton: tickButton, starButton: starButton, dueTag: dueTag, quadTag: quadTag, taskList: taskList, topNote: topNote, matrix: matrix, goalCard: goalCard,
    goalStatusLine: goalStatusLine, progressCount: progressCount, quickAdd: quickAdd, hm: fmtHM
  };
})();

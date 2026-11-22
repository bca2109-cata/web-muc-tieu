/* Tab Agenda: xem theo ngày (lùi / tiến ngày), lời nhắc từ review, biểu đồ tổng quan, ô thêm nhanh, Top 3 (chỉ hôm nay),
   thói quen của ngày, việc của ngày (dạng bảng hoặc ma trận 4 ô), sắp đến hạn */
var App = window.App || (window.App = {});
App.views = App.views || {};

App.views.today = function (state, ui) {
  var C = App.comp, L = App.logic, D = App.date, icon = App.ui.icon, fl = App.flowers.html, esc = App.util.esc;
  var today = D.today();
  var day = D.isValid(ui.day) && String(ui.day).length === 10 ? ui.day : today;
  var isToday = day === today;
  var goalsById = {};
  state.goals.forEach(function (g) { goalsById[g.id] = g; });
  var ctx = { today: today, day: day, goalsById: goalsById, flashId: ui.flashId, sort: ui.agendaSort, scope: 'agenda' };

  var tasks = state.tasks;
  var list = L.dayList(tasks, day);
  var top3 = isToday ? L.sortTasks(tasks.filter(function (t) { return L.isTop3Today(t, today); })) : [];
  var upcoming = L.upcoming(tasks.filter(function (t) { return !L.isMissed(t, day); }), day);
  var slowGoals = isToday ? state.goals.filter(function (g) { return L.slowInfo(g, state.tasks, today); }) : [];
  var dayShort = '<span class="num">' + D.fmt(day) + '</span>';

  var h = new Date().getHours();
  var hello = !isToday ? 'Agenda' : h < 11 ? 'Chào buổi sáng!' : h < 13 ? 'Chào buổi trưa!' : h < 18 ? 'Chào buổi chiều!' : 'Chào buổi tối!';
  var rel = isToday ? 'Hôm nay' : day === D.addDays(today, -1) ? 'Hôm qua' : day === D.addDays(today, 1) ? 'Ngày mai' : day < today ? 'Ngày đã qua' : 'Ngày sắp tới';

  var html = '<div class="today-cols"><div class="today-main">';
  html += '<section class="hello">' + App.views.sun() + fl('daisy', 44, 2, 'hello-f1') + fl('sakura', 26, 8, 'hello-f2') +
    '<h1>' + hello + '</h1>' +
    '<div class="day-nav" role="group" aria-label="Chọn ngày xem">' +
    '<button type="button" class="day-btn" data-action="day-shift" data-dir="-1" aria-label="Ngày trước">' + icon('back', 'ic18') + '</button>' +
    '<label class="day-pick"><span class="day-rel">' + rel + '</span><span class="day-date">' + D.weekday(day) + ', ' + dayShort + '</span>' +
    '<input class="day-input" type="date" name="agenda-day" value="' + day + '" aria-label="Chọn ngày khác"></label>' +
    '<button type="button" class="day-btn" data-action="day-shift" data-dir="1" aria-label="Ngày sau">' + icon('back', 'ic18 flip') + '</button>' +
    (isToday ? '' : '<button type="button" class="btn btn-soft day-today" data-action="day-today">' + icon('home', 'ic14') + 'Về hôm nay</button>') +
    '</div></section>';

  html += App.views.reminders(state, day);

  if (slowGoals.length) {
    html += '<section class="card slow-card" aria-labelledby="slow-title"><h2 id="slow-title" class="slow-h">' + icon('alert', 'ic18') +
      '<span><span class="num">' + slowGoals.length + '</span> mục tiêu đang chậm tiến độ</span></h2><ul>' +
      slowGoals.map(function (g) {
        var si = L.slowInfo(g, state.tasks, today);
        return '<li><button type="button" class="slow-row" data-action="open-goal" data-id="' + esc(g.id) + '"><span class="slow-name">' + esc(g.name) + '</span>' +
          '<span class="slow-fig">đạt <span class="num">' + si.pct + '%</span>, đã qua <span class="num">' + si.time + '%</span> thời gian</span>' + icon('back', 'ic14 flip') + '</button></li>';
      }).join('') + '</ul></section>';
  }
  html += App.views.overview(L.dayStats2(list, day), isToday ? 'hôm nay' : 'ngày ' + dayShort);
  html += C.quickAdd('quick-add-today', isToday ? 'Hôm nay mình sẽ làm gì nè?' : 'Thêm việc cho ngày ' + D.fmt(day), '', day);

  if (isToday) {
    html += '<section class="block" aria-labelledby="top3-title"><h2 class="sec-title" id="top3-title">' + fl('sakura', 24, 1) +
      '<span>Top <span class="num">3</span> hôm nay</span><span class="badge num">' + top3.length + '/' + App.C.TOP3_MAX + '</span></h2>' +
      '<ul class="notes">' + top3.map(function (t, i) { return C.topNote(t, i, ctx); }).join('') +
      (top3.length < App.C.TOP3_MAX
        ? '<li class="note empty">' + icon('star', 'ic14') + '<span>' + (top3.length ? 'Còn chỗ trống. ' : '') + 'Bấm ngôi sao ở một việc để đưa lên đây</span></li>'
        : '') + '</ul>' +
      '<p class="hint">' + icon('sparkle', 'ic14') + 'Lần đầu mở web mỗi ngày, chỗ trống được tự điền bằng việc trễ hạn rồi việc Khẩn cấp. Bấm ngôi sao để đổi.</p></section>';
  }
  html += App.views.habitToday(state, day);

  html += '</div><div class="today-side">';
  var mode = ui.todayView === 'list' ? 'list' : 'matrix';
  html += '<section class="block" aria-labelledby="tasks-title"><h2 class="sec-title" id="tasks-title">' + fl('sunflower', 24, 4) +
    '<span>' + (isToday ? 'Việc hôm nay' : 'Việc ngày ' + dayShort) + '</span><span class="seg-switch" role="group" aria-label="Cách xem">' +
    '<button type="button" data-action="today-view" data-view="list" aria-pressed="' + (mode === 'list') + '"' + (mode === 'list' ? ' class="on"' : '') + '>' + icon('list', 'ic14') + 'Bảng</button>' +
    '<button type="button" data-action="today-view" data-view="matrix" aria-pressed="' + (mode === 'matrix') + '"' + (mode === 'matrix' ? ' class="on"' : '') + '>' + icon('grid', 'ic14') + 'Ma trận</button>' +
    '</span></h2>';

  var hint = '<p class="hint">' + icon('sparkle', 'ic14') + 'Gồm việc có hạn ngày này, việc quá hạn chưa xong và việc đã xong trong ngày. ' +
    (mode === 'matrix' ? 'Quan trọng là ưu tiên Cao, khẩn cấp là quá hạn hoặc hạn đến ngày hôm sau.' : 'Bấm tên cột để sắp xếp.') + '</p>';
  if (!list.length) {
    html += App.views.emptyCard(isToday ? 'Hôm nay chưa có việc nào.' : 'Ngày này chưa có việc nào.', 'Gõ tên việc vào ô ở trên rồi bấm Enter để thêm.');
  } else {
    html += hint + (mode === 'matrix' ? C.matrix(list, ctx) : App.views.taskTable(list, ctx));
  }
  html += '</section></div><div class="today-soon">';
  html += '<section class="block" aria-labelledby="soon-title"><h2 class="sec-title" id="soon-title">' + fl('tulip', 24, 6) +
    '<span>Sắp đến hạn</span><span class="badge num">' + upcoming.length + '</span></h2>' +
    '<p class="hint">' + icon('calendar', 'ic14') + 'Việc chưa xong có hạn từ ' + (isToday ? 'hôm nay' : 'ngày đang xem') + ' đến <span class="num">' + L.SOON_DAYS + '</span> ngày sau đó.</p>' +
    (upcoming.length ? C.taskList(upcoming, ctx) : '<p class="muted soon-none">Chưa có việc nào sắp đến hạn.</p>') + '</section>';

  html += '</div></div>';
  return html;
};

/* Lời nhắc từ review (GĐ5):
   - review ngày D-1: "Cần chú ý gì cho hôm sau"
   - review tuần / tháng liền trước: "Chưa tốt" và "Kỳ sau ưu tiên"
   Bấm Ẩn ở ngày X thì từ ngày X trở đi không hiện (cột hide_from). */
App.views.reminderItems = function (state, day) {
  var D = App.date, P = App.period, S = App.summary, items = [];
  var r = S.findReview(state.reviews, 'Ngày', D.addDays(day, -1));
  if (r && String(r.next || '').trim()) {
    items.push({ r: r, title: 'Ghi chú từ hôm trước', sub: 'Review ngày ' + D.fmt(r.period_value), lines: [['Cần chú ý', r.next]] });
  }
  ['Tuần', 'Tháng'].forEach(function (type) {
    var rv = S.findReview(state.reviews, type, S.shift(type, P.valueOf(type, day), -1));
    if (!rv) return;
    var lines = [];
    if (String(rv.bad || '').trim()) lines.push(['Cần cải thiện', rv.bad]);
    if (String(rv.next || '').trim()) lines.push(['Ưu tiên kỳ này', rv.next]);
    if (lines.length) items.push({ r: rv, title: 'Nhắc từ review ' + type.toLowerCase() + ' trước', sub: P.label(type, rv.period_value), lines: lines });
  });
  return items.map(function (it) { it.hidden = !!it.r.hide_from && it.r.hide_from <= day; return it; });
};

App.views.reminders = function (state, day) {
  var icon = App.ui.icon, esc = App.util.esc;
  var items = App.views.reminderItems(state, day);
  if (!items.length) return '';
  var shown = items.filter(function (x) { return !x.hidden; }), hidden = items.filter(function (x) { return x.hidden; });
  function text(s) { return App.util.numify(esc(String(s).trim())).replace(/\n/g, '<br>'); }
  return '<section class="reminders" aria-label="Lời nhắc từ review">' +
    shown.map(function (x) {
      var lv = +x.r.rating || 0;
      return '<article class="card remind">' + (lv ? App.views.bloom(lv, 36, 'rm-bloom') : icon('bell', 'ic18 rm-ic')) +
        '<div class="rm-body"><h2 class="rm-h">' + x.title + ' <span class="muted">' + App.util.numify(esc(x.sub)) + '</span></h2>' +
        x.lines.map(function (l) { return '<p class="rm-line"><b>' + l[0] + ':</b> ' + text(l[1]) + '</p>'; }).join('') + '</div>' +
        '<button type="button" class="btn btn-soft rm-hide" data-action="rem-hide" data-id="' + esc(x.r.id) + '" aria-label="Ẩn lời nhắc: ' + esc(x.title) + '">' + icon('eyeoff', 'ic14') + 'Ẩn</button></article>';
    }).join('') +
    (hidden.length ? '<p class="rm-hidden">' + icon('eyeoff', 'ic14') + '<span>Đã ẩn <span class="num">' + hidden.length + '</span> lời nhắc.</span>' +
      '<button type="button" class="link-btn" data-action="rem-show" data-ids="' + esc(hidden.map(function (x) { return x.r.id; }).join(',')) + '">Hiện lại</button></p>' : '') +
    '</section>';
};

/* Bông hoa mức hài lòng 1 đến 5: 1 héo rũ, 5 nở tươi (hình trang trí, màu cố định) */
App.views.BLOOM_LABELS = ['', 'Không hài lòng', 'Chưa hài lòng', 'Tạm được', 'Hài lòng', 'Rất hài lòng'];
App.views.bloom = function (level, size, cls) {
  var lv = Math.max(1, Math.min(5, Math.round(+level) || 1));
  var HEAD = [null, [29, 24, 130], [27, 17, 65], [23, 13, 25], [20, 12, 0], [20, 11, 0]][lv];
  var PET = [null, '#b9a196', '#d9a3ae', '#f2a9c3', '#f585ad', '#ff5f93'][lv];
  var R = [0, 3.2, 4.4, 5.6, 6.8, 7.8][lv], N = lv >= 4 ? 6 : 5;
  var hx = HEAD[0], hy = HEAD[1], rot = HEAD[2];
  var petals = '';
  for (var i = 0; i < N; i++) {
    var a = 360 / N * i;
    petals += '<ellipse cx="' + hx + '" cy="' + (hy - R * 0.8) + '" rx="' + (R * 0.55).toFixed(1) + '" ry="' + R.toFixed(1) + '" transform="rotate(' + a + ' ' + hx + ' ' + hy + ')"/>';
  }
  var leaf = lv >= 3 ? '#6fb36d' : '#a7a46e';
  return '<svg class="bloom' + (cls ? ' ' + cls : '') + '" width="' + size + '" height="' + size + '" viewBox="0 0 40 40" aria-hidden="true" focusable="false">' +
    '<path d="M20 39 Q20 26 ' + hx + ' ' + hy + '" stroke="' + leaf + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M20 31 q-7 -2 -9 -8 q7 1 9 8z" fill="' + leaf + '"' + (lv < 3 ? ' transform="rotate(25 20 31)"' : '') + '/>' +
    '<g transform="rotate(' + rot + ' ' + hx + ' ' + hy + ')"><g fill="' + PET + '"' + (lv === 1 ? ' opacity=".85"' : '') + '>' + petals + '</g>' +
    '<circle cx="' + hx + '" cy="' + hy + '" r="' + (lv >= 3 ? 3 : 2.4) + '" fill="' + (lv >= 3 ? '#f6c453' : '#9a7a5c') + '"/></g></svg>';
};

// Sắp xếp bảng theo cột: done, title, due, priority, quad. dir 1 tăng, -1 giảm
App.views.sortRows = function (list, sort, day) {
  var L = App.logic, key = sort && sort.key || 'due', dir = sort && sort.dir === -1 ? -1 : 1;
  function val(t) {
    if (key === 'done') return L.isDone(t) ? 1 : 0;
    if (key === 'title') return String(t.title || '').toLowerCase();
    if (key === 'priority') return L.priorityRank(t.priority);
    if (key === 'quad') return L.quadrant(t, day);
    if (key === 'star') return L.isTop3Today(t, App.date.today()) ? 0 : 1;
    return L.dueKey(t);
  }
  return list.slice().sort(function (a, b) {
    var x = val(a), y = val(b), c;
    if (key === 'title') c = x.localeCompare(y, 'vi');
    else c = x < y ? -1 : x > y ? 1 : 0;
    if (c) return c * dir;
    var ka = L.dueKey(a), kb = L.dueKey(b);
    return ka < kb ? -1 : ka > kb ? 1 : String(a.title).localeCompare(String(b.title), 'vi');
  });
};

/* Bảng tác vụ (tab Agenda và tab Task). ctx.sort = { key, dir }, ctx.scope = 'agenda' | 'task'.
   Bấm tiêu đề cột để sắp xếp: bấm lần nữa thì đảo chiều. */
App.views.taskTable = function (list, ctx) {
  var C = App.comp, L = App.logic, icon = App.ui.icon, esc = App.util.esc;
  var day = ctx.day || ctx.today;
  var PRI = { 'Cao': ['tpri', 'up'], 'Thấp': ['tplain', 'down'] };
  var sort = ctx.sort || { key: 'due', dir: 1 };
  var rowsList = App.views.sortRows(list, sort, day);
  var rows = rowsList.map(function (t) {
    var done = L.isDone(t), q = L.quadrant(t, day);
    var g = t.goal_id ? ctx.goalsById[t.goal_id] : null;
    var p = PRI[t.priority] || ['tplain', 'flag'];
    var hm = L.isTime(t.due_time) ? ' <span class="num tm">' + t.due_time + '</span>' : '';
    return '<tr class="' + (done ? 'is-done' : 'tq-row' + q) + '">' +
      '<td class="c-tick">' + C.tickButton(t, ctx) + '</td>' +
      '<td class="c-name"><button type="button" class="tt-name" data-action="open-task" data-id="' + esc(t.id) + '">' +
      icon(L.iconOf(t), 'ic14') + '<span class="tt-text"><span class="tt-title">' + esc(t.title) + '</span>' +
      '<span class="tt-sub">' + (t.status === 'Đang làm' ? 'Đang làm · ' : '') + (g ? esc(g.name) : esc(App.C.MISC)) + '</span></span></button></td>' +
      '<td class="c-due">' + (done ? C.tag('tok', 'check', 'Xong' + (t.due_date ? ' · <span class="num">' + App.date.fmt(t.due_date).slice(0, 5) + '</span>' + hm : '')) : C.dueTag(t, day)) + '</td>' +
      '<td class="c-pri">' + C.tag(p[0], p[1], esc(t.priority || 'Trung bình')) + '</td>' +
      '<td class="c-q">' + C.quadTag(q) + '</td>' +
      '<td class="c-star">' + C.starButton(t, ctx) + '</td></tr>';
  }).join('');
  function th(key, cls, html, label) {
    var on = sort.key === key;
    var aria = on ? (sort.dir === -1 ? 'descending' : 'ascending') : 'none';
    return '<th class="' + cls + '" aria-sort="' + aria + '"><button type="button" class="th-sort' + (on ? ' on' : '') + '" data-action="tt-sort" data-scope="' + (ctx.scope || 'agenda') + '" data-key="' + key + '"' +
      ' aria-label="Sắp xếp theo ' + label + '">' + html + (on ? icon(sort.dir === -1 ? 'down' : 'up', 'ic12') : icon('sort', 'ic12 th-idle')) + '</button></th>';
  }
  return '<div class="tt-wrap"><table class="ttable"><thead><tr>' +
    th('done', 'c-tick', '<span class="sr-only">Xong</span>', 'trạng thái hoàn thành') + th('title', 'c-name', 'Việc', 'tên việc') + th('due', 'c-due', 'Hạn', 'ngày giờ hạn') +
    th('priority', 'c-pri', 'Ưu tiên', 'mức ưu tiên') + th('quad', 'c-q', '<span class="th-long">Ô ma trận</span><span class="th-short">Ô</span>', 'ô ma trận') +
    th('star', 'c-star', '<span class="sr-only">Top 3</span>', 'Top 3') +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>';
};

// Chia % cho các phần sao cho tổng đúng 100 (làm tròn theo phần dư lớn nhất)
App.views.shares = function (ns) {
  var sum = ns.reduce(function (a, n) { return a + n; }, 0);
  if (!sum) return ns.map(function () { return 0; });
  var raw = ns.map(function (n) { return n / sum * 100; }), out = raw.map(Math.floor);
  var left = 100 - out.reduce(function (a, n) { return a + n; }, 0);
  raw.map(function (r, i) { return [r - out[i], i]; }).sort(function (a, b) { return b[0] - a[0]; })
    .slice(0, left).forEach(function (x) { out[x[1]]++; });
  return out;
};

/* Biểu đồ tổng quan của ngày đang xem (GĐ5):
   1. Trạng thái hoàn thành: một thanh Xong / Chưa xong.
   2. Trạng thái đến hạn: 3 thanh ngang xếp chồng (Quá hạn, Đến hạn, Chưa đến hạn), mỗi thanh chia Xong / Chưa xong.
   3. Mức độ quan trọng: 3 thanh như trên, mỗi thanh chia theo 4 ô ma trận.
   Độ dài thanh theo số việc của hàng (hàng nhiều nhất dài hết khung). Mỗi phần có chú thích kèm số, không chỉ dựa vào màu. */
App.views.DUE_LABELS = { over: 'Quá hạn', due: 'Đến hạn', later: 'Chưa đến hạn' };
App.views.overview = function (s, whenHtml) {
  var V = App.views, Q = App.logic.QUADRANTS;
  var pct = s.total ? Math.round(s.done / s.total * 100) : 0;
  function segs(parts, rowLabel) {
    var sum = parts.reduce(function (a, p) { return a + p.n; }, 0);
    var sh = V.shares(parts.map(function (p) { return p.n; }));
    return parts.map(function (p, i) {
      if (!p.n) return '';
      return '<span class="ov-seg" style="flex-grow:' + p.n + ';background:var(' + p.c + ')" title="' + (rowLabel ? rowLabel + ' · ' : '') + p.label + ': ' + p.n + ' việc (' + sh[i] + '%)"></span>';
    }).join('') || (sum ? '' : '<span class="ov-seg ov-empty"></span>');
  }
  function legend(parts, withShare) {
    var sum = parts.reduce(function (a, p) { return a + p.n; }, 0), sh = V.shares(parts.map(function (p) { return p.n; }));
    return '<ul class="ov-legend">' + parts.map(function (p, i) {
      return '<li' + (p.n ? '' : ' class="is-zero"') + '><i style="background:var(' + p.c + ')"></i>' + p.label +
        ' <span class="num">' + p.n + '</span>' + (withShare && sum ? '<span class="num ov-share">' + sh[i] + '%</span>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  // rows: [{ label, parts: [{label, n, c}] }]
  function stack(title, rows, keyParts) {
    var max = Math.max.apply(null, rows.map(function (r) { return r.parts.reduce(function (a, p) { return a + p.n; }, 0); }).concat([1]));
    return '<div class="ov-row"><p class="ov-title">' + title + '</p><div class="sr">' + rows.map(function (r) {
      var n = r.parts.reduce(function (a, p) { return a + p.n; }, 0);
      var desc = r.label + ': ' + n + ' việc' + (n ? ' (' + r.parts.filter(function (p) { return p.n; }).map(function (p) { return p.label + ' ' + p.n; }).join(', ') + ')' : '');
      return '<div class="sr-row" role="img" aria-label="' + desc + '"><span class="sr-lbl">' + r.label + '</span>' +
        '<span class="sr-track">' + (n ? '<span class="ov-bar" style="width:' + Math.max(4, n / max * 100).toFixed(1) + '%">' + segs(r.parts, r.label) + '</span>' : '') + '</span>' +
        '<span class="num sr-n">' + n + '</span></div>';
    }).join('') + '</div>' + legend(keyParts) + '</div>';
  }
  var keys = ['over', 'due', 'later'];
  var DONE = [{ label: 'Xong', c: '--cv-done' }, { label: 'Chưa xong', c: '--cv-rest' }];
  var dueRows = keys.map(function (k) {
    return { label: V.DUE_LABELS[k], parts: [Object.assign({ n: s.due[k].done }, DONE[0]), Object.assign({ n: s.due[k].open }, DONE[1])] };
  });
  var quadRows = keys.map(function (k) {
    return { label: V.DUE_LABELS[k], parts: [1, 2, 3, 4].map(function (q) { return { label: Q[q].label, n: s.quad[k][q - 1], c: '--q' + q + '-bar' }; }) };
  });
  var sumParts = function (rows) { return rows[0].parts.map(function (p, i) { return { label: p.label, c: p.c, n: rows.reduce(function (a, r) { return a + r.parts[i].n; }, 0) }; }); };
  var doneParts = [Object.assign({ n: s.done }, DONE[0]), Object.assign({ n: s.total - s.done }, DONE[1])];

  return '<section class="card overview" aria-labelledby="ov-title">' +
    '<div class="ov-head"><h2 id="ov-title" class="ov-h">Tổng quan ' + whenHtml + '</h2>' +
    '<p class="ov-big"><span class="num">' + s.done + '/' + s.total + '</span> việc đã xong</p>' +
    '<span class="num ov-pct">' + pct + '%</span></div>' +
    (s.total
      ? '<div class="ov-row"><p class="ov-title">Trạng thái hoàn thành</p><div class="ov-bar" role="img" aria-label="Xong ' + s.done + ', chưa xong ' + (s.total - s.done) + '">' + segs(doneParts) + '</div>' + legend(doneParts, true) + '</div>' +
        stack('Trạng thái đến hạn', dueRows, sumParts(dueRows)) +
        stack('Mức độ quan trọng <span class="muted">(theo ô ma trận)</span>', quadRows, sumParts(quadRows))
      : '<p class="muted">Ngày này chưa có việc nào cần xử lý.</p>') +
    '</section>';
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

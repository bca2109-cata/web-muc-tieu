/* Tab Hôm nay: khung chào, biểu đồ tổng quan, ô thêm nhanh, Top 3, sắp đến hạn, việc hôm nay (dạng bảng hoặc ma trận 4 ô) */
var App = window.App || (window.App = {});
App.views = App.views || {};

App.views.today = function (state, ui) {
  var C = App.comp, L = App.logic, D = App.date, icon = App.ui.icon, fl = App.flowers.html;
  var today = D.today();
  var goalsById = {};
  state.goals.forEach(function (g) { goalsById[g.id] = g; });
  var ctx = { today: today, goalsById: goalsById, flashId: ui.flashId };

  // Lần lặp của ngày đã qua mà chưa làm chỉ tính vào % mục tiêu, không hiện ở đây
  var tasks = state.tasks.filter(function (t) { return !L.isMissed(t, today); });
  var top3 = L.sortTasks(tasks.filter(function (t) { return L.isTop3Today(t, today); }));
  var work = L.workList(tasks, today);
  var upcoming = L.upcoming(tasks, today);
  var slowGoals = state.goals.filter(function (g) { return L.slowInfo(g, state.tasks, today); });
  // Ma trận: mọi việc chưa xong, cộng việc vừa xong hôm nay, trừ việc đã ở Top 3
  var forMatrix = tasks.filter(function (t) {
    return !L.isTop3Today(t, today) && (!L.isDone(t) || t.done_at === today);
  });

  var h = new Date().getHours();
  var hello = h < 11 ? 'Chào buổi sáng!' : h < 13 ? 'Chào buổi trưa!' : h < 18 ? 'Chào buổi chiều!' : 'Chào buổi tối!';

  var html = '<div class="today-cols"><div class="today-main">';
  html += '<section class="hello">' + App.views.sun() + fl('daisy', 44, 2, 'hello-f1') + fl('sakura', 26, 8, 'hello-f2') +
    '<h1>' + hello + '</h1><p>' + icon('calendar', 'ic14') + D.weekday(today) + ', <span class="num">' + D.fmt(today) + '</span></p></section>';

  if (slowGoals.length) {
    html += '<section class="card slow-card" aria-labelledby="slow-title"><h2 id="slow-title" class="slow-h">' + icon('alert', 'ic18') +
      '<span><span class="num">' + slowGoals.length + '</span> mục tiêu đang chậm tiến độ</span></h2><ul>' +
      slowGoals.map(function (g) {
        var si = L.slowInfo(g, state.tasks, today);
        return '<li><button type="button" class="slow-row" data-action="open-goal" data-id="' + App.util.esc(g.id) + '"><span class="slow-name">' + App.util.esc(g.name) + '</span>' +
          '<span class="slow-fig">đạt <span class="num">' + si.pct + '%</span>, đã qua <span class="num">' + si.time + '%</span> thời gian</span>' + icon('back', 'ic14 flip') + '</button></li>';
      }).join('') + '</ul></section>';
  }
  html += App.views.overview(L.dayStats(work, today));
  html += C.quickAdd('quick-add-today', 'Hôm nay mình sẽ làm gì nè?');

  html += '<section class="block" aria-labelledby="top3-title"><h2 class="sec-title" id="top3-title">' + fl('sakura', 24, 1) +
    '<span>Top <span class="num">3</span> hôm nay</span><span class="badge num">' + top3.length + '/' + App.C.TOP3_MAX + '</span></h2>' +
    '<ul class="notes">' + top3.map(function (t, i) { return C.topNote(t, i, ctx); }).join('') +
    (top3.length < App.C.TOP3_MAX
      ? '<li class="note empty">' + icon('star', 'ic14') + '<span>' + (top3.length ? 'Còn chỗ trống. ' : '') + 'Bấm ngôi sao ở một việc để đưa lên đây</span></li>'
      : '') + '</ul>' +
    '<p class="hint">' + icon('sparkle', 'ic14') + 'Lần đầu mở web mỗi ngày, chỗ trống được tự điền bằng việc trễ hạn rồi việc Khẩn cấp. Bấm ngôi sao để đổi.</p></section>';
  html += App.views.habitToday(state, today);

  html += '</div><div class="today-side">';
  var mode = ui.todayView === 'list' ? 'list' : 'matrix';
  html += '<section class="block" aria-labelledby="tasks-title"><h2 class="sec-title" id="tasks-title">' + fl('sunflower', 24, 4) +
    '<span>Việc hôm nay</span><span class="seg-switch" role="group" aria-label="Cách xem">' +
    '<button type="button" data-action="today-view" data-view="list" aria-pressed="' + (mode === 'list') + '"' + (mode === 'list' ? ' class="on"' : '') + '>' + icon('list', 'ic14') + 'Bảng</button>' +
    '<button type="button" data-action="today-view" data-view="matrix" aria-pressed="' + (mode === 'matrix') + '"' + (mode === 'matrix' ? ' class="on"' : '') + '>' + icon('grid', 'ic14') + 'Ma trận</button>' +
    '</span></h2>';

  if (mode === 'matrix') {
    html += forMatrix.length
      ? '<p class="hint">' + icon('sparkle', 'ic14') + 'Gồm mọi việc chưa xong, trừ việc đã ở Top 3. Quan trọng là ưu tiên Cao, khẩn cấp là trễ hạn hoặc hạn đến ngày mai.</p>' + C.matrix(forMatrix, ctx)
      : App.views.emptyCard('Không còn việc nào chưa xong. Thảnh thơi ghê!', 'Gõ tên việc vào ô ở trên rồi bấm Enter để thêm.');
  } else if (!work.length) {
    html += App.views.emptyCard('Hôm nay chưa có việc nào.', 'Gõ tên việc vào ô ở trên rồi bấm Enter để thêm.');
  } else {
    html += '<p class="hint">' + icon('sparkle', 'ic14') + 'Việc có hạn đến ngày mai (gồm trễ hạn), việc Top 3 và việc đã xong hôm nay.</p>' +
      App.views.taskTable(work, ctx);
  }
  html += '</section></div><div class="today-soon">';
  html += '<section class="block" aria-labelledby="soon-title"><h2 class="sec-title" id="soon-title">' + fl('tulip', 24, 6) +
    '<span>Sắp đến hạn</span><span class="badge num">' + upcoming.length + '</span></h2>' +
    '<p class="hint">' + icon('calendar', 'ic14') + 'Việc chưa xong có hạn từ hôm nay đến <span class="num">' + L.SOON_DAYS + '</span> ngày tới.</p>' +
    (upcoming.length ? C.taskList(upcoming, ctx) : '<p class="muted soon-none">Chưa có việc nào sắp đến hạn.</p>') + '</section>';

  html += '</div></div>';
  return html;
};

// Bảng tác vụ của tab Hôm nay
App.views.taskTable = function (list, ctx) {
  var C = App.comp, L = App.logic, icon = App.ui.icon, esc = App.util.esc;
  var PRI = { 'Cao': ['tpri', 'up'], 'Thấp': ['tplain', 'down'] };
  var rows = list.map(function (t) {
    var done = L.isDone(t), q = L.quadrant(t, ctx.today);
    var g = t.goal_id ? ctx.goalsById[t.goal_id] : null;
    var p = PRI[t.priority] || ['tplain', 'flag'];
    return '<tr class="' + (done ? 'is-done' : 'tq-row' + q) + '">' +
      '<td class="c-tick">' + C.tickButton(t, ctx) + '</td>' +
      '<td class="c-name"><button type="button" class="tt-name" data-action="open-task" data-id="' + esc(t.id) + '">' +
      icon(L.iconOf(t), 'ic14') + '<span class="tt-text"><span class="tt-title">' + esc(t.title) + '</span>' +
      '<span class="tt-sub">' + (t.status === 'Đang làm' ? 'Đang làm · ' : '') + (g ? esc(g.name) : esc(App.C.MISC)) + '</span></span></button></td>' +
      '<td class="c-due">' + (done ? C.tag('tok', 'check', 'Xong') : C.dueTag(t, ctx.today)) + '</td>' +
      '<td class="c-pri">' + C.tag(p[0], p[1], esc(t.priority || 'Trung bình')) + '</td>' +
      '<td class="c-q">' + C.quadTag(q) + '</td>' +
      '<td class="c-star">' + C.starButton(t, ctx) + '</td></tr>';
  }).join('');
  return '<div class="tt-wrap"><table class="ttable"><thead><tr>' +
    '<th class="c-tick"><span class="sr-only">Xong</span></th><th class="c-name">Việc</th><th class="c-due">Hạn</th>' +
    '<th class="c-pri">Ưu tiên</th><th class="c-q"><span class="th-long">Ô ma trận</span><span class="th-short">Ô</span></th><th class="c-star"><span class="sr-only">Top 3</span></th>' +
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

/* Biểu đồ tổng quan hôm nay: số việc đã xong trên tổng, rồi 3 thanh tỷ trọng
   (tình trạng, mức ưu tiên, độ khẩn cấp). Mỗi thanh có chú thích kèm số việc, nên không chỉ dựa vào màu. */
App.views.overview = function (s) {
  var pct = s.total ? Math.round(s.done / s.total * 100) : 0;
  function bar(title, sub, parts, base) {
    var sum = parts.reduce(function (a, p) { return a + p.n; }, 0);
    var shares = App.views.shares(parts.map(function (p) { return p.n; }));
    var segs = sum ? parts.map(function (p, i) { p.share = shares[i]; return p; }).filter(function (p) { return p.n; }).map(function (p) {
      var share = p.share;
      return '<span class="ov-seg" style="flex-grow:' + p.n + ';background:var(' + p.c + ')" title="' + p.label + ': ' + p.n + ' việc (' + share + '%)"></span>';
    }).join('') : '<span class="ov-seg ov-empty"></span>';
    return '<div class="ov-row"><p class="ov-title">' + title + (sub ? ' <span class="muted">' + sub + '</span>' : '') + '</p>' +
      '<div class="ov-bar" aria-hidden="true">' + segs + '</div><ul class="ov-legend">' +
      parts.map(function (p) {
        return '<li' + (p.n ? '' : ' class="is-zero"') + '><i style="background:var(' + p.c + ')"></i>' + p.label +
          ' <span class="num">' + p.n + '</span>' + (sum ? '<span class="num ov-share">' + p.share + '%</span>' : '') + '</li>';
      }).join('') + '</ul></div>';
  }
  return '<section class="card overview" aria-labelledby="ov-title">' +
    '<div class="ov-head"><h2 id="ov-title" class="ov-h">Tổng quan hôm nay</h2>' +
    '<p class="ov-big"><span class="num">' + s.done + '/' + s.total + '</span> việc đã xong</p>' +
    '<span class="num ov-pct">' + pct + '%</span></div>' +
    (s.total ? bar('Tình trạng', '', [
      { label: 'Đã xong', n: s.status.done, c: '--cv-done' },
      { label: 'Đang làm', n: s.status.doing, c: '--cv-doing' },
      { label: 'Cần làm', n: s.status.todo, c: '--cv-rest' }]) +
    bar('Mức ưu tiên', '', [
      { label: 'Cao', n: s.pri.hi, c: '--cv-hi' },
      { label: 'Trung bình', n: s.pri.mid, c: '--cv-mid' },
      { label: 'Thấp', n: s.pri.low, c: '--cv-rest' }]) +
    bar('Độ khẩn cấp', '(việc chưa xong)', [
      { label: 'Quá hạn', n: s.urg.over, c: '--cv-over' },
      { label: 'Hôm nay', n: s.urg.today, c: '--cv-today' },
      { label: 'Ngày mai', n: s.urg.tmr, c: '--cv-tmr' },
      { label: 'Chưa có hạn', n: s.urg.other, c: '--cv-rest' }])
      : '<p class="muted">Hôm nay chưa có việc nào cần xử lý.</p>') +
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

// Tab chưa làm tới
App.views.soon = function (name) {
  var fl = App.flowers.html, icon = App.ui.icon;
  var INFO = {
    'tong-ket': { title: 'Tổng kết', icon: 'barchart', when: 'Chỉ số, biểu đồ và ghi chú review. Làm ở Giai đoạn 4.' }
  };
  var x = INFO[name] || INFO['tong-ket'];
  return '<div class="card soon-card">' +
    '<div class="soon-flowers">' + fl('tulip', 44, 1) + fl('hydrangea', 38, 9) + fl('sunflower', 40, 4) + fl('lavender', 44, 3) + fl('tulip', 44, 6) + '</div>' +
    '<h1>' + icon(x.icon) + 'Tab ' + x.title + ' sắp có</h1>' +
    '<p>Khu vườn này đang được trồng, ghé lại sau nhé.</p><p class="muted">' + x.when + '</p>' +
    '<a class="btn btn-soft" href="#/hom-nay">' + icon('home', 'ic18') + 'Về Hôm nay</a></div>';
};

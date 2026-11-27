/* V2 · Phần 2: màn Lịch (route "lich") gồm Tuần và Tháng. File này giữ phần chung của màn và Tuần; Tháng ở lich-thang.js. */
var LP = window.LP || (window.LP = {});

LP.lich = (function () {
  var D = LP.date, UI = LP.ui, esc = LP.ui.esc, num = LP.util.num;
  var KEY = 'lpv2_lich_view';
  var st = { view: 'tuan', anchor: '', onlyImp: false, needScroll: false, el: null, off: null };
  var month = null; // gắn bởi lich-thang.js

  function savedView() { try { var v = localStorage.getItem(KEY); return v === 'thang' ? 'thang' : 'tuan'; } catch (e) { return 'tuan'; } }
  function saveView(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* bỏ qua */ } }
  function isMobile() { return window.matchMedia('(max-width: 767px)').matches; }

  /* ---------- Dữ liệu ---------- */
  function groupOf(task) {
    var g = task.goal_id ? LP.store.find('Goals', task.goal_id) : null;
    if (g && /hoc|study/.test(g.group || '')) return 'study';
    return task.kind === 'canhan' ? 'health' : 'work';
  }
  function allDates(d) { return D.range(D.startOfWeek(d), D.add(D.startOfWeek(d), 6)); }
  function hasDate(task) {
    if (task.do_date) return true;
    return LP.logic.tasks.stepsOf(task.id).some(function (s) { return s.do_date; });
  }
  function unscheduled() {
    return LP.store.get().tasks.filter(function (t) { return t.kind === 'canhan' && t.status !== 'done' && t.status !== 'cancelled' && !t.deleted && !hasDate(t); });
  }
  function dueMarks(d) {
    return LP.store.get().tasks.filter(function (t) { return t.due_date === d && t.status !== 'done' && t.status !== 'cancelled'; });
  }
  function impOk(t) { return !st.onlyImp || (num(t.importance) || 1) >= 2; }
  // Mục của một ngày cho ô nổi ở lịch tháng: hạn chót và việc có ngày làm
  function dayItems(d) {
    var out = [];
    dueMarks(d).filter(impOk).forEach(function (t) { out.push({ task: t, due: true, time: t.due_time || '', title: 'Hạn ' + (t.due_time ? t.due_time + ' · ' : '· ') + t.title }); });
    LP.logic.tasks.tasksFor(d).filter(function (x) { return impOk(x.task); }).forEach(function (x) { out.push({ task: x.task, step: x.step, time: x.time, done: x.done, title: x.title }); });
    return out;
  }
  function editTask(id) { if (LP.quickAdd && LP.quickAdd.edit) LP.quickAdd.edit('task', id); }
  function dueText(t) { return 'Hạn ' + (t.due_time ? t.due_time + ' · ' : '· ') + t.title; }

  /* ---------- Đổi ngày và giờ làm ---------- */
  function undoMove(task, step, before) {
    LP.store.upsert(step ? 'TaskSteps' : 'Tasks', before);
  }
  // time: undefined = giữ giờ, '' = bỏ giờ (Cả ngày), 'HH:MM' = đặt giờ. Trả Promise<boolean>
  function moveTo(task, step, date, time) {
    var mv = LP.logic.tasks.moveDoDate(task, step, date, time);
    if (!mv.ok) { if (mv.reason === 'past') UI.toast('Không chuyển được vào ngày đã qua'); return Promise.resolve(false); }
    var ask = mv.late > 0 ? UI.confirm('Chuyển sang ' + D.fmt(date) + '?', (task.kind === 'canhan' ? 'Personal' : 'Ad-hoc') + ' này sẽ trễ hạn ' + mv.late + ' ngày', { ok: 'Vẫn chuyển' }) : Promise.resolve(true);
    return ask.then(function (yes) {
      if (!yes) return false;
      var before = mv.apply();
      UI.toast('Đã chuyển sang ' + D.fmt(date) + (time ? ' lúc ' + time : ''), { duration: 10000, actionLabel: 'Hoàn tác', actionIcon: 'refresh', action: function () { undoMove(task, step, before); } });
      return true;
    });
  }
  function pickDate(task, step) {
    var cur = (step && step.do_date) || task.do_date || D.today();
    var s = UI.sheet('Chuyển sang ngày…',
      '<p class="muted">' + esc(step ? step.title : task.title) + '</p>' +
      '<label class="lich-field">Ngày làm<input type="date" id="lich-pick" min="' + D.today() + '" value="' + (cur < D.today() ? D.today() : cur) + '"></label>' +
      '<label class="lich-field">Giờ làm (để trống = cả ngày)<input type="text" inputmode="numeric" maxlength="5" placeholder="hh:mm" autocomplete="off" data-time id="lich-time" value="' + esc((step || task).do_time || '') + '"></label>' +
      '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn" data-close>Hủy</button>' +
      '<button type="button" class="btn btn-primary" data-ok>Chuyển</button></div>');
    s.el.querySelector('[data-ok]').addEventListener('click', function () {
      var v = s.el.querySelector('#lich-pick').value, tm = s.el.querySelector('#lich-time').value;
      s.close();
      moveTo(task, step, v, tm);
    });
  }

  /* ---------- Thành phần ---------- */
  function seg(cur) {
    return '<div class="lich-seg" role="group" aria-label="Chế độ xem">' +
      '<button type="button" class="' + (cur === 'tuan' ? 'on' : '') + '" data-view="tuan" aria-pressed="' + (cur === 'tuan') + '">Tuần</button>' +
      '<button type="button" class="' + (cur === 'thang' ? 'on' : '') + '" data-view="thang" aria-pressed="' + (cur === 'thang') + '">Tháng</button></div>';
  }
  function nav(label, prevLabel, nextLabel, thisLabel) {
    return '<div class="lich-nav"><button type="button" class="icon-btn" data-nav="-1" aria-label="' + prevLabel + '">' + UI.icon('back') + '</button>' +
      '<button type="button" class="btn btn-soft" data-nav="0">' + thisLabel + '</button>' +
      '<button type="button" class="icon-btn" data-nav="1" aria-label="' + nextLabel + '">' + UI.icon('back', 'flip') + '</button>' +
      '<h1 class="lich-title">' + esc(label) + '</h1></div>';
  }

  function quotaBars(c) {
    function bar(label, p, striped) {
      var max = Math.max(p.quota, p.used, 1), pct = Math.min(100, Math.round(p.used / max * 100));
      var q = Math.round(p.quota / max * 100);
      var inter = striped && p.interrupt ? Math.min(pct, Math.round(p.interrupt / max * 100)) : 0;
      return '<div class="qbar' + (p.over ? ' over' : '') + '" title="' + label + ' ' + p.used + '/' + p.quota + ' phút' + (p.interrupt ? ' (gồm Chen ngang ' + p.interrupt + ' phút)' : '') + '">' +
        '<div class="qbar-top"><span>' + label + '</span><b class="num">' + D.fmtMin(p.used) + ' / ' + D.fmtMin(p.quota) + '</b></div>' +
        '<div class="qbar-track"><i style="width:' + pct + '%"></i>' + (inter ? '<i class="stripe" style="width:' + inter + '%"></i>' : '') +
        (p.quota ? '<u style="left:' + q + '%"></u>' : '') + '</div></div>';
    }
    return (c.work.used ? bar('Quỹ Ad-hoc', c.work, true) : '') + (c.evening.used ? bar('Quỹ Personal', c.evening, false) : '');
  }

  function cardHtml(x) {
    var t = x.task, imp = num(t.importance) || 1;
    var urg = LP.logic.tasks.urgency(t, D.today());
    var dim = st.onlyImp && imp < 2 ? ' dim' : '';
    var drag = x.done ? '' : ' draggable="true"';
    return '<article class="lcard g-' + groupOf(t) + (x.done ? ' is-done' : '') + dim + '"' + drag +
      ' data-task="' + esc(t.id) + '" data-step="' + (x.step ? esc(x.step.id) : '') + '">' +
      '<div class="lcard-top"><span class="lcard-title">' + LP.cute.html(x.title) + esc(x.title) + '</span>' +
      '<button type="button" class="lcard-more" data-more aria-label="Mở menu ' + esc(x.title) + '">' + UI.icon('settings', 'ic18') + '</button></div>' +
      (x.step ? '<div class="lcard-sub muted">' + esc(t.title) + '</div>' : '') +
      '<div class="lcard-meta">' + (x.duration ? '<span class="num">' + LP.date.fmtMin(x.duration) + '</span>' : '') +
      UI.importance(imp) + UI.urgency(urg) + (t.requester ? '<span class="muted lcard-who">' + esc(t.requester) + '</span>' : '') + '</div></article>';
  }
  function plainCard(t) {
    var imp = num(t.importance) || 1;
    return '<article class="lcard g-' + groupOf(t) + (st.onlyImp && imp < 2 ? ' dim' : '') + '" draggable="true" data-task="' + esc(t.id) + '" data-step="">' +
      '<div class="lcard-top"><span class="lcard-title">' + LP.cute.html(t.title) + esc(t.title) + '</span>' +
      '<button type="button" class="lcard-more" data-more aria-label="Mở menu ' + esc(t.title) + '">' + UI.icon('settings', 'ic18') + '</button></div>' +
      '<div class="lcard-meta">' + (num(t.duration_min) ? '<span class="num">' + LP.date.fmtMin(num(t.duration_min)) + '</span>' : '') + UI.importance(imp) +
      UI.urgency(LP.logic.tasks.urgency(t, D.today())) + '</div></article>';
  }

  function dayHtml(d) {
    var today = D.today(), off = !D.isWorkday(d) && D.isDayOff(d), sun = D.dow(d) === 7;
    var runs = LP.logic.routines.runsFor(d), past = d < today;
    var sum = past ? LP.logic.routines.summary(d) : null;
    var fixed = !runs.length ? '' : '<button type="button" class="lday-fixed" data-agenda="' + d + '">Daily: <b class="num">' + runs.length + '</b> lượt' +
      (past && sum.total ? (sum.missed ? ' <span class="miss">! ' + sum.missed + ' sót</span>' : ' <span class="full">' + UI.icon('check', 'ic18') + ' đủ</span>') : '') + '</button>';
    var cards = LP.logic.tasks.tasksFor(d).map(cardHtml).join('');
    var dues = dueMarks(d).map(function (t) { return '<button type="button" class="ldue" data-task="' + esc(t.id) + '">' + UI.icon('flag', 'ic18') + '<span>' + esc(dueText(t)) + '</span></button>'; }).join('');
    return '<section class="lday' + (d === today ? ' is-today' : '') + (off || sun ? ' is-off' : '') + (past ? ' is-past' : '') + '" data-date="' + d + '">' +
      '<header class="lday-head"><span class="lday-dow">' + D.weekdayShort(d) + '</span><b class="num">' + D.fmt(d) + '</b>' +
      (d === today ? '<span class="pill pill-ok">Hôm nay</span>' : '') + (off ? '<span class="pill">Nghỉ</span>' : '') + '</header>' +
      fixed + quotaBars(LP.logic.tasks.capacity(d)) + dues +
      '<div class="lday-cards">' + cards + (cards || dues ? '' : '<p class="muted lday-empty">Không có việc</p>') + '</div></section>';
  }

  /* ---------- Tuần: danh sách dọc (điện thoại) ---------- */
  function renderList() {
    var days = allDates(st.anchor), un = unscheduled();
    st.el.innerHTML = head(days) + '<div class="lweek">' + days.map(dayHtml).join('') +
      '<section class="lday lday-un" data-date=""><header class="lday-head"><span class="lday-dow">Chưa có ngày</span></header>' +
      '<div class="lday-cards">' + (un.length ? un.map(plainCard).join('') : '<p class="muted lday-empty">Không có việc chờ xếp lịch</p>') + '</div></section></div>';
  }
  function filterHtml() {
    return '<span class="lich-filter"><button type="button" class="sg-btn" data-imp aria-pressed="' + st.onlyImp + '" title="Làm mờ việc ♥ (Thường), giữ rõ việc ♥♥ và ♥♥♥">Chỉ việc ♥♥ trở lên</button></span>';
  }
  function head(days) {
    var lab = 'Tuần ' + D.fmt(days[0]) + ' – ' + D.fmt(days[6]) + '/' + days[6].slice(0, 4);
    return '<div class="lich-bar">' + seg('tuan') + nav(lab, 'Tuần trước', 'Tuần sau', 'Tuần này') +
      filterHtml() + '</div>';
  }

  /* ---------- Tuần: lưới giờ kiểu Outlook ---------- */
  var T0 = 6 * 60, T1 = 22 * 60, STEP = 30, ROW = 36;
  function yOf(min) { return (min - T0) / STEP * ROW; }

  // Mục đặt đúng giờ bắt đầu. Các mục chồng thời gian (start < end của mục kia, end = start + max(thời lượng, 30p))
  // gom thành nhóm, chia đều bề ngang cột ngày như Outlook: cột i trong nhóm n cột có left = i/n, width = 1/n
  function layout(list) {
    list.sort(function (a, b) { return a.start - b.start || b.end - a.end; });
    var group = [], gEnd = -1, colEnd = [];
    function flush() { var n = colEnd.length; group.forEach(function (e) { e.n = n; }); group = []; colEnd = []; gEnd = -1; }
    list.forEach(function (e) {
      if (group.length && e.start >= gEnd) flush();
      var c = 0; while (c < colEnd.length && colEnd[c] > e.start) c++;
      colEnd[c] = e.end; e.i = c; gEnd = Math.max(gEnd, e.end); group.push(e);
    });
    if (group.length) flush();
    return list;
  }

  function entriesFor(d) {
    var timed = [], allday = [], dues = [];
    function put(e) {
      var s = D.timeToMin(e.time);
      if (s == null || s < T0 || s >= T1) { allday.push(e); return; }
      e.start = s; e.end = s + Math.max(e.dur || 0, STEP); timed.push(e);
    }
    LP.logic.routines.itemsFor(d).forEach(function (m) {
      put({ kind: 'fix', m: m, time: m.time, dur: num(m.item.est_min) });
    });
    LP.logic.tasks.tasksFor(d).forEach(function (x) { put({ kind: 'task', x: x, time: x.time, dur: x.duration }); });
    // Mốc hạn: có giờ trong khung thì thành vạch ngang (việc đã xong vẫn vẽ, màu xám); không giờ thì ở dải Cả ngày
    LP.store.get().tasks.forEach(function (t) {
      if (t.due_date !== d || t.status === 'cancelled') return;
      var done = t.status === 'done', s = D.timeToMin(t.due_time);
      if (s != null && s >= T0 && s < T1) dues.push({ kind: 'due', t: t, start: s, done: done });
      else if (!done) allday.push({ kind: 'due', t: t, time: t.due_time });
    });
    dues.sort(function (a, b) { return a.start - b.start; });
    dues.forEach(function (e, i) { e.k = i && (e.start - dues[i - 1].start) / STEP * ROW < 14 ? dues[i - 1].k + 1 : 0; });
    return { timed: layout(timed), allday: allday, dues: dues };
  }

  // Chỉ tên việc dạng chữ; giờ, thời lượng, mức quan trọng xem ở tooltip và menu
  function blockInner(e) {
    if (e.kind === 'due') return '<span class="lblk-t">' + esc(dueText(e.t)) + '</span>';
    var t = e.kind === 'fix' ? e.m.item.title : e.x.title; return '<span class="lblk-t">' + LP.cute.html(t) + esc(t) + '</span>';
  }
  // Title luôn là tên đầy đủ kèm giờ: "08:30 · Chia số cho các team"
  function timeTitle(time, title) { return (time ? time + ' · ' : '') + title; }
  function blockHtml(e, pos) {
    var cls = 'lblk', attr = '';
    if (e.kind === 'due') {
      cls += ' ldue ldue-blk'; attr = ' tabindex="0" data-due-task="' + esc(e.t.id) + '" title="' + esc(dueText(e.t)) + '"';
    } else if (e.kind === 'fix') {
      cls += ' fixed' + (e.m.done ? ' is-done' : '');
      attr = ' data-fixed="1" title="' + esc(timeTitle(e.m.time, e.m.item.title)) + '"';
    } else {
      var t = e.x.task, imp = num(t.importance) || 1;
      cls += ' g-' + groupOf(t) + (e.x.done ? ' is-done' : '') + (st.onlyImp && imp < 2 ? ' dim' : '');
      attr = (e.x.done ? '' : ' draggable="true"') + ' tabindex="0" data-task="' + esc(t.id) + '" data-step="' + (e.x.step ? esc(e.x.step.id) : '') + '" title="' + esc(timeTitle(e.x.time, e.x.title)) + '"';
    }
    return '<div class="' + cls + (pos ? '' : ' lstrip') + '"' + attr + (pos ? ' data-n="' + e.n + '" style="' + pos + '"' : '') + '>' + blockInner(e) + '</div>';
  }
  function slotStyle(e) {
    return 'top:' + yOf(e.start) + 'px;height:' + ROW + 'px;left:' + (e.i / e.n * 100) + '%;width:calc(' + (100 / e.n) + '% - 2px)';
  }
  // Vạch dọc mảnh sát mép trái: từ giờ bắt đầu, dài đúng thời lượng (Daily không có thời lượng: 30p, nhạt hơn)
  function barHtml(e) {
    var fix = e.kind === 'fix', grp = fix ? (e.m.routine && e.m.routine.group === 'ca_nhan' ? 'health' : 'work') : groupOf(e.x.task);
    var dur = Math.max(e.dur || 0, STEP), end = Math.min(e.start + dur, T1), imp = fix ? 3 : (num(e.x.task.importance) || 1);
    var cls = 'ldur g-' + grp + (fix && !e.dur ? ' faint' : '') + ((fix ? e.m.done : e.x.done) ? ' is-done' : '') + (st.onlyImp && imp < 2 ? ' dim' : '');
    return '<i class="' + cls + '" data-for="' + esc(fix ? e.m.item.id : e.x.task.id) + '" style="top:' + yOf(e.start) + 'px;height:' + (yOf(end) - yOf(e.start)) + 'px;left:' + (e.i / e.n * 100) + '%"></i>';
  }
  // Mốc hạn có giờ: vạch ngang đỏ chạy hết cột tại đúng giờ hạn, chấm tròn đầu trái, chữ nhỏ trên vạch
  function dueLineHtml(e) {
    var imp = num(e.t.importance) || 1;
    return '<div class="ldue-blk ldue-line' + (e.done ? ' is-done' : '') + (st.onlyImp && imp < 2 ? ' dim' : '') + '" tabindex="0" data-due-task="' + esc(e.t.id) + '" title="' + esc(dueText(e.t)) + '" style="top:' + yOf(e.start) + 'px;--k:' + e.k + '">' +
      '<span class="ldue-t">' + esc(dueText(e.t)) + '</span></div>';
  }

  function headHtml(d) {
    var today = D.today(), off = D.isDayOff(d), past = d < today;
    return '<div class="lhead' + (d === today ? ' is-today' : '') + (off || D.dow(d) === 7 ? ' is-off' : '') + '" data-date="' + d + '">' +
      '<div class="lday-head"><span class="lday-dow">' + D.weekdayShort(d) + '</span><b class="num lday-num" title="' + D.fmtFull(d) + (d === today ? ' · hôm nay' : '') + '">' + parseInt(d.slice(8), 10) + '</b>' +
      (off ? '<span class="pill">Nghỉ</span>' : '') + '</div>' +
      '</div>';
  }

  // Khung lưới giờ cuộn riêng: cao hết phần màn hình còn lại, trang không tự cuộn
  function fitGrid() {
    var g = st.el && st.el.querySelector('.lgrid'); if (!g) return;
    var top = g.getBoundingClientRect().top + (window.pageYOffset || 0);
    // Chừa chỗ cho khu "Chưa có ngày" bên dưới và phần đệm cuối trang, để cả trang vừa một màn hình
    var un = st.el.querySelector('.lgrid + .lday-un'), main = g.closest('.main');
    var below = (un ? un.getBoundingClientRect().height + 12 : 0) + (main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0);
    g.style.maxHeight = Math.max(320, Math.round(window.innerHeight - top - below)) + 'px';
    fitBlocks(g);
  }
  // Mục bị chia cột (nhóm từ 2 mục) mà rộng dưới 90px thì ẩn icon để dành chỗ cho chữ
  function fitBlocks(g) {
    g.querySelectorAll('.lblk[data-n]').forEach(function (b) { b.classList.toggle('is-narrow', +b.getAttribute('data-n') >= 2 && b.offsetWidth < 90); });
  }
  // Mở tuần: cuộn trong khung lưới tới giờ hiện tại (vạch Bây giờ ở khoảng 1/3 khung); tuần khác thì tới mục sớm nhất
  function scrollGrid(per, days, nowMin) {
    var y = null;
    if (days.indexOf(D.today()) >= 0 && nowMin >= T0 && nowMin < T1) y = yOf(nowMin);
    else {
      var first = null;
      per.forEach(function (p) { p.timed.forEach(function (e) { if (first == null || e.start < first) first = e.start; }); });
      y = yOf(first == null ? 8 * 60 : first);
    }
    requestAnimationFrame(function () {
      var g = st.el && st.el.querySelector('.lgrid'), col = g && g.querySelector('.lcol'); if (!col) return;
      var base = col.getBoundingClientRect().top - g.getBoundingClientRect().top + g.scrollTop;
      var top = g.querySelector('.lg-top'), H = top ? top.offsetHeight : 0;
      // Đặt mốc ở 1/3 phần lưới còn thấy được, trừ hàng ngày + dải Cả ngày đang dính trên đầu
      g.scrollTop = Math.max(0, base + y - H - (g.clientHeight - H) / 3);
    });
  }
  function renderGrid() {
    var days = allDates(st.anchor), un = unscheduled(), today = D.today(), nowMin = D.timeToMin(D.now());
    var per = days.map(entriesFor), h = '';
    var old = st.el.querySelector('.lgrid'), keep = old ? old.scrollTop : 0;
    var gut = '';
    for (var m = T0; m < T1; m += 60) gut += '<span style="top:' + yOf(m) + 'px">' + D.minToTime(m) + '</span>';
    h += '<div class="lgrid" style="--row:' + ROW + 'px"><div class="lg-top"><div class="lg-corner"></div>' + days.map(headHtml).join('');
    h += '<div class="lg-ad-label">Cả ngày</div>' + days.map(function (d, i) {
      return '<div class="lallday' + (d === today ? ' is-today' : '') + (D.isDayOff(d) || D.dow(d) === 7 ? ' is-off' : '') + '" data-date="' + d + '">' + per[i].allday.map(function (e) { return blockHtml(e, ''); }).join('') + '</div>';
    }).join('') + '</div>';
    h += '<div class="lg-body"><div class="lgut" style="height:' + yOf(T1) + 'px">' + gut + '</div>';
    h += days.map(function (d, i) {
      var blocks = per[i].timed.map(function (e) { return barHtml(e) + blockHtml(e, slotStyle(e)); }).join('');
      var dues = per[i].dues.map(dueLineHtml).join('');
      var now = d === today && nowMin >= T0 && nowMin < T1 ? '<div class="lnow" style="top:' + yOf(nowMin) + 'px" title="Bây giờ ' + D.now() + '"><i></i></div>' : '';
      return '<div class="lcol' + (d === today ? ' is-today' : '') + (D.isDayOff(d) || D.dow(d) === 7 ? ' is-off' : '') + (d < today ? ' is-past' : '') + '" data-date="' + d + '" style="height:' + yOf(T1) + 'px">' + blocks + dues + now + '</div>';
    }).join('') + '</div></div>';
    // Không có việc chưa có ngày: thu thành một dòng mảnh để lưới giờ dùng phần chiều cao dư ra
    h += un.length ? '<section class="lday lday-un" data-date=""><header class="lday-head"><span class="lday-dow">Chưa có ngày</span></header>' +
      '<div class="lday-cards">' + un.map(plainCard).join('') + '</div></section>'
      : '<section class="lday lday-un is-slim" data-date=""><span class="lday-dow">Chưa có ngày</span><span class="muted">·</span><span class="muted">Không có việc chờ xếp lịch</span></section>';
    st.el.innerHTML = head(days) + h;
    fitGrid();
    if (st.needScroll) { st.needScroll = false; scrollGrid(per, days, nowMin); }
    else { var g = st.el.querySelector('.lgrid'); if (g) g.scrollTop = keep; }
  }
  function renderWeek() { if (isMobile()) renderList(); else renderGrid(); }

  function findCard(el) {
    var c = el.closest('.lcard,.lblk[data-task]'); if (!c) return null;
    var task = LP.store.find('Tasks', c.getAttribute('data-task')), sid = c.getAttribute('data-step');
    return task ? { task: task, step: sid ? LP.store.find('TaskSteps', sid) : null } : null;
  }

  function menuFor(card) {
    var s = UI.sheet(card.step ? card.step.title : card.task.title,
      '<div class="lich-menu"><button type="button" class="btn btn-soft btn-block" data-pick>' + UI.icon('calendar') + 'Chuyển sang ngày…</button></div>');
    s.el.querySelector('[data-pick]').addEventListener('click', function () { s.close(); pickDate(card.task, card.step); });
  }

  function bindWeek() {
    var el = st.el, drag = null, slot = null;
    function clearMarks() {
      el.querySelectorAll('.dragging,.drop-ok,.drop-no').forEach(function (n) { n.classList.remove('dragging', 'drop-ok', 'drop-no'); });
      if (slot) { slot.remove(); slot = null; }
    }
    el.addEventListener('dragstart', function (e) {
      var c = e.target.closest && e.target.closest('.lcard,.lblk[data-task]');
      if (!c || isMobile()) { e.preventDefault(); return; }
      drag = findCard(c);
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', c.getAttribute('data-task')); } catch (x) { /* bỏ qua */ }
      c.classList.add('dragging');
    });
    el.addEventListener('dragend', function () { drag = null; clearMarks(); });
    // Điểm thả: cột giờ (ngày + giờ), dải Cả ngày (ngày, bỏ giờ), đầu cột hoặc khối ngày dạng danh sách (chỉ ngày)
    function where(e) {
      var n = e.target.closest && e.target.closest('[data-date]');
      if (!n || !n.getAttribute('data-date')) return null;
      var w = { node: n, date: n.getAttribute('data-date'), time: undefined };
      if (n.classList.contains('lcol')) {
        var r = n.getBoundingClientRect(), row = Math.max(0, Math.min((T1 - T0) / STEP - 1, Math.floor((e.clientY - r.top) / ROW)));
        w.time = D.minToTime(T0 + row * STEP); w.row = row;
      } else if (n.classList.contains('lallday')) w.time = '';
      return w;
    }
    el.addEventListener('dragover', function (e) {
      var w = where(e); if (!w || !drag) return;
      var ok = w.date >= D.today();
      el.querySelectorAll('.drop-ok,.drop-no').forEach(function (n) { if (n !== w.node) n.classList.remove('drop-ok', 'drop-no'); });
      w.node.classList.toggle('drop-ok', ok); w.node.classList.toggle('drop-no', !ok);
      if (slot && slot.parentNode !== w.node) { slot.remove(); slot = null; }
      if (ok && w.row !== undefined) {
        if (!slot) { slot = document.createElement('div'); slot.className = 'lslot'; w.node.appendChild(slot); }
        slot.style.top = w.row * ROW + 'px'; slot.setAttribute('data-time', w.time);
      } else if (slot) { slot.remove(); slot = null; }
      if (ok) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
    });
    el.addEventListener('dragleave', function (e) {
      var n = e.target.closest && e.target.closest('[data-date]');
      if (n && !n.contains(e.relatedTarget)) { n.classList.remove('drop-ok', 'drop-no'); if (slot && slot.parentNode === n) { slot.remove(); slot = null; } }
    });
    el.addEventListener('drop', function (e) {
      var w = where(e); if (!w || !drag) return;
      e.preventDefault();
      var item = drag; drag = null; clearMarks();
      moveTo(item.task, item.step, w.date, w.time);
    });
  }

  /* ---------- Lịch tháng: bấm ngày mở ô nổi liệt kê việc, có nút sang lịch tuần ---------- */
  function openDay(d) {
    var items = dayItems(d), runs = LP.logic.routines.runsFor(d);
    var rows = items.map(function (x, i) {
      return '<li><button type="button" class="li-day-row' + (x.due ? ' is-due' : '') + (x.done ? ' is-done' : '') + '" data-i="' + i + '">' + (x.due ? UI.icon('flag', 'ic18') : '') +
        (x.time && !x.due ? '<b class="num">' + esc(x.time) + '</b>' : '') + '<span>' + esc(x.title) + '</span></button></li>';
    }).join('');
    var s = UI.sheet(D.weekdayName(d) + ' ' + D.fmt(d),
      (rows ? '<ul class="li-day-list">' + rows + '</ul>' : '<p class="muted">Không có việc</p>') +
      (runs.length ? '<p class="muted li-day-daily">Daily: <b class="num">' + runs.length + '</b> lượt</p>' : '') +
      '<div class="modal-foot"><button type="button" class="btn" data-agenda-day>Mở Agenda ngày này</button><span class="spacer"></span><button type="button" class="btn" data-close>Đóng</button>' +
      '<button type="button" class="btn btn-primary" data-week>Xem tuần này</button></div>');
    s.el.addEventListener('click', function (e) {
      var r = e.target.closest('.li-day-row');
      if (r) { var it = items[+r.getAttribute('data-i')]; s.close(); editTask(it.task.id); return; }
      if (e.target.closest('[data-week]')) { s.close(); st.view = 'tuan'; saveView('tuan'); st.anchor = d; st.needScroll = true; render(); return; }
      if (e.target.closest('[data-agenda-day]')) { s.close(); LP.router.go('agenda', { date: d }); }
    });
  }

  /* ---------- Màn ---------- */
  function render() {
    if (!st.el) return;
    if (st.view === 'thang' && month) month.render(st.el, st); else renderWeek();
  }
  function shift(dir) {
    if (dir === 0) st.anchor = D.today();
    else if (st.view === 'thang') st.anchor = D.addMonths(D.monthStart(st.anchor), dir);
    else st.anchor = D.add(st.anchor, 7 * dir);
    st.needScroll = true;
    render();
  }

  function onClick(e) {
    var b;
    if ((b = e.target.closest('[data-imp]'))) { st.onlyImp = !st.onlyImp; render(); return; }
    if ((b = e.target.closest('[data-view]'))) { st.view = b.getAttribute('data-view'); saveView(st.view); st.needScroll = true; render(); return; }
    if ((b = e.target.closest('[data-nav]'))) { shift(parseInt(b.getAttribute('data-nav'), 10)); return; }
    if ((b = e.target.closest('[data-more]'))) { var c = findCard(b); if (c) menuFor(c); return; }
    if ((b = e.target.closest('.ldue-blk[data-due-task]'))) { editTask(b.getAttribute('data-due-task')); return; }
    if ((b = e.target.closest('.lcard,.lblk[data-task],.ldue[data-task]'))) { editTask(b.getAttribute('data-task')); return; }
    if ((b = e.target.closest('[data-agenda]'))) { LP.router.go('agenda', { date: b.getAttribute('data-agenda') }); return; }
    if ((b = e.target.closest('[data-cell]'))) {
      openDay(b.getAttribute('data-cell'));
    }
  }

  function mount(el, params) {
    st.el = document.createElement('div');
    el.appendChild(st.el); el = st.el; // bộ lắng nghe gắn vào khối riêng, router xóa khi đổi màn
    st.view = params && params.view === 'thang' ? 'thang' : params && params.view === 'tuan' ? 'tuan' : savedView();
    st.anchor = params && D.isValid(params.date) ? params.date : D.today();
    st.needScroll = true;
    el.classList.add('lich');
    el.addEventListener('click', onClick);
    bindWeek();
    var mq = window.matchMedia('(max-width: 767px)'), h = function () { render(); };
    if (mq.addEventListener) mq.addEventListener('change', h);
    window.addEventListener('resize', fitGrid);
    el.addEventListener('keydown', function (e) {
      var b = e.target.closest && e.target.closest('.lblk[data-task],.ldue-blk[data-due-task]');
      if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); editTask(b.getAttribute('data-task') || b.getAttribute('data-due-task')); }
    });
    ['Tasks', 'TaskSteps', 'RoutineChecks', 'Interruptions', 'DaysOff'].forEach(function (s) { LP.store.on('change:' + s, h); });
    st.off = function () { window.removeEventListener('resize', fitGrid); if (mq.removeEventListener) mq.removeEventListener('change', h); ['Tasks', 'TaskSteps', 'RoutineChecks', 'Interruptions', 'DaysOff'].forEach(function (s) { LP.store.off('change:' + s, h); }); };
    render();
  }
  function unmount() {
    if (st.off) st.off();
    st.el = null; st.off = null;
  }

  LP.router.register('lich', { title: 'Lịch', mount: mount, unmount: unmount });
  return { seg: seg, nav: nav, filterHtml: filterHtml, impOk: impOk, dayItems: dayItems, setMonth: function (m) { month = m; }, moveTo: moveTo, unscheduled: unscheduled, dueMarks: dueMarks, dueText: dueText };
})();

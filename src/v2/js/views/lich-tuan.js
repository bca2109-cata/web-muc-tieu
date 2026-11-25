/* V2 · Phần 2: màn Lịch (route "lich") gồm Tuần và Tháng. File này giữ phần chung của màn và Tuần; Tháng ở lich-thang.js. */
var LP = window.LP || (window.LP = {});

LP.lich = (function () {
  var D = LP.date, UI = LP.ui, esc = LP.ui.esc, num = LP.util.num;
  var KEY = 'lpv2_lich_view';
  var st = { view: 'tuan', anchor: '', onlyImp: false, el: null, off: null };
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
    return LP.store.get().tasks.filter(function (t) { return t.kind === 'canhan' && t.status !== 'done' && !hasDate(t); });
  }
  function dueMarks(d) {
    return LP.store.get().tasks.filter(function (t) { return t.due_date === d && t.status !== 'done'; });
  }
  function dueText(t) { return 'Hạn ' + (t.due_time ? t.due_time + ' · ' : '· ') + t.title; }

  /* ---------- Đổi ngày và giờ làm ---------- */
  function setDate(task, step, date, time) {
    var before = Object.assign({}, step || task), patch = { do_date: date };
    if (time !== undefined) patch.do_time = time;
    LP.store.upsert(step ? 'TaskSteps' : 'Tasks', Object.assign({}, before, patch));
    return before;
  }
  function undoMove(task, step, before) {
    LP.store.upsert(step ? 'TaskSteps' : 'Tasks', before);
  }
  // time: undefined = giữ giờ, '' = bỏ giờ (Cả ngày), 'HH:MM' = đặt giờ. Trả Promise<boolean>
  function moveTo(task, step, date, time) {
    if (!date) return Promise.resolve(false);
    if (date < D.today()) { UI.toast('Không chuyển được vào ngày đã qua'); return Promise.resolve(false); }
    var row = step || task, curDate = (step && step.do_date) || task.do_date, curTime = row.do_time || '';
    if (curDate === date && (time === undefined || time === curTime)) return Promise.resolve(false);
    var late = task.due_date ? D.diff(date, task.due_date) : 0;
    var ask = late > 0 && date !== curDate ? UI.confirm('Chuyển sang ' + D.fmt(date) + '?', 'Việc này sẽ trễ hạn ' + late + ' ngày', { ok: 'Vẫn chuyển' }) : Promise.resolve(true);
    return ask.then(function (yes) {
      if (!yes) return false;
      var before = setDate(task, step, date, time);
      UI.toast('Đã chuyển sang ' + D.fmt(date) + (time ? ' lúc ' + time : ''), { duration: 10000, actionLabel: 'Hoàn tác', actionIcon: 'refresh', action: function () { undoMove(task, step, before); } });
      return true;
    });
  }
  function pickDate(task, step) {
    var cur = (step && step.do_date) || task.do_date || D.today();
    var s = UI.sheet('Chuyển sang ngày…',
      '<p class="muted">' + esc(step ? step.title : task.title) + '</p>' +
      '<label class="lich-field">Ngày làm<input type="date" id="lich-pick" min="' + D.today() + '" value="' + (cur < D.today() ? D.today() : cur) + '"></label>' +
      '<label class="lich-field">Giờ làm (để trống = cả ngày)<input type="time" id="lich-time" value="' + esc((step || task).do_time || '') + '"></label>' +
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
      return '<div class="qbar' + (p.over ? ' over' : '') + '" title="' + label + ' ' + p.used + '/' + p.quota + ' phút">' +
        '<div class="qbar-top"><span>' + label + '</span><b class="num">' + p.used + '/' + p.quota + 'p</b></div>' +
        '<div class="qbar-track"><i style="width:' + pct + '%"></i>' + (inter ? '<i class="stripe" style="width:' + inter + '%"></i>' : '') +
        (p.quota ? '<u style="left:' + q + '%"></u>' : '') + '</div></div>';
    }
    return bar('Việc', c.work, true) + bar('Cá nhân', c.evening, false);
  }

  function cardHtml(x) {
    var t = x.task, imp = num(t.importance) || 1;
    var urg = LP.logic.tasks.urgency(t, D.today());
    var dim = st.onlyImp && imp < 2 ? ' dim' : '';
    var drag = x.done ? '' : ' draggable="true"';
    return '<article class="lcard g-' + groupOf(t) + (x.done ? ' is-done' : '') + dim + '"' + drag +
      ' data-task="' + esc(t.id) + '" data-step="' + (x.step ? esc(x.step.id) : '') + '">' +
      '<div class="lcard-top"><span class="lcard-title">' + esc(x.title) + '</span>' +
      '<button type="button" class="lcard-more" data-more aria-label="Mở menu việc ' + esc(x.title) + '">' + UI.icon('settings', 'ic18') + '</button></div>' +
      (x.step ? '<div class="lcard-sub muted">' + esc(t.title) + '</div>' : '') +
      '<div class="lcard-meta">' + (x.duration ? '<span class="num">' + LP.date.fmtMin(x.duration) + '</span>' : '') +
      UI.importance(imp) + UI.urgency(urg) + (t.requester ? '<span class="muted lcard-who">' + esc(t.requester) + '</span>' : '') + '</div></article>';
  }
  function plainCard(t) {
    var imp = num(t.importance) || 1;
    return '<article class="lcard g-' + groupOf(t) + (st.onlyImp && imp < 2 ? ' dim' : '') + '" draggable="true" data-task="' + esc(t.id) + '" data-step="">' +
      '<div class="lcard-top"><span class="lcard-title">' + esc(t.title) + '</span>' +
      '<button type="button" class="lcard-more" data-more aria-label="Mở menu việc ' + esc(t.title) + '">' + UI.icon('settings', 'ic18') + '</button></div>' +
      '<div class="lcard-meta">' + (num(t.duration_min) ? '<span class="num">' + LP.date.fmtMin(num(t.duration_min)) + '</span>' : '') + UI.importance(imp) +
      UI.urgency(LP.logic.tasks.urgency(t, D.today())) + '</div></article>';
  }

  function dayHtml(d) {
    var today = D.today(), off = !D.isWorkday(d) && D.isDayOff(d), sun = D.dow(d) === 7;
    var runs = LP.logic.routines.runsFor(d), past = d < today;
    var sum = past ? LP.logic.routines.summary(d) : null;
    var fixed = '<button type="button" class="lday-fixed" data-agenda="' + d + '">Cố định: <b class="num">' + runs.length + '</b> lượt' +
      (past && sum.total ? (sum.missed ? ' <span class="miss">! ' + sum.missed + ' sót</span>' : ' <span class="full">' + UI.icon('check', 'ic18') + ' đủ</span>') : '') + '</button>';
    var cards = LP.logic.tasks.tasksFor(d).map(cardHtml).join('');
    var dues = dueMarks(d).map(function (t) { return '<div class="ldue">' + UI.icon('flag', 'ic18') + '<span>' + esc(dueText(t)) + '</span></div>'; }).join('');
    return '<section class="lday' + (d === today ? ' is-today' : '') + (off || sun ? ' is-off' : '') + (past ? ' is-past' : '') + '" data-date="' + d + '">' +
      '<header class="lday-head"><span class="lday-dow">' + D.weekdayShort(d) + '</span><b class="num">' + D.fmt(d) + '</b>' +
      (d === today ? '<span class="pill pill-ok">Hôm nay</span>' : '') + (off ? '<span class="pill">Nghỉ</span>' : '') + '</header>' +
      fixed + quotaBars(LP.logic.tasks.capacity(d)) + dues +
      '<div class="lday-cards">' + cards + (cards || dues ? '' : '<p class="muted lday-empty">Chưa có việc</p>') + '</div></section>';
  }

  /* ---------- Tuần: danh sách dọc (điện thoại) ---------- */
  function renderList() {
    var days = allDates(st.anchor), un = unscheduled();
    st.el.innerHTML = head(days) + '<div class="lweek">' + days.map(dayHtml).join('') +
      '<section class="lday lday-un" data-date=""><header class="lday-head"><span class="lday-dow">Chưa có ngày</span></header>' +
      '<div class="lday-cards">' + (un.length ? un.map(plainCard).join('') : '<p class="muted lday-empty">Không có việc</p>') + '</div></section></div>';
  }
  function head(days) {
    var lab = 'Tuần ' + D.fmt(days[0]) + ' – ' + D.fmt(days[6]) + '/' + days[6].slice(0, 4);
    return '<div class="lich-bar">' + seg('tuan') + nav(lab, 'Tuần trước', 'Tuần sau', 'Tuần này') +
      '<label class="chip-toggle lich-filter"><input type="checkbox" data-imp' + (st.onlyImp ? ' checked' : '') + '><span>' + UI.icon('heart', 'ic18') + 'Quan trọng trở lên</span></label></div>';
  }

  /* ---------- Tuần: lưới giờ kiểu Outlook ---------- */
  var T0 = 6 * 60, T1 = 22 * 60, STEP = 30, ROW = 36;
  function yOf(min) { return (min - T0) / STEP * ROW; }

  // Mục trùng giờ xếp từ trên xuống: mỗi mục một dòng, dòng đã có người thì xuống dòng trống kế tiếp
  function layout(list) {
    list.sort(function (a, b) { return a.start - b.start; });
    var used = {};
    list.forEach(function (e) {
      var r = Math.floor((e.start - T0) / STEP);
      while (used[r]) r++;
      used[r] = true; e.row = r;
    });
    return list;
  }

  function entriesFor(d) {
    var timed = [], allday = [];
    function put(e) {
      var s = D.timeToMin(e.time);
      if (s == null || s < T0 || s >= T1) { allday.push(e); return; }
      e.start = s; e.end = s + STEP; timed.push(e);
    }
    LP.logic.routines.itemsFor(d).forEach(function (m) {
      put({ kind: 'fix', m: m, time: m.time, dur: num(m.item.est_min) || STEP });
    });
    LP.logic.tasks.tasksFor(d).forEach(function (x) { put({ kind: 'task', x: x, time: x.time, dur: x.duration || STEP }); });
    return { timed: layout(timed), allday: allday };
  }

  // Chỉ tên việc dạng chữ; giờ, thời lượng, mức quan trọng xem ở tooltip và menu
  function blockInner(e) { return esc(e.kind === 'fix' ? e.m.item.title : e.x.title); }
  function blockHtml(e, pos) {
    var cls = 'lblk' + (pos && e.end - e.start <= STEP ? ' short' : ''), attr = '';
    if (e.kind === 'fix') {
      cls += ' fixed' + (e.m.done ? ' is-done' : '');
      attr = ' data-fixed="1" title="' + esc(e.m.item.title) + ' ' + esc(e.m.time) + '"';
    } else {
      var t = e.x.task, imp = num(t.importance) || 1;
      cls += ' g-' + groupOf(t) + (e.x.done ? ' is-done' : '') + (st.onlyImp && imp < 2 ? ' dim' : '');
      attr = (e.x.done ? '' : ' draggable="true"') + ' tabindex="0" data-task="' + esc(t.id) + '" data-step="' + (e.x.step ? esc(e.x.step.id) : '') + '" title="' + esc(e.x.title) + '"';
    }
    return '<div class="' + cls + (pos ? '' : ' lstrip') + '"' + attr + (pos ? ' style="' + pos + '"' : '') + '>' + blockInner(e) + '</div>';
  }

  function headHtml(d) {
    var today = D.today(), off = D.isDayOff(d), past = d < today;
    return '<div class="lhead' + (d === today ? ' is-today' : '') + (off || D.dow(d) === 7 ? ' is-off' : '') + '" data-date="' + d + '">' +
      '<div class="lday-head"><span class="lday-dow">' + D.weekdayShort(d) + '</span><b class="num lday-num" title="' + D.fmtFull(d) + (d === today ? ' · hôm nay' : '') + '">' + parseInt(d.slice(8), 10) + '</b>' +
      (off ? '<span class="pill">Nghỉ</span>' : '') + '</div>' +
      '</div>';
  }

  function renderGrid() {
    var days = allDates(st.anchor), un = unscheduled(), today = D.today(), nowMin = D.timeToMin(D.now());
    var per = days.map(entriesFor), h = '';
    var gut = '';
    for (var m = T0; m < T1; m += 60) gut += '<span style="top:' + yOf(m) + 'px">' + D.minToTime(m) + '</span>';
    h += '<div class="lgrid" style="--row:' + ROW + 'px"><div class="lg-corner"></div>' + days.map(headHtml).join('');
    h += '<div class="lg-ad-label">Cả ngày</div>' + days.map(function (d, i) {
      var dues = dueMarks(d).map(function (t) { return '<div class="ldue">' + esc(dueText(t)) + '</div>'; }).join('');
      return '<div class="lallday' + (d === today ? ' is-today' : '') + (D.isDayOff(d) || D.dow(d) === 7 ? ' is-off' : '') + '" data-date="' + d + '">' + dues + per[i].allday.map(function (e) { return blockHtml(e, ''); }).join('') + '</div>';
    }).join('');
    h += '<div class="lgut" style="height:' + yOf(T1) + 'px">' + gut + '</div>';
    h += days.map(function (d, i) {
      var blocks = per[i].timed.map(function (e) {
        return blockHtml(e, 'top:' + (e.row * ROW) + 'px;height:' + ROW + 'px;left:0;right:0');
      }).join('');
      var now = d === today && nowMin >= T0 && nowMin < T1 ? '<div class="lnow" style="top:' + yOf(nowMin) + 'px" title="Bây giờ ' + D.now() + '"><i></i></div>' : '';
      return '<div class="lcol' + (d === today ? ' is-today' : '') + (D.isDayOff(d) || D.dow(d) === 7 ? ' is-off' : '') + (d < today ? ' is-past' : '') + '" data-date="' + d + '" style="height:' + yOf(T1) + 'px">' + blocks + now + '</div>';
    }).join('') + '</div>';
    h += '<section class="lday lday-un" data-date=""><header class="lday-head"><span class="lday-dow">Chưa có ngày</span></header>' +
      '<div class="lday-cards">' + (un.length ? un.map(plainCard).join('') : '<p class="muted lday-empty">Không có việc</p>') + '</div></section>';
    st.el.innerHTML = head(days) + h;
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

  /* ---------- Màn ---------- */
  function render() {
    if (!st.el) return;
    if (st.view === 'thang' && month) month.render(st.el, st); else renderWeek();
  }
  function shift(dir) {
    if (dir === 0) st.anchor = D.today();
    else if (st.view === 'thang') st.anchor = D.addMonths(D.monthStart(st.anchor), dir);
    else st.anchor = D.add(st.anchor, 7 * dir);
    render();
  }

  function onClick(e) {
    var b;
    if ((b = e.target.closest('[data-view]'))) { st.view = b.getAttribute('data-view'); saveView(st.view); render(); return; }
    if ((b = e.target.closest('[data-nav]'))) { shift(parseInt(b.getAttribute('data-nav'), 10)); return; }
    if ((b = e.target.closest('[data-more],.lblk[data-task]'))) { var c = findCard(b); if (c) menuFor(c); return; }
    if ((b = e.target.closest('[data-agenda]'))) { LP.router.go('agenda', { date: b.getAttribute('data-agenda') }); return; }
    if ((b = e.target.closest('[data-cell]'))) {
      var d = b.getAttribute('data-cell');
      if (d < D.today()) LP.router.go('agenda', { date: d });
      else { st.view = 'tuan'; saveView('tuan'); st.anchor = d; render(); }
    }
  }
  function onChange(e) {
    if (e.target.matches('[data-imp]')) { st.onlyImp = e.target.checked; render(); }
  }

  function mount(el, params) {
    st.el = document.createElement('div');
    el.appendChild(st.el); el = st.el; // bộ lắng nghe gắn vào khối riêng, router xóa khi đổi màn
    st.view = params && params.view === 'thang' ? 'thang' : params && params.view === 'tuan' ? 'tuan' : savedView();
    st.anchor = params && D.isValid(params.date) ? params.date : D.today();
    el.classList.add('lich');
    el.addEventListener('click', onClick);
    el.addEventListener('change', onChange);
    bindWeek();
    var mq = window.matchMedia('(max-width: 767px)'), h = function () { render(); };
    if (mq.addEventListener) mq.addEventListener('change', h);
    el.addEventListener('keydown', function (e) {
      var b = e.target.closest && e.target.closest('.lblk[data-task]');
      if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); var c = findCard(b); if (c) menuFor(c); }
    });
    ['Tasks', 'TaskSteps', 'RoutineChecks', 'Interruptions', 'DaysOff'].forEach(function (s) { LP.store.on('change:' + s, h); });
    st.off = function () { if (mq.removeEventListener) mq.removeEventListener('change', h); ['Tasks', 'TaskSteps', 'RoutineChecks', 'Interruptions', 'DaysOff'].forEach(function (s) { LP.store.off('change:' + s, h); }); };
    render();
  }
  function unmount() {
    if (st.off) st.off();
    st.el = null; st.off = null;
  }

  LP.router.register('lich', { title: 'Lịch', mount: mount, unmount: unmount });
  return { seg: seg, nav: nav, setMonth: function (m) { month = m; }, moveTo: moveTo, unscheduled: unscheduled, dueMarks: dueMarks, dueText: dueText };
})();

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

  /* ---------- Đổi ngày làm ---------- */
  function rowOf(task, step) { return step ? step : task; }
  function setDate(task, step, date) {
    var before = Object.assign({}, rowOf(task, step));
    LP.store.upsert(step ? 'TaskSteps' : 'Tasks', Object.assign({}, before, { do_date: date }));
    return before;
  }
  function undoMove(task, step, before) {
    LP.store.upsert(step ? 'TaskSteps' : 'Tasks', before);
  }
  // Trả Promise<boolean>. Kiểm ngày đã qua và trễ hạn trước khi đổi
  function moveTo(task, step, date) {
    if (!date) return Promise.resolve(false);
    if (date < D.today()) { UI.toast('Không chuyển được vào ngày đã qua'); return Promise.resolve(false); }
    var cur = step ? (step.do_date || task.do_date) : task.do_date;
    if (cur === date) return Promise.resolve(false);
    var late = task.due_date ? D.diff(date, task.due_date) : 0;
    var ask = late > 0 ? UI.confirm('Chuyển sang ' + D.fmt(date) + '?', 'Việc này sẽ trễ hạn ' + late + ' ngày', { ok: 'Vẫn chuyển' }) : Promise.resolve(true);
    return ask.then(function (yes) {
      if (!yes) return false;
      var before = setDate(task, step, date);
      UI.toast('Đã chuyển sang ' + D.fmt(date), { duration: 10000, actionLabel: 'Hoàn tác', actionIcon: 'refresh', action: function () { undoMove(task, step, before); } });
      return true;
    });
  }
  function pickDate(task, step) {
    var cur = (step && step.do_date) || task.do_date || D.today();
    var s = UI.sheet('Chuyển sang ngày…',
      '<p class="muted">' + esc(step ? step.title : task.title) + '</p>' +
      '<label class="lich-field">Ngày làm<input type="date" id="lich-pick" min="' + D.today() + '" value="' + (cur < D.today() ? D.today() : cur) + '"></label>' +
      '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn" data-close>Hủy</button>' +
      '<button type="button" class="btn btn-primary" data-ok>Chuyển</button></div>');
    s.el.querySelector('[data-ok]').addEventListener('click', function () {
      var v = s.el.querySelector('#lich-pick').value;
      s.close();
      moveTo(task, step, v);
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

  /* ---------- Tuần ---------- */
  function renderWeek() {
    var days = allDates(st.anchor), un = unscheduled();
    var lab = 'Tuần ' + D.fmt(days[0]) + ' – ' + D.fmt(days[6]) + '/' + days[6].slice(0, 4);
    st.el.innerHTML = '<div class="lich-bar">' + seg('tuan') + nav(lab, 'Tuần trước', 'Tuần sau', 'Tuần này') +
      '<label class="chip-toggle lich-filter"><input type="checkbox" data-imp' + (st.onlyImp ? ' checked' : '') + '><span>' + UI.icon('heart', 'ic18') + 'Quan trọng trở lên</span></label></div>' +
      '<div class="lweek">' + days.map(dayHtml).join('') +
      '<section class="lday lday-un" data-date=""><header class="lday-head"><span class="lday-dow">Chưa có ngày</span></header>' +
      '<div class="lday-cards">' + (un.length ? un.map(plainCard).join('') : '<p class="muted lday-empty">Không có việc</p>') + '</div></section></div>';
  }

  function findCard(el) {
    var c = el.closest('.lcard'); if (!c) return null;
    var task = LP.store.find('Tasks', c.getAttribute('data-task')), sid = c.getAttribute('data-step');
    return task ? { task: task, step: sid ? LP.store.find('TaskSteps', sid) : null } : null;
  }

  function menuFor(card) {
    var s = UI.sheet(card.step ? card.step.title : card.task.title,
      '<div class="lich-menu"><button type="button" class="btn btn-soft btn-block" data-pick>' + UI.icon('calendar') + 'Chuyển sang ngày…</button></div>');
    s.el.querySelector('[data-pick]').addEventListener('click', function () { s.close(); pickDate(card.task, card.step); });
  }

  function bindWeek() {
    var el = st.el, drag = null;
    el.addEventListener('dragstart', function (e) {
      var c = e.target.closest && e.target.closest('.lcard');
      if (!c || isMobile()) { e.preventDefault(); return; }
      drag = findCard(c);
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', c.getAttribute('data-task')); } catch (x) { /* bỏ qua */ }
      c.classList.add('dragging');
    });
    el.addEventListener('dragend', function (e) {
      drag = null;
      el.querySelectorAll('.dragging,.drop-ok,.drop-no').forEach(function (n) { n.classList.remove('dragging', 'drop-ok', 'drop-no'); });
    });
    function target(e) { var c = e.target.closest && e.target.closest('.lday[data-date]'); return c && c.getAttribute('data-date') ? c : null; }
    el.addEventListener('dragover', function (e) {
      var c = target(e); if (!c || !drag) return;
      var ok = c.getAttribute('data-date') >= D.today();
      c.classList.toggle('drop-ok', ok); c.classList.toggle('drop-no', !ok);
      if (ok) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
    });
    el.addEventListener('dragleave', function (e) {
      var c = target(e); if (c && !c.contains(e.relatedTarget)) c.classList.remove('drop-ok', 'drop-no');
    });
    el.addEventListener('drop', function (e) {
      var c = target(e); if (!c || !drag) return;
      e.preventDefault();
      var d = c.getAttribute('data-date'), item = drag; drag = null;
      c.classList.remove('drop-ok', 'drop-no');
      moveTo(item.task, item.step, d);
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
    if ((b = e.target.closest('[data-more]'))) { var c = findCard(b); if (c) menuFor(c); return; }
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
    var h = function () { render(); };
    ['Tasks', 'TaskSteps', 'RoutineChecks', 'Interruptions', 'DaysOff'].forEach(function (s) { LP.store.on('change:' + s, h); });
    st.off = function () { ['Tasks', 'TaskSteps', 'RoutineChecks', 'Interruptions', 'DaysOff'].forEach(function (s) { LP.store.off('change:' + s, h); }); };
    render();
  }
  function unmount() {
    if (st.off) st.off();
    st.el = null; st.off = null;
  }

  LP.router.register('lich', { title: 'Lịch', mount: mount, unmount: unmount });
  return { seg: seg, nav: nav, setMonth: function (m) { month = m; }, moveTo: moveTo, unscheduled: unscheduled, dueMarks: dueMarks, dueText: dueText };
})();

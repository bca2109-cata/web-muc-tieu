/* Điều khiển chính: định tuyến theo #, vẽ màn hình, xử lý thao tác */
var App = window.App || (window.App = {});

App.app = (function () {
  var view = document.getElementById('view');
  var ui = {
    groupFilter: '', periodType: '', periodValue: '', flashId: null, todayView: readPref('lp_today_view', 'matrix'),
    day: '', agendaSort: { key: 'plan', dir: 1 }, taskSort: { key: 'due', dir: 1 },
    taskFilter: { status: 'open', imp: '', goal: '', due: '', quad: '', from: '', to: '' },
    taskView: 'all', mxScope: readPref('lp_mx_scope', 'today'), mxNew: null, inboxSort: 'age', inboxGoal: '', plan: null, qa: {},
    habitView: readPref('lp_habit_view', 'week'), habitShift: 0,
    revType: readPref('lp_review_type', 'Tuần'), revValue: '', revChart: readPref('lp_review_chart', 'day')
  };
  function readPref(k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } }
  function writePref(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } }
  var loaded = false;
  var loadError = null;
  var flashTimer = null;

  function route() {
    var h = location.hash || '#/agenda';
    var m = /^#\/muc-tieu\/(.+)$/.exec(h);
    if (m) return { tab: 'goals', goalId: decodeURIComponent(m[1]) };
    if (h.indexOf('#/muc-tieu') === 0) return { tab: 'goals' };
    if (h.indexOf('#/task') === 0) return { tab: 'task' };
    if (h.indexOf('#/ma-tran') === 0) return { tab: 'matrix' };
    if (h.indexOf('#/thoi-quen') === 0) return { tab: 'habits' };
    if (h.indexOf('#/tong-ket') === 0) return { tab: 'review' };
    return { tab: 'today' };
  }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

  function top3Count() {
    var today = App.date.today();
    return App.store.get().tasks.filter(function (t) { return App.logic.isTop3Today(t, today); }).length;
  }

  // Giữ chữ đang gõ và vị trí con trỏ khi vẽ lại (ô của form review chỉ giữ khi vẫn đúng kỳ đó)
  function inputKey(el) { var f = el.closest('form'); return el.id + '|' + (f && f.getAttribute('data-value') || ''); }
  function snapshotInputs() {
    var snap = {};
    view.querySelectorAll('input[id],textarea[id]').forEach(function (el) { snap[inputKey(el)] = el.value; });
    var a = document.activeElement;
    return { values: snap, focus: a && view.contains(a) && a.id ? a.id : null };
  }
  function restoreInputs(s) {
    view.querySelectorAll('input[id],textarea[id]').forEach(function (el) { var k = inputKey(el); if (k in s.values) el.value = s.values[k]; });
    if (s.focus) { var el = document.getElementById(s.focus); if (el) el.focus(); }
  }

  function render() {
    var r = route();
    document.querySelectorAll('.tab').forEach(function (a) {
      var on = a.getAttribute('data-tab') === r.tab;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (!loaded) {
      view.innerHTML = loadError
        ? '<div class="card empty"><p>Không tải được dữ liệu. ' + App.util.esc(loadError) + '</p>' +
          '<button type="button" class="btn btn-primary" data-action="reload">Thử lại</button></div>'
        : '<div class="loading">Đang tải dữ liệu…</div>';
      return;
    }
    var snap = snapshotInputs();
    // Việc lặp mẫu không hiện trong danh sách: tách riêng ra state.templates
    var raw = App.store.get();
    var state = Object.assign({}, raw, {
      tasks: raw.tasks.filter(function (t) { return !App.logic.isTemplate(t); }),
      templates: raw.tasks.filter(App.logic.isTemplate)
    });
    var html;
    if (r.tab === 'goals' && r.goalId) html = App.views.goalDetail(state, ui, r.goalId);
    else if (r.tab === 'goals') html = App.views.goals(state, ui);
    else if (r.tab === 'task') html = App.views.tasks(state, ui);
    else if (r.tab === 'matrix') html = App.views.matrix(state, ui);
    else if (r.tab === 'habits') html = App.views.habits(state, ui);
    else if (r.tab === 'review') html = App.views.review(state, ui);
    else html = App.views.today(state, ui);
    view.innerHTML = html;
    restoreInputs(snap);
  }

  function findTask(id) { return App.store.get().tasks.find(function (t) { return t.id === id; }); }
  function findGoal(id) { return App.store.get().goals.find(function (g) { return g.id === id; }); }

  // Hoa bung và câu động viên. oldTask: task trước khi đổi sang Xong, el: nút vừa bấm
  function celebrate(oldTask, el) {
    var x = window.innerWidth / 2, y = window.innerHeight / 2;
    if (el && el.getBoundingClientRect) {
      var r = el.getBoundingClientRect();
      if (r.width) { x = r.left + r.width / 2; y = r.top + r.height / 2; }
    }
    var state = App.store.get();
    var g = oldTask.goal_id ? findGoal(oldTask.goal_id) : null;
    if (g) {
      var before = App.logic.goalProgress(g, state.tasks.map(function (t) { return t.id === oldTask.id ? oldTask : t; })).pct;
      var after = App.logic.goalProgress(g, state.tasks).pct;
      if (before < 100 && after >= 100) {
        App.flowers.burst(window.innerWidth / 2, window.innerHeight / 2, true);
        App.ui.toast('Mục tiêu "' + g.name + '" đạt 100%! Cả vườn hoa nở cho bạn.', { cheer: true, duration: 4000 });
        return;
      }
    }
    App.flowers.burst(x, y, false);
    App.ui.toast(App.flowers.cheerText(), { cheer: true, duration: 2600 });
  }

  // Một chạm: Xong <-> Cần làm
  function toggleTask(id, el) {
    var t = findTask(id);
    if (!t) return;
    var done = t.status === App.C.DONE;
    var rect = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    ui.flashId = done ? null : id;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { ui.flashId = null; }, 400);
    var row = Object.assign({}, t, { status: done ? 'Cần làm' : App.C.DONE, done_at: done ? '' : App.date.today() });
    App.store.batch([{ type: 'upsert', table: 'Tasks', row: row }].concat(parentSync(row)));
    // Nút cũ đã bị vẽ lại, nên truyền vị trí đã đo trước đó
    if (!done) celebrate(t, rect ? { getBoundingClientRect: function () { return rect; } } : null);
  }

  /* Việc cha đã chia nhỏ: mọi việc con xong thì việc cha tự Xong, một việc con mở lại thì việc cha về Cần làm */
  function parentSync(child) {
    if (!child.parent_id) return [];
    var tasks = App.store.get().tasks, p = tasks.find(function (x) { return x.id === child.parent_id; });
    if (!p) return [];
    var kids = tasks.map(function (x) { return x.id === child.id ? child : x; }).filter(function (x) { return x.parent_id === p.id; });
    var allDone = kids.length && kids.every(App.logic.isDone), pDone = App.logic.isDone(p);
    if (allDone === pDone) return [];
    return [{ type: 'upsert', table: 'Tasks', row: Object.assign({}, p, { status: allDone ? App.C.DONE : 'Cần làm', done_at: allDone ? App.date.today() : '' }) }];
  }

  function toggleTop3(id) {
    var t = findTask(id);
    if (!t) return;
    var today = App.date.today();
    if (App.logic.isTop3Today(t, today)) {
      App.store.upsert('Tasks', Object.assign({}, t, { is_top3: 'FALSE', top3_date: '' }));
      return;
    }
    if (top3Count() >= App.C.TOP3_MAX) {
      App.ui.toast('3 việc chính hôm nay đã đủ. Bỏ bớt một việc trước.');
      return;
    }
    App.store.upsert('Tasks', Object.assign({}, t, { is_top3: 'TRUE', top3_date: today }));
  }

  // Tick hoặc bỏ tick thói quen cho một ngày (không tick ngày tương lai)
  function toggleHabit(id, date, el) {
    var today = App.date.today();
    if (!App.date.isValid(date) || date > today) return;
    var h = App.store.get().habits.find(function (x) { return x.id === id; });
    if (!h || !App.logic.isHabitDay(h, date)) return;
    var logId = App.logic.habitLogId(id, date);
    var log = App.store.get().habitLogs.find(function (l) { return l.id === logId; });
    var on = !!log && App.util.isTrue(log.done);
    var rect = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    App.store.upsert('HabitLogs', Object.assign({ id: logId, habit_id: id, date: date, created_at: App.util.now() }, log || {}, { done: on ? 'FALSE' : 'TRUE' }));
    if (!on && rect && rect.width) App.flowers.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, false);
  }

  /* Lựa chọn của ô thêm nhanh (thời lượng, Ngày sẽ làm, Quan trọng, mục tiêu), giữ theo từng ô.
     def: ngày chọn sẵn của màn đang xem; đổi ngày xem thì chọn lại theo ngày đó. */
  function quickPrefs(id, def, goalId) {
    var q = ui.qa[id];
    if (!q || q.def !== def) q = ui.qa[id] = { dur: q ? q.dur : App.C.DEFAULT_DURATION, day: def, def: def, imp: q ? q.imp : false, open: q ? q.open : false, goal: q ? q.goal : '', bucket: q ? q.bucket : App.logic.lastBucket() };
    if (goalId) q.goal = goalId;
    return q;
  }
  function quickAdd(form) {
    var input = form.elements.title, L = App.logic, today = App.date.today();
    var title = input.value.trim();
    if (!title) { input.focus(); return; }
    var q = quickPrefs(form.getAttribute('data-qa'), (ui.qa[form.getAttribute('data-qa')] || {}).def || 'kho');
    var goalId = form.getAttribute('data-goal') || q.goal || '';
    var day = App.date.isValid(q.day) ? q.day : '';
    var big = day && q.dur >= App.C.BIG_MIN;
    var t = L.newTask({ title: title, goal_id: goalId, duration_min: String(q.dur), is_important: q.imp ? 'TRUE' : 'FALSE', do_date: big ? '' : day, bucket: goalId ? '' : q.bucket });
    if (!goalId) L.rememberBucket(q.bucket);
    var fit = day && !big ? App.plan.fit(App.store.get(), day, t) : null;
    App.store.upsert('Tasks', t);
    input.value = '';
    var el = document.getElementById(input.id);
    if (el) { el.value = ''; el.focus(); }
    if (big) App.ui.toast('Việc ' + L.fmtMin(q.dur) + ' phải chia nhỏ trước khi xếp vào ngày, nên đã vào Kho.', { actionLabel: 'Chia nhỏ', actionIcon: 'list', action: function () { splitTask(t.id); }, duration: 6000 });
    else if (fit && fit.over > 0) App.ui.toast(day === today ? 'Hôm nay ' + fit.label.toLowerCase() + ' đã xếp ' + L.fmtMin(fit.total) + ' / ' + L.fmtMin(fit.avail) + ', quá tải ' + fit.over + ' phút. Hãy dời bớt về kho.' :
      App.date.weekday(day) + ' ' + App.date.fmt(day).slice(0, 5) + ' đã xếp ' + L.fmtMin(fit.total) + ' / ' + L.fmtMin(fit.avail) + ' (' + fit.label.toLowerCase() + '). Sáng hôm đó web sẽ gợi ý xếp lại.', { duration: 5000 });
  }

  // Việc mới đang cân (xem trước trong ma trận phía sau hộp thoại Cân việc mới)
  function setMxPreview(t, info) {
    ui.mxNew = t ? Object.assign({ task: t, choice: 'inbox', day: '', pushDay: '', pushIds: [] }, info || {}) : null;
    if (route().tab === 'matrix') render();
  }
  // Nhấn mạnh một thẻ vừa thêm trong ít giây
  var flashT2 = null;
  function flash(id) {
    ui.flashId = id; render();
    clearTimeout(flashT2);
    flashT2 = setTimeout(function () { ui.flashId = null; render(); }, 4000);
  }
  function splitTask(id) {
    var t = findTask(id);
    if (!t) return;
    App.forms.openSplit(t, function (n) {
      if (ui.plan) ui.plan.ids = ui.plan.ids.filter(function (x) { return x !== id; });
      App.ui.toast('Đã chia thành ' + n + ' việc con, nằm trong Kho. Đặt ngày cho từng việc con' + (ui.plan ? ' hoặc thêm vào kế hoạch ở mục Thêm từ kho.' : '.'));
    });
  }

  // Đặt Ngày sẽ làm cho một việc (từ Kho, từ cảnh báo quá hạn). Việc lớn chưa chia thì mở form chia nhỏ.
  function setDoDate(id, day) {
    var t = findTask(id), L = App.logic;
    if (!t || !App.date.isValid(day)) return;
    if (L.needsSplit(t, App.store.get().tasks)) { App.ui.toast('Việc từ 2 giờ trở lên cần chia nhỏ trước khi xếp vào ngày.'); splitTask(id); return; }
    var row = Object.assign({}, t, { do_date: day, inbox_since: '' });
    var fit = App.plan.fit(App.store.get(), day, row);
    App.store.upsert('Tasks', row);
    var when = day === App.date.today() ? 'hôm nay' : App.date.weekday(day) + ' ' + App.date.fmt(day).slice(0, 5);
    App.ui.toast(fit.over > 0 ? 'Đã xếp vào ' + when + '. ' + fit.label + ' đã ' + L.fmtMin(fit.total) + ' / ' + L.fmtMin(fit.avail) + ', quá tải ' + fit.over + ' phút.' : 'Đã xếp vào ' + when + '.');
  }

  /* ---------- Kế hoạch hôm nay (GĐ6) ---------- */
  function readJson(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  // Thứ tự đã chốt của ngày (chỉ giữ ngày gần nhất)
  function planOrder(day) {
    var o = readJson('lp_plan_order');
    return o && o.day === day && Array.isArray(o.ids) ? o.ids : [];
  }
  function buildPlan() {
    var today = App.date.today(), s = App.plan.suggest(App.store.get(), today);
    var first = s.items.find(function (p) { return p.first; });
    return { day: today, ids: s.items.map(function (p) { return p.t.id; }), first: first ? first.t.id : '', keep: {},
      skipped: s.skipped.map(function (p) { return p.t.id; }), split: s.split.map(function (t) { return t.id; }) };
  }
  function openPlan() { ui.plan = buildPlan(); render(); var p = view.querySelector('.plan'); if (p && p.scrollIntoView) p.scrollIntoView({ block: 'nearest' }); }
  function closePlan() { ui.plan = null; writePref('lp_plan_seen', App.date.today()); render(); }
  function movePlan(id, dir) {
    var ids = ui.plan.ids, i = ids.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    ids.splice(i, 1); ids.splice(j, 0, id);
    render();
    var b = view.querySelector('[data-action="pl-move"][data-id="' + id + '"][data-dir="' + dir + '"]');
    if (b && !b.disabled) b.focus();
  }
  /* Chốt: việc trong danh sách có Ngày sẽ làm = hôm nay, 3 việc đầu thành 3 việc chính.
     Việc đã đặt hôm nay mà bị bỏ khỏi danh sách thì về kho (không tính là dời). */
  function commitPlan() {
    var L = App.logic, today = App.date.today(), tasks = App.store.get().tasks, byId = {};
    tasks.forEach(function (t) { byId[t.id] = t; });
    var parents = L.parentIds(tasks);
    var ids = ui.plan.ids.filter(function (id) { return byId[id] && !L.isDone(byId[id]); });
    var top = ids.slice(0, App.C.TOP3_MAX), ops = [];
    tasks.forEach(function (t) {
      var i = ids.indexOf(t.id), row = null;
      if (i >= 0) row = Object.assign({}, t, { do_date: L.doDate(t) === today ? (t.do_date || today) : today, inbox_since: '' });
      else if (!L.isDone(t) && L.doDate(t) === today && !t.parent_recurring_id && !parents[t.id] && !L.isTemplate(t)) row = App.plan.toInbox(t, today, false);
      var isTop = top.indexOf(t.id) >= 0, was = L.isTop3Today(t, today);
      if (isTop !== was) { row = row || Object.assign({}, t); row.is_top3 = isTop ? 'TRUE' : 'FALSE'; row.top3_date = isTop ? today : ''; }
      if (row && JSON.stringify(row) !== JSON.stringify(t)) ops.push({ type: 'upsert', table: 'Tasks', row: row });
    });
    try { localStorage.setItem('lp_plan_order', JSON.stringify({ day: today, ids: ids })); } catch (e) { /* bỏ qua */ }
    writePref('lp_plan_done', today);
    ui.plan = null;
    ui.agendaSort = { key: 'plan', dir: 1 };
    App.store.batch(ops);
    var ld = App.plan.load(App.store.get(), today);
    App.ui.toast('Đã chốt kế hoạch: ' + ids.length + ' việc. ' + ld.buckets.map(function (b) { return b.short + ' ' + L.fmtMin(b.planned) + ' / ' + L.fmtMin(b.avail); }).join(', ') + '.', { duration: 4500 });
  }
  // Việc đã dời từ 3 lần: Hỏi lại người giao (ghi chú, về kho), Bỏ (xóa, hoàn tác được), Vẫn giữ
  function planAsk(id) {
    var t = findTask(id);
    if (!t) return;
    App.forms.askNote(t, function (text) {
      var line = 'Hỏi lại người giao (' + App.date.fmt(App.date.today()) + ')' + (text ? ': ' + text : '');
      var row = App.plan.toInbox(Object.assign({}, t, { note: (t.note ? t.note + '\n' : '') + line }), App.date.today(), false);
      if (ui.plan) ui.plan.ids = ui.plan.ids.filter(function (x) { return x !== id; });
      App.store.upsert('Tasks', row);
      App.ui.toast('Đã ghi chú và để việc trong kho.');
    });
  }
  function planDrop(id) {
    var t = findTask(id);
    if (!t) return;
    var kids = App.store.get().tasks.filter(function (x) { return x.parent_id === id; });
    if (ui.plan) ui.plan.ids = ui.plan.ids.filter(function (x) { return x !== id; });
    App.store.batch([{ type: 'delete', table: 'Tasks', id: id }].concat(kids.map(function (k) { return { type: 'upsert', table: 'Tasks', row: Object.assign({}, k, { parent_id: '' }) }; })));
    App.ui.toast('Đã bỏ "' + t.title + '".', { actionLabel: 'Hoàn tác', actionIcon: 'refresh', duration: 7000, action: function () {
      App.store.batch([{ type: 'upsert', table: 'Tasks', row: t }].concat(kids.map(function (k) { return { type: 'upsert', table: 'Tasks', row: k }; })));
      if (ui.plan && ui.plan.ids.indexOf(id) < 0) { ui.plan.ids.push(id); render(); }
    } });
  }
  // Đưa các việc không kịp hôm nay về kho (dời +1)
  function overflowToInbox(list) {
    var today = App.date.today();
    list = list || App.plan.overflow(App.store.get(), today, planOrder(today));
    if (!list.length) return;
    App.store.batch(list.map(function (t) { return { type: 'upsert', table: 'Tasks', row: App.plan.toInbox(t, today, true) }; }));
    App.ui.toast('Đã đưa ' + list.length + ' việc về kho.', { actionLabel: 'Hoàn tác', actionIcon: 'refresh', duration: 6000, action: function () {
      App.store.batch(list.map(function (t) { return { type: 'upsert', table: 'Tasks', row: t }; }));
    } });
  }
  // Ghi việc đột xuất, rồi báo việc nào cuối danh sách sẽ không kịp
  function newInterruption() {
    App.forms.openInterruption(function (row) {
      App.store.upsert('Interruptions', row);
      var L = App.logic, today = App.date.today(), nf = App.plan.overflow(App.store.get(), today, planOrder(today));
      var ld = App.plan.load(App.store.get(), today), b = ld.buckets[0];
      if (!nf.length) { App.ui.toast('Đã ghi việc đột xuất ' + L.fmtMin(L.duration(row)) + '. ' + b.label + ' còn ' + L.fmtMin(b.avail - b.planned) + ' chưa xếp.'); return; }
      App.ui.ask('Quỹ giờ không đủ', 'Đã ghi việc đột xuất ' + L.fmtMin(L.duration(row)) + '. ' + b.label + ' còn ' + L.fmtMin(b.avail) + ' cho việc đã xếp, nên các việc cuối danh sách sẽ không kịp hôm nay: ' +
        nf.map(function (t) { return t.title + ' (' + L.fmtMin(L.duration(t)) + ')'; }).join(', ') + '. Đưa về kho?', [
        { label: 'Đưa ' + nf.length + ' việc về kho', value: 'yes', kind: 'primary' }, { label: 'Để sau', value: null }
      ]).then(function (v) { if (v === 'yes') overflowToInbox(nf); });
    });
  }
  function delInterruption(id) {
    var x = App.store.get().interruptions.find(function (r) { return r.id === id; });
    if (!x) return;
    App.store.remove('Interruptions', id);
    App.ui.toast('Đã xóa việc đột xuất.', { actionLabel: 'Hoàn tác', actionIcon: 'refresh', duration: 6000, action: function () { App.store.upsert('Interruptions', x); } });
  }

  /* Xem lại kho mỗi tuần: từ giờ đã đặt (mặc định Thứ Sáu 16h30) đến hết tuần, nếu tuần đó chưa xem. Trả về số việc trong kho, 0 = không nhắc. */
  function weekKey(d) { var w = App.date.isoWeek(d); return w.year + '-W' + w.week; }
  function inboxReviewDue() {
    var D = App.date, today = D.today(), s = App.plan.settings(App.store.get());
    if (readPref('lp_inbox_review', '') === weekKey(today)) return 0;
    var wd = +s.review_weekday, dow = D.parse(today).getUTCDay();
    var idx = function (x) { return (x + 6) % 7; }; // thứ Hai = 0
    if (idx(dow) < idx(wd) || (dow === wd && D.nowHM() < s.review_time)) return 0;
    return App.store.get().tasks.filter(App.logic.inInbox).length;
  }
  function inboxReviewDone() { writePref('lp_inbox_review', weekKey(App.date.today())); }

  // Sinh các lần lặp còn thiếu (đến hôm nay)
  function generateRecurring() {
    var list = App.logic.recurringToCreate(App.store.get().tasks, App.date.today(), App.store.get().habits);
    if (!list.length) return;
    App.store.batch(list.map(function (t) { return { type: 'upsert', table: 'Tasks', row: t }; }));
  }

  // Mục tiêu theo chỉ số: cộng nhanh vào giá trị thực tế
  function addMetric(id) {
    var g = findGoal(id);
    if (!g) return;
    App.forms.addMetric(g, function (n) {
      var tasks = App.store.get().tasks;
      var before = App.logic.goalProgress(g, tasks).pct;
      var row = Object.assign({}, g, { actual: App.logic.fmtNum(Math.max(0, App.logic.num(g.actual) + n)) });
      App.store.upsert('Goals', row);
      var after = App.logic.goalProgress(row, tasks).pct;
      if (before < 100 && after >= 100) {
        App.flowers.burst(window.innerWidth / 2, window.innerHeight / 2, true);
        App.ui.toast('Mục tiêu "' + g.name + '" đạt 100%! Cả vườn hoa nở cho bạn.', { cheer: true, duration: 4000 });
      } else {
        var delta = App.logic.num(row.actual) - App.logic.num(g.actual);
        App.ui.toast((delta < 0 ? 'Đã trừ ' : 'Đã cộng ') + App.logic.fmtVi(Math.abs(delta)) + (g.unit ? ' ' + g.unit : '') + '. Hiện đạt ' + App.logic.fmtVi(App.logic.num(row.actual)) + (g.unit ? ' ' + g.unit : '') + '.');
      }
    });
  }

  // Lưu review của một kỳ (mỗi kỳ một dòng Reviews): mức hài lòng và các câu trả lời
  function saveReview(form) {
    var type = form.getAttribute('data-type'), value = form.getAttribute('data-value');
    function txt(n) { return form.elements[n] ? form.elements[n].value.trim() : ''; }
    var picked = form.querySelector('input[name="rating"]:checked');
    var f = { good: txt('good'), next: txt('next'), rating: picked ? picked.value : '' };
    // Review ngày chỉ có 2 câu: không đụng tới cột bad
    if (form.elements.bad) f.bad = txt('bad');
    var old = App.summary.findReview(App.store.get().reviews, type, value);
    if (!old && !f.good && !f.bad && !f.next && !f.rating) { App.ui.toast('Hãy chọn mức hài lòng hoặc viết ít nhất một câu trước khi lưu.'); return; }
    var now = App.util.now();
    App.store.upsert('Reviews', Object.assign({ id: App.util.uuid(), period_type: type, period_value: value, created_at: now }, old || {}, f));
    App.ui.toast('Đã lưu review ' + App.period.label(type, value) + '.');
  }

  // Ẩn lời nhắc từ ngày day trở đi (day rỗng: hiện lại)
  function setReminder(ids, day) {
    var reviews = App.store.get().reviews;
    var ops = ids.map(function (id) { return reviews.find(function (r) { return r.id === id; }); }).filter(Boolean).map(function (r) {
      return { type: 'upsert', table: 'Reviews', row: Object.assign({}, r, { hide_from: day }) };
    });
    if (!ops.length) return;
    App.store.batch(ops);
    App.ui.toast(day ? 'Đã ẩn lời nhắc. Muốn xem lại thì bấm "Hiện lại".' : 'Đã hiện lại lời nhắc.');
  }

  // Sang ngày mới / hết giờ làm: việc chưa xong về kho
  function rollover() {
    var rows = App.plan.rolloverRows(App.store.get(), App.date.today(), App.date.nowHM());
    if (!rows.length) return;
    App.store.batch(rows.map(function (r) { return { type: 'upsert', table: 'Tasks', row: r }; }));
    App.ui.toast('Đã đưa ' + rows.length + ' việc chưa xong về kho. Số lần dời đã tăng thêm 1.', { duration: 5000 });
  }
  // Lần đầu mở web trong ngày: mở sẵn Kế hoạch hôm nay (đã chốt hoặc đã bấm Để sau thì thôi)
  function autoPlan() {
    var today = App.date.today();
    if (ui.plan || readPref('lp_plan_done', '') === today || readPref('lp_plan_seen', '') === today) return;
    var p = buildPlan();
    if (p.ids.length || p.split.length) ui.plan = p;
  }

  view.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var id = el.getAttribute('data-id');
    switch (el.getAttribute('data-action')) {
      case 'toggle-task': toggleTask(id, el); break;
      case 'today-view': ui.todayView = el.getAttribute('data-view'); writePref('lp_today_view', ui.todayView); render(); break;
      case 'toggle-top3': toggleTop3(id); break;
      case 'open-task': var t = findTask(id); if (t) App.forms.openTask(t); break;
      case 'open-goal': go('#/muc-tieu/' + encodeURIComponent(id)); break;
      case 'new-goal':
        var gd = {};
        if (el.getAttribute('data-group')) gd.group = el.getAttribute('data-group');
        // Tạo từ trang trống của một kỳ thì điền sẵn kỳ đó
        var pr = el.getAttribute('data-ptype') && App.period.range(el.getAttribute('data-ptype'), el.getAttribute('data-pvalue'));
        if (pr) { gd.period_type = el.getAttribute('data-ptype'); gd.period_value = el.getAttribute('data-pvalue'); gd.start_date = pr.start; gd.end_date = pr.end; }
        App.forms.openGoal(null, gd); break;
      case 'edit-goal': var g = findGoal(id); if (g) App.forms.openGoal(g); break;
      case 'delete-goal': var g2 = findGoal(id); if (g2) App.forms.deleteGoal(g2); break;
      case 'filter-group': ui.groupFilter = el.getAttribute('data-group') || ''; render(); break;
      case 'filter-period':
        ui.periodType = el.getAttribute('data-type') || '';
        ui.periodValue = App.C.PERIOD_TYPES.indexOf(ui.periodType) >= 0 ? App.period.valueOf(ui.periodType, App.date.today()) : '';
        render(); break;
      case 'new-task':
        var td = {};
        if (el.getAttribute('data-goal')) td.goal_id = el.getAttribute('data-goal');
        if (App.date.isValid(el.getAttribute('data-day'))) td.do_date = el.getAttribute('data-day');
        App.forms.openTask(null, td); break;
      case 'qa-toggle': var qq = ui.qa[el.getAttribute('data-qa')]; if (qq) { qq.open = !qq.open; render(); var tb = view.querySelector('[data-action="qa-toggle"][data-qa="' + el.getAttribute('data-qa') + '"]'); if (tb) tb.focus(); } break;
      case 'slow-toggle': ui.slowOpen = !ui.slowOpen; render(); var sb = view.querySelector('[data-action="slow-toggle"]'); if (sb) sb.focus(); break;
      case 'mx-scope': ui.mxScope = el.getAttribute('data-scope') || 'today'; writePref('lp_mx_scope', ui.mxScope); render(); break;
      case 'mx-edit': var et = findTask(id); if (et) App.forms.quickEdit(et); break;
      case 'balance-open':
        if (route().tab !== 'matrix') { ui.mxScope = 'today'; go('#/ma-tran'); setTimeout(function () { App.forms.openBalance(); }, 30); }
        else App.forms.openBalance();
        break;
      case 'plan-open': openPlan(); break;
      case 'plan-close': closePlan(); break;
      case 'plan-commit': commitPlan(); break;
      case 'pl-move': movePlan(id, +el.getAttribute('data-dir') || 0); break;
      case 'pl-remove': ui.plan.ids = ui.plan.ids.filter(function (x) { return x !== id; }); render(); break;
      case 'pl-add':
        var sel = document.getElementById('pl-add-sel');
        if (sel && sel.value && ui.plan.ids.indexOf(sel.value) < 0) { ui.plan.ids.push(sel.value); render(); }
        break;
      case 'pl-keep': ui.plan.keep[id] = true; render(); break;
      case 'pl-ask': planAsk(id); break;
      case 'pl-drop': planDrop(id); break;
      case 'pl-split': case 'split-task': splitTask(id); break;
      case 'do-day': setDoDate(id, el.getAttribute('data-day')); break;
      case 'intr-new': newInterruption(); break;
      case 'intr-del': delInterruption(id); break;
      case 'overflow-inbox': overflowToInbox(); break;
      case 'task-view': ui.taskView = el.getAttribute('data-view'); render(); break;
      case 'inbox-review': App.forms.inboxReview(inboxReviewDone); break;
      case 'inbox-later': inboxReviewDone(); render(); App.ui.toast('Đã ẩn lời nhắc tới tuần sau. Mở lúc nào cũng được ở tab Task, màn Kho.'); break;
      case 'day-shift': ui.day = App.date.addDays(ui.day || App.date.today(), +el.getAttribute('data-dir') || 0); render(); break;
      case 'day-today': ui.day = ''; render(); break;
      case 'tt-sort':
        var sk = el.getAttribute('data-scope') === 'task' ? 'taskSort' : 'agendaSort', key = el.getAttribute('data-key');
        ui[sk] = { key: key, dir: ui[sk].key === key ? -ui[sk].dir : 1 };
        render();
        var again = view.querySelector('[data-action="tt-sort"][data-key="' + key + '"]');
        if (again) again.focus();
        break;
      case 'rem-hide': setReminder([id], ui.day || App.date.today()); break;
      case 'rem-show': setReminder(String(el.getAttribute('data-ids') || '').split(','), ''); break;
      case 'metric-add': addMetric(id); break;
      case 'new-habit': App.forms.openHabit(null, el.getAttribute('data-goal') ? { goal_id: el.getAttribute('data-goal') } : null); break;
      case 'edit-habit': var hb = App.store.get().habits.find(function (x) { return x.id === id; }); if (hb) App.forms.openHabit(hb); break;
      case 'habit-tick': toggleHabit(id, el.getAttribute('data-date'), el); break;
      case 'habit-view': ui.habitView = el.getAttribute('data-view'); ui.habitShift = 0; writePref('lp_habit_view', ui.habitView); render(); break;
      case 'habit-shift': ui.habitShift = Math.min(0, (ui.habitShift || 0) + (+el.getAttribute('data-dir') || 0)); render(); break;
      case 'rev-type': ui.revType = el.getAttribute('data-type'); ui.revValue = ''; ui.revChart = App.summary.GRAN_DEFAULT[ui.revType] || 'day'; writePref('lp_review_type', ui.revType); render(); break;
      case 'rev-shift':
        var rcur = App.summary.current(ui.revType, App.date.today());
        var rv = App.summary.shift(ui.revType, ui.revValue || rcur, +el.getAttribute('data-dir') || 0);
        ui.revValue = rv > rcur ? rcur : rv; render(); break;
      case 'rev-chart': ui.revChart = el.getAttribute('data-chart'); writePref('lp_review_chart', ui.revChart); render(); break;
      case 'rev-open': ui.revType = el.getAttribute('data-type'); ui.revValue = el.getAttribute('data-value'); render(); window.scrollTo(0, 0); break;
      case 'task-reset': ui.taskFilter = { status: 'open', imp: '', goal: '', due: '', quad: '', from: '', to: '' }; render(); break;
      case 'go': go(el.getAttribute('data-href')); break;
      case 'reload': reload(); break;
    }
  });
  // Bấm vào ô gõ tên thì mở tùy chọn (đổi lớp ngay, không vẽ lại để không mất chữ đang gõ)
  view.addEventListener('focusin', function (e) {
    var el = e.target;
    if (!el || el.name !== 'title') return;
    var qf = el.closest && el.closest('[data-form="quick-add"]'), q = qf && ui.qa[qf.getAttribute('data-qa')];
    if (!q || q.open) return;
    q.open = true; qf.classList.add('is-open');
    var tg = qf.querySelector('.qa-toggle'); if (tg) tg.setAttribute('aria-expanded', 'true');
  });
  // Ô chọn lọc (kỳ của mục tiêu, bộ lọc tab Task)
  view.addEventListener('change', function (e) {
    var el = e.target;
    if (el.name === 'period-value') { ui.periodValue = el.value; render(); }
    else if (/^qa-/.test(el.name || '')) {
      var qf = el.closest('[data-form="quick-add"]'), q = qf && ui.qa[qf.getAttribute('data-qa')];
      if (!q) return;
      q.open = true; // đang chỉnh tùy chọn thì giữ mở, để vẽ lại không làm mất focus
      if (el.name === 'qa-dur') q.dur = +el.value;
      else if (el.name === 'qa-day') q.day = el.value;
      else if (el.name === 'qa-imp') q.imp = el.checked;
      else if (el.name === 'qa-goal') q.goal = el.value;
      else if (el.name === 'qa-bucket') q.bucket = el.value;
      render();
      var back = document.getElementById(el.id);
      if (back) back.focus();
    }
    else if (el.name === 'inbox-sort') { ui.inboxSort = el.value; render(); }
    else if (el.name === 'inbox-goal') { ui.inboxGoal = el.value; render(); }
    else if (el.name === 'agenda-day') { if (App.date.isValid(el.value)) { ui.day = el.value === App.date.today() ? '' : el.value; render(); } }
    else if (el.getAttribute && el.getAttribute('data-filter')) { ui.taskFilter[el.getAttribute('data-filter')] = el.value; render(); }
  });
  view.addEventListener('submit', function (e) {
    var rf = e.target.closest('[data-form="review"]');
    if (rf) { e.preventDefault(); saveReview(rf); return; }
    var form = e.target.closest('[data-form="quick-add"]');
    if (!form) return;
    e.preventDefault();
    quickAdd(form);
  });

  document.getElementById('btn-settings').addEventListener('click', function () { App.forms.openSettings(); });

  // Chọn hình nền: hoa rơi hoặc trơn
  var bgBtn = document.getElementById('btn-bg'), bgPop = document.getElementById('bg-pop');
  function syncBg() {
    var mode = App.flowers.getBg();
    bgPop.querySelectorAll('[data-bg]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-bg') === mode);
      b.setAttribute('aria-pressed', String(b.getAttribute('data-bg') === mode));
    });
  }
  function closeBg() { bgPop.hidden = true; bgBtn.setAttribute('aria-expanded', 'false'); }
  bgBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    bgPop.hidden = !bgPop.hidden;
    bgBtn.setAttribute('aria-expanded', String(!bgPop.hidden));
    syncBg();
  });
  bgPop.addEventListener('click', function (e) {
    e.stopPropagation();
    var b = e.target.closest('[data-bg]');
    if (!b) return;
    App.flowers.setBg(b.getAttribute('data-bg'));
    syncBg();
  });
  document.addEventListener('click', function () { if (!bgPop.hidden) closeBg(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !bgPop.hidden) { closeBg(); bgBtn.focus(); } });

  var syncEl = document.getElementById('sync');
  App.store.onStatus(function (s) {
    syncEl.innerHTML = App.ui.icon(s.kind === 'error' ? 'cloudoff' : 'cloud', 'ic14') + '<span>' + App.util.esc(s.text) + '</span>';
    syncEl.classList.toggle('is-error', s.kind === 'error');
    syncEl.title = s.error || '';
  });

  App.store.onChange(function () { if (loaded) render(); });
  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });
  // Biểu đồ vẽ theo bề ngang màn hình: đổi cỡ thì vẽ lại
  var resizeTimer = null, lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    if (route().tab !== 'review' || window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 150);
  });
  // Quay lại trang (ví dụ mở lại tab trên điện thoại): tải dữ liệu mới, có thể đã sửa ở thiết bị khác
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && loaded && App.store.status().kind === 'saved') reload();
  });

  // Mất mạng / có mạng lại: báo ở dòng trạng thái, có mạng thì lưu phần còn chờ rồi tải dữ liệu mới
  window.addEventListener('offline', function () { App.store.refreshStatus(); });
  window.addEventListener('online', function () {
    if (App.store.status().kind === 'error') App.store.retry();
    if (loaded) reload();
  });

  function reload() {
    loadError = null;
    if (!loaded) render();
    return App.store.load().then(function () {
      loaded = true;
      generateRecurring();
      rollover();
      autoPlan();
      render();
    }, function (err) {
      if (err && (err.code === 'NO_TOKEN' || err.code === 'BAD_TOKEN')) {
        loadError = err.message;
        render();
        App.forms.openSettings(err.code === 'BAD_TOKEN' ? 'Mã bí mật không đúng. Hãy dán lại.' : '');
        return;
      }
      if (loaded && navigator.onLine === false) {
        App.ui.toast('Đang mất mạng, web dùng dữ liệu đã lưu trên máy. Có mạng lại sẽ tự cập nhật.');
      } else if (loaded) {
        App.ui.toast('Không tải được dữ liệu mới. ' + err.message + '.', { actionLabel: 'Thử lại', action: reload, sticky: true });
      } else {
        loadError = err.message;
        render();
      }
    });
  }

  function start() {
    App.flowers.install();
    App.flowers.applyBg();
    App.theme.apply();
    // PWA: cài lên màn hình chính, mở được khi mạng chập chờn (chỉ chạy trên https)
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(function () { /* không có cũng vẫn dùng được */ });
    }
    if (App.api.mode === 'mock') document.getElementById('banner').hidden = false;
    if (App.store.loadCache()) { loaded = true; render(); }
    else render();
    reload();
  }

  return { start: start, go: go, render: render, reload: reload, top3Count: top3Count, celebrate: celebrate, generateRecurring: generateRecurring,
    quickPrefs: quickPrefs, planOrder: planOrder, inboxReviewDue: inboxReviewDue, parentSync: parentSync, splitTask: splitTask, setMxPreview: setMxPreview, flash: flash };
})();

App.app.start();

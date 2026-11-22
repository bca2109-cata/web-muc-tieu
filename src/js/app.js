/* Điều khiển chính: định tuyến theo #, vẽ màn hình, xử lý thao tác */
var App = window.App || (window.App = {});

App.app = (function () {
  var view = document.getElementById('view');
  var ui = {
    groupFilter: '', periodType: '', periodValue: '', flashId: null, todayView: readPref('lp_today_view', 'matrix'),
    day: '', agendaSort: { key: 'due', dir: 1 }, taskSort: { key: 'due', dir: 1 },
    taskFilter: { status: 'open', priority: '', goal: '', due: '', quad: '', from: '', to: '' },
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
    App.store.upsert('Tasks', Object.assign({}, t, {
      status: done ? 'Cần làm' : App.C.DONE,
      done_at: done ? '' : App.date.today()
    }));
    // Nút cũ đã bị vẽ lại, nên truyền vị trí đã đo trước đó
    if (!done) celebrate(t, rect ? { getBoundingClientRect: function () { return rect; } } : null);
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
      App.ui.toast('Top 3 hôm nay đã đủ 3 việc. Bỏ bớt một việc trước.');
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

  function quickAdd(form) {
    var input = form.elements.title;
    var title = input.value.trim();
    if (!title) { input.focus(); return; }
    var goalId = form.getAttribute('data-goal') || '';
    var d = {title: title, goal_id: goalId };
    if (App.date.isValid(form.getAttribute('data-day'))) d.due_date = form.getAttribute('data-day');
    App.store.upsert('Tasks', App.logic.newTask(d));
    input.value = '';
    var el = document.getElementById(input.id);
    if (el) { el.value = ''; el.focus(); }
  }

  // Sinh các lần lặp còn thiếu (đến hôm nay)
  function generateRecurring() {
    var list = App.logic.recurringToCreate(App.store.get().tasks, App.date.today());
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

  // Top 3 hôm trước chưa xong: chuyển sang hôm nay
  function carryOverTop3() {
    var today = App.date.today();
    var list = App.logic.top3CarryOver(App.store.get().tasks, today);
    if (!list.length) return;
    var room = App.C.TOP3_MAX - top3Count();
    var ops = list.slice(0, Math.max(0, room)).map(function (t) {
      return { type: 'upsert', table: 'Tasks', row: Object.assign({}, t, { top3_date: today }) };
    });
    App.store.batch(ops);
  }

  /* Mỗi ngày một lần: Top 3 còn chỗ thì tự điền việc trễ hạn, rồi việc Khẩn cấp.
     Chỉ chạy một lần mỗi ngày trên mỗi máy, để bỏ sao một việc thì nó không tự quay lại. */
  function autoFillTop3() {
    var today = App.date.today();
    if (readPref('lp_top3_auto', '') === today) return;
    var room = App.C.TOP3_MAX - top3Count();
    var tasks = App.store.get().tasks.filter(function (t) { return !App.logic.isTemplate(t) && !App.logic.isMissed(t, today); });
    var list = App.logic.top3Suggest(tasks, today, room);
    // Chưa có việc nào để điền thì chưa đánh dấu, lần mở sau trong ngày thử lại
    if (room > 0 && !list.length) return;
    writePref('lp_top3_auto', today);
    if (!list.length) return;
    App.store.batch(list.map(function (t) {
      return { type: 'upsert', table: 'Tasks', row: Object.assign({}, t, { is_top3: 'TRUE', top3_date: today }) };
    }));
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
        if (App.date.isValid(el.getAttribute('data-day'))) td.due_date = el.getAttribute('data-day');
        App.forms.openTask(null, td); break;
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
      case 'task-reset': ui.taskFilter = { status: 'open', priority: '', goal: '', due: '', quad: '', from: '', to: '' }; render(); break;
      case 'go': go(el.getAttribute('data-href')); break;
      case 'reload': reload(); break;
    }
  });
  // Ô chọn lọc (kỳ của mục tiêu, bộ lọc tab Task)
  view.addEventListener('change', function (e) {
    var el = e.target;
    if (el.name === 'period-value') { ui.periodValue = el.value; render(); }
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
      carryOverTop3();
      autoFillTop3();
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

  return { start: start, go: go, render: render, reload: reload, top3Count: top3Count, celebrate: celebrate, generateRecurring: generateRecurring };
})();

App.app.start();

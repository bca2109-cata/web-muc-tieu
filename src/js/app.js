/* Điều khiển chính: định tuyến theo #, vẽ màn hình, xử lý thao tác */
var App = window.App || (window.App = {});

App.app = (function () {
  var view = document.getElementById('view');
  var ui = { groupFilter: '', flashId: null };
  var loaded = false;
  var loadError = null;
  var flashTimer = null;

  function route() {
    var h = location.hash || '#/hom-nay';
    var m = /^#\/muc-tieu\/(.+)$/.exec(h);
    if (m) return { tab: 'goals', goalId: decodeURIComponent(m[1]) };
    if (h.indexOf('#/muc-tieu') === 0) return { tab: 'goals' };
    return { tab: 'today' };
  }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

  function top3Count() {
    var today = App.date.today();
    return App.store.get().tasks.filter(function (t) { return App.logic.isTop3Today(t, today); }).length;
  }

  // Giữ chữ đang gõ và vị trí con trỏ khi vẽ lại
  function snapshotInputs() {
    var snap = {};
    view.querySelectorAll('input[id]').forEach(function (el) { snap[el.id] = el.value; });
    var a = document.activeElement;
    return { values: snap, focus: a && view.contains(a) && a.id ? a.id : null };
  }
  function restoreInputs(s) {
    Object.keys(s.values).forEach(function (id) { var el = document.getElementById(id); if (el) el.value = s.values[id]; });
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
    var state = App.store.get();
    var html;
    if (r.tab === 'goals' && r.goalId) html = App.views.goalDetail(state, ui, r.goalId);
    else if (r.tab === 'goals') html = App.views.goals(state, ui);
    else html = App.views.today(state, ui);
    view.innerHTML = html;
    restoreInputs(snap);
  }

  function findTask(id) { return App.store.get().tasks.find(function (t) { return t.id === id; }); }
  function findGoal(id) { return App.store.get().goals.find(function (g) { return g.id === id; }); }

  // Một chạm: Xong <-> Cần làm
  function toggleTask(id) {
    var t = findTask(id);
    if (!t) return;
    var done = t.status === App.C.DONE;
    ui.flashId = done ? null : id;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { ui.flashId = null; }, 400);
    App.store.upsert('Tasks', Object.assign({}, t, {
      status: done ? 'Cần làm' : App.C.DONE,
      done_at: done ? '' : App.date.today()
    }));
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

  function quickAdd(form) {
    var input = form.elements.title;
    var title = input.value.trim();
    if (!title) { input.focus(); return; }
    var goalId = form.getAttribute('data-goal') || '';
    App.store.upsert('Tasks', App.logic.newTask({ title: title, goal_id: goalId }));
    input.value = '';
    var el = document.getElementById(input.id);
    if (el) { el.value = ''; el.focus(); }
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

  view.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var id = el.getAttribute('data-id');
    switch (el.getAttribute('data-action')) {
      case 'toggle-task': toggleTask(id); break;
      case 'toggle-top3': toggleTop3(id); break;
      case 'open-task': var t = findTask(id); if (t) App.forms.openTask(t); break;
      case 'open-goal': go('#/muc-tieu/' + encodeURIComponent(id)); break;
      case 'new-goal': App.forms.openGoal(null, el.getAttribute('data-group') ? { group: el.getAttribute('data-group') } : null); break;
      case 'edit-goal': var g = findGoal(id); if (g) App.forms.openGoal(g); break;
      case 'delete-goal': var g2 = findGoal(id); if (g2) App.forms.deleteGoal(g2); break;
      case 'filter-group': ui.groupFilter = el.getAttribute('data-group') || ''; render(); break;
      case 'go': go(el.getAttribute('data-href')); break;
      case 'reload': reload(); break;
    }
  });
  view.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-form="quick-add"]');
    if (!form) return;
    e.preventDefault();
    quickAdd(form);
  });

  document.getElementById('btn-settings').addEventListener('click', function () { App.forms.openSettings(); });

  var syncEl = document.getElementById('sync');
  App.store.onStatus(function (s) {
    syncEl.textContent = s.text;
    syncEl.classList.toggle('is-error', s.kind === 'error');
    syncEl.title = s.error || '';
  });

  App.store.onChange(function () { if (loaded) render(); });
  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });
  // Quay lại trang (ví dụ mở lại tab trên điện thoại): tải dữ liệu mới, có thể đã sửa ở thiết bị khác
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && loaded && App.store.status().kind === 'saved') reload();
  });

  function reload() {
    loadError = null;
    if (!loaded) render();
    return App.store.load().then(function () {
      loaded = true;
      carryOverTop3();
      render();
    }, function (err) {
      if (err && (err.code === 'NO_TOKEN' || err.code === 'BAD_TOKEN')) {
        loadError = err.message;
        render();
        App.forms.openSettings(err.code === 'BAD_TOKEN' ? 'Mã bí mật không đúng. Hãy dán lại.' : '');
        return;
      }
      if (loaded) {
        App.ui.toast('Không tải được dữ liệu mới. ' + err.message + '.', { actionLabel: 'Thử lại', action: reload, sticky: true });
      } else {
        loadError = err.message;
        render();
      }
    });
  }

  function start() {
    if (App.api.mode === 'mock') document.getElementById('banner').hidden = false;
    if (App.store.loadCache()) { loaded = true; render(); }
    else render();
    reload();
  }

  return { start: start, go: go, render: render, reload: reload, top3Count: top3Count };
})();

App.app.start();

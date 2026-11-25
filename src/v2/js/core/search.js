/* V2 · tìm kiếm chung. Mỗi phần đăng ký một nguồn:
     LP.search.register('Tên nguồn', function (q) { // q đã bỏ dấu, chữ thường
       return [{ title, sub, icon, route, params }];
     });
   Có sẵn các nguồn: Việc, Mẫu công việc (và hạng mục), Mục tiêu, Thói quen, Tài liệu (theo tên). Bỏ dấu tiếng Việt khi so khớp. */
var LP = window.LP || (window.LP = {});

LP.search = (function () {
  var sources = {}, panel = null;
  var fold = LP.util.fold, esc = LP.util.esc;

  function register(name, fn) { sources[name] = fn; }

  function query(q, limit) {
    var nq = fold(q).trim();
    if (!nq) return [];
    var out = [];
    Object.keys(sources).forEach(function (name) {
      var rows = [];
      try { rows = sources[name](nq) || []; } catch (e) { console.error(e); }
      rows.forEach(function (r) { r.type = r.type || name; out.push(r); });
    });
    return out.slice(0, limit || 30);
  }
  function has(text, nq) { return fold(text).indexOf(nq) >= 0; }

  /* ---------- Nguồn có sẵn ---------- */
  register('Việc', function (q) {
    return LP.store.get().tasks.filter(function (t) { return has(t.title, q) || has(t.requester, q); }).map(function (t) {
      return { title: t.title, sub: (t.status === 'done' ? 'Đã xong' : t.due_date ? 'Hạn ' + LP.date.fmt(t.due_date) : 'Chưa có hạn'), icon: 'list',
        route: 'agenda', params: { date: t.do_date || t.due_date || LP.date.today() } };
    });
  });
  register('Mẫu công việc', function (q) {
    var s = LP.store.get(), out = [];
    s.routines.forEach(function (r) {
      if (has(r.name, q)) out.push({ title: r.name, sub: 'Mẫu công việc', icon: 'calcheck', route: 'mau', params: { id: r.id } });
    });
    s.routineItems.forEach(function (it) {
      if (!has(it.title, q)) return;
      var r = s.routines.filter(function (x) { return x.id === it.routine_id; })[0];
      if (r) out.push({ title: it.title, sub: 'Hạng mục · ' + r.name, icon: 'check', route: 'mau', params: { id: r.id } });
    });
    return out;
  });
  register('Mục tiêu', function (q) {
    return LP.store.get().goals.filter(function (g) { return has(g.title, q); })
      .map(function (g) { return { title: g.title, sub: g.period_value, icon: 'target', route: 'muc-tieu', params: { id: g.id } }; });
  });
  register('Thói quen', function (q) {
    return LP.store.get().habits.filter(function (h) { return has(h.name, q); })
      .map(function (h) { return { title: h.name, sub: 'Thói quen', icon: 'flame', route: 'muc-tieu', params: { habit: h.id } }; });
  });
  register('Ghi chú', function (q) {
    return LP.store.get().docs.filter(function (d) { return has(d.title, q); })
      .map(function (d) { return { title: d.title, sub: d.space || '', icon: 'doc', route: 'ghi-chu', params: { doc: d.id } }; });
  });

  /* ---------- Giao diện ---------- */
  function renderResults(q) {
    var box = panel.querySelector('.sr-list'), rows = query(q);
    if (!q.trim()) { box.innerHTML = '<p class="muted sr-empty">Gõ tên việc, mẫu, mục tiêu hoặc ghi chú.</p>'; return; }
    if (!rows.length) { box.innerHTML = '<p class="muted sr-empty">Không thấy kết quả nào.</p>'; return; }
    box.innerHTML = rows.map(function (r, i) {
      return '<button type="button" class="sr-row" data-i="' + i + '">' + LP.ui.icon(r.icon || 'search') +
        '<span class="sr-main"><span class="sr-title">' + esc(r.title) + '</span><span class="sr-sub muted">' + esc(r.type) + (r.sub ? ' · ' + esc(r.sub) : '') + '</span></span></button>';
    }).join('');
    box._rows = rows;
  }
  function open() {
    if (panel) { panel.querySelector('input').focus(); return; }
    panel = document.createElement('div');
    panel.className = 'overlay sr-overlay';
    panel.innerHTML = '<div class="modal sr-modal" role="dialog" aria-modal="true" aria-label="Tìm kiếm">' +
      '<div class="sr-bar">' + LP.ui.icon('search') + '<input type="search" class="sr-input" placeholder="Tìm việc, mẫu, mục tiêu, ghi chú" aria-label="Tìm kiếm" autocomplete="off">' +
      '<button type="button" class="icon-btn" data-close aria-label="Đóng">' + LP.ui.icon('close') + '</button></div>' +
      '<div class="sr-list" aria-live="polite"></div></div>';
    panel.addEventListener('click', function (e) {
      if (e.target === panel || e.target.closest('[data-close]')) { close(); return; }
      var b = e.target.closest('.sr-row');
      if (b) { var r = panel.querySelector('.sr-list')._rows[+b.getAttribute('data-i')]; close(); LP.router.go(r.route, r.params); }
    });
    var input = panel.querySelector('input');
    input.addEventListener('input', function () { renderResults(input.value); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(panel);
    renderResults('');
    input.focus();
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function close() {
    if (!panel) return;
    document.removeEventListener('keydown', onKey);
    panel.remove(); panel = null;
  }

  return { register: register, query: query, open: open, close: close };
})();

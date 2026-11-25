/* V2 · Phần 4: route muc-tieu = Mục tiêu + Thói quen (nút chuyển ở đầu trang, ?tab=thoi-quen).
   Mục tiêu: thẻ kiểu web cũ (băng washi, sticker, nhãn kỳ, còn N ngày, trái tim, thanh tiến độ sọc chéo, câu trạng thái).
   Tiến độ theo số việc gắn vào mục tiêu (Tasks.goal_id) hoặc theo số nhập tay (thực tế / target). */
var LP = window.LP || (window.LP = {});

LP.mucTieu = (function () {
  var D = LP.date, esc = LP.ui.esc, icon = LP.ui.icon, num = LP.util.num;
  var root = null, body = null, onChange = null;
  var filt = { period: '', group: '' };
  var GROUPS = { cong_viec: { name: 'Công việc', cls: 'w', icon: 'brief' }, ca_nhan: { name: 'Cá nhân', cls: 's', icon: 'leaf' } };
  var PTYPES = { year: 'Năm', quarter: 'Quý', month: 'Tháng' };

  function S() { return LP.store.get(); }
  function grp(g) { return GROUPS[g.group] || GROUPS.ca_nhan; }
  function fmtN(n) { return String(Math.round(n * 100) / 100).replace('.', ','); }

  /* ---------- Kỳ ---------- */
  function periodRange(type, v) {
    if (type === 'year') return { from: v + '-01-01', to: v + '-12-31' };
    if (type === 'quarter') { var y = v.slice(0, 4), q = +v.slice(6), m0 = (q - 1) * 3 + 1, f = y + '-' + (m0 < 10 ? '0' : '') + m0 + '-01'; return { from: f, to: D.monthEnd(D.addMonths(f, 2)) }; }
    return { from: v + '-01', to: D.monthEnd(v + '-01') };
  }
  function periodLabel(type, v) {
    if (type === 'year') return 'Năm ' + v;
    if (type === 'quarter') return 'Quý ' + v.slice(6) + '/' + v.slice(0, 4);
    return 'Tháng ' + v.slice(5) + '/' + v.slice(0, 4);
  }
  function periodOptions(type, today) {
    var y = +today.slice(0, 4), out = [], i, m = today.slice(0, 8) + '01';
    if (type === 'year') for (i = -1; i <= 2; i++) out.push(String(y + i));
    else if (type === 'quarter') { var q = Math.floor((+today.slice(5, 7) - 1) / 3); for (i = -1; i <= 4; i++) { var qq = q + i, yy = y + Math.floor(qq / 4); out.push(yy + '-Q' + (((qq % 4) + 4) % 4 + 1)); } }
    else for (i = -2; i <= 9; i++) out.push(D.addMonths(m, i).slice(0, 7));
    return out;
  }
  function currentValue(type, today) {
    if (type === 'year') return today.slice(0, 4);
    if (type === 'quarter') return today.slice(0, 4) + '-Q' + (Math.floor((+today.slice(5, 7) - 1) / 3) + 1);
    return today.slice(0, 7);
  }

  /* ---------- Tiến độ ---------- */
  function tasksOf(g) { return S().tasks.filter(function (t) { return t.goal_id === g.id && t.status !== 'cancelled'; }); }
  function progress(g) {
    if (g.progress_mode === 'number') {
      var target = num(g.target), actual = num(g.actual);
      return { mode: 'number', done: actual, total: target, unit: g.unit || '', pct: target ? Math.round(actual * 100 / target) : 0 };
    }
    var ts = tasksOf(g), done = ts.filter(function (t) { return t.status === 'done'; }).length;
    return { mode: 'task', done: done, total: ts.length, unit: '', pct: ts.length ? Math.round(done * 100 / ts.length) : 0 };
  }
  function statusLine(p) {
    if (!p.total) return '<span class="muted">' + icon('sparkle', 'ic14') + (p.mode === 'number' ? 'Đặt target để bắt đầu' : 'Gắn việc để bắt đầu') + '</span>';
    var lv = LP.stats.level(p.pct);
    if (lv === 'ok') return '<span class="mt-lv mt-lv-ok">' + LP.flowers.html('sakura', 16, 1) + 'Đạt rồi, giỏi quá!</span>';
    if (lv === 'pr') return '<span class="mt-lv mt-lv-pr">' + icon('flag', 'ic14') + 'Sắp tới đích</span>';
    return '<span class="mt-lv mt-lv-warn">' + icon('alert', 'ic14') + 'Cần tăng tốc</span>';
  }
  function bar(pct) {
    var lv = LP.stats.level(pct), w = Math.max(0, Math.min(100, pct));
    return '<span class="bar14 mt-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.min(100, pct) + '" aria-label="Tiến độ ' + pct + '%">' +
      (w ? '<span class="b-' + (lv || 'warn') + ' mt-fill" style="width:' + w + '%"></span>' : '') + '</span>';
  }
  function daysLeft(g, today) {
    var n = D.diff(g.end_date, today);
    if (g.start_date && g.start_date > today) return 'Bắt đầu ' + D.fmt(g.start_date);
    return n > 0 ? 'Còn ' + n + ' ngày' : n === 0 ? 'Hết hạn hôm nay' : 'Quá hạn ' + (-n) + ' ngày';
  }

  /* ---------- Thẻ ---------- */
  function goalCard(g, today) {
    var p = progress(g), m = grp(g), f = LP.flowers.pick ? LP.flowers.pick(g.id) : null;
    var count = p.mode === 'number'
      ? icon('chart', 'ic14') + '<span class="mt-gcount"><span class="num">' + fmtN(p.done) + '/' + fmtN(p.total) + '</span>' + (p.unit ? ' ' + esc(p.unit) : '') + '</span>'
      : icon('check', 'ic14') + (p.total ? '<span class="mt-gcount"><span class="num">' + p.done + '/' + p.total + '</span> việc xong</span>' : '<span class="mt-gcount">Chưa có việc</span>');
    return '<button type="button" class="mt-goal mt-g-' + m.cls + '" data-goal="' + esc(g.id) + '" data-done="' + p.done + '" data-total="' + p.total + '" data-pct="' + p.pct + '">' +
      '<span class="mt-tape" aria-hidden="true"></span>' +
      (f && f.tone % 2 ? LP.flowers.html(f.name, 34, f.tone, 'mt-corner') : '') +
      '<span class="mt-grow"><span class="mt-sticker">' + icon(m.icon) + '</span><span class="mt-gmain">' +
      '<span class="mt-gname">' + esc(g.title) + '</span>' +
      '<span class="mt-meta"><span class="pill pill-note">' + esc(periodLabel(g.period_type, g.period_value)) + '</span>' +
      '<span class="mt-left">' + icon('clock', 'ic14') + esc(daysLeft(g, today)) + '</span>' + LP.ui.importance(g.importance) + '</span></span></span>' +
      bar(p.pct) +
      '<span class="mt-gfoot"><span class="mt-gc">' + count + '</span><span class="num mt-pct">' + p.pct + '%</span>' + statusLine(p) + '</span></button>';
  }

  function segBtns(name, opts, cur) {
    return '<div class="mt-switch" role="group" aria-label="' + name + '">' + opts.map(function (o) {
      return '<button type="button" data-' + name + '="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '" class="' + (cur === o[0] ? 'on' : '') + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }

  function renderGoals() {
    var today = D.today();
    var list = S().goals.filter(function (g) { return g.status !== 'cancelled' && (!filt.period || g.period_type === filt.period) && (!filt.group || g.group === filt.group); })
      .sort(function (a, b) { return (a.end_date < b.end_date ? -1 : a.end_date > b.end_date ? 1 : 0) || num(b.importance) - num(a.importance); });
    body.innerHTML = '<div class="mt-toolbar"><div class="mt-filters">' +
      segBtns('period', [['', 'Tất cả kỳ'], ['year', 'Năm'], ['quarter', 'Quý'], ['month', 'Tháng']], filt.period) +
      segBtns('group', [['', 'Mọi nhóm'], ['cong_viec', 'Công việc'], ['ca_nhan', 'Cá nhân']], filt.group) + '</div>' +
      '<button type="button" class="btn btn-primary" data-add>' + icon('plus') + 'Thêm mục tiêu</button></div>' +
      (list.length ? '<div class="mt-grid">' + list.map(function (g) { return goalCard(g, today); }).join('') + '</div>'
        : '<section class="card mt-empty">' + LP.flowers.html('daisy', 48, 2) + '<p>Chưa có mục tiêu nào ở bộ lọc này.</p></section>');
  }

  /* ---------- Form thêm / sửa ---------- */
  function goalForm(g) {
    var today = D.today(), isNew = !g;
    g = g || { title: '', group: 'cong_viec', period_type: 'month', period_value: currentValue('month', today), progress_mode: 'task', target: '', actual: '', unit: '', importance: 2, status: 'active' };
    function radios(name, opts, cur) {
      return '<div class="seg">' + opts.map(function (o, i) {
        return '<label><input type="radio" name="' + name + '" value="' + o[0] + '"' + (String(cur) === String(o[0]) ? ' checked' : '') + '><span>' + o[1] + '</span></label>';
      }).join('') + '</div>';
    }
    var linked = '';
    if (!isNew && g.progress_mode !== 'number') {
      var ts = tasksOf(g);
      linked = '<div class="field"><span>Việc gắn vào mục tiêu</span>' + (ts.length ? '<ul class="mt-linked">' + ts.map(function (t) {
        return '<li class="' + (t.status === 'done' ? 'is-done' : '') + '">' + icon(t.status === 'done' ? 'check' : 'list', 'ic14') + '<span>' + esc(t.title) + '</span></li>';
      }).join('') + '</ul>' : '<p class="muted">Chưa có việc nào. Chọn mục tiêu này khi thêm Ad-hoc hoặc Personal.</p>') + '</div>';
    }
    var html = '<form class="mt-form" novalidate>' +
      '<label class="field"><span>Tên mục tiêu</span><input class="input" name="title" maxlength="100" value="' + esc(g.title) + '" required></label>' +
      '<div class="field"><span>Nhóm</span>' + radios('group', [['cong_viec', 'Công việc'], ['ca_nhan', 'Cá nhân']], g.group) + '</div>' +
      '<div class="field"><span>Loại kỳ</span>' + radios('ptype', [['year', 'Năm'], ['quarter', 'Quý'], ['month', 'Tháng']], g.period_type) + '</div>' +
      '<label class="field"><span>Kỳ</span><select class="select" name="pvalue"></select></label>' +
      '<div class="field"><span>Quan trọng</span>' + radios('importance', [[1, LP.ui.importance(1)], [2, LP.ui.importance(2)], [3, LP.ui.importance(3)]], g.importance) + '</div>' +
      '<div class="field"><span>Cách tính tiến độ</span>' + radios('mode', [['task', 'Theo số việc xong'], ['number', 'Nhập số']], g.progress_mode) + '</div>' +
      '<div class="mt-numbers"><div class="row2"><label class="field"><span>Thực tế</span><input class="input" type="number" step="any" min="0" name="actual" value="' + esc(g.actual) + '"></label>' +
      '<label class="field"><span>Target</span><input class="input" type="number" step="any" min="0" name="target" value="' + esc(g.target) + '"></label></div>' +
      '<label class="field"><span>Đơn vị</span><input class="input" name="unit" maxlength="20" value="' + esc(g.unit) + '" placeholder="cuốn, km, dashboard…"></label></div>' +
      linked + '<p class="form-error" role="alert" hidden></p>' +
      '<div class="modal-foot">' + (isNew ? '' : '<button type="button" class="btn btn-danger" data-del>' + icon('trash') + 'Xóa</button>') +
      '<span class="spacer"></span><button type="button" class="btn" data-close>Hủy</button><button type="submit" class="btn btn-primary">' + icon('check') + 'Lưu</button></div></form>';
    var s = LP.ui.sheet(isNew ? 'Thêm mục tiêu' : 'Sửa mục tiêu', html), f = s.el.querySelector('form');
    function fillPeriods(keep) {
      var type = f.ptype.value, sel = f.pvalue, vals = periodOptions(type, today);
      if (keep && vals.indexOf(keep) < 0) vals.unshift(keep);
      sel.innerHTML = vals.map(function (v) { return '<option value="' + v + '">' + periodLabel(type, v) + '</option>'; }).join('');
      sel.value = keep && vals.indexOf(keep) >= 0 ? keep : currentValue(type, today);
    }
    function showNum() { s.el.querySelector('.mt-numbers').hidden = f.mode.value !== 'number'; }
    fillPeriods(g.period_type === f.ptype.value ? g.period_value : ''); showNum();
    f.addEventListener('change', function (e) {
      if (e.target.name === 'ptype') fillPeriods('');
      if (e.target.name === 'mode') showNum();
    });
    f.addEventListener('click', function (e) {
      if (!e.target.closest('[data-del]')) return;
      LP.ui.confirm('Xóa mục tiêu', 'Xóa "' + g.title + '"? Các việc gắn vào vẫn được giữ.', { ok: 'Xóa', danger: true }).then(function (y) {
        if (y) { LP.store.remove('Goals', g.id); s.close(); LP.ui.toast('Đã xóa mục tiêu.'); }
      });
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = f.querySelector('.form-error'), title = f.elements['title'].value.trim(), mode = f.mode.value;
      if (!title) { err.textContent = 'Nhập tên mục tiêu.'; err.hidden = false; return; }
      if (mode === 'number' && !(num(f.target.value) > 0)) { err.textContent = 'Nhập target lớn hơn 0.'; err.hidden = false; return; }
      var r = periodRange(f.ptype.value, f.pvalue.value);
      LP.store.upsert('Goals', Object.assign({}, g, {
        title: title, group: f.group.value, period_type: f.ptype.value, period_value: f.pvalue.value, start_date: r.from, end_date: r.to,
        progress_mode: mode, target: mode === 'number' ? f.target.value : '', actual: mode === 'number' ? (f.actual.value || '0') : '',
        unit: mode === 'number' ? f.unit.value.trim() : '', importance: f.importance.value, status: g.status || 'active'
      }));
      s.close(); LP.ui.toast(isNew ? 'Đã thêm mục tiêu.' : 'Đã lưu mục tiêu.');
    });
  }

  /* ---------- Màn ---------- */
  function renderTab(tab) {
    if (LP.thoiQuen) LP.thoiQuen.unmount();
    body = root.querySelector('.mt-body');
    root.querySelectorAll('[data-tab]').forEach(function (b) { var on = b.getAttribute('data-tab') === tab; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    if (tab === 'thoi-quen') { body.innerHTML = ''; LP.thoiQuen.mount(body); }
    else renderGoals();
    root.setAttribute('data-tab', tab);
  }

  function mount(el, params) {
    root = el;
    var tab = params && params.tab === 'thoi-quen' ? 'thoi-quen' : 'muc-tieu';
    el.innerHTML = '<section class="mt-page"><div class="page-head"><h1>' + (tab === 'thoi-quen' ? 'Thói quen' : 'Mục tiêu') + '</h1>' +
      '<div class="mt-switch mt-tabs" role="group" aria-label="Chọn phần"><button type="button" data-tab="muc-tieu">' + icon('target', 'ic14') + 'Mục tiêu</button>' +
      '<button type="button" data-tab="thoi-quen">' + icon('flame', 'ic14') + 'Thói quen</button></div></div><div class="mt-body"></div></section>';
    el.onclick = function (e) {
      var t = e.target.closest('[data-tab],[data-period],[data-group],[data-goal],[data-add]');
      if (!t || !body) return;
      if (t.hasAttribute('data-tab')) { LP.router.go('muc-tieu', t.getAttribute('data-tab') === 'thoi-quen' ? { tab: 'thoi-quen' } : {}); return; }
      if (root.getAttribute('data-tab') !== 'muc-tieu') return;
      if (t.hasAttribute('data-period')) { filt.period = t.getAttribute('data-period'); renderGoals(); }
      else if (t.hasAttribute('data-group')) { filt.group = t.getAttribute('data-group'); renderGoals(); }
      else if (t.hasAttribute('data-add')) goalForm();
      else if (t.hasAttribute('data-goal')) goalForm(S().goals.filter(function (g) { return g.id === t.getAttribute('data-goal'); })[0]);
    };
    onChange = function () { if (root && root.isConnected && root.getAttribute('data-tab') === 'muc-tieu') renderGoals(); };
    LP.store.on('change', onChange);
    renderTab(tab);
  }
  function unmount() {
    if (onChange) LP.store.off('change', onChange);
    if (LP.thoiQuen) LP.thoiQuen.unmount();
    if (root) root.onclick = null;
    root = null; body = null; onChange = null;
  }

  LP.router.register('muc-tieu', { title: 'Mục tiêu', mount: mount, unmount: unmount });
  return { progress: progress, periodRange: periodRange };
})();

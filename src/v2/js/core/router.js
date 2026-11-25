/* V2 · điều hướng theo dấu # (ví dụ #/agenda?date=2026-11-24). Mỗi màn đăng ký một lần:
     LP.router.register('agenda', { title: 'Agenda', mount: function (el, params) {...}, unmount: function () {...} });
   Tên route: agenda, lich, ghi-chu, muc-tieu, tong-ket, cai-dat, mau. Route chưa có màn thì hiện trang "Đang làm". */
var LP = window.LP || (window.LP = {});

LP.router = (function () {
  var views = {}, cur = null, handlers = {};
  var TITLES = { agenda: 'Agenda', lich: 'Lịch', 'ghi-chu': 'Ghi chú', 'muc-tieu': 'Mục tiêu', 'tong-ket': 'Tổng kết', 'cai-dat': 'Cài đặt', mau: 'Mẫu công việc' };
  var PHAN = { agenda: 'Phần 1', lich: 'Phần 2', 'ghi-chu': 'Phần 3', 'muc-tieu': 'Phần 4', 'tong-ket': 'Phần 4', 'cai-dat': 'Phần 5', mau: 'Phần 5' };

  function on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); }
  function emit(ev, data) { (handlers[ev] || []).slice().forEach(function (f) { try { f(data); } catch (e) { console.error(e); } }); }
  function register(name, def) { views[name] = def; if (cur && cur.name === name && cur.placeholder) render(); }

  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, ''), q = h.indexOf('?'), name = q < 0 ? h : h.slice(0, q), params = {};
    if (q >= 0) new URLSearchParams(h.slice(q + 1)).forEach(function (v, k) { params[k] = v; });
    if (LP.config.ROUTES.indexOf(name) < 0) name = 'agenda';
    return { name: name, params: params };
  }
  function build(name, params) {
    var q = new URLSearchParams(params || {}).toString();
    return '#/' + name + (q ? '?' + q : '');
  }
  function go(name, params) {
    var h = build(name, params);
    if (location.hash === h) render(); else location.hash = h;
  }

  function placeholder(el, name) {
    el.innerHTML = '<section class="card ph"><div class="ph-flower">' + LP.flowers.html('daisy', 56, 2) + '</div>' +
      '<h1>' + LP.ui.esc(TITLES[name]) + '</h1><p class="muted">Đang làm. ' + PHAN[name] + ' sẽ cắm màn này vào.</p></section>';
  }

  function render() {
    var el = document.getElementById('view');
    if (!el) return;
    var p = parseHash(), def = views[p.name];
    if (cur && cur.def && cur.def.unmount) { try { cur.def.unmount(); } catch (e) { console.error(e); } }
    el.innerHTML = '';
    el.setAttribute('data-route', p.name);
    cur = { name: p.name, params: p.params, def: def, placeholder: !def };
    document.title = ((def && def.title) || TITLES[p.name]) + ' · Life Planner';
    if (def) { try { def.mount(el, p.params); } catch (e) { console.error(e); el.innerHTML = '<section class="card"><p>Màn này gặp lỗi khi mở. Thử tải lại trang.</p></section>'; } }
    else placeholder(el, p.name);
    emit('route', { name: p.name, params: p.params });
    window.scrollTo(0, 0);
  }

  function start() {
    window.addEventListener('hashchange', render);
    render();
  }

  return { register: register, go: go, build: build, start: start, render: render, on: on, current: function () { return cur; }, TITLES: TITLES };
})();

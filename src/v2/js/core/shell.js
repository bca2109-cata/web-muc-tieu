/* V2 · khung ứng dụng: đầu trang, thanh tab, nút "+", tìm kiếm, thanh trạng thái lưu, service worker, khởi động.
   Màn hình khác cắm vào qua LP.router.register. Nút "+" gọi LP.quickAdd.open(kind) nếu Phần 5 đã định nghĩa,
   kind: 'adhoc' | 'canhan' | 'ghichu' | 'dotxuat'. Chưa có thì hiện thông báo "đang làm". */
var LP = window.LP || (window.LP = {});

LP.shell = (function () {
  var $ = function (id) { return document.getElementById(id); };

  function bindTabs() {
    LP.router.on('route', function (r) {
      var tabs = document.querySelectorAll('.tab');
      Array.prototype.forEach.call(tabs, function (t) {
        var on = t.getAttribute('data-route') === r.name;
        t.classList.toggle('is-active', on);
        if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
      });
      $('btn-settings').classList.toggle('is-active', r.name === 'cai-dat' || r.name === 'mau');
      closeFab();
    });
  }

  /* ---------- Nút "+" ---------- */
  function closeFab() { $('fab-menu').hidden = true; $('fab').setAttribute('aria-expanded', 'false'); }
  function bindFab() {
    var fab = $('fab'), menu = $('fab-menu');
    fab.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = menu.hidden;
      menu.hidden = !open; fab.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('[data-kind]');
      if (!b) return;
      closeFab();
      var kind = b.getAttribute('data-kind');
      if (LP.quickAdd && LP.quickAdd.open) LP.quickAdd.open(kind);
      else LP.ui.toast('Form thêm đang làm (Phần 5 sẽ nối vào).');
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('#fab-wrap')) closeFab(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeFab(); });
  }

  /* ---------- Ô giờ 24h: input[data-time] gõ 0930 hoặc 9:30 đều ra 09:30, không phụ thuộc cài đặt giờ của máy ---------- */
  function fmtTime(v, final) {
    var x = String(v).replace(/[^0-9:]/g, '').slice(0, 5);
    if (!final) return /^dd$/.test(x) ? x + ':' : x;
    var h, m, i = x.indexOf(':');
    if (i >= 0) { h = x.slice(0, i); m = x.slice(i + 1).replace(/:/g, ''); }
    else { var d = x; h = d.length > 2 ? d.slice(0, d.length - 2) : d; m = d.length > 2 ? d.slice(-2) : ''; }
    if (!h && !m) return '';
    return ('0' + h).slice(-2) + ':' + (m + '00').slice(0, 2);
  }
  function bindTimeFields() {
    document.addEventListener('input', function (e) {
      var t = e.target; if (!t || !t.matches || !t.matches('input[data-time]')) return;
      if (e.inputType && /^delete/.test(e.inputType)) return;
      var v = fmtTime(t.value, false); if (v !== t.value) t.value = v;
    });
    document.addEventListener('focusout', function (e) {
      var t = e.target; if (!t || !t.matches || !t.matches('input[data-time]') || !t.value) return;
      var v = fmtTime(t.value, true);
      if (v !== t.value) { t.value = v; t.dispatchEvent(new Event('change', { bubbles: true })); }
    });
  }

  /* ---------- Đầu trang dính: đo chiều cao để lưới Lịch và thanh công cụ Ghi chú dính ngay dưới nó; gọn lại khi cuộn xuống ---------- */
  function bindHeadSize() {
    var head = document.querySelector('.site-head'), root = document.documentElement;
    function size() { root.style.setProperty('--head-h', Math.round(head.getBoundingClientRect().height) + 'px'); }
    function scrolled() { var on = (window.pageYOffset || 0) > 40; if (root.classList.contains('is-scrolled') !== on) { root.classList.toggle('is-scrolled', on); size(); } }
    size(); scrolled();
    window.addEventListener('scroll', scrolled, { passive: true });
    window.addEventListener('resize', size);
    if (window.ResizeObserver) new ResizeObserver(size).observe(head);
  }

  /* ---------- Trạng thái lưu ---------- */
  function bindSync() {
    var el = $('sync');
    function paint(s) {
      el.classList.toggle('is-error', !!(s && s.error));
      if (LP.config.mock && !s.pending && !s.error) { el.innerHTML = LP.ui.icon('cloudoff', 'ic14') + 'Trên trình duyệt'; return; }
      if (s.error) el.innerHTML = LP.ui.icon('cloudoff', 'ic14') + 'Chưa lưu được';
      else if (s.pending) el.innerHTML = LP.ui.icon('refresh', 'ic14') + 'Đang lưu…';
      else el.innerHTML = LP.ui.icon('cloud', 'ic14') + 'Đã lưu';
    }
    LP.store.on('sync', paint);
    paint({ pending: 0, error: null });
  }

  /* ---------- Thanh "Có bản mới": góc dưới trái, có nút ×, tự ẩn sau 15 giây, tắt rồi thì không hiện lại trong phiên ---------- */
  var updTimer = null;
  function hideUpdateBar(remember) {
    $('update-bar').hidden = true; if (updTimer) { clearTimeout(updTimer); updTimer = null; }
    if (remember) { try { sessionStorage.setItem('lpv2_update_off', '1'); } catch (e) { /* bỏ qua */ } }
  }
  function showUpdateBar() {
    try { if (sessionStorage.getItem('lpv2_update_off')) return; } catch (e) { /* bỏ qua */ }
    $('update-bar').hidden = false;
    updTimer = setTimeout(function () { hideUpdateBar(true); }, 15000);
  }
  function bindUpdateBar() { $('update-close').addEventListener('click', function () { hideUpdateBar(true); }); }

  /* ---------- Service worker: network-first cho HTML, có thanh "Có bản mới, Tải lại" (giữ cách làm GĐ8) ---------- */
  function bindSW() {
    if (!('serviceWorker' in navigator) || !(location.protocol === 'https:' || location.hostname === 'localhost')) return;
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) {
      function check() { try { reg.update().catch(function () { /* bỏ qua */ }); } catch (e) { /* bỏ qua */ } }
      document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
      setInterval(check, 30 * 60 * 1000);
    }).catch(function () { /* không có cũng vẫn dùng được */ });
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (hadController) showUpdateBar(); });
  }

  /* ---------- Lỗi tải: nhập mã bí mật hoặc thử lại ---------- */
  function showLoadError(err) {
    var view = $('view'), needToken = err && (err.code === 'NO_TOKEN' || err.code === 'BAD_TOKEN');
    view.innerHTML = '<section class="card connect"><h1>' + (needToken ? 'Kết nối Google Sheet' : 'Chưa tải được dữ liệu') + '</h1>' +
      '<p class="muted">' + LP.ui.esc(needToken ? (err.code === 'BAD_TOKEN' ? 'Mã bí mật chưa đúng. Nhập lại nhé.' : 'Nhập mã bí mật một lần trên thiết bị này.') : (err && err.message) || 'Lỗi không rõ') + '</p>' +
      (needToken ? '<label class="field"><span>Mã bí mật</span><input class="input" id="tok" type="password" autocomplete="off"></label>' +
        '<button type="button" class="btn btn-primary" id="tok-save">Lưu và kết nối</button>' :
        '<button type="button" class="btn btn-primary" id="retry">Thử lại</button>') + '</section>';
    var save = $('tok-save'), retry = $('retry');
    if (save) save.addEventListener('click', function () { var v = $('tok').value.trim(); if (v) { LP.settings.setToken(v); location.reload(); } });
    if (retry) retry.addEventListener('click', function () { location.reload(); });
  }

  function boot() {
    LP.flowers.install(); LP.flowers.applyBg(); LP.theme.apply();
    if (LP.config.mock) $('banner').hidden = false;
    bindTabs(); bindFab(); bindSync(); bindSW(); bindUpdateBar(); bindTimeFields();
    $('btn-search').addEventListener('click', function () { LP.search.open(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName) && !(document.activeElement || {}).isContentEditable) { e.preventDefault(); LP.search.open(); }
    });
    window.addEventListener('error', function (e) { (LP._errors = LP._errors || []).push(String(e.message)); });
    bindHeadSize();
    var hit = LP.store.loadCached();   // có bản lưu lần trước thì hiện ngay, rồi cập nhật khi Sheet trả về
    if (hit) { LP.ready = true; LP.router.start(); }
    LP.store.load().then(function () {
      if (!hit) { LP.ready = true; LP.router.start(); return; }
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName);
      if (LP.store.changedSinceCache() && !document.querySelector('.overlay') && !typing) LP.router.render();
    }, function (err) {
      var auth = err && (err.code === 'NO_TOKEN' || err.code === 'BAD_TOKEN');
      if (!hit || auth) showLoadError(err); else LP.ui.toast('Chưa cập nhật được dữ liệu mới, đang hiện bản đã lưu.');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  return { closeFab: closeFab };
})();

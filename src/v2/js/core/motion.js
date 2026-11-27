/* V2 · Chuyển động (Đợt 4): khối trồi lên khi đổi màn, hoa nhỏ bung ra khi tick xong. Không đụng dữ liệu. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Câu chúc mừng khi hoàn thành việc (hiện cả khi máy bật giảm chuyển động) */
  var PRAISE = [
    'Tuyệt vời! Thêm một bước gần mục tiêu rồi.', 'Giỏi quá! Cứ thế phát huy nhé.', 'Làm được rồi, bạn thật đáng tự hào!',
    'Từng việc nhỏ làm nên điều lớn. Cố lên!', 'Quá xuất sắc! Hãy tự thưởng cho mình một nụ cười.', 'Một việc xong, một niềm vui mới.',
    'Bạn đang làm rất tốt, đừng dừng lại nhé!', 'Chăm chỉ như vậy, thành công sẽ đến thôi.', 'Hoàn thành rồi! Bạn mạnh mẽ hơn bạn nghĩ.',
    'Yêu thương bản thân, và cứ tiến lên nhé!'
  ], lastPraise = -1, praiseEl = null, praiseTimer = null;
  function praise(x, y) {
    var i; do { i = Math.floor(Math.random() * PRAISE.length); } while (i === lastPraise && PRAISE.length > 1);
    lastPraise = i;
    if (praiseEl) praiseEl.remove();
    clearTimeout(praiseTimer);
    praiseEl = document.createElement('div');
    praiseEl.className = 'lp-praise';
    praiseEl.setAttribute('role', 'status');
    praiseEl.textContent = PRAISE[i];
    document.body.appendChild(praiseEl);
    var w = praiseEl.offsetWidth, vw = document.documentElement.clientWidth;
    praiseEl.style.left = Math.max(8, Math.min(vw - w - 8, x - w / 2)) + 'px';
    praiseEl.style.top = Math.max(8, y - 64) + 'px';
    var el = praiseEl;
    praiseTimer = setTimeout(function () { el.remove(); if (praiseEl === el) praiseEl = null; }, 2600);
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.tick');
    if (!t || t.disabled || t.getAttribute('aria-pressed') === 'true') return;
    var r = t.getBoundingClientRect();
    praise(r.left + r.width / 2, r.top);
  }, true);

  if (reduce) return;
  var view = null, lastRoute = null, timer = null;

  function route() { return (location.hash || '#/agenda').split('?')[0]; }
  function enter() {
    view = view || document.getElementById('view');
    if (!view) return;
    view.classList.remove('lp-enter');
    void view.offsetWidth;
    view.classList.add('lp-enter');
    clearTimeout(timer);
    timer = setTimeout(function () { view.classList.remove('lp-enter'); }, 1400);
  }
  function onRoute() { var r = route(); if (r !== lastRoute) { lastRoute = r; requestAnimationFrame(function () { requestAnimationFrame(enter); }); } }
  window.addEventListener('hashchange', onRoute);
  window.addEventListener('DOMContentLoaded', function () { setTimeout(onRoute, 60); });

  var COLORS = ['var(--petal-1)', 'var(--petal-3)', 'var(--petal-4)', 'var(--petal-10)', 'var(--petal-6)', 'var(--accent)'];
  function burst(x, y) {
    var b = document.createElement('div'), n = 10, h = '';
    b.className = 'lp-burst';
    b.style.left = x + 'px'; b.style.top = y + 'px';
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n + Math.random() * 0.4, d = 26 + Math.random() * 18;
      h += '<i style="--c:' + COLORS[i % COLORS.length] + ';--x:' + (Math.cos(a) * d).toFixed(1) + 'px;--y:' + (Math.sin(a) * d).toFixed(1) +
        'px;--r:' + Math.round(Math.random() * 360) + 'deg"></i>';
    }
    b.innerHTML = h;
    document.body.appendChild(b);
    setTimeout(function () { b.remove(); }, 800);
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.tick');
    if (!t || t.disabled || t.getAttribute('aria-pressed') === 'true') return;
    var r = t.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2);
  }, true);
})();

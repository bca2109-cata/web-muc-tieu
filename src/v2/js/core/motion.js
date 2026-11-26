/* V2 · Chuyển động (Đợt 4): khối trồi lên khi đổi màn, hoa nhỏ bung ra khi tick xong. Không đụng dữ liệu. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

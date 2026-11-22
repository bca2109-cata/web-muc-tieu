/* Hoa trang trí: 12 loại vẽ SVG, hình nền hoa rơi, hiệu ứng hoa bung khi xong việc.
   Cánh hoa lấy màu theo `color` của thẻ svg. Nhụy và lá có màu cố định (một phần của hình vẽ). */
var App = window.App || (window.App = {});

App.flowers = (function () {
  var NAMES = ['daisy', 'sakura', 'tulip', 'rose', 'sunflower', 'lavender', 'forget', 'plumeria', 'cosmos', 'bell', 'hydrangea', 'sprig'];
  // Màu cánh hoa: lấy từ biến CSS --petal-1 … --petal-9
  var PETALS = 9;
  // Hình nền dùng thêm 4 màu: --petal-10 … --petal-13
  var BG_TONES = 13;
  var LEAF = '#3fae7a', LEAF2 = '#7fd1a8', CORE = '#ffd56b';

  function ring(shape, n, step) {
    var out = '';
    for (var i = 0; i < n; i++) out += shape.replace('/>', ' transform="rotate(' + (i * step) + ' 12 12)"/>');
    return out;
  }

  var DEFS =
    '<symbol id="f-daisy" viewBox="0 0 24 24"><g fill="currentColor">' + ring('<ellipse cx="12" cy="5.5" rx="3" ry="4"/>', 6, 60) + '</g>' +
    '<circle cx="12" cy="12" r="3.4" fill="' + CORE + '" stroke="#f2a33a"/></symbol>' +
    '<symbol id="f-sakura" viewBox="0 0 24 24"><g fill="currentColor">' + ring('<path d="M12 12C9 9.5 8.6 4.5 10.6 3.2L12 4.8l1.4-1.6C15.4 4.5 15 9.5 12 12z"/>', 5, 72) + '</g>' +
    '<circle cx="12" cy="12" r="1.8" fill="#fff" opacity=".9"/></symbol>' +
    '<symbol id="f-tulip" viewBox="0 0 24 24"><path d="M12 13v9" stroke="' + LEAF + '" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M12 19c-3 0-5-2-5.5-4 2.5 0 4.5 1.5 5.5 4zM12 18c2.5-.3 4.3-2 4.8-3.6-2.3 0-4.2 1.3-4.8 3.6z" fill="' + LEAF2 + '"/>' +
    '<path d="M7 4.5l2.5 3 2.5-4 2.5 4 2.5-3V9a5 5 0 0 1-10 0z" fill="currentColor"/></symbol>' +
    '<symbol id="f-rose" viewBox="0 0 24 24"><path d="M6 18c1-2.5 3-3 5-2.6M18 18c-1-2.5-3-3-5-2.6" stroke="' + LEAF + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="7.5" cy="18.5" rx="3" ry="1.5" fill="' + LEAF2 + '" transform="rotate(-25 7.5 18.5)"/><ellipse cx="16.5" cy="18.5" rx="3" ry="1.5" fill="' + LEAF2 + '" transform="rotate(25 16.5 18.5)"/>' +
    '<circle cx="12" cy="10.5" r="7.5" fill="currentColor"/>' +
    '<path d="M12 10.5c1.4-.9 2.8 0 2.3 1.5s-3.3 2.4-4.6.7.4-5 3.3-4.8 4.4 3 3.2 5.6" stroke="#3b2235" stroke-opacity=".28" stroke-width="1.3" fill="none" stroke-linecap="round"/></symbol>' +
    '<symbol id="f-sunflower" viewBox="0 0 24 24"><g fill="currentColor">' + ring('<ellipse cx="12" cy="4.6" rx="2" ry="3.8"/>', 12, 30) + '</g>' +
    '<circle cx="12" cy="12" r="4.4" fill="#8a5a2b"/><g fill="#5e3a17"><circle cx="10.6" cy="11" r=".7"/><circle cx="13.2" cy="10.8" r=".7"/><circle cx="12" cy="13.2" r=".7"/></g></symbol>' +
    '<symbol id="f-lavender" viewBox="0 0 24 24"><path d="M12 22V7" stroke="' + LEAF + '" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M12 19c-2.5-.5-4-2-4.4-3.6 2.2.2 3.8 1.5 4.4 3.6z" fill="' + LEAF2 + '"/><g fill="currentColor"><ellipse cx="12" cy="3" rx="1.4" ry="2"/>' +
    '<ellipse cx="10.3" cy="6" rx="1.5" ry="2" transform="rotate(-20 10.3 6)"/><ellipse cx="13.7" cy="6" rx="1.5" ry="2" transform="rotate(20 13.7 6)"/>' +
    '<ellipse cx="10.1" cy="9.4" rx="1.6" ry="2.1" transform="rotate(-20 10.1 9.4)"/><ellipse cx="13.9" cy="9.4" rx="1.6" ry="2.1" transform="rotate(20 13.9 9.4)"/>' +
    '<ellipse cx="10.3" cy="12.8" rx="1.5" ry="2" transform="rotate(-20 10.3 12.8)"/><ellipse cx="13.7" cy="12.8" rx="1.5" ry="2" transform="rotate(20 13.7 12.8)"/></g></symbol>' +
    '<symbol id="f-forget" viewBox="0 0 24 24"><g fill="currentColor"><circle cx="12" cy="7" r="4"/><circle cx="16.8" cy="10.5" r="4"/><circle cx="14.9" cy="16.1" r="4"/><circle cx="9.1" cy="16.1" r="4"/><circle cx="7.2" cy="10.5" r="4"/></g>' +
    '<circle cx="12" cy="12" r="2.4" fill="#fff"/><circle cx="12" cy="12" r="1.3" fill="#ffcf3a"/></symbol>' +
    '<symbol id="f-plumeria" viewBox="0 0 24 24"><g fill="currentColor">' + ring('<path d="M12 12C10.5 8 11 3 14.5 2.6c2.4 1.6 1 6.3-2.5 9.4z"/>', 5, 72) + '</g>' +
    '<circle cx="12" cy="12" r="3" fill="' + CORE + '"/></symbol>' +
    '<symbol id="f-cosmos" viewBox="0 0 24 24"><g fill="currentColor">' + ring('<path d="M12 12C10 9 10 4 10.8 2.8L12 4l1.2-1.2C14 4 14 9 12 12z"/>', 8, 45) + '</g>' +
    '<circle cx="12" cy="12" r="2.4" fill="#ffcf3a" stroke="#e8a317" stroke-width=".8"/></symbol>' +
    '<symbol id="f-bell" viewBox="0 0 24 24"><path d="M4 4c5 0 9 3 10 9M10 6.5c3 1 4.5 4 4 8M14 13c3-1 5 0 6 2" stroke="' + LEAF + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
    '<g fill="currentColor"><path d="M7 7.5c-2 0-3 1.8-3 4.3l1-.6.9 1 1-.9 1 .9.9-1 1 .6c0-2.5-1-4.3-2.8-4.3z"/><path d="M14 14.4c-1.8 0-2.8 1.6-2.8 3.8l.9-.5.9.9.9-.8.9.8.9-.9.9.5c0-2.2-1-3.8-2.6-3.8z"/>' +
    '<path d="M20 15.2c-1.4 0-2.2 1.3-2.2 3l.7-.4.75.7.75-.7.7.4c0-1.7-.8-3-2-3z" opacity=".9"/></g></symbol>' +
    '<symbol id="f-hydrangea" viewBox="0 0 24 24"><g fill="currentColor"><circle cx="12" cy="6" r="3.6"/><circle cx="7" cy="9.5" r="3.6"/><circle cx="17" cy="9.5" r="3.6"/><circle cx="12" cy="12" r="3.6"/><circle cx="8" cy="15.5" r="3.6"/><circle cx="16" cy="15.5" r="3.6"/><circle cx="12" cy="18.5" r="3.3"/></g>' +
    '<g fill="#fff" opacity=".75"><circle cx="12" cy="6" r=".9"/><circle cx="7" cy="9.5" r=".9"/><circle cx="17" cy="9.5" r=".9"/><circle cx="12" cy="12" r=".9"/><circle cx="8" cy="15.5" r=".9"/><circle cx="16" cy="15.5" r=".9"/><circle cx="12" cy="18.5" r=".9"/></g></symbol>' +
    '<symbol id="f-sprig" viewBox="0 0 24 24"><path d="M4 20C9 15 14 10 20 4" stroke="' + LEAF + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<g fill="#a6e3c4"><ellipse cx="9" cy="13" rx="3.2" ry="1.6" transform="rotate(-60 9 13)"/><ellipse cx="13" cy="9.5" rx="3.2" ry="1.6" transform="rotate(30 13 9.5)"/>' +
    '<ellipse cx="15.5" cy="6" rx="3" ry="1.5" transform="rotate(-60 15.5 6)"/><ellipse cx="8" cy="17.5" rx="3" ry="1.5" transform="rotate(30 8 17.5)"/></g></symbol>';

  function install() {
    if (document.getElementById('flower-defs')) return;
    var holder = document.createElement('div');
    holder.innerHTML = '<svg id="flower-defs" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' + DEFS + '</defs></svg>';
    document.body.insertBefore(holder.firstChild, document.body.firstChild);
  }

  // Một bông hoa. tone: số 1…9 (màu cánh), cls: lớp CSS thêm
  function html(name, size, tone, cls, style) {
    return '<svg class="flower ' + (cls || '') + '" width="' + size + '" height="' + size + '" aria-hidden="true" focusable="false" ' +
      'style="color:var(--petal-' + (tone || 1) + ');' + (style || '') + '"><use href="#f-' + name + '"/></svg>';
  }

  // Chọn hoa cố định theo một chuỗi (ví dụ id), để mỗi lần vẽ lại không đổi
  function pick(key) {
    var h = 0, s = String(key || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return { name: NAMES[h % 11], tone: 1 + (h >>> 4) % PETALS };
  }

  /* ---------- Hình nền ---------- */
  var BG_KEY = 'lp_bg';
  function getBg() {
    try { return localStorage.getItem(BG_KEY) === 'plain' ? 'plain' : 'flowers'; } catch (e) { return 'flowers'; }
  }
  function setBg(mode) {
    try { localStorage.setItem(BG_KEY, mode); } catch (e) { /* không lưu được thì chỉ đổi tạm */ }
    applyBg();
  }
  function applyBg() {
    var mode = getBg();
    document.documentElement.setAttribute('data-bg', mode);
    var layer = document.getElementById('bg-flowers');
    if (mode === 'flowers' && layer && !layer.childNodes.length) {
      /* Hoa rơi (GĐ5): 46 bông, 13 màu, rơi từ trên xuống rồi lặp lại, vừa rơi vừa đung đưa.
         Vị trí cố định theo hạt giống. Máy bật "giảm chuyển động" thì hoa đứng yên tại chỗ (CSS). */
      var seed = 7, rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }, out = '';
      for (var i = 0; i < 46; i++) {
        var size = 20 + Math.round(rnd() * 38), top = Math.round(rnd() * 96), dur = 16 + rnd() * 18;
        out += '<span class="fall" style="left:' + (rnd() * 98).toFixed(1) + '%;top:' + top + 'vh;--from:' + (-top - 12) + 'vh;--to:' + (108 - top) + 'vh;' +
          '--fd:' + dur.toFixed(1) + 's;--fdl:-' + (rnd() * dur).toFixed(1) + 's">' +
          html(NAMES[i % 11], size, 1 + i % BG_TONES, '', '--d:' + (4 + rnd() * 5).toFixed(1) + 's;--dl:-' + (rnd() * 6).toFixed(1) + 's') + '</span>';
      }
      layer.innerHTML = out;
    }
  }

  /* ---------- Ăn mừng ---------- */
  function reduced() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }

  function burst(x, y, big) {
    if (reduced() || !document.body.animate) return;
    var n = big ? 56 : 32;
    for (var i = 0; i < n; i++) {
      var size = (big ? 22 : 18) + Math.random() * (big ? 28 : 22);
      var wrap = document.createElement('div');
      wrap.innerHTML = html(NAMES[Math.floor(Math.random() * 11)], Math.round(size), 1 + Math.floor(Math.random() * PETALS), 'fx');
      var el = wrap.firstChild;
      document.body.appendChild(el);
      var a = Math.random() * Math.PI * 2, dist = (big ? 120 : 60) + Math.random() * (big ? 220 : 110);
      var dx = Math.cos(a) * dist, dy = Math.sin(a) * dist - (big ? 80 : 50), rot = (Math.random() - 0.5) * 540;
      var x0 = x - size / 2, y0 = y - size / 2;
      var anim = el.animate([
        { transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(.1) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + (x0 + dx) + 'px,' + (y0 + dy) + 'px) scale(1) rotate(' + rot / 2 + 'deg)', opacity: 1, offset: 0.45 },
        { transform: 'translate(' + (x0 + dx * 1.15) + 'px,' + (y0 + dy + (big ? 220 : 130)) + 'px) scale(.85) rotate(' + rot + 'deg)', opacity: 0 }
      ], { duration: (big ? 2000 : 1400) + Math.random() * 700, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'forwards' });
      anim.onfinish = (function (node) { return function () { node.remove(); }; })(el);
    }
  }

  var CHEERS = ['Giỏi quá! Thêm một việc xong rồi.', 'Tuyệt vời, cứ đà này nhé!', 'Một bông hoa nữa nở rồi nè.',
    'Xong rồi! Nghỉ chút rồi làm tiếp nha.', 'Bạn làm tốt lắm!'];
  function cheerText() { return CHEERS[Math.floor(Math.random() * CHEERS.length)]; }

  return { NAMES: NAMES, install: install, html: html, pick: pick, getBg: getBg, setBg: setBg, applyBg: applyBg, burst: burst, cheerText: cheerText };
})();

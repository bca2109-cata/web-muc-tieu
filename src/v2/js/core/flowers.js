/* V2 · lấy lại từ web cũ (src/js/flowers.js), đổi không gian tên App thành LP. Hoa trang trí: 12 loại vẽ SVG, hình nền hoa rơi, hiệu ứng hoa bung khi xong việc.
   Cánh hoa lấy màu theo `color` của thẻ svg. Nhụy và lá có màu cố định (một phần của hình vẽ). */
var LP = window.LP || (window.LP = {});

LP.flowers = (function () {
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


  /* ---------- Hoa vẽ lại (27/11): cánh chồng lớp, đổ bóng nhẹ, gân cánh, nhụy có chi tiết ----------
     Màu cánh vẫn theo `color`. Đổ bóng bằng lớp phủ đen/trắng trong suốt nên màu nào cũng đẹp. */
  var SH = 'url(#fl-sh)', HI = 'url(#fl-hi)';
  function layer(shape, n, step, off) {   // một vòng cánh: màu + bóng + vệt sáng
    var a = '';
    for (var i = 0; i < n; i++) a += shape.replace('/>', ' transform="rotate(' + ((off || 0) + i * step) + ' 12 12)"/>');
    return '<g fill="currentColor">' + a + '</g><g fill="' + SH + '">' + a + '</g><g fill="' + HI + '">' + a + '</g>';
  }
  function veins(d, n, step, off) {
    var o = '';
    for (var i = 0; i < n; i++) o += '<path d="' + d + '" transform="rotate(' + ((off || 0) + i * step) + ' 12 12)"/>';
    return '<g fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".5" stroke-linecap="round">' + o + '</g>';
  }
  function seeds() {   // hạt hướng dương xếp xoắn ốc (góc vàng)
    var o = '';
    for (var i = 1; i < 34; i++) {
      var r = 0.62 * Math.sqrt(i), a = i * 2.39996;
      o += '<circle cx="' + (12 + r * Math.cos(a)).toFixed(2) + '" cy="' + (12 + r * Math.sin(a)).toFixed(2) + '" r=".5"/>';
    }
    return '<g fill="#4a2c10" opacity=".7">' + o + '</g>';
  }
  function stamens(n, r, color, dot) {
    var l = '', d = '';
    for (var i = 0; i < n; i++) {
      var a = i * 2 * Math.PI / n, x = (12 + r * Math.sin(a)).toFixed(2), y = (12 - r * Math.cos(a)).toFixed(2);
      l += '<path d="M12 12L' + x + ' ' + y + '"/>'; d += '<circle cx="' + x + '" cy="' + y + '" r=".55"/>';
    }
    return '<g stroke="' + color + '" stroke-width=".55" stroke-linecap="round">' + l + '</g><g fill="' + dot + '">' + d + '</g>';
  }
  function ringC(r, rad, n, cy) {
    var o = '';
    for (var i = 0; i < n; i++) { var a = i * 2 * Math.PI / n; o += '<circle cx="' + (12 + rad * Math.sin(a)).toFixed(2) + '" cy="' + (cy - rad * Math.cos(a)).toFixed(2) + '" r="' + r + '"/>'; }
    return o;
  }
  var GRAD =
    '<radialGradient id="fl-sh" cx=".5" cy=".62" r=".62"><stop offset=".35" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3b0f25" stop-opacity=".2"/></radialGradient>' +
    '<linearGradient id="fl-hi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '<radialGradient id="fl-core" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#fff3a8"/><stop offset=".55" stop-color="#ffc83d"/><stop offset="1" stop-color="#e8890f"/></radialGradient>' +
    '<radialGradient id="fl-seed" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#b07a3c"/><stop offset="1" stop-color="#5a3512"/></radialGradient>' +
    '<radialGradient id="fl-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe98a" stop-opacity=".95"/><stop offset="1" stop-color="#ffe98a" stop-opacity="0"/></radialGradient>';
  var TP = ['M6.3 4.6C5.4 8.8 6.2 13 9.7 14.2 9.4 10.6 9.8 7.2 11.4 4.4 9.6 3.9 7.7 3.9 6.3 4.6z', 'M17.7 4.6c.9 4.2.1 8.4-3.4 9.6.3-3.6-.1-7 1.5-9.8 1.8-.5 3.7-.5 1.9.2z', 'M12 2.6c-3 3-3.6 7.2-2.6 10.8 1.1 1.6 4.1 1.6 5.2 0 1-3.6.4-7.8-2.6-10.8z'];
  var NEWF =
    '<symbol id="f-daisy" viewBox="0 0 24 24"><g opacity=".8">' + layer('<ellipse cx="12" cy="4.6" rx="1.7" ry="4.4"/>', 12, 30, 15) + '</g>' +
    layer('<ellipse cx="12" cy="4.9" rx="1.9" ry="4.4"/>', 12, 30, 0) + veins('M12 8.5V3.6', 12, 30, 0) +
    '<circle cx="12" cy="12" r="3.5" fill="url(#fl-core)"/><circle cx="12" cy="12" r="3.5" fill="none" stroke="#c9740a" stroke-opacity=".55" stroke-width=".5"/>' +
    '<g fill="#b8620a" opacity=".6"><circle cx="11" cy="11" r=".35"/><circle cx="13" cy="11.4" r=".35"/><circle cx="12" cy="13" r=".35"/><circle cx="10.6" cy="12.6" r=".3"/><circle cx="13.3" cy="13" r=".3"/></g></symbol>' +
    '<symbol id="f-sakura" viewBox="0 0 24 24">' + layer('<path d="M12 12C8.6 9.6 7.8 4.6 9.9 2.9L12 4.7l2.1-1.8c2.1 1.7 1.3 6.7-2.1 9.1z"/>', 5, 72, 0) +
    veins('M12 11V5.6', 5, 72, 0) + '<circle cx="12" cy="12" r="2.2" fill="url(#fl-glow)"/>' + stamens(7, 3.3, '#e2527f', '#ffd25a') + '</symbol>' +
    '<symbol id="f-tulip" viewBox="0 0 24 24"><path d="M12 13.5v8.5" stroke="' + LEAF + '" stroke-width="1.9" stroke-linecap="round"/>' +
    '<path d="M12 21c-4.4.4-6.4-2.6-6.6-6.4 3.6.4 5.8 2.8 6.6 6.4z" fill="' + LEAF2 + '"/><path d="M12 20c3.6-.1 5.6-2.4 6-5.6-3.2.1-5.3 2.2-6 5.6z" fill="' + LEAF + '"/>' +
    '<g fill="currentColor"><path d="' + TP[0] + '"/><path d="' + TP[1] + '"/></g><g fill="' + SH + '"><path d="' + TP[0] + '"/><path d="' + TP[1] + '"/></g>' +
    '<path d="' + TP[2] + '" fill="currentColor"/><path d="' + TP[2] + '" fill="' + HI + '"/>' +
    '<path d="M12 4.5c-.9 2.6-1 5.3-.6 8" stroke="#fff" stroke-opacity=".5" stroke-width=".6" fill="none" stroke-linecap="round"/></symbol>' +
    '<symbol id="f-rose" viewBox="0 0 24 24"><path d="M5.2 19c1.2-2.6 3.4-3.3 5.8-2.8M18.8 19c-1.2-2.6-3.4-3.3-5.8-2.8" stroke="' + LEAF + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="7" cy="19" rx="3.3" ry="1.6" fill="' + LEAF2 + '" transform="rotate(-24 7 19)"/><ellipse cx="17" cy="19" rx="3.3" ry="1.6" fill="' + LEAF2 + '" transform="rotate(24 17 19)"/>' +
    '<g fill="currentColor">' + ringC(3.4, 5.1, 6, 10.5) + '<circle cx="12" cy="10.5" r="5.6"/></g><g fill="' + SH + '">' + ringC(3.4, 5.1, 6, 10.5) + '</g>' +
    '<g fill="none" stroke="#3b0f25" stroke-opacity=".32" stroke-width=".8" stroke-linecap="round"><path d="M12 10.5c1.2-.8 2.4 0 2 1.3s-2.8 2-3.9.6.3-4.2 2.8-4 3.7 2.6 2.6 4.8"/><path d="M7.2 8.2c1-2 3-3.1 5-3.1M16.9 8c-.4-1.6-1.4-2.5-2.6-3"/></g>' +
    '<path d="M8.4 6.2c1.4-1.3 3.2-1.8 4.6-1.5" stroke="#fff" stroke-opacity=".6" stroke-width=".9" fill="none" stroke-linecap="round"/></symbol>' +
    '<symbol id="f-sunflower" viewBox="0 0 24 24"><g opacity=".85">' + layer('<ellipse cx="12" cy="4.2" rx="1.7" ry="4"/>', 14, 25.7, 12.8) + '</g>' +
    layer('<ellipse cx="12" cy="4.6" rx="1.8" ry="4"/>', 14, 25.7, 0) + veins('M12 8V3', 14, 25.7, 0) +
    '<circle cx="12" cy="12" r="4.6" fill="url(#fl-seed)"/><circle cx="12" cy="12" r="4.6" fill="none" stroke="#3a210a" stroke-opacity=".5" stroke-width=".6"/>' + seeds() + '</symbol>' +
    '<symbol id="f-forget" viewBox="0 0 24 24">' + layer('<circle cx="12" cy="6.8" r="3.9"/>', 5, 72, 0) +
    '<circle cx="12" cy="12" r="2.6" fill="#fff"/><circle cx="12" cy="12" r="2.6" fill="url(#fl-glow)"/><circle cx="12" cy="12" r="1.25" fill="#ffc83d"/><circle cx="11.6" cy="11.6" r=".4" fill="#fff" opacity=".8"/></symbol>' +
    '<symbol id="f-plumeria" viewBox="0 0 24 24">' + layer('<path d="M12 12C10.2 8.2 10.8 3.2 14.6 2.5c2.6 1.7 1 6.6-2.6 9.5z"/>', 5, 72, 0) +
    veins('M12 11C12.3 8.6 13 5.6 14 3.6', 5, 72, 0) + '<circle cx="12" cy="12" r="4.2" fill="url(#fl-glow)"/><circle cx="12" cy="12" r="1.3" fill="#ffd25a"/></symbol>' +
    '<symbol id="f-cosmos" viewBox="0 0 24 24">' + layer('<path d="M12 12C9 9.3 8.6 4.8 9.4 2.4q.9 1 1.3.1l1.3 1.4 1.3-1.4q.4.9 1.3-.1c.8 2.4.4 6.9-2.6 9.6z"/>', 8, 45, 0) +
    veins('M12 10.5V4.2', 8, 45, 0) + '<circle cx="12" cy="12" r="2.5" fill="url(#fl-core)"/><circle cx="12" cy="12" r="2.5" fill="none" stroke="#c9740a" stroke-opacity=".5" stroke-width=".5"/></symbol>' +
    '<symbol id="f-hydrangea" viewBox="0 0 24 24">' + [[12, 5.2], [7.2, 8.2], [16.8, 8.2], [12, 11.2], [6.6, 13.8], [17.4, 13.8], [9.4, 17.2], [14.6, 17.2], [12, 20]].map(function (c, k) {
      var fl = [0, 1, 2, 3].map(function (i) { return '<ellipse cx="' + c[0] + '" cy="' + (c[1] - 1.5) + '" rx="1.35" ry="1.7" transform="rotate(' + (i * 90 + k * 17) + ' ' + c[0] + ' ' + c[1] + ')"/>'; }).join('');
      return '<g fill="currentColor" opacity="' + (k % 3 === 1 ? '.88' : '1') + '">' + fl + '</g><g fill="' + SH + '">' + fl + '</g><circle cx="' + c[0] + '" cy="' + c[1] + '" r=".75" fill="#fff6c9"/>';
    }).join('') + '</symbol>';

  var NEWF2 =
    '<symbol id="f-heart" viewBox="0 0 24 24"><path d="M12 21.5C2.5 15.2 1.5 7.4 6.8 5.8c2.3-.7 4.2.7 5.2 2.3 1-1.6 2.9-3 5.2-2.3 5.300 1.600 4.300 9.400-5.200 15.700z" fill="#e0457b"/><path d="M12 21.5C2.5 15.2 1.5 7.4 6.8 5.8c2.3-.7 4.2.7 5.2 2.3 1-1.6 2.9-3 5.2-2.3 5.300 1.600 4.300 9.400-5.200 15.700z" fill="' + SH + '"/><path d="M6 8.600c.9-1.100 2.400-1.200 3.400-.4" stroke="#fff" stroke-opacity=".75" stroke-width="1.600" fill="none" stroke-linecap="round"/></symbol>' +
    '<symbol id="f-sun" viewBox="-12 -12 24 24"><circle r="4.800" fill="url(#fl-core)" stroke="#e08a00" stroke-width="1.200"/><g class="sun-rays" stroke="#f0a000" stroke-width="2" stroke-linecap="round"><path d="M0-7.800v-3M0 7.800v3M-7.800 0h-3M7.800 0h3M5.500-5.500l2.100-2.100M-5.500 5.500l-2.100 2.100M5.500 5.500l2.100 2.100M-5.500-5.500l-2.100-2.100"/></g></symbol>' +
    '<symbol id="f-spark" viewBox="0 0 24 24"><path d="M12 1.500l2.600 7.900 7.900 2.600-7.900 2.600L12 22.500l-2.600-7.900L1.500 12l7.900-2.600z" fill="#ffd25a" stroke="#f0a000" stroke-width="1" stroke-linejoin="round"/></symbol>';

  var DEFS = GRAD + NEWF + NEWF2 +
    '<symbol id="f-lavender" viewBox="0 0 24 24"><path d="M12 22V7" stroke="' + LEAF + '" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M12 19c-2.5-.5-4-2-4.4-3.6 2.2.2 3.8 1.5 4.4 3.6z" fill="' + LEAF2 + '"/><g fill="currentColor"><ellipse cx="12" cy="3" rx="1.4" ry="2"/>' +
    '<ellipse cx="10.3" cy="6" rx="1.5" ry="2" transform="rotate(-20 10.3 6)"/><ellipse cx="13.7" cy="6" rx="1.5" ry="2" transform="rotate(20 13.7 6)"/>' +
    '<ellipse cx="10.1" cy="9.4" rx="1.6" ry="2.1" transform="rotate(-20 10.1 9.4)"/><ellipse cx="13.9" cy="9.4" rx="1.6" ry="2.1" transform="rotate(20 13.9 9.4)"/>' +
    '<ellipse cx="10.3" cy="12.8" rx="1.5" ry="2" transform="rotate(-20 10.3 12.8)"/><ellipse cx="13.7" cy="12.8" rx="1.5" ry="2" transform="rotate(20 13.7 12.8)"/></g></symbol>' +
    '<symbol id="f-bell" viewBox="0 0 24 24"><path d="M4 4c5 0 9 3 10 9M10 6.5c3 1 4.5 4 4 8M14 13c3-1 5 0 6 2" stroke="' + LEAF + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
    '<g fill="currentColor"><path d="M7 7.5c-2 0-3 1.8-3 4.3l1-.6.9 1 1-.9 1 .9.9-1 1 .6c0-2.5-1-4.3-2.8-4.3z"/><path d="M14 14.4c-1.8 0-2.8 1.6-2.8 3.8l.9-.5.9.9.9-.8.9.8.9-.9.9.5c0-2.2-1-3.8-2.6-3.8z"/>' +
    '<path d="M20 15.2c-1.4 0-2.2 1.3-2.2 3l.7-.4.75.7.75-.7.7.4c0-1.7-.8-3-2-3z" opacity=".9"/></g></symbol>' +
    '<symbol id="f-petal" viewBox="0 0 24 24"><path d="M12 1.5C17.5 7 19 13 12 22.5 5 13 6.5 7 12 1.5z" fill="currentColor"/><path d="M12 5v13" stroke="#fff" stroke-opacity=".45" stroke-width="1" stroke-linecap="round"/></symbol>' +
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
  /* ---------- Hoa rơi (GĐ7) ----------
     Cài đặt "Hoa rơi" (lưu trên thiết bị): on = luôn rơi (mặc định), system = theo "giảm chuyển động" của máy, off = tắt.
     Khoảng 180 bông trên màn rộng, 90 bông khi rộng dưới 620px (gấp đôi, Phần 6). Lớp xa nhỏ, mờ, chậm; lớp gần to, rõ, nhanh.
     Khoảng 30% là cánh hoa rời xoay lật 3D. Chỉ dùng transform và opacity. */
  var FALL_KEY = 'lp_fall';
  function getFall() {
    try { var v = localStorage.getItem(FALL_KEY); return v === 'system' || v === 'off' ? v : 'on'; } catch (e) { return 'on'; }
  }
  function setFall(mode) {
    try { localStorage.setItem(FALL_KEY, mode); } catch (e) { /* không lưu được thì chỉ đổi tạm */ }
    applyBg(true);
  }
  function osReduced() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  // Hoa có được chuyển động không (hoa rơi nền và hoa bung khi xong việc)
  function motionOn() { var m = getFall(); return m === 'on' || (m === 'system' && !osReduced()); }

  var builtCount = 0;
  function buildFall(layer) {
    var count = window.innerWidth < 620 ? 90 : 180;
    if (layer.childNodes.length && builtCount === count) return;
    builtCount = count;
    var seed = 7, rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }, out = '';
    for (var i = 0; i < count; i++) {
      var near = i % 100 < 45; // khoảng 45% là lớp gần
      var size = near ? 28 + Math.round(rnd() * 28) : 14 + Math.round(rnd() * 14);
      var dur = near ? 9 + rnd() * 6 : 15 + rnd() * 7;
      var op = near ? 0.5 + rnd() * 0.05 : 0.35 + rnd() * 0.1;
      var top = Math.round(rnd() * 96), petal = i % 10 < 3;
      var sw = 14 + rnd() * 26, sd = 4 + rnd() * 4, spin = (rnd() < 0.5 ? -1 : 1) * (70 + rnd() * 110);
      var name = petal ? 'petal' : NAMES[i % 11];
      out += '<span class="fall" style="left:' + (rnd() * 98).toFixed(1) + '%;top:' + top + 'vh;--from:' + (-top - 12) + 'vh;--to:' + (108 - top) + 'vh;' +
        '--fd:' + dur.toFixed(1) + 's;--fdl:-' + (rnd() * dur).toFixed(1) + 's">' +
        html(name, size, 1 + i % BG_TONES, petal ? 'is-petal' : 'is-bloom',
          'opacity:' + op.toFixed(2) + ';--sw:' + sw.toFixed(0) + 'px;--sd:' + sd.toFixed(1) + 's;--sdl:-' + (rnd() * sd).toFixed(1) + 's;--sp:' + spin.toFixed(0) + 'deg') + '</span>';
    }
    layer.innerHTML = out;
  }
  function applyBg(force) {
    var mode = getBg(), fall = getFall();
    var root = document.documentElement;
    root.setAttribute('data-bg', mode);
    root.setAttribute('data-fall', fall);
    var layer = document.getElementById('bg-flowers');
    if (!layer) return;
    if (mode === 'flowers' && fall !== 'off') buildFall(layer);
    else if (force || fall === 'off') { layer.innerHTML = ''; builtCount = 0; }
  }
  // Đổi cỡ màn hình qua mốc 620px thì dựng lại số bông; tab ẩn thì dừng animation
  var rz = null;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { var l = document.getElementById('bg-flowers'); if (l && l.childNodes.length) buildFall(l); }, 200); });
  document.addEventListener('visibilitychange', function () { document.documentElement.classList.toggle('tab-hidden', document.hidden); });

  /* ---------- Ăn mừng ---------- */
  function reduced() { return !motionOn(); }

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

  return { NAMES: NAMES, install: install, html: html, pick: pick, getBg: getBg, setBg: setBg, getFall: getFall, setFall: setFall, motionOn: motionOn, applyBg: applyBg, burst: burst, cheerText: cheerText };
})();

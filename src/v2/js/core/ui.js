/* V2 · thành phần giao diện dùng chung: icon, trái tim (quan trọng), đồng hồ báo thức (khẩn), pill, thông báo,
   hộp thoại, tấm trượt, xác nhận, chế độ sáng/tối. Icon và hộp thoại lấy lại từ web cũ (src/js/ui.js).
   Quy ước một nghĩa: trái tim = mức quan trọng · đồng hồ báo thức = mức khẩn · ngọn lửa = chuỗi thói quen. */
var LP = window.LP || (window.LP = {});

LP.ui = (function () {
  var esc = LP.util.esc;

  // Icon nét tròn, lưới 24, stroke 2. Mỗi icon một nghĩa
  var ICONS = {
    home: '<path d="M4 11l8-7 8 7v8a2 2 0 0 1-2 2h-3v-6H9v6H6a2 2 0 0 1-2-2z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    calcheck: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4"/>',
    barchart: '<path d="M4 20V10M10 20V5M16 20v-7M21 20H3"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5 9.5 17 19 7"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    heart: '<path d="M12 20.5s-7.5-4.6-9.6-9.2A5 5 0 0 1 12 6.2a5 5 0 0 1 9.6 5.1c-2.1 4.6-9.6 9.2-9.6 9.2z"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 2 1 3 3 3 3s1-3 0-7z"/>',
    bolt: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
    hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    alert: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17v.5"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z"/>',
    pause: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
    brief: '<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18"/>',
    leaf: '<path d="M5 19C4 11 9 5 20 4c0 10-5 15-13 15z"/><path d="M5 19c3-4 6-7 10-9"/>',
    flower: '<circle cx="12" cy="9" r="2.5"/><path d="M12 6.5a2.5 2.5 0 1 1 2.4 1.8M14.4 8.3a2.5 2.5 0 1 1-.9 3.2M13.5 11.5a2.5 2.5 0 1 1-3 0M10.5 11.5a2.5 2.5 0 1 1-.9-3.2M9.6 8.3A2.5 2.5 0 1 1 12 6.5M12 14v7M12 18c-2 0-3.5-1-4-3M12 19c2 0 3.5-1 4-3"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z"/>',
    cloudoff: '<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z"/><path d="M4 4l16 16"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/>',
    sparkle: '<path d="M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z"/>',
    text: '<path d="M5 6h14M5 12h14M5 18h9"/>',
    key: '<circle cx="8" cy="14" r="4"/><path d="M11 11l9-9M16 6l3 3M14 8l2 2"/>',
    /* Icon cho task */
    note: '<rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M9 8.5h6M9 12h6M9 15.5h3"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
    phone: '<path d="M6 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5.5a2 2 0 0 1 2-2z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6 6 0 0 1 3.5 6"/>',
    chart: '<path d="M4 20V10M10 20V5M16 20v-7M21 20H3"/>',
    doc: '<path d="M6 3h8l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5M8 13h8M8 17h5"/>',
    laptop: '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 19h20"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M9 7h6"/>',
    grad: '<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v5c3 2.5 8 2.5 11 0v-5M21.5 9v5"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
    shoe: '<path d="M3 16h18v1.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5zM3 16V7l4 1 2 3 6 1.5c3 .8 6 1.8 6 3.5"/>',
    dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
    tooth: '<path d="M7 4c2 0 3 1 5 1s3-1 5-1c2.5 0 3.5 2.5 3 5-.6 3-1.6 4-2 7-.4 3-1 4-2 4-1.5 0-1.5-5-4-5s-2.5 5-4 5c-1 0-1.6-1-2-4-.4-3-1.4-4-2-7-.5-2.5.5-5 3-5z"/>',
    pill: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="m9.5 9.5 5 5"/>',
    food: '<path d="M3 11h18a9 9 0 0 1-18 0zM8 7c0-1.5 1-2 1-3.5M12 7c0-1.5 1-2 1-3.5M16 7c0-1.5 1-2 1-3.5"/>',
    drop: '<path d="M12 3.5c3.5 4.5 6 7.6 6 10.5a6 6 0 0 1-12 0c0-2.9 2.5-6 6-10.5z"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h13a2 2 0 0 1 0 4h-1M6 6l9-3 1 3"/>',
    cart: '<path d="M3 4h2l2.4 11h11L21 8H6.2"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
    car: '<path d="M5 16V11l2-5h10l2 5v5M3 16h18v3h-3v-1H6v1H3zM5 11h14"/>',
    plane: '<path d="M10.5 13.5 3 11l1.5-1.5 8 1L17 6a2 2 0 0 1 3 3l-4.5 4.5 1 8L15 23l-2.5-7.5L9 19v2.5L7.5 23 6 18l-5-1.5L2.5 15H5z"/>',
    gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8c-1.5-3-5-4-5-1.5S10 8 12 8zM12 8c1.5-3 5-4 5-1.5S14 8 12 8z"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a16 16 0 0 1-3 3.4M6.6 7.6C4.4 9.2 3 12 3 12s4 6 9 6a8.6 8.6 0 0 0 4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    eye: '<path d="M3 12s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.6"/>',
    sort: '<path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4"/>',
    box: '<path d="M3.5 8 12 4l8.5 4v8.5L12 20.5l-8.5-4z"/><path d="M3.5 8 12 12l8.5-4M12 12v8.5"/>'
,
    alarm: '<circle cx="12" cy="13.5" r="7"/><path d="M12 9.5v4l2.5 1.5M4 6l3-3M20 6l-3-3"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'
  };

  function icon(name, cls) {
    return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  /* ---------- Trái tim = mức quan trọng (1 đến 3) ---------- */
  var IMPORTANCE = ['', 'Bình thường', 'Quan trọng', 'Rất quan trọng'];
  function importance(n) {
    n = Math.max(1, Math.min(3, parseInt(n, 10) || 1));
    var h = '';
    for (var i = 0; i < n; i++) h += icon('heart', 'fill');
    return '<span class="hearts" role="img" aria-label="' + IMPORTANCE[n] + '" title="' + IMPORTANCE[n] + '">' + h + '</span>';
  }

  /* ---------- Đồng hồ báo thức = mức khẩn (web tự tính từ hạn chót). Không khẩn thì không hiện ---------- */
  function urgency(level) {
    if (level !== 'rat-khan' && level !== 'khan') return '';
    var label = level === 'rat-khan' ? 'Rất khẩn' : 'Khẩn';
    return '<span class="urg urg-' + level + '" role="img" aria-label="' + label + '" title="' + label + '">' + icon('alarm', 'ic18') + '</span>';
  }

  /* ---------- Pill. kind: late (Trễ), missed (Bỏ sót), undone (Chưa xong), ok, note, plain ---------- */
  function pill(text, kind) {
    return '<span class="pill pill-' + (kind || 'plain') + '">' + esc(text) + '</span>';
  }

  /* ---------- Thông báo ---------- */
  // Thông báo dính (lỗi lưu, có nút Thử lại) không bị thông báo thường che mất
  var toastEl = null, toastTimer = null, stuck = null;
  function toast(msg, opts) {
    opts = opts || {};
    if (opts.sticky) stuck = [msg, opts];
    hideToast(true);
    toastEl = document.createElement('div');
    toastEl.setAttribute('role', opts.sticky ? 'alert' : 'status');
    toastEl.className = 'toast' + (opts.cheer ? ' is-cheer' : '') + (opts.sticky ? ' is-sticky' : '');
    toastEl.innerHTML = (opts.cheer ? LP.flowers.html('sakura', 22, 1) + LP.flowers.html('daisy', 20, 4, 'overlap') : '') +
      '<span class="msg">' + esc(msg) + '</span>' +
      (opts.actionLabel ? '<button type="button" class="btn" data-t="act">' + icon(opts.actionIcon || 'refresh', 'ic18') + esc(opts.actionLabel) + '</button>' : '') +
      '<button type="button" class="icon-btn" data-t="close" aria-label="Đóng thông báo">' + icon('close', 'ic18') + '</button>';
    toastEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-t]');
      if (!b) return;
      var act = b.getAttribute('data-t') === 'act';
      if (opts.sticky) stuck = null;
      hideToast();
      if (act && opts.action) opts.action();
    });
    document.body.appendChild(toastEl);
    if (!opts.sticky) toastTimer = setTimeout(hideToast, opts.duration || 3200);
  }
  function hideToast(replacing) {
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = null;
    var wasSticky = toastEl && toastEl.classList.contains('is-sticky');
    if (toastEl) toastEl.remove();
    toastEl = null;
    if (!replacing && !wasSticky && stuck) toast(stuck[0], stuck[1]);
  }
  function clearSticky() { stuck = null; if (toastEl && toastEl.classList.contains('is-sticky')) hideToast(); }

  /* ---------- Hộp thoại / tấm trượt ----------
     sheet(title, body, opts) -> { el, close }. body là HTML. Điện thoại: trượt từ đáy. Máy tính: hộp giữa màn hình. */
  var current = null;
  function sheet(title, body, opts) {
    opts = opts || {};
    closeSheet();
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      '<div class="modal-head"><h2 id="modal-title">' + esc(title) + '</h2>' +
      '<button type="button" class="icon-btn" data-close aria-label="Đóng">' + icon('close') + '</button></div>' +
      '<div class="modal-body">' + body + '</div></div>';
    var lastFocus = document.activeElement;
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.closest('[data-close]')) closeSheet();
    });
    function onKey(e) { if (e.key === 'Escape') closeSheet(); }
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    current = {
      el: overlay,
      onClose: opts.onClose,
      cleanup: function () {
        document.removeEventListener('keydown', onKey);
        document.body.style.overflow = '';
        if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus();
      }
    };
    var first = overlay.querySelector('[autofocus]') || overlay.querySelector('input,select,textarea,button:not([data-close])');
    if (first) first.focus();
    var modal = overlay.querySelector('.modal');
    if (opts.onOpen) opts.onOpen(modal);
    return { el: modal, close: closeSheet };
  }
  function closeSheet() {
    if (!current) return;
    var c = current; current = null;
    c.el.remove(); c.cleanup();
    if (c.onClose) c.onClose();
  }

  // Hộp xác nhận: trả về Promise<boolean>. opts: { ok, cancel, danger }
  function confirm(title, message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var done = false;
      var s = sheet(title,
        '<p>' + esc(message) + '</p><div class="modal-foot"><span class="spacer"></span>' +
        '<button type="button" class="btn" data-ans="0">' + esc(opts.cancel || 'Hủy') + '</button>' +
        '<button type="button" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-ans="1">' + esc(opts.ok || 'Đồng ý') + '</button></div>',
        { onClose: function () { if (!done) { done = true; resolve(false); } } });
      s.el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-ans]');
        if (!b || done) return;
        done = true; var yes = b.getAttribute('data-ans') === '1';
        closeSheet(); resolve(yes);
      });
    });
  }

  /* Tài liệu trong tấm trượt: Phần Ghi chú (ghi-chu.js) định nghĩa LP.views.openDoc, có định dạng */
  function docSheet(docId, headingId) {
    if (!docId) { toast('Chưa gắn tài liệu.'); return; }
    if (LP.views && LP.views.openDoc) return LP.views.openDoc(docId, headingId);
    toast('Chưa mở được ghi chú.');
  }

  return {
    docSheet: docSheet,
    icon: icon, importance: importance, urgency: urgency, pill: pill, esc: esc,
    toast: toast, hideToast: hideToast, clearSticky: clearSticky,
    sheet: sheet, closeSheet: closeSheet, confirm: confirm, ICONS: ICONS
  };
})();

/* Chế độ sáng / tối: "auto" theo cài đặt máy, hoặc chọn tay. Lưu trên từng thiết bị (cùng khóa lp_theme với web cũ). */
LP.theme = (function () {
  var KEY = 'lp_theme';
  function get() { try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'auto'; } catch (e) { return 'auto'; } }
  function isDark() {
    var m = get();
    return m === 'dark' || (m === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function apply() {
    var m = get(), root = document.documentElement;
    if (m === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', m);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
  }
  function set(m) {
    try { if (m === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, m); } catch (e) { /* bỏ qua */ }
    apply();
  }
  if (window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', apply);
  }
  return { get: get, set: set, apply: apply, isDark: isDark };
})();

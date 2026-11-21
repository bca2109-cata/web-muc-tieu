/* Thành phần giao diện dùng chung: icon SVG, hộp thoại, thông báo */
var App = window.App || (window.App = {});

App.ui = (function () {
  var esc = function (s) { return App.util.esc(s); };

  // Icon nét mảnh, lưới 24, stroke 1.8
  var ICONS = {
    today: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5 9.5 17 19 7"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>'
  };

  function icon(name, cls) {
    return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  /* ---------- Thông báo ---------- */
  var toastEl = null, toastTimer = null;
  function toast(msg, opts) {
    opts = opts || {};
    hideToast();
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', opts.sticky ? 'alert' : 'status');
    toastEl.innerHTML = '<span class="msg">' + esc(msg) + '</span>' +
      (opts.actionLabel ? '<button type="button" class="btn" data-t="act">' + esc(opts.actionLabel) + '</button>' : '') +
      '<button type="button" class="icon-btn" data-t="close" aria-label="Đóng thông báo">' + icon('close', 'icon-sm') + '</button>';
    toastEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-t]');
      if (!b) return;
      var act = b.getAttribute('data-t') === 'act';
      hideToast();
      if (act && opts.action) opts.action();
    });
    document.body.appendChild(toastEl);
    if (!opts.sticky) toastTimer = setTimeout(hideToast, opts.duration || 3200);
  }
  function hideToast() {
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = null;
    if (toastEl) toastEl.remove();
    toastEl = null;
  }

  /* ---------- Hộp thoại ---------- */
  var current = null;
  function openModal(opts) {
    closeModal();
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      '<div class="modal-head"><h2 id="modal-title">' + esc(opts.title) + '</h2>' +
      '<button type="button" class="icon-btn" data-close aria-label="Đóng">' + icon('close') + '</button></div>' +
      '<div class="modal-body">' + opts.body + '</div></div>';
    var lastFocus = document.activeElement;
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.closest('[data-close]')) closeModal();
    });
    function onKey(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    current = {
      el: overlay,
      cleanup: function () {
        document.removeEventListener('keydown', onKey);
        document.body.style.overflow = '';
        if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus();
      }
    };
    var first = overlay.querySelector('[autofocus]') || overlay.querySelector('input,select,textarea,button:not([data-close])');
    if (first) first.focus();
    if (opts.onOpen) opts.onOpen(overlay.querySelector('.modal'));
    return overlay.querySelector('.modal');
  }
  function closeModal() {
    if (!current) return;
    current.el.remove();
    var c = current; current = null;
    c.cleanup();
  }

  // Hộp hỏi với nhiều lựa chọn. choices: [{label, value, kind}]
  function ask(title, message, choices) {
    return new Promise(function (resolve) {
      var body = '<p>' + esc(message) + '</p><div class="choice-list">' +
        choices.map(function (c, i) {
          return '<button type="button" class="btn btn-block ' + (c.kind === 'danger' ? 'btn-danger' : c.kind === 'primary' ? 'btn-primary' : '') +
            '" data-choice="' + i + '">' + esc(c.label) + '</button>';
        }).join('') + '</div>';
      var done = false;
      var m = openModal({ title: title, body: body });
      m.addEventListener('click', function (e) {
        var b = e.target.closest('[data-choice]');
        if (!b) return;
        done = true;
        var v = choices[+b.getAttribute('data-choice')].value;
        closeModal();
        resolve(v);
      });
      // Đóng bằng nút X, Esc hoặc bấm ra ngoài thì coi như hủy
      var c = current.cleanup;
      current.cleanup = function () { c(); if (!done) resolve(null); };
    });
  }

  return { icon: icon, toast: toast, hideToast: hideToast, openModal: openModal, closeModal: closeModal, ask: ask };
})();

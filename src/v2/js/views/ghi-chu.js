/* V2 · Phần 3 · màn Ghi chú (route ghi-chu): tài liệu dài, mục lục tự sinh, gắn với Daily / Ad-hoc / Personal.
   Xuất ra: LP.views.openDoc(docId, headingId) mở tài liệu trong tấm trượt và cuộn tới đúng mục.
   Chỉ gọi docsIndex khi mở tab Ghi chú hoặc khi tìm kiếm (không gọi lúc mở Agenda). */
var LP = window.LP || (window.LP = {});
LP.views = LP.views || {};

(function () {
  var esc = LP.util.esc, ui = LP.ui;
  var SPACES = ['Công việc', 'Cá nhân'];
  var DRAFT = 'lpv2_docdraft_';
  var cache = {};                 // id -> tài liệu đầy đủ (có content)
  var indexPromise = null, trashRows = [];
  var S = null;                   // trạng thái màn đang mở

  // Nét vẽ tay cho màn trống: trang sổ mở, vài dòng viết dở và cây bút chì (màu theo màn)
  var EMPTY_DRAW = '<svg viewBox="0 0 160 110" width="150" height="103" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12 28c14-5 44-6 66 6 22-12 52-11 70-6l-2 62c-18-5-47-5-68 5-21-10-50-10-68-5z" fill="var(--surface)" stroke="var(--ink)" stroke-width="3"/>' +
    '<path d="M78 34v62" stroke="var(--ink)" stroke-width="2.6"/>' +
    '<path d="M24 46c10-3 22-3 41 2M24 60c11-2 24-2 41 2M24 74c8-2 16-2 26 0" stroke="var(--line)" stroke-width="3"/>' +
    '<path d="M92 48c9-2 20-2 40-1M92 62c8-2 18-2 32 0" stroke="var(--accent)" stroke-width="3.2"/>' +
    '<path d="M92 76c4-5 7 3 11-1s6 3 10-1" stroke="var(--accent-deep)" stroke-width="3"/>' +
    '<g transform="rotate(32 128 22)"><path d="M120 4h16v34l-8 11-8-11z" fill="var(--butter)" stroke="var(--ink)" stroke-width="2.8"/>' +
    '<path d="M120 12h16" stroke="var(--ink)" stroke-width="2.4"/><path d="M124.5 41l3.5 6 3.5-6z" fill="var(--ink)" stroke="none"/></g>' +
    '<path d="M18 14l2.2 5 5 2.2-5 2.2L18 28.4l-2.2-5-5-2.2 5-2.2z" fill="var(--accent-soft)" stroke="var(--accent-deep)" stroke-width="2"/></svg>';

  /* ---------- Dữ liệu ---------- */
  function heads(doc) { try { var h = JSON.parse(doc.headings || '[]'); return Array.isArray(h) ? h : []; } catch (e) { return []; } }
  function docs() { return LP.store.get().docs; }
  function indexRow(d) {
    return { id: d.id, space: d.space || SPACES[0], title: d.title || '', sort_order: d.sort_order, headings: d.headings || '[]', created_at: d.created_at || '', updated_at: d.updated_at || '', deleted: d.deleted || '' };
  }
  // Cập nhật danh sách trong bộ nhớ (cho danh sách bên trái và tìm kiếm chung)
  function patchStore(row) {
    var list = docs(), i = list.findIndex(function (r) { return r.id === row.id; });
    var dead = LP.util.truthy(row.deleted);
    if (dead) { if (i >= 0) list.splice(i, 1); trashRows = trashRows.filter(function (r) { return r.id !== row.id; }); trashRows.push(indexRow(row)); return; }
    trashRows = trashRows.filter(function (r) { return r.id !== row.id; });
    if (i >= 0) list[i] = indexRow(row); else list.push(indexRow(row));
  }
  function ensureIndex() {
    if (!indexPromise) {
      indexPromise = LP.api.docsIndex().then(function (rows) {
        var list = docs(); list.length = 0;
        trashRows = [];
        (rows || []).forEach(function (r) { if (LP.util.truthy(r.deleted)) trashRows.push(indexRow(r)); else list.push(indexRow(r)); });
        return list;
      }, function (e) { indexPromise = null; throw e; });
    }
    return indexPromise;
  }
  function loadDoc(id) {
    if (cache[id]) return Promise.resolve(cache[id]);
    return LP.api.docGet(id).then(function (d) { cache[id] = d; return d; });
  }
  function stampParts(s) {
    var m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(s || '');
    return m ? LP.date.fmt(m[1]) + ' ' + m[2] : '';
  }
  function draftGet(id) { try { return JSON.parse(localStorage.getItem(DRAFT + id) || 'null'); } catch (e) { return null; } }
  function draftSet(id, v) { try { localStorage.setItem(DRAFT + id, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } }
  function draftClear(id) { try { localStorage.removeItem(DRAFT + id); } catch (e) { /* bỏ qua */ } }

  /* ---------- Gắn với Daily / Ad-hoc / Personal ---------- */
  function linkMap(docId) {
    var st = LP.store.get(), m = {};
    function add(h, label) { (m[h] = m[h] || []).push(label); }
    st.routines.forEach(function (r) { if (r.doc_id === docId && r.heading_id) add(r.heading_id, 'Daily · ' + r.name); });
    st.tasks.forEach(function (t) {
      if (t.doc_id === docId && t.heading_id && t.status !== 'cancelled') add(t.heading_id, (t.kind === 'canhan' ? 'Personal' : 'Ad-hoc') + ' · ' + t.title);
    });
    return m;
  }

  /* ---------- Tìm kiếm chung ---------- */
  var secCache = {}, prefetching = false;
  function sectionsOf(doc) {
    var key = (doc.updated_at || '') + ':' + (doc.content || '').length;
    if (secCache[doc.id] && secCache[doc.id].key === key) return secCache[doc.id].list;
    var tmp = document.createElement('div'); tmp.innerHTML = LP.editor.toHTML(doc.content, heads(doc));
    var list = [], cur = { hid: '', title: '', text: '' };
    Array.prototype.forEach.call(tmp.children, function (n) {
      if (/^H[1-3]$/.test(n.tagName)) { list.push(cur); cur = { hid: n.getAttribute('data-hid') || '', title: n.textContent.trim(), text: '' }; }
      else cur.text += ' ' + n.textContent;
    });
    list.push(cur);
    secCache[doc.id] = { key: key, list: list };
    return list;
  }
  function snippet(text, q) {
    var f = LP.util.fold(text), i = f.indexOf(q);
    if (i < 0) return text.trim().slice(0, 80);
    var a = Math.max(0, i - 30);
    return (a > 0 ? '…' : '') + text.slice(a, i + q.length + 50).trim() + '…';
  }
  function prefetch() {
    if (prefetching) return; prefetching = true;
    ensureIndex().then(function () {
      var ids = docs().map(function (d) { return d.id; }).filter(function (id) { return !cache[id]; }).slice(0, 40);
      return ids.reduce(function (p, id) { return p.then(function () { return loadDoc(id).catch(function () { /* bỏ qua */ }); }); }, Promise.resolve());
    }).catch(function () { prefetching = false; });
  }
  LP.search.register('Ghi chú', function (q) {
    prefetch();
    var out = [], fold = LP.util.fold;
    docs().forEach(function (d) {
      var sub = (d.space || '');
      if (fold(d.title).indexOf(q) >= 0) out.push({ title: d.title, sub: 'Ghi chú · ' + sub, icon: 'doc', route: 'ghi-chu', params: { doc: d.id } });
      var done = {};
      heads(d).forEach(function (h) {
        if (fold(h.title).indexOf(q) >= 0) { done[h.id] = 1; out.push({ title: h.title, sub: 'Ghi chú · ' + d.title, icon: 'doc', route: 'ghi-chu', params: { doc: d.id, h: h.id, q: q } }); }
      });
      var full = cache[d.id];
      if (full) sectionsOf(full).forEach(function (s) {
        if (s.hid && done[s.hid]) return;
        if (fold(s.text).indexOf(q) >= 0) out.push({ title: snippet(s.text, q), sub: 'Ghi chú · ' + d.title + (s.title ? ' · ' + s.title : ''), icon: 'doc', route: 'ghi-chu', params: s.hid ? { doc: d.id, h: s.hid, q: q } : { doc: d.id, q: q } });
      });
    });
    return out;
  });

  /* ---------- Mở trong tấm trượt (Agenda và Lịch gọi hàm này) ---------- */
  LP.views.openDoc = function (docId, headingId) {
    if (!docId) { ui.toast('Chưa gắn tài liệu.'); return Promise.resolve(); }
    return loadDoc(docId).then(function (doc) {
      var s = ui.sheet(doc.title || 'Ghi chú',
        '<div class="gc-body gc-read">' + LP.editor.toHTML(doc.content, heads(doc)) + '</div>' +
        '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn btn-soft" data-open>' + ui.icon('edit', 'ic18') + 'Mở trong Ghi chú</button></div>');
      var m = s.el;
      m.classList.add('gc-modal');
      m.querySelector('[data-open]').addEventListener('click', function () { ui.closeSheet(); LP.router.go('ghi-chu', headingId ? { doc: docId, h: headingId } : { doc: docId }); });
      var h = headingId ? m.querySelector('[data-hid="' + String(headingId).replace(/"/g, '') + '"]') : null;
      if (h) {
        m.scrollTop += h.getBoundingClientRect().top - m.getBoundingClientRect().top - 8;
        h.classList.add('is-hit');
      }
    }, function () { ui.toast('Không mở được ghi chú.'); });
  };

  /* ---------- Màn Ghi chú ---------- */
  // Xem trước: 1 dòng chữ thuần (khoảng 60 ký tự) lấy từ nội dung đã có trong bộ nhớ, không gọi thêm API
  var prevCache = {};
  function previewOf(d) {
    var full = cache[d.id]; if (!full || !full.content) return '';
    var key = (full.updated_at || '') + ':' + full.content.length, c = prevCache[d.id];
    if (c && c.key === key) return c.text;
    var tmp = document.createElement('div'); tmp.innerHTML = LP.editor.toHTML(full.content, heads(full));
    var t = Array.prototype.map.call(tmp.children, function (n) { return n.textContent; }).join(' ').replace(/\s+/g, ' ').trim();
    if (t.length > 60) t = t.slice(0, 60).replace(/\s+\S*$/, '').replace(/\s+$/, '') + '…';
    prevCache[d.id] = { key: key, text: t };
    return t;
  }
  // Mới sửa nhất lên đầu; tài liệu mới chưa có updated_at đứng đầu
  function byRecent(a, b) {
    var x = String(a.updated_at || ''), y = String(b.updated_at || '');
    if (x === y) return String(a.title).localeCompare(String(b.title), 'vi');
    if (!x) return -1; if (!y) return 1;
    return x < y ? 1 : -1;
  }
  function listHTML() {
    var all = docs().slice().sort(byRecent);
    var h = SPACES.map(function (sp) {
      var rows = all.filter(function (d) { return (d.space || SPACES[0]) === sp; });
      return '<section class="gc-space"><div class="gc-space-head"><h2>' + esc(sp) + '</h2>' +
        '<button type="button" class="icon-btn gc-add" data-new="' + esc(sp) + '" title="Tạo tài liệu mới trong ' + esc(sp) + '" aria-label="Tạo tài liệu mới trong ' + esc(sp) + '">' + ui.icon('plus', 'ic18') + '</button></div>' +
        (rows.length ? '<ul class="gc-docs">' + rows.map(function (d) {
          var pv = previewOf(d);
          return '<li><button type="button" class="gc-docrow' + (S && d.id === S.docId ? ' is-on' : '') + '" data-doc="' + esc(d.id) + '">' + ui.icon('doc', 'ic18') +
            '<span class="gc-docrow-b"><span class="gc-docrow-t">' + LP.cute.html(d.title, 'book') + esc(d.title || 'Chưa đặt tên') + '</span>' +
            (pv ? '<span class="gc-docrow-p muted">' + esc(pv) + '</span>' : '') + '</span><span class="gc-docrow-m muted num">' + esc(stampParts(d.updated_at).slice(0, 5)) + '</span></button></li>';
        }).join('') + '</ul>' : '<p class="muted gc-none">Chưa có tài liệu.</p>') + '</section>';
    }).join('');
    h += '<section class="gc-space gc-trash"><button type="button" class="gc-trash-head" data-trash aria-expanded="' + (S && S.trashOpen ? 'true' : 'false') + '">' + ui.icon('trash', 'ic18') + '<span>Thùng rác</span><span class="num muted">' + trashRows.length + '</span></button>' +
      (S && S.trashOpen ? (trashRows.length ? '<ul class="gc-docs">' + trashRows.map(function (d) {
        return '<li class="gc-trashrow"><span class="gc-docrow-t">' + esc(d.title || 'Chưa đặt tên') + '</span><button type="button" class="btn btn-soft gc-restore" data-restore="' + esc(d.id) + '">Khôi phục</button></li>';
      }).join('') + '</ul>' : '<p class="muted gc-none">Thùng rác trống.</p>') : '') + '</section>';
    return h;
  }
  function renderList() { if (S && S.listEl) S.listEl.innerHTML = listHTML(); }

  function mount(el, params) {
    S = { el: el, docId: params.doc || '', params: params, trashOpen: false, dirty: false, saving: null, cleanup: [] };
    el.innerHTML = '<div class="gc" data-tier="' + (S.docId ? 'doc' : 'list') + '">' +
      '<aside class="gc-list card" aria-label="Danh sách tài liệu"></aside>' +
      '<section class="gc-main"></section><aside class="gc-side" aria-label="Mục lục"></aside></div>';
    S.root = el.firstChild; S.listEl = S.root.querySelector('.gc-list'); S.mainEl = S.root.querySelector('.gc-main'); S.sideEl = S.root.querySelector('.gc-side');
    renderList();
    S.listEl.addEventListener('click', onListClick);
    ensureIndex().then(function () { if (S && S.el === el) renderList(); }, function () { ui.toast('Không tải được danh sách tài liệu.'); });
    if (S.docId) openInView(S.docId, params); else emptyMain();

    function flushHidden() { if (document.hidden && S && S.dirty) save(); }
    document.addEventListener('visibilitychange', flushHidden);
    S.cleanup.push(function () { document.removeEventListener('visibilitychange', flushHidden); });
  }

  function unmount() {
    if (!S) return;
    if (S.dirty && S.ed) save();
    clearTimeout(S.timer); clearTimeout(S.draftTimer);
    S.cleanup.forEach(function (f) { try { f(); } catch (e) { /* bỏ qua */ } });
    if (S.bar && S.bar.destroy) S.bar.destroy();
    S = null;
  }

  function emptyMain() {
    S.mainEl.innerHTML = '<div class="card gc-empty"><div class="ph-draw" aria-hidden="true">' + EMPTY_DRAW + '</div><h1>Chọn một trang để viết</h1><p class="muted">Bấm tên tài liệu ở cột bên trái, hoặc mở một trang trắng mới.</p><button type="button" class="btn btn-soft" data-new-empty>+ Tài liệu mới</button></div>';
    S.mainEl.querySelector('[data-new-empty]').addEventListener('click', function () { newDoc(SPACES[0]); });
    S.sideEl.innerHTML = '';
  }

  function onListClick(e) {
    var b;
    if ((b = e.target.closest('[data-doc]'))) { flushThen(function () { LP.router.go('ghi-chu', { doc: b.getAttribute('data-doc') }); }); }
    else if ((b = e.target.closest('[data-new]'))) newDoc(b.getAttribute('data-new'));
    else if (e.target.closest('[data-trash]')) { S.trashOpen = !S.trashOpen; renderList(); }
    else if ((b = e.target.closest('[data-restore]'))) restore(b.getAttribute('data-restore'));
  }
  function flushThen(fn) { if (S && S.dirty) { save(); } fn(); }

  var pendingCreate = {};
  function newDoc(space) {
    var max = docs().reduce(function (m, d) { return Math.max(m, LP.util.num(d.sort_order)); }, 0);
    var doc = { id: LP.util.uid(), space: space, title: 'Tài liệu mới', sort_order: max + 1, headings: '[]', deleted: '', content: '<p><br></p>' };
    flushThen(function () {
      /* Mở ngay, không chờ Google Sheet (mỗi lần gọi mất vài giây); tạo trên Sheet chạy nền.
         Gõ nhanh hơn lúc tạo xong thì bản lưu kế tiếp chờ lượt tạo (xem save). */
      cache[doc.id] = Object.assign({}, doc);
      patchStore(doc);
      LP.router.go('ghi-chu', { doc: doc.id, nov: '1' });
      pendingCreate[doc.id] = LP.api.docSave(doc).then(function (row) {
        cache[row.id] = Object.assign({}, cache[row.id] || doc, row, { content: (cache[row.id] || doc).content });
        patchStore(Object.assign({}, cache[row.id]));
        if (S && S.doc && S.doc.id === row.id) { S.base = row.updated_at || S.base; S.doc.updated_at = row.updated_at; S.doc.created_at = row.created_at || S.doc.created_at; }
      }, function () {
        ui.toast('Chưa tạo được tài liệu trên Google Sheet. Bản nháp vẫn giữ trên máy này, sẽ thử lưu lại khi bạn sửa.');
        if (S && S.doc && S.doc.id === doc.id) { S.dirty = true; clearTimeout(S.timer); S.timer = setTimeout(save, 10000); }
      }).then(function () { delete pendingCreate[doc.id]; });
    });
  }

  function restore(id) {
    loadDoc(id).then(function (d) {
      return LP.api.docSave(Object.assign({}, d, { deleted: '', base_updated_at: d.updated_at })).then(function (row) {
        cache[id] = Object.assign({}, d, row, { content: d.content });
        patchStore(row); renderList(); ui.toast('Đã khôi phục "' + (d.title || 'tài liệu') + '".');
      });
    }).catch(function () { ui.toast('Chưa khôi phục được.'); });
  }

  /* ---------- Một tài liệu ---------- */
  function openInView(id, params) {
    S.mainEl.innerHTML = '<div class="card loading muted">Đang mở tài liệu…</div>';
    var my = S;
    loadDoc(id).then(function (doc) {
      if (S !== my) return;
      S.doc = doc; S.base = doc.updated_at || ''; renderList();
      buildDoc(params);
    }, function () {
      if (S !== my) return;
      S.mainEl.innerHTML = '<div class="card gc-empty"><h1>Không mở được</h1><p class="muted">Tài liệu này không còn hoặc chưa tải được.</p><button type="button" class="btn btn-soft" data-back>Về danh sách</button></div>';
      S.mainEl.querySelector('[data-back]').addEventListener('click', function () { LP.router.go('ghi-chu'); });
    });
  }

  function buildDoc(params) {
    var doc = S.doc;
    S.mainEl.innerHTML =
      '<article class="card gc-doc">' +
      '<div class="gc-top"><button type="button" class="icon-btn gc-back" data-back aria-label="Về danh sách">' + ui.icon('back') + '</button>' +
      '<input class="gc-title" type="text" maxlength="160" aria-label="Tên tài liệu" placeholder="Tên tài liệu">' +
      '<button type="button" class="icon-btn gc-tocbtn" data-toc aria-label="Mục lục">' + ui.icon('list') + '</button>' +
      '<button type="button" class="icon-btn" data-del aria-label="Chuyển tài liệu vào Thùng rác">' + ui.icon('trash') + '</button></div>' +
      '<div class="gc-meta"><select class="select gc-space-sel" aria-label="Không gian">' + SPACES.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('') + '</select>' +
      '<span class="gc-info muted num"></span><span class="gc-status muted" role="status"></span></div>' +
      '<div class="gc-toolhost"></div>' +
      '<div class="gc-editwrap"><div class="gc-body gc-edit"></div><button type="button" class="gc-hbtn" hidden aria-label="Gắn tiêu đề với công việc">' + ui.icon('settings', 'ic18') + '</button></div>' +
      '</article>';
    var titleEl = S.mainEl.querySelector('.gc-title'), spaceEl = S.mainEl.querySelector('.gc-space-sel'), editEl = S.mainEl.querySelector('.gc-edit');
    titleEl.value = doc.title || ''; spaceEl.value = doc.space || SPACES[0];

    var html = LP.editor.toHTML(doc.content, heads(doc));
    var draft = draftGet(doc.id), restored = false;
    if (draft && draft.html && draft.html !== html && String(draft.ts || '') >= String(doc.updated_at || '')) {
      html = draft.html; titleEl.value = draft.title != null ? draft.title : titleEl.value; restored = true;
    }
    S.ed = LP.editor.create(editEl, { onChange: touch, onSelect: onSelect });
    S.ed.setHTML(html);
    S.ed.setLinks(linkMap(doc.id));
    S.bar = LP.editor.toolbar(S.ed, { onCreateTask: createTask });
    S.mainEl.querySelector('.gc-toolhost').appendChild(S.bar);
    S.titleEl = titleEl; S.spaceEl = spaceEl; S.statusEl = S.mainEl.querySelector('.gc-status'); S.infoEl = S.mainEl.querySelector('.gc-info');
    S.hbtn = S.mainEl.querySelector('.gc-hbtn');

    titleEl.addEventListener('input', touch);
    spaceEl.addEventListener('change', touch);
    S.mainEl.addEventListener('click', onDocClick);
    editEl.addEventListener('mouseover', function (e) { var h = e.target.closest && e.target.closest('h1,h2,h3'); if (h && editEl.contains(h)) placeBtn(h); });
    S.hbtn.addEventListener('click', headingMenu);

    buildSide(S.sideEl, false);
    refreshInfo();
    setStatus(restored ? 'Đã khôi phục bản nháp chưa lưu' : (doc.updated_at ? 'Đã lưu ' + stampParts(doc.updated_at) : ''));
    if (restored) { S.dirty = true; S.timer = setTimeout(save, 2000); ui.toast('Đã khôi phục bản nháp chưa lưu của tài liệu này.'); }

    function onScroll() { if (S && !S.raf) S.raf = requestAnimationFrame(function () { if (S) { S.raf = 0; spy(); } }); }
    window.addEventListener('scroll', onScroll, { passive: true });
    S.cleanup.push(function () { window.removeEventListener('scroll', onScroll); });
    S.root.setAttribute('data-tier', 'doc');

    if (params.h) { setTimeout(function () { if (S && S.ed) S.ed.scrollToHeading(params.h); }, 30); }
    if (params.nov) { titleEl.focus(); titleEl.select(); }
    if (params.q) { var fi = S.sideEl.querySelector('.gc-find-in'); if (fi) { fi.value = params.q; fi.dispatchEvent(new Event('input')); } }
    spy();
  }

  function onDocClick(e) {
    if (e.target.closest('[data-back]')) { flushThen(function () { LP.router.go('ghi-chu'); }); }
    else if (e.target.closest('[data-toc]')) openTocSheet();
    else if (e.target.closest('[data-del]')) delDoc();
  }

  /* ---------- Lưu ---------- */
  function setStatus(t) { if (S && S.statusEl) S.statusEl.textContent = t; }
  function refreshInfo() {
    if (!S || !S.infoEl) return;
    var st = S.ed.stats(), when = stampParts(S.doc.updated_at);
    S.infoEl.textContent = (when ? 'Sửa ' + when + ' · ' : '') + st.words + ' chữ · ' + st.sections + ' mục';
  }
  function touch() {
    if (!S || !S.ed) return;
    S.dirty = true; setStatus('Chưa lưu…');
    clearTimeout(S.timer); S.timer = setTimeout(save, 2000);
    clearTimeout(S.draftTimer);
    S.draftTimer = setTimeout(function () { if (S && S.ed) draftSet(S.doc.id, { html: S.ed.getHTML(), title: S.titleEl.value, ts: LP.date.stamp() }); }, 400);
    clearTimeout(S.tocTimer); S.tocTimer = setTimeout(function () { if (S && S.ed) { refreshToc(); refreshInfo(); } }, 200);
    var row = docs().filter(function (d) { return d.id === S.doc.id; })[0];
    if (row) { row.title = S.titleEl.value; var lr = S.listEl.querySelector('[data-doc="' + S.doc.id + '"] .gc-docrow-t'); if (lr) lr.textContent = row.title || 'Chưa đặt tên'; }
  }
  function payload() {
    var d = S.doc, hs = S.ed.headings();
    return { id: d.id, space: S.spaceEl.value, title: S.titleEl.value.trim() || 'Chưa đặt tên', sort_order: d.sort_order, headings: JSON.stringify(hs),
      content: S.ed.getHTML(), deleted: '', created_at: d.created_at, base_updated_at: S.base };
  }
  // Lưu ngay. Trả Promise; gọi lúc chuyển màn thì dữ liệu lấy đồng bộ trước khi màn bị gỡ
  function save(always) {
    if (!S || !S.ed) return Promise.resolve();
    if (pendingCreate[S.doc.id]) { var cur0 = S; return pendingCreate[S.doc.id].then(function () { return S === cur0 ? save(always) : null; }); }
    if (S.saving) { var cur = S; return S.saving.then(function () { return S === cur ? save(always) : null; }); }
    if (!S.dirty && !always) return Promise.resolve();
    clearTimeout(S.timer);
    var my = S, p = payload(); S.dirty = false; setStatus('Đang lưu…');
    S.saving = LP.api.docSave(p).then(function (res) {
      if (res && res.conflict) return conflict(my, p, res.server || {});
      applySaved(my, p, res);
    }, function () {
      my.dirty = true;
      if (S === my) { setStatus('Chưa lưu được. Bản nháp vẫn giữ trên máy này.'); clearTimeout(my.timer); my.timer = setTimeout(save, 10000); }
    }).then(function () { my.saving = null; });
    return S.saving;
  }
  function applySaved(my, p, res) {
    var row = Object.assign({}, my.doc, res || {}, { content: p.content, headings: p.headings, title: p.title, space: p.space });
    row.updated_at = (res && res.updated_at) || row.updated_at;
    my.doc = row; my.base = row.updated_at; cache[row.id] = row; patchStore(row);
    if (!my.dirty) draftClear(row.id);
    if (S === my) { setStatus('Đã lưu ' + LP.date.now()); refreshInfo(); renderList(); S.ed.setLinks(linkMap(row.id)); }
  }
  function conflict(my, p, server) {
    return new Promise(function (resolve) {
      var done = false;
      var s = ui.sheet('Giữ bản nào?',
        '<p>Tài liệu này đã được sửa ở nơi khác' + (server.updated_at ? ' lúc ' + esc(stampParts(server.updated_at)) : '') + '. Bản trên Google Sheet khác với bản bạn đang soạn.</p>' +
        '<div class="modal-foot"><button type="button" class="btn btn-soft" data-theirs>Lấy bản trên Sheet</button><span class="spacer"></span><button type="button" class="btn btn-primary" data-mine>Giữ bản của tôi</button></div>',
        { onClose: function () { if (!done) { done = true; my.dirty = true; if (S === my) setStatus('Chưa lưu: bản trên Sheet mới hơn.'); resolve(); } } });
      s.el.querySelector('[data-mine]').addEventListener('click', function () {
        done = true; ui.closeSheet(); my.base = server.updated_at || my.base;
        LP.api.docSave(Object.assign({}, p, { base_updated_at: my.base, force: true })).then(function (res) { applySaved(my, p, res); resolve(); }, function () { my.dirty = true; resolve(); });
      });
      s.el.querySelector('[data-theirs]').addEventListener('click', function () {
        done = true; ui.closeSheet();
        var d = Object.assign({}, my.doc, server); cache[d.id] = d; my.doc = d; my.base = d.updated_at; patchStore(d); draftClear(d.id);
        if (S === my) { S.titleEl.value = d.title || ''; S.ed.setHTML(LP.editor.toHTML(d.content, heads(d))); S.ed.setLinks(linkMap(d.id)); refreshToc(); refreshInfo(); setStatus('Đã lấy bản trên Sheet'); }
        resolve();
      });
    });
  }

  function delDoc() {
    var my = S;
    ui.confirm('Chuyển vào Thùng rác?', 'Tài liệu "' + (S.titleEl.value || 'chưa đặt tên') + '" sẽ vào Thùng rác. Bạn khôi phục lại được.', { ok: 'Chuyển vào Thùng rác', danger: true }).then(function (yes) {
      if (!yes || S !== my) return;
      var p = payload(); p.deleted = 'TRUE'; S.dirty = false; clearTimeout(S.timer);
      LP.api.docSave(p).then(function (res) {
        var row = Object.assign({}, my.doc, res || {}, { content: p.content, headings: p.headings, title: p.title, space: p.space, deleted: 'TRUE' });
        cache[row.id] = row; patchStore(row); draftClear(row.id);
        ui.toast('Đã chuyển vào Thùng rác.');
        LP.router.go('ghi-chu');
      }, function () { my.dirty = true; ui.toast('Chưa xóa được. Thử lại sau.'); });
    });
  }

  /* ---------- Mục lục và tìm trong tài liệu ---------- */
  function tocHTML() {
    var hs = S.ed.headings();
    return hs.length ? hs.map(function (h) { return '<a href="#" class="gc-toc-i lv' + h.level + '" data-hid="' + esc(h.id) + '">' + esc(h.title || '(chưa có tên)') + '</a>'; }).join('')
      : '<p class="muted gc-none">Chưa có mục nào. Gõ <b>## </b> rồi tên mục để tạo tiêu đề.</p>';
  }
  function buildSide(host, inSheet) {
    host.innerHTML = '<div class="gc-sidebox' + (inSheet ? '' : ' card') + '"><label class="gc-find"><span class="sr-only">Tìm trong tài liệu</span>' + ui.icon('search', 'ic18') +
      '<input type="search" class="gc-find-in" placeholder="Tìm trong tài liệu" autocomplete="off"></label>' +
      '<div class="gc-findbar" hidden><span class="gc-findn num muted"></span><button type="button" class="icon-btn" data-fprev aria-label="Kết quả trước">' + ui.icon('up', 'ic18') + '</button><button type="button" class="icon-btn" data-fnext aria-label="Kết quả sau">' + ui.icon('down', 'ic18') + '</button></div>' +
      '<h2 class="gc-toc-h">Mục lục</h2><nav class="gc-toc" aria-label="Mục lục tài liệu">' + tocHTML() + '</nav></div>';
    var input = host.querySelector('.gc-find-in'), bar = host.querySelector('.gc-findbar'), cnt = host.querySelector('.gc-findn'), toc = host.querySelector('.gc-toc');
    toc.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-hid]'); if (!a) return;
      e.preventDefault();
      if (inSheet) ui.closeSheet();
      S.ed.scrollToHeading(a.getAttribute('data-hid'));
    });
    var hits = [], at = -1, t;
    function run() {
      var q = LP.util.fold(input.value).trim(); hits = []; at = -1; clearHL();
      if (!q) { bar.hidden = true; return; }
      var w = document.createTreeWalker(S.ed.el, NodeFilter.SHOW_TEXT);
      var n;
      while ((n = w.nextNode())) {
        var txt = n.nodeValue, f = '';
        for (var i = 0; i < txt.length; i++) f += LP.util.fold(txt.charAt(i)) || txt.charAt(i);
        if (f.length !== txt.length) f = txt.toLowerCase();
        var from = 0, k;
        while ((k = f.indexOf(q, from)) >= 0) { var r = document.createRange(); r.setStart(n, k); r.setEnd(n, k + q.length); hits.push(r); from = k + q.length; }
      }
      bar.hidden = false;
      paint();
      if (hits.length) go(1);
    }
    function clearHL() { if (window.CSS && CSS.highlights) { CSS.highlights.delete('gc-find'); CSS.highlights.delete('gc-find-cur'); } }
    function paint() {
      cnt.textContent = hits.length ? (at + 1) + '/' + hits.length : 'Không thấy';
      if (window.CSS && CSS.highlights && window.Highlight) {
        CSS.highlights.set('gc-find', new Highlight(...hits));
        if (at >= 0) CSS.highlights.set('gc-find-cur', new Highlight(hits[at]));
      }
    }
    function go(d) {
      if (!hits.length) return;
      at = (at + d + hits.length) % hits.length; paint();
      var el = hits[at].startContainer.parentElement; if (el) el.scrollIntoView({ block: 'center' });
    }
    input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 150); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(e.shiftKey ? -1 : 1); } });
    host.querySelector('[data-fnext]').addEventListener('click', function () { go(1); });
    host.querySelector('[data-fprev]').addEventListener('click', function () { go(-1); });
    if (!inSheet) S.cleanup.push(clearHL);
    return host;
  }
  function refreshToc() {
    if (!S || !S.sideEl) return;
    var toc = S.sideEl.querySelector('.gc-toc'); if (toc) { toc.innerHTML = tocHTML(); spy(); }
    var tsh = document.querySelector('.gc-toc-sheet .gc-toc'); if (tsh) tsh.innerHTML = tocHTML();
  }
  function openTocSheet() {
    var s = ui.sheet('Mục lục', '<div class="gc-toc-sheet"></div>');
    buildSide(s.el.querySelector('.gc-toc-sheet'), true);
  }
  // Mục đang đọc: tiêu đề cuối cùng đã cuộn qua mép trên
  function spy() {
    if (!S || !S.ed) return;
    var cur = '';
    Array.prototype.forEach.call(S.ed.el.querySelectorAll('h1,h2,h3'), function (h) { if (h.getBoundingClientRect().top <= 140) cur = h.getAttribute('data-hid'); });
    Array.prototype.forEach.call(document.querySelectorAll('.gc-toc-i'), function (a) { a.classList.toggle('is-on', a.getAttribute('data-hid') === cur); });
  }

  /* ---------- Gắn tiêu đề với công việc ---------- */
  function placeBtn(h) {
    if (!S || !S.hbtn) return;
    var wrap = S.hbtn.parentNode.getBoundingClientRect(), r = h.getBoundingClientRect();
    S.hbtn.hidden = false; S.hbtn.style.top = Math.max(0, r.top - wrap.top) + 'px'; S.hbtn.hbid = h.getAttribute('data-hid');
  }
  function onSelect() {
    if (!S || !S.ed) return;
    var h = S.ed.headingOfSelection(); if (h) placeBtn(h);
  }
  function headingMenu() {
    var hid = S.hbtn.hbid, el = S.ed.headingEl(hid); if (!el) return;
    var title = el.textContent.trim() || '(chưa có tên)', cur = linkMap(S.doc.id)[hid] || [];
    var s = ui.sheet('Mục: ' + title,
      '<p class="muted">Gắn mục này với một công việc để mở nhanh từ Agenda và Lịch.</p><div class="choice-list">' +
      '<button type="button" class="btn btn-soft" data-pick="routine">Gắn với Daily…</button>' +
      '<button type="button" class="btn btn-soft" data-pick="task">Gắn với Ad-hoc / Personal…</button>' +
      (cur.length ? '<button type="button" class="btn btn-danger" data-pick="unlink">Gỡ ' + cur.length + ' liên kết của mục này</button>' : '') + '</div>');
    s.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pick]'); if (!b) return;
      var k = b.getAttribute('data-pick');
      ui.closeSheet();
      if (k === 'unlink') setLink(hid, null); else pickTarget(hid, k);
    });
  }
  function pickTarget(hid, kind) {
    var st = LP.store.get(), items = kind === 'routine'
      ? st.routines.filter(function (r) { return LP.util.truthy(r.active); }).map(function (r) { return { id: r.id, t: r.name, m: r.group === 'ca_nhan' ? 'Cá nhân' : 'Công việc' }; })
      : st.tasks.filter(function (t) { return t.status === 'todo'; }).map(function (t) { return { id: t.id, t: t.title, m: (t.kind === 'canhan' ? 'Personal' : 'Ad-hoc') + (t.due_date ? ' · hạn ' + LP.date.fmt(t.due_date) : '') }; });
    var s = ui.sheet(kind === 'routine' ? 'Chọn Daily' : 'Chọn Ad-hoc / Personal',
      items.length ? '<div class="choice-list">' + items.map(function (x) { return '<button type="button" class="btn btn-soft gc-pick" data-id="' + esc(x.id) + '"><span>' + esc(x.t) + '</span><small class="muted">' + esc(x.m) + '</small></button>'; }).join('') + '</div>' : '<p class="muted">Chưa có mục nào để gắn.</p>');
    s.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-id]'); if (!b) return;
      ui.closeSheet(); setLink(hid, { kind: kind, id: b.getAttribute('data-id') });
    });
  }
  function setLink(hid, target) {
    var my = S;
    // Lưu tài liệu trước để mục mới có id trong bản lưu, rồi mới ghi liên kết
    S.dirty = true;
    save(true).then(function () {
      if (S !== my) return;
      var st = LP.store.get(), docId = S.doc.id;
      if (!target) {
        st.routines.forEach(function (r) { if (r.doc_id === docId && r.heading_id === hid) LP.store.upsert('Routines', Object.assign({}, r, { doc_id: '', heading_id: '' })); });
        st.tasks.forEach(function (t) { if (t.doc_id === docId && t.heading_id === hid) LP.store.upsert('Tasks', Object.assign({}, t, { doc_id: '', heading_id: '' })); });
      } else {
        var sheet = target.kind === 'routine' ? 'Routines' : 'Tasks', list = target.kind === 'routine' ? st.routines : st.tasks;
        var r = list.filter(function (x) { return x.id === target.id; })[0];
        if (r) LP.store.upsert(sheet, Object.assign({}, r, { doc_id: docId, heading_id: hid }));
      }
      S.ed.setLinks(linkMap(docId)); ui.toast(target ? 'Đã gắn mục với công việc.' : 'Đã gỡ liên kết.');
    });
  }
  function createTask() {
    var text = S.ed.selectionText();
    if (!text) { ui.toast('Bôi đen một đoạn chữ trước, rồi bấm Tạo việc.'); return; }
    var h = S.ed.headingOfSelection(), hid = h ? h.getAttribute('data-hid') : '', docId = S.doc.id;
    S.dirty = true;
    save(true).then(function () {
      if (LP.quickAdd && LP.quickAdd.open) LP.quickAdd.open('adhoc', { title: text.replace(/\s+/g, ' ').slice(0, 120), doc_id: docId, heading_id: hid });
      else ui.toast('Form thêm Ad-hoc đang làm (Phần 5 sẽ nối vào).');
    });
  }

  LP.router.register('ghi-chu', { title: 'Ghi chú', mount: mount, unmount: unmount });
})();

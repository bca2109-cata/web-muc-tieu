/* V2 · Phần 3 · trình soạn tài liệu (contenteditable, không thư viện).
   LP.editor.sanitize(html)            lọc HTML (dán từ Word / Google Docs, nạp từ Sheet) chỉ giữ thẻ an toàn
   LP.editor.toHTML(content, heads)    nội dung lưu -> HTML hiện (chữ thô kiểu "# Tiêu đề" của dữ liệu mẫu cũ được đổi sang HTML)
   LP.editor.create(host, opts)        gắn trình soạn vào host. opts: { onChange(), onSelect() }
   LP.editor.toolbar(ed, opts)         thanh công cụ. opts: { onCreateTask() }
   Mỗi tiêu đề (h1-h3) có data-hid cố định: đổi tên tiêu đề không đổi id. */
var LP = window.LP || (window.LP = {});

LP.editor = (function () {
  var esc = LP.util.esc;
  var DROP = { script: 1, style: 1, meta: 1, link: 1, head: 1, title: 1, xml: 1, object: 1, iframe: 1, embed: 1, noscript: 1, template: 1, svg: 1, math: 1, img: 1, video: 1, audio: 1, canvas: 1, form: 1, input: 1, button: 1, select: 1, textarea: 1 };
  var BLOCKS = 'p,div,h1,h2,h3,h4,h5,h6,ul,ol,table,blockquote,li,tr';
  var KEEP_INLINE = { b: 1, strong: 1, i: 1, em: 1 };

  function newId() { return 'h-' + LP.util.uid(); }
  function safeId(v) { return /^[A-Za-z0-9_-]{1,40}$/.test(v || '') ? v : ''; }

  /* ---------- Lọc HTML ---------- */
  function sanitize(html) {
    var src = new DOMParser().parseFromString('<body>' + String(html == null ? '' : html) + '</body>', 'text/html').body;
    var doc = document.implementation.createHTMLDocument(''), dst = doc.body;
    (function walk(from, to) {
      Array.prototype.forEach.call(from.childNodes, function (n) {
        if (n.nodeType === 3) { to.appendChild(doc.createTextNode(n.nodeValue)); return; }
        if (n.nodeType !== 1) return;
        var t = n.tagName.toLowerCase(), st = (n.getAttribute('style') || '').toLowerCase();
        if (DROP[t] || /^o:|^w:/.test(t)) return;
        var out = null;
        if (t === 'h1' || t === 'h2' || t === 'h3') { out = doc.createElement(t); var hid = safeId(n.getAttribute('data-hid')); if (hid) out.setAttribute('data-hid', hid); }
        else if (t === 'h4' || t === 'h5' || t === 'h6') out = doc.createElement('h3');
        else if (t === 'p') out = doc.createElement('p');
        else if (t === 'div') out = n.querySelector(BLOCKS) ? null : doc.createElement('p');
        else if (t === 'br') out = doc.createElement('br');
        else if (t === 'b' || t === 'strong') out = /font-weight:\s*(normal|400)/.test(st) ? null : doc.createElement(t);
        else if (t === 'i' || t === 'em') out = doc.createElement(t);
        else if (t === 'span') {
          if (/font-weight:\s*(bold|[6-9]00)/.test(st)) out = doc.createElement('b');
          else if (/font-style:\s*italic/.test(st)) out = doc.createElement('i');
        }
        else if (t === 'ul' || t === 'ol') { out = doc.createElement(t); if (t === 'ul' && n.classList.contains('todo')) out.className = 'todo'; }
        else if (t === 'li') { out = doc.createElement('li'); var dn = n.getAttribute('data-done'); if (dn === 'true' || dn === 'false') out.setAttribute('data-done', dn); }
        else if (t === 'table' || t === 'tbody' || t === 'thead' || t === 'tr' || t === 'td' || t === 'th') out = doc.createElement(t);
        else if (t === 'blockquote') { out = doc.createElement('blockquote'); if (n.classList.contains('callout')) out.className = 'callout'; }
        else if (t === 'a') {
          var href = (n.getAttribute('href') || '').trim();
          if (/^(https?:|mailto:)/i.test(href)) { out = doc.createElement('a'); out.setAttribute('href', href); out.setAttribute('target', '_blank'); out.setAttribute('rel', 'noopener noreferrer'); }
        }
        if (out) { to.appendChild(out); walk(n, out); } else walk(n, to);
      });
    })(src, dst);
    normalizeRoot(dst);
    return dst.innerHTML;
  }

  // Chữ và thẻ chữ nằm lẻ ở gốc thì bọc vào <p>; bỏ khoảng trắng thừa giữa các khối
  function normalizeRoot(root) {
    var kids = Array.prototype.slice.call(root.childNodes), run = null;
    kids.forEach(function (n) {
      var isBlock = n.nodeType === 1 && /^(h[1-3]|p|ul|ol|table|blockquote)$/i.test(n.tagName);
      if (isBlock) { run = null; return; }
      if (n.nodeType === 3 && !n.nodeValue.trim() && !run) { n.parentNode.removeChild(n); return; }
      if (!run) { run = root.ownerDocument.createElement('p'); root.insertBefore(run, n); }
      run.appendChild(n);
    });
  }

  /* ---------- Chữ thô kiểu cũ -> HTML ---------- */
  function fromLegacy(text, heads) {
    var used = {}, out = [], list = null;
    function flush() { if (list) { out.push('<ul>' + list.join('') + '</ul>'); list = null; } }
    String(text).split('\n').forEach(function (line) {
      var m = /^(#{1,3})\s+(.*)$/.exec(line), li = /^\s*[-*]\s+(.*)$/.exec(line);
      if (m) {
        flush();
        var title = m[2].trim(), h = (heads || []).filter(function (x) { return x.title === title && !used[x.id]; })[0];
        if (h) used[h.id] = 1;
        out.push('<h' + m[1].length + (h && safeId(h.id) ? ' data-hid="' + h.id + '"' : '') + '>' + esc(title) + '</h' + m[1].length + '>');
      } else if (li) { (list = list || []).push('<li>' + esc(li[1]) + '</li>'); }
      else { flush(); if (line.trim()) out.push('<p>' + esc(line) + '</p>'); }
    });
    flush();
    return out.join('');
  }
  function toHTML(content, heads) {
    var c = String(content == null ? '' : content);
    if (!c.trim()) return '<p><br></p>';
    var html = /<(h[1-3]|p|div|ul|ol|table|blockquote|br)[\s>\/]/i.test(c) ? sanitize(c) : fromLegacy(c, heads);
    return html || '<p><br></p>';
  }
  function textToHtml(t) {
    return String(t).replace(/\r/g, '').split('\n').map(function (l) { return '<p>' + (l ? esc(l) : '<br>') + '</p>'; }).join('');
  }

  /* ---------- Trình soạn ---------- */
  function create(host, opts) {
    opts = opts || {};
    var root = host, savedRange = null;
    root.setAttribute('contenteditable', 'true');
    root.setAttribute('spellcheck', 'false');
    root.setAttribute('role', 'textbox');
    root.setAttribute('aria-multiline', 'true');
    root.setAttribute('aria-label', 'Nội dung tài liệu');
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); document.execCommand('styleWithCSS', false, false); } catch (e) { /* bỏ qua */ }

    function sel() { return window.getSelection(); }
    function inside(node) { return !!node && root.contains(node); }
    function topBlock(node) {
      while (node && node.parentNode !== root) node = node.parentNode;
      return node && node.nodeType === 1 ? node : null;
    }
    function setCaret(el, atEnd) {
      var r = document.createRange(); r.selectNodeContents(el); r.collapse(!atEnd);
      var s = sel(); s.removeAllRanges(); s.addRange(r);
    }
    function ensureHids() {
      var seen = {};
      Array.prototype.forEach.call(root.querySelectorAll('h1,h2,h3'), function (h) {
        var id = h.getAttribute('data-hid');
        if (!id || seen[id]) { id = newId(); h.setAttribute('data-hid', id); }
        seen[id] = 1;
      });
      if (!root.firstChild) root.innerHTML = '<p><br></p>';
    }
    // Chrome đôi khi chèn <ul>, <table>... vào trong <p>. Gỡ thẻ <p> thừa, giữ nguyên vị trí con trỏ
    function unnest() {
      var s = sel(), a = s.rangeCount && inside(s.anchorNode) ? [s.anchorNode, s.anchorOffset, s.focusNode, s.focusOffset] : null, moved = false, p;
      while ((p = root.querySelector('p > :is(ul,ol,table,blockquote,h1,h2,h3,p)')) && (p = p.parentNode)) {
        while (p.firstChild) p.parentNode.insertBefore(p.firstChild, p);
        p.parentNode.removeChild(p); moved = true;
      }
      if (moved && a && root.contains(a[0]) && root.contains(a[2])) s.setBaseAndExtent(a[0], a[1], a[2], a[3]);
    }
    function fire() { unnest(); ensureHids(); if (opts.onChange) opts.onChange(); }
    function focus() {
      root.focus();
      if (savedRange && (!sel().rangeCount || !inside(sel().anchorNode))) { var s = sel(); s.removeAllRanges(); s.addRange(savedRange); }
    }
    function rememberRange() { var s = sel(); if (s.rangeCount && inside(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange(); }
    function currentBlock() { var s = sel(); return s.rangeCount ? topBlock(s.anchorNode) : null; }

    // Đổi loại khối nhưng giữ id tiêu đề cũ
    function setBlock(tag) {
      var b = currentBlock(), hid = b && b.getAttribute && b.getAttribute('data-hid');
      if (b && b.tagName.toLowerCase() === tag && tag !== 'p') tag = 'p';
      document.execCommand('formatBlock', false, tag);
      var nb = currentBlock();
      if (hid && nb && /^h[1-3]$/i.test(nb.tagName)) nb.setAttribute('data-hid', hid);
    }
    function closest(sel0) { var s = sel(); var n = s.anchorNode; if (n && n.nodeType === 3) n = n.parentNode; return n && inside(n) ? n.closest(sel0) : null; }
    function toTodo(ul) {
      if (!ul) return;
      ul.className = 'todo';
      Array.prototype.forEach.call(ul.children, function (li) { if (!li.getAttribute('data-done')) li.setAttribute('data-done', 'false'); });
    }
    function listCmd(kind) {
      var ul = closest('ul.todo');
      if (kind === 'todo') {
        if (ul) { document.execCommand('insertUnorderedList'); }
        else {
          if (!closest('ul')) document.execCommand('insertUnorderedList');
          toTodo(closest('ul'));
        }
      } else if (kind === 'ul') {
        if (ul) { ul.removeAttribute('class'); Array.prototype.forEach.call(ul.children, function (li) { li.removeAttribute('data-done'); }); }
        else document.execCommand('insertUnorderedList');
      } else document.execCommand('insertOrderedList');
    }

    function command(name, arg) {
      focus();
      if (name === 'h1' || name === 'h2' || name === 'h3' || name === 'p') setBlock(name);
      else if (name === 'bold') document.execCommand('bold');
      else if (name === 'italic') document.execCommand('italic');
      else if (name === 'ul' || name === 'ol' || name === 'todo') listCmd(name);
      else if (name === 'table') {
        var cell = '<td><br></td>', head = '<th><br></th>';
        document.execCommand('insertHTML', false, '<table><tbody><tr>' + head + head + head + '</tr><tr>' + cell + cell + cell + '</tr></tbody></table><p><br></p>');
      } else if (name === 'callout') {
        var bq = closest('blockquote.callout');
        if (bq) setBlock('p');
        else { document.execCommand('formatBlock', false, 'blockquote'); var q = closest('blockquote'); if (q) q.className = 'callout'; }
      } else if (name === 'link') {
        var url = String(arg || '').trim();
        if (!url) document.execCommand('unlink');
        else {
          if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;
          if (/^(https?:|mailto:)/i.test(url)) {
            if (sel().isCollapsed) document.execCommand('insertHTML', false, '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(url) + '</a>');
            else document.execCommand('createLink', false, url);
          }
        }
      }
      rememberRange();
      fire();
    }

    /* Phím tắt Markdown: "## ", "- ", "1. ", "[] " ở đầu một khối trống */
    function shortcut() {
      var s = sel(); if (!s.rangeCount || !s.isCollapsed || !inside(s.anchorNode)) return;
      var b = topBlock(s.anchorNode);
      if (!b || !/^(p|div)$/i.test(b.tagName)) return;
      var m = /^(#{1,3}|-|\*|1\.|\[\]) $/.exec(b.textContent.replace(/\u00a0/g, ' '));
      if (!m) return;
      b.innerHTML = '<br>'; setCaret(b, false);
      var k = m[1];
      if (k.charAt(0) === '#') setBlock('h' + k.length);
      else if (k === '-' || k === '*') document.execCommand('insertUnorderedList');
      else if (k === '1.') document.execCommand('insertOrderedList');
      else { document.execCommand('insertUnorderedList'); toTodo(closest('ul')); }
    }

    root.addEventListener('input', function (e) {
      if (e.inputType === 'insertText' && e.data === ' ') shortcut();
      fire();
    });
    root.addEventListener('keyup', function () { rememberRange(); if (opts.onSelect) opts.onSelect(); });
    root.addEventListener('mouseup', function () { rememberRange(); if (opts.onSelect) opts.onSelect(); });
    root.addEventListener('blur', rememberRange);
    root.addEventListener('click', function (e) {
      var li = e.target.closest && e.target.closest('ul.todo > li');
      if (li && inside(li) && e.clientX - li.getBoundingClientRect().left < 30) {
        li.setAttribute('data-done', li.getAttribute('data-done') === 'true' ? 'false' : 'true');
        fire(); return;
      }
      var a = e.target.closest && e.target.closest('a[href]');
      if (a && (e.ctrlKey || e.metaKey)) { window.open(a.href, '_blank', 'noopener'); e.preventDefault(); }
    });
    root.addEventListener('paste', function (e) {
      var cd = e.clipboardData; if (!cd) return;
      var html = cd.getData('text/html'), text = cd.getData('text/plain');
      e.preventDefault();
      var out = html ? sanitize(html) : '';
      if (!out.trim()) { if (text.indexOf('\n') < 0) { document.execCommand('insertText', false, text); fire(); return; } out = textToHtml(text); }
      var one = /^<p>((?:(?!<\/p>)[\s\S])*)<\/p>$/.exec(out);
      document.execCommand('insertHTML', false, one ? one[1] : out);
      fire();
    });
    root.addEventListener('drop', function (e) {
      e.preventDefault();
      var t = e.dataTransfer && e.dataTransfer.getData('text/plain');
      if (t) { focus(); document.execCommand('insertText', false, t); fire(); }
    });

    function setHTML(html) { root.innerHTML = html || '<p><br></p>'; ensureHids(); }
    // Chuỗi lưu: bỏ nhãn "Gắn với" và dấu nháy mục, giữ nguyên phần còn lại
    function getHTML() {
      var c = root.cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll('[data-link]'), function (x) { x.removeAttribute('data-link'); });
      Array.prototype.forEach.call(c.querySelectorAll('.is-hit'), function (x) { x.classList.remove('is-hit'); if (!x.getAttribute('class')) x.removeAttribute('class'); });
      return c.innerHTML;
    }
    function headings() {
      return Array.prototype.map.call(root.querySelectorAll('h1,h2,h3'), function (h) {
        return { id: h.getAttribute('data-hid'), level: +h.tagName.charAt(1), title: h.textContent.trim() };
      });
    }
    function setLinks(map) {
      Array.prototype.forEach.call(root.querySelectorAll('h1,h2,h3'), function (h) {
        var v = map && map[h.getAttribute('data-hid')];
        if (v && v.length) h.setAttribute('data-link', v.map(function (x) { return 'Gắn với ' + x; }).join(' · ')); else h.removeAttribute('data-link');
      });
    }
    function headingEl(hid) { return hid ? root.querySelector('[data-hid="' + String(hid).replace(/"/g, '') + '"]') : null; }
    function scrollToHeading(hid, flash) {
      var h = headingEl(hid); if (!h) return false;
      h.scrollIntoView({ block: 'start' });
      if (flash !== false) { h.classList.add('is-hit'); setTimeout(function () { h.classList.remove('is-hit'); if (!h.getAttribute('class')) h.removeAttribute('class'); }, 1800); }
      return true;
    }
    // Tiêu đề đứng gần nhất phía trên vị trí con trỏ (hoặc vùng bôi đen)
    function headingOfSelection() {
      var s = sel(), n = s.rangeCount && inside(s.anchorNode) ? topBlock(s.anchorNode) : (savedRange ? topBlock(savedRange.startContainer) : null);
      while (n) { if (/^H[1-3]$/.test(n.tagName)) return n; n = n.previousElementSibling; }
      return null;
    }
    function selectionText() {
      var s = sel();
      if (s.rangeCount && !s.isCollapsed && inside(s.anchorNode)) return s.toString().trim();
      return savedRange && !savedRange.collapsed ? savedRange.toString().trim() : '';
    }
    function stats() {
      var t = root.textContent.trim();
      return { words: t ? t.split(/\s+/).length : 0, sections: root.querySelectorAll('h1,h2,h3').length };
    }

    return {
      el: root, setHTML: setHTML, getHTML: getHTML, headings: headings, setLinks: setLinks, command: command, focus: focus,
      scrollToHeading: scrollToHeading, headingEl: headingEl, headingOfSelection: headingOfSelection, selectionText: selectionText,
      rememberRange: rememberRange, stats: stats, ensureHids: ensureHids,
      state: function () {
        var b = currentBlock(), tag = b && b.tagName ? b.tagName.toLowerCase() : '', r = {};
        r[tag] = true;
        try { r.bold = document.queryCommandState('bold'); r.italic = document.queryCommandState('italic'); } catch (e) { /* bỏ qua */ }
        r.ul = !!closest('ul:not(.todo)'); r.ol = !!closest('ol'); r.todo = !!closest('ul.todo'); r.callout = !!closest('blockquote.callout'); r.table = !!closest('table');
        return r;
      }
    };
  }

  /* ---------- Thanh công cụ ---------- */
  var BUTTONS = [
    ['h1', 'H1', 'Tiêu đề lớn (H1)'], ['h2', 'H2', 'Tiêu đề vừa (H2)'], ['h3', 'H3', 'Tiêu đề nhỏ (H3)'],
    ['bold', '<b>B</b>', 'Đậm'], ['italic', '<i>I</i>', 'Nghiêng'],
    ['ul', 'list', 'Danh sách'], ['ol', '1.', 'Đánh số'], ['todo', 'check', 'Việc cần làm'],
    ['table', 'grid', 'Bảng'], ['link', 'Link', 'Chèn link'], ['callout', 'note', 'Khung chú ý']
  ];
  function toolbar(ed, opts) {
    opts = opts || {};
    var bar = document.createElement('div');
    bar.className = 'gc-tools'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Công cụ soạn');
    bar.innerHTML = BUTTONS.map(function (b) {
      var face = LP.ui.ICONS[b[1]] ? LP.ui.icon(b[1], 'ic18') : b[1];
      return '<button type="button" class="gc-tool" data-cmd="' + b[0] + '" title="' + esc(b[2]) + '" aria-label="' + esc(b[2]) + '">' + face + '</button>';
    }).join('') + '<span class="gc-tools-gap"></span><button type="button" class="gc-tool gc-tool-task" data-cmd="task" title="Tạo việc từ đoạn bôi đen">' + LP.ui.icon('plus', 'ic18') + '<span>Tạo việc</span></button>';
    // Giữ vùng bôi đen khi bấm nút
    bar.addEventListener('mousedown', function (e) { if (e.target.closest('.gc-tool')) e.preventDefault(); });
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cmd]'); if (!b) return;
      var c = b.getAttribute('data-cmd');
      if (c === 'link') linkDialog(ed);
      else if (c === 'task') { if (opts.onCreateTask) opts.onCreateTask(); }
      else ed.command(c);
      refresh();
    });
    function refresh() {
      var st = ed.state();
      Array.prototype.forEach.call(bar.querySelectorAll('[data-cmd]'), function (b) {
        var c = b.getAttribute('data-cmd'); b.classList.toggle('is-on', !!st[c]);
      });
    }
    document.addEventListener('selectionchange', refresh);
    bar.destroy = function () { document.removeEventListener('selectionchange', refresh); };
    return bar;
  }

  function linkDialog(ed) {
    ed.rememberRange();
    var s = LP.ui.sheet('Chèn link',
      '<label class="field"><span>Địa chỉ</span><input class="input" type="text" inputmode="url" placeholder="https://" autofocus></label>' +
      '<div class="modal-foot"><button type="button" class="btn btn-danger" data-unlink>Gỡ link</button><span class="spacer"></span><button type="button" class="btn btn-primary" data-ok>Chèn</button></div>');
    var inp = s.el.querySelector('input');
    function done(url) { LP.ui.closeSheet(); ed.command('link', url); }
    s.el.querySelector('[data-ok]').addEventListener('click', function () { if (inp.value.trim()) done(inp.value); });
    s.el.querySelector('[data-unlink]').addEventListener('click', function () { done(''); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && inp.value.trim()) { e.preventDefault(); done(inp.value); } });
  }

  return { sanitize: sanitize, toHTML: toHTML, create: create, toolbar: toolbar };
})();

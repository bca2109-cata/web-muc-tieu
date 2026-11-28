/* V2 · Phần 5 · màn Daily (mẫu công việc lặp lại), route `mau`. Mở từ Cài đặt, từ tìm kiếm (#/mau?id=...).
   Xuất ra:
     LP.views.editItemQuick(routineId, itemId, date) tấm trượt sửa nhanh giờ hoặc tên một hạng mục, hỏi "Chỉ hôm nay / Từ nay về sau".
       date = ngày của lượt cần sửa (mặc định hôm nay). Hạng mục +1 thì truyền ngày của lượt gốc.
     LP.p5 (dùng chung với them-nhanh.js, cai-dat.js): chọn tài liệu và mục, ghi chú theo quy tắc `valid_from`/`valid_to`.
   Quy tắc dữ liệu (hợp đồng mục 5): sửa mẫu "từ nay về sau" thì đóng `valid_to` của hạng mục cũ và tạo hạng mục mới, không sửa đè,
   để lịch sử các ngày cũ giữ nguyên. Dòng RoutineChecks của hạng mục cũ từ ngày áp dụng trở đi được chuyển sang hạng mục mới. */
var LP = window.LP || (window.LP = {});
LP.views = LP.views || {};

(function () {
  var D = LP.date, esc = LP.util.esc, ui = LP.ui, icon = ui.icon, num = LP.util.num;
  var S = null;   // trạng thái màn đang mở

  /* ================= Dùng chung với them-nhanh.js và cai-dat.js ================= */
  var docsCache = null;
  function docs() {
    return (docsCache || LP.store.get().docs).filter(function (d) { return !LP.util.truthy(d.deleted); })
      .sort(function (a, b) { return num(a.sort_order) - num(b.sort_order); });
  }
  function refreshDocs() {
    return LP.api.docsIndex().then(function (rows) { docsCache = rows || []; return docs(); }, function () { return docs(); });
  }
  function headsOf(doc) { try { var h = JSON.parse((doc && doc.headings) || '[]'); return Array.isArray(h) ? h : []; } catch (e) { return []; } }
  function docPickerHTML(label) {
    return '<div class="field p5-docpick"><span>' + icon('note', 'ic18') + esc(label || 'Ghi chú gắn kèm') + '</span><div class="row2">' +
      '<select class="select" data-f="doc_id" aria-label="Tài liệu"></select>' +
      '<select class="select" data-f="heading_id" aria-label="Mục trong tài liệu"></select></div></div>';
  }
  function bindDocPicker(root, docId, headingId) {
    var ds = root.querySelector('[data-f="doc_id"]'), hs = root.querySelector('[data-f="heading_id"]');
    function fillDocs(cur) {
      var list = docs(), h = '<option value="">Không gắn</option>', found = !cur;
      list.forEach(function (d) { if (d.id === cur) found = true; h += '<option value="' + esc(d.id) + '">' + esc(d.title || 'Chưa đặt tên') + '</option>'; });
      if (!found) h += '<option value="' + esc(cur) + '">(tài liệu đã chọn)</option>';
      ds.innerHTML = h; ds.value = cur || '';
    }
    function fillHeads(cur) {
      var doc = docs().filter(function (d) { return d.id === ds.value; })[0], h = '<option value="">Cả tài liệu</option>', found = !cur;
      headsOf(doc).forEach(function (x) { if (x.id === cur) found = true; h += '<option value="' + esc(x.id) + '">' + esc(x.title) + '</option>'; });
      if (!found && cur) h += '<option value="' + esc(cur) + '">(mục đã chọn)</option>';
      hs.innerHTML = h; hs.value = cur || ''; hs.disabled = !ds.value;
    }
    ds.addEventListener('change', function () { fillHeads(''); });
    fillDocs(docId || ''); fillHeads(headingId || '');
    refreshDocs().then(function () {
      if (!document.body.contains(ds)) return;
      var d = ds.value, h = hs.value; fillDocs(d); fillHeads(h);
    });
  }

  // Sửa một hạng mục cho các lượt từ `from` đến `to` ('' = mãi mãi), giữ lịch sử bằng valid_from/valid_to.
  // Phần trước `from` và phần sau `to` giữ giá trị cũ. Trả dòng hạng mục mới (phần giữa).
  function reviseItem(it, patch, from, to) {
    var st = LP.store, oldFrom = it.valid_from || '', oldTo = it.valid_to || '', mid, after = null;
    var hasBefore = !oldFrom || oldFrom < from;
    var midFrom = hasBefore ? from : oldFrom;
    var hasAfter = !!to && (!oldTo || D.add(to, 1) <= oldTo);
    var midTo = to ? (oldTo && oldTo < to ? oldTo : to) : oldTo;
    if (hasBefore) st.upsert('RoutineItems', Object.assign({}, it, { valid_to: D.add(from, -1) }));
    mid = Object.assign({}, it, patch, { valid_from: midFrom, valid_to: midTo });
    if (hasBefore) { delete mid.id; delete mid.created_at; }
    mid = st.upsert('RoutineItems', mid);
    if (hasAfter) {
      var a = Object.assign({}, it, { valid_from: D.add(to, 1), valid_to: oldTo }); delete a.id; delete a.created_at;
      after = st.upsert('RoutineItems', a);
    }
    if (hasBefore || hasAfter) {
      // Dòng ghi nhận của hạng mục cũ nằm trong khoảng nào thì chuyển sang bản của khoảng đó
      st.get().routineChecks.filter(function (c) { return c.item_id === it.id; }).forEach(function (c) {
        var dest = null;
        if (hasBefore && c.run_date >= midFrom && (!midTo || c.run_date <= midTo)) dest = mid;
        else if (after && c.run_date >= after.valid_from) dest = after;
        if (dest && dest.id !== c.item_id) st.upsert('RoutineChecks', Object.assign({}, c, { item_id: dest.id }));
      });
    }
    return mid;
  }
  // Bỏ hạng mục từ ngày `from`: chưa từng có hiệu lực trước đó thì xóa mềm, không thì đóng valid_to
  function closeItem(it, from) {
    if (it.valid_from && it.valid_from >= from) LP.store.remove('RoutineItems', it.id);
    else LP.store.upsert('RoutineItems', Object.assign({}, it, { valid_to: D.add(from, -1) }));
  }
  LP.p5 = { docs: docs, refreshDocs: refreshDocs, headsOf: headsOf, docPickerHTML: docPickerHTML, bindDocPicker: bindDocPicker, reviseItem: reviseItem, closeItem: closeItem };

  /* ================= Hiển thị danh sách ================= */
  var WD = ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  function weekdaysText(s) {
    var ds = String(s || '').split(',').map(function (x) { return parseInt(x, 10); }).filter(function (n) { return n >= 1 && n <= 7; }).sort(), out = [], i = 0;
    ds = ds.filter(function (n, k) { return ds.indexOf(n) === k; });
    while (i < ds.length) {
      var j = i; while (j + 1 < ds.length && ds[j + 1] === ds[j] + 1) j++;
      out.push(j - i >= 2 ? WD[ds[i]] + '–' + WD[ds[j]] : ds.slice(i, j + 1).map(function (n) { return WD[n]; }).join(', '));
      i = j + 1;
    }
    return out.join(', ');
  }
  function repeatText(r) {
    if (r.repeat === 'month_range') return 'Ngày ' + r.month_from + '–' + r.month_to + ' hàng tháng';
    return weekdaysText(r.weekdays) || 'Chưa chọn thứ';
  }
  function currentItems(r, date) { return LP.logic.routines.itemsOf(r, date || D.today()); }
  function sortedRoutines() {
    return LP.store.get().routines.slice().sort(function (a, b) { return num(a.sort_order) - num(b.sort_order); });
  }

  function listHTML() {
    var all = sortedRoutines(), cur = S && S.id;
    var groups = [['cong_viec', 'Công việc'], ['ca_nhan', 'Cá nhân']];
    return groups.map(function (g) {
      var rows = all.filter(function (r) { return (r.group || 'cong_viec') === g[0]; });
      return '<section class="mc-group"><h2>' + g[1] + '</h2>' + (rows.length ? '<ul class="mc-rows">' + rows.map(function (r) {
        var on = LP.util.truthy(r.active), n = currentItems(r).length;
        return '<li><button type="button" class="mc-row' + (r.id === cur ? ' is-on' : '') + (on ? '' : ' is-off') + '" data-id="' + esc(r.id) + '">' +
          '<span class="mc-row-main"><span class="mc-row-name">' + LP.cute.html(r.name, 'clipboard') + esc(r.name) + '</span>' +
          '<span class="mc-row-sub muted">' + n + ' hạng mục · ' + esc(repeatText(r)) + '</span></span>' +
          (on ? '' : ui.pill('Tạm dừng', 'undone')) + '</button></li>';
      }).join('') + '</ul>' : '<p class="muted mc-none">Chưa có Daily nào.</p>') + '</section>';
    }).join('');
  }

  /* ================= Form sửa ================= */
  function itemRowHTML(it) {
    it = it || {};
    return '<li class="mc-item" data-src="' + esc(it.id || '') + '" data-title="' + esc(it.title || '') + '">' +
      '<span class="mc-grip" title="Kéo để đổi thứ tự">' + icon('sort', 'ic18') + '</span>' +
      '<div class="mc-item-fields">' +
      '<div class="mc-item-top"><input type="text" inputmode="numeric" maxlength="5" placeholder="hh:mm" autocomplete="off" data-time class="input mc-time" data-f="time" aria-label="Giờ" value="' + esc(it.time || '') + '">' +
      '<input class="input" data-f="title" aria-label="Tên hạng mục" placeholder="Tên hạng mục" value="' + esc(it.title || '') + '"></div>' +
      '<div class="cute-field mc-item-cute">' + LP.cute.picker(it.title || '', 'Biểu tượng') + '</div><div class="mc-item-mid"><select class="select" data-f="day_offset" aria-label="Ngày làm"><option value="0">Cùng ngày</option><option value="1"' + (parseInt(it.day_offset, 10) > 0 ? ' selected' : '') + '>+1 ngày</option></select>' +
      '<label class="mc-est"><input type="number" class="input" data-f="est_min" min="0" step="5" aria-label="Thời lượng ước tính (phút)" placeholder="0" value="' + esc(it.est_min || '') + '"><span class="muted">phút</span></label></div>' +
      '<input class="input" data-f="note" aria-label="Lưu ý" placeholder="Lưu ý ngắn" value="' + esc(it.note || '') + '">' +
      '<input class="input" data-f="link" aria-label="Link" placeholder="Link (https://...)" value="' + esc(it.link || '') + '"></div>' +
      '<div class="mc-item-act"><button type="button" class="icon-btn" data-act="up" aria-label="Lên">' + icon('up', 'ic18') + '</button>' +
      '<button type="button" class="icon-btn" data-act="down" aria-label="Xuống">' + icon('down', 'ic18') + '</button>' +
      '<button type="button" class="icon-btn" data-act="del" aria-label="Xóa hạng mục">' + icon('trash', 'ic18') + '</button></div></li>';
  }

  function formHTML(r, isNew) {
    r = r || { name: '', group: 'cong_viec', repeat: 'weekday', weekdays: '1,2,3,4,5,6', month_from: '', month_to: '', done_before: '', importance: 1, doc_id: '', heading_id: '', active: 'TRUE' };
    var wds = String(r.weekdays || '').split(',').map(function (x) { return x.trim(); });
    var items = isNew ? [] : currentItems(r);
    var imp = parseInt(r.importance, 10) || 1;
    var h = '<form class="card mc-form" id="mc-form" novalidate>' +
      '<div class="mc-form-head"><button type="button" class="icon-btn mc-back" data-back aria-label="Về danh sách">' + icon('back') + '</button>' +
      '<h1>' + (isNew ? 'Daily mới' : esc(r.name)) + '</h1></div>' +
      '<label class="field is-req"><span>Tên</span><input class="input" id="mc-name" value="' + esc(r.name) + '" placeholder="Ví dụ: Chia số AI Class" autocomplete="off"></label>' +
      '<div class="field cute-field" id="mc-cute">' + LP.cute.picker(r.name, 'Biểu tượng của Daily', 'clipboard') + '</div>' +
      '<div class="field"><span>Nhóm</span><div class="seg" role="radiogroup" aria-label="Nhóm">' +
      [['cong_viec', 'Công việc'], ['ca_nhan', 'Cá nhân']].map(function (g) {
        return '<label><input type="radio" name="mc-group" value="' + g[0] + '"' + ((r.group || 'cong_viec') === g[0] ? ' checked' : '') + '><span>' + g[1] + '</span></label>';
      }).join('') + '</div></div>' +
      docPickerHTML('Ghi chú gắn kèm') +
      '<div class="row2"><div class="field"><span>Mức quan trọng</span>' + ui.importancePicker('mc-imp', imp) + '</div>' +
      '<label class="field"><span>' + icon('clock', 'ic18') + 'Xong trước</span><input type="text" inputmode="numeric" maxlength="5" placeholder="hh:mm" autocomplete="off" data-time class="input" id="mc-before" value="' + esc(r.done_before || '') + '"></label></div>' +
      '<div class="field"><span>' + icon('refresh', 'ic18') + 'Lặp lại</span><div class="seg" role="radiogroup" aria-label="Kiểu lặp">' +
      '<label><input type="radio" name="mc-repeat" value="weekday"' + (r.repeat !== 'month_range' ? ' checked' : '') + '><span>Theo thứ</span></label>' +
      '<label><input type="radio" name="mc-repeat" value="month_range"' + (r.repeat === 'month_range' ? ' checked' : '') + '><span>Theo khoảng ngày trong tháng</span></label></div></div>' +
      '<div class="field mc-wd" data-for="weekday"><div class="chips" role="group" aria-label="Các thứ">' +
      [1, 2, 3, 4, 5, 6, 7].map(function (n) { return '<label><input type="checkbox" value="' + n + '"' + (wds.indexOf(String(n)) >= 0 ? ' checked' : '') + '><span>' + WD[n] + '</span></label>'; }).join('') + '</div></div>' +
      '<div class="row2 mc-mr" data-for="month_range"><label class="field"><span>Từ ngày</span><input type="number" class="input" id="mc-from" min="1" max="31" value="' + esc(r.month_from || '') + '"></label>' +
      '<label class="field"><span>Đến ngày</span><input type="number" class="input" id="mc-to" min="1" max="31" value="' + esc(r.month_to || '') + '"></label></div>' +
      '<div class="mc-items-head"><h2>Hạng mục</h2><span class="muted mc-items-n"></span></div>' +
      '<ul class="mc-items" id="mc-items">' + items.map(itemRowHTML).join('') + '</ul>' +
      '<button type="button" class="btn btn-soft mc-add-item" id="mc-add-item">' + icon('plus', 'ic18') + 'Thêm hạng mục</button>' +
      '<div class="field mc-apply"><span>Áp dụng</span><div class="seg" role="radiogroup" aria-label="Áp dụng từ khi nào">' +
      '<label><input type="radio" name="mc-apply" value="today" checked><span>Từ hôm nay</span></label>' +
      '<label><input type="radio" name="mc-apply" value="tomorrow"><span>Từ ngày mai</span></label></div>' +
      '<small class="muted">Các ngày trước đó giữ nguyên giờ và tên cũ.</small></div>' +
      '<p class="form-error" id="mc-err" role="alert" hidden></p>' +
      '<div class="modal-foot mc-foot">' +
      (isNew ? '' : '<button type="button" class="btn btn-danger" id="mc-del">' + icon('trash', 'ic18') + 'Xóa</button>' +
        '<button type="button" class="btn" id="mc-pause">' + icon(LP.util.truthy(r.active) ? 'pause' : 'play', 'ic18') + (LP.util.truthy(r.active) ? 'Tạm dừng' : 'Bật lại') + '</button>') +
      '<span class="spacer"></span><button type="button" class="btn" data-back>Hủy</button><button type="submit" class="btn btn-primary" id="mc-save">Lưu</button></div></form>';
    return h;
  }

  function bindForm(root, r, isNew) {
    var form = root.querySelector('#mc-form'), list = form.querySelector('#mc-items');
    bindDocPicker(form, r && r.doc_id, r && r.heading_id);
    function err(t, el) {
      var e = form.querySelector('#mc-err');
      if (!t) { ui.clearFieldErrors(form); e.hidden = true; return; }
      if (el) { e.hidden = true; ui.fieldError(el, t); } else { e.textContent = t; e.hidden = false; e.scrollIntoView({ block: 'nearest' }); }
    }
    function countText() { var n = list.children.length; form.querySelector('.mc-items-n').textContent = n ? n + ' mục' : ''; }
    function syncRepeat() {
      var mr = form.querySelector('[name="mc-repeat"]:checked').value === 'month_range';
      form.querySelector('.mc-wd').hidden = mr; form.querySelector('.mc-mr').hidden = !mr;
    }
    Array.prototype.forEach.call(form.querySelectorAll('[name="mc-repeat"]'), function (i) { i.addEventListener('change', syncRepeat); });
    syncRepeat(); countText();

    Array.prototype.forEach.call(form.querySelectorAll('[data-back]'), function (b) { b.addEventListener('click', function () { LP.router.go('mau'); }); });
    form.querySelector('#mc-add-item').addEventListener('click', function () {
      list.insertAdjacentHTML('beforeend', itemRowHTML()); countText();
      var last = list.lastElementChild; last.querySelector('[data-f="title"]').focus();
    });
    list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var li = b.closest('.mc-item'), act = b.getAttribute('data-act');
      if (act === 'del') { li.remove(); countText(); }
      else if (act === 'up' && li.previousElementSibling) list.insertBefore(li, li.previousElementSibling);
      else if (act === 'down' && li.nextElementSibling) list.insertBefore(li.nextElementSibling, li);
      if (act !== 'del') b.focus();
    });
    // Kéo thả đổi thứ tự: chỉ bật khi bấm vào tay nắm, để vẫn bôi đen chữ trong ô nhập được
    var dragging = null;
    list.addEventListener('pointerdown', function (e) { var g = e.target.closest('.mc-grip'); if (g) g.closest('.mc-item').draggable = true; });
    list.addEventListener('dragstart', function (e) {
      var li = e.target.closest && e.target.closest('.mc-item'); if (!li || !li.draggable) return;
      dragging = li; li.classList.add('is-drag');
      try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'mc'); } catch (x) { /* bỏ qua */ }
    });
    list.addEventListener('dragover', function (e) {
      if (!dragging) return; e.preventDefault();
      var over = e.target.closest('.mc-item'); if (!over || over === dragging) return;
      var box = over.getBoundingClientRect(), after = e.clientY > box.top + box.height / 2;
      list.insertBefore(dragging, after ? over.nextSibling : over);
    });
    list.addEventListener('dragend', function () { if (dragging) { dragging.classList.remove('is-drag'); dragging.draggable = false; dragging = null; } });
    list.addEventListener('drop', function (e) { e.preventDefault(); });

    LP.cute.wire(form, function (pick) {
      var li = pick.closest('.mc-item');
      return (li ? li.querySelector('[data-f="title"]') : form.querySelector('#mc-name')).value.trim();
    });
    form.addEventListener('input', function (e) {   // tên đổi thì hình tự chọn đổi theo
      if (e.target.id !== 'mc-name' && e.target.getAttribute('data-f') !== 'title') return;
      var pick = (e.target.closest('.mc-item') || form.querySelector('#mc-cute')).querySelector('.cute-pick');
      if (pick && !LP.cute.read(pick)) pick.querySelector('.cute-now').innerHTML = LP.cute.html(e.target.value.trim(), '');
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); save(form, r, isNew, err); });
    var del = form.querySelector('#mc-del'), pause = form.querySelector('#mc-pause');
    if (pause) pause.addEventListener('click', function () {
      var on = LP.util.truthy(r.active);
      LP.store.upsert('Routines', Object.assign({}, r, { active: on ? '' : 'TRUE' }));
      ui.toast(on ? 'Đã tạm dừng. Lịch sử cũ giữ nguyên.' : 'Đã bật lại.');
      LP.router.go('mau', { id: r.id });
    });
    if (del) del.addEventListener('click', function () {
      ui.confirm('Xóa Daily này?', '"' + r.name + '" sẽ biến mất khỏi Agenda và Lịch. Muốn giữ lịch sử thì chọn Tạm dừng thay vì Xóa.', { ok: 'Xóa', danger: true }).then(function (yes) {
        if (!yes) return;
        LP.store.remove('Routines', r.id);
        ui.toast('Đã xóa "' + r.name + '".');
        LP.router.go('mau');
      });
    });
  }

  function readItems(form) {
    return Array.prototype.map.call(form.querySelectorAll('.mc-item'), function (li, i) {
      var f = function (k) { var el = li.querySelector('[data-f="' + k + '"]'); return el ? el.value.trim() : ''; };
      return { srcId: li.getAttribute('data-src'), sort_order: i + 1, time: f('time'), title: f('title'), day_offset: parseInt(f('day_offset'), 10) || 0,
        est_min: f('est_min'), note: f('note'), link: f('link'), icon: LP.cute.read(li.querySelector('.cute-pick')), oldTitle: li.getAttribute('data-title') || '' };
    });
  }
  var CONTENT = ['time', 'title', 'day_offset', 'est_min', 'note', 'link'];
  function sameContent(it, x) {
    return CONTENT.every(function (k) {
      if (k === 'day_offset') return (parseInt(it.day_offset, 10) || 0) === x.day_offset;
      return String(it[k] == null ? '' : it[k]) === String(x[k] == null ? '' : x[k]);
    });
  }

  function list(form) { return form.querySelectorAll('.mc-item'); }
  function save(form, r, isNew, err) {
    var name = form.querySelector('#mc-name').value.trim();
    var repeat = form.querySelector('[name="mc-repeat"]:checked').value;
    var wds = Array.prototype.filter.call(form.querySelectorAll('.mc-wd input:checked'), function () { return true; }).map(function (i) { return i.value; });
    var from = parseInt(form.querySelector('#mc-from').value, 10), to = parseInt(form.querySelector('#mc-to').value, 10);
    var items = readItems(form);
    if (!name) { err('Nhập tên Daily.', form.querySelector('#mc-name')); return; }
    if (repeat === 'weekday' && !wds.length) { err('Chọn ít nhất một thứ.', form.querySelector('.mc-wd input')); return; }
    if (repeat === 'month_range' && !(from >= 1 && from <= 31 && to >= 1 && to <= 31)) { err('Nhập khoảng ngày từ 1 đến 31.', form.querySelector(!(from >= 1 && from <= 31) ? '#mc-from' : '#mc-to')); return; }
    if (!items.length) { err('Thêm ít nhất một hạng mục.', form.querySelector('#mc-add-item')); return; }
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var li = list(form)[i];
      if (!it.title) { err('Hạng mục ' + (i + 1) + ' chưa có tên.', li.querySelector('[data-f="title"]')); return; }
      if (it.time && !D.isTime(it.time)) { err('Hạng mục ' + (i + 1) + ': giờ chưa đúng.', li.querySelector('[data-f="time"]')); return; }
      if (it.est_min !== '' && !(num(it.est_min, -1) >= 0)) { err('Hạng mục ' + (i + 1) + ': thời lượng chưa đúng.', li.querySelector('[data-f="est_min"]')); return; }
    }
    err('');
    var E = form.querySelector('[name="mc-apply"]:checked').value === 'tomorrow' ? D.add(D.today(), 1) : D.today();
    var all = sortedRoutines().length ? Math.max.apply(null, sortedRoutines().map(function (x) { return num(x.sort_order); })) : 0;
    var row = Object.assign({}, r || {}, {
      name: name, group: form.querySelector('[name="mc-group"]:checked').value, repeat: repeat,
      weekdays: repeat === 'weekday' ? wds.sort().join(',') : '', month_from: repeat === 'month_range' ? from : '', month_to: repeat === 'month_range' ? to : '',
      done_before: form.querySelector('#mc-before').value, importance: form.querySelector('[name="mc-imp"]:checked').value,
      doc_id: form.querySelector('[data-f="doc_id"]').value, heading_id: form.querySelector('[data-f="heading_id"]').value,
      active: isNew ? 'TRUE' : r.active, sort_order: isNew ? all + 1 : r.sort_order
    });
    var saved = LP.store.upsert('Routines', row);
    LP.cute.save(name, LP.cute.read(form.querySelector('#mc-cute .cute-pick')), r && r.name);
    items.forEach(function (x) { LP.cute.save(x.title, x.icon, x.oldTitle); });
    var existing = isNew ? [] : LP.store.get().routineItems.filter(function (x) { return x.routine_id === saved.id && (!x.valid_to || x.valid_to >= E); });
    var keep = {};
    items.forEach(function (x) {
      var src = x.srcId && existing.filter(function (e) { return e.id === x.srcId; })[0];
      var fields = { sort_order: x.sort_order, time: x.time, title: x.title, day_offset: x.day_offset, est_min: x.est_min, note: x.note, link: x.link };
      if (!src) {
        LP.store.upsert('RoutineItems', Object.assign({ routine_id: saved.id, valid_from: E, valid_to: '' }, fields));
      } else {
        keep[src.id] = true;
        if (sameContent(src, x)) { if (num(src.sort_order) !== x.sort_order) LP.store.upsert('RoutineItems', Object.assign({}, src, { sort_order: x.sort_order })); }
        else reviseItem(src, fields, E, '');
      }
    });
    existing.forEach(function (e) { if (!keep[e.id]) closeItem(e, E); });
    ui.toast('Đã lưu "' + name + '".');
    LP.router.go('mau', { id: saved.id });
  }

  /* ================= Màn ================= */
  function mount(el, params) {
    S = { el: el, id: params.id || '' };
    var isNew = S.id === 'new', r = isNew ? null : LP.logic.routines.byId(S.id);
    if (S.id && !isNew && !r) S.id = '';
    el.innerHTML = '<div class="mc" data-tier="' + (S.id ? 'form' : 'list') + '">' +
      '<aside class="mc-list card" aria-label="Danh sách Daily"><div class="mc-list-head"><button type="button" class="icon-btn" data-settings aria-label="Về Cài đặt">' + icon('back') + '</button><h1>Daily</h1>' +
      '<button type="button" class="btn btn-primary" id="mc-new">' + icon('plus', 'ic18') + 'Daily mới</button></div><div class="mc-list-body"></div></aside>' +
      '<section class="mc-main"></section></div>';
    var listBody = el.querySelector('.mc-list-body'), main = el.querySelector('.mc-main');
    listBody.innerHTML = listHTML();
    el.querySelector('[data-settings]').addEventListener('click', function () { LP.router.go('cai-dat'); });
    el.querySelector('#mc-new').addEventListener('click', function () { LP.router.go('mau', { id: 'new' }); });
    listBody.addEventListener('click', function (e) { var b = e.target.closest('[data-id]'); if (b) LP.router.go('mau', { id: b.getAttribute('data-id') }); });
    if (S.id) { main.innerHTML = formHTML(r, isNew); bindForm(main, r, isNew); }
    else main.innerHTML = '<div class="card mc-empty"><div class="ph-flower">' + LP.flowers.html('daisy', 56, 2) + '</div><h2>Daily</h2>' +
      '<p class="muted">Chọn một Daily ở bên trái để sửa, hoặc tạo Daily mới.</p></div>';
  }
  function unmount() { S = null; }
  LP.router.register('mau', { title: 'Daily', mount: mount, unmount: unmount });

  /* ================= Sửa nhanh từ Agenda ================= */
  LP.views.editItemQuick = function (routineId, itemId, date) {
    var it = LP.store.find('RoutineItems', itemId), r = LP.logic.routines.byId(routineId);
    if (!it || !r) { ui.toast('Không tìm thấy hạng mục.'); return; }
    var d = date || D.today();
    var s = ui.sheet('Sửa hạng mục',
      '<p class="muted">' + esc(r.name) + '</p>' +
      '<div class="row2"><label class="field"><span>Giờ</span><input type="text" inputmode="numeric" maxlength="5" placeholder="hh:mm" autocomplete="off" data-time class="input" id="eq-time" value="' + esc(it.time || '') + '"></label>' +
      '<label class="field"><span>Tên</span><input class="input" id="eq-title" value="' + esc(it.title) + '" autocomplete="off"></label></div>' +
      '<div class="field"><span>Áp dụng</span><div class="seg" role="radiogroup" aria-label="Phạm vi">' +
      '<label><input type="radio" name="eq-scope" value="today" checked><span>Chỉ hôm nay</span></label>' +
      '<label><input type="radio" name="eq-scope" value="forward"><span>Từ nay về sau</span></label></div></div>' +
      '<p class="form-error" id="eq-err" hidden></p>' +
      '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn" data-close>Hủy</button><button type="button" class="btn btn-primary" id="eq-ok">Lưu</button></div>');
    s.el.querySelector('#eq-ok').addEventListener('click', function () {
      var time = s.el.querySelector('#eq-time').value, title = s.el.querySelector('#eq-title').value.trim(), er = s.el.querySelector('#eq-err');
      if (!title) { er.textContent = 'Nhập tên hạng mục.'; er.hidden = false; return; }
      if (time && !D.isTime(time)) { er.textContent = 'Giờ chưa đúng.'; er.hidden = false; return; }
      var forward = s.el.querySelector('[name="eq-scope"]:checked').value === 'forward';
      if (time !== (it.time || '') || title !== it.title) reviseItem(it, { time: time, title: title }, d, forward ? '' : d);
      s.close();
      ui.toast(forward ? 'Đã sửa từ nay về sau.' : 'Đã sửa riêng hôm nay.');
    });
  };
})();

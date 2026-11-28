/* V2 · Phần 5 · màn Cài đặt (route `cai-dat`, mở từ bánh răng): ngày làm việc và quỹ giờ, ngày nghỉ, thông báo, giao diện,
   kết nối Google Sheet, sao lưu / khôi phục JSON, Thùng rác (việc và tài liệu).
   Giá trị cài đặt dùng chung nằm trong sheet Settings qua LP.store.setSetting. Giao diện và hoa rơi lưu trên từng thiết bị. */
var LP = window.LP || (window.LP = {});
LP.views = LP.views || {};

(function () {
  var D = LP.date, esc = LP.util.esc, ui = LP.ui, icon = ui.icon, num = LP.util.num, truthy = LP.util.truthy;
  var S = null;

  function set(key, def) { return LP.store.setting(key, def); }
  function section(id, title, ic, body) {
    return '<section class="card cd-card" id="cd-' + id + '"><h2>' + icon(ic, 'ic18') + esc(title) + '</h2>' + body + '</section>';
  }
  function seg(name, opts, cur, label) {
    return '<div class="seg" role="radiogroup" aria-label="' + esc(label) + '">' + opts.map(function (o) {
      return '<label><input type="radio" name="' + name + '" value="' + o[0] + '"' + (String(cur) === String(o[0]) ? ' checked' : '') + '><span>' + esc(o[1]) + '</span></label>';
    }).join('') + '</div>';
  }
  function timeField(key, label, def) {
    return '<label class="field"><span>' + esc(label) + '</span><input type="text" inputmode="numeric" maxlength="5" placeholder="hh:mm" autocomplete="off" data-time class="input" data-set="' + key + '" data-kind="time" value="' + esc(set(key, def)) + '"></label>';
  }
  function minField(key, label, def) {
    var v = num(set(key, def));
    return '<label class="field"><span>' + esc(label) + '</span><span class="cd-min"><input type="number" class="input" data-set="' + key + '" data-kind="min" min="0" step="5" value="' + v + '"><span class="muted">phút</span></span>' +
      '<small class="muted" data-read="' + key + '">= ' + esc(D.fmtMin(v)) + '</small></label>';
  }

  /* ---------- Các khối ---------- */
  function workHTML() {
    return section('work', 'Ngày làm việc', 'clock',
      '<div class="row2">' + timeField('work_start', 'Giờ bắt đầu', '08:00') + timeField('work_end', 'Giờ kết thúc', '17:30') + '</div>' +
      '<div class="row2">' + timeField('lunch_start', 'Nghỉ trưa từ', '12:00') + timeField('lunch_end', 'Nghỉ trưa đến', '13:00') + '</div>' +
      '<div class="row2">' + timeField('evening_start', 'Giờ tối bắt đầu', '19:00') + '<span></span></div>' +
      '<div class="row2">' + minField('quota_work', 'Quỹ Ad-hoc mỗi ngày', 180) + minField('quota_evening', 'Quỹ Personal buổi tối', 90) + '</div>' +
      '<div class="row2">' + minField('quota_off', 'Quỹ Personal ngày nghỉ và Chủ nhật', 240) + '<span></span></div>' +
      '<p class="muted cd-note">Chen ngang trừ vào Quỹ Ad-hoc. Ngày nghỉ và Chủ nhật không có Quỹ Ad-hoc.</p>');
  }
  function offList() {
    var t = D.today(), rows = LP.store.get().daysOff.filter(function (r) { return r.date >= D.add(t, -30); }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    if (!rows.length) return '<p class="muted cd-none">Chưa có ngày nghỉ nào.</p>';
    return '<ul class="cd-list" id="cd-off-list">' + rows.map(function (r) {
      return '<li class="' + (r.date < t ? 'is-past' : '') + '"><span class="num">' + esc(D.weekdayShort(r.date) + ' ' + D.fmtFull(r.date)) + '</span><span class="cd-li-note muted">' + esc(r.note || '') + '</span>' +
        '<button type="button" class="icon-btn" data-off-del="' + esc(r.id) + '" aria-label="Bỏ ngày nghỉ ' + esc(D.fmt(r.date)) + '">' + icon('trash', 'ic18') + '</button></li>';
    }).join('') + '</ul>';
  }
  function offHTML() {
    return section('off', 'Ngày nghỉ', 'calendar',
      '<div id="cd-off-wrap">' + offList() + '</div>' +
      '<div class="cd-off-add"><div class="row2"><label class="field"><span>Từ ngày</span><input type="date" class="input" id="cd-off-from"></label>' +
      '<label class="field"><span>Đến ngày (nếu nghỉ nhiều ngày)</span><input type="date" class="input" id="cd-off-to"></label></div>' +
      '<label class="field"><span>Ghi chú</span><input class="input" id="cd-off-note" placeholder="Ví dụ: Nghỉ phép" autocomplete="off"></label>' +
      '<p class="form-error" id="cd-off-err" role="alert" hidden></p>' +
      '<button type="button" class="btn btn-primary" id="cd-off-add">' + icon('plus', 'ic18') + 'Thêm ngày nghỉ</button></div>');
  }
  function notifyState() {
    var p = LP.notify.permission();
    return p === 'granted' ? 'Trình duyệt đã cho phép thông báo.' : p === 'denied' ? 'Trình duyệt đang chặn thông báo. Mở cài đặt trang web của trình duyệt để cho phép lại.' :
      p === 'unsupported' ? 'Trình duyệt này không hỗ trợ thông báo. Web sẽ nhắc bằng thông báo ngay trong trang.' : 'Chưa xin quyền thông báo của trình duyệt.';
  }
  function notifyHTML() {
    var on = set('notify', '1') !== '0';
    return section('notify', 'Thông báo', 'bell',
      '<label class="chip-toggle cd-toggle"><input type="checkbox" id="cd-notify"' + (on ? ' checked' : '') + '><span>' + icon('bell', 'ic18') + 'Nhắc việc</span></label>' +
      '<p class="muted cd-note" id="cd-notify-state">' + esc(notifyState()) + '</p>' +
      (LP.notify.permission() === 'default' ? '<button type="button" class="btn btn-soft" id="cd-notify-ask">Cho phép thông báo trình duyệt</button>' : ''));
  }
  function lookHTML() {
    return section('look', 'Giao diện', 'sparkle',
      '<div class="field"><span>Chế độ màu</span>' + seg('cd-theme', [['light', 'Sáng'], ['dark', 'Tối'], ['auto', 'Theo máy']], LP.theme.get(), 'Chế độ màu') + '</div>' +
      '<div class="field"><span>' + icon('flower', 'ic18') + 'Hoa rơi</span>' + seg('cd-fall', [['on', 'Luôn bật'], ['system', 'Theo máy'], ['off', 'Tắt']], LP.flowers.getFall(), 'Hoa rơi') + '</div>' +
      '<p class="muted cd-note">Chỉ áp dụng cho thiết bị này.</p>');
  }
  function blocksHTML() {
    return section('blocks', 'Biểu tượng các khối', 'sparkle',
      Object.keys(LP.cute.BLOCKS).map(function (k) {
        var b = LP.cute.BLOCKS[k];
        return '<div class="field cute-field" data-block="' + k + '">' + LP.cute.picker(b[0], b[1], b[2]) + '</div>';
      }).join('') + '<p class="muted cd-note">Hình ở đầu các khối Ad-hoc, Personal và Thói quen trong Agenda.</p>');
  }
  function connectHTML() {
    var mock = LP.config.mock, has = !!LP.settings.getToken();
    return section('connect', 'Kết nối', 'cloud',
      '<p class="cd-conn" id="cd-conn">' + (mock ? icon('cloudoff', 'ic18') + 'Đang dùng dữ liệu mẫu trên trình duyệt, chưa kết nối Google Sheet.' :
        icon('cloud', 'ic18') + (has ? 'Đã có mã bí mật trên thiết bị này.' : 'Chưa nhập mã bí mật.')) + '</p>' +
      (mock ? '' : '<label class="field"><span>' + icon('key', 'ic18') + 'Mã bí mật</span><input type="password" class="input" id="cd-token" autocomplete="off" placeholder="' + (has ? 'Đã lưu. Nhập mã mới để thay' : 'Nhập mã bí mật') + '"></label>' +
        '<div class="cd-btns"><button type="button" class="btn btn-soft" id="cd-token-save">Lưu mã</button><button type="button" class="btn" id="cd-ping">' + icon('refresh', 'ic18') + 'Kiểm tra kết nối</button></div>') +
      (mock ? '<div class="cd-btns"><button type="button" class="btn" id="cd-ping">' + icon('refresh', 'ic18') + 'Kiểm tra</button></div>' : '') +
      '<p class="muted cd-note" id="cd-ping-res" aria-live="polite"></p>');
  }
  function dataHTML() {
    return section('data', 'Dữ liệu', 'box',
      '<div class="cd-btns"><button type="button" class="btn btn-soft" id="cd-backup">' + icon('down', 'ic18') + 'Sao lưu (tải file JSON)</button>' +
      '<label class="btn" for="cd-restore-file">' + icon('up', 'ic18') + 'Khôi phục từ file<input type="file" id="cd-restore-file" accept="application/json,.json" class="sr-only"></label></div>' +
      '<p class="muted cd-note">Khôi phục chỉ thêm hoặc cập nhật theo mã dòng, không xóa gì đang có.</p>' +
      '<button type="button" class="cd-trash-head" id="cd-trash-toggle" aria-expanded="false">' + icon('trash', 'ic18') + '<span>Thùng rác</span></button><div id="cd-trash" hidden></div>');
  }

  function mount(el) {
    S = { el: el };
    el.innerHTML = '<div class="cd"><div class="page-head"><h1>Cài đặt</h1></div>' +
      '<section class="card cd-card cd-daily"><h2>' + icon('calcheck', 'ic18') + 'Daily</h2><p class="muted">Các danh sách lặp lại theo lịch: sáng, cuối ngày, tối, chốt số tháng…</p>' +
      '<a class="btn btn-primary" href="#/mau" id="cd-daily">Quản lý Daily</a></section>' +
      workHTML() + offHTML() + notifyHTML() + lookHTML() + blocksHTML() + connectHTML() + dataHTML() + '</div>';
    LP.cute.wire(el.querySelector('#cd-blocks'), function (pick) { return LP.cute.BLOCKS[pick.parentNode.getAttribute('data-block')][0]; },
      function (name, pick) { LP.cute.save(LP.cute.BLOCKS[pick.parentNode.getAttribute('data-block')][0], name); });
    bind(el);
  }
  function unmount() { S = null; }

  function bind(el) {
    el.addEventListener('change', function (e) {
      var t = e.target, key = t.getAttribute && t.getAttribute('data-set');
      if (key) {
        var kind = t.getAttribute('data-kind'), v = t.value;
        if (kind === 'time' && !D.isTime(v)) { t.value = set(key, ''); ui.toast('Giờ chưa đúng.'); return; }
        if (kind === 'min') {
          if (!(num(v, -1) >= 0) || v === '') { t.value = num(set(key, 0)); ui.toast('Nhập số phút từ 0 trở lên.'); return; }
          v = String(Math.round(num(v)));
          var rd = el.querySelector('[data-read="' + key + '"]'); if (rd) rd.textContent = '= ' + D.fmtMin(num(v));
        }
        LP.store.setSetting(key, v);
        return;
      }
      if (t.id === 'cd-notify') { LP.store.setSetting('notify', t.checked ? '1' : '0'); return; }
      if (t.name === 'cd-theme') { LP.theme.set(t.value); return; }
      if (t.name === 'cd-fall') { LP.flowers.setFall(t.value); return; }
      if (t.id === 'cd-restore-file') { restoreFile(t); return; }
    });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.id === 'cd-off-add') addOff(el);
      else if (b.hasAttribute('data-off-del')) { LP.store.remove('DaysOff', b.getAttribute('data-off-del')); el.querySelector('#cd-off-wrap').innerHTML = offList(); }
      else if (b.id === 'cd-notify-ask') LP.notify.request().then(function () { el.querySelector('#cd-notify-state').textContent = notifyState(); if (LP.notify.permission() !== 'default') b.remove(); });
      else if (b.id === 'cd-token-save') {
        var v = el.querySelector('#cd-token').value.trim();
        if (!v) { ui.toast('Nhập mã bí mật trước.'); return; }
        LP.settings.setToken(v); el.querySelector('#cd-token').value = ''; ui.toast('Đã lưu mã. Đang kiểm tra…'); ping(el);
      } else if (b.id === 'cd-ping') ping(el);
      else if (b.id === 'cd-backup') backup(b);
      else if (b.id === 'cd-trash-toggle') toggleTrash(el, b);
      else if (b.hasAttribute('data-restore')) restoreTrash(el, b);
    });
  }

  /* ---------- Ngày nghỉ ---------- */
  function addOff(el) {
    var from = el.querySelector('#cd-off-from').value, to = el.querySelector('#cd-off-to').value, note = el.querySelector('#cd-off-note').value.trim();
    var er = el.querySelector('#cd-off-err'), fail = function (m) { er.textContent = m; er.hidden = false; };
    if (!D.isValid(from)) return fail('Chọn ngày nghỉ.');
    if (to && !D.isValid(to)) return fail('Ngày kết thúc chưa đúng.');
    if (to && to < from) return fail('Ngày kết thúc phải sau ngày bắt đầu.');
    if (to && D.diff(to, from) > 60) return fail('Chỉ thêm tối đa 61 ngày một lần.');
    er.hidden = true;
    var have = {}; LP.store.get().daysOff.forEach(function (r) { have[r.date] = true; });
    var days = to ? D.range(from, to).filter(function (d) { return D.dow(d) !== 7; }) : [from], n = 0;
    days.forEach(function (d) { if (!have[d]) { LP.store.upsert('DaysOff', { date: d, note: note }); n++; } });
    el.querySelector('#cd-off-wrap').innerHTML = offList();
    ['#cd-off-from', '#cd-off-to', '#cd-off-note'].forEach(function (s) { el.querySelector(s).value = ''; });
    ui.toast(n ? 'Đã thêm ' + n + ' ngày nghỉ.' : 'Các ngày này đã là ngày nghỉ.');
  }

  /* ---------- Kết nối ---------- */
  function ping(el) {
    var out = el.querySelector('#cd-ping-res'); out.textContent = 'Đang kiểm tra…';
    LP.api.ping().then(function () { out.textContent = LP.config.mock ? 'Bản mẫu trên trình duyệt hoạt động bình thường.' : 'Kết nối Google Sheet tốt.'; },
      function (e) { out.textContent = 'Chưa kết nối được: ' + ((e && e.message) || 'lỗi không rõ'); });
  }

  /* ---------- Sao lưu, khôi phục ---------- */
  function download(name, text) {
    var url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function nameList(arr, max) {
    var names = arr.slice(0, max || 5);
    return names.join(', ') + (arr.length > names.length ? '…' : '');
  }
  // Tải từng tài liệu, tách tài liệu tải được và tài liệu lỗi. todo: danh sách { id, title }
  function fetchDocs(todo) {
    var got = [], bad = [];
    return todo.reduce(function (p, d) {
      return p.then(function () { return LP.api.docGet(d.id).then(function (full) { got.push(full); }, function () { bad.push(d); }); });
    }, Promise.resolve()).then(function () { return { got: got, bad: bad }; });
  }
  function backup(btn) {
    btn.disabled = true; ui.toast('Đang gom dữ liệu…');
    var data = LP.util.clone(LP.store.get()); delete data.docs;
    var docs = [];
    function save() {
      download('life-planner-v2-sao-luu-' + D.today() + '.json', JSON.stringify({ app: 'life-planner-v2', version: 1, exported_at: D.stamp(), data: data, docs: docs }));
      ui.toast('Đã tải file sao lưu.');
    }
    // Có tài liệu lỗi thì hỏi: Vẫn tải (file thiếu) hay Thử lại (chỉ tải lại các tài liệu lỗi)
    function step(todo) {
      return fetchDocs(todo).then(function (r) {
        docs = docs.concat(r.got);
        if (!r.bad.length) return save();
        // Hộp riêng: bấm Esc hoặc ra ngoài là hủy sao lưu (không tự thử lại, không tự tải)
        return new Promise(function (resolve) {
          var ans = '';
          var s = ui.sheet('Sao lưu chưa đủ', '<p>' + esc('Có ' + r.bad.length + ' tài liệu chưa tải được: ' + nameList(r.bad.map(function (d) { return d.title || 'Chưa đặt tên'; })) +
            '. Tải file sao lưu thiếu các tài liệu này, hay thử lại?') + '</p><div class="modal-foot"><span class="spacer"></span>' +
            '<button type="button" class="btn" data-ans="retry">Thử lại</button><button type="button" class="btn btn-primary" data-ans="skip">Vẫn tải</button></div>',
            { onClose: function () { resolve(ans); } });
          s.el.addEventListener('click', function (e) { var b = e.target.closest('[data-ans]'); if (b) { ans = b.getAttribute('data-ans'); s.close(); } });
        }).then(function (a) {
          if (a === 'skip') return save();
          if (a === 'retry') { ui.toast('Đang thử lại…'); return step(r.bad); }
          ui.toast('Đã hủy sao lưu.');
        });
      });
    }
    LP.p5.refreshDocs().then(function (list) { return step(list); }, function () { ui.toast('Chưa sao lưu được. Thử lại nhé.'); })
      .then(function () { btn.disabled = false; }, function () { btn.disabled = false; ui.toast('Chưa sao lưu được. Thử lại nhé.'); });
  }
  // Gửi các tài liệu; trả về { ok, bad } (bad: tài liệu lỗi)
  function saveDocs(list) {
    var bad = [], ok = 0;
    return list.reduce(function (p, d) {
      return p.then(function () {
        return LP.api.docSave(Object.assign({}, d, { force: true })).then(function () { ok++; }, function () { bad.push(d); });
      });
    }, Promise.resolve()).then(function () { return { ok: ok, bad: bad }; });
  }
  // Báo kết quả khôi phục. Còn phần lỗi thì không bao giờ báo "Đã khôi phục" mà hỏi có thử lại phần lỗi không.
  function reportRestore(rows, keys, docs, docBad) {
    var rowBad = keys.filter(function (k) { return LP.store.outboxHas(k[0], k[1]); });
    if (!rowBad.length && !docBad.length) {
      ui.toast('Đã khôi phục ' + keys.length + ' dòng và ' + docs.length + ' tài liệu.');
      if (S) LP.router.render();
      return;
    }
    var fails = [];
    if (rowBad.length) fails.push(rowBad.length + ' dòng dữ liệu');
    if (docBad.length) fails.push(nameList(docBad.map(function (d) { return d.title || 'Chưa đặt tên'; })));
    ui.confirm('Khôi phục chưa xong', 'Đã khôi phục ' + (keys.length - rowBad.length) + '/' + keys.length + ' dòng và ' + (docs.length - docBad.length) + '/' + docs.length +
      ' tài liệu. Chưa khôi phục được: ' + fails.join(', ') + '.', { ok: 'Thử lại phần lỗi', cancel: 'Đóng' }).then(function (again) {
      if (S) LP.router.render();
      if (!again) return;
      ui.toast('Đang thử lại phần lỗi…');
      LP.store.retryKeys(rowBad);   // chỉ gửi lại các dòng lỗi của lần khôi phục này
      saveDocs(docBad).then(function (r) { return LP.store.flush().then(function () { reportRestore(rows, keys, docs, r.bad); }); });
    });
  }
  function restoreFile(input) {
    var f = input.files && input.files[0]; input.value = '';
    if (!f) return;
    f.text().then(function (txt) {
      var j; try { j = JSON.parse(txt); } catch (e) { j = null; }
      if (!j || j.app !== 'life-planner-v2' || !j.data || typeof j.data !== 'object') { ui.toast('File này không phải bản sao lưu của Life Planner V2.'); return; }
      var sheets = Object.keys(LP.config.SHEETS).filter(function (s) { return s !== 'Docs' && Array.isArray(j.data[LP.config.SHEETS[s]]); });
      var rows = sheets.reduce(function (a, s) { return a + j.data[LP.config.SHEETS[s]].filter(function (r) { return r && r.id; }).length; }, 0), docs = (j.docs || []).filter(function (d) { return d && d.id; });
      return ui.confirm('Khôi phục từ file sao lưu?', 'File có ' + rows + ' dòng dữ liệu và ' + docs.length + ' tài liệu (sao lưu lúc ' + (j.exported_at || 'không rõ') + '). Dòng trùng mã sẽ lấy theo file. Không xóa gì đang có.', { ok: 'Khôi phục' }).then(function (yes) {
        if (!yes) return;
        ui.toast('Đang khôi phục…');
        var keys = [];
        sheets.forEach(function (s) { j.data[LP.config.SHEETS[s]].forEach(function (r) { if (r && r.id) { LP.store.upsert(s, r); keys.push([s, r.id]); } }); });
        return saveDocs(docs).then(function (r) { return LP.store.flush().then(function () { reportRestore(rows, keys, docs, r.bad); }); });
      });
    }, function () { ui.toast('Không đọc được file.'); });
  }

  /* ---------- Thùng rác ---------- */
  function toggleTrash(el, b) {
    var box = el.querySelector('#cd-trash'), open = box.hidden;
    box.hidden = !open; b.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!open) return;
    box.innerHTML = '<p class="muted cd-none">Đang tải…</p>';
    var cancelled = LP.store.get().tasks.filter(function (t) { return t.status === 'cancelled'; });
    Promise.all([
      LP.api.load({ from: '', to: '', deleted: true }).then(function (d) { return d; }, function () { return { tasks: [], taskSteps: [] }; }),
      LP.api.docsIndex().then(function (r) { return r || []; }, function () { return []; })
    ]).then(function (res) {
      if (!S) return;
      var deleted = (res[0].tasks || []).filter(function (t) { return truthy(t.deleted); });
      var docs = res[1].filter(function (d) { return truthy(d.deleted); });
      S.trash = { deleted: deleted, steps: res[0].taskSteps || [] };
      function row(kind, id, title, sub) {
        return '<li><span class="cd-li-main"><span class="cd-li-title">' + esc(title) + '</span><span class="muted">' + esc(sub) + '</span></span>' +
          '<button type="button" class="btn btn-soft" data-restore="' + kind + ':' + esc(id) + '">Khôi phục</button></li>';
      }
      var tasks = cancelled.map(function (t) { return row('cancel', t.id, t.title, (t.kind === 'canhan' ? 'Personal' : 'Ad-hoc') + ' · đã hủy'); })
        .concat(deleted.map(function (t) { return row('task', t.id, t.title, (t.kind === 'canhan' ? 'Personal' : 'Ad-hoc') + ' · đã xóa'); }));
      box.innerHTML = '<h3>Việc</h3>' + (tasks.length ? '<ul class="cd-list" id="cd-trash-tasks">' + tasks.join('') + '</ul>' : '<p class="muted cd-none">Không có việc nào.</p>') +
        '<h3>Tài liệu</h3>' + (docs.length ? '<ul class="cd-list" id="cd-trash-docs">' + docs.map(function (d) { return row('doc', d.id, d.title || 'Chưa đặt tên', d.space || ''); }).join('') + '</ul>' : '<p class="muted cd-none">Không có tài liệu nào.</p>');
    });
  }
  function restoreTrash(el, b) {
    var parts = b.getAttribute('data-restore').split(':'), kind = parts[0], id = parts.slice(1).join(':'), li = b.closest('li');
    function ok(msg) { li.remove(); ui.toast(msg); }
    if (kind === 'cancel') { var t = LP.store.find('Tasks', id); if (t) { LP.logic.tasks.setCancelled(t, false); ok('Đã khôi phục việc.'); } }
    else if (kind === 'task') {
      var row = S && S.trash && S.trash.deleted.filter(function (x) { return x.id === id; })[0]; if (!row) return;
      LP.store.upsert('Tasks', Object.assign({}, row, { deleted: '' }));
      S.trash.steps.filter(function (s) { return s.task_id === id && truthy(s.deleted); }).forEach(function (s) { LP.store.upsert('TaskSteps', Object.assign({}, s, { deleted: '' })); });
      ok('Đã khôi phục việc.');
    } else if (kind === 'doc') {
      b.disabled = true;
      LP.api.docGet(id).then(function (d) { return LP.api.docSave(Object.assign({}, d, { deleted: '', base_updated_at: d.updated_at })); }).then(function (r) {
        var list = LP.store.get().docs; if (r && r.id && !list.some(function (x) { return x.id === r.id; })) list.push({ id: r.id, space: r.space, title: r.title, sort_order: r.sort_order, headings: r.headings || '[]', created_at: r.created_at || '', updated_at: r.updated_at || '', deleted: '' });
        ok('Đã khôi phục tài liệu.');
      }, function () { b.disabled = false; ui.toast('Chưa khôi phục được tài liệu.'); });
    }
  }

  LP.router.register('cai-dat', { title: 'Cài đặt', mount: mount, unmount: unmount });
})();

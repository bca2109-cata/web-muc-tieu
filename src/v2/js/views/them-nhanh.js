/* V2 · Phần 5 · nút "+": form thêm và sửa. Định nghĩa LP.quickAdd (shell.js gọi khi bấm menu nút "+").
     LP.quickAdd.open(kind, prefill)   kind: 'adhoc' | 'canhan' | 'ghichu' | 'dotxuat'
        prefill (tùy chọn, cho adhoc/canhan): { title, doc_id, heading_id }  (Ghi chú: bôi đen đoạn chữ rồi "Tạo việc")
     LP.quickAdd.edit(kind, id)        sửa việc; kind 'task' | 'adhoc' | 'canhan', id là id của Tasks (Agenda gọi LP.quickAdd.edit('task', id))
   Tên gọi theo hợp đồng mục 6b: Thêm Ad-hoc, Thêm Personal, Ghi chú nhanh, Chen ngang.
   Phím tắt: n = Thêm Ad-hoc, d = Chen ngang (không bắt phím khi đang gõ hoặc đang mở hộp thoại). "/" để Tìm do shell.js lo. */
var LP = window.LP || (window.LP = {});

LP.quickAdd = (function () {
  var D = LP.date, esc = LP.util.esc, ui = LP.ui, icon = ui.icon, num = LP.util.num;
  var IMPORT = ['', 'Bình thường', 'Quan trọng', 'Rất quan trọng'];

  function $(root, sel) { return root.querySelector(sel); }
  function val(root, sel) { var e = root.querySelector(sel); return e ? e.value.trim() : ''; }

  /* ---------- Thành phần form ---------- */
  function goalSelectHTML(cur) {
    var goals = LP.store.get().goals.filter(function (g) { return g.status !== 'cancelled' || g.id === cur; });
    return '<label class="field"><span>' + icon('target', 'ic18') + 'Mục tiêu</span><select class="select" data-f="goal_id"><option value="">Không gắn mục tiêu</option>' +
      goals.map(function (g) { return '<option value="' + esc(g.id) + '"' + (g.id === cur ? ' selected' : '') + '>' + esc(g.title) + (g.period_value ? ' · ' + esc(g.period_value) : '') + '</option>'; }).join('') +
      '</select></label>';
  }
  function importanceHTML(cur) {
    return '<div class="field"><span>Mức quan trọng</span>' + ui.importancePicker('qa-imp', cur) + '</div>';
  }
  function stepRowHTML(s) {
    s = s || {};
    return '<li class="qa-step" data-src="' + esc(s.id || '') + '">' +
      '<input class="input" data-f="s_title" aria-label="Tên bước" placeholder="Tên bước" value="' + esc(s.title || '') + '">' +
      '<input type="date" class="input" data-f="s_date" aria-label="Ngày làm của bước" value="' + esc(s.do_date || '') + '">' +
      '<label class="qa-est"><input type="number" class="input" data-f="s_dur" min="0" step="5" aria-label="Thời lượng của bước (phút)" placeholder="0" value="' + esc(s.duration_min || '') + '"><span class="muted">phút</span></label>' +
      '<button type="button" class="icon-btn" data-act="del" aria-label="Xóa bước">' + icon('trash', 'ic18') + '</button></li>';
  }
  function hintFor(date) { return date && D.isValid(date) ? D.weekdayName(date) + ' ' + D.fmt(date) : ''; }

  function taskFormHTML(kind, t, steps, isEdit) {
    var adhoc = kind === 'adhoc';
    var h = '<form class="qa-form" id="qa-form" novalidate>' +
      '<label class="field is-req"><span>Tên</span><input class="input" data-f="title" id="qa-title" autocomplete="off" autofocus placeholder="' + (adhoc ? 'Ví dụ: Báo cáo nguồn tháng 11' : 'Ví dụ: Đặt lịch khám') + '" value="' + esc(t.title || '') + '"></label>';
    if (adhoc) {
      h += '<label class="field"><span>Người đặt</span><input class="input" data-f="requester" autocomplete="off" placeholder="TBP, giám đốc, phòng…" value="' + esc(t.requester || '') + '"></label>' +
        '<div class="row2"><label class="field"><span>' + icon('flag', 'ic18') + 'Hạn chót</span><input type="date" class="input" data-f="due_date" value="' + esc(t.due_date || '') + '"><small class="date-read muted" data-hint="due_date">' + esc(hintFor(t.due_date)) + '</small></label>' +
        '<label class="field"><span>Giờ hạn</span><input type="text" inputmode="numeric" maxlength="5" placeholder="hh:mm" autocomplete="off" data-time class="input" data-f="due_time" value="' + esc(t.due_time || '') + '"></label></div>';
    }
    h += '<div class="row2"><label class="field"><span>' + icon('calendar', 'ic18') + 'Ngày làm</span><input type="date" class="input" data-f="do_date" value="' + esc(t.do_date || '') + '"><small class="date-read muted" data-hint="do_date">' + esc(hintFor(t.do_date)) + '</small></label>' +
      '<label class="field"><span>Giờ làm</span><input type="text" inputmode="numeric" maxlength="5" placeholder="hh:mm" autocomplete="off" data-time class="input" data-f="do_time" value="' + esc(t.do_time || '') + '"></label></div>' +
      '<div class="row2"><label class="field"><span>' + icon('hourglass', 'ic18') + 'Thời lượng (phút)</span><input type="number" class="input" data-f="duration_min" min="0" step="5" placeholder="0" value="' + esc(t.duration_min || '') + '"></label><span></span></div>' +
      importanceHTML(t.importance) + goalSelectHTML(t.goal_id || '') + LP.p5.docPickerHTML(adhoc ? 'Tài liệu gắn kèm' : 'Ghi chú gắn kèm');
    if (adhoc) {
      h += '<div class="field qa-steps-wrap"><span>' + icon('list', 'ic18') + 'Bước con</span><ul class="qa-steps" id="qa-steps">' + (steps || []).map(stepRowHTML).join('') + '</ul>' +
        '<button type="button" class="btn btn-soft" id="qa-add-step">' + icon('plus', 'ic18') + 'Thêm bước</button></div>';
    }
    h += '<p class="form-error" id="qa-err" role="alert" hidden></p><div class="modal-foot">';
    if (isEdit) {
      h += t.status === 'cancelled'
        ? '<button type="button" class="btn btn-soft" id="qa-uncancel">' + icon('refresh', 'ic18') + 'Khôi phục việc</button>'
        : (t.status === 'done' ? '' : '<button type="button" class="btn btn-danger" id="qa-cancel">' + icon('close', 'ic18') + 'Hủy việc</button>');
    }
    return h + '<span class="spacer"></span><button type="button" class="btn" data-close>Đóng</button><button type="submit" class="btn btn-primary" id="qa-save">' + (isEdit ? 'Lưu' : 'Thêm') + '</button></div></form>';
  }

  function bindTaskForm(root, kind, t, isEdit, done) {
    var form = $(root, '#qa-form'), adhoc = kind === 'adhoc', steps = $(root, '#qa-steps'), touched = isEdit;   // ngày làm mặc định (hôm nay) chưa phải do người dùng chọn: đổi hạn chót thì gợi ý lại
    var err = function (m, el) {
      var e = $(root, '#qa-err');
      if (!m) { ui.clearFieldErrors(form); e.hidden = true; return; }
      if (el) { e.hidden = true; ui.fieldError(el, m); } else { e.textContent = m; e.hidden = false; }
    };
    LP.p5.bindDocPicker(form, t.doc_id, t.heading_id);
    function hint(name) { var el = $(form, '[data-hint="' + name + '"]'); if (el) el.textContent = hintFor($(form, '[data-f="' + name + '"]').value); }
    var doDate = $(form, '[data-f="do_date"]'), dueDate = $(form, '[data-f="due_date"]');
    doDate.addEventListener('input', function () { touched = true; hint('do_date'); });
    doDate.addEventListener('change', function () { touched = true; hint('do_date'); });
    if (dueDate) {
      var onDue = function () {
        hint('due_date');
        // Gợi ý ngày làm = ngày làm việc trước hạn chót 1 ngày. Người dùng đã tự chọn ngày làm thì không đổi.
        if (!touched && D.isValid(dueDate.value)) { doDate.value = LP.logic.tasks.suggestDoDate(dueDate.value); hint('do_date'); }
      };
      dueDate.addEventListener('input', onDue); dueDate.addEventListener('change', onDue);
    }
    if (steps) {
      $(form, '#qa-add-step').addEventListener('click', function () { steps.insertAdjacentHTML('beforeend', stepRowHTML({ do_date: doDate.value })); steps.lastElementChild.querySelector('[data-f="s_title"]').focus(); });
      steps.addEventListener('click', function (e) { var b = e.target.closest('[data-act="del"]'); if (b) b.closest('.qa-step').remove(); });
    }
    var cancel = $(form, '#qa-cancel'), un = $(form, '#qa-uncancel');
    if (cancel) cancel.addEventListener('click', function () {
      ui.confirm('Hủy việc này?', '"' + t.title + '" không còn cần làm nữa. Việc sẽ thoát khỏi danh sách tồn và không tính vào tiến độ. Có thể khôi phục trong Cài đặt, mục Thùng rác.', { ok: 'Hủy việc', cancel: 'Giữ lại', danger: true }).then(function (yes) {
        if (!yes) { edit('task', t.id); return; }   // giữ lại: mở lại form sửa
        var cur = LP.store.find('Tasks', t.id); if (!cur) return;
        LP.logic.tasks.setCancelled(cur, true);
        ui.closeSheet();
        ui.toast('Đã hủy việc "' + t.title + '".', { actionLabel: 'Hoàn tác', actionIcon: 'refresh', action: function () { LP.logic.tasks.setCancelled(LP.store.find('Tasks', t.id), false); } });
        if (done) done(null);
      });
    });
    if (un) un.addEventListener('click', function () {
      LP.logic.tasks.setCancelled(LP.store.find('Tasks', t.id), false);
      ui.closeSheet(); ui.toast('Đã khôi phục việc.'); if (done) done(null);
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });

    function submit() {
      var title = val(form, '[data-f="title"]');
      if (!title) { err('Nhập tên việc.', $(form, '[data-f="title"]')); return; }
      var due = val(form, '[data-f="due_date"]'), dueTime = val(form, '[data-f="due_time"]'), dd = val(form, '[data-f="do_date"]'), dt = val(form, '[data-f="do_time"]');
      if (due && !D.isValid(due)) { err('Hạn chót chưa đúng ngày.', $(form, '[data-f="due_date"]')); return; }
      if (dueTime && !D.isTime(dueTime)) { err('Giờ hạn chưa đúng (ví dụ 17:30).', $(form, '[data-f="due_time"]')); return; }
      if (dd && !D.isValid(dd)) { err('Ngày làm chưa đúng.', $(form, '[data-f="do_date"]')); return; }
      if (dt && !D.isTime(dt)) { err('Giờ làm chưa đúng (ví dụ 09:30).', $(form, '[data-f="do_time"]')); return; }
      var dur = val(form, '[data-f="duration_min"]');
      if (dur !== '' && !(num(dur, -1) >= 0)) { err('Thời lượng chưa đúng.', $(form, '[data-f="duration_min"]')); return; }
      var rows = [];
      if (steps) {
        var bad = '', badEl = null;
        Array.prototype.forEach.call(steps.querySelectorAll('.qa-step'), function (li) {
          var st = val(li, '[data-f="s_title"]'), sd = val(li, '[data-f="s_date"]'), sm = val(li, '[data-f="s_dur"]');
          if (!st && !sd && !sm && !li.getAttribute('data-src')) return;
          if (!st) { if (!bad) { bad = 'Có bước chưa đặt tên.'; badEl = $(li, '[data-f="s_title"]'); } return; }
          if (sd && !D.isValid(sd)) { if (!bad) { bad = 'Bước "' + st + '": ngày chưa đúng.'; badEl = $(li, '[data-f="s_date"]'); } return; }
          rows.push({ src: li.getAttribute('data-src'), title: st, do_date: sd, duration_min: sm });
        });
        if (bad) { err(bad, badEl); return; }
      }
      err('');
      if (!dur && rows.length) { var sum = rows.reduce(function (a, r) { return a + num(r.duration_min); }, 0); if (sum) dur = String(sum); }
      var row = Object.assign({}, t, {
        title: title, kind: kind, requester: adhoc ? val(form, '[data-f="requester"]') : '', due_date: adhoc ? due : '', due_time: adhoc && due ? dueTime : '',
        do_date: dd, do_time: dd ? dt : '', duration_min: dur, importance: $(form, '[name="qa-imp"]:checked').value, goal_id: val(form, '[data-f="goal_id"]'),
        doc_id: val(form, '[data-f="doc_id"]'), heading_id: val(form, '[data-f="doc_id"]') ? val(form, '[data-f="heading_id"]') : '',
        status: t.status || 'todo', done_at: t.done_at || '', carried_from: t.carried_from || '', deleted: ''
      });
      var saved = LP.store.upsert('Tasks', row);
      if (steps) {
        var old = LP.logic.tasks.stepsOf(saved.id), seen = {};
        rows.forEach(function (r, i) {
          var cur = r.src && old.filter(function (o) { return o.id === r.src; })[0];
          if (cur) seen[cur.id] = true;
          LP.store.upsert('TaskSteps', Object.assign({ task_id: saved.id, do_time: '', status: 'todo', done_at: '' }, cur || {}, { sort_order: i + 1, title: r.title, do_date: r.do_date, duration_min: r.duration_min }));
        });
        old.forEach(function (o) { if (!seen[o.id]) LP.store.remove('TaskSteps', o.id); });
        // Thêm hoặc bớt bước thì trạng thái xong của việc theo các bước
        var all = LP.logic.tasks.stepsOf(saved.id);
        if (all.length) {
          var allDone = all.every(function (s) { return s.status === 'done'; });
          if (allDone && saved.status !== 'done') LP.logic.tasks.setDone(saved, true);
          else if (!allDone && saved.status === 'done') LP.logic.tasks.setDone(saved, false);
        }
      }
      ui.closeSheet();
      ui.toast(isEdit ? 'Đã lưu việc.' : 'Đã thêm ' + (adhoc ? 'Ad-hoc' : 'Personal') + ' "' + title + '".');
      if (done) done(saved);
    }
  }

  function openTask(kind, prefill, existing, steps) {
    var isEdit = !!existing, t = existing || Object.assign({
      title: '', kind: kind, requester: '', due_date: '', due_time: '', do_date: kind === 'adhoc' ? D.today() : D.today(), do_time: '', duration_min: '',
      importance: 1, goal_id: '', doc_id: '', heading_id: '', status: 'todo', done_at: '', carried_from: '', deleted: ''
    }, prefill || {});
    var title = isEdit ? (kind === 'adhoc' ? 'Sửa Ad-hoc' : 'Sửa Personal') : (kind === 'adhoc' ? 'Thêm Ad-hoc' : 'Thêm Personal');
    var s = ui.sheet(title, taskFormHTML(kind, t, steps, isEdit));
    s.el.classList.add('qa-modal');
    bindTaskForm(s.el, kind, t, isEdit, null);
    return s;
  }

  /* ---------- Chen ngang ---------- */
  var DUR = [[15, '15 phút'], [30, '30 phút'], [60, '1 giờ'], [120, '2 giờ']];
  function openInterruption() {
    var today = D.today(), cap = LP.logic.tasks.capacity(today);
    var s = ui.sheet('Chen ngang',
      '<form id="qa-form" novalidate><p class="muted">Thời gian bị kéo đi đột xuất, trừ vào Quỹ Ad-hoc hôm nay (còn ' + esc(D.fmtMin(Math.max(0, cap.work.left))) + ').</p>' +
      '<label class="field is-req"><span>Tên</span><input class="input" data-f="title" id="qa-title" autocomplete="off" autofocus placeholder="Ví dụ: Hỗ trợ sale lấy data"></label>' +
      '<div class="field"><span>' + icon('hourglass', 'ic18') + 'Thời lượng</span><div class="seg" role="radiogroup" aria-label="Thời lượng">' +
      DUR.map(function (d, i) { return '<label><input type="radio" name="qa-dur" value="' + d[0] + '"' + (i === 1 ? ' checked' : '') + '><span>' + d[1] + '</span></label>'; }).join('') + '</div></div>' +
      '<p class="form-error" id="qa-err" role="alert" hidden></p>' +
      '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn" data-close>Hủy</button><button type="submit" class="btn btn-primary" id="qa-save">Thêm</button></div></form>');
    s.el.querySelector('#qa-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var title = val(s.el, '[data-f="title"]');
      if (!title) { ui.fieldError($(s.el, '[data-f="title"]'), 'Nhập tên việc chen ngang.'); return; }
      var min = parseInt($(s.el, '[name="qa-dur"]:checked').value, 10);
      LP.store.upsert('Interruptions', { date: today, title: title, duration_min: min });
      s.close();
      ui.toast('Đã ghi Chen ngang ' + D.fmtMin(min) + ', trừ vào Quỹ Ad-hoc hôm nay.');
    });
  }

  /* ---------- Ghi chú nhanh: thêm một đoạn mới vào tài liệu "Ý tưởng" ---------- */
  function findIdeaDoc(list) {
    var fold = LP.util.fold;
    return list.filter(function (d) { return !LP.util.truthy(d.deleted) && /^y tuong/.test(fold(d.title)); })[0] || null;
  }
  function paragraphs(text) {
    return String(text).replace(/\r/g, '').split('\n').map(function (l) { return '<p>' + (l ? esc(l) : '<br>') + '</p>'; }).join('');
  }
  function appendTo(docId, text, tries) {
    return LP.api.docGet(docId).then(function (doc) {
      var html = LP.editor ? LP.editor.toHTML(doc.content, LP.p5.headsOf(doc)) : String(doc.content || '');
      html = html.replace(/^<p><br><\/p>$/, '') + paragraphs(text);
      var save = Object.assign({}, doc, { content: html, base_updated_at: doc.updated_at });
      return LP.api.docSave(save).then(function (row) {
        if (row && row.conflict && tries > 0) return appendTo(docId, text, tries - 1);
        if (row && row.conflict) throw new Error('conflict');
        return row;
      });
    });
  }
  function patchDocsStore(row) {
    var list = LP.store.get().docs, i = list.findIndex(function (r) { return r.id === row.id; });
    var idx = { id: row.id, space: row.space, title: row.title, sort_order: row.sort_order, headings: row.headings || '[]', created_at: row.created_at || '', updated_at: row.updated_at || '', deleted: '' };
    if (i >= 0) list[i] = idx; else list.push(idx);
  }
  function openQuickNote() {
    var s = ui.sheet('Ghi chú nhanh',
      '<form id="qa-form" novalidate><p class="muted">Thêm một đoạn mới vào tài liệu "Ý tưởng" trong Ghi chú.</p>' +
      '<label class="field is-req"><span>Nội dung</span><textarea class="textarea" data-f="text" id="qa-text" rows="5" autofocus placeholder="Gõ ý tưởng, việc cần nhớ…"></textarea></label>' +
      '<p class="form-error" id="qa-err" role="alert" hidden></p>' +
      '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn" data-close>Hủy</button><button type="submit" class="btn btn-primary" id="qa-save">Thêm vào Ý tưởng</button></div></form>');
    var btn = s.el.querySelector('#qa-save');
    s.el.querySelector('#qa-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var text = val(s.el, '[data-f="text"]'), er = $(s.el, '#qa-err');
      if (!text) { ui.fieldError($(s.el, '[data-f="text"]'), 'Nhập nội dung ghi chú.'); return; }
      btn.disabled = true;
      LP.p5.refreshDocs().then(function (list) {
        var doc = findIdeaDoc(list);
        if (doc) return doc.id;
        var max = list.reduce(function (m, d) { return Math.max(m, num(d.sort_order)); }, 0);
        return LP.api.docSave({ id: LP.util.uid(), space: 'Cá nhân', title: 'Ý tưởng', sort_order: max + 1, headings: '[]', deleted: '', content: '<p><br></p>' }).then(function (row) { patchDocsStore(row); return row.id; });
      }).then(function (id) { return appendTo(id, text, 1).then(function (row) { patchDocsStore(row); return id; }); })
        .then(function (id) {
          s.close();
          ui.toast('Đã thêm vào Ý tưởng.', { actionLabel: 'Mở', actionIcon: 'doc', action: function () { ui.docSheet(id); } });
        }, function () { btn.disabled = false; er.textContent = 'Chưa lưu được. Kiểm tra mạng rồi thử lại.'; er.hidden = false; });
    });
  }

  /* ---------- Cửa vào ---------- */
  function open(kind, prefill) {
    if (kind === 'adhoc' || kind === 'canhan') return openTask(kind, prefill);
    if (kind === 'ghichu') return openQuickNote();
    if (kind === 'dotxuat') return openInterruption();
  }
  function edit(kind, id) {
    var t = LP.store.find('Tasks', id);
    if (!t) { ui.toast('Không tìm thấy việc này.'); return; }
    var k = t.kind === 'canhan' ? 'canhan' : 'adhoc';
    return openTask(k, null, t, LP.logic.tasks.stepsOf(t.id));
  }

  // Phím tắt: n = Thêm Ad-hoc, d = Chen ngang
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    var a = document.activeElement || {};
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable) return;
    if (document.querySelector('.overlay')) return;
    if (e.key === 'n') { e.preventDefault(); open('adhoc'); }
    else if (e.key === 'd') { e.preventDefault(); open('dotxuat'); }
  });

  return { open: open, edit: edit };
})();

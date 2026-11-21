/* Form thêm/sửa task, thêm/sửa mục tiêu, hỏi khi xóa, cài đặt kết nối */
var App = window.App || (window.App = {});

App.forms = (function () {
  var esc = function (s) { return App.util.esc(s); };
  var icon = function (n, c) { return App.ui.icon(n, c); };
  var store = function () { return App.store; };

  function options(list, selected, labelFn) {
    return list.map(function (v) {
      var val = typeof v === 'object' ? v.value : v;
      var lab = typeof v === 'object' ? v.label : (labelFn ? labelFn(v) : v);
      return '<option value="' + esc(val) + '"' + (val === selected ? ' selected' : '') + '>' + esc(lab) + '</option>';
    }).join('');
  }
  function seg(name, list, selected) {
    return '<div class="seg" role="radiogroup">' + list.map(function (v) {
      var val = typeof v === 'object' ? v.key : v, lab = typeof v === 'object' ? v.label : v;
      return '<label><input type="radio" name="' + name + '" value="' + esc(val) + '"' + (val === selected ? ' checked' : '') + '>' +
        '<span>' + esc(lab) + '</span></label>';
    }).join('') + '</div>';
  }
  function val(form, name) { var el = form.elements[name]; return el ? String(el.value).trim() : ''; }

  /* ---------- Task ---------- */
  function openTask(task, defaults) {
    var isNew = !task;
    var today = App.date.today();
    var t = task ? Object.assign({}, task) : App.logic.newTask(defaults);
    var state = store().get();
    var goalOpts = [{ value: '', label: App.C.MISC }].concat(state.goals.map(function (g) {
      return { value: g.id, label: g.name + (g.status !== 'Đang làm' ? ' (' + g.status + ')' : '') };
    }));
    var top = App.logic.isTop3Today(t, today);

    var body = '<form data-form="task" novalidate>' +
      '<label class="field"><span>Tên việc</span><input class="input" name="title" maxlength="200" required autofocus value="' + esc(t.title) + '"></label>' +
      '<p class="form-error" hidden data-err="title">Hãy nhập tên việc.</p>' +
      '<label class="field"><span>Mục tiêu</span><select class="select" name="goal_id">' + options(goalOpts, t.goal_id) + '</select></label>' +
      '<label class="field"><span>Hạn chót</span><input class="input" type="date" name="due_date" value="' + esc(t.due_date) + '"></label>' +
      '<div class="field"><span>Mức ưu tiên</span>' + seg('priority', App.C.PRIORITY, t.priority) + '</div>' +
      '<div class="field"><span>Trạng thái</span>' + seg('status', App.C.TASK_STATUS, t.status) + '</div>' +
      '<label class="field"><span>Ghi chú</span><textarea class="textarea" name="note" maxlength="500">' + esc(t.note) + '</textarea></label>' +
      '<label class="check-line"><input type="checkbox" name="top3"' + (top ? ' checked' : '') + '> Top 3 hôm nay</label>' +
      '<p class="form-error" hidden data-err="top3">Top 3 hôm nay đã đủ 3 việc. Bỏ bớt một việc trước.</p>' +
      '<div class="modal-foot">' +
      (isNew ? '' : '<button type="button" class="btn btn-danger" data-act="delete">' + icon('trash', 'icon-sm') + 'Xóa</button>') +
      '<span class="spacer"></span><button type="button" class="btn" data-close>Hủy</button>' +
      '<button type="submit" class="btn btn-primary">' + (isNew ? 'Thêm' : 'Lưu') + '</button></div></form>';

    var m = App.ui.openModal({ title: isNew ? 'Thêm việc' : 'Sửa việc', body: body });
    var form = m.querySelector('form');

    m.querySelector('[data-act="delete"]') && m.querySelector('[data-act="delete"]').addEventListener('click', function () {
      App.ui.ask('Xóa việc', 'Xóa việc "' + t.title + '"? Không hoàn tác được.', [
        { label: 'Xóa việc', value: 'yes', kind: 'danger' }, { label: 'Hủy', value: null }
      ]).then(function (v) {
        if (v !== 'yes') return;
        store().remove('Tasks', t.id);
        App.ui.toast('Đã xóa việc.');
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var title = val(form, 'title');
      form.querySelector('[data-err="title"]').hidden = !!title;
      if (!title) { form.elements.title.focus(); return; }
      var wantTop = form.elements.top3.checked;
      if (wantTop && !top && App.app.top3Count() >= App.C.TOP3_MAX) {
        form.querySelector('[data-err="top3"]').hidden = false;
        return;
      }
      var due = val(form, 'due_date');
      var row = Object.assign({}, t, {
        title: title, goal_id: val(form, 'goal_id'), due_date: App.date.isValid(due) ? due : '',
        priority: val(form, 'priority') || 'Trung bình', status: val(form, 'status') || 'Cần làm', note: val(form, 'note')
      });
      if (row.status === App.C.DONE && !row.done_at) row.done_at = today;
      if (row.status !== App.C.DONE) row.done_at = '';
      if (wantTop) { row.is_top3 = 'TRUE'; row.top3_date = today; }
      else if (top) { row.is_top3 = 'FALSE'; row.top3_date = ''; }
      store().upsert('Tasks', row);
      App.ui.closeModal();
      App.ui.toast(isNew ? 'Đã thêm việc.' : 'Đã lưu thay đổi.');
    });
  }

  /* ---------- Mục tiêu ---------- */
  function openGoal(goal, defaults) {
    var isNew = !goal;
    var today = App.date.today();
    var g = goal ? Object.assign({}, goal) : App.logic.newGoal(defaults);

    function periodOpts(type, selected) {
      var list = App.period.options(type, today);
      if (selected && list.indexOf(selected) < 0 && App.period.range(type, selected)) list.unshift(selected);
      return options(list, selected, function (v) { return App.period.label(type, v); });
    }

    var body = '<form data-form="goal" novalidate>' +
      '<label class="field"><span>Tên mục tiêu</span><input class="input" name="name" maxlength="200" required autofocus value="' + esc(g.name) + '"></label>' +
      '<p class="form-error" hidden data-err="name">Hãy nhập tên mục tiêu.</p>' +
      '<div class="field"><span>Nhóm</span>' + seg('group', App.C.GROUPS, g.group) + '</div>' +
      '<div class="row2">' +
      '<label class="field"><span>Loại kỳ</span><select class="select" name="period_type">' + options(App.C.PERIOD_TYPES, g.period_type) + '</select></label>' +
      '<label class="field"><span>Kỳ</span><select class="select" name="period_value">' + periodOpts(g.period_type, g.period_value) + '</select></label>' +
      '</div><div class="row2">' +
      '<label class="field"><span>Ngày bắt đầu</span><input class="input" type="date" name="start_date" value="' + esc(g.start_date) + '"></label>' +
      '<label class="field"><span>Ngày kết thúc</span><input class="input" type="date" name="end_date" value="' + esc(g.end_date) + '"></label>' +
      '</div>' +
      '<p class="form-error" hidden data-err="dates">Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.</p>' +
      '<div class="field"><span>Trạng thái</span>' + seg('status', App.C.GOAL_STATUS, g.status) + '</div>' +
      '<label class="field"><span>Ghi chú</span><textarea class="textarea" name="note" maxlength="1000">' + esc(g.note) + '</textarea></label>' +
      '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn" data-close>Hủy</button>' +
      '<button type="submit" class="btn btn-primary">' + (isNew ? 'Tạo mục tiêu' : 'Lưu') + '</button></div></form>';

    var m = App.ui.openModal({ title: isNew ? 'Thêm mục tiêu' : 'Sửa mục tiêu', body: body });
    var form = m.querySelector('form');
    var typeSel = form.elements.period_type, valSel = form.elements.period_value;

    // Đổi kỳ thì tự điền ngày bắt đầu, kết thúc theo kỳ (vẫn sửa tay được)
    function fillDates() {
      var r = App.period.range(typeSel.value, valSel.value);
      if (r) { form.elements.start_date.value = r.start; form.elements.end_date.value = r.end; }
    }
    typeSel.addEventListener('change', function () {
      var cur = App.period.valueOf(typeSel.value, today);
      valSel.innerHTML = periodOpts(typeSel.value, cur);
      fillDates();
    });
    valSel.addEventListener('change', fillDates);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = val(form, 'name');
      form.querySelector('[data-err="name"]').hidden = !!name;
      if (!name) { form.elements.name.focus(); return; }
      var r = App.period.range(typeSel.value, valSel.value) || {};
      var start = val(form, 'start_date'), end = val(form, 'end_date');
      start = App.date.isValid(start) ? start : r.start;
      end = App.date.isValid(end) ? end : r.end;
      var badDates = start > end;
      form.querySelector('[data-err="dates"]').hidden = !badDates;
      if (badDates) return;
      var row = Object.assign({}, g, {
        name: name, group: val(form, 'group') || 'Công việc', period_type: typeSel.value, period_value: valSel.value,
        start_date: start, end_date: end, status: val(form, 'status') || 'Đang làm', note: val(form, 'note'),
        progress_mode: g.progress_mode || 'task'
      });
      store().upsert('Goals', row);
      App.ui.closeModal();
      App.ui.toast(isNew ? 'Đã tạo mục tiêu.' : 'Đã lưu thay đổi.');
      if (isNew) App.app.go('#/muc-tieu/' + row.id);
    });
  }

  // Xóa mục tiêu: hỏi mỗi lần, task chuyển thành Việc lặt vặt hay xóa theo
  function deleteGoal(goal) {
    var tasks = store().get().tasks.filter(function (t) { return t.goal_id === goal.id; });
    var ask = tasks.length
      ? App.ui.ask('Xóa mục tiêu', 'Mục tiêu "' + goal.name + '" có ' + tasks.length + ' task. Bạn muốn xử lý các task này thế nào?', [
        { label: 'Giữ task, chuyển thành Việc lặt vặt', value: 'keep', kind: 'primary' },
        { label: 'Xóa luôn ' + tasks.length + ' task', value: 'delete', kind: 'danger' },
        { label: 'Hủy', value: null }])
      : App.ui.ask('Xóa mục tiêu', 'Xóa mục tiêu "' + goal.name + '"? Không hoàn tác được.', [
        { label: 'Xóa mục tiêu', value: 'delete', kind: 'danger' }, { label: 'Hủy', value: null }]);

    ask.then(function (choice) {
      if (!choice) return;
      var ops = tasks.map(function (t) {
        return choice === 'keep'
          ? { type: 'upsert', table: 'Tasks', row: Object.assign({}, t, { goal_id: '' }) }
          : { type: 'delete', table: 'Tasks', id: t.id };
      });
      ops.push({ type: 'delete', table: 'Goals', id: goal.id });
      store().batch(ops);
      App.app.go('#/muc-tieu');
      App.ui.toast('Đã xóa mục tiêu.');
    });
  }

  /* ---------- Cài đặt ---------- */
  function openSettings(reason) {
    var mock = App.api.mode === 'mock';
    var body = mock
      ? '<p>Đang dùng <strong>dữ liệu mẫu</strong> lưu trên trình duyệt này, chưa kết nối Google Sheet.</p>' +
        '<div class="modal-foot"><button type="button" class="btn btn-danger" data-act="reset">Khôi phục dữ liệu mẫu</button>' +
        '<span class="spacer"></span><button type="button" class="btn" data-close>Đóng</button></div>'
      : (reason ? '<p class="form-error" style="margin:0 0 12px">' + esc(reason) + '</p>' : '') +
        '<p>Dán mã bí mật lấy từ Apps Script. Mỗi thiết bị chỉ cần nhập một lần.</p>' +
        '<form data-form="settings" novalidate><label class="field"><span>Mã bí mật</span>' +
        '<input class="input num" name="token" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + esc(App.settings.getToken()) + '"></label>' +
        '<p class="form-error" hidden data-err="token"></p>' +
        '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn" data-close>Đóng</button>' +
        '<button type="submit" class="btn btn-primary">Lưu và kết nối</button></div></form>';

    var m = App.ui.openModal({ title: mock ? 'Cài đặt' : 'Kết nối Google Sheet', body: body });

    if (mock) {
      m.querySelector('[data-act="reset"]').addEventListener('click', function () {
        App.ui.ask('Khôi phục dữ liệu mẫu', 'Mọi thay đổi trong bản mẫu sẽ mất và thay bằng dữ liệu mẫu ban đầu.', [
          { label: 'Khôi phục', value: 'yes', kind: 'danger' }, { label: 'Hủy', value: null }
        ]).then(function (v) {
          if (v !== 'yes') return;
          App.api.reset().then(function (db) { App.store.replace(db); App.ui.toast('Đã khôi phục dữ liệu mẫu.'); });
        });
      });
      return;
    }

    var form = m.querySelector('form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var token = val(form, 'token');
      var err = form.querySelector('[data-err="token"]');
      if (!token) { err.textContent = 'Hãy dán mã bí mật.'; err.hidden = false; return; }
      App.settings.setToken(token);
      var btn = form.querySelector('[type="submit"]');
      btn.disabled = true; btn.textContent = 'Đang kiểm tra…';
      App.api.ping().then(function () {
        App.ui.closeModal();
        App.ui.toast('Đã kết nối Google Sheet.');
        App.app.reload();
      }, function (e2) {
        btn.disabled = false; btn.textContent = 'Lưu và kết nối';
        err.textContent = e2.message || 'Không kết nối được.'; err.hidden = false;
      });
    });
  }

  return { openTask: openTask, openGoal: openGoal, deleteGoal: deleteGoal, openSettings: openSettings };
})();

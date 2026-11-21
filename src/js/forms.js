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
  var ICON_NAMES = { note: 'Ghi chú', mail: 'Thư', phone: 'Điện thoại', users: 'Họp, gặp mặt', chart: 'Số liệu', doc: 'Tài liệu',
    laptop: 'Máy tính', book: 'Sách', grad: 'Học', pencil: 'Viết', shoe: 'Chạy bộ', dumbbell: 'Tập luyện', tooth: 'Răng',
    pill: 'Thuốc, khám bệnh', food: 'Ăn uống', drop: 'Uống nước', moon: 'Ngủ nghỉ', home: 'Việc nhà', wallet: 'Tiền',
    cart: 'Mua sắm', car: 'Xe cộ', plane: 'Du lịch', gift: 'Quà tặng', music: 'Âm nhạc' };
  function iconPicker(selected) {
    return '<div class="icon-pick" role="radiogroup" aria-label="Icon của việc">' + App.logic.TASK_ICONS.map(function (n) {
      return '<label title="' + ICON_NAMES[n] + '"><input type="radio" name="icon" value="' + n + '" aria-label="' + ICON_NAMES[n] + '"' + (n === selected ? ' checked' : '') + '><span>' + icon(n) + '</span></label>';
    }).join('') + '</div>';
  }
  var IMPORTANCE = ['Bình thường', 'Quan trọng', 'Rất quan trọng'];
  function heartPicker(selected) {
    return '<div class="seg" role="radiogroup" aria-label="Mức quan trọng">' + [1, 2, 3].map(function (n) {
      var h = '';
      for (var i = 1; i <= 3; i++) h += icon('heart', 'ic14' + (i <= n ? ' fill' : ''));
      return '<label><input type="radio" name="importance" value="' + n + '"' + (n === selected ? ' checked' : '') + '>' +
        '<span><span class="hearts">' + h + '</span>' + IMPORTANCE[n - 1] + '</span></label>';
    }).join('') + '</div>';
  }
  /* Ô chọn ngày hiện theo ngôn ngữ trình duyệt (có máy ra 11/22/2026),
     nên ghi thêm ngày kiểu Việt Nam ngay dưới để đọc cho chắc */
  function dateRead(v) {
    return App.date.isValid(v) ? App.date.weekday(v) + ', <span class="num">' + App.date.fmt(v) + '</span>' : 'Chưa chọn ngày';
  }
  function dateInput(name, value) {
    return '<input class="input" type="date" name="' + name + '" value="' + esc(value) + '">' +
      '<small class="date-read" data-for="' + name + '">' + dateRead(value) + '</small>';
  }
  function refreshDates(form) {
    Array.prototype.forEach.call(form.querySelectorAll('.date-read'), function (el) {
      el.innerHTML = dateRead(form.elements[el.getAttribute('data-for')].value);
    });
  }
  function bindDates(form) {
    form.addEventListener('input', function (e) { if (e.target.type === 'date') refreshDates(form); });
    form.addEventListener('change', function (e) { if (e.target.type === 'date') refreshDates(form); });
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
    var L = App.logic, isTpl = L.isTemplate(t);
    // Chỉ chọn lặp lại khi tạo việc mới hoặc sửa việc lặp mẫu
    var canRepeat = isNew || isTpl;
    var rule = L.parseRule(t.recurring_rule);
    var repeat = !rule ? 'none' : rule.daily ? 'daily' : 'weekly';
    var DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
    var repeatBlock = canRepeat
      ? '<div class="field"><span>' + icon('refresh', 'ic14') + 'Lặp lại</span>' +
        seg('repeat', [{ key: 'none', label: 'Không lặp' }, { key: 'daily', label: 'Hằng ngày' }, { key: 'weekly', label: 'Theo thứ' }], repeat) +
        '<div class="weekdays" data-weekdays' + (repeat === 'weekly' ? '' : ' hidden') + ' role="group" aria-label="Các thứ trong tuần">' +
        DAY_ORDER.map(function (d) {
          var on = rule && !rule.daily && rule.days.indexOf(d) >= 0;
          return '<label><input type="checkbox" name="wd" value="' + d + '"' + (on ? ' checked' : '') + '><span>' + (d === 0 ? 'CN' : 'T<span class="num">' + (d + 1) + '</span>') + '</span></label>';
        }).join('') + '</div>' +
        '<p class="form-error" hidden data-err="wd">Chọn ít nhất một thứ.</p>' +
        '<small class="muted repeat-note"' + (repeat === 'none' ? ' hidden' : '') + '>Mỗi ngày khớp sẽ tự có một việc mới, hạn đúng ngày đó. Ngày bỏ lỡ vẫn tính vào % mục tiêu.</small></div>'
      : (t.parent_recurring_id ? '<p class="info-line">' + icon('refresh', 'ic14') + 'Đây là một lần của việc lặp lại. Muốn đổi lịch lặp thì vào tab Task, mục Việc lặp lại.</p>' : '');

    var body = '<form data-form="task" novalidate>' +
      '<label class="field"><span>' + icon('text', 'ic14') + 'Tên việc</span><input class="input" name="title" maxlength="200" required autofocus value="' + esc(t.title) + '"></label>' +
      '<p class="form-error" hidden data-err="title">Hãy nhập tên việc.</p>' +
      '<div class="field"><span>' + icon('sparkle', 'ic14') + 'Icon <small class="muted">(tự đoán theo tên, bấm để đổi)</small></span>' + iconPicker(App.logic.iconOf(t)) + '</div>' +
      '<label class="field"><span>' + icon('target', 'ic14') + 'Mục tiêu</span><select class="select" name="goal_id">' + options(goalOpts, t.goal_id) + '</select></label>' +
      '<label class="field"><span>' + icon('calendar', 'ic14') + '<span data-due-label>' + (repeat === 'none' ? 'Hạn chót' : 'Bắt đầu lặp từ') + '</span></span>' + dateInput('due_date', t.due_date) + '</label>' +
      repeatBlock +
      '<div class="field"><span>' + icon('up', 'ic14') + 'Mức ưu tiên</span>' + seg('priority', App.C.PRIORITY, t.priority) + '</div>' +
      '<div class="field"><span>' + icon('flag', 'ic14') + 'Trạng thái</span>' + seg('status', App.C.TASK_STATUS, t.status) + '</div>' +
      '<label class="field"><span>' + icon('text', 'ic14') + 'Ghi chú</span><textarea class="textarea" name="note" maxlength="500">' + esc(t.note) + '</textarea></label>' +
      '<label class="check-line" data-top3-line' + (repeat === 'none' ? '' : ' hidden') + '><input type="checkbox" name="top3"' + (top ? ' checked' : '') + '>' + icon('star', 'ic18') + 'Top 3 hôm nay</label>' +
      '<p class="form-error" hidden data-err="top3">Top 3 hôm nay đã đủ 3 việc. Bỏ bớt một việc trước.</p>' +
      '<div class="modal-foot">' +
      (isNew ? '' : '<button type="button" class="btn btn-danger" data-act="delete">' + icon('trash', 'ic18') + 'Xóa</button>') +
      '<span class="spacer"></span><button type="button" class="btn btn-soft" data-close>' + icon('close', 'ic18') + 'Hủy</button>' +
      '<button type="submit" class="btn btn-primary">' + icon(isNew ? 'plus' : 'check', 'ic18') + (isNew ? 'Thêm' : 'Lưu') + '</button></div></form>';

    var m = App.ui.openModal({ title: isNew ? 'Thêm việc' : isTpl ? 'Sửa việc lặp lại' : 'Sửa việc', body: body });
    var form = m.querySelector('form');
    bindDates(form);

    // Đổi kiểu lặp thì hiện hoặc ẩn các thứ, đổi nhãn ngày
    function syncRepeat() {
      if (!canRepeat) return;
      var r = val(form, 'repeat') || 'none';
      form.querySelector('[data-weekdays]').hidden = r !== 'weekly';
      form.querySelector('.repeat-note').hidden = r === 'none';
      form.querySelector('[data-top3-line]').hidden = r !== 'none';
      form.querySelector('[data-due-label]').textContent = r === 'none' ? 'Hạn chót' : 'Bắt đầu lặp từ';
    }
    if (canRepeat) form.addEventListener('change', function (e) { if (e.target.name === 'repeat') syncRepeat(); });

    // Chưa tự chọn icon thì đổi icon theo tên đang gõ
    var iconTouched = !isNew && App.logic.TASK_ICONS.indexOf(t.icon) >= 0 && t.icon !== App.logic.guessIcon(t.title);
    form.querySelector('.icon-pick').addEventListener('change', function () { iconTouched = true; });
    form.elements.title.addEventListener('input', function () {
      if (iconTouched) return;
      var g = App.logic.guessIcon(form.elements.title.value);
      var r = form.querySelector('input[name="icon"][value="' + g + '"]');
      if (r) r.checked = true;
    });

    m.querySelector('[data-act="delete"]') && m.querySelector('[data-act="delete"]').addEventListener('click', function () {
      App.ui.ask(isTpl ? 'Xóa việc lặp lại' : 'Xóa việc', isTpl
        ? 'Ngừng lặp và xóa "' + t.title + '"? Các lần đã sinh trước đó vẫn được giữ. Không hoàn tác được.'
        : 'Xóa việc "' + t.title + '"? Không hoàn tác được.', [
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
      var repeatKind = canRepeat ? (val(form, 'repeat') || 'none') : 'none';
      var days = [];
      if (repeatKind === 'daily') days = [0, 1, 2, 3, 4, 5, 6];
      if (repeatKind === 'weekly') {
        Array.prototype.forEach.call(form.querySelectorAll('input[name="wd"]:checked'), function (c) { days.push(+c.value); });
      }
      if (repeatKind === 'weekly' && !days.length) { form.querySelector('[data-err="wd"]').hidden = false; return; }
      var wantTop = repeatKind === 'none' && form.elements.top3.checked;
      if (wantTop && !top && App.app.top3Count() >= App.C.TOP3_MAX) {
        form.querySelector('[data-err="top3"]').hidden = false;
        return;
      }
      var due = val(form, 'due_date');
      var row = Object.assign({}, t, {
        title: title, goal_id: val(form, 'goal_id'), due_date: App.date.isValid(due) ? due : '',
        priority: val(form, 'priority') || 'Trung bình', status: val(form, 'status') || 'Cần làm', note: val(form, 'note'),
        icon: val(form, 'icon') || App.logic.guessIcon(title)
      });
      if (repeatKind !== 'none') {
        // Việc lặp mẫu: không có trạng thái riêng, không vào Top 3, ngày = ngày bắt đầu lặp
        Object.assign(row, { recurring_rule: L.makeRule(days), status: 'Cần làm', done_at: '', is_top3: 'FALSE', top3_date: '',
          due_date: row.due_date || today });
        store().upsert('Tasks', row);
        App.ui.closeModal();
        App.app.generateRecurring();
        App.ui.toast(isNew ? 'Đã tạo việc lặp lại: ' + L.ruleLabel(row.recurring_rule) + '.' : 'Đã lưu việc lặp lại. Thay đổi áp dụng cho các lần sau.');
        return;
      }
      if (isTpl) row.recurring_rule = '';
      var justDone = row.status === App.C.DONE && t.status !== App.C.DONE;
      if (row.status === App.C.DONE && !row.done_at) row.done_at = today;
      if (row.status !== App.C.DONE) row.done_at = '';
      if (wantTop) { row.is_top3 = 'TRUE'; row.top3_date = today; }
      else if (top) { row.is_top3 = 'FALSE'; row.top3_date = ''; }
      store().upsert('Tasks', row);
      App.ui.closeModal();
      if (justDone) App.app.celebrate(t, null);
      else App.ui.toast(isNew ? 'Đã thêm việc.' : 'Đã lưu thay đổi.');
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
      '<label class="field"><span>' + icon('target', 'ic14') + 'Tên mục tiêu</span><input class="input" name="name" maxlength="200" required autofocus value="' + esc(g.name) + '"></label>' +
      '<p class="form-error" hidden data-err="name">Hãy nhập tên mục tiêu.</p>' +
      '<div class="field"><span>' + icon('tag', 'ic14') + 'Nhóm</span>' + seg('group', App.C.GROUPS, g.group) + '</div>' +
      '<div class="field"><span>' + icon('heart', 'ic14') + 'Mức quan trọng</span>' + heartPicker(App.logic.importance(g)) + '</div>' +
      '<div class="row2">' +
      '<label class="field"><span>' + icon('calendar', 'ic14') + 'Loại kỳ</span><select class="select" name="period_type">' + options(App.C.PERIOD_TYPES, g.period_type) + '</select></label>' +
      '<label class="field"><span>' + icon('calendar', 'ic14') + 'Kỳ</span><select class="select" name="period_value">' + periodOpts(g.period_type, g.period_value) + '</select></label>' +
      '</div><div class="row2">' +
      '<label class="field"><span>' + icon('calendar', 'ic14') + 'Ngày bắt đầu</span>' + dateInput('start_date', g.start_date) + '</label>' +
      '<label class="field"><span>' + icon('calendar', 'ic14') + 'Ngày kết thúc</span>' + dateInput('end_date', g.end_date) + '</label>' +
      '</div>' +
      '<p class="form-error" hidden data-err="dates">Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.</p>' +
      '<div class="field"><span>' + icon('flag', 'ic14') + 'Trạng thái</span>' + seg('status', App.C.GOAL_STATUS, g.status) + '</div>' +
      '<div class="field"><span>' + icon('barchart', 'ic14') + 'Cách tính tiến độ</span>' +
      seg('progress_mode', [{ key: 'task', label: 'Theo task' }, { key: 'metric', label: 'Theo chỉ số' }, { key: 'habit', label: 'Theo thói quen' }],
        g.progress_mode === 'metric' || g.progress_mode === 'habit' ? g.progress_mode : 'task') + '</div>' +
      '<p class="info-line" data-habit-note' + (g.progress_mode === 'habit' ? '' : ' hidden') + '>' + icon('calcheck', 'ic14') +
      '<span>% = số ngày đã tick / số ngày cần làm, từ đầu kỳ đến hôm nay, của các thói quen gắn với mục tiêu này. Gắn thói quen ở tab Thói quen.</span></p>' +
      '<div class="metric-fields" data-metric' + (g.progress_mode === 'metric' ? '' : ' hidden') + '>' +
      '<label class="field"><span>' + icon('tag', 'ic14') + 'Đơn vị</span><input class="input" name="unit" maxlength="20" placeholder="giờ, km, cuốn…" value="' + esc(g.unit) + '"></label>' +
      '<div class="row2">' +
      '<label class="field"><span>' + icon('flag', 'ic14') + 'Chỉ tiêu</span><input class="input num" name="target" inputmode="decimal" value="' + esc(g.target) + '"></label>' +
      '<label class="field"><span>' + icon('check', 'ic14') + 'Đã đạt</span><input class="input num" name="actual" inputmode="decimal" value="' + esc(g.actual || (g.progress_mode === 'metric' ? '' : '0')) + '"></label>' +
      '</div><p class="form-error" hidden data-err="target">Chỉ tiêu phải là số lớn hơn 0. Đã đạt phải là số.</p></div>' +
      '<label class="field"><span>' + icon('text', 'ic14') + 'Ghi chú</span><textarea class="textarea" name="note" maxlength="1000">' + esc(g.note) + '</textarea></label>' +
      '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn btn-soft" data-close>' + icon('close', 'ic18') + 'Hủy</button>' +
      '<button type="submit" class="btn btn-primary">' + icon(isNew ? 'plus' : 'check', 'ic18') + (isNew ? 'Tạo mục tiêu' : 'Lưu') + '</button></div></form>';

    var m = App.ui.openModal({ title: isNew ? 'Thêm mục tiêu' : 'Sửa mục tiêu', body: body });
    var form = m.querySelector('form');
    var typeSel = form.elements.period_type, valSel = form.elements.period_value;

    // Đổi kỳ thì tự điền ngày bắt đầu, kết thúc theo kỳ (vẫn sửa tay được)
    function fillDates() {
      var r = App.period.range(typeSel.value, valSel.value);
      if (r) { form.elements.start_date.value = r.start; form.elements.end_date.value = r.end; refreshDates(form); }
    }
    bindDates(form);
    typeSel.addEventListener('change', function () {
      var cur = App.period.valueOf(typeSel.value, today);
      valSel.innerHTML = periodOpts(typeSel.value, cur);
      fillDates();
    });
    valSel.addEventListener('change', fillDates);
    form.addEventListener('change', function (e) {
      if (e.target.name === 'progress_mode') {
        form.querySelector('[data-metric]').hidden = e.target.value !== 'metric';
        form.querySelector('[data-habit-note]').hidden = e.target.value !== 'habit';
      }
    });

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
      var mode = val(form, 'progress_mode');
      if (mode !== 'metric' && mode !== 'habit') mode = 'task';
      var tgt = val(form, 'target').replace(',', '.'), act = val(form, 'actual').replace(',', '.') || '0';
      var badMetric = mode === 'metric' && (!(+tgt > 0) || !isFinite(+act));
      form.querySelector('[data-err="target"]').hidden = !badMetric;
      if (badMetric) { form.elements.target.focus(); return; }
      var row = Object.assign({}, g, {
        name: name, group: val(form, 'group') || 'Công việc', period_type: typeSel.value, period_value: valSel.value,
        start_date: start, end_date: end, status: val(form, 'status') || 'Đang làm', note: val(form, 'note'),
        importance: val(form, 'importance') || '2',
        progress_mode: mode,
        unit: mode === 'metric' ? val(form, 'unit') : g.unit,
        target: mode === 'metric' ? App.logic.fmtNum(+tgt) : g.target,
        actual: mode === 'metric' ? App.logic.fmtNum(+act) : g.actual
      });
      store().upsert('Goals', row);
      App.ui.closeModal();
      App.ui.toast(isNew ? 'Đã tạo mục tiêu.' : 'Đã lưu thay đổi.');
      if (isNew) App.app.go('#/muc-tieu/' + row.id);
    });
  }

  /* ---------- Thói quen ---------- */
  function openHabit(habit, defaults) {
    var isNew = !habit, L = App.logic;
    var h = habit ? Object.assign({}, habit) : L.newHabit(defaults);
    var goalOpts = [{ value: '', label: 'Không gắn mục tiêu' }].concat(store().get().goals.map(function (g) {
      return { value: g.id, label: g.name + (g.status !== 'Đang làm' ? ' (' + g.status + ')' : '') };
    }));
    var rule = L.parseRule(h.frequency) || { daily: true, days: [0, 1, 2, 3, 4, 5, 6] };
    var freq = rule.daily ? 'daily' : 'weekly';
    var body = '<form data-form="habit" novalidate>' +
      '<label class="field"><span>' + icon('text', 'ic14') + 'Tên thói quen</span><input class="input" name="name" maxlength="200" required autofocus placeholder="Đọc sách 20 phút" value="' + esc(h.name) + '"></label>' +
      '<p class="form-error" hidden data-err="name">Hãy nhập tên thói quen.</p>' +
      '<label class="field"><span>' + icon('target', 'ic14') + 'Mục tiêu</span><select class="select" name="goal_id">' + options(goalOpts, h.goal_id) + '</select></label>' +
      '<div class="field"><span>' + icon('refresh', 'ic14') + 'Tần suất</span>' +
      seg('freq', [{ key: 'daily', label: 'Hằng ngày' }, { key: 'weekly', label: 'Theo thứ' }], freq) +
      '<div class="weekdays" data-weekdays' + (freq === 'weekly' ? '' : ' hidden') + ' role="group" aria-label="Các thứ trong tuần">' +
      [1, 2, 3, 4, 5, 6, 0].map(function (d) {
        var on = !rule.daily && rule.days.indexOf(d) >= 0;
        return '<label><input type="checkbox" name="wd" value="' + d + '"' + (on ? ' checked' : '') + '><span>' + (d === 0 ? 'CN' : 'T<span class="num">' + (d + 1) + '</span>') + '</span></label>';
      }).join('') + '</div>' +
      '<p class="form-error" hidden data-err="wd">Chọn ít nhất một thứ.</p></div>' +
      '<div class="field"><span>' + icon('flag', 'ic14') + 'Trạng thái</span>' +
      seg('active', [{ key: 'TRUE', label: 'Đang theo' }, { key: 'FALSE', label: 'Tạm dừng' }], L.habitActive(h) ? 'TRUE' : 'FALSE') + '</div>' +
      '<div class="modal-foot">' +
      (isNew ? '' : '<button type="button" class="btn btn-danger" data-act="delete">' + icon('trash', 'ic18') + 'Xóa</button>') +
      '<span class="spacer"></span><button type="button" class="btn btn-soft" data-close>' + icon('close', 'ic18') + 'Hủy</button>' +
      '<button type="submit" class="btn btn-primary">' + icon(isNew ? 'plus' : 'check', 'ic18') + (isNew ? 'Tạo thói quen' : 'Lưu') + '</button></div></form>';

    var m = App.ui.openModal({ title: isNew ? 'Thêm thói quen' : 'Sửa thói quen', body: body });
    var form = m.querySelector('form');
    form.addEventListener('change', function (e) {
      if (e.target.name === 'freq') form.querySelector('[data-weekdays]').hidden = e.target.value !== 'weekly';
    });
    var del = m.querySelector('[data-act="delete"]');
    if (del) del.addEventListener('click', function () {
      var logs = store().get().habitLogs.filter(function (l) { return l.habit_id === h.id; });
      App.ui.ask('Xóa thói quen', 'Xóa thói quen "' + h.name + '" cùng ' + logs.length + ' ngày đã ghi? Muốn giữ lịch sử thì chọn Tạm dừng thay vì xóa. Không hoàn tác được.', [
        { label: 'Xóa thói quen', value: 'yes', kind: 'danger' }, { label: 'Hủy', value: null }
      ]).then(function (v) {
        if (v !== 'yes') return;
        var ops = logs.map(function (l) { return { type: 'delete', table: 'HabitLogs', id: l.id }; });
        ops.push({ type: 'delete', table: 'Habits', id: h.id });
        store().batch(ops);
        App.ui.toast('Đã xóa thói quen.');
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = val(form, 'name');
      form.querySelector('[data-err="name"]').hidden = !!name;
      if (!name) { form.elements.name.focus(); return; }
      var days = [0, 1, 2, 3, 4, 5, 6];
      if (val(form, 'freq') === 'weekly') {
        days = [];
        Array.prototype.forEach.call(form.querySelectorAll('input[name="wd"]:checked'), function (c) { days.push(+c.value); });
      }
      form.querySelector('[data-err="wd"]').hidden = !!days.length;
      if (!days.length) return;
      store().upsert('Habits', Object.assign({}, h, {
        name: name, goal_id: val(form, 'goal_id'), frequency: L.makeRule(days), active: val(form, 'active') === 'FALSE' ? 'FALSE' : 'TRUE'
      }));
      App.ui.closeModal();
      App.ui.toast(isNew ? 'Đã tạo thói quen. Bấm vào ô để tick mỗi ngày.' : 'Đã lưu thay đổi.');
    });
  }

  // Cộng nhanh vào chỉ số của mục tiêu. onAdd(n) nhận số đã nhập
  function addMetric(goal, onAdd) {
    var L = App.logic;
    var body = '<form data-form="metric" novalidate>' +
      '<p class="muted">Hiện đạt <span class="num">' + L.fmtVi(L.num(goal.actual)) + '/' + L.fmtVi(L.num(goal.target)) + '</span>' + (goal.unit ? ' ' + esc(goal.unit) : '') + '.</p>' +
      '<label class="field"><span>' + icon('plus', 'ic14') + 'Cộng thêm' + (goal.unit ? ' (' + esc(goal.unit) + ')' : '') + '</span>' +
      '<input class="input num" name="amount" inputmode="decimal" value="1" autofocus></label>' +
      '<p class="form-error" hidden data-err="amount">Nhập một số khác 0. Số âm để trừ bớt.</p>' +
      '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn btn-soft" data-close>' + icon('close', 'ic18') + 'Hủy</button>' +
      '<button type="submit" class="btn btn-primary">' + icon('plus', 'ic18') + 'Cộng</button></div></form>';
    var m = App.ui.openModal({ title: 'Cập nhật: ' + goal.name, body: body });
    var form = m.querySelector('form');
    form.elements.amount.select();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = parseFloat(val(form, 'amount').replace(',', '.'));
      var bad = !isFinite(n) || n === 0;
      form.querySelector('[data-err="amount"]').hidden = !bad;
      if (bad) { form.elements.amount.focus(); return; }
      App.ui.closeModal();
      onAdd(n);
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
      // Thói quen gắn với mục tiêu được giữ lại, chỉ bỏ liên kết
      store().get().habits.forEach(function (h) {
        if (h.goal_id === goal.id) ops.push({ type: 'upsert', table: 'Habits', row: Object.assign({}, h, { goal_id: '' }) });
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
        '<div class="modal-foot"><button type="button" class="btn btn-danger" data-act="reset">' + icon('refresh', 'ic18') + 'Khôi phục dữ liệu mẫu</button>' +
        '<span class="spacer"></span><button type="button" class="btn btn-soft" data-close>' + icon('close', 'ic18') + 'Đóng</button></div>'
      : (reason ? '<p class="form-error" style="margin:0 0 12px">' + esc(reason) + '</p>' : '') +
        '<p>Dán mã bí mật lấy từ Apps Script. Mỗi thiết bị chỉ cần nhập một lần.</p>' +
        '<form data-form="settings" novalidate><label class="field"><span>' + icon('key', 'ic14') + 'Mã bí mật</span>' +
        '<input class="input num" name="token" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + esc(App.settings.getToken()) + '"></label>' +
        '<p class="form-error" hidden data-err="token"></p>' +
        '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn btn-soft" data-close>' + icon('close', 'ic18') + 'Đóng</button>' +
        '<button type="submit" class="btn btn-primary">' + icon('cloud', 'ic18') + 'Lưu và kết nối</button></div></form>';

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
        btn.disabled = false; btn.innerHTML = icon('cloud', 'ic18') + 'Lưu và kết nối';
        err.textContent = e2.message || 'Không kết nối được.'; err.hidden = false;
      });
    });
  }

  return { openTask: openTask, openGoal: openGoal, deleteGoal: deleteGoal, openSettings: openSettings, addMetric: addMetric, openHabit: openHabit };
})();

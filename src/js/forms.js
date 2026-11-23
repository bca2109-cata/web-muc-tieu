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

  /* ---------- Task (GĐ6) ----------
     Tên, Bước đầu tiên, icon, mục tiêu, Quan trọng, Thời lượng, Ngày sẽ làm (trống = Kho), Hạn chót + giờ (không bắt buộc),
     lặp lại, trạng thái, ghi chú, việc con (chia nhỏ), 3 việc chính hôm nay */
  function durSeg(name, list, selected) {
    return seg(name, list.map(function (m) { return { key: String(m), label: App.logic.DURATION_LABELS[m] || App.logic.fmtMin(m) }; }), String(selected));
  }
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
    var kids = isNew ? [] : L.children(state.tasks, t.id);
    var parent = t.parent_id ? state.tasks.find(function (x) { return x.id === t.parent_id; }) : null;
    // Chỉ chọn lặp lại khi tạo việc mới hoặc sửa việc lặp mẫu
    var canRepeat = (isNew || isTpl) && !t.parent_id;
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
        '<p class="info-line warn-line" data-dup hidden></p>' +
        '<small class="muted repeat-note"' + (repeat === 'none' ? ' hidden' : '') + '>Mỗi ngày khớp sẽ tự có một việc mới, Ngày sẽ làm và hạn chót là đúng ngày đó. Ngày bỏ lỡ vẫn tính vào % mục tiêu.</small></div>'
      : (t.parent_recurring_id ? '<p class="info-line">' + icon('refresh', 'ic14') + 'Đây là một lần của việc lặp lại. Muốn đổi lịch lặp thì vào tab Task, mục Việc lặp lại.</p>' : '');

    var durList = t.parent_id ? App.C.CHILD_DURATIONS : App.C.DURATIONS;
    var dur = L.duration(t);
    if (durList.indexOf(dur) < 0) durList = durList.concat([dur]).sort(function (a, b) { return a - b; });
    var kidsSum = kids.reduce(function (a, k) { return a + L.duration(k); }, 0);
    var durBlock = kids.length
      ? '<p class="info-line">' + icon('hourglass', 'ic14') + '<span>Đã chia thành <span class="num">' + kids.length + '</span> việc con, tổng <span class="num">' + L.fmtMin(kidsSum) + '</span>. Thời lượng ước lượng ban đầu: <span class="num">' + L.fmtMin(dur) + '</span>.</span></p>'
      : '<div class="field"><span>' + icon('hourglass', 'ic14') + 'Thời lượng' + (t.parent_id ? ' <small class="muted">(việc con: tối đa 1 giờ)</small>' : '') + '</span>' + durSeg('duration_min', durList, dur) + '</div>';
    var doBlock = kids.length
      ? '<p class="info-line">' + icon('calendar', 'ic14') + 'Việc đã chia nhỏ: đặt Ngày sẽ làm cho từng việc con.</p>'
      : '<div class="field" data-do-field' + (repeat === 'none' ? '' : ' hidden') + '><span>' + icon('calendar', 'ic14') + 'Ngày sẽ làm <small class="muted">(để trống = nằm trong Kho)</small></span>' +
        '<div class="do-row">' + dateInput('do_date', L.doDate(t)) + '</div>' +
        '<div class="do-quick" role="group" aria-label="Chọn nhanh Ngày sẽ làm">' +
        '<button type="button" class="btn btn-soft" data-do="' + today + '">Hôm nay</button>' +
        '<button type="button" class="btn btn-soft" data-do="' + App.date.addDays(today, 1) + '">Mai</button>' +
        '<button type="button" class="btn btn-soft" data-do="">' + icon('box', 'ic14') + 'Để vào kho</button></div>' +
        '<div class="do-msg" aria-live="polite"></div></div>';
    var kidsBlock = '';
    if (!isNew && !isTpl && !t.parent_id && !t.parent_recurring_id) {
      kidsBlock = '<div class="field kids"><span>' + icon('list', 'ic14') + 'Việc con' + (kids.length ? ' <span class="num">' + kids.filter(L.isDone).length + '/' + kids.length + '</span> xong' : '') + '</span>' +
        (kids.length ? '<ul class="kid-list">' + kids.map(function (k) {
          return '<li class="' + (L.isDone(k) ? 'is-done' : '') + '">' + icon(L.isDone(k) ? 'check' : 'play', 'ic14') + '<span>' + esc(k.title) + '</span><span class="num">' + L.fmtMin(L.duration(k)) + '</span>' +
            '<span class="muted">' + (L.isDone(k) ? 'Xong' : L.doDate(k) ? App.date.fmt(L.doDate(k)).slice(0, 5) : 'Kho') + '</span></li>';
        }).join('') + '</ul>' : '<small class="muted">Việc từ 2 giờ trở lên cần chia thành các việc 15 phút đến 1 giờ trước khi xếp vào ngày.</small>') +
        '<button type="button" class="btn btn-soft" data-act="split">' + icon('plus', 'ic18') + (kids.length ? 'Thêm việc con' : 'Chia nhỏ') + '</button></div>';
    } else if (parent) {
      kidsBlock = '<p class="info-line">' + icon('list', 'ic14') + '<span>Việc con của "' + esc(parent.title) + '".</span></p>';
    }

    var body = '<form data-form="task" novalidate>' +
      '<label class="field"><span>' + icon('text', 'ic14') + 'Tên việc</span><input class="input" name="title" maxlength="200" required autofocus value="' + esc(t.title) + '"></label>' +
      '<p class="form-error" hidden data-err="title">Hãy nhập tên việc.</p>' +
      '<label class="field"><span>' + icon('play', 'ic14') + 'Bước đầu tiên <small class="muted">(việc nhỏ khoảng 15 phút để bắt đầu)</small></span><input class="input" name="first_step" maxlength="150" placeholder="Ví dụ: mở file, viết 3 ý chính" value="' + esc(t.first_step) + '"></label>' +
      '<div class="field"><span>' + icon('sparkle', 'ic14') + 'Icon <small class="muted">(tự đoán theo tên, bấm để đổi)</small></span>' + iconPicker(App.logic.iconOf(t)) + '</div>' +
      '<label class="field"><span>' + icon('target', 'ic14') + 'Mục tiêu <small class="muted">(nhóm Công việc xếp vào giờ làm, nhóm khác xếp vào buổi tối)</small></span><select class="select" name="goal_id">' + options(goalOpts, t.goal_id) + '</select></label>' +
      '<div class="field" data-bucket-field' + (t.goal_id ? ' hidden' : '') + '><span>' + icon('clock', 'ic14') + 'Việc này tính vào <small class="muted">(không gắn mục tiêu nên chọn tay, web nhớ lựa chọn lần trước)</small></span>' +
      seg('bucket', [{ key: 'work', label: 'Giờ làm' }, { key: 'evening', label: 'Buổi tối' }], t.bucket === 'work' || t.bucket === 'evening' ? t.bucket : App.logic.lastBucket()) + '</div>' +
      '<label class="check-line"><input type="checkbox" name="is_important"' + (L.isImportant(t) ? ' checked' : '') + '>' + icon('heart', 'ic18') + 'Quan trọng</label>' +
      durBlock + doBlock +
      '<div class="dt-row"><label class="field"><span>' + icon('flag', 'ic14') + '<span data-due-label>' + (repeat === 'none' ? 'Hạn chót' : 'Bắt đầu lặp từ') + '</span> <small class="muted" data-due-opt' + (repeat === 'none' ? '' : ' hidden') + '>(không bắt buộc)</small></span>' + dateInput('due_date', t.due_date || (repeat === 'none' ? '' : today)) + '</label>' +
      '<label class="field"><span>' + icon('clock', 'ic14') + 'Giờ <small class="muted">(không bắt buộc)</small></span><input class="input num" type="time" name="due_time" value="' + esc(L.isTime(t.due_time) ? t.due_time : '') + '"></label></div>' +
      '<p class="form-error" hidden data-err="due"></p>' +
      repeatBlock +
      '<div class="field"><span>' + icon('flag', 'ic14') + 'Trạng thái</span>' + seg('status', App.C.TASK_STATUS, t.status) + '</div>' +
      kidsBlock +
      '<label class="field"><span>' + icon('text', 'ic14') + 'Ghi chú</span><textarea class="textarea" name="note" maxlength="1000">' + esc(t.note) + '</textarea></label>' +
      '<label class="check-line" data-top3-line' + (repeat === 'none' ? '' : ' hidden') + '><input type="checkbox" name="top3"' + (top ? ' checked' : '') + '>' + icon('star', 'ic18') + '3 việc chính hôm nay</label>' +
      '<p class="form-error" hidden data-err="top3">3 việc chính hôm nay đã đủ. Bỏ bớt một việc trước.</p>' +
      '<p class="form-error" hidden data-err="big"></p>' +
      '<div class="modal-foot">' +
      (isNew ? '' : '<button type="button" class="btn btn-danger" data-act="delete">' + icon('trash', 'ic18') + 'Xóa</button>') +
      '<span class="spacer"></span><button type="button" class="btn btn-soft" data-close>' + icon('close', 'ic18') + 'Hủy</button>' +
      '<button type="submit" class="btn btn-primary">' + icon(isNew ? 'plus' : 'check', 'ic18') + (isNew ? 'Thêm' : 'Lưu') + '</button></div></form>';

    var m = App.ui.openModal({ title: isNew ? 'Thêm việc' : isTpl ? 'Sửa việc lặp lại' : 'Sửa việc', body: body });
    var form = m.querySelector('form');
    bindDates(form);

    // Ngày sẽ làm: chọn nhanh, báo ngay khi ngày đó đã đầy quỹ hoặc việc lớn chưa chia nhỏ
    function curDur() { return form.elements.duration_min ? +val(form, 'duration_min') || dur : dur; }
    function syncDo() {
      var box = form.querySelector('.do-msg');
      if (!box) return;
      var d = val(form, 'do_date'), msg = '';
      if (App.date.isValid(d)) {
        if (curDur() >= App.C.BIG_MIN && !kids.length) msg = '<p class="qa-warn">' + icon('alert', 'ic14') + '<span>Việc từ <span class="num">2</span> giờ trở lên phải chia nhỏ trước khi xếp vào ngày. Để vào kho rồi bấm Chia nhỏ.</span></p>';
        else {
          var probe = Object.assign({}, t, { goal_id: val(form, 'goal_id'), bucket: val(form, 'bucket'), duration_min: String(curDur()), do_date: d });
          var f = App.plan.fit(store().get(), d, probe);
          msg = '<p class="' + (f.over > 0 ? 'qa-warn' : 'qa-ok') + '">' + icon(f.over > 0 ? 'alert' : 'check', 'ic14') + '<span>' + App.date.weekday(d) + ' <span class="num">' + App.date.fmt(d).slice(0, 5) + '</span>, ' + f.label.toLowerCase() + ': <span class="num">' + L.fmtMin(f.total) + ' / ' + L.fmtMin(f.avail) + '</span>' + (f.over > 0 ? ', quá tải <span class="num">' + f.over + '</span> phút' : '') + '.</span></p>';
        }
      } else msg = '<p class="muted">' + icon('box', 'ic14') + 'Việc sẽ nằm trong Kho.</p>';
      box.innerHTML = msg;
    }
    form.querySelectorAll('[data-do]').forEach(function (b) {
      b.addEventListener('click', function () { form.elements.do_date.value = b.getAttribute('data-do'); refreshDates(form); syncDo(); });
    });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'goal_id') { var bf = form.querySelector('[data-bucket-field]'); if (bf) bf.hidden = !!e.target.value; }
      if (['do_date', 'duration_min', 'goal_id', 'bucket'].indexOf(e.target.name) >= 0) syncDo();
    });
    form.addEventListener('input', function (e) { if (e.target.name === 'do_date') syncDo(); });
    syncDo();

    // Đổi kiểu lặp thì hiện hoặc ẩn các thứ, đổi nhãn ngày; lặp hằng ngày trùng thói quen thì báo
    function syncRepeat() {
      if (!canRepeat) return;
      var r = val(form, 'repeat') || 'none';
      form.querySelector('[data-weekdays]').hidden = r !== 'weekly';
      form.querySelector('.repeat-note').hidden = r === 'none';
      form.querySelector('[data-top3-line]').hidden = r !== 'none';
      var df = form.querySelector('[data-do-field]');
      if (df) df.hidden = r !== 'none';
      form.querySelector('[data-due-label]').textContent = r === 'none' ? 'Hạn chót' : 'Bắt đầu lặp từ';
      form.querySelector('[data-due-opt]').hidden = r !== 'none';
      // Ngày bắt đầu lặp tự điền hôm nay; quay về Không lặp thì xóa lại ngày tự điền (hạn chót không bắt buộc)
      if (r !== 'none' && !form.elements.due_date.value) { form.elements.due_date.value = today; form.dataset.autoDue = '1'; refreshDates(form); }
      else if (r === 'none' && form.dataset.autoDue && form.elements.due_date.value === today) { form.elements.due_date.value = ''; delete form.dataset.autoDue; refreshDates(form); }
      var dupEl = form.querySelector('[data-dup]'), h = r === 'daily' ? L.similarHabit(val(form, 'title'), store().get().habits) : null;
      dupEl.hidden = !h;
      if (h) dupEl.innerHTML = icon('alert', 'ic14') + '<span>Trùng với thói quen "' + esc(h.name) + '". Việc lặp hằng ngày trùng thói quen sẽ không tạo việc, chỉ hiện ở tab Thói quen.</span>';
    }
    if (canRepeat) {
      form.addEventListener('change', function (e) { if (e.target.name === 'repeat') syncRepeat(); });
      form.elements.title.addEventListener('input', syncRepeat);
    }

    // Chưa tự chọn icon thì đổi icon theo tên đang gõ
    var iconTouched = !isNew && App.logic.TASK_ICONS.indexOf(t.icon) >= 0 && t.icon !== App.logic.guessIcon(t.title);
    form.querySelector('.icon-pick').addEventListener('change', function () { iconTouched = true; });
    form.elements.title.addEventListener('input', function () {
      if (iconTouched) return;
      var g = App.logic.guessIcon(form.elements.title.value);
      var r = form.querySelector('input[name="icon"][value="' + g + '"]');
      if (r) r.checked = true;
    });

    var splitBtn = m.querySelector('[data-act="split"]');
    if (splitBtn) splitBtn.addEventListener('click', function () { App.app.splitTask(t.id); });

    m.querySelector('[data-act="delete"]') && m.querySelector('[data-act="delete"]').addEventListener('click', function () {
      App.ui.ask(isTpl ? 'Xóa việc lặp lại' : 'Xóa việc', isTpl
        ? 'Ngừng lặp và xóa "' + t.title + '"? Các lần đã sinh trước đó vẫn được giữ. Không hoàn tác được.'
        : 'Xóa việc "' + t.title + '"?' + (kids.length ? ' ' + kids.length + ' việc con vẫn được giữ, thành việc riêng.' : '') + ' Không hoàn tác được.', [
        { label: 'Xóa việc', value: 'yes', kind: 'danger' }, { label: 'Hủy', value: null }
      ]).then(function (v) {
        if (v !== 'yes') return;
        store().batch([{ type: 'delete', table: 'Tasks', id: t.id }].concat(kids.map(function (k) { return { type: 'upsert', table: 'Tasks', row: Object.assign({}, k, { parent_id: '' }) }; })));
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
      var due = val(form, 'due_date'), dueTime = val(form, 'due_time'), errDue = form.querySelector('[data-err="due"]');
      var dueMsg = '';
      if (due && !App.date.isValid(due)) dueMsg = 'Ngày hạn chót không đúng.';
      else if (repeatKind !== 'none' && !due) dueMsg = 'Hãy chọn ngày bắt đầu lặp.';
      else if (dueTime && !L.isTime(dueTime)) dueMsg = 'Giờ không đúng.';
      else if (dueTime && !due) dueMsg = 'Có giờ thì chọn thêm ngày hạn chót.';
      errDue.textContent = dueMsg; errDue.hidden = !dueMsg;
      if (dueMsg) return;
      var minutes = curDur();
      var doDate = repeatKind === 'none' && form.elements.do_date ? val(form, 'do_date') : (kids.length ? '' : '');
      if (doDate && !App.date.isValid(doDate)) doDate = '';
      var errBig = form.querySelector('[data-err="big"]');
      var bigBlock = doDate && minutes >= App.C.BIG_MIN && !kids.length;
      errBig.textContent = bigBlock ? 'Việc từ 2 giờ trở lên phải chia nhỏ trước khi xếp vào ngày. Bấm "Để vào kho", lưu, rồi mở lại để Chia nhỏ.' : '';
      errBig.hidden = !bigBlock;
      if (bigBlock) return;
      var row = Object.assign({}, t, {
        title: title, goal_id: val(form, 'goal_id'), bucket: val(form, 'goal_id') ? '' : (val(form, 'bucket') === 'work' ? 'work' : 'evening'), due_date: due, due_time: due ? dueTime : '',
        status: val(form, 'status') || 'Cần làm', note: val(form, 'note'), first_step: val(form, 'first_step'),
        is_important: form.elements.is_important.checked ? 'TRUE' : 'FALSE', duration_min: String(minutes),
        icon: val(form, 'icon') || App.logic.guessIcon(title)
      });
      if (!row.goal_id) App.logic.rememberBucket(row.bucket);
      if (repeatKind !== 'none' && minutes >= App.C.BIG_MIN) {
        errBig.textContent = 'Việc lặp lại mỗi lần phải dưới 2 giờ. Chọn thời lượng ngắn hơn hoặc tách thành nhiều việc lặp.';
        errBig.hidden = false;
        return;
      }
      if (repeatKind !== 'none') {
        // Việc lặp mẫu: không có trạng thái riêng, không vào 3 việc chính, ngày = ngày bắt đầu lặp, không nằm trong kho
        Object.assign(row, { recurring_rule: L.makeRule(days), status: 'Cần làm', done_at: '', is_top3: 'FALSE', top3_date: '',
          due_date: row.due_date || today, do_date: '', inbox_since: '' });
        store().upsert('Tasks', row);
        App.ui.closeModal();
        App.app.generateRecurring();
        var dupH = days.length === 7 ? L.similarHabit(title, store().get().habits) : null;
        App.ui.toast(dupH ? 'Đã lưu. Việc này trùng thói quen "' + dupH.name + '" nên chỉ hiện ở tab Thói quen.'
          : isNew ? 'Đã tạo việc lặp lại: ' + L.ruleLabel(row.recurring_rule) + '.' : 'Đã lưu việc lặp lại. Thay đổi áp dụng cho các lần sau.');
        return;
      }
      if (isTpl) row.recurring_rule = '';
      if (!kids.length && !t.parent_recurring_id) {
        row.do_date = doDate;
        row.inbox_since = doDate ? '' : (L.doDate(t) || !t.inbox_since ? today : t.inbox_since);
      }
      var justDone = row.status === App.C.DONE && t.status !== App.C.DONE;
      if (row.status === App.C.DONE && !row.done_at) row.done_at = today;
      if (row.status !== App.C.DONE) row.done_at = '';
      if (wantTop) { row.is_top3 = 'TRUE'; row.top3_date = today; }
      else if (top) { row.is_top3 = 'FALSE'; row.top3_date = ''; }
      var fit = doDate && doDate !== L.doDate(t) && row.status !== App.C.DONE ? App.plan.fit(store().get(), doDate, row) : null;
      store().batch([{ type: 'upsert', table: 'Tasks', row: row }].concat(App.app.parentSync(row)));
      App.ui.closeModal();
      if (justDone) App.app.celebrate(t, null);
      else if (fit && fit.over > 0) App.ui.toast('Đã lưu. ' + App.date.weekday(doDate) + ' ' + App.date.fmt(doDate).slice(0, 5) + ' đã xếp ' + L.fmtMin(fit.total) + ' / ' + L.fmtMin(fit.avail) + ' (' + fit.label.toLowerCase() + '), quá tải ' + fit.over + ' phút.', { duration: 5000 });
      else App.ui.toast(isNew ? (row.do_date ? 'Đã thêm việc.' : 'Đã thêm việc vào Kho.') : 'Đã lưu thay đổi.');
    });
  }

  /* Chia nhỏ việc lớn: mỗi dòng một việc con (tên + 15p / 30p / 1h). Việc con lấy mục tiêu, Quan trọng, hạn chót của việc gốc, vào Kho. */
  function openSplit(t, onDone) {
    var L = App.logic, today = App.date.today();
    var have = L.children(store().get().tasks, t.id);
    function row(i) {
      return '<div class="split-row"><label class="field"><span class="sr-only">Tên việc con ' + (i + 1) + '</span><input class="input" name="kid" id="kid-' + i + '" maxlength="200" placeholder="Việc con ' + (i + 1) + '"></label>' +
        durSeg('kdur-' + i, App.C.CHILD_DURATIONS, 60) + '</div>';
    }
    var n = have.length ? 1 : 3;
    var body = '<form data-form="split" novalidate><p class="muted">Việc gốc: <b>' + esc(t.title) + '</b>, ước lượng <span class="num">' + L.fmtMin(L.duration(t)) + '</span>' +
      (have.length ? ', đã có <span class="num">' + have.length + '</span> việc con' : '') + '. Mỗi việc con từ <span class="num">15</span> phút đến <span class="num">1</span> giờ, sau đó đặt ngày cho từng việc.</p>' +
      '<div class="split-rows">' + Array.apply(null, Array(n)).map(function (_, i) { return row(i); }).join('') + '</div>' +
      '<button type="button" class="btn btn-soft" data-act="more">' + icon('plus', 'ic18') + 'Thêm dòng</button>' +
      '<p class="split-sum muted" aria-live="polite"></p>' +
      '<p class="form-error" hidden data-err="kid">Hãy nhập tên ít nhất một việc con.</p>' +
      '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn btn-soft" data-close>' + icon('close', 'ic18') + 'Hủy</button>' +
      '<button type="submit" class="btn btn-primary">' + icon('check', 'ic18') + 'Tạo việc con</button></div></form>';
    var m = App.ui.openModal({ title: 'Chia nhỏ việc', body: body });
    var form = m.querySelector('form'), rows = form.querySelector('.split-rows');
    function sum() {
      var tot = have.reduce(function (a, k) { return a + L.duration(k); }, 0);
      form.querySelectorAll('.split-row').forEach(function (r, i) {
        if (r.querySelector('[name="kid"]').value.trim()) tot += +val(form, 'kdur-' + i) || 60;
      });
      form.querySelector('.split-sum').innerHTML = 'Tổng việc con: <span class="num">' + L.fmtMin(tot) + '</span> / ước lượng <span class="num">' + L.fmtMin(L.duration(t)) + '</span>';
    }
    form.addEventListener('input', sum); form.addEventListener('change', sum); sum();
    form.querySelector('[data-act="more"]').addEventListener('click', function () {
      var i = form.querySelectorAll('.split-row').length;
      rows.insertAdjacentHTML('beforeend', row(i));
      form.querySelector('#kid-' + i).focus();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ops = [];
      form.querySelectorAll('.split-row').forEach(function (r, i) {
        var name = r.querySelector('[name="kid"]').value.trim();
        if (!name) return;
        ops.push({ type: 'upsert', table: 'Tasks', row: L.newTask({
          title: name, goal_id: t.goal_id, bucket: t.bucket || '', parent_id: t.id, is_important: L.isImportant(t) ? 'TRUE' : 'FALSE',
          due_date: t.due_date, due_time: t.due_time, duration_min: String(+val(form, 'kdur-' + i) || 60), inbox_since: today
        }) });
      });
      form.querySelector('[data-err="kid"]').hidden = !!ops.length;
      if (!ops.length) return;
      // Việc gốc không xếp vào ngày nữa (từng việc con có ngày riêng)
      var p = Object.assign({}, t, { do_date: '', inbox_since: t.inbox_since || today });
      if (App.logic.isDone(t)) Object.assign(p, { status: 'Cần làm', done_at: '' });
      ops.push({ type: 'upsert', table: 'Tasks', row: p });
      store().batch(ops);
      App.ui.closeModal();
      if (onDone) onDone(ops.length - 1);
    });
  }

  // Ghi chú khi hỏi lại người giao (việc đã dời nhiều lần)
  function askNote(t, onSave) {
    var body = '<form novalidate><p class="muted">Việc "<b>' + esc(t.title) + '</b>" đã dời <span class="num">' + App.logic.deferCount(t) + '</span> lần. Ghi lại cần hỏi gì, việc sẽ nằm trong kho chờ trả lời.</p>' +
      '<label class="field"><span>' + icon('users', 'ic14') + 'Cần hỏi lại</span><textarea class="textarea" name="q" maxlength="300" autofocus placeholder="Ví dụ: hạn chót thật là khi nào, có cần làm nữa không"></textarea></label>' +
      '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn btn-soft" data-close>' + icon('close', 'ic18') + 'Hủy</button>' +
      '<button type="submit" class="btn btn-primary">' + icon('check', 'ic18') + 'Lưu ghi chú</button></div></form>';
    var m = App.ui.openModal({ title: 'Hỏi lại người giao', body: body });
    m.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var text = val(e.target, 'q');
      App.ui.closeModal();
      onSave(text);
    });
  }

  // Ghi việc đột xuất: tên và thời lượng 15p / 30p / 1h / 2h, tính vào hôm nay
  function openInterruption(onSave) {
    var body = '<form novalidate>' +
      '<label class="field"><span>' + icon('bolt', 'ic14') + 'Việc đột xuất</span><input class="input" name="title" maxlength="200" autofocus placeholder="Ví dụ: Hỗ trợ sale lấy data"></label>' +
      '<p class="form-error" hidden data-err="title">Hãy nhập tên việc.</p>' +
      '<div class="field"><span>' + icon('hourglass', 'ic14') + 'Mất bao lâu</span>' + durSeg('duration_min', [15, 30, 60, 120], 30) + '</div>' +
      '<p class="muted">Thời gian này trừ vào quỹ giờ hôm nay' + (App.plan.isWeekend(App.date.today()) ? ' (quỹ cuối tuần).' : ' (giờ làm).') + '</p>' +
      '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn btn-soft" data-close>' + icon('close', 'ic18') + 'Hủy</button>' +
      '<button type="submit" class="btn btn-primary">' + icon('plus', 'ic18') + 'Ghi lại</button></div></form>';
    var m = App.ui.openModal({ title: 'Ghi việc đột xuất', body: body });
    m.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, title = val(f, 'title');
      f.querySelector('[data-err="title"]').hidden = !!title;
      if (!title) { f.elements.title.focus(); return; }
      App.ui.closeModal();
      onSave(App.plan.newInterruption({ title: title, duration_min: String(+val(f, 'duration_min') || 30) }));
    });
  }

  /* Xem lại kho: đi qua từng việc trong kho (nằm lâu nhất trước). Giữ / Đặt ngày làm / Bỏ. Xong thì gọi onFinish. */
  function inboxReview(onFinish) {
    var L = App.logic, D = App.date, today = D.today();
    var ids = store().get().tasks.filter(L.inInbox).sort(function (a, b) {
      return L.inboxDays(b, today) - L.inboxDays(a, today) || L.deferCount(b) - L.deferCount(a);
    }).map(function (t) { return t.id; });
    var i = 0, kept = 0, placed = 0, dropped = 0;
    if (!ids.length) { App.ui.toast('Kho đang trống.'); if (onFinish) onFinish(); return; }
    function step() {
      var st = store().get(), t = null;
      while (i < ids.length && !(t = st.tasks.find(function (x) { return x.id === ids[i]; }))) i++;
      if (!t) {
        App.ui.closeModal();
        if (onFinish) onFinish();
        App.ui.toast('Xem xong kho: giữ ' + kept + ', đặt ngày ' + placed + ', bỏ ' + dropped + ' việc.', { duration: 5000 });
        App.app.render();
        return;
      }
      var big = L.needsSplit(t, st.tasks), kids = L.children(st.tasks, t.id).length;
      var g = st.goals.find(function (x) { return x.id === t.goal_id; });
      var body = '<div class="ir"><p class="ir-count">Việc <span class="num">' + (i + 1) + '/' + ids.length + '</span></p>' +
        '<h3 class="ir-title">' + esc(t.title) + '</h3>' +
        '<p class="meta">' + App.comp.durTag(t) + App.comp.impTag(t) + App.comp.deferTag(t) +
        App.comp.tag('tplain', 'box', 'Nằm kho <span class="num">' + L.inboxDays(t, today) + '</span> ngày') + (t.due_date ? App.comp.dueTag(t, today) : '') +
        App.comp.tag('tplain', 'tag', esc(g ? g.name : App.C.MISC)) + '</p>' +
        (t.note ? '<p class="muted ir-note">' + esc(t.note) + '</p>' : '') +
        '<div class="ir-acts">' +
        '<button type="button" class="btn btn-soft" data-ir="keep">' + icon('box', 'ic18') + 'Giữ trong kho</button>' +
        (kids ? '' : big ? '<button type="button" class="btn btn-soft" data-ir="split">' + icon('list', 'ic18') + 'Chia nhỏ</button>'
          : '<div class="ir-day"><label class="field"><span>' + icon('calendar', 'ic14') + 'Đặt ngày làm</span>' + dateInput('ir_date', D.addDays(today, 1)) + '</label>' +
            '<button type="button" class="btn btn-soft" data-ir="today">Hôm nay</button><button type="button" class="btn btn-primary" data-ir="day">' + icon('check', 'ic18') + 'Đặt ngày</button></div>') +
        '<button type="button" class="btn btn-danger" data-ir="drop">' + icon('trash', 'ic18') + 'Bỏ việc này</button></div></div>';
      var m = App.ui.openModal({ title: 'Xem lại kho', body: body });
      var box = m.querySelector('.ir');
      bindDates(box.closest('.modal'));
      box.addEventListener('click', function (e) {
        var b = e.target.closest('[data-ir]');
        if (!b) return;
        var k = b.getAttribute('data-ir');
        if (k === 'keep') { kept++; i++; step(); }
        else if (k === 'split') { App.ui.closeModal(); App.app.splitTask(t.id); }
        else if (k === 'today' || k === 'day') {
          var d = k === 'today' ? today : (m.querySelector('[name="ir_date"]') || {}).value;
          if (!D.isValid(d) || d < today) { App.ui.toast('Chọn hôm nay hoặc một ngày sau.'); return; }
          var moved = Object.assign({}, t, { do_date: d, inbox_since: '' }), fit = App.plan.fit(store().get(), d, moved);
          store().upsert('Tasks', moved);
          if (fit.over > 0) App.ui.toast(fit.label + ' ngày ' + D.fmt(d).slice(0, 5) + ' đã ' + L.fmtMin(fit.total) + ' / ' + L.fmtMin(fit.avail) + ', quá tải ' + fit.over + ' phút.', { duration: 5000 });
          placed++; i++; step();
        } else if (k === 'drop') {
          store().remove('Tasks', t.id);
          dropped++; i++;
          App.ui.toast('Đã bỏ "' + t.title + '".', { actionLabel: 'Hoàn tác', actionIcon: 'refresh', duration: 6000, action: function () { store().upsert('Tasks', t); } });
          step();
        }
      });
    }
    step();
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

  /* Quỹ giờ (GĐ6): lưu một dòng id = "main" ở sheet Settings */
  function readBudget(f) {
    var row = {};
    ['work_start', 'work_end', 'lunch_min', 'fixed_min', 'buffer_pct', 'evening_min', 'weekend_min', 'review_weekday', 'review_time'].forEach(function (k) { row[k] = val(f, k); });
    return row;
  }
  function budgetError(r) {
    var L = App.logic, P = App.plan;
    if (!L.isTime(r.work_start) || !L.isTime(r.work_end) || !L.isTime(r.review_time)) return 'Giờ phải đúng dạng giờ:phút.';
    if (P.minutes(r.work_end) <= P.minutes(r.work_start)) return 'Hết giờ làm phải sau giờ bắt đầu.';
    var bad = ['lunch_min', 'fixed_min', 'buffer_pct', 'evening_min', 'weekend_min'].filter(function (k) { return !/^\d{1,3}$/.test(r[k]); });
    if (bad.length) return 'Các ô phút và % phải là số nguyên, không âm.';
    if (+r.buffer_pct > 90) return 'Dự phòng tối đa 90%.';
    if (P.workNet(r) <= 0) return 'Nghỉ trưa và việc cố định dài hơn cả giờ làm.';
    return '';
  }
  function bindBudget(f) {
    if (!f) return;
    var L = App.logic;
    function show() {
      var r = readBudget(f), err = budgetError(r), read = f.querySelector('[data-budget-read]');
      read.innerHTML = err ? '' : icon('hourglass', 'ic14') + '<span>Quỹ giờ làm ngày thường: (<span class="num">' + L.fmtMin(App.plan.minutes(r.work_end) - App.plan.minutes(r.work_start)) +
        '</span> − nghỉ trưa − việc cố định) × <span class="num">' + (100 - +r.buffer_pct) + '%</span> = <b class="num">' + L.fmtMin(App.plan.workBudget(r)) + '</b>. Buổi tối <span class="num">' + L.fmtMin(+r.evening_min) +
        '</span>, cuối tuần <span class="num">' + L.fmtMin(+r.weekend_min) + '</span>.</span>';
    }
    f.addEventListener('input', show); f.addEventListener('change', show); show();
    f.querySelector('[data-act="budget-reset"]').addEventListener('click', function () {
      Object.keys(App.plan.DEFAULTS).forEach(function (k) { if (f.elements[k]) f.elements[k].value = App.plan.DEFAULTS[k]; });
      show();
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = readBudget(f), err = budgetError(r), box = f.querySelector('[data-err="budget"]');
      box.textContent = err; box.hidden = !err;
      if (err) return;
      store().upsert('Settings', Object.assign({ id: 'main' }, r));
      App.ui.toast('Đã lưu quỹ giờ: giờ làm ' + L.fmtMin(App.plan.workBudget(r)) + ', tối ' + L.fmtMin(+r.evening_min) + '.');
    });
  }

  /* ---------- Cài đặt ---------- */
  function openSettings(reason) {
    var mock = App.api.mode === 'mock';
    var conn = mock
      ? '<p>Đang dùng <strong>dữ liệu mẫu</strong> lưu trên trình duyệt này, chưa kết nối Google Sheet.</p>' +
        '<button type="button" class="btn btn-danger" data-act="reset">' + icon('refresh', 'ic18') + 'Khôi phục dữ liệu mẫu</button>'
      : (reason ? '<p class="form-error" style="margin:0 0 12px">' + esc(reason) + '</p>' : '') +
        '<p>Dán mã bí mật lấy từ Apps Script. Mỗi thiết bị chỉ cần nhập một lần.</p>' +
        '<form data-form="settings" novalidate><label class="field"><span>' + icon('key', 'ic14') + 'Mã bí mật</span>' +
        '<input class="input num" name="token" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + esc(App.settings.getToken()) + '"></label>' +
        '<p class="form-error" hidden data-err="token"></p>' +
        '<button type="submit" class="btn btn-primary">' + icon('cloud', 'ic18') + 'Lưu và kết nối</button></form>';
    var bs = App.plan.settings(store().get());
    var WD = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    function nbox(name, label, unit, max) {
      return '<label class="field"><span>' + label + ' <small class="muted">(' + unit + ')</small></span><input class="input num" type="number" inputmode="numeric" min="0" max="' + max + '" step="5" name="' + name + '" value="' + esc(bs[name]) + '"></label>';
    }
    var budget = '<section class="set-sec"><h3>' + icon('hourglass', 'ic18') + 'Quỹ giờ</h3>' +
      '<form data-form="budget" novalidate><div class="row2">' +
      '<label class="field"><span>Bắt đầu làm</span><input class="input num" type="time" name="work_start" value="' + esc(bs.work_start) + '"></label>' +
      '<label class="field"><span>Hết giờ làm</span><input class="input num" type="time" name="work_end" value="' + esc(bs.work_end) + '"></label></div>' +
      '<div class="row2">' + nbox('lunch_min', 'Nghỉ trưa', 'phút', 300) + nbox('fixed_min', 'Việc cố định', 'phút', 300) + '</div>' +
      '<div class="row2">' + nbox('buffer_pct', 'Dự phòng đột xuất', '%', 90) + nbox('evening_min', 'Buổi tối', 'phút', 600) + '</div>' +
      '<div class="row2">' + nbox('weekend_min', 'Thứ Bảy, Chủ nhật', 'phút', 900) + '</div>' +
      '<div class="field"><span>Nhắc xem lại kho mỗi tuần</span><div class="do-row"><select class="select" name="review_weekday">' +
      WD.map(function (w, i) { return '<option value="' + i + '"' + (String(i) === String(bs.review_weekday) ? ' selected' : '') + '>' + w + '</option>'; }).join('') +
      '</select><input class="input num" type="time" name="review_time" value="' + esc(bs.review_time) + '" aria-label="Giờ xem lại kho"></div></div>' +
      '<p class="muted set-note">Đến giờ hết làm, việc nhóm Công việc của hôm nay chưa xong sẽ về kho. Việc cố định là báo cáo, họp mỗi sáng.</p>' +
      '<p class="info-line" data-budget-read></p><p class="form-error" hidden data-err="budget"></p>' +
      '<div class="set-row"><button type="submit" class="btn btn-primary">' + icon('check', 'ic18') + 'Lưu quỹ giờ</button>' +
      '<button type="button" class="btn btn-soft" data-act="budget-reset">' + icon('refresh', 'ic18') + 'Về mặc định</button></div></form></section>';
    var body = '<section class="set-sec">' + conn + '</section>' + budget +
      '<section class="set-sec"><h3>' + icon('moon', 'ic18') + 'Giao diện</h3>' +
      seg('theme', [{ key: 'auto', label: 'Theo máy' }, { key: 'light', label: 'Sáng' }, { key: 'dark', label: 'Tối' }], App.theme.get()) +
      '<p class="muted set-note">Chỉ đổi trên thiết bị này.</p></section>' +
      '<section class="set-sec"><h3>' + icon('doc', 'ic18') + 'Sao lưu</h3>' +
      '<p class="muted set-note">Tải toàn bộ dữ liệu về máy thành một file JSON. Khi cần, nhập lại file này để thay toàn bộ dữ liệu hiện tại.</p>' +
      '<div class="set-row"><button type="button" class="btn btn-soft" data-act="export">' + icon('down', 'ic18') + 'Xuất JSON</button>' +
      '<label class="btn btn-soft file-btn">' + icon('up', 'ic18') + 'Nhập JSON<input type="file" accept=".json,application/json" data-act="import" class="sr-only"></label></div></section>' +
      '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn btn-soft" data-close>' + icon('close', 'ic18') + 'Đóng</button></div>';

    var m = App.ui.openModal({ title: 'Cài đặt', body: body });
    bindBudget(m.querySelector('[data-form="budget"]'));

    m.querySelectorAll('input[name="theme"]').forEach(function (r) {
      r.addEventListener('change', function () { App.theme.set(r.value); });
    });
    m.querySelector('[data-act="export"]').addEventListener('click', function () {
      var c = App.backup.exportFile();
      App.ui.toast('Đã tải file sao lưu (' + c.goals + ' mục tiêu, ' + c.tasks + ' task).');
    });
    m.querySelector('[data-act="import"]').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      App.ui.closeModal();
      App.backup.importFile(file);
    });

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

  return { openTask: openTask, openGoal: openGoal, deleteGoal: deleteGoal, openSettings: openSettings, addMetric: addMetric, openHabit: openHabit,
    openSplit: openSplit, askNote: askNote, openInterruption: openInterruption, inboxReview: inboxReview };
})();

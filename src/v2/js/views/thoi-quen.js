/* V2 · Phần 4: Thói quen (tab con của route muc-tieu). Gắn bằng LP.thoiQuen.mount(el).
   Mỗi thói quen: giờ (tùy chọn), các thứ trong tuần, lưới tick 7 ngày, lửa chuỗi, chuỗi dài nhất. */
var LP = window.LP || (window.LP = {});

LP.thoiQuen = (function () {
  var D = LP.date, esc = LP.ui.esc, icon = LP.ui.icon, truthy = LP.util.truthy;
  var root = null, onChange = null;
  var WD = [['1', 'T2'], ['2', 'T3'], ['3', 'T4'], ['4', 'T5'], ['5', 'T6'], ['6', 'T7'], ['7', 'CN']];

  function S() { return LP.store.get(); }
  function activeHabits() {
    return S().habits.filter(function (h) { return truthy(h.active); })
      .sort(function (a, b) { return (a.time || '99') < (b.time || '99') ? -1 : (a.time || '99') > (b.time || '99') ? 1 : 0; });
  }
  function logOf(habitId, d) {
    return S().habitLogs.filter(function (l) { return l.habit_id === habitId && l.date === d; })[0] || null;
  }
  // Bật/tắt tick của một ngày. Trả về trạng thái mới
  function toggle(habit, d) {
    var cur = logOf(habit.id, d), on = !(cur && truthy(cur.done));
    LP.store.upsert('HabitLogs', Object.assign({}, cur || { habit_id: habit.id, date: d }, { done: on ? 'TRUE' : 'FALSE' }));
    return on;
  }
  function weekdaysText(h) {
    var s = String(h.weekdays || '').split(',').filter(Boolean);
    if (s.length === 7) return 'Mỗi ngày';
    return WD.filter(function (w) { return s.indexOf(w[0]) >= 0; }).map(function (w) { return w[1]; }).join(' ');
  }

  function card(h, today) {
    var days = D.range(D.add(today, -6), today), st = LP.stats.streak(h, today);
    var best = LP.stats.habits(D.add(today, -89), today).filter(function (x) { return x.habit.id === h.id; })[0];
    var cells = days.map(function (d) {
      var due = LP.stats.habitDue(h, d), done = LP.stats.habitDone(h, d);
      if (!due) return '<span class="mt-hday is-off"><span class="mt-hd">' + D.weekdayShort(d) + '</span><span class="mt-hoff" title="Không có lịch">–</span></span>';
      return '<span class="mt-hday' + (d === today ? ' is-today' : '') + '"><span class="mt-hd">' + D.weekdayShort(d) + '</span>' +
        '<button type="button" class="tick' + (done ? ' is-done' : '') + '" data-tick="' + d + '" data-h="' + esc(h.id) + '" aria-pressed="' + done + '" aria-label="' + esc(h.name) + ' ngày ' + D.fmt(d) + (done ? ', đã làm' : ', chưa làm') + '">' +
        '<span class="dot">' + icon('check') + '</span></button></span>';
    }).join('');
    return '<article class="card mt-habit" data-habit="' + esc(h.id) + '">' +
      '<div class="mt-hhead"><div class="mt-hmain"><h3 class="mt-hname">' + LP.cute.html(h.name, 'sprout') + esc(h.name) + '</h3>' +
      '<div class="mt-meta">' + (h.time ? '<span class="pill pill-note">' + icon('clock', 'ic14') + '<span class="num">' + esc(h.time) + '</span></span>' : '') +
      '<span class="mt-wd">' + esc(weekdaysText(h)) + '</span></div></div>' +
      '<div class="mt-hbtns"><button type="button" class="icon-btn" data-edit="' + esc(h.id) + '" aria-label="Sửa ' + esc(h.name) + '">' + icon('edit') + '</button>' +
      '<button type="button" class="icon-btn" data-del="' + esc(h.id) + '" aria-label="Xóa ' + esc(h.name) + '">' + icon('trash') + '</button></div></div>' +
      '<div class="mt-hgrid">' + cells + '</div>' +
      '<div class="mt-hfoot"><span class="mt-streak' + (st ? ' on' : '') + '" data-streak="' + st + '">' + icon('flame', 'ic18') + '<span class="num">' + st + '</span> ngày liên tiếp</span>' +
      '<span class="muted">Dài nhất <span class="num">' + Math.max(best ? best.best : 0, st) + '</span> ngày (90 ngày qua)</span></div></article>';
  }

  function render() {
    if (!root) return;
    var today = D.today(), list = activeHabits();
    root.innerHTML = '<div class="mt-toolbar"><p class="muted mt-hint">Bấm vào vòng tròn để đánh dấu đã làm. Thói quen có giờ sẽ hiện trên dòng thời gian của Agenda.</p>' +
      '<button type="button" class="btn btn-primary" data-add>' + icon('plus') + 'Thêm thói quen</button></div>' +
      (list.length ? '<div class="mt-hlist">' + list.map(function (h) { return card(h, today); }).join('') + '</div>'
        : '<section class="card mt-empty">' + LP.flowers.html('daisy', 48, 2) + '<p>Chưa có thói quen nào. Thêm một thói quen để bắt đầu chuỗi.</p><button type="button" class="btn btn-primary" data-add>' + icon('plus') + 'Thêm thói quen</button></section>');
  }

  function form(h) {
    h = h || { name: '', time: '', weekdays: '1,2,3,4,5,6,7' };
    var sel = String(h.weekdays || '').split(',');
    var body = '<form class="mt-form" novalidate>' +
      '<label class="field is-req"><span>Tên thói quen</span><input class="input" name="name" maxlength="80" value="' + esc(h.name) + '" required></label>' +
      '<label class="field"><span>Giờ (không bắt buộc)</span><input class="input" type="text" inputmode="numeric" maxlength="5" placeholder="hh:mm" autocomplete="off" data-time name="time" value="' + esc(h.time) + '"></label>' +
      '<div class="field"><span>Các ngày trong tuần</span><div class="chips">' + WD.map(function (w) {
        return '<label><input type="checkbox" name="wd" value="' + w[0] + '"' + (sel.indexOf(w[0]) >= 0 ? ' checked' : '') + '><span>' + w[1] + '</span></label>';
      }).join('') + '</div></div>' +
      '<p class="form-error" role="alert" hidden></p>' +
      '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn" data-close>Hủy</button><button type="submit" class="btn btn-primary">' + icon('check') + 'Lưu</button></div></form>';
    var s = LP.ui.sheet(h.id ? 'Sửa thói quen' : 'Thêm thói quen', body);
    var f = s.el.querySelector('form');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = f.elements['name'].value.trim(), wds = Array.prototype.map.call(f.querySelectorAll('input[name=wd]:checked'), function (i) { return i.value; });
      var err = f.querySelector('.form-error');
      if (!name) { LP.ui.fieldError(f.elements['name'], 'Nhập tên thói quen.'); return; }
      if (!wds.length) { LP.ui.fieldError(f.querySelector('input[name=wd]'), 'Chọn ít nhất một ngày trong tuần.'); return; }
      LP.store.upsert('Habits', Object.assign({}, h, { name: name, time: f.time.value, weekdays: wds.join(','), active: 'TRUE' }));
      s.close(); LP.ui.toast(h.id ? 'Đã lưu thói quen.' : 'Đã thêm thói quen.');
    });
  }

  function onClick(e) {
    var t = e.target.closest('[data-tick],[data-edit],[data-del],[data-add]');
    if (!t) return;
    var find = function (id) { return S().habits.filter(function (x) { return x.id === id; })[0]; };
    if (t.hasAttribute('data-add')) return form();
    if (t.hasAttribute('data-edit')) return form(find(t.getAttribute('data-edit')));
    if (t.hasAttribute('data-del')) {
      var h = find(t.getAttribute('data-del'));
      LP.ui.confirm('Xóa thói quen', 'Xóa "' + h.name + '"? Lịch sử tick vẫn được giữ trong Sheet.', { ok: 'Xóa', danger: true }).then(function (y) { if (y) LP.store.remove('Habits', h.id); });
      return;
    }
    var hb = find(t.getAttribute('data-h')), d = t.getAttribute('data-tick');
    if (toggle(hb, d) && d === D.today()) LP.ui.toast('Đã tick ' + hb.name + '.', { cheer: true });
  }

  function mount(el) {
    root = el;
    el.addEventListener('click', onClick);
    onChange = function () { if (root && root.isConnected) render(); };
    LP.store.on('change', onChange);
    render();
  }
  function unmount() {
    if (onChange) LP.store.off('change', onChange);
    if (root) root.removeEventListener('click', onClick);
    root = null; onChange = null;
  }

  return { mount: mount, unmount: unmount, toggle: toggle, openForm: form };
})();

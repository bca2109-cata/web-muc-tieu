/* V2 · Phần 1: Soát cuối ngày. Mở từ Agenda bằng #/agenda?soat=1 (route `soat` chưa có trong config.ROUTES, xem YEU-CAU-CHUNG).
   Chỉ hiện mục CHƯA tick của hôm nay (hạng mục của các lượt hôm nay và việc có ngày làm hôm nay), gom theo lượt hoặc việc.
   - Hạng mục cố định: Đã làm (tick bù) / Mang sang mai (status=carried) / Bỏ qua hôm nay (status=skipped, có lý do ngắn).
   - Việc: Đã làm / Mang sang mai (ngày làm = ngày kế tiếp) / Chọn ngày…
   Mục đã quyết định vẫn nằm trong danh sách (kèm nút Hoàn tác) cho tới khi rời màn. */
var LP = window.LP || (window.LP = {});

LP.soat = (function () {
  var D = LP.date, esc = LP.ui.esc, icon = LP.ui.icon;
  var R = LP.logic.routines, T = LP.logic.tasks;
  var st = null;

  function pill(t, k) { return LP.ui.pill(t, k); }

  /* ---------- Danh sách lúc mở màn ---------- */
  function snapshot(date) {
    var groups = [], tasks = [];
    R.runsFor(date).forEach(function (run) {
      var rows = run.items.filter(function (m) { return !m.done; }).map(function (m) {
        return { kind: 'item', key: 'i|' + run.routine.id + '|' + m.item.id, rid: run.routine.id, iid: m.item.id, runDate: m.runDate, title: m.item.title, time: m.item.time || '' };
      });
      if (rows.length) groups.push({ name: run.routine.name, rows: rows });
    });
    LP.logic.tasks.tasksFor(date).forEach(function (x) {
      if (x.done) return;
      tasks.push({
        kind: 'task', key: 't|' + x.task.id + '|' + (x.step ? x.step.id : ''), taskId: x.task.id, stepId: x.step ? x.step.id : '',
        title: x.title, parent: x.step ? x.task.title : '', tk: x.task.kind,
        origDo: x.step ? x.step.do_date : x.task.do_date, origCarried: x.task.carried_from || ''
      });
    });
    if (tasks.length) groups.push({ name: 'Việc hôm nay', rows: tasks, isTasks: true });
    return groups;
  }

  /* ---------- Trạng thái của một dòng ---------- */
  function stateOf(r) {
    if (r.kind === 'item') {
      var c = R.checkOf(r.rid, r.iid, r.runDate);
      return { s: c ? c.status : '', note: c ? c.note : '' };
    }
    var t = LP.store.find('Tasks', r.taskId), sp = r.stepId ? LP.store.find('TaskSteps', r.stepId) : null;
    if (!t) return { s: 'gone' };
    if (sp ? sp.status === 'done' : t.status === 'done') return { s: 'done' };
    var dd = sp ? sp.do_date || t.do_date : t.do_date;
    if (dd && dd > st.date) return { s: 'moved', to: dd };
    return { s: '' };
  }

  function rowHtml(r) {
    var o = stateOf(r), h = '';
    if (o.s === 'gone') return '';
    var sub = r.kind === 'item' ? (r.time ? 'giờ ' + r.time : '') : (r.parent ? 'Việc: ' + r.parent : '');
    var label = o.s === 'done' ? pill('Đã làm', 'ok') : o.s === 'carried' ? pill('Mang sang ' + D.fmt(D.nextWorkday(st.date)), 'note') :
      o.s === 'skipped' ? pill('Đã bỏ qua' + (o.note ? ': ' + o.note : ''), 'plain') : o.s === 'moved' ? pill('Chuyển sang ' + D.fmt(o.to), 'note') : '';
    h += '<li class="ag-so-row" data-fk="r|' + esc(r.key) + '"><div class="ag-title"><span>' + esc(r.title) + '</span>' + label + '</div>' + (sub ? '<div class="ag-sub">' + esc(sub) + '</div>' : '');
    var a = 'data-key="' + esc(r.key) + '"';
    if (o.s) {
      h += '<div class="ag-so-btns"><button type="button" class="btn" data-act="undo" ' + a + '>Hoàn tác</button></div>';
    } else if (r.kind === 'item') {
      h += '<div class="ag-so-btns"><button type="button" class="btn btn-soft" data-act="done" ' + a + '>' + icon('check', 'ic18') + 'Đã làm</button>' +
        '<button type="button" class="btn btn-soft" data-act="carry" ' + a + ' title="Hiện ở Từ hôm qua ngày ' + D.fmt(D.nextWorkday(st.date)) + '">Mang sang mai</button>' +
        '<button type="button" class="btn btn-soft" data-act="skip" ' + a + '>Bỏ qua hôm nay</button></div>';
      if (st.why[r.key]) {
        h += '<div class="ag-so-why"><input class="input" type="text" maxlength="80" placeholder="Lý do ngắn (không bắt buộc)" aria-label="Lý do bỏ qua" data-why="' + esc(r.key) + '">' +
          '<button type="button" class="btn btn-primary" data-act="skip-ok" ' + a + '>Xác nhận bỏ qua</button><button type="button" class="btn" data-act="skip-no" ' + a + '>Hủy</button></div>';
      }
    } else {
      h += '<div class="ag-so-btns"><button type="button" class="btn btn-soft" data-act="done" ' + a + '>' + icon('check', 'ic18') + 'Đã làm</button>' +
        '<button type="button" class="btn btn-soft" data-act="carry" ' + a + '>Mang sang mai</button>' +
        '<button type="button" class="btn btn-soft" data-act="pick" ' + a + '>' + icon('calendar', 'ic18') + 'Chọn ngày…</button></div>';
    }
    return h + '</li>';
  }

  function render() {
    if (!st) return;
    var y = window.scrollY, ae = document.activeElement, fk = ae && ae.getAttribute ? ae.getAttribute('data-fk') : null;
    var undecided = 0, h = '<div class="ag-so"><div class="ag-so-top"><button type="button" class="chip" data-act="back">' + icon('back', 'ic18') + 'Agenda</button>' +
      '<h1>Soát cuối ngày</h1></div><p class="muted">' + esc(D.weekdayName(st.date) + ', ' + D.fmtFull(st.date)) + '. Chỉ hiện những mục chưa tick hôm nay.</p>';
    if (!st.groups.length) {
      h += '<section class="card" style="text-align:center"><div class="ph-flower">' + LP.flowers.html('daisy', 48, 2) + '</div><h2>Không còn mục nào chưa tick</h2><p class="muted">Hôm nay làm đủ rồi.</p></section>';
    }
    st.groups.forEach(function (g) {
      var rows = g.rows.map(function (r) { if (!stateOf(r).s) undecided++; return rowHtml(r); }).join('');
      h += '<section class="card" aria-label="' + esc(g.name) + '"><div class="ag-sec-head"><h2>' + esc(g.name) + '</h2></div><ul class="ag-ul">' + rows + '</ul></section>';
    });
    h += '<div class="ag-so-done"><p>Lịch tháng sẽ đánh dấu ✓ nếu không còn bỏ sót.</p><button type="button" class="btn btn-primary" data-act="finish">Xong soát</button></div></div>';
    st.undecided = undecided;
    st.el.innerHTML = h;
    if (fk) {
      var cand = st.el.querySelectorAll('[data-fk]');
      for (var i = 0; i < cand.length; i++) if (cand[i].getAttribute('data-fk') === fk) { try { cand[i].focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ } break; }
    }
    window.scrollTo(0, y);
  }
  function schedule() {
    if (!st || st.dirty) return;
    st.dirty = true;
    Promise.resolve().then(function () { if (st) { st.dirty = false; render(); } });
  }

  function rowOf(key) {
    for (var i = 0; i < st.groups.length; i++) for (var j = 0; j < st.groups[i].rows.length; j++) if (st.groups[i].rows[j].key === key) return st.groups[i].rows[j];
    return null;
  }

  /* ---------- Chuyển việc sang ngày khác ---------- */
  function moveTask(r, to) {
    var t = LP.store.find('Tasks', r.taskId), sp = r.stepId ? LP.store.find('TaskSteps', r.stepId) : null; if (!t) return;
    if (sp) {
      LP.store.upsert('TaskSteps', Object.assign({}, sp, { do_date: to }));
      LP.store.upsert('Tasks', Object.assign({}, LP.store.find('Tasks', t.id), { carried_from: st.date }));
    } else {
      LP.store.upsert('Tasks', Object.assign({}, t, { do_date: to, carried_from: st.date }));
    }
  }
  function undoTask(r) {
    var t = LP.store.find('Tasks', r.taskId), sp = r.stepId ? LP.store.find('TaskSteps', r.stepId) : null; if (!t) return;
    if (sp) {
      if (sp.status === 'done') T.toggleStep(sp);
      LP.store.upsert('TaskSteps', Object.assign({}, LP.store.find('TaskSteps', sp.id), { do_date: r.origDo || st.date }));
      LP.store.upsert('Tasks', Object.assign({}, LP.store.find('Tasks', t.id), { carried_from: r.origCarried }));
    } else {
      LP.store.upsert('Tasks', Object.assign({}, t, { do_date: r.origDo || st.date, carried_from: r.origCarried, status: 'todo', done_at: '' }));
    }
  }
  function nextDayFor(r) { return r.tk === 'canhan' ? D.add(st.date, 1) : D.nextWorkday(st.date); }

  function pickDate(r) {
    var tomorrow = D.add(st.date, 1), t = LP.store.find('Tasks', r.taskId);
    var sug = t && t.due_date ? T.suggestDoDate(t.due_date) : '';
    var def = sug && sug > st.date ? sug : nextDayFor(r);
    var s = LP.ui.sheet('Chọn ngày làm', '<label class="field"><span>Ngày làm mới</span><input class="input" type="date" id="so-date" min="' + esc(tomorrow) + '" value="' + esc(def) + '"></label>' +
      '<p class="form-error" id="so-date-err" hidden>Chọn một ngày sau hôm nay.</p>' +
      '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn" data-close>Hủy</button><button type="button" class="btn btn-primary" id="so-date-ok">Lưu</button></div>');
    s.el.querySelector('#so-date-ok').addEventListener('click', function () {
      var v = s.el.querySelector('#so-date').value;
      if (!D.isValid(v) || v <= st.date) { s.el.querySelector('#so-date-err').hidden = false; return; }
      moveTask(r, v); s.close();
    });
  }

  var ACTIONS = {
    back: function () { LP.router.go('agenda', {}); },
    done: function (b) {
      var r = rowOf(b.getAttribute('data-key')); if (!r) return;
      if (r.kind === 'item') R.check(r.rid, r.iid, r.runDate, 'done');
      else {
        var t = LP.store.find('Tasks', r.taskId), sp = r.stepId ? LP.store.find('TaskSteps', r.stepId) : null;
        if (sp) T.toggleStep(sp); else if (t) T.setDone(t, true);
      }
    },
    carry: function (b) {
      var r = rowOf(b.getAttribute('data-key')); if (!r) return;
      if (r.kind === 'item') R.check(r.rid, r.iid, r.runDate, 'carried');
      else moveTask(r, nextDayFor(r));
    },
    skip: function (b) { st.why[b.getAttribute('data-key')] = true; render(); },
    'skip-no': function (b) { delete st.why[b.getAttribute('data-key')]; render(); },
    'skip-ok': function (b) {
      var key = b.getAttribute('data-key'), r = rowOf(key); if (!r) return;
      var inp = st.el.querySelector('input[data-why]'), why = '';
      var all = st.el.querySelectorAll('input[data-why]');
      for (var i = 0; i < all.length; i++) if (all[i].getAttribute('data-why') === key) inp = all[i];
      why = inp ? inp.value.trim() : '';
      delete st.why[key];
      R.check(r.rid, r.iid, r.runDate, 'skipped', { note: why });
    },
    pick: function (b) { var r = rowOf(b.getAttribute('data-key')); if (r) pickDate(r); },
    undo: function (b) {
      var r = rowOf(b.getAttribute('data-key')); if (!r) return;
      if (r.kind === 'item') R.check(r.rid, r.iid, r.runDate, '');
      else undoTask(r);
    },
    finish: function () {
      var n = st.undecided;
      LP.ui.toast(n ? 'Còn ' + n + ' mục chưa quyết định, sẽ tính là bỏ sót.' : 'Soát xong rồi, ngủ ngon nhé.', { cheer: !n });
      LP.router.go('agenda', {});
    }
  };

  function onClick(ev) {
    var b = ev.target.closest('[data-act]');
    if (!b || b.disabled || !st || !st.el.contains(b)) return;
    var fn = ACTIONS[b.getAttribute('data-act')];
    if (fn) fn(b, ev);
  }

  function mount(el) {
    var date = D.today();
    st = { el: el, date: date, groups: snapshot(date), why: {}, dirty: false, undecided: 0 };
    el.addEventListener('click', onClick);
    LP.store.on('change', schedule);
    render();
  }
  function unmount() {
    if (!st) return;
    st.el.removeEventListener('click', onClick);
    LP.store.off('change', schedule);
    st = null;
  }

  // Nếu sau này core thêm route `soat` thì vẫn chạy được
  LP.router.register('soat', { title: 'Soát cuối ngày', mount: mount, unmount: unmount });
  return { mount: mount, unmount: unmount };
})();

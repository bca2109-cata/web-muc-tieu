/* V2 · Phần 1: Soát cuối ngày và màn Tồn tổng (LP.ton, cuối file).
   Soát cuối ngày. Mở từ Agenda bằng #/agenda?soat=1 (route `soat` chưa có trong config.ROUTES, xem YEU-CAU-CHUNG).
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
      if (rows.length) groups.push({ rid: run.routine.id, name: run.routine.name, rows: rows });
    });
    // Mục đã quyết làm hôm nay (T+1 của lượt trước, đã mang sang, đã xếp giờ): cũng là "chưa tick hôm nay"
    R.leftovers(date, { all: true, decided: true }).forEach(function (e) {
      var c = R.checkOf(e.routineId, e.itemId, e.runDate);
      if (c && (c.status === 'done' || c.status === 'skipped')) return;
      var g = groups.filter(function (x) { return x.rid === e.routineId; })[0];
      if (!g) { var rt = R.byId(e.routineId); g = { rid: e.routineId, name: rt ? rt.name : 'Công việc cố định', rows: [] }; groups.push(g); }
      g.rows.push({ kind: 'item', key: 'd|' + e.routineId + '|' + e.itemId + '|' + e.runDate, rid: e.routineId, iid: e.itemId, runDate: e.runDate,
        title: e.title, time: e.time || '', init: c ? c.status : '', from: e.since || e.runDate });
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
      var c = R.checkOf(r.rid, r.iid, r.runDate), s0 = c ? c.status : '';
      if (r.init && s0 === r.init) s0 = '';   // trạng thái có sẵn từ trước (đã mang sang) chưa phải quyết định mới
      return { s: s0, note: c ? c.note : '' };
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
    h += '<li class="ag-so-row" data-fk="r|' + esc(r.key) + '"><div class="ag-title"><span>' + esc(r.title) + '</span>' + (r.from ? pill('Tồn từ ' + D.fmt(r.from), 'note') : '') + label + '</div>' + (sub ? '<div class="ag-sub">' + esc(sub) + '</div>' : '');
    var a = 'data-key="' + esc(r.key) + '"';
    if (o.s) {
      h += '<div class="ag-so-btns"><button type="button" class="btn" data-act="undo" ' + a + '>Hoàn tác</button></div>';
    } else if (r.kind === 'item') {
      // Mục đã mang sang từ trước: để nguyên thì tự sang mai nên chỉ còn Đã làm / Bỏ qua
      var carry = r.init === 'carried' ? '' : '<button type="button" class="btn btn-soft" data-act="carry" ' + a + ' title="Sáng ' + D.fmt(D.nextWorkday(st.date)) + ' vào luồng hôm nay, nhãn Tồn từ">Mang sang mai</button>';
      h += '<div class="ag-so-btns"><button type="button" class="btn btn-soft" data-act="done" ' + a + '>' + icon('check', 'ic18') + 'Đã làm</button>' + carry +
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
    h += '<div class="ag-so-done"><p>Lịch tháng sẽ đánh dấu ✓ nếu không còn bỏ sót.</p><button type="button" class="btn btn-primary" data-act="finish">Xong soát</button></div>';
    var oldN = R.leftovers(st.date, { all: true, pending: true }).length;
    if (oldN > 0) h += '<p class="ag-so-ton">Còn <b class="num">' + oldN + '</b> mục tồn chưa xử lý <button type="button" class="chip" data-act="ton">Xem</button></p>';
    h += '</div>';
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
    ton: function () { LP.router.go('agenda', { ton: '1' }); },
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
      if (r.kind === 'item') R.check(r.rid, r.iid, r.runDate, r.init || '');
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


/* ============================================================================================
   Màn "Tồn tổng" (#/agenda?ton=1, không thêm tab). Mọi mục chưa xử lý từ trước tới nay: hạng mục cố định
   chưa tick/chưa bỏ qua, và việc chưa xong/chưa hủy. Cũ nhất trước, gom theo tuần.
   Mỗi mục: Đã làm / Bỏ qua (việc: Hủy việc) / Đưa vào hôm nay. Chọn nhiều để Bỏ qua hàng loạt. Mọi thao tác có Hoàn tác. */
LP.ton = (function () {
  var D = LP.date, esc = LP.ui.esc, icon = LP.ui.icon;
  var R = LP.logic.routines, T = LP.logic.tasks;
  var st = null;

  function key(e) { return e.kind === 'item' ? 'i|' + e.routineId + '|' + e.itemId + '|' + e.runDate : 't|' + e.taskId; }

  // Danh sách tất cả mục tồn (trừ mục đã được xếp giờ vào hôm nay), cũ nhất trước
  function collect() {
    var today = D.today(), out = [];
    R.leftovers(today, { all: true, pending: true }).forEach(function (e) {
      var o = { key: key(e), e: e, kind: e.kind, title: e.title, from: e.kind === 'item' ? (e.since || e.runDate) : e.fromDate };
      if (e.kind === 'item') { var r = R.byId(e.routineId); o.block = r ? r.name : 'Công việc cố định'; }
      else o.block = e.ref && e.ref.kind === 'canhan' ? 'Việc cá nhân' : 'Việc ad-hoc';
      o.age = D.diff(today, o.from);
      out.push(o);
    });
    out.sort(function (a, b) { return a.from < b.from ? -1 : a.from > b.from ? 1 : a.title < b.title ? -1 : 1; });
    return out;
  }

  function overdueStep(t, from) {
    return T.stepsOf(t.id).filter(function (x) { return x.status !== 'done' && x.do_date && x.do_date === from; })[0] || null;
  }

  /* ---------- Thao tác (mỗi hàm trả về hàm hoàn tác) ---------- */
  function actDone(o) {
    var e = o.e;
    if (e.kind === 'item') {
      var prev = R.checkOf(e.routineId, e.itemId, e.runDate);
      R.check(e.routineId, e.itemId, e.runDate, 'done');
      return function () { restoreCheck(e, prev); };
    }
    var t = LP.store.find('Tasks', e.taskId), sp = overdueStep(t, e.fromDate);
    if (sp) { T.toggleStep(sp); return function () { var s2 = LP.store.find('TaskSteps', sp.id); if (s2 && s2.status === 'done') T.toggleStep(s2); }; }
    T.setDone(t, true);
    return function () { T.setDone(LP.store.find('Tasks', t.id), false); };
  }
  function restoreCheck(e, prev) {
    if (prev) R.check(e.routineId, e.itemId, e.runDate, prev.status, { set_time: prev.set_time, note: prev.note });
    else R.check(e.routineId, e.itemId, e.runDate, '');
  }
  function actSkip(o) {
    var e = o.e;
    if (e.kind === 'item') {
      var prev = R.checkOf(e.routineId, e.itemId, e.runDate);
      R.check(e.routineId, e.itemId, e.runDate, 'skipped', { note: 'Bỏ qua từ Tồn tổng', set_time: '' });
      return function () { restoreCheck(e, prev); };
    }
    var t = LP.store.find('Tasks', e.taskId);
    var prevRow = Object.assign({}, t);
    T.setCancelled(t, true);
    return function () { LP.store.upsert('Tasks', prevRow); };
  }
  // Việc: đặt ngày làm = hôm nay (sang "Việc hôm nay", ghi "Tồn từ"). Hạng mục cố định: hỏi giờ rồi xếp vào dòng thời gian hôm nay.
  function actTaskToday(o) {
    var e = o.e, today = D.today(), t = LP.store.find('Tasks', e.taskId), sp = overdueStep(t, e.fromDate);
    var prevT = Object.assign({}, t), prevS = sp ? Object.assign({}, sp) : null;
    if (sp) {
      LP.store.upsert('TaskSteps', Object.assign({}, sp, { do_date: today }));
      LP.store.upsert('Tasks', Object.assign({}, LP.store.find('Tasks', t.id), { carried_from: e.fromDate }));
    } else LP.store.upsert('Tasks', Object.assign({}, t, { do_date: today, carried_from: e.fromDate }));
    return function () { if (prevS) LP.store.upsert('TaskSteps', prevS); LP.store.upsert('Tasks', prevT); };
  }
  function nextQuarter() {
    var n = D.timeToMin(D.now()), m = Math.min(23 * 60 + 45, Math.ceil((n + 1) / 15) * 15);
    return D.minToTime(m);
  }
  function actItemToday(o) {
    var e = o.e;
    var sh = LP.ui.sheet('Đưa vào hôm nay', '<p>' + esc(e.title) + '<br><span class="muted">' + esc(e.label) + '</span></p>' +
      '<label class="field"><span>Giờ làm hôm nay (có thể bỏ trống)</span><input class="input" type="time" id="tt-time" value="' + nextQuarter() + '"></label>' +
      '<p class="form-error" id="tt-err" hidden>Chọn giờ hợp lệ.</p>' +
      '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn" data-close>Hủy</button><button type="button" class="btn btn-primary" id="tt-ok">Đưa vào hôm nay</button></div>');
    sh.el.querySelector('#tt-ok').addEventListener('click', function () {
      var v = sh.el.querySelector('#tt-time').value;
      if (v && !D.isTime(v)) { sh.el.querySelector('#tt-err').hidden = false; return; }
      var prev = R.checkOf(e.routineId, e.itemId, e.runDate), extra = { set_time: v || '' };
      if (v && (!prev || !prev.note || /^xep-gio/.test(prev.note))) extra.note = 'xep-gio:' + D.today();
      R.check(e.routineId, e.itemId, e.runDate, 'carried', extra);   // carried = đã quyết làm: vào luồng hôm nay, nhãn "Tồn từ"
      sh.close();
      undoToast('Đã đưa "' + e.title + '" vào hôm nay' + (v ? ' lúc ' + v : '') + '.', function () { restoreCheck(e, prev); });
    });
  }
  function undoToast(msg, undo) {
    LP.ui.toast(msg, { actionLabel: 'Hoàn tác', actionIcon: 'back', action: undo });
  }

  /* ---------- Lọc ---------- */
  function filtered(list) {
    return list.filter(function (o) {
      if (st.type && o.kind !== st.type) return false;
      if (st.block && o.block !== st.block) return false;
      if (st.from && o.from < st.from) return false;
      if (st.to && o.from > st.to) return false;
      return true;
    });
  }

  /* ---------- Vẽ ---------- */
  function statsHtml(list) {
    var oldest = list.length ? list[0].age : 0, cnt = {}, topName = '–', topN = 0;
    list.forEach(function (o) { cnt[o.block] = (cnt[o.block] || 0) + 1; });
    Object.keys(cnt).forEach(function (k) { if (cnt[k] > topN) { topN = cnt[k]; topName = k; } });
    function card(label, val, sub) { return '<div class="card ag-tt-stat"><b>' + label + '</b><span class="num ag-tt-big">' + val + '</span>' + (sub ? '<span class="ag-sub">' + esc(sub) + '</span>' : '') + '</div>'; }
    return '<div class="ag-tt-stats">' + card('Tổng mục tồn', list.length, 'mục') + card('Mục cũ nhất', oldest, 'ngày') + card('Khối tồn nhiều nhất', topN, list.length ? topName : 'không có') + '</div>';
  }
  function chip(label, f, v) { return '<button type="button" class="chip' + (st[f] === v ? ' is-on' : '') + '" data-act="filter" data-f="' + f + '" data-v="' + esc(v) + '" aria-pressed="' + (st[f] === v) + '">' + label + '</button>'; }
  function weekLabel(d) { var a = D.startOfWeek(d); return 'Tuần ' + D.fmt(a) + ' – ' + D.fmt(D.add(a, 6)); }

  function rowHtml(o) {
    var a = 'data-key="' + esc(o.key) + '"', isTask = o.kind === 'task';
    var sub = [o.block, 'tồn từ ' + D.fmt(o.from), o.age + ' ngày trước'];
    return '<li class="ag-tt-row"><label class="ag-tt-ck"><input type="checkbox" data-sel="' + esc(o.key) + '"' + (st.sel[o.key] ? ' checked' : '') + ' aria-label="Chọn: ' + esc(o.title) + '"></label>' +
      '<div class="ag-main"><div class="ag-title">' + esc(o.title) + '</div><div class="ag-sub">' + esc(sub.join(' · ')) + '</div>' +
      '<div class="ag-so-btns"><button type="button" class="btn btn-soft" data-act="t-done" ' + a + '>' + icon('check', 'ic18') + 'Đã làm</button>' +
      '<button type="button" class="btn btn-soft" data-act="t-skip" ' + a + '>' + (isTask ? 'Hủy việc' : 'Bỏ qua') + '</button>' +
      '<button type="button" class="btn btn-soft" data-act="t-today" ' + a + '>' + icon('calendar', 'ic18') + 'Đưa vào hôm nay</button></div></div></li>';
  }

  function render() {
    if (!st) return;
    var y = window.scrollY, all = collect();
    st.map = {}; all.forEach(function (o) { st.map[o.key] = o; });
    Object.keys(st.sel).forEach(function (k) { if (!st.map[k]) delete st.sel[k]; });
    var list = filtered(all), blocks = {};
    all.forEach(function (o) { blocks[o.block] = 1; });
    var nSel = Object.keys(st.sel).length, allSel = list.length > 0 && list.every(function (o) { return st.sel[o.key]; });
    var h = '<div class="ag-so ag-tt"><div class="ag-so-top"><button type="button" class="chip" data-act="back">' + icon('back', 'ic18') + 'Agenda</button><h1>Tồn tổng</h1></div>' +
      '<p class="muted">Tất cả mục chưa xử lý từ trước tới nay, cũ nhất trước.</p>' + statsHtml(all);
    h += '<section class="card ag-tt-filters" aria-label="Bộ lọc"><div class="ag-tt-frow"><b>Loại</b><div class="chips">' + chip('Tất cả', 'type', '') + chip('Cố định', 'type', 'item') + chip('Việc', 'type', 'task') + '</div></div>' +
      '<div class="ag-tt-frow"><label for="tt-block"><b>Khối</b></label><select class="select" id="tt-block" data-f="block"><option value="">Tất cả khối</option>' +
      Object.keys(blocks).sort().map(function (b) { return '<option value="' + esc(b) + '"' + (st.block === b ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select></div>' +
      '<div class="ag-tt-frow"><b>Ngày gốc</b><div class="row2"><label class="field"><span>Từ ngày</span><input class="input" type="date" data-f="from" value="' + esc(st.from) + '"></label>' +
      '<label class="field"><span>Đến ngày</span><input class="input" type="date" data-f="to" value="' + esc(st.to) + '"></label></div></div></section>';
    if (list.length) {
      h += '<div class="card ag-tt-bulk"><label class="ag-tt-all"><input type="checkbox" data-selall' + (allSel ? ' checked' : '') + '> Chọn tất cả đang lọc (' + list.length + ')</label>' +
        '<span class="ag-tt-n">Đã chọn <b class="num">' + nSel + '</b></span>' +
        '<button type="button" class="btn btn-danger" data-act="bulk-skip"' + (nSel ? '' : ' disabled') + '>Bỏ qua đã chọn</button></div>';
      var groups = [], cur = null;
      list.forEach(function (o) { var w = D.startOfWeek(o.from); if (!cur || cur.w !== w) { cur = { w: w, rows: [] }; groups.push(cur); } cur.rows.push(o); });
      groups.forEach(function (g) {
        h += '<section class="card" aria-label="' + esc(weekLabel(g.w)) + '"><div class="ag-sec-head"><h2>' + esc(weekLabel(g.w)) + '</h2><span class="num">' + g.rows.length + ' mục</span></div><ul class="ag-ul">' + g.rows.map(rowHtml).join('') + '</ul></section>';
      });
    } else {
      h += '<section class="card" style="text-align:center"><div class="ph-flower">' + LP.flowers.html('daisy', 48, 2) + '</div><h2>' + (all.length ? 'Không có mục nào khớp bộ lọc' : 'Hết mục tồn') + '</h2><p class="muted">' + (all.length ? 'Đổi hoặc bỏ bộ lọc để xem tiếp.' : 'Không còn gì chưa xử lý.') + '</p></section>';
    }
    h += '</div>';
    st.el.innerHTML = h;
    window.scrollTo(0, y);
  }
  function schedule() {
    if (!st || st.dirty) return;
    st.dirty = true;
    Promise.resolve().then(function () { if (st) { st.dirty = false; render(); } });
  }

  var ACTIONS = {
    back: function () { LP.router.go('agenda', {}); },
    filter: function (b) { st[b.getAttribute('data-f')] = b.getAttribute('data-v'); render(); },
    't-done': function (b) { var o = st.map[b.getAttribute('data-key')]; if (o) { var u = actDone(o); undoToast('Đã làm "' + o.title + '".', u); } },
    't-skip': function (b) { var o = st.map[b.getAttribute('data-key')]; if (o) { var u = actSkip(o); undoToast((o.kind === 'task' ? 'Đã hủy việc "' : 'Đã bỏ qua "') + o.title + '".', u); } },
    't-today': function (b) {
      var o = st.map[b.getAttribute('data-key')]; if (!o) return;
      if (o.kind === 'item') actItemToday(o);
      else { var u = actTaskToday(o); undoToast('Đã đưa "' + o.title + '" vào Việc hôm nay.', u); }
    },
    'bulk-skip': function () {
      var keys = Object.keys(st.sel).filter(function (k) { return st.map[k]; });
      if (!keys.length) return;
      LP.ui.confirm('Bỏ qua hàng loạt', 'Bỏ qua ' + keys.length + ' mục đã chọn? Hạng mục cố định sẽ được bỏ qua, việc sẽ được hủy. Vẫn hoàn tác được ngay sau đó.', { ok: 'Bỏ qua ' + keys.length + ' mục', danger: true }).then(function (yes) {
        if (!yes) return;
        var undos = keys.map(function (k) { return actSkip(st.map[k]); });
        st.sel = {};
        undoToast('Đã bỏ qua ' + undos.length + ' mục.', function () { undos.forEach(function (u) { u(); }); });
      });
    }
  };
  function onClick(ev) {
    var b = ev.target.closest('[data-act]');
    if (!b || b.disabled || !st || !st.el.contains(b)) return;
    var fn = ACTIONS[b.getAttribute('data-act')];
    if (fn) fn(b);
  }
  function onChange(ev) {
    var t = ev.target;
    if (!st || !t) return;
    if (t.hasAttribute('data-sel')) { if (t.checked) st.sel[t.getAttribute('data-sel')] = true; else delete st.sel[t.getAttribute('data-sel')]; render(); }
    else if (t.hasAttribute('data-selall')) {
      var list = filtered(collect());
      list.forEach(function (o) { if (t.checked) st.sel[o.key] = true; else delete st.sel[o.key]; });
      render();
    } else if (t.hasAttribute('data-f')) { st[t.getAttribute('data-f')] = t.value; render(); }
  }

  function mount(el) {
    st = { el: el, type: '', block: '', from: '', to: '', sel: {}, map: {}, dirty: false };
    el.addEventListener('click', onClick);
    el.addEventListener('change', onChange);
    LP.store.on('change', schedule);
    render();
  }
  function unmount() {
    if (!st) return;
    st.el.removeEventListener('click', onClick);
    st.el.removeEventListener('change', onChange);
    LP.store.off('change', schedule);
    st = null;
  }
  LP.router.register('ton', { title: 'Tồn tổng', mount: mount, unmount: unmount });
  return { mount: mount, unmount: unmount };
})();

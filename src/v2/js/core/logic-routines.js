/* V2 · logic công việc cố định (mẫu -> lượt -> hạng mục).
   Khái niệm:
   - Lượt (run): một mẫu chạy vào một ngày. Có `runDate`. Ngày nghỉ và Chủ nhật không tạo lượt.
   - Hạng mục ngày lệch +1 của lượt ngày X nằm ở ngày làm việc kế tiếp sau X (bỏ Chủ nhật, ngày nghỉ).
     Dòng RoutineChecks của nó vẫn khóa theo run_date = X.
   - "Bỏ sót" được TÍNH RA: hạng mục tới hạn mà không có dòng RoutineChecks nào. Chỉ ghi khi người dùng chọn ở màn Soát.
   - Mẫu theo khoảng ngày trong tháng: lượt hiện mỗi ngày làm việc trong khoảng cho tới khi mọi hạng mục đã tick
     (tính cộng dồn trong khoảng). Có `remainDays` = số ngày làm việc còn lại trong khoảng, tính cả hôm nay. */
var LP = window.LP || (window.LP = {});

LP.logic = LP.logic || {};
LP.logic.routines = (function () {
  var D = LP.date, truthy = LP.util.truthy;

  function S() { return LP.store.get(); }
  function byId(list, id) { return list.filter(function (r) { return r.id === id; })[0] || null; }

  // Index dòng check theo khóa routine|item|run_date, dựng lại khi dữ liệu đổi
  var idx = null;
  LP.store.on('change', function () { idx = null; });
  function checkIndex() {
    if (idx) return idx;
    idx = {};
    S().routineChecks.forEach(function (c) { idx[c.routine_id + '|' + c.item_id + '|' + c.run_date] = c; });
    return idx;
  }
  function checkOf(rid, iid, runDate) { return checkIndex()[rid + '|' + iid + '|' + runDate] || null; }

  function itemsOf(routine, runDate) {
    return S().routineItems.filter(function (it) {
      return it.routine_id === routine.id && (!it.valid_from || it.valid_from <= runDate) && (!it.valid_to || it.valid_to >= runDate);
    }).sort(function (a, b) { return LP.util.num(a.sort_order) - LP.util.num(b.sort_order); });
  }

  // Khoảng ngày của mẫu theo tháng chứa ngày d. Trả null nếu d ngoài khoảng. Hỗ trợ khoảng vắt tháng (ví dụ 28 đến 3).
  function monthWindow(routine, d) {
    var from = parseInt(routine.month_from, 10), to = parseInt(routine.month_to, 10);
    if (!from || !to) return null;
    var dom = parseInt(d.slice(8), 10), pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var ms = D.monthStart(d), start, end;
    if (from <= to) {
      if (dom < from || dom > to) return null;
      start = ms.slice(0, 8) + pad(from);
      end = ms.slice(0, 8) + pad(Math.min(to, D.daysInMonth(d)));
    } else if (dom >= from) {
      start = ms.slice(0, 8) + pad(from);
      var nm = D.addMonths(d, 1); end = nm.slice(0, 8) + pad(Math.min(to, D.daysInMonth(nm)));
    } else if (dom <= to) {
      var pm = D.addMonths(d, -1); start = pm.slice(0, 8) + pad(Math.min(from, D.daysInMonth(pm)));
      end = ms.slice(0, 8) + pad(to);
    } else return null;
    return { start: start, end: end };
  }

  function workdaysBetween(a, b) { return D.range(a, b).filter(D.isWorkday); }

  // Lịch lặp có khớp ngày d không (chưa xét đã tick hết với mẫu theo khoảng)
  function scheduled(routine, d) {
    if (!truthy(routine.active) || !D.isWorkday(d)) return false;
    if (routine.repeat === 'month_range') return !!monthWindow(routine, d);
    return String(routine.weekdays || '').split(',').map(function (x) { return x.trim(); }).indexOf(String(D.dow(d))) >= 0;
  }

  function mkItem(routine, it, runDate) {
    var c = checkOf(routine.id, it.id, runDate);
    var offset = parseInt(it.day_offset, 10) || 0;
    return {
      routine: routine, item: it, runDate: runDate, check: c,
      status: c ? c.status : '',                     // 'done' | 'skipped' | 'carried' | ''
      done: !!c && c.status === 'done',
      time: (c && c.set_time) || it.time || '',
      date: offset ? D.addWorkdays(runDate, offset) : runDate,
      offset: offset
    };
  }

  // Các lượt của ngày d (chỉ hạng mục ngày lệch 0). Mỗi lượt: { routine, runDate, items, done, total, remainDays }
  function runsFor(d) {
    var out = [];
    S().routines.slice().sort(function (a, b) { return LP.util.num(a.sort_order) - LP.util.num(b.sort_order); }).forEach(function (r) {
      if (!scheduled(r, d)) return;
      var items = itemsOf(r, d).filter(function (it) { return !(parseInt(it.day_offset, 10) > 0); });
      if (!items.length) return;
      var run = { routine: r, runDate: d, remainDays: null, items: [] };
      if (r.repeat === 'month_range') {
        var w = monthWindow(r, d), days = workdaysBetween(w.start, w.end);
        // Hạng mục đã tick ở một ngày khác trong khoảng
        var doneElsewhere = {}, doneToday = {};
        items.forEach(function (it) {
          days.forEach(function (x) {
            var c = checkOf(r.id, it.id, x);
            if (c && c.status === 'done') { if (x === d) doneToday[it.id] = c; else if (x < d) doneElsewhere[it.id] = c; }
          });
        });
        var open = items.filter(function (it) { return !doneElsewhere[it.id]; });
        if (!open.length) return; // tick hết ở ngày trước thì ngày này không hiện
        run.items = open.map(function (it) { return mkItem(r, it, d); });
        run.remainDays = days.filter(function (x) { return x >= d; }).length;
        run.window = w;
      } else {
        run.items = items.map(function (it) { return mkItem(r, it, d); });
      }
      run.total = run.items.length;
      run.done = run.items.filter(function (x) { return x.done; }).length;
      out.push(run);
    });
    return out;
  }

  // Hạng mục ngày lệch +1 của lượt trước, rơi vào ngày d
  function plusOneFor(d) {
    var prev = D.prevWorkday(d), out = [];
    if (D.addWorkdays(prev, 1) !== d) return out;
    S().routines.forEach(function (r) {
      if (!scheduled(r, prev)) return;
      itemsOf(r, prev).forEach(function (it) {
        if ((parseInt(it.day_offset, 10) || 0) > 0) { var m = mkItem(r, it, prev); m.date = d; m.plus1 = true; out.push(m); }
      });
    });
    return out;
  }

  function sortByTime(a, b) {
    var ta = D.timeToMin(a.time), tb = D.timeToMin(b.time);
    if (ta == null && tb == null) return 0;
    if (ta == null) return 1;
    if (tb == null) return -1;
    return ta - tb;
  }

  // Mọi hạng mục của ngày d, xếp theo giờ: hạng mục của các lượt hôm nay + hạng mục +1 của lượt hôm trước
  function itemsFor(d) {
    var out = [];
    runsFor(d).forEach(function (run) { run.items.forEach(function (m) { out.push(m); }); });
    plusOneFor(d).forEach(function (m) { out.push(m); });
    return out.sort(sortByTime);
  }

  // Hạng mục tới hạn ở ngày làm việc d nhưng chưa xong, chưa ghi nhận gì: "bỏ sót" tính ra
  function missedOn(d) {
    var out = [];
    runsFor(d).forEach(function (run) {
      run.items.forEach(function (m) { if (!m.status) out.push(m); });
    });
    return out;
  }

  /* "Từ hôm qua" / "Việc tồn" của ngày d. Mỗi phần tử:
     { kind:'item', source:'plus1'|'missed'|'carried', routineId, itemId, runDate, title, time, setTime, label, ref }
     { kind:'task', source:'task', taskId, title, fromDate, ref }
     - plus1: hạng mục +1 của lượt hôm trước, hôm nay mới tới hạn (cũng có trong itemsFor(d), màn Agenda tự gộp)
     - missed: hạng mục của lượt ngày trước chưa tick và không có dòng ghi nhận
     - carried: hạng mục đã chọn "Mang sang mai" ở màn Soát
     - task: việc quá ngày làm mà chưa xong (xem logic-tasks)
     Khối "Từ hôm qua" chỉ lấy mục tồn trong `leftover_days` ngày lịch gần nhất (Settings, mặc định 7).
     leftovers(d, { all: true }) lấy TẤT CẢ mục chưa xử lý từ trước tới nay (tra ngược tối đa ALL_DAYS = 120 ngày, đúng
     khoảng dữ liệu LP.store tải, và không sớm hơn ngày tạo mẫu). Mục tồn giữ cho tới khi tick (done) hoặc bỏ qua (skipped).
     Việc (task) tồn giữ tới khi xong hoặc hủy (status 'cancelled'). Mẫu theo khoảng ngày: mỗi hạng mục chỉ hiện một lần.
     "Đặt giờ" (set_time) chỉ có hiệu lực trong đúng ngày đặt: ghi chú 'xep-gio:yyyy-mm-dd'. Sang ngày khác mục lại là
     tồn chưa xếp giờ (setTime rỗng). Ghi chú 'xep-gio' không có ngày (bản cũ) coi như còn hiệu lực. */
  var ALL_DAYS = 120;
  function leftoverDays() { var n = parseInt(LP.store.setting('leftover_days', 7), 10); return n > 0 ? n : 7; }

  // Hạng mục ngày lệch +1 của các lượt ngày p (không kiểm tra ngày rơi)
  function plusItemsOn(p) {
    var out = [];
    S().routines.forEach(function (r) {
      if (!scheduled(r, p)) return;
      itemsOf(r, p).forEach(function (it) {
        if ((parseInt(it.day_offset, 10) || 0) > 0) { var m = mkItem(r, it, p); m.date = D.addWorkdays(p, 1); m.plus1 = true; out.push(m); }
      });
    });
    return out;
  }
  function open(m) { return !m.done && m.status !== 'skipped'; }

  function leftovers(d, opts) {
    opts = opts || {};
    var days = opts.all ? ALL_DAYS : (opts.days || leftoverDays());
    var prev = D.prevWorkday(d), out = [], seen = {}, lo = D.add(d, -days), p = prev, guard = 0;
    plusOneFor(d).forEach(function (m) { if (open(m)) out.push(entry(m, 'plus1', d)); });
    while (p >= lo && guard++ < 400) {
      runsFor(p).forEach(function (run) {
        if ((run.routine.created_at || '').slice(0, 10) > p) return; // không tạo tồn cho ngày trước khi mẫu tồn tại
        run.items.forEach(function (m) {
          if (!open(m)) return;
          if (run.routine.repeat === 'month_range') {
            // Tính cộng dồn trong khoảng: đã tick (hoặc bỏ qua) ở bất kỳ ngày nào của khoảng thì không còn tồn; mỗi hạng mục chỉ hiện một lần
            var k = run.routine.id + '|' + m.item.id + '|' + run.window.start;
            if (seen[k]) return; seen[k] = 1;
            if (workdaysBetween(run.window.start, run.window.end).some(function (x) { var c = checkOf(run.routine.id, m.item.id, x); return c && (c.status === 'done' || c.status === 'skipped'); })) return;
          }
          out.push(entry(m, m.status === 'carried' ? 'carried' : 'missed', d));
        });
      });
      // Hạng mục +1 của lượt p đã tới hạn từ trước hôm nay (hôm nay tới hạn thì đã xử lý ở plusOneFor)
      plusItemsOn(p).forEach(function (m) { if (m.date < d && open(m) && (m.routine.created_at || '').slice(0, 10) <= p) out.push(entry(m, 'missed', d)); });
      p = D.prevWorkday(p);
    }
    out.sort(function (a, b) { return (a.source === 'plus1' ? 0 : 1) - (b.source === 'plus1' ? 0 : 1) || (a.runDate < b.runDate ? -1 : a.runDate > b.runDate ? 1 : 0); });
    if (LP.logic.tasks) LP.logic.tasks.leftoverTasks(d).forEach(function (t) { if (opts.all || t.fromDate >= lo) out.push(t); });
    return out;
  }
  function entry(m, source, d) {
    var c = m.check, st = (c && c.set_time) || '';
    if (st && c.note && /^xep-gio:/.test(c.note) && c.note.slice(8) !== d) st = '';
    return {
      kind: 'item', source: source, routineId: m.routine.id, itemId: m.item.id, runDate: m.runDate,
      title: m.item.title, time: st || m.item.time || '', setTime: st,
      label: m.routine.name + ' ' + D.fmt(m.runDate), ref: m
    };
  }

  // Ghi hoặc bỏ tick. status: 'done' | 'skipped' | 'carried' | '' (rỗng = bỏ tick, xóa dòng)
  function check(routineId, itemId, runDate, status, extra) {
    var cur = checkOf(routineId, itemId, runDate);
    if (!status) { if (cur) LP.store.remove('RoutineChecks', cur.id); return null; }
    var row = Object.assign({
      id: cur ? cur.id : '', routine_id: routineId, item_id: itemId, run_date: runDate,
      status: status, done_at: status === 'done' ? D.stamp() : '', set_time: cur ? cur.set_time : '', note: cur ? cur.note : ''
    }, extra || {});
    if (cur) row.created_at = cur.created_at;
    return LP.store.upsert('RoutineChecks', row);
  }

  // Tổng kết một ngày đã qua: { total, done, skipped, carried, missed }. Chỉ tính hạng mục ngày lệch 0 theo run_date.
  function summary(d) {
    var s = { total: 0, done: 0, skipped: 0, carried: 0, missed: 0 };
    runsFor(d).forEach(function (run) {
      run.items.forEach(function (m) {
        s.total++;
        if (m.status === 'done') s.done++; else if (m.status === 'skipped') s.skipped++;
        else if (m.status === 'carried') s.carried++; else s.missed++;
      });
    });
    return s;
  }

  return {
    runsFor: runsFor, itemsFor: itemsFor, plusOneFor: plusOneFor, leftovers: leftovers, missedOn: missedOn,
    check: check, checkOf: checkOf, summary: summary, scheduled: scheduled, monthWindow: monthWindow, itemsOf: itemsOf,
    byId: function (id) { return byId(S().routines, id); }
  };
})();

/* V2 · số liệu cho biểu đồ (Agenda và Tổng kết dùng chung). Hàm thuần: đọc LP.store, không ghi.
   from, to: yyyy-mm-dd (gồm cả hai đầu). unit: 'day' | 'week' | 'month'. Ngày chưa tới bị bỏ qua. */
var LP = window.LP || (window.LP = {});

LP.stats = (function () {
  var D = LP.date, num = LP.util.num, truthy = LP.util.truthy;
  function S() { return LP.store.get(); }

  // Chia khoảng from..to thành các ô theo đơn vị. Mỗi ô: { label, from, to }
  function buckets(from, to, unit) {
    var out = [], cur = from, guard = 0;
    while (cur <= to && guard++ < 400) {
      var b;
      if (unit === 'week') { var ws = D.startOfWeek(cur); b = { from: ws < from ? from : ws, to: D.add(ws, 6) > to ? to : D.add(ws, 6), label: D.fmt(ws) }; }
      else if (unit === 'month') { var me = D.monthEnd(cur); b = { from: cur, to: me > to ? to : me, label: 'T' + parseInt(cur.slice(5, 7), 10) }; }
      else b = { from: cur, to: cur, label: D.fmt(cur) };
      out.push(b);
      cur = D.add(b.to, 1);
    }
    return out;
  }
  function upTo(to) { var t = D.add(D.today(), -1); return to < t ? to : t; } // chỉ tính ngày đã qua

  // Việc Ad-hoc + Personal có ngày làm trong ngày d, cùng cách đếm với vòng "Hoàn thành hôm nay" ở Agenda: mỗi mục (việc hoặc bước) tính 1
  function taskCounts(d) {
    var o = { done: 0, total: 0 };
    LP.logic.tasks.tasksFor(d).forEach(function (x) { o.total++; if (x.done) o.done++; });
    return o;
  }

  // Tỷ lệ hoàn thành = Daily + Ad-hoc + Personal. done / (tổng - Daily bỏ qua).
  // Mỗi ô: { label, from, to, done, skipped, total, pct, missed, carried, rDone, rTotal, tDone, tTotal }
  // rDone/rTotal là riêng Daily, tDone/tTotal là riêng Ad-hoc + Personal; skipped, missed, carried chỉ của Daily
  function completion(from, to, unit) {
    var last = upTo(to);
    return buckets(from, to, unit || 'day').map(function (b) {
      var o = { label: b.label, from: b.from, to: b.to, done: 0, skipped: 0, total: 0, missed: 0, carried: 0, pct: null, rDone: 0, rTotal: 0, tDone: 0, tTotal: 0 };
      if (b.from > last) return o;
      D.range(b.from, b.to < last ? b.to : last).forEach(function (d) {
        var s = LP.logic.routines.summary(d), t = taskCounts(d);
        o.rDone += s.done; o.rTotal += s.total - s.skipped; o.tDone += t.done; o.tTotal += t.total;
        o.skipped += s.skipped; o.missed += s.missed; o.carried += s.carried;
      });
      o.done = o.rDone + o.tDone; o.total = o.rTotal + o.tTotal;
      o.pct = o.total ? Math.round(o.done * 100 / o.total) : null;
      return o;
    });
  }

  // Hạng mục hay bị bỏ sót nhất: [{ routineId, itemId, title, routineName, count }]
  function missedTop(from, to, n) {
    var last = upTo(to), map = {};
    if (from > last) return [];
    function add(r, it, d) {
      var k = it.id;
      (map[k] = map[k] || { routineId: r.id, itemId: k, title: it.title, routineName: r.name, count: 0, dates: [] });
      map[k].count++; map[k].dates.push(d);
    }
    D.range(from, last).forEach(function (d) {
      LP.logic.routines.runsFor(d).forEach(function (run) {
        run.items.forEach(function (m) {
          if (m.status) return;   // đã tick, bỏ qua hoặc mang sang thì không phải bỏ sót
          add(m.routine, m.item, d);
        });
      });
      // +1 chưa xong ở ngày tới hạn cũng là bỏ sót (cùng cách đếm với LP.logic.routines.summary)
      LP.logic.routines.decidedUnits(d).forEach(function (e) {
        if (e.source === 'plus1' && !e.ref.done) add(e.ref.routine, e.ref.item, d);
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.count - a.count || (a.title < b.title ? -1 : 1); }).slice(0, n || 5);
  }

  // Việc ad-hoc có hạn chót trong khoảng: { done, doneLate, doing, overdue, total, list }
  function adhocStatus(from, to) {
    var today = D.today(), o = { done: 0, doneLate: 0, doing: 0, overdue: 0, total: 0 };
    S().tasks.forEach(function (t) {
      if (t.kind !== 'adhoc' || t.status === 'cancelled' || !t.due_date || t.due_date < from || t.due_date > to) return;
      o.total++;
      if (t.status === 'done') { if ((t.done_at || '').slice(0, 10) > t.due_date) o.doneLate++; else o.done++; }
      else if (t.due_date < today) o.overdue++; else o.doing++;
    });
    return o;
  }

  // Việc (ad-hoc và cá nhân) theo mức quan trọng: [{ level, total, done }] cho 1, 2, 3
  function byLevel(from, to) {
    var out = [1, 2, 3].map(function (l) { return { level: l, total: 0, done: 0 }; });
    S().tasks.forEach(function (t) {
      var d = t.due_date || t.do_date;
      if (t.status === 'cancelled' || !d || d < from || d > to) return;
      var l = Math.max(1, Math.min(3, parseInt(t.importance, 10) || 1)) - 1;
      out[l].total++; if (t.status === 'done') out[l].done++;
    });
    return out;
  }

  // Đột xuất theo ô: { label, from, to, count, minutes }
  function interruptions(from, to, unit) {
    return buckets(from, to, unit || 'week').map(function (b) {
      var o = { label: b.label, from: b.from, to: b.to, count: 0, minutes: 0 };
      S().interruptions.forEach(function (i) { if (i.date >= b.from && i.date <= b.to) { o.count++; o.minutes += num(i.duration_min); } });
      return o;
    });
  }

  // Thói quen đang dùng có lịch vào ngày d không
  function habitDue(h, d) { return String(h.weekdays || '').split(',').indexOf(String(D.dow(d))) >= 0; }
  function habitDone(h, d) {
    return S().habitLogs.some(function (l) { return l.habit_id === h.id && l.date === d && truthy(l.done); });
  }
  // Chuỗi ngày liên tiếp (tính các ngày có lịch) tính đến ngày d. Hôm nay chưa tick thì chưa làm đứt chuỗi.
  function streak(habit, d) {
    d = d || D.today();
    var n = 0, cur = d, guard = 0, today = D.today();
    while (guard++ < 400) {
      if (habitDue(habit, cur)) {
        if (habitDone(habit, cur)) n++;
        else if (!(cur === today && cur === d)) break;
      }
      cur = D.add(cur, -1);
    }
    return n;
  }
  // Mỗi thói quen: { habit, done, expected, pct, streak, best }
  function habits(from, to) {
    var last = to < D.today() ? to : D.today();
    return S().habits.filter(function (h) { return truthy(h.active); }).map(function (h) {
      var done = 0, expected = 0, run = 0, best = 0;
      if (from <= last) D.range(from, last).forEach(function (d) {
        if (!habitDue(h, d)) return;
        expected++;
        if (habitDone(h, d)) { done++; run++; if (run > best) best = run; } else run = 0;
      });
      return { habit: h, done: done, expected: expected, pct: expected ? Math.round(done * 100 / expected) : null, streak: streak(h, last), best: best };
    });
  }

  // Ngưỡng tiến độ theo quy ước thiết kế: 100 -> 'ok', 80..99 -> 'pr', dưới 80 -> 'warn'
  function level(pct) { return pct == null ? '' : pct >= 100 ? 'ok' : pct >= 80 ? 'pr' : 'warn'; }

  return {
    buckets: buckets, completion: completion, taskCounts: taskCounts, missedTop: missedTop, adhocStatus: adhocStatus, byLevel: byLevel,
    interruptions: interruptions, habits: habits, streak: streak, habitDone: habitDone, habitDue: habitDue, level: level
  };
})();

/* V2 · logic việc (ad-hoc và cá nhân): độ khẩn, quỹ giờ, gợi ý ngày làm, việc tồn, bước con.
   Khẩn cấp do web tự tính từ hạn chót, không chọn tay:
   - 'rat-khan': hạn chót là hôm nay hoặc đã quá hạn · 'khan': hạn trong 2 ngày tới · '': không khẩn hoặc đã xong. */
var LP = window.LP || (window.LP = {});

LP.logic = LP.logic || {};
LP.logic.tasks = (function () {
  var D = LP.date, num = LP.util.num;

  function S() { return LP.store.get(); }
  function stepsOf(taskId) {
    return S().taskSteps.filter(function (s) { return s.task_id === taskId; })
      .sort(function (a, b) { return num(a.sort_order) - num(b.sort_order); });
  }

  function urgency(task, today) {
    if (!task || task.status === 'done' || !task.due_date) return '';
    var left = D.diff(task.due_date, today || D.today());
    if (left <= 0) return 'rat-khan';
    if (left <= 2) return 'khan';
    return '';
  }

  // Ngày làm sớm nhất còn lại của việc: bước chưa xong có ngày làm, hoặc ngày làm của việc
  function nextDo(task) {
    var steps = stepsOf(task.id);
    if (steps.length) {
      var open = steps.filter(function (s) { return s.status !== 'done' && s.do_date; }).map(function (s) { return s.do_date; }).sort();
      if (open.length) return open[0];
      if (steps.some(function (s) { return s.status !== 'done'; })) return task.do_date || '';
    }
    return task.do_date || '';
  }

  // Gợi ý ngày làm = ngày làm việc trước hạn chót 1 ngày. Không gợi ý về quá khứ: nhỏ nhất là hôm nay (hoặc ngày làm việc kế tiếp)
  function suggestDoDate(due) {
    if (!due) return '';
    var d = D.addWorkdays(due, -1), t = D.today();
    if (d < t) d = D.isWorkday(t) ? t : D.nextWorkday(t);
    return d;
  }

  // Việc ở ngày d: việc có ngày làm = d (không có bước), cộng các bước có ngày làm = d. Gồm cả đã xong.
  function tasksFor(d) {
    var out = [];
    S().tasks.forEach(function (t) {
      var steps = stepsOf(t.id);
      var dated = steps.filter(function (s) { return s.do_date; });
      if (dated.length) {
        dated.forEach(function (s) {
          if (s.do_date === d) out.push({ task: t, step: s, title: s.title, duration: num(s.duration_min), time: s.do_time || '', done: s.status === 'done' });
        });
        // Bước không có ngày riêng đi theo ngày làm của việc
        if (t.do_date === d) steps.filter(function (s) { return !s.do_date; }).forEach(function (s) {
          out.push({ task: t, step: s, title: s.title, duration: num(s.duration_min), time: s.do_time || '', done: s.status === 'done' });
        });
      } else if (t.do_date === d) {
        out.push({ task: t, step: null, title: t.title, duration: num(t.duration_min), time: t.do_time || '', done: t.status === 'done' });
      }
    });
    return out;
  }

  // Quỹ giờ của ngày d (phút). Chỉ tính Việc, không tính công việc cố định.
  // Quỹ việc ad-hoc: cài đặt quota_work (mặc định 180, 3h). Quỹ việc cá nhân: quota_evening (mặc định 90, 1h30).
  // Ngày không làm việc (Chủ nhật, ngày nghỉ): quỹ ad-hoc = 0, quỹ cá nhân = quota_off (mặc định 240).
  // Đột xuất của ngày trừ vào quỹ ad-hoc.
  function capacity(d) {
    var workday = D.isWorkday(d);
    var qWork = workday ? num(LP.store.setting('quota_work', 180)) : 0;
    var qEve = workday ? num(LP.store.setting('quota_evening', 90)) : num(LP.store.setting('quota_off', 240));
    var adhoc = 0, canhan = 0, interrupt = 0;
    tasksFor(d).forEach(function (x) { if (x.task.kind === 'canhan') canhan += x.duration; else adhoc += x.duration; });
    S().interruptions.forEach(function (i) { if (i.date === d) interrupt += num(i.duration_min); });
    var work = { quota: qWork, used: adhoc + interrupt, adhoc: adhoc, interrupt: interrupt };
    var eve = { quota: qEve, used: canhan };
    [work, eve].forEach(function (p) { p.left = p.quota - p.used; p.over = p.used > p.quota; });
    return { date: d, work: work, evening: eve, interruptionMin: interrupt, usedTotal: work.used + eve.used };
  }

  // Việc tồn: việc chưa xong mà ngày làm (còn lại sớm nhất) đã qua trước ngày d
  function leftoverTasks(d) {
    var out = [];
    S().tasks.forEach(function (t) {
      if (t.status === 'done') return;
      var f = nextDo(t);
      if (!f || f >= d) return;
      out.push({
        kind: 'task', source: 'task', taskId: t.id, title: t.title, fromDate: f,
        label: 'chưa xong từ ' + D.fmt(f), urgency: urgency(t, d), ref: t
      });
    });
    return out.sort(function (a, b) { return a.fromDate < b.fromDate ? -1 : 1; });
  }

  function progress(task) {
    var st = stepsOf(task.id);
    if (!st.length) return { done: task.status === 'done' ? 1 : 0, total: 1, hasSteps: false };
    return { done: st.filter(function (s) { return s.status === 'done'; }).length, total: st.length, hasSteps: true };
  }

  function setDone(task, done) {
    return LP.store.upsert('Tasks', Object.assign({}, task, { status: done ? 'done' : 'todo', done_at: done ? D.stamp() : '' }));
  }
  // Tick một bước. Tick hết bước thì việc tự xong. Bỏ tick một bước thì việc quay lại chưa xong.
  function toggleStep(step) {
    var done = step.status !== 'done';
    LP.store.upsert('TaskSteps', Object.assign({}, step, { status: done ? 'done' : 'todo', done_at: done ? D.stamp() : '' }));
    var task = LP.store.find('Tasks', step.task_id);
    if (task) {
      var all = stepsOf(task.id).every(function (s) { return s.status === 'done'; });
      if (all && task.status !== 'done') setDone(task, true);
      else if (!all && task.status === 'done') setDone(task, false);
    }
    return done;
  }

  return {
    urgency: urgency, capacity: capacity, suggestDoDate: suggestDoDate, tasksFor: tasksFor, stepsOf: stepsOf,
    nextDo: nextDo, leftoverTasks: leftoverTasks, progress: progress, setDone: setDone, toggleStep: toggleStep
  };
})();

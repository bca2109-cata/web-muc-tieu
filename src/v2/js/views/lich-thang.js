/* V2 · Phần 2: Lịch tháng. Gắn vào màn Lịch (lich-tuan.js) qua LP.lich.setMonth. */
(function () {
  var D = LP.date, UI = LP.ui, esc = LP.ui.esc;

  function earliestCheck() {
    var m = '';
    LP.store.get().routineChecks.forEach(function (c) { if (c.run_date && (!m || c.run_date < m)) m = c.run_date; });
    return m;
  }

  // Thanh mảnh cho mẫu theo khoảng ngày, phủ các ngày trong khoảng
  function rangeBars(d, routines) {
    var out = '';
    routines.forEach(function (r) {
      var w = LP.logic.routines.monthWindow(r, d);
      if (!w) return;
      var first = d === w.start || D.dow(d) === 1, last = d === w.end;
      out += '<i class="mbar' + (d === w.start ? ' s' : '') + (last ? ' e' : '') + '" title="' + esc(r.name) + ' ' + parseInt(w.start.slice(8), 10) + '–' + parseInt(w.end.slice(8), 10) + '">' +
        (first ? '<span>' + esc(r.name) + '</span>' : '') + '</i>';
    });
    return out;
  }

  function cell(d, month, ctx) {
    var today = D.today(), past = d < today, other = d.slice(0, 7) !== month.slice(0, 7);
    var off = D.isDayOff(d), sun = D.dow(d) === 7;
    var mark = '';
    if (off) mark = '<span class="mmark nghi">Nghỉ</span>';
    else if (past && !sun && ctx.first && d >= ctx.first) {
      var s = LP.logic.routines.summary(d);
      if (s.total) mark = s.missed ? '<span class="mmark sot" title="' + s.missed + ' hạng mục sót">!</span>' : '<span class="mmark du" title="Đủ">' + UI.icon('check', 'ic18') + '</span>';
    }
    var dues = LP.lich.dueMarks(d), dots = '';
    dues.slice(0, 3).forEach(function (t) { dots += '<i class="mdot" title="' + esc(LP.lich.dueText(t)) + '"></i>'; });
    if (dues.length > 3) dots += '<span class="mmore">+' + (dues.length - 3) + '</span>';
    var n = LP.logic.tasks.tasksFor(d).length;
    return '<button type="button" class="mcell' + (d === today ? ' is-today' : '') + (off || sun ? ' is-off' : '') + (other ? ' is-other' : '') + '" data-cell="' + d + '"' +
      ' aria-label="' + D.weekdayName(d) + ' ' + D.fmt(d) + (n ? ', ' + n + ' mục' : '') + '">' +
      '<span class="mtop"><b class="num">' + parseInt(d.slice(8), 10) + '</b>' + mark + '</span>' +
      '<span class="mdots">' + dots + '</span><span class="mcount">' + (n ? '<b class="num">' + n + '</b> mục' : '') + '</span>' +
      '<span class="mbars">' + rangeBars(d, ctx.ranges) + '</span></button>';
  }

  function render(el, st) {
    var ms = D.monthStart(st.anchor), start = D.startOfWeek(ms), end = D.add(D.startOfWeek(D.monthEnd(ms)), 6);
    var ctx = {
      first: earliestCheck(),
      ranges: LP.store.get().routines.filter(function (r) { return r.repeat === 'month_range' && LP.util.truthy(r.active); })
    };
    var heads = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(function (x) { return '<div class="mhead">' + x + '</div>'; }).join('');
    var lab = 'Tháng ' + parseInt(ms.slice(5, 7), 10) + '/' + ms.slice(0, 4);
    el.innerHTML = '<div class="lich-bar">' + LP.lich.seg('thang') + LP.lich.nav(lab, 'Tháng trước', 'Tháng sau', 'Tháng này') + '</div>' +
      '<div class="lmonth">' + heads + D.range(start, end).map(function (d) { return cell(d, ms, ctx); }).join('') + '</div>' +
      '<p class="muted lmonth-note"><span class="mmark du">' + UI.icon('check', 'ic18') + '</span> đủ · <span class="mmark sot">!</span> có sót · <i class="mdot"></i> hạn chót</p>';
  }

  LP.lich.setMonth({ render: render });
})();

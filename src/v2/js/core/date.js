/* V2 · ngày giờ. Ngày dạng yyyy-mm-dd, giờ dạng HH:MM. Tính theo UTC để không lệch vì múi giờ.
   Thứ trong tuần: 1 = Thứ Hai ... 6 = Thứ Bảy, 7 = Chủ nhật.
   Bản mock nhận ?today=yyyy-mm-dd và ?now=hh:mm để giả lập hôm nay và giờ hiện tại. */
var LP = window.LP || (window.LP = {});

LP.date = (function () {
  var P = LP.config.params, over = { today: null, now: null };
  if (LP.config.mock) {
    var t = P.get('today'), n = P.get('now');
    if (t && /^\d{4}-\d{2}-\d{2}$/.test(t)) over.today = t;
    if (n && /^\d{1,2}:\d{2}$/.test(n)) over.now = n.length === 4 ? '0' + n : n;
  }
  var daysOff = {};

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parse(s) { var p = String(s).split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function iso(dt) { return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate()); }
  function isValid(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && iso(parse(s)) === s; }
  function isTime(s) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s)); }
  function add(d, n) { var dt = parse(d); dt.setUTCDate(dt.getUTCDate() + n); return iso(dt); }
  function diff(a, b) { return Math.round((parse(a) - parse(b)) / 864e5); }
  function dow(d) { var g = parse(d).getUTCDay(); return g === 0 ? 7 : g; }
  function today() {
    if (over.today) return over.today;
    var l = new Date();
    return l.getFullYear() + '-' + pad(l.getMonth() + 1) + '-' + pad(l.getDate());
  }
  function now() {
    if (over.now) return over.now;
    var l = new Date();
    return pad(l.getHours()) + ':' + pad(l.getMinutes());
  }
  function stamp() { return today() + ' ' + now(); }
  function fmt(d) { var p = String(d).split('-'); return p[2] + '/' + p[1]; }
  function fmtFull(d) { var p = String(d).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  var NAMES = ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
  var SHORT = ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  function weekdayName(d) { return NAMES[dow(d)]; }
  function weekdayShort(d) { return SHORT[dow(d)]; }

  function setDaysOff(list) {
    daysOff = {};
    (list || []).forEach(function (r) { var d = typeof r === 'string' ? r : r && r.date; if (d) daysOff[d] = true; });
  }
  function isDayOff(d) { return !!daysOff[d]; }
  // Ngày làm việc: không phải Chủ nhật và không phải ngày nghỉ đã đánh dấu
  function isWorkday(d) { return dow(d) !== 7 && !daysOff[d]; }
  // Lùi hoặc tiến n ngày làm việc. n = 0 giữ nguyên.
  function addWorkdays(d, n) {
    var step = n >= 0 ? 1 : -1, left = Math.abs(n), cur = d, guard = 0;
    while (left > 0 && guard++ < 400) { cur = add(cur, step); if (isWorkday(cur)) left--; }
    return cur;
  }
  function nextWorkday(d) { return addWorkdays(d, 1); }
  function prevWorkday(d) { return addWorkdays(d, -1); }
  function startOfWeek(d) { return add(d, 1 - dow(d)); }
  function monthStart(d) { return d.slice(0, 8) + '01'; }
  function daysInMonth(d) { var p = d.split('-'); return new Date(Date.UTC(+p[0], +p[1], 0)).getUTCDate(); }
  function monthEnd(d) { return d.slice(0, 8) + pad(daysInMonth(d)); }
  function addMonths(d, n) {
    var p = d.split('-'), y = +p[0], m = +p[1] - 1 + n;
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    return y + '-' + pad(m + 1) + '-01';
  }
  function range(from, to) {
    var out = [], cur = from, guard = 0;
    while (cur <= to && guard++ < 800) { out.push(cur); cur = add(cur, 1); }
    return out;
  }
  function timeToMin(t) { if (!t) return null; var p = String(t).split(':'); return (+p[0]) * 60 + (+p[1]); }
  function minToTime(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function fmtMin(m) {
    m = Math.round(m || 0);
    if (m < 60) return m + 'p';
    return Math.floor(m / 60) + 'h' + (m % 60 ? pad(m % 60) : '');
  }

  return {
    today: today, now: now, stamp: stamp, parse: parse, iso: iso, isValid: isValid, isTime: isTime,
    add: add, diff: diff, dow: dow, fmt: fmt, fmtFull: fmtFull, weekdayName: weekdayName, weekdayShort: weekdayShort,
    setDaysOff: setDaysOff, isDayOff: isDayOff, isWorkday: isWorkday,
    addWorkdays: addWorkdays, nextWorkday: nextWorkday, prevWorkday: prevWorkday,
    startOfWeek: startOfWeek, monthStart: monthStart, monthEnd: monthEnd, daysInMonth: daysInMonth, addMonths: addMonths,
    range: range, timeToMin: timeToMin, minToTime: minToTime, fmtMin: fmtMin
  };
})();

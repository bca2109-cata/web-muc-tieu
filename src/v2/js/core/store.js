/* V2 · kho dữ liệu trong bộ nhớ. Ghi lạc quan: cập nhật ngay trên màn hình, gửi lên Sheet theo hàng đợi.
   LP.store.get() -> { routines, routineItems, routineChecks, tasks, taskSteps, habits, habitLogs, goals, reviews,
                       interruptions, daysOff, settings, docs }   (dòng đã xóa mềm bị lọc bỏ)
   Sự kiện: 'change:<Sheet>' (ví dụ change:Tasks), 'change' (mọi thay đổi), 'sync' (trạng thái lưu), 'ready'. */
var LP = window.LP || (window.LP = {});

LP.store = (function () {
  var C = LP.config.SHEETS, state = emptyState(), handlers = {}, ready = false;
  var queue = Promise.resolve(), pending = 0, lastError = null;

  function emptyState() { var s = {}; Object.keys(C).forEach(function (k) { s[C[k]] = []; }); return s; }
  function on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); }
  function off(ev, fn) { handlers[ev] = (handlers[ev] || []).filter(function (f) { return f !== fn; }); }
  function emit(ev, data) { (handlers[ev] || []).slice().forEach(function (f) { try { f(data); } catch (e) { console.error(e); } }); }
  function alive(r) { return !LP.util.truthy(r.deleted); }

  function normalize(data) {
    var s = emptyState();
    Object.keys(C).forEach(function (sheet) { s[C[sheet]] = ((data && data[C[sheet]]) || []).filter(alive); });
    return s;
  }
  function afterLoad() {
    LP.date.setDaysOff(state.daysOff);
    ready = true;
    emit('change'); // 'change' chạy trước 'change:<Sheet>' để bộ nhớ đệm của logic được làm mới trước khi màn hình vẽ lại
    Object.keys(C).forEach(function (sheet) { emit('change:' + sheet); });
    emit('ready');
  }

  /* ---------- Bản lưu gần nhất: hiện ngay khi mở, cập nhật khi Google Sheet trả về (chỉ bản thật, không dùng cho mock) ---------- */
  var CACHE_KEY = 'lpv2_cache', cacheSig = '', cacheTimer = null;
  function cacheOn() { return !LP.config.mock && !!LP.settings.getToken(); }
  function writeCache() {
    if (!cacheOn() || !ready) return;
    try { var j = JSON.stringify(state); localStorage.setItem(CACHE_KEY, j); cacheSig = j; } catch (e) { /* đầy bộ nhớ hoặc bị chặn: bỏ qua */ }
  }
  function loadCached() {
    if (!cacheOn()) return false;
    try {
      var j = localStorage.getItem(CACHE_KEY); if (!j) return false;
      state = normalize(JSON.parse(j)); cacheSig = j; applyOutbox(); afterLoad(); return true;
    } catch (e) { return false; }
  }
  // Tải toàn bộ. range { from, to } giới hạn các bảng theo ngày (lượt, thói quen, đột xuất)
  function load(range) {
    // Mặc định tải TOÀN BỘ lịch sử (from rỗng = không chặn dưới): màn Tồn tổng cần biết mục Daily sót từ bất kỳ ngày nào đã tick hay chưa
    range = range || { from: '', to: LP.date.add(LP.date.today(), 90) };
    return LP.api.load(range).then(function (data) {
      state = normalize(data); applyOutbox(); afterLoad();
      var j = ''; try { j = JSON.stringify(state); } catch (e) { /* bỏ qua */ }
      var changed = !!cacheSig && j !== cacheSig; writeCache(); load.changed = changed;
      sendOutbox();   // gửi lại những thay đổi chưa lên được Sheet
      return state;
    });
  }
  // Tải thêm một khoảng ngày cũ hơn và gộp vào (xem lịch sử xa)
  function loadRange(from, to) {
    return LP.api.load({ from: from, to: to }).then(function (data) {
      var add = normalize(data);
      ['routineChecks', 'habitLogs', 'interruptions'].forEach(function (k) {
        var have = {}; state[k].forEach(function (r) { have[r.id] = true; });
        add[k].forEach(function (r) { if (!have[r.id]) state[k].push(r); });
      });
      emit('change'); return state;
    });
  }

  function listOf(sheet) { var k = C[sheet]; if (!k) throw new Error('Sheet không hợp lệ: ' + sheet); return state[k]; }
  function find(sheet, id) { return listOf(sheet).filter(function (r) { return r.id === id; })[0] || null; }

  /* ---------- Hàng chờ lưu bền (localStorage lpv2-outbox) ----------
     Mỗi lần upsert / remove ghi một mục { op:'save'|'remove', sheet, id, row, ts }; mỗi sheet+id chỉ giữ mục mới nhất.
     Lưu lên Sheet xong thì xóa mục. Mở lại web: áp các mục còn lại vào state rồi gửi lại. */
  var OUTBOX_KEY = 'lpv2-outbox', outbox = readOutbox();
  function readOutbox() {
    try {
      var a = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
      return (Array.isArray(a) ? a : []).filter(function (e) { return e && e.sheet && e.id && !!e.mock === !!LP.config.mock; });
    } catch (e) { return []; }
  }
  function writeOutbox() {
    try {
      var other = [];   // giữ nguyên mục của chế độ kia (mock / thật), không đụng vào
      try { other = (JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]') || []).filter(function (e) { return e && !!e.mock !== !!LP.config.mock; }); } catch (e) { /* bỏ qua */ }
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(other.concat(outbox)));
    } catch (e) { /* đầy bộ nhớ hoặc bị chặn: vẫn còn trong bộ nhớ trang */ }
  }
  function obKey(sheet, id) { return sheet + ':' + id; }
  function obFind(key) { return outbox.filter(function (e) { return obKey(e.sheet, e.id) === key; })[0] || null; }
  function obPut(entry) {
    if (LP.config.mock) entry.mock = true;
    outbox = outbox.filter(function (e) { return obKey(e.sheet, e.id) !== obKey(entry.sheet, entry.id); });
    outbox.push(entry); writeOutbox();
  }
  function obDrop(entry) { outbox = outbox.filter(function (e) { return e !== entry; }); writeOutbox(); }
  // Áp các mục còn trong hàng chờ vào state. Bản trên Sheet có updated_at mới hơn ts của mục thì giữ bản Sheet, bỏ mục chờ.
  function applyOutbox() {
    outbox.slice().forEach(function (e) {
      var list = state[C[e.sheet]]; if (!list) { obDrop(e); return; }
      var i = list.findIndex(function (r) { return r.id === e.id; }), cur = i >= 0 ? list[i] : null;
      if (cur && cur.updated_at && String(cur.updated_at) > String(e.ts)) { obDrop(e); return; }
      if (e.op === 'save' && e.row) { var row = Object.assign({}, e.row); if (i >= 0) list[i] = row; else list.push(row); }
      else if (e.op === 'remove') { if (i < 0) { obDrop(e); return; } list.splice(i, 1); }
    });
    LP.date.setDaysOff(state.daysOff);
  }

  /* ---------- Hàng đợi gửi ---------- */
  function setSync() {
    emit('sync', { pending: pending, error: lastError, outbox: outbox.length, failed: outbox.length });
    if (!pending && !lastError && !outbox.length) { clearTimeout(cacheTimer); cacheTimer = setTimeout(writeCache, 600); }
  }
  function sendEntry(e) { return e.op === 'remove' ? LP.api.remove(e.sheet, e.id) : LP.api.save(e.sheet, Object.assign({}, e.row)); }
  // Gửi mục mới nhất của sheet+id (đọc lúc gửi, không dùng bản cũ trong closure)
  function enqueueKey(key) {
    pending++; setSync();
    queue = queue.then(function () {
      var e = obFind(key); if (!e) return;
      return sendEntry(e).then(function () { if (obFind(key) === e) obDrop(e); });
    }).then(function () {
      pending--; lastError = null; setSync();
      if (!outbox.length && !pending) LP.ui.clearSticky();
    }, function (err) {
      pending--; lastError = err; setSync();
      LP.ui.toast('Chưa lưu được ' + outbox.length + ' thay đổi', { sticky: true, actionLabel: 'Thử lại', action: retry });
    });
    return queue;
  }
  function sendOutbox() { outbox.slice().forEach(function (e) { enqueueKey(obKey(e.sheet, e.id)); }); }
  function retry() { lastError = null; sendOutbox(); return queue; }
  window.addEventListener('online', function () { if (outbox.length) retry(); });

  function upsert(sheet, row) {
    var list = listOf(sheet), now = LP.date.stamp();
    row = Object.assign({}, row);
    if (!row.id) row.id = LP.util.uid();
    var i = list.findIndex(function (r) { return r.id === row.id; });
    if (i >= 0) { row.created_at = row.created_at || list[i].created_at; list[i] = row; }
    else { row.created_at = row.created_at || now; list.push(row); }
    row.updated_at = now;
    if (sheet === 'DaysOff') LP.date.setDaysOff(state.daysOff);
    emit('change', { sheet: sheet, row: row }); emit('change:' + sheet, row);
    obPut({ op: 'save', sheet: sheet, id: row.id, row: Object.assign({}, row), ts: now });
    enqueueKey(obKey(sheet, row.id));
    return row;
  }
  function remove(sheet, id) {
    var k = C[sheet], before = state[k].length;
    state[k] = state[k].filter(function (r) { return r.id !== id; });
    if (sheet === 'DaysOff') LP.date.setDaysOff(state.daysOff);
    if (state[k].length !== before) { emit('change', { sheet: sheet, id: id }); emit('change:' + sheet, { id: id, removed: true }); }
    obPut({ op: 'remove', sheet: sheet, id: id, ts: LP.date.stamp() });
    return enqueueKey(obKey(sheet, id));
  }
  // Giá trị cài đặt dạng khóa/giá trị
  function setting(key, def) {
    var r = state.settings.filter(function (x) { return x.key === key; })[0];
    return r && r.value !== '' && r.value != null ? r.value : def;
  }
  function setSetting(key, value) {
    var r = state.settings.filter(function (x) { return x.key === key; })[0];
    return upsert('Settings', Object.assign({}, r || { id: 'set-' + key, key: key }, { value: String(value) }));
  }
  // Chờ hàng đợi lưu xong (dùng trong test)
  function flush() { return queue.then(function () { return pending === 0 ? true : flush(); }); }

  return {
    get: function () { return state; }, load: load, loadCached: loadCached, changedSinceCache: function () { return !!load.changed; }, loadRange: loadRange, find: find, upsert: upsert, remove: remove,
    setting: setting, setSetting: setSetting, on: on, off: off, emit: emit, flush: flush, retry: retry,
    outboxCount: function () { return outbox.length; },
    outboxHas: function (sheet, id) { return !!obFind(obKey(sheet, id)); },
    outboxList: function () { return LP.util.clone(outbox); },
    isReady: function () { return ready; }, syncState: function () { return { pending: pending, error: lastError, outbox: outbox.length }; },
    // Chỉ dùng cho test: nạp thẳng một bộ dữ liệu
    _set: function (data) { state = normalize(data); afterLoad(); }
  };
})();

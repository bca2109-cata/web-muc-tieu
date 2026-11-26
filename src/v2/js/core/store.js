/* V2 · kho dữ liệu trong bộ nhớ. Ghi lạc quan: cập nhật ngay trên màn hình, gửi lên Sheet theo hàng đợi.
   LP.store.get() -> { routines, routineItems, routineChecks, tasks, taskSteps, habits, habitLogs, goals, reviews,
                       interruptions, daysOff, settings, docs }   (dòng đã xóa mềm bị lọc bỏ)
   Sự kiện: 'change:<Sheet>' (ví dụ change:Tasks), 'change' (mọi thay đổi), 'sync' (trạng thái lưu), 'ready'. */
var LP = window.LP || (window.LP = {});

LP.store = (function () {
  var C = LP.config.SHEETS, state = emptyState(), handlers = {}, ready = false;
  var queue = Promise.resolve(), pending = 0, lastError = null, failed = [];

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
      state = normalize(JSON.parse(j)); cacheSig = j; afterLoad(); return true;
    } catch (e) { return false; }
  }
  // Tải toàn bộ. range { from, to } giới hạn các bảng theo ngày (lượt, thói quen, đột xuất)
  function load(range) {
    // Mặc định tải TOÀN BỘ lịch sử (from rỗng = không chặn dưới): màn Tồn tổng cần biết mục Daily sót từ bất kỳ ngày nào đã tick hay chưa
    range = range || { from: '', to: LP.date.add(LP.date.today(), 90) };
    return LP.api.load(range).then(function (data) {
      state = normalize(data); afterLoad();
      var j = ''; try { j = JSON.stringify(state); } catch (e) { /* bỏ qua */ }
      var changed = !!cacheSig && j !== cacheSig; writeCache(); load.changed = changed;
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

  /* ---------- Hàng đợi lưu ---------- */
  function setSync() {
    emit('sync', { pending: pending, error: lastError, failed: failed.length });
    if (!pending && !lastError) { clearTimeout(cacheTimer); cacheTimer = setTimeout(writeCache, 600); }
  }
  function enqueue(label, fn) {
    pending++; setSync();
    queue = queue.then(fn).then(function () {
      pending--; lastError = null; failed = failed.filter(function (f) { return f.label !== label; }); setSync();
    }, function (e) {
      pending--; lastError = e; failed.push({ label: label, fn: fn }); setSync();
      LP.ui.toast('Không lưu được: ' + (e && e.message ? e.message : e), {
        sticky: true, actionLabel: 'Thử lại', action: retry
      });
    });
    return queue;
  }
  function retry() {
    var todo = failed.slice(); failed = []; lastError = null;
    todo.forEach(function (f) { enqueue(f.label, f.fn); });
  }

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
    var copy = Object.assign({}, row);
    enqueue(sheet + ':' + row.id, function () { return LP.api.save(sheet, copy); });
    return row;
  }
  function remove(sheet, id) {
    var k = C[sheet], before = state[k].length;
    state[k] = state[k].filter(function (r) { return r.id !== id; });
    if (sheet === 'DaysOff') LP.date.setDaysOff(state.daysOff);
    if (state[k].length !== before) { emit('change', { sheet: sheet, id: id }); emit('change:' + sheet, { id: id, removed: true }); }
    return enqueue(sheet + ':' + id + ':xoa', function () { return LP.api.remove(sheet, id); });
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
    isReady: function () { return ready; }, syncState: function () { return { pending: pending, error: lastError }; },
    // Chỉ dùng cho test: nạp thẳng một bộ dữ liệu
    _set: function (data) { state = normalize(data); afterLoad(); }
  };
})();

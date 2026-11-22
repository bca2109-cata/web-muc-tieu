/* Dữ liệu trong bộ nhớ + cập nhật lạc quan.
   Mỗi thay đổi: đổi state và vẽ lại ngay, rồi đưa vào hàng đợi để lưu xuống Sheet ở nền.
   Hàng đợi được giữ trong localStorage, nên tắt trang giữa chừng thì lần mở sau vẫn lưu tiếp. */
var App = window.App || (window.App = {});

App.store = (function () {
  var QUEUE_KEY = 'muctieu_queue_' + App.api.mode;
  var CACHE_KEY = 'muctieu_cache_v1';

  var state = empty();
  var queue = readJson(QUEUE_KEY) || [];
  var sending = 0;          // số thao tác đang gửi
  var failed = false;
  var lastError = '';
  var listeners = [];
  var statusListeners = [];

  function empty() { return { goals: [], tasks: [], habits: [], habitLogs: [], reviews: [], interruptions: [], settings: [] }; }
  function readJson(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function writeJson(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* đầy bộ nhớ thì bỏ qua */ } }

  function emit() { listeners.forEach(function (fn) { fn(state); }); }
  function status() {
    if (failed && navigator.onLine === false) return { kind: 'error', text: 'Mất mạng, sẽ lưu khi có mạng', error: lastError };
    if (failed) return { kind: 'error', text: 'Chưa lưu', error: lastError };
    if (queue.length) return { kind: 'saving', text: 'Đang lưu…' };
    return { kind: 'saved', text: 'Đã lưu' };
  }
  function emitStatus() { var s = status(); statusListeners.forEach(function (fn) { fn(s); }); }

  function normalize(db) {
    var out = empty();
    Object.keys(out).forEach(function (k) { out[k] = Array.isArray(db && db[k]) ? db[k] : []; });
    return out;
  }

  function flush() {
    if (sending || failed || !queue.length) { emitStatus(); return; }
    var ops = queue.slice();
    sending = ops.length;
    emitStatus();
    App.api.batch(ops).then(function () {
      queue = queue.slice(sending);
      if (App.ui.clearSticky) App.ui.clearSticky();
      sending = 0;
      writeJson(QUEUE_KEY, queue);
      flush();
    }, function (err) {
      sending = 0;
      failed = true;
      lastError = err && err.message ? err.message : String(err);
      emitStatus();
      if (err && (err.code === 'BAD_TOKEN' || err.code === 'NO_TOKEN')) {
        App.forms.openSettings('Mã bí mật không đúng hoặc chưa nhập. Dán lại mã rồi bấm Lưu và kết nối.');
        return;
      }
      // Mất mạng: chỉ báo ở dòng trạng thái, có mạng lại thì tự lưu tiếp
      if (navigator.onLine === false) return;
      App.ui.toast('Chưa lưu được vào Google Sheet. ' + lastError + '.', { actionLabel: 'Thử lại', action: retry, sticky: true });
    });
  }

  function retry() { failed = false; lastError = ''; flush(); }

  function commit(ops) {
    var now = App.util.now();
    ops.forEach(function (op) {
      if (op.type === 'upsert') op.row = Object.assign({}, op.row, { updated_at: now });
      App.applyOp(state, op);
    });
    queue = queue.concat(ops);
    writeJson(QUEUE_KEY, queue);
    if (App.api.mode === 'sheet') writeJson(CACHE_KEY, state);
    emit();
    flush();
  }

  return {
    get: function () { return state; },
    onChange: function (fn) { listeners.push(fn); },
    onStatus: function (fn) { statusListeners.push(fn); },
    status: status,
    hasCache: function () { return App.api.mode === 'sheet' && !!readJson(CACHE_KEY); },

    // Vẽ ngay từ bản lưu tạm trên máy (chỉ bản thật), trong lúc chờ tải từ Sheet
    loadCache: function () {
      var c = readJson(CACHE_KEY);
      if (!c) return false;
      state = normalize(c);
      queue.forEach(function (op) { App.applyOp(state, op); });
      emit();
      return true;
    },

    load: function () {
      return App.api.loadAll().then(function (db) {
        state = normalize(db);
        // Thao tác chưa lưu xong vẫn phải hiện trên giao diện
        queue.forEach(function (op) { App.applyOp(state, op); });
        if (App.api.mode === 'sheet') writeJson(CACHE_KEY, state);
        emit();
        // Tải được tức là kết nối đã ổn, gửi tiếp phần chưa lưu
        failed = false;
        flush();
        return state;
      });
    },

    // Dùng sau khi khôi phục dữ liệu mẫu ở bản mock
    replace: function (db) { state = normalize(db); queue = []; writeJson(QUEUE_KEY, queue); emit(); emitStatus(); },

    upsert: function (table, row) { commit([{ type: 'upsert', table: table, row: row }]); },
    remove: function (table, id) { commit([{ type: 'delete', table: table, id: id }]); },
    batch: function (ops) { if (ops.length) commit(ops); },
    refreshStatus: emitStatus,
    retry: retry
  };
})();

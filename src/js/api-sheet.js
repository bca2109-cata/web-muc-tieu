/* Bản thật của lớp dữ liệu: gọi Apps Script Web App, Apps Script đọc ghi Google Sheet.
   Gửi bằng POST, Content-Type text/plain để trình duyệt không chặn (không cần preflight CORS).
   Mã bí mật nằm trong thân request, không bao giờ nằm trên URL. */
var App = window.App || (window.App = {});

App.createSheetApi = function (options) {
  var url = options.url;
  var TIMEOUT = 25000;

  function call(action, payload, timeout) {
    var token = App.settings.getToken();
    if (!token) return Promise.reject(Object.assign(new Error('Chưa nhập mã bí mật'), { code: 'NO_TOKEN' }));
    var body = Object.assign({ action: action, token: token }, payload || {});
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeout || TIMEOUT) : null;

    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (!res.ok) throw new Error('Máy chủ trả lỗi ' + res.status);
      return res.json();
    }).then(function (json) {
      if (!json || !json.ok) {
        var err = new Error((json && json.error) || 'Lỗi không rõ');
        if (json && json.code) err.code = json.code;
        throw err;
      }
      return json.data;
    }, function (e) {
      if (e.code) throw e;
      if (e.name === 'AbortError') throw new Error('Quá thời gian chờ Google Sheet trả lời');
      if (e instanceof TypeError) throw new Error('Không kết nối được. Kiểm tra mạng rồi thử lại');
      throw e;
    }).finally(function () { if (timer) clearTimeout(timer); });
  }

  return {
    mode: 'sheet',
    loadAll: function () { return call('loadAll'); },
    batch: function (ops) { return call('batch', { ops: ops }); },
    // Thay toàn bộ dữ liệu trong Sheet (nhập từ file sao lưu). Chờ lâu hơn vì ghi nhiều dòng.
    replaceAll: function (db) { return call('replaceAll', { db: db }, 120000); },
    ping: function () { return call('ping'); }
  };
};

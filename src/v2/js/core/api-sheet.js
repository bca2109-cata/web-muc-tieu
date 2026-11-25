/* V2 · bản thật của lớp dữ liệu: gọi Apps Script Web App, Apps Script đọc ghi Google Sheet V2.
   POST với Content-Type text/plain để trình duyệt không chặn (không cần preflight CORS).
   Mã bí mật nằm trong thân request, không bao giờ nằm trên URL. */
var LP = window.LP || (window.LP = {});

LP.createSheetApi = function (options) {
  var url = options.url, TIMEOUT = 25000;

  function call(action, payload, timeout) {
    var token = LP.settings.getToken();
    if (!token) return Promise.reject(Object.assign(new Error('Chưa nhập mã bí mật'), { code: 'NO_TOKEN' }));
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeout || TIMEOUT) : null;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: action, token: token }, payload || {})),
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
    load: function (range) { return call('load', { range: range || null }); },
    save: function (sheet, row) { return call('save', { sheet: sheet, row: row }); },
    remove: function (sheet, id) { return call('remove', { sheet: sheet, id: id }); },
    // Tài liệu ghi chú: Phần 3 xử lý phía Apps Script trong apps-script-v2/Docs.gs
    docsIndex: function () { return call('docsIndex'); },
    docGet: function (id) { return call('docGet', { id: id }); },
    // docSave nhận thêm base_updated_at, force; trả { conflict: true, server } khi bản trên Sheet mới hơn
    docSave: function (doc) { return call('docSave', { doc: doc }, 60000); },
    docDelete: function (id) { return call('docDelete', { id: id }); },
    ping: function () { return call('ping'); }
  };
};

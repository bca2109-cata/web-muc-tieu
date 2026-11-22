/* Lớp dữ liệu: chọn bản thật (Google Sheet) hoặc bản giả (mock).
   Dùng bản mock khi: mở file trực tiếp (file://), có ?mock=1, hoặc chưa điền SHEET_API_URL. */
var App = window.App || (window.App = {});

App.settings = {
  TOKEN_KEY: 'muctieu_token',
  getToken: function () { try { return localStorage.getItem(this.TOKEN_KEY) || ''; } catch (e) { return ''; } },
  setToken: function (v) { try { localStorage.setItem(this.TOKEN_KEY, v); } catch (e) { /* bỏ qua */ } }
};

// Áp một thao tác lên một bộ dữ liệu {goals, tasks, ...}. Dùng chung cho store và bản mock.
App.applyOp = function (db, op) {
  var key = App.C.TABLES[op.table];
  if (!key) return;
  var list = db[key] || (db[key] = []);
  if (op.type === 'upsert') {
    var i = list.findIndex(function (r) { return r.id === op.row.id; });
    if (i >= 0) list[i] = Object.assign({}, op.row); else list.push(Object.assign({}, op.row));
  } else if (op.type === 'delete') {
    db[key] = list.filter(function (r) { return r.id !== op.id; });
  }
};

App.api = (function () {
  var params = new URLSearchParams(location.search);
  var useMock = location.protocol === 'file:' || params.get('mock') === '1' || !App.config.SHEET_API_URL;
  if (useMock) {
    var t = params.get('today');
    if (t && App.date.isValid(t)) App.config.todayOverride = t;
    // ?now=17:45 giả lập giờ hiện tại (thử việc về kho lúc hết giờ làm)
    var hm = params.get('now');
    if (hm && App.logic.isTime(hm)) App.config.nowOverride = hm;
    return App.createMockApi({ failRate: parseFloat(params.get('fail')) || 0 });
  }
  return App.createSheetApi({ url: App.config.SHEET_API_URL });
})();

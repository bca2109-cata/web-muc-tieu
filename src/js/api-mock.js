/* Bản giả của lớp dữ liệu: lưu trong localStorage, có sẵn dữ liệu mẫu.
   Trên địa chỉ trang có thể thêm:
   ?today=2026-11-25  giả lập ngày hôm nay
   ?fail=1            mọi lần lưu đều lỗi (thử thông báo lỗi và nút Thử lại); ?fail=0.5 lỗi một nửa số lần */
var App = window.App || (window.App = {});

App.createMockApi = function (options) {
  var KEY = 'muctieu_mock_db_v1';
  var failRate = options.failRate || 0;
  var DELAY = 150;

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* dữ liệu hỏng thì tạo lại */ }
    var seed = App.mockData(App.date.today());
    write(seed);
    return seed;
  }
  function write(db) { localStorage.setItem(KEY, JSON.stringify(db)); }
  function wait(value, fail) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () { fail ? reject(new Error('Lỗi giả lập khi lưu')) : resolve(value); }, DELAY);
    });
  }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  return {
    mode: 'mock',
    loadAll: function () { return wait(clone(read())); },
    batch: function (ops) {
      if (failRate && Math.random() < failRate) return wait(null, true);
      var db = read();
      ops.forEach(function (op) { App.applyOp(db, op); });
      write(db);
      return wait({ count: ops.length });
    },
    ping: function () { return wait({}); },
    reset: function () { localStorage.removeItem(KEY); return wait(clone(read())); }
  };
};

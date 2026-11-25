/* V2 · cấu hình và tiện ích nhỏ. Mọi thứ nằm dưới window.LP.
   SHEET_API_URL: link "Ứng dụng web" của Apps Script V2, điền sau khi triển khai (xem docs/v2/TRIEN-KHAI-SHEET.md).
   Để trống thì web chạy bản mock (dữ liệu mẫu lưu trên trình duyệt). Mã bí mật KHÔNG để ở đây. */
var LP = window.LP || (window.LP = {});

(function () {
  var params = new URLSearchParams(location.search);
  var url = 'https://script.google.com/macros/s/AKfycby-Jn9LrBWL9eCZuU_n1ph7hwSGAc62RB2CIPo5dEPybk03oRY5pnXB482zItL9Pbtn/exec';
  LP.config = {
    SHEET_API_URL: url,
    // Bản mock khi: mở file trực tiếp, có ?mock=1, hoặc chưa điền SHEET_API_URL
    mock: location.protocol === 'file:' || params.get('mock') === '1' || !url,
    params: params,
    // Tên sheet -> khóa trong LP.store.get()
    SHEETS: {
      Routines: 'routines', RoutineItems: 'routineItems', RoutineChecks: 'routineChecks',
      Tasks: 'tasks', TaskSteps: 'taskSteps', Habits: 'habits', HabitLogs: 'habitLogs',
      Goals: 'goals', Reviews: 'reviews', Interruptions: 'interruptions', DaysOff: 'daysOff',
      Settings: 'settings', Docs: 'docs'
    },
    ROUTES: ['agenda', 'lich', 'ghi-chu', 'muc-tieu', 'tong-ket', 'cai-dat', 'mau', 'soat', 'ton'],
    TOKEN_KEY: 'lpv2_token'
  };

  LP.util = {
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    uid: function () {
      var s = '';
      for (var i = 0; i < 10; i++) s += 'abcdefghijkmnpqrstuvwxyz23456789'.charAt(Math.floor(Math.random() * 32));
      return s;
    },
    // Giá trị lưu trong Sheet có thể là true, 1, '1', 'TRUE'
    truthy: function (v) { return v === true || v === 1 || v === '1' || /^true$/i.test(String(v)); },
    // Bỏ dấu tiếng Việt để tìm kiếm
    fold: function (s) {
      return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
    },
    num: function (v, d) { var n = parseFloat(v); return isNaN(n) ? (d == null ? 0 : d) : n; },
    clone: function (o) { return JSON.parse(JSON.stringify(o)); }
  };
})();

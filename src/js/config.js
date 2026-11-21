/* Cấu hình. SHEET_API_URL là link "Ứng dụng web" của Apps Script, điền sau khi triển khai.
   Mã bí mật KHÔNG để ở đây: mỗi thiết bị nhập một lần trong phần Cài đặt. */
var App = window.App || (window.App = {});

App.config = {
  SHEET_API_URL: 'https://script.google.com/macros/s/AKfycbziqGG0JGqUoVAPNDuT_BE1lge2BYmtwBnzu4IvgR9N-aLTcSqv6rfivhvYljN9rzm6iQ/exec',
  // Ngày giả lập cho bản mock, đặt bằng ?today=yyyy-mm-dd trên địa chỉ trang
  todayOverride: null
};

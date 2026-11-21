/* Cấu hình. SHEET_API_URL là link "Ứng dụng web" của Apps Script, điền sau khi triển khai.
   Mã bí mật KHÔNG để ở đây: mỗi thiết bị nhập một lần trong phần Cài đặt. */
var App = window.App || (window.App = {});

App.config = {
  SHEET_API_URL: '',
  // Ngày giả lập cho bản mock, đặt bằng ?today=yyyy-mm-dd trên địa chỉ trang
  todayOverride: null
};

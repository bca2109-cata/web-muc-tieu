# Yêu cầu sửa phần chung

> Phần nào cần thêm hoặc đổi file [Chung] thì ghi vào đây, **không tự sửa file chung**. Trong lúc chờ, viết tạm trong file của phần mình, đặt tên có tiền tố `tam_`. Phiên ghép sẽ xử lý và đánh dấu Đã xong.

| # | Phần | Cần gì | Vì sao | Hàm tạm ở đâu | Trạng thái |
|---|---|---|---|---|---|
| 1 | 1 | Thêm `'soat'` vào `LP.config.ROUTES` (config.js) để `#/soat` chạy được | Hợp đồng gọi Soát là route `soat` nhưng router chưa nhận tên này, `#/soat` bị đưa về Agenda | Soát mở bằng `#/agenda?soat=1`; `soat.js` vẫn đăng ký sẵn route `soat` | Chờ |
| 2 | 1 | Hàm chung mở tài liệu đúng mục trong tấm trượt, ví dụ `LP.ui.docSheet(docId, headingId)` | Agenda (link "Ghi chú", menu ⋯ "Mở ghi chú") cần đọc một mục của tài liệu | `tam_openDoc`, `tam_docSection` trong `agenda.js` (cắt theo dòng `# Tiêu đề`) | Chờ |
| 3 | 1 | `LP.quickAdd.edit(kind, id)` để sửa việc (Phần 5) | Menu ⋯ của việc có mục "Sửa" | Chưa có: hiện thông báo "Phần 5 sẽ nối vào" | Chờ |
| 4 | 1 | `leftovers(d)` (logic-routines.js): giữ mục tồn nhiều ngày | Người dùng yêu cầu mục tồn không biến mất sau 1 ngày | Đã sửa trong phần 1 theo yêu cầu người dùng (26/11): tra ngược `leftover_days` ngày lịch (Settings, mặc định 14), giữ tới khi tick/bỏ qua. Đặt giờ chỉ có hiệu lực đúng ngày đặt (`note='xep-gio:yyyy-mm-dd'`), hạng mục khoảng ngày chỉ hiện một lần. Việc (task) tồn giữ tới khi xong. Test ở `phan-1.js` | Đã xong (phiên ghép rà lại) |
| 5 | 1 | Seed mock: chuỗi thói quen "Uống nước" ghi chú 6 ngày nhưng ra 5 | Chỉ lệch ghi chú | Test Phần 1 theo giá trị 5 | Nhỏ |

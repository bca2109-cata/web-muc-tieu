# Yêu cầu sửa phần chung

> Phần nào cần thêm hoặc đổi file [Chung] thì ghi vào đây, **không tự sửa file chung**. Trong lúc chờ, viết tạm trong file của phần mình, đặt tên có tiền tố `tam_`. Phiên ghép sẽ xử lý và đánh dấu Đã xong.

| # | Phần | Cần gì | Vì sao | Hàm tạm ở đâu | Trạng thái |
|---|---|---|---|---|---|
| 1 | 1 | Thêm `'soat'` vào `LP.config.ROUTES` (config.js) để `#/soat` chạy được | Hợp đồng gọi Soát là route `soat` nhưng router chưa nhận tên này, `#/soat` bị đưa về Agenda | Soát mở bằng `#/agenda?soat=1`; `soat.js` vẫn đăng ký sẵn route `soat` | Chờ |
| 2 | 1 | Hàm chung mở tài liệu đúng mục trong tấm trượt, ví dụ `LP.ui.docSheet(docId, headingId)` | Agenda (link "Ghi chú", menu ⋯ "Mở ghi chú") cần đọc một mục của tài liệu | `tam_openDoc`, `tam_docSection` trong `agenda.js` (cắt theo dòng `# Tiêu đề`) | Chờ |
| 3 | 1 | `LP.quickAdd.edit(kind, id)` để sửa việc (Phần 5) | Menu ⋯ của việc có mục "Sửa" | Chưa có: hiện thông báo "Phần 5 sẽ nối vào" | Chờ |
| 4 | 1 | `leftovers(d)` chỉ xét lượt của ngày làm việc liền trước | Hạng mục tồn hai ngày liền mà chưa quyết định sẽ biến mất khỏi "Từ hôm qua". Soát chỉ gom mục của hôm nay nên không bắt được | Không có | Chờ quyết định |
| 5 | 1 | Seed mock: chuỗi thói quen "Uống nước" ghi chú 6 ngày nhưng ra 5 | Chỉ lệch ghi chú | Test Phần 1 theo giá trị 5 | Nhỏ |

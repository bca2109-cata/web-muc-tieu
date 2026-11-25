# Yêu cầu sửa phần chung

> Phần nào cần thêm hoặc đổi file [Chung] thì ghi vào đây, **không tự sửa file chung**. Trong lúc chờ, viết tạm trong file của phần mình, đặt tên có tiền tố `tam_`. Phiên ghép sẽ xử lý và đánh dấu Đã xong.

| # | Phần | Cần gì | Vì sao | Hàm tạm ở đâu | Trạng thái |
|---|---|---|---|---|---|
| 1 | 1 | Thêm `'soat'` vào `LP.config.ROUTES` (config.js) để `#/soat` chạy được | Hợp đồng gọi Soát là route `soat` nhưng router chưa nhận tên này, `#/soat` bị đưa về Agenda | Soát mở bằng `#/agenda?soat=1`; `soat.js` vẫn đăng ký sẵn route `soat` | Chờ |
| 2 | 1 | Hàm chung mở tài liệu đúng mục trong tấm trượt, ví dụ `LP.ui.docSheet(docId, headingId)` | Agenda (link "Ghi chú", menu ⋯ "Mở ghi chú") cần đọc một mục của tài liệu | `tam_openDoc`, `tam_docSection` trong `agenda.js` (cắt theo dòng `# Tiêu đề`) | Chờ |
| 3 | 1 | `LP.quickAdd.edit(kind, id)` để sửa việc (Phần 5) | Menu ⋯ của việc có mục "Sửa" | Chưa có: hiện thông báo "Phần 5 sẽ nối vào" | Chờ |
| 4 | 1 | `leftovers(d, opts)` (logic-routines.js): khối Từ hôm qua 7 ngày, `{all:true}` lấy tất cả | Người dùng yêu cầu (26/11, thay ý cũ): Từ hôm qua chỉ 7 ngày gần nhất, mục cũ hơn xem ở màn Tồn tổng | Đã sửa trong phần 1 theo yêu cầu người dùng: mặc định `leftover_days` = 7 (Settings); `{all:true}` tra ngược tối đa 120 ngày và không sớm hơn ngày tạo mẫu; mẫu khoảng ngày tính cộng dồn cả khoảng; đặt giờ chỉ hiệu lực đúng ngày (`note='xep-gio:yyyy-mm-dd'`); việc tồn chỉ cắt theo 7 ngày ở chế độ mặc định | Đã xong (phiên ghép rà lại) |
| 5 | 1 | Seed mock: chuỗi thói quen "Uống nước" ghi chú 6 ngày nhưng ra 5 | Chỉ lệch ghi chú | Test Phần 1 theo giá trị 5 | Nhỏ |

| 6 | 1 | Trạng thái việc `cancelled` (Hủy) cho Tasks.status | Người dùng yêu cầu: việc không còn cần làm thoát khỏi tồn | Đã thêm trong phần 1: `LP.logic.tasks.setCancelled(task, on)`; `urgency`, `tasksFor`, `leftoverTasks` bỏ qua việc hủy; `stats.adhocStatus` và `byLevel` không đếm; `search.js` ghi 'Đã hủy'. Sheet không cần cột mới (status là chữ tự do) | **Phần 2, 4, 5 phải lọc `status === 'cancelled'`** khi tự đọc `LP.store.get().tasks` (Lịch, Mục tiêu, Tổng kết, form sửa) |
| 7 | 1 | Route `ton` (Tồn tổng) | Màn Tồn tổng mở bằng `#/agenda?ton=1`, không thêm tab | `LP.ton` trong `soat.js`; đã đăng ký sẵn route `ton`. Nếu muốn `#/ton` thì thêm `'ton'` vào `LP.config.ROUTES` | Chờ |
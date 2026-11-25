# Yêu cầu sửa phần chung

> Phần nào cần thêm hoặc đổi file [Chung] thì ghi vào đây, **không tự sửa file chung**. Trong lúc chờ, viết tạm trong file của phần mình, đặt tên có tiền tố `tam_`. Phiên ghép sẽ xử lý và đánh dấu Đã xong.

| # | Phần | Cần gì | Vì sao | Hàm tạm ở đâu | Trạng thái |
|---|---|---|---|---|---|
| P2-1 | 2 · Lịch | `mock-data.js`: việc `t-bcnguon` thêm `due_time: '15:00'` và tên ngắn "BC phân tích nguồn T11" cho khớp canvas | Tiêu chí 1 của Phần 2 cần mốc "Hạn 15:00 · ..." | Test tự đặt `due_time` trước khi kiểm; mốc hiện "Hạn · tên" khi thiếu giờ | Chờ |
| P2-2 | 2 · Lịch | `LP.logic.tasks.moveDoDate(task, step, date)` (đổi ngày làm, kiểm quá khứ/trễ hạn) | Lịch kéo thả; Phần 1/5 có thể cần cùng logic | `LP.lich.moveTo` trong `lich-tuan.js` | Chờ |

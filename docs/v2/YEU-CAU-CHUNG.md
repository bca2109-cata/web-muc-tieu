# Yêu cầu sửa phần chung

> Phần nào cần thêm hoặc đổi file [Chung] thì ghi vào đây, **không tự sửa file chung**. Trong lúc chờ, viết tạm trong file của phần mình, đặt tên có tiền tố `tam_`. Phiên ghép sẽ xử lý và đánh dấu Đã xong.

| # | Phần | Cần gì | Vì sao | Hàm tạm ở đâu | Trạng thái |
|---|---|---|---|---|---|
| P2-1 | 2 · Lịch | `mock-data.js`: việc `t-bcnguon` thêm `due_time: '15:00'` và tên ngắn "BC phân tích nguồn T11" cho khớp canvas | Tiêu chí 1 của Phần 2 cần mốc "Hạn 15:00 · ..." | Test tự đặt `due_time` trước khi kiểm; mốc hiện "Hạn · tên" khi thiếu giờ | Chờ |
| P2-2 | 2 · Lịch | `LP.logic.tasks.moveDoDate(task, step, date)` (đổi ngày làm, kiểm quá khứ/trễ hạn) | Lịch kéo thả; Phần 1/5 có thể cần cùng logic | `LP.lich.moveTo` trong `lich-tuan.js` | Chờ |
| P2-3 | 2 · Lịch | `mock-data.js`: cho vài việc/bước có `do_time` (ví dụ bước "Lấy dữ liệu nguồn" 25/11 09:30) | Lịch tuần dạng lưới giờ: mock hiện toàn việc chưa có giờ nên đều nằm ở dải "Cả ngày" | Cột `do_time`, `duration_min` đã có sẵn trong `Tasks`/`TaskSteps`, không cần thêm cột. Test tự đặt giờ | Chờ |

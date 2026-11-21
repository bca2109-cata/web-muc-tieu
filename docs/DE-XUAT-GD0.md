# Đề xuất Giai đoạn 0 (chờ duyệt)

> Viết ngày 2026-11-21 trên máy công ty. Phiên Claude Code mới: đọc file này, hỏi người dùng các câu còn mở ở mục 4, chưa viết code khi chưa được duyệt.

## 1. So sánh phương án triển khai

| | A. Apps Script trọn gói | B. GitHub Pages + Apps Script làm cầu nối | C. Web gọi thẳng Sheets API |
|---|---|---|---|
| Mở trang | 2–4 giây | Dưới 1 giây | Nhanh |
| Mỗi lần lưu | 1–2 giây, chạy ngầm | 1–2 giây, chạy ngầm | Khoảng 0,5 giây |
| Cài đặt | Dễ nhất | Trung bình (GitHub + mã bí mật) | Khó (Google Cloud, OAuth) |
| Cập nhật | Dán lại code, tạo phiên bản mới | Claude đẩy code | Claude đẩy code |
| Quota | Một người dùng không chạm tới | Như A | Như A |
| Điện thoại | Lối tắt màn hình chính, không offline | PWA thật | PWA thật, hay phải đăng nhập lại |
| Bảo mật | Tốt nhất (chỉ tài khoản của bạn) | Endpoint công khai + mã bí mật | Tốt |

Đề xuất: **A**. Lớp dữ liệu tách riêng nên có thể chuyển sang B sau này.

## 2. Cấu trúc thư mục đề xuất

```
src/            index.html, css/style.css, js/ (app, api, api-sheet, api-mock, mock-data, logic, các màn hình)
apps-script/    Code.gs
build/          Index.html ghép sẵn để dán vào Apps Script (ghép bằng script PowerShell)
docs/           TIEN-DO.md, HUONG-DAN-TRIEN-KHAI.md
```

Cập nhật 21/11/2026 sau khi chọn **B**: bỏ thư mục `build/` (GitHub Pages phục vụ thẳng `src/`), thêm `src/manifest.json` và `src/sw.js` cho PWA.

Bản mock mở bằng bấm đúp `src/index.html` (dùng script thường, không dùng ES module). Biểu đồ tự vẽ SVG.

## 3. Mặc định sẽ dùng (người dùng chưa phản đối)
- Kỳ: Năm `2026`, Quý `2027-Q1`, Tháng `2026-11`, Tuần `2026-W48` (ISO, bắt đầu thứ 2).
- Cảnh báo chậm khi % thời gian − % tiến độ ≥ 20 điểm.
- Sheet ghi tiếng Việt: nhóm (Công việc / Học tập / Sức khỏe), loại kỳ, trạng thái, ưu tiên. Tần suất `Hằng ngày` hoặc `T2,T4,T6`. `progress_mode` giữ `task/metric/habit`.
- % đúng hạn chỉ tính task có hạn chót.
- Đạt 100% không tự chuyển "Hoàn thành". Hiện % thật (có thể > 100%).
- Nút giao diện 3 chế độ: theo hệ thống / sáng / tối.

## 4. Câu hỏi còn mở
1. Phương án A, B hay C?
2. ~~Máy chạy Claude Code~~: người dùng sẽ làm tiếp trên máy cá nhân. Kiểm tra máy đó có Node chưa (cho qa-tester dùng Playwright); nếu không cài được thì cho qa-tester dùng trình duyệt có sẵn trong app Claude.
3. Gmail cá nhân hay tài khoản công ty? Có cho Claude tạo sẵn Google Sheet qua kết nối Google Sheets không?
4. Task lặp: có sinh bù ngày không mở web không (đề xuất: không)? Có tính vào % mục tiêu không?
5. Top 3 hôm qua chưa xong: tự bỏ hay giữ lại?
6. Xóa mục tiêu: task chuyển thành "Việc lặt vặt" hay xóa theo?

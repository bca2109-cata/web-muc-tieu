# Tiến độ dự án

> Claude Code cập nhật file này sau mỗi giai đoạn.
>
> 21/11/2026: chuyển dự án từ máy công ty (desktop-25ovadp) sang máy cá nhân (admin-pc). Đã sửa: thêm `model: sonnet` cho 2 agent; AGENTS.md dùng đúng `.codex/agents/` và không đụng vào `cai-dat-agents/`.

| Giai đoạn | Trạng thái | Ngày xong | Ghi chú |
|---|---|---|---|
| 0. Đề xuất triển khai | Xong | 21/11/2026 | Xem `docs/DE-XUAT-GD0.md`. 21/11/2026 trên admin-pc: đã chuyển 2 agent vào `.claude/agents/` (có `model: sonnet`), đã xóa `cai-dat-agents/`. Máy có Node v26.13.0, npm 11.20.0 |
| 1. Mục tiêu và task cơ bản | Chưa bắt đầu | | |
| 2. Chỉ số, kỳ, task lặp, cảnh báo | Chưa bắt đầu | | |
| 3. Thói quen và streak | Chưa bắt đầu | | |
| 4. Tổng kết, biểu đồ, chế độ tối, PWA | Chưa bắt đầu | | |

## Quyết định đã chốt
21/11/2026 (trả lời mục 4 của `docs/DE-XUAT-GD0.md`):
- Phương án triển khai: **B. GitHub Pages + Apps Script làm cầu nối**.
- Kiểm thử: máy admin-pc có Node, qa-tester dùng Playwright.
- Tài khoản: **Gmail cá nhân**. Claude được tạo sẵn Google Sheet (5 sheet, đủ header) qua kết nối Google Sheets.
- Task lặp: **có sinh bù** những ngày không mở web; **mỗi lần sinh tính là 1 task** vào % mục tiêu.
- Top 3 hôm qua chưa xong: **giữ lại** sang Top 3 hôm nay.
- Sinh bù task lặp: tính từ ngày tạo task lặp, tối đa 30 ngày gần nhất.
- Người dùng đã có tài khoản GitHub.
- Cấu trúc thư mục: đã duyệt, ghi trong `CLAUDE.md`.
- Xóa mục tiêu: **hỏi mỗi lần** (chuyển task thành "Việc lặt vặt" hay xóa theo).

## Lỗi mức Thấp còn tồn
- (chưa có)

## Đề xuất thêm (chờ duyệt)
- (chưa có)

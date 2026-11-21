# Tiến độ dự án

> Claude Code cập nhật file này sau mỗi giai đoạn.
>
> 21/11/2026: chuyển dự án từ máy công ty (desktop-25ovadp) sang máy cá nhân (admin-pc). Đã sửa: thêm `model: sonnet` cho 2 agent; AGENTS.md dùng đúng `.codex/agents/` và không đụng vào `cai-dat-agents/`.

| Giai đoạn | Trạng thái | Ngày xong | Ghi chú |
|---|---|---|---|
| 0. Đề xuất triển khai | Xong | 21/11/2026 | Xem `docs/DE-XUAT-GD0.md`. 21/11/2026 trên admin-pc: đã chuyển 2 agent vào `.claude/agents/` (có `model: sonnet`), đã xóa `cai-dat-agents/`. Máy có Node v26.13.0, npm 11.20.0 |
| 1. Mục tiêu và task cơ bản | Chờ triển khai và duyệt | | Xem mục "Giai đoạn 1" bên dưới |
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

## Giai đoạn 1: đã làm
- Google Sheet **Quản lý mục tiêu - dữ liệu** (tài khoản nbnngoc2109@gmail.com), 5 sheet đủ cột theo mục 6.1, thêm `created_at`, `updated_at`. Cột dạng chữ để ngày giữ `yyyy-mm-dd`; `target`, `actual` dạng số. Múi giờ Asia/Ho_Chi_Minh.
- `apps-script/Code.gs`: Web App nhận POST có mã bí mật, thao tác `ping`, `loadAll`, `batch` (thêm/sửa/xóa theo id), có khóa ghi đồng thời.
- Web trong `src/`: tab Hôm nay (Top 3, trễ hạn, việc hôm nay, sắp đến hạn ngày mai, thêm nhanh bằng Enter), tab Mục tiêu (lọc theo nhóm, thẻ có thanh %, trang chi tiết có danh sách task), form thêm/sửa/xóa task và mục tiêu, tiến độ theo task.
- Lớp dữ liệu tách 2 bản: `api-sheet.js` (thật) và `api-mock.js` (localStorage, dữ liệu mẫu). Cập nhật lạc quan, hàng đợi lưu nền, lưu lỗi thì báo và có nút Thử lại.
- Quyết định đã áp dụng: Top 3 chưa xong được giữ sang hôm nay; xóa mục tiêu thì hỏi giữ task (thành Việc lặt vặt) hay xóa theo.
- Bản mock hỗ trợ `?today=yyyy-mm-dd` (giả lập ngày) và `?fail=1` (giả lập lưu lỗi) để kiểm thử.
- Hướng dẫn triển khai: `docs/HUONG-DAN-TRIEN-KHAI.md`. GitHub Pages chạy thư mục `src/` qua `.github/workflows/pages.yml`.
- Làm sớm vì tab Hôm nay cần: nhãn "Trễ hạn" và "Sắp đến hạn". Phần cảnh báo tiến độ chậm để Giai đoạn 2.
- Chưa làm (đúng lộ trình): tiến độ theo chỉ số, lọc theo kỳ, task lặp, tab Task, thói quen, tổng kết, chế độ tối, PWA.

### Kết quả kiểm tra Giai đoạn 1 (21/11/2026)
- spec-reviewer: 14/15. Thiếu: chưa chạy thật với Google Sheet vì chưa triển khai (chờ người dùng làm theo HUONG-DAN-TRIEN-KHAI.md).
- qa-tester: ĐẠT, khoảng 91 kiểm tra trên bản mock, 0 lỗi console. Lượt xác nhận sau sửa: ĐẠT 91/91.
- Đã sửa: số trong "Top 3" dùng font mono; nút sao 44px; dấu tick stroke 1.8; task hạn ngày mai tick xong vẫn hiện; sai mã bí mật lúc đang lưu thì mở lại hộp nhập mã.
- Lưu ý khi chạy agent: phiên tạo ra `.claude/agents/` không nạp được 2 agent, nên đã chạy bằng agent chung theo đúng nội dung 2 file. Phiên sau sẽ gọi thẳng được.

## Lỗi mức Thấp còn tồn
- Số trong hộp hỏi xóa mục tiêu ("có 4 task") và trong nhãn kỳ ở ô chọn (`<option>`) chưa dùng font mono. Ô chọn không cho tạo kiểu riêng cho số.
- `<meta name="theme-color">` viết thẳng mã màu (thẻ meta không dùng được biến CSS). Sẽ xử lý khi làm chế độ tối ở Giai đoạn 4.
- Ô chọn ngày hiện theo ngôn ngữ của trình duyệt (máy tiếng Anh hiện mm/dd/yyyy). Dữ liệu lưu vẫn là yyyy-mm-dd.
- Nếu có hơn 3 task Top 3 cũ chưa xong (do nhiều ngày không mở), chỉ 3 task được giữ sang hôm nay.

## Câu hỏi chờ người dùng
- Task chưa xong mà không có hạn chót, hoặc hạn từ ngày kia trở đi, hiện chưa thấy ở tab Hôm nay (chỉ thấy trong chi tiết mục tiêu). Tab Task (có đủ bộ lọc) có trong SPEC mục 5 nhưng lộ trình mục 8 chưa xếp vào giai đoạn nào. Làm tab Task ở giai đoạn nào?
- Thêm task hiện chỉ có ô thêm nhanh, muốn đổi mục tiêu, hạn hay ưu tiên thì bấm vào task để sửa. Có cần nút "Thêm task đầy đủ" mở form ngay không?

## Đề xuất thêm (chờ duyệt)
- (chưa có)

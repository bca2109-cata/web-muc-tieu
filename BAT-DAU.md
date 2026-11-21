# Bắt đầu dự án

## Trong thư mục này có gì
| File | Dùng để |
|---|---|
| `SPEC.md` | Bản yêu cầu đầy đủ. Muốn đổi yêu cầu thì sửa file này |
| `CLAUDE.md` | Quy tắc Claude Code tự đọc mỗi lần mở dự án |
| `cai-dat-agents/qa-tester.md` | Agent kiểm thử, chạy thử web và báo lỗi |
| `cai-dat-agents/spec-reviewer.md` | Agent soát code so với yêu cầu |
| `docs/TIEN-DO.md` | Theo dõi giai đoạn nào đã xong, còn lỗi gì |

Lần đầu mở dự án, Claude Code sẽ tự chuyển 2 file agent vào `.claude/agents/`, đúng chỗ mà Claude Code đọc agent. Thư mục `.claude` bắt đầu bằng dấu chấm nên có thể bị ẩn trong File Explorer. Muốn thấy thì vào **View → Show → Hidden items**.

## Các bước
1. Mở Claude Code tại thư mục này. Có thể dùng tab Code trong app Claude desktop, rồi chọn thư mục `web-muc-tieu`.
2. Gửi câu sau:

   > Đọc CLAUDE.md, SPEC.md, docs/TIEN-DO.md và docs/DE-XUAT-GD0.md. Làm phần "Việc đầu tiên" trong CLAUDE.md. Sau đó kiểm tra máy này đã có Node.js chưa, rồi hỏi tôi lần lượt các câu còn mở ở mục 4 của DE-XUAT-GD0.md. Chưa viết code cho đến khi tôi duyệt Giai đoạn 0.

   Giai đoạn 0 đã có bản đề xuất, viết trên máy công ty. Câu lệnh này giúp Claude Code làm tiếp từ đó, không làm lại từ đầu.

3. Trả lời các câu hỏi của Claude Code, rồi duyệt phương án triển khai.
4. Hết mỗi giai đoạn: đọc báo cáo, tự mở web dùng thử, rồi trả lời "Duyệt, làm giai đoạn tiếp" hoặc nêu chỗ cần sửa.

## Mẹo
- Mỗi lần chỉ yêu cầu một thay đổi.
- Muốn đổi yêu cầu lớn thì sửa `SPEC.md` trước, rồi bảo Claude Code đọc lại.
- Muốn tự gọi kiểm thử thì gõ: "Dùng agent qa-tester kiểm tra lại màn Hôm nay".

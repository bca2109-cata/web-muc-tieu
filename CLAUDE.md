# CLAUDE.md: hướng dẫn cho Claude Code

Dự án: web quản lý mục tiêu và tác vụ cá nhân. Một người dùng, giao diện tiếng Việt, dữ liệu lưu trong Google Sheets.

## Việc đầu tiên (chỉ làm một lần)
Nếu thư mục `cai-dat-agents/` còn tồn tại:
1. Chuyển 2 file `qa-tester.md` và `spec-reviewer.md` từ đó vào `.claude/agents/`. Nếu ở đó đã có file cùng tên thì ghi đè.
2. Kiểm tra cả 2 file trong `.claude/agents/` có dòng `model: sonnet` ở phần đầu. Chưa có thì thêm vào ngay dưới dòng `tools:`.
3. Xóa thư mục `cai-dat-agents/`. Chỉ xóa sau khi bước 1 và 2 đã xong.
4. Cập nhật ghi chú Giai đoạn 0 trong `docs/TIEN-DO.md`, rồi báo cho tôi biết đã xong.

## Đọc trước khi làm
1. `SPEC.md`: yêu cầu đầy đủ. Đây là nguồn chuẩn duy nhất.
2. `docs/TIEN-DO.md`: đang ở giai đoạn nào, đã xong gì, còn lỗi gì.

## Vai trò
- **Bạn (phiên chính) là agent điều phối và cũng là người xây.** Làm tuần tự theo lộ trình ở mục 8 của SPEC.
- Mỗi giai đoạn chạy 2 agent con trong `.claude/agents/` theo đúng mục 10 của SPEC:
  - `spec-reviewer`: soát code so với yêu cầu.
  - `qa-tester`: kiểm thử chạy thật.
- **Không chia nhiều agent cùng viết code song song**, vì các phần đều dùng chung cấu trúc dữ liệu.

## Quy tắc
- Trả lời tôi bằng tiếng Việt, ngắn gọn. Tôi không phải lập trình viên, nên mọi hướng dẫn thao tác phải ghi rõ bấm vào đâu.
- Chưa rõ thì hỏi, không tự đoán. Không thêm tính năng ngoài SPEC. Ý tưởng mới thì ghi vào mục "Đề xuất thêm" trong `docs/TIEN-DO.md`.
- Hết mỗi giai đoạn phải **dừng lại chờ tôi duyệt** rồi mới làm tiếp.
- Máy công ty không cài được phần mềm. Mọi thứ tôi cần dùng phải mở được bằng trình duyệt.
- Không đổi tên cột trong Google Sheet sau giai đoạn 1 nếu chưa hỏi tôi.
- Mỗi giai đoạn commit riêng, message bằng tiếng Việt, ví dụ `Giai đoạn 1: CRUD mục tiêu và task`.
- Cập nhật `docs/TIEN-DO.md` sau mỗi giai đoạn.

## Giao diện
Dùng đúng bộ màu, font và quy tắc ở mục 7 của SPEC. Không dùng emoji. Mọi con số hiển thị bằng font mono.

## Cấu trúc thư mục
Đã duyệt ở Giai đoạn 0 (21/11/2026). Phương án B: GitHub Pages + Apps Script làm cầu nối.

```
src/                    phần web, GitHub Pages phục vụ thẳng thư mục này
  index.html
  manifest.json, sw.js  PWA
  css/style.css
  js/                   app, api (chọn bản thật/mock), api-sheet, api-mock, mock-data, logic, các màn hình
apps-script/Code.gs     cầu nối đọc ghi Google Sheet
docs/                   TIEN-DO.md, HUONG-DAN-TRIEN-KHAI.md
```

- Bản mock mở bằng bấm đúp `src/index.html`: dùng script thường, không dùng ES module.
- Biểu đồ tự vẽ SVG.

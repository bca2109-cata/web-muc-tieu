# CLAUDE.md: hướng dẫn cho Claude Code

Dự án: web quản lý mục tiêu và tác vụ cá nhân. Một người dùng, giao diện tiếng Việt, dữ liệu lưu trong Google Sheets.

## ƯU TIÊN: đang làm V2 (từ 25/11/2026)
- Mọi việc mới là **V2**, nằm trong `src/v2/`. Web cũ (`src/` ngoài `v2/`) **giữ nguyên, không sửa**, trừ khi người dùng bảo.
- Phiên V2 **chỉ đọc** các file `docs/v2/` mà câu lệnh mở phiên chỉ định, thường là `01-HOP-DONG-CHUNG.md`, `02-THIET-KE.md` và một file `phan-N-*.md`. **Không đọc** `SPEC.md`, `docs/BAN-GIAO.md`, `docs/TIEN-DO.md` hay các phần bên dưới của file này. Các phần đó thuộc web cũ.
- Giao diện V2: dùng skill dự án `life-planner-thiet-ke`. Kiểm thử V2: dùng agent `v2-kiem-thu`, gọi một lần khi xong phần. **Không** dùng `qa-tester` và `spec-reviewer` cho V2.
- Hướng dẫn cho người dùng: `docs/v2/00-BAT-DAU-V2.md`.
- **Người dùng chỉ quyết định, Claude làm mọi việc kỹ thuật.**
  - Không giao cho người dùng việc kỹ thuật nào: không bảo họ chạy lệnh, sửa file, merge PR hay dán code.
  - Mỗi khi cần người dùng, chỉ hỏi **câu quyết định** có sẵn lựa chọn (Duyệt / Sửa: … / Chọn A hay B), kèm link xem trước.
  - Người dùng nói "Duyệt" thì Claude **tự merge PR** vào `main` và báo kết quả.
  - Việc cần tài khoản Google của người dùng (tạo Sheet, triển khai Apps Script) thì **không hướng dẫn người dùng tự làm**. Ghi các bước vào `docs/v2/TRIEN-KHAI-SHEET.md` để Claude có quyền điều khiển trình duyệt của người dùng thực hiện. Người dùng chỉ bấm "Cho phép" trên màn hình cấp quyền của Google.

---
## (Web cũ) Các mục dưới đây chỉ áp dụng khi sửa web cũ

## Việc đầu tiên (chỉ làm một lần)
Nếu thư mục `cai-dat-agents/` còn tồn tại:
1. Chuyển 2 file `qa-tester.md` và `spec-reviewer.md` từ đó vào `.claude/agents/`. Nếu ở đó đã có file cùng tên thì ghi đè.
2. Kiểm tra cả 2 file trong `.claude/agents/` có dòng `model: sonnet` ở phần đầu. Chưa có thì thêm vào ngay dưới dòng `tools:`.
3. Xóa thư mục `cai-dat-agents/`. Chỉ xóa sau khi bước 1 và 2 đã xong.
4. Cập nhật ghi chú Giai đoạn 0 trong `docs/TIEN-DO.md`, rồi báo cho tôi biết đã xong.

## Đọc trước khi làm
0. `docs/BAN-GIAO.md`: tóm tắt trạng thái hiện tại để bắt đầu phiên mới nhanh. Đọc trước, các file dưới chỉ mở phần cần.
1. `SPEC.md`: yêu cầu đầy đủ. Đây là nguồn chuẩn duy nhất.
2. `docs/TIEN-DO.md`: đang ở giai đoạn nào, đã xong gì, còn lỗi gì.

## Vai trò
- **Bạn (phiên chính) là agent điều phối và cũng là người xây.** Làm tuần tự theo lộ trình ở mục 8 của SPEC.
- Mỗi giai đoạn chạy 2 agent con trong `.claude/agents/` theo đúng mục 10 của SPEC:
  - `spec-reviewer`: soát code so với yêu cầu.
  - `qa-tester`: kiểm thử chạy thật.
- 2 agent kiểm tra chỉ đọc, nên **luôn gọi cả hai cùng lúc** (cùng một lượt) để chạy song song.
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
Dùng đúng bộ màu, font và quy tắc ở mục 7 của SPEC và `DESIGN.md`. Không dùng emoji. Mọi con số dùng Nunito đậm, chữ số thẳng hàng (`tabular-nums`).

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

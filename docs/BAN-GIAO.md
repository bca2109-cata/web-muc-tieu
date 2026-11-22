# Bàn giao phiên làm việc (cập nhật 22/11/2026, chiều)

Đọc file này trước, rồi chỉ mở thêm file nào thật sự cần. Chi tiết yêu cầu ở `SPEC.md`, quy tắc giao diện ở `DESIGN.md`, lịch sử ở `docs/TIEN-DO.md`.

## 1. Đang ở đâu
- Giai đoạn 0 và 1: xong (GĐ1 duyệt 22/11/2026). Giai đoạn 2: xong (duyệt 22/11/2026). **Giai đoạn 3** (thói quen, streak, tab Thói quen): xong, duyệt 22/11/2026.

**Giai đoạn 4** (tổng kết, biểu đồ, review, xuất/nhập JSON, chế độ tối, PWA): đã làm, đã kiểm tra, chờ người dùng duyệt. Có đổi `Code.gs` (thêm `replaceAll`), người dùng cần cập nhật Apps Script.
- Web: https://bca2109-cata.github.io/web-muc-tieu/ (GitHub Pages tự chạy khi đẩy `main`, phục vụ thư mục `src/`).
- Sheet thật có dữ liệu thử, người dùng muốn **giữ lại để kiểm thử** (mục 5).
- Mặt trời mặt cười: người dùng chốt **giữ**.

## 2. Việc chờ người dùng trả lời
- (chưa có)

## 3. Kiến trúc (chỉ điều không tự thấy ngay trong code)
- Phương án B: web tĩnh trên GitHub Pages, gọi Web App Apps Script (`apps-script/Code.gs`, tên "Muc tieu API", bản "Ban 1"). Gọi bằng POST `text/plain`, mã bí mật nằm trong body. Thao tác: `ping`, `loadAll`, `batch`.
- Code.gs ghi theo tên cột ở dòng 1, nên thêm cột vào cuối sheet thì **không cần triển khai lại** Apps Script. `caiDat` tự thêm cột còn thiếu.
- **Mã bí mật: không bao giờ hỏi, gõ, đọc hay nhắc lại.** Người dùng tự dán vào ô Cài đặt trên web (lưu localStorage).
- JS thường, không ES module, mọi thứ nằm trong `window.App`. Thứ tự nạp ở `src/index.html`: config, logic, mock-data, api-mock, api-sheet, api, flowers, ui, store, components, views/today, views/goals, forms, app.
- **Mỗi lần sửa CSS/JS rồi đẩy lên: đổi số `?v=...` ở các thẻ link/script trong `src/index.html`** (đang dùng mã commit gần nhất), vì GitHub Pages cho trình duyệt giữ file cũ khoảng 10 phút.
- Bản mock: mở bằng `file:` hoặc thêm `?mock=1`. Tham số kiểm thử: `?today=yyyy-mm-dd`, `?fail=1` (giả lập lưu lỗi).
- `store.js`: cập nhật lạc quan, hàng đợi lưu nền, có bộ nhớ đệm để mở lại hiện ngay.
- localStorage của người dùng: `lp_bg` (`flowers` mặc định hoặc `plain`), `lp_today_view` (`matrix` mặc định hoặc `list` = dạng Bảng), `lp_top3_auto` (ngày đã tự điền Top 3).
- Định tuyến: `#/hom-nay`, `#/muc-tieu`, `#/muc-tieu/<id>`, `#/sap-co/(task|thoi-quen|tong-ket)`.

## 4. Quy tắc nghiệp vụ đã chốt (ngoài SPEC hoặc dễ quên)
- Ma trận 4 ô: Khẩn cấp, Lên lịch, Xử lý sau, Xem xét (người dùng chốt 22/11). Quan trọng là ưu tiên Cao; khẩn cấp là `due_date` đến ngày mai (tính cả trễ hạn). Ma trận gồm mọi việc chưa xong, cộng việc xong hôm nay; việc đã ở Top 3 thì không hiện lại. `logic.quadrant()`.
- Top 3 hôm trước chưa xong thì giữ sang hôm nay, tối đa 3. Sau đó, lần đầu mở web mỗi ngày, chỗ trống tự điền việc trễ hạn rồi việc ô Khẩn cấp (`logic.top3Suggest`).
- Tab Hôm nay: biểu đồ tổng quan và dạng Bảng tính trên `logic.workList` (chưa xong có hạn <= ngày mai hoặc Top 3, cộng việc xong hôm nay). Khối Sắp đến hạn: hạn từ ngày kia đến 7 ngày tới. Xóa mục tiêu thì hỏi mỗi lần: chuyển task thành "Việc lặt vặt" hay xóa theo.
- Task lặp (GĐ2): sinh bù những ngày không mở web, tính từ ngày tạo, tối đa 30 ngày gần nhất; mỗi lần sinh tính 1 task vào %.
- Mục tiêu: `importance` 1 đến 3 (mặc định 2, hiện bằng tim). Nhãn hạn: còn ≤3 ngày là `hot`, ≤10 ngày là `warm`, còn lại `calm`. `logic.goalDeadline()`.
- Icon task: `logic.guessIcon()` so cả từ, giữ dấu tiếng Việt, khớp từ dài nhất thắng; tên gõ không dấu thì so với từ khóa đã bỏ dấu. Người dùng chọn icon tay trong form thì không tự đổi nữa.
- Hoa bung khi tick xong (`app.celebrate`): 32 hoa; mục tiêu vừa lên 100% thì 56 hoa ở giữa màn hình. Tôn trọng `prefers-reduced-motion`.

## 5. Google Sheet
- ID `1_zdutUcr7DnRLUm5SFWd959af_h2zZTg700jxPmEK9c`, tên "Quản lý mục tiêu - dữ liệu". Claude đọc ghi qua kết nối Google Sheets.
- Cột đều để dạng chữ (ngày giữ `yyyy-mm-dd`), `target`/`actual` dạng số. Khi ghi bằng kết nối, ghi kiểu RAW để ngày không bị đổi thành số. Đọc lại ô để kiểm.
- Cột mới nhất: Goals P = `importance`, Tasks O = `icon`. Không đổi tên cột nếu chưa hỏi người dùng.
- Dữ liệu thử: Goals dòng 2 đến 4 (3 mục tiêu), Tasks dòng 3 đến 29 (27 task), tất cả có `note` = "Dữ liệu thử". Tasks dòng 2 ("hhh") là của người dùng, **không xóa**.

## 6. Kiểm thử
- Mỗi giai đoạn gọi `spec-reviewer` và `qa-tester` **cùng một lượt** (song song), không sửa code trong lúc chờ. Sửa lỗi Cao và Trung bình, ghi lỗi Thấp vào TIEN-DO, chạy lại qa một lần rồi báo.
- Playwright có sẵn trong `node_modules`. Chạy: `NODE_PATH=./node_modules node tests-qa/qa-lifeplanner.js` (Bash). Trong Bash, đường dẫn `/tmp` không dùng được với node; dùng `cygpath` hoặc thư mục scratchpad.
- Kiểm ở 390px và 1280px. Chế độ tối mới làm ở GĐ4 (giá trị tạm có trong `DESIGN.md`).

## 7. Lỗi mức Thấp còn tồn
Xem 2 mục "Lỗi mức Thấp" trong `docs/TIEN-DO.md`. Tóm tắt: số trong `<option>` và hộp hỏi xóa chưa đậm thẳng hàng; `theme-color` viết cứng; ô chọn ngày theo ngôn ngữ trình duyệt; màu đỏ còn dùng cho nút Xóa và lỗi form; bo góc vài khối lệch 22px; hình nền dùng 11 hoa.

## 8. Cách làm việc với người dùng
- Trả lời tiếng Việt, ngắn. Người dùng không phải lập trình viên: hướng dẫn phải ghi rõ bấm vào đâu. Mọi thứ phải dùng được trên trình duyệt (máy công ty không cài được phần mềm).
- Không emoji. Số dùng Nunito đậm, `tabular-nums` (lớp `.num`).
- Không thêm tính năng ngoài SPEC; ý tưởng mới ghi vào "Đề xuất thêm" trong TIEN-DO.
- Commit riêng mỗi giai đoạn, message tiếng Việt, ví dụ `Giai đoạn 2: ...`.
- Người dùng thích xem bản xem trước (file HTML trong `docs/de-xuat-giao-dien/`) trước khi đổi giao diện lớn.

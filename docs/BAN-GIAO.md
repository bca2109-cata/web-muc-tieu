# Bàn giao phiên làm việc (cập nhật 22/11/2026, Giai đoạn 6)

Đọc file này trước, rồi chỉ mở thêm file nào thật sự cần. Chi tiết yêu cầu ở `SPEC.md`, quy tắc giao diện ở `DESIGN.md`, lịch sử ở `docs/TIEN-DO.md`.

## 0. Việc đang dở
Không còn. GĐ6 đã xong (22/11/2026): commit, Apps Script Phiên bản 4, Sheet thật đã chuyển. Một điều chưa kiểm: lưu thật từ web (cần mã bí mật của người dùng) và việc tự tạo sheet Interruptions, Settings ở lần lưu đầu. Nếu lỗi, chạy `caiDat` thủ công? KHÔNG: hỏi người dùng (hàm in mã bí mật). Chờ người dùng đưa góp ý GĐ7 nếu có.

## 1. Đang ở đâu
- Giai đoạn 0 và 1: xong (GĐ1 duyệt 22/11/2026). Giai đoạn 2: xong (duyệt 22/11/2026). **Giai đoạn 3** (thói quen, streak, tab Thói quen): xong, duyệt 22/11/2026.

**Giai đoạn 4** (tổng kết, biểu đồ, review, xuất/nhập JSON, chế độ tối, PWA): xong, kể cả xử lý giới hạn.

**Giai đoạn 5** (góp ý sau dùng thử, SPEC mục 4.5: Agenda theo ngày, biểu đồ mới, ma trận 2 trục, lời nhắc review, lọc Task, xem Năm, Tổng kết 4 kỳ, hoa rơi): đã duyệt 22/11/2026. `Code.gs` đổi (thêm `ensureColumns_`), Claude đã triển khai Phiên bản 3 qua Chrome (22/11/2026), link giữ nguyên. Cột mới tự thêm vào Sheet ở lần lưu đầu tiên.
**Giai đoạn 6** (Lập kế hoạch ngày, SPEC mục 4.6: kho việc, quỹ giờ, kế hoạch hôm nay, thời lượng, chia nhỏ, đột xuất, ma trận theo Quan trọng do người dùng đánh dấu): đã xong (duyệt 22/11/2026). Code.gs đổi (cột mới cho Tasks, sheet Interruptions và Settings).
- Web: https://bca2109-cata.github.io/web-muc-tieu/ (GitHub Pages tự chạy khi đẩy `main`, phục vụ thư mục `src/`).
- Sheet thật có dữ liệu thử, người dùng muốn **giữ lại để kiểm thử** (mục 5).
- Mặt trời mặt cười: người dùng chốt **giữ**.

## 2. Việc chờ người dùng trả lời
- (chưa có)

## 3. Kiến trúc (chỉ điều không tự thấy ngay trong code)
- Phương án B: web tĩnh trên GitHub Pages, gọi Web App Apps Script (`apps-script/Code.gs`, tên "Muc tieu API", bản "Ban 1"). Gọi bằng POST `text/plain`, mã bí mật nằm trong body. Thao tác: `ping`, `loadAll`, `batch`, `replaceAll`. Trước `batch`/`replaceAll` tự thêm cột còn thiếu (`ensureColumns_`). Cập nhật Code.gs: Claude làm qua Chrome (dán bằng monaco, Ctrl+S, Triển khai, Quản lý các bản triển khai, bút chì, Phiên bản mới).
- Code.gs ghi theo tên cột ở dòng 1, nên thêm cột vào cuối sheet thì **không cần triển khai lại** Apps Script. `caiDat` tự thêm cột còn thiếu.
- **Mã bí mật: không bao giờ hỏi, gõ, đọc hay nhắc lại.** Người dùng tự dán vào ô Cài đặt trên web (lưu localStorage).
- JS thường, không ES module, mọi thứ nằm trong `window.App`. Thứ tự nạp: xem `src/index.html` (config, logic, plan, mock-data, api-*, flowers, ui, store, components, views/*, backup, forms, app).
- **Mỗi lần sửa CSS/JS rồi đẩy lên: đổi số `?v=...` ở các thẻ link/script trong `src/index.html`** (đang dùng mã commit gần nhất), vì GitHub Pages cho trình duyệt giữ file cũ khoảng 10 phút.
- Bản mock: mở bằng `file:` hoặc thêm `?mock=1`. Tham số kiểm thử: `?today=yyyy-mm-dd`, `?fail=1` (giả lập lưu lỗi), `?now=HH:mm` (giả lập giờ, GĐ6).
- `store.js`: cập nhật lạc quan, hàng đợi lưu nền, có bộ nhớ đệm để mở lại hiện ngay.
- localStorage của người dùng: `lp_bg`, `lp_today_view`, `lp_top3_auto`, `lp_habit_view`, `lp_review_type`, `lp_review_chart`, `lp_theme`; GĐ6: `lp_plan_order` ({day, ids}), `lp_plan_done`, `lp_plan_seen` (ngày), `lp_inbox_review` (tuần ISO).
- Định tuyến: `#/agenda` (cũ `#/hom-nay` vẫn vào Agenda), `#/task`, `#/muc-tieu`, `#/muc-tieu/<id>`, `#/thoi-quen`, `#/tong-ket`.

## 4. Quy tắc nghiệp vụ đã chốt (ngoài SPEC hoặc dễ quên)
- Ma trận 4 ô (GĐ6): Quan trọng = `is_important` TRUE (trống thì theo ưu tiên Cao); gấp = `due_date` đến 2 ngày sau ngày đang xem (tính cả quá hạn). `logic.quadrant(t, day)`.
- Agenda ngày D (GĐ6): `logic.dayList` = Ngày sẽ làm (`do_date`, lần lặp cũ thiếu thì theo hạn) là D + xong trong ngày D, bỏ việc cha đã chia nhỏ. Việc quá hạn chót: `logic.overdueList`, thẻ riêng. Giờ hạn không bắt buộc.
- Kế hoạch ngày (GĐ6, `src/js/plan.js`): quỹ = (17:30 - 08:00 - nghỉ trưa 90 - việc cố định 30) x 70% = 5h15; buổi tối 1h30; cuối tuần 1 quỹ 4h (`weekend_min`). Việc nhóm Công việc vào quỹ Giờ làm, nhóm khác Buổi tối; việc không gắn mục tiêu theo cột `bucket` (work / evening, mặc định evening). Lần lặp hôm nay trừ quỹ trước, không bỏ và không về kho được. Sang ngày mới hoặc sau 17:30 (việc Công việc), việc chưa xong về kho, `defer_count` +1 (`plan.rolloverRows`). Việc từ 120 phút phải chia nhỏ mới xếp vào ngày. Gợi ý: `plan.suggest` (6 bậc, có lý do).
- Lời nhắc review: `views.reminderItems`. `hide_from` = ngày bắt đầu ẩn.
- 3 việc chính (GĐ6): chốt kế hoạch thì 3 việc đầu thành 3 việc chính. Bỏ cách giữ / tự điền Top 3 cũ.
- Khối Sắp đến hạn: việc chưa xong có hạn từ ngày đang xem đến 2 ngày sau. Xóa mục tiêu thì hỏi mỗi lần: chuyển task thành "Việc lặt vặt" hay xóa theo.
- Task lặp (GĐ2): sinh bù những ngày không mở web, tính từ ngày tạo, tối đa 30 ngày gần nhất; mỗi lần sinh tính 1 task vào %.
- Mục tiêu: `importance` 1 đến 3 (mặc định 2, hiện bằng tim). Nhãn hạn: còn ≤3 ngày là `hot`, ≤10 ngày là `warm`, còn lại `calm`. `logic.goalDeadline()`.
- Icon task: `logic.guessIcon()` so cả từ, giữ dấu tiếng Việt, khớp từ dài nhất thắng; tên gõ không dấu thì so với từ khóa đã bỏ dấu. Người dùng chọn icon tay trong form thì không tự đổi nữa.
- Hoa bung khi tick xong (`app.celebrate`): 32 hoa; mục tiêu vừa lên 100% thì 56 hoa ở giữa màn hình. Tôn trọng `prefers-reduced-motion`.

## 5. Google Sheet
- ID `1_zdutUcr7DnRLUm5SFWd959af_h2zZTg700jxPmEK9c`, tên "Quản lý mục tiêu - dữ liệu". Claude đọc ghi qua kết nối Google Sheets.
- Cột đều để dạng chữ (ngày giữ `yyyy-mm-dd`), `target`/`actual` dạng số. Khi ghi bằng kết nối, ghi kiểu RAW để ngày không bị đổi thành số. Đọc lại ô để kiểm.
- Cột mới nhất: Goals P = `importance`, Tasks O = `icon`, Tasks P = `due_time` (GĐ5), Tasks Q..W = `do_date`, `duration_min`, `is_important`, `parent_id`, `first_step`, `defer_count`, `inbox_since`, X = `bucket` (sau nghiệm thu GĐ6); sheet `Interruptions` (id, date, title, duration_min, created_at) và `Settings` (1 dòng id = main) (GĐ6), Reviews I = `rating`, J = `hide_from` (GĐ5, Apps Script tự thêm khi ghi lần đầu). Không đổi tên cột nếu chưa hỏi người dùng.
- Dữ liệu thử: Goals dòng 2 đến 4 (3 mục tiêu), Tasks dòng 3 đến 29 (27 task), tất cả có `note` = "Dữ liệu thử". Tasks dòng 2 ("hhh") người dùng đã tự xóa (22/11/2026), dòng 2 đang trống.

## 6. Kiểm thử
- Mỗi giai đoạn gọi `spec-reviewer` và `qa-tester` **cùng một lượt** (song song), không sửa code trong lúc chờ. Sửa lỗi Cao và Trung bình, ghi lỗi Thấp vào TIEN-DO, chạy lại qa một lần rồi báo.
- Playwright có sẵn trong `node_modules`. Chạy: `NODE_PATH=./node_modules node tests-qa/qa-lifeplanner.js` (Bash). Trong Bash, đường dẫn `/tmp` không dùng được với node; dùng `cygpath` hoặc thư mục scratchpad.
- Kiểm ở 390px và 1280px, sáng và tối. Bài thử mất hơn 2 phút: chạy nền hoặc đặt timeout 300000.

## 7. Lỗi mức Thấp còn tồn
Xem 2 mục "Lỗi mức Thấp" trong `docs/TIEN-DO.md`. Tóm tắt: số trong `<option>` và hộp hỏi xóa chưa đậm thẳng hàng; `theme-color` viết cứng; ô chọn ngày theo ngôn ngữ trình duyệt; màu đỏ còn dùng cho nút Xóa và lỗi form; bo góc vài khối lệch 22px; hình nền dùng 11 loại hoa.

## 8. Cách làm việc với người dùng
- Trả lời tiếng Việt, ngắn. Người dùng không phải lập trình viên: hướng dẫn phải ghi rõ bấm vào đâu. Mọi thứ phải dùng được trên trình duyệt (máy công ty không cài được phần mềm).
- Không emoji. Số dùng Nunito đậm, `tabular-nums` (lớp `.num`).
- Không thêm tính năng ngoài SPEC; ý tưởng mới ghi vào "Đề xuất thêm" trong TIEN-DO.
- Commit riêng mỗi giai đoạn, message tiếng Việt, ví dụ `Giai đoạn 2: ...`.
- Người dùng thích xem bản xem trước (file HTML trong `docs/de-xuat-giao-dien/`) trước khi đổi giao diện lớn.

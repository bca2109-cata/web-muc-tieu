# Bàn giao phiên làm việc (cập nhật 22/11/2026, Giai đoạn 6)

Đọc file này trước, rồi chỉ mở thêm file nào thật sự cần. Chi tiết yêu cầu ở `SPEC.md`, quy tắc giao diện ở `DESIGN.md`, lịch sử ở `docs/TIEN-DO.md`.

## 0. VIỆC ĐANG DỞ (GĐ6), phiên mới làm tiếp từ đây
Người dùng đã duyệt kế hoạch GĐ6 và cách chuyển dữ liệu. Code GĐ6 đã viết xong, **chưa commit, chưa đẩy, Sheet thật chưa chuyển dữ liệu**. Mọi thay đổi đang nằm trong thư mục làm việc (`git status`).

Đã xong:
- Code GĐ6 (chi tiết ở TIEN-DO mục "Giai đoạn 6: đã làm"). Phiên bản `?v=gd6c`, sw `lp-gd6c`.
- Tài liệu: TIEN-DO, BAN-GIAO, HUONG-DAN-TRIEN-KHAI, DESIGN đã cập nhật.
- Kiểm thử: `tests-qa/flow-gd6.js` 0 FAIL. `tests-qa/qa-lifeplanner.js` 297 PASS, 0 FAIL ở lần chạy của qa-tester. spec-reviewer và qa-tester đã chạy song song, không có lỗi Cao về code.
- Sau kiểm tra đã sửa:
  - Xem lại kho đặt ngày: báo vượt quỹ, chặn ngày đã qua (`forms.js`, hàm `inboxReview`).
  - Việc lặp từ 2 giờ trở lên bị chặn trong form.
  - Chip thêm nhanh và tên việc trong Kế hoạch đủ 44px; ô giờ "Nhắc xem lại kho" rộng hơn (cuối `style.css`).
  - "Đưa về kho" khi đột xuất có nút Hoàn tác.
  - Nhãn quỹ "Còn" đổi thành "Chưa xong"; nhãn đọc màn hình "Top 3" đổi thành "3 việc chính".
  - Chọn lặp rồi bỏ lặp thì xóa hạn chót đã tự điền.
  - Thông báo lỗi lưu (Thử lại) không bị che mất (`ui.js`, `store.js`).
  - Câu vượt quỹ khi thêm việc hôm nay.
  - Bài thử fail=1 chờ 5,6 giây.

CẬP NHẬT (22/11/2026, sau bước 3): đã kiểm thử đạt (297 PASS, 0 FAIL, qa-tester đạt), đã ghi lỗi Thấp vào TIEN-DO, đã commit `33a5c8d` và đẩy `main`. Đã triển khai Apps Script Phiên bản 4 (link giữ nguyên). Đã sao lưu Sheet ("Quản lý mục tiêu - sao lưu trước GĐ6 - 22-11-2026"). Đã ghi cột P..W của Tasks cho dòng 3..29 (đã đọc lại kiểm). **Còn lại**: xóa dòng 22 "Uống đủ 2 lít nước" (hệ thống chặn xóa dòng, chờ người dùng cho phép hoặc tự xóa); Sheet Interruptions và Settings tự tạo ở lần lưu đầu từ web; mở web thật kiểm; báo người dùng, chờ duyệt GĐ6. Các bước 1 đến 5 và bước 6 (phần ghi cột) bên dưới đã xong.

Còn phải làm, theo thứ tự:
1. Chạy lại `node --check` cho mọi file JS và `tests-qa/flow-gd6.js`. Chạy nền `qa-lifeplanner.js` (hơn 3 phút), cần 0 FAIL. Chạy lại qa-tester một lần cho các mục vừa sửa (quy trình mục 6).
2. Ghi lỗi Thấp còn lại vào TIEN-DO, mục GĐ6, phần "Kết quả kiểm tra GĐ6":
   - Đổi thứ tự bằng nút lên/xuống, không kéo thả.
   - Việc cha hiện "x/y việc con", không hiện %.
   - Thanh quỹ ghi "/ quỹ trừ đột xuất".
   - Việc về kho chỉ chạy khi mở hoặc tải lại web.
   - Ô lọc 40px.
   - Hình trang trí có mã màu viết thẳng (có từ trước).
   - "(quỹ 4h )" có khoảng trắng thừa.
3. Commit `Giai đoạn 6: lập kế hoạch ngày (kho, quỹ giờ, kế hoạch hôm nay, chia nhỏ, đột xuất)`, kèm dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push `main`.
4. Cập nhật Apps Script qua Chrome (cách làm ở mục 3), tạo Phiên bản mới. Lấy Code.gs từ `raw.githubusercontent.com/bca2109-cata/web-muc-tieu/<commit>/apps-script/Code.gs`, dán bằng `monaco.editor.getModels()[0].pushEditOperations`, rồi Ctrl+S. Editor: https://script.google.com/home/projects/15J2aWqExBogtct11IXwPsu-a0i4uWZYaL_ewV57k_cieVA_W0i9IPfKt/edit. **Không chạy `caiDat`, `xemMaBiMat`, `doiMaBiMat`** (chúng in mã bí mật ra log).
5. **Sao lưu Sheet trước khi đổi dữ liệu**: dùng Drive `copy_file`, đặt tên "Quản lý mục tiêu - sao lưu trước GĐ6 - 22-11-2026".
6. Chuyển dữ liệu Sheet thật bằng kết nối Google Sheets, ghi kiểu RAW:
   - Tasks hiện có cột A..O, chưa có `due_time`. Thêm tiêu đề vào cuối, theo thứ tự `logic.js` `App.C.COLUMNS.Tasks`: `due_time`, `do_date`, `duration_min`, `is_important`, `parent_id`, `first_step`, `defer_count`, `inbox_since`. Đọc dòng 1 trước để chắc chắn.
   - Giá trị cho dòng 3..29:
     - `is_important` = TRUE cho 8 việc ưu tiên Cao, còn lại FALSE.
     - `duration_min` = 30, `defer_count` = 0.
     - Việc chưa xong: `do_date` trống, `inbox_since` = 2026-11-22.
   - Xóa dòng việc "Uống đủ 2 lít nước" (id c63eb9c5-a87d-4922-a2d5-07fbbcabfef5).
   - Sheet Interruptions và Settings: Code.gs tự tạo ở lần lưu đầu, hoặc tạo tay theo cột trong `App.C.COLUMNS`.
   - Đọc lại để kiểm.
7. Mở web thật để kiểm, rồi báo người dùng bằng tiếng Việt (ngắn, bấm vào đâu). Dừng chờ duyệt GĐ6. Duyệt xong thì đánh dấu GĐ6 "Xong" trong TIEN-DO và xóa mục 0 này.

Ghi chú kỹ thuật:
- Bash heredoc có dấu nháy hay lỗi. Viết script bằng Write vào scratchpad rồi chạy bằng node.
- `'\n'` trong chuỗi patch bị thành xuống dòng thật, từng làm hỏng `app.js`.

## 1. Đang ở đâu
- Giai đoạn 0 và 1: xong (GĐ1 duyệt 22/11/2026). Giai đoạn 2: xong (duyệt 22/11/2026). **Giai đoạn 3** (thói quen, streak, tab Thói quen): xong, duyệt 22/11/2026.

**Giai đoạn 4** (tổng kết, biểu đồ, review, xuất/nhập JSON, chế độ tối, PWA): xong, kể cả xử lý giới hạn.

**Giai đoạn 5** (góp ý sau dùng thử, SPEC mục 4.5: Agenda theo ngày, biểu đồ mới, ma trận 2 trục, lời nhắc review, lọc Task, xem Năm, Tổng kết 4 kỳ, hoa rơi): đã duyệt 22/11/2026. `Code.gs` đổi (thêm `ensureColumns_`), Claude đã triển khai Phiên bản 3 qua Chrome (22/11/2026), link giữ nguyên. Cột mới tự thêm vào Sheet ở lần lưu đầu tiên.
**Giai đoạn 6** (Lập kế hoạch ngày, SPEC mục 4.6: kho việc, quỹ giờ, kế hoạch hôm nay, thời lượng, chia nhỏ, đột xuất, ma trận theo Quan trọng do người dùng đánh dấu): đã làm, chờ người dùng duyệt. Code.gs đổi (cột mới cho Tasks, sheet Interruptions và Settings).
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
- Kế hoạch ngày (GĐ6, `src/js/plan.js`): quỹ = (17:30 - 08:00 - nghỉ trưa 90 - việc cố định 30) x 70% = 5h15; buổi tối 1h30; cuối tuần 1 quỹ 4h (`weekend_min`). Việc nhóm Công việc vào quỹ Giờ làm, còn lại Buổi tối. Sang ngày mới hoặc sau 17:30 (việc Công việc), việc chưa xong về kho, `defer_count` +1 (`plan.rolloverRows`). Việc từ 120 phút phải chia nhỏ mới xếp vào ngày. Gợi ý: `plan.suggest` (6 bậc, có lý do).
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
- Cột mới nhất: Goals P = `importance`, Tasks O = `icon`, Tasks P = `due_time` (GĐ5), Tasks Q..W = `do_date`, `duration_min`, `is_important`, `parent_id`, `first_step`, `defer_count`, `inbox_since` (GĐ6); sheet `Interruptions` (id, date, title, duration_min, created_at) và `Settings` (1 dòng id = main) (GĐ6), Reviews I = `rating`, J = `hide_from` (GĐ5, Apps Script tự thêm khi ghi lần đầu). Không đổi tên cột nếu chưa hỏi người dùng.
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

# SPEC: Web quản lý mục tiêu và tác vụ cá nhân

> Tài liệu giao việc cho Claude Code. Đọc hết trước khi viết code. Làm từng giai đoạn, xong giai đoạn nào thì dừng lại cho tôi kiểm tra rồi mới làm tiếp.

## 1. Bối cảnh và vấn đề

- Tôi đang dùng Notion và Todoist nhưng chưa hài lòng vì 3 lý do:
  1. Quá nhiều tính năng, phải setup lâu, nhìn rối.
  2. Giao diện tiếng Anh, thuật ngữ không quen.
  3. **Làm xong task nhưng không biết mục tiêu đã đi được bao xa.** Đây là vấn đề chính cần giải quyết.
- Mục tiêu của web: **gọn, tiếng Việt 100%, mỗi task đều gắn với một mục tiêu, nhìn vào là thấy ngay tiến độ.**

## 2. Người dùng và cách dùng

- Chỉ có một người dùng là tôi. Không cần phân quyền hay nhiều tài khoản.
- Dùng trên **cả máy tính và điện thoại**, dữ liệu phải đồng bộ giữa hai thiết bị.
- Máy tính ở công ty **không được cài phần mềm** (kể cả Google Drive for Desktop), nên web phải mở được bằng trình duyệt qua một đường link.
- Nhịp dùng trong ngày:
  - **Buổi sáng:** lên kế hoạch ngày, chọn tối đa 3 việc quan trọng nhất, xem việc sắp đến hạn hoặc đã trễ hạn.
  - **Trong ngày:** mở trên điện thoại, đánh dấu xong task bằng **một chạm**.
  - **Cuối tuần, cuối tháng:** xem tổng kết, % mục tiêu, biểu đồ, rồi lên kế hoạch cho kỳ sau.

## 3. Phạm vi mục tiêu

3 nhóm mục tiêu, mỗi nhóm có một màu cố định:

| Nhóm | Ví dụ |
|---|---|
| Công việc | KPI, dự án, báo cáo |
| Học tập / kỹ năng | Khóa học, chứng chỉ, tự học công cụ |
| Sức khỏe / thói quen | Tập luyện, đọc sách, ngủ đủ |

Cấu trúc: **Mục tiêu → Task**. Mỗi mục tiêu có một kỳ: **Năm / Quý / Tháng / Tuần**. Phải lọc và xem được mục tiêu theo từng kỳ, ví dụ "mục tiêu Q1/2027" hay "mục tiêu tuần 48".

## 4. Tính năng

### 4.1 Mục tiêu
- Các trường: tên, nhóm, kỳ (loại kỳ + giá trị kỳ, ví dụ Quý – 2027-Q1), ngày bắt đầu, ngày kết thúc, ghi chú, trạng thái (Đang làm / Hoàn thành / Tạm dừng), **mức quan trọng** (1 đến 3, hiện bằng trái tim).
- Thẻ mục tiêu hiện nhãn "Còn N ngày" đến ngày kết thúc, tô màu theo độ gấp.
- **Cách tính tiến độ, chọn riêng cho từng mục tiêu:**
  - **Theo task:** % = số task đã xong / tổng số task gắn với mục tiêu.
  - **Theo chỉ số:** tự nhập đơn vị (giờ, km, cuốn…), target và giá trị thực tế. % = thực tế / target. Có nút "+ cập nhật" để cộng thêm nhanh, ví dụ +1 giờ.
- Màu tiến độ: ≥ 100% là đạt, 80–99% là gần đạt, < 80% là cần chú ý (dùng biến màu ở mục 7).
- Khi tiến độ theo thời gian vượt xa tiến độ thực tế thì cảnh báo. Ví dụ đã qua 60% thời gian của kỳ mà mục tiêu mới đạt 30%.

### 4.2 Task
- Các trường: tên, mục tiêu liên kết (có thể để trống, coi là "Việc lặt vặt"), hạn chót, mức ưu tiên (Cao / Trung bình / Thấp), trạng thái (Cần làm / Đang làm / Xong), ghi chú ngắn, cờ "Top 3 hôm nay", **icon** (tự đoán theo tên việc, sửa được).
- **Task lặp lại:** hằng ngày, hoặc các thứ cố định trong tuần (ví dụ thứ 2-4-6). Task lặp phải tự sinh ra vào đúng ngày.
  - Cách lưu (chốt GĐ2): việc mẫu có `recurring_rule` ("Hằng ngày" hoặc "Hằng tuần: T2, T4, T6", CN là chủ nhật) và `parent_recurring_id` trống. Mỗi lần lặp là một task riêng, `id` = id việc mẫu + "-" + ngày, `parent_recurring_id` = id việc mẫu. Sinh bù tối đa 30 ngày. Lần bỏ lỡ chỉ tính vào % mục tiêu, không hiện Quá hạn, không tự vào Top 3.
  - Cảnh báo tiến độ chậm (chốt GĐ2): mục tiêu Đang làm, hôm nay trong kỳ, đã qua ít nhất 10% thời gian, và % đạt dưới một nửa % thời gian đã qua.
- Task trễ hạn tô màu cảnh báo. Task chưa xong có hạn từ hôm nay đến hôm nay + 2 ngày thì hiện nhãn "Sắp đến hạn" (dùng chung mốc này ở mọi tab, chốt 22/11/2026).
- **Chỉ nhắc ngay trong web.** Không cần thông báo đẩy, email hay Telegram.

### 4.3 Thói quen (habit)
- Các trường: tên, mục tiêu liên kết (thường thuộc nhóm Sức khỏe), tần suất (hằng ngày hoặc chọn thứ trong tuần).
- Bảng lưới ô tick theo ngày, xem được 7 ngày hoặc cả tháng.
- Đếm **chuỗi ngày liên tiếp** (streak) hiện tại và chuỗi dài nhất.
- Mục tiêu liên kết với thói quen có thể tính % theo số ngày đã tick / số ngày cần làm trong kỳ.
  - Chốt GĐ3 (22/11/2026): `frequency` lưu như luật lặp của task ("Hằng ngày", "Hằng tuần: T2, T4, T6"). Mỗi ô tick là một dòng HabitLogs, `id` = id thói quen + "-" + ngày, `done` TRUE/FALSE. `active` FALSE = tạm dừng. Tick được mọi ngày đã qua, không tick ngày tương lai. Streak chỉ đếm ngày cần làm; hôm nay chưa tick thì chưa mất chuỗi. Theo dõi tính từ ngày tạo (hoặc ngày tick sớm nhất). % mục tiêu theo thói quen (`progress_mode` = habit) = ngày đã tick / ngày cần làm từ đầu kỳ đến hôm nay (hôm nay chỉ tính khi đã tick). Lưới mặc định 7 ngày, chuyển được sang cả tháng, có nút lùi về kỳ trước. Tab Hôm nay có khối "Thói quen hôm nay".

### 4.4 Tổng kết tuần / tháng
- Số task đã xong, % đúng hạn, % trung bình của các mục tiêu trong kỳ.
- Biểu đồ đường: số task xong theo ngày hoặc theo tuần.
- Biểu đồ cột: % tiến độ từng mục tiêu, nhóm theo màu.
- Ô ghi chú review 3 câu: "Làm tốt gì?", "Chưa tốt gì?", "Kỳ sau ưu tiên gì?". Lưu lại theo kỳ để xem lại được.

## 5. Màn hình

| Tab | Nội dung chính |
|---|---|
| **Hôm nay** (mặc định) | **Biểu đồ tổng quan**: số việc đã xong trên tổng và 3 thanh tỷ trọng của danh sách việc hôm nay (tình trạng Xong / Đang làm / Cần làm; mức ưu tiên Cao / Trung bình / Thấp; độ khẩn cấp của việc chưa xong: Quá hạn / Hôm nay / Ngày mai / Chưa có hạn). **Top 3**: mỗi ngày một lần, chỗ trống tự điền việc trễ hạn rồi việc ô Khẩn cấp, người dùng vẫn đổi được bằng ngôi sao. **Sắp đến hạn**: việc chưa xong có hạn từ hôm nay đến hôm nay + 2 ngày. **Việc hôm nay** chuyển giữa dạng **Bảng** (việc chưa xong có hạn đến ngày mai gồm trễ hạn, việc Top 3, việc đã xong hôm nay; cột Việc, Hạn, Ưu tiên, Ô ma trận) và **Ma trận 4 ô** (gồm mọi việc chưa xong, trừ việc đã ở Top 3). Thói quen cần làm hôm nay, nút thêm task nhanh. |
| **Mục tiêu** | Lọc theo kỳ (Năm / Quý / Tháng / Tuần) và theo nhóm. Mỗi thẻ mục tiêu có thanh %, bấm vào thì mở chi tiết và danh sách task |
| **Task** | Danh sách đủ bộ lọc (trạng thái, ưu tiên, mục tiêu, hạn), sắp xếp theo hạn hoặc ưu tiên |
| **Thói quen** | Lưới tick và streak |
| **Tổng kết** | Chỉ số, biểu đồ, review |

Tab chưa làm tới thì vẫn hiện trên thanh tab, kèm nhãn "Sắp có".

Yêu cầu trải nghiệm:
- Trên điện thoại dùng thanh tab cố định ở đáy màn hình. Tick task bằng một chạm, có hiệu ứng nhẹ.
- Thêm task nhanh chỉ cần gõ tên rồi Enter, các trường khác lấy giá trị mặc định (hạn = hôm nay, ưu tiên = Trung bình). Cạnh ô thêm nhanh có nút "Thêm task đầy đủ" mở ngay form đủ trường.
- Thao tác phải có cập nhật lạc quan: giao diện đổi ngay, lưu xuống Sheet ở nền. Lưu lỗi thì báo và cho thử lại.
- Có trạng thái rỗng thân thiện, ví dụ "Chưa có mục tiêu cho quý này. Tạo mục tiêu đầu tiên?".

## 6. Kỹ thuật

### 6.1 Lưu dữ liệu: Google Sheets làm database
Mỗi bảng là một sheet. Dòng 1 là header. Mỗi dòng có `id` (UUID), `created_at`, `updated_at`. Cột thêm sau Giai đoạn 1 (`importance`, `icon`) nằm ở cuối sheet, sau `updated_at`.

| Sheet | Cột |
|---|---|
| `Goals` | id, name, group, period_type, period_value, start_date, end_date, progress_mode (task/metric/habit), unit, target, actual, status, note, importance |
| `Tasks` | id, title, goal_id, due_date, priority, status, is_top3, top3_date, recurring_rule, parent_recurring_id, done_at, note, icon |
| `Habits` | id, name, goal_id, frequency, active |
| `HabitLogs` | id, habit_id, date, done |
| `Reviews` | id, period_type, period_value, good, bad, next |

Dữ liệu phải đọc được khi tôi mở thẳng Google Sheet: ngày định dạng `yyyy-mm-dd`, giá trị trạng thái và ưu tiên viết bằng tiếng Việt.

### 6.2 Triển khai: Claude Code đề xuất
Ràng buộc: không cài gì trên máy công ty, có link mở được trên điện thoại, miễn phí, đọc ghi được Google Sheet.

- Ứng viên tôi nghĩ tới: **Google Apps Script Web App**. Lý do: chạy luôn trên Google, kết nối thẳng với Sheet, không phải quản lý API key.
- **Trước khi code**, hãy so sánh ngắn Apps Script với 1–2 phương án khác về tốc độ, độ khó triển khai, giới hạn quota và trải nghiệm trên điện thoại. Nêu đề xuất cuối cùng rồi chờ tôi đồng ý.
- Hướng dẫn triển khai phải viết từng bước cho người không phải lập trình viên, kèm vị trí bấm cụ thể.
- Thêm khả năng cài lên màn hình chính điện thoại (PWA hoặc lối tắt) nếu phương án được chọn hỗ trợ.

### 6.3 Code
- Frontend thuần HTML, CSS, JS. Chỉ dùng framework nếu thật sự cần, khi đó giải thích lý do.
- Biểu đồ dùng một thư viện nhẹ (ví dụ Chart.js) hoặc tự vẽ SVG.
- Có nút **Xuất JSON / Nhập JSON** để sao lưu dữ liệu.
- Tên biến và hàm viết bằng tiếng Anh. Giao diện viết bằng tiếng Việt.
- **Tách lớp dữ liệu** thành một module riêng (ví dụ `api.js`) với 2 bản chạy:
  - Bản thật gọi Google Sheet.
  - Bản giả (mock) lưu bằng localStorage và có sẵn dữ liệu mẫu.

  Bản giả giúp mở giao diện ngay trên máy để kiểm thử tự động mà không cần deploy.

## 7. Giao diện: Life Planner, hồng pastel nhiều hoa

Tên web: **LIFE PLANNER**. Chi tiết đầy đủ (vai trò từng màu, cỡ chữ, thành phần) ở `DESIGN.md`. Mọi màu phải gọi qua biến CSS, không viết thẳng mã màu trong giao diện (trừ hình hoa và mặt trời trang trí vẽ bằng SVG).

```css
:root{
  --bg:#fffafc; --surface:#ffffff; --ink:#3b2235; --muted:#7a5c70; --line:#f8e3ec;
  --accent:#d6336c; --accent-soft:#ffe0ec; --accent-deep:#a8204f; --accent-ink:#ffffff;
  --butter:#fff1b8; --mint:#d6f5e6; --sky:#dcecff;
  --work:#2c58aa; --work-bg:#dcebff; --study:#6a40b5; --study-bg:#ede5ff; --health:#1e7149; --health-bg:#d8f5e7;
  --q1:#b42339; --q1-bg:#ffe0e5; --q1-bar:#e5485f;   /* Khẩn cấp: quan trọng + khẩn cấp */
  --q2:#7a5300; --q2-bg:#fff1b8; --q2-bar:#e8b400;   /* Lên lịch: quan trọng, không khẩn cấp */
  --q3:#a3470a; --q3-bg:#ffdcc4; --q3-bar:#f08a4b;   /* Xử lý sau: khẩn cấp, không quan trọng */
  --q4:#3d5a69; --q4-bg:#e3eef3; --q4-bar:#8fb0c0;   /* Xem xét */
  --hot:#b42339; --hot-bg:#ffe0e5; --warm:#994705; --warm-bg:#ffe8d1; --calm:#1e7149; --calm-bg:#dcf5e9;
  --ok:#1e7149; --ok-bar:#5cc49a; --pr:#855600; --pr-bar:#f2b84b; --warn:#b42339; --warn-bar:#ff8fa3;
  --font:'Nunito',system-ui,sans-serif;
  --display:'Baloo 2','Nunito',system-ui,sans-serif;
}
```

- Font: **Baloo 2** cho tiêu đề và chữ LIFE PLANNER, **Nunito** cho chữ thường. Mọi con số dùng Nunito đậm kèm `font-variant-numeric:tabular-nums` (chữ số thẳng hàng).
- Mỗi màu và mỗi icon chỉ mang **một nghĩa**: đỏ là gấp, ngôi sao là Top 3, trái tim hồng là mức quan trọng của mục tiêu.
- Màu tiến độ: đạt dùng `--ok`, gần đạt dùng `--pr`, cần chú ý dùng `--warn`.
- **Ma trận 4 ô** (quan trọng = ưu tiên Cao; khẩn cấp = trễ hạn, hạn hôm nay hoặc ngày mai): Khẩn cấp `--q1` (xử lý ngay lập tức), Lên lịch `--q2` (lập kế hoạch, đặt thời hạn rõ ràng), Xử lý sau `--q3` (giao người khác hoặc xử lý nhanh), Xem xét `--q4` (cắt giảm hoặc bỏ nếu không phục vụ mục tiêu). Dưới tên mỗi ô ghi cách xử lý. Mỗi task tô màu theo ô của nó (vạch trái, ô icon, nhãn).
- Icon SVG nét tròn (stroke 2, lưới 24), có icon cạnh mọi nhãn và nút. Mỗi task có một icon riêng. **Không dùng emoji.**
- Trang trí bằng **12 loại hoa** vẽ SVG (cúc, anh đào, tulip, hồng, hướng dương, oải hương, lưu ly, sứ, cánh bướm, chuông, cẩm tú cầu, cành lá), băng dính washi trên thẻ mục tiêu, giấy note dán nghiêng cho Top 3. Không dùng mascot (ngoại lệ đã duyệt: mặt trời có mặt cười trong khung chào).
- Hình nền chọn được: **Hoa bay nhẹ, màu mờ** (mặc định) hoặc **Trơn**. Lưu lựa chọn trên từng thiết bị.
- Tick xong một việc: hoa bung ra từ chỗ tick kèm một câu động viên. Mục tiêu vừa đạt 100%: hoa bung nhiều hơn. Người dùng bật "giảm chuyển động" trong máy thì chỉ hiện câu động viên.
- Bo góc: 22px cho thẻ, 14px cho ô nhập, 99px cho nút tròn, pill và thanh tiến độ.
- Vùng bấm tối thiểu 44px. Chữ trên nền màu đạt độ tương phản tối thiểu 4.5:1.
- Có chế độ tối theo cài đặt hệ thống và nút chuyển tay (làm ở Giai đoạn 4, bộ màu tối ghi trong `DESIGN.md`).
- Mobile-first, ngưỡng 620px và 900px. Không được có cuộn ngang ở bề rộng 390px.

## 8. Lộ trình

| Giai đoạn | Nội dung | Điểm dừng để tôi kiểm tra |
|---|---|---|
| **0** | Đề xuất phương án triển khai (mục 6.2) và cấu trúc thư mục | Tôi chọn phương án |
| **1** | Kết nối Sheet, CRUD Mục tiêu + Task, tab Hôm nay và Mục tiêu, tiến độ theo task | Dùng được trên máy tính và điện thoại |
| **2** | Tiến độ theo chỉ số, lọc theo kỳ, task lặp lại, cảnh báo trễ hạn và tiến độ chậm, tab Task, nút "Thêm task đầy đủ" | |
| **3** | Thói quen, streak, tab Thói quen | |
| **4** | Tổng kết, biểu đồ, review, xuất/nhập JSON, chế độ tối, PWA | |

## 9. Tiêu chí hoàn thành mỗi giai đoạn

- Không có lỗi trong console. Giao diện không hiện `undefined` hay `NaN`.
- Kiểm tra trên khung 390px và 1280px.
- Thêm, sửa, xóa xong, mở Google Sheet thấy dữ liệu đúng.
- Tải lại trang ở một thiết bị khác vẫn thấy dữ liệu mới.
- Viết ngắn gọn bằng tiếng Việt: đã làm gì, cách kiểm tra, còn hạn chế gì.

## 10. Quy trình kiểm tra mỗi giai đoạn

1. Agent chính xây xong giai đoạn và cập nhật `docs/TIEN-DO.md`.
2. **Gọi `spec-reviewer` và `qa-tester` cùng lúc, trong cùng một lượt, để chạy song song:**
   - `spec-reviewer` đối chiếu code với SPEC.
   - `qa-tester` chạy thử bằng bản mock ở khung 390px và 1280px, ở chế độ sáng và tối.

   Trong lúc 2 agent đang chạy, agent chính không sửa code, để kết quả kiểm tra không bị lệch.
3. Chờ **cả 2** báo cáo về rồi mới gộp lại thành một danh sách lỗi.
4. Agent chính sửa mọi lỗi mức **Cao** và **Trung bình**. Lỗi mức Thấp được ghi vào TIEN-DO.md.
5. Gọi lại `qa-tester` một lần để xác nhận đã sửa xong.
6. Báo cáo cho tôi: đã làm gì, kết quả kiểm tra, cách tôi tự thử, còn hạn chế gì.

## 11. Quy tắc làm việc với tôi

- Trả lời bằng tiếng Việt.
- Hỏi lại khi yêu cầu chưa rõ, đừng tự đoán.
- Không tự thêm tính năng ngoài spec. Có ý hay thì ghi vào mục "Đề xuất thêm" để tôi quyết.
- Mỗi giai đoạn commit riêng, message rõ ràng.

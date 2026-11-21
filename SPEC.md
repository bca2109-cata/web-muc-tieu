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
- Các trường: tên, nhóm, kỳ (loại kỳ + giá trị kỳ, ví dụ Quý – 2027-Q1), ngày bắt đầu, ngày kết thúc, ghi chú, trạng thái (Đang làm / Hoàn thành / Tạm dừng).
- **Cách tính tiến độ, chọn riêng cho từng mục tiêu:**
  - **Theo task:** % = số task đã xong / tổng số task gắn với mục tiêu.
  - **Theo chỉ số:** tự nhập đơn vị (giờ, km, cuốn…), target và giá trị thực tế. % = thực tế / target. Có nút "+ cập nhật" để cộng thêm nhanh, ví dụ +1 giờ.
- Màu tiến độ: ≥ 100% là đạt, 80–99% là gần đạt, < 80% là cần chú ý (dùng biến màu ở mục 7).
- Khi tiến độ theo thời gian vượt xa tiến độ thực tế thì cảnh báo. Ví dụ đã qua 60% thời gian của kỳ mà mục tiêu mới đạt 30%.

### 4.2 Task
- Các trường: tên, mục tiêu liên kết (có thể để trống, coi là "Việc lặt vặt"), hạn chót, mức ưu tiên (Cao / Trung bình / Thấp), trạng thái (Cần làm / Đang làm / Xong), ghi chú ngắn, cờ "Top 3 hôm nay".
- **Task lặp lại:** hằng ngày, hoặc các thứ cố định trong tuần (ví dụ thứ 2-4-6). Task lặp phải tự sinh ra vào đúng ngày.
- Task trễ hạn tô màu cảnh báo. Task đến hạn hôm nay hoặc ngày mai thì hiện nhãn "Sắp đến hạn".
- **Chỉ nhắc ngay trong web.** Không cần thông báo đẩy, email hay Telegram.

### 4.3 Thói quen (habit)
- Các trường: tên, mục tiêu liên kết (thường thuộc nhóm Sức khỏe), tần suất (hằng ngày hoặc chọn thứ trong tuần).
- Bảng lưới ô tick theo ngày, xem được 7 ngày hoặc cả tháng.
- Đếm **chuỗi ngày liên tiếp** (streak) hiện tại và chuỗi dài nhất.
- Mục tiêu liên kết với thói quen có thể tính % theo số ngày đã tick / số ngày cần làm trong kỳ.

### 4.4 Tổng kết tuần / tháng
- Số task đã xong, % đúng hạn, % trung bình của các mục tiêu trong kỳ.
- Biểu đồ đường: số task xong theo ngày hoặc theo tuần.
- Biểu đồ cột: % tiến độ từng mục tiêu, nhóm theo màu.
- Ô ghi chú review 3 câu: "Làm tốt gì?", "Chưa tốt gì?", "Kỳ sau ưu tiên gì?". Lưu lại theo kỳ để xem lại được.

## 5. Màn hình

| Tab | Nội dung chính |
|---|---|
| **Hôm nay** (mặc định) | Khối Top 3, task hôm nay và task trễ hạn, thói quen cần làm hôm nay, nút thêm task nhanh |
| **Mục tiêu** | Lọc theo kỳ (Năm / Quý / Tháng / Tuần) và theo nhóm. Mỗi thẻ mục tiêu có thanh %, bấm vào thì mở chi tiết và danh sách task |
| **Task** | Danh sách đủ bộ lọc (trạng thái, ưu tiên, mục tiêu, hạn), sắp xếp theo hạn hoặc ưu tiên |
| **Thói quen** | Lưới tick và streak |
| **Tổng kết** | Chỉ số, biểu đồ, review |

Yêu cầu trải nghiệm:
- Trên điện thoại dùng thanh tab cố định ở đáy màn hình. Tick task bằng một chạm, có hiệu ứng nhẹ.
- Thêm task nhanh chỉ cần gõ tên rồi Enter, các trường khác lấy giá trị mặc định (hạn = hôm nay, ưu tiên = Trung bình).
- Thao tác phải có cập nhật lạc quan: giao diện đổi ngay, lưu xuống Sheet ở nền. Lưu lỗi thì báo và cho thử lại.
- Có trạng thái rỗng thân thiện, ví dụ "Chưa có mục tiêu cho quý này. Tạo mục tiêu đầu tiên?".

## 6. Kỹ thuật

### 6.1 Lưu dữ liệu: Google Sheets làm database
Mỗi bảng là một sheet. Dòng 1 là header. Mỗi dòng có `id` (UUID), `created_at`, `updated_at`.

| Sheet | Cột |
|---|---|
| `Goals` | id, name, group, period_type, period_value, start_date, end_date, progress_mode (task/metric/habit), unit, target, actual, status, note |
| `Tasks` | id, title, goal_id, due_date, priority, status, is_top3, top3_date, recurring_rule, parent_recurring_id, done_at, note |
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

## 7. Giao diện: phong cách hồng pastel

Dùng đúng bộ màu và font dưới đây, không tự đổi mã màu. Mọi màu phải gọi qua biến CSS.

```css
:root{
  --bg:#fff6f9; --surface:#ffffff; --ink:#1c0d17; --muted:#5f4153; --line:#f4dbe6; --soft:#fde9f1;
  --accent:#c93d7f; --accent-ink:#ffffff; --ok:#3f9d6b; --pr:#9a5f0f; --pr-bg:#fff2d9; --warn:#c2570c;
  --gA:#8e9cf2; --gB:#5cc4b4; --gS:#8ccf9a;   /* Công việc / Học tập / Sức khỏe */
  --w0:#fde3ee; --w1:#ee7fb0;
  --font:'Be Vietnam Pro',system-ui,sans-serif;
  --mono:'IBM Plex Mono',ui-monospace,monospace;
}
:root[data-theme="dark"]{
  --bg:#1d1220; --surface:#2a1a2e; --ink:#fff4f9; --muted:#dfc3d3; --line:#3f2943; --soft:#33213a;
  --accent:#ff9fcb; --accent-ink:#2a1a2e; --ok:#7fd9a3; --pr:#f3c27a; --pr-bg:#3a2d1c; --warn:#f59a5a;
  --gA:#9fabff; --gB:#6fd6c5; --gS:#9fdcab; --w0:#3d2542; --w1:#d86a9e;
}
```

- Màu tiến độ: đạt dùng `--ok`, gần đạt dùng `--pr`, cần chú ý dùng `--warn`.
- Font: Be Vietnam Pro cho chữ, IBM Plex Mono cho **mọi con số** (%, ngày, giờ, streak), kèm `font-variant-numeric:tabular-nums`.
- Bo góc: 18px cho thẻ, 9px cho nút và ô nhập, 99px cho pill và thanh tiến độ.
- Icon SVG nét mảnh (stroke 1.8, lưới 24). **Không dùng emoji.**
- Có chế độ tối theo cài đặt hệ thống và nút chuyển tay.
- Mobile-first với một ngưỡng 620px. Không được có cuộn ngang ở bề rộng 390px.

## 8. Lộ trình

| Giai đoạn | Nội dung | Điểm dừng để tôi kiểm tra |
|---|---|---|
| **0** | Đề xuất phương án triển khai (mục 6.2) và cấu trúc thư mục | Tôi chọn phương án |
| **1** | Kết nối Sheet, CRUD Mục tiêu + Task, tab Hôm nay và Mục tiêu, tiến độ theo task | Dùng được trên máy tính và điện thoại |
| **2** | Tiến độ theo chỉ số, lọc theo kỳ, task lặp lại, cảnh báo trễ hạn và tiến độ chậm | |
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

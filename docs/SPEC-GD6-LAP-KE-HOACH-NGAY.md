# SPEC bổ sung, Giai đoạn 6: Lập kế hoạch ngày

> Viết ngày 22/11/2026, sau khi review web và hỏi người dùng 5 vòng.
>
> Khi tôi duyệt file này, gộp nó vào `SPEC.md` thành mục mới. Phần nào mâu thuẫn với SPEC cũ thì **file này được ưu tiên**.

## 1. Vấn đề cần giải quyết

Web hiện là **danh sách việc xếp theo hạn chót**. Thực tế tôi bị tắc ở 3 lúc:

| Lúc | Triệu chứng | Nguyên nhân gốc trong web |
|---|---|---|
| Sáng | Không biết bắt đầu từ đâu | Agenda dồn mọi việc có hạn và việc quá hạn vào một danh sách dài. Không có thứ tự, không biết hôm nay làm được bao nhiêu |
| Khi được giao việc quan trọng nhưng chưa gấp | Không biết xếp vào ngày nào | Chỉ có **hạn chót**, không có **ngày sẽ làm**. Việc "khi nào rảnh thì làm" hoặc hạn tự đặt thì không có chỗ đứng |
| Cuối ngày | Tồn nhiều | Không có quỹ giờ, nên luôn xếp nhiều hơn sức làm. Việc to không chia nhỏ. Việc đột xuất từ team sale chen vào mà không được tính |

Phát hiện thêm khi review:
- Có 3 hệ thống ưu tiên chồng nhau, gây rối: Cao/TB/Thấp, ô ma trận nhập tay, Top 3.
- "Uống đủ 2 lít nước" vừa là thói quen vừa là task.
- Khung bên trái của Agenda toàn biểu đồ thống kê, không giúp ra quyết định.

## 2. Thông tin về ngày làm việc của tôi

- Giờ làm: 8h00–17h30, nghỉ trưa 12h00–13h30, tức **8 giờ**.
- Cố định mỗi sáng: báo cáo daily, gồm cập nhật số và gửi đi, xong trước khoảng **8h30**. Phần này chiếm 0,5 giờ.
- Hỗ trợ đột xuất cho team sale **rất thất thường**.
- Buổi tối dành cho học và việc cá nhân.

## 3. Thay đổi

### 3.1 Tách "Ngày sẽ làm" khỏi "Hạn chót"
- Thêm trường `do_date` (Ngày sẽ làm), **tách hẳn** khỏi `due_date` (Hạn chót).
- Hạn chót có thể để trống, ví dụ việc "khi nào rảnh thì làm".
- Việc **không có Ngày sẽ làm** nằm trong **Kho**.
- Agenda hôm nay chỉ hiện:
  - Việc có Ngày sẽ làm = hôm nay.
  - Việc quá hạn chót, hiện dạng cảnh báo.
- Khi thêm việc, cho chọn nhanh Ngày sẽ làm: `Hôm nay` · `Mai` · `Thứ…` · `Để vào kho`.

### 3.2 Ước lượng thời lượng
- Thêm trường `duration_min`, chọn bằng một chạm: **15p / 30p / 1h / 2h / Nửa ngày (4h)**. Mặc định là 30p.
- **Việc từ 2 giờ trở lên bắt buộc chia nhỏ** trước khi xếp vào một ngày.
  - Có trường `parent_id`. Mỗi việc con có thời lượng và Ngày sẽ làm riêng.
  - Việc cha hiện % theo số việc con đã xong.
- Mỗi việc có thể ghi **"Bước đầu tiên"**, một dòng ngắn khoảng 15 phút, hiện ngay dưới tên việc.

### 3.3 Quỹ giờ
- **Quỹ giờ làm** = (8 giờ − 0,5 giờ báo cáo daily) × 70% ≈ **5 giờ 15 phút** cho việc có kế hoạch. 30% còn lại để dự phòng đột xuất.
  - Cho chỉnh các tham số này trong phần cài đặt: giờ làm, giờ cố định, % dự phòng.
- **Quỹ buổi tối** tách riêng, mặc định **1,5 giờ**, chỉnh được.
  - Việc nhóm Công việc chỉ xếp vào giờ làm.
  - Việc Học tập, Sức khỏe xếp vào buổi tối.
  - Việc không gắn mục tiêu (Việc lặt vặt) có lựa chọn **Giờ làm / Buổi tối** (cột `bucket`), web nhớ lựa chọn lần trước, mặc định buổi tối. Việc `bucket` = Giờ làm cũng về kho lúc 17h30 như việc nhóm Công việc.
  - Lần lặp của hôm nay được tính trước vào quỹ, luôn có trong gợi ý, không bỏ và không đưa về kho được.
- Agenda hiện thanh **"Đã xếp X / 5h15"** và **"Tối: Y / 1h30"**.
  - Vượt quỹ thì thanh chuyển màu cảnh báo, kèm câu "Quá tải Z phút, hãy dời bớt về kho".
- **Thay khung thống kê bên trái** bằng khung Quỹ giờ này cùng 3 việc chính. Thống kê chuyển sang tab Tổng kết.

### 3.4 Ưu tiên đơn giản hóa
- **Bỏ** Cao/TB/Thấp và **bỏ** ô ma trận nhập tay.
- Mỗi việc chỉ có **Quan trọng: có/không**.
- **Gấp** do web tự tính: hạn chót ≤ 2 ngày, hoặc đã quá hạn.
- Ma trận Eisenhower vẫn giữ để xem, nhưng web **tự xếp** việc vào ô dựa trên Quan trọng và Gấp.
- Top 3 đổi tên thành **"3 việc chính hôm nay"**.
- Chuyển dữ liệu cũ:
  - Cao → Quan trọng. TB và Thấp → không quan trọng.
  - Ô ma trận "Khẩn cấp" hoặc "Làm sau" → Quan trọng.
  - Hỏi tôi trước khi chạy chuyển đổi.

### 3.5 Gợi ý buổi sáng: "Kế hoạch hôm nay"
Lần đầu mở web trong ngày, hoặc khi bấm nút **"Xếp việc hôm nay"**, web đề xuất **một danh sách có thứ tự**, không gắn giờ. Danh sách lấy từ Kho và từ việc có Ngày sẽ làm = hôm nay, cho tới khi đầy quỹ giờ.

Thứ tự ưu tiên:
1. Việc quá hạn chót hoặc hạn chót là hôm nay.
2. Việc Quan trọng và Gấp.
3. Việc Quan trọng, chưa gấp, có Ngày sẽ làm = hôm nay.
4. Việc Quan trọng, chưa gấp, trong kho. Ưu tiên việc **bị dời nhiều lần** và việc **nằm kho lâu**.
5. Việc không quan trọng nhưng gấp.

Cách duyệt:
- Tôi bỏ bớt, kéo đổi thứ tự, hoặc thêm từ kho, rồi bấm **"Chốt"**.
- Việc có thời lượng lớn nhất trong nhóm Quan trọng được đề xuất làm đầu tiên sau 8h30, nếu không vướng việc hạn hôm nay.
- Phần lý do của từng việc hiện ngắn gọn, ví dụ "Hạn hôm nay", "Đã dời 3 lần", "Nằm kho 12 ngày".

### 3.6 Ghi việc đột xuất
- Nút nổi **"+ Đột xuất"**: gõ tên, ví dụ "Hỗ trợ sale lấy data", rồi chọn thời lượng 15p / 30p / 1h / 2h.
- Thời lượng được **trừ vào quỹ giờ hôm nay**. Nếu quỹ không còn đủ, web báo những việc nào ở **cuối danh sách** sẽ không kịp, và cho bấm một lần để đưa chúng về kho.
- Lưu vào sheet mới `Interruptions` (id, date, title, duration_min, created_at).
- Tab Tổng kết hiện **số giờ đột xuất trung bình mỗi ngày** trong 2 tuần gần nhất. Khi đã có số này, gợi ý chỉnh % dự phòng cho sát thực tế.

### 3.7 Cuối ngày và kho
- **Sang ngày mới:** việc có Ngày sẽ làm = hôm qua mà chưa xong thì tự **đưa về kho**. Xóa `do_date` của việc đó và tăng `defer_count` thêm 1.
  - Hạn chót vẫn giữ nguyên, nên việc đến hạn sẽ được gợi ý lại ở bước 3.5.
- **Việc có `defer_count` ≥ 3:** khi xuất hiện trong gợi ý buổi sáng thì gắn nhãn, và bắt chọn một trong các cách: **Chia nhỏ** / **Hỏi lại người giao** (ghi chú) / **Bỏ** / **Vẫn giữ**.
- **Xem lại kho mỗi tuần:** mặc định Thứ Sáu 16h30, chỉnh được.
  - Web dẫn qua từng việc trong kho: **Giữ** / **Đặt ngày làm** / **Bỏ**.
  - Có nút "Xem lại kho" ở tab Task để mở lúc nào cũng được.
- Thêm **màn Kho** trong tab Task, có bộ lọc: nằm kho lâu nhất, dời nhiều nhất, theo mục tiêu.

### 3.8 Dọn trùng lặp
- Việc lặp lại hằng ngày mà trùng với một thói quen thì chỉ hiện ở phần Thói quen, không tạo task.
- Hỏi tôi trước khi xóa dữ liệu trùng đang có.

## 4. Thay đổi dữ liệu (Google Sheet)

| Sheet | Thêm cột | Bỏ hoặc ngừng dùng |
|---|---|---|
| `Tasks` | do_date, duration_min, is_important, parent_id, first_step, defer_count, inbox_since, bucket | priority, cột ô ma trận (giữ dữ liệu cũ, không đọc nữa) |
| `Interruptions` (mới) | id, date, title, duration_min, created_at | |
| `Settings` (mới, nếu chưa có) | work_start, work_end, lunch_min, fixed_min, buffer_pct, evening_min, review_weekday, review_time | |

SPEC cũ có quy tắc không đổi tên cột sau giai đoạn 1. Giai đoạn này **thêm cột mới**, không đổi tên cột cũ. **Sao lưu Sheet trước khi chạy chuyển đổi.**

## 5. Tiêu chí hoàn thành

- Thêm một việc mới mất **dưới 10 giây**: gõ tên, chọn thời lượng, chọn Ngày sẽ làm hoặc kho.
- Mở web lúc 8h là có ngay danh sách thứ tự **không vượt 5h15**. Mỗi việc có lý do ngắn.
- Ghi một việc đột xuất 1 giờ thì quỹ giờ cập nhật và web báo việc nào sẽ không kịp.
- Sang ngày mới, việc chưa xong nằm trong kho với số lần dời đúng.
- Việc 2 giờ trở lên không xếp được vào một ngày nếu chưa chia nhỏ.
- Ma trận tự xếp đúng ô theo Quan trọng và Gấp. Không còn ô nhập tay nào.
- Kiểm thử bằng dữ liệu mẫu có ít nhất: 1 ngày quá tải, 1 việc dời 3 lần, 1 việc lớn có 3 việc con, 2 việc đột xuất.

## 6. Câu hỏi để Claude Code hỏi lại tôi trước khi code

1. Đưa việc về kho lúc 0h hay lúc 17h30, khi hết giờ làm?
2. Việc có Ngày sẽ làm trong tương lai, ví dụ thứ Tư, có cần nhắc khi đến hôm đó mà quỹ giờ đã đầy không?
3. Buổi tối 1,5 giờ đã hợp lý chưa? Cuối tuần có quỹ riêng không?
4. Phương án chuyển dữ liệu cũ ở mục 3.4 và việc dọn trùng ở mục 3.8.

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
  - Chốt GĐ4 (22/11/2026): kỳ là tuần ISO (thứ Hai đến Chủ nhật) hoặc tháng dương lịch, lùi được về kỳ trước. Việc đã xong = việc có `done_at` trong kỳ. % đúng hạn = trong các việc xong trong kỳ có hạn chót, phần xong không muộn hơn hạn (việc không có hạn không tính). % trung bình mục tiêu = trung bình % của các mục tiêu không Tạm dừng có thời gian chạm vào kỳ, tính tại cuối kỳ (kỳ đang diễn ra thì tính đến hôm nay): theo task đếm task đã có và đã xong đến ngày đó, theo thói quen đếm ngày đến ngày đó; theo chỉ số dùng số hiện tại, nếu mục tiêu sửa sau kỳ thì đánh dấu * (Sheet không lưu lịch sử chỉ số). Biểu đồ đường theo ngày; xem tháng thì chọn được gộp theo tuần. Biểu đồ % mục tiêu là cột đứng, xếp theo nhóm, nhiều cột thì vuốt ngang trong khung. Review lưu mỗi kỳ một dòng Reviews (`period_type` Tuần/Tháng, `period_value` như kỳ của mục tiêu).
  - Nhập JSON (chốt GĐ4): thay toàn bộ dữ liệu (cả Sheet), hỏi trước và tự tải bản sao lưu dữ liệu hiện tại về máy trước khi thay. Chế độ tối chọn trong Cài đặt: Theo máy / Sáng / Tối.

### 4.5 Giai đoạn 5: góp ý sau khi dùng thử (chốt 22/11/2026)
Phần này thay thế các chỗ tương ứng ở mục 4.1 đến 4.4 và mục 5 khi khác nhau.

**Tab Agenda** (đổi tên từ "Hôm nay", vẫn là tab mặc định)
- Có nút lùi / tiến ngày và nút về hôm nay: xem được hôm qua, hôm nay, ngày mai (và các ngày khác).
- Việc của một ngày D = việc có hạn đúng ngày D + việc quá hạn (hạn trước D, tính đến 23:59 ngày D-1) chưa xong tính đến D + việc đã xong trong ngày D.
- Mọi việc có ngày và giờ hạn. Thêm nhanh bằng Enter thì điền sẵn ngày đang xem và giờ mặc định 17:00, sửa được. Danh sách mặc định xếp theo ngày rồi giờ.
- Bảng việc: bấm tiêu đề cột để sắp xếp theo cột đó (tăng / giảm), ở mọi cột.
- Biểu đồ tổng quan của ngày đang xem:
  - Trạng thái hoàn thành: Xong / Chưa xong.
  - Trạng thái đến hạn (thanh ngang xếp chồng, mỗi hàng chia Xong / Chưa xong): Quá hạn, Đến hạn (hạn ngày D), Chưa đến hạn (hạn sau ngày D, đã xong sớm).
  - Mức độ quan trọng (thanh ngang xếp chồng, mỗi hàng chia 4 ô ma trận): Quá hạn, Đến hạn, Chưa đến hạn.
- Ma trận 4 ô đổi tên và bố cục giống ảnh mẫu người dùng gửi (trục Quan trọng / Không quan trọng và Khẩn cấp / Không khẩn cấp có mũi tên): Khẩn cấp (quan trọng + khẩn cấp, làm ngay), Làm sau (quan trọng, chưa khẩn cấp, đưa vào lịch), Làm trong ngày / Nhượng quyền (khẩn cấp, không quan trọng), Dời hôm sau (không quan trọng, không khẩn cấp). Giữ màu --q1 đến --q4 hiện tại.
- Top 3 chỉ hiện khi xem hôm nay. Thói quen hiện theo ngày đang xem (ngày tương lai không tick được).
- Lời nhắc: "Cần chú ý gì cho hôm sau" của review ngày D hiện rõ ở đầu Agenda ngày D+1. Phần "Chưa tốt" và "Kỳ sau ưu tiên" của review tuần / tháng hiện ở Agenda mọi ngày của kỳ kế tiếp. Mỗi lời nhắc có nút Ẩn: ẩn ở ngày X thì từ ngày X trở đi không hiện nữa; có chỗ để hiện lại.

**Thứ tự tab**: Agenda, Task, Mục tiêu, Thói quen, Tổng kết.

**Tab Task**: bộ lọc Trạng thái hoàn thành, Trạng thái đến hạn (Quá hạn / Đến hạn hôm nay / Chưa đến hạn), Mức độ quan trọng (= ưu tiên Cao / Trung bình / Thấp), Mức độ khẩn cấp (= 4 ô ma trận), Mục tiêu, Ngày đến hạn (chọn khoảng ngày từ - đến).

**Thói quen**: xem Tuần (7 ngày) / Tháng / Năm. Chuỗi streak có icon ngọn lửa nổi bật.

**Tổng kết**: kỳ Ngày / Tuần / Tháng / Năm. Bên dưới chọn gộp biểu đồ theo Ngày / Tuần / Tháng (không lớn hơn kỳ). Biểu đồ đường mượt "Tỷ lệ hoàn thành" = việc đã xong / việc có hạn trong từng mốc. Thêm phần tổng kết thói quen (tỷ lệ tick từng thói quen trong kỳ).
- Review ngày: mức hài lòng, "Cần chú ý gì cho hôm sau?", "Hôm nay có gì muốn chia sẻ?".
- Review tuần / tháng: giữ 3 câu cũ, thêm mức hài lòng.
- Mức hài lòng chọn 1 đến 5, hiện bằng bông hoa: 1 héo rũ, 5 nở tươi.

**Nền**: hoa rơi chuyển động, nhiều hoa hơn, nhiều màu hơn, dày hơn. Máy bật "giảm chuyển động" thì hoa đứng yên.

**Dữ liệu** (thêm cột cuối sheet, không đổi tên cột cũ): Tasks thêm `due_time` (HH:mm). Reviews thêm `rating` (1-5) và `hide_from` (ngày bắt đầu ẩn lời nhắc, trống = đang hiện). Review ngày lưu `period_type` = "Ngày", `period_value` = yyyy-mm-dd; `next` = cần chú ý cho hôm sau, `good` = chia sẻ. Apps Script tự thêm cột còn thiếu vào cuối dòng tiêu đề.

### 4.6 Giai đoạn 6: Lập kế hoạch ngày (duyệt 22/11/2026)
Gộp từ `docs/SPEC-GD6-LAP-KE-HOACH-NGAY.md`. Phần nào mâu thuẫn với các mục trên thì **mục này được ưu tiên**.

#### 1. Vấn đề cần giải quyết

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

#### 2. Thông tin về ngày làm việc của tôi

- Giờ làm: 8h00–17h30, nghỉ trưa 12h00–13h30, tức **8 giờ**.
- Cố định mỗi sáng: báo cáo daily, gồm cập nhật số và gửi đi, xong trước khoảng **8h30**. Phần này chiếm 0,5 giờ.
- Hỗ trợ đột xuất cho team sale **rất thất thường**.
- Buổi tối dành cho học và việc cá nhân.

#### 3. Thay đổi

##### 3.1 Tách "Ngày sẽ làm" khỏi "Hạn chót"
- Thêm trường `do_date` (Ngày sẽ làm), **tách hẳn** khỏi `due_date` (Hạn chót).
- Hạn chót có thể để trống, ví dụ việc "khi nào rảnh thì làm".
- Việc **không có Ngày sẽ làm** nằm trong **Kho**.
- Agenda hôm nay chỉ hiện:
  - Việc có Ngày sẽ làm = hôm nay.
  - Việc quá hạn chót, hiện dạng cảnh báo.
- Khi thêm việc, cho chọn nhanh Ngày sẽ làm: `Hôm nay` · `Mai` · `Thứ…` · `Để vào kho`.

##### 3.2 Ước lượng thời lượng
- Thêm trường `duration_min`, chọn bằng một chạm: **15p / 30p / 1h / 2h / Nửa ngày (4h)**. Mặc định là 30p.
- **Việc từ 2 giờ trở lên bắt buộc chia nhỏ** trước khi xếp vào một ngày.
  - Có trường `parent_id`. Mỗi việc con có thời lượng và Ngày sẽ làm riêng.
  - Việc cha hiện % theo số việc con đã xong.
- Mỗi việc có thể ghi **"Bước đầu tiên"**, một dòng ngắn khoảng 15 phút, hiện ngay dưới tên việc.

##### 3.3 Quỹ giờ
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

##### 3.4 Ưu tiên đơn giản hóa
- **Bỏ** Cao/TB/Thấp và **bỏ** ô ma trận nhập tay.
- Mỗi việc chỉ có **Quan trọng: có/không**.
- **Gấp** do web tự tính: hạn chót ≤ 2 ngày, hoặc đã quá hạn.
- Ma trận Eisenhower vẫn giữ để xem, nhưng web **tự xếp** việc vào ô dựa trên Quan trọng và Gấp.
- Top 3 đổi tên thành **"3 việc chính hôm nay"**.
- Chuyển dữ liệu cũ:
  - Cao → Quan trọng. TB và Thấp → không quan trọng.
  - Ô ma trận "Khẩn cấp" hoặc "Làm sau" → Quan trọng.
  - Hỏi tôi trước khi chạy chuyển đổi.

##### 3.5 Gợi ý buổi sáng: "Kế hoạch hôm nay"
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

##### 3.6 Ghi việc đột xuất
- Nút nổi **"+ Đột xuất"**: gõ tên, ví dụ "Hỗ trợ sale lấy data", rồi chọn thời lượng 15p / 30p / 1h / 2h.
- Thời lượng được **trừ vào quỹ giờ hôm nay**. Nếu quỹ không còn đủ, web báo những việc nào ở **cuối danh sách** sẽ không kịp, và cho bấm một lần để đưa chúng về kho.
- Lưu vào sheet mới `Interruptions` (id, date, title, duration_min, created_at).
- Tab Tổng kết hiện **số giờ đột xuất trung bình mỗi ngày** trong 2 tuần gần nhất. Khi đã có số này, gợi ý chỉnh % dự phòng cho sát thực tế.

##### 3.7 Cuối ngày và kho
- **Sang ngày mới:** việc có Ngày sẽ làm = hôm qua mà chưa xong thì tự **đưa về kho**. Xóa `do_date` của việc đó và tăng `defer_count` thêm 1.
  - Hạn chót vẫn giữ nguyên, nên việc đến hạn sẽ được gợi ý lại ở bước 3.5.
- **Việc có `defer_count` ≥ 3:** khi xuất hiện trong gợi ý buổi sáng thì gắn nhãn, và bắt chọn một trong các cách: **Chia nhỏ** / **Hỏi lại người giao** (ghi chú) / **Bỏ** / **Vẫn giữ**.
- **Xem lại kho mỗi tuần:** mặc định Thứ Sáu 16h30, chỉnh được.
  - Web dẫn qua từng việc trong kho: **Giữ** / **Đặt ngày làm** / **Bỏ**.
  - Có nút "Xem lại kho" ở tab Task để mở lúc nào cũng được.
- Thêm **màn Kho** trong tab Task, có bộ lọc: nằm kho lâu nhất, dời nhiều nhất, theo mục tiêu.

##### 3.8 Dọn trùng lặp
- Việc lặp lại hằng ngày mà trùng với một thói quen thì chỉ hiện ở phần Thói quen, không tạo task.
- Hỏi tôi trước khi xóa dữ liệu trùng đang có.

#### 4. Thay đổi dữ liệu (Google Sheet)

| Sheet | Thêm cột | Bỏ hoặc ngừng dùng |
|---|---|---|
| `Tasks` | do_date, duration_min, is_important, parent_id, first_step, defer_count, inbox_since, bucket | priority, cột ô ma trận (giữ dữ liệu cũ, không đọc nữa) |
| `Interruptions` (mới) | id, date, title, duration_min, created_at | |
| `Settings` (mới, nếu chưa có) | work_start, work_end, lunch_min, fixed_min, buffer_pct, evening_min, review_weekday, review_time | |

SPEC cũ có quy tắc không đổi tên cột sau giai đoạn 1. Giai đoạn này **thêm cột mới**, không đổi tên cột cũ. **Sao lưu Sheet trước khi chạy chuyển đổi.**

#### 5. Tiêu chí hoàn thành

- Thêm một việc mới mất **dưới 10 giây**: gõ tên, chọn thời lượng, chọn Ngày sẽ làm hoặc kho.
- Mở web lúc 8h là có ngay danh sách thứ tự **không vượt 5h15**. Mỗi việc có lý do ngắn.
- Ghi một việc đột xuất 1 giờ thì quỹ giờ cập nhật và web báo việc nào sẽ không kịp.
- Sang ngày mới, việc chưa xong nằm trong kho với số lần dời đúng.
- Việc 2 giờ trở lên không xếp được vào một ngày nếu chưa chia nhỏ.
- Ma trận tự xếp đúng ô theo Quan trọng và Gấp. Không còn ô nhập tay nào.
- Kiểm thử bằng dữ liệu mẫu có ít nhất: 1 ngày quá tải, 1 việc dời 3 lần, 1 việc lớn có 3 việc con, 2 việc đột xuất.

#### 6. Quyết định của người dùng (22/11/2026)
- Về kho: lúc 17h30 (hết giờ làm), việc nhóm Công việc có Ngày sẽ làm = hôm nay mà chưa xong thì về kho. Việc buổi tối (Học tập, Sức khỏe, Việc lặt vặt) giữ tới 0h. Web không chạy nền, nên việc chuyển xảy ra ở lần mở web đầu tiên sau mốc đó.
- Đặt Ngày sẽ làm vào ngày đã đầy quỹ: báo ngay lúc đặt (ví dụ "Thứ Tư đã xếp 5h30 / 5h15"). Sáng hôm đó gợi ý buổi sáng vẫn xếp lại theo ưu tiên.
- Quỹ giờ: ngày thường giờ làm 5h15 + tối 1h30. Thứ Bảy, Chủ nhật không có giờ làm, một quỹ cá nhân 4 giờ. Chỉnh được trong Cài đặt (thêm cột `weekend_min` ở Settings).
- Chuyển dữ liệu cũ: Cao thành Quan trọng, còn lại không quan trọng. Việc chưa xong vào kho, giữ hạn chót. Thời lượng 30p, số lần dời 0, ngày vào kho = ngày chuyển. Xóa việc "Uống đủ 2 lít nước" (trùng thói quen "Uống nước 2 lít"). Sao lưu cả file Sheet và file JSON trước khi chuyển.
- Sheet không có cột ô ma trận (ô trước giờ do web tự tính), nên không có gì để chuyển ở phần này.
- Giờ hạn chót (GĐ5) đổi thành không bắt buộc. Mỗi lần lặp của việc lặp lại tự có Ngày sẽ làm đúng ngày đó, thời lượng và mức quan trọng lấy theo việc mẫu.
- Sheet `Settings` có thêm cột `id` (một dòng, id = "main") để lưu như các bảng khác.

### 4.7 Giai đoạn 7: Giờ bắt đầu, việc ghim đầu ngày, Ma trận cân việc, Hoa rơi (duyệt 23/11/2026)

> Nguồn: `docs/SPEC-GD7.md`. Phần nào mâu thuẫn với mục 4.6 thì mục này được ưu tiên.

#### A. Giờ bắt đầu ngày và việc ghim đầu ngày
- Cài đặt **Giờ bắt đầu ngày làm** (mặc định 08:00), **Buổi tối bắt đầu** (mặc định 20:00). Giờ kết thúc 17h30, nghỉ trưa 12h00 đến 13h30.
- **Việc ghim đầu ngày** là việc lặp mẫu có cột `pinned` (thứ tự 1, 2, ...). Luôn đứng đầu danh sách hôm nay (và có khối "Ghim đầu ngày" trên "3 việc chính"), không bị gợi ý, không về kho, không bị đẩy khi cân việc. Cài đặt có mục Việc ghim đầu ngày (đổi thứ tự, bỏ ghim). Tạo bằng cách tạo việc lặp rồi tick "Ghim đầu ngày".
- Quỹ giờ làm = (8 giờ − tổng việc ghim của ngày) × (100% − dự phòng). Bỏ ô "Việc cố định" (cột `fixed_min` giữ trong sheet nhưng không dùng). Việc ghim không tính vào "đã xếp". Ngày sau hôm nay chưa có lần lặp thì tính ghim từ lịch lặp của việc mẫu.
- **Giờ dự kiến bắt đầu** từng việc chưa xong, chỉ để tham khảo (không kéo thả theo giờ): từ giờ bắt đầu ngày, cộng dồn theo thứ tự danh sách, bỏ qua nghỉ trưa (việc cắt ngang dời phần còn lại sang 13h30), đột xuất chèn tại giờ ghi, bỏ việc đã xong, muộn hơn giờ dự kiến đầu tiên thì tính lại từ bây giờ, vượt 17h30 thì nhãn "Không kịp hôm nay", buổi tối tính từ giờ tối. Cuối tuần không hiện giờ. Hiện ở Bảng, Ma trận, Kế hoạch.
- Dữ liệu cũ: đã tạo việc ghim "Báo cáo daily" 15 phút, T2 đến T6 (23/11/2026).

#### B. Tab Ma trận và nút "Cân việc mới"
- **Tab Ma trận** (thứ 3 trên thanh tab, `#/ma-tran`): phạm vi Hôm nay / Tuần này (đến Chủ nhật) / Kho; thanh quỹ giờ của phạm vi (Kho chỉ có tổng thời lượng); 4 ô Quan trọng × Gấp web tự xếp; thẻ hiện tên, thời lượng, ngày làm, hạn chót. Bấm tên thẻ để đổi nhanh Quan trọng, Ngày làm, Hạn chót. Không có ô nhập tay chọn ô.
- **Cân việc mới** (ở tab Ma trận và lối tắt trong khung Quỹ giờ của Agenda): nhập tên, thời lượng, hạn chót (có thể trống), Quan trọng, mục tiêu (không mục tiêu thì chọn Giờ làm / Buổi tối). Công tắc **Gấp** chỉ có trong form này, chỉ hiện khi chưa có hạn chót: chọn "Cần xong hôm nay" hoặc "Cần xong ngày mai", web ghi vào `due_date`, không lưu cờ riêng (gấp vẫn là hạn trong 2 ngày).
- Việc mới được đặt vào ma trận, đánh dấu nổi bật; thanh quỹ và danh sách phía sau cập nhật theo phương án đang chọn. Tối đa 3 phương án, mỗi phương án nêu hệ quả: **Làm hôm nay** (quỹ thiếu thì đề xuất đẩy sang ngày làm việc kế tiếp những việc ô thấp nhất rồi hạn chót xa nhất, liệt kê tên và thời lượng, mỗi việc đẩy tính +1 lần dời); **Làm vào [ngày]** (ngày làm việc gần nhất còn đủ quỹ và trước hạn chót); **Để vào kho**.
- Không bao giờ tự đề xuất đẩy: việc ghim, việc lặp, việc đã quá hạn, hạn chót hôm nay, việc nằm trong 3 việc chính, và việc mà đẩy sẽ quá hạn chót của nó. Người dùng tự chọn tay thì vẫn được. Cảnh báo khi ngày được đẩy sang đã đầy quỹ.
- Xác nhận ghi dữ liệu, có **Hoàn tác** 10 giây. Việc từ 2 giờ trở lên chỉ được vào kho (có nút Chia nhỏ).

#### C. Hoa rơi nền
- Cài đặt **Hoa rơi** (lưu trên thiết bị): Luôn bật (mặc định, hoa vẫn rơi khi máy bật giảm chuyển động) / Theo cài đặt máy / Tắt. Hoa bung khi xong việc theo cài đặt này.
- 90 bông (45 khi rộng dưới 620px), kích thước 14 đến 56px, lớp xa nhỏ mờ chậm và lớp gần to rõ nhanh, độ đậm 0.35 đến 0.55, rơi 9 đến 22 giây lệch pha, xoay và lắc ngang hình sin, khoảng 30% là cánh hoa rời lật 3D. Chỉ dùng transform và opacity, dừng khi tab ẩn. Chữ ngoài thẻ có quầng màu nền để vẫn đọc rõ. Tăng phiên bản cache `sw.js`.

#### Thay đổi dữ liệu (Google Sheet)
| Sheet | Thêm cột |
|---|---|
| `Tasks` | bucket (Giờ làm / Buổi tối cho việc không gắn mục tiêu, sau nghiệm thu GĐ6), pinned |
| `Settings` | evening_start |

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
| **5** | Góp ý sau khi dùng thử (22/11/2026), xem mục 4.5 | |
| **6** | Lập kế hoạch ngày: Ngày sẽ làm, kho, thời lượng, quỹ giờ, gợi ý buổi sáng, đột xuất, xem mục 4.6 | |
| **7** | Giờ bắt đầu, việc ghim đầu ngày, tab Ma trận và Cân việc mới, hoa rơi nền, xem mục 4.7 | |

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

# V2 · Phần 4: Mục tiêu, Thói quen, Tổng kết

> Đọc kèm `01-HOP-DONG-CHUNG.md` và `02-THIET-KE.md`.
>
> - **File sở hữu:** `js/views/muc-tieu.js`, `js/views/thoi-quen.js`, `js/views/tong-ket.js`, `css/muc-tieu.css`, `tests-qa/v2/phan-4.js`.
> - Bố cục tham khảo canvas: "Tổng kết · tuần/tháng/quý/năm".

## 1. Mục tiêu (route `muc-tieu`, nút chuyển Mục tiêu / Thói quen)
**Mục tiêu:**
- Giữ kiểu thẻ mục tiêu của web cũ: băng washi theo nhóm, sticker icon, nhãn kỳ, "Còn N ngày", trái tim, thanh tiến độ sọc chéo, câu trạng thái. Grep `.goal-card` trong `src/css/style.css` để lấy mẫu.
- Lọc theo kỳ Năm / Quý / Tháng và theo nhóm.
- Tiến độ tính theo số việc đã xong, hoặc theo số nhập tay (thực tế / target).
- Thêm, sửa, xóa mềm.

**Thói quen:**
- Danh sách thói quen, có giờ (tùy chọn) và các thứ trong tuần.
- Lưới tick 7 ngày, lửa chuỗi, chuỗi dài nhất.
- Thói quen có giờ sẽ hiện trên dòng thời gian của Agenda (Phần 1 tự đọc dữ liệu `Habits`).

## 2. Tổng kết (route `tong-ket`)
- **Chọn kỳ: Tuần / Tháng / Quý / Năm**, có nút ‹ › để lùi/tiến kỳ. Nhớ lựa chọn lần cuối.
- **5 khối có tiêu đề**, thứ tự cố định. Mọi số lấy từ `LP.stats`:
  1. **Tổng quan:** 4 ô chỉ số:
     - Tỷ lệ hoàn thành công việc.
     - Hạng mục bỏ sót (và trong bao nhiêu ngày).
     - Việc ad-hoc đúng hạn x/y (còn mở N).
     - Đột xuất trung bình mỗi ngày.

     Mỗi ô có dòng so sánh với kỳ trước.
  2. **Tỷ lệ hoàn thành công việc**: tính cả công việc cố định và việc. **Biểu đồ cột**: mỗi cột là một ngày (kỳ Tuần, Tháng) hoặc một tháng (kỳ Quý, Năm). Màu theo ngưỡng, kỳ đang diễn ra màu `--accent-soft`. Có vạch 100% và 80%.
  3. **Công việc cố định và việc ad-hoc**, 2 ô cạnh nhau:
     - Bảng xếp hạng hạng mục hay bị sót, có thanh nhỏ và tên mẫu.
     - **Biểu đồ vòng** đúng hạn / trễ / còn mở, giữa vòng là % đúng hạn.
  4. **Mức độ và thời gian**, 2 ô cạnh nhau:
     - **Thanh chồng ngang:** mỗi mức quan trọng (1–3 trái tim) là một thanh, chia theo Rất khẩn / Khẩn / Bình thường.
     - **Thanh ngang** giờ đột xuất theo ngày, tuần, tháng hoặc quý.
  5. **Thói quen và nhìn lại**, 2 ô cạnh nhau:
     - Vòng tiến độ cho từng thói quen.
     - 3 câu (làm tốt / chưa tốt / kỳ sau ưu tiên), lưu vào `Reviews` theo kỳ.
- Bấm một cột hoặc một dòng thì mở tấm trượt liệt kê chi tiết phía sau con số.
- Biểu đồ vẽ SVG theo kiểu "Biểu đồ tổng quan" của web cũ. Luôn kèm số, không chỉ dựa vào màu.

## 3. Tiêu chí hoàn thành (test trong `phan-4.js`)
1. Đổi kỳ Tuần / Tháng / Quý / Năm thì 4 ô chỉ số và trục biểu đồ cột đổi đúng (ngày ↔ tháng).
2. Số trên 4 ô khớp với `LP.stats` cho cùng kỳ (so trực tiếp trong test).
3. Biểu đồ vòng: tổng 3 phần bằng số việc có hạn trong kỳ.
4. Lưu 3 câu nhìn lại của tháng 11, đổi kỳ rồi quay lại vẫn còn.
5. Thẻ mục tiêu: tiến độ theo việc khớp số việc đã xong / tổng.
6. Thói quen: tick hôm nay thì chuỗi tăng 1, vòng tiến độ ở Tổng kết cập nhật.
7. 390px và 1280px, sáng và tối. Không lỗi JS.

# Nghiệm thu Giai đoạn 6: Lập kế hoạch ngày

> Kiểm ngày 22/11/2026, độc lập với agent của Claude Code.
> - Bản mock: Playwright, khung 1280px và 390px, giả lập ngày 25–28/11/2026 và các giờ 08:10, 15:00, 16:40, 17:40.
> - Web thật: chỉ xem, không ghi dữ liệu.

**Kết luận: ĐẠT CÓ ĐIỀU KIỆN.** Cả 7 tiêu chí ở mục 5 đều đạt. Còn 3 lỗi mức Trung bình cần sửa trước khi dùng thật hằng ngày.

## 1. Tiêu chí mục 5

| # | Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | Thêm việc dưới 10 giây | Đạt | Gõ tên rồi Enter là lưu. Mặc định 30p, ngày hôm nay |
| 2 | Mở lúc 8h có danh sách thứ tự, không vượt quỹ, có lý do | Đạt* | Giờ làm 4h / 4h15, Tối 1h30 / 1h30. 7/7 việc có lý do. *Xem lỗi M1 |
| 3 | Đột xuất 1h: quỹ cập nhật, báo việc không kịp | Đạt | Quỹ 255 → 195 phút. Hộp thoại liệt kê 3 việc không kịp |
| 4 | Sang ngày mới: việc chưa xong về kho, đúng số lần dời | Đạt | 4/4 việc: `do_date` trống, `defer_count` +1. Lúc 17:40, việc Công việc về kho, việc buổi tối vẫn giữ |
| 5 | Việc từ 2h không xếp vào ngày khi chưa chia nhỏ | Đạt | Bị chặn ở cả 3 đường: thêm nhanh, form đầy đủ, sửa việc cũ. Việc con tối đa 1h |
| 6 | Ma trận tự xếp, không còn ô nhập tay | Đạt | Toàn bộ task khớp công thức Quan trọng × Gấp. Form không còn Cao/TB/Thấp hay ô ma trận |
| 7 | Dữ liệu mẫu đủ các ca kiểm | Đạt | Có ngày quá tải, việc dời 3 lần, việc lớn có việc con, 2 việc đột xuất |

Kiểm thêm, đều đạt:
- Quỹ mặc định 5h15 và 1h30. Cuối tuần một quỹ 4h.
- Việc dời ≥ 3 lần khóa nút Chốt cho tới khi chọn cách xử lý.
- Chốt xong thì 3 việc đầu thành 3 việc chính.
- Nhắc Xem lại kho vào Thứ Sáu từ 16h30, trước giờ đó không nhắc.
- Form có Bước đầu tiên và 5 mức thời lượng.
- Khung thống kê cũ đã rời Agenda.
- Không lỗi JavaScript. Ở 390px không cuộn ngang. Không có chữ undefined, NaN, Infinity.
- Web thật mở được, không lỗi console.

## 2. Lỗi cần sửa

### M1 [Trung bình] Việc lặp lại gây "Quá tải" giả ngay sau khi Chốt
- **Tái hiện:** mock, `?today=2026-11-25&now=08:10`, chọn Vẫn giữ, rồi Chốt.
  - Gợi ý buổi tối là 1h30 / 1h30.
  - Sau khi Chốt, buổi tối thành **2h / 1h30, quá tải 30 phút**.
- **Nguyên nhân:** lần lặp "Tập yoga buổi tối" (30p) không vào gợi ý (`plan.suggest`) nhưng vẫn được tính trong `plan.load`.
- Bấm "Đưa 1 việc về kho" **không hết quá tải**, vì lần lặp không được về kho.
- **Hậu quả:** ngày nào có việc lặp thì cũng báo quá tải, người dùng sẽ quen bỏ qua cảnh báo.
- **Hướng sửa (cần hỏi người dùng):**
  - Cách 1: gợi ý tính lần lặp trước, xem như việc đã xếp sẵn, rồi mới lấp phần quỹ còn lại.
  - Cách 2: không tính lần lặp vào quỹ.

  Dù chọn cách nào, nút "Đưa về kho" cũng không được đề xuất những việc không về kho được.

### M2 [Trung bình] Việc công ty không gắn mục tiêu bị xếp vào quỹ Buổi tối
- Theo `plan.bucketOf`, chỉ việc thuộc mục tiêu nhóm Công việc mới vào Giờ làm. "Việc lặt vặt" luôn vào Buổi tối.
- Việc sếp giao lẻ, ví dụ "Gửi file cho trưởng phòng", sẽ bị tính vào buổi tối.
- Lỗi này nằm ở bản yêu cầu (SPEC 4.6, mục 3.3), không phải lỗi code.
- **Hướng sửa (cần hỏi người dùng):**
  - Cách 1: thêm lựa chọn "Giờ làm / Buổi tối" cho việc không gắn mục tiêu, nhớ lựa chọn lần trước.
  - Cách 2: tách "Việc lặt vặt" thành "Việc công ty lặt vặt" và "Việc cá nhân lặt vặt".

### M3 [Trung bình, trải nghiệm] Trên điện thoại, việc đầu tiên cần làm bị đẩy xuống quá sâu
- Ở 390px, "3 việc chính hôm nay" bắt đầu ở khoảng **1.500px** từ đầu trang. Phía trên nó là:
  - Lời chào.
  - 3 mục tiêu chậm tiến độ.
  - Quỹ giờ.
  - Ô thêm nhanh, với khoảng 14 nút chọn luôn mở.
- Đây đúng là chỗ tắc "sáng không biết bắt đầu từ đâu" của GĐ6, nhưng lại bị chôn trên điện thoại.
- **Hướng sửa:**
  - Thu gọn tùy chọn của ô thêm nhanh: chỉ mở khi bấm vào ô hoặc có nút "Tùy chọn".
  - Đưa "3 việc chính hôm nay" lên ngay sau Quỹ giờ.
  - Thu khối mục tiêu chậm tiến độ thành một dòng có thể bấm mở.

  Xem bản xem trước trước khi đổi.

## 3. Góp ý mức Thấp
- **T1.** Việc từ 2h phải qua 4 bước: Để vào kho → Lưu → Mở lại → Chia nhỏ. Nên có nút **"Chia nhỏ ngay"** trong form.
- **T2.** Khối "Sắp đến hạn" vẫn liệt kê nhiều việc theo hạn chót, bên dưới Agenda. Nên thu gọn mặc định, để Agenda bám theo Ngày sẽ làm.
- **T3.** 8 lỗi Thấp đã ghi trong TIEN-DO.md vẫn giữ nguyên, ví dụ "(quỹ 5h15 )" có khoảng trắng thừa, chưa kéo thả được thứ tự.

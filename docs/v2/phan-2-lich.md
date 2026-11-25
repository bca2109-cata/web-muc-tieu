# V2 · Phần 2: Lịch tuần và Lịch tháng

> Đọc kèm `01-HOP-DONG-CHUNG.md` và `02-THIET-KE.md`.
>
> - **File sở hữu:** `js/views/lich-tuan.js`, `js/views/lich-thang.js`, `css/lich.css`, `tests-qa/v2/phan-2.js`.
> - Bố cục tham khảo canvas: "Lịch · Tuần", "Lịch · Tháng".

Route `lich`, có nút chuyển **Tuần / Tháng**, nhớ lựa chọn lần cuối.

## 1. Tuần (T2–CN)
- Nút ‹ tuần trước, **Tuần này**, tuần sau ›.
- **Mỗi ngày một cột.** Trong cột có:
  - Dòng gọn "Cố định: N lượt". Ngày đã qua thì thêm ✓ đủ hoặc ! N sót. Bấm vào thì mở Agenda ngày đó.
  - Thanh quỹ việc riêng X/Y, đổi màu khi vượt quỹ.
  - Thẻ **Việc** và **bước con** có ngày làm hôm đó. Mỗi thẻ có tên, thời lượng, trái tim, đồng hồ khẩn, người đặt, và vạch màu theo nhóm.
  - **Mốc hạn chót:** "Hạn hh:mm · tên việc".
- **Ngày nghỉ:** nền xám, chữ "Nghỉ".
- **Cột phụ "Chưa có ngày":** việc cá nhân chưa đặt ngày làm.
- **Kéo thả thẻ** giữa các cột để đổi `do_date`.
  - Thả vào ngày sau hạn chót thì hỏi xác nhận "Việc này sẽ trễ hạn N ngày".
  - Không thả được vào ngày đã qua.
  - Có hoàn tác trong 10 giây.
  - Menu ⋯ trên thẻ có "Chuyển sang ngày…", dùng thay kéo thả cho bàn phím và điện thoại.
- **Bộ lọc "Quan trọng trở lên"**: thẻ không khớp thì mờ đi, thanh quỹ vẫn tính đủ.
- Dưới 768px: chuyển thành danh sách dọc theo ngày, chỉ xem, đổi ngày qua menu ⋯.

## 2. Tháng
- Lưới bắt đầu từ Thứ Hai. Nút tháng trước, Tháng này, tháng sau.
- **Mỗi ô ngày:**
  - Số ngày.
  - Ngày đã qua: **✓** (`--ok`) nếu đủ, **!** (`--warn`) nếu có sót. Đây chính là lịch sử.
  - **Chấm hạn chót**, tối đa 3 chấm rồi "+N".
  - Số việc của ngày.
  - Thanh mảnh cho mẫu theo khoảng ngày, ví dụ "Chốt số tháng 1–3".
  - Hôm nay có viền nhấn. Chủ nhật và ngày nghỉ nền xám.
- **Bấm vào ô:** ngày đã qua thì mở Agenda ngày đó (chỉ xem). Ngày tới thì mở Tuần chứa ngày đó.

## 3. Tiêu chí hoàn thành (test trong `phan-2.js`)
1. Mock tuần 23–29/11: cột T6 có mốc "Hạn 15:00 · BC phân tích nguồn T11".
2. Kéo thẻ từ T4 sang T5 thì `do_date` đổi, Agenda T5 có việc đó, và quỹ hai cột cập nhật.
3. Thả vào ngày sau hạn chót thì có hộp xác nhận. Ngày đã qua thì không nhận thả.
4. Bật lọc "Quan trọng trở lên" thì thẻ 1 trái tim mờ đi.
5. Tháng 11: các ngày có bỏ sót trong dữ liệu mock hiện "!", ngày đủ hiện ✓, ngày nghỉ hiện "Nghỉ".
6. Bấm ô một ngày đã qua thì mở đúng Agenda ngày đó.
7. 1280px, 1024px và 390px không cuộn ngang ngoài ý muốn. Không lỗi JS.

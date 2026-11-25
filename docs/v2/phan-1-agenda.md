# V2 · Phần 1: Agenda và Soát cuối ngày

> Đọc kèm `01-HOP-DONG-CHUNG.md` và `02-THIET-KE.md`.
>
> - **File sở hữu:** `js/views/agenda.js`, `js/views/soat.js`, `css/agenda.css`, `tests-qa/v2/phan-1.js`.
> - **Dữ liệu và logic** lấy qua `LP.logic.routines`, `LP.logic.tasks`, `LP.stats`. Không tự tính lại.
> - Bố cục tham khảo canvas: artboard "Agenda · máy tính", "Agenda · điện thoại", "Soát cuối ngày".

## 1. Agenda (route `agenda`, màn mở đầu)

**Đầu trang:**
- Ngày, nút ‹ › để lùi/tiến ngày. Ngày đã qua chỉ xem.
- Nút "Đánh dấu ngày nghỉ".

**Dải 3 biểu đồ** (dùng `LP.stats`):
1. **Vòng tròn hoàn thành hôm nay:** x/y và %. Bên cạnh ghi quỹ việc riêng X/Y và giờ đột xuất.
2. **Tiến độ theo khối:** mỗi lượt cố định, "Từ hôm qua" và "Việc", mỗi khối là một thanh ghi x/y. Khối đủ thì màu `--ok`.
3. **Tỷ lệ hoàn thành 6 ngày làm việc gần nhất:** biểu đồ cột màu theo ngưỡng. Hôm nay dùng `--accent-soft`.

**Nút chuyển chế độ xem: Checklist / Toàn cảnh.** Nhớ lựa chọn lần cuối.

**Checklist:**
- **Từ hôm qua**, giấy note bơ. Gồm hạng mục ngày lệch +1 của lượt hôm trước, hạng mục bỏ sót, và việc chưa xong từ trước.
  - Mỗi dòng ghi nguồn, ví dụ "Chia số AI Class 24/11".
  - Tick ở đây thì cập nhật đúng lượt gốc.
- **Cố định:** mỗi lượt là một thẻ.
  - Hạng mục xếp theo giờ. Hạng mục không giờ giữ vị trí trong mẫu.
  - **Đến giờ** (trong vòng 15 phút) có nền nhấn. **Trễ** có chữ đỏ và "Trễ N phút".
  - Cuối thẻ ghi "Ngày mai hh:mm · …" nếu lượt có hạng mục +1.
  - Thẻ tick hết thì thu gọn: "✓ Tên · xong lúc hh:mm".
  - Thẻ xếp theo giờ của hạng mục đầu tiên chưa xong. Thẻ đã xong dồn xuống dưới.
  - Mẫu theo khoảng ngày trong tháng có nhãn "còn N ngày".
  - Link "Ghi chú" mở tài liệu đúng mục, trong tấm trượt `LP.ui.sheet`.
- **Việc hôm nay:**
  - Gồm việc và bước con có ngày làm là hôm nay.
  - Mỗi dòng: tick, tên, trái tim quan trọng, đồng hồ khẩn, người đặt, hạn chót, "bước x/y".
  - Menu ⋯: Đổi ngày làm / Sửa / Mở ghi chú.
- **Thói quen:** chip tick nhanh, có lửa chuỗi.
- **Nút "Soát cuối ngày".**

**Toàn cảnh (dòng thời gian):**
- **Khối "Việc tồn · chưa xếp giờ"** ở trên cùng, giấy note bơ.
  - Gồm cùng các mục như Từ hôm qua. Mỗi dòng ghi nguồn, ngày gốc, giờ gốc, nhãn Trễ / Bỏ sót / Chưa xong, và ô **Đặt giờ**.
  - Đặt giờ thì lưu vào `RoutineChecks.set_time`, hoặc `Tasks.do_time` cho việc.
- **Mục đã có giờ** nằm đúng khung trên dòng thời gian, kèm nhãn **"Tồn từ dd/mm"**. Bỏ giờ thì mục quay lại khối tồn.
- **Dòng thời gian:**
  - Chia đoạn SÁNG (trước 12:00) / CHIỀU (12:00–17:30) / TỐI.
  - Có vạch "Bây giờ hh:mm".
  - Nút **Sớm → muộn / Muộn → sớm**.
  - Hạng mục không giờ hiện "~hh:mm" (chữ mờ), tính bằng giờ của hạng mục trước nó trong mẫu cộng `est_min` (mặc định 15 phút).
  - Thói quen có giờ cũng nằm trên dòng thời gian.
- **Nhóm "Trong ngày · chưa đặt giờ"** ở cuối, cũng có ô Đặt giờ.
- **Các cột:** Giờ | Công việc (có ô tick) | Thuộc | Mức độ | Hạn | Trạng thái (Xong / Đến giờ / Trễ / Chưa làm).

**Thông báo:**
- Tới giờ một hạng mục có giờ, nếu tab web đang mở, thì bật thông báo trình duyệt, qua `LP.notify`.
- Mục đã tick trước giờ thì không báo.

## 2. Soát cuối ngày (route `soat`)
- Chỉ hiện mục **chưa tick** của hôm nay, gom theo lượt hoặc việc.
- Mỗi dòng có 3 nút:
  - **Đã làm:** tick bù.
  - **Mang sang mai:** `status=carried`, hiện ở Từ hôm qua của ngày làm việc kế tiếp.
  - **Bỏ qua hôm nay:** `status=skipped`, có ô lý do ngắn.
- Việc ad-hoc thì nút thứ 3 là **Chọn ngày…**.
- Nút "Xong soát" và câu "Lịch tháng sẽ đánh dấu ✓ nếu không còn bỏ sót".

## 3. Tiêu chí hoàn thành (viết thành test trong `phan-1.js`)
1. Mock `today=2026-11-25`: "Cop lại lần cuối" của lượt 24/11 hiện ở Từ hôm qua, ghi "24/11".
2. Lượt Thứ Bảy có hạng mục +1 thì hạng mục đó hiện vào Thứ Hai.
3. `now=08:42`, hạng mục 8:30 chưa tick thì có "Trễ 12 phút".
4. Toàn cảnh: đặt giờ 11:30 cho một việc tồn thì việc đó rời khối tồn và nằm giữa 11:00 và 14:00, có nhãn "Tồn từ 24/11".
5. Nút Muộn → sớm đảo đúng thứ tự.
6. Soát: chọn "Mang sang mai" thì ngày hôm sau mục đó ở Từ hôm qua.
7. Thẻ lượt tick hết thì thu gọn, vòng tròn tăng đúng.
8. 390px và 1280px không cuộn ngang. Không lỗi JS.

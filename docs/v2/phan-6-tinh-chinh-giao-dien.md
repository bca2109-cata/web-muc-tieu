# V2 · Phần 6: Tinh chỉnh giao diện (Đợt 4)

> Đọc kèm `01-HOP-DONG-CHUNG.md` và `02-THIET-KE.md`. Làm **sau khi Phần 5 đã merge**.
>
> - **Phạm vi:** chỉ 3 việc dưới đây. **Mọi thứ khác giữ y nguyên**: bố cục, biểu đồ, màu, nút, lịch, các khối. Không tự thêm chỉnh sửa nào khác.
> - **File được sửa:** `src/v2/index.html`, `src/v2/css/*.css`, phần vẽ khung chào trong `src/v2/js/views/agenda.js`, lớp hoa (`flowers.js` của V2 hoặc file tương đương). Không đổi dữ liệu, `LP.api`, logic. Test cũ phải vẫn đạt.
> - **Ảnh tham khảo:** `docs/v2/anh/dot4-chao-ban-cu.png` (khung chào web cũ), `docs/v2/anh/dot4-phong-chu.png` (mẫu phông). Code web cũ: `src/js/views/today.js` (khối `.hello`, hàm `App.views.sun`), `src/css/style.css`.

## 1. Phông chữ: Quicksand (người dùng chọn 26/11)
- Một phông duy nhất **Quicksand** (500, 600, 700) cho tiêu đề, chữ thường và con số. Bỏ Baloo 2 và Nunito ở V2.
- `index.html`: `https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&display=swap`.
- `tokens.css`: `--font` và `--display` cùng là `'Quicksand', system-ui, sans-serif`. Thay mọi chỗ ghi thẳng `'Baloo 2'` hay `'Nunito'` trong CSS bằng biến.
- Con số: `font-weight: 700; font-variant-numeric: tabular-nums`.
- Giữ nguyên cỡ chữ và bố cục hiện có; chỉ chỉnh khi chữ bị tràn hay vỡ dòng do đổi phông.

## 2. Khung chào ở Agenda (giống web cũ)
- Đầu Agenda có thẻ `.ag-hello` **giống khung `.hello` của web cũ**: nền hồng nhạt pastel, lời chào lớn, nút ‹ › chọn ngày, hình bên phải, hoa nhỏ trang trí ở góc. Thay cho dòng tiêu đề ngày hiện tại (giữ chức năng ‹ › và nhãn "Hôm nay").
- Lời chào theo giờ: trước 11:00 "Chào buổi sáng!", 11:00–12:59 "Chào buổi trưa!", 13:00–17:59 "Chào buổi chiều!", từ 18:00 "Chào buổi tối!". Ngày khác hôm nay thì ghi "Agenda".
- Hình theo buổi, vẽ SVG cùng nét với `App.views.sun()` cũ:
  - Sáng và trưa: mặt trời cười (giữ nguyên hình cũ).
  - Chiều: mặt trời cười, thêm 1 đám mây nhỏ.
  - Tối: mặt trăng khuyết cười và 3 ngôi sao nhỏ.
- **Không có dòng tóm tắt** dưới lời chào.

## 3. Nền hồng nhạt và nhiều hoa rơi hơn
- Giữ nền hồng nhạt và lớp hoa, cánh hoa rơi như web cũ.
- **Tăng số hoa rơi** khoảng gấp đôi hiện tại, nhiều loại hoa như web cũ.
- Tôn trọng `prefers-reduced-motion`: hoa đứng yên.

## 4. Tiêu chí hoàn thành
1. `npm run test:v2 -- all` đạt hết.
2. Không còn chuỗi `Baloo` hay `Nunito` trong `src/v2/`.
3. Khung chào đúng 4 buổi (chạy với `now=08:30`, `12:00`, `15:00`, `20:30`), không có dòng tóm tắt.
4. Không lỗi trang trên 10 màn, sáng và tối.
5. Gửi người dùng ảnh **trước và sau** của Agenda ở 4 buổi và 2–3 màn khác để thấy phông mới; lưu vào `docs/v2/anh/dot4-*.png`.

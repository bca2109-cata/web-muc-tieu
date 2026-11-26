# V2 · Phần 6: Tinh chỉnh giao diện (Đợt 4)

> Đọc kèm `01-HOP-DONG-CHUNG.md` và `02-THIET-KE.md`. Làm **sau khi Phần 5 đã merge**.
>
> - **Phạm vi:** chỉ giao diện (CSS, markup trình bày, chữ hiển thị). Không đổi dữ liệu, không đổi `LP.api`, không đổi logic. Test cũ phải vẫn đạt; test dò chữ thì cập nhật theo chữ mới.
> - **File được sửa:** mọi file trong `src/v2/css/`, `src/v2/index.html`, `src/v2/js/core/ui.js` (phần vẽ), phần dựng HTML trong `src/v2/js/views/*.js`. Phiên này là phiên duy nhất đang chạy, nên được sửa file của mọi phần.
> - **Ảnh tham khảo:** `docs/v2/anh/dot4-*.png`. Web cũ: `src/js/views/today.js` (khối `.hello`, hàm `App.views.sun`), `src/js/flowers.js`, `src/css/style.css`.

Mục tiêu: **giữ đúng tinh thần Life Planner cũ** (hồng pastel, hoa bay, khung chào có mặt trời cười, giấy note) nhưng bớt các dấu hiệu "giao diện do AI làm": mọi thứ cùng một kiểu viên tròn hồng, màu đỏ phủ khắp nơi, khối to mà rỗng, chữ đủ cỡ lộn xộn.

## 1. Phông chữ: Quicksand (người dùng chọn 26/11)
- Một phông duy nhất **Quicksand** (500, 600, 700) cho tiêu đề, chữ thường và con số. Bỏ Baloo 2 và Nunito ở V2.
- `index.html`: `https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&display=swap` (có bộ chữ tiếng Việt).
- `tokens.css`: `--font` và `--display` cùng là `'Quicksand', system-ui, sans-serif`. Bỏ mọi chỗ ghi thẳng `'Baloo 2'` hay `'Nunito'` trong CSS.
- Con số: `font-weight: 700; font-variant-numeric: tabular-nums`.
- **Thang cỡ chữ cố định:** 12 / 13 / 15 / 17 / 21 / 28 (px), thêm 34 cho lời chào. Không dùng cỡ khác. Chữ nhỏ nhất 12px (kể cả nhãn trục biểu đồ, lịch tháng, ô ngày thói quen).
- Đậm: 500 chữ thường, 600 nhãn và nút, 700 tiêu đề và số.

## 2. Khung chào ở Agenda (đưa lại từ web cũ)
- Đầu cột trái Agenda có thẻ `.ag-hello` giống `.hello` của web cũ: nền giấy pastel, lời chào lớn, nút ‹ › chọn ngày ở giữa, hình bên phải, 2 bông hoa nhỏ trang trí ở góc.
- Lời chào theo giờ thật: trước 11:00 "Chào buổi sáng!", 11:00–12:59 "Chào buổi trưa!", 13:00–17:59 "Chào buổi chiều!", từ 18:00 "Chào buổi tối!". Ngày khác hôm nay thì ghi "Agenda".
- Hình theo buổi, vẽ SVG cùng nét với `App.views.sun()` cũ:
  - Sáng và trưa: **mặt trời cười** (giữ nguyên hình cũ).
  - Chiều: mặt trời cười hơi nghiêng xuống, có 1 đám mây nhỏ.
  - Tối: **mặt trăng khuyết cười** và 3 ngôi sao nhỏ; nền thẻ chuyển sang tím hồng nhạt (`--lav` hoặc tương đương trong tokens).
- Dưới lời chào một dòng tóm tắt: "11 việc hôm nay · 3 việc trễ giờ · hạn gần nhất 27/11 15:00". Lấy số từ dữ liệu, không ghi cứng.
- Nút "Đánh dấu ngày nghỉ" chuyển vào menu ⋯ của khung chào, không còn là nút to ở đầu trang.

## 3. Hoa bay giữ nguyên, nhưng nằm sau nội dung
- Giữ lớp hoa và cánh hoa bay của web cũ.
- Lớp hoa nằm **dưới** mọi thẻ (`z-index` thấp hơn `.card`, thẻ có nền đặc), nên không bao giờ đè lên chữ, ô lịch hay bảng.
- Giảm khoảng một nửa số hoa ở giữa trang; hoa tập trung ở hai lề và đầu trang.
- Tôn trọng `prefers-reduced-motion`: hoa đứng yên.

## 4. Agenda: việc hôm nay lên màn đầu tiên
- Logo nhỏ lại (chữ "Life Planner" cao khoảng 28px, bỏ gạch sóng dưới logo ở các màn trong; giữ ở màn Cài đặt nếu muốn).
- **Bỏ 3 thẻ biểu đồ to.** Thay bằng một **dải số liệu** cao khoảng 72–96px ngay dưới khung chào: vòng nhỏ x/y hoàn thành · số việc trễ · Quỹ Personal · 6 cột nhỏ 6 ngày gần nhất · dòng "N mục tồn chưa xử lý · Xử lý". Bấm dải thì mở rộng xem 3 biểu đồ đầy đủ như hiện nay.
- Bỏ khối "Tiến độ theo khối" (đã có x/y ở đầu mỗi thẻ).
- Ở màn 1280×800, dòng việc đầu tiên phải nằm trong màn hình đầu, không cần cuộn.

## 5. Bớt màu đỏ
- Đỏ (`--q1`) chỉ dùng cho: pill "Trễ …", giờ của mục trễ, hạn chót đã qua. **Tên việc luôn màu chữ thường**, kể cả khi trễ.
- Trái tim mức quan trọng dùng hồng nhạt hơn (`--accent` pha nhạt), cỡ 12px.
- Nhãn "Tồn từ dd/mm" giữ nền `--butter`.
- Không quá 1 nút nền hồng đậm trên mỗi màn (nút chính). Nút khác là nút viền hoặc nút chữ.

## 6. Nút và dòng gọn
- Mọi nút thao tác trên một dòng việc ("Bỏ qua", "Bỏ giờ", "Đặt giờ", ô chọn giờ) nằm **cuối dòng**, cùng một cỡ nhỏ (cao 28px), không xuống dòng riêng.
- **Soát cuối ngày:** mỗi mục 1 dòng: tên và giờ bên trái, 3 nút nhỏ "Đã làm / Mang sang mai / Bỏ qua" bên phải.
- Bảng Toàn cảnh: các dòng cao đều nhau.

## 7. Kích thước khối có ý nghĩa
- Khối nhiều mục (Daily) rộng hơn; Ad-hoc, Personal, Thói quen xếp cột hẹp hơn. Khối rỗng không chiếm chỗ: ẩn hoặc thu thành 1 dòng "Không có Personal hôm nay".
- Thẻ không có khoảng trống lớn bên trong. Bỏ chiều cao cố định khiến thẻ dài hơn nội dung.
- Bo góc theo thang: 22px khối lớn, 14px thẻ nhỏ, 10px nút, 99px chỉ cho pill nhãn.

## 8. Lịch
- **Lịch tháng:** ghi thẳng tên hạn chót trong ô ("Hạn · BC nguồn T11", tối đa 2 dòng, quá thì "+N"). Dấu ✓ và ! to hơn (16px). Thêm 1 dòng chú giải dưới lưới: ✓ đủ Daily · ! có Daily bị sót · chữ đỏ là hạn chót.
- **Lịch tuần:** khung giờ bắt đầu từ (giờ sớm nhất có mục trong tuần − 1 tiếng), mặc định 07:00, kết thúc 22:00. Nhãn "Cả ngày" trên 1 dòng.

## 9. Bản tối
- Mọi chữ đạt tương phản ≥ 4.5:1 (chữ ≥ 18px hoặc đậm ≥ 14px: ≥ 3:1). Sửa con số trong thanh cam của Tổng kết (đang 2.3:1).
- Hoa ở bản tối giảm độ đậm.

## 10. Tiêu chí hoàn thành
1. `npm run test:v2 -- all` đạt hết.
2. Không còn chuỗi `Baloo` hay `Nunito` trong `src/v2/`.
3. Script đo (playwright) trên 10 màn, sáng và tối, 1280px: không chữ nào < 12px, không chữ nào dưới ngưỡng tương phản, không lỗi trang.
4. Agenda 1280×800: dòng việc đầu tiên nằm trên 800px.
5. Khung chào đúng 4 buổi (chạy với `now=08:30`, `12:00`, `15:00`, `20:30`).
6. Gửi người dùng ảnh **trước và sau** của: Agenda (sáng và tối), Toàn cảnh, Soát, Lịch tuần, Lịch tháng, Tổng kết; lưu vào `docs/v2/anh/dot4-*.png`.

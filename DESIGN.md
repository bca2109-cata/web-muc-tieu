# DESIGN.md: Life Planner

Phong cách: sổ kế hoạch dễ thương, tông hồng pastel, nhiều hoa và giấy note. Đã duyệt ngày 21/11/2026 (bản xem trước `docs/de-xuat-giao-dien/preview3.html`). Mã màu chuẩn nằm ở mục 7 của `SPEC.md` và trong `src/css/style.css`. Trang thiết kế chỉ dùng tên biến, không viết thẳng mã màu.

## Màu

| Biến | Vai trò |
|---|---|
| `--bg` | Nền trang, hồng rất nhạt |
| `--surface` | Nền thẻ, danh sách, hộp thoại |
| `--ink` | Chữ chính, nút đang chọn màu đậm |
| `--muted` | Chữ phụ, icon phụ (5.9:1 trên nền trắng) |
| `--line` | Viền, đường chấm giữa các dòng, bóng thẻ |
| `--accent`, `--accent-deep` | Nút chính, tab đang mở, **trái tim mức quan trọng**, chữ LIFE PLANNER |
| `--accent-soft` | Nền tab đang mở, nhãn ưu tiên Cao |
| `--butter`, `--mint`, `--sky` | Nền 3 tờ giấy note Top 3 |
| `--work`, `--study`, `--health` (+ `-bg`) | Nhóm mục tiêu Công việc, Học tập, Sức khỏe |
| `--q1`…`--q4` (+ `-bg`, `-bar`) | 4 ô ma trận: Làm ngay, Lên lịch, Làm nhanh, Để sau |
| `--hot`, `--warm`, `--calm` (+ `-bg`) | Nhãn "Còn N ngày" của mục tiêu: dưới 4 ngày, dưới 11 ngày, còn thong thả |
| `--ok`, `--pr`, `--warn` (+ `-bar`) | Tiến độ: đạt, gần đạt, cần chú ý |

Quy tắc một nghĩa:
- Đỏ (`--q1`, `--hot`, `--warn`) chỉ để nói "gấp" hoặc "cần chú ý".
- Ngôi sao chỉ là Top 3. Trái tim hồng chỉ là mức quan trọng của mục tiêu.
- Chữ trên nền màu luôn dùng biến đậm cùng họ (ví dụ `--q1` trên `--q1-bg`), đạt tối thiểu 4.5:1.

Chế độ tối (làm ở Giai đoạn 4): giữ tên biến, đổi giá trị. Nền `#22151f`, thẻ `#2e1d2a`, chữ `#fff1f7`, chữ phụ `#d9bfcd`, viền `#46303f`, accent `#ff8fb8`. Các nền pastel `-bg` đổi thành màu cùng họ độ sáng 20 đến 25%, chữ trên đó dùng bản sáng của màu gốc.

## Chữ

| Kiểu | Font | Cỡ / độ đậm |
|---|---|---|
| Chữ LIFE PLANNER | Baloo 2 | 28 đến 52px (co theo màn hình), 800, có gạch lượn sóng hồng |
| Tiêu đề trang | Baloo 2 | 24px, 800 |
| Tiêu đề khối | Baloo 2 | 19px, 700 |
| Tên thẻ mục tiêu | Baloo 2 | 18px, 700 |
| Chữ thường | Nunito | 16px, 600 |
| Nhãn, chữ phụ | Nunito | 12 đến 14px, 700 đến 800 |
| Con số | Nunito, `tabular-nums` | đậm 800; số % lớn dùng Baloo 2 22px |

## Khoảng cách, hình khối

- Lưới 4px. Lề trang 16px. Khoảng giữa các khối 20px.
- Bo góc: thẻ 22px, ô icon 12px, ô nhập 14px, nút tròn, pill và thanh tiến độ 99px.
- Bóng thẻ: `0 4px 0 var(--line)` cộng một bóng hồng rất nhẹ. Nút chính có bóng đặc phía dưới (`--accent-deep`) như nút bấm thật.
- Ngưỡng: 620px (thẻ mục tiêu 2 cột), 900px (thanh tab lên trên, Hôm nay 2 cột).

## Thành phần

- **Nút tick**: hình tròn 30px, vùng bấm 44px, luôn nằm bên trái. Viền hồng đậm, xong thì nền `--ok` có dấu tick trắng.
- **Dòng task**: vạch màu bên trái theo ô ma trận, ô icon 38px cùng màu, tên việc, hàng nhãn gồm ô ma trận, hạn, ưu tiên và mục tiêu. Ngôi sao Top 3 ở bên phải.
- **Top 3**: 3 tờ giấy note màu bơ, bạc hà, da trời, xoay nhẹ, có số thứ tự và một bông hoa ghim. Ô trống là khung nét đứt.
- **Ma trận**: lưới 2×2, mỗi ô có icon, tên ô, số việc chưa xong. Tên việc dài thì cắt bằng "…".
- **Thẻ mục tiêu**: băng dính washi sọc theo màu nhóm, sticker icon nhóm xoay nghiêng, nhãn kỳ, nhãn "Còn N ngày", trái tim, thanh tiến độ có sọc chéo, câu trạng thái ("Cần tăng tốc", "Sắp tới đích", "Đạt rồi, giỏi quá!").
- **Nút**: chính (nền accent, chữ trắng, bóng đặc), phụ (nền trắng, viền accent nhạt), nguy hiểm (chữ đỏ). Nút nào cũng có icon.
- **Thông báo**: viên thuốc màu `--ink`, chữ trắng, ở đáy màn hình. Thông báo chúc mừng có 2 bông hoa phía trước.

## Hình ảnh và icon

- Icon nét tròn, stroke 2, lưới 24, vẽ inline SVG trong `src/js/ui.js`. Không dùng emoji.
- 12 loại hoa vẽ SVG (`src/js/flowers.js`): cúc, anh đào, tulip, hồng, hướng dương, oải hương, lưu ly, sứ, cánh bướm, chuông, cẩm tú cầu, cành lá. Cánh hoa nhận màu theo `color`, nhụy và lá có màu cố định.
- Hình nền "Hoa bay nhẹ": khoảng 22 bông, độ mờ 0.2, đung đưa chậm 9 đến 19 giây. Tắt chuyển động khi máy bật "giảm chuyển động".
- Ăn mừng: 32 bông hoa bung ra từ nút tick rồi rơi xuống trong khoảng 1.5 giây. Mục tiêu đạt 100% thì 56 bông bung từ giữa màn hình.

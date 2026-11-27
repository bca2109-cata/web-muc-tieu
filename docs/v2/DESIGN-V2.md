# Giao diện V2: bản làm mới 27/11/2026 (chờ duyệt)

Mục tiêu: bớt cảm giác "AI làm", giữ cá tính sổ tay (giấy, băng dính, hoa). Mọi thay đổi nằm trong `src/v2/css/lam-moi.css` (nạp sau cùng, chỉ ghi đè). Gỡ file này và dòng `<link>` là về bản cũ.

## Màu
- **Chủ đạo là hồng** (giữ bộ màu hồng của `tokens.css`: nền, nút, nhãn, logo, số chính, đường kẻ). Bản tối cũng giữ tông hồng đậm.
- Màu khác chỉ để phối: mỗi tab một màu riêng (Agenda hồng, Lịch vàng, Ghi chú xanh lá, Mục tiêu tím, Tổng kết xanh biển), cộng màu nhóm và biểu đồ có sẵn.

- **Biểu đồ và nội dung nhiều màu** (bảng `--v1…--v7`: hồng, cam, vàng, xanh lá, xanh dương, tím, xanh ngọc): mỗi khối Tổng kết một màu tiêu đề; hạng Daily bị sót, thanh Chen ngang, vòng thói quen mỗi mục một màu; khối Daily ở Agenda có vạch trái và tiêu đề màu riêng; thanh tiến độ Mục tiêu theo màu nhóm; điểm biểu đồ xanh khi đạt mốc, cam khi dưới mốc.

## Chữ
- Tiêu đề và số lớn: Mali 700 (`--display`). Còn lại Quicksand.

## Hình khối
- Thẻ, ô nhập: bo 8px. Hộp thoại, menu nổi: 12px. Hình viên thuốc chỉ cho nút lọc, nhãn nhỏ, thanh tab dưới cùng.
- Nét đứt chỉ còn ở chỗ trống / chỗ thả (khung "Chưa có ngày", ô kéo thả). Đường ngăn khác là nét liền.
- Bóng: thẻ phẳng, chỉ viền 1.5px. Bóng nổi (`--lift`) chỉ cho hộp thoại, menu, thông báo, thanh tab dưới cùng, thẻ mục tiêu khi rê chuột.
- Giữ nguyên: nền hoa rơi, băng dính washi, nút giấy xé, giấy note, bình hoa tulip.

## Hoa
- 9 loại hoa vẽ lại trong `js/core/flowers.js`: cánh chồng 2 lớp, đổ bóng, gân cánh, nhụy có chi tiết (hạt hướng dương xếp xoắn ốc, nhị anh đào, chùm cẩm tú cầu). Màu vẫn theo `color` của cánh.

## Nội dung
- Lời chào Agenda nói số việc thật: "Hôm nay còn 8 việc cần làm."
- Ghi chú trống: nét vẽ tay cuốn sổ và cây bút, câu chỉ dẫn cụ thể.
- Tổng kết: số chính (Hoàn thành) rất to, ba số phụ nhỏ; tiêu đề khối chỉ chữ có đường kẻ đậm; đường biểu đồ màu mực đậm, nền vùng ≥ 80% gần như bỏ.

## Tên mới và tiêu đề (27/11)
- Tên web: **Plan With Love, Life With Joy** (thẻ trình duyệt, tên khi cài ra màn hình, trang giới thiệu).
- Tiêu đề hai nhịp: "Plan With Love♥," (Love hồng, trái tim đập) và "Life With Joy☀" (Joy cam, mặt trời xoay tia, bông anh đào lắc). Quanh chữ có hạt lấp lánh và trái tim nhỏ bay lên; đường lượn bên dưới chuyển từ hồng sang cam vàng.
- Biểu tượng sổ tay: trái tim thay bông cúc, mặt trời nhỏ ở góc. Mọi chuyển động tắt khi máy bật "giảm chuyển động"; hạt và trái tim nhỏ ẩn khi cuộn trang.
- Chưa đổi: biểu tượng ứng dụng PNG (icons/), tên Sheet dữ liệu, web cũ.

## Khung chào "Thứ Sáu, 27/11" (27/11)
- Cờ tam giác nhiều màu treo dọc mép trên (đung đưa nhẹ), cầu vồng và mây trôi sau mặt trời, hạt lấp lánh, chấm màu, trái tim nhỏ bay lên. Ngày/tháng có vệt tô vàng.
- Tắt chuyển động khi máy bật "giảm chuyển động". Code: `helloDeco()` trong `js/views/agenda.js`, CSS mục 8 của `css/lam-moi.css`.

## Khung chào: vòng trang trí thêm
- Bóng bay hồng/xanh/vàng đung đưa (`.ag-balloon`), ẩn ở màn hình ≤560px để không đè nút chọn ngày.
- Hoa giấy nhiều màu rơi chậm (`.ag-cf`), sao băng thỉnh thoảng lướt qua (`.ag-shoot`), mặt trời xoay rất chậm.
- Lịch: ô tiêu đề của ngày hôm nay có hai ngôi sao nhỏ lấp lánh.
- Mọi chuyển động tắt khi máy bật "giảm chuyển động".

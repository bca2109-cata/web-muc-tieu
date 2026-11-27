# Giao diện V2: bản làm mới 27/11/2026 (chờ duyệt)

Mục tiêu: bớt cảm giác "AI làm", giữ cá tính sổ tay (giấy, băng dính, hoa). Mọi thay đổi nằm trong `src/v2/css/lam-moi.css` (nạp sau cùng, chỉ ghi đè). Gỡ file này và dòng `<link>` là về bản cũ.

## Màu
- Nền kem trung tính `#fffdf8`, chữ `#221b33`, đường kẻ `#ece4d6`. Bản tối tím than `#16131f` (không còn mận hồng).
- **Mỗi màn một màu nhấn**, đặt bằng `data-route` trên `<html>` (router.js):
  Agenda cam `#e04a1c`, Lịch xanh biển `#0b7fb8`, Ghi chú xanh lá `#10935d`, Mục tiêu tím `#7448f2`, Tổng kết vàng `#e5a000`, Cài đặt xám xanh `#55627f`.
  Mỗi màu có 3 giá trị: nhấn, nền nhạt, chữ đậm (đủ tương phản 4.5:1 trên nền trắng).
- Tab trên cùng mỗi tab một màu riêng. Nút giấy, nút lọc, nhãn, logo đều theo màu nhấn của màn.

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

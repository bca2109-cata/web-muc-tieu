# Tiến độ V2

> Mỗi phần chỉ thêm hoặc sửa đúng mục của mình. Phiên điều phối cập nhật bảng tổng.

| Đợt | Phần | Nhánh | Trạng thái | PR | Ghi chú |
|---|---|---|---|---|---|
| 0 | Khung chung | v2/khung | Chờ duyệt | (xem PR) | Test `core` 25/25. Chưa tạo Sheet V2 thật (làm theo `TRIEN-KHAI-SHEET.md`) |
| 1 | 1 · Agenda + Soát | v2/phan-1 | Chờ duyệt | (xem PR) | Test `phan-1` 35/35, `core` 25/25. Luồng hôm nay lên đầu: mục đã quyết (+1, mang sang, đã xếp giờ) nằm trong khối của nó, nhãn 'Tồn từ'; mục sót chưa quyết chỉ còn dòng mảnh dẫn tới Tồn tổng `#/agenda?ton=1`; vòng hoàn thành không đếm mục sót; trạng thái Hủy cho việc (sửa phần chung theo yêu cầu, xem YEU-CAU-CHUNG 4, 6, 7). Soát mở bằng `#/agenda?soat=1`. Xem YEU-CAU-CHUNG mục 1-5 |
| 1 | 2 · Lịch | v2/phan-2 | Xong, chờ duyệt (25/11/2026) | Tuần: kéo thả, hoàn tác 10s, menu ⋯, lọc quan trọng, cột Chưa có ngày. Tháng: ✓/!/Nghỉ, chấm hạn chót, thanh khoảng ngày. Test: 9 đạt | Xem YEU-CAU-CHUNG P2-1, P2-2 |
| 2 | 3 · Ghi chú | v2/phan-3 | Chưa bắt đầu | | |
| 2 | 4 · Mục tiêu + Tổng kết | v2/phan-4 | Xong, chờ duyệt (26/11/2026) | (xem PR) | Test `phan-4` 11/11. Mục tiêu: thẻ washi, lọc kỳ/nhóm, tiến độ theo việc hoặc số nhập tay, thêm/sửa/xóa mềm. Thói quen: lưới 7 ngày, chuỗi, thêm/sửa/xóa. Tổng kết: 5 khối, 4 kỳ có ‹ ›, so kỳ trước, bấm cột/dòng mở chi tiết, nhìn lại lưu vào Reviews. Ảnh: `docs/v2/anh/p4-*.png` |
| 3 | 5 · Mẫu + Cài đặt | v2/phan-5 | Chưa bắt đầu | | |

## Ghép Đợt 1 (nhánh v2/ghep-dot-1)
- Đổi chữ giao diện theo mục 6b: Daily, Ad-hoc, Personal, Chen ngang (nút "+", khối Agenda, Soát, Tồn tổng, tìm kiếm, tiêu đề màn Mẫu, quỹ giờ). Không đổi tên cột hay giá trị Sheet.
- Xử lý YEU-CAU-CHUNG: 1, 2, 5, 7, P2-1, P2-2, P2-3 xong; 3 chờ Phần 5.
- Test `all`: core 25, phan-1 35, phan-2 16 đạt. Test cũ được cập nhật theo tên mới. Agent `v2-kiem-thu` chạy một lần cho toàn web.

## Đề xuất (chờ người dùng duyệt)
- (Phần 4) Tỷ lệ hoàn thành ở Tổng kết hiện chỉ tính Daily vì `LP.stats.completion` chưa gồm Ad-hoc/Personal. Spec ghi "tính cả công việc cố định và việc": cần quyết định có gộp việc vào tỷ lệ không (xem YEU-CAU-CHUNG P4-1).
- Hiện ô "Quỹ giờ" ở Agenda theo cả hai quỹ (ad-hoc và buổi tối). Cần Phần 1 xác nhận cách hiện.
- Thông báo nhắc việc (`LP.notify`) mới có khung. Nối lịch nhắc cụ thể nếu người dùng muốn.

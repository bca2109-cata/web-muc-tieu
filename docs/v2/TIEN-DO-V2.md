# Tiến độ V2

> Mỗi phần chỉ thêm hoặc sửa đúng mục của mình. Phiên điều phối cập nhật bảng tổng.

| Đợt | Phần | Nhánh | Trạng thái | PR | Ghi chú |
|---|---|---|---|---|---|
| 0 | Khung chung | v2/khung | Chờ duyệt | (xem PR) | Test `core` 25/25. Chưa tạo Sheet V2 thật (làm theo `TRIEN-KHAI-SHEET.md`) |
| 1 | 1 · Agenda + Soát | v2/phan-1 | Chờ duyệt | (xem PR) | Test `phan-1` 31/31, `core` 25/25. Vòng tròn = cố định + việc hôm nay + tồn trong 7 ngày. Từ hôm qua 7 ngày, màn Tồn tổng `#/agenda?ton=1`, trạng thái Hủy cho việc (sửa phần chung theo yêu cầu, xem YEU-CAU-CHUNG 4, 6, 7). Soát mở bằng `#/agenda?soat=1`. Xem YEU-CAU-CHUNG mục 1-5 |
| 1 | 2 · Lịch | v2/phan-2 | Chưa bắt đầu | | |
| 2 | 3 · Ghi chú | v2/phan-3 | Chưa bắt đầu | | |
| 2 | 4 · Mục tiêu + Tổng kết | v2/phan-4 | Chưa bắt đầu | | |
| 3 | 5 · Mẫu + Cài đặt | v2/phan-5 | Chưa bắt đầu | | |

## Đề xuất (chờ người dùng duyệt)
- Hiện ô "Quỹ giờ" ở Agenda theo cả hai quỹ (ad-hoc và buổi tối). Cần Phần 1 xác nhận cách hiện.
- Thông báo nhắc việc (`LP.notify`) mới có khung. Nối lịch nhắc cụ thể nếu người dùng muốn.

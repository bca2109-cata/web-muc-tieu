# Tiến độ V2

> Mỗi phần chỉ thêm hoặc sửa đúng mục của mình. Phiên điều phối cập nhật bảng tổng.

| Đợt | Phần | Nhánh | Trạng thái | PR | Ghi chú |
|---|---|---|---|---|---|
| 0 | Khung chung | v2/khung | Chờ duyệt | (xem PR) | Test `core` 25/25. Chưa tạo Sheet V2 thật (làm theo `TRIEN-KHAI-SHEET.md`) |
| 1 | 1 · Agenda + Soát | v2/phan-1 | Chờ duyệt | (xem PR) | Test `phan-1` 35/35, `core` 25/25. Luồng hôm nay lên đầu: mục đã quyết (+1, mang sang, đã xếp giờ) nằm trong khối của nó, nhãn 'Tồn từ'; mục sót chưa quyết chỉ còn dòng mảnh dẫn tới Tồn tổng `#/agenda?ton=1`; vòng hoàn thành không đếm mục sót; trạng thái Hủy cho việc (sửa phần chung theo yêu cầu, xem YEU-CAU-CHUNG 4, 6, 7). Soát mở bằng `#/agenda?soat=1`. Xem YEU-CAU-CHUNG mục 1-5 |
| 1 | 2 · Lịch | v2/phan-2 | Xong, chờ duyệt (25/11/2026) | Tuần: kéo thả, hoàn tác 10s, menu ⋯, lọc quan trọng, cột Chưa có ngày. Tháng: ✓/!/Nghỉ, chấm hạn chót, thanh khoảng ngày. Test: 9 đạt | Xem YEU-CAU-CHUNG P2-1, P2-2 |
| 2 | 3 · Ghi chú | v2/phan-3 | Xong, chờ duyệt (26/11/2026) | (xem PR) | Test `phan-3` 19/19, `core` 25/25. 3 cột (danh sách, khung soạn 720px, mục lục + tìm trong tài liệu); điện thoại đi từng tầng. Trình soạn contenteditable: H1-H3, đậm, nghiêng, danh sách, đánh số, việc cần làm, bảng, link, khung chú ý, phím tắt Markdown, dán Word/Docs đã lọc. Tự lưu 2 giây, nháp localStorage, hỏi 'Giữ bản nào?' khi lệch. Gắn tiêu đề với Daily / Ad-hoc / Personal, bôi đen 'Tạo việc'. `LP.views.openDoc`. Thùng rác + khôi phục. `Docs.gs`: docsIndex, docGet, docSave, docDelete, chia đoạn 45.000 ký tự. Ảnh: `docs/v2/anh/p3-*.png`. Xem YEU-CAU-CHUNG P3-1 đến P3-4 |
| 2 | 4 · Mục tiêu + Tổng kết | v2/phan-4 | Chưa bắt đầu | | |
| 3 | 5 · Mẫu + Cài đặt | v2/phan-5 | Chưa bắt đầu | | |

## Ghép Đợt 1 (nhánh v2/ghep-dot-1)
- Đổi chữ giao diện theo mục 6b: Daily, Ad-hoc, Personal, Chen ngang (nút "+", khối Agenda, Soát, Tồn tổng, tìm kiếm, tiêu đề màn Mẫu, quỹ giờ). Không đổi tên cột hay giá trị Sheet.
- Xử lý YEU-CAU-CHUNG: 1, 2, 5, 7, P2-1, P2-2, P2-3 xong; 3 chờ Phần 5.
- Test `all`: core 25, phan-1 35, phan-2 16 đạt. Test cũ được cập nhật theo tên mới. Agent `v2-kiem-thu` chạy một lần cho toàn web.

## Đề xuất (chờ người dùng duyệt)
- Hiện ô "Quỹ giờ" ở Agenda theo cả hai quỹ (ad-hoc và buổi tối). Cần Phần 1 xác nhận cách hiện.
- Thông báo nhắc việc (`LP.notify`) mới có khung. Nối lịch nhắc cụ thể nếu người dùng muốn.

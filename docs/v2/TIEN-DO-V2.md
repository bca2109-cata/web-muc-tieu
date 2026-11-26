# Tiến độ V2

> Mỗi phần chỉ thêm hoặc sửa đúng mục của mình. Phiên điều phối cập nhật bảng tổng.

| Đợt | Phần | Nhánh | Trạng thái | PR | Ghi chú |
|---|---|---|---|---|---|
| 0 | Khung chung | v2/khung | Chờ duyệt | (xem PR) | Test `core` 25/25. Chưa tạo Sheet V2 thật (làm theo `TRIEN-KHAI-SHEET.md`) |
| 1 | 1 · Agenda + Soát | v2/phan-1 | Chờ duyệt | (xem PR) | Test `phan-1` 35/35, `core` 25/25. Luồng hôm nay lên đầu: mục đã quyết (+1, mang sang, đã xếp giờ) nằm trong khối của nó, nhãn 'Tồn từ'; mục sót chưa quyết chỉ còn dòng mảnh dẫn tới Tồn tổng `#/agenda?ton=1`; vòng hoàn thành không đếm mục sót; trạng thái Hủy cho việc (sửa phần chung theo yêu cầu, xem YEU-CAU-CHUNG 4, 6, 7). Soát mở bằng `#/agenda?soat=1`. Xem YEU-CAU-CHUNG mục 1-5 |
| 1 | 2 · Lịch | v2/phan-2 | Xong, chờ duyệt (25/11/2026) | Tuần: kéo thả, hoàn tác 10s, menu ⋯, lọc quan trọng, cột Chưa có ngày. Tháng: ✓/!/Nghỉ, chấm hạn chót, thanh khoảng ngày. Test: 9 đạt | Xem YEU-CAU-CHUNG P2-1, P2-2 |
| 2 | 3 · Ghi chú | v2/phan-3 | Đã merge (26/11/2026) | (xem PR) | Test `phan-3` 19/19, `core` 25/25. 3 cột (danh sách, khung soạn 720px, mục lục + tìm trong tài liệu); điện thoại đi từng tầng. Trình soạn contenteditable: H1-H3, đậm, nghiêng, danh sách, đánh số, việc cần làm, bảng, link, khung chú ý, phím tắt Markdown, dán Word/Docs đã lọc. Tự lưu 2 giây, nháp localStorage, hỏi 'Giữ bản nào?' khi lệch. Gắn tiêu đề với Daily / Ad-hoc / Personal, bôi đen 'Tạo việc'. `LP.views.openDoc`. Thùng rác + khôi phục. `Docs.gs`: docsIndex, docGet, docSave, docDelete, chia đoạn 45.000 ký tự. Ảnh: `docs/v2/anh/p3-*.png`. Xem YEU-CAU-CHUNG P3-1 đến P3-4 |
| 2 | 4 · Mục tiêu + Tổng kết | v2/phan-4 | Đã merge (26/11/2026) | (xem PR) | Test `phan-4` 11/11. Mục tiêu: thẻ washi, lọc kỳ/nhóm, tiến độ theo việc hoặc số nhập tay, thêm/sửa/xóa mềm. Thói quen: lưới 7 ngày, chuỗi, thêm/sửa/xóa. Tổng kết: 5 khối, 4 kỳ có ‹ ›, so kỳ trước, bấm cột/dòng mở chi tiết, nhìn lại lưu vào Reviews. Ảnh: `docs/v2/anh/p4-*.png` |
| 3 | 5 · Mẫu + Cài đặt | v2/phan-5 | Chưa bắt đầu | | |

## Ghép Đợt 1 (nhánh v2/ghep-dot-1)
- Đổi chữ giao diện theo mục 6b: Daily, Ad-hoc, Personal, Chen ngang (nút "+", khối Agenda, Soát, Tồn tổng, tìm kiếm, tiêu đề màn Mẫu, quỹ giờ). Không đổi tên cột hay giá trị Sheet.
- Xử lý YEU-CAU-CHUNG: 1, 2, 5, 7, P2-1, P2-2, P2-3 xong; 3 chờ Phần 5.
- Test `all`: core 25, phan-1 35, phan-2 16 đạt. Test cũ được cập nhật theo tên mới. Agent `v2-kiem-thu` chạy một lần cho toàn web.

## Đề xuất (chờ người dùng duyệt)
- (Phần 4) Tỷ lệ hoàn thành ở Tổng kết hiện chỉ tính Daily vì `LP.stats.completion` chưa gồm Ad-hoc/Personal. Spec ghi "tính cả công việc cố định và việc": cần quyết định có gộp việc vào tỷ lệ không (xem YEU-CAU-CHUNG P4-1).
- Hiện ô "Quỹ giờ" ở Agenda theo cả hai quỹ (ad-hoc và buổi tối). Cần Phần 1 xác nhận cách hiện.
- Thông báo nhắc việc (`LP.notify`) mới có khung. Nối lịch nhắc cụ thể nếu người dùng muốn.

## Ghép Đợt 2 (nhánh v2/ghep-dot-2)
- Xử lý YEU-CAU-CHUNG P3-1, P3-2, P3-4, P4-1 (xong). P3-3 và P4-2 để Phần 5.
- P4-1 (người dùng chọn gộp 26/11): tỷ lệ hoàn thành = Daily + Ad-hoc + Personal, mỗi mục tính một, cùng cách với vòng "Hoàn thành hôm nay" ở Agenda. `LP.stats.completion` thêm `rDone/rTotal`, `tDone/tTotal`; thêm `LP.stats.taskCounts(d)`. Agenda (cột 6 ngày) và Tổng kết dùng cùng số. Tổng kết: ô "Hoàn thành", chú thích biểu đồ và chi tiết ngày đã cập nhật; "bỏ sót" vẫn chỉ của Daily.
- P3-1/2/4: mock trả cả tài liệu đã xóa, `LP.api.docDelete`, `docSave` kiểm `base_updated_at`/`force`; `LP.ui.docSheet` mở bản có định dạng (`LP.views.openDoc`); bỏ các hàm `tam_` trong ghi-chu.js.
- Test `all`: 106/106 đạt ở lượt agent `v2-kiem-thu` (một lần, không lỗi Cao/Trung bình). Lưu ý: chạy `all` đôi khi 1-2 test hết thời gian chờ ngẫu nhiên do trình duyệt sập; chạy riêng từng phần thì đạt. Test phan-1 sửa theo tài liệu hiện đủ có định dạng.
- Còn lại mức Thấp: hàm `tam_overdueStep` trong agenda.js (Phần 1) chưa chuyển vào core.

## Phần 6 · Tinh chỉnh giao diện (nhánh v2/phan-6, đã merge 26/11/2026)
- Phông Quicksand 500/600/700 cho toàn V2, bỏ Baloo 2 và Nunito. Test `core` (tokens) bỏ qua 2 dòng `--font`, `--display`.
- Khung chào `.ag-hello` ở Agenda gọn như web cũ: lời chào theo buổi (sáng, trưa: mặt trời; chiều: thêm mây; tối: trăng và 3 sao), nút ‹ › tròn, ô "Hôm nay / ngày". Nhãn và nút ngày nghỉ nằm ngoài khung.
- Hoa rơi gấp đôi: 180 bông (90 khi rộng dưới 620px).
- Test `all` 106/106. Ảnh: `docs/v2/anh/dot4-sau-*.png`.

## Trang giới thiệu (nhánh v2/gioi-thieu, đã merge 26/11/2026)
- `src/v2/gioi-thieu.html` + `css/gioi-thieu.css` (tiền tố `.gt-`), ảnh trong `src/v2/img/gioi-thieu/`. Trang riêng, chỉ người dùng xem, nút "Mở Life Planner" vào Agenda.
- Đã kiểm 390 / 820 / 1280px, sáng và tối, bàn phím. Ảnh: `docs/v2/anh/gioi-thieu-*.png`.

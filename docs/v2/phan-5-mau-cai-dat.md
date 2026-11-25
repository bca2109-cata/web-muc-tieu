# V2 · Phần 5: Mẫu công việc, Cài đặt, nút "+"

> Đọc kèm `01-HOP-DONG-CHUNG.md` và `02-THIET-KE.md`.
>
> - **File sở hữu:** `js/views/mau-cong-viec.js`, `js/views/cai-dat.js`, `js/views/them-nhanh.js`, `css/cai-dat.css`, `tests-qa/v2/phan-5.js`.
> - Bố cục tham khảo canvas: "Cài đặt · Mẫu công việc".

## 1. Mẫu công việc (route `mau`, mở từ Cài đặt)
- **Cột trái:** danh sách mẫu, chia Công việc / Cá nhân, có số hạng mục và lịch lặp. Nút "+ Mẫu mới".
- **Form sửa mẫu:**
  - Tên, nhóm, ghi chú gắn kèm (chọn tài liệu và mục qua `docsIndex`), mức quan trọng (trái tim), mốc "xong trước".
  - **Lặp lại:**
    - **Theo thứ:** chip T2…CN, mặc định T2–T7.
    - **Theo khoảng ngày trong tháng:** từ ngày … đến ngày ….
  - **Hạng mục:** danh sách kéo được để đổi thứ tự. Mỗi hạng mục có: giờ (tùy chọn), tên, **Cùng ngày / +1 ngày**, thời lượng ước tính, lưu ý ngắn, link. Có nút "+ Thêm hạng mục".
  - **Áp dụng:** Từ hôm nay / Từ ngày mai. Lưu theo quy tắc `valid_from`/`valid_to` ở hợp đồng mục 5.
  - Tạm dừng hoặc xóa mẫu. Lịch sử cũ giữ nguyên.
- **Sửa nhanh từ Agenda:** hàm `LP.views.editItemQuick(routineId, itemId)` mở tấm trượt sửa giờ hoặc tên, hỏi "Chỉ hôm nay / Từ nay về sau". Đăng ký vào `window.LP.views`.

## 2. Cài đặt (route `cai-dat`, mở từ bánh răng)
- **Ngày làm việc:** giờ bắt đầu, giờ kết thúc, nghỉ trưa, giờ tối, quỹ việc riêng mỗi ngày (mặc định 3h) và buổi tối (mặc định 1h30).
- **Ngày nghỉ:** danh sách, thêm trước nhiều ngày.
- **Thông báo:** bật/tắt, xin quyền thông báo trình duyệt.
- **Giao diện:** sáng / tối / theo máy. Hoa rơi: Luôn bật / Theo máy / Tắt.
- **Kết nối:** mã bí mật, trạng thái kết nối Sheet.
- **Dữ liệu:** sao lưu và khôi phục JSON. Thùng rác (việc và tài liệu).

## 3. Nút "+" (`them-nhanh.js`)
Menu gồm:
- **Việc ad-hoc:** tên, người đặt, hạn chót (ngày, giờ), ngày làm (gợi ý sẵn bằng `LP.logic.tasks.suggestDoDate`), mức quan trọng, bước con (mỗi bước có ngày làm riêng), tài liệu gắn kèm.
- **Việc cá nhân:** tên, ngày làm (hoặc chưa có ngày), giờ, mức quan trọng.
- **Ghi chú nhanh:** gọi `LP.views.openDoc` với tài liệu "Ý tưởng", thêm một đoạn mới.
- **Đột xuất:** tên và thời lượng 15p / 30p / 1h / 2h, trừ vào quỹ hôm nay.

Phím tắt: `n` cho Việc, `d` cho Đột xuất, `/` cho Tìm. Không bắt phím khi đang gõ.

## 4. Tiêu chí hoàn thành (test trong `phan-5.js`)
1. Tạo mẫu "Chia số AI Class" có 4 hạng mục, trong đó 1 hạng mục +1. `LP.logic.routines.itemsFor('2026-11-26')` có hạng mục +1 của lượt 25/11.
2. Mẫu theo khoảng ngày 1–3 thì lượt chỉ có ở các ngày 1, 2, 3.
3. Sửa giờ "Từ ngày mai" thì lịch sử ngày cũ giữ giờ cũ.
4. Đánh dấu 26/11 là ngày nghỉ thì không có lượt ngày 26, và hạng mục +1 của ngày 25 rơi vào 27.
5. Thêm việc ad-hoc hạn Thứ Sáu thì ngày làm được gợi ý là Thứ Năm.
6. Đột xuất 1h thì quỹ hôm nay giảm 60 phút.
7. 390px và 1280px. Không lỗi JS.

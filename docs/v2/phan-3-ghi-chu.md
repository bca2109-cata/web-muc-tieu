# V2 · Phần 3: Ghi chú (tài liệu dài)

> Đọc kèm `01-HOP-DONG-CHUNG.md` và `02-THIET-KE.md`.
>
> - **File sở hữu:** `js/views/ghi-chu.js`, `js/views/editor.js`, `css/ghi-chu.css`, `apps-script-v2/Docs.gs`, `tests-qa/v2/phan-3.js`.
> - Bố cục tham khảo canvas: "Ghi chú · tài liệu dài".

Route `ghi-chu`. Ghi chú là **tài liệu dài, viết liên tục** như vở ghi bài. Không có mẫu hay ô điền sẵn.

## 1. Bố cục
- **Máy tính, 3 cột:**
  - Danh sách tài liệu theo 2 không gian Công việc / Cá nhân, cùng Thùng rác.
  - Khung soạn rộng khoảng 720px.
  - Cột phải: ô "Tìm trong tài liệu" và **mục lục tự sinh** từ H1/H2/H3, dính khi cuộn, mục đang đọc được làm nổi.
- **Điện thoại:** đi từng tầng: danh sách → tài liệu. Mục lục mở bằng nút.

## 2. Trình soạn (`editor.js`)
- Dùng `contenteditable`, không thêm thư viện.
- **Thanh công cụ:** H1, H2, H3, đậm, nghiêng, danh sách, đánh số, việc cần làm (☐), bảng, link, **khung chú ý** (khối nền `--butter`).
- **Phím tắt Markdown:** `## ` thành H2, `- ` thành danh sách, `1. ` thành đánh số, `[] ` thành việc cần làm.
- Dán từ Word hoặc Google Docs vẫn giữ tiêu đề, danh sách và bảng. Lọc bỏ style lạ.
- **Tự lưu** sau 2 giây ngừng gõ, hiện "Đã lưu hh:mm". Có nháp trong `localStorage` để không mất chữ khi rớt mạng.
- Mỗi tiêu đề có `id` cố định (thuộc tính `data-hid`). Đổi tên tiêu đề không đổi id.
- Đầu tài liệu hiện "Sửa dd/mm hh:mm · N chữ · N mục".

## 3. Gắn với công việc
- Ở một tiêu đề, menu ⋯ có "Gắn với mẫu công việc / việc…". Lưu `doc_id` và `heading_id` vào bản ghi mẫu hoặc việc qua `LP.api.save`.
- Ngay dưới tiêu đề hiện nhãn "Gắn với mẫu · tên".
- **Hàm `LP.views.openDoc(docId, headingId)`** mở tài liệu trong tấm trượt và cuộn tới đúng mục. Agenda và Lịch gọi hàm này. Đăng ký hàm vào `window.LP.views` trong file của phần này.
- Bôi đen một đoạn rồi bấm "Tạo việc" thì mở form thêm việc ad-hoc, gắn sẵn tài liệu và mục đó.

## 4. Dữ liệu (`Docs.gs` và `LP.api`)
- Các action: `docsIndex` (chỉ id, space, title, headings, updated_at), `docGet(id)`, `docSave(doc)`, `docDelete(id)` (xóa mềm).
- Nội dung dài hơn 45.000 ký tự thì chia thành nhiều dòng `DocChunks`, khi đọc thì ghép lại.
- Chống ghi đè: gửi kèm `updated_at` cũ. Nếu Sheet đã mới hơn thì hỏi "Giữ bản nào?".
- **Chỉ tải tài liệu khi mở tab Ghi chú hoặc khi tìm kiếm.** Mở Agenda không gọi `docsIndex`.
- Tìm kiếm chung (`LP.search`) gọi `docsIndex` cộng nội dung đã tải. Kết quả mở đúng mục chứa từ khóa.

## 5. Tiêu chí hoàn thành (test trong `phan-3.js`)
1. Tạo tài liệu, gõ `## Chia số`, có H2 và mục lục cập nhật.
2. Lưu tài liệu 60.000 ký tự, mở lại vẫn đủ nội dung (bản mock giả lập chia nhiều dòng).
3. Đổi tên tiêu đề thì liên kết từ mẫu công việc vẫn mở đúng mục.
4. `LP.views.openDoc(id, hid)` cuộn đúng mục.
5. Tìm "chia so" ra đúng mục có "Chia số".
6. Mở Agenda thì không gọi `docsIndex` (kiểm bằng hook trong `api-mock`).
7. Xóa thì tài liệu vào Thùng rác, khôi phục được.
8. 390px và 1280px. Không lỗi JS.

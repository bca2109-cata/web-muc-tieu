# Hướng dẫn triển khai

Phương án B: web nằm trên GitHub Pages, Apps Script làm cầu nối đọc ghi Google Sheet.
Bạn chỉ làm **một lần**, khoảng 15 phút, toàn bộ trên trình duyệt. Tên nút ghi cả tiếng Việt và tiếng Anh vì giao diện Google có thể hiện một trong hai.

Sheet dữ liệu đã được tạo sẵn: **Quản lý mục tiêu - dữ liệu**
https://docs.google.com/spreadsheets/d/1_zdutUcr7DnRLUm5SFWd959af_h2zZTg700jxPmEK9c/edit

> Lưu ý: không đổi tên 5 sheet (Goals, Tasks, Habits, HabitLogs, Reviews) và không đổi tên cột ở dòng 1.

---

## Phần A. Tạo cầu nối Apps Script

1. Mở link Sheet ở trên, đúng tài khoản Gmail đang sở hữu file.
2. Trên thanh menu của Sheet, bấm **Tiện ích mở rộng** (Extensions) → **Apps Script**. Một tab mới mở ra.
3. Bấm vào chữ **Dự án không có tiêu đề** (Untitled project) ở góc trên bên trái, đổi tên thành `Muc tieu API`, bấm **Đổi tên** (Rename).
4. Ở cột bên trái đang chọn sẵn file **Code.gs**. Bấm vào vùng soạn code, nhấn `Ctrl + A` rồi `Delete` để xóa hết.
5. Lấy code để dán:
   - Trên máy này: mở thư mục `web-muc-tieu\apps-script`, chuột phải vào file `Code.gs` → **Mở bằng** (Open with) → **Notepad**. Nhấn `Ctrl + A`, `Ctrl + C`.
   - Hoặc sau khi đã có GitHub (phần B): mở file `apps-script/Code.gs` trên trang GitHub, bấm nút **Copy raw file** (biểu tượng hai ô vuông) ở góc phải trên khung code.
6. Quay lại tab Apps Script, nhấn `Ctrl + V` để dán, rồi nhấn `Ctrl + S` để lưu.
7. Trên thanh công cụ phía trên vùng code có một ô chọn tên hàm. Chọn **caiDat**, rồi bấm **Chạy** (Run).
8. Google hỏi cấp quyền:
   - Bấm **Xem xét quyền** (Review permissions) → chọn tài khoản Gmail của bạn.
   - Nếu hiện "Google chưa xác minh ứng dụng này" (Google hasn't verified this app): bấm **Nâng cao** (Advanced) ở góc dưới trái → **Đi tới Muc tieu API (không an toàn)** (Go to Muc tieu API (unsafe)). Cảnh báo này hiện với mọi script tự viết, không phải lỗi. Script chỉ đọc ghi Sheet này.
   - Bấm **Cho phép** (Allow).
9. Phía dưới hiện **Nhật ký thực thi** (Execution log) với dòng `Mã bí mật của bạn: ...`. Sao chép dãy ký tự đó và cất vào chỗ riêng, ví dụ ghi chú trên điện thoại.
   - Mã này giống mật khẩu của web. **Không gửi cho ai, kể cả Claude.** Claude không cần mã này.
   - Quên mã: chọn hàm **xemMaBiMat** rồi bấm **Chạy**. Lỡ để lộ mã: chạy **doiMaBiMat** để đổi mã mới.
10. Bấm nút xanh **Triển khai** (Deploy) ở góc trên bên phải → **Tùy chọn triển khai mới** (New deployment).
11. Bấm biểu tượng bánh răng cạnh chữ **Chọn loại** (Select type) → **Ứng dụng web** (Web app). Điền:
    - Mô tả (Description): `Ban 1`
    - Thực thi dưới dạng (Execute as): **Tôi** (Me, email của bạn)
    - Người có quyền truy cập (Who has access): **Bất kỳ ai** (Anyone)
12. Bấm **Triển khai** (Deploy). Nếu Google hỏi cấp quyền lần nữa, làm lại như bước 8.
13. Sao chép **URL ứng dụng web** (Web app URL), dạng `https://script.google.com/macros/s/.../exec`. **Gửi link này cho Claude** để điền vào web. Link này không phải bí mật: không có mã bí mật thì không ai đọc được dữ liệu.

## Phần B. Đưa web lên GitHub Pages

1. Mở https://github.com và đăng nhập.
2. Bấm dấu **+** ở góc trên bên phải → **New repository**.
3. Điền **Repository name**: `web-muc-tieu`. Chọn **Public** (GitHub Pages miễn phí chỉ chạy với kho Public; kho chỉ chứa code, không chứa dữ liệu của bạn). Không tick ô nào bên dưới. Bấm **Create repository**.
4. **Gửi cho Claude tên tài khoản GitHub của bạn** (chữ nằm sau `github.com/` trên thanh địa chỉ). Claude sẽ đẩy code lên.
5. Lần đầu Claude đẩy code, máy sẽ hiện cửa sổ **Connect to GitHub**. Bấm **Sign in with your browser** → trên trang GitHub vừa mở, bấm **Authorize**. Chỉ cần làm một lần trên máy này.
6. Trên trang kho `web-muc-tieu`: bấm **Settings** (thanh trên cùng) → **Pages** (cột trái) → ở mục **Build and deployment**, ô **Source** chọn **GitHub Actions**.
7. Bấm tab **Actions** trên cùng. Chờ 1 đến 2 phút đến khi dòng mới nhất có dấu tích xanh. Nếu chưa có dòng nào, báo Claude chạy lại.
8. Link web của bạn: https://bca2109-cata.github.io/web-muc-tieu/

## Phần C. Mở web lần đầu trên mỗi thiết bị

1. Mở link web ở bước B8.
2. Hiện hộp **Kết nối Google Sheet**: dán mã bí mật ở bước A9 → bấm **Lưu và kết nối**.
3. Trên điện thoại, đưa web ra màn hình chính:
   - Android (Chrome): bấm **⋮** ở góc trên phải → **Thêm vào màn hình chính** (Add to Home screen).
   - iPhone (Safari): bấm nút **Chia sẻ** (ô vuông có mũi tên lên) → **Thêm vào MH chính** (Add to Home Screen).

## Khi có bản mới của Code.gs

Chỉ cần khi Claude báo đã đổi `apps-script/Code.gs`. Link web app giữ nguyên.

Giai đoạn 4 (22/11/2026) có đổi Code.gs: thêm phần nhập dữ liệu từ file sao lưu. Chưa cập nhật thì mọi thứ vẫn chạy, chỉ riêng nút **Nhập JSON** báo lỗi.

1. Mở Apps Script (Phần A, bước 2), dán code mới đè lên như bước 4 đến 6.
2. Bấm **Triển khai** (Deploy) → **Quản lý các bản triển khai** (Manage deployments).
3. Bấm biểu tượng bút chì, ở ô **Phiên bản** (Version) chọn **Phiên bản mới** (New version) → **Triển khai** (Deploy).

## Sao lưu và khôi phục

- **Xuất**: bấm nút Cài đặt (biểu tượng hai thanh trượt, góc trên phải) → **Xuất JSON**. Máy tải về file `life-planner-sao-luu-<ngày>.json`.
- **Nhập**: Cài đặt → **Nhập JSON** → chọn file. Web hỏi lại, tự tải một bản sao lưu dữ liệu hiện tại về máy, rồi thay **toàn bộ** dữ liệu (cả trong Google Sheet) bằng nội dung file.

## Chế độ tối

Cài đặt → **Giao diện**: Theo máy (mặc định), Sáng hoặc Tối. Chỉ đổi trên thiết bị đang dùng.

## Dùng thử bằng dữ liệu mẫu

Không cần Google Sheet, dữ liệu chỉ lưu trên trình duyệt đang mở:
- Trên máy này: bấm đúp file `web-muc-tieu\src\index.html`.
- Hoặc thêm `?mock=1` vào cuối link web, ví dụ `https://<tên-tài-khoản>.github.io/web-muc-tieu/?mock=1`.

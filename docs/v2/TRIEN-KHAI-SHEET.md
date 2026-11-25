# Triển khai Google Sheet V2 và Apps Script V2

> **File này dành cho Claude điều khiển Chrome của người dùng.** Người dùng không phải lập trình viên. Chỉ cần trình duyệt, không cài phần mềm.
> Tên nút ghi cả tiếng Việt và tiếng Anh vì giao diện Google có thể hiện một trong hai.

## Mục tiêu
Có một Google Sheet mới tên **Life Planner V2 - dữ liệu** gồm 14 sheet con, kèm một Apps Script đã triển khai thành Ứng dụng web. Kết quả cần trả cho người dùng: **một đường link dạng `https://script.google.com/macros/s/.../exec`**.

## Quy tắc an toàn (đọc trước)
1. **Không đụng vào Sheet cũ** "Quản lý mục tiêu - dữ liệu" (id `1_zdutUcr7DnRLUm5SFWd959af_h2zZTg700jxPmEK9c`) và Apps Script của nó. Web cũ vẫn đang dùng.
2. **Mã bí mật** (dòng `Mã bí mật: ...` trong Nhật ký thực thi) giống mật khẩu của web: **không chép vào khung chat, không dán vào đâu, không gửi cho ai**, kể cả Claude Code. Chỉ nói "mã đã hiện trong Nhật ký thực thi, bạn tự chép và cất". Người dùng sẽ tự nhập mã vào web ở bước cuối.
3. **Dừng và hỏi người dùng trước khi** bấm **Cho phép (Allow)** ở cửa sổ cấp quyền, và trước khi bấm **Triển khai (Deploy)**. Đây là hai bước cấp quyền, người dùng phải tự xác nhận.
4. Không xóa, không đổi tên sheet hay cột sau khi `setup` đã chạy.

## Phần A. Tạo Google Sheet V2
1. Mở https://sheets.google.com, đúng tài khoản Gmail của người dùng.
2. Bấm **Trống** (Blank) để tạo bảng tính mới.
3. Bấm vào tên **Bảng tính không có tiêu đề** (Untitled spreadsheet) ở góc trên trái, xóa hết, gõ `Life Planner V2 - dữ liệu`, nhấn Enter.
4. Kiểm tra múi giờ: **Tệp** (File) → **Cài đặt** (Settings) → thẻ **Chung** (General) → **Múi giờ** (Time zone) phải là `(GMT+07:00) Bangkok, Hanoi, Jakarta` (Việt Nam). Chưa đúng thì chọn lại rồi bấm **Lưu cài đặt**.

## Phần B. Dán code Apps Script
1. Trong Sheet vừa tạo: **Tiện ích mở rộng** (Extensions) → **Apps Script**. Một tab mới mở ra.
2. Bấm vào chữ **Dự án không có tiêu đề** (Untitled project) ở góc trên trái, đổi tên thành `Life Planner V2 API`, bấm **Đổi tên** (Rename).
3. Lấy code: mở tab mới tới
   - Sau khi PR đã gộp: `https://raw.githubusercontent.com/bca2109-cata/web-muc-tieu/main/apps-script-v2/Code.gs`
   - Chưa gộp: thay `main` bằng `v2/khung`.
   Bấm vào vùng chữ, nhấn `Ctrl + A` rồi `Ctrl + C` để chép toàn bộ.
4. Quay lại tab Apps Script. Ở cột trái đang chọn file **Code.gs**. Bấm vào vùng soạn code, `Ctrl + A`, `Delete`, rồi `Ctrl + V` để dán. Nhấn `Ctrl + S` để lưu.
5. Kiểm tra đã dán đủ: kéo xuống cuối, dòng cuối là hàm `json_` kết thúc bằng `}`. Gần đầu file có dòng `var COMMON = ['id', 'created_at', 'updated_at'];`.

## Phần C. Chạy `setup` để tạo 14 sheet và mã bí mật
1. Trên thanh công cụ phía trên vùng code, ô chọn hàm: chọn **setup**. Bấm **Chạy** (Run).
2. **Dừng, báo người dùng**: Google sẽ hỏi cấp quyền. Sau khi người dùng đồng ý:
   - Bấm **Xem xét quyền** (Review permissions) → chọn tài khoản Gmail của người dùng.
   - Nếu hiện "Google chưa xác minh ứng dụng này" (Google hasn't verified this app): bấm **Nâng cao** (Advanced) ở góc dưới trái → **Đi tới Life Planner V2 API (không an toàn)** (Go to ... (unsafe)). Cảnh báo này hiện với mọi script tự viết, không phải lỗi. Script chỉ đọc ghi đúng Sheet này.
   - Bấm **Cho phép** (Allow).
3. Chờ **Nhật ký thực thi** (Execution log) hiện dòng `Đã cài đặt xong 14 sheet. Mã bí mật: ...`. **Không chép mã ra ngoài** (xem quy tắc 2).
4. Quay lại tab Sheet. Kiểm tra: phía dưới có **14 thẻ sheet** đúng tên, theo thứ tự: `Routines`, `RoutineItems`, `RoutineChecks`, `Tasks`, `TaskSteps`, `Habits`, `HabitLogs`, `Goals`, `Reviews`, `Interruptions`, `DaysOff`, `Settings`, `Docs`, `DocChunks`. Sheet trắng mặc định (`Sheet1` hoặc `Trang tính1`) đã tự bị xóa. Mỗi sheet có dòng 1 là tiêu đề in đậm, đứng đầu là `id`, `created_at`, `updated_at`, cuối là `deleted`.

## Phần D. Triển khai thành Ứng dụng web
1. **Dừng, hỏi người dùng** rồi mới tiếp tục. Trong Apps Script bấm nút xanh **Triển khai** (Deploy) ở góc trên phải → **Tùy chọn triển khai mới** (New deployment).
2. Bấm biểu tượng bánh răng cạnh **Chọn loại** (Select type) → **Ứng dụng web** (Web app). Điền:
   - Mô tả (Description): `Ban 1`
   - Thực thi dưới dạng (Execute as): **Tôi** (Me, email của người dùng)
   - Người có quyền truy cập (Who has access): **Bất kỳ ai** (Anyone)
3. Bấm **Triển khai** (Deploy). Nếu Google hỏi cấp quyền lần nữa, làm như Phần C bước 2.
4. Sao chép **URL ứng dụng web** (Web app URL), dạng `https://script.google.com/macros/s/.../exec`. Link này **không phải bí mật**: không có mã bí mật thì không ai đọc được dữ liệu.

## Phần E. Kiểm tra nhanh
1. Mở link `/exec` ở tab mới. Phải hiện JSON có `"ok":true` và chữ `API Life Planner V2 đang chạy`.
2. Nếu hiện trang đăng nhập Google hoặc lỗi 401/403: quay lại Phần D, kiểm tra ô **Người có quyền truy cập** là **Bất kỳ ai**.
3. Mở Sheet, **không nhập gì vào các sheet**. Dữ liệu sẽ do web ghi.

## Báo lại cho người dùng (đúng 3 mục, ngắn gọn)
1. Link Google Sheet V2 (đường dẫn `docs.google.com/spreadsheets/d/...`).
2. Link Ứng dụng web `/exec`.
3. Nhắc: "Mã bí mật đang nằm trong Nhật ký thực thi của Apps Script, bạn tự chép và cất. Nếu quên: chạy hàm `xemMaBiMat`. Nếu lỡ lộ: chạy hàm `doiMaBiMat`."

Người dùng gửi link `/exec` cho phiên Claude Code để điền vào `src/v2/js/core/config.js` (`SHEET_API_URL`). Sau đó người dùng mở web V2, hộp **Kết nối Google Sheet** hiện ra, tự dán mã bí mật và bấm **Lưu và kết nối**.

## Khi Code.gs đổi (các đợt sau)
Dán code mới đè lên Code.gs, rồi **Triển khai** (Deploy) → **Quản lý các bản triển khai** (Manage deployments) → bút chì → **Phiên bản** chọn **Phiên bản mới** (New version) → **Triển khai**. Link `/exec` giữ nguyên. Khi Phần 3 thêm `Docs.gs`: tạo thêm một file script tên `Docs` (dấu **+** cạnh **Tệp** → **Tập lệnh**), dán nội dung `apps-script-v2/Docs.gs`.

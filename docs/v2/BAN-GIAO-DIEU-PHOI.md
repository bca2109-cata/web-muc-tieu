# Bàn giao cho phiên chat điều phối Life Planner V2

> Dán hoặc đính kèm file này vào đầu phiên chat mới. Phiên mới đóng vai **người điều phối**: quyết định thay người dùng mọi việc kỹ thuật, soạn câu lệnh cho các phiên Claude Code, kiểm tra kết quả, chụp ảnh cho người dùng duyệt, merge, triển khai Apps Script qua Chrome.
>
> Cập nhật: 26/11/2026, 21:40 (giờ Việt Nam).

---

## 1. Người dùng và cách làm việc (bắt buộc)

- Người dùng là **Sale Admin** (Edupia), **không phải lập trình viên**. Trả lời **tiếng Việt, ngắn gọn**, không dùng emoji.
- **Người dùng chỉ quyết định, Claude làm mọi việc kỹ thuật.**
  - Không bảo người dùng chạy lệnh, sửa file, dán code hay tự merge.
  - Khi cần người dùng: chỉ hỏi **câu quyết định có lựa chọn** (Duyệt / Sửa: … / Chọn A hay B). Ưu tiên công cụ hỏi có nút chọn, kèm ảnh chụp để xem.
  - Người dùng nói **"Duyệt"** thì Claude **tự merge PR**.
- Việc người dùng vẫn phải tự làm, vì lý do bảo mật:
  - Mở phiên mới trên claude.ai/code và dán câu lệnh do điều phối soạn.
  - Bấm "Cho phép" trên màn cấp quyền của Google.
  - Dán **mã bí mật** vào web. Claude không đọc, không chép, không nhập mã này.
- Người dùng **không muốn tự làm trong Google Sheet**. Sheet chỉ là nơi lưu dữ liệu ẩn phía sau.
- Máy công ty **không cài được phần mềm**, mọi thứ chạy trên trình duyệt. Người dùng ít dùng điện thoại.
- Trước khi người dùng duyệt giao diện, **luôn chụp ảnh hoặc quay video** cho họ xem (xem mục 7). Họ chọn bằng mắt, đừng chỉ mô tả bằng chữ.
- Người dùng hay **đổi ý về giao diện**. Ghi đúng ý mới nhất của họ. Nếu ý mới mâu thuẫn quyết định cũ thì nói rõ trước khi làm.

## 2. Dự án

- **Repo:** `bca2109-cata/web-muc-tieu`, nhánh chính `main`. GitHub Pages tự triển khai thư mục `src/` khi push lên `main`.
- **Web V2 (đang dùng):** https://bca2109-cata.github.io/web-muc-tieu/v2/
  - Bản dữ liệu mẫu: thêm `?mock=1&today=2026-11-25&now=11:05` vào đường dẫn.
  - Web cũ nằm ở `src/` ngoài `v2/`. **Không sửa web cũ.**
- **Google Sheet V2 "Life Planner V2 - dữ liệu":** https://docs.google.com/spreadsheets/d/1Eng942VC3bmnTc16LU35KLQsr6xNAXYjLlm-ikHqyZk/edit
  - Gồm 14 sheet: Routines, RoutineItems, RoutineChecks, Tasks, TaskSteps, Habits, HabitLogs, Goals, Reviews, Interruptions, DaysOff, Settings, Docs, DocChunks.
- **Apps Script "Life Planner V2 API":** https://script.google.com/u/0/home/projects/1IVZcFNIq4OY06iHkF6x35e4AcaqtovMSDdK9hHPMMYxgxV9f7ZRCeRc9/edit
  - Gồm 2 file: `Mã.gs` (= `apps-script-v2/Code.gs`) và `Docs.gs`. Hiện đang chạy **phiên bản 2**, triển khai lúc 26/11 14:24.
  - URL Web App (đã điền trong `src/v2/js/core/config.js`): `https://script.google.com/macros/s/AKfycby-Jn9LrBWL9eCZuU_n1ph7hwSGAc62RB2CIPo5dEPybk03oRY5pnXB482zItL9Pbtn/exec`
  - Triển khai: Execute as **Me**, Who has access **Anyone**. Có mã bí mật bảo vệ.
- **Tài khoản Google** của người dùng: `nbnngoc2109@gmail.com`.
- **Canvas thiết kế** (artifact, dùng để phác thảo ý tưởng): slug `99d74b3b-39f3-4e71-a925-2502cc77da63`.

## 3. Công nghệ và cấu trúc

- JS thường, nạp bằng thẻ script cổ điển, không dùng ES module, không có bước build. Ứng dụng có service worker; HTML lấy mạng trước rồi mới tới bộ nhớ đệm.
- `src/v2/`
  - `index.html`: nạp CSS và JS, có tham số phiên bản `?v=v2c` / `v2f`.
  - `sw.js`: `VERSION = 'lpv2-v2f'`. **Mỗi lần đưa CSS/JS mới lên, phải đổi số phiên bản** ở cả `sw.js` và tham số `?v=` của file vừa sửa, nếu không trình duyệt giữ bản cũ.
  - `css/`:
    - `tokens.css`, `base.css`: phần chung.
    - `agenda.css`, `lich.css`, `ghi-chu.css`, `muc-tieu.css`, `cai-dat.css`, `gioi-thieu.css`: CSS của từng màn.
    - `motion.css`: chuyển động.
    - `so-tay.css`: giao diện sổ tay, icon dễ thương.
    - `nut-giay.css`: nút kiểu giấy, **nạp sau cùng**.
  - `js/core/`:
    - Cấu hình và dữ liệu: `config`, `date`, `api`, `api-mock`, `api-sheet`, `mock-data`, `store`.
    - Logic: `logic-routines`, `logic-tasks`, `stats`, `search`.
    - Giao diện chung: `ui`, `flowers` (hoa rơi), `router`, `notify`, `shell`, `motion`, `cute`.
  - `js/views/`: `agenda`, `soat`, `lich-tuan`, `lich-thang`, `editor`, `ghi-chu`, `muc-tieu`, `thoi-quen`, `tong-ket`, `mau-cong-viec` (Daily), `cai-dat`, `them-nhanh` (nút +).
  - Các route: `agenda`, `lich`, `ghi-chu`, `muc-tieu`, `tong-ket`, `cai-dat`, `mau`, `soat`, `ton`. Soát mở bằng `#/agenda?soat=1`, Tồn tổng bằng `#/agenda?ton=1`.
- `apps-script-v2/Code.gs`, `Docs.gs`: cầu nối với Google Sheet. Hàm tiện ích: `setup()`, `xemMaBiMat()`, `doiMaBiMat()`.
- `tests-qa/v2/`: test Playwright. Chạy `npm run test:v2 -- core|phan-1..phan-5|all`; kết quả in **một dòng JSON**.
  - Bộ test chạy ở chế độ **giảm chuyển động** (`reducedMotion:'reduce'` trong `helpers.js`) để máy không bị quá tải.
  - Chạy `all` mất khoảng 5–6 phút.
  - Có 2 test **chập chờn**, chạy lại thì đạt: core "check(): tick, bỏ tick…" và phần 4 "không nhớ kỳ cuối".
- `.claude/agents/v2-kiem-thu.md` (model sonnet): agent kiểm, gọi một lần khi xong phần. `.claude/skills/life-planner-thiet-ke`: skill thiết kế.
- `docs/v2/`:
  - `00-BAT-DAU-V2.md`: hướng dẫn người dùng.
  - `01-HOP-DONG-CHUNG.md`: hợp đồng chung; **mục 6b là tên gọi**.
  - `02-THIET-KE.md`: quy tắc thiết kế.
  - `phan-1..6-*.md`: yêu cầu từng phần.
  - `YEU-CAU-CHUNG.md`: đề nghị sửa phần chung. Hiện **không còn mục nào chưa xong**.
  - `TIEN-DO-V2.md`, `TRIEN-KHAI-SHEET.md`, `SPEC-V2-DAY-DU.md`, `anh/`: ảnh chụp.
- `CLAUDE.md` ở gốc repo: mục "ƯU TIÊN: đang làm V2" có quy tắc "người dùng chỉ quyết định".

## 4. Mô hình dữ liệu và tên gọi đã chốt

- **Daily** = Routines → RoutineItems (`day_offset` 0/1 cho việc làm tiếp hôm sau T+1, `valid_from`/`valid_to`) → RoutineChecks (done / skipped / carried). "Bỏ sót" là suy ra khi không có lượt tick.
- **Ad-hoc** = Tasks `kind=adhoc`: TP/TBP giao, có hạn và người giao. **Personal** = Tasks `kind=canhan`. Mỗi task có `do_date`/`do_time`, `due_date`, `importance` 1–3, `status` (`done` / `cancelled`…), và TaskSteps.
- **Chen ngang** = Interruptions (thời gian bị kéo đi đột xuất).
- Ngoài ra còn: Habits/HabitLogs, Goals/Reviews, DaysOff, Settings, Docs/DocChunks (tài liệu dài được tách khúc khi vượt 45.000 ký tự).
- **Tên hiển thị đã chốt:** Daily / Ad-hoc / Personal / Chen ngang. Người dùng chọn giữ tiếng Anh, **đừng đổi**.
- Icon: trái tim (1–3) = mức quan trọng do người dùng đặt; đồng hồ báo thức = độ khẩn, tính từ hạn; ngọn lửa = chuỗi thói quen.
- **Việc tồn:**
  - *Mục đã quyết*: hạng mục T+1, mục "Mang sang mai", hoặc đã đặt giờ. Nằm trong luồng hôm nay, kèm nhãn "Tồn từ dd/mm". Hết hiệu lực sau ngày làm việc kế tiếp.
  - *Mục sót chưa quyết*: chỉ hiện một dòng mảnh "N mục tồn chưa xử lý · Xử lý", bấm vào mở màn Tồn tổng. Không giới hạn số ngày.
- **Tỷ lệ hoàn thành** gộp cả Daily, Ad-hoc và Personal, ở cả Agenda lẫn Tổng kết.

## 5. Quyết định giao diện đã chốt (mới nhất)

- **Phông Quicksand** cho cả web. Trang giới thiệu dùng phông Mali.
- **Nền hồng nhạt, nhiều hoa rơi** (gấp đôi bản cũ). Hoa vẫn bay đè lên nội dung, người dùng thích như vậy.
- **Khung chào** ở đầu Agenda, chiếm **nửa trái màn hình**:
  - Sáng và trưa: mặt trời cười. Chiều: mặt trời và mây. Tối: mặt trăng và sao.
  - Có nút ‹ › và ô "Hôm nay · ngày".
  - **Không có dòng tóm tắt.**
- Người dùng **đã bác** các đề xuất sau, đừng đề xuất lại: dải số liệu thay 3 biểu đồ, giảm màu đỏ, đẩy hoa ra sau nội dung.
- **Nút** (file `nut-giay.css`):
  - Nút chính và nút phụ (`.btn-primary`, `.btn-soft`): giấy xé mép răng cưa, dán băng dính washi, hơi nghiêng. Nút chính màu hồng phấn `#ffe3ec`, chữ `#7a1c43`. Nút phụ màu vàng kem `#fff1b8`, chữ `#5c4410`. Bo góc 10px.
  - Nút chọn: **tab chia trang sổ**, gồm thanh tab chính, `.seg`, `.ag-switch`, `.lich-seg`, `.mt-switch`. Câu lệnh sửa lỗi ngày 26/11 sẽ chuyển **bộ lọc** sang nhóm nút liền nhau; điều hướng giữ tab.
  - Các nút khác (`.btn` thường, `.chip`, `.chips label`): **thẻ giấy treo có lỗ xỏ dây**.
  - Nút + (`.fab-main`): **bình hoa tulip** vẽ theo ảnh người dùng gửi. Bình trắng có mặt cắt, nơ kem, 10 bông tulip hồng cánh tròn. Dấu + màu mận ở giữa thân bình. Rê chuột thì hoa đung đưa; mở menu thì hoa chuyển vàng, + thành ×.
  - Tương tác: rê chuột thì nhấc lên và đậm màu nhẹ, bấm thì ấn xuống.
  - Nút tròn chỉ có icon (‹ ›, tìm kiếm, cài đặt) giữ nguyên.
- Người dùng **ghét kiểu "trông như AI"**: các viên tròn giống hệt nhau, nét vẽ vector quá sạch. Họ thích chất giấy, sổ tay, vẽ tay.

## 6. Quy trình làm việc giữa các phiên

- Phiên Claude Code (claude.ai/code) làm trên **một nhánh riêng**, chạy test, gọi `v2-kiem-thu`, đẩy nhánh rồi báo lại.
  - **Các phiên đó thường không có `gh`**, nên điều phối tự mở PR bằng `gh api repos/bca2109-cata/web-muc-tieu/pulls -f head=… -f base=main -f title=… -f body=…`.
  - Lệnh `gh pr create` bị lỗi 403, vì GraphQL bị chặn. Phải dùng REST.
- Điều phối kiểm trước khi đưa người dùng duyệt:
  - Lấy nhánh về, chạy test, chụp ảnh. Nếu nhánh tách từ `main` cũ thì gộp `main` vào trước; lỗi này đã gặp ở Phần 6.
  - Gửi ảnh, rồi hỏi "Duyệt / Sửa".
- Merge: `gh api -X PUT repos/bca2109-cata/web-muc-tieu/pulls/N/merge -f merge_method=squash`. **Chỉ merge khi người dùng đã nói "Duyệt" trong tin nhắn hiện tại.** Bộ lọc an toàn sẽ chặn nếu merge không có duyệt rõ ràng.
- `git push -q` đôi khi không báo lỗi mà không đẩy được. Luôn kiểm lại bằng `git ls-remote origin <nhánh>`.
- Ký tên commit theo nhắc nhở của hệ thống: dòng `Co-Authored-By` và `Claude-Session`. Mô tả PR kết thúc bằng dòng "Generated with Claude Code".
- Mẫu câu lệnh cho phiên làm một phần:
  > Bạn là agent thực hiện Phần N của V2. Chỉ đọc 01-HOP-DONG-CHUNG.md, 02-THIET-KE.md và file phần. Làm trên nhánh v2/… tách từ main. Dùng skill life-planner-thiet-ke. Xong: chạy npm run test:v2 -- all, gọi agent v2-kiem-thu một lần, sửa lỗi, đẩy nhánh lên rồi dừng và báo tôi. Không cần tự mở PR.
- Model: dùng **Sonnet** cho phần nhỏ, **Opus** cho phần điều phối, ghép, hoặc sửa nhiều màn. Agent con `v2-kiem-thu` luôn chạy Sonnet.

## 7. Cách chụp ảnh và quay video để người dùng duyệt

- Lấy nhánh: `git fetch origin <nhánh>:refs/remotes/origin/<nhánh>`, rồi `git worktree add -f /tmp/pv/x origin/<nhánh>`.
- Playwright có sẵn tại `/opt/npm-tools/node_modules/playwright`. Mở `file:///…/src/v2/index.html?mock=1&today=2026-11-25&now=HH:MM#/route`.
- Máy ảo **không tải được Google Fonts**, nên ảnh chụp sẽ sai phông. Cách xử lý:
  - Cài phông qua npm: `npm i @fontsource/quicksand` trong một thư mục tạm.
  - Chèn phông vào trang: `page.addStyleTag({url:'file:///…/@fontsource/quicksand/600.css'})`.
- Quay video: dùng `recordVideo` của Playwright, rồi `ffmpeg -c:v libx264 -crf 26` ra mp4. Không xuất GIF vì quá nặng.
- Gửi ảnh và video bằng SendUserFile.

## 8. Cập nhật Apps Script bằng Chrome của người dùng (Claude in Chrome)

Chỉ làm khi `apps-script-v2/*.gs` đổi so với phiên bản 2 đang chạy.

1. Mở trang Apps Script ở mục 2.
2. Trong trang, dùng JavaScript lấy code: `fetch('https://raw.githubusercontent.com/bca2109-cata/web-muc-tieu/main/apps-script-v2/Code.gs')`.
3. Ghi code vào trình soạn thảo: `monaco.editor.getModels()[i].pushEditOperations([], [{range: m.getFullModelRange(), text}], ()=>null)`. Model 0 là `Mã.gs`, model 1 là `Docs.gs`.
4. Bấm vào trình soạn thảo, nhấn Ctrl+S để lưu.
5. Vào **Triển khai → Quản lý tùy chọn triển khai → nút bút chì → Phiên bản: Phiên bản mới → Triển khai**. URL giữ nguyên.
6. Nếu Google hỏi quyền thì dừng lại, để người dùng tự bấm Cho phép.
7. Kiểm tra: mở URL `/exec`, phải thấy `{"ok":true,…"API Life Planner V2 đang chạy"}`.
- **Mã bí mật:** nếu người dùng cần xem lại, chọn hàm `xemMaBiMat` rồi bấm Chạy. Mã hiện ở Nhật ký thực thi trên màn hình của họ. **Không đọc, không chụp màn hình nhật ký.**
- Có thể kiểm tra danh sách sheet bằng JavaScript ở trang Sheet: lấy chữ của `.docs-sheet-tab-name`.

## 9. Trạng thái hiện tại (26/11 21:40)

- Đã merge xong cả 4 đợt, gồm Phần 1–6, các phiên ghép và các bản chỉnh giao diện, PR #1 đến #23. Không còn PR mở. `YEU-CAU-CHUNG.md` không còn mục chờ.
- Người dùng **đã kết nối Sheet thật** bằng mã bí mật trên Chrome. Sheet đang trống, **chưa nhập Daily thật**.
  - Đường vào: nút thanh trượt ở góc phải trên → Cài đặt → **Quản lý Daily** → **+ Daily mới**.
  - Lần đầu mở trang mất khoảng 3–5 giây để tải dữ liệu.
- **Đang chờ:** một phiên Claude Code (Opus) sửa **31 lỗi** từ bản soát giao diện của người dùng, trên nhánh `v2/sua-loi-soat`. Danh sách lỗi:
  - Mức cao: việc đã hủy còn hiện trên Lịch; bấm kết quả tìm kiếm không mở được việc; bấm việc trên Lịch không mở; Tổng kết báo "Không bỏ sót" khi chưa có dữ liệu; toast "Có bản mới" che giao diện; route lạ không báo.
  - Mức trung bình: skeleton hoặc cache khi tải, `scrollbar-gutter`, header dính, bộ lọc dạng nhóm nút liền, đổi "p" thành "phút" và "Target" thành "Chỉ tiêu", giờ 24h, trạng thái trống có nút, và các lỗi riêng ở Agenda, Lịch, Ghi chú, Mục tiêu, Tổng kết.
  - Khi phiên đó báo xong: điều phối mở PR, chạy test, chụp ảnh trước/sau rồi hỏi người dùng duyệt.

## 10. Lưu ý đã gặp

- Màn có hiệu ứng làm test chậm và hay quá thời gian chờ. Vì vậy test phải chạy ở chế độ giảm chuyển động.
- FAB bình hoa cao 84px, có thể che nút cuối form trên điện thoại. Đã thu còn 52×68 khi màn dưới 900px.
- Bộ lọc màn Tồn tổng phải nằm trên một hàng: có test kiểm điều này.
- Bộ lọc an toàn từng chặn lệnh vừa sửa tài liệu vừa merge trong cùng một lần chạy. Tách thành bước sửa và push riêng, rồi hỏi duyệt trước khi merge.
- Đừng tự đổi thiết kế ngoài yêu cầu. Người dùng từng nói "Các thứ khác để y nguyên".

# Tiến độ dự án

> Claude Code cập nhật file này sau mỗi giai đoạn.
>
> 21/11/2026: chuyển dự án từ máy công ty (desktop-25ovadp) sang máy cá nhân (admin-pc). Đã sửa: thêm `model: sonnet` cho 2 agent; AGENTS.md dùng đúng `.codex/agents/` và không đụng vào `cai-dat-agents/`.

| Giai đoạn | Trạng thái | Ngày xong | Ghi chú |
|---|---|---|---|
| 0. Đề xuất triển khai | Xong | 21/11/2026 | Xem `docs/DE-XUAT-GD0.md`. 21/11/2026 trên admin-pc: đã chuyển 2 agent vào `.claude/agents/` (có `model: sonnet`), đã xóa `cai-dat-agents/`. Máy có Node v26.13.0, npm 11.20.0 |
| 1. Mục tiêu và task cơ bản | Xong (đã duyệt) | 22/11/2026 | Xem mục "Giai đoạn 1" bên dưới |
| 2. Chỉ số, kỳ, task lặp, cảnh báo, tab Task | Xong (đã duyệt) | 22/11/2026 | Người dùng thêm vào GĐ2: tab Task, nút "Thêm task đầy đủ" |
| 3. Thói quen và streak | Xong (đã duyệt) | 22/11/2026 | |
| 4. Tổng kết, biểu đồ, chế độ tối, PWA | Xong (đã duyệt) | 22/11/2026 | |
| 5. Góp ý sau dùng thử | Xong (đã duyệt) | 22/11/2026 | SPEC mục 4.5 |
| 6. Lập kế hoạch ngày | Đã làm, chờ duyệt | | SPEC mục 4.6 |

## Quyết định đã chốt
21/11/2026 (trả lời mục 4 của `docs/DE-XUAT-GD0.md`):
- Phương án triển khai: **B. GitHub Pages + Apps Script làm cầu nối**.
- Kiểm thử: máy admin-pc có Node, qa-tester dùng Playwright.
- Tài khoản: **Gmail cá nhân**. Claude được tạo sẵn Google Sheet (5 sheet, đủ header) qua kết nối Google Sheets.
- Task lặp: **có sinh bù** những ngày không mở web; **mỗi lần sinh tính là 1 task** vào % mục tiêu.
- Top 3 hôm qua chưa xong: **giữ lại** sang Top 3 hôm nay.
- Sinh bù task lặp: tính từ ngày tạo task lặp, tối đa 30 ngày gần nhất.
- Người dùng đã có tài khoản GitHub.
- Cấu trúc thư mục: đã duyệt, ghi trong `CLAUDE.md`.
- Xóa mục tiêu: **hỏi mỗi lần** (chuyển task thành "Việc lặt vặt" hay xóa theo).

21/11/2026, đổi giao diện sang **Life Planner** (người dùng không ưng giao diện cũ, cho phép sửa mục 7 SPEC sau khi duyệt bản xem trước):
- Tên web: LIFE PLANNER. Giữ tông hồng, phối nhiều pastel, nhiều họa tiết. Trang trí bằng **nhiều loại hoa** (cúc, tulip, anh đào, lá), không dùng mascot.
- Font: Baloo 2 (tiêu đề), Nunito (chữ). Con số dùng Nunito đậm, `tabular-nums` (bỏ quy tắc font mono).
- Icon: thêm icon cho **mỗi task** (tự đoán theo tên, sửa được, thêm cột `icon` cuối sheet Tasks), icon trang trí quanh trang, icon cạnh mọi nhãn và nút.
- Ma trận 4 ô: **quan trọng** = ưu tiên Cao (TB, Thấp là không quan trọng); **khẩn cấp** = trễ hạn, hạn hôm nay hoặc ngày mai. Màu task theo ô. Tab Hôm nay có thêm khung 4 ô, chuyển qua lại với dạng danh sách.
- Mục tiêu: thêm cột `importance` (1 đến 3, hiện bằng trái tim) cuối sheet Goals, kết hợp nhãn "Còn N ngày" tô màu theo độ gấp.
- Tick xong task hoặc mục tiêu đạt 100%: hoa nở và câu động viên.
- Tab chưa làm (Task, Thói quen, Tổng kết): hiện sẵn, bấm vào thấy "Sắp có".
- Duyệt bản xem trước lần 3 (`docs/de-xuat-giao-dien/preview3.html`): 12 loại hoa, chữ LIFE PLANNER to, nền hồng nhạt hơn, chọn hình nền (mặc định **Hoa bay nhẹ**, hoặc Trơn), tick xong thì hoa bung. Mỗi màu, mỗi icon một nghĩa: đỏ là gấp, sao là Top 3, tim hồng là quan trọng; ô Làm nhanh màu cam đào.

## Đổi giao diện Life Planner: đã làm (21/11/2026)
- Cập nhật SPEC mục 4.1, 4.2, 5, 6.1, 7; thêm `DESIGN.md`; sửa quy tắc số trong CLAUDE.md, AGENTS.md, qa-tester (bỏ font mono, dùng Nunito đậm `tabular-nums`).
- Google Sheet: thêm cột `importance` (cột P sheet Goals) và `icon` (cột O sheet Tasks), định dạng chữ như các cột khác. Code.gs ghi theo tên cột ở dòng 1 nên bản đang chạy dùng được ngay, **không cần triển khai lại**. Code.gs mới chỉ thêm 2 cột vào danh sách và để `caiDat` tự bổ sung cột còn thiếu.
- Web: font Baloo 2 và Nunito, bộ màu mới, 12 loại hoa SVG (`src/js/flowers.js`), hình nền hoa bay nhẹ hoặc trơn (nút bông hoa trên đầu trang, nhớ theo từng máy), hoa bung và câu động viên khi tick xong, hoa bung nhiều khi mục tiêu vừa đạt 100%.
- Tab Hôm nay: khung chào gọn, Top 3 dạng giấy note, chuyển Danh sách / Ma trận 4 ô (ma trận gồm mọi việc chưa xong, việc đã ở Top 3 không lặp lại). Máy tính chia 2 cột.
- Task có icon tự đoán theo tên (sửa được trong form, 24 icon). Mục tiêu có mức quan trọng 1 đến 3 tim, nhãn "Còn N ngày" theo độ gấp, câu trạng thái tiến độ.
- 5 tab, 3 tab chưa làm hiện "Sắp có".

## Giai đoạn 1: đã làm
- Google Sheet **Quản lý mục tiêu - dữ liệu** (tài khoản nbnngoc2109@gmail.com), 5 sheet đủ cột theo mục 6.1, thêm `created_at`, `updated_at`. Cột dạng chữ để ngày giữ `yyyy-mm-dd`; `target`, `actual` dạng số. Múi giờ Asia/Ho_Chi_Minh.
- `apps-script/Code.gs`: Web App nhận POST có mã bí mật, thao tác `ping`, `loadAll`, `batch` (thêm/sửa/xóa theo id), có khóa ghi đồng thời.
- Web trong `src/`: tab Hôm nay (Top 3, trễ hạn, việc hôm nay, sắp đến hạn ngày mai, thêm nhanh bằng Enter), tab Mục tiêu (lọc theo nhóm, thẻ có thanh %, trang chi tiết có danh sách task), form thêm/sửa/xóa task và mục tiêu, tiến độ theo task.
- Lớp dữ liệu tách 2 bản: `api-sheet.js` (thật) và `api-mock.js` (localStorage, dữ liệu mẫu). Cập nhật lạc quan, hàng đợi lưu nền, lưu lỗi thì báo và có nút Thử lại.
- Quyết định đã áp dụng: Top 3 chưa xong được giữ sang hôm nay; xóa mục tiêu thì hỏi giữ task (thành Việc lặt vặt) hay xóa theo.
- Bản mock hỗ trợ `?today=yyyy-mm-dd` (giả lập ngày) và `?fail=1` (giả lập lưu lỗi) để kiểm thử.
- Đã triển khai 21/11/2026: web https://bca2109-cata.github.io/web-muc-tieu/ , kho https://github.com/bca2109-cata/web-muc-tieu , Apps Script "Muc tieu API" (bản triển khai "Ban 1"). Hướng dẫn: `docs/HUONG-DAN-TRIEN-KHAI.md`. GitHub Pages chạy thư mục `src/` qua `.github/workflows/pages.yml`.
- Làm sớm vì tab Hôm nay cần: nhãn "Trễ hạn" và "Sắp đến hạn". Phần cảnh báo tiến độ chậm để Giai đoạn 2.
- Chưa làm (đúng lộ trình): tiến độ theo chỉ số, lọc theo kỳ, task lặp, tab Task, thói quen, tổng kết, chế độ tối, PWA.

### Kết quả kiểm tra Giai đoạn 1 (21/11/2026)
- spec-reviewer: 14/15. Thiếu: chưa chạy thật với Google Sheet vì chưa triển khai (chờ người dùng làm theo HUONG-DAN-TRIEN-KHAI.md).
- qa-tester: ĐẠT, khoảng 91 kiểm tra trên bản mock, 0 lỗi console. Lượt xác nhận sau sửa: ĐẠT 91/91.
- Đã sửa: số trong "Top 3" dùng font mono; nút sao 44px; dấu tick stroke 1.8; task hạn ngày mai tick xong vẫn hiện; sai mã bí mật lúc đang lưu thì mở lại hộp nhập mã.
- Lưu ý khi chạy agent: phiên tạo ra `.claude/agents/` không nạp được 2 agent, nên đã chạy bằng agent chung theo đúng nội dung 2 file. Phiên sau sẽ gọi thẳng được.

## Lỗi mức Thấp còn tồn
- Số trong hộp hỏi xóa mục tiêu ("có 4 task") và trong nhãn kỳ ở ô chọn (`<option>`) chưa có kiểu số đậm, thẳng hàng. Ô chọn không cho tạo kiểu riêng cho số.
- `<meta name="theme-color">` viết thẳng mã màu (thẻ meta không dùng được biến CSS). Sẽ xử lý khi làm chế độ tối ở Giai đoạn 4.
- Ô chọn ngày hiện theo ngôn ngữ của trình duyệt (máy tiếng Anh hiện mm/dd/yyyy). Đã đỡ hơn (22/11): ghi thêm ngày kiểu Việt Nam ngay dưới ô.
- Nếu có hơn 3 task Top 3 cũ chưa xong (do nhiều ngày không mở), chỉ 3 task được giữ sang hôm nay.

### Kết quả kiểm tra đợt đổi giao diện (21/11/2026)
- spec-reviewer: 14/18. Thiếu: vùng bấm nhỏ hơn 44px ở vài nút, chữ tab đang mở chưa đủ tương phản, ma trận bỏ việc Top 3 nhưng SPEC chưa ghi.
- qa-tester: khoảng 150 điểm kiểm. 2 lỗi Cao: nội dung đè lên thanh tab đáy nên không bấm được tab trên điện thoại; nút tick nhảy lên góc phải sau khi tick (trùng tên lớp CSS với ô chọn hình nền). 1 lỗi Trung bình: ô chọn hình nền bị che.
- Đã sửa: thứ tự lớp của đầu trang, đổi tên lớp hiệu ứng tick, mọi nút có vùng bấm 44px, chữ tab đang mở dùng `--accent-deep`, ghi rõ trong SPEC là ma trận bỏ việc Top 3. Thêm: số trong tiêu đề cũng dùng Nunito, tên icon trong form bằng tiếng Việt, nút trong hộp hỏi và thông báo có icon.

### Soát giao diện và sửa theo góp ý (22/11/2026)
- Ma trận trên điện thoại xếp 1 cột, tên việc xuống 2 dòng thay vì bị cắt. Logo nhỏ lại trên điện thoại. Icon các tab "Sắp có" mờ đi, chữ "Sắp có" 12px. Thêm biểu tượng web (`src/favicon.svg`). Ô chọn ngày có thêm dòng ngày kiểu Việt Nam.
- Sửa lỗi trang trượt ngang khoảng 8 đến 22px trên điện thoại (lưới tab Hôm nay và Top 3 chưa giới hạn bề ngang).
- Tab Hôm nay (theo góp ý của người dùng): bỏ 3 chip trong khung chào, thay bằng **biểu đồ tổng quan** (xong trên tổng, tỷ trọng theo tình trạng, mức ưu tiên, độ khẩn cấp; `logic.workList`, `logic.dayStats`, `views.overview`). Dạng Danh sách đổi thành **Bảng** tác vụ, lọc hạn đến ngày mai (`views.taskTable`). Top 3 mỗi ngày tự điền chỗ trống bằng việc trễ hạn rồi việc Khẩn cấp (`logic.top3Suggest`, `app.autoFillTop3`, nhớ ngày đã điền ở localStorage `lp_top3_auto`). Thêm khối **Sắp đến hạn** (hạn từ ngày kia đến 7 ngày tới). Ma trận đổi tên ô: Khẩn cấp, Lên lịch, Xử lý sau, Xem xét, dưới tên ghi cách xử lý. Đã ghi vào SPEC mục 5, 7 và DESIGN.md.

### Kết quả kiểm tra đợt góp ý tab Hôm nay (22/11/2026)
- spec-reviewer: đủ 6 ý. 1 lỗi Trung bình (việc xong trong bảng không hiện dấu tick xanh), đã sửa. Đã sửa các lỗi Thấp: câu gợi ý ma trận và Top 3, cờ tự điền Top 3 chỉ ghi khi có việc để điền hoặc Top 3 đã đủ, ghi chú tài liệu (favicon, dòng ngày, mốc 560px, ngoại lệ màu).
- qa-tester: ĐẠT, không lỗi Cao hay Trung bình. Đã sửa: % trong chú thích biểu đồ làm tròn sao cho tổng luôn 100.
- Bộ `tests-qa/qa-lifeplanner.js` cập nhật theo giao diện mới: đạt toàn bộ.

### Quyết định khi duyệt Giai đoạn 1 (22/11/2026)
- Duyệt Giai đoạn 1.
- Giữ mặt trời có mặt cười trong khung chào (ngoại lệ của quy tắc "không dùng mascot").
- Tab Task làm ngay ở Giai đoạn 2. Thêm nút "Thêm task đầy đủ" mở form ngay.
- Giữ dữ liệu thử trong Sheet để tiếp tục kiểm thử.

### Quyết định cho Giai đoạn 2 (22/11/2026)
- Task lặp sinh bù: ngày cũ chưa làm chỉ tính vào % mục tiêu (là chưa xong), không hiện ở Quá hạn, không tự lên Top 3. Tab Hôm nay chỉ hiện lần lặp của hôm nay.
- Cảnh báo tiến độ chậm: khi % đạt được thấp hơn một nửa % thời gian đã qua của kỳ.
- Tab Mục tiêu mặc định lọc "Đang diễn ra" (hôm nay nằm trong khoảng ngày của mục tiêu), chọn được Năm / Quý / Tháng / Tuần và kỳ cụ thể.
- Mục tiêu theo chỉ số: nút "+ cập nhật" mở ô nhập số, mặc định 1.

### Giai đoạn 2: đã làm (22/11/2026)
- **Tiến độ theo chỉ số**: form mục tiêu có "Cách tính tiến độ" (Theo task / Theo chỉ số) với Đơn vị, Chỉ tiêu, Đã đạt. Thẻ hiện "12/50 km". Trang chi tiết có nút "Cập nhật {đơn vị}" mở ô nhập số (mặc định 1, số âm để trừ). Đủ 100% thì có hiệu ứng mừng.
- **Lọc theo kỳ** ở tab Mục tiêu: Đang diễn ra (mặc định) / Năm / Quý / Tháng / Tuần / Tất cả, chọn loại kỳ thì có thêm ô chọn kỳ cụ thể. Ô trống thì nút "Tạo mục tiêu" điền sẵn kỳ.
- **Task lặp lại**: form task có "Lặp lại" (Không lặp / Hằng ngày / Theo thứ). Việc mẫu lưu luật ở cột `recurring_rule` dạng chữ ("Hằng ngày", "Hằng tuần: T2, T4, T6"). Mỗi lần mở web tự sinh các lần lặp đến hôm nay (bù tối đa 30 ngày), mã lần lặp = mã việc mẫu + ngày nên mở trên nhiều máy không bị trùng. Lần lặp bỏ lỡ chỉ tính vào %, xem được ở tab Task, lọc Hạn "Lần lặp bỏ lỡ".
- **Cảnh báo tiến độ chậm**: mục tiêu Đang làm, đang trong kỳ, đã qua ít nhất 10% thời gian và % đạt dưới một nửa % thời gian đã qua. Hiện chữ "Chậm tiến độ" trên thẻ, ghi chú trên trang chi tiết, và khối cảnh báo ở tab Hôm nay. Mốc 10% là để tránh báo ngay những ngày đầu kỳ.
- **Tab Task**: bộ lọc Trạng thái / Ưu tiên / Mục tiêu / Hạn, sắp xếp theo hạn hoặc ưu tiên, nút Bỏ lọc, bảng việc, danh sách Việc lặp lại.
- **Nút "Thêm đầy đủ"** cạnh ô thêm nhanh: mở form task đầy đủ.
- Dữ liệu mẫu bản mock: thêm mục tiêu chỉ số "Chạy đủ 50 km trong tháng", 2 việc lặp (uống nước hằng ngày, yoga T2 T4 T6). Đổi khóa lưu mock thành `muctieu_mock_db_v2`.
- Bộ kiểm thử `tests-qa/qa-lifeplanner.js` cập nhật theo: 235 PASS, 0 FAIL.

### Duyệt Giai đoạn 2 (22/11/2026)
- Người dùng: "Sắp đến hạn ở tất cả các tab = hôm nay + 2 ngày", "sửa xong lỗi thì auto duyệt". Đã sửa: `logic.isDueSoon` (mốc `SOON_DAYS = 2`) dùng chung cho nhãn trên việc ("Sắp đến hạn: hôm nay / ngày mai / ngày kia", tông cam), khối Sắp đến hạn ở tab Hôm nay và lọc Hạn "Sắp đến hạn" ở tab Task. Trong bảng trên điện thoại nhãn chỉ ghi "hôm nay / ngày mai / ngày kia" cho gọn. Độ khẩn cấp của ma trận giữ nguyên (hạn đến ngày mai).
- Người dùng báo chưa thấy nút lọc Năm / Quý / Tháng / Tuần: trên web thật nút có hiện, do trình duyệt giữ bản cũ. Hướng dẫn bấm Ctrl+F5.
- **Giai đoạn 2 xong, duyệt 22/11/2026.**

### Kết quả kiểm tra Giai đoạn 2 (22/11/2026)
- spec-reviewer: 10/13. qa-tester: ĐẠT, không lỗi Cao, 0 lỗi console ở 390px và 1280px.
- Đã sửa (Trung bình): lần lặp bỏ lỡ không còn bị đếm vào Top 3 hay chuyển sang hôm sau; "Đã đạt" của mục tiêu chỉ số không xuống dưới 0, % hiển thị kẹp trong 0 đến 100; số trong luật lặp ("Thứ 2, 4, 6"), nhãn T2 đến T7 trong form và thông báo cộng chỉ số dùng kiểu số. Thêm: số thập phân hiện dấu phẩy (2,5), thông báo ghi đúng lượng thực đã cộng hoặc trừ.
- Lỗi mức Thấp còn tồn:
  - Nút ghi "Thêm đầy đủ" (SPEC ghi "Thêm task đầy đủ"), rút gọn để vừa điện thoại. Ở 390px chữ gợi ý trong ô thêm nhanh bị cắt ("Thêm việc,").
  - Xóa tay một lần lặp đã sinh thì lần mở web sau nó được sinh lại (nếu còn trong 30 ngày).
  - Trang chi tiết mục tiêu liệt kê cả lần lặp bỏ lỡ, có thể dài.
  - Mục tiêu theo task chưa có task nào vẫn có thể bị báo "Chậm tiến độ".
  - Cột đầu bảng task ghi "Ô" (ô ma trận) hơi khó hiểu.
  - Chế độ tối chưa có (đúng lộ trình, Giai đoạn 4).

### Giai đoạn 3: đã làm (22/11/2026)
- Quyết định của người dùng: tick bù mọi ngày đã qua; streak chỉ đếm ngày cần làm; % mục tiêu theo thói quen tính đến hôm nay; lưới mặc định 7 ngày.
- **Tab Thói quen** (`src/js/views/habits.js`): mỗi thói quen một thẻ có tên, tần suất, mục tiêu gắn kèm, chuỗi hiện tại và dài nhất, lưới tick 7 ngày hoặc cả tháng (lịch bắt đầu thứ 2), nút lùi về tuần/tháng trước. Ô ngày không cần làm và ngày tương lai không bấm được. Thói quen tạm dừng xếp riêng ở dưới.
- **Form thói quen**: tên, mục tiêu, tần suất (Hằng ngày / Theo thứ), trạng thái Đang theo / Tạm dừng. Xóa thì xóa luôn các ngày đã ghi (hỏi trước, gợi ý Tạm dừng nếu muốn giữ lịch sử).
- **Tab Hôm nay**: khối "Thói quen hôm nay" dưới Top 3, tick một chạm.
- **Mục tiêu**: thêm cách tính "Theo thói quen". Thẻ hiện "28/30 ngày đã tick". Trang chi tiết có mục "Thói quen của mục tiêu" và nút "Thêm thói quen". Xóa mục tiêu thì thói quen gắn kèm được giữ, chỉ bỏ liên kết.
- Bản mock: thêm mục tiêu "Giữ nếp sống lành mạnh" (theo thói quen) và 4 thói quen (1 tạm dừng) có lịch sử 25 ngày. Khóa mock đổi thành `muctieu_mock_db_v3`.
- Không đổi cột Sheet: dùng sẵn Habits và HabitLogs như Code.gs đã có.
- Bộ kiểm thử: 231 PASS, 0 FAIL (bỏ phần kiểm "Sắp có" của tab Thói quen).

### Kết quả kiểm tra GĐ3
- spec-reviewer: 14/15 đạt. qa-tester: đạt, 0 FAIL, 0 lỗi console.
- Đã sửa:
  - (Vừa) Thói quen tạm dừng vẫn kéo % mục tiêu xuống. Nay thói quen tạm dừng chỉ cộng ngày đã tick, ngày bỏ trống không tính.
  - (Thấp) Chặn tick vào ngày không cần làm ngay cả khi bấm ép (`toggleHabit` kiểm `isHabitDay`).
  - (Thấp) Ô tick ở điện thoại hẹp hơn 44px. Nay rộng ít nhất 44px ở màn 360px.
- Ghi nhận, chưa sửa:
  - (Thấp) Streak không biết thói quen đã tạm dừng từ ngày nào (Sheet không lưu lịch sử tạm dừng), nên bật lại thì các ngày tạm dừng làm đứt chuỗi.
  - (Thấp) `goalProgress` đọc thẳng store để lấy thói quen.
  - (Thấp) Ngày bắt đầu theo dõi lấy 10 ký tự đầu của `created_at`, phụ thuộc múi giờ lúc tạo.
  - Thói quen mới tạo vẫn tick bù được các ngày trước ngày tạo (đúng quyết định "tick bù mọi ngày đã qua").
- qa-tester chạy lại sau khi sửa: đạt, 0 lỗi.

### Duyệt Giai đoạn 3 (22/11/2026)
- Người dùng trả lời "ok".
- **Giai đoạn 3 xong, duyệt 22/11/2026.**

### Giai đoạn 4: đã làm (22/11/2026)
- Quyết định của người dùng: % trung bình tính mục tiêu có thời gian trùng kỳ; % đúng hạn chỉ tính việc xong có hạn; Nhập JSON thay toàn bộ, hỏi trước; nút chế độ tối trong Cài đặt.
- **Tab Tổng kết** (`src/js/views/review.js`, `App.summary` trong `logic.js`): chọn Tuần / Tháng, lùi tới kỳ trước; 3 con số (việc đã xong, % đúng hạn, % trung bình mục tiêu); biểu đồ đường việc xong theo ngày (tháng chọn được theo tuần), rê chuột hoặc chạm để xem số, có bảng số liệu; biểu đồ thanh % từng mục tiêu tô màu theo nhóm, có chú thích; review 3 câu lưu theo kỳ và danh sách review đã lưu.
- **Chế độ tối**: bộ màu tối theo DESIGN.md, theo cài đặt máy hoặc chọn tay trong Cài đặt (lưu trên từng thiết bị). Màu biểu đồ đã chạy kiểm tra mù màu; bản tối có cam và hồng nhạt sáng hơn dải khuyến nghị một chút, bù bằng chú thích và số ghi trực tiếp.
- **Sao lưu**: Cài đặt có Xuất JSON và Nhập JSON. Nhập thì hỏi lại, tự tải bản hiện tại về máy rồi mới thay. `Code.gs` thêm thao tác `replaceAll` (cần cập nhật Apps Script theo hướng dẫn).
- **PWA**: `manifest.json`, `sw.js` (trang chính lấy bản mới trên mạng trước, CSS/JS dùng bản đã lưu theo số phiên bản), icon 192/512/maskable/apple. Mở được khi mạng chập chờn; dữ liệu Sheet vẫn cần mạng.

### Kết quả kiểm tra GĐ4
- spec-reviewer: 12/13 đạt. qa-tester: đạt, 245 PASS, 0 FAIL, 0 lỗi console. Không có lỗi Cao hay Trung bình. qa-tester chạy lại sau khi sửa: đạt.
- Đã sửa (Thấp):
  - Chế độ tối: nhãn tab đang chọn tương phản 3.2:1. Đổi `--accent-deep` bản tối thành màu sáng hơn (5.2:1).
  - `replaceAll_` ghi dữ liệu mới trước rồi mới xóa dòng thừa, lỡ bị ngắt giữa chừng không bị trống Sheet.
  - Nhập file không có dòng nào thì hộp thoại báo rõ "web sẽ trống".
  - Bỏ mã màu dự phòng viết thẳng trong `App.theme`. Biểu đồ đường co được tới 220px (màn 320px).
- Người dùng yêu cầu xử lý hết giới hạn (22/11/2026). Đã làm:
  - Claude cập nhật Apps Script qua Chrome: dán Code.gs mới, triển khai Phiên bản 2, link web app giữ nguyên.
  - % mục tiêu trong Tổng kết tính tại cuối kỳ (`logic.goalProgressAt`). Theo chỉ số không có lịch sử: hiện số hiện tại kèm dấu * khi mục tiêu sửa sau kỳ.
  - Biểu đồ % mục tiêu đổi sang cột đứng.
  - Mất mạng: dòng trạng thái báo "Mất mạng, sẽ lưu khi có mạng", không hiện thông báo lỗi; có mạng lại tự lưu phần chờ và tải dữ liệu mới.
  - Chế độ tối: nút đang chọn dùng màu hồng, thông báo nổi nền tối (`--sel-*`, `--toast-*`). Logo và tên task có vùng bấm 44px. Màn 320px hết cuộn ngang (`overflow-x:clip`, nhãn mục tiêu co theo khung).
  - Nhập JSON kiểm ngày yyyy-mm-dd và các giá trị chọn (nhóm, kỳ, trạng thái, ưu tiên...); ô sai được báo trước và sửa về mặc định hoặc để trống.
  - Mã màu trong manifest và theme-color ghi vào danh sách ngoại lệ của DESIGN.md.
  - Kiểm lại (spec-reviewer 7/7, qa-tester đạt, 245 PASS). Sửa thêm: nhập JSON bỏ dòng ngày tick sai ngày và review sai loại kỳ, kiểm chỉ tiêu/thực tế là số, kỳ khớp loại kỳ, ngày phải đúng 10 ký tự; chữ logo co nhỏ ở màn 320px để không đè nút. qa-tester xác nhận lại: đạt.
  - Ghi nhận (Thấp): dấu * của mục tiêu theo chỉ số dựa vào updated_at của cả dòng, nên sửa tên mục tiêu sau kỳ cũng hiện *. Hai khối biến chế độ tối (theo máy, chọn tay) giống hệt nhau, sửa màu tối phải sửa cả hai.
- Ghi nhận cũ (đã xử lý ở trên, giữ để tra lại):
  - Chế độ tối: nút đang chọn của bộ chuyển (Tuần/Tháng, chip lọc) và thông báo dùng nền `--ink` nên sáng màu. Đây là kiểu đảo màu có chủ ý, chữ vẫn đọc tốt.
  - Chữ logo LIFE PLANNER cao 40px ở 390px; nút tên task trong chi tiết mục tiêu cao 32px (cả hàng vẫn trên 44px).
  - Tab Hôm nay ở màn 320px dư 8px cuộn ngang (hoa trang trí và nhãn mục tiêu). SPEC chỉ yêu cầu 390px, ở 390px không bị.
  - Nhập JSON chỉ kiểm cột và id, không kiểm định dạng từng giá trị.
  - meta theme-color và manifest ghi thẳng mã màu nền (không dùng được biến CSS).

### Giai đoạn 5: đã làm (22/11/2026)
Góp ý sau khi dùng thử, quyết định ghi ở SPEC mục 4.5.
- **Agenda** (đổi tên từ Hôm nay, đứng đầu thanh tab): lùi / tiến ngày, chọn ngày bất kỳ, nút Về hôm nay. Việc của ngày D = hạn ngày D + quá hạn chưa xong tính đến D + xong trong ngày D (`logic.dayList`). Top 3 chỉ hiện ở hôm nay; thói quen theo ngày đang xem (ngày tương lai không tick được). Thêm nhanh điền sẵn ngày đang xem và 17:00.
- Bảng việc: bấm tiêu đề cột để sắp xếp, bấm lần nữa đảo chiều (Agenda và Task nhớ riêng). Mặc định xếp theo ngày rồi giờ.
- Biểu đồ tổng quan mới: Trạng thái hoàn thành; Trạng thái đến hạn (3 thanh xếp chồng Xong / Chưa xong); Mức độ quan trọng (3 thanh chia theo 4 ô ma trận). Mỗi thanh có số và chú thích.
- Ma trận có 2 trục (Khẩn cấp / Không khẩn cấp, Quan trọng / Không quan trọng), tên mới: Khẩn cấp, Làm sau, Làm trong ngày / Nhượng quyền, Dời hôm sau. Giữ màu cũ.
- Lời nhắc ở đầu Agenda: "Cần chú ý" của review ngày hôm trước; "Chưa tốt" và "Kỳ sau ưu tiên" của review tuần / tháng trước, hiện suốt kỳ này. Nút Ẩn (từ ngày đang xem trở đi), nút Hiện lại.
- **Task**: thứ tự tab Agenda, Task, Mục tiêu, Thói quen, Tổng kết. Bộ lọc Hoàn thành, Đến hạn, Quan trọng (ưu tiên), Khẩn cấp (ô ma trận), Mục tiêu, khoảng ngày hạn từ - đến. Form việc có ô Giờ, ngày và giờ bắt buộc.
- **Thói quen**: thêm xem Năm (12 tháng nhỏ, chỉ xem, có % từng tháng). Chuỗi hiện bằng huy hiệu ngọn lửa.
- **Tổng kết**: kỳ Ngày / Tuần / Tháng / Năm; bên dưới chọn gộp theo Ngày / Tuần / Tháng (không lớn hơn kỳ; kỳ Ngày xem 7 ngày tính đến ngày đó). Thêm ô "tỷ lệ hoàn thành" và biểu đồ đường mượt tỷ lệ hoàn thành (việc xong / việc có hạn từng mốc). Thêm phần tổng kết thói quen. Review có 5 mức hài lòng vẽ bằng bông hoa (1 héo rũ, 5 nở tươi); review ngày có 2 câu.
- **Nền**: hoa rơi 46 bông, 13 màu, vừa rơi vừa đung đưa; máy bật giảm chuyển động thì hoa đứng yên.
- **Dữ liệu**: Tasks thêm `due_time`; Reviews thêm `rating`, `hide_from`. `Code.gs` thêm `ensureColumns_`: tự thêm cột còn thiếu vào cuối dòng tiêu đề trước mỗi lần ghi (cần cập nhật Apps Script). Nhập JSON kiểm giờ HH:mm và mức 1 đến 5.
- Màu biểu đồ Mức độ quan trọng dùng màu 4 ô ma trận (người dùng chọn giữ màu cũ). Kiểm tra mù màu: vàng (Làm sau) và cam (Làm trong ngày) gần nhau, xanh xám (Dời) nhạt. Bù bằng chú thích có số, khe 2px giữa các đoạn, chú thích nổi và nhãn đọc màn hình.
- Kiểm thử tự động thêm mục H (Giai đoạn 5). Ma trận và tổng quan trong bài thử đổi sang cách tính việc của ngày.

### Kết quả kiểm tra GĐ5
- spec-reviewer: 16/17 đạt, chỉ có lỗi Thấp. qa-tester: đạt, 1 FAIL do bộ thử tính sót lần lặp (app đúng), 0 lỗi console; số liệu Agenda khớp tính tay từ 18/11 đến 26/11; lời nhắc tuần / tháng hết đúng khi sang kỳ mới.
- Đã sửa (Thấp): cột ngôi sao Top 3 cũng sắp xếp được; chú thích `dayList` ghi rõ lần lặp chỉ hiện đúng ngày của nó; chữ "Hôm nay" ở ô chào đổi sang `--accent-deep`; bộ thử tính cả lần lặp khi xem ngày đã qua.
- Ghi nhận (Thấp, chờ người dùng xem):
  - Lần lặp quá hạn chưa làm chỉ hiện ở đúng ngày của nó, không kéo sang ngày sau (giữ khái niệm "Bỏ lỡ" từ GĐ2). Việc thường quá hạn thì kéo sang.
  - Tổng kết kỳ Ngày: biểu đồ đường hiện 7 ngày tính đến ngày đang xem.
  - Có thêm review kỳ Năm (SPEC chỉ nêu Ngày / Tuần / Tháng). Lời nhắc chỉ lấy từ review ngày, tuần, tháng.
  - Bộ lọc Task giữ thêm "Chưa có hạn", "Lần lặp bỏ lỡ", "Cần làm", "Đang làm" từ giai đoạn trước.

### Duyệt Giai đoạn 5 (22/11/2026)
- Người dùng duyệt GĐ5 cùng lúc duyệt kế hoạch GĐ6. Dòng "hhh" ở Tasks: người dùng tự xóa.

### Giai đoạn 6: XONG (22/11/2026, người dùng cho duyệt tự động sau khi kiểm)
Đã triển khai Apps Script Phiên bản 4, đã chuyển cột Sheet thật, đã xóa dòng "Uống đủ 2 lít nước". Web thật mở được, không lỗi console. Chưa kiểm được lưu thật từ web (cần mã bí mật trên máy người dùng): việc tự tạo sheet Interruptions và Settings sẽ xảy ra ở lần lưu đầu.

#### Chi tiết đã làm
Lập kế hoạch ngày, SPEC mục 4.6. Quyết định của người dùng: việc Công việc về kho lúc 17:30, việc buổi tối giữ tới hết ngày; báo ngay khi đặt vượt quỹ; ngày thường 5h15 giờ làm + 1h30 buổi tối, cuối tuần 1 quỹ 4h; hạn chót có giờ là tùy chọn.
- **Dữ liệu**: Tasks thêm `do_date`, `duration_min`, `is_important`, `parent_id`, `first_step`, `defer_count`, `inbox_since` (thêm ở cuối, không đổi tên cột cũ). Sheet mới `Interruptions` và `Settings` (1 dòng `id = main`). `Code.gs` tự tạo sheet còn thiếu.
- **Kho việc**: việc chưa có Ngày sẽ làm nằm trong kho. Tab Task có nút Kho, sắp theo lâu nhất / dời nhiều / quan trọng, lọc mục tiêu. Mỗi tuần một lần nhắc "Xem lại kho" (giữ, chia nhỏ, đặt ngày, bỏ).
- **Quỹ giờ** ở đầu Agenda: thanh Đã xong / Đã xếp / Đột xuất so với quỹ, báo vượt quỹ. Cài đặt có mục Quỹ giờ.
- **Kế hoạch hôm nay**: lần đầu mở web mỗi ngày hiện gợi ý vừa quỹ, mỗi việc có lý do; sắp xếp, bỏ, thêm; việc dời 3 lần phải chọn Vẫn giữ / Hỏi lại / Bỏ trước khi chốt. Chốt: 3 việc đầu thành 3 việc chính.
- **Thêm nhanh**: chọn thời lượng, ngày, Quan trọng ngay trong ô; việc từ 2h đặt vào ngày thì vào kho và gợi ý Chia nhỏ; vượt quỹ thì báo ngay.
- **Chia nhỏ**: việc con 15p / 30p / 1h, mục tiêu tính % theo việc con (việc cha không tính).
- **Đột xuất**: nút nổi ở Agenda hôm nay; trừ vào quỹ; việc không còn kịp thì hỏi đưa về kho. Tổng kết có thống kê đột xuất 14 ngày.
- **Ma trận**: Quan trọng do người dùng đánh dấu (dữ liệu cũ: ưu tiên Cao), gấp = hạn chót trong 2 ngày tới. Agenda ngày D = việc có Ngày sẽ làm là D + xong trong ngày D; việc quá hạn chót hiện ở thẻ riêng.
- **Sang ngày mới**: việc chưa xong của hôm trước về kho, dời +1. Lần lặp không về kho.
- Bỏ: Top 3 tự giữ / tự điền (thay bằng chốt kế hoạch), giờ hạn mặc định 17:00.
- Kiểm thử: bộ thử chính cập nhật theo cách tính mới; thêm `tests-qa/flow-gd6.js` (luồng GĐ6) và `tests-qa/smoke-gd6.js`. Tham số mock mới `?now=HH:mm`.
- Sửa thêm: thông báo lỗi lưu (có nút Thử lại) không còn bị thông báo khác che mất; thông báo khác tắt thì lỗi hiện lại, lưu được thì tự tắt.

**Kết quả kiểm tra GĐ6**: spec-reviewer và qa-tester không có lỗi Cao về code; lỗi Cao và Trung bình đã sửa. Lỗi Thấp còn lại:
- Đổi thứ tự việc trong Kế hoạch bằng nút lên/xuống, chưa có kéo thả.
- Việc cha đã chia nhỏ hiện "x/y việc con", không hiện %.
- Thanh quỹ ghi "/ quỹ trừ đột xuất".
- Việc về kho chỉ chạy khi mở hoặc tải lại web.
- Ô lọc cao 40px.
- Hình trang trí có mã màu viết thẳng (có từ trước).
- Dòng "(quỹ 4h )" có khoảng trắng thừa.
- Ở 390px, trong "Xem lại kho", thông báo vượt quỹ cuối tuần hiện đè lên nút "Đặt ngày" khoảng 5 giây (`forms.js` dòng 434).

## Sau nghiệm thu GĐ6 (23/11/2026, docs/NGHIEM-THU-GD6.md)
- M1 đã sửa: lần lặp tính trước vào quỹ, không còn quá tải giả, không đề xuất đưa lần lặp về kho.
- M2 đã sửa: cột `bucket`, chọn Giờ làm / Buổi tối cho việc không gắn mục tiêu. Việc cũ chưa có `bucket` chọn sẵn Buổi tối.
- M3 (điện thoại) đã duyệt và làm: 3 việc chính hôm nay ngay sau Quỹ giờ (390px: từ 1318px xuống 679px), mục tiêu chậm tiến độ thu thành một dòng bấm Xem, ô thêm nhanh ẩn tùy chọn sau nút Tùy chọn (tự mở khi bấm vào ô gõ tên).
- Nhãn "Chưa xong, vừa về kho" cho việc tự về kho trong 2 ngày gần nhất (Kho, Kế hoạch, Xem lại kho).
- Lỗi Thấp mới: `backup.js` không kiểm giá trị `bucket` khi nhập; mỗi ô thêm nhanh giữ lựa chọn bucket riêng; lần lặp từ 2h (khó xảy ra) vẫn tính trong quỹ; ở 390px nhãn "Mục tiêu" và "Việc này tính vào" trong form xuống dòng xấu.

## Câu hỏi chờ người dùng
- (chưa có)

## Lỗi mức Thấp của đợt đổi giao diện
- Dữ liệu mẫu có việc "Họp chốt số liệu với phòng kế toán" đã Xong mà ngày xong ở tương lai (`mock-data.js`), nên giả lập sang ngày hôm sau sẽ thấy 1 việc xong sẵn. Chỉ ảnh hưởng bản mock.
- Màu đỏ còn dùng cho nút Xóa và lỗi trong form (ngoài nghĩa "gấp"). Nhãn ưu tiên Cao cùng họ hồng với trái tim.
- Bo góc vài khối khác 22px: khung chào và hộp thoại 24px, ô ma trận 20px, giấy note 18px.
- Hình nền và hoa bung chỉ dùng 11 loại hoa, không dùng cành lá (cành lá chỉ để trang trí cố định).

## Đề xuất thêm (chờ duyệt)
- (chưa có)

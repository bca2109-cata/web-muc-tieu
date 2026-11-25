# SPEC V2 đầy đủ (chỉ để tra cứu)

> Agent **không đọc cả file này**. Dùng `01-HOP-DONG-CHUNG.md`, `02-THIET-KE.md` và file phần của mình. Nếu file này mâu thuẫn với các file đó thì các file đó đúng.

# SPEC V2: Life Planner bản clean (dựng lại)

> Viết ngày 25/11/2026, sau 4 vòng hỏi người dùng.
>
> **File này thay thế** các file KE-HOACH-TONG-THE.md, SPEC-GD8 đến SPEC-GD11. Các giai đoạn đó **dừng lại**, không làm tiếp.
>
> Web cũ vẫn chạy nguyên cho tới khi tôi chuyển hẳn sang bản mới.

## 1. Vì sao dựng lại
- Web cũ được xây quanh việc **lập kế hoạch cho những việc tự do**: quỹ giờ, ma trận, bản nháp, chốt, kho, việc chính. Mỗi vòng sửa lại thêm một cơ chế, nên càng dùng càng rối.
- Công việc thật của tôi chủ yếu là **"không quên"**:
  1. **Danh sách cố định buổi sáng.** Có việc có giờ cứng, có việc chỉ cần đúng thứ tự. Cần tick để không quên.
  2. **Báo cáo ad-hoc** do trưởng phòng hoặc TBP sales đặt. Không thường xuyên. Cần lịch để nhớ hạn và chọn ngày làm (đổi được).
  3. **Việc lặp hằng ngày chia thành nhiều hạng mục rải trong ngày**, có hạng mục rơi vào ngày hôm sau. Tick từng hạng mục, tick hết là xong. Cuối ngày soát lại để không sót.
  4. **Ghi chú bàn giao**, gắn vào việc lặp lại hoặc ad-hoc, tìm lại được.
- Phần cá nhân giữ lại nhưng **không lẫn vào công việc**: thói quen, mục tiêu năm/quý/tháng, việc cá nhân có ngày, quỹ giờ và ghi đột xuất.

## 2. Nguyên tắc clean (bắt buộc)
1. **Agenda dùng để tick.** Chỉ có một dải 3 biểu đồ nhỏ về ngày hôm nay ở trên cùng. Không có ma trận, không có bản nháp hay nút chốt.
2. Một việc chỉ xuất hiện **một lần** trên một màn.
3. **5 tab:** Agenda · Lịch · Ghi chú · Mục tiêu · Tổng kết. Cộng thêm bánh răng Cài đặt.
4. **Một nút "+"** và **một ô tìm kiếm** (tìm không dấu).
5. **Web không tự quyết thay tôi.** Web chỉ nhắc (tô màu, thông báo) và mang việc bỏ sót sang hôm sau.
6. **Không có các khái niệm:** ★ việc chính, ma trận để xếp việc, bản nháp/chốt, kho, "dời ≥ 3 lần", bước đầu tiên, giờ làm/tối chọn tay.
7. **Mức quan trọng và khẩn cấp chỉ là biểu tượng để nhìn** (mục 3.7). Chúng không tự xếp lại thứ tự hay tự dời việc.

## 3. Các thành phần dữ liệu (dễ hiểu)

| Thành phần | Là gì | Ví dụ |
|---|---|---|
| **Mẫu công việc** | Một việc lặp lại, gồm nhiều **hạng mục** | "Báo cáo buổi sáng", "Chia số AI Class Cross sale", "Chốt số tháng" |
| **Hạng mục** | Một dòng để tick trong mẫu | "11:00 Cop số lần 1" |
| **Lượt** | Mẫu công việc của **một ngày cụ thể** | "Chia số AI Class, ngày 25/11" |
| **Việc** | Việc làm một lần: ad-hoc hoặc cá nhân | "BC phân tích nguồn T11, hạn T6" |
| **Thói quen** | Tick mỗi ngày, có chuỗi ngày liên tiếp | "Uống nước 2 lít" |
| **Mục tiêu** | Năm / quý / tháng, có tiến độ | "Thành thạo Power BI Q1/2027" |
| **Ghi chú** | Nội dung bàn giao, quy trình, ý tưởng | "Hướng dẫn chia số AI Class" |
| **Ngày nghỉ** | Ngày không tạo lượt | Nghỉ lễ, nghỉ phép |
| **Đột xuất** | Thời gian bị chen ngang | "Hỗ trợ sale lấy data, 30p" |

### 3.1 Mẫu công việc
- **Trường:** tên, nhóm (Công việc / Cá nhân), ghi chú gắn kèm (tùy chọn), mốc "xong trước" (tùy chọn, ví dụ 8:30), đang dùng hay tạm dừng.
- **Lịch lặp**, một trong 2 kiểu:
  - **Theo thứ:** chọn các thứ trong tuần. Mặc định T2–T7, vì tôi có làm Thứ Bảy.
  - **Theo khoảng ngày trong tháng:** ví dụ ngày 1 đến ngày 3. Lượt hiện **mỗi ngày trong khoảng** cho tới khi tick hết, kèm nhãn "còn N ngày". Tick hết thì các ngày còn lại trong khoảng không hiện nữa.
- **Hạng mục** có thứ tự. Mỗi hạng mục gồm:
  - Tên.
  - **Giờ** (tùy chọn). Có giờ thì là giờ cứng. Không giờ thì làm theo thứ tự.
  - **Ngày lệch** (mặc định 0). Giá trị +1 nghĩa là hạng mục nằm ở **ngày làm việc kế tiếp**, ví dụ "Cop lại lần cuối" của lượt 24/11 làm vào 25/11. Ngày làm việc kế tiếp bỏ qua Chủ nhật và các ngày nghỉ đã đánh dấu.
  - **Lưu ý ngắn** (tùy chọn, 1 dòng, hiện mờ dưới tên).
  - **Link** (tùy chọn).
- **Sửa mẫu, 2 cách:**
  - **Màn "Mẫu công việc"** trong Cài đặt: sửa một lần, **áp dụng từ hôm nay hoặc từ mai** (tôi chọn). Lịch sử cũ giữ nguyên.
  - **Ngay trong Agenda:** thêm, bớt, đổi giờ một hạng mục. Web hỏi "Chỉ hôm nay" hay "Từ nay về sau".

### 3.2 Lượt và lịch sử
- Mỗi ngày, web tạo lượt cho các mẫu khớp lịch. Ngày nghỉ thì không tạo.
- Tick một hạng mục thì lưu thời điểm tick. Bỏ tick được trong ngày.
- **Lịch sử giữ vĩnh viễn**, xem lại bằng cách lùi ngày ở màn Agenda (chỉ xem) hoặc qua Lịch tháng.

### 3.3 Việc (ad-hoc và cá nhân)
- **Trường:** tên, loại (**Ad-hoc công việc** / **Cá nhân**), người đặt (tùy chọn, ví dụ "TBP Sales"), **hạn chót** (ngày, có thể kèm giờ), **ngày làm** (đổi được bất cứ lúc nào), thời lượng ước tính (tùy chọn), mục tiêu (tùy chọn), ghi chú gắn kèm (tùy chọn).
- **Bước con** (tùy chọn): một danh sách tick. Mỗi bước con có thể có **ngày làm riêng**, nhờ vậy một báo cáo ad-hoc rải được ra nhiều ngày. Tick hết bước con thì việc tự xong.
- Khi tạo việc ad-hoc, web **gợi ý ngày làm** là ngày làm việc trước hạn chót 1 ngày. Tôi đổi được.
- Việc quá ngày làm mà chưa xong: tự hiện ở **Từ hôm qua** của ngày kế tiếp, kèm nhãn "chưa xong từ dd/mm". Không có cơ chế ép phải chọn cách xử lý.

### 3.4 Thói quen, Mục tiêu
- **Thói quen:** tên, giờ (tùy chọn), các thứ trong tuần. Tick ở Agenda. Có chuỗi ngày liên tiếp.
- **Mục tiêu:** năm, quý hoặc tháng. Tiến độ tính theo việc gắn với mục tiêu, hoặc theo số nhập tay (thực tế / target). Giữ cách hiển thị đơn giản như web cũ.

### 3.5 Quỹ giờ và Đột xuất
- Quỹ giờ chỉ áp dụng cho **Việc** (ad-hoc và cá nhân), vì công việc cố định là phần đương nhiên phải làm.
- Cài đặt có "Quỹ việc riêng mỗi ngày": mặc định 3h cho ngày làm việc, 1h30 cho buổi tối (cá nhân).
- **Đột xuất:** nút "+" → Đột xuất → tên và thời lượng. Thời lượng trừ vào quỹ của ngày.
- Quỹ chỉ hiện ở **đầu màn Agenda (một dòng nhỏ)** và ở **Lịch tuần**. Vượt quỹ thì đổi màu. Không có hộp thoại bắt xử lý.

### 3.7 Biểu tượng mức quan trọng và khẩn cấp
- **Quan trọng: 3 mức, tôi tự chọn**, gồm Bình thường / Quan trọng / Rất quan trọng. Mặc định là Bình thường.
  - Biểu tượng là **1–3 trái tim hồng** (quy ước của web cũ).
  - Áp dụng cho Việc, bước con và mẫu công việc (tùy chọn).
- **Khẩn cấp: web tự tính từ hạn chót**, không chọn tay:
  - **Rất khẩn** (đồng hồ báo thức đỏ `--q1`): hạn chót là hôm nay hoặc đã quá hạn. **Ngọn lửa chỉ dành cho chuỗi thói quen.**
  - **Khẩn** (đồng hồ báo thức cam `--q3`): hạn chót trong 2 ngày tới.
  - Còn lại, hoặc không có hạn chót: không hiện biểu tượng.
- Biểu tượng hiện ở: Việc hôm nay, thẻ Lịch tuần, Soát cuối ngày, kết quả tìm kiếm. Mỗi biểu tượng có chú thích khi rê chuột (`title` và `aria-label`). Màn Agenda có một dòng chú giải nhỏ.
- **Không** dùng biểu tượng để tự sắp xếp. Danh sách vẫn xếp theo giờ và thứ tự tôi đặt. Chỉ có một bộ lọc "Quan trọng trở lên" ở Lịch tuần.

### 3.6 Ghi chú: tài liệu dài, như vở ghi bài
Ghi chú là **tài liệu dài, viết liên tục**, giống ghi bài giảng hay sổ tay bàn giao. **Không** chia thành thẻ nhỏ có ô điền sẵn.

**Trình soạn:**
- Cột viết rộng khoảng 720px, dễ đọc.
- Thanh công cụ: H1/H2/H3, đậm, nghiêng, danh sách, đánh số, việc cần làm (☐), bảng, link, **khung chú ý** (khối nền vàng).
- Có phím tắt Markdown: gõ `## ` thì thành tiêu đề, `- ` thì thành danh sách.
- **Tự lưu** khi ngừng gõ 2 giây, kèm dòng "Đã lưu hh:mm". Có lưu nháp trong trình duyệt để không mất chữ khi rớt mạng.
- Dán từ Word hoặc Google Docs vẫn giữ tiêu đề, danh sách và bảng.

**Điều hướng trong tài liệu dài:**
- **Mục lục tự sinh** từ các tiêu đề, đặt ở cột phải và dính khi cuộn. Mục đang đọc được làm nổi.
- Bấm vào mục lục thì nhảy tới mục đó.
- Có ô **tìm trong tài liệu**.
- Đầu tài liệu hiện số chữ và số mục.

**Gắn với công việc:**
- Mẫu công việc, việc ad-hoc và hạng mục gắn vào **một mục (tiêu đề) cụ thể** của tài liệu, không gắn vào cả tài liệu.
- Ngay dưới tiêu đề đó hiện nhãn "Gắn với mẫu · …".
- Bấm "Ghi chú" ở Agenda thì mở tài liệu và **nhảy thẳng tới mục đó**, trong tấm trượt hoặc trong tab Ghi chú.
- Đổi tên tiêu đề không làm mất liên kết: mỗi tiêu đề có id cố định.

**Tổ chức:**
- 2 không gian Công việc / Cá nhân, mỗi không gian là một danh sách tài liệu.
- Ví dụ: "Sổ tay bàn giao Sale Admin", "Sổ tay BI và CRM", "Khóa Power BI · ghi bài", "Nhật ký tháng 11".
- Không cần sổ con nhiều cấp.

**Khác:**
- Tìm kiếm chung tìm cả trong nội dung tài liệu, kết quả mở đúng mục chứa từ khóa.
- Từ một đoạn đang chọn trong tài liệu, bấm "Tạo việc" thì tạo việc ad-hoc gắn với mục đó.
- Xóa là xóa mềm, vào Thùng rác.
- Chỉ tải nội dung tài liệu khi mở nó.

**Dữ liệu:** sheet `Docs` gồm id, space, title, content (HTML hoặc Markdown), headings (JSON: id, cấp, tên), updated_at, deleted.
- Một tài liệu có thể dài vượt giới hạn khoảng 50.000 ký tự của một ô Sheet. Khi đó **chia nội dung thành nhiều dòng** trong sheet `DocChunks` (doc_id, part, content), và web tự ghép lại khi mở.
- Liên kết lưu ở cột `doc_id` và `heading_id` của mẫu, việc và hạng mục.

## 4. Các màn hình

### 4.1 Agenda (màn mở đầu, trước đây gọi là "Hôm nay")
Từ trên xuống:
0. **Dải biểu đồ hôm nay** (3 ô):
   - **Vòng tròn** "Hoàn thành hôm nay x/y, %", kèm quỹ việc riêng và giờ đột xuất.
   - **Thanh ngang "Tiến độ theo khối"**: mỗi lượt cố định, Từ hôm qua, Việc, ghi x/y. Đủ thì màu xanh.
   - **Cột "Tỷ lệ hoàn thành 6 ngày gần nhất"**: màu theo ngưỡng 100% xanh / 80–99% cam / dưới 80% đỏ. Agenda màu hồng vì chưa hết ngày.
   - **Nút chuyển chế độ xem: Checklist / Toàn cảnh.**
     - **Checklist:** bố cục tick theo khối như bên dưới.
     - **Toàn cảnh (dòng thời gian của ngày):**
       - **Khối "Việc tồn · chưa xếp giờ"** ở trên cùng, nền vàng nhạt. Gồm hạng mục +1 của lượt hôm qua, hạng mục bỏ sót và việc chưa xong từ trước. Mỗi dòng ghi nguồn (lượt hoặc việc gốc, ngày gốc, giờ gốc), nhãn Trễ / Bỏ sót / Chưa xong, và ô **Đặt giờ**.
       - **Đặt giờ xong thì việc rời khối tồn và vào đúng khung giờ** trên dòng thời gian, kèm nhãn **"Tồn từ dd/mm"** (viền vàng) để vẫn nhận ra. Bỏ giờ thì việc quay lại khối tồn.
       - **Dòng thời gian:** chia các đoạn SÁNG / CHIỀU / TỐI, có **vạch "Bây giờ hh:mm"**. Mặc định xếp sớm → muộn, có nút đảo **Muộn → sớm**.
         - Hạng mục không có giờ cố định hiện **giờ dự kiến "~hh:mm"** (chữ mờ): bằng giờ của hạng mục trước nó trong mẫu, cộng thời lượng hoặc 15 phút.
         - Thói quen có giờ cũng nằm trên dòng thời gian.
       - **Nhóm "Trong ngày · chưa đặt giờ"** ở cuối: việc ad-hoc và việc cá nhân chưa có giờ. Cũng có ô đặt giờ.
       - **Các cột:** Giờ | Công việc | Thuộc | Mức độ (biểu tượng) | Hạn | Trạng thái (Xong / Đến giờ / Trễ / Chưa làm). Tick được ngay trong bảng.
1. **Đầu trang:**
   - Ngày, nút ‹ › để lùi/tiến ngày. Ngày đã qua chỉ xem.
   - Một dòng nhỏ: "Việc có hạn: N · Quỹ việc riêng X / Y".
   - Nút **"Ngày nghỉ"**.
2. **Từ hôm qua** (chỉ hiện khi có), gồm:
   - Hạng mục có ngày lệch +1 của lượt hôm qua.
   - Hạng mục bỏ sót của hôm qua, nhãn "Bỏ sót".
   - Việc chưa xong từ trước.

   Mỗi dòng ghi rõ nó thuộc lượt hay việc nào, ví dụ "BC vận hành 24/11 · Đối soát CRM". Tick ở đây thì lịch sử của ngày gốc cũng được cập nhật.
3. **Cố định:** mỗi lượt là một khối.
   - Đầu khối: tên, tiến độ "x/y", mốc "xong trước" nếu có, link "Ghi chú ›".
   - Trong khối, hạng mục xếp theo giờ. Hạng mục không giờ giữ đúng vị trí thứ tự trong mẫu.
   - Hạng mục **đang tới giờ** (trong vòng 15 phút) được nền nhấn. Hạng mục **quá giờ** mà chưa tick có chữ đỏ và nhãn "Trễ N phút".
   - Cuối khối ghi "Ngày mai 8:30: …" nếu lượt có hạng mục ngày lệch +1.
   - Khối tick hết thì **tự thu gọn** thành một dòng "✓ Tên · xong lúc 8:27", bấm vào để mở lại.
   - Thứ tự khối: theo giờ của hạng mục đầu tiên chưa xong. Khối xong dồn xuống dưới.
   - Lượt theo khoảng ngày trong tháng có nhãn "còn N ngày".
4. **Việc hôm nay:** việc có ngày làm là hôm nay, cùng bước con có ngày làm là hôm nay.
   - Mỗi dòng: tick, tên, người đặt, hạn chót, bước hiện tại "bước 1/3".
   - Menu ⋯: Đổi ngày làm / Sửa / Mở ghi chú.
   - Việc cá nhân có nhãn "Tối".
5. **Thói quen:** chip tick nhanh, có chuỗi ngày.
6. **Nút "Soát cuối ngày":** mở màn soát (mục 4.5).

**Thông báo:**
- Đúng giờ của một hạng mục có giờ, nếu tab web đang mở (kể cả đang ở tab khác), thì bật **thông báo trình duyệt**, ví dụ "11:00 · Cop số lần 1 (Chia số AI Class)".
- Xin quyền thông báo một lần, có tắt/bật trong Cài đặt.
- Nếu tôi đã tick trước giờ thì không báo.

### 4.2 Lịch
Có nút chuyển **Tuần / Tháng**.

**Tuần (T2–CN):**
- Mỗi ngày một cột. Trong cột:
  - Dòng gọn về công việc cố định: "Cố định: 3 lượt", bấm vào xem danh sách.
  - Các **Việc** và bước con có ngày làm hôm đó, dạng thẻ.
  - **Mốc hạn chót** ("Hạn: BC phân tích nguồn 15:00").
  - Thanh quỹ việc riêng.
- **Kéo thả thẻ** giữa các ngày để đổi ngày làm. Thả vào ngày sau hạn chót thì hỏi xác nhận.
- Ngày nghỉ có nền xám, chữ "Nghỉ".
- Cột phụ **"Chưa có ngày"**: việc cá nhân chưa đặt ngày làm. Việc ad-hoc luôn có ngày làm.

**Tháng:**
- Lưới tháng. Mỗi ô ngày có:
  - **Chấm hạn chót.**
  - Số việc của ngày.
  - **Dấu hoàn thành công việc cố định** của ngày đã qua: ✓ đủ / ! có bỏ sót. Đây chính là lịch sử.
  - Thanh mảnh cho mẫu theo khoảng ngày, ví dụ "Chốt số tháng 1–3".
- Bấm vào ô: ngày đã qua thì mở Agenda của ngày đó (chỉ xem), ngày tới thì mở tuần chứa ngày đó.

### 4.3 Ghi chú
Theo mục 3.6.

### 4.4 Mục tiêu
Có nút chuyển **Mục tiêu / Thói quen**.

### 4.4b Tổng kết (tab riêng)
- **Chọn kỳ: Tuần / Tháng / Quý / Năm**, có nút ‹ › để lùi/tiến kỳ.
- Trang chia **5 khối có tiêu đề rõ**, thứ tự cố định:
  1. **Tổng quan:** 4 ô chỉ số:
     - Tỷ lệ hoàn thành công việc.
     - Hạng mục bỏ sót.
     - Việc ad-hoc đúng hạn (x/y).
     - Đột xuất trung bình mỗi ngày.

     Mỗi ô có dòng so sánh với kỳ trước.
  2. **Tỷ lệ hoàn thành công việc**, gồm công việc cố định và việc: **biểu đồ cột**, mỗi cột là một ngày (kỳ Tuần, Tháng) hoặc một tháng (kỳ Quý, Năm).
     - Màu theo ngưỡng: 100% xanh, 80–99% cam, dưới 80% đỏ. Kỳ đang diễn ra màu hồng.
     - Có vạch tham chiếu 100% và 80%.
  3. **Công việc cố định và việc ad-hoc**, 2 ô cạnh nhau:
     - **Bảng xếp hạng** hạng mục hay bị sót, có thanh nhỏ.
     - **Biểu đồ vòng** việc ad-hoc: đúng hạn / trễ / còn mở, giữa vòng là % đúng hạn.
  4. **Mức độ và thời gian**, 2 ô cạnh nhau:
     - **Thanh chồng ngang:** mỗi mức quan trọng là một thanh, chia theo Rất khẩn / Khẩn / Bình thường.
     - **Thanh ngang** giờ đột xuất theo ngày, tuần, tháng hoặc quý.
  5. **Thói quen và nhìn lại**, 2 ô cạnh nhau:
     - **Vòng tiến độ** cho từng thói quen.
     - 3 câu nhìn lại, lưu theo kỳ.
- Mọi số lấy từ dữ liệu thật trong Sheet. Bấm vào một cột hoặc một dòng thì mở danh sách chi tiết phía sau con số.

### 4.5 Soát cuối ngày
- Chỉ hiện hạng mục và việc **chưa tick** của hôm nay, gom theo lượt.
- Mỗi dòng có 3 lựa chọn:
  - **Đã làm** (tick bù).
  - **Mang sang mai**: hiện ở Từ hôm qua của ngày mai.
  - **Bỏ qua hôm nay**: ghi vào lịch sử là bỏ qua, kèm lý do ngắn tùy chọn.
- Không bấm Soát thì sang ngày mới, mọi thứ chưa tick **tự** thành "Bỏ sót" và hiện ở Từ hôm qua.

### 4.6 Nút "+" và Tìm kiếm
- **Nút "+":**
  - **Việc ad-hoc**: tên, người đặt, hạn chót, ngày làm (đã gợi ý sẵn), bước con, ghi chú.
  - **Việc cá nhân.**
  - **Ghi chú nhanh.**
  - **Đột xuất.**
- **Tìm kiếm** (phím `/`): tìm không dấu trong việc, mẫu công việc, hạng mục, lưu ý, ghi chú, mục tiêu.

### 4.7 Cài đặt (bánh răng)
- **Mẫu công việc:** danh sách mẫu, sửa hạng mục, lịch lặp, giờ, ngày lệch, lưu ý.
- **Ngày nghỉ:** danh sách ngày nghỉ, thêm trước cho các ngày lễ.
- Giờ làm, quỹ việc riêng, thông báo, hoa rơi, mã bí mật, sao lưu/khôi phục, thùng rác.

## 5. Dữ liệu và triển khai
- **Google Sheet mới:** "Life Planner V2 - dữ liệu". Không ghi đè Sheet cũ. Các sheet:
  - `Routines` (mẫu), `RoutineItems` (hạng mục, có `valid_from`/`valid_to` để giữ lịch sử khi sửa mẫu), `RoutineChecks` (tick theo lượt: routine_id, item_id, run_date, done_at, status `done`/`skipped`/`carried`).
  - `Tasks`, `TaskSteps`, `Habits`, `HabitLogs`, `Goals`, `Reviews`, `Interruptions`, `DaysOff`, `Settings`.
  - `Docs`, `DocChunks`.
- **Chuyển dữ liệu từ bản cũ (hỏi tôi trước):** chỉ chuyển Mục tiêu, Thói quen (cả nhật ký tick), và việc cá nhân chưa xong. Không chuyển task cũ đã xong.
- **Apps Script:** dùng mã bí mật như cũ. Có action riêng cho ghi chú, và `loadDay(date)` để chỉ tải dữ liệu cần cho Agenda.
- **Code:** đặt trong `src/v2/` của cùng repo (GitHub Pages chỉ phục vụ `src/`). Web mới chạy tại `.../web-muc-tieu/v2/`. Bản cũ giữ ở gốc cho tới khi tôi bảo chuyển.
- **Giao diện:** giữ phong cách web cũ theo `DESIGN.md` (hồng pastel, Baloo 2 + Nunito, hoa rơi, giấy note). Xem `docs/v2/02-THIET-KE.md`. Service worker theo cách đã sửa ở GĐ8 mục 0 (tự cập nhật bản mới).
- **Thiết bị:** ưu tiên máy tính (máy công ty và máy cá nhân, ≥ 1280px). Điện thoại 390px dùng được để xem và tick.

## 6. Tiêu chí hoàn thành
- Tạo mẫu "Chia số AI Class" với 4 hạng mục, trong đó "Cop lại lần cuối" có ngày lệch +1. Ngày 25/11 hạng mục đó hiện ở Từ hôm qua, ghi "Chia số AI Class 24/11".
- Lượt Thứ Bảy có tạo. Chủ nhật và ngày nghỉ đã đánh dấu thì không. Hạng mục +1 của Thứ Bảy rơi vào Thứ Hai.
- Mẫu "Chốt số tháng" theo khoảng ngày 1–3: hiện ngày 1, 2, 3, tick hết ngày 2 thì ngày 3 không hiện.
- Hạng mục 8:30 chưa tick lúc 8:42 thì chữ đỏ, "Trễ 12 phút". Đúng 11:00 có thông báo trình duyệt khi tab đang mở.
- Sửa giờ một hạng mục "Từ nay về sau" thì lịch sử ngày cũ không đổi.
- Không soát, sang ngày mới thì hạng mục chưa tick thành "Bỏ sót" ở Từ hôm qua. Lịch tháng hiện "!" ở ngày đó.
- Tạo việc ad-hoc hạn Thứ Sáu thì web gợi ý ngày làm Thứ Năm. Kéo sang Thứ Tư trên Lịch tuần thì Agenda của Thứ Tư có việc đó.
- Tìm "chia so" ra mẫu, hạng mục và đúng mục trong tài liệu có "Chia số". Tài liệu dài hơn 50.000 ký tự vẫn lưu và mở đủ. Bấm "Ghi chú" ở khối Chia số trên Agenda thì nhảy đúng mục 3 của Sổ tay bàn giao.
- Màn Agenda không còn "Ma trận", "Kho", "Chốt", "★". Việc hạn hôm nay có đồng hồ đỏ, hạn trong 2 ngày có đồng hồ cam, mức quan trọng hiện đúng số trái tim.
- Tab Tổng kết: số trên 4 ô chỉ số khớp với dữ liệu thử. Đổi kỳ Tuần/Tháng thì mọi biểu đồ cập nhật.
- Kiểm 1280px và 390px, sáng và tối. Không lỗi JavaScript.

## 7. Thứ tự làm
1. **Dừng GĐ8.** Gộp nhánh nào cần gộp để web cũ ổn định, ghi vào TIEN-DO.md.
2. **Bản xem trước V2** ở 1280px và 390px, gồm: Agenda (sáng, giữa ngày có trễ, cuối ngày), Soát cuối ngày, Lịch tuần, Lịch tháng, Ghi chú, Tổng kết, màn Mẫu công việc. Bản phác thảo của Claude trên canvas "Life Planner V2 — phác thảo" là mốc tham khảo. **Dừng cho tôi duyệt.**
3. Dữ liệu và Apps Script mới, hướng dẫn tôi tạo Sheet và triển khai.
4. Hỏi tôi danh sách mẫu công việc thật (tên, hạng mục, giờ, ngày lệch) để nhập sẵn.
5. Làm theo thứ tự: Mẫu và Agenda và Soát → Việc và Lịch → Thói quen và Mục tiêu → Ghi chú → Chuyển dữ liệu cũ.
6. Sau mỗi phần: chạy song song spec-reviewer và qa-tester, sửa lỗi, chạy lại qa-tester, rồi gộp vào `main`.
7. Dùng song song 1 tuần rồi mới chuyển web gốc sang V2.

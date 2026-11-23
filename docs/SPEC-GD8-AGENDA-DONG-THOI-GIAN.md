# SPEC bổ sung, Giai đoạn 8: Agenda thành một dòng thời gian

> Viết ngày 23/11/2026, sau buổi nghiệm thu GĐ7. Người dùng nhận xét Agenda "rất lộn xộn, chưa nhìn được thứ tự công việc trong ngày, khó sử dụng".
>
> Khi tôi duyệt thì gộp file này vào SPEC.md. Phần nào mâu thuẫn với SPEC cũ thì **file này được ưu tiên**.

## 0. Sửa trước tiên: web không tự cập nhật bản mới (mức Cao)
- **Hiện trạng:** mở `https://bca2109-cata.github.io/web-muc-tieu/#/agenda` bình thường trên Chrome của tôi thì vẫn thấy bản cũ, chưa có tab Ma trận. Chỉ khi thêm `?v=gd7h` mới thấy bản mới. Service worker cũ vẫn trả file cũ từ cache.
- **Yêu cầu:**
  - Trang tự phát hiện service worker mới. Hiện một thanh nhỏ "Có bản mới, Tải lại" (hoặc tự tải lại khi trang đang không có thao tác dở).
  - File HTML dùng chiến lược **network-first**, chỉ lấy từ cache khi mất mạng.
  - JS và CSS dùng đường dẫn có phiên bản, hoặc network-first.
- **Kiểm thử:** mở bản cũ, đưa bản mới lên, rồi tải lại **một lần** là phải thấy bản mới.

## 1. Vấn đề của Agenda hiện tại
- Có khoảng 10 khối xếp chồng: chào, mục tiêu chậm, quỹ giờ, ghim đầu ngày, 3 việc chính, kế hoạch hôm nay, thêm từ kho, thói quen, việc hôm nay (Bảng hoặc Ma trận), quá hạn, sắp đến hạn.
- Cùng một việc hiện ở nhiều chỗ. "Báo cáo daily" hiện ở 4 chỗ, "Gửi bảng số liệu T10" ở 3 chỗ.
- Thứ tự trong ngày chỉ tồn tại trong khối "Kế hoạch hôm nay", và mất đi sau khi Chốt.
- Ma trận nằm ở cả Agenda (nút chuyển Bảng / Ma trận) lẫn tab Ma trận.
- Báo cáo daily chưa tick thì giờ dự kiến bị tính lại theo giờ hiện tại, thành "17:15", dù đây là việc ghim lúc 8:00.

## 2. Bố cục mới của Agenda

Từ trên xuống, chỉ còn các phần sau:

1. **Đầu trang gọn:**
   - Ngày, nút qua ngày trước/sau.
   - Một thanh quỹ: `Giờ làm X / Y · Tối X / Y`, kèm cảnh báo quá tải nếu có.
   - Một dòng nhỏ "N mục tiêu chậm tiến độ ›", bấm vào thì sang tab Mục tiêu. Không có mục tiêu chậm thì ẩn.
2. **Dòng "Cả ngày":** thói quen không có giờ, ví dụ Uống nước 2 lít, dạng chip tick nhanh có hiện chuỗi ngày.
3. **DÒNG THỜI GIAN DUY NHẤT:**
   - Đoạn **Sáng**: bắt đầu từ giờ bắt đầu ngày làm, mặc định 8:00. Việc ghim đứng đầu, ví dụ 8:00 Báo cáo daily.
   - Vạch **nghỉ trưa** 12:00–13:30.
   - Đoạn **Chiều**: đến 17:30.
   - Đoạn **Tối**: bắt đầu từ giờ tối trong cài đặt.
   - Mỗi dòng gồm: giờ dự kiến (font mono), ô tick, tên việc, thời lượng, nhãn ngắn (Quá hạn N ngày / Hạn hôm nay / Ghim / Lặp lại), ★ nếu là việc chính, "Bước đầu tiên" nếu có.
   - **3 việc chính là ★ ngay trong dòng**, không còn khối riêng. Bấm ★ để đổi, tối đa 3.
   - **Thói quen có giờ** nằm đúng giờ trong dòng, có hiện chuỗi ngày.
   - Phần quỹ còn trống hiện thành một dòng mờ "Còn trống ~N phút, dự phòng đột xuất".
   - **Việc đột xuất** đã ghi được chèn vào đúng giờ ghi, có nhãn Đột xuất, và đẩy giờ các việc phía sau.
   - Dòng của **việc đang tới lượt** (việc đầu tiên chưa xong) có viền nhấn.
   - **Việc đã xong giữ tại chỗ, gạch ngang**, giữ giờ dự kiến cũ.
4. **Ngăn "Chưa xếp · N việc"**, thu gọn mặc định:
   - Gồm việc quá hạn chưa được xếp vào hôm nay, và việc trong kho.
   - Sắp xếp: quá hạn trước, rồi hạn gần, rồi quan trọng, rồi dời nhiều lần.
   - Có ô tìm nhanh.
   - Trên màn rộng (≥ 1024px), ngăn này là **cột bên phải, mở sẵn**, còn dòng thời gian ở cột trái.

**Bỏ khỏi Agenda:**
- Khối "Kế hoạch hôm nay" riêng.
- Khối "3 việc chính" riêng.
- Khối "Ghim đầu ngày" riêng.
- Khối "Quá hạn chót N việc".
- Khối "Sắp đến hạn".
- Nút chuyển Bảng / Ma trận. **Ma trận chỉ còn ở tab Ma trận.**
- Khối thống kê.
- Ô thêm nhanh cố định: thay bằng nút **"+ Việc"** nổi, đặt cạnh nút "+ Đột xuất". Ô thêm nhanh mở dạng tấm trượt.

## 3. Buổi sáng: bản nháp, tick đầu tiên là Chốt
- Lần đầu mở trong ngày, web tự dựng dòng thời gian **nháp** bằng thuật toán gợi ý của GĐ6 (mục 3.5), vừa đủ quỹ.
  - Các dòng nháp hiện mờ hoặc viền đứt.
  - Trên cùng có dải: "Bản nháp: kéo đổi thứ tự, bỏ bớt, hoặc thêm từ Chưa xếp. Tick việc đầu tiên là chốt."
- **Việc dời ≥ 3 lần** vẫn phải chọn cách xử lý ngay trên dòng của nó (Chia nhỏ / Hỏi lại / Bỏ / Vẫn giữ) trước khi chốt.
- **Chốt xảy ra khi:**
  - Tick bất kỳ việc nào trong ngày, kể cả Báo cáo daily, hoặc
  - Bấm nút "Chốt" trên dải nháp.
- Sau khi chốt, dòng thời gian hết mờ. Việc nào bạn đã bỏ khỏi nháp thì quay về "Chưa xếp" (về kho, **không** tăng số lần dời). 3 việc đầu chưa có ★ được tự gắn ★ nếu bạn chưa tự chọn.
- Chốt xong vẫn chỉnh được: kéo thả, bỏ, thêm.
- Quá trưa mà chưa chốt thì nháp vẫn giữ. Không tự chốt theo giờ.

## 4. Thao tác trên dòng thời gian
- **Đổi thứ tự:** kéo thả (chuột và cảm ứng: giữ khoảng 300ms rồi kéo), kèm nút ↑ ↓ cho bàn phím. Giờ tự tính lại ngay.
- **Đưa việc vào ngày:** kéo từ "Chưa xếp" vào vị trí mong muốn. Trên điện thoại, có nút "Xếp vào hôm nay" để thêm vào cuối đoạn phù hợp (Giờ làm hoặc Tối).
- **Bỏ khỏi hôm nay:** vuốt trái, hoặc nút ⋯ rồi "Về kho" / "Sang mai" / "Chọn ngày".
- Không cho kéo việc nhóm Công việc vào đoạn Tối và ngược lại, trừ việc lặt vặt đã chọn quỹ theo quy tắc M2. Khi cấm thì báo lý do.
- Việc ghim có thể kéo đổi thứ tự **giữa các việc ghim**, nhưng luôn ở trên cùng đoạn Sáng.

## 5. Cách tính giờ dự kiến (sửa lỗi 17:15)
- **Việc ghim luôn hiện đúng giờ ghim**, ví dụ 8:00, kể cả khi chưa tick và đã quá giờ. Nếu đã quá giờ mà chưa xong thì thêm nhãn "Trễ".
- **Các việc khác:** con trỏ thời gian = max(giờ kết thúc dự kiến của việc trước, giờ hiện tại nếu đây là việc đầu tiên chưa xong). Cộng dồn thời lượng, bỏ qua nghỉ trưa, chèn đột xuất.
- Việc vượt 17:30 (hoặc vượt giờ hết buổi tối) có nhãn "Không kịp hôm nay" và gợi ý "Về kho".

## 6. Thói quen trong dòng thời gian
- Thêm cho thói quen 2 trường: `time` (giờ, có thể trống) và `duration_min` (mặc định 15p).
  - Có giờ: nằm trong dòng thời gian, được tính vào quỹ của đoạn đó.
  - Không giờ: nằm ở dòng "Cả ngày", không tính quỹ.
- **Hỏi tôi giờ cho từng thói quen hiện có.** Mặc định gợi ý: Đọc sách 21:00, Tập thể dục 6:30 (trước giờ làm, nằm ở đoạn "Sớm" chỉ hiện khi có việc).
- Bỏ task lặp trùng với thói quen (quy tắc 3.8 của GĐ6).

## 7. Giao diện
- Giữ bộ màu, font và hoa của DESIGN.md.
- Ở dòng thời gian, mỗi việc là **một hàng gọn**, không phải thẻ to: cao khoảng 52px trên điện thoại, nhãn tối đa 2.
- Khoảng 10–12 việc phải xem được trong khoảng 2 màn hình điện thoại.
- 390px: một cột. Ngăn "Chưa xếp" là tấm trượt từ dưới lên, có nút cố định "Chưa xếp · N" ở chân trang.
- ≥ 1024px: 2 cột, dòng thời gian khoảng 60% bên trái, "Chưa xếp" bên phải.
- Phải xem được bản nháp trong chế độ tối.

## 8. Tiêu chí hoàn thành
- Mở Agenda trên điện thoại, **việc đầu tiên cần làm nằm trong màn hình đầu tiên**, không phải cuộn.
- Không việc nào hiện ở 2 chỗ trên Agenda.
- Báo cáo daily chưa tick lúc 17:00 vẫn hiện "8:00 · Trễ".
- Kéo một việc từ vị trí 5 lên vị trí 2 thì giờ của mọi việc tự tính lại đúng, có tính nghỉ trưa.
- Tick việc đầu tiên thì bản nháp thành kế hoạch, việc bị bỏ về kho mà không tăng số lần dời.
- Ghi một việc đột xuất 1h lúc 10:00 thì các việc sau 10:00 lùi 1h, việc tràn qua 17:30 có nhãn "Không kịp hôm nay".
- Đưa bản mới lên rồi tải lại một lần là thấy bản mới (mục 0).
- Kiểm 390px, 1280px, sáng, tối. Không có lỗi JavaScript.

## 9. Thứ tự làm
1. Sửa mục 0 (cập nhật bản mới), đưa lên `main` ngay vì là lỗi Cao.
2. Làm bản xem trước Agenda mới ở 390px và 1280px, gồm 3 trạng thái: nháp buổi sáng, giữa ngày có đột xuất, cuối ngày. **Dừng cho tôi duyệt.**
3. Code mục 2–7. Chạy song song spec-reviewer và qa-tester, sửa lỗi, rồi chạy lại qa-tester.
4. Hỏi tôi giờ của các thói quen (mục 6) trước khi chuyển dữ liệu.

# SPEC bổ sung, Giai đoạn 7: Giờ bắt đầu, Ma trận cân việc, Hoa rơi

> Viết ngày 23/11/2026. Làm **sau** khi đã sửa M1–M3 trong `docs/NGHIEM-THU-GD6.md`.
>
> Khi tôi duyệt thì gộp file này vào SPEC.md.

## A. Giờ bắt đầu ngày và việc ghim đầu ngày

**Vấn đề:** báo cáo daily phải làm đầu tiên lúc 8h00 và mất khoảng 15 phút. Hiện web chỉ trừ một khoảng "giờ cố định 30 phút" chung chung, và danh sách không cho biết khoảng mấy giờ thì tới việc nào.

**Yêu cầu:**
1. Thêm cài đặt **Giờ bắt đầu ngày làm**, mặc định `08:00`. Giờ kết thúc và nghỉ trưa giữ như cũ: 17h30, nghỉ 12h00–13h30.
2. Thêm loại việc **"Ghim đầu ngày"**:
   - Là việc lặp lại, ví dụ "Báo cáo daily", 15p, Thứ Hai đến Thứ Sáu.
   - Luôn đứng **đầu** danh sách hôm nay, trước cả 3 việc chính.
   - Không bị đưa về kho, không bị đẩy đi khi cân việc mới (mục B).
   - Có thể có nhiều việc ghim, xếp theo thứ tự tôi đặt.
3. **Thay "giờ cố định"** trong công thức quỹ giờ bằng **tổng thời lượng các việc ghim của hôm đó**.
   - Quỹ giờ làm = (8h − tổng việc ghim) × (100% − % dự phòng).
   - Chuyển dữ liệu cũ: bỏ `fixed_min`, rồi tạo sẵn việc ghim "Báo cáo daily" 15p, T2–T6. Hỏi tôi trước khi chạy.
4. Danh sách hôm nay hiện **giờ dự kiến bắt đầu** bên cạnh mỗi việc chưa xong, ví dụ `8:00`, `8:15`, `9:15`. Cách tính:
   - Lấy giờ bắt đầu ngày, cộng dồn thời lượng các việc theo đúng thứ tự trong danh sách.
   - **Bỏ qua nghỉ trưa.** Việc nào cắt ngang giờ nghỉ thì phần còn lại dời sang 13h30.
   - Việc đột xuất đã ghi được **chèn tại thời điểm ghi**, làm lùi giờ các việc phía sau.
   - Việc đã xong thì không tính nữa.
   - Nếu bây giờ đã muộn hơn giờ dự kiến của việc đầu tiên chưa xong, thì tính lại từ **giờ hiện tại**.
   - Việc có giờ dự kiến vượt 17h30 thì hiện nhãn "Không kịp hôm nay".
   - Buổi tối tính tương tự, bắt đầu từ giờ tối trong cài đặt, mặc định 20h00. Hỏi tôi giờ này.
5. Đây **không phải lịch cứng**: không kéo thả theo giờ, giờ chỉ để tham khảo. Đổi thứ tự danh sách thì giờ tự tính lại.

## B. Tab Ma trận và nút "Cân việc mới"

**Vấn đề:** khi trưởng phòng giao việc, tôi cần thấy ngay việc mới so với các việc đang có, để quyết định: làm hôm nay và đẩy việc khác sang mai, hay để ngày khác.

**Yêu cầu:**
1. Thêm **tab Ma trận** riêng trên thanh tab.
   - Có bộ chọn phạm vi: **Hôm nay / Tuần này / Kho**.
   - 4 ô Quan trọng × Gấp như cũ, web tự xếp việc vào ô.
   - Mỗi thẻ hiện: tên, thời lượng, ngày làm, hạn chót.
   - Đầu tab có thanh quỹ giờ của phạm vi đang xem.
2. Bấm vào thẻ để đổi nhanh: Quan trọng có/không, ngày làm, hạn chót. Không có ô nhập tay chọn ô ma trận.
3. Nút **"Cân việc mới"** có ở tab Ma trận, và có thêm một lối tắt trên Agenda.
   - Nhập: tên, thời lượng, hạn chót (có thể trống), quan trọng có/không, mục tiêu.
   - Web đặt việc mới vào ma trận cạnh các việc hôm nay, đánh dấu nổi bật, rồi đưa **tối đa 3 phương án**, mỗi phương án nêu rõ hệ quả:
     - **"Làm hôm nay"**: nếu quỹ còn đủ thì xếp luôn. Nếu không đủ, web đề xuất đẩy sang ngày làm việc kế tiếp những việc có **ô thấp nhất**, rồi theo **hạn chót xa nhất**, cho tới khi vừa quỹ. Liệt kê rõ tên và thời lượng các việc bị đẩy.
     - **"Làm vào [ngày]"**: ngày làm việc gần nhất còn đủ quỹ mà vẫn trước hạn chót.
     - **"Để vào kho"**.
   - **Không bao giờ đề xuất đẩy:** việc ghim, việc đã quá hạn, việc có hạn chót hôm nay, việc nằm trong 3 việc chính. Trừ khi tôi tự bấm chọn đẩy những việc đó.
   - Tôi chọn một phương án rồi bấm **Xác nhận**. Có nút **Hoàn tác** trong 10 giây.
   - Việc từ 2h trở lên vẫn phải chia nhỏ trước, theo quy tắc GĐ6.
4. **Câu hỏi cần hỏi tôi:** việc trưởng phòng giao mà không có hạn thì sẽ không bao giờ "Gấp". Có thêm công tắc **"Gấp"** tay, chỉ có trong form Cân việc mới, không? Nếu có thì nó hết hiệu lực khi nào?

## C. Hoa rơi nền rõ và nhiều hơn

**Chẩn đoán đã kiểm (23/11):**
- `flowers.js` đã có 46 bông rơi, và chạy đúng khi máy không bật giảm chuyển động.
- Nhưng khi Windows tắt hiệu ứng động, trình duyệt báo `prefers-reduced-motion: reduce`. CSS khi đó tắt hẳn animation, nên hoa đứng im. Máy công ty rất có thể đang ở chế độ này.
- Hoa đang khá mờ (`opacity: .24`) và rơi chậm (16–34 giây).

**Yêu cầu:**
1. Thêm cài đặt **"Hoa rơi"** với 3 lựa chọn: **Luôn bật** (mặc định) / **Theo cài đặt máy** / **Tắt**.
   - Ở chế độ Luôn bật, hoa vẫn rơi kể cả khi máy bật giảm chuyển động.
   - Hiệu ứng hoa bung khi xong việc cũng theo cài đặt này.
2. **Nhiều hoa hơn và rõ hơn:**
   - Khoảng **90 bông** trên màn rộng, **45 bông** khi rộng dưới 620px.
   - Kích thước 14–56px, có lớp xa (nhỏ, mờ, rơi chậm) và lớp gần (to hơn, rõ hơn, rơi nhanh hơn) để tạo chiều sâu.
   - Độ đậm khoảng **0.35–0.55** tùy lớp. **Chữ và thẻ vẫn phải đọc rõ:** kiểm độ tương phản, thêm nền mờ cho thẻ nếu cần.
3. **Chuyển động tự nhiên hơn:**
   - Vừa rơi vừa **xoay**, lắc ngang hình sin.
   - Thời gian rơi 9–22 giây, mỗi bông lệch pha khác nhau.
   - Thêm khoảng 30% là **cánh hoa rời** (1 cánh hình giọt, xoay lật 3D bằng `rotateX`/`rotateY`) xen lẫn hoa nguyên bông.
4. **Hiệu năng:**
   - Chỉ dùng `transform` và `opacity`.
   - Dừng animation khi tab bị ẩn (`visibilitychange`).
   - Đo FPS trên khung 390px, không được tụt rõ rệt khi cuộn.
5. **Cache:** tăng phiên bản cache trong `sw.js`, để máy đang mở web nhận bản mới mà không phải xóa cache tay.
6. **Kiểm thử bắt buộc:** chạy Playwright với cả `reducedMotion: 'reduce'` và `'no-preference'`.
   - Ở chế độ Luôn bật, hoa phải di chuyển trong cả hai trường hợp.
   - Ở chế độ Theo cài đặt máy, hoa đứng yên khi `reduce`.
   - Gửi tôi một ảnh GIF hoặc video ngắn quay màn hình khi hoa rơi.

## Thứ tự làm và kiểm tra
- Làm **C** trước, vì nó nhỏ và độc lập, rồi đến **A**, rồi **B**.
- Mỗi phần xong thì dừng cho tôi duyệt.
- Phần B cần làm bản xem trước giao diện (cả 390px và 1280px) trước khi code thật.
- Sau mỗi phần, chạy song song `spec-reviewer` và `qa-tester`.

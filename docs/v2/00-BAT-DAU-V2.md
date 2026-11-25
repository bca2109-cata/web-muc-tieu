# V2: cách làm trên nhiều máy, nhiều phiên, tiết kiệm token

> File cho **người dùng** đọc. Agent không cần đọc file này, trừ phiên điều phối.

## 1. Nguyên tắc
- **GitHub là nơi chung duy nhất.** Mọi phiên Claude Code đều chạy trên web (claude.ai/code), mở từ máy nào cũng được: máy công ty, máy cá nhân hay điện thoại. Không phiên nào cần máy admin-pc.
- **Mỗi phần làm trên một nhánh riêng**, gộp vào `main` bằng pull request (PR). GitHub Pages tự đưa web lên sau khi gộp.
- **Web V2 nằm ở `src/v2/`**, chạy tại `https://bca2109-cata.github.io/web-muc-tieu/v2/`. Web cũ vẫn chạy ở địa chỉ gốc cho tới khi chuyển hẳn.

## 2. Các phiên và thứ tự

| Đợt | Phiên | Model | Nhánh | Song song? |
|---|---|---|---|---|
| 0 | **Điều phối · Khung chung** | Opus | `v2/khung` | Không, làm trước một mình |
| 1 | Phần 1 · Agenda + Soát | Sonnet | `v2/phan-1` | Song song với phần 2 |
| 1 | Phần 2 · Lịch tuần/tháng | Sonnet | `v2/phan-2` | Song song với phần 1 |
| 2 | Phần 3 · Ghi chú | Sonnet | `v2/phan-3` | Song song với phần 4 |
| 2 | Phần 4 · Mục tiêu + Thói quen + Tổng kết | Sonnet | `v2/phan-4` | Song song với phần 3 |
| 3 | Phần 5 · Mẫu công việc + Cài đặt | Sonnet | `v2/phan-5` | |
| Sau mỗi đợt | **Điều phối · Ghép** | Opus | gộp PR vào `main` | |

Cách chọn model: trong phiên Claude Code trên web, chọn ở ô model cạnh khung chat, hoặc gõ `/model`.

## 3. Câu lệnh mở từng phiên

**Phiên 0, Điều phối (Opus):**
```
Bạn là agent điều phối V2. Chỉ đọc docs/v2/01-HOP-DONG-CHUNG.md và docs/v2/02-THIET-KE.md (SPEC-V2-DAY-DU.md chỉ mở khi cần tra). Làm "Giai đoạn 0" ở mục 9 của hợp đồng trên nhánh v2/khung. Xong thì mở PR, viết docs/v2/TRIEN-KHAI-SHEET.md cho Claude điều khiển Chrome của tôi làm, gửi tôi link xem trước và câu hỏi duyệt, rồi dừng. Tôi nói "Duyệt" thì tự merge.
```

**Phiên phần N (Sonnet).** Thay N bằng 1–5:
```
Bạn là agent thực hiện Phần N của V2. Chỉ đọc 3 file: docs/v2/01-HOP-DONG-CHUNG.md, docs/v2/02-THIET-KE.md và docs/v2/phan-N-*.md. Không đọc code của phần khác. Làm trên nhánh v2/phan-N tách từ main. Chỉ sửa các file Phần N sở hữu (mục 3 của hợp đồng). Cần đổi phần chung thì ghi vào docs/v2/YEU-CAU-CHUNG.md rồi làm tạm trong file của mình. Xong: chạy npm run test:v2 -- phan-N, gọi agent v2-kiem-thu một lần, sửa lỗi, mở PR, gửi tôi link xem trước bản mock và câu hỏi duyệt, rồi dừng. Tôi nói "Duyệt" thì tự merge.
```

**Phiên ghép (Opus)**, sau mỗi đợt:
```
Bạn là agent điều phối V2. Gộp lần lượt các PR của đợt này vào main, xử lý xung đột, xử lý docs/v2/YEU-CAU-CHUNG.md, chạy npm run test:v2 -- all, gọi v2-kiem-thu một lần cho toàn web, cập nhật docs/v2/TIEN-DO-V2.md rồi báo tôi.
```

## 4. Quy tắc tiết kiệm token (đã ghi vào hợp đồng, agent phải theo)
1. **Hợp đồng chung chốt trước.** Làm lại là khoản tốn nhất.
2. **Mỗi phiên chỉ đọc 3 file.** Không đọc SPEC đầy đủ, không quét toàn bộ repo.
3. **Mỗi phần một phiên mới.** Xong phần là đóng phiên. Bật tự tóm tắt ở mức 400K.
4. **Opus chỉ cho điều phối.** Xây và kiểm thử dùng Sonnet.
5. **Kiểm thử bằng script có sẵn**, chỉ in bản tóm tắt. Gọi agent `v2-kiem-thu` (một agent gộp cả soát yêu cầu và kiểm thử) **một lần** khi xong phần, không gọi sau mỗi sửa nhỏ. Không chụp màn hình trừ khi lỗi giao diện.
6. **Góp ý gom thành một tin nhắn** có đánh số.
7. **File nhỏ:** CSS và JS tách theo phần, mỗi file dưới khoảng 400 dòng.
8. **Tối đa 2 phiên song song.**

## 5. Bạn chỉ quyết định
- **Phiên nào báo xong:** xem bản xem trước theo link phiên gửi, rồi trả lời **"Duyệt"** hoặc **"Sửa: …"**. Phiên tự merge.
- **Google Sheet V2:** sau khi phiên 0 xong, nhắn cho Claude trong ứng dụng Claude (có quyền dùng Chrome của bạn): **"Triển khai Sheet V2 theo docs/v2/TRIEN-KHAI-SHEET.md"**. Claude làm mọi bước. Bạn chỉ bấm **"Cho phép"** khi Google hỏi quyền.
- **Mở phiên tiếp theo:** dán câu lệnh ở mục 3.

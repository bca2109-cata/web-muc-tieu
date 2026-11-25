---
name: life-planner-thiet-ke
description: Dùng khi dựng hoặc sửa giao diện bất kỳ màn nào của Life Planner V2 (src/v2). Giữ đúng phong cách web cũ (hồng pastel, Baloo 2 + Nunito, hoa, giấy note) và quy ước icon trái tim / đồng hồ / ngọn lửa.
---

# Thiết kế Life Planner V2

Trước khi viết HTML/CSS cho V2:

1. Đọc `docs/v2/02-THIET-KE.md`. File ngắn, đã gồm mọi quy tắc cần thiết. **Không** đọc cả `src/css/style.css` (60KB). Cần một thành phần cũ nào thì grep đúng class đó, ví dụ `grep -n "\.task-row" src/css/style.css`.
2. Chỉ dùng biến trong `src/v2/css/tokens.css`. Không viết thẳng mã màu, trừ hình hoa và mặt trời trang trí.
3. Font: tiêu đề dùng `var(--display)` (Baloo 2), chữ thường dùng `var(--font)` (Nunito), số thêm `font-variant-numeric: tabular-nums; font-weight: 800`.
4. Icon lấy từ `LP.ui.icon(name)`. Mức quan trọng dùng `LP.ui.importance(n)` (trái tim). Mức khẩn dùng `LP.ui.urgency(level)` (đồng hồ báo thức). Ngọn lửa chỉ dùng cho chuỗi thói quen. Không emoji.
5. Thành phần sẵn có trong `src/v2/css/base.css`: `.btn`, `.btn-primary`, `.card`, `.pill`, `.chip`, `.tick`, `.note-paper`, `.bar14`. Dùng lại trước khi tạo class mới. Class mới phải đặt tiền tố theo phần, ví dụ `.ag-` cho Agenda, `.li-` cho Lịch, `.gc-` cho Ghi chú, `.mt-` cho Mục tiêu và Tổng kết, `.cd-` cho Cài đặt.
6. Ngưỡng tiến độ: 100% `--ok`, 80–99% `--pr`, dưới 80% `--warn`. Luôn kèm số hoặc chữ, không chỉ dựa vào màu.
7. Kiểm ở 390px và 1280px, sáng và tối: không cuộn ngang, chữ trên nền màu đạt độ tương phản 4.5:1.

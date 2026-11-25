# V2 · Thiết kế: giữ phong cách web cũ

> **Kiểu dáng lấy từ web cũ** (`DESIGN.md` ở gốc repo và `src/css/style.css`): sổ kế hoạch dễ thương, hồng pastel, nhiều hoa, giấy note, font **Baloo 2 + Nunito**.
>
> **Bố cục lấy từ canvas phác thảo "Life Planner V2 — phác thảo"** (https://claude.ai/artifact/KzpiFeTbNRVVjE5a2JZZJS): canvas chỉ để tham khảo **vị trí các khối**. Màu và font trên canvas **không** dùng.
>
> Skill dự án `life-planner-thiet-ke` (thư mục `.claude/skills/`) tóm tắt file này cho agent.

## 1. Lấy lại nguyên vẹn từ web cũ
| Thứ | Lấy từ | Cách làm |
|---|---|---|
| Bộ màu sáng/tối và biến | `src/css/style.css` khối `:root` | Chép **nguyên văn** vào `src/v2/css/tokens.css`. Không đổi tên biến |
| Font | `src/index.html` | Baloo 2 (600/700/800) cho tiêu đề và logo, Nunito (400–800) cho chữ thường. Số dùng `tabular-nums`, đậm 800 |
| Logo "LIFE PLANNER" | `.logo-text` có gạch lượn sóng hồng | Giữ |
| Hoa rơi nền, hoa bung khi xong | `src/js/flowers.js` | Giữ, kèm cài đặt Hoa rơi (Luôn bật / Theo máy / Tắt) |
| Icon | `src/js/ui.js` | Giữ nét tròn, stroke 2, lưới 24. Không emoji |
| Nút, thẻ, pill, chip, toast | `DESIGN.md` mục Thành phần | Giữ: bóng đặc dưới nút chính, thẻ bo 22px, pill 99px |
| Chế độ tối | `:root[data-theme="dark"]` | Giữ |

## 2. Quy tắc một nghĩa (giữ từ web cũ, thêm cho V2)
- **Trái tim hồng = mức quan trọng** (1–3 trái tim). Áp dụng cho Việc, bước con và mẫu công việc. Đây là quy ước sẵn có của web cũ.
- **Đồng hồ báo thức = mức khẩn**, web tự tính từ hạn chót:
  - **Rất khẩn** (hạn hôm nay hoặc đã quá hạn): đồng hồ `--q1`, nền `--q1-bg`.
  - **Khẩn** (hạn trong 2 ngày): đồng hồ `--q3`, nền `--q3-bg`.
  - Không khẩn thì không hiện.
- **Ngọn lửa = chuỗi thói quen** (giữ như cũ). **Không** dùng lửa cho mức khẩn.
- Ngôi sao không còn dùng, vì V2 đã bỏ Top 3.
- **Ngưỡng tiến độ** (biểu đồ, thanh): 100% `--ok`/`--ok-bar` · 80–99% `--pr`/`--pr-bar` · dưới 80% `--warn`/`--warn-bar`. Kỳ đang diễn ra dùng `--accent-soft`.
- Màu biểu đồ khác dùng `--cv-*` (đã kiểm mù màu). Không chỉ dựa vào màu: luôn kèm số hoặc chữ.

## 3. Thành phần V2 dựng theo kiểu cũ
- **Khối "Từ hôm qua" / "Việc tồn":** giấy note màu `--butter`, xoay rất nhẹ, có bông hoa ghim, như tờ note Top 3 cũ. Mỗi dòng có pill nguồn (Trễ = `--q1`, Bỏ sót = `--pr`, Chưa xong = `--plain-bg`). Nhãn "Tồn từ dd/mm" trên dòng thời gian dùng nền `--butter`, viền `--dash`.
- **Khối công việc cố định:** thẻ bo 22px. Đầu thẻ có tên (Baloo 2, 19px), x/y, link "Ghi chú". Hạng mục dùng nút tick tròn 30px của web cũ, giờ bên trái (Nunito 800, tabular). Hạng mục **đến giờ** có nền `--accent-soft`. **Trễ** có chữ `--q1` và pill "Trễ N phút". Khối xong thì thu gọn, kèm 2 bông hoa nhỏ.
- **Dòng thời gian (Toàn cảnh):** nhãn đoạn SÁNG/CHIỀU/TỐI theo kiểu tiêu đề khối. Vạch "Bây giờ" là đường 2px `--accent`. Giờ dự kiến "~8:15" dùng màu `--muted` nhạt.
- **Lịch tuần:** cột ngày là thẻ, đầu cột có thanh quỹ theo kiểu "Quỹ giờ" của GĐ6 (cao 14px, sọc chéo cho đột xuất, vạch mốc quỹ). Thẻ việc có vạch màu trái theo nhóm (`--work`, `--study`, `--health`).
- **Lịch tháng:** ô ngày bo 14px. Ngày đủ có tick `--ok`, ngày có sót có dấu "!" `--warn`, chấm hạn chót `--q1-bar`.
- **Ghi chú:** khung soạn trên nền `--surface`, tiêu đề tài liệu Baloo 2. Khung chú ý dùng `--butter`. Mục lục là các dòng có gạch trái `--line`, mục đang đọc có gạch `--accent`.
- **Tổng kết:** 5 khối có tiêu đề Baloo 2. Biểu đồ cột, vòng, thanh chồng vẽ SVG theo kiểu "Biểu đồ tổng quan" của GĐ5 (thanh 14px, khe 2px, bo 4px, chú thích dưới thanh).
- **Nút "+":** viên thuốc nổi 52px góc phải dưới, nằm trên thanh tab ở điện thoại. Menu gồm Việc ad-hoc / Việc cá nhân / Ghi chú nhanh / Đột xuất.

## 4. Bố cục và cỡ
- Lưới 4px, lề 16px, khoảng giữa khối 20px.
- Các mốc bề ngang: 560 / 620 / 900px như cũ.
- Máy tính ≥ 1280px là chính. Điện thoại 390px phải dùng được để xem và tick.
- Thanh tab 5 mục: Agenda · Lịch · Ghi chú · Mục tiêu · Tổng kết. Điện thoại: thanh ở đáy.

## 5. Khi phân vân
Ưu tiên theo thứ tự: file này → `DESIGN.md` → giao diện web cũ đang chạy → canvas phác thảo (chỉ phần bố cục).

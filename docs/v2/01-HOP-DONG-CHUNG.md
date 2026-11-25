# V2 · Hợp đồng chung (mọi phiên đều đọc)

> Đây là nguồn chuẩn về cấu trúc, dữ liệu và ranh giới giữa các phần. Phần nào cần đổi file này thì **không tự sửa**: ghi vào `docs/v2/YEU-CAU-CHUNG.md` để phiên điều phối quyết định.
>
> Yêu cầu chi tiết của từng phần nằm ở `docs/v2/phan-N-*.md`. Bản đầy đủ `SPEC-V2-DAY-DU.md` chỉ để tra cứu khi thật cần.

## 1. Mục tiêu V2 (tóm tắt 5 dòng)
Web cá nhân giúp **không quên việc**:
- Danh sách cố định theo giờ, có hạng mục ngày lệch +1.
- Việc ad-hoc và việc cá nhân, có hạn chót và ngày làm.
- Soát cuối ngày, việc tồn mang sang hôm sau.
- Ghi chú dạng tài liệu dài, gắn vào công việc.
- Thói quen, mục tiêu, tổng kết có biểu đồ.

5 tab: **Agenda · Lịch · Ghi chú · Mục tiêu · Tổng kết**, cùng bánh răng Cài đặt.

## 2. Công nghệ (giữ như web cũ)
- JavaScript thuần, script thường (không ES module, không framework, không bước build). Mở `src/v2/index.html` bằng bấm đúp vẫn chạy bản mock.
- Dữ liệu trong Google Sheet **mới** ("Life Planner V2 - dữ liệu"), qua Apps Script Web App có mã bí mật, giống cách làm của web cũ.
- Biểu đồ tự vẽ SVG hoặc dùng div. Không thêm thư viện.
- Giữ cách service worker đã sửa ở GĐ8: network-first cho HTML, có thanh "Có bản mới, Tải lại".

## 3. Cấu trúc thư mục và ai sở hữu file nào

```
src/v2/
  index.html                      [Chung]
  sw.js, manifest.json            [Chung]
  css/tokens.css                  [Chung] chép nguyên :root từ src/css/style.css
  css/base.css                    [Chung] nút, thẻ, pill, form, tab, toast, hoa rơi
  css/agenda.css                  [Phần 1]
  css/lich.css                    [Phần 2]
  css/ghi-chu.css                 [Phần 3]
  css/muc-tieu.css                [Phần 4]
  css/cai-dat.css                 [Phần 5]
  js/core/config.js, api.js, api-sheet.js, api-mock.js, mock-data.js   [Chung]
  js/core/store.js, router.js, date.js, ui.js (icon + thành phần), flowers.js, search.js, notify.js   [Chung]
  js/core/logic-routines.js       [Chung] tạo lượt, ngày lệch +1, khoảng ngày tháng, ngày nghỉ, bỏ sót, việc tồn
  js/core/logic-tasks.js          [Chung] độ khẩn từ hạn chót, quỹ giờ, gợi ý ngày làm
  js/core/stats.js                [Chung] số liệu cho biểu đồ (Agenda và Tổng kết dùng chung)
  js/views/agenda.js, soat.js     [Phần 1]
  js/views/lich-tuan.js, lich-thang.js   [Phần 2]
  js/views/ghi-chu.js, editor.js  [Phần 3]
  js/views/muc-tieu.js, thoi-quen.js, tong-ket.js   [Phần 4]
  js/views/mau-cong-viec.js, cai-dat.js, them-nhanh.js   [Phần 5] (nút "+" và form thêm)
apps-script-v2/Code.gs            [Chung]
apps-script-v2/Docs.gs            [Phần 3] action cho tài liệu
tests-qa/v2/helpers.js            [Chung]
tests-qa/v2/phan-N.js             [Phần N]
docs/v2/TIEN-DO-V2.md             [Điều phối] mỗi phần chỉ thêm đúng 1 mục của mình
```

**Quy tắc ranh giới:**
- Mỗi phần **chỉ sửa file có nhãn của mình**.
- File [Chung] chỉ phiên điều phối sửa. Cần thêm hàm chung thì ghi yêu cầu vào `YEU-CAU-CHUNG.md`, rồi tạm viết trong file của phần mình với tiền tố `tam_`. Phiên ghép sẽ chuyển hàm đó vào core.
- Gắn view vào router: `LP.router.register('agenda', { title, mount(el, params), unmount() })`. Tên route: `agenda`, `lich`, `ghi-chu`, `muc-tieu`, `tong-ket`, `cai-dat`, `mau`.

## 4. Đối tượng toàn cục
Mọi thứ nằm dưới `window.LP`:
- `LP.api`: `load(range)`, `save(sheet, row)`, `remove(sheet, id)` (xóa mềm), `docsIndex()`, `docGet(id)`, `docSave(doc)`. Bản mock và bản Sheet dùng cùng chữ ký.
- `LP.store`: dữ liệu đã tải. `get()`, `upsert(sheet, row)`, `on(event, fn)`. Sự kiện `change:<sheet>`.
- `LP.date`: `today()`, `now()` (bản mock nhận `?today=yyyy-mm-dd&now=hh:mm`), `addWorkdays(d, n)` (bỏ Chủ nhật và ngày nghỉ), `fmt(d)` → dd/mm.
- `LP.logic.routines`: `runsFor(date)`, `itemsFor(date)` (gồm hạng mục +1 của lượt hôm trước), `leftovers(date)`, `check(routineId, itemId, runDate, status, extra)`.
- `LP.logic.tasks`: `urgency(task, today)` → `'rat-khan' | 'khan' | ''`, `capacity(date)`, `suggestDoDate(due)`.
- `LP.stats`: `completion(from, to, unit)`, `missedTop(from, to, n)`, `adhocStatus(from, to)`, `byLevel(from, to)`, `interruptions(from, to, unit)`, `habits(from, to)`.
- `LP.ui`: `icon(name)`, `importance(n)` (trái tim 1–3), `urgency(level)` (đồng hồ báo thức), `pill(text, kind)`, `toast(text)`, `sheet(title, body)` (tấm trượt), `confirm(...)`.

## 5. Dữ liệu (Google Sheet V2)
Dòng 1 là header. Ngày dạng `yyyy-mm-dd`, giờ dạng `HH:MM`. Mỗi dòng có `id` (UUID ngắn), `created_at`, `updated_at`.

| Sheet | Cột (ngoài id, created_at, updated_at) |
|---|---|
| `Routines` (mẫu) | name, group (`cong_viec`/`ca_nhan`), repeat (`weekday`/`month_range`), weekdays (`1,2,3,4,5,6`; 1 = T2), month_from, month_to, done_before, importance (1–3), doc_id, heading_id, active, sort_order |
| `RoutineItems` | routine_id, sort_order, title, time, day_offset (0/1), est_min, note, link, valid_from, valid_to |
| `RoutineChecks` | routine_id, item_id, run_date, status (`done`/`skipped`/`carried`), done_at, set_time (giờ đặt khi xếp việc tồn), note |
| `Tasks` | title, kind (`adhoc`/`canhan`), requester, due_date, due_time, do_date, do_time, duration_min, importance, goal_id, doc_id, heading_id, status (`todo`/`done`), done_at, carried_from, deleted |
| `TaskSteps` | task_id, sort_order, title, do_date, do_time, duration_min, status, done_at |
| `Habits`, `HabitLogs` | name, time, weekdays, active · habit_id, date, done |
| `Goals`, `Reviews` | title, group, period_type, period_value, start_date, end_date, progress_mode (`task`/`number`), target, actual, unit, importance, status · period_type, period_value, good, bad, next |
| `Interruptions` | date, title, duration_min |
| `DaysOff` | date, note |
| `Settings` | key, value |
| `Docs`, `DocChunks` | space, title, sort_order, headings (JSON), deleted · doc_id, part, content |

**Quy tắc dữ liệu:**
- Sửa mẫu "từ nay về sau" thì đóng `valid_to` của hạng mục cũ và tạo hạng mục mới. Không sửa đè, để giữ lịch sử.
- Sang ngày mới, hạng mục chưa tick không tự ghi gì. "Bỏ sót" được **tính ra** từ việc không có dòng `RoutineChecks`. Chỉ ghi khi tôi chọn ở màn Soát.
- Tài liệu dài hơn 45.000 ký tự thì chia nhiều dòng `DocChunks`.

## 6. Quy ước giao diện
Theo `docs/v2/02-THIET-KE.md` (giữ phong cách web cũ). Phải dùng biến trong `tokens.css`, **không viết thẳng mã màu**. Không emoji. Chữ tiếng Việt.

## 7. Kiểm thử (rẻ token)
- `npm run test:v2 -- phan-N` chạy `tests-qa/v2/phan-N.js` bằng Playwright trên bản mock (`src/v2/index.html?mock=1&today=2026-11-25&now=11:05`).
- Script chỉ in **JSON tóm tắt**: `{ pass, fail: [{ test, detail }] }`. Không in log dài, không chụp ảnh, trừ khi test giao diện thất bại.
- Mỗi phần viết ít nhất các test trong mục "Tiêu chí hoàn thành" của file phần mình, cộng kiểm 390px và 1280px không cuộn ngang và không lỗi JS.

## 8. Quy tắc làm việc
- Tiếng Việt, ngắn gọn. Tôi không phải lập trình viên.
- Không thêm tính năng ngoài file phần. Có ý tưởng thì ghi "Đề xuất" trong `TIEN-DO-V2.md`.
- Commit nhỏ, message tiếng Việt, tiền tố `V2 phần N:`.
- **Tiết kiệm token:**
  - Chỉ đọc các file được chỉ định.
  - Dùng grep thay vì mở cả file lớn.
  - Không đọc lại file vừa viết.
  - Không chạy agent kiểm thử quá một lần cho mỗi vòng sửa.
- Xong phần: chạy test, gọi `v2-kiem-thu` một lần, sửa lỗi Cao và Trung bình, mở PR, ghi một mục trong `TIEN-DO-V2.md`, rồi **dừng**.

## 9. Giai đoạn 0 (chỉ phiên điều phối)
1. Dựng `src/v2/` với các file [Chung] ở mục 3:
   - `tokens.css`: chép nguyên cả 3 khối `:root` (sáng, tối, theo máy) từ `src/css/style.css`.
   - `flowers.js` và bộ icon trong `ui.js` lấy lại từ web cũ.
2. Router với 5 tab và Cài đặt. Mỗi tab là trang trống "Đang làm" để các phần cắm vào.
3. `api-mock.js` và `mock-data.js`: dữ liệu mẫu đủ cho mọi phần. Gồm:
   - 3 mẫu công việc theo ví dụ trên canvas, có hạng mục +1, và 1 mẫu theo khoảng ngày trong tháng.
   - 2 việc ad-hoc có bước con, 1 ngày nghỉ.
   - Dữ liệu 60 ngày để có số liệu cho Tổng kết.
4. `logic-routines.js`, `logic-tasks.js`, `stats.js` đầy đủ, có test trong `tests-qa/v2/core.js`.
5. `apps-script-v2/Code.gs`: `setup()` tạo các sheet ở mục 5, các action `load`, `save`, `remove`, cùng mã bí mật.
6. Nút "+" (chỉ khung menu) và ô tìm kiếm chung, nối với `search.js`.
7. `package.json`: thêm script `test:v2`. Tạo `docs/v2/TIEN-DO-V2.md` và `docs/v2/YEU-CAU-CHUNG.md`.
8. Mở PR `v2/khung`. Viết hướng dẫn từng bước để tôi tạo Sheet V2 và triển khai Apps Script, chỉ cần trình duyệt.

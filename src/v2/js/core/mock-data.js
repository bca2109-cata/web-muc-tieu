/* V2 · dữ liệu mẫu cho bản mock. Cố định theo mốc 25/11/2026 (Thứ Tư), không phụ thuộc ?today.
   Gồm: 4 mẫu công việc (3 theo thứ, 1 theo khoảng ngày 1-3 trong tháng), việc ad-hoc có bước con,
   1 ngày nghỉ (30/11), và 60 ngày lịch sử (lượt, thói quen, đột xuất) để Tổng kết có số liệu. */
var LP = window.LP || (window.LP = {});

LP.mockSeed = function () {
  var D = LP.date, ANCHOR = '2026-11-25';
  var seed = 20261125;
  function rnd() { // mulberry32, cố định để test lặp lại được
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function stamp(d, t) { return d + ' ' + (t || '08:00'); }
  var CREATED = '2026-09-20 08:00';
  function base(id, extra) { return Object.assign({ id: id, created_at: CREATED, updated_at: CREATED }, extra); }

  var db = {
    routines: [], routineItems: [], routineChecks: [], tasks: [], taskSteps: [], habits: [], habitLogs: [],
    goals: [], reviews: [], interruptions: [], daysOff: [], settings: [], docs: []
  };

  /* ---------- Mẫu công việc ---------- */
  function routine(id, name, group, repeat, extra) {
    db.routines.push(base(id, Object.assign({
      name: name, group: group, repeat: repeat, weekdays: '1,2,3,4,5,6', month_from: '', month_to: '', done_before: '',
      importance: 1, doc_id: '', heading_id: '', active: 'TRUE', sort_order: db.routines.length + 1
    }, extra)));
  }
  function item(rid, n, title, time, offset, est, extra) {
    db.routineItems.push(base('ri-' + rid + '-' + n, Object.assign({
      routine_id: rid, sort_order: n, title: title, time: time, day_offset: offset, est_min: est, note: '', link: '', valid_from: '', valid_to: ''
    }, extra)));
  }
  routine('r-chiaso', 'Chia số AI Class', 'cong_viec', 'weekday', { done_before: '09:30', importance: 2, doc_id: 'd-chiaso', heading_id: 'h-chuanbi' });
  item('r-chiaso', 1, 'Lấy số liệu từ LMS', '08:00', 0, 20, { note: 'Lấy bản mới nhất lúc 8h' });
  item('r-chiaso', 2, 'Chia số cho các tổ', '08:30', 0, 30);
  item('r-chiaso', 3, 'Gửi file cho TBP', '09:15', 0, 10, { link: 'https://example.com/tbp' });
  item('r-chiaso', 4, 'Cop lại lần cuối', '08:30', 1, 15, { note: 'Làm sáng hôm sau, ngày làm việc kế tiếp' });
  routine('r-baocao', 'Báo cáo cuối ngày', 'cong_viec', 'weekday', { importance: 1 });
  item('r-baocao', 1, 'Tổng hợp doanh số', '16:30', 0, 30);
  item('r-baocao', 2, 'Gửi báo cáo ngày', '17:15', 0, 15);
  routine('r-toi', 'Buổi tối của tôi', 'ca_nhan', 'weekday', { weekdays: '1,2,3,4,5,6' });
  item('r-toi', 1, 'Đọc sách 20 phút', '20:00', 0, 20);
  item('r-toi', 2, 'Dọn bàn học', '21:30', 0, 10);
  routine('r-chotso', 'Chốt số tháng', 'cong_viec', 'month_range', { month_from: 1, month_to: 3, weekdays: '', importance: 3, done_before: '11:00' });
  item('r-chotso', 1, 'Đối soát số liệu tháng', '09:00', 0, 60);
  item('r-chotso', 2, 'Gửi bảng chốt cho kế toán', '11:00', 0, 20);

  /* ---------- Ngày nghỉ ---------- */
  db.daysOff.push(base('off-1', { date: '2026-11-30', note: 'Nghỉ phép' }));

  /* ---------- Lịch sử 60 ngày ---------- */
  var start = D.add(ANCHOR, -60), days = D.range(start, D.add(ANCHOR, -1));
  var offSet = { '2026-11-30': true };
  function isWork(d) { return D.dow(d) !== 7 && !offSet[d]; }
  function nextWork(d) { var x = D.add(d, 1); while (!isWork(x)) x = D.add(x, 1); return x; }
  var checkN = 0;
  function check(rid, n, runDate, status, doneAt, extra) {
    db.routineChecks.push(base('c-' + (++checkN), Object.assign({
      routine_id: rid, item_id: 'ri-' + rid + '-' + n, run_date: runDate, status: status, done_at: doneAt || '', set_time: '', note: ''
    }, extra)));
  }
  var weekdayRoutines = [['r-chiaso', [1, 2, 3, 4]], ['r-baocao', [1, 2]], ['r-toi', [1, 2]]];
  days.forEach(function (d) {
    if (!isWork(d)) return;
    weekdayRoutines.forEach(function (rr) {
      rr[1].forEach(function (n) {
        var r = rnd();
        var it = db.routineItems.filter(function (x) { return x.id === 'ri-' + rr[0] + '-' + n; })[0];
        var landing = it.day_offset == 1 ? nextWork(d) : d;
        var t = it.time || '12:00';
        // Cố ý để trống vài hạng mục của 24/11 để hôm nay có "Từ hôm qua"
        if (d === '2026-11-24') {
          if (rr[0] === 'r-chiaso' && n === 4) return;                        // +1: sẽ hiện hôm nay
          if (rr[0] === 'r-baocao' && n === 2) return;                        // bỏ sót (tính ra, không có dòng)
          if (rr[0] === 'r-toi' && n === 2) { check(rr[0], n, d, 'carried'); return; } // mang sang
        }
        if (r < 0.84) check(rr[0], n, d, 'done', stamp(landing, t));
        else if (r < 0.88) check(rr[0], n, d, 'skipped', '', { note: 'Nghỉ giữa tuần' });
        // còn lại: không ghi dòng nào, "bỏ sót" được tính ra
      });
    });
  });
  // Lượt theo khoảng ngày: tháng 10 làm hạng mục 1 ngày 1/10, hạng mục 2 ngày 2/10 (3/10 không hiện); tháng 11 làm ngày 2 và 3
  check('r-chotso', 1, '2026-10-01', 'done', '2026-10-01 09:40');
  check('r-chotso', 2, '2026-10-02', 'done', '2026-10-02 10:50');
  check('r-chotso', 1, '2026-11-02', 'done', '2026-11-02 09:30');
  check('r-chotso', 2, '2026-11-03', 'done', '2026-11-03 10:45');
  // Hôm nay (25/11) đã tick hạng mục đầu của lượt Chia số
  check('r-chiaso', 1, ANCHOR, 'done', ANCHOR + ' 08:07');

  /* ---------- Việc (Tasks, TaskSteps) ---------- */
  function task(id, title, kind, o) {
    db.tasks.push(base(id, Object.assign({
      title: title, kind: kind, requester: '', due_date: '', due_time: '', do_date: '', do_time: '', duration_min: '',
      importance: 1, goal_id: '', doc_id: '', heading_id: '', status: 'todo', done_at: '', carried_from: '', deleted: ''
    }, o)));
  }
  function step(tid, n, title, o) {
    db.taskSteps.push(base('st-' + tid + '-' + n, Object.assign({
      task_id: tid, sort_order: n, title: title, do_date: '', do_time: '', duration_min: '', status: 'todo', done_at: ''
    }, o)));
  }
  task('t-bcnguon', 'Báo cáo phân tích nguồn T11', 'adhoc', { requester: 'TBP Sales', due_date: '2026-11-27', do_date: '2026-11-26', importance: 3, goal_id: 'g-powerbi', duration_min: 135 });
  step('t-bcnguon', 1, 'Lấy dữ liệu nguồn', { do_date: '2026-11-25', duration_min: 45 });
  step('t-bcnguon', 2, 'Dựng biểu đồ', { do_date: '2026-11-26', duration_min: 60 });
  step('t-bcnguon', 3, 'Viết nhận xét', { do_date: '2026-11-26', duration_min: 30 });
  task('t-quy4', 'Số liệu quý 4 cho giám đốc', 'adhoc', { requester: 'Giám đốc', due_date: '2026-12-02', do_date: '2026-12-01', importance: 2, goal_id: 'g-dashboard', duration_min: 240 });
  step('t-quy4', 1, 'Gom số liệu 3 tháng', { do_date: '2026-11-24', duration_min: 90, status: 'done', done_at: '2026-11-24 16:10' });
  step('t-quy4', 2, 'Làm bảng so sánh', { do_date: '2026-12-01', duration_min: 90 });
  step('t-quy4', 3, 'Soạn slide', { do_date: '2026-12-01', duration_min: 60 });
  task('t-email', 'Trả lời email đối tác', 'adhoc', { requester: 'Phòng Đối tác', due_date: '2026-11-25', do_date: '2026-11-24', importance: 2, duration_min: 20 });
  task('t-baohiem', 'Gia hạn bảo hiểm xe', 'canhan', { due_date: '2026-12-03', do_date: '2026-11-28', importance: 1, duration_min: 30 });
  task('t-kham', 'Đặt lịch khám sức khỏe', 'canhan', { due_date: '2026-11-26', do_date: '2026-11-25', importance: 2, duration_min: 20 });
  // Việc đã xong trong 60 ngày qua (cho Tổng kết)
  var doneTitles = [
    ['Báo cáo tuần 39', 'adhoc', 3], ['Đối chiếu hóa đơn', 'adhoc', 1], ['Số liệu khuyến mãi tháng 10', 'adhoc', 2], ['Làm dashboard doanh số', 'adhoc', 3],
    ['Mua quà sinh nhật', 'canhan', 1], ['Đóng tiền điện', 'canhan', 1], ['Tổng hợp phản hồi học viên', 'adhoc', 2], ['Sửa file dự báo', 'adhoc', 2],
    ['Họp phụ huynh', 'canhan', 2], ['Báo cáo tuần 45', 'adhoc', 3]
  ];
  doneTitles.forEach(function (x, i) {
    var due = D.add(ANCHOR, -55 + i * 5);
    while (!isWork(due)) due = D.add(due, 1);
    var late = i % 4 === 3 ? 1 : 0; // vài việc xong trễ 1 ngày
    var doneDay = D.add(due, late - (i % 2));
    while (!isWork(doneDay)) doneDay = D.add(doneDay, 1);
    task('t-xong-' + (i + 1), x[0], x[1], { requester: x[1] === 'adhoc' ? 'TBP Sales' : '', due_date: due, do_date: D.add(due, -1), importance: x[2], duration_min: 30 + (i % 3) * 30, status: 'done', done_at: doneDay + ' 15:30' });
  });

  /* ---------- Thói quen ---------- */
  function habit(id, name, time, wd) { db.habits.push(base(id, { name: name, time: time, weekdays: wd, active: 'TRUE' })); }
  habit('h-nuoc', 'Uống nước 2 lít', '', '1,2,3,4,5,6,7');
  habit('h-doc', 'Đọc sách', '21:00', '1,2,3,4,5,6,7');
  habit('h-chay', 'Chạy bộ', '06:00', '1,3,5');
  var logN = 0;
  days.concat([ANCHOR]).forEach(function (d) {
    db.habits.forEach(function (h) {
      if (h.weekdays.split(',').indexOf(String(D.dow(d))) < 0) return;
      var r = rnd(), done = r < (h.id === 'h-nuoc' ? 0.88 : h.id === 'h-doc' ? 0.7 : 0.6);
      if (h.id === 'h-nuoc') { if (d === '2026-11-20') done = false; else if (d > '2026-11-20') done = true; } // chuỗi 6 ngày tính đến hôm nay
      if (d === ANCHOR && h.id === 'h-doc') return; // 21:00 chưa tới
      if (d === ANCHOR && h.id === 'h-chay') done = false;
      db.habitLogs.push(base('hl-' + (++logN), { habit_id: h.id, date: d, done: done ? 'TRUE' : 'FALSE' }));
    });
  });

  /* ---------- Mục tiêu, Review ---------- */
  function goal(id, title, group, pt, pv, from, to, mode, o) {
    db.goals.push(base(id, Object.assign({ title: title, group: group, period_type: pt, period_value: pv, start_date: from, end_date: to, progress_mode: mode, target: '', actual: '', unit: '', importance: 2, status: 'active' }, o)));
  }
  goal('g-powerbi', 'Thành thạo Power BI', 'cong_viec', 'year', '2026', '2026-01-01', '2026-12-31', 'task', { importance: 3 });
  goal('g-dashboard', 'Hoàn thành 3 dashboard quý 4', 'cong_viec', 'quarter', '2026-Q4', '2026-10-01', '2026-12-31', 'number', { target: 3, actual: 2, unit: 'dashboard' });
  goal('g-sach', 'Đọc 4 cuốn sách', 'ca_nhan', 'month', '2026-11', '2026-11-01', '2026-11-30', 'number', { target: 4, actual: 2, unit: 'cuốn', importance: 1 });
  db.reviews.push(base('rv-1', { period_type: 'month', period_value: '2026-10', good: 'Chốt số đúng hạn cả tháng.', bad: 'Hay quên báo cáo cuối ngày.', next: 'Soát cuối ngày mỗi chiều.' }));

  /* ---------- Đột xuất ---------- */
  var intTitles = ['Hỗ trợ sale lấy data', 'Họp gấp với TBP', 'Sửa lỗi file báo cáo', 'Trả lời phụ huynh', 'Hỗ trợ kế toán đối soát'];
  for (var k = 0; k < 14; k++) {
    var dd = D.add(start, Math.floor(rnd() * 59));
    if (!isWork(dd)) dd = nextWork(dd);
    db.interruptions.push(base('in-' + (k + 1), { date: dd, title: intTitles[k % intTitles.length], duration_min: [15, 30, 45, 60][Math.floor(rnd() * 4)] }));
  }
  db.interruptions.push(base('in-today', { date: ANCHOR, title: 'Hỗ trợ sale lấy data', duration_min: 30 }));

  /* ---------- Cài đặt, Ghi chú ---------- */
  [['work_start', '08:00'], ['work_end', '17:30'], ['quota_work', '180'], ['quota_evening', '90'], ['quota_off', '240']].forEach(function (kv) {
    db.settings.push(base('set-' + kv[0], { key: kv[0], value: kv[1] }));
  });
  db.docs.push(base('d-chiaso', {
    space: 'Công việc', title: 'Hướng dẫn chia số AI Class', sort_order: 1, deleted: '',
    headings: JSON.stringify([{ id: 'h-chuanbi', level: 1, title: 'Chuẩn bị' }, { id: 'h-chia', level: 1, title: 'Cách chia số' }])
  }));
  db.docs.push(base('d-y-tuong', { space: 'Cá nhân', title: 'Ý tưởng tháng 12', sort_order: 2, deleted: '', headings: '[]' }));
  db.docContents = {
    'd-chiaso': '# Chuẩn bị\nLấy số liệu từ LMS lúc 8h.\n\n# Cách chia số\nChia đều theo tổ, ưu tiên tổ ít học viên.',
    'd-y-tuong': 'Viết ý tưởng ở đây.'
  };
  return db;
};

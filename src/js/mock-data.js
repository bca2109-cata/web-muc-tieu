/* Dữ liệu mẫu cho bản mock. Ngày tính theo hôm nay để luôn có việc trễ hạn, hôm nay, ngày mai, việc trong kho. */
var App = window.App || (window.App = {});

App.mockData = function (today) {
  var D = App.date, P = App.period, uuid = App.util.uuid;
  var stamp = D.addDays(today, -7) + ' 08:00:00';

  function goal(name, group, type, status, importance) {
    var pv = P.valueOf(type, today), r = P.range(type, pv);
    return {
      id: uuid(), name: name, group: group, period_type: type, period_value: pv,
      start_date: r.start, end_date: r.end, progress_mode: 'task', unit: '', target: '', actual: '',
      status: status || 'Đang làm', note: '', created_at: stamp, updated_at: stamp, importance: String(importance || 2)
    };
  }
  var g1 = goal('Hoàn thành báo cáo KPI quý', 'Công việc', 'Quý', null, 3);
  g1.note = 'Nộp cho trưởng phòng trước ngày cuối quý.';
  var g2 = goal('Học xong khóa Excel nâng cao', 'Học tập', 'Tháng');
  var g3 = goal('Chạy bộ đều đặn', 'Sức khỏe', 'Tuần');
  var g4 = goal('Đọc xong 2 cuốn sách', 'Sức khỏe', 'Tháng', 'Hoàn thành', 1);
  var g5 = goal('Ra mắt dự án web cá nhân', 'Công việc', 'Năm', 'Tạm dừng', 1);
  // Mục tiêu theo chỉ số
  var g6 = goal('Chạy đủ 50 km trong tháng', 'Sức khỏe', 'Tháng', null, 2);
  Object.assign(g6, { progress_mode: 'metric', unit: 'km', target: '50', actual: '12' });
  // Mục tiêu theo thói quen
  var g7 = goal('Giữ nếp sống lành mạnh', 'Sức khỏe', 'Tháng', null, 2);
  g7.progress_mode = 'habit';

  /* Việc mẫu (GĐ6). Có đủ trường hợp để thử: ngày mai quá tải, một việc đã dời 3 lần,
     một việc lớn chia thành 3 việc con, một việc lớn chưa chia, việc trong kho, việc quá hạn.
     o: { due: số ngày so với hôm nay (null = không có hạn), do: Ngày sẽ làm (null = kho), min: thời lượng, imp, status, defer, inbox, time } */
  function task(title, g, o, extra) {
    o = o || {};
    var t = {
      id: uuid(), title: title, goal_id: g ? g.id : '', due_date: o.due == null ? '' : D.addDays(today, o.due), due_time: o.time || '',
      priority: '', status: o.status || 'Cần làm', is_top3: 'FALSE', top3_date: '',
      recurring_rule: '', parent_recurring_id: '', done_at: '', note: '', created_at: stamp, updated_at: stamp, icon: '',
      do_date: o.do == null ? '' : D.addDays(today, o.do), duration_min: String(o.min || 30), is_important: o.imp ? 'TRUE' : 'FALSE',
      parent_id: '', first_step: o.step || '', defer_count: String(o.defer || 0),
      inbox_since: o.do == null ? D.addDays(today, o.inbox == null ? -2 : o.inbox) : '', bucket: o.bucket || '', pinned: ''
    };
    t.icon = App.logic.guessIcon(title);
    // Ngày xong không ở tương lai: lấy Ngày sẽ làm, không có thì hôm qua
    if (t.status === 'Xong') { t.done_at = t.do_date && t.do_date <= today ? t.do_date : D.addDays(today, -1); t.inbox_since = ''; if (!t.do_date) t.do_date = t.done_at; }
    return Object.assign(t, extra || {});
  }
  var big = task('Chuẩn bị slide họp tổng kết quý', g1, { due: 5, min: 240, imp: true });
  function child(title, o) { return task(title, g1, Object.assign({ due: 5, imp: true }, o), { parent_id: big.id }); }

  var tasks = [
    task('Tổng hợp số liệu doanh thu tháng 10', g1, { due: -3, do: -3, min: 60, imp: true, status: 'Xong' }),
    task('Gửi bảng KPI nháp cho anh Minh', g1, { due: -1, min: 30, imp: true, defer: 1, inbox: -1, time: '17:00' }),
    task('Vẽ biểu đồ so sánh các quý', g1, { due: 0, do: 0, min: 60, imp: true, status: 'Đang làm', step: 'Mở file số liệu quý 3, chọn 4 chỉ số chính' }),
    task('Viết phần nhận xét và đề xuất', g1, { due: 3, min: 60, imp: true, defer: 3, inbox: -9 }),
    task('Họp chốt số liệu với phòng kế toán', g1, { due: 1, do: -1, min: 60, imp: true, status: 'Xong', time: '14:30' }),
    task('Trả lời email khách hàng', g1, { do: 0, min: 30 }),
    task('Cập nhật file theo dõi đơn hàng', g1, { do: 0, min: 60 }),
    task('Rà soát hợp đồng nhà cung cấp', g1, { due: 6, min: 120, imp: true, inbox: -4 }),
    big,
    child('Lên dàn ý slide', { do: -1, min: 30, status: 'Xong' }),
    child('Làm phần số liệu', { do: 0, min: 60 }),
    child('Làm phần kế hoạch quý sau', { min: 60, inbox: -1 }),
    // Ngày mai quá tải: 5h30 việc nhóm Công việc, quỹ giờ làm chỉ 5h15
    task('Kiểm tra số liệu tồn kho', g1, { do: 1, min: 60 }),
    task('Làm báo cáo tuần', g1, { do: 1, min: 60, imp: true }),
    task('Họp với team sale', g1, { do: 1, min: 60, time: '10:00', due: 1 }),
    task('Đối soát công nợ', g1, { do: 1, min: 60 }),
    task('Soạn kế hoạch tháng 12', g1, { do: 1, min: 60, imp: true }),
    task('Gọi điện cho đối tác vận chuyển', g1, { do: 1, min: 30 }),
    task('Bài 1 đến 4: hàm tra cứu', g2, { due: -10, do: -10, min: 60, status: 'Xong' }),
    task('Bài 5 đến 8: Pivot Table', g2, { due: -6, do: -6, min: 60, status: 'Xong' }),
    task('Bài 9 đến 12: Power Query', g2, { due: -2, do: -2, min: 60, status: 'Xong' }),
    task('Bài 13 đến 16: Dashboard', g2, { due: -1, do: -1, min: 60, status: 'Xong' }),
    task('Làm bài kiểm tra cuối khóa', g2, { due: 0, do: 0, min: 60, imp: true, step: 'Mở đề, làm câu 1' }),
    task('Chạy 3 km buổi sáng', g3, { due: -1, do: -1, min: 30, status: 'Xong' }),
    task('Chạy 3 km buổi tối', g3, { due: 0, min: 30, inbox: 0 }),
    task('Chạy 5 km cuối tuần', g3, { due: 2, min: 60 }),
    task('Đọc "Nhà giả kim"', g4, { due: -12, do: -12, min: 60, status: 'Xong' }),
    task('Đọc "Đắc nhân tâm"', g4, { due: -4, do: -4, min: 60, status: 'Xong' }),
    task('Mua giấy in cho phòng', null, { due: 0, min: 15 }),
    task('Gia hạn bảo hiểm xe', null, { due: 1, min: 30, imp: true }),
    // Việc công ty lẻ, không gắn mục tiêu: chọn Giờ làm
    task('Gửi file cho trưởng phòng', null, { due: 1, min: 15, bucket: 'work' }),
    task('Đặt lịch khám răng', null, { min: 15, inbox: -12 }),
    // Việc ghim đầu ngày (GĐ7): báo cáo daily 15 phút, T2 đến T6
    task('Báo cáo daily', g1, { due: -2, min: 15 }, { recurring_rule: 'Hằng tuần: T2, T3, T4, T5, T6', inbox_since: '', pinned: '1' }),
    // Việc lặp mẫu: lần lặp được app tự sinh khi mở
    task('Tập yoga buổi tối', g3, { due: -10, min: 30 }, { recurring_rule: 'Hằng tuần: T2, T4, T6', inbox_since: '' }),
    // Trùng thói quen "Đọc sách 20 phút": không sinh lần lặp, chỉ hiện ở phần Thói quen
    task('Đọc sách 20 phút mỗi tối', null, { due: -10, min: 15 }, { recurring_rule: 'Hằng ngày', inbox_since: '' })
  ];

  // Việc đột xuất: hôm nay 1 giờ, hôm qua 30 phút
  var interruptions = [
    { id: uuid(), date: today, title: 'Hỗ trợ sale lấy data', duration_min: '60', created_at: today + ' 10:15:00' },
    { id: uuid(), date: D.addDays(today, -1), title: 'Sửa file báo giá gấp', duration_min: '30', created_at: D.addDays(today, -1) + ' 15:00:00' }
  ];

  // Thói quen và các ngày đã tick (25 ngày gần nhất)
  var hStamp = D.addDays(today, -25) + ' 08:00:00';
  function habit(name, g, freq, active) {
    return { id: uuid(), name: name, goal_id: g ? g.id : '', frequency: freq, active: active || 'TRUE', created_at: hStamp, updated_at: hStamp };
  }
  var h1 = habit('Đọc sách 20 phút', g7, 'Hằng ngày');
  var h2 = habit('Tập thể dục buổi sáng', g7, 'Hằng tuần: T2, T4, T6');
  var h3 = habit('Ngủ trước 23 giờ', null, 'Hằng ngày');
  var h4 = habit('Thiền 10 phút', null, 'Hằng ngày', 'FALSE');
  var logs = [];
  function tick(h, offset) {
    var d = D.addDays(today, offset);
    if (!App.logic.ruleMatches(h.frequency, d)) return;
    logs.push({ id: h.id + '-' + d, habit_id: h.id, date: d, done: 'TRUE', created_at: d + ' 21:00:00', updated_at: d + ' 21:00:00' });
  }
  for (var k = -25; k <= -1; k++) {
    if (k !== -6 && k !== -13) tick(h1, k); // lỡ 2 ngày, chuỗi hiện tại 5
    if (k !== -9) tick(h2, k);
    if (k % 3) tick(h3, k);
    if (k < -15) tick(h4, k);
  }
  tick(h1, 0);

  return { goals: [g1, g2, g3, g4, g5, g6, g7], tasks: tasks, habits: [h1, h2, h3, h4], habitLogs: logs, reviews: [], interruptions: interruptions, settings: [] };
};

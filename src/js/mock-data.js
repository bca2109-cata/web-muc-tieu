/* Dữ liệu mẫu cho bản mock. Ngày tính theo hôm nay để luôn có việc trễ hạn, hôm nay, ngày mai. */
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

  // Giờ hạn mẫu, xoay vòng để thấy việc được xếp theo giờ
  var t0 = ['09:00', '17:00', '14:30', '11:00', '17:00', '20:00', '08:30'], n = 0;
  function task(title, g, dueOffset, priority, status, extra) {
    var t = {
      id: uuid(), title: title, goal_id: g ? g.id : '', due_date: dueOffset == null ? '' : D.addDays(today, dueOffset),
      priority: priority || 'Trung bình', status: status || 'Cần làm', is_top3: 'FALSE', top3_date: '',
      recurring_rule: '', parent_recurring_id: '', done_at: '', note: '', created_at: stamp, updated_at: stamp, icon: '', due_time: t0[(n++) % t0.length]
    };
    t.icon = App.logic.guessIcon(title);
    // Ngày xong không ở tương lai
    if (t.status === 'Xong') t.done_at = t.due_date && t.due_date <= today ? t.due_date : D.addDays(today, -1);
    return Object.assign(t, extra || {});
  }

  var tasks = [
    task('Tổng hợp số liệu doanh thu tháng 10', g1, -3, 'Cao', 'Xong'),
    task('Gửi bảng KPI nháp cho anh Minh', g1, -1, 'Cao'),
    task('Vẽ biểu đồ so sánh các quý', g1, 0, 'Trung bình', 'Đang làm', { is_top3: 'TRUE', top3_date: today }),
    task('Viết phần nhận xét và đề xuất', g1, 3, 'Trung bình'),
    task('Họp chốt số liệu với phòng kế toán', g1, 1, 'Cao', 'Xong'),
    task('Bài 1 đến 4: hàm tra cứu', g2, -10, 'Trung bình', 'Xong'),
    task('Bài 5 đến 8: Pivot Table', g2, -6, 'Trung bình', 'Xong'),
    task('Bài 9 đến 12: Power Query', g2, -2, 'Trung bình', 'Xong'),
    task('Bài 13 đến 16: Dashboard', g2, -1, 'Trung bình', 'Xong'),
    task('Làm bài kiểm tra cuối khóa', g2, 0, 'Cao', 'Cần làm', { is_top3: 'TRUE', top3_date: D.addDays(today, -1) }),
    task('Chạy 3 km buổi sáng', g3, -1, 'Trung bình', 'Xong'),
    task('Chạy 3 km buổi tối', g3, 0, 'Thấp'),
    task('Chạy 5 km cuối tuần', g3, 2, 'Trung bình'),
    task('Đọc "Nhà giả kim"', g4, -12, 'Thấp', 'Xong'),
    task('Đọc "Đắc nhân tâm"', g4, -4, 'Thấp', 'Xong'),
    task('Mua giấy in cho phòng', null, 0, 'Thấp'),
    task('Gia hạn bảo hiểm xe', null, 1, 'Cao'),
    task('Đặt lịch khám răng', null, null, 'Trung bình'),
    task('Chuẩn bị slide họp tổng kết quý', g1, 5, 'Cao'),
    // Việc lặp mẫu: lần lặp được app tự sinh khi mở
    task('Uống đủ 2 lít nước', g3, -4, 'Thấp', 'Cần làm', { recurring_rule: 'Hằng ngày' }),
    task('Tập yoga buổi tối', g3, -10, 'Trung bình', 'Cần làm', { recurring_rule: 'Hằng tuần: T2, T4, T6' })
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

  return { goals: [g1, g2, g3, g4, g5, g6, g7], tasks: tasks, habits: [h1, h2, h3, h4], habitLogs: logs, reviews: [] };
};

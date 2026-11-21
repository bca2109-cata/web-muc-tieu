/* Dữ liệu mẫu cho bản mock. Ngày tính theo hôm nay để luôn có việc trễ hạn, hôm nay, ngày mai. */
var App = window.App || (window.App = {});

App.mockData = function (today) {
  var D = App.date, P = App.period, uuid = App.util.uuid;
  var stamp = D.addDays(today, -7) + ' 08:00:00';

  function goal(name, group, type, status) {
    var pv = P.valueOf(type, today), r = P.range(type, pv);
    return {
      id: uuid(), name: name, group: group, period_type: type, period_value: pv,
      start_date: r.start, end_date: r.end, progress_mode: 'task', unit: '', target: '', actual: '',
      status: status || 'Đang làm', note: '', created_at: stamp, updated_at: stamp
    };
  }
  var g1 = goal('Hoàn thành báo cáo KPI quý', 'Công việc', 'Quý');
  g1.note = 'Nộp cho trưởng phòng trước ngày cuối quý.';
  var g2 = goal('Học xong khóa Excel nâng cao', 'Học tập', 'Tháng');
  var g3 = goal('Chạy bộ đều đặn', 'Sức khỏe', 'Tuần');
  var g4 = goal('Đọc xong 2 cuốn sách', 'Sức khỏe', 'Tháng', 'Hoàn thành');
  var g5 = goal('Ra mắt dự án web cá nhân', 'Công việc', 'Năm', 'Tạm dừng');

  function task(title, g, dueOffset, priority, status, extra) {
    var t = {
      id: uuid(), title: title, goal_id: g ? g.id : '', due_date: dueOffset == null ? '' : D.addDays(today, dueOffset),
      priority: priority || 'Trung bình', status: status || 'Cần làm', is_top3: 'FALSE', top3_date: '',
      recurring_rule: '', parent_recurring_id: '', done_at: '', note: '', created_at: stamp, updated_at: stamp
    };
    if (t.status === 'Xong') t.done_at = t.due_date || D.addDays(today, -1);
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
    task('Đặt lịch khám răng', null, null, 'Trung bình')
  ];

  return { goals: [g1, g2, g3, g4, g5], tasks: tasks, habits: [], habitLogs: [], reviews: [] };
};

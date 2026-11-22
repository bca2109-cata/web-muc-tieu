/* Sao lưu: xuất toàn bộ dữ liệu ra file JSON, nhập lại từ file (thay toàn bộ, hỏi trước, tự tải bản hiện tại về máy trước khi thay) */
var App = window.App || (window.App = {});

App.backup = (function () {
  var TABLES = App.C.TABLES; // tên sheet -> khóa trong state

  function counts(db) {
    return { goals: db.goals.length, tasks: db.tasks.length, habits: db.habits.length, habitLogs: db.habitLogs.length, reviews: db.reviews.length,
      interruptions: (db.interruptions || []).length, settings: (db.settings || []).length };
  }
  function countText(c) {
    return c.goals + ' mục tiêu, ' + c.tasks + ' task, ' + c.habits + ' thói quen, ' + c.habitLogs + ' ngày tick, ' + c.reviews + ' review, ' + c.interruptions + ' việc đột xuất';
  }

  function exportFile(suffix) {
    var st = App.store.get(), data = {};
    Object.keys(TABLES).forEach(function (t) { data[TABLES[t]] = st[TABLES[t]] || []; });
    var payload = { app: 'Life Planner', format: 1, exported_at: App.util.now(), data: data };
    var blob = new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'life-planner-sao-luu-' + App.date.today() + (suffix ? '-' + suffix : '') + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    return counts(data);
  }

  /* Kiểm định dạng từng ô: ngày phải là yyyy-mm-dd, các cột chọn từ danh sách phải đúng giá trị tiếng Việt.
     Ô sai thì sửa về giá trị an toàn (ngày để trống, lựa chọn về mặc định) và đếm lại để báo trước khi nhập. */
  var DATE_COLS = { Goals: ['start_date', 'end_date'], Tasks: ['due_date', 'top3_date', 'done_at', 'do_date', 'inbox_since'], HabitLogs: ['date'], Reviews: ['hide_from'], Interruptions: ['date'] };
  function choiceCols() {
    var C = App.C;
    return {
      Goals: { group: [C.GROUPS.map(function (g) { return g.key; }), 'Công việc'], period_type: [C.PERIOD_TYPES, 'Tháng'],
        progress_mode: [['task', 'metric', 'habit'], 'task'], status: [C.GOAL_STATUS, 'Đang làm'], importance: [['1', '2', '3'], '2'] },
      Tasks: { status: [C.TASK_STATUS, 'Cần làm'], is_top3: [['TRUE', 'FALSE'], 'FALSE'] },
      Habits: { active: [['TRUE', 'FALSE'], 'TRUE'] },
      HabitLogs: { done: [['TRUE', 'FALSE'], 'FALSE'] }
    };
  }
  function clean(table, row, issues) {
    (DATE_COLS[table] || []).forEach(function (c) {
      var v = row[c];
      if (!v) return;
      // Ngày đúng yyyy-mm-dd; riêng done_at cho phép kèm giờ phía sau
      var head = v.slice(0, 10), rest = v.slice(10);
      if (App.date.isValid(head) && (!rest || (c === 'done_at' && rest.charAt(0) === ' '))) return;
      issues.push(table + ' "' + (row.name || row.title || row.id) + '": ' + c + ' = "' + v + '"');
      row[c] = '';
    });
    var ch = choiceCols()[table] || {};
    Object.keys(ch).forEach(function (c) {
      var v = row[c];
      if (c === 'is_top3' || c === 'active' || c === 'done') v = row[c] = String(v).toUpperCase();
      if (v === '' && c !== 'status' && c !== 'group') { row[c] = ch[c][1]; return; }
      if (ch[c][0].indexOf(v) >= 0) return;
      issues.push(table + ' "' + (row.name || row.title || row.id) + '": ' + c + ' = "' + v + '"');
      row[c] = ch[c][1];
    });
    // Chỉ tiêu và thực tế của mục tiêu phải là số
    if (table === 'Goals') ['target', 'actual'].forEach(function (c) {
      var v = row[c].replace(',', '.');
      if (v === '' || isFinite(+v)) { row[c] = v; return; }
      issues.push(table + ' "' + (row.name || row.id) + '": ' + c + ' = "' + row[c] + '"');
      row[c] = '';
    });
    // Giờ hạn HH:mm (GĐ5), sai thì để trống (web hiểu là chưa có giờ)
    if (table === 'Tasks' && row.due_time && !App.logic.isTime(row.due_time)) {
      issues.push(table + ' "' + (row.title || row.id) + '": due_time = "' + row.due_time + '"');
      row.due_time = '';
    }
    // GĐ6: Quan trọng TRUE / FALSE (trống: đọc theo ưu tiên cũ), thời lượng và số lần dời là số nguyên
    if (table === 'Tasks') {
      var imp = String(row.is_important).toUpperCase();
      if (imp && imp !== 'TRUE' && imp !== 'FALSE') { issues.push(table + ' "' + (row.title || row.id) + '": is_important = "' + row.is_important + '"'); imp = 'FALSE'; }
      row.is_important = imp;
      if (row.priority && App.C.PRIORITY.indexOf(row.priority) < 0) row.priority = '';
    }
    if (table === 'Tasks' || table === 'Interruptions') ['duration_min', 'defer_count'].forEach(function (c) {
      if (!(c in row) || row[c] === '' || /^\d{1,4}$/.test(row[c])) return;
      issues.push(table + ' "' + (row.title || row.id) + '": ' + c + ' = "' + row[c] + '"');
      row[c] = '';
    });
    if (table === 'Interruptions' && !row.date) row.drop = true;
    if (table === 'Settings' && row.id !== 'main') row.drop = true;
    // Mức hài lòng 1 đến 5
    if (table === 'Reviews' && row.rating && ['1', '2', '3', '4', '5'].indexOf(String(row.rating)) < 0) {
      issues.push(table + ' "' + row.id + '": rating = "' + row.rating + '"');
      row.rating = '';
    }
    // Kỳ phải khớp loại kỳ (mục tiêu: Năm/Quý/Tháng/Tuần, review: Ngày/Tuần/Tháng/Năm)
    if ((table === 'Goals' || table === 'Reviews') && !App.period.range(row.period_type, row.period_value)) {
      issues.push(table + ' "' + (row.name || row.id) + '": kỳ = "' + row.period_type + ' ' + row.period_value + '"');
      if (table === 'Goals') { row.period_type = 'Tháng'; row.period_value = App.period.valueOf('Tháng', App.date.isValid(row.start_date) ? row.start_date : App.date.today()); }
      else row.drop = true;
    }
    // Ngày tick hoặc review không dùng được thì bỏ cả dòng
    if (table === 'HabitLogs' && (!row.date || !row.habit_id)) row.drop = true;
    if (table === 'Reviews' && App.summary.TYPES.indexOf(row.period_type) < 0) row.drop = true;
  }

  // Đọc file sao lưu. Chỉ giữ các cột đã biết, dòng phải có id. Sai định dạng thì báo lỗi.
  function parse(text) {
    var obj;
    try { obj = JSON.parse(text); } catch (e) { throw new Error('File không đọc được. Hãy chọn đúng file .json đã xuất từ Life Planner.'); }
    var src = obj && typeof obj === 'object' && obj.data && typeof obj.data === 'object' ? obj.data : obj;
    if (!src || typeof src !== 'object') throw new Error('File không phải bản sao lưu của Life Planner.');
    var db = {}, found = 0, issues = [];
    Object.keys(TABLES).forEach(function (t) {
      var key = TABLES[t], cols = App.C.COLUMNS[t], list = src[key];
      if (list === undefined) { db[key] = []; return; }
      if (!Array.isArray(list)) throw new Error('Phần "' + key + '" trong file không đúng dạng danh sách.');
      found++;
      var seen = {};
      db[key] = [];
      list.forEach(function (r) {
        if (!r || typeof r !== 'object' || !r.id) return;
        var row = {};
        cols.forEach(function (c) { row[c] = r[c] === null || r[c] === undefined ? '' : (typeof r[c] === 'object' ? '' : String(r[c])); });
        clean(t, row, issues);
        if (row.drop) return;
        if (seen[row.id] !== undefined) db[key][seen[row.id]] = row;
        else { seen[row.id] = db[key].length; db[key].push(row); }
      });
    });
    if (!found) throw new Error('File không phải bản sao lưu của Life Planner.');
    Object.defineProperty(db, 'issues', { value: issues, enumerable: false });
    return db;
  }

  function importFile(file) {
    if (!file) return;
    if (App.store.status().kind !== 'saved') {
      App.ui.toast('Đang có thay đổi chưa lưu xong. Đợi hiện "Đã lưu" rồi nhập lại.');
      return;
    }
    var reader = new FileReader();
    reader.onerror = function () { App.ui.toast('Không đọc được file.'); };
    reader.onload = function () {
      var db;
      try { db = parse(String(reader.result || '')); } catch (e) { App.ui.toast(e.message, { sticky: true }); return; }
      var now = counts(App.store.get()), next = counts(db);
      var where = App.api.mode === 'sheet' ? 'trên web và trong Google Sheet' : 'trong bản mẫu trên trình duyệt này';
      var empty = !(next.goals + next.tasks + next.habits + next.habitLogs + next.reviews);
      App.ui.ask('Nhập dữ liệu từ file', 'File "' + file.name + '" ' + (empty ? 'không có dữ liệu nào, nhập vào thì web sẽ trống. ' : 'có ' + countText(next) + '. ') + (db.issues.length ? 'Có ' + db.issues.length + ' ô sai định dạng sẽ được sửa về giá trị mặc định hoặc để trống (ví dụ ' + db.issues.slice(0, 2).join('; ') + '). ' : '') +
        'Toàn bộ dữ liệu hiện tại ' + where +
        ' (' + countText(now) + ') sẽ bị thay bằng nội dung file. Trước khi thay, web tự tải một file sao lưu bản hiện tại về máy.', [
        { label: 'Thay toàn bộ', value: 'yes', kind: 'danger' }, { label: 'Hủy', value: null }
      ]).then(function (v) {
        if (v !== 'yes') return;
        exportFile('truoc-khi-nhap');
        App.ui.toast('Đang nhập dữ liệu…', { sticky: true });
        App.api.replaceAll(db).then(function () {
          App.store.replace(db);
          return App.app.reload();
        }).then(function () {
          App.ui.toast('Đã nhập xong: ' + countText(next) + '.', { duration: 5000 });
        }, function (err) {
          var msg = err && err.message ? err.message : String(err);
          if (/replaceAll/.test(msg)) msg = 'Apps Script chưa có bản mới. Làm theo mục "Khi có bản mới của Code.gs" trong hướng dẫn rồi thử lại';
          App.ui.toast('Chưa nhập được. ' + msg + '. Dữ liệu cũ vẫn còn trong file sao lưu vừa tải.', { sticky: true });
        });
      });
    };
    reader.readAsText(file);
  }

  return { exportFile: exportFile, importFile: importFile, parse: parse, counts: counts };
})();

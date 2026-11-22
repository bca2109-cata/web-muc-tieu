/* Sao lưu: xuất toàn bộ dữ liệu ra file JSON, nhập lại từ file (thay toàn bộ, hỏi trước, tự tải bản hiện tại về máy trước khi thay) */
var App = window.App || (window.App = {});

App.backup = (function () {
  var TABLES = App.C.TABLES; // tên sheet -> khóa trong state

  function counts(db) {
    return { goals: db.goals.length, tasks: db.tasks.length, habits: db.habits.length, habitLogs: db.habitLogs.length, reviews: db.reviews.length };
  }
  function countText(c) {
    return c.goals + ' mục tiêu, ' + c.tasks + ' task, ' + c.habits + ' thói quen, ' + c.habitLogs + ' ngày tick, ' + c.reviews + ' review';
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

  // Đọc file sao lưu. Chỉ giữ các cột đã biết, dòng phải có id. Sai định dạng thì báo lỗi.
  function parse(text) {
    var obj;
    try { obj = JSON.parse(text); } catch (e) { throw new Error('File không đọc được. Hãy chọn đúng file .json đã xuất từ Life Planner.'); }
    var src = obj && typeof obj === 'object' && obj.data && typeof obj.data === 'object' ? obj.data : obj;
    if (!src || typeof src !== 'object') throw new Error('File không phải bản sao lưu của Life Planner.');
    var db = {}, found = 0;
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
        if (seen[row.id] !== undefined) db[key][seen[row.id]] = row;
        else { seen[row.id] = db[key].length; db[key].push(row); }
      });
    });
    if (!found) throw new Error('File không phải bản sao lưu của Life Planner.');
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
      App.ui.ask('Nhập dữ liệu từ file', 'File "' + file.name + '" ' + (empty ? 'không có dữ liệu nào, nhập vào thì web sẽ trống. ' : 'có ' + countText(next) + '. ') + 'Toàn bộ dữ liệu hiện tại ' + where +
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

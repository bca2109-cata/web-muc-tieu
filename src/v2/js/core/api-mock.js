/* V2 · lớp dữ liệu giả (mock). Cùng chữ ký với api-sheet.js. Dữ liệu lưu trong localStorage của trình duyệt
   (không có thì giữ trong bộ nhớ). ?fail=0.3 giả lập lỗi mạng 30% khi lưu. */
var LP = window.LP || (window.LP = {});

LP.createMockApi = function (opts) {
  opts = opts || {};
  var KEY = 'lpv2_mock_v1', db = null;

  function persist() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* không lưu được thì giữ trong bộ nhớ */ } }
  function open() {
    if (db) return db;
    try { var raw = localStorage.getItem(KEY); if (raw) db = JSON.parse(raw); } catch (e) { db = null; }
    if (!db || !db.routines) { db = LP.mockSeed(); persist(); }
    return db;
  }
  function key(sheet) { var k = LP.config.SHEETS[sheet]; if (!k) throw new Error('Sheet không hợp lệ: ' + sheet); return k; }
  function maybeFail() {
    if (opts.failRate && Math.random() < opts.failRate) return Promise.reject(new Error('Lỗi giả lập (?fail)'));
    return null;
  }
  function inRange(row, range, field) {
    if (!range || !row[field]) return true;
    return (!range.from || row[field] >= range.from) && (!range.to || row[field] <= range.to);
  }

  return {
    mode: 'mock',
    // range: { from, to } lọc RoutineChecks, HabitLogs, Interruptions theo ngày
    load: function (range) {
      var d = open(), out = {};
      Object.keys(LP.config.SHEETS).forEach(function (sheet) {
        var k = LP.config.SHEETS[sheet];
        out[k] = (d[k] || []).filter(function (r) {
          if (sheet === 'RoutineChecks') return inRange(r, range, 'run_date');
          if (sheet === 'HabitLogs' || sheet === 'Interruptions') return inRange(r, range, 'date');
          return true;
        });
      });
      return Promise.resolve(LP.util.clone(out));
    },
    save: function (sheet, row) {
      var f = maybeFail(); if (f) return f;
      var d = open(), list = d[key(sheet)];
      var i = list.findIndex(function (r) { return r.id === row.id; });
      if (i >= 0) list[i] = Object.assign({}, row); else list.push(Object.assign({}, row));
      persist();
      return Promise.resolve(Object.assign({}, row));
    },
    // Xóa mềm: đánh dấu deleted, không bỏ dòng
    remove: function (sheet, id) {
      var f = maybeFail(); if (f) return f;
      var d = open(), list = d[key(sheet)];
      var r = list.filter(function (x) { return x.id === id; })[0];
      if (r) { r.deleted = 'TRUE'; r.updated_at = LP.date.stamp(); persist(); }
      return Promise.resolve({ id: id });
    },
    docsIndex: function () {
      return Promise.resolve(LP.util.clone(open().docs.filter(function (r) { return !LP.util.truthy(r.deleted); })));
    },
    docGet: function (id) {
      var d = open(), r = d.docs.filter(function (x) { return x.id === id; })[0];
      if (!r) return Promise.reject(new Error('Không thấy tài liệu'));
      return Promise.resolve(Object.assign(LP.util.clone(r), { content: (d.docContents || {})[id] || '' }));
    },
    docSave: function (doc) {
      var d = open(), content = doc.content || '', row = Object.assign({}, doc);
      delete row.content;
      if (!row.id) row.id = LP.util.uid();
      var now = LP.date.stamp();
      row.updated_at = now; if (!row.created_at) row.created_at = now;
      var i = d.docs.findIndex(function (r) { return r.id === row.id; });
      if (i >= 0) d.docs[i] = row; else d.docs.push(row);
      (d.docContents || (d.docContents = {}))[row.id] = content;
      persist();
      return Promise.resolve(Object.assign({}, row, { content: content }));
    },
    ping: function () { return Promise.resolve({}); },
    // Chỉ dùng khi thử: đặt lại dữ liệu mẫu
    reset: function () { db = LP.mockSeed(); persist(); return Promise.resolve({}); }
  };
};

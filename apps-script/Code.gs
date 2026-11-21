/**
 * Cầu nối giữa web (GitHub Pages) và Google Sheet.
 * Dán toàn bộ file này vào Apps Script gắn với Sheet "Quản lý mục tiêu - dữ liệu".
 * Lần đầu: chạy hàm caiDat để tạo mã bí mật, rồi triển khai thành Ứng dụng web.
 */

var SHEETS = {
  Goals: ['id', 'name', 'group', 'period_type', 'period_value', 'start_date', 'end_date', 'progress_mode', 'unit', 'target', 'actual', 'status', 'note', 'created_at', 'updated_at', 'importance'],
  Tasks: ['id', 'title', 'goal_id', 'due_date', 'priority', 'status', 'is_top3', 'top3_date', 'recurring_rule', 'parent_recurring_id', 'done_at', 'note', 'created_at', 'updated_at', 'icon'],
  Habits: ['id', 'name', 'goal_id', 'frequency', 'active', 'created_at', 'updated_at'],
  HabitLogs: ['id', 'habit_id', 'date', 'done', 'created_at', 'updated_at'],
  Reviews: ['id', 'period_type', 'period_value', 'good', 'bad', 'next', 'created_at', 'updated_at']
};
// Cột lưu dạng số, các cột còn lại lưu dạng chữ để ngày giữ đúng yyyy-mm-dd
var NUMBER_COLS = { Goals: ['target', 'actual'] };
var STATE_KEYS = { Goals: 'goals', Tasks: 'tasks', Habits: 'habits', HabitLogs: 'habitLogs', Reviews: 'reviews' };

/* ---------- Chạy tay trong trình soạn thảo Apps Script ---------- */

// Tạo sheet còn thiếu, kiểm tra header, tạo mã bí mật nếu chưa có
function caiDat() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(SHEETS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var cols = SHEETS[name];
    var head = sh.getRange(1, 1, 1, cols.length).getValues()[0];
    if (head.join('') === '') {
      sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
      sh.setFrozenRows(1);
    } else {
      // Cột mới thêm sau này: ghi vào cuối, không đụng tới cột cũ
      var have = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
      cols.forEach(function (c) {
        if (have.indexOf(c) < 0) {
          have.push(c);
          sh.getRange(1, have.length).setValue(c).setFontWeight('bold');
        }
      });
    }
  });
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('TOKEN')) props.setProperty('TOKEN', Utilities.getUuid().replace(/-/g, ''));
  Logger.log('Đã cài đặt xong. Mã bí mật của bạn: ' + props.getProperty('TOKEN'));
}

function xemMaBiMat() {
  Logger.log('Mã bí mật: ' + PropertiesService.getScriptProperties().getProperty('TOKEN'));
}

// Lỡ để lộ mã thì chạy hàm này để đổi mã mới, rồi nhập lại mã mới trên các thiết bị
function doiMaBiMat() {
  PropertiesService.getScriptProperties().setProperty('TOKEN', Utilities.getUuid().replace(/-/g, ''));
  xemMaBiMat();
}

/* ---------- Web App ---------- */

function doGet() {
  return json_({ ok: true, data: { message: 'API Mục tiêu đang chạy. Mở web để dùng.' } });
}

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var expected = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!expected || req.token !== expected) {
      return json_({ ok: false, code: 'BAD_TOKEN', error: 'Mã bí mật không đúng' });
    }
    return json_({ ok: true, data: handle_(req) });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function handle_(req) {
  if (req.action === 'ping') return {};
  if (req.action === 'loadAll') return loadAll_();
  if (req.action === 'batch') {
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var ops = req.ops || [];
      ops.forEach(applyOp_);
      SpreadsheetApp.flush();
      return { count: ops.length };
    } finally {
      lock.releaseLock();
    }
  }
  throw new Error('Thao tác không hợp lệ: ' + req.action);
}

function loadAll_() {
  var ss = SpreadsheetApp.getActive();
  var tz = ss.getSpreadsheetTimeZone();
  var out = {};
  Object.keys(SHEETS).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    var rows = [];
    if (sh && sh.getLastRow() > 1) {
      var values = sh.getDataRange().getValues();
      var head = values[0].map(String);
      for (var i = 1; i < values.length; i++) {
        var obj = {};
        head.forEach(function (h, j) { if (h) obj[h] = fromCell_(values[i][j], tz); });
        if (obj.id) rows.push(obj);
      }
    }
    out[STATE_KEYS[name]] = rows;
  });
  return out;
}

function applyOp_(op) {
  if (!SHEETS[op.table]) throw new Error('Bảng không hợp lệ: ' + op.table);
  var sh = SpreadsheetApp.getActive().getSheetByName(op.table);
  if (!sh) throw new Error('Không thấy sheet ' + op.table + '. Hãy chạy hàm caiDat.');
  var id = op.type === 'delete' ? op.id : (op.row && op.row.id);
  if (!id) throw new Error('Thiếu id');
  var rowIndex = findRow_(sh, id);

  if (op.type === 'delete') {
    if (rowIndex) sh.deleteRow(rowIndex);
    return;
  }
  if (op.type !== 'upsert') throw new Error('Thao tác không hợp lệ: ' + op.type);

  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  var numCols = NUMBER_COLS[op.table] || [];
  var values = head.map(function (h) { return toCell_(op.row[h], numCols.indexOf(h) >= 0); });
  if (!rowIndex) {
    rowIndex = sh.getLastRow() + 1;
    if (rowIndex > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 200);
  }
  var range = sh.getRange(rowIndex, 1, 1, head.length);
  // Định dạng chữ trước khi ghi để Sheet không tự đổi ngày hay số
  range.setNumberFormats([head.map(function (h) { return numCols.indexOf(h) >= 0 ? '#,##0.##' : '@'; })]);
  range.setValues([values]);
}

function findRow_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var cell = sh.getRange(2, 1, last - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findNext();
  return cell ? cell.getRow() : 0;
}

function toCell_(v, isNumber) {
  if (v === null || v === undefined) return '';
  if (isNumber) {
    if (v === '') return '';
    var n = Number(v);
    return isNaN(n) ? '' : n;
  }
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  var s = String(v);
  // Không để chữ do người dùng nhập biến thành công thức
  if (/^[=+]/.test(s)) s = "'" + s;
  return s;
}

function fromCell_(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return v;
  var s = String(v);
  if (/^'[=+]/.test(s)) s = s.slice(1);
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

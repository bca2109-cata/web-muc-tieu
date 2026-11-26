/**
 * Life Planner V2 · cầu nối giữa web và Google Sheet "Life Planner V2 - dữ liệu".
 * Dán toàn bộ file này vào Apps Script gắn với Sheet V2 (Tiện ích mở rộng > Apps Script).
 * Lần đầu: chạy hàm setup() để tạo các sheet và mã bí mật, rồi triển khai thành Ứng dụng web.
 * Các action về tài liệu (docsIndex, docGet, docSave) nằm trong Docs.gs (Phần 3). Chưa có file đó thì các action ấy báo lỗi.
 */

var COMMON = ['id', 'created_at', 'updated_at'];
// Cột riêng của từng sheet (id, created_at, updated_at luôn đứng đầu; cột deleted luôn đứng cuối để xóa mềm)
var SHEETS = {
  Routines: ['name', 'group', 'repeat', 'weekdays', 'month_from', 'month_to', 'done_before', 'importance', 'doc_id', 'heading_id', 'active', 'sort_order'],
  RoutineItems: ['routine_id', 'sort_order', 'title', 'time', 'day_offset', 'est_min', 'note', 'link', 'valid_from', 'valid_to'],
  RoutineChecks: ['routine_id', 'item_id', 'run_date', 'status', 'done_at', 'set_time', 'note'],
  Tasks: ['title', 'kind', 'requester', 'due_date', 'due_time', 'do_date', 'do_time', 'duration_min', 'importance', 'goal_id', 'doc_id', 'heading_id', 'status', 'done_at', 'carried_from'],
  TaskSteps: ['task_id', 'sort_order', 'title', 'do_date', 'do_time', 'duration_min', 'status', 'done_at'],
  Habits: ['name', 'time', 'weekdays', 'active'],
  HabitLogs: ['habit_id', 'date', 'done'],
  Goals: ['title', 'group', 'period_type', 'period_value', 'start_date', 'end_date', 'progress_mode', 'target', 'actual', 'unit', 'importance', 'status'],
  Reviews: ['period_type', 'period_value', 'good', 'bad', 'next'],
  Interruptions: ['date', 'title', 'duration_min'],
  DaysOff: ['date', 'note'],
  Settings: ['key', 'value'],
  Docs: ['space', 'title', 'sort_order', 'headings'],
  DocChunks: ['doc_id', 'part', 'content']
};
// Khóa trong dữ liệu trả về cho web (DocChunks không trả về ở action load)
var STATE_KEYS = {
  Routines: 'routines', RoutineItems: 'routineItems', RoutineChecks: 'routineChecks', Tasks: 'tasks', TaskSteps: 'taskSteps',
  Habits: 'habits', HabitLogs: 'habitLogs', Goals: 'goals', Reviews: 'reviews', Interruptions: 'interruptions',
  DaysOff: 'daysOff', Settings: 'settings', Docs: 'docs'
};
// Cột lưu dạng số. Mọi cột khác lưu dạng chữ để ngày (yyyy-mm-dd) và giờ (HH:MM) giữ nguyên
var NUMBER_COLS = ['sort_order', 'day_offset', 'est_min', 'duration_min', 'importance', 'target', 'actual', 'month_from', 'month_to', 'part'];
// Bảng lọc theo ngày khi web gửi range { from, to }
var RANGE_FIELD = { RoutineChecks: 'run_date', HabitLogs: 'date', Interruptions: 'date' };

function headerOf_(name) { return COMMON.concat(SHEETS[name], ['deleted']); }

/* ---------- Chạy tay trong trình soạn thảo Apps Script ---------- */

// Tạo sheet còn thiếu, ghi tiêu đề, tạo mã bí mật nếu chưa có. Chạy lại bao nhiêu lần cũng an toàn.
function setup() {
  ensureColumns_();
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('TOKEN')) props.setProperty('TOKEN', Utilities.getUuid().replace(/-/g, ''));
  Logger.log('Đã cài đặt xong ' + Object.keys(SHEETS).length + ' sheet. Mã bí mật: ' + props.getProperty('TOKEN'));
}

function xemMaBiMat() {
  Logger.log('Mã bí mật: ' + PropertiesService.getScriptProperties().getProperty('TOKEN'));
}

// Lỡ để lộ mã thì chạy hàm này để đổi mã mới, rồi nhập lại mã mới trên các thiết bị
function doiMaBiMat() {
  PropertiesService.getScriptProperties().setProperty('TOKEN', Utilities.getUuid().replace(/-/g, ''));
  xemMaBiMat();
}

// Tạo sheet thiếu, thêm cột thiếu vào cuối dòng tiêu đề, không đụng cột cũ. Web gọi trước mỗi lần ghi.
function ensureColumns_() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(SHEETS).forEach(function (name) {
    var want = headerOf_(name), sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.getRange(1, 1, 1, want.length).setValues([want]).setFontWeight('bold');
      sh.setFrozenRows(1);
      return;
    }
    if (sh.getLastColumn() < 1) { sh.getRange(1, 1, 1, want.length).setValues([want]).setFontWeight('bold'); sh.setFrozenRows(1); return; }
    var have = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    want.forEach(function (c) {
      if (have.indexOf(c) < 0) { have.push(c); sh.getRange(1, have.length).setValue(c).setFontWeight('bold'); }
    });
  });
  var first = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (first && ss.getSheets().length > 1 && first.getLastRow() === 0) ss.deleteSheet(first);
}

/* ---------- Web App ---------- */

function doGet() {
  return json_({ ok: true, data: { message: 'API Life Planner V2 đang chạy. Mở web để dùng.' } });
}

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var expected = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!expected || req.token !== expected) return json_({ ok: false, code: 'BAD_TOKEN', error: 'Mã bí mật không đúng' });
    return json_({ ok: true, data: handle_(req) });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function handle_(req) {
  var a = req.action;
  if (a === 'ping') return {};
  if (a === 'load') return load_(req.range);
  if (a === 'save' || a === 'remove') {
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      ensureColumns_();
      var out = a === 'save' ? save_(req.sheet, req.row) : remove_(req.sheet, req.id);
      SpreadsheetApp.flush();
      return out;
    } finally { lock.releaseLock(); }
  }
  // Các action của tài liệu do Docs.gs (Phần 3) xử lý: hàm docsHandle_(req)
  if (typeof docsHandle_ === 'function' && /^doc/.test(a)) return docsHandle_(req);
  throw new Error('Thao tác không hợp lệ: ' + a);
}

function load_(range) {
  var ss = SpreadsheetApp.getActive(), tz = ss.getSpreadsheetTimeZone(), out = {};
  Object.keys(STATE_KEYS).forEach(function (name) {
    var sh = ss.getSheetByName(name), rows = [];
    if (sh && sh.getLastRow() > 1) {
      var values = sh.getDataRange().getValues(), head = values[0].map(String), field = RANGE_FIELD[name];
      for (var i = 1; i < values.length; i++) {
        var obj = {};
        head.forEach(function (h, j) { if (h) obj[h] = fromCell_(values[i][j], tz, h); });
        if (!obj.id) continue;
        // P5-1: range.deleted === true thì trả cả dòng đã xóa mềm của Tasks, TaskSteps (cho Thùng rác)
        if (obj.deleted === 'TRUE' && !(range && range.deleted === true && (name === 'Tasks' || name === 'TaskSteps'))) continue;
        if (range && field && obj[field]) {
          if (range.from && obj[field] < range.from) continue;
          if (range.to && obj[field] > range.to) continue;
        }
        rows.push(obj);
      }
    }
    out[STATE_KEYS[name]] = rows;
  });
  return out;
}

function save_(name, row) {
  if (!SHEETS[name]) throw new Error('Bảng không hợp lệ: ' + name);
  if (!row || !row.id) throw new Error('Thiếu id');
  var sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('Không thấy sheet ' + name + '. Hãy chạy hàm setup.');
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  var rowIndex = findRow_(sh, row.id), now = nowStamp_();
  row.updated_at = row.updated_at || now;
  if (!rowIndex) { row.created_at = row.created_at || now; rowIndex = sh.getLastRow() + 1; if (rowIndex > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 200); }
  var values = head.map(function (h) { return toCell_(row[h], NUMBER_COLS.indexOf(h) >= 0); });
  var range = sh.getRange(rowIndex, 1, 1, head.length);
  // Định dạng chữ trước khi ghi để Sheet không tự đổi ngày hay giờ
  range.setNumberFormats([head.map(function (h) { return NUMBER_COLS.indexOf(h) >= 0 ? '0.##' : '@'; })]);
  range.setValues([values]);
  return row;
}

// Xóa mềm: giữ dòng, đặt deleted = TRUE
function remove_(name, id) {
  if (!SHEETS[name]) throw new Error('Bảng không hợp lệ: ' + name);
  var sh = SpreadsheetApp.getActive().getSheetByName(name);
  var rowIndex = sh ? findRow_(sh, id) : 0;
  if (!rowIndex) return { id: id };
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  var del = head.indexOf('deleted') + 1, upd = head.indexOf('updated_at') + 1;
  if (del > 0) { sh.getRange(rowIndex, del).setNumberFormat('@').setValue('TRUE'); }
  if (upd > 0) { sh.getRange(rowIndex, upd).setNumberFormat('@').setValue(nowStamp_()); }
  return { id: id };
}

function findRow_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var cell = sh.getRange(2, 1, last - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findNext();
  return cell ? cell.getRow() : 0;
}

function nowStamp_() {
  return Utilities.formatDate(new Date(), SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm');
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
  if (/^[=+@-]/.test(s) && !/^-?\d/.test(s)) s = "'" + s;
  return s;
}

function fromCell_(v, tz, header) {
  if (v instanceof Date) {
    // Cột giờ bị Sheet đổi thành thời gian thì trả lại HH:MM
    if (v.getFullYear() < 1950) return Utilities.formatDate(v, tz, 'HH:mm');
    return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  }
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return v;
  var s = String(v);
  if (/^'[=+@-]/.test(s)) s = s.slice(1);
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

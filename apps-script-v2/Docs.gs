/**
 * Life Planner V2 · Phần 3 · tài liệu ghi chú. Dán cùng Code.gs vào Apps Script (một dự án, hai tệp).
 * Code.gs chuyển mọi action bắt đầu bằng "doc" sang hàm docsHandle_ ở đây.
 * Actions: docsIndex, docGet, docSave, docDelete.
 * Tài liệu dài hơn 45.000 ký tự được chia nhiều dòng DocChunks (một ô Google Sheet chứa tối đa 50.000 ký tự).
 */

var DOC_CHUNK = 45000;

function docsHandle_(req) {
  var a = req.action;
  if (a === 'docsIndex') return docsIndex_();
  if (a === 'docGet') return docGet_(req.id);
  if (a === 'docSave') return docsLocked_(function () { return docSave_(req.doc); });
  if (a === 'docDelete') return docsLocked_(function () { return docDelete_(req.id); });
  throw new Error('Thao tác không hợp lệ: ' + a);
}

function docsLocked_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    ensureColumnsOnce_();
    var out = fn();
    SpreadsheetApp.flush();
    return out;
  } finally { lock.releaseLock(); }
}

// Chia chuỗi thành các đoạn không dài quá size, không cắt đôi cặp ký tự thay thế (emoji)
function docsSplit_(text, size) {
  text = String(text == null ? '' : text); size = size || DOC_CHUNK;
  var parts = [], i = 0;
  while (i < text.length) {
    var end = Math.min(i + size, text.length);
    if (end < text.length) { var c = text.charCodeAt(end - 1); if (c >= 0xD800 && c <= 0xDBFF) end--; }
    parts.push(text.slice(i, end)); i = end;
  }
  return parts.length ? parts : [''];
}
function docsJoin_(parts) { return parts.join(''); }

// Đọc cả sheet thành mảng đối tượng, mỗi đối tượng có thêm __row (số dòng)
function docsRead_(name) {
  var sh = SpreadsheetApp.getActive().getSheetByName(name), out = [];
  if (!sh || sh.getLastRow() < 2) return out;
  var tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone(), values = sh.getDataRange().getValues(), head = values[0].map(String);
  for (var i = 1; i < values.length; i++) {
    var o = { __row: i + 1 };
    head.forEach(function (h, j) { if (h) o[h] = fromCell_(values[i][j], tz, h); });
    if (o.id) out.push(o);
  }
  return out;
}


// Đọc đúng MỘT dòng theo id (cột A), không đọc cả bảng. Trả null nếu không có.
function docsReadOne_(name, id) {
  var sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) return null;
  var r = findRow_(sh, id);
  if (!r) return null;
  return docsRowObj_(sh, r);
}
function docsRowObj_(sh, r, head) {
  var tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone(), lc = head ? head.length : sh.getLastColumn();
  head = head || sh.getRange(1, 1, 1, lc).getValues()[0].map(String);
  var vals = sh.getRange(r, 1, 1, lc).getValues()[0], o = { __row: r };
  head.forEach(function (h, j) { if (h) o[h] = fromCell_(vals[j], tz, h); });
  return o;
}
// Các dòng DocChunks của một tài liệu (tìm theo cột doc_id), không đọc cả bảng
function docsChunksOf_(docId) {
  var sh = SpreadsheetApp.getActive().getSheetByName('DocChunks');
  if (!sh || sh.getLastRow() < 2) return [];
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String), col = head.indexOf('doc_id') + 1;
  if (col < 1) return [];
  var cells = sh.getRange(2, col, sh.getLastRow() - 1, 1).createTextFinder(String(docId)).matchEntireCell(true).findAll();
  return cells.map(function (cell) { return docsRowObj_(sh, cell.getRow(), head); });
}

function docPublic_(o) {
  return { id: o.id, space: o.space, title: o.title, sort_order: o.sort_order, headings: o.headings || '[]',
    created_at: o.created_at, updated_at: o.updated_at, deleted: o.deleted === 'TRUE' ? 'TRUE' : '' };
}

// Chỉ thông tin để lập danh sách (không có nội dung). Gồm cả tài liệu trong Thùng rác (deleted = TRUE)
function docsIndex_() {
  return docsRead_('Docs').map(docPublic_);
}

function docGet_(id) {
  var row = docsReadOne_('Docs', id);
  if (!row) throw new Error('Không thấy tài liệu');
  var parts = docsChunksOf_(id).filter(function (c) { return c.deleted !== 'TRUE'; })
    .sort(function (a, b) { return Number(a.part) - Number(b.part); })
    .map(function (c) { return String(c.content == null ? '' : c.content); });
  var out = docPublic_(row);
  out.content = docsJoin_(parts);
  return out;
}

/* doc: { id?, space, title, sort_order, headings, content?, deleted?, base_updated_at?, force? }
   - content không gửi thì giữ nguyên nội dung cũ.
   - base_updated_at cũ hơn bản trên Sheet và không có force thì trả { conflict: true, server } để web hỏi "Giữ bản nào?". */
function docSave_(doc) {
  if (!doc) throw new Error('Thiếu tài liệu');
  var id = doc.id || Utilities.getUuid().replace(/-/g, '').slice(0, 10);
  var cur = docsReadOne_('Docs', id);
  if (cur && !doc.force && doc.base_updated_at && String(cur.updated_at) > String(doc.base_updated_at)) {
    return { conflict: true, server: docGet_(id) };
  }
  var row = {
    id: id,
    created_at: cur ? cur.created_at : undefined,
    updated_at: nowStamp_(),
    space: doc.space !== undefined ? doc.space : (cur ? cur.space : 'Công việc'),
    title: doc.title !== undefined ? doc.title : (cur ? cur.title : ''),
    sort_order: doc.sort_order !== undefined && doc.sort_order !== '' ? doc.sort_order : (cur ? cur.sort_order : ''),
    headings: doc.headings !== undefined ? doc.headings : (cur ? cur.headings : '[]'),
    deleted: doc.deleted !== undefined ? (doc.deleted && String(doc.deleted).toUpperCase() !== 'FALSE' ? 'TRUE' : '') : (cur ? cur.deleted : '')
  };
  save_('Docs', row);
  if (doc.content !== undefined && doc.content !== null) docsWriteChunks_(id, String(doc.content), !!cur);
  return docPublic_(row);
}

function docsWriteChunks_(id, content, existed) {
  var parts = docsSplit_(content, DOC_CHUNK);
  parts.forEach(function (p, n) { save_('DocChunks', { id: id + '-' + n, doc_id: id, part: n, content: p }); });
  // Tài liệu mới chưa có đoạn cũ nên không cần dọn. Tài liệu cũ chỉ xem các đoạn của chính nó.
  if (!existed) return;
  docsChunksOf_(id).forEach(function (c) {
    if (Number(c.part) >= parts.length && c.deleted !== 'TRUE') remove_('DocChunks', c.id);
  });
}

// Xóa mềm: chuyển vào Thùng rác. Khôi phục bằng docSave với deleted rỗng
function docDelete_(id) {
  var cur = docsReadOne_('Docs', id);
  if (!cur) return { id: id };
  save_('Docs', { id: id, created_at: cur.created_at, updated_at: nowStamp_(), space: cur.space, title: cur.title, sort_order: cur.sort_order, headings: cur.headings, deleted: 'TRUE' });
  return { id: id };
}

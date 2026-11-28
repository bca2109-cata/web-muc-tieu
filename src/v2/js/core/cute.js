/* V2 · Icon dễ thương cho từng việc (sổ tay 26/11). Hình trang trí vẽ SVG, màu cố định như hoa (nét mực + màu pastel).
   Tên hình mặc định: clipboard chart mail book shoe drop health broom chat calendar moon sun bowl bag coin case house sprout. */
var LP = window.LP || (window.LP = {});

LP.cute = (function () {
  /* Tự chọn hình theo chữ trong tên việc.
     Tự chọn theo chữ trong tên việc. Hình trang trí, màu cố định như hoa (nét mực + màu pastel).
     Không khớp từ nào thì dùng một bông hoa cố định theo tên. Dùng chung cho mọi màn: LP.cute.html(tên, hình mặc định). */
  var K = '#4a2c3f';
  function svg(body) {
    return '<svg class="lp-cute-svg" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" focusable="false" fill="none" stroke="' + K +
      '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }
  var eyes = '<circle cx="13" cy="19" r="1.1" fill="' + K + '" stroke="none"/><circle cx="19" cy="19" r="1.1" fill="' + K + '" stroke="none"/>' +
    '<path d="M14.6 21.6q1.4 1.2 2.8 0"/>';
  var CUTE = {
    clipboard: '<rect x="7" y="6" width="18" height="22" rx="4" fill="#ffe58f"/><rect x="12" y="3.5" width="8" height="5" rx="2" fill="#ff9fc0"/>' +
      '<path d="M11.5 14h9M11.5 18h9M11.5 22h5"/>',
    chart: '<rect x="4.5" y="5" width="23" height="22" rx="6" fill="#bdeed5"/><rect x="9" y="16" width="3.6" height="7" rx="1.5" fill="#7fd1a8"/>' +
      '<rect x="14.2" y="11" width="3.6" height="12" rx="1.5" fill="#ff9fc0"/><rect x="19.4" y="14" width="3.6" height="9" rx="1.5" fill="#ffcf6b"/>',
    mail: '<rect x="4" y="8" width="24" height="17" rx="4" fill="#b9dbff"/><path d="M5 10l11 8 11-8"/>' +
      '<path d="M16 25.5c-2-1.4-3.4-2.6-3.4-4a1.8 1.8 0 0 1 3.4-.8 1.8 1.8 0 0 1 3.4.8c0 1.4-1.4 2.6-3.4 4z" fill="#ff8fb3" stroke-width="1.4"/>',
    book: '<path d="M16 9c-3-2-7-2.5-11-1.5V25c4-1 8-.5 11 1.5 3-2 7-2.5 11-1.5V7.5C23 6.5 19 7 16 9z" fill="#ffc7dc"/><path d="M16 9v17.5"/>' +
      '<path d="M8 12.5c1.8-.4 3.6-.2 5 .4M8 16.5c1.8-.4 3.6-.2 5 .4M19 12.9c1.4-.6 3.2-.8 5-.4"/>',
    shoe: '<path d="M4 21v-9l6 1.5 3 3.5 8 1.5c3.5.7 6 2.4 6 4.5v1.5H4z" fill="#c9b6ff"/><path d="M4 24h23"/><path d="M12 15.5l1.6-1.4M15 17.5l1.6-1.4"/>' +
      '<path d="M4 24v2.5h23V24" fill="#fff"/>',
    drop: '<path d="M16 4c4.5 6 8 10 8 14.5a8 8 0 0 1-16 0C8 14 11.5 10 16 4z" fill="#9fd8f5"/>' + eyes +
      '<circle cx="11" cy="21.5" r="1.4" fill="#ff9fb8" stroke="none" opacity=".8"/><circle cx="21" cy="21.5" r="1.4" fill="#ff9fb8" stroke="none" opacity=".8"/>',
    health: '<path d="M16 27C9 22 4.5 18 4.5 12.5A5.8 5.8 0 0 1 16 10a5.8 5.8 0 0 1 11.5 2.5C27.5 18 23 22 16 27z" fill="#ff9fc0"/>' +
      '<path d="M16 13.5v7M12.5 17h7" stroke="#fff" stroke-width="2.4"/>',
    broom: '<path d="M21 4l-6 12" /><path d="M12 15l7 3.5-3 9c-3.5-.5-7-2.5-9.5-5.5z" fill="#ffcf6b"/><path d="M10.5 21l3.5 1.8M9 24l3.5 1.5"/>' +
      '<path d="M25 9l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="#fff4c9" stroke-width="1.3"/>',
    chat: '<path d="M6 6h20a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H14l-6 5v-5H6a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z" fill="#d4c4ff"/>' +
      '<circle cx="11" cy="14" r="1.3" fill="' + K + '" stroke="none"/><circle cx="16" cy="14" r="1.3" fill="' + K + '" stroke="none"/><circle cx="21" cy="14" r="1.3" fill="' + K + '" stroke="none"/>',
    calendar: '<rect x="5" y="7" width="22" height="20" rx="5" fill="#fff"/><path d="M5 13h22" /><rect x="5" y="7" width="22" height="6" rx="3" fill="#ff9fc0"/>' +
      '<path d="M11 4.5v5M21 4.5v5"/><path d="M16 24c-2-1.4-3.4-2.6-3.4-4a1.8 1.8 0 0 1 3.4-.8 1.8 1.8 0 0 1 3.4.8c0 1.4-1.4 2.6-3.4 4z" fill="#ff8fb3" stroke-width="1.4"/>',
    moon: '<path d="M20 4.5a11.5 11.5 0 1 0 7.5 18 9.5 9.5 0 0 1-7.5-18z" fill="#ffe9a6"/><circle cx="13" cy="17" r="1.1" fill="' + K + '" stroke="none"/>' +
      '<path d="M11 21q2 1.6 4 0"/><path d="M25 6l.8 1.6 1.7.4-1.3 1.2.3 1.8-1.5-.9-1.5.9.3-1.8-1.3-1.2 1.7-.4z" fill="#ffd56b" stroke-width="1.2"/>',
    sun: '<circle cx="16" cy="17" r="7.5" fill="#ffd56b" stroke="#f2a33a"/><path d="M16 3.5v3M16 27.5v1.5M3.5 17h3M26 17h3M7 8l2 2M25 8l-2 2" stroke="#f2a33a"/>' + eyes,
    bowl: '<path d="M4.5 15h23a11.5 11.5 0 0 1-23 0z" fill="#ffc29e"/><path d="M8 15c0-3.5 3.5-6 8-6s8 2.5 8 6" fill="#fff"/><path d="M20 4l5 6M23 3.5l4 6"/>',
    bag: '<path d="M6 11h20l-1.5 15a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" fill="#9fdcc0"/><path d="M11.5 14V9a4.5 4.5 0 0 1 9 0v5"/>',
    coin: '<circle cx="16" cy="16" r="11" fill="#ffd56b" stroke="#e8a317"/><circle cx="16" cy="16" r="7" stroke="#e8a317"/><path d="M16 12v8M13.5 14h4a1.6 1.6 0 0 1 0 3.2h-3a1.6 1.6 0 0 0 0 3.2h4" stroke="#b9770e" stroke-width="1.5"/>',
    case: '<rect x="4" y="10" width="24" height="16" rx="4" fill="#ffc9a8"/><path d="M12 10V7.5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2V10M4 17h24"/><rect x="14" y="15" width="4" height="4" rx="1.2" fill="#fff"/>',
    house: '<path d="M5 15L16 5l11 10v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill="#ffc7dc"/>' +
      '<path d="M16 24.5c-2.4-1.7-4-3.1-4-4.8a2.2 2.2 0 0 1 4-1 2.2 2.2 0 0 1 4 1c0 1.7-1.6 3.1-4 4.8z" fill="#ff8fb3" stroke-width="1.4"/>',
    sprout: '<path d="M16 28V15"/><path d="M16 17C16 11 11 8 5 8.5c0 6 4.5 9 11 8.5z" fill="#a6e3c4"/><path d="M16 15c0-5 4-8 10-7.5 0 5-4 8-10 7.5z" fill="#7fd1a8"/>' +
      '<path d="M10 28h12" />'
  };
  // Thứ tự quan trọng: khớp từ đầu tiên trong danh sách
  var RULES = [
    [/kham|suc khoe|thuoc|benh/, 'health'], [/nuoc/, 'drop'], [/chay|the duc|tap |gym|yoga|di bo/, 'shoe'],
    [/(^| )don |ve sinh|giat/, 'broom'], [/doc sach|sach|(^| )hoc |bai \d|on tap|khoa hoc/, 'book'],
    [/(^| )gui |email|mail|(^| )thu /, 'mail'],
    [/so lieu|chia so|doanh so|phan tich|du lieu|bieu do|thong ke|kpi/, 'chart'],
    [/bao cao|tong hop|(^| )cop |ghi chep|van ban|file|tai lieu|ke hoach/, 'clipboard'],
    [/cuoc hop|(^| )hop (voi|nhom|team)|^hop |(^| )goi |trao doi|nhan tin|chat/, 'chat'],
    [/dat lich|(^| )lich |(^| )hen /, 'calendar'], [/(^| )tien|thanh toan|chi tieu|luong/, 'coin'], [/(^| )mua |(^| )cho |sieu thi/, 'bag'],
    [/(^| )an |(^| )com |nau |(^| )bua /, 'bowl'], [/buoi toi|(^| )ngu |toi cua/, 'moon'], [/buoi sang|(^| )sang /, 'sun']
  ];
  function fold(t) {
    return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase() + ' ';
  }
  /* Biểu tượng do người dùng chọn: lưu trong Settings khóa cute_icons, dạng JSON { "tên đã bỏ dấu": "tên hình" }.
     Chọn theo tên nên cùng một tên hiện cùng một hình ở mọi màn. Không chọn thì tự khớp theo chữ như cũ. */
  var ovRaw = null, ovMap = {};
  function overrides() {
    var raw = '{}';
    try { raw = LP.store.setting('cute_icons', '{}'); } catch (e) { /* store chưa sẵn sàng */ }
    if (raw !== ovRaw) { ovRaw = raw; try { ovMap = JSON.parse(raw) || {}; } catch (e2) { ovMap = {}; } }
    return ovMap;
  }
  function key(title) { return fold(title).trim(); }
  function chosen(title) { var n = overrides()[key(title)]; return n && CUTE[n] ? n : ''; }
  function auto(title, fallback) {
    var t = fold(title);
    for (var i = 0; i < RULES.length; i++) if (RULES[i][0].test(t)) return RULES[i][1];
    return fallback || '';
  }
  function html(title, fallback, forceName) {
    var name = forceName || chosen(title) || auto(title, fallback);
    if (name && CUTE[name]) return '<span class="lp-cute" aria-hidden="true">' + svg(CUTE[name]) + '</span>';
    var f = LP.flowers.pick(title);
    return '<span class="lp-cute" aria-hidden="true">' + LP.flowers.html(f.name, 26, f.tone) + '</span>';
  }
  // Ghi lựa chọn cho một tên ('' = tự chọn). oldTitle: tên cũ khi đổi tên, để bỏ lựa chọn cũ.
  function save(title, name, oldTitle) {
    var m = Object.assign({}, overrides()), k = key(title);
    if (oldTitle && key(oldTitle) !== k) delete m[key(oldTitle)];
    if (name && CUTE[name]) m[k] = name; else delete m[k];
    var out = JSON.stringify(m);
    if (out !== JSON.stringify(overrides())) LP.store.setSetting('cute_icons', out);
  }

  /* Ô chọn biểu tượng nhúng trong biểu mẫu. HTML: LP.cute.picker(tên hiện tại, nhãn).
     Sau khi chèn vào trang gọi LP.cute.wire(gốc, hàmLấyTên) một lần. Đọc giá trị: LP.cute.read(gốc). */
  var PNAMES = {
    clipboard: 'Bảng ghi', chart: 'Số liệu', mail: 'Thư', book: 'Sách', shoe: 'Giày', drop: 'Nước', health: 'Sức khỏe', broom: 'Dọn dẹp',
    chat: 'Trao đổi', calendar: 'Lịch', moon: 'Buổi tối', sun: 'Buổi sáng', bowl: 'Ăn uống', bag: 'Mua sắm', coin: 'Tiền', case: 'Công việc',
    house: 'Cá nhân', sprout: 'Thói quen'
  };
  function picker(title, label, fallback) {
    var cur = chosen(title), shown = cur || auto(title, fallback || '');
    var cells = '<button type="button" class="cute-opt' + (cur ? '' : ' is-on') + '" data-cute="" aria-pressed="' + (!cur) + '"><span class="cute-auto">Tự chọn</span></button>' +
      Object.keys(CUTE).map(function (n) {
        return '<button type="button" class="cute-opt' + (cur === n ? ' is-on' : '') + '" data-cute="' + n + '" aria-pressed="' + (cur === n) + '" aria-label="' + (PNAMES[n] || n) + '" title="' + (PNAMES[n] || n) + '">' + html('', '', n) + '</button>';
      }).join('');
    return '<div class="cute-pick" data-icon="' + cur + '"><button type="button" class="btn btn-soft cute-toggle" aria-expanded="false">' +
      '<span class="cute-now">' + html(title, fallback, shown || undefined) + '</span>' + (label || 'Biểu tượng') + '</button>' +
      '<div class="cute-grid" hidden role="group" aria-label="Chọn biểu tượng">' + cells + '</div></div>';
  }
  function wire(root, getTitle) {
    root.addEventListener('click', function (e) {
      var pick = e.target.closest('.cute-pick'); if (!pick || !root.contains(pick)) return;
      var tg = e.target.closest('.cute-toggle'), opt = e.target.closest('.cute-opt'), grid = pick.querySelector('.cute-grid');
      if (tg) { var open = grid.hidden; grid.hidden = !open; tg.setAttribute('aria-expanded', String(open)); return; }
      if (!opt) return;
      var name = opt.getAttribute('data-cute');
      pick.setAttribute('data-icon', name);
      Array.prototype.forEach.call(grid.querySelectorAll('.cute-opt'), function (b) { var on = b === opt; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
      var t = getTitle ? getTitle(pick) : '';
      pick.querySelector('.cute-now').innerHTML = html(t, '', name || auto(t, '') || undefined);
      grid.hidden = true; pick.querySelector('.cute-toggle').setAttribute('aria-expanded', 'false');
    });
  }
  function read(pick) { return pick ? pick.getAttribute('data-icon') || '' : ''; }

  return { html: html, save: save, chosen: chosen, picker: picker, wire: wire, read: read, NAMES: Object.keys(CUTE) };
})();

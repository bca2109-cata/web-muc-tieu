/* V2 · test đợt "sửa lỗi soát": việc đã hủy, tìm kiếm mở đúng việc, bấm mở form sửa, toast bản mới, route lạ,
   bộ lọc dạng nhóm nút liền, ô giờ 24h, trạng thái trống có nút, Agenda, Lịch, form. */
const fs = require('fs');
const path = require('path');

module.exports = async function (h) {
  const A = h.assert;
  const root = path.resolve(__dirname, '../..');
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');
  const WEEK = '#/lich?view=tuan&date=2026-11-25';
  const MONTH = '#/lich?view=thang&date=2026-11-25';
  const cancel = (page, id) => page.evaluate(i => LP.logic.tasks.setCancelled(LP.store.find('Tasks', i), true), id);

  /* ---------- Mức cao ---------- */
  await h.test('1. Việc đã hủy không hiện ở Lịch tuần, Lịch tháng, Agenda, Tổng kết; vẫn tìm thấy và nằm trong Thùng rác', async () => {
    const page = await h.open({ w: 1280, h: 1600, hash: WEEK });
    const title = await page.evaluate(() => { const t = LP.store.find('Tasks', 't-bcnguon'); LP.store.upsert('Tasks', Object.assign({}, t, { due_time: '15:00', do_date: '2026-11-26' })); return t.title; });
    A.ok((await page.locator('#view').innerText()).includes(title), 'trước khi hủy phải thấy việc');
    await cancel(page, 't-bcnguon');
    A.ok(!(await page.locator('#view').innerText()).includes(title), 'Lịch tuần còn việc đã hủy');
    A.ok(!(await page.locator('.ldue-blk').allInnerTexts()).join('|').includes(title), 'còn mốc hạn của việc đã hủy');
    await page.locator('[data-view="thang"]').click();
    A.ok(!(await page.locator('#view').innerText()).includes(title), 'Lịch tháng còn việc đã hủy');
    await page.goto(page.url().split('#')[0] + '#/agenda?date=2026-11-26'); await page.waitForTimeout(150);
    A.ok(!(await page.locator('#view').innerText()).includes(title), 'Agenda còn việc đã hủy');
    const counted = await page.evaluate(t => LP.store.get().tasks.filter(x => x.title === t && x.status !== 'cancelled').length, title);
    A.strictEqual(counted, 0);
    const found = await page.evaluate(t => LP.search.query(t).filter(r => r.taskId && r.sub === 'Đã hủy').length, title);
    A.strictEqual(found, 1, 'Tìm kiếm phải thấy việc đã hủy');
    h.noErrors(page);
  });

  await h.test('2. Bấm kết quả Tìm kiếm: sang ngày làm, tô sáng dòng việc, mở form sửa; việc đã hủy có nút Khôi phục', async () => {
    const page = await h.open({ w: 1280, hash: '#/agenda' });
    const t = await page.evaluate(() => { const t = LP.store.find('Tasks', 't-kham'); LP.store.upsert('Tasks', Object.assign({}, t, { do_date: '2026-11-26' })); return t.title; });
    await page.click('#btn-search'); await page.fill('.sr-input', t.slice(0, 8));
    await page.locator('.sr-row').first().click();
    await page.waitForSelector('#qa-form');
    A.ok(page.url().includes('date=2026-11-26'), 'phải sang ngày làm: ' + page.url());
    A.strictEqual(await page.locator('#qa-title').inputValue(), t);
    A.strictEqual(await page.locator('.is-found').count(), 1, 'dòng việc phải được tô sáng');
    await page.keyboard.press('Escape'); await page.waitForTimeout(2200);
    A.strictEqual(await page.locator('.is-found').count(), 0, 'tô sáng phải tắt sau 2 giây');
    await cancel(page, 't-kham');
    await page.click('#btn-search'); await page.fill('.sr-input', t.slice(0, 8));
    await page.locator('.sr-row').first().click();
    await page.waitForSelector('#qa-form');
    A.strictEqual(await page.locator('#qa-uncancel').count(), 1, 'việc đã hủy phải có nút Khôi phục');
    h.noErrors(page);
  });

  await h.test('3. Bấm một việc hoặc mốc Hạn trên Lịch tuần mở form sửa; bấm ngày Lịch tháng mở ô nổi, không nhảy', async () => {
    const page = await h.open({ w: 1280, h: 1600, hash: WEEK });
    await page.evaluate(() => { const t = LP.store.find('Tasks', 't-bcnguon'); LP.store.upsert('Tasks', Object.assign({}, t, { due_time: '15:00' })); });
    await page.locator('.lblk[data-task]').first().click();
    await page.waitForSelector('#qa-form'); await page.keyboard.press('Escape');
    await page.locator('.lcol[data-date="2026-11-27"] .ldue-blk').first().click();
    await page.waitForSelector('#qa-form');
    A.strictEqual(await page.locator('#qa-title').inputValue(), await page.evaluate(() => LP.store.find('Tasks', 't-bcnguon').title));
    await page.keyboard.press('Escape');
    await page.locator('[data-view="thang"]').click();
    await page.locator('.mcell[data-cell="2026-11-27"]').click();
    await page.waitForSelector('.modal');
    A.ok(await page.locator('.li-day-row').count() >= 1, 'ô nổi phải liệt kê việc');
    await page.locator('.li-day-row').first().click();
    await page.waitForSelector('#qa-form');
    h.noErrors(page);
  });

  await h.test('4. Tổng kết kỳ chưa có lượt: thẻ bỏ sót và dòng xanh ghi "Chưa có số liệu"', async () => {
    const page = await h.open({ w: 1280, hash: '#/tong-ket' });
    await page.evaluate(() => { LP.store.get().routines.forEach(r => { r.active = 'FALSE'; }); LP.store.get().tasks.length = 0; LP.router.render(); });
    const t = await page.locator('.mt-tiles').innerText();
    A.strictEqual((t.match(/Chưa có số liệu/g) || []).length >= 2, true, t);
    A.ok(!/Không bỏ sót/.test(await page.locator('#view').innerText()), 'không được báo "Không bỏ sót"');
    h.noErrors(page);
  });

  await h.test('5. Toast "Có bản mới": góc dưới trái, có nút ×, dưới modal, tự ẩn sau 15 giây', async () => {
    for (const w of [390, 1280]) {
      const page = await h.open({ w, hash: '#/agenda' });
      await page.evaluate(() => { document.getElementById('update-bar').hidden = false; });
      const r = await page.evaluate(() => {
        const b = document.getElementById('update-bar').getBoundingClientRect(), logo = document.querySelector('.logo').getBoundingClientRect();
        return { left: b.left, bottom: window.innerHeight - b.bottom, top: b.top, z: +getComputedStyle(document.getElementById('update-bar')).zIndex, zm: +getComputedStyle(document.createElement('div')).zIndex || 0,
          overlapLogo: !(b.bottom < logo.top || b.top > logo.bottom || b.right < logo.left || b.left > logo.right), right: b.right };
      });
      A.ok(r.left < 40 && r.top > 200 && !r.overlapLogo, JSON.stringify(r));
      A.ok(r.right < w - 60, 'không che nút +: ' + JSON.stringify(r));
      A.ok(r.z < 50, 'phải nằm dưới modal (z-index 50): ' + r.z);
      await page.click('#update-close');
      A.strictEqual(await page.locator('#update-bar').isHidden(), true);
    }
    A.ok(read('src/v2/js/core/shell.js').includes('hideUpdateBar(true); }, 15000'), 'tự ẩn sau 15 giây');
  });

  await h.test('6. Route lạ #/calendar: chuyển hẳn về #/agenda, báo toast', async () => {
    const page = await h.open({ w: 1280, hash: '#/calendar' });
    await page.waitForTimeout(150);
    A.ok(page.url().endsWith('#/agenda'), page.url());
    A.ok((await page.locator('.toast').innerText()).includes('Không có trang này, đã về Agenda'), 'thiếu toast');
    A.strictEqual(await page.locator('.ag').count() >= 1 || await page.locator('.ag-head').count() >= 1, true);
  });

  /* ---------- Mức trung bình · cả web ---------- */
  await h.test('7-9. Khung xám khi tải, scrollbar-gutter, đầu trang dính', async () => {
    const idx = read('src/v2/index.html'), css = read('src/v2/css/base.css');
    A.ok(/class="sk"/.test(idx) && !/Đang tải…<\/p>/.test(idx), 'phải có khung xám thay chữ Đang tải');
    A.ok(/scrollbar-gutter:stable/.test(css), 'thiếu scrollbar-gutter');
    const store = read('src/v2/js/core/store.js');
    A.ok(/lpv2_cache/.test(store) && /loadCached/.test(store), 'thiếu bản lưu gần nhất');
    const page = await h.open({ w: 1280, h: 500, hash: '#/lich?view=thang' });
    A.strictEqual(await page.evaluate(() => getComputedStyle(document.querySelector('.site-head')).position), 'sticky');
    await page.evaluate(() => window.scrollTo(0, 400)); await page.waitForTimeout(150);
    A.strictEqual(await page.evaluate(() => Math.round(document.querySelector('.site-head').getBoundingClientRect().top)), 0, 'đầu trang phải dính');
    A.ok(await page.evaluate(() => document.documentElement.classList.contains('is-scrolled')), 'phải gọn lại khi cuộn xuống');
  });

  await h.test('7b. Bản lưu gần nhất: có thì nạp ngay dữ liệu từ localStorage', async () => {
    const page = await h.open({ w: 1280, hash: '#/agenda' });
    const r = await page.evaluate(() => {
      const n = LP.store.get().tasks.length; LP.config.mock = false; LP.settings.setToken('x');
      localStorage.setItem('lpv2_cache', JSON.stringify(LP.store.get()));
      LP.store._set({}); const empty = LP.store.get().tasks.length;
      const hit = LP.store.loadCached(); const back = LP.store.get().tasks.length;
      LP.config.mock = true; localStorage.removeItem('lpv2_cache'); localStorage.removeItem(LP.config.TOKEN_KEY);
      return { n, empty, hit, back };
    });
    A.ok(r.n > 0 && r.empty === 0 && r.hit === true && r.back === r.n, JSON.stringify(r));
  });

  await h.test('10. Bộ lọc dạng nhóm nút liền: nút chưa chọn cùng một màu, có aria-pressed; tab giấy chỉ dùng điều hướng', async () => {
    const check = async (page, sel) => {
      const r = await page.locator(sel).evaluateAll(g => g.map(grp => {
        const b = [...grp.querySelectorAll(':scope > button, :scope > label')];
        const off = b.filter(x => (x.getAttribute('aria-pressed') !== 'true') && !x.querySelector('input:checked') && !x.matches('.on,.is-on'));
        return { n: b.length, bgs: [...new Set(off.map(x => getComputedStyle(x).backgroundImage))].length, pressed: b.filter(x => x.hasAttribute('aria-pressed')).length };
      }));
      return r;
    };
    let page = await h.open({ w: 1280, hash: '#/agenda' });
    for (const g of await check(page, '.ag-switch')) { A.ok(g.n >= 2 && g.bgs === 1 && g.pressed === g.n, JSON.stringify(g)); }
    page = await h.open({ w: 1280, hash: WEEK });
    for (const g of await check(page, '.lich-seg')) A.ok(g.bgs === 1 && g.pressed === g.n, JSON.stringify(g));
    page = await h.open({ w: 1280, hash: '#/muc-tieu' });
    for (const g of await check(page, '.mt-switch:not(.mt-tabs)')) A.ok(g.n >= 3 && g.bgs === 1 && g.pressed === g.n, JSON.stringify(g));
    A.strictEqual(await page.evaluate(() => getComputedStyle(document.querySelector('.mt-tabs > button:not(.on)')).borderBottomWidth), '0px', 'mt-tabs vẫn là tab giấy');
    page = await h.open({ w: 1280, hash: '#/tong-ket' });
    for (const g of await check(page, '.mt-switch')) A.ok(g.bgs === 1 && g.pressed === g.n, JSON.stringify(g));
    page = await h.open({ w: 1280, hash: '#/agenda?ton=1' });
    A.ok(await page.locator('.ag-tt .ag-switch [aria-pressed]').count() === 3, 'bộ lọc Tồn tổng phải là nhóm nút liền');
  });

  await h.test('11. Chữ: "Chỉ tiêu" thay "Target"; thời lượng ghi phút/giờ', async () => {
    const page = await h.open({ w: 1280, hash: '#/muc-tieu' });
    await page.locator('[data-add]').first().click();
    await page.locator('input[name="mode"][value="number"]').check({ force: true });
    A.ok((await page.locator('.modal').innerText()).includes('Chỉ tiêu') && !/Target/i.test(await page.locator('.modal').innerText()));
    const r = await page.evaluate(() => [LP.date.fmtMin(0), LP.date.fmtMin(20), LP.date.fmtMin(60), LP.date.fmtMin(90), LP.date.fmtMin(125)]);
    A.deepStrictEqual(r, ['0 phút', '20 phút', '1 giờ', '1 giờ 30', '2 giờ 5']);
    for (const f of ['agenda', 'lich-tuan', 'tong-ket', 'them-nhanh']) A.ok(!/[0-9]\s*p\b['"<]/.test(read('src/v2/js/views/' + (f === 'agenda' ? 'agenda' : f) + '.js').replace(/<p\b|\.p\b/g, '')), f + ' còn đơn vị "p"');
  });

  await h.test('12. Ô giờ luôn là hh:mm 24h: gõ 930 ra 09:30, không phụ thuộc giờ của máy', async () => {
    const page = await h.open({ w: 1280, hash: '#/cai-dat' });
    A.strictEqual(await page.locator('input[type="time"]').count(), 0, 'không còn input type=time');
    await page.evaluate(() => LP.quickAdd.open('adhoc'));
    const f = page.locator('[data-f="do_time"]');
    await f.fill(''); await f.type('930'); await f.blur();
    A.strictEqual(await f.inputValue(), '09:30');
    await f.fill('17:5'); await f.blur();
    A.strictEqual(await f.inputValue(), '17:50');
    h.noErrors(page);
  });

  await h.test('13. Trạng thái trống có nút hành động tại chỗ', async () => {
    const page = await h.open({ w: 1280, hash: '#/agenda?date=2026-11-29' });
    A.ok(await page.locator('[data-act="add"][data-kind="adhoc"]').count() === 1 && await page.locator('[data-act="add"][data-kind="canhan"]').count() === 1, 'thiếu nút thêm Ad-hoc / Personal');
    A.strictEqual(await page.locator('a[href="#/mau?id=new"]').count() >= 1, true, 'thiếu nút Tạo Daily');
    await page.locator('[data-act="add"][data-kind="canhan"]').click();
    A.ok((await page.locator('.modal-head h2').innerText()).includes('Personal'));
    await page.keyboard.press('Escape');
    const p2 = await h.open({ w: 1280, hash: '#/muc-tieu' });
    await p2.evaluate(() => { LP.store.get().goals.length = 0; LP.store.emit('change'); });
    A.ok((await p2.locator('.mt-empty').innerText()).includes('Chưa có mục tiêu nào') && !(await p2.locator('.mt-empty').innerText()).includes('bộ lọc'), 'khi không lọc: "Chưa có mục tiêu nào"');
    A.strictEqual(await p2.locator('.mt-empty [data-add]').count(), 1);
    await p2.locator('[data-period="year"]').click();
    A.ok((await p2.locator('.mt-empty').innerText()).includes('ở bộ lọc này'), 'khi đang lọc: câu về bộ lọc');
  });

  /* ---------- Agenda ---------- */
  await h.test('14-18. Agenda: khối trống một dòng, vòng 0 việc, ngày nghỉ, hai cột Checklist không lệch', async () => {
    const page = await h.open({ w: 1280, hash: '#/agenda?date=2026-11-29' });
    const blk = await page.locator('[aria-label="Tiến độ theo khối"]').innerText();
    A.ok(/Chưa có khối nào/.test(blk) && /Tạo Daily/.test(blk), blk);
    A.ok(await page.locator('[aria-label="Tiến độ theo khối"]').evaluate(e => e.getBoundingClientRect().height) < 110, 'khung khối phải thấp');
    const ring = await page.locator('.ag-ring').textContent();
    A.ok(/0/.test(ring) && /việc/.test(ring) && !/không có lượt/.test(ring), ring);
    const p2 = await h.open({ w: 1280, hash: '#/agenda' });
    const tops = await p2.evaluate(() => [document.querySelector('.ag-cola').getBoundingClientRect().top, document.querySelector('.ag-runs').getBoundingClientRect().top]);
    A.ok(Math.abs(tops[0] - tops[1]) < 2, 'hai cột phải cùng mép trên: ' + tops);
    // nút Đánh dấu ngày nghỉ căn với khung chào
    const al = await p2.evaluate(() => { const hh = document.querySelector('.ag-hello').getBoundingClientRect(), t = document.querySelector('.ag-tools').getBoundingClientRect(); return [hh.top + hh.height / 2, t.top + t.height / 2]; });
    A.ok(Math.abs(al[0] - al[1]) < 45, 'nút ngày nghỉ lệch khung chào: ' + al);
    h.noErrors(p2);
  });

  await h.test('15. Biểu đồ 6 ngày chưa có số liệu ghi một câu', async () => {
    const page = await h.open({ w: 1280, hash: '#/agenda' });
    A.ok(read('src/v2/js/views/agenda.js').includes('Chưa có số liệu 6 ngày gần nhất'));
  });

  /* ---------- Lịch ---------- */
  await h.test('19-21. Lịch tuần tự cuộn tới giờ hiện tại, hàng ngày dính, giờ hạn nằm đúng khung giờ', async () => {
    const page = await h.open({ w: 1280, h: 600, hash: WEEK });
    await page.waitForTimeout(250);
    const y = await page.evaluate(() => ({ s: window.pageYOffset, now: document.querySelector('.lnow').getBoundingClientRect().top, ih: window.innerHeight }));
    A.ok(y.s > 0 && y.now > y.ih * 0.15 && y.now < y.ih * 0.55, JSON.stringify(y));
    const hd = await page.evaluate(() => Math.round(document.querySelector('.lhead').getBoundingClientRect().top) - Math.round(document.querySelector('.site-head').getBoundingClientRect().height));
    A.ok(Math.abs(hd) <= 2, 'hàng thứ/ngày phải dính ngay dưới đầu trang: ' + hd);
    await page.evaluate(() => { const t = LP.store.find('Tasks', 't-bcnguon'); LP.store.upsert('Tasks', Object.assign({}, t, { due_date: '2026-11-27', due_time: '17:29' })); });
    A.strictEqual(await page.locator('.lcol[data-date="2026-11-27"] .ldue-blk').count(), 1, 'giờ hạn 17:29 phải nằm trong khung giờ');
    A.strictEqual(await page.locator('.lallday[data-date="2026-11-27"] .ldue-blk').count(), 0, 'không nằm ở Cả ngày');
    await page.evaluate(() => { const t = LP.store.find('Tasks', 't-bcnguon'); LP.store.upsert('Tasks', Object.assign({}, t, { due_time: '' })); });
    A.strictEqual(await page.locator('.lallday[data-date="2026-11-27"] .ldue-blk').count(), 1, 'hạn không giờ nằm ở Cả ngày');
  });

  await h.test('22-24. Lịch tháng: ô ghi tên việc, ngày tháng khác mờ 40%, lọc Quan trọng giữ ở Tuần và Tháng', async () => {
    const page = await h.open({ w: 1280, hash: MONTH });
    A.ok(await page.locator('.mcell .mline').count() >= 1, 'ô ngày phải ghi tên việc');
    A.ok(await page.locator('.mcell .mlines').evaluateAll(l => l.every(x => x.querySelectorAll('.mline').length <= 2)), 'tối đa 2 dòng');
    const op = await page.locator('.mcell.is-other').first().evaluate(e => getComputedStyle(e).opacity);
    A.strictEqual(op, '0.4');
    const before = await page.locator('.mcell .mline').count();
    await page.locator('[data-imp]').click();
    A.strictEqual(await page.locator('[data-imp]').getAttribute('aria-pressed'), 'true');
    A.ok(await page.locator('.mcell .mline').count() <= before);
    await page.locator('[data-view="tuan"]').click();
    A.strictEqual(await page.locator('[data-imp]').getAttribute('aria-pressed'), 'true', 'bộ lọc phải giữ khi sang Tuần');
  });

  await h.test('25. Điện thoại: không còn dòng lặp "Daily: 0 lượt", "Trống"; ngày trống ghi "Không có việc"', async () => {
    const page = await h.open({ w: 390, hash: '#/lich?view=tuan&date=2026-11-29' });
    const t = await page.locator('#view').innerText();
    A.ok(!/Daily: 0 lượt/.test(t) && !/(^|\n)Trống(\n|$)/.test(t), 'còn dòng lặp');
    A.ok(/Không có việc/.test(t));
    await h.noOverflow(page);
  });

  /* ---------- Ghi chú, Mục tiêu, form ---------- */
  await h.test('26. Ghi chú: khung rộng bằng đầu trang', async () => {
    const page = await h.open({ w: 1280, hash: '#/ghi-chu' });
    const w = await page.evaluate(() => [document.querySelector('.main').getBoundingClientRect().width, document.querySelector('.topbar').getBoundingClientRect().width]);
    A.strictEqual(w[0], w[1]);
    const g = await page.evaluate(() => { const gc = document.querySelector('.gc').getBoundingClientRect(), main = document.querySelector('.gc-main').getBoundingClientRect(); return [gc.right, main.right]; });
    A.ok(Math.abs(g[0] - g[1]) <= 1, 'khung soạn phải chạm mép phải của đầu trang: ' + g);
  });

  await h.test('28-29. Form: lỗi ngay dưới ô, viền đỏ, con trỏ về ô; dấu *; nhãn chữ cho ♥; nút Lưu dính; câu Thói quen', async () => {
    const page = await h.open({ w: 390, hash: '#/muc-tieu' });
    await page.locator('[data-add]').first().click();
    A.ok(await page.locator('.modal .field.is-req').count() >= 1 && (await page.locator('.modal .field.is-req > span').first().evaluate(e => getComputedStyle(e, '::after').content)).includes('*'), 'trường bắt buộc phải có dấu *');
    for (const l of ['Thường', 'Quan trọng', 'Rất quan trọng']) A.ok(await page.locator('.modal label[aria-label="' + l + '"]').count() === 1, 'thiếu nhãn ' + l);
    await page.locator('.modal button[type="submit"]').click();
    const r = await page.evaluate(() => { const i = document.querySelector('[name="title"]'); const e = i.closest('.field').querySelector('.field-error'); return { inv: i.classList.contains('is-invalid'), focus: document.activeElement === i, msg: e && e.textContent }; });
    A.ok(r.inv && r.focus && /tên/.test(r.msg), JSON.stringify(r));
    const foot = await page.evaluate(() => { const m = document.querySelector('.modal').getBoundingClientRect(), f = document.querySelector('.modal-foot').getBoundingClientRect(); return [m.bottom, f.bottom]; });
    A.ok(Math.abs(foot[0] - foot[1]) <= 24, 'nút Lưu/Hủy phải dính cuối hộp: ' + foot);
    await page.keyboard.press('Escape');
    await page.evaluate(() => LP.router.go('muc-tieu', { tab: 'thoi-quen' })); await page.waitForTimeout(100);
    A.ok((await page.locator('#view').innerText()).includes('Bấm vào vòng tròn để đánh dấu đã làm'));
    await page.evaluate(() => LP.quickAdd.open('adhoc'));
    A.ok(await page.locator('.modal label[aria-label="Rất quan trọng"]').count() === 1, 'form Ad-hoc cũng có nhãn chữ');
    await page.click('#qa-save');
    A.ok(await page.locator('.modal .field-error').isVisible());
    h.noErrors(page);
  });

  await h.test('Mọi màn không cuộn ngang, không lỗi JS ở 390 và 1280 (sáng, tối)', async () => {
    for (const r of ['agenda', 'lich', 'ghi-chu', 'muc-tieu', 'tong-ket', 'cai-dat']) await h.checkScreen(r);
  });
};

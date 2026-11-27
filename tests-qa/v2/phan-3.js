/* V2 · test Phần 3: Ghi chú (tài liệu dài). Chạy: npm run test:v2 -- phan-3 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

module.exports = async function (h) {
  const A = h.assert;
  const root = path.resolve(__dirname, '../..');
  const SAVED = /Đã lưu \d{2}:\d{2}$/;

  // Mở màn Ghi chú (có thể kèm tham số) và đợi khung soạn khi có doc
  async function openNotes(opts, query) {
    const page = await h.open(Object.assign({ hash: '#/ghi-chu' + (query ? '?' + query : '') }, opts));
    if (query && /doc=/.test(query)) await page.waitForSelector('.gc-edit', { timeout: 5000 });
    else await page.waitForSelector('.gc-list', { timeout: 5000 });
    return page;
  }
  const waitSaved = page => page.waitForFunction(re => new RegExp(re).test((document.querySelector('.gc-status') || {}).textContent || ''), SAVED.source, { timeout: 7000 });

  /* ---------- Tĩnh: Docs.gs ---------- */
  await h.test('Docs.gs có 4 action, chia đoạn 45.000 ký tự và ghép lại đủ 60.000 ký tự', async () => {
    const gs = fs.readFileSync(path.join(root, 'apps-script-v2/Docs.gs'), 'utf8');
    ['docsIndex', 'docGet', 'docSave', 'docDelete', 'conflict', 'DocChunks'].forEach(s => A.ok(gs.includes(s), 'thiếu ' + s));
    const ctx = {}; vm.createContext(ctx); vm.runInContext(gs, ctx);
    const text = 'ab😀'.repeat(15000).slice(0, 60000);
    const parts = ctx.docsSplit_(text, 45000);
    A.ok(parts.length >= 2 && parts.every(p => p.length <= 45000), 'chia sai: ' + parts.map(p => p.length));
    A.strictEqual(ctx.docsJoin_(parts), text);
    A.strictEqual(ctx.docsSplit_('', 45000).length, 1);
  });

  /* ---------- 1. Gõ "## Chia số" ra H2 và mục lục ---------- */
  await h.test('1. Tạo tài liệu, gõ "## Chia số" ra H2 và mục lục cập nhật; tự lưu', async () => {
    const page = await openNotes();
    await page.click('[data-new="Công việc"]');
    await page.waitForSelector('.gc-edit');
    await page.click('.gc-edit');
    await page.keyboard.type('## Chia số');
    await page.waitForFunction(() => document.querySelector('.gc-edit h2'));
    A.strictEqual(await page.textContent('.gc-edit h2'), 'Chia số');
    await page.waitForFunction(() => /Chia số/.test(document.querySelector('.gc-toc').textContent), null, { timeout: 3000 }).catch(() => {});
    A.ok(/Chia số/.test(await page.textContent('.gc-toc')), 'mục lục chưa có "Chia số"');
    await waitSaved(page);
    const r = await page.evaluate(() => LP.search.query('chia so').filter(x => x.route === 'ghi-chu' && x.params.h).length);
    A.ok(r >= 1, 'tìm kiếm chưa thấy mục vừa tạo');
    h.noErrors(page);
  });

  await h.test('Phím tắt Markdown: "- ", "1. ", "[] " và nháy ô việc cần làm', async () => {
    const page = await openNotes({}, 'doc=d-y-tuong');
    await page.click('.gc-edit');
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('- gạch đầu dòng');
    A.ok(await page.$('.gc-edit ul:not(.todo) li'), 'chưa ra danh sách');
    await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
    await page.keyboard.type('đoạn xen giữa'); await page.keyboard.press('Enter');
    await page.keyboard.type('[] làm bài');
    A.ok(await page.$('.gc-edit ul.todo li'), 'chưa ra việc cần làm');
    const li = page.locator('.gc-edit ul.todo li');
    const box = await li.boundingBox();
    await page.mouse.click(box.x + 10, box.y + box.height / 2);
    A.strictEqual(await li.getAttribute('data-done'), 'true');
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
    await page.keyboard.type('1. một');
    A.ok(await page.$('.gc-edit ol li'), 'chưa ra đánh số');
    h.noErrors(page);
  });

  await h.test('Thanh công cụ: H2, đậm, bảng, khung chú ý', async () => {
    const page = await openNotes({}, 'doc=d-y-tuong');
    await page.click('.gc-edit');
    await page.keyboard.press('Control+End'); await page.keyboard.press('Enter');
    await page.keyboard.type('Tiêu đề thử');
    await page.click('[data-cmd="h2"]');
    A.ok(await page.$('.gc-edit h2'), 'H2');
    await page.keyboard.press('Enter');
    await page.keyboard.type('khung');
    await page.click('[data-cmd="callout"]');
    A.ok(await page.$('.gc-edit blockquote.callout'), 'khung chú ý');
    await page.keyboard.press('Enter');
    await page.click('[data-cmd="table"]');
    A.ok(await page.$('.gc-edit table td'), 'bảng');
    A.ok(await page.$('.gc-tool-task'), 'nút Tạo việc');
  });

  await h.test('Dán từ Word / Google Docs giữ tiêu đề, danh sách, bảng; lọc style lạ và script', async () => {
    const page = await openNotes({}, 'doc=d-y-tuong');
    const out = await page.evaluate(() => LP.editor.sanitize(
      '<meta charset=utf-8><b style="font-weight:normal" id="docs-internal-guid-1"><h2 style="color:red" class="MsoHeading2"><span style="font-weight:700">Mục A</span></h2>' +
      '<ul><li><p dir="ltr"><span style="font-style:italic">một</span></p></li></ul><table><tbody><tr><td>x</td></tr></tbody></table>' +
      '<script>alert(1)</script><a href="javascript:alert(1)">bad</a><a href="https://a.vn">ok</a><img src=x onerror=alert(1)></b>'));
    A.ok(/<h2[^>]*>.*Mục A/.test(out) && /<ul>/.test(out) && /<table>/.test(out), out);
    A.ok(!/style=|class=|<script|javascript:|onerror|<img/.test(out), 'chưa lọc: ' + out);
    A.ok(/href="https:\/\/a\.vn"/.test(out) && /<i>/.test(out));
  });

  /* ---------- 2. 60.000 ký tự ---------- */
  await h.test('2. Lưu tài liệu 60.000 ký tự, mở lại vẫn đủ nội dung', async () => {
    const page = await openNotes();
    const n = await page.evaluate(async () => {
      let html = '', i = 0;
      while (html.length < 60000) { html += '<h2>Mục ' + (++i) + '</h2><p>' + 'Nội dung dài số ' + i + '. '.repeat(1) + 'abcdefghij '.repeat(40) + '</p>'; }
      const row = await LP.api.docSave({ space: 'Công việc', title: 'Dài 60k', headings: '[]', content: html });
      const back = await LP.api.docGet(row.id);
      return { id: row.id, sent: html.length, got: back.content.length, same: back.content === html };
    });
    A.ok(n.sent >= 60000 && n.same && n.got === n.sent, JSON.stringify(n));
    const p2 = await openNotes({}, 'doc=' + n.id).catch(() => null);
    if (p2) A.ok((await p2.evaluate(() => document.querySelector('.gc-edit').textContent.length)) > 50000);
  });

  /* ---------- 3. Đổi tên tiêu đề, liên kết vẫn đúng ---------- */
  await h.test('3. Đổi tên tiêu đề thì liên kết từ Daily vẫn mở đúng mục', async () => {
    const page = await openNotes({}, 'doc=d-chiaso');
    const sel = '.gc-edit [data-hid="h-chuanbi"]';
    A.ok(/Chia số AI Class/.test(await page.getAttribute(sel, 'data-link')), 'chưa có nhãn "Gắn với Daily"');
    await page.click(sel);
    await page.keyboard.press('Home'); await page.keyboard.press('Shift+End');
    await page.keyboard.type('Chuẩn bị mới');
    await waitSaved(page);
    const r = await page.evaluate(async () => {
      const idx = await LP.api.docsIndex();
      const d = idx.filter(x => x.id === 'd-chiaso')[0];
      const rt = LP.store.get().routines.filter(x => x.id === 'r-chiaso')[0];
      await LP.views.openDoc(rt.doc_id, rt.heading_id);
      const el = document.querySelector('.modal [data-hid="' + rt.heading_id + '"]');
      return { meta: JSON.parse(d.headings).map(x => x.id + ':' + x.title), linked: rt.heading_id, shown: el && el.textContent.trim() };
    });
    A.strictEqual(r.linked, 'h-chuanbi');
    A.strictEqual(r.shown, 'Chuẩn bị mới', JSON.stringify(r));
    A.ok(r.meta.indexOf('h-chuanbi:Chuẩn bị mới') >= 0, JSON.stringify(r.meta));
  });

  /* ---------- 4. openDoc cuộn đúng mục ---------- */
  for (const w of [1280, 390]) {
    await h.test('4. LP.views.openDoc(id, hid) cuộn đúng mục (' + w + 'px)', async () => {
      const page = await h.open({ w });
      const id = await page.evaluate(async () => {
        let html = '';
        for (let i = 1; i <= 30; i++) html += '<h2 data-hid="s' + i + '">Mục số ' + i + '</h2><p>' + ('Đoạn văn dài. ').repeat(40) + '</p>';
        return (await LP.api.docSave({ space: 'Công việc', title: 'Tài liệu dài', headings: JSON.stringify(Array.from({ length: 30 }, (_, i) => ({ id: 's' + (i + 1), level: 2, title: 'Mục số ' + (i + 1) }))), content: html })).id;
      });
      await page.evaluate(([d]) => LP.views.openDoc(d, 's25'), [id]);
      await page.waitForSelector('.modal [data-hid="s25"]');
      const g = await page.evaluate(() => {
        const m = document.querySelector('.modal'), e = m.querySelector('[data-hid="s25"]');
        return { dt: e.getBoundingClientRect().top - m.getBoundingClientRect().top, st: m.scrollTop };
      });
      A.ok(g.st > 0 && g.dt >= -2 && g.dt < 120, JSON.stringify(g));
      h.noErrors(page);
    });
  }

  /* ---------- 5. Tìm kiếm ---------- */
  await h.test('5. Tìm "chia so" ra đúng mục có "Chia số" và mở đúng mục', async () => {
    const page = await h.open({ w: 1280 });
    const r = await page.evaluate(() => LP.search.query('chia so').filter(x => x.route === 'ghi-chu'));
    const hit = r.filter(x => x.params.h === 'h-chia')[0];
    A.ok(hit, 'không thấy mục "Cách chia số": ' + JSON.stringify(r));
    await page.evaluate(p => LP.router.go('ghi-chu', p), hit.params);
    await page.waitForSelector('.gc-edit [data-hid="h-chia"]');
    A.ok(/Cách chia số/.test(await page.textContent('.gc-edit [data-hid="h-chia"]')));
    // Sau khi đã tải nội dung, tìm trong nội dung cũng ra
    const r2 = await page.evaluate(() => LP.search.query('to it hoc vien').filter(x => x.route === 'ghi-chu'));
    A.ok(r2.some(x => x.params.h === 'h-chia'), 'tìm theo nội dung: ' + JSON.stringify(r2));
  });

  await h.test('Tìm trong tài liệu: đếm kết quả và chuyển qua lại', async () => {
    const page = await openNotes({}, 'doc=d-chiaso');
    await page.fill('.gc-find-in', 'chia');
    await page.waitForFunction(() => /^1\/\d+$/.test(document.querySelector('.gc-findn').textContent));
    await page.click('[data-fnext]');
    A.ok(/^2\/\d+$/.test(await page.textContent('.gc-findn')));
  });

  /* ---------- 6. Mở Agenda không gọi docsIndex ---------- */
  await h.test('6. Mở Agenda (và Lịch) không gọi docsIndex; mở Ghi chú mới gọi', async () => {
    const page = await h.open({ w: 1280, hash: '#/agenda' });
    await page.addInitScript(() => {
      const o = {}; let api;
      Object.defineProperty(o, 'api', { enumerable: true, configurable: true, get() { return api; }, set(v) {
        api = v; if (v && v.docsIndex) { const f = v.docsIndex; window.__idx = 0; v.docsIndex = function () { window.__idx++; return f.apply(this, arguments); }; }
      } });
      window.LP = o;
    });
    await page.reload();
    await page.waitForFunction(() => window.LP && LP.ready === true);
    await page.waitForTimeout(300);
    A.strictEqual(await page.evaluate(() => window.__idx), 0, 'Agenda gọi docsIndex');
    await page.evaluate(() => { location.hash = '#/lich'; });
    await page.waitForTimeout(300);
    A.strictEqual(await page.evaluate(() => window.__idx), 0, 'Lịch gọi docsIndex');
    await page.evaluate(() => { location.hash = '#/ghi-chu'; });
    await page.waitForSelector('.gc-list');
    await page.waitForFunction(() => window.__idx >= 1);
  });

  /* ---------- 7. Thùng rác ---------- */
  await h.test('7. Xóa thì vào Thùng rác, khôi phục được', async () => {
    const page = await openNotes({}, 'doc=d-y-tuong');
    await page.click('[data-del]');
    await page.click('[data-ans="1"]');
    await page.waitForSelector('.gc-list [data-new]');
    await page.waitForFunction(() => !document.querySelector('[data-doc="d-y-tuong"]'));
    await page.click('[data-trash]');
    await page.waitForSelector('[data-restore="d-y-tuong"]');
    await page.click('[data-restore="d-y-tuong"]');
    await page.waitForSelector('.gc-list [data-doc="d-y-tuong"]');
    A.strictEqual(await page.evaluate(() => LP.store.get().docs.filter(d => d.id === 'd-y-tuong').length), 1);
    // Mở lại vẫn đủ nội dung
    await page.click('[data-doc="d-y-tuong"]');
    await page.waitForSelector('.gc-edit');
    A.ok(/Viết ý tưởng/.test(await page.textContent('.gc-edit')));
  });

  /* ---------- Nháp và xung đột ---------- */
  await h.test('Nháp trong localStorage được khôi phục khi mở lại', async () => {
    const page = await openNotes();
    await page.evaluate(() => localStorage.setItem('lpv2_docdraft_d-y-tuong', JSON.stringify({ html: '<p>Chữ chưa kịp lưu</p>', title: 'Ý tưởng tháng 12', ts: '2026-11-25 11:00' })));
    await page.evaluate(() => LP.router.go('ghi-chu', { doc: 'd-y-tuong' }));
    await page.waitForSelector('.gc-edit');
    await page.waitForFunction(() => /Chữ chưa kịp lưu/.test(document.querySelector('.gc-edit').textContent));
  });

  await h.test('Xung đột: Sheet mới hơn thì hỏi "Giữ bản nào?"', async () => {
    const page = await openNotes({}, 'doc=d-chiaso');
    await page.evaluate(() => {
      const f = LP.api.docSave;
      LP.api.docSave = function (d) {
        if (d.force) { LP.api.docSave = f; return f(d); }
        return Promise.resolve({ conflict: true, server: { id: 'd-chiaso', title: 'Bản trên Sheet', content: '<p>Bản kia</p>', headings: '[]', updated_at: '2026-11-25 12:00', space: 'Công việc' } });
      };
    });
    await page.click('.gc-edit'); await page.keyboard.type(' thêm');
    await page.waitForSelector('[data-mine]', { timeout: 6000 });
    A.ok(/Giữ bản nào/.test(await page.textContent('.modal-head h2')));
    await page.click('[data-mine]');
    await waitSaved(page);
  });

  /* ---------- Điện thoại: từng tầng ---------- */
  await h.test('Điện thoại 390px: danh sách rồi tài liệu, mục lục mở bằng nút', async () => {
    const page = await openNotes({ w: 390 });
    A.ok(await page.isVisible('.gc-list') && !(await page.isVisible('.gc-main')), 'tầng danh sách');
    await page.click('[data-doc="d-chiaso"]');
    await page.waitForSelector('.gc-edit');
    A.ok(await page.isVisible('.gc-main') && !(await page.isVisible('.gc-list')), 'tầng tài liệu');
    await page.click('[data-toc]');
    await page.waitForSelector('.gc-toc-sheet .gc-toc-i');
    await page.click('.gc-toc-sheet .gc-toc-i >> nth=1');
    await page.waitForFunction(() => !document.querySelector('.gc-toc-sheet'));
    await h.noOverflow(page); h.noErrors(page);
  });

  await h.test('Máy tính 1280px: đủ 3 cột, mục lục cột phải', async () => {
    const page = await openNotes({ w: 1280 }, 'doc=d-chiaso');
    const g = await page.evaluate(() => ['.gc-list', '.gc-doc', '.gc-side'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.left), Math.round(r.width)]; }));
    A.ok(g[0][0] < g[1][0] && g[1][0] < g[2][0] && g[1][1] > 560 && g[1][1] <= 722, JSON.stringify(g));
    A.ok(await page.isVisible('.gc-side .gc-toc-i'));
  });

  /* ---------- 8. Hai kích cỡ, sáng tối, không lỗi JS ---------- */
  await h.test('8. Danh sách Ghi chú: 390px và 1280px, sáng và tối', async () => { await h.checkScreen('ghi-chu'); });
  await h.test('8. Tài liệu Ghi chú: 390px và 1280px, sáng và tối', async () => { await h.checkScreen('ghi-chu', 'doc=d-chiaso'); });

  await h.test('Đợt 2 · Danh sách xếp theo sửa gần nhất; xem trước chỉ khi có nội dung trong bộ nhớ; trạng thái trống; title nút +', async () => {
    const page = await h.open({ w: 1280, hash: '#/ghi-chu' });
    await page.evaluate(() => { const l = LP.store.get().docs; l.forEach(d => { if (d.id === 'd-chiaso') d.updated_at = '2026-11-20 08:00:00'; if (d.id === 'd-y-tuong') d.updated_at = '2026-11-24 09:00:00'; }); });
    await page.evaluate(() => LP.router.go('ghi-chu'));
    // Hai tài liệu cùng nhóm Công việc/Cá nhân: thêm một tài liệu cùng nhóm Cá nhân có updated_at mới hơn và một cái chưa có updated_at
    const order = await page.evaluate(() => {
      const l = LP.store.get().docs;
      l.push({ id: 'x-moi', space: 'Cá nhân', title: 'Mới tinh', sort_order: 9, headings: '[]', updated_at: '', deleted: '' });
      l.push({ id: 'x-cu', space: 'Cá nhân', title: 'Cũ hơn', sort_order: 0, headings: '[]', updated_at: '2026-11-01 08:00:00', deleted: '' });
      LP.router.go('ghi-chu');
      return null;
    });
    await page.waitForTimeout(150);
    const names = await page.locator('.gc-space').nth(1).locator('.gc-docrow-t').allInnerTexts();
    A.deepStrictEqual(names.map(x => x.trim()), ['Mới tinh', 'Ý tưởng tháng 12', 'Cũ hơn'], names.join('|'));
    A.strictEqual(await page.locator('.gc-docrow-p').count(), 0, 'chưa có nội dung trong bộ nhớ thì không có dòng xem trước');
    A.strictEqual(await page.locator('.gc-add').first().getAttribute('title'), 'Tạo tài liệu mới trong Công việc');
    A.strictEqual(await page.locator('.gc-add').first().getAttribute('aria-label'), 'Tạo tài liệu mới trong Công việc');
    const e = await page.locator('.gc-empty').innerText();
    A.ok(/Chưa mở tài liệu nào/.test(e) && /\+ Tài liệu mới/.test(e) && !/Chọn một tài liệu/.test(e) && await page.locator('.gc-empty .ph-flower').count() === 1);
    await page.evaluate(() => LP.router.go('ghi-chu', { doc: 'd-chiaso' })); await page.waitForSelector('.gc-title');
    await page.evaluate(() => LP.router.go('ghi-chu')); await page.waitForTimeout(150);
    const pv = await page.locator('.gc-docrow[data-doc="d-chiaso"] .gc-docrow-p').innerText();
    A.ok(pv.length > 0 && pv.length <= 61 && !/<|#/.test(pv), 'xem trước: ' + pv);
    await page.locator('[data-new-empty]').click(); await page.waitForSelector('.gc-title');
    A.strictEqual(await page.locator('.gc-space-sel').inputValue(), 'Công việc');
    h.noErrors(page);
  });
};

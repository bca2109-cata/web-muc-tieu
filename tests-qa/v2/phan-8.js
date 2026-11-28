/* V2 · test đợt "sửa lỗi lưu": hàng chờ lưu bền, sao lưu / khôi phục báo đúng, tắt Nhắc việc, hộp thoại giữ focus. */
module.exports = async function (h) {
  const A = h.assert;
  const CD = '#/cai-dat';
  const FAIL_Q = 'mock=1&today=2026-11-25&now=11:05&fail=1';   // ?fail=1: mọi lần lưu lên mock đều lỗi
  const outboxOf = page => page.evaluate(() => JSON.parse(localStorage.getItem('lpv2-outbox') || '[]'));
  const mockDb = page => page.evaluate(() => JSON.parse(localStorage.getItem('lpv2_mock_v1')));
  const readDownload = async dl => { const s = await dl.createReadStream(); const c = []; for await (const x of s) c.push(x); return JSON.parse(Buffer.concat(c).toString('utf8')); };

  await h.test('1. Hàng chờ: lưu lỗi thì giữ qua tải lại, hết lỗi gửi lại được (retry và sự kiện online)', async () => {
    const page = await h.open({ w: 1280, query: FAIL_Q });
    const ids = await page.evaluate(() => {
      const run = LP.logic.routines.runsFor('2026-11-25')[0], m = run.items[0];
      LP.logic.routines.check(run.routine.id, m.item.id, '2026-11-25', 'done');
      const t = LP.store.upsert('Tasks', { title: 'Việc thử hàng chờ', kind: 'canhan', status: 'todo', do_date: '2026-11-25', importance: 1 });
      return { task: t.id, item: m.item.id };
    });
    await page.waitForFunction(() => LP.store.syncState().pending === 0);
    A.strictEqual((await outboxOf(page)).length, 2, 'hàng chờ phải có 2 mục');
    A.ok((await page.locator('#sync').innerText()).includes('2 thay đổi chưa lưu lên Sheet'), await page.locator('#sync').innerText());
    A.ok((await page.locator('.toast.is-sticky').innerText()).includes('Chưa lưu được 2 thay đổi'), 'toast dính');
    A.ok(!(await mockDb(page)).tasks.some(t => t.id === ids.task), 'mock chưa được có việc');
    await page.reload(); await page.waitForFunction(() => LP.ready === true); await page.waitForFunction(() => LP.store.syncState().pending === 0);
    const after = await page.evaluate(i => ({ t: !!LP.store.find('Tasks', i.task), c: LP.store.get().routineChecks.some(c => c.item_id === i.item && c.status === 'done' && c.run_date === '2026-11-25'), n: LP.store.outboxCount() }), ids);
    A.deepStrictEqual(after, { t: true, c: true, n: 2 }, 'sau tải lại vẫn phải còn trên màn hình và trong hàng chờ');
    // Hết lỗi, sự kiện online tự gửi lại
    await page.evaluate(() => { LP.api.__fail = false; window.dispatchEvent(new Event('online')); });
    await page.evaluate(() => LP.store.flush());
    A.strictEqual((await outboxOf(page)).length, 0, 'hàng chờ phải về 0');
    const db = await mockDb(page);
    A.ok(db.tasks.some(t => t.id === ids.task) && db.routineChecks.some(c => c.item_id === ids.item && c.run_date === '2026-11-25' && c.status === 'done'), 'mock phải có 2 thay đổi');
    A.strictEqual(await page.locator('.toast.is-sticky').count(), 0, 'toast dính phải tắt');
    // Gọi retry bằng tay
    await page.evaluate(() => { LP.api.__fail = true; LP.store.upsert('Tasks', { title: 'Việc thứ hai', kind: 'canhan', status: 'todo', do_date: '2026-11-25', importance: 1 }); });
    await page.waitForFunction(() => LP.store.syncState().pending === 0);
    A.strictEqual(await page.evaluate(() => LP.store.outboxCount()), 1);
    await page.evaluate(() => { LP.api.__fail = false; return LP.store.retry(); });
    await page.evaluate(() => LP.store.flush());
    A.strictEqual(await page.evaluate(() => LP.store.outboxCount()), 0);
    h.noErrors(page);
  });

  await h.test('2. Hàng chờ: mỗi sheet+id một mục mới nhất; bản Sheet mới hơn thì bỏ mục chờ; xóa cũng vào hàng chờ', async () => {
    const page = await h.open({ w: 1280, query: FAIL_Q });
    await page.evaluate(() => {
      const t = LP.store.find('Tasks', 't-kham');
      LP.store.upsert('Tasks', Object.assign({}, t, { title: 'Sửa lần 1' }));
      LP.store.upsert('Tasks', Object.assign({}, LP.store.find('Tasks', 't-kham'), { title: 'Sửa lần 2' }));
      LP.store.remove('Tasks', 't-bcnguon');
    });
    await page.waitForFunction(() => LP.store.syncState().pending === 0);
    const ob = await outboxOf(page);
    A.strictEqual(ob.length, 2); A.strictEqual(ob.find(e => e.id === 't-kham').row.title, 'Sửa lần 2'); A.strictEqual(ob.find(e => e.id === 't-bcnguon').op, 'remove');
    // Mục chờ cũ hơn bản Sheet: bỏ mục chờ, giữ bản Sheet
    await page.evaluate(() => { const a = JSON.parse(localStorage.getItem('lpv2-outbox')); a.find(e => e.id === 't-kham').ts = '2000-01-01 00:00'; localStorage.setItem('lpv2-outbox', JSON.stringify(a)); });
    await page.goto(page.url().replace('&fail=1', '')); await page.reload(); await page.waitForFunction(() => LP.ready === true);
    await page.evaluate(() => LP.store.flush());
    const r = await page.evaluate(() => ({ title: LP.store.find('Tasks', 't-kham').title, gone: !LP.store.find('Tasks', 't-bcnguon'), n: LP.store.outboxCount() }));
    A.notStrictEqual(r.title, 'Sửa lần 2', 'bản Sheet mới hơn phải thắng');
    A.ok(r.gone, 'việc đã xóa phải còn bị xóa'); A.strictEqual(r.n, 0);
    A.ok((await mockDb(page)).tasks.find(t => t.id === 't-bcnguon').deleted === 'TRUE', 'xóa đã gửi lên mock');
    h.noErrors(page);
  });

  await h.test('3. Sao lưu: tài liệu lỗi thì hỏi Vẫn tải / Thử lại; không lỗi thì như cũ', async () => {
    const page = await h.open({ w: 1280, hash: CD });
    const docId = await page.evaluate(() => { LP.api.__failDocGet = ['d-chiaso']; return 'd-chiaso'; });
    let [dl] = await Promise.all([page.waitForEvent('download', { timeout: 4000 }).catch(() => null), page.click('#cd-backup').then(() => page.waitForSelector('.modal [data-ans="skip"]'))]);
    A.strictEqual(dl, null, 'chưa được tải khi còn hỏi');
    const msg = await page.locator('.modal p').innerText();
    A.ok(/Có 1 tài liệu chưa tải được: .+Tải file sao lưu thiếu các tài liệu này, hay thử lại\?/.test(msg), msg);
    A.deepStrictEqual(await page.locator('.modal-foot .btn').allInnerTexts(), ['Thử lại', 'Vẫn tải']);
    // Esc = hủy, không tải, không hỏi lại
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    A.strictEqual(await page.locator('.modal').count(), 0, 'Esc phải đóng hộp');
    A.ok((await page.locator('.toast').innerText()).includes('Đã hủy sao lưu'));
    await page.click('#cd-backup'); await page.waitForSelector('.modal [data-ans="skip"]');
    // Thử lại khi còn lỗi: hỏi lại; hết lỗi: tải đủ
    await page.click('[data-ans="retry"]'); await page.waitForSelector('.modal [data-ans="skip"]');
    await page.evaluate(() => { LP.api.__failDocGet = false; });
    const p1 = page.waitForEvent('download', { timeout: 5000 });
    await page.click('[data-ans="retry"]');
    const full = await readDownload(await p1);
    A.strictEqual(full.docs.length, 2, 'sau khi thử lại phải đủ 2 tài liệu');
    // Vẫn tải: file thiếu
    await page.evaluate(() => { LP.api.__failDocGet = ['d-chiaso']; });
    await page.click('#cd-backup'); await page.waitForSelector('.modal [data-ans="skip"]');
    const p2 = page.waitForEvent('download', { timeout: 5000 });
    await page.click('[data-ans="skip"]');
    const part = await readDownload(await p2);
    A.strictEqual(part.docs.length, 1);
    h.noErrors(page);
  });

  await h.test('4. Khôi phục: báo đúng số dòng và tài liệu, chỉ thử lại phần lỗi, không báo "Đã khôi phục" khi còn lỗi', async () => {
    const page = await h.open({ w: 1280, hash: CD });
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('#cd-backup')]);
    const j = await readDownload(dl);
    const rows = Object.keys(j.data).reduce((a, k) => a + (Array.isArray(j.data[k]) ? j.data[k].filter(r => r && r.id).length : 0), 0);
    await page.evaluate(() => { LP.api.__failDocSave = ['d-chiaso']; });
    await page.setInputFiles('#cd-restore-file', { name: 'sao-luu.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(j)) });
    await page.waitForSelector('[data-ans="1"]'); await page.click('[data-ans="1"]');
    await page.waitForFunction(() => /chưa xong/.test((document.querySelector('.modal-head h2') || {}).textContent || ''), null, { timeout: 8000 });
    const msg = await page.locator('.modal p').innerText();
    A.ok(msg.includes('Đã khôi phục ' + rows + '/' + rows + ' dòng và 1/2 tài liệu. Chưa khôi phục được: '), msg);
    A.ok(!/^Đã khôi phục \d+ dòng/.test(msg));
    A.strictEqual(await page.locator('.toast', { hasText: 'Đã khôi phục' }).count(), 0, 'không được báo thành công');
    await page.evaluate(() => { LP.api.__failDocSave = false; });
    await page.click('[data-ans="1"]'); await page.waitForSelector('.toast');
    await page.waitForFunction(() => /Đã khôi phục \d+ dòng và 2 tài liệu\./.test((document.querySelector('.toast') || {}).textContent || ''), null, { timeout: 8000 });
    // Lỗi lưu dòng: đếm theo hàng chờ
    await page.evaluate(() => { LP.api.__fail = true; });
    await page.setInputFiles('#cd-restore-file', { name: 'sao-luu.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(j)) });
    await page.waitForSelector('[data-ans="1"]'); await page.click('[data-ans="1"]');
    await page.waitForFunction(() => /chưa xong/.test((document.querySelector('.modal-head h2') || {}).textContent || ''), null, { timeout: 8000 });
    A.ok((await page.locator('.modal p').innerText()).includes('Đã khôi phục 0/' + rows + ' dòng và 2/2 tài liệu'), await page.locator('.modal p').innerText());
    await page.evaluate(() => { LP.api.__fail = false; });
    await page.click('[data-ans="1"]');
    await page.waitForFunction(() => /Đã khôi phục \d+ dòng và 2 tài liệu\./.test((document.querySelector('.toast') || {}).textContent || ''), null, { timeout: 8000 });
    A.strictEqual(await page.evaluate(() => LP.store.outboxCount()), 0);
    h.noErrors(page);
  });

  await h.test('5. Nhắc việc: tắt thì không báo và không toast; bật lại thì báo', async () => {
    const probe = await h.open({ w: 1280 });
    const time = await probe.evaluate(() => { for (const run of LP.logic.routines.runsFor('2026-11-25')) for (const m of run.items) if (m.time && !m.done && !m.status) return m.time; return ''; });
    A.ok(time, 'cần một mục Daily có giờ');
    const page = await h.open({ w: 1280 });   // tới giờ giả lập bằng cách đổi đồng hồ sau khi tải (lúc tải đã kiểm một lần)
    await page.evaluate(t => { LP.date.now = () => t; }, time);
    await page.evaluate(() => { window.__shown = 0; const o = LP.notify.show; LP.notify.show = function () { window.__shown++; return o.apply(this, arguments); }; LP.store.setSetting('notify', '0'); document.querySelectorAll('.toast').forEach(t => t.remove()); LP.agenda.checkNotify(); });
    A.strictEqual(await page.evaluate(() => window.__shown), 0, 'tắt rồi vẫn gọi LP.notify.show');
    A.strictEqual(await page.locator('.toast').count(), 0, 'tắt rồi vẫn hiện toast');
    await page.evaluate(() => { LP.store.setSetting('notify', '1'); LP.agenda.checkNotify(); });
    A.ok(await page.evaluate(() => window.__shown) > 0, 'bật lại phải báo');
    h.noErrors(page);
  });

  await h.test('6. Hộp thoại giữ focus: Tab và Shift+Tab quay vòng, bỏ qua phần tử ẩn / vô hiệu; Escape trả focus về nút mở', async () => {
    const page = await h.open({ w: 1280 });
    const act = () => page.evaluate(() => { const a = document.activeElement; return a ? (a.id || a.getAttribute('data-ans') || (a.hasAttribute('data-close') ? 'close' : a.tagName)) : ''; });
    await page.evaluate(() => {
      const b = document.createElement('button'); b.id = 'opener'; b.textContent = 'Mở'; document.body.appendChild(b); b.focus();
      LP.ui.sheet('Thử', '<input id="a"><input id="hid" hidden><select id="b"><option>1</option></select><button id="dis" disabled>x</button><div hidden><button id="in-hidden">h</button></div><button id="c" type="button">Xong</button>');
    });
    A.strictEqual(await act(), 'a');
    await page.keyboard.press('Shift+Tab'); A.strictEqual(await act(), 'close');
    await page.keyboard.press('Shift+Tab'); A.strictEqual(await act(), 'c', 'Shift+Tab ở đầu phải về cuối');
    await page.keyboard.press('Tab'); A.strictEqual(await act(), 'close', 'Tab ở cuối phải về đầu (nút đóng)');
    await page.keyboard.press('Tab'); A.strictEqual(await act(), 'a');
    await page.keyboard.press('Tab'); A.strictEqual(await act(), 'b');
    await page.keyboard.press('Tab'); A.strictEqual(await act(), 'c');
    await page.keyboard.press('Escape');
    A.strictEqual(await act(), 'opener', 'đóng phải trả focus về nút đã mở');
    // ui.confirm
    await page.evaluate(() => { document.getElementById('opener').focus(); window.__r = null; LP.ui.confirm('Hỏi', 'Chắc không?').then(v => { window.__r = v; }); });
    await page.keyboard.press('Tab'); A.strictEqual(await act(), '1');       // Hủy -> Đồng ý
    await page.keyboard.press('Tab'); A.strictEqual(await act(), 'close', 'confirm: Tab ở cuối quay về đầu');
    await page.keyboard.press('Shift+Tab'); A.strictEqual(await act(), '1', 'confirm: Shift+Tab ở đầu về cuối');
    await page.keyboard.press('Escape');
    A.strictEqual(await act(), 'opener');
    h.noErrors(page);
  });

  await h.test('7. Sửa nhanh Daily từ Agenda: chọn "Từ ngày mai" thì hiệu lực từ 26/11, hôm nay giữ nguyên', async () => {
    const page = await h.open({ w: 390 });
    const ids = await page.evaluate(() => { const run = LP.logic.routines.runsFor('2026-11-25')[0]; return { r: run.routine.id, i: run.items[0].item.id, t: run.items[0].item.title }; });
    await page.evaluate(i => LP.views.editItemQuick(i.r, i.i, '2026-11-25'), ids);
    A.deepStrictEqual(await page.locator('[name="eq-scope"]').evaluateAll(n => n.map(x => x.value)), ['today', 'forward', 'tomorrow']);
    await page.locator('label:has([name="eq-scope"][value="tomorrow"])').click();
    await page.fill('#eq-title', 'Tên mới từ mai'); await page.click('#eq-ok');
    await page.evaluate(() => LP.store.flush());
    const r = await page.evaluate(i => LP.store.get().routineItems.filter(x => x.routine_id === i.r).map(x => [x.title, x.valid_from || '', x.valid_to || '']), ids);
    A.ok(r.some(x => x[0] === 'Tên mới từ mai' && x[1] === '2026-11-26'), JSON.stringify(r));
    A.ok(r.some(x => x[0] === ids.t && x[2] === '2026-11-25'), 'bản cũ phải đóng ở 25/11');
    A.ok((await page.locator('.toast').innerText()).includes('từ ngày mai'));
    h.noErrors(page);
  });
};

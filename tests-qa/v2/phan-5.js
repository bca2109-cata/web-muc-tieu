/* V2 · test Phần 5: Daily (mẫu), Cài đặt, nút "+" (theo "Tiêu chí hoàn thành" trong docs/v2/phan-5-mau-cai-dat.md).
   Gồm cả các mục chờ Phần 5: LP.quickAdd.edit (YEU-CAU-CHUNG 3), P3-3 (open nhận tham số thứ hai), P4-2 (ô chọn mục tiêu), nút "Hủy việc". */
module.exports = async function (h) {
  const A = h.assert;
  const MAU = '#/mau', CD = '#/cai-dat';
  const items4 = [['08:00', 'Lấy số', '0'], ['08:30', 'Chia tổ', '0'], ['09:15', 'Gửi file', '0'], ['08:30', 'Cop lại', '1']];

  // Dựng một Daily mới qua form: rows = [[giờ, tên, '0'|'1']]
  async function buildRoutine(page, name, rows, opts) {
    opts = opts || {};
    await page.evaluate(() => LP.router.go('mau', { id: 'new' })); await page.waitForTimeout(60);
    await page.fill('#mc-name', name);
    if (opts.month) {
      await page.locator('label:has([name="mc-repeat"][value="month_range"])').click();
      await page.fill('#mc-from', String(opts.month[0])); await page.fill('#mc-to', String(opts.month[1]));
    }
    for (let i = 0; i < rows.length; i++) {
      await page.click('#mc-add-item');
      const li = page.locator('.mc-item').nth(i);
      await li.locator('[data-f="time"]').fill(rows[i][0]);
      await li.locator('[data-f="title"]').fill(rows[i][1]);
      await li.locator('[data-f="day_offset"]').selectOption(rows[i][2]);
    }
    await page.click('#mc-save'); await page.waitForTimeout(80);
    return page.evaluate(n => { const r = LP.store.get().routines.filter(x => x.name === n && x.id !== 'r-chiaso').pop(); return r ? r.id : null; }, name);
  }

  await h.test('1. Tạo Daily "Chia số AI Class" 4 hạng mục (1 mục +1): itemsFor(26/11) có mục +1 của lượt 25/11', async () => {
    const page = await h.open({ w: 1280, hash: MAU });
    const id = await buildRoutine(page, 'Chia số AI Class', items4);
    A.ok(id, 'không tạo được Daily');
    const got = await page.evaluate(rid => {
      const r = LP.store.find('Routines', rid), its = LP.store.get().routineItems.filter(x => x.routine_id === rid);
      const p1 = LP.logic.routines.itemsFor('2026-11-26').filter(m => m.routine.id === rid && m.plus1);
      return { n: its.length, off: its.filter(x => +x.day_offset === 1).length, weekdays: r.weekdays, group: r.group, p1: p1.map(m => m.item.title + '@' + m.runDate), today: LP.logic.routines.runsFor('2026-11-25').filter(x => x.routine.id === rid).length };
    }, id);
    A.strictEqual(got.n, 4); A.strictEqual(got.off, 1); A.strictEqual(got.weekdays, '1,2,3,4,5,6'); A.strictEqual(got.group, 'cong_viec');
    A.deepStrictEqual(got.p1, ['Cop lại@2026-11-25']); A.strictEqual(got.today, 1, 'lượt 25/11 phải có');
    // Danh sách bên trái hiện số hạng mục và lịch lặp
    const row = await page.locator('.mc-row.is-on').innerText();
    A.ok(/4 hạng mục/.test(row) && /T2–T7/.test(row), 'dòng danh sách: ' + row.replace(/\n/g, ' '));
    h.noErrors(page);
  });

  await h.test('2. Daily theo khoảng ngày 1–3: lượt chỉ có ở ngày 1, 2, 3', async () => {
    const page = await h.open({ w: 1280, hash: MAU });
    const id = await buildRoutine(page, 'Chốt thử', [['09:00', 'Đối soát', '0']], { month: [1, 3] });
    const got = await page.evaluate(rid => ['2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-10', '2026-12-29'].map(d => LP.logic.routines.runsFor(d).some(x => x.routine.id === rid)), id);
    A.deepStrictEqual(got, [true, true, true, false, false, false]);
    const r = await page.evaluate(rid => { const x = LP.store.find('Routines', rid); return [x.repeat, +x.month_from, +x.month_to]; }, id);
    A.deepStrictEqual(r, ['month_range', 1, 3]);
    h.noErrors(page);
  });

  await h.test('3. Sửa giờ "Từ ngày mai": lịch sử ngày cũ giữ giờ cũ, tick cũ còn nguyên', async () => {
    const page = await h.open({ w: 1280, hash: MAU + '?id=r-chiaso' });
    await page.locator('.mc-item').first().locator('[data-f="time"]').fill('08:10');
    await page.locator('label:has([name="mc-apply"][value="tomorrow"])').click();
    await page.click('#mc-save'); await page.waitForTimeout(80);
    const t = await page.evaluate(() => {
      const f = d => LP.logic.routines.itemsFor(d).filter(m => m.item.title === 'Lấy số liệu từ LMS').map(m => m.time);
      return { d24: f('2026-11-24'), d25: f('2026-11-25'), d26: f('2026-11-26'), done25: LP.logic.routines.runsFor('2026-11-25').filter(r => r.routine.id === 'r-chiaso')[0].items.filter(m => m.done).length };
    });
    A.deepStrictEqual(t.d24, ['08:00']); A.deepStrictEqual(t.d25, ['08:00']); A.deepStrictEqual(t.d26, ['08:10']);
    A.strictEqual(t.done25, 1, 'tick ngày 25/11 phải còn');
    h.noErrors(page);
  });

  await h.test('3b. Sửa nhanh (LP.views.editItemQuick): "Chỉ hôm nay" và "Từ nay về sau"', async () => {
    const page = await h.open({ w: 390 });
    await page.evaluate(() => LP.views.editItemQuick('r-chiaso', 'ri-r-chiaso-2'));
    await page.fill('#eq-time', '08:45');
    await page.click('#eq-ok'); await page.waitForTimeout(60);
    const f = (d, title) => page.evaluate(([d, t]) => LP.logic.routines.itemsFor(d).filter(m => m.item.title === t).map(m => m.time), [d, title]);
    A.deepStrictEqual(await f('2026-11-25', 'Chia số cho các tổ'), ['08:45']);
    A.deepStrictEqual(await f('2026-11-26', 'Chia số cho các tổ'), ['08:30'], 'ngày mai phải về giờ cũ');
    A.deepStrictEqual(await f('2026-11-24', 'Chia số cho các tổ'), ['08:30']);
    await page.evaluate(() => LP.views.editItemQuick('r-chiaso', 'ri-r-chiaso-3'));
    await page.fill('#eq-title', 'Gửi file cho TBP (mới)');
    await page.locator('label:has([name="eq-scope"][value="forward"])').click();
    await page.click('#eq-ok'); await page.waitForTimeout(60);
    A.deepStrictEqual(await f('2026-11-25', 'Gửi file cho TBP (mới)'), ['09:15']);
    A.deepStrictEqual(await f('2026-11-27', 'Gửi file cho TBP (mới)'), ['09:15']);
    A.deepStrictEqual(await f('2026-11-24', 'Gửi file cho TBP'), ['09:15'], 'ngày cũ giữ tên cũ');
    h.noErrors(page);
  });

  await h.test('4. Đánh dấu 26/11 là ngày nghỉ: không có lượt 26, mục +1 của 25 rơi vào 27', async () => {
    const page = await h.open({ w: 1280, hash: CD });
    await page.fill('#cd-off-from', '2026-11-26'); await page.fill('#cd-off-note', 'Nghỉ thử');
    await page.click('#cd-off-add'); await page.waitForTimeout(60);
    A.ok((await page.locator('#cd-off-list').innerText()).includes('26/11/2026'), 'danh sách ngày nghỉ');
    const t = await page.evaluate(() => ({
      runs26: LP.logic.routines.runsFor('2026-11-26').length,
      p27: LP.logic.routines.itemsFor('2026-11-27').filter(m => m.plus1 && m.runDate === '2026-11-25').map(m => m.item.title),
      p26: LP.logic.routines.itemsFor('2026-11-26').length
    }));
    A.strictEqual(t.runs26, 0); A.strictEqual(t.p26, 0); A.deepStrictEqual(t.p27, ['Cop lại lần cuối']);
    // Bỏ ngày nghỉ thì lượt trở lại
    await page.click('[data-off-del]'); await page.waitForTimeout(60);
    A.ok(await page.evaluate(() => LP.logic.routines.runsFor('2026-11-26').length > 0), 'bỏ ngày nghỉ phải có lượt lại');
    // Thêm nhiều ngày một lần (bỏ Chủ nhật)
    await page.fill('#cd-off-from', '2026-12-07'); await page.fill('#cd-off-to', '2026-12-13'); await page.click('#cd-off-add'); await page.waitForTimeout(60);
    A.strictEqual(await page.evaluate(() => LP.store.get().daysOff.filter(r => r.date >= '2026-12-07' && r.date <= '2026-12-13').length), 6);
    h.noErrors(page);
  });

  await h.test('5. Thêm Ad-hoc hạn Thứ Sáu: ngày làm gợi ý là Thứ Năm', async () => {
    const page = await h.open({ w: 1280 });
    await page.click('#fab'); await page.click('[data-kind="adhoc"]');
    A.strictEqual(await page.locator('.modal-head h2').innerText(), 'Thêm Ad-hoc');
    await page.fill('.modal [data-f="title"]', 'Báo cáo thử hạn thứ Sáu');
    await page.fill('.modal [data-f="requester"]', 'TBP Sales');
    await page.fill('.modal [data-f="due_date"]', '2026-11-27');
    A.strictEqual(await page.inputValue('.modal [data-f="do_date"]'), '2026-11-26');
    A.ok((await page.locator('[data-hint="do_date"]').innerText()).includes('Thứ Năm'), 'chú thích ngày làm');
    // Thêm bước con có ngày riêng
    await page.click('#qa-add-step');
    await page.fill('.qa-step [data-f="s_title"]', 'Bước 1'); await page.fill('.qa-step [data-f="s_date"]', '2026-11-26'); await page.fill('.qa-step [data-f="s_dur"]', '45');
    await page.click('#qa-save'); await page.waitForTimeout(80);
    const t = await page.evaluate(() => { const x = LP.store.get().tasks.filter(t => t.title === 'Báo cáo thử hạn thứ Sáu')[0]; return x && { kind: x.kind, do: x.do_date, due: x.due_date, req: x.requester, st: LP.logic.tasks.stepsOf(x.id).map(s => s.title + '|' + s.do_date + '|' + s.duration_min), dur: x.duration_min }; });
    A.ok(t, 'chưa lưu việc');
    A.strictEqual(t.kind, 'adhoc'); A.strictEqual(t.do, '2026-11-26'); A.strictEqual(t.due, '2026-11-27'); A.strictEqual(t.req, 'TBP Sales');
    A.deepStrictEqual(t.st, ['Bước 1|2026-11-26|45']); A.strictEqual(String(t.dur), '45', 'thời lượng việc lấy tổng các bước');
    // Người dùng đã chọn ngày làm thì đổi hạn chót không ghi đè
    await page.click('#fab'); await page.click('[data-kind="adhoc"]');
    await page.fill('.modal [data-f="do_date"]', '2026-11-25'); await page.fill('.modal [data-f="due_date"]', '2026-12-04');
    A.strictEqual(await page.inputValue('.modal [data-f="do_date"]'), '2026-11-25');
    h.noErrors(page);
  });

  await h.test('6. Chen ngang 1h: quỹ Ad-hoc hôm nay giảm 60 phút', async () => {
    const page = await h.open({ w: 1280 });
    const left = () => page.evaluate(() => LP.logic.tasks.capacity('2026-11-25').work.left);
    const before = await left();
    await page.click('#fab'); await page.click('[data-kind="dotxuat"]');
    A.strictEqual(await page.locator('.modal-head h2').innerText(), 'Chen ngang');
    await page.click('#qa-save');   // chưa nhập tên
    A.ok(await page.locator('#qa-err').isVisible(), 'phải báo thiếu tên');
    await page.fill('.modal [data-f="title"]', 'Hỗ trợ sale thử');
    await page.locator('label:has([name="qa-dur"][value="60"])').click();
    await page.click('#qa-save'); await page.waitForTimeout(60);
    A.strictEqual(await left(), before - 60);
    const row = await page.evaluate(() => LP.store.get().interruptions.filter(i => i.title === 'Hỗ trợ sale thử')[0]);
    A.strictEqual(row.date, '2026-11-25'); A.strictEqual(+row.duration_min, 60);
    h.noErrors(page);
  });

  await h.test('7. 390px và 1280px: Daily, form, Cài đặt, form nút "+" không cuộn ngang, không lỗi JS', async () => {
    await h.checkScreen('mau');
    await h.checkScreen('mau', 'id=r-chiaso');
    await h.checkScreen('mau', 'id=new');
    await h.checkScreen('cai-dat');
    for (const [w, scheme] of [[390, 'light'], [1280, 'dark']]) {
      const page = await h.open({ w, scheme });
      for (const k of ['adhoc', 'canhan', 'ghichu', 'dotxuat']) {
        await page.evaluate(k => LP.quickAdd.open(k), k); await page.waitForTimeout(80);
        const o = await page.evaluate(() => { const m = document.querySelector('.modal'); return m ? [m.scrollWidth, m.clientWidth] : null; });
        A.ok(o && o[0] <= o[1] + 1, k + ' ' + w + 'px: form tràn ngang ' + JSON.stringify(o));
        await h.noOverflow(page);
        await page.evaluate(() => LP.ui.closeSheet());
      }
      await page.evaluate(() => LP.quickAdd.edit('task', 't-bcnguon')); await page.waitForTimeout(80);
      const o = await page.evaluate(() => { const m = document.querySelector('.modal'); return [m.scrollWidth, m.clientWidth]; });
      A.ok(o[0] <= o[1] + 1, 'form sửa ' + w + 'px tràn ngang ' + JSON.stringify(o));
      h.noErrors(page);
    }
  });

  await h.test('8. LP.quickAdd.edit: form sửa có sẵn dữ liệu, giữ bước con, đổi mục tiêu', async () => {
    const page = await h.open({ w: 1280 });
    await page.evaluate(() => LP.quickAdd.edit('task', 't-bcnguon')); await page.waitForTimeout(80);
    A.strictEqual(await page.locator('.modal-head h2').innerText(), 'Sửa Ad-hoc');
    A.strictEqual(await page.inputValue('.modal [data-f="title"]'), 'BC phân tích nguồn T11');
    A.strictEqual(await page.inputValue('.modal [data-f="due_time"]'), '15:00');
    A.strictEqual(await page.inputValue('.modal [data-f="goal_id"]'), 'g-powerbi');
    A.strictEqual(await page.locator('.qa-step').count(), 3);
    const before = await page.evaluate(() => LP.logic.tasks.stepsOf('t-bcnguon').map(s => s.id));
    await page.fill('.modal [data-f="title"]', 'BC nguồn T11 (sửa)');
    await page.selectOption('.modal [data-f="goal_id"]', 'g-dashboard');
    await page.locator('.qa-step').nth(2).locator('[data-act="del"]').click();
    await page.click('#qa-add-step'); await page.locator('.qa-step').last().locator('[data-f="s_title"]').fill('Bước mới');
    await page.click('#qa-save'); await page.waitForTimeout(80);
    const t = await page.evaluate(() => { const x = LP.store.find('Tasks', 't-bcnguon'); return { title: x.title, goal: x.goal_id, st: LP.logic.tasks.stepsOf(x.id).map(s => s.id + '|' + s.title) }; });
    A.strictEqual(t.title, 'BC nguồn T11 (sửa)'); A.strictEqual(t.goal, 'g-dashboard');
    A.strictEqual(t.st.length, 3); A.ok(t.st[0].startsWith(before[0]) && t.st[1].startsWith(before[1]), 'bước cũ phải giữ id');
    A.ok(t.st[2].endsWith('|Bước mới'));
    // Personal cũng sửa được, bỏ ngày làm thì thành chưa có ngày
    await page.evaluate(() => LP.quickAdd.edit('canhan', 't-baohiem')); await page.waitForTimeout(60);
    A.strictEqual(await page.locator('.modal-head h2').innerText(), 'Sửa Personal');
    await page.fill('.modal [data-f="do_date"]', ''); await page.click('#qa-save'); await page.waitForTimeout(60);
    A.strictEqual(await page.evaluate(() => LP.store.find('Tasks', 't-baohiem').do_date), '');
    h.noErrors(page);
  });

  await h.test('9. Nút "Hủy việc" trong form sửa; Khôi phục việc; việc hủy thoát khỏi tồn', async () => {
    const page = await h.open({ w: 1280 });
    await page.evaluate(() => LP.quickAdd.edit('task', 't-email')); await page.waitForTimeout(60);
    A.ok(await page.locator('#qa-cancel').isVisible(), 'phải có nút Hủy việc');
    await page.click('#qa-cancel'); await page.waitForTimeout(40);
    await page.click('[data-ans="1"]'); await page.waitForTimeout(60);
    A.strictEqual(await page.evaluate(() => LP.store.find('Tasks', 't-email').status), 'cancelled');
    A.ok(await page.evaluate(() => !LP.logic.tasks.leftoverTasks('2026-11-26').some(x => x.taskId === 't-email')), 'việc hủy vẫn còn trong tồn');
    await page.evaluate(() => LP.quickAdd.edit('task', 't-email')); await page.waitForTimeout(60);
    A.ok(await page.locator('#qa-uncancel').isVisible() && !(await page.locator('#qa-cancel').count()), 'phải có Khôi phục việc');
    await page.click('#qa-uncancel'); await page.waitForTimeout(60);
    A.strictEqual(await page.evaluate(() => LP.store.find('Tasks', 't-email').status), 'todo');
    // Việc đã xong thì không có nút Hủy
    await page.evaluate(() => LP.quickAdd.edit('task', 't-quy4')); await page.waitForTimeout(40);
    A.ok(await page.locator('#qa-cancel').count() === 1, 'việc chưa xong có nút Hủy');
    h.noErrors(page);
  });

  await h.test('10. P3-3: LP.quickAdd.open(kind, { title, doc_id, heading_id }) điền sẵn tên, tài liệu, mục', async () => {
    const page = await h.open({ w: 1280 });
    await page.evaluate(() => LP.quickAdd.open('adhoc', { title: 'Việc từ ghi chú', doc_id: 'd-chiaso', heading_id: 'h-chia' }));
    await page.waitForTimeout(150);
    A.strictEqual(await page.inputValue('.modal [data-f="title"]'), 'Việc từ ghi chú');
    A.strictEqual(await page.inputValue('.modal [data-f="doc_id"]'), 'd-chiaso');
    A.strictEqual(await page.inputValue('.modal [data-f="heading_id"]'), 'h-chia');
    await page.click('#qa-save'); await page.waitForTimeout(60);
    const t = await page.evaluate(() => { const x = LP.store.get().tasks.filter(t => t.title === 'Việc từ ghi chú')[0]; return x && [x.doc_id, x.heading_id, x.kind]; });
    A.deepStrictEqual(t, ['d-chiaso', 'h-chia', 'adhoc']);
    // Bôi đen ở màn Ghi chú rồi "Tạo việc" gọi đúng hàm này (Phần 3 đã nối sẵn)
    h.noErrors(page);
  });

  await h.test('11. P4-2: form Ad-hoc và Personal có ô chọn mục tiêu, lưu goal_id', async () => {
    const page = await h.open({ w: 1280 });
    for (const [kind, goal] of [['adhoc', 'g-powerbi'], ['canhan', 'g-sach']]) {
      await page.evaluate(k => LP.quickAdd.open(k), kind);
      A.ok(await page.locator('.modal [data-f="goal_id"]').isVisible(), kind + ': thiếu ô mục tiêu');
      A.ok((await page.locator('.modal [data-f="goal_id"] option').count()) >= 4, 'danh sách mục tiêu');
      await page.fill('.modal [data-f="title"]', 'Việc mục tiêu ' + kind);
      await page.selectOption('.modal [data-f="goal_id"]', goal);
      await page.click('#qa-save'); await page.waitForTimeout(60);
      const g = await page.evaluate(k => LP.store.get().tasks.filter(t => t.title === 'Việc mục tiêu ' + k)[0], kind);
      A.strictEqual(g.goal_id, goal); A.strictEqual(g.kind, kind);
    }
    // Mục tiêu hiện số việc
    A.ok(await page.evaluate(() => LP.store.get().tasks.some(t => t.goal_id === 'g-sach')));
    h.noErrors(page);
  });

  await h.test('12. Ghi chú nhanh: thêm một đoạn vào tài liệu "Ý tưởng", không tạo tài liệu mới', async () => {
    const page = await h.open({ w: 1280 });
    await page.click('#fab'); await page.click('[data-kind="ghichu"]');
    await page.click('#qa-save');
    A.ok(await page.locator('#qa-err').isVisible(), 'phải báo thiếu nội dung');
    await page.fill('#qa-text', 'Ý tưởng thử dòng 1\nDòng 2');
    await page.click('#qa-save'); await page.waitForTimeout(200);
    const r = await page.evaluate(async () => { const d = await LP.api.docGet('d-y-tuong'); const all = await LP.api.docsIndex(); return { c: d.content, n: all.length }; });
    A.ok(r.c.includes('Viết ý tưởng ở đây.') && r.c.includes('<p>Ý tưởng thử dòng 1</p><p>Dòng 2</p>'), 'nội dung: ' + r.c);
    A.strictEqual(r.n, 2, 'không được tạo tài liệu mới');
    // Bấm Mở trên thông báo thì mở tài liệu
    await page.click('.toast [data-t="act"]'); await page.waitForTimeout(150);
    A.ok((await page.locator('.gc-body').innerText()).includes('Ý tưởng thử dòng 1'), 'mở tài liệu');
    h.noErrors(page);
  });

  await h.test('13. Phím tắt n, d; không bắt phím khi đang gõ', async () => {
    const page = await h.open({ w: 1280 });
    await page.keyboard.press('n'); await page.waitForTimeout(60);
    A.strictEqual(await page.locator('.modal-head h2').innerText(), 'Thêm Ad-hoc');
    await page.keyboard.type('dn');   // đang gõ trong ô tên: không mở gì thêm
    A.strictEqual(await page.inputValue('.modal [data-f="title"]'), 'dn');
    A.strictEqual(await page.locator('.overlay').count(), 1);
    await page.keyboard.press('Escape'); await page.waitForTimeout(40);
    await page.keyboard.press('d'); await page.waitForTimeout(60);
    A.strictEqual(await page.locator('.modal-head h2').innerText(), 'Chen ngang');
    await page.keyboard.press('Escape');
    await page.keyboard.press('/'); await page.waitForTimeout(40);
    A.ok(await page.locator('.sr-input').isVisible(), '/ mở tìm kiếm');
    h.noErrors(page);
  });

  await h.test('14. Cài đặt: quỹ giờ, giờ làm, giao diện, hoa rơi, thông báo', async () => {
    const page = await h.open({ w: 1280, hash: CD });
    await page.fill('[data-set="quota_work"]', '240'); await page.dispatchEvent('[data-set="quota_work"]', 'change');
    await page.fill('[data-set="work_start"]', '08:30'); await page.dispatchEvent('[data-set="work_start"]', 'change');
    await page.fill('[data-set="evening_start"]', '19:30'); await page.dispatchEvent('[data-set="evening_start"]', 'change');
    A.ok((await page.locator('[data-read="quota_work"]').innerText()).includes('4h'));
    const t = await page.evaluate(() => ({ q: LP.logic.tasks.capacity('2026-11-25').work.quota, ws: LP.store.setting('work_start'), ev: LP.store.setting('evening_start') }));
    A.deepStrictEqual(t, { q: 240, ws: '08:30', ev: '19:30' });
    await page.locator('label:has([name="cd-theme"][value="dark"])').click();
    A.strictEqual(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark');
    await page.locator('label:has([name="cd-fall"][value="off"])').click();
    A.strictEqual(await page.evaluate(() => LP.flowers.getFall()), 'off');
    await page.locator('label:has([name="cd-fall"][value="system"])').click();
    A.strictEqual(await page.evaluate(() => LP.flowers.getFall()), 'system');
    await page.locator('label:has(#cd-notify)').click();
    A.strictEqual(await page.evaluate(() => LP.store.setting('notify')), '0');
    await page.click('#cd-ping'); await page.waitForTimeout(60);
    A.ok((await page.locator('#cd-ping-res').innerText()).length > 5);
    // Lưu rồi tải lại vẫn giữ
    await page.evaluate(() => LP.store.flush());
    await page.waitForFunction(() => LP.store.syncState().pending === 0);
    await page.waitForTimeout(150);
    await page.reload(); await page.waitForFunction(() => LP.ready === true);
    A.strictEqual(await page.evaluate(() => LP.store.setting('quota_work')), '240');
    h.noErrors(page);
  });

  await h.test('15. Sao lưu tải được file JSON; khôi phục từ file thêm lại dữ liệu', async () => {
    const page = await h.open({ w: 1280, hash: CD });
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('#cd-backup')]);
    A.ok(/life-planner-v2-sao-luu-2026-11-25\.json$/.test(dl.suggestedFilename()), dl.suggestedFilename());
    const text = await new Promise((res, rej) => { const chunks = []; dl.createReadStream().then(s => { s.on('data', c => chunks.push(c)); s.on('end', () => res(Buffer.concat(chunks).toString('utf8'))); s.on('error', rej); }, rej); });
    const j = JSON.parse(text);
    A.strictEqual(j.app, 'life-planner-v2'); A.ok(j.data.routines.length >= 4 && j.data.tasks.length >= 5 && j.docs.length === 2 && j.docs[0].content, 'thiếu dữ liệu trong file');
    // Khôi phục: file có thêm một mục tiêu mới và sửa tên một Daily
    j.data.goals.push({ id: 'g-khoiphuc', title: 'Mục tiêu khôi phục', group: 'ca_nhan', period_type: 'month', period_value: '2026-11', progress_mode: 'task', status: 'active', importance: 1 });
    j.data.routines[0].name = 'Tên đã khôi phục';
    await page.setInputFiles('#cd-restore-file', { name: 'sao-luu.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(j)) });
    await page.waitForSelector('[data-ans="1"]'); await page.click('[data-ans="1"]'); await page.waitForTimeout(400);
    const t = await page.evaluate(() => ({ g: LP.store.find('Goals', 'g-khoiphuc'), r: LP.store.get().routines.map(r => r.name) }));
    A.ok(t.g && t.g.title === 'Mục tiêu khôi phục', 'chưa khôi phục mục tiêu');
    A.ok(t.r.includes('Tên đã khôi phục'));
    // File sai thì báo, không đổi gì
    await page.setInputFiles('#cd-restore-file', { name: 'sai.json', mimeType: 'application/json', buffer: Buffer.from('{"a":1}') });
    await page.waitForTimeout(150);
    A.ok((await page.locator('.toast').innerText()).includes('không phải bản sao lưu'), 'phải báo file sai');
    h.noErrors(page);
  });

  await h.test('16. Thùng rác: việc đã hủy và tài liệu đã xóa khôi phục được', async () => {
    const page = await h.open({ w: 1280 });
    await page.evaluate(async () => { LP.logic.tasks.setCancelled(LP.store.find('Tasks', 't-kham'), true); await LP.api.docDelete('d-y-tuong'); await LP.store.flush(); });
    await page.evaluate(() => LP.router.go('cai-dat')); await page.waitForTimeout(60);
    await page.click('#cd-trash-toggle'); await page.waitForSelector('#cd-trash-tasks');
    A.ok((await page.locator('#cd-trash-tasks').innerText()).includes('Đặt lịch khám sức khỏe'), 'việc hủy');
    A.ok((await page.locator('#cd-trash-docs').innerText()).includes('Ý tưởng tháng 12'), 'tài liệu xóa');
    await page.locator('#cd-trash-tasks [data-restore]').first().click(); await page.waitForTimeout(60);
    A.strictEqual(await page.evaluate(() => LP.store.find('Tasks', 't-kham').status), 'todo');
    await page.locator('#cd-trash-docs [data-restore]').first().click(); await page.waitForTimeout(150);
    A.strictEqual(await page.evaluate(async () => (await LP.api.docsIndex()).filter(d => d.deleted === 'TRUE').length), 0);
    h.noErrors(page);
  });

  await h.test('17. Daily: đổi thứ tự hạng mục, tạm dừng, xóa; lịch sử giữ nguyên', async () => {
    const page = await h.open({ w: 1280, hash: MAU + '?id=r-baocao' });
    await page.locator('.mc-item').first().locator('[data-act="down"]').click();
    await page.click('#mc-save'); await page.waitForTimeout(80);
    const order = await page.evaluate(() => LP.logic.routines.itemsOf(LP.store.find('Routines', 'r-baocao'), '2026-11-26').map(i => i.title));
    A.deepStrictEqual(order, ['Gửi báo cáo ngày', 'Tổng hợp doanh số']);
    A.strictEqual(await page.evaluate(() => LP.store.get().routineItems.filter(i => i.routine_id === 'r-baocao').length), 2, 'chỉ đổi thứ tự thì không tạo hạng mục mới');
    await page.click('#mc-pause'); await page.waitForTimeout(80);
    A.ok(await page.evaluate(() => LP.logic.routines.runsFor('2026-11-26').every(r => r.routine.id !== 'r-baocao')), 'tạm dừng thì không có lượt');
    A.ok((await page.locator('.mc-row.is-on').innerText()).includes('Tạm dừng'));
    await page.click('#mc-del'); await page.click('[data-ans="1"]'); await page.waitForTimeout(80);
    A.ok(await page.evaluate(() => !LP.store.find('Routines', 'r-baocao')), 'xóa mẫu');
    // Bỏ một hạng mục: ngày cũ vẫn thấy
    await page.evaluate(() => LP.router.go('mau', { id: 'r-toi' })); await page.waitForTimeout(60);
    await page.locator('.mc-item').last().locator('[data-act="del"]').click();
    await page.click('#mc-save'); await page.waitForTimeout(80);
    const t = await page.evaluate(() => ({ d24: LP.logic.routines.itemsFor('2026-11-24').filter(m => m.routine.id === 'r-toi').length, d26: LP.logic.routines.itemsFor('2026-11-26').filter(m => m.routine.id === 'r-toi').length }));
    A.deepStrictEqual(t, { d24: 2, d26: 1 });
    h.noErrors(page);
  });

  await h.test('18. Kiểm hợp lệ: form Daily và form việc báo lỗi, không lưu', async () => {
    const page = await h.open({ w: 390, hash: MAU + '?id=new' });
    await page.click('#mc-save');
    A.ok((await page.locator('#mc-err').innerText()).includes('tên'), 'thiếu tên');
    await page.fill('#mc-name', 'Thử lỗi'); await page.click('#mc-save');
    A.ok((await page.locator('#mc-err').innerText()).includes('hạng mục'), 'thiếu hạng mục');
    await page.click('#mc-add-item'); await page.click('#mc-save');
    A.ok((await page.locator('#mc-err').innerText()).includes('chưa có tên'), 'hạng mục thiếu tên');
    A.strictEqual(await page.evaluate(() => LP.store.get().routines.filter(r => r.name === 'Thử lỗi').length), 0, 'không được lưu');
    await page.evaluate(() => LP.quickAdd.open('canhan'));
    await page.click('#qa-save');
    A.ok(await page.locator('#qa-err').isVisible(), 'việc thiếu tên');
    await page.fill('.modal [data-f="title"]', 'Việc Personal thử'); await page.fill('.modal [data-f="do_date"]', ''); await page.click('#qa-save'); await page.waitForTimeout(60);
    const t = await page.evaluate(() => LP.store.get().tasks.filter(t => t.title === 'Việc Personal thử')[0]);
    A.strictEqual(t.kind, 'canhan'); A.strictEqual(t.do_date, ''); A.strictEqual(t.due_date, '');
    h.noErrors(page);
  });
};

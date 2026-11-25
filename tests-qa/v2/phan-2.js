/* V2 · test Phần 2: Lịch tuần và tháng (theo "Tiêu chí hoàn thành" trong docs/v2/phan-2-lich.md). */
module.exports = async function (h) {
  const A = h.assert;
  const WEEK = '#/lich?view=tuan&date=2026-11-25';
  const MONTH = '#/lich?view=thang&date=2026-11-25';
  const col = (page, d) => page.locator('.lday[data-date="' + d + '"]');
  const doDate = (page, id) => page.evaluate(i => LP.store.find('Tasks', i).do_date, id);

  await h.test('1. Tuần 23–29/11: cột T6 có mốc "Hạn 15:00 · tên việc"', async () => {
    const page = await h.open({ w: 1280, hash: WEEK });
    // Mock chưa có giờ hạn: đặt giờ 15:00 như canvas (xem YEU-CAU-CHUNG #P2-1)
    await page.evaluate(() => { const t = LP.store.find('Tasks', 't-bcnguon'); LP.store.upsert('Tasks', Object.assign({}, t, { due_time: '15:00' })); });
    const txt = await col(page, '2026-11-27').locator('.ldue').allInnerTexts();
    A.ok(txt.some(x => /Hạn 15:00 · .*phân tích nguồn T11/.test(x)), 'mốc hạn: ' + txt.join('|'));
    A.strictEqual(await page.locator('.lday').count(), 8, 'cần 7 cột ngày + cột Chưa có ngày');
    h.noErrors(page);
  });

  await h.test('2. Kéo thẻ T4 sang T5: do_date đổi, Agenda T5 có việc, quỹ hai cột cập nhật', async () => {
    const page = await h.open({ w: 1280, hash: WEEK });
    const q = async d => page.evaluate(x => { const c = LP.logic.tasks.capacity(x); return c.evening.used; }, d);
    const [b4, b5] = [await q('2026-11-25'), await q('2026-11-26')];
    await col(page, '2026-11-25').locator('.lcard[data-task="t-kham"]').dragTo(col(page, '2026-11-26'));
    await page.waitForTimeout(150);
    A.strictEqual(await doDate(page, 't-kham'), '2026-11-26');
    const inAgenda = await page.evaluate(() => LP.logic.tasks.tasksFor('2026-11-26').some(x => x.task.id === 't-kham'));
    A.ok(inAgenda, 'Agenda T5 không có việc');
    A.strictEqual(await q('2026-11-25'), b4 - 20); A.strictEqual(await q('2026-11-26'), b5 + 20);
    A.ok(await col(page, '2026-11-26').locator('.lcard[data-task="t-kham"]').count(), 'thẻ chưa sang cột T5');
    const lbl = (await col(page, '2026-11-26').locator('.qbar').nth(1).innerText());
    A.ok(lbl.includes(String(b5 + 20) + '/'), 'thanh quỹ cột T5: ' + lbl);
    // Hoàn tác
    await page.locator('.toast [data-t="act"]').click();
    A.strictEqual(await doDate(page, 't-kham'), '2026-11-25');
    h.noErrors(page);
  });

  await h.test('3. Thả sau hạn chót thì hỏi xác nhận; ngày đã qua không nhận thả', async () => {
    const page = await h.open({ w: 1280, hash: WEEK });
    // t-kham hạn 26/11: thả vào T6 27/11 là trễ 1 ngày
    await col(page, '2026-11-25').locator('.lcard[data-task="t-kham"]').dragTo(col(page, '2026-11-27'));
    await page.waitForSelector('.modal');
    A.ok((await page.locator('.modal').innerText()).includes('trễ hạn 1 ngày'), 'thiếu câu xác nhận');
    A.strictEqual(await doDate(page, 't-kham'), '2026-11-25', 'đổi ngày trước khi xác nhận');
    await page.locator('.modal [data-ans="0"]').click();
    A.strictEqual(await doDate(page, 't-kham'), '2026-11-25');
    await page.locator('.lcard[data-task="t-kham"]').dragTo(col(page, '2026-11-27'));
    await page.locator('.modal [data-ans="1"]').click();
    await page.waitForTimeout(100);
    A.strictEqual(await doDate(page, 't-kham'), '2026-11-27');
    // Ngày đã qua (24/11): không nhận
    const card = page.locator('.lday[data-date="2026-11-27"] .lcard[data-task="t-kham"]');
    await card.dragTo(col(page, '2026-11-24'));
    await page.waitForTimeout(100);
    A.strictEqual(await doDate(page, 't-kham'), '2026-11-27', 'ngày làm bị đổi sang ngày đã qua (phải giữ nguyên)');
    h.noErrors(page);
  });

  await h.test('3b. Menu ⋯ "Chuyển sang ngày…" đổi được ngày (dùng cho bàn phím, điện thoại)', async () => {
    const page = await h.open({ w: 390, hash: WEEK });
    await page.locator('.lcard[data-task="t-baohiem"] [data-more]').click();
    await page.locator('[data-pick]').click();
    await page.fill('#lich-pick', '2026-11-29');
    await page.locator('[data-ok]').click();
    await page.waitForTimeout(100);
    A.strictEqual(await doDate(page, 't-baohiem'), '2026-11-29');
    h.noErrors(page);
  });

  await h.test('4. Lọc "Quan trọng trở lên": thẻ 1 trái tim mờ đi, thanh quỹ vẫn đủ', async () => {
    const page = await h.open({ w: 1280, hash: WEEK });
    const quotaBefore = await col(page, '2026-11-28').locator('.qbar').nth(1).innerText();
    await page.locator('.lich-filter').click();
    const low = page.locator('.lcard[data-task="t-baohiem"]'), high = page.locator('.lcard[data-task="t-kham"]');
    A.ok(await low.evaluate(e => e.classList.contains('dim')), 'thẻ 1 trái tim chưa mờ');
    A.ok(!(await high.evaluate(e => e.classList.contains('dim'))), 'thẻ 2 trái tim bị mờ');
    A.strictEqual(await col(page, '2026-11-28').locator('.qbar').nth(1).innerText(), quotaBefore);
  });

  await h.test('5. Tháng 11: "!" cho ngày sót, ✓ cho ngày đủ, "Nghỉ" cho ngày nghỉ', async () => {
    const page = await h.open({ w: 1280, hash: MONTH });
    const exp = await page.evaluate(() => {
      const first = LP.store.get().routineChecks.map(c => c.run_date).sort()[0], out = {};
      LP.date.range('2026-11-01', '2026-11-24').forEach(d => {
        if (d < first || !LP.date.isWorkday(d)) return;
        const s = LP.logic.routines.summary(d); if (s.total) out[d] = s.missed ? 'sot' : 'du';
      });
      return out;
    });
    const days = Object.keys(exp); A.ok(days.length > 5, 'quá ít ngày mock để kiểm: ' + days.length);
    A.ok(days.some(d => exp[d] === 'sot') && days.some(d => exp[d] === 'du'), 'mock cần cả ngày sót lẫn ngày đủ');
    for (const d of days) {
      const c = page.locator('.mcell[data-cell="' + d + '"] .mmark');
      A.ok(await c.evaluate((e, k) => e.classList.contains(k), exp[d]), d + ' phải là ' + exp[d]);
    }
    A.ok((await page.locator('.mcell[data-cell="2026-11-30"]').innerText()).includes('Nghỉ'), 'ngày nghỉ 30/11');
    A.ok(await page.locator('.mcell[data-cell="2026-11-27"] .mdot').count() >= 1, 'chấm hạn chót 27/11');
    A.ok(await page.locator('.mbar').count() > 0, 'thanh mẫu theo khoảng ngày');
    h.noErrors(page);
  });

  await h.test('6. Bấm ô ngày đã qua mở Agenda ngày đó; ngày tới mở Tuần chứa ngày đó', async () => {
    const page = await h.open({ w: 1280, hash: MONTH });
    await page.locator('.mcell[data-cell="2026-11-18"]').click();
    await page.waitForTimeout(100);
    A.ok(page.url().includes('#/agenda?date=2026-11-18'), page.url());
    await page.goto(page.url().split('#')[0] + '#/lich?view=thang&date=2026-11-25');
    await page.waitForSelector('.lmonth');
    await page.locator('.mcell[data-cell="2026-12-02"]').click();
    await page.waitForSelector('.lweek');
    A.ok((await page.locator('.lich-title').innerText()).includes('30/11'), 'tuần chứa 02/12');
  });

  await h.test('6b. Nhớ lựa chọn Tuần/Tháng lần cuối', async () => {
    const page = await h.open({ w: 1280, hash: '#/lich' });
    await page.locator('[data-view="thang"]').click();
    await page.goto(page.url().split('#')[0] + '#/agenda'); await page.waitForTimeout(100);
    await page.goto(page.url().split('#')[0] + '#/lich');
    await page.waitForSelector('.lich-seg');
    A.ok(await page.locator('.lmonth').count() === 1, 'không nhớ chế độ Tháng');
  });

  await h.test('7. Không cuộn ngang, không lỗi JS ở 1280, 1024, 390 (tuần và tháng, sáng và tối)', async () => {
    await h.checkScreen('lich', 'view=tuan&date=2026-11-25');
    await h.checkScreen('lich', 'view=thang&date=2026-11-25');
    for (const hash of [WEEK, MONTH]) {
      const page = await h.open({ w: 1024, h: 768, hash });
      await h.noOverflow(page); h.noErrors(page);
    }
  });
};

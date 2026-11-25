/* V2 · test Phần 4: Mục tiêu, Thói quen, Tổng kết (theo "Tiêu chí hoàn thành" trong docs/v2/phan-4-muc-tieu-tong-ket.md). */
module.exports = async function (h) {
  const A = h.assert;
  const TK = '#/tong-ket', MT = '#/muc-tieu', TQ = '#/muc-tieu?tab=thoi-quen';
  const unit = async (page, u) => { await page.click('[data-unit="' + u + '"]'); await page.waitForTimeout(80); };
  const tile = (page, k) => page.locator('.mt-tile[data-k="' + k + '"]').getAttribute('data-val');

  await h.test('1. Đổi kỳ Tuần/Tháng/Quý/Năm: trục biểu đồ đổi ngày ↔ tháng, 4 ô chỉ số đổi', async () => {
    const page = await h.open({ w: 1280, hash: TK });
    const expect = { week: ['ngay', 7], month: ['ngay', 30], quarter: ['thang', 3], year: ['thang', 12] };
    const seen = {};
    for (const u of Object.keys(expect)) {
      await unit(page, u);
      const c = page.locator('.mt-chart');
      A.strictEqual(await c.getAttribute('data-axis'), expect[u][0], u + ': trục');
      A.strictEqual(+(await c.getAttribute('data-n')), expect[u][1], u + ': số cột');
      A.strictEqual(await page.locator('.mt-tile').count(), 4, u + ': số ô');
      seen[u] = await page.locator('.mt-tiles').innerText();
    }
    A.notStrictEqual(seen.week, seen.year, '4 ô không đổi khi đổi kỳ');
    // ‹ › lùi kỳ, kỳ hiện tại không tiến được
    await unit(page, 'month');
    A.ok(await page.locator('.mt-next').isDisabled(), 'nút › phải khóa ở kỳ hiện tại');
    const before = await page.locator('.mt-plabel').innerText();
    await page.click('[data-nav="-1"]');
    A.notStrictEqual(await page.locator('.mt-plabel').innerText(), before);
    A.ok(!(await page.locator('.mt-next').isDisabled()), 'nút › phải mở khi đã lùi');
    // Nhớ kỳ lần cuối
    await unit(page, 'quarter');
    await page.reload(); await page.waitForFunction(() => LP.ready === true);
    A.strictEqual(await page.locator('.mt-switch [aria-pressed="true"]').innerText(), 'Quý', 'không nhớ kỳ cuối');
    h.noErrors(page);
  });

  await h.test('2. 4 ô chỉ số khớp LP.stats cho cùng kỳ (Tuần/Tháng/Quý/Năm, cả kỳ trước)', async () => {
    const page = await h.open({ w: 1280, hash: TK });
    for (const u of ['week', 'month', 'quarter', 'year']) {
      await unit(page, u);
      for (const back of [0, 1]) {
        if (back) await page.click('[data-nav="-1"]');
        const got = { pct: await tile(page, 'pct'), missed: await tile(page, 'missed'), adhoc: await tile(page, 'adhoc'), int: await tile(page, 'int') };
        const want = await page.evaluate(() => {
          const r = LP.tongKet.range(LP.tongKet.state().unit, LP.tongKet.state().anchor), S = LP.stats;
          const c = S.completion(r.from, r.to, 'week'), sum = k => c.reduce((a, b) => a + b[k], 0);
          const ad = S.adhocStatus(r.from, r.to), ib = S.interruptions(r.from, r.to, 'month');
          const today = LP.date.today(), last = r.to < today ? r.to : today;
          const wd = last >= r.from ? LP.date.range(r.from, last).filter(LP.date.isWorkday).length : 0;
          const min = ib.reduce((a, b) => a + b.minutes, 0);
          return { pct: sum('total') ? String(Math.round(sum('done') * 100 / sum('total'))) : '', missed: String(sum('missed')), adhoc: ad.done + '/' + ad.total, int: wd ? String(Math.round(min / wd)) : '' };
        });
        A.deepStrictEqual(got, want, u + (back ? ' (kỳ trước)' : '') + ': ' + JSON.stringify(got) + ' ≠ ' + JSON.stringify(want));
      }
      await page.evaluate(() => LP.router.go('tong-ket')); await page.waitForTimeout(50);
    }
    h.noErrors(page);
  });

  await h.test('3. Biểu đồ vòng: đúng hạn + trễ + còn mở = số việc Ad-hoc có hạn trong kỳ', async () => {
    const page = await h.open({ w: 1280, hash: TK });
    for (const u of ['month', 'quarter', 'year']) {
      await unit(page, u);
      const parts = await page.locator('.mt-dleg .mt-dn').allInnerTexts();
      const total = await page.evaluate(() => { const r = LP.tongKet.range(LP.tongKet.state().unit, LP.tongKet.state().anchor); return LP.stats.adhocStatus(r.from, r.to); });
      A.strictEqual(parts.length, 3, u + ': thiếu phần');
      const sum = parts.reduce((a, b) => a + (+b), 0);
      A.ok(total.total > 0, u + ': mock phải có việc có hạn');
      A.strictEqual(sum, total.total, u + ': ' + parts.join('+') + ' ≠ ' + total.total);
      A.deepStrictEqual(parts.map(Number), [total.done, total.doneLate + total.overdue, total.doing], u + ': từng phần');
    }
    // Bấm một phần mở tấm trượt
    await page.click('.mt-dleg button[data-seg="dung"]');
    await page.waitForSelector('.modal');
    h.noErrors(page);
  });

  await h.test('4. Lưu 3 câu nhìn lại của tháng 11, đổi kỳ rồi quay lại vẫn còn', async () => {
    const page = await h.open({ w: 1280, hash: TK });
    await unit(page, 'month');
    await page.fill('.mt-review [name=good]', 'Chốt số đúng hạn');
    await page.fill('.mt-review [name=bad]', 'Quên báo cáo cuối ngày');
    await page.fill('.mt-review [name=next]', 'Soát cuối ngày mỗi chiều');
    await page.click('.mt-review button[type=submit]');
    await page.waitForTimeout(80);
    await unit(page, 'year'); await unit(page, 'month');
    A.strictEqual(await page.inputValue('.mt-review [name=good]'), 'Chốt số đúng hạn');
    await page.click('[data-nav="-1"]'); await page.click('.mt-nav [data-nav="1"]');
    A.strictEqual(await page.inputValue('.mt-review [name=bad]'), 'Quên báo cáo cuối ngày');
    const row = await page.evaluate(() => LP.store.get().reviews.filter(r => r.period_type === 'month' && r.period_value === '2026-11').map(r => r.next));
    A.deepStrictEqual(row, ['Soát cuối ngày mỗi chiều'], 'Reviews sai: ' + JSON.stringify(row));
    // Tải lại trang (mock lưu trên trình duyệt) vẫn còn
    await page.evaluate(() => LP.store.flush());
    await page.reload(); await page.waitForFunction(() => LP.ready === true);
    A.strictEqual(await page.inputValue('.mt-review [name=next]'), 'Soát cuối ngày mỗi chiều');
    h.noErrors(page);
  });

  await h.test('5. Thẻ mục tiêu: tiến độ theo việc khớp số việc xong / tổng; theo số nhập tay khớp thực tế / target', async () => {
    const page = await h.open({ w: 1280, hash: MT });
    await page.evaluate(() => {
      const base = { kind: 'adhoc', importance: 2, goal_id: 'g-powerbi' };
      LP.store.upsert('Tasks', Object.assign({ title: 'Việc PB 1', status: 'done', done_at: '2026-11-20 10:00', due_date: '2026-11-21' }, base));
      LP.store.upsert('Tasks', Object.assign({ title: 'Việc PB 2', status: 'cancelled' }, base));
      LP.store.upsert('Tasks', Object.assign({ title: 'Việc PB 3', status: 'todo', due_date: '2026-12-01' }, base));
    });
    await page.waitForTimeout(80);
    const want = await page.evaluate(() => { const ts = LP.store.get().tasks.filter(t => t.goal_id === 'g-powerbi' && t.status !== 'cancelled'); return [ts.filter(t => t.status === 'done').length, ts.length]; });
    A.ok(want[1] >= 3, 'cần ≥ 3 việc, có ' + want[1]);
    const card = page.locator('.mt-goal[data-goal="g-powerbi"]');
    A.strictEqual(await card.locator('.mt-gcount .num').innerText(), want[0] + '/' + want[1]);
    A.strictEqual(+(await card.getAttribute('data-pct')), Math.round(want[0] * 100 / want[1]));
    A.strictEqual(await page.locator('.mt-goal[data-goal="g-dashboard"] .mt-gcount').innerText(), '2/3 dashboard');
    A.strictEqual(await page.locator('.mt-goal[data-goal="g-dashboard"]').getAttribute('data-pct'), '67');
    // Lọc theo kỳ và nhóm
    await page.click('[data-period="month"]');
    A.strictEqual(await page.locator('.mt-goal').count(), 1);
    await page.click('[data-period=""]'); await page.click('[data-group="cong_viec"]');
    A.strictEqual(await page.locator('.mt-goal').count(), 2);
    h.noErrors(page);
  });

  await h.test('5b. Thêm, sửa, xóa mềm mục tiêu', async () => {
    const page = await h.open({ w: 1280, hash: MT });
    await page.click('[data-add]');
    await page.fill('.mt-form [name=title]', 'Chạy 50 km');
    await page.click('.mt-form label:has(input[name=mode][value=number])');
    await page.fill('.mt-form [name=target]', '50'); await page.fill('.mt-form [name=actual]', '10'); await page.fill('.mt-form [name=unit]', 'km');
    await page.click('.mt-form button[type=submit]');
    const g = page.locator('.mt-goal', { hasText: 'Chạy 50 km' });
    A.strictEqual(await g.locator('.mt-gcount').innerText(), '10/50 km');
    await g.click(); await page.fill('.mt-form [name=actual]', '45'); await page.click('.mt-form button[type=submit]');
    A.strictEqual(await page.locator('.mt-goal', { hasText: 'Chạy 50 km' }).getAttribute('data-pct'), '90');
    await page.locator('.mt-goal', { hasText: 'Chạy 50 km' }).click();
    await page.click('.mt-form [data-del]'); await page.click('.modal [data-ans="1"]');
    await page.waitForTimeout(80);
    A.strictEqual(await page.locator('.mt-goal', { hasText: 'Chạy 50 km' }).count(), 0);
    h.noErrors(page);
  });

  await h.test('6. Thói quen: tick hôm nay tăng chuỗi 1; vòng tiến độ ở Tổng kết cập nhật', async () => {
    const page = await h.open({ w: 1280, hash: TQ });
    const card = page.locator('.mt-habit[data-habit="h-chay"]');
    const s0 = +(await card.locator('.mt-streak').getAttribute('data-streak'));
    const st0 = await page.evaluate(() => LP.stats.streak(LP.store.get().habits.find(x => x.id === 'h-chay'), LP.date.today()));
    A.strictEqual(s0, st0, 'chuỗi hiển thị ≠ LP.stats');
    const before = await page.evaluate(() => LP.stats.habits('2026-11-01', '2026-11-30').find(x => x.habit.id === 'h-chay').done);
    await page.click('.mt-habit[data-habit="h-chay"] [data-tick="2026-11-25"]');
    await page.waitForTimeout(80);
    A.strictEqual(+(await page.locator('.mt-habit[data-habit="h-chay"] .mt-streak').getAttribute('data-streak')), s0 + 1, 'chuỗi không tăng 1');
    A.strictEqual(await page.locator('.mt-habit[data-habit="h-chay"] [data-tick="2026-11-25"]').getAttribute('aria-pressed'), 'true');
    await page.evaluate(() => LP.router.go('tong-ket')); await page.waitForTimeout(80);
    await unit(page, 'month');
    const txt = await page.locator('.mt-habs button[data-id="h-chay"] .mt-hdone').innerText();
    A.strictEqual(+txt.split('/')[0], before + 1, 'vòng: ' + txt + ', trước ' + before);
    // Bỏ tick thì về như cũ
    await page.evaluate(() => LP.router.go('muc-tieu', { tab: 'thoi-quen' })); await page.waitForTimeout(60);
    await page.click('.mt-habit[data-habit="h-chay"] [data-tick="2026-11-25"]');
    A.strictEqual(+(await page.locator('.mt-habit[data-habit="h-chay"] .mt-streak').getAttribute('data-streak')), s0);
    h.noErrors(page);
  });

  await h.test('6b. Thêm, sửa, xóa thói quen', async () => {
    const page = await h.open({ w: 1280, hash: TQ });
    await page.click('[data-add]');
    await page.fill('.mt-form [name=name]', 'Giãn cơ'); await page.fill('.mt-form [name=time]', '07:30');
    await page.click('.mt-form button[type=submit]');
    const c = page.locator('.mt-habit', { hasText: 'Giãn cơ' });
    A.ok((await c.innerText()).includes('07:30') && (await c.innerText()).includes('Mỗi ngày'));
    await c.locator('[data-edit]').click(); await page.click('.mt-form label:has(input[name=wd][value="7"])'); await page.click('.mt-form button[type=submit]');
    A.ok((await page.locator('.mt-habit', { hasText: 'Giãn cơ' }).innerText()).includes('T2 T3 T4 T5 T6 T7'));
    await page.locator('.mt-habit', { hasText: 'Giãn cơ' }).locator('[data-del]').click(); await page.click('.modal [data-ans="1"]');
    await page.waitForTimeout(60);
    A.strictEqual(await page.locator('.mt-habit', { hasText: 'Giãn cơ' }).count(), 0);
    h.noErrors(page);
  });

  await h.test('6c. Bấm cột và dòng mở tấm trượt chi tiết', async () => {
    const page = await h.open({ w: 1280, hash: TK });
    await page.locator('.mt-col').nth(2).click(); await page.waitForSelector('.modal'); await page.keyboard.press('Escape');
    if (await page.locator('[data-miss]').count()) { await page.locator('[data-miss]').first().click(); await page.waitForSelector('.modal'); await page.keyboard.press('Escape'); }
    await page.locator('[data-lvl]').first().click(); await page.waitForSelector('.modal'); await page.keyboard.press('Escape');
    if (await page.locator('[data-int]').count()) { await page.locator('[data-int]').first().click(); await page.waitForSelector('.modal'); await page.keyboard.press('Escape'); }
    await page.locator('[data-hab]').first().click(); await page.waitForSelector('.modal');
    h.noErrors(page);
  });

  await h.test('6d. Tên gọi theo mục 6b: Daily, Ad-hoc, Chen ngang; không có "Đột xuất"', async () => {
    const page = await h.open({ w: 1280, hash: TK });
    const t = await page.locator('.mt-tk').innerText();
    A.ok(/Ad-hoc/.test(t) && /Daily/.test(t) && /Chen ngang/.test(t), 'thiếu tên gọi');
    A.ok(!/Đột xuất/i.test(t), 'còn chữ Đột xuất');
  });

  await h.test('7. 390px và 1280px, sáng và tối: không cuộn ngang, không lỗi JS (Mục tiêu, Thói quen, Tổng kết)', async () => {
    await h.checkScreen('muc-tieu');
    await h.checkScreen('muc-tieu', 'tab=thoi-quen');
    await h.checkScreen('tong-ket');
    for (const [w, scheme] of [[390, 'light'], [390, 'dark'], [1280, 'dark']]) {
      const page = await h.open({ w, scheme, hash: TK });
      for (const u of ['week', 'quarter', 'year', 'month']) { await unit(page, u); await h.noOverflow(page); }
      h.noErrors(page);
    }
  });
};

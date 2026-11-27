/* V2 · test Phần 2: Lịch tuần và tháng (theo "Tiêu chí hoàn thành" trong docs/v2/phan-2-lich.md). */
module.exports = async function (h) {
  const A = h.assert;
  const WEEK = '#/lich?view=tuan&date=2026-11-25';
  const MONTH = '#/lich?view=thang&date=2026-11-25';
  const col = (page, d) => page.locator('.lcol[data-date="' + d + '"]');
  const setTimes = (page, list) => page.evaluate(l => l.forEach(([id, d, t, m, sid]) => { const tk = LP.store.find('Tasks', id); if (sid) { const st = LP.store.find('TaskSteps', sid); LP.store.upsert('TaskSteps', Object.assign({}, st, { do_date: d, do_time: t, duration_min: m })); } else LP.store.upsert('Tasks', Object.assign({}, tk, { do_date: d, do_time: t, duration_min: m })); }), list);
  // Kéo bằng chuột thật. dst có thể là locator; off = vị trí trong dst (mặc định giữa)
  const drag = async (page, src, dst, off) => {
    const a = await page.locator(src).first().boundingBox(), b = await dst.boundingBox();
    const ex = b.x + (off ? off.x : b.width / 2), ey = b.y + (off ? off.y : b.height / 2);
    await page.mouse.move(a.x + 12, a.y + 8); await page.mouse.down();
    await page.mouse.move(a.x + 30, a.y + 40, { steps: 4 }); await page.mouse.move(ex, ey, { steps: 8 });
    await page.mouse.move(ex + 1, ey + 1); await page.mouse.up(); await page.waitForTimeout(150);
  };
  const doDate = (page, id) => page.evaluate(i => LP.store.find('Tasks', i).do_date, id);

  await h.test('1. Tuần 23–29/11: cột T6 có mốc "Hạn 15:00 · tên việc"', async () => {
    const page = await h.open({ w: 1280, h: 1600, hash: WEEK });
    // Mock chưa có giờ hạn: đặt giờ 15:00 như canvas (xem YEU-CAU-CHUNG #P2-1)
    await page.evaluate(() => { const t = LP.store.find('Tasks', 't-bcnguon'); LP.store.upsert('Tasks', Object.assign({}, t, { due_time: '15:00' })); });
    const txt = await page.locator('.lcol[data-date="2026-11-27"] .ldue-blk').allInnerTexts();   // có giờ hạn thì nằm đúng khung giờ, không ở Cả ngày
    A.ok(txt.some(x => /Hạn 15:00 · .*phân tích nguồn T11/.test(x)), 'mốc hạn: ' + txt.join('|'));
    A.strictEqual(await page.locator('.lcol').count(), 7, 'cần 7 cột ngày');
    A.strictEqual(await page.locator('.lday-un').count(), 1, 'cần dải Chưa có ngày');
    h.noErrors(page);
  });

  await h.test('2. Kéo thẻ T4 sang T5: do_date đổi, Agenda T5 có việc, quỹ hai cột cập nhật', async () => {
    const page = await h.open({ w: 1280, h: 1600, hash: WEEK });
    const q = async d => page.evaluate(x => { const c = LP.logic.tasks.capacity(x); return c.evening.used; }, d);
    const [b4, b5] = [await q('2026-11-25'), await q('2026-11-26')];
    await drag(page, '.lblk[data-task="t-kham"]', col(page, '2026-11-26'));
    await page.waitForTimeout(150);
    A.strictEqual(await doDate(page, 't-kham'), '2026-11-26');
    const inAgenda = await page.evaluate(() => LP.logic.tasks.tasksFor('2026-11-26').some(x => x.task.id === 't-kham'));
    A.ok(inAgenda, 'Agenda T5 không có việc');
    A.strictEqual(await q('2026-11-25'), b4 - 20); A.strictEqual(await q('2026-11-26'), b5 + 20);
    A.ok(await col(page, '2026-11-26').locator('.lblk[data-task="t-kham"]').count(), 'khối chưa sang cột T5');
    // Hoàn tác
    await page.locator('.toast [data-t="act"]').click();
    A.strictEqual(await doDate(page, 't-kham'), '2026-11-25');
    h.noErrors(page);
  });

  await h.test('3. Thả sau hạn chót thì hỏi xác nhận; ngày đã qua không nhận thả', async () => {
    const page = await h.open({ w: 1280, h: 1600, hash: WEEK });
    // t-kham hạn 26/11: thả vào T6 27/11 là trễ 1 ngày
    await drag(page, '.lblk[data-task="t-kham"]', col(page, '2026-11-27'));
    await page.waitForSelector('.modal');
    A.ok((await page.locator('.modal').innerText()).includes('trễ hạn 1 ngày'), 'thiếu câu xác nhận');
    A.strictEqual(await doDate(page, 't-kham'), '2026-11-25', 'đổi ngày trước khi xác nhận');
    await page.locator('.modal [data-ans="0"]').click();
    A.strictEqual(await doDate(page, 't-kham'), '2026-11-25');
    await drag(page, '.lblk[data-task="t-kham"]', col(page, '2026-11-27'));
    await page.locator('.modal [data-ans="1"]').click();
    await page.waitForTimeout(100);
    A.strictEqual(await doDate(page, 't-kham'), '2026-11-27');
    // Ngày đã qua (24/11): không nhận
    await drag(page, '.lblk[data-task="t-kham"]', col(page, '2026-11-24'));
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
    const page = await h.open({ w: 1280, h: 1600, hash: WEEK });
    const q = () => page.evaluate(() => LP.logic.tasks.capacity('2026-11-28').evening.used);
    const quotaBefore = await q();
    A.strictEqual(await page.locator('.lhead .qbar, .lhead .lday-fixed').count(), 0, 'đầu cột không còn thanh quỹ/cố định');
    await page.locator('[data-imp]').click();
    A.strictEqual(await page.locator('[data-imp]').getAttribute('aria-pressed'), 'true');
    const low = page.locator('.lblk[data-task="t-baohiem"]'), high = page.locator('.lblk[data-task="t-kham"]');
    A.ok(await low.evaluate(e => e.classList.contains('dim')), 'thẻ 1 trái tim chưa mờ');
    A.ok(!(await high.evaluate(e => e.classList.contains('dim'))), 'thẻ 2 trái tim bị mờ');
    A.strictEqual(await q(), quotaBefore);
  });

  await h.test('G1. Lưới giờ: mục nằm đúng giờ, cao theo thời lượng, trùng giờ thì đứng cạnh nhau', async () => {
    const page = await h.open({ w: 1280, h: 1600, hash: WEEK });
    await setTimes(page, [['t-kham', '2026-11-25', '14:00', 60], ['t-bcnguon', '2026-11-25', '14:00', 45, 'st-t-bcnguon-1'], ['t-baohiem', '2026-11-28', '13:00', 90]]);
    const box = async sel => page.locator(sel).evaluate(e => { const r = e.getBoundingClientRect(), c = e.parentElement.getBoundingClientRect(); return { top: r.top - c.top, h: r.height, left: r.left - c.left, w: r.width, cw: c.width }; });
    const a = await box('.lblk[data-task="t-baohiem"]');
    A.ok(Math.abs(a.top - (7 * 60 / 30 * 36)) <= 2, '13:00 phải ở y=504, có ' + a.top);
    const k = await box('.lblk[data-task="t-kham"]'), b = await box('.lblk[data-step="st-t-bcnguon-1"]');
    A.ok(Math.abs(k.top - b.top) <= 1 && Math.abs(k.top - (8 * 60 / 30 * 36)) <= 2, 'hai mục trùng 14:00 phải cùng top (y=576), có ' + k.top + ' / ' + b.top);
    A.ok(Math.abs(Math.abs(k.left - b.left) - k.cw / 2) <= 2 && k.w < k.cw * 0.55 && b.w < b.cw * 0.55, 'phải chia đôi bề ngang cột, đứng cạnh nhau');
    h.noErrors(page);
  });

  await h.test('G2. Hạng mục cố định hiện theo giờ; việc chưa có giờ nằm ở dải Cả ngày', async () => {
    const page = await h.open({ w: 1280, h: 1600, hash: WEEK });
    const fx = col(page, '2026-11-25').locator('.lblk.fixed', { hasText: 'Lấy số liệu từ LMS' });
    A.strictEqual(await fx.count(), 1, 'thiếu hạng mục 08:00');
    const top = await fx.evaluate(e => e.offsetTop);
    A.ok(Math.abs(top - 144) <= 2, '08:00 phải ở y=144, có ' + top);
    A.ok(await page.locator('.lallday[data-date="2026-11-25"] .lblk[data-task="t-kham"]').count() === 1, 't-kham chưa có giờ phải ở Cả ngày');
    A.strictEqual(await col(page, '2026-11-25').locator('.lblk[data-task="t-kham"]').count(), 0);
  });

  await h.test('G3. Thả vào ô giờ đặt luôn ngày và giờ; thả vào Cả ngày thì bỏ giờ; thả sau hạn chót vẫn hỏi', async () => {
    const page = await h.open({ w: 1280, h: 1600, hash: WEEK });
    const colBox = await col(page, '2026-11-26').boundingBox();
    // 14:00 = hàng thứ 16, giữa hàng ở y = 16 * 36 + 18
    await drag(page, '.lblk[data-task="t-kham"]', col(page, '2026-11-26'), { x: 40, y: 16 * 36 + 18 });
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => { const t = LP.store.find('Tasks', 't-kham'); return [t.do_date, t.do_time]; });
    A.deepStrictEqual(r, ['2026-11-26', '14:00']);
    await drag(page, '.lblk[data-task="t-kham"]', page.locator('.lallday[data-date="2026-11-26"]'));
    await page.waitForTimeout(150);
    const r2 = await page.evaluate(() => { const t = LP.store.find('Tasks', 't-kham'); return [t.do_date, t.do_time]; });
    A.deepStrictEqual(r2, ['2026-11-26', '']);
    A.ok(colBox.height > 400, 'cột giờ phải cao');
    h.noErrors(page);
  });

  await h.test('G4. Vạch "Bây giờ" chỉ ở cột hôm nay, đúng 11:05', async () => {
    const page = await h.open({ w: 1280, h: 1600, hash: WEEK });
    A.strictEqual(await page.locator('.lnow').count(), 1);
    A.strictEqual(await col(page, '2026-11-25').locator('.lnow').count(), 1);
    const top = await page.locator('.lnow').evaluate(e => e.offsetTop);
    A.ok(Math.abs(top - ((11 * 60 + 5 - 360) / 30 * 36)) <= 2, '11:05 phải ở y=' + ((11 * 60 + 5 - 360) / 30 * 36) + ', có ' + top);
  });

  await h.test('G6. Mục chỉ còn chữ: không nền, không viền, không trái tim/đồng hồ; hạn chót chữ đỏ; xong gạch ngang', async () => {
    const page = await h.open({ w: 1280, h: 1600, hash: WEEK });
    await setTimes(page, [['t-kham', '2026-11-25', '14:00', 30]]);
    await page.evaluate(() => LP.logic.tasks.setDone(LP.store.find('Tasks', 't-kham'), true));
    const r = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll('.lgrid .lblk').forEach(e => {
        const c = getComputedStyle(e);
        if (c.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(c.borderLeftWidth) > 0 || e.querySelector('.icon,.hearts,.urg')) bad.push(e.textContent.slice(0, 20));
      });
      const due = document.querySelector('.ldue'), dc = getComputedStyle(due);
      const done = getComputedStyle(document.querySelector('.lblk[data-task="t-kham"]'));
      return { bad, dueBg: dc.backgroundColor, dueColor: dc.color, line: done.textDecorationLine, due: due.textContent };
    });
    A.deepStrictEqual(r.bad, [], 'còn ô trang trí: ' + r.bad);
    A.strictEqual(r.dueBg, 'rgba(0, 0, 0, 0)'); A.ok(r.dueColor !== 'rgb(0, 0, 0)' && /^rgb\(1[5-9]\d|^rgb\(2/.test(r.dueColor), 'hạn chót phải chữ đỏ: ' + r.dueColor);
    A.strictEqual(r.line, 'line-through');
    // Bấm vào dòng chữ mở form sửa việc
    await page.evaluate(() => LP.logic.tasks.setDone(LP.store.find('Tasks', 't-kham'), false));
    await page.locator('.lblk[data-task="t-kham"]').click();
    A.ok(await page.locator('#qa-form').count() === 1, 'không mở form sửa');
    A.strictEqual(await page.locator('#qa-title').inputValue(), 'Đặt lịch khám sức khỏe');
  });

  await h.test('G5. Lưới giờ 06:00–22:00 (32 hàng 30 phút)', async () => {
    const page = await h.open({ w: 1280, h: 1600, hash: WEEK });
    const hh = await col(page, '2026-11-25').evaluate(e => e.offsetHeight);
    A.strictEqual(hh, 32 * 36);
    const labels = await page.locator('.lgut span').allInnerTexts();
    A.strictEqual(labels[0], '06:00'); A.strictEqual(labels[labels.length - 1], '21:00');
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
    // Bấm ô ngày mở ô nổi liệt kê việc, không nhảy thẳng; có nút Mở Agenda và Xem tuần này
    await page.locator('.mcell[data-cell="2026-11-18"]').click();
    await page.waitForSelector('.modal');
    A.ok(page.url().includes('view=thang'), 'không được nhảy khỏi lịch tháng: ' + page.url());
    await page.locator('[data-agenda-day]').click();
    await page.waitForTimeout(100);
    A.ok(page.url().includes('#/agenda?date=2026-11-18'), page.url());
    await page.goto(page.url().split('#')[0] + '#/lich?view=thang&date=2026-11-25');
    await page.waitForSelector('.lmonth');
    await page.locator('.mcell[data-cell="2026-12-02"]').click();
    await page.locator('[data-week]').click();
    await page.waitForSelector('.lgrid');
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

  await h.test('8. Tên gọi theo mục 6b: Daily, Ad-hoc, Personal, Quỹ; không còn "Cố định", "Đột xuất", "Việc" đứng một mình', async () => {
    for (const w of [390, 1280]) {
      const page = await h.open({ w, hash: WEEK });
      await page.waitForTimeout(100);
      let txt = await page.locator('#view').innerText();
      await page.locator('[data-view="thang"]').click();
      txt += '\n' + await page.locator('#view').innerText();
      A.ok(!/Cố định|Đột xuất/.test(txt), 'còn tên cũ: ' + (txt.match(/Cố định|Đột xuất/) || [''])[0]);
      A.ok(!/(^|\n)\s*(Việc|Cá nhân)\s*$/m.test(txt), 'còn nhãn "Việc"/"Cá nhân" đứng một mình');
      if (w === 390) {
        const p2 = await h.open({ w, hash: WEEK }); const t2 = await p2.locator('#view').innerText();
        A.ok(/Daily: \d/.test(t2) && /Quỹ Ad-hoc/.test(t2) && /Quỹ Personal/.test(t2), 'thiếu Daily / Quỹ Ad-hoc / Quỹ Personal ở danh sách điện thoại');
      }
    }
    const page = await h.open({ w: 1280, h: 1600, hash: WEEK });
    await page.evaluate(() => { const t = LP.store.find('Tasks', 't-baohiem'); LP.store.upsert('Tasks', Object.assign({}, t, { due_date: '2026-11-27' })); });
    await drag(page, '.lblk[data-task="t-baohiem"]', col(page, '2026-11-29'));
    A.ok((await page.locator('.modal').innerText()).includes('Personal này sẽ trễ hạn'), 'hộp xác nhận phải gọi đúng loại');
  });

  await h.test('7. Không cuộn ngang, không lỗi JS ở 1280, 1024, 390 (tuần và tháng, sáng và tối)', async () => {
    await h.checkScreen('lich', 'view=tuan&date=2026-11-25');
    await h.checkScreen('lich', 'view=thang&date=2026-11-25');
    for (const hash of [WEEK, MONTH]) {
      const page = await h.open({ w: 1024, h: 768, hash });
      await h.noOverflow(page); h.noErrors(page);
    }
  });

  await h.test('Đợt 2 · Vạch thời lượng: việc 120 phút cao gấp 4 việc 30 phút, bắt đầu đúng giờ', async () => {
    const page = await h.open({ w: 1280, h: 1600, hash: WEEK });
    await setTimes(page, [['t-kham', '2026-11-26', '09:00', 120], ['t-baohiem', '2026-11-26', '13:00', 30]]);
    const bar = id => page.locator('.lcol[data-date="2026-11-26"] .ldur[data-for="' + id + '"]').evaluate(e => ({ h: e.getBoundingClientRect().height, top: e.offsetTop, w: e.getBoundingClientRect().width, pe: getComputedStyle(e).pointerEvents }));
    const a = await bar('t-kham'), b = await bar('t-baohiem');
    A.ok(Math.abs(a.h - 4 * b.h) <= 1 && b.h === 36, 'cao ' + a.h + ' vs ' + b.h);
    A.ok(a.top === 6 * 36 && a.w === 3 && a.pe === 'none', JSON.stringify(a));
    const blk = await page.locator('.lcol[data-date="2026-11-26"] .lblk[data-task="t-kham"]').evaluate(e => e.getBoundingClientRect().height);
    A.strictEqual(blk, 36, 'dòng chữ vẫn cao một ô');
    h.noErrors(page);
  });

  await h.test('Đợt 2 · Mốc hạn có giờ là vạch .ldue-line đỏ đúng giờ; việc xong thì xám; hạn không giờ ở Cả ngày', async () => {
    const page = await h.open({ w: 1280, h: 1600, hash: WEEK });
    await page.evaluate(() => { const t = LP.store.find('Tasks', 't-bcnguon'); LP.store.upsert('Tasks', Object.assign({}, t, { due_date: '2026-11-27', due_time: '17:29' })); });
    const l = page.locator('.lcol[data-date="2026-11-27"] .ldue-line');
    A.strictEqual(await l.count(), 1);
    const r = await l.evaluate(e => { const c = e.parentElement.getBoundingClientRect(), b = e.getBoundingClientRect(), cs = getComputedStyle(e); return { y: b.top - c.top, h: b.height, w: b.width, cw: c.width, bg: cs.backgroundColor, drag: e.getAttribute('draggable'), txt: e.textContent }; });
    A.ok(Math.abs(r.y - (17 * 60 + 29 - 360) / 30 * 36) <= 2, 'vị trí ' + r.y);
    A.ok(r.h === 2 && Math.abs(r.w - r.cw) <= 1 && !r.drag && /^Hạn 17:29 · /.test(r.txt), JSON.stringify(r));
    const warn = await page.evaluate(() => { const d = document.createElement('i'); d.style.background = 'var(--warn)'; document.body.appendChild(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; });
    A.strictEqual(r.bg, warn, 'vạch phải màu var(--warn)');
    await l.click(); await page.waitForSelector('.modal'); await page.keyboard.press('Escape');
    await page.evaluate(() => LP.logic.tasks.setDone(LP.store.find('Tasks', 't-bcnguon'), true));
    const g = await page.locator('.lcol[data-date="2026-11-27"] .ldue-line').evaluate(e => ({ done: e.classList.contains('is-done'), bg: getComputedStyle(e).backgroundColor }));
    A.ok(g.done && g.bg !== warn, 'việc xong phải xám: ' + JSON.stringify(g));
    h.noErrors(page);
  });

  await h.test('Đợt 2 · Bộ lọc đổi chữ; chữ trạng thái trống; khung lưới có cuộn riêng', async () => {
    const page = await h.open({ w: 1280, h: 860, hash: WEEK });
    const f = page.locator('[data-imp]');
    A.strictEqual((await f.innerText()).trim(), 'Chỉ việc ♥♥ trở lên');
    A.strictEqual(await f.getAttribute('title'), 'Làm mờ việc ♥ (Thường), giữ rõ việc ♥♥ và ♥♥♥');
    A.ok(/Không có việc chờ xếp lịch/.test(await page.locator('.lday-un').innerText()) || (await page.locator('.lday-un .lcard').count()) > 0);
    const o = await page.evaluate(() => { const g = document.querySelector('.lgrid'); return { oy: getComputedStyle(g).overflowY, sh: g.scrollHeight, ch: g.clientHeight, bar: document.querySelector('.lich-bar').getBoundingClientRect().bottom, all: document.querySelector('.lallday').getBoundingClientRect().bottom }; });
    A.ok(o.oy === 'auto' && o.sh > o.ch && o.bar < 860 && o.all < 860, JSON.stringify(o));
    const ph = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight }));
    A.ok(ph.sh <= ph.ih + 1, 'trang không được cuộn khi mở Lịch tuần: ' + JSON.stringify(ph));
    const t = await (await h.open({ w: 1280, hash: '#/lich?view=thang&date=2026-11-25' })).locator('[data-imp]').innerText();
    A.strictEqual(t.trim(), 'Chỉ việc ♥♥ trở lên');
  });
};

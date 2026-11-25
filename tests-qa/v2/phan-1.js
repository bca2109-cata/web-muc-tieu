/* V2 · test Phần 1: Agenda và Soát cuối ngày. Chạy: npm run test:v2 -- phan-1
   Dữ liệu mock cố định theo 25/11/2026 (Thứ Tư). Mỗi h.open tạo một ngữ cảnh trình duyệt mới nên dữ liệu mock luôn sạch. */
module.exports = async function (h) {
  const A = h.assert;
  const q = (today, now) => 'mock=1&today=' + today + '&now=' + now;
  const tx = async (page, sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ');
  const wait = page => page.waitForTimeout(80);
  // Mục tồn của một ngày gốc cụ thể (trong lịch sử mock có nhiều mục cùng tên ở các ngày khác)
  const L = (page, title, date, scope) => page.locator((scope || '.ag-left') + ' .ag-item', { has: page.locator('.tick[data-key$="|' + date + '"]'), hasText: title });
  const ring = async page => (await page.locator('.ag-ring .big').textContent()).trim();

  /* 1 */ await h.test('1. "Cop lại lần cuối" của lượt 24/11 hiện ở Từ hôm qua, ghi 24/11', async () => {
    const page = await h.open({ hash: '#/agenda' });
    const t = await tx(page, '.ag-left');
    A.ok(t.includes('Cop lại lần cuối'), 'không thấy mục');
    A.ok(t.includes('Chia số AI Class 24/11'), 'không ghi nguồn 24/11: ' + t.slice(0, 160));
    h.noErrors(page);
  });

  /* 2 */ await h.test('2. Lượt Thứ Bảy có hạng mục +1 thì hạng mục đó hiện vào Thứ Hai', async () => {
    const page = await h.open({ query: q('2026-12-07', '11:05'), hash: '#/agenda' });
    const wd = await page.evaluate(() => LP.date.weekdayName('2026-12-05') + '|' + LP.date.weekdayName('2026-12-07'));
    A.strictEqual(wd, 'Thứ Bảy|Thứ Hai');
    const t = await tx(page, '.ag-left');
    A.ok(t.includes('Cop lại lần cuối') && t.includes('05/12'), 'Thứ Hai không có mục +1 của Thứ Bảy: ' + t.slice(0, 160));
    // Thẻ lượt Thứ Bảy ghi "Ngày mai/Thứ Hai ..." ở cuối thẻ
    const page2 = await h.open({ query: q('2026-12-05', '11:05'), hash: '#/agenda' });
    const foot = await tx(page2, '.ag-run-foot');
    A.ok(/Thứ Hai 08:30 · Cop lại lần cuối/.test(foot), 'cuối thẻ: ' + foot);
  });

  /* 3 */ await h.test('3. now=08:42, hạng mục 8:30 chưa tick có "Trễ 12 phút"', async () => {
    const page = await h.open({ query: q('2026-11-25', '08:42'), hash: '#/agenda' });
    const row = page.locator('.ag-run .ag-item', { hasText: 'Chia số cho các tổ' });
    A.ok((await row.innerText()).includes('Trễ 12 phút'), 'thiếu pill Trễ');
    A.ok(await row.evaluate(e => e.classList.contains('is-late')), 'thiếu class is-late');
    // Hạng mục 09:15 còn 33 phút, chưa tới giờ: không trễ, không đến giờ
    const later = await page.locator('.ag-run .ag-item', { hasText: 'Gửi file cho TBP' }).innerText();
    A.ok(!/Trễ|Đến giờ/.test(later), 'hạng mục 09:15 báo sai: ' + later);
    // Đến giờ: now=09:05 thì 09:15 còn 10 phút
    const page2 = await h.open({ query: q('2026-11-25', '09:05'), hash: '#/agenda' });
    A.ok(await page2.locator('.ag-run .ag-item.is-due', { hasText: 'Gửi file cho TBP' }).count() === 1, 'thiếu nền Đến giờ');
  });

  /* 4 */ await h.test('4. Toàn cảnh: đặt giờ 11:30 cho việc tồn thì rời khối tồn, nằm giữa 11:00 và 14:00, nhãn "Tồn từ 24/11"', async () => {
    const page = await h.open({ hash: '#/agenda' });
    await page.click('[data-act="mode"][data-mode="overview"]');
    await wait(page);
    A.strictEqual(await L(page, 'Cop lại lần cuối', '2026-11-24', '.ag-ton').count(), 1, 'khối tồn thiếu mục');
    const li = L(page, 'Cop lại lần cuối', '2026-11-24', '.ag-ton');
    await li.locator('input[type="time"]').fill('11:30');
    await li.locator('[data-act="place"]').click();
    await wait(page);
    A.strictEqual(await L(page, 'Cop lại lần cuối', '2026-11-24', '.ag-ton').count(), 0, 'mục còn trong khối tồn');
    const times = await page.locator('.ag-tl-row .ag-c-time').allInnerTexts();
    const idx = times.findIndex(t => t.trim() === '11:30');
    A.ok(idx > 0, 'không có dòng 11:30: ' + times.join(','));
    const m = s => { const p = s.replace('~', '').trim().split(':'); return +p[0] * 60 + +p[1]; };
    const prev = times.slice(0, idx).map(m).filter(x => !isNaN(x)), next = times.slice(idx + 1).map(m).filter(x => !isNaN(x));
    A.ok(Math.max.apply(null, prev) <= 11 * 60 + 30 && Math.min.apply(null, next) >= 11 * 60 + 30, 'sai vị trí: ' + times.join(','));
    A.ok(m(times[idx]) >= 660 && m(times[idx]) <= 840, 'ngoài 11:00 đến 14:00');
    const row = page.locator('.ag-tl-row', { hasText: 'Cop lại lần cuối' });
    A.ok((await row.innerText()).includes('Tồn từ 24/11'), 'thiếu nhãn Tồn từ 24/11');
    // Dữ liệu ghi vào set_time
    const st = await page.evaluate(() => { const c = LP.logic.routines.checkOf('r-chiaso', 'ri-r-chiaso-4', '2026-11-24'); return c && c.set_time; });
    A.strictEqual(st, '11:30');
    // Bỏ giờ thì quay lại khối tồn
    await row.locator('[data-act="unplace"]').click();
    await wait(page);
    A.strictEqual(await L(page, 'Cop lại lần cuối', '2026-11-24', '.ag-ton').count(), 1, 'bỏ giờ không quay lại khối tồn');
    // Việc tồn (task): đặt giờ rồi bỏ giờ
    const tli = page.locator('.ag-ton .ag-item', { hasText: 'Trả lời email đối tác' });
    await tli.locator('input[type="time"]').fill('13:00');
    await tli.locator('[data-act="place"]').click();
    await wait(page);
    const trow = page.locator('.ag-tl-row', { hasText: 'Trả lời email đối tác' });
    A.ok((await trow.innerText()).includes('Tồn từ 24/11') && (await trow.innerText()).includes('13:00'), 'việc tồn đặt giờ lỗi');
    await trow.locator('[data-act="unplace-task"]').click();
    await wait(page);
    A.ok((await tx(page, '.ag-ton')).includes('Trả lời email đối tác'), 'việc bỏ giờ không quay lại tồn');
    h.noErrors(page);
  });

  /* 4b */ await h.test('Toàn cảnh: "~hh:mm" cho hạng mục không giờ, vạch Bây giờ, đoạn SÁNG/CHIỀU/TỐI, nhóm chưa đặt giờ', async () => {
    const page = await h.open({ hash: '#/agenda' });
    await page.evaluate(() => {
      const it = LP.store.find('RoutineItems', 'ri-r-baocao-2');
      LP.store.upsert('RoutineItems', Object.assign({}, it, { time: '' })); // Gửi báo cáo ngày không giờ: ước = 16:30 + 30p
    });
    await page.click('[data-act="mode"][data-mode="overview"]');
    await wait(page);
    const times = await page.locator('.ag-tl-row .ag-c-time').allInnerTexts();
    A.ok(times.some(t => t.trim() === '~17:00'), 'thiếu ~17:00: ' + times.join(','));
    A.ok((await page.locator('.ag-now').innerText()).includes('Bây giờ 11:05'), 'thiếu vạch Bây giờ');
    const segs = await page.locator('.ag-seg').allInnerTexts();
    A.ok(['SÁNG', 'CHIỀU', 'TỐI'].every(s => segs.some(x => x.trim() === s)), 'thiếu đoạn: ' + segs.join('|'));
    A.ok(segs.some(s => /CHƯA ĐẶT GIỜ/.test(s)), 'thiếu nhóm Trong ngày · chưa đặt giờ');
    // Đoạn SÁNG đứng trước vạch Bây giờ, CHIỀU đứng sau
    const order = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('.ag-seg, .ag-now')).map(e => e.className.includes('ag-now') ? 'NOW' : e.textContent.trim());
      return els.join('|');
    });
    A.ok(/^SÁNG\|NOW\|CHIỀU/.test(order), 'thứ tự đoạn: ' + order);
    // 6 cột đủ trên desktop
    A.ok(await page.locator('.ag-tl-head').isVisible(), 'thiếu hàng tiêu đề cột');
  });

  /* 5 */ await h.test('5. Nút Muộn → sớm đảo đúng thứ tự (và nhớ lựa chọn)', async () => {
    const page = await h.open({ hash: '#/agenda' });
    await page.click('[data-act="mode"][data-mode="overview"]');
    const get = () => page.locator('.ag-tl-row .ag-c-time').allInnerTexts().then(a => a.map(s => s.trim()).filter(Boolean));
    const asc = await get();
    A.ok(asc.length >= 4, 'quá ít dòng');
    await page.click('[data-act="order"][data-order="desc"]');
    await wait(page);
    const desc = await get();
    A.deepStrictEqual(desc, asc.slice().reverse());
    // Nhớ lựa chọn: mở lại trang trong cùng ngữ cảnh
    await page.reload();
    await page.waitForFunction(() => window.LP && LP.ready === true);
    await wait(page);
    A.ok(await page.locator('[data-act="order"][data-order="desc"].is-on').count() === 1, 'không nhớ thứ tự');
    A.ok(await page.locator('.ag-tl').count() === 1, 'không nhớ chế độ Toàn cảnh');
  });

  /* 6 */ await h.test('6. Soát: "Mang sang mai" thì ngày hôm sau mục đó ở Từ hôm qua', async () => {
    const page = await h.open({ hash: '#/agenda' });
    await page.click('[data-act="soat"]');
    await wait(page);
    A.ok((await tx(page, '.ag-so')).includes('Soát cuối ngày'), 'không vào được màn Soát');
    A.ok((await tx(page, '.ag-so')).includes('Lịch tháng sẽ đánh dấu ✓ nếu không còn bỏ sót'), 'thiếu câu lịch tháng');
    // Mục đã tick không hiện
    A.ok(!(await tx(page, '.ag-so')).includes('Lấy số liệu từ LMS'), 'hiện mục đã tick');
    const row = page.locator('.ag-so-row', { hasText: 'Gửi file cho TBP' });
    await row.locator('[data-act="carry"]').click();
    await wait(page);
    const info = await page.evaluate(() => ({
      st: LP.logic.routines.checkOf('r-chiaso', 'ri-r-chiaso-3', '2026-11-25').status,
      next: LP.logic.routines.leftovers('2026-11-26').filter(e => e.title === 'Gửi file cho TBP' && e.runDate === '2026-11-25').map(e => e.source)
    }));
    A.strictEqual(info.st, 'carried');
    A.deepStrictEqual(info.next, ['carried']);
    await page.click('[data-act="finish"]');
    await wait(page);
    await page.click('[data-act="next"]');
    await wait(page);
    A.ok((await tx(page, '.ag-left')).includes('Gửi file cho TBP'), 'ngày mai không thấy ở Từ hôm qua');
    h.noErrors(page);
  });

  await h.test('Soát: Bỏ qua có lý do, Đã làm tick bù, Hoàn tác, Chọn ngày… cho việc', async () => {
    const page = await h.open({ hash: '#/agenda?soat=1' });
    await wait(page);
    // Bỏ qua kèm lý do
    const r1 = page.locator('.ag-so-row', { hasText: 'Dọn bàn học' });
    await r1.locator('[data-act="skip"]').click();
    await wait(page);
    await page.locator('input[data-why]').fill('Mệt quá');
    await page.locator('[data-act="skip-ok"]').click();
    await wait(page);
    const c = await page.evaluate(() => { const x = LP.logic.routines.checkOf('r-toi', 'ri-r-toi-2', '2026-11-25'); return x && [x.status, x.note].join('|'); });
    A.strictEqual(c, 'skipped|Mệt quá');
    // Hoàn tác
    await page.locator('.ag-so-row', { hasText: 'Dọn bàn học' }).locator('[data-act="undo"]').click();
    await wait(page);
    A.strictEqual(await page.evaluate(() => LP.logic.routines.checkOf('r-toi', 'ri-r-toi-2', '2026-11-25')), null);
    // Đã làm: tick bù
    await page.locator('.ag-so-row', { hasText: 'Gửi báo cáo ngày' }).locator('[data-act="done"]').click();
    await wait(page);
    A.strictEqual(await page.evaluate(() => LP.logic.routines.checkOf('r-baocao', 'ri-r-baocao-2', '2026-11-25').status), 'done');
    // Việc ad-hoc: nút thứ 3 là Chọn ngày…
    const t = page.locator('.ag-so-row', { hasText: 'Lấy dữ liệu nguồn' });
    A.ok((await t.innerText()).includes('Chọn ngày…'), 'việc thiếu nút Chọn ngày');
    await t.locator('[data-act="pick"]').click();
    await page.locator('#so-date').fill('2026-11-27');
    await page.locator('#so-date-ok').click();
    await wait(page);
    const mv = await page.evaluate(() => { const s = LP.store.find('TaskSteps', 'st-t-bcnguon-1'); return s.do_date + '|' + LP.store.find('Tasks', 't-bcnguon').carried_from; });
    A.strictEqual(mv, '2026-11-27|2026-11-25');
    // Mang sang mai cho việc cá nhân = ngày kế tiếp
    await page.locator('.ag-so-row', { hasText: 'Đặt lịch khám sức khỏe' }).locator('[data-act="carry"]').click();
    await wait(page);
    A.strictEqual(await page.evaluate(() => LP.store.find('Tasks', 't-kham').do_date), '2026-11-26');
    h.noErrors(page);
  });

  /* 7 */ await h.test('7. Thẻ lượt tick hết thì thu gọn, vòng tròn tăng đúng', async () => {
    const page = await h.open({ hash: '#/agenda' });
    const T = await page.evaluate(() => 7 + LP.logic.tasks.tasksFor('2026-11-25').length + LP.logic.routines.leftovers('2026-11-25').length);
    A.strictEqual(await ring(page), '1/' + T);
    A.ok(await page.locator('.ag-run-done').count() === 0, 'chưa xong mà đã thu gọn');
    await page.locator('.ag-run .ag-item', { hasText: 'Chia số cho các tổ' }).locator('.tick').click();
    await wait(page);
    A.strictEqual(await ring(page), '2/' + T);
    await page.locator('.ag-run .ag-item', { hasText: 'Gửi file cho TBP' }).locator('.tick').click();
    await wait(page);
    A.strictEqual(await ring(page), '3/' + T);
    const done = await tx(page, '.ag-run-done');
    A.ok(/Chia số AI Class · xong lúc 11:05/.test(done), 'thẻ thu gọn: ' + done);
    A.ok((await page.locator('.ag-ring').textContent()).includes(Math.round(300 / T) + '%'), 'sai %');
    const names = await page.locator('.ag-runs > *').evaluateAll(els => els.map(e => e.className.includes('ag-run-done')));
    A.deepStrictEqual(names, [false, false, true]);
    await page.locator('.ag-run-done').click();
    await wait(page);
    await page.locator('.ag-run .ag-item', { hasText: 'Gửi file cho TBP' }).locator('.tick').click();
    await wait(page);
    A.strictEqual(await ring(page), '2/' + T);
    h.noErrors(page);
  });

  await h.test('Vòng "Hoàn thành hôm nay" đếm cả việc hôm nay và việc tồn', async () => {
    const page = await h.open({ hash: '#/agenda' });
    const T0 = await page.evaluate(() => ({ fixed: 7, tasks: LP.logic.tasks.tasksFor('2026-11-25').length, left: LP.logic.routines.leftovers('2026-11-25').length }));
    A.strictEqual(T0.tasks, 2);
    A.ok(T0.left >= 5, 'quá ít mục tồn: ' + T0.left);
    const total = T0.fixed + T0.tasks + T0.left;
    A.strictEqual(await ring(page), '1/' + total);
    await page.locator('.ag-tasks .ag-item', { hasText: 'Đặt lịch khám sức khỏe' }).locator('.tick').click();   // việc cá nhân
    await wait(page);
    A.strictEqual(await ring(page), '2/' + total);
    await page.locator('.ag-tasks .ag-item', { hasText: 'Lấy dữ liệu nguồn' }).locator('.tick').click();        // bước của việc ad-hoc
    await wait(page);
    A.strictEqual(await ring(page), '3/' + total);
    await page.locator('.ag-left .ag-item', { hasText: 'Trả lời email đối tác' }).locator('.tick').click();      // việc tồn
    await wait(page);
    A.strictEqual(await ring(page), '4/' + total);
    await L(page, 'Cop lại lần cuối', '2026-11-24').locator('.tick').click();           // hạng mục tồn
    await wait(page);
    A.strictEqual(await ring(page), '5/' + total);
    // Bỏ tick thì giảm lại
    await L(page, 'Cop lại lần cuối', '2026-11-24').locator('.tick').click();
    await wait(page);
    A.strictEqual(await ring(page), '4/' + total);
  });

  await h.test('Việc tồn không biến mất sau 1 ngày: ghi "tồn từ dd/mm", giữ cho tới khi tick, bỏ qua hoặc đặt giờ', async () => {
    // 27/11 (Thứ Sáu): các mục chưa quyết định của 24/11 và 25/11 vẫn còn
    const page = await h.open({ query: q('2026-11-27', '11:05'), hash: '#/agenda' });
    const left = await tx(page, '.ag-left');
    A.ok(left.includes('Cop lại lần cuối') && left.includes('tồn từ 24/11'), 'mất mục tồn 24/11: ' + left.slice(0, 300));
    A.ok(left.includes('Gửi báo cáo ngày') && left.includes('Dọn bàn học'), 'thiếu mục bỏ sót/mang sang');
    A.ok(/Trả lời email đối tác[^|]*tồn từ 24\/11/.test(left), 'việc tồn thiếu nhãn tồn từ');
    A.ok(left.includes('tồn từ 26/11'), 'thiếu mục tồn của hôm qua (26/11)');
    // Tick: mục vẫn nằm trong danh sách (đã tick), lần mở sau thì hết
    await L(page, 'Gửi báo cáo ngày', '2026-11-24').locator('.tick').click();
    await wait(page);
    A.strictEqual(await page.evaluate(() => LP.logic.routines.checkOf('r-baocao', 'ri-r-baocao-2', '2026-11-24').status), 'done');
    // Bỏ qua
    await L(page, 'Dọn bàn học', '2026-11-24').locator('[data-act="skip-left"]').click();
    await wait(page);
    const sk = await page.evaluate(() => LP.logic.routines.leftovers('2026-11-27').filter(e => e.title === 'Dọn bàn học').map(e => e.runDate));
    A.ok(!sk.includes('2026-11-24'), 'bỏ qua mà vẫn còn tồn 24/11: ' + sk);
    // Đặt giờ: chỉ có hiệu lực trong ngày đặt
    await page.click('[data-act="mode"][data-mode="overview"]');
    await wait(page);
    const li = L(page, 'Cop lại lần cuối', '2026-11-24', '.ag-ton');
    await li.locator('input[type="time"]').fill('10:30');
    await li.locator('[data-act="place"]').click();
    await wait(page);
    A.ok((await page.locator('.ag-tl-row', { hasText: 'Cop lại lần cuối' }).innerText()).includes('Tồn từ 24/11'), 'đặt giờ không lên dòng thời gian');
    await page.evaluate(() => LP.store.flush());
    await page.goto(h.INDEX + '?' + q('2026-11-28', '11:05') + '#/agenda');
    await page.waitForFunction(() => window.LP && LP.ready === true);
    await wait(page);
    const next = await page.evaluate(() => LP.logic.routines.leftovers('2026-11-28').filter(e => e.title === 'Cop lại lần cuối' && e.runDate === '2026-11-24').map(e => e.setTime + '|' + e.runDate));
    A.deepStrictEqual(next, ['|2026-11-24'], 'hôm sau mục phải quay lại tồn chưa xếp giờ');
    h.noErrors(page);
  });

  await h.test('leftovers(): mặc định 7 ngày, {all:true} lấy tất cả; việc tồn không bao giờ hết hạn', async () => {
    const page = await h.open({ query: q('2026-12-20', '11:05'), hash: '#/agenda' });
    const r = await page.evaluate(() => {
      const R = LP.logic.routines, rec = R.leftovers('2026-12-20'), all = R.leftovers('2026-12-20', { all: true });
      return { oldRec: rec.some(e => e.runDate && e.runDate < '2026-12-13'), taskRec: rec.some(e => e.title === 'Trả lời email đối tác'),
        taskAll: all.some(e => e.title === 'Trả lời email đối tác'), oldAll: all.some(e => e.runDate === '2026-11-24'), tooOld: all.some(e => e.runDate && e.runDate < '2026-09-20') };
    });
    A.strictEqual(r.oldRec, false, 'khối Từ hôm qua có mục quá 7 ngày');
    A.strictEqual(r.taskRec, false, 'việc quá 7 ngày không được nằm trong khối Từ hôm qua');
    A.strictEqual(r.taskAll, true, 'việc tồn bị mất khỏi danh sách tất cả');
    A.strictEqual(r.oldAll, true, 'mục cũ biến mất khỏi danh sách tất cả');
    A.strictEqual(r.tooOld, false, 'tạo tồn cho ngày trước khi mẫu tồn tại');
  });

  await h.test('Từ hôm qua chỉ 7 ngày gần nhất; dòng "Tồn đọng cũ hơn: N mục · Xem tất cả", hết mục thì ẩn', async () => {
    const page = await h.open({ hash: '#/agenda' });
    const c = await page.evaluate(() => { const R = LP.logic.routines; return { rec: R.leftovers('2026-11-25').length, all: R.leftovers('2026-11-25', { all: true }).length, minFrom: R.leftovers('2026-11-25').filter(e => e.runDate).map(e => e.runDate).sort()[0] }; });
    A.ok(c.all > c.rec && c.rec > 0, 'dữ liệu mẫu phải có mục cũ: ' + JSON.stringify(c));
    A.ok(c.minFrom >= '2026-11-18', 'Từ hôm qua có mục quá 7 ngày: ' + c.minFrom);
    const old = await tx(page, '.ag-old');
    A.ok(old.includes('Tồn đọng cũ hơn: ' + (c.all - c.rec) + ' mục') && old.includes('Xem tất cả'), 'dòng tồn đọng: ' + old);
    A.ok(!(await tx(page, '.ag-left')).includes('tồn từ 12/11'), 'mục 12/11 phải nằm ngoài khối');
    await page.click('.ag-old [data-act="ton"]');
    await wait(page);
    A.ok(await page.locator('.ag-tt').count() === 1, 'không mở được Tồn tổng');
    // Xử lý hết mục cũ thì dòng ẩn
    const p2 = await h.open({ hash: '#/agenda' });
    await p2.evaluate(() => {
      const R = LP.logic.routines, lo = R.leftovers('2026-11-25').map(e => e.itemId + e.runDate);
      R.leftovers('2026-11-25', { all: true }).filter(e => e.kind === 'item' && lo.indexOf(e.itemId + e.runDate) < 0).forEach(e => R.check(e.routineId, e.itemId, e.runDate, 'skipped'));
    });
    await wait(p2);
    A.strictEqual(await p2.locator('.ag-old').count(), 0, 'hết mục cũ mà dòng vẫn hiện');
  });

  await h.test('Vòng "Hoàn thành hôm nay" không đếm tồn cũ hơn 7 ngày', async () => {
    const page = await h.open({ hash: '#/agenda' });
    const c = await page.evaluate(() => ({ rec: LP.logic.routines.leftovers('2026-11-25').length, all: LP.logic.routines.leftovers('2026-11-25', { all: true }).length }));
    A.strictEqual(await ring(page), '1/' + (7 + 2 + c.rec));
    A.ok(7 + 2 + c.rec < 7 + 2 + c.all);
  });

  await h.test('Tồn tổng: 3 số, danh sách cũ nhất trước gom theo tuần', async () => {
    const page = await h.open({ hash: '#/agenda?ton=1' });
    await wait(page);
    const info = await page.evaluate(() => {
      const L = LP.logic.routines.leftovers('2026-11-25', { all: true }).filter(e => !(e.kind === 'item' && e.setTime));
      const from = e => e.kind === 'item' ? e.runDate : e.fromDate, cnt = {};
      L.forEach(e => { const n = e.kind === 'item' ? LP.logic.routines.byId(e.routineId).name : (e.ref.kind === 'canhan' ? 'Việc cá nhân' : 'Việc ad-hoc'); cnt[n] = (cnt[n] || 0) + 1; });
      const top = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
      return { n: L.length, oldest: Math.max.apply(null, L.map(e => LP.date.diff('2026-11-25', from(e)))), top, topN: cnt[top] };
    });
    const stats = (await page.locator('.ag-tt-stat').allInnerTexts()).map(t => t.replace(/\s+/g, ' '));
    A.strictEqual(stats.length, 3);
    A.ok(stats[0].includes('Tổng mục tồn') && stats[0].includes(String(info.n)), 'tổng: ' + stats[0] + ' / ' + info.n);
    A.ok(stats[1].includes('Mục cũ nhất') && stats[1].includes(info.oldest + ' ngày'), 'cũ nhất: ' + stats[1]);
    A.ok(stats[2].includes('Khối tồn nhiều nhất') && stats[2].includes(info.top) && stats[2].includes(String(info.topN)), 'khối nhiều nhất: ' + stats[2]);
    A.strictEqual(await page.locator('.ag-tt-row').count(), info.n);
    // Cũ nhất trước, nhóm theo tuần tăng dần
    const heads = await page.locator('.ag-tt section h2').allInnerTexts();
    A.ok(heads.length >= 3 && heads.every(x => /^Tuần \d\d\/\d\d – \d\d\/\d\d$/.test(x.trim())), 'tiêu đề tuần: ' + heads.join('|'));
    const ages = await page.locator('.ag-tt-row .ag-sub').allInnerTexts().then(a => a.map(x => +/(\d+) ngày trước/.exec(x)[1]));
    A.deepStrictEqual(ages, ages.slice().sort((a, b) => b - a), 'không xếp cũ nhất trước');
    // Không có tab mới
    A.strictEqual(await page.locator('.tabbar .tab').count(), 5);
  });

  await h.test('Tồn tổng: lọc theo loại, khối, khoảng ngày', async () => {
    const page = await h.open({ hash: '#/agenda?ton=1' });
    const total = await page.locator('.ag-tt-row').count();
    await page.click('[data-act="filter"][data-f="type"][data-v="task"]');
    await wait(page);
    const tasks = await page.locator('.ag-tt-row').allInnerTexts();
    A.ok(tasks.length === 1 && tasks[0].includes('Trả lời email đối tác') && tasks[0].includes('Hủy việc'), 'lọc Việc: ' + tasks.join('|'));
    await page.click('[data-act="filter"][data-f="type"][data-v="item"]');
    await wait(page);
    A.strictEqual(await page.locator('.ag-tt-row').count(), total - 1);
    await page.click('[data-act="filter"][data-f="type"][data-v=""]');
    await page.selectOption('#tt-block', 'Báo cáo cuối ngày');
    await wait(page);
    const blk = await page.locator('.ag-tt-row .ag-sub').allInnerTexts();
    A.ok(blk.length > 0 && blk.every(x => x.startsWith('Báo cáo cuối ngày')), 'lọc khối: ' + blk.slice(0, 2));
    await page.selectOption('#tt-block', '');
    await page.fill('[data-f="from"]', '2026-11-20');
    await page.fill('[data-f="to"]', '2026-11-24');
    await wait(page);
    const days = await page.locator('.ag-tt-row .ag-sub').allInnerTexts().then(a => a.map(x => /tồn từ (\d\d\/\d\d)/.exec(x)[1]));
    A.ok(days.length > 0 && days.every(d => d >= '20/11' && d <= '24/11'), 'lọc ngày: ' + days.join(','));
    h.noErrors(page);
  });

  await h.test('Tồn tổng: Đã làm / Bỏ qua / Đưa vào hôm nay cho từng mục, có Hoàn tác', async () => {
    const page = await h.open({ hash: '#/agenda?ton=1' });
    const row = (re) => page.locator('.ag-tt-row', { hasText: re });
    const chk = (rid, iid, d) => page.evaluate(([r, i, dd]) => { const c = LP.logic.routines.checkOf(r, i, dd); return c && [c.status, c.set_time].join('|'); }, [rid, iid, d]);
    // Đã làm
    await row(/Gửi báo cáo ngày[\s\S]*tồn từ 24\/11/).locator('[data-act="t-done"]').click();
    await wait(page);
    A.strictEqual(await chk('r-baocao', 'ri-r-baocao-2', '2026-11-24'), 'done|');
    // Bỏ qua, rồi Hoàn tác
    await row(/Dọn bàn học[\s\S]*tồn từ 24\/11/).locator('[data-act="t-skip"]').click();
    await wait(page);
    A.strictEqual(await chk('r-toi', 'ri-r-toi-2', '2026-11-24'), 'skipped|');
    await page.locator('.toast [data-t="act"]').click();
    await wait(page);
    A.strictEqual(await chk('r-toi', 'ri-r-toi-2', '2026-11-24'), 'carried|', 'hoàn tác phải về trạng thái cũ (mang sang)');
    // Đưa vào hôm nay (hạng mục cố định): hỏi giờ
    await row(/Cop lại lần cuối[\s\S]*tồn từ 24\/11/).locator('[data-act="t-today"]').click();
    await page.fill('#tt-time', '15:00');
    await page.click('#tt-ok');
    await wait(page);
    A.strictEqual(await chk('r-chiaso', 'ri-r-chiaso-4', '2026-11-24'), 'carried|15:00');
    A.strictEqual(await row(/Cop lại lần cuối[\s\S]*tồn từ 24\/11/).count(), 0, 'mục đã đưa vào hôm nay vẫn còn trong Tồn tổng');
    // Việc: Đưa vào hôm nay, rồi Hủy việc
    await row(/Trả lời email đối tác/).locator('[data-act="t-today"]').click();
    await wait(page);
    const t = await page.evaluate(() => { const x = LP.store.find('Tasks', 't-email'); return x.do_date + '|' + x.carried_from; });
    A.strictEqual(t, '2026-11-25|2026-11-24');
    A.strictEqual(await row(/Trả lời email đối tác/).count(), 0);
    await page.locator('.toast [data-t="act"]').click();     // hoàn tác
    await wait(page);
    await row(/Trả lời email đối tác/).locator('[data-act="t-skip"]').click();
    await wait(page);
    A.strictEqual(await page.evaluate(() => LP.store.find('Tasks', 't-email').status), 'cancelled');
    h.noErrors(page);
  });

  await h.test('Tồn tổng: chọn nhiều để Bỏ qua hàng loạt (có xác nhận và Hoàn tác)', async () => {
    const page = await h.open({ hash: '#/agenda?ton=1' });
    A.ok(await page.locator('[data-act="bulk-skip"]').isDisabled(), 'chưa chọn mà nút vẫn bật');
    const n0 = await page.locator('.ag-tt-row').count();
    for (let i = 0; i < 3; i++) await page.locator('.ag-tt-row input[type="checkbox"]').nth(i).check();
    A.ok((await tx(page, '.ag-tt-n')).includes('Đã chọn 3'), 'đếm đã chọn');
    await page.click('[data-act="bulk-skip"]');
    await page.locator('.modal [data-ans="1"]').click();
    await wait(page);
    A.strictEqual(await page.locator('.ag-tt-row').count(), n0 - 3);
    await page.locator('.toast [data-t="act"]').click();
    await wait(page);
    A.strictEqual(await page.locator('.ag-tt-row').count(), n0, 'hoàn tác hàng loạt không khôi phục');
    // Chọn tất cả đang lọc
    await page.click('[data-act="filter"][data-f="type"][data-v="task"]');
    await page.locator('[data-selall]').check();
    A.ok((await tx(page, '.ag-tt-n')).includes('Đã chọn 1'), 'chọn tất cả đang lọc');
  });

  await h.test('Soát: dòng cuối "Còn N mục tồn đọng · Xem" mở màn Tồn tổng', async () => {
    const page = await h.open({ hash: '#/agenda?soat=1' });
    await wait(page);
    const n = await page.evaluate(() => LP.logic.routines.leftovers('2026-11-25', { all: true }).length);
    const last = await tx(page, '.ag-so-ton');
    A.ok(last.includes('Còn ' + n + ' mục tồn đọng') && last.includes('Xem'), 'dòng cuối: ' + last);
    A.ok(await page.evaluate(() => { const so = document.querySelector('.ag-so'); return so.lastElementChild.classList.contains('ag-so-ton'); }), 'phải là dòng cuối');
    await page.click('.ag-so-ton [data-act="ton"]');
    await wait(page);
    A.strictEqual(await page.locator('.ag-tt').count(), 1);
  });

  await h.test('Hủy việc: thoát khỏi tồn, Việc hôm nay, thống kê; có Hoàn tác', async () => {
    const page = await h.open({ hash: '#/agenda' });
    // Từ hôm qua: nút Hủy việc cho việc tồn
    await page.locator('.ag-left .ag-item', { hasText: 'Trả lời email đối tác' }).locator('[data-act="cancel-left"]').click();
    await wait(page);
    const r = await page.evaluate(() => ({ st: LP.store.find('Tasks', 't-email').status,
      left: LP.logic.routines.leftovers('2026-11-25', { all: true }).some(e => e.title === 'Trả lời email đối tác'),
      adhoc: LP.stats.adhocStatus('2026-11-01', '2026-11-30').total }));
    A.strictEqual(r.st, 'cancelled');
    A.strictEqual(r.left, false, 'việc hủy vẫn trong tồn');
    A.strictEqual(await page.locator('.ag-left .ag-item', { hasText: 'Trả lời email đối tác' }).count(), 0);
    const before = await page.evaluate(() => { LP.logic.tasks.setCancelled(LP.store.find('Tasks', 't-email'), false); return LP.stats.adhocStatus('2026-11-01', '2026-11-30').total; });
    A.strictEqual(before, r.adhoc + 1, 'thống kê vẫn đếm việc đã hủy');
    // Menu ⋯ của việc hôm nay
    await wait(page);
    await page.locator('.ag-tasks .ag-item', { hasText: 'Đặt lịch khám sức khỏe' }).locator('[data-act="more"]').click();
    await page.locator('[data-m="cancel"]').click();
    await wait(page);
    A.strictEqual(await page.locator('.ag-tasks .ag-item', { hasText: 'Đặt lịch khám sức khỏe' }).count(), 0, 'việc hủy vẫn trong Việc hôm nay');
    await page.locator('.toast [data-t="act"]').click();
    await wait(page);
    A.strictEqual(await page.locator('.ag-tasks .ag-item', { hasText: 'Đặt lịch khám sức khỏe' }).count(), 1, 'Hoàn tác không đưa việc về');
    h.noErrors(page);
  });

  await h.test('Số "mục tồn" khớp giữa Agenda, Soát và Tồn tổng (kể cả mục đã xếp giờ hôm nay)', async () => {
    const page = await h.open({ hash: '#/agenda' });
    // Xếp giờ một mục tồn cũ và một mục tồn mới vào hôm nay
    await page.evaluate(() => {
      const R = LP.logic.routines;
      R.check('r-chiaso', 'ri-r-chiaso-4', '2026-11-24', 'carried', { set_time: '15:00', note: 'xep-gio:2026-11-25' });
      R.check('r-baocao', 'ri-r-baocao-1', '2026-11-12', 'carried', { set_time: '15:30', note: 'xep-gio:2026-11-25' });
    });
    await wait(page);
    const exp = await page.evaluate(() => { const R = LP.logic.routines; return { all: R.leftovers('2026-11-25', { all: true, unplaced: true }).length, rec: R.leftovers('2026-11-25', { unplaced: true }).length }; });
    A.ok((await tx(page, '.ag-old')).includes('Tồn đọng cũ hơn: ' + (exp.all - exp.rec) + ' mục'), 'dòng cũ hơn: ' + (await tx(page, '.ag-old')));
    await page.goto(h.INDEX + '?' + q('2026-11-25', '11:05') + '#/agenda?soat=1');
    await page.waitForFunction(() => window.LP && LP.ready === true);
    await wait(page);
    A.ok((await tx(page, '.ag-so-ton')).includes('Còn ' + exp.all + ' mục tồn đọng'), 'Soát: ' + (await tx(page, '.ag-so-ton')));
    await page.click('.ag-so-ton [data-act="ton"]');
    await wait(page);
    A.ok((await tx(page, '.ag-tt-stat')).includes(String(exp.all)), 'Tồn tổng: ' + (await tx(page, '.ag-tt-stat')));
    A.strictEqual(await page.locator('.ag-tt-row').count(), exp.all);
  });

  await h.test('Mẫu khoảng ngày: ngày gốc trong Tồn tổng là ngày đầu khoảng, không nhảy theo ngày', async () => {
    const r = await (await h.open({ query: q('2026-12-10', '11:05'), hash: '#/agenda' })).evaluate(() => {
      const R = LP.logic.routines;
      return ['2026-12-10', '2026-12-11'].map(d => R.leftovers(d, { all: true }).filter(e => e.routineId === 'r-chotso').map(e => e.itemId + '@' + e.since));
    });
    A.deepStrictEqual(r[0], ['ri-r-chotso-1@2026-12-01', 'ri-r-chotso-2@2026-12-01']);
    A.deepStrictEqual(r[1], r[0], 'ngày gốc đổi theo ngày xem');
    const page = await h.open({ query: q('2026-12-10', '11:05'), hash: '#/agenda?ton=1' });
    const row = await page.locator('.ag-tt-row', { hasText: 'Đối soát số liệu tháng' }).innerText();
    A.ok(/tồn từ 01\/12/.test(row) && /9 ngày trước/.test(row), 'hàng: ' + row.replace(/\s+/g, ' '));
  });

  await h.test('Hủy việc: hoàn tác khôi phục đúng trạng thái cũ; việc đã xong không có nút Hủy', async () => {
    const page = await h.open({ hash: '#/agenda' });
    await page.locator('.ag-tasks .ag-item', { hasText: 'Đặt lịch khám sức khỏe' }).locator('.tick').click();
    await wait(page);
    const doneAt = await page.evaluate(() => LP.store.find('Tasks', 't-kham').done_at);
    A.ok(doneAt, 'chưa có done_at');
    await page.locator('.ag-tasks .ag-item', { hasText: 'Đặt lịch khám sức khỏe' }).locator('[data-act="more"]').click();
    A.ok(!(await tx(page, '.modal')).includes('Hủy việc'), 'việc đã xong vẫn có nút Hủy việc');
    await page.keyboard.press('Escape');
    // Hủy việc tồn rồi hoàn tác: về đúng todo
    await page.locator('.ag-left .ag-item', { hasText: 'Trả lời email đối tác' }).locator('[data-act="cancel-left"]').click();
    await page.locator('.toast [data-t="act"]').click();
    await wait(page);
    A.strictEqual(await page.evaluate(() => LP.store.find('Tasks', 't-email').status), 'todo');
    // Tồn tổng: hủy việc đã xong lúc nào đó rồi hoàn tác thì giữ done_at (khôi phục nguyên dòng)
    const kept = await page.evaluate(() => {
      const t = LP.store.find('Tasks', 't-kham'), prev = Object.assign({}, t);
      LP.logic.tasks.setCancelled(t, true); LP.store.upsert('Tasks', prev);
      const x = LP.store.find('Tasks', 't-kham'); return x.status + '|' + (x.done_at === prev.done_at);
    });
    A.strictEqual(kept, 'done|true');
  });

  /* 8 */ await h.test('8. 390px và 1280px không cuộn ngang, không lỗi JS (Agenda, Toàn cảnh, Soát; sáng và tối)', async () => {
    await h.checkScreen('agenda');
    await h.checkScreen('agenda', 'soat=1');
    await h.checkScreen('agenda', 'ton=1');
    for (const [w, scheme] of [[390, 'light'], [1280, 'light'], [390, 'dark'], [1280, 'dark']]) {
      const page = await h.open({ w, scheme, hash: '#/agenda' });
      await page.click('[data-act="mode"][data-mode="overview"]');
      await wait(page);
      await h.noOverflow(page);
      h.noErrors(page);
    }
  });

  /* Các mục còn lại trong thiết kế */
  await h.test('Dải 3 biểu đồ: vòng tròn, tiến độ theo khối, 6 ngày làm việc', async () => {
    const page = await h.open({ hash: '#/agenda' });
    A.strictEqual(await page.locator('.ag-chart').count(), 3);
    const facts = await tx(page, '.ag-facts');
    A.ok(/Quỹ việc riêng 20p \/ 1h30/.test(facts) && /Giờ đột xuất 30p/.test(facts), 'quỹ/đột xuất: ' + facts);
    const blk = await page.locator('.ag-blk').allInnerTexts();
    A.ok(blk.some(b => /Chia số AI Class\s+1\/3/.test(b.replace(/\n/g, ' '))), 'khối Chia số: ' + blk.join('|'));
    A.ok(blk.some(b => b.includes('Từ hôm qua')) && blk.some(b => /Việc\s/.test(b)), 'thiếu khối Từ hôm qua / Việc');
    A.strictEqual(await page.locator('.ag-col').count(), 6);
    A.strictEqual(await page.locator('.ag-col-bar.is-now').count(), 1);
    // Khối đủ thì màu ok
    await page.evaluate(() => ['ri-r-chiaso-2', 'ri-r-chiaso-3'].forEach(i => LP.logic.routines.check('r-chiaso', i, '2026-11-25', 'done')));
    await wait(page);
    const cls = await page.locator('.ag-blk', { hasText: 'Chia số AI Class' }).locator('.bar14 > span').getAttribute('class');
    A.ok(/b-ok/.test(cls), 'khối đủ chưa màu ok: ' + cls);
  });

  await h.test('Checklist: thẻ cố định, thứ tự theo giờ, Ghi chú mở tấm trượt, còn N ngày', async () => {
    const page = await h.open({ hash: '#/agenda' });
    const titles = await page.locator('.ag-run h2').allInnerTexts();
    A.deepStrictEqual(titles, ['Chia số AI Class', 'Báo cáo cuối ngày', 'Buổi tối của tôi']);
    A.ok((await tx(page, '.ag-run')).includes('1/3'), 'thiếu x/y');
    await page.locator('[data-act="doc"]').first().click();
    await wait(page);
    const sheet = await tx(page, '.modal');
    A.ok(sheet.includes('Hướng dẫn chia số AI Class') && sheet.includes('Lấy số liệu từ LMS lúc 8h'), 'tấm trượt: ' + sheet.slice(0, 120));
    A.ok(!sheet.includes('Chia đều theo tổ'), 'phải chỉ hiện đúng mục Chuẩn bị');
    // Mẫu theo khoảng ngày: 02/12 thuộc khoảng 1-3, tháng 12 chưa tick gì: còn 2 ngày (2 và 3)
    const p2 = await h.open({ query: q('2026-12-02', '09:00'), hash: '#/agenda' });
    A.ok((await tx(p2, '.ag-runs')).includes('còn 2 ngày'), 'thiếu nhãn còn N ngày: ' + (await tx(p2, '.ag-runs')).slice(0, 200));
  });

  await h.test('Việc hôm nay: hàng đủ thông tin, tick bước con, menu ⋯, đổi ngày làm', async () => {
    const page = await h.open({ hash: '#/agenda' });
    const row = page.locator('.ag-tasks .ag-item', { hasText: 'Lấy dữ liệu nguồn' });
    const t = (await row.innerText()).replace(/\s+/g, ' ');
    A.ok(/Người đặt: TBP Sales/.test(t) && /Hạn 27\/11/.test(t) && /bước 0\/3/.test(t), 'thông tin: ' + t);
    A.strictEqual(await row.locator('.hearts .icon').count(), 3);
    A.strictEqual(await row.locator('.urg-khan').count(), 1);
    await row.locator('.tick').click();
    await wait(page);
    A.ok((await page.locator('.ag-tasks .ag-item', { hasText: 'Lấy dữ liệu nguồn' }).innerText()).includes('bước 1/3'), 'bước không tăng');
    // Menu ⋯
    await page.locator('.ag-tasks .ag-item', { hasText: 'Đặt lịch khám sức khỏe' }).locator('[data-act="more"]').click();
    const menu = await tx(page, '.modal');
    A.ok(['Đổi ngày làm', 'Sửa', 'Mở ghi chú'].every(s => menu.includes(s)), 'menu: ' + menu);
    await page.locator('[data-m="date"]').click();
    await page.locator('#ag-newdate').fill('2026-11-28');
    await page.locator('#ag-newdate-ok').click();
    await wait(page);
    A.strictEqual(await page.evaluate(() => LP.store.find('Tasks', 't-kham').do_date), '2026-11-28');
    h.noErrors(page);
  });

  await h.test('Thói quen: chip tick nhanh, lửa chuỗi', async () => {
    const page = await h.open({ hash: '#/agenda' });
    const chip = page.locator('.ag-habits .chip', { hasText: 'Chạy bộ' });
    A.strictEqual(await chip.getAttribute('aria-pressed'), 'false');
    await chip.click();
    await wait(page);
    A.strictEqual(await page.locator('.ag-habits .chip', { hasText: 'Chạy bộ' }).getAttribute('aria-pressed'), 'true');
    const water = await page.locator('.ag-habits .chip', { hasText: 'Uống nước' }).innerText();
    A.ok(/5/.test(water), 'chuỗi nước: ' + water);
    A.ok(await page.locator('.ag-habits .chip', { hasText: 'Uống nước' }).locator('.icon').count() >= 1, 'thiếu ngọn lửa');
  });

  await h.test('Đầu trang: ‹ › đổi ngày, ngày đã qua chỉ xem, Đánh dấu ngày nghỉ', async () => {
    const page = await h.open({ hash: '#/agenda' });
    await page.click('[data-act="prev"]');
    await wait(page);
    A.ok((await tx(page, '.ag-head')).includes('Thứ Ba, 24/11/2026') && (await tx(page, '.ag-head')).includes('Đã qua · chỉ xem'), 'ngày trước');
    A.ok(await page.locator('.tick:not([disabled])').count() === 0, 'ngày đã qua vẫn tick được');
    A.ok(await page.locator('[data-act="off"]').count() === 0, 'ngày đã qua vẫn có nút nghỉ');
    await page.click('[data-act="today"]');
    await wait(page);
    await page.click('[data-act="off"]');
    await page.locator('.modal [data-ans="1"]').click();
    await wait(page);
    A.ok((await tx(page, '.ag-head')).includes('Ngày nghỉ'), 'chưa thành ngày nghỉ');
    A.ok((await tx(page, '.ag-runs')).includes('Ngày nghỉ'), 'ngày nghỉ vẫn có lượt');
    await page.click('[data-act="off"]');
    await page.locator('.modal [data-ans="1"]').click();
    await wait(page);
    A.ok(!(await tx(page, '.ag-head')).includes('Ngày nghỉ, '), 'chưa bỏ đánh dấu');
    A.ok(await page.locator('.ag-run').count() >= 3, 'lượt không hiện lại');
  });

  await h.test('Thông báo tới giờ: báo khi tới giờ, không báo nếu đã tick trước', async () => {
    const page = await h.open({ query: q('2026-11-25', '09:16'), hash: '#/agenda' });
    await wait(page);
    A.ok((await page.locator('.toast').first().innerText()).includes('Gửi file cho TBP'), 'không có thông báo');
    // Tick trước giờ thì không báo: tick lúc 09:14 (dữ liệu mock lưu trong trình duyệt), rồi mở lại lúc 09:16
    const p2 = await h.open({ query: q('2026-11-25', '09:14'), hash: '#/cai-dat' });
    await p2.evaluate(() => { LP.logic.routines.check('r-chiaso', 'ri-r-chiaso-3', '2026-11-25', 'done'); return LP.store.flush(); });
    await p2.goto(h.INDEX + '?' + q('2026-11-25', '09:16') + '#/agenda');
    await p2.waitForFunction(() => window.LP && LP.ready === true);
    await p2.waitForTimeout(150);
    A.strictEqual(await p2.locator('.toast').count(), 0, 'báo dù đã tick');
    // Quá 5 phút không báo
    const p3 = await h.open({ query: q('2026-11-25', '09:40'), hash: '#/agenda' });
    A.strictEqual(await p3.locator('.toast').count(), 0, 'báo quá muộn');
  });

  await h.test('Toàn cảnh: các cột Giờ | Công việc | Thuộc | Mức độ | Hạn | Trạng thái', async () => {
    const page = await h.open({ hash: '#/agenda' });
    await page.click('[data-act="mode"][data-mode="overview"]');
    await wait(page);
    A.strictEqual((await page.locator('.ag-tl-head span').allInnerTexts()).join('|'), 'Giờ|Công việc|Thuộc|Mức độ|Hạn|Trạng thái');
    const row = (await page.locator('.ag-tl-row', { hasText: 'Chia số cho các tổ' }).innerText()).replace(/\s+/g, ' ');
    A.ok(/08:30/.test(row) && /Chia số AI Class/.test(row) && /trước 09:30/.test(row) && /Trễ 2h35/.test(row), 'hàng: ' + row);
    const done = (await page.locator('.ag-tl-row', { hasText: 'Lấy số liệu từ LMS' }).innerText()).replace(/\s+/g, ' ');
    A.ok(/Xong/.test(done), 'hàng đã tick phải là Xong: ' + done);
    // Tick trên dòng thời gian
    await page.locator('.ag-tl-row', { hasText: 'Chia số cho các tổ' }).locator('.tick').click();
    await wait(page);
    A.ok(/Xong/.test(await page.locator('.ag-tl-row', { hasText: 'Chia số cho các tổ' }).innerText()), 'tick trên timeline lỗi');
    // Khối tồn vẫn ghi giờ gốc
    A.ok(/giờ gốc 08:30/.test(await tx(page, '.ag-ton')), 'khối tồn thiếu giờ gốc');
  });
};

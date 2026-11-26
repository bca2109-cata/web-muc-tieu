/* V2 · test Phần 1: Agenda, Soát cuối ngày và Tồn tổng. Chạy: npm run test:v2 -- phan-1
   Dữ liệu mock cố định theo 25/11/2026 (Thứ Tư). Mỗi h.open tạo một ngữ cảnh trình duyệt mới nên dữ liệu mock luôn sạch.
   Mô hình tồn (yêu cầu người dùng 26/11):
   - ĐÃ QUYẾT làm hôm nay (+1 của lượt trước, trạng thái carried, đã xếp giờ): nằm ngay trong khối của nó ở luồng hôm nay, đúng giờ, nhãn "Tồn từ dd/mm".
   - SÓT CHƯA QUYẾT (missed, việc quá ngày làm): chỉ một dòng mảnh ở đầu trang, mở màn Tồn tổng (#/agenda?ton=1). */
module.exports = async function (h) {
  const A = h.assert;
  const q = (today, now) => 'mock=1&today=' + today + '&now=' + now;
  const tx = async (page, sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ');
  const wait = page => page.waitForTimeout(80);
  const ring = async page => (await page.locator('.ag-ring .big').textContent()).trim();
  // Test nhanh: lỗi định vị thì báo sau 5 giây thay vì 30 giây
  const open0 = h.open.bind(h);
  h.open = async o => { const p = await open0(o); p.setDefaultTimeout(5000); return p; };
  // Mục đã quyết (nhãn "Tồn từ") của một ngày gốc cụ thể trong luồng hôm nay
  const L = (page, title, date, scope) => page.locator((scope || '.ag-runs') + ' .ag-item', { has: page.locator('.tick[data-key$="|' + date + '"]'), hasText: title });
  const pend = page => page.evaluate(() => LP.logic.routines.leftovers('2026-11-25', { all: true, pending: true }).length);
  // Tồn tổng: mỗi tuần mặc định thu gọn, mở hết để thao tác từng mục
  const openAll = async page => { for (let i = 0; i < 300; i++) { const b = page.locator('.ag-tt-wtoggle[aria-expanded="false"]').first(); if (!(await b.count())) break; await b.click(); } await page.waitForTimeout(80); };
  const ttRow = (page, re) => page.locator('.ag-tt-row', { hasText: re });
  const chk = (page, rid, iid, d) => page.evaluate(([r, i, dd]) => { const c = LP.logic.routines.checkOf(r, i, dd); return c && [c.status, c.set_time].join('|'); }, [rid, iid, d]);

  /* ---- Ý (1), (2): luồng hôm nay lên đầu, mục đã quyết nằm trong khối của nó ---- */
  await h.test('1. Không còn khối "Từ hôm qua"; "Cop lại lần cuối" (+1 của 24/11) nằm trong khối Chia số, đúng 08:30, nhãn "Tồn từ 24/11"', async () => {
    const page = await h.open({ hash: '#/agenda' });
    A.strictEqual(await page.locator('.ag-left, .note-paper').count(), 0, 'còn khối giấy note');
    A.ok(!(await page.locator('.ag').innerText()).includes('Từ hôm qua'), 'còn chữ Từ hôm qua');
    const row = L(page, 'Cop lại lần cuối', '2026-11-24');
    A.strictEqual(await row.count(), 1);
    const t = (await row.innerText()).replace(/\s+/g, ' ');
    A.ok(/08:30/.test(t) && /Tồn từ 24\/11/.test(t), 'hàng: ' + t);
    A.ok((await page.locator('.ag-run', { hasText: 'Chia số AI Class' }).innerText()).includes('Cop lại lần cuối'), 'không nằm trong khối Chia số');
    const c = L(page, 'Dọn bàn học', '2026-11-24');
    A.ok((await c.innerText()).includes('Tồn từ 24/11'), 'carried thiếu nhãn');
    A.ok((await page.locator('.ag-run', { hasText: 'Buổi tối của tôi' }).innerText()).includes('21:30'));
    const top = await page.locator('.ag-runs').evaluate(e => e.getBoundingClientRect().top);
    A.ok(top < 760, 'luồng hôm nay quá thấp: ' + top);
    const hh = await page.locator('.ag-pending').evaluate(e => e.getBoundingClientRect().height);
    A.ok(hh <= 60, 'dòng tồn không mảnh: ' + hh);
    h.noErrors(page);
  });

  await h.test('2. Lượt Thứ Bảy có hạng mục +1 thì vào khối Chia số của Thứ Hai, nhãn "Tồn từ 05/12"', async () => {
    const page = await h.open({ query: q('2026-12-07', '11:05'), hash: '#/agenda' });
    A.strictEqual(await page.evaluate(() => LP.date.weekdayName('2026-12-05') + '|' + LP.date.weekdayName('2026-12-07')), 'Thứ Bảy|Thứ Hai');
    const card = (await page.locator('.ag-run', { hasText: 'Chia số AI Class' }).innerText()).replace(/\s+/g, ' ');
    A.ok(card.includes('Cop lại lần cuối') && card.includes('Tồn từ 05/12'), 'Thứ Hai: ' + card.slice(0, 200));
    const page2 = await h.open({ query: q('2026-12-05', '11:05'), hash: '#/agenda' });
    A.ok(/Thứ Hai 08:30 · Cop lại lần cuối/.test(await tx(page2, '.ag-run-foot')), 'cuối thẻ Thứ Bảy');
  });

  await h.test('3. now=08:42: hạng mục 8:30 chưa tick "Trễ 12 phút"; mục đã quyết 8:30 cũng đúng giờ nên cũng trễ', async () => {
    const page = await h.open({ query: q('2026-11-25', '08:42'), hash: '#/agenda' });
    const row = page.locator('.ag-run .ag-item', { hasText: 'Chia số cho các tổ' });
    A.ok((await row.innerText()).includes('Trễ 12 phút'));
    A.ok(await row.evaluate(e => e.classList.contains('is-late')));
    A.ok((await L(page, 'Cop lại lần cuối', '2026-11-24').innerText()).includes('Trễ 12 phút'), 'mục tồn đã quyết không báo trễ');
    A.ok(!/Trễ|Đến giờ/.test(await page.locator('.ag-run .ag-item', { hasText: 'Gửi file cho TBP' }).innerText()));
    const page2 = await h.open({ query: q('2026-11-25', '09:05'), hash: '#/agenda' });
    A.strictEqual(await page2.locator('.ag-run .ag-item.is-due', { hasText: 'Gửi file cho TBP' }).count(), 1);
  });

  await h.test('4. Toàn cảnh: mục đã quyết nằm đúng giờ trên dòng thời gian kèm "Tồn từ"; không còn khối tồn', async () => {
    const page = await h.open({ hash: '#/agenda' });
    await page.click('[data-act="mode"][data-mode="overview"]');
    await wait(page);
    A.strictEqual(await page.locator('.ag-ton, .note-paper').count(), 0);
    const rows = await page.locator('.ag-tl-row').evaluateAll(els => els.map(e => e.innerText.replace(/\s+/g, ' ')));
    const cop = rows.findIndex(r => /Cop lại lần cuối/.test(r)), dep = rows.findIndex(r => /^21:30 .*Dọn bàn học.*Tồn từ 24\/11/.test(r));
    A.ok(cop >= 0 && /^08:30/.test(rows[cop]) && /Tồn từ 24\/11/.test(rows[cop]), 'Cop lại: ' + rows[cop]);
    A.ok(dep >= 0, 'Dọn bàn học (carried) không nằm trên timeline lúc 21:30');
    A.ok(cop < rows.findIndex(r => /^09:15/.test(r)), 'sai thứ tự');
    // Đặt giờ cho mục sót qua Tồn tổng: lên dòng thời gian đúng giờ, rồi Bỏ giờ thì quay lại tồn chưa xử lý
    const n0 = await pend(page);
    await page.click('.ag-pending [data-act="ton"]');
    await wait(page);
    await openAll(page);
    await ttRow(page, /Gửi báo cáo ngày[\s\S]*tồn từ 24\/11/).locator('[data-act="t-today"]').click();
    await page.fill('#tt-time', '11:30');
    await page.click('#tt-ok');
    await wait(page);
    await page.click('.ag-tt [data-act="back"]');
    await wait(page);
    const rows2 = await page.locator('.ag-tl-row').evaluateAll(els => els.map(e => e.innerText.replace(/\s+/g, ' ')));
    const g = rows2.findIndex(r => /^11:30 .*Gửi báo cáo ngày.*Tồn từ 24\/11/.test(r));
    A.ok(g > 0, 'không có dòng 11:30: ' + rows2.map(r => r.slice(0, 20)).join('|'));
    A.ok(rows2.findIndex(r => /^09:15/.test(r)) < g && g < rows2.findIndex(r => /^16:30/.test(r)), 'sai vị trí 11:30');
    A.strictEqual(await pend(page), n0 - 1);
    await page.locator('.ag-tl-row', { hasText: /11:30.*Gửi báo cáo ngày/ }).locator('[data-act="unplace"]').click();
    await wait(page);
    A.strictEqual(await pend(page), n0, 'bỏ giờ không trả về tồn chưa xử lý');
    A.strictEqual(await page.locator('.ag-tl-row', { hasText: /^11:30/ }).count(), 0);
    h.noErrors(page);
  });

  await h.test('Toàn cảnh: "~hh:mm" cho hạng mục không giờ, vạch Bây giờ, đoạn SÁNG/CHIỀU/TỐI, nhóm chưa đặt giờ', async () => {
    const page = await h.open({ hash: '#/agenda' });
    await page.evaluate(() => { const it = LP.store.find('RoutineItems', 'ri-r-baocao-2'); LP.store.upsert('RoutineItems', Object.assign({}, it, { time: '' })); });
    await page.click('[data-act="mode"][data-mode="overview"]');
    await wait(page);
    const times = await page.locator('.ag-tl-row .ag-c-time').allInnerTexts();
    A.ok(times.some(t => t.trim() === '~17:00'), 'thiếu ~17:00: ' + times.join(','));
    A.ok((await page.locator('.ag-now').innerText()).includes('Bây giờ 11:05'));
    const segs = await page.locator('.ag-seg').allInnerTexts();
    A.ok(['SÁNG', 'CHIỀU', 'TỐI'].every(s => segs.some(x => x.trim() === s)) && segs.some(s => /CHƯA ĐẶT GIỜ/.test(s)), segs.join('|'));
    const order = await page.evaluate(() => Array.from(document.querySelectorAll('.ag-seg, .ag-now')).map(e => e.className.includes('ag-now') ? 'NOW' : e.textContent.trim()).join('|'));
    A.ok(/^SÁNG\|NOW\|CHIỀU/.test(order), order);
    A.ok(await page.locator('.ag-tl-head').isVisible());
  });

  await h.test('5. Nút Muộn → sớm đảo đúng thứ tự (và nhớ lựa chọn)', async () => {
    const page = await h.open({ hash: '#/agenda' });
    await page.click('[data-act="mode"][data-mode="overview"]');
    const get = () => page.locator('.ag-tl-row .ag-c-time').allInnerTexts().then(a => a.map(s => s.trim()).filter(Boolean));
    const asc = await get();
    A.ok(asc.length >= 4);
    await page.click('[data-act="order"][data-order="desc"]');
    await wait(page);
    A.deepStrictEqual(await get(), asc.slice().reverse());
    await page.reload();
    await page.waitForFunction(() => window.LP && LP.ready === true);
    await wait(page);
    A.strictEqual(await page.locator('[data-act="order"][data-order="desc"].is-on').count(), 1);
    A.strictEqual(await page.locator('.ag-tl').count(), 1);
  });

  /* ---- Ý (4): Soát cuối ngày ---- */
  await h.test('6. Soát: "Mang sang mai" thì sáng mai mục vào luồng hôm nay (khối của nó, nhãn Tồn từ)', async () => {
    const page = await h.open({ hash: '#/agenda' });
    await page.click('[data-act="soat"]');
    await wait(page);
    const so = await tx(page, '.ag-so');
    A.ok(so.includes('Soát cuối ngày') && so.includes('Lịch tháng sẽ đánh dấu ✓ nếu không còn bỏ sót'));
    A.ok(!so.includes('Lấy số liệu từ LMS'), 'hiện mục đã tick');
    const row = page.locator('.ag-so-row', { hasText: 'Gửi file cho TBP' });
    await row.locator('[data-act="carry"]').click();
    await wait(page);
    A.strictEqual(await chk(page, 'r-chiaso', 'ri-r-chiaso-3', '2026-11-25'), 'carried|');
    A.deepStrictEqual(await page.evaluate(() => LP.logic.routines.leftovers('2026-11-26', { all: true, decided: true }).filter(e => e.title === 'Gửi file cho TBP').map(e => e.source)), ['carried']);
    await page.click('[data-act="finish"]');
    await wait(page);
    await page.click('[data-act="next"]');
    await wait(page);
    const card = (await page.locator('.ag-run', { hasText: 'Chia số AI Class' }).innerText()).replace(/\s+/g, ' ');
    A.ok(card.includes('Gửi file cho TBP') && card.includes('Tồn từ 25/11'), 'sáng mai: ' + card.slice(0, 250));
    h.noErrors(page);
  });

  await h.test('Soát: liệt kê cả mục đã quyết chưa tick (T+1, mang sang từ trước); mục đã mang sang chỉ còn Đã làm / Bỏ qua', async () => {
    const page = await h.open({ hash: '#/agenda?soat=1' });
    await wait(page);
    const cop = page.locator('.ag-so-row', { hasText: /Cop lại lần cuối/ });
    A.strictEqual(await cop.count(), 1, 'thiếu +1');
    A.ok((await cop.innerText()).includes('Tồn từ 24/11') && (await cop.innerText()).includes('Mang sang mai'));
    const car = () => page.locator('.ag-so-row', { hasText: /Tồn từ 24\/11/ }).filter({ hasText: 'Dọn bàn học' });
    A.strictEqual(await car().count(), 1, 'thiếu mục đã mang sang');
    A.ok(!(await car().innerText()).includes('Mang sang mai') && (await car().innerText()).includes('Bỏ qua hôm nay'), 'nút của mục đã mang sang');
    await car().locator('[data-act="done"]').click();
    await wait(page);
    A.strictEqual((await chk(page, 'r-toi', 'ri-r-toi-2', '2026-11-24')).split('|')[0], 'done');
    await car().locator('[data-act="undo"]').click();
    await wait(page);
    A.strictEqual((await chk(page, 'r-toi', 'ri-r-toi-2', '2026-11-24')).split('|')[0], 'carried');
  });

  await h.test('Soát: Bỏ qua có lý do, Đã làm tick bù, Hoàn tác, Chọn ngày… cho việc', async () => {
    const page = await h.open({ hash: '#/agenda?soat=1' });
    await wait(page);
    const own = t => page.locator('.ag-so-row', { hasText: t }).filter({ hasNotText: 'Tồn từ' });
    await own('Dọn bàn học').locator('[data-act="skip"]').click();
    await wait(page);
    await page.locator('input[data-why]').fill('Mệt quá');
    await page.locator('[data-act="skip-ok"]').click();
    await wait(page);
    A.strictEqual(await page.evaluate(() => { const x = LP.logic.routines.checkOf('r-toi', 'ri-r-toi-2', '2026-11-25'); return x && [x.status, x.note].join('|'); }), 'skipped|Mệt quá');
    await own('Dọn bàn học').locator('[data-act="undo"]').click();
    await wait(page);
    A.strictEqual(await page.evaluate(() => LP.logic.routines.checkOf('r-toi', 'ri-r-toi-2', '2026-11-25')), null);
    await own('Gửi báo cáo ngày').locator('[data-act="done"]').click();
    await wait(page);
    A.strictEqual((await chk(page, 'r-baocao', 'ri-r-baocao-2', '2026-11-25')).split('|')[0], 'done');
    const t = own('Lấy dữ liệu nguồn');
    A.ok((await t.innerText()).includes('Chọn ngày…'));
    await t.locator('[data-act="pick"]').click();
    await page.locator('#so-date').fill('2026-11-27');
    await page.locator('#so-date-ok').click();
    await wait(page);
    A.strictEqual(await page.evaluate(() => { const s = LP.store.find('TaskSteps', 'st-t-bcnguon-1'); return s.do_date + '|' + LP.store.find('Tasks', 't-bcnguon').carried_from; }), '2026-11-27|2026-11-25');
    await own('Đặt lịch khám sức khỏe').locator('[data-act="carry"]').click();
    await wait(page);
    A.strictEqual(await page.evaluate(() => LP.store.find('Tasks', 't-kham').do_date), '2026-11-26');
    h.noErrors(page);
  });

  await h.test('Soát: dòng cuối "Còn N mục tồn chưa xử lý · Xem" mở màn Tồn tổng', async () => {
    const page = await h.open({ hash: '#/agenda?soat=1' });
    await wait(page);
    const n = await pend(page);
    const last = await tx(page, '.ag-so-ton');
    A.ok(last.includes('Còn ' + n + ' mục tồn chưa xử lý') && last.includes('Xem'), last);
    A.ok(await page.evaluate(() => document.querySelector('.ag-so').lastElementChild.classList.contains('ag-so-ton')), 'phải là dòng cuối');
    await page.click('.ag-so-ton [data-act="ton"]');
    await wait(page);
    A.strictEqual(await page.locator('.ag-tt').count(), 1);
  });

  /* ---- Ý (6): vòng hoàn thành ---- */
  await h.test('7. Thẻ lượt tick hết (kể cả mục đã quyết) thì thu gọn, vòng tròn tăng đúng', async () => {
    const page = await h.open({ hash: '#/agenda' });
    const T = await page.evaluate(() => 7 + LP.logic.routines.leftovers('2026-11-25', { all: true, decided: true }).length + LP.logic.tasks.tasksFor('2026-11-25').length);
    A.strictEqual(T, 11);
    A.strictEqual(await ring(page), '1/11');
    A.strictEqual(await page.locator('.ag-run-done').count(), 0);
    await page.locator('.ag-run .ag-item', { hasText: 'Chia số cho các tổ' }).locator('.tick').click();
    await wait(page);
    await page.locator('.ag-run .ag-item', { hasText: 'Gửi file cho TBP' }).locator('.tick').click();
    await wait(page);
    A.strictEqual(await ring(page), '3/11');
    A.strictEqual(await page.locator('.ag-run-done').count(), 0, 'còn mục đã quyết chưa tick mà đã thu gọn');
    await L(page, 'Cop lại lần cuối', '2026-11-24').locator('.tick').click();
    await wait(page);
    A.strictEqual(await ring(page), '4/11');
    A.ok(/Chia số AI Class · xong lúc 11:05/.test(await tx(page, '.ag-run-done')));
    A.ok((await page.locator('.ag-ring').textContent()).includes(Math.round(400 / 11) + '%'));
    A.deepStrictEqual(await page.locator('.ag-runs > *').evaluateAll(els => els.map(e => e.className.includes('ag-run-done'))), [false, false, true]);
    await page.locator('.ag-run-done').click();
    await wait(page);
    await L(page, 'Cop lại lần cuối', '2026-11-24').locator('.tick').click();
    await wait(page);
    A.strictEqual(await ring(page), '3/11');
    h.noErrors(page);
  });

  await h.test('Vòng "Hoàn thành hôm nay" đếm luồng hôm nay gồm mục đã quyết; không đếm mục sót chưa quyết', async () => {
    const page = await h.open({ hash: '#/agenda' });
    const c = await page.evaluate(() => ({ dec: LP.logic.routines.leftovers('2026-11-25', { all: true, decided: true }).length, pend: LP.logic.routines.leftovers('2026-11-25', { all: true, pending: true }).length, tasks: LP.logic.tasks.tasksFor('2026-11-25').length }));
    A.strictEqual(c.dec, 2);
    A.ok(c.pend > 5, 'dữ liệu mẫu phải có nhiều mục sót: ' + c.pend);
    const total = 7 + c.dec + c.tasks;
    A.strictEqual(await ring(page), '1/' + total);
    await page.locator('.ag-tasks .ag-item', { hasText: 'Đặt lịch khám sức khỏe' }).locator('.tick').click();
    await wait(page);
    A.strictEqual(await ring(page), '2/' + total);
    await page.locator('.ag-tasks .ag-item', { hasText: 'Lấy dữ liệu nguồn' }).locator('.tick').click();
    await wait(page);
    A.strictEqual(await ring(page), '3/' + total);
    await L(page, 'Dọn bàn học', '2026-11-24').locator('.tick').click();
    await wait(page);
    A.strictEqual(await ring(page), '4/' + total);
    await L(page, 'Dọn bàn học', '2026-11-24').locator('.tick').click();
    await wait(page);
    A.strictEqual(await ring(page), '3/' + total);
    A.strictEqual((await chk(page, 'r-toi', 'ri-r-toi-2', '2026-11-24')).split('|')[0], 'carried', 'bỏ tick phải về carried, không rơi về bỏ sót');
    A.strictEqual(await pend(page), c.pend, 'bỏ tick làm đổi số mục sót');
  });

  /* ---- Ý (3): dòng mảnh và màn Tồn tổng ---- */
  await h.test('Dòng mảnh đầu trang: "N mục tồn chưa xử lý · Xử lý", không giới hạn ngày, hết mục thì ẩn', async () => {
    const page = await h.open({ hash: '#/agenda' });
    const n = await pend(page);
    A.ok(n > 5);
    const line = await tx(page, '.ag-pending');
    A.ok(line.includes(n + ' mục tồn chưa xử lý') && line.includes('Xử lý'), line);
    A.strictEqual(await page.evaluate(() => LP.logic.routines.leftovers('2026-11-25', { all: true, pending: true }).some(e => (e.since || e.fromDate) < '2026-11-01')), true, 'phải gồm cả mục cũ hơn một tháng');
    A.strictEqual(await page.locator('.ag-old, .ag-left').count(), 0);
    A.ok(await page.evaluate(() => { const a = document.querySelector('.ag-head'), p = document.querySelector('.ag-pending'), c = document.querySelector('.ag-charts'); return a.nextElementSibling === p && p.nextElementSibling === c; }), 'thứ tự đầu trang');
    await page.click('.ag-pending [data-act="ton"]');
    await wait(page);
    A.strictEqual(await page.locator('.ag-tt').count(), 1);
    const p2 = await h.open({ hash: '#/agenda' });
    await p2.evaluate(() => {
      const R = LP.logic.routines;
      R.leftovers('2026-11-25', { all: true, pending: true }).forEach(e => { if (e.kind === 'item') R.check(e.routineId, e.itemId, e.runDate, 'skipped'); else LP.logic.tasks.setCancelled(LP.store.find('Tasks', e.taskId), true); });
    });
    await wait(p2);
    A.strictEqual(await p2.locator('.ag-pending').count(), 0, 'hết mục mà dòng vẫn hiện');
  });

  await h.test('Mục đã quyết chỉ có hiệu lực tới hết ngày làm việc kế tiếp; quá hạn mà chưa tick thì thành mục sót; bỏ qua; đặt giờ chỉ đúng ngày', async () => {
    const page = await h.open({ query: q('2026-11-27', '11:05'), hash: '#/agenda' });
    const src = d => page.evaluate(dd => LP.logic.routines.leftovers(dd, { all: true }).filter(e => e.title === 'Dọn bàn học' && e.runDate === '2026-11-24').map(e => e.source), d);
    // Mục carried từ 24/11 (quyết làm 25/11): hết hạn từ 26/11
    A.deepStrictEqual(await src('2026-11-25'), ['carried']);
    A.deepStrictEqual(await src('2026-11-26'), ['missed']);
    A.strictEqual(await L(page, 'Dọn bàn học', '2026-11-24').count(), 0, 'mục quá hạn vẫn ở luồng hôm nay');
    A.ok(await page.evaluate(() => LP.logic.routines.leftovers('2026-11-27', { all: true, pending: true }).some(e => e.title === 'Dọn bàn học' && e.runDate === '2026-11-24')), 'phải thành mục sót chưa quyết');
    // Quyết lại ("Đưa vào hôm nay"): hiệu lực 27/11 và 28/11, sang 29/11 thì thành sót
    await page.evaluate(() => LP.logic.routines.check('r-toi', 'ri-r-toi-2', '2026-11-24', 'carried', { note: 'dua:2026-11-27' }));
    await wait(page);
    const row = L(page, 'Dọn bàn học', '2026-11-24');
    A.ok((await row.innerText()).includes('Tồn từ 24/11'));
    A.deepStrictEqual([await src('2026-11-28'), await src('2026-11-29')], [['carried'], ['missed']]);
    // Bỏ qua mục đã quyết: biến khỏi luồng
    await row.locator('[data-act="skip-left"]').click();
    await wait(page);
    A.strictEqual(await L(page, 'Dọn bàn học', '2026-11-24').count(), 0);
    A.strictEqual((await chk(page, 'r-toi', 'ri-r-toi-2', '2026-11-24')).split('|')[0], 'skipped');
    // Đặt giờ chỉ có hiệu lực đúng ngày: hôm sau mục vẫn đã quyết nhưng về giờ gốc
    await page.evaluate(() => LP.logic.routines.check('r-chiaso', 'ri-r-chiaso-4', '2026-11-24', 'carried', { set_time: '10:30', note: 'xep-gio:2026-11-27' }));
    await wait(page);
    A.ok((await L(page, 'Cop lại lần cuối', '2026-11-24').innerText()).includes('10:30'));
    A.strictEqual(await page.evaluate(() => LP.logic.routines.leftovers('2026-11-28', { all: true, decided: true }).filter(e => e.title === 'Cop lại lần cuối' && e.runDate === '2026-11-24').map(e => e.setTime + '|' + e.time).join()), '|08:30');
    A.strictEqual(await page.evaluate(() => LP.logic.routines.leftovers('2026-11-29', { all: true, pending: true }).filter(e => e.title === 'Cop lại lần cuối' && e.runDate === '2026-11-24').length), 1, 'quá hạn thì thành sót');
    h.noErrors(page);
  });

  await h.test('Mục đã quyết đã tick vẫn giữ trong luồng và vòng hoàn thành sau khi tải lại trang', async () => {
    const page = await h.open({ hash: '#/agenda' });
    await L(page, 'Cop lại lần cuối', '2026-11-24').locator('.tick').click();
    await wait(page);
    A.strictEqual(await ring(page), '2/11');
    await page.evaluate(() => LP.store.flush());
    await page.reload();
    await page.waitForFunction(() => window.LP && LP.ready === true);
    await wait(page);
    A.strictEqual(await ring(page), '2/11', 'tải lại làm đổi vòng');
    const row = L(page, 'Cop lại lần cuối', '2026-11-24');
    A.ok(await row.evaluate(e => e.classList.contains('is-done')), 'mục đã tick mất khỏi luồng');
    await row.locator('.tick').click();                  // bỏ tick sau khi tải lại
    await wait(page);
    A.strictEqual(await ring(page), '1/11');
    A.strictEqual(await chk(page, 'r-chiaso', 'ri-r-chiaso-4', '2026-11-24'), null, 'mục +1 bỏ tick phải về chưa xử lý');
  });

  await h.test('Mẫu khoảng ngày: mục +1 không nhân bản theo ngày; carried không trùng với mục của lượt hôm nay', async () => {
    const page = await h.open({ query: q('2026-12-10', '11:05'), hash: '#/agenda' });
    await page.evaluate(() => LP.store.upsert('RoutineItems', { id: 'ri-r-chotso-3', routine_id: 'r-chotso', sort_order: 3, title: 'Cop bảng chốt', time: '09:30', day_offset: 1, est_min: 10, note: '', link: '', valid_from: '2026-12-01', valid_to: '' }));
    const r = await page.evaluate(() => {
      const R = LP.logic.routines, n = d => R.leftovers(d, { all: true }).filter(e => e.itemId === 'ri-r-chotso-3').length;
      const before = n('2026-12-10'), since = R.leftovers('2026-12-10', { all: true }).filter(e => e.itemId === 'ri-r-chotso-3').map(e => e.since).join();
      R.check('r-chotso', 'ri-r-chotso-3', '2026-12-02', 'done');   // tick một lần trong khoảng
      return { before, since, after: n('2026-12-10'), plus: R.plusOneFor('2026-12-04').filter(m => m.routine.id === 'r-chotso').length };
    });
    A.strictEqual(r.before, 1, 'mục +1 của mẫu khoảng ngày bị nhân bản: ' + r.before);
    A.strictEqual(r.since, '2026-12-01', 'ngày gốc phải là đầu khoảng');
    A.strictEqual(r.after, 0, 'đã tick trong khoảng mà vẫn tồn');
    A.strictEqual(r.plus, 0, 'vẫn sinh mục +1 sau khi đã tick trong khoảng');
    // carried trong cùng khoảng: chỉ là mục của lượt hôm nay, không có bản decided trùng
    const page2 = await h.open({ query: q('2026-12-02', '11:05'), hash: '#/agenda' });
    const c = await page2.evaluate(() => {
      LP.logic.routines.check('r-chotso', 'ri-r-chotso-1', '2026-12-01', 'carried', { note: 'dua:2026-12-01' });
      return LP.logic.routines.leftovers('2026-12-02', { all: true, decided: true }).filter(e => e.routineId === 'r-chotso').length;
    });
    A.strictEqual(c, 0, 'carried của mẫu khoảng ngày bị trùng với mục của lượt hôm nay');
    await wait(page2);
    A.strictEqual(await page2.locator('.ag-run', { hasText: 'Chốt số tháng' }).locator('.ag-item', { hasText: 'Đối soát số liệu tháng' }).count(), 1);
  });

  await h.test('Dòng mảnh và Soát luôn đếm theo hôm nay, kể cả khi xem ngày sau', async () => {
    const page = await h.open({ hash: '#/agenda' });
    const n = await pend(page);
    await page.click('[data-act="next"]');
    await wait(page);
    A.ok((await tx(page, '.ag-pending')).includes(n + ' mục tồn chưa xử lý'), await tx(page, '.ag-pending'));
    // Soát: Mang sang mai ghi 'dua:' ngày soát; Bỏ qua xóa giờ đã đặt
    await page.goto(h.INDEX + '?' + q('2026-11-25', '11:05') + '#/agenda?soat=1');
    await page.waitForFunction(() => window.LP && LP.ready === true);
    await wait(page);
    await page.locator('.ag-so-row', { hasText: 'Gửi file cho TBP' }).locator('[data-act="carry"]').click();
    await wait(page);
    A.strictEqual(await page.evaluate(() => LP.logic.routines.checkOf('r-chiaso', 'ri-r-chiaso-3', '2026-11-25').note), 'dua:2026-11-25');
    A.deepStrictEqual(await page.evaluate(() => ['2026-11-26', '2026-11-27'].map(d => LP.logic.routines.leftovers(d, { all: true }).filter(e => e.title === 'Gửi file cho TBP' && e.runDate === '2026-11-25').map(e => e.source).join())), ['carried', 'missed']);
  });

  await h.test('leftovers(): khối mặc định 7 ngày, {all:true} lấy tất cả; việc tồn không bao giờ hết hạn', async () => {
    const page = await h.open({ query: q('2026-12-20', '11:05'), hash: '#/agenda' });
    const r = await page.evaluate(() => {
      const R = LP.logic.routines, rec = R.leftovers('2026-12-20'), all = R.leftovers('2026-12-20', { all: true });
      return { oldRec: rec.some(e => e.runDate && e.runDate < '2026-12-13'), taskRec: rec.some(e => e.title === 'Trả lời email đối tác'),
        taskAll: all.some(e => e.title === 'Trả lời email đối tác'), oldAll: all.some(e => e.runDate === '2026-11-24'), tooOld: all.some(e => e.runDate && e.runDate < '2026-09-20') };
    });
    A.strictEqual(r.oldRec, false);
    A.strictEqual(r.taskRec, false);
    A.strictEqual(r.taskAll, true);
    A.strictEqual(r.oldAll, true);
    A.strictEqual(r.tooOld, false, 'tạo tồn cho ngày trước khi mẫu tồn tại');
  });

  await h.test('Tồn tổng: 3 số, danh sách cũ nhất trước gom theo tuần, không thêm tab', async () => {
    const page = await h.open({ hash: '#/agenda?ton=1' });
    await wait(page);
    await openAll(page);
    const info = await page.evaluate(() => {
      const L = LP.logic.routines.leftovers('2026-11-25', { all: true, pending: true });
      const from = e => e.kind === 'item' ? (e.since || e.runDate) : e.fromDate, cnt = {};
      L.forEach(e => { const n = e.kind === 'item' ? LP.logic.routines.byId(e.routineId).name : (e.ref.kind === 'canhan' ? 'Việc cá nhân' : 'Việc ad-hoc'); cnt[n] = (cnt[n] || 0) + 1; });
      const top = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
      return { n: L.length, oldest: Math.max.apply(null, L.map(e => LP.date.diff('2026-11-25', from(e)))), top, topN: cnt[top] };
    });
    const stats = (await page.locator('.ag-tt-stat').allInnerTexts()).map(t => t.replace(/\s+/g, ' '));
    A.strictEqual(stats.length, 3);
    A.ok(stats[0].includes('Tổng mục tồn') && stats[0].includes(String(info.n)), stats[0]);
    A.ok(stats[1].includes('Mục cũ nhất') && stats[1].includes(info.oldest + ' ngày'), stats[1]);
    A.ok(stats[2].includes('Khối tồn nhiều nhất') && stats[2].includes(info.top) && stats[2].includes(String(info.topN)), stats[2]);
    A.strictEqual(await page.locator('.ag-tt-row').count(), info.n);
    const heads = await page.locator('.ag-tt-week h2').allInnerTexts();
    A.ok(heads.length >= 3 && heads.every(x => /^Tuần \d\d\/\d\d – \d\d\/\d\d · \d+ mục$/.test(x.trim())), heads.join('|'));
    A.strictEqual(heads.reduce((n, x) => n + +/· (\d+) mục/.exec(x)[1], 0), info.n, 'tổng các tuần phải bằng tổng mục');
    const ages = await page.locator('.ag-tt-row .ag-sub').allInnerTexts().then(a => a.map(x => +/(\d+) ngày\s*$/.exec(x)[1]));
    A.deepStrictEqual(ages, ages.slice().sort((a, b) => b - a), 'không xếp cũ nhất trước');
    A.strictEqual(await page.locator('.tabbar .tab').count(), 5);
  });

  await h.test('Tồn tổng: lọc theo loại, khối, khoảng ngày', async () => {
    const page = await h.open({ hash: '#/agenda?ton=1' });
    await openAll(page);
    const total = await page.locator('.ag-tt-row').count();
    await page.click('[data-act="filter"][data-f="type"][data-v="task"]');
    await openAll(page);
    const tasks = await page.locator('.ag-tt-row').allInnerTexts();
    A.ok(tasks.length === 1 && tasks[0].includes('Trả lời email đối tác') && tasks[0].includes('Hủy việc'), tasks.join('|'));
    await page.click('[data-act="filter"][data-f="type"][data-v="item"]');
    await openAll(page);
    A.strictEqual(await page.locator('.ag-tt-row').count(), total - 1);
    await page.click('[data-act="filter"][data-f="type"][data-v=""]');
    await page.selectOption('#tt-block', 'Báo cáo cuối ngày');
    await openAll(page);
    const blk = await page.locator('.ag-tt-row .ag-sub').allInnerTexts();
    A.ok(blk.length > 0 && blk.every(x => x.replace(/^\s*·\s*/, '').startsWith('Báo cáo cuối ngày')), blk.slice(0, 2).join('|'));
    await page.selectOption('#tt-block', '');
    await page.fill('[data-f="from"]', '2026-11-20');
    await page.fill('[data-f="to"]', '2026-11-24');
    await openAll(page);
    const days = await page.locator('.ag-tt-row .ag-sub').allInnerTexts().then(a => a.map(x => /tồn từ (\d\d\/\d\d)/.exec(x)[1]));
    A.ok(days.length > 0 && days.every(d => d >= '20/11' && d <= '24/11'), days.join(','));
    h.noErrors(page);
  });

  await h.test('Tồn tổng: Đã làm / Bỏ qua / Đưa vào hôm nay cho từng mục, có Hoàn tác; mục đưa vào hôm nay vào luồng đúng khối', async () => {
    const page = await h.open({ hash: '#/agenda?ton=1' });
    await openAll(page);
    await ttRow(page, /Lấy số liệu từ LMS[\s\S]*tồn từ 24\/11/).locator('[data-act="t-done"]').click();
    await wait(page);
    A.strictEqual((await chk(page, 'r-chiaso', 'ri-r-chiaso-1', '2026-11-24')).split('|')[0], 'done');
    await ttRow(page, /Gửi báo cáo ngày[\s\S]*tồn từ 24\/11/).locator('[data-act="t-skip"]').click();
    await wait(page);
    A.strictEqual(await chk(page, 'r-baocao', 'ri-r-baocao-2', '2026-11-24'), 'skipped|');
    await page.locator('.toast [data-t="act"]').click();
    await wait(page);
    A.strictEqual(await chk(page, 'r-baocao', 'ri-r-baocao-2', '2026-11-24'), null, 'hoàn tác phải xóa dòng ghi nhận');
    await ttRow(page, /Tổng hợp doanh số[\s\S]*tồn từ 20\/11/).locator('[data-act="t-today"]').click();
    await page.fill('#tt-time', '15:00');
    await page.click('#tt-ok');
    await wait(page);
    A.strictEqual(await chk(page, 'r-baocao', 'ri-r-baocao-1', '2026-11-20'), 'carried|15:00');
    A.strictEqual(await ttRow(page, /Tổng hợp doanh số[\s\S]*tồn từ 20\/11/).count(), 0, 'vẫn còn trong Tồn tổng');
    await ttRow(page, /Gửi báo cáo ngày[\s\S]*tồn từ 24\/11/).locator('[data-act="t-today"]').click();
    await page.fill('#tt-time', '');
    await page.click('#tt-ok');
    await wait(page);
    A.strictEqual(await chk(page, 'r-baocao', 'ri-r-baocao-2', '2026-11-24'), 'carried|');
    await ttRow(page, /Trả lời email đối tác/).locator('[data-act="t-today"]').click();
    await wait(page);
    A.strictEqual(await page.evaluate(() => { const x = LP.store.find('Tasks', 't-email'); return x.do_date + '|' + x.carried_from; }), '2026-11-25|2026-11-24');
    await page.locator('.toast [data-t="act"]').click();
    await wait(page);
    await ttRow(page, /Trả lời email đối tác/).locator('[data-act="t-skip"]').click();
    await wait(page);
    A.strictEqual(await page.evaluate(() => LP.store.find('Tasks', 't-email').status), 'cancelled');
    await page.locator('.toast [data-t="act"]').click();
    await wait(page);
    await ttRow(page, /Trả lời email đối tác/).locator('[data-act="t-today"]').click();
    await wait(page);
    await page.click('.ag-tt [data-act="back"]');
    await wait(page);
    const bao = (await page.locator('.ag-run', { hasText: 'Báo cáo cuối ngày' }).innerText()).replace(/\s+/g, ' ');
    A.ok(/15:00.*Tổng hợp doanh số.*Tồn từ 20\/11/.test(bao), 'khối Báo cáo: ' + bao.slice(0, 250));
    const ad = (await page.locator('.ag-tasks', { hasText: 'Ad-hoc hôm nay' }).first().innerText()).replace(/\s+/g, ' ');
    A.ok(/Trả lời email đối tác/.test(ad) && /Tồn từ 24\/11/.test(ad), 'khối Ad-hoc: ' + ad.slice(0, 200));
    h.noErrors(page);
  });

  await h.test('Tồn tổng: chọn nhiều và chọn cả tuần để Bỏ qua hàng loạt (có xác nhận và Hoàn tác)', async () => {
    const page = await h.open({ hash: '#/agenda?ton=1' });
    A.ok(await page.locator('[data-act="bulk-skip"]').isDisabled());
    // Chọn cả tuần ngay cả khi tuần đang thu gọn
    const w0 = await page.locator('.ag-tt-week').first().locator('h2').innerText();
    const n0 = +/· (\d+) mục/.exec(w0)[1];
    await page.locator('.ag-tt-week').first().locator('[data-selweek]').check();
    A.ok((await tx(page, '.ag-tt-n')).includes('Đã chọn ' + n0), await tx(page, '.ag-tt-n'));
    A.strictEqual(await page.locator('.ag-tt-row').count(), 0, 'chọn tuần không được tự mở tuần');
    const pend0 = await pend(page);
    await page.click('[data-act="bulk-skip"]');
    await page.locator('.modal [data-ans="1"]').click();
    await wait(page);
    A.strictEqual(await pend(page), pend0 - n0, 'bỏ qua cả tuần');
    await page.locator('.toast [data-t="act"]').click();
    await wait(page);
    A.strictEqual(await pend(page), pend0, 'hoàn tác hàng loạt không khôi phục');
    // Chọn lẻ từng mục sau khi mở tuần, và chọn tất cả đang lọc
    await openAll(page);
    for (let i = 0; i < 3; i++) await page.locator('.ag-tt-row input[type="checkbox"]').nth(i).check();
    A.ok((await tx(page, '.ag-tt-n')).includes('Đã chọn 3'));
    await page.click('[data-act="filter"][data-f="type"][data-v="task"]');
    await wait(page);
    await page.locator('[data-selall]').check();
    A.ok(await page.locator('[data-selall]').isChecked() && +/Đã chọn (\d+)/.exec(await tx(page, '.ag-tt-n'))[1] >= 3, 'chọn tất cả đang lọc');
  });

  await h.test('Tồn tổng gọn: tuần thu gọn mặc định, bấm mới mở; mỗi mục một dòng, 3 nút ở cuối dòng; bộ lọc một hàng', async () => {
    const page = await h.open({ hash: '#/agenda?ton=1' });
    A.strictEqual(await page.locator('.ag-tt-row').count(), 0, 'tuần phải thu gọn mặc định');
    const first = page.locator('.ag-tt-wtoggle').first();
    A.strictEqual(await first.getAttribute('aria-expanded'), 'false');
    const n = +/· (\d+) mục/.exec(await first.innerText())[1];
    await first.click();
    await wait(page);
    A.strictEqual(await page.locator('.ag-tt-row').count(), n, 'mở tuần phải hiện đủ mục');
    await page.locator('.ag-tt-wtoggle').first().click();
    await wait(page);
    A.strictEqual(await page.locator('.ag-tt-row').count(), 0, 'bấm lần nữa phải thu gọn');
    await page.locator('.ag-tt-wtoggle').first().click();
    await wait(page);
    // Một dòng: tên · khối · tồn từ dd/mm · N ngày, các nút ở cuối dòng
    const row = page.locator('.ag-tt-row').first();
    const txt = (await row.locator('.ag-tt-line').innerText()).replace(/\s+/g, ' ');
    A.ok(/^.+ · .+ · tồn từ \d\d\/\d\d · \d+ ngày$/.test(txt), txt);
    const geo = await row.evaluate(e => { const r = e.getBoundingClientRect(), l = e.querySelector('.ag-tt-line').getBoundingClientRect(), b = e.querySelector('.ag-tt-btns').getBoundingClientRect(); return { h: r.height, lineY: l.top, btnY: b.top, btnX: b.left, lineX: l.left, rowR: r.right, btnR: b.right }; });
    A.ok(geo.h <= 64, 'dòng cao ' + geo.h);
    A.ok(Math.abs(geo.lineY - geo.btnY) < 20 && geo.btnX > geo.lineX + 150 && geo.rowR - geo.btnR < 12, 'nút không nằm cuối dòng: ' + JSON.stringify(geo));
    A.deepStrictEqual(await row.locator('.ag-tt-btns .btn').allInnerTexts().then(a => a.map(x => x.trim())).then(a => [a[0], a[2]]), ['Đã làm', 'Đưa vào hôm nay']);
    // Bộ lọc một hàng
    const tops = await page.locator('.ag-tt-filters').evaluate(e => Array.from(e.querySelectorAll('.chips, #tt-block, [data-f="from"], [data-f="to"]')).map(x => Math.round(x.getBoundingClientRect().top)));
    A.ok(Math.max.apply(null, tops) - Math.min.apply(null, tops) <= 8, 'bộ lọc nhiều hàng: ' + tops.join(','));
    A.ok(await page.locator('.ag-tt-filters').evaluate(e => e.getBoundingClientRect().height) <= 70, 'bộ lọc cao');
  });

  await h.test('Không giới hạn 120 ngày: mục Daily sót bao lâu cũng vẫn tính tồn', async () => {
    const page = await h.open({ hash: '#/agenda' });
    const r = await page.evaluate(() => {
      LP.store.upsert('Routines', { id: 'r-cu', name: 'Việc Daily cũ', group: 'cong_viec', repeat: 'weekday', weekdays: '1,2,3,4,5', month_from: '', month_to: '', done_before: '', importance: 1, doc_id: '', heading_id: '', active: 'TRUE', sort_order: 9, created_at: '2026-03-02 08:00' });
      LP.store.upsert('RoutineItems', { id: 'ri-cu-1', routine_id: 'r-cu', sort_order: 1, title: 'Việc cũ', time: '09:00', day_offset: 0, est_min: 5, note: '', link: '', valid_from: '', valid_to: '' });
      const L = LP.logic.routines.leftovers('2026-11-25', { all: true, pending: true }).filter(e => e.routineId === 'r-cu');
      return { n: L.length, first: L.map(e => e.since).sort()[0] };
    });
    A.strictEqual(r.first, '2026-03-02', 'phải tra ngược tới ngày tạo mẫu: ' + r.first);
    A.ok(r.n > 150, 'số mục sót: ' + r.n);
    // Màn Tồn tổng: tuần cũ nhất đứng đầu, và dọn được bằng chọn cả tuần + Bỏ qua
    await page.evaluate(() => LP.router.go('agenda', { ton: '1' }));
    await wait(page);
    A.strictEqual((await page.locator('.ag-tt-week h2').first().innerText()).split(' · ')[0], 'Tuần 02/03 – 08/03');
    await page.locator('.ag-tt-week').first().locator('[data-selweek]').check();
    await page.click('[data-act="bulk-skip"]');
    await page.locator('.modal [data-ans="1"]').click();
    await wait(page);
    A.ok(await page.evaluate(() => LP.logic.routines.leftovers('2026-11-25', { all: true, pending: true }).filter(e => e.routineId === 'r-cu').length) < r.n, 'chưa dọn được');
  });

  await h.test('Số "mục tồn chưa xử lý" khớp giữa Agenda, Soát và Tồn tổng (kể cả sau khi đưa một mục vào hôm nay)', async () => {
    const page = await h.open({ hash: '#/agenda' });
    await page.evaluate(() => LP.logic.routines.check('r-baocao', 'ri-r-baocao-1', '2026-11-20', 'carried', { set_time: '15:30', note: 'xep-gio:2026-11-25' }));
    await wait(page);
    const n = await pend(page);
    A.ok((await tx(page, '.ag-pending')).includes(n + ' mục tồn chưa xử lý'));
    await page.goto(h.INDEX + '?' + q('2026-11-25', '11:05') + '#/agenda?soat=1');
    await page.waitForFunction(() => window.LP && LP.ready === true);
    await wait(page);
    A.ok((await tx(page, '.ag-so-ton')).includes('Còn ' + n + ' mục'));
    await page.click('.ag-so-ton [data-act="ton"]');
    await wait(page);
    await openAll(page);
    A.ok((await tx(page, '.ag-tt-stat')).includes(String(n)));
    A.strictEqual(await page.locator('.ag-tt-row').count(), n);
  });

  await h.test('Mẫu khoảng ngày: ngày gốc trong Tồn tổng là ngày đầu khoảng, không nhảy theo ngày', async () => {
    const r = await (await h.open({ query: q('2026-12-10', '11:05'), hash: '#/agenda' })).evaluate(() => {
      const R = LP.logic.routines;
      return ['2026-12-10', '2026-12-11'].map(d => R.leftovers(d, { all: true }).filter(e => e.routineId === 'r-chotso').map(e => e.itemId + '@' + e.since));
    });
    A.deepStrictEqual(r[0], ['ri-r-chotso-1@2026-12-01', 'ri-r-chotso-2@2026-12-01']);
    A.deepStrictEqual(r[1], r[0]);
    const page = await h.open({ query: q('2026-12-10', '11:05'), hash: '#/agenda?ton=1' });
    await openAll(page);
    const row = await ttRow(page, /Đối soát số liệu tháng/).innerText();
    A.ok(/tồn từ 01\/12/.test(row) && /9 ngày/.test(row), row.replace(/\s+/g, ' '));
  });

  /* ---- Ý (5): Hủy việc ---- */
  await h.test('Hủy việc: thoát khỏi tồn, Việc hôm nay, thống kê; Hoàn tác khôi phục đúng trạng thái cũ; việc đã xong không có nút Hủy', async () => {
    const page = await h.open({ hash: '#/agenda?ton=1' });
    await openAll(page);
    await ttRow(page, /Trả lời email đối tác/).locator('[data-act="t-skip"]').click();
    await wait(page);
    const r = await page.evaluate(() => ({ st: LP.store.find('Tasks', 't-email').status,
      left: LP.logic.routines.leftovers('2026-11-25', { all: true }).some(e => e.title === 'Trả lời email đối tác'),
      adhoc: LP.stats.adhocStatus('2026-11-01', '2026-11-30').total }));
    A.strictEqual(r.st, 'cancelled');
    A.strictEqual(r.left, false);
    await page.locator('.toast [data-t="act"]').click();
    await wait(page);
    A.strictEqual(await page.evaluate(() => LP.store.find('Tasks', 't-email').status), 'todo');
    A.strictEqual(await page.evaluate(() => LP.stats.adhocStatus('2026-11-01', '2026-11-30').total), r.adhoc + 1, 'thống kê vẫn đếm việc đã hủy');
    await page.goto(h.INDEX + '?' + q('2026-11-25', '11:05') + '#/agenda');
    await page.waitForFunction(() => window.LP && LP.ready === true);
    await wait(page);
    const kham = () => page.locator('.ag-tasks .ag-item', { hasText: 'Đặt lịch khám sức khỏe' });
    await kham().locator('[data-act="more"]').click();
    await page.locator('[data-m="cancel"]').click();
    await wait(page);
    A.strictEqual(await kham().count(), 0, 'việc hủy vẫn trong luồng hôm nay');
    await page.locator('.toast [data-t="act"]').click();
    await wait(page);
    A.strictEqual(await kham().count(), 1);
    await kham().locator('.tick').click();
    await wait(page);
    await kham().locator('[data-act="more"]').click();
    A.ok(!(await tx(page, '.modal')).includes('Hủy việc'));
    await page.keyboard.press('Escape');
    const kept = await page.evaluate(() => {
      const t = LP.store.find('Tasks', 't-kham'), prev = Object.assign({}, t);
      LP.logic.tasks.setCancelled(t, true); LP.store.upsert('Tasks', prev);
      const x = LP.store.find('Tasks', 't-kham'); return x.status + '|' + (x.done_at === prev.done_at);
    });
    A.strictEqual(kept, 'done|true');
    h.noErrors(page);
  });

  /* ---- Giao diện chung ---- */
  await h.test('8. 390px và 1280px không cuộn ngang, không lỗi JS (Agenda, Toàn cảnh, Soát, Tồn tổng; sáng và tối)', async () => {
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

  await h.test('Dải 3 biểu đồ: vòng tròn, tiến độ theo khối (Ad-hoc, Cá nhân), 6 ngày làm việc', async () => {
    const page = await h.open({ hash: '#/agenda' });
    A.strictEqual(await page.locator('.ag-chart').count(), 3);
    const facts = await tx(page, '.ag-facts');
    A.ok(/Quỹ Personal 20p \/ 1h30/.test(facts) && /Giờ chen ngang 30p/.test(facts), facts);
    const blk = (await page.locator('.ag-blk').allInnerTexts()).map(b => b.replace(/\n/g, ' '));
    A.ok(blk.some(b => /Chia số AI Class\s+1\/4/.test(b)), blk.join('|'));
    A.ok(blk.some(b => /^Ad-hoc hôm nay\s+0\/1/.test(b)) && blk.some(b => /^Personal hôm nay\s+0\/1/.test(b)), 'thiếu khối Ad-hoc / Cá nhân: ' + blk.join('|'));
    A.ok(!blk.some(b => b.includes('Từ hôm qua')), 'còn khối Từ hôm qua');
    A.strictEqual(await page.locator('.ag-col').count(), 6);
    A.strictEqual(await page.locator('.ag-col-bar.is-now').count(), 1);
    await page.evaluate(() => { ['ri-r-chiaso-2', 'ri-r-chiaso-3'].forEach(i => LP.logic.routines.check('r-chiaso', i, '2026-11-25', 'done')); LP.logic.routines.check('r-chiaso', 'ri-r-chiaso-4', '2026-11-24', 'done'); });
    await wait(page);
    A.ok(/b-ok/.test(await page.locator('.ag-blk', { hasText: 'Chia số AI Class' }).locator('.bar14 > span').getAttribute('class')));
  });

  await h.test('Checklist: thẻ cố định, thứ tự theo giờ, Ghi chú mở tấm trượt, còn N ngày', async () => {
    const page = await h.open({ hash: '#/agenda' });
    A.deepStrictEqual(await page.locator('.ag-run h2').allInnerTexts(), ['Chia số AI Class', 'Báo cáo cuối ngày', 'Buổi tối của tôi']);
    A.ok((await tx(page, '.ag-run')).includes('1/4'));
    await page.locator('[data-act="doc"]').first().click();
    await wait(page);
    const sheet = await tx(page, '.modal');
    A.ok(sheet.includes('Hướng dẫn chia số AI Class') && sheet.includes('Lấy số liệu từ LMS lúc 8h'), sheet.slice(0, 120)); // tài liệu hiện đủ có định dạng (P3-2), mục được cuộn tới và tô sáng
    A.ok((await page.locator('.modal .is-hit').count()) >= 1, 'mục gắn không được tô sáng');
    const p2 = await h.open({ query: q('2026-12-02', '09:00'), hash: '#/agenda' });
    A.ok((await tx(p2, '.ag-runs')).includes('còn 2 ngày'), (await tx(p2, '.ag-runs')).slice(0, 200));
  });

  await h.test('Việc hôm nay: chia khối Ad-hoc / Cá nhân, hàng đủ thông tin, tick bước con, menu ⋯, đổi ngày làm', async () => {
    const page = await h.open({ hash: '#/agenda' });
    A.deepStrictEqual(await page.locator('.ag-tasks h2').allInnerTexts(), ['Ad-hoc hôm nay', 'Personal hôm nay']);
    const row = page.locator('.ag-tasks .ag-item', { hasText: 'Lấy dữ liệu nguồn' });
    const t = (await row.innerText()).replace(/\s+/g, ' ');
    A.ok(/Người đặt: TBP Sales/.test(t) && /Hạn 27\/11/.test(t) && /bước 0\/3/.test(t), t);
    A.strictEqual(await row.locator('.hearts .icon').count(), 3);
    A.strictEqual(await row.locator('.urg-khan').count(), 1);
    await row.locator('.tick').click();
    await wait(page);
    A.ok((await page.locator('.ag-tasks .ag-item', { hasText: 'Lấy dữ liệu nguồn' }).innerText()).includes('bước 1/3'));
    await page.locator('.ag-tasks .ag-item', { hasText: 'Đặt lịch khám sức khỏe' }).locator('[data-act="more"]').click();
    const menu = await tx(page, '.modal');
    A.ok(['Đổi ngày làm', 'Sửa', 'Mở ghi chú', 'Hủy việc'].every(s => menu.includes(s)), menu);
    await page.locator('[data-m="date"]').click();
    await page.locator('#ag-newdate').fill('2026-11-28');
    await page.locator('#ag-newdate-ok').click();
    await wait(page);
    A.strictEqual(await page.evaluate(() => LP.store.find('Tasks', 't-kham').do_date), '2026-11-28');
    h.noErrors(page);
  });

  await h.test('Thói quen: chip tick nhanh, lửa chuỗi', async () => {
    const page = await h.open({ hash: '#/agenda' });
    const chip = () => page.locator('.ag-habits .chip', { hasText: 'Chạy bộ' });
    A.strictEqual(await chip().getAttribute('aria-pressed'), 'false');
    await chip().click();
    await wait(page);
    A.strictEqual(await chip().getAttribute('aria-pressed'), 'true');
    const water = page.locator('.ag-habits .chip', { hasText: 'Uống nước' });
    A.ok(/5/.test(await water.innerText()) && await water.locator('.icon').count() >= 1);
  });

  await h.test('Đầu trang: ‹ › đổi ngày, ngày đã qua chỉ xem, Đánh dấu ngày nghỉ', async () => {
    const page = await h.open({ hash: '#/agenda' });
    await page.click('[data-act="prev"]');
    await wait(page);
    A.ok((await tx(page, '.ag-head')).includes('Thứ Ba, 24/11/2026') && (await tx(page, '.ag-head')).includes('Đã qua · chỉ xem'));
    A.strictEqual(await page.locator('.tick:not([disabled])').count(), 0);
    A.strictEqual(await page.locator('[data-act="off"], .ag-pending').count(), 0);
    await page.click('[data-act="today"]');
    await wait(page);
    await page.click('[data-act="off"]');
    await page.locator('.modal [data-ans="1"]').click();
    await wait(page);
    A.ok((await tx(page, '.ag-head')).includes('Ngày nghỉ') && (await tx(page, '.ag-runs')).includes('Ngày nghỉ'), 'ngày nghỉ vẫn có lượt');
    await page.click('[data-act="off"]');
    await page.locator('.modal [data-ans="1"]').click();
    await wait(page);
    A.ok(await page.locator('.ag-run').count() >= 3);
  });

  await h.test('Thông báo tới giờ: báo khi tới giờ, không báo nếu đã tick trước', async () => {
    const page = await h.open({ query: q('2026-11-25', '09:16'), hash: '#/agenda' });
    await wait(page);
    A.ok((await page.locator('.toast').first().innerText()).includes('Gửi file cho TBP'));
    const p2 = await h.open({ query: q('2026-11-25', '09:14'), hash: '#/cai-dat' });
    await p2.evaluate(() => { LP.logic.routines.check('r-chiaso', 'ri-r-chiaso-3', '2026-11-25', 'done'); return LP.store.flush(); });
    await p2.goto(h.INDEX + '?' + q('2026-11-25', '09:16') + '#/agenda');
    await p2.waitForFunction(() => window.LP && LP.ready === true);
    await p2.waitForTimeout(150);
    A.strictEqual(await p2.locator('.toast').count(), 0, 'báo dù đã tick');
    const p3 = await h.open({ query: q('2026-11-25', '09:40'), hash: '#/agenda' });
    A.strictEqual(await p3.locator('.toast').count(), 0, 'báo quá muộn');
  });

  await h.test('Toàn cảnh: các cột Giờ | Tên | Thuộc | Mức độ | Hạn | Trạng thái', async () => {
    const page = await h.open({ hash: '#/agenda' });
    await page.click('[data-act="mode"][data-mode="overview"]');
    await wait(page);
    A.strictEqual((await page.locator('.ag-tl-head span').allInnerTexts()).join('|'), 'Giờ|Tên|Thuộc|Mức độ|Hạn|Trạng thái');
    const row = (await page.locator('.ag-tl-row', { hasText: 'Chia số cho các tổ' }).innerText()).replace(/\s+/g, ' ');
    A.ok(/08:30/.test(row) && /Chia số AI Class/.test(row) && /trước 09:30/.test(row) && /Trễ 2h35/.test(row), row);
    A.ok(/Xong/.test((await page.locator('.ag-tl-row', { hasText: 'Lấy số liệu từ LMS' }).innerText()).replace(/\s+/g, ' ')));
    await page.locator('.ag-tl-row', { hasText: 'Chia số cho các tổ' }).locator('.tick').click();
    await wait(page);
    A.ok(/Xong/.test(await page.locator('.ag-tl-row', { hasText: 'Chia số cho các tổ' }).innerText()));
  });
};

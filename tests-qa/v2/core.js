/* V2 · test khung chung (Giai đoạn 0): ngày giờ, lượt, +1, khoảng ngày, tồn, độ khẩn, quỹ giờ, thống kê, tìm kiếm, giao diện khung. */
const fs = require('fs');
const path = require('path');

module.exports = async function (h) {
  const A = h.assert;
  const root = path.resolve(__dirname, '../..');
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');

  /* ---------- Tĩnh: tệp ---------- */
  await h.test('tokens.css chép nguyên 3 khối :root từ web cũ', async () => {
    // Phần 6: V2 đổi phông sang Quicksand, nên chỉ hai dòng --font và --display được khác web cũ
    const skip = l => !/^\s*--(font|display):/.test(l);
    const old = read('src/css/style.css').split('\n').slice(1, 76).filter(skip).join('\n').trim();
    const nw = read('src/v2/css/tokens.css').split('\n').slice(1).filter(skip).join('\n').trim();
    A.strictEqual(nw, old);
  });
  await h.test('Code.gs V2 có đủ 14 sheet, action load/save/remove và mã bí mật', async () => {
    const gs = read('apps-script-v2/Code.gs');
    ['Routines', 'RoutineItems', 'RoutineChecks', 'Tasks', 'TaskSteps', 'Habits', 'HabitLogs', 'Goals', 'Reviews', 'Interruptions', 'DaysOff', 'Settings', 'Docs', 'DocChunks']
      .forEach(n => A.ok(new RegExp('^  ' + n + ':', 'm').test(gs), 'thiếu sheet ' + n));
    ['function setup', "a === 'load'", "a === 'save'", "a === 'remove'", "getProperty('TOKEN')", 'BAD_TOKEN'].forEach(s => A.ok(gs.includes(s), 'thiếu ' + s));
    ['day_offset', 'done_before', 'carried_from', 'set_time', 'progress_mode', 'heading_id'].forEach(c => A.ok(gs.includes("'" + c + "'"), 'thiếu cột ' + c));
  });
  await h.test('Mọi file css V2 cân dấu ngoặc nhọn', async () => {
    fs.readdirSync(path.join(root, 'src/v2/css')).forEach(f => {
      const t = read('src/v2/css/' + f).replace(/\/\*[\s\S]*?\*\//g, '');
      A.strictEqual((t.match(/\{/g) || []).length, (t.match(/\}/g) || []).length, f + ' lệch dấu {}');
    });
  });
  await h.test('Không viết thẳng mã màu trong css/js lõi (trừ tokens, hoa)', async () => {
    const files = ['src/v2/css/base.css'].concat(fs.readdirSync(path.join(root, 'src/v2/js/core')).filter(f => !/^(flowers|cute|mock-data)\.js$/.test(f)).map(f => 'src/v2/js/core/' + f));
    files.forEach(f => { const m = read(f).match(/(^|[^'"\w-])#[0-9a-fA-F]{3,6}\b/g); A.ok(!m, f + ' có mã màu ' + (m && m[0])); });
  });

  /* ---------- Ngày giờ và logic (chạy trong trình duyệt) ---------- */
  const page = await h.open({ w: 1280 });
  const ev = fn => page.evaluate(fn);

  await h.test('date: ngày làm việc bỏ Chủ nhật và ngày nghỉ', async () => {
    const r = await ev(() => ({
      a: LP.date.addWorkdays('2026-11-27', 1), b: LP.date.addWorkdays('2026-11-28', 1), c: LP.date.prevWorkday('2026-12-01'),
      off: LP.date.isWorkday('2026-11-30'), sun: LP.date.isWorkday('2026-11-29'), sat: LP.date.isWorkday('2026-11-28'),
      today: LP.date.today(), now: LP.date.now(), fmt: LP.date.fmt('2026-11-05'), dow: LP.date.dow('2026-11-25')
    }));
    A.deepStrictEqual(r, { a: '2026-11-28', b: '2026-12-01', c: '2026-11-28', off: false, sun: false, sat: true, today: '2026-11-25', now: '11:05', fmt: '05/11', dow: 3 });
  });

  await h.test('+1: hôm nay có "Cop lại lần cuối" của lượt 24/11, nằm trong Từ hôm qua', async () => {
    const r = await ev(() => {
      const it = LP.logic.routines.itemsFor('2026-11-25').filter(x => x.item.title === 'Cop lại lần cuối')[0];
      const lo = LP.logic.routines.leftovers('2026-11-25').filter(x => x.source === 'plus1')[0];
      return { it: it && [it.runDate, it.plus1, it.time, it.date], lo: lo && lo.label };
    });
    A.deepStrictEqual(r, { it: ['2026-11-24', true, '08:30', '2026-11-25'], lo: 'Chia số AI Class 24/11' });
  });

  await h.test('Từ hôm qua gồm: +1, bỏ sót (tính ra), mang sang, việc chưa xong; không gồm việc hôm nay', async () => {
    const r = await ev(() => LP.logic.routines.leftovers('2026-11-25').map(x => x.source + ':' + x.title));
    A.ok(r.includes('plus1:Cop lại lần cuối'), 'thiếu plus1 ' + r);
    A.ok(r.includes('missed:Gửi báo cáo ngày'), 'thiếu bỏ sót ' + r);
    A.ok(r.includes('carried:Dọn bàn học'), 'thiếu mang sang ' + r);
    A.ok(r.includes('task:Trả lời email đối tác'), 'thiếu việc tồn ' + r);
    A.ok(!r.some(x => /khám sức khỏe/.test(x)), 'việc hôm nay không phải tồn');
  });

  await h.test('Thứ Bảy có lượt, Chủ nhật và ngày nghỉ không; +1 của Thứ Bảy rơi vào ngày làm việc kế (1/12)', async () => {
    const r = await ev(() => {
      const R = LP.logic.routines;
      return { sat: R.runsFor('2026-11-28').map(x => x.routine.id), sun: R.runsFor('2026-11-29').length, off: R.runsFor('2026-11-30').length,
        p1: R.plusOneFor('2026-12-01').map(x => x.item.title + '@' + x.runDate), none: R.plusOneFor('2026-11-30').length };
    });
    A.ok(r.sat.includes('r-chiaso'), 'Thứ Bảy thiếu lượt');
    A.strictEqual(r.sun, 0); A.strictEqual(r.off, 0); A.strictEqual(r.none, 0);
    A.deepStrictEqual(r.p1, ['Cop lại lần cuối@2026-11-28']);
  });

  await h.test('Khoảng ngày 1-3: hiện 1, 2, 3; tick hết ngày 2 thì ngày 3 không hiện; "còn N ngày"', async () => {
    const r = await ev(() => {
      const R = LP.logic.routines, has = d => R.runsFor(d).filter(x => x.routine.id === 'r-chotso')[0];
      const before = [has('2026-12-01').remainDays, has('2026-12-02').remainDays, has('2026-12-03').remainDays, !!has('2026-12-04')];
      R.check('r-chotso', 'ri-r-chotso-1', '2026-12-01', 'done');
      R.check('r-chotso', 'ri-r-chotso-2', '2026-12-02', 'done');
      const after = [!!has('2026-12-01'), !!has('2026-12-02'), !!has('2026-12-03'), has('2026-12-02') && has('2026-12-02').items.length];
      R.check('r-chotso', 'ri-r-chotso-1', '2026-12-01', ''); R.check('r-chotso', 'ri-r-chotso-2', '2026-12-02', '');
      return { before, after, hist: [!!has('2026-10-02'), !!has('2026-10-03')] };
    });
    A.deepStrictEqual(r.before, [3, 2, 1, false]);
    A.deepStrictEqual(r.after, [true, true, false, 1]);
    A.deepStrictEqual(r.hist, [true, false]);
  });

  await h.test('check(): tick, bỏ tick, lưu xuống mock và còn sau khi tải lại', async () => {
    const r = await ev(async () => {
      const R = LP.logic.routines;
      R.check('r-chiaso', 'ri-r-chiaso-2', '2026-11-25', 'done');
      const doneNow = R.runsFor('2026-11-25')[0].items.filter(x => x.item.id === 'ri-r-chiaso-2')[0].done;
      await LP.store.flush();
      const saved = (await LP.api.load()).routineChecks.some(c => c.item_id === 'ri-r-chiaso-2' && c.run_date === '2026-11-25' && c.status === 'done');
      return { doneNow, saved };
    });
    A.deepStrictEqual(r, { doneNow: true, saved: true });
    await page.reload(); await page.waitForFunction(() => window.LP && LP.ready === true);
    const again = await ev(() => LP.logic.routines.runsFor('2026-11-25')[0].items.filter(x => x.item.id === 'ri-r-chiaso-2')[0].done);
    A.strictEqual(again, true);
    const gone = await ev(async () => {
      LP.logic.routines.check('r-chiaso', 'ri-r-chiaso-2', '2026-11-25', ''); await LP.store.flush();
      return LP.logic.routines.runsFor('2026-11-25')[0].items.filter(x => x.item.id === 'ri-r-chiaso-2')[0].done;
    });
    A.strictEqual(gone, false);
  });

  await h.test('Độ khẩn: hạn hôm nay là rất khẩn, trong 2 ngày là khẩn, xa hơn hoặc đã xong thì không', async () => {
    const r = await ev(() => {
      const T = LP.logic.tasks, t = id => LP.store.find('Tasks', id), td = '2026-11-25';
      return [T.urgency(t('t-email'), td), T.urgency(t('t-kham'), td), T.urgency(t('t-bcnguon'), td), T.urgency(t('t-baohiem'), td), T.urgency(t('t-xong-1'), td)];
    });
    A.deepStrictEqual(r, ['rat-khan', 'khan', 'khan', '', '']);
  });

  await h.test('Gợi ý ngày làm: ngày làm việc trước hạn 1 ngày, không về quá khứ', async () => {
    const r = await ev(() => [LP.logic.tasks.suggestDoDate('2026-11-27'), LP.logic.tasks.suggestDoDate('2026-12-01'), LP.logic.tasks.suggestDoDate('2026-11-25')]);
    A.deepStrictEqual(r, ['2026-11-26', '2026-11-28', '2026-11-25']);
  });

  await h.test('Quỹ giờ: ad-hoc 3h, cá nhân 1h30, đột xuất trừ vào quỹ ad-hoc, vượt thì over', async () => {
    const r = await ev(() => {
      const C = LP.logic.tasks.capacity, a = C('2026-11-25'), b = C('2026-11-26'), s = C('2026-11-29');
      LP.store.upsert('Interruptions', { id: 'x1', date: '2026-11-26', title: 'Test', duration_min: 120 });
      const c = C('2026-11-26');
      LP.store.remove('Interruptions', 'x1');
      return { a: [a.work.quota, a.work.used, a.evening.quota, a.evening.used], b: [b.work.used, b.work.over], c: [c.work.used, c.work.over, c.work.left], sun: [s.work.quota, s.evening.quota] };
    });
    A.deepStrictEqual(r, { a: [180, 75, 90, 20], b: [90, false], c: [210, true, -30], sun: [0, 240] });
  });

  await h.test('Bước con: tick hết thì việc tự xong, bỏ tick thì việc quay lại chưa xong', async () => {
    const r = await ev(() => {
      const T = LP.logic.tasks, st = n => LP.store.find('TaskSteps', 'st-t-quy4-' + n), task = () => LP.store.find('Tasks', 't-quy4').status;
      const out = [task()]; T.toggleStep(st(2)); out.push(task()); T.toggleStep(st(3)); out.push(task());
      T.toggleStep(st(3)); out.push(task()); T.toggleStep(st(2));
      return out;
    });
    A.deepStrictEqual(r, ['todo', 'todo', 'done', 'todo']);
  });

  await h.test('stats: hoàn thành, bỏ sót nhiều nhất, ad-hoc, mức quan trọng, đột xuất, thói quen', async () => {
    const r = await ev(() => {
      const S = LP.stats, from = '2026-09-26', to = '2026-11-24';
      const comp = S.completion(from, to, 'week'), top = S.missedTop(from, to, 3);
      const ad = S.adhocStatus(from, '2026-12-31'), lv = S.byLevel(from, '2026-12-31'), it = S.interruptions(from, '2026-11-25', 'week');
      const hb = S.habits('2026-11-01', '2026-11-25').filter(x => x.habit.id === 'h-nuoc')[0];
      return {
        buckets: comp.length, pctOk: comp.every(b => b.pct === null || (b.pct >= 40 && b.pct <= 100)), sorted: top.every((x, i) => !i || top[i - 1].count >= x.count), topN: top.length,
        ad: ad.total, adSum: ad.done + ad.doneLate + ad.doing + ad.overdue, lvSum: lv.reduce((s, x) => s + x.total, 0),
        intCount: it.reduce((s, b) => s + b.count, 0), intAll: LP.store.get().interruptions.length, streak: hb.streak, pct: hb.pct !== null,
        lvl: [S.level(100), S.level(85), S.level(79), S.level(null)]
      };
    });
    A.ok(r.buckets >= 9 && r.pctOk && r.sorted && r.topN === 3, JSON.stringify(r));
    A.ok(r.ad >= 8 && r.adSum === r.ad && r.lvSum >= 10, JSON.stringify(r));
    A.strictEqual(r.intCount, r.intAll); A.strictEqual(r.streak, 5); A.ok(r.pct);
    A.deepStrictEqual(r.lvl, ['ok', 'pr', 'warn', '']);
  });

  await h.test('Tìm kiếm bỏ dấu: tìm "bao cao" ra Báo cáo cuối ngày, "chia so" ra mẫu và hạng mục', async () => {
    const r = await ev(() => ({ a: LP.search.query('bao cao').map(x => x.title), b: LP.search.query('Chia số').map(x => x.type + ':' + x.title), none: LP.search.query('zzzz').length }));
    A.ok(r.a.includes('Báo cáo cuối ngày'), r.a.join('|'));
    A.ok(r.b.some(x => x.startsWith('Daily:Chia số AI Class')) && r.b.some(x => x.startsWith('Ghi chú:')), r.b.join('|'));
    A.strictEqual(r.none, 0);
  });

  await h.test('Biểu tượng: trái tim = quan trọng, đồng hồ = khẩn, không khẩn thì không hiện', async () => {
    const r = await ev(() => ({
      h3: (LP.ui.importance(3).match(/class="icon fill"/g) || []).length, h1: (LP.ui.importance(1).match(/class="icon fill"/g) || []).length,
      u1: LP.ui.urgency('rat-khan'), u2: LP.ui.urgency('khan'), u0: LP.ui.urgency(''), pill: LP.ui.pill('Trễ 5 phút', 'late')
    }));
    A.strictEqual(r.h3, 3); A.strictEqual(r.h1, 1); A.ok(r.u1.includes('urg-rat-khan') && r.u2.includes('urg-khan')); A.strictEqual(r.u0, ''); A.ok(r.pill.includes('pill-late'));
  });
  await page.close();

  /* ---------- Giao diện khung ---------- */
  await h.test('5 tab + Cài đặt + route "mau" chạy được, mỗi route có nội dung (Đang làm hoặc màn thật)', async () => {
    const p = await h.open({ w: 1280 });
    A.strictEqual(await p.locator('.tab').count(), 5);
    for (const r of ['agenda', 'lich', 'ghi-chu', 'muc-tieu', 'tong-ket', 'cai-dat', 'mau']) {
      await p.evaluate(x => LP.router.go(x), r); await p.waitForTimeout(40);
      const o = await p.evaluate(() => ({ route: document.getElementById('view').getAttribute('data-route'), len: document.getElementById('view').innerText.length }));
      A.strictEqual(o.route, r); A.ok(o.len > 5, 'route ' + r + ' trống');
    }
    h.noErrors(p);
  });

  await h.test('Tab đang chọn được đánh dấu theo route', async () => {
    const p = await h.open({ w: 390, hash: '#/ghi-chu' });
    A.strictEqual(await p.locator('.tab.is-active').getAttribute('data-route'), 'ghi-chu');
    await p.click('.tab[data-route="tong-ket"]'); await p.waitForTimeout(60);
    A.strictEqual(await p.locator('.tab.is-active').getAttribute('data-route'), 'tong-ket');
  });

  await h.test('Nút "+": mở menu 4 mục, bấm một mục thì gọi quickAdd hoặc báo đang làm', async () => {
    const p = await h.open({ w: 390 });
    await p.click('#fab'); A.strictEqual(await p.locator('.fab-item').count(), 4);
    A.ok(await p.locator('#fab-menu').isVisible());
    await p.evaluate(() => { window.__k = null; LP.quickAdd = { open: k => { window.__k = k; } }; });
    await p.click('.fab-item[data-kind="dotxuat"]');
    A.strictEqual(await p.evaluate(() => window.__k), 'dotxuat');
    A.ok(!(await p.locator('#fab-menu').isVisible()));
    await p.evaluate(() => { delete LP.quickAdd; });
    await p.click('#fab'); await p.click('.fab-item[data-kind="adhoc"]');
    A.ok(await p.locator('.toast').isVisible());
  });

  await h.test('Ô tìm kiếm: mở, gõ không dấu ra kết quả, bấm kết quả thì chuyển màn, Esc đóng', async () => {
    const p = await h.open({ w: 1280 });
    await p.click('#btn-search'); await p.fill('.sr-input', 'chia so'); await p.waitForTimeout(60);
    A.ok(await p.locator('.sr-row').count() >= 2);
    await p.locator('.sr-row', { hasText: 'Daily' }).first().click(); await p.waitForTimeout(60);
    A.strictEqual(await p.locator('#view').getAttribute('data-route'), 'mau');
    A.strictEqual(await p.locator('.sr-overlay').count(), 0);
    await p.click('#btn-search'); await p.keyboard.press('Escape');
    A.strictEqual(await p.locator('.sr-overlay').count(), 0);
  });

  await h.test('Không có emoji trong giao diện khung', async () => {
    const p = await h.open({ w: 1280 });
    await p.click('#fab');
    const bad = await p.evaluate(() => /\p{Extended_Pictographic}/u.test(document.body.innerText));
    A.strictEqual(bad, false);
  });

  await h.test('Chế độ tối dùng bộ màu tối của web cũ', async () => {
    const p = await h.open({ w: 390, scheme: 'dark' });
    A.strictEqual(await p.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(34, 21, 31)');
    const p2 = await h.open({ w: 390, scheme: 'light' });
    // 26/11: người dùng muốn nền sáng nhạt hơn web cũ, ghi đè ở css/so-tay.css (--bg:#fffdfe)
    A.strictEqual(await p2.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(255, 253, 254)');
  });

  await h.test('Khung ở 390px và 1280px, sáng và tối: không cuộn ngang, không lỗi JS', async () => {
    await h.checkScreen('agenda');
  });
  await h.test('Khoảng ngày giả lập khác (?today=2026-12-01&now=08:00) vẫn chạy, hiện ngày giả lập', async () => {
    const p = await h.open({ w: 390, query: 'mock=1&today=2026-12-01&now=08:00' });
    A.deepStrictEqual(await p.evaluate(() => [LP.date.today(), LP.date.now()]), ['2026-12-01', '08:00']);
    h.noErrors(p);
  });
};

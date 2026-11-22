// Thử nhanh các luồng GĐ6 trên bản mock (không phải bộ kiểm thử chính)
const { chromium } = require('playwright');
const URL = 'file:///C:/Users/Admin/Documents/web-muc-tieu/src/index.html';
let fails = 0;
function ok(n, c, x) { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + x : '')); }
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?today=2026-11-25&now=08:10');
  await p.waitForSelector('.plan');
  // Gợi ý không vượt quỹ
  const sums = await p.evaluate(() => {
    const s = App.plan.suggest(App.store.get(), App.date.today());
    return s.load.buckets.map(b => [b.key, s.items.filter(i => i.bucket === b.key).reduce((a, i) => a + App.logic.duration(i.t), 0) + b.done, b.avail]);
  });
  ok('Gợi ý không vượt quỹ', sums.every(x => x[1] <= x[2]), JSON.stringify(sums));
  ok('Mỗi việc có lý do', await p.evaluate(() => App.plan.suggest(App.store.get(), App.date.today()).items.every(i => i.reasons.length)));
  // Việc dời 3 lần: chốt bị khóa tới khi chọn
  ok('Chốt bị khóa khi còn việc dời 3 lần', await p.locator('[data-action="plan-commit"]').isDisabled());
  await p.click('.pl-item.is-hard [data-action="pl-keep"]');
  ok('Vẫn giữ mở khóa Chốt', !(await p.locator('[data-action="plan-commit"]').isDisabled()));
  const ids = await p.evaluate(() => Array.from(document.querySelectorAll('.pl-item .pl-title')).map(e => e.getAttribute('data-id')));
  await p.click('[data-action="plan-commit"]');
  await p.waitForTimeout(300);
  const after = await p.evaluate(ids => {
    const st = App.store.get(), td = App.date.today();
    return { allToday: ids.every(id => App.logic.doDate(st.tasks.find(t => t.id === id)) === td),
      top: st.tasks.filter(t => App.logic.isTop3Today(t, td)).map(t => t.id) };
  }, ids);
  ok('Chốt: mọi việc có Ngày sẽ làm hôm nay', after.allToday);
  ok('Chốt: 3 việc đầu thành 3 việc chính', JSON.stringify(after.top.sort()) === JSON.stringify(ids.slice(0, 3).sort()), after.top.length);
  ok('Panel kế hoạch đóng sau chốt', await p.locator('.plan').count() === 0);
  // Đột xuất 2h -> có việc không kịp
  await p.click('[data-action="intr-new"]');
  await p.fill('.modal [name="title"]', 'Hỗ trợ sale gấp');
  await p.click('.modal .seg label:has(input[value="120"])');
  await p.click('.modal button[type="submit"]');
  await p.waitForTimeout(300);
  const asked = await p.locator('.modal').innerText().catch(() => '');
  ok('Đột xuất 2h: báo việc không kịp', /không kịp/.test(asked), asked.slice(0, 120));
  const before = await p.evaluate(() => App.plan.overflow(App.store.get(), App.date.today(), App.app.planOrder(App.date.today())).map(t => t.id));
  await p.click('.modal [data-choice="0"]');
  await p.waitForTimeout(300);
  const moved = await p.evaluate(ids => ids.map(id => { const t = App.store.get().tasks.find(x => x.id === id); return [t.do_date, t.defer_count]; }), before);
  ok('Đưa về kho: do_date trống, dời +1', moved.length && moved.every(m => m[0] === '' && +m[1] >= 1), JSON.stringify(moved));
  const bd = (await p.locator('.budget').textContent()).replace(/s+/g, ' ');
  ok('Quỹ giờ hiện đột xuất 3h', /Đột xuất ?3h/.test(bd), bd.replace(/\n/g, ' | ').slice(0, 200));
  // Thêm nhanh việc 2h vào hôm nay -> vào kho
  await p.click('label:has(#quick-add-today-dur-3)');
  await p.fill('#quick-add-today', 'Viết tài liệu lớn');
  await p.press('#quick-add-today', 'Enter');
  await p.waitForTimeout(300);
  const bigT = await p.evaluate(() => App.store.get().tasks.find(t => t.title === 'Viết tài liệu lớn'));
  ok('Việc 2h đặt hôm nay -> vào kho', bigT && bigT.do_date === '' && bigT.duration_min === '120');
  // Thêm nhanh dưới 10 giây: 30p, Mai, Quan trọng
  const t0 = Date.now();
  await p.click('label:has(#quick-add-today-dur-1)');
  await p.click('label:has(#quick-add-today-day-1)');
  await p.click('label.chip-toggle:has(#quick-add-today-imp)');
  await p.fill('#quick-add-today', 'Gọi lại cho khách');
  await p.press('#quick-add-today', 'Enter');
  await p.waitForTimeout(200);
  const qt = await p.evaluate(() => App.store.get().tasks.find(t => t.title === 'Gọi lại cho khách'));
  ok('Thêm nhanh: 30p, mai, quan trọng', qt && qt.duration_min === '30' && qt.do_date === '2026-11-26' && qt.is_important === 'TRUE', JSON.stringify(qt && [qt.duration_min, qt.do_date, qt.is_important]));
  ok('Thêm nhanh dưới 10 giây', Date.now() - t0 < 10000, Date.now() - t0 + 'ms');
  // Ma trận tự xếp
  const mx = await p.evaluate(() => { const td = App.date.today(); return App.store.get().tasks.every(t => { const imp = App.logic.isImportant(t), urg = !!t.due_date && t.due_date <= App.date.addDays(td, 2); return App.logic.quadrant(t, td) === (imp && urg ? 1 : imp ? 2 : urg ? 3 : 4); }); });
  ok('Ma trận theo Quan trọng x Gấp', mx);
  // Chia nhỏ
  await p.evaluate(id => App.app.splitTask(id), bigT.id);
  await p.fill('#kid-0', 'Dàn ý'); await p.fill('#kid-1', 'Viết phần 1'); await p.fill('#kid-2', 'Viết phần 2');
  await p.click('.modal button[type="submit"]');
  await p.waitForTimeout(300);
  const kids = await p.evaluate(id => App.store.get().tasks.filter(t => t.parent_id === id).map(t => t.duration_min), bigT.id);
  ok('Chia nhỏ tạo 3 việc con', kids.length === 3, kids.join(','));
  // Sang ngày mới: việc chưa xong về kho
  const todayIds = await p.evaluate(() => App.store.get().tasks.filter(t => t.do_date === '2026-11-25' && t.status !== 'Xong' && !t.parent_recurring_id).map(t => [t.id, +t.defer_count || 0]));
  await p.goto(URL + '?today=2026-11-26&now=08:00');
  await p.waitForSelector('.budget');
  await p.waitForTimeout(500);
  const roll = await p.evaluate(list => list.map(([id, d]) => { const t = App.store.get().tasks.find(x => x.id === id); return t && t.do_date === '' && +t.defer_count === d + 1 && t.inbox_since === '2026-11-26'; }), todayIds);
  ok('Sang ngày mới: về kho, dời +1', roll.length && roll.every(Boolean), roll.length);
  // 17h30: việc Công việc hôm nay về kho, việc tối giữ
  await p.goto(URL + '?today=2026-11-26&now=17:45');
  await p.waitForSelector('.budget');
  await p.waitForTimeout(500);
  const eve = await p.evaluate(() => { const st = App.store.get(), g = App.plan.goalsMap(st); return st.tasks.filter(t => t.do_date === '2026-11-26' && t.status !== 'Xong' && !t.parent_recurring_id).map(t => App.plan.bucketOf(t, g, '2026-11-26')); });
  ok('17h45: không còn việc giờ làm của hôm nay', eve.every(k => k !== 'work'), eve.join(','));
  ok('Không lỗi JS', !errs.length, errs.join(' | '));
  console.log('FAIL:', fails);
  await b.close();
})();

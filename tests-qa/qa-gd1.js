const { chromium } = require('playwright');
const path = require('path');
const URL = 'file:///C:/Users/Admin/Documents/web-muc-tieu/src/index.html';
const SS = path.join(__dirname, 'screenshots');
const res = [];
const errors = [];
function ok(name, cond, extra) { res.push({ name, pass: !!cond, extra: extra || '' }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' :: ' + extra : '')); }
const txt = (p, sel) => p.locator(sel).first().innerText().catch(() => '');
function addDays(s, n) { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
async function mk(browser, w, h, scheme, q) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme || 'light' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_INTERNET|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await p.goto(URL + (q || ''));
  await p.waitForSelector('.page-head');
  await p.waitForTimeout(400);
  return { ctx, p };
}
(async () => {
  const browser = await chromium.launch();
  let { ctx, p } = await mk(browser, 390, 844);
  const T = async () => p.evaluate(() => App.store.get().tasks);
  const G = async () => p.evaluate(() => App.store.get().goals);
  const td = await p.evaluate(() => App.date.today());
  console.log('today', td);
  await p.screenshot({ path: SS + '/01-hom-nay-390.png', fullPage: true });
  const body = await p.innerText('body');
  ok('Không có undefined/NaN/Infinity (Hôm nay)', !/undefined|NaN|Infinity/.test(body));
  ok('Không có emoji (Hôm nay)', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(body));
  ok('Không cuộn ngang 390 (Hôm nay)', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  let top = await p.locator('#top3-title').evaluate(e => e.closest('section').innerText);
  ok('Top 3 có 2 việc (1 mẫu + 1 giữ từ hôm qua)', /2\/3/.test(top) && /Làm bài kiểm tra cuối khóa/.test(top), top.replace(/\n/g, ' | '));
  const n0 = (await T()).length;
  await p.fill('#quick-add-today', '');
  await p.press('#quick-add-today', 'Enter');
  ok('Thêm nhanh ô trống không tạo task', (await T()).length === n0);
  await p.fill('#quick-add-today', 'Việc thử nhanh 1');
  await p.press('#quick-add-today', 'Enter');
  await p.waitForTimeout(100);
  let ts = await T(); let nt = ts.find(t => t.title === 'Việc thử nhanh 1');
  ok('Thêm nhanh Enter tạo task', !!nt && ts.length === n0 + 1);
  ok('Mặc định hạn = hôm nay, ưu tiên TB, Cần làm, không mục tiêu', nt && nt.due_date === td && nt.priority === 'Trung bình' && nt.status === 'Cần làm' && nt.goal_id === '', JSON.stringify(nt));
  ok('Ô nhập được xóa & giữ focus sau Enter', (await p.inputValue('#quick-add-today')) === '' && await p.evaluate(() => document.activeElement.id === 'quick-add-today'));
  ok('Task mới hiện trong "Việc hôm nay"', (await p.innerText('body')).includes('Việc thử nhanh 1'));
  await p.fill('#quick-add-today', '    ');
  await p.press('#quick-add-today', 'Enter');
  ok('Thêm nhanh chỉ khoảng trắng không tạo task', (await T()).length === n0 + 1);
  const long = 'Tên rất dài '.repeat(40).trim() + ' ' + 'x'.repeat(250);
  await p.fill('#quick-add-today', long);
  await p.press('#quick-add-today', 'Enter');
  ts = await T();
  const lt = ts.find(t => t.title.startsWith('Tên rất dài'));
  ok('Tên rất dài được thêm (giới hạn maxlength 200)', !!lt && lt.title.length <= 200, lt ? 'len=' + lt.title.length : '');
  ok('Tên dài không gây cuộn ngang 390', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), await p.evaluate(() => document.documentElement.scrollWidth + '/' + innerWidth));
  const over = await p.evaluate(() => [...document.querySelectorAll('.task')].filter(e => e.scrollWidth > e.clientWidth + 1).length);
  ok('Hàng task không tràn chữ', over === 0, 'tràn=' + over);
  await p.screenshot({ path: SS + '/02-ten-dai-390.png', fullPage: true });
  const tickId = nt.id;
  await p.click(`[data-action="toggle-task"][data-id="${tickId}"]`);
  ts = await T();
  ok('Tick một chạm → Xong + done_at', ts.find(t => t.id === tickId).status === 'Xong' && ts.find(t => t.id === tickId).done_at === td);
  await p.click(`[data-action="toggle-task"][data-id="${tickId}"]`);
  ts = await T();
  ok('Bỏ tick → Cần làm, xóa done_at', ts.find(t => t.id === tickId).status === 'Cần làm' && ts.find(t => t.id === tickId).done_at === '');
  ok('Top 3 trước khi thêm = 2', await p.evaluate(() => App.app.top3Count()) === 2);
  await p.click(`[data-action="toggle-top3"][data-id="${tickId}"]`);
  ok('Thêm vào Top 3 → 3/3', await p.evaluate(() => App.app.top3Count()) === 3);
  const other = (await T()).find(t => t.title.startsWith('Gửi bảng KPI'));
  await p.click(`[data-action="toggle-top3"][data-id="${other.id}"]`);
  ok('Không cho thêm thứ 4 vào Top 3', await p.evaluate(() => App.app.top3Count()) === 3);
  ok('Hiện thông báo Top 3 đủ', /đã đủ 3 việc/.test(await txt(p, '.toast')));
  await p.screenshot({ path: SS + '/03-top3-day-390.png', fullPage: true });
  await p.click(`[data-action="open-task"][data-id="${other.id}"]`);
  await p.check('.modal input[name="top3"]');
  await p.click('.modal form[data-form="task"] button[type="submit"]');
  ok('Form: tick Top 3 khi đã đủ báo lỗi, không đóng', await p.locator('.modal [data-err="top3"]').isVisible() && await p.locator('.modal').count() === 1);
  await p.screenshot({ path: SS + '/04-form-task-390.png' });
  await p.uncheck('.modal input[name="top3"]');
  await p.fill('.modal input[name="title"]', '');
  await p.click('.modal form[data-form="task"] button[type="submit"]');
  ok('Form: tên trống báo lỗi', await p.locator('.modal [data-err="title"]').isVisible());
  await p.fill('.modal input[name="title"]', 'Gửi bảng KPI đã sửa');
  await p.check('.modal input[name="priority"][value="Thấp"]', { force: true });
  await p.check('.modal input[name="status"][value="Đang làm"]', { force: true });
  await p.fill('.modal textarea[name="note"]', 'ghi chú thử');
  await p.fill('.modal input[name="due_date"]', addDays(td, 5));
  await p.click('.modal form[data-form="task"] button[type="submit"]');
  ts = await T(); let ed = ts.find(t => t.id === other.id);
  ok('Sửa task qua form lưu đúng', ed.title === 'Gửi bảng KPI đã sửa' && ed.priority === 'Thấp' && ed.status === 'Đang làm' && ed.note === 'ghi chú thử' && ed.due_date === addDays(td, 5), JSON.stringify(ed));
  await p.click('.tab[data-tab="goals"]'); await p.click('.tab[data-tab="today"]');
  // task moved to +5 is not visible in Hôm nay; open from goal detail instead
  await p.evaluate(id => App.forms.openTask(App.store.get().tasks.find(t => t.id === id)), other.id);
  await p.check('.modal input[name="status"][value="Xong"]', { force: true });
  await p.click('.modal form[data-form="task"] button[type="submit"]');
  ts = await T(); ed = ts.find(t => t.id === other.id);
  ok('Đặt Xong qua form → done_at', ed.status === 'Xong' && ed.done_at === td);
  await p.click(`[data-action="open-task"][data-id="${tickId}"]`);
  await p.uncheck('.modal input[name="top3"]');
  await p.click('.modal form[data-form="task"] button[type="submit"]');
  ok('Bỏ Top 3 qua form', await p.evaluate(() => App.app.top3Count()) === 2);
  const topTask = (await T()).find(t => t.title.startsWith('Vẽ biểu đồ'));
  await p.click(`[data-action="toggle-top3"][data-id="${topTask.id}"]`);
  ok('Bỏ khỏi Top 3 bằng sao', await p.evaluate(() => App.app.top3Count()) === 1);
  await p.click(`[data-action="open-task"][data-id="${tickId}"]`);
  await p.click('[data-act="delete"]');
  await p.click('[data-choice="1"]');
  ok('Xóa task: Hủy thì còn', (await T()).some(t => t.id === tickId));
  if (await p.locator('.modal').count() === 0) await p.click(`[data-action="open-task"][data-id="${tickId}"]`);
  await p.click('[data-act="delete"]');
  await p.click('[data-choice="0"]');
  ok('Xóa task xác nhận → mất', !(await T()).some(t => t.id === tickId));
  await p.click(`[data-action="toggle-task"][data-id="${topTask.id}"]`).catch(() => {});
  await p.click(`[data-action="open-task"][data-id="${topTask.id}"]`);
  await p.keyboard.press('Escape');
  ok('Esc đóng form', await p.locator('.modal').count() === 0);
  const before = JSON.stringify((await T()).map(t => t.id).sort());
  await p.waitForTimeout(600);
  await p.reload(); await p.waitForSelector('.page-head'); await p.waitForTimeout(500);
  ok('Tải lại vẫn còn dữ liệu', JSON.stringify((await T()).map(t => t.id).sort()) === before);
  ok('Trạng thái "Đã lưu"', /Đã lưu/.test(await p.innerText('#sync')));

  const pills = await p.evaluate(() => [...document.querySelectorAll('.task')].map(r => ({ t: r.querySelector('.task-title').innerText, late: !!r.querySelector('.pill-warn'), soon: !!r.querySelector('.pill-pr') })));
  const ex = await p.evaluate(() => App.store.get().tasks.map(t => ({ t: t.title, d: t.due_date, s: t.status })));
  const od = ex.filter(x => x.d && x.d < td && x.s !== 'Xong').map(x => x.t);
  const lateShown = pills.filter(x => x.late).map(x => x.t);
  ok('Nhãn Trễ hạn khớp với task quá hạn chưa xong', od.every(t => lateShown.includes(t)) && lateShown.every(t => od.includes(t)), 'dự kiến ' + od.join('; ') + ' | hiện ' + lateShown.join('; '));
  const soonExp = ex.filter(x => x.s !== 'Xong' && (x.d === td || x.d === addDays(td, 1))).map(x => x.t);
  const soonShown = pills.filter(x => x.soon).map(x => x.t);
  ok('Nhãn Sắp đến hạn khớp (hôm nay/ngày mai, chưa xong)', soonExp.every(t => soonShown.includes(t)) && soonShown.every(t => soonExp.includes(t)), 'dự kiến ' + soonExp.join('; ') + ' | hiện ' + soonShown.join('; '));
  await p.screenshot({ path: SS + '/05-hom-nay-sau-sua-390.png', fullPage: true });

  // ---------- Goals ----------
  await p.click('.tab[data-tab="goals"]');
  await p.waitForSelector('.goal-card');
  await p.screenshot({ path: SS + '/06-muc-tieu-390.png', fullPage: true });
  ok('Không cuộn ngang 390 (Mục tiêu)', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok('Không undefined/NaN (Mục tiêu)', !/undefined|NaN|Infinity/.test(await p.innerText('body')));
  const pcts = await p.evaluate(() => {
    const s = App.store.get();
    return [...document.querySelectorAll('.goal-card')].map(c => {
      const name = c.querySelector('h3').innerText; const g = s.goals.find(x => x.name === name);
      const mine = s.tasks.filter(t => t.goal_id === g.id); const done = mine.filter(t => t.status === 'Xong').length;
      const exp = mine.length ? Math.round(done / mine.length * 100) : 0;
      const shown = parseInt(c.querySelector('.pct').innerText);
      const lv = c.querySelector('.progress').className;
      const expLv = exp >= 100 ? 'lv-ok' : exp >= 80 ? 'lv-pr' : 'lv-warn';
      const col = getComputedStyle(c.querySelector('.bar i')).backgroundColor;
      return { name, exp, shown, lvOk: lv.includes(expLv), col, foot: c.querySelector('.goal-foot').innerText };
    });
  });
  console.log(JSON.stringify(pcts));
  ok('% tiến độ trên thẻ khớp tính tay', pcts.every(x => x.exp === x.shown));
  ok('Lớp màu mức khớp ngưỡng', pcts.every(x => x.lvOk));
  for (const gk of ['Công việc', 'Học tập', 'Sức khỏe']) {
    await p.click(`[data-action="filter-group"][data-group="${gk}"]`);
    const shown = await p.evaluate(() => [...document.querySelectorAll('.goal-card')].map(c => c.className));
    const exp = (await G()).filter(g => g.group === gk).length;
    ok('Lọc nhóm ' + gk, shown.length === exp && shown.every(c => c.includes('g-' + gk.replace(/\s+/g, '-'))), shown.length + '/' + exp);
  }
  await p.screenshot({ path: SS + '/07-loc-nhom-390.png', fullPage: true });
  await p.click('[data-action="filter-group"][data-group=""]');

  await p.click('.page-head [data-action="new-goal"]');
  await p.click('.modal form[data-form="goal"] button[type="submit"]');
  ok('Mục tiêu: tên trống báo lỗi', await p.locator('.modal [data-err="name"]').isVisible());
  await p.fill('.modal input[name="name"]', 'Mục tiêu thử QA');
  await p.check('.modal input[name="group"][value="Học tập"]', { force: true });
  await p.selectOption('.modal select[name="period_type"]', 'Quý');
  await p.screenshot({ path: SS + '/08-form-muc-tieu-390.png' });
  const qv = await p.inputValue('.modal select[name="period_value"]'); const sd = await p.inputValue('.modal input[name="start_date"]'); const ed2 = await p.inputValue('.modal input[name="end_date"]');
  ok('Đổi loại kỳ tự điền ngày (Quý)', /^\d{4}-Q[1-4]$/.test(qv) && sd < ed2, qv + ' ' + sd + ' ' + ed2);
  await p.fill('.modal input[name="start_date"]', '2026-12-31'); await p.fill('.modal input[name="end_date"]', '2026-01-01');
  await p.click('.modal form[data-form="goal"] button[type="submit"]');
  ok('Ngày kết thúc < bắt đầu báo lỗi', await p.locator('.modal [data-err="dates"]').isVisible());
  await p.fill('.modal input[name="start_date"]', sd); await p.fill('.modal input[name="end_date"]', ed2);
  await p.fill('.modal textarea[name="note"]', 'ghi chú mục tiêu');
  await p.click('.modal form[data-form="goal"] button[type="submit"]');
  await p.waitForSelector('.detail-head');
  let gs = await G(); const ng = gs.find(g => g.name === 'Mục tiêu thử QA');
  ok('Tạo mục tiêu lưu đúng & mở trang chi tiết', ng && ng.group === 'Học tập' && ng.period_type === 'Quý' && ng.progress_mode === 'task');
  const dtxt = await p.innerText('.detail-head');
  ok('Mục tiêu 0 task: 0% và "Chưa có task nào"', /0%/.test(dtxt) && /Chưa có task nào/.test(dtxt), dtxt.replace(/\n/g, ' | '));
  ok('Mục tiêu 0 task: trạng thái rỗng', /chưa có task/i.test(await p.innerText('main')));
  await p.screenshot({ path: SS + '/08b-chi-tiet-0task-390.png', fullPage: true });
  for (const n of ['QA a', 'QA b', 'QA c', 'QA d', 'QA e']) { await p.fill('#quick-add-goal', n); await p.press('#quick-add-goal', 'Enter'); }
  ts = await T();
  ok('Thêm nhanh trong mục tiêu gắn goal_id', ts.filter(t => t.goal_id === ng.id).length === 5);
  const pc = async () => parseInt(await p.innerText('.detail-head .pct'));
  const lvl = async () => p.evaluate(() => document.querySelector('.detail-head .progress').className);
  const clickTick = async (title) => { const t = (await T()).find(t => t.title === title); await p.click(`[data-action="toggle-task"][data-id="${t.id}"]`); };
  ok('0/5 = 0% warn', await pc() === 0 && /lv-warn/.test(await lvl()));
  await clickTick('QA a'); await clickTick('QA b'); await clickTick('QA c');
  ok('3/5 = 60% warn', await pc() === 60 && /lv-warn/.test(await lvl()), String(await pc()));
  await clickTick('QA d');
  ok('4/5 = 80% pr (gần đạt)', await pc() === 80 && /lv-pr/.test(await lvl()), String(await pc()));
  await p.screenshot({ path: SS + '/09-chi-tiet-80-390.png', fullPage: true });
  await clickTick('QA e');
  ok('5/5 = 100% ok (đạt)', await pc() === 100 && /lv-ok/.test(await lvl()), String(await pc()));
  const l99 = await p.evaluate(() => [App.logic.level(79), App.logic.level(80), App.logic.level(99), App.logic.level(100), App.logic.levelLabel(99)]);
  ok('Ngưỡng logic 79→warn, 80→pr, 99→pr, 100→ok', l99[0] === 'warn' && l99[1] === 'pr' && l99[2] === 'pr' && l99[3] === 'ok', JSON.stringify(l99));
  await p.screenshot({ path: SS + '/10-chi-tiet-100-390.png', fullPage: true });
  await p.click('[data-action="edit-goal"]');
  await p.fill('.modal input[name="name"]', 'Mục tiêu QA đã sửa');
  await p.check('.modal input[name="status"][value="Tạm dừng"]', { force: true });
  await p.click('.modal form[data-form="goal"] button[type="submit"]');
  gs = await G(); const eg = gs.find(g => g.id === ng.id);
  ok('Sửa mục tiêu lưu đúng', eg.name === 'Mục tiêu QA đã sửa' && eg.status === 'Tạm dừng');
  ok('Tiêu đề chi tiết cập nhật', /Mục tiêu QA đã sửa/.test(await p.innerText('.detail-head h1')));
  await p.click('[data-action="delete-goal"]');
  const dlg = await p.innerText('.modal');
  ok('Xóa mục tiêu có task: hỏi giữ hay xóa', /Giữ task, chuyển thành Việc lặt vặt/.test(dlg) && /Xóa luôn 5 task/.test(dlg), dlg.replace(/\n/g, ' | '));
  await p.screenshot({ path: SS + '/11-hoi-xoa-muc-tieu-390.png' });
  await p.click('[data-choice="2"]');
  ok('Hủy xóa mục tiêu: còn nguyên', (await G()).some(g => g.id === ng.id));
  await p.click('[data-action="delete-goal"]'); await p.click('[data-choice="0"]');
  await p.waitForSelector('.goal-grid');
  ts = await T();
  ok('Giữ task: mục tiêu mất, 5 task còn với goal_id rỗng', !(await G()).some(g => g.id === ng.id) && ts.filter(t => t.title.startsWith('QA ') && t.goal_id === '').length === 5);
  const gTarget = (await G()).find(g => g.name.startsWith('Chạy bộ'));
  const cnt = ts.filter(t => t.goal_id === gTarget.id).length;
  await p.click(`.goal-card[data-id="${gTarget.id}"]`);
  await p.click('[data-action="delete-goal"]'); await p.click('[data-choice="1"]');
  await p.waitForSelector('.goal-grid');
  ts = await T();
  ok('Xóa theo: mục tiêu và ' + cnt + ' task mất', !(await G()).some(g => g.id === gTarget.id) && !ts.some(t => t.goal_id === gTarget.id));
  await p.click('.page-head [data-action="new-goal"]'); await p.fill('.modal input[name="name"]', 'Rỗng'); await p.click('.modal form[data-form="goal"] button[type="submit"]');
  await p.waitForSelector('.detail-head');
  await p.click('[data-action="delete-goal"]');
  ok('Xóa mục tiêu 0 task: hộp hỏi đơn giản', /Xóa mục tiêu "Rỗng"/.test(await p.innerText('.modal')) && !/Giữ task/.test(await p.innerText('.modal')));
  await p.click('[data-choice="0"]'); await p.waitForSelector('.goal-grid');
  ok('Đã xóa mục tiêu rỗng', !(await G()).some(g => g.name === 'Rỗng'));
  await p.click('.page-head [data-action="new-goal"]'); await p.fill('.modal input[name="name"]', 'Mục tiêu tên dài '.repeat(11) + 'y'.repeat(60)); await p.click('.modal form[data-form="goal"] button[type="submit"]');
  await p.waitForSelector('.detail-head');
  ok('Tên mục tiêu dài: không cuộn ngang (chi tiết)', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), await p.evaluate(() => document.documentElement.scrollWidth));
  await p.screenshot({ path: SS + '/12-muc-tieu-ten-dai-390.png', fullPage: true });
  await p.click('.back');
  ok('Tên mục tiêu dài: không cuộn ngang (danh sách)', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await p.evaluate(() => App.store.get().goals.slice().forEach(g => App.store.remove('Goals', g.id)));
  await p.waitForTimeout(200);
  ok('Trạng thái rỗng khi không có mục tiêu', /Chưa có mục tiêu nào/.test(await p.innerText('main')));
  await p.screenshot({ path: SS + '/13-muc-tieu-rong-390.png', fullPage: true });
  await ctx.close();

  ({ ctx, p } = await mk(browser, 390, 844));
  await p.click('.tab[data-tab="goals"]');
  await p.evaluate(() => App.store.get().goals.filter(g => g.group === 'Sức khỏe').forEach(g => App.store.remove('Goals', g.id)));
  await p.click('[data-action="filter-group"][data-group="Sức khỏe"]');
  const emptyTxt = await p.innerText('main');
  ok('Lọc nhóm không có mục tiêu → trạng thái rỗng theo nhóm', /Chưa có mục tiêu nào trong nhóm Sức khỏe/.test(emptyTxt), emptyTxt.replace(/\n/g, ' | '));
  await p.screenshot({ path: SS + '/14-nhom-rong-390.png', fullPage: true });
  await p.evaluate(() => App.store.get().tasks.slice().forEach(t => App.store.remove('Tasks', t.id)));
  await p.click('.tab[data-tab="today"]');
  await p.waitForTimeout(200);
  ok('Hôm nay rỗng: thông báo thân thiện', /Hôm nay chưa có việc nào/.test(await p.innerText('main')));
  await p.screenshot({ path: SS + '/15-hom-nay-rong-390.png', fullPage: true });
  await ctx.close();

  ({ ctx, p } = await mk(browser, 390, 844, 'light', '?today=2026-12-01'));
  const seedTop = await p.evaluate(() => App.store.get().tasks.filter(t => t.is_top3 === 'TRUE').map(t => t.title + '@' + t.top3_date));
  ok('Ngày 01/12 giả lập: cả 2 Top 3 mẫu ở 01/12 (đã giữ từ 30/11)', seedTop.length === 2 && seedTop.every(s => s.endsWith('2026-12-01')), seedTop.join('; '));
  await p.goto(URL + '?today=2026-12-02'); await p.waitForSelector('.page-head'); await p.waitForTimeout(500);
  const t2 = await p.evaluate(() => App.store.get().tasks.filter(t => App.logic.isTop3Today(t, '2026-12-02')).map(t => t.title));
  ok('Sang ngày sau: task Top 3 chưa xong được giữ lại', t2.length === 2 && t2.some(x => x.startsWith('Làm bài')) && t2.some(x => x.startsWith('Vẽ biểu đồ')), t2.join('; '));
  const vid = await p.evaluate(() => App.store.get().tasks.find(t => t.title.startsWith('Vẽ biểu đồ')).id);
  await p.click(`[data-action="toggle-task"][data-id="${vid}"]`); await p.waitForTimeout(500);
  await p.goto(URL + '?today=2026-12-03'); await p.waitForSelector('.page-head'); await p.waitForTimeout(500);
  const t3 = await p.evaluate(() => App.store.get().tasks.filter(t => App.logic.isTop3Today(t, '2026-12-03')).map(t => t.title));
  ok('Task Top 3 đã xong không giữ sang ngày sau', t3.length === 1 && t3[0].startsWith('Làm bài'), t3.join('; '));
  await p.screenshot({ path: SS + '/16-top3-giu-sang-hom-sau-390.png', fullPage: true });
  ok('Trễ hạn hiện nhãn ngày sau', await p.locator('.pill-warn').count() > 0);
  await ctx.close();

  ({ ctx, p } = await mk(browser, 390, 844, 'light', '?today=2026-12-01'));
  await p.evaluate(() => {
    const ts = App.store.get().tasks.filter(t => t.status !== 'Xong' && t.is_top3 !== 'TRUE').slice(0, 3);
    ts.forEach(t => App.store.upsert('Tasks', Object.assign({}, t, { is_top3: 'TRUE', top3_date: '2026-11-30' })));
  });
  await p.waitForTimeout(500);
  await p.goto(URL + '?today=2026-12-02'); await p.waitForSelector('.page-head'); await p.waitForTimeout(500);
  const cc = await p.evaluate(() => App.app.top3Count());
  const stale = await p.evaluate(() => App.logic.top3CarryOver(App.store.get().tasks, '2026-12-02').length);
  ok('Carry-over không vượt quá 3 Top 3', cc <= 3, 'top3=' + cc + ' còn dư cờ cũ=' + stale);
  console.log('INFO carry-over: top3=' + cc + ', task cờ top3 cũ chưa chuyển=' + stale);
  await ctx.close();

  ({ ctx, p } = await mk(browser, 390, 844, 'light', '?fail=1'));
  await p.fill('#quick-add-today', 'Thử lỗi lưu'); await p.press('#quick-add-today', 'Enter');
  await p.waitForSelector('.toast', { timeout: 3000 });
  const toast = await p.innerText('.toast');
  ok('Lưu lỗi: hiện thông báo + nút Thử lại', /Chưa lưu được/.test(toast) && /Thử lại/.test(toast), toast.replace(/\n/g, ' | '));
  ok('Lưu lỗi: task vẫn hiện (lạc quan)', (await p.innerText('main')).includes('Thử lỗi lưu'));
  ok('Thanh trạng thái báo "Chưa lưu"', /Chưa lưu/.test(await p.innerText('#sync')));
  await p.screenshot({ path: SS + '/17-luu-loi-390.png' });
  await p.click('.toast button[data-t="act"]');
  await p.waitForSelector('.toast', { timeout: 3000 });
  ok('Bấm Thử lại → thử lại (vẫn lỗi vì ?fail=1)', /Chưa lưu được/.test(await p.innerText('.toast')));
  await ctx.close();
  ({ ctx, p } = await mk(browser, 390, 844, 'light', '?fail=0.5'));
  await p.fill('#quick-add-today', 'Thử lỗi nửa'); await p.press('#quick-add-today', 'Enter');
  let saved = false;
  for (let i = 0; i < 15 && !saved; i++) {
    await p.waitForTimeout(500);
    if (/Đã lưu/.test(await p.innerText('#sync'))) saved = true;
    else if (await p.locator('.toast button[data-t="act"]').count()) await p.click('.toast button[data-t="act"]');
  }
  ok('Thử lại thành công sẽ về "Đã lưu"', saved);
  await p.reload(); await p.waitForSelector('.page-head'); await p.waitForTimeout(400);
  ok('Sau khi thử lại thành công, tải lại vẫn còn task', (await p.innerText('main')).includes('Thử lỗi nửa'));
  await ctx.close();

  for (const [w, h, scheme] of [[390, 844, 'light'], [1280, 800, 'light'], [390, 844, 'dark'], [1280, 800, 'dark']]) {
    ({ ctx, p } = await mk(browser, w, h, scheme));
    const tag = w + '-' + scheme;
    await p.screenshot({ path: `${SS}/20-hom-nay-${tag}.png`, fullPage: true });
    ok(`Không cuộn ngang Hôm nay ${tag}`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.click('.tab[data-tab="goals"]'); await p.waitForSelector('.goal-card');
    await p.screenshot({ path: `${SS}/21-muc-tieu-${tag}.png`, fullPage: true });
    ok(`Không cuộn ngang Mục tiêu ${tag}`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.click('.goal-card'); await p.waitForSelector('.detail-head');
    await p.screenshot({ path: `${SS}/22-chi-tiet-${tag}.png`, fullPage: true });
    ok(`Không cuộn ngang Chi tiết ${tag}`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.click('[data-action="edit-goal"]');
    await p.screenshot({ path: `${SS}/23-form-${tag}.png` });
    await p.keyboard.press('Escape');
    if (w === 1280 && scheme === 'light') {
      const info = await p.evaluate(() => {
        const nums = [...document.querySelectorAll('.num')].map(e => getComputedStyle(e).fontFamily);
        const bad = nums.filter(f => !/IBM Plex Mono|ui-monospace|monospace/i.test(f)).length;
        return { total: nums.length, bad, tabular: getComputedStyle(document.querySelector('.num')).fontVariantNumeric };
      });
      ok('Mọi .num dùng font mono', info.bad === 0 && info.total > 0, JSON.stringify(info));
      const raw = await p.evaluate(() => {
        const out = [];
        const w = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
        let n; while ((n = w.nextNode())) {
          if (/\d/.test(n.nodeValue) && !n.parentElement.closest('.task-title')) { const f = getComputedStyle(n.parentElement).fontFamily; if (!/mono/i.test(f)) out.push(n.nodeValue.trim().slice(0, 50) + ' <' + n.parentElement.className + '>'); }
        }
        return out;
      });
      ok('Số trong main (chi tiết) đều bằng font mono', raw.length === 0, raw.slice(0, 8).join(' || '));
    }
    await ctx.close();
  }
  ({ ctx, p } = await mk(browser, 390, 844));
  const raw2 = await p.evaluate(() => {
    const out = [];
    const w = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) {
      if (/\d/.test(n.nodeValue) && !n.parentElement.closest('.task-title')) { const f = getComputedStyle(n.parentElement).fontFamily; if (!/mono/i.test(f)) out.push(n.nodeValue.trim().slice(0, 50) + ' <' + n.parentElement.className + '>'); }
    }
    return out;
  });
  ok('Số trong tab Hôm nay đều bằng font mono', raw2.length === 0, raw2.slice(0, 8).join(' || '));
  const bar = await p.evaluate(() => { const n = document.querySelector('.tabbar'); const s = getComputedStyle(n); const r = n.getBoundingClientRect(); return { pos: s.position, bottom: Math.round(innerHeight - r.bottom), top: Math.round(r.top) }; });
  ok('Mobile: thanh tab cố định ở đáy', bar.pos === 'fixed' && bar.bottom <= 2, JSON.stringify(bar));
  const touch = await p.evaluate(() => [...document.querySelectorAll('.check,.star,.icon-btn')].map(e => { const r = e.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }));
  console.log('INFO kích thước nút chạm', [...new Set(touch)]);
  const css = await p.evaluate(() => { const c = document.querySelector('.card, .goal-card, .task'); return { card: getComputedStyle(c).borderRadius, bg: getComputedStyle(document.body).backgroundColor, btn: getComputedStyle(document.querySelector('.btn')).borderRadius, font: getComputedStyle(document.body).fontFamily }; });
  console.log('INFO css', JSON.stringify(css));
  await ctx.close();

  console.log('\nERRORS:', errors.length, JSON.stringify(errors));
  const fails = res.filter(r => !r.pass);
  console.log('TỔNG', res.length, 'ĐẠT', res.length - fails.length, 'LỖI', fails.length);
  fails.forEach(f => console.log(' - ' + f.name + ' :: ' + f.extra));
  await browser.close();
})().catch(e => { console.error('CRASH', e); process.exit(1); });

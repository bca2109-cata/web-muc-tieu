const { chromium } = require('playwright');
const path = require('path');
const URL = 'file:///C:/Users/Admin/Documents/web-muc-tieu/src/index.html';
const SS = path.join(__dirname, 'screenshots');
const TODAY = '2026-11-21';
const errors = [];
let fails = 0;
function ok(name, cond, extra) { if (!cond) fails++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' :: ' + extra : '')); }
function addDays(s, n) { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
async function mk(browser, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: o.w || 390, height: o.h || 844 }, colorScheme: 'light', reducedMotion: o.reduce ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_INTERNET|Failed to load resource|ERR_NAME/.test(m.text())) errors.push('console: ' + m.text()); });
  await p.goto(URL + (o.q === undefined ? '?today=' + TODAY : o.q));
  await p.waitForSelector('.site-head');
  await p.waitForTimeout(500);
  return { ctx, p };
}
// click THẬT (Playwright kiểm tra phần tử có bị che không); nếu không bấm được thì ghi FAIL rồi dùng JS để chạy tiếp
async function pc(p, sel) {
  try { await p.click(sel, { timeout: 4000 }); }
  catch (e) { fails++; console.log('FAIL click thật không được: ' + sel + ' :: ' + e.message.split('\n')[0]); await p.evaluate(s => document.querySelector(s).click(), sel); }
}
// Việc hiện trên màn hình: bỏ việc lặp mẫu và lần lặp đã qua ngày mà chưa làm (GĐ2)
const T = p => p.evaluate(() => { const td = App.date.today(); return JSON.parse(JSON.stringify(App.store.get().tasks.filter(t => !App.logic.isTemplate(t) && !App.logic.isMissed(t, td)))); });
const G = p => p.evaluate(() => JSON.parse(JSON.stringify(App.store.get().goals)));
function quad(t) {
  const imp = t.priority === 'Cao', urg = !!t.due_date && t.due_date <= addDays(TODAY, 1);
  return imp && urg ? 1 : imp ? 2 : urg ? 3 : 4;
}
async function matrixDOM(p) {
  return p.evaluate(() => {
    const out = {};
    document.querySelectorAll('.matrix .q').forEach(q => {
      const n = +q.className.match(/q(\d)/)[1];
      out[n] = { count: q.querySelector('.qn').textContent.trim(), ids: [...q.querySelectorAll('li [data-action="toggle-task"]')].map(b => b.dataset.id) };
    });
    return out;
  });
}
async function layoutChecks(p, label) {
  const body = await p.innerText('body');
  ok(label + ': không undefined/NaN/Infinity', !/undefined|NaN|Infinity/.test(body));
  ok(label + ': không emoji', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(body));
  const sw = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  ok(label + ': không cuộn ngang', sw[0] <= sw[1], sw.join('/'));
  const over = await p.evaluate(() => [...document.querySelectorAll('.task-title,.goal-name,.qname span,.tag span,.tt-title,.ov-legend li')].filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).length);
  ok(label + ': không phần tử tràn khỏi màn hình', over === 0, 'tràn=' + over);
  const numFont = await p.evaluate(() => { const e = document.querySelector('.num'); if (!e) return null; const s = getComputedStyle(e); return s.fontVariantNumeric + ' | ' + s.fontFamily + ' | ' + s.fontWeight; });
  ok(label + ': .num dùng tabular-nums + Nunito/Baloo đậm (trang không có .num thì bỏ qua)', !numFont || /tabular-nums/.test(numFont) && /Nunito|Baloo/.test(numFont) && +numFont.split('|')[2] >= 700, numFont);
}
async function small(p, sel, min, label) {
  const r = await p.evaluate(({ sel, min }) => [...document.querySelectorAll(sel)].filter(e => e.offsetParent !== null).map(e => { const b = e.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; }).filter(s => s[0] < min || s[1] < min), { sel, min });
  const n = await p.locator(sel).count();
  ok(label + ' >=' + min + 'px (' + n + ' nút)', n > 0 && r.length === 0, JSON.stringify(r.slice(0, 4)));
}
(async () => {
  const browser = await chromium.launch();
  // ===== A. Hôm nay 390
  let { ctx, p } = await mk(browser);
  console.log('today =', await p.evaluate(() => App.date.today()));
  ok('Mặc định bg = flowers', await p.evaluate(() => document.documentElement.dataset.bg) === 'flowers');
  ok('Lớp hoa nền có hoa', (await p.locator('#bg-flowers svg').count()) > 10, '' + await p.locator('#bg-flowers svg').count());
  ok('Lớp hoa nền hiển thị mặc định', await p.evaluate(() => getComputedStyle(document.getElementById('bg-flowers')).display !== 'none'));
  await p.screenshot({ path: SS + '/lp-01-homnay-matran-390.png', fullPage: true });
  await layoutChecks(p, 'Hôm nay 390');
  console.log('view mặc định:', await p.locator('.seg-switch .on').innerText());
  let tasks = await T(p);
  const top = await p.locator('#top3-title').evaluate(e => e.closest('section').innerText.replace(/\n/g, ' | '));
  ok('Top 3 có 3/3 (mẫu + giữ từ hôm qua + tự điền việc trễ hạn)', /3\/3/.test(top) && /Làm bài kiểm tra cuối khóa/.test(top) && /Vẽ biểu đồ/.test(top) && /Gửi bảng KPI/.test(top), top);
  async function checkMatrix(label) {
    const dom = await matrixDOM(p); const ts = await T(p);
    const rest = ts.filter(t => !(t.is_top3 === 'TRUE' && t.top3_date === TODAY));
    const shown = rest.filter(t => t.status !== 'Xong' || t.done_at === TODAY);
    let good = true, msg = [];
    for (const q of [1, 2, 3, 4]) {
      const exp = shown.filter(t => quad(t) === q).map(t => t.id).sort();
      const got = (dom[q] ? dom[q].ids : []).slice().sort();
      const expOpen = shown.filter(t => quad(t) === q && t.status !== 'Xong').length;
      if (JSON.stringify(exp) !== JSON.stringify(got)) { good = false; msg.push('ô' + q + ' khác tập task'); }
      if (!dom[q] || +dom[q].count !== expOpen) { good = false; msg.push('ô' + q + ' đếm ' + (dom[q] && dom[q].count) + ' != ' + expOpen); }
    }
    ok('Ma trận khớp tính tay (' + label + ')', good, msg.join('; ') + ' ' + JSON.stringify([1, 2, 3, 4].map(q => dom[q] && dom[q].count)));
  }
  await checkMatrix('ban đầu');
  const nowExp = tasks.filter(t => t.status !== 'Xong' && quad(t) === 1).length;
  // Biểu đồ tổng quan: tính tay rồi so với số trên màn hình
  async function checkOverview(label) {
    const ts = await T(p), tm = addDays(TODAY, 1);
    const work = ts.filter(t => t.status === 'Xong' ? t.done_at === TODAY : ((t.is_top3 === 'TRUE' && t.top3_date === TODAY) || (t.due_date && t.due_date <= tm)));
    const done = work.filter(t => t.status === 'Xong').length;
    const big = await p.locator('.ov-big .num').innerText();
    const over = work.filter(t => t.status !== 'Xong' && t.due_date && t.due_date < TODAY).length;
    const legend = await p.locator('.ov-legend li', { hasText: 'Quá hạn' }).innerText();
    ok('Biểu đồ tổng quan khớp tính tay (' + label + ')', big === done + '/' + work.length && +(legend.match(/(\d+)/) || [])[1] === over, big + ' vs ' + done + '/' + work.length + '; ' + legend + ' vs ' + over);
  }
  await checkOverview('ban đầu');
  void nowExp;
  const mtask = tasks.find(t => t.title === 'Gia hạn bảo hiểm xe');
  await pc(p, `.matrix [data-action="toggle-task"][data-id="${mtask.id}"]`);
  await p.waitForTimeout(150);
  ok('Tick ở ma trận -> task Xong', (await T(p)).find(t => t.id === mtask.id).status === 'Xong');
  ok('Có .fx sau tick', await p.locator('.fx').count() > 0, '' + await p.locator('.fx').count());
  ok('Có toast động viên (is-cheer)', await p.locator('.toast.is-cheer').count() === 1, await p.locator('.toast').first().innerText().catch(() => ''));
  await p.screenshot({ path: SS + '/lp-02-tick-fx-390.png' });
  await p.waitForTimeout(3300);
  ok('.fx tự biến mất', await p.locator('.fx').count() === 0, '' + await p.locator('.fx').count());
  await checkMatrix('sau tick');
  await pc(p, `.matrix [data-action="toggle-task"][data-id="${mtask.id}"]`);
  await p.waitForTimeout(150);
  const after = (await T(p)).find(t => t.id === mtask.id);
  ok('Bỏ tick ở ma trận -> Cần làm, done_at rỗng', after.status === 'Cần làm' && after.done_at === '', after.status + '/' + after.done_at);
  await checkMatrix('sau bỏ tick');
  const topT = tasks.find(t => t.title === 'Vẽ biểu đồ so sánh các quý');
  await pc(p, `.notes [data-action="toggle-task"][data-id="${topT.id}"]`);
  await p.waitForTimeout(150);
  ok('Tick ở Top 3 -> Xong', (await T(p)).find(t => t.id === topT.id).status === 'Xong');
  await checkOverview('sau tick Top 3');
  await pc(p, `.notes [data-action="toggle-task"][data-id="${topT.id}"]`);
  await p.waitForTimeout(150);
  ok('Bỏ tick ở Top 3', (await T(p)).find(t => t.id === topT.id).status === 'Cần làm');
  await p.click('[data-action="today-view"][data-view="list"]');
  await p.waitForTimeout(100);
  ok('Chuyển Bảng: có .ttable, không có .matrix', await p.locator('.ttable').count() > 0 && await p.locator('.matrix').count() === 0);
  await p.screenshot({ path: SS + '/lp-03-danhsach-390.png', fullPage: true });
  await layoutChecks(p, 'Hôm nay danh sách 390');
  await small(p, '.ttable .tick, .notes .tick', 44, 'Nút tick');
  await small(p, '.star', 44, 'Nút sao');
  await small(p, '.round', 44, 'Nút tròn đầu trang');
  await small(p, '.fab', 44, 'Nút thêm (+)');
  await small(p, '.tabbar .tab', 44, 'Tab');
  const bodyTxt = await p.innerText('.today-side');
  console.log(bodyTxt.replace(/\n+/g, ' | ').slice(0, 900));
  const lt = tasks.find(t => t.title === 'Mua giấy in cho phòng');
  await pc(p, `.ttable [data-action="toggle-task"][data-id="${lt.id}"]`);
  await p.waitForTimeout(150);
  const lt2 = (await T(p)).find(t => t.id === lt.id);
  ok('Tick ở danh sách -> Xong, done_at = hôm nay', lt2.status === 'Xong' && lt2.done_at === TODAY, lt2.status + '/' + lt2.done_at);
  ok('Task xong vẫn hiện (gạch) trong danh sách', await p.locator(`tr.is-done [data-id="${lt.id}"]`).count() > 0);
  await pc(p, `.ttable [data-action="toggle-task"][data-id="${lt.id}"]`);
  await p.waitForTimeout(150);
  ok('Bỏ tick ở danh sách', (await T(p)).find(t => t.id === lt.id).status === 'Cần làm');
  await p.reload(); await p.waitForSelector('.site-head'); await p.waitForTimeout(400);
  ok('Tải lại: nhớ chế độ Bảng', await p.locator('.ttable').count() > 0 && await p.locator('.matrix').count() === 0);
  await p.click('[data-action="today-view"][data-view="matrix"]');
  await p.reload(); await p.waitForSelector('.site-head'); await p.waitForTimeout(400);
  ok('Tải lại: nhớ chế độ Ma trận', await p.locator('.matrix').count() === 1);
  ok('Tải lại: dữ liệu tick trước đó còn (localStorage)', (await T(p)).length === tasks.length);
  async function qa(title) { await p.fill('#quick-add-today', title); await p.press('#quick-add-today', 'Enter'); await p.waitForTimeout(150); return (await T(p)).find(t => t.title === title); }
  const cases = [['Chạy bộ', 'shoe'], ['Đọc sách', 'book'], ['Gọi điện cho mẹ', 'phone'], ['Họp nhóm', 'users'], ['Uống nước', 'drop'], ['Đi ngủ sớm', 'moon'], ['Làm gì đó lạ', 'note'], ['Tập gym', 'dumbbell'], ['Gửi email', 'mail'], ['Nấu cơm', 'food']];
  for (const [ti, ic] of cases) { const t = await qa(ti); ok('Thêm nhanh "' + ti + '" -> icon ' + ic, t && t.icon === ic, t && t.icon); }
  const nt = (await T(p)).find(t => t.title === 'Chạy bộ');
  ok('Thêm nhanh mặc định: hạn hôm nay, TB, Cần làm', nt.due_date === TODAY && nt.priority === 'Trung bình' && nt.status === 'Cần làm' && nt.goal_id === '');
  ok('"Chạy bộ" vào ô Xử lý sau (Q3)', (await matrixDOM(p))[3].ids.includes(nt.id));
  await checkMatrix('sau thêm nhanh');
  await p.click('[data-action="today-view"][data-view="list"]');
  await p.waitForTimeout(100);
  // Top 3 đã tự điền đủ 3: bỏ sao một việc tự điền trước, và nó không tự quay lại
  const auto1 = (await T(p)).find(t => t.title === 'Gửi bảng KPI nháp cho anh Minh');
  await p.click(`.notes [data-action="toggle-top3"][data-id="${auto1.id}"]`);
  await p.waitForTimeout(150);
  ok('Bỏ sao việc tự điền -> Top 3 còn 2', (await T(p)).filter(t => t.is_top3 === 'TRUE' && t.top3_date === TODAY).length === 2);
  await p.click(`.ttable [data-action="toggle-top3"][data-id="${nt.id}"]`);
  await p.waitForTimeout(150);
  let t3 = (await T(p)).filter(t => t.is_top3 === 'TRUE' && t.top3_date === TODAY).length;
  ok('Bấm sao thêm vào Top 3 (đủ 3)', t3 === 3, '' + t3);
  const t2 = (await T(p)).find(t => t.title === 'Đọc sách');
  await p.click(`.ttable [data-action="toggle-top3"][data-id="${t2.id}"]`);
  await p.waitForTimeout(200);
  t3 = (await T(p)).filter(t => t.is_top3 === 'TRUE' && t.top3_date === TODAY).length;
  ok('Giới hạn 3: bấm sao lần 4 không thêm', t3 === 3, '' + t3);
  console.log('toast sau sao thứ 4:', await p.locator('.toast').first().innerText().catch(() => '(không toast)'));
  ok('Sao thứ 4 có thông báo giới hạn', await p.locator('.toast').count() === 1);
  await p.screenshot({ path: SS + '/lp-04-top3-day-390.png', fullPage: true });
  await p.click(`.notes [data-action="toggle-top3"][data-id="${nt.id}"]`);
  await p.waitForTimeout(150);
  t3 = (await T(p)).filter(t => t.is_top3 === 'TRUE' && t.top3_date === TODAY).length;
  ok('Bấm sao ở Top 3 để bỏ -> còn 2', t3 === 2, '' + t3);
  await ctx.close();

  // ===== B. Top 3 hôm qua giữ sang
  ({ ctx, p } = await mk(browser, { q: '?today=2026-11-22' }));
  const topTxt22 = await p.locator('#top3-title').evaluate(e => e.closest('section').innerText.replace(/\n/g, ' | '));
  console.log('Top3 ngày 22:', topTxt22);
  ok('Giả lập ngày 22: Top 3 hôm trước chưa xong còn hiện', /Làm bài kiểm tra cuối khóa/.test(topTxt22), topTxt22);
  await ctx.close();

  // ===== C. Hiệu ứng 100%
  ({ ctx, p } = await mk(browser));
  tasks = await T(p);
  const last = tasks.find(t => t.title === 'Làm bài kiểm tra cuối khóa');
  await pc(p, `.notes [data-action="toggle-task"][data-id="${last.id}"]`);
  await p.waitForTimeout(200);
  const nfx = await p.locator('.fx').count();
  const tmsg = await p.locator('.toast').first().innerText();
  ok('Task cuối đạt 100%: toast "đạt 100%"', /đạt 100%/.test(tmsg), tmsg);
  ok('Task cuối đạt 100%: hoa bung nhiều hơn (56)', nfx >= 50, '' + nfx);
  await p.screenshot({ path: SS + '/lp-05-dat100-390.png' });
  await ctx.close();
  ({ ctx, p } = await mk(browser));
  tasks = await T(p);
  const nn = tasks.find(t => t.title === 'Chạy 3 km buổi tối');
  await p.click('[data-action="today-view"][data-view="list"]'); await p.waitForTimeout(100);
  await pc(p, `.ttable [data-action="toggle-task"][data-id="${nn.id}"]`);
  await p.waitForTimeout(150);
  const n32 = await p.locator('.fx').count();
  ok('Tick thường: 32 hoa', n32 >= 28 && n32 <= 32, '' + n32);
  ok('Tick thường: toast không "đạt 100%"', !/100%/.test(await p.locator('.toast').first().innerText()));
  await ctx.close();
  ({ ctx, p } = await mk(browser, { reduce: true }));
  tasks = await T(p);
  const rt = tasks.find(t => t.title === 'Gia hạn bảo hiểm xe');
  await pc(p, `.matrix [data-action="toggle-task"][data-id="${rt.id}"]`);
  await p.waitForTimeout(200);
  ok('reduced-motion: không sinh .fx', await p.locator('.fx').count() === 0);
  ok('reduced-motion: vẫn có toast động viên', await p.locator('.toast.is-cheer').count() === 1);
  // reduced + 100%
  const last2 = tasks.find(t => t.title === 'Làm bài kiểm tra cuối khóa');
  await pc(p, `.notes [data-action="toggle-task"][data-id="${last2.id}"]`);
  await p.waitForTimeout(200);
  ok('reduced-motion + đạt 100%: không .fx, có toast 100%', await p.locator('.fx').count() === 0 && /100%/.test(await p.locator('.toast').first().innerText()));
  await ctx.close();

  // ===== D. Nền
  ({ ctx, p } = await mk(browser));
  await p.click('#btn-bg'); await p.waitForTimeout(150);
  await p.screenshot({ path: SS + '/lp-06-popup-nen-390.png' });
  ok('Popup hình nền mở', await p.locator('#bg-pop').isVisible());
  await pc(p, '[data-bg="plain"]'); await p.waitForTimeout(200);
  const hidden = () => p.evaluate(() => { const e = document.getElementById('bg-flowers'); const s = getComputedStyle(e); return s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0; });
  ok('Chọn Trơn: data-bg=plain, lớp hoa ẩn', await p.evaluate(() => document.documentElement.dataset.bg) === 'plain' && await hidden());
  await p.reload(); await p.waitForSelector('.site-head'); await p.waitForTimeout(300);
  ok('Tải lại: vẫn Trơn, hoa ẩn', await p.evaluate(() => document.documentElement.dataset.bg) === 'plain' && await hidden());
  await p.click('#btn-bg'); await pc(p, '[data-bg="flowers"]'); await p.waitForTimeout(200);
  ok('Chọn lại Hoa: hiện', await p.evaluate(() => document.documentElement.dataset.bg) === 'flowers' && !(await hidden()));
  await ctx.close();

  // ===== E. Form sửa task
  ({ ctx, p } = await mk(browser));
  await p.click('[data-action="today-view"][data-view="list"]'); await p.waitForTimeout(100);
  tasks = await T(p);
  const et = tasks.find(t => t.title === 'Mua giấy in cho phòng');
  await p.click(`.ttable [data-action="open-task"][data-id="${et.id}"]`);
  await p.waitForSelector('.modal form [name="title"]');
  await p.screenshot({ path: SS + '/lp-07-form-task-390.png' });
  ok('Form có 24 icon', await p.locator('input[name="icon"]').count() === 24, '' + await p.locator('input[name="icon"]').count());
  const cur = await p.evaluate(() => document.querySelector('input[name="icon"]:checked') && document.querySelector('input[name="icon"]:checked').value);
  ok('Form: icon hiện tại được chọn (cart)', cur === 'cart', cur);
  await p.fill('.modal form [name="title"]', 'Tập yoga buổi sáng');
  ok('Đổi tên khi chưa chọn icon -> icon tự đổi (dumbbell)', await p.evaluate(() => document.querySelector('input[name="icon"]:checked').value) === 'dumbbell');
  await p.fill('.modal form [name="title"]', 'Gọi điện cho khách');
  ok('Đổi tên lần 2 -> phone', await p.evaluate(() => document.querySelector('input[name="icon"]:checked').value) === 'phone');
  await p.click('input[name="icon"][value="gift"] + span');
  await p.fill('.modal form [name="title"]', 'Chạy bộ buổi sáng');
  ok('Đã chọn tay icon: đổi tên không ghi đè', await p.evaluate(() => document.querySelector('input[name="icon"]:checked').value) === 'gift');
  await p.fill('.modal form [name="title"]', '   ');
  await p.click('.modal form button[type="submit"]'); await p.waitForTimeout(150);
  ok('Ô tên trống -> báo lỗi, không đóng form', await p.locator('[data-err="title"]').isVisible() && await p.locator('.modal form').count() === 1);
  await p.screenshot({ path: SS + '/lp-08-form-loi-390.png' });
  await p.fill('.modal form [name="title"]', 'Mua quà sinh nhật');
  await p.click('.modal form button[type="submit"]'); await p.waitForTimeout(250);
  const saved = (await T(p)).find(t => t.id === et.id);
  ok('Lưu xong icon = gift (chọn tay)', saved.icon === 'gift' && saved.title === 'Mua quà sinh nhật', saved.icon);
  const rowIcon = await p.evaluate(id => { const b = document.querySelector('[data-action="open-task"][data-id="' + id + '"]'); const s = b && (b.closest('li') ? b.closest('li').querySelector('.ticon svg') : b.querySelector('svg.icon')); return s ? s.outerHTML.length : 0; }, et.id);
  ok('Dòng task hiện ô icon sau khi lưu', rowIcon > 50, '' + rowIcon);
  const et2 = (await T(p)).find(t => t.title === 'Chạy 5 km cuối tuần');
  await p.click('[data-action="today-view"][data-view="matrix"]'); await p.waitForTimeout(100);
  await p.click(`.matrix [data-action="open-task"][data-id="${et2.id}"]`);
  await p.waitForSelector('.modal form [name="title"]');
  await p.fill('.modal form [name="title"]', 'Ôn thi tiếng Anh');
  const ic2 = await p.evaluate(() => document.querySelector('input[name="icon"]:checked').value);
  ok('Task có icon tự đoán: đổi tên thì icon đổi (grad)', ic2 === 'grad', ic2);
  await p.click('.modal form button[type="submit"]'); await p.waitForTimeout(250);
  ok('Lưu icon grad', (await T(p)).find(t => t.id === et2.id).icon === 'grad');
  // Top3 trong form: đang 2, bật task thứ 3 OK, task thứ 4 báo lỗi
  const autoT = (await T(p)).find(t => t.title === 'Gửi bảng KPI nháp cho anh Minh' && t.is_top3 === 'TRUE' && t.top3_date === TODAY);
  if (autoT) { await p.click(`.notes [data-action="toggle-top3"][data-id="${autoT.id}"]`); await p.waitForTimeout(150); }
  const A = (await T(p)).filter(t => t.status !== 'Xong' && !(t.is_top3 === 'TRUE' && t.top3_date === TODAY)).slice(0, 2);
  const results = [];
  for (const x of A) {
    await p.click(`[data-action="open-task"][data-id="${x.id}"]`);
    await p.waitForSelector('.modal form [name="title"]');
    await p.check('form [name="top3"]');
    await p.click('.modal form button[type="submit"]'); await p.waitForTimeout(250);
    if (await p.locator('.modal form').count()) { results.push('lỗi top3 hiện=' + await p.locator('[data-err="top3"]').isVisible()); await p.screenshot({ path: SS + '/lp-09-form-top3-day.png' }); await p.click('[data-close]'); await p.waitForTimeout(150); }
    else results.push('đã lưu');
  }
  ok('Form: task Top3 thứ 3 lưu được, thứ 4 bị chặn có báo lỗi', results[0] === 'đã lưu' && /lỗi top3 hiện=true/.test(results[1]), results.join(' ; '));
  await ctx.close();

  // ===== F. Mục tiêu
  ({ ctx, p } = await mk(browser));
  await pc(p, '.tab[data-tab="goals"]'); await p.waitForSelector('.goal-grid'); await p.waitForTimeout(300);
  await p.screenshot({ path: SS + '/lp-10-muctieu-390.png', fullPage: true });
  await layoutChecks(p, 'Mục tiêu 390');
  // % mục tiêu tính cả lần lặp đã bỏ lỡ (chỉ bỏ việc lặp mẫu)
  const goals2 = await G(p); tasks = await p.evaluate(() => JSON.parse(JSON.stringify(App.store.get().tasks.filter(t => !App.logic.isTemplate(t)))));
  const cards = await p.evaluate(() => [...document.querySelectorAll('.goal-grid .goal')].map(c => ({
    id: c.dataset.id, name: c.querySelector('.goal-name').textContent, pct: c.querySelector('.pct').textContent.trim(),
    hearts: c.querySelectorAll('.hearts .fill').length, dl: [...c.querySelectorAll('.meta .tag')].map(x => x.textContent.trim() + '[' + x.className + ']'), foot: c.querySelector('.goal-foot').textContent.replace(/\s+/g, ' ').trim()
  })));
  console.log(JSON.stringify(cards));
  for (const g of goals2) {
    const c = cards.find(x => x.id === g.id);
    const metric = g.progress_mode === 'metric', habitMode = g.progress_mode === 'habit';
    const mine = tasks.filter(t => t.goal_id === g.id), done = mine.filter(t => t.status === 'Xong').length;
    // Theo thói quen: tự đếm ngày cần làm từ đầu kỳ đến hôm nay (hôm nay chỉ tính khi đã tick)
    const hp = habitMode ? await p.evaluate(gid => {
      const st = App.store.get(), td = App.date.today(), g = st.goals.find(x => x.id === gid);
      let dn = 0, tot = 0;
      st.habits.filter(h => h.goal_id === gid).forEach(h => {
        const ticks = new Set(st.habitLogs.filter(l => l.habit_id === h.id && l.done === 'TRUE').map(l => l.date));
        let from = h.created_at.slice(0, 10); ticks.forEach(d => { if (d < from) from = d; });
        if (g.start_date > from) from = g.start_date;
        const to = g.end_date < td ? g.end_date : td;
        for (let d = from; d <= to; d = App.date.addDays(d, 1)) {
          if (!App.logic.ruleMatches(h.frequency, d)) continue;
          if (ticks.has(d)) { dn++; tot++; } else if (d !== td) tot++;
        }
      });
      return { dn, tot };
    }, g.id) : null;
    const pct = habitMode ? (hp.tot ? Math.round(hp.dn / hp.tot * 100) : 0) : metric ? Math.round(+g.actual / +g.target * 100) : mine.length ? Math.round(done / mine.length * 100) : 0;
    ok('Thẻ "' + g.name + '": % = ' + pct, c && c.pct === pct + '%', c && c.pct);
    ok('  tim = ' + g.importance, c && c.hearts === +g.importance, c && '' + c.hearts);
    let exp;
    const d = Math.round((Date.parse(g.end_date) - Date.parse(TODAY)) / 86400000);
    if (g.status === 'Hoàn thành') exp = 'Hoàn thành'; else if (g.status === 'Tạm dừng') exp = 'Tạm dừng'; else exp = d < 0 ? 'Quá hạn ' + (-d) + ' ngày' : d === 0 ? 'Hết hạn hôm nay' : 'Còn ' + d + ' ngày';
    ok('  nhãn hạn = "' + exp + '"', c && c.dl.some(x => x.includes(exp)), c && c.dl.join(' / '));
    if (habitMode) ok('  foot thói quen ' + hp.dn + '/' + hp.tot, c && c.foot.includes(hp.dn + '/' + hp.tot + ' ngày đã tick'), c && c.foot);
    else if (metric) ok('  foot chỉ số ' + g.actual + '/' + g.target, c && c.foot.includes(g.actual + '/' + g.target), c && c.foot);
    else ok('  foot đúng ' + done + '/' + mine.length, c && (mine.length ? c.foot.includes(done + '/' + mine.length) : /Chưa có task/.test(c.foot)), c && c.foot);
  }
  for (const [k, exp] of [['Công việc', 2], ['Học tập', 1], ['Sức khỏe', 4], ['', 7]]) {
    await p.click(`[data-action="filter-group"][data-group="${k}"]`); await p.waitForTimeout(100);
    const n = await p.locator('.goal-grid .goal').count();
    ok('Lọc nhóm "' + (k || 'Tất cả') + '" -> ' + exp + ' thẻ', n === exp, '' + n);
  }
  const g1c = cards.find(x => x.name.startsWith('Hoàn thành báo cáo'));
  await p.click(`[data-action="open-goal"][data-id="${g1c.id}"]`); await p.waitForSelector('.goal-detail'); await p.waitForTimeout(300);
  await p.screenshot({ path: SS + '/lp-11-chitiet-390.png', fullPage: true });
  await layoutChecks(p, 'Chi tiết mục tiêu 390');
  ok('Chi tiết: 6 task', await p.locator('.task-list > li').count() === 6, '' + await p.locator('.task-list > li').count());
  await p.fill('#quick-add-goal', 'Task thử trong mục tiêu'); await p.press('#quick-add-goal', 'Enter'); await p.waitForTimeout(200);
  ok('Thêm task trong chi tiết: 7 task, 29%', await p.locator('.task-list > li').count() === 7 && /29%/.test(await p.locator('.goal-detail .pct').innerText()), await p.locator('.goal-detail .pct').innerText());
  await p.click('[data-action="edit-goal"]'); await p.waitForSelector('form [name="name"]');
  await p.screenshot({ path: SS + '/lp-12-form-muctieu-390.png' });
  ok('Form mục tiêu có 3 mức quan trọng', await p.locator('input[name="importance"]').count() === 3);
  ok('Mức quan trọng hiện tại = 3', await p.evaluate(() => document.querySelector('input[name="importance"]:checked').value) === '3');
  await p.click('input[name="importance"][value="1"] + *');
  await p.fill('form [name="name"]', '');
  await p.click('.modal form button[type="submit"]'); await p.waitForTimeout(150);
  ok('Tên mục tiêu trống -> báo lỗi', await p.locator('[data-err="name"]').isVisible());
  await p.fill('form [name="name"]', 'KPI quý đã sửa');
  await p.click('.modal form button[type="submit"]'); await p.waitForTimeout(250);
  const gg = (await G(p)).find(g => g.id === g1c.id);
  ok('Sửa mục tiêu: lưu tên + importance=1', gg.name === 'KPI quý đã sửa' && gg.importance === '1', gg.importance);
  await p.click('.back'); await p.waitForSelector('.goal-grid');
  await p.click('.page-head [data-action="new-goal"]'); await p.waitForSelector('form [name="name"]');
  await p.fill('form [name="name"]', 'Mục tiêu mới thử');
  await p.click('input[name="importance"][value="3"] + *');
  const grpEl = await p.locator('form [name="group"]').first();
  const tag = await grpEl.evaluate(e => e.tagName + ':' + e.type);
  console.log('group control:', tag);
  if (/SELECT/.test(tag)) await p.selectOption('form [name="group"]', 'Sức khỏe'); else await p.click('input[name="group"][value="Sức khỏe"] + *');
  await p.click('.modal form button[type="submit"]'); await p.waitForTimeout(300);
  const ng = (await G(p)).find(g => g.name === 'Mục tiêu mới thử');
  ok('Thêm mục tiêu: importance 3, nhóm Sức khỏe, chuyển tới chi tiết', ng && ng.importance === '3' && ng.group === 'Sức khỏe' && /muc-tieu\/.+/.test(await p.evaluate(() => location.hash)), JSON.stringify(ng && [ng.importance, ng.group, ng.end_date]));
  ok('Chi tiết 0 task: "Chưa có task", 0%', /Chưa có task/.test(await p.innerText('.goal-detail')) && /0%/.test(await p.locator('.goal-detail .pct').innerText()));
  await p.screenshot({ path: SS + '/lp-13-muctieu-moi-390.png', fullPage: true });
  await p.click('[data-action="delete-goal"]'); await p.waitForTimeout(200);
  console.log('dialog xóa 0 task:', (await p.locator('dialog, [role="dialog"], .modal').first().innerText()).replace(/\n/g, ' | '));
  await p.screenshot({ path: SS + '/lp-14-hoi-xoa-390.png' });
  await p.click('button:has-text("Hủy")'); await p.waitForTimeout(150);
  ok('Hủy xóa: mục tiêu còn', !!(await G(p)).find(g => g.name === 'Mục tiêu mới thử'));
  await p.click('[data-action="delete-goal"]'); await p.waitForTimeout(200);
  await p.click('button:has-text("Xóa mục tiêu")'); await p.waitForTimeout(300);
  ok('Xóa mục tiêu 0 task OK', !(await G(p)).find(g => g.name === 'Mục tiêu mới thử'));
  console.log('hash sau xóa:', await p.evaluate(() => location.hash));
  // xóa mục tiêu có task - giữ task
  await p.evaluate(id => { location.hash = '#/muc-tieu/' + id; }, g1c.id); await p.waitForSelector('.goal-detail'); await p.waitForTimeout(300);
  const nT0 = (await T(p)).length;
  const n1 = (await T(p)).filter(t => t.goal_id === g1c.id).length;
  await p.click('[data-action="delete-goal"]'); await p.waitForTimeout(200);
  const dtxt = (await p.locator('dialog, [role="dialog"], .modal').first().innerText()).replace(/\n/g, ' | ');
  console.log('dialog xóa có task:', dtxt);
  await p.screenshot({ path: SS + '/lp-15-hoi-xoa-co-task-390.png' });
  ok('Hộp hỏi xóa có 2 lựa chọn giữ/xóa theo', /Giữ task/.test(dtxt) && /Xóa luôn/.test(dtxt));
  await p.click('button:has-text("Giữ task")'); await p.waitForTimeout(300);
  const afterT = await T(p);
  ok('Xóa giữ task: ' + n1 + ' task còn nguyên, thành Việc lặt vặt', afterT.length === nT0 && afterT.filter(t => t.goal_id === g1c.id).length === 0, afterT.length + '/' + nT0);
  ok('Mục tiêu đã xóa', !(await G(p)).find(g => g.id === g1c.id));
  const g3c = cards.find(x => x.name.startsWith('Chạy bộ'));
  await p.evaluate(id => { location.hash = '#/muc-tieu/' + id; }, g3c.id); await p.waitForSelector('.goal-detail'); await p.waitForTimeout(300);
  const nT1 = (await T(p)).length, cnt = (await T(p)).filter(t => t.goal_id === g3c.id).length;
  await p.click('[data-action="delete-goal"]'); await p.waitForTimeout(200);
  await p.click('button:has-text("Xóa luôn")'); await p.waitForTimeout(300);
  ok('Xóa kèm task: task bị xóa theo (' + cnt + ')', (await T(p)).length === nT1 - cnt, (await T(p)).length + '/' + nT1);
  await ctx.close();

  // ===== G. Sắp có
  ({ ctx, p } = await mk(browser));
  for (const [tab, h] of [['tong-ket', 'Tổng kết']]) {
    await pc(p, `.tab[data-tab="${tab}"]`); await p.waitForSelector('.soon-card'); await p.waitForTimeout(150);
    const tx = await p.innerText('.soon-card');
    ok('Tab ' + h + ': "sắp có" + nút Về Hôm nay', /sắp có/i.test(tx) && await p.locator('.soon-card a[href="#/hom-nay"]').count() === 1, tx.replace(/\n/g, ' | '));
    ok('Tab ' + h + ' có nhãn "Sắp có" trên thanh tab', /Sắp có/.test(await p.locator(`.tab[data-tab="${tab}"]`).innerText()));
    await p.screenshot({ path: SS + '/lp-16-sapco-390.png', fullPage: true });
    await layoutChecks(p, 'Sắp có ' + h);
    await p.click('.soon-card a[href="#/hom-nay"]'); await p.waitForTimeout(150);
    ok('  Nút về Hôm nay hoạt động', await p.locator('#top3-title').count() === 1);
  }
  await ctx.close();

  // ===== H. Lưu lỗi
  ({ ctx, p } = await mk(browser, { q: '?today=' + TODAY + '&fail=1' }));
  await p.fill('#quick-add-today', 'Việc sẽ lỗi'); await p.press('#quick-add-today', 'Enter');
  await p.waitForTimeout(1800);
  const syncTxt = await p.innerText('#sync').catch(() => '');
  const toastTxt = await p.locator('.toast').first().innerText().catch(() => '');
  console.log('sync:', syncTxt, '| toast:', toastTxt);
  await p.screenshot({ path: SS + '/lp-17-luu-loi-390.png' });
  ok('fail=1: có thông báo lỗi lưu', /lỗi|không lưu|thất bại/i.test(syncTxt + toastTxt));
  ok('fail=1: có nút Thử lại', await p.locator('button:has-text("Thử lại")').count() > 0);
  await ctx.close();

  // ===== I. 1280 + ma trận tên dài 390
  ({ ctx, p } = await mk(browser, { w: 1280, h: 900 }));
  await p.screenshot({ path: SS + '/lp-20-homnay-matran-1280.png', fullPage: true });
  await layoutChecks(p, 'Hôm nay ma trận 1280');
  await p.click('[data-action="today-view"][data-view="list"]'); await p.waitForTimeout(150);
  await p.screenshot({ path: SS + '/lp-21-homnay-ds-1280.png', fullPage: true });
  await layoutChecks(p, 'Hôm nay DS 1280');
  await pc(p, '.tab[data-tab="goals"]'); await p.waitForSelector('.goal-grid'); await p.waitForTimeout(300);
  await p.screenshot({ path: SS + '/lp-22-muctieu-1280.png', fullPage: true });
  await layoutChecks(p, 'Mục tiêu 1280');
  await p.click('.goal-grid .goal'); await p.waitForSelector('.goal-detail'); await p.waitForTimeout(300);
  await p.screenshot({ path: SS + '/lp-23-chitiet-1280.png', fullPage: true });
  await layoutChecks(p, 'Chi tiết 1280');
  await pc(p, '.tab[data-tab="task"]'); await p.waitForSelector('.task-filters');
  await p.screenshot({ path: SS + '/lp-24-task-1280.png', fullPage: true });
  await layoutChecks(p, 'Tab Task 1280');
  await ctx.close();
  ({ ctx, p } = await mk(browser));
  await p.fill('#quick-add-today', 'Một tên việc rất dài để thử xem ô ma trận có cắt bằng dấu ba chấm hay không nhé bạn ơi ' + 'x'.repeat(60)); await p.press('#quick-add-today', 'Enter'); await p.waitForTimeout(200);
  await layoutChecks(p, 'Ma trận tên dài 390');
  const ell = await p.evaluate(() => { const e = [...document.querySelectorAll('.qname span')].find(s => s.textContent.startsWith('Một tên việc')); const s = getComputedStyle(e); return [s.webkitLineClamp, e.getBoundingClientRect().right <= innerWidth]; });
  ok('Tên dài trong ma trận xuống tối đa 2 dòng rồi cắt', String(ell[0]) === '2' && ell[1], JSON.stringify(ell));
  await p.screenshot({ path: SS + '/lp-25-matran-tendai-390.png', fullPage: true });
  await ctx.close();

  // ===== J. Xác nhận sau sửa: click thật, vị trí nút tick, vùng bấm 44px, hình nền
  for (const W of [390, 1280]) {
    ({ ctx, p } = await mk(browser, { w: W, h: W === 390 ? 844 : 900 }));
    const L = 'J@' + W + ': ';
    for (const tab of ['today', 'goals', 'task', 'habits', 'tong-ket']) {
      const sel = '.tab[data-tab="' + tab + '"]';
      if (!(await p.locator(sel).count())) { ok(L + 'tab ' + tab + ' tồn tại', false); continue; }
      let good = true, msg = '';
      try { await p.click(sel, { timeout: 4000 }); } catch (e) { good = false; msg = e.message.split('\n')[0]; }
      await p.waitForTimeout(250);
      ok(L + 'click thật tab ' + tab, good, msg + ' hash=' + await p.evaluate(() => location.hash));
    }
    await p.click('.tab[data-tab="today"]', { timeout: 4000 }).catch(() => {}); await p.waitForTimeout(250);
    async function tickTest(name, scopeSel, title, ensureView) {
      if (ensureView) { await p.click('[data-action="today-view"][data-view="' + ensureView + '"]'); await p.waitForTimeout(150); }
      const tk = (await T(p)).find(t => t.title === title);
      const sel = scopeSel + ' [data-action="toggle-task"][data-id="' + tk.id + '"]';
      const relF = () => p.evaluate(s => { const e = document.querySelector(s); const r = e.getBoundingClientRect(), l = e.closest('li,tr').getBoundingClientRect(); return [Math.round(r.left - l.left), Math.round(r.top - l.top), Math.round(r.top + r.height / 2 - l.top - l.height / 2)]; }, sel);
      const box0 = await relF();
      let msg = '', good = true;
      try { await p.click(sel, { timeout: 4000 }); } catch (e) { good = false; msg = 'click1 ' + e.message.split('\n')[0]; }
      const samples = [];
      for (let i = 0; i < 3; i++) { await p.waitForTimeout(100); samples.push(await relF()); }
      const moved = samples.some(s => Math.abs(s[0] - box0[0]) > 4 || Math.abs(s[2]) > 6);
      ok(L + name + ': nút tick giữ đúng chỗ (trái + căn giữa dòng) 100-300ms sau click', !moved, 'trước=' + JSON.stringify(box0) + ' sau=' + JSON.stringify(samples));
      ok(L + name + ': sau click 1 task Xong', (await T(p)).find(t => t.id === tk.id).status === 'Xong');
      await p.waitForTimeout(900);
      try { await p.click(sel, { timeout: 4000 }); } catch (e) { good = false; msg += ' click2 ' + e.message.split('\n')[0]; }
      await p.waitForTimeout(200);
      ok(L + name + ': bấm lại bằng click thật -> bỏ tick', good && (await T(p)).find(t => t.id === tk.id).status !== 'Xong', msg);
      await p.waitForTimeout(3300);
    }
    await tickTest('ma trận', '.matrix', 'Gia hạn bảo hiểm xe', 'matrix');
    await tickTest('Top 3', '.notes', 'Vẽ biểu đồ so sánh các quý', null);
    await tickTest('bảng', '.ttable', 'Mua giấy in cho phòng', 'list');
    await p.click('#btn-bg', { timeout: 4000 }); await p.waitForTimeout(200);
    let g1 = true, m1 = '';
    try { await p.click('[data-bg="plain"]', { timeout: 4000 }); } catch (e) { g1 = false; m1 = e.message.split('\n')[0]; }
    await p.waitForTimeout(250);
    ok(L + 'click thật "Trơn"', g1 && await p.evaluate(() => document.documentElement.dataset.bg) === 'plain', m1);
    await p.screenshot({ path: SS + '/lp-30-nen-' + W + '.png' });
    if (!(await p.locator('[data-bg="flowers"]').isVisible().catch(() => false))) await p.click('#btn-bg', { timeout: 4000 }).catch(() => {});
    await p.waitForTimeout(200);
    let g2 = true, m2 = '';
    try { await p.click('[data-bg="flowers"]', { timeout: 4000 }); } catch (e) { g2 = false; m2 = e.message.split('\n')[0]; }
    await p.waitForTimeout(250);
    ok(L + 'click thật "Hoa bay nhẹ"', g2 && await p.evaluate(() => document.documentElement.dataset.bg) === 'flowers', m2);
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    await p.click('[data-action="today-view"][data-view="list"]'); await p.waitForTimeout(150);
    await small(p, '[data-action="today-view"]', 44, L + 'nút Danh sách/Ma trận');
    await p.click('[data-action="today-view"][data-view="matrix"]'); await p.waitForTimeout(150);
    await small(p, '.matrix .tick', 44, L + 'tick trong ma trận');
    await small(p, '.tabbar .tab', 44, L + 'tab');
    await p.click('.tab[data-tab="goals"]', { timeout: 4000 }); await p.waitForSelector('.goal-grid'); await p.waitForTimeout(200);
    await small(p, '[data-action="filter-group"]', 44, L + 'chip lọc nhóm');
    await p.click('.page-head [data-action="new-goal"]'); await p.waitForSelector('form [name="name"]');
    const labG = await p.evaluate(() => [...document.querySelectorAll('.modal input[type=radio]')].map(i => i.closest('label')).filter(e => e && e.offsetParent).map(e => { const b = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 12), Math.round(b.width), Math.round(b.height)]; }));
    ok(L + 'nhãn chọn form mục tiêu >=44px (' + labG.length + ')', labG.length > 0 && labG.every(x => x[1] >= 44 && x[2] >= 44), JSON.stringify(labG.filter(x => x[1] < 44 || x[2] < 44).slice(0, 6)));
    await p.screenshot({ path: SS + '/lp-31-formmt-' + W + '.png' });
    await p.click('[data-close]').catch(() => {}); await p.waitForTimeout(200);
    await p.click('.tab[data-tab="today"]', { timeout: 4000 }); await p.waitForTimeout(200);
    await p.click('[data-action="today-view"][data-view="list"]'); await p.waitForTimeout(150);
    const f1 = (await T(p)).find(t => t.status !== 'Xong');
    await p.click('[data-action="open-task"][data-id="' + f1.id + '"]'); await p.waitForSelector('.modal form [name="title"]');
    const labT = await p.evaluate(() => [...document.querySelectorAll('.modal input[type=radio]')].map(i => i.closest('label')).filter(e => e && e.offsetParent).map(e => { const b = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 12) || (e.closest('label') && e.closest('label').innerText.trim().slice(0, 12)) || 'icon', Math.round(b.width), Math.round(b.height)]; }));
    const smT = labT.filter(x => x[1] < 44 || x[2] < 44);
    ok(L + 'nhãn chọn form task (ưu tiên, trạng thái, nhóm, icon) >=44px (' + labT.length + ')', labT.length > 0 && smT.length === 0, JSON.stringify(smT.slice(0, 8)));
    await p.screenshot({ path: SS + '/lp-32-formtask-' + W + '.png', fullPage: true });
    await p.click('[data-close]').catch(() => {}); await p.waitForTimeout(200);
    await p.fill('#quick-add-today', 'x'); await p.press('#quick-add-today', 'Enter'); await p.waitForTimeout(300);
    console.log(L + 'số nút trong toast:', await p.locator('.toast button, .toast a').count());
    await layoutChecks(p, L + 'bố cục');
    await ctx.close();
  }
  ({ ctx, p } = await mk(browser, { q: '?today=' + TODAY + '&fail=1' }));
  await p.fill('#quick-add-today', 'Việc lỗi'); await p.press('#quick-add-today', 'Enter'); await p.waitForTimeout(1800);
  await small(p, '.toast button, #sync button', 44, 'Nút Thử lại/đóng trong thông báo lỗi');
  await ctx.close();

  console.log('\nLỖI CONSOLE/PAGEERROR (' + errors.length + '):\n' + errors.join('\n'));
  console.log('\nTỔNG FAIL:', fails);
  await browser.close();
})().catch(e => { console.log('SCRIPT CRASH', e); process.exit(1); });

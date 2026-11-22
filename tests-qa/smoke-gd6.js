// Chạy nhanh để bắt lỗi JS ở các màn GĐ6 và chụp ảnh (không phải bộ kiểm thử chính)
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file:///C:/Users/Admin/Documents/web-muc-tieu/src/index.html';
const OUT = process.argv[2] || path.join(__dirname, 'screenshots');
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const [w, scheme] of [[390, 'light'], [1280, 'dark']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(w + ' pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load/.test(m.text())) errors.push(w + ' console: ' + m.text()); });
    await p.goto(URL + '?today=2026-11-25&now=08:10');
    await p.waitForSelector('.budget', { timeout: 8000 }).catch(() => errors.push(w + ' no .budget'));
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(OUT, `g6-agenda-${w}.png`), fullPage: true });
    console.log(w, 'plan items', await p.locator('.pl-item').count(), 'sums', await p.locator('.pl-sums').innerText().catch(() => '-'));
    // mở form task
    await p.evaluate(() => App.forms.openTask(App.store.get().tasks[2]));
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(OUT, `g6-form-${w}.png`), fullPage: false });
    await p.evaluate(() => App.ui.closeModal());
    await p.evaluate(() => { location.hash = '#/task'; });
    await p.waitForTimeout(200);
    await p.click('[data-action="task-view"][data-view="inbox"]');
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(OUT, `g6-kho-${w}.png`), fullPage: true });
    await p.evaluate(() => { location.hash = '#/tong-ket'; });
    await p.waitForTimeout(200);
    await p.click('[data-action="rev-type"][data-type="Ngày"]');
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(OUT, `g6-review-${w}.png`), fullPage: true });
    await p.evaluate(() => App.forms.openSettings());
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(OUT, `g6-settings-${w}.png`), fullPage: false });
    await ctx.close();
  }
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
})();

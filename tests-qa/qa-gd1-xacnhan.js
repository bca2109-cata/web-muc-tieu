const { chromium } = require('playwright');
const URL = 'file:///C:/Users/Admin/Documents/web-muc-tieu/src/index.html';
const errors = [];
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1280]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 844 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_INTERNET|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await p.goto(URL); await p.waitForSelector('.page-head'); await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const n = document.querySelector('#top3-title > .num');
      const star = document.querySelector('.star').getBoundingClientRect();
      const ic = document.querySelector('.check .box .icon');
      const body = document.body.innerText;
      return { font: getComputedStyle(n).fontFamily, star: Math.round(star.width) + 'x' + Math.round(star.height),
        sw: getComputedStyle(ic).strokeWidth, svgAttr: ic.getAttribute('stroke-width'),
        hscroll: document.documentElement.scrollWidth > innerWidth, bad: /undefined|NaN|Infinity/.test(body) };
    });
    console.log(w, JSON.stringify(r));
    if (w === 390) {
      const sec = '.section:has(h2:has-text("ngày mai"))';
      const before = await p.locator(sec + ' .task').count();
      const t = p.locator(sec + ' .task').first();
      const title = await t.locator('.task-title').innerText();
      await t.locator('[data-action="toggle-task"]').click();
      await p.waitForTimeout(300);
      const after = await p.locator(sec + ' .task').count();
      const t2 = p.locator(sec + ' .task', { hasText: title }).first();
      const cls = await t2.getAttribute('class');
      const dec = await t2.locator('.task-title').evaluate(e => getComputedStyle(e).textDecorationLine);
      console.log('ngay mai', JSON.stringify({ before, after, title, cls, dec }));
    }
    await ctx.close();
  }
  console.log('ERRORS', JSON.stringify(errors));
  await b.close();
})();

/* V2 · công cụ kiểm thử dùng chung (Chung). Mỗi file phan-N.js / core.js xuất một hàm async nhận `h`:
     module.exports = async function (h) {
       await h.test('tên', async () => { const page = await h.open({ w: 390 }); ... });
     };
   h.open({ w, scheme, query, hash }) mở bản mock ở ?mock=1&today=2026-11-25&now=11:05 và đợi web sẵn sàng.
   page.errors là danh sách lỗi JS. Script chỉ in JSON tóm tắt (xem run.js). */
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

const INDEX = 'file://' + path.resolve(__dirname, '../../src/v2/index.html');
const DEFAULT_QUERY = 'mock=1&today=2026-11-25&now=11:05';

function create() {
  const results = { pass: 0, fail: [] };
  const contexts = [];
  let browser = null;

  const h = {
    assert,
    INDEX,
    results,
    async start() { browser = await chromium.launch(); return h; },
    async stop() { for (const c of contexts) await c.close().catch(() => {}); if (browser) await browser.close(); },

    // Chạy một test. Lỗi thì ghi { test, detail } ngắn gọn, không in log dài
    async test(name, fn) {
      try { await fn(); results.pass++; }
      catch (e) { results.fail.push({ test: name, detail: String(e && e.message ? e.message : e).split('\n').slice(0, 3).join(' | ').slice(0, 300) }); }
    },

    async open(opts) {
      opts = opts || {};
      const ctx = await browser.newContext({ viewport: { width: opts.w || 1280, height: opts.h || 900 }, colorScheme: opts.scheme || 'light', deviceScaleFactor: 1 });
      contexts.push(ctx);
      const page = await ctx.newPage();
      page.errors = [];
      page.on('pageerror', e => page.errors.push('pageerror: ' + e.message));
      page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load|net::/.test(m.text())) page.errors.push('console: ' + m.text()); });
      // Font Google không cần trong test: trả về rỗng cho nhanh và không lỗi mạng
      await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
      const q = opts.query === undefined ? DEFAULT_QUERY : opts.query;
      await page.goto(INDEX + '?' + q + (opts.hash || ''));
      await page.waitForFunction(() => window.LP && LP.ready === true, null, { timeout: 8000 });
      await page.waitForTimeout(60);
      return page;
    },

    // Không cuộn ngang
    async noOverflow(page) {
      const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      assert.ok(o.sw <= o.iw + 1, 'cuộn ngang: scrollWidth ' + o.sw + ' > ' + o.iw);
    },
    noErrors(page) { assert.deepStrictEqual(page.errors, [], 'lỗi JS: ' + page.errors.join(' ; ')); },

    /* Kiểm chung cho một màn: 390px và 1280px, sáng và tối, không cuộn ngang, không lỗi JS.
       route: tên route ('agenda'...), query thêm tùy ý (ví dụ '&date=2026-11-24') */
    async checkScreen(route, extraQuery) {
      for (const [w, scheme] of [[390, 'light'], [1280, 'light'], [390, 'dark'], [1280, 'dark']]) {
        const page = await h.open({ w, scheme, hash: '#/' + route + (extraQuery ? '?' + extraQuery : '') });
        await page.waitForTimeout(200);
        await h.noOverflow(page);
        h.noErrors(page);
      }
    }
  };
  return h;
}

module.exports = { create, INDEX, DEFAULT_QUERY };

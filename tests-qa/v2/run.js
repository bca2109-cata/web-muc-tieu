/* V2 · chạy test. Dùng: npm run test:v2 -- core | phan-1 ... phan-5 | all
   Chỉ in MỘT dòng JSON tóm tắt: { pass, fail: [{ test, detail }] } (kèm tên file đã chạy khi chạy all). */
const fs = require('fs');
const path = require('path');
const { create } = require('./helpers');

(async () => {
  const arg = process.argv[2] || 'all';
  const all = fs.readdirSync(__dirname).filter(f => /^(core|phan-\d+)\.js$/.test(f)).map(f => f.replace(/\.js$/, '')).sort();
  const names = arg === 'all' ? all : [arg];
  const summary = { pass: 0, fail: [] };
  for (const n of names) {
    const file = path.join(__dirname, n + '.js');
    if (!fs.existsSync(file)) { summary.fail.push({ test: n, detail: 'Không có file tests-qa/v2/' + n + '.js' }); continue; }
    const h = await create().start();
    try { await require(file)(h); }
    catch (e) { h.results.fail.push({ test: n + ' (khởi chạy)', detail: String(e && e.message || e).slice(0, 300) }); }
    await h.stop();
    summary.pass += h.results.pass;
    h.results.fail.forEach(f => summary.fail.push(names.length > 1 ? { test: n + ' · ' + f.test, detail: f.detail } : f));
  }
  console.log(JSON.stringify(summary));
  process.exit(summary.fail.length ? 1 : 0);
})();

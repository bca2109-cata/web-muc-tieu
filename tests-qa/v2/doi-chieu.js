/* V2 · test đối chiếu số liệu: cùng một con số phải ra giống nhau ở mọi màn (Agenda, Lịch, Tổng kết, Mục tiêu).
   Số "mong đợi" tính lại thẳng từ dữ liệu thô trong LP.store (không gọi hàm thống kê đang được kiểm), rồi so với chữ trên màn hình.
   Dữ liệu mẫu cố định: ?mock=1&today=2026-11-25&now=11:05. */
module.exports = async function (h) {
  const A = h.assert;
  const DAYS = ['2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25'];
  const dm = d => d.slice(8) + '/' + d.slice(5, 7);
  const unit = async (page, u) => { await page.click('[data-unit="' + u + '"]'); await page.waitForTimeout(80); };

  // Nhãn cột Tổng kết: "T4 25/11: 80% (4/5)" hoặc "...: không có hạng mục"
  async function tkCols(page) {
    return page.$$eval('.mt-col', els => els.map(e => e.getAttribute('aria-label')));
  }
  function parseCol(label) {
    const m = /(\d\d\/\d\d): (?:(\d+)% \((\d+)\/(\d+)\)|không có)/.exec(label);
    return m ? { d: m[1], pct: m[2] == null ? null : +m[2], done: m[3] == null ? null : +m[3], total: m[4] == null ? null : +m[4] } : null;
  }
  async function agendaDay(h, d) {
    const page = await h.open({ w: 1280, hash: '#/agenda?date=' + d });
    await page.waitForSelector('.ag-ring');
    const ring = await page.$eval('.ag-ring .big', e => e.textContent.trim());
    const six = await page.$$eval('.ag-col', els => els.map(e => e.getAttribute('aria-label')));
    const facts = await page.$$eval('.ag-fact', els => els.map(e => e.innerText.replace(/\s+/g, ' ')));
    return { page, ring, six, facts };
  }
  function ringNums(txt) { const m = /^(\d+)\/(\d+)$/.exec(txt); return m ? { done: +m[1], total: +m[2] } : { done: 0, total: 0 }; }

  await h.test('1. Vòng Hoàn thành Agenda (19–25/11) khớp cột 6 ngày cùng màn', async () => {
    for (const d of DAYS) {
      const a = await agendaDay(h, d);
      const r = ringNums(a.ring);
      const pct = r.total ? Math.round(r.done * 100 / r.total) : null;
      const col = a.six.map(l => /^(\d\d\/\d\d): (.+)$/.exec(l)).filter(Boolean).filter(m => m[1] === dm(d))[0];
      if (!col) { A.ok(d === '2026-11-22', dm(d) + ': không có cột 6 ngày (chỉ chấp nhận Chủ nhật)'); continue; }
      const colPct = /(\d+)%/.exec(col[2]);
      A.strictEqual(colPct ? +colPct[1] : null, pct, dm(d) + ': vòng ' + a.ring + ' (' + pct + '%) lệch cột 6 ngày "' + col[2] + '"');
    }
  });

  await h.test('2. Vòng Agenda từng ngày 19–24/11 khớp ô cột ngày ở Tổng kết (tuần)', async () => {
    const past = DAYS.filter(d => d < '2026-11-25');
    const ring = {};
    for (const d of past) ring[d] = ringNums((await agendaDay(h, d)).ring);
    const page = await h.open({ w: 1280, hash: '#/tong-ket' });
    await unit(page, 'week');
    const seen = {};
    for (let wk = 0; wk < 2; wk++) {
      (await tkCols(page)).map(parseCol).filter(Boolean).forEach(c => { seen[c.d] = c; });
      if (!wk) { await page.click('[data-nav="-1"]'); await page.waitForTimeout(80); }
    }
    for (const d of past) {
      const c = seen[dm(d)], r = ring[d];
      A.ok(c, dm(d) + ': thiếu cột ở Tổng kết');
      const tkDone = c.done || 0, tkTotal = c.total || 0;
      A.strictEqual(tkDone + '/' + tkTotal, r.done + '/' + r.total, dm(d) + ': Agenda ' + r.done + '/' + r.total + ' ≠ Tổng kết ' + tkDone + '/' + tkTotal);
    }
  });

  await h.test('3. Tổng phút Chen ngang tuần/tháng ở Tổng kết = tổng duration Interruptions trong kỳ (cả kỳ trước)', async () => {
    const page = await h.open({ w: 1280, hash: '#/tong-ket' });
    for (const u of ['week', 'month']) {
      await unit(page, u);
      for (const back of [0, 1]) {
        if (back) { await page.click('[data-nav="-1"]'); await page.waitForTimeout(80); }
        const exp = await page.evaluate(() => {
          const st = LP.tongKet.state(), r = LP.tongKet.range(st.unit, st.anchor);
          const rows = LP.store.get().interruptions.filter(i => i.date >= r.from && i.date <= r.to);
          const min = rows.reduce((t, i) => t + (parseFloat(i.duration_min) || 0), 0);
          return { min, count: rows.length, txt: LP.date.fmtMin(min) };
        });
        const sub = await page.locator('.mt-tile[data-k="int"] .mt-ts').innerText();
        A.ok(sub.indexOf(exp.count + ' lần') === 0, u + (back ? ' trước' : '') + ': số lần "' + sub + '" ≠ ' + exp.count);
        A.ok(sub.indexOf(exp.txt + ' tổng') >= 0, u + (back ? ' trước' : '') + ': tổng "' + sub + '" ≠ ' + exp.txt);
        const bars = await page.$$eval('.mt-hv', els => els.map(e => e.textContent.trim()));
        const sum = await page.evaluate(() => {
          const st = LP.tongKet.state(), r = LP.tongKet.range(st.unit, st.anchor);
          return LP.stats.interruptions(r.from, r.to, st.unit === 'week' ? 'day' : 'week').reduce((t, b) => t + b.minutes, 0);
        });
        A.strictEqual(sum, exp.min, u + ': tổng các cột Chen ngang ' + sum + ' ≠ ' + exp.min);
      }
    }
  });

  await h.test('4. Quỹ Ad-hoc đã dùng mỗi ngày = Ad-hoc trong ngày + Chen ngang trong ngày (khớp chữ ở Agenda)', async () => {
    for (const d of DAYS) {
      const a = await agendaDay(h, d);
      const exp = await a.page.evaluate(d => {
        const S = LP.store.get(), num = v => parseFloat(v) || 0;
        let adhoc = 0, canhan = 0;
        S.tasks.forEach(t => {
          if (t.status === 'cancelled') return;
          const steps = S.taskSteps.filter(s => s.task_id === t.id), dated = steps.filter(s => s.do_date);
          let m = 0;
          if (dated.length) {
            dated.forEach(s => { if (s.do_date === d) m += num(s.duration_min); });
            if (t.do_date === d) steps.filter(s => !s.do_date).forEach(s => { m += num(s.duration_min); });
          } else if (t.do_date === d) m += num(t.duration_min);
          if (t.kind === 'canhan') canhan += m; else adhoc += m;
        });
        const inter = S.interruptions.filter(i => i.date === d).reduce((t, i) => t + num(i.duration_min), 0);
        const cap = LP.logic.tasks.capacity(d);
        return { used: adhoc + inter, canhan, capUsed: cap.work.used, capCanhan: cap.evening.used, text: LP.date.fmtMin(adhoc + inter), textCn: LP.date.fmtMin(canhan), quota: cap.work.quota };
      }, d);
      A.strictEqual(exp.capUsed, exp.used, dm(d) + ': capacity.work.used ' + exp.capUsed + ' ≠ Ad-hoc + Chen ngang ' + exp.used);
      A.strictEqual(exp.capCanhan, exp.canhan, dm(d) + ': quỹ Personal ' + exp.capCanhan + ' ≠ ' + exp.canhan);
      if (exp.quota > 0) A.ok(a.facts.some(f => f.indexOf('Ad-hoc') === 0 && f.indexOf(exp.text + ' /') >= 0), dm(d) + ': chữ quỹ Ad-hoc không có "' + exp.text + ' /": ' + a.facts.join(' | '));
      A.ok(a.facts.some(f => f.indexOf('Personal') === 0 && f.indexOf(exp.textCn + ' /') >= 0), dm(d) + ': chữ quỹ Personal không có "' + exp.textCn + ' /"');
    }
  });

  await h.test('5. Tiến độ mục tiêu "theo số việc" = việc gắn đã xong / việc gắn chưa hủy (thẻ, hàm, form)', async () => {
    const page = await h.open({ w: 1280, hash: '#/muc-tieu' });
    const rows = await page.evaluate(() => {
      const S = LP.store.get();
      return S.goals.filter(g => g.progress_mode !== 'number' && g.status !== 'cancelled').map(g => {
        const ts = S.tasks.filter(t => t.goal_id === g.id && t.status !== 'cancelled');
        const done = ts.filter(t => t.status === 'done').length;
        const p = LP.mucTieu.progress(g);
        return { id: g.id, done, total: ts.length, pct: ts.length ? Math.round(done * 100 / ts.length) : 0, fn: p.done + '/' + p.total + '/' + p.pct };
      });
    });
    A.ok(rows.length >= 1, 'không có mục tiêu theo số việc');
    for (const r of rows) {
      A.strictEqual(r.fn, r.done + '/' + r.total + '/' + r.pct, r.id + ': progress() lệch');
      const card = page.locator('[data-goal="' + r.id + '"]');
      A.strictEqual(await card.getAttribute('data-done') + '/' + await card.getAttribute('data-total') + '/' + await card.getAttribute('data-pct'), r.done + '/' + r.total + '/' + r.pct, r.id + ': thẻ lệch');
      const txt = await card.innerText();
      A.ok(txt.indexOf(r.pct + '%') >= 0, r.id + ': thiếu ' + r.pct + '% trên thẻ');
      if (r.total) A.ok(txt.indexOf(r.done + '/' + r.total) >= 0, r.id + ': thiếu ' + r.done + '/' + r.total + ' trên thẻ');
    }
  });

  await h.test('6. Việc đã hủy không được đếm ở Agenda, Lịch, Tổng kết, tiến độ mục tiêu, quỹ giờ', async () => {
    const TITLE = 'ZZ việc đã hủy kiểm thử';
    const addCancelled = page => page.evaluate(t => {
      const g = LP.store.get().goals.filter(x => x.progress_mode !== 'number')[0];
      ['adhoc', 'canhan'].forEach((kind, i) => LP.store.upsert('Tasks', { title: t + i, kind, status: 'cancelled', do_date: '2026-11-24', due_date: '2026-11-24', do_time: '09:00', duration_min: '77', importance: '3', goal_id: g.id, requester: 'X' }));
    }, TITLE);
    const snap = async (page, sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ');
    const screens = [
      ['agenda', '#/agenda?date=2026-11-24', '.ag-ring-wrap'],
      ['agenda trang', '#/agenda?date=2026-11-24', '.main, main, #app, body'],
      ['lich', '#/lich', '.main, main, #app, body'],
      ['tong-ket', '#/tong-ket', '.mt-tiles'],
      ['muc-tieu', '#/muc-tieu', '.mt-grid']
    ];
    for (const [name, hash, sel] of screens) {
      const page = await h.open({ w: 1280, hash });
      await page.waitForTimeout(150);
      if (name === 'tong-ket') { await unit(page, 'week'); await page.click('[data-nav="0"]').catch(() => {}); }
      const before = await snap(page, sel);
      const cols0 = name === 'tong-ket' ? await tkCols(page) : null;
      await addCancelled(page);
      await page.waitForTimeout(250);
      const after = await snap(page, sel);
      A.ok(after.indexOf(TITLE) < 0, name + ': hiện việc đã hủy');
      A.strictEqual(after, before, name + ': số liệu đổi sau khi thêm việc đã hủy');
      if (cols0) A.deepStrictEqual(await tkCols(page), cols0, 'tong-ket: cột biểu đồ đổi');
    }
    // Hàm thống kê và quỹ giờ
    const page = await h.open({ w: 1280, hash: '#/agenda' });
    const r = await page.evaluate(() => {
      const f = () => JSON.stringify([LP.stats.completion('2026-11-16', '2026-11-24', 'day'), LP.stats.adhocStatus('2026-11-01', '2026-11-30'), LP.logic.tasks.capacity('2026-11-24'), LP.logic.tasks.tasksFor('2026-11-24').length]);
      const a = f();
      LP.store.upsert('Tasks', { title: 'ZZ hủy', kind: 'adhoc', status: 'cancelled', do_date: '2026-11-24', due_date: '2026-11-24', duration_min: '90', importance: '3' });
      return [a, f()];
    });
    A.strictEqual(r[1], r[0], 'stats/capacity/tasksFor đếm việc đã hủy');
  });

  await h.test('7. Daily bị sót ở Tổng kết = hạng mục Daily các ngày đã qua không có lượt tick (không tính ngày nghỉ/Chủ nhật)', async () => {
    const page = await h.open({ w: 1280, hash: '#/tong-ket' });
    for (const u of ['week', 'month']) {
      await unit(page, u);
      for (const back of [0, 1]) {
        if (back) { await page.click('[data-nav="-1"]'); await page.waitForTimeout(80); }
        const exp = await page.evaluate(() => {
          const S = LP.store.get(), D = LP.date, st = LP.tongKet.state(), r = LP.tongKet.range(st.unit, st.anchor), today = D.today();
          const daysOff = S.daysOff.map(x => x.date);
          let missed = 0;
          D.range(r.from, r.to).forEach(d => {
            if (d >= today || new Date(d + 'T00:00:00').getDay() === 0 || daysOff.indexOf(d) >= 0) return;
            const runs = LP.logic.routines.runsFor(d);   // hạng mục của lượt trong ngày (đã lọc mẫu không chạy hôm đó)
            runs.forEach(run => run.items.forEach(m => {
              const c = S.routineChecks.filter(k => k.routine_id === run.routine.id && k.item_id === m.item.id && k.run_date === d && k.status)[0];
              if (!c) missed++;
            }));
            // Hạng mục +1 của lượt trước tới hạn đúng ngày d mà chưa có dòng tick
            LP.logic.routines.plusOneFor(d).forEach(m => {
              if (!S.routineChecks.some(k => k.routine_id === m.routine.id && k.item_id === m.item.id && k.run_date === m.runDate && k.status)) missed++;
            });
          });
          return missed;
        });
        const tile = await page.locator('.mt-tile[data-k="missed"]').getAttribute('data-val');
        A.strictEqual(+(tile || 0), exp, u + (back ? ' trước' : '') + ': ô Daily bị sót ' + tile + ' ≠ ' + exp);
        const say = await page.locator('.mt-say').innerText().catch(() => '');
        if (exp) A.ok(say.indexOf('Có ' + exp + ' Daily bị sót') >= 0, u + ': câu tóm tắt "' + say + '"');
        // Bảng "Daily hay bị sót": tổng số lần không vượt quá số sót
        const top = await page.evaluate(() => { const st = LP.tongKet.state(), r = LP.tongKet.range(st.unit, st.anchor); return LP.stats.missedTop(r.from, r.to, 999).reduce((t, x) => t + x.count, 0); });
        A.strictEqual(top, exp, u + (back ? ' trước' : '') + ': danh sách hay bị sót cộng ' + top + ' ≠ ' + exp);
      }
    }
  });
  await h.test('8. Kỳ trống: một dòng "Kỳ này chưa có số liệu", ẩn khối biểu đồ, vẫn có Nhìn lại', async () => {
    const page = await h.open({ w: 1280, hash: '#/tong-ket' });
    await unit(page, 'week');
    for (let i = 0; i < 46; i++) await page.click('[data-nav="-1"]');
    A.strictEqual(await page.locator('.mt-plabel').innerText(), 'Tuần 05/01 – 11/01/2026');
    const txt = await page.locator('.mt-tk').innerText();
    A.ok(txt.indexOf('Kỳ này chưa có số liệu') >= 0, 'thiếu dòng kỳ trống');
    A.strictEqual(await page.locator('.mt-tile, .mt-chart, .mt-donut, .mt-hbars, .mt-habs').count(), 0, 'còn khối biểu đồ');
    A.ok(await page.locator('[data-review]').count() === 1, 'mất khối Nhìn lại');
    h.noErrors(page);
  });

  await h.test('9. Kỳ trước không có số liệu thì ẩn dòng so sánh, không hiện "Bằng kỳ trước (0)"', async () => {
    const page = await h.open({ w: 1280, hash: '#/tong-ket' });
    await unit(page, 'week');
    for (let i = 0; i < 9; i++) await page.click('[data-nav="-1"]');   // tuần 21/09: tuần đầu có số liệu, tuần trước đó chưa có mẫu Daily nào
    A.strictEqual(await page.locator('.mt-plabel').innerText(), 'Tuần 21/09 – 27/09/2026');
    A.ok(await page.locator('.mt-tile').count() === 4, 'tuần này phải có số liệu');
    const txt = (await page.locator('.mt-tk').innerText()).toLowerCase();
    A.ok(txt.indexOf('kỳ trước') < 0, 'còn dòng so sánh kỳ trước dù kỳ trước trống');
  });

  await h.test('10. Gắn việc có sẵn vào mục tiêu: lọc theo tên, gắn, bỏ gắn, thanh tiến độ cập nhật ngay', async () => {
    const page = await h.open({ w: 1280, hash: '#/muc-tieu' });
    const id = 'g-powerbi', card = page.locator('[data-goal="' + id + '"]');
    const total0 = +(await card.getAttribute('data-total'));
    const pick = await page.evaluate(id => {
      const S = LP.store.get();
      const t = S.tasks.filter(t => (t.kind === 'adhoc' || t.kind === 'canhan') && t.status !== 'done' && t.status !== 'cancelled' && t.goal_id !== id)[0];
      return { id: t.id, title: t.title };
    }, id);
    await card.click();
    await page.click('[data-linkopen]');
    const all = await page.locator('.mt-pick').count();
    A.ok(all >= 1, 'danh sách chọn trống');
    await page.fill('[data-linkq]', pick.title.slice(0, 6).toUpperCase());
    A.ok(await page.locator('[data-pick="' + pick.id + '"]').count() === 1, 'lọc theo tên không ra việc');
    await page.fill('[data-linkq]', 'zzzkhongco');
    A.strictEqual(await page.locator('.mt-pick').count(), 0, 'lọc sai vẫn ra việc');
    await page.fill('[data-linkq]', pick.title.slice(0, 6));
    await page.click('[data-pick="' + pick.id + '"]');
    A.strictEqual(await page.evaluate(i => LP.store.get().tasks.filter(t => t.id === i)[0].goal_id, pick.id), id, 'chưa đặt goal_id');
    A.strictEqual(+(await card.getAttribute('data-total')), total0 + 1, 'thẻ chưa cập nhật số việc');
    A.ok(await page.locator('[data-lid="' + pick.id + '"]').count() === 1, 'việc chưa hiện trong danh sách gắn');
    await page.click('[data-unlink="' + pick.id + '"]');
    A.strictEqual(await page.evaluate(i => LP.store.get().tasks.filter(t => t.id === i)[0].goal_id, pick.id), '', 'chưa xóa goal_id');
    A.strictEqual(+(await card.getAttribute('data-total')), total0, 'thẻ chưa trở lại');
    h.noErrors(page);
  });
};

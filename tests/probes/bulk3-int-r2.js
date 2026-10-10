// run 2 (dpr 2): boot with a place kept (longest task in the first 20 s, Coming up rows; int and main), the fonts'
// stand-in faces (boxes with the web faces, then without them), the scale governor under load and after it.
localStorage.setItem('sr.place', JSON.stringify({ p: '51.5,-0.1', name: 'London' }));
const boot = async (res, base) => {
  const t0 = tasks.length;
  const h = await open(base + '?sw=0'); const w = h.w(); const doc = h.doc(); const ctx = h.ctx();
  res.readyMs = Math.round(performance.now() - h.born);
  res.place = ctx.observer && (ctx.observer.name || ctx.observer.source);
  const rowsNow = () => [...doc.querySelectorAll('.sr-next__row')].map((r) => r.dataset.kind);
  const seen = [];
  while (performance.now() - h.born < 20000) { const r = rowsNow(); const p = r.filter((k) => /pass/.test(k || '')).length; if (!seen.length || seen[seen.length - 1][1] !== r.length || seen[seen.length - 1][2] !== p) seen.push([Math.round(performance.now() - h.born), r.length, p]); await sleep(250); }
  const mine = tasks.slice(t0).filter((t) => t.at >= h.born && t.at <= h.born + 20000);
  res.rowsTimeline = seen; res.kinds = [...new Set(rowsNow())];
  res.first20s = { n: mine.length, longest: mine.reduce((m, t) => Math.max(m, t.dur), 0), over100: mine.filter((t) => t.dur > 100).map((t) => [Math.round(t.at - h.born), t.dur]), blocking: mine.reduce((s, t) => s + Math.max(0, t.dur - 50), 0) };
  res.sats = ctx.records().filter((r) => r.satrec).length;
  try { res.sources = ctx.sources.status().filter((r) => /celestrak/.test(r.id)).map((r) => `${r.id}:${r.via}:${r.state}`).slice(0, 6); } catch { /* none */ }
  // layout shifts the browser recorded during boot
  try { const ls = []; await new Promise((ok) => { new w.PerformanceObserver((l) => { for (const e of l.getEntries()) ls.push([Math.round(e.startTime), +e.value.toFixed(4), e.hadRecentInput]); ok(); }).observe({ type: 'layout-shift', buffered: true }); setTimeout(ok, 800); }); res.cls = { n: ls.length, sum: +ls.reduce((s, e) => s + e[1], 0).toFixed(4), first: ls.slice(0, 8) }; } catch (e) { res.cls = String(e); }
  // the stand-in faces: every text box with the web faces, then with the web faces taken away
  await w.document.fonts.ready;
  res.fontsLoaded = [...w.document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`);
  const els = () => [...doc.querySelectorAll('button, h1, h2, h3, [role="tab"], .sr-next__row, .sr-top *, .sr-sentence, label, summary, p, li, span')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (e.textContent || '').trim() && e.children.length === 0; }).slice(0, 400);
  const list = els(); const before = list.map((e) => e.getBoundingClientRect());
  await shot('fonts-web-' + (base === './' ? 'int' : 'main'), 300);
  let removed = 0;
  for (const sheet of doc.styleSheets) { let rules; try { rules = sheet.cssRules; } catch { continue; } for (let i = rules.length - 1; i >= 0; i--) { const r = rules[i]; if (r.constructor.name === 'CSSFontFaceRule' && !/Fallback/.test(r.style.getPropertyValue('font-family'))) { sheet.deleteRule(i); removed++; } } }
  await sleep(1200);
  const after = list.map((e) => e.getBoundingClientRect());
  let moved = 0, maxDx = 0, maxDy = 0, maxDw = 0, maxDh = 0, sumDw = 0; const worst = [];
  list.forEach((e, i) => { const a = before[i], b = after[i]; const dx = Math.abs(b.left - a.left), dy = Math.abs(b.top - a.top), dw = Math.abs(b.width - a.width), dh = Math.abs(b.height - a.height); if (dx > 0.5 || dy > 0.5 || dw > 0.5 || dh > 0.5) { moved++; worst.push([Math.round(dy * 10) / 10, Math.round(dw * 10) / 10, Math.round(dh * 10) / 10, (e.textContent || '').trim().slice(0, 24)]); } maxDx = Math.max(maxDx, dx); maxDy = Math.max(maxDy, dy); maxDw = Math.max(maxDw, dw); maxDh = Math.max(maxDh, dh); sumDw += a.width ? dw / a.width : 0; });
  worst.sort((p, q) => (q[0] + q[2]) - (p[0] + p[2]) || q[1] - p[1]);
  res.standIn = { removedFaces: removed, boxes: list.length, moved, maxDx: +maxDx.toFixed(1), maxDy: +maxDy.toFixed(1), maxDw: +maxDw.toFixed(1), maxDh: +maxDh.toFixed(1), meanWidthOffPct: +(100 * sumDw / list.length).toFixed(2), worst: worst.slice(0, 8) };
  await shot('fonts-standin-' + (base === './' ? 'int' : 'main'), 300);
  h.close(); await sleep(800);
};
await job('boot-int', (res) => boot(res, './'));
await job('boot-main', (res) => boot(res, 'm/'));
await job('boot-int2', (res) => boot(res, './'));
await job('gov', async (res) => {
  const h = await open('./?sw=0&tier=1'); const ctx = h.ctx(); const w = h.w(); const api = ctx.rendererApi;
  res.dpr = w.devicePixelRatio; res.ladder = ctx.scaler.steps; res.start = [ctx.scaler.scale, ctx.renderer.getPixelRatio(), ctx.renderer.domElement.width];
  const log0 = []; w.addEventListener('sr:scale', (e) => log0.push([Math.round(performance.now() - h.born), e.detail.ratio, e.detail.step]));
  await sleep(6000);
  res.restFrames = await h.frames(2500); res.before = { step: ctx.scaler.step, log: log0.slice(), latched: ctx.latch.latched };
  const log = []; const T0 = performance.now();
  w.addEventListener('sr:scale', (e) => log.push([Math.round(performance.now() - T0), e.detail.ratio, e.detail.step]));
  let busy = true; const spin = () => { if (!busy) return; const t = w.performance.now(); while (w.performance.now() - t < 45) { /* a slow frame */ } w.requestAnimationFrame(spin); };
  w.requestAnimationFrame(spin);
  await until(() => ctx.scaler.step >= 2, 16000, 100); busy = false;
  res.underLoad = { log: log.slice(), step: ctx.scaler.step, ratio: ctx.renderer.getPixelRatio(), canvas: ctx.renderer.domElement.width, latched: ctx.latch.latched, stoppedAtMs: Math.round(performance.now() - T0) };
  await shot('gov-low', 200);
  await sleep(1500); res.framesAfter = await h.frames(2500);
  await until(() => ctx.scaler.step === 0, 60000, 250);
  res.afterLoad = { log: log.slice(), step: ctx.scaler.step, ratio: ctx.renderer.getPixelRatio(), canvas: ctx.renderer.domElement.width, latched: ctx.latch.latched, median: +ctx.scaler.median().toFixed(1), upHoldMs: ctx.scaler.upHoldMs, atMs: Math.round(performance.now() - T0) };
  await shot('gov-after', 300);
  // a second, longer stall: all the way down, then the latch; the ladder then stays (the latch is one-way)
  h.close();
});
out.longTasksAll = tasks.length;
return out;

// tests/probes/bulk3-c.js -- bulk round three, agent c: one browser pass over what the sky/data/perf trackers built.
// Pasted after tests/probes/sky3-common.js (it gives wait, ctx, out, A, place, sunAt, stand, stats, shot):
//   cat tests/probes/sky3-common.js tests/probes/bulk3-c.js > /tmp/c.js
//   node tools/cdp.mjs 'http://127.0.0.1:PORT/?sw=0' /tmp/c.js --width=1440 --height=900 --gl=gpu --dpr=2 \
//        --block=celestrak.org,ll.thespacedevs.com --shot-dir=DIR
// Jobs (each in its own try, each writes out.<name>): timeline, fonts, passes (internal #562), scale (#521),
// sky (the haze beside Sirius, the contact sheet), pairs (Coming up, a pairing with a star, #565).
const JOBS = new URLSearchParams(location.search).get('jobs');
const step = async (name, fn) => { if (JOBS && !JOBS.split(',').includes(name)) return; const t = Date.now(); try { await fn(); } catch (e) { out[name + '_err'] = String(e && e.stack || e).slice(0, 300); } out[name + '_s'] = Math.round((Date.now() - t) / 1000); };
const tasks = [];
try { new PerformanceObserver((l) => { for (const e of l.getEntries()) tasks.push({ at: Math.round(e.startTime), dur: Math.round(e.duration) }); }).observe({ type: 'longtask', buffered: true }); } catch { /* none */ }
const nowMs = () => Math.round(performance.now());
const DPR = window.devicePixelRatio;
out.window = [innerWidth, innerHeight, DPR];

await step('timeline', async () => {
  const nav = performance.getEntriesByType('navigation')[0] || {};
  const paint = Object.fromEntries(performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]));
  const main = performance.getEntriesByType('resource').find((r) => /\/js\/main\.js/.test(r.name));
  out.timeline = { domInteractive: Math.round(nav.domInteractive || 0), dcl: Math.round(nav.domContentLoadedEventEnd || 0), load: Math.round(nav.loadEventEnd || 0), fp: paint['first-paint'], fcp: paint['first-contentful-paint'], mainJs: main && Math.round(main.responseEnd), readyFoundAt: out.tReady, longTasks: tasks.slice(0, 30), over100: tasks.filter((t) => t.dur > 100).length, longest: tasks.reduce((m, t) => Math.max(m, t.dur), 0), blocking: tasks.reduce((s, t) => s + Math.max(0, t.dur - 50), 0) };
});

await step('fonts', async () => {
  await document.fonts.ready;
  const c = document.createElement('canvas').getContext('2d');
  const strings = ['Tonight from your place', 'The Moon rises at 18:42, 41 % lit', 'International Space Station', 'Jupiter and the Moon, close together', 'Coming up'];
  const w = (font, s) => { c.font = font; return c.measureText(s).width; };
  const rows = [];
  for (const [weight, fam] of [[400, 'Inter'], [600, 'Inter'], [500, 'Barlow Semi Condensed'], [600, 'Barlow Semi Condensed'], [400, 'JetBrains Mono']]) {
    const fb = `${fam} Fallback`;
    for (const s of strings.slice(0, 3)) {
      const web = w(`${weight} 16px "${fam}"`, s), fall = w(`${weight} 16px "${fb}", sans-serif`, s), sys = w(`${weight} 16px system-ui`, s);
      rows.push({ fam, weight, web: +web.toFixed(1), fallback: +fall.toFixed(1), system: +sys.toFixed(1), fallbackOff: +(100 * (fall / web - 1)).toFixed(1), systemOff: +(100 * (sys / web - 1)).toFixed(1) });
    }
  }
  out.fonts = { loaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`), stack: getComputedStyle(document.body).fontFamily.slice(0, 120), hudStack: getComputedStyle(document.documentElement).getPropertyValue('--sr-font-hud').slice(0, 140), rows };
  // How far each stand-in is from the web face, on average, over the three strings.
  const mean = (k, fam, wt) => { const r = rows.filter((x) => x.fam === fam && x.weight === wt); return +(r.reduce((s, x) => s + Math.abs(x[k]), 0) / r.length).toFixed(1); };
  out.fonts.meanOffPct = { inter400: [mean('fallbackOff', 'Inter', 400), mean('systemOff', 'Inter', 400)], inter600: [mean('fallbackOff', 'Inter', 600), mean('systemOff', 'Inter', 600)], mono: [mean('fallbackOff', 'JetBrains Mono', 400), mean('systemOff', 'JetBrains Mono', 400)], barlow500: [mean('fallbackOff', 'Barlow Semi Condensed', 500), mean('systemOff', 'Barlow Semi Condensed', 500)] };
});

await step('idle', async () => {
  const b = tasks.length; const t0 = nowMs(); await wait(8000);
  const mine = tasks.slice(b).filter((t) => t.at >= t0 - 50);
  out.idle = { windowMs: 8000, longTasks: mine.map((t) => t.dur) };
});

await step('passes', async () => {
  // Satellites for a place are not on this machine's local server (CelesTrak refuses it and is blocked): the
  // fixture's 120 objects, cloned to 180 under other ids, are what the Coming up list works on. /fx is
  // tests/fixtures, linked into the served root by the run line.
  const P = await import('/js/data/parsers.js');
  const E = await import('/js/data/events.js');
  const PC = await import('/js/sky/passclient.js');
  const doc = await (await fetch('/fx/snapshots/celestrak-active-cut.json')).json();
  const base = P.parseCelestrakGP(JSON.stringify(doc.body), { layer: 'visual', source: 'celestrak-visual' });
  const recs = [];
  for (let i = 0; i < 180; i++) { const r = base[i % base.length]; recs.push(i < base.length ? r : { ...r, id: r.id + '-c' + i }); }
  const now = Date.now();
  out.passes = { base: base.length, records: recs.length, withSatrec: recs.filter((r) => r.satrec).length };
  const ob = (lat, lon) => place('p', lat, lon);
  // Sampler: the longest gap between two animation frames, the visible symptom of a long task.
  const gaps = []; let last = performance.now(), on = true;
  const raf = (t) => { gaps.push(t - last); last = t; if (on) requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  const rows = (o) => E.buildEvents(recs, now, { observer: o, eclipses: false, showers: null }).filter((e) => e.type === 'station-pass');
  // (a) in place, as before: one call.
  E.usePassRunner(null);
  const a0 = tasks.length; const ta = performance.now(); const inPlace = rows(ob(51.5, -0.12)); const aMs = performance.now() - ta;
  await wait(300);
  out.passes.inPlace = { ms: Math.round(aMs), rows: inPlace.length, longTasks: tasks.slice(a0).map((t) => t.dur) };
  // (b) off the main thread: the call returns at once, the answer arrives later and the list is told.
  E.usePassRunner((m) => PC.runPasses(m));
  gaps.length = 0; const b0 = tasks.length;
  const ready = new Promise((res) => { const off = E.onPassesReady(() => { off(); res(performance.now()); }); setTimeout(() => res(null), 30000); });
  const tb = performance.now(); const first = rows(ob(52.5, 1.12)); const callMs = performance.now() - tb;
  const doneAt = await ready;
  await wait(300);
  const second = rows(ob(52.5, 1.12));
  out.passes.worker = { callMs: Math.round(callMs * 10) / 10, rowsAtOnce: first.length, answerAfterMs: doneAt ? Math.round(doneAt - tb) : null, rowsAfter: second.length, longTasks: tasks.slice(b0).map((t) => t.dur), longestFrameGapMs: Math.round(gaps.reduce((m, g) => Math.max(m, g), 0)), sameAsInPlace: null };
  // The same place in place, to compare the two answers.
  E.usePassRunner(null);
  const ref = rows(ob(52.5, 1.12 + 1e-7));
  out.passes.worker.sameAsInPlace = ref.length === second.length && ref.every((e, i) => Math.abs(e.t - second[i].t) < 2000);
  on = false;
  out.passes.appRows = [...document.querySelectorAll('.sr-next__row')].length;
});

await step('scale', async () => {
  const api = ctx.rendererApi;
  out.scale = { ladder: ctx.scaler && ctx.scaler.steps, start: ctx.scaler && ctx.scaler.scale, ratio0: ctx.renderer.getPixelRatio(), canvas0: [ctx.renderer.domElement.width, ctx.renderer.domElement.height] };
  const ratios = [];
  for (const r of [1.5, 1.25, 1, 2]) { api.setScale(r); await wait(700); ratios.push([r, ctx.renderer.getPixelRatio(), ctx.renderer.domElement.width]); if (r === 1.25 || r === 1) await shot('c1-scale-' + String(r).replace('.', '_')); }
  out.scale.ratios = ratios;
  // The wiring: slow frames walk the ladder (a busy loop of 45 ms frames), then it climbs back when they are quick.
  const log = [];
  window.addEventListener('sr:scale', (e) => log.push([nowMs(), e.detail.ratio, e.detail.step]));
  let busy = true; const spin = () => { if (!busy) return; const t = performance.now(); while (performance.now() - t < 45) { /* a slow frame */ } requestAnimationFrame(spin); };
  requestAnimationFrame(spin);
  const t = nowMs(); await wait(10500); busy = false;
  out.scale.slow = { steps: log.slice(), step: ctx.scaler.step, ratio: ctx.renderer.getPixelRatio(), latched: ctx.latch.latched };
  await wait(24000);
  out.scale.after = { steps: log.slice(), step: ctx.scaler.step, ratio: ctx.renderer.getPixelRatio(), latched: ctx.latch.latched, medianMs: ctx.scaler.median() };
  api.setScale(2);
});

const lum = () => {
  ctx.rendererApi.render();
  const gl = ctx.renderer.getContext(); const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const R = 200;
  const px = new Uint8Array(4 * R * R); gl.readPixels((W - R) >> 1, (H - R) >> 1, R, R, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let sum = 0, lit = 0, ring = 0;
  for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) {
    const i = 4 * (y * R + x), l = 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2];
    const d = Math.hypot(x - R / 2, y - R / 2);
    if (d < 14) continue;            // the star's own core
    sum += l; if (l > 12) lit++; if (d < 60) ring += l;
  }
  return { sum: Math.round(sum), lit, ring: Math.round(ring) };
};
await step('views', async () => {
  const goTo = async (id, ms) => { const rec = ctx.recordById(id); if (!rec) { out['views_' + id] = 'no record'; return; } ctx.select(rec, { fly: true }); const f0 = Date.now(); await wait(2500); while (ctx.cameraRig.state.flying && Date.now() - f0 < 20000) await wait(300); await wait(ms); };
  const programs = () => { const ps = ctx.renderer.info.programs || []; return { count: ps.length, failed: ps.filter((p) => p.diagnostics && p.diagnostics.runnable === false).length, sample: ps.filter((p) => p.diagnostics && p.diagnostics.runnable === false).slice(0, 2).map((p) => String(p.diagnostics.fragmentShader && p.diagnostics.fragmentShader.log || p.diagnostics.vertexShader && p.diagnostics.vertexShader.log || p.diagnostics.programLog).slice(0, 200)) }; };
  out.views = { start: programs() };
  await goTo('sun', 6000); await window.cdpShot('v1-sun'); out.views.sun = programs();
  await goTo('jupiter', 5000); await window.cdpShot('v2-jupiter'); out.views.jupiter = programs();
  await goTo('moon', 5000); out.views.moon = programs();
  ctx.select(null);
});

await step('sky', async () => {
  const london = place('London', 51.5, -0.12);
  ctx.setObserver(london);
  // The first evening hour at which Sirius is 20 to 40 degrees up from London.
  let when = Date.UTC(2026, 11, 15, 20, 0);
  const altAt = (ms) => A.Horizon(new Date(ms), new A.Observer(51.5, -0.12, 0), 6.7525, -16.7161, 'normal').altitude;
  for (let k = 0; k < 14 && !(altAt(when) > 20); k++) when += 3600e3;
  ctx.clock.goTo(when);
  await stand(london);
  ctx.skyView.setOption('darkness', 'dark');
  await wait(1200);
  // Sirius where it stands that evening.
  const date = new Date(ctx.clock.now()); const obs = new A.Observer(51.5, -0.12, 0);
  const h = A.Horizon(date, obs, 6.7525, -16.7161, 'normal');
  out.sirius = { alt: +h.altitude.toFixed(1), az: +h.azimuth.toFixed(1) };
  ctx.skyView.pointAt({ raDeg: 101.287, decDeg: -16.716 }, { fovDeg: 14, instant: true, mark: false });
  await wait(5000);
  await shot('s1-sirius-14');
  out.diag = { base: lum(), base2: lum() };
  const root = ctx.scene.getObjectByName('ground-sky');
  const names = [];
  const probe = (o) => {
    if (!o.visible) return null;
    o.visible = false; const r = lum(); o.visible = true;
    return { name: o.name || o.type, type: o.type, sum: r.sum - out.diag.base.sum, lit: r.lit - out.diag.base.lit, ring: r.ring - out.diag.base.ring };
  };
  out.diag.children = root.children.map(probe).filter(Boolean);
  const mw = root.getObjectByName('ground-milkyway');
  if (mw) { mw.visible = false; await wait(900); await shot('s2-sirius-no-milkyway'); mw.visible = true; }
  out.diag.milkyway = mw ? { visible: mw.visible, gain: mw.material.uniforms.uGain.value, map: mw.material.uniforms.uMap.value && [mw.material.uniforms.uMap.value.image && mw.material.uniforms.uMap.value.image.width, mw.material.uniforms.uMap.value.image && mw.material.uniforms.uMap.value.image.height] } : null;
  out.diag.stats = stats();
  // Mirzam and the wide sky, for the brightest stars' discs.
  ctx.skyView.pointAt({ raDeg: 95.675, decDeg: -17.956 }, { fovDeg: 14, instant: true, mark: false }); await wait(2500); await shot('s3-mirzam-14');
  ctx.skyView.pointAt({ raDeg: 83.0, decDeg: -3.0 }, { fovDeg: 72, instant: true, mark: false }); await wait(3500); await shot('s4-orion-72');
  out.diag.stats72 = stats();
  { const ps = ctx.renderer.info.programs || []; out.diag.programs = { count: ps.length, failed: ps.filter((p) => p.diagnostics && p.diagnostics.runnable === false).length }; }
});

await step('pairs', async () => {
  const london = place('London', 51.5, -0.12);
  if (ctx.skyView.active) ctx.skyView.exit();
  await wait(1500);
  ctx.clock.goTo(Date.UTC(2026, 11, 1, 12, 0));
  ctx.setObserver(london);
  const tab = [...document.querySelectorAll('[role="tab"], button')].find((b) => /^\s*earth\s*$/i.test(b.textContent || '') && b.getBoundingClientRect().width > 0);
  if (tab) tab.click();
  await wait(1500);
  const STAR = /Moon and (Regulus|Spica|Antares|Aldebaran|Pollux)/;
  const open = () => { const m = document.querySelector('.sr-next [aria-expanded="false"]'); if (m && !m.hidden) m.click(); };
  const rows = () => [...document.querySelectorAll('.sr-next__row')];
  const t0 = Date.now(); let got = false;
  while (Date.now() - t0 < 45000 && !got) { open(); got = rows().some((r) => STAR.test(r.textContent || '')); if (!got) await wait(1000); }
  out.pairs = { clock: new Date(ctx.clock.now()).toISOString().slice(0, 16), got, rows: rows().map((r) => `${r.dataset.kind}: ${(r.textContent || '').replace(/\s+/g, ' ').slice(0, 100)}`).slice(0, 12) };
  const row = rows().find((r) => STAR.test(r.textContent || ''));
  if (row) { row.scrollIntoView({ block: 'center' }); const b = row.getBoundingClientRect(); out.pairs.starRow = { box: [Math.round(b.left), Math.round(b.width)], overflow: row.scrollWidth > row.clientWidth + 1 }; }
  await wait(600); await window.cdpShot('p1-coming-up-pair');
  ctx.clock.live();
});
out.pageErrors = out.errors.slice(0, 10);
return out;

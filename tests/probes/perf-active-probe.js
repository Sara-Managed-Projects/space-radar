// "Everything active" on, the main thread measured (spec 0049 task 1, public #285).
//
//   $S/cdp1.sh <wt> "http://127.0.0.1:<port>/?sw=0&worker=0" tests/probes/perf-active-probe.js \
//       --width=1440 --height=900 --gl=gpu --block=celestrak.org,ll.thespacedevs.com      (before)
//   ... the same with "/?sw=0"                                                             (after)
//
// Needs the saved copies under site/data/v1 (celestrak-active.json above all). It reports, for the
// live clock (a glyph tick every 100 ms) and for a clock run at 60x (a tick every frame):
//   - what the active layer's update() cost the main thread per tick (performance.now() around it);
//   - the time between animation frames: median, 95th centile, worst, and how many were over 33 ms;
//   - the long tasks the browser reported;
//   - whether the frame latch tripped, and the pool's own account (ticks, the worker's ms).
// Headless Chrome on a development Mac is not a phone: these are for one-against-the-other only.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now(); while (!(window.__srLayersReady && window.spaceRadar) && Date.now() - t0 < 90000) await wait(300);
const ctx = window.spaceRadar; const out = { tReady: Date.now() - t0, url: location.search };
const log = (k) => fetch(`/probe-log?k=${k}&d=${encodeURIComponent(JSON.stringify(out[k])).slice(0, 1800)}&at=${Date.now() - t0}`).catch(() => {});
const q = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);
const sum = (a) => { const s = a.slice().sort((x, y) => x - y); const r = (v) => (v == null ? null : Math.round(v * 100) / 100); return { n: s.length, median: r(q(s, 0.5)), p95: r(q(s, 0.95)), max: r(s[s.length - 1]), mean: r(s.reduce((x, y) => x + y, 0) / Math.max(1, s.length)) }; };

await wait(4000); // the after-the-first-visit work has started and settled
ctx.setLayerOn('active', true);
const gl = ctx.glyphLayers.get('active');
const w0 = Date.now(); while (gl.count() < 5000 && Date.now() - w0 < 60000) await wait(250);
out.active = { count: gl.count(), loadMs: Date.now() - w0 };
await wait(3000); // the pool, if there is one, has its first answers
out.pool0 = gl.poolStats ? gl.poolStats() : 'no poolStats';
log('active'); log('pool0');

// update() timed where it is called.
const ticks = [];
const update = gl.update;
gl.update = function timed(t, cam) { const b = performance.now(); const r = update.call(gl, t, cam); ticks.push(performance.now() - b); return r; };
const long = [];
try { new PerformanceObserver((l) => { for (const e of l.getEntries()) long.push(e.duration); }).observe({ entryTypes: ['longtask'] }); } catch { out.longtask = 'not supported'; }

async function measure(name, ms) {
  ticks.length = 0; long.length = 0;
  const frames = []; let last = 0; let on = true;
  const f = (now) => { if (!on) return; if (last) frames.push(now - last); last = now; requestAnimationFrame(f); };
  requestAnimationFrame(f);
  await wait(ms);
  on = false;
  out[name] = {
    seconds: ms / 1000,
    frame: sum(frames), framesOver33: frames.filter((d) => d > 33).length, framesOver50: frames.filter((d) => d > 50).length,
    tick: sum(ticks), tickTotalMs: Math.round(ticks.reduce((x, y) => x + y, 0)),
    longTasks: { n: long.length, totalMs: Math.round(long.reduce((x, y) => x + y, 0)), max: Math.round(Math.max(0, ...long)) },
    drawn: gl.count(), latched: !!(ctx.latch && ctx.latch.latched),
    clock: { mode: ctx.clock.mode, rate: ctx.clock.rate },
    info: { calls: ctx.renderer.info.render.calls, triangles: ctx.renderer.info.render.triangles },
  };
  await log(name);
}
await measure('live', 12000);
ctx.clock.setRate(60);
await wait(1500);
await measure('rate60', 12000);
out.pool = gl.poolStats ? gl.poolStats() : null;
// The selection stays exact: the selected record's dot is where propagate() puts it NOW.
ctx.clock.setRate(1);
out.gpu = (() => { try { const g = ctx.renderer.getContext(); const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; } catch { return 'unknown'; } })();
out.cores = navigator.hardwareConcurrency;
out.totalMs = Date.now() - t0;
return out;

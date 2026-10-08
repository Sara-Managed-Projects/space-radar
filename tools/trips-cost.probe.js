// What every stop of every trip costs to draw (spec 0044 task 3; internal #123 and #435).
//
// For each trip: start it, press Start, then jump to each stop in turn, let it arrive and settle,
// and read from the renderer's own counters what one frame of that still takes: draw calls and
// triangles, averaged over three frames. Each is held to registry/budgets.yaml's
// `draw_calls_per_stop` and `triangles_per_stop` (read from js/data/budgets.js, as the page has
// them). The frame itself is read back too, 96 x 54, and a stop whose picture is more than 95 % one
// colour is reported: words over an empty view.
//
//   tools/cdp.mjs "http://127.0.0.1:<port>/?sw=0&cost=1" tools/trips-cost.probe.js --width=1440 --height=900 --gl=gpu
//   CI: scripts/check-trips.mjs (the `trips` job of screens.yml), a desktop and a phone.
//
//   &walktrip=a,b     only these trips            &settle=1500   ms a stop is given before it is read
//   &budget=480       stop starting trips after this many seconds, and say which were not reached
//
// tools/walk.probe.js reads the same counters at the five stops of each trip it photographs; this
// is every stop and no photograph, so it fits in one browser.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const param = (k, d) => (new RegExp('[?&#]' + k + '=([^&#]*)').exec(location.href) || [0, d])[1];
const t0 = Date.now();
while (!(window.__srLayersReady && window.spaceRadar && window.spaceRadar.trip) && Date.now() - t0 < 120000) await wait(300);
const ctx = window.spaceRadar;
if (!ctx || !ctx.trip) return { ok: false, problems: ['the app never booted'] };
const until = async (fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { let v; try { v = fn(); } catch { v = null; } if (v) return v; await wait(100); } return null; };
const SETTLE = Number(param('settle', '1500'));
const BUDGET_MS = Number(param('budget', '480')) * 1000;
const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.message).slice(0, 160)));
window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason && e.reason.message ? e.reason.message : e.reason).slice(0, 160)));

let BUDGETS = null;
try { BUDGETS = (await import(new URL('js/data/budgets.js', document.baseURI).href)).BUDGETS; } catch { BUDGETS = null; }
const MAX_CALLS = BUDGETS ? BUDGETS.draw_calls_per_stop : null;
const MAX_TRIS = BUDGETS ? BUDGETS.triangles_per_stop : null;
const ONE_COLOUR_MAX = 0.95;

const raf = () => new Promise((r) => requestAnimationFrame(r));
/** Draw calls and triangles a frame, from three frames with the counters' reset taken over. */
async function drawn(frames = 3) {
  const info = ctx.renderer && ctx.renderer.info;
  if (!info || !info.render) return null;
  const auto = info.autoReset;
  info.autoReset = false;
  try {
    await raf();
    info.reset();
    for (let i = 0; i < frames; i += 1) await raf();
    return { calls: Math.round(info.render.calls / frames), triangles: Math.round(info.render.triangles / frames) };
  } finally { info.autoReset = auto; }
}
/**
 * The share of the frame that is its commonest colour. Read inside an animation frame registered
 * after the app's own, so the drawing buffer still holds the frame just drawn.
 */
const small = document.createElement('canvas'); small.width = 96; small.height = 54;
const pen = small.getContext('2d', { willReadFrequently: true });
async function oneColour() {
  await raf();
  try {
    pen.drawImage(ctx.renderer.domElement, 0, 0, small.width, small.height);
    const px = pen.getImageData(0, 0, small.width, small.height).data;
    const seen = new Map();
    let top = 0;
    for (let i = 0; i < px.length; i += 4) {
      const k = ((px[i] >> 3) << 10) | ((px[i + 1] >> 3) << 5) | (px[i + 2] >> 3);
      const n = (seen.get(k) || 0) + 1;
      seen.set(k, n);
      if (n > top) top = n;
    }
    return Math.round((top / (px.length / 4)) * 1000) / 1000;
  } catch { return null; }
}
const arrive = async () => {
  const trip = ctx.trip;
  await until(() => ['dwell', 'settle', 'held', 'paused', 'outro', 'idle'].includes(trip.state.phase) || (trip.state.phase === 'flight' && ctx.cameraRig && ctx.cameraRig.finishFlight && (ctx.cameraRig.finishFlight(), false)), 40000);
};
const log = (k, d) => fetch(`/probe-log?k=${k}&d=${encodeURIComponent(JSON.stringify(d)).slice(0, 1900)}`).catch(() => {});

const want = param('walktrip', '').split(',').filter(Boolean);
const all = ctx.trip.tours().map((t) => t.id);
const ids = want.length ? want : all;
const rows = [];
const problems = [];
const notReached = [];
for (const id of ids) {
  if (Date.now() - t0 > BUDGET_MS) { notReached.push(id); continue; }
  const began = Date.now();
  try {
    const trip = ctx.trip;
    if (trip.state && trip.state.phase !== 'idle') { trip.stop(); await wait(500); }
    const plan = await trip.plan(id);
    if (!plan || !plan.offerable) { problems.push(`${id}: not offerable (${plan ? plan.reason || 'no reason' : 'no plan'})`); continue; }
    await trip.start(id);
    const start = await until(() => { const b = document.querySelector('.sr-tripsheet__start'); return b && b.getBoundingClientRect().width > 0 ? b : null; }, 20000);
    if (!start) { problems.push(`${id}: no intro with a Start`); continue; }
    start.click();
    await arrive();
    const count = trip.state.count;
    const mine = [];
    for (let i = 0; i < count; i += 1) {
      if (trip.state.index !== i) { trip.jumpTo(i); await wait(400); await arrive(); }
      await wait(SETTLE);
      const d = (await drawn()) || {};
      const flat = await oneColour();
      const row = { trip: id, n: i + 1, of: count, stop: trip.state.stopTitle, at: trip.state.index + 1, calls: d.calls, triangles: d.triangles, oneColour: flat };
      rows.push(row); mine.push([row.n, row.calls, row.triangles, row.oneColour]);
      if (trip.state.index !== i) problems.push(`${id} stop ${i + 1}: jumpTo did not arrive (at ${trip.state.index + 1})`);
      if (MAX_CALLS != null && d.calls > MAX_CALLS) problems.push(`${id} stop ${i + 1} "${row.stop}": ${d.calls} draw calls a frame, over draw_calls_per_stop (${MAX_CALLS})`);
      if (MAX_TRIS != null && d.triangles > MAX_TRIS) problems.push(`${id} stop ${i + 1} "${row.stop}": ${d.triangles} triangles a frame, over triangles_per_stop (${MAX_TRIS})`);
      if (flat != null && flat > ONE_COLOUR_MAX) problems.push(`${id} stop ${i + 1} "${row.stop}": ${Math.round(flat * 100)} % of the frame is one colour`);
    }
    trip.stop();
    await wait(400);
    log(id, { s: Math.round((Date.now() - began) / 1000), rows: mine });
  } catch (e) { problems.push(`${id}: the walk broke here: ${e && e.message}`); try { ctx.trip.stop(); } catch { /* gone */ } }
}
for (const e of [...new Set(errors)]) problems.push(`page error: ${e}`);
const num = (k) => rows.map((r) => r[k]).filter(Number.isFinite).sort((a, b) => a - b);
const q = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);
const worst = (k) => rows.filter((r) => Number.isFinite(r[k])).sort((a, b) => b[k] - a[k]).slice(0, 5).map((r) => `${r.trip} ${r.n} "${r.stop}": ${r[k]}`);
const calls = num('calls'); const tris = num('triangles');
return {
  ok: problems.length === 0 && notReached.length === 0,
  viewport: [innerWidth, innerHeight], dpr: devicePixelRatio, seconds: Math.round((Date.now() - t0) / 1000),
  trips: ids.length - notReached.length, stops: rows.length, notReached,
  budgets: { draw_calls_per_stop: MAX_CALLS, triangles_per_stop: MAX_TRIS, one_colour: ONE_COLOUR_MAX },
  calls: { median: q(calls, 0.5), p95: q(calls, 0.95), max: calls[calls.length - 1] ?? null, worst: worst('calls') },
  triangles: { median: q(tris, 0.5), p95: q(tris, 0.95), max: tris[tris.length - 1] ?? null, worst: worst('triangles') },
  oneColour: { max: Math.max(0, ...rows.map((r) => r.oneColour || 0)), worst: worst('oneColour') },
  latched: !!(ctx.latch && ctx.latch.latched),
  problems, rows,
};

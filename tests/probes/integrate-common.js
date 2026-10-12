// The integration pass of 2026-10-09 (bulk-a, bulk-b, bulk-c): what its probes share. Pasted after
// look-common.js and before one of integrate-scene-*.js / integrate-ui.js:
//   cat tests/probes/look-common.js tests/probes/integrate-common.js tests/probes/integrate-ui.js > /tmp/p.js
//   node tools/cdp.mjs 'http://127.0.0.1:<port>/?sw=0&tier=2' /tmp/p.js --width=1440 --height=900 --gl=gpu \
//     --block=celestrak.org,ll.thespacedevs.com --shot-dir=<dir>      (add --mobile --width=390 --height=844)
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const text = (n) => (n ? (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim() : null);
const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
// `&only=a,b` in the address runs those sections alone.
const ONLY = (new URLSearchParams(location.search).get('only') || '').split(',').filter(Boolean);
const run = async (name, fn) => { if (ONLY.length && !ONLY.includes(name)) return; const t = Date.now(); try { out[name] = await fn(); } catch (e) { out.errors.push(name + ': ' + String(e && e.stack || e).slice(0, 400)); } (out.ms = out.ms || {})[name] = Date.now() - t; };
window.addEventListener('unhandledrejection', (e) => out.errors.push('rej: ' + String(e.reason && e.reason.message || e.reason).slice(0, 200)));
const phone = innerWidth < 600;
out.vw = innerWidth; out.vh = innerHeight; out.tier = ctx.quality && ctx.quality.tier;
const homeView = async () => {
  try { if (ctx.trip && ctx.trip.state && ctx.trip.state.phase !== 'idle') { ctx.trip.stop('leave'); await wait(800); } } catch { /* none */ }
  try { if (ctx.selected && ctx.selected()) ctx.deselect(); } catch { /* none */ }
  try { for (let i = 0; i < 6 && ctx.shell.view() !== 'home'; i++) ctx.shell.back(); } catch { /* none */ }
  await wait(400);
};
const sheetUp = async () => { try { if (phone && ctx.shell.sheet && ctx.shell.sheet()) { ctx.shell.sheet().set('full'); await wait(600); } } catch { /* no sheet */ } };
// A `#go=` link's landing flight, from the moment the layers are in: what is selected, the stage, and frames.
await run('landing', async () => {
  const o = { hash: location.hash, log: [] };
  const say = () => ({ t: Date.now() - t0, sel: ctx.selected && ctx.selected() ? ctx.selected().id : null, stage: ctx.stage.worldId, flying: !!ctx.cameraRig.state.flying, dist: +Number(ctx.cameraRig.state.distance).toPrecision(4), view: ctx.shell.view() });
  for (const [i, ms] of [0, 2500, 3500, 4000, 5000, 8000].entries()) { await wait(ms); o.log.push(say()); await window.cdpShot(`l${i}-landing`); out.shots.push(`l${i}-landing`); }
  return o;
});

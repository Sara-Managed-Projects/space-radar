// The nine boot maps as WebP, one frame each, and the maps a device holds (spec 0056 req 4 and 8;
// internal #157 and #159).
//
//   $S/cdp1.sh <wt> "http://127.0.0.1:<port>/?sw=0" tests/probes/textures-probe.js \
//       --width=1440 --height=900 --gl=gpu --shot-dir=<dir> --block=celestrak.org,ll.thespacedevs.com
//
// Flies to the Earth, the Moon, Mars, Jupiter, Saturn, the Sun, Venus, Uranus and Neptune in turn,
// waits for each one's map, photographs it (window.cdpShot) and reads window.spaceRadar.gpu() --
// the worlds holding a map, the estimate in MiB, the renderer's own count of textures. Nine worlds
// is more than any tier may hold (scene/worlds.js MAPS_HELD), so the walk also shows the rule: the
// count never passes the tier's, the first worlds visited have given their maps back by the end,
// and going back to the Moon brings its map back (a last photograph).
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now(); while (!(window.__srLayersReady && window.spaceRadar) && Date.now() - t0 < 90000) await wait(300);
const ctx = window.spaceRadar; const out = { tReady: Date.now() - t0, steps: [] };
const log = (k, d) => fetch(`/probe-log?k=${k}&d=${encodeURIComponent(JSON.stringify(d)).slice(0, 1800)}&at=${Date.now() - t0}`).catch(() => {});
const until = async (fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { let v; try { v = fn(); } catch { v = null; } if (v) return v; await wait(150); } return null; };
await wait(3500);
out.tier = ctx.quality.describe();
out.start = ctx.gpu();
async function visit(id, name) {
  const rec = ctx.recordById(id);
  if (!rec) { out.steps.push({ id, missing: true }); return; }
  ctx.select(rec, { fly: true });
  await wait(1200);
  await until(() => !(ctx.cameraRig.state && ctx.cameraRig.state.flying) || (ctx.cameraRig.finishFlight && (ctx.cameraRig.finishFlight(), false)), 20000);
  // Arrived means the disc fills a good part of the view; a flight that had not begun at the first look is waited for.
  await until(() => ctx.worlds.discShare(id) > 0.3 || (ctx.cameraRig.state && ctx.cameraRig.state.flying && ctx.cameraRig.finishFlight && (ctx.cameraRig.finishFlight(), false)), 8000);
  const had = id === 'earth' ? true : !!(await until(() => ctx.worlds.hasMap(id), 20000));
  await wait(2500);
  const g = ctx.gpu();
  const step = { id, map: had, share: Math.round(ctx.worlds.discShare(id) * 1000) / 1000, held: g.worldMaps, max: g.worldMapsMax, mapsMiB: g.mapsMiB, textures: g.textures };
  out.steps.push(step);
  await log(name || id, step);
  if (window.cdpShot) await window.cdpShot(name || id);
}
// `&only=earth,moon` walks those alone; `&tier=0` (the app's own switch) shows the tier-0 maps on a
// machine that would otherwise sharpen the Earth and the Moon to 4k before the photograph.
const only = (/[?&]only=([\w,-]+)/.exec(location.search) || [0, ''])[1].split(',').filter(Boolean);
for (const id of only.length ? only : ['earth', 'moon', 'mars', 'jupiter', 'saturn', 'sun', 'venus', 'uranus', 'neptune']) await visit(id);
if (!only.length) await visit('moon', 'moon-again');
out.mostHeld = Math.max(...out.steps.map((s) => (s.held || []).length));
out.mostMiB = Math.max(...out.steps.map((s) => s.mapsMiB || 0));
out.mostTextures = Math.max(...out.steps.map((s) => s.textures || 0));
out.end = ctx.gpu();
out.gpuName = (() => { try { const g = ctx.renderer.getContext(); const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; } catch { return 'unknown'; } })();
out.totalMs = Date.now() - t0;
return out;

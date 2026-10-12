// The look of worlds and deep sky (public #273, #417, #411, #407, #404, #271, #426, #390, #406):
// what the two probes share. Pasted in front of look-a.js or look-b.js by the run line:
//   cat tests/probes/look-common.js tests/probes/look-a.js > /tmp/a.js
//   node tools/cdp.mjs 'http://127.0.0.1:<port>/?sw=0' /tmp/a.js --width=1440 --height=900 --gl=gpu \
//     --block=celestrak.org,ll.thespacedevs.com --shot-dir=<dir>
//   (look-w.js is pasted between them or run with look-b.js: `cat look-common.js look-w.js look-b.js`.)
// The same probe is run before and after a change, so a pair of frames differs by the change only.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
while (!(window.__srLayersReady && window.spaceRadar) && Date.now() - t0 < 60000) await wait(300);
const ctx = window.spaceRadar;
const out = { tReady: Date.now() - t0, errors: [], shots: [] };
window.addEventListener('error', (e) => out.errors.push(String(e.message).slice(0, 160)));
const until = async (f, cap, step = 200) => { const s = Date.now(); while (Date.now() - s < cap) { try { if (f()) return true; } catch { /* not yet */ } await wait(step); } return false; };
/** The keyboard help opens by itself on a first visit and sits over the picture: close it. */
const closeHelp = () => {
  for (const el of document.querySelectorAll('section, aside, div[role="dialog"], div')) {
    if (el.children.length > 12 || !/^\s*controls/i.test(el.textContent || '')) continue;
    const b = el.querySelector('button[aria-label*="lose"], button');
    if (b) { b.click(); return true; }
  }
  return false;
};
const shot = async (name, settle = 1500) => { await wait(settle); closeHelp(); await wait(150); await window.cdpShot(name); out.shots.push(name); };
const V = (x, y, z) => ({ x, y, z });
const norm = (a) => { const l = Math.hypot(a.x, a.y, a.z) || 1; return V(a.x / l, a.y / l, a.z / l); };
const cross = (a, b) => V(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const mix = (a, ka, b, kb) => V(a.x * ka + b.x * kb, a.y * ka + b.y * kb, a.z * ka + b.z * kb);
const DEG = Math.PI / 180;
/** A trip's stop `n` (0-based), arrived and held. */
async function tripStop(id, n) {
  try { ctx.trip.stop('leave'); } catch { /* nothing ran */ }
  await wait(400);
  const plan = await ctx.trip.start(id);
  if (!plan || plan.offerable === false) { out.errors.push(`trip ${id}: ${(plan && plan.reason) || 'no plan'}`); return false; }
  await until(() => ctx.trip.state.phase === 'intro', 20000);
  if (n > 0) ctx.trip.jumpTo(n);
  ctx.trip.play();
  const ok = await until(() => ['dwell', 'held'].includes(ctx.trip.state.phase) && ctx.trip.state.index === n, 45000, 100);
  if (!ok) out.errors.push(`trip ${id} stop ${n}: phase ${ctx.trip.state.phase} index ${ctx.trip.state.index}`);
  return ok;
}
/** Fly to a record and wait for the flight (and a world's map). */
async function goTo(id, capMs = 22000) {
  const rec = ctx.recordById(id);
  if (!rec) { out.errors.push(`no record ${id}`); return null; }
  ctx.select(rec, { fly: true });
  const f0 = Date.now(); await wait(2500);
  while ((ctx.cameraRig.state.flying || (ctx.worlds.meshFor(id) && ctx.worlds.hasMap && !ctx.worlds.hasMap(id))) && Date.now() - f0 < capMs) await wait(400);
  await wait(1500);
  return rec;
}
/**
 * Stand at `phaseDeg` from the Sun's direction round a world (0 = the Sun behind the camera), `upDeg`
 * above its equator ON THE SUN'S SIDE of it (the lit face of a ring; negative: the unlit face), at
 * `k` times the distance the flight chose.
 */
function standAt(id, phaseDeg, upDeg = 0, k = 1) {
  const mesh = ctx.worlds.meshFor(id);
  const u = mesh.material.uniforms;
  const sun = norm(u.uSunDir.value);
  const e = mesh.matrixWorld.elements;
  const pole = norm(V(e[4], e[5], e[6]));
  const side = norm(cross(pole, sun));
  let dir = mix(sun, Math.cos(phaseDeg * DEG), side, Math.sin(phaseDeg * DEG));
  // Into the equator's plane first, then lifted: upDeg is the camera's elevation above the rings.
  const d = dir.x * pole.x + dir.y * pole.y + dir.z * pole.z;
  dir = norm(mix(dir, 1, pole, -d));
  const lit = (sun.x * pole.x + sun.y * pole.y + sun.z * pole.z) >= 0 ? 1 : -1;
  dir = norm(mix(dir, Math.cos(upDeg * DEG), pole, lit * Math.sin(upDeg * DEG)));
  ctx.cameraRig.flyTo({ offset: dir, distance: ctx.cameraRig.state.distance * k, ms: 0 });
  return dir;
}
/** A star-field object framed so its measured size is `px` pixels across (a view 900 px tall). */
function frameSize(id, px = 260) {
  const rec = ctx.recordById(id);
  const sizeLy = rec && rec.meta && Number(rec.meta.sizeLy);
  if (!(sizeLy > 0)) return false;
  const unitKm = ctx.stage.unitKm;
  const size = (sizeLy * 9460730472580.8) / unitKm;
  const h = window.innerHeight;
  ctx.cameraRig.flyTo({ distance: (size / px) * h / (2 * Math.tan((ctx.camera.fov * DEG) / 2)), ms: 0 });
  return true;
}

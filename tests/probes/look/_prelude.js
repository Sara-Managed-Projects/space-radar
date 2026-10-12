// tests/probes/look/_prelude.js -- what every look probe starts with. Pasted in front of the probe
// (`cat _prelude.js smoke.js`), so both run as ONE body inside an async function in the page: by
// tools/cdp.mjs in Chromium and by tools/look-playwright.mjs in Firefox and WebKit, which offer the
// same `window.cdpShot(name)`. tools/README.md, "A look from a machine that has time".
//
// What a probe has after this: `sr` (window.spaceRadar), `rig` (its camera), sleep(ms),
// until(fn, capMs), shot(name, note), go(id, name, waitMs, note), stage(id, waitMs), finish(extra),
// and sunward(id), north(id), unit, mix, cross for standing on a world's lit side.
// A probe ends with `return finish({...})`. A field named `fail` in what it returns fails the job.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const look = { probe: '', errors: [], warns: [], shots: [], missing: [] };
{
  const text = (a) => a.map((x) => (x && x.stack ? String(x.stack) : String(x))).join(' ');
  const ce = console.error.bind(console);
  console.error = (...a) => { look.errors.push('console.error: ' + text(a).slice(0, 600)); ce(...a); };
  const cw = console.warn.bind(console);
  console.warn = (...a) => { look.warns.push(text(a).slice(0, 300)); cw(...a); };
  window.addEventListener('error', (e) => look.errors.push('uncaught: ' + String(e.message).slice(0, 600)));
  window.addEventListener('unhandledrejection', (e) => look.errors.push('unhandled rejection: ' + String((e.reason && (e.reason.stack || e.reason.message)) || e.reason).slice(0, 600)));
}
// The controls hint opens by itself a few seconds into a first visit and sits over the picture:
// say it has been seen (ui/keyhint.js STORE_KEY), before the page asks.
try { localStorage.setItem('sr:keyhint', '1'); } catch { /* the hint is then in the second picture */ }
const until = async (fn, capMs, stepMs = 250) => {
  const t = Date.now();
  while (Date.now() - t < capMs) { try { if (fn()) return true; } catch { /* not yet */ } await sleep(stepMs); }
  return false;
};
const lookT0 = Date.now();
// Ten minutes: a software renderer on a shared runner boots in one to two.
await until(() => window.__srLayersReady && window.spaceRadar, 600000, 500);
const sr = window.spaceRadar;
const rig = sr && sr.cameraRig;
const frameCost = () => {
  try { const i = sr.renderer.info; return { calls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries, programs: i.programs ? i.programs.length : null }; } catch { return null; }
};
const glName = () => {
  try { const gl = sr.renderer.getContext(); const x = gl.getExtension('WEBGL_debug_renderer_info'); return String(x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)); } catch (e) { return 'unknown (' + e + ')'; }
};
const finish = (extra = {}) => ({
  probe: look.probe,
  readyMs: look.readyMs,
  // `held`: ?look=1 reached a main.js that knows it. undefined on a ref from before the switch.
  held: sr && sr.latch ? sr.latch.held : undefined,
  latched: sr && sr.latch ? sr.latch.latched : null,
  tier: sr && sr.quality ? sr.quality.describe() : null,
  scale: sr && sr.scaler ? sr.scaler.scale : null,
  userAgent: navigator.userAgent,
  gl: sr ? glName() : null,
  viewport: [innerWidth, innerHeight, devicePixelRatio],
  render: frameCost(),
  errors: look.errors, warns: look.warns, missing: look.missing, shots: look.shots,
  ...extra,
});
if (!sr || !window.__srLayersReady) return finish({ fail: 'the page never said its layers were ready (window.__srLayersReady) in ten minutes' });
look.readyMs = Date.now() - lookT0;
/** A picture, and one line about it for the summary. `settleMs` first: a frame in software is slow. */
const shot = async (name, note = '', settleMs = 0) => {
  if (settleMs) await sleep(settleMs);
  const cost = frameCost();
  await window.cdpShot(name);
  look.shots.push({ name, note, calls: cost && cost.calls, triangles: cost && cost.triangles, latched: sr.latch ? sr.latch.latched : null });
};
/** Select a record and fly to it, as a click on its row does. */
const go = async (id, name, waitMs = 6000, note = '') => {
  const r = sr.recordById(id);
  if (!r) { look.missing.push(id); return false; }
  sr.select(r, { fly: true, undo: false });
  await sleep(waitMs);
  if (name) await shot(name, note || ('selected: ' + id));
  return true;
};
/** A world's own stage, as "Go there" does. */
const stage = async (id, waitMs = 9000) => { sr.setStage(id); await sleep(waitMs); };
// A WORLD IS LIT BY THE SUN AND NOTHING ELSE: a camera sent round one by azimuth photographs its night
// (the first worlds probe did, and so did the first close look at Jupiter's belt: a black frame).
// So a probe stands where the light is: `rig.flyTo({ offset: mix(sunward(id), 1, north(id), 0.3) })`.
const unit = (v) => { const n = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / n, y: v.y / n, z: v.z / n }; };
const mix = (a, ka, b, kb) => ({ x: a.x * ka + b.x * kb, y: a.y * ka + b.y * kb, z: a.z * ka + b.z * kb });
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
/** From a world to the Sun, in the scene, now. */
const sunward = (id) => { const m = sr.worlds.meshFor(id); const s = sr.worlds.meshFor('sun'); return unit({ x: s.position.x - m.position.x, y: s.position.y - m.position.y, z: s.position.z - m.position.z }); };
/** A world's own north: its mesh's y axis in the scene. */
const north = (id) => { const m = sr.worlds.meshFor(id); m.updateMatrixWorld(); const e = m.matrixWorld.elements; return unit({ x: e[4], y: e[5], z: e[6] }); };
// The layers are ready; the later ones (weather, the aurora, the planets as lights) come a few seconds after.
await sleep(6000);

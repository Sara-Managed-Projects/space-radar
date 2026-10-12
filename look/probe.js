const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; const warns = [];
const ce = console.error.bind(console); console.error = (...a) => { errors.push('console: ' + a.map(String).join(' ').slice(0, 400)); ce(...a); };
const cw = console.warn.bind(console); console.warn = (...a) => { warns.push(a.map(String).join(' ').slice(0, 300)); cw(...a); };
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push('rej: ' + String(e.reason && e.reason.message || e.reason)));
try { Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); } catch (e) {}
const t0 = Date.now();
for (let i = 0; i < 600 && !window.__srLayersReady; i++) await sleep(500);
const sr = window.spaceRadar; const out = { readyMs: Date.now() - t0, errors, warns };
await sleep(6000);
const rig = sr.cameraRig;
// 1. planets as lights: the Earth small, each bright planet in turn behind it and to one side
const d0 = rig.state.distance;
for (const id of ['venus', 'jupiter', 'mars', 'saturn']) {
  const p = sr.worlds.drawnPositionOf(id); if (!p) { out['no_' + id] = true; continue; }
  const n = Math.hypot(p.x, p.y, p.z); const v = { x: p.x / n, y: p.y / n, z: p.z / n };
  const perp = Math.abs(v.y) < 0.9 ? { x: -v.z, y: 0, z: v.x } : { x: 1, y: 0, z: 0 };
  rig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: d0 * 3, offset: { x: -v.x + 0.22 * perp.x, y: -v.y + 0.22 * perp.y, z: -v.z + 0.22 * perp.z }, ms: 0 });
  await sleep(5000); await window.cdpShot('light-' + id);
}
out.lights = sr.worldLights && sr.worldLights.state ? sr.worldLights.state() : null;
// 2. Pluto, from its own stage and from the Earth's
sr.setStage('pluto'); await sleep(10000); await window.cdpShot('pluto-1-stage');
const dp = rig.state.distance;
for (const [name, az, pol] of [['pluto-2-az90', 1.57, 1.57], ['pluto-3-az180', 3.14, 1.57], ['pluto-4-az270', 4.71, 1.57], ['pluto-5-north', 0, 0.3], ['pluto-6-south', 0, 2.84]]) {
  rig.flyTo({ azimuth: az, polar: pol, distance: dp, ms: 0 }); await sleep(5000); await window.cdpShot(name);
}
rig.flyTo({ azimuth: 0.6, polar: 1.3, distance: dp * 0.45, ms: 0 }); await sleep(6000); await window.cdpShot('pluto-7-close');
sr.setStage('earth'); await sleep(6000);
const rec = sr.recordById('pluto'); sr.select(rec, { fly: true, undo: false }); await sleep(9000); await window.cdpShot('pluto-8-from-earth-stage');
const info = sr.renderer.info; out.render = { calls: info.render.calls, tex: info.memory.textures };
return out;

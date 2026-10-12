const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; const warns = [];
const ce = console.error.bind(console); console.error = (...a) => { errors.push('console: ' + a.map(String).join(' ').slice(0, 500)); ce(...a); };
const cw = console.warn.bind(console); console.warn = (...a) => { warns.push(a.map(String).join(' ').slice(0, 300)); cw(...a); };
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push('rej: ' + String(e.reason && e.reason.message || e.reason)));
try { Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); } catch (e) {}
const t0 = Date.now();
for (let i = 0; i < 600 && !window.__srLayersReady; i++) await sleep(500);
const sr = window.spaceRadar; const out = { readyMs: Date.now() - t0, errors, warns };
await sleep(6000);
const rig = sr.cameraRig;
sr.setStage('sun'); await sleep(8000);
const rec = sr.recordById('sun'); sr.select(rec, { fly: true, undo: false }); await sleep(12000);
// The frame's own loader is behind the same gate as the latch, which this probe holds shut: load by hand.
try {
  const m = await import('/js/scene/sun.js');
  const detail = m.createSunDetail({ mesh: sr.worlds.meshFor('sun'), camera: sr.camera, tier: 2 });
  sr.sunDetail = detail;
  const r = await import('/js/data/sunregions.js'); const regions = r.parseSunRegions(await r.readSunRegions()); detail.setRegions(regions); out.regions = regions.length;
  const a = await import('/js/data/sunactivity.js');
  const flares = a.parseFlares(await a.readSunEvents()); detail.setFlares(flares); out.flares = flares.length; out.flareSample = flares.slice(-3);
  const cmes = a.parseCmes(await a.readCmes()); detail.setCmes(cmes); out.cmes = cmes.length; out.cmeSample = cmes.slice(-2);
  window.__flares = flares; window.__cmes = cmes;
} catch (e) { errors.push('detail: ' + (e && e.stack || e)); }
await sleep(8000);
await window.cdpShot('sun-1-arrival');
out.detail = sr.sunDetail && sr.sunDetail.state ? sr.sunDetail.state() : null;
const d = rig.state.distance;
rig.flyTo({ distance: d * 0.55, ms: 0 }); await sleep(8000); await window.cdpShot('sun-2-closer');
await sleep(6000); await window.cdpShot('sun-3-six-seconds-later');
rig.flyTo({ distance: d * 0.3, azimuth: rig.state.azimuth + 0.5, ms: 0 }); await sleep(8000); await window.cdpShot('sun-4-limb-close');
rig.flyTo({ distance: d * 1.6, ms: 0 }); await sleep(8000); await window.cdpShot('sun-5-wide-corona');
try {
  const f = (window.__flares || []).slice().sort((x, y) => String(y.cls || y.class || '').localeCompare(String(x.cls || x.class || '')))[0];
  const tf = f && (f.peakMs || f.peak || f.tMs || f.t);
  if (tf) { sr.clock.goTo(Number(tf) + 60000); await sleep(8000); await window.cdpShot('sun-6-at-a-flare'); out.flareAt = f; }
  const c = (window.__cmes || []).slice(-1)[0]; const tc = c && (c.startMs || c.t0 || c.tMs || c.t);
  if (tc) { sr.clock.goTo(Number(tc) + 2 * 3600e3); await sleep(8000); await window.cdpShot('sun-7-two-hours-into-a-cme'); out.cmeAt = c; }
} catch (e) { errors.push('events: ' + e); }
out.detail2 = sr.sunDetail && sr.sunDetail.state ? sr.sunDetail.state() : null;
out.latched = sr.latched ? sr.latched() : null;
const info = sr.renderer.info; out.render = { calls: info.render.calls, tris: info.render.triangles, tex: info.memory.textures, programs: info.programs ? info.programs.length : null };
return out;

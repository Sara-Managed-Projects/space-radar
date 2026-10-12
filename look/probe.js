const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; const warns = [];
const ce = console.error.bind(console); console.error = (...a) => { errors.push('console: ' + a.map(String).join(' ').slice(0, 400)); ce(...a); };
const cw = console.warn.bind(console); console.warn = (...a) => { warns.push(a.map(String).join(' ').slice(0, 300)); cw(...a); };
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push('rej: ' + String(e.reason && e.reason.message || e.reason)));
// The runner draws in software: without this the frame latch fires and takes the weather off.
try { Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); } catch (e) { errors.push('hidden: ' + e); }
const t0 = Date.now();
for (let i = 0; i < 600 && !window.__srLayersReady; i++) await sleep(500);
const sr = window.spaceRadar; const out = { readyMs: Date.now() - t0, errors, warns };
await sleep(6000);
sr.setStage('jupiter'); await sleep(12000);
await window.cdpShot('1-jupiter-stage');
const rig = sr.cameraRig; const d0 = rig.state.distance;
rig.flyTo({ distance: d0 * 0.45, ms: 0 }); await sleep(8000); await window.cdpShot('2-closer');
out.latched = sr.latched ? sr.latched() : null; out.tier = (() => { try { return sr.quality.state ? sr.quality.state() : (sr.quality.tier ? sr.quality.tier() : null); } catch (e) { return String(e); } })();
try { const rates = sr.clock.rates(); sr.clock.setRate(rates[rates.length - 2] || rates[rates.length - 1]); out.rate = sr.clock.rate; } catch (e) { out.rateError = String(e); }
await sleep(6000); await window.cdpShot('3-later');
rig.flyTo({ polar: 0.25, distance: d0 * 0.5, ms: 0 }); await sleep(8000); await window.cdpShot('4-north-pole');
rig.flyTo({ polar: Math.PI - 0.25, distance: d0 * 0.5, ms: 0 }); await sleep(8000); await window.cdpShot('5-south-pole');
rig.flyTo({ polar: 1.75, distance: d0 * 0.3, ms: 0 }); await sleep(8000); await window.cdpShot('6-close-south-belt');
const info = sr.renderer.info; out.render = { calls: info.render.calls, tris: info.render.triangles, tex: info.memory.textures, programs: info.programs ? info.programs.length : null };
return out;

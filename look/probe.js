const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const ce = console.error.bind(console); console.error = (...a) => { errors.push('console: ' + a.map(String).join(' ').slice(0, 300)); ce(...a); };
const cw = console.warn.bind(console); const warns = []; console.warn = (...a) => { warns.push(a.map(String).join(' ').slice(0, 200)); cw(...a); };
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push('rej: ' + String(e.reason && e.reason.message || e.reason)));
const t0 = Date.now();
for (let i = 0; i < 600 && !window.__srLayersReady; i++) await sleep(500);
const sr = window.spaceRadar; const out = { readyMs: Date.now() - t0, errors, warns };
if (!sr) return { ...out, fail: 'no spaceRadar' };
await sleep(9000);
await window.cdpShot('1-home');
out.worldLights = !!sr.worldLights || Object.keys(sr).filter((k) => /light/i.test(k));
const go = async (id, name, wait = 6000) => { const r = sr.recordById(id); if (!r) { out['missing_' + id] = true; return; } sr.select(r, { fly: true, undo: false }); await sleep(wait); await window.cdpShot(name); };
// pull back so the planets are small lights
sr.cameraRig.flyTo({ distance: sr.cameraRig.state.distance * 6, ms: 0 }); await sleep(3000); await window.cdpShot('2-wide');
await go('moon', '3-moon'); await go('jupiter', '4-jupiter'); await go('sun', '5-sun', 9000); await go('saturn', '6-saturn');
// the Earth again, the ocean currents on
await go('earth', '7-earth', 5000);
out.overlays = typeof sr.overlayChoices === 'function' ? sr.overlayChoices() : null;
try { sr.setOverlay('currents'); } catch (e) { out.currentsError = String(e); }
await sleep(9000);
out.currents = sr.currents && sr.currents.state ? sr.currents.state() : (typeof sr.overlayState === 'function' ? sr.overlayState() : null);
await window.cdpShot('8-currents');
// turn to the Atlantic if the rig allows
try { sr.cameraRig.flyTo({ azimuth: sr.cameraRig.state.azimuth + 1.6, ms: 0 }); await sleep(4000); await window.cdpShot('9-currents-turned'); } catch (e) { out.turnError = String(e); }
try { sr.setOverlay(null); } catch (e) {}
// the drift, three stops
const d = await sr.wantDrift({ drift: 'craft,worlds,brisk' }, 'link');
out.drift = [];
let last = null;
for (let i = 0; i < 70; i++) { await sleep(1000); const st = d.state(); if (st.phase === 'dwell' && st.place !== last) { last = st.place; out.drift.push([st.place, st.hood]); await sleep(2500); await window.cdpShot('drift-' + out.drift.length + '-' + st.place); if (out.drift.length >= 4) break; } }
d.stop();
const info = sr.renderer.info; out.render = { calls: info.render.calls, tris: info.render.triangles, tex: info.memory.textures, programs: info.programs ? info.programs.length : null };
out.overlay = typeof sr.overlayState === 'function' ? sr.overlayState() : null;
return out;

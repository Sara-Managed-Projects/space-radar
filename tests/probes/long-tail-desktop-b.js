// Long tail, the second desktop walk (1440 x 900, through cdp1.sh with --reduced-motion and
// --shot-dir). Internal #362 (the wind, standing still), #432 (search rows), #397 (photo mode's
// lens, the camera in a link), #424 (Cassini ended, Apophis in 2029). The wind's server was not
// answering on the afternoon of 2026-10-07, so the request is answered here from a copy of what
// it sent at 11:25 UTC that day (site/data/v1/wind-probe.json, not in the repository): the
// drawing is what is being looked at, not the server.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const realFetch = window.fetch.bind(window);
window.fetch = (u, init) => (String(u).includes('pacioos.hawaii.edu') ? realFetch('./data/v1/wind-probe.json') : realFetch(u, init));
const t0 = Date.now(); while (!(window.__srLayersReady && window.spaceRadar) && Date.now() - t0 < 90000) await wait(300);
const ctx = window.spaceRadar; const out = { tReady: Date.now() - t0 };
const text = (sel) => { const n = document.querySelector(sel); return n ? n.innerText.replace(/\s+/g, ' ').trim() : null; };
const log = (k) => realFetch(`/probe-log?k=${k}&d=${encodeURIComponent(JSON.stringify(out[k])).slice(0, 1800)}&at=${Date.now() - t0}`).catch(() => {});
// 1. the wind
ctx.setOverlay('wind');
const w0 = Date.now();
while (!(ctx.wind && ctx.wind.state().status !== 'loading') && Date.now() - w0 < 20000) await wait(250);
ctx.cameraRig.flyTo({ distance: ctx.cameraRig.saveState().distance * 0.6, ms: 0 });
await wait(2000);
const lines = ctx.wind && ctx.wind.lines();
out.wind = ctx.wind ? { status: ctx.wind.state().status, still: ctx.wind.state().still, mean: ctx.wind.state().meanSpeed, max: ctx.wind.state().maxSpeed, ms: Date.now() - w0, visible: lines && lines.visible, opacity: lines && +lines.material.opacity.toFixed(2), vertices: lines && lines.geometry.attributes.position.count, scale: lines && lines.scale.x } : null;
await log('wind');
await window.cdpShot('e1-wind-still');
ctx.setOverlay(null);
// 2. search rows
const input = document.querySelector('.sr-search__input');
if (input) {
  input.focus(); await wait(1200);
  const type = async (q) => { input.value = q; input.dispatchEvent(new Event('input', { bubbles: true })); await wait(1200); return [...document.querySelectorAll('.sr-search__option')].map((li) => ({ t: li.innerText.replace(/\s+/g, ' ').trim().slice(0, 70), icon: li.querySelector('.sr-icon') ? [...li.querySelector('.sr-icon').classList].pop() : li.querySelector('.sr-swatch') ? 'dot' : null })); };
  out.searchStarlink = await type('starlink'); await log('searchStarlink');
  out.searchMars = await type('mars'); await log('searchMars');
  out.searchSat = await type('sat'); await log('searchSat');
  await window.cdpShot('e2-search-rows');
  input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.blur(); await wait(200);
}
// 3. Cassini, ended
const cassini = ctx.recordById('deep-cassini');
if (cassini) {
  if (!ctx.isLayerOn(cassini.layer)) ctx.setLayerOn(cassini.layer, true);
  ctx.select(cassini, { fly: false }); await wait(1800);
  const fly = [...document.querySelectorAll('#sr-card button')].find((b) => /Fly to it/.test(b.textContent));
  out.cassini = { card: (text('#sr-card') || '').slice(0, 220), flyDisabled: fly ? fly.disabled : null, flyTitle: fly ? fly.title : null };
  await log('cassini');
  await window.cdpShot('e3-cassini-ended');
}
// 4. the camera in a link
const { camValue } = await import('./js/ui/urlstate.js');
ctx.select(ctx.recordById('mars'), { fly: true }); await wait(2500);
const s0 = ctx.cameraRig.saveState();
ctx.cameraRig.flyTo({ azimuth: s0.azimuth + 1.1, polar: 1.0, distance: s0.distance * 1.7, ms: 0 }); await wait(600);
const key = camValue(ctx.camPose());
ctx.cameraRig.flyTo({ azimuth: s0.azimuth - 0.5, polar: 1.4, distance: s0.distance * 0.8, ms: 0 }); await wait(400);
const between = camValue(ctx.camPose());
ctx.deselect(); await wait(300);
location.hash = `#at=mars&cam=${key}`;
await wait(5000);
out.cam = { key, between, got: camValue(ctx.camPose()), hashAfter: location.hash, selected: ctx.selected() && ctx.selected().id }; await log('cam');
// 5. photo mode: the lens
const P = await import('./js/ui/photomode.js');
const fov0 = ctx.camera.fov;
const photo = P.openPhotoMode(ctx, { record: ctx.recordById('mars') });
await wait(500);
const range = document.querySelector('.sr-photo__range');
if (range) { range.value = '22'; range.dispatchEvent(new Event('input', { bubbles: true })); }
const png = [...document.querySelectorAll('.sr-photo__btn')].find((b) => b.textContent === 'PNG'); if (png) png.click();
await wait(1200);
const bar = document.querySelector('.sr-photo__bar');
out.photo = { fov0, fovLens: ctx.camera.fov, format: photo.state().format, lensText: text('.sr-photo__lens'), barW: bar ? Math.round(bar.getBoundingClientRect().width) : null, saveTitle: document.querySelector('.sr-photo__save') && document.querySelector('.sr-photo__save').title };
await window.cdpShot('e4-photo-lens');
photo.close(); await wait(200);
out.photo.fovAfter = ctx.camera.fov; await log('photo');
// 6. Apophis's predicted event from a link
location.hash = '#event=apophis.earth-2029';
await wait(6000);
out.apophis = { clock: new Date(ctx.clock.now()).toISOString(), selected: ctx.selected() && ctx.selected().id, mission: (text('.sr-card__mission') || '').slice(0, 360) }; await log('apophis');
await window.cdpShot('e5-apophis-2029');
out.ms = Date.now() - t0; return out;

// Long tail, the desktop walk (1440 x 900, through cdp1.sh with --shot-dir, no --reduced-motion:
// the wind must move). Internal #362, #386, #408, #432, #397, #424, #295. Each step leaves its
// numbers in the server's log (GET /probe-log?...) as well as in the return value, because a run
// is cut at four minutes and SwiftShader takes a minute to get to the first frame.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now(); while (!(window.__srLayersReady && window.spaceRadar) && Date.now() - t0 < 90000) await wait(300);
const ctx = window.spaceRadar; const out = { tReady: Date.now() - t0 };
const text = (sel) => { const n = document.querySelector(sel); return n ? n.innerText.replace(/\s+/g, ' ').trim() : null; };
const log = (k) => fetch(`/probe-log?k=${k}&d=${encodeURIComponent(JSON.stringify(out[k])).slice(0, 1800)}&at=${Date.now() - t0}`).catch(() => {});
// 1. the wind, close enough to judge the streaks
ctx.setOverlay('wind');
const w0 = Date.now();
while (!(ctx.wind && ctx.wind.state().status !== 'loading') && Date.now() - w0 < 40000) await wait(300);
ctx.cameraRig.flyTo({ distance: ctx.cameraRig.saveState().distance * 0.6, ms: 0 });
await wait(3500);
const lines = ctx.wind && ctx.wind.lines();
out.wind = ctx.wind ? { status: ctx.wind.state().status, mean: ctx.wind.state().meanSpeed, max: ctx.wind.state().maxSpeed, ms: Date.now() - w0, visible: lines && lines.visible, opacity: lines && +lines.material.opacity.toFixed(2), vertices: lines && lines.geometry.attributes.position.count, scale: lines && lines.scale.x } : null;
if (lines) { const p = lines.geometry.attributes.position.array; const a = Array.from(p.slice(0, 300)); await wait(1200); out.wind.moved = a.filter((x, i) => Math.abs(x - p[i]) > 1e-7).length; }
await log('wind');
await window.cdpShot('d1-wind-close');
// 2. search rows and the pill stepping by event, in one frame
const unit = document.querySelector('.sr-time__unit');
const steps = document.querySelectorAll('.sr-time__step');
out.pill = {};
if (unit && steps.length === 2) {
  for (let i = 0; i < 4 && unit.textContent !== 'Event'; i += 1) { unit.click(); await wait(120); }
  out.pill.unit = unit.textContent; out.pill.marks = document.querySelectorAll('.sr-tape__mark').length; out.pill.moon = document.querySelectorAll('.sr-tape__mark[data-kind="moon"]').length;
  out.pill.nextTitle = steps[1].title; out.pill.before = text('.sr-time__words');
  steps[1].click(); await wait(1200);
  out.pill.afterNext = text('.sr-time__words'); out.pill.said = text('.sr-time [role="status"]');
}
await log('pill');
const input = document.querySelector('.sr-search__input');
if (input) {
  input.focus(); await wait(1500);
  const type = async (q) => { input.value = q; input.dispatchEvent(new Event('input', { bubbles: true })); await wait(1300); return [...document.querySelectorAll('.sr-search__option')].map((li) => ({ t: li.innerText.replace(/\s+/g, ' ').trim().slice(0, 80), icon: li.querySelector('.sr-icon') ? [...li.querySelector('.sr-icon').classList].pop() : li.querySelector('.sr-swatch') ? 'dot' : null })); };
  out.searchMars = await type('mars');
  out.searchStarlink = await type('starlink');
  await log('searchMars'); await log('searchStarlink');
  await window.cdpShot('d2-search-and-pill');
  input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.blur(); await wait(200);
}
const live = document.querySelector('.sr-time__live'); if (live && !live.hidden) live.click();
// 3. words only: Cassini ended; a card's distance over three seconds; Apophis from a link
const cassini = ctx.recordById('deep-cassini');
if (cassini) {
  if (!ctx.isLayerOn(cassini.layer)) ctx.setLayerOn(cassini.layer, true);
  ctx.select(cassini, { fly: false }); await wait(2000);
  const fly = [...document.querySelectorAll('#sr-card button')].find((b) => /Fly to it/.test(b.textContent));
  out.cassini = { card: (text('#sr-card') || '').slice(0, 260), flyDisabled: fly ? fly.disabled : null, flyTitle: fly ? fly.title : null };
  await log('cassini');
}
ctx.select(ctx.recordById('mars'), { fly: false }); await wait(1500);
const heroA = (text('#sr-card') || '').slice(0, 160); await wait(3200); const heroB = (text('#sr-card') || '').slice(0, 160);
out.marsTick = { a: heroA, b: heroB, changed: heroA !== heroB }; await log('marsTick');
// 4. photo mode: the lens
const P = await import('./js/ui/photomode.js');
const fov0 = ctx.camera.fov;
const photo = P.openPhotoMode(ctx, { record: ctx.recordById('mars') });
await wait(600);
const range = document.querySelector('.sr-photo__range');
if (range) { range.value = '22'; range.dispatchEvent(new Event('input', { bubbles: true })); }
const png = [...document.querySelectorAll('.sr-photo__btn')].find((b) => b.textContent === 'PNG'); if (png) png.click();
await wait(1500);
const bar = document.querySelector('.sr-photo__bar');
out.photo = { fov0, fovLens: ctx.camera.fov, format: photo.state().format, lensText: text('.sr-photo__lens'), barW: bar ? Math.round(bar.getBoundingClientRect().width) : null, saveTitle: document.querySelector('.sr-photo__save') && document.querySelector('.sr-photo__save').title };
await window.cdpShot('d3-photo-lens');
photo.close(); await wait(300);
out.photo.fovAfter = ctx.camera.fov; await log('photo');
// 5. the camera in a link, and Apophis's predicted event from a link
const { camValue } = await import('./js/ui/urlstate.js');
const s0 = ctx.cameraRig.saveState();
ctx.cameraRig.flyTo({ azimuth: s0.azimuth + 1.1, polar: 1.0, distance: s0.distance * 1.7, ms: 0 }); await wait(700);
const want = ctx.camPose(); const key = camValue(want);
ctx.cameraRig.flyTo({ azimuth: s0.azimuth - 0.5, polar: 1.4, distance: s0.distance * 0.8, ms: 0 }); await wait(500);
location.hash = `#at=mars&cam=${key}`;
await wait(6000);
const gotPose = ctx.camPose();
out.cam = { key, got: camValue(gotPose), hashAfter: location.hash, flying: ctx.cameraRig.state.flying }; await log('cam');
location.hash = '#event=apophis.earth-2029';
await wait(7000);
out.apophis = { clock: new Date(ctx.clock.now()).toISOString(), selected: ctx.selected() && ctx.selected().id, mission: (text('.sr-card__mission') || '').slice(0, 360) }; await log('apophis');
out.ms = Date.now() - t0; return out;

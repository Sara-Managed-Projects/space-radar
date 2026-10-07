// Long tail, the phone walk (390 x 844, --mobile, through cdp1.sh with --shot-dir; no
// --reduced-motion: the wind must move). The wind in motion over the globe, the time pill
// stepping by event, a fire's card in the sheet, and photo mode's bar with the lens.
// The wind's request is answered from a copy of what its server sent at 11:25 UTC on 2026-10-07
// (site/data/v1/wind-probe.json, not in the repository): the server did not answer that afternoon.
// Each step leaves its numbers in the server's log, because a run is cut at four minutes.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const realFetch = window.fetch.bind(window);
window.fetch = (u, init) => (String(u).includes('pacioos.hawaii.edu') ? realFetch('./data/v1/wind-probe.json') : realFetch(u, init));
const t0 = Date.now(); while (!(window.__srLayersReady && window.spaceRadar) && Date.now() - t0 < 90000) await wait(300);
const ctx = window.spaceRadar; const out = { tReady: Date.now() - t0, vw: innerWidth, vh: innerHeight };
const text = (sel) => { const n = document.querySelector(sel); return n ? n.innerText.replace(/\s+/g, ' ').trim() : null; };
const box = (sel) => { const n = document.querySelector(sel); if (!n) return null; const r = n.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
const log = (k) => realFetch(`/probe-log?k=phone-${k}&d=${encodeURIComponent(JSON.stringify(out[k])).slice(0, 1800)}&at=${Date.now() - t0}`).catch(() => {});
// 1. the wind, moving
ctx.setOverlay('wind');
const w0 = Date.now();
while (!(ctx.wind && ctx.wind.state().status !== 'loading') && Date.now() - w0 < 20000) await wait(250);
await wait(2500);
const lines = ctx.wind && ctx.wind.lines();
out.wind = ctx.wind ? { status: ctx.wind.state().status, still: ctx.wind.state().still, visible: lines && lines.visible, opacity: lines && +lines.material.opacity.toFixed(2) } : null;
if (lines) { const p = lines.geometry.attributes.position.array; const a = Array.from(p.slice(0, 300)); await wait(1000); out.wind.moved = a.filter((x, i) => Math.abs(x - p[i]) > 1e-7).length; }
await log('wind');
await window.cdpShot('p1-phone-wind');
// 2. the pill, stepping by event
const unit = document.querySelector('.sr-time__unit');
const steps = document.querySelectorAll('.sr-time__step');
if (unit && steps.length === 2) {
  for (let i = 0; i < 4 && unit.textContent !== 'Event'; i += 1) { unit.click(); await wait(120); }
  const row = document.querySelector('.sr-time__row');
  out.pill = { unit: unit.textContent, rowOverflow: row ? row.scrollWidth - row.clientWidth : null, pill: box('.sr-time'), unitBox: box('.sr-time__unit'), marks: document.querySelectorAll('.sr-tape__mark').length };
  await log('pill');
  await window.cdpShot('p2-phone-pill-event');
}
ctx.setOverlay(null);
// 3. a fire's card
const got = new Promise((res) => { const h = (e) => { if (e.detail && e.detail.id === 'earth-events') { window.removeEventListener('sr:layer', h); res(e.detail); } }; window.addEventListener('sr:layer', h); setTimeout(() => res({ timeout: true }), 25000); });
ctx.setLayerOn('earth-events', true);
out.eventsLayer = await got; await log('eventsLayer');
const evs = ctx.records().filter((r) => r.layer === 'earth-events');
const fire = evs.find((r) => r.meta.kind === 'wildfire') || evs[0];
if (fire) { ctx.select(fire, { fly: false }); await wait(2500); out.fireCard = (text('#sr-card') || '').slice(0, 300); await log('fireCard'); await window.cdpShot('p3-phone-fire-card'); ctx.deselect(); await wait(300); }
// 4. photo mode's bar
const P = await import('./js/ui/photomode.js');
const photo = P.openPhotoMode(ctx, { record: ctx.recordById('earth') });
await wait(1500);
out.photo = { bar: box('.sr-photo__bar'), lens: box('.sr-photo__lens'), range: box('.sr-photo__range'), btns: [...document.querySelectorAll('.sr-photo__btn, .sr-photo__seg')].map((b) => { const r = b.getBoundingClientRect(); return `${b.textContent}:${Math.round(r.width)}x${Math.round(r.height)}`; }), frame: box('.sr-photo__frame') };
await log('photo');
await window.cdpShot('p4-phone-photo-bar');
photo.close();
out.ms = Date.now() - t0; return out;

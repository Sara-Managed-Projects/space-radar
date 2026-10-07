// Long tail, phone walk (390 x 844, --mobile --reduced-motion): an Earth event's card in the sheet,
// the wind standing still with its legend on the Earth's card, the time pill stepping by event,
// and photo mode's bar with the lens. Run through cdp1.sh with --shot-dir.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now(); while (!(window.__srLayersReady && window.spaceRadar) && Date.now() - t0 < 60000) await wait(300);
const ctx = window.spaceRadar; const out = { tReady: Date.now() - t0, vw: innerWidth, vh: innerHeight };
const text = (sel) => { const n = document.querySelector(sel); return n ? n.innerText.replace(/\s+/g, ' ').trim() : null; };
const box = (sel) => { const n = document.querySelector(sel); if (!n) return null; const r = n.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
const settle = async (ms = 1500) => { const f0 = Date.now(); await wait(ms); while (ctx.cameraRig.state.flying && Date.now() - f0 < 20000) await wait(300); };
// 1. the pill, stepping by event (before a card hides it)
const unit = document.querySelector('.sr-time__unit');
const steps = document.querySelectorAll('.sr-time__step');
if (unit && steps.length === 2) {
  for (let i = 0; i < 4 && unit.textContent !== 'Event'; i += 1) { unit.click(); await wait(150); }
  steps[1].click(); await wait(1500);
  const row = document.querySelector('.sr-time__row');
  out.pill = { unit: unit.textContent, words: text('.sr-time__words'), rowOverflow: row ? row.scrollWidth - row.clientWidth : null, pill: box('.sr-time'), unitBox: box('.sr-time__unit'), marks: document.querySelectorAll('.sr-tape__mark').length };
  await window.cdpShot('c1-phone-pill-event');
  const live = document.querySelector('.sr-time__live'); if (live && !live.hidden) live.click();
  await wait(600);
}
// 2. an event on the ground
const got = new Promise((res) => { const h = (e) => { if (e.detail && e.detail.id === 'earth-events') { window.removeEventListener('sr:layer', h); res(e.detail); } }; window.addEventListener('sr:layer', h); setTimeout(() => res({ timeout: true }), 30000); });
ctx.setLayerOn('earth-events', true);
out.eventsLayer = await got;
const evs = ctx.records().filter((r) => r.layer === 'earth-events');
const fire = evs.find((r) => r.meta.kind === 'wildfire') || evs[0];
if (fire) { ctx.select(fire, { fly: true }); await settle(3000); await wait(2500); out.fireCard = (text('#sr-card') || '').slice(0, 420); await window.cdpShot('c2-phone-fire-card'); }
// 3. the wind, standing still, and the Earth's card
ctx.setOverlay('wind');
const w0 = Date.now();
while (!(ctx.wind && ctx.wind.state().status !== 'loading') && Date.now() - w0 < 40000) await wait(400);
ctx.select(ctx.recordById('earth'), { fly: true }); await settle(3000); await wait(3000);
out.wind = ctx.wind ? { status: ctx.wind.state().status, still: ctx.wind.state().still, visible: ctx.wind.lines() && ctx.wind.lines().visible } : null;
out.earthLegend = text('.sr-card__overlay'); out.legendBox = box('.sr-card__overlay');
await window.cdpShot('c3-phone-wind-earth');
// 4. photo mode's bar
const P = await import('./js/ui/photomode.js');
const photo = P.openPhotoMode(ctx, { record: ctx.recordById('earth') });
await wait(2500);
out.photo = { bar: box('.sr-photo__bar'), lens: box('.sr-photo__lens'), range: box('.sr-photo__range'), png: [...document.querySelectorAll('.sr-photo__btn')].map((b) => { const r = b.getBoundingClientRect(); return `${b.textContent}:${Math.round(r.width)}x${Math.round(r.height)}`; }), frame: box('.sr-photo__frame') };
await window.cdpShot('c4-phone-photo-bar');
photo.close();
out.ms = Date.now() - t0; return out;

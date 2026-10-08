// Cards and live facts, the desktop walk (1440 x 900 through cdp1.sh with --shot-dir and --gl=gpu).
// Internal #133 to #136, #295, #296, #298, #299, #127. Needs the saved copies under site/data/v1
// (the three ll2-* files among them); CelesTrak and Launch Library are blocked.
// Each step also leaves its numbers in the server's log (GET /probe-log?...): a run is cut at 4 min.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now(); while (!(window.__srLayersReady && window.spaceRadar) && Date.now() - t0 < 90000) await wait(300);
const ctx = window.spaceRadar; const out = { tReady: Date.now() - t0 };
const text = (sel) => { const n = document.querySelector(sel); return n ? n.innerText.replace(/\s+/g, ' ').trim() : null; };
const log = (k) => fetch(`/probe-log?k=${k}&d=${encodeURIComponent(JSON.stringify(out[k])).slice(0, 1800)}&at=${Date.now() - t0}`).catch(() => {});
const open = async (id) => { const h = document.querySelector(`#sr-disc-${id}`); if (h && h.getAttribute('aria-expanded') !== 'true') { h.click(); await wait(300); } return !!h; };
const shut = async (id) => { const h = document.querySelector(`#sr-disc-${id}`); if (h && h.getAttribute('aria-expanded') === 'true') { h.click(); await wait(150); } };
const show = (sel) => { const n = document.querySelector(sel); if (n) n.scrollIntoView({ block: 'center' }); return !!n; };
const pick = async (id) => { const r = ctx.recordById(id); if (!r) return null; if (r.layer && !ctx.isLayerOn(r.layer)) ctx.setLayerOn(r.layer, true); ctx.select(r, { fly: false }); await wait(2200); return r; };
const R = Math.PI / 180;
ctx.setObserver({ latDeg: 51.5, lonDeg: -0.1, latRad: 51.5 * R, lonRad: -0.1 * R, altKm: 0, name: 'London', source: 'city' });

// 1. the station: who is aboard, what is docked, the link out
if (await pick('sat-25544')) {
  await open('aboard'); const w0 = Date.now();
  while (!document.querySelector('.sr-crew__people, .sr-crew__docked') && Date.now() - w0 < 15000) await wait(300);
  out.iss = { ms: Date.now() - w0, hint: text('#sr-disc-aboard .sr-disc__hint'), aboard: text('#sr-disc-aboard-panel') };
  show('.sr-crew'); await wait(300); await window.cdpShot('1-iss-aboard');
  await shut('aboard'); await open('about');
  out.iss.links = [...document.querySelectorAll('.sr-card__out')].map((a) => ({ t: a.textContent, h: a.href, target: a.target, rel: a.rel }));
  show('.sr-card__out'); await wait(300); await window.cdpShot('2-iss-link');
  await shut('about'); await open('path'); out.iss.launched = text('.sr-card__fact--launched'); await shut('path');
  await log('iss');
}
// 2. a planet: the distance ticks; rises and sets
if (await pick('mars')) {
  await open('about'); show('.sr-live'); await wait(400);
  const a = text('.sr-live'); await window.cdpShot('3-mars-live-a'); await wait(3100); const b = text('.sr-live');
  out.mars = { a, b, changed: a !== b, hero: text('.sr-card__body').slice(0, 120) };
  await window.cdpShot('3-mars-live-b');
  await shut('about'); await log('mars');
}
// 3. an asteroid: the six-year curve, the closest approach, rises and sets
if (await pick('asteroid-99942')) {
  await open('see'); out.apophis = { see: text('.sr-card__seeline') }; await shut('see');
  await open('path');
  const svg = document.querySelector('.sr-spark__svg');
  out.apophis.spark = text('.sr-spark'); out.apophis.aria = svg ? svg.getAttribute('aria-label') : null;
  out.apophis.box = svg ? [Math.round(svg.getBoundingClientRect().width), Math.round(svg.getBoundingClientRect().height)] : null;
  show('.sr-spark'); await wait(300); await window.cdpShot('4-apophis-curve');
  const go = document.querySelector('.sr-spark__go');
  if (go) { go.click(); await wait(2500); }
  await open('about');
  out.apophis.after = { clock: new Date(ctx.clock.now()).toISOString(), live: text('.sr-live'), foot: text('.sr-card__foot'), spark: text('.sr-spark') };
  show('.sr-spark'); await wait(300); await window.cdpShot('5-apophis-at-closest');
  const live = document.querySelector('.sr-time__live'); if (live && !live.hidden) { live.click(); await wait(800); }
  await log('apophis');
}
// 3b. a near-Earth rock from the feed, on its ellipse: the caveat on its closest approach
{
  const neo = (ctx.recordsFor('asteroids') || []).find((r) => r.propagator === 'kepler' && r.meta && Number.isFinite(r.meta.approachMs || r.meta.closeApproachMs || NaN)) || (ctx.recordsFor('asteroids') || []).find((r) => !/^asteroid-(99942|101955|433|162173|4|65803|25143|2|3200)$/.test(r.id));
  if (neo) {
    ctx.select(neo, { fly: false }); await wait(2000); await open('path');
    out.neo = { id: neo.id, name: neo.name, spark: text('.sr-spark'), foot: text('.sr-card__foot') };
    show('.sr-spark'); await wait(300); await window.cdpShot('6-neo-curve'); await log('neo');
  }
}
// 4. the catalogue: the oldest things up, then "Up for N years" on a satellite's card
ctx.deselect(); await wait(500);
{
  const b = document.querySelector('[aria-controls="sr-debris"]');
  if (b) {
    b.click(); const w0 = Date.now();
    while (!document.querySelector('.sr-debris__oldest, .sr-debris__state') && Date.now() - w0 < 5000) await wait(200);
    while (!document.querySelector('.sr-debris__oldest') && Date.now() - w0 < 60000) await wait(400);
    out.oldest = { ms: Date.now() - w0, list: text('.sr-debris__oldest'), state: text('.sr-debris__state') };
    show('.sr-debris__oldest'); await wait(300); await window.cdpShot('7-up-the-longest'); await log('oldest');
  }
  if (await pick('sat-20580') || await pick('sat-25544')) {
    await open('path'); out.upFor = { name: text('.sr-card__name'), launched: text('.sr-card__fact--launched') };
    show('.sr-card__fact--launched'); await wait(300); await window.cdpShot('8-up-for-years'); await log('upFor');
  }
}
// 5. Just happened
ctx.deselect(); await wait(500);
{
  const b = document.querySelector('.sr-next__past');
  if (b) {
    b.click(); const w0 = Date.now();
    while (!document.querySelector('.sr-next__pastbox .sr-next__row') && Date.now() - w0 < 12000) await wait(300);
    out.just = { ms: Date.now() - w0, box: text('.sr-next__pastbox') };
    show('.sr-next__pastbox'); await wait(300); await window.cdpShot('9-just-happened'); await log('just');
  }
}
out.hosts = [...new Set(performance.getEntriesByType('resource').map((e) => { try { return new URL(e.name).host; } catch { return '?'; } }))];
out.errors = window.__srErrors || null;
return out;

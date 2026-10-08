// Cards and live facts, the phone walk (390 x 844, --mobile, through cdp1.sh with --shot-dir and
// --gl=gpu). Opened on a place link (`#p=48.9,2.3`): internal #137. Then the station's crew, a
// planet's ticking distance, an asteroid's curve, and "Just happened", each in the sheet.
// NOT YET SEEN TO THE END (2026-10-08). Three runs stopped at the same place: after the ISS is
// picked and the sheet raised (`iss-up` is the last step logged), before the first shot is asked
// for. The page's timers stop answering there. The two things between are the press on "Who is
// aboard" and `show()` (scrollIntoView inside the sheet at full height); the desktop walk does both
// in the sidebar and runs to the end. Whoever runs this next: drop `show()` first, then `up()`,
// and read the step log (GET /probe-log?step=...) in the server's output to see which it was.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now(); while (!(window.__srLayersReady && window.spaceRadar) && Date.now() - t0 < 240000) await wait(300);
const ctx = window.spaceRadar; const out = { tReady: Date.now() - t0, vw: innerWidth };
const text = (sel) => { const n = document.querySelector(sel); return n ? n.innerText.replace(/\s+/g, ' ').trim() : null; };
const log = (k) => fetch(`/probe-log?k=${k}&d=${encodeURIComponent(JSON.stringify(out[k])).slice(0, 1800)}&at=${Date.now() - t0}`).catch(() => {});
const open = async (id) => { const h = document.querySelector(`#sr-disc-${id}`); if (h && h.getAttribute('aria-expanded') !== 'true') { h.click(); await wait(300); } return !!h; };
const shut = async (id) => { const h = document.querySelector(`#sr-disc-${id}`); if (h && h.getAttribute('aria-expanded') === 'true') { h.click(); await wait(150); } };
const show = (sel) => { const n = document.querySelector(sel); if (n) n.scrollIntoView({ block: 'center' }); return !!n; };
const pick = async (id) => { const r = ctx.recordById(id); if (!r) return null; if (r.layer && !ctx.isLayerOn(r.layer)) ctx.setLayerOn(r.layer, true); ctx.select(r, { fly: false }); await wait(2200); return r; };
const up = async () => { const h = document.querySelector('.sr-sheet__handle, [class*="sheet"][class*="handle"]'); out.handle = h ? h.className : null; if (h) for (let i = 0; i < 2; i += 1) { h.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); await wait(350); } };
const wide = () => document.documentElement.scrollWidth > innerWidth + 1;

// A SHOT NEEDS A FRAME. With the sheet at full height the scene behind it is still, and a capture
// that waits for the next frame waited for ever (two runs lost to it on 2026-10-08, each stopping
// at the first shot after the sheet went up). A one-pixel mark that changes ten times a second
// keeps frames coming; it is in the probe, not in the app.
const mark = document.createElement('div');
mark.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;z-index:99999;background:#000';
document.body.appendChild(mark);
let flip = 0; setInterval(() => { flip ^= 1; mark.style.background = flip ? '#010101' : '#000'; }, 100);
const shot = async (name) => { await step(`shot-${name}`); await Promise.race([window.cdpShot(name), wait(25000)]); await step(`shot-done-${name}`); };
const step = (k) => fetch(`/probe-log?step=${k}&at=${Date.now() - t0}`).catch(() => {});
out.boot = ctx.observer ? { lat: ctx.observer.latDeg, lon: ctx.observer.lonDeg, source: ctx.observer.source, keys: Object.keys(ctx.observer).sort().join() } : null;
// 1. the station
await step('start');
if (await pick('sat-25544')) {
  await step('iss-picked'); await up(); await step('iss-up'); await open('aboard'); const w0 = Date.now();
  while (!document.querySelector('.sr-crew__people, .sr-crew__docked') && Date.now() - w0 < 15000) await wait(300);
  out.iss = { hint: text('#sr-disc-aboard .sr-disc__hint'), rows: document.querySelectorAll('.sr-crew dt').length, wide: wide() };
  const dd = [...document.querySelectorAll('.sr-crew__docked dd')].map((n) => Math.round(n.getBoundingClientRect().height));
  out.iss.dockedRowHeights = dd;
  show('.sr-crew__docked'); await wait(300); await shot('p2-iss-crew'); await shut('aboard'); await log('iss');
}
// 2. a planet's distance, ticking
if (await pick('jupiter')) {
  await open('about'); show('.sr-live'); await wait(400);
  const a = text('.sr-live'); await wait(2200); const b = text('.sr-live');
  const num = document.querySelector('.sr-live__num');
  out.jupiter = { a, b, changed: a !== b, font: num ? getComputedStyle(num).fontFamily.slice(0, 40) : null, tnum: num ? getComputedStyle(num).fontVariantNumeric : null, wide: wide(), see: null };
  await shot('p3-jupiter-live'); await shut('about');
  await open('see'); out.jupiter.see = text('.sr-card__seeline'); await shut('see'); await log('jupiter');
}
// 3. an asteroid's curve
if (await pick('asteroid-99942')) {
  await open('path');
  const go = document.querySelector('.sr-spark__go');
  out.apophis = { spark: text('.sr-spark'), goHeight: go ? Math.round(go.getBoundingClientRect().height) : null, wide: wide() };
  show('.sr-spark'); await wait(300); await shot('p4-apophis-curve'); await log('apophis');
}
// 4. Just happened
ctx.deselect(); await wait(500);
{
  const b = document.querySelector('.sr-next__past');
  if (b) {
    b.click(); const w0 = Date.now();
    while (!document.querySelector('.sr-next__pastbox .sr-next__row') && Date.now() - w0 < 12000) await wait(300);
    out.just = { box: text('.sr-next__pastbox'), wide: wide() };
    show('.sr-next__pastbox'); await wait(300); await shot('p5-just-happened'); await log('just');
  }
}
// 5. the place a link carried, and keeping it (the Tonight tab's place panel)
out.place = { boot: ctx.observer ? { lat: ctx.observer.latDeg, lon: ctx.observer.lonDeg, source: ctx.observer.source, keys: Object.keys(ctx.observer).sort().join() } : null, hash: location.hash };
if (ctx.explore && ctx.explore.setTab) { ctx.explore.setTab('tonight'); await wait(1500); }
const w1 = Date.now(); while (!document.querySelector('.sr-place__chips') && Date.now() - w1 < 8000) await wait(300);
await step('place-panel');
out.place.line = text('.sr-tonight-view__place');
const chip = (re) => [...document.querySelectorAll('.sr-place__chips button')].find((b) => re.test(b.textContent));
out.place.chips = [...document.querySelectorAll('.sr-place__chips button')].filter((b) => !b.hidden).map((b) => b.textContent);
const keep = chip(/Remember/); if (keep) { keep.click(); await wait(200); }
out.place.kept = localStorage.getItem('sr.place'); out.place.note = text('.sr-place__note'); out.place.after = chip(/Forget|Remember/) ? chip(/Forget|Remember/).textContent : null;
show('.sr-place__chips'); await wait(300); await shot('p1-place-shared-kept');
const forget = chip(/Forget/); if (forget) { forget.click(); await wait(150); } out.place.forgotten = localStorage.getItem('sr.place');
out.place.wide = wide(); await log('place');

return out;

// The polish sweep's phone walk (390 x 844, --mobile --gl=gpu, through cdp1.sh with --shot-dir).
// 1. internal #456: the ISS card's sheet raised, "Who is aboard" pressed and scrolled to: the step
//    three runs of tests/probes/cards2-phone.js stopped at, before #500 fixed scene/viewshift.js.
// 2. internal #455: the Tonight view's place line, "Change place", the city box and the chips.
// 3. internal #454: the Trips section's two quiet buttons and Just watch, with the sheet open.
// 4. internal #421: the ISS at the card's own height, with the uncovered band and its reticle.
// Each step is also sent to /probe-log, so a run cut at its cap still leaves what it read.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
// A run cut before the app is ready used to leave nothing: errors and a heartbeat go to the log.
window.addEventListener('error', (e) => fetch(`/probe-log?err=${encodeURIComponent(String(e.message).slice(0, 300))}`).catch(() => {}));
window.addEventListener('unhandledrejection', (e) => fetch(`/probe-log?rej=${encodeURIComponent(String(e.reason && e.reason.message || e.reason).slice(0, 300))}`).catch(() => {}));
fetch(`/probe-log?step=probe-in&doc=${document.readyState}`).catch(() => {});
const beat = setInterval(() => fetch(`/probe-log?beat=${Date.now() - t0}&ctx=${!!window.spaceRadar}&ready=${!!window.__srLayersReady}&boot=${encodeURIComponent(((document.querySelector('#boot-line') || {}).textContent || '').slice(0, 80))}`).catch(() => {}), 15000);
while (!(window.__srLayersReady && window.spaceRadar) && Date.now() - t0 < 420000) await wait(300);
clearInterval(beat);
const ctx = window.spaceRadar; const out = { tReady: Date.now() - t0, vw: innerWidth, vh: innerHeight };
const text = (sel) => { const n = document.querySelector(sel); return n ? n.innerText.replace(/\s+/g, ' ').trim() : null; };
const log = (k) => fetch(`/probe-log?k=${k}&at=${Date.now() - t0}&d=${encodeURIComponent(JSON.stringify(out[k])).slice(0, 3000)}`).catch(() => {});
const step = (k) => fetch(`/probe-log?step=${k}&at=${Date.now() - t0}`).catch(() => {});
const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
const wide = () => document.documentElement.scrollWidth > innerWidth + 1;
const show = (sel) => { const n = typeof sel === 'string' ? document.querySelector(sel) : sel; if (n) n.scrollIntoView({ block: 'center' }); return !!n; };
// A shot needs a frame: a one-pixel mark that changes keeps frames coming under a full sheet.
const mark = document.createElement('div');
mark.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;z-index:99999;background:#000';
document.body.appendChild(mark);
let flip = 0; setInterval(() => { flip ^= 1; mark.style.background = flip ? '#010101' : '#000'; }, 100);
const shot = async (name) => { await step(`shot-${name}`); await Promise.race([window.cdpShot(name), wait(25000)]); await step(`shot-done-${name}`); };
const handle = () => document.querySelector('.sr-sheet__handle');
const up = async (n = 2) => { const h = handle(); if (h) for (let i = 0; i < n; i += 1) { h.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); await wait(350); } };
const band = () => (ctx.viewShift && ctx.viewShift.bandHeightPx ? ctx.viewShift.bandHeightPx() : null);
await step('start');

// 1. #456
{
  const r = ctx.recordById('sat-25544');
  out.iss = { found: !!r };
  if (r) {
    ctx.select(r, { fly: false }); await wait(2200); await step('iss-picked');
    out.iss.bandCard = band();
    { const rb = document.querySelector('#sr-hud .sr-reticle__box'); out.iss.reticle = box(rb); out.iss.top = box(document.querySelector('#sr-top')); out.iss.card = box(document.querySelector('#sr-card')); }
    await log('iss'); await shot('ph0-iss-in-band');
    await up(); await step('iss-up');
    const t1 = performance.now(); await wait(200); out.iss.timerAfterUpMs = Math.round(performance.now() - t1);
    const h = document.querySelector('#sr-disc-aboard'); if (h && h.getAttribute('aria-expanded') !== 'true') h.click();
    await step('aboard-pressed');
    const w0 = Date.now(); while (!document.querySelector('.sr-crew__people, .sr-crew__docked') && Date.now() - w0 < 12000) await wait(300);
    out.iss.crewRows = document.querySelectorAll('.sr-crew dt').length;
    out.iss.hint = text('#sr-disc-aboard .sr-disc__hint');
    show('.sr-crew__docked') || show('#sr-disc-aboard'); await wait(300); await step('scrolled');
    const t2 = performance.now(); await wait(200); out.iss.timerAfterScrollMs = Math.round(performance.now() - t2);
    out.iss.wide = wide(); out.iss.bandFull = band();
    await log('iss'); await shot('ph1-iss-aboard');
  }
  ctx.deselect(); await wait(600);
}

// 2. #455
{
  if (ctx.explore && ctx.explore.setTab) ctx.explore.setTab('tonight');
  const w0 = Date.now(); while (!document.querySelector('.sr-tonight-view__change') && Date.now() - w0 < 15000) await wait(300);
  await up(2); await wait(400); // the sheet at full height: the view is under the fold at peek
  const change = document.querySelector('.sr-tonight-view__change');
  const ctl = document.querySelector('#sr-tonight-place');
  const chips = () => [...document.querySelectorAll('.sr-place__chips button')].filter((b) => !b.hidden && b.offsetParent !== null).map((b) => ({ t: b.textContent, ...box(b) }));
  const input = document.querySelector('.sr-place__input');
  out.place = {
    built: !!change, line0: text('.sr-tonight-view__place'), source0: ctx.observer ? ctx.observer.source : null,
    expanded0: change ? change.getAttribute('aria-expanded') : null, open0: ctl ? !ctl.hidden : null,
    change: box(change), input: box(input), inputFont: input ? getComputedStyle(input).fontSize : null, lineBox: box(document.querySelector('.sr-tonight-view__place')), chips0: chips(),
    oldPanel: document.querySelectorAll('.sr-place__current, .sr-tonight__list, section.sr-place').length,
  };
  show(change); await wait(300); await log('place'); await shot('ph2-tonight-place-guess');
  if (input) {
    input.value = 'London'; input.dispatchEvent(new Event('change', { bubbles: true })); await wait(1200);
    out.place2 = { line: text('.sr-tonight-view__place'), source: ctx.observer ? ctx.observer.source : null, lat: ctx.observer ? ctx.observer.latDeg : null, expanded: change.getAttribute('aria-expanded'), chips: chips() };
    const keep = [...document.querySelectorAll('.sr-place__chips button')].find((b) => /Remember/.test(b.textContent));
    if (keep) { keep.click(); await wait(250); }
    out.place2.kept = localStorage.getItem('sr.place'); out.place2.note = text('.sr-place__note');
    out.place2.keepNow = ([...document.querySelectorAll('.sr-place__chips button')].find((b) => /Forget|Remember/.test(b.textContent)) || {}).textContent;
    out.place2.wide = wide();
    show(change); await wait(300); await log('place2'); await shot('ph3-tonight-place-london');
    const forget = [...document.querySelectorAll('.sr-place__chips button')].find((b) => /Forget/.test(b.textContent)); if (forget) forget.click();
    // closed by a press: the row alone
    change.click(); await wait(250);
    out.place2.closed = { expanded: change.getAttribute('aria-expanded'), hidden: ctl.hidden, ctlH: box(ctl).h };
    await log('place2');
  }
}

// 3. #454
{
  if (ctx.explore && ctx.explore.setTab) ctx.explore.setTab('earth');
  await wait(1200);
  const sect = [...document.querySelectorAll('.sr-trips2')].find((s) => s.offsetParent !== null);
  const btns = sect ? [...sect.querySelectorAll(':scope > .sr-more')].filter((b) => !b.hidden) : [];
  out.trips = { buttons: btns.map((b) => ({ t: b.textContent, ...box(b) })) };
  if (btns.length === 2) { const a = btns[0].getBoundingClientRect(); const b = btns[1].getBoundingClientRect(); out.trips.gapPx = Math.round(a.top === b.top || Math.abs(a.top - b.top) < 8 ? b.left - a.right : b.top - a.bottom); out.trips.sameRow = Math.abs(a.top - b.top) < 8; }
  const own = btns.find((b) => b.getAttribute('aria-controls'));
  if (own) {
    own.click(); const w0 = Date.now();
    while (!sect.querySelector('.sr-reels li') && Date.now() - w0 < 12000) await wait(300);
    out.trips.reels = [...sect.querySelectorAll('.sr-reels li button, .sr-reels li a')].map((b) => ({ t: b.innerText.replace(/\s+/g, ' ').trim().slice(0, 50), ...box(b) }));
    out.trips.wide = wide();
    show(own); await wait(400); await log('trips'); await shot('ph4-trips-just-watch');
  } else await log('trips');
}

out.wide = wide();
return out;

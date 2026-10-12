// The polish sweep's desktop walk (1440 x 900, --gl=gpu, through cdp1.sh with --shot-dir).
// In order of what matters most, so a run cut at its cap has the first things:
//   1. internal #455: the Tonight view's place line and "Change place"; a city typed; kept; closed.
//   2. internal #408: with a place, sunrise and sunset as marks on the timeline.
//   3. internal #454: the gap between the Trips section's two quiet buttons; how long a trip that
//      requires a bundled layer takes from start() to its intro (it was 8 to 9 s).
//   4. internal #126: the HUD screen on Shift+H, the clear screen on h, the eye's fade, the hint.
//   5. internal #386: an Earth data map on the globe with no card and no panel: its key in the sidebar.
//   6. internal #202: the share sheet with the ISS selected, final layout.
//   7. internal #398, #173: the sources sheet's footer and its rows.
// Each block is also sent to /probe-log.
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
const vis = (sel) => { const n = document.querySelector(sel); return n ? getComputedStyle(n).visibility : null; };
const show = (n) => { if (n) n.scrollIntoView({ block: 'center' }); return !!n; };
const shot = async (name) => { await step(`shot-${name}`); await Promise.race([window.cdpShot(name), wait(25000)]); await step(`shot-done-${name}`); };
const key = (k, extra = {}) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...extra }));
await step('start');
out.bandHome = ctx.viewShift.bandHeightPx();

// 1. the place
{
  ctx.explore.setTab('tonight');
  const w0 = Date.now(); while (!document.querySelector('.sr-tonight-view__change') && Date.now() - w0 < 15000) await wait(300);
  const change = document.querySelector('.sr-tonight-view__change');
  const ctl = document.querySelector('#sr-tonight-place');
  const input = document.querySelector('.sr-place__input');
  const chips = () => [...document.querySelectorAll('.sr-place__chips button')].filter((b) => !b.hidden && b.offsetParent !== null).map((b) => ({ t: b.textContent, ...box(b) }));
  out.place = {
    built: !!change, line0: text('.sr-tonight-view__place'), source0: ctx.observer ? ctx.observer.source : null,
    expanded0: change ? change.getAttribute('aria-expanded') : null, open0: ctl ? !ctl.hidden : null, row: box(document.querySelector('.sr-tonight-view__where')),
    change: box(change), input: box(input), chips0: chips(), oldPanel: document.querySelectorAll('.sr-place__current, .sr-tonight__list, section.sr-place').length,
  };
  await log('place'); await shot('d1-tonight-place-guess');
  if (input) {
    input.value = 'London'; input.dispatchEvent(new Event('change', { bubbles: true })); await wait(1500);
    out.place2 = { line: text('.sr-tonight-view__place'), source: ctx.observer && ctx.observer.source, lat: ctx.observer && ctx.observer.latDeg, expanded: change.getAttribute('aria-expanded'), chips: chips() };
    const btn = (re) => [...document.querySelectorAll('.sr-place__chips button')].find((b) => re.test(b.textContent));
    if (btn(/Remember/)) { btn(/Remember/).click(); await wait(250); }
    out.place2.kept = localStorage.getItem('sr.place'); out.place2.note = text('.sr-place__note'); out.place2.keepNow = (btn(/Forget|Remember/) || {}).textContent;
    await log('place2'); await shot('d2-tonight-place-london');
    if (btn(/Forget/)) btn(/Forget/).click();
    change.click(); await wait(250);
    out.place2.closed = { expanded: change.getAttribute('aria-expanded'), hidden: ctl.hidden, h: box(ctl).h };
    // 2. the Sun's marks, now that there is a place
    await wait(2500);
    const marks = [...document.querySelectorAll('.sr-tape__mark')];
    out.marks = { all: marks.length, kinds: marks.map((m) => m.dataset.kind).join(','), sun: marks.filter((m) => m.dataset.kind === 'sun').map((m) => m.title || m.getAttribute('aria-label')).slice(0, 4) };
    await log('place2'); await log('marks'); await shot('d3-tonight-closed-and-tape');
  }
}

// 3. the Trips section, and a trip's start
{
  ctx.explore.setTab('earth'); await wait(1000);
  const sect = [...document.querySelectorAll('.sr-trips2')].find((s) => s.offsetParent !== null);
  const btns = sect ? [...sect.querySelectorAll(':scope > .sr-more')].filter((b) => !b.hidden) : [];
  out.trips = { buttons: btns.map((b) => ({ t: b.textContent, ...box(b) })) };
  if (btns.length === 2) { const a = btns[0].getBoundingClientRect(); const b = btns[1].getBoundingClientRect(); out.trips.sameRow = Math.abs(a.top - b.top) < 8; out.trips.gapPx = Math.round(out.trips.sameRow ? b.left - a.right : b.top - a.bottom); }
  show(btns[0]); await wait(300); await log('trips'); await shot('d4-trips-buttons');
  // The trip machine and its 128 kB of stops are fetched on the first call: that wait is the
  // network's, measured apart, so the two numbers below are the layer wait and nothing else.
  { const tw = performance.now(); try { await ctx.trip.plan('a-year-in-a-minute'); } catch { /* measured below anyway */ } out.trips.warmMs = Math.round(performance.now() - tw); out.trips.laterLoaded = typeof ctx.laterLayersLoaded === 'function' ? ctx.laterLayersLoaded() : null; }
  for (const id of ['strangest-things', 'moon-landings']) {
    const t1 = performance.now();
    let started = null;
    try { started = ctx.trip.start(id); } catch (e) { out.trips[id] = { error: String(e) }; continue; }
    const w0 = Date.now();
    while (!(ctx.trip.state && ctx.trip.state.tourId === id && ctx.trip.state.phase && ctx.trip.state.phase !== 'idle' && ctx.trip.state.phase !== 'resolving') && Date.now() - w0 < 20000) await wait(50);
    out.trips[id] = { toIntroMs: Math.round(performance.now() - t1), phase: ctx.trip.state && ctx.trip.state.phase, stops: ctx.trip.state && ctx.trip.state.count };
    try { await started; } catch { /* the wait above is the measure */ }
    try { ctx.trip.stop('probe'); } catch { /* not started */ }
    await wait(1500);
  }
  await log('trips');
}

// 4. the three screens
{
  key('H', { shiftKey: true }); await wait(400);
  const eye = document.querySelector('.sr-rail__btn--clean');
  out.hud = { cls: document.documentElement.className.split(' ').filter((c) => /^sr-(hud|clean)$/.test(c)).join(' '), side: vis('#sr-side'), rail: vis('#sr-rail'), labels: vis('#labels'), time: vis('#sr-time'), hudBox: vis('#sr-hud'), eye: vis('.sr-rail__btn--clean'), eyeOpacity: eye ? getComputedStyle(eye).opacity : null, toast: text('.sr-toast'), state: ctx.cleanView.state() };
  await log('hud'); await shot('d5-hud-screen');
  await wait(3400);
  out.hud.idle = eye ? eye.classList.contains('is-idle') : null;
  key('h'); await wait(400);
  out.clear = { cls: document.documentElement.className.split(' ').filter((c) => /^sr-(hud|clean)$/.test(c)).join(' '), labels: vis('#labels'), time: vis('#sr-time'), state: ctx.cleanView.state() };
  key('h'); await wait(300); out.clear.backTo = ctx.cleanView.state();
  key('Escape'); await wait(300); out.clear.afterEscape = ctx.cleanView.state(); out.clear.side = vis('#sr-side');
  await log('hud'); await log('clear');
}

// 5. a map over the Earth, nothing open
{
  ctx.setOverlay('sea-temperature');
  const w0 = Date.now();
  while (!(document.querySelector('.sr-overlaykey') && !document.querySelector('.sr-overlaykey').hidden && (ctx.overlayState() || {}).status === 'shown') && Date.now() - w0 < 25000) await wait(400);
  const k = document.querySelector('.sr-overlaykey');
  out.overlay = { status: (ctx.overlayState() || {}).status, key: !!k, hidden: k ? k.hidden : null, box: box(k), words: text('.sr-overlaykey__line'), legend: text('.sr-overlaykey .sr-legend'), cardOpen: !!(document.querySelector('#sr-card') && document.querySelector('#sr-card').classList.contains('is-open')), waitedMs: Date.now() - w0 };
  show(k); await wait(600); await log('overlay'); await shot('d6-overlay-key');
  const off = k ? k.querySelector('.sr-more') : null; if (off) off.click(); await wait(500);
  out.overlay.afterOff = { state: (ctx.overlayState() || {}).status, hidden: k ? k.hidden : null };
  await log('overlay');
}

// 6. the share sheet with the ISS
{
  const r = ctx.recordById('sat-25544');
  if (r) {
    ctx.select(r, { fly: false }); await wait(2500);
    out.bandCard = ctx.viewShift.bandHeightPx();
    const b = document.querySelector('.sr-rail__btn--share'); if (b) b.click();
    const w0 = Date.now(); while (!document.querySelector('#sr-share') && Date.now() - w0 < 15000) await wait(300);
    await wait(2500);
    const s = document.querySelector('#sr-share');
    out.share = { open: !!s, box: box(s), scrollH: s ? s.scrollHeight : null, clientH: s ? s.clientHeight : null, photoShare: !!document.querySelector('.sr-photo__share') };
    await log('share'); await shot('d7-share-iss');
    key('Escape'); await wait(400); ctx.deselect(); await wait(400);
  }
}

// 7. the sources sheet
{
  const line = document.querySelector('.sr-statusline, .sr-side__status button, [class*="statusline"]');
  if (line) line.click(); else location.hash = '#sources';
  const w0 = Date.now(); while (!document.querySelector('.sr-status__press') && Date.now() - w0 < 12000) await wait(300);
  const p = document.querySelector('.sr-status__press');
  out.sources = { press: p ? { t: p.textContent, href: p.getAttribute('href'), ...box(p) } : null, rows: document.querySelectorAll('.sr-source').length, checking: [...document.querySelectorAll('.sr-source__age')].filter((n) => /checking/.test(n.textContent)).length, firstAges: [...document.querySelectorAll('.sr-source__age')].slice(0, 3).map((n) => n.textContent) };
  show(p); await wait(500); await log('sources'); await shot('d8-sources-foot');
}
return out;

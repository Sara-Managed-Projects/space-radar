// tests/probes/bulk3-a-trips.js -- the looks of internal #546 "Trips first press" (bulk 3, a).
// For tools/cdp.mjs with --reduced-motion --gl=gpu, 1440 x 900, the app as the page itself (`/?sw=0`):
//   1. a trip under reduced motion: every flight is a CUT (the camera stands where the stop wants it
//      the moment the stop begins; `rig.state.flying` is never true while a stop plays), the card
//      never fades;
//   2. the volume: the trip toolbar's slider and What to show's slider move together, both ways.
return (async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (fn, ms, step = 100) => {
    const t = Date.now();
    while (Date.now() - t < ms) { try { const v = await fn(); if (v) return v; } catch { /* not yet */ } await sleep(step); }
    return null;
  };
  const out = { reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches, errors: [] };
  window.addEventListener('error', (e) => out.errors.push(String(e.message).slice(0, 160)));
  await until(() => window.__srLayersReady && window.spaceRadar, 90000, 300);
  const ctx = window.spaceRadar;
  if (!ctx) return { ...out, error: 'the app never came up' };
  const shot = async (name, settle = 600) => { await sleep(settle); if (window.cdpShot) await window.cdpShot(name); };
  try { ctx.audio.enable(); } catch (e) { out.errors.push('audio: ' + e.message); }
  out.soundOn = ctx.audio.isOn();

  // ---- 1. reduced motion: a trip of cuts
  const id = 'moon-landings';
  const plan = await ctx.trip.start(id);
  if (!plan || plan.offerable === false) return { ...out, error: 'no plan: ' + (plan && plan.reason) };
  await until(() => ctx.trip.state.phase === 'intro', 20000);
  out.count = plan.count;
  const pos = () => { const p = ctx.camera.position; return [p.x, p.y, p.z]; };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  ctx.trip.play();
  const stops = [];
  for (let n = 0; n < Math.min(4, plan.count); n++) {
    if (n > 0) ctx.trip.jumpTo(n);
    // Sample the rig and the camera for the first 1.5 s of the stop: a flight shows as `flying` or as many small steps.
    const t0 = Date.now();
    const samples = [];
    while (Date.now() - t0 < 1500) { samples.push({ flying: !!ctx.cameraRig.state.flying, p: pos(), phase: ctx.trip.state.phase, idx: ctx.trip.state.index }); await sleep(40); }
    const flying = samples.filter((s) => s.flying).length;
    // The camera's steps between samples once the stop has begun: a cut is at most one.
    let moves = 0; let big = 0;
    for (let i = 1; i < samples.length; i++) { const d = dist(samples[i].p, samples[i - 1].p); if (d > 1e-6) moves += 1; big = Math.max(big, d); }
    stops.push({ n: n + 1, stopId: ctx.trip.state.stopId, flyingSamples: flying, of: samples.length, cameraMoves: moves, biggestStepScene: Number(big.toPrecision(3)), phase: ctx.trip.state.phase });
    if (n === 1) await shot('reduced-stop-2', 200);
  }
  out.stops = stops;
  out.reducedAtTrip = ctx.trip.state.reducedMotion;

  // ---- 2. the two volume sliders
  const doc = document;
  const tb = () => doc.querySelector('.sr-trip__vol');
  out.toolbarSlider = !!tb();
  const panelBtn = doc.querySelector('.sr-rail__btn--show, [aria-label*="What to show"]');
  // The panel's slider is built with What to show's section; ask for it by class without opening anything.
  const panelSlider = () => doc.querySelector('.sr-show__vol');
  out.panelSliderBuilt = !!panelSlider();
  const setRange = (el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); };
  const readBoth = () => ({ engine: Math.round(ctx.audio.volume() * 100), toolbar: tb() ? Number(tb().value) : null, panel: panelSlider() ? Number(panelSlider().value) : null });
  const vol = [];
  if (tb()) {
    setRange(tb(), 30); await sleep(250); vol.push({ set: 'toolbar 30', ...readBoth() });
    if (panelSlider()) { setRange(panelSlider(), 70); await sleep(250); vol.push({ set: 'panel 70', ...readBoth() }); }
    setRange(tb(), 10); await sleep(250); vol.push({ set: 'toolbar 10', ...readBoth() });
  }
  out.volume = vol;
  await shot('volume-toolbar', 300);
  try { ctx.trip.stop('leave'); } catch { /* nothing ran */ }
  await sleep(600);

  // ---- 3. far names in a near frame (labels.js tooFarForFrame): the Venus and Mars stops of planets-tonight
  const text = (n) => (n ? (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim() : '');
  const PLACE = { name: 'Lisbon', latDeg: 38.72, lonDeg: -9.14, latRad: 38.72 * Math.PI / 180, lonRad: -9.14 * Math.PI / 180, altKm: 0, source: 'manual' };
  try { ctx.setObserver(PLACE); } catch (e) { out.errors.push('observer: ' + e.message); }
  const plan2 = await ctx.trip.start('planets-tonight');
  out.names = {};
  if (plan2 && plan2.offerable !== false) {
    await until(() => ctx.trip.state.phase === 'intro', 20000);
    ctx.trip.jumpTo(2); ctx.trip.play();
    for (const [n, label] of [[2, 'venus'], [3, 'mars'], [5, 'saturn']]) {
      if (n !== 2) ctx.trip.jumpTo(n);
      await until(() => ['dwell', 'held'].includes(ctx.trip.state.phase) && ctx.trip.state.index === n, 40000);
      await sleep(2500);
      out.names[label] = [...document.querySelectorAll('#labels .label')].filter((e) => e.offsetParent !== null && !e.hidden).map(text).filter(Boolean);
      await shot('names-' + label, 200);
    }
  }
  try { ctx.trip.stop('leave'); } catch { /* nothing ran */ }
  await sleep(1200);

  // ---- 4. the search's star patterns
  const input = document.querySelector('.sr-search__input');
  const typed = async (q) => { input.focus(); input.value = q; input.dispatchEvent(new Event('input', { bubbles: true })); await sleep(900); return [...document.querySelectorAll('.sr-search__option')].map((e) => text(e)).slice(0, 6); };
  out.search = {};
  out.search.orion = await typed('orion');
  await shot('search-orion', 300);
  const row = [...document.querySelectorAll('.sr-search__option')].find((e) => e.dataset.extra === 'constellation');
  out.search.orionRow = !!row;
  if (row) {
    row.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));
    await sleep(2500);
    out.search.afterOrion = { skyActive: !!ctx.skyView.active, look: ctx.skyView.look, note: text(document.querySelector('.sr-scenenote')) };
    await shot('orion-aimed', 600);
  }
  out.search.crux = await typed('crux');
  const row2 = [...document.querySelectorAll('.sr-search__option')].find((e) => e.dataset.extra === 'constellation');
  if (row2) {
    row2.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));
    await sleep(1500);
    const sn = document.querySelector('.sr-scenenote');
    out.search.afterCrux = { note: text(sn), noteShown: !!(sn && !sn.hidden) };
    await shot('crux-note', 400);
  }
  return out;
})();

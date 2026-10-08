// The small-issues package, desktop walk C (1440 x 900, --gl=gpu --reduced-motion, `?tier=2`).
//   internal #202  the share sheet with the ISS selected, under reduced motion
//   internal #161  Voyager and the Apollo lunar module: the panel glint and the foil sheen on, then off
//   internal #460  "Skip to the map", focus after Back from Sources, Back to an address with no keys
//   internal #313, #290  a sunrise stop and a True size stop when the visitor asked for less motion
const THREE = await import('/vendor/three.module.min.js');
const { TOURS } = await import('/js/data/tours.js');
const DEG = 180 / Math.PI;
const state = () => ctx.trip.state;
const grab = (w, h) => new Promise((done) => requestAnimationFrame(() => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(ctx.renderer.domElement, 0, 0, w, h);
  done(g.getImageData(0, 0, w, h).data);
}));
const toStop = async (tripId, stopId, settle = 0) => {
  if (state().phase !== 'idle' && state().tourId !== tripId) { ctx.trip.stop(); await wait(1200); }
  if (state().tourId !== tripId) { await ctx.trip.start(tripId); await until(() => state().phase === 'intro', 15000); }
  const index = state().stops.findIndex((s) => s.id === stopId);
  if (index < 0) return -1;
  if (state().phase === 'intro') { if (index > 0) ctx.trip.jumpTo(index); ctx.trip.play(); } else ctx.trip.jumpTo(index);
  const ok = await until(() => state().index === index && (state().phase === 'dwell' || state().phase === 'paused'), 30000);
  if (settle) await wait(settle);
  return ok ? index : -2;
};
out.quality = ctx.quality.describe();

// --- #460: the second skip link, focus after Back, the empty address --------------------------------
await run('skipMap', async () => {
  const o = {};
  const link = $('#sr-skip-map');
  link.focus(); await wait(200);
  o.focused = { el: say(document.activeElement), box: box(link), text: text(link) };
  await shot('c1-skip-map');
  await window.cdpInput('key', 'Enter'); await wait(400);
  o.afterEnter = { el: say(document.activeElement), isMain: document.activeElement === $('#map'), tabindex: $('#map').getAttribute('tabindex') };
  await window.cdpInput('key', 'Tab'); await wait(300);
  o.nextTab = { el: say(document.activeElement), mapKeepsTabindex: $('#map').hasAttribute('tabindex') };
  // Sources, then its Back: the pressed button goes with its view, and focus lands on the view now showing.
  ctx.shell.openSources(); await until(() => ctx.shell.view() === 'sources' && $('#sr-side .sr-status'), 8000); await wait(400);
  o.sources = { el: say(document.activeElement), text: (text(document.activeElement) || '').slice(0, 30) };
  const back = $$('.sr-side__back').find((n) => n.getBoundingClientRect().height > 0);
  back.focus(); await wait(100);
  const c = box(back); await window.cdpInput('mousePressed', c[0] + 20, c[1] + 18); await window.cdpInput('mouseReleased', c[0] + 20, c[1] + 18); await wait(700);
  o.afterBack = { view: ctx.shell.view(), el: say(document.activeElement), text: (text(document.activeElement) || '').slice(0, 30), onBody: document.activeElement === document.body, hiddenFocus: !!(document.activeElement && document.activeElement.closest('[hidden]')) };
  // A card, then its Back.
  await pick('mars');
  o.card = { el: say(document.activeElement), text: (text(document.activeElement) || '').slice(0, 30) };
  const back2 = $$('.sr-side__back').find((n) => n.getBoundingClientRect().height > 0);
  if (back2) { const b = box(back2); await window.cdpInput('mousePressed', b[0] + 20, b[1] + 18); await window.cdpInput('mouseReleased', b[0] + 20, b[1] + 18); await wait(700); }
  o.afterCardBack = { view: ctx.shell.view(), el: say(document.activeElement), text: (text(document.activeElement) || '').slice(0, 30), onBody: document.activeElement === document.body, selected: ctx.selected() ? ctx.selected().id : null };
  return o;
});
await run('emptyAddress', async () => {
  const read = () => ({ hash: location.hash, at: ctx.selected() ? ctx.selected().id : null, stage: ctx.stage.worldId, mode: ctx.clock.mode, view: ctx.shell.view() });
  const o = { start: read() };
  location.hash = 'at=moon&stage=moon&t=2026-07-04T12:00:00Z'; await wait(3500); o.moon = read();
  history.back(); await wait(3500); o.back = read();
  history.forward(); await wait(3500); o.forward = read();
  history.back(); await wait(3000);
  return o;
});
await home();
if (ctx.stage.worldId !== 'earth') { ctx.setStage('earth'); await wait(1500); }
ctx.clock.live();

// --- #202: the share sheet, the ISS selected, reduced motion ---------------------------------------
await run('share', async () => {
  const rec = await pick('sat-25544');
  if (!rec) return { iss: false };
  await wait(2500);
  const opener = $('#sr-card [data-action="share"]') || $('.sr-rail__btn--share');
  const t = performance.now();
  await ctx.share.open({ record: rec, opener });
  const sheet = await until(() => { const s = $('#sr-share'); return s && !s.hidden ? s : null; }, 20000);
  const shownMs = Math.round(performance.now() - t);
  await until(() => ctx.lastShare && ctx.lastShare.picture, 60000);
  await wait(4500);
  const moving = $$('#sr-share, #sr-share *').map((n) => { const cs = getComputedStyle(n); const dur = (v) => Math.max(...String(v).split(',').map((x) => parseFloat(x) * (/ms/.test(x) ? 1 : 1000) || 0)); return { el: say(n), anim: cs.animationName !== 'none' ? dur(cs.animationDuration) : 0, trans: dur(cs.transitionDuration) }; }).filter((r) => r.anim > 1 || r.trans > 1);
  const o = { iss: true, shownMs, box: box(sheet), scroll: [sheet.scrollHeight, sheet.clientHeight], body: (() => { const b = $('.sr-share__body'); return b ? [b.scrollHeight, b.clientHeight] : null; })(), focus: say(document.activeElement), title: text($('.sr-share__title')), stillMoving: moving.slice(0, 12), running: document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('#sr-share')).length, sideways: document.documentElement.scrollWidth > innerWidth + 1, picture: (() => { const i = $('.sr-share__img'); return i ? [i.naturalWidth, i.naturalHeight, box(i)] : null; })(), link: ($('.sr-share__link') || {}).value || text($('.sr-share__link')) };
  await shot('c2-share-reduced');
  ctx.share.close(); await wait(500);
  o.focusAfterClose = say(document.activeElement);
  return o;
});
await home();

// --- #161: the two surface terms, on and off ---------------------------------------------------------
await run('models', async () => {
  const M = await import('/js/scene/models.js');
  const o = { terms: M.SURFACE_TERMS, tier: ctx.quality.tier };
  const realLatch = ctx.latch;
  const off = () => { ctx.latch = new Proxy(realLatch, { get: (t, k) => (k === 'latched' ? true : Reflect.get(t, k)) }); };
  // On whatever the machine's load did to the frame latch: the terms are judged, not the load.
  const on = () => { ctx.latch = new Proxy(realLatch, { get: (t, k) => (k === 'latched' ? false : Reflect.get(t, k)) }); };
  const kinds = () => { const seen = {}; ctx.scene.traverse((n) => { if (n.isMesh && n.visible && n.material && n.material.userData && n.material.userData.kind && n.material.userData.kind !== 'world') seen[n.material.userData.kind] = (seen[n.material.userData.kind] || 0) + 1; }); return seen; };
  for (const [name, tripId, stopId] of [['voyager', 'strangest-things', 'golden-record'], ['lm', 'moon-landings', 'apollo-11']]) {
    const i = await toStop(tripId, stopId, 4000);
    on(); await wait(700);
    const row = { index: i, stage: ctx.stage.worldId, kinds: kinds(), latched: !!realLatch.latched, on: M.surfaceTermsOn() };
    await wait(300); await shot(`c3-${name}-on`); const a = await grab(720, 450);
    off(); await wait(900); row.offState = M.surfaceTermsOn(); await shot(`c4-${name}-off`); const b = await grab(720, 450);
    on(); await wait(600); row.backOn = M.surfaceTermsOn();
    let changed = 0; let gain = 0; let peak = 0;
    for (let p = 0; p < a.length; p += 4) { const d = (a[p] + a[p + 1] + a[p + 2]) - (b[p] + b[p + 1] + b[p + 2]); if (Math.abs(d) > 9) { changed += 1; gain += d; } if (d > peak) peak = d; }
    row.diff = { pixelsChanged: changed, of: a.length / 4, meanGainPerChangedPx: changed ? Math.round((gain / changed / 3) * 10) / 10 : 0, peakGain: Math.round(peak / 3) };
    o[name] = row;
    ctx.trip.stop(); await wait(1200);
  }
  ctx.latch = realLatch;
  return o;
});

// --- #313, #290 under reduced motion ---------------------------------------------------------------
await run('sunriseStill', async () => {
  const tour = TOURS.find((t) => t.id === 'the-living-earth'); const stop = tour.stops.find((s) => s.id === 'air');
  const was = { ...stop };
  stop.framing = 'sunrise'; delete stop.key_light_deg; stop.drift = 'toward-light'; stop.drift_deg = 12; stop.drift_rate_deg_s = 1.5;
  const i = await toStop('the-living-earth', 'air', 2500);
  const w = ctx.worlds.drawnPositionOf('earth', new THREE.Vector3()); const s = ctx.worlds.drawnPositionOf('sun', new THREE.Vector3());
  const toW = w.clone().sub(ctx.camera.position); const d = toW.length();
  const sep = Math.acos(toW.normalize().dot(s.clone().sub(w).normalize())) * DEG; const rho = Math.asin(6371 / ctx.stage.unitKm / d) * DEG;
  const o = { index: i, pacing: state().pacing, reducedMotion: state().reducedMotion, sunOverLimbDeg: Math.round((sep - rho) * 100) / 100 };
  await wait(2500);
  const toW2 = w.clone().sub(ctx.camera.position); const sep2 = Math.acos(toW2.normalize().dot(s.clone().sub(w).normalize())) * DEG;
  o.after2s = Math.round((sep2 - rho) * 100) / 100;
  await shot('c5-sunrise-still');
  ctx.trip.stop(); await wait(1200);
  for (const k of Object.keys(stop)) delete stop[k];
  Object.assign(stop, was);
  return o;
});
await run('trueSizeStill', async () => {
  const i = await toStop('the-sun-today', 'scale');
  const o = { index: i, at200: null };
  await wait(1900); o.justAfterLead = { trueSize: state().trueSize, line: state().trueSizeLine };
  await wait(900); o.settled = { trueSize: state().trueSize, line: state().trueSizeLine, tripline: text($('.sr-card__tripline')) };
  ctx.trip.next(); await until(() => state().index === i + 1 && (state().phase === 'dwell' || state().phase === 'paused'), 15000); await wait(700);
  o.next = { trueSize: state().trueSize, line: state().trueSizeLine, tripline: text($('.sr-card__tripline')), stage: ctx.stage.worldId };
  ctx.trip.stop(); await wait(800);
  return o;
});
return out;

// The small-issues package, desktop walk D (1440 x 900, --gl=gpu): what a loaded machine took from
// the walks before it.
//   internal #161  Voyager and the Apollo lunar module with the panel glint and the foil sheen ON and
//                  OFF. The terms follow the device's tier and the frame latch, and a machine under
//                  load latches: here both are pinned from the probe, so the terms are judged.
//   internal #460  the card's own Back, pressed with a real pointer, after a card opened from nowhere
const state = () => ctx.trip.state;
const grab = (w, h) => new Promise((done) => { if (ctx.requestRender) ctx.requestRender(); requestAnimationFrame(() => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(ctx.renderer.domElement, 0, 0, w, h);
  done(g.getImageData(0, 0, w, h).data);
}); });
const toStop = async (tripId, stopId, settle = 0) => {
  if (state().phase !== 'idle' && state().tourId !== tripId) { ctx.trip.stop(); await wait(1200); }
  if (state().tourId !== tripId) { await ctx.trip.start(tripId); await until(() => state().phase === 'intro', 20000); }
  const index = state().stops.findIndex((s) => s.id === stopId);
  if (index < 0) return -1;
  if (state().phase === 'intro') { if (index > 0) ctx.trip.jumpTo(index); ctx.trip.play(); } else ctx.trip.jumpTo(index);
  const ok = await until(() => state().index === index && (state().phase === 'dwell' || state().phase === 'paused'), 40000);
  if (settle) await wait(settle);
  return ok ? index : -2;
};

await run('cardBack', async () => {
  const o = {};
  document.activeElement && document.activeElement.blur();
  await pick('mars');
  o.opened = { el: say(document.activeElement) };
  const press = async () => { const back = $$('.sr-side__back').find((n) => n.getBoundingClientRect().height > 0); const b = box(back); await window.cdpInput('mousePressed', b[0] + 20, b[1] + 18); await window.cdpInput('mouseReleased', b[0] + 20, b[1] + 18); await wait(800); };
  await press();
  o.fromNowhere = { view: ctx.shell.view(), el: say(document.activeElement), text: (text(document.activeElement) || '').slice(0, 24), onBody: document.activeElement === document.body };
  // And from a row a visitor pressed: the focus goes back to that row, as before.
  const row = $('.sr-now__btn') || $('.sr-tripcard');
  const input = $('.sr-search__input'); input.focus(); await wait(100);
  await pick('moon');
  await press();
  o.fromSearch = { view: ctx.shell.view(), el: say(document.activeElement), onBody: document.activeElement === document.body };
  return o;
});

await run('models', async () => {
  const M = await import('/js/scene/models.js');
  const o = { terms: M.SURFACE_TERMS, realTier: ctx.quality.tier, realLatched: !!ctx.latch.latched };
  const realLatch = ctx.latch; const realQuality = ctx.quality;
  const pin = (latched) => {
    ctx.latch = new Proxy(realLatch, { get: (t, k) => (k === 'latched' ? latched : Reflect.get(t, k)) });
    ctx.quality = new Proxy(realQuality, { get: (t, k) => (k === 'tier' ? 2 : Reflect.get(t, k)) });
  };
  const kinds = () => { const seen = {}; ctx.scene.traverse((n) => { if (n.isMesh && n.visible && n.material && n.material.userData && n.material.userData.kind && n.material.userData.kind !== 'world') seen[n.material.userData.kind] = (seen[n.material.userData.kind] || 0) + 1; }); return seen; };
  for (const [name, tripId, stopId] of [['voyager', 'strangest-things', 'golden-record'], ['lm', 'moon-landings', 'apollo-11']]) {
    // Past the stop's own drift (34 degrees at 6 a second), so the camera is still between the frames.
    const i = await toStop(tripId, stopId, 7200);
    pin(false); await wait(700);
    const row = { index: i, stage: ctx.stage.worldId, kinds: kinds(), on: M.surfaceTermsOn() };
    await shot(`d1-${name}-on`); const a = await grab(720, 450);
    pin(true); await wait(700); row.off = !M.surfaceTermsOn(); await shot(`d2-${name}-off`); const b = await grab(720, 450);
    pin(false); await wait(700); const a2 = await grab(720, 450);
    const diff = (x, y) => { let changed = 0; let gain = 0; let peak = 0; for (let p = 0; p < x.length; p += 4) { const d = (x[p] + x[p + 1] + x[p + 2]) - (y[p] + y[p + 1] + y[p + 2]); if (Math.abs(d) > 9) { changed += 1; gain += d; } if (d > peak) peak = d; } return { pixelsChanged: changed, of: x.length / 4, meanGainPerChangedPx: changed ? Math.round((gain / changed / 3) * 10) / 10 : 0, peakGain: Math.round(peak / 3) }; };
    row.onMinusOff = diff(a, b);
    row.onAgainMinusOn = diff(a2, a); // the noise floor: the same state twice
    row.phase = state().phase;
    o[name] = row;
    ctx.latch = realLatch; ctx.quality = realQuality;
    ctx.trip.stop(); await wait(1200);
  }
  return o;
});
return out;

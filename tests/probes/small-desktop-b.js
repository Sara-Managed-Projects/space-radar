// The small-issues package, desktop walk B (1440 x 900, --gl=gpu): models and trips.
//   internal #161  Voyager and the Apollo lunar module with the panel glint and the foil sheen, on and off
//   internal #313  `framing: sunrise` on the Earth and on Mars: frames before, as and after the Sun clears the limb
//   internal #290  True size as a stop's reveal (the-sun-today/scale)
//   internal #307  the one line of truth on a trip's intro
//   internal #384  the living Earth's two solstice stops, and no "Next:" on its card
// `?sunrise=<trip>/<stop>,...` puts the framing on those stops in memory (the registry is not changed):
// that is how a stop is auditioned before it is written.
const THREE = await import('/vendor/three.module.min.js');
const { TOURS } = await import('/js/data/tours.js');
const tourOf = (id) => TOURS.find((t) => t.id === id);
const DEG = 180 / Math.PI;
const state = () => ctx.trip.state;
const toStop = async (tripId, stopId, { settle = 0 } = {}) => {
  if (state().phase !== 'idle' && state().tourId !== tripId) { ctx.trip.stop(); await wait(1200); }
  if (state().tourId !== tripId) { await ctx.trip.start(tripId); await until(() => state().phase === 'intro', 15000); }
  const index = state().stops.findIndex((s) => s.id === stopId);
  if (index < 0) return -1;
  if (state().phase === 'intro') { if (index > 0) ctx.trip.jumpTo(index); ctx.trip.play(); } else ctx.trip.jumpTo(index);
  const ok = await until(() => state().index === index && state().phase === 'dwell', 30000);
  if (settle) await wait(settle);
  return ok ? index : -2;
};
const pauseTrip = () => { if (state().phase === 'dwell') ctx.trip.pause(); };
/** The Sun against a world's limb, seen from the camera: how far its centre is outside the disc, degrees. */
const sunOverLimb = (worldId) => {
  const w = ctx.worlds.drawnPositionOf(worldId, new THREE.Vector3());
  const s = ctx.worlds.drawnPositionOf('sun', new THREE.Vector3());
  const row = ctx.worlds.worlds.find((x) => x.id === worldId);
  if (!w || !s || !row) return null;
  const cam = ctx.camera.position;
  const toW = w.clone().sub(cam); const d = toW.length();
  const toS = s.clone().sub(w).normalize(); // the Sun is far: its direction from the world is its direction from the camera
  const sep = Math.acos(Math.max(-1, Math.min(1, toW.clone().normalize().dot(toS)))) * DEG;
  const rho = Math.asin(Math.min(1, row.radiusKm / ctx.stage.unitKm / d)) * DEG;
  return { sunFromCentreDeg: Math.round(sep * 100) / 100, discRadiusDeg: Math.round(rho * 100) / 100, sunOverLimbDeg: Math.round((sep - rho) * 100) / 100, frameRadii: Math.round((d * ctx.stage.unitKm / row.radiusKm) * 100) / 100 };
};
/** The share of the canvas that is lit at all, and its mean brightness, from a small read-back. */
// The drawing buffer is not kept (preserveDrawingBuffer: false): it is read in a frame callback that
// runs after the app's own, while what was just drawn is still there.
const grab = (w, h) => new Promise((done) => requestAnimationFrame(() => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(ctx.renderer.domElement, 0, 0, w, h);
  done(g.getImageData(0, 0, w, h).data);
}));
const lit = async () => {
  const px = await grab(160, 100); let n = 0; let sum = 0;
  for (let i = 0; i < px.length; i += 4) { const v = px[i] + px[i + 1] + px[i + 2]; sum += v; if (v > 60) n += 1; }
  return { litShare: Math.round((n / 16000) * 1000) / 1000, mean: Math.round(sum / 16000 / 3) };
};
const kinds = () => {
  const seen = {}; let models = 0;
  ctx.scene.traverse((n) => { if (n.isMesh && n.material && n.material.userData && n.material.userData.kind && n.visible) { const k = n.material.userData.kind; if (k !== 'world') { seen[k] = (seen[k] || 0) + 1; models += 1; } } });
  return seen;
};

// --- #307, #384: intros and the picker -------------------------------------------------------------
await run('truth', async () => {
  const o = {};
  const card = $('[data-trip="the-living-earth"]');
  o.livingEarthCard = card ? text(card) : null;
  o.eclipseCard = text($('[data-trip="chasing-the-solar-eclipse"]'));
  for (const id of ['people-in-space', 'the-living-earth']) {
    if (state().phase !== 'idle') { ctx.trip.stop(); await wait(1200); }
    await ctx.trip.start(id);
    await until(() => state().phase === 'intro' && $('.sr-tripsheet__truth'), 15000);
    await wait(500);
    const n = $('.sr-tripsheet__truth');
    o[id] = { line: text(n), box: box(n), fontPx: n ? parseFloat(getComputedStyle(n).fontSize) : null, colour: n ? getComputedStyle(n).color : null, clockMoves: state().clockMoves, notes: $$('.sr-tripsheet__note').map(text) };
    if (id === 'people-in-space') await shot('b1-intro-truth');
  }
  await shot('b2-intro-living-earth');
  return o;
});

// --- #384: the two solstice stops ------------------------------------------------------------------
await run('solstice', async () => {
  const o = { now: new Date().toISOString().slice(0, 16) };
  for (const id of ['tilt', 'half-a-year-on']) {
    const i = await toStop('the-living-earth', id, { settle: 1500 });
    o[id] = { index: i, clock: new Date(ctx.clock.now()).toISOString().slice(0, 16), when: text($('.sr-card__when')), title: text($('.sr-card__name')), ...(await lit()) };
    await shot(`b3-${id}`);
  }
  o.daysApart = Math.round((Date.parse(o['half-a-year-on'].clock + 'Z') - Date.parse(o.tilt.clock + 'Z')) / 864e5 * 10) / 10;
  return o;
});

// --- #313: the sunrise framing, auditioned in memory ------------------------------------------------
const AUDITION = (/[?&]sunrise=([^&#]+)/.exec(location.search) || [0, 'the-living-earth/air,mars-where-we-have-driven/planet'])[1].split(',').map((s) => s.split('/'));
await run('sunrise', async () => {
  const o = {};
  for (const [tripId, stopId] of AUDITION) {
    const tour = tourOf(tripId); const stop = tour && tour.stops.find((s) => s.id === stopId);
    if (!stop) { o[`${tripId}/${stopId}`] = 'no such stop'; continue; }
    const was = { ...stop };
    stop.framing = 'sunrise'; delete stop.key_light_deg; delete stop.over; stop.drift = 'toward-light'; stop.drift_deg = 12; stop.drift_rate_deg_s = 1.5;
    const world = stop.target.world;
    const i = await toStop(tripId, stopId);
    const row = { index: i, world, stage: ctx.stage.worldId, shots: [] };
    const frame = async (label) => { row.shots.push({ label, ...sunOverLimb(world), ...(await lit()) }); await shot(`b4-${tripId.split('-')[0]}-${stopId}-${label}`); };
    await frame('0-arrived');
    await wait(1800); await frame('1-rising');
    await wait(2600); await frame('2-out');
    await wait(4500); await frame('3-end');
    row.words = text($('.sr-card__leadbody') || $('.sr-tripsheet .sr-card__sentence'));
    o[`${tripId}/${stopId}`] = row;
    ctx.trip.stop(); await wait(1200);
    for (const k of Object.keys(stop)) delete stop[k];
    Object.assign(stop, was);
  }
  return o;
});

// --- #290: True size as a reveal --------------------------------------------------------------------
await run('trueSize', async () => {
  const i = await toStop('the-sun-today', 'scale');
  const inFrame = () => state().orbits.map((id) => { const p = ctx.worlds.drawnPositionOf(id, new THREE.Vector3()); if (!p) return null; const v = p.clone().project(ctx.camera); return { id, x: Math.round(v.x * 100) / 100, y: Math.round(v.y * 100) / 100, in: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 }; });
  const read = async () => ({ trueSize: state().trueSize, line: state().trueSizeLine, tripline: text($('.sr-card__tripline')), dotsVisible: (() => { let v = null; ctx.orbitRings.group.traverse((n) => { if (n.isPoints && v === null) v = n.visible; }); return v; })(), ...(await lit()) });
  const o = { index: i, orbits: state().orbits, planets: inFrame() };
  await wait(500); o.before = await read(); await shot('b5-truesize-before');
  await wait(2600); o.after = await read(); await shot('b6-truesize-after');
  ctx.trip.next(); await until(() => state().index === i + 1, 15000); await wait(600);
  o.left = { trueSize: state().trueSize, line: state().trueSizeLine };
  ctx.trip.stop(); await wait(1200);
  return o;
});

// --- #161: Voyager and the lunar module, the two terms on and off ------------------------------------
await run('models', async () => {
  const M = await import('/js/scene/models.js');
  const o = { terms: M.SURFACE_TERMS };
  const realLatch = ctx.latch;
  const off = () => { ctx.latch = new Proxy(realLatch, { get: (t, k) => (k === 'latched' ? true : Reflect.get(t, k)) }); };
  const on = () => { ctx.latch = realLatch; };
  for (const [name, tripId, stopId] of [['voyager', 'strangest-things', 'golden-record'], ['lm', 'moon-landings', 'apollo-11']]) {
    const i = await toStop(tripId, stopId, { settle: 3500 });
    pauseTrip(); await wait(600);
    const row = { index: i, stage: ctx.stage.worldId, kinds: kinds(), on: M.surfaceTermsOn(), tier: ctx.quality.tier };
    await wait(300); await shot(`b7-${name}-on`); const a = await grab(360, 225);
    off(); await wait(700); row.offState = M.surfaceTermsOn(); await shot(`b8-${name}-off`); const b = await grab(360, 225);
    on(); await wait(500); row.backOn = M.surfaceTermsOn();
    let changed = 0; let gain = 0; let peak = 0;
    for (let p = 0; p < a.length; p += 4) { const d = (a[p] + a[p + 1] + a[p + 2]) - (b[p] + b[p + 1] + b[p + 2]); if (Math.abs(d) > 9) changed += 1; gain += d; if (d > peak) peak = d; }
    row.diff = { pixelsChanged: changed, of: a.length / 4, meanGainPerChangedPx: changed ? Math.round(gain / changed / 3) : 0, peakGain: Math.round(peak / 3) };
    o[name] = row;
    ctx.trip.stop(); await wait(1200);
  }
  return o;
});
return out;

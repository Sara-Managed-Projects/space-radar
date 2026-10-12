// look-b.js -- deep space: "To the edge" at Sirius and the Pleiades, deep-sky objects that have no
// photograph, a pulsar at two instants, Sagittarius A* outside a trip, and the brightest stars from
// the ground. After look-common.js.
if (await tripStop('to-the-edge', 2)) {
  out.starsReady = await until(() => ctx.stars3d && ctx.stars3d.count() > 100000, 40000);
  await shot('edge-sirius', 3000);
}
if (await tripStop('to-the-edge', 3)) {
  out.m45Picture = await until(() => ctx.nebulae && ctx.nebulae.loaded().includes('dso-m45'), 30000);
  await shot('edge-pleiades', 4000);
}
out.layers = { stars: ctx.isLayerOn('stars'), exoplanets: ctx.isLayerOn('exoplanets'), deepSky: ctx.isLayerOn('deep-sky') };
try { ctx.trip.stop('leave'); } catch { /* nothing ran */ }
for (const id of ['dso-hyades', 'dso-m13', 'dso-m44', 'dso-m97', 'dso-m87', 'dso-m78']) {
  if (await goTo(id, 15000)) { frameSize(id); await shot('mark-' + id.slice(4), 2500); }
}
if (await goTo('exotic-crab-pulsar', 15000)) {
  await shot('pulsar-crab-a', 2000);
  await shot('pulsar-crab-b', 700);
  out.pulsar = ctx.pulsars ? ctx.pulsars.state() : null;
}
if (await goTo('exotic-sgr-a-star', 15000)) { await shot('sgr-a-outside-a-trip', 4000); out.portrait = ctx.portraits ? ctx.portraits.state() : null; }
// The sky from the ground: Cairo on a December evening, Orion and Sirius up.
const place = { name: 'Cairo', latDeg: 30.04, lonDeg: 31.24, latRad: 30.04 * DEG, lonRad: 31.24 * DEG, altKm: 0, source: 'manual' };
try {
  ctx.setObserver(place);
  ctx.clock.goTo(Date.parse('2026-12-15T20:30:00Z')); ctx.clock.setRate(1);
  await wait(300);
  if (!ctx.skyView.active) ctx.skyView.enter(place);
  await until(() => ctx.skyView.ownsSky, 20000);
  if (ctx.skyView.lookAtDeg) ctx.skyView.lookAtDeg(150, 35);
  await shot('sky-bright-stars', 4000);
  out.sky = ctx.skyView.groundStats ? { limit: (ctx.skyView.groundStats() || {}).limit } : null;
} catch (e) { out.errors.push('sky: ' + String(e && e.message)); }
out.ms = Date.now() - t0;
return out;

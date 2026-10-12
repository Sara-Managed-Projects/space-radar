// public2-a.js -- the scene half of the "remaining public issues" package (public #271, #424,
// #428, #403, #266). After look-common.js, at 1440x900, with `?sw=0&tier=2`:
//   cat tests/probes/look-common.js tests/probes/public2-a.js > /tmp/a.js
out.layers0 = { exoplanets: ctx.isLayerOn('exoplanets'), stars: ctx.isLayerOn('stars'), deepSky: ctx.isLayerOn('deep-sky') };
await shot('home', 2500);
// Deep space, by the trip the issue names: Sirius and the Pleiades, with the marks off.
if (await tripStop('to-the-edge', 2)) {
  out.starsReady = await until(() => ctx.stars3d && ctx.stars3d.count() > 100000, 40000);
  await shot('edge-sirius', 3000);
}
if (await tripStop('to-the-edge', 3)) await shot('edge-pleiades', 4000);
out.layersInTrip = { exoplanets: ctx.isLayerOn('exoplanets') };
try { ctx.trip.stop('leave'); } catch { /* nothing ran */ }
await wait(800);
// The two clusters gathered from their catalogue stars (public #424).
for (const id of ['dso-m44', 'dso-ic-2602']) {
  if (await goTo(id, 15000)) { frameSize(id, 420); await shot('cluster-' + id.slice(4), 2500); }
}
// The Milky Way's dust lanes (public #428): face on, then edge on.
if (await goTo('dso-milky-way', 22000)) {
  await until(() => ctx.galaxy && ctx.galaxy.count() > 0, 30000);
  out.galaxy = { points: ctx.galaxy.count(), dust: ctx.galaxy.dustCount(), stage: ctx.stage.worldId };
  const e = 23.4392911 * DEG, ra = 192.85 * DEG, dec = 27.13 * DEG;
  const q = V(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec));
  const pole = norm(V(q.x, q.y * Math.cos(e) + q.z * Math.sin(e), -q.y * Math.sin(e) + q.z * Math.cos(e)));
  const inPlane = norm(cross(pole, V(1, 0, 0)));
  frameSize('dso-milky-way', 620);
  ctx.cameraRig.flyTo({ offset: pole, ms: 0 });
  await shot('galaxy-face-on', 4000);
  ctx.cameraRig.flyTo({ offset: norm(mix(inPlane, 1, pole, 0.12)), ms: 0 });
  await shot('galaxy-edge-on', 3000);
}
// The naked-eye sky: Cairo on a December evening, Orion and Sirius up.
const place = { name: 'Cairo', latDeg: 30.04, lonDeg: 31.24, latRad: 30.04 * DEG, lonRad: 31.24 * DEG, altKm: 0, source: 'manual' };
const realNow = ctx.clock.now();
try {
  ctx.setObserver(place);
  ctx.clock.goTo(Date.parse('2026-12-15T20:30:00Z')); ctx.clock.setRate(1);
  await wait(300);
  if (!ctx.skyView.active) ctx.skyView.enter(place);
  await until(() => ctx.skyView.ownsSky, 20000);
  if (ctx.skyView.lookAtDeg) ctx.skyView.lookAtDeg(150, 35);
  await shot('sky-bright-stars', 4000);
  out.skyLayers = { exoplanets: ctx.isLayerOn('exoplanets') };
  if (ctx.skyView.leave) ctx.skyView.leave(); else if (ctx.skyView.exit) ctx.skyView.exit();
} catch (err) { out.errors.push('sky: ' + String(err && err.message)); }
await wait(1500);
// Mars's night side and the markers on it (public #403).
try {
  ctx.clock.goTo(realNow); ctx.clock.setRate(1);
  for (const id of ['hand-kept-sites', 'sites']) if (ctx.layers.some((l) => l.id === id) && !ctx.isLayerOn(id)) ctx.setLayerOn(id, true);
  if (await goTo('mars', 25000)) {
    standAt('mars', 125, 8, 1);
    await shot('mars-night-side', 5000);
    out.marsSites = ctx.records().filter((r) => r.klass === 'site' && r.meta && (r.meta.world === 'mars' || /mars/i.test(String(r.frame || '')))).map((r) => r.id);
    standAt('mars', 180, 5, 1);
    await shot('mars-midnight', 3000);
  }
} catch (err) { out.errors.push('mars: ' + String(err && err.message)); }
// The station, lit three ways (public #266): as it arrives, with the Sun behind it, 25 minutes on.
try {
  out.tier = ctx.quality ? ctx.quality.tier : null;
  if (await goTo('sat-25544', 30000)) {
    await wait(6000);
    await shot('iss-arrival', 2500);
    const sunDir = () => norm(ctx.worlds.meshFor('earth').material.uniforms.uSunDir.value);
    const s = sunDir();
    ctx.cameraRig.flyTo({ offset: V(-s.x, -s.y, -s.z), ms: 0 });
    await shot('iss-sun-behind-it', 3000);
    ctx.clock.goTo(ctx.clock.now() + 25 * 60e3);
    await wait(2500);
    const s2 = sunDir();
    ctx.cameraRig.flyTo({ offset: V(-s2.x, -s2.y, -s2.z), ms: 0 });
    await shot('iss-sun-behind-it-25min', 3000);
    ctx.cameraRig.flyTo({ offset: norm(mix(s2, 0.3, cross(s2, V(0, 1, 0)), 1)), ms: 0 });
    await shot('iss-side-on', 3000);
  }
} catch (err) { out.errors.push('iss: ' + String(err && err.message)); }
out.ms = Date.now() - t0;
return out;

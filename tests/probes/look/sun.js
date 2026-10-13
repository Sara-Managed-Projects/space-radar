// sun: the Sun close up with its detail module on (scene/sun.js): arrival, closer, the limb, the
// corona wide, then the clock put inside a real flare and two hours into a real coronal mass
// ejection when the two feeds are there. The detail is loaded by main.js's own loader, which is why
// this probe needs the latch held by `?look=1` and not by pretending the page is hidden.
look.probe = 'sun';
const out = {};
await stage('sun', 8000);
await go('sun', null, 6000);
out.detailLoaded = await until(() => sr.sunDetail && sr.sunDetail.state().on, 60000);
if (!out.detailLoaded) out.fail = 'the Sun detail never came on (latched: ' + (sr.latch && sr.latch.latched) + ', disc share ' + sr.worlds.discShare('sun').toFixed(3) + ')';
// The feeds land a moment after the module.
await until(() => sr.sunDetail && sr.sunDetail.state().regions > 0, 20000);
await shot('sun-1-arrival', 'the Sun on its stage, detail ' + (out.detailLoaded ? 'on' : 'OFF'), 4000);
out.detail = sr.sunDetail ? sr.sunDetail.state() : null;
const d = rig.state.distance;
rig.flyTo({ distance: d * 0.55, ms: 0 });
await shot('sun-2-closer', 'closer: granulation and today\'s spot groups', 6000);
await shot('sun-3-six-seconds-later', 'six seconds on: the granulation should have moved', 6000);
// Not closer than this: the rig stops at 1.02 radii, and from there one granule is the whole window
// (the first version asked for 0.3 and photographed a flat orange field).
rig.flyTo({ distance: d * 0.42, azimuth: rig.state.azimuth + 0.5, ms: 0 });
await shot('sun-4-closest', 'as close as is useful, turned half a radian: cells, spots, the limb at the edge', 6000);
// THE RIG'S CLOSEST (2026-10-12: "at the rig's closest the Sun is flat orange facets"). From a tenth
// of a radius up the map has given way to the drawn surface and the grain is at a granule's real size.
const sunRadius = sr.worlds.drawnRadiusUnits('sun');
if (sunRadius > 0) {
  rig.flyTo({ distance: sunRadius * 1.6, ms: 0 });
  await shot('sun-4b-six-tenths-of-a-radius-up', 'from 1.6 radii: the map giving way to the drawn surface', 6000);
  rig.flyTo({ distance: sunRadius * 1.08, ms: 0 });
  await shot('sun-4c-rig-closest', 'from 1.08 radii, near the rig\'s closest: the drawn surface alone', 6000);
  out.close = sr.sunDetail ? { level: sr.sunDetail.state().level, close: sr.sunDetail.state().close, distance: rig.state.distance, radius: sunRadius } : null;
}
rig.flyTo({ distance: d * 1.6, ms: 0 });
await shot('sun-5-wide-corona', 'wide: the corona', 6000);
// The events. The parsed flares carry `maxMs` (data/sunactivity.js parseFlares), the CMEs `startMs`.
let flares = []; let cmes = [];
try {
  const a = await import('/js/data/sunactivity.js');
  try { flares = a.parseFlares(await a.readSunEvents()); } catch (e) { look.missing.push('flares: ' + e.message); }
  try { cmes = a.parseCmes(await a.readCmes()); } catch (e) { look.missing.push('CMEs: ' + e.message); }
} catch (e) { look.errors.push('probe: data/sunactivity.js did not load: ' + (e && e.stack || e)); }
out.flareList = flares.length; out.cmeList = cmes.length;
// The Sun as the Earth sees it: the regions NOAA lists are the ones on that face.
const faceEarth = (k) => {
  try {
    const e = sr.worlds.drawnPositionOf('earth'); const s = sr.worlds.drawnPositionOf('sun');
    const v = { x: e.x - s.x, y: e.y - s.y, z: e.z - s.z }; const n = Math.hypot(v.x, v.y, v.z);
    if (n > 0) rig.flyTo({ offset: { x: v.x / n, y: v.y / n, z: v.z / n }, distance: d * k, ms: 0 });
  } catch (e) { look.warns.push('probe: could not face the Earth: ' + e); rig.flyTo({ distance: d * k, ms: 0 }); }
};
if (flares.length) {
  const f = flares.slice().sort((x, y) => y.flux - x.flux)[0];
  sr.clock.goTo(f.maxMs + 30000);
  faceEarth(0.6);
  await sleep(8000);
  const now = sr.sunDetail ? sr.sunDetail.state().flares : [];
  out.flareAt = { flare: f, clock: new Date(sr.clock.now()).toISOString(), drawn: now };
  await shot('sun-6-inside-a-flare', 'the clock 30 s after the peak of the ' + f.cls + ' flare of region ' + f.region + ' (' + new Date(f.maxMs).toISOString() + '); drawn now: ' + now.length);
  if (out.detailLoaded && !now.length) look.warns.push('probe: at the peak of flare ' + f.cls + ' (region ' + f.region + ') the detail draws no flare: its region may not be in today\'s list');
}
if (cmes.length) {
  // The fastest of the list. First when the front is three Sun radii from the centre (a quarter of
  // an hour for a fast one), then two hours in, when a 1 586 km/s front is seventeen radii out: the
  // camera stands back far enough to have the front at six tenths of the half-view, which is where
  // the disc is a few pixels and the surface's detail is off (scene/sun.js CME_FROM says why the
  // cloud is drawn all the same). Each from the Earth's side, and the last from the side as well,
  // where a cloud thrown toward the Earth is a loop and not a ring.
  // Measured 2026-10-12 before the fix: a 741 km/s front two hours in was at 8.7 radii with opacity
  // 0.02, and a 1 586 km/s one was not drawn.
  const c = cmes.slice().sort((x, y) => y.speedKmS - x.speedKmS)[0];
  out.cmeAt = { cme: c, at: [] };
  const f = (() => { try { return sr.camera.projectionMatrix.elements[5]; } catch { return 2.4; } })();
  const earthSide = () => { const e = sr.worlds.drawnPositionOf('earth'); const s = sr.worlds.drawnPositionOf('sun'); return unit({ x: e.x - s.x, y: e.y - s.y, z: e.z - s.z }); };
  const hoursToThreeRadii = (2 * 695700 / c.speedKmS) / 3600;
  for (const [name, hours, words, side] of [['sun-7-cme-front-at-three-radii', hoursToThreeRadii, Math.round(hoursToThreeRadii * 60) + ' minutes', false], ['sun-8-two-hours-into-a-cme', 2, 'two hours', false], ['sun-9-two-hours-in-from-the-side', 2, 'two hours, seen from the side', true]]) {
    sr.clock.goTo(c.startMs + hours * 3600e3);
    await sleep(1500);
    const radii = 1 + c.speedKmS * hours * 3600 / 695700;
    try {
      const toEarth = earthSide();
      const offset = side ? unit(cross(north('sun'), toEarth)) : toEarth;
      rig.flyTo({ offset, distance: Math.max(d * 1.2, (sunRadius > 0 ? sunRadius : d / 4) * radii * f / 0.6), ms: 0 });
    } catch (e) { look.warns.push('probe: could not stand back from the CME: ' + e); faceEarth(2.6); }
    await sleep(8000);
    const now = sr.sunDetail ? sr.sunDetail.state().cmes : [];
    out.cmeAt.at.push({ hours, side, clock: new Date(sr.clock.now()).toISOString(), share: sr.worlds.discShare('sun'), drawn: now });
    const mine = now.find((x) => x.id === c.id);
    await shot(name, words + ' after the start of CME ' + c.id + ' (' + c.speedKmS + ' km/s): ' + (mine ? 'front at ' + mine.radii.toFixed(1) + ' Sun radii, opacity ' + mine.opacity.toFixed(2) : 'NOT DRAWN'));
    if (!mine && radii < 24) look.errors.push('probe: ' + words + ' after its start, CME ' + c.id + ' should be at ' + radii.toFixed(1) + ' radii and is not drawn');
  }
}
out.detailAfter = sr.sunDetail ? sr.sunDetail.state() : null;
return finish(out);

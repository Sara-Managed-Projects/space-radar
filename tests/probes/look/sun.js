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
  // The fastest of the list: its front is the brightest. First when the front is three Sun radii
  // from the centre (a quarter of an hour for a fast one), then two hours in, where it is near or past
  // CME_REACH_RADII and the drawing has let it fade (data/sunactivity.js): measured 2026-10-12, a
  // 741 km/s front two hours in is at 8.7 radii with opacity 0.02, and a 1586 km/s one is gone.
  const c = cmes.slice().sort((x, y) => y.speedKmS - x.speedKmS)[0];
  out.cmeAt = { cme: c, at: [] };
  const hoursToThreeRadii = (2 * 695700 / c.speedKmS) / 3600;
  for (const [name, hours, words] of [['sun-7-cme-front-at-three-radii', hoursToThreeRadii, Math.round(hoursToThreeRadii * 60) + ' minutes'], ['sun-8-two-hours-into-a-cme', 2, 'two hours']]) {
    sr.clock.goTo(c.startMs + hours * 3600e3);
    faceEarth(2.6);
    await sleep(8000);
    const now = sr.sunDetail ? sr.sunDetail.state().cmes : [];
    out.cmeAt.at.push({ hours, clock: new Date(sr.clock.now()).toISOString(), drawn: now });
    const mine = now.find((x) => x.id === c.id);
    await shot(name, words + ' after the start of CME ' + c.id + ' (' + c.speedKmS + ' km/s): ' + (mine ? 'front at ' + mine.radii.toFixed(1) + ' Sun radii, opacity ' + mine.opacity.toFixed(2) : 'NOT DRAWN'));
  }
}
out.detailAfter = sr.sunDetail ? sr.sunDetail.state() : null;
return finish(out);

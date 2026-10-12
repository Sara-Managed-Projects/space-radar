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
rig.flyTo({ distance: d * 0.3, azimuth: rig.state.azimuth + 0.5, ms: 0 });
await shot('sun-4-limb-close', 'close on the limb: prominences', 6000);
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
  const c = cmes[cmes.length - 1];
  sr.clock.goTo(c.startMs + 2 * 3600e3);
  faceEarth(2.6);
  await sleep(8000);
  const now = sr.sunDetail ? sr.sunDetail.state().cmes : [];
  out.cmeAt = { cme: c, clock: new Date(sr.clock.now()).toISOString(), drawn: now };
  await shot('sun-7-two-hours-into-a-cme', 'two hours after the start of CME ' + c.id + ' (' + c.speedKmS + ' km/s); drawn now: ' + now.length);
}
out.detailAfter = sr.sunDetail ? sr.sunDetail.state() : null;
return finish(out);

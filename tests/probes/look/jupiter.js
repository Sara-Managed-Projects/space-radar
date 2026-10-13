// jupiter: the stage, closer, both poles (Juno's cyclones), close on the south equatorial belt, then
// the clock sped up so what turns is seen to have turned. Every view is from the sunward side
// (the prelude says why): the first version turned the camera by angle and its three close
// pictures were Jupiter's night, black from edge to edge.
look.probe = 'jupiter';
const out = {};
out.weatherLoaded = await until(() => sr.weather && typeof sr.weather.state === 'function', 30000);
await stage('jupiter', 12000);
const d0 = rig.state.distance;
const J = 'jupiter';
await shot('1-jupiter-stage', 'Jupiter on its stage; weather module ' + (out.weatherLoaded ? 'on' : 'OFF'));
rig.flyTo({ offset: sunward(J), distance: d0 * 0.45, ms: 0 });
await shot('2-closer', 'closer, from the Sun\'s side', 6000);
rig.flyTo({ offset: mix(north(J), 1, sunward(J), 0.6), distance: d0 * 0.5, ms: 0 });
await shot('3-north-pole', 'over the north pole, leaning to the Sun', 6000);
rig.flyTo({ offset: mix(north(J), -1, sunward(J), 0.6), distance: d0 * 0.5, ms: 0 });
await shot('4-south-pole', 'over the south pole, leaning to the Sun', 6000);
// The south equatorial belt is some fifteen degrees south: a quarter of a radian below the Sun's line.
const belt = () => mix(sunward(J), 1, north(J), -0.27);
// A third of a radius above the clouds. Not the rig's closest (1.02 radii, which 0.3 of the stage's
// distance asks for): from there a few texels of the map are the whole window, a beige blur.
const radius = sr.worlds.drawnRadiusUnits(J);
const near = radius > 0 ? radius * 1.35 : d0 * 0.4;
out.distances = { stage: d0, radius, belt: near };
rig.flyTo({ offset: belt(), distance: near, ms: 0 });
await shot('5-close-south-belt', 'close on the south equatorial belt, the clock at its own rate', 6000);
try {
  const rates = sr.clock.rates();
  sr.clock.setRate(rates[rates.length - 2] || rates[rates.length - 1]);
  out.rate = sr.clock.rate;
} catch (e) { look.warns.push('probe: the clock could not be sped up: ' + e); }
await sleep(6000);
rig.flyTo({ offset: belt(), distance: near, ms: 0 });
await shot('6-belt-clock-fast', 'the same view after six seconds with the clock at ' + out.rate + 'x', 3000);
rig.flyTo({ offset: sunward(J), distance: d0 * 0.45, ms: 0 });
await shot('7-disc-clock-fast', 'the disc again, the clock still fast', 5000);
sr.clock.live();
// THE RIG'S CLOSEST, on all four giants (2026-10-12: "at the rig's closest zoom Jupiter is a
// featureless beige field"). Three per cent of a radius above the clouds, where one texel of the map
// is tens of pixels wide and the generated cloud detail (registry/weather.yaml kind cloud-detail)
// is what carries the picture. Also from a tenth of a radius, where it is fading in.
out.closest = {};
// `up`: how far out, in drawn (mean) radii. Saturn's equator is 3.5 % beyond its mean radius, so 1.03
// there is under the cloud tops (the first run photographed black from inside the globe): 1.1.
for (const [id, tilt, up] of [[J, -0.27, 1.03], ['saturn', 0.25, 1.1], ['uranus', 0.2, 1.04], ['neptune', -0.3, 1.04]]) {
  try {
    if (id !== J) await stage(id, 9000);
    const r = sr.worlds.drawnRadiusUnits(id);
    if (!(r > 0)) { look.missing.push('closest: no radius for ' + id); continue; }
    const from = () => mix(sunward(id), 1, north(id), tilt);
    if (id === J) {
      rig.flyTo({ offset: from(), distance: r * 1.1, ms: 0 });
      await shot('8-' + id + '-a-tenth-of-a-radius-up', id + ' from a tenth of its radius above the clouds', 6000);
    }
    rig.flyTo({ offset: from(), distance: r * up, ms: 0 });
    await shot('9-' + id + '-closest', id + ' from ' + up + ' of its mean radius: just above the clouds', 6000);
    out.closest[id] = { radius: r, distance: rig.state.distance, detail: (() => { try { return sr.weather.state().air.worlds.find((w) => w.id === id).detail; } catch { return null; } })() };
  } catch (e) { look.errors.push('probe: the closest look at ' + id + ' threw: ' + (e && e.stack || e)); }
}
out.storms = (() => { try { return sr.weather.state().air.worlds.find((w) => w.id === 'jupiter'); } catch { return null; } })();
if (!out.weatherLoaded) out.fail = 'the weather module never loaded (tier ' + (sr.quality && sr.quality.bootTier) + ')';
return finish(out);

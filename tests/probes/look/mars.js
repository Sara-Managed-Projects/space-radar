// mars: the relief from MOLA's heights and the shadows it casts (spec 0073 requirement 5). The
// stage; the whole disc at noon (nothing may have got muddy); Olympus Mons near the evening
// terminator and again in the morning; Valles Marineris at a low Sun; a pole.
//
// THE CLOCK IS SET, NOT WAITED FOR. Where the Sun stands over Mars is worked out here from the
// scene itself: the Sun's direction in Mars's own axes gives the longitude under the Sun now, and
// it moves west once round in a sol (88 775 s). A place is near its EVENING terminator when the
// Sun is some 78 degrees of longitude WEST of it (12 degrees above its western horizon at the
// equator), and near its morning one when the Sun is 78 degrees east.
look.probe = 'mars';
const out = {};
const M = 'mars';
const SOL_S = 88775.244;
out.weatherLoaded = await until(() => sr.weather && typeof sr.weather.state === 'function', 30000);
await stage(M, 12000);
const d0 = rig.state.distance;
const mesh = sr.worlds.meshFor(M);
const R = mesh.scale.x;
const centre = () => ({ x: mesh.position.x, y: mesh.position.y, z: mesh.position.z });
// Mars's own axes in the scene: the columns of its matrix (x: longitude 0 on the equator, y: the pole).
const axes = () => { mesh.updateMatrixWorld(); const e = mesh.matrixWorld.elements; return { x: unit({ x: e[0], y: e[1], z: e[2] }), y: unit({ x: e[4], y: e[5], z: e[6] }), z: unit({ x: e[8], y: e[9], z: e[10] }) }; };
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
/** The way out of Mars at a latitude and an east longitude, in the scene: the shader's own convention (longitude = atan(-z, x)). */
const outward = (latDeg, lonDeg) => {
  const a = axes(); const la = latDeg * Math.PI / 180; const lo = lonDeg * Math.PI / 180;
  const l = { x: Math.cos(la) * Math.cos(lo), y: Math.sin(la), z: -Math.cos(la) * Math.sin(lo) };
  return unit({ x: a.x.x * l.x + a.y.x * l.y + a.z.x * l.z, y: a.x.y * l.x + a.y.y * l.y + a.z.y * l.z, z: a.x.z * l.x + a.y.z * l.y + a.z.z * l.z });
};
/** The east longitude and the latitude the Sun is over, now. */
const subsolar = () => { const a = axes(); const s = sunward(M); const lon = Math.atan2(-dot(s, a.z), dot(s, a.x)) * 180 / Math.PI; return { lon: (lon + 360) % 360, lat: Math.asin(dot(s, a.y)) * 180 / Math.PI }; };
/** Set the clock so the Sun is over `lonDeg` east: forward in time by the share of a sol it takes to get there. */
const sunOver = async (lonDeg) => {
  for (let pass = 0; pass < 2; pass++) {
    const west = (((subsolar().lon - lonDeg) % 360) + 360) % 360;   // the Sun moves west
    if (west < 0.3 || west > 359.7) break;
    sr.clock.goTo(sr.clock.now() + (west / 360) * SOL_S * 1000);
    await sleep(2500);
  }
  return subsolar();
};
const over = (latDeg, lonDeg, radii, leanToSun = 0.25) => rig.flyTo({ targetScene: centre(), offset: mix(outward(latDeg, lonDeg), 1, sunward(M), leanToSun), distance: R * radii, ms: 0 });
const relief = () => ({ slope: sr.worlds.hasRelief(M), steps: sr.worlds.castsShadows ? sr.worlds.castsShadows(M) : null });
out.reliefWorn = await until(() => sr.worlds.hasRelief(M) && sr.worlds.castsShadows && sr.worlds.castsShadows(M) > 0, 30000);
await shot('01-stage', 'Mars on its stage, as framed; relief ' + JSON.stringify(relief()) + '; weather ' + (out.weatherLoaded ? 'on' : 'OFF'));
out.now = { subsolar: subsolar(), discShare: sr.worlds.discShare(M), d0, R };
rig.flyTo({ targetScene: centre(), offset: sunward(M), distance: R * 3.0, ms: 0 });
await shot('02-noon-disc-now', 'the whole disc from the Sun\'s side, now: nothing may be muddy, no shadow anywhere but the limb', 7000);

// Olympus Mons, 18.65 N 226.2 E (its summit caldera 17.3 N 227.0 E), near the evening terminator.
out.olympusEvening = await sunOver(226.2 - 78);
over(18.65, 226.2, 2.9);
await shot('03-olympus-evening-wide', 'Tharsis at evening (the Sun over ' + out.olympusEvening.lon.toFixed(1) + ' E): Olympus Mons and the three Tharsis volcanoes throw shadows east', 8000);
over(18.65, 226.2, 1.9, 0.1);
await shot('04-olympus-evening', 'closer over Olympus Mons, the Sun about 12 degrees up in its west', 8000);
over(18.65, 226.2, 1.45, 0.05);
await shot('05-olympus-evening-close', 'closer still (the tiles come in at about this height): the scarp, the caldera, the shadow', 9000);
out.tilesClose = (() => { try { return sr.planetTiles ? sr.planetTiles.state() : null; } catch { return null; } })();
// The same mountain in the morning: the shadow must fall the other way.
out.olympusMorning = await sunOver(226.2 + 78);
over(18.65, 226.2, 1.9, 0.1);
await shot('06-olympus-morning', 'the same view in the morning (the Sun over ' + out.olympusMorning.lon.toFixed(1) + ' E): the shadows fall west', 8000);

// Valles Marineris, from Ius (7 S 275 E) to Coprates (14 S 302 E): centred on Melas, 11 S 288 E, at evening.
out.vallesEvening = await sunOver(288 - 78);
over(-11, 288, 2.2, 0.15);
await shot('07-valles-evening', 'Valles Marineris at a low evening Sun (over ' + out.vallesEvening.lon.toFixed(1) + ' E): the south-facing and west-facing walls lit, the floors in shadow', 8000);
over(-12, 295, 1.5, 0.05);
await shot('08-coprates-evening-close', 'closer over Coprates Chasma', 9000);
// The terminator itself, seen square-on: dirt would show here first.
rig.flyTo({ targetScene: centre(), offset: mix(outward(0, 288 - 78 + 90), 1, outward(0, 288 - 78), 0.05), distance: R * 2.6, ms: 0 });
await shot('09-terminator-square-on', 'the evening terminator seen square-on: craters and scarps should read as relief, the plains should not be speckled', 8000);
// A pole.
rig.flyTo({ targetScene: centre(), offset: mix(north(M), 1, sunward(M), 0.45), distance: R * 2.4, ms: 0 });
await shot('10-north-pole', 'over the north pole, leaning to the Sun: the cap stands 2 km over the plain round it; no pinch where the meridians meet', 8000);
rig.flyTo({ targetScene: centre(), offset: mix(north(M), -1, sunward(M), 0.45), distance: R * 2.4, ms: 0 });
await shot('11-south-pole', 'over the south pole', 8000);
// Noon again, over Tharsis this time.
out.tharsisNoon = await sunOver(250);
rig.flyTo({ targetScene: centre(), offset: sunward(M), distance: R * 3.0, ms: 0 });
await shot('12-noon-disc-tharsis', 'the whole disc at noon over Tharsis and Valles Marineris (the Sun over ' + out.tharsisNoon.lon.toFixed(1) + ' E): as clean as before', 7000);
out.relief = relief();
sr.clock.live();
if (!out.reliefWorn) out.fail = 'Mars never wore its relief and its height map: ' + JSON.stringify(out.relief) + ' (tier ' + (sr.quality && sr.quality.bootTier) + ')';
return finish(out);

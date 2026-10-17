// r12-nearby: the Moon at sunrise, its landing sites, the station's sunrise (release 1.2.0 stage W2-a,
// internal spec 0076, internal #864, #868, #917).
//
// EVERY MOON VIEW TWICE, from the same place at the same clock: with the shadows cast from LOLA's heights
// (scene/tiles.js CAST) and with them switched off for the shot (`setCastShadows(false)`: the BEFORE, the
// ground as main draws it, slope shading only). Copernicus and Tycho at a low morning Sun, Shackleton and
// the south pole, Apollo 15 at Hadley Rille and Apollo 17 in Taurus-Littrow with their traverses, and the
// gallery's own "Moon near" pose (tests/probes/look/heroes.js, 2026-10-15 12:00 UTC). Then the station
// at orbital sunrise: the instant the line from it to the Sun grazes the air 12 km up (copper), 30 km
// (orange) and in full sunlight, each with the reddening off too (`setAirReddening(false)`).
//
// THE CLOCK IS SET, NOT WAITED FOR: the Sun's place over the Moon is read from the scene (the mars
// probe's way) and the clock moved forward by the share of a synodic month it takes to put the Sun
// `elev` degrees over the place's eastern horizon. The places' coordinates are the IAU gazetteer's
// (planetarynames.wr.usgs.gov: Copernicus 1296, Tycho 6163, Shackleton 5450, read 2026-10-16) and the
// sites' own rows.
//
// Beside each picture: the Sun's height there, the window of heights (level, half-width, texel), the
// traverses shown, the renderer's counts, p50/p95 of the frames and network bytes (sr.perf). Fails when
// the shadows never came on at a desktop tier, or the station's sunrise was not found.
// Run it at `-f width=1600 -f height=900` and again with `-f mobile=true` (a phone is tier 0: no tiles,
// so the Moon's two pictures are the same there, which is the phone's truth).
look.probe = 'r12-nearby';
const out = { scenes: [], problems: [] };
const deg = Math.PI / 180;
const SYNODIC_S = 29.530589 * 86400;
const AT = Date.UTC(2026, 9, 15, 12, 0, 0);
const tilesMod = await import('/js/scene/tiles.js');
const shadowMod = await import('/js/scene/shadow.js');
try { if (sr.wantPerf && !sr.perf) await sr.wantPerf(); } catch (e) { look.warns.push('probe: sr.wantPerf: ' + e); }
const measure = async () => {
  if (!sr.perf) return null;
  sr.perf.mark();
  await until(() => sr.perf.count() >= 30, 8000, 100);
  const s = sr.perf.stats();
  return { p50Ms: s.p50Ms, p95Ms: s.p95Ms, frames: s.frames, calls: s.calls, gpuMiB: s.gpu ? s.gpu.totalMiB : null, net: s.net ? s.net.bytes : null };
};

// --- the Moon -------------------------------------------------------------------------------------------
const M = 'moon';
sr.clock.goTo(AT);
sr.clock.setPaused(true);
await stage(M, 12000);
const mesh = sr.worlds.meshFor(M);
const R = mesh.scale.x;
const RKM = 1737.4;
const centre = () => ({ x: mesh.position.x, y: mesh.position.y, z: mesh.position.z });
const axes = () => { mesh.updateMatrixWorld(); const e = mesh.matrixWorld.elements; return { x: unit({ x: e[0], y: e[1], z: e[2] }), y: unit({ x: e[4], y: e[5], z: e[6] }), z: unit({ x: e[8], y: e[9], z: e[10] }) }; };
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const add = (a, b, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k });
/** The way out of the Moon at a latitude and an east longitude, in the scene (longitude = atan(-z, x) in its own axes). */
const outward = (latDeg, lonDeg) => {
  const a = axes(); const la = latDeg * deg; const lo = lonDeg * deg;
  const l = { x: Math.cos(la) * Math.cos(lo), y: Math.sin(la), z: -Math.cos(la) * Math.sin(lo) };
  return unit({ x: a.x.x * l.x + a.y.x * l.y + a.z.x * l.z, y: a.x.y * l.x + a.y.y * l.y + a.z.y * l.z, z: a.x.z * l.x + a.y.z * l.y + a.z.z * l.z });
};
const subsolar = () => { const a = axes(); const s = sunward(M); const lon = Math.atan2(-dot(s, a.z), dot(s, a.x)) / deg; return { lon: (lon + 360) % 360, lat: Math.asin(dot(s, a.y)) / deg }; };
/** The Sun's elevation over a place now, degrees. */
const sunElev = (latDeg, lonDeg) => 90 - Math.acos(Math.max(-1, Math.min(1, dot(outward(latDeg, lonDeg), sunward(M))))) / deg;
/**
 * Forward in time until the Sun stands `elev` degrees over the place's EASTERN horizon (morning). The
 * point under the Sun moves west, once round in a synodic month; in the morning it is east of the place
 * by the hour angle h with sin(elev) = sin(lat) sin(dec) + cos(lat) cos(dec) cos(h).
 */
const sunrise = async (latDeg, lonDeg, elev) => {
  for (let pass = 0; pass < 3; pass++) {
    const ss = subsolar();
    const la = latDeg * deg; const dc = ss.lat * deg;
    const c = (Math.sin(elev * deg) - Math.sin(la) * Math.sin(dc)) / (Math.cos(la) * Math.cos(dc));
    const h = Math.acos(Math.max(-1, Math.min(1, c))) / deg;
    const want = (lonDeg + h) % 360;                      // the Sun's longitude then
    const west = (((ss.lon - want) % 360) + 360) % 360;   // how far it still has to move west
    if (west < 0.01 || west > 359.99) break;
    sr.clock.goTo(sr.clock.now() + (west / 360) * SYNODIC_S * 1000);
    await sleep(1500);
  }
  return Math.round(sunElev(latDeg, lonDeg) * 100) / 100;
};
/** Look at a place from `altKm` above, tipped `tiltDeg` from straight down, the camera `fromAz` degrees east of north of it. */
const look_ = (latDeg, lonDeg, altKm, tiltDeg = 35, fromAz = 180) => {
  const up = outward(latDeg, lonDeg);
  const n0 = axes().y;
  const north = unit(add(n0, up, -dot(n0, up)));
  const east = unit(cross(north, up));
  const side = unit(add({ x: north.x * Math.cos(fromAz * deg), y: north.y * Math.cos(fromAz * deg), z: north.z * Math.cos(fromAz * deg) }, east, Math.sin(fromAz * deg)));
  const dir = unit(add({ x: up.x * Math.cos(tiltDeg * deg), y: up.y * Math.cos(tiltDeg * deg), z: up.z * Math.cos(tiltDeg * deg) }, side, Math.sin(tiltDeg * deg)));
  const target = add(centre(), up, R);
  rig.flyTo({ targetScene: target, offset: dir, distance: (altKm / RKM) * R / Math.cos(tiltDeg * deg), ms: 0 });
};
const tilesState = () => { try { const t = sr.quality.tiles(); return t && t.sets ? t.sets['moon-lro-wac'] : null; } catch { return null; } };
const castReady = async (capMs = 90000) => until(() => { const s = tilesState(); return s && s.showing && s.loading === 0 && s.cast && s.cast.showing && !s.cast.building; }, capMs, 500);
const tilesReady = async (capMs = 60000) => until(() => { const s = tilesState(); return s && s.showing && s.loading === 0; }, capMs, 500);
/** One place, twice: shadows on (after) and off (before). */
const moonPair = async (name, note, sunDeg) => {
  tilesMod.setCastShadows(true);
  const okCast = await castReady();
  await sleep(2500);
  const m = await measure();
  const s = tilesState();
  const row = { name, note, sunDeg, castShown: okCast, cast: s ? s.cast : null, level: s ? s.level : null, traverses: s ? s.traverses : null, perf: m, credits: (() => { try { return sr.quality.credits(); } catch { return null; } })() };
  out.scenes.push(row);
  await shot(name + '-after', `${note}; the Sun ${sunDeg} degrees up; shadows cast from LOLA heights ${okCast ? 'ON' : 'NOT READY'}${s && s.cast ? ` (window level ${s.cast.level}, half ${s.cast.halfKm} km, texel ${s.cast.texelM} m, ${s.cast.steps} steps)` : ''}${s && s.traverses ? '; traverses ' + JSON.stringify(s.traverses.filter((t) => t.shown).map((t) => t.site)) : ''}${m ? `; p50 ${m.p50Ms} p95 ${m.p95Ms} ms, ${m.calls} calls` : ''}`);
  tilesMod.setCastShadows(false);
  await sleep(2500);
  await shot(name + '-before', `${note}; the same place and clock with the cast shadows switched off (main's look: slope shading only)`);
  tilesMod.setCastShadows(true);
  return okCast;
};

let anyCast = false;
// 1. The gallery's own pose (heroes.js "moon near", 1.5 radii from the centre, from the lit side), at its clock.
{
  if (!(await go(M, null, 6000))) out.problems.push('no Moon record');
  rig.flyTo({ offset: unit(mix(sunward(M), 1, north(M), 0.3)), distance: R * 1.5, ms: 0 });
  await tilesReady();
  anyCast = (await moonPair('01-gallery-moon-near', 'the heroes gallery\'s "Moon near" pose, 870 km up from the lit side, 2026-10-15 12:00 UTC', null)) || anyCast;
}
// 2. Copernicus (9.62 N, 20.08 W; 96 km): a morning Sun 8 degrees up, from 350 km and from 120 km.
{
  const lat = 9.62, lon = 339.92;
  const e = await sunrise(lat, lon, 8);
  look_(lat, lon, 350, 25, 180);
  await tilesReady();
  anyCast = (await moonPair('02-copernicus-350km', 'Copernicus at sunrise from 350 km, looking north', e)) || anyCast;
  look_(lat, lon, 110, 40, 200);
  await tilesReady();
  await moonPair('03-copernicus-110km', 'Copernicus at sunrise from 110 km, tipped 40 degrees, looking north-north-east', e);
}
// 3. Tycho (43.30 S, 11.22 W; 85 km): a morning Sun 6 degrees up.
{
  const lat = -43.30, lon = 348.78;
  const e = await sunrise(lat, lon, 6);
  look_(lat, lon, 160, 30, 180);
  await tilesReady();
  await moonPair('04-tycho-160km', 'Tycho at sunrise from 160 km, looking north', e);
}
// 4. Shackleton (89.67 S, 129.78 E; 21 km) and the south pole, wherever the Sun is (always within a degree and a half of the horizon).
{
  const lat = -89.67, lon = 129.78;
  const e = Math.round(sunElev(lat, lon) * 100) / 100;
  look_(lat, lon, 90, 30, 0);
  await tilesReady();
  await moonPair('05-shackleton-90km', 'Shackleton crater at the south pole from 90 km', e);
  rig.flyTo({ targetScene: centre(), offset: unit(mix(north(M), -1, sunward(M), 0.35)), distance: R * 1.35, ms: 0 });
  await tilesReady();
  await moonPair('06-south-pole-600km', 'the south pole from 600 km, leaning to the Sun', e);
}
// 5. Apollo 15 at Hadley Rille, Apollo 17 in Taurus-Littrow: the traverses on the ground, a morning Sun 12 degrees up.
for (const [id, name, lat, lon] of [['apollo-15', '07-apollo-15-hadley', 26.13239, 3.63330], ['apollo-17', '08-apollo-17-taurus-littrow', 20.1911, 30.7723]]) {
  const e = await sunrise(lat, lon, 12);
  const rec = sr.recordById(id);
  if (!rec) out.problems.push('missing record ' + id);
  look_(lat, lon, 45, 30, 180);
  await tilesReady();
  await moonPair(name, `${id.replace('-', ' ')} from 45 km with its traced traverse (yellow)`, e);
}
const moonTiles = tilesState();
out.moonTiles = moonTiles;
const desktopTier = (() => { try { return sr.quality.describe().tier >= 1; } catch { return false; } })();
if (desktopTier && !anyCast) out.fail = 'the cast shadows never came on at tier ' + sr.quality.describe().tier + ': ' + JSON.stringify(moonTiles && moonTiles.cast);

// --- the station at orbital sunrise -----------------------------------------------------------------------
sr.clock.goTo(AT);
await stage('earth', 9000);
const issId = ['sat-25544', '25544', 'iss'].find((x) => sr.recordById(x));
if (!issId) { out.problems.push('missing record sat-25544 (the ISS)'); }
else {
  const rec = sr.recordById(issId);
  if (rec.layer && !sr.isLayerOn(rec.layer)) sr.setLayerOn(rec.layer, true);
  const REKM = 6371;
  /** The height over the ground, km, at which the line from the station to the Sun passes the Earth; null on the day side. */
  const grazeKm = () => {
    const p = sr.positionOfRecord(rec); const e = sr.worlds.meshFor('earth'); const s = sr.worlds.meshFor('sun');
    if (!p || !e || !s) return null;
    const v = { x: p.x - e.position.x, y: p.y - e.position.y, z: p.z - e.position.z };
    const d = unit({ x: s.position.x - e.position.x, y: s.position.y - e.position.y, z: s.position.z - e.position.z });
    const along = dot(v, d);
    if (along > 0) return null;
    const perp = Math.hypot(v.x - along * d.x, v.y - along * d.y, v.z - along * d.z);
    const re = sr.worlds.drawnRadiusUnits('earth');
    return (perp / re - 1) * REKM;
  };
  // Step a minute at a time to the first sunrise after AT (in shadow, then a graze above 0 km).
  const t0 = sr.clock.now();
  let tIn = null;
  let tOut = null;
  for (let k = 0; k < 200; k++) {
    sr.clock.goTo(t0 + k * 30e3);
    await sleep(120);
    const g = grazeKm();
    if (g !== null && g < -20) tIn = sr.clock.now();
    else if (tIn !== null && (g === null || g > 0)) { tOut = sr.clock.now(); break; }
  }
  out.issSunrise = { tIn: tIn && new Date(tIn).toISOString(), tOut: tOut && new Date(tOut).toISOString() };
  if (tIn === null || tOut === null) { out.problems.push('no orbital sunrise found in 100 minutes'); }
  else {
    /** The instant the line grazes `km` up, by bisection between the last minute in shadow and the first out. */
    const when = async (km) => {
      let a = tIn; let b = tOut + 60e3;
      for (let i = 0; i < 22; i++) {
        const m = (a + b) / 2;
        sr.clock.goTo(m);
        await sleep(30);
        const g = grazeKm();
        if (g === null || g > km) b = m; else a = m;
      }
      sr.clock.goTo((a + b) / 2);
      await sleep(1200);
      return { at: new Date(sr.clock.now()).toISOString(), grazeKm: Math.round((grazeKm() ?? 999) * 10) / 10 };
    };
    // Frame the station as a click does, then close, from its sunward side and a little above.
    await when(30);
    sr.select(rec, { fly: true, undo: false });
    await sleep(8000);
    const d0 = rig.state.distance;
    const issPose = () => {
      const p = sr.positionOfRecord(rec); const e = sr.worlds.meshFor('earth');
      const upv = unit({ x: p.x - e.position.x, y: p.y - e.position.y, z: p.z - e.position.z });
      rig.flyTo({ offset: unit(mix(sunward('earth'), 1, upv, 0.45)), distance: d0 * 0.4, ms: 0 });
    };
    for (const [km, label] of [[12, 'copper: the line to the Sun grazes the air 12 km up'], [30, 'orange: 30 km up'], [80, 'white: 80 km up, past the air']]) {
      const w = await when(km);
      issPose();
      await sleep(3000);
      const m = await measure();
      shadowMod.setAirReddening(true);
      await sleep(1500);
      out.scenes.push({ name: `iss-sunrise-${km}km`, ...w, perf: m });
      await shot(`09-iss-sunrise-${km}km-after`, `the station at orbital sunrise, ${label} (${w.at}, graze ${w.grazeKm} km), the reddening ON${m ? `; p50 ${m.p50Ms} p95 ${m.p95Ms} ms, ${m.calls} calls` : ''}`);
      shadowMod.setAirReddening(false);
      await sleep(1500);
      await shot(`09-iss-sunrise-${km}km-before`, `the same instant with the reddening off (main's look: white light, the geometric penumbra only)`);
      shadowMod.setAirReddening(true);
    }
  }
}
sr.clock.goTo(AT);
sr.clock.live();
return finish(out);

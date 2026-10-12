// The path of the Moon's shadow and the shadow's two radii (public #273): scene/eclipsepath.js and
// the two functions it leans on in scene/eclipse.js. Run: node tests/test_eclipse_path.mjs
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const Astronomy = await import(join(ROOT, 'site/vendor/astronomy.js'));
const { axisPoint, centralPath, ribbon, ecefToEarthLocal, EARTH_EQUATORIAL_RADIUS_KM, MIN_HALF_KM, LIFT } = await import(join(ROOT, 'site/js/scene/eclipsepath.js'));
const { shadowRadiiKm, discGeometry, discOverlap, obscuration, SUN_RADIUS_KM, MOON_RADIUS_KM } = await import(join(ROOT, 'site/js/scene/eclipse.js'));
const { geodeticToEcef } = await import(join(ROOT, 'site/js/propagate/frames.js'));

const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const DEG = Math.PI / 180;
const AU = Astronomy.KM_PER_AU;

// ---- 1. the shadow's radii: similar triangles, checked against round numbers -------------------
{
  // At the Moon itself the umbra is the Moon and so is the penumbra.
  const at0 = shadowRadiiKm(0);
  check(Math.abs(at0.umbraKm - MOON_RADIUS_KM) < 1e-9 && Math.abs(at0.penumbraKm - MOON_RADIUS_KM) < 1e-9, 'at the Moon both radii are the Moon\'s');
  // The umbra closes where u = Rmoon / (Rsun - Rmoon): about 374 000 km behind the Moon at 1 au.
  const uApex = MOON_RADIUS_KM / (SUN_RADIUS_KM - MOON_RADIUS_KM);
  check(Math.abs(shadowRadiiKm(uApex).umbraKm) < 1e-6, 'the umbra\'s radius is 0 at the cone\'s apex');
  const apexKm = uApex * (AU - 384400);
  check(apexKm > 365000 && apexKm < 380000, `the cone's apex is about 373 000 km behind the Moon at the mean distances (${Math.round(apexKm)})`);
  check(shadowRadiiKm(uApex * 1.02).umbraKm < 0, 'past the apex the radius is negative: an annular eclipse');
  // The penumbra at the Earth's distance: about 3 500 km.
  const pen = shadowRadiiKm(378000 / (AU - 384400)).penumbraKm;
  check(pen > 3400 && pen < 3600, `the penumbra is about 3 500 km in radius at the Earth (${Math.round(pen)})`);
}

// ---- 2. the two edges are lines in the discs' geometry -----------------------------------------
{
  const sun = { x: AU, y: 0, z: 0 };
  const moon = { x: 370000, y: 0, z: 0 };
  const g0 = discGeometry({ x: 6378, y: 0, z: 0 }, sun, moon);
  check(g0 && g0.x < 1e-9 && g0.r > 1, `on the axis, under a near Moon, the Moon's disc is the larger (r ${g0 && g0.r.toFixed(4)})`);
  // Walk out across the axis: the core ends where x = |1 - r|, the whole shadow where x = 1 + r.
  let coreEnd = null, shadowEnd = null;
  for (let y = 0; y <= 5000; y += 1) {
    const p = { x: 6378, y, z: 0 };
    const o = obscuration(p, sun, moon);
    if (coreEnd === null && o < 1) coreEnd = y;
    if (shadowEnd === null && o === 0) shadowEnd = y;
  }
  const gc = discGeometry({ x: 6378, y: coreEnd, z: 0 }, sun, moon);
  const gs = discGeometry({ x: 6378, y: shadowEnd, z: 0 }, sun, moon);
  check(Math.abs(gc.x - Math.abs(1 - gc.r)) < 0.01, `total cover ends where x = |1 - r| (${gc.x.toFixed(4)} against ${Math.abs(1 - gc.r).toFixed(4)})`);
  check(Math.abs(gs.x - (1 + gs.r)) < 0.01, `the shadow ends where x = 1 + r (${gs.x.toFixed(4)} against ${(1 + gs.r).toFixed(4)})`);
  check(discOverlap(gc.x, gc.r) > 0.99 && discOverlap(gs.x, gs.r) < 0.001, 'and discOverlap() agrees at both');
  // The same two radii from the similar triangles, within a few km (the walk is along a flat line, 1 km steps).
  const rr = shadowRadiiKm((370000 - 6378) / (AU - 370000));
  check(Math.abs(rr.umbraKm - coreEnd) < 3 && Math.abs(rr.penumbraKm - shadowEnd) < 3, `shadowRadiiKm() gives the same edges: ${rr.umbraKm.toFixed(1)} and ${rr.penumbraKm.toFixed(1)} km against ${coreEnd} and ${shadowEnd}`);
}

// ---- 3. the axis point against the library's own, at the library's peak ------------------------
const seen = { total: null, annular: null };
let e = Astronomy.SearchGlobalSolarEclipse(new Date('2026-10-08T00:00:00Z'));
for (let i = 0; i < 12 && !(seen.total && seen.annular); i++) {
  if (e.kind === 'total' && !seen.total) seen.total = e;
  if (e.kind === 'annular' && !seen.annular) seen.annular = e;
  e = Astronomy.NextGlobalSolarEclipse(e.peak);
}
check(seen.total && seen.total.peak.date.toISOString().startsWith('2027-08-02T10:0'), `the next total eclipse is 2027-08-02 (${seen.total && seen.total.peak.date.toISOString()})`);
for (const kind of ['total', 'annular']) {
  const ev = seen[kind];
  if (!ev) { problems.push(`no ${kind} eclipse found`); continue; }
  const tMs = ev.peak.date.getTime();
  const p = axisPoint(tMs);
  check(p && Math.abs(p.latDeg - ev.latitude) < 0.01 && Math.abs(p.lonDeg - ev.longitude) < 0.01,
    `${kind} ${ev.peak.date.toISOString().slice(0, 10)}: the axis meets the ground at the library's point (${p && p.latDeg.toFixed(3)}, ${p && p.lonDeg.toFixed(3)} against ${ev.latitude.toFixed(3)}, ${ev.longitude.toFixed(3)})`);
  if (!p) continue;
  check(kind === 'total' ? p.umbraKm > 0 : p.umbraKm < 0, `${kind}: the core's radius has the ${kind === 'total' ? 'positive' : 'negative'} sign (${p.umbraKm.toFixed(1)} km)`);
  check(p.penumbraKm > 3300 && p.penumbraKm < 3700, `${kind}: the penumbra's radius is about 3 500 km (${Math.round(p.penumbraKm)})`);
  // The Earth-fixed point is the geodetic point the latitude and longitude name (WGS84 against the
  // library's IAU ellipsoid: metres apart).
  const ecef = geodeticToEcef(p.latDeg * DEG, p.lonDeg * DEG, 0);
  const miss = Math.hypot(ecef.x - p.ecefKm.x, ecef.y - p.ecefKm.y, ecef.z - p.ecefKm.z);
  check(miss < 1, `${kind}: the Earth-fixed point is that latitude and longitude on the ellipsoid (${miss.toFixed(3)} km apart)`);

  // The path: unbroken, a minute apart, through the peak, a few hours long.
  const path = centralPath(tMs);
  const hours = path.length ? (path[path.length - 1].tMs - path[0].tMs) / 3600e3 : 0;
  check(path.length > 100 && hours > 2 && hours < 5.6, `${kind}: the central path is ${path.length} points over ${hours.toFixed(2)} h`);
  check(path.every((q, i) => i === 0 || q.tMs - path[i - 1].tMs === 60000), `${kind}: one point a minute, none missing`);
  check(path.some((q) => Math.abs(q.tMs - tMs) <= 30000), `${kind}: the peak is on it`);
  let worstStep = 0;
  for (let i = 1; i < path.length; i++) worstStep = Math.max(worstStep, Math.hypot(path[i].ecefKm.x - path[i - 1].ecefKm.x, path[i].ecefKm.y - path[i - 1].ecefKm.y, path[i].ecefKm.z - path[i - 1].ecefKm.z));
  check(worstStep < 1500, `${kind}: no jump along it (the longest minute is ${Math.round(worstStep)} km, at an end where the shadow grazes)`);
  // Found from the trip's first stop too, an hour and a half before the peak, and it is the same path.
  const early = centralPath(tMs - 5400e3);
  check(early.length === path.length && early[0].tMs === path[0].tMs, `${kind}: the same path is found from 90 minutes before the peak`);
  check(axisPoint(path[0].tMs - 60000) === null && axisPoint(path[path.length - 1].tMs + 60000) === null, `${kind}: a minute past either end the axis misses the Earth`);

  // The ribbon: on the globe, as wide as the core (or the floor), the track down its middle.
  const r = ribbon(path);
  check(r.positions.length === path.length * 6 && r.index.length === (path.length - 1) * 6 && r.edges.length === path.length * 6, `${kind}: two vertices a point, two triangles a step, two edges`);
  const mid = path.length >> 1;
  const c = ecefToEarthLocal(path[mid].ecefKm);
  const a = [r.positions[mid * 6], r.positions[mid * 6 + 1], r.positions[mid * 6 + 2]];
  const b = [r.positions[mid * 6 + 3], r.positions[mid * 6 + 4], r.positions[mid * 6 + 5]];
  const widthKm = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / LIFT * EARTH_EQUATORIAL_RADIUS_KM;
  const want = 2 * Math.max(Math.abs(path[mid].umbraKm), MIN_HALF_KM);
  check(Math.abs(widthKm - want) < 0.5, `${kind}: mid-path the ribbon is ${widthKm.toFixed(1)} km wide, twice the core's radius or the floor (${want.toFixed(1)})`);
  const m = [(a[0] + b[0]) / 2 / LIFT, (a[1] + b[1]) / 2 / LIFT, (a[2] + b[2]) / 2 / LIFT];
  check(Math.hypot(m[0] - c[0], m[1] - c[1], m[2] - c[2]) * EARTH_EQUATORIAL_RADIUS_KM < 0.5, `${kind}: the track runs down its middle`);
  check([...r.positions].every(Number.isFinite), `${kind}: every vertex is a number`);
}
// 2027-08-02: the path of totality is about 258 km wide at greatest eclipse (NASA's eclipse page
// gives 258 km); across the axis that is a little less than on the ground under a Sun 82 degrees up.
if (seen.total) {
  const p = axisPoint(seen.total.peak.date.getTime());
  check(p && 2 * p.umbraKm > 235 && 2 * p.umbraKm < 265, `2027-08-02: the core is ${p && (2 * p.umbraKm).toFixed(0)} km across at greatest eclipse (published: 258 km on the ground)`);
}

// ---- 4. no eclipse, no path -------------------------------------------------------------------
check(centralPath(Date.parse('2026-10-08T12:00:00Z')).length === 0, 'on a day with no eclipse there is no path');

if (problems.length) { console.error(`eclipse path: ${problems.length} problem(s)\n  - ` + problems.join('\n  - ')); process.exit(1); }
console.log(`eclipse path ok: the axis lands on Astronomy Engine's own point for ${seen.total.peak.date.toISOString().slice(0, 10)} (total) and ${seen.annular.peak.date.toISOString().slice(0, 10)} (annular); the radii, the edges and the ribbon hold`);

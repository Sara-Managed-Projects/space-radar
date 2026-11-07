// sky/worldframe.js -- the ground sky's observer, standing on another world (release 2.0.0 batch f7-ground, forge #147).
//
// Contract: SKY_WORLDS, worldAxes(world, tMs) -> {ra, dec, w} (degrees) | null,
//           worldEqjToLocal(world, latDeg, lonDeg, tMs) -> number[9] | null,
//           observerHelioEqjKm(world, latDeg, lonDeg, tMs) -> {x, y, z} | null,
//           skyTargets(world) -> string[], worldBodyView(id, tMs, place) -> view | null,
//           poleOf(world, tMs) -> number[3] (J2000 unit vector), poleStar(world, tMs, stars) -> {index, sepDeg, mag} | null,
//           localSolarHours(world, lonDeg, tMs) -> 0..24, solarDayHours(world),
//           crossings(fn, t0, t1, stepMs) -> [{tMs, kind}], nextRiseSet(id, place, tMs) -> {rise, set},
//           transits(front, back, place, t0, t1) -> [{tMs, sepDeg}], parseSkyLink(text) -> {world, site|lat,lon} | null
// Proxima Centauri b and TRAPPIST-1 e are worlds here too, every number about them MODELLED (sky/exoskies.js says what
// is measured and what is assumed); their star is their `light` and their `parent`.
// Pure given Astronomy Engine and propagate/: no DOM, no three. scene/groundstage.js draws from these and
// tests/test_worldframe.mjs holds them to the numbers below.
//
// WHY A FRAME OF ITS OWN AND NOT sky/skybodies.js WITH A FLAG. skybodies.js stands on the Earth through Astronomy
// Engine's Observer and Rotation_EQJ_HOR, which know only the Earth. Everything that turns a J2000 direction into a
// place in the sky is ONE rotation (skybodies.js eqjToLocal), so another world needs only another rotation, written
// the same way: nine numbers, row-major, from equatorial J2000 to the view's local frame (+X east, +Y up, +Z south).
// worldEqjToLocal('earth', ...) IS skybodies.js's matrix; the other worlds are held to independent numbers in
// tests/test_worldframe.mjs (Mars's local solar time to Allison and McEwen's Mars24 algorithm, the sub-planet points of
// Titan and Europa, where the IAU's prime meridian puts the planet overhead).
//
// WHICH WAY A WORLD TURNS is the IAU Working Group on Cartographic Coordinates and Rotational Elements, 2015 report:
// B. A. Archinal et al. (2018), Celestial Mechanics and Dynamical Astronomy 130:22, doi:10.1007/s10569-017-9805-5,
// Tables 1 and 2: the pole's right ascension alpha0 and declination delta0, and W, the angle of the prime meridian.
//   the Moon, Mars, the Earth   Astronomy Engine's RotationAxis(), which implements that report (the Moon with its
//                               13 periodic terms, Mars with the 2015 report's new series) -- the same call
//                               propagate/frames.js turns the globes by, so a site here and on the globe agree;
//   Titan                       alpha0 = 39.4827, delta0 = 83.4279, W = 186.5855 + 22.5769768 d (Table 2);
//   Europa                      alpha0 = 268.08 - 0.009 T + 1.086 sin J4 + 0.060 sin J5 + 0.015 sin J6 + 0.009 sin J7,
//                               delta0 = 64.51 + 0.003 T + 0.468 cos J4 + 0.026 cos J5 + 0.007 cos J6 + 0.002 cos J7,
//                               W = 36.022 + 101.3747235 d - 0.980 sin J4 - 0.054 sin J5 - 0.014 sin J6 - 0.008 sin J7,
//                               with Jupiter's J4 = 355.80 + 1191.3 T, J5 = 119.90 + 262.1 T, J6 = 229.80 + 64.3 T,
//                               J7 = 352.25 + 2382.6 T (Table 2 and its footnote).
// d is days and T Julian centuries from J2000.0 (TDB; UT here, a minute's difference that no sky shows).
// Longitudes are planetocentric and EAST-positive on every world, the convention registry/sites.yaml keeps.
//
// WHERE THINGS ARE: propagate/frames.js worldHelioEclKm, the app's own ephemeris (Astronomy Engine's planets, the
// L1.2 theory for Jupiter's moons, and propagate/moons.js's fits to JPL Horizons for Phobos, Deimos and Titan). The
// observer stands on the sphere of the world's mean radius (propagate/frames.js WORLD_RADIUS_KM). No light time and
// no aberration: from Mars they move the Earth by less than a hundredth of a degree.
//
// HOW BRIGHT: V(1,0) and the phase laws are modelled, not measured: A. Mallama and J. L. Hilton (2018), "Computing
// apparent planetary magnitudes for The Astronomical Almanac", Astronomy and Computing 25, 10-24 (the Earth's whole
// phase curve, the others' V(1,0) with a linear phase coefficient through their curves' first 60 degrees), and the
// moons' V(1,0) from JPL's planetary satellite physical parameters table (Phobos 11.8, Deimos 12.89, Io -1.68,
// Europa -1.41, Ganymede -2.09, Callisto -1.05). A planet's magnitude from another world is good to a few tenths.

import * as Astronomy from '../../vendor/astronomy.js';
import { worldHelioEclKm, eclipticToEquatorial, WORLD_RADIUS_KM, KM_PER_AU, moonOffsetKm, moonParent } from '../propagate/frames.js';
import { EXO_WORLDS, EXO_BODIES, isExoWorld, isExoBody, exoAxes, exoPositionEqjKm, exoMagnitude, exoPlanetMagnitude } from './exoskies.js';

const DEG = Math.PI / 180;
const J2000_MS = Date.UTC(2000, 0, 1, 12);
const DAY_MS = 86400000;

/**
 * The worlds a visitor can stand on and look up from. `day` is the mean solar day in hours (Mars's sol, the
 * Moon's synodic month; Titan and Europa turn once an orbit, so their solar day is a little longer than their
 * orbit round the planet). `air` is whether the sky has colour by day (sky/worldair.js).
 */
export const SKY_WORLDS = {
  earth: { radiusKm: 6371.0, day: 24, air: true },
  moon: { radiusKm: 1737.4, day: 708.734, air: false },
  mars: { radiusKm: 3389.5, day: 24.6597, air: true },
  titan: { radiusKm: 2574.7, day: 382.69, air: true, parent: 'saturn' },
  europa: { radiusKm: 1560.8, day: 85.23, air: false, parent: 'jupiter' },
  // Two planets of other stars (sky/exoskies.js: all modelled). Assumed locked, so the star is their `parent` (it
  // hangs still), their `light` (it lights the ground and colours the sky), and their solar day is their year.
  'proxima-b': { radiusKm: EXO_WORLDS['proxima-b'].radiusKm, day: 11.18465 * 24, air: true, parent: 'proxima', light: 'proxima', exo: true },
  'trappist-1e': { radiusKm: EXO_WORLDS['trappist-1e'].radiusKm, day: 6.101013 * 24, air: true, parent: 'trappist-1', light: 'trappist-1', exo: true },
};

/** What a body is called on the `{id}` the app uses (propagate/frames.js world ids) and how big it is. */
const TARGET = {
  sun: { radiusKm: 695700, v10: -26.74 },
  mercury: { radiusKm: 2439.7, v10: -0.613, k: 0.038 },
  venus: { radiusKm: 6051.8, v10: -4.384, k: 0.013 },
  earth: { radiusKm: 6371.0, v10: -3.99, earth: true },
  moon: { radiusKm: 1737.4, v10: 0.21, k: 0.026 },
  mars: { radiusKm: 3389.5, v10: -1.601, k: 0.023 },
  phobos: { radiusKm: 11.08, v10: 11.8, k: 0.03 },
  deimos: { radiusKm: 6.2, v10: 12.89, k: 0.03 },
  jupiter: { radiusKm: 69911, v10: -9.395, k: 0.005 },
  io: { radiusKm: 1821.6, v10: -1.68, k: 0.02 },
  europa: { radiusKm: 1560.8, v10: -1.41, k: 0.02 },
  ganymede: { radiusKm: 2634.1, v10: -2.09, k: 0.02 },
  callisto: { radiusKm: 2410.3, v10: -1.05, k: 0.02 },
  saturn: { radiusKm: 58232, v10: -8.914, k: 0.026 },
  titan: { radiusKm: 2574.7, v10: -1.28, k: 0.02 },
  uranus: { radiusKm: 25362, v10: -7.11, k: 0.005 },
  neptune: { radiusKm: 24622, v10: -7.0, k: 0.005 },
};
const PLANETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
/** The neighbours a world's sky shows besides the Sun and the planets. */
const NEIGHBOURS = {
  earth: ['moon'],
  moon: [],
  // The Earth's Moon is a point beside the Earth from Mars (about magnitude +1 at its best); farther out it is lost in the glare.
  mars: ['phobos', 'deimos', 'moon'],
  titan: [],
  europa: ['io', 'ganymede', 'callisto'],
  'proxima-b': ['proxima', 'proxima-d', 'alpha-cen-a', 'alpha-cen-b'],
  'trappist-1e': ['trappist-1', 'trappist-1b', 'trappist-1c', 'trappist-1d', 'trappist-1f', 'trappist-1g', 'trappist-1h'],
};

function unit(v) {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}
const wrap360 = (d) => ((d % 360) + 360) % 360;

/** The IAU pole and prime meridian of a world at an instant, degrees. Null for a world not in SKY_WORLDS. */
export function worldAxes(world, tMs) {
  if (!Number.isFinite(tMs)) return null;
  const date = new Date(tMs);
  if (world === 'moon' || world === 'mars' || world === 'earth') {
    const body = { moon: Astronomy.Body.Moon, mars: Astronomy.Body.Mars, earth: Astronomy.Body.Earth }[world];
    try {
      const a = Astronomy.RotationAxis(body, date);
      return { ra: a.ra * 15, dec: a.dec, w: wrap360(a.spin) };
    } catch {
      return null;
    }
  }
  const d = (tMs - J2000_MS) / DAY_MS;
  const T = d / 36525;
  if (world === 'titan') return { ra: 39.4827, dec: 83.4279, w: wrap360(186.5855 + 22.5769768 * d) };
  if (world === 'europa') {
    const J4 = (355.80 + 1191.3 * T) * DEG;
    const J5 = (119.90 + 262.1 * T) * DEG;
    const J6 = (229.80 + 64.3 * T) * DEG;
    const J7 = (352.25 + 2382.6 * T) * DEG;
    return {
      ra: 268.08 - 0.009 * T + 1.086 * Math.sin(J4) + 0.060 * Math.sin(J5) + 0.015 * Math.sin(J6) + 0.009 * Math.sin(J7),
      dec: 64.51 + 0.003 * T + 0.468 * Math.cos(J4) + 0.026 * Math.cos(J5) + 0.007 * Math.cos(J6) + 0.002 * Math.cos(J7),
      w: wrap360(36.022 + 101.3747235 * d - 0.980 * Math.sin(J4) - 0.054 * Math.sin(J5) - 0.014 * Math.sin(J6) - 0.008 * Math.sin(J7)),
    };
  }
  return null;
}

/** The body-fixed axes in J2000: body-fixed -> J2000 is Rz(alpha0 + 90) Rx(90 - delta0) Rz(W), the IAU's composition. */
function fixedAxes(ax) {
  const a = (ax.ra + 90) * DEG;
  const b = (90 - ax.dec) * DEG;
  const w = ax.w * DEG;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cw = Math.cos(w), sw = Math.sin(w);
  // Columns of Rz(a) Rx(b) Rz(w): the images of the body's x, y and z.
  const x = [ca * cw - sa * cb * sw, sa * cw + ca * cb * sw, sb * sw];
  const y = [-ca * sw - sa * cb * cw, -sa * sw + ca * cb * cw, sb * cw];
  const z = [sa * sb, -ca * sb, cb];
  return { x, y, z };
}

/** A world's body-fixed axes in J2000: the IAU's for the Solar System, the locked model's for a planet of another star. */
function axesOf(world, tMs) {
  if (isExoWorld(world)) return exoAxes(world, tMs);
  const ax = worldAxes(world, tMs);
  return ax ? fixedAxes(ax) : null;
}

/** The world's north pole as a J2000 unit vector (the IAU's north: the pole on the north side of the invariable plane). */
export function poleOf(world, tMs) {
  const F = axesOf(world, tMs);
  return F ? F.z : null;
}

/** East, up and north at a place, as J2000 unit vectors. */
function placeAxes(world, latDeg, lonDeg, tMs) {
  const F = axesOf(world, tMs);
  if (!F || !Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) return null;
  const p = latDeg * DEG, l = lonDeg * DEG;
  const cp = Math.cos(p), sp = Math.sin(p), cl = Math.cos(l), sl = Math.sin(l);
  const mix = (a, b, c) => [0, 1, 2].map((i) => a * F.x[i] + b * F.y[i] + c * F.z[i]);
  return { east: mix(-sl, cl, 0), up: mix(cp * cl, cp * sl, sp), north: mix(-sp * cl, -sp * sl, cp) };
}

/**
 * The rotation from equatorial J2000 to the local frame at a place on a world, nine numbers row-major: the same
 * convention as sky/skybodies.js eqjToLocal (+X east, +Y up, +Z south). No refraction.
 */
export function worldEqjToLocal(world, latDeg, lonDeg, tMs) {
  // The Earth is sky/skybodies.js's own frame: its turn is sidereal time with nutation, which the IAU's W (counted
  // from the node on the J2000 equator) is not, by the precession since 2000 -- 0.4 degrees in 2026.
  if (world === 'earth') {
    if (!Number.isFinite(tMs) || !Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) return null;
    const r = Astronomy.Rotation_EQJ_HOR(new Date(tMs), new Astronomy.Observer(latDeg, lonDeg, 0)).rot;
    return [-r[0][1], -r[1][1], -r[2][1], r[0][2], r[1][2], r[2][2], -r[0][0], -r[1][0], -r[2][0]];
  }
  const P = placeAxes(world, latDeg, lonDeg, tMs);
  if (!P) return null;
  return [...P.east, ...P.up, -P.north[0], -P.north[1], -P.north[2]];
}

/** A J2000 vector through a worldEqjToLocal matrix. */
export function toLocal(m, v) {
  return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
}

/** Altitude and azimuth (from north, clockwise) of a local direction, degrees: sky/skybodies.js altAzOf. */
export function altAz(l) {
  return { altDeg: Math.asin(Math.max(-1, Math.min(1, l[1]))) / DEG, azDeg: wrap360(Math.atan2(l[0], -l[2]) / DEG) };
}

function helioEqjKm(id, tMs) {
  if (isExoBody(id)) return exoPositionEqjKm(id, tMs);
  const e = worldHelioEclKm(id, tMs);
  return e ? eclipticToEquatorial(e) : null;
}

/** Where the observer stands: the world's centre plus the place on its mean sphere, heliocentric J2000 km. */
export function observerHelioEqjKm(world, latDeg, lonDeg, tMs) {
  const P = placeAxes(world, latDeg, lonDeg, tMs);
  const c = helioEqjKm(world, tMs);
  const r = SKY_WORLDS[world] ? SKY_WORLDS[world].radiusKm : (WORLD_RADIUS_KM[world] || 0);
  if (!P || !c) return null;
  return { x: c.x + r * P.up[0], y: c.y + r * P.up[1], z: c.z + r * P.up[2] };
}

/** The bodies in a world's sky: the Sun, the other planets, its neighbours, and its parent planet for a moon. */
export function skyTargets(world) {
  const w = SKY_WORLDS[world];
  if (!w) return [];
  // From another star the Solar System's planets are far too faint to see; the Sun is a star among the rest.
  const out = w.exo ? ['sun', ...NEIGHBOURS[world].filter((id) => id !== world)] : ['sun', ...PLANETS.filter((p) => p !== world), ...(NEIGHBOURS[world] || [])];
  return out.filter((id, i) => out.indexOf(id) === i);
}

/** The Earth's phase law (Mallama and Hilton 2018, equation 6, to 140 degrees). */
function earthPhaseMag(alphaDeg) {
  return -1.060e-3 * alphaDeg + 2.054e-4 * alphaDeg * alphaDeg;
}

/**
 * One body from one place on a world at one instant: the shape of sky/skybodies.js bodyView --
 * { id, dir (J2000 unit, topocentric), local, altDeg, azDeg, distAu, diameterDeg, mag, phaseFraction, phaseAngleDeg, toSun }.
 * `place` is { world, latDeg, lonDeg }. Null for an id the world's sky does not have, or outside the ephemeris.
 */
export function worldBodyView(id, tMs, place, cache) {
  const row = TARGET[id] || (isExoBody(id) ? EXO_BODIES[id] : null);
  if (!row || !place || id === place.world) return null;
  const obs = (cache && cache.obs) || observerHelioEqjKm(place.world, place.latDeg, place.lonDeg, tMs);
  const m = (cache && cache.m) || worldEqjToLocal(place.world, place.latDeg, place.lonDeg, tMs);
  if (!obs || !m) return null;
  let tgt;
  // A moon close to its planet is taken relative to the observer's own world's centre where they share it, so the
  // float64 difference of two 1e9 km vectors never decides where Phobos is.
  const sameParent = moonParent(id) && moonParent(id) === place.world;
  if (sameParent) {
    const off = moonOffsetKm(id, tMs);
    const c = helioEqjKm(place.world, tMs);
    if (!off || !c) return null;
    tgt = { x: c.x + off.x, y: c.y + off.y, z: c.z + off.z };
  } else {
    tgt = helioEqjKm(id, tMs);
  }
  if (!tgt) return null;
  const v = [tgt.x - obs.x, tgt.y - obs.y, tgt.z - obs.z];
  const distKm = Math.hypot(v[0], v[1], v[2]);
  const dir = unit(v);
  const local = toLocal(m, dir);
  const { altDeg, azDeg } = altAz(local);
  const diameterDeg = (2 * Math.asin(Math.min(1, row.radiusKm / distKm))) / DEG;
  if (id === 'sun') {
    // The Sun is 1 AU brighter by the inverse square: -26.74 at 1 AU.
    const au = distKm / KM_PER_AU;
    return { id, dir, local, altDeg, azDeg, distAu: au, diameterDeg, mag: -26.74 + 5 * Math.log10(au), phaseFraction: 1, phaseAngleDeg: 0, toSun: dir };
  }
  if (isExoBody(id) && row.kind === 'star') {
    // A star of another system: no phase; its brightness from sky/exoskies.js (modelled).
    return { id, dir, local, altDeg, azDeg, distAu: distKm / KM_PER_AU, diameterDeg, mag: exoMagnitude(id, obs), phaseFraction: 1, phaseAngleDeg: 0, toSun: dir, star: true, teffK: row.teffK };
  }
  // What lights it: the Sun, or a planet of another star's own star.
  const lamp = isExoBody(id) ? helioEqjKm(row.system, tMs) : { x: 0, y: 0, z: 0 };
  const rSun = Math.hypot(tgt.x - lamp.x, tgt.y - lamp.y, tgt.z - lamp.z);
  const toSun = unit([lamp.x - tgt.x, lamp.y - tgt.y, lamp.z - tgt.z]);
  const toObs = unit([-v[0], -v[1], -v[2]]);
  const cosA = Math.max(-1, Math.min(1, toSun[0] * toObs[0] + toSun[1] * toObs[1] + toSun[2] * toObs[2]));
  const alpha = Math.acos(cosA) / DEG;
  const phase = row.earth ? earthPhaseMag(Math.min(alpha, 140)) : (row.k || 0) * alpha;
  const mag = isExoBody(id) ? exoPlanetMagnitude(id, tMs, obs) : row.v10 + 5 * Math.log10((rSun / KM_PER_AU) * (distKm / KM_PER_AU)) + phase;
  return { id, dir, local, altDeg, azDeg, distAu: distKm / KM_PER_AU, diameterDeg, mag, phaseFraction: (1 + cosA) / 2, phaseAngleDeg: alpha, toSun };
}

/**
 * The brightest star within `withinDeg` of a world's north pole, from a star list of J2000 unit vectors and
 * magnitudes ({pos: Float32Array of xyz, mag: Float32Array}, sorted brightest first or not). Null when none is
 * brighter than `faintest`. The Earth's answer is Polaris; Mars's is none brighter than Deneb's neighbours, which is
 * why the stage words it as "the nearest bright star".
 */
export function poleStar(world, tMs, stars, { withinDeg = 10, faintest = 4.5 } = {}) {
  const p = poleOf(world, tMs);
  if (!p || !stars || !stars.pos) return null;
  const cosMax = Math.cos(withinDeg * DEG);
  let best = null;
  const n = stars.mag.length;
  for (let i = 0; i < n; i += 1) {
    const mag = stars.mag[i];
    if (!(mag <= faintest)) continue;
    const c = stars.pos[i * 3] * p[0] + stars.pos[i * 3 + 1] * p[1] + stars.pos[i * 3 + 2] * p[2];
    if (c < cosMax) continue;
    // Brightest first, and of two near equals (within half a magnitude) the closer to the pole.
    const sepDeg = Math.acos(Math.min(1, c)) / DEG;
    const score = mag + sepDeg * 0.08;
    if (!best || score < best.score) best = { index: i, sepDeg, mag, score };
  }
  if (!best) return null;
  return { index: best.index, sepDeg: best.sepDeg, mag: best.mag };
}

/** A world's mean solar day in hours: SKY_WORLDS[w].day. */
export function solarDayHours(world) {
  return SKY_WORLDS[world] ? SKY_WORLDS[world].day : null;
}

/**
 * Local true solar time at a longitude, in that world's own 24 "hours" (Mars's hours are 1.0275 of ours, which is
 * how the rovers' teams keep time): 12 when the Sun crosses the meridian.
 */
export function localSolarHours(world, lonDeg, tMs) {
  const F = axesOf(world, tMs);
  const c = helioEqjKm(world, tMs);
  if (!F || !c) return null;
  const light = SKY_WORLDS[world] && SKY_WORLDS[world].light ? helioEqjKm(SKY_WORLDS[world].light, tMs) : { x: 0, y: 0, z: 0 };
  const s = unit([light.x - c.x, light.y - c.y, light.z - c.z]);
  const sx = s[0] * F.x[0] + s[1] * F.x[1] + s[2] * F.x[2];
  const sy = s[0] * F.y[0] + s[1] * F.y[1] + s[2] * F.y[2];
  const subsolar = Math.atan2(sy, sx) / DEG;
  return wrap360(lonDeg - subsolar + 180) / 15;
}

/**
 * Where a function of time crosses zero upward ("rise") or downward ("set") between t0 and t1, sampled every
 * stepMs and narrowed by bisection to a second. Pure: `fn(tMs)` returns a number, or NaN where it has no answer.
 */
export function crossings(fn, t0, t1, stepMs) {
  const out = [];
  let ta = t0;
  let fa = fn(ta);
  for (let tb = t0 + stepMs; ta < t1; tb += stepMs) {
    const t = Math.min(tb, t1);
    const fb = fn(t);
    if (Number.isFinite(fa) && Number.isFinite(fb) && (fa < 0) !== (fb < 0)) {
      let lo = ta, hi = t, flo = fa;
      while (hi - lo > 1000) {
        const mid = (lo + hi) / 2;
        const fm = fn(mid);
        if (!Number.isFinite(fm)) break;
        if ((fm < 0) === (flo < 0)) { lo = mid; flo = fm; } else hi = mid;
      }
      out.push({ tMs: Math.round((lo + hi) / 2), kind: fb > fa ? 'rise' : 'set' });
    }
    ta = t;
    fa = fb;
    if (t >= t1) break;
  }
  return out;
}

/**
 * The next rise and set of a body from a place, searched over one and a quarter of the world's solar days (for a
 * planet's moon the parent never rises or sets: it hangs where it is, and both come back null). The Sun rises when
 * its upper edge clears the true horizon; there is no refraction in this search, which on Mars moves sunrise by
 * seconds and on Titan by more (modelled, and said so on screen).
 */
export function nextRiseSet(id, place, tMs) {
  const day = solarDayHours(place.world);
  if (!day) return { rise: null, set: null };
  // Deimos goes round only a little faster than Mars turns: it stays up for two and a half sols at a time.
  const span = day * (id === 'deimos' ? 3.5 : 1.25) * 3600e3;
  // A few hundred samples a day: Phobos, which crosses Mars's sky in four and a quarter hours, needs a step
  // of minutes; everything else is happy with it.
  const step = Math.min(span / 300, id === 'phobos' || id === 'deimos' ? 300e3 : Infinity);
  const fn = (t) => {
    const v = worldBodyView(id, t, place);
    if (!v) return NaN;
    return v.altDeg + (id === 'sun' ? v.diameterDeg / 2 : 0);
  };
  const xs = crossings(fn, tMs, tMs + span, step);
  const rise = xs.find((x) => x.kind === 'rise');
  const set = xs.find((x) => x.kind === 'set');
  return { rise: rise ? rise.tMs : null, set: set ? set.tMs : null };
}

function sepDeg(a, b) {
  return Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) / DEG;
}

/**
 * When `front` crosses the disc of `back` (Phobos over the Sun, the Earth over the Sun from the Moon), seen from a
 * place, between t0 and t1, with both above the horizon: [{tMs (the middle), sepDeg (centre to centre at the
 * middle), durationS}]. A coarse scan where the two are within a few degrees, then a golden-section search for the
 * closest moment, then the edges by bisection.
 */
export function transits(front, back, place, t0, t1, { stepMs = 120e3 } = {}) {
  const out = [];
  const sepAt = (t) => {
    const a = worldBodyView(front, t, place);
    const b = worldBodyView(back, t, place);
    if (!a || !b) return { s: NaN };
    return { s: sepDeg(a.dir, b.dir), r: (a.diameterDeg + b.diameterDeg) / 2, up: a.altDeg > 0 && b.altDeg > 0 };
  };
  let prev = sepAt(t0);
  for (let t = t0 + stepMs; t <= t1; t += stepMs) {
    const cur = sepAt(t);
    const near = Number.isFinite(cur.s) && cur.s < Math.max(3, cur.r * 4);
    if (near || (Number.isFinite(prev.s) && prev.s < 3)) {
      // Golden section over [t - step, t + step] for the closest approach.
      let lo = t - stepMs, hi = t + stepMs;
      const g = 0.381966;
      let x1 = lo + g * (hi - lo), x2 = hi - g * (hi - lo);
      let f1 = sepAt(x1).s, f2 = sepAt(x2).s;
      for (let k = 0; k < 40 && hi - lo > 500; k += 1) {
        if (f1 < f2) { hi = x2; x2 = x1; f2 = f1; x1 = lo + g * (hi - lo); f1 = sepAt(x1).s; } else { lo = x1; x1 = x2; f1 = f2; x2 = hi - g * (hi - lo); f2 = sepAt(x2).s; }
      }
      const mid = (lo + hi) / 2;
      const at = sepAt(mid);
      if (at.up && at.s < at.r && !out.some((o) => Math.abs(o.tMs - mid) < stepMs * 2)) {
        const inside = (x) => { const q = sepAt(x); return Number.isFinite(q.s) ? q.r - q.s : NaN; };
        const edges = crossings(inside, mid - 3600e3, mid + 3600e3, 5e3);
        const start = edges.filter((e) => e.kind === 'rise' && e.tMs <= mid).pop();
        const end = edges.find((e) => e.kind === 'set' && e.tMs >= mid);
        out.push({ tMs: Math.round(mid), sepDeg: at.s, durationS: start && end ? Math.round((end.tMs - start.tMs) / 1000) : null });
      }
    }
    prev = cur;
  }
  return out;
}

/** The Sun's altitude in degrees at a place (its centre, true, no refraction), or NaN. */
export function sunAltitude(place, tMs) {
  const v = worldBodyView('sun', tMs, place);
  return v ? v.altDeg : NaN;
}

/**
 * `#sky=` read: `mars:jezero` (a world and a site id), `mars:18.44,77.45` (planetocentric latitude, east longitude),
 * or a bare world (`titan`, its sub-planet point for a moon, else 0,0). Null when the world is not one of SKY_WORLDS.
 * The site's coordinates are the caller's to look up (data/sites.js): this returns `site` as written.
 */
export function parseSkyLink(text) {
  const s = String(text || '').trim().toLowerCase();
  if (!s) return null;
  const [world, rest] = s.split(':');
  if (!Object.prototype.hasOwnProperty.call(SKY_WORLDS, world) || world === 'earth') return null;
  if (!rest) return { world, latDeg: 0, lonDeg: isExoWorld(world) ? EXO_WORLDS[world].defaultLon : 0 };
  const m = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(rest);
  if (m) {
    const latDeg = Number(m[1]), lonDeg = Number(m[2]);
    if (Math.abs(latDeg) > 90 || Math.abs(lonDeg) > 360) return null;
    return { world, latDeg, lonDeg: wrap360(lonDeg) };
  }
  if (!/^[a-z0-9-]{1,40}$/.test(rest)) return null;
  return { world, site: rest };
}

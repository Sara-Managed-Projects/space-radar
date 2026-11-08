// sky/exoskies.js -- the sky from two planets of other stars: Proxima Centauri b and TRAPPIST-1 e (release 2.0.0 batch
// f7-ground, forge #147). EVERYTHING HERE IS MODELLED, and the stage says so in its tag and its notes.
//
// Contract: EXO_WORLDS, EXO_BODIES, isExoWorld(w), isExoBody(id), exoAxes(world, tMs) -> {x, y, z} (J2000 unit vectors of
//           the planet's own axes), exoPositionEqjKm(id, tMs) -> {x, y, z} (from the Sun, J2000 km),
//           exoMagnitude(id, view, obsKm) -> magnitude
// Pure: no DOM, no three. sky/worldframe.js routes the two worlds and their bodies here; tests/test_worldframe.mjs holds it.
//
// WHAT IS MEASURED: where the stars are and how far (HYG v4.4, site/data/stars3d.names.json's rows for Proxima Centauri,
// Rigil Kentaurus and Toliman, x y z in light-years on the ecliptic J2000 axes; TRAPPIST-1 from site/data/exoplanets.csv,
// NASA Exoplanet Archive pscomppars: RA 346.626, Dec -5.04346, 12.43 pc), the stars' radii and temperatures and the
// planets' periods, orbit sizes and radii (registry/systems.yaml and systems-generated.yaml, the Archive's), and for
// TRAPPIST-1 each planet's transit time (the same rows), which fixes where it is along its orbit.
// WHAT IS ASSUMED, and named on screen:
//   - the planets turn once an orbit, keeping one face to their star (tidal locking), as the discovery papers expect:
//     Anglada-Escudé et al. 2016 (Nature 536, 437) for Proxima b, Gillon et al. 2017 (Nature 542, 456) for TRAPPIST-1;
//     longitude 0 faces the star, the pole is the orbit's, and no tilt;
//   - the orbits are circles in one plane. TRAPPIST-1's planets transit, so that plane holds our line of sight; which
//     way it is turned about it is not known, and it is taken as the one whose pole is nearest the celestial north.
//     Proxima's planets do not transit and their plane is not known: the same rule is used, and where b and d are along
//     their orbits is not known either, so both are put at an assumed phase (in line with the Sun at J2000.0);
//   - the other stars are drawn as the Sun sees them (sky/worldframe.js's caller dims the one star that is these);
//     from 1.3 pc only the nearest few would move noticeably, from 12.4 pc a few dozen;
//   - a planet's brightness is its star's light reflected with an assumed geometric albedo of 0.3 and Lambert's phase
//     law; a star's is its luminosity (radius and temperature, Stefan-Boltzmann) as if it were all visible light.

const DEG = Math.PI / 180;
const KM_PER_AU = 149597870.7;
const KM_PER_LY = 9.4607304725808e12;
const KM_PER_PC = 3.0856775814913673e13;
const R_SUN_KM = 695700;
const R_EARTH_KM = 6371.0;
const DAY_MS = 86400000;
const J2000_MS = Date.UTC(2000, 0, 1, 12);
const EPS = 23.4392911 * DEG;
const jdToMs = (jd) => (jd - 2440587.5) * DAY_MS;

function eclToEq([x, y, z]) {
  return [x, y * Math.cos(EPS) - z * Math.sin(EPS), y * Math.sin(EPS) + z * Math.cos(EPS)];
}
function radec(raDeg, decDeg, d) {
  const r = raDeg * DEG, c = decDeg * DEG;
  return [d * Math.cos(c) * Math.cos(r), d * Math.cos(c) * Math.sin(r), d * Math.sin(c)];
}
const scale = (v, k) => [v[0] * k, v[1] * k, v[2] * k];
const unit = (v) => { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** The two systems: their star (from the Sun, J2000 km), its size and light, and their planets. */
const SYSTEMS = {
  proxima: {
    starKm: scale(eclToEq([-1.5403, -2.5752, -2.976]), KM_PER_LY),
    radiusKm: 0.141 * R_SUN_KM,
    teffK: 2900,
    planets: {
      // Phase unknown: in line with the Sun at J2000.0 (assumed).
      'proxima-b': { aAu: 0.04848, periodDays: 11.18465, radiusEarths: 1.02, t0Ms: J2000_MS },
      'proxima-d': { aAu: 0.02881, periodDays: 5.12338, radiusEarths: 0.692, t0Ms: J2000_MS },
    },
    // Alpha Centauri A and B, HYG v4.4 rows (x y z ly ecliptic; apparent V from the Sun at 4.32 ly).
    stars: {
      'alpha-cen-a': { km: scale(eclToEq([-1.6151, -2.7397, -2.9239]), KM_PER_LY), magFromSun: -0.01, radiusKm: 1.224 * R_SUN_KM, teffK: 5790 },
      'alpha-cen-b': { km: scale(eclToEq([-1.6151, -2.7394, -2.9242]), KM_PER_LY), magFromSun: 1.35, radiusKm: 0.863 * R_SUN_KM, teffK: 5260 },
    },
  },
  'trappist-1': {
    starKm: radec(346.626, -5.04346, 12.43 * KM_PER_PC),
    radiusKm: 0.1192 * R_SUN_KM,
    teffK: 2566,
    planets: {
      'trappist-1b': { aAu: 0.01154, periodDays: 1.510826, radiusEarths: 1.116, t0Ms: jdToMs(2457322.514193) },
      'trappist-1c': { aAu: 0.0158, periodDays: 2.421937, radiusEarths: 1.097, t0Ms: jdToMs(2457282.8113871) },
      'trappist-1d': { aAu: 0.02227, periodDays: 4.049219, radiusEarths: 0.788, t0Ms: jdToMs(2457670.1463014) },
      'trappist-1e': { aAu: 0.02925, periodDays: 6.101013, radiusEarths: 0.92, t0Ms: jdToMs(2457660.3676621) },
      'trappist-1f': { aAu: 0.03849, periodDays: 9.20754, radiusEarths: 1.045, t0Ms: jdToMs(2457671.3737299) },
      'trappist-1g': { aAu: 0.04683, periodDays: 12.352446, radiusEarths: 1.129, t0Ms: jdToMs(2457665.3628439) },
      'trappist-1h': { aAu: 0.06189, periodDays: 18.772866, radiusEarths: 0.755, t0Ms: jdToMs(2457662.5741486) },
    },
    stars: {},
  },
};

/** The worlds a visitor can stand on, with their system, their star's body id and the default place (the star 30 degrees up). */
export const EXO_WORLDS = {
  'proxima-b': { system: 'proxima', star: 'proxima', radiusKm: 1.02 * R_EARTH_KM, defaultLon: 60 },
  'trappist-1e': { system: 'trappist-1', star: 'trappist-1', radiusKm: 0.92 * R_EARTH_KM, defaultLon: 60 },
};

/** Every body these skies hold: the two stars, their planets, Alpha Centauri A and B. */
export const EXO_BODIES = {};
for (const [sid, s] of Object.entries(SYSTEMS)) {
  EXO_BODIES[sid] = { kind: 'star', system: sid, radiusKm: s.radiusKm, teffK: s.teffK };
  for (const [pid, p] of Object.entries(s.planets)) EXO_BODIES[pid] = { kind: 'planet', system: sid, radiusKm: p.radiusEarths * R_EARTH_KM };
  for (const [xid, x] of Object.entries(s.stars)) EXO_BODIES[xid] = { kind: 'star', system: sid, radiusKm: x.radiusKm, teffK: x.teffK };
}

export const isExoWorld = (w) => Object.prototype.hasOwnProperty.call(EXO_WORLDS, w);
export const isExoBody = (id) => Object.prototype.hasOwnProperty.call(EXO_BODIES, id);

/** The orbits' plane: its pole (nearest the celestial north, perpendicular to our line of sight) and, in it, the way to the Sun. */
function plane(sys) {
  const s = unit(sys.starKm);
  const n = unit([-s[2] * s[0], -s[2] * s[1], 1 - s[2] * s[2]]); // (0, 0, 1) less its part along s
  const u = scale(s, -1);
  return { n, u, v: cross(n, u) };
}

function planetOffsetKm(sid, pid, tMs) {
  const sys = SYSTEMS[sid];
  const p = sys.planets[pid];
  const { u, v } = plane(sys);
  const th = (2 * Math.PI * (tMs - p.t0Ms)) / (p.periodDays * DAY_MS);
  const r = p.aAu * KM_PER_AU;
  return [r * (Math.cos(th) * u[0] + Math.sin(th) * v[0]), r * (Math.cos(th) * u[1] + Math.sin(th) * v[1]), r * (Math.cos(th) * u[2] + Math.sin(th) * v[2])];
}

/** A body's place from the Sun, J2000 km; null for one not here. */
export function exoPositionEqjKm(id, tMs) {
  const b = EXO_BODIES[id];
  if (!b || !Number.isFinite(tMs)) return null;
  const sys = SYSTEMS[b.system];
  if (sys.stars[id]) { const k = sys.stars[id].km; return { x: k[0], y: k[1], z: k[2] }; }
  const c = sys.starKm;
  if (b.kind === 'star') return { x: c[0], y: c[1], z: c[2] };
  const o = planetOffsetKm(b.system, id, tMs);
  return { x: c[0] + o[0], y: c[1] + o[1], z: c[2] + o[2] };
}

/** A locked planet's axes in J2000: x towards its star, z its orbit's pole. */
export function exoAxes(world, tMs) {
  const w = EXO_WORLDS[world];
  if (!w || !Number.isFinite(tMs)) return null;
  const o = planetOffsetKm(w.system, world, tMs);
  const x = unit(scale(o, -1));
  const z = plane(SYSTEMS[w.system]).n;
  return { x, y: cross(z, x), z };
}

/** A star's luminosity in Suns, from its radius and temperature (Stefan-Boltzmann). */
function luminosity(b) {
  return (b.radiusKm / R_SUN_KM) ** 2 * (b.teffK / 5772) ** 4;
}

/**
 * How bright a body looks from the observer (`obsKm`, from the Sun, J2000 km): MODELLED. A star by its luminosity as
 * if it were all visible light (Alpha Centauri A and B by their measured magnitudes and distances instead); a planet by
 * its star's light, an albedo of 0.3 and Lambert's phase law.
 */
export function exoMagnitude(id, obsKm) {
  const b = EXO_BODIES[id];
  if (!b) return NaN;
  const sys = SYSTEMS[b.system];
  const pos = exoPositionEqjKm(id, J2000_MS);
  if (sys.stars[id]) {
    const d = Math.hypot(pos.x - obsKm.x, pos.y - obsKm.y, pos.z - obsKm.z);
    const dSun = Math.hypot(pos.x, pos.y, pos.z);
    return sys.stars[id].magFromSun + 5 * Math.log10(d / dSun);
  }
  const star = sys.starKm;
  const L = luminosity({ radiusKm: sys.radiusKm, teffK: sys.teffK });
  if (b.kind === 'star') {
    const d = Math.hypot(star[0] - obsKm.x, star[1] - obsKm.y, star[2] - obsKm.z);
    return -26.74 - 2.5 * Math.log10(L) + 5 * Math.log10(d / KM_PER_AU);
  }
  return NaN; // a planet's needs its own place at the instant: exoPlanetMagnitude
}

/** A planet's magnitude at an instant from the observer (modelled, see exoMagnitude). */
export function exoPlanetMagnitude(id, tMs, obsKm) {
  const b = EXO_BODIES[id];
  if (!b || b.kind !== 'planet') return NaN;
  const sys = SYSTEMS[b.system];
  const L = luminosity({ radiusKm: sys.radiusKm, teffK: sys.teffK });
  const p = exoPositionEqjKm(id, tMs);
  const s = sys.starKm;
  const toStar = [s[0] - p.x, s[1] - p.y, s[2] - p.z];
  const toObs = [obsKm.x - p.x, obsKm.y - p.y, obsKm.z - p.z];
  const rStar = Math.hypot(...toStar), d = Math.hypot(...toObs);
  const alpha = Math.acos(Math.max(-1, Math.min(1, dot(unit(toStar), unit(toObs)))));
  const phase = (Math.sin(alpha) + (Math.PI - alpha) * Math.cos(alpha)) / Math.PI;
  const starAtPlanet = -26.74 - 2.5 * Math.log10(L) + 5 * Math.log10(rStar / KM_PER_AU);
  const k = 0.3 * (b.radiusKm / d) ** 2 * Math.max(phase, 1e-6);
  return starAtPlanet - 2.5 * Math.log10(k);
}

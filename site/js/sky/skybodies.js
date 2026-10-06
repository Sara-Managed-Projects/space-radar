// sky/skybodies.js -- the Sun, the Moon and the planets as seen from one place (internal #351).
//
// Contract: BODIES, bodyView(id, date, observer) -> view | null, jupiterMoons(date, observer),
//           eqjToLocal(date, observer) -> number[9] (row-major 3x3), localOf(m9, v) -> [x, y, z],
//           altAzOf(local) -> {altDeg, azDeg}, bodyFrame(axis) -> {x, y, z}
// Pure given Astronomy Engine: no DOM, no three, no clock. sky/groundsky.js draws from these and
// sky/tonightbest.js ranks from them; tests/test_skybodies.mjs holds them to Astronomy Engine's own
// numbers.
//
// EVERYTHING HERE IS COMPUTED, NOTHING IS FETCHED. Directions are topocentric (from the visitor's
// place, not the Earth's centre: the Moon moves a degree between the two) in equatorial J2000, the
// frame the star catalogue is in, so one rotation per frame turns stars and planets together.
// Apparent size is the body's radius over its distance. Phase, magnitude and the tilt of Saturn's
// rings are Astronomy Engine's Illumination(). Which way a disc is turned is its IAU rotation
// model (RotationAxis): for the Moon that is the real face, libration included; for Jupiter the
// cloud map's longitude is System III, which the Great Red Spot drifts in, so the belts are where
// they are and the spot is not promised.

import * as Astronomy from '../../vendor/astronomy.js';

const DEG = Math.PI / 180;
const KM_PER_AU = 1.4959787069098932e8;

/** The nine, with the radius the apparent size is taken from (equatorial, km). */
export const BODIES = [
  { id: 'sun', body: 'Sun', radiusKm: 695700 },
  { id: 'moon', body: 'Moon', radiusKm: 1737.4 },
  { id: 'mercury', body: 'Mercury', radiusKm: 2439.7 },
  { id: 'venus', body: 'Venus', radiusKm: 6051.8 },
  { id: 'mars', body: 'Mars', radiusKm: 3396.2 },
  { id: 'jupiter', body: 'Jupiter', radiusKm: 71492 },
  { id: 'saturn', body: 'Saturn', radiusKm: 60268 },
  { id: 'uranus', body: 'Uranus', radiusKm: 25559 },
  { id: 'neptune', body: 'Neptune', radiusKm: 24764 },
];
const BY_ID = new Map(BODIES.map((b) => [b.id, b]));

/** Jupiter's four big moons with the magnitude each has at a mean opposition. */
export const GALILEANS = [
  { id: 'io', key: 'io', mag: 5.0 },
  { id: 'europa', key: 'europa', mag: 5.3 },
  { id: 'ganymede', key: 'ganymede', mag: 4.6 },
  { id: 'callisto', key: 'callisto', mag: 5.7 },
];

function unit(v) {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}

/**
 * The rotation from equatorial J2000 to the view's local frame (+X east, +Y up, +Z south) at this
 * instant and place, with no refraction: nine numbers, row-major. Astronomy Engine's horizontal
 * frame is x north, y west, z up.
 */
export function eqjToLocal(date, observer) {
  const r = Astronomy.Rotation_EQJ_HOR(date, observer).rot;
  // out_k = sum_j rot[j][k] * v_j, so row k of the matrix is rot[0..2][k].
  return [
    -r[0][1], -r[1][1], -r[2][1],
    r[0][2], r[1][2], r[2][2],
    -r[0][0], -r[1][0], -r[2][0],
  ];
}

/** A J2000 direction through eqjToLocal's matrix. */
export function localOf(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** Altitude and azimuth (from north, clockwise) of a local direction, in degrees. */
export function altAzOf(l) {
  const altDeg = Math.asin(Math.max(-1, Math.min(1, l[1]))) / DEG;
  const azDeg = ((Math.atan2(l[0], -l[2]) / DEG) % 360 + 360) % 360;
  return { altDeg, azDeg };
}

/**
 * A body's own axes in J2000 from its IAU rotation model: z its north pole, x where its prime
 * meridian crosses its equator. `axis` is Astronomy.RotationAxis().
 */
export function bodyFrame(axis) {
  const a0 = axis.ra * 15 * DEG;
  const z = [axis.north.x, axis.north.y, axis.north.z];
  // Q: the ascending node of the body's equator on the J2000 equator, at right ascension a0 + 90.
  const q = [-Math.sin(a0), Math.cos(a0), 0];
  const m = [z[1] * q[2] - z[2] * q[1], z[2] * q[0] - z[0] * q[2], z[0] * q[1] - z[1] * q[0]];
  const w = (((axis.spin % 360) + 360) % 360) * DEG;
  const x = unit([q[0] * Math.cos(w) + m[0] * Math.sin(w), q[1] * Math.cos(w) + m[1] * Math.sin(w), q[2] * Math.cos(w) + m[2] * Math.sin(w)]);
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  return { x, y, z };
}

/**
 * One body from one place at one instant:
 *   dir          unit vector to it, topocentric, equatorial J2000
 *   altDeg/azDeg where that is in the sky, TRUE (the air's lift is the drawing's to add)
 *   distAu, diameterDeg, mag, phaseFraction (0 new, 1 full), phaseAngleDeg, ringTiltDeg (Saturn)
 *   toSun        unit vector from the body to the Sun, J2000 (which side is lit)
 *   frame        the body's own axes, J2000 (which way up its face is)
 * Null for an id it does not know or when the ephemeris throws.
 */
export function bodyView(id, date, observer) {
  const row = BY_ID.get(id);
  if (!row || !observer) return null;
  try {
    const eq = Astronomy.Equator(row.body, date, observer, false, true);
    const dir = unit([eq.vec.x, eq.vec.y, eq.vec.z]);
    const local = localOf(eqjToLocal(date, observer), dir);
    const { altDeg, azDeg } = altAzOf(local);
    const distAu = eq.dist;
    const diameterDeg = (2 * Math.asin(Math.min(1, row.radiusKm / (distAu * KM_PER_AU)))) / DEG;
    let mag = -26.74;
    let phaseFraction = 1;
    let phaseAngleDeg = 0;
    let ringTiltDeg = null;
    let toSun = dir;
    if (id !== 'sun') {
      const il = Astronomy.Illumination(row.body, date);
      mag = il.mag;
      phaseFraction = il.phase_fraction;
      phaseAngleDeg = il.phase_angle;
      if (Number.isFinite(il.ring_tilt)) ringTiltDeg = il.ring_tilt;
      // hc is the body from the Sun, so the Sun from the body is its opposite.
      toSun = unit([-il.hc.x, -il.hc.y, -il.hc.z]);
    }
    const frame = bodyFrame(Astronomy.RotationAxis(row.body, date));
    return { id, dir, local, altDeg, azDeg, distAu, diameterDeg, mag, phaseFraction, phaseAngleDeg, ringTiltDeg, toSun, frame };
  } catch {
    return null;
  }
}

/**
 * Io, Europa, Ganymede and Callisto as directions from the observer (J2000), each with how far it
 * is from Jupiter's centre in Jupiter radii and whether it is in front of or behind the disc.
 */
export function jupiterMoons(date, observer) {
  try {
    const jup = Astronomy.Equator('Jupiter', date, observer, false, true);
    const jm = Astronomy.JupiterMoons(date);
    const jDir = unit([jup.vec.x, jup.vec.y, jup.vec.z]);
    const rAu = BY_ID.get('jupiter').radiusKm / KM_PER_AU;
    return GALILEANS.map((g) => {
      const s = jm[g.key];
      const v = [jup.vec.x + s.x, jup.vec.y + s.y, jup.vec.z + s.z];
      const dir = unit(v);
      const along = s.x * jDir[0] + s.y * jDir[1] + s.z * jDir[2];
      const across = Math.hypot(s.x - along * jDir[0], s.y - along * jDir[1], s.z - along * jDir[2]);
      const offsetRadii = across / rAu;
      // Behind the disc and inside its outline: hidden. In front: lost against it, also not drawn.
      return { id: g.id, dir, mag: g.mag + 5 * Math.log10(jup.dist / 4.2), offsetRadii, hidden: offsetRadii < 1.02 };
    });
  } catch {
    return [];
  }
}

// propagate/frames.js -- coordinate frames, and the composition between them.
//
// Frames (the module contract):
//   earth-inertial  TEME/ECI, km, Earth-centred.  What SGP4 returns.
//   earth-fixed     ECEF, km, rotates with Earth. Ground sites and the observer live here.
//   sun-inertial    Heliocentric ecliptic J2000, km.
//   <world>-fixed   Body-fixed, km, turning with that world. Landing sites and rovers live here.
//   <world>-inertial  That world's centre, ecliptic J2000 axes (Earth's are TEME -- see below).
//
// A world's fixed frame turns by the IAU pole and prime meridian astronomy-engine reports, which
// is the same model scene/worlds.js uses to point the Moon's near side at us -- one rotation, two
// readers. Earth is the exception and keeps GMST, because SGP4, the WGS84 ellipsoid and every
// ground site already agree on it, and a second model for the same rotation is a second answer.
//
// A note that matters, and that costs a fifth of a degree if it is ignored: satellite.js calls its
// output "ECI", but SGP4 returns TEME -- the true equator, mean equinox *of date*. It is not
// J2000. The star field, astronomy-engine and every RA/Dec in the app are J2000 (EQJ). In 2026 the
// two differ by about 0.37 deg, which is 24 arcminutes -- roughly the width of the full Moon, and
// plainly visible if a satellite is drawn against the stars. `temeToJ2000` / `j2000ToTeme` below
// do that rotation (precession + nutation via astronomy-engine, plus the equation of the equinoxes
// between TEME and the true equinox of date), and `toStage` applies it whenever a position crosses
// between Earth's frame and anything else.
//
// Everything here is float64 kilometres and radians. Scene units are stage.js's problem.

import * as satellite from '../../vendor/satellite.esm.js';
import * as Astronomy from '../../vendor/astronomy.js';

// ---------------------------------------------------------------------------
// constants

export const KM_PER_AU = 149597870.7;

// WGS84 -- the ellipsoid satellite.js's geodetic conversions use. Note this is NOT
// satellite.constants.earthRadius (6378.135), which is SGP4's own internal Earth radius.
const WGS84_A = 6378.137;
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);

// Obliquity of the ecliptic at J2000.0. Taken from astronomy-engine's own EQJ->ECL matrix rather
// than written out as a literal, so the two never disagree: a hard-coded 23.4392911 deg differs
// from its value by 0.012 arcsec, which is invisible on screen but shows up as an 8 km residual
// at 1 AU in any test that compares the two. The literal is the documented fallback.
const OBLIQUITY_J2000_RAD = 23.4392911111111 * (Math.PI / 180);
let COS_OBL = Math.cos(OBLIQUITY_J2000_RAD);
let SIN_OBL = Math.sin(OBLIQUITY_J2000_RAD);
try {
  // astronomy-engine's RotateVector reads this matrix as out[i] = sum_j rot[j][i] * v[j].
  const rot = Astronomy.Rotation_EQJ_ECL().rot;
  if (rot && Number.isFinite(rot[1][1])) {
    COS_OBL = rot[1][1];
    SIN_OBL = rot[2][1];
  }
} catch (err) {
  /* keep the literal */
}

const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;

// ---------------------------------------------------------------------------
// time helpers

function toDate(t) {
  if (t instanceof Date) return t;
  if (typeof t === 'number' && Number.isFinite(t)) return new Date(t);
  return null;
}

/** Greenwich mean sidereal time, radians. Accepts a Date or ms-since-epoch. */
export function gmst(date) {
  const d = toDate(date);
  if (!d) return NaN;
  return satellite.gstime(d);
}

// ---------------------------------------------------------------------------
// Earth rotation: earth-inertial (TEME) <-> earth-fixed (ECEF)

/** TEME -> ECEF. `gmstRad` from gmst(). */
export function eciToEcef(v, gmstRad) {
  const c = Math.cos(gmstRad);
  const s = Math.sin(gmstRad);
  return {
    x: v.x * c + v.y * s,
    y: -v.x * s + v.y * c,
    z: v.z,
  };
}

/** ECEF -> TEME. */
export function ecefToEci(v, gmstRad) {
  const c = Math.cos(gmstRad);
  const s = Math.sin(gmstRad);
  return {
    x: v.x * c - v.y * s,
    y: v.x * s + v.y * c,
    z: v.z,
  };
}

// ---------------------------------------------------------------------------
// geodesy

/** Geodetic (radians, km above the WGS84 ellipsoid) -> ECEF km. */
export function geodeticToEcef(latRad, lonRad, altKm = 0) {
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const n = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
  return {
    x: (n + altKm) * cosLat * Math.cos(lonRad),
    y: (n + altKm) * cosLat * Math.sin(lonRad),
    z: (n * (1 - WGS84_E2) + altKm) * sinLat,
  };
}

/**
 * ECEF km -> geodetic. Bowring/Heiskanen iteration; converges to sub-millimetre in 4 passes for
 * anything from the sea floor to geostationary.
 * Longitude comes back in (-pi, pi].
 */
export function ecefToGeodetic(v, opts = {}) {
  const iterations = opts.iterations || 5;
  const p = Math.hypot(v.x, v.y);
  const lonRad = Math.atan2(v.y, v.x);

  if (p < 1e-9) {
    // On the spin axis: latitude is +/- 90 deg and longitude is undefined; call it zero.
    const sign = v.z >= 0 ? 1 : -1;
    const b = WGS84_A * (1 - WGS84_F);
    return { latRad: (sign * Math.PI) / 2, lonRad: 0, altKm: Math.abs(v.z) - b };
  }

  let latRad = Math.atan2(v.z, p * (1 - WGS84_E2));
  let n = WGS84_A;
  for (let i = 0; i < iterations; i++) {
    const sinLat = Math.sin(latRad);
    n = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
    latRad = Math.atan2(v.z + WGS84_E2 * n * sinLat, p);
  }
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  n = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
  // Near the poles cosLat -> 0, so use the z form there instead.
  const altKm =
    Math.abs(cosLat) > 0.1 ? p / cosLat - n : v.z / sinLat - n * (1 - WGS84_E2);

  return { latRad, lonRad, altKm };
}

// ---------------------------------------------------------------------------
// other worlds: radii, and the sphere they are drawn as
//
// Earth is an ellipsoid here because WGS84 is what its coordinates were surveyed against. Every
// other world in this app is a sphere -- scene/worlds.js draws spheres, the textures are mapped
// to spheres, and the published lat/lon of a landing site is planetocentric on a mean radius. A
// flattening term nobody applies to the mesh would put the marker off the surface it is drawn on.

/** Mean radii, km. THE table -- propagate/body.js re-exports this one rather than keeping a copy. */
export const WORLD_RADIUS_KM = {
  sun: 695700,
  mercury: 2439.7,
  venus: 6051.8,
  earth: 6371.0,
  moon: 1737.4,
  mars: 3389.5,
  jupiter: 69911,
  saturn: 58232,
  uranus: 25362,
  neptune: 24622,
  pluto: 1188.3,
};

/** A world's mean radius in km, or null. Null is an answer: it refuses rather than guessing. */
export function worldRadiusKm(worldId) {
  const r = WORLD_RADIUS_KM[String(worldId || '').toLowerCase()];
  return Number.isFinite(r) ? r : null;
}

/** Planetocentric lat/lon (radians) + height km on a sphere of `radiusKm` -> body-fixed km. */
export function sphericalToBodyFixed(latRad, lonRad, altKm, radiusKm) {
  if (!Number.isFinite(radiusKm) || !Number.isFinite(latRad) || !Number.isFinite(lonRad)) return null;
  const r = radiusKm + (Number.isFinite(altKm) ? altKm : 0);
  const c = Math.cos(latRad);
  return { x: r * c * Math.cos(lonRad), y: r * c * Math.sin(lonRad), z: r * Math.sin(latRad) };
}

/** The inverse. Longitude comes back in (-pi, pi], `altKm` measured from the sphere. */
export function bodyFixedToSpherical(v, radiusKm) {
  if (!v || !Number.isFinite(v.x) || !Number.isFinite(radiusKm)) return null;
  const p = Math.hypot(v.x, v.y);
  const r = Math.hypot(p, v.z);
  return {
    latRad: Math.atan2(v.z, p),
    lonRad: p < 1e-9 ? 0 : Math.atan2(v.y, v.x),
    altKm: r - radiusKm,
  };
}

// ---------------------------------------------------------------------------
// body-fixed <-> that world's inertial axes
//
// Body-fixed -> EQJ is  Rz(alpha0 + 90) . Rx(90 - delta0) . Rz(W), the IAU convention, and the
// same composition scene/worlds.js applies to the meshes. If these two ever disagree, a landing
// site slides across the texture it is standing on, so they are written the same way on purpose.

function rotX(v, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: v.x, y: v.y * c - v.z * s, z: v.y * s + v.z * c };
}

/** {ra, dec, spin} in radians for a world at a time, or null if there is no rotation model. */
function iauAngles(world, tMs) {
  const body = bodyForWorld(world);
  if (!body) return null;
  const date = toDate(tMs);
  if (!date) return null;
  let axis;
  try {
    axis = Astronomy.RotationAxis(body, date);
  } catch (err) {
    return null;
  }
  if (!axis || !Number.isFinite(axis.ra) || !Number.isFinite(axis.spin)) return null;
  return { ra: axis.ra * 15 * DEG, dec: axis.dec * DEG, spin: axis.spin * DEG };
}

/**
 * Body-fixed km -> that world's inertial axes, km. Earth keeps GMST; every other world uses the
 * IAU model and lands in ecliptic J2000 axes, which is what `<world>-inertial` means here.
 * Returns null for a world astronomy-engine has no rotation model for -- a third answer.
 */
export function bodyFixedToInertial(v, world, tMs) {
  const w = String(world || '').toLowerCase();
  if (!v || !Number.isFinite(v.x)) return null;
  if (w === 'earth') {
    if (!Number.isFinite(tMs)) return null;
    return ecefToEci(v, gmst(tMs));
  }
  const a = iauAngles(w, tMs);
  if (!a) return null;
  const eqj = rotZ(rotX(rotZ(v, a.spin), Math.PI / 2 - a.dec), a.ra + Math.PI / 2);
  return equatorialToEcliptic(eqj);
}

/** The inverse of bodyFixedToInertial. Null when the world has no rotation model. */
export function inertialToBodyFixed(v, world, tMs) {
  const w = String(world || '').toLowerCase();
  if (!v || !Number.isFinite(v.x)) return null;
  if (w === 'earth') {
    if (!Number.isFinite(tMs)) return null;
    return eciToEcef(v, gmst(tMs));
  }
  const a = iauAngles(w, tMs);
  if (!a) return null;
  const eqj = eclipticToEquatorial(v);
  return rotZ(rotX(rotZ(eqj, -(a.ra + Math.PI / 2)), -(Math.PI / 2 - a.dec)), -a.spin);
}

/** Accepts {latRad,lonRad,altKm} or satellite.js's {latitude,longitude,height}. */
function normaliseGd(gd) {
  if (!gd) return null;
  const latRad = gd.latRad !== undefined ? gd.latRad : gd.latitude;
  const lonRad = gd.lonRad !== undefined ? gd.lonRad : gd.longitude;
  const altKm = gd.altKm !== undefined ? gd.altKm : gd.height !== undefined ? gd.height : 0;
  if (!Number.isFinite(latRad) || !Number.isFinite(lonRad)) return null;
  return { latitude: latRad, longitude: lonRad, height: altKm };
}

/**
 * Topocentric look angles from a ground observer to an ECEF position.
 * Returns radians and kilometres: {az, el, rangeKm}. az is 0 at north, increasing east.
 */
export function lookAngles(observerGd, ecefPos) {
  const gd = normaliseGd(observerGd);
  if (!gd) return null;
  const la = satellite.ecfToLookAngles(gd, ecefPos);
  return { az: la.azimuth, el: la.elevation, rangeKm: la.rangeSat };
}

// ---------------------------------------------------------------------------
// ecliptic <-> equatorial (both J2000)

/** Ecliptic J2000 axes -> equatorial J2000 axes. Rotation about +x by +obliquity. */
export function eclipticToEquatorial(v) {
  return {
    x: v.x,
    y: v.y * COS_OBL - v.z * SIN_OBL,
    z: v.y * SIN_OBL + v.z * COS_OBL,
  };
}

/** Equatorial J2000 axes -> ecliptic J2000 axes. */
export function equatorialToEcliptic(v) {
  return {
    x: v.x,
    y: v.y * COS_OBL + v.z * SIN_OBL,
    z: -v.y * SIN_OBL + v.z * COS_OBL,
  };
}

/** Unit vector in equatorial J2000 from right ascension and declination, both in degrees. */
export function radecToVec(raDeg, decDeg) {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const cd = Math.cos(dec);
  return { x: cd * Math.cos(ra), y: cd * Math.sin(ra), z: Math.sin(dec) };
}

// ---------------------------------------------------------------------------
// TEME <-> J2000 (EQJ)

/**
 * Equation of the equinoxes, radians: GAST - GMST. This is the only difference between TEME and
 * the true equator/true equinox of date (EQD). Small -- under 20 arcseconds -- but free to correct.
 */
function equationOfEquinoxes(date) {
  const gastRad = Astronomy.SiderealTime(date) * 15 * DEG; // SiderealTime() returns GAST in hours
  let d = gastRad - satellite.gstime(date);
  while (d > Math.PI) d -= TWO_PI;
  while (d < -Math.PI) d += TWO_PI;
  return d;
}

function rotZ(v, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c, z: v.z };
}

function rotateWith(rot, v, time) {
  const out = Astronomy.RotateVector(rot, new Astronomy.Vector(v.x, v.y, v.z, time));
  return { x: out.x, y: out.y, z: out.z };
}

/** TEME (what SGP4 returns) -> equatorial J2000 (EQJ). Same units in, same units out. */
export function temeToJ2000(v, tMs) {
  const date = toDate(tMs);
  if (!date) return { x: v.x, y: v.y, z: v.z };
  const time = Astronomy.MakeTime(date);
  const tod = rotZ(v, equationOfEquinoxes(date)); // TEME -> EQD
  return rotateWith(Astronomy.Rotation_EQD_EQJ(time), tod, time);
}

/** Equatorial J2000 (EQJ) -> TEME. */
export function j2000ToTeme(v, tMs) {
  const date = toDate(tMs);
  if (!date) return { x: v.x, y: v.y, z: v.z };
  const time = Astronomy.MakeTime(date);
  const tod = rotateWith(Astronomy.Rotation_EQJ_EQD(time), v, time);
  return rotZ(tod, -equationOfEquinoxes(date));
}

// ---------------------------------------------------------------------------
// world ephemerides -- the hub every cross-world conversion goes through

const WORLD_BODY = {
  sun: 'Sun',
  mercury: 'Mercury',
  venus: 'Venus',
  earth: 'Earth',
  moon: 'Moon',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
};

/** The astronomy-engine Body for a world id, or null. Exported so body.js shares one table. */
export function bodyForWorld(worldId) {
  if (!worldId) return null;
  const key = String(worldId).toLowerCase();
  const name = WORLD_BODY[key];
  if (!name) return null;
  return Astronomy.Body[name] || null;
}

/**
 * Heliocentric ecliptic J2000 position of a world, km. This is the sun-inertial frame, so the Sun
 * itself is the origin. Returns null for a world with no ephemeris.
 */
export function worldHelioEclKm(worldId, tMs) {
  const key = String(worldId || '').toLowerCase();
  if (key === 'sun') return { x: 0, y: 0, z: 0 };
  const date = toDate(tMs);
  if (!date) return null;
  const body = bodyForWorld(key);
  if (!body) return null;
  try {
    let eqj;
    if (key === 'moon') {
      // astronomy-engine has no HelioVector for the Moon; take Earth + the geocentric Moon.
      const earth = Astronomy.HelioVector(Astronomy.Body.Earth, date);
      const moon = Astronomy.GeoMoon(date);
      eqj = { x: earth.x + moon.x, y: earth.y + moon.y, z: earth.z + moon.z };
    } else {
      const v = Astronomy.HelioVector(body, date);
      eqj = { x: v.x, y: v.y, z: v.z };
    }
    const ecl = equatorialToEcliptic(eqj); // astronomy-engine's vectors are EQJ
    return { x: ecl.x * KM_PER_AU, y: ecl.y * KM_PER_AU, z: ecl.z * KM_PER_AU };
  } catch (err) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// frame composition

/** 'earth-fixed' -> {world:'earth', kind:'fixed'}. Unqualified names default to Earth. */
export function parseFrame(frame) {
  if (!frame) return null;
  const s = String(frame).toLowerCase();
  const i = s.lastIndexOf('-');
  if (i < 0) {
    if (s === 'inertial' || s === 'fixed') return { world: 'earth', kind: s };
    return null;
  }
  const world = s.slice(0, i);
  const kind = s.slice(i + 1);
  if (kind !== 'inertial' && kind !== 'fixed') return null;
  return { world, kind };
}

/**
 * Rotate a DIRECTION from one frame's axes into another's. Rotations only: no world origins are
 * added or subtracted, so this is exact where a position conversion is not -- a moon-fixed
 * position reaches the Earth stage by way of two 1.5e8 km heliocentric vectors, and float64
 * cancellation there costs about a kilometre, which is fine for a dot and useless for an axis.
 *
 * WHY IT EXISTS. scene/worlds.js orients a world's mesh, and it used to do that from its own
 * copy of the IAU formula: Rz(ra+90).Rx(90-dec).Rz(spin), an EQJ orientation, applied straight
 * in scene axes. The scene's axes on the Earth stage are TEME, and a marker's position gets
 * there through j2000ToTeme -- so the mesh was short exactly one precession, and every lunar
 * landing site was drawn 0.373 degrees of longitude, 11.3 km of lunar surface, east of where the
 * Moon's own texture put it. Two formulas written to agree cannot be checked against each other;
 * one formula, asked for three basis vectors, has nothing to disagree with.
 *
 * @returns {{x:number,y:number,z:number}|null} null where a position conversion would also be
 *   null: a world with no rotation model, or a cross-world conversion with no time.
 */
export function rotateDir(vec, fromFrame, toFrame, tMs) {
  const from = parseFrame(fromFrame);
  const to = parseFrame(toFrame);
  if (!from || !to || !vec || !Number.isFinite(vec.x)) return null;
  if (from.world === to.world && from.kind === to.kind) return { x: vec.x, y: vec.y, z: vec.z };
  if (!Number.isFinite(tMs) && (from.kind === 'fixed' || to.kind === 'fixed'
      || from.world !== to.world)) {
    return null;
  }
  let v = vec;
  if (from.kind === 'fixed') {
    v = bodyFixedToInertial(v, from.world, tMs);
    if (!v) return null;
  }
  v = inertialToEclAxes(v, from.world, tMs);
  v = eclAxesToInertial(v, to.world, tMs);
  if (to.kind === 'fixed') {
    v = inertialToBodyFixed(v, to.world, tMs);
    if (!v) return null;
  }
  return v;
}

/** The frame the scene draws in, for a given stage. */
export function stageFrame(stage) {
  if (!stage) return 'earth-inertial';
  if (stage.frame) return stage.frame;
  return `${stage.worldId || 'earth'}-inertial`;
}

function timeOf(record, posKm, stage, tMs) {
  if (Number.isFinite(tMs)) return tMs;
  if (posKm && Number.isFinite(posKm.tMs)) return posKm.tMs;
  if (stage && Number.isFinite(stage.tMs)) return stage.tMs;
  if (record && Number.isFinite(record.tMs)) return record.tMs;
  if (record && Number.isFinite(record.epoch)) return record.epoch;
  return NaN;
}

// A world's inertial axes: Earth's are TEME (SGP4's frame); every other world uses ecliptic J2000
// axes, matching sun-inertial. Only the axes differ -- the origin is always the world's centre.
function inertialToEclAxes(v, world, tMs) {
  if (world === 'earth') return equatorialToEcliptic(temeToJ2000(v, tMs));
  return v;
}

function eclAxesToInertial(v, world, tMs) {
  if (world === 'earth') return j2000ToTeme(eclipticToEquatorial(v), tMs);
  return v;
}

/** Position (km, any frame) -> heliocentric ecliptic J2000 km. Null if it cannot be expressed. */
function toSunInertialKm(pos, from, tMs) {
  if (from.world === 'sun' && from.kind === 'inertial') return { x: pos.x, y: pos.y, z: pos.z };

  let local = pos;
  if (from.kind === 'fixed') {
    if (!Number.isFinite(tMs)) return null;
    local = bodyFixedToInertial(pos, from.world, tMs);
    if (!local) return null; // a world with no rotation model: refuse, do not place it on Earth
  }
  const ecl = inertialToEclAxes(local, from.world, tMs);
  const origin = worldHelioEclKm(from.world, tMs);
  if (!origin) return null;
  return { x: ecl.x + origin.x, y: ecl.y + origin.y, z: ecl.z + origin.z };
}

/** Heliocentric ecliptic J2000 km -> a target frame. Null if it cannot be expressed. */
function fromSunInertialKm(pos, to, tMs) {
  if (to.world === 'sun' && to.kind === 'inertial') return { x: pos.x, y: pos.y, z: pos.z };
  const origin = worldHelioEclKm(to.world, tMs);
  if (!origin) return null;
  const rel = { x: pos.x - origin.x, y: pos.y - origin.y, z: pos.z - origin.z };
  const inertial = eclAxesToInertial(rel, to.world, tMs);
  if (to.kind === 'inertial') return inertial;
  if (!Number.isFinite(tMs)) return null;
  return inertialToBodyFixed(inertial, to.world, tMs);
}

/**
 * Compose frames: express `posKm` (in the record's frame) in the stage's frame, in kilometres,
 * centred on the stage world. The scene's floating origin and unit scaling are stage.toScene()'s
 * job -- scenePos = (toStage(...) - stage.originKm) / stage.unitKm.
 *
 * The time is taken from, in order: the explicit 4th argument, posKm.tMs, stage.tMs, record.tMs,
 * record.epoch. A cross-world conversion without a time returns null rather than a wrong number.
 * (The contract's three-argument signature has no time in it; this is the one place that hurts,
 * so the integrator should set stage.tMs once per frame.)
 *
 * Returns null if the conversion is not defined -- a world with no ephemeris, a world with no
 * rotation model, or a cross-world conversion with no time. Null is the honest answer and the
 * caller must draw nothing; the one thing it must never do is fall back to Earth.
 */
export function toStage(record, posKm, stage, tMs) {
  if (!posKm || !Number.isFinite(posKm.x)) return null;

  const target = parseFrame(stageFrame(stage));
  const sourceName = posKm.frame || (record && record.frame) || null;
  const source = parseFrame(sourceName) || target;
  if (!target) return null;

  // Identity -- the common case (a LEO satellite on the Earth stage). No AU-scale arithmetic,
  // so no float64 cancellation at 1.5e8 km.
  if (source.world === target.world && source.kind === target.kind) {
    return { x: posKm.x, y: posKm.y, z: posKm.z };
  }

  const t = timeOf(record, posKm, stage, tMs);

  // Same world, different kind: rotate, do not go via the Sun.
  if (source.world === target.world) {
    if (!Number.isFinite(t)) return null;
    return source.kind === 'fixed'
      ? bodyFixedToInertial(posKm, source.world, t)
      : inertialToBodyFixed(posKm, source.world, t);
  }

  if (!Number.isFinite(t)) return null;
  const helio = toSunInertialKm(posKm, source, t);
  if (!helio) return null;
  return fromSunInertialKm(helio, target, t);
}

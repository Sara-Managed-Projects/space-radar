// propagate/ascent.js -- the arc from a pad to orbit insertion.
//
// THIS IS A DRAWING. No public source gives a rocket's live trajectory in a form a browser can
// read, so the app does not pretend to have one: it takes the pad, the launch time and the orbit
// the mission is going to, and draws the shape that flight looks like. The class is
// `illustrative`, it is set here and it cannot be overridden by a record, a layer or a caller --
// spec 0011: "the renderer cannot draw it any other way".
//
// Shape. Two functions of the flight fraction f = (t - T0) / duration, in the pad's local frame:
//     altitude   h(f) = h_insertion * (2f^2 - f^4)
//     downrange  theta(f) = theta_max * f^3          (central angle from the pad)
// h'(1) = 0 and theta'(1) != 0, so the arc arrives horizontal at insertion; h'(0)/theta'(0) -> inf,
// so it leaves the pad vertical. That tangency at both ends is the whole point -- it is what makes
// the curve read as "goes up, tips over, gets fast" rather than as a parabola drawn over a globe.
//
// Azimuth. sin(az) = cos(i) / cos(lat) -- the classic result, and the reason a pad at 28.5 deg N
// cannot reach an inclination below 28.5 deg without a dogleg. The equation has two solutions,
// north-east and south-east; which one a pad actually flies is range safety, not physics, so it is
// a registry field per pad (`azimuthSign`: +1 ascending/northerly, -1 descending/southerly).
// Cape Canaveral to the ISS is +1 and gives 45 deg; Vandenberg to SSO is -1 and gives 189 deg.

import { geodeticToEcef } from './frames.js';

const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;

/**
 * Orbit classes: where a launch is going, what that looks like, and how to say it.
 * `altitudeKm` and `inclinationDeg` are what the destination ring and the card use;
 * `insertionAltKm` is where the drawn arc ends (for anything above LEO that is a parking orbit or
 * a transfer perigee, not the final altitude, which is honest -- the rocket really does stop
 * there and coast).
 * `sentence` is a fallback; copy/en.js owns the real string under `copyKey`.
 */
export const ORBIT_CLASSES = {
  leo: {
    id: 'leo',
    display: 'Low Earth orbit',
    altitudeKm: 400,
    periapsisKm: 400,
    apoapsisKm: 400,
    insertionAltKm: 400,
    inclinationDeg: 51.6,
    ascentSeconds: 510,
    downrangeDeg: 22,
    copyKey: 'orbit.leo',
    sentence: 'to a low orbit about 400 km up',
  },
  sso: {
    id: 'sso',
    display: 'Sun-synchronous orbit',
    altitudeKm: 550,
    periapsisKm: 550,
    apoapsisKm: 550,
    insertionAltKm: 550,
    inclinationDeg: 97.6,
    ascentSeconds: 540,
    downrangeDeg: 24,
    copyKey: 'orbit.sso',
    sentence: 'to an orbit over the poles, so it sees every part of Earth',
  },
  gto: {
    id: 'gto',
    display: 'Geostationary transfer orbit',
    altitudeKm: 35786,
    periapsisKm: 250,
    apoapsisKm: 35786,
    insertionAltKm: 250,
    inclinationDeg: 27,
    ascentSeconds: 560,
    downrangeDeg: 28,
    copyKey: 'orbit.gto',
    sentence: 'onto a long climb toward a high orbit over one spot',
  },
  meo: {
    id: 'meo',
    display: 'Medium Earth orbit',
    altitudeKm: 20200,
    periapsisKm: 185,
    apoapsisKm: 20200,
    insertionAltKm: 185,
    inclinationDeg: 55,
    ascentSeconds: 600,
    downrangeDeg: 28,
    copyKey: 'orbit.meo',
    sentence: 'to a medium orbit, where the navigation satellites live',
  },
  geo: {
    id: 'geo',
    display: 'Geostationary orbit',
    altitudeKm: 35786,
    periapsisKm: 185,
    apoapsisKm: 35786,
    insertionAltKm: 185,
    inclinationDeg: 0,
    ascentSeconds: 560,
    downrangeDeg: 28,
    copyKey: 'orbit.geo',
    sentence: 'to a high orbit that stays over one spot',
  },
  heo: {
    id: 'heo',
    display: 'Highly elliptical orbit',
    altitudeKm: 39400,
    periapsisKm: 500,
    apoapsisKm: 39400,
    insertionAltKm: 500,
    inclinationDeg: 63.4,
    ascentSeconds: 540,
    downrangeDeg: 26,
    copyKey: 'orbit.heo',
    sentence: 'to a long looping orbit that lingers over the north',
  },
  tli: {
    id: 'tli',
    display: 'Trans-lunar injection',
    altitudeKm: 384400,
    periapsisKm: 185,
    apoapsisKm: 384400,
    insertionAltKm: 185,
    inclinationDeg: 28.5,
    ascentSeconds: 600,
    downrangeDeg: 30,
    copyKey: 'orbit.tli',
    sentence: 'toward the Moon',
  },
  heliocentric: {
    id: 'heliocentric',
    display: 'Escape trajectory',
    altitudeKm: null,
    periapsisKm: 185,
    apoapsisKm: null,
    insertionAltKm: 185,
    inclinationDeg: 28.5,
    ascentSeconds: 600,
    downrangeDeg: 30,
    escape: true,
    copyKey: 'orbit.heliocentric',
    sentence: 'out of Earth’s orbit entirely',
  },
  suborbital: {
    id: 'suborbital',
    display: 'Suborbital',
    altitudeKm: 120,
    periapsisKm: 0,
    apoapsisKm: 120,
    insertionAltKm: 110,
    inclinationDeg: null, // takes the pad's latitude: due east
    ascentSeconds: 200,
    downrangeDeg: 4,
    copyKey: 'orbit.suborbital',
    sentence: 'up to the edge of space and back down',
  },
};

export const DEFAULT_ORBIT_CLASS = 'leo';

/** Upstream spellings (Launch Library 2 abbrevs and names) -> our ids. */
const ALIASES = {
  iss: 'leo',
  'low earth orbit': 'leo',
  po: 'sso',
  'polar orbit': 'sso',
  'sun-synchronous orbit': 'sso',
  'sun synchronous orbit': 'sso',
  ssto: 'sso',
  'geostationary transfer orbit': 'gto',
  gsto: 'gto',
  'geostationary orbit': 'geo',
  gso: 'geo',
  'medium earth orbit': 'meo',
  'highly elliptical orbit': 'heo',
  lo: 'tli',
  'lunar orbit': 'tli',
  'trans lunar injection': 'tli',
  'trans-lunar injection': 'tli',
  hco: 'heliocentric',
  'heliocentric orbit': 'heliocentric',
  'heliocentric n/a': 'heliocentric',
  escape: 'heliocentric',
  so: 'suborbital',
  sub: 'suborbital',
};

/** Earth's rotation rate, rad/s, and GM -- for the ground-relative azimuth correction. */
const OMEGA_EARTH = 7.2921159e-5;
const GM_EARTH = 398600.4418;
const R_EARTH = 6378.137;

/** Resolve an orbit-class key or upstream abbrev to a row. Never returns null. */
export function orbitClass(key) {
  const k = String(key || '')
    .trim()
    .toLowerCase();
  if (ORBIT_CLASSES[k]) return ORBIT_CLASSES[k];
  if (ALIASES[k] && ORBIT_CLASSES[ALIASES[k]]) return ORBIT_CLASSES[ALIASES[k]];
  return ORBIT_CLASSES[DEFAULT_ORBIT_CLASS];
}

/**
 * Launch azimuth, radians clockwise from north.
 * `sign` +1 picks the ascending (northerly) solution, -1 the descending (southerly) one.
 * If the inclination is unreachable from this latitude the ratio is clamped, which yields the
 * closest azimuth the pad can fly -- due east or due west -- rather than NaN.
 */
export function launchAzimuth(latRad, incRad, sign = 1) {
  const cosLat = Math.cos(latRad);
  if (Math.abs(cosLat) < 1e-9) return 0; // from a pole every direction is south (or north)
  let ratio = Math.cos(incRad) / cosLat;
  if (ratio > 1) ratio = 1;
  if (ratio < -1) ratio = -1;
  const asc = Math.asin(ratio);
  const az = sign < 0 ? Math.PI - asc : asc;
  return ((az % TWO_PI) + TWO_PI) % TWO_PI;
}

/**
 * The inertial azimuth is not the heading you would see from the ground: the pad is already
 * moving east at up to 0.46 km/s, and the rocket only has to supply the rest. Since this arc is
 * drawn in earth-fixed, the ground-relative azimuth is the one the curve should follow.
 * Vandenberg to sun-synchronous: 189.3 deg inertial, 192.0 deg ground-relative, ~196 deg flown.
 * Cape Canaveral to the ISS: 45.0 deg inertial, 42.8 deg ground-relative.
 */
export function groundRelativeAzimuth(azInertialRad, siteSpeedKmS, orbitalSpeedKmS) {
  const x = orbitalSpeedKmS * Math.sin(azInertialRad) - siteSpeedKmS;
  const y = orbitalSpeedKmS * Math.cos(azInertialRad);
  if (Math.abs(x) < 1e-12 && Math.abs(y) < 1e-12) return azInertialRad;
  const az = Math.atan2(x, y);
  return ((az % TWO_PI) + TWO_PI) % TWO_PI;
}

function unit(v) {
  const r = Math.hypot(v.x, v.y, v.z);
  return r > 0 ? { x: v.x / r, y: v.y / r, z: v.z / r } : { x: 0, y: 0, z: 0 };
}

/** Everything the arc needs, resolved once from the record. Null if the record is not usable. */
export function ascentGeometry(record) {
  const a = (record && (record.ascent || record.launch)) || null;
  if (!a) return null;

  // The pad, in whichever of the three spellings reached us:
  //   {pad:{latDeg,lonDeg}} / {lat,lon}   -- a registry row
  //   {pad:{latRad,lonRad,altKm}}         -- what data/parsers.js emits (hard rule 6: radians)
  //   {padLatDeg, padLonDeg}              -- the module contract's own `ascent` field
  // Reading only the first meant every launch record propagated to null, silently.
  const pad = a.pad || a;
  let latDeg = Number.isFinite(pad.latDeg) ? pad.latDeg : pad.lat;
  let lonDeg = Number.isFinite(pad.lonDeg) ? pad.lonDeg : pad.lon;
  if (!Number.isFinite(latDeg) && Number.isFinite(pad.latRad)) latDeg = pad.latRad / DEG;
  if (!Number.isFinite(lonDeg) && Number.isFinite(pad.lonRad)) lonDeg = pad.lonRad / DEG;
  if (!Number.isFinite(latDeg) && Number.isFinite(a.padLatDeg)) latDeg = a.padLatDeg;
  if (!Number.isFinite(lonDeg) && Number.isFinite(a.padLonDeg)) lonDeg = a.padLonDeg;
  if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) return null;
  const altKm = Number.isFinite(pad.altKm) ? pad.altKm : 0;

  const t0Ms = Number.isFinite(a.t0Ms)
    ? a.t0Ms
    : Number.isFinite(a.netMs)
      ? a.netMs
      : Number.isFinite(record.epoch)
        ? record.epoch
        : NaN;
  if (!Number.isFinite(t0Ms)) return null;

  // `orbitAbbrev` is the Launch Library 2 spelling data/parsers.js carries through; orbitClass()
  // already knows the abbrevs, it was just never handed them.
  const oc = orbitClass(a.orbitClass || a.orbit || a.target || a.orbitAbbrev);
  const latRad = latDeg * DEG;
  const lonRad = lonDeg * DEG;

  const incDeg = Number.isFinite(a.inclinationDeg)
    ? a.inclinationDeg
    : Number.isFinite(a.targetInclRad)
      ? a.targetInclRad / DEG
      : Number.isFinite(oc.inclinationDeg)
        ? oc.inclinationDeg
        : Math.abs(latDeg);
  // Range safety, per pad. A registry row, never a guess from the data.
  const sign = Number.isFinite(a.azimuthSign) ? a.azimuthSign : 1;

  // `durationS` is the data layer's spelling of the same seconds. Note `targetAltKm` is NOT read
  // as the insertion altitude: for GTO it is 35 786 km, and an arc that ends there would draw the
  // whole transfer orbit as if the rocket flew it in nine minutes.
  const durationSec = Number.isFinite(a.ascentSeconds)
    ? a.ascentSeconds
    : Number.isFinite(a.durationSec)
      ? a.durationSec
      : Number.isFinite(a.durationS)
        ? a.durationS
        : oc.ascentSeconds;
  const insertionAltKm = Number.isFinite(a.insertionAltKm) ? a.insertionAltKm : oc.insertionAltKm;
  const downrangeRad = (Number.isFinite(a.downrangeDeg) ? a.downrangeDeg : oc.downrangeDeg) * DEG;

  const padEcef = geodeticToEcef(latRad, lonRad, altKm);
  const radial = unit(padEcef);

  const azInertialRad = launchAzimuth(latRad, incDeg * DEG, sign);
  let azRad;
  if (Number.isFinite(a.azimuthDeg)) {
    azRad = a.azimuthDeg * DEG; // a registry override wins outright
  } else if (a.groundRelative === false) {
    azRad = azInertialRad;
  } else {
    const siteSpeed = OMEGA_EARTH * Math.hypot(padEcef.x, padEcef.y);
    const orbitalSpeed = Math.sqrt(GM_EARTH / (R_EARTH + Math.max(insertionAltKm, 100)));
    azRad = groundRelativeAzimuth(azInertialRad, siteSpeed, orbitalSpeed);
  }

  // Local east/north from the geodetic normal, then projected onto the plane normal to `radial`
  // so that |arc| = |pad| + h exactly. The two normals differ by under 0.2 deg; the projection
  // costs three multiplies and removes the argument.
  const east = { x: -Math.sin(lonRad), y: Math.cos(lonRad), z: 0 };
  const north = {
    x: -Math.sin(latRad) * Math.cos(lonRad),
    y: -Math.sin(latRad) * Math.sin(lonRad),
    z: Math.cos(latRad),
  };
  const sa = Math.sin(azRad);
  const ca = Math.cos(azRad);
  const raw = {
    x: sa * east.x + ca * north.x,
    y: sa * east.y + ca * north.y,
    z: sa * east.z + ca * north.z,
  };
  const dot = raw.x * radial.x + raw.y * radial.y + raw.z * radial.z;
  const heading = unit({
    x: raw.x - dot * radial.x,
    y: raw.y - dot * radial.y,
    z: raw.z - dot * radial.z,
  });

  return {
    orbit: oc,
    padEcef,
    padRadiusKm: Math.hypot(padEcef.x, padEcef.y, padEcef.z),
    radial,
    heading,
    latRad,
    lonRad,
    altKm,
    azRad,
    azInertialRad,
    inclinationDeg: incDeg,
    t0Ms,
    durationSec,
    insertionAltKm,
    downrangeRad,
  };
}

/** The point on the arc at flight fraction f in [0, 1]. ECEF km. */
function pointAt(g, f) {
  const h = g.insertionAltKm * (2 * f * f - f * f * f * f);
  const theta = g.downrangeRad * f * f * f;
  const r = g.padRadiusKm + h;
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  return {
    x: r * (ct * g.radial.x + st * g.heading.x),
    y: r * (ct * g.radial.y + st * g.heading.y),
    z: r * (ct * g.radial.z + st * g.heading.z),
  };
}

/**
 * The whole arc as a polyline, for the dashed curve. `segments` edges, so segments+1 points.
 * Returns {frame, cls, points, orbit, azimuthDeg, t0Ms, durationSec} or null.
 */
export function ascentPath(record, segments = 60) {
  const g = ascentGeometry(record);
  if (!g) return null;
  const n = Math.max(2, Math.floor(segments));
  const points = new Array(n + 1);
  for (let i = 0; i <= n; i++) points[i] = pointAt(g, i / n);
  return {
    frame: 'earth-fixed',
    cls: 'illustrative',
    points,
    orbit: g.orbit,
    azimuthDeg: (g.azRad * 180) / Math.PI,
    azimuthInertialDeg: (g.azInertialRad * 180) / Math.PI,
    inclinationDeg: g.inclinationDeg,
    t0Ms: g.t0Ms,
    durationSec: g.durationSec,
    insertionAltKm: g.insertionAltKm,
  };
}

/**
 * propagate signature: (record, tMs) -> {x, y, z, frame, cls, f, phase} | null.
 * Before T0 the vehicle sits on the pad; after insertion it holds at the end of the arc until the
 * catalogue takes over (spec 0011: the arc is removed when a measured object matches, and expires
 * at T0 + 14 days regardless).
 */
export function ascent(record, tMs) {
  if (!Number.isFinite(tMs)) return null;
  let g;
  try {
    g = ascentGeometry(record);
  } catch (err) {
    return null;
  }
  if (!g) return null;

  const raw = (tMs - g.t0Ms) / (g.durationSec * 1000);
  const f = raw < 0 ? 0 : raw > 1 ? 1 : raw;
  const p = pointAt(g, f);

  return {
    x: p.x,
    y: p.y,
    z: p.z,
    frame: 'earth-fixed',
    cls: 'illustrative', // not negotiable
    f,
    phase: raw < 0 ? 'pre' : raw >= 1 ? 'inserted' : 'ascent',
  };
}

export default ascent;

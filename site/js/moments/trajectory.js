// moments/trajectory.js -- where a Moment's vehicles are: the loaders and the state at any second (internal spec 0079 C1).
//
// TWO KINDS OF PATH, the two kinds of record a mission leaves:
//
//   profile   An ascent (or an entry) as the reports publish it: altitude and downrange distance at a handful of
//             event times (lift-off, Mach 1, max Q, cut-offs, staging). Between them a monotone cubic
//             (format.js monotoneCubic), so a height that rises between two published values never dips; the
//             path is laid along the flight azimuth over a round Earth from the `place`. It is RECONSTRUCTED and
//             the moment says so. Its frame is the Earth's own ('fixed'): a pad stays under a rocket.
//   vectors   State vectors, [t, x, y, z, vx, vy, vz] in km and km/s about the Earth's centre, as JPL Horizons
//             writes them or a post-flight report lists them: fromHorizons() reads a Horizons table, `rows` carry
//             them inline. Between rows a cubic Hermite on position and velocity, which is exact for a straight
//             line and good to metres for an orbit sampled every minute. Their frame is inertial (TEME axes, the
//             app's Earth-inertial frame: propagate/frames.js j2000ToTeme turns J2000 rows into it).
//
// Positions are metres, in plain [x, y, z] arrays. moments/stage.js turns the Earth-inertial frame into three.js's
// axes (stage.js eciToThree); nothing here knows three.js, so node holds it (tests/test_moments.mjs).

import { geodeticToEcef, gmst, j2000ToTeme } from '../propagate/frames.js';
import { horizonsSamples, horizonsToUtcMs } from '../data/parsers.js';
import { monotoneCubic } from './format.js';

/** The round Earth a profile is laid over, metres (IUGG mean radius). */
export const EARTH_R = 6371008.8;
export const MU = 3.986004418e14;
/** The Earth's rotation, rad/s. */
export const OMEGA = 7.2921159e-5;
const DEG = Math.PI / 180;

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** A place on the Earth as a local frame: its position (ECEF, metres, WGS84) and east, north, up unit vectors. */
export function placeFrame(place) {
  const lat = place.lat * DEG, lon = place.lon * DEG;
  const p = geodeticToEcef(lat, lon, (place.alt || 0) / 1000);
  const sl = Math.sin(lat), cl = Math.cos(lat), so = Math.sin(lon), co = Math.cos(lon);
  return {
    ecef: [p.x * 1000, p.y * 1000, p.z * 1000],
    e: [-so, co, 0],
    n: [-sl * co, -sl * so, cl],
    u: [cl * co, cl * so, sl],
    lat, lon,
  };
}

/** East, north, up metres at a place -> ECEF metres. A direction when `dir` (no translation). */
export function enuToEcef(frame, enu, dir = false) {
  const v = add(add(scale(frame.e, enu[0]), scale(frame.n, enu[1])), scale(frame.u, enu[2]));
  return dir ? v : add(frame.ecef, v);
}

/** Rotate an Earth-fixed vector into the Earth-inertial frame at sidereal angle g (radians). */
export function fixedToInertial(v, g) {
  const c = Math.cos(g), s = Math.sin(g);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
}

/** Greenwich sidereal angle at mission second t of a moment whose T-0 is epochMs. */
export function siderealAt(epochMs, t) {
  return gmst(epochMs + t * 1000);
}

/**
 * A published profile as a path. `tr` = { points: [[t, altitude km, downrange km], ...], azimuth? (degrees from
 * north, else the place's) }. Returns { frame: 'fixed', from, to, stateAt(t) } where stateAt gives, in the place's
 * east-north-up metres, `p` (position), `v` (velocity), `up` (the local vertical under the vehicle), and the
 * published quantities `altM`, `downrangeM`, `speed` (ground-relative m/s). Before the first point the vehicle
 * stands at it; after the last, it carries on along the end slopes and `past` is true.
 */
export function profileTrack(tr, place) {
  const pts = tr.points;
  const az = (Number.isFinite(tr.azimuth) ? tr.azimuth : place.azimuth) * DEG;
  const ts = pts.map((r) => r[0]);
  const alt = monotoneCubic(ts, pts.map((r) => r[1] * 1000));
  const dr = monotoneCubic(ts, pts.map((r) => r[2] * 1000));
  const sa = Math.sin(az), ca = Math.cos(az);
  const from = ts[0], to = ts[ts.length - 1];
  function stateAt(t) {
    const tt = Math.max(from, t);
    const H = alt(tt), S = dr(tt);
    const h = Math.max(0, H.y), s = Math.max(0, S.y);
    const dh = t < from ? 0 : H.dy, ds = t < from ? 0 : S.dy;
    const th = s / EARTH_R, rr = EARTH_R + h;
    const horiz = rr * Math.sin(th), upv = rr * Math.cos(th) - EARTH_R;
    const dHoriz = dh * Math.sin(th) + rr * Math.cos(th) * ds / EARTH_R;
    const dUp = dh * Math.cos(th) - rr * Math.sin(th) * ds / EARTH_R;
    return {
      p: [horiz * sa, horiz * ca, upv],
      v: [dHoriz * sa, dHoriz * ca, dUp],
      up: [Math.sin(th) * sa, Math.sin(th) * ca, Math.cos(th)],
      altM: h,
      downrangeM: s,
      speed: Math.hypot(dHoriz, dUp),
      past: t > to,
    };
  }
  return { frame: 'fixed', from, to, azimuth: az, stateAt };
}

/**
 * State vectors as a path. `rows` [[t, x, y, z, vx, vy, vz]] (mission seconds, km, km/s); `frame` 'earth-j2000'
 * (Horizons' ICRF/J2000 geocentric) or 'earth-teme'; `epochMs` the moment's T-0, for the J2000 -> TEME turn.
 * Returns { frame: 'inertial', from, to, stateAt(t) -> { r, v } in metres and m/s } (Hermite between rows; outside,
 * a straight line on the end velocity, with `past`).
 */
export function vectorTrack(rows, frame, epochMs) {
  const list = rows.map((r) => {
    let p = { x: r[1], y: r[2], z: r[3] }, v = { x: r[4], y: r[5], z: r[6] };
    if (frame === 'earth-j2000') { const tMs = epochMs + r[0] * 1000; p = j2000ToTeme(p, tMs); v = j2000ToTeme(v, tMs); }
    return { t: r[0], r: [p.x * 1000, p.y * 1000, p.z * 1000], v: [v.x * 1000, v.y * 1000, v.z * 1000] };
  }).sort((a, b) => a.t - b.t);
  const from = list[0].t, to = list[list.length - 1].t;
  function stateAt(t) {
    if (t <= from || t >= to) {
      const e = t <= from ? list[0] : list[list.length - 1];
      return { r: add(e.r, scale(e.v, t - e.t)), v: e.v.slice(), past: t > to };
    }
    let lo = 0, hi = list.length - 2, i = 0;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (list[mid].t <= t) { i = mid; lo = mid + 1; } else hi = mid - 1; }
    const a = list[i], b = list[i + 1], h = b.t - a.t, u = (t - a.t) / h, u2 = u * u, u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
    const d00 = (6 * u2 - 6 * u) / h, d10 = 3 * u2 - 4 * u + 1, d01 = (-6 * u2 + 6 * u) / h, d11 = 3 * u2 - 2 * u;
    const r = [0, 1, 2].map((k) => h00 * a.r[k] + h10 * h * a.v[k] + h01 * b.r[k] + h11 * h * b.v[k]);
    const v = [0, 1, 2].map((k) => d00 * a.r[k] + d10 * a.v[k] + d01 * b.r[k] + d11 * b.v[k]);
    return { r, v, past: false };
  }
  return { frame: 'inertial', from, to, stateAt };
}

/**
 * A JPL Horizons vector table (CSV, km and km/s, geocentric) as rows for vectorTrack, in seconds from `epochMs`.
 * Horizons writes TDB unless asked for UT; the table's own header says which (data/parsers.js horizonsToUtcMs).
 */
export function fromHorizons(text, epochMs) {
  const off = horizonsToUtcMs(text);
  return horizonsSamples(text).map((s) => [(s.tMs - off - epochMs) / 1000, s.x, s.y, s.z, s.vx, s.vy, s.vz]);
}

/**
 * Where a separated part is `dt` seconds after it left: a ballistic arc from the vehicle's state then (position,
 * velocity, both in the trajectory's frame, metres) plus its push `dvWorld`, under the Earth's pull. Drag is left out
 * and the moment says the part's fall is illustrative.
 */
export function ballistic(p0, v0, dvWorld, dt) {
  const v = add(v0, dvWorld);
  // Two half steps of the pull at the start and at the midpoint: enough for the minute a part is in the frame.
  const g0 = gravity(p0);
  const mid = add(add(p0, scale(v, dt / 2)), scale(g0, dt * dt / 8));
  const g = gravity(mid);
  return add(add(p0, scale(v, dt)), scale(g, dt * dt / 2));
}

/** The Earth's pull at a point of an Earth-centred frame, m/s^2. */
export function gravity(p) {
  const r = len(p) || EARTH_R;
  return scale(p, -MU / (r * r * r));
}

/**
 * A vehicle's attitude as a basis [X, Y, Z] (unit vectors in the trajectory's frame): Y along the stack (nose), Z
 * towards `ref` as nearly as Y allows. `mode`: 'vertical' (Y up the local vertical), 'prograde' (along the velocity),
 * 'retrograde', or 'ascent' (vertical until `pitchStart`, then turning onto the velocity over `turnS` seconds, as a
 * launcher's pitch programme does: the profile's own flight path, so the reconstruction does not invent a second one).
 */
export function attitude(mode, { up, vel, ref, t = 0, pitchStart = 0, turnS = 12 }) {
  let y;
  const v = len(vel) > 0.5 ? norm(vel) : up;
  if (mode === 'prograde') y = v;
  else if (mode === 'retrograde') y = scale(v, -1);
  else if (mode === 'ascent') {
    const k = Math.min(1, Math.max(0, (t - pitchStart) / turnS));
    const s = k * k * (3 - 2 * k);
    y = norm(add(scale(up, 1 - s), scale(v, s)));
    if (dot(y, up) < 0.05 && s < 1) y = up;
  } else y = up;
  let z = sub(ref, scale(y, dot(ref, y)));
  if (len(z) < 1e-6) z = Math.abs(y[2]) < 0.9 ? cross(y, [0, 0, 1]) : cross(y, [1, 0, 0]);
  z = norm(z);
  const x = norm(cross(y, z));
  return [x, y, z];
}

/** A vector given in a basis [X, Y, Z] (components along each) -> the frame the basis is written in. */
export function fromBasis(b, v) {
  return add(add(scale(b[0], v[0]), scale(b[1], v[1])), scale(b[2], v[2]));
}

/** Rotate a basis about its own axes by the small rotation vector w (radians), Rodrigues on each axis. */
export function spinBasis(b, w) {
  const axisWorld = fromBasis(b, w);
  const ang = len(axisWorld);
  if (ang < 1e-9) return b;
  const k = scale(axisWorld, 1 / ang), c = Math.cos(ang), s = Math.sin(ang);
  return b.map((e) => add(add(scale(e, c), scale(cross(k, e), s)), scale(k, dot(k, e) * (1 - c))));
}

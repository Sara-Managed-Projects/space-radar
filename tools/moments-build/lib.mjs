// tools/moments-build/lib.mjs -- the paths of the Moments (release 1.6.0, internal spec 0079): two-body arcs, a Lambert
// solver, the Moon's place and the sampler that writes a path as the state-vector rows the player reads
// (site/data/moments/<id>-<path>.json, `{rows: [[t, x, y, z, vx, vy, vz]]}`, km and km/s, the Earth-inertial frame of
// the app, `frame: "earth-teme"`). Run by hand: `node tools/moments-build/apollo11.mjs` (and vostok1, artemis2); the
// output is committed, this folder is how it was made and how to make it again. CI does not run it.
//
// WHAT THESE PATHS ARE. Reconstructions: the published event times and places are the anchors, and the arcs between
// them are two-body arcs (an Earth-only conic for a coast to the Moon, a Moon-only hyperbola or circle near it) joined
// by cubic Hermite blends over a burn. They are not tracking data. Every moment says so on its own foot line.
import { add, sub, scale, dot, cross, len, norm, fixedToInertial, siderealAt, MU, EARTH_R } from '../../site/js/moments/trajectory.js';
import { worldPositionKm } from '../../site/js/propagate/body.js';
import { writeFileSync } from 'node:fs';

export const MU_MOON = 4.9028e12;
export const R_MOON = 1737400;
export { add, sub, scale, dot, cross, len, norm, MU, EARTH_R };
export const DEG = Math.PI / 180;

const C = (z) => (z > 1e-8 ? (1 - Math.cos(Math.sqrt(z))) / z : z < -1e-8 ? (Math.cosh(Math.sqrt(-z)) - 1) / -z : 0.5 - z / 24 + z * z / 720);
const S = (z) => (z > 1e-8 ? (Math.sqrt(z) - Math.sin(Math.sqrt(z))) / Math.sqrt(z ** 3) : z < -1e-8 ? (Math.sinh(Math.sqrt(-z)) - Math.sqrt(-z)) / Math.sqrt((-z) ** 3) : 1 / 6 - z / 120 + z * z / 5040);

/** Advance a two-body state (metres, m/s) by dt seconds about a body of gravitational parameter mu (universal variables). */
export function kepler(r0, v0, dt, mu = MU) {
  if (dt === 0) return { r: r0.slice(), v: v0.slice() };
  const rn = len(r0), vr = dot(r0, v0) / rn, alpha = 2 / rn - dot(v0, v0) / mu, sm = Math.sqrt(mu);
  let chi = sm * Math.abs(alpha) * dt;
  if (!Number.isFinite(chi) || Math.abs(alpha) < 1e-12) chi = sm * dt / rn;
  for (let i = 0; i < 80; i += 1) {
    const z = alpha * chi * chi, c = C(z), s = S(z);
    const F = (rn * vr / sm) * chi * chi * c + (1 - alpha * rn) * chi ** 3 * s + rn * chi - sm * dt;
    const dF = (rn * vr / sm) * chi * (1 - z * s) + (1 - alpha * rn) * chi * chi * c + rn;
    const d = F / dF;
    chi -= d;
    if (Math.abs(d) < 1e-9 * Math.max(1, Math.abs(chi))) break;
  }
  const z = alpha * chi * chi, c = C(z), s = S(z);
  const f = 1 - chi * chi / rn * c, g = dt - chi ** 3 * s / sm;
  const r = add(scale(r0, f), scale(v0, g)), rr = len(r);
  const fd = sm / (rr * rn) * (z * s - 1) * chi, gd = 1 - chi * chi / rr * c;
  return { r, v: add(scale(r0, fd), scale(v0, gd)) };
}

/** Lambert: the velocity at r1 that reaches r2 in tof seconds, going the way `hint` (an orbit normal) says. */
export function lambert(r1, r2, tof, mu, hint) {
  const a = len(r1), b = len(r2);
  let dth = Math.acos(Math.max(-1, Math.min(1, dot(r1, r2) / (a * b))));
  if (dot(cross(r1, r2), hint) < 0) dth = 2 * Math.PI - dth;
  const A = Math.sin(dth) * Math.sqrt(a * b / (1 - Math.cos(dth)));
  const Y = (z) => a + b + A * (z * S(z) - 1) / Math.sqrt(C(z));
  const F = (z) => { const y = Y(z); return y < 0 ? -Infinity : (y / C(z)) ** 1.5 * S(z) + A * Math.sqrt(y) - Math.sqrt(mu) * tof; };
  let lo = -4 * Math.PI * Math.PI * 4, hi = 4 * Math.PI * Math.PI - 1e-6;
  for (let i = 0; i < 200; i += 1) { const mid = (lo + hi) / 2; if (F(mid) < 0) lo = mid; else hi = mid; }
  const z = (lo + hi) / 2, y = Y(z);
  const f = 1 - y / a, g = A * Math.sqrt(y / mu), gd = 1 - y / b;
  return { v1: scale(sub(r2, scale(r1, f)), 1 / g), v2: scale(sub(scale(r2, gd), r1), 1 / g) };
}

/** The Moon at mission second t of a moment whose T-0 is epochMs: { r, v } in the Earth-inertial frame, metres. */
export function moonAt(epochMs, t) {
  const at = (x) => { const q = worldPositionKm('moon', epochMs + x * 1000, 'earth-inertial'); return [q.x * 1000, q.y * 1000, q.z * 1000]; };
  return { r: at(t), v: scale(sub(at(t + 5), at(t - 5)), 0.1) };
}

/** The Moon's body axes (the same as site/js/moments/trajectory.js moonAxes). */
export { moonAxes, moonSurfaceDir } from '../../site/js/moments/trajectory.js';

/** A state at the Earth-fixed place (ECEF metres) at mission second t, inertial. */
export function fromEcef(ecef, epochMs, t) {
  const g = siderealAt(epochMs, t);
  const r = fixedToInertial(ecef, g);
  return { r, v: [-7.2921159e-5 * r[1], 7.2921159e-5 * r[0], 0] };
}

/** Cubic Hermite between two states a (at t0) and b (at t1): the state at t. */
export function hermite(a, b, t0, t1, t) {
  const h = t1 - t0, u = (t - t0) / h, u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  const d00 = (6 * u2 - 6 * u) / h, d10 = 3 * u2 - 4 * u + 1, d01 = (-6 * u2 + 6 * u) / h, d11 = 3 * u2 - 2 * u;
  const r = [0, 1, 2].map((k) => h00 * a.r[k] + h10 * h * a.v[k] + h01 * b.r[k] + h11 * h * b.v[k]);
  const v = [0, 1, 2].map((k) => d00 * a.r[k] + d10 * a.v[k] + d01 * b.r[k] + d11 * b.v[k]);
  return { r, v };
}

/**
 * Write a path. `segs` = [{ from, to, at(t) -> {r, v}, step(t) -> seconds }] in time order; the rows of each segment
 * run from its `from` to its `to` inclusive. A row is rounded to a metre and a millimetre a second.
 */
export function rowsOf(segs) {
  const rows = [];
  const push = (t, s) => {
    const row = [Math.round(t * 100) / 100, ...s.r.map((x) => Math.round(x) / 1000), ...s.v.map((x) => Math.round(x) / 1000)];
    if (rows.length && rows[rows.length - 1][0] >= row[0] - 1e-6) rows.pop();
    rows.push(row);
  };
  for (const sg of segs) {
    let t = sg.from;
    while (t < sg.to - 1e-6) { push(t, sg.at(t)); t += Math.max(0.5, sg.step(t)); }
    push(sg.to, sg.at(sg.to));
  }
  return rows;
}

/** Step in seconds for a body at radius r about a centre with speed v: 0.15 rad of arc, between lo and hi. */
export const arcStep = (r, v, lo = 2, hi = 1800) => Math.max(lo, Math.min(hi, 0.15 * r / Math.max(v, 1)));

export function save(file, rows, note) {
  writeFileSync(file, `{"note": ${JSON.stringify(note)}, "rows": [\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]}\n`);
  console.log(`${file}: ${rows.length} rows, ${(rows.length * 80 / 1000).toFixed(0)} kB`);
}

/** Largest jump between consecutive rows, as a check on a join: position (km) and velocity (m/s) at the row after `t`. */
export function junction(rows, t) {
  const i = rows.findIndex((r) => r[0] >= t);
  if (i < 1) return null;
  const a = rows[i - 1], b = rows[i], dt = b[0] - a[0];
  const pos = Math.hypot(b[1] - a[1] - a[4] * dt, b[2] - a[2] - a[5] * dt, b[3] - a[3] - a[6] * dt);
  const vel = Math.hypot(b[4] - a[4], b[5] - a[5], b[6] - a[6]) * 1000;
  return { at: a[0], dt, dposKm: +pos.toFixed(2), dvMs: +vel.toFixed(1) };
}

import { readFileSync } from 'node:fs';
import { placeFrame, enuToEcef, profileTrack } from '../../site/js/moments/trajectory.js';
export { placeFrame, enuToEcef, profileTrack };

/** A row's flow-style fields from registry/models.yaml, as objects (`parts`, `attach`, `engines`, `stations`). */
export function registryRow(id) {
  const text = readFileSync(new URL('../../registry/models.yaml', import.meta.url), 'utf8');
  const line = text.split('\n').find((l) => l.startsWith(`  - {id: ${id},`));
  if (!line) throw new Error(`no row ${id}`);
  const grab = (key) => {
    const i = line.indexOf(` ${key}: `);
    if (i < 0) return null;
    let j = i + key.length + 3;
    const open = line[j], close = open === '[' ? ']' : '}';
    let depth = 0, k = j;
    for (; k < line.length; k += 1) { if (line[k] === open) depth += 1; else if (line[k] === close) { depth -= 1; if (!depth) break; } }
    const raw = line.slice(j, k + 1).replace(/([{,]\s*)([A-Za-z][\w-]*)\s*:/g, '$1"$2":').replace(/\[\s*([A-Za-z][\w-]*)\s*,/g, '["$1",');
    try { return JSON.parse(raw.replace(/(\[|,)\s*([A-Za-z][\w-]*)(?=\s*[,\]])/g, '$1"$2"')); } catch { return null; }
  };
  return { parts: grab('parts'), attach: grab('attach'), engines: grab('engines'), stations: grab('stations') };
}

/** Where a point is: spherical destination from (lat, lon) degrees, bearing degrees, distance km. */
export function destination(lat, lon, bearing, km) {
  const R = 6371.0088, d = km / R, b = bearing * DEG, p = lat * DEG, l = lon * DEG;
  const p2 = Math.asin(Math.sin(p) * Math.cos(d) + Math.cos(p) * Math.sin(d) * Math.cos(b));
  const l2 = l + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p), Math.cos(d) - Math.sin(p) * Math.sin(p2));
  return { lat: p2 / DEG, lon: ((l2 / DEG + 540) % 360) - 180 };
}

/** The inertial state at second t of a point at geodetic (lat, lon, alt m) on the turning Earth; the velocity by a short difference. */
export function groundState(epochMs, lat, lon, altM, t) {
  const at = (x) => fromEcef(placeFrame({ lat, lon, alt: altM }).ecef, epochMs, x).r;
  return { r: at(t), v: scale(sub(at(t + 0.5), at(t - 0.5)), 1) };
}

/** The inertial state of a profile (moments/trajectory.js profileTrack) at second t, from the pad `place`. */
export function profileInertial(epochMs, track, frame, t) {
  const s = track.stateAt(t);
  const g = siderealAt(epochMs, t);
  const pe = enuToEcef(frame, s.p), ve = enuToEcef(frame, s.v, true);
  const r = fixedToInertial(pe, g);
  const w = [-7.2921159e-5 * r[1], 7.2921159e-5 * r[0], 0];
  return { r, v: add(fixedToInertial(ve, g), w), altM: s.altM };
}

/** A path from a position function: the state by a short central difference (inertial, metres). */
export const diffState = (posAt) => (t) => ({ r: posAt(t), v: sub(posAt(t + 0.5), posAt(t - 0.5)) });
/** The inertial position of a point at geodetic (lat, lon, alt m) on the turning Earth at second t. */
export const groundPos = (epochMs, lat, lon, altM, t) => fromEcef(placeFrame({ lat, lon, alt: altM }).ecef, epochMs, t).r;

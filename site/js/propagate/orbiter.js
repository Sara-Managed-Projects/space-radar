// propagate/orbiter.js -- a spacecraft in orbit round a planet or the Moon, placed FROM that world.
//
// WHY IT EXISTS (2026-09-22). The deep-space layer drew Mars Reconnaissance Orbiter from JPL
// Horizons' heliocentric vectors, six hours apart, joined by a cubic Hermite curve. MRO laps Mars
// in 112 minutes, so six hours is three laps and the curve between two samples is not an orbit at
// all: measured against Horizons at 10-minute steps, 2026-09-23..25, it was up to 17 914 km from
// the real craft, and it was drawn 483 to 17 470 km from Mars's centre, where the real orbit is
// 3 626 to 3 695 km -- in and out of a planet 3 389.5 km in radius. Two further faults sat under
// that one, and either alone would have been enough to put it inside Mars:
//   * The planet on the screen is Astronomy Engine's, and Astronomy Engine's Mars is up to 3 103 km
//     from JPL's (heliocentric, daily over 2026-09-01..12-31). A heliocentric vector for the craft,
//     however exact, lands off the drawn planet by that much. Jupiter: 17 904 km. The Moon: 1 251.
//   * Horizons' clock is TDB, 69.184 s ahead of UTC, and the vectors were read as UTC. Mars moves
//     23.8 km/s round the Sun, so the craft slid 1 644 km along Mars's path relative to the planet.
// So a craft that circles a world is kept in THAT WORLD'S frame (`<world>-inertial`: centred on
// it, ecliptic J2000 axes, propagate/frames.js), from Horizons asked for CENTER='500@<world>', and
// frames.js adds the drawn world's own position. The drawn craft is then exactly as far from the
// drawn world as the real one is from the real one.
//
// Between two states it is moved by two-body motion round that world -- the shape an orbit has --
// not by a cubic. `samples` are states (km, km/s) in the record's frame; `muKm3S2` is the world's
// GM, from the Horizons header of the same request:
//   * between two samples: propagated forward from the earlier AND back from the later, blended
//     with a smoothstep weight, so the path is continuous and passes through every sample;
//   * outside them: propagated from the nearest one, for up to `record.extrapolateMs` (default
//     EXTRAPOLATION_LIMIT_MS, the same seven days propagate/sampled.js allows), then null.
// Always `inferred`: nobody measured the craft at this instant. How far two-body motion strays in
// how long is measured per craft and written where the record is built (data/sample.js).

/** Same limit as propagate/sampled.js: beyond this outside the samples, stop drawing. */
export const EXTRAPOLATION_LIMIT_MS = 7 * 24 * 3600 * 1000;

const normCache = new WeakMap();

function normalise(samples) {
  if (!Array.isArray(samples) || samples.length === 0) return null;
  const cached = normCache.get(samples);
  if (cached) return cached;
  const out = samples.map((s) => {
    if (Array.isArray(s.rKm)) {
      const v = Array.isArray(s.vKmS) ? s.vKmS : [0, 0, 0];
      return { tMs: s.tMs, x: s.rKm[0], y: s.rKm[1], z: s.rKm[2], vx: v[0], vy: v[1], vz: v[2] };
    }
    return s;
  }).filter((s) => [s.tMs, s.x, s.y, s.z, s.vx, s.vy, s.vz].every(Number.isFinite))
    .sort((a, b) => a.tMs - b.tMs);
  normCache.set(samples, out);
  return out;
}

// Stumpff functions, with their series near zero where the closed forms lose every digit.
function stumpC(z) {
  if (z > 1e-6) return (1 - Math.cos(Math.sqrt(z))) / z;
  if (z < -1e-6) return (Math.cosh(Math.sqrt(-z)) - 1) / -z;
  return 1 / 2 - z / 24 + (z * z) / 720;
}
function stumpS(z) {
  if (z > 1e-6) { const s = Math.sqrt(z); return (s - Math.sin(s)) / (s * s * s); }
  if (z < -1e-6) { const s = Math.sqrt(-z); return (Math.sinh(s) - s) / (s * s * s); }
  return 1 / 6 - z / 120 + (z * z) / 5040;
}

/**
 * Two-body motion: the state `s` ({x,y,z,vx,vy,vz}, km and km/s) carried `dtSec` seconds forward
 * (or back) round a centre of gravitational parameter `mu`. Universal variables with Lagrange's f
 * and g, so one formula serves the ellipse and anything else. Returns {x,y,z,vx,vy,vz} or null.
 *
 * A bound orbit repeats exactly, so dt is first reduced modulo the period: a stand-in a year past
 * its epoch is MRO 4 700 laps on, and solving for 4 700 laps in one go would spend the digits the
 * answer needs. The universal-Kepler residual F(chi) rises strictly with chi (dF/dchi is the
 * radius), so Newton is kept inside a bracket and falls back to bisection; it cannot run away.
 */
export function twoBody(s, dtSec, mu) {
  if (!s || !Number.isFinite(dtSec) || !(mu > 0)) return null;
  const r0 = Math.hypot(s.x, s.y, s.z);
  if (!(r0 > 0)) return null;
  const v0sq = s.vx * s.vx + s.vy * s.vy + s.vz * s.vz;
  const rv = s.x * s.vx + s.y * s.vy + s.z * s.vz;
  const alpha = 2 / r0 - v0sq / mu; // 1/a; positive for an ellipse
  const sqmu = Math.sqrt(mu);
  let dt = dtSec;
  let hi;
  let lo;
  if (alpha > 1e-12) {
    const period = 2 * Math.PI / Math.sqrt(mu * alpha * alpha * alpha);
    dt = ((dt % period) + period) % period;
    lo = 0;
    hi = 2 * Math.PI / Math.sqrt(alpha) + 1e-9; // one full lap of eccentric anomaly
  }
  if (dt === 0) return { x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, vz: s.vz };
  const F = (chi) => {
    const z = alpha * chi * chi;
    return (rv / sqmu) * chi * chi * stumpC(z) + (1 - alpha * r0) * chi * chi * chi * stumpS(z)
      + r0 * chi - sqmu * dt;
  };
  if (hi === undefined) {
    // Unbound or nearly so: grow a bracket from zero in the direction of dt.
    const sign = dt > 0 ? 1 : -1;
    let step = sqmu * Math.abs(dt) / r0;
    let k = 0;
    while (sign * F(sign * step) < 0 && k++ < 200) step *= 2;
    lo = sign > 0 ? 0 : -step;
    hi = sign > 0 ? step : 0;
  }
  let chi = alpha > 1e-12 ? Math.min(hi, sqmu * dt * alpha) : 0.5 * (lo + hi);
  for (let i = 0; i < 100; i++) {
    const z = alpha * chi * chi;
    const C = stumpC(z);
    const S = stumpS(z);
    const f = (rv / sqmu) * chi * chi * C + (1 - alpha * r0) * chi * chi * chi * S + r0 * chi
      - sqmu * dt;
    if (f > 0) hi = chi; else lo = chi;
    const fp = (rv / sqmu) * chi * (1 - z * S) + (1 - alpha * r0) * chi * chi * C + r0;
    let next = fp > 0 ? chi - f / fp : NaN;
    if (!(next > lo && next < hi)) next = 0.5 * (lo + hi);
    const done = Math.abs(next - chi) <= 1e-12 * Math.max(1, Math.abs(chi));
    chi = next;
    if (done || hi - lo < 1e-12 * Math.max(1, Math.abs(chi))) break;
  }
  const z = alpha * chi * chi;
  const C = stumpC(z);
  const S = stumpS(z);
  const f = 1 - (chi * chi / r0) * C;
  const g = dt - (chi * chi * chi / sqmu) * S;
  const x = f * s.x + g * s.vx;
  const y = f * s.y + g * s.vy;
  const zz = f * s.z + g * s.vz;
  const r = Math.hypot(x, y, zz);
  if (!(r > 0)) return null;
  const fd = (sqmu / (r * r0)) * (alpha * chi * chi * chi * S - chi);
  const gd = 1 - (chi * chi / r) * C;
  const out = {
    x, y, z: zz,
    vx: fd * s.x + gd * s.vx,
    vy: fd * s.y + gd * s.vy,
    vz: fd * s.z + gd * s.vz,
  };
  return [out.x, out.y, out.z, out.vx, out.vy, out.vz].every(Number.isFinite) ? out : null;
}

/** Index of the last sample at or before tMs; -1 before the first. */
function bracket(list, tMs) {
  if (tMs < list[0].tMs) return -1;
  let lo = 0;
  let hi = list.length - 1;
  if (tMs >= list[hi].tMs) return hi;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (list[mid].tMs <= tMs) lo = mid; else hi = mid;
  }
  return lo;
}

/** The state at tMs, {x,y,z,vx,vy,vz}, in the record's frame; null outside the allowed span. */
export function orbiterState(record, tMs) {
  if (!record || !Number.isFinite(tMs)) return null;
  const mu = record.muKm3S2;
  const list = normalise(record.samples);
  if (!list || !list.length || !(mu > 0)) return null;
  // Infinity is allowed and meant: a bundled stand-in's one state answers for any date.
  const limit = record.extrapolateMs > 0 ? record.extrapolateMs : EXTRAPOLATION_LIMIT_MS;
  const first = list[0];
  const last = list[list.length - 1];
  if (tMs < first.tMs) return first.tMs - tMs > limit ? null : twoBody(first, (tMs - first.tMs) / 1000, mu);
  if (tMs >= last.tMs) return tMs - last.tMs > limit ? null : twoBody(last, (tMs - last.tMs) / 1000, mu);
  const i = bracket(list, tMs);
  const a = list[i];
  const b = list[i + 1];
  const pa = twoBody(a, (tMs - a.tMs) / 1000, mu);
  const pb = twoBody(b, (tMs - b.tMs) / 1000, mu);
  if (!pa || !pb) return pa || pb;
  const s = (tMs - a.tMs) / (b.tMs - a.tMs);
  const w = s * s * (3 - 2 * s);
  return {
    x: pa.x + w * (pb.x - pa.x),
    y: pa.y + w * (pb.y - pa.y),
    z: pa.z + w * (pb.z - pa.z),
    vx: pa.vx + w * (pb.vx - pa.vx),
    vy: pa.vy + w * (pb.vy - pa.vy),
    vz: pa.vz + w * (pb.vz - pa.vz),
  };
}

/**
 * `n` times covering one lap from t0Ms, evenly spaced in ECCENTRIC anomaly rather than in time, or
 * null when the orbit at t0Ms is not bound. For scene/orbitline.js, which joins its samples with
 * straight lines.
 *
 * WHY. Evenly spaced in time, a lap of Juno's is 240 points 3.3 hours apart, and Juno goes from
 * 90 degrees before its closest point to 90 degrees after it in about two hours, so one chord of
 * the line cut across the planet. MEASURED over a month of laps (one started every 7 hours,
 * 2026-09-22..10-22, the stand-in and a harvested snapshot both): evenly spaced in time, the
 * line's lowest point was 67 591 km BELOW Jupiter's drawn surface; evenly spaced in eccentric
 * anomaly, which crowds the points in where the craft is fastest, 8 855 km above it. On a
 * near-circular orbit like MRO's the two spacings are the same thing (221 km up either way).
 */
export function lapTimes(record, t0Ms, n) {
  const mu = record && record.muKm3S2;
  const s = orbiterState(record, t0Ms);
  if (!s || !(mu > 0) || !(n > 1)) return null;
  const r = Math.hypot(s.x, s.y, s.z);
  const v2 = s.vx * s.vx + s.vy * s.vy + s.vz * s.vz;
  const alpha = 2 / r - v2 / mu;
  if (!(alpha > 0)) return null;
  const a = 1 / alpha;
  const meanMotion = Math.sqrt(mu * alpha * alpha * alpha); // rad/s
  const ecosE = 1 - r / a;
  const esinE = (s.x * s.vx + s.y * s.vy + s.z * s.vz) / Math.sqrt(mu * a);
  const e = Math.hypot(ecosE, esinE);
  const E0 = e > 1e-9 ? Math.atan2(esinE, ecosE) : 0;
  const M0 = E0 - esinE;
  const out = new Array(n);
  for (let k = 0; k < n; k++) {
    const E = E0 + (2 * Math.PI * k) / n;
    out[k] = t0Ms + ((E - e * Math.sin(E) - M0) / meanMotion) * 1000;
  }
  return out;
}

/** propagate signature: (record, tMs) -> {x, y, z, frame, cls} | null. */
export function orbiter(record, tMs) {
  let st;
  try {
    st = orbiterState(record, tMs);
  } catch (err) {
    return null;
  }
  if (!st) return null;
  return { x: st.x, y: st.y, z: st.z, frame: record.frame, cls: 'inferred' };
}

export default orbiter;

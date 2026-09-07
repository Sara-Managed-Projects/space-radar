// propagate/sampled.js -- cubic Hermite interpolation between state-vector samples.
//
// This is how a Horizons ephemeris is drawn: positions and velocities at a cadence, and the curve
// between them. Hermite (not Catmull-Rom, not linear) because the samples carry velocities, and a
// curve that matches both the endpoints and the tangents is the difference between an orbit and a
// polygon -- at a one-hour cadence in LEO, linear interpolation cuts the corner by tens of km.
//
// Samples: [{tMs, x, y, z, vx, vy, vz}] in the record's frame, km and km/s. Sorted or not.
// Outside the sample range the endpoint is returned, marked `inferred`: the app degrades to the
// last thing it knew rather than dropping the object off the screen.

/** Within this of a sample, the answer is the sample itself: `measured`. */
export const SAMPLE_EXACT_MS = 1000;

/** Beyond this past either end of the samples, stop drawing. */
export const EXTRAPOLATION_LIMIT_MS = 7 * 24 * 3600 * 1000;

const sortedCache = new WeakMap();
const normalisedCache = new WeakMap();

/**
 * Accept either sample shape and return the flat one.
 *
 *   {tMs, x, y, z, vx, vy, vz}                 -- the flat form this file works in
 *   {tMs, rKm: [x,y,z], vKmS: [vx,vy,vz]}      -- the form a Horizons VECTORS row lands in
 *
 * Both exist because they were written at the same time against a contract that named the field
 * and not its shape. Normalising HERE rather than at each producer is deliberate: a propagator
 * that is strict about its input breaks again the first time somebody adds a new sample source,
 * and the array form is what the real Horizons parser will produce.
 */
function normalise(samples) {
  if (!Array.isArray(samples) || samples.length === 0) return null;
  const cached = normalisedCache.get(samples);
  if (cached) return cached;
  const out = samples.map((s) => {
    if (Array.isArray(s.rKm)) {
      const v = Array.isArray(s.vKmS) ? s.vKmS : [0, 0, 0];
      return { tMs: s.tMs, x: s.rKm[0], y: s.rKm[1], z: s.rKm[2], vx: v[0], vy: v[1], vz: v[2] };
    }
    return s;
  });
  normalisedCache.set(samples, out);
  return out;
}

function orderedSamples(rawSamples) {
  const samples = normalise(rawSamples);
  if (!samples) return null;
  const cached = sortedCache.get(samples);
  if (cached) return cached;
  let monotonic = true;
  for (let i = 1; i < samples.length; i++) {
    if (!(samples[i].tMs > samples[i - 1].tMs)) {
      monotonic = false;
      break;
    }
  }
  const out = monotonic ? samples : samples.slice().sort((a, b) => a.tMs - b.tMs);
  sortedCache.set(samples, out);
  return out;
}

/** Index of the last sample at or before tMs; -1 if tMs precedes the first. */
function bracket(list, tMs) {
  let lo = 0;
  let hi = list.length - 1;
  if (tMs < list[0].tMs) return -1;
  if (tMs >= list[hi].tMs) return hi;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (list[mid].tMs <= tMs) lo = mid;
    else hi = mid;
  }
  return lo;
}

function endpoint(s, cls) {
  return { x: s.x, y: s.y, z: s.z, vx: s.vx || 0, vy: s.vy || 0, vz: s.vz || 0, cls };
}

/**
 * Interpolate the samples at tMs. Returns {x, y, z, vx, vy, vz, cls} or null if there are no
 * samples at all, or if tMs is further than EXTRAPOLATION_LIMIT_MS outside their range.
 */
export function hermite(samples, tMs) {
  const list = orderedSamples(samples);
  if (!list || !Number.isFinite(tMs)) return null;

  const first = list[0];
  const last = list[list.length - 1];
  if (tMs < first.tMs) {
    if (first.tMs - tMs > EXTRAPOLATION_LIMIT_MS) return null;
    return endpoint(first, first.tMs - tMs <= SAMPLE_EXACT_MS ? 'measured' : 'inferred');
  }
  if (tMs > last.tMs) {
    if (tMs - last.tMs > EXTRAPOLATION_LIMIT_MS) return null;
    return endpoint(last, tMs - last.tMs <= SAMPLE_EXACT_MS ? 'measured' : 'inferred');
  }

  const i = bracket(list, tMs);
  const a = list[i];
  if (i === list.length - 1) return endpoint(a, 'measured');
  const b = list[i + 1];

  const spanMs = b.tMs - a.tMs;
  if (!(spanMs > 0)) return endpoint(a, 'measured');
  if (tMs - a.tMs <= SAMPLE_EXACT_MS) return endpoint(a, 'measured');
  if (b.tMs - tMs <= SAMPLE_EXACT_MS) return endpoint(b, 'measured');

  const s = (tMs - a.tMs) / spanMs;
  const h = spanMs / 1000; // seconds, because velocities are km/s
  const s2 = s * s;
  const s3 = s2 * s;

  // Hermite basis.
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;
  // and its derivative, for the interpolated velocity.
  const d00 = 6 * s2 - 6 * s;
  const d10 = 3 * s2 - 4 * s + 1;
  const d01 = -6 * s2 + 6 * s;
  const d11 = 3 * s2 - 2 * s;

  const avx = a.vx || 0;
  const avy = a.vy || 0;
  const avz = a.vz || 0;
  const bvx = b.vx || 0;
  const bvy = b.vy || 0;
  const bvz = b.vz || 0;

  return {
    x: h00 * a.x + h10 * h * avx + h01 * b.x + h11 * h * bvx,
    y: h00 * a.y + h10 * h * avy + h01 * b.y + h11 * h * bvy,
    z: h00 * a.z + h10 * h * avz + h01 * b.z + h11 * h * bvz,
    vx: (d00 * a.x + d01 * b.x) / h + d10 * avx + d11 * bvx,
    vy: (d00 * a.y + d01 * b.y) / h + d10 * avy + d11 * bvy,
    vz: (d00 * a.z + d01 * b.z) / h + d10 * avz + d11 * bvz,
    cls: 'inferred',
  };
}

/** propagate signature: (record, tMs) -> {x, y, z, frame, cls} | null. */
export function sampled(record, tMs) {
  if (!record || !Number.isFinite(tMs)) return null;
  let st;
  try {
    st = hermite(record.samples, tMs);
  } catch (err) {
    return null;
  }
  if (!st) return null;
  return {
    x: st.x,
    y: st.y,
    z: st.z,
    frame: record.frame || 'sun-inertial',
    cls: st.cls,
  };
}

export default sampled;

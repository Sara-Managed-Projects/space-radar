// propagate/kepler.js -- two-body motion from six elements.
//
// Used for asteroids, comets and anything else the app knows only as an element set. The answer is
// always `inferred`: nobody measured the object at this instant, a two-body model was asked where
// it would be. For a main-belt asteroid over a few months that is worth kilometres of error out of
// hundreds of millions; for a comet on a close solar pass it is worth more, which is what the
// seventh propagator in spec 0002 would be for.
//
// Elements are heliocentric ecliptic J2000 unless the record's frame says otherwise:
//   asteroid form  {a_au, e, i_deg, om_deg, w_deg, ma_deg, epoch_jd}
//   comet form     {q_au, e, i_deg, om_deg, w_deg, tp_jd}
// om is the longitude of the ascending node, w the argument of perihelion, ma the mean anomaly at
// epoch, tp the time of perihelion passage. a_km / q_km are accepted for geocentric element sets.

/** GM, km^3/s^2. */
export const GM_SUN = 1.32712440018e11;
export const GM_EARTH = 398600.4418;

const KM_PER_AU = 149597870.7;
const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;

const NEWTON_MAX = 60;
const NEWTON_TOL = 1e-12;
/** |e - 1| below this is treated as a parabola; Newton on either branch is ill-conditioned there. */
const PARABOLIC_BAND = 1e-6;

function jdToMs(jd) {
  return (jd - 2440587.5) * 86400000;
}

const normalisedCache = new WeakMap();

/**
 * Accept the second element shape as well as the contract's.
 *
 *   {a_au|q_au|a_km|q_km, e, i_deg, om_deg, w_deg, ma_deg|tp_jd|tp_ms, epoch_jd|epoch_ms, mu}
 *   {aKm|qKm, e, iRad, omRad, wRad, tpMs|maRad, epochMs, muKm3S2}
 *
 * The second is what data/parsers.js (comets) and data/sample.js (asteroids, deep space) actually
 * emit, and it is the one that obeys hard rule 6 -- kilometres and radians, no degrees below the
 * UI. Normalising HERE, the way sampled.js normalises its two sample shapes, is the difference
 * between 957 comets drawing and 957 comets returning null with no error anywhere.
 *
 * `aKm` is null for a parabola and negative for a hyperbola; both are handled, because q is what
 * anomalyAt() actually wants and q = a(1 - e) is positive on either branch.
 */
function normaliseElements(el) {
  if (!el || typeof el !== 'object') return el;
  if (el.q_au !== undefined || el.a_au !== undefined || el.q_km !== undefined ||
      el.a_km !== undefined || el.i_deg !== undefined) {
    return el; // already the contract's shape
  }
  const cached = normalisedCache.get(el);
  if (cached) return cached;
  const out = {
    e: el.e,
    q_km: Number.isFinite(el.qKm) ? el.qKm : undefined,
    a_km: Number.isFinite(el.aKm) ? el.aKm : undefined,
    i_deg: Number.isFinite(el.iRad) ? el.iRad / DEG : 0,
    om_deg: Number.isFinite(el.omRad) ? el.omRad / DEG : 0,
    w_deg: Number.isFinite(el.wRad) ? el.wRad / DEG : 0,
    tp_ms: Number.isFinite(el.tpMs) ? el.tpMs : undefined,
    ma_deg: Number.isFinite(el.maRad) ? el.maRad / DEG : undefined,
    epoch_ms: Number.isFinite(el.epochMs) ? el.epochMs : undefined,
    mu: Number.isFinite(el.muKm3S2) ? el.muKm3S2 : el.mu,
  };
  normalisedCache.set(el, out);
  return out;
}

function wrap2pi(a) {
  const r = a % TWO_PI;
  return r < 0 ? r + TWO_PI : r;
}

/**
 * Solve M = E - e sin(E) for the eccentric anomaly, radians. Newton with a start point that
 * survives e -> 1: the usual E0 = M + e sin M diverges for high eccentricity, pi does not.
 */
export function solveKeplerElliptic(M, e) {
  const m = wrap2pi(M);
  let E = e < 0.8 ? m + e * Math.sin(m) : Math.PI;
  for (let i = 0; i < NEWTON_MAX; i++) {
    const f = E - e * Math.sin(E) - m;
    const fp = 1 - e * Math.cos(E);
    const d = f / (Math.abs(fp) < 1e-12 ? 1e-12 : fp);
    E -= d;
    if (Math.abs(d) < NEWTON_TOL) break;
  }
  return E;
}

/**
 * Solve M = e sinh(H) - H for the hyperbolic anomaly.
 *
 * f(H) = e sinh H - H - M is strictly increasing (f' = e cosh H - 1 > 0 for e > 1) and odd in
 * (H, M), so the root is bracketed and Newton can be safeguarded by bisection. That safeguard is
 * not academic: the previous start point M/(e-1) is 165 for a near-parabolic sungrazer, and plain
 * Newton then walks down by one per step -- it needs 168 iterations against a limit of 60 and
 * returns H = 105 with a residual of 3e45. C/2020 P4-C (SOHO), e = 1.01317, is exactly that case
 * and is in the live MPC file today; it was the one comet of 957 that would not draw.
 *
 * Measured over 1494 (e, M) pairs spanning e = 1+1e-12 .. 1000 and |M| = 1e-10 .. 1e10: zero
 * failures, worst relative residual 9.7e-12, and agreement with the old solver to 1e-12 on every
 * case where the old one converged.
 */
export function solveKeplerHyperbolic(M, e) {
  if (!Number.isFinite(M) || !(e > 1)) return NaN;
  if (M === 0) return 0;
  const sign = M < 0 ? -1 : 1;
  const m = Math.abs(M);

  // Bracket [lo, hi] around the positive root, then grow hi until f(hi) >= 0. sinh grows
  // exponentially, so this ends within a few dozen doublings for any representable M.
  let lo = 0;
  let hi = Math.max(Math.asinh(m / e), 1e-8);
  for (let k = 0; k < 100 && e * Math.sinh(hi) - hi - m < 0; k++) hi *= 2;

  let H = Math.min(Math.max(Math.asinh(m / e), lo), hi);
  for (let i = 0; i < NEWTON_MAX; i++) {
    const f = e * Math.sinh(H) - H - m;
    if (f > 0) hi = H;
    else lo = H;
    const fp = e * Math.cosh(H) - 1;
    let d = fp > 1e-300 ? f / fp : 0;
    let next = H - d;
    // A Newton step that leaves the bracket is replaced by a bisection step, which is what makes
    // this converge in the near-parabolic band instead of diverging into sinh's overflow.
    if (!(next > lo && next < hi)) {
      next = 0.5 * (lo + hi);
      d = H - next;
    }
    H = next;
    if (Math.abs(d) < NEWTON_TOL || hi - lo < NEWTON_TOL) break;
  }
  return sign * H;
}

/** Barker's equation, solved in closed form: D = tan(nu/2) for a parabola with M = D + D^3/3. */
export function solveBarker(M) {
  const r = Math.sqrt(9 * M * M + 4);
  const cbrt = (v) => Math.cbrt(v);
  return cbrt((3 * M + r) / 2) + cbrt((3 * M - r) / 2);
}

/**
 * True anomaly from the element set at time tMs. Returns {nu, e, p_km, mu} or null.
 * All three conic branches end in the same perifocal formulae, which is why nu is the pivot.
 */
function anomalyAt(el, tMs, mu) {
  const e = Number(el.e);
  if (!Number.isFinite(e) || e < 0) return null;

  // Perihelion distance -- the one length every branch shares.
  let q;
  if (Number.isFinite(el.q_km)) q = el.q_km;
  else if (Number.isFinite(el.q_au)) q = el.q_au * KM_PER_AU;
  else {
    const a = Number.isFinite(el.a_km) ? el.a_km : Number(el.a_au) * KM_PER_AU;
    if (!Number.isFinite(a)) return null;
    q = a * (1 - e);
  }
  if (!Number.isFinite(q) || q <= 0) return null;

  const p = q * (1 + e); // semi-latus rectum; equals a(1-e^2) for an ellipse, 2q for a parabola

  // Time since perihelion, seconds.
  let dtSec;
  if (Number.isFinite(el.tp_jd)) {
    dtSec = (tMs - jdToMs(el.tp_jd)) / 1000;
  } else if (Number.isFinite(el.tp_ms)) {
    dtSec = (tMs - el.tp_ms) / 1000;
  } else {
    // Mean anomaly at epoch instead: convert to a time since perihelion via the mean motion.
    const epochMs = Number.isFinite(el.epoch_jd)
      ? jdToMs(el.epoch_jd)
      : Number.isFinite(el.epoch_ms)
        ? el.epoch_ms
        : NaN;
    const ma = Number(el.ma_deg);
    if (!Number.isFinite(epochMs) || !Number.isFinite(ma)) return null;
    if (Math.abs(e - 1) < PARABOLIC_BAND) return null; // a parabola has no mean anomaly
    const a = q / (1 - e);
    const n = Math.sqrt(mu / Math.abs(a * a * a)); // rad/s
    dtSec = ma * DEG / n + (tMs - epochMs) / 1000;
  }
  if (!Number.isFinite(dtSec)) return null;

  let nu;
  if (Math.abs(e - 1) < PARABOLIC_BAND) {
    const n = Math.sqrt(mu / (2 * q * q * q));
    nu = 2 * Math.atan(solveBarker(n * dtSec));
  } else if (e < 1) {
    const a = q / (1 - e);
    const n = Math.sqrt(mu / (a * a * a));
    const E = solveKeplerElliptic(n * dtSec, e);
    nu =
      2 *
      Math.atan2(
        Math.sqrt(1 + e) * Math.sin(E / 2),
        Math.sqrt(1 - e) * Math.cos(E / 2),
      );
  } else {
    const a = q / (e - 1); // positive
    const n = Math.sqrt(mu / (a * a * a));
    const H = solveKeplerHyperbolic(n * dtSec, e);
    nu =
      2 *
      Math.atan2(
        Math.sqrt(e + 1) * Math.tanh(H / 2),
        Math.sqrt(e - 1),
      );
  }
  if (!Number.isFinite(nu)) return null;
  return { nu, e, p, mu };
}

/**
 * Full state from elements: position km and velocity km/s in the element set's own reference
 * plane (ecliptic J2000 for heliocentric elements, equatorial for geocentric ones).
 */
export function elementsToState(elIn, tMs, muIn) {
  if (!elIn || !Number.isFinite(tMs)) return null;
  const el = normaliseElements(elIn);
  const mu = Number.isFinite(muIn) ? muIn : Number.isFinite(el.mu) ? el.mu : GM_SUN;
  const an = anomalyAt(el, tMs, mu);
  if (!an) return null;

  const { nu, e, p } = an;
  const denom = 1 + e * Math.cos(nu);
  if (!(Math.abs(denom) > 1e-12)) return null; // asymptote of a hyperbola
  const r = p / denom;
  if (!Number.isFinite(r) || r <= 0) return null;

  const h = Math.sqrt(mu * p);
  // Perifocal frame: +x toward perihelion, +y 90 deg ahead in the direction of motion.
  const xp = r * Math.cos(nu);
  const yp = r * Math.sin(nu);
  const vxp = (-mu / h) * Math.sin(nu);
  const vyp = (mu / h) * (e + Math.cos(nu));

  const i = Number(el.i_deg || 0) * DEG;
  const om = Number(el.om_deg || 0) * DEG;
  const w = Number(el.w_deg || 0) * DEG;

  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const ci = Math.cos(i);
  const si = Math.sin(i);
  const co = Math.cos(om);
  const so = Math.sin(om);

  // Standard 3-1-3 (om, i, w) rotation, perifocal -> reference plane.
  const r11 = cw * co - sw * so * ci;
  const r12 = -sw * co - cw * so * ci;
  const r21 = cw * so + sw * co * ci;
  const r22 = -sw * so + cw * co * ci;
  const r31 = sw * si;
  const r32 = cw * si;

  return {
    x: r11 * xp + r12 * yp,
    y: r21 * xp + r22 * yp,
    z: r31 * xp + r32 * yp,
    vx: r11 * vxp + r12 * vyp,
    vy: r21 * vxp + r22 * vyp,
    vz: r31 * vxp + r32 * vyp,
    r,
    nu,
  };
}

/** propagate signature: (record, tMs) -> {x, y, z, frame, cls} | null. */
export function kepler(record, tMs) {
  if (!record || !record.elements || !Number.isFinite(tMs)) return null;
  const frame = record.frame || 'sun-inertial';
  const mu = frame.startsWith('earth') ? GM_EARTH : GM_SUN;
  let st;
  try {
    st = elementsToState(record.elements, tMs, mu);
  } catch (err) {
    return null;
  }
  if (!st) return null;
  return { x: st.x, y: st.y, z: st.z, frame, cls: 'inferred' };
}

export default kepler;

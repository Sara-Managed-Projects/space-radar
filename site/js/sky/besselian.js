// sky/besselian.js -- what a place on the Earth sees of a solar eclipse, from the eclipse's polynomial Besselian elements
// (research train "catalogues", forge #553: the 2 August 2027 "will I see it" checker). Pure: numbers in, numbers out; no DOM.
//
// Contract (tests/test_eclipse_2027.mjs):
//   ECLIPSE_2027_08_02                 the elements NASA publishes for the total solar eclipse of 2 August 2027
//   localCircumstances(el, latDeg, lonDeg, heightM = 0) -> {
//     kind: 'total' | 'annular' | 'partial' | 'none',  visible, magnitude, obscuration, ratio,
//     c1, c2, max, c3, c4 (ms since 1970, UT; c2/c3 null outside the central path), durationS (central phase, or 0),
//     sunAltDeg (at the maximum), sunAzDeg, sunAltAt: {c1, max, c4}
//   }
//   obscuration(magnitudeLike...) is internal; overlapFraction(r, s) is exported for the test
//
// THE ELEMENTS. NASA Goddard's "Besselian Elements for the Total Solar Eclipse of 2027 Aug 02" (eclipse predictions by Fred
// Espenak, NASA's GSFC; https://eclipse.gsfc.nasa.gov/SEbeselm/SEbeselm2001/SE2027Aug02Tbeselm.html, read 2026-11-24):
// polynomials in t = (TDT - 10:00) hours, valid 7:00 to 13:00 TDT, ephemerides VSOP87/ELP2000-85, ΔT = 71.7 s, lunar
// radius constants k1 = 0.272488 (penumbra) and k2 = 0.272281 (umbra). Every number below is copied from that table.
//
// THE METHOD. The local circumstances of the Explanatory Supplement to the Astronomical Almanac (1961), chapter 9, as set out
// in Meeus, "Elements of Solar Eclipses 1951-2200" (1989): the observer's place on the ellipsoid (b/a = 0.99664719) as
// ξ, η, ζ in the fundamental plane; u, v the shadow axis from it; the maximum where d(u² + v²)/dt = 0, found by iteration;
// each contact where the distance equals the penumbra's (C1, C4) or the umbra's (C2, C3) radius at the observer's ζ. The
// magnitude is NASA's (the fraction of the Sun's DIAMETER covered, (L1' - m) / (L1' + L2')); the obscuration is the fraction
// of the Sun's AREA, from the two discs' radii and the distance between them. No refraction, no limb profile: the duration
// agrees with NASA's central-line table to about a second (the test holds it to two).

const DEG = Math.PI / 180;
const HOUR_MS = 3600e3;
const B_OVER_A = 0.99664719; // the Earth's polar to equatorial radius (the elements' own constant)
const EQ_RADIUS_M = 6378140;

/** The elements, as NASA's table prints them. `date` is the day the polynomials' t0 hour is on (TDT). */
export const ECLIPSE_2027_08_02 = Object.freeze({
  id: 'total-eclipse-2027',
  date: '2027-08-02',
  t0: 10.0,
  deltaT: 71.7,
  range: [7.0, 13.0],
  x: [-0.019645, 0.5447105, -0.0000444, -0.0000091],
  y: [0.160063, -0.2111569, -0.0001217, 0.0000037],
  d: [17.76247, -0.010181, -0.000004],
  l1: [0.530596, 0.0000138, -0.0000128],
  l2: [-0.015464, 0.0000137, -0.0000128],
  mu: [328.42249, 15.002093],
  tanF1: 0.0046064,
  tanF2: 0.0045834,
  source: {
    words: 'Besselian elements for the total solar eclipse of 2 August 2027, eclipse predictions by Fred Espenak, NASA\'s GSFC',
    url: 'https://eclipse.gsfc.nasa.gov/SEbeselm/SEbeselm2001/SE2027Aug02Tbeselm.html',
    read: '2026-11-24',
  },
});

const poly = (c, t) => c.reduce((s, k, i) => s + k * t ** i, 0);
const dpoly = (c, t) => c.reduce((s, k, i) => (i ? s + i * k * t ** (i - 1) : s), 0);

/** The observer's geocentric ρ sin φ' and ρ cos φ' on the elements' ellipsoid. */
function place(latDeg, heightM) {
  const phi = latDeg * DEG;
  const U = Math.atan(B_OVER_A * Math.tan(phi));
  const h = (heightM || 0) / EQ_RADIUS_M;
  return { rs: B_OVER_A * Math.sin(U) + h * Math.sin(phi), rc: Math.cos(U) + h * Math.cos(phi), phi };
}

/** Everything at t hours from t0 for one observer. */
function at(el, p, lonDeg, t) {
  const x = poly(el.x, t), y = poly(el.y, t);
  const dx = dpoly(el.x, t), dy = dpoly(el.y, t);
  const dDeg = poly(el.d, t), dd = dpoly(el.d, t) * DEG; // d' in radians an hour
  const muDeg = poly(el.mu, t), dmu = dpoly(el.mu, t) * DEG;
  const l1 = poly(el.l1, t), l2 = poly(el.l2, t);
  const H = (muDeg + lonDeg - 0.00417807 * el.deltaT) * DEG;
  const d = dDeg * DEG;
  const xi = p.rc * Math.sin(H);
  const eta = p.rs * Math.cos(d) - p.rc * Math.cos(H) * Math.sin(d);
  const zeta = p.rs * Math.sin(d) + p.rc * Math.cos(H) * Math.cos(d);
  const dxi = dmu * p.rc * Math.cos(H);
  const deta = dmu * xi * Math.sin(d) - zeta * dd;
  const u = x - xi, v = y - eta, a = dx - dxi, b = dy - deta;
  const L1 = l1 - zeta * el.tanF1, L2 = l2 - zeta * el.tanF2;
  return { u, v, a, b, n2: a * a + b * b, L1, L2, H, d };
}

function sunAltAz(p, s) {
  // The Sun's hour angle at the place is the shadow's H; its declination is the element d (to well under 0.1°).
  const sinAlt = Math.sin(s.d) * Math.sin(p.phi) + Math.cos(s.d) * Math.cos(s.H) * Math.cos(p.phi);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const az = Math.atan2(Math.sin(s.H), Math.cos(s.H) * Math.sin(p.phi) - Math.tan(s.d) * Math.cos(p.phi)) + Math.PI; // from north, eastwards
  return { altDeg: alt / DEG, azDeg: ((az / DEG) % 360 + 360) % 360 };
}

/**
 * The fraction of a unit disc (the Sun) covered by a disc of radius r (the Moon) whose centre is s away. Pure.
 */
export function overlapFraction(r, s) {
  if (!(r > 0) || !Number.isFinite(s)) return 0;
  if (s >= 1 + r) return 0;
  if (s <= Math.abs(r - 1)) return Math.min(1, r * r);
  const a1 = r * r * Math.acos(Math.max(-1, Math.min(1, (s * s + r * r - 1) / (2 * s * r))));
  const a2 = Math.acos(Math.max(-1, Math.min(1, (s * s + 1 - r * r) / (2 * s))));
  const k = 0.5 * Math.sqrt(Math.max(0, (-s + r + 1) * (s + r - 1) * (s - r + 1) * (s + r + 1)));
  return (a1 + a2 - k) / Math.PI;
}

/** t (hours from t0, TDT) as ms since 1970, UT. */
function toMs(el, t) {
  return Date.parse(`${el.date}T00:00:00Z`) + (el.t0 + t) * HOUR_MS - el.deltaT * 1000;
}

/** A contact: where the distance from the shadow's axis equals L (the penumbra's or the umbra's radius). sign -1 before, +1 after. */
function contact(el, p, lonDeg, t, which, sign) {
  for (let i = 0; i < 8; i += 1) {
    const s = at(el, p, lonDeg, t);
    const L = which === 1 ? s.L1 : Math.abs(s.L2);
    const n = Math.sqrt(s.n2);
    const S = (s.a * s.v - s.u * s.b) / (n * L);
    if (Math.abs(S) > 1) return null;
    const tau = -(s.u * s.a + s.v * s.b) / s.n2 + sign * (L / n) * Math.sqrt(1 - S * S);
    t += tau;
    if (Math.abs(tau) < 1e-7) break;
  }
  return t;
}

/** What a place sees. Longitudes east positive, latitudes north positive, degrees; height in metres above the ellipsoid. */
export function localCircumstances(el, latDeg, lonDeg, heightM = 0) {
  const p = place(latDeg, heightM);
  let t = 0;
  let s;
  for (let i = 0; i < 12; i += 1) {
    s = at(el, p, lonDeg, t);
    const tau = -(s.u * s.a + s.v * s.b) / s.n2;
    t += tau;
    if (Math.abs(tau) < 1e-7) break;
  }
  s = at(el, p, lonDeg, t);
  const m = Math.hypot(s.u, s.v);
  const sun = sunAltAz(p, s);
  const none = { kind: 'none', visible: false, magnitude: 0, obscuration: 0, ratio: null, c1: null, c2: null, max: toMs(el, t), c3: null, c4: null,
    durationS: 0, sunAltDeg: sun.altDeg, sunAzDeg: sun.azDeg, sunAltAt: { c1: null, max: sun.altDeg, c4: null } };
  if (m >= s.L1 || t < el.range[0] - el.t0 || t > el.range[1] - el.t0) return none;
  const magnitude = (s.L1 - m) / (s.L1 + s.L2);
  const ratio = (s.L1 - s.L2) / (s.L1 + s.L2); // the Moon's apparent diameter over the Sun's
  const rSun = (s.L1 + s.L2) / 2;
  const obsc = overlapFraction(ratio, m / rSun);
  const t1 = contact(el, p, lonDeg, t, 1, -1);
  const t4 = contact(el, p, lonDeg, t, 1, 1);
  let kind = 'partial';
  let t2 = null, t3 = null;
  if (m < Math.abs(s.L2)) {
    kind = s.L2 < 0 ? 'total' : 'annular';
    t2 = contact(el, p, lonDeg, t, 2, -1);
    t3 = contact(el, p, lonDeg, t, 2, 1);
  }
  const altAt = (tt) => (tt === null ? null : sunAltAz(p, at(el, p, lonDeg, tt)).altDeg);
  const sunAltAt = { c1: altAt(t1), max: sun.altDeg, c4: altAt(t4) };
  // Seen at all: the Sun is up for some part of it (it may rise or set eclipsed).
  const visible = sun.altDeg > 0 || (sunAltAt.c1 !== null && sunAltAt.c1 > 0) || (sunAltAt.c4 !== null && sunAltAt.c4 > 0);
  return {
    kind: visible ? kind : 'none',
    visible,
    magnitude,
    obscuration: kind === 'total' ? 1 : obsc,
    ratio,
    c1: t1 === null ? null : toMs(el, t1),
    c2: t2 === null ? null : toMs(el, t2),
    max: toMs(el, t),
    c3: t3 === null ? null : toMs(el, t3),
    c4: t4 === null ? null : toMs(el, t4),
    durationS: t2 !== null && t3 !== null ? (t3 - t2) * 3600 : 0,
    sunAltDeg: sun.altDeg,
    sunAzDeg: sun.azDeg,
    sunAltAt,
  };
}

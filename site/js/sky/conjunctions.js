// sky/conjunctions.js -- two bright things close together in YOUR sky, in the next weeks (internal
// #359; SkySafari's event finder is the model). Pure: a place and a start in, rows out.
//
// Contract: findConjunctions({ fromMs, days, observer: {latDeg, lonDeg, altKm}, maxSepDeg, stepMin })
//           -> [{ kind: 'conjunction', tMs, a, b, sepDeg, altDeg, azDeg, sunAltDeg, moonLit }]
//           findSep(a, b, tMs, observer) -> degrees between two bodies as seen from the place
//           BODIES -- the five naked-eye planets and the Moon
//
// WHAT IS COUNTED. The Moon and Mercury, Venus, Mars, Jupiter and Saturn, in pairs, as seen from the
// place (the Moon's parallax is up to a degree, so the topocentric place is used). A pair is a row
// when, at its closest in the window, it is within `maxSepDeg` (2 degrees, the issue's), both are
// above the horizon and the Sun is below -3 degrees: close in the day sky, or under the ground, is
// not something to go out and see. Stars are not paired (their places are the catalogue's, not
// this module's) and neither are the outer planets (too faint).
//
// COST. 30-minute steps over 30 days is 1 440 steps of six bodies; the minimum is then found again
// to the second between the two steps around it. It runs in a worker (sky/findworker.js) and
// fetches nothing: the only input is the vendored Astronomy Engine.

import * as Astronomy from '../../vendor/astronomy.js';

export const BODIES = ['Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
export const MAX_SEP_DEG = 2;
export const SUN_LIMIT_DEG = -3;
const DEG = 180 / Math.PI;

function unit(ra, dec) {
  const a = ra * 15 / DEG;
  const d = dec / DEG;
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
}

function placeOf(name, date, obs) {
  // Topocentric, of date: the same frame Horizon() wants.
  const eq = Astronomy.Equator(name, date, obs, true, true);
  const hor = Astronomy.Horizon(date, obs, eq.ra, eq.dec, 'normal');
  return { v: unit(eq.ra, eq.dec), alt: hor.altitude, az: hor.azimuth };
}

const sepOf = (p, q) => {
  const c = Math.min(1, Math.max(-1, p.v[0] * q.v[0] + p.v[1] * q.v[1] + p.v[2] * q.v[2]));
  return Math.acos(c) * DEG;
};

/** Degrees between two of BODIES at one instant, as seen from the place. */
export function findSep(a, b, tMs, observer) {
  const obs = new Astronomy.Observer(observer.latDeg, observer.lonDeg, (Number(observer.altKm) || 0) * 1000);
  const date = new Date(tMs);
  return sepOf(placeOf(a, date, obs), placeOf(b, date, obs));
}

export function findConjunctions({ fromMs, days = 30, observer, maxSepDeg = MAX_SEP_DEG, stepMin = 30 } = {}) {
  if (!observer || !Number.isFinite(observer.latDeg) || !Number.isFinite(observer.lonDeg) || !Number.isFinite(fromMs)) return [];
  const obs = new Astronomy.Observer(observer.latDeg, observer.lonDeg, (Number(observer.altKm) || 0) * 1000);
  const step = stepMin * 60e3;
  const n = Math.ceil((days * 864e5) / step);
  const pairs = [];
  for (let i = 0; i < BODIES.length; i += 1) for (let j = i + 1; j < BODIES.length; j += 1) pairs.push([BODIES[i], BODIES[j]]);
  // Separations of every pair at every step.
  const seps = pairs.map(() => new Float64Array(n + 1));
  for (let k = 0; k <= n; k += 1) {
    const date = new Date(fromMs + k * step);
    const at = {};
    for (const b of BODIES) at[b] = placeOf(b, date, obs);
    pairs.forEach(([a, b], p) => { seps[p][k] = sepOf(at[a], at[b]); });
  }
  const out = [];
  pairs.forEach(([a, b], p) => {
    const s = seps[p];
    for (let k = 1; k < n; k += 1) {
      if (!(s[k] <= s[k - 1] && s[k] < s[k + 1]) || s[k] > maxSepDeg + 1) continue;
      // Refine inside [k-1, k+1] by ternary search on the exact separation.
      let lo = fromMs + (k - 1) * step;
      let hi = fromMs + (k + 1) * step;
      for (let it = 0; it < 24; it += 1) {
        const m1 = lo + (hi - lo) / 3;
        const m2 = hi - (hi - lo) / 3;
        if (findSep(a, b, m1, observer) < findSep(a, b, m2, observer)) hi = m2; else lo = m1;
      }
      const tMs = Math.round((lo + hi) / 2);
      const date = new Date(tMs);
      const pa = placeOf(a, date, obs);
      const pb = placeOf(b, date, obs);
      const sepDeg = sepOf(pa, pb);
      if (sepDeg > maxSepDeg) continue;
      const sun = Astronomy.Equator('Sun', date, obs, true, true);
      const sunAltDeg = Astronomy.Horizon(date, obs, sun.ra, sun.dec, 'normal').altitude;
      if (!(pa.alt > 0 && pb.alt > 0 && sunAltDeg < SUN_LIMIT_DEG)) continue;
      const lower = pa.alt <= pb.alt ? pa : pb;
      const row = { kind: 'conjunction', record: null, tMs, a, b, sepDeg, altDeg: lower.alt, azDeg: lower.az, sunAltDeg };
      if (a === 'Moon') row.moonLit = Astronomy.Illumination('Moon', date).phase_fraction;
      out.push(row);
    }
  });
  return out.sort((x, y) => x.tMs - y.tMs);
}

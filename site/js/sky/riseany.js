// sky/riseany.js -- rises, highest and sets from a place for ANYTHING with a direction from the
// Earth: a comet or an asteroid on its own orbit (internal #299's remainder). sky/riseset.js does
// the Sun, the Moon and the planets by name through the astronomy library's own search; a small
// body has no name there, so this scans its altitude instead.
//
// Contract: riseHighestSetOf(eqjAt, observer, nowMs) -> null (no place, or no direction) or the
//   same shape sky/riseset.js gives:
//   { upNow, altDeg, azDeg, riseMs, riseAzDeg, highMs, highAltDeg, setMs, setAzDeg, never, always }
// `eqjAt(ms)` is the vector from the Earth's centre to the thing in equatorial J2000 axes (any
// unit; null when there is none); `observer` is { latDeg, lonDeg, altKm? }. Times are the NEXT
// ones, as in riseset.js: for something up now, when it is next highest (null when that is past,
// this time up) and when it sets; for something down, when it rises, how high it then gets, and
// when it sets.
//
// Computed, not measured: the direction is geocentric (a body nearer than the Moon would need the
// observer's own offset, and the card already says such a body's place is approximate), the
// horizon is sea level, and the standard refraction is on it. A five-minute scan over a day and a
// half, each crossing then found to half a minute. It arrives with the card; nothing here runs on
// a first visit.

import * as Astronomy from '../../vendor/astronomy.js';

const STEP_MS = 5 * 60e3;
const SPAN_MS = 36 * 3600e3;
const FINE_MS = 30e3;

export function riseHighestSetOf(eqjAt, observer, nowMs) {
  if (typeof eqjAt !== 'function' || !observer || !Number.isFinite(observer.latDeg) || !Number.isFinite(observer.lonDeg) || !Number.isFinite(nowMs)) return null;
  try {
    const obs = new Astronomy.Observer(observer.latDeg, observer.lonDeg, (Number(observer.altKm) || 0) * 1000);
    const at = (ms) => {
      const v = eqjAt(ms);
      if (!v || !Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z)) return null;
      const time = Astronomy.MakeTime(new Date(ms));
      const hor = Astronomy.RotateVector(Astronomy.Rotation_EQJ_HOR(time, obs), new Astronomy.Vector(v.x, v.y, v.z, time));
      const s = Astronomy.HorizonFromVector(hor, 'normal');
      return { altDeg: s.lat, azDeg: s.lon };
    };
    const now = at(nowMs);
    if (!now) return null;
    const out = { upNow: now.altDeg > 0, altDeg: now.altDeg, azDeg: now.azDeg, riseMs: null, riseAzDeg: null, highMs: null, highAltDeg: null, setMs: null, setAzDeg: null, never: false, always: false };
    const alt = (ms) => { const p = at(ms); return p ? p.altDeg : NaN; };
    // The instant the altitude changes sign between a and b, to FINE_MS.
    const cross = (a, b) => {
      let lo = a;
      let hi = b;
      const upAtLo = alt(lo) > 0;
      while (hi - lo > FINE_MS) {
        const mid = (lo + hi) / 2;
        if ((alt(mid) > 0) === upAtLo) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    };
    // The next change of side after `from`, or null inside the span.
    const nextChange = (from, wasUp) => {
      for (let t = from; t < nowMs + SPAN_MS; t += STEP_MS) {
        const a = alt(t + STEP_MS);
        if (!Number.isFinite(a)) return null;
        if ((a > 0) !== wasUp) return cross(t, t + STEP_MS);
      }
      return null;
    };
    let from = nowMs;
    if (!out.upNow) {
      const rise = nextChange(nowMs, false);
      if (rise === null) { out.never = true; return out; }
      out.riseMs = rise;
      out.riseAzDeg = at(rise).azDeg;
      from = rise + FINE_MS;
    }
    const set = nextChange(from, true);
    if (set !== null) { out.setMs = set; out.setAzDeg = at(set).azDeg; } else out.always = true;
    // The top of this time up: the highest sample, then a three-point fit around it.
    const end = set !== null ? set : nowMs + SPAN_MS;
    let best = from;
    let bestAlt = alt(from);
    for (let t = from + STEP_MS; t < end; t += STEP_MS) { const a = alt(t); if (a > bestAlt) { bestAlt = a; best = t; } }
    if (best > from) {
      const a = alt(best - STEP_MS);
      const c = alt(best + STEP_MS);
      const denom = a - 2 * bestAlt + c;
      const shift = denom < 0 ? (0.5 * (a - c)) / denom : 0;
      const ms = best + Math.max(-1, Math.min(1, shift)) * STEP_MS;
      out.highMs = ms;
      out.highAltDeg = alt(ms);
    }
    // `best === from`: it only goes down from here, so its highest is past (riseset.js's null).
    return out;
  } catch {
    return null;
  }
}

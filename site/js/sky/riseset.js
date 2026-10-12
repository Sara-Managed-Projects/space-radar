// sky/riseset.js -- rises, highest and sets from a place, for the Sun, the Moon and the planets
// (internal #299, after TheSkyLive's object header).
//
// Contract: riseHighestSet(bodyId, observer, nowMs) -> null (not one of the ten, or no place) or
//   { upNow, altDeg, azDeg, riseMs, riseAzDeg, highMs, highAltDeg, setMs, setAzDeg, never, always }
// `observer` is { latDeg, lonDeg, altKm? }. Times are the NEXT ones: for something up now, when it
// is next highest (null when it already was, this time up) and when it sets; for something down,
// when it rises, how high it gets after that, and when it then sets.
//
// Computed, not measured: Astronomy Engine's positions (good to an arcminute), a sea-level horizon
// and the standard 34 arcminutes of refraction on it. Hills and houses are not in it.
// It arrives with the card (ui/cards.js); nothing here runs on the first visit.

import * as Astronomy from '../../vendor/astronomy.js';

const NAMES = { sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto' };

export const RISE_SET_BODIES = Object.keys(NAMES);

export function riseHighestSet(bodyId, observer, nowMs) {
  const name = NAMES[String(bodyId || '').toLowerCase()];
  if (!name || !observer || !Number.isFinite(observer.latDeg) || !Number.isFinite(observer.lonDeg) || !Number.isFinite(nowMs)) return null;
  try {
    const obs = new Astronomy.Observer(observer.latDeg, observer.lonDeg, (Number(observer.altKm) || 0) * 1000);
    const at = (ms) => {
      const d = new Date(ms);
      const eq = Astronomy.Equator(name, d, obs, true, true);
      const h = Astronomy.Horizon(d, obs, eq.ra, eq.dec, 'normal');
      return { altDeg: h.altitude, azDeg: h.azimuth };
    };
    const now = at(nowMs);
    const out = { upNow: now.altDeg > 0, altDeg: now.altDeg, azDeg: now.azDeg, riseMs: null, riseAzDeg: null, highMs: null, highAltDeg: null, setMs: null, setAzDeg: null, never: false, always: false };
    const start = new Date(nowMs);
    let from = start;
    if (!out.upNow) {
      const rise = Astronomy.SearchRiseSet(name, obs, +1, start, 1.5);
      if (!rise) { out.never = true; return out; }
      out.riseMs = rise.date.getTime();
      out.riseAzDeg = at(out.riseMs).azDeg;
      from = rise.date;
    }
    const set = Astronomy.SearchRiseSet(name, obs, -1, from, 1.5);
    if (set) { out.setMs = set.date.getTime(); out.setAzDeg = at(out.setMs).azDeg; }
    else out.always = true;
    const high = Astronomy.SearchHourAngle(name, obs, 0, from);
    if (high && high.time) {
      const ms = high.time.date.getTime();
      // Only the top of THIS time up: after the set it belongs to the next one.
      if (out.setMs === null || ms < out.setMs) { out.highMs = ms; out.highAltDeg = high.hor.altitude; }
    }
    return out;
  } catch {
    return null;
  }
}

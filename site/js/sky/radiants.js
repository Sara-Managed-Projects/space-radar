// sky/radiants.js -- where a meteor shower's meteors come from, seen from where you stand.
//
// Pure, for sky/skyview.js and the test:
//   activeShowers(tMs, showers, days) -> the showers whose peak is within `days` of tMs's local date
//   radiantAltAz(shower, tMs, observer) -> { altDeg, azDeg } (azimuth from north, through east)
//   nextShower(tMs, showers) -> { shower, peakMs } the next peak, or the one whose night this is
//   peakInstant(shower, year) -> ms of the maximum that year, from the Sun's longitude (`sol`)
//
// "Coming up" names a shower's peak (ui/next.js); standing under the sky in the Now moment, the
// useful thing is WHERE to look. A shower's meteors appear to come from its radiant, so the sky
// view marks it for the nights around the peak, where it is, while it is above the horizon.

import * as Astronomy from '../../vendor/astronomy.js';

const DEG = Math.PI / 180;
const DAY = 86400000;

function localMidnight(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * The instant of a shower's maximum in the year its calendar date `peak` falls in `year`: when the
 * Sun's longitude (equinox 2000.0, as the IMO lists it) is the row's `sol`. Null for a row with no
 * `sol`. The same longitude comes about six hours later each year and jumps back after a leap day,
 * which is why the Orionids' maximum is 21 October in 2026 and 22 October in 2027.
 */
const _peaks = new Map();
export function peakInstant(sh, year) {
  const m = /^(\d{2})-(\d{2})$/.exec(String((sh && sh.peak) || ''));
  const sol = Number(sh && sh.sol);
  if (!m || !Number.isFinite(sol) || sh.sol === null || sh.sol === undefined) return null;
  const key = `${sh.id}:${year}:${sol}`;
  if (_peaks.has(key)) return _peaks.get(key);
  let ms = null;
  try {
    const near = Date.UTC(year, Number(m[1]) - 1, Number(m[2]), 12);
    // Astronomy Engine's longitude is of the date's own equinox: precession has moved that
    // 1.397 degrees a century from 2000.0's.
    const ofDate = sol + 1.396971 * ((near - Date.UTC(2000, 0, 1, 12)) / (36525 * DAY));
    const got = Astronomy.SearchSunLongitude(((ofDate % 360) + 360) % 360, new Date(near - 6 * DAY), 12);
    ms = got ? got.date.getTime() : null;
  } catch { ms = null; }
  _peaks.set(key, ms);
  return ms;
}

/**
 * Local midnight at the start of a shower's peak date in a year: the maximum's date in UT (the date
 * the IMO's calendar prints for that year), read as the visitor's own calendar date, as `peak`
 * always was; from `sol`, else `peak` itself.
 */
function peakDay(sh, year) {
  const at = peakInstant(sh, year);
  if (at !== null) { const d = new Date(at); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).getTime(); }
  const m = /^(\d{2})-(\d{2})$/.exec(String((sh && sh.peak) || ''));
  return m ? new Date(year, Number(m[1]) - 1, Number(m[2])).getTime() : null;
}

export function activeShowers(tMs, showers, days = 2) {
  const out = [];
  const today = localMidnight(tMs);
  const year = new Date(tMs).getFullYear();
  for (const sh of Array.isArray(showers) ? showers : []) {
    for (const y of [year - 1, year, year + 1]) {
      const peak = peakDay(sh, y);
      if (peak === null) break;
      if (Math.abs(Math.round((peak - today) / DAY)) <= days) { out.push(sh); break; }
    }
  }
  return out;
}

export function radiantAltAz(shower, tMs, observer) {
  if (!shower || !observer || !Number.isFinite(observer.latRad) || !Number.isFinite(observer.lonRad)) return null;
  const dec = Number(shower.dec) * DEG;
  const ra = Number(shower.ra_h) * 15 * DEG;
  if (!Number.isFinite(dec) || !Number.isFinite(ra)) return null;
  let gast;
  try { gast = Astronomy.SiderealTime(new Date(tMs)); } catch { return null; }
  const H = gast * 15 * DEG + observer.lonRad - ra;
  const lat = observer.latRad;
  const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const az = Math.atan2(-Math.cos(dec) * Math.sin(H), Math.cos(lat) * Math.sin(dec) - Math.sin(lat) * Math.cos(dec) * Math.cos(H));
  return { altDeg: alt / DEG, azDeg: ((az / DEG) % 360 + 360) % 360 };
}

/**
 * The shower a visitor should be told about at `tMs`: the one peaking tonight or last night if
 * there is one, else the next to come. `peakMs` is local midnight at the start of its peak date,
 * this year's or next. For a trip stop that says "the next shower" (ui/trip.js `look: {shower: next}`).
 */
export function nextShower(tMs, showers) {
  const today = localMidnight(tMs);
  const year = new Date(tMs).getFullYear();
  let best = null;
  for (const sh of Array.isArray(showers) ? showers : []) {
    for (const y of [year, year + 1]) {
      const peakMs = peakDay(sh, y);
      if (peakMs === null) break;
      if (peakMs < today - DAY) continue;
      if (!best || peakMs < best.peakMs) best = { shower: sh, peakMs };
      break;
    }
  }
  return best;
}

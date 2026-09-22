// sky/radiants.js -- where a meteor shower's meteors come from, seen from where you stand.
//
// Pure, for sky/skyview.js and the test:
//   activeShowers(tMs, showers, days) -> the showers whose peak is within `days` of tMs's local date
//   radiantAltAz(shower, tMs, observer) -> { altDeg, azDeg } (azimuth from north, through east)
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

export function activeShowers(tMs, showers, days = 2) {
  const out = [];
  const today = localMidnight(tMs);
  const year = new Date(tMs).getFullYear();
  for (const sh of Array.isArray(showers) ? showers : []) {
    const m = /^(\d{2})-(\d{2})$/.exec(String(sh && sh.peak || ''));
    if (!m) continue;
    for (const y of [year - 1, year, year + 1]) {
      const peak = new Date(y, Number(m[1]) - 1, Number(m[2])).getTime();
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

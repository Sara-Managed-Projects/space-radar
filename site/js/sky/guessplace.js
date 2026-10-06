// sky/guessplace.js -- a first place for the Now moment, guessed from the clock, and said so.
//
// MEASURED 2026-09-08 (review): with no location set, the Now door did nothing -- the dome needs
// an observer and there was none. A guess is better than nothing only if it SAYS it is a guess:
// the observer this returns carries `source: 'guess'` and the panel prints that in words. It is
// never stored; setting a real place replaces it.
//
// Three guesses, in order. The IANA time zone names a city ("Europe/Berlin", "America/New_York");
// when that city is in the bundled list, that is the guess. Otherwise a bundled city IN that zone.
// Otherwise the UTC offset: only cities whose own zone has that offset right now are candidates,
// the zone's region ("America", "Europe") breaks the tie, and the nearest to fifteen degrees of
// longitude per hour wins. Measured 2026-09-27 (#283): nearest-meridian alone sent UTC-4 to
// Buenos Aires, which is UTC-3 and the other hemisphere.

const DEG2RAD = Math.PI / 180;

function observerFrom(city, how) {
  return {
    name: city.name,
    country: city.country,
    latDeg: city.latDeg,
    lonDeg: city.lonDeg,
    altKm: 0,
    latRad: city.latDeg * DEG2RAD,
    lonRad: city.lonDeg * DEG2RAD,
    source: 'guess',
    how,
  };
}

// A formatter costs far more than a format; one per zone, kept.
const formatters = new Map();

/** Minutes east of UTC that `zone` keeps at `date`, or null when the engine cannot say. */
export function zoneOffsetMinutes(zone, date) {
  if (typeof zone !== 'string' || !zone) return null;
  try {
    let fmt = formatters.get(zone);
    if (!fmt) {
      fmt = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' });
      formatters.set(zone, fmt);
    }
    const parts = fmt.formatToParts(date);
    const name = (parts.find((p) => p.type === 'timeZoneName') || {}).value || '';
    if (name === 'GMT') return 0;
    const m = name.match(/^GMT([+-])(\d{1,2}):?(\d{2})?$/);
    if (!m) return null;
    return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0));
  } catch {
    return null;
  }
}

function nearestMeridian(cities, offset) {
  const meridian = (offset / 60) * 15;
  let best = null;
  let bestGap = Infinity;
  for (const c of cities) {
    const gap = Math.abs(((c.lonDeg - meridian + 540) % 360) - 180);
    if (gap < bestGap) {
      bestGap = gap;
      best = c;
    }
  }
  return best;
}

/**
 * @param {Array<{name:string,country:string,latDeg:number,lonDeg:number,zone?:string}>} cities
 * @param {{timeZone?:string|null, offsetMinutes?:number|null, now?:Date}} [hints]  for tests; defaults to the browser's
 * @returns {Object|null} an observer with source 'guess', or null when nothing can be guessed
 */
export function guessObserver(cities, hints = {}) {
  if (!Array.isArray(cities) || cities.length === 0) return null;
  const now = hints.now instanceof Date ? hints.now : new Date();
  let zone = hints.timeZone;
  if (zone === undefined) {
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch {
      zone = null;
    }
  }
  if (typeof zone === 'string' && zone.includes('/')) {
    const part = zone.split('/').pop().replace(/_/g, ' ').toLowerCase();
    // Two San Juans: a name only counts when that city keeps the zone's clock.
    const clock = zoneOffsetMinutes(zone, now);
    const hit = cities.find((c) => c.name.toLowerCase() === part && (!c.zone || c.zone === zone || zoneOffsetMinutes(c.zone, now) === clock))
      || cities.find((c) => c.zone === zone);
    if (hit) return observerFrom(hit, 'timezone');
  }
  let offset = hints.offsetMinutes;
  if (offset === undefined) {
    offset = zoneOffsetMinutes(zone, now);
    if (offset === null) {
      try {
        offset = -now.getTimezoneOffset(); // minutes EAST of UTC
      } catch {
        offset = null;
      }
    }
  }
  if (!Number.isFinite(offset)) return null;
  const same = cities.filter((c) => zoneOffsetMinutes(c.zone, now) === offset);
  const region = typeof zone === 'string' && zone.includes('/') ? zone.split('/')[0] : '';
  const local = region ? same.filter((c) => typeof c.zone === 'string' && c.zone.split('/')[0] === region) : [];
  const best = nearestMeridian(local.length ? local : same.length ? same : cities, offset);
  return best ? observerFrom(best, 'offset') : null;
}

/**
 * The browser's own answer, rounded to 0.1 degree (about 11 km) BEFORE anything keeps, shows or uses
 * it (spec 0051 req 3). Pure; returns a new observer with radians derived from the rounded degrees.
 */
export function roundPlace(o) {
  const r = (v) => Math.round(Number(v) * 10) / 10;
  const latDeg = r(o.latDeg);
  const lonDeg = r(o.lonDeg);
  return { ...o, latDeg, lonDeg, latRad: latDeg * Math.PI / 180, lonRad: lonDeg * Math.PI / 180 };
}

// sky/guessplace.js -- a first place for the Now moment, guessed from the clock, and said so.
//
// MEASURED 2026-09-08 (review): with no location set, the Now door did nothing -- the dome needs
// an observer and there was none. A guess is better than nothing only if it SAYS it is a guess:
// the observer this returns carries `source: 'guess'` and the panel prints that in words. It is
// never stored; setting a real place replaces it.
//
// Two guesses, in order. The IANA time zone names a city ("Europe/Berlin", "America/New_York");
// when that city is in the bundled list, that is the guess. Otherwise the UTC offset is fifteen
// degrees of longitude per hour, and the bundled city nearest that meridian is the guess -- a
// weaker one, which is why `how` says which was used.

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

/**
 * @param {Array<{name:string,country:string,latDeg:number,lonDeg:number}>} cities
 * @param {{timeZone?:string|null, offsetMinutes?:number|null}} [hints]  for tests; defaults to the browser's
 * @returns {Object|null} an observer with source 'guess', or null when nothing can be guessed
 */
export function guessObserver(cities, hints = {}) {
  if (!Array.isArray(cities) || cities.length === 0) return null;
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
    const hit = cities.find((c) => c.name.toLowerCase() === part);
    if (hit) return observerFrom(hit, 'timezone');
  }
  let offset = hints.offsetMinutes;
  if (offset === undefined) {
    try {
      offset = -new Date().getTimezoneOffset(); // minutes EAST of UTC
    } catch {
      offset = null;
    }
  }
  if (!Number.isFinite(offset)) return null;
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
  return best ? observerFrom(best, 'offset') : null;
}

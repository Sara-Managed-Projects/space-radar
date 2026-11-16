// sky/zoneplace.js -- where a time zone is, for the first guess of a place (review of 16 Nov 2026).
//
// Contract:
//   loadZones(doFetch?) -> Promise<doc | null>     site/data/zones.json, fetched once
//   zonePlace(doc, zone) -> { zone, name, latDeg, lonDeg, countryCode } | null     pure
//   refineGuess(hints?) -> Promise<observer | null>   the zone's own place as an observer marked `source: 'guess'`
//
// WHY. sky/guessplace.js guesses from the browser's time zone, and knew only the bundled cities: any other zone got the
// city with the same clock nearest the zone's meridian, whatever its latitude. Australia/Perth became Manila (5 205 km
// off, the other hemisphere), Europe/Athens and Europe/Bucharest became Helsinki, America/Winnipeg became Bogota. The
// time zone database says where every zone is (its zone.tab; scripts/gen_zone_places.py copies the coordinates into
// site/data/zones.json, with the older names a browser may still report), so "Australia/Perth" is Perth.
//
// NOT AT BOOT. A zone whose own city is one of the bundled cities is answered at once by guessplace.js and this file
// is never fetched. Otherwise the first, rougher guess stands for the moment it takes to fetch 20 kB, and the caller
// replaces it with this one, if the place is still a guess by then. The answer is never stored, and it is still
// called a guess: it is the zone's principal city, not the visitor's town.
import { observerFrom } from './guessplace.js';

let loading = null;

/** Fetch the table once. Never rejects: null when it did not arrive (the rougher guess stands). */
export function loadZones(doFetch = typeof fetch === 'function' ? fetch : null) {
  if (loading) return loading;
  if (!doFetch) return Promise.resolve(null);
  loading = doFetch(new URL('../../data/zones.json', import.meta.url))
    .then((r) => (r && r.ok ? r.json() : null))
    .then((doc) => (doc && doc.zones ? doc : null))
    .catch(() => null);
  return loading;
}

/** A zone's city as people write it: the last part of its name, "Buenos Aires" from America/Argentina/Buenos_Aires. */
export function zoneCity(zone) {
  return String(zone || '').split('/').pop().replace(/_/g, ' ');
}

/** The table's place for a zone (or for an older name of it), or null. Pure. */
export function zonePlace(doc, zone) {
  if (!doc || !doc.zones || typeof zone !== 'string' || !zone.includes('/') && !(doc.aliases && doc.aliases[zone])) return null;
  const own = Object.prototype.hasOwnProperty.call(doc.zones, zone) ? zone
    : doc.aliases && Object.prototype.hasOwnProperty.call(doc.aliases, zone) ? doc.aliases[zone] : null;
  const row = own ? doc.zones[own] : null;
  if (!Array.isArray(row) || !Number.isFinite(row[0]) || !Number.isFinite(row[1])) return null;
  return { zone: own, name: zoneCity(own), latDeg: row[0], lonDeg: row[1], countryCode: String(row[2] || '') };
}

/** The browser's zone, or null. */
export function browserZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { return null; }
}

/**
 * The zone's own place, as a guessed observer (`how: 'zone'`), or null when the table has no such zone or did not
 * arrive. `hints`: { timeZone, doFetch, doc } for tests.
 */
export async function refineGuess(hints = {}) {
  const zone = hints.timeZone !== undefined ? hints.timeZone : browserZone();
  if (!zone) return null;
  const doc = hints.doc || await loadZones(hints.doFetch);
  const place = zonePlace(doc, zone);
  return place ? observerFrom({ name: place.name, country: '', latDeg: place.latDeg, lonDeg: place.lonDeg }, 'zone') : null;
}

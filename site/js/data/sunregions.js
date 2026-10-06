// data/sunregions.js -- today's sunspot groups, from NOAA's Space Weather Prediction Center.
//
// Pure: a URL, a parser and the arithmetic that puts a group on the Sun's sphere. scene/sun.js draws
// them; main.js fetches the list ONCE, the first time the Sun is close enough to show a spot, and
// never on a connection that asked to save data. tests/test_sun.mjs holds every function here.
//
// THE FEED. services.swpc.noaa.gov/json/solar_regions.json is SWPC's Solar Region Summary as JSON:
// one row per numbered active region per day, about a month of days. MEASURED 2026-10-06 with
// `curl -s -D - -H "Origin: https://www.spaceradar.ai"`: `access-control-allow-origin: *`,
// `cache-control: max-age=60`, 126 108 bytes, 219 rows, 5 regions on the newest day. A row carries
//   observed_date  "2026-10-06"
//   region         4548, NOAA's number
//   latitude       -12, heliographic degrees, north positive
//   longitude      24, degrees from the Sun's central meridian AS SEEN FROM THE EARTH; its
//                  `location` is "S12E24", so POSITIVE IS EAST -- the side turning into view
//   area           50, millionths of the Sun's visible hemisphere; null for a region with no spots
//   number_spots   1
// NOAA's products are US Government work (CREDITS.md 4.4); the app already credits SWPC for the
// aurora and the Kp index.
//
// WHAT IS MODELLED. The list says where each group was at the start of its day. The Sun turns, as
// seen from the Earth, once in 27.2753 days at the latitudes sunspots live at (Carrington's synodic
// period), so a group is carried west by 13.2 degrees a day from where it was reported. Groups grow,
// fade and drift; none of that is drawn. More than MAX_AGE_DAYS from the list's day nothing is drawn
// at all: a list for today says nothing about the Sun of another month.

export const SUN_REGIONS_URL = 'https://services.swpc.noaa.gov/json/solar_regions.json';
/** Carrington's synodic rotation period, days: the Sun's turn as seen from the Earth. */
export const CARRINGTON_SYNODIC_DAYS = 27.2753;
/** Past this many days from the list's own day the groups are not drawn. */
export const MAX_AGE_DAYS = 7;
/** The most groups drawn: the shader's array. The biggest are kept. */
export const MAX_SPOTS = 12;
/** A group smaller than this is drawn at this size, millionths of a hemisphere, so it is a pixel or two. */
export const MIN_AREA_MSH = 10;

const RAD = Math.PI / 180;

/**
 * The newest day's groups that have spots: [{ region, latDeg, eastDeg, areaMsh, spots, observedMs }],
 * biggest first, MAX_SPOTS at most. Anything malformed is skipped; a feed that is not a list is [].
 */
export function parseSunRegions(json) {
  if (!Array.isArray(json)) return [];
  let newest = '';
  for (const r of json) {
    if (r && typeof r.observed_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.observed_date) && r.observed_date > newest) newest = r.observed_date;
  }
  if (!newest) return [];
  const observedMs = Date.parse(newest + 'T00:00:00Z');
  const out = [];
  for (const r of json) {
    if (!r || r.observed_date !== newest) continue;
    const lat = Number(r.latitude);
    const east = Number(r.longitude);
    const area = Number(r.area);
    // `Number(null)` is 0: a region with no area is a plage with no spots, and is not a spot.
    if (r.latitude === null || r.longitude === null || !Number.isFinite(lat) || !Number.isFinite(east) || !(area > 0)) continue;
    if (Math.abs(lat) > 90 || Math.abs(east) > 180) continue;
    out.push({ region: Number(r.region) || 0, latDeg: lat, eastDeg: east, areaMsh: area, spots: Number(r.number_spots) || 0, observedMs });
  }
  out.sort((a, b) => (b.areaMsh - a.areaMsh) || (a.region - b.region));
  return out.slice(0, MAX_SPOTS);
}

/**
 * A group's angular radius on the Sun's sphere, radians, from its area in millionths of a
 * hemisphere: a cap of area A x 1e-6 x 2 pi R^2 has pi r^2 = that, so r / R = sqrt(2 A x 1e-6).
 */
export function spotRadiusRad(areaMsh) {
  return Math.sqrt(2 * Math.max(areaMsh, MIN_AREA_MSH) * 1e-6);
}

/** How far west of where it was reported a group has been carried by `tMs`, degrees. */
export function carriedWestDeg(observedMs, tMs) {
  return ((tMs - observedMs) / 86400000) * (360 / CARRINGTON_SYNODIC_DAYS);
}

/**
 * Where a group is on the Sun's unit sphere at `tMs`, in axes where +Y is the Sun's north pole.
 * `earth` is the unit direction from the Sun's centre to the Earth in those same axes. West on the
 * disc is north x earth (the way the Sun turns), so a group at latitude b and `east` degrees east of
 * the central meridian is cos b (cos L c + sin L w) + sin b n, with L = -east plus what the turning
 * has carried it, and c the Earth's direction laid into the equator.
 * @returns {[number, number, number] | null} null when the Earth is over a pole of these axes.
 */
export function spotDirection(region, earth, tMs, out = [0, 0, 0]) {
  const ch = Math.hypot(earth[0], earth[2]);
  if (!(ch > 1e-6)) return null;
  const cx = earth[0] / ch;
  const cz = earth[2] / ch;
  // w = n x c with n = (0, 1, 0): (cz, 0, -cx).
  const wx = cz;
  const wz = -cx;
  const lon = (-region.eastDeg + carriedWestDeg(region.observedMs, tMs)) * RAD;
  const lat = region.latDeg * RAD;
  const cl = Math.cos(lat);
  out[0] = cl * (Math.cos(lon) * cx + Math.sin(lon) * wx);
  out[1] = Math.sin(lat);
  out[2] = cl * (Math.cos(lon) * cz + Math.sin(lon) * wz);
  return out;
}

/** True when a list for `observedMs` may be drawn at `tMs`. */
export function regionsFresh(observedMs, tMs) {
  return Number.isFinite(observedMs) && Math.abs(tMs - observedMs) <= MAX_AGE_DAYS * 86400000;
}

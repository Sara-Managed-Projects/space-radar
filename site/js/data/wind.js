// data/wind.js -- the wind ten metres above the ground, over the whole Earth (internal #362, #146).
//
// Contract: WIND, windUrl(nowMs), parseWind(json) -> grid | null, sampleWind(grid, latDeg, lonDeg)
//           -> {u, v, speed} in m/s, stepWind(grid, latDeg, lonDeg, seconds) -> {latDeg, lonDeg},
//           fetchWind({fetch, nowMs}) -> Promise<grid>
//   grid = { nLat, nLon, stepDeg, u: Float32Array, v: Float32Array, timeMs, maxSpeed, meanSpeed }
//
// NOTHING HERE IS IN THE FIRST VISIT: scene/wind.js imports it, and main.js imports that when
// "Wind" is chosen under Earth data.
//
// THE SOURCE, TESTED ON 2026-10-07. What was wanted: a free global wind field a page can read
// (CORS), with clear terms, small enough to fetch when asked.
//   * KEPT: NOAA's Global Forecast System, the field earth.nullschool draws, through the PacIOOS
//     ERDDAP server (University of Hawaii, a NOAA IOOS regional association), dataset
//     `ncep_global`: "8-day, 3-hourly forecast for the globe at approximately 50-km or 0.5-deg
//     resolution". One griddap request with a stride of ten (every 5 degrees, 37 x 72 points) for
//     the two components at the forecast hour nearest now answered `Access-Control-Allow-Origin:
//     *` to `Origin: https://www.spaceradar.ai`, gzip, 169 kB of JSON as text, in about 2 s. Its
//     licence attribute: "The data may be used and redistributed for free but is not intended for
//     legal use, since it may contain inaccuracies."
//   * NOT USED: NOAA NOMADS itself (GRIB2 files, which a browser cannot read without a decoder
//     of its own; its filter script did not answer at all that day); NOAA CoastWatch's ERDDAP
//     mirror of the same dataset
//     (answered the same data with NO Access-Control-Allow-Origin header that day); Open-Meteo
//     (CORS `*` and CC BY 4.0, but its terms, read that day, allow the free API "for
//     non-commercial purposes" only, and a grid would be thousands of points against its quota).
//
// WHAT IT IS. A weather MODEL's wind for one forecast hour, not a measurement: the legend's
// sentence says "modelled" and names the hour. Five degrees is about 550 km at the equator: the
// trade winds, the westerlies and a large storm's turning show; a sea breeze does not.

/** The dataset, the stride and the grid it gives. `SPEED_MAX` is the legend's top, not a clamp. */
export const WIND = {
  id: 'wind',
  host: 'https://pae-paha.pacioos.hawaii.edu/erddap/griddap/ncep_global.json',
  info: 'https://pae-paha.pacioos.hawaii.edu/erddap/griddap/ncep_global.html',
  stride: 10, // of 0.5 degree
  stepDeg: 5,
  nLat: 37,
  nLon: 72,
  cadenceMs: 3 * 3600e3,
  speedMax: 25,
  credit: 'NOAA/NCEP Global Forecast System, through PacIOOS ERDDAP (University of Hawaii)',
};

const R_EARTH_M = 6371008.8;
const DEG = Math.PI / 180;

/** The forecast hour at or just before `nowMs`, as ERDDAP writes it. The model steps by three hours. */
export function windHour(nowMs) {
  const t = Math.floor(nowMs / WIND.cadenceMs) * WIND.cadenceMs;
  return new Date(t).toISOString().replace(/\.\d+Z$/, 'Z');
}

/** One request: both components, the whole globe, every fifth degree, one forecast hour. */
export function windUrl(nowMs) {
  const at = `%5B(${windHour(nowMs)})%5D%5B(-90):${WIND.stride}:(90)%5D%5B(0):${WIND.stride}:(355)%5D`;
  return `${WIND.host}?ugrd10m${at},vgrd10m${at}`;
}

/**
 * ERDDAP's table ({table: {columnNames, rows: [[time, lat, lon, u, v], ...]}}) as two flat grids,
 * row 0 at 90 S, column 0 at longitude 0, eastward. Null when it is not the grid that was asked
 * for: a short answer is not drawn as if it were the world.
 */
export function parseWind(json) {
  let doc = json;
  if (typeof doc === 'string') { try { doc = JSON.parse(doc); } catch { return null; } }
  const table = doc && doc.table;
  const names = table && Array.isArray(table.columnNames) ? table.columnNames : [];
  const rows = table && Array.isArray(table.rows) ? table.rows : [];
  const col = (n) => names.indexOf(n);
  const [iT, iLat, iLon, iU, iV] = [col('time'), col('latitude'), col('longitude'), col('ugrd10m'), col('vgrd10m')];
  if ([iT, iLat, iLon, iU, iV].some((i) => i < 0)) return null;
  const { nLat, nLon, stepDeg } = WIND;
  if (rows.length !== nLat * nLon) return null;
  const u = new Float32Array(nLat * nLon).fill(NaN);
  const v = new Float32Array(nLat * nLon).fill(NaN);
  let timeMs = NaN;
  for (const r of rows) {
    const j = Math.round((Number(r[iLat]) + 90) / stepDeg);
    const i = Math.round((((Number(r[iLon]) % 360) + 360) % 360) / stepDeg);
    if (!(j >= 0 && j < nLat && i >= 0 && i < nLon)) return null;
    const uu = Number(r[iU]);
    const vv = Number(r[iV]);
    // The dataset's fill value is -9.99e8; a wind past 150 m/s is that, or a broken row.
    if (r[iU] === null || r[iV] === null || !(Math.abs(uu) < 150) || !(Math.abs(vv) < 150)) return null;
    u[j * nLon + i] = uu;
    v[j * nLon + i] = vv;
    if (!Number.isFinite(timeMs)) timeMs = Date.parse(r[iT]);
  }
  let max = 0;
  let sum = 0;
  let w = 0;
  for (let j = 0; j < nLat; j += 1) {
    const area = Math.cos((j * stepDeg - 90) * DEG);
    for (let i = 0; i < nLon; i += 1) {
      const k = j * nLon + i;
      if (Number.isNaN(u[k])) return null; // a hole in the grid
      const s = Math.hypot(u[k], v[k]);
      if (s > max) max = s;
      sum += s * area;
      w += area;
    }
  }
  if (!Number.isFinite(timeMs)) return null;
  return { nLat, nLon, stepDeg, u, v, timeMs, maxSpeed: max, meanSpeed: w > 0 ? sum / w : 0 };
}

/** The wind at a place, by bilinear interpolation; longitude wraps, latitude is held at the poles. */
export function sampleWind(grid, latDeg, lonDeg) {
  const { nLat, nLon, stepDeg, u, v } = grid;
  const y = Math.min(nLat - 1, Math.max(0, (latDeg + 90) / stepDeg));
  const x = ((((lonDeg % 360) + 360) % 360) / stepDeg);
  const j0 = Math.min(nLat - 2, Math.floor(y));
  const i0 = Math.floor(x) % nLon;
  const i1 = (i0 + 1) % nLon;
  const fy = y - j0;
  const fx = x - Math.floor(x);
  const at = (a, j, i) => a[j * nLon + i];
  const mix = (a) => (at(a, j0, i0) * (1 - fx) + at(a, j0, i1) * fx) * (1 - fy) + (at(a, j0 + 1, i0) * (1 - fx) + at(a, j0 + 1, i1) * fx) * fy;
  const uu = mix(u);
  const vv = mix(v);
  return { u: uu, v: vv, speed: Math.hypot(uu, vv) };
}

/**
 * Where the air at a place is after `seconds` of this wind, on a sphere: north by v, east by u
 * over the cosine of the latitude (held off the pole, where east has no meaning).
 */
export function stepWind(grid, latDeg, lonDeg, seconds) {
  const w = sampleWind(grid, latDeg, lonDeg);
  const cos = Math.max(0.05, Math.cos(latDeg * DEG));
  const lat = latDeg + ((w.v * seconds) / R_EARTH_M) / DEG;
  const lon = lonDeg + ((w.u * seconds) / (R_EARTH_M * cos)) / DEG;
  return { latDeg: Math.max(-89.5, Math.min(89.5, lat)), lonDeg: ((lon + 540) % 360) - 180, speed: w.speed };
}

// HOW DEPENDABLE IT IS, SEEN THE SAME DAY. At 11:25 and 12:04 UTC on 2026-10-07 the request
// answered in about 2 s. Between 12:12 and 12:20 UTC the same URL took 35 s, answered 404 twice
// and then did not answer in 60 s, while the server's `info` page kept answering. It is one
// university server. So: a long wait, one second try, and a plain sentence when it does not come
// (COPY.overlay.wind.failed). The dependable route is our own saved copy made by the harvester
// (/data/v1/, as every other source has). IT IS NOW (internal #552): registry/sources.yaml has the row
// `wind` (harvest/parsers/wind.py, three hours, `browser: false`), and fetchWind reads that saved copy
// and nothing else, so a visitor's browser never calls the university server. With no copy the panel
// offers no wind (ui/overlaypanel.js asks snapshotAvailable).
const FETCH_TIMEOUT_MS = 20000;
const RETRY_AFTER_MS = 3000;

/** Where the harvester puts the field (registry/sources.yaml `wind`): beside the page, relative to it. */
export const WIND_SNAPSHOT_URL = 'data/v1/wind.json';

/** The field the harvester saved. Rejects when there is no copy or it is not the grid that was asked for. */
export async function fetchWind(opts = {}) {
  try {
    return await fetchWindOnce(opts);
  } catch (first) {
    // Not for a grid that came and was wrong: asking again would bring the same grid.
    if (/not the grid/.test(String(first && first.message))) throw first;
    await new Promise((r) => setTimeout(r, Number.isFinite(opts.retryMs) ? opts.retryMs : RETRY_AFTER_MS));
    return fetchWindOnce(opts);
  }
}

async function fetchWindOnce(opts) {
  const fetchImpl = opts.fetch || globalThis.fetch;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS) : null;
  try {
    const r = await fetchImpl(WIND_SNAPSHOT_URL, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined });
    if (!r.ok) throw new Error(`the saved wind copy answered ${r.status}`);
    let doc = JSON.parse(await r.text());
    // The harvester wraps the upstream body: {schema, source, fetched_at, valid_until, ..., body}.
    if (doc && doc.body && doc.source === 'wind') doc = doc.body;
    const grid = parseWind(doc);
    if (!grid) throw new Error('the wind field was not the grid that was asked for');
    return grid;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

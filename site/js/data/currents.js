// data/currents.js -- the sea's surface currents and its temperature, over the whole Earth.
//
// Contract: CURRENTS, parseSeaGrid(json, names) -> grid | null,
//           sampleCurrent(grid, latDeg, lonDeg) -> {u, v, speed} in m/s | null (land, ice, no data),
//           stepCurrent(grid, latDeg, lonDeg, seconds, out?) -> {latDeg, lonDeg, speed} | null (it ran aground),
//           sampleTemp(grid, latDeg, lonDeg) -> degrees C | NaN, fetchCurrents({fetch}) -> Promise<{flow, temp}>
//   grid = { nLat, nLon, stepDeg, lat0, lon0, timeMs, cells, [name]: Float32Array (NaN where the
//            source had no value), and for a flow: meanSpeed }
//
// NOTHING HERE IS IN THE FIRST VISIT: scene/currents.js imports it, and main.js imports that when
// "Ocean currents" is chosen under Earth data.
//
// THE SOURCES, TESTED ON 2026-10-12. What was wanted: the surface current (two components) and the
// sea's temperature over the globe, free, with no login, and with terms that let us save and serve
// a copy made from them.
//   * KEPT, the currents: NOAA CoastWatch's ERDDAP, dataset `noaacwBLENDEDNRTcurrentsDaily`, "Sea
//     Surface Currents (Geostrophic), Altimetry (S-3A/B, CryoSat2, Jason-2/3, SARAL), Near Real-Time,
//     Global 0.25 deg, Daily". Radar altimeters measure the height of the sea; water runs along the
//     slopes of that height, turned by the Earth's rotation, and the current is worked out from the
//     slope. That is the GEOSTROPHIC current: the steady part. It has no tides and no drift pushed
//     by the wind, and the balance it rests on fails on the equator itself, where the product still
//     gives numbers (seen that day: 284 of 360 points on the row at 0.125 N) that are the least sure.
//     Its licence attribute: "Data courtesy of NOAA; Sentinel data courtesy of Copernicus Program;
//     Generated using AVISO+ products. The data may be used and redistributed for free but is not
//     intended for legal use, since it may contain inaccuracies."
//   * KEPT, the temperature: NOAA NCEI's Daily Optimum Interpolation Sea Surface Temperature (OISST)
//     v2.1, near-real-time, dataset `ncdcOisst21NrtAgg` on the CoastWatch West Coast ERDDAP: satellite
//     radiometers, ships, buoys and floats, the gaps filled by interpolation. The same licence
//     sentence; NCEI asks for a citation (CREDITS.md 4.22).
//   * Each answered one day at every fourth point (180 x 360) in 2 to 3 s, 4.4 MB and 3.8 MB of
//     JSON, with NO Access-Control-Allow-Origin header. So a page cannot ask them, and would not
//     want eight megabytes: the harvester asks (registry/sources.yaml `ocean-currents`,
//     `ocean-temperature`) and saves each PACKED (harvest/parsers/sea_grid.py): 262 kB and 184 kB as
//     sent, 72 kB and 37 kB gzipped. This file reads those two saved copies and nothing else.
//   * NOT USED: NASA OSCAR (it adds the wind-driven part, but PO.DAAC wants an Earthdata login);
//     Copernicus Marine (an account); NOAA's RTOFS model on NOMADS (GRIB2 and NetCDF files of
//     hundreds of megabytes, and a model where a measurement was to be had).
//
// WHAT IT IS, AND IS NOT. Every fourth point of a quarter-degree grid, not a mean of the sixteen:
// a degree is 111 km, the Gulf Stream is about that wide, so the great currents show as rivers one
// or two cells across and the eddies beside them as kinks. Nothing is smoothed or filled here. Where
// the source has no value (land, sea ice, some shallow seas) there is none, and scene/currents.js
// draws nothing there: that is the land mask, the data's own.

/** The two saved copies and the grid they must be. `tempMin`/`tempMax` are the legend's ends, not clamps on the data. */
export const CURRENTS = {
  id: 'currents',
  flowUrl: 'data/v1/ocean-currents.json',
  tempUrl: 'data/v1/ocean-temperature.json',
  flowSource: 'ocean-currents',
  tempSource: 'ocean-temperature',
  info: 'https://coastwatch.noaa.gov/erddap/griddap/noaacwBLENDEDNRTcurrentsDaily.html',
  tempInfo: 'https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21NrtAgg.html',
  stepDeg: 1,
  nLat: 180,
  nLon: 360,
  keepMs: 24 * 3600e3,
  tempMin: -2,
  tempMax: 30,
  credit: 'NOAA CoastWatch (Sentinel data courtesy of the Copernicus Programme; generated using AVISO+ products) and NOAA NCEI OISST v2.1',
};

const R_EARTH_M = 6371008.8;
const DEG = Math.PI / 180;
/** A step along a current is cut into pieces no longer than this, so it cannot jump a strip of land. */
const MAX_PIECE_DEG = 0.5;

/**
 * The harvester's packed grid ({grid: 'sea-grid/1', time, lat0, lon0, stepDeg, nLat, nLon, fields:
 * {name: {scale, rows: ['12,,-3', ...]}}}) as flat arrays, row 0 the southernmost, column 0 at
 * `lon0`, eastward, NaN where the source had nothing. Null unless it is the whole globe at one
 * degree with every field asked for: a piece of the sea is not drawn as if it were all of it.
 */
export function parseSeaGrid(json, names) {
  let doc = json;
  if (typeof doc === 'string') { try { doc = JSON.parse(doc); } catch { return null; } }
  if (!doc || doc.grid !== 'sea-grid/1' || !doc.fields || !Array.isArray(names) || !names.length) return null;
  const { nLat, nLon, stepDeg } = CURRENTS;
  if (doc.nLat !== nLat || doc.nLon !== nLon || doc.stepDeg !== stepDeg) return null;
  const lat0 = Number(doc.lat0);
  const lon0 = Number(doc.lon0);
  // The first cell's centre is within a cell of the south pole, and somewhere on the circle.
  if (!(lat0 >= -90 && lat0 < -90 + stepDeg) || !(lon0 >= -180 && lon0 < 360)) return null;
  const timeMs = Date.parse(doc.time);
  if (!Number.isFinite(timeMs)) return null;
  const grid = { nLat, nLon, stepDeg, lat0, lon0, timeMs, cells: 0 };
  for (const name of names) {
    const f = doc.fields[name];
    if (!f || !(f.scale > 0) || !Array.isArray(f.rows) || f.rows.length !== nLat) return null;
    const a = new Float32Array(nLat * nLon).fill(NaN);
    for (let j = 0; j < nLat; j += 1) {
      if (typeof f.rows[j] !== 'string') return null;
      const parts = f.rows[j].split(',');
      if (parts.length !== nLon) return null;
      for (let i = 0; i < nLon; i += 1) {
        if (parts[i] === '') continue;
        const x = Number(parts[i]);
        if (!Number.isFinite(x)) return null;
        a[j * nLon + i] = x / f.scale;
      }
    }
    grid[name] = a;
  }
  const first = grid[names[0]];
  for (let k = 0; k < first.length; k += 1) if (!Number.isNaN(first[k])) grid.cells += 1;
  // A globe with a tenth of its points is a broken day, not the sea (the real one has more than half).
  if (grid.cells < (nLat * nLon) / 10) return null;
  return grid;
}

/** The currents' grid, with the mean speed over the sea (weighted by the area of each cell). */
export function parseFlow(json) {
  const g = parseSeaGrid(json, ['u_current', 'v_current']);
  if (!g) return null;
  let sum = 0;
  let w = 0;
  for (let j = 0; j < g.nLat; j += 1) {
    const area = Math.cos((g.lat0 + j * g.stepDeg) * DEG);
    for (let i = 0; i < g.nLon; i += 1) {
      const k = j * g.nLon + i;
      // The packer writes both components or neither; a half cell from elsewhere is no data.
      if (Number.isNaN(g.u_current[k]) || Number.isNaN(g.v_current[k])) { g.u_current[k] = NaN; g.v_current[k] = NaN; continue; }
      sum += Math.hypot(g.u_current[k], g.v_current[k]) * area;
      w += area;
    }
  }
  g.meanSpeed = w > 0 ? sum / w : 0;
  return g;
}

/** The sea temperature's grid. */
export function parseTemp(json) {
  return parseSeaGrid(json, ['sst']);
}

// The four grid points round a place, and how much of each: written into `q` (no allocation a streak).
const q = { k00: 0, k01: 0, k10: 0, k11: 0, w00: 0, w01: 0, w10: 0, w11: 0, near: 0 };
function corners(grid, latDeg, lonDeg) {
  const { nLat, nLon, stepDeg, lat0, lon0 } = grid;
  const y = Math.min(nLat - 1, Math.max(0, (latDeg - lat0) / stepDeg));
  const x = ((((lonDeg - lon0) % 360) + 360) % 360) / stepDeg;
  const j0 = Math.min(nLat - 2, Math.floor(y));
  const i0 = Math.floor(x) % nLon;
  const i1 = (i0 + 1) % nLon;
  const fy = y - j0;
  const fx = x - Math.floor(x);
  q.k00 = j0 * nLon + i0; q.k01 = j0 * nLon + i1; q.k10 = (j0 + 1) * nLon + i0; q.k11 = (j0 + 1) * nLon + i1;
  q.w00 = (1 - fx) * (1 - fy); q.w01 = fx * (1 - fy); q.w10 = (1 - fx) * fy; q.w11 = fx * fy;
  q.near = fy < 0.5 ? (fx < 0.5 ? q.k00 : q.k01) : (fx < 0.5 ? q.k10 : q.k11);
}

/** The bilinear mean of the corners that have a value; NaN when none has. */
function mix(a) {
  let s = 0;
  let w = 0;
  if (!Number.isNaN(a[q.k00])) { s += a[q.k00] * q.w00; w += q.w00; }
  if (!Number.isNaN(a[q.k01])) { s += a[q.k01] * q.w01; w += q.w01; }
  if (!Number.isNaN(a[q.k10])) { s += a[q.k10] * q.w10; w += q.w10; }
  if (!Number.isNaN(a[q.k11])) { s += a[q.k11] * q.w11; w += q.w11; }
  return w > 1e-9 ? s / w : NaN;
}

/**
 * The current at a place, or null where the NEAREST grid point has none: that point's cell is
 * land (or ice) to the source, and it is to us. Inside the sea it is the bilinear mean of the
 * corners that are sea, so a coast does not drag the water beside it to a stop.
 */
export function sampleCurrent(grid, latDeg, lonDeg) {
  if (!read(grid, latDeg, lonDeg)) return null;
  return { u: cur.u, v: cur.v, speed: Math.hypot(cur.u, cur.v) };
}

// The same, into `cur` and with no object made: a streak asks several times a frame.
const cur = { u: 0, v: 0 };
function read(grid, latDeg, lonDeg) {
  corners(grid, latDeg, lonDeg);
  if (Number.isNaN(grid.u_current[q.near])) return false;
  cur.u = mix(grid.u_current);
  cur.v = mix(grid.v_current);
  return true;
}

/** The sea's temperature at a place: the nearest corners that have one. NaN when none of the four has. */
export function sampleTemp(grid, latDeg, lonDeg) {
  corners(grid, latDeg, lonDeg);
  return mix(grid.sst);
}

/**
 * Where water at a place is after `seconds` of this current, on a sphere, or null when the way
 * there touches a cell with no value: a streak does not cross land. The step is cut into pieces of
 * half a degree at most, each read where it stands, so a fast current cannot leap an isthmus.
 */
export function stepCurrent(grid, latDeg, lonDeg, seconds, out = {}) {
  let lat = latDeg;
  let lon = lonDeg;
  let left = seconds;
  let speed = 0;
  for (let n = 0; n < 64 && left > 0; n += 1) {
    if (!read(grid, lat, lon)) return null;
    speed = Math.hypot(cur.u, cur.v);
    const perS = (speed / R_EARTH_M) / DEG; // degrees of arc a second
    const dt = perS * left > MAX_PIECE_DEG ? MAX_PIECE_DEG / perS : left;
    const cos = Math.max(0.05, Math.cos(lat * DEG));
    lat = Math.max(-89.5, Math.min(89.5, lat + ((cur.v * dt) / R_EARTH_M) / DEG));
    lon += ((cur.u * dt) / (R_EARTH_M * cos)) / DEG;
    left -= dt;
  }
  if (!read(grid, lat, lon)) return null;
  out.latDeg = lat;
  out.lonDeg = ((((lon + 180) % 360) + 360) % 360) - 180;
  out.speed = speed;
  return out;
}

// NO COPY, NO CURRENTS. The harvester is not on a schedule yet (2026-10-12): the saved copies are
// made by hand (`python3 -m harvest --dest DIR --only ocean-currents`, then `--only ocean-temperature`;
// scripts/refresh-snapshots.sh publishes them). Until they are, the Earth data panel offers no
// "Ocean currents" (ui/overlaypanel.js asks snapshotAvailable for both), and a link or a trip stop
// that asks for it anyway gets the one sentence COPY.overlay.currents.failed.
const FETCH_TIMEOUT_MS = 20000;
const RETRY_AFTER_MS = 3000;

/** Both saved copies, read together. Rejects when either is missing or is not the grid that was asked for. */
export async function fetchCurrents(opts = {}) {
  try {
    return await fetchOnce(opts);
  } catch (first) {
    // Not for a grid that came and was wrong: asking again would bring the same grid.
    if (/not the grid/.test(String(first && first.message))) throw first;
    await new Promise((r) => setTimeout(r, Number.isFinite(opts.retryMs) ? opts.retryMs : RETRY_AFTER_MS));
    return fetchOnce(opts);
  }
}

async function fetchOnce(opts) {
  const fetchImpl = opts.fetch || globalThis.fetch;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS) : null;
  const one = async (url, source, parse, what) => {
    const r = await fetchImpl(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined });
    if (!r.ok) throw new Error(`the saved ${what} copy answered ${r.status}`);
    let doc = JSON.parse(await r.text());
    // The harvester wraps what it saves: {schema, source, fetched_at, valid_until, ..., body}.
    if (doc && doc.body && doc.source === source) doc = doc.body;
    const grid = parse(doc);
    if (!grid) throw new Error(`the ${what} field was not the grid that was asked for`);
    return grid;
  };
  try {
    const [flow, temp] = await Promise.all([
      one(CURRENTS.flowUrl, CURRENTS.flowSource, parseFlow, 'ocean currents'),
      one(CURRENTS.tempUrl, CURRENTS.tempSource, parseTemp, 'sea temperature'),
    ]);
    return { flow, temp };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

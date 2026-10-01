// data/ovation.js -- NOAA SWPC's OVATION aurora forecast: where it is, what it says, when to ask again.
//
// Pure: the URL, the grid decode, the summary, the schedule and the rule for when the aurora may be
// drawn. No fetch, no DOM, no three.js, so tests/test_aurora.mjs runs all of it in Node on a saved
// answer. scene/auroraworker.js does the fetching off the main thread and scene/aurora.js the drawing.
//
// EVERYTHING BELOW WAS MEASURED ON 2026-09-30 with curl and `Origin: https://spaceradar.ai`:
//
//  * services.swpc.noaa.gov/json/ovation_aurora_latest.json answers `access-control-allow-origin: *`,
//    `cache-control: max-age=60`, and gzip on the wire: 141 097 bytes for 918 639 bytes of JSON, in
//    about 2 s from Europe. The body is {"Observation Time", "Forecast Time", "Data Format":
//    "[Longitude, Latitude, Aurora]", "coordinates": [[lon, lat, p], ...], "type": "MultiPoint"}:
//    65 160 cells, longitude 0..359 east, latitude -90..90, `p` a whole number 0..100.
//  * "Forecast Time" was "Observation Time" plus 90 minutes (19:38 -> 21:08 UTC). OVATION Prime is
//    driven by the solar wind measured at L1, about an hour upstream, so the grid is where aurora is
//    likely 30 to 90 minutes AFTER the observation: a forecast of the next hour, not a picture of now.
//  * `p` is NOAA's probability of visible aurora, 0-100 %. SWPC computes it from the model's energy
//    flux into the atmosphere with a linear fit to ground sightings (Machol et al. 2012, "Evaluation
//    of OVATION Prime as a forecast model for visible aurorae", Space Weather), so it rises with the
//    flux, which is what makes aurora bright. That is why scene/aurora.js may use it for the
//    brightness as well as the extent (probabilityToEmission there).
//  * The harvester's row (registry/sources.yaml swpc-ovation) promises `aurora.png`, but its parser
//    (harvest/parsers/swpc_ovation.py) passes the 900 kB body through whole, and
//    www.spaceradar.ai/data/v1/aurora.png answers 403 (no such object). The saved JSON copy exists
//    and was 2 days old on 2026-09-30: an aurora forecast is stale in an hour, so the browser asks
//    NOAA directly (the row is `browser: true`) and never draws a saved copy.

/** The one URL. NOAA's, public domain, CORS open. */
export const OVATION_URL = 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json';

/** The grid, as NOAA sends it: one cell per whole degree, longitude 0..359, latitude -90..90. */
export const GRID_W = 360;
export const GRID_H = 181;

/**
 * NOAA recomputes the grid every few minutes and the registry's cadence is 15 minutes; one answer
 * per quarter hour, only while the tab is visible, is about 140 kB a quarter hour on the wire.
 */
export const REFRESH_MS = 15 * 60 * 1000;
/**
 * Not before this long after the map's own catalogues have landed (main.js starts the aurora on
 * `sr:layers-ready`, as the live clouds are), and then only in an idle moment: the first visit's
 * byte budget (registry/budgets.yaml first_visit_bytes) is spent by then. Two seconds after the live
 * clouds' first look (data/gibs.js START_DELAY_MS = 6 s), so the two never race for the same idle
 * callback on a slow phone.
 */
export const START_DELAY_MS = 8000;
/** A failed look is tried again this soon, doubling, up to REFRESH_MS. */
export const RETRY_MS = 3 * 60 * 1000;

/**
 * The forecast is for the hour after it was made. With the app's clock more than this from the
 * forecast time, the band is no longer the aurora of the moment on screen and is not drawn. Three
 * hours is the registry row's own freshness_max, and a substorm has come and gone in less.
 */
export const HOLD_MS = 3 * 3600 * 1000;

/** The probability, in percent, a summary counts as "aurora likely here": NOAA's own map starts at 10. */
export const EDGE_PERCENT = 10;

/** Kp at which the space-weather line says the aurora is likely (NOAA's G1, a minor storm). */
export const KP_STORM = 5;

/**
 * The byte a probability becomes in the texture: 0..100 % spread over 0..255, so the shader's
 * bilinear filter works on the full range and `texel * 100 / 255` is the percentage again.
 */
export function percentToByte(p) {
  const v = Math.round((Number(p) * 255) / 100);
  return v < 0 ? 0 : v > 255 ? 255 : v || 0;
}

/**
 * NOAA's JSON -> one byte per degree, rows SOUTH FIRST (row 0 is latitude -90) and column = the
 * east longitude, which is the layout a DataTexture uploads with flipY false: v = 0 at the south
 * pole, u = 0 at the prime meridian. Cells outside the grid or not numbers are skipped, so a cell
 * NOAA leaves out reads 0 %, never a made-up value.
 *
 * @param {object|string} body   the parsed answer, or its text
 * @returns {{grid: Uint8Array, observationMs: number|null, forecastMs: number|null, cells: number,
 *            summary: ReturnType<typeof summarize>}}
 * @throws when the body is not an OVATION answer at all (no `coordinates` array)
 */
export function parseOvation(body) {
  const d = typeof body === 'string' ? JSON.parse(body) : body;
  if (!d || !Array.isArray(d.coordinates)) throw new Error('not an OVATION answer: no coordinates');
  const grid = new Uint8Array(GRID_W * GRID_H);
  let cells = 0;
  for (const c of d.coordinates) {
    if (!Array.isArray(c) || c.length < 3) continue;
    const lon = Math.round(Number(c[0]));
    const lat = Math.round(Number(c[1]));
    const p = Number(c[2]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || !Number.isFinite(p)) continue;
    if (lat < -90 || lat > 90) continue;
    const col = ((lon % 360) + 360) % 360;
    grid[(lat + 90) * GRID_W + col] = percentToByte(p);
    cells++;
  }
  const observationMs = Date.parse(d['Observation Time']);
  const forecastMs = Date.parse(d['Forecast Time']);
  return {
    grid,
    observationMs: Number.isFinite(observationMs) ? observationMs : null,
    forecastMs: Number.isFinite(forecastMs) ? forecastMs : null,
    cells,
    summary: summarize(grid),
  };
}

/**
 * The texture the shell samples: the grid at half a degree (720 x 361, rows south first, row 0 at
 * -90 and row 360 at +90, column 0 at longitude 0), bilinear from the 1-degree cells and then
 * smoothed by a 5-tap binomial filter each way (sigma ~0.5 degree, wrapping in longitude).
 *
 * WHY. The shell gates the probability (nothing below 3 %, full at 10 %, scene/aurora.js EMISSION),
 * and a threshold across a bilinear 1-degree field draws the cells' outline: the first screenshot
 * (2026-09-30, a quiet oval of 11 %) had a staircase for an edge, one step a degree. A smooth field
 * crosses the threshold on a smooth curve. OVATION's own grid is a smoothed model output, so this
 * invents no structure; it only stops the texture filter from inventing corners. 260 kB of R8.
 */
export const TEX_W = 720;
export const TEX_H = 361;

export function upsampleGrid(grid) {
  const out = new Float32Array(TEX_W * TEX_H);
  for (let y = 0; y < TEX_H; y++) {
    const r = y / 2;                      // grid row, fractional (lat + 90)
    const r0 = Math.min(GRID_H - 1, Math.floor(r));
    const r1 = Math.min(GRID_H - 1, r0 + 1);
    const fr = r - r0;
    for (let x = 0; x < TEX_W; x++) {
      const c = x / 2;
      const c0 = Math.floor(c) % GRID_W;
      const c1 = (c0 + 1) % GRID_W;
      const fc = c - Math.floor(c);
      const a = grid[r0 * GRID_W + c0] * (1 - fc) + grid[r0 * GRID_W + c1] * fc;
      const b = grid[r1 * GRID_W + c0] * (1 - fc) + grid[r1 * GRID_W + c1] * fc;
      out[y * TEX_W + x] = a * (1 - fr) + b * fr;
    }
  }
  const K = [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16];
  const tmp = new Float32Array(TEX_W * TEX_H);
  for (let y = 0; y < TEX_H; y++) {
    for (let x = 0; x < TEX_W; x++) {
      let v = 0;
      for (let k = -2; k <= 2; k++) v += K[k + 2] * out[y * TEX_W + ((x + k + TEX_W) % TEX_W)];
      tmp[y * TEX_W + x] = v;
    }
  }
  const res = new Uint8Array(TEX_W * TEX_H);
  for (let y = 0; y < TEX_H; y++) {
    for (let x = 0; x < TEX_W; x++) {
      let v = 0;
      for (let k = -2; k <= 2; k++) v += K[k + 2] * tmp[Math.min(TEX_H - 1, Math.max(0, y + k)) * TEX_W + x];
      res[y * TEX_W + x] = Math.round(v);
    }
  }
  return res;
}

/** The percentage in one cell of a decoded grid. */
export function cellPercent(grid, latDeg, lonDeg) {
  const row = Math.round(latDeg) + 90;
  const col = ((Math.round(lonDeg) % 360) + 360) % 360;
  if (row < 0 || row >= GRID_H) return 0;
  return (grid[row * GRID_W + col] * 100) / 255;
}

/**
 * What the grid says, per hemisphere, in the numbers a sentence needs:
 *   peak      the highest probability anywhere in it, percent
 *   edgeLat   the latitude nearest the equator with at least EDGE_PERCENT, signed (north +), or
 *             null when nowhere reaches it -- the oval's equatorward edge, as NOAA's map draws it
 *   cells     how many cells reach EDGE_PERCENT
 * Also `peak` over both, and `lit`, the number of cells the shell will draw anything for at all.
 */
export function summarize(grid) {
  const hemi = () => ({ peak: 0, edgeLat: null, cells: 0 });
  const north = hemi();
  const south = hemi();
  const edge = percentToByte(EDGE_PERCENT);
  let lit = 0;
  for (let row = 0; row < GRID_H; row++) {
    const lat = row - 90;
    if (lat === 0) continue;
    const h = lat > 0 ? north : south;
    for (let col = 0; col < GRID_W; col++) {
      const b = grid[row * GRID_W + col];
      if (!b) continue;
      lit++;
      const p = Math.round((b * 100) / 255);
      if (p > h.peak) h.peak = p;
      if (b >= edge) {
        h.cells++;
        if (h.edgeLat === null || Math.abs(lat) < Math.abs(h.edgeLat)) h.edgeLat = lat;
      }
    }
  }
  return { north, south, peak: Math.max(north.peak, south.peak), lit };
}

/**
 * Draw the band, or not. Pure, so the rule has a test and not a paragraph:
 *   'live'  a forecast is held and the app's clock is within HOLD_MS of its forecast time;
 *   'far'   a forecast is held and the clock has been moved away from it (scrubbed or a trip);
 *   'none'  nothing is held yet (not looked, looking, failed, or saving data).
 */
export function auroraMode({ forecastMs, clockMs, holdMs = HOLD_MS }) {
  if (!Number.isFinite(forecastMs)) return 'none';
  if (!Number.isFinite(clockMs)) return 'far';
  return Math.abs(clockMs - forecastMs) <= holdMs ? 'live' : 'far';
}

/**
 * How long until the next look, after one that ended `ok` or not. `failures` counts the failed looks
 * in a row, this one included: 3, 6, 12 minutes, then the ordinary quarter hour. Never sooner than
 * RETRY_MS, so a NOAA outage costs at most one request every three minutes from a tab left open.
 */
export function nextLookMs({ ok, failures = 0 }) {
  if (ok) return REFRESH_MS;
  const n = Math.max(1, failures);
  return Math.min(REFRESH_MS, RETRY_MS * 2 ** (n - 1));
}

/**
 * Whether a scheduled look may go out now. Nothing on a connection that saves data, ever; nothing
 * while the tab is hidden (the visibility handler looks again on return); one at a time.
 */
export function mayLook({ saveData = false, hidden = false, busy = false } = {}) {
  return !saveData && !hidden && !busy;
}

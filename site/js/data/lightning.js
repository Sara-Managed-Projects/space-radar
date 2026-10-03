// data/lightning.js -- where lightning is striking, from NOAA's own map, and when to draw a flash.
//
// Pure: URLs, the palette, the decode of a picture into cells, and the flash schedule. No fetch, no
// DOM, no three.js, so tests/test_weather.mjs runs it in Node. scene/weather/lightning.js does the
// fetching and the drawing.
//
// EVERYTHING BELOW WAS MEASURED ON 2026-10-03 with curl and `Origin: https://www.spaceradar.ai`:
//
//  * NOAA nowCOAST serves "Lightning Strike Density" as a WMS layer (`ldn_lightning_strike_density`)
//    at WMS_BASE. GetCapabilities (10 568 bytes) and GetMap both answer
//    `access-control-allow-origin: *` and `cache-control: max-age=600, public`.
//  * WHAT IT IS (the layer's own abstract): strikes counted by the ground networks NLDN and GLD360
//    over fifteen minutes on an 8 km grid, "the number of strikes per square km per minute multiplied
//    by a scaling factor of 10^3", made by the NWS Ocean Prediction Center. It is a NOAA-generated
//    "Level 5" product, "appropriate for public distribution": the density, never Vaisala's strokes.
//  * WHERE: 25 S to 80 N, and 110 E eastward across the Pacific and the Americas to 0 W. Europe,
//    Africa east of Greenwich, and Asia west of 110 E are NOT in it, and nothing is drawn there:
//    the card says so (copy/en.js COPY.weather.lightning). GOES's own mapper (GLM) is not in GIBS,
//    and Blitzortung's data is not free to reuse.
//  * WHEN: the `time` dimension lists the last six and a half hours in fifteen-minute steps, with
//    `default=` the newest. Asked at 17:56 UTC the default was 17:45.
//  * THE PICTURE: an 8-bit PNG in the palette below (GetStyles, the layer's SLD, "intervals"), clear
//    where the density is under 0.1. 1440 x 420 over the whole box was 6 452 bytes; decoded it held
//    2 016 cells and 1 449 strikes a minute, and the same slot at 2880 x 840 gave 1 514 -- the two
//    agree to 5 %, so the smaller one is asked for.

/** The WMS endpoint. */
export const WMS_BASE = 'https://nowcoast.noaa.gov/geoserver/lightning_detection/wms';
export const LAYER = 'ldn_lightning_strike_density';
/** The capabilities document: 10 kB, and the only place the newest slot's time is written. */
export const CAPS_URL = `${WMS_BASE}?service=WMS&version=1.3.0&request=GetCapabilities`;

/** The box asked for: the layer's whole latitude range, every longitude (clear where it has none). */
export const BOX = { south: -25, north: 80, west: -180, east: 180 };
/** The picture's size: a quarter of a degree a pixel. */
export const GRID_W = 1440;
export const GRID_H = 420;

/** A slot is fifteen minutes: the density is strikes counted over that long. */
export const SLOT_MS = 15 * 60 * 1000;
/** Looked at again this often while the tab is visible: one new slot per look. */
export const REFRESH_MS = SLOT_MS;
/** Not before this long after the layers have landed: the first visit's bytes are spent by then. */
export const START_DELAY_MS = 9000;
/**
 * The flashes are drawn only while the clock is within this of the slot they were counted in. A
 * thunderstorm cell lasts about an hour; past that the map is no longer the weather on screen.
 */
export const LIVE_WINDOW_MS = 60 * 60 * 1000;

/**
 * The palette, from the layer's SLD (GetStyles, 2026-10-03): each colour is an interval of density
 * in the layer's unit, strikes per km2 per minute x 1000. `mid` is the interval's middle, which is
 * what a cell of that colour is counted as; the open top class counts as its floor.
 */
export const PALETTE = [
  { rgb: [0xff, 0xff, 0xcc], lo: 0.1, hi: 0.25 },
  { rgb: [0xff, 0xec, 0x78], lo: 0.25, hi: 0.5 },
  { rgb: [0xff, 0xff, 0x00], lo: 0.5, hi: 0.75 },
  { rgb: [0xff, 0xd6, 0x00], lo: 0.75, hi: 1 },
  { rgb: [0xff, 0xa4, 0x00], lo: 1, hi: 2.5 },
  { rgb: [0xff, 0x78, 0x00], lo: 2.5, hi: 5 },
  { rgb: [0xff, 0x45, 0x00], lo: 5, hi: 10 },
  { rgb: [0xff, 0x00, 0x00], lo: 10, hi: 15 },
  { rgb: [0xbc, 0x00, 0x25], lo: 15, hi: 25 },
  { rgb: [0xcc, 0x00, 0x66], lo: 25, hi: 50 },
  { rgb: [0xff, 0x00, 0xff], lo: 50, hi: 75 },
  { rgb: [0x80, 0x00, 0x80], lo: 75, hi: 100 },
  { rgb: [0x40, 0x00, 0xc0], lo: 100, hi: 150 },
  { rgb: [0x00, 0x00, 0xff], lo: 150, hi: 200 },
  { rgb: [0x00, 0xc7, 0xff], lo: 200, hi: 250 },
  { rgb: [0x00, 0xa2, 0x64], lo: 250, hi: 300 },
  { rgb: [0x00, 0xff, 0x00], lo: 300, hi: 300 },
].map((p) => ({ ...p, mid: (p.lo + p.hi) / 2 }));

/** A pixel further than this from every palette colour (per channel) is not read as lightning. */
export const PALETTE_TOLERANCE = 10;
/** Kilometres in a degree of latitude, and of longitude at the equator (a sphere of 6 371 km). */
export const KM_PER_DEG = 111.195;

/** The most flashes drawn for one second of the clock: past it the map is a strobe, not a sky. */
export const MAX_FLASHES_PER_SECOND = 48;

/** ISO 8601 with milliseconds and a Z, the form the layer's `time` dimension is written in. */
export function isoSlot(ms) {
  return new Date(ms).toISOString();
}

/** The GetMap URL for one slot: the whole box, equirectangular, clear PNG. */
export function mapUrl(slotMs, width = GRID_W, height = GRID_H) {
  const q = [
    'SERVICE=WMS', 'VERSION=1.3.0', 'REQUEST=GetMap', `LAYERS=${LAYER}`, 'STYLES=',
    'FORMAT=image/png', 'TRANSPARENT=true', 'CRS=EPSG:4326',
    // WMS 1.3.0 with EPSG:4326 takes the box as lat,lon: south, west, north, east.
    `BBOX=${BOX.south},${BOX.west},${BOX.north},${BOX.east}`,
    `WIDTH=${width}`, `HEIGHT=${height}`,
    `TIME=${isoSlot(slotMs)}`,
  ];
  return `${WMS_BASE}?${q.join('&')}`;
}

/**
 * The newest slot, from the capabilities document: the `default=` of the layer's time dimension.
 * NaN when the document does not say, and then nothing is fetched: a picture whose time is not
 * known cannot be called measured.
 */
export function parseNewestSlot(xml) {
  const m = /<Dimension\b[^>]*\bname="time"[^>]*\bdefault="([^"]+)"/.exec(String(xml || ''));
  return m ? Date.parse(m[1]) : NaN;
}

/** The palette row a pixel is, or null: the nearest colour, within PALETTE_TOLERANCE a channel. */
export function paletteRow(r, g, b) {
  let best = null;
  let bestD = Infinity;
  for (const p of PALETTE) {
    const d = Math.max(Math.abs(p.rgb[0] - r), Math.abs(p.rgb[1] - g), Math.abs(p.rgb[2] - b));
    if (d < bestD) { bestD = d; best = p; }
  }
  return bestD <= PALETTE_TOLERANCE ? best : null;
}

/** Ground under one pixel of the picture at `latDeg`, km2. */
export function cellAreaKm2(latDeg, width = GRID_W, height = GRID_H) {
  const dLat = (BOX.north - BOX.south) / height;
  const dLon = (BOX.east - BOX.west) / width;
  return dLat * KM_PER_DEG * dLon * KM_PER_DEG * Math.cos((latDeg * Math.PI) / 180);
}

/**
 * The picture as cells. `rgba` is width x height x 4, top row first (the north edge), as a canvas
 * gives it. A cell is a pixel with lightning in it: where it is and how many strikes a minute the
 * density there means over the ground the pixel covers.
 * @returns {{cells: Array<{latDeg:number, lonDeg:number, perMin:number}>, perMin: number, unknown: number}}
 */
export function decodeGrid(rgba, width = GRID_W, height = GRID_H) {
  const cells = [];
  let perMin = 0;
  let unknown = 0;
  if (!rgba || rgba.length < width * height * 4) return { cells, perMin, unknown };
  for (let y = 0; y < height; y++) {
    const latDeg = BOX.north - ((y + 0.5) * (BOX.north - BOX.south)) / height;
    const area = cellAreaKm2(latDeg, width, height);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (rgba[i + 3] < 128) continue;
      const row = paletteRow(rgba[i], rgba[i + 1], rgba[i + 2]);
      if (!row) { unknown++; continue; }
      const rate = row.mid * 1e-3 * area;
      cells.push({ latDeg, lonDeg: BOX.west + ((x + 0.5) * (BOX.east - BOX.west)) / width, perMin: rate });
      perMin += rate;
    }
  }
  return { cells, perMin, unknown };
}

/**
 * The cells as something to draw from: the running total of their rates, so one random number
 * picks a cell in proportion to how much lightning it holds.
 */
export function flashModel(cells, slotMs) {
  const cum = new Float64Array(cells.length);
  let total = 0;
  for (let i = 0; i < cells.length; i++) { total += cells[i].perMin; cum[i] = total; }
  return { cells, cum, perMin: total, slotMs };
}

/** mulberry32: a small seeded generator, so one second of the clock always holds the same flashes. */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** A Poisson draw (Knuth's product for a small mean, a rounded normal past 30). */
export function poisson(mean, rand) {
  if (!(mean > 0)) return 0;
  if (mean > 30) {
    const u = Math.max(rand(), 1e-12);
    const v = rand();
    return Math.max(0, Math.round(mean + Math.sqrt(mean) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)));
  }
  const limit = Math.exp(-mean);
  let k = 0;
  let p = 1;
  do { k++; p *= rand(); } while (p > limit);
  return k - 1;
}

/**
 * The flashes of one second of the clock. `second` is the clock's time in whole seconds.
 *
 * WHAT IS MEASURED AND WHAT IS NOT. Where the flashes fall and how many there are in a minute is
 * NOAA's count. The instant of each one is not in the map -- it is fifteen minutes summed -- so it
 * is drawn at random at the measured rate (a Poisson process), seeded by the second, so the same
 * second replays the same flashes. The card says both halves.
 * @returns {Array<{latDeg:number, lonDeg:number, tMs:number, energy:number}>}
 */
export function flashesInSecond(model, second, cap = MAX_FLASHES_PER_SECOND) {
  if (!model || !model.cells.length || !(model.perMin > 0)) return [];
  const rand = seeded((Math.imul(second | 0, 2654435761) ^ ((model.slotMs / SLOT_MS) | 0)) >>> 0);
  const n = Math.min(cap, poisson(model.perMin / 60, rand));
  const out = [];
  for (let k = 0; k < n; k++) {
    const pick = rand() * model.perMin;
    let lo = 0;
    let hi = model.cum.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (model.cum[mid] < pick) lo = mid + 1; else hi = mid; }
    const c = model.cells[lo];
    out.push({
      // Somewhere inside the pixel, not on its centre: a grid of flashes would be the map's grid.
      latDeg: c.latDeg + (rand() - 0.5) * ((BOX.north - BOX.south) / GRID_H),
      lonDeg: c.lonDeg + (rand() - 0.5) * ((BOX.east - BOX.west) / GRID_W),
      tMs: second * 1000 + rand() * 1000,
      // How bright: most flashes are ordinary and a few are several times brighter.
      energy: 0.45 + 0.55 * rand() ** 3,
    });
  }
  return out;
}

/**
 * What the layer may show with the clock at `clockMs`: 'live' inside LIVE_WINDOW_MS of the slot,
 * 'away' outside it (the flashes go, the card says why), 'none' with no slot held.
 */
export function lightningMode(clockMs, slotMs) {
  if (!Number.isFinite(slotMs)) return 'none';
  return Math.abs(clockMs - (slotMs + SLOT_MS / 2)) <= LIVE_WINDOW_MS ? 'live' : 'away';
}

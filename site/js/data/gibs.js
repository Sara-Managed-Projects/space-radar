// data/gibs.js -- which NASA GIBS pictures the live clouds are made of, and when they were taken.
//
// Pure: URLs, time slots and the rule for when the live clouds may be shown. No fetch, no DOM,
// no three.js, so tests/test_liveclouds.mjs runs it in Node. scene/liveclouds.js does the
// fetching and scene/cloudcompose.js the pixels.
//
// EVERYTHING BELOW WAS MEASURED ON 2026-09-28 with curl and `Origin: https://spaceradar.ai`:
//
//  * The three geostationary Band 13 ("clean infrared", 10.3 um) layers are served by the WMS at
//    WMS_BASE for EPSG:4326, whole globe, any size. Each answers `access-control-allow-origin: *`
//    and `cache-control: max-age=0, no-store`: nothing is cached anywhere, so every request goes
//    to NASA, which is why scene/liveclouds.js asks only when a satellite has a newer picture.
//    A 2048 x 1024 JPEG was 186-246 KB and took 1.8-3.1 s.
//  * TIME snaps to the start of its ten-minute slot (21:03 returned the 21:00 picture byte for
//    byte), and a slot inside a gap in the record returns an all-black 12 572-byte JPEG, not an
//    error. The capabilities document that lists the gaps is 2.5 MB, far too big for a page.
//  * DescribeDomains for one layer and a six-hour window is 376 bytes, CORS `*`, and lists the
//    slots as `start/end/PT10M` intervals. It runs AHEAD of the pictures: at 22:11 UTC it listed
//    21:50 for GOES-East and 21:40 for Himawari while both of those, and 21:40 for GOES-East,
//    were still the black blank; 21:30 was the newest real picture, 41 minutes old. So the newest
//    listed slot is a candidate, not an answer, and a blank walks back one slot (BLANK_MAX_BYTES).
//  * The JPEG is NOT greyscale: it is GIBS's colour palette "Clean_Longwave_Infrared_Window_Band"
//    (colormaps/v1.3, saved in tests/fixtures/gibs/), which scene/cloudcompose.js turns back into
//    a temperature.

/** The WMS endpoint, geographic (EPSG:4326) projection, "best" imagery. */
export const WMS_BASE = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
/** DescribeDomains, REST form: `{layer}/default/{matrixSet}/all/{start}--{end}.xml`. */
export const WMTS_DOMAINS_BASE = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/';
/** The one tile matrix set these layers are published in (WMTS capabilities, 2026-09-28). */
export const MATRIX_SET = '2km';

/**
 * The three geostationary imagers GIBS carries, west to east. `subLonDeg` is where each satellite
 * hangs over the equator; the composite weights every pixel by its angle from that point.
 *   GOES-East is GOES-19, at 75.2 W since it took over from GOES-16 on 2025-04-07 (NOAA).
 *   GOES-West is GOES-18, at 137.2 W since 2023-01-04 (NOAA).
 *   Himawari is Himawari-9, at 140.7 E since 2022-12-13 (JMA).
 * Checked against the pictures themselves on 2026-09-28 (tests/probes/clouds-probe.js): halfway
 * between the two edges of each disc on the equator row is 74.5 W, 136.2 W and 140.71 E, and each
 * disc reaches 81.7-83.1 degrees either side. The GOES limbs are ragged by a degree, which is the
 * size of that disagreement; nothing in the seam (62-78 degrees) is that sensitive.
 * There is no European or Indian Ocean satellite in GIBS, so 6.5 E to 60.6 E has no live picture
 * at all: realism study section 2.1, and scene/cloudcompose.js fills it.
 */
export const GEO_SATELLITES = [
  { id: 'goes-west', layer: 'GOES-West_ABI_Band13_Clean_Infrared', subLonDeg: -137.2, name: 'GOES-West', operator: 'NOAA' },
  { id: 'goes-east', layer: 'GOES-East_ABI_Band13_Clean_Infrared', subLonDeg: -75.2, name: 'GOES-East', operator: 'NOAA' },
  { id: 'himawari', layer: 'Himawari_AHI_Band13_Clean_Infrared', subLonDeg: 140.7, name: 'Himawari', operator: 'JMA' },
];

/** The picture size asked for: 0.176 degrees a pixel, about 20 km at the equator. */
export const IMAGE_W = 2048;
export const IMAGE_H = 1024;

/** A slot's length. Every one of the three layers is PT10M in its DescribeDomains answer. */
export const SLOT_MS = 10 * 60 * 1000;
/** How far back DescribeDomains is asked to look. Six hours covers the longest gap seen (2 h). */
export const DOMAIN_WINDOW_MS = 6 * 3600 * 1000;
/** How many slots are tried, newest first, before a satellite is given up on for this round. */
export const MAX_SLOT_TRIES = 4;
/**
 * A JPEG smaller than this is the all-black blank. Measured: the blank is 12 572 bytes at
 * 2048 x 1024 and the smallest real picture was 186 020 bytes (Himawari, 21:30 UTC).
 */
export const BLANK_MAX_BYTES = 40000;

/**
 * How often the live picture is refreshed while the tab is visible. The satellites take a
 * picture every ten minutes; fifteen means about one new picture per refresh without asking NASA
 * for a slot twice. Each refresh first costs three ~380-byte DescribeDomains answers, and only a
 * satellite with a newer slot is fetched again.
 */
export const REFRESH_MS = 15 * 60 * 1000;
/**
 * A satellite with NO picture is asked again this soon, up to MISSING_RETRIES times, rather than
 * leaving its third of the globe static for fifteen minutes. MEASURED 2026-09-28: GOES-West's
 * DescribeDomains once took over 30 s and was abandoned while the other two answered in 0.2 s.
 */
export const RETRY_MISSING_MS = 3 * 60 * 1000;
export const MISSING_RETRIES = 3;
/** Not before this long after the first frame: the first visit's byte budget is spent by then. */
export const START_DELAY_MS = 6000;
/**
 * The live clouds are a picture of now. With the clock moved further than this from the moment
 * they were taken, they are no longer the weather of the moment on screen, and the static map
 * (cls illustrative, as before 2026-09-28) comes back. Twelve hours is the brief's number: half a
 * day is long enough for a storm to have moved its own width.
 */
export const LIVE_WINDOW_MS = 12 * 3600 * 1000;

const pad2 = (n) => String(n).padStart(2, '0');

/** ISO 8601 with seconds and a Z, the form GIBS's TIME and DescribeDomains take. */
export function isoMinute(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:00Z`;
}

/** The start of the ten-minute slot `ms` falls in. */
export function floorSlot(ms, slotMs = SLOT_MS) {
  return Math.floor(ms / slotMs) * slotMs;
}

/**
 * The DescribeDomains URL for one layer, covering DOMAIN_WINDOW_MS up to the slot after `nowMs`.
 * Both ends are whole slots, so the URL changes once every ten minutes: the answer is served
 * `max-age=1800`, and a URL that stayed the same for half an hour would read a stale list.
 */
export function domainsUrl(layer, nowMs) {
  const end = floorSlot(nowMs) + SLOT_MS;
  const start = end - DOMAIN_WINDOW_MS;
  return `${WMTS_DOMAINS_BASE}${layer}/default/${MATRIX_SET}/all/${isoMinute(start)}--${isoMinute(end)}.xml`;
}

/** The WMS GetMap URL for one layer at one slot: the whole globe, equirectangular, JPEG. */
export function mapUrl(layer, slotMs, width = IMAGE_W, height = IMAGE_H) {
  const q = [
    'SERVICE=WMS', 'REQUEST=GetMap', 'VERSION=1.3.0',
    `LAYERS=${layer}`, 'STYLES=', 'CRS=EPSG:4326',
    // WMS 1.3.0 with EPSG:4326 takes the box as lat,lon: south, west, north, east.
    'BBOX=-90,-180,90,180',
    `WIDTH=${width}`, `HEIGHT=${height}`, 'FORMAT=image/jpeg',
    `TIME=${isoMinute(floorSlot(slotMs))}`,
  ];
  return `${WMS_BASE}?${q.join('&')}`;
}

/**
 * The `<Domain>` of a DescribeDomains answer as intervals, oldest first. Anything it does not
 * recognise is skipped; an answer with none yields [] and the satellite is simply not live.
 * @returns {Array<{startMs:number, endMs:number, stepMs:number}>}
 */
export function parseDomains(xml) {
  const m = /<Domain>([^<]*)<\/Domain>/.exec(String(xml || ''));
  if (!m) return [];
  const out = [];
  for (const part of m[1].split(',')) {
    const [a, b, p] = part.trim().split('/');
    const startMs = Date.parse(a);
    const endMs = Date.parse(b);
    const step = /^PT(\d+)M$/.exec(p || '');
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs || !step) continue;
    out.push({ startMs, endMs, stepMs: Number(step[1]) * 60000 });
  }
  return out.sort((x, y) => x.startMs - y.startMs);
}

/**
 * The slots worth asking for, newest first: every listed slot no later than `nowMs` and newer
 * than `afterMs` (the picture already held), at most `max` of them. Never a slot that is not in
 * the list, because an unlisted slot is the black blank.
 */
export function candidateSlots(intervals, nowMs, { afterMs = -Infinity, max = MAX_SLOT_TRIES } = {}) {
  const out = [];
  for (let i = intervals.length - 1; i >= 0 && out.length < max; i--) {
    const iv = intervals[i];
    let s = Math.min(iv.endMs, floorSlot(nowMs, iv.stepMs));
    // Stay on the interval's own grid, whatever `nowMs` did to the alignment.
    s = iv.startMs + Math.floor((s - iv.startMs) / iv.stepMs) * iv.stepMs;
    for (; s >= iv.startMs && out.length < max; s -= iv.stepMs) {
      if (s <= afterMs) return out;
      out.push(s);
    }
  }
  return out;
}

/**
 * Which clouds to draw. Pure, so the rule has a test and not a paragraph:
 *   'live'         a live picture exists and the clock is within LIVE_WINDOW_MS of when it was taken;
 *   'illustrative' otherwise -- nothing fetched yet, every fetch failed, the visitor is saving
 *                  data, or the clock has been moved hours away from the picture.
 * @param {{capturedMs?:number|null, clockMs:number, windowMs?:number}} s
 */
export function cloudMode({ capturedMs, clockMs, windowMs = LIVE_WINDOW_MS }) {
  if (!Number.isFinite(capturedMs) || !Number.isFinite(clockMs)) return 'illustrative';
  return Math.abs(clockMs - capturedMs) <= windowMs ? 'live' : 'illustrative';
}

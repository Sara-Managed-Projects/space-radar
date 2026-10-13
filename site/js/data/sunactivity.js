// data/sunactivity.js -- what the Sun is doing: flares from NOAA's event list, coronal mass ejections
// from NASA's DONKI catalogue, and the arithmetic that stands a prominence on the limb (spec 0073
// requirement 2).
//
// Pure: two addresses, two parsers and the numbers scene/sun.js draws from. main.js fetches both lists
// ONCE, after the sunspot list, the first time the camera is close to the Sun, and never on a
// connection that asked to save data. tests/test_sun.mjs holds every function here.
//
// FLARES -- MEASURED time, class and region. services.swpc.noaa.gov/json/edited_events.json is SWPC's
// edited event list as JSON: about thirty days of events, of which the rows of type `XRA` are X-ray
// flares seen by GOES. READ 2026-10-12 with `curl -s -D - -H "Origin: https://www.spaceradar.ai"`:
// `access-control-allow-origin: *`, `cache-control: max-age=60`, 320 660 bytes, 564 rows, 346 of them
// XRA, 264 of those with a region number. A row carries
//   begin_datetime, max_datetime, end_datetime   "2026-10-12T02:02:00", UTC with no zone letter
//   type           "XRA"
//   particulars1   "C1.1": the class at the peak. The letter is a decade of the 1-8 angstrom flux
//                  (B 1e-7, C 1e-6, M 1e-5, X 1e-4 W/m2) and the number multiplies it
//   region         4549, NOAA's number for the active region, or null when none was assigned
// (The GOES flare files the brief named, json/goes/primary/xray-flares-latest.json and
// xray-flares-7-day.json, were read the same day: CORS open, 420 and 23 040 bytes, and NO region
// number on any row. A flare with no place cannot be drawn at a place, so this list is used instead.)
// NOAA says an event ends when the flux has fallen half way back from its peak, so the time from
// max to end is the flare's own half-life, and that is the decay drawn: measured, not chosen.
// WHAT IS CHOSEN: how bright a class is drawn (FLARE_GAIN_*), the size of the bright kernel, and
// that a flare smaller than class C is not drawn at all. A flare whose region is not on today's
// sunspot list has no place and is not drawn.
//
// CORONAL MASS EJECTIONS -- MEASURED start, direction, width and speed. NASA's DONKI (Space Weather
// Database Of Notifications, Knowledge, Information; the Moon to Mars Space Weather Analysis Office and
// the Community Coordinated Modeling Center at Goddard) lists each CME's analysis. READ 2026-10-12:
// the address in older notes, kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/..., now answers 301 to a news
// page that names the new base, https://ccmc.gsfc.nasa.gov/DONKI-API/get/... ; with no parameters
// CMEAnalysis answers the last thirty days, most accurate analysis of each: 48 132 bytes, 63 rows,
// `Access-Control-Allow-Origin: *`, `Cache-Control: no-cache, no-store`, no key. (api.nasa.gov/DONKI
// answers 403 API_KEY_MISSING without a key and is not used.) A row carries
//   associatedCMEstartTime  "2026-10-11T23:12Z": first seen in a coronagraph
//   latitude, longitude     degrees in the frame of the Sun-Earth line, POSITIVE LONGITUDE IS WEST
//                           (checked against each CME's own `sourceLocation`: W32 is +32, E90 is -90),
//                           the opposite sign to NOAA's regions
//   halfAngle               degrees, half the cone's width
//   speed                   km/s
//   isMostAccurate          true
// The page does not call NASA: registry/sources.yaml `donki-cme-analysis` is `browser: false`, so
// the list is read only from our saved copy, and with no copy no CME is drawn.
// WHAT IS MODELLED: the front leaves the surface at the start time and keeps the reported speed (real
// ones accelerate through the first few radii). WHAT IS CHOSEN: only analyses of CME_MIN_SPEED and
// faster are drawn, the cloud is followed out to CME_REACH_RADII, and how bright it is: full near the
// Sun, thinning with distance to CME_FLOOR (never under what can be seen), and over its last
// CME_TAIL_RADII down to CME_SEEN, under which it is no longer listed as in flight. So the card
// never says a CME is in flight while the picture shows none (a look at the live build, 2026-10-12:
// two hours in, a 741 km/s front was drawn at opacity 0.02 and a 1 586 km/s one not at all).
//
// PROMINENCES -- MEASURED places, ILLUSTRATIVE everything else. Real prominences hang over the
// neutral lines of active regions and of quiet filament channels; nobody publishes a free list of
// today's. What is drawn: at each of NOAA's numbered regions (data/sunregions.js) that is within
// PROM_LIMB_DEG of the limb as the camera sees it, one loop or one hedgerow, PROM_MIN_RADII to
// PROM_MAX_RADII tall by the region's area. A region with an M or X flare in its decay is drawn
// taller, up to PROM_ERUPTIVE_RADII: the trigger is measured, the height is not.

export const SUN_EVENTS_URL = 'https://services.swpc.noaa.gov/json/edited_events.json';
export const SUN_EVENTS_SOURCE_ID = 'swpc-edited-events';
export const CME_URL = 'https://ccmc.gsfc.nasa.gov/DONKI-API/get/CMEAnalysis';
export const CME_SOURCE_ID = 'donki-cme-analysis';

/** The Sun's radius, km (IAU 2015 Resolution B3 nominal value). */
export const SUN_RADIUS_KM = 695700;

/** The most flares drawn at once: the shader's array. The brightest are kept. */
export const MAX_FLARES = 4;
/** The 1-8 angstrom flux at the bottom of each class, W/m2. */
export const FLARE_DECADE = { A: 1e-8, B: 1e-7, C: 1e-6, M: 1e-5, X: 1e-4 };
/** The smallest flare drawn: class C1. */
export const FLARE_MIN_FLUX = 1e-6;
/** Drawn brightness at C1, and what each tenfold of flux adds (illustrative): M1 0.65, X1 0.95. */
export const FLARE_GAIN_C1 = 0.35;
export const FLARE_GAIN_PER_DECADE = 0.3;
export const FLARE_GAIN_MAX = 1.3;
/** A flare is gone after this many of its own half-lives (it is then under 2 % of its peak). */
export const FLARE_HALF_LIVES = 6;
/** The shortest half-life drawn, ms: a list that gives max and end in the same minute still decays. */
export const FLARE_MIN_HALF_LIFE_MS = 120000;
/** From this flux a region's prominence is drawn erupting: class M1. */
export const FLARE_ERUPTIVE_FLUX = 1e-5;

/** The most CMEs drawn at once, by tier. */
export const MAX_CMES = 2;
/** Analyses slower than this, km/s, are not drawn (DONKI's own type S is under 500). */
export const CME_MIN_SPEED = 500;
/**
 * The cloud is followed this many Sun radii from the centre: about what a wide coronagraph sees
 * (SOHO's LASCO C3 reaches 30). A 1 500 km/s CME is there in three hours, a 500 km/s one in nine.
 */
export const CME_REACH_RADII = 25;
/** The least a cloud in flight is drawn at, before its last CME_TAIL_RADII (illustrative: chosen to be seen). */
export const CME_FLOOR = 0.3;
/** Over its last radii it thins from the floor; under CME_SEEN it is not listed, and so not on the card. */
export const CME_TAIL_RADII = 3;
export const CME_SEEN = 0.08;

/** A region this close to the limb, degrees, stands a prominence; inside PROM_FULL_DEG it is whole. */
export const PROM_LIMB_DEG = 15;
export const PROM_FULL_DEG = 10;
/** Heights above the surface, Sun radii: an ordinary one, and one over a region flaring at M or X. */
export const PROM_MIN_RADII = 0.02;
export const PROM_MAX_RADII = 0.15;
export const PROM_ERUPTIVE_RADII = 0.4;
/** The most prominences at once, by tier (0, 1, 2). */
export const PROM_CAP = [2, 8, 8];

const RAD = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const utc = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return NaN;
  return Date.parse(/Z$|[+-]\d{2}:?\d{2}$/.test(s) ? s : s + 'Z');
};

async function read(id, opts, what) {
  const loadFn = opts.load || (await import('./sources.js')).load;
  const r = await loadFn(id);
  if (!r || r.data == null) throw new Error(String((r && r.error) || what));
  return r.data;
}
/** NOAA's event list: our saved copy first, SWPC when there is none. `opts.load` is for tests. */
export function readSunEvents(opts = {}) { return read(SUN_EVENTS_SOURCE_ID, opts, 'the flare list could not be read'); }
/** NASA's CME analyses: our saved copy only (the row is `browser: false`). */
export function readCmes(opts = {}) { return read(CME_SOURCE_ID, opts, 'the CME list could not be read'); }

/** "M2.3" -> 2.3e-5 W/m2; anything else NaN. */
export function flareFlux(cls) {
  const m = typeof cls === 'string' ? /^([ABCMX])(\d+(?:\.\d+)?)$/.exec(cls.trim()) : null;
  return m ? FLARE_DECADE[m[1]] * Number(m[2]) : NaN;
}

/**
 * The X-ray flares of class C and above that have a region and a peak time:
 * [{ region, cls, flux, beginMs, maxMs, halfLifeMs }], oldest first, one per flare. Malformed rows are skipped.
 */
export function parseFlares(json) {
  if (!Array.isArray(json)) return [];
  const out = [];
  for (const row of json) {
    if (!row || row.type !== 'XRA') continue;
    const flux = flareFlux(row.particulars1);
    const maxMs = utc(row.max_datetime);
    const region = Number(row.region);
    if (!(flux >= FLARE_MIN_FLUX) || !Number.isFinite(maxMs) || !Number.isInteger(region) || region <= 0) continue;
    const beginMs = utc(row.begin_datetime);
    const endMs = utc(row.end_datetime);
    out.push({
      region,
      cls: row.particulars1.trim(),
      flux,
      beginMs: Number.isFinite(beginMs) && beginMs <= maxMs ? beginMs : maxMs - FLARE_MIN_HALF_LIFE_MS,
      maxMs,
      halfLifeMs: Math.max(FLARE_MIN_HALF_LIFE_MS, Number.isFinite(endMs) ? endMs - maxMs : 0),
    });
  }
  // Two satellites report the same flare (M6.4 from one, M6.6 from the other): one flare, the larger reading.
  out.sort((a, b) => a.maxMs - b.maxMs || a.region - b.region || b.flux - a.flux);
  return out.filter((f, i) => i === 0 || f.maxMs !== out[i - 1].maxMs || f.region !== out[i - 1].region);
}

/** How bright a class is drawn at its peak (illustrative): a straight line in the logarithm of the flux. */
export function flareGain(flux) {
  if (!(flux >= FLARE_MIN_FLUX)) return 0;
  return Math.min(FLARE_GAIN_MAX, FLARE_GAIN_C1 + FLARE_GAIN_PER_DECADE * Math.log10(flux / FLARE_MIN_FLUX));
}

/**
 * A flare's drawn brightness at a time: nothing before it begins, a smooth rise to its class's gain
 * at the peak, then halving every half-life, and nothing once FLARE_HALF_LIVES of them have passed.
 */
export function flareBrightness(flare, tMs) {
  if (!flare || !Number.isFinite(tMs) || tMs < flare.beginMs) return 0;
  const gain = flareGain(flare.flux);
  if (tMs <= flare.maxMs) {
    const x = flare.maxMs > flare.beginMs ? (tMs - flare.beginMs) / (flare.maxMs - flare.beginMs) : 1;
    return gain * x * x * (3 - 2 * x);
  }
  const lives = (tMs - flare.maxMs) / flare.halfLifeMs;
  return lives >= FLARE_HALF_LIVES ? 0 : gain * Math.pow(0.5, lives);
}

/**
 * The analyses fast enough to draw: [{ id, startMs, latDeg, eastDeg, halfAngleDeg, speedKmS }],
 * oldest first, one per CME. `eastDeg` is NOAA's sign (east positive), so data/sunregions.js
 * spotDirection places it; DONKI's own longitude is west positive.
 */
export function parseCmes(json) {
  if (!Array.isArray(json)) return [];
  const seen = new Map();
  for (const row of json) {
    if (!row || row.isMostAccurate === false) continue;
    const startMs = utc(row.associatedCMEstartTime);
    const lat = Number(row.latitude), lon = Number(row.longitude), half = Number(row.halfAngle), speed = Number(row.speed);
    if (row.latitude == null || row.longitude == null || !Number.isFinite(startMs) || !Number.isFinite(lat) || !Number.isFinite(lon)
      || Math.abs(lat) > 90 || !(half > 0) || !(speed >= CME_MIN_SPEED)) continue;
    const id = String(row.associatedCMEID || row.associatedCMEstartTime);
    seen.set(id, { id, startMs, latDeg: lat, eastDeg: -lon, halfAngleDeg: Math.min(90, half), speedKmS: speed });
  }
  return [...seen.values()].sort((a, b) => a.startMs - b.startMs);
}

/** How long a front is followed, ms: from the surface to CME_REACH_RADII at its own speed. */
export function cmeFlightMs(cme) { return ((CME_REACH_RADII - 1) * SUN_RADIUS_KM / cme.speedKmS) * 1000; }

/**
 * Where a CME's front is at a time: null before it starts and after it has passed CME_REACH_RADII,
 * else { radii, opacity }: the distance from the Sun's centre at the reported speed, and a light that
 * comes up over the first third of a radius, falls with distance to CME_FLOOR and no lower, and
 * thins to nothing over the last CME_TAIL_RADII before the reach.
 */
export function cmeShell(cme, tMs) {
  if (!cme || !Number.isFinite(tMs) || tMs < cme.startMs) return null;
  const radii = 1 + (cme.speedKmS * (tMs - cme.startMs) / 1000) / SUN_RADIUS_KM;
  if (radii >= CME_REACH_RADII) return null;
  const up = clamp((radii - 1) / 0.33, 0, 1);
  const out = 1 - (radii - 1) / (CME_REACH_RADII - 1);
  const tail = clamp((CME_REACH_RADII - radii) / CME_TAIL_RADII, 0, 1);
  return { radii, opacity: up * (CME_FLOOR + (1 - CME_FLOOR) * out * out) * tail };
}

/**
 * How far a place on the Sun is from the limb the camera sees, degrees: 0 on the limb, positive on
 * the disc, negative behind it. `dir` and `camDir` are unit vectors in the Sun's axes, `camRadii` the
 * camera's distance from the centre in Sun radii (the limb is where the angle from the camera's
 * direction is acos(1 / distance), not ninety degrees: close up the visible cap is smaller).
 */
export function limbOffsetDeg(dir, camDir, camRadii) {
  const fromCam = Math.acos(clamp(dir[0] * camDir[0] + dir[1] * camDir[1] + dir[2] * camDir[2], -1, 1));
  const limb = Math.acos(clamp(1 / Math.max(1.0001, camRadii), 0, 1));
  return (limb - fromCam) / RAD;
}

/** 1 within PROM_FULL_DEG of the limb, 0 at PROM_LIMB_DEG and beyond, smooth between. */
export function prominenceFade(offsetDeg) {
  const x = clamp((PROM_LIMB_DEG - Math.abs(offsetDeg)) / (PROM_LIMB_DEG - PROM_FULL_DEG), 0, 1);
  return x * x * (3 - 2 * x);
}

/** A repeatable number in 0..1 from a region's NOAA number: which shape it wears, and its phase. */
export function regionThrow(region, salt = 0) {
  const x = Math.sin((Number(region) || 0) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * The prominence one region stands: { kind, height, width, seed }. `kind` 0 is a loop (a region of
 * few spots), 1 a hedgerow; `height` and `width` are in Sun radii. `flareLevel` is the brightness of
 * the strongest flare of class M or above now fading at the region (0 with none): it lifts the
 * height from the ordinary range toward PROM_ERUPTIVE_RADII.
 */
export function prominenceShape(region, flareLevel = 0) {
  const area = Math.max(0, Number(region.areaMsh) || 0);
  const calm = clamp(PROM_MIN_RADII + (PROM_MAX_RADII - PROM_MIN_RADII) * Math.sqrt(area / 600) * (0.6 + 0.4 * regionThrow(region.region, 1)), PROM_MIN_RADII, PROM_MAX_RADII);
  const lift = clamp(flareLevel, 0, 1);
  const height = clamp(calm + (PROM_ERUPTIVE_RADII - calm) * lift * lift * (3 - 2 * lift), PROM_MIN_RADII, PROM_ERUPTIVE_RADII);
  const kind = regionThrow(region.region, 2) < 0.6 ? 0 : 1;
  const extent = clamp((Number(region.extentDeg) || 0) * RAD, 0, 0.2);
  const width = kind === 0 ? Math.max(0.05, height * 1.7) : Math.max(0.09, extent * 1.4, height * 1.2);
  return { kind, height, width, seed: regionThrow(region.region, 3) };
}

/**
 * The strongest flares showing at a time, for the regions on today's list:
 * [{ flare, brightness }], brightest first, MAX_FLARES at most.
 * @param {object[]} flares   parseFlares()
 * @param {Set<number>|null} regions  NOAA numbers that have a place today; null takes every flare
 */
export function flaresAt(flares, tMs, regions = null) {
  const out = [];
  if (!Array.isArray(flares)) return out;
  for (const flare of flares) {
    if (tMs < flare.beginMs) continue;
    if (regions && !regions.has(flare.region)) continue;
    const brightness = flareBrightness(flare, tMs);
    if (brightness > 0.02) out.push({ flare, brightness });
  }
  out.sort((a, b) => b.brightness - a.brightness);
  return out.slice(0, MAX_FLARES);
}

/**
 * The CMEs in flight at a time: [{ cme, radii, opacity }], newest first, `cap` at most. One too
 * faint to see (its first minutes, its last radius) is not in flight as far as the picture or the
 * card goes: what is listed is what is drawn.
 */
export function cmesAt(cmes, tMs, cap = MAX_CMES) {
  const out = [];
  if (!Array.isArray(cmes)) return out;
  for (let i = cmes.length - 1; i >= 0 && out.length < cap; i--) {
    const shell = cmeShell(cmes[i], tMs);
    if (shell && shell.opacity >= CME_SEEN) out.push({ cme: cmes[i], radii: shell.radii, opacity: shell.opacity });
  }
  return out;
}

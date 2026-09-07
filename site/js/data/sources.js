// data/sources.js — every upstream the browser is allowed to call, and the cache in front of it.
//
// CONTRACT (tests/test_contract.mjs):
//   export const SOURCES
//   export async function load(id)
//   export function status()
//
// Additions beyond the contract, both documented in the build report:
//   export function onUpdate(fn)   — background revalidation is useless without a notification
//   export function forget(id)     — drop one cached copy (used by the status panel's retry)
//
// Rules this file exists to enforce:
//
//  * CelesTrak publishes GP data once every two hours and allows ONE download per file per
//    cycle. An early re-fetch answers 403 "GP data has not updated since your last successful
//    download", and fifty errors in two hours gets the client firewalled. So: a cadence with a
//    margin, ONE in-flight request per source, and a 403 recorded as `not yet updated` and
//    NEVER retried inside the cadence window. The attempt timestamp — not the success
//    timestamp — is what gates the next fetch, so a failing source cannot become a retry loop.
//  * Launch Library 2 allows 15 requests per hour per IP (measured from its own
//    /api-throttle/ endpoint). At most one call per page load, 2 h cadence.
//  * Nothing here throws. Ever. A source that cannot be reached yields ok:false and the app
//    keeps its last good copy.
//  * localStorage is absent in private mode on some browsers and throws on access in others,
//    so every read and write is wrapped and there is an in-memory mirror behind it.
//
// TIME: this module uses wall-clock Date.now() for cache bookkeeping ONLY. That is deliberate
// and is not a violation of the one-clock rule: the app's clock can be scrubbed to 2035, and
// an HTTP cache that honoured a scrubbed clock would hammer CelesTrak. Nothing in this file is
// drawn. Ages shown in the status panel are wall-clock ages, which is what they mean.

const PREFIX = 'sr.v1.';
const HOUR = 3600 * 1000;
const MINUTE = 60 * 1000;

const NO_CORS_REASON =
  'This host sends no Access-Control-Allow-Origin header, so a browser cannot read it. ' +
  'Bundled sample data stands in for it.';

/**
 * @typedef {Object} Source
 * @property {string}  id
 * @property {string}  label            short human name for the status panel
 * @property {string}  url
 * @property {number}  cadenceMs        never fetched again before this has passed
 * @property {number}  freshnessMaxMs   older than this and the app shows a stale stamp
 * @property {boolean} cors             MEASURED 2026-09-06 by fetching each host from a browser
 * @property {string}  attribution      the credit line the card must carry
 * @property {string}  kind             'json' | 'text' | 'xml'
 * @property {string}  [registryId]     the row in registry/sources.yaml this implements
 * @property {string}  [note]
 */

/** @type {Record<string, Source>} */
export const SOURCES = {
  // --- Earth orbit ------------------------------------------------------------------------
  'celestrak-stations': {
    id: 'celestrak-stations',
    registryId: 'celestrak-stations',
    label: 'CelesTrak — crewed stations',
    url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json',
    cadenceMs: 3 * HOUR,
    freshnessMaxMs: 48 * HOUR,
    cors: true,
    kind: 'json',
    attribution: 'Orbital data: CelesTrak (T. S. Kelso)',
    note: '22 objects, 9.3 kB measured 2026-09-06.',
  },
  'celestrak-active': {
    id: 'celestrak-active',
    registryId: 'celestrak-active',
    label: 'CelesTrak — everything active',
    url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json',
    // The registry says 6 h for this file and 3 h is the site-wide floor; the slower of the
    // two wins, because this is the 6.9 MB one.
    cadenceMs: 6 * HOUR,
    freshnessMaxMs: 72 * HOUR,
    cors: true,
    kind: 'json',
    attribution: 'Orbital data: CelesTrak (T. S. Kelso)',
    note: '16 511 objects, 6 907 333 bytes measured 2026-09-06. Load only when asked.',
  },
  'celestrak-starlink': {
    id: 'celestrak-starlink',
    registryId: 'celestrak-supplemental-starlink',
    label: 'CelesTrak — Starlink (operator ephemerides)',
    url: 'https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=json',
    cadenceMs: 3 * HOUR,
    freshnessMaxMs: 24 * HOUR,
    cors: true,
    kind: 'json',
    attribution: 'Orbital data: CelesTrak (T. S. Kelso)',
    note: "SpaceX's own elements, hours fresher than the tracked catalogue. 11 129 objects, 5.1 MB.",
  },
  'celestrak-visual': {
    id: 'celestrak-visual',
    label: 'CelesTrak — bright enough to see',
    url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=json',
    cadenceMs: 3 * HOUR,
    freshnessMaxMs: 48 * HOUR,
    cors: true,
    kind: 'json',
    attribution: 'Orbital data: CelesTrak (T. S. Kelso)',
    note: '157 objects, 65 kB measured 2026-09-06. The calm default: everything here is ' +
      'visible to the naked eye from a dark-enough place.',
  },
  'celestrak-last30': {
    id: 'celestrak-last30',
    label: 'CelesTrak — launched in the last 30 days',
    url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=last-30-days&FORMAT=json',
    cadenceMs: 3 * HOUR,
    freshnessMaxMs: 48 * HOUR,
    cors: true,
    kind: 'json',
    attribution: 'Orbital data: CelesTrak (T. S. Kelso)',
    note: '264 objects, 112 kB measured 2026-09-06.',
  },

  // --- Launches ---------------------------------------------------------------------------
  'll2-upcoming': {
    id: 'll2-upcoming',
    registryId: 'll2-upcoming',
    label: 'Launch Library 2 — upcoming launches',
    url: 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=30&mode=detailed',
    cadenceMs: 2 * HOUR,
    freshnessMaxMs: 12 * HOUR,
    cors: true,
    kind: 'json',
    attribution: 'Launch data by The Space Devs',
    note: '15 requests per hour per IP, measured from the API\'s own /api-throttle/ endpoint. ' +
      'At most one call per page load. 30 detailed launches, 982 kB.',
  },

  // --- Deep space (the live one) -----------------------------------------------------------
  'dsn-now': {
    id: 'dsn-now',
    registryId: 'dsn-now',
    label: 'NASA DSN Now',
    url: 'https://eyes.nasa.gov/dsn/data/dsn.xml',
    cadenceMs: 5 * MINUTE,
    freshnessMaxMs: 30 * MINUTE,
    cors: true,
    kind: 'xml',
    attribution: 'NASA Deep Space Network',
    note: 'Unofficial feed behind a public page: no SLA, and it may change shape without ' +
      'notice. A link older than 30 minutes is not drawn — it would be a lie about now.',
  },

  // --- Space weather ------------------------------------------------------------------------
  'swpc-kp': {
    id: 'swpc-kp',
    registryId: 'swpc-kp',
    label: 'NOAA SWPC — planetary K index',
    url: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json',
    cadenceMs: 15 * MINUTE,
    freshnessMaxMs: 6 * HOUR,
    cors: true,
    kind: 'json',
    attribution: 'Space weather: NOAA SWPC',
    note: '6.9 kB, 81 rows measured 2026-09-06.',
  },

  // --- Small bodies -------------------------------------------------------------------------
  'mpc-comets': {
    id: 'mpc-comets',
    registryId: 'mpc-comets',
    label: 'Minor Planet Center — comet elements',
    url: 'https://minorplanetcenter.net/iau/MPCORB/CometEls.txt',
    cadenceMs: 24 * HOUR,
    freshnessMaxMs: 168 * HOUR,
    cors: true,
    kind: 'text',
    attribution: 'Comet elements: IAU Minor Planet Center',
    note: 'Fixed width, one comet per line. 163 309 bytes, 961 comets measured 2026-09-06.',
  },

  // --- Sources a browser cannot reach -------------------------------------------------------
  // Present so the status panel can say "could not look" about them by name, which is a
  // different answer from "stale" and a very different answer from "fine". Every one of these
  // returned 200 with NO Access-Control-Allow-Origin header at all when measured.
  'jpl-sbdb-neo': {
    id: 'jpl-sbdb-neo',
    registryId: 'jpl-sbdb-neo',
    label: 'JPL Small-Body Database — near-Earth asteroids',
    url: 'https://ssd-api.jpl.nasa.gov/sbdb_query.api',
    cadenceMs: 24 * HOUR,
    freshnessMaxMs: 168 * HOUR,
    cors: false,
    kind: 'json',
    attribution: 'Orbits: NASA/JPL Small-Body Database',
    note: NO_CORS_REASON + ' See data/sample.js sampleAsteroids().',
  },
  'horizons-deep-space': {
    id: 'horizons-deep-space',
    registryId: 'horizons-deep-space',
    label: 'JPL Horizons — probe and telescope vectors',
    url: 'https://ssd.jpl.nasa.gov/api/horizons.api',
    cadenceMs: 24 * HOUR,
    freshnessMaxMs: 168 * HOUR,
    cors: false,
    kind: 'text',
    attribution: 'Ephemerides: JPL Horizons',
    note: NO_CORS_REASON + ' See data/sample.js sampleDeepSpace().',
  },
  'space-track-tip': {
    id: 'space-track-tip',
    registryId: 'space-track-tip',
    label: 'Space-Track — reentry windows',
    url: 'https://www.space-track.org/basicspacedata/query/class/tip/format/json',
    cadenceMs: 6 * HOUR,
    freshnessMaxMs: 48 * HOUR,
    cors: false,
    kind: 'json',
    attribution: 'Reentry predictions: 18 SDS via Space-Track.org',
    note: 'Needs a login, which a public page cannot hold. It is also the only public source ' +
      'of reentry windows, so v1 shows real past reentries instead of guessing at a live one. ' +
      'See data/sample.js sampleReentries().',
  },
};

// --- the cache -------------------------------------------------------------------------------

/**
 * @typedef {Object} Entry
 * @property {*}           data           last good payload, already parsed for json sources
 * @property {number|null} fetchedAt      wall ms of the last SUCCESS
 * @property {number|null} lastAttemptAt  wall ms of the last attempt, success or not
 * @property {string|null} lastError
 * @property {number|null} lastStatus     HTTP status of the last attempt
 */

/** In-memory mirror. Also the whole cache when localStorage is unavailable. @type {Map<string, Entry>} */
const memory = new Map();

/** One in-flight request per source id. @type {Map<string, Promise>} */
const inflight = new Map();

/** @type {Set<Function>} */
const listeners = new Set();

let storageWorks = null; // null = untested, then true/false

function storage() {
  if (storageWorks === false) return null;
  try {
    const s = globalThis.localStorage;
    if (!s) {
      storageWorks = false;
      return null;
    }
    if (storageWorks === null) {
      const probe = PREFIX + '__probe';
      s.setItem(probe, '1');
      s.removeItem(probe);
      storageWorks = true;
    }
    return s;
  } catch {
    storageWorks = false;
    return null;
  }
}

function readEntry(id) {
  if (memory.has(id)) return memory.get(id);
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(PREFIX + id);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const entry = {
      data: 'data' in parsed ? parsed.data : null,
      fetchedAt: numOrNull(parsed.fetchedAt),
      lastAttemptAt: numOrNull(parsed.lastAttemptAt) ?? numOrNull(parsed.fetchedAt),
      lastError: typeof parsed.lastError === 'string' ? parsed.lastError : null,
      lastStatus: numOrNull(parsed.lastStatus),
    };
    memory.set(id, entry);
    return entry;
  } catch {
    return null;
  }
}

function writeEntry(id, entry) {
  memory.set(id, entry);
  const s = storage();
  if (!s) return;
  try {
    s.setItem(PREFIX + id, JSON.stringify(entry));
  } catch {
    // Almost always a quota error. Drop the biggest other cached source and try once more,
    // then give up quietly and live off the in-memory mirror for this session.
    try {
      evictLargestExcept(s, id);
      s.setItem(PREFIX + id, JSON.stringify(entry));
    } catch {
      /* the in-memory mirror is the cache now */
    }
  }
}

function evictLargestExcept(s, keepId) {
  let victim = null;
  let victimSize = -1;
  for (let i = 0; i < s.length; i++) {
    const key = s.key(i);
    if (!key || !key.startsWith(PREFIX)) continue;
    if (key === PREFIX + keepId) continue;
    let size = 0;
    try {
      size = (s.getItem(key) || '').length;
    } catch {
      size = 0;
    }
    if (size > victimSize) {
      victim = key;
      victimSize = size;
    }
  }
  if (victim) s.removeItem(victim);
}

function numOrNull(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function wallNow() {
  return Date.now();
}

function blankEntry() {
  return { data: null, fetchedAt: null, lastAttemptAt: null, lastError: null, lastStatus: null };
}

// --- the public surface ------------------------------------------------------------------------

/**
 * Result of load(). Never rejects, never throws.
 * @typedef {Object} LoadResult
 * @property {boolean}     ok          true when `data` came from a successful fetch or a fresh cache
 * @property {*}           data        payload, or the last cached payload, or null
 * @property {number|null} fetchedAt   wall ms the payload was fetched
 * @property {boolean}     stale       payload is older than freshnessMaxMs, or there is none
 * @property {string|null} error       why the last attempt failed, in words
 * @property {boolean}     fromCache
 * @property {boolean}     revalidating a background fetch is running and onUpdate will fire
 */

/**
 * Serve the cached copy instantly; revalidate behind it when the cadence has passed.
 * @param {string} id
 * @param {{force?: boolean, await?: boolean}} [opts]
 *        force: ignore the cadence (only for a human pressing retry — never on a timer)
 *        await: wait for the revalidation instead of returning the cached copy first
 * @returns {Promise<LoadResult>}
 */
export async function load(id, opts = {}) {
  const src = SOURCES[id];
  if (!src) {
    return {
      ok: false,
      data: null,
      fetchedAt: null,
      stale: true,
      error: `No source called "${id}".`,
      fromCache: false,
      revalidating: false,
    };
  }

  const entry = readEntry(id) || blankEntry();
  const now = wallNow();

  if (!src.cors) {
    return {
      ok: false,
      data: entry.data,
      fetchedAt: entry.fetchedAt,
      stale: true,
      error: NO_CORS_REASON,
      fromCache: entry.data != null,
      revalidating: false,
    };
  }

  const sinceAttempt = entry.lastAttemptAt == null ? Infinity : now - entry.lastAttemptAt;
  const due = opts.force === true || sinceAttempt >= src.cadenceMs;

  // Cache is inside the cadence window: serve it and do not touch the network.
  if (!due) {
    return resultFrom(src, readEntry(id) || entry, now, false);
  }

  // Due, and we have something to show: hand back the cached copy now, refresh behind it.
  if (entry.data != null && opts.await !== true) {
    const p = revalidate(id);
    const out = resultFrom(src, entry, now, true);
    // Swallow: revalidate() already records failure in the entry.
    p.catch(() => {});
    return out;
  }

  await revalidate(id);
  return resultFrom(src, readEntry(id) || blankEntry(), wallNow(), false);
}

function resultFrom(src, entry, now, revalidating) {
  const has = entry.data != null;
  const age = entry.fetchedAt == null ? Infinity : now - entry.fetchedAt;
  return {
    ok: has && entry.lastError == null,
    data: entry.data,
    fetchedAt: entry.fetchedAt,
    stale: !has || age > src.freshnessMaxMs,
    error: entry.lastError,
    fromCache: has,
    revalidating,
  };
}

/**
 * One row per source, including the ones never fetched and the ones a browser cannot reach.
 * `state` is the three-way answer the status panel shows:
 *   'ok'            we have data and it is inside freshnessMaxMs
 *   'stale'         we have data and it is older than that — still drawn, stamped
 *   'could-not-look' we have nothing: never tried, tried and failed, or no CORS at all
 * @returns {Array<{id:string,label:string,fetchedAt:number|null,ageMs:number|null,stale:boolean,
 *                  error:string|null,attribution:string,live:boolean,state:string,
 *                  attempted:boolean,lastAttemptAt:number|null,cadenceMs:number,url:string}>}
 */
export function status() {
  const now = wallNow();
  return Object.values(SOURCES).map((src) => {
    const entry = readEntry(src.id) || blankEntry();
    const has = entry.data != null;
    const ageMs = entry.fetchedAt == null ? null : now - entry.fetchedAt;
    const stale = !has || ageMs > src.freshnessMaxMs;
    let state;
    if (!has) state = 'could-not-look';
    else if (stale) state = 'stale';
    else state = 'ok';
    return {
      id: src.id,
      label: src.label,
      fetchedAt: entry.fetchedAt,
      ageMs,
      stale,
      error: src.cors ? entry.lastError : NO_CORS_REASON,
      attribution: src.attribution,
      live: src.cors === true,
      state,
      attempted: entry.lastAttemptAt != null,
      lastAttemptAt: entry.lastAttemptAt,
      cadenceMs: src.cadenceMs,
      url: src.url,
    };
  });
}

/**
 * Called with (id, LoadResult) whenever a background revalidation finishes, succeed or fail.
 * Not in the module contract; without it a background refresh is invisible until the next load().
 * @param {(id: string, result: LoadResult) => void} fn
 * @returns {() => void} unsubscribe
 */
export function onUpdate(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Drop one cached copy. Not in the module contract; the status panel's retry needs it. */
export function forget(id) {
  memory.delete(id);
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(PREFIX + id);
  } catch {
    /* nothing to do */
  }
}

// --- fetching ---------------------------------------------------------------------------------

function revalidate(id) {
  const existing = inflight.get(id);
  if (existing) return existing;
  const p = doFetch(id).finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

async function doFetch(id) {
  const src = SOURCES[id];
  const prev = readEntry(id) || blankEntry();
  const attemptAt = wallNow();
  // Record the attempt BEFORE the request resolves. If the tab is closed mid-flight the next
  // load still sees an attempt and waits out the cadence, which is what keeps a flaky network
  // from turning into a retry loop against CelesTrak.
  writeEntry(id, { ...prev, lastAttemptAt: attemptAt });

  let response = null;
  let error = null;
  let httpStatus = null;
  let payload = null;

  try {
    response = await fetch(src.url, { credentials: 'omit', redirect: 'follow' });
    httpStatus = response.status;
    if (response.status === 403 && id.startsWith('celestrak-')) {
      // The documented answer to an early re-fetch. It is not a failure and it must never be
      // retried: fifty HTTP errors in two hours gets the client firewalled.
      error = 'CelesTrak has not published a new file since our last download.';
    } else if (!response.ok) {
      error = `The server answered ${response.status}.`;
    } else {
      const text = await response.text();
      if (src.kind === 'json') {
        payload = JSON.parse(text);
      } else {
        payload = text;
      }
      if (payload == null || (Array.isArray(payload) && payload.length === 0)) {
        error = 'The server answered, but with nothing in it.';
        payload = null;
      }
    }
  } catch (e) {
    error = describe(e);
  }

  const next = {
    data: payload != null ? payload : prev.data,
    fetchedAt: payload != null ? attemptAt : prev.fetchedAt,
    lastAttemptAt: attemptAt,
    lastError: payload != null ? null : error,
    lastStatus: httpStatus,
  };
  writeEntry(id, next);

  const result = resultFrom(src, next, wallNow(), false);
  for (const fn of listeners) {
    try {
      fn(id, result);
    } catch {
      /* a listener must not be able to break the data layer */
    }
  }
  return result;
}

function describe(e) {
  if (!e) return 'Something went wrong and said nothing about it.';
  const msg = String(e.message || e);
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
    return 'Could not reach the server — no network, or the browser blocked the request.';
  }
  if (/JSON/i.test(msg)) return 'The server answered with something that was not the JSON we expect.';
  return msg;
}

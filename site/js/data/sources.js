// data/sources.js — every upstream the browser is allowed to call, and the cache in front of it.
//
// CONTRACT (tests/test_contract.mjs):
//   export const SOURCES
//   export async function load(id)
//   export function status()
//
// Additions beyond the contract, all documented in the build report:
//   export function onUpdate(fn)      — background revalidation is useless without a notification
//   export function forget(id)        — drop one cached copy (used by the status panel's retry)
//   export function forgetIndex()     — drop the cached snapshot manifest, so a retry re-reads it
//   export function harvestStatus()   — what the manifest last said: generated_at and the counts
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
//  * SNAPSHOT FIRST (spec 0003 amendment 1, §3 and §4). The harvester writes /data/v1/index.json
//    and one /data/v1/<registry-id>.json per source with the upstream body VERBATIM, so the
//    parsers do not change — only the transport does. A source is read from our snapshot when
//    the manifest says one exists. When it does not (no index, no row, a refused or failed
//    harvest, an unknown schema) a `browser: true` row falls back to the direct fetch below,
//    recorded `via: 'live'`; a `browser: false` row says "could not look" and makes NO upstream
//    request. Nothing is invented, and the direct path stays: it is the safety net.
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

// Where the harvester puts its files (amendment 1 §3). Absolute on purpose: the contract is a
// path on the site's own origin, and a same-origin read needs CORS from nobody.
const SNAPSHOT_BASE = '/data/v1/';
const SNAPSHOT_INDEX_URL = SNAPSHOT_BASE + 'index.json';
const SNAPSHOT_SCHEMA = 1;
// The manifest is re-read at most this often, and only when a source is due or the page is new.
// It is the shortest cadence any source has (dsn-now, 5 min), so a due source never reads a
// manifest older than its own cadence; the HTTP cache (max-age=60) does the rest.
const INDEX_CADENCE_MS = 5 * MINUTE;
// How long a live upstream fetch may take before it is abandoned. See fetchLive().
const LIVE_TIMEOUT_MS = 20 * 1000;
// Manifest statuses under which a snapshot FILE exists to read. `not-due` is here on purpose:
// a 24 h source is due once in 48 runs and the file from the earlier run is still there.
// `refused`, `error` and `skipped` are not: §4 says a snapshot that errored is one we do not have.
const SNAPSHOT_USABLE = new Set(['ok', 'not-modified', 'not-due']);

/**
 * @typedef {Object} Source
 * @property {string}  id
 * @property {string}  label            short human name for the status panel
 * @property {string}  url
 * @property {number}  cadenceMs        never fetched again before this has passed
 * @property {number}  freshnessMaxMs   older than this and the app shows a stale stamp
 * @property {boolean} browser          MEASURED 2026-09-06, the CORS column of docs/data-sources.md:
 *                                      true when a page may read the host directly, which is what
 *                                      the app falls back to when our snapshot is missing
 * @property {string}  publisher        who to name in "read live from {publisher}"
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
    publisher: 'CelesTrak',
    url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json',
    cadenceMs: 3 * HOUR,
    freshnessMaxMs: 48 * HOUR,
    browser: true,
    kind: 'json',
    attribution: 'Orbital data: CelesTrak (T. S. Kelso)',
    note: '22 objects, 9.3 kB measured 2026-09-06.',
  },
  'celestrak-active': {
    id: 'celestrak-active',
    registryId: 'celestrak-active',
    label: 'CelesTrak — everything active',
    publisher: 'CelesTrak',
    url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json',
    // The registry says 6 h for this file and 3 h is the site-wide floor; the slower of the
    // two wins, because this is the 6.9 MB one.
    cadenceMs: 6 * HOUR,
    freshnessMaxMs: 72 * HOUR,
    browser: true,
    kind: 'json',
    attribution: 'Orbital data: CelesTrak (T. S. Kelso)',
    note: '16 511 objects, 6 907 333 bytes measured 2026-09-06. Load only when asked.',
  },
  'celestrak-starlink': {
    id: 'celestrak-starlink',
    registryId: 'celestrak-supplemental-starlink',
    label: 'CelesTrak — Starlink (operator ephemerides)',
    publisher: 'CelesTrak',
    url: 'https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=json',
    cadenceMs: 3 * HOUR,
    freshnessMaxMs: 24 * HOUR,
    browser: true,
    kind: 'json',
    attribution: 'Orbital data: CelesTrak (T. S. Kelso)',
    note: "SpaceX's own elements, hours fresher than the tracked catalogue. 11 129 objects, 5.1 MB.",
  },
  'celestrak-visual': {
    id: 'celestrak-visual',
    label: 'CelesTrak — bright enough to see',
    publisher: 'CelesTrak',
    url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=json',
    cadenceMs: 3 * HOUR,
    freshnessMaxMs: 48 * HOUR,
    browser: true,
    kind: 'json',
    attribution: 'Orbital data: CelesTrak (T. S. Kelso)',
    note: '157 objects, 65 kB measured 2026-09-06. The calm default: everything here is ' +
      'visible to the naked eye from a dark-enough place.',
  },
  'celestrak-last30': {
    id: 'celestrak-last30',
    label: 'CelesTrak — launched in the last 30 days',
    publisher: 'CelesTrak',
    url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=last-30-days&FORMAT=json',
    cadenceMs: 3 * HOUR,
    freshnessMaxMs: 48 * HOUR,
    browser: true,
    kind: 'json',
    attribution: 'Orbital data: CelesTrak (T. S. Kelso)',
    note: '264 objects, 112 kB measured 2026-09-06.',
  },

  // --- Launches ---------------------------------------------------------------------------
  'll2-upcoming': {
    id: 'll2-upcoming',
    registryId: 'll2-upcoming',
    label: 'Launch Library 2 — upcoming launches',
    publisher: 'The Space Devs',
    url: 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=30&mode=detailed',
    cadenceMs: 2 * HOUR,
    freshnessMaxMs: 12 * HOUR,
    browser: true,
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
    publisher: 'NASA',
    url: 'https://eyes.nasa.gov/dsn/data/dsn.xml',
    cadenceMs: 5 * MINUTE,
    freshnessMaxMs: 30 * MINUTE,
    browser: true,
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
    publisher: 'NOAA SWPC',
    url: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json',
    cadenceMs: 15 * MINUTE,
    freshnessMaxMs: 6 * HOUR,
    browser: true,
    kind: 'json',
    attribution: 'Space weather: NOAA SWPC',
    note: '6.9 kB, 81 rows measured 2026-09-06.',
  },

  // --- Small bodies -------------------------------------------------------------------------
  'mpc-comets': {
    id: 'mpc-comets',
    registryId: 'mpc-comets',
    label: 'Minor Planet Center — comet elements',
    publisher: 'the Minor Planet Center',
    url: 'https://minorplanetcenter.net/iau/MPCORB/CometEls.txt',
    cadenceMs: 24 * HOUR,
    freshnessMaxMs: 168 * HOUR,
    browser: true,
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
    publisher: 'NASA/JPL',
    url: 'https://ssd-api.jpl.nasa.gov/sbdb_query.api',
    cadenceMs: 24 * HOUR,
    freshnessMaxMs: 168 * HOUR,
    browser: false,
    kind: 'json',
    attribution: 'Orbits: NASA/JPL Small-Body Database',
    note: NO_CORS_REASON + ' Read from our snapshot; sampleAsteroids() stands in only when that is missing.',
  },
  'jpl-cad': {
    id: 'jpl-cad',
    registryId: 'jpl-cad',
    label: 'JPL CNEOS — close approaches',
    publisher: 'NASA/JPL',
    url: 'https://ssd-api.jpl.nasa.gov/cad.api?dist-max=10LD&date-min=now&date-max=%2B60&sort=date&diameter=true&fullname=true',
    cadenceMs: 24 * HOUR,
    freshnessMaxMs: 168 * HOUR,
    browser: false,
    kind: 'json',
    attribution: 'Close approaches: NASA/JPL CNEOS',
    // Which asteroids are "passing by" this month. Paired with jpl-sbdb-neo, which has their
    // orbits; parsers.js parseNeoApproaches joins the two.
    note: NO_CORS_REASON + ' Read from our snapshot; without it the asteroid layer shows its stand-ins.',
  },
  'horizons-deep-space': {
    id: 'horizons-deep-space',
    registryId: 'horizons-deep-space',
    label: 'JPL Horizons — probe and telescope vectors',
    publisher: 'NASA/JPL',
    url: 'https://ssd.jpl.nasa.gov/api/horizons.api',
    cadenceMs: 24 * HOUR,
    freshnessMaxMs: 168 * HOUR,
    browser: false,
    kind: 'text',
    attribution: 'Ephemerides: JPL Horizons',
    note: NO_CORS_REASON + ' See data/sample.js sampleDeepSpace().',
  },
  'space-track-tip': {
    id: 'space-track-tip',
    registryId: 'space-track-tip',
    label: 'Space-Track — reentry windows',
    publisher: 'Space-Track',
    url: 'https://www.space-track.org/basicspacedata/query/class/tip/format/json',
    cadenceMs: 6 * HOUR,
    freshnessMaxMs: 48 * HOUR,
    browser: false,
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
 * @property {string|null} via            'snapshot' | 'live': where `data` came from. null when
 *                                        there is none, or the copy predates this field
 * @property {number|null} validUntil     wall ms by which the harvester promised a fresher snapshot
 * @property {number|null} readAt         wall ms WE read the copy; fetchedAt is the upstream read
 * @property {string|null} reason         why the last attempt produced no data, as a code the
 *                                        status panel turns into words. null after a success
 * @property {string|null} snapshot       why our snapshot was not used on the last attempt, as a
 *                                        code; null when it was
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
      via: parsed.via === 'snapshot' || parsed.via === 'live' ? parsed.via : null,
      validUntil: numOrNull(parsed.validUntil),
      readAt: numOrNull(parsed.readAt),
      reason: typeof parsed.reason === 'string' ? parsed.reason : null,
      snapshot: typeof parsed.snapshot === 'string' ? parsed.snapshot : null,
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
  return {
    data: null,
    fetchedAt: null,
    lastAttemptAt: null,
    lastError: null,
    lastStatus: null,
    via: null,
    validUntil: null,
    readAt: null,
    reason: null,
    snapshot: null,
  };
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
 * @property {string|null} via         'snapshot' | 'live' | null: the provenance of `data`
 * @property {number|null} validUntil  wall ms by which the harvester promised a fresher snapshot
 * @property {number|null} readAt      wall ms we read our copy (snapshot) or the upstream (live)
 * @property {boolean}     overdue     via snapshot and validUntil has passed. Said, never hidden;
 *                                     `stale` stays the source's own ladder (freshnessMaxMs)
 * @property {string|null} reason      why there is no data, as a code. 'no-route': our snapshot
 *                                     was unavailable AND a browser cannot read the host, so
 *                                     nothing was requested. 'live-failed': the direct read failed
 * @property {string|null} snapshot    why our snapshot was not used, as a code: 'no-index',
 *                                     'not-in-index', 'refused', 'error', 'skipped', 'unreadable'
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
      via: null,
      validUntil: null,
      readAt: null,
      overdue: false,
      reason: null,
      snapshot: null,
    };
  }

  const entry = readEntry(id) || blankEntry();
  // `opts.now` exists for the contract test, which cannot wait out a five-minute gate.
  const now = Number.isFinite(opts.now) ? opts.now : wallNow();

  // Once per page, whatever the caches say: the status panel's "our snapshots" line must not
  // depend on some source happening to be due. A 4 kB file, HTTP-cached for a minute, and it
  // never rejects.
  ensureIndex().catch(() => {});

  // A row a browser cannot reach is no longer refused here: our snapshot is a route it may take,
  // and whether that route is open is decided per attempt, in doFetch. What differs is the gate.
  // An attempt that ended "could not look" touched nothing upstream, so it may look again on the
  // manifest's cadence rather than waiting out the source's; a harvester that comes back is then
  // seen within minutes, unattended.
  const sinceAttempt = entry.lastAttemptAt == null ? Infinity : now - entry.lastAttemptAt;
  const failed = entry.data == null;
  const gateMs = failed && entry.reason === 'no-route' ? INDEX_CADENCE_MS : src.cadenceMs;
  let due = opts.force === true || sinceAttempt >= gateMs;

  // A cached FAILURE is not a reason to ignore our own bucket for three hours. MEASURED
  // 2026-09-08: a page whose live fetch had timed out kept saying "could not look" although a
  // usable snapshot had appeared in the manifest minutes later -- the source's cadence gated the
  // cheap same-origin check along with the expensive upstream one. So on the manifest's cadence,
  // a failed source asks the index whether a snapshot NEWER than its last attempt exists, and
  // only then is an attempt due. doFetch reads the snapshot first, so upstream is not touched
  // unless that snapshot proves unreadable.
  if (!due && failed && sinceAttempt >= INDEX_CADENCE_MS) {
    const view = await ensureIndex();
    const rid = src.registryId || src.id;
    const row = view.data && view.data.snapshots ? view.data.snapshots[rid] : null;
    const at = row && row.fetched_at ? Date.parse(row.fetched_at) : NaN;
    if (row && SNAPSHOT_USABLE.has(row.status) && Number.isFinite(at) && at > (entry.lastAttemptAt || 0)) due = true;
  }

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
    ok: has && entry.lastError == null && entry.reason == null,
    data: entry.data,
    fetchedAt: entry.fetchedAt,
    // The stale ladder is the source's own promise (freshnessMaxMs), unchanged by where the copy
    // came from. A snapshot past its valid_until is not folded into it and not hidden either:
    // `overdue` says so on its own.
    stale: !has || age > src.freshnessMaxMs,
    error: entry.lastError,
    fromCache: has,
    revalidating,
    via: has ? entry.via : null,
    validUntil: entry.validUntil,
    readAt: entry.readAt,
    overdue: has && entry.via === 'snapshot' && entry.validUntil != null && now > entry.validUntil,
    reason: entry.reason,
    snapshot: entry.snapshot,
  };
}

/**
 * One row per source, including the ones never fetched and the ones a browser cannot reach.
 * `state` is the three-way answer the status panel shows:
 *   'ok'            we have data and it is inside freshnessMaxMs
 *   'stale'         we have data and it is older than that — still drawn, stamped
 *   'could-not-look' we have nothing: never tried, tried and failed, or no route at all
 * `via` says where a copy came from ('snapshot' | 'live' | null), `reason` and `snapshot` say, as
 * codes, why there is none and why our snapshot was not it. `browser` is the registry's measured
 * flag: whether a page may read the host directly when the snapshot is missing.
 * @returns {Array<{id:string,label:string,publisher:string,fetchedAt:number|null,ageMs:number|null,
 *                  stale:boolean,error:string|null,attribution:string,browser:boolean,state:string,
 *                  attempted:boolean,lastAttemptAt:number|null,cadenceMs:number,url:string,
 *                  via:string|null,validUntil:number|null,readAt:number|null,overdue:boolean,
 *                  reason:string|null,snapshot:string|null}>}
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
      publisher: src.publisher || src.label,
      fetchedAt: entry.fetchedAt,
      ageMs,
      stale,
      error: entry.lastError,
      attribution: src.attribution,
      browser: src.browser === true,
      state,
      attempted: entry.lastAttemptAt != null,
      lastAttemptAt: entry.lastAttemptAt,
      cadenceMs: src.cadenceMs,
      url: src.url,
      via: has ? entry.via : null,
      validUntil: entry.validUntil,
      readAt: entry.readAt,
      overdue: has && entry.via === 'snapshot' && entry.validUntil != null && now > entry.validUntil,
      reason: entry.reason,
      snapshot: entry.snapshot,
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

/** Drop the cached manifest, so the next attempt re-reads it. A retry that keeps the old manifest
 *  would keep the old answer. In memory only: the manifest is never written to localStorage,
 *  because a page that starts with yesterday's manifest would trust yesterday's files. */
export function forgetIndex() {
  indexState.data = null;
  indexState.readAt = null;
  indexState.lastAttemptAt = null;
  indexState.error = null;
  indexState.httpStatus = null;
}

/**
 * What the harvester's manifest last said, for the status panel. Reads the cache; never fetches.
 *   checked      we have tried to read the manifest this page
 *   available    a schema-1 manifest is in hand (kept across a failed re-read; the FILES decide)
 *   generatedAt  the manifest's generated_at as wall ms, and generatedAgeMs against the wall now
 *   counts       one per manifest status, plus `good` = ok + not-modified + not-due, the rows a
 *                snapshot file exists for
 * @returns {{checked:boolean, available:boolean, generatedAt:number|null, generatedAgeMs:number|null,
 *            readAt:number|null, runner:string|null, error:string|null, httpStatus:number|null,
 *            counts:{ok:number,notModified:number,notDue:number,refused:number,error:number,
 *                    skipped:number,other:number,good:number,total:number}}}
 */
/**
 * Does the harvester's manifest hold a usable snapshot for this source right now? One index
 * fetch, cached, shared with load(). main.js uses it to start snapshot-backed layers at once
 * instead of queueing them behind upstream hosts that may be slow.
 */
export async function snapshotAvailable(id) {
  const src = SOURCES[id];
  if (!src) return false;
  const view = await ensureIndex();
  const rid = src.registryId || src.id;
  const row = view.data && view.data.snapshots ? view.data.snapshots[rid] : null;
  return !!(row && SNAPSHOT_USABLE.has(row.status) && row.fetched_at);
}

export function harvestStatus() {
  const doc = indexState.data;
  const counts = {
    ok: 0, notModified: 0, notDue: 0, refused: 0, error: 0, skipped: 0, other: 0, good: 0, total: 0,
  };
  if (doc) {
    for (const row of Object.values(doc.snapshots)) {
      counts.total += 1;
      const s = row && typeof row === 'object' ? row.status : null;
      if (s === 'ok') counts.ok += 1;
      else if (s === 'not-modified') counts.notModified += 1;
      else if (s === 'not-due') counts.notDue += 1;
      else if (s === 'refused') counts.refused += 1;
      else if (s === 'error') counts.error += 1;
      else if (s === 'skipped') counts.skipped += 1;
      else counts.other += 1;
    }
    counts.good = counts.ok + counts.notModified + counts.notDue;
  }
  const generatedAt = doc ? Date.parse(doc.generated_at) : NaN;
  const hasGenerated = Number.isFinite(generatedAt);
  return {
    checked: indexState.lastAttemptAt != null,
    available: doc != null,
    generatedAt: hasGenerated ? generatedAt : null,
    generatedAgeMs: hasGenerated ? Math.max(0, wallNow() - generatedAt) : null,
    readAt: indexState.readAt,
    runner: doc && doc.run && typeof doc.run.runner === 'string' ? doc.run.runner : null,
    error: indexState.error,
    httpStatus: indexState.httpStatus,
    counts,
  };
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

  // 1. Our snapshot, when the manifest says there is one to read.
  const snap = await readSnapshot(src);
  let next;
  if (snap.ok) {
    next = {
      data: snap.body,
      // The harvester's read time, not ours: the age the panel shows is the age of the data.
      fetchedAt: snap.fetchedAt,
      lastAttemptAt: attemptAt,
      lastError: null,
      lastStatus: snap.httpStatus,
      via: 'snapshot',
      validUntil: snap.validUntil,
      readAt: attemptAt,
      reason: null,
      snapshot: null,
    };
  } else if (src.browser === true) {
    // 2. The direct fetch this file has always made. The safety net, unchanged.
    next = await fetchLive(src, prev, attemptAt);
    next.snapshot = snap.why;
  } else {
    // 3. Could not look. No snapshot and no route a browser may take, so nothing is requested and
    //    nothing is invented. A copy from an earlier snapshot is kept: it is data, merely old.
    next = {
      ...prev,
      lastAttemptAt: attemptAt,
      lastError: null,
      lastStatus: snap.httpStatus,
      reason: 'no-route',
      snapshot: snap.why,
    };
  }
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

/**
 * Today's direct upstream fetch, unchanged in what it does: one request, CelesTrak's 403 read as
 * "not yet updated", an empty answer read as no answer. Returns the next Entry; never throws.
 */
async function fetchLive(src, prev, attemptAt) {
  let error = null;
  let httpStatus = null;
  let payload = null;

  try {
    // A dead host must cost seconds, not minutes. MEASURED 2026-09-08: with CelesTrak not
    // answering, each of its files hung for 75 s before the browser gave up, and the map sat empty
    // behind them. Twenty seconds is longer than any of these sources takes when it is alive (the
    // 7 MB catalogue included, measured at 3.7 s) and short enough to move on.
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), LIVE_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(src.url, { credentials: 'omit', redirect: 'follow', signal: abort.signal });
    } finally {
      clearTimeout(timer);
    }
    httpStatus = response.status;
    if (response.status === 403 && src.id.startsWith('celestrak-')) {
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
    error = e && e.name === 'AbortError' ? `No answer within ${LIVE_TIMEOUT_MS / 1000} seconds.` : describe(e);
  }

  const got = payload != null;
  return {
    data: got ? payload : prev.data,
    fetchedAt: got ? attemptAt : prev.fetchedAt,
    lastAttemptAt: attemptAt,
    lastError: got ? null : error,
    lastStatus: httpStatus,
    via: got ? 'live' : prev.via,
    validUntil: got ? null : prev.validUntil,
    readAt: got ? attemptAt : prev.readAt,
    reason: got ? null : 'live-failed',
    snapshot: null,
  };
}

// --- the harvester's snapshots -----------------------------------------------------------------

/** The manifest, in memory for this page only. See forgetIndex() for why it is not persisted. */
const indexState = {
  data: null,
  readAt: null,
  lastAttemptAt: null,
  error: null,
  httpStatus: null,
  inflight: null,
};

function indexView() {
  return {
    ok: indexState.data != null,
    data: indexState.data,
    error: indexState.error,
    httpStatus: indexState.httpStatus,
  };
}

/** The manifest, re-read at most once per INDEX_CADENCE_MS, one request in flight. Never rejects. */
function ensureIndex() {
  if (indexState.inflight) return indexState.inflight;
  const now = wallNow();
  const since = indexState.lastAttemptAt == null ? Infinity : now - indexState.lastAttemptAt;
  if (since < INDEX_CADENCE_MS) return Promise.resolve(indexView());
  indexState.lastAttemptAt = now;
  indexState.inflight = fetchIndex().finally(() => {
    indexState.inflight = null;
  });
  return indexState.inflight;
}

async function fetchIndex() {
  let httpStatus = null;
  try {
    const response = await fetch(SNAPSHOT_INDEX_URL, { credentials: 'omit' });
    httpStatus = response.status;
    if (!response.ok) throw new Error(`The server answered ${response.status}.`);
    const doc = JSON.parse(await response.text());
    if (!doc || doc.schema !== SNAPSHOT_SCHEMA || !doc.snapshots || typeof doc.snapshots !== 'object') {
      throw new Error(`The snapshot index is not schema ${SNAPSHOT_SCHEMA}.`);
    }
    indexState.data = doc;
    indexState.readAt = wallNow();
    indexState.error = null;
  } catch (e) {
    // A failed re-read keeps the manifest we had: the files, not the manifest, decide whether a
    // snapshot is really there, and a network blip must not flip every source to live at once.
    indexState.error = describe(e);
  }
  indexState.httpStatus = httpStatus;
  return indexView();
}

/**
 * Read /data/v1/<registry-id>.json when the manifest says a file exists for it. Never throws.
 * The manifest is keyed by the REGISTRY id (`celestrak-supplemental-starlink`), which is not
 * always this module's id (`celestrak-starlink`); a source with no registry row has no snapshot.
 * @returns {Promise<{ok:boolean, body?:*, fetchedAt?:number, validUntil?:number|null,
 *                    httpStatus:number|null, why:string|null}>}
 *   why: 'no-index' | 'not-in-index' | 'refused' | 'error' | 'skipped' | 'unreadable' | null
 */
async function readSnapshot(src) {
  const rid = src.registryId || src.id;
  const index = await ensureIndex();
  if (!index.ok) return { ok: false, httpStatus: index.httpStatus, why: 'no-index' };
  const row = index.data.snapshots[rid];
  if (!row || typeof row !== 'object') return { ok: false, httpStatus: null, why: 'not-in-index' };
  if (!SNAPSHOT_USABLE.has(row.status) || !row.fetched_at) {
    const why = row.status === 'refused' || row.status === 'error' || row.status === 'skipped'
      ? row.status
      : 'unreadable';
    return { ok: false, httpStatus: null, why };
  }

  let httpStatus = null;
  try {
    const response = await fetch(SNAPSHOT_BASE + encodeURIComponent(rid) + '.json', {
      credentials: 'omit',
    });
    httpStatus = response.status;
    if (!response.ok) return { ok: false, httpStatus, why: 'unreadable' };
    const file = JSON.parse(await response.text());
    if (!file || file.schema !== SNAPSHOT_SCHEMA || file.body == null) {
      return { ok: false, httpStatus, why: 'unreadable' };
    }
    // VERBATIM pass-through (§3): parsed JSON for a JSON upstream, the text otherwise. A JSON
    // body that arrived as text is parsed here so the parser sees exactly what a live fetch gives.
    let body = file.body;
    if (src.kind === 'json' && typeof body === 'string') body = JSON.parse(body);
    if (body == null || body === '' || (Array.isArray(body) && body.length === 0)) {
      return { ok: false, httpStatus, why: 'unreadable' };
    }
    const fetchedAt = Date.parse(file.fetched_at || row.fetched_at);
    if (!Number.isFinite(fetchedAt)) return { ok: false, httpStatus, why: 'unreadable' };
    const validUntil = Date.parse(file.valid_until || row.valid_until);
    return {
      ok: true,
      body,
      fetchedAt,
      validUntil: Number.isFinite(validUntil) ? validUntil : null,
      httpStatus,
      why: null,
    };
  } catch {
    return { ok: false, httpStatus, why: 'unreadable' };
  }
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

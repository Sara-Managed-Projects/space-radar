// data/readorder.js -- the one order every feed is read in, written once so it can be tested once.
//
// Ivan, 2026-10-26: "have data cached on my s3 bucket ... the collected data should be used rather than
// original APIs; original APIs could still be used as fallback; if the lambda failed fetching we use
// previous saved data until updated. Keep caches in browser as fallback when both endpoints don't work."
//
// So, for every feed that has a saved copy (the harvester's Lambda writes /data/v1/<id>.json hourly):
//
//   1. OUR SNAPSHOT. Fresh or stale, if it can be read it is drawn AT ONCE. "Stale" is not "bad": the Lambda
//      keeps the last good copy when a publisher fails (harvest/publish.py), and its age is shown.
//   2. THE ORIGINAL API, only when the snapshot is missing, or is past its own valid_until (then behind the
//      snapshot, which stays on screen until a newer answer arrives). A feed whose publisher sends no CORS
//      header, or whose terms forbid a visitor's browser calling it (`browser: false`), has no step 2.
//   3. THE BROWSER'S OWN COPY (localStorage / Cache Storage, and the service worker's cached /data/v1/ files),
//      only when 1 and 2 both gave nothing. It is never read in preference to a newer snapshot.
//
// Pure: no fetch, no storage, no DOM. data/sources.js calls it for every registry feed; scene/auroraworker.js,
// scene/liveclouds.js and scene/weather/lightning.js call it for the three feeds that live outside sources.js.
// tests/test_read_order.mjs holds all of it.

/** The three steps, in order. A test asserts nothing reads them in another. */
export const READ_ORDER = Object.freeze(['snapshot', 'original', 'browser-cache']);

/** Where the harvester's files are, relative to the page (internal #369: never an absolute site path). */
export const SAVED_BASE = 'data/v1/';

/**
 * What to draw and what to ask, once our snapshot has been looked for.
 *
 * @param {object} s
 * @param {{validUntil: number|null}|null} s.snapshot   a readable snapshot, or null (none / unreadable / refused)
 * @param {number} s.now                                wall ms
 * @param {boolean} s.canAskOriginal                    the publisher may be asked by a visitor's browser (`browser: true`)
 * @param {boolean} [s.canAskBehind]                    ...and a stale snapshot may be refreshed from it
 *                                                      (false for a cut whose live URL is the whole feed)
 * @returns {{use: 'snapshot'|'original'|'nothing', askBehind: boolean, overdue: boolean}}
 *   use        'snapshot': draw it now. 'original': there is none, ask the publisher and draw its answer.
 *              'nothing': neither route is open; step 3 (the browser's copy) is all that is left.
 *   askBehind  with `use: 'snapshot'`: also ask the publisher, because the snapshot is past valid_until.
 *   overdue    the snapshot is past valid_until (said on screen whether or not the publisher can be asked)
 */
export function decide({ snapshot, now, canAskOriginal, canAskBehind = canAskOriginal }) {
  if (snapshot) {
    const vu = Number.isFinite(snapshot.validUntil) ? snapshot.validUntil : null;
    const overdue = vu != null && now > vu;
    return { use: 'snapshot', askBehind: Boolean(canAskBehind) && overdue, overdue };
  }
  return { use: canAskOriginal ? 'original' : 'nothing', askBehind: false, overdue: false };
}

/**
 * Step 3. What stands on screen after the first two have been tried.
 * @param {{got: boolean, hasCache: boolean}} s   `got`: steps 1 and 2 produced data
 * @returns {'fresh'|'browser-cache'|'none'}
 */
export function lastResort({ got, hasCache }) {
  if (got) return 'fresh';
  return hasCache ? 'browser-cache' : 'none';
}

/**
 * Never draw an older copy over a newer one. A browser that holds an answer from the publisher read at
 * `heldAt` must not swap it for a snapshot the harvester read before that.
 */
export function newerThanHeld(snapshotFetchedAt, heldAt) {
  if (!Number.isFinite(snapshotFetchedAt)) return false;
  return !Number.isFinite(heldAt) || snapshotFetchedAt >= heldAt;
}

/**
 * Whether the manifest names a snapshot newer than the copy a browser holds. The browser's own copy is
 * inside its cadence, which would let it skip the network; but our snapshot is the first step, so a copy the
 * harvester has replaced since is re-read (one same-origin file, no publisher is asked).
 * @param {{status?: string, fetched_at?: string}|undefined} row   the manifest's row for the feed
 * @param {number|null} heldAt                                      when the held copy was read
 * @param {Set<string>|string[]} usable                             the statuses under which a file exists
 */
export function snapshotNewerThanHeld(row, heldAt, usable) {
  if (!row || typeof row !== 'object') return false;
  const ok = usable instanceof Set ? usable.has(row.status) : Array.isArray(usable) && usable.includes(row.status);
  if (!ok) return false;
  const at = Date.parse(row.fetched_at);
  return Number.isFinite(at) && (!Number.isFinite(heldAt) || at > heldAt);
}

/** The address of a saved file, relative to `base` (a page URL; the worker is given one, not its own). */
export function savedUrl(id, base) {
  const rel = SAVED_BASE + encodeURIComponent(id) + '.json';
  if (!base) return rel;
  return new URL(rel, base).href;
}

/**
 * Read a saved copy that is not a registry feed in data/sources.js (a picture, a forecast read off the main
 * thread). Never throws. `fetchImpl` is fetch's signature.
 * @returns {Promise<{ok: true, file: object, fetchedAt: number, validUntil: number|null}|{ok: false, why: string}>}
 */
export async function readSaved(fetchImpl, url) {
  try {
    const res = await fetchImpl(url, { credentials: 'omit' });
    if (!res.ok) return { ok: false, why: 'http-' + res.status };
    const file = JSON.parse(await res.text());
    if (!file || file.schema !== 1 || file.body == null) return { ok: false, why: 'unreadable' };
    const fetchedAt = Date.parse(file.fetched_at);
    if (!Number.isFinite(fetchedAt)) return { ok: false, why: 'unreadable' };
    const vu = Date.parse(file.valid_until);
    return { ok: true, file, fetchedAt, validUntil: Number.isFinite(vu) ? vu : null };
  } catch {
    return { ok: false, why: 'unreachable' };
  }
}

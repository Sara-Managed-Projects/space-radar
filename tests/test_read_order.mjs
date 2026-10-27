// The read order, held: our snapshot first (fresh or stale, drawn at once); the original API only behind it
// when the snapshot is past its own valid_until, or when there is none; the browser's own copy last, when both
// give nothing, and never over a newer snapshot.
//   node tests/test_read_order.mjs
//
// Ivan, 2026-10-26: "have data cached on my s3 bucket ... the collected data should be used rather than original
// APIs; original APIs could still be used as fallback; if the lambda failed fetching we use previous saved data
// until updated. Keep caches in browser as fallback when both endpoints don't work."
//
// Two layers. (1) data/readorder.js, the decision itself, as a table. (2) the REAL data/sources.js against a fake
// bucket, a fake publisher and a fake localStorage, recording the order of the requests.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const R = await import(join(ROOT, 'site/js/data/readorder.js'));

// ---- 1. the decision ---------------------------------------------------------------------------------------
const NOW = 1_800_000_000_000;
const fresh = { validUntil: NOW + 3600e3 };
const stale = { validUntil: NOW - 60e3 };
check(R.READ_ORDER.join() === 'snapshot,original,browser-cache', 'the order is snapshot, original API, browser copy');
{
  const d = (snapshot, canAskOriginal, canAskBehind) => R.decide({ snapshot, now: NOW, canAskOriginal, canAskBehind });
  let r = d(fresh, true);
  check(r.use === 'snapshot' && !r.askBehind && !r.overdue, 'a fresh snapshot is used and the publisher is NOT asked');
  r = d(stale, true);
  check(r.use === 'snapshot' && r.askBehind && r.overdue, 'a stale snapshot is used at once and the publisher is asked BEHIND it');
  r = d(stale, false);
  check(r.use === 'snapshot' && !r.askBehind && r.overdue, 'a stale snapshot of a feed no browser may ask for is used, said to be overdue, nothing is asked');
  r = d(stale, true, false);
  check(r.use === 'snapshot' && !r.askBehind, 'a stale cut is not refreshed behind itself (its live URL is the whole feed)');
  r = d({ validUntil: null }, true);
  check(r.use === 'snapshot' && !r.askBehind && !r.overdue, 'a snapshot with no valid_until is not overdue');
  r = d(null, true);
  check(r.use === 'original' && !r.askBehind, 'no snapshot: the original API, and what it answers is drawn');
  r = d(null, false);
  check(r.use === 'nothing', 'no snapshot and no route a browser may take: nothing is asked, nothing is invented');
  check(R.lastResort({ got: true, hasCache: true }) === 'fresh', 'an answer beats the browser copy');
  check(R.lastResort({ got: false, hasCache: true }) === 'browser-cache', 'both gave nothing: the browser copy stands');
  check(R.lastResort({ got: false, hasCache: false }) === 'none', 'both gave nothing and no copy: nothing');
  check(R.newerThanHeld(2000, 1000) && R.newerThanHeld(1000, 1000) && !R.newerThanHeld(1000, 2000) && R.newerThanHeld(5, null) && !R.newerThanHeld(NaN, 1), 'a snapshot never replaces a copy the browser read after the harvester did');
  const usable = new Set(['ok', 'not-modified', 'not-due']);
  const row = (status, at) => ({ status, fetched_at: at });
  check(R.snapshotNewerThanHeld(row('ok', '2026-10-26T10:00:00Z'), Date.parse('2026-10-26T09:00:00Z'), usable), 'a newer manifest row than the held copy: read it');
  check(!R.snapshotNewerThanHeld(row('ok', '2026-10-26T10:00:00Z'), Date.parse('2026-10-26T10:00:00Z'), usable), 'the same moment: nothing to read');
  check(!R.snapshotNewerThanHeld(row('error', '2026-10-26T10:00:00Z'), 0, usable) && !R.snapshotNewerThanHeld(undefined, 0, usable), 'a row with no file to read, or no row, is not newer');
  check(R.savedUrl('swpc-ovation') === 'data/v1/swpc-ovation.json' && R.savedUrl('a b', 'https://x.test/app/') === 'https://x.test/app/data/v1/a%20b.json', 'saved files are addressed relative to the page, never from the site root');
}

// ---- 2. the real module, against a fake bucket and a fake publisher ---------------------------------------------
const omm = (i) => ({ OBJECT_NAME: `OBJ ${i}`, OBJECT_ID: '2020-001A', EPOCH: '2026-10-26T00:00:00', MEAN_MOTION: 15.5, ECCENTRICITY: 0.0001, INCLINATION: 51.6, NORAD_CAT_ID: 10000 + i });
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
const HOUR = 3600e3;
let run = 0;

/** One page load with a world: `bucket` (index rows + files), `publisher` (what the original API answers), `held` (a browser copy). */
async function world({ rows = {}, files = {}, publisher = 'fail', held = null, indexDown = false, id = 'celestrak-visual', registryId = id }) {
  run += 1;
  const store = new Map();
  globalThis.localStorage = {
    get length() { return store.size; }, key: (i) => [...store.keys()][i] ?? null,
    getItem: (k) => store.get(k) ?? null, removeItem: (k) => { store.delete(k); }, setItem: (k, v) => { store.set(k, String(v)); },
  };
  delete globalThis.caches;
  if (held) store.set('sr.v1.' + id, JSON.stringify({ data: held.data, fetchedAt: held.fetchedAt, lastAttemptAt: held.attemptedAt ?? 0, lastError: null, lastStatus: 200, via: held.via ?? 'live', validUntil: null, readAt: held.fetchedAt, reason: null, snapshot: null }));
  const calls = [];
  globalThis.fetch = async (url) => {
    url = String(url);
    if (url.endsWith('data/v1/index.json')) {
      calls.push('index');
      if (indexDown) return new Response('no', { status: 403 });
      return new Response(JSON.stringify({ schema: 1, generated_at: iso(Date.now()), run: {}, snapshots: rows }), { status: 200 });
    }
    if (url.includes('data/v1/')) {
      const name = decodeURIComponent(url.split('/').pop());
      calls.push('file:' + name);
      return files[name] ? new Response(JSON.stringify(files[name]), { status: 200 }) : new Response('no', { status: 404 });
    }
    calls.push('publisher');
    if (publisher === 'fail') return new Response('down', { status: 503 });
    return new Response(JSON.stringify(publisher), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const mod = await import(join(ROOT, 'site/js/data/sources.js') + `?order=${run}`);
  const updates = [];
  mod.onUpdate((i, r) => updates.push({ id: i, data: r.data, via: r.via }));
  return { mod, calls, updates, id, registryId, store };
}
const file = (id, rowsN, fetchedAt, validUntil) => ({ schema: 1, source: id, fetched_at: iso(fetchedAt), valid_until: iso(validUntil), upstream_url: 'x', content_type: 'application/json', items: rowsN, body: Array.from({ length: rowsN }, (_, i) => omm(i)) });
const row = (fetchedAt, validUntil, rowsN, status = 'ok') => ({ status, fetched_at: iso(fetchedAt), valid_until: iso(validUntil), items: rowsN, bytes: 1, duration_ms: 1, last_error: null, etag: null });
const settle = () => new Promise((r) => setTimeout(r, 30));
const N = Date.now();

// a. a fresh snapshot: the bucket answers, the publisher is never asked
{
  const w = await world({ rows: { 'celestrak-visual': row(N - HOUR, N + 2 * HOUR, 3) }, files: { 'celestrak-visual.json': file('celestrak-visual', 3, N - HOUR, N + 2 * HOUR) } });
  const r = await w.mod.load('celestrak-visual', { await: true });
  await settle();
  check(r.via === 'snapshot' && r.data.length === 3 && !r.overdue, `a fresh snapshot is drawn (${r.via}, ${r.data && r.data.length}, overdue ${r.overdue})`);
  check(!w.calls.includes('publisher'), `a fresh snapshot: the publisher is not asked (${w.calls})`);
  check(w.calls[0] === 'index' && w.calls.includes('file:celestrak-visual.json'), `the manifest is read, then the file (${w.calls})`);
}
// b. a stale snapshot: drawn at once, the publisher asked BEHIND it, its newer answer replaces it
{
  const w = await world({ rows: { 'celestrak-visual': row(N - 5 * HOUR, N - HOUR, 3) }, files: { 'celestrak-visual.json': file('celestrak-visual', 3, N - 5 * HOUR, N - HOUR) }, publisher: Array.from({ length: 5 }, (_, i) => omm(i)) });
  const r = await w.mod.load('celestrak-visual', { await: true });
  check(r.via === 'snapshot' && r.data.length === 3 && r.overdue, `a stale snapshot is drawn at once and said to be overdue (${r.via}, ${r.data && r.data.length}, overdue ${r.overdue})`);
  await settle();
  const i = w.calls.indexOf('file:celestrak-visual.json');
  const j = w.calls.indexOf('publisher');
  check(i > 0 && j > i, `the snapshot is read before the publisher is asked (${w.calls})`);
  check(w.updates.length === 2 && w.updates[0].via === 'snapshot' && w.updates[1].via === 'live' && w.updates[1].data.length === 5, `the snapshot is announced, then the publisher's newer answer replaces it and is announced (${JSON.stringify(w.updates.map((u) => [u.via, u.data && u.data.length]))})`);
}
// c. a stale snapshot and the publisher down: the snapshot stays, with no error on a source that shows data
{
  const w = await world({ rows: { 'celestrak-visual': row(N - 5 * HOUR, N - HOUR, 3) }, files: { 'celestrak-visual.json': file('celestrak-visual', 3, N - 5 * HOUR, N - HOUR) }, publisher: 'fail' });
  await w.mod.load('celestrak-visual', { await: true });
  await settle();
  const r = await w.mod.load('celestrak-visual');
  check(r.data && r.data.length === 3 && r.via === 'snapshot' && w.updates.every((u) => u.via === 'snapshot'), `the publisher failing behind a stale snapshot changes nothing (${r.via}, ${r.data && r.data.length}, updates ${JSON.stringify(w.updates.map((u) => u.via))})`);
}
// d. no snapshot (the Lambda has never run, or this source has no row): the original API
{
  const w = await world({ rows: {}, files: {}, publisher: Array.from({ length: 4 }, (_, i) => omm(i)) });
  const r = await w.mod.load('celestrak-visual', { await: true });
  check(r.via === 'live' && r.data.length === 4 && r.snapshot === 'not-in-index', `no snapshot: the original API answers (${r.via}, ${r.data && r.data.length}, ${r.snapshot})`);
  check(w.calls.indexOf('index') < w.calls.indexOf('publisher'), `the manifest is looked at before the publisher (${w.calls})`);
}
// d2. the manifest cannot be read at all: the original API, as before the Lambda existed
{
  const w = await world({ indexDown: true, publisher: Array.from({ length: 2 }, (_, i) => omm(i)) });
  const r = await w.mod.load('celestrak-visual', { await: true });
  check(r.via === 'live' && r.data.length === 2 && r.snapshot === 'no-index', `no manifest: the original API (${r.via}, ${r.snapshot})`);
}
// e. both gave nothing, a browser copy held: it stands
{
  const w = await world({ rows: {}, publisher: 'fail', held: { data: [omm(1), omm(2)], fetchedAt: N - 60 * HOUR, attemptedAt: N - 10 * HOUR } });
  const r = await w.mod.load('celestrak-visual', { await: true });
  check(r.data && r.data.length === 2 && r.stale, `both routes down: the browser's copy is what stands, marked stale (${r.data && r.data.length}, stale ${r.stale})`);
  check(w.calls.includes('index') && w.calls.includes('publisher'), `and both were tried first (${w.calls})`);
}
// e2. both gave nothing and nothing is held
{
  const w = await world({ rows: {}, publisher: 'fail' });
  const r = await w.mod.load('celestrak-visual', { await: true });
  check(r.data == null && !r.ok, 'both routes down and no copy: no data, and nothing invented');
}
// f. a feed no browser may ask for (JPL): the snapshot or nothing, and the publisher is never called
{
  const w = await world({ id: 'jpl-cad', rows: {}, files: {} });
  const r = await w.mod.load('jpl-cad', { await: true });
  check(r.data == null && r.reason === 'no-route' && !w.calls.includes('publisher'), `a browser:false feed with no snapshot makes no upstream request (${w.calls}, ${r.reason})`);
}
// g. a copy held inside its cadence, and the manifest names a NEWER snapshot: the snapshot is read, the publisher not
{
  const heldAt = N - 2 * HOUR;
  const w = await world({ rows: { 'celestrak-visual': row(N - 10 * 60e3, N + 2 * HOUR, 5) }, files: { 'celestrak-visual.json': file('celestrak-visual', 5, N - 10 * 60e3, N + 2 * HOUR) }, held: { data: [omm(1)], fetchedAt: heldAt, attemptedAt: N - 5 * 60e3, via: 'snapshot' } });
  const first = await w.mod.load('celestrak-visual');
  check(first.data.length === 1, 'the held copy is drawn at once, without waiting for the manifest');
  await settle(); await settle();
  const r = await w.mod.load('celestrak-visual');
  check(r.data.length === 5 && r.via === 'snapshot', `the newer snapshot replaced the held copy inside its cadence (${r.data && r.data.length}, ${r.via})`);
  check(!w.calls.includes('publisher'), `and no publisher was asked (${w.calls})`);
}
// g1. the same, when the manifest has already been read this page: no wait, the held copy first, the snapshot behind it
{
  const w = await world({ rows: { 'celestrak-visual': row(N - 10 * 60e3, N + 2 * HOUR, 5) }, files: { 'celestrak-visual.json': file('celestrak-visual', 5, N - 10 * 60e3, N + 2 * HOUR) }, held: { data: [omm(1)], fetchedAt: N - 2 * HOUR, attemptedAt: N - 5 * 60e3, via: 'snapshot' } });
  await w.mod.snapshotAvailable('celestrak-visual');
  const first = await w.mod.load('celestrak-visual');
  check(first.data.length === 1 && first.revalidating, 'a held copy older than the manifest is drawn at once and refreshed behind');
  await settle();
  const r = await w.mod.load('celestrak-visual');
  check(r.data.length === 5 && !w.calls.includes('publisher'), `and replaced by the snapshot, the publisher untouched (${r.data && r.data.length}, ${w.calls})`);
}
// g2. the held copy is as new as the snapshot: nothing is read but the manifest
{
  const at = N - 30 * 60e3;
  const w = await world({ rows: { 'celestrak-visual': row(at, N + 2 * HOUR, 5) }, files: { 'celestrak-visual.json': file('celestrak-visual', 5, at, N + 2 * HOUR) }, held: { data: [omm(1)], fetchedAt: at, attemptedAt: N - 5 * 60e3, via: 'snapshot' } });
  await w.mod.load('celestrak-visual'); await settle(); await settle();
  check(!w.calls.some((c) => c.startsWith('file:')) && !w.calls.includes('publisher'), `a held copy as new as the snapshot reads no file and asks no publisher (${w.calls})`);
}
// h. the browser read the publisher AFTER the harvester did; the snapshot is stale: the newer held copy is kept
{
  const w = await world({ rows: { 'celestrak-visual': row(N - 8 * HOUR, N - 5 * HOUR, 3) }, files: { 'celestrak-visual.json': file('celestrak-visual', 3, N - 8 * HOUR, N - 5 * HOUR) }, publisher: 'fail',
    held: { data: [omm(1), omm(2), omm(3), omm(4)], fetchedAt: N - 2 * HOUR, attemptedAt: N - 4 * HOUR, via: 'live' } });
  const r = await w.mod.load('celestrak-visual', { await: true });
  check(r.data.length === 4 && r.via === 'live', `an older snapshot does not replace a newer copy the browser read itself (${r.data && r.data.length}, ${r.via})`);
}

// ---- 3. the code says it too ---------------------------------------------------------------------------------
{
  const src = readFileSync(join(ROOT, 'site/js/data/sources.js'), 'utf8');
  check(/import \{[^}]*decide[^}]*\} from '\.\/readorder\.js'/.test(src), 'sources.js decides through readorder.js, not a second copy of the rules');
  check(src.indexOf('await readSnapshot(src)') < src.indexOf('await fetchLive(src, prev, attemptAt)'), 'in doFetch the snapshot is read before the publisher is called');
}

if (problems.length) { console.error('READ ORDER FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('read order ok: snapshot first (fresh or stale, drawn at once), the publisher only behind a stale one or in place of a missing one, the browser copy last and never over a newer snapshot');

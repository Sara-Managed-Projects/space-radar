// A failed read never replaces a usable copy with nothing: the hourly cache keeps the last good data (public #1304).
//   node tests/test_cache_keeps_last_good.mjs
//
// WHY. Release 1.4.0 put an hourly copy of the data on our own storage (#1289) behind a map that promises real
// positions. The read order (tests/test_read_order.mjs) holds who is asked first; it holds the case of a publisher
// that answers 503. It does not hold the other ways a read goes wrong: a request that never answers, an answer that
// is empty, and one that is cut off or is not what it should be. Each must leave the copy the browser holds as it
// was, with the time it was read, and say it is old. A map that drew nothing because the last hour's file was
// truncated would be worse than a map an hour behind.
//
// The REAL data/sources.js, a fake localStorage, a fake bucket and a fake publisher. Every case starts from the same
// copy (3 objects, read 60 hours ago, attempted 10 hours ago so a new attempt is due) and ends with it unchanged:
//   - in the browser's store, byte for byte, with its fetched_at;
//   - in what load() hands back: the same objects, the same time, stale, not ok, with the reason in words.
// The routes failed: the publisher (no snapshot row) with a timeout, an empty list, an empty text, a cut-off body,
// a page of HTML, and valid JSON of the wrong shape (a publisher's error object, a number, a string, rows without the
// fields the parser reads); and our own file (the manifest names a newer snapshot) with a refusal, a request that fails
// or never answers (the 20 s limit of a read of our own file), an empty body, a null body, a cut-off file, the wrong
// schema and a body of the wrong shape; then both at once. And wrongShape() on its own, source by source.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const HOUR = 3600e3;
const N = Date.now();
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
const omm = (i) => ({ OBJECT_NAME: `OBJ ${i}`, OBJECT_ID: '2020-001A', EPOCH: '2026-10-26T00:00:00', MEAN_MOTION: 15.5, ECCENTRICITY: 0.0001, INCLINATION: 51.6, NORAD_CAT_ID: 10000 + i });
const HELD = [omm(1), omm(2), omm(3)];
const HELD_AT = N - 60 * HOUR;
const ID = 'celestrak-visual';
const KEY = 'sr.v1.' + ID;
const row = (fetchedAt, validUntil) => ({ status: 'ok', fetched_at: iso(fetchedAt), valid_until: iso(validUntil), items: 3, bytes: 1, duration_ms: 1, last_error: null, etag: null });
const goodFile = () => ({ schema: 1, source: ID, fetched_at: iso(N - HOUR), valid_until: iso(N + 2 * HOUR), upstream_url: 'x', content_type: 'application/json', items: 5, body: Array.from({ length: 5 }, (_, i) => omm(i)) });

const realSetTimeout = globalThis.setTimeout;
let run = 0;

/**
 * One page load. `publisher` and `file` are what the two routes do: a function (url) -> Response | Promise.
 * `snapshot` puts a row in the manifest that is newer than the held copy, so our file is read before the publisher.
 */
async function load({ publisher, file = null }) {
  run += 1;
  const store = new Map();
  globalThis.localStorage = {
    get length() { return store.size; }, key: (i) => [...store.keys()][i] ?? null,
    getItem: (k) => store.get(k) ?? null, removeItem: (k) => { store.delete(k); }, setItem: (k, v) => { store.set(k, String(v)); },
  };
  delete globalThis.caches;
  store.set(KEY, JSON.stringify({ data: HELD, fetchedAt: HELD_AT, lastAttemptAt: N - 10 * HOUR, lastError: null, lastStatus: 200, via: 'live', validUntil: null, readAt: HELD_AT, reason: null, snapshot: null }));
  
  const calls = [];
  globalThis.fetch = async (url, init) => {
    url = String(url);
    if (url.endsWith('data/v1/index.json')) {
      calls.push('index');
      const snapshots = file ? { [ID]: row(N - HOUR, N + 2 * HOUR) } : {};
      return new Response(JSON.stringify({ schema: 1, generated_at: iso(N), run: {}, snapshots }), { status: 200 });
    }
    if (url.includes('data/v1/')) { calls.push('file'); return file(url, init); }
    calls.push('publisher');
    return publisher(url, init);
  };
  // The publisher's 20 s limit (LIVE_TIMEOUT_MS) in 5 ms: the module's own timer and abort, not a stand-in for them.
  globalThis.setTimeout = (fn, ms, ...a) => realSetTimeout(fn, ms >= 20000 ? 5 : ms, ...a);
  let mod;
  let result;
  try {
    mod = await import(join(ROOT, 'site/js/data/sources.js') + `?kept=${run}`);
    result = await mod.load(ID, { await: true });
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }
  const after = store.get(KEY);
  return { result, after, stored: after ? JSON.parse(after) : null, calls };
}

const text = (body, status = 200) => () => new Response(body, { status });
// a request that never answers until its abort signal fires, as a dead host does (both the publisher's and a read of our
// own file are aborted by the module's own 20 s timer, shortened below)
const hangs = (_url, init) => new Promise((_, reject) => {
  const sig = init && init.signal;
  if (sig) sig.addEventListener('abort', () => reject(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' })));
});
const refuses = () => { throw new TypeError('Failed to fetch'); };
const fileWith = (patch) => () => new Response(JSON.stringify({ ...goodFile(), ...patch }), { status: 200 });

const cases = [
  // the original publisher, with no snapshot to read first
  ['publisher: never answers (timeout)', { publisher: hangs }, /No answer within 20 seconds/],
  ['publisher: an empty list', { publisher: text('[]') }, /nothing in it/],
  ['publisher: an empty body', { publisher: text('') }, null],
  ['publisher: a body cut off in the middle', { publisher: text('[{"OBJECT_NAME":"OBJ 1","OBJECT_ID":"20') }, null],
  ['publisher: a page of HTML', { publisher: text('<html><body>Service unavailable</body></html>') }, null],
  ['publisher: null', { publisher: text('null') }, /nothing in it/],
  ['publisher: valid JSON, an error object where a list belongs', { publisher: text('{"error":"rate limited","retry_after":3600}') }, /object where a list belongs/],
  ['publisher: valid JSON, a number', { publisher: text('42') }, /not with data: number/],
  ['publisher: valid JSON, a string', { publisher: text('"ok"') }, /not with data: string/],
  ['publisher: valid JSON, rows without the fields the parser reads', { publisher: text('[{"status":"maintenance"}]') }, /lack EPOCH, NORAD_CAT_ID/],
  // our own saved file, the manifest naming a snapshot newer than the copy held; the publisher is down behind it
  ['snapshot: the file is refused (404)', { file: text('no', 404), publisher: text('down', 503) }, null],
  ['snapshot: the request fails', { file: refuses, publisher: text('down', 503) }, null],
  ['snapshot: the request never answers', { file: hangs, publisher: text('down', 503) }, null],
  ['snapshot: an empty body list', { file: fileWith({ body: [] }), publisher: text('down', 503) }, null],
  ['snapshot: a null body', { file: fileWith({ body: null }), publisher: text('down', 503) }, null],
  ['snapshot: a file cut off in the middle', { file: text('{"schema":1,"source":"celestrak-visual","fetched_at":"2026-1'), publisher: text('down', 503) }, null],
  ['snapshot: the wrong schema', { file: fileWith({ schema: 99 }), publisher: text('down', 503) }, null],
  ['snapshot: a body that is an error object', { file: fileWith({ body: { error: 'rate limited' } }), publisher: text('down', 503) }, null],
  ['snapshot: a body of rows without the fields the parser reads', { file: fileWith({ body: [{ status: 'maintenance' }] }), publisher: text('down', 503) }, null],
  ['snapshot: a time that is not a time', { file: fileWith({ fetched_at: 'sometime', valid_until: 'later' }), publisher: text('down', 503) }, null],
  // both routes bad at once
  ['both: an empty snapshot and an empty publisher', { file: fileWith({ body: [] }), publisher: text('[]') }, /nothing in it/],
];

for (const [name, world, wantError] of cases) verify(name, await load(world), wantError);

function verify(name, got, wantError) {
  const { result: r, after, stored } = got;
  // The attempt is written down (lastAttemptAt, lastError: that is what keeps a failing source from becoming a retry loop); the copy is not touched.
  check(stored && JSON.stringify(stored.data) === JSON.stringify(HELD) && stored.fetchedAt === HELD_AT && stored.readAt === HELD_AT && stored.via === 'live',
    `${name}: the stored copy no longer holds the 3 objects it was read with, at its own time (${after && after.slice(0, 120)})`);
  check(stored && stored.lastAttemptAt > N - HOUR, `${name}: the attempt was not written down, so a failing source could retry on every load`);
  check(r.data && JSON.stringify(r.data) === JSON.stringify(HELD), `${name}: load() did not hand back the copy held (${r.data && r.data.length})`);
  check(r.fetchedAt === HELD_AT, `${name}: the time moved from the copy's own (${r.fetchedAt} for ${HELD_AT}): it would pass for new`);
  check(r.stale === true && r.ok === false, `${name}: the copy held is not marked stale and not ok (stale ${r.stale}, ok ${r.ok})`);
  check(typeof r.error === 'string' && r.error.length > 0, `${name}: no reason is given in words (${r.error})`);
  if (wantError instanceof RegExp) check(wantError.test(r.error || ''), `${name}: the reason is "${r.error}"`);
}

// wrongShape(): what each kind of source must be, and what it lets through
{
  const { wrongShape, SOURCES } = await import(join(ROOT, 'site/js/data/sources.js') + '?shape');
  const omm1 = [omm(1)];
  for (const id of Object.keys(SOURCES).filter((i) => i.startsWith('celestrak-') && SOURCES[i].kind === 'json')) {
    check(wrongShape(SOURCES[id], omm1) === null, `${id}: a list of elements passes`);
    check(wrongShape(SOURCES[id], { error: 'x' }) !== null && wrongShape(SOURCES[id], [{}]) !== null, `${id}: an object, and rows without the fields, do not`);
  }
  const need = { 'll2-upcoming': 'results', 'll2-previous': 'results', 'll2-stations': 'results', 'll2-astronauts': 'results', 'open-notify-astros': 'people', 'gdacs-tc': 'features', 'eonet-fires': 'events', 'eonet-volcanoes-ice': 'events' };
  for (const [id, key] of Object.entries(need)) {
    check(wrongShape(SOURCES[id], { [key]: [] }) === null, `${id}: an object with its ${key} list passes`);
    check(wrongShape(SOURCES[id], { [key]: 'x' }) !== null && wrongShape(SOURCES[id], [1]) !== null, `${id}: a ${key} that is not a list, and a bare list, do not`);
  }
  for (const id of ['jpl-cad', 'jpl-sbdb-neo', 'jpl-sbdb-comets']) {
    check(wrongShape(SOURCES[id], { fields: ['a'], data: [[1]] }) === null && wrongShape(SOURCES[id], { fields: ['a'] }) !== null, `${id}: a table needs its fields and its data`);
  }
  check(wrongShape(SOURCES['swpc-kp'], [['time_tag', 'kp'], ['2026-11-04', '3']]) === null && wrongShape(SOURCES['swpc-kp'], { error: 'x' }) !== null, 'swpc-kp: a list passes, an object does not');
  check(wrongShape(SOURCES['swpc-solar-regions'], 7) !== null && wrongShape(SOURCES['swpc-solar-regions'], [{ x: 1 }]) === null, 'a json source with no shape of its own still needs an object or a list');
  check(wrongShape(SOURCES['celestrak-satcat'], '') !== null && wrongShape(SOURCES['celestrak-satcat'], 'a,b\n1,2') === null, 'a text source needs some text');
}

if (problems.length) { console.error('CACHE KEEPS LAST GOOD FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`cache keeps last good ok: ${cases.length} ways a read goes wrong (no answer, empty, cut off, not data, data of the wrong shape), each leaving the copy held as it was, at its own time, marked old with a reason`);

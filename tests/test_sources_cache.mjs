// A reload inside CelesTrak's two hours must not lose what the first visit loaded.
//   node tests/test_sources_cache.mjs
//
// WHY. The browser fetches CelesTrak directly (no harvester is provisioned), and CelesTrak allows
// ONE download per file per IP per two hours; a second request inside that window gets a 403 with
// "GP data has not updated since your last successful download" and no data. So a reload lives or
// dies on the cache.
//
// The cache was localStorage, which Chrome caps at 5 241 856 characters for the whole origin
// (measured 2026-09-18). Two feeds are bigger than that on their own -- `active` at 6.98 M and the
// Starlink supplemental at 5.07 M. Writing `active` failed, the fallback evicted the largest OTHER
// cached source to make room, and the write failed again. Measured with the real module and those
// sizes: after one visit `visual` -- the 156 things bright enough to see -- had been evicted, and a
// reload came back with `visual` and `active` (which feeds "Satellites worth knowing") EMPTY.
//
// Now a payload over LOCAL_MAX_CHARS goes to Cache Storage behind a small localStorage stub, and a
// big write can no longer evict anyone. This runs two page loads against the REAL data/sources.js,
// with a storage mock holding exactly Chrome's quota and a fetch that serves feeds of the real
// sizes on the first visit and CelesTrak's 403 on the second.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const QUOTA = 5242880;
const SIZE = { 'GROUP=stations': 9736, 'GROUP=visual': 65221, 'GROUP=active': 6982508, 'FILE=starlink': 5073286, 'GROUP=last-30-days': 112000 };
const IDS = ['celestrak-stations', 'celestrak-visual', 'celestrak-active', 'celestrak-starlink', 'celestrak-last30'];
const omm = (i) => ({ OBJECT_NAME: `OBJ ${i}`, OBJECT_ID: '2020-001A', EPOCH: '2026-09-18T00:00:00', MEAN_MOTION: 15.5, ECCENTRICITY: 0.0001, INCLINATION: 51.6, RA_OF_ASC_NODE: 1, ARG_OF_PERICENTER: 1, MEAN_ANOMALY: 1, EPHEMERIS_TYPE: 0, CLASSIFICATION_TYPE: 'U', NORAD_CAT_ID: 10000 + i, ELEMENT_SET_NO: 999, REV_AT_EPOCH: 1, BSTAR: 0.0001, MEAN_MOTION_DOT: 0, MEAN_MOTION_DDOT: 0 });
const oneLen = JSON.stringify(omm(0)).length + 1;
const bodies = Object.fromEntries(Object.entries(SIZE).map(([k, n]) => [k, JSON.stringify(Array.from({ length: Math.round(n / oneLen) }, (_, i) => omm(i)))]));

let run = 0;
async function twoVisits({ withCaches }) {
  run += 1;
  const store = new Map();
  const used = () => [...store].reduce((n, [k, v]) => n + k.length + v.length, 0);
  let peak = 0;
  globalThis.localStorage = {
    get length() { return store.size; },
    key: (i) => [...store.keys()][i] ?? null,
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    removeItem: (k) => { store.delete(k); },
    setItem: (k, v) => {
      const before = store.get(k);
      store.set(k, String(v));
      if (used() > QUOTA) {
        if (before === undefined) store.delete(k); else store.set(k, before);
        const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e;
      }
      peak = Math.max(peak, used());
    },
  };
  const bulk = new Map();
  if (withCaches) {
    globalThis.caches = { open: async () => ({
      put: async (k, r) => { bulk.set(String(k), await r.text()); },
      match: async (k) => (bulk.has(String(k)) ? new Response(bulk.get(String(k))) : undefined),
      delete: async (k) => bulk.delete(String(k)),
    }) };
  } else {
    delete globalThis.caches;
  }
  let visit = 1;
  const upstream = { 1: 0, 2: 0 };
  globalThis.fetch = async (url) => {
    url = String(url);
    if (url.includes('/data/v1/')) return new Response('forbidden', { status: 403 }); // no harvester
    const key = Object.keys(SIZE).find((k) => url.includes(k));
    if (!key) return new Response('{}', { status: 404 });
    upstream[visit] += 1;
    if (visit === 1) return new Response(bodies[key], { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response('GP data has not updated since your last successful download', { status: 403 });
  };
  const load = async (n) => {
    const mod = await import(join(ROOT, 'site/js/data/sources.js') + `?run=${run}&visit=${n}`); // fresh in-memory mirror
    const out = {};
    for (const id of IDS) {
      const r = await mod.load(id, { await: true });
      out[id] = Array.isArray(r.data) ? r.data.length : 0;
    }
    return out;
  };
  const first = await load(1);
  await new Promise((r) => setTimeout(r, 20)); // the bulk puts are fire-and-forget
  visit = 2;
  const second = await load(2);
  return { first, second, upstream, peak, bulkKeys: [...bulk.keys()].map((k) => decodeURIComponent(k.split('/').pop())) };
}

{
  const r = await twoVisits({ withCaches: true });
  for (const id of IDS) {
    check(r.first[id] > 0, `visit 1 should load ${id}`);
    check(r.second[id] === r.first[id], `a reload inside two hours lost ${id}: ${r.first[id]} records, then ${r.second[id]}`);
  }
  check(r.bulkKeys.includes('celestrak-active') && r.bulkKeys.includes('celestrak-starlink'), `the two big feeds belong in Cache Storage: ${r.bulkKeys.join(', ')}`);
  check(r.peak <= QUOTA, `localStorage went over its quota (${r.peak})`);
  // Inside the cadence the second visit must not ask CelesTrak for anything: every one of those
  // requests would be a 403, and fifty of them in two hours gets the client firewalled.
  check(r.upstream[2] === 0, `a reload inside two hours made ${r.upstream[2]} CelesTrak request(s); it should make none`);
  if (!problems.length) console.log(`  with Cache Storage: all ${IDS.length} feeds survive a reload, localStorage peaks at ${(r.peak / 1e6).toFixed(2)} M of ${(QUOTA / 1e6).toFixed(2)} M, and the reload asks CelesTrak for nothing`);
}
{
  // Where Cache Storage does not exist, the two big feeds cannot be kept -- but nobody else may be
  // evicted trying, and the stubs must still gate the next fetch.
  const r = await twoVisits({ withCaches: false });
  for (const id of ['celestrak-stations', 'celestrak-visual', 'celestrak-last30']) {
    check(r.second[id] === r.first[id], `without Cache Storage, ${id} must still survive a reload: ${r.first[id]} then ${r.second[id]}`);
  }
  check(r.upstream[2] === 0, `without Cache Storage a reload still made ${r.upstream[2]} CelesTrak request(s)`);
  if (!problems.length) console.log('  without Cache Storage: the small feeds survive, nothing is evicted for the big ones, and the gate still holds');
}

// AN EMPTY SOURCE LOOKS AGAIN SOON; A GOOD COPY IS LEFT ALONE.
//
// A source's cadence is how long a GOOD copy may stand: three hours for most CelesTrak groups, six
// for `active`. Applying it to a source with NO data meant a visitor who arrived while CelesTrak's
// two-hour window was closed for their address saw an empty layer and the app refused to look again
// for three hours -- long after the window reopened. Ivan, 2026-09-20: "keep it until next success
// retrieval - if failed - we take cached one ... so it will help us always have all objects online."
{
  const MIN = 60 * 1000;
  const store = new Map();
  globalThis.localStorage = {
    get length() { return store.size; }, key: (i) => [...store.keys()][i] ?? null,
    getItem: (k) => store.get(k) ?? null, removeItem: (k) => { store.delete(k); },
    setItem: (k, v) => { store.set(k, String(v)); },
  };
  delete globalThis.caches;
  let mode = 'fail';
  let upstream = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes('/data/v1/')) return new Response('no', { status: 403 });
    upstream += 1;
    if (mode === 'fail') return new Response('GP data has not updated since your last successful download', { status: 403 });
    return new Response(JSON.stringify([omm(1), omm(2)]), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const mod = await import(join(ROOT, 'site/js/data/sources.js') + '?retry=1');
  const id = 'celestrak-stations';                       // cadence: three hours
  // Attempts are stamped with the real wall clock (the module says so: bookkeeping never reads
  // the app's scrubbable clock), so the synthetic `now` has to start from the real one.
  const t = Date.now();
  const at = async (minutes) => { const before = upstream; await mod.load(id, { await: true, now: t + minutes * MIN }); return upstream - before; };

  // Every attempt is stamped with the real clock, which barely moves during a test, so `at(n)` is
  // n minutes after the FIRST attempt rather than after the previous one. The waits below are the
  // backoff measured from that fixed point: 15, then 30, then 60.
  check((await at(0)) === 1, 'the first visit asks upstream');
  check((await at(5)) === 0, 'five minutes later, with nothing to show, it does NOT ask again');
  check((await at(16)) === 1, 'at sixteen minutes it tries again rather than waiting out the three-hour cadence');
  check((await at(20)) === 0, 'after a second failure the wait has doubled to thirty minutes');
  check((await at(36)) === 1, 'and at thirty-six minutes it tries a third time');
  check((await at(50)) === 0, 'after a third failure the wait is an hour');
  // A success: the source's own cadence applies again, and the copy is kept.
  mode = 'ok';
  check((await at(70)) === 1, 'at seventy minutes it tries again and lands a copy');
  const got = await mod.load(id, { await: true, now: t + 71 * MIN });
  check(got.data != null && got.data.length === 2, `the copy is held: ${got.data && got.data.length} records`);
  check((await at(100)) === 0, 'with a good copy the three-hour cadence applies again -- not every fifteen minutes');
  // And a later failure must not blank it.
  mode = 'fail';
  check((await at(200)) === 1, 'after three hours it revalidates');
  const after = await mod.load(id, { await: true, now: t + 201 * MIN });
  check(after.data != null && after.data.length === 2, 'a failed revalidation keeps the last good copy');
  if (!problems.length) console.log('  an empty source retries at 15 minutes and backs off; a good copy stands for the source cadence and survives a failure');
}

// A SAVED COPY, THEN LIVE (2026-09-22). Snapshots were uploaded once from a laptop; snapshot-first
// used to mean snapshot-only, so the map would have frozen at the upload. Past its valid_until a
// snapshot is drawn at once and the publisher is asked behind it; a newer answer replaces it.
async function savedCopy({ validMinutes, liveOk }) {
  const store = new Map();
  globalThis.localStorage = {
    get length() { return store.size; }, key: (i) => [...store.keys()][i] ?? null,
    getItem: (k) => store.get(k) ?? null, removeItem: (k) => { store.delete(k); },
    setItem: (k, v) => { store.set(k, String(v)); },
  };
  delete globalThis.caches;
  const fetched = new Date(Date.now() - 3 * 3600e3).toISOString();
  const valid = new Date(Date.now() + validMinutes * 60e3).toISOString();
  let upstream = 0;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.endsWith('/data/v1/index.json')) {
      return new Response(JSON.stringify({ schema: 1, snapshots: { 'celestrak-stations': { status: 'ok', fetched_at: fetched, valid_until: valid } } }), { status: 200 });
    }
    if (u.includes('/data/v1/')) {
      return new Response(JSON.stringify({ schema: 1, source: 'celestrak-stations', fetched_at: fetched, valid_until: valid, body: [omm(1)] }), { status: 200 });
    }
    upstream += 1;
    if (!liveOk) return new Response('GP data has not updated since your last successful download', { status: 403 });
    return new Response(JSON.stringify([omm(1), omm(2), omm(3)]), { status: 200 });
  };
  const mod = await import(join(ROOT, 'site/js/data/sources.js') + `?saved=${validMinutes}-${liveOk}`);
  const updates = [];
  mod.onUpdate((id, r) => updates.push({ id, n: r.data ? r.data.length : 0, via: r.via }));
  const first = await mod.load('celestrak-stations', { await: true });
  await new Promise((r) => setTimeout(r, 20));
  return { first, updates, upstream };
}
{
  const stale = await savedCopy({ validMinutes: -60, liveOk: true });
  check(stale.first.data && stale.first.data.length === 1, `an out-of-date saved copy is handed back at once (${stale.first.data && stale.first.data.length} record)`);
  check(stale.upstream === 1, `and the publisher is asked behind it (${stale.upstream} request)`);
  const live = stale.updates.find((u) => u.n === 3);
  check(!!live && live.via === 'live', `the newer live answer replaces it and is announced (${JSON.stringify(stale.updates)})`);
  const refused = await savedCopy({ validMinutes: -60, liveOk: false });
  check(refused.upstream === 1 && !refused.updates.some((u) => u.n !== 1), 'a refusal leaves the saved copy exactly as it was');
  const fresh = await savedCopy({ validMinutes: 60, liveOk: true });
  check(fresh.upstream === 0 && fresh.first.data.length === 1, 'a snapshot still inside its valid_until is the answer, and nothing is asked upstream');
  if (!problems.length) console.log('  an out-of-date snapshot is drawn at once and replaced by a newer live answer; an in-date one is left alone');
}

if (problems.length) {
  console.log(`sources cache: ${problems.length} problem(s)`);
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
console.log('sources cache ok: a reload inside CelesTrak\'s two-hour window keeps what the first visit loaded');

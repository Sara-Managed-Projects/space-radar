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

if (problems.length) {
  console.log(`sources cache: ${problems.length} problem(s)`);
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
console.log('sources cache ok: a reload inside CelesTrak\'s two-hour window keeps what the first visit loaded');

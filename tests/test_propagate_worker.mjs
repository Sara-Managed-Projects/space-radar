// tests/test_propagate_worker.mjs -- SGP4 in a worker gives the page's own numbers (spec 0049 task 1,
// public #285).
//
//   1. THE SAME BITS. 1 000 element sets (low orbits, a geostationary ring, Molniya-like twelve-hour
//      orbits, a decayed one, one too old to draw) go to propagate/worker.js running in a REAL worker
//      thread, as structured clones, and come back as a transferred Float64Array for seven instants
//      asked out of order. Every number is compared with the in-thread propagate() by Object.is.
//   2. THE POOL: one question in flight, the newest instant wins, a reused buffer, the one-tick
//      lead while the clock is steady and none across a jump, records replaced mid-flight.
//   3. THE FALLBACK: no Worker, a Worker that throws on construction, and one that errors later all
//      leave `ok` false and `latest` null, which is what sends scene/glyphs.js back to its own loop.
//   4. LAZY, AND WIRED: neither file is in the boot graph; glyphs.js and main.js name the pool the
//      way this test expects; main.js's threshold is pool.js's.
import assert from 'node:assert/strict';
import { Worker as NodeWorker } from 'node:worker_threads';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site', 'js');
const satellite = await import(pathToFileURL(join(ROOT, 'site', 'vendor', 'satellite.esm.js')).href);
const { propagate } = await import(pathToFileURL(join(JS, 'propagate', 'index.js')).href);
const { propagateBatch, slim, createHandler } = await import(pathToFileURL(join(JS, 'propagate', 'worker.js')).href);
const { createPropagationPool, poolable, POOL_MIN_RECORDS } = await import(pathToFileURL(join(JS, 'propagate', 'pool.js')).href);

// --- the fixture: 1 000 objects, seeded ------------------------------------------------------------
const T0 = Date.UTC(2026, 9, 8, 12, 0, 0);
let seed = 20261008;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
function omm(i, o) {
  return {
    OBJECT_NAME: `FIXTURE ${i}`, OBJECT_ID: '2020-001A', NORAD_CAT_ID: 40000 + i,
    EPOCH: new Date(T0 - (o.ageDays ?? rnd() * 3) * 86400e3).toISOString().slice(0, -1),
    MEAN_MOTION: o.mm, ECCENTRICITY: o.ecc, INCLINATION: o.incl,
    RA_OF_ASC_NODE: rnd() * 360, ARG_OF_PERICENTER: o.argp ?? rnd() * 360, MEAN_ANOMALY: rnd() * 360,
    EPHEMERIS_TYPE: 0, CLASSIFICATION_TYPE: 'U', ELEMENT_SET_NO: 999, REV_AT_EPOCH: 100,
    BSTAR: o.bstar ?? 1e-4 * rnd(), MEAN_MOTION_DOT: 1e-5, MEAN_MOTION_DDOT: 0,
  };
}
const records = [];
for (let i = 0; i < 1000; i++) {
  let o;
  if (i === 998) o = { mm: 16.4, ecc: 0.0005, incl: 51.6, bstar: 0.05, ageDays: 20 };  // decaying fast: SGP4 gives up or goes under 6 300 km
  else if (i === 999) o = { mm: 15.5, ecc: 0.001, incl: 51.6, ageDays: 45 };            // older than MAX_AGE_MS: not drawn
  else if (i % 10 === 0) o = { mm: 1.0027 + (rnd() - 0.5) * 0.002, ecc: rnd() * 0.001, incl: rnd() * 3 }; // the geostationary ring (deep space, resonant)
  else if (i % 25 === 1) o = { mm: 2.0056 + (rnd() - 0.5) * 0.002, ecc: 0.6 + rnd() * 0.12, incl: 63.4, argp: 270 }; // Molniya-like (deep space, resonant)
  else if (i % 25 === 2) o = { mm: 2.0056, ecc: rnd() * 0.01, incl: 55 };                  // navigation height
  else o = { mm: 11 + rnd() * 5, ecc: rnd() * 0.003, incl: 30 + rnd() * 70 };              // low orbits
  const row = omm(i, o);
  const satrec = satellite.json2satrec(row);
  const rec = { id: `sat-${40000 + i}`, propagator: 'sgp4', frame: 'earth-inertial', cls: 'measured', satrec };
  // Three shapes of record: a satrec with its epoch, a satrec without, and the raw OMM row.
  if (i % 3 === 0) rec.epoch = Date.parse(row.EPOCH + 'Z');
  if (i % 3 === 2) { delete rec.satrec; rec.omm = row; }
  records.push(rec);
}
// One record that is not SGP4's: the worker must leave it alone and say so in the mask.
records.push({ id: 'moon', propagator: 'body', frame: 'earth-inertial' });
const N = records.length;
assert.equal(poolable(records), 1000, 'the 1 000 SGP4 records are poolable and the Moon is not');

// Asked out of order on purpose: the deep-space integrator keeps state between calls, and the
// worker's copy of an element set will have been asked a different history from the page's.
const INSTANTS = [T0, T0 + 100, T0 + 6 * 3600e3, T0 - 2 * 86400e3, T0 + 10 * 86400e3, T0 + 37.5e3, T0 - 20 * 86400e3];

// --- 1. a real worker thread ------------------------------------------------------------------
// worker.js is written for a browser's worker scope (`self`); this shim is that scope in node.
const workerUrl = pathToFileURL(join(JS, 'propagate', 'worker.js')).href;
const SHIM = `
  import { parentPort } from 'node:worker_threads';
  globalThis.self = globalThis;
  globalThis.postMessage = (message, transfer) => parentPort.postMessage(message, transfer);
  await import(${JSON.stringify(workerUrl)});
  parentPort.on('message', (data) => globalThis.onmessage({ data }));
  parentPort.postMessage({ type: 'up' });
`;
function nodeWorker() {
  const w = new NodeWorker(new URL(`data:text/javascript,${encodeURIComponent(SHIM)}`));
  const shaped = {
    onmessage: null, onerror: null, onmessageerror: null, sent: 0, transferred: 0,
    postMessage(message, transfer) { shaped.sent++; if (transfer && transfer.length) shaped.transferred++; w.postMessage(message, transfer); },
    terminate() { return w.terminate(); },
  };
  shaped.up = new Promise((resolve) => {
    w.on('message', (data) => { if (data && data.type === 'up') resolve(); else if (shaped.onmessage) shaped.onmessage({ data }); });
  });
  w.on('error', (err) => { if (shaped.onerror) shaped.onerror({ message: String(err) }); });
  return shaped;
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
async function answerFor(pool, t) {
  for (let i = 0; i < 4000; i++) { const l = pool.latest; if (l && l.tMs === t) return l; await tick(); }
  throw new Error(`no answer for ${t}`);
}

let real = null;
const pool = createPropagationPool({ makeWorker: () => (real = nodeWorker()) });
assert.equal(pool.ok, true);
await real.up;
pool.setRecords(records);
assert.equal(pool.mask.length, N);
assert.equal(pool.mask[0], 1);
assert.equal(pool.mask[N - 1], 0, 'the Moon is the page\'s to propagate');

let compared = 0;
let drawn = 0;
let silent = 0;
for (const t of INSTANTS) {
  pool.request(t);           // a jump every time: no lead
  const { pos } = await answerFor(pool, t);
  assert.ok(pos instanceof Float64Array && pos.length === N * 3);
  for (let i = 0; i < 1000; i++) {
    // A second, untouched copy of the record for the in-thread side would hide a history effect;
    // this is the page's own record, asked in the page's own order.
    const p = propagate(records[i], t);
    const o = i * 3;
    if (!p) {
      assert.ok(Number.isNaN(pos[o]) && Number.isNaN(pos[o + 1]) && Number.isNaN(pos[o + 2]), `record ${i} at ${t}: the page has no answer and the worker has one`);
      silent++;
      continue;
    }
    assert.ok(Object.is(pos[o], p.x) && Object.is(pos[o + 1], p.y) && Object.is(pos[o + 2], p.z),
      `record ${i} at ${t}: worker (${pos[o]}, ${pos[o + 1]}, ${pos[o + 2]}) is not the page's (${p.x}, ${p.y}, ${p.z})`);
    assert.equal(p.frame, 'earth-inertial');
    drawn++;
    compared += 3;
  }
  assert.ok(Number.isNaN(pos[(N - 1) * 3]), 'a record that is not SGP4\'s is NaN in the worker\'s answer');
}
assert.ok(drawn > 6500, `most of the fixture is drawn at most instants (${drawn})`);
assert.ok(silent >= 7, `the too-old record is silent at every instant, in both (${silent})`);
// In-thread, in a different order again: the same call on the page side is history-free too.
{
  const again = propagateBatch(records.map(slim), INSTANTS[2]);
  pool.request(INSTANTS[2]);
  const { pos } = await answerFor(pool, INSTANTS[2]);
  for (let i = 0; i < N * 3; i++) assert.ok(Object.is(again[i], pos[i]), `propagateBatch in the page and in the worker differ at ${i}`);
}
assert.ok(real.transferred >= 1, 'a spent buffer goes back to the worker to be written again');
const s = pool.stats;
assert.ok(s.ticks >= INSTANTS.length && s.records === N && s.failed === null);

// --- 2. the pool's manners, on a worker this test drives by hand -----------------------------------
{
  const asked = [];
  let handler = null;
  const fake = {
    onmessage: null, onerror: null,
    postMessage(message) { asked.push(message); },
    terminate() { fake.dead = true; },
  };
  handler = createHandler((message) => fake.out.push(message));
  fake.out = [];
  const answer = () => { const m = asked.shift(); handler({ data: m }); const out = fake.out.shift(); if (out) fake.onmessage({ data: out }); return m; };
  let wall = 0;                       // the pool's clock, by hand
  const p = createPropagationPool({ makeWorker: () => fake, now: () => wall });
  const few = records.slice(0, 50);
  p.setRecords(few);
  answer(); // the records message: no reply
  assert.equal(asked.length, 0);

  p.request(T0);
  p.request(T0 + 100);
  p.request(T0 + 200);
  assert.equal(asked.length, 1, 'one question in flight however many ticks pass');
  assert.equal(asked[0].tMs, T0);
  answer();
  assert.equal(p.latest.tMs, T0);
  assert.equal(asked.length, 1, 'the answer sends the next question at once');
  assert.equal(asked[0].tMs, T0 + 300, 'and it is for the newest instant wanted: a steady 100 ms step, so one step ahead of the last tick');
  answer();
  assert.equal(p.latest.tMs, T0 + 300);
  p.request(T0 + 300);
  assert.equal(asked[0].tMs, T0 + 400, 'steady: the question is one tick ahead');
  assert.ok(asked[0].buf instanceof Float64Array, 'with the spent buffer');
  answer();
  // A jump (a date picked, a scrub let go): no lead across it.
  p.request(T0 + 86400e3);
  assert.equal(asked[0].tMs, T0 + 86400e3);
  answer();
  // Paused: the same instant twice asks nothing.
  p.request(T0 + 86400e3);
  assert.equal(asked.length, 0, 'a paused clock asks nothing');
  // Backwards steadily: the lead points backwards.
  p.request(T0 + 86400e3 - 1000);
  answer();
  p.request(T0 + 86400e3 - 2000);
  assert.equal(asked[0].tMs, T0 + 86400e3 - 3000);
  // Records replaced while that question is out: its answer is for the old set and is dropped.
  p.setRecords(records.slice(100, 130));
  assert.equal(p.latest, null, 'new records: no answer until the worker has one for them');
  const stale = asked.shift();
  fake.onmessage({ data: { type: 'tick', gen: stale.gen, tMs: stale.tMs, pos: new Float64Array(150), ms: 1 } });
  assert.equal(p.latest, null, 'an answer for the old records is not drawn');
  answer(); // records
  p.request(T0);
  answer();
  assert.equal(p.latest.pos.length, 90);
  // A SLOW WORKER: the lead grows to the round trip. A tick every 100 ms of real time, an answer
  // 300 ms after it was asked for.
  {
    // At 60x: 6 000 ms of clock a tick.
    const T = T0 + 5 * 86400e3;
    p.request(T);                                   // a jump: asked as it is
    assert.equal(asked[0].tMs, T);
    wall += 100; p.request(T + 6000);               // in flight
    wall += 100; p.request(T + 12000);              // steady now; no round trip measured yet: one step ahead
    wall += 100; answer();                          // 300 ms after it was asked
    assert.equal(p.stats.roundTripMs, 300);
    assert.equal(asked[0].tMs, T + 18000, 'before a round trip is known, one step ahead');
    p.request(T + 18000);                           // the tick at 300 ms: the clock shows T + 18 000
    wall += 300; answer();
    assert.equal(asked[0].tMs, T + 36000, 'a 300 ms round trip at 60x is asked 18 000 ms of clock ahead: what the clock will show when the answer is drawn');
    wall += 300; answer();
    // The same worker at 1x: 300 ms ahead, three ticks.
    p.request(T0);
    wall += 100; p.request(T0 + 100);
    wall += 100; p.request(T0 + 200);
    wall += 100; answer();
    assert.equal(asked[0].tMs, T0 + 500, 'at 1x it is asked 300 ms ahead');
    // One terrible round trip, five seconds: the lead is held to a second of real time.
    wall += 5000; answer();
    assert.equal(p.stats.roundTripMs, 5000);
    wall += 100; p.request(T0 + 300);
    wall += 100; p.request(T0 + 400);
    wall += 100; answer();
    assert.equal(asked[0].tMs, T0 + 1400, 'and never more than a second of real time ahead');
    wall += 1; answer();
  }
  // No SGP4 records at all: nothing is asked.
  p.setRecords([records[N - 1]]);
  asked.length = 0;
  p.request(T0);
  assert.equal(asked.length, 0);
  p.dispose();
  assert.equal(fake.dead, true);
  assert.equal(p.ok, false);
}

// --- 3. the fallback ----------------------------------------------------------------------------
{
  const none = createPropagationPool({ makeWorker: () => null });
  assert.equal(none.ok, false);
  none.setRecords(records); none.request(T0);
  assert.equal(none.latest, null);

  const refuses = createPropagationPool({ makeWorker: () => { throw new Error('module workers are not allowed here'); } });
  assert.equal(refuses.ok, false);
  assert.match(refuses.stats.failed, /not allowed/);

  const fake = { postMessage() {}, terminate() { fake.dead = true; }, onmessage: null, onerror: null };
  const breaks = createPropagationPool({ makeWorker: () => fake });
  breaks.setRecords(records.slice(0, 10));
  breaks.request(T0);
  fake.onmessage({ data: { type: 'tick', gen: 1, tMs: T0, pos: new Float64Array(30), ms: 1 } });
  assert.ok(breaks.latest);
  fake.onerror({ message: 'the worker script did not load' });
  assert.equal(breaks.ok, false);
  assert.equal(breaks.latest, null, 'a failed worker\'s last answer is not drawn for ever');
  assert.equal(fake.dead, true);

  // In this process there is no browser Worker: the default is the fallback.
  if (typeof globalThis.Worker !== 'function') assert.equal(createPropagationPool().ok, false);
}

// --- 4. lazy, and wired --------------------------------------------------------------------------
{
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  const glyphs = readFileSync(join(JS, 'scene', 'glyphs.js'), 'utf8');
  assert.ok(/import\('\.\/propagate\/pool\.js'\)/.test(main), 'main.js fetches the pool by dynamic import');
  const STATIC = /^\s*(?:import|export)\b[^\n(]*propagate\/(pool|worker)\.js/m;
  assert.ok(!STATIC.test(main) && !STATIC.test(glyphs) && !/^\s*import[^\n(]*['"]\.\.\/propagate\/(pool|worker)\.js/m.test(glyphs), 'and nothing imports it statically (tests/test_boot_diet.mjs holds the whole boot graph)');
  const min = /const POOL_MIN_SGP4 = (\d+);/.exec(main);
  assert.ok(min && Number(min[1]) === POOL_MIN_RECORDS, 'main.js\'s threshold is pool.js\'s POOL_MIN_RECORDS');
  assert.ok(/pool\.request\(tMs\)/.test(glyphs) && /rec\.id !== selectedId/.test(glyphs), 'glyphs.js asks the pool on its tick and keeps the selection exact');
  // No layer that loads at boot may reach the threshold: the worker would then be a boot request.
  const layers = readFileSync(join(ROOT, 'registry', 'layers.yaml'), 'utf8').split(/\n  - id: /).slice(1);
  for (const block of layers) {
    if (!/propagator: sgp4/.test(block) || /load: on-demand/.test(block)) continue;
    const max = /max_items: (\d+)/.exec(block);
    assert.ok(max && Number(max[1]) < POOL_MIN_RECORDS, `layer ${block.split('\n')[0]} loads at boot with up to ${max && max[1]} SGP4 records: under POOL_MIN_RECORDS or the worker is a boot request`);
  }
}

await real.terminate();
console.log(`ok: ${compared} numbers from a real worker thread are the page's own to the last bit (${drawn} positions over ${INSTANTS.length} instants, ${silent} silences agreed)`);

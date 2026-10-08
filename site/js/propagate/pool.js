// propagate/pool.js -- the page's half of propagate/worker.js (spec 0049 task 1, public #285).
//
// A glyph layer with a big SGP4 catalogue hands its records here and asks, on each of its ticks,
// for the positions at an instant. The answer comes back from the worker some milliseconds later
// and the layer draws the latest one it has. Three rules:
//
//   1. ONE question in flight. A tick that arrives while the worker is busy replaces the instant
//      that is wanted next; nothing queues, so a slow machine falls behind by one answer, never by
//      a backlog.
//   2. THE NUMBERS ARE SGP4'S. The worker runs the same sgp4() and returns its doubles untouched
//      (tests/test_propagate_worker.mjs). What differs from the in-thread path is WHEN: the layer
//      asks one tick ahead (`lead`, the clock time between its last two ticks, while the clock runs
//      steadily), so the answer it draws is for the tick it is drawn on or within one tick of it.
//   3. IT CAN FAIL AND NOTHING GOES DARK. No Worker, a worker that will not start (a module worker
//      is refused, a content policy, a file missing) or one that throws: `ok` turns false and
//      scene/glyphs.js goes back to propagating in the thread, exactly as before this file.
//
// Lazy: nothing imports this at boot. js/main.js fetches it the first time a layer lands with
// POOL_MIN_RECORDS SGP4 records or more, which on a first visit is never ("Everything active" is
// `load: on-demand`); tests/test_boot_diet.mjs holds both files out of the boot graph.

import { slim } from './worker.js';

/** Fewer SGP4 records than this and a layer keeps propagating in the thread: a worker would cost more than it saves. */
export const POOL_MIN_RECORDS = 2000;

/** How many of these records would cross to the worker. */
export function poolable(records) {
  let n = 0;
  if (Array.isArray(records)) for (const r of records) if (r && r.propagator === 'sgp4' && (r.satrec || r.omm || r.tle)) n++;
  return n;
}

function defaultWorker() {
  if (typeof Worker !== 'function') return null;
  return new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
}

/**
 * @param {{makeWorker?: () => any}} [opts]  makeWorker is for tests; it returns something with
 *        postMessage(message, transfer), onmessage, onerror and terminate().
 */
export function createPropagationPool(opts = {}) {
  let worker = null;
  let ok = true;
  let gen = 0;
  let count = 0;            // records in the worker
  let mask = new Uint8Array(0); // 1 where the worker answers for record i
  let latest = null;        // {tMs, pos}
  let spare = null;         // a buffer to hand back for reuse
  let busy = false;
  let wanted = NaN;
  let askedAt = 0;
  let prevT = NaN;
  let prevStep = NaN;
  const stats = { ticks: 0, workerMs: 0, roundTripMs: 0, failed: null };
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  function fail(why) {
    ok = false;
    stats.failed = String(why || 'worker failed');
    latest = null;
    busy = false;
    try { if (worker) worker.terminate(); } catch { /* already gone */ }
    worker = null;
  }

  try {
    worker = (opts.makeWorker || defaultWorker)();
    if (!worker) fail('no Worker here');
  } catch (err) {
    fail(err && err.message ? err.message : err);
  }

  function send() {
    if (!ok || !worker || !count || !Number.isFinite(wanted)) return;
    const message = { type: 'tick', gen, tMs: wanted };
    const transfer = [];
    if (spare && spare.length === count * 3) { message.buf = spare; transfer.push(spare.buffer); }
    spare = null;
    busy = true;
    askedAt = now();
    try { worker.postMessage(message, transfer); } catch (err) { fail(err && err.message ? err.message : err); }
  }

  if (worker) {
    worker.onmessage = (event) => {
      const m = event && event.data;
      if (!m || m.type !== 'tick') return;
      busy = false;
      if (m.gen === gen && m.pos && m.pos.length === count * 3) {
        if (latest) spare = latest.pos;
        latest = { tMs: m.tMs, pos: m.pos };
        stats.ticks++;
        stats.workerMs = m.ms;
        stats.roundTripMs = now() - askedAt;
      }
      if (Number.isFinite(wanted) && (!latest || wanted !== latest.tMs)) send();
    };
    worker.onerror = (event) => { if (event && event.preventDefault) event.preventDefault(); fail(event && event.message ? event.message : 'worker error'); };
    worker.onmessageerror = () => fail('worker message could not be read');
  }

  return {
    /** False once the worker is known not to work: the caller propagates in the thread. */
    get ok() { return ok; },
    /** The newest answer, `{tMs, pos}` with three TEME km per record (NaN: no answer), or null. */
    get latest() { return ok ? latest : null; },
    /** 1 where record i is the worker's; 0 where the caller must ask propagate() itself. */
    get mask() { return mask; },
    get stats() { return { ...stats, records: count, busy }; },

    setRecords(records) {
      const list = Array.isArray(records) ? records : [];
      gen++;
      latest = null;
      spare = null;
      wanted = NaN;
      prevT = NaN;
      prevStep = NaN;
      mask = new Uint8Array(list.length);
      const items = new Array(list.length);
      let n = 0;
      for (let i = 0; i < list.length; i++) {
        const s = slim(list[i]);
        items[i] = s;
        if (s) { mask[i] = 1; n++; }
      }
      count = n ? list.length : 0;
      if (!ok || !worker) return;
      try { worker.postMessage({ type: 'records', gen, items: count ? items : [] }); } catch (err) { fail(err && err.message ? err.message : err); }
    },

    /**
     * The layer's tick at clock time tMs. Asks for the instant the NEXT tick is expected at while
     * the clock runs steadily (this step within a factor of two of the last one), else for tMs.
     */
    request(tMs) {
      if (!ok || !count || !Number.isFinite(tMs)) return;
      const step = tMs - prevT;
      const steady = Number.isFinite(step) && Number.isFinite(prevStep) && step !== 0 && step * prevStep > 0 && Math.abs(step) <= Math.abs(prevStep) * 2 && Math.abs(prevStep) <= Math.abs(step) * 2;
      prevStep = step;
      prevT = tMs;
      wanted = steady ? tMs + step : tMs;
      if (!busy && (!latest || latest.tMs !== wanted)) send();
    },

    dispose() {
      ok = false;
      latest = null;
      try { if (worker) worker.terminate(); } catch { /* already gone */ }
      worker = null;
    },
  };
}

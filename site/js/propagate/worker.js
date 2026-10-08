// propagate/worker.js -- SGP4 for a big catalogue, off the main thread (spec 0049 task 1, public #285).
//
// "Everything active" is some fifteen thousand element sets, and scene/glyphs.js ran SGP4 for every
// one of them on the main thread on each of its ticks: 45 ms of a tick in node on the machine this
// was written on (2026-10-08), against 2 ms for everything else the tick does. This file is that
// loop and nothing else. It imports the SAME sgp4() the page uses and writes what it returns,
// untouched, into a Float64Array that is transferred back -- so a position from here is the
// in-thread position to the last bit (tests/test_propagate_worker.mjs holds that over 1 000 objects
// in a real worker thread). Float64, not Float32: the page converts to the scene's frame AFTER this,
// in doubles, and rounding first would change the last bit of what is drawn.
//
// The page talks to it through propagate/pool.js:
//   {type: 'records', gen, items: [{satrec, epoch, frame} | null, ...]}   the layer's element sets
//   {type: 'tick', gen, tMs, buf?}       -> {type: 'tick', gen, tMs, pos, ms}   pos transferred
// `null` in items (a record that is not SGP4's) and a record SGP4 cannot answer for are both NaN
// in `pos`: three numbers per record, TEME kilometres, in the order the records came.

import { sgp4 } from './sgp4.js';

/** The loop. Pure: the same call in a page, a worker or node gives the same array. */
export function propagateBatch(items, tMs, out) {
  const n = items.length;
  const pos = out && out.length === n * 3 ? out : new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    const item = items[i];
    const p = item ? sgp4(item, tMs) : null;
    const o = i * 3;
    if (p) {
      pos[o] = p.x;
      pos[o + 1] = p.y;
      pos[o + 2] = p.z;
    } else {
      pos[o] = NaN;
      pos[o + 1] = NaN;
      pos[o + 2] = NaN;
    }
  }
  return pos;
}

/** What of a record crosses to the worker: its element set, its epoch and its frame. */
export function slim(record) {
  if (!record || record.propagator !== 'sgp4') return null;
  const satrec = record.satrec || record.omm || record.tle || null;
  if (!satrec) return null;
  const out = { satrec };
  if (Number.isFinite(record.epoch)) out.epoch = record.epoch;
  if (record.frame) out.frame = record.frame;
  return out;
}

/** The message handler, apart from the scope it is attached to, so node can drive it too. */
export function createHandler(post) {
  let items = [];
  let gen = -1;
  return function onMessage(event) {
    const m = event && event.data;
    if (!m) return;
    if (m.type === 'records') {
      items = Array.isArray(m.items) ? m.items : [];
      gen = m.gen;
      return;
    }
    if (m.type === 'tick') {
      // A tick for records this worker no longer holds answers with an empty array, never with
      // positions for the wrong objects.
      const mine = m.gen === gen;
      const began = typeof performance !== 'undefined' ? performance.now() : 0;
      const pos = mine ? propagateBatch(items, m.tMs, m.buf) : new Float64Array(0);
      const ms = typeof performance !== 'undefined' ? performance.now() - began : 0;
      post({ type: 'tick', gen: m.gen, tMs: m.tMs, pos, ms }, [pos.buffer]);
    }
  };
}

// Only inside a worker: imported by a page or by node this file is its two functions.
const scope = typeof self !== 'undefined' && typeof window === 'undefined' && typeof self.postMessage === 'function' ? self : null;
if (scope) scope.onmessage = createHandler((message, transfer) => scope.postMessage(message, transfer));

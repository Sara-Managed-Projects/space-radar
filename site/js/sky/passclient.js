// sky/passclient.js -- the page's side of sky/passworker.js for the Coming up list (internal #562).
//
// WHY. data/events.js passItems predicted a day of passes for about 180 satellites on the main thread:
// MEASURED 2026-10-10 on an Iris Plus 640 laptop as one task of 1.5 to 3.6 s after boot and again each
// time the list was rebuilt for a new place or a jumped clock. The answer is now asked of the worker
// that already runs predictPasses for the Tonight view, and the list is rebuilt when it arrives.
//
// Contract: runPasses(message) -> Promise<{id, passes}>, message as sky/passworker.js reads it
// ({records: [{id, name, satrec, meta}], observer, fromMs, hours}). Lazy: no worker exists until the
// first call. Where module workers are missing it works the same records out on the main thread in
// slices of SLICE records, one per timer turn, so no one task is more than a fraction of a second.
// No DOM, no THREE: a node test drives the slicing with a stub.

export const SLICE = 10;

let worker = null;
let seq = 0;
const waiting = new Map();

function open() {
  if (worker) return worker;
  worker = new Worker(new URL('./passworker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    const w = waiting.get(e.data && e.data.id);
    if (w) { waiting.delete(e.data.id); w.resolve(e.data); }
  };
  worker.onerror = () => {
    worker = null;
    for (const w of waiting.values()) w.reject(new Error('the pass worker failed'));
    waiting.clear();
  };
  return worker;
}

/** The same answer on the main thread, SLICE records per turn of `schedule` (a timer by default). */
export async function runPassesSliced(msg, schedule = (fn) => setTimeout(fn, 0)) {
  const mod = await import('./passworker.js');
  const records = msg.records || [];
  const passes = [];
  for (let i = 0; i < records.length; i += SLICE) {
    await new Promise((resolve) => schedule(resolve));
    passes.push(...mod.runPasses({ ...msg, records: records.slice(i, i + SLICE) }).passes);
  }
  return { id: msg.id, passes };
}

export function runPasses(msg) {
  if (typeof Worker === 'function') {
    try {
      const id = ++seq;
      return new Promise((resolve, reject) => {
        waiting.set(id, { resolve, reject });
        try { open().postMessage({ ...msg, id }); } catch (err) { waiting.delete(id); reject(err); }
      }).catch(() => runPassesSliced(msg));
    } catch { /* fall through */ }
  }
  return runPassesSliced(msg);
}

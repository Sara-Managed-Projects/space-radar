// sky/findclient.js -- the page's side of sky/findworker.js (internal #359). Lazy, off the main
// thread, no fetch. Where module workers are missing nothing is searched (an 8 second walk on the
// main thread is worse than a missing row).
//
// Contract: findFromPlace({latDeg, lonDeg, altKm}, fromMs) -> Promise<row[]>

let worker = null;
let seq = 0;
const waiting = new Map();

function open() {
  if (worker) return worker;
  worker = new Worker(new URL('./findworker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    const w = waiting.get(e.data && e.data.id);
    if (w) { waiting.delete(e.data.id); w(e.data.rows || []); }
  };
  worker.onerror = () => { worker = null; for (const w of waiting.values()) w([]); waiting.clear(); };
  return worker;
}

export function findFromPlace(observer, fromMs, days = 30) {
  return new Promise((resolve) => {
    try {
      const id = ++seq;
      waiting.set(id, resolve);
      open().postMessage({ id, fromMs, days, observer });
    } catch {
      resolve([]);
    }
  });
}

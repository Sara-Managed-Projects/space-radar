// sky/findclient.js -- the page's side of sky/findworker.js (internal #359). Lazy, off the main
// thread, no fetch of its own: the variable stars' rows are data/variablerows.js's, the one load Tonight
// and the light curve share. Where module workers are missing nothing is searched (an 8 second walk on
// the main thread is worse than a missing row).
//
// Contract: findFromPlace({latDeg, lonDeg, altKm}, fromMs) -> Promise<row[]>
//           variableWords(row) -> row     (b200-c2-deep) a variable star's row given its words: label, line, classWords

// b200-c2-deep: begin -- the variable stars' rows come from the worker as numbers; their words are the page's (copy/en.deep.js)
import { COPY, t, fmt, compassWords } from '../copy/en.js';
import '../copy/en.deep.js';

export function variableWords(row) {
  if (!row || row.kind !== 'variable') return row;
  const K = COPY.varEvents;
  const min = row.what === 'min';
  row.label = t(min ? K.min : K.max, { name: row.name });
  row.line = t(min ? K.minLine : K.maxLine, { mag: fmt.num(row.mag, 1), alt: fmt.int(row.altDeg), dir: compassWords(row.azDeg) });
  row.classWords = min ? K.minClass : K.maxClass;
  return row;
}
// b200-c2-deep: end

let worker = null;
let seq = 0;
const waiting = new Map();

function open() {
  if (worker) return worker;
  worker = new Worker(new URL('./findworker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    const w = waiting.get(e.data && e.data.id);
    if (w) { waiting.delete(e.data.id); w((e.data.rows || []).map(variableWords)); } // b200-c2-deep: variableWords
  };
  worker.onerror = () => { worker = null; for (const w of waiting.values()) w([]); waiting.clear(); };
  return worker;
}

export function findFromPlace(observer, fromMs, days = 30) {
  // b200-s3-suite: the variable stars' rows are the page's one load of data/variables.json (data/variablerows.js), so
  // the worker fetches nothing; a failed load asks for the pairs alone.
  const vars = import('../data/variablerows.js').then((m) => m.variableRows()).catch(() => []);
  return vars.then((variables) => new Promise((resolve) => {
    try {
      const id = ++seq;
      waiting.set(id, resolve);
      open().postMessage({ id, fromMs, days, observer, variables });
    } catch {
      resolve([]);
    }
  }));
}

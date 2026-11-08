// sky/findworker.js -- findConjunctions off the main thread (internal #359).
//
// Contract: a module worker. Post {id, fromMs, days, observer: {latDeg, lonDeg, altKm}}; it answers
// {id, rows, ms}. Also exported, for the page's fallback and the test: runFind(message, variableRows).
// The input is the vendored Astronomy Engine and, since forge #142 (b200-c2-deep), data/variables.json (15 kB, fetched
// by the worker the first time it is asked): the eclipsing stars at minimum and the Miras near their brightest
// (sky/varevents.js) join the pairs in the same answer.

import { findConjunctions } from './conjunctions.js';
import { variableEvents } from './varevents.js'; // b200-c2-deep

export function runFind(msg, variableRows = null) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  let rows = [];
  try {
    rows = findConjunctions({ fromMs: msg.fromMs, days: msg.days || 30, observer: msg.observer });
  } catch {
    rows = [];
  }
  // b200-c2-deep: begin -- the variable stars worth going out for (forge #142)
  try {
    if (variableRows) rows = rows.concat(variableEvents(variableRows, { fromMs: msg.fromMs, toMs: msg.fromMs + (msg.days || 30) * 864e5, observer: msg.observer }));
  } catch { /* the pairs stand without them */ }
  // b200-c2-deep: end
  return { id: msg.id, rows, ms: (typeof performance !== 'undefined' ? performance.now() : 0) - t0 };
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof window === 'undefined' && typeof document === 'undefined') {
  // b200-c2-deep: the variables' file once, then every answer carries their rows; a failed fetch answers without them.
  let vars = null;
  const varRows = () => vars || (vars = fetch(new URL('../../data/variables.json', import.meta.url)).then((r) => (r.ok ? r.json() : null))
    .then((d) => (d && Array.isArray(d.rows) ? d.rows : null)).catch(() => null));
  self.onmessage = (e) => { varRows().then((v) => self.postMessage(runFind(e.data || {}, v))); };
}

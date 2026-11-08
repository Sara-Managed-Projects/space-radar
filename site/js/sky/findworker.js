// sky/findworker.js -- findConjunctions off the main thread (internal #359).
//
// Contract: a module worker. Post {id, fromMs, days, observer: {latDeg, lonDeg, altKm}, variables?: row[]}; it answers
// {id, rows, ms}. Also exported, for the page's fallback and the test: runFind(message, variableRows).
// The input is the vendored Astronomy Engine and, since forge #142 (b200-c2-deep), the rows of data/variables.json,
// which the page hands over in the message ({variables: row[]}, data/variablerows.js loads them once per page): the
// eclipsing stars at minimum and the Miras near their brightest (sky/varevents.js) join the pairs in the same answer.
// The worker fetches nothing, so the pairs are worked out offline (tests/test_conjunctions.mjs).

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
  // b200-s3-suite: the variable stars' rows come with the message (sky/findclient.js); none, and the answer is the pairs.
  self.onmessage = (e) => {
    const msg = e.data || {};
    self.postMessage(runFind(msg, Array.isArray(msg.variables) && msg.variables.length ? msg.variables : null));
  };
}

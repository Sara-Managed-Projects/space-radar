// sky/findworker.js -- findConjunctions off the main thread (internal #359).
//
// Contract: a module worker. Post {id, fromMs, days, observer: {latDeg, lonDeg, altKm}}; it answers
// {id, rows, ms}. Also exported, for the page's fallback and the test: runFind(message).
// Nothing is fetched: the only input is the vendored Astronomy Engine.

import { findConjunctions } from './conjunctions.js';

export function runFind(msg) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  let rows = [];
  try {
    rows = findConjunctions({ fromMs: msg.fromMs, days: msg.days || 30, observer: msg.observer });
  } catch {
    rows = [];
  }
  return { id: msg.id, rows, ms: (typeof performance !== 'undefined' ? performance.now() : 0) - t0 };
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof window === 'undefined' && typeof document === 'undefined') {
  self.onmessage = (e) => { self.postMessage(runFind(e.data || {})); };
}

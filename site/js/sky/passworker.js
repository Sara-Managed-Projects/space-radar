// sky/passworker.js -- predictPasses off the main thread (spec 0051 req 11).
//
// Contract: a module worker. Post {id, records: [{id, name, satrec, meta}], observer, fromMs, hours};
// it answers {id, passes: Pass[] with `recordId` in place of `record`, ms}. Also exported, for the
// page's fallback where module workers are missing and for the test: runPasses(message).
//
// sky/passes.js says it was written to run in a worker ("No dependency on any other site/js module:
// this runs in a worker with only the vendored satellite.js beside it"), and nothing ran it in one:
// the Now panel predicted twelve hours of passes on the main thread on every layer event. Measured in
// the PR: 24 hours for the ~170 stations and visual records, desktop and 4x CPU throttle.
//
// The records cross as plain data (a satrec is a plain object; a record's methods, if any, stay
// behind), and the passes come back with the record's id, which the page maps to its own record.

import { predictPasses } from './passes.js';

export function runPasses(msg) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  let passes = [];
  try {
    passes = predictPasses(msg.records || [], msg.observer, msg.fromMs, msg.hours || 24);
  } catch {
    passes = [];
  }
  const out = passes.map((p) => {
    const { record, ...rest } = p;
    return { ...rest, recordId: record && record.id };
  });
  return { id: msg.id, passes: out, ms: (typeof performance !== 'undefined' ? performance.now() : 0) - t0 };
}

// In a worker, answer messages; imported by the page or node, do nothing.
if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof window === 'undefined' && typeof document === 'undefined') {
  self.onmessage = (e) => {
    self.postMessage(runPasses(e.data || {}));
  };
}

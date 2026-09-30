// scene/auroraworker.js -- the aurora forecast fetched and decoded off the main thread.
//
// A module worker (scene/aurora.js starts it). NOAA's answer is 918 kB of JSON for 65 160 cells:
// JSON.parse of that is 10-20 ms on a laptop and several times that on a phone, and the 65 160-cell
// walk after it as much again. On the main thread that is a dropped frame every quarter hour; here
// it is nothing. What crosses back is 65 160 bytes (transferred, not copied) and a few numbers.
// The arithmetic is data/ovation.js, the same module the main-thread fallback and the Node test use.
//
// Messages in:  {type:'look', seq, url}
// Messages out: {type:'look', seq, grid (transferred), observationMs, forecastMs, cells, summary,
//                chars, wireBytes, ms}
//               {type:'error', seq, message, status}

import { parseOvation } from '../data/ovation.js';

/** The same request the main thread would make: no credentials, nothing about the visitor. */
async function fetchOvation(url) {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'origin', cache: 'default' });
  if (!res.ok) {
    const err = new Error('NOAA answered HTTP ' + res.status);
    err.status = res.status;
    throw err;
  }
  return res.text();
}

/** Bytes on the wire (gzip), when the browser will say: Resource Timing works inside a worker too. */
function wireBytes(url) {
  try {
    const all = performance.getEntriesByName(url);
    const last = all[all.length - 1];
    return last && last.transferSize > 0 ? last.transferSize : null;
  } catch {
    return null;
  }
}

self.onmessage = async (e) => {
  const m = e.data || {};
  if (m.type !== 'look') return;
  const t0 = performance.now();
  try {
    const text = await fetchOvation(m.url);
    const out = parseOvation(text);
    self.postMessage({
      type: 'look', seq: m.seq, grid: out.grid, observationMs: out.observationMs, forecastMs: out.forecastMs,
      cells: out.cells, summary: out.summary, chars: text.length, wireBytes: wireBytes(m.url),
      ms: Math.round(performance.now() - t0),
    }, [out.grid.buffer]);
  } catch (err) {
    self.postMessage({ type: 'error', seq: m.seq, message: String((err && err.message) || err), status: (err && err.status) || null });
  }
};

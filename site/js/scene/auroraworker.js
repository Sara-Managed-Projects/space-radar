// scene/auroraworker.js -- the aurora forecast fetched and decoded off the main thread.
//
// A module worker (scene/aurora.js starts it). NOAA's answer is 918 kB of JSON for 65 160 cells:
// JSON.parse of that is 10-20 ms on a laptop and several times that on a phone, and the 65 160-cell
// walk after it as much again, and the half-degree smoothing (data/ovation.js upsampleGrid) about
// 10 ms more. On the main thread that is a dropped frame every quarter hour; here it is nothing.
// What crosses back is the grid (65 kB) and the texture (260 kB), transferred, not copied.
// The arithmetic is data/ovation.js, the same module the main-thread fallback and the Node test use.
//
// Messages in:  {type:'look', seq, url}
// Messages out: {type:'look', seq, grid and tex (both transferred), observationMs, forecastMs, cells, summary,
//                chars, ms}
//
// The bytes on the wire are not reported: NOAA sends no Timing-Allow-Origin, so Resource Timing gives
// a cross-origin transferSize of 0. Measured with curl instead: 141 097 bytes gzip (2026-09-30).
//               {type:'error', seq, message, status}

import { parseOvation, upsampleGrid } from '../data/ovation.js';

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

self.onmessage = async (e) => {
  const m = e.data || {};
  if (m.type !== 'look') return;
  const t0 = performance.now();
  try {
    const text = await fetchOvation(m.url);
    const out = parseOvation(text);
    const tex = upsampleGrid(out.grid);
    self.postMessage({
      type: 'look', seq: m.seq, grid: out.grid, tex, observationMs: out.observationMs, forecastMs: out.forecastMs,
      cells: out.cells, summary: out.summary, chars: text.length,
      ms: Math.round(performance.now() - t0),
    }, [out.grid.buffer, tex.buffer]);
  } catch (err) {
    self.postMessage({ type: 'error', seq: m.seq, message: String((err && err.message) || err), status: (err && err.status) || null });
  }
};

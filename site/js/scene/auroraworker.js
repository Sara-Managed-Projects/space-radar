// scene/auroraworker.js -- the aurora forecast fetched and decoded off the main thread.
//
// A module worker (scene/aurora.js starts it). NOAA's answer is 918 kB of JSON for 65 160 cells:
// JSON.parse of that is 10-20 ms on a laptop and several times that on a phone, and the 65 160-cell
// walk after it as much again, and the half-degree smoothing (data/ovation.js upsampleGrid) about
// 10 ms more. On the main thread that is a dropped frame every quarter hour; here it is nothing.
// What crosses back is the grid (65 kB) and the texture (260 kB), transferred, not copied.
// The arithmetic is data/ovation.js, the same module the main-thread fallback and the Node test use.
//
// Messages in:  {type:'look', seq, url, saved?}   `saved: true`: url is OUR saved copy (data/v1/swpc-ovation.json,
//                                                 the harvester's file: stamps around NOAA's body), not NOAA's answer
// Messages out: {type:'look', seq, grid and tex (both transferred), observationMs, forecastMs, cells, summary,
//                chars, ms, fetchedAt?, validUntil?}   (the stamps only for a saved copy)
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

/** Our saved copy: the file's body is NOAA's answer verbatim, with the moment the harvester read it. */
async function fetchSaved(url) {
  const res = await fetch(url, { credentials: 'omit', cache: 'default' });
  if (!res.ok) {
    const err = new Error('the saved copy answered HTTP ' + res.status);
    err.status = res.status;
    throw err;
  }
  const file = JSON.parse(await res.text());
  if (!file || file.schema !== 1 || file.body == null) throw new Error('the saved copy is not a snapshot file');
  const fetchedAt = Date.parse(file.fetched_at);
  if (!Number.isFinite(fetchedAt)) throw new Error('the saved copy has no read time');
  const validUntil = Date.parse(file.valid_until);
  return { body: file.body, fetchedAt, validUntil: Number.isFinite(validUntil) ? validUntil : null };
}

self.onmessage = async (e) => {
  const m = e.data || {};
  if (m.type !== 'look') return;
  const t0 = performance.now();
  try {
    let text;
    let stamps = {};
    if (m.saved) {
      const f = await fetchSaved(m.url);
      text = typeof f.body === 'string' ? f.body : JSON.stringify(f.body);
      stamps = { fetchedAt: f.fetchedAt, validUntil: f.validUntil };
    } else {
      text = await fetchOvation(m.url);
    }
    const out = parseOvation(text);
    const tex = upsampleGrid(out.grid);
    self.postMessage({
      type: 'look', seq: m.seq, grid: out.grid, tex, observationMs: out.observationMs, forecastMs: out.forecastMs,
      cells: out.cells, summary: out.summary, chars: text.length, ...stamps,
      ms: Math.round(performance.now() - t0),
    }, [out.grid.buffer, tex.buffer]);
  } catch (err) {
    self.postMessage({ type: 'error', seq: m.seq, message: String((err && err.message) || err), status: (err && err.status) || null });
  }
};

// audio/load.js -- fetch and decode a sound, once, and never before somebody asked for it.
//
// Contract export: createLoader(engine, opts) -> { load(row), warned() }
//
// Spec 0035 req 8 (2026-09-23): A MISSING ASSET IS SILENT, NOT BROKEN. A fetch that fails, or a
// file the browser cannot decode, resolves to null: the bed stays off, the trip runs, the console
// says so once for the whole session (not once per stage change, which on the edge trip is nine
// identical lines). The decoded buffer is cached per row, so a bed that has played once costs
// nothing to come back to, and the null is cached too: a file that 404'd is not asked again.

import { pickFormat } from './pick.js';

export function createLoader(engine, opts = {}) {
  const doFetch = opts.fetch || ((url) => fetch(url));
  const warn = opts.warn || ((...a) => console.warn(...a));
  const canPlay = opts.canPlay || defaultCanPlay();
  const cache = new Map();
  let warnedOnce = false;

  function decode(context, bytes) {
    // The callback form as well as the promise: Safari before 14.1 has only the callbacks, and a
    // promise-only call there never settles, which would be a bed that silently never starts.
    return new Promise((resolve, reject) => {
      let settled = false;
      const ok = (b) => { if (!settled) { settled = true; resolve(b); } };
      const bad = (e) => { if (!settled) { settled = true; reject(e || new Error('decode failed')); } };
      try {
        const p = context.decodeAudioData(bytes, ok, bad);
        if (p && typeof p.then === 'function') p.then(ok, bad);
      } catch (e) {
        bad(e);
      }
    });
  }

  async function one(url) {
    const res = await doFetch(url);
    if (!res || res.ok === false) throw new Error(`${url}: HTTP ${res ? res.status : 'no response'}`);
    const bytes = await res.arrayBuffer();
    return decode(engine.context, bytes);
  }

  async function attempt(row) {
    let last = null;
    for (const url of pickFormat(row, canPlay)) {
      try {
        return await one(url);
      } catch (e) {
        last = e;
      }
    }
    if (!warnedOnce) {
      warnedOnce = true;
      warn(`sound: ${row && row.id} did not load, carrying on without it`, last);
    }
    return null;
  }

  function load(row) {
    if (!row || !engine.context) return Promise.resolve(null);
    if (!cache.has(row.id)) cache.set(row.id, attempt(row));
    return cache.get(row.id);
  }

  return { load, warned: () => warnedOnce };
}

function defaultCanPlay() {
  let probe = null;
  return (type) => {
    try {
      if (!probe && typeof Audio === 'function') probe = new Audio();
      return probe ? probe.canPlayType(type) : '';
    } catch {
      return '';
    }
  };
}

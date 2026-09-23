// ui/urlstate.js -- the one place the URL hash is read and written.
//
// MEASURED 2026-09-08: there were two writers in two dialects. main.js wrote `#wonder` and read a
// bare word; ui/controls.js wrote `#m=wonder` and read a key=value pair. A shared `#m=now` link
// therefore booted main.js into Wonder while the panel said Now, and a moment change from the
// panel could bounce the app back through the hashchange listener. Spec 0017 (share a view) wants
// the hash to carry more keys later; that only works if exactly one module owns the format.
//
// Format: `#k=v&k2=v2`. Other keys are left alone when one is written. On READ the old bare form
// (`#now`) is still accepted, so links people already shared keep working; on WRITE only the
// keyed form is produced.
//
// EVERY KEY, since 2026-09-23 (spec 0032, deep links). `m` the moment; `v` the format version;
// `trip` and `stop` a trip at a stop (a 1-based number, or a stop id); `at` a record id; `t` an
// ISO UTC instant, or `now`; `rate` the clock's rate; `stage` the world or rung the map is centred
// on. A key outside KEYS is dropped on read and never written, so a link made by a newer map with
// one more key still opens everything this one understands. A `v` other than VERSION marks the
// whole state unknown: this reader cannot tell what the keys it does recognise mean in that form.
//
// Values are encoded on write and decoded on read. A record id never needs it; an ISO instant
// does (`:` is fine in a fragment, `+` is not). Keys are written in KEYS order whatever order they
// were patched in, so the address bar reads the same way every time: `#m=wonder&trip=…&stop=5`.
//
// Everything goes through history.replaceState, never pushState: a deep link into a trip is one
// history entry and Back leaves the site, as it did before. Spec 0025 named the consequence -- Back
// is not Previous Stop -- and the README states it.

export const HASH_KEY = 'm';
export const KEYS = ['m', 'v', 'trip', 'stop', 'at', 't', 'rate', 'stage'];
export const VERSION = '1';

export function hashParts() {
  const raw = (typeof location !== 'undefined' ? location.hash : '') || '';
  return raw.replace(/^#/, '').split('&').filter(Boolean);
}

function decode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value; // a stray `%` from a hand-typed link is a value, not a crash
  }
}

/**
 * Every key the hash carries, decoded, unknown keys dropped. `unknownVersion` is set when `v` is
 * present and not this format's. The legacy bare word (`#now`, `#now/anything`) reads as `m`
 * unless a keyed `m` is also there, in which case the keyed one wins.
 */
export function read() {
  const out = {};
  let bare = null;
  for (const part of hashParts()) {
    const eq = part.indexOf('=');
    if (eq < 0) {
      // Legacy: `#now`, and `#now/anything` from the very first build.
      const word = part.split('/')[0];
      if (word && bare === null) bare = word;
      continue;
    }
    const key = part.slice(0, eq);
    if (KEYS.includes(key)) out[key] = decode(part.slice(eq + 1));
  }
  if (out.m === undefined && bare !== null) out.m = bare;
  if (out.v !== undefined && out.v !== VERSION) out.unknownVersion = true;
  return out;
}

/**
 * Merge `patch` into the hash. A null, undefined or empty value removes its key; a key outside
 * KEYS is ignored; the legacy bare word and any unknown key already in the hash are dropped, so
 * what is written is always the keyed form and only known keys. No-op when nothing changes.
 * replaceState, so it does not pile up history.
 */
export function write(patch) {
  if (!patch || typeof location === 'undefined') return;
  const current = {};
  for (const part of hashParts()) {
    const eq = part.indexOf('=');
    if (eq < 0) continue; // the legacy bare word is never written back
    const key = part.slice(0, eq);
    if (KEYS.includes(key)) current[key] = part.slice(eq + 1); // raw: already encoded
  }
  for (const key of Object.keys(patch)) {
    if (!KEYS.includes(key)) continue;
    const value = patch[key];
    if (value === null || value === undefined || value === '') delete current[key];
    else current[key] = encodeURIComponent(String(value));
  }
  const next = KEYS.filter((key) => key in current).map((key) => `${key}=${current[key]}`);
  const target = next.length ? `#${next.join('&')}` : '';
  if ((location.hash || '') === target) return;
  try {
    // An empty target drops the `#` too, rather than leaving a bare one on the address bar.
    history.replaceState(null, '', target || `${location.pathname}${location.search}`);
  } catch {
    location.hash = target;
  }
}

/** Remove these keys, keeping every other. */
export function clear(keys) {
  write(Object.fromEntries((keys || []).map((key) => [key, null])));
}

/**
 * Which stop a link's `stop` names, as an index into `tour.stops`, or -1. A number is 1-based --
 * it is what the progress row shows and what the trip writes; anything else is a stop id.
 * Pure, so a test can hold it; the trip's own count of stops that resolved today may be smaller
 * than the registry's, and the caller clamps for that.
 */
export function stopIndex(tour, value) {
  if (!tour || !Array.isArray(tour.stops) || value === null || value === undefined) return -1;
  const text = String(value).trim();
  if (!text) return -1;
  if (/^\d+$/.test(text)) {
    const n = Number(text);
    return n >= 1 && n <= tour.stops.length ? n - 1 : -1;
  }
  return tour.stops.findIndex((stop) => stop && stop.id === text);
}

/** The moment the hash names, or null. `valid` is the list of moment ids the app knows. */
export function readMoment(valid) {
  const ids = Array.isArray(valid) ? valid : [];
  const m = read().m;
  return ids.includes(m) ? m : null;
}

/** Write the moment, keeping every other key. */
export function writeMoment(moment) {
  write({ [HASH_KEY]: moment });
}

/**
 * Read the link ONCE, at boot, apply its clock keys (`t`, `rate`) there and then, and return the
 * rest of it for the caller to apply when the layers have landed.
 *
 * WHY, measured 2026-09-23 in headless Chrome. main.js used to read the hash at `sr:layers-ready`,
 * 7-17 s after boot. By then the app's own clock writer (main.js, one write a second, trailing edge)
 * had been putting the clock INTO the hash, so what was applied was not the visitor's link but a
 * stale echo of the app's own state. A visitor who jumped to 2027-01-01 and pressed 1 h/s right
 * after load was wound back 16 min of app time the moment the layers landed (0.27 h at SwiftShader's
 * frame rate; about seven hours in a real browser), and the eclipse probe (#228) needed a throwaway
 * jump because its first goTo() was undone the same way. Reading the link before any writer runs
 * and applying the clock at once -- it needs nothing loaded, every position is a function of it --
 * means a first scrub after load always sticks.
 *
 * `clock` is the app clock (clock.js), passed in so a test can hold it. A link in a format this
 * reader does not know applies nothing, here as at layers-ready. The returned object never carries
 * `t` or `rate`, so the later half cannot move the clock.
 */
export function bootLink(clock) {
  const st = read();
  if (clock && !st.unknownVersion) {
    if (st.t && st.t !== 'now') {
      const ms = Date.parse(st.t);
      if (Number.isFinite(ms)) clock.goTo(ms);
    }
    if (st.rate) {
      const r = Number(st.rate);
      if (r > 0 && clock.rates().includes(r)) clock.setRate(r);
    }
  }
  const rest = { ...st };
  delete rest.t;
  delete rest.rate;
  return rest;
}

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
// `trip` and `stop` a trip at a stop (a 1-based number, or a stop id); `at` a record id; `event` a
// mission's event, `<mission>.<event>` (registry/missions.yaml, ui/missions.js; 2026-10-06); `t` an
// ISO UTC instant, or `now`; `rate` the clock's rate; `stage` the world or rung the map is centred
// on; `exp` the exposure the sky is drawn at when it is not the default (`eye` or `deep`, public
// #460: a shared postcard and the link beside it show the same sky). A key outside KEYS is dropped on read and never written, so a link made by a newer map with
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
// `present` (2026-10-06, public #441): a trip opened for a room, `1`, or `auto` to advance by itself.
// `cam` (2026-10-07, internal #397): where the camera stands round what it looks at, so a shared
// view reopens as it was framed: `<azimuth>,<polar>,<distance in km>`, angles in degrees.
// `ambient` and the five after it (spec 0036, ui/autopilot.js): a screen that plays on its own.
// `ambient` is `1`, a reel's id (registry/autopilot.yaml) or trip ids with commas; `autopilot` is
// the same key under the name people guess, and read() hands it back as `ambient`.
// `p` (2026-10-08, internal #137): a shared spot on the ground, `<lat>,<lon>` to 0.1 degree. Only
// sky/placelink.js makes or reads its value, and only "Share this place" puts it in a link.
export const KEYS = ['m', 'v', 'ambient', 'autopilot', 'shuffle', 'sound', 'voice', 'captions', 'pace', 'trip', 'stop', 'present', 'at', 'event', 't', 'rate', 'stage', 'exp', 'p', 'imagine', 'cam'];
export const VERSION = '1';

/**
 * A camera pose as the `cam` key's value. Angles in degrees to a tenth, the distance in
 * kilometres to four figures (so the link means the same on any stage's units). The lens is not
 * in it: photo mode's lens is put back when photo mode is left, so a link never needs one.
 * '' when the pose is not one. Pure.
 */
export function camValue(pose) {
  const p = pose || {};
  if (![p.azimuthDeg, p.polarDeg, p.distanceKm].every(Number.isFinite) || !(p.distanceKm > 0)) return '';
  const deg = (v) => String(Math.round(v * 10) / 10);
  const parts = [deg(((p.azimuthDeg % 360) + 360) % 360), deg(Math.min(179.9, Math.max(0.1, p.polarDeg))), String(Number(p.distanceKm.toPrecision(4)))];
  return parts.join(',');
}

/** And back: {azimuthDeg, polarDeg, distanceKm}, or null for anything that is not a pose. Pure. */
export function parseCam(text) {
  const parts = String(text == null ? '' : text).split(',');
  if (parts.length !== 3 || parts.some((x) => !/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(x.trim()))) return null;
  const [az, pol, dist] = parts.map(Number);
  if (!(pol > 0 && pol < 180) || !(dist > 0) || !Number.isFinite(az)) return null;
  return { azimuthDeg: ((az % 360) + 360) % 360, polarDeg: pol, distanceKm: dist };
}

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
  if (out.autopilot !== undefined) { if (out.ambient === undefined) out.ambient = out.autopilot; delete out.autopilot; }
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
 *
 * AN EMBED (public #439) names its view in the query, `?embed=1&at=<id>`, because a CMS may strip
 * the fragment from an iframe's src. `embed` is therefore not one of KEYS: the hash never carries
 * it, write() never produces it, and the app's own links are unchanged by it.
 */
export function bootLink(clock, extra = null) {
  // `extra`: the keys an embed's QUERY carries (ui/embed.js embedLink); the hash wins over them.
  const st = extra ? { ...extra, ...read() } : read();
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

/**
 * What of the boot link is still the visitor's to apply once the layers land. All of it, unless a
 * trip is already running: then nothing that would move the camera or the map -- `trip`, `stop`,
 * `at` and `stage` go -- because the visitor started that trip themselves after the page opened,
 * and the link is older than their decision. Measured 2026-09-23 on main before bootLink(): a trip
 * started 8 s into the boot was restarted at its first stop when the layers landed 10 s later (its
 * own `trip=` key, written into the hash, read back as a link; ui/trip.js start() on the running
 * trip is jump(0)), so the first stop was flown twice. bootLink() ends that echo; this covers a
 * link that named a trip of its own. Pure.
 */
export function laterLink(link, tripRunning) {
  if (!link || !tripRunning) return link;
  const rest = { ...link };
  for (const key of ['trip', 'stop', 'at', 'event', 'stage', 'cam']) delete rest[key];
  return rest;
}

/**
 * A link that arrives in a tab that is ALREADY RUNNING: Back, Forward, or an address pasted over
 * this one (public #331). The app's own writes are replaceState and fire no hashchange, so a
 * hashchange is always somebody else's link, and the URL is the state: the whole view it names is
 * applied, not only the selection (which is all main.js did before: Back from a dated view of the
 * Moon to a live view of the ISS selected the ISS and left the clock in 2027 on the Moon's map).
 *
 * Returns what to do, for main.js to carry out, or null when the link names no view at all (a bare
 * `#sources`, a moment alone, a format this reader does not know): then nothing is touched.
 *   clock  { goTo: ms, rate } | { live: true } | null    `t` absent means now (spec 0032 req 5)
 *   stage  the stage id the link names, or null
 *   trip   { start: id, stop } | { jump: stop } | { stop: true } | null
 *   event  the mission event, or null
 *   at     { open: id } | { none: true } | null
 * A trip owns its clock and its selection, so a link into a trip sets the clock only when it names
 * an instant, and never `at`. Pure.
 *
 * @param {object} link  read()
 * @param {{at: string|null, trip: string|null, live: boolean}} now  what the app is showing
 */
export function linkChange(link, now = {}) {
  if (!link || link.unknownVersion) return null;
  if (!['trip', 'stop', 'at', 'event', 't', 'rate', 'stage', 'cam'].some((k) => link[k] !== undefined)) return null;
  const out = { clock: null, stage: link.stage || null, trip: null, event: null, at: null };
  const ms = link.t && link.t !== 'now' ? Date.parse(link.t) : NaN;
  const rate = Number(link.rate) > 0 ? Number(link.rate) : 1;
  if (Number.isFinite(ms)) out.clock = { goTo: ms, rate };
  if (link.trip) {
    out.trip = now.trip === link.trip ? { jump: link.stop || '1' } : { start: link.trip, stop: link.stop || null };
    return out;
  }
  if (!out.clock && now.live === false) out.clock = { live: true };
  if (now.trip) out.trip = { stop: true };
  if (link.event) { out.event = link.event; return out; }
  if (link.at) { if (link.at !== now.at) out.at = { open: link.at }; } else if (now.at) out.at = { none: true };
  return out;
}

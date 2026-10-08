// ui/autopilotplan.js -- the arithmetic of a screen that plays on its own (spec 0036).
//
// Exports (all pure: numbers and plain objects in, plain objects out; no document, no clock):
//   readOptions(link, reels, head, tourIds)   what `#ambient=…&shuffle=…&sound=…` asks for
//   createPlaylist(trips, opts)               the order, lap after lap, shuffled or not
//   stopDwellMs(stop, voice)                  how long a stop stays up, read aloud or read
//   reelMs(trips, tours, clips, opts)         one lap's length
//   stopBudgetMs / watchdog(s)                when a stop has taken too long, and what to do
//   controls(state, event, timing)            hands on, hands off: gate, ambient, offered, manual
//   reloadDue(s) / reloadAllowed(history, now) the nightly reload and the guard against a reload loop
//   resumeFrom(link, trips)                   where a reloaded page picks the reel up
//   pushLog(list, entry)                      the quiet log, capped
//
// ui/autopilot.js is the only reader in the app: it owns the timers, the document and the trip.
// tests/test_autopilot.mjs holds every function here.
//
// WHY A WATCHDOG AT ALL. A trip is a chain of callbacks: a flight's onArrive, a settle timer, a
// dwell timer, a clip's end. With a visitor at the screen a broken link in that chain is a Next
// button away from fixed. On a wall there is no visitor, and a museum finds a frozen screen on
// Monday. So every phase has a budget on the WALL clock (setInterval, not the frame loop: a lost
// WebGL context or a starved tab stops frames first), and a phase that outlives it is moved on.

/** The seconds a reel runs by, when registry/autopilot.yaml's mirror does not say. */
export const TIMING = { title_s: 8, gate_s: 10, offer_s: 10, idle_s: 120, cursor_s: 3, reload_h: 12 };

/** `pace` is a TEST-ONLY divisor of the dwells and cards (a probe walks three trips in three minutes). */
export const MAX_PACE = 120;

const OFF_WORDS = ['0', 'off', 'false', 'no'];
const ON_WORDS = ['1', 'on', 'true', 'yes', ''];

/**
 * What the link asks for. `link` is ui/urlstate.js read(): `ambient` (its alias `autopilot` is
 * folded in there), `shuffle`, `sound`, `voice`, `captions`, `pace`, and `trip`/`stop` when a
 * reloaded page is picking a reel up.
 *
 * `ambient` is `1` (the default reel), a reel's id, or trip ids with commas between them (a
 * playlist written by hand: `#ambient=moon-landings,the-sun-today,black-holes`). A word that names
 * nothing plays the default reel and says so in `notes`; a trip id that is not a trip is dropped.
 *
 * @returns {{on:boolean, reel:object|null, trips:string[], shuffle:boolean, sound:'ask'|'off',
 *   soundAsked:boolean, voice:boolean, captions:boolean, pace:number, notes:string[]}}
 */
export function readOptions(link, reels, head, tourIds) {
  const l = link || {};
  const list = Array.isArray(reels) ? reels : [];
  const known = new Set(Array.isArray(tourIds) ? tourIds : []);
  const raw = l.ambient === undefined || l.ambient === null ? null : String(l.ambient).trim().toLowerCase();
  const notes = [];
  const off = { on: false, reel: null, trips: [], shuffle: false, sound: 'off', soundAsked: false, voice: true, captions: true, pace: 1, notes };
  if (raw === null || OFF_WORDS.includes(raw)) return off;
  const fallback = list.find((r) => r.id === (head && head.default)) || list[0] || null;
  let reel = null;
  if (ON_WORDS.includes(raw)) reel = fallback;
  else reel = list.find((r) => r.id === raw) || null;
  if (!reel) {
    // Not a reel: trip ids, one or several.
    const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
    const good = ids.filter((id) => known.has(id));
    for (const id of ids) if (!known.has(id)) notes.push(`unknown:${id}`);
    if (good.length) reel = { id: raw, title: '', blurb: '', sound: 'off', trips: [...new Set(good)], adhoc: true };
    else reel = fallback;
  }
  if (!reel) return off;
  // A trip the reel names that this build does not have (a reel written for a newer one).
  const trips = known.size ? reel.trips.filter((id) => known.has(id)) : reel.trips.slice();
  for (const id of reel.trips) if (known.size && !known.has(id)) notes.push(`unknown:${id}`);
  const flag = (v) => (v === undefined || v === null ? null : !OFF_WORDS.includes(String(v).trim().toLowerCase()));
  const soundFlag = flag(l.sound);
  const pace = Number(l.pace);
  return {
    on: trips.length > 0,
    reel,
    trips,
    shuffle: flag(l.shuffle) === true,
    sound: soundFlag === null ? (reel.sound === 'ask' ? 'ask' : 'off') : (soundFlag ? 'ask' : 'off'),
    // `sound=0` in the link is an order (silence, whatever this browser remembered); a reel's own
    // `off` is only a default, and leaves a visitor's sound as they had it.
    soundAsked: soundFlag !== null,
    voice: flag(l.voice) !== false,
    captions: flag(l.captions) !== false,
    pace: Number.isFinite(pace) && pace >= 1 ? Math.min(MAX_PACE, pace) : 1,
    notes,
  };
}

// --- the order ------------------------------------------------------------------------------------

/** mulberry32: a seed in, the same sequence out, so a shuffled lap can be held by a test. */
export function rng(seed) {
  let a = (Number(seed) || 0) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates on a copy. */
export function shuffled(list, random) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The reel's order, lap after lap. In order, or every lap shuffled afresh (and never the same trip
 * on both sides of a lap's seam). `startAt` is a trip id: the lap begins there (a reloaded page).
 *
 * `advance(played)` moves to the next trip and says whether the one being left was played. A LAP
 * IN WHICH NOTHING PLAYED sets `stalled`: every trip was refused (no place, no data, no network),
 * and the caller must do something other than spin through the list again at once.
 */
export function createPlaylist(trips, opts = {}) {
  const base = Array.isArray(trips) ? trips.slice() : [];
  const random = rng(opts.seed === undefined ? 1 : opts.seed);
  let order = opts.shuffle ? shuffled(base, random) : base.slice();
  let at = 0;
  let lap = 0;
  let playedThisLap = 0;
  let stalled = false;
  if (opts.startAt && order.includes(opts.startAt)) {
    if (opts.shuffle) {
      // The trip the page was on goes first; the rest keep their shuffled order.
      order = [opts.startAt, ...order.filter((id) => id !== opts.startAt)];
    } else {
      at = order.indexOf(opts.startAt);
    }
  }
  return {
    get current() { return order.length ? order[at] : null; },
    get next() { return order.length ? order[(at + 1) % order.length] : null; },
    get index() { return at; },
    get lap() { return lap; },
    get length() { return order.length; },
    get stalled() { return stalled; },
    order: () => order.slice(),
    advance(played) {
      if (!order.length) { stalled = true; return null; }
      if (played) { playedThisLap += 1; stalled = false; }
      at += 1;
      if (at >= order.length) {
        stalled = playedThisLap === 0;
        playedThisLap = 0;
        lap += 1;
        at = 0;
        if (opts.shuffle && order.length > 1) {
          const last = order[order.length - 1];
          order = shuffled(base, random);
          if (order[0] === last) [order[0], order[1]] = [order[1], order[0]];
        }
      }
      return order[at];
    },
  };
}

// --- how long ---------------------------------------------------------------------------------------

/** The silence left after a clip before the camera moves (audio/narration.js TAIL_MS). */
export const VOICE_TAIL_MS = 1000;
/** What one stop costs beside its dwell: a flight and the settle (ui/trip.js, the same estimate). */
export const FLIGHT_MS = 3350;

/**
 * How long a stop stays up. Read ALOUD it is the clip's length and a breath, when that is longer
 * than the card's own reading time; with the sound off (or no clip) it is the reading time. The
 * trip itself keeps to this (ui/trip.js holdDwell); here it is the watchdog's expectation and the
 * reel's stated length.
 * @param {{dwellMs:number}} stop
 * @param {{voiced:boolean, clipSeconds?:number}} voice
 */
export function stopDwellMs(stop, voice = {}) {
  const read = Math.max(0, Number(stop && stop.dwellMs) || 0);
  const clip = voice.voiced ? Number(voice.clipSeconds) || 0 : 0;
  return clip > 0 ? Math.max(read, Math.round(clip * 1000) + VOICE_TAIL_MS) : read;
}

/** A duration at the test pace; never under `floor` (a card nobody could see is not a card). */
export function paced(ms, pace, floor = 400) {
  const p = Number(pace) > 1 ? Number(pace) : 1;
  return p === 1 ? ms : Math.max(floor, Math.round(ms / p));
}

/**
 * One lap, in ms. `tours` are data/tours.js rows (stops with `dwell_ms`), `clips` the narration
 * manifest's `trip/stop -> seconds`.
 */
export function reelMs(trips, tours, clips, opts = {}) {
  const byId = new Map((tours || []).map((t) => [t.id, t]));
  const titleMs = (Number(opts.title_s) || 0) * 1000;
  let total = 0;
  let stops = 0;
  for (const id of trips || []) {
    const tour = byId.get(id);
    if (!tour) continue;
    total += titleMs;
    for (const s of tour.stops || []) {
      stops += 1;
      total += FLIGHT_MS + stopDwellMs({ dwellMs: s.dwell_ms }, { voiced: !!opts.voiced, clipSeconds: clips ? clips[`${id}/${s.id}`] : 0 });
    }
  }
  return { ms: total, stops, minutes: Math.round(total / 60000) };
}

// --- the watchdog -----------------------------------------------------------------------------------

/**
 * The longest each phase may last, ms. Each is the slowest healthy case measured, doubled:
 *   resolving  a trip waits 8 s for each layer it needs (ui/trip.js waitForLayer) and some need three;
 *   intro      the card between two trips is up while the next one waits on its intro (`title_s`);
 *   flight     a climb across three rungs of the ladder with two veils is 20 to 25 s on SwiftShader;
 *   held       a stop waiting on its own event (ui/trip.js holdAt) says so and waits for Next;
 *   paused     nothing pauses a reel but a hidden tab, which resumes itself in a second.
 * `dwellGrace` is added to the stop's own expected dwell: a clip that started late is not a fault.
 */
export const BUDGET = {
  resolving: 45000,
  intro: 30000,
  flight: 60000,
  veil: 30000,
  settle: 15000,
  held: 30000,
  paused: 15000,
  outro: 15000,
  dwellGrace: 20000,
  contextLost: 5000,
  /** A trip may take this many times its own stated length, plus two minutes, before it is left. */
  tripFactor: 3,
  tripSlack: 120000,
  /** This many trips abandoned in a row and the page itself is suspect. */
  skipsBeforeReload: 3,
};

/** The budget of the phase the trip is in. `dwellMs` is the stop's expected dwell (stopDwellMs, paced). */
export function stopBudgetMs(phase, dwellMs = 0) {
  if (phase === 'dwell') return (Number(dwellMs) || 0) + BUDGET.dwellGrace;
  return BUDGET[phase] || BUDGET.flight;
}

/**
 * What to do about the trip, asked once a second.
 *
 * @param {{phase:string, sinceMs:number, dwellMs?:number, nudged?:boolean, tripMs?:number,
 *   tripEstimateMs?:number, skips?:number, hidden?:boolean, lostMs?:number|null}} s
 *   phase     ui/trip.js state.phase
 *   sinceMs   how long the trip has been in this phase at this stop
 *   nudged    whether THIS stop has already been moved on once (a second failure leaves the trip)
 *   tripMs    how long this trip has run; tripEstimateMs its own stated length
 *   skips     trips abandoned in a row
 *   hidden    the tab is hidden: nothing runs and nothing is late
 *   lostMs    how long the WebGL context has been lost, or null
 * @returns {{action:'none'|'play'|'next'|'resume'|'skip-trip'|'reload', why:string}}
 */
export function watchdog(s) {
  const none = { action: 'none', why: '' };
  if (!s || s.hidden) return none;
  if (s.lostMs !== null && s.lostMs !== undefined) {
    return s.lostMs >= BUDGET.contextLost ? { action: 'reload', why: 'context-lost' } : none;
  }
  if ((s.skips || 0) >= BUDGET.skipsBeforeReload) return { action: 'reload', why: 'trips-abandoned' };
  const phase = s.phase;
  if (phase === 'idle') return none;
  const since = Number(s.sinceMs) || 0;
  if (s.tripEstimateMs > 0 && s.tripMs > s.tripEstimateMs * BUDGET.tripFactor + BUDGET.tripSlack) {
    return { action: 'skip-trip', why: 'trip-overran' };
  }
  if (since <= stopBudgetMs(phase, s.dwellMs)) return none;
  if (phase === 'resolving') return { action: 'skip-trip', why: 'never-resolved' };
  if (phase === 'intro') return { action: 'play', why: 'intro-stuck' };
  if (phase === 'paused') return { action: 'resume', why: 'paused-too-long' };
  if (phase === 'outro') return { action: 'skip-trip', why: 'end-stuck' };
  if (phase === 'dwell' || phase === 'held') return { action: 'next', why: `${phase}-overran` };
  // A flight, a veil or a settle that never arrived: once, on to the next stop; twice, out.
  return s.nudged ? { action: 'skip-trip', why: `${phase}-stuck-twice` } : { action: 'next', why: `${phase}-never-arrived` };
}

// --- hands on, hands off ------------------------------------------------------------------------------

/**
 * The four modes of a reel and what moves between them.
 *
 *   gate     one card: "Press any key to start with sound". A key or a touch -> ambient, with
 *            sound; `gate_s` with nobody there -> ambient, silent, captions on.
 *   ambient  playing. A key or a touch -> offered. Escape -> manual at once.
 *   offered  "Take the controls" is up for `offer_s`. Taken -> manual. Left alone -> ambient.
 *            More input keeps it up.
 *   manual   the ordinary app. Every input restarts `idle_s`; when it runs out -> ambient.
 *
 * @param {{mode:string, until:number|null}} state
 * @param {{type:'input'|'take'|'escape'|'tick', at:number}} event
 * @returns {{state:{mode:string, until:number|null}, effect:string|null}}
 *   effect: 'sound' | 'silent' | 'offer' | 'withdraw' | 'take' | 'return' | null
 */
export function controls(state, event, timing = TIMING) {
  const st = state || { mode: 'ambient', until: null };
  const at = Number(event && event.at) || 0;
  const type = event && event.type;
  const offerMs = (timing.offer_s || TIMING.offer_s) * 1000;
  const idleMs = (timing.idle_s || TIMING.idle_s) * 1000;
  const same = { state: st, effect: null };
  if (st.mode === 'gate') {
    if (type === 'input' || type === 'take' || type === 'escape') return { state: { mode: 'ambient', until: null }, effect: 'sound' };
    if (type === 'tick' && st.until !== null && at >= st.until) return { state: { mode: 'ambient', until: null }, effect: 'silent' };
    return same;
  }
  if (st.mode === 'ambient') {
    if (type === 'escape' || type === 'take') return { state: { mode: 'manual', until: at + idleMs }, effect: 'take' };
    if (type === 'input') return { state: { mode: 'offered', until: at + offerMs }, effect: 'offer' };
    return same;
  }
  if (st.mode === 'offered') {
    if (type === 'take' || type === 'escape') return { state: { mode: 'manual', until: at + idleMs }, effect: 'take' };
    if (type === 'input') return { state: { mode: 'offered', until: at + offerMs }, effect: null };
    if (type === 'tick' && at >= st.until) return { state: { mode: 'ambient', until: null }, effect: 'withdraw' };
    return same;
  }
  if (st.mode === 'manual') {
    if (type === 'input' || type === 'take' || type === 'escape') return { state: { mode: 'manual', until: at + idleMs }, effect: null };
    if (type === 'tick' && at >= st.until) return { state: { mode: 'ambient', until: null }, effect: 'return' };
    return same;
  }
  return same;
}

// --- the reload ----------------------------------------------------------------------------------------

/** The small hours, local time: when a screen with sound may reload and go quiet. */
export const QUIET_HOURS = [2, 5];

/**
 * Whether to reload the page now, and why. Only ever BETWEEN two trips.
 *
 * A page that has run for `reloadMs` is reloaded: whatever it has leaked goes, and a newer build
 * that is waiting (site/sw.js) takes over. A reload costs one thing: a browser plays no sound
 * until somebody touches it, so a screen whose sound a person started (`soundOn` and not
 * `autoplayFree`, which is a kiosk started with Chrome's autoplay flag) would fall silent. That
 * screen waits for the small hours, when a silent screen is what a building wants anyway.
 *
 * @param {{betweenTrips:boolean, uptimeMs:number, reloadMs:number, updateReady?:boolean,
 *   soundOn?:boolean, autoplayFree?:boolean, localHour?:number}} s
 * @returns {null|'age'|'update'}
 */
export function reloadDue(s) {
  if (!s || !s.betweenTrips) return null;
  const why = s.updateReady ? 'update' : (s.uptimeMs >= s.reloadMs ? 'age' : null);
  if (!why) return null;
  if (s.soundOn && !s.autoplayFree) {
    const h = Number(s.localHour);
    if (!(h >= QUIET_HOURS[0] && h < QUIET_HOURS[1])) return null;
  }
  return why;
}

/** No more than three reloads in ten minutes: a page that cannot stay up must not strobe. */
export const RELOAD_WINDOW_MS = 10 * 60 * 1000;
export const RELOAD_MAX = 3;
export function reloadAllowed(history, now) {
  const recent = (Array.isArray(history) ? history : []).filter((t) => now - t < RELOAD_WINDOW_MS);
  return recent.length < RELOAD_MAX;
}

/**
 * Where a reloaded page picks the reel up: the trip (and the stop, 1-based as ui/trip.js writes
 * it) its own address still names. null when the link names no trip of this reel.
 */
export function resumeFrom(link, trips) {
  const l = link || {};
  if (!l.trip || !Array.isArray(trips) || !trips.includes(l.trip)) return null;
  const n = /^\d+$/.test(String(l.stop || '')) ? Number(l.stop) : 1;
  return { trip: l.trip, stop: Math.max(0, n - 1) };
}

// --- a stop with nothing to show ----------------------------------------------------------------------

/**
 * Whether the map a stop lays over the globe has failed for good (ui/autopilot.js passes such a stop
 * over). `asked` is the stop's `overlay:`; `over` is main.js ctx.overlayState(): `failed` (the fetch
 * was refused or timed out) and `no-earth` (no globe to lay it on) are final; `loading` is not.
 */
export function stopPictureFailed(asked, over) {
  if (!asked || !over) return false;
  if (over.id && over.id !== asked) return false;
  return over.status === 'failed' || over.status === 'no-earth';
}

/**
 * The reels as the Trips section lists them under "Just watch": the default first, then the
 * registry's order. `minutes` is the registry's own (one lap with the voice).
 */
export function reelRows(reels, def) {
  const list = Array.isArray(reels) ? reels.slice() : [];
  list.sort((a, b) => (b.id === def) - (a.id === def));
  return list.map((r) => ({ id: r.id, title: r.title, blurb: r.blurb || '', minutes: r.minutes, trips: (r.trips || []).length, place: r.place === true }));
}

// --- the log -------------------------------------------------------------------------------------------

export const LOG_CAP = 200;
/** Append, keeping the last LOG_CAP lines. Returns the same array. */
export function pushLog(list, entry, cap = LOG_CAP) {
  list.push(entry);
  if (list.length > cap) list.splice(0, list.length - cap);
  return list;
}

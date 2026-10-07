// ui/autopilot.js -- a screen that plays on its own (spec 0036, internal #114, public #238).
//
// Exports: createAutopilot(ctx, env) -> { start(link, from), stop(), state(), log(), active,
//          engaged, updateWaiting(worker), controllerChanged() }, and createView(doc, timing).
//
// `#ambient=1` (or `#ambient=<reel>`, `#autopilot=…`) in the address, or the "Play on its own" row
// under the trips: the trips of a reel (registry/autopilot.yaml) play back to back in present-mode
// type, each stop staying up for its narration (or its card's reading time with the sound off),
// with one card between two trips, until somebody takes the controls. A corridor, a lobby, an
// observatory's evening.
//
// IMPORTED ON DEMAND, by main.js, never at boot: this file, its plan, its reels, its words and its
// stylesheet are fetched when the link or the row asks (tests/test_boot_diet.mjs).
//
// IT DRIVES THE TRIP; IT IS NOT A SECOND ONE. Every flight, card, clip and caption is ui/trip.js
// and ui/tripframe.js doing what they do for a visitor, in present mode with auto pacing
// (tripframe asks `ctx.autopilot.active`). What is here is what a visitor would otherwise be: the
// hand that presses Start, the eye that notices nothing has moved, the decision to go on.
//
// WHAT "NEVER STUCK" IS MADE OF
//   - the watchdog (ui/autopilotplan.js watchdog): once a second, on the wall clock, each phase of
//     the trip against its budget. Overdue: Next once, then the trip is left for the next one.
//   - a trip that cannot run today (its layer is not here, the network is gone, it needs a place
//     nobody set) is refused by ui/trip.js start() and skipped here, with a line in the log and
//     nothing on screen. A lap in which nothing could play falls back to the default reel, then waits.
//   - a lost WebGL context that the browser does not hand back in five seconds: the page reloads
//     and picks the reel up at the stop its own address names (ui/trip.js writes it).
//   - between two trips: the last trip's selection is let go, the renderer's own counts go in the
//     log, a newer build that is waiting takes over, and a page older than `reload_h` reloads.
//   - three trips abandoned in a row: the page reloads. Never more than three reloads in ten minutes.
//
// THE LOG is quiet: `console.info('[autopilot]', …)`, the last 200 lines in sessionStorage
// (`sr:ambient:log`, so they survive the reload they explain) and on `spaceRadar.autopilot.log()`.
// Nothing of it is ever on screen.
import { COPY, t } from '../copy/en.js';
import '../copy/en.later.js';
import { AUTOPILOT, REELS } from '../data/autopilot.js';
import {
  TIMING, readOptions, createPlaylist, stopDwellMs, paced, reelMs, watchdog, controls,
  reloadDue, reloadAllowed, resumeFrom, pushLog,
} from './autopilotplan.js';
import { write as writeUrl, clear as clearUrl } from './urlstate.js';

export const ROOT_CLASS = 'sr-ambient';
export const LOG_KEY = 'sr:ambient:log';
export const RELOADS_KEY = 'sr:ambient:reloads';
export const SOUND_KEY = 'sr:ambient:sound';
/** Every key the mode owns in the address. */
export const URL_KEYS = ['ambient', 'autopilot', 'shuffle', 'sound', 'voice', 'captions', 'pace'];
/** The pause between a trip's last stop and the next trip's card: the scene alone. */
const BREATH_MS = 1500;
/** A lap in which no trip could run: how long before the list is tried again. */
const STALL_WAIT_MS = 60000;
/** No trip playing and none on its way for this long: the controller kicks itself. */
const BETWEEN_BUDGET_MS = 90000;

function el(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** autopilot.css, linked once, when the mode first starts. */
function linkCss(doc) {
  try {
    const href = new URL('../../css/autopilot.css', import.meta.url).href;
    if ([...doc.querySelectorAll('link[rel=stylesheet]')].some((l) => l.href === href)) return;
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    doc.head.appendChild(link);
  } catch { /* a test's document */ }
}

/**
 * What the mode puts on the page: a shield over everything (so a passing hand offers the controls
 * instead of swinging the camera), the small mark, one card (the sound question, the next trip's
 * title) and the "Take the controls" button. It reports input; it decides nothing.
 */
export function createView(doc, timing = TIMING) {
  const win = doc.defaultView || window;
  const root = doc.documentElement;
  const A = COPY.autopilot;
  let host = null;
  let parts = null;
  let mode = 'ambient';
  let onInput = () => {};
  let stillTimer = 0;
  let lastManual = 0;

  function build() {
    host = el(doc, 'div', 'sr-ambient__host');
    const shield = el(doc, 'div', 'sr-ambient__shield');
    const mark = el(doc, 'div', 'sr-ambient__mark', A.mark);
    mark.setAttribute('aria-hidden', 'true');
    const card = el(doc, 'div', 'sr-ambient__card sr-float');
    card.setAttribute('role', 'status');
    card.hidden = true;
    const micro = el(doc, 'p', 'sr-micro sr-ambient__micro');
    const title = el(doc, 'h2', 'sr-ambient__title');
    const meta = el(doc, 'p', 'sr-ambient__meta');
    const text = el(doc, 'p', 'sr-ambient__text');
    card.append(micro, title, meta, text);
    const take = el(doc, 'button', 'sr-ambient__take sr-float', A.take);
    take.type = 'button';
    take.title = A.takeTitle;
    take.hidden = true;
    take.addEventListener('click', (e) => { e.stopPropagation(); onInput('take'); });
    host.append(shield, mark, card, take);
    parts = { shield, card, micro, title, meta, text, take };
    for (const type of ['pointerdown', 'wheel', 'touchstart']) {
      shield.addEventListener(type, (e) => {
        if (type !== 'touchstart') e.preventDefault();
        e.stopPropagation();
        onInput('input');
      }, { passive: type === 'touchstart' });
    }
    shield.addEventListener('pointermove', moved);
    shield.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** The pointer shows while it moves and hides `cursor_s` after it stops. */
  function moved() {
    if (!parts) return;
    parts.shield.classList.remove('is-still');
    win.clearTimeout(stillTimer);
    stillTimer = win.setTimeout(() => { if (parts) parts.shield.classList.add('is-still'); }, (timing.cursor_s || TIMING.cursor_s) * 1000);
  }

  function onKey(e) {
    if (mode === 'manual') { manualInput(); return; }
    // The browser's own keys stay the browser's: a shortcut, a function key, a bare modifier.
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(F\d+|Shift|Control|Alt|Meta|CapsLock)$/.test(e.key)) return;
    const onTake = parts && e.target === parts.take && (e.key === 'Enter' || e.key === ' ');
    if (onTake) return; // the button's own click follows
    // Before ui/tripframe.js's capture listener on the document: in this mode no key is the trip's.
    e.stopImmediatePropagation();
    e.preventDefault();
    onInput(e.key === 'Escape' ? 'escape' : 'input');
  }

  /** With the controls taken, any sign of a hand restarts the idle count. At most once a second. */
  function manualInput() {
    if (mode !== 'manual') return;
    const now = Date.now();
    if (now - lastManual < 1000) return;
    lastManual = now;
    onInput('input');
  }
  const MANUAL_EVENTS = ['pointerdown', 'pointermove', 'wheel', 'touchstart'];

  return {
    mount() {
      if (host) return;
      linkCss(doc);
      build();
      doc.body.appendChild(host);
      win.addEventListener('keydown', onKey, true);
      for (const type of MANUAL_EVENTS) win.addEventListener(type, manualInput, { capture: true, passive: true });
      moved();
    },
    unmount() {
      if (!host) return;
      win.removeEventListener('keydown', onKey, true);
      for (const type of MANUAL_EVENTS) win.removeEventListener(type, manualInput, { capture: true });
      win.clearTimeout(stillTimer);
      host.remove();
      host = null;
      parts = null;
      root.classList.remove(ROOT_CLASS, `${ROOT_CLASS}--nocaptions`);
    },
    onInput(fn) { onInput = typeof fn === 'function' ? fn : () => {}; },
    /** 'ambient' (also the gate and the offer): the reel has the screen. 'manual': the visitor has. */
    setMode(next) {
      mode = next === 'manual' ? 'manual' : 'ambient';
      root.classList.toggle(ROOT_CLASS, mode === 'ambient');
      if (host) host.hidden = mode === 'manual';
    },
    captions(on) { root.classList.toggle(`${ROOT_CLASS}--nocaptions`, !on); },
    /** The one card, or none. `kind` is 'gate' or 'title'. */
    card(c) {
      if (!parts) return;
      parts.card.hidden = !c;
      if (!c) return;
      parts.card.dataset.kind = c.kind;
      parts.micro.textContent = c.micro || '';
      parts.micro.hidden = !c.micro;
      parts.title.textContent = c.title || '';
      parts.meta.textContent = c.meta || '';
      parts.meta.hidden = !c.meta;
      parts.text.textContent = c.text || '';
      parts.text.hidden = !c.text;
    },
    offer(on) {
      if (!parts) return;
      parts.take.hidden = !on;
      if (on) { try { parts.take.focus({ preventScroll: true }); } catch { /* not focusable yet */ } }
    },
  };
}

function sessionStore() {
  try { return window.sessionStorage; } catch { return null; }
}
function readJson(store, key, fallback) {
  try { const v = store && store.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function writeJson(store, key, value) {
  try { if (store) store.setItem(key, JSON.stringify(value)); } catch { /* full, or private mode */ }
}

/**
 * @param {object} ctx  the app (ctx.trip, ctx.audio, ctx.renderer, ctx.deselect, …)
 * @param {object} [env]  for tests: { view, timers: {set, clear, every, stop, now}, storage,
 *   reload, document, navigator, seed, wall: () => ms, hour: () => 0..23 }
 */
export function createAutopilot(ctx, env = {}) {
  const doc = env.document || (typeof document !== 'undefined' ? document : null);
  const nav = env.navigator || (typeof navigator !== 'undefined' ? navigator : {});
  const timers = env.timers || {
    set: (fn, ms) => setTimeout(fn, ms),
    clear: (id) => clearTimeout(id),
    every: (fn, ms) => setInterval(fn, ms),
    stop: (id) => clearInterval(id),
    now: () => performance.now(),
  };
  const wall = env.wall || (() => Date.now());
  const hour = env.hour || (() => new Date().getHours());
  const store = env.storage !== undefined ? env.storage : sessionStore();
  const reload = env.reload || (() => location.reload());
  const T = { ...TIMING, ...(AUTOPILOT.timing || {}) };
  const view = env.view || createView(doc, T);
  const A = COPY.autopilot;

  const lines = readJson(store, LOG_KEY, []);
  const bootAt = timers.now();
  let opts = null;
  let playlist = null;
  let from = 'link';
  let mode = { mode: 'ambient', until: null };
  let engaged = false;
  /** The trip being played: { id, phase, index, key, since, nudged, reached, started, startedAt, estimateMs, dwellMs }. */
  let playing = null;
  let betweenSince = bootAt;
  let pending = 0;       // a timer that will start the next trip, so "between" is not "stuck"
  let token = 0;         // bumped whenever a step is abandoned: a late promise or timer is ignored
  let skips = 0;
  let soundOn = false;
  let autoplayFree = false;
  let voiceSet = false;
  let lostAt = null;
  let updateReady = false;
  let waitingWorker = null;
  let reloadHeldUntil = 0;
  let resumeStop = 0;
  let gateDone = null;
  let watch = 0;
  let paceTimer = 0;
  let lock = null;
  let clips = null;
  let offTrip = null;
  let played = 0;

  function say(what, detail) {
    const entry = { t: Math.round((timers.now() - bootAt) / 1000), what, ...(detail || {}) };
    pushLog(lines, entry);
    writeJson(store, LOG_KEY, lines);
    try { console.info('[autopilot]', what, detail ? JSON.stringify(detail) : ''); } catch { /* no console */ }
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(new CustomEvent('sr:autopilot', { detail: entry }));
    } catch { /* a test */ }
    return entry;
  }

  const tours = () => (ctx.trip && typeof ctx.trip.tours === 'function' ? ctx.trip.tours() : []);
  const tourOf = (id) => tours().find((x) => x.id === id) || null;
  const audioRuns = () => !!(ctx.audio && ctx.audio.isOn() && ctx.audio.context && ctx.audio.context.state === 'running');
  const wait = (ms) => new Promise((resolve) => { timers.set(resolve, ms); });

  /** What the renderer holds, for the log: the proof that trips give back what they took. */
  function memory() {
    const info = ctx.renderer && ctx.renderer.info;
    if (!info || !info.memory) return null;
    const heap = typeof performance !== 'undefined' && performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
    return { geo: info.memory.geometries, tex: info.memory.textures, prog: info.programs ? info.programs.length : null, heapMb: heap };
  }

  // ---------------------------------------------------------------------------- the screen

  function wake() {
    try {
      if (!nav.wakeLock || (doc && doc.hidden) || lock) return;
      nav.wakeLock.request('screen').then((l) => {
        lock = l;
        if (l && typeof l.addEventListener === 'function') l.addEventListener('release', () => { lock = null; });
      }, () => { /* refused: a battery saver, or no permission */ });
    } catch { /* not supported */ }
  }
  function sleep() {
    try { if (lock && typeof lock.release === 'function') lock.release(); } catch { /* gone already */ }
    lock = null;
  }

  const onVisible = () => {
    if (!engaged || !doc || doc.hidden) return;
    wake();
    // Nothing ran while the tab was hidden, so nothing is late.
    const now = timers.now();
    if (playing) playing.since = now;
    betweenSince = now;
  };
  const onWebgl = (e) => {
    const state = e && e.detail && e.detail.state;
    if (state === 'lost') { lostAt = timers.now(); say('context-lost'); }
    if (state === 'restored') { say('context-restored', { after_s: lostAt === null ? 0 : Math.round((timers.now() - lostAt) / 100) / 10 }); lostAt = null; }
  };

  // ---------------------------------------------------------------------------- the sound

  /**
   * Sound needs a hand: a browser plays nothing before a key or a touch. So a reel that wants
   * sound tries (a kiosk browser started with the autoplay flag, or a visitor who pressed the row,
   * needs no question), and otherwise asks once, for `gate_s`, and then starts silent with captions.
   */
  async function beginSound() {
    const audio = ctx.audio;
    if (!audio) return;
    const remembered = !!(store && store.getItem && store.getItem(SOUND_KEY) === '1');
    const want = opts.sound === 'ask' || (remembered && !opts.soundAsked);
    if (!want) {
      if (opts.soundAsked && audio.isOn()) audio.disable();
      soundOn = audioRuns();
      return;
    }
    const touched = !!(nav.userActivation && nav.userActivation.hasBeenActive);
    try { audio.enable(); } catch { /* no AudioContext */ }
    await wait(300);
    if (audioRuns()) {
      soundOn = true;
      autoplayFree = !touched;
      say('sound', { how: touched ? 'gesture' : 'autoplay' });
      return;
    }
    mode = { mode: 'gate', until: timers.now() + paced(T.gate_s * 1000, opts.pace) };
    view.card({ kind: 'gate', title: A.gateTitle, text: t(A.gateNote, { n: String(T.gate_s) }) });
    await new Promise((resolve) => { gateDone = resolve; });
    gateDone = null;
  }

  function setVoice() {
    const narration = ctx.audio && ctx.audio.narration;
    if (voiceSet || !narration || !soundOn) return;
    voiceSet = true;
    if (narration.isOn() !== opts.voice) narration.setOn(opts.voice);
  }

  // ---------------------------------------------------------------------------- the trips

  function cardFor(row) {
    const full = tourOf(row.id) || row;
    let minutes = Math.max(1, Math.round((row.estimate_ms || 0) / 60000));
    if (Array.isArray(full.stops)) {
      minutes = Math.max(1, reelMs([row.id], [full], clips, { voiced: soundOn && opts.voice }).minutes);
    }
    const count = Array.isArray(full.stops) ? full.stops.length : row.count || 0;
    return { kind: 'title', micro: A.upNext, title: row.title, meta: t(A.shape, { n: String(count), m: String(minutes) }), text: row.blurb || '' };
  }

  function nextTrip() {
    pending = 0;
    if (!engaged || mode.mode === 'manual' || playing) return;
    const mine = ++token;
    const now = timers.now();
    betweenSince = now;
    const due = reloadDue({
      betweenTrips: true, uptimeMs: now - bootAt, reloadMs: T.reload_h * 3600000, updateReady,
      soundOn, autoplayFree, localHour: hour(),
    });
    if (due && played > 0 && doReload(due)) return;
    if (playlist.stalled) { stalled(); return; }
    const id = playlist.current;
    const row = tourOf(id);
    if (!row) { say('skip', { trip: id, why: 'not-a-trip' }); playlist.advance(false); pending = timers.set(nextTrip, 0); return; }
    playing = { id, phase: 'resolving', index: -1, key: '', since: now, nudged: false, reached: 0, started: false, startedAt: now, estimateMs: row.estimate_ms || 0, dwellMs: 0 };
    const startStop = resumeStop;
    resumeStop = 0;
    Promise.resolve().then(() => ctx.trip.start(id)).catch(() => null).then((plan) => {
      if (mine !== token || !playing || playing.id !== id) return null;
      if (!plan || plan.offerable === false) {
        // Refused: no place, no data, no network. Said in the log; the screen moves on.
        endTrip('skipped', plan ? 'refused' : 'did-not-load', plan && plan.reason);
        return null;
      }
      playing.since = timers.now();
      view.card(cardFor(row));
      return wait(paced(T.title_s * 1000, opts.pace)).then(() => plan);
    }).then((plan) => {
      if (!plan || mine !== token || !playing || playing.id !== id) return;
      view.card(null);
      if (startStop > 0 && plan.count > 1) ctx.trip.jumpTo(Math.min(startStop, plan.count - 1));
      playing.started = true;
      playing.startedAt = timers.now();
      playing.since = playing.startedAt;
      say('trip-start', { trip: id, stops: plan.count, from: startStop ? startStop + 1 : 1, dropped: plan.dropped ? (plan.dropped.length || plan.dropped) : 0 });
      ctx.trip.play();
    });
  }

  /** Every trip of the lap was refused. The default reel first; then wait and try the list again. */
  function stalled() {
    const fallback = REELS.find((r) => r.id === AUTOPILOT.default);
    if (fallback && opts.reel.id !== fallback.id) {
      say('fallback', { from: opts.reel.id, to: fallback.id });
      opts = { ...opts, reel: fallback, trips: fallback.trips.slice() };
      playlist = createPlaylist(opts.trips, { shuffle: opts.shuffle, seed: env.seed === undefined ? wall() : env.seed });
      pending = timers.set(nextTrip, 0);
      return;
    }
    say('nothing-to-play', { retry_s: STALL_WAIT_MS / 1000 });
    playlist = createPlaylist(opts.trips, { shuffle: opts.shuffle, seed: env.seed === undefined ? wall() : env.seed });
    pending = timers.set(nextTrip, STALL_WAIT_MS);
  }

  function expectedDwell(st) {
    const stop = (st.stops || [])[st.index];
    const key = `${st.tourId}/${st.stopId}`;
    const narration = ctx.audio && ctx.audio.narration;
    const voiced = !!(soundOn && narration && typeof narration.willSpeak === 'function' && narration.willSpeak(key));
    const seconds = voiced && typeof narration.secondsOf === 'function' ? narration.secondsOf(key) : 0;
    return stopDwellMs({ dwellMs: stop ? stop.dwellMs : 0 }, { voiced, clipSeconds: seconds });
  }

  function onTrip(st) {
    if (!engaged || !st) return;
    setVoice();
    if (!playing || mode.mode === 'manual') return;
    if (st.tourId && st.tourId !== playing.id) return;
    const key = `${st.phase}:${st.index}`;
    if (key === playing.key) return;
    const now = timers.now();
    playing.key = key;
    playing.phase = st.phase;
    playing.since = now;
    if (st.index !== playing.index) { playing.index = st.index; playing.nudged = false; }
    if (st.phase === 'settle') {
      playing.reached += 1;
      skips = 0;
      say('stop', { trip: playing.id, n: st.index + 1, of: st.count, id: st.stopId });
    } else if (st.phase === 'dwell') {
      playing.dwellMs = paced(expectedDwell(st), opts.pace);
      // The reel paces the stop itself at the test pace, and under prefers-reduced-motion, where
      // ui/trip.js makes every stop wait for Next (a cut arriving unbidden is its rule for a
      // visitor; a wall has nobody to press it). The flights are still cuts and nothing drifts.
      if (opts.pace > 1 || st.pacing === 'reader') {
        const index = st.index;
        timers.clear(paceTimer);
        paceTimer = timers.set(() => {
          if (playing && playing.index === index && playing.phase === 'dwell') ctx.trip.next();
        }, playing.dwellMs);
      }
    } else if (st.phase === 'outro') {
      // Not from inside the trip's own notify: the frame paints its end card after this listener.
      const mine = token;
      const id = playing.id;
      timers.set(() => { if (mine === token && playing && playing.id === id) endTrip('done'); }, paced(BREATH_MS, opts.pace));
    } else if (st.phase === 'idle' && playing.started) {
      endTrip('left', st.reason || 'stopped');
    }
  }

  /** The trip is over, however it ended: let go of what it held, note the counts, go on. */
  function endTrip(how, why, detail) {
    const p = playing;
    if (!p) return;
    playing = null;
    token += 1;
    timers.clear(paceTimer);
    view.card(null);
    const now = timers.now();
    betweenSince = now;
    try { ctx.trip.stop('ambient', { stay: true }); } catch { /* nothing was running */ }
    // What the trip left selected is let go, so the hero pool gives its model back and the next
    // trip does not start with a card open under it.
    try { if (typeof ctx.deselect === 'function') ctx.deselect(); } catch { /* nothing selected */ }
    if (how === 'done' || p.reached > 0) played += 1;
    const entry = { trip: p.id, how, stops: p.reached, s: Math.round((now - p.startedAt) / 1000) };
    if (why) entry.why = why;
    if (detail) entry.detail = String(detail).slice(0, 80);
    if (how === 'skipped' && why !== 'refused' && why !== 'did-not-load') skips += 1;
    const mem = memory();
    if (mem) entry.mem = mem;
    say(how === 'done' ? 'trip-end' : 'skip', entry);
    playlist.advance(p.reached > 0);
    pending = timers.set(nextTrip, 0);
  }

  // ---------------------------------------------------------------------------- the watchdog

  function tick() {
    if (!engaged) return;
    const now = timers.now();
    step({ type: 'tick', at: now });
    if (!engaged || mode.mode === 'manual' || mode.mode === 'gate') return;
    const hidden = !!(doc && doc.hidden);
    if (!playing) {
      if (!hidden && lostAt === null && !pending && now - betweenSince > BETWEEN_BUDGET_MS) {
        say('watchdog', { why: 'between-stuck' });
        betweenSince = now;
        nextTrip();
        return;
      }
      if (lostAt === null) return;
    }
    const verdict = watchdog({
      phase: playing ? playing.phase : 'idle',
      sinceMs: playing ? now - playing.since : 0,
      dwellMs: playing ? playing.dwellMs : 0,
      nudged: playing ? playing.nudged : false,
      tripMs: playing && playing.started ? now - playing.startedAt : 0,
      tripEstimateMs: playing ? paced(playing.estimateMs, opts.pace) + (opts.pace > 1 ? playing.estimateMs / 2 : 0) : 0,
      skips,
      hidden,
      lostMs: lostAt === null ? null : now - lostAt,
    });
    if (verdict.action === 'none') return;
    if (verdict.action === 'reload') {
      if (doReload(verdict.why)) return;
      skips = 0; // held back by the reload guard: carry on with the list rather than freeze
      return;
    }
    say('watchdog', { action: verdict.action, why: verdict.why, trip: playing && playing.id, n: playing ? playing.index + 1 : 0 });
    if (!playing) return;
    playing.since = now;
    try {
      if (verdict.action === 'play') ctx.trip.play();
      else if (verdict.action === 'resume') ctx.trip.resume();
      else if (verdict.action === 'next') { playing.nudged = true; ctx.trip.next(); }
      else if (verdict.action === 'skip-trip') endTrip('skipped', verdict.why);
    } catch (e) {
      endTrip('skipped', 'threw', e && e.message);
    }
  }

  /**
   * Reload the page and pick the reel up where its address says. Returns false when the guard
   * holds it back (three reloads in ten minutes): then the reel goes on as it is.
   */
  function doReload(why) {
    const now = timers.now();
    if (now < reloadHeldUntil) return false;
    const history = readJson(store, RELOADS_KEY, []).filter((x) => Number.isFinite(x));
    if (!reloadAllowed(history, wall())) {
      reloadHeldUntil = now + 60000;
      say('reload-held', { why });
      return false;
    }
    if (why === 'update' && waitingWorker) {
      // The newer build takes over first (site/sw.js); its `controllerchange` comes back here.
      try { waitingWorker.postMessage({ type: 'sr-skip-waiting' }); } catch { /* it has gone */ }
      waitingWorker = null;
    }
    history.push(wall());
    writeJson(store, RELOADS_KEY, history.slice(-10));
    say('reload', { why, up_h: Math.round((now - bootAt) / 360000) / 10 });
    // Mid-trip the address already names the trip and its stop (ui/trip.js). Between two, name
    // the one that was about to start, so the lap goes on instead of starting again.
    if (!playing && playlist && playlist.current) { try { writeUrl({ trip: playlist.current, stop: null }); } catch { /* no address bar */ } }
    engaged = false;
    timers.set(() => reload(), why === 'update' ? 1500 : 0);
    return true;
  }

  // ---------------------------------------------------------------------------- hands on, hands off

  function step(event) {
    const out = controls(mode, event, { ...T, offer_s: T.offer_s / (opts ? opts.pace : 1), idle_s: T.idle_s / (opts ? opts.pace : 1) });
    mode = out.state;
    const effect = out.effect;
    if (!effect) return;
    if (effect === 'sound' || effect === 'silent') {
      view.card(null);
      if (effect === 'sound') {
        // Inside the key or the touch itself: the only place a browser lets sound start.
        try { ctx.audio.enable(); } catch { /* no AudioContext */ }
        soundOn = true;
        try { if (store) store.setItem(SOUND_KEY, '1'); } catch { /* private mode */ }
      } else {
        try { if (ctx.audio && ctx.audio.isOn()) ctx.audio.disable(); } catch { /* nothing to stop */ }
        soundOn = false;
      }
      say('sound', { how: effect === 'sound' ? 'key' : 'none: silent, with captions' });
      if (gateDone) gateDone();
      return;
    }
    if (effect === 'offer') { view.offer(true); return; }
    if (effect === 'withdraw') { view.offer(false); return; }
    if (effect === 'take') { take(); return; }
    if (effect === 'return') back();
  }

  /** The visitor has the map. The trip stops where it is; the camera stays (ui/trip.js `stay`). */
  function take() {
    view.offer(false);
    say('controls', { who: 'visitor', trip: playing && playing.id, n: playing ? playing.index + 1 : 0 });
    token += 1;
    timers.clear(paceTimer);
    timers.clear(pending);
    pending = 0;
    if (playing) playlist.advance(true);
    playing = null;
    api.active = false;
    view.card(null);
    try { ctx.trip.stop('controls', { stay: true }); } catch { /* nothing was running */ }
    // Started from the row by somebody at their own computer: taking the controls ends the mode.
    // A screen opened by its link is a kiosk: it takes itself back after `idle_s` with no hand.
    if (from === 'row') { stop(); return; }
    view.setMode('manual');
  }

  function back() {
    if (!engaged) return;
    say('controls', { who: 'reel' });
    api.active = true;
    view.setMode('ambient');
    // Whatever the visitor left running or selected is put down before the reel goes on.
    try { ctx.trip.stop('ambient', { stay: true }); } catch { /* nothing was running */ }
    try { if (typeof ctx.deselect === 'function') ctx.deselect(); } catch { /* nothing selected */ }
    betweenSince = timers.now();
    pending = timers.set(nextTrip, 0);
  }

  // ---------------------------------------------------------------------------- start, stop

  /**
   * @param {object} link  ui/urlstate.js read(): `ambient` and the mode's other keys, and
   *   `trip`/`stop` when a reloaded page is picking the reel up
   * @param {'link'|'row'} [origin]  the address (a kiosk) or the "Play on its own" row
   * @returns {boolean} whether a reel is now running
   */
  function start(link, origin = 'link') {
    const ids = tours().map((x) => x.id);
    const o = readOptions(link, REELS, AUTOPILOT, ids);
    if (!o.on) { if (engaged) stop(); return false; }
    if (engaged && opts && o.reel.id === opts.reel.id) {
      if (mode.mode === 'manual') { mode = { mode: 'ambient', until: null }; back(); }
      return true;
    }
    // Another reel asked for over a running one: the first is put down, the address is kept.
    if (engaged) stop(true);
    opts = o;
    from = origin === 'row' ? 'row' : 'link';
    engaged = true;
    api.active = true;
    mode = { mode: 'ambient', until: null };
    const resume = resumeFrom(link, o.trips);
    resumeStop = resume ? resume.stop : 0;
    playlist = createPlaylist(o.trips, { shuffle: o.shuffle, seed: env.seed === undefined ? wall() : env.seed, startAt: resume ? resume.trip : null });
    view.mount();
    view.onInput((kind) => step({ type: kind, at: timers.now() }));
    view.setMode('ambient');
    view.captions(o.captions);
    // The row's reel is in the address too, so the page's own reload keeps playing it.
    try { if (from === 'row') writeUrl({ ambient: link && link.ambient ? link.ambient : '1' }); } catch { /* no address bar */ }
    wake();
    if (doc && doc.addEventListener) doc.addEventListener('visibilitychange', onVisible);
    if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('sr:webgl', onWebgl);
    if (!offTrip && ctx.trip && typeof ctx.trip.onChange === 'function') offTrip = ctx.trip.onChange(onTrip);
    watch = timers.every(tick, 1000);
    say('start', { reel: o.reel.id, trips: o.trips.length, shuffle: o.shuffle, sound: o.sound, pace: o.pace, resume: resume ? `${resume.trip}:${resume.stop + 1}` : '' });
    for (const n of o.notes) say('note', { n });
    // A trip the visitor had open is put down first; the reel starts from where the camera is.
    try { if (ctx.trip.state && ctx.trip.state.phase !== 'idle') ctx.trip.stop('ambient', { stay: true }); } catch { /* none */ }
    const mine = token;
    const ready = () => { if (engaged && mine === token && mode.mode !== 'manual') nextTrip(); };
    Promise.resolve()
      .then(() => beginSound())
      // The clip lengths, for the card's minutes; a reel plays without them.
      .then(() => (env.clips !== undefined ? env.clips : import('../data/narration.js').then((m) => m.NARRATION.clips).catch(() => null)))
      .then((c) => { clips = c || null; })
      // Some trips' stops are stars and exoplanets, which land after the first visit (main.js).
      .then(() => (typeof ctx.loadAfterFirstVisit === 'function' ? ctx.loadAfterFirstVisit() : null))
      .catch((e) => { say('note', { n: `start: ${e && e.message}` }); })
      .then(ready);
    return true;
  }

  /** Out of the mode. `keepAddress`: another reel is about to start from the same link. */
  function stop(keepAddress) {
    if (!engaged && !playing) return;
    say('stop-reel');
    engaged = false;
    api.active = false;
    token += 1;
    timers.stop(watch);
    timers.clear(paceTimer);
    timers.clear(pending);
    pending = 0;
    const was = playing;
    playing = null;
    if (gateDone) gateDone();
    if (doc && doc.removeEventListener) doc.removeEventListener('visibilitychange', onVisible);
    if (typeof window !== 'undefined' && window.removeEventListener) window.removeEventListener('sr:webgl', onWebgl);
    sleep();
    view.unmount();
    try { if (keepAddress !== true) clearUrl(URL_KEYS); } catch { /* no address bar */ }
    if (was) { try { ctx.trip.stop('left', { stay: true }); } catch { /* nothing was running */ } }
  }

  const api = {
    start,
    stop: () => stop(),
    /** The reel has the screen right now (not the visitor): ui/tripframe.js and ui/offline.js ask. */
    active: false,
    get engaged() { return engaged; },
    /** A newer build is installed and waiting (ui/offline.js): it takes over between two trips. */
    updateWaiting(worker) { waitingWorker = worker || null; updateReady = true; say('update-waiting'); },
    /** Another tab let the newer build in: this page's code is the old build's. Between two trips. */
    controllerChanged() { updateReady = true; if (!playing && engaged) doReload('update'); },
    state() {
      return {
        engaged, mode: mode.mode, reel: opts ? opts.reel.id : null, trip: playing ? playing.id : null,
        phase: playing ? playing.phase : null, index: playing ? playing.index : -1,
        lap: playlist ? playlist.lap : 0, at: playlist ? playlist.index : 0, played, skips,
        soundOn, autoplayFree, lost: lostAt !== null, up_s: Math.round((timers.now() - bootAt) / 1000), memory: memory(),
      };
    },
    log: () => lines.slice(),
  };
  return api;
}

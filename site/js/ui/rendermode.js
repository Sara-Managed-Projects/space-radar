// ui/rendermode.js -- the app as a film camera: `?render=1#trip=<id>` plays one trip a frame at a
// time, on a clock of its own, for tools/render-trip.mjs to photograph (spec 0070).
//
// Contract exports: renderOptions(search) -> opts | null        whether, and how, to render
//                   createVirtualTime(g, opts) -> { step, redraw, jumpTo, now, dateNow, real }
//                   install(opts, g?) -> mode { attach(ctx), ready, frame(n), ... }   (window.__srRender)
//                   truthLine(tour, epochMs), tripUrl(id), cardOpacity(...), lowerThird(...)
//                   TITLE_S, END_S, FADE_S, WARM_S
//
// Ivan, 2026-10-02: "generate videos of trips with speech for YouTube". A screen recording of the
// live app drops frames whenever the machine is slow, and the machine that renders is a headless
// Chrome that may be drawing in software. So nothing here is recorded in real time:
//
//   * TIME IS OURS. install() replaces what the page calls time -- Date, performance.now,
//     requestAnimationFrame, setTimeout, setInterval, requestIdleCallback -- with one counter that
//     moves only when frame(n) is called, by exactly 1000 / fps ms. ui/trip.js's dwells, the
//     camera's flights, the veil, the clock the satellites are propagated to: all of them read that
//     counter without knowing, so no module had to learn a second way to keep time. CSS and Web
//     Animations are stepped by the same amount (stepAnimations), so the veil's fade is frames too.
//   * A FRAME IS FINISHED BEFORE IT IS TAKEN. Every fetch, body read, image decode, three.js load
//     and worker round trip is counted; frame(n) resolves only when none is in flight, and draws the
//     frame again if something landed while it waited. However slow the disc or the GPU, frame n
//     shows what frame n shows.
//   * NOTHING BUT THE SCENE AND A LOWER THIRD. The shell, the card, the toolbar, the hint and the
//     toasts are hidden (a class on <html>, like the clear screen's); the trip frame is never
//     imported. What is drawn over the scene is the title card, the stop's name in Inter 600 with
//     a small "spaceradar.ai", optional captions from the clips' own WebVTT, and the end card.
//   * THE VOICE IS NOT PLAYED HERE. Each stop is held for its clip (audio/narration.js holdFor,
//     the same sum the live trip makes) and the tool lays the files on the sound track at the
//     frames this module reports (`stops`).
//   * OPENS ON ONE LINE OF TRUTH (internal #307): what the positions were computed for, and from.
//
// OFF THE FIRST VISIT: main.js imports this only when the address says `render=1`
// (tests/test_first_visit_bytes.mjs holds it out of the static graph).

import { COPY } from '../copy/en.js';
import '../copy/en.later.js';
import { TOURS } from '../data/tours.js';
import { NARRATION } from '../data/narration.js';
import { clipKey, clipRow, holdFor, parseVtt, cueAt } from '../audio/narration.js';
import { rungOf } from '../audio/pick.js';
import { isLadderStage } from '../scene/stage.js';

/** The title card, the end card and their fades, in seconds of film. */
export const TITLE_S = 3;
export const END_S = 3;
export const FADE_S = 0.6;
/** Film time run before frame 0 once the trip is at its intro: the later layers (3 s), the aurora
 * (4 s) and today's clouds (8 s) are all asked for by timers counted from sr:layers-ready. */
export const WARM_S = 12;
/** performance.now() at frame 0, whatever the boot took: far past any boot, so the jump is forward. */
const FILM_START_MS = 3600000;
/** A stop the trip could not resolve waits for a person; the film moves on after this long. */
const HELD_MS = 1500;

/**
 * `?render=1&fps=30&at=<epoch ms>&captions=1&stops=2` -> options, or null when this is not a render.
 * Pure. A query and not the hash: it is not view state and ui/urlstate.js never sees it.
 */
export function renderOptions(search) {
  const q = new URLSearchParams(String(search || ''));
  if (q.get('render') !== '1') return null;
  const fps = Number(q.get('fps'));
  const at = Number(q.get('at'));
  const stops = Number(q.get('stops'));
  return {
    fps: fps === 60 || fps === 30 || fps === 24 || fps === 25 ? fps : 30,
    epochMs: Number.isFinite(at) && at > 0 ? at : null,
    captions: q.get('captions') === '1',
    maxStops: Number.isInteger(stops) && stops > 0 ? stops : 0,
  };
}

/** Where the trip is flown by hand: the link the end card and the description carry. */
export function tripUrl(id) {
  return `spaceradar.ai/#trip=${id}`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// What a layer's positions are computed from, in the words CREDITS.md section 4 uses.
const LAYER_SOURCES = {
  stations: 'CelesTrak orbital elements',
  active: 'CelesTrak orbital elements',
  visual: 'CelesTrak orbital elements',
  starlink: 'CelesTrak orbital elements',
  stars: 'the HYG star database',
  exoplanets: 'the NASA Exoplanet Archive',
  'deep-sky': 'OpenNGC',
};

/**
 * The one line of truth a video opens on (internal #307): the instant the positions are computed
 * for, and what from. Pure. A trip that moves the clock itself (anything but `as-found`) is not
 * "computed for" the minute it was rendered, so its line names the sources only.
 */
export function truthLine(tour, epochMs) {
  const from = [];
  for (const id of (tour && tour.requires) || []) {
    const s = LAYER_SOURCES[id];
    if (s && !from.includes(s)) from.push(s);
  }
  const stage = tour && tour.stage;
  if (stage && stage !== 'earth' && stage !== 'moon' && stage !== 'sun' && !from.length) from.push('published star and galaxy catalogues');
  else from.push('the planets’ own orbits (astronomy-engine)');
  const sources = from.length > 1 ? `${from.slice(0, -1).join(', ')} and ${from[from.length - 1]}` : from[0];
  if (!tour || tour.clock !== 'as-found' || !Number.isFinite(epochMs)) return `Everything is drawn where it really is, from ${sources}.`;
  const d = new Date(epochMs);
  const two = (n) => String(n).padStart(2, '0');
  const when = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${two(d.getUTCHours())}:${two(d.getUTCMinutes())} UTC`;
  return `Positions computed for ${when} from ${sources}.`;
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
/** A card's opacity at frame n: up over `fade` frames from `from`, down over the last `fade` before `to`. */
export function cardOpacity(n, from, to, fade, { fadeIn = true, fadeOut = true } = {}) {
  if (n < from || n >= to) return 0;
  const up = fadeIn && fade > 0 ? clamp01((n - from + 1) / fade) : 1;
  const down = fadeOut && fade > 0 ? clamp01((to - n) / fade) : 1;
  return Math.min(up, down);
}

/**
 * The lower third at frame n, from the stops as recorded so far: which stop's name is up and how
 * opaque. The name comes up when the camera arrives and goes as it leaves. Pure.
 * @param {{title, arriveFrame, leaveFrame}[]} stops
 */
export function lowerThird(stops, n, fade) {
  for (let i = (stops || []).length - 1; i >= 0; i -= 1) {
    const s = stops[i];
    if (s.arriveFrame === null || s.arriveFrame === undefined || n < s.arriveFrame) continue;
    const up = fade > 0 ? clamp01((n - s.arriveFrame + 1) / fade) : 1;
    const gone = s.leaveFrame === null || s.leaveFrame === undefined ? 1 : fade > 0 ? clamp01(1 - (n - s.leaveFrame + 1) / fade) : 0;
    return { index: i, title: s.title, opacity: Math.min(up, gone) };
  }
  return { index: -1, title: '', opacity: 0 };
}

/**
 * One counter for everything the page calls time. `g` is the window (a plain object in the test).
 * Nothing moves until step(ms): then the timers that fell due run in the order they fell due, and
 * the animation-frame callbacks asked for before the step run once, stamped with the new time.
 */
export function createVirtualTime(g, { epochMs, startMs = 0 } = {}) {
  const RealDate = g.Date;
  const real = {
    Date: RealDate,
    setTimeout: g.setTimeout.bind(g),
    clearTimeout: g.clearTimeout.bind(g),
    setInterval: g.setInterval ? g.setInterval.bind(g) : null,
    clearInterval: g.clearInterval ? g.clearInterval.bind(g) : null,
    perfNow: g.performance.now.bind(g.performance),
  };
  let now = startMs;                 // what performance.now() answers
  let dateBase = (Number.isFinite(epochMs) ? epochMs : RealDate.now()) - now; // Date.now() = dateBase + now
  let seq = 0;
  const timers = new Map();          // id -> { due, order, fn, args, every }
  let frames = new Map();            // id -> fn
  const dateNow = () => Math.round(dateBase + now);

  // `new Date()` is the wall clock too (the clock module's realNow is Date.now, but a card or a
  // credit line that says `new Date()` must not disagree with it).
  class FilmDate extends RealDate {
    constructor(...a) {
      if (a.length === 0) super(dateNow());
      else super(...a);
    }
    static now() { return dateNow(); }
  }
  g.Date = FilmDate;
  g.performance.now = () => now;

  const add = (fn, ms, args, every) => {
    const id = ++seq;
    timers.set(id, { due: now + Math.max(0, Number(ms) || 0), order: id, fn, args, every });
    return id;
  };
  g.setTimeout = (fn, ms, ...args) => add(fn, ms, args, 0);
  g.setInterval = (fn, ms, ...args) => add(fn, ms, args, Math.max(1, Number(ms) || 0));
  g.clearTimeout = (id) => { if (!timers.delete(id)) real.clearTimeout(id); };
  g.clearInterval = g.clearTimeout;
  // "When the browser is idle" is the next frame: idle work lands on a known frame, not when a
  // real machine happened to have a spare moment.
  g.requestIdleCallback = (fn) => add(() => fn({ didTimeout: false, timeRemaining: () => 50 }), 1, [], 0);
  g.cancelIdleCallback = (id) => { timers.delete(id); };
  g.requestAnimationFrame = (fn) => { const id = ++seq; frames.set(id, fn); return id; };
  g.cancelAnimationFrame = (id) => { frames.delete(id); };

  const call = (fn, args) => {
    try {
      if (typeof fn === 'function') fn(...args);
    } catch (e) {
      // What the browser does with a throwing callback: report it and carry on.
      if (g.console) g.console.error('render mode: a callback threw', e);
    }
  };

  function runTimers() {
    for (let guard = 0; guard < 100000; guard += 1) {
      let next = null;
      for (const t of timers.values()) {
        if (t.due <= now && (!next || t.due < next.due || (t.due === next.due && t.order < next.order))) next = t;
      }
      if (!next) return;
      // An interval runs once per step at most and counts on from now: a 16 ms interval under a
      // 33 ms step, or an hour's jump, must not run a thousand times inside one frame.
      if (next.every) { next.due = now + next.every; next.order = ++seq; }
      else timers.delete(next.order);
      call(next.fn, next.args);
    }
  }

  function runFrames() {
    const batch = frames;
    frames = new Map();
    for (const fn of batch.values()) call(fn, [now]);
  }

  return {
    real,
    now: () => now,
    dateNow,
    pending: () => ({ timers: timers.size, frames: frames.size }),
    /** Move time by `ms`, then run what fell due and one animation frame. */
    step(ms) {
      now += ms;
      runTimers();
      runFrames();
    },
    /** The same instant again: something landed after the frame was drawn. */
    redraw() {
      runFrames();
    },
    /** Frame 0: performance.now() and Date.now() become these, whatever the boot took. */
    jumpTo(perfMs, epoch) {
      now = Math.max(now, perfMs);
      dateBase = epoch - now;
    },
  };
}

const STYLE = `
html.sr-render, html.sr-render body { cursor: none; }
html.sr-render body > *:not(.sr-scene):not(.sr-veil):not(#labels):not(#sr-hud):not(#sr-render) { visibility: hidden !important; }
html.sr-render #boot { display: none !important; }
#sr-render { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; color: var(--sr-text, #e8ecf2); font-family: var(--sr-font, 'Inter', system-ui, sans-serif); }
#sr-render .rm-name { font-family: var(--sr-font, 'Inter', system-ui, sans-serif); font-weight: 600; letter-spacing: -0.02em; }
#sr-render .rm-micro { font-family: var(--sr-font-hud, 'Barlow Semi Condensed', 'Inter', system-ui, sans-serif); font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--sr-text-dim, #9aa4b2); }
#sr-render .rm-card { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; padding: 0 9vw; opacity: 0;
  background: linear-gradient(90deg, rgba(11,14,20,.88) 0%, rgba(11,14,20,.72) 45%, rgba(11,14,20,.30) 100%); }
#sr-render .rm-card .rm-micro { font-size: 2.2vh; margin-bottom: 2.4vh; }
#sr-render .rm-title { font-size: 10.5vh; line-height: 1.04; max-width: 64vw; margin: 0; text-wrap: balance; }
#sr-render .rm-blurb { font-size: 3.1vh; line-height: 1.35; max-width: 52vw; margin: 3.2vh 0 0; color: var(--sr-text, #e8ecf2); }
#sr-render .rm-truth { font-size: 2.2vh; line-height: 1.4; max-width: 56vw; margin: 5vh 0 0; color: var(--sr-text-dim, #9aa4b2); border-top: 1px solid var(--sr-line-strong, rgba(232,236,242,.22)); padding-top: 2.2vh; }
#sr-render .rm-end .rm-title { font-size: 8.4vh; }
#sr-render .rm-url { font-family: var(--sr-font-mono, 'JetBrains Mono', ui-monospace, Menlo, monospace); font-size: 3.6vh; margin: 3.4vh 0 0; color: var(--sr-ember, #ff9f43); }
#sr-render .rm-credits { font-size: 2vh; line-height: 1.5; max-width: 60vw; margin: 5vh 0 0; color: var(--sr-text-dim, #9aa4b2); border-top: 1px solid var(--sr-line-strong, rgba(232,236,242,.22)); padding-top: 2.2vh; }
#sr-render .rm-scrim { position: absolute; left: 0; right: 0; bottom: 0; height: 30vh; opacity: 0; background: linear-gradient(180deg, rgba(11,14,20,0) 0%, rgba(11,14,20,.62) 100%); }
#sr-render .rm-third { position: absolute; left: 5vw; bottom: 9vh; max-width: 60vw; opacity: 0; text-shadow: 0 0 1.2vh rgba(11,14,20,.9), 0 0 0.4vh rgba(11,14,20,.9); }
#sr-render .rm-third .rm-micro { font-size: 1.9vh; margin-bottom: 0.8vh; color: var(--sr-text, #e8ecf2); opacity: .82; }
#sr-render .rm-stop { font-size: 5.6vh; line-height: 1.05; }
#sr-render .rm-mark { position: absolute; right: 5vw; bottom: 9vh; font-size: 2.1vh; opacity: 0; color: var(--sr-text, #e8ecf2); text-shadow: 0 0 1.2vh rgba(11,14,20,.9), 0 0 0.4vh rgba(11,14,20,.9); }
#sr-render .rm-thumb { position: absolute; inset: 0; display: none; flex-direction: column; justify-content: center; padding: 0 6vw;
  background: linear-gradient(90deg, rgba(11,14,20,.80) 0%, rgba(11,14,20,.45) 40%, rgba(11,14,20,0) 66%); }
#sr-render .rm-thumb .rm-micro { font-size: 3.4vh; margin-bottom: 2.4vh; color: var(--sr-ember, #ff9f43); }
#sr-render .rm-thumb .rm-title { font-size: 13vh; line-height: 1; max-width: 46vw; }
html.sr-render-thumb #sr-render > *:not(.rm-thumb) { display: none !important; }
html.sr-render-thumb #sr-render .rm-thumb { display: flex; }
html.sr-render-thumb #labels, html.sr-render-thumb #sr-hud { visibility: hidden !important; }
#sr-render .rm-caption { position: absolute; left: 50%; bottom: 3.2vh; transform: translateX(-50%); max-width: 70vw; text-align: center; font-size: 2.9vh; line-height: 1.3; padding: 0.6vh 1.4vh; border-radius: 0.6vh; background: var(--sr-glass-strong, rgba(11,14,20,.90)); opacity: 0; }
`;

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

/**
 * Take over time and start counting what is in flight. Call before anything else in boot() asks
 * what time it is. Returns the mode; attach(ctx) once the trip exists.
 */
export function install(opts, g = window) {
  const fps = opts.fps;
  const stepMs = 1000 / fps;
  // To the second: the truth line says the minute, and a render resumed after a crash is handed
  // this back (`at=`), so every frame of the two halves is computed for the same instants.
  const epochMs = opts.epochMs || Math.floor(g.Date.now() / 1000) * 1000;
  const time = createVirtualTime(g, { epochMs, startMs: g.performance.now() });
  const realTick = () => new Promise((r) => time.real.setTimeout(r, 0));
  const realWait = (ms) => new Promise((r) => time.real.setTimeout(r, ms));

  // ---------------------------------------------------------------- what is in flight
  let pending = 0;
  let landed = 0;
  const begin = () => { pending += 1; };
  const end = () => { pending = Math.max(0, pending - 1); landed += 1; };
  const track = (p) => { begin(); return Promise.resolve(p).finally(end); };
  if (typeof g.fetch === 'function') {
    const realFetch = g.fetch.bind(g);
    g.fetch = (...a) => track(realFetch(...a));
  }
  if (g.Response && g.Response.prototype) {
    for (const m of ['arrayBuffer', 'blob', 'json', 'text']) {
      const was = g.Response.prototype[m];
      if (typeof was === 'function') g.Response.prototype[m] = function body(...a) { return track(was.apply(this, a)); };
    }
  }
  if (g.HTMLImageElement && g.HTMLImageElement.prototype.decode) {
    const was = g.HTMLImageElement.prototype.decode;
    g.HTMLImageElement.prototype.decode = function decode(...a) { return track(was.apply(this, a)); };
    // three.js's TextureLoader is an <img> given a `src`, not a fetch: counted from the moment the
    // address is set to its load or its error.
    const src = Object.getOwnPropertyDescriptor(g.HTMLImageElement.prototype, 'src');
    if (src && src.set) {
      Object.defineProperty(g.HTMLImageElement.prototype, 'src', {
        configurable: true,
        enumerable: src.enumerable,
        get: src.get,
        set(v) {
          begin();
          let open = true;
          const done = () => {
            if (!open) return;
            open = false;
            this.removeEventListener('load', done);
            this.removeEventListener('error', done);
            end();
          };
          this.addEventListener('load', done);
          this.addEventListener('error', done);
          src.set.call(this, v);
        },
      });
    }
  }
  if (typeof g.createImageBitmap === 'function') {
    const was = g.createImageBitmap.bind(g);
    g.createImageBitmap = (...a) => track(was(...a));
  }
  if (g.Worker && g.Worker.prototype) {
    // A worker is asked and answers: counted from the question to the next thing it says, or for
    // ten real seconds, whichever is first (a worker that never answers must not stop the film).
    const was = g.Worker.prototype.postMessage;
    g.Worker.prototype.postMessage = function postMessage(...a) {
      begin();
      let open = true;
      const done = () => { if (open) { open = false; this.removeEventListener('message', done); end(); } };
      this.addEventListener('message', done);
      time.real.setTimeout(done, 10000);
      return was.apply(this, a);
    };
  }

  /** Wait, in real time, until nothing is in flight. Resolves true if anything landed meanwhile. */
  async function settle(calmTicks = 2, maxMs = 60000) {
    const mark = landed;
    const t0 = time.real.perfNow();
    let calm = 0;
    while (calm < calmTicks) {
      await realTick();
      calm = pending === 0 ? calm + 1 : 0;
      if (time.real.perfNow() - t0 > maxMs) {
        console.warn(`render mode: ${pending} thing(s) still loading after ${maxMs} ms; the frame is taken without them`);
        pending = 0;
        break;
      }
    }
    return landed !== mark;
  }

  // CSS transitions and Web Animations run on the compositor's clock, which is real. Held and
  // moved by hand, one step a frame, they are film time like everything else (the veil's fade
  // waits on its animation's `finished`, ui/veil.js).
  const animated = new WeakMap();
  function stepAnimations(ms) {
    if (typeof document.getAnimations !== 'function') return;
    for (const a of document.getAnimations()) {
      try {
        const at = (animated.has(a) ? animated.get(a) : 0) + ms;
        animated.set(a, at);
        const timing = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null;
        const endAt = timing && Number.isFinite(timing.endTime) ? Number(timing.endTime) : Infinity;
        if (at >= endAt) a.finish();
        else { a.pause(); a.currentTime = at; }
      } catch { /* an animation that cannot be held is left to run */ }
    }
  }

  async function advance() {
    time.step(stepMs);
    stepAnimations(stepMs);
    for (let pass = 0; pass < 8; pass += 1) {
      if (!(await settle())) break;
      time.redraw();
    }
  }

  // ---------------------------------------------------------------- the film
  const titleFrames = Math.round(TITLE_S * fps);
  const endFrames = Math.round(END_S * fps);
  const fadeFrames = Math.round(FADE_S * fps);
  let ctx = null;
  let tour = null;
  let ui = null;
  let n = -1;               // the frame last produced; -1 before frame 0
  let filming = false;
  let endAt = null;         // the first frame of the end card
  let lastStop = '';        // "generation:index" of the stop last held for its clip
  let heldTimer = null;
  const stops = [];         // { id, title, index, startFrame, arriveFrame, leaveFrame, clipSeconds }
  const beds = [];          // { frame, rung }
  const cues = new Map();   // stop id -> cues

  const mode = {
    fps,
    epochMs,
    stops,
    beds,
    titleFrames,
    endFrames,
    totalFrames: null,
    done: false,
    error: null,
    ready: null,
    // Where the warm-up is, for whoever waits on `ready` (internal #423: forty-four real seconds
    // of loading and warming looked exactly like a hang from outside, and was reported as one).
    // 'installed' -> 'layers' -> 'warming' -> 'faces' -> 'settling' -> 'ready', or 'failed'.
    stage: 'installed',
    warmed: 0,
    attach,
    frame,
    /** The thumbnail's dressing on (or off) over the frame that is up: the tool photographs it between two frames. */
    thumb(on) { document.documentElement.classList.toggle('sr-render-thumb', !!on); return !!on; },
    get frameIndex() { return n; },
    describe: () => ({
      trip: tour ? tour.id : null, title: tour ? tour.title : null, fps, epochMs, titleFrames, endFrames,
      totalFrames: mode.totalFrames, done: mode.done, stops: stops.map((s) => ({ ...s })), beds: beds.slice(),
      truth: tour ? truthLine(tour, epochMs) : '', pending,
      stage: mode.stage, warmed: mode.warmed, warmFrames: Math.round(WARM_S * fps), error: mode.error,
    }),
  };

  function current() { return stops.length ? stops[stops.length - 1] : null; }

  /** The trip's own phases, written down by frame: this is the tool's cue sheet. */
  function onTrip(st) {
    if (!filming || !st) return;
    const at = n + 1; // the frame being made when this fires
    const phase = st.phase;
    const cur = current();
    if ((phase === 'veil' || phase === 'flight' || phase === 'held') && st.index >= 0 && (!cur || cur.index !== st.index)) {
      if (cur && cur.leaveFrame === null) cur.leaveFrame = at;
      // `stops=N`: a short render for a look. The end card comes up over the flight out.
      if (opts.maxStops && st.index >= opts.maxStops) { if (endAt === null) endAt = at; return; }
      const row = (st.stops || [])[st.index] || {};
      const id = row.id || st.stopId || String(st.index);
      stops.push({ id, title: row.title || st.stopTitle || id, index: st.index, startFrame: at, arriveFrame: null, leaveFrame: null, clipSeconds: Number(NARRATION.clips[clipKey(tour.id, id)]) || 0 });
    }
    if (phase === 'settle') {
      const s = current();
      const key = `${st.generation}:${st.index}`;
      if (s && s.index === st.index && lastStop !== key) {
        lastStop = key;
        s.arriveFrame = at;
        // The live trip's own sum (audio/narration.js play()): the clip, and the breath after it.
        const ms = holdFor(s.clipSeconds);
        if (ms > 0) ctx.trip.holdDwell(ms);
      }
    }
    if (phase === 'held' && heldTimer === null) {
      heldTimer = setTimeout(() => { heldTimer = null; ctx.trip.next(); }, HELD_MS);
    }
    if (phase === 'outro' || phase === 'idle') {
      const s = current();
      if (s && s.leaveFrame === null) s.leaveFrame = at;
      if (endAt === null) endAt = at;
    }
  }

  function build() {
    const style = el('style');
    style.textContent = STYLE;
    document.head.appendChild(style);
    document.documentElement.classList.add('sr-render');
    const root = el('div');
    root.id = 'sr-render';
    const title = el('div', 'rm-card rm-titlecard');
    title.appendChild(el('div', 'rm-micro', COPY.render.eyebrow));
    title.appendChild(el('h1', 'rm-title rm-name', tour.title));
    if (tour.blurb) title.appendChild(el('p', 'rm-blurb', tour.blurb));
    title.appendChild(el('p', 'rm-truth', truthLine(tour, epochMs)));
    // The names over the scene would show through a card and under the lower third's words: a
    // soft dark foot under the words, and the labels and the HUD fade out with a card up (paint).
    const scrim = el('div', 'rm-scrim');
    const third = el('div', 'rm-third');
    third.appendChild(el('div', 'rm-micro', tour.title));
    const stop = el('div', 'rm-stop rm-name', '');
    third.appendChild(stop);
    const mark = el('div', 'rm-mark rm-micro', COPY.render.site);
    const caption = el('div', 'rm-caption', '');
    const endCard = el('div', 'rm-card rm-end');
    endCard.appendChild(el('div', 'rm-micro', COPY.render.fly));
    endCard.appendChild(el('h1', 'rm-title rm-name', tour.title));
    endCard.appendChild(el('p', 'rm-url', tripUrl(tour.id)));
    const credits = [truthLine(tour, epochMs), NARRATION.credit ? `${NARRATION.credit}.` : '', COPY.render.music].filter(Boolean).join(' ');
    endCard.appendChild(el('p', 'rm-credits', credits));
    // The thumbnail: the same frame with nothing over it but the trip's name, large (thumb()).
    const thumb = el('div', 'rm-thumb');
    thumb.appendChild(el('div', 'rm-micro', COPY.render.site));
    thumb.appendChild(el('h1', 'rm-title rm-name', tour.title));
    for (const node of [scrim, third, mark, caption, title, endCard, thumb]) root.appendChild(node);
    document.body.appendChild(root);
    ui = { root, title, scrim, third, stop, mark, caption, endCard, over: [document.getElementById('labels'), document.getElementById('sr-hud')].filter(Boolean) };
  }

  /** Everything over the scene is a function of the frame number: no transition, no timer. */
  function paint(k) {
    if (!ui) return;
    const opening = cardOpacity(k, 0, titleFrames + fadeFrames, fadeFrames, { fadeIn: false });
    const ending = endAt !== null && k >= endAt;
    const closing = ending ? cardOpacity(k, endAt, Infinity, fadeFrames, { fadeOut: false }) : 0;
    ui.title.style.opacity = String(opening);
    ui.endCard.style.opacity = String(closing);
    // `filter`, not `opacity`: the app sets these layers' own opacity, and this must not fight it.
    for (const node of ui.over) node.style.filter = `opacity(${1 - Math.max(opening, closing)})`;
    const lt = lowerThird(stops, k, fadeFrames);
    const quiet = ending ? 1 - clamp01((k - endAt + 1) / fadeFrames) : 1;
    if (lt.title && ui.stop.textContent !== lt.title) ui.stop.textContent = lt.title;
    ui.third.style.opacity = String(lt.opacity * quiet);
    ui.scrim.style.opacity = String(lt.opacity * quiet);
    ui.mark.style.opacity = String(0.82 * quiet * clamp01((k - titleFrames) / fadeFrames));
    let text = '';
    if (opts.captions && lt.index >= 0 && !ending) {
      const s = stops[lt.index];
      const t = (k - s.arriveFrame) / fps;
      if (t <= s.clipSeconds + 0.4) text = cueAt(cues.get(s.id), t);
    }
    if (ui.caption.textContent !== text) ui.caption.textContent = text;
    ui.caption.style.opacity = text ? '1' : '0';
  }

  async function warmUp() {
    // Until the catalogues have landed and the link has put the trip at its intro. Film time moves
    // only while nothing is loading, so no deadline in the app fires because a disc was slow.
    let since = null;
    mode.stage = 'layers';
    // The trip is read from the hash (ui/urlstate.js). `?render=1&trip=<id>` is not a link form,
    // and used to wait thirty film seconds before saying something else was wrong (internal #423).
    if (g.location && !/(?:^#?|&)trip=[^&]/.test(String(g.location.hash || ''))) {
      throw new Error('no trip in the link: render mode reads it from the hash, ?render=1#trip=<id>');
    }
    for (let i = 0; ; i += 1) {
      await advance();
      const st = ctx.trip.state;
      if (g.__srLayersReady && st.phase === 'intro') break;
      if (g.__srLayersReady && since === null) since = i;
      if (since !== null && i - since > 30 * fps) {
        throw new Error(`the trip did not start (phase ${st.phase}${st.reason ? ', ' + st.reason : ''}): is the trip's data loaded?`);
      }
      if (i > 600 * fps) throw new Error('the layers never landed');
    }
    tour = TOURS.find((t) => t.id === ctx.trip.state.tourId);
    if (!tour) throw new Error('no such trip: ' + ctx.trip.state.tourId);
    mode.stage = 'warming';
    for (let i = 0; i < Math.round(WARM_S * fps); i += 1) { await advance(); mode.warmed = i + 1; }
    if (opts.captions) {
      await Promise.all(tour.stops.map((s) => {
        const key = clipKey(tour.id, s.id);
        if (!NARRATION.clips[key]) return null;
        return fetch(clipRow(NARRATION.base, key).vtt).then((r) => (r.ok ? r.text() : '')).then((text) => cues.set(s.id, parseVtt(text))).catch(() => {});
      }));
    }
    build();
    mode.stage = 'faces';
    if (document.fonts) {
      await Promise.all([
        document.fonts.load("600 64px 'Inter'"),
        document.fonts.load("600 16px 'Barlow Semi Condensed'"),
        document.fonts.load("400 16px 'Inter'"),
        document.fonts.load("400 16px 'JetBrains Mono'"),
      ].map((p) => p.catch(() => null)));
      await document.fonts.ready;
    }
    // A dynamic import() cannot be counted; a real second and a half is every module the boot's
    // timers asked for, landed.
    mode.stage = 'settling';
    await realWait(1500);
    await settle(5);
    // FRAME 0 IS THE SAME TWO NUMBERS WHATEVER THE BOOT TOOK. performance.now() jumps forward to
    // a constant first, and ten frames run so every timer the jump made due has fired and what it
    // asked for has landed; then the calendar is set so that frame 0 is `epochMs` exactly.
    time.jumpTo(FILM_START_MS, epochMs);
    for (let i = 0; i < 10; i += 1) await advance();
    time.jumpTo(0, epochMs - stepMs);
    beds.push({ frame: 0, rung: rungOf(ctx.stage.worldId, isLadderStage) });
    g.addEventListener('sr:stage', () => {
      const rung = rungOf(ctx.stage.worldId, isLadderStage);
      if (beds[beds.length - 1].rung !== rung) beds.push({ frame: Math.max(0, n + 1), rung });
    });
    filming = true;
    paint(0);
    mode.stage = 'ready';
    return mode.describe();
  }

  /** After the trip exists (main.js). `ready` resolves when frame 0 can be asked for. */
  function attach(context) {
    ctx = context;
    ctx.renderMode = mode;
    ctx.trip.onChange(onTrip);
    mode.ready = warmUp().catch((e) => { mode.error = String((e && e.message) || e); mode.stage = 'failed'; throw e; });
    // Never an unhandled rejection: the boot panel would say "Something broke" over the scene.
    mode.ready.catch(() => {});
    return mode;
  }

  /**
   * Make frame k (they are asked for in order: 0, 1, 2, ...). Resolves when it is on the canvas
   * and nothing it shows is still loading; the caller photographs the page then.
   */
  async function frame(k) {
    if (!filming) throw new Error('render mode is not ready: await __srRender.ready first');
    if (k !== n + 1) throw new Error(`frames are made in order: asked for ${k}, next is ${n + 1}`);
    // The title card is over: Start, exactly as a visitor presses it.
    if (k === titleFrames) ctx.trip.play();
    paint(k);
    await advance();
    n = k;
    // The trip's phase changed inside the step; what is over the scene must agree with it.
    paint(k);
    if (endAt !== null && mode.totalFrames === null) mode.totalFrames = endAt + endFrames;
    if (mode.totalFrames !== null && k + 1 >= mode.totalFrames) mode.done = true;
    const st = ctx.trip.state;
    return { n: k, done: mode.done, totalFrames: mode.totalFrames, phase: st.phase, index: st.index, stopId: st.stopId, pending };
  }

  g.__srRender = mode;
  return mode;
}

// tests/test_trip_playback.mjs -- pause, back, next, and the labelled stop counter (spec 0003).
//
//   node tests/test_trip_playback.mjs
//
// Pause/Play, Back and Next already shipped on main. What this locks is the remaining exit
// criterion: pause freezes advance (and a clock-owning trip's clock), back/next move one stop,
// and the counter reads "stop N of M" while still visible when paused. The frame is exercised
// against a small DOM stub so the progress row's hidden flag is measured without Chrome.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');

// The wall clock, by hand — same pattern as test_stop_time.mjs; set before clock.js imports.
let REAL = Date.parse('2026-09-28T12:00:00Z');
const realDateNow = Date.now;
Date.now = () => REAL;

// ------------------------------------------------------------------------------- a small DOM
class Node {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this._kids = [];
    this.parentNode = null;
    this.attrs = {};
    this.dataset = {};
    this.style = { setProperty() {}, removeProperty() {} };
    this.hidden = false;
    this.disabled = false;
    this.className = '';
    this.id = '';
    this.type = '';
    this.title = '';
    this._text = '';
    this.offsetWidth = 1;
    this.isContentEditable = false;
    const self = this;
    this.classList = {
      add: (...c) => { const s = new Set(self.className.split(/\s+/).filter(Boolean)); c.forEach((x) => s.add(x)); self.className = [...s].join(' '); },
      remove: (...c) => { self.className = self.className.split(/\s+/).filter((x) => x && !c.includes(x)).join(' '); },
      toggle: (c, on) => { const has = self.classList.contains(c); const want = on === undefined ? !has : !!on; if (want && !has) self.classList.add(c); if (!want && has) self.classList.remove(c); return want; },
      contains: (c) => self.className.split(/\s+/).includes(c),
    };
    this.listeners = {};
  }
  get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === document.body || n === document.documentElement; }
  get firstChild() { return this._kids[0] || null; }
  get childElementCount() { return this._kids.length; }
  get children() { return this._kids; }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this._kids.push(c); return c; }
  removeChild(c) { this._kids = this._kids.filter((x) => x !== c); c.parentNode = null; return c; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  set textContent(v) { this._kids = []; this._text = String(v ?? ''); }
  get textContent() { return this._text + this._kids.map((c) => c.textContent).join(''); }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  removeEventListener() {}
  click() { for (const fn of this.listeners.click || []) fn({ target: this }); }
  focus() { document.activeElement = this; }
  contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
  all() { return [this, ...this._kids.flatMap((c) => c.all())]; }
  querySelector(sel) {
    if (sel.startsWith('#')) return this.all().find((n) => n.id === sel.slice(1)) || null;
    if (sel.startsWith('.')) return this.all().find((n) => n.classList.contains(sel.slice(1))) || null;
    return null;
  }
  querySelectorAll(sel) {
    if (sel.startsWith('.')) return this.all().filter((n) => n.classList.contains(sel.slice(1)));
    return [];
  }
}

globalThis.document = {
  body: new Node('body'),
  documentElement: new Node('html'),
  title: 'Space Radar',
  activeElement: null,
  createElement: (tag) => new Node(tag),
  createElementNS: (_ns, tag) => new Node(tag),
  getElementById: (id) => document.body.all().find((n) => n.id === id) || document.documentElement.all().find((n) => n.id === id) || null,
  querySelector: (sel) => document.body.querySelector(sel) || document.documentElement.querySelector(sel),
  addEventListener() {},
  removeEventListener() {},
};
document.activeElement = document.body;
globalThis.window = globalThis;
globalThis.location = { origin: 'https://www.spaceradar.ai', pathname: '/', hash: '', search: '' };
globalThis.history = { replaceState() {} };
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
const frames = [];
globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
globalThis.cancelAnimationFrame = () => { frames.length = 0; };
Object.defineProperty(globalThis, 'navigator', {
  value: { clipboard: { writeText: async () => {} }, share: undefined },
  configurable: true,
});

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { TOURS } = await import(join(JS, 'data/tours.js'));
const { clock } = await import(join(JS, 'clock.js'));
const { createCameraRig } = await import(join(JS, 'scene/camera.js'));
const { createTrip } = await import(join(JS, 'ui/trip.js'));
const { createTripFrame } = await import(join(JS, 'ui/tripframe.js'));
const { COPY, t } = await import(join(JS, 'copy/en.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// ---------------------------------------------------------------------------- copy shape
check(t(COPY.trip.stopOf, { n: 2, count: 5 }) === 'stop 2 of 5', `stopOf is "stop N of M": "${t(COPY.trip.stopOf, { n: 2, count: 5 })}"`);
check(t(COPY.trip.liveLabel, { n: 2, count: 5, title: 'Earth' }) === 'stop 2 of 5: Earth',
  `liveLabel keeps the same shape: "${t(COPY.trip.liveLabel, { n: 2, count: 5, title: 'Earth' })}"`);
check(t(COPY.trip.docTitle, { title: 'A year in a minute', n: 2, count: 5 }) === 'Space Radar — A year in a minute — stop 2 of 5',
  `docTitle keeps the same shape: "${t(COPY.trip.docTitle, { title: 'A year in a minute', n: 2, count: 5 })}"`);

// --------------------------------------------------------------- machine: pause / back / next
const card = (title) => ({ title, body: 'A fixture stop for tests/test_trip_playback.mjs, with enough words for a dwell.' });
const stopRow = (id, target, extra = {}) => ({
  id, target, frame_radii: 5, drift_deg: 0, drift_rate_deg_s: 6, drift: 'none', key_light_deg: 125,
  ease: 'auto', on_unresolved: 'drop', card: card(id), dwell_ms: 8000, ...extra,
});
const ISO = '2027-08-02T10:07:00Z';
const AT = Date.parse(ISO);
TOURS.push({
  id: 'fx-playback', title: 'fx-playback', blurb: 'fixture', pacing: 'auto', requires: [],
  min_stops: 3, stage: 'earth', clock: 'as-found', estimate_ms: 3 * 11350,
  stops: [
    stopRow('one', { world: 'earth' }, { time: ISO, rate: 60 }),
    stopRow('two', { world: 'moon' }),
    stopRow('three', { world: 'earth' }),
  ],
});

const pump = (n = 4) => {
  for (let i = 0; i < n; i += 1) {
    for (const fn of frames.splice(0, frames.length)) {
      try { fn(0); } catch { /* paintCard needs more DOM than this stub */ }
    }
  }
};
const passes = (ms) => { REAL += ms; clock.tick(ms); };

function makeCtx() {
  const camera = new THREE.PerspectiveCamera(45, 1.6, 0.001, 1e9);
  camera.position.set(0, 0, 22);
  const rig = createCameraRig(camera, null, { worldRadius: 6.371 });
  return {
    camera,
    cameraRig: rig,
    clock,
    layers: [{ id: 'worlds', propagator: 'body' }],
    recordsFor: () => [],
    recordById: () => null,
    isLayerOn: () => true,
    setLayerOn() {},
    select() {},
    deselect() {},
    selected: () => null,
    observer: null,
  };
}
function arrive(ctx) {
  ctx.cameraRig.finishFlight();
  pump(2);
}

stage.setWorld('earth');
stage.setOrigin(null);

{
  clock.live();
  const ctx = makeCtx();
  const machine = createTrip(ctx);
  await machine.start('fx-playback');
  pump();
  machine.play();
  pump(1);
  check(machine.state.phase === 'flight' && machine.state.index === 0, `first stop flies (${machine.state.phase} @ ${machine.state.index})`);
  arrive(ctx);
  check(machine.state.phase === 'dwell' || machine.state.phase === 'settle', `arrived on stop 0 (${machine.state.phase})`);
  // Pause freezes advance; a clock-owning trip holds the clock.
  machine.pause('control');
  check(machine.state.phase === 'paused', 'pause() lands on phase paused');
  check(clock.paused === true, 'a trip that owns the clock pauses the clock');
  const heldAt = clock.now();
  passes(4000);
  check(clock.now() === heldAt, 'while paused the clock does not advance');
  machine.resume();
  check(machine.state.phase !== 'paused' && clock.paused === false, 'resume continues and releases the clock');
  // Back / Next move one stop; Back is a no-op at the first (frame disables the button; machine stays).
  const at = machine.state.index;
  machine.back();
  pump(1);
  check(machine.state.index === at, `back() on the first stop stays at ${machine.state.index}`);
  machine.next();
  pump(1);
  arrive(ctx);
  check(machine.state.index === 1, `next() moves to stop 1 (got ${machine.state.index})`);
  machine.next();
  pump(1);
  arrive(ctx);
  check(machine.state.index === 2, `next() moves to stop 2 (got ${machine.state.index})`);
  machine.back();
  pump(1);
  arrive(ctx);
  check(machine.state.index === 1, `back() returns to stop 1 (got ${machine.state.index})`);
  machine.stop('left');
  machine.dispose();
}

// -------------------------------------- frame: counter wording + progress visible while paused
{
  const listeners = [];
  let state = {
    phase: 'idle', index: -1, count: 0, tourId: 'fx-playback', tourTitle: 'Fixture trip',
    stopTitle: '', pacing: 'auto', estimateMs: 0, dropped: [], clockMoves: false,
    clockClamped: false, clockOwned: false, held: false, chapter: '', stageChanged: false,
  };
  const trip = {
    get state() { return state; },
    onChange(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    pause(reason) {
      state = { ...state, phase: 'paused', pausedBy: reason || 'control' };
      for (const fn of listeners) fn(state);
    },
    resume() {
      state = { ...state, phase: 'dwell', pausedBy: null };
      for (const fn of listeners) fn(state);
    },
    next() {},
    back() {},
    replay() {},
    play() {},
    stop() { state = { ...state, phase: 'idle' }; for (const fn of listeners) fn(state); },
    start() {},
    dwellFraction: () => 0.4,
    currentRecordId: () => null,
  };
  const notify = (patch) => {
    state = { ...state, ...patch };
    for (const fn of listeners) fn(state);
  };
  const ctx = {
    trip,
    cameraRig: null,
    clock: { mode: 'live', rate: 1, paused: false, now: () => REAL, onChange: () => () => {} },
    audio: { isOn: () => false, onChange: () => () => {}, enable() {}, disable() {} },
    mobile: null,
    veil: null,
    stage: { worldId: 'earth' },
  };
  const frame = createTripFrame(ctx);
  notify({
    phase: 'dwell', index: 1, count: 5, stopTitle: 'The Moon', estimateMs: 60000,
  });
  const progress = document.body.querySelector('.sr-trip__progress');
  const count = document.body.querySelector('.sr-trip__count');
  const chip = document.body.querySelector('.sr-trip__chip');
  check(progress && count, 'the progress row is in the letterbox during a dwell');
  check(count.textContent === 'stop 2 of 5', `counter during dwell: "${count && count.textContent}"`);
  check(chip && chip.hidden === true, 'the pause chip is hidden while the trip runs');
  trip.pause('control');
  check(progress.hidden === false, 'progress stays visible while paused');
  check(count.textContent === 'stop 2 of 5', `counter while paused: "${count.textContent}"`);
  check(chip.hidden === false, 'the pause chip is shown while paused');
  trip.resume();
  check(progress.hidden === false && chip.hidden === true, 'after resume the counter stays and the chip goes');
  notify({ phase: 'intro', index: -1, count: 5 });
  check(progress.hidden === true, 'progress hides on the intro panel');
  frame.dispose();
}

Date.now = realDateNow;

if (problems.length) {
  console.error(`trip playback FAILED (${problems.length}):`);
  for (const p of problems) console.error('  -', p);
  process.exit(1);
}
console.log('trip playback ok: stop N of M copy, pause holds the clock, back/next step one stop, progress stays up while paused');

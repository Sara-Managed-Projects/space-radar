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

// ------------------------------------------- machine: a stop held for its narration (spec 0069)
// holdDwell(ms) is how a clip that is being read keeps the camera at the stop: the timer that ends
// the dwell is pushed out, never pulled in, and the same pause freezes it.
{
  let wall = 1000;
  const realPerformance = globalThis.performance;
  Object.defineProperty(globalThis, 'performance', { value: { now: () => wall }, configurable: true });
  clock.live();
  const ctx = makeCtx();
  const machine = createTrip(ctx);
  await machine.start('fx-playback');
  pump();
  check(machine.state.stops[0].dwellMs === 8000, 'the state carries each stop\'s own dwell, for the intro\'s length');
  check(machine.holdDwell(5000) === false, 'holdDwell on the intro holds nothing');
  machine.play();
  pump(1);
  arrive(ctx);
  wall += 200;
  pump(2);
  check(machine.state.phase === 'dwell', `stop 0 is dwelling (${machine.state.phase})`);
  check(machine.holdDwell(3000) === false, 'a hold shorter than what is left changes nothing');
  wall += 7000;
  pump(2);
  check(machine.state.index === 0 && machine.state.phase === 'dwell', 'still on stop 0 at 7 s of an 8 s dwell');
  check(machine.holdDwell(5000) === true, 'a hold longer than what is left is taken');
  const f = machine.dwellFraction();
  check(f > 0.55 && f < 0.62, `the segment's fill follows the longer dwell (7 of 12 s: ${f})`);
  wall += 2000;
  pump(2);
  check(machine.state.index === 0 && machine.state.phase === 'dwell', 'past the card\'s own 8 s the stop is still up');
  machine.pause('control');
  wall += 60000;
  pump(2);
  machine.resume();
  pump(2);
  check(machine.state.index === 0, 'a pause freezes the held dwell like any other');
  wall += 3200;
  pump(3);
  check(machine.state.index === 1, `and the trip moves on when the hold runs out (index ${machine.state.index})`);
  // Asked while the camera is still flying or settling: the dwell that follows takes the longer.
  check(machine.holdDwell(20000) === true, 'a hold asked for before the dwell begins is kept');
  arrive(ctx);
  wall += 200;
  pump(2);
  wall += 15000;
  pump(2);
  check(machine.state.index === 1 && machine.state.phase === 'dwell', 'the stop is held for the 20 s asked, not the card\'s 8');
  wall += 5200;
  pump(3);
  check(machine.state.index === 2, `and then moves on (index ${machine.state.index})`);
  // A hold does not leak into the next stop.
  arrive(ctx);
  wall += 200;
  pump(2);
  wall += 8200;
  pump(3);
  check(machine.state.phase === 'outro', `the last stop keeps its own 8 s (${machine.state.phase})`);
  machine.stop('left');
  machine.dispose();
  Object.defineProperty(globalThis, 'performance', { value: realPerformance, configurable: true });
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
  // Spec 0061 task 7: the counter lives in the toolbar as "2 / 4" for the eye and "stop 2 of 5"
  // for a reader; paused, the play button turns ember and says Resume, and the counter stays.
  const progress = document.body.querySelector('.sr-trip__progress');
  const count = document.body.querySelector('.sr-trip__count');
  const said = progress && progress.children.find((n) => n.classList.contains('sr-trip__live'));
  const play = document.body.querySelector('.sr-trip__tb--play');
  const toolbar = document.body.querySelector('.sr-trip__toolbar');
  check(progress && count && said && toolbar, 'the progress is in the toolbar during a dwell');
  check(count.textContent === '2 / 5', `counter during dwell: "${count && count.textContent}"`);
  check(said.textContent === 'stop 2 of 5', `read out during dwell: "${said && said.textContent}"`);
  check(play && !play.classList.contains('is-paused') && play.getAttribute('aria-label') === COPY.trip.pause, 'the play button says Pause while the trip runs');
  trip.pause('control');
  check(toolbar.hidden === false && progress.hidden === false, 'the toolbar and its progress stay visible while paused');
  check(count.textContent === '2 / 5' && said.textContent === 'stop 2 of 5', `counter while paused: "${count.textContent}"`);
  check(play.classList.contains('is-paused') && play.getAttribute('aria-label') === COPY.trip.resume, 'paused, the play button is the ember one and says Resume');
  trip.resume();
  check(toolbar.hidden === false && !play.classList.contains('is-paused'), 'after resume the counter stays and the button says Pause again');
  notify({ phase: 'intro', index: -1, count: 5 });
  check(toolbar.hidden === true, 'the toolbar hides on the intro sheet');
  frame.dispose();
}

Date.now = realDateNow;

// Public #236, locked decision 3: under reduced motion a stop that runs the clock lands on its
// instant and stays there. Held in the source, where the two places a dwell lets the clock go are.
{
  const fs = await import('node:fs');
  const url = await import('node:url');
  const src = fs.readFileSync(url.fileURLToPath(new URL('../site/js/ui/trip.js', import.meta.url)), 'utf8');
  const guard = /function holdsUnderReducedMotion\(\) \{\s*return reducedMotion\(\) && ctx\.clock\.rate > 1;/;
  const ok = guard.test(src)
    && /if \(holdsUnderReducedMotion\(\)\) return;\s*if \(ctx\.clock\.paused\) ctx\.clock\.setPaused\(false\);/.test(src)
    && /run\.ownsClock && ctx\.clock\.paused && !holdsUnderReducedMotion\(\)\) ctx\.clock\.setPaused\(false\)/.test(src);
  if (!ok) problems.push('under reduced motion a timed stop must not release its clock: on arrival, or on resume');
  if ((src.match(/ctx\.clock\.setPaused\(false\)/g) || []).length !== 2) problems.push('a third place lets a trip\'s clock run: guard it for reduced motion too');
}

if (problems.length) {
  console.error(`trip playback FAILED (${problems.length}):`);
  for (const p of problems) console.error('  -', p);
  process.exit(1);
}
console.log('trip playback ok: stop N of M copy, pause holds the clock, back/next step one stop, progress stays up while paused');

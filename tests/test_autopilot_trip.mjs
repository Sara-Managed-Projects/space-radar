// tests/test_autopilot_trip.mjs -- the reel on the REAL trip machine (spec 0036).
//
// tests/test_autopilot.mjs holds the controller against a stub that behaves as a trip should.
// This one holds it against ui/trip.js itself, the camera rig and the trip frame, under node:
//
//   1. Three fixture trips, two laps: every stop of every trip is reached in order, each trip
//      ends on its own end card and is then left where the camera is, and the watchdog is silent.
//   2. A trip that cannot make its minimum is refused by the machine and skipped by the reel.
//   3. Taking the controls mid-flight leaves the machine idle; the reel takes the screen back.
//   4. A flight whose arrival never comes (the rig's callback lost) is landed by the machine's own
//      timer (internal #322), and the reel's watchdog stays silent.
//   5. The trip frame under a reel is in present mode with auto pacing, and writes no `present=`.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

let REAL = Date.parse('2026-10-07T12:00:00Z');
const realDateNow = Date.now;
Date.now = () => REAL;
let wall = 1000;
const realPerformance = globalThis.performance;
Object.defineProperty(globalThis, 'performance', { value: { now: () => wall }, configurable: true });

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
    this.className = '';
    this.id = '';
    this._text = '';
    this.offsetWidth = 1;
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
  focus() { document.activeElement = this; }
  contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
  all() { return [this, ...this._kids.flatMap((c) => c.all())]; }
  querySelector(sel) {
    if (sel.startsWith('#')) return this.all().find((n) => n.id === sel.slice(1)) || null;
    if (sel.startsWith('.')) return this.all().find((n) => n.classList.contains(sel.slice(1))) || null;
    return null;
  }
  querySelectorAll(sel) { return sel.startsWith('.') ? this.all().filter((n) => n.classList.contains(sel.slice(1))) : []; }
}
globalThis.document = {
  body: new Node('body'),
  documentElement: new Node('html'),
  title: 'Space Radar',
  activeElement: null,
  hidden: false,
  createElement: (tag) => new Node(tag),
  createElementNS: (_ns, tag) => new Node(tag),
  getElementById: (id) => document.body.all().find((n) => n.id === id) || null,
  querySelector: (sel) => document.body.querySelector(sel) || document.documentElement.querySelector(sel),
  addEventListener() {},
  removeEventListener() {},
};
document.activeElement = document.body;
globalThis.window = globalThis;
const written = [];
globalThis.location = { origin: 'https://www.spaceradar.ai', pathname: '/', hash: '', search: '' };
globalThis.history = { replaceState(_s, _t, target) { written.push(String(target)); location.hash = String(target).startsWith('#') ? String(target) : ''; } };
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.dispatchEvent = () => true;
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
const frames = [];
globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
globalThis.cancelAnimationFrame = () => { frames.length = 0; };
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { TOURS } = await import(join(JS, 'data/tours.js'));
const { clock } = await import(join(JS, 'clock.js'));
const { createCameraRig } = await import(join(JS, 'scene/camera.js'));
const { createTrip } = await import(join(JS, 'ui/trip.js'));
const { createTripFrame } = await import(join(JS, 'ui/tripframe.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { createAutopilot } = await import(join(JS, 'ui/autopilot.js'));

const card = (title) => ({ title, body: 'A fixture stop for tests/test_autopilot_trip.mjs, with enough words for a dwell.' });
const stopRow = (id, target, extra = {}) => ({
  id, target, frame_radii: 5, drift_deg: 0, drift_rate_deg_s: 6, drift: 'none', key_light_deg: 125,
  ease: 'auto', on_unresolved: 'drop', card: card(id), dwell_ms: 8000, ...extra,
});
const fixture = (id, extra = {}) => ({
  id, title: `Fixture ${id}`, blurb: 'fixture', pacing: 'auto', requires: [], min_stops: 3, stage: 'earth',
  clock: 'as-found', estimate_ms: 3 * 11350,
  stops: [stopRow('one', { world: 'earth' }), stopRow('two', { world: 'moon' }), stopRow('three', { world: 'earth' })],
  ...extra,
});
TOURS.push(fixture('fx-a'), fixture('fx-b'), fixture('fx-c'));
// A trip none of whose stops can be found: the machine refuses it (fewer than min_stops).
TOURS.push(fixture('fx-empty', { stops: [stopRow('x', { record: 'no-such-record' }), stopRow('y', { record: 'nor-this' }), stopRow('z', { record: 'nor-that' })] }));

function makeCtx() {
  const camera = new THREE.PerspectiveCamera(45, 1.6, 0.001, 1e9);
  camera.position.set(0, 0, 22);
  const rig = createCameraRig(camera, null, { worldRadius: 6.371 });
  const ctx = {
    camera, cameraRig: rig, clock,
    layers: [{ id: 'worlds', propagator: 'body' }],
    recordsFor: () => [], recordById: () => null, isLayerOn: () => true, setLayerOn() {},
    select() {}, deselected: 0, deselect() { ctx.deselected += 1; }, selected: () => null, observer: null,
    renderer: { info: { memory: { geometries: 40, textures: 12 }, programs: [] } },
  };
  return ctx;
}

function fakeTimers() {
  let seq = 0;
  const q = new Map();
  return {
    set(fn, ms) { seq += 1; q.set(seq, { at: wall + Math.max(0, ms || 0), fn }); return seq; },
    clear(id) { q.delete(id); },
    every(fn, ms) { seq += 1; q.set(seq, { at: wall + ms, fn, every: ms }); return seq; },
    stop(id) { q.delete(id); },
    now: () => wall,
    run() {
      for (let guard = 0; guard < 50; guard += 1) {
        let best = null;
        for (const [id, x] of q) if (x.at <= wall && (!best || x.at < best.x.at || (x.at === best.x.at && id < best.id))) best = { id, x };
        if (!best) return;
        if (best.x.every) best.x.at += best.x.every;
        else q.delete(best.id);
        best.x.fn();
      }
    },
  };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));
const pump = () => { for (const fn of frames.splice(0, frames.length)) { try { fn(0); } catch { /* the card needs more DOM than this stub */ } } };

/** One reel on the real machine. `land` says whether a flight is allowed to arrive. */
function world(link, { land = () => true } = {}) {
  clock.live();
  stage.setWorld('earth');
  stage.setOrigin(null);
  const ctx = makeCtx();
  const machine = createTrip(ctx);
  ctx.trip = machine;
  const timers = fakeTimers();
  const view = { cards: [], offers: [], modes: [], input: () => {}, mount() {}, unmount() {}, onInput(fn) { view.input = fn; }, setMode(m) { view.modes.push(m); }, captions() {}, card(c) { view.cards.push(c ? c.title : null); }, offer(on) { view.offers.push(on); } };
  const reloads = [];
  const store = new Map();
  const pilot = createAutopilot(ctx, {
    view, timers, clips: {}, seed: 1, reload: () => reloads.push(wall), hour: () => 14, wall: () => REAL,
    storage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v) },
    document: globalThis.document, navigator: {},
  });
  ctx.autopilot = pilot;
  const phases = [];
  machine.onChange((st) => { const key = `${st.tourId || '-'}:${st.phase}:${st.index}`; if (phases[phases.length - 1] !== key) phases.push(key); });
  const quiet = console.info;
  console.info = () => {};
  pilot.start(link);
  return {
    ctx, machine, pilot, view, reloads, phases,
    /** Let `ms` pass in 100 ms steps: the machine's frames, the rig's flights, the reel's timers. */
    async pass(ms) {
      for (let spent = 0; spent < ms; spent += 100) {
        wall += 100;
        REAL += 100;
        await settle();
        timers.run();
        pump();
        if (machine.state.phase === 'flight' && land(machine.state)) { ctx.cameraRig.finishFlight(); pump(); }
        await settle();
      }
    },
    what: (name) => pilot.log().filter((l) => l.what === name),
    done() { pilot.stop(); machine.dispose(); console.info = quiet; },
  };
}

// --- 1. three trips, two laps ------------------------------------------------------------------------
{
  const w = world({ ambient: 'fx-a,fx-b,fx-c' });
  // A trip: the card (8 s), three stops of 8 s and their settles, the end and a breath.
  await w.pass(2 * 3 * (8000 + 3 * 8600 + 1500) + 12000);
  const ends = w.what('trip-end').map((l) => l.trip);
  check(JSON.stringify(ends.slice(0, 6)) === JSON.stringify(['fx-a', 'fx-b', 'fx-c', 'fx-a', 'fx-b', 'fx-c']), `two laps of three trips on the real machine, in order: ${ends.join(' ')}`);
  const stops = w.what('stop').map((l) => `${l.trip}:${l.n}`);
  check(JSON.stringify(stops.slice(0, 9)) === JSON.stringify(['fx-a:1', 'fx-a:2', 'fx-a:3', 'fx-b:1', 'fx-b:2', 'fx-b:3', 'fx-c:1', 'fx-c:2', 'fx-c:3']), `every stop is reached, in order: ${stops.slice(0, 9).join(' ')}`);
  check(w.what('trip-end').every((l) => l.stops === 3 && l.mem && l.mem.geo === 40 && l.mem.tex === 12), 'each end is logged with its three stops and the renderer\'s counts');
  check(w.what('watchdog').length === 0 && w.what('skip').length === 0, `a healthy reel: the watchdog and the skips are silent (${JSON.stringify(w.what('watchdog').concat(w.what('skip')))})`);
  check(w.phases.includes('fx-a:outro:2') && w.phases.includes('fx-b:intro:-1'), 'each trip ends on its own end card and the next waits on its intro');
  const between = w.phases.indexOf('fx-a:outro:2');
  check(w.phases[between + 1] === '-:idle:-1', `between two trips the machine is idle: the first trip was put down before the second was started (${w.phases.slice(between, between + 3).join(' > ')})`);
  check(w.ctx.deselected >= ends.length, 'what each trip left selected is let go');
  check(w.view.cards.filter(Boolean).slice(0, 3).join('|') === 'Fixture fx-a|Fixture fx-b|Fixture fx-c', 'a card names each trip before it starts');
  check(w.reloads.length === 0, 'nothing reloaded');
  check(w.pilot.state().lap >= 2, `the lap counter went round (${w.pilot.state().lap})`);
  w.done();
  check(w.machine.state.phase === 'idle', 'stopping the reel leaves the machine idle');
}

// --- 2. a trip the machine refuses ----------------------------------------------------------------------
{
  const w = world({ ambient: 'fx-a,fx-empty,fx-b' });
  await w.pass(2 * (8000 + 3 * 8600 + 1500) + 14000);
  const skip = w.what('skip')[0];
  check(skip && skip.trip === 'fx-empty' && skip.why === 'refused', `the machine refuses a trip with no stops to show, and the reel skips it (${JSON.stringify(skip)})`);
  check(!w.view.cards.includes('Fixture fx-empty'), 'a refused trip is never announced');
  check(w.what('trip-end').map((l) => l.trip).join(' ').startsWith('fx-a fx-b'), 'the trips either side of it play');
  check(w.pilot.state().skips === 0 && w.reloads.length === 0, 'a refusal is not a fault');
  w.done();
}

// --- 3. the controls, taken mid-flight and given back -----------------------------------------------------
{
  const w = world({ ambient: 'fx-a,fx-b,fx-c' }, { land: (st) => !(st.tourId === 'fx-a' && st.index === 1) });
  await w.pass(8000 + 8600 + 3000);
  check(w.machine.state.tourId === 'fx-a' && w.machine.state.phase === 'flight' && w.machine.state.index === 1, `mid-flight to the second stop (${w.machine.state.phase} @ ${w.machine.state.index})`);
  w.view.input('escape');
  check(w.machine.state.phase === 'idle' && w.pilot.active === false && w.pilot.engaged === true, 'Escape: the machine is idle, the visitor has the map, the mode is still on');
  await w.pass(60000);
  check(w.machine.state.phase === 'idle', 'nothing restarts under a visitor');
  await w.pass(62000 + 9000);
  check(w.pilot.active === true && w.machine.state.tourId === 'fx-b', `two minutes with no hand: the reel plays the next trip (${w.machine.state.tourId})`);
  w.done();
}

// --- 4. a flight that never lands --------------------------------------------------------------------------
{
  const w = world({ ambient: 'fx-a,fx-b,fx-c' }, { land: (st) => !(st.tourId === 'fx-a' && st.index === 1) });
  // Since internal #322 the machine lands an overdue flight itself (ui/trip.js FLIGHT_GRACE_MS, held
  // by tests/test_trip_flight_ends.mjs), so the reel's watchdog, which tests/test_autopilot.mjs holds
  // against a machine that really is stuck, has nothing to do here.
  await w.pass(8000 + 8600 + 6000 + 4000 + 1000);
  check(w.machine.state.index === 1 && ['settle', 'dwell'].includes(w.machine.state.phase), `the machine lands the stop whose arrival never came (${w.machine.state.phase} @ ${w.machine.state.index})`);
  check(w.what('watchdog').length === 0, 'the reel\'s watchdog is silent: the trip looked after itself');
  await w.pass(12000);
  check(w.what('stop').some((l) => l.trip === 'fx-a' && l.n === 3), 'the machine went on to the third stop');
  await w.pass(12000 + 9000 + 4000);
  check(w.what('trip-end')[0] && w.what('trip-end')[0].trip === 'fx-a', 'and the trip ended on its own end card');
  w.done();
}

// --- 5. the frame under a reel ------------------------------------------------------------------------------
{
  const listeners = [];
  let state = { phase: 'idle', index: -1, count: 0, tourId: 'fx-a', tourTitle: 'Fixture', stopTitle: '', pacing: 'auto', estimateMs: 0, dropped: [], stops: [] };
  const paced = [];
  const trip = {
    get state() { return state; },
    onChange(fn) { listeners.push(fn); return () => {}; },
    setPacing(mode) { paced.push(mode); },
    pause() {}, resume() {}, next() {}, back() {}, replay() {}, play() {}, start() {},
    stop() { state = { ...state, phase: 'idle' }; for (const fn of listeners) fn(state); },
    dwellFraction: () => 0.4, currentRecordId: () => null, holdDwell: () => false,
  };
  const notify = (patch) => { state = { ...state, ...patch }; for (const fn of listeners) fn(state); };
  const ctx = {
    trip, cameraRig: null, clock: { mode: 'live', rate: 1, paused: false, now: () => REAL, onChange: () => () => {} },
    audio: { isOn: () => false, onChange: () => () => {}, enable() {}, disable() {} }, mobile: null, veil: null, stage: { worldId: 'earth' },
    autopilot: { active: true },
  };
  written.length = 0;
  location.hash = '#ambient=lobby';
  const frame = createTripFrame(ctx);
  notify({ phase: 'dwell', index: 1, count: 3, stopTitle: 'The Moon', estimateMs: 60000 });
  check(document.documentElement.classList.contains('sr-present'), 'under a reel the frame is in present mode without being asked by the link');
  check(paced[paced.length - 1] === 'auto', `...and paces itself (${paced.join(',')})`);
  check(!written.some((h) => /present=/.test(h)), `it writes no \`present=\` into a kiosk's address (${written.join(' ')})`);
  ctx.autopilot.active = false;
  trip.stop();
  check(!document.documentElement.classList.contains('sr-present'), 'the mode goes with the trip');
  notify({ phase: 'dwell', index: 0, count: 3, stopTitle: 'Earth' });
  check(!document.documentElement.classList.contains('sr-present'), 'a trip the visitor starts after taking the controls is an ordinary one');
  frame.dispose();
}

Date.now = realDateNow;
Object.defineProperty(globalThis, 'performance', { value: realPerformance, configurable: true });

if (problems.length) {
  console.error(`autopilot on the real trip FAILED (${problems.length}):`);
  for (const p of problems) console.error('  -', p);
  process.exit(1);
}
console.log('autopilot on the real trip ok: two laps of three trips in order, a refused trip skipped, the controls taken and given back, a lost arrival landed by the machine, the frame in present mode under a reel');

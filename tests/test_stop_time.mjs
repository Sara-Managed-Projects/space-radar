// tests/test_stop_time.mjs -- a trip stop may set the clock (spec 0030), and leaving puts it back.
//
//   node tests/test_stop_time.mjs
//
// THE CLOCK HERE IS THE REAL ONE. site/js/clock.js is driven with its one wall-clock call,
// Date.now(), replaced by a number this test moves by hand -- so every assertion about the restore
// is an assertion about the clock that ships, and "0 ms of drift after Leave" (spec 0025's
// measurement) is checked against the arithmetic the browser runs. The trip machine is the real
// ui/trip.js on the real camera rig, driven the way tests/test_moon_trip.mjs drives it: rAF is a
// queue drained by hand, and the trips are fixture rows pushed onto the mirror's own TOURS array.
//
// What it holds, in the order of spec 0030 task 2's acceptance:
//   (a) a stop with `time:` arrives with clock.now() at the instant, the clock held through the
//       flight and running once the camera is there;
//   (b) `rate:` sets clock.rate, and a following stop without `rate:` runs at 1 from where the
//       clock got to;
//   (c) stop() puts mode, rate, paused and instant back, and a visitor who was live is live, with
//       offsetMs() exactly 0;
//   (d) a trip with no timed stop never moves the instant and never takes the clock;
//   (e) an `{event:}` stop arrives at spec 0031's computed event plus its offset (the annular
//       eclipse of 2027-02-06, 90 minutes early), and one the resolver cannot find -- a launch,
//       with no launch list loaded -- is dropped before the count, or held with the honest sentence
//       when it asks to be;
//   (f) pause sets clock.paused only while the trip owns the clock;
//   plus the runtime caps (a world off the Sun's stage is held to 36 000, an SGP4 subject to 60,
//   a trip that loads `active` never takes the clock), the "Shown at" line, and 200 timed stops
//   under reduced motion at callback depth 1.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');

// The wall clock, by hand. clock.js reads Date.now() at import for its first instant.
let REAL = Date.parse('2026-09-23T12:00:00Z');
const realDateNow = Date.now;
Date.now = () => REAL;

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { TOURS } = await import(join(JS, 'data/tours.js'));
const { clock } = await import(join(JS, 'clock.js'));
const { createCameraRig } = await import(join(JS, 'scene/camera.js'));
const { createTrip } = await import(join(JS, 'ui/trip.js'));
const { stopTimeLine } = await import(join(JS, 'ui/tripframe.js'));
const { parseCelestrakGP } = await import(join(JS, 'data/parsers.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { nextEvent } = await import(join(JS, 'data/events.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const notes = [];

// rAF as a queue drained by hand.
const frames = [];
globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
const pump = (n = 4) => {
  for (let i = 0; i < n; i += 1) {
    for (const fn of frames.splice(0, frames.length)) {
      // paintCard reaches ui/cards.js, which wants a document; the clock is what is under test.
      try { fn(0); } catch { /* not under test */ }
    }
  }
};

// Every call the trip makes on the clock, counted, without changing what the call does.
const calls = { goTo: 0, setRate: 0, setPaused: 0, live: 0 };
for (const name of Object.keys(calls)) {
  const real = clock[name].bind(clock);
  clock[name] = (...args) => { calls[name] += 1; return real(...args); };
}
const resetCalls = () => { for (const k of Object.keys(calls)) calls[k] = 0; };
/** Real time passes: the wall clock moves and the render loop ticks the app clock by the same. */
const passes = (ms) => { REAL += ms; clock.tick(ms); };

// The one SGP4 subject: the captured ISS element set the harvester's parser tests read.
const gp = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/celestrak_gp.json'), 'utf8'));
const sgp4 = parseCelestrakGP(gp, { layer: 'stations', source: 'celestrak-stations' });
check(sgp4.length === 1 && sgp4[0].propagator === 'sgp4', 'the captured ISS parses to one SGP4 record');
const byId = new Map(sgp4.map((r) => [r.id, r]));

function makeCtx() {
  const camera = new THREE.PerspectiveCamera(45, 1.6, 0.001, 1e9);
  camera.position.set(0, 0, 22);
  const rig = createCameraRig(camera, null, { worldRadius: 6.371 });
  const ctx = {
    camera,
    cameraRig: rig,
    clock,
    layers: [{ id: 'stations', propagator: 'sgp4', nearKm: 20000 }, { id: 'worlds', propagator: 'body' }],
    recordsFor: (id) => sgp4.filter((r) => r.layer === id),
    recordById: (id) => byId.get(id) || null,
    isLayerOn: () => true,
    setLayerOn() {},
    select() {},
    deselect() {},
    selected: () => null,
    observer: null,
  };
  return ctx;
}

// ---------------------------------------------------------------------------- the fixtures
const card = (title) => ({ title, body: 'A fixture stop for tests/test_stop_time.mjs, with enough words to have a dwell.' });
const stopRow = (id, target, extra = {}) => ({
  id, target, frame_radii: 5, drift_deg: 0, drift_rate_deg_s: 6, drift: 'none', key_light_deg: 125,
  ease: 'auto', on_unresolved: 'drop', card: card(id), dwell_ms: 8000, ...extra,
});
const trip = (id, stops, extra = {}) => ({
  id, title: id, blurb: 'fixture', pacing: 'auto', requires: [], min_stops: 3, stage: 'earth',
  clock: 'as-found', stops, estimate_ms: stops.length * 11350, ...extra,
});
const ISO = '2027-08-02T10:07:00Z';
const AT = Date.parse(ISO);
TOURS.push(
  trip('fx-timed', [
    stopRow('eclipse-morning', { world: 'earth' }, { time: ISO, rate: 600 }),
    stopRow('moon-after', { world: 'moon' }),
    stopRow('earth-fast', { world: 'earth' }, { rate: 60 }),
  ]),
  trip('fx-untimed', [
    stopRow('one', { world: 'earth' }),
    stopRow('two', { world: 'moon' }),
    stopRow('three', { world: 'earth' }),
  ]),
  trip('fx-event-drop', [
    stopRow('one', { world: 'earth' }, { rate: 10 }),
    stopRow('launch', { world: 'moon' }, { time: { event: 'launch.next', offset_s: -5400 } }),
    stopRow('two', { world: 'moon' }),
    stopRow('three', { world: 'earth' }),
  ]),
  trip('fx-eclipse', [
    stopRow('before-the-eclipse', { world: 'earth' }, { time: { event: 'solar-eclipse.next', offset_s: -5400 }, rate: 60 }),
    stopRow('two', { world: 'moon' }),
    stopRow('three', { world: 'earth' }),
  ]),
  trip('fx-event-hold', [
    stopRow('one', { world: 'earth' }),
    stopRow('launch', { world: 'moon' }, { time: { event: 'launch.next', offset_s: 0 }, on_unresolved: 'hold' }),
    stopRow('two', { world: 'moon' }),
  ]),
  trip('fx-caps', [
    stopRow('moon-too-fast', { world: 'moon' }, { rate: 525600 }),
    stopRow('iss-too-fast', { layer: 'stations', catalog: '25544' }, { rate: 600, distance_km: 3000 }),
    stopRow('earth', { world: 'earth' }),
  ]),
  trip('fx-active', [
    stopRow('one', { world: 'earth' }, { time: ISO, rate: 600 }),
    stopRow('two', { world: 'moon' }),
    stopRow('three', { world: 'earth' }),
  ], { requires: ['active'] }),
);

stage.setWorld('earth');
stage.setOrigin(null);

/** A fresh machine, started and played to its first stop, arrived there. */
async function begin(id) {
  const ctx = makeCtx();
  const machine = createTrip(ctx);
  const shape = await machine.start(id);
  pump();
  machine.play();
  pump(1);
  return { ctx, machine, shape };
}
/** The flight collapses onto its end, as Next does, and the arrival runs. */
function arrive({ ctx }) {
  ctx.cameraRig.finishFlight();
  pump(2);
}

// ---------------------------------------------- (a) (b) (c) the timed trip, from a live visitor
{
  clock.live();
  resetCalls();
  const run = await begin('fx-timed');
  const { machine } = run;
  check(machine.state.clockMoves === true, '(a) a trip with a timed stop says so on its intro (state.clockMoves)');
  check(machine.state.index === 0 && machine.state.phase === 'flight', `(a) the first stop is flying (${machine.state.phase})`);
  check(clock.now() === AT, `(a) the clock is at the stop's instant as the shot is composed: ${new Date(clock.now()).toISOString()}`);
  check(clock.rate === 600 && clock.mode === 'scrub', `(b) rate ${clock.rate}, mode ${clock.mode}: the stop asked for 600`);
  check(clock.paused === true, '(a) the clock is held while the camera flies, so the arrival is at the instant it was composed for');
  passes(3000);
  check(clock.now() === AT, `(a) three seconds of flight moved the held clock ${clock.now() - AT} ms`);
  arrive(run);
  check(clock.paused === false && clock.now() === AT, '(a) once the camera is there the clock runs again, from the instant');
  check(machine.state.clockOwned === true, 'the trip owns the clock from the first timed stop');
  const line = stopTimeLine(machine.state, clock);
  check(line === 'Shown at 2 Aug 2027, 10:07 UTC, running ten minutes a second', `the shown-at line: "${line}"`);
  passes(10000);
  check(clock.now() === AT + 10000 * 600, `(b) ten seconds at 600x is 6 000 000 ms of clock: ${clock.now() - AT}`);
  const beforeNext = clock.now();
  machine.next();
  pump(1);
  check(clock.rate === 1, `(b) a stop without rate: runs at 1 once the trip owns the clock (rate ${clock.rate})`);
  check(clock.now() === beforeNext && clock.mode === 'scrub', '(b) a stop without time: carries on from where the clock got to');
  check(clock.paused === false, 'at 1x there is nothing to hold through the flight');
  arrive(run);
  machine.next();
  pump(1);
  check(clock.rate === 60, `(b) the third stop sets 60 (rate ${clock.rate})`);
  arrive(run);
  // (f) pause while the trip owns the clock pauses the clock, and resume lets it go.
  machine.pause('control');
  check(machine.state.phase === 'paused' && clock.paused === true, '(f) pausing a trip that owns the clock pauses the clock');
  check(/held while the trip is paused/.test(stopTimeLine(machine.state, clock)), `the line says the clock is held: "${stopTimeLine(machine.state, clock)}"`);
  const heldAt = clock.now();
  passes(5000);
  check(clock.now() === heldAt, '(f) a paused trip holds the planets still');
  machine.resume();
  check(clock.paused === false, '(f) resuming lets the clock run again');
  // (c) Leave. The visitor was live: live again, and not a millisecond off.
  passes(4321);
  machine.stop('left');
  check(clock.mode === 'live' && clock.rate === 1 && clock.paused === false, `(c) a live visitor leaves live: ${clock.mode} ${clock.rate} ${clock.paused}`);
  check(clock.offsetMs() === 0 && clock.now() === REAL, `(c) 0 ms of drift after Leave, measured ${clock.offsetMs()} ms`);
  check(machine.state.clockMoves === false && machine.state.clockOwned === false, 'leaving clears the trip\'s hold on the clock');
  machine.dispose();
}

// --------------------------------------------- (c) the same trip from a paused, scrubbing visitor
{
  clock.live();
  clock.setRate(10);
  clock.goTo(Date.parse('2031-01-01T00:00:00Z'));
  clock.setPaused(true);
  const saved = { mode: clock.mode, rate: clock.rate, paused: clock.paused, t: clock.now() };
  const run = await begin('fx-timed');
  arrive(run);
  passes(7000);
  run.machine.next();
  pump(1);
  arrive(run);
  passes(3000);
  run.machine.stop('left');
  check(clock.mode === saved.mode && clock.rate === saved.rate && clock.paused === saved.paused && clock.now() === saved.t,
    `(c) a scrubbing, paused visitor gets exactly their clock back: ${clock.mode} ${clock.rate} ${clock.paused} ${new Date(clock.now()).toISOString()}`);
  run.machine.dispose();
}

// ----------------------------------------------------------- (d) (f) a trip that moves nothing
{
  clock.live();
  clock.setRate(10); // the visitor's own scrub, as spec 0025's review measured it
  resetCalls();
  const before = clock.now();
  const run = await begin('fx-untimed');
  check(run.machine.state.clockMoves === false, '(d) an untimed trip does not say it moves the clock');
  arrive(run);
  passes(12000);
  run.machine.pause('control');
  check(clock.paused === false, '(f) pausing a trip that does not own the clock leaves the clock alone');
  run.machine.resume();
  const advanced = clock.now();
  run.machine.stop('left');
  check(calls.goTo === 0 && calls.live === 0, `(d) an untimed trip never moved the instant (goTo ${calls.goTo}, live ${calls.live})`);
  check(clock.now() === advanced && advanced === before + 12000 * 10,
    `(d) leaving an untimed trip does not rewind the visitor's clock: ${clock.now() - before} ms on, expected ${12000 * 10}`);
  check(clock.rate === 10 && clock.mode === 'scrub', '(d) the visitor\'s rate stands');
  run.machine.dispose();
}

// ------------------------------------------------ (e) an event found, and an event nobody can find
{
  clock.live();
  const eclipse = nextEvent('solar-eclipse', clock.now(), null, []);
  check(eclipse && new Date(eclipse.t).toISOString().startsWith('2027-02-06'),
    `(e) spec 0031 finds the next solar eclipse after 2026-09-23 on 2027-02-06: ${eclipse && new Date(eclipse.t).toISOString()}`);
  const ecl = await begin('fx-eclipse');
  check(eclipse && clock.now() === eclipse.t - 5400 * 1000 && clock.rate === 60,
    `(e) the eclipse stop arrives 90 minutes before it: ${new Date(clock.now()).toISOString()} at ${clock.rate}x`);
  ecl.machine.stop('left');
  check(clock.mode === 'live' && clock.offsetMs() === 0, '(e) and leaving an eclipse stop puts the live clock back');
  ecl.machine.dispose();
  check(nextEvent('launch', clock.now(), null, []) === null, '(e) with no launch list loaded there is no next launch to find');
  const ctx = makeCtx();
  const machine = createTrip(ctx);
  const plan = await machine.plan('fx-event-drop');
  check(plan.count === 3 && plan.dropped.length === 1 && plan.dropped[0].id === 'launch',
    `(e) the event stop is dropped before the count: ${plan.count} stops, dropped ${plan.dropped.map((d) => d.id)}`);
  machine.dispose();

  const run = await begin('fx-event-hold');
  check(run.machine.state.count === 3, `(e) a held event stop is counted: ${run.machine.state.count}`);
  arrive(run);
  // A held stop paints its card synchronously, and ui/cards.js wants a document; the state it is
  // checked by is set before the paint.
  try { run.machine.next(); } catch { /* not under test */ }
  pump(1);
  check(run.machine.state.phase === 'held' && run.machine.state.held && run.machine.state.held.stopId === 'launch',
    `(e) on_unresolved: hold shows the honest failure at the event stop (${run.machine.state.phase})`);
  run.machine.stop('left');
  check(clock.mode === 'live' && clock.offsetMs() === 0, '(e) and leaving from it is clean');
  run.machine.dispose();
}

// ------------------------------------------------------------------------ the runtime caps
{
  clock.live();
  const run = await begin('fx-caps');
  check(clock.rate === 36000, `a world off the Sun's stage is held to the clock's own top speed: asked 525 600, ran ${clock.rate}`);
  arrive(run);
  run.machine.next();
  pump(1);
  const entryIsIss = run.machine.currentRecordId && run.machine.state.stopId === 'iss-too-fast';
  check(entryIsIss && clock.rate === 60, `an SGP4 subject is held to 60 whatever the row says: ran ${clock.rate} at ${run.machine.state.stopId}`);
  run.machine.stop('left');
  check(clock.mode === 'live' && clock.offsetMs() === 0, 'and leaving puts the live clock back');
  run.machine.dispose();

  resetCalls();
  const act = await begin('fx-active');
  arrive(act);
  check(calls.goTo === 0 && calls.setRate === 0 && clock.mode === 'live' && act.machine.state.clockMoves === false,
    `a trip that loads \`active\` never takes the clock (goTo ${calls.goTo}, setRate ${calls.setRate}, ${clock.mode})`);
  act.machine.stop('left');
  act.machine.dispose();
}

// ------------------------------------- 200 timed stops under reduced motion, callback depth 1
{
  const mm = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  globalThis.matchMedia = mm;
  globalThis.window = { matchMedia: mm, addEventListener() {}, removeEventListener() {}, dispatchEvent() {} };
  const N = 200;
  const instants = [];
  const stops = [];
  for (let i = 0; i < N; i += 1) {
    const ms = Date.parse('2027-01-01T00:00:00Z') + i * 86400000;
    instants.push(ms);
    stops.push(stopRow(`s${i}`, { world: i % 2 ? 'moon' : 'earth' }, { time: new Date(ms).toISOString().replace('.000', '') }));
  }
  TOURS.push(trip('fx-two-hundred', stops));
  clock.live();
  const ctx = makeCtx();
  const rig = ctx.cameraRig;
  let depth = 0;
  let maxDepth = 0;
  const flyTo = rig.flyTo.bind(rig);
  rig.flyTo = (opts) => {
    depth += 1;
    maxDepth = Math.max(maxDepth, depth);
    try { return flyTo(opts); } finally { depth -= 1; }
  };
  const machine = createTrip(ctx);
  await machine.start('fx-two-hundred');
  pump();
  check(machine.state.pacing === 'reader', 'reduced motion forces reader pacing');
  machine.play();
  let atInstant = 0;
  for (let i = 0; i < N; i += 1) {
    pump(2);
    if (machine.state.index === i && clock.now() === instants[i]) atInstant += 1;
    if (i + 1 < N) machine.next();
  }
  check(atInstant === N, `under reduced motion ${atInstant} of ${N} timed stops arrived at their own instant`);
  check(maxDepth === 1, `a chained itinerary of ${N} timed stops re-entered a flight ${maxDepth} deep`);
  machine.stop('left');
  check(clock.mode === 'live' && clock.offsetMs() === 0, 'and the 200-stop trip leaves the clock live');
  machine.dispose();
  delete globalThis.window;
  delete globalThis.matchMedia;
  notes.push(`${N} timed stops under reduced motion at callback depth ${maxDepth}`);
}

Date.now = realDateNow;
if (problems.length) {
  console.error(`stop time FAILED (${problems.length}):\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log(
  'stop time ok: a timed stop arrives at its instant with the clock held through the flight, a later ' +
    'stop runs at 1 from there, pause holds the clock only while the trip owns it, an event stop ' +
    'arrives at the computed eclipse or, not found, is dropped or held, the caps hold at runtime, and leaving puts the ' +
    `real clock back with 0 ms of drift; ${notes.join('; ')}`,
);

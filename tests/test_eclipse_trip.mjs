// tests/test_eclipse_trip.mjs -- "Chasing the solar eclipse" (spec 0037 task 4), the real row.
//
//   node tests/test_eclipse_trip.mjs
//
// The trip machine is the real ui/trip.js on the real clock and camera rig, driven the way
// tests/test_stop_time.mjs drives it (rAF a queue drained by hand, Date.now() a number moved by
// hand). The events are the library's own, computed by data/events.js and pinned against NASA GSFC
// in tests/test_events.mjs; this file checks that each stop lands on the right one.
//
// What it holds:
//   - from 2026-09-23 all five stops resolve and none is dropped before the count;
//   - stop 1 is 5 400 s before stop 2, and stop 2 is the TOTAL eclipse of 2027-08-02 even after
//     stop 1's card has run the clock past it at 600x (event references count from the visitor's
//     clock, not from wherever an earlier stop left it -- the bug this file was written against);
//   - stop 3 carries on from stop 2's instant; stop 4 is the next annular; stop 5 an hour before
//     the next TOTAL lunar eclipse, 2028-12-31, past the 400 days a bare reference looks;
//   - the frame's eclipse line is on every stop, says the colour is an illustration on the lunar
//     one, and changes under the frame latch;
//   - leaving puts a live visitor back on live with 0 ms of offset;
//   - from the day after the 2027 total, stops 1 and 2 move on to 2028-07-22 by themselves.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');

let REAL = Date.parse('2026-09-23T12:00:00Z');
const realDateNow = Date.now;
Date.now = () => REAL;

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { TOURS } = await import(join(JS, 'data/tours.js'));
const { clock } = await import(join(JS, 'clock.js'));
const { createCameraRig } = await import(join(JS, 'scene/camera.js'));
const { createTrip } = await import(join(JS, 'ui/trip.js'));
const { eclipseLine, stopTimeLine } = await import(join(JS, 'ui/tripframe.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { nextEvent } = await import(join(JS, 'data/events.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const iso = (ms) => new Date(ms).toISOString();

const frames = [];
globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
const pump = (n = 4) => {
  for (let i = 0; i < n; i += 1) {
    for (const fn of frames.splice(0, frames.length)) {
      try { fn(0); } catch { /* ui/cards.js wants a document; the clock is what is under test */ }
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

const ID = 'chasing-the-solar-eclipse';
const row = TOURS.find((t) => t.id === ID);
check(!!row, `registry/tours.yaml has \`${ID}\` (and site/js/data/tours.js mirrors it)`);
check(row && row.group === 'events' && row.stops.length === 5, 'the trip is in the events group with five stops');

stage.setWorld('earth');
stage.setOrigin(null);

async function begin(ctx) {
  const machine = createTrip(ctx);
  const shape = await machine.start(ID);
  pump();
  machine.play();
  pump(1);
  return { machine, shape };
}
const arrive = (ctx) => { ctx.cameraRig.finishFlight(); pump(2); };

const total = nextEvent('solar-eclipse', REAL, null, [], { kind: 'total' });
const annular = nextEvent('solar-eclipse', REAL, null, [], { kind: 'annular' });
const lunar = nextEvent('lunar-eclipse', REAL, null, [], { kind: 'total' });
check(total && iso(total.t).startsWith('2027-08-02T10:06'), `the next total solar eclipse: ${total && iso(total.t)}`);
check(annular && iso(annular.t).startsWith('2027-02-06T15:59'), `the next annular: ${annular && iso(annular.t)}`);
check(lunar && iso(lunar.t).startsWith('2028-12-31T16:51'), `the next total lunar eclipse: ${lunar && iso(lunar.t)}`);

const seen = [];
if (row && total && annular && lunar) {
  clock.live();
  const ctx = makeCtx();
  const plan = await createTrip(ctx).plan(ID);
  check(plan.count === 5 && plan.dropped.length === 0, `from 2026-09-23 all five stops resolve: ${plan.count}, dropped ${plan.dropped.map((d) => d.id)}`);

  const { machine } = await begin(ctx);
  const at = () => ({ id: machine.state.stopId, t: clock.now(), rate: clock.rate, line: eclipseLine(machine.state, true) });

  // 1. ninety minutes before, at ten minutes a second
  check(machine.state.clockMoves === true, 'the intro says the trip moves the clock');
  arrive(ctx);
  seen.push(at());
  check(clock.now() === total.t - 5400e3 && clock.rate === 600, `stop 1 is 5 400 s before the total, at 600x: ${iso(clock.now())} ${clock.rate}x`);
  check(eclipseLine(machine.state, true) === COPY.trip.eclipseLine, 'stop 1 carries the eclipse line');
  // the card runs sixteen seconds: 2 h 40 min of clock, past the peak
  passes(16000);
  check(clock.now() > total.t, `sixteen seconds at 600x carried the clock past the peak (${iso(clock.now())})`);
  const shadowSweep = clock.now();

  // 2. the minute, counted from the visitor's clock and not from where stop 1 left it
  machine.next(); pump(1); arrive(ctx);
  seen.push(at());
  check(clock.now() === total.t && clock.rate === 1, `stop 2 is the total at 1x, not the one after (${iso(clock.now())}, ${clock.rate}x)`);
  check(seen[1].t - seen[0].t === 5400e3, `stop 1 is exactly 5 400 s before stop 2 (${(seen[1].t - seen[0].t) / 1e3} s)`);
  check(/^Shown at 2 Aug 2027, 10:06 UTC$/.test(stopTimeLine(machine.state, clock)), `the shown-at line: "${stopTimeLine(machine.state, clock)}"`);
  passes(10000);

  // 3. from behind the Moon: carries on from stop 2, at a minute a second
  const before3 = clock.now();
  machine.next(); pump(1); arrive(ctx);
  seen.push(at());
  check(clock.now() === before3 && clock.rate === 60, `stop 3 carries on from stop 2's clock at 60x (${iso(clock.now())})`);
  check(machine.state.stopEventType === 'solar-eclipse' && eclipseLine(machine.state, true) === COPY.trip.eclipseLine,
    'stop 3 has no time of its own and still carries the eclipse line: its instant is stop 2\'s');
  passes(10000);

  // 4. the ring
  machine.next(); pump(1); arrive(ctx);
  seen.push(at());
  check(clock.now() === annular.t && clock.rate === 1, `stop 4 is the next annular (${iso(clock.now())})`);

  // 5. the Earth's shadow on the Moon
  machine.next(); pump(1); arrive(ctx);
  seen.push(at());
  check(clock.now() === lunar.t - 3600e3 && clock.rate === 600, `stop 5 is an hour before the total lunar eclipse at 600x (${iso(clock.now())})`);
  const lunarLine = eclipseLine(machine.state, true);
  check(lunarLine.includes(COPY.trip.eclipseLine) && lunarLine.includes(COPY.trip.eclipseColour),
    `the lunar stop adds that the colour is an illustration: "${lunarLine}"`);
  check(eclipseLine(machine.state, false) === COPY.trip.eclipseLineLatched, 'under the frame latch the line says the shadow is not drawn here');
// 2026-09-23: the shadow draws whatever the frame latch says (main.js ctx.eclipseDrawn): gated on
// it, the live trip told exactly the slow phones "the shadow is not drawn on this device".
{
  const { readFileSync } = await import('node:fs');
  const mainSrc = readFileSync(new URL('../site/js/main.js', import.meta.url), 'utf8');
  check(/ctx\.eclipseDrawn = \(\) => ctx\.eclipseOverride !== false;/.test(mainSrc), 'the eclipse shadow is not gated on the frame latch');
}

  machine.stop('left');
  check(clock.mode === 'live' && clock.offsetMs() === 0, `leaving puts the live clock back (${clock.mode}, ${clock.offsetMs()} ms)`);
  machine.dispose();
  void shadowSweep;
}

// No eclipse line off an eclipse, and none before a stop.
check(eclipseLine({ stopEventType: null }, true) === '' && eclipseLine({ stopEventType: 'launch' }, true) === '', 'no eclipse line on a stop that is not one');

// The copy: shadow and path, to about a minute, no double hyphen, no alarm.
for (const k of ['eclipseLine', 'eclipseLineLatched', 'eclipseColour']) {
  const s = COPY.trip[k] || '';
  check(s && !s.includes('--') && !/darkness falls|goes out|danger|protect your eyes/i.test(s), `COPY.trip.${k} is plain: "${s}"`);
}
check(/to about a minute/.test(COPY.trip.eclipseLine), 'the line says the library\'s precision');

// A year on, the same row finds the next total by itself.
if (row) {
  REAL = Date.parse('2027-08-03T00:00:00Z');
  clock.live();
  const ctx = makeCtx();
  const { machine } = await begin(ctx);
  arrive(ctx);
  const next = nextEvent('solar-eclipse', REAL, null, [], { kind: 'total' });
  check(next && iso(next.t).startsWith('2028-07-22') && clock.now() === next.t - 5400e3,
    `from 2027-08-03 stop 1 is before the 2028-07-22 total (${iso(clock.now())})`);
  machine.stop('left');
  machine.dispose();
}

Date.now = realDateNow;
if (problems.length) {
  console.error(`eclipse trip FAILED (${problems.length}):\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log('eclipse trip ok: five stops from the visitor\'s clock -- ' + seen.map((s) => `${s.id} ${iso(s.t)} ${s.rate}x`).join('; ') + '; leave is live with 0 ms');

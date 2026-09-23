// tests/test_year_trip.mjs -- "A year in a minute": four stops on the Sun's stage, the clock at a
// year a minute, and every world drawn at its true size and place (spec 0030 task 4).
//
//   node tests/test_year_trip.mjs
//
// What a validator reading registry/tours.yaml cannot see:
//
//   1. EVERY WORLD IS DRAWN TRUE. The trip is on the Sun's stage because it is the stage that
//      squeezes nothing (scene/worlds.js compressesFrom), so the orbits on screen are the orbits.
//   2. THE WORDS HOLD, under the same caps check_registry.py applies, read from it.
//   3. THE MACHINE RUNS IT AS WRITTEN, with the real clock.js (its Date.now() moved by hand): the
//      first stop starts from the visitor's present, each stop runs at 525 600, the clock is held
//      while the camera flies and runs under the card, the Earth goes 30 degrees round the Sun in
//      five real seconds, and leaving puts the visitor back on live with 0 ms of drift.
//   4. THE CAMERA SEES THE ORBITS. The Sun has no key light, so on this stage the camera looks down
//      from 50 degrees above the planets' plane (ui/trip.js SUN_OVERVIEW_POLAR); from there Mars and
//      the Earth are inside the frame at the first stop and Jupiter at the last, at four dates, and
//      the Sun is in the picture behind Mercury.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');

let REAL = Date.parse('2026-09-23T12:00:00Z');
const realDateNow = Date.now;
Date.now = () => REAL;

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { TOURS, TOUR_GROUPS } = await import(join(JS, 'data/tours.js'));
const { clock } = await import(join(JS, 'clock.js'));
const { WORLDS, createWorlds, positionOf, compressesFrom } = await import(join(JS, 'scene/worlds.js'));
const { stage, STAGES } = await import(join(JS, 'scene/stage.js'));
const { createCameraRig, worldFramingDistance } = await import(join(JS, 'scene/camera.js'));
const { createTrip } = await import(join(JS, 'ui/trip.js'));
const { stopTimeLine } = await import(join(JS, 'ui/tripframe.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const notes = [];

const TRIP_ID = 'a-year-in-a-minute';
const trip = TOURS.find((t) => t.id === TRIP_ID);
if (!trip) {
  console.error(`year trip FAILED: there is no '${TRIP_ID}' in data/tours.js`);
  process.exit(1);
}
const RATE = 525600; // the minutes in a year: one real minute is one year of the clock
const DAY_MS = 86400000;
// NASA's planetary fact sheet (https://nssdc.gsfc.nasa.gov/planetary/factsheet/, read 2026-09-23),
// the numbers the cards and the YAML comments state.
const EARTH_YEAR_D = 365.2;
const MERCURY_ORBIT_KM = 57.9e6;

// --------------------------------------------------------- 1. four worlds, all drawn true
check(trip.stops.length === 4, `${trip.stops.length} stops; the design has four`);
check(trip.stage === 'sun', `the trip is on the ${trip.stage} stage, not the Sun's`);
check(compressesFrom('sun') === false, 'the Sun\'s stage squeezes nothing, which is the whole reason the trip lives there');
check(trip.group === 'solar-system' && (TOUR_GROUPS || []).some((g) => g.id === trip.group), `group ${trip.group} is a row of the picker's table`);
check(trip.next === 'outer-solar-system' && TOURS.some((t) => t.id === trip.next), `the end card offers ${trip.next}`);
check((trip.requires || []).join() === 'worlds', `the trip needs the worlds and nothing else: ${trip.requires}`);
check(/back to Earth/.test(trip.blurb) && /clock back/.test(trip.blurb), 'leaving changes the stage and the clock, and the blurb must say both');
check(trip.stops[0].time === 'now', 'the first stop starts from the visitor\'s present, so nothing here names a date');
for (const stop of trip.stops) {
  const w = stop.target && stop.target.world;
  check(w && WORLDS.some((x) => x.id === w), `${stop.id}: a \`world:\` target, and a real one (${JSON.stringify(stop.target)})`);
  check(stop.rate === RATE, `${stop.id}: rate ${stop.rate}, not ${RATE}`);
  check(!stop.stage || stop.stage === 'sun', `${stop.id}: flown on the Sun's stage`);
  check(stop.stops === undefined && stop.drift_deg === 0, `${stop.id}: no drift; the planets are the motion`);
}
const mercury = trip.stops.find((s) => s.target.world === 'mercury');
check(mercury && mercury.distance_km >= 1.0 * 58e6, `the Mercury stop sits ${mercury && mercury.distance_km} km out; its orbit is 0.39 au, 58 million km`);
check(mercury && mercury.behind === 'sun', 'the Mercury stop keeps the Sun in the picture, or its laps have nothing to go round');

// ------------------------------------------------------------------------ 2. the words hold
const checker = readFileSync(join(ROOT, 'scripts/check_registry.py'), 'utf8');
const MAX_SENTENCE = Number((checker.match(/^MAX_SENTENCE\s*=\s*(\d+)/m) || [])[1]);
const MAX_TITLE = Number((checker.match(/^TOUR_MAX_TITLE\s*=\s*(\d+)/m) || [])[1]);
const timeBlock = (checker.match(/^TIME_RELATIVE\s*=\s*\(([\s\S]*?)\n\)/m) || [])[1] || '';
const TIME_RELATIVE = [...timeBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
check(MAX_SENTENCE > 0 && MAX_TITLE > 0 && TIME_RELATIVE.length > 3, 'could not read the caps from scripts/check_registry.py');
check(trip.title.length <= MAX_TITLE, `the trip title is ${trip.title.length} characters`);
for (const stop of trip.stops) {
  const { title, body } = stop.card || {};
  check(Boolean(title) && title.length <= MAX_TITLE, `${stop.id}: card title over ${MAX_TITLE}`);
  const first = String(body || '').split('. ')[0];
  check(first.length <= MAX_SENTENCE, `${stop.id}: the first sentence is ${first.length} characters`);
  for (const text of [title, body]) {
    check(!String(text).includes('--'), `${stop.id}: "--" reaches the screen as two hyphens`);
    const low = String(text).toLowerCase();
    for (const phrase of TIME_RELATIVE) check(!low.includes(phrase), `${stop.id}: "${phrase}" goes stale`);
    // The "Shown at" line states the date; no card on this trip may state one too.
    check(!/\b(1[5-9]|20|21)\d{2}\b/.test(String(text)), `${stop.id}: the card states a year, and the line under the title already says when`);
  }
}
// The numbers the cards give, against the rate and the fact sheet.
const secondsPerDay = DAY_MS / RATE / 1000; // 0.164 s
check(Math.abs(secondsPerDay - 1 / 6) < 0.01, `a day every ${secondsPerDay.toFixed(3)} s is "a day every sixth of a second"`);
check(/six days/.test(trip.stops[0].card.body) && Math.round(RATE / 86400) === 6, 'stop 1 says every second is six days');
check(/fifteen seconds/.test(trip.stops[0].card.body) && Math.round(88.0 * secondsPerDay) === 14, 'Mercury laps in 14.5 s, "fifteen seconds"');
check(/in a minute/.test(trip.stops[0].card.body) && Math.round(EARTH_YEAR_D * secondsPerDay) === 60, 'the Earth goes round in a minute');
check(/four and a half seconds/.test(trip.stops[1].card.body) && Math.abs(27.3 * secondsPerDay - 4.5) < 0.1, 'the Moon laps in 4.5 s');
const dwells = trip.stops.reduce((s, x) => s + x.dwell_ms, 0);
notes.push(`the four dwells come to ${(dwells / 1000).toFixed(1)} s, ${Math.round((dwells * RATE) / DAY_MS)} days of clock`);

// ------------------------------------------------- 3 and 4. the machine, on the Sun's stage
const frames = [];
globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
const pump = (n = 4) => {
  for (let i = 0; i < n; i += 1) {
    for (const fn of frames.splice(0, frames.length)) {
      try { fn(0); } catch { /* ui/cards.js wants a document; not under test */ }
    }
  }
};
const passes = (ms) => { REAL += ms; clock.tick(ms); };
const FOV = 45;
const ASPECT = 1280 / 800;
const DEG = Math.PI / 180;

/** Where a world is drawn on a 1280 x 800 screen, as -1..1 on each axis, or null behind the camera. */
function onScreen(camera, worlds, id) {
  camera.updateMatrixWorld(true);
  const p = worlds.drawnPositionOf(id).clone();
  const v = p.clone().project(camera);
  const inFront = p.sub(camera.position).dot(camera.getWorldDirection(new THREE.Vector3())) > 0;
  return inFront ? v : null;
}

const START = Date.parse('2026-09-23T12:00:00Z');
for (let q = 0; q < 4; q += 1) {
  REAL = START + q * 91 * DAY_MS;
  clock.live();
  const day = new Date(REAL).toISOString().slice(0, 10);
  const camera = new THREE.PerspectiveCamera(FOV, ASPECT, 1e-5, 1e9);
  camera.position.set(0, 0, 22);
  const rig = createCameraRig(camera, null, { worldRadius: 6.371 });
  stage.setWorld('earth');
  stage.setOrigin(null);
  const worlds = createWorlds(new THREE.Scene(), { textureBase: null, camera });
  worlds.update(REAL);
  const ctx = {
    camera,
    cameraRig: rig,
    worlds,
    clock,
    layers: [{ id: 'worlds', propagator: 'body' }],
    recordsFor: () => [],
    recordById: () => null,
    isLayerOn: () => true,
    setLayerOn() {},
    select() {},
    deselect() { rig.stopFollow(); },
    selected: () => null,
    // main.js ctx.setStage, less the renderer.
    setStage(id) {
      if (!STAGES[id] || stage.worldId === id) return false;
      stage.setWorld(id);
      worlds.update(clock.now());
      const w = WORLDS.find((x) => x.id === id);
      const r = w ? w.radiusKm / stage.unitKm : 0;
      rig.setWorldRadius(r);
      rig.setWorldCentre({ x: 0, y: 0, z: 0 });
      rig.stopFollow();
      rig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: w ? worldFramingDistance(r, FOV, ASPECT) : 5, ms: 0 });
      return true;
    },
  };
  const machine = createTrip(ctx);
  const plan = await machine.plan(TRIP_ID);
  check(plan && plan.count === 4 && plan.dropped.length === 0, `${day}: ${plan && plan.count} of 4 stops resolved`);
  await machine.start(TRIP_ID);
  pump();
  check(stage.worldId === 'sun', `${day}: the trip began on the ${stage.worldId} stage`);
  check(machine.state.clockMoves === true, `${day}: the intro says the trip moves the clock`);
  check(clock.mode === 'live', `${day}: nothing moves the clock before the first stop`);
  machine.play();
  pump(1);

  for (let i = 0; i < trip.stops.length; i += 1) {
    const stop = trip.stops[i];
    const where = `${day} ${stop.id}`;
    check(machine.state.index === i, `${where}: the trip is at stop ${machine.state.index}`);
    check(clock.rate === RATE && clock.mode === 'scrub', `${where}: the clock runs at ${clock.rate} (${clock.mode})`);
    if (i === 0) check(clock.now() === REAL, `${where}: the first stop starts from the present, ${clock.now() - REAL} ms off it`);
    check(clock.paused === true, `${where}: the clock is held while the camera flies`);
    const composedAt = clock.now();
    passes(2500); // the flight takes real time...
    check(clock.now() === composedAt, `${where}: ...and the held clock does not move under it`);
    rig.finishFlight();
    pump(2);
    rig.update(0.016);
    worlds.update(clock.now());
    check(clock.paused === false, `${where}: once the camera is there the clock runs`);
    check(/a day every sixth of a second/.test(stopTimeLine(machine.state, clock)), `${where}: the line reads "${stopTimeLine(machine.state, clock)}"`);

    const target = stop.target.world;
    const subject = worlds.drawnPositionOf(target);
    const d = camera.position.distanceTo(subject) * stage.unitKm;
    check(Math.abs(d - stop.distance_km) < stop.distance_km * 1e-6, `${where}: the camera is ${d.toExponential(3)} km out, the stop asks ${stop.distance_km}`);
    if (target === 'sun') {
      // Looking down on the planets' plane from 50 degrees above it.
      const up = camera.position.clone().sub(subject).normalize().y;
      check(Math.abs(Math.acos(up) - 40 * DEG) < 1e-6, `${where}: the camera is ${(90 - Math.acos(up) / DEG).toFixed(1)} degrees above the planets' plane, not 50`);
    }
    const inFrame = (id) => {
      const v = onScreen(camera, worlds, id);
      return v && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1;
    };
    if (stop.id === 'inner') for (const id of ['mercury', 'venus', 'earth', 'mars']) check(inFrame(id), `${where}: ${id} is out of the frame`);
    if (stop.id === 'earth') check(inFrame('moon'), `${where}: the Moon is out of the frame around the Earth`);
    if (stop.id === 'mercury') check(inFrame('sun'), `${where}: the Sun is not in the picture behind Mercury`);
    if (stop.id === 'jupiter') for (const id of ['earth', 'jupiter']) check(inFrame(id), `${where}: ${id} is out of the frame`);

    // Five real seconds under the card: the Earth goes 5 x 6.08 / 365.2 of a lap, 30 degrees.
    if (i === 0) {
      const t0 = clock.now();
      passes(5000);
      const a = positionOf('earth', t0);
      const b = positionOf('earth', clock.now());
      const deg = Math.acos((a.x * b.x + a.y * b.y + a.z * b.z) / Math.hypot(a.x, a.y, a.z) / Math.hypot(b.x, b.y, b.z)) / DEG;
      check(Math.abs(deg - (5 * RATE / 86400 / EARTH_YEAR_D) * 360) < 1.5, `${where}: the Earth went ${deg.toFixed(1)} degrees round the Sun in five real seconds`);
      if (q === 0) notes.push(`the Earth goes ${deg.toFixed(1)} degrees round the Sun in five real seconds`);
    } else {
      passes(3000);
    }
    if (i < trip.stops.length - 1) { machine.next(); pump(1); }
  }
  // Leave from the last stop: the map goes home and the clock goes back to live, exactly.
  machine.stop('left');
  pump(2);
  check(stage.worldId === 'earth', `${day}: leaving left the map on ${stage.worldId}`);
  check(clock.mode === 'live' && clock.rate === 1 && !clock.paused && clock.offsetMs() === 0,
    `${day}: leaving put the clock back ${clock.mode} at ${clock.rate}, ${clock.offsetMs()} ms off`);
  machine.dispose();
  worlds.dispose();
}

Date.now = realDateNow;
if (problems.length) {
  console.error(`year trip FAILED (${problems.length}):\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log(
  'year trip ok: four worlds on the Sun\'s stage, every one drawn true, at 525 600 with the clock held ' +
    `through each flight, the orbits in frame at four dates, and leaving back to live with 0 ms of drift (${notes.join('; ')})`,
);

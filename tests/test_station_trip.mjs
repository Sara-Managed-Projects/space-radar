// tests/test_station_trip.mjs -- "From your ground to the space station" (spec 0038): a trip that
// starts from the visitor's own place, goes up through the air to the station, and on to the
// minute the station next crosses their sky.
//
// It runs the REAL trip machine (ui/trip.js, the rig in scene/camera.js, composeShot and the key
// light) with the harvest fixture's ISS elements (tests/fixtures/harvest/celestrak_gp.json, epoch
// 2026-09-07T11:57Z) and a fixture place, Madrid, a day after that epoch. What it holds:
//
//   1. THE GROUND IS THE VISITOR'S. Stop 1's subject is 6 371 +- 10 km from the Earth's centre in
//      the direction of the fixture place, the camera's up is that place's vertical, the camera is
//      above its horizon and outside the rig's clearance, at the distance the stop asks for.
//   2. THE PASS IS REAL AND AHEAD. Stop 4's instant is in the future, it is a pass peak, and
//      predictPasses() re-run at that instant has the station above 10 degrees from the place.
//   3. THE PLACE IS SAID, AND NEVER STORED. "set by you" for a place the visitor set, "guess" for
//      the clock's guess, greyed with "Needs a place" when there is neither; the trip never sets
//      ctx.observer, and leaving puts the clock back.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

process.env.TZ = 'Europe/Madrid';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { TOURS } = await import(join(JS, 'data/tours.js'));
const { parseCelestrakGP } = await import(join(JS, 'data/parsers.js'));
const { predictPasses } = await import(join(JS, 'sky/passes.js'));
const { createCameraRig } = await import(join(JS, 'scene/camera.js'));
const { createTrip } = await import(join(JS, 'ui/trip.js'));
const { positionOf, WORLDS } = await import(join(JS, 'scene/worlds.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { fixed } = await import(join(JS, 'propagate/fixed.js'));
const { SELECTED_PX } = await import(join(JS, 'scene/heroes.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const notes = [];
const DEG = Math.PI / 180;

const TRIP_ID = 'journey-to-the-station';
const trip = TOURS.find((t) => t.id === TRIP_ID);
if (!trip) {
  console.error(`station trip FAILED: there is no '${TRIP_ID}' in data/tours.js`);
  process.exit(1);
}

// ------------------------------------------------------------------ 0. the trip as written
check(trip.requires_observer === true, 'the trip says it needs a place (requires_observer), so the picker can say so');
check((trip.requires || []).includes('stations'), 'the trip loads the stations layer before it is planned');
check(trip.next === 'people-in-space', `the end card offers the trip about both stations next, not ${trip.next}`);
check(trip.stops.length === 4, `four stops, not ${trip.stops.length}`);
check(trip.stops[0].target.observer === true && trip.stops[1].target.observer === true, 'the first two stops are the visitor\'s own place');
check(trip.stops[3].time && trip.stops[3].time.event === 'station-pass.next' && trip.stops[3].rate === 1, 'the last stop is the next pass, at 1x');
{
  // The same caps the moon trip reads from the checker, so the two cannot drift apart.
  const checker = readFileSync(join(ROOT, 'scripts/check_registry.py'), 'utf8');
  const MAX_SENTENCE = Number((checker.match(/^MAX_SENTENCE\s*=\s*(\d+)/m) || [])[1]);
  const MIN_KM = Number((checker.match(/^TOUR_OBSERVER_MIN_KM\s*=\s*(\d+)/m) || [])[1]);
  const timeBlock = (checker.match(/^TIME_RELATIVE\s*=\s*\(([\s\S]*?)\)/m) || [])[1] || '';
  const TIME_RELATIVE = [...timeBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  check(MAX_SENTENCE > 0 && MIN_KM > 0 && TIME_RELATIVE.length > 3, 'could not read the caps from scripts/check_registry.py');
  for (const stop of trip.stops) {
    const { title, body } = stop.card || {};
    check(String(body).split('. ')[0].length <= MAX_SENTENCE, `${stop.id}: the first sentence is over ${MAX_SENTENCE}`);
    for (const text of [title, body]) {
      check(!String(text).includes('--'), `${stop.id}: "--" reaches the screen as two hyphens`);
      for (const phrase of TIME_RELATIVE) check(!String(text).toLowerCase().includes(phrase), `${stop.id}: "${phrase}" goes stale`);
    }
    if (stop.target.observer) check(stop.distance_km >= MIN_KM, `${stop.id}: ${stop.distance_km} km is under the checker's ${MIN_KM} km floor`);
  }
}

// ------------------------------------------------------------------ the machine, in node
const stations = parseCelestrakGP(readFileSync(join(ROOT, 'tests/fixtures/harvest/celestrak_gp.json'), 'utf8'),
  { layer: 'stations', source: 'celestrak-stations' });
const madrid = { name: 'Madrid', country: 'Spain', latDeg: 40.42, lonDeg: -3.70, latRad: 40.42 * DEG, lonRad: -3.70 * DEG, altKm: 0 };
const T0 = Date.parse('2026-09-08T00:00:00Z');
const EARTH = WORLDS.find((w) => w.id === 'earth');

// rAF as a queue drained by hand, the way test_moon_trip.mjs drives the same machine.
const frames = [];
globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
const pump = (n = 6) => {
  for (let i = 0; i < n; i += 1) {
    const due = frames.splice(0, frames.length);
    // paintCard reaches ui/cards.js, which wants a document; the pose and the state are under test.
    for (const fn of due) { try { fn(Date.now()); } catch { /* not under test */ } }
  }
};

// THE FLIGHTS ARE FLOWN, not collapsed. The rig advances a flight by update(dt) and the trip turns
// the camera's up on performance.now() (ui/trip.js upTween), so both are stepped together, 16 ms a
// frame. Collapsing a flight with rig.finishFlight() alone, as test_moon_trip.mjs does, lands the
// pose in the basis the camera had BEFORE the up turned -- from the visitor's ground to the station
// that put the camera behind the Earth, 5 506 km out, which is not a pose the app ever reaches:
// its own Next (jump) settles the up before it collapses the flight.
let wall = 0;
Object.defineProperty(globalThis, 'performance', { value: { now: () => wall }, configurable: true });
function fly(machine, rig) {
  for (let k = 0; k < 1000 && machine.state.phase === 'flight'; k += 1) {
    wall += 16;
    rig.update(0.016);
    pump(1);
  }
  pump(2);
  rig.update(0.016);
}

/** A clock with clock.js's four moves, its wall clock fixed at T0. */
function makeClock() {
  return {
    mode: 'live', rate: 1, paused: false, t: T0,
    now() { return this.t; },
    goTo(ms) { this.t = ms; this.mode = 'scrub'; },
    setRate(r) { this.rate = r; if (r !== 1) this.mode = 'scrub'; },
    setPaused(p) { this.paused = p; if (p) this.mode = 'scrub'; },
    live() { this.mode = 'live'; this.t = T0; this.rate = 1; this.paused = false; },
  };
}

function makeCtx({ observer = null, guess } = {}) {
  const camera = new THREE.PerspectiveCamera(45, 1.6, 0.001, 1e9);
  camera.position.set(0, 0, 22);
  const rig = createCameraRig(camera, null, { worldRadius: EARTH.radiusKm / stage.unitKm });
  const clock = makeClock();
  const ctx = {
    camera,
    cameraRig: rig,
    clock,
    layers: [{ id: 'stations', nearKm: 3000, propagator: 'sgp4' }],
    records: () => stations,
    recordsFor: (id) => (id === 'stations' ? stations : []),
    recordById: (id) => stations.find((r) => r.id === id) || null,
    isLayerOn: () => true,
    setLayerOn() {},
    selected: () => null,
    deselect() { rig.stopFollow(); },
    // As main.js: a select installs `follow` on the record.
    select(record) { if (record) rig.follow(() => { const p = propagate(record, clock.now()); return stage.toScene(p, p.frame, clock.now()); }); },
    get observer() { return observer; },
  };
  if (guess !== undefined) ctx.guessPlace = () => guess;
  return { ctx, rig, camera, clock };
}

const earthCentre = (tMs) => { const p = positionOf('earth', tMs); return stage.toScene(p, p.frame, tMs); };
const R = EARTH.radiusKm / stage.unitKm;

// -------------------------------------------------- 1. no place at all: greyed, with the reason
{
  const { ctx } = makeCtx({ observer: null, guess: null });
  const machine = createTrip(ctx);
  const plan = await machine.plan(TRIP_ID);
  check(plan && plan.offerable === false && plan.reason === COPY.trip.needsPlace,
    `with no place and no guess the trip is greyed with "${COPY.trip.needsPlace}", not ${JSON.stringify(plan && plan.reason)}`);
  const started = await machine.start(TRIP_ID);
  check(started && started.offerable === false && started.reason === COPY.trip.needsPlace && machine.state.phase === 'idle',
    `and Start says the same and starts nothing (${started && started.reason}, ${machine.state.phase})`);
}

// -------------------------------------------------- 2. the whole trip, with a place and a guess
async function ride(label, { observer, guess, wantLine }) {
  const { ctx, rig, camera, clock } = makeCtx({ observer, guess });
  const machine = createTrip(ctx);
  const plan = await machine.plan(TRIP_ID);
  check(plan && plan.offerable && plan.count === 4 && plan.dropped.length === 0,
    `${label}: ${plan ? plan.count : 0} of 4 stops resolved (${plan && plan.dropped.map((d) => d.id)}), ${plan && plan.reason}`);
  await machine.start(TRIP_ID);
  pump();
  check(machine.state.phase === 'intro' && machine.state.clockMoves === true, `${label}: the intro says the trip moves the clock`);
  machine.play();
  pump(2);
  const out = { poses: [] };
  for (let i = 0; i < trip.stops.length; i += 1) {
    const stop = trip.stops[i];
    const where = `${label} ${stop.id}`;
    check(machine.state.index === i, `${where}: the trip is at stop ${machine.state.index}`);
    fly(machine, rig);
    check(machine.state.phase !== 'flight', `${where}: the flight never arrived`);
    const tMs = clock.now();
    const centre = earthCentre(tMs);
    const target = rig.state.target.clone();
    const camFromCentreKm = camera.position.distanceTo(centre) * stage.unitKm;
    const camAltKm = camFromCentreKm - EARTH.radiusKm;
    check(camera.position.distanceTo(centre) > 1.02 * R - 1e-6, `${where}: the camera is ${camAltKm.toFixed(0)} km up, inside the rig's clearance`);
    const camToTargetKm = camera.position.distanceTo(target) * stage.unitKm;
    out.poses.push({ id: stop.id, altKm: camAltKm, distKm: camToTargetKm, tMs, note: machine.state.stopNote });
    check(Math.abs(camToTargetKm - stop.distance_km) < 0.5,
      `${where}: the camera is ${camToTargetKm.toFixed(1)} km from its subject, the stop asks for ${stop.distance_km}: the rig pushed it out`);
    if (stop.target.observer) {
      // The subject is the fixture place, on the ground, in its direction.
      const want = fixed({ fixed: { latDeg: 40.42, lonDeg: -3.70, altKm: 0 }, frame: 'earth-fixed' }, tMs);
      const wantScene = stage.toScene(want, want.frame, tMs);
      const fromCentreKm = target.distanceTo(centre) * stage.unitKm;
      check(Math.abs(fromCentreKm - 6371) <= 10, `${where}: the ground is ${fromCentreKm.toFixed(1)} km from the Earth's centre`);
      const off = target.clone().sub(centre).normalize().angleTo(wantScene.clone().sub(centre).normalize()) / DEG;
      check(off < 0.1, `${where}: the ground is ${off.toFixed(3)} degrees off the fixture place's direction`);
      const normal = target.clone().sub(centre).normalize();
      const dot = camera.up.clone().normalize().dot(normal);
      out.poses[i].upDot = dot;
      check(dot > 0.999, `${where}: camera.up . the place's vertical is ${dot.toFixed(5)}`);
      const elev = Math.asin(camera.position.clone().sub(target).normalize().dot(normal)) / DEG;
      out.poses[i].elevDeg = elev;
      check(elev >= 10 - 1e-6, `${where}: the camera is ${elev.toFixed(1)} degrees above the place's horizon`);
      check(String(machine.state.stopNote || '').includes(wantLine) && machine.state.stopNote.includes('Madrid'),
        `${where}: the place line says "${wantLine}" and names the place: "${machine.state.stopNote}"`);
      check(ctx.observer === observer, `${where}: the trip never sets the visitor's place`);
    }
    if (stop.id === 'now') {
      check(tMs === T0, `${where}: the station is shown at the present (${new Date(tMs).toISOString()})`);
      check(/^Right now it is [\d   ]+ km from you\.$/.test(String(machine.state.stopNote)), `${where}: the distance line: "${machine.state.stopNote}"`);
    }
    if (stop.id === 'pass') {
      check(tMs > T0, `${where}: the pass is in the future (${new Date(tMs).toISOString()})`);
      // Re-run the predictor across that instant: a pass peaking there, above 10 degrees.
      const again = predictPasses(stations, madrid, tMs - 30 * 60e3, 1);
      const p = again.find((x) => Math.abs(x.peakMs - tMs) < 2000);
      check(p && p.peakElDeg >= 10, `${where}: predictPasses() at the stop's instant has the station ${p ? p.peakElDeg.toFixed(1) : 'nowhere'} degrees up`);
      out.pass = p;
      check(String(machine.state.stopNote).includes(String(SELECTED_PX)), `${where}: the class-size line says ${SELECTED_PX}: "${machine.state.stopNote}"`);
      check(/^Look /.test(String(machine.state.stopNote)), `${where}: the line says where to look: "${machine.state.stopNote}"`);
      check(clock.mode === 'scrub' && clock.rate === 1 && !clock.paused, `${where}: the clock runs at 1x from the pass (${clock.mode} ${clock.rate} ${clock.paused})`);
      // The station at 20 km: the camera must not be inside the Earth whichever way the key light chose.
      const station = stations[0];
      const s = propagate(station, tMs);
      const sScene = stage.toScene(s, s.frame, tMs);
      check(sScene.distanceTo(target) * stage.unitKm < 0.5, `${where}: the camera is aimed at the station`);
      // `behind: earth`: looking past the station, the view runs down toward the ground. Without it
      // the camera sat 7 km under the station looking up at black sky (headless Chrome, 2026-09-23).
      const look = sScene.clone().sub(camera.position).normalize();
      const down = centre.clone().sub(sScene).normalize();
      const offDeg = Math.acos(Math.min(1, look.dot(down))) / DEG;
      out.pass4 = { offDeg };
      check(offDeg < 60, `${where}: the Earth's centre is ${offDeg.toFixed(0)} degrees off the line of sight past the station, so the ground is not behind it`);
    }
    if (i + 1 < trip.stops.length) { machine.next(); pump(2); }
  }
  // Back from the pass to the station "this minute": it is the present again, not the pass.
  machine.back();
  pump(2);
  fly(machine, rig);
  check(clock.now() === T0 && clock.mode === 'live', `${label}: Back from the pass shows the station at the present again (${new Date(clock.now()).toISOString()})`);
  machine.next();
  pump(2);
  fly(machine, rig);
  machine.stop('test');
  pump();
  check(clock.mode === 'live' && clock.now() === T0 && clock.rate === 1 && !clock.paused, `${label}: leaving puts the clock back to live`);
  check(camera.up.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-9, `${label}: leaving gives the visitor their own up back`);
  check(ctx.observer === observer, `${label}: nothing about the place was written`);
  return out;
}

const set = await ride('set place', { observer: { ...madrid, source: 'city' }, guess: null, wantLine: 'set by you' });
const guessed = await ride('guessed place', { observer: null, guess: { ...madrid, source: 'guess', how: 'timezone' }, wantLine: 'guess' });

if (problems.length) {
  console.error(`station trip FAILED (${problems.length}):\n  ` + problems.join('\n  '));
  process.exit(1);
}
for (const r of [set]) {
  for (const p of r.poses) {
    notes.push(`${p.id}: camera ${p.distKm.toFixed(1)} km from its subject, ${p.altKm.toFixed(0)} km up` +
      (p.upDot !== undefined ? `, up . vertical ${p.upDot.toFixed(6)}, ${p.elevDeg.toFixed(1)} degrees above the horizon` : '') +
      ` at ${new Date(p.tMs).toISOString().slice(0, 16)}Z` + (p.note ? `: "${p.note}"` : ''));
  }
  if (r.pass4) notes.push(`the pass stop looks ${r.pass4.offDeg.toFixed(0)} degrees off straight down past the station`);
  if (r.pass) notes.push(`the pass: peak ${new Date(r.pass.peakMs).toISOString()} at ${r.pass.peakElDeg.toFixed(1)} degrees, visible ${r.pass.visible}`);
}
notes.push(`guessed place, first line: "${guessed.poses[0].note}"`);
for (const n of notes) console.log('  ' + n);
console.log('station trip ok: from the fixture place to the station and its next pass, the ground seen from above its horizon with its own vertical up, the pass ahead and above 10 degrees, the place said and never stored, greyed with its reason when there is none');

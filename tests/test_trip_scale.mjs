// tests/test_trip_scale.mjs -- a trip's flight lets go of the stop it is leaving.
//
// Ivan, 2026-10-01, with a screenshot: when something is selected and a trip starts, and again every
// time the trip moves from stop to stop, the object's model is drawn hugely enlarged -- a lander
// across half the screen, the Moon's own markers scattered round it, under the next stop's title.
//
// THE CAUSE WAS NOT A SCALE. ui/trip.js selects each stop's subject on arrival (paintCard) and
// nothing put it down again until the next arrival selected something else. So for the whole flight
// to stop n+1, stop n was still the selection, and a selection is two things:
//
//   - main.js select() installs `follow`, and scene/camera.js applyFollow() re-aims a RUNNING
//     flight's destination at it every frame. The flight flew its distance and its angles about the
//     subject it was leaving, and the arrival's select snapped the camera across in one frame;
//   - scene/heroes.js draws the selection at SELECTED_PX (260 px) whatever the distance, and skips
//     the nearness gates every other model passes. Pulled back for the next stop and dead centre,
//     the subject being left was the biggest thing on the screen by far.
//
// This runs the REAL trip machine and rig with a main.js-faithful select/deselect, flies every
// flight frame by frame, and holds three things on every flight of the Moon trip (with the
// visitor's own selection, the ISS, up when Start is pressed) and of the station trip:
//
//   1. Once the flight is under way, the selection is the stop's own subject or nothing -- never
//      the stop being left, never the visitor's pre-trip selection. heroes.js forces exactly
//      ctx.selected() to SELECTED_PX, so this is the drawn-size rule, held where it is decided.
//   2. The flight lands ON its subject: when the arrival selects it, the camera is already aimed
//      there (no snap). Before the fix, Surveyor 1 to Apollo 11 snapped 1 915 km.
//   3. Letting go keeps the card (deselect `keepCard`), and a subject shared by two stops in a row
//      is not let go at all, so nothing blinks.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

process.env.TZ = 'Europe/Madrid';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { TOURS } = await import(join(JS, 'data/tours.js'));
const { handKeptSites } = await import(join(JS, 'data/sample.js'));
const { parseCelestrakGP } = await import(join(JS, 'data/parsers.js'));
const { createCameraRig } = await import(join(JS, 'scene/camera.js'));
const { createTrip } = await import(join(JS, 'ui/trip.js'));
const { positionOf, WORLDS } = await import(join(JS, 'scene/worlds.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const DEG = Math.PI / 180;

const sites = handKeptSites();
const stations = parseCelestrakGP(readFileSync(join(ROOT, 'tests/fixtures/harvest/celestrak_gp.json'), 'utf8'),
  { layer: 'stations', source: 'celestrak-stations' });
const ISS = stations[0];
check(ISS && /ISS/.test(ISS.name), `the harvest fixture's first station is the ISS, not ${ISS && ISS.name}`);
const madrid = { name: 'Madrid', country: 'Spain', latDeg: 40.42, lonDeg: -3.70, latRad: 40.42 * DEG, lonRad: -3.70 * DEG, altKm: 0 };
const T0 = Date.parse('2026-09-08T00:00:00Z');

// rAF as a queue drained by hand, and a wall clock stepped with it: the trip's timers and its up
// tween run on performance.now(), the rig on update(dt). The same harness as test_station_trip.mjs.
const frames = [];
globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
const pump = (n = 6) => {
  for (let i = 0; i < n; i += 1) {
    const due = frames.splice(0, frames.length);
    // paintCard reaches ui/cards.js, which wants a document; the selection and the pose are under test.
    for (const fn of due) { try { fn(Date.now()); } catch { /* not under test */ } }
  }
};
let wall = 0;
Object.defineProperty(globalThis, 'performance', { value: { now: () => wall }, configurable: true });

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

/**
 * A ctx whose select and deselect do what main.js's do to the two things under test: `selected`,
 * which scene/heroes.js forces to SELECTED_PX, and `follow` on the rig.
 */
function makeCtx({ layers, records, observer = null }) {
  const camera = new THREE.PerspectiveCamera(45, 1.6, 0.001, 1e9);
  camera.position.set(0, 0, 22);
  const rig = createCameraRig(camera, null, { worldRadius: 6.371 });
  const clock = makeClock();
  const scene = (record) => { const p = propagate(record, clock.now()); return p ? stage.toScene(p, p.frame, clock.now()) : null; };
  const log = { selects: [], deselects: [] };
  let selected = null;
  const ctx = {
    camera,
    cameraRig: rig,
    clock,
    layers,
    records: () => records,
    recordsFor: (id) => records.filter((r) => r.layer === id),
    recordById: (id) => records.find((r) => r.id === id) || null,
    isLayerOn: () => true,
    setLayerOn() {},
    get observer() { return observer; },
    selected: () => selected,
    select(record) {
      // Where the camera is aimed at the instant the arrival selects its subject: the snap, if any.
      if (record) log.selects.push({ id: record.id, phase: machineRef.m && machineRef.m.state.phase, snapKm: rig.state.target.distanceTo(scene(record)) * stage.unitKm });
      selected = record;
      if (record) rig.follow(() => scene(record));
    },
    deselect(opts = {}) {
      log.deselects.push({ id: selected && selected.id, keepCard: !!(opts && opts.keepCard), phase: machineRef.m && machineRef.m.state.phase });
      selected = null;
      rig.stopFollow();
    },
    // main.js ctx.setStage, less the renderer.
    setStage(id) {
      stage.setWorld(id);
      stage.setOrigin(id === 'earth' ? null : positionOf(id, clock.now()));
      const w = WORLDS.find((x) => x.id === id);
      rig.setWorldRadius(w ? w.radiusKm / stage.unitKm : 0);
      rig.setWorldCentre({ x: 0, y: 0, z: 0 });
      rig.stopFollow();
      rig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: w ? (w.radiusKm / stage.unitKm) * 4 : 5, ms: 0 });
      return true;
    },
  };
  const machineRef = {};
  return { ctx, rig, clock, log, machineRef, scene };
}

/**
 * Fly a whole trip, frame by frame, and hold every flight to rules 1 to 3.
 * @param {string} tripId
 * @param {object} opts  makeCtx's, plus `preselect`: what the visitor had selected before Start
 */
async function ride(tripId, opts) {
  const tour = TOURS.find((t) => t.id === tripId);
  check(Boolean(tour), `there is no '${tripId}' in data/tours.js`);
  if (!tour) return null;
  const h = makeCtx(opts);
  const { ctx, rig, log, machineRef } = h;
  const machine = createTrip(ctx);
  machineRef.m = machine;
  if (opts.preselect) ctx.select(opts.preselect);
  log.selects.length = 0;
  const plan = await machine.plan(tripId);
  check(plan && plan.offerable && plan.dropped.length === 0, `${tripId}: ${plan ? plan.count : 0} stops resolved (${plan && plan.dropped.map((d) => d.id)}) ${plan && plan.reason}`);
  await machine.start(tripId);
  pump();
  // Counted from BEFORE the flight is asked for: play() and next() compose the shot and start the
  // flight synchronously, so whatever is let go is let go inside the call.
  let deselectsBefore = log.deselects.length;
  machine.play();
  pump(2);
  const out = [];
  let previous = opts.preselect ? opts.preselect.id : null;
  for (let i = 0; i < plan.count; i += 1) {
    const stopId = machine.state.stopId;
    const where = `${tripId} stop ${i + 1} (${stopId})`;
    check(machine.state.index === i, `${where}: the trip is at stop ${machine.state.index + 1}`);
    const selectsBefore = log.selects.length;
    let held = 0;
    let frames = 0;
    for (let k = 0; k < 2000 && machine.state.phase === 'flight'; k += 1) {
      const sel = ctx.selected();
      // Rule 1. The subject being left, or the visitor's own selection on the first flight, still
      // selected = still drawn at SELECTED_PX, still pulling the camera.
      if (sel && previous && sel.id === previous && sel.id !== machine.currentRecordId()) held += 1;
      frames += 1;
      wall += 16;
      rig.update(0.016);
      pump(1);
    }
    pump(2);
    rig.update(0.016);
    check(machine.state.phase !== 'flight', `${where}: the flight never arrived`);
    check(held === 0, `${where}: '${previous}', the stop being left, stayed selected for ${held} of the flight's ${frames} frames -- drawn at SELECTED_PX and holding the camera`);
    // Rule 2: the arrival's select found the camera already aimed at its subject.
    const arrival = log.selects.slice(selectsBefore).find((s) => s.id === machine.currentRecordId());
    if (arrival) {
      check(arrival.snapKm < 1, `${where}: the camera arrived aimed ${arrival.snapKm.toFixed(0)} km from its subject and snapped across on the arrival's select`);
    }
    // Rule 3: letting go keeps the card.
    for (const d of log.deselects.slice(deselectsBefore)) {
      if (d.phase === 'flight') check(d.keepCard, `${where}: the flight let go of '${d.id}' and took the card with it`);
    }
    out.push({ stop: stopId, held, frames, snapKm: arrival ? +arrival.snapKm.toFixed(1) : null, letGo: log.deselects.slice(deselectsBefore).map((d) => d.id) });
    previous = machine.currentRecordId();
    deselectsBefore = log.deselects.length;
    if (i + 1 < plan.count) { machine.next(); pump(2); }
  }
  machine.stop('test');
  pump();
  return { out, log };
}

// --------------------------------------------- the Moon trip, with the ISS selected before Start
stage.setWorld('earth');
stage.setOrigin(null);
{
  const moon = await ride('moon-landings', {
    layers: [{ id: 'hand-kept-sites', nearKm: 900 }, { id: 'worlds' }, { id: 'stations', nearKm: 3000 }],
    records: [...sites, ...stations],
    preselect: ISS,
  });
  if (moon) {
    const first = moon.out[0];
    check(first && first.letGo.includes(ISS.id), `moon-landings: the first flight let go of the ISS selected before Start (let go of ${first && first.letGo})`);
    // Every site-to-site flight measured, not only the first: the bug was in every one of them.
    check(moon.out.filter((o) => o.snapKm !== null).length >= 8, `moon-landings: only ${moon.out.filter((o) => o.snapKm !== null).length} arrivals selected a subject`);
  }
}

// ------------------------- the station trip: the visitor's ground, then the ISS twice in a row
stage.setWorld('earth');
stage.setOrigin(null);
{
  const st = await ride('journey-to-the-station', {
    layers: [{ id: 'stations', nearKm: 3000, propagator: 'sgp4' }],
    records: stations,
    observer: { ...madrid, source: 'city' },
  });
  if (st) {
    // `now` then `pass` are both the station: the second flight must not put it down and pick it up.
    const pass = st.out.find((o) => o.stop === 'pass');
    check(pass && !pass.letGo.includes(ISS.id), `journey-to-the-station: the flight from the station to the station let go of it (${pass && pass.letGo})`);
    // The flight from the visitor's ground to the station used to be held on the ground's `follow`.
    const now = st.out.find((o) => o.stop === 'now');
    check(now && now.snapKm !== null && now.snapKm < 1, `journey-to-the-station: the flight to the station arrived ${now && now.snapKm} km off it`);
  }
}

if (problems.length) {
  console.error(`trip scale FAILED (${problems.length}):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('trip scale ok: every flight lets go of the stop it leaves, lands on its subject, and keeps the card');

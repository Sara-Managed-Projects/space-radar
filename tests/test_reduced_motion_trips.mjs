// tests/test_reduced_motion_trips.mjs -- a trip driven end to end with prefers-reduced-motion on (public #236).
//
// Two of the shipped trips, run by the real trip machine on the real camera rig and clock, the way
// tests/test_year_trip.mjs and tests/test_veil.mjs run them, but with the media query answering "reduce":
//   outer-solar-system   ten stops over five stages: the trip that goes through black without the preference
//   a-year-in-a-minute   four stops at 525 600x: the trip that races the clock without it
// and for every stop it holds the three things the card's acceptance asks to fail a build:
//   1. no flight starts: the camera is on the stop (not mid-flight) the moment Next is answered;
//   2. no veil runs the 350 + 350 ms path: the veil is never asked to go through black, and any fade
//      it is asked for is 220 ms or less, the card's ceiling being 300;
//   3. a timed stop leaves the clock where the stop composed it, paused: never running above 1x
//      unattended. And leaving puts the clock back to live with 0 ms of drift.
// It also holds that the trip is still complete (every stop is reached by Next) and that reader pacing
// is forced (no stop advances by itself).
// The browser side of the same promise (the CSS) is the look probe `r12-access`; this is the part
// that can fail a pull request in node.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');

let REAL = Date.parse('2026-09-23T12:00:00Z');
const realDateNow = Date.now;
Date.now = () => REAL;

// The visitor has asked for less motion.
const mq = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
globalThis.matchMedia = mq;
globalThis.window = { matchMedia: mq, addEventListener() {}, removeEventListener() {}, dispatchEvent() {} };

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { TOURS } = await import(join(JS, 'data/tours.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const { farBodies, sampleDeepSpace } = await import(join(JS, 'data/sample.js'));
const { clock } = await import(join(JS, 'clock.js'));
const { worldRecords, WORLDS, createWorlds } = await import(join(JS, 'scene/worlds.js'));
const { stage, STAGES } = await import(join(JS, 'scene/stage.js'));
const { createCameraRig, worldFramingDistance } = await import(join(JS, 'scene/camera.js'));
const { createTrip } = await import(join(JS, 'ui/trip.js'));
const { REDUCED_VEIL_MS } = await import(join(JS, 'ui/veil.js'));

// ui/trip.js says so (once a stop) when it has no document to paint the card on; that is not under test.
for (const m of ['warn', 'error', 'log']) {
  const real = console[m].bind(console);
  console[m] = (...a) => { if (!/card could not be painted/.test(String(a[0]))) real(...a); };
}
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const CEILING_MS = 300; // the card's acceptance; the veil's own cut-fade is REDUCED_VEIL_MS (220)
check(REDUCED_VEIL_MS <= CEILING_MS, `the veil's reduced fade (${REDUCED_VEIL_MS} ms) is inside the ${CEILING_MS} ms ceiling`);

const frames = [];
globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
const pump = (n = 4) => {
  for (let i = 0; i < n; i += 1) {
    for (const fn of frames.splice(0, frames.length)) {
      try { fn(0); } catch { /* ui/cards.js wants a document; not under test */ }
    }
  }
};

const FOV = 45;
const ASPECT = 1.6;
const records = [...worldRecords(), ...farBodies(), ...sampleDeepSpace()];
const byId = new Map(records.map((r) => [r.id, r]));

async function drive(id) {
  const trip = TOURS.find((t) => t.id === id);
  check(!!trip, `${id}: the trip exists`);
  if (!trip) return { stops: 0 };
  clock.live();
  const camera = new THREE.PerspectiveCamera(FOV, ASPECT, 1e-5, 1e9);
  camera.position.set(0, 0, 22);
  const rig = createCameraRig(camera, null, { worldRadius: 6.371 });
  stage.setWorld('earth');
  stage.setOrigin(null);
  const worlds = createWorlds(new THREE.Scene(), { textureBase: null, camera });
  worlds.update(REAL);
  const veilAsked = [];
  const fades = [];
  const ctx = {
    camera, cameraRig: rig, worlds, clock, layers: LAYERS,
    recordsFor: (lid) => records.filter((r) => r.layer === lid),
    recordById: (rid) => byId.get(rid) || null,
    isLayerOn: () => true,
    setLayerOn() {},
    selected: () => null,
    select() {},
    deselect() { rig.stopFollow(); },
    veil: { through(fn) { veilAsked.push(stage.worldId); return new Promise(() => { /* never answered: a veil here is a failure */ }); }, fade(ms) { fades.push(ms); } },
    stars3d: { setStretch() {} },
    labels: { emphasise() {}, clearEmphasis() {} },
    setStage(sid) {
      if (!STAGES[sid] || stage.worldId === sid) return false;
      stage.setWorld(sid);
      worlds.update(clock.now());
      const w = WORLDS.find((x) => x.id === sid);
      const r = w ? w.radiusKm / stage.unitKm : 0;
      rig.setWorldRadius(r);
      rig.setWorldCentre({ x: 0, y: 0, z: 0 });
      rig.stopFollow();
      rig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: w ? worldFramingDistance(r, FOV, ASPECT) : 5, ms: 0 });
      return true;
    },
  };
  const longFlights = [];
  const flyTo = rig.flyTo.bind(rig);
  rig.flyTo = (opts) => { if (opts && opts.ms > CEILING_MS && !rig.state.reducedMotion) longFlights.push(opts.ms); return flyTo(opts); };

  const machine = createTrip(ctx);
  const plan = await machine.plan(id);
  const want = plan ? plan.count : 0;
  check(want >= 3, `${id}: ${want} stops resolve`);
  await machine.start(id);
  pump();
  check(machine.state.pacing === 'reader', `${id}: reduced motion forces reader pacing (${machine.state.pacing})`);
  machine.play();
  pump(2);
  const stages = new Set();
  let timed = 0;
  let reached = 0;
  for (let i = 0; i < want; i += 1) {
    const where = `${id} stop ${i + 1}/${want} (${machine.state.stopId})`;
    check(machine.state.index === i, `${where}: Next reached it (index ${machine.state.index})`);
    pump(2);
    stages.add(stage.worldId);
    check(rig.state.flying === false, `${where}: a flight is under way: reduced motion cuts`);
    check(machine.state.phase !== 'veil', `${where}: the trip is in a veil`);
    if (clock.mode === 'scrub') {
      timed += 1;
      check(clock.paused === true || clock.rate <= 1, `${where}: the clock runs at ${clock.rate}x unattended on a timed stop`);
    }
    reached += 1;
    if (i + 1 < want) machine.next();
  }
  check(reached === want, `${id}: ${reached} of ${want} stops reached`);
  check(veilAsked.length === 0, `${id}: the veil was asked to go through black ${veilAsked.length} time(s) (on ${veilAsked.join(', ')})`);
  check(fades.every((ms) => ms <= CEILING_MS), `${id}: a fade of ${Math.max(0, ...fades)} ms is over the ${CEILING_MS} ms ceiling`);
  check(longFlights.length === 0, `${id}: flights of ${longFlights.join(', ')} ms were asked for under reduced motion`);
  machine.stop('left');
  check(clock.mode === 'live' && clock.offsetMs() === 0, `${id}: leaving puts the clock back on live (${clock.mode}, ${clock.offsetMs()} ms off)`);
  machine.dispose();
  return { stops: want, stages: stages.size, timed };
}

const outer = await drive('outer-solar-system');
check(outer.stages >= 3, `outer-solar-system crossed ${outer.stages} stages (the trip that would have used the veil)`);
const year = await drive('a-year-in-a-minute');
check(year.timed === year.stops && year.stops === 4, `a-year-in-a-minute: ${year.timed} of ${year.stops} stops were timed (the trip that would have raced the clock)`);

Date.now = realDateNow;
delete globalThis.window;
delete globalThis.matchMedia;
delete globalThis.requestAnimationFrame;
if (problems.length) {
  console.error(`reduced motion trips FAILED (${problems.length}):\n  ` + problems.slice(0, 30).join('\n  '));
  process.exit(1);
}
console.log(`ok test_reduced_motion_trips (outer-solar-system: ${outer.stops} stops over ${outer.stages} stages, no flight, no veil; a-year-in-a-minute: ${year.stops} timed stops, the clock held at its instant; both leave the clock live)`);

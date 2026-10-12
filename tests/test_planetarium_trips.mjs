// tests/test_planetarium_trips.mjs -- the five trips of 2026-10-06 and the stop grammar they
// brought, flown by the real machine (ui/trip.js, scene/camera.js, scene/stage.js) without a browser.
//
//   node tests/test_planetarium_trips.mjs
//
// What registry/tours.yaml's validator cannot see:
//
//   1. WHAT IS UP, FOR WHOEVER ASKS (sky/lookfor.js). "Tonight" is now when it is dark and the
//      coming dusk when it is not; a planet's night is inside the dark; nothing is pointed at in
//      daylight; a thing under the horizon says so.
//   2. THE FIVE TRIPS ARE THERE, six to ten stops each, a blurb of 70 to 80 characters, a group, a
//      `next:` that exists, and the promises a blurb must make (back to Earth, moves the clock).
//   3. A STOP SEEN FROM THE GROUND hands the camera to the sky view and turns it to something;
//      the stop after it takes the camera back; leaving from the ground takes it back too. Without
//      a sky view (a test, an embed) the same stop is flown from above and nothing is refused.
//   4. `time: tonight` puts the clock at the coming dark of the visitor's place.
//   5. `seen_from:` puts the camera between the subject and that world AND KEEPS IT THERE while
//      the clock runs a week; `over:` stands above a place on Mars, not only on the Earth.
//   5b. `time: daylight` shows a lander, or a landform, at the next hour the Sun is up over it.
//   6. KEEP FLYING: `stop(reason, { stay: true })` leaves the map on the trip's world.
//   7. A PRESENTER PACES THE TRIP: setPacing('reader') stops the countdown, the clicker's keys do
//      what a clicker's keys do, and only in present mode.
//   8. A CLIP'S ADDRESS CARRIES ITS VERSION (internal #327).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');

let REAL = Date.parse('2026-10-06T10:00:00Z');
Date.now = () => REAL;

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { TOURS, TOUR_GROUPS } = await import(join(JS, 'data/tours.js'));
const { NARRATION } = await import(join(JS, 'data/narration.js'));
const { clock } = await import(join(JS, 'clock.js'));
const { WORLDS, createWorlds, positionOf } = await import(join(JS, 'scene/worlds.js'));
const { stage, STAGES } = await import(join(JS, 'scene/stage.js'));
const { createCameraRig, worldFramingDistance } = await import(join(JS, 'scene/camera.js'));
const { createStarfield } = await import(join(JS, 'scene/starfield.js'));
const { createTrip } = await import(join(JS, 'ui/trip.js'));
const { keyAction } = await import(join(JS, 'ui/tripframe.js'));
const { clipRow } = await import(join(JS, 'audio/narration.js'));
const { fixed } = await import(join(JS, 'propagate/fixed.js'));
const L = await import(join(JS, 'sky/lookfor.js'));
const { KEYS } = await import(join(JS, 'ui/urlstate.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const DEG = Math.PI / 180;
const HOUR = 3600e3;

const FIVE = ['tonight-from-your-street', 'moon-phases', 'the-sun-today', 'planets-tonight', 'mars-where-we-have-driven'];
const PLACE = { name: 'Testville', latDeg: 32.08, lonDeg: 34.78, altKm: 0, source: 'set' };

// ------------------------------------------------------------------ 1. what is up (pure)
{
  const noon = Date.parse('2026-10-06T10:00:00Z'); // 13:00 local at PLACE
  const night = Date.parse('2026-10-06T21:00:00Z'); // midnight local
  const tonight = L.tonightMs(PLACE, noon);
  const sunThen = L.altAzOfBody('sun', PLACE, tonight);
  check(tonight > noon && tonight - noon < 12 * HOUR, `tonight from noon is ${((tonight - noon) / HOUR).toFixed(1)} h ahead`);
  check(sunThen.altDeg < -6 && sunThen.altDeg > -30, `at "tonight" the Sun is ${sunThen.altDeg.toFixed(1)} degrees up; it should be past dusk and before midnight`);
  check(L.tonightMs(PLACE, night) === night, 'when it is already dark, tonight is now');
  const w = L.nightWindow(PLACE, noon);
  check(w && !w.darkNow && !w.never && w.untilMs - w.fromMs > 8 * HOUR && w.untilMs - w.fromMs < 14 * HOUR, 'an October night at 32 N is eight to fourteen hours of dark');
  for (const id of L.PLANETS) {
    const p = L.planetTonight(id, PLACE, tonight);
    check(p && typeof p.visible === 'boolean' && Number.isFinite(p.mag) && Number.isFinite(p.elongationDeg), `${id}: no answer for tonight`);
    if (p.visible) {
      check(p.fromMs >= w.fromMs - 1 && p.untilMs <= w.untilMs + 1 && p.bestMs >= p.fromMs && p.bestMs <= p.untilMs, `${id}: its hours are outside the dark`);
      check(p.bestAltDeg >= L.LOW_ALT_DEG && p.bestAzDeg >= 0 && p.bestAzDeg < 360, `${id}: highest at ${p.bestAltDeg} degrees`);
    } else check(p.why === 'glare' || p.why === 'down', `${id}: not visible, and no reason given`);
  }
  // Saturn was at opposition on 4 October 2026: up all night, and due south around midnight.
  const saturn = L.planetTonight('saturn', PLACE, tonight);
  check(saturn.visible && saturn.elongationDeg > 170 && saturn.untilMs - saturn.fromMs > 8 * HOUR, 'Saturn, two days after opposition, is up all night');
  check(L.planetTonight('pluto', PLACE, tonight) === null && L.altAzOfBody('pluto', PLACE, tonight) === null, 'a name it does not know is null, not a guess');
  const day = L.lookTarget({ best: 'planet' }, PLACE, noon);
  check(day && day.up === false && day.daylight === true, 'nothing is pointed at in daylight');
  for (const best of ['planet', 'star', 'figure']) {
    const a = L.lookTarget({ best }, PLACE, tonight + 2 * HOUR);
    check(a && Number.isFinite(a.azDeg) && Number.isFinite(a.altDeg), `best ${best}: no heading`);
    if (a.up) check(a.altDeg >= L.LOW_ALT_DEG && (best === 'planet' ? L.NAKED_EYE_PLANETS.includes(a.id) : !!a.name), `best ${best}: ${JSON.stringify(a)}`);
  }
  const moon = L.lookTarget({ world: 'moon' }, PLACE, tonight);
  check(moon && moon.kind === 'world' && moon.percent >= 0 && moon.percent <= 100 && (moon.up || moon.riseMs > tonight), 'the Moon: lit fraction, and a rise time when it is down');
  const pass = L.lookTarget({ pass: true }, PLACE, tonight, { peakAz: 200 * DEG, peakElDeg: 47 });
  check(pass.up && Math.abs(pass.azDeg - 200) < 1e-6 && pass.altDeg === 47, 'a pass is faced at the top of its arc');
  check(L.lookTarget({ pass: true }, PLACE, tonight, null).up === false, 'no pass found: nothing to face, and it says so');
  check(L.lookTarget({ world: 'moon' }, null, tonight) === null && L.tonightMs(null, noon) === noon, 'no place: no heading, and tonight is now');
  // Polaris stays put: within a degree of due north, at the latitude.
  const polaris = L.altAzOfSky(37.95, 89.26, PLACE, night);
  check(Math.abs(polaris.altDeg - PLACE.latDeg) < 1.2 && (polaris.azDeg < 2 || polaris.azDeg > 358), `Polaris from 32 N is at ${polaris.altDeg.toFixed(1)} up, azimuth ${polaris.azDeg.toFixed(1)}`);
}

// ------------------------------------------------------------------ 2. the five trips
{
  const groups = new Set(TOUR_GROUPS.map((g) => g.id));
  for (const id of FIVE) {
    const trip = TOURS.find((t) => t.id === id);
    check(!!trip, `there is no ${id} trip`);
    if (!trip) continue;
    check(trip.stops.length >= 6 && trip.stops.length <= 10, `${id}: ${trip.stops.length} stops; the brief asked for 6 to 10`);
    check(trip.blurb.length >= 70 && trip.blurb.length <= 80, `${id}: the blurb is ${trip.blurb.length} characters, outside 70 to 80`);
    check(groups.has(trip.group), `${id}: group ${trip.group}`);
    check(TOURS.some((t) => t.id === trip.next) && trip.next !== id, `${id}: next: ${trip.next}`);
    if (trip.stage && trip.stage !== 'earth') check(/back to Earth/.test(trip.blurb), `${id}: leaving changes the stage, and the blurb must say so`);
    for (const stop of trip.stops) {
      const words = String(stop.card.body).split(/\s+/).length;
      check(words >= 20 && words <= 62, `${id}/${stop.id}: ${words} words; written for the ear is 20 to 62`);
      if (stop.look) check(stop.target.observer === true && Number.isFinite(stop.distance_km), `${id}/${stop.id}: look: on a stop that is not the visitor's place`);
    }
  }
  check(/moves the clock/.test(TOURS.find((t) => t.id === 'moon-phases').blurb), 'the Moon trip runs a month, and its blurb must say it moves the clock');
  const looks = FIVE.flatMap((id) => TOURS.find((t) => t.id === id).stops.filter((s) => s.look).map((s) => Object.keys(s.look)[0]));
  check(['world', 'best', 'pass'].every((k) => looks.includes(k)), `the ground stops look for a world, the best of a kind and a pass (${[...new Set(looks)]})`);
}

// ------------------------------------------------------------------ the machine
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
const ASPECT = 1440 / 900;
const listeners = new Map();
globalThis.window = {
  addEventListener: (type, fn) => { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
  removeEventListener: (type, fn) => { if (listeners.has(type)) listeners.get(type).delete(fn); },
  dispatchEvent: (e) => { for (const fn of listeners.get(e.type) || []) fn(e); return true; },
  matchMedia: () => ({ matches: false }),
  location: { hash: '' },
  history: { replaceState() {} },
};
const land = (id) => window.dispatchEvent({ type: 'sr:layer', detail: { id, count: 1 } });

function machineFor({ skyView = false, sites = [] } = {}) {
  const camera = new THREE.PerspectiveCamera(FOV, ASPECT, 1e-5, 1e9);
  camera.position.set(0, 0, 22);
  const rig = createCameraRig(camera, null, { worldRadius: 6.371 });
  stage.setWorld('earth');
  stage.setOrigin(null);
  const scene = new THREE.Scene();
  const worlds = createWorlds(scene, { textureBase: null, camera });
  worlds.update(REAL);
  const starfield = createStarfield(scene, { starsBin: new ArrayBuffer(0), linesJson: { features: [] }, namesJson: [], milkyWayTexture: scene });
  const sky = { active: false, entered: 0, exited: 0, looks: [],
    enter(o) { this.active = !!o; this.entered += 1; return this.active; },
    exit() { this.active = false; this.exited += 1; },
    lookAtDeg(az, alt) { this.looks.push([az, alt]); } };
  const ctx = {
    camera, cameraRig: rig, worlds, clock, starfield,
    layers: [{ id: 'worlds', propagator: 'body' }, { id: 'stations' }, { id: 'aurora', draw: 'aurora' }, { id: 'hand-kept-sites' }],
    recordsFor: () => [],
    records: () => [],
    recordById: (id) => sites.find((r) => r.id === id) || null,
    isLayerOn: () => true,
    setLayerOn() {},
    select() {},
    deselect() { rig.stopFollow(); },
    selected: () => null,
    guessPlace: () => PLACE,
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
  if (skyView) ctx.skyView = sky;
  return { ctx, camera, rig, worlds, sky, machine: createTrip(ctx) };
}

function arrive(m) {
  m.rig.finishFlight();
  pump(3);
  m.rig.update(0.016);
  m.worlds.update(clock.now());
  m.camera.updateMatrixWorld(true);
}
const sceneOf = (id) => { const p = positionOf(id, clock.now()); return stage.toScene(p, p.frame, clock.now()); };
async function begin(m, id, lands = ['worlds']) {
  clock.live();
  for (const l of lands) land(l);
  const plan = await m.machine.start(id);
  pump();
  return plan;
}
async function throughVeil(m) {
  for (let k = 0; k < 20 && m.machine.state.phase === 'veil'; k += 1) { await new Promise((r) => setImmediate(r)); pump(2); }
}

// ------------------------------------------------------------------ 3, 4. the ground, and tonight
for (const withSky of [true, false]) {
  const label = withSky ? 'with a sky view' : 'without a sky view';
  REAL = Date.parse('2026-10-06T10:00:00Z');
  const trip = TOURS.find((t) => t.id === 'tonight-from-your-street');
  const m = machineFor({ skyView: withSky });
  const plan = await begin(m, trip.id, ['stations']);
  // No station is loaded here, so the pass cannot be found and that stop is dropped, out loud.
  check(plan && plan.count === trip.stops.length - 1 && plan.dropped.map((d) => d.id).join() === 'pass', `${label}: ${plan && plan.count} stops, dropped ${plan && JSON.stringify(plan.dropped)}`);
  check(m.machine.state.clockMoves === true, `${label}: the intro says the trip moves the clock`);
  m.machine.play();
  pump(1);
  const kept = trip.stops.filter((s) => s.id !== 'pass');
  const tonight = L.tonightMs(PLACE, REAL);
  for (let i = 0; i < kept.length; i += 1) {
    const stop = kept[i];
    const where = `${label}: tonight/${stop.id}`;
    await throughVeil(m);
    arrive(m);
    check(m.machine.state.index === i && ['settle', 'dwell'].includes(m.machine.state.phase), `${where}: at stop ${m.machine.state.index}, ${m.machine.state.phase}`);
    if (stop.id !== 'out') check(Math.abs(clock.now() - tonight) < 10 * 60e3, `${where}: shown ${((clock.now() - tonight) / HOUR).toFixed(2)} h from tonight`);
    else check(Math.abs(clock.now() - REAL) < 5 * 60e3, `${where}: the last stop is the present again`);
    if (withSky) {
      check(m.machine.state.ground === !!stop.look && m.sky.active === !!stop.look, `${where}: on the ground is ${m.machine.state.ground}`);
      if (stop.look) {
        const at = m.sky.looks[m.sky.looks.length - 1];
        check(at && at[0] >= 0 && at[0] <= 360 && at[1] >= 6 && at[1] <= 80, `${where}: the view turned to ${JSON.stringify(at)}`);
        check(typeof m.machine.state.stopNote === 'string' && m.machine.state.stopNote.length > 20, `${where}: no line says what it turned to (${m.machine.state.stopNote})`);
      }
    } else {
      check(m.machine.state.ground === false, `${where}: there is no sky view, and the stop says it is on the ground`);
    }
    m.machine.next();
    pump(2);
  }
  check(m.machine.state.phase === 'outro', `${label}: after the last stop the trip is in ${m.machine.state.phase}`);
  if (withSky) check(m.sky.entered === 1 && m.sky.exited === 1, `${label}: the sky view was entered ${m.sky.entered} times and left ${m.sky.exited}; once each, the head turns between the stops`);
  m.machine.stop('test');

  // Leaving FROM the ground gives the camera back.
  if (withSky) {
    const m2 = machineFor({ skyView: true });
    await begin(m2, trip.id, ['stations']);
    m2.machine.jumpTo(2);
    m2.machine.play();
    pump(1);
    await throughVeil(m2);
    arrive(m2);
    check(m2.machine.state.ground === true && m2.sky.active, 'a deep link into a ground stop goes straight down');
    m2.machine.stop('left');
    check(m2.sky.active === false && m2.machine.state.ground === false, 'leaving from the ground hands the camera back');
  }
}

// ------------------------------------------------------------------ 4b. a planet's line for tonight
{
  REAL = Date.parse('2026-10-06T10:00:00Z');
  const trip = TOURS.find((t) => t.id === 'planets-tonight');
  const m = machineFor({ skyView: true });
  const plan = await begin(m, trip.id);
  check(plan && plan.count === trip.stops.length && plan.dropped.length === 0, `planets-tonight: ${plan && plan.count} of ${trip.stops.length} stops`);
  m.machine.play();
  pump(1);
  for (let i = 0; i < trip.stops.length; i += 1) {
    const stop = trip.stops[i];
    await throughVeil(m);
    arrive(m);
    const where = `planets-tonight/${stop.id}`;
    if (stop.live_note === 'tonight') {
      check(stage.worldId === stop.stage, `${where}: flown on the ${stage.worldId} stage`);
      const note = m.machine.state.stopNote || '';
      check(note.startsWith('From Testville tonight: '), `${where}: the line under the card is "${note}"`);
      check(!/\{[a-z]+\}/.test(note) && !/null|undefined|NaN/.test(note), `${where}: an unfilled line, "${note}"`);
    }
    if (stop.look) check(m.machine.state.ground === true, `${where}: the last stop is the visitor's ground`);
    m.machine.next();
    pump(2);
  }
  m.machine.stop('test');
  check(stage.worldId === 'earth', `leaving left the stage on ${stage.worldId}`);
}

// ------------------------------------------------------------------ 5. seen_from, and over on Mars
{
  const trip = TOURS.find((t) => t.id === 'moon-phases');
  const m = machineFor({ skyView: true });
  await begin(m, trip.id);
  m.machine.play();
  pump(1);
  const offLine = () => {
    const moon = sceneOf('moon');
    const toEarth = sceneOf('earth').sub(moon).normalize();
    const toCam = m.camera.position.clone().sub(moon).normalize();
    return Math.acos(Math.min(1, toEarth.dot(toCam))) / DEG;
  };
  // from-outside: above the Earth's north pole, far enough to hold the Moon's whole path.
  arrive(m);
  {
    const earth = sceneOf('earth');
    const north = stage.toScene({ x: 0, y: 0, z: 6371 }, 'earth-fixed', clock.now()).sub(stage.toScene({ x: 0, y: 0, z: 0 }, 'earth-fixed', clock.now())).normalize();
    const toCam = m.camera.position.clone().sub(earth);
    check(toCam.clone().normalize().dot(north) > 0.999, 'from-outside: the camera is not above the north pole');
    check(Math.abs(toCam.length() * stage.unitKm - 1000000) < 2000, `from-outside: ${Math.round(toCam.length() * stage.unitKm)} km out`);
    check(Math.abs(clock.now() - Date.parse('2027-01-08T12:00:00Z')) < 12 * HOUR, 'from-outside: shown just after the new Moon of January 2027');
  }
  m.machine.next();
  pump(2);
  arrive(m);
  check(m.machine.state.stopId === 'waxing', `the second stop is ${m.machine.state.stopId}`);
  check(offLine() < 0.5, `waxing: the camera is ${offLine().toFixed(2)} degrees off the line from the Moon to the Earth`);
  // Four days on, the Moon has gone 50 degrees round; a camera held against the stars would be 50 off.
  const before = m.camera.position.clone().sub(sceneOf('moon')).normalize();
  clock.goTo(clock.now() + 4 * 86400e3);
  pump(2);
  m.rig.update(0.016);
  m.worlds.update(clock.now());
  const after = m.camera.position.clone().sub(sceneOf('moon')).normalize();
  check(offLine() < 0.5, `waxing, four days on: the camera is ${offLine().toFixed(2)} degrees off the line; it did not follow the Earth round`);
  check(Math.acos(before.dot(after)) / DEG > 30, 'waxing, four days on: the camera has not turned against the stars at all');
  m.machine.stop('test');
}
{
  const trip = TOURS.find((t) => t.id === 'mars-where-we-have-driven');
  const site = (id, latDeg, lonDeg) => ({ id, name: id, layer: 'hand-kept-sites', klass: 'site', propagator: 'fixed', frame: 'mars-fixed', fixed: { latDeg, lonDeg, altKm: 0 } });
  const sites = [site('viking-1', 22.27, 312.05), site('opportunity', -1.95, 354.47), site('gale', -4.59, 137.44), site('elysium', 4.5, 135.62), site('jezero', 18.44, 77.45)];
  const m = machineFor({ sites });
  const plan = await begin(m, trip.id, ['worlds', 'hand-kept-sites']);
  check(plan && plan.count === trip.stops.length && plan.dropped.length === 0, `mars: ${plan && plan.count} of ${trip.stops.length} stops (${plan && JSON.stringify(plan.dropped)})`);
  check(stage.worldId === 'mars' && m.machine.state.stageChanged === true, 'the Mars trip is flown on Mars');
  m.machine.play();
  pump(1);
  let lit = 0;
  for (let i = 0; i < trip.stops.length; i += 1) {
    const stop = trip.stops[i];
    arrive(m);
    if (Array.isArray(stop.over)) {
      const p = fixed({ id: 'x', propagator: 'fixed', frame: 'mars-fixed', fixed: { latDeg: stop.over[0], lonDeg: stop.over[1], altKm: 0 } }, clock.now());
      const mars = sceneOf('mars');
      const up = stage.toScene(p, p.frame, clock.now()).sub(mars).normalize();
      const toCam = m.camera.position.clone().sub(mars).normalize();
      check(up.dot(toCam) > 0.999, `mars/${stop.id}: the camera is ${(Math.acos(up.dot(toCam)) / DEG).toFixed(1)} degrees from above ${stop.over}`);
    }
    // `time: daylight`: the Sun is up over the stop's own ground, whatever the hour the visitor came.
    if (stop.time === 'daylight') {
      const ground = Array.isArray(stop.over)
        ? { latDeg: stop.over[0], lonDeg: stop.over[1], altKm: 0 }
        : sites.find((r) => r.id === stop.target.site).fixed;
      const p = fixed({ id: 'x', propagator: 'fixed', frame: 'mars-fixed', fixed: ground }, clock.now());
      const at = stage.toScene(p, p.frame, clock.now());
      const up = at.clone().sub(sceneOf('mars')).normalize();
      const sunUp = Math.asin(up.dot(sceneOf('sun').sub(at).normalize())) / DEG;
      check(sunUp >= 13.5, `mars/${stop.id}: the Sun is ${sunUp.toFixed(1)} degrees up at ${new Date(clock.now()).toISOString()}; daylight is 14 or more`);
      check(clock.now() >= REAL && clock.now() - REAL < 3 * 86400e3, `mars/${stop.id}: daylight was found ${((clock.now() - REAL) / HOUR).toFixed(0)} h from the visitor's clock`);
      lit += 1;
    }
    m.machine.next();
    pump(2);
  }
  check(lit === 8, `${lit} of the Mars trip's stops ask for daylight; eight stand on or over the ground`);
  check(m.machine.state.phase === 'outro', `mars: the trip ended in ${m.machine.state.phase}`);
  // ---------------------------------------------------------------- 6. keep flying
  const held = m.camera.position.clone();
  m.machine.stop('stayed', { stay: true });
  check(stage.worldId === 'mars', `Keep flying left the map on ${stage.worldId}, not on Mars`);
  check(m.camera.position.distanceTo(held) < 1e-9, 'Keep flying moved the camera');
  check(m.machine.state.phase === 'idle' && m.machine.state.reason === 'stayed', 'the trip is over');
  const m2 = machineFor({ sites });
  await begin(m2, trip.id, ['worlds', 'hand-kept-sites']);
  m2.machine.stop('left');
  check(stage.worldId === 'earth', `an ordinary leave left the map on ${stage.worldId}`);
}

// ------------------------------------------------------------------ 7. the presenter
{
  const trip = TOURS.find((t) => t.id === 'the-sun-today');
  const m = machineFor();
  await begin(m, trip.id, ['worlds']);
  check(m.machine.state.wants.spaceWeather === true, 'the intro says the trip wants NOAA\'s reading');
  check(m.machine.state.pacing === 'auto', 'a trip plays itself by default');
  m.machine.setPacing('reader');
  check(m.machine.state.pacing === 'reader', 'a presenter paces it');
  m.machine.setPacing('auto');
  m.machine.setPacing(null);
  check(m.machine.state.pacing === 'auto', 'and gives the pacing back');
  m.machine.stop('test');
  m.machine.setPacing(null);

  const key = (k, present, phase = 'dwell', active = null) => keyAction({ key: k }, { phase }, active, present);
  check(key('PageDown', false) === 'next' && key('PageUp', false) === 'back', 'a clicker\'s Page Down and Page Up step the stops, in any mode');
  check(key(' ', false) === 'toggle' && key(' ', true) === 'next', 'Space pauses a trip that plays itself, and is Next in front of a room');
  check(key(' ', true, 'dwell', { tagName: 'BUTTON' }) === null, 'Space on a focused button presses the button');
  check(key('p', true) === 'toggle' && key('p', false) === null, 'P pauses in present mode only');
  check(key('f', true) === 'fullscreen' && key('f', false) === null && key('a', true) === 'auto', 'F and A are present mode\'s');
  check(key('PageDown', true, 'intro') === 'start' && key('ArrowRight', true, 'intro') === 'start' && key('PageDown', false, 'intro') === null, 'the clicker starts the show from the intro, in present mode only');
  check(key('Escape', true) === 'leave' && key('f', true, 'dwell', { tagName: 'INPUT' }) === null, 'Escape still leaves, and a text field keeps its keys');
  check(KEYS.includes('present') && KEYS.indexOf('present') > KEYS.indexOf('trip'), 'the link carries `present` after the trip');
}

// ------------------------------------------------------------------ 8. a clip's address
{
  const bare = clipRow('audio/narration', 't/a');
  check(bare.file === 'audio/narration/t/a.opus' && bare.vtt === 'audio/narration/t/a.vtt', 'without a version the path is the bare one');
  const v = clipRow('audio/narration', 't/a', 'abc12345');
  check(v.file.endsWith('a.opus?v=abc12345') && v.twin.endsWith('a.m4a?v=abc12345') && v.vtt.endsWith('a.vtt?v=abc12345') && v.id === bare.id, 'with one, all three addresses carry it and the cache id does not');
  const keys = Object.keys(NARRATION.clips);
  const missing = keys.filter((k) => !/^[0-9a-f]{8}$/.test(String((NARRATION.versions || {})[k] || '')));
  check(keys.length > 0 && missing.length === 0, `every clip has a version (${missing.slice(0, 3).join(', ')})`);
}

if (problems.length) {
  console.error(`planetarium trips FAILED (${problems.length}):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('planetarium trips ok: what is up for a place and a night, five trips of six to ten stops, stops seen from the ground and handed back, tonight on the clock, the camera kept between the Moon and the Earth for a week, above Olympus Mons, keep flying stays on Mars, a presenter paces and clicks, a clip\'s address carries its version');

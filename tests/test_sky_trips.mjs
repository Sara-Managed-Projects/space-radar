// tests/test_sky_trips.mjs -- "The constellations" and "The living Earth", flown by the real
// machine (ui/trip.js, scene/camera.js, scene/stage.js, scene/starfield.js) without a browser.
//
//   node tests/test_sky_trips.mjs
//
// What a validator reading registry/tours.yaml cannot see:
//
//   1. A LOOK AT THE SKY STANDS WHERE THE SUN IS. At every `target: {sky: [ra, dec]}` stop the
//      camera is within two astronomical units of the Sun, inside the 500 au where the sky sphere
//      is still drawn, and it looks along the direction the SKY SPHERE draws that right ascension
//      and declination in, to a twentieth of a degree, with celestial north up.
//   2. THE SKY SPHERE IS TURNED ON A RUNG. scene/starfield.js measured its rotation with an arm of
//      a million km, which on the stellar rung is 1e-7 units, took that for "no stage" and drew the
//      sphere unrotated; found 2026-10-05 by this trip. Its rotation there now agrees with the 3D
//      stars' own frame to the precession between J2000 and today (under half a degree).
//   3. THE LOOK AT THE DEPTH leaves home: the camera is `distance_km` from the point, `aside_deg`
//      round from the line to the Sun, hundreds of light-years out, and the figure is kept through
//      the flight there (state.sky keeps `Ori`).
//   4. WHAT EACH STOP ASKS OF THE SCENE reaches the state: its figures on arrival and not before,
//      the ecliptic, the shutter, the lens; and leaving clears every one of them.
//   5. THE LIVING EARTH: twelve stops resolve with nothing dropped; the two solstice stops show
//      their written instants, the north pole lit at the first and dark at the second; every live
//      stop is shown at the present; an overlay is asked for as the flight to its stop begins;
//      `over:` puts the camera above the place; the layers a stop draws are not waited for.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');

let REAL = Date.parse('2026-10-05T18:00:00Z');
Date.now = () => REAL;

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { TOURS } = await import(join(JS, 'data/tours.js'));
const { clock } = await import(join(JS, 'clock.js'));
const { WORLDS, createWorlds, positionOf } = await import(join(JS, 'scene/worlds.js'));
const { stage, STAGES } = await import(join(JS, 'scene/stage.js'));
const { createCameraRig, worldFramingDistance } = await import(join(JS, 'scene/camera.js'));
const { createStarfield } = await import(join(JS, 'scene/starfield.js'));
const { createTrip } = await import(join(JS, 'ui/trip.js'));
const { figuresLine } = await import(join(JS, 'ui/tripframe.js'));
const { dirOf, eqToEcl } = await import(join(JS, 'sky/figures.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const DEG = Math.PI / 180;
const AU_KM = 149597870.7;
const LY_KM = 9460730472580.8;

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

function machineFor() {
  const camera = new THREE.PerspectiveCamera(FOV, ASPECT, 1e-5, 1e9);
  camera.position.set(0, 0, 22);
  const rig = createCameraRig(camera, null, { worldRadius: 6.371 });
  stage.setWorld('earth');
  stage.setOrigin(null);
  const scene = new THREE.Scene();
  const worlds = createWorlds(scene, { textureBase: null, camera });
  worlds.update(REAL);
  const starfield = createStarfield(scene, { starsBin: new ArrayBuffer(0), linesJson: { features: [] }, namesJson: [], milkyWayTexture: scene });
  const layersOn = new Map();
  const ctx = {
    camera, cameraRig: rig, worlds, clock, starfield,
    layers: [
      { id: 'worlds', propagator: 'body' }, { id: 'stars' }, { id: 'storms' },
      { id: 'aurora', draw: 'aurora' }, { id: 'lightning', draw: 'lightning' },
      { id: 'exoplanets' }, { id: 'systems' }, { id: 'exotics' }, { id: 'deep-sky' }, { id: 'galaxy' },
    ],
    recordsFor: () => [],
    recordById: () => null,
    isLayerOn: (id) => (layersOn.has(id) ? layersOn.get(id) : true),
    setLayerOn(id, on) { layersOn.set(id, on); },
    select() {},
    deselect() { rig.stopFollow(); },
    selected: () => null,
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
  return { ctx, camera, rig, worlds, starfield, layersOn, machine: createTrip(ctx) };
}

// The layers a trip waits for land as events; in a browser main.js sends them.
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

/** Land on the stop the machine is flying to, and let the arrival run. */
function arrive(m) {
  m.rig.finishFlight();
  pump(3);
  m.rig.update(0.016);
  m.worlds.update(clock.now());
  m.camera.updateMatrixWorld(true);
}

// =============================================================== the constellations
{
  const trip = TOURS.find((t) => t.id === 'the-constellations');
  check(!!trip, 'there is no the-constellations trip');
  check(trip.stops.length >= 8 && trip.stops.length <= 12, `${trip.stops.length} stops; the brief asked for 8 to 12`);
  check(trip.stage === 'stellar' && trip.group === 'beyond' && TOURS.some((t) => t.id === trip.next), 'stage, group and next');
  check(/back to Earth/.test(trip.blurb), 'leaving changes the stage, and the blurb must say so');
  const m = machineFor();
  clock.live();
  for (const id of ['worlds', 'stars']) land(id);
  const plan = await m.machine.plan(trip.id);
  check(plan && plan.count === trip.stops.length && plan.dropped.length === 0, `${plan && plan.count} of ${trip.stops.length} stops resolved`);
  await m.machine.start(trip.id);
  pump();
  check(stage.worldId === 'stellar', `the trip began on the ${stage.worldId} stage`);
  check(m.machine.state.wants.figures === true && m.machine.state.wants.overlay === false, 'the intro says the trip needs the figures and no overlay');
  for (const id of trip.hides) check(m.ctx.isLayerOn(id) === false, `${id} is still on; the trip hides it`);
  check(m.machine.state.sky === null, 'no figure is asked for before the first stop');

  // 2. The sky sphere's rotation on the rung, against the 3D stars' own frame.
  const sunScene = stage.toScene({ x: 0, y: 0, z: 0 }, 'sun-inertial', clock.now());
  const trueDir = (ra, dec) => {
    const e = eqToEcl(dirOf(ra, dec));
    return stage.toScene({ x: e[0] * LY_KM, y: e[1] * LY_KM, z: e[2] * LY_KM }, 'sun-inertial', clock.now()).sub(sunScene).normalize();
  };
  const skyDir = (ra, dec) => { const d = dirOf(ra, dec); return new THREE.Vector3(d[0], d[1], d[2]).applyQuaternion(m.starfield.syncFrame()).normalize(); };
  let worstSky = 0;
  for (const [ra, dec] of [[0, 0], [90, 0], [83.8, 0], [186, 69], [196, -52], [279, -28]]) {
    worstSky = Math.max(worstSky, skyDir(ra, dec).angleTo(trueDir(ra, dec)) / DEG);
  }
  check(worstSky < 0.5, `on the stellar rung the sky sphere is ${worstSky.toFixed(2)} degrees from the 3D stars' frame; precession since J2000 is under half a degree`);

  m.machine.play();
  pump(1);
  let prevSky = null;
  for (let i = 0; i < trip.stops.length; i += 1) {
    const stop = trip.stops[i];
    const where = `constellations/${stop.id}`;
    check(m.machine.state.index === i && m.machine.state.phase === 'flight', `${where}: the trip is at stop ${m.machine.state.index} in ${m.machine.state.phase}`);
    // 4. In flight: only the figures both stops share are up.
    const flying = m.machine.state.sky;
    const shared = prevSky ? prevSky.figures.filter((f) => (stop.figures || []).includes(f)) : [];
    check(JSON.stringify(flying ? flying.figures : []) === JSON.stringify(shared), `${where}: in flight the figures are ${JSON.stringify(flying && flying.figures)}, not the shared ${JSON.stringify(shared)}`);
    check(m.machine.state.exposure === (stop.exposure || null), `${where}: the shutter in flight is ${m.machine.state.exposure}`);
    check(m.machine.state.zoom === (stop.zoom || 1), `${where}: the lens is ${m.machine.state.zoom}`);
    arrive(m);
    const sky = m.machine.state.sky;
    check(sky && JSON.stringify(sky.figures) === JSON.stringify(stop.figures), `${where}: on arrival the figures are ${JSON.stringify(sky && sky.figures)}`);
    check(sky && sky.ecliptic === (stop.ecliptic === true) && sky.stars === stop.figure_stars, `${where}: ecliptic ${sky && sky.ecliptic}, stars ${sky && sky.stars}`);
    const [ra, dec] = stop.target.sky;
    const sun = stage.toScene({ x: 0, y: 0, z: 0 }, 'sun-inertial', clock.now());
    const fromSunKm = m.camera.position.distanceTo(sun) * stage.unitKm;
    const forward = m.camera.getWorldDirection(new THREE.Vector3());
    if (!stop.target.depth_ly) {
      check(fromSunKm < 2 * AU_KM, `${where}: the camera is ${(fromSunKm / AU_KM).toFixed(2)} au from the Sun`);
      const off = forward.angleTo(skyDir(ra, dec)) / DEG;
      check(off < 0.05, `${where}: the camera looks ${off.toFixed(3)} degrees off the sky sphere's (${ra}, ${dec})`);
      const north = new THREE.Vector3(0, 0, 1).applyQuaternion(m.starfield.syncFrame());
      check(m.camera.up.angleTo(north) / DEG < 0.01, `${where}: celestial north is not the camera's up`);
      check(sky.depth === false && figuresLine(m.machine.state).includes(COPY.figures.lineSky), `${where}: the line does not say this is the sky from Earth`);
    } else {
      const target = m.rig.state.target;
      const d = m.camera.position.distanceTo(target) * stage.unitKm;
      check(Math.abs(d - stop.distance_km) < stop.distance_km * 1e-6, `${where}: the camera is ${(d / LY_KM).toFixed(1)} ly from the point, the stop asks ${(stop.distance_km / LY_KM).toFixed(1)}`);
      check(Math.abs(target.distanceTo(sun) * stage.unitKm / LY_KM - stop.target.depth_ly) < 0.01, `${where}: the point is not ${stop.target.depth_ly} ly out`);
      const aside = m.camera.position.clone().sub(target).angleTo(sun.clone().sub(target)) / DEG;
      check(Math.abs(aside - Math.abs(stop.aside_deg)) < 0.5, `${where}: the camera stands ${aside.toFixed(1)} degrees aside, the stop asks ${stop.aside_deg}`);
      check(fromSunKm > 250 * LY_KM, `${where}: the camera is only ${(fromSunKm / LY_KM).toFixed(0)} ly from the Sun`);
      check(sky.depth === true && figuresLine(m.machine.state).includes(COPY.figures.line), `${where}: the line does not say the stars are at their measured distances`);
      check(JSON.stringify(shared) === JSON.stringify(stop.figures), `${where}: the figure was not kept through the flight out`);
    }
    if (stop.ecliptic) check(figuresLine(m.machine.state).includes(COPY.figures.ecliptic), `${where}: the line does not say what the dashed line is`);
    prevSky = sky;
    m.machine.next();
    pump(2);
  }
  check(m.machine.state.phase === 'outro', `after the last stop the trip is in ${m.machine.state.phase}`);
  m.machine.stop('test');
  const st = m.machine.state;
  check(st.sky === null && st.exposure === null && st.overlay === null && st.zoom === 1 && st.wants.figures === false, 'leaving did not clear what the stops asked of the scene');
  for (const id of trip.hides) check(m.ctx.isLayerOn(id) === true, `${id} was not switched back on by leaving`);
  check(stage.worldId === 'earth', `leaving left the stage on ${stage.worldId}`);
  check(figuresLine(st) === '', 'the figures line outlived the trip');
}

// =============================================================== the living Earth
{
  const trip = TOURS.find((t) => t.id === 'the-living-earth');
  check(!!trip, 'there is no the-living-earth trip');
  check(trip.stops.length >= 8 && trip.stops.length <= 12, `${trip.stops.length} stops; the brief asked for 8 to 12`);
  check(/moves the clock/.test(trip.blurb), 'the trip moves the clock, and the blurb must say so');
  REAL = Date.parse('2026-10-05T18:00:00Z');
  const m = machineFor();
  clock.live();
  for (const id of ['worlds', 'storms']) land(id);
  const t0 = Date.now();
  const planning = m.machine.plan(trip.id);
  let planned = false;
  planning.then(() => { planned = true; });
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  check(planned, 'the plan waited for the aurora or the lightning, which are drawn and never land');
  const plan = await planning;
  check(plan && plan.count === 12 && plan.dropped.length === 0, `${plan && plan.count} of 12 stops resolved`);
  await m.machine.start(trip.id);
  pump();
  check(m.machine.state.wants.overlay === true && m.machine.state.wants.figures === false, 'the intro says the trip needs an overlay and no figures');
  check(m.machine.state.clockMoves === true, 'the intro says the trip moves the clock');
  m.machine.play();
  pump(1);
  const earthNorthLit = () => {
    // The Sun's direction from the Earth against the Earth's north pole, both in the scene.
    const e = positionOf('earth', clock.now());
    const s = positionOf('sun', clock.now());
    const toSun = stage.toScene(s, s.frame, clock.now()).sub(stage.toScene(e, e.frame, clock.now())).normalize();
    const north = stage.toScene({ x: 0, y: 0, z: 6371 }, 'earth-fixed', clock.now()).sub(stage.toScene({ x: 0, y: 0, z: 0 }, 'earth-fixed', clock.now())).normalize();
    return toSun.dot(north);
  };
  for (let i = 0; i < trip.stops.length; i += 1) {
    const stop = trip.stops[i];
    const where = `living-earth/${stop.id}`;
    check(m.machine.state.index === i, `${where}: the trip is at stop ${m.machine.state.index}`);
    // The veil of a stage change (Jupiter and back) is a promise; let it through.
    for (let k = 0; k < 20 && m.machine.state.phase === 'veil'; k += 1) { await new Promise((r) => setImmediate(r)); pump(2); }
    check(m.machine.state.overlay === (stop.overlay || null), `${where}: in flight the overlay asked for is ${m.machine.state.overlay}`);
    arrive(m);
    check(stage.worldId === (stop.stage || 'earth'), `${where}: flown on the ${stage.worldId} stage`);
    if (typeof stop.time === 'string' && stop.time !== 'now') {
      check(Math.abs(clock.now() - Date.parse(stop.time)) < 60 * 60e3, `${where}: shown at ${new Date(clock.now()).toISOString()}, not ${stop.time}`);
      const lit = earthNorthLit();
      if (stop.id === 'tilt') check(lit > 0.38, `${where}: the north pole is tipped ${(Math.asin(lit) / DEG).toFixed(1)} degrees towards the Sun, not 23`);
      else check(lit < -0.38, `${where}: the north pole is tipped ${(Math.asin(lit) / DEG).toFixed(1)} degrees towards the Sun, not away`);
    } else if (stop.overlay || stop.live_note || stop.time === 'now') {
      check(Math.abs(clock.now() - REAL) < 5 * 60e3, `${where}: a stop about today is shown ${Math.round((clock.now() - REAL) / 3600e3)} h from the present`);
    }
    if (stop.over && (stop.over[1] === 'midnight' || stop.over[1] === 'noon')) {
      // `noon` (2026-10-06) is the meridian facing the Sun, for the stop about today's clouds.
      const side = stop.over[1] === 'noon' ? -1 : 1;
      // Above the night side at the stop's latitude, on the meridian facing away from the Sun.
      const ground = stage.toScene({ x: 0, y: 0, z: 0 }, 'earth-fixed', clock.now());
      const north = stage.toScene({ x: 0, y: 0, z: 6371 }, 'earth-fixed', clock.now()).sub(ground).normalize();
      const s = positionOf('sun', clock.now());
      const toSun = stage.toScene(s, s.frame, clock.now()).sub(ground).normalize();
      const cam = m.camera.position.clone().sub(ground).normalize();
      const latCam = Math.asin(cam.dot(north)) / DEG;
      check(Math.abs(latCam - stop.over[0]) < 1.5, `${where}: the camera is over latitude ${latCam.toFixed(1)}, the stop asks ${stop.over[0]}`);
      const east = new THREE.Vector3().crossVectors(north, toSun).normalize();
      check(Math.abs(cam.dot(east)) < 0.03 && side * cam.clone().addScaledVector(north, -cam.dot(north)).dot(toSun) < 0, `${where}: the camera is not over the ${stop.over[1]} meridian`);
    } else if (stop.over) {
      const ground = stage.toScene({ x: 0, y: 0, z: 0 }, 'earth-fixed', clock.now());
      const lat = stop.over[0] * DEG;
      const lon = stop.over[1] * DEG;
      const place = stage.toScene({ x: 6371 * Math.cos(lat) * Math.cos(lon), y: 6371 * Math.cos(lat) * Math.sin(lon), z: 6371 * Math.sin(lat) }, 'earth-fixed', clock.now()).sub(ground).normalize();
      const off = m.camera.position.clone().sub(ground).normalize().angleTo(place) / DEG;
      check(off < 1.5, `${where}: the camera is ${off.toFixed(1)} degrees from above ${stop.over}`);
    }
    if (stop.target.world === 'earth' && stop.frame_radii) {
      const e = positionOf('earth', clock.now());
      const d = m.camera.position.distanceTo(stage.toScene(e, e.frame, clock.now())) * stage.unitKm;
      check(Math.abs(d - stop.frame_radii * 6371) < 6371 * 0.2, `${where}: the camera is ${(d / 6371).toFixed(2)} radii out, the stop asks ${stop.frame_radii}`);
    }
    m.machine.next();
    pump(2);
  }
  m.machine.stop('test');
  check(m.machine.state.overlay === null && clock.mode === 'live', `leaving left overlay ${m.machine.state.overlay} and the clock in ${clock.mode}`);
  void t0;
}

if (problems.length) {
  console.error(`sky trips FAILED (${problems.length}):\n  ` + problems.slice(0, 40).join('\n  '));
  process.exit(1);
}
console.log('sky trips ok: twelve looks at the sky from where the Sun is, each within a twentieth of a degree of the sky sphere with north up, one from hundreds of light-years aside; the sky sphere turned on the stellar rung; the living Earth\'s twelve stops, both solstices lit as written, overlays asked for in flight, the camera above each named place');

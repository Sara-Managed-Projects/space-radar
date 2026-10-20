// tests/test_trip_clear.mjs -- a held trip stop keeps its subject in sight (public #580).
//
// Seen on a phone: stop 2 of "Where people are living in space right now", the station, its
// brackets round empty black and its tag saying "behind Earth". The camera's side was chosen once,
// from where the station was when the flight began; the rig's angles are fixed against the stars,
// and the station goes round the Earth in ninety-three minutes, so a stop that is held (paused, a
// card being read) ends with the planet between the camera and the station.
//
// This runs the real trip machine (ui/trip.js, the rig) with the harvest fixture's station, holds
// stop 2 for an hour at eight starting points round one orbit, and every ten seconds asks whether
// the line from the camera to the station crosses the Earth. It must never. It also holds the
// two rules of the fix: the search for a side asks about the subject being SEEN (a camera beyond
// the planet is not inside it, and sees only it), and a visitor's hand on the camera ends the
// correction for that stop.
//
//   node tests/test_trip_clear.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { parseCelestrakGP } = await import(join(JS, 'data/parsers.js'));
const { createCameraRig } = await import(join(JS, 'scene/camera.js'));
const { createTrip } = await import(join(JS, 'ui/trip.js'));
const { positionOf, WORLDS } = await import(join(JS, 'scene/worlds.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const TRIP = 'people-in-space';
const stations = parseCelestrakGP(readFileSync(join(ROOT, 'tests/fixtures/harvest/celestrak_gp.json'), 'utf8'), { layer: 'stations', source: 'celestrak-stations' });
const R = WORLDS.find((w) => w.id === 'earth').radiusKm / stage.unitKm;

const frames = [];
globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
const pump = (n = 6) => { for (let i = 0; i < n; i += 1) { const due = frames.splice(0, frames.length); for (const fn of due) { try { fn(Date.now()); } catch { /* the card needs a document; the pose is under test */ } } } };
let wall = 0;
Object.defineProperty(globalThis, 'performance', { value: { now: () => wall }, configurable: true });
const fly = (machine, rig) => { for (let k = 0; k < 1000 && machine.state.phase === 'flight'; k += 1) { wall += 16; rig.update(0.016); pump(1); } pump(2); rig.update(0.016); };
const earthCentre = (tMs) => { const p = positionOf('earth', tMs); return stage.toScene(p, p.frame, tMs); };

/** Does the line from the camera to the target cross the Earth? */
const hidden = (camera, target, tMs) => {
  const c = earthCentre(tMs);
  const d = target.clone().sub(camera.position);
  const len = d.length();
  d.normalize();
  const o = c.clone().sub(camera.position);
  const along = o.dot(d);
  const off2 = o.lengthSq() - along * along;
  return along > 0 && off2 < R * R && along - Math.sqrt(R * R - off2) < len;
};

const T00 = Date.parse('2026-09-08T00:00:00Z');
let worst = 0;
let held = 0;
let moved = 0;
for (let k = 0; k < 8; k += 1) {
  const T0 = T00 + k * 12 * 60e3;
  const camera = new THREE.PerspectiveCamera(45, 0.46, 0.001, 1e9);
  camera.position.set(0, 0, 22);
  const rig = createCameraRig(camera, null, { worldRadius: R });
  const clock = { mode: 'live', rate: 1, paused: false, t: T0, now() { return this.t; }, goTo(ms) { this.t = ms; this.mode = 'scrub'; }, setRate() {}, setPaused() {}, live() { this.mode = 'live'; this.t = T0; } };
  const ctx = {
    camera, cameraRig: rig, clock,
    layers: [{ id: 'stations', nearKm: 3000, propagator: 'sgp4' }],
    records: () => stations, recordsFor: (id) => (id === 'stations' ? stations : []), recordById: (id) => stations.find((r) => r.id === id) || null,
    isLayerOn: () => true, setLayerOn() {}, selected: () => null, deselect() { rig.stopFollow(); },
    select(record) { if (record) rig.follow(() => { const p = propagate(record, clock.now()); return stage.toScene(p, p.frame, clock.now()); }); },
    get observer() { return null; },
  };
  const machine = createTrip(ctx);
  await machine.plan(TRIP);
  await machine.start(TRIP);
  pump();
  machine.play();
  pump(2);
  fly(machine, rig);
  machine.next();
  pump(2);
  fly(machine, rig);
  check(machine.state.index === 1, `starting point ${k}: the trip is at the station's stop (${machine.state.index})`);
  check(!hidden(camera, rig.state.target, clock.now()), `starting point ${k}: the station is in sight on arrival`);
  machine.pause();
  pump(1);
  const az0 = rig.state.azimuth;
  for (let sec = 0; sec <= 3600; sec += 1) {
    clock.t = T0 + sec * 1000;
    wall += 1000;
    for (let q = 0; q < 2; q += 1) { rig.update(0.016); pump(1); }
    if (sec % 10 === 0) {
      held += 1;
      if (hidden(camera, rig.state.target, clock.now())) { worst += 1; check(false, `starting point ${k}: the station is behind the Earth ${sec} s into a held stop`); break; }
    }
  }
  if (Math.abs(rig.state.azimuth - az0) > 0.2) moved += 1;
  check(Math.abs(camera.position.distanceTo(rig.state.target) * stage.unitKm - 3000) < 1, `starting point ${k}: the camera is still 3000 km from the station`);
  machine.stop('test');
  pump();
}
check(moved > 0, 'the camera did turn for some starting point (otherwise the hour proved nothing)');

// The source: the search asks whether the subject is SEEN, and a hand ends the correction.
{
  const src = readFileSync(join(JS, 'ui/trip.js'), 'utf8').replace(/\/\/.*$/gm, '');
  check(/function sightBlocked\(/.test(src) && /\(ground \? blocked : sightBlocked\)/.test(src), 'the key-light search drops a side from which the world hides the subject');
  check(/handOn = `\$\{gen\}:\$\{state\.index\}`/.test(src) && /if \(handOn === `\$\{gen\}:\$\{state\.index\}`\)/.test(src), 'a hand on the camera ends the correction for that stop');
  check(/trackClear\(\);/.test(src), 'the trip checks every frame');
}

if (problems.length) { console.error(`trip clear FAILED (${problems.length}):\n  ${problems.join('\n  ')}`); process.exit(1); }
console.log(`trip clear ok: the station stayed in sight for an hour at 8 starting points (${held} looks), the camera turned for ${moved} of them`);

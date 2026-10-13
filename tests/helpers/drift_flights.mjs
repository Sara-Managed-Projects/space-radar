// tests/helpers/drift_flights.mjs -- the drift's flights on the real camera rig, measured under node.
//
// What a person watching a flight feels is not kilometres a second. It is (1) how fast the picture
// TURNS, (2) how fast a body that is in the picture SWEEPS across it, and (3) how fast that body
// GROWS or SHRINKS. This file flies scene/camera.js between two framed places a sixtieth of a second
// at a time and reads those three off the camera itself, so a test can hold them
// (tests/test_drift_pace.mjs) and a pull request can print them (`--table`).
//
// HOPS are the classes Ivan named on 2026-10-14 ("2 satellites on the Earth it goes smoothly, but
// then it travels far to Mars or even more and it is super fast"), laid out as the app lays them
// out: the Earth's stage at 1 000 km a unit, a craft met from the distance scene/heroes.js
// closeUpDistance gives it, the Moon where it is, and the planets where scene/worlds.js draws them
// from the Earth (PLANET_VIEW: 2 000 units at 1 au, the fourth root of the distance beyond, a disc
// 0.0035 rad in radius met from 3.5 radii). The last one is the stellar rung, a light-year a unit,
// two stars met as discs (main.js arrivalDistance: twelve radii).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '../../site/js');
const THREE = await import(join(JS, '../vendor/three.module.min.js'));
const { createCameraRig } = await import(join(JS, 'scene/camera.js'));
const { PLANET_VIEW, drawnDistanceKm } = await import(join(JS, 'scene/worlds.js'));
const P = await import(join(JS, 'ui/driftplan.js'));

const FOV = 45;
const ASPECT = 1.6;
const SCREEN_H = 900;
const UNIT_KM = 1000;
const EARTH_R = 6.371;
const AU_KM = PLANET_VIEW.REF_KM;
/** Half the picture's width, as an angle: a body farther off the view axis than this is not in it. */
export const IN_VIEW_RAD = Math.atan(ASPECT * Math.tan((FOV / 2) * Math.PI / 180));

const rad = (deg) => (deg * Math.PI) / 180;
const onCircle = (r, lonDeg, latDeg = 0) => ({
  x: r * Math.cos(rad(latDeg)) * Math.cos(rad(lonDeg)), y: r * Math.cos(rad(latDeg)) * Math.sin(rad(lonDeg)), z: r * Math.sin(rad(latDeg)),
});

/** A craft `altKm` up, met as main.js arrivalDistance meets it (scene/heroes.js closeUpDistance). */
function craft(name, hood, altKm, lonDeg, latDeg) {
  const alt = altKm / UNIT_KM;
  const f = 1 / Math.tan(rad(FOV / 2));
  const close = (alt * 0.9 * SCREEN_H * f) / (2 * 260 * 1.15);
  return { name, hood, pos: onCircle(EARTH_R + alt, lonDeg, latDeg), distance: Math.max(0.05, Math.min(0.7, close)) };
}
/** A planet as the Earth's stage draws it: nearer and larger than it is, met on its lit face. */
function planet(name, hood, au, lonDeg) {
  const r = drawnDistanceKm(au * AU_KM) / UNIT_KM;
  const radius = r * PLANET_VIEW.MIN_ANGULAR_RADIUS_RAD;
  const pos = onCircle(r, lonDeg, 2);
  return { name, hood, pos, distance: radius * 3.5, offset: { x: -pos.x, y: -pos.y, z: -pos.z } };
}
const LY_KM = 9460730472580.8;
const star = (name, ly, lonDeg, latDeg, radiusKm) => ({ name, hood: 'stellar', pos: onCircle(ly, lonDeg, latDeg), distance: (radiusKm * 12) / LY_KM });

const ISS = craft('the station', 'earth', 420, 20, 30);
const HUBBLE = craft('Hubble', 'earth', 540, 110, -20);
const FAR_SIDE = craft('a satellite on the far side', 'earth', 700, 195, -35);
const MOON = { name: 'the Moon', hood: 'moon', pos: onCircle(384.4, 250, 4), distance: 1.7374 * 3.5, offset: { x: 1, y: 0.2, z: 0.1 } };
const MARS = planet('Mars', 'mars', 1.6, 40);
const SATURN = planet('Saturn', 'saturn', 9.6, 205);
const MERCURY = planet('Mercury', 'mercury', 0.9, 350);
const NEPTUNE = planet('Neptune', 'neptune', 30, 170);

/** The hop classes. `klass` is what the bounds are held by. */
export const HOPS = [
  { klass: 'short', name: 'two low satellites, a quarter of the Earth apart', from: ISS, to: HUBBLE, world: EARTH_R },
  { klass: 'short', name: 'two low satellites, on opposite sides of the Earth', from: ISS, to: FAR_SIDE, world: EARTH_R },
  { klass: 'medium', name: 'the station to the Moon', from: ISS, to: MOON, world: EARTH_R },
  { klass: 'long', name: 'the station to Mars', from: ISS, to: MARS, world: EARTH_R },
  { klass: 'long', name: 'Mars to Saturn', from: MARS, to: SATURN, world: EARTH_R },
  { klass: 'very long', name: 'Mercury to Neptune, across the whole map', from: MERCURY, to: NEPTUNE, world: EARTH_R },
  { klass: 'very long', name: 'Sirius to Betelgeuse, 540 light-years, both met as discs', from: star('Sirius', 8.6, 101, -17, 1.19e6), to: star('Betelgeuse', 548, 89, 7, 5.3e8), world: 0 },
];

/** The flight the drift flew until 2026-10-14, as ui/drift.js and ui/driftplan.js then had it. */
export function flightBefore(hop, rig) {
  const steps = Math.abs(P.HOODS.indexOf(hop.from.hood) - P.HOODS.indexOf(hop.to.hood));
  const ms = Math.min(13000, 6500 + steps * 1300);
  const from = rig.saveState();
  const sep = Math.hypot(hop.to.pos.x - from.target.x, hop.to.pos.y - from.target.y, hop.to.pos.z - from.target.z);
  const near = Math.max(from.distance, hop.to.distance);
  return { ms, ease: 'cruise', targetDelay: 0.2, apex: sep > near * 3 ? { distance: sep * 0.9, at: 0.45 } : undefined };
}

/** The flight it flies now: ui/driftplan.js planFlight, handed to the rig as `path`. */
export function flightNow(hop, rig, pace = 'steady') {
  return { ...flightBefore(hop, rig), path: (info) => P.planFlight({ ...info, pace }) };
}

/**
 * Fly one hop and measure it. Returns seconds, the three peaks and when each came (0..1 of the
 * flight), and the largest step the camera took in one frame as a share of its distance to the
 * nearer body (a jump shows here).
 */
export function fly(hop, flightFor, fps = 60) {
  const camera = new THREE.PerspectiveCamera(FOV, ASPECT, 1e-9, 1e12);
  camera.up.set(0, 0, 1);
  const rig = createCameraRig(camera, null, { worldRadius: hop.world, minDistance: 1e-9 });
  const frame = (o) => ({ targetScene: o.pos, distance: o.distance, offset: o.offset });
  rig.flyTo({ ...frame(hop.from), ms: 0 });
  rig.update(1 / fps, 1000 / fps);
  let done = false;
  const opts = flightFor(hop, rig);
  rig.flyTo({ ...frame(hop.to), ms: opts.ms, ...opts, onArrive: () => { done = true; } });
  const bodies = [hop.from.pos, hop.to.pos].map((p) => new THREE.Vector3(p.x, p.y, p.z));
  const q = new THREE.Quaternion();
  const read = () => {
    camera.updateMatrixWorld();
    const inv = q.copy(camera.quaternion).invert();
    return {
      quat: camera.quaternion.clone(), pos: camera.position.clone(),
      seen: bodies.map((b) => {
        const v = b.clone().sub(camera.position);
        const dist = v.length();
        const dir = v.applyQuaternion(inv).normalize();
        return { dir, dist, off: Math.acos(Math.max(-1, Math.min(1, -dir.z))) };
      }),
    };
  };
  const dt = 1 / fps;
  let prev = read();
  const peaks = { turn: 0, sweep: 0, loom: 0, turnAt: 0, sweepAt: 0, loomAt: 0, jump: 0 };
  const samples = [];
  let frames = 0;
  while (!done && frames < fps * 240) {
    rig.update(dt, dt * 1000);
    frames += 1;
    const now = read();
    const turn = (2 * Math.acos(Math.min(1, Math.abs(prev.quat.dot(now.quat))))) / dt;
    let sweep = 0;
    let loom = 0;
    now.seen.forEach((s, i) => {
      const was = prev.seen[i];
      if (s.off > IN_VIEW_RAD && was.off > IN_VIEW_RAD) return;
      sweep = Math.max(sweep, was.dir.angleTo(s.dir) / dt);
      loom = Math.max(loom, Math.abs(Math.log(s.dist / was.dist)) / dt);
    });
    const nearest = Math.min(...now.seen.map((s) => s.dist), ...prev.seen.map((s) => s.dist));
    peaks.jump = Math.max(peaks.jump, now.pos.distanceTo(prev.pos) / nearest);
    samples.push({ turn, sweep, loom });
    prev = now;
  }
  samples.forEach((s, i) => {
    const at = (i + 1) / samples.length;
    if (s.turn > peaks.turn) { peaks.turn = s.turn; peaks.turnAt = at; }
    if (s.sweep > peaks.sweep) { peaks.sweep = s.sweep; peaks.sweepAt = at; }
    if (s.loom > peaks.loom) { peaks.loom = s.loom; peaks.loomAt = at; }
  });
  const deg = 180 / Math.PI;
  const end = rig.saveState();
  return {
    seconds: frames / fps, landed: done,
    end: { target: end.target.toArray(), distance: end.distance, azimuth: end.azimuth, polar: end.polar },
    turnDegS: peaks.turn * deg, sweepDegS: peaks.sweep * deg, loomPerS: peaks.loom,
    turnAt: peaks.turnAt, sweepAt: peaks.sweepAt, loomAt: peaks.loomAt, jump: peaks.jump, samples,
  };
}

/** A seeded generator (mulberry32). */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hops nobody chose: a craft in low orbit anywhere round the Earth to or from a far world in any
 * direction, 300 to 4 500 units out, met on the side that faces the Earth's stage's centre (its lit
 * side, for anything beyond the Earth); and two far worlds.
 */
export function randomHops(n, rng) {
  const dir = () => { const z = 2 * rng() - 1; const l = 2 * Math.PI * rng(); const s = Math.sqrt(1 - z * z); return { x: s * Math.cos(l), y: s * Math.sin(l), z }; };
  const times = (v, k) => ({ x: v.x * k, y: v.y * k, z: v.z * k });
  const sat = () => ({ name: 'a craft', hood: 'earth', pos: times(dir(), EARTH_R + 0.3 + rng() * 1.5), distance: 0.7 });
  const far = () => { const r = 300 * Math.pow(15, rng()); const pos = times(dir(), r); return { name: 'a world', hood: 'mars', pos, distance: r * PLANET_VIEW.MIN_ANGULAR_RADIUS_RAD * 3.5, offset: times(pos, -1) }; };
  return Array.from({ length: n }, (_, i) => ({ klass: 'random', name: `random ${i}`, from: i % 3 === 0 ? far() : i % 3 === 1 ? sat() : far(), to: i % 3 === 1 ? far() : i % 3 === 0 ? sat() : far(), world: EARTH_R }));
}

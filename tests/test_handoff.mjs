// tests/test_handoff.mjs -- the pose-preserving hand-off between stages (scene/handoff.js; internal
// #410, public #451), without a browser.
//
// Asserted:
//   - the joins are a chain from the Earth to the Local Group, each with hysteresis, and mirror
//     registry/stages.yaml `joins:`;
//   - A -> B -> A returns the pose (position, look-at point, up) within a tolerance, on every join
//     and across the whole chain;
//   - the physical distance from the camera to its look-at point is the same on both sides;
//   - the view direction is preserved AGAINST THE SKY: the angle between the view and a fixed star's
//     direction, each measured in its own stage through stage.toScene, is the same before and after;
//   - the thing in the middle stays in the middle: the Earth, looked at from the Earth's stage, is at
//     the look-at point on the Sun's stage;
//   - the zoom is logarithmic: equal steps of time are equal RATIOS of distance in the middle of a
//     climb, over fourteen orders of magnitude and more, and the ease starts and ends at rest;
//   - a walk out and back crosses each join once each way and never flips;
//   - the look-at point's share is a function of distance alone (the way back retraces the way out);
//   - main.js fetches scene/climb.js lazily and runs it either side of the frame.
//
//   node tests/test_handoff.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const H = await import(join(JS, 'scene/handoff.js'));
const { stage, STAGES } = await import(join(JS, 'scene/stage.js'));
const { positionOf } = await import(join(JS, 'scene/worlds.js'));
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));

const tMs = Date.parse('2026-10-06T12:00:00Z');
const LY = 9460730472580.8;

// --- the chain -----------------------------------------------------------------------------------
check(JSON.stringify(H.CHAIN) === JSON.stringify(['earth', 'sun', 'stellar', 'galaxy', 'local-group']), `the chain is Earth, Sun, stellar, galaxy, Local Group (${H.CHAIN})`);
for (let i = 0; i < H.JOINS.length; i++) {
  const j = H.JOINS[i];
  check(STAGES[j.from] && STAGES[j.to], `join ${j.from} -> ${j.to}: both are stages`);
  check(j.out_km > j.in_km && j.in_km > 0, `join ${j.from} -> ${j.to}: out (${j.out_km}) is past in (${j.in_km})`);
  check(j.in_km / j.out_km <= 0.8, `join ${j.from} -> ${j.to}: the band between in and out is at least a fifth wide`);
  if (i > 0) check(j.in_km > H.JOINS[i - 1].out_km * 10, `join ${j.from} -> ${j.to} is well past the one before`);
  // In the units of BOTH stages the join is a distance float32 holds comfortably.
  for (const id of [j.from, j.to]) {
    const u = j.out_km / STAGES[id].unitKm;
    check(u > 1e-3 && u < 1e7, `join ${j.from} -> ${j.to} is ${u.toExponential(2)} units on ${id}: inside float32's band`);
  }
}
// the registry is the source; the table in the module is its mirror
{
  const yaml = readFileSync(join(ROOT, 'registry/stages.yaml'), 'utf8');
  const rows = [...yaml.matchAll(/-\s*\{from:\s*([\w-]+),\s*to:\s*([\w-]+),\s*anchor:\s*([\w-]+),\s*out_km:\s*([0-9.e+]+),\s*in_km:\s*([0-9.e+]+)\s*\}/g)]
    .map((m) => ({ from: m[1], to: m[2], anchor: m[3], out_km: Number(m[4]), in_km: Number(m[5]) }));
  check(rows.length === H.JOINS.length && rows.every((r, i) => JSON.stringify(r) === JSON.stringify(H.JOINS[i])), `registry/stages.yaml joins: and scene/handoff.js JOINS agree (${rows.length} rows)`);
}

// --- a stage as the pure function sees it --------------------------------------------------------
function descOf(id) {
  stage.setWorld(id);
  stage.setTime(tMs);
  // What scene/worlds.js update() does for the origin: zero where the frame is the stage's own world.
  const frameWorld = String(stage.frame).split('-')[0];
  if (frameWorld === id || STAGES[id].ladder) stage.setOrigin(null);
  else { const c = positionOf(id, tMs); stage.setOrigin(stage.toStageFrame(c, c.frame, tMs)); }
  return { id, frame: stage.frame, unitKm: stage.unitKm, originKm: { ...stage.originKm } };
}
const DESC = Object.fromEntries(H.CHAIN.map((id) => [id, descOf(id)]));
const V = (o) => new THREE.Vector3(o.x, o.y, o.z);
const starKm = { x: 4.2 * LY, y: -1.1 * LY, z: 0.6 * LY, frame: 'sun-inertial' }; // any fixed point far away
function starDir(id, fromScene) {
  descOf(id);
  const p = stage.toScene(starKm, 'sun-inertial', tMs);
  return p.sub(fromScene).normalize();
}

// --- every join, both ways -----------------------------------------------------------------------
for (const j of H.JOINS) {
  const A = DESC[j.from];
  const B = DESC[j.to];
  const d = j.out_km / A.unitKm; // the camera at the join, in A's units
  // Looking at the stage's centre from an arbitrary side, with an up that is not the stage's own.
  const target = { x: 0.02 * d, y: -0.01 * d, z: 0.015 * d };
  const dir = new THREE.Vector3(0.48, 0.31, 0.82).normalize();
  const position = V(target).addScaledVector(dir, d);
  const up = new THREE.Vector3(0.1, 0.97, -0.2).normalize();
  const pose = { position, target, up };
  const there = H.convertPose(pose, A, B, tMs);
  check(!!there, `${j.from} -> ${j.to}: the pose converts`);
  if (!there) continue;
  // the same physical distance
  check(Math.abs(there.distanceKm / (d * A.unitKm) - 1) < 1e-9, `${j.from} -> ${j.to}: the camera is as far from its look-at point in km (${there.distanceKm} vs ${d * A.unitKm})`);
  check(Math.abs(there.distance * B.unitKm / there.distanceKm - 1) < 1e-12, `${j.from} -> ${j.to}: and the rig's distance is that, in the new unit`);
  // the same direction against the sky
  const viewA = V(target).sub(position).normalize();
  const viewB = V(there.target).sub(V(there.position)).normalize();
  const angA = viewA.angleTo(starDir(j.from, position));
  const angB = viewB.angleTo(starDir(j.to, V(there.position)));
  check(Math.abs(angA - angB) < 2e-6, `${j.from} -> ${j.to}: the view keeps its angle to a fixed star (${angA} vs ${angB} rad)`);
  // the same roll: the up keeps its angle to that star too, and stays square to nothing it was not
  const upA = up.angleTo(starDir(j.from, position));
  const upB = V(there.up).angleTo(starDir(j.to, V(there.position)));
  check(Math.abs(upA - upB) < 2e-6, `${j.from} -> ${j.to}: the up keeps its angle to a fixed star (${upA} vs ${upB} rad)`);
  check(Math.abs(V(there.up).length() - 1) < 1e-9, `${j.from} -> ${j.to}: the up is a unit vector`);
  // and back
  const back = H.convertPose(there, B, A, tMs);
  const errP = V(back.position).distanceTo(position) / d;
  const errT = V(back.target).distanceTo(V(target)) / d;
  check(errP < 1e-9 && errT < 1e-9, `${j.from} -> ${j.to} -> ${j.from}: the pose comes back (position ${errP.toExponential(1)}, target ${errT.toExponential(1)} of the distance)`);
  check(V(back.up).angleTo(up) < 1e-7, `${j.from} -> ${j.to} -> ${j.from}: the up comes back (${V(back.up).angleTo(up)} rad)`);
}

// --- the thing in the middle is the dot in the middle of the next stage ---------------------------
{
  const A = DESC.earth;
  const B = DESC.sun;
  const pose = { position: { x: 900, y: 500, z: 800 }, target: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 1, z: 0 } };
  const there = H.convertPose(pose, A, B, tMs);
  descOf('sun');
  const e = positionOf('earth', tMs);
  const earthOnSun = stage.toScene(e, e.frame, tMs);
  const miss = earthOnSun.distanceTo(V(there.target)) * B.unitKm;
  check(miss < 1, `the Earth, looked at from its own stage, is the look-at point on the Sun's stage (${miss.toFixed(3)} km off)`);
  // The equator's pole is 23.4 degrees from the ecliptic's: the up arrives tilted by that and no more.
  const tilt = V(there.up).angleTo(new THREE.Vector3(0, 1, 0)) * 180 / Math.PI;
  check(tilt > 22 && tilt < 25, `the Earth stage's up arrives ${tilt.toFixed(2)} degrees off the Sun stage's (the obliquity)`);
}

// --- the whole chain, out and back ---------------------------------------------------------------
{
  let pose = { position: { x: 20, y: 9, z: 31 }, target: { x: 0.5, y: 0.2, z: -0.1 }, up: { x: 0, y: 1, z: 0 } };
  const start = pose;
  for (let i = 1; i < H.CHAIN.length; i++) pose = H.convertPose(pose, DESC[H.CHAIN[i - 1]], DESC[H.CHAIN[i]], tMs);
  const direct = H.convertPose(start, DESC.earth, DESC['local-group'], tMs);
  check(V(pose.position).distanceTo(V(direct.position)) < 1e-12 * Math.max(1, V(direct.position).length()) + 1e-24, 'four hand-offs in a row are the one hand-off from the Earth to the Local Group');
  for (let i = H.CHAIN.length - 1; i > 0; i--) pose = H.convertPose(pose, DESC[H.CHAIN[i]], DESC[H.CHAIN[i - 1]], tMs);
  // A camera 40 000 km from the Earth, carried to a stage whose origin is 1.5e8 km away and whose
  // unit is a million light-years, comes back to within float64's reach of that origin: metres.
  const errKm = V(pose.position).distanceTo(V(start.position)) * 1000;
  check(errKm < 0.01, `Earth -> Local Group -> Earth returns the camera within 10 m (${(errKm * 1000).toFixed(3)} m)`);
  check(H.convertPose({ position: { x: NaN, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } }, DESC.earth, DESC.sun, tMs) === null, 'a pose that is not a pose is refused');
  check(H.convertPose(start, DESC.earth, { frame: 'nowhere-inertial', unitKm: 1, originKm: { x: 0, y: 0, z: 0 } }, tMs) === null, 'a frame nobody can convert is refused, not guessed');
}

// --- which stage ---------------------------------------------------------------------------------
{
  const j0 = H.JOINS[0];
  check(H.stageAfter('earth', j0.out_km * 1.01, Infinity) === 'sun', 'past the first join on the way out: the Sun\'s stage');
  check(H.stageAfter('earth', j0.out_km * 0.99, Infinity) === null, 'short of it: stay');
  check(H.stageAfter('sun', 0, j0.in_km * 0.99) === 'earth', 'nearer than the way-back mark: the Earth\'s stage');
  check(H.stageAfter('sun', 0, j0.in_km * 1.01) === null && H.stageAfter('sun', 0, j0.out_km) === null, 'between the two marks the stage holds (hysteresis)');
  check(H.stageAfter('local-group', 1e30, Infinity) === null && H.stageAfter('earth', 0, 0) === null, 'the two ends of the chain have nowhere further to go');
  check(H.stageAfter('mars', 1e30, 0) === null && H.stageAfter('system-trappist-1', 1e30, 0) === null, 'a stage that is not on the chain is never handed on');
  // a walk out and back, in small steps: each join crossed once each way
  let id = 'earth';
  const seen = [];
  const steps = 4000;
  const lo = 7000;
  const hi = H.EDGE_KM;
  for (let s = 0; s <= steps; s++) {
    const d = H.climbDistance(lo, hi, s / steps);
    const next = H.stageAfter(id, d, d);
    if (next) { seen.push(`${id}>${next}`); id = next; }
  }
  for (let s = steps; s >= 0; s--) {
    const d = H.climbDistance(lo, hi, s / steps);
    const next = H.stageAfter(id, d, d);
    if (next) { seen.push(`${id}>${next}`); id = next; }
  }
  check(seen.join(' ') === 'earth>sun sun>stellar stellar>galaxy galaxy>local-group local-group>galaxy galaxy>stellar stellar>sun sun>earth', `out and back crosses each join once each way (${seen.join(' ')})`);
  check(H.stageForDistance(1e4) === 'earth' && H.stageForDistance(6e9) === 'sun' && H.stageForDistance(12 * LY) === 'stellar' && H.stageForDistance(150000 * LY) === 'galaxy' && H.stageForDistance(4e6 * LY) === 'local-group', 'stageForDistance names the stage of a distance from home');
  const mid = (j0.in_km + j0.out_km) / 2;
  check(H.stageForDistance(mid, 'earth') === 'earth' && H.stageForDistance(mid, 'sun') === 'sun', 'inside a join\'s band the answer is the stage it came from');
  const band = H.restBand('sun');
  check(band.minKm === j0.out_km && band.maxKm === H.JOINS[1].in_km, 'a stage\'s rest band is from the join below\'s out to the join above\'s in');
}

// --- the zoom ------------------------------------------------------------------------------------
{
  check(H.easeTrapezoid(0) === 0 && Math.abs(H.easeTrapezoid(1) - 1) < 1e-12, 'the ease runs from 0 to 1');
  let mono = true;
  for (let k = 0; k < 1; k += 0.001) if (H.easeTrapezoid(k + 0.001) < H.easeTrapezoid(k)) mono = false;
  check(mono, 'and never goes backwards');
  check(H.easeTrapezoid(0.001) < 0.0001 && 1 - H.easeTrapezoid(0.999) < 0.0001, 'it starts and ends at rest');
  check(Math.abs(H.easeTrapezoid(0.5) - 0.5) < 1e-12, 'half the time is half the way');
  // fourteen orders of magnitude and more: 7 000 km to the edge
  const d0 = 7000;
  const d1 = H.EDGE_KM;
  check(Math.log10(d1 / d0) > 14, `the climb spans ${Math.log10(d1 / d0).toFixed(1)} orders of magnitude`);
  const ratios = [];
  for (let k = 0.15; k < 0.85; k += 0.05) ratios.push(H.climbDistance(d0, d1, H.easeTrapezoid(k + 0.05)) / H.climbDistance(d0, d1, H.easeTrapezoid(k)));
  const spread = Math.max(...ratios) / Math.min(...ratios);
  check(spread < 1 + 1e-9, `in the middle of a climb equal times are equal ratios of distance (spread ${spread})`);
  check(H.climbDistance(d0, d1, 0) === d0 && Math.abs(H.climbDistance(d0, d1, 1) / d1 - 1) < 1e-12, 'a climb starts and ends where it says');
  check(Math.abs(H.climbDistance(d1, d0, 0.5) - Math.sqrt(d0 * d1)) / Math.sqrt(d0 * d1) < 1e-12, 'half way down is the geometric mean, as half way up is');
  check(H.climbMs(1e4, 1e7, 900) === 2700 && H.climbMs(1e7, 1e4, 900) === 2700, 'three decades at 900 ms a decade is 2.7 s, either way');
  check(H.climbMs(1e4, 1.1e4, 900) === 1200 && H.climbMs(1, 1e60, 900) === 24000, 'held between a floor and a ceiling');
}

// --- where the climb looks ------------------------------------------------------------------------
{
  const AU = 1.495978707e8;
  // The Earth at 30 000 km to the Sun at 40 au: the look-at point is still the Earth at the Moon's
  // distance, and the Sun by the arrival.
  check(H.targetShare(3e4, AU, 3e4, 40 * AU) === 0 && H.targetShare(40 * AU, AU, 3e4, 40 * AU) === 1, 'the look-at point starts on the near subject and ends on the far one');
  check(H.targetShare(384400, AU, 3e4, 40 * AU) === 0 && H.targetShare(1.4e6, AU, 3e4, 40 * AU) === 0 && H.targetShare(2 * AU, AU, 3e4, 40 * AU) === 0, 'it has not moved while the camera is nearer than two gaps');
  check(H.targetShare(200 * AU, AU, 3e4, 1e4 * AU) === 1 && H.targetShare(20 * AU, AU, 3e4, 1e4 * AU) > 0.4 && H.targetShare(20 * AU, AU, 3e4, 1e4 * AU) < 0.6, 'it has all moved by two hundred gaps out, and half of it half way there by ratio');
  let mono = true;
  for (let d = 3e4; d < 40 * AU; d *= 1.05) if (H.targetShare(d * 1.05, AU, 3e4, 40 * AU) < H.targetShare(d, AU, 3e4, 40 * AU)) mono = false;
  check(mono, 'and never moves back');
  // a far stop nearer than twenty gaps (the galaxy's centre, 26 000 ly off, seen from 150 000 ly)
  check(H.targetShare(150000 * LY, 26000 * LY, 12 * LY, 150000 * LY) === 1 && H.targetShare(40 * AU, AU, 3e4, 40 * AU) === 1, 'a far stop nearer than two hundred gaps still arrives looking at its subject');
  check(H.targetShare(5, 0, 1, 10) > 0 && H.targetShare(5, 0, 1, 10) < 1, 'two stops with one subject: any share, the point is the same');
}

// --- the wiring ----------------------------------------------------------------------------------
{
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(!/^import [^\n]*scene\/(climb|handoff)\.js/m.test(main), 'main.js does not import the climb statically');
  check(/import\('\.\/scene\/climb\.js'\)/.test(main), 'main.js fetches scene/climb.js when it is wanted');
  const tick = main.indexOf('ctx.climb.tick(frameMs)');
  const upd = main.indexOf('cameraRig.update(dt);');
  const rend = main.indexOf('\n    render();');
  const after = main.indexOf('ctx.climb.afterRender()');
  check(tick > 0 && tick < upd && upd < rend && rend < after, 'a climb moves the camera before the rig reads it, and the hand-off runs straight after the frame it copies');
  const climb = readFileSync(join(JS, 'scene/climb.js'), 'utf8');
  check(/prefers-reduced-motion/.test(climb) && /finish\('done'\)/.test(climb), 'less motion: a climb is one cut under one fade');
  check(/tripRunning\(\)/.test(climb) && /skyView\.active/.test(climb), 'the watcher stands down during a trip and from the ground');
}

if (problems.length) {
  console.error(`handoff: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(`handoff ok: ${H.JOINS.length} joins keep position, look-at point, distance, direction and up both ways; the chain out and back returns the pose; the zoom is by ratio over ${Math.log10(H.EDGE_KM / 7000).toFixed(1)} orders of magnitude`);

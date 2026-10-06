// tests/test_climb.mjs -- the continuous flight itself (scene/climb.js), flown frame by frame in
// node with the real stage, the real worlds and a stand-in rig. No browser: what is asserted is
// the camera's pose in kilometres and against the sky, which is what a join that nobody notices is.
//
//   - "to the edge" from 40 000 km over the Earth crosses the four joins once each, in order, and
//     ends on the Local Group's stage at the distance asked for;
//   - across EVERY frame, a hand-off's included, the camera's distance changes by a small ratio and
//     its view turns by a small angle against a fixed star: no jump in size or direction;
//   - "home" crosses them back and ends on the Earth's stage looking at the Earth;
//   - a visitor's own dolly hands over only while armed, only when the view is centred on the join's
//     anchor, never during a trip and never from the ground;
//   - the two wire spheres (scene/shells.js) have real radii and are drawn from outside only.
//
//   node tests/test_climb.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { createWorlds, positionOf } = await import(join(JS, 'scene/worlds.js'));
const { createClimb, HOME_KM } = await import(join(JS, 'scene/climb.js'));
const H = await import(join(JS, 'scene/handoff.js'));
const S = await import(join(JS, 'scene/shells.js'));

const tMs = Date.parse('2026-10-06T12:00:00Z');
const LY = 9460730472580.8;
const scene = new THREE.Scene();
const worlds = createWorlds(scene, { textureBase: null });
const camera = new THREE.PerspectiveCamera(45, 1.6, 1e-5, 1e9);

/** The rig as the climb sees it: a look-at point, and a camera that is kept pointed at it. */
function fakeRig() {
  const target = new THREE.Vector3();
  const state = { target, distance: 1, flying: false, following: false };
  let followFn = null;
  const aim = () => { camera.lookAt(target); state.distance = camera.position.distanceTo(target); };
  return {
    state,
    setTarget(v) { target.set(v.x, v.y, v.z); aim(); },
    sync: aim,
    setWorldRadius() {}, setWorldCentre() {}, stopOrbit() {},
    stopFollow() { followFn = null; state.following = false; },
    follow(fn) { followFn = fn; state.following = true; },
    flyTo() {},
    /** One frame of the real rig's follow: the look-at point moves, the offset is kept. */
    update() {
      if (!followFn) return;
      const p = followFn();
      if (!p) return;
      const off = camera.position.clone().sub(target);
      target.copy(p); camera.position.copy(p).add(off); aim();
    },
  };
}

function setup(trip = null, skyView = null) {
  stage.setWorld('earth'); stage.setTime(tMs); worlds.update(tMs);
  const rig = fakeRig();
  camera.up.set(0, 1, 0);
  camera.position.set(22, 14, 30); // 40 000 km from the Earth's centre, in the Earth stage's units
  rig.setTarget({ x: 0, y: 0, z: 0 });
  const ctx = { stage, camera, clock: { now: () => tMs }, cameraRig: rig, worlds, renderer: null, trip, skyView, layers: [], selected: () => null };
  return { ctx, rig, climb: createClimb(ctx) };
}

const starKm = { x: -3.1 * LY, y: 7.4 * LY, z: 2.2 * LY, frame: 'sun-inertial' };
function sample(rig) {
  const view = rig.state.target.clone().sub(camera.position).normalize();
  // A direction, not a place: a star at any finite distance shows parallax once the camera is light-years out.
  const star = stage.dirToScene(starKm, 'sun-inertial', new THREE.Vector3(), tMs);
  return { stage: stage.worldId, dKm: camera.position.distanceTo(rig.state.target) * stage.unitKm, toStar: view.angleTo(star) };
}

/** Fly a climb to its end; returns the frames. */
function fly(climb, rig, start) {
  const frames = [sample(rig)];
  let done = null;
  start((reason) => { done = reason; });
  for (let i = 0; i < 4000 && done === null; i++) {
    climb.tick(16.7);
    rig.update();
    worlds.update(tMs);
    climb.afterRender();
    frames.push(sample(rig));
  }
  return { frames, done };
}

function continuity(frames, what) {
  let worstRatio = 1;
  let worstTurn = 0;
  let at = '';
  for (let i = 1; i < frames.length; i++) {
    const r = frames[i].dKm / frames[i - 1].dKm;
    const ratio = Math.max(r, 1 / r);
    const turn = Math.abs(frames[i].toStar - frames[i - 1].toStar);
    if (ratio > worstRatio) { worstRatio = ratio; at = `${frames[i - 1].stage}>${frames[i].stage}`; }
    worstTurn = Math.max(worstTurn, turn);
  }
  // 900 ms a decade at 60 frames a second is a factor of 1.044 a frame at full speed.
  check(worstRatio < 1.06, `${what}: the distance never changes by more than 6 % in a frame (worst ${worstRatio.toFixed(4)} at ${at})`);
  check(worstTurn < 0.0088, `${what}: the view never turns more than half a degree in a frame against a fixed star (worst ${(worstTurn * 180 / Math.PI).toFixed(3)} degrees)`);
  return { worstRatio, worstTurn };
}
const crossings = (frames) => frames.filter((f, i) => i > 0 && f.stage !== frames[i - 1].stage).map((f, i, a) => f.stage);

// --- out to the edge ------------------------------------------------------------------------------
let outStats;
{
  const { rig, climb } = setup();
  const { frames, done } = fly(climb, rig, (cb) => climb.toEdge({ onArrive: cb }));
  check(done === 'done', `the flight to the edge arrives (${done})`);
  check(crossings(frames).join(' ') === 'sun stellar galaxy local-group', `it crosses the four joins once each, in order (${crossings(frames).join(' ')})`);
  check(climb.state.crossings === 4 && climb.state.lastJoin && climb.state.lastJoin.kept === true, 'every hand-off kept the pose');
  const last = frames[frames.length - 1];
  check(last.stage === 'local-group' && Math.abs(last.dKm / H.EDGE_KM - 1) < 1e-6, `it ends on the Local Group's stage at the edge distance (${last.stage}, ${last.dKm.toExponential(3)} km)`);
  outStats = continuity(frames, 'out');
  // the frames either side of each hand-off, on their own: same distance by ratio, same direction
  for (let i = 1; i < frames.length; i++) {
    if (frames[i].stage === frames[i - 1].stage) continue;
    const turn = Math.abs(frames[i].toStar - frames[i - 1].toStar) * 180 / Math.PI;
    check(turn < 0.5, `across ${frames[i - 1].stage} > ${frames[i].stage} the view turns ${turn.toFixed(4)} degrees: one frame of the flight, not a jump`);
  }
  // the up: the Earth stage's pole arrives tilted on the Sun's stage and is eased, never snapped
  check(camera.up.angleTo(new THREE.Vector3(0, 1, 0)) < 1e-6, 'by the end the up is the stage\'s own');
  // the look-at point has gone from the Earth to the Sun, which is the rung's origin
  check(rig.state.target.length() * stage.unitKm < 1e6, `it arrives looking at the Sun (${(rig.state.target.length() * stage.unitKm).toExponential(2)} km off)`);

  // --- and home ----------------------------------------------------------------------------------
  const back = fly(climb, rig, (cb) => climb.toHome({ onArrive: cb }));
  check(back.done === 'done', `the flight home arrives (${back.done})`);
  check(crossings(back.frames).join(' ') === 'galaxy stellar sun earth', `it crosses the joins back, in order (${crossings(back.frames).join(' ')})`);
  const end = back.frames[back.frames.length - 1];
  check(end.stage === 'earth' && Math.abs(end.dKm / HOME_KM - 1) < 1e-6, `it ends on the Earth's stage, ${HOME_KM} km out (${end.stage}, ${end.dKm.toFixed(1)} km)`);
  check(rig.state.target.length() * stage.unitKm < 5, `looking at the Earth's centre (${(rig.state.target.length() * stage.unitKm).toFixed(3)} km off)`);
  check(rig.state.following, 'and holding it, as a selection would');
  continuity(back.frames, 'home');
}

// --- less motion: one cut -------------------------------------------------------------------------
{
  const { rig, climb } = setup();
  let done = null;
  climb.to({ distanceKm: 12 * LY, stage: 'stellar', ms: 0, onArrive: (r) => { done = r; } });
  const s = sample(rig);
  check(done === 'done' && s.stage === 'stellar' && Math.abs(s.dKm / (12 * LY) - 1) < 1e-9, `a climb of no duration is one cut to the stage and distance asked for (${s.stage}, ${(s.dKm / LY).toFixed(3)} ly)`);
  check(!climb.state.active, 'and nothing is left running');
}

// --- a visitor's own dolly ------------------------------------------------------------------------
{
  const { rig, climb } = setup();
  const put = (units) => { camera.position.setLength(units); rig.sync(); };
  put(2000); // 2 million km: past the first join
  climb.afterRender();
  check(stage.worldId === 'earth', 'a camera past the join that nobody dollied there is left alone');
  climb.noteDolly();
  climb.afterRender();
  check(stage.worldId === 'sun', 'the visitor\'s own dolly past the join hands the camera to the Sun\'s stage');
  check(rig.state.following, 'and the Earth is held, so scrolling back in comes back to it');
  const e = positionOf('earth', tMs);
  const earth = stage.toScene(e, e.frame, tMs);
  check(earth.distanceTo(rig.state.target) * stage.unitKm < 1, 'the Earth is at the look-at point of the new stage');
  check(Math.abs(camera.position.distanceTo(rig.state.target) * stage.unitKm / 2e6 - 1) < 1e-9, 'two million km away, as it was');
  // between the two marks nothing happens; nearer than the way-back mark it comes home
  camera.position.copy(earth).add(new THREE.Vector3(1.1, 0.2, 0.3).setLength(1.1)); rig.sync();
  climb.noteDolly(); climb.afterRender();
  check(stage.worldId === 'sun', 'between the two marks the stage holds');
  camera.position.copy(earth).add(new THREE.Vector3(1.1, 0.2, 0.3).setLength(0.8)); rig.sync();
  climb.noteDolly(); climb.afterRender();
  check(stage.worldId === 'earth', 'nearer than the way-back mark it is the Earth\'s stage again');
}
{
  // not centred on the anchor: a selection far from the middle is left on the stage it was reached on
  const { rig, climb } = setup();
  camera.position.set(3000, 0, 0);
  rig.setTarget({ x: 1500, y: 0, z: 0 });
  climb.noteDolly(); climb.afterRender();
  check(stage.worldId === 'earth', 'a view that is not centred on the Earth is not handed on');
}
{
  const { rig, climb } = setup({ state: { phase: 'dwell' } });
  camera.position.setLength(2000); rig.sync();
  climb.noteDolly(); climb.afterRender();
  check(stage.worldId === 'earth', 'during a trip a visitor\'s dolly changes no stage');
}
{
  const { rig, climb } = setup(null, { active: true });
  camera.position.setLength(2000); rig.sync();
  climb.noteDolly(); climb.afterRender();
  check(stage.worldId === 'earth', 'nor from the ground');
}

// --- the shells -----------------------------------------------------------------------------------
{
  const r = S.radioRadiusLy(Date.parse('2026-12-12T12:00:00Z'));
  check(Math.abs(r - 125) < 0.01, `radio from Earth has had 125 years on 12 December 2026 (${r})`);
  check(S.radioRadiusLy(Date.parse('1850-01-01T00:00:00Z')) === 0, 'and none before the first signal');
  check(S.radioRadiusLy(tMs + 365.25 * 86400000) - S.radioRadiusLy(tMs) === 1, 'it grows by one light-year a year');
  check(S.CMB_RADIUS_LY === 46.5e9, 'the microwave background\'s surface is 46.5 billion light-years away');
  check(S.shellOpacity(0.5) === 0 && S.shellOpacity(1) === 0 && S.shellOpacity(1.2) === 0, 'a shell is not drawn from inside it, nor from just outside');
  check(S.shellOpacity(3) === 1 && S.shellOpacity(30) === 1, 'it is drawn whole from a few radii out');
  check(S.shellOpacity(160) === 0 && S.shellOpacity(90) > 0 && S.shellOpacity(90) < 1, 'and fades to nothing where it would be a dot');
  // the trip's two shell stops stand where their shell is drawn whole
  const { TOURS } = await import(join(JS, 'data/tours.js'));
  const tour = TOURS.find((x) => x.id === 'roof-to-the-edge');
  const radio = tour.stops.find((s) => s.id === 'radio');
  const edge = tour.stops.find((s) => s.id === 'edge');
  check(S.shellOpacity(radio.distance_km / (S.radioRadiusLy(tMs) * LY)) === 1, 'the radio stop sees the whole radio sphere');
  check(S.shellOpacity(edge.distance_km / (S.CMB_RADIUS_LY * LY)) === 1, 'the last stop sees the whole microwave-background sphere');
  check(edge.distance_km <= H.EDGE_KM, 'and the ladder\'s own "edge" flies at least as far out as the trip\'s last stop');
  // every climb stop is at a distance the chain holds its stage at, whichever way it is reached
  for (const s of tour.stops.filter((x) => x.climb)) {
    const band = H.restBand(s.stage || tour.stage);
    check(s.distance_km > band.minKm && s.distance_km < band.maxKm, `${s.id}: ${s.distance_km} km is inside the ${s.stage} stage's band`);
    check(H.stageForDistance(s.distance_km, 'earth') === (s.stage || tour.stage) && H.stageForDistance(s.distance_km, 'local-group') === (s.stage || tour.stage), `${s.id}: reached from either end, the chain is on ${s.stage}`);
  }
  check(tour.stops.filter((x) => x.climb).length === 8 && tour.stops.slice(2).every((x) => x.climb), 'from the third stop on, every stop of the trip is a climb: one take');
}

worlds.dispose();
if (problems.length) {
  console.error(`climb: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(`climb ok: Earth to the edge and back crosses four joins each way with the pose kept (worst frame: distance x${outStats.worstRatio.toFixed(3)}, view ${(outStats.worstTurn * 180 / Math.PI).toFixed(3)} degrees); a visitor's dolly hands over only when armed and centred; the shells have real radii`);

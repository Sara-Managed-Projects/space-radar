// tests/test_flight_size.mjs -- on the way to it, a model is the size it will be on arrival (internal #340),
// and a drawn model is one pick target as big as it looks (internal #341).
//   node tests/test_flight_size.mjs
//
// The owner, 2026-11-16: "When Play on its own goes from a deep-space object to a rover on the Moon, the rover
// is zoomed in from the beginning and flies with the camera until the Moon." What is held here, with the real
// camera rig (scene/camera.js) and the real hero layer (scene/heroes.js), no GPU:
//   1. the rule itself (flightShare, easedPixels, modelShareByPixels): pure;
//   2. a flight to a thing standing on the Moon and one to Voyager 1, each from the home view: the model's
//      size on screen frame by frame is small at the start, never above its arrival size, rises with the
//      approach and is the selected size when the camera stops; its dot is not taken away while it is tiny;
//   3. with no flight (a cut, and a hand on the wheel after arrival) the selected size is what it was;
//   4. the model at its selected size is hit by a pointer on its outline as on its middle (heroes.pickAll).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

globalThis.window = { dispatchEvent() {}, addEventListener() {} };
globalThis.CustomEvent = class CustomEvent { constructor(t, o = {}) { this.type = t; this.detail = o.detail; } };
globalThis.ProgressEvent = class ProgressEvent { constructor(t, o = {}) { this.type = t; Object.assign(this, o); } };
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  const s = typeof u === 'string' ? u : (u && u.url) || String(u);
  if (s.startsWith('file:')) {
    try { return new Response(readFileSync(fileURLToPath(s)), { status: 200 }); } catch { return new Response('', { status: 404 }); }
  }
  return realFetch(u, o);
};

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { createHeroes, warmModels, flightShare, easedPixels, modelShareByPixels, SELECTED_PX } = await import(join(JS, 'scene/heroes.js'));
const { createCameraRig } = await import(join(JS, 'scene/camera.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { sampleOddities, sampleDeepSpace } = await import(join(JS, 'data/sample.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));

const notes = [];
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// 1. The rule.
check(flightShare(400, 1) === 1 / 400 && flightShare(2, 1) === 0.5 && flightShare(1, 1) === 1, 'the share is the arrival distance over the distance now');
check(flightShare(0.5, 1) === 1, 'a flight that backs away leaves the size alone');
check(flightShare(400, NaN) === 1 && flightShare(400, undefined) === 1 && flightShare(0, 1) === 1 && flightShare(NaN, 1) === 1, 'no flight, or no distance: the size as it was');
check(easedPixels(0, 37, 16) === 37 && easedPixels(undefined, 37, 16) === 37, 'a model drawn for the first time takes its size at once');
{
  let px = 84; const seen = [];
  for (let i = 0; i < 90; i++) { px = easedPixels(px, 260, 16); seen.push(px); }
  check(seen[0] > 84 && seen[0] < 120 && seen.every((v, i) => i === 0 || v >= seen[i - 1]) && px === 260, `a change of size is eased, not a jump, and gets there (${seen[0].toFixed(1)} first, ${px} after 90 frames)`);
  check(easedPixels(260, 84, 16) < 260 && easedPixels(260, 84, 1e6) > 84, 'down as well as up, and one long frame is not the whole way');
}
check(modelShareByPixels(3) === 0 && modelShareByPixels(6) === 0 && modelShareByPixels(14) === 1 && modelShareByPixels(260) === 1 && modelShareByPixels(10) === 0.5 && modelShareByPixels(undefined) === 0, 'a model smaller than a dot leaves the dot; from 14 px the model alone');

// 2 to 4. The real rig and the real hero layer.
stage.setWorld('earth');
const tMs = Date.parse('2026-11-16T12:00:00Z');
stage.setTime(tMs);
const recs = [...sampleOddities(), ...sampleDeepSpace()];
const W = 1440, H = 900;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, W / H, 1e-6, 1e12);
camera.up.set(0, 0, 1);
camera.position.set(0, -28, 6);
const rig = createCameraRig(camera, null);
rig.setWorldCentre({ x: 0, y: 0, z: 0 });
rig.setWorldRadius(6.371);
let selected = null;
const ctx = {
  camera, cameraRig: rig,
  layers: LAYERS.filter((l) => l.id === 'oddities' || l.id === 'deep-space'),
  isLayerOn: () => true,
  recordsFor: (id) => recs.filter((r) => r.layer === id),
  selected: () => selected,
  worlds: null,
  renderer: { domElement: { clientHeight: H } },
};
const heroes = createHeroes(scene, ctx);
await warmModels();
const posOf = (rec) => { const p = propagate(rec, tMs); return stage.toScene(p, p.frame, tMs); };
const frame = (ms = 16) => { rig.update(ms / 1000, ms); camera.updateMatrixWorld(); camera.updateProjectionMatrix(); heroes.update(tMs, { frameMs: ms }); };
const home = () => { selected = null; rig.stopFollow(); rig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: 28, azimuth: 0.4, polar: 1.2, ms: 0 }); for (let i = 0; i < 3; i++) frame(); };

function fly(id, arrivalKm, ms) {
  const rec = recs.find((r) => r.id === id);
  check(!!rec, `${id} is not a record`);
  if (!rec) return null;
  home();
  const pos = posOf(rec);
  const far = camera.position.distanceTo(pos);
  // As main.js select() does it: the selection first, then the flight, in one tick.
  selected = rec;
  rig.flyTo({ targetScene: pos, distance: arrivalKm / stage.unitKm, ms, ease: 'cruise' });
  rig.follow(() => posOf(rec));
  const rows = [];
  for (let i = 0; i < 4000 && rig.state.flying; i++) {
    frame();
    rows.push({ k: rig.flightProgress(), d: camera.position.distanceTo(pos), px: heroes.drawnPx(id), dot: heroes.drawnOpacity(id) });
  }
  for (let i = 0; i < 60; i++) frame();
  return { rec, pos, far, rows, arrival: { d: camera.position.distanceTo(pos), px: heroes.drawnPx(id), dot: heroes.drawnOpacity(id) } };
}

for (const [id, arrivalKm, what] of [['duke-family-photo', 0.05 * 1000, 'a thing standing on the Moon'], ['deep-voyager-1', 2000, 'Voyager 1']]) {
  const f = fly(id, arrivalKm, 6000);
  if (!f) continue;
  const drawn = f.rows.filter((q) => q.px > 0);
  check(f.rows.length > 100 && drawn.length > 50, `${what}: the flight was flown and the model drawn on the way (${f.rows.length} frames, ${drawn.length} with the model)`);
  check(f.far / f.arrival.d > 100, `${what}: the flight starts far from where it ends (${(f.far / f.arrival.d).toFixed(0)} times)`);
  // drawnPx is the model's whole circle: twice its reach (up to 1.15) times the pixel budget (260, by up to 1.45 for a big thing).
  check(f.arrival.px > 150 && f.arrival.px <= SELECTED_PX * 1.45 * 2.3, `${what}: on arrival the model is its selected size (${f.arrival.px.toFixed(0)} px across)`);
  const first = drawn[0];
  check(first.px < 0.05 * f.arrival.px, `${what}: at the start of the flight the model is a speck, not its arrival size (${first.px.toFixed(2)} px of ${f.arrival.px.toFixed(0)})`);
  check(drawn.every((q) => q.px <= f.arrival.px * 1.02), `${what}: never bigger on the way than on arrival (max ${Math.max(...drawn.map((q) => q.px)).toFixed(0)} px)`);
  // The size follows the real distance: at every frame at most what the arrival size would be from there, give or take the easing.
  const follows = drawn.filter((q) => q.px > f.arrival.px * (f.arrival.d / q.d) * 1.25 + 1);
  check(follows.length === 0, `${what}: ${follows.length} frames drew the model bigger than its arrival size seen from that distance`);
  const half = drawn.find((q) => q.k >= 0.5), late = drawn.find((q) => q.k >= 0.9);
  check(half && late && half.px < late.px && late.px < f.arrival.px * 1.02 && first.px < half.px, `${what}: the size rises with the approach (${first.px.toFixed(2)}, ${half && half.px.toFixed(1)}, ${late && late.px.toFixed(1)}, ${f.arrival.px.toFixed(0)} px)`);
  // While it is a speck the dot is not taken away; on arrival the model alone.
  check(first.dot === 0 && f.arrival.dot === 1, `${what}: the dot stays while the model is a speck (${first.dot}) and yields on arrival (${f.arrival.dot})`);

  // 3. After arrival a hand on the wheel keeps the selected size, as before: no flight, no share.
  rig.nudge(0, 0, Math.log(3), 0, 'wheel');
  for (let i = 0; i < 90; i++) frame();
  const wheeled = heroes.drawnPx(id);
  check(!rig.state.flying && camera.position.distanceTo(f.pos) > f.arrival.d * 1.5 && Math.abs(wheeled - f.arrival.px) < 0.02 * f.arrival.px, `${what}: zoomed out by hand the selection keeps its size (${wheeled.toFixed(0)} px at ${(camera.position.distanceTo(f.pos) / f.arrival.d).toFixed(1)} times the distance)`);

  // 4. The model at its selected size is one target: its middle, a point well off the middle on its outline, and not the sky beside it.
  rig.flyTo({ targetScene: f.pos, distance: f.arrival.d, ms: 0 });
  for (let i = 0; i < 30; i++) frame();
  const vp = { w: W, h: H };
  const mid = f.pos.clone().project(camera);
  const at = (dxPx, dyPx) => heroes.pickAll(mid.x + dxPx / (W / 2), mid.y + dyPx / (H / 2), camera, vp, 10).find((c) => c.record.id === id);
  const centre = at(0, 0);
  check(centre && centre.kind === 'model' && centre.px === 0 && centre.r > 60 && Math.abs(centre.sx - (mid.x + 1) * W / 2) < 1e-6, `${what}: the middle of the model is the model (${JSON.stringify(centre && { px: centre.px, r: centre.r })})`);
  // Walk out from the middle along eight directions: the model answers well past a mouse's 10 px, and stops answering outside its circle.
  let farthest = 0;
  for (let a = 0; a < 8; a++) for (let r = 0; r <= 400; r += 4) { const c = at(Math.cos(a * Math.PI / 4) * r, Math.sin(a * Math.PI / 4) * r); if (c && c.px === 0) farthest = Math.max(farthest, r); }
  check(farthest >= 40, `${what}: the model is hit ${farthest} px from its middle (a centre point answered within 10)`);
  notes.push(`${what}: ${first.px.toFixed(2)} px at the start (${(f.far / f.arrival.d).toFixed(0)} arrival distances away), ${half ? half.px.toFixed(1) : '?'} px half way, ${late ? late.px.toFixed(0) : '?'} px at nine tenths, ${f.arrival.px.toFixed(0)} px on arrival; hit up to ${farthest} px from its middle`);
  check(!at(centre ? centre.r + 30 : 400, 0) && !at(0, centre ? centre.r + 30 : 400), `${what}: the sky beside the model is not the model`);
}

// A cut (reduced motion, ms: 0) has no flight: the model is the selected size at once.
{
  const rec = recs.find((r) => r.id === 'deep-voyager-1');
  home();
  selected = rec;
  rig.flyTo({ targetScene: posOf(rec), distance: 2000 / stage.unitKm, ms: 0 });
  for (let i = 0; i < 3; i++) frame();
  check(!rig.state.flying && rig.arrivalPosition() === null && heroes.drawnPx(rec.id) > 150, `a cut draws the model at its selected size at once (${heroes.drawnPx(rec.id).toFixed(0)} px)`);
}
// The rig says where a flight ends.
{
  home();
  rig.flyTo({ targetScene: { x: 100, y: 50, z: 20 }, distance: 3, azimuth: 1, polar: 1.1, ms: 2000 });
  const end = rig.arrivalPosition();
  check(end && Math.abs(end.distanceTo(new THREE.Vector3(100, 50, 20)) - 3) < 1e-9, 'the rig says where the camera will stand: the arrival distance from the target');
  for (let i = 0; i < 400 && rig.state.flying; i++) frame();
  check(end && camera.position.distanceTo(end) < 1e-6 && rig.arrivalPosition() === null, `the camera ends where the rig said (${end && camera.position.distanceTo(end).toExponential(1)} off), and then there is no flight`);
}

heroes.dispose();
if (problems.length) { console.error('flight size FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('flight size ok: the share of a flight, eased; a lander on the Moon and Voyager 1 grow with the approach and arrive at the selected size; a cut and a hand on the wheel are as before; a model is hit on its outline\n  ' + notes.join('\n  '));

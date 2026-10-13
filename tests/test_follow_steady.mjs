// tests/test_follow_steady.mjs -- a selected object stands still on the screen.
//
//   node tests/test_follow_steady.mjs
//
// Ivan, 2026-10-14: "Sometimes when an object is selected it is shaking on the screen." Four things
// were placed at four different moments, or in the wrong arithmetic, and each one is played here
// over 180 frames of uneven length with the app's own glyph layer, camera rig, stage and SGP4:
//
//   1. THE DOT. At the live clock main.js places the dots ten times a second; the camera that
//      follows the selection and the brackets round it are placed every frame. Between two ticks
//      the dot stayed and then jumped (scene/glyphs.js updateSelected places it every frame now).
//   2. THE CLOCK. The live clock is the wall clock: the follow read it at the top of a frame, the
//      brackets after the frame was drawn, a render later (main.js positionOfRecord answers for
//      the frame's one instant now).
//   3. A WORLD. A followed planet's disc is placed by worlds.update(), after the rig's update(), so
//      the camera aimed at where it was a frame ago (scene/camera.js refollow).
//   4. THE STAGE. From the ground, on the Sun's stage, the eye is 150 units from the origin and
//      float32 steps are 15 km (main.js enterGround puts the ground on the Earth's stage).
//
// Each part first REPRODUCES the fault with the old order of things, in pixels, then holds the new
// order to a quarter of a pixel. A change that brings a fault back fails with the number.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { createGlyphLayer } = await import(join(JS, 'scene/glyphs.js'));
const { createCameraRig } = await import(join(JS, 'scene/camera.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { FOV } = await import(join(JS, 'sky/skymath.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const W = 1440;
const H = 900;
const T0 = Date.UTC(2026, 9, 14, 20, 0, 0);
const FRAMES = 180;
const STEADY_PX = 0.25;

const omm = (id, meanMotion, incl) => ({
  id, name: id, klass: 'satellite', layer: 'test', propagator: 'sgp4', frame: 'earth-inertial',
  omm: {
    OBJECT_NAME: id, OBJECT_ID: '2020-001A', EPOCH: new Date(T0 - 7 * 3600e3).toISOString().slice(0, 23),
    MEAN_MOTION: meanMotion, ECCENTRICITY: 0.0004, INCLINATION: incl, RA_OF_ASC_NODE: 80, ARG_OF_PERICENTER: 120, MEAN_ANOMALY: 200,
    EPHEMERIS_TYPE: 0, CLASSIFICATION_TYPE: 'U', NORAD_CAT_ID: 90001, ELEMENT_SET_NO: 999, REV_AT_EPOCH: 100, BSTAR: 0, MEAN_MOTION_DOT: 0, MEAN_MOTION_DDOT: 0,
  },
});
const LOW = omm('low', 15.5, 51.6);      // 420 km up, 7.7 km/s
const GEO = omm('geo', 1.00271, 0.05);   // 35 786 km up, a lap a day

/** A frame's length, uneven the way real frames are: 12 to 22 ms, the same sequence every run. */
let seed = 7;
const frameMs = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return 12 + (seed % 1000) / 100; };
const sceneAt = (rec, t) => { const p = propagate(rec, t); return stage.toScene(p, p.frame, t); };
/** What the GPU does with a matrix: float32. */
const f32 = (m) => { const o = new THREE.Matrix4(); o.elements = Array.from(new Float32Array(m.elements)); return o; };
const toPx = (v) => ({ x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H });
/** Where the GPU draws a float32 position, and where the brackets' float64 arithmetic puts one. */
const drawnPx = (cam, xyz) => toPx(new THREE.Vector3(xyz[0], xyz[1], xyz[2]).applyMatrix4(f32(cam.matrixWorldInverse)).applyMatrix4(f32(cam.projectionMatrix)));
const exactPx = (cam, v) => toPx(v.clone().applyMatrix4(cam.matrixWorldInverse).applyMatrix4(cam.projectionMatrix));
const spread = (pts) => Math.hypot(Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y)));
const worstGap = (a, b) => Math.max(...a.map((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y)));

function layerWith(rec) {
  const layer = createGlyphLayer({ add() {}, remove() {} }, { id: 'test', klass: 'satellite', frame: 'earth-inertial' });
  layer.setRecords([rec]);
  layer.mesh.visible = true;
  layer.setSelected(rec.id);
  return layer;
}

// --- 1 and 2. the camera follows a craft in the space view ---------------------------------------
/**
 * `everyFrame`: the selection's dot is placed between ticks too. `oneInstant`: the follow and the
 * brackets answer for the frame's instant; otherwise the follow reads the clock a millisecond into
 * the frame and the brackets after an 8 to 40 ms render, as the wall clock gave them.
 */
function followInSpace(rec, distanceKm, { everyFrame, oneInstant }) {
  stage.setWorld('earth');
  seed = 7;
  const cam = new THREE.PerspectiveCamera(45, W / H, 1e-5, 1e9);
  cam.up.set(0, 0, 1);
  cam.position.set(0, 0, 30);
  const rig = createCameraRig(cam, null);
  rig.setWorldCentre({ x: 0, y: 0, z: 0 });
  rig.setWorldRadius(6.371);
  const layer = layerWith(rec);
  let t = T0;
  stage.setTime(t);
  rig.flyTo({ targetScene: sceneAt(rec, t), distance: distanceKm / stage.unitKm, ms: 0 });
  rig.follow(() => sceneAt(rec, oneInstant ? t : t + 1));
  let sinceTick = Infinity;
  const dot = [];
  const brackets = [];
  for (let i = 0; i < FRAMES; i++) {
    const dt = frameMs();
    t += dt;
    stage.setTime(t);
    rig.update(dt, dt);
    sinceTick += dt;
    if (sinceTick >= 100) { sinceTick = 0; layer.update(t, cam); } else if (everyFrame) layer.updateSelected(t);
    cam.updateMatrixWorld(true);
    const at = layer.selectedOffset();
    if (!at) { problems.push(`${rec.id}: the layer has no drawn place for its selection on frame ${i}`); return null; }
    dot.push(drawnPx(cam, at));
    brackets.push(exactPx(cam, sceneAt(rec, oneInstant ? t : t + 8 + (i % 5) * 8)));
  }
  layer.dispose();
  return { dot: spread(dot), gap: worstGap(dot, brackets) };
}

for (const [rec, km, name] of [[LOW, 700, 'a low craft from 700 km'], [LOW, 60, 'a low craft from 60 km'], [GEO, 700, 'a geostationary craft from 700 km'], [GEO, 60, 'a geostationary craft from 60 km']]) {
  const now = followInSpace(rec, km, { everyFrame: true, oneInstant: true });
  if (!now) continue;
  check(now.dot < STEADY_PX, `${name}, followed: its dot wanders ${now.dot.toFixed(2)} px over ${FRAMES} frames (under ${STEADY_PX})`);
  check(now.gap < STEADY_PX, `${name}, followed: the brackets are ${now.gap.toFixed(2)} px off the dot at worst (under ${STEADY_PX})`);
}
{
  const old = followInSpace(LOW, 60, { everyFrame: false, oneInstant: false });
  check(old && old.dot > 3, `the reproduction: with the dot placed only ten times a second a low craft followed from 60 km must shake by pixels (${old && old.dot.toFixed(2)} px)`);
  check(old && old.gap > 3, `the reproduction: with the clock read again after the render the brackets must stand off the dot (${old && old.gap.toFixed(2)} px)`);
  const ticked = followInSpace(GEO, 60, { everyFrame: false, oneInstant: true });
  check(ticked && ticked.dot > 1, `the reproduction: a geostationary dot placed ten times a second, followed from 60 km (${ticked && ticked.dot.toFixed(2)} px)`);
  const clocked = followInSpace(LOW, 700, { everyFrame: true, oneInstant: false });
  check(clocked && clocked.gap > 0.25, `the reproduction: from the arrival's own 700 km the later clock alone moves the brackets (${clocked && clocked.gap.toFixed(2)} px)`);
}

// --- 4 (and 1 again). from the ground, a geostationary craft in a telescope's field ---------------
/** The eye on the ground at 55.75 N 37.6 E, turning with the Earth, looking where the craft stands. */
function fromTheGround(stageId, { everyFrame }) {
  stage.setWorld(stageId);
  seed = 7;
  const cam = new THREE.PerspectiveCamera(FOV.telescope, W / H, 1e-7, 1e12);
  const layer = layerWith(GEO);
  const lat = 55.75 * Math.PI / 180;
  // A longitude under the craft: found once, so the craft is well above this place's horizon.
  let t = T0;
  stage.setTime(t);
  const eyeEcef = (lon) => ({ x: 6371 * Math.cos(lat) * Math.cos(lon), y: 6371 * Math.cos(lat) * Math.sin(lon), z: 6371 * Math.sin(lat) });
  let lon = 0;
  let best = -Infinity;
  for (let d = 0; d < 360; d += 5) {
    const o = stage.toScene(eyeEcef(d * Math.PI / 180), 'earth-fixed', t);
    const origin = stage.toScene({ x: 0, y: 0, z: 0 }, 'earth-fixed', t);
    const up = o.clone().sub(origin).normalize();
    const alt = sceneAt(GEO, t).sub(o).normalize().dot(up);
    if (alt > best) { best = alt; lon = d * Math.PI / 180; }
  }
  // The direction of the look is fixed to the ground: the craft's own direction at the start, kept
  // in the ground's turning frame by three points on the ground (as sky/skyview.js measureFrame).
  const frame = () => {
    const o = stage.toScene(eyeEcef(lon), 'earth-fixed', t);
    const e = stage.toScene({ x: eyeEcef(lon).x - Math.sin(lon), y: eyeEcef(lon).y + Math.cos(lon), z: eyeEcef(lon).z }, 'earth-fixed', t).sub(o).normalize();
    const c = stage.toScene({ x: 0, y: 0, z: 0 }, 'earth-fixed', t);
    const u = o.clone().sub(c).normalize();
    const n = new THREE.Vector3().crossVectors(u, e).normalize();
    return { o, e, n, u };
  };
  const f0 = frame();
  const d0 = sceneAt(GEO, t).sub(f0.o).normalize();
  const local = [d0.dot(f0.e), d0.dot(f0.n), d0.dot(f0.u)];
  let sinceTick = Infinity;
  const dot = [];
  const brackets = [];
  for (let i = 0; i < FRAMES; i++) {
    const dt = frameMs();
    t += dt;
    stage.setTime(t);
    if (sinceTick + dt >= 100) { sinceTick = 0; layer.update(t, cam); } else { sinceTick += dt; if (everyFrame) layer.updateSelected(t); }
    const f = frame();
    cam.position.copy(f.o);
    cam.up.copy(f.u);
    cam.lookAt(f.o.clone().addScaledVector(f.e, local[0]).addScaledVector(f.n, local[1]).addScaledVector(f.u, local[2]));
    cam.updateMatrixWorld(true);
    const at = layer.selectedOffset();
    if (!at) { problems.push(`from the ground on ${stageId}: no drawn place on frame ${i}`); break; }
    dot.push(drawnPx(cam, at));
    brackets.push(exactPx(cam, sceneAt(GEO, t)));
  }
  layer.dispose();
  stage.setWorld('earth');
  return { dot: spread(dot), gap: worstGap(dot, brackets), up: best };
}
{
  const earth = fromTheGround('earth', { everyFrame: true });
  check(earth.up > 0.1, `the craft is above this place's horizon (sin of its altitude ${earth.up.toFixed(2)})`);
  check(earth.dot < STEADY_PX && earth.gap < STEADY_PX, `from the ground on the Earth's stage, a ${FOV.telescope} degree field: the geostationary dot wanders ${earth.dot.toFixed(2)} px and the brackets are ${earth.gap.toFixed(2)} px off it (each under ${STEADY_PX})`);
  const ticked = fromTheGround('earth', { everyFrame: false });
  check(ticked.gap > STEADY_PX, `the reproduction: placed ten times a second the Earth turns under the dot between ticks (${ticked.gap.toFixed(2)} px off the brackets)`);
  const sun = fromTheGround('sun', { everyFrame: true });
  check(sun.gap > 5, `the reproduction: on the Sun's stage the eye is 150 units out and float32 steps are 15 km, so the dot must stand pixels off the brackets (${sun.gap.toFixed(1)} px)`);
  check(sun.dot > 5, `and move by pixels from tick to tick (${sun.dot.toFixed(1)} px)`);
}

// --- 3. a followed world, placed after the rig's update -------------------------------------------
/** The Moon's speed at an hour a second: 3 670 km a second across a view 6 000 km away. */
function followAWorld(refollow) {
  seed = 7;
  const cam = new THREE.PerspectiveCamera(45, W / H, 1e-5, 1e9);
  cam.up.set(0, 0, 1);
  cam.position.set(0, 0, 30);
  const rig = createCameraRig(cam, null);
  const disc = new THREE.Vector3();
  const place = (ms) => disc.set(384.4 * Math.cos(ms * 9.6e-6), 384.4 * Math.sin(ms * 9.6e-6), 0);
  let t = 0;
  place(t);
  rig.flyTo({ targetScene: disc, distance: 6.08, ms: 0 });
  rig.follow(() => disc);
  const at = [];
  for (let i = 0; i < FRAMES; i++) {
    const dt = frameMs();
    t += dt;
    rig.update(dt, dt);   // the rig first, as in main.js's frame
    place(t);             // then worlds.update() puts the disc where it is on this frame
    if (refollow) rig.refollow();
    cam.updateMatrixWorld(true);
    at.push(exactPx(cam, disc));
  }
  return { spread: spread(at), off: Math.max(...at.map((p) => Math.hypot(p.x - W / 2, p.y - H / 2))) };
}
{
  const now = followAWorld(true);
  check(now.spread < STEADY_PX && now.off < STEADY_PX, `a followed world at an hour a second: ${now.off.toFixed(2)} px off the middle, wandering ${now.spread.toFixed(2)} px (each under ${STEADY_PX})`);
  const old = followAWorld(false);
  check(old.off > 5 && old.spread > 1, `the reproduction: aimed before the world is placed, it must stand off the middle and wander with the frames' lengths (${old.off.toFixed(1)} px off, ${old.spread.toFixed(1)} px)`);
}

// --- the wiring in main.js, which no node test can run -------------------------------------------
{
  const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^(\s*)\/\/.*$/gm, '$1');
  const main = code(readFileSync(join(JS, 'main.js'), 'utf8'));
  check(/const tMs = clock\.mode === 'live' && Number\.isFinite\(ctx\.frameT\) \? ctx\.frameT : clock\.now\(\);\s*const p = propagate\(record, tMs\);\s*if \(!p\) return null;\s*return stage\.toScene\(p, p\.frame, tMs\);/.test(main), 'positionOfRecord answers for the frame\'s one instant while a frame is being made');
  const loop = main.slice(main.indexOf('function frame(nowReal)'));
  const order = ['stage.setTime(t);', 'ctx.frameT = t;', 'cameraRig.update(dt, frameMs);', 'worlds.update(t);', 'cameraRig.refollow();', 'gl.updateSelected(t)', 'render();', 'ctx.hud.frame(t);', 'ctx.frameT = null;'].map((s) => loop.indexOf(s));
  check(order.every((n) => n >= 0) && order.every((n, i) => i === 0 || n > order[i - 1]), `the frame: one instant set first, the rig, the worlds, the rig's aim again, the selection's dot, the picture, the brackets, then the instant let go (${order.join(', ')})`);
  check(/\} else if \(ctx\.selected\(\)\) \{\s*for \(const gl of glyphLayers\.values\(\)\) if \(gl\.updateSelected\) gl\.updateSelected\(t\);/.test(loop), 'between two ticks the selection\'s dot is placed in whichever layer holds it');
  check(/function enterGround\(\) \{\s*if \(stage\.worldId !== 'earth' && typeof ctx\.setStage === 'function' && !tripOnScreen\(\)\) ctx\.setStage\('earth'\);\s*return ctx\.skyView\.enter\(observer\);/.test(main), 'the ground is entered on the Earth\'s stage');
  check(!/ctx\.skyView\.enter\(observer\)/.test(main.replace(/function enterGround\(\) \{[\s\S]*?\n {2}\}/, '')), 'and by that one door: nothing else in main.js enters the sky view');
}

if (problems.length) { console.error('follow steady FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`follow steady ok: over ${FRAMES} uneven frames a followed low craft, a geostationary one and a world stay within ${STEADY_PX} px with their brackets on them, in space and from the ground through a telescope's field; each of the four faults is reproduced in pixels with the old order of things`);

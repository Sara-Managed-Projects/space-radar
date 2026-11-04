// tests/test_deep_reduced_motion.mjs -- the deep sky with prefers-reduced-motion on (internal #836).
//
// "No gas motion or camera autoplay when reduced-motion on." The pattern of tests/test_reduced_motion_trips.mjs,
// for the deep-space layer:
//   1. GAS: the real coordinator (scene/deep/deepsky.js) runs the real Helix hero and an LMC holder (scene/deep/
//      gasmat.js) for ten simulated minutes at a 1 s frame, once with the preference off (the control: the
//      gas's time uniform must move, or this test could not see motion) and once with it on (it must not
//      move at all, however long the visitor stays). Both are read off the scene graph, not off the modules.
//   2. EVERY GAS CLOCK: any file in scene/deep/ that has a time uniform (`uTime`) also reads `reduced`, so a
//      hero added later cannot move gas under the preference without this test failing.
//   3. CAMERA AUTOPLAY: the rig's constant drift (orbit) refuses under the preference, and tells its caller
//      'reduced-motion' (never 'done'); a flight is an instant set. With the preference off the same orbit starts.
// The browser side (the CSS, and the probe scene `deepspace` at 1600 and 390 px) is looked at, not run here.
// Run: node tests/test_deep_reduced_motion.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// The preference is read from matchMedia each time the rig or a hero asks; a flag the test turns.
let reduce = false;
const mq = () => ({ matches: reduce, addEventListener() {}, removeEventListener() {} });
globalThis.matchMedia = mq;

// The catalogue layers fetch their files from a site this test does not serve; they say so, once each, and that is not under test.
const realWarn = console.warn.bind(console);
console.warn = (...a) => { if (!/^deep: .* did not load/.test(String(a[0]))) realWarn(...a); };

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { createDeepSky } = await import(join(JS, 'scene/deep/deepsky.js'));
const { createCameraRig } = await import(join(JS, 'scene/camera.js'));
const LY_KM = 9460730472580.8;

const records = parseDso(JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')));
const byId = new Map(records.map((r) => [r.id, r]));
const helix = byId.get('dso-helix-nebula');
const lmc = byId.get('dso-lmc');

// 1. The gas, with the preference off and on.
async function gasTimes(reducedOn) {
  reduce = reducedOn;
  stage.setWorld('stellar');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 1e-5, 1e9);
  const renderer = { domElement: { clientHeight: 900 } };
  const profile = { id: 'helix', shipped: true, drawn: ['reconstruction'], layers: [{ kind: 'gas', what: 'shell', profile: 5 }] };
  const heroes = [{ id: 'helix', record: 'dso-helix-nebula', stage: 'b', profile: async () => ({ HERO: profile }), build: async () => import(join(JS, 'scene/deep/helix.js')) }];
  const deep = createDeepSky(THREE, {
    scene, heroes, records: () => records, recordById: (id) => byId.get(id), pictureShare: () => 0, picturesBusy: () => false,
    selectedId: () => null, subjectId: () => null, quality: () => ({ tier: 1, top: false, latched: false, scaleStep: 0 }),
    look: () => 'film', reduced: () => reducedOn, frozen: () => false,
  });
  await deep.whenReady(2000);
  const place = (rec, distLy) => {
    const p = new THREE.Vector3(); stage.toSceneInto(rec.pos, 'sun-inertial', p, stage.tMs);
    camera.position.copy(p).add(p.clone().normalize().multiplyScalar(-distLy * LY_KM / stage.unitKm));
    camera.lookAt(p); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  };
  const times = () => { const out = []; deep.group.traverse((o) => { const u = o.material && o.material.uniforms; if (u && u.uTime) out.push(u.uTime.value); }); return out; };
  let now = 0;
  const run = async (rec, distLy) => {
    place(rec, distLy);
    deep.frame({ camera, renderer, nowMs: now += 100, dtMs: 100, visible: true });
    await deep.whenReady(2000);
    for (let i = 0; i < 600; i += 1) deep.frame({ camera, renderer, nowMs: now += 1000, dtMs: 1000, visible: true }); // ten minutes
    return times();
  };
  const atHelix = await run(helix, 10);
  const atLmc = await run(lmc, -2000);
  const drawn = deep.stats();
  deep.dispose();
  return { atHelix, atLmc, hero: drawn.heroes.some((h) => h.loaded), holders: drawn.holders.length };
}
const live = await gasTimes(false);
const still = await gasTimes(true);
check(live.atHelix.length > 0 && live.atHelix.some((t) => t > 0), `control: with the preference off the Helix's gas clock moves over ten minutes (${live.atHelix.map((t) => t.toFixed(4)).join(', ')})`);
check(live.atLmc.length > live.atHelix.length || live.atLmc.some((t) => t > 0), 'control: and the scene holds a clock for the LMC holder to read');
check(still.atHelix.length > 0 && still.atHelix.every((t) => t === 0), `with the preference on the Helix's gas clock is still 0 after ten minutes (${still.atHelix.join(', ')})`);
check(still.atLmc.length > 0 && still.atLmc.every((t) => t === 0), `and so is every clock with the LMC's holder drawn (${still.atLmc.join(', ')})`);

// 2. Every gas clock in the folder reads the preference.
const DEEP = join(JS, 'scene/deep');
const withClock = readdirSync(DEEP).filter((f) => f.endsWith('.js') && /\buTime\b/.test(readFileSync(join(DEEP, f), 'utf8')));
check(withClock.includes('gasmat.js') && withClock.includes('helix.js'), `the files with a time uniform are found (${withClock.join(', ')})`);
for (const f of withClock) {
  const src = readFileSync(join(DEEP, f), 'utf8');
  check(/\breduced\b/.test(src), `scene/deep/${f} has a time uniform and reads \`reduced\``);
}
// And the coordinator hands the preference to both a hero's frame and a holder's look, every frame.
const coord = readFileSync(join(DEEP, 'deepsky.js'), 'utf8');
check(/const reduced = env\.reduced \? env\.reduced\(\) : false;/.test(coord), 'the coordinator asks main.js for the preference once a frame');
check(/h\.hero\.frame\(\{[^}]*\breduced\b/.test(coord) && /h\.v\.setLook\(look, \{ reduced,/.test(coord), 'and gives it to a hero\'s frame and to a holder\'s look');
const mainSrc = readFileSync(join(JS, 'main.js'), 'utf8');
check(/reduced: \(\) => [^,\n]*(matchMedia|reduced)/i.test(mainSrc), 'main.js answers it from the media query, not from a constant');

// 3. The camera does not play by itself.
function rigOrbit(reducedOn) {
  reduce = reducedOn;
  const camera = new THREE.PerspectiveCamera(45, 1.6, 1e-5, 1e9);
  camera.position.set(0, 0, 22);
  const rig = createCameraRig(camera, null, { worldRadius: 6.371 });
  const done = [];
  const started = rig.orbit({ deg: 90, degPerSec: 6, onDone: (r) => done.push(r) });
  const before = camera.position.clone();
  for (let i = 0; i < 300; i += 1) rig.update(1 / 30); // ten seconds
  return { started, done, moved: camera.position.distanceTo(before) };
}
const off = rigOrbit(false);
const on = rigOrbit(true);
check(off.started === true && off.moved > 0.1, `control: with the preference off the drift starts and the camera turns (moved ${off.moved.toFixed(2)})`);
check(on.started === false && on.moved < 1e-9, `with the preference on the drift does not start and the camera stays where it was (moved ${on.moved})`);
check(on.done.length === 1 && on.done[0] === 'reduced-motion', `and its caller is told so (${JSON.stringify(on.done)})`);

if (problems.length) { console.error('deep reduced motion FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('deep reduced motion ok: the gas clocks stand still for ten minutes under the preference and run without it; every clock in scene/deep reads it; the camera\'s drift refuses');

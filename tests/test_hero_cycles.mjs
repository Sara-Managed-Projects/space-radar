// tests/test_hero_cycles.mjs -- the deep sky's heroes give their memory back: ten visits and ten departures
// each (internal #834, the package's DS-E03: "GPU memory returns within budget after 10 visit/depart cycles").
//   node tests/test_hero_cycles.mjs
//
// Every hero on scene/deep/heroes.js that ships is visited ten times through the real coordinator
// (scene/deep/deepsky.js): the camera stands near it until its module is built and drawing at level 2 or more,
// then goes away (50 000 ly, or 400 times its size) for ten frames and twelve seconds, which is longer than the ten
// seconds after which a hero at level 0 is disposed. What is held is what the scene graph holds, counted by what the renderer would
// keep: a geometry, a material or a texture is live from the first frame it is found in the graph until it
// fires `dispose` (three's WebGLGeometries, WebGLMaterials and WebGLTextures forget it then). scene/perf.js
// sceneBytes() gives the same graph in MiB.
//
//   1. EVERY VISIT IS A VISIT. The hero is loaded and at level 2 or more each time, so the departure frees
//      something real. A hero that never draws in node (it waits for a canvas) is named, not skipped silently.
//   2. THE DEPARTURE GIVES IT ALL BACK. After each departure the hero is not loaded, and the live count and the
//      bytes are never more than after the first one: nothing grows from visit to visit (what the first visit
//      leaves is shared by design, the noise volume of gasmat.js and the layers kept, and a few of those are let go
//      of on a timer of the coordinator's own some departures later, so the count may fall).
//   3. NO KTX2 IS SHIPPED (spec 0056): `createKtx2` has no caller, so a compressed hero map is not a case yet.
//      When one is, the same loop is the audit: its texture is a texture in the graph and counted here.
//   4. THE CLIPS' JUDGE (tools/hero-clips.mjs, internal #779): defectsOf() names a pop, a flicker, a jump of
//      share and a hero that never drew, on rows made here, and finds none in a smooth push-in.
//
// The in-browser twin is tests/probes/look/hero-cycles.js (renderer.info.memory and sr.perf's estimate on a real GL).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The layers read their files from site/data/deep/ with fetch(); in node a file: address is read from disc.
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
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { createDeepSky } = await import(join(JS, 'scene/deep/deepsky.js'));
const { HEROES } = await import(join(JS, 'scene/deep/heroes.js'));
const { sceneBytes } = await import(join(JS, 'scene/perf.js'));
const { defectsOf, THRESHOLDS } = await import(join(ROOT, 'tools/hero-clips.mjs'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const LY_KM = 9460730472580.8;
const CYCLES = 10;
/** What a later departure's estimate may exceed the first's by, in MiB: float noise, nothing more. */
const BUDGET_MIB = 0.01;

const records = parseDso(JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')));
const byId = new Map(records.map((r) => [r.id, r]));

// The renderer's books, as three's WebGLGeometries / WebGLMaterials / WebGLTextures keep them.
const live = new Set();
const everSeen = new Set();
const note = (o) => {
  if (!o || live.has(o)) return;
  live.add(o); everSeen.add(o);
  o.addEventListener('dispose', () => live.delete(o));
};
const texturesOf = (m, put) => {
  for (const k of Object.keys(m)) { const v = m[k]; if (v && v.isTexture) put(v); }
  if (m.uniforms) for (const k of Object.keys(m.uniforms)) {
    const v = m.uniforms[k] && m.uniforms[k].value;
    if (v && v.isTexture) put(v); else if (Array.isArray(v)) for (const x of v) if (x && x.isTexture) put(x);
  }
};
// Found in the graph when the hero is near and again after it has gone (what is disposed fires `dispose` and leaves).
const draw = (scene) => scene.traverse((o) => {
  if (o.geometry) note(o.geometry);
  for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) { note(m); texturesOf(m, note); }
});
const counts = () => {
  let geometries = 0; let materials = 0; let textures = 0;
  for (const o of live) { if (o.isBufferGeometry) geometries += 1; else if (o.isTexture) textures += 1; else materials += 1; }
  return { geometries, materials, textures };
};
const sig = (c) => `${c.geometries} geometries, ${c.materials} materials, ${c.textures} textures`;

stage.setWorld('stellar');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 16 / 9, 1e-5, 1e9);
const renderer = { domElement: { clientHeight: 900 } };
const place = (rec, distLy) => {
  const p = new THREE.Vector3(); stage.toSceneInto(rec.pos, 'sun-inertial', p, stage.tMs);
  camera.position.copy(p).add(p.clone().normalize().multiplyScalar(-distLy * LY_KM / stage.unitKm));
  camera.lookAt(p); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
};
const q = { tier: 1, top: false, latched: false, scaleStep: 0 };
let now = 0;

// One coordinator for all of them, as the app has: the layers (the star catalogue, the Magellanic Bridge) are loaded once.
const deep = createDeepSky(THREE, {
  scene, heroes: HEROES, records: () => records, recordById: (id) => byId.get(id), pictureShare: () => 0, picturesBusy: () => false,
  selectedId: () => null, subjectId: () => null, quality: () => q, look: () => 'film', reduced: () => false, frozen: true,
});
await deep.whenReady(5000);
const frame = (ms = 100) => { now += ms; deep.frame({ camera, renderer, nowMs: now, visible: true }); };

const report = [];
for (const def of HEROES) {
  const rec = byId.get(def.record);
  if (!rec) { check(false, `${def.id}: its record ${def.record} is not in site/data/dso.json`); continue; }
  const stub = def.stub || (await def.profile()).HERO;
  if (!stub || stub.shipped !== true) continue; // held heroes draw what main draws
  const sizeLy = Math.max(1, rec.meta && rec.meta.sizeLy > 0 ? rec.meta.sizeLy : 10);
  const leave = async () => {
    place(rec, Math.max(5e4, sizeLy * 400)); // far enough that it is a point whatever its size: the level is by size on screen
    for (let i = 0; i < 10; i += 1) frame();
    for (let i = 0; i < 12; i += 1) frame(1000);
    await deep.whenReady(3000);
    draw(scene);
  };
  const row = { id: def.id, visits: 0, after: [], mib: [] };
  for (let c = 0; c < CYCLES; c += 1) {
    place(rec, sizeLy * 1.5);
    for (let i = 0; i < 6; i += 1) { frame(); await deep.whenReady(3000); }
    for (let i = 0; i < 4; i += 1) frame();
    draw(scene);
    const h = deep.stats().heroes.find((x) => x.id === def.id);
    if (h && h.loaded && h.level >= 2) row.visits += 1;
    await leave();
    const gone = deep.stats().heroes.find((x) => x.id === def.id);
    check(gone && !gone.loaded, `${def.id}, cycle ${c + 1}: the hero is still loaded after twelve seconds at level 0`);
    row.after.push(counts());
    row.mib.push(sceneBytes(scene).totalMiB);
  }
  check(row.visits === CYCLES, `${def.id}: only ${row.visits} of ${CYCLES} visits found it loaded at level 2 or more (it never drew here: the audit proved nothing)`);
  const first = row.after[0];
  // Never more than after the first. It may be less: a holder or a layer the coordinator lets go of on its own timer.
  row.after.forEach((c, i) => check(c.geometries <= first.geometries && c.materials <= first.materials && c.textures <= first.textures, `${def.id}: after departure ${i + 1} the graph holds ${sig(c)}, after the first ${sig(first)}`));
  check(Math.max(...row.mib) - row.mib[0] <= BUDGET_MIB, `${def.id}: a departure holds more bytes than the first by over ${BUDGET_MIB} MiB (${row.mib.join(', ')} MiB)`);
  report.push(`${def.id} ${row.visits}/${CYCLES} visits, left ${sig(first)}`);
  if (process.env.CYCLES_VERBOSE) console.log(`${Math.round(performance.now() / 1000)} s: ${report[report.length - 1]}`);
}
deep.dispose();
// The clips' judge, on made-up rows: a smooth push-in is clean; each fault is named.
{
  const smooth = (n = 60) => Array.from({ length: n }, (_, i) => ({ logDistance: -0.02 * i, azimuth: 0.01 * i, polar: 1, level: i < 10 ? 1 : 3, share: Math.min(1, i / 30) }));
  check(defectsOf(smooth()).length === 0, `a smooth push-in has no defect (${JSON.stringify(defectsOf(smooth()))})`);
  // An ease in, a long ease out and a hold, as the camera rig flies: no pop, whatever the median step is.
  const eased = Array.from({ length: 120 }, (_, i) => { const u = Math.min(1, i / 80); const e = u * u * (3 - 2 * u); return { logDistance: -3 * e, azimuth: 0.7 * e, polar: 1, level: i < 30 ? 1 : 3, share: 0 }; });
  check(defectsOf(eased).length === 0, `an eased flight that ends in a hold has no pop (${JSON.stringify(defectsOf(eased))})`);
  const pop = smooth(); for (let i = 30; i < 60; i += 1) pop[i].logDistance -= 0.5;
  check(defectsOf(pop).some((d) => d.defect === 'pop' && d.what === 'distance' && d.frame === 30), 'a jump in distance is a pop, at its frame');
  const flick = smooth(); [20, 21, 22, 23, 24, 25].forEach((i, k) => { flick[i].level = k % 2 ? 3 : 2; });
  check(defectsOf(flick).some((d) => d.defect === 'flicker'), 'a level going up and down is a flicker');
  const jump = smooth(); for (let i = 40; i < 60; i += 1) jump[i].share = 0;
  check(defectsOf(jump).some((d) => d.defect === 'jump'), 'a share that falls from one to nothing in a frame is a jump');
  check(defectsOf(smooth().map((r) => ({ ...r, level: 1 }))).some((d) => d.defect === 'absent'), 'a hero that never reaches level 2 is absent');
  check(THRESHOLDS.level === 2 && defectsOf([]).some((d) => d.defect === 'absent'), 'no rows at all is absent, not a crash');
}
check(report.length >= 8, `at least eight shipped heroes were audited (${report.length})`);
check(everSeen.size > 0, 'the audit saw resources');

if (problems.length) {
  console.error(`test_hero_cycles: ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 40)) console.error('  - ' + p);
  process.exit(1);
}
if (process.env.CYCLES_VERBOSE) console.log(report.join('\n'));
console.log(`test_hero_cycles: ok (${report.length} heroes, ${CYCLES} visits each, the graph never grows across departures)`);

// tests/test_hero_dispose.mjs -- the hero layer gives every geometry back (internal #546, the
// autopilot's reel of `strangest-things`: renderer.info.memory.geometries climbed about 9 a pass).
//   node tests/test_hero_dispose.mjs
//
// What is held: the trip's five records are flown to over and over (the Moon's three surface
// stops, Voyager 1 with its record, the roadster), with the real glTF files loading and swapping
// in, and a stand-in for the renderer's geometry book (three's WebGLGeometries: a geometry is
// counted when first drawn, and forgotten when it fires `dispose`). The count after each lap, and
// with nothing selected, must not grow; and every geometry a released model wore must be forgotten.
//
// WHAT THIS CLEARED. It shows the hero layer (models.js disposeModels, the contact shadow, the
// ground patch, the attached oddities, the real-model swap) is flat across laps, so the browser's
// climb is not a model that stays: it is a stage's or a layer's geometry. The rule is held here so
// that stays true.
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
const { createHeroes, warmModels } = await import(join(JS, 'scene/heroes.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { sampleOddities, sampleDeepSpace } = await import(join(JS, 'data/sample.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const recs = [...sampleOddities(), ...sampleDeepSpace()];
const TRIP = ['duke-family-photo', 'shepard-golf-balls', 'beresheet-lunar-library', 'deep-voyager-1', 'tesla-roadster'];
const tMs = Date.parse('2026-10-09T12:00:00Z');

// The renderer's book of geometries, as WebGLGeometries keeps it.
const book = new Set();
const everDrawn = new Set();
function draw(scene) {
  scene.traverse((o) => {
    const g = o.geometry;
    if (!g || book.has(g)) return;
    book.add(g); everDrawn.add(g);
    g.addEventListener('dispose', () => book.delete(g));
  });
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1.6, 1e-6, 1e9);
let selected = null;
const ctx = {
  camera,
  layers: LAYERS.filter((l) => l.id === 'oddities' || l.id === 'deep-space'),
  isLayerOn: () => true,
  recordsFor: (id) => recs.filter((r) => r.layer === id),
  selected: () => selected,
  worlds: null,
  renderer: null,
};
const heroes = createHeroes(scene, ctx);
await warmModels();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frames = (n) => { for (let i = 0; i < n; i++) { heroes.update(tMs, { frameMs: 16 }); draw(scene); } };

const perLap = [];
for (let lap = 0; lap < 4; lap++) {
  for (const id of TRIP) {
    selected = recs.find((r) => r.id === id);
    check(!!selected, `${id} is not a record`);
    if (!selected) continue;
    const p = propagate(selected, tMs);
    const pos = stage.toScene(p, p.frame, tMs);
    if (!pos) continue;
    camera.position.copy(pos).add(new THREE.Vector3(0, 0, 900 / stage.unitKm));
    camera.lookAt(pos); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    frames(3);
    await sleep(120); // the glTF arrives and swaps in
    frames(2);
  }
  selected = null;
  frames(3);
  perLap.push(book.size);
}
check(everDrawn.size > 40, `the trip drew only ${everDrawn.size} geometries: the walk is not exercising the models`);
check(perLap.every((n) => n === perLap[0]), `geometries held after each lap grow: ${perLap.join(', ')}`);

// Everything a model wore is forgotten once the model is put away.
heroes.dispose();
check(book.size === 0, `${book.size} geometries are still in the renderer's book after the hero layer is disposed`);

if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`ok: ${perLap.length} laps of ${TRIP.length} records hold ${perLap[0]} geometries each time; none left after dispose (${everDrawn.size} drawn in all)`);

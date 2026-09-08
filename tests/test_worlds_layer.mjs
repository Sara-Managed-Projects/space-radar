// tests/test_worlds_layer.mjs -- spec 0028 step 0: the worlds are objects.
//
// A planet is a record (search finds it, the layer list counts it, a tap picks it) and the picker
// is fair to the small thing: a moon's disc drawn over a planet's disc is what a finger means.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { worldRecords, pickWorldDisc, WORLDS, WORLD_ALIASES } = await import(join(JS, 'scene/worlds.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { LAYERS, loadLayer } = await import(join(JS, 'data/layers.js'));
const { buildIndex, findMatches } = await import(join(JS, 'ui/search.js'));

// 1. one record per world, and the contract's propagator answers for every one of them
const recs = worldRecords();
check(recs.length === WORLDS.length, `one record per world (${recs.length} vs ${WORLDS.length})`);
const tMs = Date.parse('2026-09-08T12:00:00Z');
for (const r of recs) {
  check(r.klass === 'world' && r.layer === 'worlds' && r.propagator === 'body', `${r.id} is a world record on the worlds layer`);
  const p = propagate(r, tMs);
  check(p && Number.isFinite(p.x) && p.cls === 'measured', `${r.id} propagates to a measured position`);
}
check(recs.find((r) => r.id === 'mars').meta.aliases.includes('the Red Planet'), 'Mars carries its alias');
for (const id of Object.keys(WORLD_ALIASES)) check(WORLDS.some((w) => w.id === id), `alias table names a real world: ${id}`);

// 2. the layer row loads its records through the contract's loader, like any other layer
const row = LAYERS.find((l) => l.id === 'worlds');
check(!!row && row.draw === 'worlds' && row.noModel === true, 'the worlds layer row exists, draws no glyphs and no hero model');
check(LAYERS[0] && LAYERS[0].id === 'worlds', 'the worlds layer is first, so its records are the last to be picked over a glyph');
const loaded = await loadLayer(row, tMs);
check(loaded.length === WORLDS.length && loaded.every((r) => r.layer === 'worlds'), `loadLayer gives ${loaded.length} world records`);

// 3. search: by name and by alias, with the world first
const index = buildIndex([...loaded, { id: 'sat-1', name: 'MARS ODYSSEY', klass: 'satellite', layer: 'active', meta: {} }], LAYERS);
const mars = findMatches(index, 'mars');
check(mars.hits[0] && mars.hits[0].record.id === 'mars', `"mars" finds Mars first (got ${mars.hits[0] && mars.hits[0].record.id})`);
const red = findMatches(index, 'red planet');
check(red.hits[0] && red.hits[0].record.id === 'mars', '"red planet" finds Mars by alias');
const luna = findMatches(index, 'luna');
check(luna.hits[0] && luna.hits[0].record.id === 'moon', '"luna" finds the Moon');
const sun = findMatches(index, 'the sun');
check(sun.hits[0] && sun.hits[0].record.id === 'sun', '"the sun" finds the Sun');

// 4. picking: the smaller disc wins when the finger could mean either; nothing far away picks
const big = { id: 'earth', cx: 400, cy: 300, r: 200 };
const small = { id: 'moon', cx: 450, cy: 300, r: 6 };
check(pickWorldDisc([big, small], 452, 301)?.id === 'moon', 'a tap on the Moon drawn over Earth picks the Moon');
check(pickWorldDisc([big, small], 300, 300)?.id === 'earth', 'a tap on Earth away from the Moon picks Earth');
check(pickWorldDisc([big, small], 400, 40) === null, 'a tap 60 px outside every edge picks nothing');
check(pickWorldDisc([big, small], 400, 90)?.id === 'earth', 'a tap 10 px outside Earth\'s edge is forgiven');
check(pickWorldDisc([], 1, 1) === null, 'no discs, no pick');

// 5. the real picker with a real camera: Earth at the origin of an Earth stage, camera 22 units out
{
  const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
  const { stage } = await import(join(JS, 'scene/stage.js'));
  const { createWorlds } = await import(join(JS, 'scene/worlds.js'));
  stage.setWorld('earth');
  stage.setTime(tMs);
  const scene = new THREE.Scene();
  const worlds = createWorlds(scene, { textureBase: null });
  worlds.update(tMs);
  const camera = new THREE.PerspectiveCamera(45, 800 / 600, 1e-5, 1e9);
  camera.position.set(0, 0, 22);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const vp = { w: 800, h: 600 };
  check(worlds.pick(0, 0, camera, vp)?.id === 'earth', 'a tap dead centre on Earth picks Earth');
  check(worlds.pick(0.95, 0.95, camera, vp) === null, 'a tap in the corner, off every disc, picks nothing');
  check(worlds.drawnPositionOf('earth') && worlds.drawnPositionOf('earth').length() === 0, 'the stage world is drawn at the origin');
  check(Math.abs(worlds.drawnRadiusUnits('earth') - 6378.137 / 1000) < 0.01 || Math.abs(worlds.drawnRadiusUnits('earth') - 6.371) < 0.01, `Earth's drawn radius is its radius in units (${worlds.drawnRadiusUnits('earth')})`);
  worlds.setVisible(false);
  worlds.update(tMs);
  check(worlds.meshFor('mars').visible === false && worlds.meshFor('earth').visible === true && worlds.meshFor('sun').visible === true, 'switching the layer off hides Mars but never the stage world or the Sun');
  worlds.setVisible(true);
  worlds.update(tMs);
  check(worlds.meshFor('mars').visible === true, 'switching it back on shows Mars again');
  worlds.dispose();
}

if (problems.length) {
  console.error('worlds layer FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`worlds layer ok: ${recs.length} worlds are records, searchable by name and alias, and the smaller disc wins a tap`);

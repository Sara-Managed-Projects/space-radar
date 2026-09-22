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
  const all = worlds.pickAll(0, 0, camera, vp);
  check(all.length >= 1 && all[0].record.id === 'earth' && all[0].edge === 0 && all[0].r > 100, `pickAll at the centre lists Earth first with the finger on it (${JSON.stringify(all.map((c) => [c.record.id, Math.round(c.edge), Math.round(c.r)]))})`);
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

// 6. A PLANET'S MAP IS FETCHED WHEN IT CAN BE SEEN, NOT AT BOOT.
//
// Every world used to fetch its 2048 x 1024 map at construction: 6.4 MB on the wire and about
// 139 MB of GPU memory against a 150 MB phone budget for everything, while from the default Earth
// view nine of those fourteen maps paint discs a few pixels wide. This watches the loader.
{
  const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
  const { stage } = await import(join(JS, 'scene/stage.js'));
  const { createWorlds, TEXTURE_AT_HALF_VIEW } = await import(join(JS, 'scene/worlds.js'));
  stage.setWorld('earth');
  stage.setTime(tMs);
  const fetched = [];
  const pending = new Map();
  const loadTexture = (url, onLoad) => {
    fetched.push(url);
    const tex = new THREE.Texture();
    pending.set(url, () => onLoad && onLoad(tex));
    return tex;
  };
  const camera = new THREE.PerspectiveCamera(45, 800 / 600, 1e-5, 1e9);
  camera.position.set(0, 0, 22); // the default view: a few Earth radii out
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const worlds = createWorlds(new THREE.Scene(), { textureBase: 't/', loadTexture, camera });

  const EAGER = ['t/2k_earth_daymap.jpg', 't/2k_earth_nightmap.webp', 't/2k_earth_clouds.webp', 't/2k_saturn_ring_alpha.png'];
  const lazyWorlds = WORLDS.filter((w) => !w.look.earth && w.look.map);
  check(fetched.length === EAGER.length && EAGER.every((u) => fetched.includes(u)),
    `construction fetches Earth's three maps and the ring strip, nothing else (${JSON.stringify(fetched)})`);
  check(lazyWorlds.length === 9 && worlds.waitingMaps().length === lazyWorlds.length, `nine worlds -- the Sun, the Moon and seven planets -- wait for their maps (${worlds.waitingMaps().length})`);

  worlds.update(tMs);
  check(fetched.length === EAGER.length,
    `from the default view no planet, the Moon or the Sun is big enough to fetch (${JSON.stringify(fetched.slice(EAGER.length))})`);

  // Until the map arrives the world is its measured mean colour -- not white, which is what an
  // unloaded cel material used to fall back to, and not black.
  for (const w of lazyWorlds) {
    const m = worlds.meshFor(w.id).material;
    const colour = m.uniforms ? m.uniforms.uTint.value : m.color;
    const hasMap = m.uniforms ? m.uniforms.uHasMap.value === 1 : !!m.map;
    const hex = colour.getHex();
    check(!hasMap && Number.isFinite(w.look.tint) && hex !== 0xffffff && hex !== 0x000000,
      `${w.id} waits in its mean colour, not a map and not white (#${hex.toString(16)})`);
  }

  // Fly the camera to Mars's drawn disc: past the threshold, fetched exactly once.
  const marsAt = worlds.drawnPositionOf('mars');
  const marsR = worlds.drawnRadiusUnits('mars');
  camera.position.copy(marsAt).add(new THREE.Vector3(0, 0, marsR * 4));
  camera.updateMatrixWorld();
  worlds.update(tMs);
  worlds.update(tMs);
  const marsFetches = fetched.filter((u) => u.endsWith('2k_mars.jpg')).length;
  check(marsFetches === 1, `Mars's map is fetched once when its disc fills the view, over two frames (${marsFetches})`);
  check(!worlds.waitingMaps().includes('mars'), 'and Mars stops waiting');
  const mars = worlds.meshFor('mars').material.uniforms;
  check(mars.uHasMap.value === 0, 'the map is not used before it has arrived');
  pending.get('t/2k_mars.jpg')();
  check(mars.uHasMap.value === 1 && mars.uTint.value.getHex() === 0xffffff && mars.uMap.value,
    'when it arrives the map replaces the mean colour, untinted');

  // Selecting a world starts its map at once, whatever size it is drawn.
  check(worlds.preload('saturn') === true && fetched.includes('t/2k_saturn.jpg'), 'preload(saturn) fetches Saturn now');
  check(worlds.preload('saturn') === false, 'and a second preload does not fetch it again');
  pending.get('t/2k_sun.jpg');
  check(worlds.preload('sun') === true, 'the Sun can be preloaded too');
  pending.get('t/2k_sun.jpg')();
  const sunMat = worlds.meshFor('sun').material;
  check(sunMat.map && sunMat.color.getHex() === 0xffffff, 'the Sun, a basic material, takes its map the same way');
  check(worlds.preload('earth') === false, 'Earth never waits: its maps were fetched at construction');

  // The threshold means what it says: a disc just under it does not fetch, just over it does.
  const w2 = createWorlds(new THREE.Scene(), { textureBase: 't/', loadTexture: () => new THREE.Texture(), camera });
  const jup = worlds.drawnPositionOf('jupiter');
  const jr = worlds.drawnRadiusUnits('jupiter');
  const tanHalf = Math.tan((45 * Math.PI) / 360);
  for (const [factor, want] of [[0.95, true], [1.05, false]]) {
    const dist = jr / (TEXTURE_AT_HALF_VIEW * tanHalf) * factor;
    camera.position.copy(jup).add(new THREE.Vector3(0, 0, dist));
    camera.updateMatrixWorld();
    w2.update(tMs);
    const fetchedNow = !w2.waitingMaps().includes('jupiter');
    if (fetchedNow !== want) problems.push(`Jupiter at ${factor}x the threshold distance: fetched=${fetchedNow}, expected ${want}`);
    if (want) break;
  }
  worlds.dispose();
  w2.dispose();
}

// "Source not recorded" on every world card: the positions come from Astronomy Engine (propagate/
// body.js), and the card's source line reads meta.cite first.
{
  const { worldRecords: wr } = await import(join(JS, 'scene/worlds.js'));
  const uncited = wr().filter((r) => !/Astronomy Engine/.test((r.meta && r.meta.cite) || '')).map((r) => r.id);
  check(uncited.length === 0, `every world names where its position comes from; these do not: ${uncited}`);
}

if (problems.length) {
  console.error('worlds layer FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`worlds layer ok: ${recs.length} worlds are records, searchable by name and alias, and the smaller disc wins a tap, and a planet's map waits until its disc can show it`);

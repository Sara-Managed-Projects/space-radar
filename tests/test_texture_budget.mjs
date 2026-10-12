// tests/test_texture_budget.mjs -- what the maps can hold on the GPU, per device tier, against a
// budget; and the rule that makes the sum true (spec 0056 requirement 4 and 9, internal #157).
//
//   1. THE SUM. For T0, T1 and T2: everything that is on screen from the start at that tier's
//      file, today's clouds, the tier's sharper-planet slots each at the largest sharper map, the
//      other worlds the tier may keep a map for (scene/worlds.js MAPS_HELD), and every other face a
//      card can ask for -- against tier0/1/2_texture_gpu_mib in registry/budgets.yaml.
//   2. WATCHED TO FAIL: a fake 8k RGBA row on T0, a held count of 37 (what "loads once and stays"
//      was), and a slot more than T1 has, each put the sum over its row.
//   3. THE RULE, in a real createWorlds with a fake loader: past MAPS_HELD the world that has been
//      a dot the longest gives its map back -- disposed, in its mean colour, waiting again -- and
//      asking for it again fetches it again. A world that is big on screen, or wearing a sharper
//      map, is never taken.
//   4. THE REPOSITORY: site/textures/ against repo_textures_mb, and no file wider than 4096 without
//      KTX2.
//   5. THE WIRING: main.js tells the worlds their count when the tier is picked, promoted and
//      latched, and answers spaceRadar.gpu().
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const load = (rel) => import(pathToFileURL(join(JS, rel)).href);
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { TEXTURES } = await load('data/textures.js');
const { BUDGETS } = await load('data/budgets.js');
const { worstCaseGpu, gpuMiB, variantFor } = await load('scene/texturetiers.js');
const { TIER_PLANET_SLOTS } = await load('scene/quality.js');
const { createWorlds, WORLDS, MAPS_HELD } = await load('scene/worlds.js');
const THREE = await import(pathToFileURL(join(ROOT, 'site/vendor/three.module.min.js')).href);

// --- 1. the sum -------------------------------------------------------------------------------
const ROW = ['tier0_texture_gpu_mib', 'tier1_texture_gpu_mib', 'tier2_texture_gpu_mib'];
const sums = [];
check(MAPS_HELD.length === 3 && MAPS_HELD.every((n) => Number.isInteger(n) && n >= 3), `MAPS_HELD is a count per tier (${MAPS_HELD})`);
for (const tier of [0, 1, 2]) {
  const budget = BUDGETS[ROW[tier]];
  check(Number.isFinite(budget), `registry/budgets.yaml has ${ROW[tier]}`);
  const w = worstCaseGpu(tier, { mapsHeld: MAPS_HELD[tier] });
  sums.push(w);
  check(w.total <= budget, `T${tier} can hold ${w.total.toFixed(1)} MiB of maps (${w.always.toFixed(1)} always on screen, ${w.sharp.toFixed(1)} sharper planets, ${w.worlds.toFixed(1)} worlds held, ${w.faces.toFixed(1)} other faces), over ${ROW[tier]} ${budget}`);
  // The count must be enough for the fullest thing the app frames: a planet and its four big moons.
  check(MAPS_HELD[tier] >= 5, `T${tier} may keep ${MAPS_HELD[tier]} worlds' maps: Jupiter and its four big moons need five`);
}
check(gpuMiB({ px: [2048, 1024], format: 'rgb' }).toFixed(2) === '10.67' && gpuMiB({ px: [4096, 2048], format: 'mono' }).toFixed(2) === '10.67' && gpuMiB({ px: [4096, 2048], format: 'rgb' }).toFixed(2) === '42.67', 'a 2k map is 10.67 MiB, a 4k map 42.67, a 4k mask 10.67');

// --- 2. watched to fail -----------------------------------------------------------------------
{
  const fake = [...TEXTURES, { id: 'fake-8k', world: 'earth', slot: 'fake', when: 'idle', files: [{ tier: 0, file: 'x', px: [8192, 4096], bytes: 1, format: 'rgba' }] }];
  const w = worstCaseGpu(0, { rows: fake, mapsHeld: MAPS_HELD[0] });
  check(w.total > BUDGETS.tier0_texture_gpu_mib, `a fake 8k RGBA row on T0 puts the sum over its row (${w.total.toFixed(1)})`);
  const stay = TEXTURES.filter((r) => !(r.world === 'earth' || r.world === 'sky' || r.id === 'saturn-ring') && r.when !== 'asked').length;
  const before = [0, 1, 2].map((t) => worstCaseGpu(t, { mapsHeld: stay }).total);
  check(before[0] > BUDGETS.tier0_texture_gpu_mib && before[1] > BUDGETS.tier1_texture_gpu_mib && before[2] > BUDGETS.tier2_texture_gpu_mib,
    `"loads once and stays" (${stay} worlds held) is over every row (${before.map((x) => x.toFixed(0)).join(', ')} MiB)`);
  const slots = TIER_PLANET_SLOTS.slice(); slots[1] += 1;
  check(worstCaseGpu(1, { mapsHeld: MAPS_HELD[1], slots }).total > BUDGETS.tier1_texture_gpu_mib, 'one more 4k planet on T1 is over its row');
}

// --- 3. the rule ------------------------------------------------------------------------------
{
  const fetched = [];
  const pending = new Map();
  const disposed = new Set();
  const loadTexture = (url, onLoad) => {
    fetched.push(url);
    const tex = new THREE.Texture();
    tex.name = url;
    const dispose = tex.dispose.bind(tex);
    tex.dispose = () => { disposed.add(tex); dispose(); };
    pending.set(url, () => onLoad && onLoad(tex));
    return tex;
  };
  const camera = new THREE.PerspectiveCamera(45, 800 / 600, 1e-5, 1e9);
  camera.position.set(0, 0, 22);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const worlds = createWorlds(new THREE.Scene(), { textureBase: 't/', loadTexture, camera });
  const tMs = Date.parse('2026-09-08T12:00:00Z');
  const mapOf = (id) => WORLDS.find((w) => w.id === id).look.map;
  const arrive = (id) => { const go = pending.get("t/" + mapOf(id)); pending.delete("t/" + mapOf(id)); if (!go) { console.error("nothing pending for", id, problems); process.exit(1); } go(); };
  const uni = (id) => worlds.meshFor(id).material.uniforms;
  const count = (id) => fetched.filter((u) => u === 't/' + mapOf(id)).length;
  worlds.setMapsHeld(3);
  worlds.update(tMs);
  // Three worlds visited in turn, each from the default view (so each is a dot again afterwards).
  const order = ['mars', 'jupiter', 'saturn'];
  for (const id of order) { worlds.preload(id); arrive(id); worlds.update(tMs); }
  check(worlds.mapsHeld().length === 3 && order.every((id) => uni(id).uHasMap.value === 1), `three maps held at a count of three (${worlds.mapsHeld()})`);
  // A fourth: the one that has been a dot the longest goes. Mars arrived first.
  worlds.preload('venus'); arrive('venus'); worlds.update(tMs);
  check(worlds.mapsHeld().length === 3 && !worlds.mapsHeld().includes('mars'), `a fourth map and the oldest dot gives its own back (${worlds.mapsHeld()})`);
  const mars = uni('mars');
  const marsTint = WORLDS.find((w) => w.id === 'mars').look.tint;
  check(mars.uHasMap.value === 0 && mars.uMap.value === null && mars.uTint.value.getHex() === marsTint, 'the world it was taken from is in its mean colour again');
  check([...disposed].some((t) => t.name === 't/' + mapOf('mars')), 'and its texture was disposed, which is what frees the memory');
  check(worlds.waitingMaps().includes('mars') && worlds.hasMap('mars') === false, 'and it waits, as before its map first came');
  // Coming back fetches again, once.
  check(worlds.preload('mars') === true && count('mars') === 2, `asking for it again fetches it again (${count('mars')})`);
  arrive('mars'); worlds.update(tMs);
  check(uni('mars').uHasMap.value === 1 && worlds.mapsHeld().length === 3 && !worlds.mapsHeld().includes('jupiter'), `and the next oldest goes in its turn (${worlds.mapsHeld()})`);
  // A world that is BIG on screen is never taken, however old: fly to Saturn, then load two more.
  const at = worlds.drawnPositionOf('saturn');
  camera.position.copy(at).add(new THREE.Vector3(0, 0, worlds.drawnRadiusUnits('saturn') * 4));
  camera.updateMatrixWorld();
  worlds.update(tMs);
  for (const id of ['neptune', 'uranus']) { worlds.preload(id); arrive(id); worlds.update(tMs); worlds.update(tMs); }
  check(worlds.mapsHeld().includes('saturn') && uni('saturn').uHasMap.value === 1, `the world filling the view keeps its map while others come and go (${worlds.mapsHeld()})`);
  check(worlds.mapsHeld().length === 3, `and the count holds (${worlds.mapsHeld()})`);
  // A world wearing a sharper map (scene/texturetiers.js) is not taken, and cannot be released by hand.
  const sharp = new THREE.Texture();
  worlds.setTierMap('saturn', sharp);
  camera.position.set(0, 0, 22); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  worlds.update(tMs);
  check(worlds.releaseMap('saturn') === false, 'a world wearing a sharper map does not give its own back');
  for (const id of ['mercury', 'pluto']) { if (worlds.preload(id)) arrive(id); worlds.update(tMs); worlds.update(tMs); }
  check(worlds.mapsHeld().includes('saturn'), `nor is it taken by the trim (${worlds.mapsHeld()})`);
  // The Sun's material is a basic one: the same rule by its other road.
  worlds.setTierMap('saturn', null);
  worlds.preload('sun'); arrive('sun'); worlds.update(tMs);
  check(worlds.releaseMap('sun') === true, 'the Sun gives its map back too');
  const sunMat = worlds.meshFor('sun').material;
  check(sunMat.map === null && sunMat.color.getHex() === WORLDS.find((w) => w.id === 'sun').look.tint, 'and is its own colour again');
  // The Earth is not in this at all.
  check(worlds.releaseMap('earth') === false && !worlds.mapsHeld().includes('earth'), 'the Earth\'s maps are never given back');
  worlds.dispose();
}

// --- 4. the repository ------------------------------------------------------------------------
{
  let bytes = 0;
  const walk = (dir) => { for (const f of readdirSync(dir)) { const p = join(dir, f); const st = statSync(p); if (st.isDirectory()) walk(p); else bytes += st.size; } };
  walk(join(ROOT, 'site/textures'));
  check(bytes <= BUDGETS.repo_textures_mb * 1e6, `site/textures/ is ${(bytes / 1e6).toFixed(1)} MB, over repo_textures_mb ${BUDGETS.repo_textures_mb}`);
  for (const row of TEXTURES) for (const f of row.files) check(f.px[0] <= 4096 || /\.ktx2$/.test(f.file), `${row.id}: ${f.px[0]} px wide is over what may ship without KTX2`);
  sums.repo = bytes;
}

// --- 5. the wiring ----------------------------------------------------------------------------
{
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(/holdFor\(pick\.tier\)/.test(main) && /tiers\.setTier\(up\); holdFor\(up\)/.test(main) && /tiers\.latch\(\); holdFor\(0\)/.test(main), 'main.js tells the worlds their count at the pick, on a promotion and at the latch');
  check(/ctx\.gpu = \(\) => api\.gpu\(\)/.test(main), 'window.spaceRadar.gpu() answers');
}

if (problems.length) { console.error('texture budget FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`texture budget ok: T0 ${sums[0].total.toFixed(1)} of ${BUDGETS.tier0_texture_gpu_mib} MiB, T1 ${sums[1].total.toFixed(1)} of ${BUDGETS.tier1_texture_gpu_mib}, T2 ${sums[2].total.toFixed(1)} of ${BUDGETS.tier2_texture_gpu_mib}; a world that has been a dot the longest gives its map back past ${MAPS_HELD.join('/')} held; site/textures ${(sums.repo / 1e6).toFixed(1)} MB of ${BUDGETS.repo_textures_mb}`);

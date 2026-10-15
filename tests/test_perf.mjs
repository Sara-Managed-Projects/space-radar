// tests/test_perf.mjs -- sr.perf (scene/perf.js), the seed under ?look=1, and the heroes probe
// (internal spec 0076, stage W1-e; internal #914, #915, #779).
//
//   node tests/test_perf.mjs
//
// 1. THE SHAPE. createPerf(ctx) counts drawn frames into typed rings and answers stats() with the
//    window's p50/p95, the renderer's counts, an estimate of the GPU bytes the scene graph holds and
//    the network bytes since the mark. The estimates are checked against hand sums.
// 2. NO ALLOCATION PER FRAME. frame() writes numbers into preallocated rings: its source has no
//    literal, no `new`, no closure, and a million calls do not grow the heap.
// 3. OFF UNLESS ASKED. Nothing imports scene/perf.js statically; main.js fetches it only at its
//    `0076 W1-e` anchor, under ?look=1 (ctx.latch.held) or when a tool calls sr.wantPerf(); it draws
//    nothing, writes no DOM and adds no visitor URL key.
// 4. THE SEED. Under ?look=1 the wind, the currents and the weather's flashes take a seeded random
//    (scene/wind.js lookRandom): two runs draw the same numbers; without it, or beside embed=1, they are
//    Math.random as before.
// 5. THE PROBE. tests/probes/look/heroes.js walks the thirteen heroes at far, middle, near and turned,
//    pauses the clock at one instant, and takes the context away once.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { createPerf, sceneBytes, textureBytes, geometryBytes, quantile, RING, LOOK_SEED } from '../site/js/scene/perf.js';
import { lookRandom } from '../site/js/scene/wind.js';
import { KEYS } from '../site/js/ui/urlstate.js';
import { summarise, scenesCsv, scenesOf, CSV_COLUMNS } from '../tools/look-summary.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const problems = [];
const ok = (cond, what) => { if (!cond) problems.push(what); };

// 1. The shape.
ok(quantile(new Float64Array([5, 1, 3, 2, 4]), 5, 0.5) === 3, 'quantile: the median of 1..5 is 3');
ok(quantile(new Float64Array([5, 1, 3, 2, 4]), 5, 0.95) === 5, 'quantile: the 95th percentile of 1..5 is 5');
ok(quantile(new Float64Array(4), 0, 0.5) === null, 'quantile of nothing is null');
ok(quantile(new Float64Array([9, 1, 2]), 2, 1) === 9, 'quantile reads only the first n');

const tex = (w, h, extra = {}) => ({ isTexture: true, uuid: 't' + w + 'x' + h + (extra.format || '') + (extra.type || ''), image: { width: w, height: h }, format: 1023, type: 1009, minFilter: 1008, generateMipmaps: true, ...extra });
ok(textureBytes(tex(1024, 512)) === Math.round(1024 * 512 * 4 * 4 / 3), 'an RGBA map with mipmaps: four bytes a pixel and a third more');
ok(textureBytes(tex(1024, 512, { format: 1028, minFilter: 1006 })) === 1024 * 512, 'a red-only map without mipmaps: one byte a pixel');
ok(textureBytes(tex(64, 64, { type: 1015, minFilter: 1006 })) === 64 * 64 * 16, 'a float RGBA map: sixteen bytes a pixel');
ok(textureBytes({ isTexture: true, image: { width: 8, height: 8, depth: 8 }, format: 1028, type: 1009, minFilter: 1006 }) === 512, 'a 3D noise volume counts its depth');
ok(textureBytes({ isTexture: true, image: [{ width: 2, height: 2 }, { width: 2, height: 2 }], format: 1023, type: 1009, minFilter: 1006 }) === 32, 'a cube map counts its faces');
ok(textureBytes({ isTexture: true, isRenderTargetTexture: true, image: { width: 9, height: 9 } }) === 0, 'a render target is not counted (there are none: the contract)');
const geo = { uuid: 'g1', attributes: { position: { array: new Float32Array(30) }, uv: { array: new Float32Array(20) } }, index: { array: new Uint16Array(12) } };
ok(geometryBytes(geo) === 120 + 80 + 24, 'a geometry is its buffers');

const shared = tex(256, 256);
const meshA = { visible: true, material: { map: shared, color: { r: 1 } }, geometry: geo };
const meshB = { visible: false, material: { uniforms: { uTex: { value: tex(128, 128, { minFilter: 1006 }) }, uList: { value: [shared] }, uK: { value: 2 } } }, geometry: { uuid: 'g2', attributes: { position: { array: new Float32Array(4) } } } };
const all = [meshA, meshB];
const fakeScene = {
  traverse: (f) => { f(fakeScene); for (const o of all) f(o); },
  traverseVisible: (f) => { f(fakeScene); for (const o of all) if (o.visible) f(o); },
};
const sb = sceneBytes(fakeScene);
const MIB = 1024 * 1024;
const r2 = (x) => Math.round((x / MIB) * 100) / 100;
ok(sb.textures === 2 && sb.geometries === 2, `a texture worn twice is counted once (${sb.textures} textures, ${sb.geometries} geometries)`);
ok(sb.textureMiB === r2(textureBytes(shared) + 128 * 128 * 4), 'textureMiB sums each texture once, uniforms included');
ok(sb.visibleMiB === r2(textureBytes(shared) + geometryBytes(geo)), 'visibleMiB is what the visible graph holds');
ok(sb.totalMiB === r2(textureBytes(shared) + 128 * 128 * 4 + geometryBytes(geo) + 16), 'totalMiB is textures and geometries');

let clockMs = 1000;
const ctx = {
  renderer: { info: { render: { calls: 7, triangles: 70, points: 1, lines: 2 }, memory: { textures: 3, geometries: 4 }, programs: [1, 2] } },
  scene: fakeScene,
  quality: { describe: () => ({ tier: 1 }) },
  drawn: { mode: () => 'film' },
  exposure: { mode: () => 'eye' },
  latch: { held: true, latched: false },
  clock: { now: () => Date.UTC(2026, 9, 15, 12) },
  deep: { stats: () => ({ calls: 2, heroes: [] }) },
};
const perf = createPerf(ctx, { now: () => clockMs });
for (let i = 0; i < 10; i++) { clockMs += 16 + i; perf.frame(clockMs - 4, 16 + i); }
ok(perf.count() === 10 && perf.total === 10, 'ten frames counted');
let st = perf.stats();
for (const k of ['frames', 'p50Ms', 'p95Ms', 'maxMs', 'workP50Ms', 'workP95Ms', 'calls', 'triangles', 'textures', 'geometries', 'programs', 'gpu', 'net', 'tier', 'look', 'exposure', 'held', 'latched', 'seed', 'at', 'deep']) ok(k in st, `stats() has ${k}`);
ok(st.frames === 10 && st.p50Ms === 21 && st.p95Ms === 25 && st.maxMs === 25, `p50/p95 of 16..25 ms (got ${st.p50Ms}, ${st.p95Ms})`);
ok(st.workP50Ms === 4 && st.workP95Ms === 4, 'the work per frame is now() - the frame\'s stamp');
ok(st.calls === 7 && st.programs === 2 && st.tier === 1 && st.look === 'film' && st.exposure === 'eye' && st.held === true && st.seed === LOOK_SEED, 'stats() reads the renderer, the tier, the look, the exposure, the switch and the seed');
ok(st.at === '2026-10-15T12:00:00.000Z', 'stats() says the clock\'s instant');
ok(st.gpu.totalMiB === sb.totalMiB && st.deep.calls === 2, 'stats() carries the GPU estimate and sr.deep.stats()');
perf.mark();
ok(perf.count() === 0 && perf.stats().frames === 0 && perf.stats().p50Ms === null, 'mark() starts an empty window');
for (let i = 0; i < RING + 30; i++) perf.frame(clockMs, 10);
ok(perf.count() === RING, `the ring holds the last ${RING} frames`);
const bare = createPerf({}).stats();
ok(bare.calls === null && bare.gpu.totalMiB === 0 && bare.tier === null, 'stats() on an empty ctx answers with nulls, not a throw');

// 2. No allocation per frame.
{
  const src = read('site/js/scene/perf.js');
  const m = /\n    frame\(nowReal, frameMs\) \{\n([\s\S]*?)\n    \},\n/.exec(src);
  ok(!!m, 'perf.js frame(nowReal, frameMs) found');
  if (m) {
    const body = m[1];
    for (const [re, what] of [[/\bnew\b/, 'new'], [/=>/, 'a closure'], [/(^|[=(,:?]|return)\s*[[{]/m, 'an array or object literal'], [/\.(push|map|filter|slice|concat)\(/, 'an allocating array call'], [/`/, 'a template string']]) ok(!re.test(body), `frame() must not allocate: it has ${what}`);
  }
  setFlagsFromString('--expose-gc');
  const gc = runInNewContext('gc');
  const p = createPerf({}, { now: () => 5 });
  for (let i = 0; i < 10000; i++) p.frame(1, 16);
  gc(); gc();
  const before = process.memoryUsage().heapUsed;
  for (let i = 0; i < 1000000; i++) p.frame(i, 16.7);
  gc(); gc();
  const grew = process.memoryUsage().heapUsed - before;
  ok(grew < 256 * 1024, `a million frame() calls grew the heap by ${grew} B`);
}

// 3. Off unless asked.
{
  const main = read('site/js/main.js');
  const at = main.indexOf('    // 0076 W1-e\n');
  ok(at > 0, 'main.js has its 0076 W1-e anchor');
  const end = main.indexOf('\n  }\n', at);
  const block = main.slice(at, end);
  ok(block.split('\n').length <= 10, `the anchor's block is at most ten lines (${block.split('\n').length})`);
  ok(/import\('\.\/scene\/perf\.js'\)/.test(block), 'main.js fetches scene/perf.js at its anchor, by a dynamic import');
  ok((main.match(/scene\/perf\.js/g) || []).length === 2, 'main.js names scene/perf.js only at its anchor (the comment and the import)');
  ok(/if \(ctx\.latch && ctx\.latch\.held\) ctx\.wantPerf\(\);/.test(block), 'the loop asks for it only under ?look=1 (ctx.latch.held)');
  ok(/if \(ctx\.perf\) ctx\.perf\.frame\(nowReal, frameMs\);/.test(block), 'a drawn frame is counted only once sr.perf is there');
  // Nothing else in the site imports it.
  const files = [];
  (function walk(d) { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) { if (e !== 'vendor') walk(p); } else if (e.endsWith('.js')) files.push(p); } })(join(ROOT, 'site/js'));
  for (const f of files) {
    if (f.endsWith('/main.js') || f.endsWith('/scene/perf.js')) continue;
    ok(!/perf\.js['"]/.test(readFileSync(f, 'utf8')), `${f.slice(ROOT.length + 1)} must not import scene/perf.js: it is for tools`);
  }
  const src = read('site/js/scene/perf.js');
  ok(!/\bdocument\b|innerHTML|appendChild|localStorage|fetch\(|sendBeacon/.test(src.replace(/^\s*\/\/.*$/gm, '')), 'perf.js writes no DOM, keeps nothing and sends nothing');
  ok(!/^import /m.test(src), 'perf.js imports nothing: three.js stays out of its graph');
  ok(!KEYS.includes('perf'), 'no visitor URL key for it');
  ok(!/\bperf\b/.test(read('site/js/copy/en.js')), 'no words for a visitor: there is no panel');
}

// 4. The seed.
{
  const a = lookRandom(1, '?sw=0&look=1'); const b = lookRandom(1, '?look=1');
  const sa = Array.from({ length: 8 }, a); const sb2 = Array.from({ length: 8 }, b);
  ok(sa.every((x, i) => x === sb2[i]), 'two seeded randoms with one salt draw the same numbers');
  ok(sa.every((x) => x >= 0 && x < 1) && new Set(sa).size === 8, 'the seeded numbers are in [0, 1) and differ');
  const c = lookRandom(2, '?look=1');
  ok(c() !== lookRandom(1, '?look=1')(), 'another salt draws other numbers');
  ok(lookRandom(1, '') === Math.random && lookRandom(1, '?look=0') === Math.random, 'without ?look=1 it is Math.random');
  ok(lookRandom(1, '?embed=1&look=1') === Math.random, 'beside embed=1 it is Math.random');
  ok(/: lookRandom\(1\);/.test(read('site/js/scene/wind.js')), 'the wind takes the seeded random by default');
  ok(/import \{[^}]*lookRandom[^}]*\} from '\.\/wind\.js';/.test(read('site/js/scene/currents.js')) && /: lookRandom\(2\);/.test(read('site/js/scene/currents.js')), 'the currents take it by default');
  const ww = read('site/js/scene/weather/worldweather.js');
  ok(/rand = lookRandom\(3\) \} = \{\}\) \{/.test(ww), 'the weather\'s flashes take it by default');
  ok(/let a = \(76 \* 0x9e3779b1 \+ salt \* 0x85ebca6b\) >>> 0;/.test(ww) && LOOK_SEED === 76, 'the weather\'s copy is the wind\'s, on the release\'s seed');
  for (const f of ['site/js/scene/wind.js', 'site/js/scene/currents.js', 'site/js/scene/weather/worldweather.js', 'site/js/scene/models.js']) {
    const code = read(f).replace(/^\s*(\/\/|\*).*$/gm, '');
    ok(!/Math\.random\(\)/.test(code), `${f}: no direct Math.random() call (the default goes through lookRandom)`);
  }
}

// 5. The probe.
{
  const p = read('tests/probes/look/heroes.js');
  for (const h of ['earth', 'iss', 'moon', 'sun', 'jupiter', 'saturn', 'helix', 'm42', 'lmc', 'tarantula', 'm31', 'milkyway', 'horizon']) ok(new RegExp(`\\n  ${h}: `).test(p), `the heroes probe walks ${h}`);
  for (const at of ['far', 'middle', 'near', 'near-turn25']) ok(p.includes(`'${at}'`), `the heroes probe photographs each at ${at}`);
  ok(/sr\.clock\.goTo\(AT\);\s*\n\s*sr\.clock\.setPaused\(true\);/.test(p), 'the probe puts the clock at one instant and pauses it');
  ok(/ext\.loseContext\(\);/.test(p) && /ext\.restoreContext\(\);/.test(p), 'the probe takes the context away and gives it back');
  for (const k of ['object', 'stage', 'tier', 'look', 'exposure', 'seed', 'clock', 'p50Ms', 'p95Ms', 'calls', 'triangles', 'textures', 'gpuMiB', 'netBytes']) ok(new RegExp(`\\b${k}\\b`).test(p), `each scene writes ${k}`);
  ok(/\| `heroes` \|/.test(read('tools/README.md')) && !/\| `heroes` \| planned/.test(read('tools/README.md')), 'tools/README.md describes the heroes probe');
}

// 6. The summary's numbers (tools/look-summary.mjs): one table and scenes.csv with the commit.
{
  const out = { gl: 'SwiftShader', viewport: [1600, 900, 1], errors: [], warns: [], shots: [], scenes: [
    { name: '01-earth-far', object: 'earth', at: 'far', stage: 'earth', distance: '57,000 km', tier: 1, look: 'film', exposure: 'eye', seed: 76, clock: '2026-10-15T12:00:00.000Z', frames: 60, p50Ms: 120.5, p95Ms: 300, workP50Ms: 90, calls: 40, triangles: 1000, textures: 30, programs: 20, gpuMiB: 80.5, netBytes: 1234 },
    { name: 'x, "quoted"', medianMs: 50, cost: { calls: 3 } },
    { name: 'no frame time' },
  ] };
  ok(scenesOf(out).length === 2, 'scenesOf keeps the rows with a frame time');
  const csv = scenesCsv(out, { ref: 'abc123', probe: 'heroes' }).trim().split('\n');
  ok(csv[0] === CSV_COLUMNS.join(',') && csv.length === 3, 'scenes.csv: a header and one line a scene');
  ok(csv[1].startsWith('abc123,heroes,01-earth-far,earth,far,earth,"57,000 km",1,film,eye,76,') && csv[1].endsWith(',1600,900,1'), `scenes.csv carries the commit, the numbers and the window: ${csv[1]}`);
  ok(csv[2].startsWith('abc123,heroes,"x, ""quoted""",'), 'scenes.csv quotes a cell with a comma or a quote');
  const page = summarise({ out, errText: '', probe: 'heroes', browser: 'chromium', hold: 'true', ref: 'abc123' }).text;
  ok(page.includes('## Numbers per scene (2)') && page.includes('| 01-earth-far | earth | 57,000 km | 1 | film | 60 | 120.5 | 300 | 90 | 40 | 1,000 | 30 | 20 | 80.5 | 1,234 |'), 'summary.md has the numbers table');
  ok(!summarise({ out: { errors: [], warns: [], shots: [] }, errText: '' }).text.includes('Numbers per scene'), 'no table for a probe without scenes');
}

if (problems.length) {
  console.error(`test_perf: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('test_perf: ok (the shape, no allocation per frame, off unless asked, the seed, the heroes probe)');

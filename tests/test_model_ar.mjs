// "View in your room" on the one-model viewer (forge #559): site/model/arplan.js, words.js, ar.js, viewer.js.
//
//   node tests/test_model_ar.mjs
//
// Holds: the way into AR each kind of device gets (no button that would fail: no Scene Viewer for our meshopt files,
// no Quick Look without USDZ), the size arithmetic, the claim "real size" (every file of ours with a published size
// agrees with it, read from the .glb itself), the viewer's words in all eleven languages (the map's own translation
// rules), and the promises of docs/EMBEDDING.md: no third-party request, nothing stored, nothing sent, and ar.js
// fetched only on the press.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arWay, isIOS, arScale, offersRoom, sizeLine, agrees, widest, topUrl, ROOM_M } from '../site/model/arplan.js';
import { WORDS, pickWordsLanguage, fill, metres, LOCALES } from '../site/model/words.js';
import { LANGUAGES } from '../site/js/copy/lang.js';
import { compare } from '../scripts/check-translation.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
const check = (ok, what) => { if (!ok) { fails += 1; console.log(`FAIL: ${what}`); } };

// --- the way in -------------------------------------------------------------------------------------------------
check(arWay({ xr: true }) === 'webxr', 'WebXR immersive-ar on its own page: webxr');
check(arWay({ xr: true, framed: true, allowed: true }) === 'webxr', 'a frame that allows xr-spatial-tracking: webxr');
check(arWay({ xr: false, framed: true, allowed: false, android: true }) === 'open-top', 'Android in a frame that may not: open the viewer on its own page');
check(arWay({ xr: true, framed: true, allowed: false, android: true }) === 'open-top', 'even when the frame says it could: the frame may not');
check(arWay({ ios: true }) === 'ios', 'iPhone: the honest note, no button');
check(arWay({ ios: true, framed: true, allowed: false }) === 'ios', 'iPhone in a frame: still the note (the page on its own has no AR either)');
check(arWay({}) === 'how', 'a computer: where it works');
check(arWay({ android: true }) === 'how', 'Android without Google Play Services for AR: where it works');
check(isIOS('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X)'), 'an iPhone is iOS');
check(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5), 'an iPad asking for the desktop page is iOS');
check(!isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0), 'a Mac is not');
check(!isIOS('Mozilla/5.0 (Linux; Android 15; Pixel 9)'), 'Android is not');

// --- the size ---------------------------------------------------------------------------------------------------
check(widest({ x: 3, y: -7, z: 2 }) === 7, 'widest takes the largest side');
check(arScale('real', 109) === 1, 'real size is the file as it is (glTF metres)');
check(Math.abs(arScale('room', 30) - ROOM_M / 30) < 1e-12, 'room size brings 30 m to ROOM_M');
check(arScale('room', 0.3) === 1, 'room size never makes a CubeSat bigger');
check(!offersRoom(0.25) && offersRoom(13.2), 'the room switch only for a craft bigger than a room');
{
  const a = sizeLine('real', 13.2, 13.2), b = sizeLine('real', 0.25, null), c = sizeLine('room', 30, 29.9);
  check(a.key === 'arSizeReal' && a.m === 13.2, 'a published size: "real size"');
  check(b.key === 'arSizeOwn', 'no published size: "the size we built it", never "real"');
  check(c.key === 'arSizeRoom' && c.k === 20 && Math.abs(c.m - ROOM_M) < 1e-9, 'room size says how many times smaller');
}
check(agrees(13.2, 17.1) && agrees(0.585, 2.98) && !agrees(13.2, 1) && !agrees(13.2, 1320), 'agrees() refuses a file ten times off');
{
  const u = new URL(topUrl('https://www.spaceradar.ai/model/?id=hubble&bg=none'));
  check(u.searchParams.get('ar') === '1' && u.searchParams.get('id') === 'hubble' && u.searchParams.get('bg') === 'none', 'the own-page link keeps the address and adds ar=1');
}

// --- every file with a published size is drawn at it ------------------------------------------------------------
const NORM = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };
function local(n) {
  if (n.matrix) return n.matrix.slice();
  const [x, y, z, w] = n.rotation || [0, 0, 0, 1], [sx, sy, sz] = n.scale || [1, 1, 1], [tx, ty, tz] = n.translation || [0, 0, 0];
  return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1];
}
const mul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
function boxOf(file) {
  const b = readFileSync(file);
  const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8'));
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const walk = (i, P) => {
    const n = j.nodes[i], M = mul(P, local(n));
    if (n.mesh != null) for (const p of j.meshes[n.mesh].primitives) {
      const a = j.accessors[p.attributes.POSITION], d = a.normalized ? NORM[a.componentType] : 1;
      for (const cx of [a.min[0], a.max[0]]) for (const cy of [a.min[1], a.max[1]]) for (const cz of [a.min[2], a.max[2]]) {
        const v = [cx / d, cy / d, cz / d];
        for (let r = 0; r < 3; r++) {
          const w = M[r] * v[0] + M[4 + r] * v[1] + M[8 + r] * v[2] + M[12 + r];
          lo[r] = Math.min(lo[r], w); hi[r] = Math.max(hi[r], w);
        }
      }
    }
    for (const c of n.children || []) walk(c, M);
  };
  for (const r of j.scenes[j.scene || 0].nodes) walk(r, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  return { x: hi[0] - lo[0], y: hi[1] - lo[1], z: hi[2] - lo[2], ext: j.extensionsRequired || [] };
}
const index = JSON.parse(readFileSync(join(ROOT, 'site/model/models.json'), 'utf8')).models;
let sized = 0, quantised = 0;
for (const [id, m] of Object.entries(index)) {
  const box = boxOf(join(ROOT, 'site/models', m.file));
  if (box.ext.includes('KHR_mesh_quantization') || box.ext.includes('EXT_meshopt_compression')) quantised += 1;
  if (m.size_m == null) continue;
  sized += 1;
  check(agrees(m.size_m, widest(box)), `${id}: the file (${widest(box).toFixed(2)} m at its widest) agrees with the published ${m.size_m} m`);
}
check(sized >= 100, `at least 100 models carry a published size in the viewer's index (${sized})`);
// The reason Scene Viewer is not offered: its documented extensions are KHR_materials_unlit and KHR_texture_transform.
check(quantised === Object.keys(index).length, `every file requires an extension Scene Viewer does not list (${quantised}/${Object.keys(index).length})`);

// --- the words --------------------------------------------------------------------------------------------------
check(JSON.stringify(Object.keys(WORDS).sort()) === JSON.stringify(Object.keys(LANGUAGES).sort()), 'the viewer speaks exactly the app\'s languages (copy/lang.js)');
check(JSON.stringify(Object.keys(LOCALES).sort()) === JSON.stringify(Object.keys(LANGUAGES).sort()), 'a number locale for each');
for (const [code, w] of Object.entries(WORDS)) {
  if (code === 'en') continue;
  const out = compare(WORDS.en, w);
  for (const k of ['missing', 'extra', 'kind', 'placeholder']) check(out[k].length === 0, `${code}: ${k} ${out[k].join(', ')}`);
  for (const [k, v] of Object.entries(w)) check(typeof v === 'string' && v.trim() !== '', `${code}.${k} is words`);
}
for (const [k, v] of Object.entries(WORDS.en)) {
  if (['canvas', 'canvasNamed', 'arHow', 'arIos', 'noGlText', 'noIdText', 'noCatText', 'notOursText', 'noFileText', 'arFind', 'arMove'].includes(k)) continue;
  check(v.length <= 60, `en.${k}: a line of chrome is 60 characters or fewer (${v.length})`);
  check(!/!/.test(v), `en.${k}: no exclamation mark`);
}
check(pickWordsLanguage('?id=x&lang=de', ['fr']) === 'de', '?lang= wins');
check(pickWordsLanguage('?lang=pt-BR', []) === 'pt', 'pt-BR is pt');
check(pickWordsLanguage('?lang=xx', ['fr']) === 'en', 'an unknown ?lang= is English, as the map');
check(pickWordsLanguage('', ['uk-UA', 'en']) === 'uk', 'then the browser list');
check(fill(WORDS.en.arSizeReal, { m: '13.2' }) === 'Real size: 13.2 m at its widest', 'fill puts the size in');
check(metres(13.2, 'en') === '13', 'whole metres above ten');
check(metres(0.25, 'de') === '0,3', 'one decimal under ten, in the language\'s style');

// --- the promises -----------------------------------------------------------------------------------------------
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const viewer = read('site/model/viewer.js'), ar = read('site/model/ar.js'), plan = read('site/model/arplan.js'), words = read('site/model/words.js');
const page = read('site/model/index.html');
for (const [name, src] of [['viewer.js', viewer], ['ar.js', ar], ['arplan.js', plan], ['words.js', words]]) {
  check(!/https?:\/\/(?!models\.spaceradar\.ai)/.test(code(src)), `${name}: no third-party address in code`);
  check(!/localStorage|sessionStorage|indexedDB|document\.cookie/.test(code(src)), `${name}: stores nothing`);
  check(!/\bsrq\b|\bsr\(|sendBeacon/.test(code(src)), `${name}: sends nothing (an embed tracks nothing, docs/EMBEDDING.md)`);
  check(!/intent:\/\/|scene-viewer|rel=["']ar["']/.test(code(src)), `${name}: no Scene Viewer or Quick Look link (neither can read our files)`);
}
check(!/from '\.\/ar\.js'/.test(viewer) && /import\('\.\/ar\.js'\)/.test(viewer), 'ar.js is fetched only on the press (import())');
check(/requiredFeatures:\s*\['hit-test'\]/.test(ar) && /'immersive-ar'/.test(ar) && /dom-overlay/.test(ar), 'an immersive-ar session with hit-test and the overlay');
check(/beforexrselect/.test(ar), 'a press on the overlay is not a tap on the floor');
check(/href="\.\.\/css\/controls\.css"/.test(page), 'the page takes the kit\'s control set');
for (const idName of ['ar', 'arout', 'arinfo']) check(new RegExp(`id="${idName}"[^>]*hidden`).test(page), `#${idName} starts hidden (shown only for its way in)`);
check((page.match(/ui-btn--primary/g) || []).length === 2 && /way === 'webxr'[\s\S]*return;[\s\S]*way === 'open-top'[\s\S]*return;/.test(viewer),
  'one ember action: the AR button or its own-page link, never both');

console.log(`${fails ? 'FAIL' : 'PASS'}: test_model_ar (${fails} failed)`);
process.exit(fails ? 1 : 0);

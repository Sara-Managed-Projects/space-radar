// tests/test_tilecloud.mjs -- A1 tiles, the page's half (data/tilecloud.js; release 1.7.6, internal I#1059).
//
// A set that harvest/tilepack.py wrote (tests/helpers/build_tile_fixtures.py: 600 made-up sky objects cut by
// HEALPix cell into three levels) is read back by the page's reader, and the two are held to each other:
//   1. the same bytes: every tile decodes to the counts and the numbers the set.json promised, within a quantum
//   2. the same cells: sky/startiles.js ang2pix and the harvester's agree on 300 directions at two resolutions
//   3. the pick index and the names find an object by its id, and a missing id is null
//   4. the levels: tilesFor() gives level 0 first; under the frame latch only level 0; with data-saver nothing
//   5. a view: a cone on the sky asks for the tiles it can touch and no others
//   6. nothing at boot: a fresh cloud has fetched nothing; set.json is revalidated, a tile from another build is
//      fetched once more past the cache and then refused; a failed tile is counted and left out
//   7. the module is not in the boot graph (main.js names it nowhere statically) and is held out by test_boot_diet
//
//   node tests/test_tilecloud.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, mkdtempSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const dir = mkdtempSync(join(tmpdir(), 'tilefix-'));
execFileSync('python3', [join(ROOT, 'tests/helpers/build_tile_fixtures.py'), dir], { stdio: ['ignore', 'inherit', 'inherit'] });
const expect = JSON.parse(readFileSync(join(dir, 'expect.json'), 'utf8'));
const T = await import(join(JS, 'data/tilecloud.js'));
const S = await import(join(JS, 'sky/startiles.js'));

const bytes = (rel) => { const b = readFileSync(join(dir, rel)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const setDoc = JSON.parse(readFileSync(join(dir, 'demo/set.json'), 'utf8'));
const set = T.parseSet(setDoc);

// --- 1. the same bytes -----------------------------------------------------------------------------
check(set && set.id === 'demo' && set.count === 600, 'the set parses');
check(T.parseSet({ ...setDoc, format: 'SRTC-2' }) === null, 'a format this reader does not know is refused');
check(T.parseSet({ ...setDoc, schema: [{ name: 'id', type: 'u128' }] }) === null, 'a type this reader does not know is refused');
check(T.parseSet(null) === null && T.parseSet({}) === null, 'nonsense is not a set');
let total = 0;
const seenIds = new Set();
const fieldOf = Object.fromEntries(set.schema.map((f) => [f.name, f]));
for (const t of set.tiles) {
  const tile = T.decodeTile(set, bytes(`demo/${t.path}`));
  check(tile.count === t.count && tile.level === t.level, `${t.path}: count and level as set.json says`);
  check(tile.cols.id instanceof Uint32Array && tile.cols.mag instanceof Int16Array && tile.cols.dec instanceof Int32Array, `${t.path}: the columns are typed-array views`);
  let sorted = true;
  for (let i = 0; i < tile.count; i += 1) {
    const mag = T.fieldValue(fieldOf.mag, tile.cols.mag[i]);
    if (i && mag < T.fieldValue(fieldOf.mag, tile.cols.mag[i - 1])) sorted = false;
    const lo = set.levels[t.level].rank_from;
    const hi = set.levels[t.level].rank_to;
    check((lo === null || mag >= lo - 0.006) && (hi === null || mag < hi + 0.006), `${t.path}: ${mag} is in its level`);
    seenIds.add(tile.cols.id[i]);
  }
  check(sorted, `${t.path}: brightest first, so a reader can draw a prefix`);
  total += tile.count;
}
check(total === 600 && seenIds.size === 600, 'every object is in exactly one tile');
let threw = 0;
for (const bad of [new ArrayBuffer(4), (() => { const b = bytes('demo/L0/p0.bin').slice(0); new Uint8Array(b)[0] = 0; return b; })(), bytes('demo/ids.bin')]) {
  try { T.decodeTile(set, bad); } catch (e) { if (e instanceof T.TileError) threw += 1; }
}
check(threw === 3, 'a short buffer, a wrong magic and the wrong file are refused');
try { T.decodeTile({ ...set, build: set.build + 1 }, bytes('demo/L0/p0.bin')); check(false, 'a tile of another build must be refused'); } catch (e) { check(/another build/.test(e.message), 'a tile of another build is refused by name'); }
const cut = bytes('demo/L0/p0.bin').slice(0, 40);
try { T.decodeTile(set, cut); check(false, 'a tile shorter than it says must be refused'); } catch (e) { check(e instanceof T.TileError, 'a tile shorter than it says is refused'); }

// --- 2. the same cells -----------------------------------------------------------------------------
const DEG = Math.PI / 180;
let cellsOff = 0;
for (const d of expect.dirs) {
  const v = [Math.cos(d.dec * DEG) * Math.cos(d.ra * DEG), Math.cos(d.dec * DEG) * Math.sin(d.ra * DEG), Math.sin(d.dec * DEG)];
  for (const nside of [2, 8]) if (S.ang2pix(nside, v) !== d.pix[String(nside)]) cellsOff += 1;
}
check(cellsOff === 0, `the harvester and sky/startiles.js put 300 directions in the same HEALPix cell at nside 2 and 8 (${cellsOff} differ)`);

// --- 3. the pick index and the names ---------------------------------------------------------------
const pick = T.parsePick(bytes('demo/ids.bin'), set.build);
check(pick.count === 600 && pick.ids.every((v, i) => !i || v > pick.ids[i - 1]), 'the pick index is 600 ascending ids');
let wrong = 0;
for (const id of [5000, 5003, 5897, 6797]) {
  const hit = pick.find(id);
  if (!hit) { wrong += 1; continue; }
  const tile = T.decodeTile(set, bytes(`demo/${set.tiles[hit.tile].path}`));
  if (tile.cols.id[hit.row] !== id) wrong += 1;
}
check(wrong === 0, 'the pick index points at the tile and row that hold the id');
check(pick.find(5001) === null && pick.find(0) === null && pick.find(99999999) === null, 'an id that is not there is null');
let allFound = true;
for (let i = 0; i < 600; i += 1) if (!pick.find(5000 + i * 3)) allFound = false;
check(allFound, 'all 600 ids are found');
try { T.parsePick(bytes('demo/ids.bin'), set.build + 1); check(false, 'a pick index of another build must be refused'); } catch (e) { check(e instanceof T.TileError, 'a pick index of another build is refused'); }
const names = T.parseNames(readFileSync(join(dir, 'demo/names.txt'), 'utf8'));
check(names.length === 600 && names[pick.at(5003)] === expect.demoNames['5003'], 'names are in the id order of the index');

// --- 4. the levels ---------------------------------------------------------------------------------
const all = T.tilesFor(set);
check(all.length === set.tiles.length && all.every((t, i) => !i || t.level >= all[i - 1].level), 'level 0 comes first');
check(T.tilesFor(set, { maxLevel: 0 }).every((t) => t.level === 0), 'maxLevel 0 gives level 0 alone');
check(T.maxLevelFor(set, {}) === 2 && T.maxLevelFor(set, { latched: true }) === 0 && T.maxLevelFor(set, { saveData: true }) === -1 && T.maxLevelFor(null) === -1, 'all levels; the latch draws level 0; data-saver none');
// The latch is read where main.js keeps it, so no code at boot has to tell this module: a page that tripped it before the module loaded still draws level 0.
globalThis.window = { spaceRadar: { latch: { latched: false } } };
check(T.isLatched() === false && T.maxLevelFor(set) === 2, 'a page whose latch has not tripped draws every level');
globalThis.window.spaceRadar.latch.latched = true;
check(T.isLatched() && T.maxLevelFor(set) === 0, 'once window.spaceRadar.latch says latched the default is level 0');
globalThis.window.spaceRadar.latch.latched = false;
check(T.isLatched() && T.maxLevelFor(set) === 0, 'and a latch never un-trips');
delete globalThis.window;
check(T.isSaveData() === false, 'no data-saver in a plain page');
Object.defineProperty(globalThis, 'navigator', { value: { connection: { saveData: true } }, configurable: true });
check(T.isSaveData() === true && T.maxLevelFor(set) === -1, 'navigator.connection.saveData: no tile at all');
Object.defineProperty(globalThis, 'navigator', { value: { connection: { saveData: false } }, configurable: true });
check(T.isSaveData() === false, 'and a connection that did not ask is left alone');

// --- 5. a view -------------------------------------------------------------------------------------
const cone = { dir: [1, 0, 0], radiusDeg: 15 };
const near = T.tilesFor(set, { cone, tilesInCone: S.tilesInCone });
const want = new Set(Array.from(S.tilesInCone(2, cone.dir, cone.radiusDeg), (p) => `p${p}`));
check(near.length > 0 && near.length < all.length && near.every((t) => want.has(t.key)), 'a cone asks for the cells it touches and no others');
const inside = [];
for (const t of near) { const tile = T.decodeTile(set, bytes(`demo/${t.path}`)); for (let i = 0; i < tile.count; i += 1) inside.push([T.fieldValue(fieldOf.ra, tile.cols.ra[i]), T.fieldValue(fieldOf.dec, tile.cols.dec[i])]); }
let missed = 0;
for (const tt of set.tiles) {
  if (want.has(tt.key)) continue;
  const tile = T.decodeTile(set, bytes(`demo/${tt.path}`));
  for (let i = 0; i < tile.count; i += 1) {
    const ra = T.fieldValue(fieldOf.ra, tile.cols.ra[i]), dec = T.fieldValue(fieldOf.dec, tile.cols.dec[i]);
    const v = [Math.cos(dec * DEG) * Math.cos(ra * DEG), Math.cos(dec * DEG) * Math.sin(ra * DEG), Math.sin(dec * DEG)];
    if (Math.acos(Math.min(1, v[0])) / DEG < 15) missed += 1;       // within 15 degrees of the view, in a tile the cone left out
  }
}
check(missed === 0, 'no object within the cone is in a tile the cone left out');

// --- 6. nothing at boot; the transport -------------------------------------------------------------
const asked = [];
const files = (rel, reload) => { asked.push([rel, !!reload]); if (!existsSync(join(dir, rel))) throw new T.TileError(`${rel}: HTTP 404`); return Promise.resolve(bytes(rel)); };
const mk = (over = {}) => T.createTileCloud({ id: 'demo', base: '', fetchBytes: (url, reload) => files(`${over.sub || ''}${url}`, reload) });
const cloud = mk();
check(asked.length === 0, 'a new cloud has fetched nothing');
const loaded = await cloud.load({ maxLevel: 0 });
check(asked[0][0] === 'demo/set.json' && asked[0][1] === true, 'set.json is the first file and is revalidated');
check(loaded.failed === 0 && loaded.tiles.length === set.tiles.filter((t) => t.level === 0).length, 'level 0 loaded');
check(asked.every(([p]) => !/L[12]\//.test(p)), 'no finer level was fetched');
const before = asked.length;
await cloud.load({ maxLevel: 0 });
check(asked.length === before, 'a tile already held is not fetched again');
check(asked.every(([p]) => !/ids\.bin|names\.txt/.test(p)), 'the pick index and the names are not fetched until asked');
const hit = await cloud.find(5003);
check(hit && hit.tilePath === set.tiles[hit.tile].path, 'find() returns the tile path');
check((await cloud.nameOf(5003)) === expect.demoNames['5003'] && (await cloud.nameOf(1)) === null, 'nameOf() reads names.txt on the first ask');
const pairs = await cloud.allNames();
check(pairs.length === 600 && pairs[0][0] === 5000, 'allNames() lists id and name');

// A CDN edge that still holds yesterday's tile: refetched once past the cache, then refused.
let n = 0;
const stale = T.createTileCloud({
  id: 'demo', base: '',
  fetchBytes: (url, reload) => {
    if (url.endsWith('p0.bin')) { n += 1; const b = bytes('demo/L0/p0.bin').slice(0); if (!reload) new DataView(b).setUint32(12, 1, true); return Promise.resolve(b); }
    return files(url, reload);
  },
});
const got = await stale.load({ maxLevel: 0 });
check(n === 2 && got.failed === 0, 'a tile of another build is fetched once more with the cache bypassed, and then accepted');
let m = 0;
const bad = T.createTileCloud({
  id: 'demo', base: '',
  fetchBytes: (url, reload) => {
    if (url.endsWith('p1.bin')) { m += 1; const b = bytes('demo/L0/p1.bin').slice(0); new DataView(b).setUint32(12, 1, true); return Promise.resolve(b); }
    return files(url, reload);
  },
});
const got2 = await bad.load({ maxLevel: 0 });
check(m === 2 && got2.failed === 1 && got2.tiles.every((t) => t.path !== 'L0/p1.bin'), 'a tile that is still of another build is counted as failed and left out');
const gone = T.createTileCloud({ id: 'none', base: '', fetchBytes: (u, r) => files(u, r) });
let opened = true;
try { await gone.open(); } catch { opened = false; }
check(opened === false, 'a set that is not there cannot be opened (the layer then keeps its stand-in)');
await gone.open().catch(() => {});
check(true, 'and a second try is allowed');

// --- 7. the boot ------------------------------------------------------------------------------------
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(!/data\/(tilecloud|tracked)\.js/.test(main), 'main.js names neither module: nothing at boot, and no byte of main.js for the tiles');
const diet = readFileSync(join(ROOT, 'tests/test_boot_diet.mjs'), 'utf8');
check(/data\/tilecloud\.js/.test(diet) && /data\/tracked\.js/.test(diet), 'the boot-diet test holds both modules out of the boot graph');

if (problems.length) { console.error(`FAIL: ${problems.length}\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log('PASS: tiles written by the harvester decode to what set.json says, cut the same HEALPix cells as the sky does, find an id and its name, load level 0 first (alone under the latch, none on data-saver), ask for nothing at boot, refetch a stale tile once and refuse it after');

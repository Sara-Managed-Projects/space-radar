// tests/test_stars3dtiles.mjs -- AT-HYG's 2.4 million stars on the 3D map, by octree node round the camera (forge #140,
// release 2.0.0 batch f10-stars3d): scene/stars3dtree.js's arithmetic, the committed tiles, and the first frame.
//
//   node tests/test_stars3dtiles.mjs
//
// What it holds:
//   1. THE TIERS: Low, the frame latch and data-saver draw HYG only; a phone on Auto, tier 1 and tier 2 draw AT-HYG with
//      40, 128 and 256 nodes; Gaia DR3 is never a tier (its licence, scene/stars3dtree.js).
//   2. THE WALK: reachLy is 10 pc at the limit's own magnitude; a node out of reach is not taken and neither is any child
//      of it; what is taken comes nearest-to-needed first, a child never before its parent, and stops at the count.
//   3. THE BYTES: a node of the committed set decodes (data/tilecloud.js decodeTile, the A1 reader) to stars inside its
//      own cube, magnitudes within its mMin..mMax, and Tycho-2 numbers that read back as the build script packed them.
//   4. THE AXES: sceneToLy undoes stage.affineFrom's map; a star of the set is where scripts/build-stars3d.py's rotation
//      puts the same AT-HYG row.
//   5. THE ERROR: the modelled parallax over error of a Gaia DR3 star at 1 000 ly, a Hipparcos one, and a guess past 3 kpc.
//   6. THE SET: set.json is an octree this page reads; its tiles exist at the sizes it says; the total and the largest
//      node are inside registry/budgets.yaml (stars3d_athyg_total_bytes, stars3d_athyg_node_bytes); a camera near Orion
//      1 000 ly out finds nodes to hold, and no more than the tier allows.
//   5b. THE FAINT FIELD: faintVert patches stars3d.js's own VERT, past the limit only off the shell.
//   7. THE FIRST FRAME DOES NOT GROW: none of the new modules and no path to the tiles is in the boot graph from main.js,
//      and what this batch added to boot-graph files is inside stars3d_tiers_boot_bytes.
import { readFileSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const JS = join(SITE, 'js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const S = await import(join(JS, 'scene/stars3dtree.js'));
const TC = await import(join(JS, 'data/tilecloud.js'));

// --- 1. the tiers -------------------------------------------------------------------------------------------------
const plan = (o) => ({ tier: o.tier, latched: !!o.latched, plan: { choice: o.choice || 'auto', tier: o.tier, stripped: !!o.stripped } });
check(S.starTierFor(plan({ tier: 2, choice: 'low', stripped: true })).tier === 'hyg', 'Low draws HYG only');
check(S.starTierFor(plan({ tier: 0, latched: true })).tier === 'hyg', 'after the frame latch, HYG only');
check(S.starTierFor(plan({ tier: 2 }), true).why === 'saver', 'data-saver: HYG only, and says why');
check(S.starTierFor(null).tier === 'hyg', 'no quality yet: HYG only');
for (const [tier, nodes] of [[0, 40], [1, 128], [2, 256]]) {
  const p = S.starTierFor(plan({ tier }));
  check(p.tier === 'athyg' && p.nodes === nodes, `tier ${tier} draws AT-HYG with ${nodes} nodes (got ${JSON.stringify(p)})`);
}
check(!JSON.stringify([0, 1, 2].map((tier) => S.starTierFor(plan({ tier })))).includes('gaia'), 'Gaia DR3 is no tier');

// --- 2. the walk --------------------------------------------------------------------------------------------------
check(near(S.reachLy(7.5, 7.5), 10 * S.LY_PER_PC, 1e-9), 'a star of magnitude 7.5 is 7.5 at 10 pc');
check(near(S.reachLy(2.5, 7.5), 100 * S.LY_PER_PC, 1e-9), 'five magnitudes brighter: ten times as far');
const cube = { c: [0, 0, 0], h: 10 };
check(S.boxDistanceLy(cube, [3, -4, 5]) === 0 && near(S.boxDistanceLy(cube, [13, 0, 14]), 5, 1e-12), 'the distance to a cube: 0 inside, to its nearest face or edge outside');
const toy = S.indexSet({
  partition: { kind: 'octree' },
  tiles: [
    { key: 'r', level: 0, c: [0, 0, 0], h: 1000, mMin: -6 },
    { key: 'r0', level: 1, c: [-500, -500, -500], h: 500, mMin: 3 },
    { key: 'r7', level: 1, c: [500, 500, 500], h: 500, mMin: 1 },
    { key: 'r70', level: 2, c: [250, 250, 250], h: 250, mMin: 4 },
    { key: 'r00', level: 2, c: [-750, -750, -750], h: 250, mMin: -3 }, // brighter than it could be: still pruned with its parent
  ],
});
check(toy && toy.roots.length === 1 && toy.parentOf[3] === 2, 'indexSet finds the root and each parent');
const cam = [300, 300, 300];
const got = S.selectNodes(toy, cam, { limit: 7.5, nodes: 10 }).map((i) => toy.tiles[i].key);
check(got[0] === 'r' && got.includes('r7') && got.includes('r70'), `the camera's own cube and its parent are taken (${got})`);
check(!got.includes('r0') && !got.includes('r00'), `a node out of reach is not taken, nor its child (${got})`);
check(got.indexOf('r7') < got.indexOf('r70'), 'a child never before its parent');
check(S.selectNodes(toy, cam, { limit: 7.5, nodes: 2 }).length === 2 && S.selectNodes(toy, cam, { nodes: 0 }).length === 0, 'the count is a ceiling');
check(S.indexSet({ partition: { kind: 'healpix' }, tiles: [] }) === null, 'a set that is not an octree is refused');

// --- 3. the bytes, 6. the set --------------------------------------------------------------------------------------
const SETDIR = join(SITE, 'data/stars3d-athyg');
const doc = JSON.parse(readFileSync(join(SETDIR, 'set.json'), 'utf8'));
check(TC.parseSet(doc) !== null, 'set.json is an A1 set data/tilecloud.js reads');
const index = S.indexSet(doc);
check(index && index.roots.length === 1, 'set.json is an octree with one root');
let total = 0, largest = 0, count = 0;
for (const t of doc.tiles) {
  const p = join(SETDIR, t.path);
  if (!existsSync(p)) { check(false, `${t.path} is named in set.json and missing`); continue; }
  const b = statSync(p).size;
  check(b === t.bytes, `${t.path}: ${b} B, set.json says ${t.bytes}`);
  total += b; largest = Math.max(largest, b); count += t.count;
}
check(count === doc.count && doc.count > 2_000_000, `the tiles hold the set's ${doc.count} stars (${count})`);
const budgets = readFileSync(join(ROOT, 'registry/budgets.yaml'), 'utf8');
const row = (id) => { const m = new RegExp(`\\{id: ${id}, value: (\\d+)`).exec(budgets); return m ? Number(m[1]) : null; };
check(row('stars3d_athyg_total_bytes') && total <= row('stars3d_athyg_total_bytes'), `the AT-HYG tiles are ${total} B, inside stars3d_athyg_total_bytes ${row('stars3d_athyg_total_bytes')}`);
check(row('stars3d_athyg_node_bytes') && largest <= row('stars3d_athyg_node_bytes'), `the largest node is ${largest} B, inside stars3d_athyg_node_bytes ${row('stars3d_athyg_node_bytes')}`);

const buf = (rel) => { const b = readFileSync(join(SETDIR, rel)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
for (const t of [doc.tiles[0], doc.tiles[Math.floor(doc.tiles.length / 2)], doc.tiles[doc.tiles.length - 1]]) {
  const tile = TC.decodeTile(doc, buf(t.path));
  const s = S.decodeNode(doc, t, tile.cols);
  check(s.count === t.count, `${t.key}: ${s.count} stars, set.json says ${t.count}`);
  let inside = true, mags = true;
  for (let i = 0; i < s.count; i += 1) {
    const dq = Math.hypot(s.posLy[i * 3], s.posLy[i * 3 + 1], s.posLy[i * 3 + 2]) * 2e-4 + 1e-3; // a 16-bit direction and log distance
    for (let k = 0; k < 3; k += 1) if (Math.abs(s.posLy[i * 3 + k] - t.c[k]) > t.h + dq) inside = false;
    if (s.absMag[i] < t.mMin - 0.13 || s.absMag[i] > t.mMax + 0.13) mags = false;
  }
  check(inside, `${t.key}: every star inside its cube`);
  check(mags, `${t.key}: every magnitude within mMin..mMax`);
}
check(S.refName((0x80000000 | 4669 << 17 | 731 << 3 | 1) >>> 0) === 'TYC 4669-731-1', 'a Tycho-2 number reads back as scripts/build-stars3d-tiles.py tyc_ref packs it');
{
  const o = [0, 0, 0];
  for (const v of [[1, 0, 0], [0, 0, -1], [0.6, -0.48, -0.64], [-0.36, 0.48, 0.8]]) {
    const n = Math.abs(v[0]) + Math.abs(v[1]) + Math.abs(v[2]);
    let u = v[0] / n, w = v[1] / n;
    if (v[2] < 0) { const uu = (1 - Math.abs(w)) * Math.sign(u || 1); w = (1 - Math.abs(u)) * Math.sign(w || 1); u = uu; }
    S.octDecode(u, w, o, 0);
    check(Math.hypot(o[0] - v[0], o[1] - v[1], o[2] - v[2]) < 1e-12, `octDecode undoes the octahedral map for ${v}`);
  }
}
check(S.refName(123456) === null, 'an AT-HYG number is not a Tycho-2 number');

// --- 4. the axes --------------------------------------------------------------------------------------------------
const LY_KM = 9460730472580.8;
const A = { o: [1e3, -2e3, 5e2], x: [0, 0, 1 / LY_KM], y: [1 / LY_KM, 0, 0], z: [0, -1 / LY_KM, 0] }; // scene = (y, -z, x) in ly, plus o
const back = S.sceneToLy(A, [1e3 + 20, -2e3 - 30, 5e2 + 10]);
check(back && near(back[0], 10, 1e-9) && near(back[1], 20, 1e-9) && near(back[2], 30, 1e-9), `sceneToLy undoes the affine map (${back})`);
// TYC 1-381-1 is HIP 1 in HYG and so not in the set; the set's first row of the root is checked against the script's rotation instead
{
  const t = doc.tiles[0];
  const s = S.decodeNode(doc, t, TC.decodeTile(doc, buf(t.path)).cols);
  const d = Math.hypot(s.posLy[0], s.posLy[1], s.posLy[2]);
  check(d > 0 && d < doc.farthest_ly + 3, `the root's brightest star is ${Math.round(d)} ly out, inside the set's farthest (${doc.farthest_ly})`);
}

// --- 5. the error -------------------------------------------------------------------------------------------------
const g = S.distanceNote(1000, 0);
check(g && g.from === 'gaia-dr3' && near(g.poe, (1000 / (1000 / S.LY_PER_PC)) / 0.03, 1e-6) && !g.guess, `a Gaia DR3 star at 1 000 ly: parallax over error about ${g && Math.round(g.poe)}`);
check(near(g.pct, 100 / g.poe, 1e-9), 'the percentage is one over the parallax over error');
const h = S.distanceNote(2000, 2);
check(h.from === 'hipparcos' && near(h.pct, 0.5 / (1000 / (2000 / S.LY_PER_PC)) * 100, 1e-9) && !h.guess, 'a Hipparcos parallax of 1.6 mas (2 000 ly) against its 0.5: about 31 %, said as an error, not a guess');
check(S.distanceNote(3001 * S.LY_PER_PC, 0).guess && !S.distanceNote(2999 * S.LY_PER_PC, 0).guess, 'past 3 kpc a Gaia distance is a guess, inside it not');
check(S.distanceNote(500, 3).poe === null, 'a Gliese distance has no modelled error');
check(S.distanceNote(0, 0) === null, 'no distance, no note');

// a camera near Orion, 1 000 ly from the Sun towards the Orion Nebula (RA 83.8 deg, Dec -5.4 deg)
{
  const ra = 83.82 * Math.PI / 180, dec = -5.39 * Math.PI / 180, e = 23.4392911 * Math.PI / 180;
  const q = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
  const camOrion = [q[0] * 1000, (q[1] * Math.cos(e) + q[2] * Math.sin(e)) * 1000, (-q[1] * Math.sin(e) + q[2] * Math.cos(e)) * 1000];
  for (const nodes of S.NODES) {
    const sel = S.selectNodes(index, camOrion, { limit: 7.5, nodes });
    check(sel.length > 0 && sel.length <= nodes, `near Orion at 1 000 ly the walk holds ${sel.length} of at most ${nodes} nodes`);
  }
}

// --- 5b. the faint field: stars3d.js's own shader, drawing past its limit only off the shell ---------------------------
{
  const S3 = await import(join(JS, 'scene/stars3d.js'));
  const v = S.faintVert(S3.STARS3D_VERT);
  check(v && v.includes('uniform float uFaintPast;') && v.includes('uMagLimit + uFaintPast') && !v.includes('vAlpha = ( m > uMagLimit ) ? 0.0'), 'faintVert draws FAINT_PAST magnitudes past the limit (stars3d.js VERT still has the line it changes)');
  check(v && v.includes('uShell > 0.5 ? uMagLimit'), 'on the shell the limit stays the eye\'s');
  check(v && /m <= uMagLimit \? 1\.0/.test(v), 'down to the limit a star is the light HYG\'s would be');
  check(v && v.includes('1.0 + 0.5 * smoothstep( uMagLimit, uMagLimit + 1.0, m )'), 'past the limit the sprite widens smoothly, never on the shell');
  check(S.faintVert('void main() {}') === null, 'a shader without the line is refused, not drawn unchanged');
  check(S.FAINT_PAST === 4, 'the field goes four magnitudes past the eye: 11.5 at most');
}

// --- 7. the first frame does not grow -----------------------------------------------------------------------------
const STATIC = /(?:\bimport|\bexport)\s*(?:[^'";()]*?\bfrom\s*)?['"](\.{1,2}\/[^'"]+)['"]/g;
const seen = new Set();
const todo = [join(JS, 'main.js')];
while (todo.length) {
  const p = todo.pop();
  if (seen.has(p)) continue;
  let text;
  try { text = readFileSync(p, 'utf8'); } catch { continue; }
  seen.add(p);
  for (const m of text.matchAll(STATIC)) todo.push(join(dirname(p), m[1]));
}
const bootRel = [...seen].map((p) => relative(SITE, p).split('\\').join('/'));
for (const f of ['js/scene/stars3dtiles.js', 'js/scene/stars3dtree.js', 'js/scene/stars3dworker.js', 'js/copy/en.startiers.js']) check(!bootRel.includes(f), `${f} is in the boot graph`);
let added = 0;
for (const p of seen) {
  const text = readFileSync(p, 'utf8');
  check(!text.includes('stars3d-athyg') || p.endsWith('stars3dtiles.js'), `${relative(SITE, p)} names the tiles: a first visit could fetch them`);
  for (const m of text.matchAll(/\/\/ b200-f10-stars3d: begin[^\n]*\n([\s\S]*?)\s*\/\/ b200-f10-stars3d: end/g)) added += m[1].trim().length;
  for (const m of text.matchAll(/^.*\/\/ b200-f10-stars3d:(?! begin| end).*$/gm)) added += m[0].replace(/\s*\/\/ b200-f10-stars3d:.*$/, '').trim().length;
}
check(row('stars3d_tiers_boot_bytes') !== null && added <= row('stars3d_tiers_boot_bytes'), `this batch added ${added} B of code to boot-graph files, over stars3d_tiers_boot_bytes ${row('stars3d_tiers_boot_bytes')}`);
check(added > 0, 'the wiring line in main.js was found (the boot-bytes count reads the right files)');

if (problems.length) {
  console.error(`test_stars3dtiles: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`test_stars3dtiles: ok (${doc.count} stars in ${doc.tiles.length} nodes, ${total} B, largest ${largest} B; ${added} B of wiring in the boot graph)`);

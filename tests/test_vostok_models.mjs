// tests/test_vostok_models.mjs -- the four Vostok models of the Moments (release 1.5.0, stage r15-c2, internal spec 0079, #1051).
//
// The contract (~/space-radar-handoff/release-1.5/moments-contract.md, binding on C1 to C4): every separable part of a vehicle is its
// own NAMED NODE of the file, listed in the registry row's `parts:` in flight order, with the part's origin (the part's centre of mass,
// roughly) in the row's `attach:` in metres from the vehicle's origin. The Moments player finds a part by its node name and plays a
// track on it, so a part renamed in the file, a part dropped from the row or an origin that drifted from the file breaks a story and
// nothing else notices. Held here, with no browser and no decoder (node names and translations live in the glTF's JSON chunk):
//
//   1. every part the row lists is a node of the file, and no part node is left out of the row;
//   2. the node's translation (a part under a group: the group's added) is the row's `attach` for it, to a centimetre;
//   3. every mesh under a part is named for its surface (`body`, `foil`, `solar-panel`: scene/pbr.js roleOf reads it);
//   4. the triangle count is within the row's `budget_tris`, a flagship says `flagship: true`, and the row says how it was made;
//   5. the launcher is the height the published drawing gives (38.246 m) and stands on y = 0, from the nodes' own accessors.
//
//   node tests/test_vostok_models.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const yaml = readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8');

function glbJson(path) {
  const b = readFileSync(path);
  if (b.readUInt32LE(0) !== 0x46546c67 || b.readUInt32LE(4) !== 2) throw new Error(path + ' is not a binary glTF 2');
  const len = b.readUInt32LE(12);
  if (b.readUInt32LE(16) !== 0x4e4f534a) throw new Error('the first chunk is not JSON');
  return JSON.parse(b.slice(20, 20 + len).toString('utf8'));
}
const rowOf = (id) => (yaml.split('\n').find((l) => l.startsWith(`  - {id: ${id}, file:`)) || '');
const listOf = (row, key) => { const m = new RegExp(`[ ,{]${key}: \\[([^\\]]*)\\]`).exec(row); return m ? m[1].split(',').map((s) => s.trim()).filter(Boolean) : null; };
const attachOf = (row) => {
  const i = row.indexOf(' attach: {');
  if (i < 0) return null;
  let depth = 0, j = row.indexOf('{', i);
  const start = j;
  for (; j < row.length; j++) { if (row[j] === '{') depth++; else if (row[j] === '}' && --depth === 0) break; }
  const out = {};
  for (const m of row.slice(start, j + 1).matchAll(/([\w-]+): \[([-\d.e, ]+)\]/g)) out[m[1]] = m[2].split(',').map(Number);
  return out;
};

const WANT = {
  'r7-8k72k': { parts: ['boosters-4', 'core-stage', 'blok-e', 'fairing'], under: { 'boosters-4': ['booster-b', 'booster-v', 'booster-g', 'booster-d'] }, flagship: true },
  'vostok-3ka': { parts: ['vostok-antennas', 'vostok-hatch', 'vostok-sm-sphere', 'vostok-im'], flagship: true },
  'vostok-seat': { parts: ['vostok-seat', 'vostok-pilot'] },
  'vostok-chutes': { parts: ['chute-sa-drogue', 'chute-sa-brake', 'chute-sa-main', 'chute-pilot-drogue', 'chute-pilot-main', 'chute-pilot-reserve'] },
};
const ROLES = new Set(['body', 'foil', 'solar-panel']);
let notes = [];
for (const [id, want] of Object.entries(WANT)) {
  const row = rowOf(id);
  check(row.length > 0, `${id} has no real_models row`);
  if (!row) continue;
  const parts = listOf(row, 'parts');
  check(JSON.stringify(parts) === JSON.stringify(want.parts), `${id}: the row's parts are ${JSON.stringify(parts)}, the contract's list for it is ${JSON.stringify(want.parts)}`);
  const attach = attachOf(row) || {};
  const gltf = glbJson(join(ROOT, `site/models/${id}.glb`));
  const nodes = gltf.nodes || [];
  const byName = new Map();
  const top = new Set(gltf.scenes[gltf.scene || 0].nodes);
  // world translation of every named node (no rotation or scale is on a part node, which the next check holds)
  const world = new Map();
  const walk = (i, base) => {
    const n = nodes[i];
    const t = n.translation || [0, 0, 0];
    check(!n.rotation && !n.scale && !n.matrix || ROLES.has(n.name) || /^body|^foil|^solar/.test(n.name || ''), `${id}: the part node ${n.name} carries a rotation or a scale`);
    const w = [base[0] + t[0], base[1] + t[1], base[2] + t[2]];
    if (n.name && !n.mesh && n.name !== undefined) { byName.set(n.name, i); world.set(n.name, w); }
    for (const c of n.children || []) walk(c, w);
  };
  for (const i of top) walk(i, [0, 0, 0]);
  const everyone = [...want.parts, ...Object.values(want.under || {}).flat()];
  for (const p of everyone) {
    check(byName.has(p), `${id}: no node named ${p}`);
    const a = attach[p];
    check(Array.isArray(a), `${id}: the row's attach has no origin for ${p}`);
    const w = world.get(p);
    if (a && w) check(Math.hypot(a[0] - w[0], a[1] - w[1], a[2] - w[2]) < 0.01, `${id}: ${p} is at ${w.map((x) => x.toFixed(3))} in the file and the row says ${a}`);
  }
  for (const p of want.parts) check(top.has(byName.get(p)), `${id}: part ${p} is not a top-level node`);
  for (const [g, kids] of Object.entries(want.under || {})) for (const k of kids) check((nodes[byName.get(g)].children || []).includes(byName.get(k)), `${id}: ${k} is not under ${g}`);
  // every mesh is named for its surface; the triangles
  let tris = 0;
  for (const m of gltf.meshes || []) {
    check(ROLES.has(m.name), `${id}: a mesh is named ${m.name}, not a surface role`);
    for (const p of m.primitives) tris += gltf.accessors[p.indices].count / 3;
  }
  const budget = Number((/budget_tris: (\d+)/.exec(row) || [])[1] || 0);
  check(tris > 1000 && tris <= budget, `${id}: ${tris} triangles against a budget of ${budget}`);
  check(!want.flagship || /flagship: true/.test(row), `${id}: over the 20 000 cap and not a flagship`);
  check(/kind: built-from-dimensions/.test(row) && /origin: built/.test(row) && /look: pbr/.test(row), `${id}: the row does not say it is built, in the physically based look`);
  check(/No mirror pass/.test(row), `${id}: the row does not say whether a mirror pass was made`);
  notes.push(`${id} ${tris} tris in ${want.parts.length} parts`);
  if (id === 'r7-8k72k') {
    // the stack's height from the positions' accessor bounds (they are quantised: min and max are in the file's own units, and the
    // part nodes carry the offsets, so the fairing's tip is its node's y plus its mesh node's y plus the accessor's max)
    let top_y = -1e9, low_y = 1e9;
    const sum = (i, base, acc) => {
      const n = nodes[i];
      const y = base + ((n.translation || [0, 0, 0])[1]);
      if (n.mesh !== undefined) {
        for (const p of gltf.meshes[n.mesh].primitives) {
          const a = gltf.accessors[p.attributes.POSITION];
          // a normalised-integer accessor is decoded by the node's scale (KHR_mesh_quantization): the node carries it
          const s = (n.scale || [1, 1, 1])[1];
          const sc = a.normalized ? (a.componentType === 5122 ? 1 / 32767 : a.componentType === 5120 ? 1 / 127 : a.componentType === 5123 ? 1 / 65535 : 1 / 255) : 1;
          top_y = Math.max(top_y, y + a.max[1] * sc * s); low_y = Math.min(low_y, y + a.min[1] * sc * s);
        }
      }
      for (const c of n.children || []) sum(c, y, acc);
    };
    for (const i of top) sum(i, 0, null);
    check(Math.abs(top_y - 38.246) < 0.2 && Math.abs(low_y) < 0.1, `r7-8k72k: the stack runs from y = ${low_y.toFixed(2)} to ${top_y.toFixed(2)}; the drawing gives 38.246 m standing on 0`);
  }
}
if (problems.length) { console.error('vostok models FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('vostok models ok: ' + notes.join('; ') + '; every part is its own named node at the origin its row gives');

#!/usr/bin/env node
// 0079 B2 (internal #1066): the shapes of Saturn's small moons, as small .glb files, from the shape models the Cassini imaging
// team delivered to the Planetary Data System.
//
//   cd "$(mktemp -d)" && npm i --silent meshoptimizer@1.3.0
//   MESHOPT_DIR=<that directory>/node_modules/meshoptimizer node scripts/gen_smallmoon_shapes.mjs [--only name ...] [--src DIR] [--out DIR]
//
// Reads each model from SRC (default ~/.cache/spaceradar-src/b2/raw/<name>/, one download per directory; scripts/fetch-small-moon-sources.sh
// lists the URLs), welds it on position, winds every triangle outward, thins it by meshoptimizer's quadric-error simplifier to the
// triangle budget below and writes site/models/moon-<name>.glb in the model's own axes (kilometres, +z the pole), positions as
// normalised 16-bit integers, normals 8-bit, EXT_meshopt_compression: the layout scripts/gen_smallbody_shapes.py writes, minus
// the baked normal map (that script needs xatlas, which is not at hand where these were made; the 30 000-plate sources are thinned
// by at most half, and the volume of each is held to 1 % of the source's). Prints each moon's counts, volume and extent against
// the source's and writes scripts/data/smallmoon-shapes.json. No random numbers: the same inputs give the same files.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

// name -> output file, source file, triangles after thinning (null: the source's own)
export const MOONS = {
  atlas: { out: 'moon-atlas', file: 'atlas_30k_plt.tab.obj', tris: 16000 },
  calypso: { out: 'moon-calypso', file: 'calypso_30k_plt.tab.obj', tris: 16000 },
  daphnis: { out: 'moon-daphnis', file: 'daphnis_30k_plt.tab.obj', tris: 16000 },
  epimetheus: { out: 'moon-epimetheus', file: 'epimetheus_30k_plt.tab.obj', tris: 16000 },
  helene: { out: 'moon-helene', file: 'helene_30k_plt.tab.obj', tris: 16000 },
  hyperion: { out: 'moon-hyperion', file: 'hyperion_30k_plt.tab.obj', tris: 16000 },
  janus: { out: 'moon-janus', file: 'janus_30k_plt.tab.obj', tris: 16000 },
  pan: { out: 'moon-pan', file: 'pan_30k_plt.tab.obj', tris: 16000 },
  pandora: { out: 'moon-pandora', file: 'pandora_30k_plt.tab.obj', tris: 16000 },
  prometheus: { out: 'moon-prometheus', file: 'prometheus_30k_plt.tab.obj', tris: 16000 },
  telesto: { out: 'moon-telesto', file: 'telesto_30k_plt.tab.obj', tris: 16000 },
};

function readObj(path) {
  const v = [];
  const f = [];
  for (const ln of readFileSync(path, 'utf8').split('\n')) {
    const p = ln.trim().split(/\s+/);
    if (p[0] === 'v') v.push(+p[1], +p[2], +p[3]);
    else if (p[0] === 'f') f.push(...p.slice(1, 4).map((x) => parseInt(x, 10) - 1));
  }
  return { v: Float64Array.from(v), f: Uint32Array.from(f) };
}

/** Vertices that coincide to a metre are one (an OBJ written from a grid repeats its seam and its poles); degenerate triangles dropped; unused vertices dropped. */
function weld({ v, f }) {
  const key = new Map();
  const remap = new Int32Array(v.length / 3);
  const keep = [];
  for (let i = 0; i < remap.length; i++) {
    const k = `${Math.round(v[3 * i] * 1000)},${Math.round(v[3 * i + 1] * 1000)},${Math.round(v[3 * i + 2] * 1000)}`;
    let j = key.get(k);
    if (j === undefined) { j = keep.length / 3; key.set(k, j); keep.push(v[3 * i], v[3 * i + 1], v[3 * i + 2]); }
    remap[i] = j;
  }
  const tri = [];
  for (let t = 0; t < f.length; t += 3) {
    const a = remap[f[t]], b = remap[f[t + 1]], c = remap[f[t + 2]];
    if (a !== b && b !== c && a !== c) tri.push(a, b, c);
  }
  return compact({ v: Float64Array.from(keep), f: Uint32Array.from(tri) });
}

function compact({ v, f }) {
  const used = new Int32Array(v.length / 3).fill(-1);
  let n = 0;
  for (const i of f) if (used[i] < 0) used[i] = n++;
  const out = new Float64Array(3 * n);
  for (let i = 0; i < used.length; i++) if (used[i] >= 0) out.set(v.subarray(3 * i, 3 * i + 3), 3 * used[i]);
  return { v: out, f: f.map((i) => used[i]) };
}

export function volume({ v, f }) {
  let s = 0;
  for (let t = 0; t < f.length; t += 3) {
    const a = 3 * f[t], b = 3 * f[t + 1], c = 3 * f[t + 2];
    s += v[a] * (v[b + 1] * v[c + 2] - v[b + 2] * v[c + 1]) - v[a + 1] * (v[b] * v[c + 2] - v[b + 2] * v[c]) + v[a + 2] * (v[b] * v[c + 1] - v[b + 1] * v[c]);
  }
  return s / 6;
}

/** Each of these bodies is star-shaped from its centre, so a triangle whose geometric normal points toward the centre is wound the wrong way and is
 *  flipped; returns the mesh and how many were. (None of the eleven plate models has one: the 50 % of normals the contract test found facing
 *  into their triangles was the writer's, which renumbered the triangles twice. This stays as the guard.) */
function orient(m) {
  const { v } = m;
  const c = [0, 0, 0];
  for (let i = 0; i < v.length; i += 3) for (let k = 0; k < 3; k++) c[k] += v[i + k] / (v.length / 3);
  const f = m.f.slice();
  let flipped = 0;
  for (let t = 0; t < f.length; t += 3) {
    const a = 3 * f[t], b = 3 * f[t + 1], d = 3 * f[t + 2];
    const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2];
    const wx = v[d] - v[a], wy = v[d + 1] - v[a + 1], wz = v[d + 2] - v[a + 2];
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const mx = (v[a] + v[b] + v[d]) / 3 - c[0], my = (v[a + 1] + v[b + 1] + v[d + 1]) / 3 - c[1], mz = (v[a + 2] + v[b + 2] + v[d + 2]) / 3 - c[2];
    if (nx * mx + ny * my + nz * mz < 0) { const x = f[t + 1]; f[t + 1] = f[t + 2]; f[t + 2] = x; flipped++; }
  }
  return { m: { v, f }, flipped };
}

function extent(v) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < v.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], v[i + k]); hi[k] = Math.max(hi[k], v[i + k]); }
  return { lo, hi };
}

function smoothNormals({ v, f }) {
  const n = new Float64Array(v.length);
  for (let t = 0; t < f.length; t += 3) {
    const a = 3 * f[t], b = 3 * f[t + 1], c = 3 * f[t + 2];
    const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2];
    const wx = v[c] - v[a], wy = v[c + 1] - v[a + 1], wz = v[c + 2] - v[a + 2];
    const x = uy * wz - uz * wy, y = uz * wx - ux * wz, z = ux * wy - uy * wx;
    for (const i of [a, b, c]) { n[i] += x; n[i + 1] += y; n[i + 2] += z; }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l; n[i + 1] /= l; n[i + 2] /= l;
  }
  return n;
}

function writeGlb(E, path, name, { v, f }, n) {
  // reorderMesh puts the triangles in the vertex cache's order AND renumbers them in place (`order`), and returns the remap the vertices take
  const order = Uint32Array.from(f);
  const [first, count] = E.reorderMesh(order, true, false);
  const { lo, hi } = extent(v);
  const centre = lo.map((x, i) => (x + hi[i]) / 2);
  const half = Math.max(...hi.map((x, i) => x - lo[i])) / 2;
  const pos = new Int16Array(4 * count), nrm = new Int8Array(4 * count);
  for (let i = 0; i < first.length; i++) {
    const j = first[i];
    if (j === 0xFFFFFFFF) continue;
    for (let c = 0; c < 3; c++) {
      pos[4 * j + c] = Math.max(-32767, Math.min(32767, Math.round((v[3 * i + c] - centre[c]) / half * 32767)));
      nrm[4 * j + c] = Math.max(-127, Math.min(127, Math.round(n[3 * i + c] * 127)));
    }
  }
  const idx = order;
  const lo16 = [0, 1, 2].map((c) => Math.min(...Array.from({ length: count }, (_, j) => pos[4 * j + c])));
  const hi16 = [0, 1, 2].map((c) => Math.max(...Array.from({ length: count }, (_, j) => pos[4 * j + c])));
  const use32 = count > 65535;
  const idxBytes = use32 ? new Uint8Array(idx.buffer) : new Uint8Array(Uint16Array.from(idx).buffer);
  const chunks = [], views = [];
  let off = 0;
  const put = (raw, cnt, stride, mode, target) => {
    const padded = new Uint8Array(raw.length + ((4 - (raw.length % 4)) % 4));
    padded.set(raw);
    chunks.push(padded);
    views.push({ buffer: 1, byteOffset: 0, byteLength: cnt * stride, ...(mode === 'ATTRIBUTES' ? { byteStride: stride } : {}), target,
      extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: off, byteLength: raw.length, byteStride: stride, count: cnt, mode, filter: 'NONE' } } });
    off += padded.length;
    return views.length - 1;
  };
  const iv = put(E.encodeIndexBuffer(idxBytes, idx.length, use32 ? 4 : 2), idx.length, use32 ? 4 : 2, 'TRIANGLES', 34963);
  const pv = put(E.encodeVertexBuffer(new Uint8Array(pos.buffer), count, 8), count, 8, 'ATTRIBUTES', 34962);
  const nv = put(E.encodeVertexBuffer(new Uint8Array(nrm.buffer), count, 4), count, 4, 'ATTRIBUTES', 34962);
  const blob = Buffer.concat(chunks);
  let fall = 0;
  for (const vw of views) { vw.byteOffset = fall; fall += vw.byteLength + ((4 - (vw.byteLength % 4)) % 4); }
  const doc = {
    asset: { version: '2.0', generator: 'space-radar scripts/gen_smallmoon_shapes.mjs' },
    extensionsUsed: ['KHR_mesh_quantization', 'EXT_meshopt_compression'],
    extensionsRequired: ['KHR_mesh_quantization', 'EXT_meshopt_compression'],
    buffers: [{ byteLength: blob.length }, { byteLength: fall, extensions: { EXT_meshopt_compression: { fallback: true } } }],
    bufferViews: views,
    accessors: [
      { bufferView: iv, componentType: use32 ? 5125 : 5123, count: idx.length, type: 'SCALAR' },
      { bufferView: pv, componentType: 5122, normalized: true, count, type: 'VEC3', min: lo16, max: hi16 },
      { bufferView: nv, componentType: 5120, normalized: true, count, type: 'VEC3' },
    ],
    meshes: [{ name, primitives: [{ attributes: { POSITION: 1, NORMAL: 2 }, indices: 0, mode: 4 }] }],
    nodes: [{ name, mesh: 0, translation: centre, scale: [half, half, half] }],
    scenes: [{ nodes: [0] }], scene: 0,
  };
  let js = Buffer.from(JSON.stringify(doc));
  js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
  const total = 12 + 8 + js.length + 8 + blob.length;
  const head = Buffer.alloc(20);
  head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(total, 8);
  head.writeUInt32LE(js.length, 12); head.writeUInt32LE(0x4E4F534A, 16);
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(blob.length, 0); bh.writeUInt32LE(0x004E4942, 4);
  writeFileSync(path, Buffer.concat([head, js, bh, blob]));
  return total;
}

async function main(argv) {
  const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('usage: MESHOPT_DIR=<node_modules/meshoptimizer> node scripts/gen_smallmoon_shapes.mjs [--only name ...] [--src DIR] [--out DIR]\n'
      + 'Writes site/models/moon-<name>.glb for the small moons of Saturn from the PDS shape models in SRC, and scripts/data/smallmoon-shapes.json.');
    return 0;
  }
  const src = arg('--src', join(homedir(), '.cache/spaceradar-src/b2/raw'));
  const out = arg('--out', join(REPO, 'site'));
  const only = argv.includes('--only') ? argv.slice(argv.indexOf('--only') + 1).filter((x) => !x.startsWith('--') && x !== src && x !== out) : null;
  const dir = process.env.MESHOPT_DIR;
  if (!dir) throw new Error('MESHOPT_DIR: the directory of an installed meshoptimizer (see the header)');
  const { MeshoptEncoder, MeshoptSimplifier } = await import(pathToFileURL(join(dir, 'index.js')).href);
  await MeshoptEncoder.ready;
  await MeshoptSimplifier.ready;
  mkdirSync(join(out, 'models'), { recursive: true });
  const dataFile = join(REPO, 'scripts/data/smallmoon-shapes.json');
  const report = existsSync(dataFile) ? JSON.parse(readFileSync(dataFile, 'utf8')) : {};
  for (const [key, spec] of Object.entries(MOONS)) {
    if (only && !only.includes(key)) continue;
    const oriented = orient(weld(readObj(join(src, key, spec.file))));
    let m = oriented.m;
    const vol0 = volume(m), ext0 = extent(m.v), tris0 = m.f.length / 3;
    if (spec.tris && spec.tris < tris0) {
      const pos = Float32Array.from(m.v);
      const [idx] = MeshoptSimplifier.simplify(m.f, pos, 3, spec.tris * 3, 0.03);
      m = compact({ v: m.v, f: idx });
      m = orient(m).m;
    }
    const vol1 = volume(m), ext1 = extent(m.v);
    if (Math.abs(vol1 / vol0 - 1) > 0.01) throw new Error(`${key}: volume ${vol0} -> ${vol1}`);
    const size = writeGlb(MeshoptEncoder, join(out, 'models', `${spec.out}.glb`), spec.out, m, smoothNormals(m));
    const dims = (e) => e.hi.map((x, i) => +(x - e.lo[i]).toFixed(3));
    report[key] = { file: `${spec.out}.glb`, bytes: size, tris: m.f.length / 3, verts: m.v.length / 3, source_tris: tris0,
      volume_km3: vol1, source_volume_km3: vol0, extent_km: dims(ext1), source_extent_km: dims(ext0) };
    console.log(`${key}: ${oriented.flipped} of ${tris0} flipped outward, ${tris0} -> ${m.f.length / 3} triangles, ${m.v.length / 3} vertices, volume ${vol0.toPrecision(5)} -> ${vol1.toPrecision(5)} km3 `
      + `(${(100 * (vol1 / vol0 - 1)).toFixed(2)} %), extent ${dims(ext1).join(' x ')} km (source ${dims(ext0).join(' x ')}), ${size} bytes`);
  }
  mkdirSync(dirname(dataFile), { recursive: true });
  const sorted = Object.fromEntries(Object.entries(report).sort(([a], [b]) => (a < b ? -1 : 1)));
  writeFileSync(dataFile, JSON.stringify(sorted, null, 1) + '\n');
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.stack); process.exit(1); });

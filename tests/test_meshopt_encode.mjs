// tests/test_meshopt_encode.mjs -- scripts/meshopt_encode.mjs writes what the decoder the app ships reads, bit for bit.
//   node tests/test_meshopt_encode.mjs
import { MeshoptDecoder } from '../site/vendor/meshopt_decoder.module.js';
import { encodeVertexBuffer, encodeIndexBuffer, orderForCodec, writeGlb } from '../scripts/meshopt_encode.mjs';

let failed = 0;
const check = (ok, what) => { if (!ok) { failed++; console.error('FAIL', what); } };
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
// A small deterministic generator (no Math.random: the same bytes every run).
let seed = 12345;
const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed / 4294967296; };

await MeshoptDecoder.ready;

// ---- the vertex codec: smooth data (small deltas), noise (raw groups), zeros, and counts that are not block multiples
for (const [count, stride, kind] of [[1, 4, 'noise'], [15, 8, 'smooth'], [16, 8, 'noise'], [257, 12, 'smooth'], [1000, 8, 'smooth'], [1000, 16, 'noise'], [300, 4, 'zero'], [5000, 12, 'mixed']]) {
  const src = new Uint8Array(count * stride);
  for (let i = 0; i < count; i++) for (let k = 0; k < stride; k++) {
    const smooth = Math.floor(128 + 100 * Math.sin(i * 0.01 * (k + 1)) + (k % 3 === 0 ? rnd() * 3 : 0));
    src[i * stride + k] = kind === 'zero' ? 0 : kind === 'noise' ? Math.floor(rnd() * 256) : kind === 'smooth' ? smooth : (k < 6 ? smooth : k < 9 ? Math.floor(rnd() * 20) : Math.floor(rnd() * 256));
  }
  const enc = encodeVertexBuffer(src, count, stride);
  const out = new Uint8Array(count * stride);
  let threw = null;
  try { MeshoptDecoder.decodeVertexBuffer(out, count, stride, enc); } catch (e) { threw = e; }
  check(!threw && same(src, out), `vertex codec: ${count} x ${stride} bytes of ${kind} come back exactly${threw ? ' (' + threw.message + ')' : ''}`);
  if (kind === 'smooth' && count >= 1000) check(enc.length < src.length * 0.6, `vertex codec: smooth data packs (${enc.length} of ${src.length} B)`);
}

// ---- the triangle codec: a grid in strip order, the same shuffled, and a fan; then the ordering that makes it small
const grid = (w, h) => { const t = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = y * (w + 1) + x, b = a + 1, c = a + w + 1, d = c + 1; t.push(a, b, c, b, d, c); } return Uint32Array.from(t); };
const roundTrip = (idx, what) => {
  const enc = encodeIndexBuffer(idx);
  const out = new Uint8Array(idx.length * 4);
  let threw = null;
  try { MeshoptDecoder.decodeIndexBuffer(out, idx.length, 4, enc); } catch (e) { threw = e; }
  const got = new Uint32Array(out.buffer);
  // The codec may rotate a triangle (a b c -> b c a): the same triangle, the same winding.
  let ok = !threw;
  for (let i = 0; ok && i < idx.length; i += 3) {
    const a = [idx[i], idx[i + 1], idx[i + 2]], b = [got[i], got[i + 1], got[i + 2]];
    ok = [0, 1, 2].some((r) => a[r] === b[0] && a[(r + 1) % 3] === b[1] && a[(r + 2) % 3] === b[2]);
  }
  check(ok, `triangle codec: ${what} comes back, triangle for triangle${threw ? ' (' + threw.message + ')' : ''}`);
  return enc.length;
};
const g = grid(40, 30);
roundTrip(g, 'a 40 x 30 grid');
const shuffled = g.slice();
for (let i = shuffled.length / 3 - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); for (let k = 0; k < 3; k++) { const t = shuffled[i * 3 + k]; shuffled[i * 3 + k] = shuffled[j * 3 + k]; shuffled[j * 3 + k] = t; } }
const rawSize = roundTrip(shuffled, 'the grid with its triangles shuffled');
roundTrip(Uint32Array.from([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 70000, 5, 4]), 'a fan with a far index');
const ordered = orderForCodec(shuffled, 41 * 31);
const orderedSize = roundTrip(ordered.indices, 'the shuffled grid, ordered for the codec');
check(new Set(ordered.remap).size === 41 * 31 && Math.max(...ordered.remap) === 41 * 31 - 1, 'the ordering renumbers every vertex once');
check(orderedSize < rawSize * 0.5 && orderedSize < g.length, `ordering packs it: ${orderedSize} B ordered, ${rawSize} B shuffled, ${g.length * 2} B as 16-bit indices`);

// ---- a .glb: the header, the JSON chunk, and both views decoded as GLTFLoader decodes them
{
  const positions = new Float32Array(41 * 31 * 3);
  for (let i = 0; i < 41 * 31; i++) { positions[i * 3] = (i % 41) * 0.5 - 3; positions[i * 3 + 1] = Math.floor(i / 41) * 0.25; positions[i * 3 + 2] = Math.sin(i * 0.1); }
  const glb = writeGlb({ meshes: [{ name: 'grid', positions, indices: g }, { name: 'dots', positions: positions.slice(0, 300), colours: new Uint8Array(400).fill(200) }], extras: { note: 'test' } });
  const dv = new DataView(glb.buffer);
  check(dv.getUint32(0, true) === 0x46546c67 && dv.getUint32(4, true) === 2 && dv.getUint32(8, true) === glb.length, 'glb: magic, version 2, total length');
  const jl = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + jl)));
  const bin = glb.subarray(28 + jl);
  check(json.extensionsRequired.includes('EXT_meshopt_compression') && json.buffers.length === 2 && json.buffers[1].extensions.EXT_meshopt_compression.fallback === true, 'glb: meshopt required, a fallback buffer declared');
  check(json.meshes.length === 2 && json.meshes[0].primitives[0].mode === 4 && json.meshes[1].primitives[0].mode === 0, 'glb: a triangle mesh and a point set');
  const decodeView = (i) => { const e = json.bufferViews[i].extensions.EXT_meshopt_compression; const out = new Uint8Array(e.count * e.byteStride); MeshoptDecoder.decodeGltfBuffer(out, e.count, e.byteStride, bin.subarray(e.byteOffset, e.byteOffset + e.byteLength), e.mode, e.filter || 'NONE'); return out; };
  const pv = decodeView(json.accessors[json.meshes[0].primitives[0].attributes.POSITION].bufferView);
  const node = json.nodes[0];
  const q = new DataView(pv.buffer);
  let worst = 0;
  for (let i = 0; i < 41 * 31; i++) for (let k = 0; k < 3; k++) worst = Math.max(worst, Math.abs(q.getUint16(i * 8 + k * 2, true) / 65535 * node.scale[k] + node.translation[k] - positions[i * 3 + k]));
  check(worst < 20 / 65535, `glb: positions come back through the node's scale and translation (worst ${worst.toExponential(2)})`);
  const iv = new Uint16Array(decodeView(json.accessors[json.meshes[0].primitives[0].indices].bufferView).buffer);
  check(iv.length === g.length && Math.max(...iv) === 41 * 31 - 1, 'glb: the indices decode, 16-bit');
}

if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1); }
console.log('ok: tests/test_meshopt_encode.mjs');

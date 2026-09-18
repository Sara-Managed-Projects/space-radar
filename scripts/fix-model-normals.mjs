// fix-model-normals.mjs -- turn round any part of a model whose normals face against its own faces.
//
//   cd "$(mktemp -d)" && npm i --silent @gltf-transform/core@4.5.0 @gltf-transform/extensions@4.5.0 \
//       @gltf-transform/functions@4.5.0 meshoptimizer@0.22.0
//   node /path/to/space-radar/scripts/fix-model-normals.mjs in.glb out.glb
//
// WHY. Measured 2026-09-18 across all 44 shipped models: in four of them -- asteroid-bennu, soho,
// hinode, seastar -- 96 to 100 % of vertex normals pointed INTO the surface they belong to. The toon
// material is front-face only and lights by the stored normal, so the faces were drawn but lit from
// behind: every one rendered flat in the ambient fill colour, as a blue-grey silhouette with no sun
// on it. Two more -- aura and tdrs -- had it in some parts and not others.
//
// It went unseen because the other forty models are fine, and a dull model looks like a dull model,
// not like a bug. Every file that went through decimate-model.mjs is 0 %: that script recomputes
// normals from the winding. These six were only re-encoded, so they kept their authors' normals.
//
// WHAT "WRONG" MEANS HERE. For every triangle, the normal implied by its winding against each of its
// three stored vertex normals. That works on open CAD meshes, where "points away from the centre"
// means nothing -- a solar panel has faces on both sides of the centre. It is decided per CONNECTED
// PIECE within a primitive (pieces share vertex indices), because Aura's bad normals are in some
// pieces of a merged mesh and not others, and flipping the whole primitive would break the rest.
//
// WHY THE NORMALS AND NOT THE WINDING. The faces are visible, which on a front-face-only material
// means the winding already faces out; and turning the normals round made all six render sunlit
// in a side-by-side render (tools/shape-sheet.html). The winding is left exactly as it was.
//
// A piece is turned round when MORE THAN HALF of its vertex normals disagree. Ordinary smoothing at
// a hard edge disagrees by a few per cent and is left alone -- hubble, grace and mms sit at 3-9 %.
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(join(process.cwd(), 'package.json'));
const load = (name) => import(require.resolve(name));
const { NodeIO } = await load('@gltf-transform/core');
const { ALL_EXTENSIONS } = await load('@gltf-transform/extensions');
const { meshopt } = await load('@gltf-transform/functions');
const { MeshoptEncoder, MeshoptDecoder } = await load('meshoptimizer');

const [, , IN, OUT] = process.argv;
if (!IN || !OUT) { console.error('usage: fix-model-normals.mjs in.glb out.glb'); process.exit(2); }
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(IN);

let piecesTurned = 0, piecesSeen = 0, before = [0, 0], after = [0, 0];
const a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0], n = [0, 0, 0];
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    const nor = prim.getAttribute('NORMAL');
    if (!nor) continue;
    const idx = prim.getIndices() ? prim.getIndices().getArray() : null;
    const V = pos.getCount();
    const T = idx ? idx.length / 3 : V / 3;
    const at = (t, k) => (idx ? idx[t * 3 + k] : t * 3 + k);

    // Pieces: union-find over the vertex indices each triangle shares.
    const parent = new Int32Array(V).map((_, i) => i);
    const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    for (let t = 0; t < T; t++) {
      const r = find(at(t, 0));
      parent[find(at(t, 1))] = r;
      parent[find(at(t, 2))] = find(r);
    }

    // Per vertex: summed agreement with the faces that use it. Per piece: the vote.
    const vote = new Map();
    const tally = (count) => {
      for (let t = 0; t < T; t++) {
        const i0 = at(t, 0), i1 = at(t, 1), i2 = at(t, 2);
        pos.getElement(i0, a); pos.getElement(i1, b); pos.getElement(i2, c);
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
        const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
        if (!fx && !fy && !fz) continue;
        for (const i of [i0, i1, i2]) {
          nor.getElement(i, n);
          const agrees = n[0] * fx + n[1] * fy + n[2] * fz >= 0;
          count[agrees ? 0 : 1] += 1;
          if (vote) {
            const piece = find(i);
            const v = vote.get(piece) || [0, 0];
            v[agrees ? 0 : 1] += 1;
            vote.set(piece, v);
          }
        }
      }
    };
    tally(before);
    const turn = new Set();
    for (const [piece, [ok, bad]] of vote) {
      piecesSeen += 1;
      if (bad > ok) { turn.add(piece); piecesTurned += 1; }
    }
    if (turn.size) {
      const arr = nor.getArray().slice();
      for (let i = 0; i < V; i++) if (turn.has(find(i))) { arr[i * 3] = -arr[i * 3]; arr[i * 3 + 1] = -arr[i * 3 + 1]; arr[i * 3 + 2] = -arr[i * 3 + 2]; }
      nor.setArray(arr);
    }
    vote.clear();
    const check = [0, 0];
    // Re-measure without re-voting.
    for (let t = 0; t < T; t++) {
      const i0 = at(t, 0), i1 = at(t, 1), i2 = at(t, 2);
      pos.getElement(i0, a); pos.getElement(i1, b); pos.getElement(i2, c);
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
      if (!fx && !fy && !fz) continue;
      for (const i of [i0, i1, i2]) { nor.getElement(i, n); check[n[0] * fx + n[1] * fy + n[2] * fz >= 0 ? 0 : 1] += 1; }
    }
    after[0] += check[0]; after[1] += check[1];
  }
}
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(OUT, doc);
const pct = ([ok, bad]) => ((100 * bad) / Math.max(1, ok + bad)).toFixed(1);
console.log(`${IN.split('/').pop()}: turned ${piecesTurned} of ${piecesSeen} pieces; normals facing against their faces ${pct(before)} % -> ${pct(after)} %`);

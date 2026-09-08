// decimate-model.mjs -- the second pass for a NASA model that fetch-model.sh could not shrink.
//
//   cd "$(mktemp -d)" && npm i --silent @gltf-transform/core@4.5.0 @gltf-transform/extensions@4.5.0 \
//       @gltf-transform/functions@4.5.0 meshoptimizer@0.22.0
//   node /path/to/space-radar/scripts/decimate-model.mjs in.glb out.glb 0.12 0.02
//
// Arguments: input (already Draco-decoded; `npx @gltf-transform/cli@4.5.0 weld raw.glb step.glb`
// does that), output, the triangle RATIO to keep, and the simplifier ERROR (relative to the bounding
// box).
//
// WHY THE CLI IS NOT ENOUGH. gltf-transform's `optimize --simplify-*` left ICESat-2 at 149 000
// triangles and 1.2 MB whatever the settings. CAD exports carry a normal and up to four texture
// coordinate sets that differ on every hard edge, so `weld` cannot merge the vertices and the
// simplifier has no shared edges to collapse. This project never reads those attributes -- every
// loaded mesh is retextured with the toon material (realmodels.js, rule 1) -- so this drops
// TEXCOORD_*, COLOR_*, NORMAL and TANGENT, welds on position alone, simplifies, recomputes flat
// normals, quantizes and meshopt-compresses. ICESat-2: 149 000 -> 18 400 triangles, 1 229 -> 297 kB.
//
// The dependencies are resolved from the CURRENT DIRECTORY on purpose, so nothing is installed
// into this repository for a build-time step that runs once per model.
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(join(process.cwd(), 'package.json'));
const load = (name) => import(require.resolve(name));
const { NodeIO } = await load('@gltf-transform/core');
const { ALL_EXTENSIONS } = await load('@gltf-transform/extensions');
const { weld, simplify, dedup, prune, meshopt, quantize, normals } = await load('@gltf-transform/functions');
const { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } = await load('meshoptimizer');

const [, , IN, OUT, RATIO = '0.15', ERROR = '0.01'] = process.argv;
if (!IN || !OUT) {
  console.error('usage: decimate-model.mjs in.glb out.glb [ratio] [error]');
  process.exit(2);
}
await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(IN);

const DROP = (sem) => sem.startsWith('TEXCOORD_') || sem.startsWith('COLOR_') || sem === 'NORMAL' || sem === 'TANGENT';
let dropped = 0;
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    for (const sem of prim.listSemantics()) if (DROP(sem)) { prim.setAttribute(sem, null); dropped++; }
  }
}
const tris = () => doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives())
  .reduce((n, p) => n + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3, 0);
const before = tris();
await doc.transform(
  dedup(), prune(), weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: Number(RATIO), error: Number(ERROR) }),
  normals({ overwrite: true }), quantize(), meshopt({ encoder: MeshoptEncoder }),
);
await io.write(OUT, doc);
console.log(`attribute sets dropped ${dropped}; triangles ${Math.round(before)} -> ${Math.round(tris())}`);

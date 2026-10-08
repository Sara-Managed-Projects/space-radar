// repaint-array-face.mjs -- give the cell side of a baked model's solar arrays its own colour.
//
//   cd <a folder with the packages scripts/bake-own-colours.mjs lists installed>
//   node /path/to/scripts/repaint-array-face.mjs in.glb out.glb --mesh=foil --colour=#1c2738 [--side=+y]
//
// WHY (public #396, internal #433). NASA's Hubble (A) file paints both faces of its two arrays with
// one bronze photograph, and scripts/bake-own-colours.mjs keeps what the file shows: flat bronze
// wings. The telescope's arrays are dark cells on the face turned to the Sun and bronze on the
// back. This takes the triangles of the meshes named --mesh that are thin slabs and face --side,
// and moves them to one new mesh named `solar-panel` (the name scene/realmodels.js gives the sharp
// glint of cells) in --colour. Everything else is untouched. The colour is OURS and the model's
// `modified:` line in registry/models.yaml says so.
import { createRequire } from 'node:module';
import { join } from 'node:path';
const require = createRequire(join(process.cwd(), 'x.js'));
const load = (n) => import(require.resolve(n));
const { NodeIO } = await load('@gltf-transform/core');
const { ALL_EXTENSIONS } = await load('@gltf-transform/extensions');
const { meshopt, dequantize } = await load('@gltf-transform/functions');
const { MeshoptEncoder, MeshoptDecoder } = await load('meshoptimizer');
const [IN, OUT] = process.argv.slice(2);
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split('=').slice(1).join('=');
const NAME = arg('mesh', 'foil'), HEX = arg('colour', '#1c2738'), SIDE = arg('side', '+y');
const axis = 'xyz'.indexOf(SIDE[1]), sign = SIDE[0] === '-' ? -1 : 1;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(IN);
await doc.transform(dequantize());
const lin = (h) => [1, 3, 5].map((i) => Math.pow(parseInt(h.slice(i, i + 2), 16) / 255, 2.2));
const root = doc.getRoot();
const buffer = root.listBuffers()[0];
const pos = [], nor = [];
let moved = 0;
for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (!mesh || mesh.getName() !== NAME) continue;
  for (const prim of mesh.listPrimitives()) {
    const P = prim.getAttribute('POSITION'), N = prim.getAttribute('NORMAL'), I = prim.getIndices();
    const n = I ? I.getCount() : P.getCount();
    const keep = [];
    const a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0];
    for (let t = 0; t < n; t += 3) {
      const ia = I ? I.getScalar(t) : t, ib = I ? I.getScalar(t + 1) : t + 1, ic = I ? I.getScalar(t + 2) : t + 2;
      P.getElement(ia, a); P.getElement(ib, b); P.getElement(ic, c);
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const f = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const len = Math.hypot(...f) || 1;
      if ((f[axis] / len) * sign > 0.9) {
        for (const p of [a, b, c]) { pos.push(...p); nor.push(...[0, 1, 2].map((k) => (k === axis ? sign : 0))); }
        moved += 1;
      } else keep.push(ia, ib, ic);
    }
    prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(keep)).setBuffer(buffer));
  }
}
if (!moved) { console.error(`no triangle of a mesh named ${NAME} faces ${SIDE}`); process.exit(1); }
const material = doc.createMaterial('cells').setBaseColorFactor([...lin(HEX), 1]).setMetallicFactor(0).setRoughnessFactor(1);
const prim = doc.createPrimitive().setMaterial(material)
  .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer))
  .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor)).setBuffer(buffer));
const scene = root.getDefaultScene() || root.listScenes()[0];
const first = root.listNodes().find((nd) => nd.getMesh() && nd.getMesh().getName() === NAME);
const node = doc.createNode('solar-panel').setMesh(doc.createMesh('solar-panel').addPrimitive(prim));
(first.getParentNode() || scene).addChild(node);
node.setTranslation(first.getTranslation()).setRotation(first.getRotation()).setScale(first.getScale());
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high', quantizeNormal: 8 }));
await io.write(OUT, doc);
console.log(`${moved} triangles facing ${SIDE} of the meshes named ${NAME} are now ${HEX}, mesh solar-panel`);

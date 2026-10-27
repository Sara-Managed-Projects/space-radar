// write-glb.mjs -- the json lib.py's Model.export() writes, to the file that ships: the same layout as the
// public scripts/bake-own-colours.mjs writes (one mesh per role named body / solar-panel / foil, one
// primitive and one material `own #hex` per colour, the bake's value clamp, creased normals as given,
// meshopt at level high with 8-bit normals). Nothing is resampled or decimated: every triangle keeps the
// colour it was built with.
//
//   cd <dir with @gltf-transform/core, functions, extensions and meshoptimizer> && node write-glb.mjs in.json out.glb
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { readFileSync, statSync } from 'node:fs';

const require = createRequire(join(process.cwd(), 'package.json'));
const load = (name) => import(require.resolve(name));
const { NodeIO, Document } = await load('@gltf-transform/core');
const { ALL_EXTENSIONS } = await load('@gltf-transform/extensions');
const { meshopt } = await load('@gltf-transform/functions');
const { MeshoptEncoder, MeshoptDecoder } = await load('meshoptimizer');
await MeshoptEncoder.ready; await MeshoptDecoder.ready;

const [IN, OUT] = process.argv.slice(2);
const src = JSON.parse(readFileSync(IN, 'utf8'));
const V_MIN = 0.12, V_MAX = 0.93;
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const clamp = (rgb) => {
  const mx = Math.max(...rgb);
  if (mx > V_MAX) return rgb.map((c) => (c * V_MAX) / mx);
  if (mx < V_MIN) return rgb.map((c) => c + (V_MIN - mx));
  return rgb;
};
const hexOf = (rgb) => `#${rgb.map((c) => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0')).join('')}`;

const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene('model');
const meshes = new Map();
let tris = 0;
const lines = [];
for (const g of src.groups) {
  const srgb = clamp([1, 3, 5].map((i) => parseInt(g.colour.slice(i, i + 2), 16) / 255));
  const hex = hexOf(srgb);
  const material = doc.createMaterial(`own ${hex}`).setBaseColorFactor([...srgb.map(toLinear), 1]).setMetallicFactor(0).setRoughnessFactor(1);
  const n = g.positions.length;
  const idx = n > 65535 ? new Uint32Array(g.indices) : new Uint16Array(g.indices);
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.positions.flat())).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.normals.flat())).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(buffer))
    .setMaterial(material);
  let mesh = meshes.get(g.role);
  if (!mesh) {
    mesh = doc.createMesh(g.role);
    meshes.set(g.role, mesh);
    scene.addChild(doc.createNode(g.role).setMesh(mesh));
  }
  mesh.addPrimitive(prim);
  tris += g.indices.length / 3;
  lines.push(`${hex}${g.role === 'body' ? '' : `[${g.role}]`} ${g.indices.length / 3}`);
}
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high', quantizeNormal: 8 }));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
await io.write(OUT, doc);
console.log(`${OUT.split('/').pop()}: ${tris} triangles, ${src.groups.length} colours, ${Math.round(statSync(OUT).size / 1024)} kB\n  ${lines.join('  ')}`);

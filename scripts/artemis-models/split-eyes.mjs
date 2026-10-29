import { createRequire } from 'node:module'; import { join } from 'node:path';
const require = createRequire(join(process.cwd(), 'package.json'));
const { NodeIO } = await import(require.resolve('@gltf-transform/core'));
const { ALL_EXTENSIONS } = await import(require.resolve('@gltf-transform/extensions'));
const { prune } = await import(require.resolve('@gltf-transform/functions'));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const [IN, OUTDIR] = process.argv.slice(2);
const PARTS = {
  cm: ['retopo_shell', 'retopo_holes', 'retopo_shell.003', 'retopo_shell.005', 'retopo_shell.006', 'retopo_shell.008', 'retopo_shell.009', 'retopo_shield', 'CMTopDetail.001', 'SMClasp', 'SMClasp.002', 'SMClasp.003'],
  esm: ['outter bus.001', 'Cube.008', 'Cube.009', 'Cube.010', 'Cube.011', 'Cube.017', 'Cylinder.006', 'Cylinder.008', 'Cylinder.010', 'Cylinder.013'],
  'array-1': ['solarArray.002'], 'array-2': ['solarArray.003'], 'array-3': ['solarArray.004'], 'array-4': ['solarArray.005'],
};
for (const [part, names] of Object.entries(PARTS)) {
  const doc = await io.read(IN);
  for (const n of doc.getRoot().listNodes()) if (n.getMesh() && !names.includes(n.getName())) n.setMesh(null);
  // drop meshes that are now unused so the file is small
  for (const m of doc.getRoot().listMeshes()) if (m.listParents().filter((p) => p.propertyType === 'Node').length === 0) m.dispose();
  await doc.transform(prune());
  await io.write(join(OUTDIR, `eyes-${part}.glb`), doc);
  console.log('wrote', part);
}

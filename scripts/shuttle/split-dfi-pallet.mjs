// split-dfi-pallet.mjs -- release 1.7.7: the DFI pallet of STS-1 becomes a part of its own in site/models/shuttle-orbiter.glb.
//
//   cd <a folder with node_modules for @gltf-transform/core extensions functions, meshoptimizer, draco3dgltf, sharp>
//   node /path/to/space-radar/scripts/shuttle/split-dfi-pallet.mjs site/models/shuttle-orbiter.glb
//
// The open bay of 1.7.2 (`bay-open-detail`) carried the Development Flight Instrumentation pallet, the only thing STS-1 had in its bay. STS-31 carried the
// Hubble, not a pallet, so the pallet (the box and the three boxes on it, 60 triangles at y 13.2 to 16.0, x within 1.6 m, z -1.6 to -0.5 in the file's frame)
// is cut out of that part into `dfi-pallet`, and the STS-1 Moment shows it (a `show` beside the open bay's). Every other part is read back and written again unchanged.
import { readTris, writeParts } from '../apollo/kit.mjs';
import { io } from '../apollo/kit.mjs';
const file = process.argv[2];
const doc = await io.read(file);
const tops = doc.getRoot().listScenes()[0].listChildren();
const parts = [];
for (const top of tops) {
  const topName = top.getName();
  const under = (n) => { let p = n; while (p.getParentNode()) p = p.getParentNode(); return p.getName() === topName; };
  const tris = await readTris(file, { filter: under });
  parts.push({ name: topName, origin: top.getTranslation(), tris });
}
const bay = parts.find((p) => p.name === 'bay-open-detail');
if (!bay) throw new Error('no bay-open-detail: already split, or not the shipped file');
const inPallet = (t) => {
  const cx = (t.p[0] + t.p[3] + t.p[6]) / 3, cy = (t.p[1] + t.p[4] + t.p[7]) / 3, cz = (t.p[2] + t.p[5] + t.p[8]) / 3;
  return cy > 13.2 && cy < 16.0 && Math.abs(cx) < 1.6 && cz > -1.6 && cz < -0.5;
};
const pallet = bay.tris.filter(inPallet);
bay.tris = bay.tris.filter((t) => !inPallet(t));
const c = pallet.reduce((a, t) => [a[0] + (t.p[0] + t.p[3] + t.p[6]) / 3, a[1] + (t.p[1] + t.p[4] + t.p[7]) / 3, a[2] + (t.p[2] + t.p[5] + t.p[8]) / 3], [0, 0, 0]).map((v) => v / pallet.length);
parts.push({ name: 'dfi-pallet', origin: c, tris: pallet });
const res = await writeParts(file, parts);
console.log(file, JSON.stringify(res), 'pallet triangles', pallet.length, 'bay detail now', bay.tris.length, 'pallet centre', c.map((v) => v.toFixed(2)).join(' '));

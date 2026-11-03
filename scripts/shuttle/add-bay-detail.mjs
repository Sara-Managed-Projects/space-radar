// add-bay-detail.mjs -- release 1.7.2: the open payload bay of Columbia, added to site/models/shuttle-orbiter.glb as a part.
//
//   cd <a folder with node_modules for @gltf-transform/core extensions functions, meshoptimizer, draco3dgltf, sharp>
//   node /path/to/space-radar/scripts/shuttle/add-bay-detail.mjs site/models/shuttle-orbiter.glb
//
// Reads the shipped file part by part (the nodes keep their names and origins), adds ONE part, `bay-open-detail`, shown with the open doors and hidden with
// the shut ones, and writes the file again: the two sill longerons with their latches, the radiator tubes and headers on the inner face of each OPEN door
// (read off the door's own surface, so they lie on it), the bay's end bulkheads, and the DFI pallet, the only thing STS-1 carried in the bay. The sizes are
// ours, from photographs of the empty bay (the yellow Kapton liner is NASA's mesh, already there); the part says so in registry/models.yaml.
import { readTris, writeParts, col, box, V } from '../apollo/kit.mjs';
import { io } from '../apollo/kit.mjs';
const file = process.argv[2];
const doc = await io.read(file);
const scene = doc.getRoot().listScenes()[0];
const tops = scene.listChildren();
const parts = [];
for (const top of tops) {
  const topName = top.getName();
  const under = (n) => { let p = n; while (p.getParentNode()) p = p.getParentNode(); return p.getName() === topName; };   // readTris opens the file itself: by name
  const tris = await readTris(file, { filter: under });
  parts.push({ name: top.getName(), origin: top.getTranslation(), tris });
}
const byName = Object.fromEntries(parts.map((p) => [p.name, p]));
const bay = { y0: 10.2, y1: 28.5 };
const GREY = col('#4a4d52'), DARK = col('#2b2830'), PALE = col('#c9cbce'), TUBE = col('#5a5e66'), WHITE = col('#e4e6e6');
const tris = [];
const add = (list) => tris.push(...list);
// radiator tubes lie on the open doors' faces: the top envelope of each door's mesh by x
for (const [name, side] of [['bay-door-l-open', -1], ['bay-door-r-open', 1]]) {
  const d = byName[name].tris.filter((t) => { const n = V.cross(V.sub([t.p[3], t.p[4], t.p[5]], [t.p[0], t.p[1], t.p[2]]), V.sub([t.p[6], t.p[7], t.p[8]], [t.p[0], t.p[1], t.p[2]])); return n[2] > 0; });
  const xs = d.flatMap((t) => [t.p[0], t.p[3], t.p[6]]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const zAt = (x) => { let z = -9; for (const t of d) for (let k = 0; k < 3; k++) if (Math.abs(t.p[k * 3] - x) < 0.18) z = Math.max(z, t.p[k * 3 + 2]); return z > -9 ? z : -1.5; };
  const N = 7;
  for (let i = 0; i < N; i++) {
    const x = x0 + 0.25 + (x1 - x0 - 0.5) * i / (N - 1), z = zAt(x) + 0.03;
    for (let y = bay.y0 + 1.2; y + 1.9 < bay.y1 - 0.6; y += 2.35) add(box([x, y + 0.95, z], [0.07, 1.9, 0.06], TUBE));
  }
  for (let y = bay.y0 + 1.0; y < bay.y1 - 0.5; y += 4.2) add(box([(x0 + x1) / 2, y, zAt((x0 + x1) / 2) + 0.03], [x1 - x0 - 0.3, 0.12, 0.07], WHITE));
}
// the sills: a longeron each side, with latches
for (const s of [-1, 1]) {
  add(box([s * 2.55, (bay.y0 + bay.y1) / 2, -1.33], [0.3, bay.y1 - bay.y0, 0.32], GREY));
  for (let y = bay.y0 + 1.2; y < bay.y1 - 0.5; y += 2.2) add(box([s * 2.3, y, -1.15], [0.5, 0.45, 0.25], DARK));
}
// the end bulkheads, low, and the DFI pallet with its boxes
for (const y of [bay.y0 + 0.1, bay.y1 - 0.1]) add(box([0, y, -1.0], [4.6, 0.2, 1.0], GREY));
add(box([0, 14.6, -1.2], [2.6, 2.4, 0.4], PALE));
add(box([-0.6, 14.1, -0.9], [0.8, 0.8, 0.3], DARK), box([0.6, 15.0, -0.9], [0.9, 0.7, 0.25], DARK), box([0, 14.6, -0.95], [0.5, 1.6, 0.2], GREY));
add(box([0, 14.6, -1.2 + 0.2 + 0.001], [2.6, 0.12, 0.01], WHITE));
const o = [0, (bay.y0 + bay.y1) / 2, -1.2];
parts.push({ name: 'bay-open-detail', origin: o, tris: tris.map((t) => ({ ...t, tag: 0 })) });
const res = await writeParts(file, parts);
console.log(file, JSON.stringify(res), 'bay detail triangles', tris.length);

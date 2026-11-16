#!/usr/bin/env node
// scripts/build_deep_homunculus.mjs -- Eta Carinae's Homunculus as a compact mesh (site/data/deep/homunculus.glb), from the
// published 3D model of Steffen et al. 2014 (MNRAS 442, 3316, arXiv:1407.4096): a SHAPE reconstruction of the nebula's
// outer molecular shell from VLT/X-shooter H2 velocities, as ESO distributes it (3D model 3dmodel_004, Wavefront .obj,
// 172.7 kB zipped; credit "NASA's Goddard Space Flight Center/Ed Campion & UNAM/W. Steffen"; ESO's terms: free to use
// with that credit visible, CC BY 4.0).
//
//   node scripts/build_deep_homunculus.mjs <dir holding Eta_Car_Homunuculus_model.obj> [--check]
//
// The download is data, never run: this file reads `v x y z` and `f a b c` lines and nothing else. Keep the download in
// a folder of its own outside the repository (the zip's sha256 is in registry/deepsky-heroes/homunculus.yaml).
//
// WHAT IS CHANGED, AND NOTHING ELSE. No vertex is moved, added or dropped and no triangle is thinned: 8 552 vertices and
// 17 101 triangles in, the same out. (1) The axes are renamed to the paper's own un-tilted view (its figure 4, right:
// the polar axis up the page with the receding lobe on top, the observer in front): x = the file's x, y = minus the
// file's z, z = the file's y. Read off the file by its features: the lobe at the file's +z has the one curved trench
// and the hole the paper's figure 5 marks on the approaching ("blue") lobe, the one at -z the pits it marks on the
// receding ("red") one, and seen from the file's +y the Red Protrusion is on the left and the Blue on the right, as in
// figure 4. (2) Lengths are divided by the mean height of the two poles above the star (the file's origin), so the
// mesh is in POLAR RADII; the app multiplies by the measured polar radius (registry/deepsky-heroes/homunculus.yaml).
// (3) Positions are stored as 16-bit integers in the mesh's box (a 30 000th of the nebula's length) and packed with
// meshopt (scripts/meshopt_encode.mjs); triangles are walked edge to edge so that they pack small. Normals are not
// stored: the app computes them from the triangles.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeGlb, orderForCodec } from './meshopt_encode.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'site/data/deep/homunculus.glb');
export const SOURCE = {
  name: 'Eta_Car_Homunuculus_model.obj',
  page: 'https://www.eso.org/public/products/models3d/3dmodel_004/',
  credit: "NASA's Goddard Space Flight Center/Ed Campion & UNAM/W. Steffen",
  licence: 'ESO terms of use (CC BY 4.0): free with the full credit visible',
  paper: 'Steffen, W. et al. 2014, MNRAS 442, 3316 (arXiv:1407.4096)',
};

/** The .obj's vertices and triangles (`v` and `f` lines; a face's `a/b/c` forms read by their first number). Pure. */
export function parseObj(text) {
  const pos = [], idx = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('v ')) { const p = line.trim().split(/\s+/); pos.push(Number(p[1]), Number(p[2]), Number(p[3])); }
    else if (line.startsWith('f ')) {
      const p = line.trim().split(/\s+/).slice(1).map((s) => parseInt(s, 10) - 1);
      for (let k = 1; k + 1 < p.length; k++) idx.push(p[0], p[k], p[k + 1]);
    }
  }
  return { positions: Float64Array.from(pos), indices: Uint32Array.from(idx) };
}

/** The file's axes -> the paper's un-tilted view, in polar radii. Returns the positions and what was measured on the way. Pure. */
export function reframe(positions) {
  const n = positions.length / 3;
  let zMax = -Infinity, zMin = Infinity;
  for (let i = 0; i < n; i++) { const z = positions[i * 3 + 2]; if (z > zMax) zMax = z; if (z < zMin) zMin = z; }
  const unit = (zMax - zMin) / 2; // the mean of the two poles' heights above the origin
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    out[i * 3] = positions[i * 3] / unit;
    out[i * 3 + 1] = -positions[i * 3 + 2] / unit;
    out[i * 3 + 2] = positions[i * 3 + 1] / unit;
  }
  return { positions: out, unit, nearPole: zMax / unit, farPole: -zMin / unit };
}

function main(argv) {
  const dir = argv.find((a) => !a.startsWith('--'));
  const check = argv.includes('--check');
  if (!dir) { console.error('usage: node scripts/build_deep_homunculus.mjs <dir holding ' + SOURCE.name + '> [--check]'); return 2; }
  const src = parseObj(readFileSync(join(dir, SOURCE.name), 'latin1'));
  const nv = src.positions.length / 3;
  const f = reframe(src.positions);
  const { indices, remap } = orderForCodec(src.indices, nv);
  const positions = new Float32Array(nv * 3);
  for (let v = 0; v < nv; v++) for (let k = 0; k < 3; k++) positions[remap[v] * 3 + k] = f.positions[v * 3 + k];
  const glb = writeGlb({
    meshes: [{ name: 'homunculus', positions, indices }],
    extras: { what: 'Homunculus Nebula, outer H2 shell', frame: 'x right, y the polar axis toward the receding (north-west) lobe, z toward the observer, before the tilt; unit: the mean polar radius', vertices: nv, triangles: indices.length / 3, near_pole: Number(f.nearPole.toFixed(5)), far_pole: Number(f.farPole.toFixed(5)), credit: SOURCE.credit, licence: SOURCE.licence, source: SOURCE.page, paper: SOURCE.paper },
  });
  console.log(`${nv} vertices, ${indices.length / 3} triangles; poles at ${f.nearPole.toFixed(4)} (near) and ${f.farPole.toFixed(4)} (far) polar radii; ${glb.length} B`);
  if (check) {
    const have = existsSync(OUT) ? readFileSync(OUT) : null;
    if (!have || Buffer.compare(have, Buffer.from(glb)) !== 0) { console.error('site/data/deep/homunculus.glb is not what this script writes'); return 1; }
    return 0;
  }
  writeFileSync(OUT, glb);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exit(main(process.argv.slice(2)));

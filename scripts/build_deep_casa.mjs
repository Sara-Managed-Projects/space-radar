#!/usr/bin/env node
// scripts/build_deep_casa.mjs -- Cassiopeia A's 3D reconstruction as compact point sets (site/data/deep/casa.glb), from
// the model of DeLaney et al. 2010 (ApJ 725, 2038, arXiv:1011.3858) as the Chandra X-ray Center distributes it:
// "CasA Supernova remnant volumetric data ASCII VTK files created from telescope data" (chandra.si.edu/deadstar/
// deadstar.html, CasA_supernova_remnant-ascii_vtks.zip; credit NASA/CXC/MIT/T.Delaney et al.; Chandra's image use
// policy: no claim to copyright, use in accordance with NASA guidelines with acknowledgement).
//
//   node scripts/build_deep_casa.mjs <dir holding the seven *-ascii.vtk files> [--check]
//
// The download is data, never run: this file reads each file's `POINTS n float` block and nothing else. Keep the
// download in a folder of its own outside the repository (the zip's sha256 is in registry/deepsky-heroes/casa.yaml).
//
// WHAT THE FILES ARE. One file per part of the reconstruction, each a set of small blobs (the paper: every measured
// place smoothed "to glue neighbouring voxels together", a symbol about 15 arcseconds across for [Si II], 10 for
// Si XIII, 6 for the rest; "We did not encode brightness information"): fekcorr = iron (Fe-K, Chandra ACIS), newar =
// argon ([Ar II], Spitzer IRS), newhetg = silicon (Si XIII, Chandra HETG), newsi = cold silicon ([Si II], Spitzer),
// newjets and newopt = the jets and the outer optical knots (ground telescopes), cco = the neutron star.
//
// WHAT IS DONE TO THEM. (1) A blob's surface is hundreds of vertices; a point set needs its place, not its skin, so the
// vertices are THINNED on a grid: one point per occupied cell, at the mean of the vertices in it (CELL below, in the
// files' units; coarser for [Si II], whose symbol is larger). Nothing is moved by more than half a cell, and places
// are stored to a 1 024th of each part's box (under half an arcsecond). (2) The
// AXES are renamed: the files' x is east, y is toward Earth, z is north (read off the data: the jets lie north-east
// and south-west in x and z, and the iron in the south-east comes toward us, as the paper says); out go west, north,
// toward the Sun. (3) The UNIT: the files do not state it. It is 3.5 arcseconds, set by the three lengths the paper
// gives: the mean 3D radius of the [Ar II] (110 arcseconds; 107 with this unit), of the [Si II] (91; 94), and the
// neutron star's distance from the model's origin (20.2; 20.6). (4) The ORIGIN is moved to the explosion's own place:
// the paper's origin is the centre of its fitted sphere, 859 km/s behind zero velocity (18.9 arcseconds at its 0.022
// arcseconds per km/s); the points are shifted so that zero velocity is at 0. On the sky the origin is the
// expansion centre of Thorstensen et al. 2001, which is the record's place.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeGlb } from './meshopt_encode.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'site/data/deep/casa.glb');
export const UNIT_ARCSEC = 3.5;
export const ORIGIN_SHIFT_ARCSEC = 859 * 0.022; // the fitted sphere's centre is this far behind zero velocity
export const SOURCE = {
  page: 'https://chandra.si.edu/deadstar/deadstar.html',
  credit: 'NASA/CXC/MIT/T.Delaney et al.',
  licence: 'Chandra image use policy: no claim to copyright, use in accordance with NASA guidelines, acknowledgement requested',
  paper: 'DeLaney, T. et al. 2010, ApJ 725, 2038 (arXiv:1011.3858)',
};
// part -> the file, the grid's cell (the files' units) and what it is. The order is the file's order of meshes.
export const PARTS = [
  { part: 'iron', file: 'fekcorr-ascii.vtk', cell: 1.25, what: 'iron, Fe-K line, Chandra ACIS (X-rays)' },
  { part: 'argon', file: 'newar-ascii.vtk', cell: 1.25, what: 'argon, [Ar II] line, Spitzer IRS (infrared)' },
  { part: 'silicon-hot', file: 'newhetg-ascii.vtk', cell: 1.25, what: 'silicon, Si XIII line, Chandra HETG (X-rays)' },
  { part: 'silicon-cold', file: 'newsi-ascii.vtk', cell: 2.0, what: 'cold silicon, [Si II] line, Spitzer IRS (infrared)' },
  { part: 'jets', file: 'newjets-ascii.vtk', cell: 1.25, what: 'the jets: fast optical knots (ground telescopes)' },
  { part: 'outer-knots', file: 'newopt-ascii.vtk', cell: 1.25, what: 'outer optical knots (ground telescopes)' },
  { part: 'neutron-star', file: 'cco-ascii.vtk', cell: Infinity, what: 'the central neutron star, placed at zero velocity (its depth is not measured)' },
];

/** The `POINTS n float` block of an ASCII VTK polydata file. Pure. */
export function parsePoints(text) {
  const at = text.indexOf('POINTS ');
  if (at < 0) throw new Error('no POINTS block');
  const eol = text.indexOf('\n', at);
  const n = parseInt(text.slice(at + 7, eol), 10);
  const out = new Float64Array(n * 3);
  let i = eol + 1, k = 0;
  const end = text.length;
  while (k < n * 3 && i < end) {
    while (i < end && text.charCodeAt(i) <= 32) i++;
    let j = i;
    while (j < end && text.charCodeAt(j) > 32) j++;
    out[k++] = Number(text.slice(i, j));
    i = j;
  }
  if (k !== n * 3) throw new Error(`POINTS: ${k} numbers of ${n * 3}`);
  return out;
}

/** One point per occupied cell of side `cell`, at the mean of the vertices in it. Pure. */
export function thin(points, cell) {
  if (!Number.isFinite(cell)) { // one marker: its middle
    const m = [0, 0, 0];
    for (let i = 0; i < points.length; i += 3) for (let k = 0; k < 3; k++) m[k] += points[i + k] / (points.length / 3);
    return Float64Array.from(m);
  }
  const cells = new Map();
  for (let i = 0; i < points.length; i += 3) {
    const key = `${Math.floor(points[i] / cell)},${Math.floor(points[i + 1] / cell)},${Math.floor(points[i + 2] / cell)}`;
    let c = cells.get(key);
    if (!c) { c = [0, 0, 0, 0]; cells.set(key, c); }
    c[0] += points[i]; c[1] += points[i + 1]; c[2] += points[i + 2]; c[3] += 1;
  }
  const out = new Float64Array(cells.size * 3);
  let k = 0;
  for (const c of cells.values()) { out[k++] = c[0] / c[3]; out[k++] = c[1] / c[3]; out[k++] = c[2] / c[3]; }
  return out;
}

/** The files' (east, toward Earth, north) units -> (west, north, toward the Sun) arcseconds about the explosion's place. Pure. */
export function reframe(points) {
  const out = new Float32Array(points.length);
  for (let i = 0; i < points.length; i += 3) {
    out[i] = -points[i] * UNIT_ARCSEC;
    out[i + 1] = points[i + 2] * UNIT_ARCSEC;
    out[i + 2] = points[i + 1] * UNIT_ARCSEC - ORIGIN_SHIFT_ARCSEC;
  }
  return out;
}

/** Points in an order that packs: along a Morton curve through their box. Pure. */
export function mortonOrder(p) {
  const n = p.length / 3, lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[i * 3 + k]); hi[k] = Math.max(hi[k], p[i * 3 + k]); }
  const spread = (v) => { let x = v & 1023; x = (x | (x << 16)) & 0x30000ff; x = (x | (x << 8)) & 0x300f00f; x = (x | (x << 4)) & 0x30c30c3; x = (x | (x << 2)) & 0x9249249; return x; };
  const code = new Float64Array(n);
  for (let i = 0; i < n; i++) { let c = 0; for (let k = 0; k < 3; k++) c += spread(Math.floor(((p[i * 3 + k] - lo[k]) / Math.max(hi[k] - lo[k], 1e-9)) * 1023)) * (1 << k); code[i] = c; }
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => code[a] - code[b] || a - b);
  const out = new Float32Array(p.length);
  order.forEach((s, d) => { out[d * 3] = p[s * 3]; out[d * 3 + 1] = p[s * 3 + 1]; out[d * 3 + 2] = p[s * 3 + 2]; });
  return out;
}

function main(argv) {
  const dir = argv.find((a) => !a.startsWith('--'));
  const check = argv.includes('--check');
  if (!dir) { console.error('usage: node scripts/build_deep_casa.mjs <dir holding the *-ascii.vtk files> [--check]'); return 2; }
  const meshes = [];
  for (const part of PARTS) {
    const src = parsePoints(readFileSync(join(dir, part.file), 'latin1'));
    const pts = mortonOrder(reframe(thin(src, part.cell)));
    let r = 0;
    for (let i = 0; i < pts.length; i += 3) r += Math.hypot(pts[i], pts[i + 1], pts[i + 2] + ORIGIN_SHIFT_ARCSEC);
    console.log(`${part.part}: ${src.length / 3} vertices -> ${pts.length / 3} points; mean radius about the paper's origin ${(r / (pts.length / 3)).toFixed(1)} arcsec`);
    meshes.push({ name: part.part, positions: pts, bits: 10, extras: { what: part.what, file: part.file, vertices_in: src.length / 3, cell_units: Number.isFinite(part.cell) ? part.cell : null } });
  }
  const glb = writeGlb({
    meshes,
    extras: { what: 'Cassiopeia A, the 3D reconstruction of DeLaney et al. 2010, as point sets', frame: 'x west, y north, z toward the Sun; arcseconds about the explosion\'s place (the expansion centre on the sky, zero velocity along our line) in January 2005', unit_arcsec: UNIT_ARCSEC, origin_shift_arcsec: Number(ORIGIN_SHIFT_ARCSEC.toFixed(3)), credit: SOURCE.credit, licence: SOURCE.licence, source: SOURCE.page, paper: SOURCE.paper },
  });
  console.log(`${meshes.reduce((s, m) => s + m.positions.length / 3, 0)} points in ${meshes.length} parts; ${glb.length} B`);
  if (check) {
    const have = existsSync(OUT) ? readFileSync(OUT) : null;
    if (!have || Buffer.compare(have, Buffer.from(glb)) !== 0) { console.error('site/data/deep/casa.glb is not what this script writes'); return 1; }
    return 0;
  }
  writeFileSync(OUT, glb);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exit(main(process.argv.slice(2)));

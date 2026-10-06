// bake-own-colours.mjs -- one pass from NASA's original .glb to a shipped model that keeps ITS OWN
// colours: decimate the geometry, and paint every surviving triangle the flat colour the original
// showed at that place.
//
//   cd "$(mktemp -d)" && npm i --silent @gltf-transform/core@4.5.0 @gltf-transform/extensions@4.5.0 \
//       @gltf-transform/functions@4.5.0 meshoptimizer@0.22.0 draco3dgltf@1.5.7 sharp
//   node /path/to/space-radar/scripts/bake-own-colours.mjs raw.glb out.glb --tris=15000 --colours=14
//
// Options: --tris=N        triangle target (default 15000; tests/test_contract.mjs caps a file at 20000)
//          --colours=K     most flat colours kept (default 14: one draw call each)
//          --error=E       first simplifier error, relative to the model's size (default 0.004; it
//                          is doubled up to four times until the target is met)
//          --min-part=F    drop loose parts smaller than F of the model's diagonal (default 0.004:
//                          bolts and brackets nobody can see at 300 px, and the simplifier cannot
//                          collapse a part it is not connected to)
//          --no-guess      tag `panel` and `foil` from names only, never from the colour
//          --crease=DEG    the angle above which an edge stays sharp (default 40)
//
// WHY THIS EXISTS (issues #265, #386, #418; spec 0057 task 2). The first pipeline was three
// scripts -- fetch-model.sh, decimate-model.mjs, flatten-textures.mjs -- and the middle one welds on
// position after DROPPING every material difference it can, so a file whose colours lived in
// textures came out white, and realmodels.js then painted the whole spacecraft in one class
// colour. That is how the Apollo lunar module became salmon and Voyager lavender: the gold foil
// was in the file NASA published and it was thrown away at build time.
//
// WHAT IT KEEPS AND WHAT IT STILL THROWS AWAY. It keeps a FLAT colour per triangle: the material's
// stated base colour, times its texture averaged over a 48 px raster around that triangle (so a
// photograph of foil becomes "gold", not a photograph), clustered to at most K colours for the
// whole model. It still throws away the photographs, the normal maps and the metalness: the
// module header of realmodels.js rules out photoreal shading, tests/test_model_colour.mjs fails
// on any image taller than four texels, and a flat colour through the toon ramp is the same look
// the procedural models have. One model, K materials, no image, no texture coordinates.
//
// NORMALS ARE WRITTEN, AND THEY ARE CREASED. tests/test_contract.mjs refuses a new file without
// them (computing them at load costs three vertices a triangle in memory). Flat normals are right
// for a box and wrong for a dish: under a three-step ramp a flat-shaded antenna or fuel tank is a
// patchwork of facets, each triangle on its own side of a step. Averaging everything is the
// opposite mistake, a box with rounded-off edges. So a corner's normal is the average over the
// faces that meet there AND lie within 40 degrees of its own: two faces of a cylinder cut into 24
// are 15 degrees apart and blend, two faces of a box are 90 and do not.
//
// THE ORDER MATTERS. Colour is looked up AFTER simplifying, from the original surface: weld on
// position alone (which is what lets the simplifier work on a CAD export at all), simplify, and
// then give each surviving triangle the colour of the nearest original triangle FACING THE SAME
// WAY. The facing test is not a refinement: a solar wing is two coincident sheets, blue cells on
// one side and white or gold on the other, and nearest-by-distance alone paints it in confetti.
//
// THE VALUE CLAMP. A stated #000000 in these files is usually "no material here" and draws as a
// hole in the picture against a black sky; a stated #ffffff glares and realmodels.js reads pure
// white as "the colour was in a texture". So every colour's brightest channel is held between
// V_MIN and V_MAX below. That is the only place the bake changes a colour NASA stated.
//
// `panel` and `foil` are carried as MESH NAMES (`solar-panel`, `foil`, `body`), which is what
// realmodels.js applyToon reads to choose the specular family: a sharp glint on cells, a broad soft
// one on foil, none on painted structure. A name in the source file decides it when there is one;
// otherwise the colour does (blue-violet and darkish reads as cells, saturated amber as foil),
// and --no-guess turns that half off for a file it gets wrong.
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { statSync } from 'node:fs';

const require = createRequire(join(process.cwd(), 'package.json'));
const load = (name) => import(require.resolve(name));
const { NodeIO, Document } = await load('@gltf-transform/core');
const { ALL_EXTENSIONS } = await load('@gltf-transform/extensions');
const { meshopt } = await load('@gltf-transform/functions');
const { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } = await load('meshoptimizer');
const draco3d = (await load('draco3dgltf')).default;
const sharp = (await load('sharp')).default;

const pos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const opt = (n, d) => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const [IN, OUT] = pos;
if (!IN || !OUT) { console.error('usage: bake-own-colours.mjs raw.glb out.glb [--tris=15000] [--colours=14] [--error=0.004] [--min-part=0.004] [--no-guess]'); process.exit(2); }
const TRIS = Number(opt('tris', '15000'));
const COLOURS = Number(opt('colours', '14'));
const ERROR = Number(opt('error', '0.004'));
const MIN_PART = Number(opt('min-part', '0.004'));
const GUESS = !process.argv.includes('--no-guess');
const CREASE_COS = Math.cos((Number(opt('crease', '40')) * Math.PI) / 180);
const V_MIN = 0.12, V_MAX = 0.93; // sRGB, brightest channel: see THE VALUE CLAMP
const RASTER = 48;                // px a texture is averaged down to before it is sampled

await MeshoptSimplifier.ready; await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder,
});
const doc = await io.read(IN);

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

// ---- 1. every source triangle, in world space, with the flat colour it shows -----------------
const rasters = new Map();
async function rasterOf(texture) {
  if (!texture || !texture.getImage()) return null;
  if (rasters.has(texture)) return rasters.get(texture);
  let r = null;
  try {
    const { data, info } = await sharp(Buffer.from(texture.getImage())).removeAlpha().toColourspace('srgb')
      .resize(RASTER, RASTER, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
    const px = new Float32Array(RASTER * RASTER * 3);
    for (let i = 0; i < RASTER * RASTER; i++) for (let k = 0; k < 3; k++) px[i * 3 + k] = toLinear(data[i * info.channels + Math.min(k, info.channels - 1)] / 255);
    r = px;
  } catch (err) { console.warn(`  a texture could not be decoded (${err.message.slice(0, 60)}); its material keeps its stated colour`); }
  rasters.set(texture, r);
  return r;
}
const sample = (px, u, v) => {
  const x = Math.min(RASTER - 1, Math.floor((u - Math.floor(u)) * RASTER));
  const y = Math.min(RASTER - 1, Math.floor((v - Math.floor(v)) * RASTER));
  const i = (y * RASTER + x) * 3;
  return [px[i], px[i + 1], px[i + 2]];
};

const P = [];      // welded positions, xyz
const F = [];      // welded triangle indices
const S = [];      // source samples: x y z nx ny nz r g b tag   (10 numbers each)
const TAGS = ['body', 'panel', 'foil'];
const PANEL_NAME = /solar|panel|array|\bcells?\b/i;
const FOIL_NAME = /foil|mli|kapton|blanket/i;
const weldMap = new Map();
let srcTris = 0;
const raw = []; // [ax,ay,az,bx,by,bz,cx,cy,cz, r,g,b, tag]

const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
const jobs = [];
scene.traverse((node) => { if (node.getMesh()) jobs.push(node); });
for (const node of jobs) {
  const M = node.getWorldMatrix();
  const mesh = node.getMesh();
  for (const prim of mesh.listPrimitives()) {
    if (prim.getMode() !== 4) continue;
    const pa = prim.getAttribute('POSITION');
    if (!pa) continue;
    const ua = prim.getAttribute('TEXCOORD_0');
    const ca = prim.getAttribute('COLOR_0');
    const mat = prim.getMaterial();
    const factor = mat ? mat.getBaseColorFactor() : [0.8, 0.8, 0.8, 1];
    if (factor[3] < 0.1) continue; // glass that is all but invisible
    const px = mat ? await rasterOf(mat.getBaseColorTexture()) : null;
    const names = `${node.getName()} ${mesh.getName()} ${mat ? mat.getName() : ''}`;
    const tag = PANEL_NAME.test(names) ? 1 : FOIL_NAME.test(names) ? 2 : 0;
    const n = pa.getCount();
    const xyz = new Float64Array(n * 3);
    const e = [];
    for (let i = 0; i < n; i++) {
      pa.getElement(i, e);
      xyz[i * 3] = M[0] * e[0] + M[4] * e[1] + M[8] * e[2] + M[12];
      xyz[i * 3 + 1] = M[1] * e[0] + M[5] * e[1] + M[9] * e[2] + M[13];
      xyz[i * 3 + 2] = M[2] * e[0] + M[6] * e[1] + M[10] * e[2] + M[14];
    }
    const idx = prim.getIndices() ? prim.getIndices().getArray() : null;
    const count = idx ? idx.length : n;
    const uv = [[], [], []], vc = [[], [], []];
    for (let t = 0; t + 2 < count; t += 3) {
      const v = [idx ? idx[t] : t, idx ? idx[t + 1] : t + 1, idx ? idx[t + 2] : t + 2];
      let c = [factor[0], factor[1], factor[2]];
      if (px && ua) {
        for (let k = 0; k < 3; k++) ua.getElement(v[k], uv[k]);
        const s = sample(px, (uv[0][0] + uv[1][0] + uv[2][0]) / 3, (uv[0][1] + uv[1][1] + uv[2][1]) / 3);
        c = [c[0] * s[0], c[1] * s[1], c[2] * s[2]];
      }
      if (ca) {
        for (let k = 0; k < 3; k++) ca.getElement(v[k], vc[k]);
        for (let k = 0; k < 3; k++) c[k] *= (vc[0][k] + vc[1][k] + vc[2][k]) / 3;
      }
      const row = new Float64Array(13);
      for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) row[k * 3 + j] = xyz[v[k] * 3 + j];
      row[9] = c[0]; row[10] = c[1]; row[11] = c[2]; row[12] = tag;
      raw.push(row);
      srcTris++;
    }
  }
}
if (!raw.length) { console.error('no triangles in that file'); process.exit(1); }

const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
for (const r of raw) for (let k = 0; k < 9; k++) { lo[k % 3] = Math.min(lo[k % 3], r[k]); hi[k % 3] = Math.max(hi[k % 3], r[k]); }
const diag = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) || 1;

// Weld on position: a 2^18 grid over the bounding box. This is what gives the simplifier shared
// edges to collapse -- a CAD export splits every vertex on every hard edge and every UV seam.
const Q = (2 ** 18 - 1) / diag;
const weld = (x, y, z) => {
  const key = `${Math.round((x - lo[0]) * Q)},${Math.round((y - lo[1]) * Q)},${Math.round((z - lo[2]) * Q)}`;
  let i = weldMap.get(key);
  if (i === undefined) { i = P.length / 3; P.push(x, y, z); weldMap.set(key, i); }
  return i;
};
const cross = (a, b, c) => {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
};
const CELL = diag / 96;
for (const r of raw) {
  const a = [r[0], r[1], r[2]], b = [r[3], r[4], r[5]], c = [r[6], r[7], r[8]];
  const n = cross(a, b, c);
  const area2 = Math.hypot(n[0], n[1], n[2]);
  if (!(area2 > 0)) continue;
  const ia = weld(...a), ib = weld(...b), ic = weld(...c);
  if (ia === ib || ib === ic || ia === ic) continue;
  F.push(ia, ib, ic);
  n[0] /= area2; n[1] /= area2; n[2] /= area2;
  // One sample at the centroid, and a lattice of them on a triangle bigger than a grid cell, so a
  // large flat panel is found from anywhere on it and not only near its middle.
  const m = Math.max(1, Math.min(6, Math.ceil(Math.sqrt(area2 / 2) / CELL)));
  for (let i = 0; i < m; i++) for (let j = 0; j < m - i; j++) {
    const u = (i + 1 / 3) / m, v = (j + 1 / 3) / m, w = 1 - u - v;
    S.push(a[0] * w + b[0] * u + c[0] * v, a[1] * w + b[1] * u + c[1] * v, a[2] * w + b[2] * u + c[2] * v, n[0], n[1], n[2], r[9], r[10], r[11], r[12]);
  }
}

// ---- 2. drop the loose parts nobody can see, then simplify ------------------------------------
const nV = P.length / 3;
const parent = new Int32Array(nV).map((_, i) => i);
const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
for (let t = 0; t < F.length; t += 3) { const a = find(F[t]); parent[find(F[t + 1])] = a; parent[find(F[t + 2])] = a; }
const boxes = new Map();
for (let i = 0; i < nV; i++) {
  const r = find(i);
  let b = boxes.get(r);
  if (!b) boxes.set(r, (b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]));
  for (let k = 0; k < 3; k++) { b[k] = Math.min(b[k], P[i * 3 + k]); b[k + 3] = Math.max(b[k + 3], P[i * 3 + k]); }
}
const small = new Set();
for (const [r, b] of boxes) if (Math.hypot(b[3] - b[0], b[4] - b[1], b[5] - b[2]) < MIN_PART * diag) small.add(r);
let kept = [];
for (let t = 0; t < F.length; t += 3) if (!small.has(find(F[t]))) kept.push(F[t], F[t + 1], F[t + 2]);
if (kept.length < F.length * 0.5) { kept = F.slice(); small.clear(); } // a model made of crumbs: keep them
const welded = kept.length / 3;

const positions = new Float32Array(P.length);
for (let i = 0; i < P.length; i++) positions[i] = P[i] - lo[i % 3]; // near the origin, for float32
const simplifyTo = (tris, pts, err) => {
  try { return MeshoptSimplifier.simplify(new Uint32Array(tris), pts, 3, TRIS * 3, err, ['Prune'])[0]; }
  catch { return MeshoptSimplifier.simplify(new Uint32Array(tris), pts, 3, TRIS * 3, err)[0]; }
};
let indices = new Uint32Array(kept);
let usedError = 0;
let reweld = 0;
if (indices.length / 3 > TRIS) {
  let err = ERROR;
  for (let pass = 0; pass < 3; pass++, err *= 2) {
    indices = simplifyTo(kept, positions, err); usedError = err;
    if (indices.length / 3 <= TRIS * 1.03) break;
  }
}
// A MODEL MADE OF CRUMBS. OSIRIS-REx is 184 000 triangles in thousands of parts that touch and do
// not share a vertex -- every solar cell is its own quad -- and the simplifier can only collapse
// an edge two triangles share, so it stopped at 83 000 whatever error it was allowed. The way out
// is the oldest decimation there is: snap the vertices to a coarser grid, so parts that touch
// become one surface, drop what collapsed, and simplify THAT. Each step halves the grid; the
// first one that reaches the target is kept, so a model that did not need this never gets it.
if (indices.length / 3 > TRIS * 1.03) {
  for (let bits = 10; bits >= 6; bits--) {
    const q = (2 ** bits - 1) / diag;
    const cells = new Map();
    const sum = [];
    const cellOfVertex = new Uint32Array(nV);
    for (let i = 0; i < nV; i++) {
      const key = `${Math.round((P[i * 3] - lo[0]) * q)},${Math.round((P[i * 3 + 1] - lo[1]) * q)},${Math.round((P[i * 3 + 2] - lo[2]) * q)}`;
      let c = cells.get(key);
      if (c === undefined) { c = sum.length / 4; sum.push(0, 0, 0, 0); cells.set(key, c); }
      sum[c * 4] += P[i * 3]; sum[c * 4 + 1] += P[i * 3 + 1]; sum[c * 4 + 2] += P[i * 3 + 2]; sum[c * 4 + 3] += 1;
      cellOfVertex[i] = c;
    }
    const seen = new Set();
    const tris = [];
    for (let t = 0; t < kept.length; t += 3) {
      const a = cellOfVertex[kept[t]], b = cellOfVertex[kept[t + 1]], c = cellOfVertex[kept[t + 2]];
      if (a === b || b === c || a === c) continue;
      const key = [a, b, c].sort((x, y) => x - y).join(',');
      if (seen.has(key)) continue; // two sheets that became one
      seen.add(key);
      tris.push(a, b, c);
    }
    const pts = new Float32Array((sum.length / 4) * 3);
    for (let c = 0; c < sum.length / 4; c++) for (let k = 0; k < 3; k++) pts[c * 3 + k] = sum[c * 4 + k] / sum[c * 4 + 3] - lo[k];
    const got = tris.length / 3 > TRIS ? simplifyTo(tris, pts, 0.01) : new Uint32Array(tris);
    if (got.length / 3 <= TRIS * 1.03 || bits === 6) {
      // From here on P is the clustered vertex set; the colour lookup below reads the ORIGINAL
      // surface through S, which this does not touch.
      P.length = 0;
      for (let i = 0; i < pts.length; i++) P.push(pts[i] + lo[i % 3]);
      indices = got; reweld = bits; usedError = 0.01;
      break;
    }
  }
}

// ---- 3. the colour of each surviving triangle, from the original surface ----------------------
const grid = new Map();
const cellOf = (x, y, z) => `${Math.floor((x - lo[0]) / CELL)},${Math.floor((y - lo[1]) / CELL)},${Math.floor((z - lo[2]) / CELL)}`;
for (let i = 0; i < S.length; i += 10) {
  const k = cellOf(S[i], S[i + 1], S[i + 2]);
  let g = grid.get(k);
  if (!g) grid.set(k, (g = []));
  g.push(i);
}
const FACING = 0.03 * diag; // how far a wrong-facing sample is pushed away: 3 % of the model
function colourAt(x, y, z, nx, ny, nz) {
  const cx = Math.floor((x - lo[0]) / CELL), cy = Math.floor((y - lo[1]) / CELL), cz = Math.floor((z - lo[2]) / CELL);
  let best = -1, bestCost = Infinity;
  for (let ring = 1; ring <= 12; ring++) {
    for (let dx = -ring; dx <= ring; dx++) for (let dy = -ring; dy <= ring; dy++) for (let dz = -ring; dz <= ring; dz++) {
      if (ring > 1 && Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) < ring) continue; // inner rings are done
      const g = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
      if (!g) continue;
      for (const i of g) {
        const d = Math.hypot(S[i] - x, S[i + 1] - y, S[i + 2] - z);
        const facing = S[i + 3] * nx + S[i + 4] * ny + S[i + 5] * nz;
        const cost = d + FACING * (1 - facing) / 2;
        if (cost < bestCost) { bestCost = cost; best = i; }
      }
    }
    if (best >= 0 && bestCost < (ring - 1) * CELL + CELL) break; // nothing in a further ring can beat it
  }
  return best;
}
const nT = indices.length / 3;
const faceRgb = new Float32Array(nT * 3); // sRGB, for clustering
const faceTag = new Uint8Array(nT);
const faceArea = new Float32Array(nT);
const faceN = new Float32Array(nT * 3);   // the cross product, so its length is twice the area
for (let t = 0; t < nT; t++) {
  const a = [0, 1, 2].map((k) => P[indices[t * 3] * 3 + k]);
  const b = [0, 1, 2].map((k) => P[indices[t * 3 + 1] * 3 + k]);
  const c = [0, 1, 2].map((k) => P[indices[t * 3 + 2] * 3 + k]);
  const n = cross(a, b, c);
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  faceArea[t] = l / 2;
  faceN[t * 3] = n[0]; faceN[t * 3 + 1] = n[1]; faceN[t * 3 + 2] = n[2];
  const i = colourAt((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3, n[0] / l, n[1] / l, n[2] / l);
  const rgb = i >= 0 ? [S[i + 6], S[i + 7], S[i + 8]] : [0.6, 0.6, 0.6];
  for (let k = 0; k < 3; k++) faceRgb[t * 3 + k] = toSrgb(Math.max(0, Math.min(1, rgb[k])));
  faceTag[t] = i >= 0 ? S[i + 9] : 0;
}

// Creased normals, one per corner (see NORMALS ARE WRITTEN above). Area-weighted, over the faces
// round the same welded vertex that are within the crease angle of this corner's own face.
const cornerN = new Float32Array(nT * 9);
{
  let maxV = 0;
  for (let c = 0; c < indices.length; c++) if (indices[c] > maxV) maxV = indices[c];
  const head = new Int32Array(maxV + 1).fill(-1);
  const next = new Int32Array(indices.length);
  for (let c = 0; c < indices.length; c++) { next[c] = head[indices[c]]; head[indices[c]] = c; }
  for (let c = 0; c < indices.length; c++) {
    const f = (c / 3) | 0;
    const nx = faceN[f * 3], ny = faceN[f * 3 + 1], nz = faceN[f * 3 + 2];
    const nl = Math.hypot(nx, ny, nz) || 1;
    let sx = 0, sy = 0, sz = 0;
    for (let o = head[indices[c]]; o >= 0; o = next[o]) {
      const g = (o / 3) | 0;
      const gx = faceN[g * 3], gy = faceN[g * 3 + 1], gz = faceN[g * 3 + 2];
      const gl = Math.hypot(gx, gy, gz);
      if (!(gl > 0) || (gx * nx + gy * ny + gz * nz) / (gl * nl) < CREASE_COS) continue;
      sx += gx; sy += gy; sz += gz;
    }
    const sl = Math.hypot(sx, sy, sz);
    if (sl > 0) { cornerN[c * 3] = sx / sl; cornerN[c * 3 + 1] = sy / sl; cornerN[c * 3 + 2] = sz / sl; }
    else { cornerN[c * 3] = nx / nl; cornerN[c * 3 + 1] = ny / nl; cornerN[c * 3 + 2] = nz / nl; }
  }
}

// The tag a NAME did not give, from the colour. HSV in sRGB.
const hsv = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 0) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, mx ? d / mx : 0, mx];
};
if (GUESS) for (let t = 0; t < nT; t++) {
  if (faceTag[t]) continue;
  const [h, s, v] = hsv(faceRgb[t * 3], faceRgb[t * 3 + 1], faceRgb[t * 3 + 2]);
  if (h >= 205 && h <= 275 && s >= 0.14 && v <= 0.8) faceTag[t] = 1;
  else if (h >= 28 && h <= 58 && s >= 0.38 && v >= 0.5) faceTag[t] = 2;
}

// ---- 4. at most K flat colours: 5-bit bins, then merge the cheapest pair (Ward) --------------
const bins = new Map();
for (let t = 0; t < nT; t++) {
  const r = faceRgb[t * 3], g = faceRgb[t * 3 + 1], b = faceRgb[t * 3 + 2], w = faceArea[t] || 1e-12;
  const key = (faceTag[t] << 15) | ((r * 31 + 0.5) | 0) << 10 | ((g * 31 + 0.5) | 0) << 5 | ((b * 31 + 0.5) | 0);
  let bin = bins.get(key);
  if (!bin) bins.set(key, (bin = { w: 0, r: 0, g: 0, b: 0, tag: faceTag[t], keys: [key] }));
  bin.w += w; bin.r += r * w; bin.g += g * w; bin.b += b * w;
}
let clusters = [...bins.values()];
const wardCost = (p, q) => {
  if (p.tag !== q.tag) return Infinity;
  const d = (p.r / p.w - q.r / q.w) ** 2 + (p.g / p.w - q.g / q.w) ** 2 + (p.b / p.w - q.b / q.w) ** 2;
  return ((p.w * q.w) / (p.w + q.w)) * d;
};
// Never fewer clusters than there are tags in use, or the loop below has an infinite cost to pick.
const floorK = new Set(clusters.map((c) => c.tag)).size;
while (clusters.length > Math.max(COLOURS, floorK)) {
  let bi = 0, bj = 1, best = Infinity;
  for (let i = 0; i < clusters.length; i++) for (let j = i + 1; j < clusters.length; j++) {
    const c = wardCost(clusters[i], clusters[j]);
    if (c < best) { best = c; bi = i; bj = j; }
  }
  if (!Number.isFinite(best)) break;
  const p = clusters[bi], q = clusters[bj];
  p.w += q.w; p.r += q.r; p.g += q.g; p.b += q.b; p.keys.push(...q.keys);
  clusters.splice(bj, 1);
}
const clusterOfKey = new Map();
clusters.forEach((c, i) => { for (const k of c.keys) clusterOfKey.set(k, i); });
const totalArea = clusters.reduce((n, c) => n + c.w, 0) || 1;
const clamp = (rgb) => {
  const mx = Math.max(...rgb);
  if (mx > V_MAX) return rgb.map((c) => (c * V_MAX) / mx);
  if (mx < V_MIN) return rgb.map((c) => c + (V_MIN - mx));
  return rgb;
};
const hexOf = (rgb) => `#${rgb.map((c) => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0')).join('')}`;

// ---- 5. write it: one mesh per tag, one primitive and one material per colour ------------------
const out = new Document();
const buffer = out.createBuffer();
const outScene = out.createScene('model');
const meshes = new Map();
const NAMES = { 0: 'body', 1: 'solar-panel', 2: 'foil' };
const report = [];
clusters.forEach((c, ci) => {
  const tris = [];
  for (let t = 0; t < nT; t++) {
    const r = faceRgb[t * 3], g = faceRgb[t * 3 + 1], b = faceRgb[t * 3 + 2];
    const key = (faceTag[t] << 15) | ((r * 31 + 0.5) | 0) << 10 | ((g * 31 + 0.5) | 0) << 5 | ((b * 31 + 0.5) | 0);
    if (clusterOfKey.get(key) === ci) tris.push(t);
  }
  if (!tris.length) return;
  // A vertex is shared where the position AND the creased normal agree (to 1/32), so a smooth
  // surface stays indexed and a hard edge splits -- which is all a hard edge is.
  const remap = new Map();
  const vp = [], vn = [];
  const vi = new Uint32Array(tris.length * 3);
  tris.forEach((t, n) => {
    for (let k = 0; k < 3; k++) {
      const c = t * 3 + k, v = indices[c];
      const nx = cornerN[c * 3], ny = cornerN[c * 3 + 1], nz = cornerN[c * 3 + 2];
      const key = `${v}|${Math.round(nx * 32)},${Math.round(ny * 32)},${Math.round(nz * 32)}`;
      let m = remap.get(key);
      if (m === undefined) { m = vp.length / 3; vp.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); vn.push(nx, ny, nz); remap.set(key, m); }
      vi[n * 3 + k] = m;
    }
  });
  const srgb = clamp([c.r / c.w, c.g / c.w, c.b / c.w]);
  const hex = hexOf(srgb);
  const material = out.createMaterial(`own ${hex}`).setBaseColorFactor([...srgb.map(toLinear), 1]).setMetallicFactor(0).setRoughnessFactor(1);
  const prim = out.createPrimitive()
    .setAttribute('POSITION', out.createAccessor().setType('VEC3').setArray(new Float32Array(vp)).setBuffer(buffer))
    .setAttribute('NORMAL', out.createAccessor().setType('VEC3').setArray(new Float32Array(vn)).setBuffer(buffer))
    .setIndices(out.createAccessor().setType('SCALAR').setArray(vi).setBuffer(buffer))
    .setMaterial(material);
  let mesh = meshes.get(c.tag);
  if (!mesh) {
    mesh = out.createMesh(NAMES[c.tag]);
    meshes.set(c.tag, mesh);
    outScene.addChild(out.createNode(NAMES[c.tag]).setMesh(mesh));
  }
  mesh.addPrimitive(prim);
  report.push({ hex, tag: TAGS[c.tag], share: c.w / totalArea, tris: tris.length });
});
await out.transform(meshopt({ encoder: MeshoptEncoder, level: 'high', quantizeNormal: 8 }));
await io.write(OUT, out);

report.sort((a, b) => b.share - a.share);
console.log(
  `${OUT.split('/').pop()}: triangles ${srcTris} -> welded ${welded} (${small.size} loose parts dropped) -> ${nT}` +
  `${usedError ? ` at error ${usedError}` : ''}${reweld ? ` after re-welding on a 2^${reweld} grid` : ''}; ${report.length} colours; ${Math.round(statSync(OUT).size / 1024)} kB\n  ` +
  report.map((r) => `${r.hex}${r.tag === 'body' ? '' : `[${r.tag}]`} ${(r.share * 100).toFixed(0)}%`).join('  ')
);

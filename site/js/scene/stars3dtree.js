// scene/stars3dtree.js -- the arithmetic of the 3D star map's extra tiers (forge #140, release 2.0.0 batch f10-stars3d):
// which star catalogue a device draws, which octree nodes of AT-HYG it fetches round the camera, a node's bytes as
// stars, and what the card says about a star's distance. Pure: no DOM, no three, no fetch. scene/stars3dtiles.js
// and scene/stars3dworker.js do the impure parts; tests/test_stars3dtiles.mjs holds this file.
//
// Contract:
//   starTierFor(d, saveData) -> { tier: 'hyg' | 'athyg', nodes, why }   d: ctx.quality.describe()
//   indexSet(doc) -> { doc, tiles, parentOf: Int32Array, roots: number[] }       a checked set.json, with its tree
//   reachLy(mMin, limit) -> light-years      how far a star of absolute magnitude mMin is still `limit` or brighter
//   boxDistanceLy(tile, cam) -> light-years  from the camera to the node's cube (0 inside)
//   selectNodes(index, cam, opts) -> tile indices, the most needed first   opts { limit, nodes }
//   decodeNode(doc, tile, cols) -> { count, posLy, absMag, bv, ref, src }  a decoded tile (data/tilecloud.js) as stars
//   octDecode(u, v, out, o) -> out           an octahedral direction back to a unit vector
//   sceneToLy(A, p) -> [x, y, z]             a scene point back to light-years (ecliptic J2000, the Sun at 0): stage.affineFrom's inverse
//   refName(ref) -> 'TYC 4669-731-1' | null  a Tycho-2 number, or null for a star AT-HYG numbers itself
//   distanceNote(distLy, src) -> { from, sigmaMas, poe, pct, guess } | null   the modelled error of a distance
//   faintVert(src) -> src | null             scene/stars3d.js's vertex shader drawing FAINT_PAST magnitudes past its limit
//
// WHY THE TIERS ARE THE QUALITY'S. Cosmoscope draws HYG, AT-HYG and Gaia DR3 by its graphics setting; here the same
// device tiers that pick the maps (scene/quality.js) pick the stars, in WebGL on every one of them:
//   Low, the frame latch and data-saver   HYG's 109 389 only (scene/stars3d.js), as before
//   tier 0 (a phone on Auto)              + AT-HYG, at most NODES[0] nodes of 8 192 at once (about 330 000 stars)
//   tier 1                                + AT-HYG, NODES[1] nodes (about 1.05 million)
//   tier 2 (High, Ultra)                  + AT-HYG, NODES[2] nodes (about 2.1 million: all of it near the camera)
// GAIA DR3 IS NOT A TIER. The issue asked for its licence to be confirmed as CC BY-SA 3.0 IGO before use. ESA's page
// says otherwise (https://www.cosmos.esa.int/web/gaia-users/license, read 2026-11-08: "Gaia data are distributed under
// the CC BY-NC 3.0 IGO license."), and a non-commercial cut cannot be mixed into a CC BY-SA file; nothing was
// downloaded from the archive. AT-HYG's distances ARE Gaia DR3's, under AT-HYG's own CC BY-SA 4.0.
//
// WHICH NODES. scripts/build-stars3d-tiles.py cut AT-HYG like Potree: a node keeps the brightest (absolute) stars of its
// cube and its children the rest, so every star of a child is fainter than every star of its parent. The shader draws
// a star while its magnitude AT THE CAMERA is `limit` or brighter (scene/stars3d.js VERT), so a node is worth fetching
// only while its brightest star, at the nearest corner of its cube, could reach that: boxDistance <= reach(mMin). A node
// that fails has no child that passes, so the walk stops there. Those that pass are taken nearest-to-needed first
// (boxDistance / reach), a child never before its parent, until the tier's node count is spent.
//
// THE DISTANCE ERROR. AT-HYG does not carry a star's parallax error; it only emptied the distance of every star whose
// parallax was smaller than its error (its version-info.md, v2.4). So the card's error is MODELLED from the mission's
// published precision, and says so: Gaia DR3's parallaxes are good to 0.02-0.03 mas for G < 15 (Gaia Collaboration,
// Brown et al. 2021, A&A 649, A1, the abstract; DR3 keeps EDR3's astrometry), and every AT-HYG star is brighter than
// that, so 0.03 mas; Gaia DR2's to 0.04 mas for G < 15 (Gaia Collaboration, Lindegren et al. 2018, A&A 616, A2);
// Hipparcos's new reduction to about 0.5 mas for a star of the Tycho range (van Leeuwen 2007, A&A 474, 653, its figure
// of the formal errors against magnitude). Past GUESS_PC (3 kpc, a parallax of a third of a milliarcsecond, ten times
// Gaia's own systematic zero-point error of about 0.02 mas, Lindegren et al. 2021, A&A 649, A4) the card says plainly
// that the distance is a guess, whatever the model says.
//
// A FULLER SKY. HYG's stars stop at the exposure's limit (7.5 at most: what an eye with a little help sees), and from a
// rung of the ladder that is all the 3D map drew. AT-HYG's layer draws on FAINT_PAST magnitudes past it (to 11.5 from
// the camera), each star at the very light HYG's would have down to the limit, then falling smoothly to 40 % of it by the
// end and out over the last half magnitude, its sprite half as wide again (the same peak, softer), so the many faint ones read as the soft field a long exposure shows and not
// as noise or a cliff. HYG's own look is untouched
// (its shader is not this one), and on the shell nothing changes (uShell: the limit stays the eye's).

export const LY_PER_PC = 3.2615637771674333;
export const CAPACITY = 8192;
/** Nodes of CAPACITY stars a tier may hold at once (GPU: 19 bytes a star; tier 0 is 6.2 MB). */
export const NODES = [40, 128, 256];
export const GUESS_PC = 3000;
export const FAINT_PAST = 4;
const ALPHA_LINE = 'vAlpha = ( m > uMagLimit ) ? 0.0 : ( 0.35 + 0.65 * tt ) * uGain;';
const SIZE_LINE = 'float sizePx = size * uPixelRatio * uScale;';
export const SIGMA_MAS = { 0: 0.03, 1: 0.04, 2: 0.5 }; // src bits 0-2: Gaia DR3, Gaia DR2, Hipparcos (above)
const FROM = ['gaia-dr3', 'gaia-dr2', 'hipparcos', 'gliese', 'other'];

/** Which catalogue this device draws in 3D, and how much of it. `d` is ctx.quality.describe(). Pure. */
export function starTierFor(d, saveData = false) {
  if (saveData) return { tier: 'hyg', nodes: 0, why: 'saver' };
  if (!d || d.latched) return { tier: 'hyg', nodes: 0, why: d ? 'latched' : 'none' };
  const plan = d.plan || {};
  if (plan.stripped || plan.choice === 'low') return { tier: 'hyg', nodes: 0, why: 'low' };
  const tier = Math.max(0, Math.min(2, Number.isFinite(plan.tier) ? plan.tier : Number(d.tier) || 0));
  return { tier: 'athyg', nodes: NODES[tier], why: `tier${tier}` };
}

/** set.json, checked for what the octree needs, with each node's parent. Null for a set this cannot read. */
export function indexSet(doc) {
  if (!doc || !doc.partition || doc.partition.kind !== 'octree' || !Array.isArray(doc.tiles)) return null;
  const at = new Map(doc.tiles.map((t, i) => [t.key, i]));
  const parentOf = new Int32Array(doc.tiles.length).fill(-1);
  const roots = [];
  doc.tiles.forEach((t, i) => {
    if (!t || typeof t.key !== 'string' || !Array.isArray(t.c) || !(t.h > 0) || !Number.isFinite(t.mMin)) { parentOf[i] = -2; return; }
    const up = t.key.length > 1 ? at.get(t.key.slice(0, -1)) : undefined;
    if (up === undefined) roots.push(i); else parentOf[i] = up;
  });
  if (parentOf.includes(-2)) return null;
  const children = doc.tiles.map(() => []);
  parentOf.forEach((p, i) => { if (p >= 0) children[p].push(i); });
  return { doc, tiles: doc.tiles, parentOf, children, roots };
}

/** Light-years at which absolute magnitude `mMin` is apparent magnitude `limit`: 10 pc x 10^((limit - M) / 5). */
export function reachLy(mMin, limit) {
  return 10 * LY_PER_PC * 10 ** ((limit - mMin) / 5);
}

export function boxDistanceLy(t, cam) {
  let s = 0;
  for (let k = 0; k < 3; k += 1) {
    const d = Math.abs(cam[k] - t.c[k]) - t.h;
    if (d > 0) s += d * d;
  }
  return Math.sqrt(s);
}

/**
 * The nodes to hold for a camera at `cam` (light-years, ecliptic J2000, the Sun at 0), the most needed first.
 * opts.limit: the faintest magnitude drawn (scene/stars3d.js caps it at 7.5). opts.nodes: how many at most.
 */
export function selectNodes(index, cam, opts = {}) {
  const limit = Number.isFinite(opts.limit) ? opts.limit : 7.5;
  const most = Math.max(0, opts.nodes | 0);
  if (!index || !most) return [];
  const need = new Float64Array(index.tiles.length).fill(Infinity);
  const open = [];
  const walk = (i, floor) => {
    const t = index.tiles[i];
    const r = reachLy(t.mMin, limit);
    const d = boxDistanceLy(t, cam);
    if (d > r) return;
    need[i] = Math.max(floor, d / r); // a child is never more needed than its parent
    open.push(i);
    for (const c of index.children[i]) walk(c, need[i]);
  };
  for (const r of index.roots) walk(r, 0);
  open.sort((a, b) => need[a] - need[b] || index.tiles[a].level - index.tiles[b].level || a - b);
  return open.slice(0, most);
}

/** The octahedron's square (u, v each -1..1) back to a unit vector, into `out` at `o`: scripts/build-stars3d-tiles.py oct_encode undone. */
export function octDecode(u, v, out, o) {
  let x = u, y = v;
  const z = 1 - Math.abs(u) - Math.abs(v);
  if (z < 0) { x = (1 - Math.abs(v)) * (u >= 0 ? 1 : -1); y = (1 - Math.abs(u)) * (v >= 0 ? 1 : -1); }
  const n = Math.hypot(x, y, z);
  out[o] = x / n; out[o + 1] = y / n; out[o + 2] = z / n;
  return out;
}

/**
 * A tile data/tilecloud.js decodeTile() read, as stars: positions in light-years (ecliptic J2000, the Sun at 0), each a
 * direction from the Sun (octahedral, 13" at worst) and a logarithmic distance (0.018 % a step), magnitudes and colours.
 */
export function decodeNode(doc, tile, cols) {
  const f = Object.fromEntries(doc.schema.map((s) => [s.name, s]));
  const n = cols.ref.length;
  const posLy = new Float32Array(n * 3);
  const absMag = new Float32Array(n);
  const bv = new Float32Array(n);
  const d0 = doc.partition.dist0_ly, k = Math.log(doc.partition.dist1_ly / d0) / 65535;
  const a0 = f.absmag.offset || 0, as = f.absmag.scale || 1, b0 = f.bv.offset || 0, bs = f.bv.scale || 1;
  const dir = [0, 0, 0];
  for (let i = 0; i < n; i += 1) {
    octDecode(cols.u[i] / 65535 * 2 - 1, cols.v[i] / 65535 * 2 - 1, dir, 0);
    const d = d0 * Math.exp(cols.r[i] * k);
    posLy[i * 3] = dir[0] * d;
    posLy[i * 3 + 1] = dir[1] * d;
    posLy[i * 3 + 2] = dir[2] * d;
    absMag[i] = a0 + cols.absmag[i] * as;
    bv[i] = cols.bv[i] === 255 ? NaN : b0 + cols.bv[i] * bs;
  }
  return { count: n, posLy, absMag, bv, ref: cols.ref, src: cols.src };
}

/** The inverse of stage.affineFrom's map (scene = o + x kmX + y kmY + z kmZ), in light-years. Pure. */
export function sceneToLy(A, p, lyKm = 9460730472580.8) {
  const det3 = (a, b, c) => a[0] * (b[1] * c[2] - b[2] * c[1]) - b[0] * (a[1] * c[2] - a[2] * c[1]) + c[0] * (a[1] * b[2] - a[2] * b[1]);
  const det = det3(A.x, A.y, A.z);
  if (!det) return null;
  const v = [p[0] - A.o[0], p[1] - A.o[1], p[2] - A.o[2]];
  // Cramer's rule: each column replaced by v in turn
  return [det3(v, A.y, A.z) / det / lyKm, det3(A.x, v, A.z) / det / lyKm, det3(A.x, A.y, v) / det / lyKm];
}

export function refName(ref) {
  const r = ref >>> 0;
  if (!(r & 0x80000000)) return null;
  return `TYC ${(r >>> 17) & 0x3fff}-${(r >>> 3) & 0x3fff}-${r & 7}`;
}

/** What is known of a distance's error, from where the distance came (the tile's src bits 0-2). MODELLED. Pure. */
export function distanceNote(distLy, src) {
  const code = src & 7;
  const from = FROM[code] || 'other';
  const sigmaMas = SIGMA_MAS[code];
  if (!(distLy > 0)) return null;
  const pc = distLy / LY_PER_PC;
  if (!sigmaMas) return { from, sigmaMas: null, poe: null, pct: null, guess: pc > GUESS_PC };
  const parallaxMas = 1000 / pc;
  const poe = parallaxMas / sigmaMas;
  return { from, sigmaMas, poe, pct: 100 / poe, guess: pc > GUESS_PC };
}

/** scene/stars3d.js's VERT with the faint field (A FULLER SKY above), or null when the line it changes is not there. */
export function faintVert(src) {
  if (typeof src !== 'string' || !src.includes(ALPHA_LINE) || !src.includes(SIZE_LINE)) return null;
  // past the limit a star's sprite widens by half over its first magnitude: the same peak spread softer, so a field of
  // them reads as a glow of points on a phone's dense screen and not as single device pixels
  const size = 'float sizePx = size * uPixelRatio * uScale * ( uShell > 0.5 ? 1.0 : 1.0 + 0.5 * smoothstep( uMagLimit, uMagLimit + 1.0, m ) );';
  return 'uniform float uFaintPast;\n' + src.replace(SIZE_LINE, size).replace(ALPHA_LINE, [
    'float srLim = uShell > 0.5 ? uMagLimit : uMagLimit + uFaintPast;',
    // from HYG's light at the limit down to 40 % of it at the end, and out over the last half magnitude: a field, not a cliff
    '  float srX = clamp( ( m - uMagLimit ) / max( 1e-3, uFaintPast ), 0.0, 1.0 );',
    '  float srFade = m <= uMagLimit ? 1.0 : ( 1.0 - 0.6 * srX ) * smoothstep( srLim, srLim - 0.5, m );',
    '  vAlpha = ( m > srLim ) ? 0.0 : ( 0.35 + 0.65 * tt ) * srFade * uGain;',
  ].join('\n'));
}

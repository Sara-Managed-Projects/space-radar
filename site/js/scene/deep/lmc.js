// scene/deep/lmc.js -- the Large Magellanic Cloud and the Tarantula as one nested hero (internal spec 0075
// stage c, #788; tasks 12-13; DS-C05 #816, DS-B10 #811). Built by scene/deep/deepsky.js when the LMC is
// large on screen; registry/deepsky-heroes/lmc.yaml is its profile (every number below that is not a
// drawing choice comes from there, with its source). scene/deep/helix.js's head says what a hero answers.
//
// WHAT IT DRAWS, in the LMC's own frame (x along the line of nodes, y the disc's axis, z across; one unit
// is 100 ly), turned to the sky by the measured tilt and line of nodes:
//   * the DISC's unresolved light: two Gaia DR3 star-count maps (all members; young blue stars), carried
//     from the sky onto the tilted disc plane, each with its own thickness (a sech^2 layer); and dust that
//     follows the young stars (an illustration). One mesh. The vertical integral is ANALYTIC per step
//     (tanh), and the steps only sample the map along the ray: a face-on view is exact with one sample,
//     an edge-on one is right with a few, and nothing ever shows as layers (the foundation's T0 shells
//     read as rings on phones).
//   * STARS: points drawn from the same maps, each at a depth drawn from the layer's thickness: a
//     statistical population, never one Gaia star at a parallax distance (at 160 000 ly a parallax is
//     far below Gaia's error; the package's section 5.2 forbids it). Their brightness falls as 1/d^2 from
//     the camera with a surface brightness that does not change with distance, so far away they are the
//     galaxy's grain and near they resolve into a star field.
//   * the H II regions as glowing nodes at their catalogued places on the disc, and R136's glow;
//   * the TARANTULA: its own march (more steps when it is selected and large), a cavity round R136 in a
//     shell of gas (Pellegrini et al. 2011), dark filaments in front of it under the Film look, at the
//     registry's place and size, so it is inside the LMC by construction and drawn only with it;
//   * R136's stars, a Plummer sphere at SIMBAD's place.
// Four draw calls: the disc, the stars, the sprites (nodes and R136's glow), the Tarantula.
//
// THE PHOTOGRAPH. The LMC's photograph (scene/nebulae.js; SMASH, NOIRLab) is centred 1.94 degrees south of
// the galaxy and its frame cuts the north of it off ("the soft bottom cut", spec 0075 task 36). Every part
// of this model is weighted by 1 - share * cover, where cover is how much of the photograph is drawn THERE
// (the same frame and ellipse fade as the photograph's shader, mirrored in photoCover below) and share is
// how much of the photograph is drawn now. At arrival the photograph shows what it shows and the model
// draws the rest of the galaxy round it; turned off its line, the photograph fades and the model is whole.
// The Tarantula's photograph (Webb) gets the same.
//
// UNDER THE MEASURED LOOK: the stars, nodes and disc are the same (a labelled model); the generated
// detail (the noise in the dust and in the Tarantula's gas) is hidden; nothing ever moves.

import { stage } from '../stage.js';
import { discFrame } from '../../data/deepsky.js';
import { PICTURE_FOR, pictureBasis, pictureHalfExtent, eqToEcl, eclToEq, ellipseInPicture } from '../nebulae.js';
import { marchSteps, noiseTexture } from './gasmat.js';
import { drawnUnder, exposureLook } from '../exposure.js';

// Nothing in this hero moves in either look, so there is no `still` row to hold (tests/test_look_setting.mjs).
export const UNDER_MEASURED = { stars: 'same', nodes: 'same', disc: 'same', noise: 'hidden' };
/** The words block the card reads for this hero's records (copy/en.later.js). */
export const COPY_BLOCK = 'deepLmc';
export const DRAWN = { 'dso-lmc': ['model'], 'dso-tarantula-nebula': ['model'] };
export const MAP_BINS = 128;
export const MAP_BIN_DEG = 0.125;
export const DISC_TEX = 256;
/** Half the disc texture's side, in object units (26 000 ly): past the catalogue ellipse's fade. */
export const DISC_EXTENT = 260;
const LY_KM = 9460730472580.8;
const D2R = Math.PI / 180;
const SUN_INERTIAL = 'sun-inertial';
const TARANTULA = 'dso-tarantula-nebula';
const MAP_URL = new URL('../../../data/deep/lmc-density.bin', import.meta.url);
const SPRITE_MAX_PX = 480;

// ---------------------------------------------------------------------------------- pure geometry
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** An equatorial J2000 unit vector. Pure. */
export function eqDir(raDeg, decDeg) {
  const a = raDeg * D2R, d = decDeg * D2R;
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
}
/** The same direction in sun-inertial axes (ecliptic J2000), the frame of every record's `pos`. Pure. */
export const siDir = (raDeg, decDeg) => eqToEcl(eqDir(raDeg, decDeg));

/**
 * The LMC's frame from its profile (and its record's position, when there is one): the distance D (ly),
 * the unit vector u from the Sun to its centre, and its axes X (line of nodes), Y (the disc's axis, toward
 * our side) and Z, in sun-inertial. Pure.
 */
export function lmcGeometry(profile, posKm = null) {
  const f = (profile && profile.frame) || {};
  const c = f.centre || { ra_deg: 80.8917, dec_deg: -69.7567 };
  let u = siDir(c.ra_deg, c.dec_deg);
  let D = 161740;
  if (posKm && Number.isFinite(posKm.x)) {
    const d = Math.hypot(posKm.x, posKm.y, posKm.z);
    if (d > 0) { u = [posKm.x / d, posKm.y / d, posKm.z / d]; D = d / LY_KM; }
  }
  const fr = discFrame({ x: u[0], y: u[1], z: u[2] }, f.pa_deg ?? 122.5, f.incl_deg ?? 34.7, f.near_side || 'NE');
  const X = norm(fr.major), Y = norm(fr.normal);
  const Z = norm(cross(X, Y));
  const ce = eqDir(c.ra_deg, c.dec_deg);
  const a0 = c.ra_deg * D2R, d0 = c.dec_deg * D2R;
  return {
    D, u, X, Y, Z, unit: Number(f.units_ly) || 100,
    centreEq: ce,
    east: [-Math.sin(a0), Math.cos(a0), 0],
    north: [-Math.sin(d0) * Math.cos(a0), -Math.sin(d0) * Math.sin(a0), Math.cos(d0)],
    extent: f.extent || { maj_arcmin: 645, min_arcmin: 517, pa_deg: 9.3, fade_from: 0.85, fade_to: 1.35 },
  };
}
/** Sun-inertial light-years from the LMC's centre -> its frame's object units. Pure. */
export const toGal = (g, v) => [dot(v, g.X) / g.unit, dot(v, g.Y) / g.unit, dot(v, g.Z) / g.unit];
/** Its frame's object units -> sun-inertial light-years from the centre. Pure. */
export const fromGal = (g, p) => add3(add3(g.X.map((x) => x * p[0] * g.unit), g.Y, p[1] * g.unit), g.Z, p[2] * g.unit);
/** Where a line of sight from the Sun (a sun-inertial unit vector) meets the disc's plane, in object units. Pure. */
export function deproject(g, dir) {
  const s = (g.D * dot(g.u, g.Y)) / dot(dir, g.Y);
  return toGal(g, add3(dir.map((x) => x * s), g.u, -g.D));
}
/** The sun-inertial direction from the Sun to a point of the frame (object units). Pure. */
export const skyDir = (g, p) => norm(add3(fromGal(g, p), g.u, g.D));
/** A record placed at the LMC's distance in its own direction (the registry's rule), in object units. Pure. */
export const memberAt = (g, raDeg, decDeg) => toGal(g, add3(siDir(raDeg, decDeg).map((x) => x * g.D), g.u, -g.D));
/** A sun-inertial direction on the maps' tangent plane: [xi east, eta north], degrees. Pure. */
export function gnomonic(g, dir) {
  const e = eclToEq(dir);
  const w = dot(e, g.centreEq);
  return [dot(e, g.east) / w / D2R, dot(e, g.north) / w / D2R];
}
/** Bilinear sample of a 128 x 128 map (row 0 south, x east) at (xi, eta) degrees; 0 off it. Pure. */
export function mapAt(map, xi, eta, n = MAP_BINS, bin = MAP_BIN_DEG) {
  const fx = (xi + (n * bin) / 2) / bin - 0.5, fy = (eta + (n * bin) / 2) / bin - 0.5;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  if (x0 < 0 || y0 < 0 || x0 + 1 >= n || y0 + 1 >= n) return 0;
  const tx = fx - x0, ty = fy - y0;
  const at = (x, y) => map[y * n + x];
  return (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty;
}
/** The catalogue ellipse's radius at a tangent-plane point: 1 on the 645' x 517' ellipse. Pure. */
export function extentRadius(g, xi, eta) {
  const e = g.extent, pa = e.pa_deg * D2R;
  const along = xi * Math.sin(pa) + eta * Math.cos(pa), across = xi * Math.cos(pa) - eta * Math.sin(pa);
  return Math.hypot(along / (e.maj_arcmin / 120), across / (e.min_arcmin / 120));
}

/** A picture's (u, v) for an equatorial direction (scene/nebulae.js skyToPicture, from a vector). Pure. */
function pictureUv(row, eq) {
  const { centre, right, up } = pictureBasis(row);
  const along = dot(eq, centre);
  if (!(along > 1e-6)) return null;
  const h = pictureHalfExtent(row);
  return { u: 0.5 + dot(eq, right) / along / h.x / 2, v: 0.5 + dot(eq, up) / along / h.y / 2 };
}
/**
 * How much of a photograph is drawn in a direction: scene/nebulae.js FRAG's fade (the frame, and for a
 * galaxy its own ellipse too), squared as the shader squares it. `ell` from ellipseInPicture. Pure.
 */
export function photoCover(row, ell, eq) {
  if (!row) return 0;
  const uv = pictureUv(row, eq);
  if (!uv) return 0;
  const qx = Math.abs(uv.u * 2 - 1), qy = Math.abs(uv.v * 2 - 1);
  let f;
  if (ell) {
    const du = uv.u - ell.u, dv = uv.v - ell.v;
    const r = Math.hypot(ell.x[0] * du + ell.x[1] * dv, ell.y[0] * du + ell.y[1] * dv);
    const frame = Math.pow(qx ** 4 + qy ** 4, 1 / 4);
    f = (1 - smooth(0.5, 1, r)) * (1 - smooth(0.55, 0.98, frame));
  } else {
    f = 1 - smooth(0.5, 0.98, Math.pow(qx ** 3 + qy ** 3, 1 / 3));
  }
  return f * f;
}

/** Two maps from the baked bin: little-endian uint16, 128 x 128 each, scaled to 0..1. Pure. */
export function readMaps(buffer, n = MAP_BINS) {
  const dv = new DataView(buffer);
  const maps = [];
  for (let m = 0; m < 2; m++) {
    const a = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) a[i] = dv.getUint16((m * n * n + i) * 2, true) / 65535;
    maps.push(a);
  }
  return maps;
}

/**
 * The disc in its own plane: for every texel (x, z) the line of sight to it, the two maps there, the
 * catalogue fade, and how much of the LMC's photograph covers it. Pure (typed arrays out).
 */
export function buildDisc(g, maps, { size = DISC_TEX, extent = DISC_EXTENT, row = null, ell = null } = {}) {
  const old = new Float32Array(size * size), young = new Float32Array(size * size), cover = new Float32Array(size * size);
  const uv = new Float32Array(size * size * 2); // where on the photograph each texel's line of sight falls
  const e = g.extent;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = ((i + 0.5) / size * 2 - 1) * extent, z = ((j + 0.5) / size * 2 - 1) * extent;
      const dir = skyDir(g, [x, 0, z]);
      const [xi, eta] = gnomonic(g, dir);
      const taper = 1 - smooth(e.fade_from, e.fade_to, extentRadius(g, xi, eta));
      const k = j * size + i;
      old[k] = maps[0] ? mapAt(maps[0], xi, eta) * taper : 0;
      young[k] = maps[1] ? mapAt(maps[1], xi, eta) * taper : 0;
      cover[k] = row ? photoCover(row, ell, eclToEq(dir)) : 0;
      const q = row ? pictureUv(row, eclToEq(dir)) : null;
      uv[k * 2] = q ? q.u : -1; uv[k * 2 + 1] = q ? q.v : -1;
    }
  }
  return { old, young, cover, uv, size, extent };
}

/** A seeded generator (mulberry32): the same stars every visit. Pure. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * `n` stars drawn from a disc density (one texel by its weight, a place inside it at random, a depth
 * from a sech^2 layer of `z0` object units): positions, the texel each fell in, and the peak surface
 * density (stars per object unit^2) the brightness is scaled by. Pure.
 */
export function sampleStars(density, { n, size, extent, z0, seed }) {
  const cdf = new Float64Array(density.length);
  let sum = 0, peak = 0;
  for (let i = 0; i < density.length; i++) { sum += density[i]; cdf[i] = sum; if (density[i] > peak) peak = density[i]; }
  const pos = new Float32Array(n * 3), texel = new Uint32Array(n);
  if (!(sum > 0) || !(n > 0)) return { pos: new Float32Array(0), texel: new Uint32Array(0), peakPerArea: 0, n: 0 };
  const r = rng(seed);
  const cell = (2 * extent) / size;
  for (let s = 0; s < n; s++) {
    const want = r() * sum;
    let lo = 0, hi = cdf.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < want) lo = mid + 1; else hi = mid; }
    const i = lo % size, j = Math.floor(lo / size);
    const t = Math.min(0.999999, Math.max(1e-6, r()));
    pos[s * 3] = -extent + (i + r()) * cell;
    pos[s * 3 + 1] = Math.max(-4, Math.min(4, Math.atanh(2 * t - 1))) * z0; // sech^2: z = z0 atanh(2u - 1)
    pos[s * 3 + 2] = -extent + (j + r()) * cell;
    texel[s] = lo;
  }
  return { pos, texel, peakPerArea: (peak / sum) * n / (cell * cell), n };
}

/** A star's luminosity, a heavy-tailed draw with mean about 1: most stars faint, a few bright. Pure. */
export const luminosity = (u) => 0.45 * Math.pow(1 - 0.995 * u, -0.55);

// ------------------------------------------------------------------------------------------- GLSL
const COMMON = /* glsl */ `
uniform float uShare;
uniform float uGain;
uniform float uPhoto;      // how much of the LMC's photograph is drawn now
`;

// The disc: an ellipsoid (radii E, H, E) drawn by its back faces; each step samples the maps where the ray
// is and integrates the two sech^2 layers over the step EXACTLY (tanh), so there are never layers to see.
const DISC_VERT = /* glsl */ `
varying vec3 vObj;
void main() {
  vObj = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;
const DISC_FRAG = /* glsl */ `
precision highp sampler3D;
${COMMON}
uniform vec3 uCamObj;      // the camera in the mesh's unit sphere
uniform vec3 uRadii;       // the ellipsoid, object units
uniform sampler2D uDisc;   // r: old, g: young (square roots), b: unused, a: the photograph's cover
uniform float uExtent;
uniform vec2 uZ0;          // the two layers' scale heights, object units
uniform vec3 uColOld;
uniform vec3 uColYoung;
uniform vec2 uK;           // their surface brightness at the maps' peaks
uniform float uSigma;      // dust: optical depth through the young layer at the young map's peak
uniform float uNoiseAmp;
uniform sampler3D uNoise;
uniform int uSteps;
uniform sampler2D uPic;    // the LMC's photograph (scene/nebulae.js's file), its display values
uniform sampler2D uPicUv;  // per disc texel, where its line of sight falls on the photograph
uniform float uPicOn;
uniform vec4 uPicLook;     // the exposure's stretch (nebulae.js): gain, gamma, saturation; the sky floor
uniform float uPicK;
varying vec3 vObj;
float slab( float ya, float yb, float dy, float len, float z0 ) {
  // the fraction of a face-on column a straight piece of ray holds, for a sech^2 layer: exact
  if ( abs( dy ) * len < 1e-3 * z0 ) { float c = 1.0 / cosh( clamp( 0.5 * ( ya + yb ) / z0, -9.0, 9.0 ) ); return c * c * len / ( 2.0 * z0 ); }
  return abs( tanh( clamp( yb / z0, -9.0, 9.0 ) ) - tanh( clamp( ya / z0, -9.0, 9.0 ) ) ) / ( 2.0 * abs( dy ) );
}
void main() {
  if ( uShare <= 0.0 ) discard;
  vec3 ro = uCamObj;
  vec3 rd = normalize( vObj - ro );
  float b = dot( ro, rd );
  float h = b * b - ( dot( ro, ro ) - 1.0 );
  if ( h <= 0.0 ) discard;
  h = sqrt( h );
  float t0 = max( 0.0, -b - h );
  float t1 = -b + h;
  if ( t1 <= t0 ) discard;
  vec3 dPhys = rd * uRadii;                 // object units per unit of t
  float speed = length( dPhys );
  float dy = dPhys.y / speed;               // the ray's slope against the disc
  float jitter = fract( sin( dot( gl_FragCoord.xy, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); // white, not a lattice: with few steps a structured offset showed as a grid (look, 2026-10-15)
  float dt = ( t1 - t0 ) / float( uSteps );
  vec3 C = vec3( 0.0 );
  float T = 1.0;
  for ( int i = 0; i < 16; i++ ) {
    if ( i >= uSteps ) break;
    float ta = t0 + float( i ) * dt;
    vec3 pa = ( ro + rd * ta ) * uRadii;
    vec3 pb = ( ro + rd * ( ta + dt ) ) * uRadii;
    vec3 ps = ( ro + rd * ( ta + jitter * dt ) ) * uRadii;   // where the maps are read
    vec4 m = texture2D( uDisc, ps.xz / ( 2.0 * uExtent ) + 0.5 );
    float len = dt * speed;
    float wo = slab( pa.y, pb.y, dy, len, uZ0.x );
    float wy = slab( pa.y, pb.y, dy, len, uZ0.y );
    float old = m.r * m.r, young = m.g * m.g;
    float dust = young;
    if ( uNoiseAmp > 0.0 ) {
      // generated detail below the maps' 350 ly bins (Film only): clumps in the young light, patches of dust
      float n = texture( uNoise, ps * 0.012 + vec3( 0.31, 0.17, 0.53 ) ).r;
      float n2 = texture( uNoise, ps * 0.031 + vec3( 0.71, 0.05, 0.29 ) ).r;
      dust *= mix( 1.0, 0.15 + 1.9 * n * n, uNoiseAmp );
      young *= mix( 1.0, 0.35 + 1.3 * n2, uNoiseAmp );
    }
    vec3 e = uColOld * uK.x * old * wo + uColYoung * uK.y * young * wy;
    if ( uPicOn > 0.002 && m.a > 0.002 ) {
      // Where the photograph covers the galaxy, ITS light is the disc's emissivity, spread through the old
      // layer: seen along our line the model is the photograph; turned, the same light in the tilted disc.
      vec2 puv = texture2D( uPicUv, ps.xz / ( 2.0 * uExtent ) + 0.5 ).rg;
      vec3 t = max( texture2D( uPic, puv ).rgb - uPicLook.w, 0.0 ) / ( 1.0 - uPicLook.w );
      vec3 c = pow( t, vec3( uPicLook.y ) ) * uPicLook.x;
      float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
      c = mix( vec3( l ) * vec3( 0.86, 0.96, 1.0 ), c, uPicLook.z );
      e = mix( e, c * uPicK * wo, m.a * uPicOn );
    }
    e *= 1.0 - uPhoto * m.a;
    // the photograph already holds its own dust: the model's darkens it less
    float tau = uSigma * dust * wy * ( 1.0 - 0.7 * m.a * uPicOn );
    // light and dust mixed in the step: what leaves it is e (1 - exp(-tau)) / tau
    float k = tau > 1e-4 ? ( 1.0 - exp( -tau ) ) / tau : 1.0;
    C += T * e * k;
    T *= exp( -tau * ( 1.0 - uPhoto * m.a ) );
  }
  vec3 col = C * uGain * uShare;
  col = col / ( 1.0 + 0.6 * col );          // a soft shoulder: an edge-on disc is bright, not white
  gl_FragColor = vec4( col, ( 1.0 - T ) * uShare );   // premultiplied over: the dust darkens what is behind
}
`;

// Stars: points of a fixed small size whose brightness falls as 1 / d^2; past 1 they grow (the area
// would carry the light): no longer, they stay pinpoints, capped. uSb: the surface brightness at the map's peak density.
const STAR_VERT = /* glsl */ `
${COMMON}
attribute vec4 aStar;      // colour times luminosity; w: the photograph's cover there (+ 2 for R136's stars)
uniform float uUnit;       // scene units per object unit
uniform float uPixAng;     // a device pixel's angle, radians
uniform float uBase;       // a star's size, device px
uniform float uPeak;       // stars per object unit^2 at the peak (old, young and R136 share one scale)
uniform float uSb;
varying vec3 vCol;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  float d = length( mv.xyz ) / uUnit;
  float pix = d * uPixAng;                  // a pixel's side at the star, object units
  // capped: a point stands for many stars, so close up it would otherwise outshine a real one
  // R136's stars carry 2 + cover in w: a cluster of RESOLVED blue-white points, brighter and a little larger
  // (the Tarantula review: a blurred disc at its heart); every other point stays sparkle.
  float isCl = step( 1.5, aStar.w );
  float cover = aStar.w - 2.0 * isCl;
  float bright = min( uSb / max( uPeak * pix * pix * uBase * uBase, 1e-12 ), mix( 1.2, 6.0, isCl ) );
  bright *= uShare * uGain * ( 1.0 - uPhoto * cover );
  float grow = isCl > 0.5 ? clamp( 0.6 * sqrt( bright * length( aStar.rgb ) ), 1.0, 2.6 ) : 1.0; // others never grown (the M31 review)
  gl_PointSize = mv.z < 0.0 ? uBase * grow : 0.0;
  vCol = aStar.rgb * bright / ( grow * grow );
}
`;
const STAR_FRAG = /* glsl */ `
varying vec3 vCol;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot( c, c );
  if ( r2 > 1.0 ) discard;
  vec3 col = vCol * exp( -2.5 * r2 ) * 1.45;
  gl_FragColor = vec4( min( col, vec3( 4.0 ) ), 1.0 );
}
`;

// Sprites: the H II nodes and R136's glow, at their own size in object units, as bright per area at any
// distance; under a pixel they keep their light in a pixel; when the camera is inside one it fades.
const SPRITE_VERT = /* glsl */ `
${COMMON}
attribute vec4 aSprite;    // colour times brightness; w: radius, object units (negative: R136's core)
attribute vec2 aCover;     // the LMC photograph's cover there; 1 when the Tarantula's photograph covers it too
uniform float uUnit;
uniform float uProjPx;     // projectionMatrix[1][1] * the drawing buffer's height / 2
uniform float uPhotoT;     // how much of the Tarantula's photograph is drawn now
uniform float uMinPx;
varying vec3 vCol;
varying float vCore;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  float z = -mv.z;
  vCore = aSprite.w < 0.0 ? 1.0 : 0.0;
  float rWorld = abs( aSprite.w ) * uUnit;
  float px = 2.0 * rWorld / max( z, 1e-9 ) * uProjPx;
  float size = clamp( px, uMinPx, ${SPRITE_MAX_PX.toFixed(1)} );
  float keep = px < uMinPx ? ( px / uMinPx ) * ( px / uMinPx ) : 1.0;
  float inside = smoothstep( 1.2, 3.0, z / max( rWorld, 1e-9 ) );
  gl_PointSize = z > 0.0 ? size : 0.0;
  vCol = aSprite.rgb * keep * inside * uShare * uGain * ( 1.0 - uPhoto * aCover.x ) * ( 1.0 - uPhotoT * aCover.y );
}
`;
const SPRITE_FRAG = /* glsl */ `
varying vec3 vCol;
varying float vCore;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot( c, c );
  if ( r2 > 1.0 ) discard;
  float r = sqrt( r2 );
  // An H II region: a crisp edge and a shell brighter toward it (its ionisation front), not a soft disc
  // (the Tarantula review). R136's core: compact, falling off fast.
  float a = vCore > 0.5 ? exp( -7.0 * r2 ) * ( 1.0 - r2 )
                        : ( 1.0 - smoothstep( 0.93, 1.0, r ) ) * ( 0.12 + 0.88 * smoothstep( 0.72, 0.95, r ) );
  gl_FragColor = vec4( vCol * a, 1.0 );
}
`;

// The Tarantula: a march in its own unit sphere (the Tarantula review of 2026-10-15: no pink fog).
//   * THE IONISATION FRONT: the cavity R136's winds blew has a wall, found EXACTLY where each ray crosses
//     it (a sphere round R136, no step can miss it), so it is crisp at any step count; brighter where the
//     line grazes it (limb), more of it behind R136 (the confining cloud), and under Film broken into arcs.
//   * THE GAS outside the front falls off outward; the cavity is nearly empty; no halo fills the view.
//   * MOLECULAR CLOUDS (Film only, generated): dark where dense, their surfaces facing R136 lit, the
//     backlit rims of the pictures.
//   * ALONG OUR LINE, the Webb photograph is the colour (its own structure), as the Helix's is: within 25
//     degrees of the line it was taken along, gone by 45.
const NEB_FRAG = /* glsl */ `
precision highp sampler3D;
${COMMON}
uniform vec3 uCamObj;
uniform float uRadius;     // object units
uniform vec3 uR136;        // R136 in the unit sphere
uniform vec3 uAway;        // the unit vector from the Sun, in the unit sphere's axes
uniform vec2 uShell;       // the front's radius round R136 and the gas's fall-off outside it, in the nebula's radius
uniform vec2 uFront;       // the front's brightness, the clouds' rims'
uniform vec3 uColHa;
uniform vec3 uColO3;
uniform float uK;
uniform float uSigma;
uniform float uNoiseAmp;
uniform float uCover;      // how much of the LMC's photograph covers the Tarantula
uniform float uPhotoT;
uniform vec3 uPicC;        // the Tarantula photograph: its plane's centre, right and up in the unit sphere,
uniform vec3 uPicR;        // the latter two scaled so that (u, v) = 0.5 + dot / 2
uniform vec3 uPicU;
uniform sampler2D uTPic;   // that photograph (Webb, weic2212a), display values
uniform float uTPicOn;     // how honest it is now: 1 within 25 degrees of its line, 0 by 45
uniform vec3 uTPicLook;    // the exposure's stretch: gain, gamma, saturation
uniform sampler3D uNoise;
uniform int uSteps;
varying vec3 vObj;
vec2 picUv( vec3 p ) { vec3 q = p - uPicC; return 0.5 + 0.5 * vec2( dot( q, uPicR ), dot( q, uPicU ) ); }
float coverT( vec3 p ) {
  // where the Tarantula's photograph is drawn on the line through p (its own frame fade, nebulae.js)
  vec2 a = abs( picUv( p ) * 2.0 - 1.0 );
  float e = pow( pow( a.x, 3.0 ) + pow( a.y, 3.0 ), 1.0 / 3.0 );
  float f = 1.0 - smoothstep( 0.5, 0.98, e );
  return f * f;
}
vec3 tint( vec3 p, vec3 model ) {
  if ( uTPicOn <= 0.001 ) return model; // off its line: no lookups at all
  float k = uTPicOn * coverT( p );
  if ( k <= 0.001 ) return model;
  vec3 c = pow( texture2D( uTPic, clamp( picUv( p ), 0.0, 1.0 ) ).rgb, vec3( uTPicLook.y ) ) * uTPicLook.x;
  float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  c = mix( vec3( l ) * vec3( 0.86, 0.96, 1.0 ), c, uTPicLook.z );
  return mix( model, c * 2.4, k );
}
float arcs( vec3 p ) {
  if ( uNoiseAmp <= 0.0 ) return 1.0;
  float n = texture( uNoise, p * 0.7 + vec3( 0.21, 0.47, 0.83 ) ).r;
  return mix( 1.0, smoothstep( 0.34, 0.6, n ), uNoiseAmp );
}
void main() {
  if ( uShare <= 0.0 ) discard;
  vec3 ro = uCamObj;
  vec3 rd = normalize( vObj - ro );
  float b = dot( ro, rd );
  float h = b * b - ( dot( ro, ro ) - 1.0 );
  if ( h <= 0.0 ) discard;
  h = sqrt( h );
  float t0 = max( 0.0, -b - h );
  float t1 = -b + h;
  if ( t1 <= t0 ) discard;
  // the front: where this ray crosses the sphere round R136, exactly
  vec3 oc = ro - uR136;
  float fb = dot( oc, rd );
  float fh = fb * fb - ( dot( oc, oc ) - uShell.x * uShell.x );
  float tA = -1.0, tB = -1.0;
  if ( fh > 0.0 ) { fh = sqrt( fh ); tA = -fb - fh; tB = -fb + fh; }
  float jitter = fract( sin( dot( gl_FragCoord.xy, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); // white, not a lattice
  float dt = ( t1 - t0 ) / float( uSteps );
  float ds = dt * uRadius;
  vec3 C = vec3( 0.0 );
  float T = 1.0;
  vec3 frontCol = mix( uColO3, uColHa, 0.55 );
  vec3 rimCol = mix( uColHa, vec3( 1.0, 0.86, 0.76 ), 0.35 );
  for ( int i = 0; i < 48; i++ ) {
    if ( i >= uSteps ) break;
    float ta = t0 + float( i ) * dt;
    for ( int j = 0; j < 2; j++ ) {
      float tf = j == 0 ? tA : tB;
      if ( tf >= ta && tf < ta + dt && tf > 0.0 ) {
        vec3 pf = ro + rd * tf;
        vec3 nf = normalize( pf - uR136 );
        float mu = abs( dot( nf, rd ) );
        // limb-brightened, but a grazing ray fades: the first look drew the wall's edge as a glass ball's rim
        float limb = smoothstep( 0.04, 0.3, mu ) / max( mu, 0.3 );
        float wf = arcs( pf ) * ( 0.5 + 0.5 * dot( nf, uAway ) ) * ( 1.0 - smoothstep( 0.85, 1.0, length( pf ) ) );
        C += T * tint( pf, frontCol ) * uFront.x * wf * limb * ( uPhotoT > 0.0 ? 1.0 - uPhotoT * coverT( pf ) : 1.0 );
      }
    }
    vec3 p = ro + rd * ( ta + jitter * dt );
    float r = length( p );
    vec3 q = p - uR136;
    float rq = length( q );
    float back = dot( q / max( rq, 1e-4 ), uAway );
    float d = rq - uShell.x;
    float rho = ( d > 0.0 ? exp( -d / uShell.y ) : 0.05 ) * ( 0.55 + 0.45 * back ) + 1.2 * exp( -rq * rq / 0.0015 );
    rho *= 1.0 - smoothstep( 0.8, 1.0, r );
    float dust = 0.0, rim = 0.0;
    if ( uNoiseAmp > 0.0 ) {
      float n1 = texture( uNoise, p * 0.45 + vec3( 0.13, 0.71, 0.37 ) ).r;
      float n2 = texture( uNoise, p * 0.6 + vec3( 0.59, 0.23, 0.11 ) ).r;
      // patchy: filaments with dark gaps between, never an even pink (the review: a screen-filling haze)
      rho *= mix( 1.0, 0.05 + 2.2 * n1 * n1, uNoiseAmp );
      // the clouds lie in a band just outside the front (the second look: a whole sphere of them read as a cauliflower)
      float band = smoothstep( uShell.x * 0.9, uShell.x * 1.15, rq ) * ( 1.0 - smoothstep( uShell.x * 1.5, uShell.x * 2.1, rq ) );
      dust = uNoiseAmp * smoothstep( 0.62, 0.74, n2 ) * band;
      rim = uNoiseAmp * smoothstep( 0.54, 0.62, n2 ) * ( 1.0 - smoothstep( 0.62, 0.68, n2 ) ) * band / ( 1.0 + 6.0 * rq * rq );
    }
    vec3 col = tint( p, mix( uColO3, uColHa, smoothstep( 0.06, 0.38, rq ) ) );
    float w = uPhotoT > 0.0 ? 1.0 - uPhotoT * coverT( p ) : 1.0;
    C += T * ( col * rho * uK + rimCol * rim * uFront.y ) * ds * w;
    T *= exp( -uSigma * dust * ds * w );
    if ( T < 0.02 ) break;
  }
  float hide = 1.0 - uPhoto * uCover;
  vec3 col = C * uGain * uShare * hide;
  col = col / ( 1.0 + 0.5 * col );
  gl_FragColor = vec4( col, ( 1.0 - T ) * uShare * hide );
}
`;

function policy(THREE, m, absorbing) {
  // scene/deep/gasmat.js COLOUR_POLICY: display values, no tone mapping, the opaque list, no depth write;
  // additive for light, premultiplied "over" (with GAS_ABSORB, as gasmat's) for what also absorbs.
  m.transparent = false; m.depthWrite = false; m.depthTest = false; m.toneMapped = false;
  if (absorbing) {
    m.defines = { ...(m.defines || {}), GAS_ABSORB: '' };
    m.blending = THREE.CustomBlending; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor;
  } else m.blending = THREE.AdditiveBlending;
  return m;
}
const common = (THREE) => ({ uShare: { value: 0 }, uGain: { value: 1 }, uPhoto: { value: 0 } });

// --------------------------------------------------------------------------------------- the hero
export function createHero(THREE, env = {}) {
  const profile = env.profile || {};
  const layers = Array.isArray(profile.layers) ? profile.layers : [];
  const layer = (kind, i = 0) => layers.filter((l) => l && l.kind === kind)[i] || null;
  const record = env.record || null;
  const g = lmcGeometry(profile, record && record.pos);
  const group = new THREE.Group();
  group.name = `deep-hero-${profile.id || 'lmc'}`;
  // The LMC's own frame inside the coordinator's group (which is placed and scaled, not turned).
  const frameGroup = new THREE.Group();
  frameGroup.name = 'deep-lmc-frame';
  frameGroup.matrixAutoUpdate = false;
  group.add(frameGroup);

  const lmcRow = PICTURE_FOR.get('dso-lmc') || null;
  const tarRow = PICTURE_FOR.get(TARANTULA) || null;
  const ext = g.extent;
  const lmcEll = lmcRow ? ellipseInPicture(lmcRow, profile.frame && profile.frame.centre ? profile.frame.centre.ra_deg : 80.8917, profile.frame && profile.frame.centre ? profile.frame.centre.dec_deg : -69.7567, ext.maj_arcmin, ext.min_arcmin, ext.pa_deg) : null;

  // ------------------------------------------------------------------ the disc (built now, filled later)
  const oldL = layer('stars', 0) || { scale_height_ly: 1600, colour: [1, 0.84, 0.66], count: { t0: 6000, t1: 42000, t2: 84000 } };
  const youngL = layer('stars', 1) || { scale_height_ly: 330, colour: [0.66, 0.79, 1], count: { t0: 2500, t1: 14000, t2: 26000 } };
  const z0 = [oldL.scale_height_ly / g.unit, youngL.scale_height_ly / g.unit];
  const makeTex = (data, n) => {
    const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
    t.colorSpace = THREE.NoColorSpace;
    t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  };
  let discTex = makeTex(new Uint8Array(4), 1);
  const discMat = policy(THREE, new THREE.ShaderMaterial({
    vertexShader: DISC_VERT, fragmentShader: DISC_FRAG, side: THREE.BackSide,
    uniforms: {
      ...common(THREE),
      uCamObj: { value: new THREE.Vector3(0, 0, 3) }, uRadii: { value: new THREE.Vector3(DISC_EXTENT, 4 * z0[0], DISC_EXTENT) },
      uDisc: { value: discTex }, uExtent: { value: DISC_EXTENT }, uZ0: { value: new THREE.Vector2(z0[0], z0[1]) },
      uColOld: { value: new THREE.Vector3(...oldL.colour) }, uColYoung: { value: new THREE.Vector3(...youngL.colour) },
      uK: { value: new THREE.Vector2(0.4, 0.5) }, uSigma: { value: 2.6 }, uNoiseAmp: { value: 0 },
      uNoise: { value: null }, uSteps: { value: 6 },
      uPic: { value: null }, uPicUv: { value: null }, uPicOn: { value: 0 }, uPicLook: { value: new THREE.Vector4(1, 1, 1, 0) }, uPicK: { value: 0.8 },
    },
  }), true);
  discMat.name = 'deep-lmc-disc';
  const discMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.09, 2), discMat);
  discMesh.name = 'deep-lmc-disc';
  discMesh.scale.set(DISC_EXTENT, 4 * z0[0], DISC_EXTENT);
  discMesh.frustumCulled = false;
  discMesh.renderOrder = -1;
  frameGroup.add(discMesh);

  // ------------------------------------------------------------------------------------- the stars
  const starMat = policy(THREE, new THREE.ShaderMaterial({
    vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
    uniforms: { ...common(THREE), uUnit: { value: 1 }, uPixAng: { value: 0.001 }, uBase: { value: 1.1 }, uPeak: { value: 1 }, uSb: { value: 0.05 } },
  }), false);
  starMat.name = 'deep-lmc-stars';
  const stars = new THREE.Points(new THREE.BufferGeometry(), starMat);
  stars.name = 'deep-lmc-stars';
  stars.frustumCulled = false;
  stars.renderOrder = -1;
  frameGroup.add(stars);

  // ------------------------------------------------------------------- the sprites: nodes and R136
  const spriteMat = policy(THREE, new THREE.ShaderMaterial({
    vertexShader: SPRITE_VERT, fragmentShader: SPRITE_FRAG,
    uniforms: { ...common(THREE), uUnit: { value: 1 }, uProjPx: { value: 500 }, uPhotoT: { value: 0 }, uMinPx: { value: 1.5 } },
  }), false);
  spriteMat.name = 'deep-lmc-sprites';
  const sprites = new THREE.Points(new THREE.BufferGeometry(), spriteMat);
  sprites.name = 'deep-lmc-sprites';
  sprites.frustumCulled = false;
  sprites.renderOrder = -1;
  frameGroup.add(sprites);

  // -------------------------------------------------------------------------------- the Tarantula
  const nebL = layer('nebula') || { ra_deg: 84.6583, dec_deg: -69.095, arcmin: 40, shell: { radius_ly: 300, width_ly: 150 } };
  const clusterL = layer('cluster') || { ra_deg: 84.67665, dec_deg: -69.10093, plummer_ly: 4, radius_ly: 50, count: { t0: 200, t1: 500, t2: 900 }, colour: [0.74, 0.84, 1] };
  const tarCentre = memberAt(g, nebL.ra_deg, nebL.dec_deg);
  const tarR = (g.D * Math.tan((nebL.arcmin / 60) * D2R / 2)) / g.unit; // the catalogue radius, object units
  const r136 = memberAt(g, clusterL.ra_deg, clusterL.dec_deg);
  const colours = (profile.colours && profile.colours.lines) || {};
  const hex = (h, fb) => { const c = new THREE.Color(); try { c.setStyle(h || fb, THREE.NoColorSpace); } catch { c.setStyle(fb, THREE.NoColorSpace); } return new THREE.Vector3(c.r, c.g, c.b); };
  const nebMat = policy(THREE, new THREE.ShaderMaterial({
    vertexShader: DISC_VERT, fragmentShader: NEB_FRAG, side: THREE.BackSide,
    uniforms: {
      ...common(THREE),
      uCamObj: { value: new THREE.Vector3(0, 0, 3) }, uRadius: { value: tarR },
      uR136: { value: new THREE.Vector3(...r136.map((v, i) => (v - tarCentre[i]) / tarR)) },
      uAway: { value: new THREE.Vector3(...toGal(g, g.u).map((v) => v * g.unit)).normalize() },
      uShell: { value: new THREE.Vector2(((nebL.shell && nebL.shell.radius_ly) || 300) / g.unit / tarR, ((nebL.shell && nebL.shell.width_ly) || 150) / g.unit / tarR) },
      uColHa: { value: hex(colours.Ha, '#ff6b8c') }, uColO3: { value: hex(colours.OIII, '#73f2e6') },
      uK: { value: 0.07 }, uSigma: { value: 1.2 }, uFront: { value: new THREE.Vector2(0.4, 1.6) }, uNoiseAmp: { value: 0 }, uCover: { value: 1 }, uPhotoT: { value: 0 },
      uPicC: { value: new THREE.Vector3(0, 0, 50) }, uPicR: { value: new THREE.Vector3() }, uPicU: { value: new THREE.Vector3() },
      uTPic: { value: null }, uTPicOn: { value: 0 }, uTPicLook: { value: new THREE.Vector3(1, 1, 1) },
      uNoise: { value: null }, uSteps: { value: 10 },
    },
  }), true);
  nebMat.name = 'deep-lmc-tarantula';
  const nebMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.09, 2), nebMat);
  nebMesh.name = 'deep-lmc-tarantula';
  nebMesh.position.set(...tarCentre);
  nebMesh.scale.setScalar(tarR);
  nebMesh.frustumCulled = false;
  nebMesh.renderOrder = -1;
  frameGroup.add(nebMesh);
  // The Tarantula's photograph's plane in the nebula's unit sphere (u, v = 0.5 + dot / 2).
  if (tarRow) {
    const { centre, right, up } = pictureBasis(tarRow);
    const h = pictureHalfExtent(tarRow);
    // A point q of the unit sphere is tarR * unit ly along the frame's axes: dot(q_ly, right) / (h D).
    const axes = [g.X, g.Y, g.Z];
    const scaled = (v, hk) => axes.map((a) => (dot(a, v) * tarR * g.unit) / (hk * g.D));
    const c = add3(eqToEcl(centre).map((x) => x * g.D), g.u, -g.D);
    nebMat.uniforms.uPicC.value.set(...toGal(g, c).map((v, i) => (v - tarCentre[i]) / tarR));
    nebMat.uniforms.uPicR.value.set(...scaled(eqToEcl(right), h.x));
    nebMat.uniforms.uPicU.value.set(...scaled(eqToEcl(up), h.y));
  }
  nebMat.uniforms.uCover.value = lmcRow ? photoCover(lmcRow, lmcEll, eclToEq(skyDir(g, tarCentre))) : 0;

  // -------------------------------------------------------------------------------------- state
  let maps = null;
  // Outside a page (node tests) with no loader given, nothing is fetched: the model is built empty.
  let loaded = !!env.noFetch || (!env.fetchBin && typeof location === 'undefined');
  let builtTier = null;
  let level = 0;
  let share = 0;
  let pointCount = 0;
  let bytes = 0;
  let orientedFor = null;
  let tarPx = 0;
  let honest = 0;
  let tarHonest = 0;
  const _m = new THREE.Matrix4();
  const _inv = new THREE.Matrix4();
  const _v = new THREE.Vector3();
  const _c = new THREE.Vector3();
  const _size = new THREE.Vector2();

  let uvTex = null;
  let picTex = null;
  const picPending = (!lmcRow || !lmcRow.file || typeof location === 'undefined' || env.noFetch) ? null
    : new THREE.TextureLoader().loadAsync(String(new URL(String(lmcRow.file).replace(/^site\//, ''), new URL('../../../', import.meta.url))))
      .then((t) => { t.colorSpace = THREE.NoColorSpace; picTex = t; discMat.uniforms.uPic.value = t; })
      .catch((e) => { if (typeof console !== 'undefined') console.warn('deep: the LMC photograph did not load for the model', e && e.message); });
  // The Tarantula's photograph too (Webb, weic2212a, already shipped and credited): its colour along our line.
  let tPicTex = null;
  const tPicPending = (!tarRow || !tarRow.file || typeof location === 'undefined' || env.noFetch) ? null
    : new THREE.TextureLoader().loadAsync(String(new URL(String(tarRow.file).replace(/^site\//, ''), new URL('../../../', import.meta.url))))
      .then((t) => { t.colorSpace = THREE.NoColorSpace; tPicTex = t; nebMat.uniforms.uTPic.value = t; })
      .catch((e) => { if (typeof console !== 'undefined') console.warn('deep: the Tarantula photograph did not load for the model', e && e.message); });
  let picDone = !picPending && !tPicPending;
  let picsLeft = (picPending ? 1 : 0) + (tPicPending ? 1 : 0);
  for (const pp of [picPending, tPicPending]) if (pp) pp.finally(() => { picsLeft -= 1; if (picsLeft <= 0) picDone = true; });
  const load = env.fetchBin || ((url) => fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`)))));
  const pending = loaded ? null : Promise.resolve().then(() => load(MAP_URL)).then((buf) => { maps = readMaps(buf); }).catch((e) => {
    // The maps could not be read: the model draws its nodes and its Tarantula, the photograph and the
    // glow the rest. Said once, in the console.
    if (typeof console !== 'undefined') console.warn('deep: the LMC maps did not load', e && e.message);
  }).finally(() => { loaded = true; });

  /** The geometry for a tier: the disc texture, the stars, the sprites. Once per tier. */
  function build(tier) {
    builtTier = tier;
    const t = tier >= 2 ? 't2' : tier >= 1 ? 't1' : 't0';
    const disc = buildDisc(g, maps || [null, null], { row: lmcRow, ell: lmcEll });
    let oMax = 0, yMax = 0;
    for (let i = 0; i < disc.old.length; i++) { if (disc.old[i] > oMax) oMax = disc.old[i]; if (disc.young[i] > yMax) yMax = disc.young[i]; }
    const px = new Uint8Array(DISC_TEX * DISC_TEX * 4);
    for (let i = 0; i < disc.old.length; i++) {
      px[i * 4] = Math.round(Math.sqrt(oMax > 0 ? disc.old[i] / oMax : 0) * 255);
      px[i * 4 + 1] = Math.round(Math.sqrt(yMax > 0 ? disc.young[i] / yMax : 0) * 255);
      px[i * 4 + 3] = Math.round(disc.cover[i] * 255);
    }
    // A new texture, not a resized one: the placeholder's storage may be immutable on the GPU.
    discTex.dispose();
    discTex = makeTex(px, DISC_TEX);
    discMat.uniforms.uDisc.value = discTex;
    if (lmcRow) {
      const half = new Uint16Array(disc.uv.length);
      for (let i = 0; i < half.length; i++) half[i] = THREE.DataUtils.toHalfFloat(disc.uv[i]);
      if (uvTex) uvTex.dispose();
      uvTex = new THREE.DataTexture(half, DISC_TEX, DISC_TEX, THREE.RGFormat, THREE.HalfFloatType);
      uvTex.minFilter = THREE.LinearFilter; uvTex.magFilter = THREE.LinearFilter; uvTex.colorSpace = THREE.NoColorSpace;
      uvTex.needsUpdate = true;
      discMat.uniforms.uPicUv.value = uvTex;
      discMat.uniforms.uPicLook.value.w = Math.min(0.5, Math.max(0, Number(lmcRow.sky_floor) || 0));
      bytes += half.byteLength;
    }
    bytes = px.length;

    // Stars: the two populations and R136's, one geometry.
    const o = sampleStars(disc.old, { n: maps ? oldL.count[t] : 0, size: DISC_TEX, extent: DISC_EXTENT, z0: z0[0], seed: 0x4c4d43 });
    const y = sampleStars(disc.young, { n: maps ? youngL.count[t] : 0, size: DISC_TEX, extent: DISC_EXTENT, z0: z0[1], seed: 0x59554e });
    const nCl = clusterL.count[t] || 0;
    const n = o.n + y.n + nCl;
    const pos = new Float32Array(n * 3), att = new Float32Array(n * 4);
    const r = rng(0x523133);
    const put = (k, p, col, L, cover) => { pos.set(p, k * 3); att[k * 4] = col[0] * L; att[k * 4 + 1] = col[1] * L; att[k * 4 + 2] = col[2] * L; att[k * 4 + 3] = cover; };
    let k = 0;
    for (const [s, col, gainL] of [[o, oldL.colour, 1], [y, youngL.colour, 1.6]]) {
      for (let i = 0; i < s.n; i++) put(k++, s.pos.subarray(i * 3, i * 3 + 3), col, luminosity(r()) * gainL, disc.cover[s.texel[i]]);
    }
    // R136: a Plummer sphere, its stars among the most luminous anywhere.
    const a = clusterL.plummer_ly / g.unit, rMax = clusterL.radius_ly / g.unit;
    const coverR = photoCover(lmcRow, lmcEll, eclToEq(skyDir(g, r136)));
    for (let i = 0; i < nCl; i++) {
      let rr = rMax + 1;
      while (rr > rMax) rr = a / Math.sqrt(Math.pow(Math.max(1e-6, r()), -2 / 3) - 1);
      const ct = 2 * r() - 1, ph = 2 * Math.PI * r(), st = Math.sqrt(1 - ct * ct);
      put(k++, [r136[0] + rr * st * Math.cos(ph), r136[1] + rr * ct, r136[2] + rr * st * Math.sin(ph)], clusterL.colour, 10 * luminosity(r()), coverR + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aStar', new THREE.Float32BufferAttribute(att, 4));
    stars.geometry.dispose();
    stars.geometry = geo;
    starMat.uniforms.uPeak.value = Math.max(o.peakPerArea, 1e-9);
    pointCount = n;
    bytes += pos.byteLength + att.byteLength;

    // Sprites: the nodes on the disc's plane where their line of sight meets it; R136's glow.
    const nodes = (layer('nodes') && layer('nodes').nodes) || [];
    const nodeL = layer('nodes') || { colour: [1, 0.42, 0.55], default_arcmin: 5 };
    const sp = [], sa = [], sc = [];
    for (const nd of nodes) {
      const dir = siDir(nd.ra_deg, nd.dec_deg);
      const p = deproject(g, dir);
      const rad = (g.D * Math.tan(((nd.arcmin || nodeL.default_arcmin) / 60) * D2R / 2)) / g.unit;
      const k2 = 0.4;
      sp.push(...p); sa.push(nodeL.colour[0] * k2, nodeL.colour[1] * k2, nodeL.colour[2] * k2, rad);
      sc.push(photoCover(lmcRow, lmcEll, eclToEq(dir)), 0);
    }
    const coverT = tarRow ? photoCover(tarRow, null, eclToEq(skyDir(g, r136))) : 0;
    // R136's core: 4 ly, compact (a negative radius says so to the shader); its stars are the points.
    sp.push(...r136); sa.push(0.8 * 1.6, 0.88 * 1.6, 1.6, -4 / g.unit); sc.push(coverR, coverT);
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    sg.setAttribute('aSprite', new THREE.Float32BufferAttribute(sa, 4));
    sg.setAttribute('aCover', new THREE.Float32BufferAttribute(sc, 2));
    sprites.geometry.dispose();
    sprites.geometry = sg;
    pointCount += sp.length / 3;
  }

  /** The frame's turn: sun-inertial axes into the stage's scene axes, then the LMC's axes into those. */
  function orient() {
    orientedFor = stage.worldId;
    if (!record || !record.pos) { frameGroup.matrix.makeBasis(new THREE.Vector3(...g.X), new THREE.Vector3(...g.Y), new THREE.Vector3(...g.Z)); frameGroup.matrixWorldNeedsUpdate = true; return; }
    if (!stage.toSceneInto(record.pos, SUN_INERTIAL, _c, stage.tMs)) return;
    const cols = [];
    for (const e of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
      const k = 1e12;
      const tip = { x: record.pos.x + e[0] * k, y: record.pos.y + e[1] * k, z: record.pos.z + e[2] * k };
      if (!stage.toSceneInto(tip, SUN_INERTIAL, _v, stage.tMs)) return;
      cols.push(_v.clone().sub(_c).normalize());
    }
    const R = new THREE.Matrix4().makeBasis(cols[0], cols[1], cols[2]);
    const G = new THREE.Matrix4().makeBasis(new THREE.Vector3(...g.X), new THREE.Vector3(...g.Y), new THREE.Vector3(...g.Z));
    frameGroup.matrix.multiplyMatrices(R, G);
    frameGroup.matrixWorldNeedsUpdate = true;
  }

  function camIn(mesh, camera, out) {
    mesh.updateMatrixWorld(true);
    _inv.copy(mesh.matrixWorld).invert();
    out.copy(camera.position).applyMatrix4(_inv);
  }

  const mats = [discMat, starMat, spriteMat, nebMat];
  return {
    group,
    levels: [2, 3],
    card: { copy: COPY_BLOCK, drawn: DRAWN },
    setLevel(n, s = 1) {
      level = n;
      share = n >= 2 ? s : 0;
      for (const m of mats) m.uniforms.uShare.value = share;
      group.visible = share > 0;
    },
    frame(info = {}) {
      const camera = info.camera;
      if (!camera) return;
      // The quality and the selection are env functions (the coordinator's own); the tier, gain and photo come with the frame.
      const q = (typeof env.quality === 'function' && env.quality()) || info.quality || { tier: Number.isFinite(info.tier) ? info.tier : 1 };
      if (loaded && builtTier === null) build(Number.isFinite(q.tier) ? q.tier : 1);
      if (orientedFor !== stage.worldId) orient();
      group.updateMatrixWorld(true);
      const unit = frameGroup.matrixWorld.getMaxScaleOnAxis();
      const photoOf = typeof env.pictureShare === 'function' ? env.pictureShare : typeof info.photoOf === 'function' ? info.photoOf : () => 0;
      const photo = Math.min(1, Math.max(0, Number(Number.isFinite(info.photo) ? info.photo : photoOf('dso-lmc')) || 0));
      const photoT = Math.min(1, Math.max(0, Number(photoOf(TARANTULA)) || 0));
      const look = info.look || 'film';
      const noisy = drawnUnder(look, UNDER_MEASURED.noise) ? 1 : 0;
      const noise = noisy ? noiseTexture(THREE, q.tier >= 1 ? 64 : 32) : null;
      const gain = Number.isFinite(info.gain) ? info.gain : 1;
      // The drawing buffer's height and a pixel's angle (points are sized in device pixels).
      // The drawing buffer: the renderer's when handed in, else the window's (the governor may scale it a little).
      let hDev = typeof innerHeight === 'number' ? innerHeight * (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) : 900;
      if (info.renderer && info.renderer.getDrawingBufferSize) hDev = info.renderer.getDrawingBufferSize(_size).y || hDev;
      const fovY = ((camera.fov || 45) * D2R) / (camera.zoom || 1);
      const dpr = info.renderer && info.renderer.getPixelRatio ? info.renderer.getPixelRatio() : typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
      for (const m of mats) { m.uniforms.uPhoto.value = photo; m.uniforms.uGain.value = gain; }
      // The photograph's stretch as nebulae.js applies it, for the exposure the gain says (Eye 0.55, Camera 1, Deep 1.7).
      const ex = exposureLook(gain < 0.8 ? 'eye' : gain > 1.3 ? 'deep' : 'camera');
      discMat.uniforms.uPicLook.value.set(ex.nebulaGain / Math.max(0.1, gain), ex.nebulaGamma, ex.nebulaSaturation, discMat.uniforms.uPicLook.value.w);
      // The photograph is honest only near the line it was taken along, and not from inside: its light is the
      // disc's within 25 degrees of that line, gone by 45 (the photograph's own fade is 25), and gone when the
      // camera is nearer than the galaxy's radius. Off that, the Gaia maps carry the disc (the second look:
      // the photograph spread through the disc read as fog from inside and a white bar at 45 degrees).
      group.getWorldPosition(_c);
      const toCam = _v.copy(camera.position).sub(_c);
      const dist = toCam.length() / unit;                       // object units
      const sunDir = new THREE.Vector3(...toGal(g, g.u).map((v) => -v * g.unit)).applyMatrix4(_m.extractRotation(frameGroup.matrixWorld)); // centre -> Sun, scene axes
      const off = Math.acos(Math.max(-1, Math.min(1, toCam.normalize().dot(sunDir.normalize())))) * 180 / Math.PI;
      const ok = (1 - Math.min(1, Math.max(0, (off - 25) / 20))) * Math.min(1, Math.max(0, (dist - DISC_EXTENT * 0.6) / (DISC_EXTENT * 0.6)));
      honest = ok;
      discMat.uniforms.uPicOn.value = picTex ? ok : 0;

      // The disc: a few steps (the vertical integral is exact); more at level 3.
      camIn(discMesh, camera, discMat.uniforms.uCamObj.value);
      discMat.uniforms.uSteps.value = Math.min(16, (q.tier >= 2 ? 8 : q.tier >= 1 ? 6 : 4) + (level >= 3 ? 4 : 0));
      discMat.uniforms.uNoiseAmp.value = noisy;
      discMat.uniforms.uNoise.value = noise || discMat.uniforms.uNoise.value;
      if (!noise) discMat.uniforms.uNoiseAmp.value = 0;

      starMat.uniforms.uUnit.value = unit;
      starMat.uniforms.uPixAng.value = (2 * Math.tan(fovY / 2)) / hDev;
      starMat.uniforms.uBase.value = 1.1 * Math.max(1, dpr);
      spriteMat.uniforms.uUnit.value = unit;
      spriteMat.uniforms.uProjPx.value = (hDev / 2) / Math.tan(fovY / 2);
      spriteMat.uniforms.uPhotoT.value = photoT;
      spriteMat.uniforms.uMinPx.value = 1.5 * Math.max(1, dpr);

      // The Tarantula: its own march, by its own size on screen and whether it is the selection.
      camIn(nebMesh, camera, nebMat.uniforms.uCamObj.value);
      const dT = nebMat.uniforms.uCamObj.value.length() * tarR; // object units
      const rT = dT > tarR ? (Math.asin(tarR / dT) / (fovY / 2)) * (hDev / Math.max(1, dpr) / 2) : Infinity;
      const own = marchSteps({ tier: q.tier, top: q.top, latched: false, scaleStep: q.scaleStep, frameMs: Number.isFinite(info.frameMs) ? info.frameMs : info.dtMs, rPx: Math.min(rT, 1e4), selected: (typeof env.selectedId === 'function' ? env.selectedId() : info.selectedId) === TARANTULA });
      nebMat.uniforms.uSteps.value = Math.max(8, Math.min(48, rT < 24 ? 8 : own || 8)); // never under 8: fewer showed the noise as grain
      nebMat.uniforms.uNoiseAmp.value = noise ? noisy : 0;
      nebMat.uniforms.uNoise.value = noise || nebMat.uniforms.uNoise.value;
      nebMat.uniforms.uPhotoT.value = photoT;
      nebMat.uniforms.uTPicLook.value.set(ex.nebulaGain / Math.max(0.1, gain), ex.nebulaGamma, ex.nebulaSaturation);
      nebMesh.getWorldPosition(_c);
      const toCamT = _v.copy(camera.position).sub(_c).normalize();
      const offT = Math.acos(Math.max(-1, Math.min(1, toCamT.dot(sunDir)))) * 180 / Math.PI;
      tarHonest = 1 - Math.min(1, Math.max(0, (offT - 25) / 20));
      nebMat.uniforms.uTPicOn.value = tPicTex ? tarHonest : 0;
      tarPx = rT;
    },
    ready: () => loaded && picDone,
    whenLoaded: () => pending || Promise.resolve(),
    stats: () => ({ level, share: Math.round(share * 100) / 100, meshes: 4, points: pointCount, textures: 1, bytes, tier: builtTier, maps: !!maps, tarantulaPx: Math.round(Math.min(tarPx, 1e6)), tarantulaSteps: nebMat.uniforms.uSteps.value, discSteps: discMat.uniforms.uSteps.value, photoHonest: Math.round(honest * 100) / 100, tarantulaHonest: Math.round(tarHonest * 100) / 100 }),
    // For tests: where things are, in object units.
    layout: () => ({ geometry: g, tarantula: { centre: tarCentre, radius: tarR }, r136, extent: DISC_EXTENT, z0 }),
    dispose() {
      stars.geometry.dispose(); sprites.geometry.dispose(); discMesh.geometry.dispose(); nebMesh.geometry.dispose();
      for (const m of mats) m.dispose();
      discTex.dispose();
      if (uvTex) uvTex.dispose();
      if (picTex) picTex.dispose();
      if (tPicTex) tPicTex.dispose();
      if (group.parent) group.parent.remove(group);
    },
  };
}

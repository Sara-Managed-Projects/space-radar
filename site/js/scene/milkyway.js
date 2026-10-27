// scene/milkyway.js -- the Milky Way from inside, drawn from the galaxy's own 3D model (release 1.4.0, r14-mw-bh).
//
// Contract: createMilkyWay(opts) -> { mesh, ready, setCameraKm, setOpacity, setExposure, setDetail, setTier,
//   update(camera), stats(), dispose() }
// Pure, for tests/test_milkyway_inside.mjs and scripts/build-milkyway-sky.mjs: MODEL, DUST, CLOUDS,
//   faceOnMap(n), noiseVolume(n), skyLinear(cam, dir, opts), skyColour(cam, dir, opts), galFromEclKm(km),
//   equirectDir(u, v), bandGeometryRows(tier)
//
// WHY. Until 1.4.0 the band across the night sky was a photograph-like panorama on a sphere (Solar System
// Scope's painting at tier 0, NASA SVS's Deep Star Maps at tier 1 and up). Ivan, 2026-10-26: no photographs
// of the Milky Way, only realistic 3D. So the band is now the SAME galaxy the outside view flies round
// (scene/galaxy.js, site/data/galaxy.bin, scripts/build-galaxy.py), looked at from where the camera is:
//
//   STARS   the generator's own distributions, written as densities instead of drawn as points: the exponential
//           disc, the squashed bulge, the bar at 30 degrees, and the seven arms of Reid et al. 2019 with the
//           widths, pitch angles and kinks of their Table 2 (MODEL below; tests/test_milkyway_inside.mjs holds
//           every number equal to build-galaxy.py's). The arms are laid out once as a face-on map (faceOnMap,
//           a 256 x 256 half-float texture made in the browser: 0 bytes fetched).
//   DUST    a dust disc (Drimmel & Spergel 2001's scale height), dust on the inner edges of the arms (the
//           same lanes scene/galaxy.js draws from outside), a dense core at the centre, and fourteen named
//           dark clouds near the Sun at their measured distances and sizes (CLOUDS): the Great Rift (the
//           Aquila and Cygnus rifts), the Pipe and Ophiuchus, the Coalsack, Lupus, Chamaeleon, Corona
//           Australis, Taurus, Perseus, Orion and the Cepheus flare. Dust dims blue more than red, so the
//           light behind it warms (the extinction law's ratios, DUST.k).
//   COLOUR  each population's colour is scene/galaxy.js's KIND_RGB: the bulge and bar warm, the disc pale,
//           the arms blue-white, so the band warms towards Sagittarius and cools towards Perseus.
//
// HOW (no render target, no post-processing: tests/test_contract.mjs). One sphere round the camera, in
// galactic axes. Its VERTEX shader integrates the light along each vertex's line of sight through the
// model from the camera's place in the galaxy (uCam, galactocentric kpc): log-spaced steps from 10 pc to
// where the line leaves the disc, emission times transmission, with a 3D noise volume clumping the dust
// at kiloparsec scales. The rows of vertices crowd towards the galactic plane, where the band is. Its
// FRAGMENT shader adds what a vertex is too coarse for: the named clouds as exact Gaussian columns
// (closed form, the erf), filaments in the near dust and star clouds in the light, all from the same
// noise volume placed in the galaxy, so they shift with the camera like the rest. Then a photograph's
// stretch (the light to a power) and the shutter (scene/exposure.js).
//
// PARALLAX AND THE HAND-OVER. uCam is the camera's own place (setCameraKm, from stage.fromScene on a
// sun-inertial stage; the Sun itself on a world's stage, where an au is nothing to a kiloparsec), so the
// near clouds slide against the far band as the camera leaves the Solar System, and the band tilts and
// thins as it rises out of the disc. registry/lod.yaml's `milky-way-inside` fades it out between 500 and
// 5 000 light-years from the Sun, exactly while `galaxy-model` fades the outside view in: the same model,
// one drawing handing the light to the other.
//
// TIERS. T1 and T2 march (32 and 48 steps a vertex, 52 000 and 93 000 vertices) with the fragment detail
// (2 and 4 filament samples). T0 never marches (internal spec 0076 section 4): it wears a 2048 x 1024
// picture BAKED FROM THIS SAME MODEL by scripts/build-milkyway-sky.mjs (textures/2k_milky_way_model.webp),
// which is also what any device wears under the frame latch, and past 300 light-years, where the picture
// is no longer the view from here, a coarse vertex-only march takes over. No photograph at any tier.
//
// HONESTY. The band is a MODEL (cls `modelled`; the card of the galaxy says so), not a picture of the
// sky: the arms are fitted, their continuations and the noise are illustration, the clouds' places and
// sizes are measured and their shapes are not. The measured layer is the stars (scene/starfield.js,
// scene/stars3d.js), which are drawn over it as before.

import * as THREE from '../../vendor/three.module.min.js';

// ------------------------------------------------------------------------------------------- the model

/**
 * Under the Measured look (scene/exposure.js MEASURED_RULES): the band is the same model either way and nothing in
 * it moves, so its noise (the dust's clumps, the clouds' ragged edges, the lanes) and the grain stay as they are.
 */
export const UNDER_MEASURED = { band: 'same', noise: 'same', grain: 'same' };

/**
 * The numbers of scripts/build-galaxy.py (kpc, degrees), the same galaxy as site/data/galaxy.bin. The test
 * reads them out of the Python file and holds them equal. Galactocentric axes: x from the Sun towards the
 * centre (l = 0), y towards l = 90, z to the north galactic pole; the Sun at (-R0, 0, Z_SUN).
 */
export const MODEL = {
  R0: 8.15,                 // Reid et al. 2019
  Z_SUN: 0.0208,            // the Sun's height above the plane: Bennett & Bovy 2019, MNRAS 482, 1417 (20.8 pc)
  DISC_RADIUS: 13.4,
  DISC_SCALE: 2.6,
  DISC_HEIGHT: 0.3,
  BULGE_RADIUS: 1.5,
  BAR_HALF: 3.0,
  BAR_ANGLE: 30.0,
  CONTINUE: 200,
  // Reid et al. 2019, Table 2: name, beta_kink, R_kink, psi_lt, psi_gt, width, beta_min, beta_max
  ARMS: [
    ['3-kpc', 15, 3.52, -4.2, -4.2, 0.18, 15, 18],
    ['Norma-Outer', 18, 4.46, -1.0, 19.5, 0.14, 5, 54],
    ['Scutum-Centaurus', 23, 4.91, 14.1, 12.1, 0.23, 0, 104],
    ['Sagittarius-Carina', 24, 6.04, 17.1, 1.0, 0.27, 2, 97],
    ['Local', 9, 8.26, 11.4, 11.4, 0.31, -8, 34],
    ['Perseus', 40, 8.87, 10.3, 8.7, 0.35, -23, 115],
    ['Outer', 18, 12.24, 3.0, 9.4, 0.65, -16, 71],
  ],
  // How many points build-galaxy.py draws of each population, and how bright (its u8 weights).
  COUNT: { disc: 70000, bulge: 12000, bar: 14000, arm: 9000, armSmall: 3500 },
  WEIGHT: { disc: 90, discOuter: 40, bulge: 200, bar: 170, armMeasured: 255, armContinued: 130 },
};

/** scene/galaxy.js KIND_RGB: disc, bulge, bar, arms. */
export const KIND_RGB = [[0.78, 0.80, 0.92], [1.0, 0.86, 0.66], [1.0, 0.78, 0.52], [0.72, 0.84, 1.0]];

/**
 * THE INSIDE EXPOSURE: how much each population's light counts from inside, on top of the generator's
 * weights, and the photograph-like stretch after it (a soft black point `floor`, then the light to the power
 * `gamma`). Ours, tuned so the band's profile along the plane follows the measured sky's (the Sagittarius star
 * cloud tens of times the band in Cygnus, the poles dark: tests/test_milkyway_inside.mjs holds the order), the way
 * a photograph's stretch is chosen. Illustrative.
 */
export const EXPOSE = { disc: 3.0, bulge: 9, bar: 2.5, arm: 0.15, gamma: 0.8, gain: 1.8e-3, floor: 160, white: 0.9 };

/**
 * THE DUST. A dust disc 0.134 kpc thick (Drimmel & Spergel 2001, ApJ 556, 181: 0.0169 R0) and, as in other spirals, longer
 * than the stars' (3.3 kpc); about 0.6 magnitudes of V a kiloparsec in the plane near the Sun, clumped by the noise volume
 * (CLUMP: mean about 1), little inside 3 kpc but the molecular ring at 4.5 kpc (Dame, Hartmann & Thaddeus 2001) and the
 * core (the Central Molecular Zone, about 200 pc). The Sun sits in the Local Bubble, a cavity about 100 pc across nearly
 * free of dust (Lallement et al. 2003, A&A 411, 447). The arm lanes are scene/galaxy.js's (0.35 kpc inside each arm).
 * `k`: extinction in R, G, B relative to V (Cardelli, Clayton & Mathis 1989 at 0.65, 0.55, 0.45 microns).
 */
export const DUST = {
  height: 0.134, length: 3.3, avPerKpc: 0.6, hole: [2.4, 4.2], bubble: [0.06, 0.16],
  arm: 0.5, armInset: 0.35, armHeight: 0.09,
  cmz: 60, cmzRadius: 0.22, cmzHeight: 0.05,
  ring: [4.5, 0.9, 8, 0.07], // the molecular ring: middle, width, strength, height (kpc; Dame et al. 2001 CO)
  clump: 2.0,         // kpc a noise tile spans in the march
  phase: [0.2332, 0.9065, 0.4578],   // where the Sun sits in the noise: chosen so the bright star clouds fall where the sky has them
  k: [0.78, 1.0, 1.32],
};

/**
 * THE NAMED DARK CLOUDS near the Sun: galactic longitude and latitude of the middle (deg), distance (pc),
 * extent along l and b (deg, the full width the eye sees), the tilt of the long axis from the plane (deg),
 * and the visual extinction through the middle (mag). Places and sizes are measured (the distances
 * Zucker et al. 2020, A&A 633, A51, "A compendium of distances to molecular clouds", where it gives one;
 * the Aquila Rift's front Straizys et al. 2003; the Coalsack Seidensticker & Schmidt-Kaler 1989; the extents
 * from Dame, Hartmann & Thaddeus 2001's CO survey). The ragged shapes are the noise: illustrative.
 */
export const CLOUDS = [
  // name,               l,     b,     pc,  dl,  db,  tilt, Av
  // the Great Rift, from Sagittarius to Cygnus: the Aquila Rift's front at 225 pc, the Cygnus Rift's 600-800 pc
  ['Great Rift (Ophiuchus)',  6,  3.0,  190,  20,  4.5,   6,  2.2],
  ['Great Rift (Serpens)',   20,  2.6,  225,  22,  6,     4,  2.6],
  ['Aquila Rift',            33,  2.4,  250,  22,  7,    -3,  2.6],
  ['Great Rift (Vulpecula)', 52,  1.4,  450,  24,  5,     2,  2.2],
  ['Cygnus Rift',            70,  1.6,  650,  24,  6,    -4,  2.4],
  ['Northern Coalsack',      84,  1.8,  700,  10,  6,     0,  1.8],
  ['Pipe Nebula',             0.5,  5.5,  163,   8,   2.6,  52,  2.4],
  ['Ophiuchus',             353,  16.5,   139,   9,   6,   35,  2.2],
  ['Lupus',                 340,  14,     158,  10,  12,   60,  1.0],
  ['Coalsack',              301.5, -1.0,  180,   7,   5,    0,  1.6],
  ['Chamaeleon',            299,  -16,    189,   9,   4,    0,  1.2],
  ['Corona Australis',        0.5, -18,   151,   6,   1.8, -20,  1.6],
  ['Taurus',                172,  -15,    141,  16,  10,  -25,  1.4],
  ['Perseus',               159,  -20,    294,   7,   3,   30,  1.2],
  ['Orion A',               211,  -19.5,  432,   6,   1.6, -40,  1.8],
  ['Orion B',               206,  -15,    423,   4,   4,    0,  1.4],
  ['Cepheus Flare',         110,   15,    360,  12,   8,    0,  1.0],
];

// ------------------------------------------------------------------------------------------- frames

const D2R = Math.PI / 180;
export const KPC_KM = 30856775814913670;
const OBL = 23.4392911 * D2R;
// IAU galactic -> equatorial J2000 (rows give equatorial x, y, z from galactic x, y, z): build-galaxy.py's G2E.
export const G2E = [
  [-0.0548755604, 0.4941094279, -0.8676661490],
  [-0.8734370902, -0.4448296300, -0.1980763734],
  [-0.4838350155, 0.7469822445, 0.4559837762],
];

/** Sun-inertial (ecliptic J2000) km from the Sun -> galactocentric kpc. Pure. */
export function galFromEclKm(km) {
  const x = (km && km.x) || 0, y = (km && km.y) || 0, z = (km && km.z) || 0;
  const ex = x, ey = y * Math.cos(OBL) - z * Math.sin(OBL), ez = y * Math.sin(OBL) + z * Math.cos(OBL);
  const gx = (G2E[0][0] * ex + G2E[1][0] * ey + G2E[2][0] * ez) / KPC_KM;
  const gy = (G2E[0][1] * ex + G2E[1][1] * ey + G2E[2][1] * ez) / KPC_KM;
  const gz = (G2E[0][2] * ex + G2E[1][2] * ey + G2E[2][2] * ez) / KPC_KM;
  return [gx - MODEL.R0, gy, gz + MODEL.Z_SUN];
}

/** (l, b) in degrees -> a galactic unit vector. */
export function galDir(lDeg, bDeg) {
  const l = lDeg * D2R, b = bDeg * D2R;
  return [Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b)];
}

/** The baked picture's convention: u = 0.5 at l = 0, longitude increasing to the LEFT (as sky maps); v = 1 north. */
export function equirectDir(u, v) {
  return galDir((0.5 - u) * 360, (v - 0.5) * 180);
}

// ------------------------------------------------------------------------------------ the face-on map

const SQRT2PI = Math.sqrt(2 * Math.PI);
const gauss = (x, s) => Math.exp(-0.5 * (x / s) * (x / s)) / (SQRT2PI * s);
/** The map's half-width, kpc: past the disc's 1.15 x 13.4 kpc edge with room for the Outer arm's width. */
export const MAP_HALF_KPC = 16;

/**
 * The arms as surface densities, laid out face-on: channel 0 the light of each arm (points per kpc² as
 * build-galaxy.py throws them, times their weight), channel 1 the dust lane along each arm's inner edge.
 * n x n texels over +-MAP_HALF_KPC. Pure; the same arrays on every machine.
 */
export function faceOnMap(n = 256) {
  const out = new Float32Array(n * n * 2);
  const arms = MODEL.ARMS.map(([name, bk, rk, plt, pgt, w, bmin, bmax]) => {
    const lo = bmin - 20, hi = bmax + MODEL.CONTINUE;
    const count = name === '3-kpc' || name === 'Local' ? MODEL.COUNT.armSmall : MODEL.COUNT.arm;
    return { bk, rk, tl: Math.tan(plt * D2R), tg: Math.tan(pgt * D2R), w, bmin, bmax, lo, hi, perRad: count / ((hi - lo) * D2R) };
  });
  for (let j = 0; j < n; j++) {
    const y = ((j + 0.5) / n * 2 - 1) * MAP_HALF_KPC;
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) / n * 2 - 1) * MAP_HALF_KPC;
      const R = Math.hypot(x, y);
      const beta = Math.atan2(y, -x) / D2R;
      let light = 0, dust = 0;
      for (const a of arms) {
        for (let k = -1; k <= 1; k++) {
          const bb = beta + 360 * k;
          if (bb < a.lo || bb > a.hi) continue;
          const t = bb <= a.bk ? a.tl : a.tg;
          const ra = a.rk * Math.exp(-(bb - a.bk) * D2R * t);
          if (ra > MODEL.DISC_RADIUS || ra < 2.5) continue;
          const sec = Math.sqrt(1 + t * t);
          const line = a.perRad / (ra * sec); // points per kpc of arm length
          const wgt = (bb >= a.bmin && bb <= a.bmax ? MODEL.WEIGHT.armMeasured : MODEL.WEIGHT.armContinued) / 255;
          light += wgt * line * gauss(R - ra, a.w);
          dust += line * gauss(R - (ra - DUST.armInset), a.w * 0.8);
        }
      }
      out[(j * n + i) * 2] = light;
      out[(j * n + i) * 2 + 1] = dust;
    }
  }
  // The lanes in units of their own crest: 1 at the densest lane of the disc between 3 and 13 kpc.
  let top = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const R = Math.hypot(((i + 0.5) / n * 2 - 1) * MAP_HALF_KPC, ((j + 0.5) / n * 2 - 1) * MAP_HALF_KPC);
    if (R > 3 && R < 13) top = Math.max(top, out[(j * n + i) * 2 + 1]);
  }
  for (let k = 1; k < out.length; k += 2) out[k] /= top || 1;
  return out;
}

/** Bilinear lookup, as the GPU's LinearFilter with ClampToEdge does it. */
function sampleMap(map, n, x, y, c) {
  const fx = ((x / MAP_HALF_KPC) * 0.5 + 0.5) * n - 0.5, fy = ((y / MAP_HALF_KPC) * 0.5 + 0.5) * n - 0.5;
  let ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy;
  const x0 = ix < 0 ? 0 : ix > n - 1 ? n - 1 : ix, x1 = ix + 1 < 0 ? 0 : ix + 1 > n - 1 ? n - 1 : ix + 1;
  const y0 = iy < 0 ? 0 : iy > n - 1 ? n - 1 : iy, y1 = iy + 1 < 0 ? 0 : iy + 1 > n - 1 ? n - 1 : iy + 1;
  const a = map[(y0 * n + x0) * 2 + c], b = map[(y0 * n + x1) * 2 + c], d = map[(y1 * n + x0) * 2 + c], e = map[(y1 * n + x1) * 2 + c];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty;
}

// ------------------------------------------------------------------------------------------- noise

/**
 * A tileable 3D value noise, three octaves, n³ bytes (64³ is 262 kB of GPU memory, 32³ on a phone 33 kB).
 * Seeded: the same clouds on every machine and in the baked picture.
 */
export function noiseVolume(n = 64, seed = 20261026) {
  let a = seed >>> 0;
  const rand = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out = new Uint8Array(n * n * n);
  const acc = new Float32Array(n * n * n);
  let amp = 0.55, total = 0;
  for (const g of [4, 8, 16]) {
    const lat = new Float32Array(g * g * g).map(() => rand());
    const L = (x, y, z) => lat[(((z % g) + g) % g * g + (((y % g) + g) % g)) * g + (((x % g) + g) % g)];
    const s = (t) => t * t * (3 - 2 * t);
    const f = g / n;
    for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const px = x * f, py = y * f, pz = z * f;
      const ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
      const fx = s(px - ix), fy = s(py - iy), fz = s(pz - iz);
      const l = (p, q, t) => p + (q - p) * t;
      const c00 = l(L(ix, iy, iz), L(ix + 1, iy, iz), fx), c10 = l(L(ix, iy + 1, iz), L(ix + 1, iy + 1, iz), fx);
      const c01 = l(L(ix, iy, iz + 1), L(ix + 1, iy, iz + 1), fx), c11 = l(L(ix, iy + 1, iz + 1), L(ix + 1, iy + 1, iz + 1), fx);
      acc[(z * n + y) * n + x] += amp * l(l(c00, c10, fy), l(c01, c11, fy), fz);
    }
    total += amp;
    amp *= 0.5;
  }
  // Stretched about its middle so the octaves' sum, which crowds round 0.5, fills the byte.
  for (let i = 0; i < acc.length; i++) out[i] = Math.max(0, Math.min(255, Math.round((0.5 + (acc[i] / total - 0.5) * 2.2) * 255)));
  return out;
}

/** Trilinear lookup with RepeatWrapping, as the GPU does it (texel centres at (i + 0.5) / n). */
function sampleNoise(vol, n, px, py, pz) {
  // a fixed turn of the coordinates hides the lattice's axes (value noise is otherwise boxy); the GLSL turns the same
  const x = 0.6 * px - 0.64 * py + 0.48 * pz, y = 0.8 * px + 0.48 * py - 0.36 * pz, z = 0.6 * py + 0.8 * pz;
  const fx = x * n - 0.5, fy = y * n - 0.5, fz = z * n - 0.5;
  const ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz);
  const tx = fx - ix, ty = fy - iy, tz = fz - iz;
  const x0 = ((ix % n) + n) % n, y0 = ((iy % n) + n) % n, z0 = ((iz % n) + n) % n;
  const x1 = x0 + 1 === n ? 0 : x0 + 1, y1 = y0 + 1 === n ? 0 : y0 + 1, z1 = z0 + 1 === n ? 0 : z0 + 1;
  const r0 = z0 * n * n, r1 = z1 * n * n, a0 = y0 * n, a1 = y1 * n;
  const c000 = vol[r0 + a0 + x0], c100 = vol[r0 + a0 + x1], c010 = vol[r0 + a1 + x0], c110 = vol[r0 + a1 + x1];
  const c001 = vol[r1 + a0 + x0], c101 = vol[r1 + a0 + x1], c011 = vol[r1 + a1 + x0], c111 = vol[r1 + a1 + x1];
  const p = (c000 + (c100 - c000) * tx) + ((c010 + (c110 - c010) * tx) - (c000 + (c100 - c000) * tx)) * ty;
  const q = (c001 + (c101 - c001) * tx) + ((c011 + (c111 - c011) * tx) - (c001 + (c101 - c001) * tx)) * ty;
  return (p + (q - p) * tz) / 255;
}

// ------------------------------------------------------------------------------------------- the light

// The populations' densities as build-galaxy.py draws them (points per kpc³ times weight / 255).
const N_DISC = MODEL.COUNT.disc * (MODEL.WEIGHT.disc / 255);
const N_BULGE = MODEL.COUNT.bulge * (MODEL.WEIGHT.bulge / 255);
const N_BAR = MODEL.COUNT.bar * (MODEL.WEIGHT.bar / 255);
const BULGE_S = MODEL.BULGE_RADIUS * 0.6;
const BAR_S = MODEL.BAR_HALF * 0.55;
const BAR_U = [-Math.cos(MODEL.BAR_ANGLE * D2R), Math.sin(MODEL.BAR_ANGLE * D2R)];
const ARM_H = MODEL.DISC_HEIGHT * 0.6;
// Dust optical depth in V per kpc at the Sun's radius in the plane, through the dust disc's profile.
const tauDisc = () => DUST.avPerKpc / 1.0857;

/**
 * One place's emission (rgb, per kpc) and dust (tau_V per kpc), without the noise, into `out` [r, g, b, tau].
 * The GLSL below (model()) is the same arithmetic.
 */
function pointModel(x, y, z, map, mapN, out) {
  const R = Math.sqrt(x * x + y * y);
  const az = z < 0 ? -z : z;
  // disc: r ~ exponential, so the surface density goes as exp(-R/h)/(2 pi R h), softened inside 0.3 kpc
  const edge = R < MODEL.DISC_RADIUS ? 1 : R < MODEL.DISC_RADIUS * 1.15 ? MODEL.WEIGHT.discOuter / MODEL.WEIGHT.disc : 0;
  const disc = EXPOSE.disc * N_DISC * edge * Math.exp(-R / MODEL.DISC_SCALE) / (2 * Math.PI * MODEL.DISC_SCALE * Math.sqrt(R * R + 0.09))
    * Math.exp(-az / MODEL.DISC_HEIGHT) / (2 * MODEL.DISC_HEIGHT);
  // bulge: a half-normal radius in a ball squashed to 0.6 in z
  const zq = z / 0.6;
  const r2 = x * x + y * y + zq * zq;
  const bulge = EXPOSE.bulge * N_BULGE * (2 / (SQRT2PI * BULGE_S)) * Math.exp(-0.5 * r2 / (BULGE_S * BULGE_S)) / (4 * Math.PI * (r2 + 0.0225) * 0.6);
  // bar
  const t = x * BAR_U[0] + y * BAR_U[1], off = -x * BAR_U[1] + y * BAR_U[0];
  const bar = (t < 0 ? -t : t) > MODEL.BAR_HALF ? 0 : EXPOSE.bar * N_BAR * gauss(t, BAR_S) * gauss(off, 0.35) * gauss(z, 0.25);
  // arms, from the face-on map
  const armS = map ? sampleMap(map, mapN, x, y, 0) : 0;
  const armD = map ? sampleMap(map, mapN, x, y, 1) : 0;
  const arm = EXPOSE.arm * armS * gauss(z, ARM_H);
  const c = KIND_RGB;
  out[0] = disc * c[0][0] + bulge * c[1][0] + bar * c[2][0] + arm * c[3][0];
  out[1] = disc * c[0][1] + bulge * c[1][1] + bar * c[2][1] + arm * c[3][1];
  out[2] = disc * c[0][2] + bulge * c[1][2] + bar * c[2][2] + arm * c[3][2];
  const hole = smooth(DUST.hole[0], DUST.hole[1], R);
  // the Local Bubble: the Sun sits in a cavity of hot thin gas about 100 pc across
  const sx = x + MODEL.R0, sz = z - MODEL.Z_SUN;
  const bubble = smooth(DUST.bubble[0], DUST.bubble[1], Math.sqrt(sx * sx + y * y + sz * sz * 0.5));
  let tau = tauDisc() * Math.exp(-(R - MODEL.R0) / DUST.length) * hole * Math.exp(-az / DUST.height);
  tau += tauDisc() * DUST.arm * armD * Math.exp(-az / DUST.armHeight);
  tau += tauDisc() * DUST.ring[2] * Math.exp(-0.5 * ((R - DUST.ring[0]) / DUST.ring[1]) ** 2) * Math.exp(-az / DUST.ring[3]);
  tau += tauDisc() * DUST.cmz * Math.exp(-0.5 * R * R / (DUST.cmzRadius * DUST.cmzRadius)) * Math.exp(-az / DUST.cmzHeight);
  out[3] = tau * bubble;
}
function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

/** Where a line from `p` along `d` is inside the model's box (|z| < 3 kpc, R < 16 kpc): [t0, t1], or null. */
export function span(p, d) {
  let t0 = 0, t1 = 1e9;
  const ZB = 3, RB = 16;
  if (Math.abs(d[2]) > 1e-9) {
    const a = (-ZB - p[2]) / d[2], b = (ZB - p[2]) / d[2];
    t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b));
  } else if (Math.abs(p[2]) > ZB) return null;
  const A = d[0] * d[0] + d[1] * d[1], B = p[0] * d[0] + p[1] * d[1], C = p[0] * p[0] + p[1] * p[1] - RB * RB;
  if (A > 1e-12) {
    const disc = B * B - A * C;
    if (disc <= 0) return null;
    const s = Math.sqrt(disc);
    t0 = Math.max(t0, (-B - s) / A); t1 = Math.min(t1, (-B + s) / A);
  } else if (C > 0) return null;
  return t1 > t0 ? [t0, t1] : null;
}

/** Steps a vertex takes on each tier, and the vertex grid (longitudes, half the latitude rows). */
export const TIER_STEPS = [16, 32, 48];
export const TIER_GRID = [[240, 24], [540, 48], [720, 64]];
const NEAR_KPC = 0.01;

/**
 * The light along one line of sight, as the vertex shader integrates it: linear rgb before the stretch.
 * `cam` galactocentric kpc, `dir` a unit galactic vector. opts: { map, mapN, noise, noiseN, steps }.
 */
export function skyLinear(cam, dir, opts = {}) {
  const steps = opts.steps || TIER_STEPS[2];
  const sp = span(cam, dir);
  const L = [0, 0, 0];
  if (!sp) return L;
  const a = Math.max(sp[0], NEAR_KPC), b = sp[1];
  if (!(b > a)) return L;
  let T0 = 1, T1 = 1, T2 = 1;
  const q = Math.log(b / a) / steps;
  const m = _pm;
  for (let i = 0; i < steps; i++) {
    const t = a * Math.exp((i + 0.5) * q);
    const dt = t * q;
    const px = cam[0] + t * dir[0], py = cam[1] + t * dir[1], pz = cam[2] + t * dir[2];
    pointModel(px, py, pz, opts.map, opts.mapN, m);
    let tau = m[3];
    if (opts.noise) tau *= clumpOf(sampleNoise(opts.noise, opts.noiseN, px / DUST.clump + DUST.phase[0], py / DUST.clump + DUST.phase[1], pz / DUST.clump * 4 + DUST.phase[2]));
    const k0 = tau * DUST.k[0] * dt, k1 = tau * DUST.k[1] * dt, k2 = tau * DUST.k[2] * dt;
    // light emitted inside the step is dimmed by its own dust as a uniform slab dims it
    L[0] += T0 * m[0] * dt * (k0 > 1e-4 ? (1 - Math.exp(-k0)) / k0 : 1 - 0.5 * k0);
    L[1] += T1 * m[1] * dt * (k1 > 1e-4 ? (1 - Math.exp(-k1)) / k1 : 1 - 0.5 * k1);
    L[2] += T2 * m[2] * dt * (k2 > 1e-4 ? (1 - Math.exp(-k2)) / k2 : 1 - 0.5 * k2);
    T0 *= Math.exp(-k0); T1 *= Math.exp(-k1); T2 *= Math.exp(-k2);
  }
  return L;
}
const _pm = new Float64Array(4);
/** The dust's clumping by the noise: mean about 1, from almost clear to three times as thick. */
export function clumpOf(n) { return CLUMP[0] + CLUMP[1] * smooth(0.3, 0.78, n); }
export const CLUMP = [0.15, 1.75];

// ------------------------------------------------------------------------------------------- the detail

const CLOUD_GEOM = CLOUDS.map(([name, l, b, pc, dl, db, tilt, av]) => {
  const d = pc / 1000;
  const c = galDir(l, b);
  const centre = [c[0] * d - MODEL.R0, c[1] * d, c[2] * d + MODEL.Z_SUN];
  // sky axes at the cloud: east along l, north along b, turned by the tilt
  const el = [-Math.sin(l * D2R), Math.cos(l * D2R), 0];
  const nb = [-Math.sin(b * D2R) * Math.cos(l * D2R), -Math.sin(b * D2R) * Math.sin(l * D2R), Math.cos(b * D2R)];
  const ct = Math.cos(tilt * D2R), st = Math.sin(tilt * D2R);
  const u = el.map((v, k) => v * ct + nb[k] * st);
  const v = nb.map((x, k) => x * ct - el[k] * st);
  // sigma of the Gaussian: the eye's full width is about 2.4 sigma; the depth the smaller of the two
  const su = d * Math.tan(dl * D2R / 2) / 1.2, sv = d * Math.tan(db * D2R / 2) / 1.2, sw = Math.min(su, sv);
  const tau0 = av / 1.0857; // through the middle
  const rho0 = tau0 / (SQRT2PI * sw); // the column through the middle is rho0 * sqrt(2 pi) * sw
  return { name, centre, u, v, w: c, su, sv, sw, rho0, cosR: Math.cos(Math.min(80, Math.max(dl, db) * 1.6) * D2R) };
});
export const CLOUD_COUNT = CLOUD_GEOM.length;

function erf(x) {
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  return s * (1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x));
}

/**
 * The fragment's detail: the named clouds' columns (tau_V, with their ragged shapes) and the fine
 * modulation of the band (tau_V that may be negative: a gap in the dust; and a light factor). Pure.
 */
export function skyDetail(cam, dir, opts = {}) {
  const vol = opts.noise, n = opts.noiseN;
  const nz = (x, y, z) => (vol ? sampleNoise(vol, n, x, y, z) : 0.5);
  let tau = 0;
  for (const g of CLOUD_GEOM) {
    const o = [cam[0] - g.centre[0], cam[1] - g.centre[1], cam[2] - g.centre[2]];
    // the line in the cloud's own axes, in sigmas
    const ou = (o[0] * g.u[0] + o[1] * g.u[1] + o[2] * g.u[2]) / g.su, ov = (o[0] * g.v[0] + o[1] * g.v[1] + o[2] * g.v[2]) / g.sv, ow = (o[0] * g.w[0] + o[1] * g.w[1] + o[2] * g.w[2]) / g.sw;
    const du = (dir[0] * g.u[0] + dir[1] * g.u[1] + dir[2] * g.u[2]) / g.su, dv = (dir[0] * g.v[0] + dir[1] * g.v[1] + dir[2] * g.v[2]) / g.sv, dw = (dir[0] * g.w[0] + dir[1] * g.w[1] + dir[2] * g.w[2]) / g.sw;
    const A = du * du + dv * dv + dw * dw, B = ou * du + ov * dv + ow * dw, C = ou * ou + ov * ov + ow * ow;
    const m2 = C - (B * B) / A; // the squared distance of closest approach, in sigmas
    if (m2 > 16) continue;
    const col = Math.exp(-0.5 * m2) * Math.sqrt(Math.PI / (2 * A)) * (1 - erf(B / Math.sqrt(2 * A)));
    const ts = Math.max(0, -B / A);
    const q = [ou + ts * du, ov + ts * dv, ow + ts * dw];
    // its shape: two octaves of the noise in the cloud's own frame, ridged so it tears into filaments
    const n1 = nz(q[0] * 0.21 + g.centre[0], q[1] * 0.21, q[2] * 0.21);
    const n2 = nz(q[0] * 0.63 + 0.37, q[1] * 0.63 + g.centre[1], q[2] * 0.63);
    const shape = Math.max(0, smooth(0.3, 0.7, n1) * 1.4 + (n2 - 0.5) * 1.3 - 0.15);
    tau += g.rho0 * col * shape;
  }
  // fine dust and star clouds along the band: samples at fixed distances, in the galaxy's own axes
  let dtau = 0, light = 1;
  const S = opts.samples ?? 4;
  const at = [0.09, 0.22, 0.55, 1.4];
  const pick = S >= 4 ? [0, 1, 2, 3] : S >= 2 ? [1, 3] : [];
  for (const k of pick) {
    const t = at[k];
    const p = [cam[0] + t * dir[0], cam[1] + t * dir[1], cam[2] + t * dir[2]];
    const R = Math.hypot(p[0], p[1]);
    const env = tauDisc() * Math.exp(-(R - MODEL.R0) / DUST.length) * Math.exp(-Math.abs(p[2]) / DUST.height) * t * 0.9;
    const s = 0.11 * t + 0.02; // a lane spans about the same angle at every distance, drawn out along the plane
    const f = nz(p[0] / s, p[1] / s, (p[2] / s) * 1.8);
    dtau += env * (f - 0.5) * 1.6 * (S >= 4 ? 1 : 2);
  }
  if (S > 0) {
    const t = 1.8;
    const p = [cam[0] + t * dir[0], cam[1] + t * dir[1], cam[2] + t * dir[2]];
    light = 0.72 + 0.56 * nz(p[0] / 0.9, p[1] / 0.9, p[2] / 0.45);
  }
  return { tau, dtau, light };
}

/** From linear light to what the screen shows: the stretch and the gain. */
export function stretch(L, gain = 1) {
  const Y = 0.2126 * L[0] + 0.7152 * L[1] + 0.0722 * L[2];
  if (!(Y > 0)) return [0, 0, 0];
  // a soft black point: the faint starlight between the stars of a dark sky sinks, the band stands out of it
  const toe = Y / (Y + EXPOSE.floor);
  // and a shoulder: from above the disc, where the whole floor of the sky is galaxy, it rolls off instead of burning white
  const ys = EXPOSE.gain * gain * Math.pow(Y * toe * toe, EXPOSE.gamma);
  const k = ys / (1 + ys / EXPOSE.white) / Y;
  return [Math.min(1, L[0] * k), Math.min(1, L[1] * k), Math.min(1, L[2] * k)];
}

// THE GRAIN: the band's faint stars, which a photograph resolves and a model of densities does not. Their
// number in each patch of sky follows the light the model gives that patch; where they are inside it is a
// hash (illustrative: no catalogue star is among them, those are scene/starfield.js's). Two sizes of cell,
// in galactic axes. Pure: the same stars in the bake and on the GPU (GRAIN_GLSL).
export const GRAIN = { cells: [0.0011, 0.0042], rate: [26, 9], flux: [0.06, 0.16] };
function hash4(x, y, z) {
  // integer hash of a cell -> four numbers in [0, 1)
  let h = Math.imul((x + 4096) | 0, 73856093) ^ Math.imul((y + 4096) | 0, 19349663) ^ Math.imul((z + 4096) | 0, 83492791);
  const out = [0, 0, 0, 0];
  for (let k = 0; k < 4; k++) { h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); h ^= h >>> 15; out[k] = (h >>> 0) / 4294967296; }
  return out;
}
/** The grain's light at `dir` for a pixel `pix` radians wide, given the stretched band light `c` there. */
export function grainAt(dir, pix, c) {
  const Y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  if (!(Y > 1e-4)) return 0;
  let g = 0;
  for (let k = 0; k < 2; k++) {
    const cell = GRAIN.cells[k];
    const ix = Math.floor(dir[0] / cell), iy = Math.floor(dir[1] / cell), iz = Math.floor(dir[2] / cell);
    const h = hash4(ix, iy, iz);
    if (h[0] > Math.min(0.9, GRAIN.rate[k] * Y)) continue;
    const sx = (ix + 0.2 + 0.6 * h[1]) * cell, sy = (iy + 0.2 + 0.6 * h[2]) * cell, sz = (iz + 0.2 + 0.6 * h[3]) * cell;
    const n = Math.hypot(sx, sy, sz);
    const dx = dir[0] - sx / n, dy = dir[1] - sy / n, dz = dir[2] - sz / n;
    const sig = Math.max(pix * 0.55, cell * 0.06);
    const f = GRAIN.flux[k] * Math.pow(h[0] / Math.min(0.9, GRAIN.rate[k] * Y) + 0.05, -0.6) * Math.pow(pix * 0.55 / sig, 2);
    g += f * Math.exp(-(dx * dx + dy * dy + dz * dz) / (2 * sig * sig));
  }
  return g;
}

/** The whole of one pixel, as T1/T2 draw it (the bake uses this at 48 steps and 4 samples). Linear rgb. */
export function skyColour(cam, dir, opts = {}) {
  const L = skyLinear(cam, dir, opts);
  const d = skyDetail(cam, dir, opts);
  const out = [0, 0, 0];
  for (let c = 0; c < 3; c++) out[c] = L[c] * d.light * Math.exp(-(d.tau + d.dtau) * DUST.k[c]);
  const col = stretch(out, opts.gain ?? 1);
  if (opts.pix) {
    const g = grainAt(dir, opts.pix, col);
    for (let c = 0; c < 3; c++) col[c] = Math.min(1, col[c] * (1 + g));
  }
  return col;
}

// ------------------------------------------------------------------------------------------- the GLSL

const CLOUD_N = CLOUD_GEOM.length;

const COMMON_GLSL = /* glsl */ `
#define PI 3.141592653589793
#define SQRT2PI 2.5066282746310002
precision highp sampler3D;
uniform vec3 uCam;
uniform sampler2D uFaceOn;
uniform sampler3D uNoise;
uniform vec4 uExpose;   // disc, bulge, bar, arm
uniform vec4 uDust;     // tauDisc, arm, cmz, clump
float gaussN( float x, float s ) { return exp( -0.5 * ( x / s ) * ( x / s ) ) / ( SQRT2PI * s ); }
float smooth01( float a, float b, float x ) { float t = clamp( ( x - a ) / ( b - a ), 0.0, 1.0 ); return t * t * ( 3.0 - 2.0 * t ); }
const mat3 NROT = mat3( 0.6, 0.8, 0.0, -0.64, 0.48, 0.6, 0.48, -0.36, 0.8 );
float noise3( vec3 p ) { return texture( uNoise, NROT * p ).r; }
`;

const VERT = /* glsl */ `
${COMMON_GLSL}
uniform mat3 uRot;
uniform float uRadius;
uniform float uMarch;     // 0: the baked picture only (T0 near the Sun, the latch): the loop is skipped
varying vec3 vDir;
varying vec3 vLight;
varying float vY;
const float N_DISC = ${N_DISC.toFixed(4)};
const float N_BULGE = ${N_BULGE.toFixed(4)};
const float N_BAR = ${N_BAR.toFixed(4)};
const float BULGE_S = ${BULGE_S.toFixed(4)};
const float BAR_S = ${BAR_S.toFixed(4)};
const vec2 BAR_U = vec2( ${BAR_U[0].toFixed(7)}, ${BAR_U[1].toFixed(7)} );
const float MAP_HALF = ${MAP_HALF_KPC.toFixed(1)};
const vec3 KDUST = vec3( ${DUST.k.map((v) => v.toFixed(3)).join(', ')} );
const vec3 C_DISC = vec3( ${KIND_RGB[0].join(', ')} );
const vec3 C_BULGE = vec3( ${KIND_RGB[1].join(', ')} );
const vec3 C_BAR = vec3( ${KIND_RGB[2].join(', ')} );
const vec3 C_ARM = vec3( ${KIND_RGB[3].join(', ')} );
void model( vec3 p, out vec3 e, out float tau ) {
  float R = length( p.xy );
  float az = abs( p.z );
  float edge = R < ${MODEL.DISC_RADIUS.toFixed(2)} ? 1.0 : ( R < ${(MODEL.DISC_RADIUS * 1.15).toFixed(3)} ? ${(MODEL.WEIGHT.discOuter / MODEL.WEIGHT.disc).toFixed(5)} : 0.0 );
  float disc = uExpose.x * N_DISC * edge * exp( -R / ${MODEL.DISC_SCALE.toFixed(2)} ) / ( 2.0 * PI * ${MODEL.DISC_SCALE.toFixed(2)} * sqrt( R * R + 0.09 ) )
    * exp( -az / ${MODEL.DISC_HEIGHT.toFixed(2)} ) / ${(2 * MODEL.DISC_HEIGHT).toFixed(2)};
  float zq = p.z / 0.6;
  float r2 = dot( p.xy, p.xy ) + zq * zq;
  float bulge = uExpose.y * N_BULGE * ( 2.0 / ( SQRT2PI * BULGE_S ) ) * exp( -0.5 * r2 / ( BULGE_S * BULGE_S ) ) / ( 4.0 * PI * ( r2 + 0.0225 ) * 0.6 );
  float t = dot( p.xy, BAR_U );
  float off = -p.x * BAR_U.y + p.y * BAR_U.x;
  float bar = abs( t ) > ${MODEL.BAR_HALF.toFixed(2)} ? 0.0 : uExpose.z * N_BAR * gaussN( t, BAR_S ) * gaussN( off, 0.35 ) * gaussN( p.z, 0.25 );
  vec2 m = texture( uFaceOn, p.xy / MAP_HALF * 0.5 + 0.5 ).rg;
  float arm = uExpose.w * m.x * gaussN( p.z, ${ARM_H.toFixed(3)} );
  e = disc * C_DISC + bulge * C_BULGE + bar * C_BAR + arm * C_ARM;
  float hole = smooth01( ${DUST.hole[0].toFixed(2)}, ${DUST.hole[1].toFixed(2)}, R );
  tau = uDust.x * exp( -( R - ${MODEL.R0.toFixed(2)} ) / ${DUST.length.toFixed(3)} ) * hole * exp( -az / ${DUST.height.toFixed(3)} );
  tau += uDust.y * m.y * exp( -az / ${DUST.armHeight.toFixed(3)} );
  float rr = ( R - ${DUST.ring[0].toFixed(2)} ) / ${DUST.ring[1].toFixed(2)};
  tau += uDust.x * ${DUST.ring[2].toFixed(3)} * exp( -0.5 * rr * rr ) * exp( -az / ${DUST.ring[3].toFixed(3)} );
  tau += uDust.z * exp( -0.5 * R * R / ${(DUST.cmzRadius * DUST.cmzRadius).toFixed(4)} ) * exp( -az / ${DUST.cmzHeight.toFixed(3)} );
  vec3 s = p - vec3( ${(-MODEL.R0).toFixed(2)}, 0.0, ${MODEL.Z_SUN.toFixed(4)} );
  tau *= smooth01( ${DUST.bubble[0].toFixed(3)}, ${DUST.bubble[1].toFixed(3)}, sqrt( s.x * s.x + s.y * s.y + s.z * s.z * 0.5 ) );
}
bool span( vec3 p, vec3 d, out float t0, out float t1 ) {
  t0 = 0.0; t1 = 1e9;
  if ( abs( d.z ) > 1e-9 ) {
    float a = ( -3.0 - p.z ) / d.z, b = ( 3.0 - p.z ) / d.z;
    t0 = max( t0, min( a, b ) ); t1 = min( t1, max( a, b ) );
  } else if ( abs( p.z ) > 3.0 ) return false;
  float A = dot( d.xy, d.xy ), B = dot( p.xy, d.xy ), C = dot( p.xy, p.xy ) - 256.0;
  if ( A > 1e-12 ) {
    float disc = B * B - A * C;
    if ( disc <= 0.0 ) return false;
    float s = sqrt( disc );
    t0 = max( t0, ( -B - s ) / A ); t1 = min( t1, ( -B + s ) / A );
  } else if ( C > 0.0 ) return false;
  return t1 > t0;
}
void main() {
  vDir = position;
  vec3 d = uRot * position;
  vY = d.y;
  vLight = vec3( 0.0 );
  if ( uMarch > 0.0 ) {
    float a, b;
    if ( span( uCam, position, a, b ) ) {
      a = max( a, ${NEAR_KPC.toFixed(3)} );
      if ( b > a ) {
        vec3 T = vec3( 1.0 );
        float q = log( b / a ) / float( MW_STEPS );
        for ( int i = 0; i < MW_STEPS; i++ ) {
          float t = a * exp( ( float( i ) + 0.5 ) * q );
          float dt = t * q;
          vec3 p = uCam + t * position;
          vec3 e; float tau;
          model( p, e, tau );
          float n = noise3( vec3( p.xy, p.z * 4.0 ) / uDust.w + vec3( ${DUST.phase.map((v) => v.toFixed(4)).join(', ')} ) );
          tau *= ${CLUMP[0].toFixed(3)} + ${CLUMP[1].toFixed(3)} * smooth01( 0.3, 0.78, n );
          vec3 tc = tau * KDUST * dt;
          vec3 own = mix( 1.0 - 0.5 * tc, ( 1.0 - exp( -tc ) ) / max( tc, vec3( 1e-6 ) ), step( vec3( 1e-4 ), tc ) );
          vLight += T * e * dt * own;
          T *= exp( -tc );
        }
      }
    }
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4( d * uRadius, 1.0 );
}
`;

const FRAG = /* glsl */ `
${COMMON_GLSL}
uniform sampler2D uBaked;
uniform float uMarch;
uniform float uGain;
uniform float uGamma;
uniform float uScale;
uniform float uAir;       // the ground sky: nothing survives the last degrees above the horizon
uniform vec3 uCloudC[ ${CLOUD_N} ];
uniform vec3 uCloudU[ ${CLOUD_N} ];
uniform vec3 uCloudV[ ${CLOUD_N} ];
uniform vec4 uCloudS[ ${CLOUD_N} ];   // sigma u, v, w, rho0
uniform vec4 uCloudCone[ ${CLOUD_N} ]; // from the camera: the direction to the cloud and the cosine of its 4-sigma reach
varying vec3 vDir;
varying vec3 vLight;
varying float vY;
const vec3 KDUST = vec3( ${DUST.k.map((v) => v.toFixed(3)).join(', ')} );
uniform float uFloor;
const vec2 G_CELL = vec2( ${GRAIN.cells.join(', ')} );
const vec2 G_RATE = vec2( ${GRAIN.rate.join('.0, ')}.0 );
const vec2 G_FLUX = vec2( ${GRAIN.flux.join(', ')} );
uint hashU( uint h ) { h = ( h ^ ( h >> 15u ) ) * 0x2c1b3c6du; h = ( h ^ ( h >> 12u ) ) * 0x297a2d39u; h ^= h >> 15u; return h; }
float grainAt( vec3 dir, float pix, vec3 c ) {
  float Y = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  if ( Y <= 1e-4 ) return 0.0;
  float g = 0.0;
  for ( int k = 0; k < 2; k++ ) {
    float cell = G_CELL[ k ];
    ivec3 i = ivec3( floor( dir / cell ) );
    uvec3 iu = uvec3( i + 4096 );
    uint h = iu.x * 73856093u ^ iu.y * 19349663u ^ iu.z * 83492791u;
    h = hashU( h ); float h0 = float( h ) / 4294967296.0;
    h = hashU( h ); float h1 = float( h ) / 4294967296.0;
    h = hashU( h ); float h2 = float( h ) / 4294967296.0;
    h = hashU( h ); float h3 = float( h ) / 4294967296.0;
    float rate = min( 0.9, G_RATE[ k ] * Y );
    if ( h0 > rate ) continue;
    vec3 s = normalize( ( vec3( i ) + 0.2 + 0.6 * vec3( h1, h2, h3 ) ) * cell );
    vec3 dd = dir - s;
    float sig = max( pix * 0.55, cell * 0.06 );
    float f = G_FLUX[ k ] * pow( h0 / rate + 0.05, -0.6 ) * pow( pix * 0.55 / sig, 2.0 );
    g += f * exp( -dot( dd, dd ) / ( 2.0 * sig * sig ) );
  }
  return g;
}
float erfA( float x ) {
  float s = sign( x );
  x = abs( x );
  float t = 1.0 / ( 1.0 + 0.3275911 * x );
  return s * ( 1.0 - ( ( ( ( 1.061405429 * t - 1.453152027 ) * t + 1.421413741 ) * t - 0.284496736 ) * t + 0.254829592 ) * t * exp( -x * x ) );
}
void main() {
  vec3 dir = normalize( vDir );
  vec3 L = vLight;
  #if MW_DETAIL > 0
  if ( uMarch > 0.0 && dot( L, vec3( 1.0 ) ) > 1e-7 ) {
    float tau = 0.0;
    for ( int i = 0; i < ${CLOUD_N}; i++ ) {
      if ( dot( dir, uCloudCone[ i ].xyz ) < uCloudCone[ i ].w ) continue; // one dot product for a cloud nowhere near
      vec3 o = uCam - uCloudC[ i ];
      vec3 W = cross( uCloudU[ i ], uCloudV[ i ] );
      vec4 S = uCloudS[ i ];
      vec3 oq = vec3( dot( o, uCloudU[ i ] ) / S.x, dot( o, uCloudV[ i ] ) / S.y, dot( o, W ) / S.z );
      vec3 dq = vec3( dot( dir, uCloudU[ i ] ) / S.x, dot( dir, uCloudV[ i ] ) / S.y, dot( dir, W ) / S.z );
      float A = dot( dq, dq ), B = dot( oq, dq ), C = dot( oq, oq );
      float m2 = C - B * B / A;
      if ( m2 > 16.0 ) continue;
      float col = exp( -0.5 * m2 ) * sqrt( PI / ( 2.0 * A ) ) * ( 1.0 - erfA( B / sqrt( 2.0 * A ) ) );
      vec3 q = oq + max( 0.0, -B / A ) * dq;
      float n1 = noise3( q * 0.21 + vec3( uCloudC[ i ].x, 0.0, 0.0 ) );
      float n2 = noise3( q * 0.63 + vec3( 0.37, uCloudC[ i ].y, 0.0 ) );
      float shape = max( 0.0, smooth01( 0.3, 0.7, n1 ) * 1.4 + ( n2 - 0.5 ) * 1.3 - 0.15 );
      tau += S.w * col * shape;
    }
    float dtau = 0.0;
    #if MW_DETAIL >= 4
    const int NS = 4;
    float at[ 4 ]; at[ 0 ] = 0.09; at[ 1 ] = 0.22; at[ 2 ] = 0.55; at[ 3 ] = 1.4;
    float kk = 1.0;
    #else
    const int NS = 2;
    float at[ 2 ]; at[ 0 ] = 0.22; at[ 1 ] = 1.4;
    float kk = 2.0;
    #endif
    for ( int k = 0; k < NS; k++ ) {
      float t = at[ k ];
      vec3 p = uCam + t * dir;
      float R = length( p.xy );
      float env = uDust.x * exp( -( R - ${MODEL.R0.toFixed(2)} ) / ${DUST.length.toFixed(3)} ) * exp( -abs( p.z ) / ${DUST.height.toFixed(3)} ) * t * 0.9;
      float s = 0.11 * t + 0.02;
      float f = noise3( vec3( p.x / s, p.y / s, p.z / s * 1.8 ) );
      dtau += env * ( f - 0.5 ) * 1.6 * kk;
    }
    vec3 pl = uCam + 1.8 * dir;
    float light = 0.72 + 0.56 * noise3( vec3( pl.x / 0.9, pl.y / 0.9, pl.z / 0.45 ) );
    L *= light * exp( -( tau + dtau ) * KDUST );
  }
  #endif
  float Y = dot( L, vec3( 0.2126, 0.7152, 0.0722 ) );
  float toe = Y / ( Y + uFloor );
  float ys = uScale * pow( Y * toe * toe, uGamma );
  vec3 c = Y > 0.0 ? L * ( ys / ( 1.0 + ys / ${EXPOSE.white.toFixed(3)} ) / Y ) : vec3( 0.0 );
  c = min( c, vec3( 1.0 ) );
  #if MW_DETAIL > 0
  c = min( c * ( 1.0 + grainAt( dir, length( fwidth( dir ) ), c ) ), vec3( 1.0 ) );
  #endif
  #if MW_BAKED > 0
  if ( uMarch < 1.0 ) {
    // the picture baked from this same model, in its own convention (equirectDir)
    float l = atan( dir.y, dir.x );
    float b = asin( clamp( dir.z, -1.0, 1.0 ) );
    vec2 uv = vec2( fract( 0.5 - l / ( 2.0 * PI ) ), 0.5 + b / PI );
    vec3 baked = texture( uBaked, uv ).rgb;
    c = mix( baked, c, uMarch );
  }
  #endif
  float air = uAir > 0.0 ? smoothstep( 0.0, 0.3, vY ) : 1.0;
  gl_FragColor = vec4( c * uGain * air, 1.0 );
  #include <colorspace_fragment>
}
`;

// ------------------------------------------------------------------------------------------- geometry

/** Latitudes of the vertex rows: crowded towards the plane, where the band is. Pure. */
export function bandGeometryRows(half) {
  const rows = [];
  for (let j = -half; j <= half; j++) {
    const s = j / half;
    rows.push(90 * Math.sign(s) * Math.pow(Math.abs(s), 1.6));
  }
  return rows;
}

function bandGeometry(tier) {
  const [nl, half] = TIER_GRID[Math.min(2, Math.max(0, tier))];
  const rows = bandGeometryRows(half);
  const nr = rows.length;
  const pos = new Float32Array((nl + 1) * nr * 3);
  let k = 0;
  for (let j = 0; j < nr; j++) {
    for (let i = 0; i <= nl; i++) {
      const d = galDir((i / nl) * 360, rows[j]);
      pos[k++] = d[0]; pos[k++] = d[1]; pos[k++] = d[2];
    }
  }
  const idx = [];
  for (let j = 0; j < nr - 1; j++) {
    for (let i = 0; i < nl; i++) {
      const a = j * (nl + 1) + i, b = a + 1, c = a + nl + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.001);
  return g;
}

// ------------------------------------------------------------------------------------------- the layer

let shared = null; // the face-on map and the noise, built once per page
function sharedTextures(noiseN) {
  if (shared && shared.noiseN === noiseN) return shared;
  const n = 256;
  const map = faceOnMap(n);
  const half = new Uint16Array(map.length);
  for (let i = 0; i < map.length; i++) half[i] = THREE.DataUtils.toHalfFloat(Math.min(60000, map[i]));
  const faceOn = new THREE.DataTexture(half, n, n, THREE.RGFormat, THREE.HalfFloatType);
  faceOn.minFilter = THREE.LinearFilter; faceOn.magFilter = THREE.LinearFilter;
  faceOn.wrapS = faceOn.wrapT = THREE.ClampToEdgeWrapping;
  faceOn.colorSpace = THREE.NoColorSpace;
  faceOn.needsUpdate = true;
  const vol = noiseVolume(noiseN);
  const noise = new THREE.Data3DTexture(vol, noiseN, noiseN, noiseN);
  noise.format = THREE.RedFormat; noise.type = THREE.UnsignedByteType;
  noise.minFilter = THREE.LinearFilter; noise.magFilter = THREE.LinearFilter;
  noise.wrapS = noise.wrapT = noise.wrapR = THREE.RepeatWrapping;
  noise.colorSpace = THREE.NoColorSpace;
  noise.unpackAlignment = 1;
  noise.needsUpdate = true;
  shared = { noiseN, faceOn, noise, map, mapN: n, vol, bytes: half.byteLength + vol.byteLength };
  return shared;
}

/** CPU opts for skyLinear / skyColour with the same textures the GPU gets (tests, the bake). */
export function cpuModel(noiseN = 64) {
  const map = faceOnMap(256);
  return { map, mapN: 256, noise: noiseVolume(noiseN), noiseN };
}

/**
 * The layer. opts: { tier (0..2), baked: url of the T0 picture, radius (default 1), ground: true for the
 * sky view's copy (the air term), rot: a THREE.Matrix3 from galactic axes to the parent's (default G2E:
 * the parent is the equatorial sky group of scene/starfield.js) }.
 */
export function createMilkyWay(opts = {}) {
  let tier = Math.min(2, Math.max(0, Math.trunc(Number.isFinite(opts.tier) ? opts.tier : 1)));
  let detailLow = false;
  const noiseN = tier === 0 ? 32 : 64;
  const tex = sharedTextures(noiseN);
  const rot = new THREE.Matrix3();
  if (opts.rot) rot.copy(opts.rot);
  else rot.set(G2E[0][0], G2E[0][1], G2E[0][2], G2E[1][0], G2E[1][1], G2E[1][2], G2E[2][0], G2E[2][1], G2E[2][2]);
  const uniforms = {
    uCam: { value: new THREE.Vector3(-MODEL.R0, 0, MODEL.Z_SUN) },
    uFaceOn: { value: tex.faceOn },
    uNoise: { value: tex.noise },
    uExpose: { value: new THREE.Vector4(EXPOSE.disc, EXPOSE.bulge, EXPOSE.bar, EXPOSE.arm) },
    uDust: { value: new THREE.Vector4(tauDisc(), tauDisc() * DUST.arm, tauDisc() * DUST.cmz, DUST.clump) },
    uRot: { value: rot },
    uRadius: { value: opts.radius || 1 },
    uMarch: { value: 1 },
    uBaked: { value: null },
    uGain: { value: 1 },
    uGamma: { value: EXPOSE.gamma },
    uFloor: { value: EXPOSE.floor },
    uScale: { value: EXPOSE.gain },
    uAir: { value: opts.ground ? 1 : 0 },
    uCloudC: { value: CLOUD_GEOM.map((g) => new THREE.Vector3(...g.centre)) },
    uCloudU: { value: CLOUD_GEOM.map((g) => new THREE.Vector3(...g.u)) },
    uCloudV: { value: CLOUD_GEOM.map((g) => new THREE.Vector3(...g.v)) },
    uCloudS: { value: CLOUD_GEOM.map((g) => new THREE.Vector4(g.su, g.sv, g.sw, g.rho0)) },
    uCloudCone: { value: CLOUD_GEOM.map(() => new THREE.Vector4(0, 0, 1, -1)) },
  };
  /** Each cloud's cone from the camera (galactocentric kpc): outside it its column is under exp(-8) of the middle's. */
  function cloudCones(cam) {
    CLOUD_GEOM.forEach((g, i) => {
      const dx = g.centre[0] - cam[0], dy = g.centre[1] - cam[1], dz = g.centre[2] - cam[2];
      const d = Math.hypot(dx, dy, dz);
      const reach = 4.2 * Math.max(g.su, g.sv, g.sw);
      const v = uniforms.uCloudCone.value[i];
      if (d <= reach * 1.05) v.set(0, 0, 1, -2); // inside it: every direction
      else v.set(dx / d, dy / d, dz / d, Math.cos(Math.asin(reach / d)));
    });
  }
  cloudCones([-MODEL.R0, 0, MODEL.Z_SUN]);
  let opacity = 1;
  let exposure = 1;
  let ownGain = 1; // the ground sky's own (Moon, twilight, the kind of sky)
  let farFromSunLy = 0;
  let baked = null;
  let bakedAsked = false;
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  blank.needsUpdate = true;
  uniforms.uBaked.value = blank;

  function material() {
    const lowT = tier === 0 || detailLow;
    return new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms,
      defines: { MW_STEPS: lowT ? TIER_STEPS[0] : TIER_STEPS[tier], MW_DETAIL: lowT ? 0 : tier >= 2 ? 4 : 2, MW_BAKED: lowT ? 1 : 0 },
      // both faces: the grid's triangles wind inwards, and from inside only one of each pair is ever in view
      side: THREE.DoubleSide, depthTest: false, depthWrite: false, toneMapped: false,
      // The opaque list, with additive blend factors spelled out (scene/starfield.js says why: a material
      // flagged transparent draws after Earth whatever its renderOrder, and with depthTest off over it). The
      // ground sky's copy goes where its old picture went: after the dome, in that layer's own order.
      transparent: !!opts.ground,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    });
  }
  let builtFor = null;
  const mesh = new THREE.Mesh(bandGeometry(tier === 0 ? 0 : tier), material());
  builtFor = `${tier}:${detailLow}`;
  mesh.name = opts.ground ? 'ground-milkyway' : 'milkyway';
  mesh.frustumCulled = false;
  mesh.userData.model = 'milky-way-inside';

  function rebuild() {
    const key = `${tier}:${detailLow}`;
    if (key === builtFor) return;
    builtFor = key;
    mesh.material.dispose();
    mesh.material = material();
    const g = mesh.geometry;
    mesh.geometry = bandGeometry(tier === 0 || detailLow ? 0 : tier);
    g.dispose();
    applyMarch();
  }
  function wantBaked() {
    if (bakedAsked || !opts.baked) return;
    bakedAsked = true;
    try {
      new THREE.TextureLoader().load(String(opts.baked), (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.LinearFilter; // no mipmaps: the seam at l = 180 would pick a tiny level
        t.generateMipmaps = false;
        t.wrapS = THREE.RepeatWrapping;
        baked = t;
        uniforms.uBaked.value = t;
        applyMarch();
      }, undefined, () => { bakedAsked = false; });
    } catch (e) { bakedAsked = false; }
  }
  function applyMarch() {
    // T0 and the latch: the baked picture near the Sun; a coarse march once it is no longer the view from here
    if (tier === 0 || detailLow) {
      wantBaked();
      const far = Math.min(1, Math.max(0, (farFromSunLy - 100) / 300));
      uniforms.uMarch.value = baked ? far : 1;
    } else uniforms.uMarch.value = 1;
  }
  function applyGain() {
    uniforms.uGain.value = opacity * exposure * ownGain;
    mesh.visible = uniforms.uGain.value > 0.002;
  }
  applyMarch();
  applyGain();

  const _km = { x: 0, y: 0, z: 0 };
  return {
    mesh,
    /** The camera's place, sun-inertial km from the Sun (null: at the Sun). */
    setCameraKm(km) {
      const k = km || _km;
      const g = galFromEclKm(k);
      const c = uniforms.uCam.value;
      if (c.x !== g[0] || c.y !== g[1] || c.z !== g[2]) cloudCones(g);
      c.set(g[0], g[1], g[2]);
      farFromSunLy = Math.hypot(k.x || 0, k.y || 0, k.z || 0) / 9460730472580.8;
      if (tier === 0 || detailLow) applyMarch();
    },
    /** registry/lod.yaml `milky-way-inside`, 0..1. */
    setOpacity(k) { opacity = Math.min(1, Math.max(0, Number(k) || 0)); applyGain(); },
    /** The shutter (scene/exposure.js `milkyWay`). */
    setExposure(k) { exposure = Math.min(2.2, Math.max(0, Number(k) || 0)); applyGain(); },
    /** The ground sky's own gain. */
    setGain(k) { ownGain = Math.max(0, Number(k) || 0); applyGain(); },
    /** 'low' (the frame latch, Low chosen): the baked picture, no march near the Sun. */
    setDetail(level) { detailLow = level === 'low'; rebuild(); applyMarch(); },
    setTier(t) { const n = Math.min(2, Math.max(0, Math.trunc(Number(t) || 0))); if (n !== tier) { tier = n; rebuild(); } applyMarch(); },
    /** The ground sky: galactic axes -> its local axes. */
    setRotation(m3) { rot.copy(m3); },
    setRadius(r) { uniforms.uRadius.value = r; },
    stats: () => ({
      tier, detailLow, steps: mesh.material.defines.MW_STEPS, detail: mesh.material.defines.MW_DETAIL,
      vertices: mesh.geometry.getAttribute('position').count, march: uniforms.uMarch.value, baked: !!baked,
      gain: +uniforms.uGain.value.toFixed(4), cam: uniforms.uCam.value.toArray().map((v) => +v.toFixed(4)),
      gpuBytes: tex.bytes + (baked ? 2048 * 1024 * 4 : 0), visible: mesh.visible,
    }),
    dispose() {
      mesh.geometry.dispose();
      mesh.material.dispose();
      if (baked) baked.dispose();
      blank.dispose();
      if (mesh.parent) mesh.parent.remove(mesh);
    },
  };
}

/** The shaders as they compile (tests/test_milkyway_inside.mjs reads them). */
export const SHADERS = { vert: VERT, frag: FRAG };

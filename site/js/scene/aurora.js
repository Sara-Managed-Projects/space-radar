// scene/aurora.js -- the northern and southern lights on the Earth's night side, from NOAA's forecast.
//
// Contract:
//   createAurora({ earth, renderer?, camera?, scene?, now?, saveData?, tier?, onChange? })
//     .start()                    schedules the first look START_DELAY_MS after it is called (main.js: on sr:layers-ready)
//     .tick(clockMs, opts)        once a frame, after the Earth's update: {on, latched, reducedMotion, discShare}
//     .state()                    what is held: the forecast's times, its summary, bytes, why not drawn
//     .line(clockMs)              the Earth card's sentence about its aurora (copy/en.js COPY.aurora)
//     .credit()                   the Sources panel's credit line
//     .peak()                     the highest probability held, percent, for the layers panel
//   auroraRightNow(kp, summary)   the explore view's "Right now" line when Kp >= 5, or null
//   auroraLine(state, clockMs, wallMs)   pure: the card's sentence
//   and the JS twins of the shader's functions, for tests/test_aurora.mjs.
//
// Built 2026-09-30 (spec 0053 task 3). Ivan: "why isn't the aurora part of the live weather?"
//
// WHAT IT IS. NOAA SWPC's OVATION Prime forecast (data/ovation.js): a 1 x 1 degree grid of the
// probability of visible aurora for the next 30 to 90 minutes. It is a MODEL driven by the solar
// wind at L1, not a photograph, and the card says so. The extent and the brightness are the
// model's; the fine arcs and folds inside the band are drawn (illustrative), and the card says that too.
//
// HOW IT IS DRAWN. One emissive shell around the Earth from AURORA_BASE_KM to AURORA_TOP_KM, TRUE
// heights (no exaggeration: at the default view 200 km is about eight pixels at the limb, which is
// what makes the curtain read as a curtain and not a ring). Its fragment shader marches the view
// ray through the shell, and at each step reads the grid under the point and adds the light the
// three auroral emissions give off at that height:
//   green  557.7 nm, atomic oxygen, the aurora's colour: a sharp lower edge at ~100 km, peak ~120 km;
//   red    630.0 nm, atomic oxygen, faint and high: 200-300 km, the top edge of a curtain;
//   violet 427.8 nm, ionised nitrogen, the lower fringe of a BRIGHT curtain only (~100 km).
// Each emission's height profile is integrated analytically along the step (sech^2 profiles, whose
// integral is a tanh), so a step of 60 km never skips a 12 km-thick layer and nothing bands. From
// above that sums to a green glow with a warm fringe; at the limb, where the ray runs along the
// layers, the green curtain stands up with red above it and violet under it, which is exactly the
// view the ISS crews photograph. The emission is additive and the glow is that sum, tone-mapped
// like the air (no bloom, no post pass: tests/test_contract.mjs refuses them).
//
// NIGHT ONLY. Aurora is as bright by day, but no camera sees it against the sunlit ground or
// clouds. The shell fades out across the terminator by the Sun's height over the point below each
// step (nightMask), the same test the Earth's night lights use in spirit, with its own band.
//
// WHAT IT COSTS. Nothing on the boot path: no request, no geometry, no shader until the first
// forecast has arrived (START_DELAY_MS after the layers have landed, in an idle moment). Then one draw
// call, one 720 x 361 R8 texture (259 920 bytes of GPU memory; data/ovation.js upsampleGrid says
// why half a degree) and a 64 x 32 sphere of positions and indices only (~50 kB). The fragment cost is where the shell is: two cheap tests discard every pixel whose
// ray never reaches the oval's latitudes or never leaves daylight, so on a quiet day most of the
// disc pays a dozen instructions. Steps per tier: TIER_STEPS below. Under the frame latch and on
// T0 the steps drop; under the latch and reduced motion the folds hold still.

import * as THREE from '../../vendor/three.module.min.js';
import {
  OVATION_URL, GRID_W, GRID_H, TEX_W, TEX_H, START_DELAY_MS, KP_STORM,
  parseOvation, upsampleGrid, auroraMode, nextLookMs, mayLook, percentToByte,
} from '../data/ovation.js';
import { WGS84_A_KM } from './earth.js';
import { COPY, t, fmt, ageInWords } from '../copy/en.js';

// --- tunables: every number the shader uses, named here and passed in -----------------------------

/** The bottom and top of the shell. Real aurora: the green's lower edge ~95-100 km, red tops ~300+ km. */
export const AURORA_BASE_KM = 85;
export const AURORA_TOP_KM = 340;

/**
 * The three emissions' height profiles, sech^2((h - peak) / w) with a different w below and above
 * the peak: a curtain's lower edge is sharp (the electrons stop where the air gets thick) and its
 * top fades slowly. Heights from the textbook picture of an auroral curtain (Chamberlain 1961;
 * the "green line at 100-150 km, red line above 200 km" of every photograph's caption).
 * `gain` is each emission's brightness relative to the green, per km of column: 630 nm is roughly a
 * tenth of 557.7 nm in an ordinary curtain, spread over twice the height.
 */
export const EMISSIONS = {
  green: { peakKm: 118, belowKm: 10, aboveKm: 38, gain: 1.0 },
  red: { peakKm: 235, belowKm: 40, aboveKm: 65, gain: 0.07 },
  violet: { peakKm: 100, belowKm: 5, aboveKm: 9, gain: 0.35 },
};
/** Violet appears only in bright aurora: its share rises over this range of emission (0..1). */
export const VIOLET_FROM = 0.5;
export const VIOLET_TO = 0.9;

/**
 * The colours, LINEAR light, of the three lines as cameras record them. Monochromatic 557.7 nm lies
 * outside sRGB; the ISS pictures render the core a soft bright green, which is this (#7DFF9A
 * encoded; the first draft's #4DFF88 read as neon). 630 nm is a deep red (#FF2A3C) and 427.8 nm a
 * blue violet (#9A6BFF).
 */
export const GREEN_557 = [0.205, 1.0, 0.323];
/**
 * The faint edge of the band, desaturated towards its own luminance (70 % of the way to the core's
 * chroma): a dim aurora reads as a soft pale glow in photographs, and only a bright core as the
 * green of the line. The colour slides from this to GREEN_557 as the emission rises (EDGE_TO_CORE).
 */
export const GREEN_EDGE = [0.378, 0.935, 0.461];
export const EDGE_TO_CORE = [0.12, 0.6];
export const RED_630 = [1.0, 0.023, 0.045];
export const VIOLET_428 = [0.323, 0.147, 1.0];

/**
 * The night mask: 1 where the Sun is this far below the horizon of the point below (cos of the Sun's
 * zenith angle, so -0.10 is 5.7 degrees down), 0 once it is 1.1 degrees up. The Earth's own
 * twilight band (earth.js TERMINATOR) runs -0.08 to 0.12; the aurora is gone before the ground is lit.
 */
export const NIGHT = { dark: -0.10, lit: 0.02 };

/**
 * Probability to emission (0..1). Below 3 % nothing (OVATION's floor is noise at the oval's edge),
 * the gate full by 15 % (soft, so the band's edge is a fade and not a step), then 1 - exp(-p^1.5 / 0.25):
 * brightness grows with the energy flux the probability stands for, faster than linearly at first
 * so the oval's core stands out from its fringe, and saturates the way a camera does. 10 % draws at
 * 0.12, 20 % at 0.30, 60 % at 0.84: faint is faint (spec 0053 req 5, "never exaggerated"). The
 * first drafts (1 - exp(-p / 0.3), then / 0.45) made a 20 % oval one flat green plate.
 */
export const EMISSION = { floor: 0.03, full: 0.15, scale: 0.25, power: 1.5 };

/**
 * The overall brightness a vertical column of full emission draws at, before tone mapping. Set
 * against the night side's city lights on 2026-10-01's 20 % oval: at 0.9 the oval near the limb of
 * the default view (where the path through the shell is longest) was a solid green plate brighter
 * than all of Europe's lights; at 0.5 it is a glow a little brighter than a city. A storm's 60 %
 * oval is then 2.8 times brighter again, before tone mapping holds it.
 */
export const AURORA_GAIN = 0.5;

/**
 * Steps and step length per tier. The step count follows the ray's path through the shell (a
 * vertical ray is ~250 km and needs few; a grazing ray at the limb is ~4 000 km) up to the cap.
 * T0 and the frame latch: 8 steps. T1: 16. T2: 24. The folds stay on every tier: they cost a few
 * sines a step, and without them the mean-preserving glow is one flat green plate (measured
 * 2026-10-01: the latch tripped mid-probe on SwiftShader, the tier fell to 0, and the oval that had
 * two arcs a second before became a smooth neon disc, which is the look this file exists to avoid).
 */
export const TIER_STEPS = [
  { maxSteps: 8, stepKm: 140, folds: true },
  { maxSteps: 16, stepKm: 70, folds: true },
  { maxSteps: 24, stepKm: 45, folds: true },
];

/**
 * The geomagnetic (dipole) north pole, IGRF-14 at epoch 2025: 80.8 N, 72.7 W. The oval is centred
 * near it, and the drawn arcs run along its circles of latitude. Only the illustrative folds use it;
 * where the aurora is comes from the grid.
 */
export const DIPOLE_POLE = { latDeg: 80.8, lonDeg: -72.7 };

/**
 * The folds (ILLUSTRATIVE). Seen from orbit (ISS photographs, VIIRS Day/Night Band) aurora is
 * mostly a soft luminous band whose brightness follows the precipitation, with one or two brighter
 * discrete arcs in it that break up, kink and swirl along the oval. So:
 *   - `diffuse` of the light is the forecast as it is: the smoothed grid, a soft cross-section;
 *   - the arcs are CONTOURS of the forecast itself, not lines at fixed latitudes: one where the
 *     probability crosses `levels[0]` of the hemisphere's peak and a fainter one at `levels[1]`,
 *     each drawn only on the band's EQUATORWARD side (where the bright discrete arc of an evening
 *     oval sits), so they follow the oval's real shape and are never parallel copies of each other;
 *   - each arc kinks (its level moves with 1D noise along the oval, about +-0.3 to 0.6 degree of
 *     latitude on a 20 % oval), changes width (noise again), and comes and goes in beads, gaps and
 *     brighter patches (a third noise, gated so about half the oval has no arc at all).
 * Five drafts taught these numbers. Arcs at fixed magnetic latitudes every 1.25, 3.3 and 5.5 degrees
 * drew smeared glow, concentric neon rings, and finally "two or three regular parallel stripes, like
 * a decal" (the coordinator's read of the 2026-10-01 north view), whatever the noise on them.
 * The noise is periodic in magnetic longitude and drifts along the oval: `drift` is noise cells a
 * second; 0.02 of an 11-cell oval at 67 degrees is about 30 km/s, where the real flow is about
 * 1 km/s and would not move a pixel from this far out. So the motion is a slow shimmer and not a
 * still. The card says the folds are drawn.
 */
export const FOLDS = {
  diffuse: 0.72,
  levels: [0.45, 0.75],
  levelGain: [1.0, 0.55],
  widthPeak: 0.07,
  kinkPeak: 0.07,
  arcGain: 4.5,
  cells: [11, 27, 7, 17, 31],
  drift: 0.02,
};

/** The shell is not drawn when the Earth's disc is smaller than this share of half the view. */
export const MIN_DISC_SHARE = 0.03;

/** How long a new forecast takes to replace the old one (a CPU blend of the two grids), wall time. */
export const CROSSFADE_MS = 3000;
/** Off and on: the layer's box, the clock moved away and back. */
export const FADE_MS = 1200;

const F_FLAT = 1 / 298.257223563;

// --- the JS twins of the shader ---------------------------------------------------------------------

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoothstep = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };

/** 1 on the night side, 0 on the day side, from the Sun's height over the point (cos zenith). */
export function nightMask(sunDot) {
  return 1 - smoothstep(NIGHT.dark, NIGHT.lit, sunDot);
}

/** NOAA's probability (0..1) to the emission the shell draws (0..1). */
export function probabilityToEmission(p) {
  const gate = smoothstep(EMISSION.floor, EMISSION.full, p);
  return gate * (1 - Math.exp(-(Math.max(0, p) ** EMISSION.power) / EMISSION.scale));
}

/** One emission's density at a height, 0..1 (1 at its peak). */
export function profile(e, hKm) {
  const w = hKm < e.peakKm ? e.belowKm : e.aboveKm;
  const th = Math.tanh((hKm - e.peakKm) / w);
  return 1 - th * th;
}

/** Its integral from the peak, signed: w * tanh((h - peak) / w). */
export function profileIntegral(e, hKm) {
  const w = hKm < e.peakKm ? e.belowKm : e.aboveKm;
  return w * Math.tanh((hKm - e.peakKm) / w);
}

/** A vertical column through one emission, km: belowKm + aboveKm. */
export function columnKm(e) {
  return e.belowKm + e.aboveKm;
}

/**
 * The colour ramp: the light given off per km at height `hKm` by aurora of emission `e` (0..1),
 * linear RGB, in units of the green column (so a vertical column of e = 1 sums to ~GREEN_557).
 */
export function auroraColour(hKm, e) {
  const g = profile(EMISSIONS.green, hKm) * EMISSIONS.green.gain;
  const r = profile(EMISSIONS.red, hKm) * EMISSIONS.red.gain;
  const v = profile(EMISSIONS.violet, hKm) * EMISSIONS.violet.gain * smoothstep(VIOLET_FROM, VIOLET_TO, e);
  const k = e / columnKm(EMISSIONS.green);
  const c = smoothstep(EDGE_TO_CORE[0], EDGE_TO_CORE[1], e);
  return [0, 1, 2].map((i) => k * (g * (GREEN_EDGE[i] + (GREEN_557[i] - GREEN_EDGE[i]) * c) + r * RED_630[i] + v * VIOLET_428[i]));
}

/** Where a geographic point reads the texture: texel centres every half degree, u east from 0, v north from -90. */
export function gridUv(latDeg, lonDeg) {
  const k = TEX_W / 360;
  return { u: (lonDeg * k + 0.5) / TEX_W, v: ((latDeg + 90) * k + 0.5) / TEX_H };
}

/**
 * The largest dot(dir, z) over the great-circle arc from unit a to unit b: the endpoints, or the
 * point of the arc nearest z when it lies between them. The shader uses it twice to throw a pixel
 * away early: with z = the pole (its ray never reaches the oval's latitudes) and with z = minus the
 * Sun (its ray never leaves daylight).
 */
export function maxDotOnArc(a, b, z) {
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  let m = Math.max(dot(a, z), dot(b, z));
  let n = cross(a, b);
  const nl = Math.hypot(...n);
  if (nl < 1e-5) return m;
  n = n.map((x) => x / nl);
  const zn = dot(z, n);
  let c = [z[0] - n[0] * zn, z[1] - n[1] * zn, z[2] - n[2] * zn];
  const cl = Math.hypot(...c);
  if (cl < 1e-5) return m;
  c = c.map((x) => x / cl);
  if (dot(cross(a, c), n) >= 0 && dot(cross(c, b), n) >= 0) m = Math.max(m, dot(c, z));
  return m;
}

/** The dipole axis in the Earth mesh's local axes (+X lon 0, +Y north, -Z lon 90 E). */
export function dipoleAxisLocal(pole = DIPOLE_POLE) {
  const la = (pole.latDeg * Math.PI) / 180;
  const lo = (pole.lonDeg * Math.PI) / 180;
  return [Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)];
}

// --- the shader ---------------------------------------------------------------------------------------

const vec3 = (a) => `vec3( ${a.map((x) => x.toFixed(4)).join(', ')} )`;
const prof = (name, e) => `const vec3 ${name} = vec3( ${e.peakKm.toFixed(1)}, ${e.belowKm.toFixed(1)}, ${e.aboveKm.toFixed(1)} );`;

const AURORA_VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>

varying vec3 vPosL;   // the shell point in the Earth's own axes, equatorial radii

void main() {
  vPosL = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  #include <logdepthbuf_vertex>
}
`;

/** Exported for tests/test_aurora.mjs, which checks the shader carries the JS twins' numbers. */
export const AURORA_FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>

uniform sampler2D uGrid;       // OVATION probability, R8, 720 x 361 (data/ovation.js upsampleGrid), rows south first
uniform vec3  uCamLocal;       // the camera, Earth-local axes, equatorial radii
uniform vec3  uSunDirLocal;    // the Earth's own uniform, shared: unit, Earth-local
uniform vec3  uMagAxis;        // the dipole axis, Earth-local
uniform float uOuter;          // shell top, equatorial radii
uniform float uGain;           // AURORA_GAIN times the fades
uniform int   uSteps;          // the tier's cap
uniform float uStepKm;         // the tier's step
uniform float uFolds;          // 0 or 1
uniform float uTime;           // seconds, wall; held still under reduced motion
uniform float uMinSinLat;      // sin of the lowest latitude the grid reaches, less a margin
uniform vec2  uPeak;           // the forecast's peak probability, north and south, 0..1

varying vec3 vPosL;

const float A_KM = ${WGS84_A_KM.toFixed(3)};
const float F_FLAT = ${F_FLAT.toFixed(8)};
const float GROUND_R = 0.9975;
const vec2  TEX_SIZE = vec2( ${TEX_W.toFixed(1)}, ${TEX_H.toFixed(1)} );
const float TEX_PER_DEG = ${(TEX_W / 360).toFixed(1)};
const int   MAX_STEPS = ${Math.max(...TIER_STEPS.map((s) => s.maxSteps))};
${prof('P_GREEN', EMISSIONS.green)}
${prof('P_RED', EMISSIONS.red)}
${prof('P_VIOLET', EMISSIONS.violet)}
const vec3 GAINS = vec3( ${EMISSIONS.green.gain.toFixed(4)}, ${EMISSIONS.red.gain.toFixed(4)}, ${EMISSIONS.violet.gain.toFixed(4)} );
const vec3 GREEN_557 = ${vec3(GREEN_557)};
const vec3 RED_630 = ${vec3(RED_630)};
const vec3 VIOLET_428 = ${vec3(VIOLET_428)};
const float GREEN_COLUMN_KM = ${columnKm(EMISSIONS.green).toFixed(3)};
const vec2 NIGHT = vec2( ${NIGHT.dark.toFixed(4)}, ${NIGHT.lit.toFixed(4)} );
const vec3 EMISSION = vec3( ${EMISSION.floor.toFixed(4)}, ${EMISSION.full.toFixed(4)}, ${EMISSION.scale.toFixed(4)} );
const float EMISSION_POWER = ${EMISSION.power.toFixed(3)};
const vec2 VIOLET_RANGE = vec2( ${VIOLET_FROM.toFixed(3)}, ${VIOLET_TO.toFixed(3)} );
const vec3 GREEN_EDGE = ${vec3(GREEN_EDGE)};
const vec2 EDGE_TO_CORE = vec2( ${EDGE_TO_CORE[0].toFixed(3)}, ${EDGE_TO_CORE[1].toFixed(3)} );
const float DIFFUSE = ${FOLDS.diffuse.toFixed(3)};
const vec2 ARC_LEVELS = vec2( ${FOLDS.levels[0].toFixed(3)}, ${FOLDS.levels[1].toFixed(3)} );
const vec2 ARC_LEVEL_GAIN = vec2( ${FOLDS.levelGain[0].toFixed(3)}, ${FOLDS.levelGain[1].toFixed(3)} );
const float ARC_WIDTH = ${FOLDS.widthPeak.toFixed(4)};
const float ARC_KINK = ${FOLDS.kinkPeak.toFixed(4)};
const float ARC_GAIN = ${FOLDS.arcGain.toFixed(3)};
const vec4 CELLS = vec4( ${FOLDS.cells.slice(0, 4).map((c) => c.toFixed(1)).join(', ')} );
const float CELLS_B = ${FOLDS.cells[4].toFixed(1)};
const float DRIFT = ${FOLDS.drift.toFixed(4)};

vec2 sphere( vec3 ro, vec3 rd, float r ) {
  float b = dot( ro, rd );
  float c = dot( ro, ro ) - r * r;
  float d = b * b - c;
  if ( d < 0.0 ) return vec2( 1e9, -1e9 );
  d = sqrt( d );
  return vec2( -b - d, -b + d );
}

// maxDotOnArc in scene/aurora.js, line for line.
float maxDotOnArc( vec3 a, vec3 b, vec3 z ) {
  float m = max( dot( a, z ), dot( b, z ) );
  vec3 n = cross( a, b );
  float nl = length( n );
  if ( nl < 1e-5 ) return m;
  n /= nl;
  vec3 c = z - n * dot( z, n );
  float cl = length( c );
  if ( cl < 1e-5 ) return m;
  c /= cl;
  if ( dot( cross( a, c ), n ) >= 0.0 && dot( cross( c, b ), n ) >= 0.0 ) m = max( m, dot( c, z ) );
  return m;
}

// Height over the WGS84 ellipsoid, km, near enough for layers 10 km thick (the ellipsoid's radius
// at geocentric latitude phi is 1 - f sin^2 phi to first order in f).
float heightKm( vec3 p ) {
  float r = length( p );
  float s = p.y / r;
  return ( r - ( 1.0 - F_FLAT * s * s ) ) * A_KM;
}

// profile() and profileIntegral() in scene/aurora.js. 1 - tanh^2 is sech^2 without overflow.
float prof( vec3 e, float h ) {
  float w = h < e.x ? e.y : e.z;
  float th = tanh( ( h - e.x ) / w );
  return 1.0 - th * th;
}
float profInt( vec3 e, float h ) {
  float w = h < e.x ? e.y : e.z;
  return w * tanh( ( h - e.x ) / w );
}
// One emission over one step: the exact integral when the height changes steadily along it, and
// Simpson's rule on the step that holds the ray's lowest point (where it does not).
float stepIntegral( vec3 e, float ha, float hm, float hb, float segKm ) {
  bool steady = ( hm - ha ) * ( hb - hm ) > 0.0 && abs( hb - ha ) > 0.25 * segKm;
  if ( steady ) return ( profInt( e, hb ) - profInt( e, ha ) ) / ( hb - ha ) * segKm;
  return ( prof( e, ha ) + 4.0 * prof( e, hm ) + prof( e, hb ) ) / 6.0 * segKm;
}

float emission( float p ) {
  return smoothstep( EMISSION.x, EMISSION.y, p ) * ( 1.0 - exp( -pow( max( p, 0.0 ), EMISSION_POWER ) / EMISSION.z ) );
}

// Periodic 1D value noise: 'period' lattice cells round the oval, so it closes on itself.
float hash1( float i ) { return fract( sin( i * 127.1 + 311.7 ) * 43758.5453 ); }
float vnoise( float x, float period ) {
  float i = floor( x );
  float f = x - i;
  float u = f * f * ( 3.0 - 2.0 * f );
  return mix( hash1( mod( i, period ) ), hash1( mod( i + 1.0, period ) ), u );
}

// Magnetic longitude as a fraction of the oval (0..1), for the noise along it. ILLUSTRATIVE.
float ovalU( vec3 dir ) {
  vec3 e1 = normalize( cross( uMagAxis, vec3( 0.0, 0.0, 1.0 ) ) );
  vec3 e2 = cross( uMagAxis, e1 );
  return atan( dot( dir, e2 ), dot( dir, e1 ) ) / 6.2831853 + 0.5;
}

// How much of a discrete arc this point is in (0..~1, times its beads), from the forecast p here,
// pPole half a degree towards the magnetic pole, and peak, the hemisphere's highest probability.
float arcs( vec3 dir, float p, float pPole, float peak ) {
  float equatorward = smoothstep( 0.0, 0.02 * peak, pPole - p );   // the band rises towards the pole
  if ( equatorward <= 0.0 ) return 0.0;
  float u = ovalU( dir );
  float t = uTime * DRIFT;
  float kink = ( vnoise( u * CELLS.x + t, CELLS.x ) - 0.5 ) + 0.5 * ( vnoise( u * CELLS.y + 3.1 + t, CELLS.y ) - 0.5 );
  float width = ARC_WIDTH * peak * ( 0.55 + 0.9 * vnoise( u * CELLS.w + 7.3 + t, CELLS.w ) );
  float beads = smoothstep( 0.35, 0.75, vnoise( u * CELLS.z + 1.7 + t, CELLS.z ) ) * ( 0.55 + 0.45 * vnoise( u * CELLS_B + 5.9 + t, CELLS_B ) );
  float d0 = ( p - ARC_LEVELS.x * peak + ARC_KINK * peak * kink ) / width;
  float d1 = ( p - ARC_LEVELS.y * peak - ARC_KINK * peak * kink ) / ( width * 0.8 );
  return equatorward * beads * ( ARC_LEVEL_GAIN.x * exp( -d0 * d0 ) + ARC_LEVEL_GAIN.y * exp( -d1 * d1 ) );
}

float gridAt( vec3 dir ) {
  float lat = degrees( asin( clamp( dir.y, -1.0, 1.0 ) ) );
  float lon = degrees( atan( -dir.z, dir.x ) );
  return texture2D( uGrid, vec2( ( lon * TEX_PER_DEG + 0.5 ) / TEX_SIZE.x, ( ( lat + 90.0 ) * TEX_PER_DEG + 0.5 ) / TEX_SIZE.y ) ).r;
}

void main() {
  #include <logdepthbuf_fragment>

  vec3 ro = uCamLocal;
  vec3 rd = normalize( vPosL - ro );
  vec2 shell = sphere( ro, rd, uOuter );
  float t0 = max( shell.x, 0.0 );
  float t1 = shell.y;
  vec2 ground = sphere( ro, rd, GROUND_R );
  if ( ground.x > 0.0 ) t1 = min( t1, ground.x );
  if ( t1 <= t0 ) discard;

  vec3 a = normalize( ro + rd * t0 );
  vec3 b = normalize( ro + rd * t1 );
  // Early outs, both conservative (they test the whole arc the ray sweeps, not its ends): a ray
  // that never reaches the oval's latitudes, and one that never leaves daylight.
  float reach = max( maxDotOnArc( a, b, vec3( 0.0, 1.0, 0.0 ) ), maxDotOnArc( a, b, vec3( 0.0, -1.0, 0.0 ) ) );
  if ( reach < uMinSinLat ) discard;
  if ( -maxDotOnArc( a, b, -uSunDirLocal ) > NIGHT.y ) discard;

  // Folds: they fade where an arc (about half a degree across) would be narrower than about two
  // pixels, so a far view is the smooth forecast and never a shimmer of aliasing. Measured once, at
  // the entry point, in degrees of latitude a pixel: a derivative inside the loop would be undefined.
  float foldK = 0.0;
  if ( uFolds > 0.5 ) foldK = 1.0 - smoothstep( 0.2, 0.45, fwidth( degrees( asin( clamp( dot( a, uMagAxis ), -1.0, 1.0 ) ) ) ) );

  float lenKm = ( t1 - t0 ) * A_KM;
  int n = int( clamp( ceil( lenKm / uStepKm ), 2.0, float( uSteps ) ) );
  float ds = ( t1 - t0 ) / float( n );
  float segKm = ds * A_KM;
  vec3 acc = vec3( 0.0 );
  float ha = heightKm( ro + rd * t0 );
  for ( int i = 0; i < MAX_STEPS; i++ ) {
    if ( i >= n ) break;
    float ta = t0 + float( i ) * ds;
    vec3 pm = ro + rd * ( ta + 0.5 * ds );
    float hm = heightKm( pm );
    float hb = heightKm( ro + rd * ( ta + ds ) );
    float h0 = ha;
    ha = hb;
    vec3 dir = normalize( pm );
    float night = 1.0 - smoothstep( NIGHT.x, NIGHT.y, dot( dir, uSunDirLocal ) );
    if ( night <= 0.0 ) continue;
    float p = gridAt( dir );
    float e = emission( p );
    if ( e <= 0.0 ) continue;
    float s = 1.0;
    float peak = dir.y >= 0.0 ? uPeak.x : uPeak.y;
    if ( foldK > 0.0 && p > 0.3 * ARC_LEVELS.x * peak ) {
      // One more fetch, half a degree towards the magnetic pole, says which side of the band this is.
      float mz = dot( dir, uMagAxis );
      float pPole = gridAt( normalize( dir + uMagAxis * sign( mz ) * 0.0087 ) );
      s = mix( 1.0, DIFFUSE + ARC_GAIN * arcs( dir, p, pPole, peak ), foldK );
    } else if ( foldK > 0.0 ) {
      s = mix( 1.0, DIFFUSE, foldK );
    }
    vec3 green = mix( GREEN_EDGE, GREEN_557, smoothstep( EDGE_TO_CORE.x, EDGE_TO_CORE.y, e ) );
    vec3 col = GAINS.x * stepIntegral( P_GREEN, h0, hm, hb, segKm ) * green
             + GAINS.y * stepIntegral( P_RED, h0, hm, hb, segKm ) * RED_630
             + GAINS.z * stepIntegral( P_VIOLET, h0, hm, hb, segKm ) * VIOLET_428 * smoothstep( VIOLET_RANGE.x, VIOLET_RANGE.y, e );
    acc += col * e * s * night;
  }

  vec3 colour = acc / GREEN_COLUMN_KM * uGain;
  if ( max( colour.r, max( colour.g, colour.b ) ) < 1e-4 ) discard;
  gl_FragColor = vec4( colour, 1.0 );

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// --- the pure lines -------------------------------------------------------------------------------------

/**
 * The explore view's "Right now" line (spec 0053 req 5; the UI rebuild mounts it). Kp below
 * KP_STORM says nothing: a quiet oval is not news. At a storm it names how far from the poles the
 * forecast reaches when that is further than usual (the equatorward edge at EDGE_PERCENT, the
 * nearer of the two hemispheres to the equator), else the plain line.
 */
export function auroraRightNow(kp, summary) {
  const C = COPY.aurora;
  if (!Number.isFinite(kp) || kp < KP_STORM) return null;
  const edges = summary ? [summary.north && summary.north.edgeLat, summary.south && summary.south.edgeLat].filter(Number.isFinite) : [];
  const reach = edges.length ? Math.min(...edges.map(Math.abs)) : null;
  // NOAA publishes Kp in thirds (5.33, 6.67); one decimal, and none on a whole number.
  const k = Math.round(kp * 10) / 10;
  const kpText = Number.isInteger(k) ? fmt.int(k) : fmt.num(k, 1);
  if (reach !== null && reach <= 55) return t(C.rightNowReach, { kp: kpText, lat: reach });
  return t(C.rightNow, { kp: kpText });
}

/** Pure, for the test: the sentence the Earth card prints about its aurora. */
export function auroraLine(s, clockMs, wallMs) {
  const C = COPY.aurora;
  if (!s) return C.waiting;
  if (s.phase === 'off') return C.saveData;
  if (s.on === false) return C.switchedOff;
  if (!Number.isFinite(s.forecastMs)) return s.phase === 'failed' ? C.failed : C.waiting;
  const mode = auroraMode({ forecastMs: s.forecastMs, clockMs });
  if (mode !== 'live') return C.far;
  const time = new Date(s.forecastMs).toISOString().slice(11, 16);
  const made = Number.isFinite(s.observationMs) ? s.observationMs : s.forecastMs;
  const ago = Number.isFinite(wallMs) ? ageInWords(Math.max(0, wallMs - made)) : '';
  return t(s.folds ? C.live : C.liveNoFolds, { time, ago });
}

// --- the layer ----------------------------------------------------------------------------------------

const wallNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Main-thread stand-in for scene/auroraworker.js, for a browser without module workers. */
function mainThreadLooker(fetchImpl) {
  return {
    async look(url) {
      const res = await fetchImpl(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'origin' });
      if (!res.ok) throw new Error('NOAA answered HTTP ' + res.status);
      const text = await res.text();
      const out = parseOvation(text);
      return { ...out, tex: upsampleGrid(out.grid), chars: text.length };
    },
    kind: 'main-thread',
  };
}

function workerLooker() {
  const worker = new Worker(new URL('./auroraworker.js', import.meta.url), { type: 'module' });
  let seq = 0;
  const waiting = new Map();
  worker.onmessage = (e) => {
    const m = e.data || {};
    const w = waiting.get(m.seq);
    if (!w) return;
    waiting.delete(m.seq);
    if (m.type === 'error') w.reject(Object.assign(new Error(m.message), { status: m.status }));
    else w.resolve(m);
  };
  worker.onerror = (e) => {
    for (const w of waiting.values()) w.reject(new Error((e && e.message) || 'aurora worker failed'));
    waiting.clear();
  };
  return {
    look: (url) => new Promise((resolve, reject) => {
      const s = ++seq;
      waiting.set(s, { resolve, reject });
      worker.postMessage({ type: 'look', seq: s, url });
    }),
    kind: 'worker',
  };
}

/**
 * The lowest latitude (degrees, >= 0) where the grid has anything the shell would draw, less a
 * margin for the bilinear filter; the shader discards any ray that never gets that far from the
 * equator. 90 when the grid is empty. Strictly above the emission floor: OVATION's answer carries
 * a thin band of 1-3 % along the equator (row 0 and -1, every longitude, on 2026-09-30), which the
 * shell draws as nothing and which must not switch the early discard off for the whole disc.
 */
export function reachLatDeg(grid) {
  const floor = percentToByte(EMISSION.floor * 100) + 1;
  let reach = 90;
  for (let row = 0; row < GRID_H; row++) {
    const lat = Math.abs(row - 90);
    if (lat >= reach) continue;
    for (let col = 0; col < GRID_W; col++) {
      if (grid[row * GRID_W + col] >= floor) { reach = lat; break; }
    }
  }
  return Math.max(0, reach - 2);
}

export function createAurora({
  earth, renderer = null, camera = null, scene = null, now = () => Date.now(), fetchImpl = (u, o) => fetch(u, o),
  saveData = false, onChange = () => {},
} = {}) {
  const st = {
    phase: saveData ? 'off' : 'waiting',   // waiting | looking | live | failed | off
    reason: saveData ? 'saveData' : null,
    observationMs: null,
    forecastMs: null,
    summary: null,
    lookedAt: null,
    looks: 0,
    failures: 0,
    lastError: null,
    chars: 0,
    lastLookMs: null,
    looker: null,
    skipped: null,
    scheduledAt: null,
  };
  const earthMesh = () => (typeof earth === 'function' ? earth() : earth);
  let looker = null;
  let timer = 0;
  let busy = false;
  let started = false;
  let mesh = null;
  let tex = null;
  let grid = null;       // what the texture shows now
  let fadeFrom = null;   // {from: Uint8Array, to: Uint8Array, at}
  let shown = 0;         // the on/off fade, 0..1
  let lastTick = null;
  let drawing = { on: true, folds: false, steps: 0, visible: false, mode: 'none', latched: false };
  const probe = { ignoreLatch: false, frozenTime: null };
  const tier = { value: 1 };

  function build(parent) {
    tex = new THREE.DataTexture(new Uint8Array(TEX_W * TEX_H), TEX_W, TEX_H, THREE.RedFormat, THREE.UnsignedByteType);
    tex.unpackAlignment = 1;                // 720 bytes a row today, but a row is not promised to be a multiple of 4
    tex.wrapS = THREE.RepeatWrapping;       // the antimeridian is a seam in the grid, not on the globe
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;     // no mipmaps: 260 kB, and the shell never minifies it much
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.NoColorSpace;    // a probability, not a colour
    tex.needsUpdate = true;
    const outer = 1 + AURORA_TOP_KM / WGS84_A_KM;
    const geo = new THREE.SphereGeometry(outer, 64, 32);
    // Positions only: the shader needs nothing else, and a normal and a uv per vertex would be
    // two-thirds of the geometry's memory for nothing.
    geo.deleteAttribute('normal');
    geo.deleteAttribute('uv');
    const earthU = parent.material && parent.material.uniforms;
    const mag = dipoleAxisLocal();
    const material = new THREE.ShaderMaterial({
      name: 'earth-aurora',
      vertexShader: AURORA_VERT,
      fragmentShader: AURORA_FRAG,
      uniforms: {
        uGrid: { value: tex },
        uCamLocal: { value: new THREE.Vector3(0, 0, 10) },
        // The Earth's own vector, shared by reference: updateEarth() writes it every frame.
        uSunDirLocal: earthU && earthU.uSunDirLocal ? earthU.uSunDirLocal : { value: new THREE.Vector3(1, 0, 0) },
        uMagAxis: { value: new THREE.Vector3(mag[0], mag[1], mag[2]) },
        uOuter: { value: outer },
        uGain: { value: 0 },
        uSteps: { value: TIER_STEPS[1].maxSteps },
        uStepKm: { value: TIER_STEPS[1].stepKm },
        uFolds: { value: 1 },
        uTime: { value: 0 },
        uMinSinLat: { value: 1 },
        uPeak: { value: new THREE.Vector2(0.1, 0.1) },
      },
      side: THREE.FrontSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const m = new THREE.Mesh(geo, material);
    m.name = 'earth-aurora';
    // After the Earth (0) and its air (1): additive either way, but a fixed order keeps the frame
    // the same from one run to the next.
    m.renderOrder = 2;
    m.frustumCulled = false;
    m.visible = false;
    m.userData.kind = 'aurora';
    m.userData.cls = 'measured';
    const camLocal = new THREE.Vector3();
    m.onBeforeRender = (_r, _s, cam) => {
      // The camera in the Earth's axes: the same inverse the Earth's own uniforms go through.
      cam.getWorldPosition(camLocal);
      parent.worldToLocal(camLocal);
      material.uniforms.uCamLocal.value.copy(camLocal);
      // The near face from outside the shell, the far face from inside it (#342's rule for the air).
      const side = camLocal.length() < outer ? THREE.BackSide : THREE.FrontSide;
      if (material.side !== side) material.side = side;
    };
    parent.add(m);
    parent.userData.aurora = m;
    // Compile off the frame where the browser can (KHR_parallel_shader_compile): the first draw of
    // a new program is otherwise a stall of tens of milliseconds on a phone.
    if (renderer && camera && typeof renderer.compileAsync === 'function') {
      m.visible = true;
      renderer.compileAsync(m, camera, scene || undefined).catch(() => {}).finally(() => { m.userData.compiled = true; });
      // A program that fails to link never resolves compileAsync on some drivers; three then logs
      // the shader error, and drawing it is how that error reaches the console a probe reads.
      setTimeout(() => { m.userData.compiled = true; }, 3000);
      m.visible = false;
    } else {
      m.userData.compiled = true;
    }
    return m;
  }

  function accept(out) {
    const parent = earthMesh();
    if (!parent) return;
    if (!mesh) mesh = build(parent);
    const raw = out.grid instanceof Uint8Array ? out.grid : new Uint8Array(out.grid);
    const next = out.tex instanceof Uint8Array ? out.tex : upsampleGrid(raw);
    if (!grid) {
      grid = next;
      tex.image.data.set(next);
      tex.needsUpdate = true;
    } else {
      // A new forecast blends in over CROSSFADE_MS on the CPU: 65 kB a tenth of a second, and not
      // one extra texture fetch in the shader.
      fadeFrom = { from: tex.image.data.slice(), to: next, at: wallNow(), lastWrite: 0 };
      grid = next;
    }
    mesh.material.uniforms.uMinSinLat.value = Math.sin((reachLatDeg(raw) * Math.PI) / 180);
    // The arcs are contours at fractions of each hemisphere's peak (FOLDS.levels); never below 5 %,
    // so an empty hemisphere does not draw contours of its noise floor.
    const sm = out.summary || {};
    mesh.material.uniforms.uPeak.value.set(
      Math.max(0.05, ((sm.north && sm.north.peak) || 0) / 100),
      Math.max(0.05, ((sm.south && sm.south.peak) || 0) / 100),
    );
    st.observationMs = out.observationMs;
    st.forecastMs = out.forecastMs;
    st.summary = out.summary;
  }

  async function look() {
    if (!mayLook({ saveData, hidden: typeof document !== 'undefined' && document.hidden, busy })) {
      st.skipped = saveData ? 'saveData' : busy ? 'busy' : 'hidden';
      return null;
    }
    st.skipped = null;
    busy = true;
    const t0 = wallNow();
    if (!looker) {
      try {
        looker = typeof Worker === 'function' ? workerLooker() : mainThreadLooker(fetchImpl);
      } catch {
        looker = mainThreadLooker(fetchImpl);
      }
      st.looker = looker.kind;
    }
    if (st.phase !== 'live') st.phase = 'looking';
    let ok = false;
    try {
      let out;
      try {
        out = await looker.look(OVATION_URL);
      } catch (err) {
        // A module worker a browser cannot start fails here, not at construction; an HTTP error is
        // NOAA's answer and is not retried on another thread.
        if (looker.kind !== 'worker' || (err && err.status)) throw err;
        looker = mainThreadLooker(fetchImpl);
        st.looker = looker.kind;
        out = await looker.look(OVATION_URL);
      }
      accept(out);
      st.looks++;
      st.chars = out.chars || 0;
      st.lastError = null;
      ok = true;
    } catch (err) {
      st.lastError = String((err && err.message) || err);
    }
    st.failures = ok ? 0 : st.failures + 1;
    st.lookedAt = now();
    st.lastLookMs = Math.round(wallNow() - t0);
    st.phase = Number.isFinite(st.forecastMs) ? 'live' : 'failed';
    st.reason = st.phase === 'failed' ? 'unreachable' : null;
    busy = false;
    onChange(api.state());
    return ok;
  }

  function schedule(ms) {
    if (timer) clearTimeout(timer);
    st.scheduledAt = now() + ms;
    timer = setTimeout(() => {
      timer = 0;
      const go = () => look().then((ok) => {
        // A look skipped because the tab was hidden waits for the visibility handler, not a timer.
        if (ok === null && st.skipped === 'hidden') return;
        schedule(nextLookMs({ ok: ok !== false, failures: st.failures }));
      });
      // An idle moment, so the fetch and the upload do not land in a busy frame.
      if (typeof requestIdleCallback === 'function') requestIdleCallback(go, { timeout: 5000 });
      else go();
    }, ms);
  }

  function settleFade(wall) {
    if (!fadeFrom || !tex) return;
    const k = Math.min(1, (wall - fadeFrom.at) / CROSSFADE_MS);
    if (k < 1 && wall - fadeFrom.lastWrite < 100) return;
    fadeFrom.lastWrite = wall;
    const d = tex.image.data;
    const a = fadeFrom.from;
    const b = fadeFrom.to;
    for (let i = 0; i < d.length; i++) d[i] = a[i] + (b[i] - a[i]) * k;
    tex.needsUpdate = true;
    if (k >= 1) fadeFrom = null;
  }

  const api = {
    start() {
      if (started || saveData) return;
      started = true;
      schedule(START_DELAY_MS);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.hidden || busy) return;
          if (st.lookedAt === null || now() - st.lookedAt >= nextLookMs({ ok: st.failures === 0, failures: st.failures })) schedule(0);
        });
      }
    },
    /** Force a look now; for probes. */
    lookNow: () => look(),
    /** Draw a saved answer instead of NOAA's latest; for probes and the storm screenshots only. */
    showForecast(body) { accept(parseOvation(body)); st.phase = 'live'; st.reason = null; onChange(api.state()); },
    /** For probes: draw as an unlatched device would, and hold the folds at one moment. */
    probe(opts = {}) { Object.assign(probe, opts); return { ...probe }; },
    setTier(n) { tier.value = Math.max(0, Math.min(2, Number(n) || 0)); },
    /**
     * Once a frame, after the Earth's update. `on` is the layer's box, `latched` the frame latch,
     * `reducedMotion` the media query, `discShare` the Earth's disc as a share of half the view.
     */
    tick(clockMs, { on = true, latched = false, reducedMotion = false, discShare = 1 } = {}) {
      const wall = wallNow();
      const dt = lastTick === null ? 0 : Math.min(100, wall - lastTick);
      lastTick = wall;
      const mode = auroraMode({ forecastMs: st.forecastMs, clockMs });
      if (mode !== drawing.mode || on !== drawing.on) { drawing.mode = mode; drawing.on = on; onChange(api.state()); }
      if (!mesh) return;
      settleFade(wall);
      const want = on && mode === 'live' ? 1 : 0;
      shown = want > shown ? Math.min(want, shown + dt / FADE_MS) : Math.max(want, shown - dt / FADE_MS);
      const big = discShare >= MIN_DISC_SHARE;
      const visible = shown > 0 && big && mesh.userData.compiled === true;
      mesh.visible = visible;
      drawing.visible = visible;
      const cheapLatch = latched && !probe.ignoreLatch;
      const cheap = cheapLatch || tier.value <= 0;
      const cfg = cheap ? TIER_STEPS[0] : TIER_STEPS[Math.min(2, tier.value)];
      const u = mesh.material.uniforms;
      u.uSteps.value = cfg.maxSteps;
      u.uStepKm.value = cfg.stepKm;
      u.uFolds.value = cfg.folds ? 1 : 0;
      drawing.folds = cfg.folds;
      drawing.steps = cfg.maxSteps;
      drawing.latched = !!latched;
      // Wall time for the folds, not app time: they are decoration, and a clock scrubbed at 1000x
      // must not whip them round the oval. Held still under reduced motion and the latch.
      if (probe.frozenTime !== null) u.uTime.value = probe.frozenTime;
      else if (!reducedMotion && !cheapLatch && cfg.folds) u.uTime.value = (wall / 1000) % 100000;
      u.uGain.value = AURORA_GAIN * shown;
    },
    state() {
      return {
        phase: st.phase,
        reason: st.reason,
        on: drawing.on,
        mode: drawing.mode,
        visible: drawing.visible,
        folds: drawing.folds,
        steps: drawing.steps,
        observationMs: st.observationMs,
        forecastMs: st.forecastMs,
        summary: st.summary,
        looks: st.looks,
        failures: st.failures,
        lastError: st.lastError,
        chars: st.chars,
        lastLookMs: st.lastLookMs,
        looker: st.looker,
        skipped: st.skipped,
        scheduledAt: st.scheduledAt,
        gpuBytes: mesh ? TEX_W * TEX_H + mesh.geometry.attributes.position.array.byteLength + (mesh.geometry.index ? mesh.geometry.index.array.byteLength : 0) : 0,
      };
    },
    line(clockMs) {
      return auroraLine(api.state(), clockMs, now());
    },
    credit() {
      return [COPY.aurora.credit];
    },
    peak() {
      return st.summary ? st.summary.peak : (st.phase === 'off' || st.phase === 'failed' ? 0 : undefined);
    },
  };
  return api;
}

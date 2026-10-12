// scene/sun.js -- the Sun as a star, when the camera is close to it (spec 0055 task 3, public #412).
//
// Contract: createSunDetail({ mesh, camera, sprite?, tier? }) ->
//             { update(tMs, share, earthWorld, { still, look }?), setRegions(list), setFlares(list), setCmes(list),
//               activity(), latch(), state(), dispose() }
//           UNDER_MEASURED   what each generated part does under the Measured look (scene/exposure.js)
//
// OFF THE FIRST VISIT. From the Earth, where every visit starts, the Sun is a quarter of a degree
// across: a few pixels, drawn by scene/worlds.js as a flat disc of its map with a round glow. main.js
// imports this file the first time the Sun's disc is SUN_DETAIL_AT of half the view tall, and then
// the Sun's own mesh wears the material below and a corona drawn in the plane of the sky. Under the
// frame latch everything here is taken off again and the disc and the glow are what they were.
//
// WHAT IS DRAWN, AND WHAT KIND OF CLAIM EACH PART IS:
//
//   LIMB DARKENING -- modelled. The Sun's edge is darker and redder than its middle because a line
//   of sight that grazes the limb stops higher in the atmosphere, where the gas is cooler. For a
//   grey atmosphere in radiative equilibrium (Eddington's approximation) the temperature at optical
//   depth tau is T^4 = (3/4) Teff^4 (tau + 2/3), and the light that leaves at an angle whose cosine
//   is mu comes from tau = mu (the Eddington-Barbier relation). So each colour's brightness at mu,
//   over its brightness at the centre, is Planck's law at T(mu) over Planck's law at T(1): three
//   exponentials, no table. Teff is the IAU's nominal 5 772 K (2015 Resolution B3). CHECKED AGAINST
//   A MEASUREMENT: at 550 nm the Sun's limb darkening is I(mu) / I(1) = 0.30 + 0.93 mu - 0.23 mu^2
//   (Cox, ed., Allen's Astrophysical Quantities, 2000, as quoted by en.wikipedia.org/wiki/Limb_darkening,
//   read 2026-10-06); the model's green channel stays within 0.05 of that from the centre to the
//   limb (tests/test_sun.mjs), 0.33 against 0.30 at the very edge.
//
//   THE GRANULATION -- illustrative. Real granules are about a thousand kilometres across, 1/700 of
//   the radius: on a disc 900 pixels tall they are less than a pixel, and each lives some ten
//   minutes. What is drawn is a cellular pattern GRAIN_CELLS across the radius (cells of some
//   17 000 km, seventeen times too big), and each cell has a life of its own, GRAIN_LIFE_S seconds of
//   the app's clock (some fifteen times too fast): it is born small and dim, grows and brightens,
//   then shrinks and darkens into the lanes round it, and a new one is born somewhere else in its
//   patch. While it lives it drifts outward from the middle of a larger cell, SUPER_CELLS across the
//   radius, toward that cell's border, as granules ride the supergranular flow. The larger cells
//   are a smooth lattice, not today's supergranules. Scale, speed, contrast and drift are chosen.
//   One octave at every tier that draws it; not drawn at tier 0.
//
//   FACULAE -- illustrative. Near the limb the lanes along the larger cells' borders, and round each
//   drawn sunspot group, are drawn brighter than the granules instead of darker: the bright network
//   a white-light photograph shows toward the edge. Where the borders are is the same chosen lattice.
//
//   SUNSPOTS -- measured places and sizes, one drawn spot per group. data/sunregions.js: NOAA's
//   list of today's numbered groups, each at its reported latitude and distance from the central
//   meridian, carried round by the Sun's turning since, and as big as its reported area. A group is
//   many spots; one round umbra in a penumbra stands in for it, and how dark they are (UMBRA,
//   PENUMBRA) is chosen to look like a white-light photograph.
//
//   THE CORONA -- illustrative. The real corona is a millionth as bright as the disc and is seen
//   only in an eclipse or a coronagraph. It is drawn so it can be seen at all: a pearly light that
//   falls off steeply from the limb, reaching farther in a few streamers near the equator and
//   thinning over the poles into fine rays, in the plane of the sky. Where the streamers are is a
//   pattern seeded by the Carrington rotation number, not today's corona. It breathes: a faint wave
//   of brightness moves outward along each streamer once in CORONA_BREATH_S / 2 seconds and the
//   streamers lean by a quarter of a degree. Chosen to be slow and small; nothing here is a flame.
//
//   PROMINENCES -- measured places, illustrative shapes. At each of NOAA's numbered regions that is
//   within 15 degrees of the limb the camera sees (data/sunactivity.js limbOffsetDeg), one small
//   upright sheet anchored at the region and turned about its own vertical toward the camera: three
//   nested loops or a ragged hedgerow, hydrogen-alpha red going white where it is densest, 0.02 to
//   0.15 radii tall by the region's area. The Sun's own sphere hides what is behind the limb. A
//   region with a flare of class M or X in its decay stands taller, to 0.4 radii: the trigger is
//   measured, the shape and height are not. Nobody publishes where today's prominences are; these
//   say "this region is active" and no more. At most 8 at once, 2 at tier 0.
//
//   FLARES -- measured time, class, region and decay; illustrative brightness. data/sunactivity.js:
//   NOAA's edited event list. At the clock's time a flare of class C or above that is rising or
//   within six of its own half-lives of its peak is a white kernel at its region's place (and, at M
//   or X, lifts that region's prominence). Real flares of class C are not visible in white light;
//   the kernel is drawn so the event can be seen. A flare whose region is not on today's list is
//   not drawn. With no list nothing is drawn: no flare is ever invented.
//
//   CORONAL MASS EJECTIONS -- measured start, direction, width and speed; a modelled flight; an
//   illustrative look. data/sunactivity.js: NASA DONKI's analyses, read from our saved copy only.
//   For the hours after its start a CME of 500 km/s or faster is a thin shell about the Sun, kept to
//   the cone of the reported half-angle about the reported direction, moving out at the reported
//   speed held constant and fading by 10 radii; it is drawn in the plane of the sky, as the corona
//   is, so thrown sideways it is an arc and thrown at the camera a faint round haze. With no saved
//   copy none is drawn.
//
// NO BLOOM, NO PASS (tests/test_contract.mjs): every light here is an additive, soft-edged material
// of its own. REDUCED MOTION (`still`): the clock's own events (a flare's fading, a CME's flight)
// still follow the clock, and nothing else moves: one fixed phase of the grain, the loops and the
// corona. UNDER THE FRAME LATCH everything here is taken off.
//
// UNDER THE MEASURED LOOK (`look: 'measured'`, UNDER_MEASURED below): the generated grain and the
// faculae drawn along it are off, and the corona and the prominences are held still as under reduced
// motion; the limb darkening, the spots, the flares and the CMEs are as in Film.
//
// The card says so (copy/en.js drawing.worldSun; the spots' line and copy/en.later.js sunAlive when a list is drawn).

import * as THREE from '../../vendor/three.module.min.js';
import { MAX_SPOTS, spotDirection, spotRadiusRad, splitRegion, regionsFresh, CARRINGTON_SYNODIC_DAYS } from '../data/sunregions.js';
import { drawnUnder, stillUnder } from './exposure.js';
import { MAX_FLARES, MAX_CMES, PROM_CAP, FLARE_ERUPTIVE_FLUX, CME_REACH_RADII, flaresAt, cmesAt, limbOffsetDeg, prominenceFade, prominenceShape } from '../data/sunactivity.js';

/**
 * What each part that is generated here does under the Measured look (scene/exposure.js MEASURED_RULES;
 * tests/test_look_setting.mjs holds that a module with noise in its shaders says). The grain and its
 * faculae are a pattern of ours seventeen times too big; the corona's and the prominences' places and
 * sizes stand for something real, their motion does not.
 */
export const UNDER_MEASURED = { grain: 'hidden', faculae: 'hidden', corona: 'still', prominences: 'still' };

/** The IAU's nominal solar effective temperature, kelvin (2015 Resolution B3). */
export const T_EFF = 5772;
/** The wavelengths the three channels stand for, nm. */
export const CHANNEL_NM = [610, 550, 465];
/** hc / k in nm K: Planck's exponent is this over (wavelength x temperature). */
export const HC_OVER_K = 1.438777e7;
/** The measured law at 550 nm, I(mu) / I(1) = a0 + a1 mu + a2 mu^2 (the block above). */
export const LIMB_550 = [0.30, 0.93, -0.23];
/** The Sun's disc, as a share of half the view's height, at which main.js fetches this module. */
export const SUN_DETAIL_AT = 0.06;
/** The grain's cells across one radius, and one cell's life in app seconds (illustrative). */
export const GRAIN_CELLS = 40;
export const GRAIN_CONTRAST = 0.2;
export const GRAIN_LIFE_S = 45;
/** The shader's clock counts lives and wraps here; a cell's seed is its birth number modulo this, so the wrap is seamless. */
export const GRAIN_WRAP = 64;
/** A cell that is not at the height of its life is pushed back by this much (squared lattice units), so its neighbours take its ground. */
export const GRAIN_YIELD = 1.5;
/** The larger cells across one radius, and how far a granule drifts over its life, in its own cell widths (illustrative). */
export const SUPER_CELLS = 8;
export const GRAIN_DRIFT = 0.5;
/** The mean of the shade the grain multiplies by, measured by tests/test_sun.mjs: taken off so the disc's brightness holds. */
export const GRAIN_MEAN = 0.42;
/** How much brighter than the photosphere a facula is drawn at its strongest (illustrative). */
export const FACULA_GAIN = 0.3;
/** One sway of a prominence, and one breath of the corona, in app seconds (illustrative). */
export const PROM_SWAY_S = 24;
export const CORONA_BREATH_S = 60;
/** Prominences fade in between these disc shares: below, the tallest is a pixel or two. */
export const PROM_FROM = 0.1;
export const PROM_FULL = 0.3;
/** Peak brightness of a prominence and of a CME's front, against the disc's 1 (illustrative). */
export const PROM_GAIN = 0.9;
export const CME_GAIN = 0.35;
/** The phases everything holds under reduced motion: a still picture of the same Sun. */
export const STILL = { grain: 0.37, sway: 0.2, breath: 0.6 };
/** The grain fades in between these disc shares: below, a cell is under two pixels. */
export const GRAIN_FROM = 0.25;
export const GRAIN_FULL = 0.8;
/** A spot's brightness, as a share of the photosphere round it (illustrative). */
export const UMBRA = 0.22;
export const PENUMBRA = 0.72;
/** The umbra's share of a group's drawn radius. */
export const UMBRA_SHARE = 0.45;
/** The corona's plane, in Sun radii from the centre to its edge, and its brightness at the limb. */
export const CORONA_RADII = 7;
export const CORONA_GAIN = 0.9;

/** The grey atmosphere's temperature where a ray leaving at cosine `mu` comes from. */
export function limbTemperature(mu) {
  return T_EFF * Math.pow(0.75 * (Math.max(0, Math.min(1, mu)) + 2 / 3), 0.25);
}

/** Planck's law at one wavelength, without its constant: 1 / (exp(hc / (lambda k T)) - 1). */
function planck(nm, T) { return 1 / (Math.exp(HC_OVER_K / (nm * T)) - 1); }

/** The model: brightness at `mu` over brightness at the centre, at `nm`. Twin of the GLSL `limb`. */
export function modelLimb(mu, nm) {
  return planck(nm, limbTemperature(mu)) / planck(nm, limbTemperature(1));
}

/** The measurement at 550 nm. */
export function measuredLimb550(mu) {
  const m = Math.max(0, Math.min(1, mu));
  return LIMB_550[0] + LIMB_550[1] * m + LIMB_550[2] * m * m;
}

/** The Carrington rotation number at a time, near enough (rotation 1 began on 1853-11-09): it only seeds the corona's pattern. */
export function carringtonNumber(tMs) {
  return Math.floor((tMs / 86400000 + 2440587.5 - 2398167.4) / CARRINGTON_SYNODIC_DAYS) + 1;
}

export const SUN_VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vPosL;
void main() {
  vUv = uv;
  vPosL = position;
  vec4 worldPos = modelMatrix * vec4( position, 1.0 );
  vPosW = worldPos.xyz;
  vNormalW = normalize( mat3( modelMatrix ) * normal );
  gl_Position = projectionMatrix * viewMatrix * worldPos;
  #include <logdepthbuf_vertex>
}
`;

/** Neighbour offsets of the cellular grain: all 27 cells (tier 2), or 8 on the point's near side (tiers 0 and 1). */
const CELLS_LOOP_FULL = `  for ( int z = -1; z <= 1; z++ ) for ( int y = -1; y <= 1; y++ ) for ( int x = -1; x <= 1; x++ ) {
    vec3 g = vec3( float( x ), float( y ), float( z ) );`;
const CELLS_LOOP_NEAR = `  vec3 s = 2.0 * step( vec3( 0.5 ), f ) - 1.0;   // toward the nearer face, per axis
  for ( int z = 0; z <= 1; z++ ) for ( int y = 0; y <= 1; y++ ) for ( int x = 0; x <= 1; x++ ) {
    vec3 g = vec3( float( x ), float( y ), float( z ) ) * s;`;

function cellsGlsl( cheap ) {
  return `// Cellular noise whose cells live and die. Each lattice cell holds one granule: born at 't' whole plus
// its own offset, at the height of its life midway, gone at the next whole. Its point is
// pushed away by GRAIN_YIELD x (1 - w)^2 while its weight w is low, so a young or an old granule owns
// little ground and its neighbours close over it; when it is reborn (somewhere else in its own lattice cell,
// seeded by its birth number) it owns none, so nothing jumps. 'flow' carries the point across its
// lattice cell over the life: the drift out of a larger cell.
// x: the gap between the nearest and the second nearest, small on the dark lanes. y: the nearest one's weight.
// ${cheap ? 'Tiers 0 and 1 read the 8 cells on the near side of the point, not all 27: same lattice, same hash.' : 'Tier 2 reads all 27 neighbouring cells.'}
vec2 cells( vec3 p, float t, vec3 flow ) {
  vec3 i = floor( p );
  vec3 f = fract( p );
  float d1 = 8.0;
  float d2 = 8.0;
  float w1 = 0.0;
${cheap ? CELLS_LOOP_NEAR : CELLS_LOOP_FULL}
    vec3 h = hash3( i + g );
    float age = h.x + t;
    float born = floor( age );
    float ph = age - born;
    vec3 o = 0.5 + 0.38 * ( 2.0 * hash3( i + g + mod( born, ${GRAIN_WRAP.toFixed(1)} ) * vec3( 0.37, 0.61, 0.83 ) ) - 1.0 ) + flow * ( ph - 0.5 );
    float w = sin( 3.14159265 * ph );
    vec3 r = g + o - f;
    float d = dot( r, r ) + ${GRAIN_YIELD.toFixed(2)} * ( 1.0 - w ) * ( 1.0 - w );
    if ( d < d1 ) { d2 = d1; d1 = d; w1 = w * ( 0.7 + 0.3 * h.y ); } else if ( d < d2 ) { d2 = d; }
  }
  return vec2( sqrt( d2 ) - sqrt( d1 ), w1 );
}`;
}

/** The larger cells' flow at a point of the unit sphere: zero at a cell's middle, outward, zero again on its border. Twin of the GLSL. */
export function superFlow(p) {
  const q = [0, 1, 2].map((k) => p[k] * SUPER_CELLS + 0.8 * Math.sin(p[(k + 1) % 3] * SUPER_CELLS * 0.9));
  return { q, flow: q.map((v) => Math.sin(6.2831853 * v)) };
}

/**
 * The JS twin of the shader's \`cells\` (same hash, same lives, same distances), in doubles, so a node
 * test can measure what reading 8 cells instead of 27 changes, and watch one cell live and die.
 * @param {number[]} p  a point on the lattice (the unit-sphere point times GRAIN_CELLS)
 * @param {number} t    lives elapsed, 0..GRAIN_WRAP
 * @param {boolean} near  tiers 0 and 1
 * @param {number[]} [flow]  the drift over one life, lattice units
 * @returns {number[]} [gap, weight]
 */
export function cellsTwin(p, t, near, flow = [0, 0, 0]) {
  const fract = (x) => x - Math.floor(x);
  const hash = (a, b, c) => {
    const x = a * 127.1 + b * 311.7 + c * 74.7, y = a * 269.5 + b * 183.3 + c * 246.1, z = a * 113.5 + b * 271.9 + c * 124.6;
    return [fract(Math.sin(x) * 43758.5453123), fract(Math.sin(y) * 43758.5453123), fract(Math.sin(z) * 43758.5453123)];
  };
  const i = [Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2])];
  const f = [p[0] - i[0], p[1] - i[1], p[2] - i[2]];
  const s = f.map((v) => (near ? (v < 0.5 ? -1 : 1) : 1));
  let d1 = 8, d2 = 8, w1 = 0;
  const lo = near ? 0 : -1;
  for (let z = lo; z <= 1; z++) for (let y = lo; y <= 1; y++) for (let x = lo; x <= 1; x++) {
    const g = near ? [x * s[0], y * s[1], z * s[2]] : [x, y, z];
    const id = [i[0] + g[0], i[1] + g[1], i[2] + g[2]];
    const h = hash(id[0], id[1], id[2]);
    const age = h[0] + t;
    const born = Math.floor(age);
    const ph = age - born;
    const m = born % GRAIN_WRAP;
    const j = hash(id[0] + m * 0.37, id[1] + m * 0.61, id[2] + m * 0.83);
    const w = Math.sin(Math.PI * ph);
    const r = [0, 1, 2].map((k) => g[k] + 0.5 + 0.38 * (2 * j[k] - 1) + flow[k] * (ph - 0.5) - f[k]);
    const d = r[0] * r[0] + r[1] * r[1] + r[2] * r[2] + GRAIN_YIELD * (1 - w) * (1 - w);
    if (d < d1) { d2 = d1; d1 = d; w1 = w * (0.7 + 0.3 * h[1]); } else if (d < d2) { d2 = d; }
  }
  return [Math.sqrt(d2) - Math.sqrt(d1), w1];
}

/** The shade the grain multiplies the photosphere by, 0 in a lane to 1 in a granule at the height of its life. Twin of the GLSL. */
export function grainShade(gap, weight) {
  const x = Math.min(1, Math.max(0, gap / 0.35));
  return x * x * (3 - 2 * x) * (0.35 + 0.65 * weight);
}

function sunFragment( cheap ) {
  return `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uMap;
uniform float uHasMap;
uniform vec3 uTint;
uniform float uTime;        // granule lives elapsed (app seconds / GRAIN_LIFE_S), wrapped at GRAIN_WRAP
uniform float uGrain;       // 0 far away and at tier 0, 1 close
uniform vec4 uSpots[ ${MAX_SPOTS} ];   // xyz: the group's place on the unit sphere, body-fixed; w: its radius, radians
uniform int uSpotCount;
uniform vec4 uFlares[ ${MAX_FLARES} ]; // xyz: the flaring region's place; w: the flare's brightness now
uniform int uFlareCount;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vPosL;

const float T_EFF = ${T_EFF.toFixed(1)};
const float HC_OVER_K = ${HC_OVER_K.toExponential(6)};
float planck( float nm, float T ) { return 1.0 / ( exp( HC_OVER_K / ( nm * T ) ) - 1.0 ); }
// Limb darkening of a grey atmosphere, per colour (the JS twin is modelLimb in scene/sun.js).
vec3 limb( float mu ) {
  float T  = T_EFF * pow( 0.75 * ( mu + 2.0 / 3.0 ), 0.25 );
  float T1 = T_EFF * pow( 0.75 * ( 1.0 + 2.0 / 3.0 ), 0.25 );
  return vec3( planck( ${CHANNEL_NM[0].toFixed(1)}, T ) / planck( ${CHANNEL_NM[0].toFixed(1)}, T1 ),
               planck( ${CHANNEL_NM[1].toFixed(1)}, T ) / planck( ${CHANNEL_NM[1].toFixed(1)}, T1 ),
               planck( ${CHANNEL_NM[2].toFixed(1)}, T ) / planck( ${CHANNEL_NM[2].toFixed(1)}, T1 ) );
}

vec3 hash3( vec3 p ) {
  p = vec3( dot( p, vec3( 127.1, 311.7, 74.7 ) ), dot( p, vec3( 269.5, 183.3, 246.1 ) ), dot( p, vec3( 113.5, 271.9, 124.6 ) ) );
  return fract( sin( p ) * 43758.5453123 );
}
${cellsGlsl(cheap)}

void main() {
  #include <logdepthbuf_fragment>
  vec3 n = normalize( vNormalW );
  float mu = clamp( dot( n, normalize( cameraPosition - vPosW ) ), 0.0, 1.0 );
  vec3 colour = mix( uTint, texture2D( uMap, vUv ).rgb, uHasMap ) * limb( mu );

  vec3 p = normalize( vPosL );
  float lanes = 0.5;
  float network = 0.0;
  if ( uGrain > 0.0 ) {
    // The larger cells: q is whole at a cell's middle and midway between two wholes at its border.
    vec3 q = p * ${SUPER_CELLS.toFixed(1)} + 0.8 * sin( p.yzx * ${(SUPER_CELLS * 0.9).toFixed(1)} );   // bent, so the borders are not a grid
    vec2 c = cells( p * ${GRAIN_CELLS.toFixed(1)}, uTime, ${GRAIN_DRIFT.toFixed(2)} * sin( 6.2831853 * q ) );
    lanes = smoothstep( 0.0, 0.35, c.x ) * ( 0.35 + 0.65 * c.y );
    // Foreshortened into the limb the cells run together, as they do in a photograph.
    colour *= 1.0 + ${GRAIN_CONTRAST.toFixed(2)} * uGrain * ( lanes - ${GRAIN_MEAN.toFixed(2)} ) * smoothstep( 0.05, 0.45, mu );
    vec3 k = -cos( 6.2831853 * q );
    network = smoothstep( 0.9, 0.99, max( k.x, max( k.y, k.z ) ) ) * smoothstep( 0.35, 0.75, c.y );   // a thin border, in patches
  }

  float plage = 0.0;
  for ( int i = 0; i < ${MAX_SPOTS}; i++ ) {
    if ( i >= uSpotCount ) break;
    float a = acos( clamp( dot( p, uSpots[ i ].xyz ), -1.0, 1.0 ) );
    float r = uSpots[ i ].w * ( 1.0 + 0.12 * ( lanes - 0.5 ) * uGrain );   // a ragged edge where the grain is drawn
    float pen = 1.0 - smoothstep( r * 0.85, r, a );
    float umb = 1.0 - smoothstep( r * ${(UMBRA_SHARE * 0.8).toFixed(3)}, r * ${UMBRA_SHARE.toFixed(3)}, a );
    colour *= mix( 1.0, ${PENUMBRA.toFixed(2)}, pen ) * mix( 1.0, ${(UMBRA / PENUMBRA).toFixed(4)}, umb );
    plage = max( plage, ( 1.0 - smoothstep( r * 1.2, r * 3.2, a ) ) * ( 1.0 - pen ) );
  }

  // Faculae: toward the limb the lanes of the network, and round a group, are bright, not dark.
  float towardLimb = ( 1.0 - smoothstep( 0.4, 0.72, mu ) ) * smoothstep( 0.03, 0.15, mu );
  colour *= 1.0 + ${FACULA_GAIN.toFixed(2)} * uGrain * towardLimb * min( 1.0, network + plage ) * ( 1.0 - lanes ) * ( 1.0 - lanes );

  // Flares: a white kernel and a wider glow at the region, as bright as the clock's time makes it.
  for ( int i = 0; i < ${MAX_FLARES}; i++ ) {
    if ( i >= uFlareCount ) break;
    float a = acos( clamp( dot( p, uFlares[ i ].xyz ), -1.0, 1.0 ) );
    float w = uFlares[ i ].w;
    float r = 0.018 + 0.022 * w;
    colour += vec3( 1.0, 0.96, 0.88 ) * w * ( 1.6 * exp( - a * a / ( r * r ) ) + 0.25 * exp( - a / ( r * 4.0 ) ) );
  }

  gl_FragColor = vec4( colour, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
}

/** The photosphere's fragment shader at tier 2: the full 27-cell grain. */
export const SUN_FRAG = sunFragment( false );
/** Tiers 0 and 1: the same shader with the 8-cell grain (internal #549: the grain cost 9.5 ms a frame at 1440 x 900 on an Iris Plus 640). */
export const SUN_FRAG_CHEAP = sunFragment( true );


export const CORONA_VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vP;
void main() {
  vP = position.xy;   // in Sun radii: the plane is a child of the Sun's unit sphere
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  #include <logdepthbuf_vertex>
}
`;

export const CORONA_FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uOpacity;
uniform float uNorth;   // the angle from the plane's +Y round to the Sun's north pole, as drawn
uniform float uSeed;
uniform float uTime;    // one breath of the corona, 0..1 (app seconds / CORONA_BREATH_S, wrapped)
varying vec2 vP;

float hash1( float n ) { return fract( sin( n * 91.3458 + uSeed * 7.13 ) * 47453.5453 ); }
// Smooth noise round a circle: 'cellsRound' steps in one turn, and it closes on itself.
float ring( float turn, float cellsRound ) {
  float x = turn * cellsRound;
  float i = floor( x );
  float f = fract( x );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix( hash1( mod( i, cellsRound ) + cellsRound * 3.0 ), hash1( mod( i + 1.0, cellsRound ) + cellsRound * 3.0 ), f );
}

void main() {
  #include <logdepthbuf_fragment>
  float r = length( vP );
  if ( r < 0.98 ) discard;   // the disc itself; the sphere covers it anyway
  float angle = atan( vP.x, vP.y ) - uNorth;         // 0 toward the Sun's north, as drawn
  // The streamers lean a quarter of a degree and back, more the farther out; whole breaths, so the wrap is seamless.
  float turn = fract( angle / 6.2831853 + 0.0007 * sin( 6.2831853 * ( uTime + 0.15 * r ) ) * smoothstep( 1.0, 3.0, r ) );
  float equator = abs( sin( angle ) );               // 1 over the equator's two limbs, 0 over the poles
  // Streamers: a few broad ones, kept to low latitudes, and a finer set that breaks their outline.
  float broad = ring( turn, 5.0 );
  float fine  = ring( turn, 13.0 );
  float reach = clamp( ( 0.15 + 0.85 * smoothstep( 0.25, 0.85, broad ) ) * mix( 0.2, 1.0, equator ) + 0.3 * ( fine - 0.5 ), 0.0, 1.0 );
  // Polar rays: thin, many, only where the streamers are not.
  float rays = 0.75 + 0.25 * ring( turn, 96.0 ) * ( 1.0 - equator );
  // Steep over a hole, shallow along a streamer; and thinned with distance so the far field is sky, not haze.
  float fall = pow( r, -mix( 6.0, 2.6, reach ) ) / ( 1.0 + 0.15 * r * r );
  float inner = pow( r, -16.0 );                     // the bright ring at the limb
  // It breathes: a faint wave of brightness moving outward, each streamer out of step with the next.
  fall *= 1.0 + 0.07 * sin( 6.2831853 * ( 0.45 * r - 2.0 * uTime + 1.3 * broad ) ) * smoothstep( 1.05, 1.6, r );
  float edge = 1.0 - smoothstep( ${(CORONA_RADII * 0.6).toFixed(2)}, ${CORONA_RADII.toFixed(2)}, r );
  float light = ( 0.45 * inner + 0.4 * fall * rays ) * edge * smoothstep( 0.98, 1.01, r );
  vec3 pearl = mix( vec3( 1.0, 0.93, 0.82 ), vec3( 0.86, 0.91, 1.0 ), smoothstep( 1.0, 2.5, r ) );
  gl_FragColor = vec4( pearl * light * ${CORONA_GAIN.toFixed(2)} * uOpacity, 1.0 );
  #include <colorspace_fragment>
}
`;

export const PROM_VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vQ;
void main() {
  vQ = vec2( position.x * 2.0, position.y + 0.5 );   // x: -1..1 across the sheet; y: 0 at the surface, 1 at its top
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  #include <logdepthbuf_vertex>
}
`;

/** A prominence: one upright sheet, three nested loops (uKind 0) or a hedgerow (uKind 1). Additive; soft on every edge. */
export const PROM_FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uOpacity;
uniform float uKind;
uniform float uSeed;
uniform float uTime;    // one sway, 0..1 (app seconds / PROM_SWAY_S, wrapped)
uniform float uHot;     // 0, or the brightness of the flare of class M or X now fading at this region
varying vec2 vQ;

float hash1( float n ) { return fract( sin( n * 127.1 + uSeed * 311.7 ) * 43758.5453 ); }
float wobble1( float x ) {
  float i = floor( x );
  float f = fract( x );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix( hash1( i ), hash1( i + 1.0 ), f );
}
// One arch: an ellipse 'a' wide and 'b' tall standing on the surface, soft over 'thick'.
float arch( vec2 q, float a, float b, float thick ) {
  float d = abs( length( vec2( q.x / a, q.y / b ) ) - 1.0 ) * min( a, b );
  return exp( - d * d / ( thick * thick ) );
}

void main() {
  #include <logdepthbuf_fragment>
  vec2 q = vQ;
  float sway = sin( 6.2831853 * ( uTime + uSeed ) );
  float light = 0.0;
  if ( uKind < 0.5 ) {
    q.x += ( 0.05 * sway + 0.2 * ( uSeed - 0.5 ) ) * q.y;             // it leans, and sways about the lean
    float along = atan( q.y, q.x );                                    // 0 at one foot, pi at the other
    // Three strands that do not share a centre, knots of light sliding along two of them, and a haze between.
    light  = arch( q, 0.72, 0.90, 0.028 ) * ( 0.6 + 0.4 * sin( 7.0 * along - 6.2831853 * 2.0 * uTime + 20.0 * uSeed ) );
    light += 0.75 * arch( q - vec2( 0.10, 0.0 ), 0.50, 0.62, 0.024 ) * ( 0.6 + 0.4 * sin( 5.0 * along + 6.2831853 * 3.0 * uTime ) );
    light += 0.55 * arch( q + vec2( 0.16, 0.0 ), 0.30, 0.36, 0.020 );
    light += 0.2 * arch( q, 0.66, 0.80, 0.11 );
    light += 0.3 * exp( - 9.0 * q.y ) * ( 1.0 - smoothstep( 0.45, 0.9, abs( q.x ) ) );   // the glow at its feet
  } else {
    float top = ( 0.45 + 0.5 * wobble1( 3.0 * q.x + 10.0 ) ) * ( 1.0 - 0.6 * q.x * q.x );   // a ragged top, lower at the ends
    float body = 1.0 - smoothstep( 0.5 * top, top, q.y );
    float threads = 0.5 + 0.5 * wobble1( 22.0 * ( q.x + 0.05 * sway * q.y ) + 40.0 );
    float knots = 0.72 + 0.28 * sin( 11.0 * q.y + 6.2831853 * ( wobble1( 5.0 * q.x ) + uTime ) );   // knots sinking, as the gas rains back
    light = 0.9 * body * threads * knots * ( 1.0 - smoothstep( 0.55, 0.97, abs( q.x ) ) );
  }
  light *= uOpacity * ( 1.0 + 0.8 * uHot ) * ( 1.0 - smoothstep( 0.9, 1.0, vQ.y ) ) * ( 1.0 - smoothstep( 0.85, 1.0, abs( vQ.x ) ) );
  // Hydrogen-alpha red where it is thin, white where it is densest.
  vec3 colour = mix( vec3( 1.0, 0.22, 0.16 ), vec3( 1.0, 0.92, 0.85 ), smoothstep( 0.9, 2.4, light ) );
  gl_FragColor = vec4( colour * light * ${PROM_GAIN.toFixed(2)}, 1.0 );
  #include <colorspace_fragment>
}
`;

/**
 * A CME's front, drawn in the plane of the sky through the Sun's centre (the corona's own plane and
 * vertex shader): a thin shell of radius uR about the Sun, kept to the cone of the reported
 * half-angle about uDir. Along each line of sight the shell is met at two points, toward the camera
 * and away; where they lie inside the cone the shell shows, and it is brightest where the line
 * grazes it, so a CME thrown sideways is an arc and one thrown at the camera is a faint round haze.
 */
export const CME_FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uOpacity;
uniform float uR;         // the front's distance from the Sun's centre, radii
uniform float uCosHalf;   // the cosine of the cone's reported half-angle
uniform vec3 uDir;        // the reported direction in the plane's own axes: x right, y up, z toward the camera
varying vec2 vP;
void main() {
  #include <logdepthbuf_fragment>
  float b = length( vP );
  float depth = sqrt( max( uR * uR - b * b, 0.0 ) );
  float toward = dot( normalize( vec3( vP, depth ) ), uDir );
  float away = dot( normalize( vec3( vP, - depth ) ), uDir );
  float cone = max( smoothstep( uCosHalf - 0.1, uCosHalf + 0.06, toward ), smoothstep( uCosHalf - 0.1, uCosHalf + 0.06, away ) );
  float width = 0.07 * uR;
  float edge = ( b - 0.96 * uR ) / width;
  float front = exp( - edge * edge );                                  // the thin bright front, soft on both sides
  float haze = 0.08 * ( 1.0 - smoothstep( 0.55 * uR, 0.98 * uR, b ) ) + 0.06 * smoothstep( 0.5 * uR, 0.96 * uR, b ) * step( b, 0.96 * uR );
  float light = ( front + haze ) * cone * uOpacity * smoothstep( 0.98, 1.02, b );
  if ( light < 0.002 ) discard;
  gl_FragColor = vec4( vec3( 0.92, 0.94, 1.0 ) * light * ${CME_GAIN.toFixed(2)}, 1.0 );
  #include <colorspace_fragment>
}
`;

/**
 * @param {object} opts
 * @param {THREE.Mesh}   opts.mesh    the Sun's own mesh (scene/worlds.js): a unit sphere, +Y its north pole
 * @param {THREE.Camera} opts.camera
 * @param {THREE.Object3D} [opts.sprite]  the round glow it wears far away; faded out while the corona is drawn
 * @param {number} [opts.tier]  0: no grain, two prominences and one CME at most
 */
export function createSunDetail(opts = {}) {
  const mesh = opts.mesh;
  const camera = opts.camera;
  const sprite = opts.sprite || (mesh && mesh.userData ? mesh.userData.corona : null);
  const tier = Number.isFinite(opts.tier) ? opts.tier : 1;
  if (!mesh || !camera) return null;
  const plain = mesh.material; // the flat disc it wears far away, and again under the latch
  const spriteOpacity = sprite && sprite.material ? sprite.material.opacity : 1;
  const spots = [];
  for (let i = 0; i < MAX_SPOTS; i++) spots.push(new THREE.Vector4(0, 1, 0, 0));
  const flareSlots = [];
  for (let i = 0; i < MAX_FLARES; i++) flareSlots.push(new THREE.Vector4(0, 1, 0, 0));
  const material = new THREE.ShaderMaterial({
    name: 'sun-photosphere',
    vertexShader: SUN_VERT,
    fragmentShader: tier >= 2 ? SUN_FRAG : SUN_FRAG_CHEAP,
    uniforms: {
      uMap: { value: plain.map || null },
      uHasMap: { value: plain.map ? 1 : 0 },
      uTint: { value: plain.color ? plain.color.clone() : new THREE.Color(0xf18833) },
      uTime: { value: 0 },
      uGrain: { value: 0 },
      uSpots: { value: spots },
      uSpotCount: { value: 0 },
      uFlares: { value: flareSlots },
      uFlareCount: { value: 0 },
    },
    toneMapped: false, // as the flat disc: the Sun stays out of the tone mapper's way
    fog: false,
  });
  const corona = new THREE.Mesh(
    new THREE.PlaneGeometry(CORONA_RADII * 2, CORONA_RADII * 2),
    new THREE.ShaderMaterial({
      name: 'sun-corona',
      vertexShader: CORONA_VERT,
      fragmentShader: CORONA_FRAG,
      uniforms: { uOpacity: { value: 0 }, uNorth: { value: 0 }, uSeed: { value: 0 }, uTime: { value: STILL.breath } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  corona.name = 'sun-corona-plane';
  corona.userData.kind = 'corona';
  corona.renderOrder = 1;
  corona.visible = false;
  mesh.add(corona);

  // Prominences: a pool of small upright sheets, each placed by hand every frame (its base on the
  // surface at a region, its height along the radius there, its face toward the camera).
  const promCap = PROM_CAP[Math.max(0, Math.min(2, tier))];
  const promGeometry = new THREE.PlaneGeometry(1, 1);
  const proms = [];
  for (let i = 0; i < promCap; i++) {
    const sheet = new THREE.Mesh(promGeometry, new THREE.ShaderMaterial({
      name: 'sun-prominence',
      vertexShader: PROM_VERT,
      fragmentShader: PROM_FRAG,
      uniforms: { uOpacity: { value: 0 }, uKind: { value: 0 }, uSeed: { value: 0 }, uTime: { value: STILL.sway }, uHot: { value: 0 } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }));
    sheet.name = 'sun-prominence';
    sheet.userData.kind = 'prominence';
    sheet.renderOrder = 2;
    sheet.matrixAutoUpdate = false;
    sheet.visible = false;
    mesh.add(sheet);
    proms.push(sheet);
  }
  // CME fronts: sheets in the corona's plane, facing the camera, each told where its front is.
  const cmeCap = tier >= 1 ? MAX_CMES : 1;
  const cmeGeometry = new THREE.PlaneGeometry(CME_REACH_RADII * 2.2, CME_REACH_RADII * 2.2);
  const fronts = [];
  for (let i = 0; i < cmeCap; i++) {
    const front = new THREE.Mesh(cmeGeometry, new THREE.ShaderMaterial({
      name: 'sun-cme',
      vertexShader: CORONA_VERT,
      fragmentShader: CME_FRAG,
      uniforms: { uOpacity: { value: 0 }, uR: { value: 1 }, uCosHalf: { value: 0.87 }, uDir: { value: new THREE.Vector3(1, 0, 0) } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }));
    front.name = 'sun-cme-front';
    front.userData.kind = 'cme';
    front.renderOrder = 2;
    front.visible = false;
    mesh.add(front);
    fronts.push(front);
  }

  let flares = [];
  let cmes = [];
  let regionNumbers = new Set();
  let promNow = [];
  let flaresNow = [];
  let cmesNow = [];
  let activityKey = '';
  const _c = new THREE.Vector3();
  const _x = new THREE.Vector3();
  const _z = new THREE.Vector3();
  const _cam = [0, 0, 1];
  const _d = [0, 0, 0];
  const _place = { observedMs: 0, latDeg: 0, eastDeg: 0 };

  let latched = false;
  let regions = [];
  let drawn = 0;
  let groups = 0;
  let pairs = 0;
  const _part = { observedMs: 0, latDeg: 0, eastDeg: 0 };
  let on = false;
  const _q = new THREE.Quaternion();
  const _v = new THREE.Vector3();
  const _n = new THREE.Vector3();
  const _r = new THREE.Vector3();
  const _u = new THREE.Vector3();
  const _e = [0, 0, 0];
  const _s = [0, 0, 0];

  function wear(detail) {
    if (detail === on) return;
    on = detail;
    // The map may have arrived since the module did (scene/worlds.js `waiting`).
    if (detail) {
      material.uniforms.uMap.value = plain.map || null;
      material.uniforms.uHasMap.value = plain.map ? 1 : 0;
      if (!plain.map && plain.color) material.uniforms.uTint.value.copy(plain.color);
    }
    mesh.material = detail ? material : plain;
    corona.visible = detail;
    if (!detail) {
      for (const sheet of proms) sheet.visible = false;
      for (const front of fronts) front.visible = false;
      material.uniforms.uFlareCount.value = 0;
      promNow = []; flaresNow = []; cmesNow = []; activityKey = '';
    }
    if (sprite && sprite.material) sprite.material.opacity = detail ? 0 : spriteOpacity;
  }

  return {
    /**
     * Every frame. `share` is the Sun's disc as a share of half the view's height (worlds.discShare);
     * `earthWorld` the Earth's place in the scene, for the central meridian the spots are counted from.
     */
    update(tMs, share, earthWorld, how) {
      const look = how && how.look;
      const still = !!(how && how.still) || stillUnder(look, UNDER_MEASURED.corona);
      const detail = !latched && share >= SUN_DETAIL_AT * 0.8; // a little hysteresis under where it was fetched
      wear(detail);
      if (!detail) return;
      const u = material.uniforms;
      if (!u.uHasMap.value && plain.map) { u.uMap.value = plain.map; u.uHasMap.value = 1; }
      const secs = tMs / 1000;
      const wrap = (x, n) => x - Math.floor(x / n) * n;
      u.uTime.value = still ? STILL.grain * GRAIN_WRAP : wrap(secs / GRAIN_LIFE_S, GRAIN_WRAP);
      const swayPhase = still ? STILL.sway : wrap(secs / PROM_SWAY_S, 1);
      const g = tier >= 1 && drawnUnder(look, UNDER_MEASURED.grain) ? Math.min(1, Math.max(0, (share - GRAIN_FROM) / (GRAIN_FULL - GRAIN_FROM))) : 0;
      u.uGrain.value = g * g * (3 - 2 * g);

      // The corona's plane faces the camera; the mesh turns under it, so undo the mesh's own turn.
      mesh.updateWorldMatrix(true, false);
      mesh.getWorldQuaternion(_q).invert();
      corona.quaternion.copy(_q).multiply(camera.quaternion);
      // Where the Sun's north is in that plane: its pole against the camera's right and up.
      _n.set(0, 1, 0).applyQuaternion(mesh.getWorldQuaternion(_q));
      _r.set(1, 0, 0).applyQuaternion(camera.quaternion);
      _u.set(0, 1, 0).applyQuaternion(camera.quaternion);
      const c = corona.material.uniforms;
      c.uNorth.value = Math.atan2(_n.dot(_r), _n.dot(_u));
      c.uSeed.value = carringtonNumber(tMs) % 1000;
      c.uTime.value = still ? STILL.breath : wrap(secs / CORONA_BREATH_S, 1);
      c.uOpacity.value = Math.min(1, Math.max(0, (share - SUN_DETAIL_AT * 0.8) / (SUN_DETAIL_AT * 0.8)));

      // Today's groups, counted from the meridian that faces the Earth, in the Sun's own axes.
      drawn = 0; groups = 0; pairs = 0;
      let meridian = false;
      if (earthWorld) {
        _v.copy(earthWorld);
        mesh.worldToLocal(_v);
        if (_v.lengthSq() > 0) { _v.normalize(); _e[0] = _v.x; _e[1] = _v.y; _e[2] = _v.z; meridian = true; }
      }
      const listed = regions.length > 0 && meridian && regionsFresh(regions[0].observedMs, tMs);
      if (listed) {
        {
          for (const region of regions) {
            const parts = splitRegion(region);
            if (drawn + parts.length > MAX_SPOTS) break; // a pair is never drawn as half of one
            for (const part of parts) {
              _part.observedMs = region.observedMs; _part.latDeg = part.latDeg; _part.eastDeg = part.eastDeg;
              if (!spotDirection(_part, _e, tMs, _s)) break;
              spots[drawn].set(_s[0], _s[1], _s[2], spotRadiusRad(part.areaMsh));
              drawn += 1;
            }
            groups += 1;
            if (parts.length === 2) pairs += 1;
          }
        }
      }
      u.uSpotCount.value = drawn;

      // Flares: the strongest now showing at regions that have a place today.
      flaresNow = listed && flares.length ? flaresAt(flares, tMs, regionNumbers) : [];
      let lit = 0;
      for (const now of flaresNow) {
        const region = regions.find((r) => r.region === now.flare.region);
        if (!region || !spotDirection(region, _e, tMs, _s)) continue;
        flareSlots[lit].set(_s[0], _s[1], _s[2], now.brightness);
        lit += 1;
      }
      u.uFlareCount.value = lit;

      // Prominences: the regions near the limb this camera sees, biggest first, up to the tier's cap.
      camera.getWorldPosition(_c);
      mesh.worldToLocal(_c);
      const camRadii = _c.length();
      const closeness = Math.min(1, Math.max(0, (share - PROM_FROM) / (PROM_FULL - PROM_FROM)));
      const before = promNow.length;
      promNow = [];
      if (listed && camRadii > 1 && closeness > 0) {
        _cam[0] = _c.x / camRadii; _cam[1] = _c.y / camRadii; _cam[2] = _c.z / camRadii;
        for (const region of regions) {
          if (promNow.length >= promCap) break;
          if (!spotDirection(region, _e, tMs, _s)) continue;
          const offsetDeg = limbOffsetDeg(_s, _cam, camRadii);
          const fade = prominenceFade(offsetDeg) * closeness;
          if (!(fade > 0)) continue;
          let hot = 0;
          for (const now of flaresNow) if (now.flare.region === region.region && now.flare.flux >= FLARE_ERUPTIVE_FLUX) hot = Math.max(hot, Math.min(1, now.brightness));
          const shape = prominenceShape(region, hot);
          const sheet = proms[promNow.length];
          // Up is the radius at the region; across is at right angles to it and to the line to the camera.
          _n.set(_s[0], _s[1], _s[2]);
          _x.copy(_c).sub(_n).cross(_n).negate();
          if (_x.lengthSq() < 1e-12) continue;
          _x.normalize();
          _z.crossVectors(_x, _n);
          const tall = shape.height / 0.9 + 0.015;   // the loops reach 0.9 of the sheet; its foot is sunk under the surface
          sheet.matrix.makeBasis(_r.copy(_x).multiplyScalar(shape.width), _u.copy(_n).multiplyScalar(tall), _z);
          sheet.matrix.setPosition(_n.x * (0.985 + tall / 2), _n.y * (0.985 + tall / 2), _n.z * (0.985 + tall / 2));
          sheet.matrixWorldNeedsUpdate = true;
          const pu = sheet.material.uniforms;
          pu.uOpacity.value = fade;
          pu.uKind.value = shape.kind;
          pu.uSeed.value = shape.seed;
          pu.uTime.value = swayPhase;
          pu.uHot.value = hot;
          sheet.visible = true;
          promNow.push({ region: region.region, kind: shape.kind, height: shape.height, width: shape.width, fade, offsetDeg, hot });
        }
      }
      for (let i = promNow.length; i < before; i++) proms[i].visible = false;

      // CME fronts: the newest in flight, in the frame of the Sun-Earth line as the catalogue gives them.
      cmesNow = meridian && cmes.length ? cmesAt(cmes, tMs, cmeCap) : [];
      let flying = 0;
      for (const now of cmesNow) {
        _place.observedMs = tMs; _place.latDeg = now.cme.latDeg; _place.eastDeg = now.cme.eastDeg;
        if (!spotDirection(_place, _e, tMs, _d)) continue;
        const front = fronts[flying];
        const fu = front.material.uniforms;
        front.quaternion.copy(corona.quaternion);
        fu.uDir.value.set(_d[0], _d[1], _d[2]).applyQuaternion(_q.copy(corona.quaternion).invert());
        fu.uR.value = now.radii;
        fu.uCosHalf.value = Math.cos(now.cme.halfAngleDeg * Math.PI / 180);
        fu.uOpacity.value = now.opacity * c.uOpacity.value;
        front.visible = true;
        flying += 1;
      }
      for (let i = flying; i < cmeCap; i++) fronts[i].visible = false;

      let key = promNow.length ? 'p' + promNow.length : '';
      for (const now of flaresNow) key += 'f' + now.flare.region + now.flare.cls;
      for (const now of cmesNow) key += 'c' + now.cme.id;
      activityKey = key;
    },
    /** data/sunactivity.js parseFlares(): the flare list, or [] to draw none. */
    setFlares(list) { flares = Array.isArray(list) ? list : []; },
    /** data/sunactivity.js parseCmes(): the CME list, or [] to draw none. */
    setCmes(list) { cmes = Array.isArray(list) ? list : []; },
    /** A short key that changes when what is drawn of the Sun's activity changes: main.js tells the card. */
    activity() { return activityKey; },
    /** data/sunregions.js parseSunRegions(): today's groups, or [] to draw none. */
    setRegions(list) {
      regions = Array.isArray(list) ? list.slice(0, MAX_SPOTS) : [];
      regionNumbers = new Set(regions.map((r) => r.region));
    },
    /** The frame latch tripped: back to the flat disc and the round glow, for good. */
    latch() { latched = true; wear(false); },
    state() {
      return { on, latched, grain: material.uniforms.uGrain.value, spots: groups, circles: drawn, pairs, regions: regions.length,
        observedMs: regions.length ? regions[0].observedMs : null, corona: corona.material.uniforms.uOpacity.value,
        prominences: promNow.slice(),
        flares: flaresNow.map((f) => ({ region: f.flare.region, cls: f.flare.cls, maxMs: f.flare.maxMs, brightness: f.brightness })),
        cmes: cmesNow.map((x) => ({ id: x.cme.id, startMs: x.cme.startMs, speedKmS: x.cme.speedKmS, radii: x.radii, opacity: x.opacity })),
        flareList: flares.length, cmeList: cmes.length };
    },
    dispose() {
      wear(false);
      mesh.remove(corona);
      corona.geometry.dispose();
      corona.material.dispose();
      for (const sheet of proms) { mesh.remove(sheet); sheet.material.dispose(); }
      for (const front of fronts) { mesh.remove(front); front.material.dispose(); }
      promGeometry.dispose();
      cmeGeometry.dispose();
      material.dispose();
    },
  };
}

// scene/cloudshell.js -- the Earth's clouds with height, seen from low orbit.
//
// Contract:
//   createCloudShell({ earth, renderer?, camera?, scene? })
//     .tick({ tier, latched, saveData, look, altitudeKm?, dtMs })   once a frame, after the Earth's update
//     .latch()            the frame latch tripped: the flat layer comes back, for good
//     .state()            { on, shell, steps, thicker, altitudeKm, gpuBytes }
//     .probe(opts)        for look probes: the flat layer at any height, tier 2's steps, no limb pass
//     .dispose()
//   and the pure parts, for tests/test_cloudshell.mjs: stepsFor, shellCurve, createShellFade,
//   thickerFor, stepTau, columnAlpha, selfShade, cloudSunColour, cloudSkyColour, and (from
//   scene/earth.js, which throws the shadow) the heights, the slab's shape and cloudShellShare.
//
// Built 2026-10-12 (spec 0072 requirement 6; spec 0073 requirement 3). The owner: "3D clouds on Earth".
//
// WHAT IT IS. The cloud layer the Earth's surface shader has always drawn (scene/earth.js: the
// static map, or today's infrared composite from scene/liveclouds.js, or the two cross-fading) is a
// term painted on the ground. Here the SAME coverage, read from the SAME textures through the
// Earth's own uniform objects, fills a slab between CLOUD_SHELL.baseKm and topKm, and a ray is
// marched through it. A column's top is where its temperature puts it: the live picture's opacity
// is how much colder than clear sky the top is, so cold tops stand high (MEASURED where today's
// picture covers); where there is only the static map the brighter cloud is drawn higher
// (ILLUSTRATIVE). Under the Film look every height is drawn CLOUD_SHELL.thicker times what it is,
// and the card says so; under the Measured look, at its true thickness.
//
// A LOW-ORBIT FEATURE (round two, 2026-10-12). The first version came on when the disc was a third
// of the view, and eight look runs showed two things. From above it was the flat layer's picture
// at two and a half times the frame: a cloud's height cannot be seen from over its head. And 48 km
// of drawn top is 3 pixels on the limb of a disc 400 pixels in radius. What shows a cloud's height
// in a photograph from orbit is its profile on the horizon, a tall top still lit over ground
// already in shadow, and its long shadow at a low Sun. So:
//   - the shell is drawn only with the camera within SHELL_FADE's heights of the ground (the
//     station's view: from 420 km the horizon is 2 300 km off and a drawn top is 22 pixels);
//   - and there only WHERE HEIGHT CAN BE SEEN (scene/earth.js cloudShellShare): toward the limb and
//     under a low Sun. Straight down under a high Sun the flat layer draws the cloud, as it always
//     has, and this shader throws the pixel away before it reads a texture.
// The whole-Earth view is the flat layer's, unchanged.
//
// THE LIMB, IN TWO PASSES. The air's glow round the limb (scene/atmosphere.js, an additive shell
// drawn at renderOrder 1) is already nearly white just above the horizon. The first version drew
// the cloud under it, and anything at all under an additive near-white is pure white: a hard band
// the height of the slab round the whole limb, which three changes to the cloud's density could
// not move because it was never the cloud's density. So a ray that MISSES THE GROUND is drawn by a
// second mesh AFTER the air (renderOrder 1.25): there the cloud covers the glow behind it, as a
// cloud on the horizon does, instead of being added to. A ray that reaches the ground is drawn as
// before, first of the see-through things (renderOrder -0.5), under the orbit lines and the marks.
// The cost of the second order: an orbit line crossing the last few pixels above the horizon is
// under the cloud there.
//
// WHAT IS NOT IN IT. No noise: nothing is drawn below the map's resolution. No motion of its own:
// it reads the surface's uCloudOffset. No light at night that the flat layer has not got. No
// post-processing pass, no render target, no texture of its own.
//
// WHAT IT COSTS. Nothing until the camera is CLOUD_SHELL_AT (main.js) close on a tier 1 device after
// the first visit: no request beyond the module. Then two draw calls of one 96 x 64 sphere of
// positions, and per pixel of cloud near the limb or the terminator TIER_STEPS reads of the
// coverage with two more each toward the Sun. Never at tier 0, on a connection that saves data, or
// under the frame latch.

import * as THREE from '../../vendor/three.module.min.js';
import {
  WGS84_A_KM, WGS84_B_KM, CLOUD_SHELL, CLOUD_HEIGHT_GLSL,
  cloudTopKmFromTemperature, cloudTopKmFromLive, cloudTopKmFromBrightness, cloudShadowOffsetKm, cloudSlabMean, cloudSigma, cloudShellShare,
} from './earth.js';
import { ECLIPSE_GLSL } from './eclipse.js';
import { EARTH_AERIAL_GLSL, AERIAL, aerialAirmass, aerialDaylight, aerialSun } from './atmosphere.js';

export { CLOUD_SHELL, cloudTopKmFromTemperature, cloudTopKmFromLive, cloudTopKmFromBrightness, cloudShadowOffsetKm, cloudSlabMean, cloudSigma, cloudShellShare };

// --- tunables: every number the shader uses, named here ---------------------------------------------

/** How many times thicker than it is the cloud is drawn under the Film look. The card prints this number. */
export const CLOUD_THICKER = CLOUD_SHELL.thicker;

/**
 * Under the Measured look (scene/exposure.js) the clouds are drawn at their true thickness: the
 * factor is ours, not the data's. `same`: the shell itself is measured where today's picture covers.
 */
export const UNDER_MEASURED = { shell: 'same', thicker: 'hidden' };
export function thickerFor(look) {
  return look === 'measured' ? 1 : CLOUD_THICKER;
}

/** Steps of the view ray through the slab, by tier. 0: the shell is not drawn at all. */
export const TIER_STEPS = [0, 8, 12];
/** Reads toward the Sun at each step, for self-shadow. */
export const LIGHT_STEPS = 2;

/**
 * WHEN: by the camera's height over the ground, km. Coming down the shell comes in between
 * inKm[0] and inKm[1]; going up it leaves between outKm[1] and outKm[0], which is higher, so a
 * camera resting anywhere does not flicker between the two (the maps' hysteresis, scene/worlds.js
 * MAP_KEPT_AT). The curve changes only where both give the same answer (0 or 1), so it never
 * jumps. `ms`: however fast the camera moved, the fade takes at least this long.
 * 2 000 km is where a drawn top of 48 km is about 10 pixels on the horizon of a 900 pixel view.
 */
export const SHELL_FADE = { inKm: [2400, 1800], outKm: [2800, 2200], ms: 1000 };

/**
 * The light.
 *   wrap        the cloud's own twilight: how far past the horizon of its height a top still takes
 *               light, as the surface's uTwilightWrap is for the ground (0.12)
 *   bumpy       a cloud top is not a level floor: this share of it faces a low Sun whatever the
 *               Sun's height, so the deck does not go grey a long way before the terminator. What
 *               dims and colours it there is the air the light has crossed (cloudSunColour)
 *   deck, top   a level deck's brightness and what a top at topKm adds, the flat layer's 0.95 and
 *               STORM_TOPS.bright
 *   SELF-SHADOW. Two reads toward the Sun, at `at` of the way to where the Sun's ray leaves the
 *   slab (never further than reachKm of drawn path), say how much cloud the light crossed. What
 *   shades is the cloud there in EXCESS of what this column's own would be at those heights: a
 *   level deck shades itself by nothing, a higher neighbour toward the Sun throws its shadow across
 *   it, and the side of a tower that faces the Sun is a little brighter (never by more than `lift`).
 *   `shadeFloor`: the least a shadowed cloud keeps. `lightLod`: the two reads are taken this many
 *   mip levels coarser than the view's, so a shadow has a soft edge and not its texels' corners.
 *   silver      forward scattering: thin cloud between the eye and the Sun is this much brighter
 *               at most, falling as cos^silverPower of the angle from the Sun
 *   THE SKY'S LIGHT. Beside the beam a cloud takes the sky's own light, the same share the ground
 *   takes (scene/atmosphere.js AERIAL.sky: aerialDaylight less aerialSun). Nothing at noon; in
 *   twilight it keeps a cloud the beam no longer reaches a dim blue-grey, and turns a red top pink.
 *   airAbove    the share of the air that is in front of a cloud: the surface's own 1 - 0.6
 *   ON THE HORIZON (the rays that miss the ground). The surface's air is drawn brighter toward the
 *   limb (AERIAL.limbGain) so that the disc's edge meets the glow outside it; a cloud given the same
 *   gain is the glow's own colour and cannot be seen against it (look run 9: the white band gone,
 *   and no cloud to be seen either). So there the gain is left out, `limbAbove` of the air is in
 *   front (a top that reaches the horizon's line of sight is a high one), and the long path's
 *   reddening is drawn at 1 - `limbGrey` of its colour: a cloud on the horizon is a grey-white
 *   shape a little darker than the bright air behind it, which is how a photograph has it.
 *   sharper     the view's reads are taken this many mip levels finer than a pixel's footprint asks
 *   nightAlpha  how much of the cloud is drawn on the night side, the flat layer's 0.06: dark, over
 *               the city lights it dims; gone by `nightEnd` (cos of the Sun's zenith angle)
 */
export const LIGHT = {
  wrap: 0.3, bumpy: 0.5, deck: 0.95, top: 0.12,
  at: [0.25, 0.75], reachKm: 240, reachMu: 0.1, shadeFloor: 0.35, lift: 1.06, shadeGain: 0.8, lightLod: 1.5,
  silver: 1.6, silverPower: 6, nightAlpha: 0.06, nightEnd: -0.22, airAbove: 0.4, sharper: 0.5,
  limbAbove: 0.3, limbGrey: 0.6,
};

/**
 * The shell's alpha is blended in the frame's own encoding (after tone mapping and sRGB), where
 * the flat layer is mixed in linear light before them: half a cloud over a dark sea is 0.74 of
 * white on screen the flat way and 0.57 this way. Raising alpha to this power puts thin cloud back
 * (0.62): between what a dark sea and a bright desert would each need. Fitted against the flat layer.
 */
export const ALPHA_POWER = 0.7;

/**
 * WHY A STEP COUNTS HEIGHT. A step's optical depth is the column's density times the HEIGHT the
 * step crosses inside its cloud, not times the length of the path. Through level cloud a ray at
 * any slant then crosses what a vertical one would, which is what the flat layer shows (its
 * opacity does not change with the view); a ray along the limb, which dips into the slab and
 * climbs out again, crosses each cloud at most twice; and the answer is the same at any drawn
 * thickness. What the slant changes is WHICH columns the ray crosses on its way down: the height.
 */
export function stepTau(alpha, topKm, haKm, hbKm) {
  return cloudSigma(alpha, topKm) * cloudSlabMean(haKm, hbKm, topKm) * Math.abs(hbKm - haKm);
}

/**
 * A pixel whose whole path is over clear sky is thrown away after ONE coarse read (a mip level that
 * holds the whole path), instead of marching eight steps to find nothing. Below this much coverage
 * in that read there is no cloud to draw.
 */
export const CLEAR_BELOW = 0.0015;

const Q = WGS84_B_KM / WGS84_A_KM;
/** The mesh stands a little outside the slab's top at its thickest, so its flat faces never cut into it. */
const R_MESH = (1 + (CLOUD_SHELL.topKm * CLOUD_THICKER) / WGS84_A_KM) * 1.001;
const SEGMENTS = { width: 96, height: 64 };
const GAS_H_KM = 8;
const EARTH_R_KM = 6371;
/** Drawn after the globe and its tiles, before the lines and marks (0 and up) and the air (1). */
const ORDER_DISC = -0.5;
/** The rays that miss the ground: after the air's glow (1), which a cloud on the horizon covers. */
const ORDER_LIMB = 1.25;

// --- the pure parts (tests/test_cloudshell.mjs) --------------------------------------------------------

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoothstep = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };

/** The view ray's steps on a tier: none at tier 0 and none, for good, under the frame latch. */
export function stepsFor(tier, latched = false) {
  if (latched) return 0;
  return TIER_STEPS[Math.min(TIER_STEPS.length - 1, Math.max(0, tier | 0))];
}

/** How much the shell is in at this height of the camera, coming down (`rising`) or going up. */
export function shellCurve(altitudeKm, rising = true) {
  const r = rising ? SHELL_FADE.inKm : SHELL_FADE.outKm;
  return 1 - smoothstep(r[1], r[0], altitudeKm);
}

/**
 * The fade's memory: which curve it is on, and how far it has got.
 *   push(altitudeKm, dtMs, allowed) -> { shell, flat }   shell + flat = 1, always
 * Not allowed (tier 0, the latch, saveData, no cloud map): the shell goes, over SHELL_FADE.ms.
 */
export function createShellFade() {
  let rising = true;
  let k = 0;
  return {
    push(altitudeKm, dtMs, allowed = true) {
      let target = 0;
      if (allowed) {
        target = shellCurve(altitudeKm, rising);
        if (target >= 1) rising = false;
        else if (target <= 0) rising = true;
      } else rising = true;
      const step = Math.max(0, dtMs) / SHELL_FADE.ms;
      k = target > k ? Math.min(target, k + step) : Math.max(target, k - step);
      return { shell: k, flat: 1 - k };
    },
    get shell() { return k; },
    get rising() { return rising; },
  };
}

/**
 * A ray's opacity from the top of the slab to its bottom through a column, marched in `n` steps,
 * each taking the slab's mean over the heights it crosses, as the shader does. Whatever n is, and
 * whatever the slant, it is the flat layer's opacity.
 */
export function columnAlpha(alpha, topKm, n = 8) {
  const C = CLOUD_SHELL;
  const dKm = (C.topKm - C.baseKm) / n;
  let through = 1;
  for (let i = 0; i < n; i++) {
    const ha = C.topKm - i * dKm;
    through *= Math.exp(-stepTau(alpha, topKm, ha, ha - dKm));
  }
  return 1 - through;
}

/**
 * How much a cloud is shaded by what stands between it and the Sun: `tauSun` the optical depth the
 * two reads found, `tauOwn` what this column's own cloud would be along the same path. The excess
 * x = (tauSun - tauOwn) x LIGHT.shadeGain is taken through x / (1 + |x|), which never saturates in a
 * step: an exponential here made every storm either lit or shadowed, with an outline between.
 */
export function selfShade(tauSun, tauOwn) {
  const x = (tauSun - tauOwn) * LIGHT.shadeGain;
  const k = x / (1 + Math.abs(x));
  return k >= 0 ? 1 - (1 - LIGHT.shadeFloor) * k : 1 - (LIGHT.lift - 1) * k;
}

/**
 * Sunlight's colour on a cloud `hKm` up where the Sun's zenith cosine is `mu`, against an overhead
 * Sun's. Above the horizon it is scene/atmosphere.js aerialSun(mu, exp(-h/8)): the gas above the
 * cloud only, exactly the flat layer's. Below it the ray has come past the Earth's limb at a
 * tangent height of h - R mu^2 / 2 and crossed the air there on both sides: orange, red, and gone
 * when that height is under the ground. The height is the REAL one at any drawn thickness.
 */
export function cloudSunColour(mu, hKm) {
  const low = Math.min(mu, 0);
  const tangentKm = hKm - 0.5 * EARTH_R_KM * low * low;
  const horizon = Math.sqrt((Math.PI / 2) * AERIAL.X);
  const column = Math.exp(-Math.max(tangentKm, -GAS_H_KM) / GAS_H_KM) * (aerialAirmass(mu) - 1 + horizon * clamp01(-mu * 20));
  const lit = smoothstep(-1.5, 0.5, tangentKm);
  return AERIAL.tauR.map((t) => Math.exp(-t * column) * lit);
}

/** The sky's own light on a cloud, against an overhead Sun's beam (THE SKY'S LIGHT, in LIGHT). */
export function cloudSkyColour(mu) {
  const d = aerialDaylight(mu);
  const b = aerialSun(mu);
  return d.map((x, k) => x - b[k]);
}

// --- the shader -----------------------------------------------------------------------------------------

const f = (x, n = 4) => Number(x).toFixed(n);

const CLOUD_VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>

varying vec3 vPosL;   // the shell point in the Earth's own axes, equatorial radii

void main() {
  vPosL = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  #include <logdepthbuf_vertex>
}
`;

/** Exported for tests/test_cloudshell.mjs, which checks the uniforms and the JS twins' numbers. */
export const CLOUD_FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>

// The Earth's own uniform OBJECTS (scene/earth.js), shared: whatever the surface shows, this shows.
uniform sampler2D uClouds;
uniform float uHasClouds;
uniform sampler2D uLiveA;
uniform sampler2D uLiveB;
uniform float uLiveFade;
uniform float uLive;
uniform vec2  uCloudOffset;
uniform float uCloudGamma;
uniform float uCloudGain;
uniform vec3  uSunDirLocal;
uniform vec2  uTerminator;
uniform float uAmbient;
uniform float uShell;
uniform float uCloudThick;    // how many times their height the clouds are drawn: 4, or 1 under Measured
uniform float uEclipse;
uniform vec3  uMoonPosLocal;
uniform float uMoonRadiusKm;
uniform float uSunDistKm;
// This shell's own.
uniform vec3  uCamLocal;      // the camera, Earth-local axes, equatorial radii
uniform int   uSteps;         // the tier's
uniform vec2  uTexW;          // the static map's width and the live picture's, texels
uniform float uLimb;          // 0: this mesh draws the rays that reach the ground; 1: the rays that miss it

varying vec3 vPosL;

const float A_KM = ${f(WGS84_A_KM, 3)};
const float INV_Q = ${f(1 / Q, 8)};          // the ellipsoid is a unit sphere once y is stretched by this
const float BASE_KM = ${f(CLOUD_SHELL.baseKm, 2)};
const float TOP_KM = ${f(CLOUD_SHELL.topKm, 2)};
const float MIN_TOP_KM = ${f(CLOUD_SHELL.baseKm + CLOUD_SHELL.minThickKm, 2)};
const int   MAX_STEPS = ${Math.max(...TIER_STEPS)};
const float WRAP = ${f(LIGHT.wrap, 3)};
const float BUMPY = ${f(LIGHT.bumpy, 3)};
const float SHADE_FLOOR = ${f(LIGHT.shadeFloor, 3)};
const float SHADE_LIFT = ${f(LIGHT.lift, 3)};
const float SHADE_GAIN = ${f(LIGHT.shadeGain, 3)};
const float LIGHT_LOD = ${f(LIGHT.lightLod, 2)};
const vec2  LIGHT_AT = vec2( ${f(LIGHT.at[0], 3)}, ${f(LIGHT.at[1], 3)} );
const float REACH_KM = ${f(LIGHT.reachKm, 1)};
const float REACH_MU = ${f(LIGHT.reachMu, 3)};
const float SILVER = ${f(LIGHT.silver, 3)};
const float SILVER_POWER = ${f(LIGHT.silverPower, 1)};
const float NIGHT_ALPHA = ${f(LIGHT.nightAlpha, 3)};
const float NIGHT_END = ${f(LIGHT.nightEnd, 3)};
const float ALPHA_POWER = ${f(ALPHA_POWER, 3)};
const float CLEAR_BELOW = ${f(CLEAR_BELOW, 4)};
const float LIMB_ABOVE = ${f(LIGHT.limbAbove, 2)};
const float LIMB_GREY = ${f(LIGHT.limbGrey, 2)};
const float LIMB_GAIN = ${f(AERIAL.limbGain - 1, 3)};      // scene/atmosphere.js AERIAL.limbGain - 1
const float LIMB_FROM = ${f(AERIAL.limbFrom, 2)};
const float EARTH_UNIT_KM = ${f(WGS84_A_KM, 3)};
${ECLIPSE_GLSL}
${EARTH_AERIAL_GLSL}
${CLOUD_HEIGHT_GLSL}

vec2 gLod = vec2( 0.0 );   // the mip level this pixel reads the static map and the live picture at

vec2 hitSphere( vec3 ro, vec3 rd, float r ) {
  float b = dot( ro, rd );
  float c = dot( ro, ro ) - r * r;
  float d = b * b - c;
  if ( d < 0.0 ) return vec2( 1e9, -1e9 );
  d = sqrt( d );
  return vec2( -b - d, -b + d );
}

// A column: x the flat layer's coverage there (scene/earth.js cloudCover, the same mix of the static
// map and the live picture), y its top, km. One read where the live picture covers, one where it
// does not, both only across the seam and while a new picture fades in.
vec2 cloudColumn( vec2 uv, float sinLat, float coarser ) {
  float c = 0.0;
  float topKm = 0.0;
  float k = 0.0;
  if ( uLive > 0.0 ) {
    vec4 l = textureLod( uLiveB, uv, gLod.y + coarser );
    if ( uLiveFade < 1.0 ) l = mix( textureLod( uLiveA, uv, gLod.y + coarser ), l, uLiveFade );
    k = l.g * uLive;
    c = pow( l.r, uCloudGamma ) * k;
    topKm = cloudTopLiveKm( l.r, l.b, sinLat ) * k;
  }
  if ( k < 0.995 ) {
    float m = textureLod( uClouds, uv + uCloudOffset, gLod.x + coarser ).r * uHasClouds;
    c += pow( m, uCloudGamma ) * ( 1.0 - k );
    topKm += cloudTopMapKm( m ) * ( 1.0 - k );
  }
  return vec2( c, topKm );
}

// cloudSunColour() in scene/cloudshell.js.
vec3 cloudSun( float mu, float hKm ) {
  float low = min( mu, 0.0 );
  float tangentKm = hKm - ${f(0.5 * EARTH_R_KM, 1)} * low * low;
  float column = exp( -max( tangentKm, -${f(GAS_H_KM, 1)} ) / ${f(GAS_H_KM, 1)} ) * ( aerAirmass( mu ) - 1.0 + AER_C * clamp( -mu * 20.0, 0.0, 1.0 ) );
  return exp( -AER_TAU_R * column ) * smoothstep( -1.5, 0.5, tangentKm );
}

void main() {
  #include <logdepthbuf_fragment>

  // The pixel's footprint on the shell, its short side, before anything branches (a read inside the
  // loop has no derivative of its own, and the map's seam at the antimeridian would be a line of
  // the coarsest level).
  float foot = max( min( length( dFdx( vPosL ) ), length( dFdy( vPosL ) ) ), 1e-7 );

  // Everything from here is in the space where the ellipsoid is the unit sphere. The slab, at the
  // thickness it is drawn at: from rBase to rTop, kmPerUnit real km of height to a unit of radius.
  float rBase = 1.0 + BASE_KM * uCloudThick / A_KM;
  float rTop = 1.0 + TOP_KM * uCloudThick / A_KM;
  float kmPerUnit = A_KM / uCloudThick;
  vec3 ro = vec3( uCamLocal.x, uCamLocal.y * INV_Q, uCamLocal.z );
  vec3 rd = normalize( vec3( vPosL.x, vPosL.y * INV_Q, vPosL.z ) - ro );
  vec2 outer = hitSphere( ro, rd, rTop );
  if ( outer.y <= 0.0 || outer.x >= outer.y ) discard;
  // THE LIMB, IN TWO PASSES: a ray that reaches the ground is one mesh's, a ray that misses it the other's.
  vec2 ground = hitSphere( ro, rd, 1.0 );
  bool reaches = ground.x > 0.0 && ground.x < 1e8;
  if ( reaches == ( uLimb > 0.5 ) ) discard;
  float t0 = max( outer.x, 0.0 );
  float t1 = outer.y;
  vec2 inner = hitSphere( ro, rd, rBase );
  if ( inner.x > 0.0 && inner.x < 1e8 ) t1 = min( t1, inner.x );
  if ( t1 <= t0 ) discard;

  vec3 sIn = normalize( ro + rd * t0 );
  vec3 sOut = normalize( ro + rd * t1 );
  vec3 nIn = normalize( vec3( sIn.x, sIn.y * INV_Q, sIn.z ) );      // the geodetic normal, Earth-local
  vec3 nOut = normalize( vec3( sOut.x, sOut.y * INV_Q, sOut.z ) );
  float muIn = dot( nIn, uSunDirLocal );
  // Deep night, the whole way through: the flat layer draws nothing there either.
  if ( max( muIn, dot( nOut, uSunDirLocal ) ) < NIGHT_END - 0.03 ) discard;

  // WHERE HEIGHT CAN BE SEEN (scene/earth.js cloudShellShare): toward the limb and under a low Sun.
  // Elsewhere the flat layer draws the cloud, and this pixel costs nothing more. A ray that misses
  // the ground is the limb itself.
  vec3 rdL = normalize( vec3( rd.x, rd.y / INV_Q, rd.z ) );
  float muV = clamp( dot( nIn, -rdL ), 0.0, 1.0 );
  float share = reaches ? cloudShellShare( muV, muIn ) : 1.0;
  if ( share <= 0.0 ) discard;

  // The Sun's direction over the ground at the middle of the path: where a read toward it lands.
  vec3 nMid = normalize( nIn + nOut );
  vec3 east = normalize( cross( vec3( 0.0, 1.0, 0.0 ), nMid ) );
  vec3 north = cross( nMid, east );
  float cosLat = max( sqrt( max( 1.0 - nMid.y * nMid.y, 0.0 ) ), 0.05 );
  vec2 sunUv = vec2( dot( uSunDirLocal, east ) / ( 6.28318531 * cosLat ), dot( uSunDirLocal, north ) / 3.14159265 ) / A_KM;

  // Clear sky the whole way: one read at a mip level that holds the whole path, and no march (CLEAR_BELOW).
  {
    vec3 sMid = normalize( sIn + sOut );
    float span = length( sOut - sIn ) + foot;
    gLod = log2( span * uTexW / 6.28318531 + 2.0 ) + 1.0;
    vec2 uvMid = vec2( atan( -sMid.z, sMid.x ) / 6.28318531 + 0.5, asin( clamp( nMid.y, -1.0, 1.0 ) ) / 3.14159265 + 0.5 );
    if ( cloudColumn( uvMid, nMid.y, 0.0 ).x < CLEAR_BELOW ) discard;
  }

  float cosVS = dot( rdL, uSunDirLocal );
  float fwd = SILVER * pow( max( cosVS, 0.0 ), SILVER_POWER );

  // The Moon's shadow (spec 0037), once for the pixel: the cloud goes dark with the ground under it.
  float ecl = 1.0;
  if ( uEclipse > 0.5 && muIn > 0.0 ) {
    vec2 g = eclGeometry( vec3( sIn.x, sIn.y / INV_Q, sIn.z ) * EARTH_UNIT_KM, uSunDirLocal * uSunDistKm, uMoonPosLocal, SUN_RADIUS_KM, uMoonRadiusKm );
    ecl = 1.0 - UMBRA_DEPTH * eclDiscOverlap( g.x, g.y );
  }

  // The path is cut into uSteps pieces, and each takes the slab's MEAN over the heights it crosses
  // (cloudSlabMean), so the amount of cloud is right whatever the number of steps: no rings. Where
  // in its piece each reads the column is the pixel's own (interleaved gradient noise), so what
  // eight reads miss between them is fine grain and not a pattern.
  float jitter = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
  float ds = ( t1 - t0 ) / float( uSteps );
  // The mip level of every read: the pixel's footprint, a little finer; and never finer than a
  // step of the march, so that along a grazing ray, where a step is hundreds of kilometres of cloud,
  // each read stands for its stretch of the path (eight sharp reads there were a comb of streaks).
  gLod = max( log2( max( foot * ${f(2 ** -LIGHT.sharper, 4)}, ds ) * uTexW / 6.28318531 ), vec2( 0.0 ) );
  vec3 acc = vec3( 0.0 );
  float accShown = 0.0;
  float through = 1.0;
  float hb = ( length( ro + rd * t0 ) - 1.0 ) * kmPerUnit;
  for ( int i = 0; i < MAX_STEPS; i++ ) {
    if ( i >= uSteps || through < 0.02 ) break;
    float ta = t0 + float( i ) * ds;
    float ha = hb;
    hb = ( length( ro + rd * ( ta + ds ) ) - 1.0 ) * kmPerUnit;
    vec3 p = ro + rd * ( ta + ( 0.35 + 0.3 * jitter ) * ds );
    float r = length( p );
    vec3 s = p / r;
    vec3 n = normalize( vec3( s.x, s.y * INV_Q, s.z ) );
    vec2 uv = vec2( atan( -s.z, s.x ) / 6.28318531 + 0.5, asin( clamp( n.y, -1.0, 1.0 ) ) / 3.14159265 + 0.5 );
    vec2 col = cloudColumn( uv, n.y, 0.0 );
    float sig = cloudSigma( col.x * uCloudGain, col.y );
    // The height this piece crosses inside the column's cloud, not the length of the path (stepTau).
    float tau = sig * cloudSlabMean( ha, hb, col.y ) * abs( hb - ha );
    if ( tau <= 0.0 ) continue;
    float a = 1.0 - exp( -tau );
    // The light is worked out where this piece's cloud is: inside the column, under its top.
    float tk = max( col.y, MIN_TOP_KM );
    float hKm = clamp( ( r - 1.0 ) * kmPerUnit, BASE_KM, tk );

    float mu = dot( n, uSunDirLocal );
    float dip = sqrt( 2.0 * hKm / ${f(EARTH_R_KM, 1)} );   // the horizon's dip from up here
    // How much of it is drawn: all by day, the flat layer's trace at night, none in deep night.
    float day = smoothstep( uTerminator.x, uTerminator.y, mu + dip );
    float shown = NIGHT_ALPHA * smoothstep( NIGHT_END, NIGHT_END + 0.06, mu ) + ( 1.0 - NIGHT_ALPHA ) * day;

    vec3 light = vec3( 0.0 );
    if ( day > 0.0 ) {
      // Two reads toward the Sun, on the way to where its ray leaves the slab (SELF-SHADOW, above).
      float muUp = max( mu, REACH_MU );
      float reach = min( ( TOP_KM - hKm ) * uCloudThick / muUp, REACH_KM );
      vec2 d = LIGHT_AT * reach;
      vec2 hs = hKm + muUp * d / uCloudThick;
      vec2 c1 = cloudColumn( uv + sunUv * d.x, n.y, LIGHT_LOD );
      vec2 c2 = cloudColumn( uv + sunUv * d.y, n.y, LIGHT_LOD );
      float tauSun = cloudSigma( c1.x * uCloudGain, c1.y ) * cloudSlabMean( hs.x, hs.x, c1.y )
                   + cloudSigma( c2.x * uCloudGain, c2.y ) * cloudSlabMean( hs.y, hs.y, c2.y );
      float tauOwn = sig * ( cloudSlabMean( hs.x, hs.x, col.y ) + cloudSlabMean( hs.y, hs.y, col.y ) );
      // Light is stopped by the cloud it runs through, level or not: each read stands for half the
      // reach, in real km (the densities are per real km).
      float x = ( tauSun - tauOwn ) * 0.5 * reach / uCloudThick * SHADE_GAIN;
      float kx = x / ( 1.0 + abs( x ) );
      float shade = kx >= 0.0 ? 1.0 - ( 1.0 - SHADE_FLOOR ) * kx : 1.0 - ( SHADE_LIFT - 1.0 ) * kx;
      float lambert = mix( clamp( ( mu + dip + WRAP ) / ( 1.0 + WRAP ), 0.0, 1.0 ), 1.0, BUMPY );
      float high = clamp( ( hKm - 8.0 ) / 4.0, 0.0, 1.0 );
      light = ( cloudSun( mu, hKm ) * lambert * ( ${f(LIGHT.deck, 2)} + ${f(LIGHT.top, 2)} * high )
            * shade * ( 1.0 + fwd * clamp( shade, 0.0, 1.0 ) ) + ( aerDaylight( mu ) - aerSun( mu ) ) * day ) * ecl;
    }
    acc += through * a * ( light + uAmbient * 2.0 );
    accShown += through * a * shown;
    through *= 1.0 - a;
  }

  float alpha = 1.0 - through;
  if ( alpha < 0.004 ) discard;
  // The air between the cloud and the eye, exactly as the surface's clouds have it (aerial
  // perspective, limb gain and all): toward the limb a cloud is seen through a long column of lit
  // air, blue-white and dimmer, and meets the air's own glow instead of standing out of it.
  float airLit = smoothstep( -0.14, 0.02, muIn ) * ecl;
  vec3 colour;
  if ( reaches ) {
    colour = aerial( acc / alpha, muV, muIn, cosVS, airLit, ${f(LIGHT.airAbove, 2)} );
  } else {
    // ON THE HORIZON (LIGHT): the same air, split into what it lets through and what it adds; the
    // limb's gain left out, the reddening mostly greyed.
    vec3 airAdds = aerial( vec3( 0.0 ), muV, muIn, cosVS, airLit, LIMB_ABOVE );
    vec3 airLets = aerial( vec3( 1.0 ), muV, muIn, cosVS, airLit, LIMB_ABOVE ) - airAdds;
    airLets = mix( airLets, vec3( dot( airLets, vec3( 0.2126, 0.7152, 0.0722 ) ) ), LIMB_GREY );
    colour = acc / alpha * airLets + airAdds / ( 1.0 + LIMB_GAIN * smoothstep( LIMB_FROM, 0.0, muV ) );
  }

  gl_FragColor = vec4( colour, pow( clamp( accShown, 0.0, 1.0 ), ALPHA_POWER ) * uShell * share );

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// --- the mesh -------------------------------------------------------------------------------------------

const wallNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const texWidth = (tex, fallback) => {
  const img = tex && tex.image;
  return (img && (img.width || img.naturalWidth)) || fallback;
};

/**
 * @param {object} o
 * @param {THREE.Mesh|function} o.earth   scene/earth.js createEarth()'s mesh, or a function giving it
 * @param {THREE.WebGLRenderer} [o.renderer]  to compile the program off the frame
 * @param {THREE.Camera} [o.camera]  whose height over the ground decides whether the shell is in
 */
export function createCloudShell({ earth, renderer = null, camera = null, scene = null } = {}) {
  const earthMesh = () => (typeof earth === 'function' ? earth() : earth);
  const fade = createShellFade();
  let meshes = null;     // [the rays that reach the ground, the rays that miss it]
  let parentOf = null;
  let gone = false;      // the latch: for good
  let steps = 0;
  let lastTick = null;
  let altitude = Infinity;
  const probe = { off: false, tier: null, noLimb: false };
  const camLocal = new THREE.Vector3();

  function build(parent) {
    const pu = parent.material && parent.material.uniforms;
    if (!pu || !pu.uShell || !pu.uCloudThick) return null;
    const geo = new THREE.SphereGeometry(R_MESH, SEGMENTS.width, SEGMENTS.height);
    // Positions only, on the ellipsoid: the shader needs nothing else.
    geo.deleteAttribute('normal');
    geo.deleteAttribute('uv');
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) * Q);
    pos.needsUpdate = true;
    geo.computeBoundingSphere();
    const share = (name) => pu[name];
    // The two meshes' own uniforms are one set of objects too, but for which rays each draws.
    const own = { uCamLocal: { value: new THREE.Vector3(0, 0, 10) }, uSteps: { value: TIER_STEPS[1] }, uTexW: { value: new THREE.Vector2(2048, 2048) } };
    const make = (limb) => {
      const material = new THREE.ShaderMaterial({
        name: limb ? 'earth-cloud-shell-limb' : 'earth-cloud-shell',
        vertexShader: CLOUD_VERT,
        fragmentShader: CLOUD_FRAG,
        uniforms: {
          // The Earth's own uniform OBJECTS: a new live picture, the cross-fade, the drift, the Sun
          // and the Moon's shadow are written once, by scene/earth.js, for both.
          uClouds: share('uClouds'), uHasClouds: share('uHasClouds'),
          uLiveA: share('uLiveA'), uLiveB: share('uLiveB'), uLiveFade: share('uLiveFade'), uLive: share('uLive'),
          uCloudOffset: share('uCloudOffset'), uCloudGamma: share('uCloudGamma'), uCloudGain: share('uCloudGain'),
          uSunDirLocal: share('uSunDirLocal'), uTerminator: share('uTerminator'), uAmbient: share('uAmbient'),
          uShell: share('uShell'), uCloudThick: share('uCloudThick'),
          uEclipse: share('uEclipse'), uMoonPosLocal: share('uMoonPosLocal'), uMoonRadiusKm: share('uMoonRadiusKm'), uSunDistKm: share('uSunDistKm'),
          ...own,
          uLimb: { value: limb ? 1 : 0 },
        },
        side: THREE.FrontSide,   // the camera never comes inside it: scene/camera.js keeps 1.02 radii
        transparent: true,
        depthWrite: false,
      });
      const m = new THREE.Mesh(geo, material);
      m.name = material.name;
      m.renderOrder = limb ? ORDER_LIMB : ORDER_DISC;
      m.frustumCulled = false;
      m.visible = false;
      m.userData.kind = 'clouds';
      m.userData.cls = 'measured';
      parent.add(m);
      return m;
    };
    const pair = [make(false), make(true)];
    pair[0].onBeforeRender = (_r, _s, cam) => {
      cam.getWorldPosition(camLocal);
      parent.worldToLocal(camLocal);
      own.uCamLocal.value.copy(camLocal);
    };
    parent.userData.cloudShell = pair[0];
    parent.userData.cloudShellLimb = pair[1];
    if (renderer && camera && typeof renderer.compileAsync === 'function') {
      pair[0].visible = true;
      renderer.compileAsync(pair[0], camera, scene || undefined).catch(() => {}).finally(() => { pair[0].userData.compiled = true; });
      // A program that never links never resolves on some drivers (scene/aurora.js says the same):
      // drawing it is how the error reaches the console.
      setTimeout(() => { pair[0].userData.compiled = true; }, 3000);
      pair[0].visible = false;
    } else {
      pair[0].userData.compiled = true;
    }
    return pair;
  }

  function remove() {
    const u = parentOf && parentOf.material && parentOf.material.uniforms;
    if (u && u.uShell) u.uShell.value = 0;
    if (!meshes) return;
    for (const m of meshes) { if (m.parent) m.parent.remove(m); m.material.dispose(); }
    meshes[0].geometry.dispose();
    if (parentOf) { delete parentOf.userData.cloudShell; delete parentOf.userData.cloudShellLimb; }
    meshes = null;
  }

  /** The camera's height over the Earth's ellipsoid, km: its distance from the centre in equatorial radii, less one. */
  function cameraAltitudeKm(parent) {
    if (!camera || typeof camera.getWorldPosition !== 'function') return Infinity;
    camera.getWorldPosition(camLocal);
    parent.updateMatrixWorld();
    parent.worldToLocal(camLocal);
    return (camLocal.length() - 1) * WGS84_A_KM;
  }

  const api = {
    /**
     * Once a frame, after the Earth's update. Off (and the flat layer whole) at tier 0, under the
     * latch, on a connection that saves data, when the Earth has no cloud map to show, and with
     * the camera higher than SHELL_FADE. `look`: 'measured' draws the clouds at their true
     * thickness. `altitudeKm`: for a test; the page's is the camera's own.
     */
    tick({ tier = 1, latched = false, saveData = false, look = 'film', altitudeKm = null, dtMs = null } = {}) {
      const wall = wallNow();
      const dt = dtMs !== null && Number.isFinite(dtMs) ? dtMs : (lastTick === null ? 0 : Math.min(100, wall - lastTick));
      lastTick = wall;
      if (gone) return;
      if (latched) { api.latch(); return; }
      const parent = earthMesh();
      if (!parent || !parent.material || !parent.material.uniforms || !parent.material.uniforms.uShell) return;
      if (parent !== parentOf) { remove(); parentOf = parent; }
      const pu = parent.material.uniforms;
      altitude = altitudeKm !== null && Number.isFinite(altitudeKm) ? altitudeKm : (parent.visible === false ? Infinity : cameraAltitudeKm(parent));
      steps = stepsFor(probe.tier !== null ? probe.tier : tier, latched);
      const clouds = pu.uHasClouds.value > 0 || pu.uLive.value > 0;
      const wanted = steps > 0 && !saveData && clouds && parent.visible !== false && !probe.off;
      if (!meshes && wanted && shellCurve(altitude, fade.rising) > 0) meshes = build(parent);
      const ready = !!meshes && meshes[0].userData.compiled === true;
      const k = fade.push(altitude, dt, wanted && ready).shell;
      pu.uShell.value = k;
      // The Measured look draws the clouds at their true thickness; the surface's shadow reads the same number.
      pu.uCloudThick.value = thickerFor(look);
      if (!meshes) return;
      meshes[0].visible = k > 0 && ready;
      meshes[1].visible = k > 0 && ready && !probe.noLimb;
      const u = meshes[0].material.uniforms;
      if (steps > 0) u.uSteps.value = steps;
      u.uTexW.value.set(texWidth(pu.uClouds.value, 2048), texWidth(pu.uLiveB.value, 2048));
    },
    /**
     * For probes: `off: true` shows the flat layer at any height, to set the two side by side;
     * `tier: 2` marches as tier 2 does; `noLimb: true` leaves out the rays that miss the ground.
     */
    probe(opts = {}) { Object.assign(probe, opts); return { ...probe }; },
    /** The frame latch: the shell is taken away and the flat layer is whole again, for good. */
    latch() { gone = true; steps = 0; remove(); },
    state() {
      const u = parentOf && parentOf.material && parentOf.material.uniforms;
      return {
        on: !!meshes && meshes[0].visible,
        shell: gone ? 0 : fade.shell,
        steps: meshes && meshes[0].visible ? steps : 0,
        lightSteps: LIGHT_STEPS,
        latched: gone,
        thicker: u && u.uCloudThick ? u.uCloudThick.value : CLOUD_THICKER,
        altitudeKm: Number.isFinite(altitude) ? Math.round(altitude) : null,
        gpuBytes: meshes ? meshes[0].geometry.attributes.position.array.byteLength + (meshes[0].geometry.index ? meshes[0].geometry.index.array.byteLength : 0) : 0,
      };
    },
    dispose() { remove(); },
  };
  return api;
}

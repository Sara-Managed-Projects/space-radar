// Earth. One sphere, one ShaderMaterial, one child shell for the atmosphere.
//
// Contract:
//   createEarth(textures): THREE.Mesh          -- atmosphere shell attached as a child
//   updateEarth(mesh, sunDirScene, tMs): void
//   updateEarthEclipse(mesh, on, moonKmScene, sunDistKm): void   -- spec 0037, the Moon's shadow
//   setLiveClouds(mesh, texture): void           -- 2026-09-28, a new live cloud picture, cross-faded in
//   setLiveCloudsShown(mesh, on): void           -- live clouds or the static map (scene/liveclouds.js decides)
//   setEarthCloudHeight(mesh, how): number       -- 2026-10-13, clouds that stand up (CLOUD_PARALLAX): the tier, the latch, the look
//
// The mesh is a WGS84 ELLIPSOID in units of the equatorial radius, and the caller scales it by
// WGS84_A_KM / stage.unitKm (mesh.userData.scaleRadiusKm carries the number) so the same mesh is
// correct in an Earth stage and in a Sun stage. The scale is uniform, which is what lets the
// shader get away with mat3(modelMatrix) * normal instead of a normal-matrix uniform.
//
// ---------------------------------------------------------------------------------------------
// HOW THE EARTH-FIXED FRAME IS ALIGNED -- the single most visible possible bug
// ---------------------------------------------------------------------------------------------
// Every vertex is placed from its own uv by ellipsoidGeometry() below: u = 0.5 is longitude 0,
// uv.y = 1 is the north pole. That is the registration an equirectangular planet map has, and
// three's default texture.flipY = true is what puts the image's top row at uv.y = 1. It agrees
// with three's own SphereGeometry, which lays a vertex at
//     x = -r cos(phi) sin(theta),  y = r cos(theta),  z = r sin(phi) sin(theta)
// with u = phi / 2pi and uv.y = 1 - theta/pi, so:
//     u = 0.50 (longitude 0), equator  ->  local +X
//     u = 0.75 (longitude 90 E), equator -> local -Z
//     north pole                        ->  local +Y
// The ECEF axes are: +X at longitude 0 on the equator, +Y at longitude 90 E, +Z at the north
// pole. stage.js maps a frame vector (x,y,z) to the scene as (x, z, -y), so ECEF +X -> scene +X,
// ECEF +Y -> scene -Z, ECEF +Z -> scene +Y. That is EXACTLY the geometry above. So an unrotated
// SphereGeometry with a standard equirectangular texture is already earth-fixed in scene axes,
// and the only rotation Earth needs is the one that carries earth-fixed to earth-inertial:
//
//     mesh.rotation.y = gmst(date)
//
// (A rotation by +theta about the frame's Z becomes a rotation by +theta about the scene's Y,
// because the axis remap is a proper rotation carrying Z to Y.)
//
// Verified three ways, all in the report for this file:
//   1. Numerically, against three's own SphereGeometry: the vertex at uv (0.5, 0.5) is at local
//      (+1, 0, 0), at uv (0.75, 0.5) is at (0, 0, -1), at uv (0.25, 0.5) is at (0, 0, +1).
//   2. Against the pixels of the day map (the publisher's 2k JPEG, shipped as 2k_earth_daymap.webp): sampling the texture at the uv this alignment
//      predicts for eight known places (Sahara, Amazon, Australia, mid-Pacific, ...) gives land
//      where there is land and ocean where there is ocean.
//   3. Against the ephemeris: the sub-solar point computed from the rendered geometry
//      (RA(Sun) - GMST) matches the sub-solar longitude from the equation of time.

import * as THREE from '../../vendor/three.module.min.js';
import { gmst, geodeticToEcef } from '../propagate/frames.js';
import { ECLIPSE_GLSL, MOON_RADIUS_KM } from './eclipse.js';
import { EARTH_DAY_PLACEHOLDER } from './earthplaceholder.js';
import { EARTH_AIR, EARTH_AERIAL_GLSL, AERIAL, createEarthAir, settleEarthAir, setEarthAirSteps } from './atmosphere.js';

// --- tunables, all named, none buried in the shader -------------------------------------------

/** Terminator softness, in cos(sun angle). The brief's numbers; ~11 degrees of twilight. */
export const TERMINATOR = { start: -0.08, end: 0.12 };

/** docs/design-language.md night-lights. Cities glow warm; the night map is ADDED, never pasted. */
export const NIGHT_LIGHTS = 0xffc98a;
/**
 * Where the night map is brightest -- the dense cores of cities -- the lights read whiter than the
 * sparse warm ones round them, the way a bright source loses its colour. A drawing choice about
 * brightness, NOT a map of which country lights with sodium and which with LEDs (the map has no
 * such data): illustrative (public #260).
 */
export const NIGHT_CORE_LIGHTS = 0xfff0dc;
/** Where a ground bright enough and grey enough to be ice and snow starts to gain its sheen. */
export const ICE_SHEEN = { lo: 0.36, hi: 0.55, chroma: 0.14 };

/** docs/design-language.md atmosphere-rim, additive at ~35 %. */
export const ATMOSPHERE_RIM = 0x6ec3ff;

/** The shell that sells the planet. 1.025 x 6371 km = a 159 km atmosphere, about right. */
export const ATMOSPHERE_SCALE = EARTH_AIR.shellScale;

/**
 * Cloud drift, in texture widths per second of APP time. One lap in eight days.
 * cls: 'illustrative'. The cloud map is a single static snapshot of a day that is over; the drift
 * is decoration and the card must not claim otherwise. At 1x it is 1.4 microns of texture a
 * second -- invisible, correctly -- and it only reads when the clock is scrubbed.
 *
 * It moves the STATIC map only. The live clouds (2026-09-28, scene/liveclouds.js) are a picture of
 * one moment and are sampled where they were photographed; they change by being replaced with the
 * next picture, cross-faded over LIVE_CROSSFADE_MS, never by sliding.
 */
export const CLOUD_DRIFT_U_PER_S = 1 / (8 * 86400);

/** Cloud deck height over Earth's radius: 8 km / 6371 km. Sets how far the cloud shadow steps. */
export const CLOUD_H_OVER_R = 8 / 6371;

/** Sphere tessellation. 96x64 is 6 200 triangles: silhouette-smooth and free. */
export const SEGMENTS = { width: 96, height: 64 };

/**
 * Ocean mask thresholds, in LINEAR light, MEASURED off the day map rather than guessed (off the
 * publisher's 2k JPEG; the WebP shipped since 2026-10-08 is that picture at SSIM 0.98, and its
 * mask differs from the JPEG's at about one pixel in a hundred, along the coasts).
 * There is no specular map in this texture set, so the mask has to be derived, and ocean is the
 * one large region where blue clearly exceeds red. Twenty-one probe points, blue minus red:
 *
 *   open ocean          0.1649  (the map's water is a single flat 30,59,117 nearly everywhere)
 *   Caribbean shallows  0.1689
 *   Arctic sea ice      0.1174   <- the dimmest thing that must still count as water
 *   Antarctic ice       0.0149   <- the brightest thing that must NOT
 *   Greenland ice       0.0000
 *   Iceland             -0.0535
 *   Congo               -0.0221     Amazon -0.0319   Siberia -0.0383
 *   Sahara              -0.3352     Australia -0.1861
 *
 * So the band 0.03 -> 0.10 puts every sea at 1.0 and every land and ice at 0.0, with the two
 * nearest cases (Arctic sea ice above, Antarctica below) each a clear margin from the edge.
 */
export const OCEAN_MASK = { lo: 0.03, hi: 0.10 };

/**
 * WGS84. The mesh is built ON the ellipsoid rather than on a sphere, so a ground site placed by
 * frames.geodeticToEcef lands exactly on the surface AND exactly on the right piece of the
 * texture. On a sphere of the mean radius it would be up to 14 km off the surface and, worse,
 * 21 km off in latitude, because an equirectangular map is in GEODETIC latitude and a sphere's
 * parameterisation is geocentric. 21 km is two pixels of coastline at full zoom, and a pin two
 * pixels into the sea is exactly the bug that is impossible to unsee.
 */
export const WGS84_A_KM = 6378.137;
export const WGS84_B_KM = 6356.752314245;

/**
 * RELIEF (spec 0053 task 5, public #260, 2026-10-08). The globe is a smooth ellipsoid; what a low
 * Sun shows of the mountains is drawn by tipping the normal the daylight is worked out with, from
 * a height map (registry/textures.yaml earth-relief: NOAA's ETOPO 2022, one grey channel holding
 * sqrt(height / maxMetres), so the lowlands keep their steps of a few metres). Tier 1 and up, and
 * never under the frame latch (scene/texturetiers.js gives the map back).
 *
 *   exaggeration  the slopes are drawn this many times steeper than they are. ADJUSTED, and the
 *                 Earth's card says so: at the 10 to 20 km a texel covers, the Himalaya's front
 *                 is a slope of about 3 degrees, and from the distance the globe is seen at the
 *                 real thing is a change of a few per cent in brightness within a few degrees of
 *                 the terminator.
 *   min, max      the daylight on a slope against the daylight on level ground there, held between
 *                 these: there is no shadow cast in this (a slope turned from the Sun dims, it does
 *                 not put its neighbour in the dark), and a ratio is unbounded at the terminator.
 * Water is level: the slope is multiplied by the land share of the water mask, so the sea floor
 * the data set also holds, and the Great Lakes' beds, stay out of the picture.
 */
export const EARTH_RELIEF = { exaggeration: 5, maxMetres: 9000, min: 0.3, max: 1.9, sunFloor: 0.04 };

/** The shader's slope gain for a height map `widthPx` wide: slope per unit of (vE^2 - vW^2) two texels apart. */
export function reliefGain(widthPx) {
  const texelM = (2 * Math.PI * 6371000) / widthPx;
  return (EARTH_RELIEF.exaggeration * EARTH_RELIEF.maxMetres) / (2 * texelM);
}

/**
 * The JS twin of the shader's relief term: the daylight on the tipped ground over the daylight on
 * level ground. v*: the map's values a texel to the east, west, north and south; sun: the Sun's
 * direction as [east, north, up] at the place; land: 1 on land, 0 on water.
 */
export function reliefLight(vE, vW, vN, vS, cosLat, sun, gain, land = 1) {
  const sx = (gain * (vE * vE - vW * vW) / cosLat) * land;
  const sy = gain * (vN * vN - vS * vS) * land;
  const len = Math.hypot(sx, sy, 1);
  const tipped = (-sx * sun[0] - sy * sun[1] + sun[2]) / len;
  const ratio = Math.min(EARTH_RELIEF.max, Math.max(EARTH_RELIEF.min, tipped / Math.max(sun[2], EARTH_RELIEF.sunFloor)));
  const t = Math.min(1, Math.max(0, sun[2] / 0.06));
  return 1 + (ratio - 1) * t * t * (3 - 2 * t);
}

/**
 * STORM TOPS (spec 0066 task 2, internal #241, 2026-10-08). The live cloud picture's third channel
 * is how far a cloud top is into the cold of deep convection (scene/cloudcompose.js STORM_TOP):
 * a cumulonimbus anvil, 12 to 17 km up where the deck around it is drawn at 8.
 *   dip        how much later the Sun sets on a top than on the ground under it: the horizon's dip
 *              from 15 km, sqrt(2 x 15 / 6371) radians, added to the cosine of the Sun's zenith
 *              angle (near the terminator the two are the same number)
 *   shadow     its shadow is thrown this many times as far as the deck's (15 km over 8)
 *   bright     how much whiter than the deck a full top is
 */
export const STORM_TOPS = { dip: 0.069, shadow: 1.9, bright: 0.12 };

/**
 * CLOUDS THAT STAND UP (2026-10-13; spec 0072 requirement 6, after public #1027 was parked). The
 * cloud term below is paint on the ground. From low orbit, on tier 1 and up, it is given HEIGHT
 * inside this same shader, by parallax: no mesh, no draw call, no render target, no pass.
 *
 * THE HEIGHT FIELD. Each place's cloud top is a height over the ground between 0 and the drawn
 * thickness: where today's picture covers, from its measured temperature (scene/cloudcompose.js:
 * the opacity is how far the top is below clear sky's temperature as a share of CLEAR_SPAN_C, and
 * the third channel carries a storm top on from there, at 6.5 C a kilometre: `liveKm`, MEASURED);
 * where only the static map shows, from its brightness (brighter is higher: ILLUSTRATIVE).
 *
 * THE SEARCH (cloudSeek, and its twin in the shader). The view ray is stepped DOWN through that
 * field in the surface's own tangent plane, from where it enters the top of the slab to the
 * ground point this fragment is: `steps` intervals by tier, then one refinement by the secant
 * between the last two. The cloud drawn is the one the ray meets, read from the map at full
 * sharpness there, so nothing is smeared (what #1027's marched slab did). Straight down the two
 * points are one and the picture is the flat layer's; toward the limb a tall top leans away from
 * the viewer and hides what is behind it.
 *
 * WHAT IT READS. Every read in the search is at a stated mip level (the view's own footprint), so
 * a loop may hold it; the static map is not read where today's picture covers; under solid cloud
 * the ground's shadow is not looked for. Where today's picture covers that is 4 reads for the
 * view on tier 1, one where the ray lands and 2 to 4 toward the Sun, beside the flat layer's own.
 *
 * THE SHADOW. From the ground point, and again from the point on the cloud the ray met, `sunSteps`
 * reads toward the Sun, spaced as the square of the way so that a low deck's short shadow is not
 * stepped over, each read as wide as the gap to the one before it (a far shadow is a soft one): is
 * there a top above the Sun's ray there. So a tall top throws a longer shadow than a low deck, and
 * at a low Sun it falls across the lower cloud as well as the ground.
 *
 * THE LAST LIGHT. A top `h` up still sees the Sun when the ground under it does not, until the
 * Sun is acos( R / ( R + h ) ) below that ground's horizon (litTopDip). The DRAWN height is used,
 * here as everywhere else in this, so a top that leans three times too far also keeps the light
 * as many times too high: one exaggeration, not two pictures. Its colour is the light's through the
 * air at the ground's own Sun, as the deck's always was.
 *
 *   realKm     the slab a cloud top may stand in, km
 *   thicker    every height is DRAWN this many times what it is where height can be seen. ADJUSTED,
 *              and the Earth's card says so (copy/en.js worldDeparture.earth). Under the Measured
 *              look the clouds are at their true thickness, which from orbit is the flat layer.
 *   nearKm     the camera's height: all of it below nearKm[0], none above nearKm[1] (the whole
 *              Earth is the flat layer exactly; the drawn slab is a quarter of a pixel from there)
 *   view, sun  WHERE: all of it where the view's zenith cosine at the place is under view[0] or
 *              the Sun's under sun[0]; none where both are past [1]. Looking down under a high
 *              Sun the flat layer's picture is today's, bit for bit.
 *   tanMax     the lean and the shadow stop growing at these tangents of the zenith angle
 *   soft       a shadow's edge, in shares of the thickness the top stands above the Sun's ray
 *   self       how dark a cloud in another's shadow is drawn
 *   liveKm     a top's height from today's picture, km: per unit of its opacity, and what a full storm
 *              top adds (at the equator's clear sky; the few degrees a higher latitude's is colder are not drawn)
 */
export const CLOUD_PARALLAX = {
  realKm: 12, thicker: 3, steps: [0, 4, 8], sunSteps: [0, 2, 4],
  nearKm: [1500, 4000], view: [0.5, 0.85], sun: [0.2, 0.45],
  tanMax: 4, sunTanMax: 4, soft: 0.12, self: 0.5,
  // scene/cloudcompose.js CLEAR_SPAN_C / 6.5, and ( CLEAR_AT_EQUATOR_C - CLEAR_SPAN_C - STORM_TOP.fullC ) / 6.5: its numbers,
  // written out because that module is not on the first visit and this one is (tests/test_cloud_parallax.mjs holds them equal).
  liveKm: [70 / 6.5, 29 / 6.5],
};
const ss01 = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

/** A cloud top's height from today's picture, 0..1 of the slab: its opacity and how much of a storm top it is. */
export function cloudTopFromLive(opacity, stormTop) {
  return Math.min(1, (CLOUD_PARALLAX.liveKm[0] * opacity + CLOUD_PARALLAX.liveKm[1] * stormTop) / CLOUD_PARALLAX.realKm);
}

/** The drawn thickness at a place, km: by the camera's height, the view's zenith cosine there and the Sun's. */
export function cloudDrawnKm(altKm, muV, muS, thicker = CLOUD_PARALLAX.thicker) {
  const C = CLOUD_PARALLAX;
  return C.realKm * thicker * (1 - ss01(C.nearKm[0], C.nearKm[1], altKm)) * Math.max(1 - ss01(C.view[0], C.view[1], muV), 1 - ss01(C.sun[0], C.sun[1], muS));
}

/**
 * The shader's search, in one dimension: `top(x)` is the field, 0..1 of the slab; the ray is at
 * height t (0..1) over x0 + lean * t. Returns where it meets the field coming down from t = 1,
 * `t` of the way up: the place is x0 + lean * t (the ground point's own when the ray does not lean)
 * and t is how high the top is there.
 */
export function cloudSeek(top, x0, lean, steps) {
  let tp = 1;
  let fp = top(x0 + lean * (1 - 1 / steps)) - 1;   // the top of the slab is taken as high as the first read under it
  for (let i = 1; i <= steps; i++) {
    const t = 1 - i / steps;
    const f = top(x0 + lean * t) - t;
    if (f >= 0) return t + (tp - t) * Math.min(1, Math.max(0, f / Math.max(f - fp, 1e-4)));
    tp = t; fp = f;
  }
  return 0;
}

/** How far along the ground the view ray leans on its way up through the slab, km: the drawn thickness times the tangent of its zenith angle. */
export function cloudLeanKm(drawnKm, muV) {
  const m = Math.max(muV, 1 / Math.hypot(1, CLOUD_PARALLAX.tanMax));
  return drawnKm * Math.min(Math.sqrt(Math.max(0, 1 - m * m)) / m, CLOUD_PARALLAX.tanMax);
}

/** How far below the ground's horizon the Sun may be and still light a top `hKm` up, radians: acos( R / ( R + h ) ). */
export function litTopDip(hKm, radiusKm = 6371) {
  return Math.acos(radiusKm / (radiusKm + Math.max(0, hKm)));
}

/** Thin haze should not grey the planet: the cloud coverage is raised to this power first. */
export const CLOUD_GAMMA = 1.35;

/**
 * A new live picture replaces the old one over this long, wall time, so a refresh reads as the
 * weather moving on rather than a pop. Three seconds is long enough to see two frames of the same
 * storm blend and short enough that a visitor looking away misses nothing.
 */
export const LIVE_CROSSFADE_MS = 3000;
/** Static to live and back (the clock moved more than 12 h from the picture, data/gibs.js). */
export const LIVE_SWITCH_MS = 1500;

const DEFAULT_UNIFORMS = {
  nightGain: 2.6,
  nightGlow: 0.42,  // the soft halo round a bright light, as a share of the light itself; 0 = none
  iceSheen: 0.16,   // a faint blue-white lift on ice and snow in daylight; 0 = none
  cloudGamma: CLOUD_GAMMA,
  cloudGain: 0.95,
  specGain: 1.6,
  specPower: 700.0,
  specHalo: 0.25,
  twilightWrap: 0.12,
  ambient: 0.02,
  atmoGain: 1.0,
};

// --- shaders ----------------------------------------------------------------------------------
// Both include the logdepthbuf chunks. r185's define is USE_LOGARITHMIC_DEPTH_BUFFER and three
// sets it on every program when the renderer was made with logarithmicDepthBuffer:true; a custom
// ShaderMaterial that omits the chunks writes ordinary gl_FragCoord.z and z-fights everything
// else in the scene. <tonemapping_fragment> and <colorspace_fragment> are the r155+ names (the
// old <encodings_fragment> is gone); without them the mesh would skip ACES and sRGB output and
// be the one object on screen in the wrong colour space.
//
// Textures come in with colorSpace = SRGBColorSpace, which three uploads as SRGB8_ALPHA8 on
// WebGL2, so texture2D() already returns linear light here. All the maths below is linear.

const P = CLOUD_PARALLAX;

/** Exported with SURFACE_FRAG: scene/tiles.js draws the Earth's close-up tiles with this same pair. */
export const SURFACE_VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vNormalL;
varying vec3 vPosW;
varying vec3 vPosL;   // the ellipsoid point itself, in equatorial radii: the eclipse needs km, not a direction
varying vec3 vCamL;   // the camera in the same axes and units (CLOUD_PARALLAX)

void main() {
  vUv = uv;
  vPosL = position;
  vCamL = ( cameraPosition - modelMatrix[3].xyz ) * mat3( modelMatrix ) / dot( modelMatrix[0].xyz, modelMatrix[0].xyz );
  vNormalL = normalize( position );
  vec4 worldPos = modelMatrix * vec4( position, 1.0 );
  vPosW = worldPos.xyz;
  vNormalW = normalize( mat3( modelMatrix ) * normal );   // uniform scale: no normal matrix needed
  gl_Position = projectionMatrix * viewMatrix * worldPos;
  #include <logdepthbuf_vertex>
}
`;

/** Exported for tests/test_eclipse.mjs, which checks the eclipse formula is spliced in. */
export const SURFACE_FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>

uniform sampler2D uDay;
uniform sampler2D uNight;
uniform sampler2D uClouds;
uniform float uHasDay;
uniform float uHasNight;
uniform float uHasClouds;
// The live clouds (2026-09-28): two pictures, R = opacity and G = how much of the place they cover
// (scene/cloudcompose.js), cross-faded by uLiveFade; uLive fades the whole live layer in and out
// over the static map. Where G is below 1 -- 6.5 E to 60.6 E, which no satellite in NASA GIBS
// sees, and the poles -- the static map shows through, so the seam is a blend, not an edge.
uniform sampler2D uLiveA;
uniform sampler2D uLiveB;
uniform float uLiveFade;
uniform float uLive;
// 2026-09-28, the 4k tier (scene/texturetiers.js). uWater is a real land/water mask, one channel,
// 1 = water; until it arrives (and on a phone, which never fetches it) the ocean is guessed from the
// day map's colour as before. uNightMono is 1 when the night map is one grey channel uploaded as R8
// (a quarter of the GPU memory of RGBA), whose bytes are still sRGB-encoded and are decoded here.
uniform sampler2D uWater;
uniform float uHasWater;
uniform float uNightMono;
// 2026-10-08, relief (EARTH_RELIEF in scene/earth.js): the height map, one channel, and its gain,
// its texel's width and its texel's height. A gain of 0 is no relief: tier 0, the latch, not yet here.
uniform sampler2D uHeight;
uniform vec3  uHeightK;
// CLOUD_PARALLAX: the view's steps (0: the flat layer), the Sun's, the drawn thickness over the radius.
uniform vec3  uCloudPar;

uniform vec3  uSunDir;        // unit, scene/world axes
uniform vec3  uSunDirLocal;   // unit, mesh-local (= earth-fixed) axes
uniform vec2  uCloudOffset;
uniform vec3  uNightTint;
uniform vec3  uAtmoTint;
uniform vec2  uTerminator;
uniform vec2  uOceanMask;
uniform float uNightGain;
uniform vec3  uNightCore;
uniform float uNightGlow;
uniform float uIceSheen;
uniform float uCloudGain;
uniform float uSpecGain;
uniform float uSpecPower;
uniform float uSpecHalo;
uniform float uTwilightWrap;
uniform float uAmbient;
uniform float uCloudHOverR;
uniform float uCloudGamma;

// Spec 0037, 2026-09-23: the Moon's shadow. uEclipse is 0 except within 1.7 degrees of a new Moon
// lined up with the Sun (scene/eclipse.js eclipseLikely, once a frame in JS) and never under the
// frame latch, and a branch on a uniform is one the GPU skips whole: outside an eclipse this costs
// a compare per fragment.
uniform float uEclipse;
uniform float uEclipseLines;  // 1: the shadow's two edges are drawn as lines; 0: the light only
uniform vec3  uMoonPosLocal;  // the Moon's centre from the Earth's, km, mesh-local (= earth-fixed) axes
uniform float uMoonRadiusKm;
uniform float uSunDistKm;     // the Sun's centre from the Earth's, km; its direction is uSunDirLocal

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vNormalL;
varying vec3 vPosW;
varying vec3 vPosL;
varying vec3 vCamL;

const float EARTH_UNIT_KM = ${WGS84_A_KM};
${ECLIPSE_GLSL}
${EARTH_AERIAL_GLSL}

// Cloud coverage at a point: the static map at its drifted uv, and over it the live picture at the
// uv it was photographed at. uLive is a uniform, so outside the live layer this is today's one fetch.
// gTops: how much of a storm top the last place read is (the live picture's third channel; STORM_TOPS).
float gTops = 0.0;
float cloudCover( vec2 uv ) {
  float c = pow( texture2D( uClouds, uv + uCloudOffset ).r, uCloudGamma ) * uHasClouds;
  gTops = 0.0;
  if ( uLive > 0.0 ) {
    vec3 l = mix( texture2D( uLiveA, uv ).rgb, texture2D( uLiveB, uv ).rgb, uLiveFade );
    c = mix( c, pow( l.r, uCloudGamma ), l.g * uLive );
    gTops = l.b * l.g * uLive;
  }
  return c;
}
// CLOUD_PARALLAX. A place's cloud: x its coverage and y its storm top, as cloudCover() has them,
// and z its top's height, 0..1 of the slab. At a stated mip level: it is read inside loops, and
// a read toward the Sun is as wide as its step. The static map is not read where today's picture covers.
vec2 gCloudPx;      // today's picture's size in texels
float gCloudLodS;   // the static map's mip level over today's picture's
vec3 cloudAt( vec2 uv, float lod ) {
  vec3 l = vec3( 0.0 );
  if ( uLive > 0.0 ) {
    l = textureLod( uLiveB, uv, lod ).rgb;
    if ( uLiveFade < 1.0 ) l = mix( textureLod( uLiveA, uv, lod ).rgb, l, uLiveFade );
    l.g *= uLive;
  }
  vec3 c = vec3( 0.0 );
  if ( l.g < 0.999 ) {
    float m = textureLod( uClouds, uv + uCloudOffset, lod + gCloudLodS ).r;
    c = vec3( pow( m, uCloudGamma ), 0.0, m ) * uHasClouds;
  }
  return mix( c, vec3( pow( l.r, uCloudGamma ), l.b, min( ${(P.liveKm[0] / P.realKm).toFixed(4)} * l.r + ${(P.liveKm[1] / P.realKm).toFixed(4)} * l.b, 1.0 ) ), l.g );
}
float cloudLod( vec2 a, vec2 b ) {
  a *= gCloudPx;
  b *= gCloudPx;
  return 0.5 * log2( max( max( dot( a, a ), dot( b, b ) ), 1e-9 ) );
}
// How much cloud stands between a point h0 up (0..1 of the slab) and the Sun; lean: the uv the Sun's ray crosses on its way to the top.
float cloudShadow( vec2 uv, float h0, vec2 lean, float lod ) {
  float s = 0.0;
  vec2 d = lean * ( 1.0 - h0 );
  for ( int i = 0; i < 4; i++ ) {
    if ( float( i ) >= uCloudPar.y ) break;
    float t = ( float( i ) + 0.6 ) / uCloudPar.y;
    t *= t;
    vec3 c = cloudAt( uv + d * t, max( lod, cloudLod( d * t * 0.7, vec2( 0.0 ) ) ) );
    s = max( s, c.x * smoothstep( 0.0, ${P.soft.toFixed(2)}, c.z - h0 - ( 1.0 - h0 ) * t ) );
  }
  return s;
}
// The night map's light at a point, as the lights above read it.
float nightLumAt( vec2 uv ) {
  vec4 t = texture2D( uNight, uv );
  return mix( dot( t.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ), pow( t.r, 2.2 ), uNightMono );
}

void main() {
  #include <logdepthbuf_fragment>

  vec3 n = normalize( vNormalW );
  vec3 viewDir = normalize( cameraPosition - vPosW );

  float sunDot  = dot( n, uSunDir );
  float dayMix  = smoothstep( uTerminator.x, uTerminator.y, sunDot );
  // Wrapped, not clamped: plain max(N.L, 0) takes bright ice and cloud from grey to black in a
  // few pixels, and with the Sun side-on the terminator projects to a ruler-straight line. The
  // wrap lets light fall off across the twilight band instead, the same term for ground and cloud.
  float lambert = clamp( ( sunDot + uTwilightWrap ) / ( 1.0 + uTwilightWrap ), 0.0, 1.0 ) * dayMix;
  // Low sun reddens, by the air its light has crossed (aerial perspective, scene/atmosphere.js):
  // white overhead, gold a few degrees up, a dim warm grey at the horizon -- the beam and the
  // sky's own light. It was a fixed warm tint.
  vec3 sunTint = aerDaylight( sunDot );
  float eclLight = 1.0;

  // ---- the Moon's shadow (spec 0037) ------------------------------------------------------------
  // The fraction of the Sun's disc the Moon covers from THIS point, from the true positions: no cone
  // and no decal. Both day terms fall with it, so the night map's cities come up under the umbra
  // through the ordinary day/night mix, the clouds and the ocean glint go dark with the ground, and
  // the penumbra is simply the gradient the overlap gives.
  //
  // THE TWO EDGES, DRAWN (public #273, 2026-10-08). The shading above is the light, and the light
  // is honest and hard to read: half the Sun covered is half the daylight, which a screen shows as
  // a slight greying, and the core is ten pixels of dark with city lights in it -- "a smudge".
  // So the shadow's two edges are also drawn as thin lines: a pale one where the discs first touch
  // (the whole shadow, about 7 000 km across) and a brighter one round the core, where the Sun is
  // wholly covered or, at an annular eclipse, where the ring is whole. The lines are a DRAWING on a
  // computed place -- nobody sees a rim of light round the umbra -- and the trip's note says so
  // (copy/en.js trip.eclipseLine). Each is about a pixel wide by the screen derivative of
  // the separation, and the core's line waits until the core is a few pixels across: over a core
  // smaller than its own line it would paint the dark spot bright.
  float eclCoreLine = 0.0;
  float eclEdgeLine = 0.0;
  if ( uEclipse > 0.5 ) {
    // The geometry and its screen derivative are taken on both sides of the terminator: a derivative
    // inside a branch on a varying is undefined, and the day-side test below is one.
    vec2 eclG = eclGeometry( vPosL * EARTH_UNIT_KM, uSunDirLocal * uSunDistKm, uMoonPosLocal, SUN_RADIUS_KM, uMoonRadiusKm );
    float eclW = max( fwidth( eclG.x ), 1e-5 ) * 1.1;
    if ( sunDot > 0.0 ) {
      float eclObs = eclDiscOverlap( eclG.x, eclG.y );
      float eclShade = 1.0 - UMBRA_DEPTH * eclObs;
      dayMix  *= eclShade;
      lambert *= eclShade;
      eclLight = eclShade;
      float eclCoreR = abs( 1.0 - eclG.y );
      float eclDay = smoothstep( 0.0, 0.08, sunDot );
      eclCoreLine = eclDay * ( 1.0 - smoothstep( 0.0, eclW, abs( eclG.x - eclCoreR ) ) ) * smoothstep( 2.0, 4.0, eclCoreR / eclW );
      eclEdgeLine = eclDay * ( 1.0 - smoothstep( 0.0, eclW, abs( eclG.x - ( 1.0 + eclG.y ) ) ) );
    }
  }

  // ---- cloud shadow offset -------------------------------------------------------------------
  // Step the cloud lookup TOWARDS the Sun by the deck height times the tangent of the Sun's
  // zenith angle, expressed in uv. Cheap, and it reads correctly: overhead sun, no offset;
  // low sun, long shadows thrown west or east as the case may be.
  vec3 nl    = normalize( vNormalL );
  vec3 east  = normalize( cross( vec3( 0.0, 1.0, 0.0 ), nl ) );
  vec3 north = cross( nl, east );
  float cosLat = max( sqrt( max( 1.0 - nl.y * nl.y, 0.0 ) ), 0.2 );
  float up = max( dot( uSunDirLocal, nl ), 0.15 );
  vec2 shadowStep = vec2(
    ( dot( uSunDirLocal, east  ) / up ) * uCloudHOverR / ( 6.28318531 * cosLat ),
    ( dot( uSunDirLocal, north ) / up ) * uCloudHOverR / 3.14159265
  );
  shadowStep = clamp( shadowStep, vec2( -0.02 ), vec2( 0.02 ) );

  // The cloud map is a MASK, not a colour: it is uploaded with NoColorSpace so these are the
  // encoded bytes, which is the perceptual coverage the artwork was drawn as. Decoded to linear
  // its mean would fall from 0.28 to 0.065 and the deck would all but vanish. The live pictures
  // are built in the same sense (scene/cloudcompose.js), so one gamma serves both.
  float shade  = cloudCover( vUv + shadowStep );
  // A storm top stands about twice as high as the deck and throws its shadow twice as far.
  if ( uLive > 0.0 ) {
    vec2 far = vUv + shadowStep * ${STORM_TOPS.shadow.toFixed(1)};
    vec3 lf = mix( texture2D( uLiveA, far ).rgb, texture2D( uLiveB, far ).rgb, uLiveFade );
    shade = max( shade, lf.b * lf.g * uLive );
  }
  float cloud  = cloudCover( vUv );
  float tops   = gTops;

  // ---- clouds that stand up (CLOUD_PARALLAX) ---------------------------------------------------
  // cDrawn: the drawn thickness here over the radius. 0 is everything above, untouched.
  float cDrawn = 0.0;
  float cTop = 0.0;
  float cSelf = 0.0;
  vec3 vL = normalize( vCamL - vPosL );
  float lod = 0.0;
  if ( uCloudPar.x > 0.0 ) {
    // The view's footprint on today's picture, taken here: a derivative under a branch on a varying is undefined.
    gCloudPx = vec2( textureSize( uLiveB, 0 ) );
    gCloudLodS = log2( float( textureSize( uClouds, 0 ).x ) / gCloudPx.x ) - 1.0;
    lod = cloudLod( dFdx( vUv ), dFdy( vUv ) );
    cDrawn = uCloudPar.z * ( 1.0 - smoothstep( ${(P.nearKm[0] / WGS84_A_KM).toFixed(4)}, ${(P.nearKm[1] / WGS84_A_KM).toFixed(4)}, length( vCamL ) - 1.0 ) )
           * max( 1.0 - smoothstep( ${P.view[0].toFixed(2)}, ${P.view[1].toFixed(2)}, dot( vL, nl ) ), 1.0 - smoothstep( ${P.sun[0].toFixed(2)}, ${P.sun[1].toFixed(2)}, dot( uSunDirLocal, nl ) ) );
  }
  if ( cDrawn > 0.0 ) {
    vec2 perKm = cDrawn * vec2( 1.0 / ( 6.28318531 * cosLat ), 1.0 / 3.14159265 );
    vec2 lean = vec2( dot( vL, east ), dot( vL, north ) ) / max( dot( vL, nl ), ${(1 / Math.hypot(1, P.tanMax)).toFixed(4)} ) * perKm;
    float tp = 1.0;
    float fp = 0.0;
    float tHit = 0.0;
    for ( int i = 1; i <= 8; i++ ) {
      float t = max( 1.0 - float( i ) / uCloudPar.x, 0.0 );
      float f = cloudAt( vUv + lean * t, lod ).z - t;
      if ( i == 1 ) fp = f + t - 1.0;   // the top of the slab is taken as high as the first read under it
      if ( f >= 0.0 ) { tHit = t + ( tp - t ) * clamp( f / max( f - fp, 1e-4 ), 0.0, 1.0 ); break; }
      tp = t;
      fp = f;
    }
    vec2 cUv = vUv + lean * tHit;
    vec3 c = cloudAt( cUv, lod );
    float k = cDrawn / uCloudPar.z;
    vec2 sunLean = vec2( dot( uSunDirLocal, east ), dot( uSunDirLocal, north ) ) / max( dot( uSunDirLocal, nl ), ${(1 / Math.hypot(1, P.sunTanMax)).toFixed(4)} ) * perKm;
    // Under solid cloud the ground is not seen and its shadow is not looked for.
    if ( c.x < 0.97 ) shade = mix( shade, cloudShadow( vUv, 0.0, sunLean, lod ), k );
    cloud = c.x;
    tops = c.y;
    cTop = tHit;
    if ( cloud > 0.02 ) cSelf = k * cloudShadow( cUv, cTop, sunLean, lod );
  }

  // ---- ground ---------------------------------------------------------------------------------
  vec3 dayTex = mix( vec3( 0.04, 0.08, 0.15 ), texture2D( uDay, vUv ).rgb, uHasDay );
  float oceanGuess = smoothstep( uOceanMask.x, uOceanMask.y, dayTex.b - dayTex.r )
                   * smoothstep( uOceanMask.x * 0.5, uOceanMask.y, dayTex.b - dayTex.g );
  // The real mask counts frozen sea as water, and ice is not a mirror: brightness above what any
  // open water reaches (the graded ocean is ~0.05 linear) takes the glint off it.
  float oceanReal = texture2D( uWater, vUv ).r
                  * ( 1.0 - smoothstep( 0.18, 0.40, dot( dayTex, vec3( 0.2126, 0.7152, 0.0722 ) ) ) );
  float ocean = mix( oceanGuess, oceanReal, uHasWater );

  // ---- relief (EARTH_RELIEF) --------------------------------------------------------------------
  // The ground's slope east and north, from the height map by two differences, tips the normal the
  // daylight is worked out with; the result is the daylight there over the daylight on level
  // ground. The silhouette is still the ellipsoid's, water is level, and nothing casts a shadow.
  float reliefLit = 1.0;
  if ( uHeightK.x > 0.0 ) {
    float vE = texture2D( uHeight, vUv + vec2( uHeightK.y, 0.0 ) ).r;
    float vW = texture2D( uHeight, vUv - vec2( uHeightK.y, 0.0 ) ).r;
    float vN = texture2D( uHeight, vUv + vec2( 0.0, uHeightK.z ) ).r;
    float vS = texture2D( uHeight, vUv - vec2( 0.0, uHeightK.z ) ).r;
    float land = 1.0 - mix( oceanGuess, texture2D( uWater, vUv ).r, uHasWater );
    vec2 slope = uHeightK.x * land * vec2( ( vE * vE - vW * vW ) / cosLat, vN * vN - vS * vS );
    vec3 nR = normalize( nl - slope.x * east - slope.y * north );
    float sunUp = dot( uSunDirLocal, nl );
    float ratio = clamp( dot( uSunDirLocal, nR ) / max( sunUp, ${EARTH_RELIEF.sunFloor.toFixed(2)} ), ${EARTH_RELIEF.min.toFixed(2)}, ${EARTH_RELIEF.max.toFixed(2)} );
    reliefLit = mix( 1.0, ratio, smoothstep( 0.0, 0.06, sunUp ) );
  }
  vec3 ground = dayTex * ( lambert * reliefLit * sunTint * ( 1.0 - 0.55 * shade * dayMix ) + uAmbient );
  // Ice and snow are not paint: bright, grey ground takes a faint blue-white lift, strongest
  // where the Sun is high, as light scatters inside snow. Illustrative; uIceSheen 0 = none.
  if ( uIceSheen > 0.0 ) {
    float lum = dot( dayTex, vec3( 0.2126, 0.7152, 0.0722 ) );
    float chroma = max( dayTex.r, max( dayTex.g, dayTex.b ) ) - min( dayTex.r, min( dayTex.g, dayTex.b ) );
    float ice = smoothstep( ${ICE_SHEEN.lo.toFixed(2)}, ${ICE_SHEEN.hi.toFixed(2)}, lum ) * ( 1.0 - smoothstep( 0.04, ${ICE_SHEEN.chroma.toFixed(2)}, chroma ) ) * ( 1.0 - cloud );
    ground += dayTex * vec3( 0.82, 0.94, 1.08 ) * ice * uIceSheen * clamp( ( sunDot + 0.25 ) / 0.5, 0.0, 1.0 ) * dayMix;
  }

  // ---- ocean specular --------------------------------------------------------------------------
  // Masked to water and killed under cloud. A tight hot core over a faint wide sheen, both scaled
  // by Schlick Fresnel so the glint brightens and stretches towards the limb. One broad lobe at
  // gain above 1 is what ACES flattened into a white disc the size of a US state.
  // half is a reserved word in GLSL ES, so this vector cannot be called that.
  vec3 halfVec = normalize( uSunDir + viewDir );
  float nh = max( dot( n, halfVec ), 0.0 );
  float fresnel = 0.02 + 0.98 * pow( 1.0 - clamp( dot( viewDir, halfVec ), 0.0, 1.0 ), 5.0 );
  float lobe = pow( nh, uSpecPower ) + uSpecHalo * pow( nh, uSpecPower * 0.08 );
  float spec = lobe * ( 0.35 + 0.65 * fresnel ) * ocean * dayMix * ( 1.0 - cloud ) * uSpecGain;
  vec3 specular = vec3( 0.62, 0.84, 1.0 ) * sunTint * spec;

  // ---- night lights ----------------------------------------------------------------------------
  float nightAmt = 1.0 - dayMix;
  vec4 nightTex = texture2D( uNight, vUv );
  float lit = mix( dot( nightTex.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ), pow( nightTex.r, 2.2 ), uNightMono ) * uHasNight;
  vec3 cities = uNightTint * lit * uNightGain * pow( nightAmt, 1.5 ) * ( 1.0 - cloud * 0.75 );

  // Regional colour by brightness, and a soft halo round the brightest lights (illustrative; the
  // uniforms are 0 to turn either off, and the line above is the whole of the old look).
  if ( uNightGlow > 0.0 && nightAmt > 0.01 ) {
    float lit0 = smoothstep( 0.35, 0.9, lit );
    cities = mix( cities, uNightCore * lit * uNightGain * pow( nightAmt, 1.5 ) * ( 1.0 - cloud * 0.75 ), 0.55 * lit0 );
    // The halo: the map read at four points a few tens of kilometres round, no brighter than a share of the light.
    vec2 d = vec2( 0.0018, 0.0036 );
    float h = nightLumAt( vUv + vec2( d.x, 0.0 ) ) + nightLumAt( vUv - vec2( d.x, 0.0 ) )
            + nightLumAt( vUv + vec2( 0.0, d.y ) ) + nightLumAt( vUv - vec2( 0.0, d.y ) );
    cities += uNightTint * ( 0.25 * h * uHasNight ) * uNightGain * uNightGlow * pow( nightAmt, 1.5 ) * ( 1.0 - cloud * 0.75 );
  }

  vec3 colour = ground + specular + cities;

  // ---- clouds on top ----------------------------------------------------------------------------
  // A cloud stands above most of the air, so the low Sun's light reaches it less reddened than the
  // ground's (the gas above 8 km only); and a storm top (STORM_TOPS) stands higher still: the Sun
  // sets on it later by the horizon's dip from up there, its light has crossed less air again, and
  // it is whiter. With no storm top this is the deck's light exactly.
  // CLOUD_PARALLAX, the last light: a top h up loses the Sun acos( R / ( R + h ) ) past the ground's
  // horizon, which is sqrt( 2 h / R ) to a part in a thousand here, at its DRAWN height. Its colour
  // is the light's at the ground's own Sun (tintDot), so a top lit over the dark is a red one.
  float topDot = sunDot + ${STORM_TOPS.dip.toFixed(3)} * tops;
  float tintDot = topDot;
  topDot = max( topDot, sunDot + sqrt( 2.0 * cTop * cDrawn ) );
  float dayTop = smoothstep( uTerminator.x, uTerminator.y, topDot ) * eclLight;
  float lambertTop = clamp( ( topDot + uTwilightWrap ) / ( 1.0 + uTwilightWrap ), 0.0, 1.0 ) * dayTop;
  vec3 cloudSun = aerSunAbove( tintDot, mix( ${AERIAL.deckShare.toFixed(3)}, ${AERIAL.topShare.toFixed(3)}, tops ) );
  vec3 cloudLight = cloudSun * lambertTop * ( 0.95 + ${STORM_TOPS.bright.toFixed(2)} * tops ) * ( 1.0 - ${P.self.toFixed(2)} * cSelf ) + uAmbient * 2.0;
  float cloudAlpha = clamp( cloud * ( uCloudGain + 0.05 * tops ) * ( 0.06 + 0.94 * dayTop ), 0.0, 1.0 );
  colour = mix( colour, cloudLight, cloudAlpha );

  // ---- the air over the disc (aerial perspective, scene/atmosphere.js) ---------------------------
  // Everything so far is seen through the air between it and the camera, and that air is lit: a
  // little over the middle of the disc, most of what there is to see at the limb. A cloud has
  // only the air above it in the way. This was a rim in one colour.
  float airLit = smoothstep( -0.14, 0.02, sunDot ) * eclLight;
  colour = aerial( colour, clamp( dot( n, viewDir ), 0.0, 1.0 ), sunDot, dot( -viewDir, uSunDir ), airLit, 1.0 - 0.6 * cloudAlpha );

  // The shadow's two edges (THE TWO EDGES, DRAWN, above): over the clouds, as a line on a map is.
  colour += uEclipseLines * ( vec3( 1.0, 0.93, 0.8 ) * 0.42 * eclCoreLine + vec3( 0.8, 0.86, 1.0 ) * 0.14 * eclEdgeLine );

  gl_FragColor = vec4( colour, 1.0 );

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * The shell's air is scene/atmosphere.js's now (spec 0053 task 1, 2026-10-08): EARTH_AIR,
 * createEarthAir() and the table of the light's path. The name is kept for who reads it.
 */
export const ATMO_HEIGHT_GAIN = EARTH_AIR.heightGain;

// --- construction ------------------------------------------------------------------------------

const _q = new THREE.Quaternion();

function asTexture(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const tex = new THREE.TextureLoader().load(value);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }
  return value;
}

/**
 * A WGS84 ellipsoid carrying SphereGeometry's uv layout, in units of the equatorial radius.
 *
 * Every vertex is placed by the SAME function ground sites are placed by, read straight off its
 * own uv: u -> longitude (u = 0.5 is the prime meridian), uv.y -> GEODETIC latitude (uv.y = 1 is
 * the north pole, which is the top row of an equirectangular image because three flips Y). So the
 * texture, the geometry and frames.geodeticToEcef cannot disagree -- there is only one formula.
 *
 * Local axes are the ECEF axes after the scene remap (x, z, -y), i.e. +X at longitude 0, +Y at
 * the north pole, -Z at longitude 90 E, which is what makes mesh.rotation.y = GMST the whole of
 * the earth-fixed to earth-inertial transform.
 */
function ellipsoidGeometry(widthSegments, heightSegments) {
  const geo = new THREE.SphereGeometry(1, widthSegments, heightSegments);
  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const lonRad = (uv.getX(i) - 0.5) * Math.PI * 2;
    const latRad = (uv.getY(i) - 0.5) * Math.PI;
    const e = geodeticToEcef(latRad, lonRad, 0);
    pos.setXYZ(i, e.x / WGS84_A_KM, e.z / WGS84_A_KM, -e.y / WGS84_A_KM);
    // The geodetic normal, exactly: it is the direction the latitude was defined against.
    const cl = Math.cos(latRad);
    nrm.setXYZ(i, cl * Math.cos(lonRad), Math.sin(latRad), -cl * Math.sin(lonRad));
  }
  pos.needsUpdate = true;
  nrm.needsUpdate = true;
  geo.computeBoundingSphere();
  return geo;
}

/** Has this texture an image the GPU can take yet? A TextureLoader texture has none until it decodes. */
function textureReady(tex) {
  const img = tex && tex.image;
  return !!(img && (img.width || img.naturalWidth || (img.data && img.data.length)));
}

/** How long a map takes to come up once it has decoded, so it arrives rather than pops. */
export const MAP_FADE_MS = 400;

/**
 * Once a frame, until nothing is pending: a decoded map either takes its slot (the full day map
 * over the placeholder, same colours, so no fade) or ramps its flag 0 -> 1 over MAP_FADE_MS.
 * Wall time, not app time: a clock held still must not hold a texture back.
 */
function settleMaps(mesh, u) {
  const pending = mesh.userData && mesh.userData.pendingMaps;
  if (!pending || pending.length === 0) return;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  for (let i = pending.length - 1; i >= 0; i--) {
    const job = pending[i];
    if (!textureReady(job.tex) && !textureReady(job.alt)) continue;
    if (job.slot) {
      u[job.slot].value = job.tex;
      if (job.replaces && job.replaces.dispose) job.replaces.dispose();
      pending.splice(i, 1);
      continue;
    }
    if (job.startedAt === undefined) job.startedAt = now;
    const k = Math.min(1, (now - job.startedAt) / MAP_FADE_MS);
    u[job.flag].value = k;
    if (k >= 1) pending.splice(i, 1);
  }
}

function blank() {
  // A 1x1 black texture, so the sampler is always bound even before the JPEG lands and the
  // shader never reads an undefined uniform. Earth draws in the first frame either way.
  const tex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  tex.needsUpdate = true;
  return tex;
}

/**
 * @param {object} textures  { day, night, clouds } -- THREE.Texture or url string, any may be
 *                           missing (the mesh still draws; the missing layer is simply absent).
 *                           dayMap / nightMap / cloudMap are accepted as aliases.
 * @param {object} [opts]    { radius, segments, ...gain overrides }
 * @returns {THREE.Mesh}     radius 1; scale it yourself. The atmosphere shell is a child and is
 *                           also on mesh.userData.atmosphere.
 */
export function createEarth(textures, opts = {}) {
  const t = textures || {};
  const dayFull = asTexture(t.day || t.dayMap);
  const night = asTexture(t.night || t.nightMap) || blank();
  const clouds = asTexture(t.clouds || t.cloudMap || t.cloud) || blank();
  // A map that is still downloading samples as black, and the flag said "have it" from the first
  // frame: a black disc with a blue rim until 1 MB landed (#274). Now the day side is the inline
  // placeholder until the full map decodes, and night and clouds fade in when theirs do.
  const canDecode = typeof document !== 'undefined';
  const placeholder = canDecode && dayFull && !textureReady(dayFull) ? asTexture(EARTH_DAY_PLACEHOLDER) : null;
  const day = placeholder || dayFull || blank();
  const pending = [];
  if (placeholder) {
    pending.push({ tex: placeholder, alt: dayFull, flag: 'uHasDay' });
    pending.push({ tex: dayFull, slot: 'uDay', replaces: placeholder });
  }
  if ((t.night || t.nightMap) && !textureReady(night)) pending.push({ tex: night, flag: 'uHasNight' });
  if ((t.clouds || t.cloudMap || t.cloud) && !textureReady(clouds)) pending.push({ tex: clouds, flag: 'uHasClouds' });
  const cfg = Object.assign({}, DEFAULT_UNIFORMS, opts);
  const seg = opts.segments || SEGMENTS;

  // Clouds wrap in u (they cross the antimeridian as they drift) and clamp in v (they must not
  // wrap over the pole).
  clouds.wrapS = THREE.RepeatWrapping;
  clouds.wrapT = THREE.ClampToEdgeWrapping;
  clouds.colorSpace = THREE.NoColorSpace;   // a mask, not a colour -- see the shader

  const material = new THREE.ShaderMaterial({
    name: 'earth-surface',
    vertexShader: SURFACE_VERT,
    fragmentShader: SURFACE_FRAG,
    uniforms: {
      uDay: { value: day },
      uNight: { value: night },
      uClouds: { value: clouds },
      uHasDay: { value: (t.day || t.dayMap) && !placeholder ? 1 : 0 },
      uHasNight: { value: (t.night || t.nightMap) && textureReady(night) ? 1 : 0 },
      uHasClouds: { value: (t.clouds || t.cloudMap || t.cloud) && textureReady(clouds) ? 1 : 0 },
      uWater: { value: blank() },
      uHasWater: { value: 0 },
      uNightMono: { value: 0 },
      uHeight: { value: blank() },
      uHeightK: { value: new THREE.Vector3(0, 1 / 2048, 1 / 1024) },
      uCloudPar: { value: new THREE.Vector3(0, 0, (P.realKm * P.thicker) / WGS84_A_KM) },
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uSunDirLocal: { value: new THREE.Vector3(1, 0, 0) },
      uCloudOffset: { value: new THREE.Vector2(0, 0) },
      uNightTint: { value: new THREE.Color(NIGHT_LIGHTS) },
      uAtmoTint: { value: new THREE.Color(ATMOSPHERE_RIM) },
      uTerminator: { value: new THREE.Vector2(TERMINATOR.start, TERMINATOR.end) },
      uOceanMask: { value: new THREE.Vector2(OCEAN_MASK.lo, OCEAN_MASK.hi) },
      uNightGain: { value: cfg.nightGain },
      uNightCore: { value: new THREE.Color(NIGHT_CORE_LIGHTS) },
      uNightGlow: { value: cfg.nightGlow },
      uIceSheen: { value: cfg.iceSheen },
      uCloudGain: { value: cfg.cloudGain },
      uSpecGain: { value: cfg.specGain },
      uSpecPower: { value: cfg.specPower },
      uSpecHalo: { value: cfg.specHalo },
      uTwilightWrap: { value: cfg.twilightWrap },
      uAmbient: { value: cfg.ambient },
      uCloudHOverR: { value: CLOUD_H_OVER_R },
      uCloudGamma: { value: cfg.cloudGamma },
      uLiveA: { value: blankLive() },
      uLiveB: { value: blankLive() },
      uLiveFade: { value: 0 },
      uLive: { value: 0 },
      uEclipse: { value: 0 },
      uEclipseLines: { value: 1 },
      uMoonPosLocal: { value: new THREE.Vector3(384400, 0, 0) },
      uMoonRadiusKm: { value: MOON_RADIUS_KM },
      uSunDistKm: { value: 1.496e8 },
    },
  });

  const mesh = new THREE.Mesh(ellipsoidGeometry(seg.width, seg.height), material);
  mesh.name = 'earth';
  mesh.userData.pendingMaps = pending;
  mesh.userData.kind = 'world';
  mesh.userData.worldId = 'earth';
  mesh.userData.cls = 'measured';
  // The caller scales by THIS, not by the mean radius: local units are equatorial radii.
  mesh.userData.scaleRadiusKm = WGS84_A_KM;
  mesh.renderOrder = 0;

  const atmosphere = createEarthAir({ segments: { width: Math.round(seg.width * 0.75), height: Math.round(seg.height * 0.75) }, gain: cfg.atmoGain });
  mesh.add(atmosphere);
  mesh.userData.atmosphere = atmosphere;

  return mesh;
}

/**
 * The per-frame update. Three things and no state of its own:
 *   1. the earth-fixed frame's rotation, from GMST at tMs -- see the alignment note at the top;
 *   2. the Sun direction, in scene axes and again in mesh-local axes for the cloud shadow;
 *   3. the cloud drift, from APP time. Never Date.now(): a screenshot at a given clock value has
 *      to be reproducible, clouds included.
 *
 * @param {THREE.Mesh}    mesh          from createEarth
 * @param {THREE.Vector3} sunDirScene   unit vector from Earth to the Sun, in scene axes
 * @param {number}        tMs           clock.now()
 */
export function updateEarth(mesh, sunDirScene, tMs) {
  if (!mesh || !mesh.material || !mesh.material.uniforms) return;

  mesh.rotation.y = gmst(new Date(tMs));
  mesh.updateMatrixWorld();

  const u = mesh.material.uniforms;
  settleMaps(mesh, u);
  settleLive(mesh, u);
  if (sunDirScene) {
    u.uSunDir.value.copy(sunDirScene).normalize();
    // Same direction expressed in the mesh's own axes, which are earth-fixed. Used only by the
    // cloud shadow, which needs east/north components at the shaded point.
    mesh.getWorldQuaternion(_q).invert();
    u.uSunDirLocal.value.copy(u.uSunDir.value).applyQuaternion(_q).normalize();
  }

  // Drift only in longitude. A v drift would slide the clouds over the poles, which is wrong and
  // which the ClampToEdge wrap would smear.
  const drift = (tMs / 1000) * CLOUD_DRIFT_U_PER_S;
  u.uCloudOffset.value.set(drift - Math.floor(drift), 0);

  const atmosphere = mesh.userData && mesh.userData.atmosphere;
  if (atmosphere && atmosphere.material && atmosphere.material.uniforms && sunDirScene) {
    atmosphere.material.uniforms.uSunDir.value.copy(u.uSunDir.value);
  }
  if (atmosphere) settleEarthAir(atmosphere, wallNow());
}

// --- live clouds (2026-09-28) ---------------------------------------------------------------------

/** A 1x1 "covers nothing" live texture, so both samplers are bound before any picture arrives. */
function blankLive() {
  const tex = new THREE.DataTexture(new Uint8Array([0, 0]), 1, 1, THREE.RGFormat, THREE.UnsignedByteType);
  tex.needsUpdate = true;
  return tex;
}

const wallNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * A new live cloud picture (scene/liveclouds.js builds it: RG, rows south first). The first one
 * becomes both halves of the cross-fade; every later one fades in over LIVE_CROSSFADE_MS from
 * whatever is on screen, and the picture it replaces is freed once nothing samples it.
 */
export function setLiveClouds(mesh, tex) {
  const u = mesh && mesh.material && mesh.material.uniforms;
  if (!u || !u.uLiveA || !tex) return;
  const live = mesh.userData.live || (mesh.userData.live = { has: false, shown: false, fadeFrom: null, switchFrom: null });
  tex.wrapS = THREE.RepeatWrapping;       // the antimeridian is a seam in the picture, not on the globe
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.NoColorSpace;    // coverage, not colour -- as the static map
  if (!live.has) {
    const oldA = u.uLiveA.value;
    const oldB = u.uLiveB.value;
    u.uLiveA.value = tex;
    u.uLiveB.value = tex;
    u.uLiveFade.value = 1;
    live.has = true;
    if (oldA && oldA.dispose) oldA.dispose();
    if (oldB && oldB !== oldA && oldB.dispose) oldB.dispose();
    return;
  }
  // Mid-fade, the picture on screen is a mix; snapping the fade to B first loses at most the last
  // part of a three-second blend, and it never shows a picture older than the one before.
  const retired = u.uLiveA.value;
  u.uLiveA.value = u.uLiveB.value;
  u.uLiveB.value = tex;
  u.uLiveFade.value = 0;
  live.fadeFrom = wallNow();
  if (retired && retired !== u.uLiveA.value && retired !== tex && retired.dispose) retired.dispose();
}

/** Live clouds on (a picture is held and the clock is near it) or the static map (everything else). */
export function setLiveCloudsShown(mesh, on) {
  const live = mesh && mesh.userData && mesh.userData.live;
  if (!live || !live.has || live.shown === !!on) return;
  live.shown = !!on;
  live.switchFrom = wallNow();
  live.switchStart = mesh.material.uniforms.uLive.value;
}

/** Once a frame: the two fades, on wall time (a paused clock must not hold the weather back). */
function settleLive(mesh, u) {
  const live = mesh.userData && mesh.userData.live;
  if (!live || !u.uLive) return;
  const now = wallNow();
  if (live.fadeFrom !== null) {
    const k = Math.min(1, (now - live.fadeFrom) / LIVE_CROSSFADE_MS);
    u.uLiveFade.value = k;
    if (k >= 1) live.fadeFrom = null;
  }
  if (live.switchFrom !== null) {
    const target = live.shown ? 1 : 0;
    const k = Math.min(1, (now - live.switchFrom) / LIVE_SWITCH_MS);
    u.uLive.value = live.switchStart + (target - live.switchStart) * k;
    if (k >= 1) live.switchFrom = null;
  }
}

const _moonL = new THREE.Vector3();

/**
 * The Moon's shadow, per frame (spec 0037). Call AFTER updateEarth(), which sets the rotation this
 * reads back. `on` is scene/eclipse.js eclipseLikely() and the frame latch, decided by the caller;
 * off, nothing else is touched and the shader takes today's path.
 *
 * @param {THREE.Mesh}    mesh
 * @param {boolean}       on
 * @param {{x,y,z}}       moonKmScene  the Moon's centre from the Earth's, km, SCENE axes (true positions)
 * @param {number}        sunDistKm    the Sun's centre from the Earth's, km
 */
export function updateEarthEclipse(mesh, on, moonKmScene, sunDistKm) {
  if (!mesh || !mesh.material || !mesh.material.uniforms || !mesh.material.uniforms.uEclipse) return;
  const u = mesh.material.uniforms;
  u.uEclipse.value = on && moonKmScene && sunDistKm > 0 ? 1 : 0;
  if (!u.uEclipse.value) return;
  // The same inverse rotation uSunDirLocal went through, so the Sun, the Moon and the ground the
  // fragment stands on are all in the one earth-fixed frame.
  mesh.getWorldQuaternion(_q).invert();
  u.uMoonPosLocal.value.copy(_moonL.set(moonKmScene.x, moonKmScene.y, moonKmScene.z).applyQuaternion(_q));
  u.uSunDistKm.value = sunDistKm;
}

/**
 * Swap in a bigger texture without rebuilding the mesh (spec 0006 requirement 2: the tier
 * upgrades in place, on Wi-Fi, without a reload).
 */
export function setEarthTextures(mesh, textures) {
  if (!mesh || !mesh.material || !mesh.material.uniforms) return;
  const u = mesh.material.uniforms;
  const pairs = [['day', 'uDay', 'uHasDay'], ['night', 'uNight', 'uHasNight'], ['clouds', 'uClouds', 'uHasClouds']];
  for (const [key, slot, flag] of pairs) {
    const tex = asTexture(textures[key]);
    if (!tex) continue;
    const old = u[slot].value;
    if (key === 'clouds') {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.colorSpace = THREE.NoColorSpace;
    }
    u[slot].value = tex;
    u[flag].value = 1;
    if (old && old.dispose && old !== tex) old.dispose();
  }
}

/**
 * The tiered maps (scene/texturetiers.js, 2026-09-28): put `tex` in one slot, or null to put the
 * boot map back. Returns the texture that was there, which the caller keeps: the 2k map is what a
 * latched device goes back to, and it is the caller's to dispose or to keep.
 *
 * Separate from setEarthTextures on purpose: that one is the clouds' path, and a slot swapped here
 * never disposes anything, because the caller may want the old map again.
 *
 * @param {THREE.Mesh} mesh
 * @param {'day'|'night'|'water'|'relief'} slot
 * @param {THREE.Texture|null} tex    null: back to what was there before the first swap
 * @param {{mono?: boolean, px?: number[]}} [opts]   night: the map is one grey channel (RedFormat);
 *                                    relief: the map's size in pixels, which sets its slope gain
 */
export function setEarthMap(mesh, slot, tex, opts = {}) {
  if (!mesh || !mesh.material || !mesh.material.uniforms) return null;
  const u = mesh.material.uniforms;
  const key = { day: 'uDay', night: 'uNight', water: 'uWater', relief: 'uHeight' }[slot];
  if (!key) return null;
  const base = mesh.userData.baseMaps || (mesh.userData.baseMaps = {});
  const old = u[key].value;
  if (!(slot in base)) base[slot] = { tex: old, mono: u.uNightMono.value };
  if (tex) {
    u[key].value = tex;
    if (slot === 'water') u.uHasWater.value = 1;
    if (slot === 'night') u.uNightMono.value = opts.mono ? 1 : 0;
    if (slot === 'relief') {
      const w = (opts.px && opts.px[0]) || 2048;
      const h = (opts.px && opts.px[1]) || w / 2;
      u.uHeightK.value.set(reliefGain(w), 1 / w, 1 / h);
    }
  } else {
    u[key].value = base[slot].tex;
    if (slot === 'water') u.uHasWater.value = 0;
    if (slot === 'night') u.uNightMono.value = base[slot].mono;
    if (slot === 'relief') u.uHeightK.value.x = 0;
  }
  return old;
}

/**
 * How finely the shell's air is marched on this tier, and for good at its coarsest once the frame
 * latch has tripped (scene/atmosphere.js setEarthAirSteps).
 */
export function setEarthAirQuality(mesh, tier, latched = false, how = {}) {
  return setEarthAirSteps(mesh && mesh.userData ? mesh.userData.atmosphere : null, tier, latched, how);
}

/**
 * Clouds that stand up (CLOUD_PARALLAX): told the tier, the latch's removals (or a connection that
 * saves data) and the look, each when it changes; what is not named keeps its last value. Tier 0,
 * `off` and the Measured look are the flat layer: uCloudPar.x is 0 and the shader takes today's
 * path. Returns the view's steps.
 * @param {{tier?: number, off?: boolean, look?: string}} how
 */
export function setEarthCloudHeight(mesh, how = {}) {
  const u = mesh && mesh.material && mesh.material.uniforms;
  if (!u || !u.uCloudPar) return 0;
  const st = Object.assign(mesh.userData.cloudHeight || (mesh.userData.cloudHeight = { tier: 0, off: false, look: 'film' }), how);
  const t = st.off || st.look === 'measured' ? 0 : Math.min(P.steps.length - 1, Math.max(0, st.tier | 0));
  u.uCloudPar.value.x = P.steps[t];
  u.uCloudPar.value.y = P.sunSteps[t];
  return P.steps[t];
}

/** True once every boot map has decoded and taken its slot: a tier swap before that would be undone. */
export function earthMapsSettled(mesh) {
  const pending = mesh && mesh.userData && mesh.userData.pendingMaps;
  return !pending || pending.length === 0;
}

/** Sun direction on the surface, for anyone who wants the sub-solar point. Radians, earth-fixed. */
export function subSolarPoint(sunDirScene, tMs) {
  const g = gmst(new Date(tMs));
  // scene -> earth-inertial -> earth-fixed, then geocentric lat/lon.
  const x = sunDirScene.x;
  const y = -sunDirScene.z;
  const z = sunDirScene.y;
  const cos = Math.cos(g);
  const sin = Math.sin(g);
  const fx = x * cos + y * sin;
  const fy = -x * sin + y * cos;
  const fz = z;
  return {
    latRad: Math.asin(fz / Math.hypot(fx, fy, fz)),
    lonRad: Math.atan2(fy, fx),
  };
}

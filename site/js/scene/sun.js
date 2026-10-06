// scene/sun.js -- the Sun as a star, when the camera is close to it (spec 0055 task 3, public #412).
//
// Contract: createSunDetail({ mesh, camera, sprite? }) ->
//             { update(tMs, share, earthWorld), setRegions(list), latch(), state(), dispose() }
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
//   THE GRAIN -- illustrative. Real granules are about a thousand kilometres across, 1/700 of the
//   radius: on a disc 900 pixels tall they are less than a pixel. What is drawn is a cellular
//   pattern GRAIN_CELLS across the radius (cells of some 17 000 km, nearer the size of
//   supergranules), bright cells with darker lanes, churning slowly. It says "this surface
//   convects"; its scale, contrast and speed are chosen. Not drawn at tier 0.
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
//   pattern seeded by the Carrington rotation number, not today's corona.
//
// The card says all four (copy/en.js drawing.worldSun; the spots' own line when a list is drawn).

import * as THREE from '../../vendor/three.module.min.js';
import { MAX_SPOTS, spotDirection, spotRadiusRad, regionsFresh, CARRINGTON_SYNODIC_DAYS } from '../data/sunregions.js';

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
/** The grain's cells across one radius, and how fast it churns in app seconds (illustrative). */
export const GRAIN_CELLS = 40;
export const GRAIN_CONTRAST = 0.16;
export const GRAIN_PER_S = 1 / 600;
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

export const SUN_FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uMap;
uniform float uHasMap;
uniform vec3 uTint;
uniform float uTime;        // app seconds x GRAIN_PER_S, wrapped
uniform float uGrain;       // 0 far away and at tier 0, 1 close
uniform vec4 uSpots[ ${MAX_SPOTS} ];   // xyz: the group's place on the unit sphere, body-fixed; w: its radius, radians
uniform int uSpotCount;
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
// Cellular noise: the gap between the nearest and the second nearest of a jittered lattice's points
// is small on the borders between cells -- the dark lanes -- and large in a cell's middle.
float cells( vec3 p, float t ) {
  vec3 i = floor( p );
  vec3 f = fract( p );
  float d1 = 8.0;
  float d2 = 8.0;
  for ( int z = -1; z <= 1; z++ ) for ( int y = -1; y <= 1; y++ ) for ( int x = -1; x <= 1; x++ ) {
    vec3 g = vec3( float( x ), float( y ), float( z ) );
    vec3 o = hash3( i + g );
    o = 0.5 + 0.38 * sin( 6.2831853 * ( o + t ) );
    vec3 r = g + o - f;
    float d = dot( r, r );
    if ( d < d1 ) { d2 = d1; d1 = d; } else if ( d < d2 ) { d2 = d; }
  }
  return sqrt( d2 ) - sqrt( d1 );
}

void main() {
  #include <logdepthbuf_fragment>
  vec3 n = normalize( vNormalW );
  float mu = clamp( dot( n, normalize( cameraPosition - vPosW ) ), 0.0, 1.0 );
  vec3 colour = mix( uTint, texture2D( uMap, vUv ).rgb, uHasMap ) * limb( mu );

  vec3 p = normalize( vPosL );
  float lanes = 0.5;
  if ( uGrain > 0.0 ) {
    lanes = smoothstep( 0.0, 0.35, cells( p * ${GRAIN_CELLS.toFixed(1)}, uTime ) );
    // Foreshortened into the limb the cells run together, as they do in a photograph.
    colour *= 1.0 + ${GRAIN_CONTRAST.toFixed(2)} * uGrain * ( lanes - 0.62 ) * smoothstep( 0.05, 0.45, mu );
  }

  for ( int i = 0; i < ${MAX_SPOTS}; i++ ) {
    if ( i >= uSpotCount ) break;
    float a = acos( clamp( dot( p, uSpots[ i ].xyz ), -1.0, 1.0 ) );
    float r = uSpots[ i ].w * ( 1.0 + 0.12 * ( lanes - 0.5 ) * uGrain );   // a ragged edge where the grain is drawn
    float pen = 1.0 - smoothstep( r * 0.85, r, a );
    float umb = 1.0 - smoothstep( r * ${(UMBRA_SHARE * 0.8).toFixed(3)}, r * ${UMBRA_SHARE.toFixed(3)}, a );
    colour *= mix( 1.0, ${PENUMBRA.toFixed(2)}, pen ) * mix( 1.0, ${(UMBRA / PENUMBRA).toFixed(4)}, umb );
  }

  gl_FragColor = vec4( colour, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const CORONA_VERT = /* glsl */`
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
  float turn = fract( angle / 6.2831853 );
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
  float edge = 1.0 - smoothstep( ${(CORONA_RADII * 0.6).toFixed(2)}, ${CORONA_RADII.toFixed(2)}, r );
  float light = ( 0.45 * inner + 0.4 * fall * rays ) * edge * smoothstep( 0.98, 1.01, r );
  vec3 pearl = mix( vec3( 1.0, 0.93, 0.82 ), vec3( 0.86, 0.91, 1.0 ), smoothstep( 1.0, 2.5, r ) );
  gl_FragColor = vec4( pearl * light * ${CORONA_GAIN.toFixed(2)} * uOpacity, 1.0 );
  #include <colorspace_fragment>
}
`;

/**
 * @param {object} opts
 * @param {THREE.Mesh}   opts.mesh    the Sun's own mesh (scene/worlds.js): a unit sphere, +Y its north pole
 * @param {THREE.Camera} opts.camera
 * @param {THREE.Object3D} [opts.sprite]  the round glow it wears far away; faded out while the corona is drawn
 * @param {number} [opts.tier]  0: no grain
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
  const material = new THREE.ShaderMaterial({
    name: 'sun-photosphere',
    vertexShader: SUN_VERT,
    fragmentShader: SUN_FRAG,
    uniforms: {
      uMap: { value: plain.map || null },
      uHasMap: { value: plain.map ? 1 : 0 },
      uTint: { value: plain.color ? plain.color.clone() : new THREE.Color(0xf18833) },
      uTime: { value: 0 },
      uGrain: { value: 0 },
      uSpots: { value: spots },
      uSpotCount: { value: 0 },
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
      uniforms: { uOpacity: { value: 0 }, uNorth: { value: 0 }, uSeed: { value: 0 } },
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

  let latched = false;
  let regions = [];
  let drawn = 0;
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
    if (sprite && sprite.material) sprite.material.opacity = detail ? 0 : spriteOpacity;
  }

  return {
    /**
     * Every frame. `share` is the Sun's disc as a share of half the view's height (worlds.discShare);
     * `earthWorld` the Earth's place in the scene, for the central meridian the spots are counted from.
     */
    update(tMs, share, earthWorld) {
      const detail = !latched && share >= SUN_DETAIL_AT * 0.8; // a little hysteresis under where it was fetched
      wear(detail);
      if (!detail) return;
      const u = material.uniforms;
      if (!u.uHasMap.value && plain.map) { u.uMap.value = plain.map; u.uHasMap.value = 1; }
      const turn = (tMs / 1000) * GRAIN_PER_S;
      u.uTime.value = turn - Math.floor(turn);
      const g = tier >= 1 ? Math.min(1, Math.max(0, (share - GRAIN_FROM) / (GRAIN_FULL - GRAIN_FROM))) : 0;
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
      c.uOpacity.value = Math.min(1, Math.max(0, (share - SUN_DETAIL_AT * 0.8) / (SUN_DETAIL_AT * 0.8)));

      // Today's groups, counted from the meridian that faces the Earth, in the Sun's own axes.
      drawn = 0;
      if (regions.length && earthWorld && regionsFresh(regions[0].observedMs, tMs)) {
        _v.copy(earthWorld);
        mesh.worldToLocal(_v);
        if (_v.lengthSq() > 0) {
          _v.normalize();
          _e[0] = _v.x; _e[1] = _v.y; _e[2] = _v.z;
          for (const region of regions) {
            if (drawn >= MAX_SPOTS) break;
            if (!spotDirection(region, _e, tMs, _s)) break;
            spots[drawn].set(_s[0], _s[1], _s[2], spotRadiusRad(region.areaMsh));
            drawn += 1;
          }
        }
      }
      u.uSpotCount.value = drawn;
    },
    /** data/sunregions.js parseSunRegions(): today's groups, or [] to draw none. */
    setRegions(list) { regions = Array.isArray(list) ? list.slice(0, MAX_SPOTS) : []; },
    /** The frame latch tripped: back to the flat disc and the round glow, for good. */
    latch() { latched = true; wear(false); },
    state() {
      return { on, latched, grain: material.uniforms.uGrain.value, spots: drawn, regions: regions.length,
        observedMs: regions.length ? regions[0].observedMs : null, corona: corona.material.uniforms.uOpacity.value };
    },
    dispose() {
      wear(false);
      mesh.remove(corona);
      corona.geometry.dispose();
      corona.material.dispose();
      material.dispose();
    },
  };
}

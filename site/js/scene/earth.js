// Earth. One sphere, one ShaderMaterial, one child shell for the atmosphere.
//
// Contract:
//   createEarth(textures): THREE.Mesh          -- atmosphere shell attached as a child
//   updateEarth(mesh, sunDirScene, tMs): void
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
//   2. Against the pixels of 2k_earth_daymap.jpg: sampling the texture at the uv this alignment
//      predicts for eight known places (Sahara, Amazon, Australia, mid-Pacific, ...) gives land
//      where there is land and ocean where there is ocean.
//   3. Against the ephemeris: the sub-solar point computed from the rendered geometry
//      (RA(Sun) - GMST) matches the sub-solar longitude from the equation of time.

import * as THREE from '../../vendor/three.module.min.js';
import { gmst, geodeticToEcef } from '../propagate/frames.js';

// --- tunables, all named, none buried in the shader -------------------------------------------

/** Terminator softness, in cos(sun angle). The brief's numbers; ~11 degrees of twilight. */
export const TERMINATOR = { start: -0.08, end: 0.12 };

/** docs/design-language.md night-lights. Cities glow warm; the night map is ADDED, never pasted. */
export const NIGHT_LIGHTS = 0xffc98a;

/** docs/design-language.md atmosphere-rim, additive at ~35 %. */
export const ATMOSPHERE_RIM = 0x6ec3ff;

/** The shell that sells the planet. 1.025 x 6371 km = a 159 km atmosphere, about right. */
export const ATMOSPHERE_SCALE = 1.025;

/**
 * Cloud drift, in texture widths per second of APP time. One lap in eight days.
 * cls: 'illustrative'. The cloud map is a single static snapshot of a day that is over; the drift
 * is decoration and the card must not claim otherwise. At 1x it is 1.4 microns of texture a
 * second -- invisible, correctly -- and it only reads when the clock is scrubbed.
 */
export const CLOUD_DRIFT_U_PER_S = 1 / (8 * 86400);

/** Cloud deck height over Earth's radius: 8 km / 6371 km. Sets how far the cloud shadow steps. */
export const CLOUD_H_OVER_R = 8 / 6371;

/** Sphere tessellation. 96x64 is 6 200 triangles: silhouette-smooth and free. */
export const SEGMENTS = { width: 96, height: 64 };

/**
 * Ocean mask thresholds, in LINEAR light, MEASURED off 2k_earth_daymap.jpg rather than guessed.
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

/** Thin haze should not grey the planet: the cloud coverage is raised to this power first. */
export const CLOUD_GAMMA = 1.35;

const DEFAULT_UNIFORMS = {
  nightGain: 2.6,
  cloudGamma: CLOUD_GAMMA,
  cloudGain: 0.95,
  specGain: 1.25,
  specPower: 90.0,
  ambient: 0.02,
  atmoGain: 0.35,
  atmoPower: 3.0,
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

const SURFACE_VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vNormalL;
varying vec3 vPosW;

void main() {
  vUv = uv;
  vNormalL = normalize( position );
  vec4 worldPos = modelMatrix * vec4( position, 1.0 );
  vPosW = worldPos.xyz;
  vNormalW = normalize( mat3( modelMatrix ) * normal );   // uniform scale: no normal matrix needed
  gl_Position = projectionMatrix * viewMatrix * worldPos;
  #include <logdepthbuf_vertex>
}
`;

const SURFACE_FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>

uniform sampler2D uDay;
uniform sampler2D uNight;
uniform sampler2D uClouds;
uniform float uHasDay;
uniform float uHasNight;
uniform float uHasClouds;

uniform vec3  uSunDir;        // unit, scene/world axes
uniform vec3  uSunDirLocal;   // unit, mesh-local (= earth-fixed) axes
uniform vec2  uCloudOffset;
uniform vec3  uNightTint;
uniform vec3  uAtmoTint;
uniform vec2  uTerminator;
uniform vec2  uOceanMask;
uniform float uNightGain;
uniform float uCloudGain;
uniform float uSpecGain;
uniform float uSpecPower;
uniform float uAmbient;
uniform float uCloudHOverR;
uniform float uCloudGamma;

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vNormalL;
varying vec3 vPosW;

void main() {
  #include <logdepthbuf_fragment>

  vec3 n = normalize( vNormalW );
  vec3 viewDir = normalize( cameraPosition - vPosW );

  float sunDot  = dot( n, uSunDir );
  float dayMix  = smoothstep( uTerminator.x, uTerminator.y, sunDot );
  float lambert = clamp( sunDot, 0.0, 1.0 );

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

  vec2 cuv   = vUv + uCloudOffset;
  // The cloud map is a MASK, not a colour: it is uploaded with NoColorSpace so these are the
  // encoded bytes, which is the perceptual coverage the artwork was drawn as. Decoded to linear
  // its mean would fall from 0.28 to 0.065 and the deck would all but vanish.
  float cloud  = pow( texture2D( uClouds, cuv ).r, uCloudGamma ) * uHasClouds;
  float shade  = pow( texture2D( uClouds, cuv + shadowStep ).r, uCloudGamma ) * uHasClouds;

  // ---- ground ---------------------------------------------------------------------------------
  vec3 dayTex = mix( vec3( 0.04, 0.08, 0.15 ), texture2D( uDay, vUv ).rgb, uHasDay );
  float ocean = smoothstep( uOceanMask.x, uOceanMask.y, dayTex.b - dayTex.r )
              * smoothstep( uOceanMask.x * 0.5, uOceanMask.y, dayTex.b - dayTex.g );
  vec3 ground = dayTex * ( lambert * ( 1.0 - 0.55 * shade * dayMix ) + uAmbient );

  // ---- ocean specular --------------------------------------------------------------------------
  // Blinn-Phong, masked to water, tinted slightly cyan, killed under cloud.
  // half is a reserved word in GLSL ES, so this vector cannot be called that.
  vec3 halfVec = normalize( uSunDir + viewDir );
  float spec = pow( max( dot( n, halfVec ), 0.0 ), uSpecPower )
             * ocean * dayMix * ( 1.0 - cloud * 0.9 ) * uSpecGain;
  vec3 specular = vec3( 0.62, 0.84, 1.0 ) * spec;

  // ---- night lights ----------------------------------------------------------------------------
  float nightAmt = 1.0 - dayMix;
  vec3 nightTex = texture2D( uNight, vUv ).rgb * uHasNight;
  float lit = dot( nightTex, vec3( 0.2126, 0.7152, 0.0722 ) );
  vec3 cities = uNightTint * lit * uNightGain * pow( nightAmt, 1.5 ) * ( 1.0 - cloud * 0.75 );

  vec3 colour = ground + specular + cities;

  // ---- clouds on top ----------------------------------------------------------------------------
  float cloudLight = lambert * 0.95 + uAmbient * 2.0;
  float cloudAlpha = cloud * uCloudGain * ( 0.06 + 0.94 * dayMix );
  colour = mix( colour, vec3( cloudLight ), clamp( cloudAlpha, 0.0, 1.0 ) );

  // ---- a breath of air on the lit limb -----------------------------------------------------------
  float rim = pow( 1.0 - clamp( dot( n, viewDir ), 0.0, 1.0 ), 3.0 );
  colour += uAtmoTint * rim * dayMix * 0.18;

  gl_FragColor = vec4( colour, 1.0 );

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const ATMO_VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>

varying vec3 vNormalW;
varying vec3 vPosW;

void main() {
  vec4 worldPos = modelMatrix * vec4( position, 1.0 );
  vPosW = worldPos.xyz;
  vNormalW = normalize( mat3( modelMatrix ) * normal );
  gl_Position = projectionMatrix * viewMatrix * worldPos;
  #include <logdepthbuf_vertex>
}
`;

// BackSide: we draw the FAR half of the shell, so the outward normal points away from the camera
// and dot(n, viewDir) is negative over the whole visible surface. abs() is therefore not a
// shortcut, it is the correct term: it goes to 0 at the silhouette (full glow) and to 1 straight
// behind the planet (no glow), and Earth's opaque disc hides the middle by depth test alone.
const ATMO_FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>

uniform vec3  uColour;
uniform vec3  uSunDir;
uniform float uIntensity;
uniform float uPower;

varying vec3 vNormalW;
varying vec3 vPosW;

void main() {
  #include <logdepthbuf_fragment>

  vec3 n = normalize( vNormalW );
  vec3 viewDir = normalize( cameraPosition - vPosW );

  float rim = pow( 1.0 - clamp( abs( dot( n, viewDir ) ), 0.0, 1.0 ), uPower );

  // Thicker where the Sun is behind the limb: forward scattering is what makes the day side's
  // edge a bright blue line and the night side's a faint one, rather than a uniform halo.
  float sunDot = dot( n, uSunDir );
  float sunlit = smoothstep( -0.55, 0.30, sunDot );
  float forward = pow( clamp( dot( viewDir, -uSunDir ), 0.0, 1.0 ), 4.0 );

  float glow = rim * ( 0.06 + 0.94 * sunlit ) * ( 1.0 + 0.6 * forward ) * uIntensity;

  gl_FragColor = vec4( uColour * glow, glow );

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

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
  const day = asTexture(t.day || t.dayMap) || blank();
  const night = asTexture(t.night || t.nightMap) || blank();
  const clouds = asTexture(t.clouds || t.cloudMap || t.cloud) || blank();
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
      uHasDay: { value: t.day || t.dayMap ? 1 : 0 },
      uHasNight: { value: t.night || t.nightMap ? 1 : 0 },
      uHasClouds: { value: t.clouds || t.cloudMap || t.cloud ? 1 : 0 },
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uSunDirLocal: { value: new THREE.Vector3(1, 0, 0) },
      uCloudOffset: { value: new THREE.Vector2(0, 0) },
      uNightTint: { value: new THREE.Color(NIGHT_LIGHTS) },
      uAtmoTint: { value: new THREE.Color(ATMOSPHERE_RIM) },
      uTerminator: { value: new THREE.Vector2(TERMINATOR.start, TERMINATOR.end) },
      uOceanMask: { value: new THREE.Vector2(OCEAN_MASK.lo, OCEAN_MASK.hi) },
      uNightGain: { value: cfg.nightGain },
      uCloudGain: { value: cfg.cloudGain },
      uSpecGain: { value: cfg.specGain },
      uSpecPower: { value: cfg.specPower },
      uAmbient: { value: cfg.ambient },
      uCloudHOverR: { value: CLOUD_H_OVER_R },
      uCloudGamma: { value: cfg.cloudGamma },
    },
  });

  const mesh = new THREE.Mesh(ellipsoidGeometry(seg.width, seg.height), material);
  mesh.name = 'earth';
  mesh.userData.kind = 'world';
  mesh.userData.worldId = 'earth';
  mesh.userData.cls = 'measured';
  // The caller scales by THIS, not by the mean radius: local units are equatorial radii.
  mesh.userData.scaleRadiusKm = WGS84_A_KM;
  mesh.renderOrder = 0;

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, Math.round(seg.width * 0.75), Math.round(seg.height * 0.75)),
    new THREE.ShaderMaterial({
      name: 'earth-atmosphere',
      vertexShader: ATMO_VERT,
      fragmentShader: ATMO_FRAG,
      uniforms: {
        uColour: { value: new THREE.Color(ATMOSPHERE_RIM) },
        uSunDir: { value: new THREE.Vector3(1, 0, 0) },
        uIntensity: { value: cfg.atmoGain },
        uPower: { value: cfg.atmoPower },
      },
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  atmosphere.name = 'earth-atmosphere';
  atmosphere.scale.setScalar(ATMOSPHERE_SCALE);
  atmosphere.renderOrder = 1;
  atmosphere.userData.kind = 'atmosphere';
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

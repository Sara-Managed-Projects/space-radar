// scene/deep/homunculus.js -- the Homunculus Nebula round Eta Carinae, from its published 3D model. Fetched by
// scene/deep/deepsky.js when the nebula is near (scene/deep/heroes.js); never at boot. scene/deep/helix.js says what a
// hero answers:
//   createHero(THREE, env) -> { group, levels, setLevel(level, share), frame(info), ready(), stats(), card, dispose() }
// Pure, for tests/test_homunculus.mjs: shellOf, polarRadiusLy, sizeAt, lookFor, SHAPE, UNDER_MEASURED, COPY_BLOCK, DRAWN.
//
// WHAT IS MEASURED. The SHAPE is Steffen et al. 2014 (MNRAS 442, 3316): the nebula's outer shell of molecular hydrogen
// rebuilt from the Doppler shift of every point of it in 92 slit positions of ESO's VLT (X-shooter), with the two
// polar holes, the trench round each pole and the two protrusions near the waist that no earlier, axisymmetric model
// had. The mesh is theirs, as ESO distributes it (site/data/deep/homunculus.glb, scripts/build_deep_homunculus.mjs: no
// vertex moved). Its TILT (the polar axis 41.0 +/- 0.5 degrees from our line of sight, the south-east lobe toward us),
// its direction on the sky (position angle 310 degrees), its SIZE (the poles 21 690 au from the star in March 2005)
// and its DISTANCE (2 350 +/- 50 pc) are Smith 2006 (ApJ 644, 1151). It GROWS on the clock: every part of it has
// moved straight out at its own speed since the eruption of the 1840s (Smith 2006: the Doppler speed gives the depth
// as 33.5 au for each km/s, an age of 158.8 years in 2005), so its size at any date is its size then times the
// ratio of the ages; before the eruption it is not there.
//
// WHAT IS NOT. The surface's BRIGHTNESS and its mottling are an illustration of dust lit from inside by the star (the
// real nebula is a reflection nebula, mottled on scales the mesh does not hold): generated, and under the Measured
// look taken off, so that what is left is the reconstruction alone. The star's glare is a mark, not its disc.
//
// HOW IT IS DRAWN. One opaque mesh with depth (dust hides what is behind it), 17 101 triangles, one draw call, and one
// small additive sprite for the star: two calls. The sky frame (x west, y north, z toward the Sun) is placed in the
// scene at the record; inside it the mesh is turned by the two measured angles and scaled to light-years.
import { stage } from '../stage.js';
import { drawnUnder } from '../exposure.js';
import { placeSky, tiltOf, axisOnSky, yearOf } from './skyplace.js';
import { loadMeshFile } from './meshfile.js';
import '../../copy/en.deepdata.js'; // the card's words (deepHomunculus), fetched with the hero

export const COPY_BLOCK = 'deepHomunculus';
export const DRAWN = { 'dso-homunculus-nebula': ['reconstruction', 'illustration'] };
export const UNDER_MEASURED = { shell: 'same', growth: 'same', mottle: 'hidden', star: 'same' };
export const SHAPE = {
  mottle: 9.0,      // the mottling's cells across one polar radius (the photograph's are about a tenth of a lobe)
  depth: 0.42,      // how much darker a lane of the mottling is than a bright cell
  rim: 0.45,        // how much of the light is lost on a wall seen face on, against one seen along (a thin lit shell)
  star: 0.014,      // the star's glare: its half-width as a share of its distance from the camera (a size on the screen)
};
const AU_LY = 1 / 63241.077;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const part = (P, k) => ((P && P.layers) || []).find((l) => l && l.part === k) || {};

/** The profile's shell: its file, the two angles, the polar radius at its epoch and the age then. Pure. */
export function shellOf(profile) {
  const sh = part(profile, 'shell');
  const ax = sh.axis || {};
  const incl = Number(ax.incl_deg), pa = Number(ax.pa_deg);
  return {
    file: sh.file || 'site/data/deep/homunculus.glb',
    incl, pa,
    tilt: tiltOf(incl, pa),               // the mesh's un-tilted frame -> (west, north, toward the Sun)
    farPole: axisOnSky(incl, pa),          // the receding (north-west) pole's direction
    polarAu: Number(sh.polar_radius_au),
    epoch: Number(sh.epoch),
    ageYr: Number(sh.age_yr),
    erupted: Number(sh.epoch) - Number(sh.age_yr),
  };
}

/** The polar radius in light-years at a calendar year: straight-line growth since the eruption; 0 before it. Pure. */
export function polarRadiusLy(shell, year) {
  const age = year - shell.erupted;
  return age > 0 ? shell.polarAu * AU_LY * (age / shell.ageYr) : 0;
}

/**
 * What the nebula measures on the sky at a year, from the mesh's own extent: `along` and `across` in arcseconds (the
 * outline's length along the polar axis' position angle, and its width across it), at `distLy`. `extent` is the
 * mesh's box in the sky frame, in polar radii: {along: [min, max], across: [min, max]}. Pure.
 */
export function sizeAt(shell, year, distLy, extent) {
  const r = polarRadiusLy(shell, year);
  const k = (r / distLy) * (180 / Math.PI) * 3600;
  return { along: (extent.along[1] - extent.along[0]) * k, across: (extent.across[1] - extent.across[0]) * k, polarLy: r };
}

/** The look's switches: the mottling is generated, so the Measured look takes it off. Pure. */
export function lookFor(look) {
  return { mottle: drawnUnder(look || 'film', UNDER_MEASURED.mottle) ? 1 : 0, star: drawnUnder(look || 'film', UNDER_MEASURED.star) ? 1 : 0 };
}

const VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vP;
varying vec3 vNm;
varying vec3 vN;
varying vec3 vV;
void main() {
  vP = position;
  vNm = normal;
  vN = normalMatrix * normal;
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  vV = mv.xyz;
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}`;
const FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uShare;
uniform float uMottle;
uniform float uGain;
varying vec3 vP;
varying vec3 vNm;
varying vec3 vN;
varying vec3 vV;
float hash3( vec3 p ) { p = fract( p * 0.3183099 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
float vnoise( vec3 x ) {
  vec3 i = floor( x ), f = fract( x );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( mix( hash3( i ), hash3( i + vec3( 1, 0, 0 ) ), f.x ), mix( hash3( i + vec3( 0, 1, 0 ) ), hash3( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
              mix( mix( hash3( i + vec3( 0, 0, 1 ) ), hash3( i + vec3( 1, 0, 1 ) ), f.x ), mix( hash3( i + vec3( 0, 1, 1 ) ), hash3( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
}
float screenHash( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); }
void main() {
  // A level's cross-fade without sorting: a fixed screen-door, so the mesh stays opaque and keeps its depth.
  if ( uShare < 0.999 && screenHash( floor( gl_FragCoord.xy ) ) > uShare ) discard;
  #include <logdepthbuf_fragment>
  vec3 n = normalize( vN );
  float along = 1.0 - abs( dot( n, normalize( -vV ) ) );              // 0 face on, 1 at the outline
  float r = length( vP );
  float facing = abs( dot( normalize( vNm ), vP / max( r, 1e-4 ) ) );  // how squarely the wall faces the star
  // Dust lit from inside: a wall that faces the star is brighter, the light thins with distance from it, and a thin
  // lit shell seen along its surface (the outline) shows more of itself than one seen face on.
  float lit = ( 0.42 + 0.58 * facing ) * ( 0.74 + 0.5 * exp( -2.2 * r ) ) * mix( ${(1 - SHAPE.rim).toFixed(2)}, 1.0, along * along );
  // The mottling (generated; uMottle is 0 under the Measured look): cells with darker lanes between them.
  vec3 q = vP * ${SHAPE.mottle.toFixed(1)};
  float m = 0.55 * vnoise( q ) + 0.3 * vnoise( q * 2.13 + 7.1 ) + 0.15 * vnoise( q * 4.7 + 3.3 );
  float cell = smoothstep( 0.3, 0.68, m );
  float mott = mix( 1.0, 1.0 - ${SHAPE.depth.toFixed(2)} * ( 1.0 - cell ), uMottle );
  vec3 warm = vec3( 1.0, 0.86, 0.68 ), lane = vec3( 0.80, 0.50, 0.34 );
  vec3 col = mix( warm, mix( lane, warm, cell ), uMottle * 0.8 ) * lit * mott * uGain;
  gl_FragColor = vec4( col / ( 1.0 + 0.35 * col ), 1.0 );
}`;
const STAR_VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv * 2.0 - 1.0;
  vec4 c = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
  // a billboard of one size on the screen: the star is a point of light at any distance the nebula is drawn from
  c.xy += vUv * ( -c.z * ${SHAPE.star.toFixed(3)} );
  gl_Position = projectionMatrix * c;
}`;
const STAR_FRAG = /* glsl */`
uniform float uShare;
varying vec2 vUv;
void main() {
  float d = length( vUv );
  if ( d > 1.0 ) discard;
  float core = exp( -d * d * 60.0 ), halo = exp( -d * 5.0 ) * 0.35;
  gl_FragColor = vec4( vec3( 1.0, 0.95, 0.85 ) * ( core + halo ) * uShare, 1.0 );
}`;
/** The shader sources, for tests/test_homunculus.mjs. */
export const SHADERS = { vertex: VERT, frag: FRAG, starVertex: STAR_VERT, starFrag: STAR_FRAG };

const fileUrl = (path) => new URL(`../../../${String(path || '').replace(/^site\//, '')}`, import.meta.url).href;

export function createHero(THREE, env = {}) {
  const profile = env.profile || {};
  const group = new THREE.Group();
  group.name = 'deep-hero-homunculus';
  const shell = shellOf(profile);
  const sky = new THREE.Group();          // the sky frame in the scene: a rotation
  sky.name = `${group.name}-sky`;
  sky.matrixAutoUpdate = false;
  group.add(sky);
  const body = new THREE.Group();         // the measured tilt and the size at the clock's date
  body.name = `${group.name}-body`;
  body.matrixAutoUpdate = false;
  sky.add(body);
  let basisFor = null, sizedFor = NaN, radiusLy = 0;

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: { uShare: { value: 0 }, uMottle: { value: 1 }, uGain: { value: 1 } },
    side: THREE.DoubleSide, transparent: false, depthTest: true, depthWrite: true, toneMapped: false,
  });
  mat.name = 'deep-homunculus-shell';
  const starMat = new THREE.ShaderMaterial({
    vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
    uniforms: { uShare: { value: 0 } },
    transparent: true, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending,
  });
  const star = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), starMat);
  star.name = `${group.name}-star`;
  star.frustumCulled = false;
  star.renderOrder = 1;
  body.add(star);

  let mesh = null, geo = null, state = 'loading', counts = { vertices: 0, triangles: 0 };
  const browser = typeof document !== 'undefined';
  const built = (file) => {
    const m = file.meshes[0];
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
    geo.setIndex(new THREE.BufferAttribute(m.indices, 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    counts = { vertices: m.positions.length / 3, triangles: m.indices.length / 3 };
    mesh = new THREE.Mesh(geo, mat);
    mesh.name = `${group.name}-shells`; // the contract's draw-order check knows a deep mesh by `-shells`
    mesh.frustumCulled = false;
    mesh.renderOrder = -1;
    body.add(mesh);
    state = 'ready';
  };
  if (env.mesh) built(env.mesh); // the tests hand the parsed file in
  else if (browser) loadMeshFile(fileUrl(shell.file)).then(built).catch((e) => { state = 'failed'; console.warn('deep: the Homunculus mesh did not load', e); });
  else state = 'none';

  const t = shell.tilt;
  function size(year) {
    radiusLy = polarRadiusLy(shell, year);
    const s = radiusLy;
    body.matrix.set(
      t[0] * s, t[1] * s, t[2] * s, 0,
      t[3] * s, t[4] * s, t[5] * s, 0,
      t[6] * s, t[7] * s, t[8] * s, 0,
      0, 0, 0, 1,
    );
    body.matrixWorldNeedsUpdate = true;
    sizedFor = year;
  }
  size(yearOf(stage.tMs));

  let level = 0, levelShare = 0, last = { mottle: 1, year: sizedFor };
  return {
    group,
    levels: [2, 3],
    latchSafe: true, // one mesh and no march: it costs less than the holder it replaces
    card: { copy: COPY_BLOCK, drawn: DRAWN },
    setLevel(n, share = 1) {
      level = n;
      levelShare = n >= 2 ? clamp(share, 0, 1) : 0;
      group.visible = levelShare > 0;
    },
    frame(info = {}) {
      if (basisFor !== stage.worldId) { basisFor = stage.worldId; placeSky(THREE, sky, env.record, stage); }
      const year = yearOf(stage.tMs);
      if (!(Math.abs(year - sizedFor) < 0.02)) size(year);
      const lk = lookFor(info.look);
      const there = radiusLy > 0 ? levelShare : 0;
      mat.uniforms.uShare.value = there;
      mat.uniforms.uMottle.value = lk.mottle;
      mat.uniforms.uGain.value = clamp(Number.isFinite(info.gain) ? info.gain : 1, 0.6, 1.6);
      starMat.uniforms.uShare.value = there * lk.star;
      if (mesh) mesh.visible = there > 0.002;
      star.visible = there > 0.002;
      last = { mottle: lk.mottle, year };
    },
    ready: () => state !== 'loading',
    stats: () => ({
      level, share: Math.round(levelShare * 100) / 100, mesh: state, meshes: mesh ? 2 : 1, textures: 0, ...counts,
      year: Math.round(last.year * 100) / 100, polarLy: Math.round(radiusLy * 1e4) / 1e4, mottle: last.mottle,
      bytes: geo ? geo.getAttribute('position').array.byteLength * 2 + geo.getIndex().array.byteLength : 0,
    }),
    dispose() {
      if (geo) geo.dispose();
      mat.dispose(); starMat.dispose(); star.geometry.dispose();
      if (group.parent) group.parent.remove(group);
    },
  };
}

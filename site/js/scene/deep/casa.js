// scene/deep/casa.js -- Cassiopeia A from its published 3D reconstruction. Fetched by scene/deep/deepsky.js when the
// remnant is near (scene/deep/heroes.js); never at boot. scene/deep/helix.js says what a hero answers:
//   createHero(THREE, env) -> { group, levels, setLevel(level, share), frame(info), ready(), stats(), card, dispose() }
// Pure, for tests/test_casa.mjs: partsOf, growthOf, shockOf, arcsecLy, lookFor, SHAPE, UNDER_MEASURED, COPY_BLOCK, DRAWN.
//
// WHAT IS MEASURED. Where each kind of debris is, in three dimensions: DeLaney et al. 2010 (ApJ 725, 2038) measured the
// Doppler shift of iron and silicon in X-rays (Chandra) and of argon and silicon in the infrared (Spitzer) at every
// place across the remnant, and, because the debris has flown straight out from one point since the explosion, a
// speed along our line is a distance in front of that point or behind it (0.022 arcseconds for each km/s). The jets
// and the outer knots are optical measurements (Fesen and others). The file, site/data/deep/casa.glb, is the Chandra
// X-ray Center's own export of that model (scripts/build_deep_casa.mjs: thinned to one point a cell, nothing else).
// The colours are Chandra's legend for the model: green iron, yellow argon and silicon with the jets and outer
// debris, red the cold debris seen in the infrared, blue the outer blast wave.
//
// IT GROWS ON THE CLOCK, each part at its own measured rate: the infrared and optical debris is in free expansion
// (0.304 % a year, Thorstensen et al. 2001: an explosion in 1671), the X-ray debris has been slowed (0.208 % a year,
// DeLaney & Rudnick 2003), and the blast wave moves at about 11 million miles an hour (Chandra's 2000 to 2019
// time-lapse). Today's rates are measured; how each part grew before today is a power law through its rate (a model).
//
// WHAT IS NOT. Brightness: the model holds none ("We did not encode brightness information"), so every point of a kind
// is equally bright, and a point's size is the model's own symbol (6 to 15 arcseconds: the data's resolution, not a
// clump's). The BLAST WAVE is a representation, as it is in Chandra's own model: a sphere of the measured radius (153
// arcseconds), which was not mapped by Doppler shift. The neutron star's depth is not measured: it is at zero velocity.
//
// HOW IT IS DRAWN. Two draw calls, additive (hot gas adds light and hides nothing): every part's points in one call,
// each a soft disc, and the blast wave as one thin sphere that shows its rim. The sky frame (x west, y north, z toward
// the Sun) is placed at the record; the points are arcseconds about the explosion's place, scaled to light-years.
import { stage } from '../stage.js';
import { drawnUnder } from '../exposure.js';
import { placeSky, yearOf } from './skyplace.js';
import { loadMeshFile } from './meshfile.js';
import '../../copy/en.deepdata.js'; // the card's words (deepCasA), fetched with the hero

export const COPY_BLOCK = 'deepCasA';
export const DRAWN = { 'dso-cassiopeia-a': ['reconstruction', 'model'] };
export const UNDER_MEASURED = { debris: 'same', growth: 'same', shock: 'same', star: 'same' };
export const SHAPE = {
  minPx: 1.6,       // a point is never drawn smaller than this (its light is kept: thinner, not gone)
  starPx: 5.0,      // the neutron star's mark, CSS px: a point of one size on the screen
  rim: 6.0,         // the blast wave's rim against its face: a thin shell seen along itself, capped at this
  shock: 0.022,     // one wall of the blast wave seen face on, a display value
};
const D2R = Math.PI / 180;
const part = (P, k) => ((P && P.layers) || []).find((l) => l && l.part === k) || {};
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/** Light-years in an arcsecond at a distance. Pure. */
export const arcsecLy = (distLy) => distLy * D2R / 3600;

/** The profile's debris parts, in the file's order: { part, colour [r,g,b], size (arcsec), alpha, rate (% a year), cls }. Pure. */
export function partsOf(profile) {
  const rates = (profile && profile.frame && profile.frame.growth) || {};
  return ((profile && profile.layers) || []).filter((l) => l && l.kind === 'points').map((l) => ({
    part: l.part, colour: (l.colour || [1, 1, 1]).map(Number), size: Number(l.symbol_arcsec) || 6, alpha: Number(l.alpha) || 0.1,
    cls: l.motion === 'slowed' ? 1 : 0, star: l.part === 'neutron-star',
    rate: Number((rates[l.motion === 'slowed' ? 'slowed' : 'free'] || {}).rate_pct_per_yr),
  }));
}

/**
 * How large a part is at a calendar year, as a share of its size at the model's epoch: (age / age then) to the power m,
 * where m is the part's measured rate today times its age then (1 for free expansion: straight-line motion). 0 before
 * the explosion. `growth` is the profile's `frame.growth`: { epoch, exploded, free: {rate_pct_per_yr}, slowed: {...} }. Pure.
 */
export function growthOf(growth, kind, year) {
  const g = growth || {};
  const t0 = Number(g.exploded), epoch = Number(g.epoch);
  const age = year - t0, then = epoch - t0;
  if (!(age > 0) || !(then > 0)) return 0;
  const m = kind === 'free' ? 1 : (Number((g[kind] || {}).rate_pct_per_yr) / 100) * then;
  return Math.pow(age / then, m);
}

/** The blast wave: its radius (arcsec) at the model's epoch, and its rate (% a year) from its measured speed at the record's distance. Pure. */
export function shockOf(profile, distLy) {
  const s = part(profile, 'blast-wave');
  const kmPerLy = 9460730472580.8;
  const arcsecPerYr = (Number(s.speed_km_s) * 365.25 * 86400) / (distLy * kmPerLy) / D2R * 3600;
  return { radius: Number(s.radius_arcsec), colour: (s.colour || [0.3, 0.55, 1]).map(Number), arcsecPerYr, rate: (arcsecPerYr / Number(s.radius_arcsec)) * 100 };
}

/** The look's switches: nothing here is generated, so the Measured look keeps it all. Pure. */
export function lookFor(look) {
  return { debris: drawnUnder(look || 'film', UNDER_MEASURED.debris) ? 1 : 0, shock: drawnUnder(look || 'film', UNDER_MEASURED.shock) ? 1 : 0 };
}

const VERT = /* glsl */`
attribute vec3 aColour;
attribute vec3 aLook;      // x: the symbol's width, arcseconds (0: a mark of one size on the screen); y: its light; z: 1 for the slowed parts
uniform float uGrowFree;
uniform float uGrowSlowed;
uniform float uPxPerRad;   // CSS px a radian on the screen
uniform float uPixelRatio;
uniform float uShare;
varying vec4 vColour;
void main() {
  float grow = mix( uGrowFree, uGrowSlowed, aLook.z );
  vec4 mv = modelViewMatrix * vec4( position * grow, 1.0 );
  gl_Position = projectionMatrix * mv;
  float d = max( -mv.z, 1e-9 );
  float unit = length( modelViewMatrix[0].xyz ); // scene units in an arcsecond
  float ideal = aLook.x > 0.0 ? aLook.x * grow * unit / d * uPxPerRad : ${SHAPE.starPx.toFixed(1)};
  float size = max( ideal, ${SHAPE.minPx.toFixed(1)} );
  // a point held at its smallest size keeps its light: thinner, not brighter
  float keep = ( ideal / size ) * ( ideal / size );
  vColour = vec4( aColour, aLook.y * keep * uShare );
  gl_PointSize = mv.z < 0.0 && grow > 0.0 ? size * uPixelRatio : 0.0;
}`;
const FRAG = /* glsl */`
uniform float uGain;
varying vec4 vColour;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot( q, q );
  if ( r2 > 1.0 ) discard;
  float a = exp( -3.2 * r2 ) * ( 1.0 - r2 );
  gl_FragColor = vec4( vColour.rgb * vColour.a * a * uGain, 1.0 );
}`;
const SHOCK_VERT = /* glsl */`
varying vec3 vN;
varying vec3 vV;
void main() {
  vN = normalMatrix * normal;
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  vV = mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;
const SHOCK_FRAG = /* glsl */`
uniform vec3 uColour;
uniform float uShare;
varying vec3 vN;
varying vec3 vV;
void main() {
  // a thin shell: its light along a line grows as 1 / |cos| toward the rim, capped
  float c = abs( dot( normalize( vN ), normalize( vV ) ) );
  float path = min( ${SHAPE.rim.toFixed(1)}, 1.0 / max( c, 1e-3 ) );
  gl_FragColor = vec4( uColour * ${SHAPE.shock.toFixed(3)} * path * uShare, 1.0 );
}`;
/** The shader sources, for tests/test_casa.mjs. */
export const SHADERS = { vertex: VERT, frag: FRAG, shockVertex: SHOCK_VERT, shockFrag: SHOCK_FRAG };

const fileUrl = (path) => new URL(`../../../${String(path || '').replace(/^site\//, '')}`, import.meta.url).href;

export function createHero(THREE, env = {}) {
  const profile = env.profile || {};
  const group = new THREE.Group();
  group.name = 'deep-hero-casa';
  const distLy = Number((profile.frame || {}).distance_ly) || 11090;
  const unit = arcsecLy(distLy);          // the hero's group is in light-years (deepsky.js placeHero)
  const parts = partsOf(profile);
  const shock = shockOf(profile, distLy);
  const growth = (profile.frame || {}).growth || {};
  const sky = new THREE.Group();          // the sky frame in the scene: a rotation, and arcseconds -> light-years
  sky.name = `${group.name}-sky`;
  sky.matrixAutoUpdate = false;
  group.add(sky);
  let basisFor = null;

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: { uGrowFree: { value: 1 }, uGrowSlowed: { value: 1 }, uPxPerRad: { value: 900 }, uPixelRatio: { value: 1 }, uShare: { value: 0 }, uGain: { value: 1 } },
    // gasmat.js COLOUR_POLICY: display values, no depth write; additive light
    transparent: false, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending,
  });
  mat.name = 'deep-casa-debris';
  const shockMat = new THREE.ShaderMaterial({
    vertexShader: SHOCK_VERT, fragmentShader: SHOCK_FRAG,
    uniforms: { uColour: { value: new THREE.Vector3(...shock.colour) }, uShare: { value: 0 } },
    transparent: false, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, // both walls from outside, the far one from inside
  });
  shockMat.name = 'deep-casa-blast-wave';
  const shockMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), shockMat);
  shockMesh.name = `${group.name}-blast-wave`;
  shockMesh.frustumCulled = false;
  shockMesh.renderOrder = -1;
  sky.add(shockMesh);

  let points = null, geo = null, state = 'loading', counts = {}, total = 0;
  const browser = typeof document !== 'undefined';
  const built = (file) => {
    const byName = new Map(file.meshes.map((m) => [m.name, m]));
    const have = parts.filter((p) => byName.has(p.part));
    total = have.reduce((s, p) => s + byName.get(p.part).positions.length / 3, 0);
    const pos = new Float32Array(total * 3), col = new Float32Array(total * 3), look = new Float32Array(total * 3);
    let at = 0;
    for (const p of have) {
      const src = byName.get(p.part).positions, n = src.length / 3;
      pos.set(src, at * 3);
      for (let i = 0; i < n; i++) {
        col.set(p.colour, (at + i) * 3);
        look[(at + i) * 3] = p.star ? 0 : p.size; look[(at + i) * 3 + 1] = p.alpha; look[(at + i) * 3 + 2] = p.cls;
      }
      counts[p.part] = n;
      at += n;
    }
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColour', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aLook', new THREE.BufferAttribute(look, 3));
    points = new THREE.Points(geo, mat);
    points.name = `${group.name}-shells`; // the contract's draw-order check knows a deep mesh by `-shells`
    points.frustumCulled = false;
    points.renderOrder = -1;
    sky.add(points);
    state = 'ready';
  };
  if (env.mesh) built(env.mesh); // the tests hand the parsed file in
  else if (browser) loadMeshFile(fileUrl(part(profile, 'iron').file || 'site/data/deep/casa.glb')).then(built).catch((e) => { state = 'failed'; console.warn('deep: the Cassiopeia A file did not load', e); });
  else state = 'none';

  let level = 0, levelShare = 0, last = { year: NaN, free: 1, slowed: 1, shock: 1 };
  const _v = new THREE.Vector3();
  return {
    group,
    levels: [2, 3],
    latchSafe: true, // points and one sphere: no march
    card: { copy: COPY_BLOCK, drawn: DRAWN },
    setLevel(n, share = 1) {
      level = n;
      levelShare = n >= 2 ? clamp(share, 0, 1) : 0;
      group.visible = levelShare > 0;
    },
    frame(info = {}) {
      if (basisFor !== stage.worldId) {
        basisFor = stage.worldId;
        // the sky frame's rotation, then arcseconds to the group's light-years
        if (placeSky(THREE, sky, env.record, stage)) sky.matrix.scale(_v.set(unit, unit, unit));
      }
      const year = yearOf(stage.tMs);
      const free = growthOf(growth, 'free', year), slowed = growthOf(growth, 'slowed', year);
      // the blast wave: the same law through its own rate (shockOf), from its radius at the epoch
      const then = Number(growth.epoch) - Number(growth.exploded), age = year - Number(growth.exploded);
      const shockGrow = age > 0 && then > 0 ? Math.pow(age / then, (shock.rate / 100) * then) : 0;
      const lk = lookFor(info.look);
      const u = mat.uniforms;
      u.uGrowFree.value = free; u.uGrowSlowed.value = slowed;
      u.uShare.value = levelShare * lk.debris;
      u.uGain.value = clamp(Number.isFinite(info.gain) ? info.gain : 1, 0.6, 1.8);
      const vh = (typeof globalThis.innerHeight === 'number' && globalThis.innerHeight) || 800;
      if (info.camera) u.uPxPerRad.value = (info.camera.projectionMatrix.elements[5] || 1) * vh / 2;
      u.uPixelRatio.value = (typeof globalThis.devicePixelRatio === 'number' && globalThis.devicePixelRatio) || 1;
      if (points) points.visible = u.uShare.value > 0.002 && free > 0;
      shockMesh.scale.setScalar(Math.max(1e-9, shock.radius * shockGrow));
      shockMat.uniforms.uShare.value = levelShare * lk.shock;
      shockMesh.visible = shockMat.uniforms.uShare.value > 0.002 && shockGrow > 0;
      last = { year, free, slowed, shock: shockGrow };
    },
    ready: () => state !== 'loading',
    stats: () => ({
      level, share: Math.round(levelShare * 100) / 100, file: state, meshes: points ? 2 : 1, textures: 0, points: total, parts: { ...counts },
      year: Math.round(last.year * 100) / 100, free: Math.round(last.free * 1e4) / 1e4, slowed: Math.round(last.slowed * 1e4) / 1e4, shock: Math.round(last.shock * 1e4) / 1e4,
      shockArcsec: Math.round(shock.radius * last.shock * 10) / 10,
      bytes: geo ? total * 36 : 0,
    }),
    dispose() {
      if (geo) geo.dispose();
      mat.dispose(); shockMat.dispose(); shockMesh.geometry.dispose();
      if (group.parent) group.parent.remove(group);
    },
  };
}

// scene/dsoglow.js -- a deep-sky object drawn as big as it is, when that is bigger than its dot.
//
// Contract: createDsoGlow(scene) -> { setRecords(records), setPictured(ids), setShapedShare(k),
//   setMarks(on), rebuild(), update(camera, renderer, visible), count(), dispose(), group }
// Also exported, pure, for the test: glowFor(record) -> {colour, sizeKm, kind, shape?} | null,
//   KINDS, SHAPED, majorAxisDir(pos, paDeg) -> unit vector in the sun-inertial frame
//
// WHY. Every deep-sky object was one 8 px dot whatever its size. On the "To the edge" trip the
// Pleiades stop is 100 light-years from a cluster 19 light-years across -- eleven degrees of sky --
// and it was that dot (measured 2026-09-22). The records know how big they are: 202 of 209 carry a
// major axis (OpenNGC or the hand row's source), and data/parsers.js turns it into `sizeLy`.
//
// WHAT IT IS, AND IS NOT. A soft glow at the measured distance, the measured size across,
// coloured by what the thing is. Round, but for a galaxy whose minor axis and position angle the
// file carries (OpenNGC, through scripts/build-dso.py from 2026-10-09: 48 rows have a minor axis,
// 42 an angle) and which is clearly longer than wide: that one is an ellipse, as M32 and M110 are
// (below). Any other object's card says "its true shape is not drawn". Dark nebulae
// get no glow (they are dark), and Andromeda has a model of its own (scene/galaxy.js). An object
// whose photograph is BEING DRAWN (scene/nebulae.js, spec 0067) drops its glow: a pink disc laid over
// the Orion Nebula's own picture would tint the thing it stood in for. Until 2026-10-08 it dropped
// it once the file had landed, drawn or not, and a photograph fades out off the line of sight from
// the Sun: at "To the edge"'s stop beside the Pleiades there was neither picture nor glow.
//
// TWO GALAXIES HAVE A SHAPE (public #385, 2026-10-08). Andromeda's companions M32 and M110 were
// two unnamed dots beside her. OpenNGC does list a minor axis and a position angle for them
// (SHAPED below, read from its NGC.csv that day), so those two are drawn as soft ELLIPSES with a
// bright middle: as long and as wide as the catalogue says, turned as it says. The turn is the one
// seen from the Sun: the major axis is laid on the sky at its position angle, east of north
// (majorAxisDir), and projected by the camera like anything else, so from Earth's side it is
// right and from far off that line it is the same flat ellipse seen askew, which is an
// illustration and the card says so. While Andromeda's own photograph is drawn they step back
// (setShapedShare), because the photograph already holds both of them.
//
// WHEN. Only on a rung of the ladder, only with the deep-sky layer drawn, and only while the glow is
// between a few pixels (below that the dot says it all) and a few hundred (above that the camera is
// nearly inside it, and GPUs cap a point's size, so a clamped glow would claim the wrong size; it
// fades out first).

import * as THREE from '../../vendor/three.module.min.js';
import { stage, isLadderStage } from './stage.js';
import { CLUSTERS } from './clusters.js';

const LY_KM = 9460730472580.8;
const SUN_INERTIAL = 'sun-inertial';
const NO_GLOW = new Set(['DrkN', '**', 'Other']);
const MODELLED = new Set(['dso-m31']); // drawn by scene/galaxy.js

// typeCode (OpenNGC) -> the colour it glows. Light, not photographs: galaxies warm starlight, young
// open clusters blue-white, old globulars pale gold, emission nebulae hydrogen pink, planetaries the
// teal of ionised oxygen, reflection nebulae blue.
const COLOURS = {
  G: [1.0, 0.92, 0.82],
  OCl: [0.78, 0.86, 1.0],
  '*Ass': [0.78, 0.86, 1.0],
  GCl: [1.0, 0.94, 0.78],
  PN: [0.55, 0.95, 0.85],
  HII: [1.0, 0.55, 0.66],
  Neb: [1.0, 0.6, 0.7],
  'Cl+N': [1.0, 0.62, 0.72],
  SNR: [0.85, 0.72, 1.0],
  RfN: [0.62, 0.76, 1.0],
};

/**
 * The galaxies drawn as ellipses. OpenNGC, database_files/NGC.csv, read 2026-10-08:
 *   NGC0221 (M32):  MajAx 7.74', MinAx 4.86', PosAng 170, Hubble E
 *   NGC0205 (M110): MajAx 16.22', MinAx 9.59', PosAng 170, Hubble E
 * The major axes are the ones site/data/dso.json already carries (tests/test_dso.mjs holds the
 * two to each other). `of`: the object whose photograph holds this one too.
 */
export const SHAPED = {
  'dso-m32': { majArcmin: 7.74, minArcmin: 4.86, paDeg: 170, of: 'dso-m31' },
  'dso-m110': { majArcmin: 16.22, minArcmin: 9.59, paDeg: 170, of: 'dso-m31' },
};

const OBLIQUITY = 23.4392911 * (Math.PI / 180);
/** The north celestial pole in the sun-inertial (ecliptic J2000) frame. */
const POLE = [0, Math.sin(OBLIQUITY), Math.cos(OBLIQUITY)];

/**
 * Which way an object's major axis points, as a unit vector in the frame its position is in
 * (sun-inertial): on the sky plane at `pos`, `paDeg` east of north. Pure.
 */
export function majorAxisDir(pos, paDeg) {
  const l = Math.hypot(pos.x, pos.y, pos.z) || 1;
  const u = [pos.x / l, pos.y / l, pos.z / l];
  // east = pole x line of sight, north = line of sight x east
  let e = [POLE[1] * u[2] - POLE[2] * u[1], POLE[2] * u[0] - POLE[0] * u[2], POLE[0] * u[1] - POLE[1] * u[0]];
  const el = Math.hypot(e[0], e[1], e[2]) || 1;
  e = [e[0] / el, e[1] / el, e[2] / el];
  const n = [u[1] * e[2] - u[2] * e[1], u[2] * e[0] - u[0] * e[2], u[0] * e[1] - u[1] * e[0]];
  const pa = (paDeg * Math.PI) / 180;
  const c = Math.cos(pa);
  const k = Math.sin(pa);
  return { x: n[0] * c + e[0] * k, y: n[1] * c + e[1] * k, z: n[2] * c + e[2] * k };
}

// A MARK PER KIND (public #271, 2026-10-08). Every round glow was the same Gaussian in another
// colour, so a globular cluster, a planetary nebula and a galaxy were one grey blob each. Where no
// photograph is drawn, a round glow now has the PROFILE of its kind:
//   soft     a reflection nebula, or anything unclassified: the Gaussian it always was
//   cloud    an emission nebula: the Gaussian, broken up by noise
//   galaxy   a bright nucleus in an exponential disc -- ROUND, but for the two in SHAPED
//   open     a faint haze with a scatter of points
//   globular a core that climbs steeply (a King-like 1 / (1 + r^2)), grainy with points
//   shell    a planetary nebula: a ring with a faint middle
//   remnant  a supernova remnant: a thin broken shell
// ALL OF IT IS ILLUSTRATIVE BUT THE PLACE, THE SIZE AND THE KIND: the points in a cluster's mark
// are not its stars and the clumps in a nebula's are not its clumps (they are noise seeded by the
// object's index), and the card says the true shape is not drawn (copy/en.js drawing.dso).
export const KINDS = { soft: 0, cloud: 1, galaxy: 2, open: 3, globular: 4, shell: 5, remnant: 6 };
// A cluster whose own stars are drawn (scene/clusters.js) gets a haze and no stand-in points:
// fainter and bluer, for the dust the stars light (the Hyades have next to none: illustrative).
const OWN_STARS_HAZE = [0.3, 0.42, 0.62];
const OWN_STARS = new Set(CLUSTERS.map((c) => `dso-${c.id}`));
const KIND_OF = {
  G: 'galaxy', OCl: 'open', '*Ass': 'open', GCl: 'globular', PN: 'shell', HII: 'cloud', Neb: 'cloud',
  'Cl+N': 'cloud', SNR: 'remnant', RfN: 'soft',
};

/** The glow a record gets, or null. Pure. */
export function glowFor(record) {
  if (!record || record.klass !== 'dso' || MODELLED.has(record.id)) return null;
  const md = record.meta || {};
  const code = md.typeCode || null;
  if (code && NO_GLOW.has(code)) return null;
  const sizeLy = Number(md.sizeLy);
  if (!(sizeLy > 0) || !record.pos) return null;
  const fallback = md.kind === 'galaxy' ? 'G' : md.kind === 'cluster' ? 'OCl' : 'Neb';
  const colour = COLOURS[code] || COLOURS[fallback];
  // A hand row may say "globular cluster" in words with no OpenNGC code.
  const words = String(md.typeText || '').toLowerCase();
  const kind = KIND_OF[code] || (words.includes('globular') ? 'globular' : words.includes('planetary') ? 'shell' : KIND_OF[fallback]);
  if (OWN_STARS.has(record.id)) return { colour: OWN_STARS_HAZE, sizeKm: sizeLy * LY_KM, kind: 'soft' };
  const row = SHAPED[record.id];
  let shape = row ? { ratio: row.minArcmin / row.majArcmin, paDeg: row.paDeg, of: row.of } : null;
  // Any other galaxy whose catalogue measures it clearly longer than wide, with its angle (OpenNGC through
  // scripts/build-dso.py, internal #166): the same ellipse, standing alone (no photograph holds it).
  if (!shape && code === 'G' && md.majAxArcmin > 0 && md.minAxArcmin > 0 && Number.isFinite(md.posAngDeg)) {
    const r = md.minAxArcmin / md.majAxArcmin;
    if (r >= 0.05 && r < 0.8) shape = { ratio: r, paDeg: md.posAngDeg, of: null };
  }
  return shape ? { colour, sizeKm: sizeLy * LY_KM, kind, shape } : { colour, sizeKm: sizeLy * LY_KM, kind };
}

const VERT = /* glsl */ `
attribute float aSize;
attribute float aKeep;
attribute vec3 aColour;
attribute vec3 aMajor;   // where the major axis ends, as an offset in scene units; zero for a round glow
attribute float aRatio;  // minor over major; 0 for a round glow
attribute float aStep;   // 1 for an ellipse that steps back for a photograph (M32, M110), 0 for one that stands alone
attribute vec2 aKind;    // KINDS, and a seed
uniform float uMarks;    // 0: every round glow is the plain Gaussian (the frame latch)
uniform float uPixelRatio;
uniform float uViewportH;
uniform float uAspect;
uniform float uGain;
uniform float uShaped;
varying vec3 vColour;
varying float vAlpha;
varying vec2 vAxis;
varying float vRatio;
varying vec2 vKind;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  vRatio = aRatio;
  vAxis = vec2( 1.0, 0.0 );
  if ( aRatio > 0.0 ) {
    // The major axis on the screen: its far end projected like any point, less the centre.
    vec4 tip = projectionMatrix * modelViewMatrix * vec4( position + aMajor, 1.0 );
    vec2 d = ( tip.xy / tip.w - gl_Position.xy / gl_Position.w ) * vec2( uAspect, 1.0 );
    float len = length( d );
    if ( len > 1e-9 ) vAxis = d / len;
  }
  float d = max( 1e-12, -mv.z );
  // its diameter on screen, in CSS px
  float px = aSize / d * projectionMatrix[1][1] * 0.5 * uViewportH;
  vAlpha = uGain * smoothstep( 4.0, 14.0, px ) * ( 1.0 - smoothstep( 220.0, 420.0, px ) );
  if ( aRatio > 0.0 ) vAlpha *= mix( 1.0, uShaped, aStep );
  vAlpha *= aKeep;
  gl_PointSize = clamp( px, 1.0, 420.0 ) * uPixelRatio;
  vColour = aColour;
  // Under 24 px a profile is a few pixels of noise: the plain glow until then.
  vKind = vec2( uMarks > 0.5 && px >= 24.0 ? aKind.x : 0.0, aKind.y );
}
`;

const FRAG = /* glsl */ `
varying vec3 vColour;
varying float vAlpha;
varying vec2 vAxis;
varying float vRatio;
varying vec2 vKind;
#include <common>
float hash2( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) + vKind.y * 17.31 ) * 43758.5453 ); }
float vnoise( vec2 p ) {
  vec2 i = floor( p );
  vec2 f = fract( p );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( hash2( i ), hash2( i + vec2( 1.0, 0.0 ) ), f.x ), mix( hash2( i + vec2( 0.0, 1.0 ) ), hash2( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
}
// A scatter of points: at most one in each cell of a grid 'cells' across that is turned by 'turn'
// and slid by the object's seed, anywhere in its cell, kept with probability 'keep', each its own
// size. Two of these at different turns and sizes do not read as a lattice (one, with the points
// held to the middle of their cells, did: measured in a frame, 2026-10-08).
float points( vec2 q, float cells, float keep, float turn ) {
  float c = cos( turn );
  float s = sin( turn );
  vec2 g = mat2( c, -s, s, c ) * q * cells + vKind.y * 31.0;
  vec2 i = floor( g );
  vec2 at = vec2( hash2( i ), hash2( i + 7.7 ) ) * 0.8 + 0.1;
  float d = length( fract( g ) - at );
  float size = 0.05 + 0.09 * hash2( i + 5.5 );
  return step( 1.0 - keep, hash2( i + 3.3 ) ) * ( 1.0 - smoothstep( 0.0, size, d ) ) * ( 0.35 + 0.65 * hash2( i + 9.1 ) );
}
void main() {
  if ( vAlpha <= 0.0 ) discard;
  vec2 q = gl_PointCoord - vec2( 0.5 );
  float r2 = dot( q, q ) * 4.0;           // 0 at the centre, 1 at the rim
  float a;
  if ( vRatio > 0.0 ) {
    // An ellipse: along the major axis the sprite's own radius, across it vRatio of that.
    // gl_PointCoord runs down the screen, the projected axis up it.
    vec2 p = vec2( q.x, -q.y ) * 2.0;
    float along = dot( p, vAxis );
    float across = dot( p, vec2( -vAxis.y, vAxis.x ) ) / vRatio;
    r2 = along * along + across * across;
    if ( r2 >= 1.0 ) discard;
    // An elliptical galaxy is brightest in the middle and falls away steeply: a core on a halo.
    a = ( 2.2 * exp( -14.0 * r2 ) + exp( -3.2 * r2 ) ) * ( 1.0 - r2 );
  } else {
    if ( r2 >= 1.0 ) discard;
    vec2 p = q * 2.0;
    float r = sqrt( r2 );
    float edge = 1.0 - r2;                  // every profile is zero at the measured edge
    a = exp( -3.2 * r2 ) * edge;            // soft
    int kind = int( vKind.x + 0.5 );
    if ( kind == 1 ) {
      a *= 0.35 + 1.3 * vnoise( p * 2.6 + 4.0 ) * vnoise( p * 6.5 );
    } else if ( kind == 2 ) {
      a = ( 0.5 * exp( -5.0 * r ) + 1.6 * exp( -70.0 * r2 ) ) * edge;
    } else if ( kind == 3 ) {
      float fall = exp( -2.2 * r2 ) * edge;
      a = 0.22 * a + 2.6 * fall * ( points( p, 7.3, 0.45, 0.6 ) + 0.7 * points( p, 12.7, 0.35, -1.1 ) );
    } else if ( kind == 4 ) {
      float king = edge * edge / ( 1.0 + r2 / 0.03 );
      a = king * ( 1.7 + 2.6 * points( p, 27.3, 0.6, 0.6 ) * smoothstep( 0.08, 0.35, r ) );
    } else if ( kind == 5 ) {
      float ring = ( r - 0.62 ) / 0.17;
      a = ( 1.1 * exp( -ring * ring ) + 0.3 * exp( -5.0 * r2 ) ) * edge;
    } else if ( kind == 6 ) {
      float shell = ( r - 0.8 ) / 0.07;
      float turn = atan( p.y, p.x ) / 6.2831853 + 0.5;
      float t = turn * 14.0;
      float broken = mix( hash2( vec2( mod( floor( t ), 14.0 ), 1.0 ) ), hash2( vec2( mod( floor( t ) + 1.0, 14.0 ), 1.0 ) ), smoothstep( 0.0, 1.0, fract( t ) ) );
      a = ( 1.6 * exp( -shell * shell ) * ( 0.25 + broken ) + 0.12 * exp( -2.0 * r2 ) ) * smoothstep( 1.0, 0.9, r );
    }
  }
  gl_FragColor = vec4( vColour, min( 1.0, a * vAlpha * 0.34 ) );
  #include <colorspace_fragment>
}
`;

/** How much of a mark stays while its photograph is drawn at this share: 1 with none, 0 with all, in tenths. Pure. */
export function glowKeep(share) {
  const k = Number(share);
  if (!Number.isFinite(k) || k <= 0) return 1;
  return Math.max(0, Math.min(1, 1 - Math.round(Math.min(1, k) * 10) / 10));
}

/**
 * The dot's own fade once its glow is wider than it: 0 with the glow narrower than ~14 px (the dot says it all),
 * 1 once it is 26 px or more across, and back to 0 as the camera goes into the glow (the vertex shader's own
 * fade-out, 220 to 420 px). Pure. This is the shader's vAlpha without its gain, so the dot and the glow trade
 * places instead of drawing a halo round a dot (Andromeda's companions, internal #472).
 */
export function dotYieldAt(px, keep = 1) {
  const e = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  if (!(px > 0)) return 0;
  const k = Number.isFinite(keep) ? Math.min(1, Math.max(0, keep)) : 1;
  return e(14, 26, px) * (1 - e(220, 420, px)) * k;
}

export function createDsoGlow(scene) {
  const group = new THREE.Group();
  group.name = 'dso-glow';
  group.renderOrder = -1;
  if (scene) scene.add(group);
  const uniforms = { uPixelRatio: { value: 1 }, uViewportH: { value: 800 }, uAspect: { value: 1.6 }, uGain: { value: 1 }, uShaped: { value: 1 }, uMarks: { value: 1 } };
  let glows = [];
  let geometry = null;
  let points = null;
  let builtFor = null;
  let pictured = new Map(); // record id -> how much of its photograph is drawn (0..1), for the ones scene/nebulae.js draws
  const _v = new THREE.Vector3();
  const _w = new THREE.Vector3();
  const _tip = { x: 0, y: 0, z: 0 };
  // id -> the glow's diameter on the screen this frame, CSS px (update()): what the dot gives way to.
  const widthPx = new Map();
  let indexOf = new Map();

  function setRecords(records) {
    glows = [];
    for (const r of records || []) {
      const g = glowFor(r);
      if (g) glows.push({ record: r, ...g });
    }
    builtFor = null;
    rebuild();
  }

  function rebuild() {
    if (!isLadderStage(stage.worldId)) { if (points) points.visible = false; return; }
    if (builtFor === stage.worldId && points) return;
    builtFor = stage.worldId;
    const n = glows.length;
    if (!geometry || geometry.getAttribute('position').count !== n) {
      if (points) { group.remove(points); geometry.dispose(); points.material.dispose(); }
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      geometry.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
      geometry.setAttribute('aKeep', new THREE.BufferAttribute(new Float32Array(n), 1));
      geometry.setAttribute('aColour', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      geometry.setAttribute('aMajor', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      geometry.setAttribute('aRatio', new THREE.BufferAttribute(new Float32Array(n), 1));
      geometry.setAttribute('aStep', new THREE.BufferAttribute(new Float32Array(n), 1));
      geometry.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
      points = new THREE.Points(geometry, new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, uniforms,
        transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      }));
      points.name = 'dso-glow';
      points.frustumCulled = false;
      points.renderOrder = -1;
      group.add(points);
    }
    const pos = geometry.getAttribute('position').array;
    const size = geometry.getAttribute('aSize').array;
    const keep = geometry.getAttribute('aKeep').array;
    const col = geometry.getAttribute('aColour').array;
    const major = geometry.getAttribute('aMajor').array;
    const ratio = geometry.getAttribute('aRatio').array;
    const step = geometry.getAttribute('aStep').array;
    const kind = geometry.getAttribute('aKind').array;
    indexOf = new Map();
    for (let i = 0; i < n; i++) {
      const g = glows[i];
      indexOf.set(g.record.id, i);
      kind[i * 2] = KINDS[g.kind] || 0; kind[i * 2 + 1] = (i * 0.6180339887) % 1;
      const ok = stage.toSceneInto(g.record.pos, SUN_INERTIAL, _v, stage.tMs);
      // A shaped galaxy: the end of its major axis, half its length from the centre, in the scene.
      let shaped = false;
      if (ok && g.shape) {
        const dir = majorAxisDir(g.record.pos, g.shape.paDeg);
        const half = g.sizeKm / 2;
        _tip.x = g.record.pos.x + dir.x * half; _tip.y = g.record.pos.y + dir.y * half; _tip.z = g.record.pos.z + dir.z * half;
        shaped = stage.toSceneInto(_tip, SUN_INERTIAL, _w, stage.tMs);
        if (shaped) _w.sub(_v);
      }
      major[i * 3] = shaped ? _w.x : 0; major[i * 3 + 1] = shaped ? _w.y : 0; major[i * 3 + 2] = shaped ? _w.z : 0;
      ratio[i] = shaped ? g.shape.ratio : 0;
      step[i] = shaped && g.shape.of ? 1 : 0;
      pos[i * 3] = ok ? _v.x : 0; pos[i * 3 + 1] = ok ? _v.y : 0; pos[i * 3 + 2] = ok ? _v.z : 0;
      // The mark gives way to its photograph by degrees: a half-drawn picture leaves half the mark.
      keep[i] = glowKeep(pictured.get(g.record.id));
      size[i] = ok && keep[i] > 0 ? g.sizeKm / stage.unitKm : 0;
      col[i * 3] = g.colour[0]; col[i * 3 + 1] = g.colour[1]; col[i * 3 + 2] = g.colour[2];
    }
    geometry.getAttribute('position').needsUpdate = true;
    geometry.getAttribute('aSize').needsUpdate = true;
    geometry.getAttribute('aKeep').needsUpdate = true;
    geometry.getAttribute('aColour').needsUpdate = true;
    geometry.getAttribute('aMajor').needsUpdate = true;
    geometry.getAttribute('aStep').needsUpdate = true;
    geometry.getAttribute('aRatio').needsUpdate = true;
    geometry.getAttribute('aKind').needsUpdate = true;
  }

  /** The records now drawn as photographs: their glows go (size 0 is below the 4 px floor). */
  function setPictured(ids) {
    // Ids alone mean wholly drawn; a Map of id -> share lets the mark fade as the picture does.
    pictured = ids instanceof Map ? new Map(ids) : new Map(Array.isArray(ids) ? ids.map((id) => [id, 1]) : []);
    builtFor = null;
    rebuild();
  }

  /** Per frame: the viewport and pixel ratio; `visible` is the deep-sky layer's own answer. */
  function update(camera, renderer, visible) {
    if (!points) return;
    points.visible = !!visible && isLadderStage(stage.worldId);
    if (!points.visible) return;
    if (renderer && typeof renderer.getPixelRatio === 'function') uniforms.uPixelRatio.value = Math.min(2, Math.max(0.5, renderer.getPixelRatio()));
    if (renderer && renderer.domElement) uniforms.uViewportH.value = renderer.domElement.clientHeight || uniforms.uViewportH.value;
    if (camera && camera.aspect > 0) uniforms.uAspect.value = camera.aspect;
    // The width of each glow on the screen, for dotYield(): the shader's own arithmetic, once a frame.
    widthPx.clear();
    if (!camera || !geometry) return;
    const pos = geometry.getAttribute('position').array;
    const size = geometry.getAttribute('aSize').array;
    const cp = camera.position;
    const f = (camera.projectionMatrix.elements[5] || 0) * 0.5 * uniforms.uViewportH.value;
    for (const [id, i] of indexOf) {
      if (!(size[i] > 0)) continue;
      const d = Math.hypot(pos[i * 3] - cp.x, pos[i * 3 + 1] - cp.y, pos[i * 3 + 2] - cp.z);
      widthPx.set(id, size[i] / Math.max(1e-12, d) * f);
    }
  }

  /** How much of a deep-sky object's dot has given way to its glow, 0 to 1 (scene/glyphs.js setModelOpacity). */
  function dotYield(id) {
    if (!points || !points.visible) return 0;
    const px = widthPx.get(id);
    if (px === undefined) return 0;
    const i = indexOf.get(id);
    return dotYieldAt(px, geometry.getAttribute('aKeep').array[i]);
  }

  function dispose() {
    if (geometry) geometry.dispose();
    if (points) points.material.dispose();
    if (scene) scene.remove(group);
    geometry = null; points = null; glows = [];
  }

  /** The shutter (scene/exposure.js `milkyWay`): a glow is faint light too (internal #343). */
  function setExposure(k) { uniforms.uGain.value = Number.isFinite(k) && k > 0 ? k : 1; }

  /**
   * How much of the shaped galaxies is drawn, 0 to 1: main.js hands it one minus how much of
   * Andromeda's photograph is on screen, as it does for her stand-in model (scene/galaxy.js).
   */
  function setShapedShare(k) { uniforms.uShaped.value = Number.isFinite(k) ? Math.min(1, Math.max(0, k)) : 1; }

  /** The frame latch (main.js): the per-kind profiles go back to the one plain glow. */
  function setMarks(on) { uniforms.uMarks.value = on ? 1 : 0; }

  return { dotYield, widthPx: (id) => widthPx.get(id), setRecords, setPictured, setShapedShare, setExposure, setMarks, rebuild, update, dispose, group, count: () => glows.length, kinds: () => glows.map((g) => g.kind), shaped: () => glows.filter((g) => g.shape).map((g) => g.record.id) };
}

// scene/plumes.js -- plumes where they were seen: Io, Enceladus and Triton (release 1.2.0 stage W2-c,
// internal spec 0076; internal #861, #862; the package's VOLCANIC_MOON and ICY_MOON classes).
//
// Contract: createPlumes(ctx) -> { stage(worldId), line(worldId), state(), debug({ on }), dispose() }
// Fetched by main.js (`ctx.wantPlumes`, anchor 0076 W2-c) when Io, Enceladus or Triton gets its own stage;
// never at boot (tests/test_boot_diet.mjs). Pure, for tests/test_plumes.mjs: ballisticOf, placeVector,
// westOf, particlesFor, motionTime, lineFor, whenWords, UNDER_MEASURED, COPY_BLOCK, SHADERS.
//
// WHAT IS DRAWN. Every plume of registry/plumes.yaml, at its gazetteer place and the height it was seen
// at, by the craft and on the date the card names: Pele and Tvashtar (giant umbrellas with no central
// column), Prometheus and Pillan (fountains), the jets of Enceladus's four tiger stripes, Triton's two
// dark columns and their clouds carried west. Io's hot spots are small orange points on its night side.
// Nothing else: no plume without a dated observation (tests/test_plumes.mjs).
//
// HOW. One Points draw per moon, a child of the moon's own mesh (a unit sphere, body-fixed: +X toward
// the planet, +Y north, east toward -Z, scene/worlds.js faceVector), so it turns and scales with it. Each
// particle is a grain on a BALLISTIC ARC from its vent: launched at v = sqrt(2 g h) / cos(zenith) so the
// steepest of its plume tops out at the height seen, under the moon's own surface gravity GM / R^2, its
// path bent round the sphere so it lands on the ground and not in the air (a flat-ground arc of 600 km
// would land 100 km up on Io). The spread of zenith angles is the plume's type (McEwen & Soderblom 1983):
// Pele's canopy is filaments of 12 to 38 degrees and no column, which puts its fall-out in a ring about
// 600 km out (Voyager saw a 1 200 km ring); Prometheus's fountain has a column. Triton's grains rise
// 8 km and then drift west with a 15 m/s wind (Soderblom et al. 1990; Hofgartner et al. 2022).
//
// LIGHT. A plume is FAINT and LIT FROM BEHIND: small grains throw sunlight forward. Each grain's light is
// the Sun's, by a Henyey-Greenstein phase function of its kind (ice grains strongly forward), zero in
// the moon's own shadow, and stretched (`tau`, illustrative, said on the card) so that a plume reads
// against black space and barely over the lit disc, as in the images that found them. Premultiplied
// "over" (gasmat.js's policy): a grain adds the light it scatters and takes the share of what is behind
// it that it absorbs, so Triton's dark plumes darken the ground. No pass, no target, no bloom; grains
// are 1.5 to 14 pixels in a 900-pixel-high frame (more in a taller drawing buffer, so a phone's are the same
// size to the eye) with a soft edge, some sixteen overlapping anywhere, their light kept the same when the
// size is clamped, so the plume is a veil of fine structure at every distance, never a blob or a speckle.
//
// MOTION. Film: the grains fly their arcs at FILM_SPEED times the clock (a demonstration multiplier,
// said on the card); a paused clock is still; the same clock gives the same frame. Measured and reduced
// motion: still, each grain where a steady plume has it (UNDER_MEASURED). A clock fast enough to make
// the arcs a shimmer holds them still as well.
//
// TIERS. On T0 or under the latch, half the grains (the first half of a shuffled list), each twice as
// bright: the same plume at half the cost. A moon's grains are freed when its stage is left.

import * as THREE from '../../vendor/three.module.min.js';
import { COPY, t } from '../copy/en.js';
import '../copy/en.later.js';
import { PLUMES, HOTSPOTS, PLUME_WORLDS, PLUME_LOOK, FILM_SPEED } from '../data/plumes.js';
import { stillUnder } from './exposure.js';

export const UNDER_MEASURED = { plumes: 'still', hotspots: 'same' };
export const COPY_BLOCK = 'r12Plumes';

const D2R = Math.PI / 180;
const KINDS = ['umbrella', 'fountain', 'jets', 'column', 'hotspot'];
const WRAP_S = 20000; // the motion's clock is wrapped here so a float32 keeps it to the millisecond
const SHIMMER = 2400; // clock rate x FILM_SPEED past which the arcs would alias into a shimmer: held still
const SPRITE_MEAN = 0.25; // the soft sprite's mean cover of its square
// A grain's sprite is this many times the spacing of the grains, so that some sixteen (pi/4 x 4.5^2)
// overlap anywhere in a plume and their sum is a veil, each grain faint. The first look (2026-10-16,
// 1.2 times) drew a spray of separate white dots and the second (2.5 times) still a speckle, saturated
// where lit from behind; this value has not been photographed yet.
const OVERLAP = 4.5;
const GRAIN_MAX = 0.35; // no one grain covers more than this of what is behind it
const PHASE_CAP = 2.2; // forward scattering at most this many times its value at a right angle

/** A place on a moon (east longitude, latitude, degrees) as a unit vector in its mesh's axes (worlds.js faceVector). Pure. */
export function placeVector(lonDeg, latDeg) {
  const lo = lonDeg * D2R;
  const la = latDeg * D2R;
  return [Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)];
}

/** West on the ground at a place, a unit vector in the mesh's axes (east is d/d lon of placeVector). Pure. */
export function westOf(lonDeg) {
  const lo = lonDeg * D2R;
  return [Math.sin(lo), 0, Math.cos(lo)];
}

/**
 * A grain launched `zenithDeg` off the vertical that tops out at `topKm` when launched straight up would
 * not: the launch speed that gives the plume's height to its steepest grain, its flight time and range.
 * `steepestDeg` is the plume's smallest zenith angle. Flat gravity g (km/s^2). Pure.
 */
export function ballisticOf(topKm, zenithDeg, steepestDeg, g) {
  const c0 = Math.cos(steepestDeg * D2R);
  const v = Math.sqrt(2 * g * topKm) / c0;
  const z = zenithDeg * D2R;
  const up = v * Math.cos(z);
  return { v, T: (2 * up) / g, apexKm: (up * up) / (2 * g), rangeKm: (v * v * Math.sin(2 * z)) / g };
}

/** A small seeded generator (mulberry32), so the same plume is the same grains on every visit. Pure. */
function rng(seedText) {
  let h = 1779033703;
  for (let i = 0; i < seedText.length; i++) h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353) >>> 0;
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const norm = (v) => { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };
const crossV = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** Two unit vectors across the vertical `n` (the first toward north where there is one). */
function basisAt(n) {
  const north = Math.abs(n[1]) > 0.999 ? [1, 0, 0] : [0, 1, 0];
  const e = norm(crossV(north, n));
  return [norm(crossV(n, e)), e];
}
/** The direction `zenith` off `n` toward azimuth `az` (radians). */
function tilted(n, zenith, az) {
  const [u, w] = basisAt(n);
  const s = Math.sin(zenith);
  const c = Math.cos(zenith);
  return norm([n[0] * c + (u[0] * Math.cos(az) + w[0] * Math.sin(az)) * s,
    n[1] * c + (u[1] * Math.cos(az) + w[1] * Math.sin(az)) * s,
    n[2] * c + (u[2] * Math.cos(az) + w[2] * Math.sin(az)) * s]);
}
/** A place on the azimuthal equidistant plane round the south pole -> [lat, lon E]. */
function lerpPolar(a, b, k, radiusKm) {
  const xy = ([lat, lon]) => { const r = radiusKm * (90 + lat) * D2R; return [r * Math.cos(lon * D2R), r * Math.sin(lon * D2R)]; };
  const [xa, ya] = xy(a);
  const [xb, yb] = xy(b);
  const x = xa + (xb - xa) * k;
  const y = ya + (yb - ya) * k;
  return [-90 + Math.hypot(x, y) / radiusKm / D2R, Math.atan2(y, x) / D2R];
}

/**
 * Every grain of one moon: hot spots first, then the plumes' grains shuffled, so that the first half of
 * the list is a fair half of every plume (T0 draws it). Each grain: vent (unit), dir (unit launch
 * direction; for a column the cloud's drift in km), motion [v km/s or height km, period s, phase 0..1,
 * weight], shape [kind index, size km, lateral km, rise s]. Pure: tests/test_plumes.mjs reads it.
 * @returns {{ count, hot, vent: Float32Array, dir: Float32Array, motion: Float32Array, shape: Float32Array, topKm, plumes }}
 */
export function particlesFor(worldId, rows = PLUMES, hot = HOTSPOTS, worlds = PLUME_WORLDS, looks = PLUME_LOOK) {
  const W = worlds[worldId];
  if (!W) return null;
  const g = W.gKmS2;
  const R = W.radiusKm;
  const grains = [];
  let topKm = 0;
  const mine = rows.filter((p) => p.world === worldId);
  for (const p of mine) {
    const look = looks[p.kind] || {};
    const tau = Number(look.tau) || 0.1;
    const kind = KINDS.indexOf(p.kind);
    const r = rng(p.id);
    if (p.kind === 'umbrella' || p.kind === 'fountain') {
      const [z0, z1] = p.zenithDeg;
      const n = placeVector(p.lon, p.lat);
      const far = ballisticOf(p.heightKm, z1, z0, g).rangeKm;
      const area = 2 * far * p.heightKm * 0.6;
      const size = OVERLAP * Math.sqrt(area / p.particles);
      const weight = (tau * area) / (p.particles * size * size * SPRITE_MEAN);
      topKm = Math.max(topKm, p.heightKm);
      for (let i = 0; i < p.particles; i++) {
        // A canopy of filaments: each grain on one of `rays` azimuths, a little off it; a fountain all round.
        const az = p.rays > 0 ? ((Math.floor(r() * p.rays) + 0.5 + (r() - 0.5) * 0.6) / p.rays) * 2 * Math.PI : r() * 2 * Math.PI;
        // Uniform in cos(zenith) between the two: the canopy's grains fill its width evenly.
        const zc = Math.cos(z1 * D2R) + (Math.cos(z0 * D2R) - Math.cos(z1 * D2R)) * r();
        const zen = Math.acos(zc);
        const b = ballisticOf(p.heightKm, zen / D2R, z0, g);
        grains.push([n, tilted(n, zen, az), [b.v, b.T, r(), weight], [kind, size, 0, 0]]);
      }
    } else if (p.kind === 'jets') {
      const [z0, z1] = p.zenithDeg;
      const area = 220 * 2 * p.scaleKm;
      const total = p.stripes.reduce((s, x) => s + x.jets, 0) * p.particles;
      const size = OVERLAP * Math.sqrt(area / total);
      const weight = (tau * area) / (total * size * size * SPRITE_MEAN);
      topKm = Math.max(topKm, p.heightKm);
      for (const s of p.stripes) {
        for (let j = 0; j < s.jets; j++) {
          // A jet: a place along its stripe, a lean of up to z1 degrees, and grains of many heights,
          // exponential with scale `scaleKm` and none above the plume's seen top.
          const [lat, lon] = lerpPolar(s.a, s.b, (j + 0.2 + 0.6 * r()) / s.jets, R);
          const n = placeVector(lon, lat);
          const lean = tilted(n, (z0 + (z1 - z0) * r()) * D2R, r() * 2 * Math.PI);
          for (let i = 0; i < p.particles; i++) {
            const h = Math.min(p.heightKm, -p.scaleKm * Math.log(1 - 0.999 * r()));
            const d = tilted(lean, r() * 4 * D2R, r() * 2 * Math.PI);
            const v = Math.sqrt(2 * g * h) / Math.max(0.2, d[0] * n[0] + d[1] * n[1] + d[2] * n[2]);
            const up = v * (d[0] * n[0] + d[1] * n[1] + d[2] * n[2]);
            grains.push([n, d, [v, (2 * up) / g, r(), weight], [kind, size, 0, 0]]);
          }
        }
      }
    } else if (p.kind === 'column') {
      // Rise at an illustrative 10 m/s, then drift with the measured wind: the share of grains in the
      // column and in the cloud is the share of their time spent in each.
      const rise = 0.010;
      const wind = p.windMS / 1000;
      const riseS = p.heightKm / rise;
      const driftS = p.tailKm / wind;
      const n = placeVector(p.lon, p.lat);
      const west = westOf(p.lon);
      const area = p.tailKm * p.heightKm * 1.2;
      const size = OVERLAP * Math.sqrt(area / p.particles);
      const weight = (tau * area) / (p.particles * size * size * SPRITE_MEAN);
      topKm = Math.max(topKm, p.heightKm + 2);
      for (let i = 0; i < p.particles; i++) {
        // The cloud fans out as it goes: a lateral spread of up to a fifth of its length at its end.
        const lateral = (r() + r() + r() - 1.5) * 0.28 * p.tailKm;
        const tail = [west[0] * p.tailKm, west[1] * p.tailKm, west[2] * p.tailKm];
        grains.push([n, tail, [p.heightKm, riseS + driftS, r(), weight], [kind, size, lateral, riseS]]);
      }
    }
  }
  // Shuffle the plumes' grains (seeded), so any first share of them is a fair sample.
  const r = rng(worldId + ':order');
  for (let i = grains.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const x = grains[i]; grains[i] = grains[j]; grains[j] = x;
  }
  const spots = hot.filter((h) => h.world === worldId).map((h) => {
    const n = placeVector(h.lon, h.lat);
    return [n, n, [0, 1, 0, h.rank], [KINDS.indexOf('hotspot'), 0, 0, 0]];
  });
  const all = spots.concat(grains);
  const count = all.length;
  const vent = new Float32Array(count * 3);
  const dir = new Float32Array(count * 3);
  const motion = new Float32Array(count * 4);
  const shape = new Float32Array(count * 4);
  all.forEach(([n, d, m, s], i) => {
    vent.set(n, i * 3); dir.set(d, i * 3); motion.set(m, i * 4); shape.set(s, i * 4);
  });
  return { count, hot: spots.length, vent, dir, motion, shape, topKm, radiusKm: R, g, plumes: mine.map((p) => p.id) };
}

/**
 * The motion's clock in seconds for the shader: the scene clock times FILM_SPEED, wrapped; 0 (still) under
 * Measured and under reduced motion; null (hold where it is) when the clock runs so fast that the arcs
 * would shimmer. Pure.
 */
export function motionTime(tMs, look, reduced, rate = 1, speed = FILM_SPEED) {
  if (stillUnder(look, UNDER_MEASURED.plumes) || reduced) return 0;
  if (Math.abs(rate) * speed > SHIMMER) return null;
  const s = (tMs / 1000) * speed;
  return ((s % WRAP_S) + WRAP_S) % WRAP_S;
}

const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
/** "March 1979", "1979", or "1979 to 1997" from the registry's `when`. Pure. */
export function whenWords(when) {
  const one = (s) => {
    const m = /^(\d{4})(?:-(\d{2}))?$/.exec(String(s || '').trim());
    if (!m) return String(s || '');
    return m[2] ? monthFmt.format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1))) : m[1];
  };
  const w = String(when || '');
  if (w.includes('..')) {
    const [a, b] = w.split('..');
    const ya = a.slice(0, 4);
    const yb = b.slice(0, 4);
    return ya === yb ? one(a) : t(COPY.r12Plumes.span, { a: ya, b: yb });
  }
  return one(w);
}

/** The card's line for a moon: what is drawn, seen when and by what, what is measured and what is not, the motion. Pure. */
export function lineFor(worldId, look, reduced, rows = PLUMES, hot = HOTSPOTS) {
  const C = COPY.r12Plumes;
  const mine = rows.filter((p) => p.world === worldId);
  if (!mine.length || !C || !C.line) return null;
  const km = (x) => String(Math.round(x));
  const items = mine.map((p) => {
    const by = p.seen.by;
    const when = whenWords(p.seen.when);
    if (p.kind === 'jets') return t(C.jets, { km: km(p.heightKm), by, when });
    return t(C.item, { name: p.name, km: km(p.heightKm), by, when });
  });
  const out = [t(C.line, { list: items.join('; ') }), C.truth];
  if (mine.some((p) => p.kind === 'jets')) out.push(C.stripes);
  if (mine.some((p) => p.kind === 'column')) out.push(C.column);
  const spots = hot.filter((h) => h.world === worldId);
  if (spots.length) out.push(t(C.hot, { list: spots.map((h) => h.name).join(COPY.punctuation.listJoin) }));
  const still = stillUnder(look, UNDER_MEASURED.plumes) || reduced;
  out.push(still ? C.still : t(C.film, { k: String(FILM_SPEED) }));
  out.push(C.review);
  return out.join(' ');
}

const VERT = /* glsl */`
#define PHASE_CAP ${PHASE_CAP.toFixed(2)}
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aDir;
attribute vec4 aMotion;
attribute vec4 aShape;
uniform float uTime;
uniform float uG;
uniform float uRadiusKm;
uniform float uDensity;
uniform float uViewportH;
uniform vec3 uSunDir;
uniform vec3 uColour[5];
uniform float uAbsorb[5];
uniform float uHG[5];
varying vec3 vLight;
varying float vTau;
varying float vAbsorb;
float hg( float c, float g ) {
  float d = 1.0 + g * g - 2.0 * g * c;
  return ( 1.0 - g * g ) / ( d * sqrt( d ) );
}
void main() {
  int kind = int( aShape.x + 0.5 );
  vec3 n = position; // the vent, on the unit sphere
  vec3 p;
  float fade = 1.0;
  if ( kind == 4 ) {
    p = n * ( 1.0 + 0.6 / uRadiusKm );
  } else if ( kind == 3 ) {
    // A column: up to its height in the first riseS seconds, then carried along aDir (km), fanning out.
    float T = aMotion.y;
    float s = fract( uTime / T + aMotion.z );
    float tt = s * T;
    float riseS = aShape.w;
    float h = aMotion.x * min( tt / riseS, 1.0 );
    float k = max( tt - riseS, 0.0 ) / max( T - riseS, 1.0 );
    float jit = fract( aMotion.z * 97.13 );
    vec3 side = normalize( cross( n, normalize( aDir ) ) );
    vec3 horiz = aDir * k + side * ( aShape.z * k + ( jit - 0.5 ) * 1.2 );
    h += ( fract( aMotion.z * 53.7 ) - 0.5 ) * 2.0 * k;
    float hl = length( horiz );
    vec3 u = hl > 1e-6 ? horiz / hl : vec3( 0.0 );
    float ang = hl / uRadiusKm;
    p = ( n * cos( ang ) + u * sin( ang ) ) * ( 1.0 + max( h, 0.0 ) / uRadiusKm );
    fade = smoothstep( 0.0, 0.02, s ) * ( 1.0 - smoothstep( 0.85, 1.0, s ) );
  } else {
    // A grain on its arc: flat gravity in the vent's frame, the ground distance bent round the sphere.
    float T = aMotion.y;
    float s = fract( uTime / T + aMotion.z );
    float tt = s * T;
    float v = aMotion.x;
    float cz = dot( aDir, n );
    float h = v * cz * tt - 0.5 * uG * tt * tt;
    vec3 horiz = ( aDir - cz * n ) * v * tt;
    float hl = length( horiz );
    vec3 u = hl > 1e-6 ? horiz / hl : vec3( 0.0 );
    float ang = hl / uRadiusKm;
    p = ( n * cos( ang ) + u * sin( ang ) ) * ( 1.0 + max( h, 0.0 ) / uRadiusKm );
    fade = smoothstep( 0.0, 0.03, s ) * ( 1.0 - smoothstep( 0.96, 1.0, s ) );
  }
  vec4 worldPos = modelMatrix * vec4( p, 1.0 );
  vec4 mv = viewMatrix * worldPos;
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
  // The Sun in the body's axes (the mesh is scaled uniformly): the moon's own shadow.
  vec3 sunL = normalize( transpose( mat3( modelMatrix ) ) * uSunDir );
  float along = dot( p, sunL );
  float lit = along >= 0.0 ? 1.0 : smoothstep( 0.985, 1.015, length( p - along * sunL ) );
  int li = kind;
  if ( kind == 4 ) {
    // A hot spot: only where it is night, a fixed small point, its rank its brightness.
    float night = smoothstep( 0.03, -0.12, dot( n, sunL ) );
    gl_PointSize = 3.5 + 2.5 * aMotion.w;
    vLight = uColour[4] * night;
    vTau = aMotion.w * 1.6;
    vAbsorb = 0.0;
    return;
  }
  // Forward scattering: the angle at the grain between the Sun and the camera, by the kind's own g,
  // as a ratio to its value at a right angle (capped: no grain outshines the lit ground by much).
  vec3 toCam = normalize( cameraPosition - worldPos.xyz );
  float c = -dot( normalize( uSunDir ), toCam );
  float phase = min( hg( c, uHG[li] ) / hg( 0.0, uHG[li] ), PHASE_CAP );
  // The grain's size on the screen; its light is kept when the size is clamped.
  float unitScale = length( modelMatrix[0].xyz );
  float px = aShape.y / uRadiusKm * unitScale * projectionMatrix[1][1] * 0.5 * uViewportH / max( -mv.z, 1e-6 );
  float pxC = clamp( px, 1.5, 14.0 * max( 1.0, uViewportH / 900.0 ) );
  gl_PointSize = pxC;
  vTau = aMotion.w * uDensity * fade * ( px * px ) / ( pxC * pxC );
  vLight = uColour[li] * phase * lit;
  vAbsorb = uAbsorb[li];
}
`;

const FRAG = /* glsl */`
#define GRAIN_MAX ${GRAIN_MAX.toFixed(2)}
#include <common>
#include <logdepthbuf_pars_fragment>
varying vec3 vLight;
varying float vTau;
varying float vAbsorb;
void main() {
  #include <logdepthbuf_fragment>
  vec2 q = gl_PointCoord - 0.5;
  float r2 = dot( q, q ) * 4.0;
  if ( r2 > 1.0 ) discard;
  float a = min( vTau * exp( -3.0 * r2 ), GRAIN_MAX );
  gl_FragColor = vec4( vLight * a, a * vAbsorb );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
export const SHADERS = { VERT, FRAG };

/** One moon's Points: geometry, material and the per-frame uniforms set in onBeforeRender. */
function buildPoints(worldId, env) {
  const P = particlesFor(worldId);
  if (!P || !P.count) return null;
  const geo = new THREE.BufferGeometry();
  // `position` is the vent on the unit sphere; the grain's place is worked out in the shader, so the
  // bounds are set by hand below.
  geo.setAttribute('position', new THREE.BufferAttribute(P.vent, 3));
  geo.setAttribute('aDir', new THREE.BufferAttribute(P.dir, 3));
  geo.setAttribute('aMotion', new THREE.BufferAttribute(P.motion, 4));
  geo.setAttribute('aShape', new THREE.BufferAttribute(P.shape, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1 + (P.topKm * 1.15) / P.radiusKm + 0.02);
  const col = (k) => { const c = (PLUME_LOOK[k] && PLUME_LOOK[k].colour) || [1, 1, 1]; return new THREE.Vector3(c[0], c[1], c[2]); };
  const num = (k, f, d) => (PLUME_LOOK[k] && Number.isFinite(Number(PLUME_LOOK[k][f])) ? Number(PLUME_LOOK[k][f]) : d);
  const uniforms = {
    uTime: { value: 0 },
    uG: { value: P.g },
    uRadiusKm: { value: P.radiusKm },
    uDensity: { value: 1 },
    uViewportH: { value: 900 },
    uSunDir: { value: new THREE.Vector3(1, 0, 0) },
    uColour: { value: KINDS.map(col) },
    uAbsorb: { value: KINDS.map((k) => num(k, 'absorb', 0)) },
    uHG: { value: KINDS.map((k) => num(k, 'g', 0.5)) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  mat.name = 'plumes-' + worldId;
  const points = new THREE.Points(geo, mat);
  points.name = 'plumes-' + worldId;
  points.raycast = () => {}; // never picked: the moon is
  points.renderOrder = 2;
  const size = new THREE.Vector2();
  const half = P.hot + Math.ceil((P.count - P.hot) / 2);
  points.onBeforeRender = (renderer) => {
    uniforms.uTime.value = env.time();
    renderer.getDrawingBufferSize(size);
    uniforms.uViewportH.value = size.y;
    const sun = env.sunDir(worldId);
    if (sun) uniforms.uSunDir.value.copy(sun);
    const low = env.low();
    uniforms.uDensity.value = low ? 2 : 1;
    geo.setDrawRange(0, low ? half : P.count);
  };
  return { points, geo, mat, count: P.count, hot: P.hot, bytes: P.count * (3 + 3 + 4 + 4) * 4, plumes: P.plumes };
}

export function createPlumes(ctx) {
  const reducedQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduced = () => !!(reducedQuery && reducedQuery.matches);
  const look = () => (ctx && typeof ctx.look === 'function' ? ctx.look() : 'film');
  let frozenAt = 0;
  const env = {
    time() {
      const rate = ctx.clock && Number.isFinite(ctx.clock.rate) ? ctx.clock.rate : 1;
      const s = motionTime(ctx.clock ? ctx.clock.now() : 0, look(), reduced(), ctx.clock && ctx.clock.paused ? 0 : rate);
      // Held under a shimmering clock: where it was, not a jump back to 0.
      if (s === null) return frozenAt;
      frozenAt = s;
      return s;
    },
    sunDir(id) { try { return ctx.worlds.sunDirOf(id); } catch { return null; } },
    low() {
      try {
        const tier = ctx.quality ? ctx.quality.tier : 1;
        return tier === 0 || !!(ctx.latch && ctx.latch.latched);
      } catch { return false; }
    },
  };
  const built = new Map(); // worldId -> buildPoints()
  let current = null;
  let on = true;
  const say = () => { try { window.dispatchEvent(new CustomEvent('sr:plumes')); } catch { /* no window in a test */ } };
  const onLook = () => say();
  if (typeof window !== 'undefined') window.addEventListener('sr:look', onLook);

  const free = (id) => {
    const b = built.get(id);
    if (!b) return;
    if (b.points.parent) b.points.parent.remove(b.points);
    b.geo.dispose();
    b.mat.dispose();
    built.delete(id);
  };

  const api = {
    /** The stage changed: build the new moon's plumes on its mesh, free the old one's. */
    stage(id) {
      for (const k of [...built.keys()]) if (k !== id) free(k);
      current = PLUME_WORLDS[id] ? id : null;
      if (current && !built.has(current)) {
        const mesh = ctx.worlds && ctx.worlds.meshFor ? ctx.worlds.meshFor(current) : null;
        const b = mesh ? buildPoints(current, env) : null;
        if (b) {
          b.points.visible = on;
          mesh.add(b.points);
          built.set(current, b);
        }
      }
      say();
      return current;
    },
    line(worldId) { return built.has(worldId) ? lineFor(worldId, look(), reduced()) : null; },
    state() {
      const b = current ? built.get(current) : null;
      return {
        on, stage: current, worlds: [...built.keys()], plumes: b ? b.plumes : [], particles: b ? b.count : 0, hot: b ? b.hot : 0,
        drawn: b ? Math.min(b.geo.drawRange.count, b.count) : 0, low: env.low(), still: stillUnder(look(), UNDER_MEASURED.plumes) || reduced(),
        time: b ? b.mat.uniforms.uTime.value : null, look: look(), bytes: b ? b.bytes : 0,
      };
    },
    /** Tools only (tests/probes/look/r12-moons.js): `{ on: false }` takes the plumes off for a before. */
    debug(opts = {}) {
      if (typeof opts.on === 'boolean') { on = opts.on; for (const b of built.values()) b.points.visible = on; }
      return api.state();
    },
    dispose() {
      for (const k of [...built.keys()]) free(k);
      if (typeof window !== 'undefined') window.removeEventListener('sr:look', onLook);
    },
  };
  return api;
}

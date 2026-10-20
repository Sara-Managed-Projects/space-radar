// scene/deep/shellneb.js -- planetary nebulae as heroes: the part the Helix (helix.js) and the Ring (ring.js)
// share (internal spec 0076 stage W3-b, #872; spec 0075 task 45). Fetched with the first of them, never at boot.
//
// A planetary nebula is drawn as a few crisp layers (slabs, rings, ellipsoids, shells) in its SKY FRAME (x west,
// y north, z toward the Sun, light-years about the white dwarf), lit by its photograph: every sky point's light
// is shared among the layers our line of sight crosses there and divided by each layer's depth along that line,
// so that FROM OUR SIDE THE MODEL IS THE PHOTOGRAPH and, turned, it is the same structure foreshortened. What
// lives here is what does not depend on the object:
//   the sky frame and a ring's axis from its tilt and the position angle of its near side   skyFrame, ringAxis
//   where the light map sits on the sky (turned by the archive's own north)                   uvOf
//   the part of a ray inside a slab or ring, and inside an ellipsoid                           layerSpan, quadSpan
//   THE EXACT FRONT (spec 0075 task 45): the slab's crisp profile exp(-u^4) integrated in closed form over each
//   step of the march, so a face is found exactly per ray at any step count (as #1185 found the Tarantula's
//   wall), and on our line the column is the photograph's whatever the steps                 quarticCdf, slabIntegral
//   the exposure's stretch, the palette by look, the shares, the samples by tier              lightStretch, paletteOf, sharesOf, samplesOf
//   a static per-pixel offset (grain, never bands)                                             pixelHash
//   the material policy (gasmat.js COLOUR_POLICY), the sky frame's placement, the knots' and the white dwarf's
//   meshes and their shaders                                                                    shellMaterial, skyPlacer, starMesh, knotMesh, SHELL_SHADERS
// Each GLSL function below is written from the JS beside it; tests/test_hero_ring.mjs holds the two equal.

import { stage } from '../stage.js';
import { exposureLook, EXPOSURES } from '../exposure.js';

export const D2R = Math.PI / 180;
export const AU_LY = 1 / 63241.077;
export const QUARTIC = 1.8128049541109541; // ∫ exp(-u⁴) du over the line, 2 Γ(5/4)
const OBLIQUITY = 23.4392911 * D2R;
const POLE = [0, Math.sin(OBLIQUITY), Math.cos(OBLIQUITY)]; // the north celestial pole, sun-inertial (ecliptic J2000)

export const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const neg = (a) => [-a[0], -a[1], -a[2]];
export const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const hexRgb = (h) => { const n = parseInt(String(h).replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
export const f3 = (x) => Number(x).toFixed(3);

/** A static per-pixel offset in [0, 1): a hash of the pixel (no pattern, no temporal state). GLSL pixelHash(). Pure. */
export function pixelHash(x, y) {
  const fr = (v) => v - Math.floor(v);
  let a = fr(x * 0.1031), b = fr(y * 0.1031), c = fr(x * 0.1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d; b += d; c += d;
  return fr((a + b) * c);
}

// --------------------------------------------------------------------------------- the sky frame

/** The sky frame at an object, in sun-inertial: west, north, and toward the Sun (right-handed). Pure. */
export function skyFrame(posKm) {
  const u = norm([posKm.x, posKm.y, posKm.z]);
  const east = norm(cross(POLE, u));
  const north = cross(u, east);
  return { west: neg(east), north, toward: neg(u) };
}

/**
 * A ring's axis in the sky frame from its tilt out of the plane of the sky and the position angle (east of
 * north) of its NEAR side. The near side of a tilted circle is where the FAR end of its axis points on the
 * sky (O'Dell, McCullough & Meixner 2004 state the Helix's angles both ways, sections 3.1 and 4.4). Pure.
 */
export function ringAxis(inclDeg, nearPaDeg) {
  const i = inclDeg * D2R, pa = nearPaDeg * D2R;
  return [-Math.sin(pa) * Math.sin(i), Math.cos(pa) * Math.sin(i), -Math.cos(i)];
}

/** Two unit directions in the plane perpendicular to `ax`. Pure. */
export const planeBasis = (ax) => { const e1 = norm(cross(ax, Math.abs(ax[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0])); return [e1, cross(ax, e1)]; };

/** The direction on the sky at position angle `paDeg` (east of north), in the sky frame (x west, y north). Pure. */
export const skyDir = (paDeg) => [-Math.sin(paDeg * D2R), Math.cos(paDeg * D2R), 0];

/**
 * The light map's place on the sky: u = u0 + (x cos r - y sin r) / W, v = v0 + (x sin r + y cos r) / H (x west,
 * y north, light-years; r the archive's `north_deg`, how far north is turned to the LEFT of the picture's up, as
 * scene/nebulae.js pictureBasis reads it: up = (sin r, cos r), right = (cos r, -sin r) in x, y). The picture's
 * centre is its measured one (registry/nebulae.yaml), not the star's. At r = 0 this is the Helix's mapping. Pure.
 */
export function uvOf(row, recordRaDec, distLy) {
  const asLy = (arcmin) => arcmin * 60 * distLy * Math.PI / 648000;
  const W = asLy(row.width_arcmin), H = asLy(row.height_arcmin);
  const [ra, dec] = recordRaDec;
  const eastArcmin = (row.ra_deg - ra) * Math.cos(dec * D2R) * 60, northArcmin = (row.dec_deg - dec) * 60;
  const r = (Number(row.north_deg) || 0) * D2R, c = Math.cos(r), s = Math.sin(r);
  // the star relative to the picture's centre: west by the centre's east offset, south by its north offset
  const x = asLy(eastArcmin), y = -asLy(northArcmin);
  return { u0: 0.5 + (x * c - y * s) / W, v0: 0.5 + (x * s + y * c) / H, W, H, cos: c, sin: s };
}

/** (u, v) on the light map of sky point (x, y) (uvOf's mapping). Pure. */
export const uvAt = (uv, x, y) => [uv.u0 + (x * uv.cos - y * uv.sin) / uv.W, uv.v0 + (x * uv.sin + y * uv.cos) / uv.H];

// ------------------------------------------------------------ spans along a ray (mirrored in GLSL)

/**
 * The part of the ray ro + t·rd, t in [t0, t1], inside a slab about axis `a`: |z| <= h and rIn <= ρ <= rOut,
 * ρ the distance from the axis. Up to two pieces, [lo1, hi1, lo2, hi2] (a piece with hi <= lo is empty), or
 * null. rd need not be a unit vector: ro and rd may be taken into a scaled frame (an elliptic ring is a round
 * one there) and t keeps its meaning. Pure; GLSL layerSpan() is the same arithmetic.
 */
export function layerSpan(ro, rd, a, h, rIn, rOut, t0, t1) {
  const z0 = dot(ro, a), dz = dot(rd, a);
  let lo = t0, hi = t1;
  if (Math.abs(dz) > 1e-6) {
    const ta = (-h - z0) / dz, tb = (h - z0) / dz;
    lo = Math.max(lo, Math.min(ta, tb)); hi = Math.min(hi, Math.max(ta, tb));
  } else if (Math.abs(z0) > h) return null;
  const op = [ro[0] - a[0] * z0, ro[1] - a[1] * z0, ro[2] - a[2] * z0];
  const dp = [rd[0] - a[0] * dz, rd[1] - a[1] * dz, rd[2] - a[2] * dz];
  const A = dot(dp, dp), B = dot(op, dp), C = dot(op, op);
  if (A > 1e-9) {
    let D = B * B - A * (C - rOut * rOut);
    if (D <= 0) return null;
    D = Math.sqrt(D);
    lo = Math.max(lo, (-B - D) / A); hi = Math.min(hi, (-B + D) / A);
  } else if (C > rOut * rOut) return null;
  if (hi <= lo) return null;
  if (rIn > 0) {
    if (A > 1e-9) {
      let D = B * B - A * (C - rIn * rIn);
      if (D > 0) { D = Math.sqrt(D); return [lo, Math.min(hi, (-B - D) / A), Math.max(lo, (-B + D) / A), hi]; }
    } else if (C < rIn * rIn) return null;
  }
  return [lo, hi, hi, hi];
}
export const spanLen = (s) => (s ? Math.max(0, s[1] - s[0]) + Math.max(0, s[3] - s[2]) : 0);
export const spanT = (s, u) => { const l1 = Math.max(0, s[1] - s[0]); return u < l1 ? s[0] + u : s[2] + (u - l1); };

/**
 * The part of the ray inside a quadric |S·p| <= 1 (S's rows given; an ellipsoid, or with rOut/rIn a shell between
 * two such), clipped to [t0, t1]: [lo, hi] or null. Pure; GLSL quadSpan() is the same arithmetic.
 */
export function quadSpan(S, ro, rd, t0, t1) {
  const q0 = S.map((r) => dot(r, ro)), qd = S.map((r) => dot(r, rd));
  const A = dot(qd, qd), B = dot(q0, qd), C = dot(q0, q0) - 1;
  if (!(A > 1e-12)) return C <= 0 ? [t0, t1] : null;
  const D = B * B - A * C;
  if (D <= 0) return null;
  const e = Math.sqrt(D);
  const lo = Math.max(t0, (-B - e) / A), hi = Math.min(t1, (-B + e) / A);
  return hi > lo ? [lo, hi] : null;
}

/** A shell between an outer and an inner quadric along a ray: [lo1, hi1, lo2, hi2] (layerSpan's form) or null. Pure. */
export function shellSpan(Sout, Sin, ro, rd, t0, t1) {
  const o = quadSpan(Sout, ro, rd, t0, t1);
  if (!o) return null;
  const i = quadSpan(Sin, ro, rd, o[0], o[1]);
  if (!i) return [o[0], o[1], o[1], o[1]];
  return [o[0], i[0], i[1], o[1]];
}

// ----------------------------------------------------------- the exact front (spec 0075 task 45)

/**
 * ∫₀ᵘ exp(-s⁴) ds for |u| <= 1.6 (a slab's box), as an odd polynomial u·Σ cₖ u²ᵏ fitted on [0, 1.6] (largest
 * error 5e-6, monotone); beyond 1.6 it is held (exp(-1.6⁴) is 0.15 % of the middle). GLSL quarticCdf(). Pure.
 */
export const QUARTIC_CDF = [0.999999745, 2.86495973e-05, -0.200513148, 0.00348474699, 0.043735069, 0.0226792492, -0.0387225921, 0.0173969091, -0.00353029945, 0.000280766751];
export function quarticCdf(u) {
  const x = Math.max(-1.6, Math.min(1.6, u)), w = x * x;
  let p = 0;
  for (let k = QUARTIC_CDF.length - 1; k >= 0; k--) p = p * w + QUARTIC_CDF[k];
  return x * p;
}

/**
 * The slab's profile exp(-u⁴) integrated EXACTLY over span coordinates [a, b] of a span `s` (layerSpan's pieces),
 * along a ray where u = z0 + dz·t (u in half-thicknesses): the result is in t's units. A step therefore carries
 * the light of the whole stretch it stands for, not of the one point it samples, so a crisp face is crossed
 * exactly at any step count, and along our line the column is the photograph's however few the steps. Pure.
 */
export function slabIntegral(s, a, b, z0, dz) {
  if (!s || !(b > a)) return 0;
  const l1 = Math.max(0, s[1] - s[0]);
  const piece = (ta, tb) => {
    const len = tb - ta;
    if (!(len > 0)) return 0;
    const ua = z0 + dz * ta, ub = z0 + dz * tb;
    if (Math.abs(ub - ua) < 1e-3) { const um = 0.5 * (ua + ub); return Math.exp(-(um ** 4)) * len; }
    return (quarticCdf(ub) - quarticCdf(ua)) / dz;
  };
  let sum = 0;
  if (a < l1) sum += piece(s[0] + a, s[0] + Math.min(b, l1));
  if (b > l1) sum += piece(s[2] + Math.max(a, l1) - l1, s[2] + b - l1);
  return sum;
}

// ----------------------------------------------------------------------------- looks, shares, tiers

/** The exposure's stretch on a display colour, as scene/nebulae.js shows the photograph: gamma, then saturation. Pure. */
export function lightStretch(c, gamma = 1, sat = 1) {
  const s = c.map((x) => Math.max(0, x) ** gamma);
  const y = 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
  return { rgb: s.map((x) => y + (x - y) * sat), lum: y };
}

/**
 * The exposure (scene/exposure.js) from the coordinator's gain (the exposure's milkyWay number): the light's
 * stretch as the photographs have it (gain, gamma, saturation) and the knots' cusp and the star's colours: the
 * profile's under Eye and Camera, its declared `enhanced` set under Deep. Pure.
 */
export function paletteOf(gain, P, fallback = { Ha: '#f59a62', star: '#cfdcff' }) {
  const mode = EXPOSURES.find((m) => Math.abs(exposureLook(m).milkyWay - gain) < 1e-6) || 'camera';
  const L = exposureLook(mode);
  const colours = (P && P.colours) || { lines: {} };
  const set = mode === 'deep' && colours.enhanced ? colours.enhanced : colours;
  const sat = (c) => { const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; return c.map((x) => y + (x - y) * L.nebulaSaturation); };
  const pick = (k) => sat(hexRgb((set.lines && set.lines[k]) || (colours.lines && colours.lines[k]) || fallback[k]));
  return { mode, enhanced: set.mode === 'enhanced', gain: L.nebulaGain, gamma: L.nebulaGamma, saturation: L.nebulaSaturation, cusp: pick('Ha'), star: pick('star') };
}

/**
 * How much of each part draws. `level` is the coordinator's level share (its 300 ms fade), `rPx` the record's
 * radius on screen and `viewH` the view's height (CSS px), `photo` how much of its photograph is drawn now. The
 * gas and the knots give way to the photograph (the point glow gives way to the hero: main.js, deepsky.js
 * heroShares); the star stays, at half strength over the photograph, whose star it doubles. `light` is the
 * eye's adaptation: as the nebula grows past the view its light is scaled down, to `adapt` from inside. Pure.
 */
export function sharesOf({ level = 0, rPx = 0, photo = 0, viewH = 800 } = {}, adapt = 0.45) {
  const lv = Math.min(1, Math.max(0, Number(level) || 0));
  const ph = Math.min(1, Math.max(0, Number(photo) || 0));
  const gas = lv * (1 - ph);
  const fill = Number.isFinite(rPx) ? Math.max(0, Number(rPx) || 0) / Math.max(1, viewH / 2) : Infinity;
  const light = 1 - (1 - adapt) * (Number.isFinite(fill) ? smooth(fill, 0.7, 2) : 1);
  return { gas, knots: gas, star: lv * (1 - 0.5 * ph), light };
}

/** Samples a layer: 4 on T0, 8 at level 2, half the march's steps above, at most `max`. Pure. */
export function samplesOf({ tier = 1, steps = 0 } = {}, max = 24) {
  if (!(tier >= 1)) return 4;
  return Math.max(8, Math.min(max, Math.round((Number(steps) || 0) / 2)));
}

/** The view's size in CSS px (1280 x 800 outside a page). */
export function viewSize() {
  const vw = (typeof globalThis.innerWidth === 'number' && globalThis.innerWidth) || 1280;
  const vh = (typeof globalThis.innerHeight === 'number' && globalThis.innerHeight) || 800;
  return { vw, vh };
}

// ------------------------------------------------------------------------------------- the GLSL

const COMMON = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
`;

/** GLSL pieces, each the JS function of the same name above. */
export const GLSL = {
  common: COMMON,
  layerSpan: /* glsl */ `
// The part of the ray inside a slab about axis a: |z| <= h, rIn <= rho <= rOut. Two pieces (lo1, hi1,
// lo2, hi2); a piece with hi <= lo is empty. shellneb.js layerSpan() is the same arithmetic.
vec4 layerSpan( vec3 ro, vec3 rd, vec3 a, float h, float rIn, float rOut, float t0, float t1 ) {
  float z0 = dot( ro, a );
  float dz = dot( rd, a );
  float lo = t0;
  float hi = t1;
  if ( abs( dz ) > 1e-6 ) {
    float ta = ( -h - z0 ) / dz;
    float tb = ( h - z0 ) / dz;
    lo = max( lo, min( ta, tb ) );
    hi = min( hi, max( ta, tb ) );
  } else if ( abs( z0 ) > h ) return vec4( 0.0 );
  vec3 op = ro - a * z0;
  vec3 dp = rd - a * dz;
  float A = dot( dp, dp );
  float B = dot( op, dp );
  float C = dot( op, op );
  if ( A > 1e-9 ) {
    float D = B * B - A * ( C - rOut * rOut );
    if ( D <= 0.0 ) return vec4( 0.0 );
    D = sqrt( D );
    lo = max( lo, ( -B - D ) / A );
    hi = min( hi, ( -B + D ) / A );
  } else if ( C > rOut * rOut ) return vec4( 0.0 );
  if ( hi <= lo ) return vec4( 0.0 );
  if ( rIn > 0.0 ) {
    if ( A > 1e-9 ) {
      float E = B * B - A * ( C - rIn * rIn );
      if ( E > 0.0 ) {
        E = sqrt( E );
        return vec4( lo, min( hi, ( -B - E ) / A ), max( lo, ( -B + E ) / A ), hi );
      }
    } else if ( C < rIn * rIn ) return vec4( 0.0 );
  }
  return vec4( lo, hi, hi, hi );
}
`,
  pixelHash: /* glsl */ `
float pixelHash( vec2 p ) {
  vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
  p3 += dot( p3, p3.yzx + 33.33 );
  return fract( ( p3.x + p3.y ) * p3.z );
}
float spanLen( vec4 s ) { return max( 0.0, s.y - s.x ) + max( 0.0, s.w - s.z ); }
float spanT( vec4 s, float u ) { float l1 = max( 0.0, s.y - s.x ); return u < l1 ? s.x + u : s.z + ( u - l1 ); }
`,
  // the exact front: shellneb.js quarticCdf() and slabIntegral()
  front: /* glsl */ `
float quarticCdf( float u ) {
  float x = clamp( u, -1.6, 1.6 );
  float w = x * x;
  float p = ${QUARTIC_CDF[9]};
${QUARTIC_CDF.slice(0, 9).reverse().map((c) => `  p = p * w + ${c};`).join('\n')}
  return x * p;
}
float slabPiece( float ta, float tb, float z0, float dz ) {
  float len = tb - ta;
  if ( len <= 0.0 ) return 0.0;
  float ua = z0 + dz * ta;
  float ub = z0 + dz * tb;
  if ( abs( ub - ua ) < 1e-3 ) { float um = 0.5 * ( ua + ub ); return exp( -um * um * um * um ) * len; }
  return ( quarticCdf( ub ) - quarticCdf( ua ) ) / dz;
}
float slabIntegral( vec4 s, float a, float b, float z0, float dz ) {
  float l1 = max( 0.0, s.y - s.x );
  float sum = 0.0;
  if ( a < l1 ) sum += slabPiece( s.x + a, s.x + min( b, l1 ), z0, dz );
  if ( b > l1 ) sum += slabPiece( s.z + max( a, l1 ) - l1, s.z + b - l1, z0, dz );
  return sum;
}
`,
  quadSpan: /* glsl */ `
// The part of the ray inside |S p| <= 1 (shellneb.js quadSpan), clipped to [t0, t1]; hi <= lo when it misses.
vec2 quadSpan( mat3 S, vec3 ro, vec3 rd, float t0, float t1 ) {
  vec3 q0 = S * ro;
  vec3 qd = S * rd;
  float A = dot( qd, qd );
  float B = dot( q0, qd );
  float C = dot( q0, q0 ) - 1.0;
  if ( A <= 1e-12 ) return C <= 0.0 ? vec2( t0, t1 ) : vec2( 0.0 );
  float D = B * B - A * C;
  if ( D <= 0.0 ) return vec2( 0.0 );
  float e = sqrt( D );
  return vec2( max( t0, ( -B - e ) / A ), min( t1, ( -B + e ) / A ) );
}
vec4 shellSpan( mat3 So, mat3 Si, vec3 ro, vec3 rd, float t0, float t1 ) {
  vec2 o = quadSpan( So, ro, rd, t0, t1 );
  if ( o.y <= o.x ) return vec4( 0.0 );
  vec2 i = quadSpan( Si, ro, rd, o.x, o.y );
  if ( i.y <= i.x ) return vec4( o.x, o.y, o.y, o.y );
  return vec4( o.x, i.x, i.y, o.y );
}
`,
};

// A knot: a quad from the head back along the line from the star, screen-aligned. position.x is -1 at the star's
// side and +1 at the tail's end, position.y across it.
const KNOT_VERT = /* glsl */ `
attribute vec3 aPos;
attribute vec4 aKnot;     // head radius (ly), tail length (ly), opacity, seed
uniform float uViewH;     // the view's height, CSS px
uniform float uMinPx;     // the smallest head drawn, CSS px
varying vec2 vUv;         // in head radii: x away from the star, y across
varying float vTail;      // the tail's length in head radii
varying float vAlpha;
${COMMON}
void main() {
  vec4 c = modelViewMatrix * vec4( aPos, 1.0 );
  vec4 s = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
  float zc = max( 1e-6, -c.z );
  vec2 away = c.xy / zc - s.xy / max( 1e-6, -s.z );
  away = dot( away, away ) > 1e-14 ? normalize( away ) : vec2( 1.0, 0.0 );
  vec2 side = vec2( -away.y, away.x );
  float headPx = aKnot.x * projectionMatrix[ 1 ][ 1 ] * 0.5 * uViewH / zc;
  float grow = max( 1.0, uMinPx / max( headPx, 1e-6 ) );
  float head = aKnot.x * grow;
  float tail = aKnot.y * grow;
  float along = position.x < 0.0 ? -1.3 * head : tail;
  vUv = vec2( position.x < 0.0 ? -1.3 : tail / head, position.y * 1.3 );
  vTail = tail / head;
  // Drawn bigger than it is, a knot keeps more darkness than its area would: exaggerated so it can be
  // seen at mid distance (the hero's registry file says so), and still fading with its true size.
  vAlpha = aKnot.z * min( 1.0, 1.0 / sqrt( grow ) );
  c.xy += away * along + side * position.y * 1.3 * head;
  gl_Position = projectionMatrix * c;
  #include <logdepthbuf_vertex>
}
`;

const KNOT_FRAG = /* glsl */ `
uniform vec3 uCusp;
uniform float uShare;
uniform float uGain;
varying vec2 vUv;
varying float vTail;
varying float vAlpha;
#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  if ( uShare <= 0.0 ) discard;
  float d = length( vUv );
  float headA = 1.0 - smoothstep( 0.55, 1.1, d );
  float u = clamp( vUv.x / max( vTail, 1e-3 ), 0.0, 1.0 );
  float w = 1.0 - 0.7 * u;
  float tailA = vUv.x > 0.0 ? ( 1.0 - smoothstep( 0.3 * w, w, abs( vUv.y ) ) ) * ( 1.0 - u ) * 0.25 : 0.0;
  float cr = ( d - 0.95 ) / 0.25;
  float cusp = exp( -cr * cr ) * ( 1.0 - smoothstep( -0.7, 0.2, vUv.x / max( d, 1e-3 ) ) ); // edges in order (GLSL)
  float a = vAlpha * max( headA, tailA );
  if ( a <= 0.002 && cusp <= 0.002 ) discard;
  gl_FragColor = vec4( uCusp * cusp * vAlpha * 1.4 * uGain * uShare, a * uShare );
}
`;

// The white dwarf: a point of a fixed size on screen, with its halo, at the centre of the frame.
const STAR_VERT = /* glsl */ `
uniform vec2 uView;       // the view's width and height, CSS px
uniform float uPx;        // the sprite's half size, CSS px
varying vec2 vPx;
${COMMON}
void main() {
  vPx = position.xy * uPx;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
  gl_Position.xy += position.xy * uPx * 2.0 / uView * gl_Position.w;
  #include <logdepthbuf_vertex>
}
`;

const STAR_FRAG = /* glsl */ `
uniform vec3 uColour;
uniform float uShare;
varying vec2 vPx;
#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  float d = length( vPx );
  float core = exp( -( d / 1.3 ) * ( d / 1.3 ) );
  float halo = 0.22 * exp( -d / 4.5 ) * ( 1.0 - smoothstep( 14.0, 20.0, d ) );
  float k = ( core + halo ) * uShare;
  if ( k <= 0.002 ) discard;
  gl_FragColor = vec4( uColour * k, 1.0 );
}
`;

export const SHELL_SHADERS = { knotVertex: KNOT_VERT, knot: KNOT_FRAG, starVertex: STAR_VERT, star: STAR_FRAG };

// ------------------------------------------------------------------------------------- the meshes

/**
 * gasmat.js COLOUR_POLICY: display values, the opaque list, no depth write, additive for light and
 * premultiplied "over" (with GAS_ABSORB) for what absorbs.
 */
export function shellMaterial(THREE, { vertexShader, fragmentShader, uniforms, absorbing, side }) {
  const m = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: false, depthTest: false, depthWrite: false, toneMapped: false, side: side || THREE.DoubleSide });
  if (absorbing) {
    m.defines = { GAS_ABSORB: '' };
    m.blending = THREE.CustomBlending;
    m.blendSrc = THREE.OneFactor;
    m.blendDst = THREE.OneMinusSrcAlphaFactor;
  } else m.blending = THREE.AdditiveBlending;
  return m;
}

/**
 * The sky frame (west, north, toward the Sun) as a child of the hero's group, placed from the record's direction
 * whenever the stage changes; `camera(cam, out)` puts the camera in that frame (light-years, float64 on the CPU).
 */
export function skyPlacer(THREE, group, env) {
  const sky = new THREE.Group();
  sky.name = `${group.name}-sky`;
  sky.matrixAutoUpdate = false;
  group.add(sky);
  let basisFor = null;
  const c = new THREE.Vector3(), tip = new THREE.Vector3();
  const _inv = new THREE.Matrix4(), _id = new THREE.Matrix4();
  function place() {
    const rec = env.record;
    basisFor = stage.worldId;
    if (!rec || !rec.pos) return;
    const f = skyFrame(rec.pos);
    if (!stage.toSceneInto(rec.pos, 'sun-inertial', c, stage.tMs)) return;
    const k = 1e12; // km: far enough to be a direction, near enough for float64
    const dir = (v) => {
      stage.toSceneInto({ x: rec.pos.x + v[0] * k, y: rec.pos.y + v[1] * k, z: rec.pos.z + v[2] * k }, 'sun-inertial', tip, stage.tMs);
      return tip.clone().sub(c).normalize();
    };
    const x = dir(f.west), y = dir(f.north);
    const z = new THREE.Vector3().crossVectors(x, y).normalize();
    y.crossVectors(z, x).normalize();
    sky.matrix.makeBasis(x, y, z);
    sky.matrixWorldNeedsUpdate = true;
  }
  return {
    sky,
    /** Place the frame if the stage changed since it was last placed. */
    update() { if (basisFor !== stage.worldId) place(); },
    /** The camera's position in the sky frame, into `out` (a Vector3). */
    camera(cam, out) {
      // The sky frame's world matrix from the matrices themselves (the coordinator places the group with
      // matrixAutoUpdate off; its parent, the deep-sky group, sits at the origin).
      if (group.parent) group.parent.updateWorldMatrix(true, false);
      _inv.multiplyMatrices(group.parent ? group.parent.matrixWorld : _id, group.matrix).multiply(sky.matrix).invert();
      return out.copy(cam.position).applyMatrix4(_inv);
    },
  };
}

const QUAD = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
export const QUAD_BYTES = QUAD.byteLength;

/** The white dwarf: one quad, a few pixels with its halo in the material. */
export function starMesh(THREE, colour, name) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(QUAD, 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const mat = shellMaterial(THREE, {
    vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
    uniforms: { uView: { value: new THREE.Vector2(1280, 800) }, uPx: { value: 20 }, uColour: { value: new THREE.Color().setRGB(...colour, THREE.NoColorSpace) }, uShare: { value: 0 } },
  });
  mat.name = `${name}-star`;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -0.96;
  return { mesh, mat, geo };
}

/** The knots' material (one per hero; the mesh is rebuilt when the tier changes). */
export function knotMaterial(THREE, { minPx, cusp, name }) {
  const mat = shellMaterial(THREE, {
    vertexShader: KNOT_VERT, fragmentShader: KNOT_FRAG, absorbing: true,
    uniforms: { uViewH: { value: 800 }, uMinPx: { value: minPx }, uCusp: { value: new THREE.Color().setRGB(...cusp, THREE.NoColorSpace) }, uShare: { value: 0 }, uGain: { value: 1 } },
  });
  mat.name = `${name}-knots`;
  return mat;
}

/** The knots as one instanced quad: `pos` (3 a knot) and `knot` (head, tail, opacity, seed). */
export function knotMesh(THREE, { pos, knot }, mat) {
  const n = pos.length / 3;
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(QUAD, 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3));
  geo.setAttribute('aKnot', new THREE.InstancedBufferAttribute(knot, 4));
  geo.instanceCount = n;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false; // the instances are not in the quad's bounds
  mesh.renderOrder = -0.98;
  return mesh;
}

/** A seeded uniform generator in [0, 1) and its Gaussian (Box-Muller). Pure. */
export function seeded(seed) {
  let a = seed >>> 0;
  const rand = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  return { rand, gauss };
}

/** The light map (a photograph without its stars) as a texture in display values; `state()` says loading / ready / failed. */
export function lightTexture(THREE, url, what) {
  let state = 'none', tex = null;
  if (typeof document !== 'undefined' && THREE.TextureLoader) {
    state = 'loading';
    tex = new THREE.TextureLoader().load(url, () => { state = 'ready'; }, undefined, (e) => { state = 'failed'; console.warn(`deep: the ${what} light map did not load`, e); });
    tex.colorSpace = THREE.NoColorSpace; // display values, as the photographs (gasmat.js COLOUR_POLICY)
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
  }
  return { tex, state: () => state };
}

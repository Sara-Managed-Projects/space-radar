// scene/blackhole.js -- a black hole as itself: the shadow, the photon ring, a Doppler-beamed disc whose far
// side is lensed up over the top, and, where they are measured, jets and a companion star (release 1.4.0,
// r14-mw-bh). No photograph is drawn in the scene; the Event Horizon Telescope's two stay on their cards.
//
// Contract: createBlackHole(record, opts) -> { group, jet, update(ctx), setOpacity, setTier, magnification,
//   stats(), dispose() }
// Pure, for tests/test_blackhole.mjs: PROFILES, profileFor(record), massKm(msun), SHADOW_M, ISCO_M, trace(),
//   redshift(), spinAxis(), discFlux(), FRAME_M
//
// HOW (geometry and shaders only: no render target, no post-processing, tests/test_contract.mjs). The hole is
// drawn on one square that always faces the camera, in the hole's own frame: one unit is GM/c^2 (M), the
// spin axis is +z and the disc lies in z = 0. Every pixel of the square follows its light BACK from the
// camera: in a straight line until it is RLENS from the hole, then along the Schwarzschild geodesic of the
// plane it moves in (Binet's equation u'' + u = 3u², u = M/r, four Runge-Kutta stages a step), and then
// straight again if it gets out. Where it crosses the disc it takes the disc's light; under 2M it is gone.
// So the shadow (radius sqrt(27) M, as seen from far), the thin photon ring at its edge (the light that
// went round), the disc's far side seen OVER the hole and under it, and the brighter approaching side are
// what the equation gives, not painted:
//   the disc     a thin disc from the innermost stable orbit (6M) out, its flux the Shakura-Sunyaev
//                profile F ∝ r^-3 (1 - sqrt(6M/r)), its colour a black body at T ∝ F^1/4;
//   the beaming  each patch in a circular orbit (Ω = sqrt(M/r³)): its light reaches us shifted by
//                g = sqrt(1 - 3M/r) / (1 - Ω L_z), L_z the photon's angular momentum about the spin axis;
//                the brightness goes as g^4 and the colour temperature as g.
// It does not do spin (Kerr), the disc's thickness, or the bending of the stars behind (that needs the sky as
// a texture, which would be a render target). The card and the line under a trip stop say so.
//
// SIZES. The square is in M, and M is the mass on the record (registry/exotics.yaml): 1.4766 km per Sun.
// Sagittarius A*'s 4.3 million Suns make M = 6.3 million km and a shadow 33 million km across (EHT 2022 saw
// a ring 51.8 microarcseconds across at 27 000 ly: 33 million km is 52 microarcseconds); M87*'s 6.5 billion
// make a shadow as wide as the Solar System to Pluto's orbit. Where that is under a few pixels -- from
// almost anywhere a visitor stands -- the whole is drawn larger, at a share of the view, and `magnification`
// says how much, for the line under it. Cygnus X-1 is drawn with its companion at the orbit's true size.
//
// JETS. M87*'s jet is measured: position angle 288 degrees on the sky, 17 degrees from our line of sight
// (Walker et al. 2018, ApJ 855, 128), seen in visible light for about 1.5 kpc (20 arcseconds at 16.8 Mpc).
// Near the hole it widens as a parabola (radius ∝ z^0.58, Asada & Nakamura 2012, ApJ 745, L28; drawn narrower than the
// measured width, a faint collimated beam, so the hole stays the subject), then as a
// cone. The jet that comes towards us is thousands of times brighter than the one going away (relativistic
// beaming), so the counter-jet is a trace. Drawn twice: with the hole at its drawn size, and at its true
// length in the galaxy M87, where a visitor framing M87 sees it.

import * as THREE from '../../vendor/three.module.min.js';

/** GM/c² for one solar mass, km (IAU 2015 nominal GM_sun / c²). */
export const KM_PER_MSUN = 1.4766250385;
export const SHADOW_M = Math.sqrt(27);
export const ISCO_M = 6;
/** The lens sphere: outside it light is taken as straight (the bend at 40M is under 3 degrees). */
export const RLENS = 40;
const LY_KM = 9460730472580.8;
const RSUN_KM = 695700;
const D2R = Math.PI / 180;

export const massKm = (msun) => msun * KM_PER_MSUN;

/** Under the Measured look: the disc's streaks are a fixed pattern (nothing turns), the hole and its light the same. */
export const UNDER_MEASURED = { hole: 'same', streaks: 'same', jet: 'same' };

/**
 * What each black hole looks like where it is measured, and what is chosen where it is not. Angles on the
 * sky: `incl` the spin axis from our line of sight (0 = face-on), `pa` the position angle of its projection
 * (from north through east), `turn` the disc's sense (+1 anticlockwise seen from the +z pole). `frame`: how
 * many M a drawn hole spans at its share of the view. `t` the colour temperature at the disc's brightest ring.
 */
export const PROFILES = {
  'sgr-a-star': {
    incl: 48, pa: 60, turn: -1, rOut: 18, t: 5000, frame: 13,
    cls: { mass: 'measured', size: 'measured', place: 'measured', disc: 'modelled', orientation: 'modelled' },
    why: 'EHT 2022 (ApJL 930, L12): a ring 51.8 µas across, best fitted seen within 50 degrees of face-on (48 is taken, the most the fit allows, so the far side of the disc shows over the shadow); GRAVITY 2018 saw flares circle clockwise. The axis on the sky is not measured: 60 degrees is chosen.',
  },
  'm87-star': {
    incl: 17, pa: 288, turn: -1, rOut: 18, t: 5000, frame: 13, host: 'dso-m87',
    // knots: [light-years along the jet, strength]: HST-1, D, F, A, C at 0.86, 2.8, 8.6, 12.4 and 17.5 arcseconds
    // from the core (Perlman et al. 2011), one arcsecond being 81 pc on the sky and 908 ly along a jet 17 degrees off our line
    jet: { lengthLy: 18000, knots: [[780, 0.9], [2540, 0.45], [7810, 0.4], [11260, 0.8], [15890, 0.35]], counter: 0.02 },
    cls: { mass: 'measured', size: 'measured', place: 'measured', disc: 'modelled', orientation: 'measured', jet: 'measured' },
    why: 'EHT 2019 (ApJL 875, L1): a ring 42 µas across, brighter in the south, the flow turning clockwise on the sky; the jet at 288 degrees, 17 degrees from our line (Walker et al. 2018).',
  },
  'cygnus-x-1': {
    incl: 27.5, pa: 340, turn: 1, rOutRsun: 4.5, t: 9e6, frame: 0,
    companion: { msun: 29, rsun: 22.9, k: 28500, name: 'HDE 226868' },
    periodDays: 5.599829, epochJd: 2441874.707,
    cls: { mass: 'measured', size: 'measured', place: 'measured', disc: 'modelled', orientation: 'measured', companion: 'measured' },
    why: 'The orbit: 5.599829 days (Brocksopp et al. 1999), inclined 27.5 degrees (Miller-Jones et al. 2021, Science 371, 1046). The supergiant: 29 Suns, 22.9 Suns wide, 28 500 K (Ramachandran et al. 2025). Its radio jet at about -20 degrees on the sky is taken as the spin axis.',
  },
  'ss-433': { incl: 78, pa: 100, turn: 1, rOut: 22, t: 2e7, frame: 13, jet: { lengthLy: 0.05, knots: [], counter: 0.6, stellar: true } },
  'grs-1915-105': { incl: 66, pa: 150, turn: 1, rOut: 22, t: 2e7, frame: 13, jet: { lengthLy: 0.05, knots: [], counter: 0.3, stellar: true } },
  'gaia-bh1': { quiet: true, incl: 60, pa: 0, turn: 1, frame: 12 },
  'gaia-bh3': { quiet: true, incl: 60, pa: 0, turn: 1, frame: 12 },
  'gaia-bh2': { quiet: true, incl: 60, pa: 0, turn: 1, frame: 12 }, // 0079 r15-a45: the third Gaia black hole, as quiet as the other two
  '3c-273': { incl: 10, pa: 222, turn: 1, rOut: 22, t: 9000, frame: 13, jet: { lengthLy: 200000, knots: [], counter: 0.003 } },
  '3c-279': { incl: 2, pa: 205, turn: 1, rOut: 22, t: 9000, frame: 13, jet: { lengthLy: 30000, knots: [], counter: 0.003 } },
};
const DEFAULT_STELLAR = { incl: 60, pa: 0, turn: 1, rOut: 22, t: 1e7, frame: 13 };
const DEFAULT_SUPER = { incl: 60, pa: 0, turn: 1, rOut: 18, t: 5000, frame: 13 };

/** The record's own id without the layer's prefix. */
const bare = (id) => String(id || '').replace(/^exotic-/, '');

/** Profile + mass for a record (meta.massMsun: a number or a range's middle). Pure. */
export function profileFor(record) {
  const meta = (record && record.meta) || {};
  const lo = Number(meta.massMsunLow), hi = Number(meta.massMsunHigh);
  let msun = Number(meta.massMsun);
  if (!(msun > 0) && lo > 0 && hi > 0) msun = (lo + hi) / 2;
  const own = PROFILES[bare(record && record.id)];
  const supermassive = msun > 1e4 || meta.kind === 'quasar';
  const p = { ...(supermassive ? DEFAULT_SUPER : DEFAULT_STELLAR), ...(own || {}) };
  if (!(msun > 0)) { msun = supermassive ? 1e9 : 10; p.massAssumed = true; }
  p.msun = msun;
  p.mKm = massKm(msun);
  if (p.rOutRsun) p.rOut = (p.rOutRsun * RSUN_KM) / p.mKm;
  p.id = bare(record && record.id);
  p.supermassive = supermassive;
  return p;
}

// ------------------------------------------------------------------------------------------- the light

/** Shakura-Sunyaev flux at r (M), normalised to 1 at its peak (r = 49/36 r_in). */
export function discFlux(r, rIn = ISCO_M) {
  if (r <= rIn) return 0;
  const f = (x) => Math.pow(x, -3) * (1 - Math.sqrt(rIn / x));
  return f(r) / f((49 / 36) * rIn);
}

/**
 * The disc's grain: rings and spiral streaks of brighter and darker gas, sheared by its orbits (illustrative:
 * the measured disc is unresolved). Mean about 1. The GLSL is the same line.
 */
export function streaks(r, phi) { // no longer drawn (it banded the disc); kept for the record of what was tried
  const L = Math.log(r);
  return 0.9 + 0.08 * Math.sin(23 * L + 3 * phi + 2 * Math.sin(5 * L - phi)) * Math.sin(41 * L - 2 * phi + 1.3) + 0.04 * Math.sin(71 * L + phi);
}

/** The shift of light from a disc patch at r (M) to a far camera, for a photon of angular momentum lz. */
export function redshift(r, lz, turn = 1) {
  const om = turn * Math.pow(r, -1.5);
  return Math.sqrt(1 - 3 / r) / (1 - om * lz);
}

/**
 * One ray, traced as the fragment shader traces it (the GLSL mirrors this line for line). q: a point on the
 * ray, d: its unit direction towards the hole (both in M, the hole's frame). Returns what it meets first:
 * { hit: 'hole' | 'disc' | 'sky', r, g, phi } (`r` and `g` for the disc).
 */
export function trace(q, d, p = {}) {
  const rIn = p.rIn || ISCO_M, rOut = p.rOut || 26, turn = p.turn || 1, steps = p.steps || 160, h = p.h || 0.045;
  const quiet = !!p.quiet;
  const lz = -(q[0] * d[1] - q[1] * d[0]); // the photon travels towards the camera: -(q x d).z
  const disc = (pt) => {
    const r = Math.hypot(pt[0], pt[1], pt[2]);
    return !quiet && r >= rIn && r <= rOut ? { hit: 'disc', r, g: redshift(r, lz, turn), phiDisc: Math.atan2(pt[1], pt[0]) } : null;
  };
  const tc = -(q[0] * d[0] + q[1] * d[1] + q[2] * d[2]);
  const c = [q[0] + tc * d[0], q[1] + tc * d[1], q[2] + tc * d[2]];
  const b2 = c[0] * c[0] + c[1] * c[1] + c[2] * c[2];
  const enters = b2 < RLENS * RLENS;
  const tIn = enters ? Math.max(0, tc - Math.sqrt(RLENS * RLENS - b2)) : Infinity;
  if (Math.abs(d[2]) > 1e-9) {
    const t = -q[2] / d[2];
    if (t > 0 && t < tIn) { const hit = disc([q[0] + t * d[0], q[1] + t * d[1], 0]); if (hit) return hit; }
  }
  if (!enters) return { hit: 'sky' };
  const p0 = [q[0] + tIn * d[0], q[1] + tIn * d[1], q[2] + tIn * d[2]];
  const r0 = Math.hypot(...p0);
  const e1 = p0.map((v) => v / r0);
  let n = [e1[1] * d[2] - e1[2] * d[1], e1[2] * d[0] - e1[0] * d[2], e1[0] * d[1] - e1[1] * d[0]];
  const nl = Math.hypot(...n);
  if (nl < 1e-7) return (e1[0] * d[0] + e1[1] * d[1] + e1[2] * d[2]) < 0 ? { hit: 'hole' } : { hit: 'sky' };
  n = n.map((v) => v / nl);
  const e2 = [n[1] * e1[2] - n[2] * e1[1], n[2] * e1[0] - n[0] * e1[2], n[0] * e1[1] - n[1] * e1[0]];
  let u = 1 / r0;
  let w = -u * (d[0] * e1[0] + d[1] * e1[1] + d[2] * e1[2]) / (d[0] * e2[0] + d[1] * e2[1] + d[2] * e2[2]);
  let phi = 0;
  let zPrev = p0[2], uPrev = u;
  let ring = 0; // as the shader gathers it: the path skimming r = 3M (before anything opaque is met)
  const f = (uu) => 3 * uu * uu - uu;
  for (let i = 0; i < steps; i++) {
    const k1u = w, k1w = f(u);
    const k2u = w + 0.5 * h * k1w, k2w = f(u + 0.5 * h * k1u);
    const k3u = w + 0.5 * h * k2w, k3w = f(u + 0.5 * h * k2u);
    const k4u = w + h * k3w, k4w = f(u + h * k3u);
    u += (h / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
    w += (h / 6) * (k1w + 2 * k2w + 2 * k3w + k4w);
    phi += h;
    { const x = (1 / Math.max(u, 1e-4) - 3) / 0.12, tw = w / (u * 0.25); ring += h * Math.exp(-x * x - tw * tw); }
    if (u > 0.5) return { hit: 'hole', phi, ring };
    const cp = Math.cos(phi), sp = Math.sin(phi);
    const z = (cp * e1[2] + sp * e2[2]) / u;
    if (zPrev * z < 0) {
      const t = zPrev / (zPrev - z);
      const uc = uPrev + (u - uPrev) * t, ph = phi - h + t * h;
      const pc = [Math.cos(ph) * e1[0] + Math.sin(ph) * e2[0], Math.cos(ph) * e1[1] + Math.sin(ph) * e2[1], 0].map((v) => v / uc);
      const hit = disc(pc);
      if (hit) return { ...hit, phi, ring };
    }
    if (u < 1 / RLENS && w < 0) {
      const r = 1 / u;
      const pos = [cp * e1[0] + sp * e2[0], cp * e1[1] + sp * e2[1], cp * e1[2] + sp * e2[2]].map((v) => v * r);
      const ep = [-sp * e1[0] + cp * e2[0], -sp * e1[1] + cp * e2[1], -sp * e1[2] + cp * e2[2]];
      const dr = -w / (u * u);
      let out = pos.map((v, k) => (v / r) * dr + ep[k] * r);
      const ol = Math.hypot(...out); out = out.map((v) => v / ol);
      if (Math.abs(out[2]) > 1e-9) {
        const t = -pos[2] / out[2];
        if (t > 0) { const hit = disc([pos[0] + t * out[0], pos[1] + t * out[1], 0]); if (hit) return { ...hit, phi, ring }; }
      }
      return { hit: 'sky', phi, ring };
    }
    zPrev = z; uPrev = u;
  }
  return { hit: 'hole', phi, ring };
}

// ------------------------------------------------------------------------------------------- orientation

const OBL = 23.4392911 * D2R;
const eqToEcl = (v) => [v[0], v[1] * Math.cos(OBL) + v[2] * Math.sin(OBL), -v[1] * Math.sin(OBL) + v[2] * Math.cos(OBL)];

/**
 * The spin axis in sun-inertial (ecliptic J2000) axes, from the record's place on the sky and the profile's
 * inclination and position angle. `incl` 0 points it straight at us. Pure.
 */
export function spinAxis(raDeg, decDeg, inclDeg, paDeg) {
  const a = raDeg * D2R, d = decDeg * D2R;
  const r = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]; // from us to it
  const east = [-Math.sin(a), Math.cos(a), 0];
  const north = [-Math.sin(d) * Math.cos(a), -Math.sin(d) * Math.sin(a), Math.cos(d)];
  const i = inclDeg * D2R, p = paDeg * D2R;
  const sky = north.map((v, k) => Math.cos(p) * v + Math.sin(p) * east[k]);
  const toUs = r.map((v) => -v);
  return eqToEcl(toUs.map((v, k) => Math.cos(i) * v + Math.sin(i) * sky[k]));
}

/** A record's right ascension and declination back from its sun-inertial place. */
function radecOf(pos) {
  const x = pos.x, y = pos.y * Math.cos(OBL) - pos.z * Math.sin(OBL), z = pos.y * Math.sin(OBL) + pos.z * Math.cos(OBL);
  const n = Math.hypot(x, y, z) || 1;
  return { ra: Math.atan2(y, x) / D2R, dec: Math.asin(z / n) / D2R };
}

// ------------------------------------------------------------------------------------------- GLSL

const BB_GLSL = /* glsl */ `
vec3 kelvinRgb( float K ) {
  float t = clamp( K, 1000.0, 40000.0 ) / 100.0;
  vec3 c;
  if ( t <= 66.0 ) {
    c.r = 1.0;
    c.g = clamp( ( 99.4708025861 * log( t ) - 161.1195681661 ) / 255.0, 0.0, 1.0 );
    c.b = t <= 19.0 ? 0.0 : clamp( ( 138.5177312231 * log( t - 10.0 ) - 305.0447927307 ) / 255.0, 0.0, 1.0 );
  } else {
    c.r = clamp( 329.698727446 * pow( t - 60.0, -0.1332047592 ) / 255.0, 0.0, 1.0 );
    c.g = clamp( 288.1221695283 * pow( t - 60.0, -0.0755148492 ) / 255.0, 0.0, 1.0 );
    c.b = 1.0;
  }
  c /= max( c.r, max( c.g, c.b ) );
  return pow( c, vec3( 2.2 ) ); // Helland's table is in display values; the scene works in linear light
}
`;

const HOLE_VERT = /* glsl */ `
uniform mat4 uQuad;
varying vec3 vLocal;
void main() {
  vLocal = ( uQuad * vec4( position, 1.0 ) ).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

const HOLE_FRAG = /* glsl */ `
#define RLENS ${RLENS.toFixed(1)}
uniform vec3 uCam;        // the camera in the hole's frame, M (used when near)
uniform vec3 uCamDir;     // unit, from the hole to the camera
uniform float uCamDist;   // M
uniform float uSize;      // the square's half-width, M
uniform float uRin;
uniform float uRout;
uniform float uTurn;
uniform float uTpeak;     // K at the brightest ring
uniform float uBright;
uniform float uStretch;
uniform float uQuiet;
uniform float uRing;      // how bright the photon ring is
uniform float uGlow;      // the soft glow round it
uniform float uOpacity;
varying vec3 vLocal;
${BB_GLSL}
// The disc's grain: filaments of hotter and cooler gas drawn out along the orbits (the look of the simulations; the real
// discs are unresolved: illustrative). Value noise in (azimuth, log r), the azimuth wrapping at 48 cells, the cells sheared
// with radius as differential rotation shears them.
float h2( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float vnoise( vec2 p ) {
  vec2 i = floor( p ), f = fract( p );
  f = f * f * ( 3.0 - 2.0 * f );
  float x0 = mod( i.x, 48.0 ), x1 = mod( i.x + 1.0, 48.0 );
  return mix( mix( h2( vec2( x0, i.y ) ), h2( vec2( x1, i.y ) ), f.x ), mix( h2( vec2( x0, i.y + 1.0 ) ), h2( vec2( x1, i.y + 1.0 ) ), f.x ), f.y );
}
float filaments( float r, float ph ) {
  float L = log( r );
  float x = ph / 6.2831853 * 48.0 + 30.0 * L;
  return 0.55 * vnoise( vec2( x, L * 34.0 ) ) + 0.3 * vnoise( vec2( x * 2.0 + 7.0, L * 80.0 ) ) + 0.15 * vnoise( vec2( x * 4.0, L * 160.0 ) );
}
float discFlux( float r ) {
  if ( r <= uRin ) return 0.0;
  float rp = 1.3611111 * uRin;
  return ( pow( r, -3.0 ) * ( 1.0 - sqrt( uRin / r ) ) ) / ( pow( rp, -3.0 ) * ( 1.0 - sqrt( uRin / rp ) ) );
}
void shade( vec3 p, float lz, inout vec3 col, inout float A ) {
  float r = length( p );
  if ( uQuiet > 0.5 || r < uRin || r > uRout ) return;
  float om = uTurn * pow( r, -1.5 );
  float g = sqrt( max( 1e-4, 1.0 - 3.0 / r ) ) / max( 0.05, 1.0 - om * lz );
  float F = discFlux( r );
  // A smooth emissive gradient: white-yellow at the inner edge, deep orange and red outwards (the colour temperature
  // goes as F^1/4, shifted by g), its brightness as g^4: the approaching side blazes, the receding one dims.
  float I = pow( F, uStretch ) * pow( g, 4.0 ) * uBright * ( 1.0 - smoothstep( uRout * 0.35, uRout, r ) ); // the disc thins into the dark
  I *= 0.35 + 1.3 * filaments( r, atan( p.y, p.x ) );
  float e = 1.0 - exp( -I );
  // colour temperature as F^0.4 (steeper than the black body's F^1/4: a display choice, so the outer disc reads deep orange)
  vec3 c = pow( kelvinRgb( uTpeak * pow( max( F, 1e-6 ), 0.4 ) * g ), vec3( 2.0 ) ) * e * 1.4;
  // hot gas glows: the faint outer disc lets the light behind through, the bright inner one hardly
  float a = smoothstep( uRin * 0.97, uRin * 1.06, r ) * clamp( 0.05 + 0.95 * e, 0.0, 0.96 );
  col += ( 1.0 - A ) * a * c;
  A += ( 1.0 - A ) * a;
}
void main() {
  vec3 d = normalize( vLocal / uCamDist - uCamDir );
  vec3 q = uCamDist < 4.0 * uSize ? uCam : vLocal - d * ( 2.0 * uSize );
  float lz = -( q.x * d.y - q.y * d.x );
  vec3 col = vec3( 0.0 );
  float A = 0.0;
  float tc = -dot( q, d );
  vec3 cc = q + tc * d;
  float b2 = dot( cc, cc );
  bool enters = b2 < RLENS * RLENS;
  float tIn = enters ? max( 0.0, tc - sqrt( RLENS * RLENS - b2 ) ) : 1e30;
  if ( abs( d.z ) > 1e-6 ) {
    float t = -q.z / d.z;
    if ( t > 0.0 && t < tIn ) shade( vec3( q.xy + t * d.xy, 0.0 ), lz, col, A );
  }
  float swept = 0.0;
  float ring = 0.0; // light gathered where the ray skims the photon sphere (r = 3M): the thin bright photon ring
  if ( enters && A < 0.995 ) {
    vec3 p0 = q + tIn * d;
    float r0 = length( p0 );
    vec3 e1 = p0 / r0;
    vec3 n = cross( e1, d );
    float nl = length( n );
    if ( nl < 1e-6 ) {
      if ( dot( e1, d ) < 0.0 ) A = 1.0;
    } else {
      n /= nl;
      vec3 e2 = cross( n, e1 );
      float u = 1.0 / r0;
      float w = -u * dot( d, e1 ) / dot( d, e2 );
      float phi = 0.0;
      float zPrev = p0.z, uPrev = u;
      bool done = false;
      for ( int i = 0; i < BH_STEPS; i++ ) {
        float k1u = w, k1w = 3.0 * u * u - u;
        float u2 = u + 0.5 * BH_H * k1u; float k2u = w + 0.5 * BH_H * k1w, k2w = 3.0 * u2 * u2 - u2;
        float u3 = u + 0.5 * BH_H * k2u; float k3u = w + 0.5 * BH_H * k2w, k3w = 3.0 * u3 * u3 - u3;
        float u4 = u + BH_H * k3u; float k4u = w + BH_H * k3w, k4w = 3.0 * u4 * u4 - u4;
        u += BH_H / 6.0 * ( k1u + 2.0 * k2u + 2.0 * k3u + k4u );
        w += BH_H / 6.0 * ( k1w + 2.0 * k2w + 2.0 * k3w + k4w );
        phi += BH_H;
        { float x = ( 1.0 / max( u, 1e-4 ) - 3.0 ) / 0.12; float tw = w / ( u * 0.25 ); ring += ( 1.0 - A ) * BH_H * exp( -x * x - tw * tw ); } // only light that circles
        if ( u > 0.5 ) { A = 1.0; done = true; break; }
        float cp = cos( phi ), sp = sin( phi );
        float z = ( cp * e1.z + sp * e2.z ) / u;
        if ( zPrev * z < 0.0 ) {
          float t = zPrev / ( zPrev - z );
          float uc = mix( uPrev, u, t ), ph = phi - BH_H + t * BH_H;
          shade( vec3( ( cos( ph ) * e1.xy + sin( ph ) * e2.xy ) / uc, 0.0 ), lz, col, A );
          if ( A > 0.995 ) { done = true; break; }
        }
        if ( u < 1.0 / RLENS && w < 0.0 ) {
          float r = 1.0 / u;
          vec3 pos = ( cp * e1 + sp * e2 ) * r;
          vec3 ep = -sp * e1 + cp * e2;
          vec3 o = normalize( pos / r * ( -w / ( u * u ) ) + ep * r );
          if ( abs( o.z ) > 1e-6 ) {
            float t = -pos.z / o.z;
            if ( t > 0.0 ) shade( vec3( pos.xy + t * o.xy, 0.0 ), lz, col, A );
          }
          swept = phi;
          done = true;
          break;
        }
        zPrev = z; uPrev = u;
      }
      if ( !done ) A = 1.0; // still circling the photon sphere: as good as captured
    }
  }
  // The photon ring: thin, sharp and bright, hugging the shadow (a quiet hole's is only the bent light of the sky
  // behind it, faint and white-blue).
  vec3 ringColour = uQuiet > 0.5 ? vec3( 0.45, 0.52, 0.7 ) : kelvinRgb( uTpeak * 1.1 ) * 1.6;
  col += ringColour * ( 1.0 - exp( -ring * uRing ) );
  // A soft glow round the whole (no bloom pass: this square's own light, falling off with the distance from the hole).
  float bimp = sqrt( b2 );
  float halo = uGlow * exp( -max( 0.0, bimp - 5.2 ) / 4.0 ) * ( 1.0 - smoothstep( uSize * 0.7, uSize, bimp ) );
  col += ( 1.0 - A ) * kelvinRgb( uTpeak * 0.7 ) * halo;
  // premultiplied: the shadow and the opaque disc hide what is behind them, the light adds
  gl_FragColor = vec4( col * uOpacity, A * uOpacity );
  #include <colorspace_fragment>
}
`;

const JET_VERT = /* glsl */ `
attribute float aZ;      // along the jet, as a share of its length
varying float vZ;
varying vec3 vN;
varying vec3 vV;
void main() {
  vZ = aZ;
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  vN = normalize( normalMatrix * normal );
  vV = normalize( -mv.xyz );
  gl_Position = projectionMatrix * mv;
}
`;
const JET_FRAG = /* glsl */ `
uniform float uOpacity;
uniform float uSide;      // 1 the jet towards us, the counter-jet's share otherwise
uniform vec4 uKnots[ 5 ]; // place (share of the length), strength
uniform float uFade;      // the near part's own fade (the drawn hole's short jet)
uniform float uEndOn;     // 1 seen from the side, 0 looking down the jet: from inside its cone it would wash the view
varying float vZ;
varying vec3 vN;
varying vec3 vV;
void main() {
  float face = abs( dot( normalize( vN ), normalize( vV ) ) );
  float body = pow( face, 3.0 ); // bright on its axis, gone at its edges: a collimated beam, not a cone
  // it rises out of the hole's glare and fades with distance
  float I = 0.07 * pow( max( vZ, 1e-6 ), -0.5 ) * smoothstep( 0.0, 0.15, vZ ) * ( 1.0 - smoothstep( 0.6, 1.0, vZ ) );
  for ( int i = 0; i < 5; i++ ) { float k = ( vZ - uKnots[ i ].x ) / 0.018; I += 0.25 * uKnots[ i ].y * exp( -0.5 * k * k ); }
  I *= mix( 1.0, 1.0 - smoothstep( 0.2, 1.0, vZ ), uFade );
  vec3 c = vec3( 0.42, 0.6, 1.0 ) * I * body * uSide * uOpacity * uEndOn;
  gl_FragColor = vec4( c * 0.6, 0.0 ); // added (one, one), alpha untouched
  #include <colorspace_fragment>
}
`;

const STAR_FRAG = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity;
uniform vec3 uToHole;     // view-space direction to the hole, for the heated side
varying vec3 vN;
varying vec3 vV;
void main() {
  float mu = max( 0.0, dot( normalize( vN ), normalize( vV ) ) );
  float limb = 0.4 + 0.6 * mu; // limb darkening, linear law with u = 0.6
  float heat = 0.12 * max( 0.0, dot( normalize( vN ), uToHole ) );
  gl_FragColor = vec4( uColour * ( limb + heat ) * uOpacity, uOpacity );
  #include <colorspace_fragment>
}
`;
const STAR_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  vN = normalize( normalMatrix * normal );
  vV = normalize( -mv.xyz );
  gl_Position = projectionMatrix * mv;
}
`;

// ------------------------------------------------------------------------------------------- geometry

/** A jet as a tube along +z from z0 to z1 (M): rings spaced evenly in log z, radius ∝ z^0.58, then a cone. */
function jetGeometry(z0, z1, rings = 72, sides = 14) {
  const pos = [], nrm = [], az = [], idx = [];
  const zb = Math.min(z1, 2e5); // where the parabola gives way to the cone
  const rad = (z) => (z <= zb ? 0.28 * Math.pow(z, 0.58) : 0.28 * Math.pow(zb, 0.58) + (z - zb) * 0.012);
  for (let i = 0; i < rings; i++) {
    const z = z0 * Math.pow(z1 / z0, i / (rings - 1));
    const r = rad(z);
    const dr = (rad(z * 1.01) - r) / (z * 0.01);
    for (let j = 0; j < sides; j++) {
      const a = (j / sides) * Math.PI * 2;
      pos.push(r * Math.cos(a), r * Math.sin(a), z);
      const n = [Math.cos(a), Math.sin(a), -dr];
      const l = Math.hypot(...n);
      nrm.push(n[0] / l, n[1] / l, n[2] / l);
      az.push(Math.log(z / z0) / Math.log(z1 / z0));
    }
  }
  for (let i = 0; i < rings - 1; i++) for (let j = 0; j < sides; j++) {
    const a = i * sides + j, b = i * sides + ((j + 1) % sides), c = a + sides, d = b + sides;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aZ', new THREE.Float32BufferAttribute(az, 1));
  g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, z1 / 2), z1);
  return g;
}

/** The z (in M) along the jet where a measured share of its length falls (the knots are placed in log z). */
function jetLengthM(p) {
  return (p.jet.lengthLy * LY_KM) / p.mKm;
}

// ------------------------------------------------------------------------------------------- the object

export const TIER_STEPS = [[72, 0.1], [120, 0.06], [170, 0.042]];

/**
 * One black hole. `record` an exotics record; opts { tier, toScene(km) -> Vector3, dirToScene(vec) -> Vector3 }.
 * update({ camera, viewH, share, tMs }) places, turns and sizes it; `share` 0 draws it at its true size.
 */
export function createBlackHole(record, opts = {}) {
  const p = profileFor(record);
  let tier = Math.min(2, Math.max(0, Math.trunc(Number.isFinite(opts.tier) ? opts.tier : 1)));
  const group = new THREE.Group();     // the hole, drawn at its magnification, in M
  group.name = `blackhole:${p.id}`;
  const trueGroup = new THREE.Group(); // what is drawn at its true size whatever the magnification (M87's long jet)
  trueGroup.name = `blackhole:${p.id}:true`;
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const huniforms = {
    uQuad: { value: new THREE.Matrix4() },
    uCam: { value: new THREE.Vector3() }, uCamDir: { value: new THREE.Vector3(0, 0, 1) }, uCamDist: { value: 1e6 },
    uSize: { value: 1 }, uRin: { value: ISCO_M }, uRout: { value: p.rOut || 26 }, uTurn: { value: p.turn || 1 },
    uTpeak: { value: p.t || 6000 }, uBright: { value: p.companion ? 1.5 : 3.0 }, uStretch: { value: p.companion ? 0.05 : 1.5 },
    uQuiet: { value: p.quiet ? 1 : 0 }, uOpacity: { value: 0 },
    uRing: { value: p.quiet ? 0.8 : 2.2 }, uGlow: { value: p.quiet ? 0 : p.companion ? 0.04 : 0.1 },
  };
  const holeMat = () => new THREE.ShaderMaterial({
    vertexShader: HOLE_VERT, fragmentShader: HOLE_FRAG, uniforms: huniforms,
    defines: { BH_STEPS: TIER_STEPS[tier][0], BH_H: TIER_STEPS[tier][1].toFixed(3) },
    // the opaque list, premultiplied "over" spelled out (tests/test_contract.mjs; scene/starfield.js says why)
    transparent: false, depthTest: false, depthWrite: false, toneMapped: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const quad = new THREE.Mesh(quadGeo, holeMat());
  quad.frustumCulled = false;
  quad.renderOrder = 6;
  quad.name = 'blackhole:hole';
  group.add(quad);

  // the jets: short ones with the drawn hole, the long one at its true size
  const jets = [];
  const jetUniforms = (side, fade, z0, z1) => ({
    uOpacity: { value: 0 }, uSide: { value: side }, uFade: { value: fade }, uEndOn: { value: 1 },
    // each knot where it falls along this mesh, as its share of log z (the mesh's own aZ)
    uKnots: { value: [0, 1, 2, 3, 4].map((i) => {
      const k = p.jet && p.jet.knots[i];
      const z = k ? (k[0] * LY_KM) / p.mKm : 0;
      return new THREE.Vector4(k && z > z0 && z < z1 ? Math.log(z / z0) / Math.log(z1 / z0) : -1, k ? k[1] : 0, 0, 0);
    }) },
  });
  const jetMat = (u) => new THREE.ShaderMaterial({
    vertexShader: JET_VERT, fragmentShader: JET_FRAG, uniforms: u, side: THREE.DoubleSide,
    transparent: false, depthTest: false, depthWrite: false, toneMapped: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  function addJet(parent, z0, z1, side, fade, flip) {
    const u = jetUniforms(side, fade, z0, z1);
    const m = new THREE.Mesh(jetGeometry(z0, z1), jetMat(u));
    if (flip) m.rotation.x = Math.PI;
    m.frustumCulled = false;
    m.renderOrder = 5;
    parent.add(m);
    jets.push({ mesh: m, u });
  }
  if (p.jet) {
    const L = Math.max(400, jetLengthM(p));
    addJet(group, 12, 320, 1, 1, false);
    addJet(group, 12, 320, p.jet.counter, 1, true);
    if (!p.jet.stellar && L > 1e4) {
      addJet(trueGroup, 300, L, 1, 0, false);
      addJet(trueGroup, 300, L, p.jet.counter, 0, true);
    }
  }

  // Cygnus X-1's supergiant, on the orbit, and the system's centre of mass at the record's place
  let star = null;
  let starUniforms = null;
  let sep = 0;
  if (p.companion) {
    const mStar = p.companion.msun, mTot = mStar + p.msun;
    const years = p.periodDays / 365.25;
    sep = (Math.cbrt(mTot * years * years) * 149597870.7) / p.mKm; // a, in M (Kepler's third law in au, Suns, years)
    p.sepM = sep;
    const rStar = (p.companion.rsun * RSUN_KM) / p.mKm;
    const k = p.companion.k / 100;
    const rgb = [1, Math.min(1, (288.1221695283 * Math.pow(k - 60, -0.0755148492)) / 255), 1];
    rgb[0] = Math.min(1, (329.698727446 * Math.pow(k - 60, -0.1332047592)) / 255);
    starUniforms = { uColour: { value: new THREE.Color(rgb[0], rgb[1], rgb[2]).convertSRGBToLinear().multiplyScalar(1.4) }, uOpacity: { value: 0 }, uToHole: { value: new THREE.Vector3() } };
    star = new THREE.Mesh(new THREE.SphereGeometry(rStar, 48, 32), new THREE.ShaderMaterial({
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, uniforms: starUniforms,
      transparent: false, depthTest: false, depthWrite: false, toneMapped: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    }));
    star.name = 'blackhole:companion';
    star.frustumCulled = false;
    star.renderOrder = 5;
    // A supergiant this close to its Roche lobe is drawn out towards the hole (illustrative: 8 %).
    star.scale.set(1.08, 1, 1);
    group.add(star);
  }

  // orientation: local +z is the spin axis, in sun-inertial axes; turned into the scene each update
  const rd = radecOf(record.pos);
  const spin = spinAxis(rd.ra, rd.dec, p.incl, p.pa);
  const toUsEcl = (() => { const n = Math.hypot(record.pos.x, record.pos.y, record.pos.z) || 1; return [-record.pos.x / n, -record.pos.y / n, -record.pos.z / n]; })();

  let opacity = 0;
  let magnification = 1;
  const _v = new THREE.Vector3(), _s = new THREE.Vector3(), _u = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3();
  const _q = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _m = new THREE.Matrix4();
  const _cam = new THREE.Vector3();

  function orient(target) {
    // the scene's axes for the spin and for "towards us" (the second fixes the turn about the spin)
    const S = opts.dirToScene(spin, _s);
    const U = opts.dirToScene(toUsEcl, _u);
    if (!S || !U) return;
    _x.copy(U).addScaledVector(S, -U.dot(S)).normalize();
    _y.crossVectors(S, _x);
    _m.makeBasis(_x, _y, S);
    target.quaternion.setFromRotationMatrix(_m);
  }

  function update(ctx) {
    const camera = ctx.camera;
    if (!camera) return;
    const centre = opts.toScene(record.pos, _v);
    if (!centre) { group.visible = trueGroup.visible = false; return; }
    const unitKm = opts.unitKm();
    const mUnits = p.mKm / unitKm;
    // the frame: the inner disc for a lone hole, the whole orbit for Cygnus X-1
    const frameM = p.companion ? sep * 0.75 : p.frame || 15;
    _cam.setFromMatrixPosition(camera.matrixWorld);
    const dist = _cam.distanceTo(centre);
    const fov = (camera.fov || 45) * D2R / (camera.zoom || 1);
    const H = ctx.viewH || 1000;
    const truePx = (Math.atan((frameM * mUnits) / Math.max(dist, 1e-30)) / (fov / 2)) * (H / 2);
    const wantPx = (ctx.share || 0) * (H / 2);
    magnification = wantPx > 0 && truePx > 0 ? Math.max(1, wantPx / truePx) : 1;
    const scale = mUnits * magnification;
    group.position.copy(centre);
    trueGroup.position.copy(centre);
    orient(group);
    trueGroup.quaternion.copy(group.quaternion);
    group.scale.setScalar(scale);
    trueGroup.scale.setScalar(mUnits);
    group.updateMatrixWorld(true);
    trueGroup.updateMatrixWorld(true);

    // where the hole is inside its group: Cygnus X-1's orbit about the centre of mass
    let hole = [0, 0, 0];
    if (p.companion) {
      const jd = (ctx.tMs || Date.now()) / 86400000 + 2440587.5;
      const ph = (((jd - p.epochJd) / p.periodDays) % 1) * Math.PI * 2;
      const fStar = p.msun / (p.msun + p.companion.msun);
      const c = Math.cos(ph), s = Math.sin(ph);
      // phase 0 is the hole's superior conjunction: the supergiant in front of it (the X-ray dips come then);
      // local +x points at us
      hole = [-c * sep * (1 - fStar), -s * sep * (1 - fStar), 0];
      star.position.set(c * sep * fStar, s * sep * fStar, 0);
    }
    quad.position.set(hole[0], hole[1], hole[2]);
    for (const j of jets) if (j.mesh.parent === group) j.mesh.position.set(hole[0], hole[1], hole[2]);

    // the camera in the hole's own frame (float64 here; the shader gets only small or unit numbers)
    _qi.copy(group.quaternion).invert();
    const cl = _s.copy(_cam).sub(centre).applyQuaternion(_qi).divideScalar(scale).sub(_x.set(hole[0], hole[1], hole[2]));
    const cd = cl.length();
    huniforms.uCamDist.value = cd;
    huniforms.uCamDir.value.copy(cl).divideScalar(cd || 1);
    huniforms.uCam.value.copy(cl);
    // the square: facing the camera, big enough for the disc and the bent light round it
    const size = p.rOut && p.rOut > RLENS ? p.rOut * 1.05 + 4 : Math.max(34, (p.rOut || 0) * 1.6);
    huniforms.uSize.value = size;
    camera.getWorldQuaternion(_q);
    _q.premultiply(_qi);
    quad.quaternion.copy(_q);
    quad.scale.setScalar(size);
    quad.updateMatrix();
    // the square's corners relative to the HOLE (its rotation and size, not its place in the group)
    huniforms.uQuad.value.compose(_y.set(0, 0, 0), _q, _x.set(size, size, size));
    if (star) {
      starUniforms.uToHole.value.set(hole[0] - star.position.x, hole[1] - star.position.y, 0).normalize()
        .applyQuaternion(group.quaternion).transformDirection(camera.matrixWorldInverse);
    }
    // The jets. Looking down one (M87* from Earth, 17 degrees off its axis) the drawn hole's short jet would fill the
    // view with its glow: it steps back inside 25 degrees of the axis. The long one, at its true length, is drawn only
    // from outside it (farther from the hole than a twentieth of its length): from inside it would be a wall of light.
    if (jets.length) {
      const along = Math.abs(huniforms.uCamDir.value.z);
      const endOn = 1 - smooth01(Math.cos(40 * D2R), Math.cos(25 * D2R), along);
      const farEnough = p.jet && dist * unitKm > 0.05 * p.jet.lengthLy * LY_KM;
      for (const j of jets) j.u.uEndOn.value = j.mesh.parent === group ? endOn : 1;
      trueGroup.visible = opacity > 0 && !!farEnough;
    } else trueGroup.visible = false;
    group.visible = opacity > 0;
  }
  const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function setOpacity(k) {
    opacity = Math.min(1, Math.max(0, k));
    huniforms.uOpacity.value = opacity;
    for (const j of jets) j.u.uOpacity.value = opacity;
    if (starUniforms) starUniforms.uOpacity.value = opacity;
    group.visible = opacity > 0;
    if (opacity <= 0) trueGroup.visible = false;
  }

  return {
    group, trueGroup, profile: p,
    update, setOpacity,
    setTier(t) {
      const n = Math.min(2, Math.max(0, Math.trunc(Number(t) || 0)));
      if (n === tier) return;
      tier = n;
      quad.material.dispose();
      quad.material = holeMat();
    },
    magnification: () => magnification,
    stats: () => ({
      id: p.id, msun: p.msun, mKm: +p.mKm.toFixed(1), shadowKm: +(2 * SHADOW_M * p.mKm).toFixed(0), magnification: +magnification.toPrecision(3),
      opacity: +opacity.toFixed(3), jets: jets.length, companion: !!star, sepM: sep ? +sep.toFixed(0) : null, steps: TIER_STEPS[tier][0],
      camM: +huniforms.uCamDist.value.toPrecision(4),
    }),
    dispose() {
      quadGeo.dispose(); quad.material.dispose();
      for (const j of jets) { j.mesh.geometry.dispose(); j.mesh.material.dispose(); }
      if (star) { star.geometry.dispose(); star.material.dispose(); }
      if (group.parent) group.parent.remove(group);
      if (trueGroup.parent) trueGroup.parent.remove(trueGroup);
    },
  };
}

/** The shaders as they compile (tests/test_blackhole.mjs reads them). */
export const SHADERS = { hole: HOLE_FRAG, holeVert: HOLE_VERT, jet: JET_FRAG, jetVert: JET_VERT, star: STAR_FRAG, starVert: STAR_VERT };

// scene/deep/helix.js -- the Helix Nebula (NGC 7293) as a hero: the first flagship of the deep sky
// (internal spec 0075 stage b, #787; DS-B02, B03, B04, B07). Fetched by scene/deep/deepsky.js when the
// Helix is near (scene/deep/heroes.js); never at boot.
//
// WHAT A HERO ANSWERS (the coordinator calls nothing else):
//   createHero(THREE, env) -> { group, levels, setLevel(level, share), frame(info), ready(), stats(), dispose() }
//   env  = { profile, record, gas }       profile: registry/deepsky-heroes/helix.yaml (data/hero-helix.js)
//   info = { camera, rPx, steps, look, reduced, frozen, dtMs, photo, tier, gain }   once a frame while drawn
// Pure, for tests/test_hero_helix.mjs and the preview: geometryOf, skyFrame, ringAxis, layerSpan, uvOf,
//   discShare, lightStretch, columnJs, knotsOf, paletteFor, samplesFor, sharesFor, pixelHash, SHAPE, UNDER_MEASURED
// What does not depend on the Helix (the spans, the sky frame, the knots' and the star's meshes, the exact front)
// lives in scene/deep/shellneb.js since release 1.2.0 stage W3-b (internal spec 0076), which the Ring shares.
//
// ITS SHAPE IS PUBLISHED; ITS LIGHT IS THE PHOTOGRAPH'S.
//   The shape (O'Dell, McCullough & Meixner 2004, AJ 128, 2339; "OMM04"): an inner disc 499″ across
//   and about 100″ thick, its plane tilted 23° out of the plane of the sky with its near side toward PA
//   288°, and an outer ring 742″ across, tilted 53° with its near side toward PA 168°: two rings
//   "almost perpendicular" (66° between their axes with these numbers). NASA's animation of the Helix
//   (NASA, ESA, A. Feild, STScI) is this model. Lengths are the paper's arcseconds at OUR distance (the
//   Gaia parallax, 655 ly), so the size on the sky stays the measured one.
//   The light: ESO's photograph (eso0907a, CC BY 4.0), the one scene/nebulae.js shows, with its stars
//   taken out (scripts/build_deep_helix.py -> images/deep/helix/helix-light.webp). Each point of each
//   ring glows with the photograph's colour at the place it covers on the sky, as seen from the Sun,
//   and each sky point's light is shared between the two rings: the inner disc takes it inside its
//   own outline as seen from here (discShare), the outer ring the rest. Divided by the ring's depth
//   along our line, so that FROM OUR SIDE THE MODEL IS THE PHOTOGRAPH, and turned it is the same
//   structure foreshortened. The edges are the photograph's own and each slab is crisp (a fourth-power
//   profile, not a Gaussian), so seen edge on a ring is a thin sharp band and not a blur.
//   Fine radial streaks, seeded, where the photograph is coarser than the view (Film only, UNDER_MEASURED).
//   The knots: the paper and Meixner et al. 2005 count thousands (about 23 000 by NICMOS), Matsuura et al.
//   2009 finds them 2.2′ to 6.4′ from the star, the brightest on the inner edge of the ring; each head at
//   least twice the Solar System, its tail pointing away from the star (STScI release 1996-13). We draw a
//   seeded SAMPLE of 500 to 1 600 on the inner rim, drawn at least 2.2 px wide with their darkness
//   exaggerated so they can be seen at mid distance (the registry says so). The white dwarf: about
//   100 000 K (103 600 ± 5 500 K, Napiwotzki 1999 and Traulsen et al. 2005 as Marshall et al. 2023 quote them).
//
// HOW IT IS DRAWN (design sections 1, 5 and 7; no pass, no render target, no bloom). Three meshes, three
// draw calls, in the group's SKY FRAME: x west, y north, z toward the Sun, light-years about the star.
//   gas    one bounding sphere drawn by its back faces. For each ring the fragment finds the part of the
//          view ray inside that ring's slab (layerSpan) and spends its samples only there. Along that
//          stretch the gas emits and also absorbs its own light (a little, as an optical depth of about 1
//          face on, compensated so the column on our line is still the photograph's): seen edge on a ring
//          shows its near side's colour and does not add up to white. The two rings' light adds. Samples: 4 a ring on T0, 8 at level 2, half the march's steps from level 3.
//          THE EXACT FRONT (spec 0075 task 45, since 0076 W3-b): each step carries its slab's profile integrated
//          in closed form over the whole stretch it stands for (shellneb.js slabIntegral), not the one point it
//          samples, so a ring's crisp face is crossed exactly at any step count and on our line the column is
//          the photograph's with T0's four samples as with 24. The light is still read at the sampled point.
//   knots  one instanced quad per knot: a dark head that absorbs, a bright cusp toward the star, a tail away.
//   star   the white dwarf: a point of a few pixels with a soft halo in its material, at the frame's centre.
// The photograph is the truth from our side: the gas and the knots give way to it by its own share
// (info.photo), so on our line of sight the ESO picture is drawn, and 25 to 50° off it the
// reconstruction, whose light is that picture's, takes over. The point glow gives way to the hero
// (main.js, deepsky.js heroShares). As the nebula grows past the view its light is scaled down (to 45 %
// inside), the eye's adaptation, in the material.
//
// LOOKS. The light is shown with the exposure's own stretch, as the photograph is (scene/exposure.js:
// Eye dim and grey, Camera as taken, Deep lifted and saturated: ENHANCED, and the registry says so).
// Under Measured the streaks go and nothing moves; under Film the streaks drift at most 1 % of their
// width a minute, never under reduced motion or ?look=1. The knots stay: their count and radii are measured.

import { drawnUnder, stillUnder } from '../exposure.js';
import { HERO as PROFILE } from '../../data/hero-helix.js';
import { NEBULAE } from '../../data/nebulae.js';
import {
  D2R, AU_LY, QUARTIC, dot, smooth, f3, pixelHash, skyFrame, ringAxis, planeBasis, uvOf as uvOnSky,
  layerSpan, spanLen, spanT, slabIntegral, lightStretch, paletteOf, sharesOf, samplesOf, viewSize, seeded,
  GLSL, SHELL_SHADERS, shellMaterial, skyPlacer, starMesh, knotMaterial, knotMesh, lightTexture, QUAD_BYTES,
} from './shellneb.js';

export { pixelHash, skyFrame, ringAxis, layerSpan, lightStretch };

export const UNDER_MEASURED = { streaks: 'hidden', drift: 'still', knots: 'same' };
// The exact front (task 45). `exact: false` is the march as it was before 0076 W3-b (each step the profile at its
// one sampled point): a switch for the look probe's BEFORE shot (tests/probes/look/r12-ring.js) and nothing else.
export const FRONT = { exact: true };

const MAX_N = 24;          // samples a ring at most (48 march steps at Ultra)
const KNOTS_BY_TIER = [500, 1000, 1600];
const LIGHT_URL = '../../../images/deep/helix/helix-light.webp';
// The shape of the light inside the rings. ONE table: the GLSL below is written from it.
export const SHAPE = {
  slab: 1.6,                // a ring's box reaches 1.6 of its half-thickness: exp(-1.6⁴) is 0.15 % of its middle
  discOut: 1.25,            // the inner disc's box, in its radii
  discIn: 0.92, discEdge: 1.12, // a sky point's light belongs to the disc inside this (its outline as seen from here)
  ringFade: 1.25, ringOut: 1.5, // the outer ring's light fades out between these, in its radii (the faint haze beyond is the photograph's alone)
  kappa: 2.5,               // self-absorption: optical depth per unit of the light's luminance; edge on a ring saturates at about 1/kappa of its colour, not white
  knee: 0.8,                // one soft knee over the brightest channel, hue kept
  rimQ: 1.04, rimW: 0.12,   // the rim's dust (the knots' molecular gas), in disc radii
  sigma: 0.5,               // its extinction
  streakCells: 95.5,        // radial streaks: cells per radian (about 600 round)
  streakAmp: 0.45,
  exposure: 1.0,            // the whole, against the photograph's own levels (its light IS the photograph's)
  adapt: 0.45,              // what is left of its light when it fills the view (the eye's adaptation)
};
// --------------------------------------------------------------------------------- the geometry

/**
 * The light map's place on the sky: u = u0 + x / W, v = v0 + y / H (x west, y north, light-years; the picture is
 * north up, east left: its archive turns north by 0.07°, which the Helix has never drawn). The picture's centre is
 * its measured one (registry/nebulae.yaml), not the star's. shellneb.js uvOf without the turn. Pure.
 */
export function uvOf(row, recordRaDec, distLy) {
  return uvOnSky({ ...row, north_deg: 0 }, recordRaDec, distLy);
}

/** The profile's numbers in light-years, about the white dwarf, in the sky frame. Pure. */
export function geometryOf(profile = PROFILE) {
  const P = profile && Array.isArray(profile.layers) && profile.layers.some((l) => l && l.part === 'disc') ? profile : PROFILE;
  const dist = (P.frame && P.frame.distance_ly) || 655;
  const ly = (arcsec) => (Number(arcsec) || 0) * dist * Math.PI / 648000;
  const part = (k) => P.layers.find((l) => l && l.part === k) || {};
  const disc = part('disc'), ring = part('ring'), knots = part('knots'), star = part('star');
  const row = NEBULAE.find((r) => r.id === 'helix-nebula') || { ra_deg: 337.4106, dec_deg: -20.8371, width_arcmin: 28.02, height_arcmin: 25.94 };
  const g = {
    distanceLy: dist,
    R1: ly(disc.diameter_arcsec / 2), H1: ly(disc.thickness_arcsec / 2), a1: ringAxis(disc.tilt_deg, disc.near_pa_deg),
    R2: ly(ring.diameter_arcsec / 2), H2: ly(ring.thickness_arcsec / 2), a2: ringAxis(ring.tilt_deg, ring.near_pa_deg),
    uv: uvOf(row, [Number(P.frame && P.frame.ra_deg) || 337.4106, Number(P.frame && P.frame.dec_deg) || -20.8371], dist),
    knots: {
      from: ly((Number(knots.from_arcmin) || 2.2) * 60), to: ly((Number(knots.to_arcmin) || 6.4) * 60),
      head: (Number(knots.head_au) || 200) / 2 * AU_LY, tail: (Number(knots.tail_au) || 1000) * AU_LY,
      inRing: Number(knots.share_in_ring) || 0, count: knots.count_drawn || KNOTS_BY_TIER, minPx: Number(knots.min_px) || 2.2,
    },
    starK: Number(star.temp_k) || 103600,
  };
  // Each ring's depth along our line (the sky frame's z): what one sky point's light is divided by.
  g.N1 = QUARTIC * g.H1 / Math.abs(g.a1[2]);
  g.N2 = QUARTIC * g.H2 / Math.abs(g.a2[2]);
  [g.d1, g.d2] = planeBasis(g.a1);
  [g.r1, g.r2] = planeBasis(g.a2);
  g.bound = Math.hypot(SHAPE.ringOut * g.R2, SHAPE.slab * g.H2) * 1.02;
  g.axesDeg = Math.acos(Math.abs(dot(g.a1, g.a2))) / D2R;
  return g;
}

// ------------------------------------------------------------ the rings along a ray (mirrored in GLSL)

/** Of the light along our line at sky point (x, y), the inner disc's share: inside its outline as seen from here. Pure. */
export function discShare(g, x, y) {
  const zc = -(x * g.a1[0] + y * g.a1[1]) / g.a1[2];
  const q = Math.hypot(x, y, zc) / g.R1;
  return 1 - smooth(q, SHAPE.discIn, SHAPE.discEdge);
}

/**
 * The colour along a ray from ro (unit rd): `light(x, y)` -> stretched [r, g, b] (or null outside the
 * picture), n samples a ring, offset j in [0, 1). Returns {rgb, dust} before the share and the gain.
 * FRAG's main(), without the streaks. Pure.
 */
export function columnJs(g, ro, rd, n = 8, j = 0.5, light = () => [0, 0, 0]) {
  const S = SHAPE;
  const b = dot(ro, rd), h = b * b - (dot(ro, ro) - g.bound * g.bound);
  const zero = { rgb: [0, 0, 0], dust: 0 };
  if (h <= 0) return zero;
  const t0 = Math.max(0, -b - Math.sqrt(h)), t1 = -b + Math.sqrt(h);
  if (t1 <= t0) return zero;
  let dust = 0;
  const ring = (a, H, N, rOut, share, fadeOf) => {
    const s = layerSpan(ro, rd, a, S.slab * H, 0, rOut, t0, t1);
    const L = spanLen(s);
    const C = [0, 0, 0];
    let T = 1;
    if (!(L > 0)) return { C, T };
    const dt = L / n;
    for (let i = 0; i < n; i++) {
      const t = spanT(s, (i + j) * dt);
      const p = [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t];
      const z = dot(p, a), u = z / H;
      const lc = light(p[0], p[1]);
      if (!lc) continue;
      const lum = 0.2126 * lc[0] + 0.7152 * lc[1] + 0.0722 * lc[2];
      const ip = [p[0] - a[0] * z, p[1] - a[1] * z, p[2] - a[2] * z];
      const sh = share(p[0], p[1]) * fadeOf(Math.hypot(ip[0], ip[1], ip[2]));
      // the exact front: the profile over the step's whole stretch (shellneb.js slabIntegral), or at its one point
      const prof = FRONT.exact ? slabIntegral(s, i * dt, (i + 1) * dt, dot(ro, a) / H, dot(rd, a) / H) : Math.exp(-(u ** 4)) * dt;
      const rhoDt = prof / N * sh;
      const tau = S.kappa * lum * sh;
      const comp = tau > 1e-4 ? tau / (1 - Math.exp(-tau)) : 1;
      // each step integrated exactly for a constant density across it (no over-shoot where it is dense)
      const ab = S.kappa * lum * rhoDt;
      const w = ab > 1e-5 ? (1 - Math.exp(-ab)) / (S.kappa * lum) : rhoDt;
      for (let c = 0; c < 3; c++) C[c] += T * lc[c] * comp * w;
      T *= Math.exp(-ab);
      if (a === g.a1) { const rq = (Math.hypot(ip[0], ip[1], ip[2]) / g.R1 - S.rimQ) / S.rimW; dust += Math.exp(-(u ** 4)) * Math.exp(-rq * rq) * dt; }
    }
    return { C, T };
  };
  const one = () => 1;
  const d = ring(g.a1, g.H1, g.N1, S.discOut * g.R1, (x, y) => discShare(g, x, y), one);
  const r = ring(g.a2, g.H2, g.N2, S.ringOut * g.R2, (x, y) => 1 - discShare(g, x, y), (rr) => 1 - smooth(rr / g.R2, S.ringFade, S.ringOut));
  // The two rings add: each absorbs only its own light, so on our line their sum is the picture's.
  let rgb = [0, 1, 2].map((c) => d.C[c] + r.C[c]);
  const m = Math.max(...rgb);
  if (m > S.knee) { const k = (S.knee + (1 - S.knee) * (1 - Math.exp(-(m - S.knee) / (1 - S.knee)))) / m; rgb = rgb.map((x) => x * k); }
  return { rgb, dust };
}

// ----------------------------------------------------------------------------- tiers and shares

/** Samples a ring: 4 on T0, 8 at level 2, half the march's steps above. Pure. */
export function samplesFor({ tier = 1, steps = 0 } = {}) {
  return samplesOf({ tier, steps }, MAX_N);
}

/**
 * How much of each part draws (shellneb.js sharesOf, with the Helix's own adaptation SHAPE.adapt): the gas and the
 * knots give way to the photograph, the star stays at half strength over it, and as the nebula grows past the
 * view its light is scaled down to SHAPE.adapt from inside. Pure.
 */
export function sharesFor(o = {}) {
  return sharesOf(o, SHAPE.adapt);
}

/**
 * The exposure (scene/exposure.js), from the coordinator's gain: the light's stretch as the photographs have it,
 * and the knots' cusp and the star's colours: the profile's under Eye and Camera, its declared `enhanced` set
 * under Deep (shellneb.js paletteOf). Pure.
 */
export function paletteFor(gain = 1, profile = PROFILE) {
  const P = profile && profile.colours && profile.colours.lines ? profile : PROFILE;
  return paletteOf(gain, P);
}

/** The knots, seeded: {pos: Float32Array(3n), knot: Float32Array(4n) [head, tail, opacity, seed]}. Pure. */
export function knotsOf(g, n, seed = 7293) {
  const { rand, gauss } = seeded(seed);
  const pos = new Float32Array(3 * n), knot = new Float32Array(4 * n);
  const K = g.knots;
  for (let i = 0; i < n; i++) {
    let p;
    for (let tries = 0; tries < 20; tries++) {
      const phi = 2 * Math.PI * rand();
      if (rand() < K.inRing) {
        const r = g.R2 + gauss() * 0.4 * g.H2, z = gauss() * 0.4 * g.H2;
        p = [0, 1, 2].map((c) => (g.r1[c] * Math.cos(phi) + g.r2[c] * Math.sin(phi)) * r + g.a2[c] * z);
      } else {
        // On the inner edge of the ring (the rim, q ≈ 1.0), thinning inward to the paper's 2.2′.
        const q = 1.0 - Math.abs(gauss()) * 0.12 + gauss() * 0.03;
        const z = gauss() * 0.4 * g.H1;
        p = [0, 1, 2].map((c) => (g.d1[c] * Math.cos(phi) + g.d2[c] * Math.sin(phi)) * q * g.R1 + g.a1[c] * z);
      }
      const r = Math.hypot(p[0], p[1], p[2]);
      if (r >= K.from && r <= K.to) break;
    }
    pos.set(p, 3 * i);
    knot.set([K.head * (0.6 + 0.8 * rand()), K.tail * (0.4 + 0.5 * rand()), 0.4 + 0.25 * rand(), rand()], 4 * i);
  }
  return { pos, knot };
}

// ------------------------------------------------------------------------------------- the GLSL

const COMMON = GLSL.common;

const GAS_VERT = /* glsl */ `
varying vec3 vObj;
${COMMON}
void main() {
  vObj = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  #include <logdepthbuf_vertex>
}
`;

const GAS_FRAG = /* glsl */ `
#define MAX_N ${MAX_N}
uniform vec3 uCam;        // the camera in the sky frame, light-years (CPU, float64, each frame)
uniform vec3 uA1;         // the inner disc's axis, and two directions in its plane
uniform vec3 uD1;
uniform vec3 uD2;
uniform vec3 uA2;         // the outer ring's axis, and two directions in its plane
uniform vec3 uE1;
uniform vec3 uE2;
uniform vec4 uDisc;       // R1, H1, N1 (its depth along our line), its box in radii
uniform vec4 uRing;       // R2, H2, N2, its box in radii
uniform vec4 uUv;         // the light map: u0, v0, 1 / W, 1 / H (x west -> u, y north -> v)
uniform float uBound;
uniform int uN;           // samples a ring
uniform sampler2D uLight; // the photograph without its stars (display values, gasmat.js COLOUR_POLICY)
uniform float uGamma;     // the exposure's stretch, as scene/nebulae.js gives the photograph
uniform float uSat;
uniform float uShare;
uniform float uGain;
uniform float uStreak;    // 0 under Measured (UNDER_MEASURED.streaks)
uniform float uTime;      // still under Measured, reduced motion and ?look=1 (UNDER_MEASURED.drift)
uniform float uExact;     // 1: the exact front (each step its profile's integral); 0: the profile at the sampled point
varying vec3 vObj;
#include <common>
#include <logdepthbuf_pars_fragment>

${GLSL.layerSpan}${GLSL.pixelHash}${GLSL.front}
// The photograph's colour at sky point (x, y), stretched as the exposure stretches the photograph.
vec3 lightAt( vec2 xy ) {
  vec2 uv = uUv.xy + xy * uUv.zw;
  if ( uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0 ) return vec3( 0.0 );
  vec3 c = pow( max( texture2D( uLight, uv ).rgb, vec3( 0.0 ) ), vec3( uGamma ) );
  float y = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  return vec3( y ) + ( c - vec3( y ) ) * uSat;
}
// Of the light along our line at (x, y), the inner disc's share (helix.js discShare).
float discShare( vec2 xy ) {
  float zc = -( xy.x * uA1.x + xy.y * uA1.y ) / uA1.z;
  float q = length( vec3( xy, zc ) ) / uDisc.x;
  return 1.0 - smoothstep( ${f3(SHAPE.discIn)}, ${f3(SHAPE.discEdge)}, q );
}
// Seeded radial streaks in a ring's plane (Film only): finer than the photograph, drifting at most
// 1 % of a streak's width a minute.
float hash1( float n ) { return fract( sin( mod( n, 1000.0 ) * 12.9898 ) * 43758.5453 ); }
float streak( vec2 e, float r ) {
  if ( uStreak <= 0.0 ) return 1.0;
  float a = atan( e.y, e.x ) * ${f3(SHAPE.streakCells)} + 3.0 * sin( r * 2.3 ) + uTime;
  float i = floor( a );
  float f = fract( a );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix( 1.0, 0.55 + 0.9 * mix( hash1( i ), hash1( i + 1.0 ), f ), uStreak );
}

void main() {
  #include <logdepthbuf_fragment>
  if ( uShare <= 0.0 ) discard;
  vec3 ro = uCam;
  vec3 rd = normalize( vObj - ro );
  float b = dot( ro, rd );
  float h = b * b - ( dot( ro, ro ) - uBound * uBound );
  if ( h <= 0.0 ) discard;
  h = sqrt( h );
  float t0 = max( 0.0, -b - h );
  float t1 = -b + h;
  if ( t1 <= t0 ) discard;
  // a static per-pixel offset: grain, never bands, and no temporal state
  float j = pixelHash( gl_FragCoord.xy );
  float dust = 0.0;
  // ---- the inner disc: the light inside its outline, emitted and self-absorbed along the slab
  vec3 C1 = vec3( 0.0 );
  float T1 = 1.0;
  vec4 s = layerSpan( ro, rd, uA1, ${f3(SHAPE.slab)} * uDisc.y, 0.0, uDisc.w * uDisc.x, t0, t1 );
  float z1 = dot( ro, uA1 );
  float dz1 = dot( rd, uA1 );
  float L = spanLen( s );
  if ( L > 0.0 ) {
    float dt = L / float( uN );
    for ( int i = 0; i < MAX_N; i++ ) {
      if ( i >= uN ) break;
      vec3 p = ro + rd * spanT( s, ( float( i ) + j ) * dt );
      float z = dot( p, uA1 );
      float u = z / uDisc.y;
      float g = exp( -u * u * u * u );
      vec3 ip = p - uA1 * z;
      float r = length( ip );
      vec3 lc = lightAt( p.xy );
      float lum = dot( lc, vec3( 0.2126, 0.7152, 0.0722 ) );
      float sh = discShare( p.xy );
      // the exact front: the profile over the step's whole stretch, or at its one point
      float prof = uExact > 0.5 ? slabIntegral( s, float( i ) * dt, float( i + 1 ) * dt, z1 / uDisc.y, dz1 / uDisc.y ) : g * dt;
      float rhoDt = prof / uDisc.z * sh;
      float tau = ${f3(SHAPE.kappa)} * lum * sh;
      float comp = tau > 1e-4 ? tau / ( 1.0 - exp( -tau ) ) : 1.0;
      // each step integrated exactly for a constant density across it
      float ab = ${f3(SHAPE.kappa)} * lum * rhoDt;
      float w = ab > 1e-5 ? ( 1.0 - exp( -ab ) ) / ( ${f3(SHAPE.kappa)} * lum ) : rhoDt;
      C1 += T1 * lc * comp * w * streak( vec2( dot( ip, uD1 ), dot( ip, uD2 ) ), r );
      T1 *= exp( -ab );
      float rq = ( r / uDisc.x - ${f3(SHAPE.rimQ)} ) / ${f3(SHAPE.rimW)};
      dust += g * exp( -rq * rq ) * dt;
    }
  }
  // ---- the outer ring: the rest of the light, out to its fade
  vec3 C2 = vec3( 0.0 );
  float T2 = 1.0;
  s = layerSpan( ro, rd, uA2, ${f3(SHAPE.slab)} * uRing.y, 0.0, uRing.w * uRing.x, t0, t1 );
  float z2 = dot( ro, uA2 );
  float dz2 = dot( rd, uA2 );
  L = spanLen( s );
  if ( L > 0.0 ) {
    float dt = L / float( uN );
    for ( int i = 0; i < MAX_N; i++ ) {
      if ( i >= uN ) break;
      vec3 p = ro + rd * spanT( s, ( float( i ) + j ) * dt );
      float z = dot( p, uA2 );
      float u = z / uRing.y;
      vec3 ip = p - uA2 * z;
      float r = length( ip );
      vec3 lc = lightAt( p.xy );
      float lum = dot( lc, vec3( 0.2126, 0.7152, 0.0722 ) );
      float sh = ( 1.0 - discShare( p.xy ) ) * ( 1.0 - smoothstep( ${f3(SHAPE.ringFade)}, ${f3(SHAPE.ringOut)}, r / uRing.x ) );
      float prof = uExact > 0.5 ? slabIntegral( s, float( i ) * dt, float( i + 1 ) * dt, z2 / uRing.y, dz2 / uRing.y ) : exp( -u * u * u * u ) * dt;
      float rhoDt = prof / uRing.z * sh;
      float tau = ${f3(SHAPE.kappa)} * lum * sh;
      float comp = tau > 1e-4 ? tau / ( 1.0 - exp( -tau ) ) : 1.0;
      float ab = ${f3(SHAPE.kappa)} * lum * rhoDt;
      float w = ab > 1e-5 ? ( 1.0 - exp( -ab ) ) / ( ${f3(SHAPE.kappa)} * lum ) : rhoDt;
      C2 += T2 * lc * comp * w * streak( vec2( dot( ip, uE1 ), dot( ip, uE2 ) ), r );
      T2 *= exp( -ab );
    }
  }
  // the two rings add: each absorbs only its own light, so on our line their sum is the photograph
  vec3 col = C1 + C2;
  float mx = max( col.r, max( col.g, col.b ) );
  if ( mx > ${f3(SHAPE.knee)} ) col *= ( ${f3(SHAPE.knee)} + ${f3(1 - SHAPE.knee)} * ( 1.0 - exp( -( mx - ${f3(SHAPE.knee)} ) / ${f3(1 - SHAPE.knee)} ) ) ) / mx;
  float T = exp( -${f3(SHAPE.sigma)} * dust );
  // premultiplied over: the light adds, and the rim's dust keeps T of what is behind it
  gl_FragColor = vec4( col * uGain * uShare, ( 1.0 - T ) * uShare );
}
`;

/** The shader sources, for tests/test_hero_helix.mjs (the JS above mirrors GAS_FRAG). */
export const SHADERS = { gasVertex: GAS_VERT, gas: GAS_FRAG, ...SHELL_SHADERS };

// ------------------------------------------------------------------------------------- the hero

export function createHero(THREE, env = {}) {
  const group = new THREE.Group();
  group.name = `deep-hero-${(env.profile && env.profile.id) || 'helix'}`;
  const profile = env.profile && Array.isArray(env.profile.layers) && env.profile.layers.some((l) => l && l.part === 'disc') ? env.profile : PROFILE;
  const g = geometryOf(profile);
  // The sky frame: west, north, toward the Sun. Set from the record's direction when the stage changes.
  const placer = skyPlacer(THREE, group, env);
  const sky = placer.sky;

  // --- the light: the photograph without its stars (scripts/build_deep_helix.py). Fetched with the hero.
  const light = lightTexture(THREE, new URL(LIGHT_URL, import.meta.url).href, 'Helix');
  const lightTex = light.tex;
  const pal0 = paletteFor(1, profile);
  // --- the gas
  const gasGeo = new THREE.IcosahedronGeometry(g.bound * 1.09, 3);
  const V3 = (v) => new THREE.Vector3(...v);
  const gasMat = shellMaterial(THREE, {
    vertexShader: GAS_VERT, fragmentShader: GAS_FRAG, absorbing: true, side: THREE.BackSide,
    uniforms: {
      uCam: { value: new THREE.Vector3(0, 0, 10) },
      uA1: { value: V3(g.a1) }, uD1: { value: V3(g.d1) }, uD2: { value: V3(g.d2) },
      uA2: { value: V3(g.a2) }, uE1: { value: V3(g.r1) }, uE2: { value: V3(g.r2) },
      uDisc: { value: new THREE.Vector4(g.R1, g.H1, g.N1, SHAPE.discOut) }, uRing: { value: new THREE.Vector4(g.R2, g.H2, g.N2, SHAPE.ringOut) },
      uUv: { value: new THREE.Vector4(g.uv.u0, g.uv.v0, 1 / g.uv.W, 1 / g.uv.H) },
      uBound: { value: g.bound }, uN: { value: 8 }, uLight: { value: lightTex },
      uGamma: { value: pal0.gamma }, uSat: { value: pal0.saturation },
      uShare: { value: 0 }, uGain: { value: 1 }, uStreak: { value: 0 }, uTime: { value: 0 }, uExact: { value: 1 },
    },
  });
  gasMat.name = 'deep-helix-gas';
  // `-shells` for the T0 path's name in the contract's draw-order check (tests/test_contract.mjs).
  const gas = new THREE.Mesh(gasGeo, gasMat);
  gas.name = `${group.name}-shells`;
  gas.renderOrder = -1;
  sky.add(gas);

  // --- the knots (built for the tier; rebuilt if the tier changes)
  const knotMat = knotMaterial(THREE, { minPx: g.knots.minPx, cusp: pal0.cusp, name: 'deep-helix' });
  let knots = null, knotTier = -1, knotCount = 0, knotBytes = 0;
  function buildKnots(tier) {
    const n = (Array.isArray(g.knots.count) ? g.knots.count : KNOTS_BY_TIER)[Math.max(0, Math.min(2, tier | 0))] | 0;
    if (knots && knotTier === tier) return;
    if (knots) { sky.remove(knots); knots.geometry.dispose(); }
    const data = knotsOf(g, n);
    knots = knotMesh(THREE, data, knotMat);
    knots.name = `${group.name}-knots`;
    sky.add(knots);
    knotTier = tier; knotCount = n; knotBytes = data.pos.byteLength + data.knot.byteLength;
  }
  buildKnots(1);

  // --- the white dwarf
  const { mesh: star, mat: starMat, geo: starGeo } = starMesh(THREE, pal0.star, 'deep-helix');
  star.name = `${group.name}-star`;
  sky.add(star);

  let level = 0, levelShare = 0, clock = 0, samples = 8, tierNow = 1, last = { gas: 0, knots: 0, star: 0, photo: 0, light: 1 }, palette = pal0;
  const _cam = new THREE.Vector3();
  const setColour = (u, c) => u.value.setRGB(c[0], c[1], c[2], THREE.NoColorSpace);

  return {
    group,
    levels: [2, 3],
    setLevel(n, share = 1) {
      level = n;
      levelShare = n >= 2 ? Math.min(1, Math.max(0, share)) : 0;
      group.visible = levelShare > 0;
    },
    frame(info = {}) {
      placer.update();
      const tier = Number.isFinite(info.tier) ? info.tier : 1;
      if (tier !== tierNow || !knots) { tierNow = tier; buildKnots(tier); }
      const { vw, vh } = viewSize();
      const sh = sharesFor({ level: levelShare, rPx: info.rPx, photo: info.photo, viewH: vh });
      last = { ...sh, photo: Number(info.photo) || 0 };
      samples = samplesFor({ tier, steps: info.steps });
      const gain = Number.isFinite(info.gain) ? info.gain : 1;
      if (gain !== palette.gainIn) {
        palette = { ...paletteFor(gain, profile), gainIn: gain };
        setColour(knotMat.uniforms.uCusp, palette.cusp); setColour(starMat.uniforms.uColour, palette.star);
        gasMat.uniforms.uGamma.value = palette.gamma; gasMat.uniforms.uSat.value = palette.saturation;
      }
      const look = info.look || 'film';
      const still = !!(info.frozen || info.reduced) || stillUnder(look, UNDER_MEASURED.drift);
      // At most 1 % of a streak's width a minute (design section 7): barely perceptible, never under Measured.
      if (!still) clock += ((Number(info.dtMs) || 0) / 60000) * 0.01;
      const gu = gasMat.uniforms;
      const lit = light.state() === 'ready';
      gu.uShare.value = lit ? sh.gas : 0;
      gu.uN.value = samples;
      gu.uExact.value = FRONT.exact ? 1 : 0;
      gu.uStreak.value = drawnUnder(look, UNDER_MEASURED.streaks) ? SHAPE.streakAmp : 0;
      gu.uTime.value = clock;
      gu.uGain.value = palette.gain * SHAPE.exposure * sh.light;
      knotMat.uniforms.uGain.value = palette.gain * sh.light;
      knotMat.uniforms.uShare.value = drawnUnder(look, UNDER_MEASURED.knots) ? sh.knots : 0;
      starMat.uniforms.uShare.value = sh.star;
      gas.visible = gu.uShare.value > 0.002;
      knots.visible = knotMat.uniforms.uShare.value > 0.002;
      star.visible = sh.star > 0.002;
      knotMat.uniforms.uViewH.value = vh;
      starMat.uniforms.uView.value.set(vw, vh);
      if (info.camera) gu.uCam.value.copy(placer.camera(info.camera, _cam));
    },
    // The light map is the one thing it fetches: ready once it has landed (or failed, and said so).
    ready: () => light.state() !== 'loading',
    stats: () => ({
      level, share: Math.round(last.gas * 100) / 100, photo: Math.round(last.photo * 100) / 100, star: Math.round(last.star * 100) / 100,
      light: light.state(), samples, tier: tierNow, palette: palette.mode, knots: knotCount, meshes: 3, points: knotCount, textures: lightTex ? 1 : 0, front: FRONT.exact ? 'exact' : 'sampled',
      bytes: knotBytes + gasGeo.getAttribute('position').array.byteLength + QUAD_BYTES * 2 + (lightTex ? Math.round(512 * 474 * 4 * 4 / 3) : 0),
    }),
    dispose() {
      if (knots) knots.geometry.dispose();
      gasGeo.dispose(); starGeo.dispose();
      gasMat.dispose(); knotMat.dispose(); starMat.dispose();
      if (lightTex) lightTex.dispose();
      knots = null;
      if (group.parent) group.parent.remove(group);
    },
  };
}

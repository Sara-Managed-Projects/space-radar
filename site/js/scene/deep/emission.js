// scene/deep/emission.js -- EMISSION NEBULAE AS HEROES, one builder for many profiles (release 1.4.0 stage r14-neb-a,
// internal spec 0078: "no photographs, realistic 3D"): the Lagoon (M8), the Trifid (M20), the Eagle (M16) with its
// Pillars, the Omega (M17), the Rosette, the California, the North America with the Pelican and the Cat's Paw. Fetched by
// scene/deep/deepsky.js when one of them is near (scene/deep/heroes.js); never at boot. scene/deep/helix.js says what a
// hero answers:
//   createHero(THREE, env) -> { group, levels, setLevel(level, share), frame(info), ready(), stats(), card, dispose() }
// with env.profile the hero's registry profile (registry/deepsky-heroes/<id>.yaml, data/hero-<id>.js).
// Pure, for tests/test_hero_emission.mjs: geometryOf, columnJs, sheetOf, nearShare, paletteFor, clustersOf, assetUrls,
// UNDER_MEASURED, COPY_BLOCK, SHADERS.
//
// WHAT ONE IS. An H II region: the hot stars of a young cluster ionise the gas of the molecular cloud they formed from
// and blow a cavity in it, and the gas glows on the cavity's walls (H-alpha red, [O III] teal where it is hottest); dust
// left in front shows as dark lanes, pillars and globules, and dust beside the stars scatters their light blue. Each
// profile says which shape its papers measured: a BLISTER on the near face of its cloud (the Lagoon, the Omega), a
// CAVITY behind its cluster (the Eagle), a SHELL round its cluster (the Rosette, the Trifid), a chain of BUBBLES along a
// filament (the Cat's Paw), a SHEET (the California), a region split by a dark cloud IN FRONT of it (the North America
// and the Pelican).
//
// ITS SHAPE IS RECONSTRUCTED; ITS LIGHT IS THE PHOTOGRAPH'S (Orion's and Carina's technique, orion.js and carina.js).
// scripts/build_deep_emission.py bakes, on the photograph's own (u, v): the FAR wall's height (light-years toward the
// Sun, the record's place at 0), the cloud's column behind it, the dust's optical depth on our line, and the NEAR cap's
// height where the nebula is a shell or a bubble (its side toward us). The walls glow with the photograph's light (its
// stars removed) at the place it covers on the sky as seen from the Sun, shared between the two walls where both stand
// (`front.near.share` to the near one): from our side the model IS the photograph's light (tests/test_hero_emission.mjs
// holds the column to 5 %), and turned, that light is on the reconstructed walls, crisp at any number of steps because
// each crossing is found exactly. NO PHOTOGRAPH IS DRAWN FLAT: what stands in space is gas on walls, dust in front of
// them and stars among them.
//
// HOW IT IS DRAWN (no pass, no render target, no bloom; gasmat.js COLOUR_POLICY). Three draw calls at most, in the SKY
// FRAME (x west, y north, z toward the Sun, light-years about the record's place):
//   gas    a box round the photograph's footprint, drawn by its back faces; a few coarse steps through the walls' slab
//          (8 on T0, 12 at level 2, half the coordinator's at level 3), each crossing of the far wall and of the near cap
//          found by bisection; behind the far wall the cloud absorbs; the dust is a plane in front of both that absorbs
//          where the photograph is dark inside the profile's lanes and blobs, and the walls behind it were given that
//          light back, so on our line the two cancel and turned the dust stands in front of the glow.
//   sheet  the same walls as one or two meshes on T0 and under the frame latch (one texture read a pixel).
//   stars  one Points draw (orion.js's shaders): the ionising stars at SIMBAD's places by the catalogue stars' curve,
//          and seeded samples of the clusters as pinpoints whose summed light is the same at every tier.
// The point glow gives way to the hero (deepsky.js heroShares); a photograph, where one is still drawn, is given way to by
// its own share (info.photo), as Orion's is. As the nebula fills the view its light is scaled down (orion.js SHAPE.adapt).
//
// LOOKS. Nothing in it moves. The light has the exposure's own stretch (Deep is ENHANCED and each profile says so).
// Under Measured nothing changes: every part is a reconstruction or a seeded sample of measured numbers, and the card
// says which.

import { stage } from '../stage.js';
import { exposureLook, EXPOSURES, drawnUnder } from '../exposure.js';
import '../../copy/en.nebheroes.js'; // the card's words (deepNebulae), fetched with the hero
import { SHADERS as ORION, SHAPE, skyFrame, uvOf, coverAt, readFront, sampleFront, samplesFor, sharesFor, tintOf, pixelHash } from './orion.js';

export { coverAt, readFront, sampleFront, samplesFor, sharesFor, pixelHash, SHAPE };
export const UNDER_MEASURED = { front: 'same', cluster: 'same', motion: 'still' };
export const COPY_BLOCK = 'deepNebulae';

const D2R = Math.PI / 180;
const MAX_N = 32;
const BISECT = 4;
const CLUSTER_BY_TIER = [500, 1200, 2200];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const f3 = (x) => Number(x).toFixed(3);
const part = (P, k) => ((P && P.layers) || []).find((l) => l && l.part === k) || {};
const offset = (ra0, dec0, ra, dec) => [-(ra - ra0) * Math.cos(dec0 * D2R) * 60, (dec - dec0) * 60];

/** The near cap's share of the light at a cell whose cap stands `a` light-years over the stars' plane. Pure; GLSL nearK(). */
export function nearShare(k, a) { return k * smooth(a, 0.3, 1.5); }

/** Where the hero's files are, from its profile (site/... paths), as URLs beside this module. Pure. */
export function assetUrls(profile, base = import.meta.url) {
  const L = part(profile, 'light');
  const at = (p) => (p ? new URL(`../../../${String(p).replace(/^site\//, '')}`, base).href : null);
  return { light: at(L.file), front: at(L.depth), detail: at(L.detail && L.detail.file) };
}

/** The profile's numbers in light-years, about the record's place, in the sky frame (orion.js geometryOf's shape). Pure. */
export function geometryOf(P) {
  if (!P || !Array.isArray(P.layers)) throw new Error('emission.js: a hero needs its profile');
  const dist = Number(P.frame.distance_ly);
  const lyA = dist * Math.PI / (180 * 60);
  const origin = [Number(P.frame.ra_deg), Number(P.frame.dec_deg)];
  const light = part(P, 'light'), front = part(P, 'front'), cloud = part(P, 'cloud'), dust = part(P, 'dust'), list = part(P, 'stars'), cl = part(P, 'clusters');
  const pic = light.picture;
  const uv = uvOf(pic, origin, dist);
  const deepest = Math.max(0, ...(front.lobes || []).map((l) => Number(l.depth_ly) || 0), -(Number(front.outside_ly) || 0));
  const relief = Number(front.relief && front.relief.max_ly) || 0;
  const near = front.near || {};
  const highest = Math.max(0, ...(near.caps || []).map((c) => Number(c.height_ly) || 0));
  const corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => uv.xyOf(u, v));
  const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
  const at = (s, z = 0) => { const [w, n] = offset(origin[0], origin[1], s.ra_deg, s.dec_deg); return [w * lyA, n * lyA, z]; };
  const cloudLy = Number(cloud.thickness_ly) || 8;
  const D = light.detail || null;
  let detailBox = null;
  if (D) {
    const x = Number(D.centre_west_arcmin) * lyA, y = Number(D.centre_north_arcmin) * lyA;
    const uc = uv.u0 + x * uv.ux[0] + y * uv.uy[0], vc = uv.v0 + x * uv.ux[1] + y * uv.uy[1];
    const du = D.size_arcmin / 2 / pic.width_arcmin, dv = D.size_arcmin / 2 / pic.height_arcmin;
    detailBox = [uc - du, vc - dv, uc + du, vc + dv];
  }
  const slabTop = Math.max(highest, relief) + SHAPE.slabPad + 1;
  const veilZ = Math.max(Number(dust.z_ly) || 0, slabTop + 0.5);
  return {
    id: P.id, record: P.record, detailBox, detailPx: D ? Number(D.px) || 512 : 0,
    distanceLy: dist, lyPerArcmin: lyA, uv, origin,
    // the box reaches up to the dust's plane (so a view through it is drawn); the march's slab from the cloud's back to
    // just over the near caps' highest point
    box: { min: [Math.min(...xs), Math.min(...ys), -deepest - relief - cloudLy - 1], max: [Math.max(...xs), Math.max(...ys), veilZ + 1] },
    slabTop, veilZ, nearK: Number(near.share) || 0, nearTop: highest,
    cloudLy, sigma: Number(cloud.sigma_per_ly) || 0.8,
    stars: (list.stars || []).map((s) => ({ id: s.id, pos: at(s, Number(s.z_ly) || 0), v: Number(s.v_mag), temp: Number(s.temp_k) || 30000 })),
    clusters: (cl.clusters || []).map((c) => ({
      name: c.name, centre: at(c, Number(c.z_ly) || 0), core: Number(c.core_arcmin) * lyA, radius: Number(c.radius_arcmin) * lyA,
      members: Number(c.members) || 500, summedV: Number(c.summed_v) || 7,
    })),
    count: cl.count_drawn || CLUSTER_BY_TIER,
  };
}

/**
 * The clusters, seeded (carina.js clustersOf, the same arithmetic): n stars shared between them by their members, each a
 * Plummer sphere of its core radius cut at its radius round its catalogued place; each cluster's fluxes (relative to a
 * V = 6.5 star seen from here, times 0.35) sum to its `summed_v` at every n. Pure.
 */
export function clustersOf(g, n, seed = 6611) {
  let a = seed >>> 0;
  const rand = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pos = new Float32Array(3 * n), flux = new Float32Array(n), temp = new Float32Array(n);
  if (!g.clusters.length) return { pos: new Float32Array(0), flux: new Float32Array(0), temp: new Float32Array(0) };
  const total = g.clusters.reduce((s, c) => s + c.members, 0) || 1;
  let i = 0;
  g.clusters.forEach((K, k) => {
    const m = k === g.clusters.length - 1 ? n - i : Math.round(n * K.members / total);
    const from = i;
    let sum = 0;
    for (let j = 0; j < m; j++, i++) {
      let r;
      do { r = K.core / Math.sqrt(rand() ** (-2 / 3) - 1); } while (!(r < K.radius));
      const ct = 2 * rand() - 1, st = Math.sqrt(1 - ct * ct), ph = 2 * Math.PI * rand();
      pos.set([K.centre[0] + r * st * Math.cos(ph), K.centre[1] + r * st * Math.sin(ph), K.centre[2] + r * ct], 3 * i);
      const L = 0.02 * Math.pow(1 - 0.999 * rand(), -1.1);
      flux[i] = L; sum += L;
      temp[i] = 3100 + 9000 * Math.min(1, Math.pow(L / 5, 0.5)) * (0.7 + 0.3 * rand());
    }
    const want = Math.pow(10, -0.4 * (K.summedV - 6.5)) * 0.35;
    for (let j = from; j < i; j++) flux[j] *= want / (sum || 1);
  });
  return { pos, flux, temp };
}

/** The exposure (scene/exposure.js) from the coordinator's gain: the photograph's stretch. Pure. */
export function paletteFor(gain = 1, profile = null) {
  const mode = EXPOSURES.find((m) => Math.abs(exposureLook(m).milkyWay - gain) < 1e-6) || 'camera';
  const L = exposureLook(mode);
  return { mode, enhanced: mode === 'deep' && !!(profile && profile.colours && profile.colours.enhanced), gain: L.nebulaGain, gamma: L.nebulaGamma, saturation: L.nebulaSaturation };
}

// --------------------------------------------------------------- the march along a ray (in GLSL too)

/**
 * The colour and transmission along ro + t rd (unit rd, sky frame, ly): GAS_FRAG's main(), the same arithmetic.
 * `light(u, v)` -> the stretched light [r, g, b]; n coarse steps with offset j in [0, 1). Returns {rgb, T, crossings}
 * before the share and the gain. Pure.
 */
export function columnJs(g, front, ro, rd, { n = 12, j = 0.5, light = () => [0, 0, 0] } = {}) {
  const uvAt = (x, y) => [g.uv.u0 + x * g.uv.ux[0] + y * g.uv.uy[0], g.uv.v0 + x * g.uv.ux[1] + y * g.uv.uy[1]];
  const fAt = (p) => { const [u, v] = uvAt(p[0], p[1]); return sampleFront(front, u, v); };
  const P = (t) => [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t];
  const out = { rgb: [0, 0, 0], T: 1, crossings: 0 };
  let t0 = 0, t1 = Infinity;
  const top = [g.box.max[0], g.box.max[1], g.slabTop];
  for (let k = 0; k < 3; k++) {
    if (Math.abs(rd[k]) < 1e-9) { if (ro[k] < g.box.min[k] || ro[k] > top[k]) { t1 = -1; break; } continue; }
    const a = (g.box.min[k] - ro[k]) / rd[k], b = (top[k] - ro[k]) / rd[k];
    t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b));
  }
  let T = 1;
  const C = [0, 0, 0];
  const tv = Math.abs(rd[2]) > 1e-6 ? (g.veilZ - ro[2]) / rd[2] : -1;
  const veil = () => { const p = P(tv); const [u, v] = uvAt(p[0], p[1]); return Math.exp(-sampleFront(front, u, v)[2] * Math.sqrt(coverAt(u, v))); };
  if (tv > 0 && rd[2] < 0) T *= veil();
  const h = 1 / front.nx / Math.hypot(g.uv.ux[0], g.uv.ux[1]); // one cell, in ly
  // the light where the ray crosses surface c (0 the far wall, 3 the near cap) between ta and tb: bisection, a secant step
  const cross = (c, ta, tb, sa) => {
    let lo = ta, hi = tb, glo = sa, ghi = 0;
    const s = (t) => { const p = P(t); return p[2] - fAt(p)[c]; };
    ghi = s(tb);
    for (let b = 0; b < BISECT; b++) {
      const tm = 0.5 * (lo + hi), gm = s(tm);
      if ((gm > 0) === (glo > 0)) { lo = tm; glo = gm; } else { hi = tm; ghi = gm; }
    }
    const tc = lo + (hi - lo) * glo / (glo - ghi || 1e-9);
    const pc = P(tc), fc = fAt(pc);
    const [u, v] = uvAt(pc[0], pc[1]);
    const cov = coverAt(u, v);
    let rgb = [0, 0, 0];
    if (cov > 0) {
      const zx = (fAt([pc[0] + h, pc[1]])[c] - fc[c]) / h, zy = (fAt([pc[0], pc[1] + h])[c] - fc[c]) / h;
      const len = Math.hypot(zx, zy, 1);
      const mu = Math.abs(rd[2] - zx * rd[0] - zy * rd[1]) / len;
      const limb = 1 / (Math.max(mu, SHAPE.limbCap) * len);
      const k = nearShare(g.nearK, fc[3]);
      const w = cov * Math.exp(fc[2] * Math.sqrt(cov)) * limb * (c === 3 ? k : 1 - k);
      rgb = light(u, v).map((x) => x * w);
    }
    return { tc, fc, cov, rgb };
  };
  const cloudW = (gz) => (gz < 0 ? 1 - smooth(-gz, 0.6 * g.cloudLy, g.cloudLy) : 0);
  const cloudOf = (f, p, gz) => { const [u, v] = uvAt(p[0], p[1]); return g.sigma * f[1] * coverAt(u, v) * cloudW(gz); };
  const add = (rgb) => { for (let c = 0; c < 3; c++) C[c] += T * rgb[c]; out.crossings += 1; };
  if (t1 > t0) {
    const dt = (t1 - t0) / n;
    let ta = t0, fa = fAt(P(ta)), ga = P(ta)[2] - fa[0], ha = P(ta)[2] - fa[3];
    for (let i = 0; i <= n; i++) {
      const tb = Math.min(t1, t0 + (i + j) * dt);
      if (tb <= ta) continue;
      const pb = P(tb), fb = fAt(pb), gb = pb[2] - fb[0], hb = pb[2] - fb[3];
      const kb = cloudOf(fb, pb, gb), ka = cloudOf(fa, P(ta), ga);
      const nearX = g.nearK > 0 && (ha > 0) !== (hb > 0);
      // coming down onto the cap (from our side) it is crossed before the far wall
      if (nearX && ha > 0) add(cross(3, ta, tb, ha).rgb);
      if ((ga > 0) !== (gb > 0)) {
        const x = cross(0, ta, tb, ga);
        if (ga < 0) T *= Math.exp(-0.5 * (ka + g.sigma * x.fc[1] * x.cov) * (x.tc - ta));
        add(x.rgb);
        if (ga > 0) T *= Math.exp(-0.5 * (g.sigma * x.fc[1] * x.cov + kb) * (tb - x.tc));
      } else if (ga < 0) {
        T *= Math.exp(-0.5 * (ka + kb) * (tb - ta));
      }
      // coming up from behind, after it
      if (nearX && ha <= 0) add(cross(3, ta, tb, ha).rgb);
      ta = tb; fa = fb; ga = gb; ha = hb;
      if (T < 0.005 || tb >= t1) break;
    }
  }
  if (tv > 0 && rd[2] > 0) T *= veil();
  out.rgb = C; out.T = T;
  return out;
}

// -------------------------------------------------------------------------------------- the GLSL

const COMMON = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
`;
const GAS_VERT = /* glsl */ `
varying vec3 vObj;
${COMMON}
void main() {
  vObj = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  #include <logdepthbuf_vertex>
}
`;
// The walls' map and the light (orion.js's FRONT_GLSL and LIGHT_GLSL; A is the near cap's height here).
const FRONT_GLSL = /* glsl */ `
uniform sampler2D uFront;  // far z, cloud, dust tau, near z (scripts/build_deep_emission.py), half floats, linear
uniform vec2 uUv0;
uniform vec2 uUx;
uniform vec2 uUy;
uniform float uSigma;
uniform float uCloudLy;
uniform float uNearK;      // the near cap's share of the light where it stands clear (the profile's front.near.share)
vec2 uvAt( vec2 xy ) { return uUv0 + xy.x * uUx + xy.y * uUy; }
vec4 frontAt( vec2 xy ) { return texture2D( uFront, uvAt( xy ) ); }
float coverAt( vec2 uv ) {
  vec2 q = abs( uv * 2.0 - 1.0 );
  float e = pow( pow( q.x, 3.0 ) + pow( q.y, 3.0 ), 1.0 / 3.0 );
  float f = 1.0 - smoothstep( 0.5, 0.98, e );
  return f * f;
}
float nearK( float a ) { return uNearK * smoothstep( 0.3, 1.5, a ); }
float cloudW( float g ) { return g < 0.0 ? 1.0 - smoothstep( 0.6 * uCloudLy, uCloudLy, -g ) : 0.0; }
float cloudAt( vec4 f, vec3 p ) { return uSigma * f.g * coverAt( uvAt( p.xy ) ) * cloudW( p.z - f.r ); }
`;
const LIGHT_GLSL = /* glsl */ `
uniform sampler2D uLight;
uniform sampler2D uDetail;
uniform vec4 uDetBox;
uniform float uDetOn;
uniform float uDetPx;
uniform float uGamma;
uniform float uSat;
vec3 rawLight( vec2 uv, float uvPerPx ) {
  vec3 t = texture2D( uLight, uv ).rgb;
  if ( uDetOn > 0.0 ) {
    vec2 q = ( uv - uDetBox.xy ) / ( uDetBox.zw - uDetBox.xy );
    float e = max( abs( q.x * 2.0 - 1.0 ), abs( q.y * 2.0 - 1.0 ) );
    float texel = ( uDetBox.z - uDetBox.x ) / uDetPx;
    float w = ( 1.0 - smoothstep( ${f3(SHAPE.detailEdge)}, 1.0, e ) ) * smoothstep( 0.25, 0.5, texel / max( uvPerPx, 1e-9 ) );
    if ( w > 0.0 ) t = mix( t, texture2D( uDetail, clamp( q, 0.0, 1.0 ) ).rgb, w );
  }
  return t;
}
vec3 stretchLight( vec3 t ) {
  vec3 c = pow( max( t, vec3( 0.0 ) ), vec3( uGamma ) );
  float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  return mix( vec3( l ) * vec3( 0.86, 0.96, 1.0 ), c, uSat );
}
`;

const GAS_FRAG = /* glsl */ `
#define MAX_N ${MAX_N}
uniform vec3 uCam;
uniform vec3 uBoxMin;
uniform vec3 uBoxMax;
uniform float uVeilZ;
uniform float uSlabTop;
uniform float uCell;
uniform int uN;
uniform float uPixAng;
uniform float uShare;
uniform float uGain;
varying vec3 vObj;
${FRONT_GLSL}
${LIGHT_GLSL}
#include <common>
#include <logdepthbuf_pars_fragment>

float pixelHash( vec2 p ) {
  vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
  p3 += dot( p3, p3.yzx + 33.33 );
  return fract( ( p3.x + p3.y ) * p3.z );
}
float veilT( vec3 ro, vec3 rd, float tv ) {
  vec2 uv = uvAt( ( ro + rd * tv ).xy );
  return exp( -texture2D( uFront, uv ).b * sqrt( coverAt( uv ) ) );
}
float surf( vec4 f, int c ) { return c == 0 ? f.r : f.a; }
// the crossing of surface c (0 the far wall, 3 the near cap) in [ta, tb], exactly: halvings, then one secant step; the
// light there (limb-brightened as a thin layer is, a grazing ray faded) times its share of the sky point's light
vec3 crossing( vec3 ro, vec3 rd, int c, float ta, float tb, float sa, out float tc, out vec4 fc, out float cov ) {
  float lo = ta, hi = tb, glo = sa;
  vec3 ph = ro + rd * tb;
  float ghi = ph.z - surf( frontAt( ph.xy ), c );
  for ( int b = 0; b < ${BISECT}; b++ ) {
    float tm = 0.5 * ( lo + hi );
    vec3 pm = ro + rd * tm;
    float gm = pm.z - surf( frontAt( pm.xy ), c );
    if ( ( gm > 0.0 ) == ( glo > 0.0 ) ) { lo = tm; glo = gm; } else { hi = tm; ghi = gm; }
  }
  tc = lo + ( hi - lo ) * glo / ( abs( glo - ghi ) > 1e-9 ? glo - ghi : 1e-9 );
  vec3 pc = ro + rd * tc;
  fc = frontAt( pc.xy );
  vec2 uv = uvAt( pc.xy );
  cov = coverAt( uv );
  if ( cov <= 0.0 ) return vec3( 0.0 );
  float zx = ( surf( frontAt( pc.xy + vec2( uCell, 0.0 ) ), c ) - surf( fc, c ) ) / uCell;
  float zy = ( surf( frontAt( pc.xy + vec2( 0.0, uCell ) ), c ) - surf( fc, c ) ) / uCell;
  float len = length( vec3( zx, zy, 1.0 ) );
  float mu = abs( rd.z - zx * rd.x - zy * rd.y ) / len;
  float limb = 1.0 / ( max( mu, ${f3(SHAPE.limbCap)} ) * len );
  float k = nearK( fc.a );
  float uvPerPx = tc * uPixAng * length( uUx );
  return stretchLight( rawLight( uv, uvPerPx ) ) * ( cov * exp( fc.b * sqrt( cov ) ) * limb * ( c == 3 ? k : 1.0 - k ) );
}

void main() {
  #include <logdepthbuf_fragment>
  if ( uShare <= 0.0 ) discard;
  vec3 ro = uCam;
  vec3 rd = normalize( vObj - ro );
  vec3 inv = 1.0 / ( abs( rd ) + 1e-9 ) * sign( rd + 1e-12 );
  vec3 ta3 = ( uBoxMin - ro ) * inv;
  vec3 tb3 = ( vec3( uBoxMax.xy, uSlabTop ) - ro ) * inv;
  vec3 tn = min( ta3, tb3 );
  vec3 tf = max( ta3, tb3 );
  float t0 = max( max( tn.x, tn.y ), max( tn.z, 0.0 ) );
  float t1 = min( min( tf.x, tf.y ), tf.z );
  float T = 1.0;
  vec3 C = vec3( 0.0 );
  float tv = abs( rd.z ) > 1e-6 ? ( uVeilZ - ro.z ) / rd.z : -1.0;
  if ( tv > 0.0 && rd.z < 0.0 ) T *= veilT( ro, rd, tv );
  if ( t1 > t0 ) {
    float j = pixelHash( gl_FragCoord.xy );
    float dt = ( t1 - t0 ) / float( uN );
    float ta = t0;
    vec3 pa = ro + rd * ta;
    vec4 fa = frontAt( pa.xy );
    float ga = pa.z - fa.r;
    float ha = pa.z - fa.a;
    float ka = cloudAt( fa, pa );
    float tc; vec4 fc; float cov;
    for ( int i = 0; i <= MAX_N; i++ ) {
      if ( i > uN ) break;
      float tb = min( t1, t0 + ( float( i ) + j ) * dt );
      if ( tb <= ta ) continue;
      vec3 pb = ro + rd * tb;
      vec4 fb = frontAt( pb.xy );
      float gb = pb.z - fb.r;
      float hb = pb.z - fb.a;
      float kb = cloudAt( fb, pb );
      bool nearX = uNearK > 0.0 && ( ha > 0.0 ) != ( hb > 0.0 );
      if ( nearX && ha > 0.0 ) C += T * crossing( ro, rd, 3, ta, tb, ha, tc, fc, cov );
      if ( ( ga > 0.0 ) != ( gb > 0.0 ) ) {
        vec3 l = crossing( ro, rd, 0, ta, tb, ga, tc, fc, cov );
        float sc = uSigma * fc.g * cov;
        if ( ga < 0.0 ) T *= exp( -0.5 * ( ka + sc ) * ( tc - ta ) );
        C += T * l;
        if ( ga > 0.0 ) T *= exp( -0.5 * ( sc + kb ) * ( tb - tc ) );
      } else if ( ga < 0.0 ) {
        T *= exp( -0.5 * ( ka + kb ) * ( tb - ta ) );
      }
      if ( nearX && ha <= 0.0 ) C += T * crossing( ro, rd, 3, ta, tb, ha, tc, fc, cov );
      ta = tb; fa = fb; ga = gb; ha = hb; ka = kb;
      if ( T < 0.005 || tb >= t1 ) break;
    }
  }
  if ( tv > 0.0 && rd.z > 0.0 ) T *= veilT( ro, rd, tv );
  vec3 col = C * uGain * uShare;
  float mx = max( col.r, max( col.g, col.b ) );
  if ( mx > ${f3(SHAPE.shoulder)} ) col *= ( ${f3(SHAPE.shoulder)} + ( 1.0 - exp( -( mx - ${f3(SHAPE.shoulder)} ) ) ) * 0.5 ) / mx;
  gl_FragColor = vec4( col, ( 1.0 - T ) * uShare );
}
`;

// THE CHEAP PATH (T0 and the frame latch): each wall as a MESH, one texture lookup a pixel (orion.js's sheet, with the
// light shared between the far wall, uWhich 0, and the near cap, uWhich 1). Only the far wall's cloud absorbs.
const SHEET_VERT = /* glsl */ `
attribute vec2 aUv;
attribute vec3 aNormal;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vP;
${COMMON}
void main() {
  vUv = aUv; vN = aNormal; vP = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  #include <logdepthbuf_vertex>
}
`;
const SHEET_FRAG = /* glsl */ `
uniform vec3 uCam;
uniform float uVeilZ;
uniform float uPixAng;
uniform float uShare;
uniform float uGain;
uniform float uWhich;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vP;
${FRONT_GLSL}
${LIGHT_GLSL}
#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  if ( uShare <= 0.0 ) discard;
  float cov = coverAt( vUv );
  if ( cov <= 0.0 ) discard;
  vec4 f = texture2D( uFront, vUv );
  float k = nearK( f.a );
  float w = uWhich > 0.5 ? k : 1.0 - k;
  if ( w <= 0.0 ) discard;
  vec3 toCam = uCam - vP;
  float dist = length( toCam );
  vec3 v = toCam / dist;
  vec3 n = normalize( vN );
  float side = dot( n, v );
  float mu = abs( side );
  float limb = n.z / max( mu, ${f3(SHAPE.limbCap)} );
  vec3 e = stretchLight( rawLight( vUv, dist * uPixAng * length( uUx ) ) ) * cov * exp( f.b * sqrt( cov ) ) * limb * w;
  float T = 1.0;
  if ( ( uCam.z - uVeilZ ) * ( vP.z - uVeilZ ) < 0.0 ) {
    vec3 pv = uCam + ( vP - uCam ) * ( ( uVeilZ - uCam.z ) / ( vP.z - uCam.z ) );
    vec2 uvv = uvAt( pv.xy );
    T = exp( -texture2D( uFront, uvv ).b * sqrt( coverAt( uvv ) ) );
  }
  float Tc = uWhich > 0.5 ? 1.0 : exp( -uSigma * f.g * cov * min( uCloudLy / max( mu, 0.05 ), 3.0 * uCloudLy ) );
  vec3 col = ( side < 0.0 ? e * Tc : e ) * T * uGain * uShare;
  float mx = max( col.r, max( col.g, col.b ) );
  if ( mx > ${f3(SHAPE.shoulder)} ) col *= ( ${f3(SHAPE.shoulder)} + ( 1.0 - exp( -( mx - ${f3(SHAPE.shoulder)} ) ) ) * 0.5 ) / mx;
  gl_FragColor = vec4( col, ( 1.0 - Tc * T ) * uShare );
}
`;

/**
 * A wall as a mesh from the map: every `step`-th cell of channel `c` (0 the far wall, 3 the near cap); sky-frame
 * positions, (u, v) and normals. The near cap keeps only the cells where it stands (orion.js sheetOf, per channel). Pure.
 */
export function sheetOf(g, front, step = SHAPE.meshStep, c = 0) {
  const nx = Math.floor((front.nx - 1) / step) + 1, ny = Math.floor((front.ny - 1) / step) + 1;
  const pos = new Float32Array(nx * ny * 3), uv = new Float32Array(nx * ny * 2), nrm = new Float32Array(nx * ny * 3);
  // the grid's own axes in the sky frame (a picture may be turned): a cell's length and direction along u and along v
  const o = g.uv.xyOf(0, 0), U1 = g.uv.xyOf(1, 0), V1 = g.uv.xyOf(0, 1);
  const lu = Math.hypot(U1[0] - o[0], U1[1] - o[1]), lv = Math.hypot(V1[0] - o[0], V1[1] - o[1]);
  const eu = [(U1[0] - o[0]) / lu, (U1[1] - o[1]) / lu], ev = [(V1[0] - o[0]) / lv, (V1[1] - o[1]) / lv];
  const cx = lu / front.nx, cy = lv / front.ny;
  const z = (i, j) => front.data[(Math.min(front.ny - 1, Math.max(0, j)) * front.nx + Math.min(front.nx - 1, Math.max(0, i))) * 4 + c];
  for (let b = 0; b < ny; b++) for (let a = 0; a < nx; a++) {
    const i = Math.min(front.nx - 1, a * step), j = Math.min(front.ny - 1, b * step);
    const u = (i + 0.5) / front.nx, v = (j + 0.5) / front.ny;
    const [x, y] = g.uv.xyOf(u, v);
    const k = b * nx + a;
    pos.set([x, y, z(i, j)], 3 * k);
    uv.set([u, v], 2 * k);
    const zu = (z(i + 1, j) - z(i - 1, j)) / (2 * cx), zv = (z(i, j + 1) - z(i, j - 1)) / (2 * cy);
    const zx = zu * eu[0] + zv * ev[0], zy = zu * eu[1] + zv * ev[1];
    const l = Math.hypot(zx, zy, 1);
    nrm.set([-zx / l, -zy / l, 1 / l], 3 * k);
  }
  const index = [];
  for (let b = 0; b < ny - 1; b++) for (let a = 0; a < nx - 1; a++) {
    const k = b * nx + a;
    if (c === 3 && Math.max(pos[3 * k + 2], pos[3 * (k + 1) + 2], pos[3 * (k + nx) + 2], pos[3 * (k + nx + 1) + 2]) < 0.3) continue;
    index.push(k, k + 1, k + nx, k + 1, k + nx + 1, k + nx);
  }
  return { pos, uv, nrm, index, nx, ny };
}

/** The shader sources, for the tests (columnJs mirrors GAS_FRAG; the stars are orion.js's). */
export const SHADERS = { gasVertex: GAS_VERT, gas: GAS_FRAG, sheetVertex: SHEET_VERT, sheet: SHEET_FRAG, starVertex: ORION.starVertex, star: ORION.star };

// -------------------------------------------------------------------------------------- the hero

function material(THREE, { vertexShader, fragmentShader, uniforms, absorbing, side }) {
  // gasmat.js COLOUR_POLICY: display values, opaque list, no depth write; additive for light and premultiplied "over"
  // (GAS_ABSORB) for what absorbs (orion.js material, the same).
  const m = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: false, depthTest: false, depthWrite: false, toneMapped: false, side: side || THREE.DoubleSide });
  if (absorbing) {
    m.defines = { GAS_ABSORB: '' };
    m.blending = THREE.CustomBlending;
    m.blendSrc = THREE.OneFactor;
    m.blendDst = THREE.OneMinusSrcAlphaFactor;
  } else m.blending = THREE.AdditiveBlending;
  return m;
}

export function createHero(THREE, env = {}) {
  const profile = env.profile;
  const g = geometryOf(profile);
  const urls = assetUrls(profile);
  const DRAWN = { [profile.record]: (profile.drawn || ['reconstruction']).slice() };
  const group = new THREE.Group();
  group.name = `deep-hero-${profile.id}`;
  const sky = new THREE.Group();
  sky.name = `${group.name}-sky`;
  sky.matrixAutoUpdate = false;
  group.add(sky);
  let basisFor = null;
  function placeSky() {
    const rec = env.record;
    basisFor = stage.worldId;
    if (!rec || !rec.pos) return;
    const f = skyFrame(rec.pos);
    const c = new THREE.Vector3(), tip = new THREE.Vector3();
    if (!stage.toSceneInto(rec.pos, 'sun-inertial', c, stage.tMs)) return;
    const k = 1e12;
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

  // --- what it fetches: the light map, the sharp map (where the profile has one) and the walls' map
  let lightTex = null, lightState = 'none', detailTex = null, detailState = 'none', frontTex = null, frontState = 'none', frontBytes = 0;
  const browser = typeof document !== 'undefined';
  const loadTex = (url, mip, done) => {
    const t = new THREE.TextureLoader().load(url, () => done('ready'), undefined, (e) => { done('failed'); console.warn(`deep: a map of ${profile.id} did not load`, url, e); });
    t.colorSpace = THREE.NoColorSpace; // display values, as the photographs (gasmat.js COLOUR_POLICY)
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.generateMipmaps = mip;
    t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    return t;
  };
  const blank = new THREE.DataTexture(new Uint16Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat, THREE.HalfFloatType);
  blank.needsUpdate = true;
  const pal0 = paletteFor(1, profile);
  const V3 = (v) => new THREE.Vector3(...v);
  const V2 = (v) => new THREE.Vector2(...v);
  const front = () => ({
    uFront: { value: blank }, uUv0: { value: new THREE.Vector2(g.uv.u0, g.uv.v0) }, uUx: { value: V2(g.uv.ux) }, uUy: { value: V2(g.uv.uy) },
    uSigma: { value: g.sigma }, uCloudLy: { value: g.cloudLy }, uBoxMin: { value: V3(g.box.min) }, uBoxMax: { value: V3(g.box.max) }, uNearK: { value: g.nearK },
  });
  const camU = { value: new THREE.Vector3(0, 0, 400) };
  const lightU = () => ({
    uLight: { value: blank }, uDetail: { value: blank }, uDetBox: { value: new THREE.Vector4(...(g.detailBox || [0, 0, 1, 1])) }, uDetOn: { value: 0 }, uDetPx: { value: g.detailPx || 512 },
    uGamma: { value: pal0.gamma }, uSat: { value: pal0.saturation },
  });
  // --- the gas: the box round the footprint, by its back faces (T1 and up)
  const size = g.box.max.map((v, i) => v - g.box.min[i]);
  const gasGeo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  gasGeo.translate(...g.box.max.map((v, i) => (v + g.box.min[i]) / 2));
  const gasMat = material(THREE, {
    vertexShader: GAS_VERT, fragmentShader: GAS_FRAG, absorbing: true, side: THREE.BackSide,
    uniforms: { ...front(), ...lightU(), uCam: camU, uVeilZ: { value: g.veilZ }, uSlabTop: { value: g.slabTop }, uCell: { value: 0.7 }, uN: { value: 12 }, uPixAng: { value: 0.001 }, uShare: { value: 0 }, uGain: { value: 1 } },
  });
  gasMat.name = `deep-${profile.id}-gas`;
  const gas = new THREE.Mesh(gasGeo, gasMat);
  gas.name = `${group.name}-shells`; // the contract's draw-order check knows a deep mesh by `-shells`
  gas.renderOrder = -1;
  sky.add(gas);
  // --- the sheets: the same walls as meshes (T0 and the latch), built once the walls' map has landed and only when wanted
  const sheetMat = (which) => {
    const m = material(THREE, {
      vertexShader: SHEET_VERT, fragmentShader: SHEET_FRAG, absorbing: true, side: THREE.DoubleSide,
      uniforms: { ...front(), ...lightU(), uCam: camU, uVeilZ: { value: g.veilZ }, uPixAng: gasMat.uniforms.uPixAng, uShare: { value: 0 }, uGain: { value: 1 }, uWhich: { value: which } },
    });
    m.name = `deep-${profile.id}-sheet-${which ? 'near' : 'far'}`;
    return m;
  };
  const sheetMats = g.nearK > 0 ? [sheetMat(0), sheetMat(1)] : [sheetMat(0)];
  const lit = [gasMat, ...sheetMats];
  if (browser && THREE.TextureLoader) {
    lightState = 'loading';
    lightTex = loadTex(urls.light, true, (st) => { lightState = st; });
    for (const m of lit) m.uniforms.uLight.value = lightTex;
    if (urls.detail) {
      // the sharp map has no mipmaps (GPU memory): the shader uses it only where its texels are at least half a pixel
      detailState = 'loading';
      detailTex = loadTex(urls.detail, false, (st) => { detailState = st; for (const m of lit) m.uniforms.uDetOn.value = st === 'ready' ? 1 : 0; });
      for (const m of lit) m.uniforms.uDetail.value = detailTex;
    }
  }
  let sheets = [], sheetBytes = 0, frontMap = null;
  const buildSheets = () => {
    if (sheets.length || !frontMap) return;
    sheetMats.forEach((m, i) => {
      const sh = sheetOf(g, frontMap, SHAPE.meshStep, i ? 3 : 0);
      if (!sh.index.length) return;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(sh.pos, 3));
      geo.setAttribute('aUv', new THREE.Float32BufferAttribute(sh.uv, 2));
      geo.setAttribute('aNormal', new THREE.Float32BufferAttribute(sh.nrm, 3));
      geo.setIndex(sh.index);
      const mesh = new THREE.Mesh(geo, m);
      mesh.name = `${group.name}-sheet${i ? '-near' : ''}`;
      mesh.renderOrder = -1;
      mesh.visible = false;
      sky.add(mesh);
      sheets.push(mesh);
      sheetBytes += sh.pos.byteLength + sh.uv.byteLength + sh.nrm.byteLength + sh.index.length * 4;
    });
  };

  // --- the stars: the ionising stars and the clusters (built for the tier), orion.js's shaders
  const starMat = material(THREE, {
    vertexShader: ORION.starVertex, fragmentShader: ORION.star,
    uniforms: { ...front(), uCam: camU, uDistLy: { value: g.distanceLy }, uPixelRatio: { value: 1 }, uShare: { value: 0 }, uGain: { value: 1 } },
  });
  starMat.name = `deep-${profile.id}-stars`;
  let stars = null, starTier = -1, starCount = 0, starBytes = 0;
  function buildStars(tier) {
    if (stars && starTier === tier) return;
    if (stars) { sky.remove(stars); stars.geometry.dispose(); }
    const n = g.clusters.length ? (Array.isArray(g.count) ? g.count : CLUSTER_BY_TIER)[clamp(tier | 0, 0, 2)] | 0 : 0;
    const cl = clustersOf(g, n);
    const m = g.stars.length;
    const pos = new Float32Array(3 * (m + n)), star = new Float32Array(4 * (m + n)), kind = new Float32Array(m + n);
    g.stars.forEach((s, i) => { pos.set(s.pos, 3 * i); star.set([...tintOf(s.temp), s.v], 4 * i); });
    for (let i = 0; i < n; i++) {
      pos.set(cl.pos.subarray(3 * i, 3 * i + 3), 3 * (m + i));
      star.set([...tintOf(cl.temp[i]), cl.flux[i]], 4 * (m + i));
      kind[m + i] = 1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aStar', new THREE.Float32BufferAttribute(star, 4));
    geo.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
    stars = new THREE.Points(geo, starMat);
    stars.name = `${group.name}-stars`;
    stars.frustumCulled = false;
    stars.renderOrder = -0.96;
    sky.add(stars);
    starTier = tier; starCount = m + n; starBytes = pos.byteLength + star.byteLength + kind.byteLength;
  }
  buildStars(1);

  const useFront = (f) => {
    frontTex = new THREE.DataTexture(f.half, f.nx, f.ny, THREE.RGBAFormat, THREE.HalfFloatType);
    frontTex.minFilter = frontTex.magFilter = THREE.LinearFilter;
    frontTex.wrapS = frontTex.wrapT = THREE.ClampToEdgeWrapping;
    frontTex.generateMipmaps = false;
    frontTex.needsUpdate = true;
    frontBytes = f.half.byteLength;
    for (const m of [...lit, starMat]) m.uniforms.uFront.value = frontTex;
    gasMat.uniforms.uCell.value = 1 / f.nx / Math.hypot(g.uv.ux[0], g.uv.ux[1]);
    frontMap = f;
    frontState = 'ready';
  };
  if ((browser || env.fetchBin) && urls.front) {
    frontState = 'loading';
    const load = env.fetchBin || ((url) => fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`)))));
    Promise.resolve().then(() => load(urls.front)).then((buf) => useFront(readFront(buf)))
      .catch((e) => { frontState = 'failed'; console.warn(`deep: the walls of ${profile.id} did not load`, e); });
  }

  let level = 0, levelShare = 0, samples = 12, tierNow = 1, slowMs = 0, cheap = false, last = { gas: 0, stars: 0, photo: 0, light: 1 }, palette = pal0;
  const _inv = new THREE.Matrix4();
  const _id = new THREE.Matrix4();
  const _cam = new THREE.Vector3();

  return {
    group,
    levels: [2, 3],
    // The cheap path (the sheets) costs about what the holder it replaces does (orion.js's, spec 0076 W1-a).
    latchSafe: true,
    card: { copy: COPY_BLOCK, drawn: DRAWN },
    setLevel(n, share = 1) {
      level = n;
      levelShare = n >= 2 ? clamp(share, 0, 1) : 0;
      group.visible = levelShare > 0;
    },
    frame(info = {}) {
      if (basisFor !== stage.worldId) placeSky();
      const tier = Number.isFinite(info.tier) ? info.tier : 1;
      if (tier !== tierNow || !stars) { tierNow = tier; buildStars(tier); }
      const q = typeof env.quality === 'function' ? env.quality() || {} : {};
      cheap = !(tier >= 1) || !!q.latched;
      if (cheap) buildSheets();
      const vh = (typeof globalThis.innerHeight === 'number' && globalThis.innerHeight) || 800;
      const sh = sharesFor({ level: levelShare, rPx: info.rPx, photo: info.photo, viewH: vh });
      last = { ...sh, photo: Number(info.photo) || 0 };
      // slow frames halve the coarse steps before the governor would lower the pixel ratio (spec 0075 task 44)
      const dt = Number(info.dtMs) || 0;
      if (!(info.frozen || info.reduced)) slowMs = slowMs * 0.9 + dt * 0.1;
      samples = cheap ? 0 : samplesFor({ tier, steps: level >= 3 ? info.steps : 0, slow: slowMs > 24 });
      const gain = Number.isFinite(info.gain) ? info.gain : 1;
      if (gain !== palette.gainIn) {
        palette = { ...paletteFor(gain, profile), gainIn: gain };
        for (const m of lit) { m.uniforms.uGamma.value = palette.gamma; m.uniforms.uSat.value = palette.saturation; }
      }
      // Under Measured nothing changes and nothing moves (UNDER_MEASURED): every part is measured, reconstructed or seeded.
      const keep = drawnUnder(info.look || 'film', UNDER_MEASURED.front) ? 1 : 0;
      const ok = lightState === 'ready' && frontState === 'ready';
      const gu = gasMat.uniforms;
      gu.uShare.value = ok && !cheap ? sh.gas * keep : 0;
      for (const m of sheetMats) m.uniforms.uShare.value = ok && cheap ? sh.gas * keep : 0;
      gu.uN.value = Math.max(1, samples);
      for (const m of lit) m.uniforms.uGain.value = palette.gain * sh.light;
      starMat.uniforms.uShare.value = frontState === 'ready' ? sh.stars : 0;
      starMat.uniforms.uPixelRatio.value = (typeof globalThis.devicePixelRatio === 'number' && globalThis.devicePixelRatio) || 1;
      gas.visible = gu.uShare.value > 0.002;
      for (const s of sheets) s.visible = s.material.uniforms.uShare.value > 0.002;
      stars.visible = starCount > 0 && starMat.uniforms.uShare.value > 0.002;
      if (info.camera) {
        if (group.parent) group.parent.updateWorldMatrix(true, false);
        _inv.multiplyMatrices(group.parent ? group.parent.matrixWorld : _id, group.matrix).multiply(sky.matrix).invert();
        _cam.copy(info.camera.position).applyMatrix4(_inv);
        camU.value.copy(_cam);
        const P = info.camera.projectionMatrix.elements;
        gu.uPixAng.value = 2 / Math.max(1, P[5] * vh);
      }
    },
    ready: () => lightState !== 'loading' && frontState !== 'loading' && detailState !== 'loading',
    stats: () => ({
      level, share: Math.round(last.gas * 100) / 100, photo: Math.round(last.photo * 100) / 100, stars: Math.round(last.stars * 100) / 100,
      light: lightState, detail: detailState, front: frontState, path: cheap ? 'sheet' : 'march', samples, tier: tierNow, palette: palette.mode, points: starCount,
      meshes: 2 + (cheap ? sheets.length : 0),
      textures: (lightTex ? 1 : 0) + (detailTex ? 1 : 0) + (frontTex ? 1 : 0),
      bytes: starBytes + sheetBytes + gasGeo.getAttribute('position').array.byteLength + frontBytes + (lightTex && lightTex.image ? Math.round(lightTex.image.width * lightTex.image.height * 4 * 4 / 3) : 0) + (detailTex ? (g.detailPx || 512) ** 2 * 4 : 0),
      camLy: [Math.round(_cam.x * 10) / 10, Math.round(_cam.y * 10) / 10, Math.round(_cam.z * 10) / 10],
    }),
    dispose() {
      if (stars) stars.geometry.dispose();
      for (const s of sheets) s.geometry.dispose();
      gasGeo.dispose();
      for (const m of [...lit, starMat]) m.dispose();
      for (const t of [lightTex, detailTex, frontTex]) if (t) t.dispose();
      blank.dispose();
      stars = null; sheets = [];
      if (group.parent) group.parent.remove(group);
    },
  };
}

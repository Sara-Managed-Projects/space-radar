// scene/deep/reflection.js -- a reflection nebula lit by MANY stars, as a VOLUME: the Pleiades' nebula (M45; release 1.4.0
// stage r14-neb-b). Fetched by scene/deep/deepsky.js when the record is near (scene/deep/heroes.js); never at boot.
// scene/deep/helix.js says what a hero answers:
//   createHero(THREE, env) -> { group, levels, setLevel(level, share), frame(info), ready(), stats(), card, dispose() }
// Pure, for tests/test_hero_r14neb.mjs: geometryOf, illumAt, slabAt, emissivity, columnAt, columnMap, columnsFrom, marchJs,
//   phaseFactor, capLight, samplesFor, SHAPE, SHADERS, UNDER_MEASURED, COPY_BLOCK, DRAWN.
//
// WHY A VOLUME. A sheet (scene/deep/dustsheet.js, the Iris's) suits one star lighting the wall of its own cavity. The
// Pleiades' nebula is a cloud passing through a cluster, lit by a dozen stars at different depths: as a sheet it was a
// wavy curtain from the side. Here the light the photograph shows is spread through the cloud in proportion to how
// brightly each point of it is LIT -- the dust's density times the stars' light falling on it -- so from any side the
// glow sits round the stars that make it, as scattered light does.
//
// THE PHYSICS, AND WHAT IS A MODEL. Light scattered by optically thin dust at p is proportional to the dust's density
// there times the starlight reaching it, sum_k L_k / |p - s_k|^2 (softened by `soft_ly`), times the phase function of
// the angle star - dust - eye (Henyey-Greenstein, g). The STARS are the app's own (their places on the sky and V
// magnitudes measured, their depths scene/clusters.js's fixed numbers within the cluster: the card says so). The DUST is
// a model: a slab `thickness_ly` thick whose near face is `front_ly` in front of the stars that light it at each place
// (in front because its gas is seen in absorption toward the members: Ritchey, Martinez & Federman 2006); its density
// across the sky is not modelled at all: the photograph's light is. Each sky point's light (the photograph without its
// stars' halos, scripts/build_deep_sheets.py) is spread along OUR line in proportion to that emissivity, divided by the
// line's own column of it (columnAt, tabulated once: columnMap): so FROM OUR SIDE THE MODEL IS THE PHOTOGRAPH, whatever
// the steps; turned, the light gathers round the stars in depth.
//
// HOW IT IS DRAWN (no pass, no render target, no bloom; gasmat.js COLOUR_POLICY). ONE MESH, one draw call: the cloud's
// bounding box in the SKY FRAME (x west, y north, z toward the Sun, ly about the record's place), drawn by its back
// faces, so it draws with the camera inside it too. The fragment marches the ray through the box: n samples with a
// per-pixel offset (grain, never bands), each adding the photograph's light at its sky point times the emissivity there
// over that point's column, times the phase factor against our line. Samples near the camera fade in over `near_ly`,
// so from inside the cluster the dust round the camera is not a fog. The light is held to the photograph's brightest.
// The stars are the catalogue's: this module draws none.
//
// LOOKS. Nothing moves, under any look. The light has the exposure's own stretch, as the photographs have.

import { stage } from '../stage.js';
import { drawnUnder } from '../exposure.js';
import { part, offsetLy, uvOf, featherOf, paletteFor, sharesFor, placeSkyGroup, loadMap, cameraInSky, COMMON_GLSL } from './remnant.js';

export const COPY_BLOCK = 'r12Dust';
export const DRAWN = ['reconstruction'];
export const UNDER_MEASURED = { light: 'same', motion: 'still' };

const MAX_STARS = 12;
const MAX_N = 32;
const COLUMN_N = 128;
const f3 = (x) => Number(x).toFixed(4);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

// ONE table: the GLSL below is written from it.
export const SHAPE = {
  slabK: 2.5,     // the slab's density exp(-((z - zc) / h)^2) is followed to 2.5 half-thicknesses (0.2 %)
  shoulder: 1.0,  // one soft shoulder over 1, as dustsheet.js
  minColumn: 1e-6,
};

// ------------------------------------------------------------------------------------------- the geometry

/**
 * The profile's numbers in the sky frame: the light map's uv, the stars (pos ly, lum = 10^(-0.4 V)), the slab, the
 * phase function, the box. Pure.
 */
export function geometryOf(profile) {
  const P = profile || {};
  const fr = P.frame || {};
  const dist = Number(fr.distance_ly) || 425;
  const ra0 = Number(fr.ra_deg) || 0, dec0 = Number(fr.dec_deg) || 0;
  const li = part(P, 'light'), sc = part(P, 'scatter');
  const il = li.illuminate || {};
  const pic = li.picture || { ra_deg: ra0, dec_deg: dec0, width_arcmin: 60, height_arcmin: 60, north_deg: 0 };
  const uv = uvOf(pic, ra0, dec0, dist);
  const stars = (il.stars || []).slice(0, MAX_STARS).map((s) => {
    const [x, y] = offsetLy(ra0, dec0, s.ra_deg, s.dec_deg, dist);
    return { id: s.id, pos: [x, y, Number(s.z_ly) || 0], lum: 10 ** (-0.4 * (Number(s.v_mag) || 0)) };
  });
  const g = {
    distanceLy: dist, uv, edge: featherOf(li), peak: Number(li.peak) > 0 ? Number(li.peak) : 1, stars,
    soft: Math.max(0.05, Number(il.soft_ly) || 0.3), front: Number(il.front_ly) || 0, h: Math.max(0.1, (Number(il.thickness_ly) || 2) / 2),
    nearLy: Math.max(0.05, Number(il.near_ly) || 1),
    phase: sc.g !== undefined ? { g: clamp(Number(sc.g), -0.95, 0.95), lo: Number((sc.range || [])[0]) || 0.3, hi: Number((sc.range || [])[1]) || 1.4 } : null,
  };
  // the box: the picture's footprint, and the slab's depths over it (sampled on a grid)
  const corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => uv.xyOf(u, v));
  const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
  let zlo = Infinity, zhi = -Infinity;
  for (let j = 0; j <= 32; j++) for (let i = 0; i <= 32; i++) {
    const [x, y] = uv.xyOf(i / 32, j / 32);
    const zc = slabAt(g, x, y);
    zlo = Math.min(zlo, zc - SHAPE.slabK * g.h); zhi = Math.max(zhi, zc + SHAPE.slabK * g.h);
  }
  g.box = { min: [Math.min(...xs), Math.min(...ys), zlo], max: [Math.max(...xs), Math.max(...ys), zhi] };
  return g;
}

/** The stars' place weighted by their light on the sky at (x, y): lum / (r^2 + soft^2), r on the sky. Pure. */
export function illumAt(g, x, y) {
  let W = 0;
  const st = [0, 0, 0];
  const s2 = g.soft * g.soft;
  for (const s of g.stars) {
    const w = s.lum / ((x - s.pos[0]) ** 2 + (y - s.pos[1]) ** 2 + s2);
    W += w; st[0] += w * s.pos[0]; st[1] += w * s.pos[1]; st[2] += w * s.pos[2];
  }
  return W > 0 ? st.map((c) => c / W) : [x, y, 0];
}

/** The slab's middle at sky point (x, y): front_ly + h in front of the stars that light it there. Pure. */
export const slabAt = (g, x, y) => illumAt(g, x, y)[2] + g.front + g.h;

/**
 * The emissivity at p (before the light and the phase): the dust's density, a Gaussian slab about slabAt, times the
 * starlight reaching p, sum lum / (|p - s|^2 + soft^2). Also the stars' place weighted by what each gives here (for the
 * phase function). Pure; the GLSL's emit() is the same.
 */
export function emissivity(g, p) {
  const u = (p[2] - slabAt(g, p[0], p[1])) / g.h;
  const D = Math.exp(-u * u);
  let I = 0;
  const st = [0, 0, 0];
  const s2 = g.soft * g.soft;
  for (const s of g.stars) {
    const w = s.lum / ((p[0] - s.pos[0]) ** 2 + (p[1] - s.pos[1]) ** 2 + (p[2] - s.pos[2]) ** 2 + s2);
    I += w; st[0] += w * s.pos[0]; st[1] += w * s.pos[1]; st[2] += w * s.pos[2];
  }
  return { e: D * I, star: I > 0 ? st.map((c) => c / I) : p };
}

/** The emissivity's column along our line at sky point (x, y): the slab's span, 96 midpoint steps. Pure. */
export function columnAt(g, x, y, n = 96) {
  const zc = slabAt(g, x, y), a = zc - SHAPE.slabK * g.h, b = zc + SHAPE.slabK * g.h, dz = (b - a) / n;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += emissivity(g, [x, y, a + (i + 0.5) * dz]).e * dz;
  return sum;
}

/** The columns tabulated once over the box's square (texel centres). Pure. */
export function columnMap(g, n = COLUMN_N) {
  const data = new Float32Array(n * n);
  const [x0, y0] = g.box.min, [x1, y1] = g.box.max;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) data[j * n + i] = columnAt(g, x0 + (i + 0.5) / n * (x1 - x0), y0 + (j + 0.5) / n * (y1 - y0), 48);
  return { n, data, min: [x0, y0], size: [x1 - x0, y1 - y0] };
}
/** The map read bilinearly at (x, y), as the GPU's linear filter reads it (clamped). Pure. */
export function columnsFrom(map, x, y) {
  const n = map.n;
  const fx = clamp((x - map.min[0]) / map.size[0] * n - 0.5, 0, n - 1), fy = clamp((y - map.min[1]) / map.size[1] * n - 0.5, 0, n - 1);
  const i0 = Math.floor(fx), j0 = Math.floor(fy), i1 = Math.min(n - 1, i0 + 1), j1 = Math.min(n - 1, j0 + 1), ax = fx - i0, ay = fy - j0;
  const at = (i, j) => map.data[j * n + i];
  return (at(i0, j0) * (1 - ax) + at(i1, j0) * ax) * (1 - ay) + (at(i0, j1) * (1 - ax) + at(i1, j1) * ax) * ay;
}

/** Henyey-Greenstein, per steradian times 4 pi. Pure. */
const hg = (mu, gg) => { const d = 1 + gg * gg - 2 * gg * mu; return (1 - gg * gg) / (d * Math.sqrt(d)); };
/**
 * How much brighter the light scattered at p toward an eye along -rd is than toward us (along +z), for light from
 * `star`: clamped to the profile's range; 1 on our line. Pure.
 */
export function phaseFactor(ph, p, star, rd) {
  if (!ph) return 1;
  const i = norm([p[0] - star[0], p[1] - star[1], p[2] - star[2]]);
  const mu = -(i[0] * rd[0] + i[1] * rd[1] + i[2] * rd[2]);
  return clamp(hg(mu, ph.g) / hg(i[2], ph.g), ph.lo, ph.hi);
}

/** The light never outshines the photograph (dustsheet.js capLight): luminance held to `peak`, hue kept. Pure. */
export function capLight(rgb, peak) {
  const y = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  return y > peak ? rgb.map((x) => x * peak / y) : rgb.slice();
}

/** The part of the ray from ro along rd inside the box: [t0, t1] or null. Pure. */
export function boxSpan(g, ro, rd) {
  let t0 = 0, t1 = Infinity;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(rd[k]) < 1e-12) { if (ro[k] < g.box.min[k] || ro[k] > g.box.max[k]) return null; continue; }
    let a = (g.box.min[k] - ro[k]) / rd[k], b = (g.box.max[k] - ro[k]) / rd[k];
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b);
  }
  return t1 > t0 ? [t0, t1] : null;
}

/**
 * The colour along a ray (the fragment's main()): n samples with offset j in [0, 1); `light(u, v)` -> the stretched
 * picture (0 outside it); `map` the tabulated columns (or exact ones without). Before the share, the gain and the cap. Pure.
 */
export function marchJs(g, ro, rd, n = 16, j = 0.5, light = () => [0, 0, 0], map = null) {
  const sp = boxSpan(g, ro, rd);
  const C = [0, 0, 0];
  if (!sp) return C;
  const dt = (sp[1] - sp[0]) / n;
  for (let i = 0; i < n; i++) {
    const t = sp[0] + (i + j) * dt;
    const p = [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t];
    const N = map ? columnsFrom(map, p[0], p[1]) : columnAt(g, p[0], p[1]);
    if (!(N > SHAPE.minColumn)) continue;
    const [u, v] = g.uv.at(p[0], p[1]);
    if (u < 0 || v < 0 || u > 1 || v > 1) continue;
    const { e, star } = emissivity(g, p);
    const w = e / N * dt * phaseFactor(g.phase, p, star, rd) * smooth(t, 0, g.nearLy);
    const c = light(u, v);
    for (let k = 0; k < 3; k++) C[k] += c[k] * w;
  }
  return C;
}

/** Samples a ray: 6 on T0 (and under the latch), 16 at level 2, the march's steps above (to 32). Pure. */
export function samplesFor({ tier = 1, steps = 0, cheap = false } = {}) {
  if (cheap || !(tier >= 1)) return 6;
  return clamp(Math.round(Number(steps) || 16), 16, MAX_N);
}

// ------------------------------------------------------------------------------------------- the GLSL

const VERT = /* glsl */ `
varying vec3 vObj;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vObj = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  #include <logdepthbuf_vertex>
}
`;

const FRAG = /* glsl */ `
#define MAX_N ${MAX_N}
#define MAX_STARS ${MAX_STARS}
uniform vec3 uCam;            // the camera in the sky frame (ly; CPU, float64, each frame)
uniform vec3 uBoxMin;
uniform vec3 uBoxMax;
uniform vec4 uStars[ MAX_STARS ];  // xyz the star in the sky frame, w its light (10^(-0.4 V))
uniform int uStarN;
uniform vec4 uSlab;           // softening^2, front_ly, half-thickness h, near_ly
uniform vec3 uPhase;          // g (0: none), the factor's floor and ceiling
uniform vec4 uUv;             // the light map: u0, v0, and (ux.x, ux.y)
uniform vec2 uUvY;            // (uy.x, uy.y)
uniform vec2 uEdge;           // the picture's edge feather (remnant.js coverAt)
uniform sampler2D uLight;     // the photograph without its stars' halos (display values)
uniform sampler2D uCols;      // the emissivity's column along our line, tabulated (reflection.js columnMap)
uniform vec4 uColAt;          // the map's min x, min y, 1 / size x, 1 / size y
uniform int uN;
uniform float uJit;
uniform float uPeak;
uniform float uShare;
uniform float uGain;
varying vec3 vObj;
${COMMON_GLSL}
#include <common>
#include <logdepthbuf_pars_fragment>
// the stars' depth weighted by their light on the sky (reflection.js illumAt), and the slab's middle there (slabAt)
float slabAt( vec2 xy ) {
  float W = 0.0, Z = 0.0;
  for ( int i = 0; i < MAX_STARS; i++ ) {
    if ( i >= uStarN ) break;
    vec2 d = xy - uStars[ i ].xy;
    float w = uStars[ i ].w / ( dot( d, d ) + uSlab.x );
    W += w;
    Z += w * uStars[ i ].z;
  }
  return Z / max( W, 1e-30 ) + uSlab.y + uSlab.z;
}
float hg( float mu, float g ) { float d = 1.0 + g * g - 2.0 * g * mu; return ( 1.0 - g * g ) / ( d * sqrt( d ) ); }
void main() {
  #include <logdepthbuf_fragment>
  if ( uShare <= 0.0 ) discard;
  vec3 ro = uCam;
  vec3 rd = normalize( vObj - ro );
  // the box (reflection.js boxSpan): a ray that misses it is discarded at once
  vec3 rs = vec3( abs( rd.x ) < 1e-9 ? 1e-9 : rd.x, abs( rd.y ) < 1e-9 ? 1e-9 : rd.y, abs( rd.z ) < 1e-9 ? 1e-9 : rd.z );
  vec3 inv = 1.0 / rs;
  vec3 ta = ( uBoxMin - ro ) * inv, tb = ( uBoxMax - ro ) * inv;
  vec3 tmin = min( ta, tb ), tmax = max( ta, tb );
  float t0 = max( 0.0, max( tmin.x, max( tmin.y, tmin.z ) ) );
  float t1 = min( tmax.x, min( tmax.y, tmax.z ) );
  if ( t1 <= t0 ) discard;
  float j = uJit > 0.5 ? pixelHash( gl_FragCoord.xy ) : 0.5;
  float dt = ( t1 - t0 ) / float( uN );
  vec3 col = vec3( 0.0 );
  for ( int i = 0; i < MAX_N; i++ ) {
    if ( i >= uN ) break;
    float t = t0 + ( float( i ) + j ) * dt;
    vec3 p = ro + rd * t;
    vec2 uv = uUv.xy + p.x * uUv.zw + p.y * uUvY;
    if ( uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0 ) continue;
    float N = texture2D( uCols, ( p.xy - uColAt.xy ) * uColAt.zw ).r;
    if ( N <= ${SHAPE.minColumn.toExponential(1)} ) continue;
    // the emissivity (reflection.js emissivity): the slab's density times the starlight here, and the lighting star
    float u = ( p.z - slabAt( p.xy ) ) / uSlab.z;
    float D = exp( -u * u );
    if ( D < 1e-4 ) continue;
    float I = 0.0;
    vec3 st = vec3( 0.0 );
    for ( int k = 0; k < MAX_STARS; k++ ) {
      if ( k >= uStarN ) break;
      vec3 d = p - uStars[ k ].xyz;
      float w = uStars[ k ].w / ( dot( d, d ) + uSlab.x );
      I += w;
      st += w * uStars[ k ].xyz;
    }
    float w = D * I / N * dt * smoothstep( 0.0, uSlab.w, t );
    if ( abs( uPhase.x ) > 1e-4 ) {
      vec3 il = normalize( p - st / I );
      w *= clamp( hg( -dot( il, rd ), uPhase.x ) / hg( il.z, uPhase.x ), uPhase.y, uPhase.z );
    }
    col += stretchLight( texture2D( uLight, uv ).rgb ) * coverAt( uv, uEdge ) * w;
  }
  float y = dot( col, vec3( 0.2126, 0.7152, 0.0722 ) );
  if ( y > uPeak ) col *= uPeak / y;     // never brighter than the photograph's own brightest
  col *= uGain * uShare;
  float mx = max( col.r, max( col.g, col.b ) );
  if ( mx > ${f3(SHAPE.shoulder)} ) col *= ( ${f3(SHAPE.shoulder)} + ( 1.0 - exp( -( mx - ${f3(SHAPE.shoulder)} ) ) ) * 0.5 ) / mx;
  gl_FragColor = vec4( col, 1.0 );   // additive (SrcAlpha, One): alpha 1
}
`;

/** The shader sources, for tests/test_hero_r14neb.mjs (marchJs mirrors FRAG). */
export const SHADERS = { vertex: VERT, fragment: FRAG };

// ------------------------------------------------------------------------------------------- the hero

const fileUrl = (path) => `../../../${String(path || '').replace(/^site\//, '')}`;

export function createHero(THREE, env = {}) {
  const profile = env.profile || {};
  const id = profile.id || 'reflection';
  const group = new THREE.Group();
  group.name = `deep-hero-${id}`;
  const g = geometryOf(profile);
  const sky = new THREE.Group();
  sky.name = `${group.name}-sky`;
  sky.matrixAutoUpdate = false;
  group.add(sky);
  let basisFor = null;

  const li = part(profile, 'light');
  const browser = typeof document !== 'undefined';
  let lightState = 'none', lightTex = null;
  if (browser && THREE.TextureLoader && li.file) { lightState = 'loading'; lightTex = loadMap(THREE, fileUrl(li.file), (st) => { lightState = st; }); }
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
  blank.needsUpdate = true;
  // the columns along our line, tabulated once (half floats, filtered linearly)
  const cmap = columnMap(g);
  const half = new Uint16Array(cmap.data.length * 4);
  // half floats hold the column scaled to its own largest (the stars' light below takes the same scale: e / N is kept)
  const pal0 = paletteFor(1, profile);
  let maxCol = 0;
  for (const v of cmap.data) maxCol = Math.max(maxCol, v);
  for (let i = 0; i < cmap.data.length; i++) half[4 * i] = THREE.DataUtils.toHalfFloat(cmap.data[i] / (maxCol || 1));
  const colTex = new THREE.DataTexture(half, cmap.n, cmap.n, THREE.RGBAFormat, THREE.HalfFloatType);
  colTex.colorSpace = THREE.NoColorSpace;
  colTex.minFilter = colTex.magFilter = THREE.LinearFilter;
  colTex.wrapS = colTex.wrapT = THREE.ClampToEdgeWrapping;
  colTex.generateMipmaps = false;
  colTex.needsUpdate = true;

  const { min, max } = g.box;
  const geo = new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  geo.translate((max[0] + min[0]) / 2, (max[1] + min[1]) / 2, (max[2] + min[2]) / 2);
  const stars = Array.from({ length: MAX_STARS }, (_, i) => { const s = g.stars[i]; return s ? new THREE.Vector4(s.pos[0], s.pos[1], s.pos[2], s.lum / (maxCol || 1)) : new THREE.Vector4(0, 0, 0, 0); });
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, transparent: false, depthTest: false, depthWrite: false, toneMapped: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uCam: { value: new THREE.Vector3(0, 0, 50) }, uBoxMin: { value: new THREE.Vector3(...min) }, uBoxMax: { value: new THREE.Vector3(...max) },
      uStars: { value: stars }, uStarN: { value: g.stars.length },
      uSlab: { value: new THREE.Vector4(g.soft * g.soft, g.front, g.h, g.nearLy) },
      uPhase: { value: new THREE.Vector3(...(g.phase ? [g.phase.g, g.phase.lo, g.phase.hi] : [0, 1, 1])) },
      uUv: { value: new THREE.Vector4(g.uv.u0, g.uv.v0, g.uv.ux[0], g.uv.ux[1]) }, uUvY: { value: new THREE.Vector2(g.uv.uy[0], g.uv.uy[1]) },
      uEdge: { value: new THREE.Vector2(...g.edge) }, uLight: { value: lightTex || blank }, uCols: { value: colTex },
      uColAt: { value: new THREE.Vector4(cmap.min[0], cmap.min[1], 1 / cmap.size[0], 1 / cmap.size[1]) },
      uN: { value: 16 }, uJit: { value: 1 }, uPeak: { value: g.peak ** pal0.gamma }, uShare: { value: 0 }, uGain: { value: 1 },
      uGamma: { value: pal0.gamma }, uSat: { value: pal0.saturation },
    },
  });
  mat.name = `deep-${id}-light`;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = `${group.name}-shells`; // the contract's draw-order check knows a deep mesh by `-shells`
  mesh.frustumCulled = false;
  mesh.renderOrder = -0.9;
  sky.add(mesh);

  let level = 0, levelShare = 0, tierNow = 1, samples = 16, palette = { ...pal0, gainIn: 1 }, last = { gas: 0, light: 1, photo: 0 };
  const _inv = new THREE.Matrix4(), _id = new THREE.Matrix4(), _cam = new THREE.Vector3();
  return {
    group,
    levels: [2, 3],
    card: { copy: COPY_BLOCK, drawn: { [profile.record]: (profile.drawn || DRAWN).slice() } },
    setLevel(n, share = 1) {
      level = n;
      levelShare = n >= 2 ? clamp(share, 0, 1) : 0;
      group.visible = levelShare > 0;
    },
    frame(info = {}) {
      if (basisFor !== stage.worldId) { basisFor = stage.worldId; placeSkyGroup(THREE, sky, env.record); }
      const tier = Number.isFinite(info.tier) ? info.tier : 1;
      tierNow = tier;
      const q = typeof env.quality === 'function' ? env.quality() || {} : {};
      samples = samplesFor({ tier, steps: info.steps, cheap: !!q.latched });
      const vh = (typeof globalThis.innerHeight === 'number' && globalThis.innerHeight) || 800;
      const sh = sharesFor({ level: levelShare, rPx: info.rPx, photo: info.photo, viewH: vh });
      last = { ...sh, photo: Number(info.photo) || 0 };
      const gain = Number.isFinite(info.gain) ? info.gain : 1;
      const u = mat.uniforms;
      if (gain !== palette.gainIn) {
        palette = { ...paletteFor(gain, profile), gainIn: gain };
        u.uGamma.value = palette.gamma; u.uSat.value = palette.saturation; u.uPeak.value = g.peak ** palette.gamma;
      }
      const look = info.look || 'film';
      u.uShare.value = lightState === 'ready' || !browser ? sh.gas * (drawnUnder(look, UNDER_MEASURED.light) ? 1 : 0) : 0;
      u.uGain.value = palette.gain * sh.light;
      u.uN.value = samples;
      u.uJit.value = samples > 6 ? 1 : 0;
      mesh.visible = u.uShare.value > 0.002;
      if (info.camera) u.uCam.value.copy(cameraInSky(group, sky, info.camera, _cam, _inv, _id));
    },
    ready: () => lightState !== 'loading',
    stats: () => ({
      level, share: Math.round(last.gas * 100) / 100, photo: Math.round(last.photo * 100) / 100, light: lightState, samples, tier: tierNow,
      palette: palette.mode, stars: g.stars.length, meshes: 1, textures: (lightTex ? 1 : 0) + 1,
      bytes: geo.getAttribute('position').array.byteLength + half.byteLength + (lightTex ? Math.round(512 * 512 * 4 * 4 / 3) : 0),
      camLy: [Math.round(_cam.x * 100) / 100, Math.round(_cam.y * 100) / 100, Math.round(_cam.z * 100) / 100],
    }),
    dispose() {
      geo.dispose(); mat.dispose(); colTex.dispose(); blank.dispose();
      if (lightTex) lightTex.dispose();
      if (group.parent) group.parent.remove(group);
    },
  };
}

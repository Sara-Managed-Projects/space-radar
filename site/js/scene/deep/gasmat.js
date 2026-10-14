// scene/deep/gasmat.js -- light and gas computed inside an object's own mesh (internal spec 0075 task 8,
// requirement 12, design section 7). Loaded with scene/deep/deepsky.js, never at boot.
//
// Contract:
//   UNDER_MEASURED, COLOUR_POLICY, KINDS, MAX_STEPS
//   marchSteps({tier, top, latched, scaleStep, frameMs, rPx, selected}) -> steps (0: shells, no march)
//   holderSteps({tier, latched}) -> steps for a level-1 glow (0: shells)
//   densityJs(kind, r) / columnJs(kind, thickness) / peak2d(kind)    the GLSL's densities, mirrored
//   marchJs({rho, sigma, ds, steps}) -> {C, T}                        the GLSL's integration, mirrored
//   noiseVolume(size, seed) -> Uint8Array (size³, R8)                 a baked value noise, seeded
//   createGasMaterial(THREE, opts) / createShellMaterial(THREE, opts) / createGasMesh(THREE, opts)
//
// THE CONTRACT IT KEEPS (docs/design-language.md, amendment 2026-09-28 §3; tests/test_contract.mjs). No
// render target, no composer, no pass, no bloom, no flare: every pixel of gas is computed by the fragment
// shader of the mesh that bounds it, so only the pixels the object covers pay. The mesh is a low-poly
// sphere scaled to the object's ellipsoid and drawn by its BACK faces; the fragment finds where the
// view ray enters and leaves the ellipsoid analytically (camera outside or inside) and integrates along
// it (the package's §6.4):  T_next = T·exp(−σρΔs),  C += T·ε·ρ·Δs.  Out goes vec4(C, 1 − T):
//   emission       additive (SrcAlpha, One), alpha 1: light adds to what is behind it
//   absorbing gas  premultiplied "over" (One, OneMinusSrcAlpha): dust darkens what was drawn before it
// The step offset is a static per-pixel noise (interleaved gradient noise of the pixel's coordinates):
// no temporal state, nothing to accumulate. Noise in the gas is a baked 3D texture (32³ on T0, 64³ on
// T1 and up), not octaves per ray.
//
// TIERS (design section 5). T0 and the frame latch: no march; the soft profile's column in closed
// form (one draw call, no layers: nested shells banded on a phone, internal #845). T1: 12-16 steps; T2: 24-32; Ultra 48, only for the selected hero at 300 px or more; times
// min(1, r_px / 300). Before the pixel-ratio governor steps down, the steps do (frameMs over 24 ms, or any
// governor step): the hero rule "lower the march before the pixel ratio" (requirement 18).
//
// COLOUR AND ALPHA (DS-A08). The colours handed in are display values (the photographs' convention,
// scene/nebulae.js), the material is toneMapped:false, transparent:false (the sky layers' opaque-list
// rule), and nothing is decoded or re-encoded: COLOUR_POLICY below, held for every deep material by
// tests/test_gasmat.mjs.

import { drawnUnder, stillUnder } from '../exposure.js';

// Under the Measured look (scene/exposure.js MEASURED_RULES): the profile, place, size and colours are
// the catalogue's and the card's illustration; the noise that breaks a cloud up is generated detail and
// goes; any motion of the gas is held still.
export const UNDER_MEASURED = { noise: 'hidden', drift: 'still' };
export const COLOUR_POLICY = Object.freeze({
  values: 'display',          // sampled and shaded as they look; no sRGB decode, no colorspace_fragment
  toneMapped: false,
  transparent: false,         // in the opaque list (tests/test_contract.mjs DRAWORDER)
  depthWrite: false,
  emission: 'additive',       // THREE.AdditiveBlending, alpha 1
  absorbing: 'premultiplied-over', // THREE.CustomBlending, One / OneMinusSrcAlpha
});
// The profiles of scene/dsoglow.js's KINDS, as densities in a unit sphere.
export const KINDS = { soft: 0, cloud: 1, galaxy: 2, open: 3, globular: 4, shell: 5, remnant: 6 };
export const MAX_STEPS = 48;


/** How many steps a hero's march takes now (design §5). 0 means shells. Pure. */
export function marchSteps({ tier = 1, top = false, latched = false, scaleStep = 0, frameMs = 0, rPx = 0, selected = false } = {}) {
  if (latched || !(tier >= 1)) return 0;
  let [lo, hi] = tier >= 2 ? [24, 32] : [12, 16];
  if (top && selected && rPx >= 300) [lo, hi] = [48, 48];
  let n = Math.max(lo, Math.round(hi * Math.min(1, Math.max(0, rPx) / 300)));
  // Slow frames halve the steps before the governor would lower the pixel ratio; each governor step
  // halves them again.
  const down = Math.max(Math.min(3, Math.max(0, Math.trunc(scaleStep) || 0)), frameMs > 24 ? 1 : 0);
  if (down > 0) n = Math.max(6, Math.round(lo / 2 ** down));
  return Math.min(MAX_STEPS, n);
}

/**
 * A level-1 glow (the coordinator's holder): a smooth profile takes 10 steps; a broken cloud 12; a thin
 * shell (a planetary nebula's ring, a remnant's) 16, or its rings band (the first look, 2026-10-14). Pure.
 */
export function holderSteps({ tier = 1, latched = false, cloud = false, thin = false } = {}) {
  if (latched || !(tier >= 1)) return 0;
  return thin ? 16 : cloud ? 12 : 10;
}

// ------------------------------------------------------------------------- the densities, mirrored

/** The density at radius r (0..1) of a unit sphere, per kind: the GLSL's `density()`. Pure. */
export function densityJs(kind, r) {
  const r2 = r * r;
  if (r >= 1) return 0;
  const edge = 1 - r2;
  switch (kind) {
    case 2: return (0.5 * Math.exp(-5 * r) + 1.6 * Math.exp(-70 * r2)) * edge;
    case 3: return 0.22 * Math.exp(-3.2 * r2) * edge;
    case 4: return (edge * edge) / (1 + r2 / 0.03);
    case 5: { const k = (r - 0.62) / 0.17; return (1.1 * Math.exp(-k * k) + 0.3 * Math.exp(-5 * r2)) * edge; }
    case 6: { const k = (r - 0.8) / 0.07; return (1.6 * Math.exp(-k * k) + 0.12 * Math.exp(-2 * r2)) * edge; }
    default: return Math.exp(-3.2 * r2) * edge;
  }
}

/** The 2D glow's brightness at its centre (scene/dsoglow.js FRAG at r = 0), per kind. Pure. */
export function peak2d(kind) {
  return [1, 1, 2.1, 0.22, 1.7, 0.3 + 1.1 * Math.exp(-((0.62 / 0.17) ** 2)), 0.12][kind] ?? 1;
}

/** The column through the centre along the shortest axis, in units of the largest radius. Pure. */
export function columnJs(kind, thickness = 1, n = 400) {
  let c = 0;
  for (let i = 0; i < n; i++) c += densityJs(kind, Math.abs(-1 + (2 * (i + 0.5)) / n)) * (2 / n);
  return c * thickness;
}

/** The march, as the fragment shader does it, over densities `rho[]` (one per step). Pure. */
export function marchJs({ rho = [], sigma = 0, ds = 0.1 } = {}) {
  let T = 1, C = 0;
  for (const p of rho) {
    C += T * p * ds;
    T *= Math.exp(-sigma * p * ds);
    if (T < 0.02) break;
  }
  return { C, T };
}

const erfJs = (x) => {
  const sg = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  return sg * (1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x));
};
/** The T0 shader's closed-form column of the soft profile from s0 to s1 at impact b2. Pure. */
export function softColumnJs(b2, s0, s1) {
  const k = 3.2, sk = Math.sqrt(k);
  const i0 = 0.5 * Math.sqrt(Math.PI / k) * (erfJs(sk * s1) - erfJs(sk * s0));
  const i2 = (0.5 / k) * i0 - (0.5 / k) * (s1 * Math.exp(-k * s1 * s1) - s0 * Math.exp(-k * s0 * s0));
  return Math.exp(-k * b2) * ((1 - b2) * i0 - i2);
}
/** A holder's shaping (the GLSL's holderShape): E² outside, and only near-centre rays from inside. Pure. */
export function holderShapeJs(E, ro, rd) {
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const tc = Math.max(0, -(ro[0] * rd[0] + ro[1] * rd[1] + ro[2] * rd[2]));
  const dmin = Math.hypot(ro[0] + rd[0] * tc, ro[1] + rd[1] * tc, ro[2] + rd[2] * tc);
  const inside = 1 - sm(0.85, 1, Math.hypot(...ro));
  const centre = 1 - sm(0, 0.6, dmin);
  const shaped = E * E;
  return shaped + (shaped * centre * centre - shaped) * inside;
}

/** A tileable value noise baked into size³ bytes, seeded (mulberry32): the same volume every run. Pure. */
export function noiseVolume(size = 32, seed = 20261015) {
  let a = seed >>> 0;
  const rand = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const g = 8; // lattice cells per side
  const lat = new Float32Array(g * g * g).map(() => rand());
  const L = (x, y, z) => lat[((z % g) * g + (y % g)) * g + (x % g)];
  const s = (t) => t * t * (3 - 2 * t);
  const out = new Uint8Array(size * size * size);
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0, amp = 0.6, f = g / size;
    for (let o = 0; o < 2; o++) {
      const px = x * f, py = y * f, pz = z * f;
      const ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
      const fx = s(px - ix), fy = s(py - iy), fz = s(pz - iz);
      const lerp = (a1, b1, t) => a1 + (b1 - a1) * t;
      const c00 = lerp(L(ix, iy, iz), L(ix + 1, iy, iz), fx), c10 = lerp(L(ix, iy + 1, iz), L(ix + 1, iy + 1, iz), fx);
      const c01 = lerp(L(ix, iy, iz + 1), L(ix + 1, iy, iz + 1), fx), c11 = lerp(L(ix, iy + 1, iz + 1), L(ix + 1, iy + 1, iz + 1), fx);
      v += amp * lerp(lerp(c00, c10, fy), lerp(c01, c11, fy), fz);
      amp *= 0.66; f *= 2;
    }
    out[(z * size + y) * size + x] = Math.max(0, Math.min(255, Math.round((v / 0.996) * 255)));
  }
  return out;
}

// ------------------------------------------------------------------------------------- the GLSL

const DENSITY_GLSL = /* glsl */ `
float density( vec3 p ) {
  float r2 = dot( p, p );
  if ( r2 >= 1.0 ) return 0.0;
  float r = sqrt( r2 );
  float edge = 1.0 - r2;
  int kind = int( uKind + 0.5 );
  if ( kind == 2 ) return ( 0.5 * exp( -5.0 * r ) + 1.6 * exp( -70.0 * r2 ) ) * edge;
  if ( kind == 3 ) return 0.22 * exp( -3.2 * r2 ) * edge;
  if ( kind == 4 ) return edge * edge / ( 1.0 + r2 / 0.03 );
  if ( kind == 5 ) { float k = ( r - 0.62 ) / 0.17; return ( 1.1 * exp( -k * k ) + 0.3 * exp( -5.0 * r2 ) ) * edge; }
  if ( kind == 6 ) { float k = ( r - 0.8 ) / 0.07; return ( 1.6 * exp( -k * k ) + 0.12 * exp( -2.0 * r2 ) ) * edge; }
  return exp( -3.2 * r2 ) * edge;
}
`;

const COMMON_GLSL = /* glsl */ `
precision highp sampler3D;
uniform vec3 uCamObj;     // the camera in the object's own unit sphere (CPU, float64, each frame)
uniform mat3 uObjLen;     // object -> physical lengths, in units of the object's largest radius
uniform vec3 uColour;     // display values (COLOUR_POLICY)
uniform float uKind;
uniform float uGain;      // the exposure's faint-light gain (scene/exposure.js milkyWay)
uniform float uShare;     // how much of it is drawn: the cross-fade with the glow and the photograph
uniform float uNorm;      // so the column through the centre matches the 2D glow it takes over from
uniform float uSigma;     // extinction per unit density per radius; 0 for pure emission
uniform float uNoiseAmp;  // 0 under the Measured look (UNDER_MEASURED.noise)
uniform float uTime;      // frozen under ?look=1, reduced motion and Measured (UNDER_MEASURED.drift)
uniform float uSeed;
uniform float uHolder;    // 1: a holder (holderShape), 0: a hero's own gas
uniform sampler3D uNoise;
varying vec3 vObj;
${DENSITY_GLSL}
float gasNoise( vec3 p ) {
  return texture( uNoise, p * 0.45 + 0.5 + vec3( uSeed, uSeed * 0.37, uTime ) ).r;
}
float rhoAt( vec3 p ) {
  float rho = density( p );
  if ( uNoiseAmp > 0.0 && rho > 0.0 ) rho *= mix( 1.0, 0.25 + 1.5 * gasNoise( p ), uNoiseAmp );
  return rho;
}
// A HOLDER (scene/deep/deepsky.js) is an illustration standing in for an object until its hero
// exists, and it must not veil the view (review of public #1178, 2026-10-14): its light is the column's
// SQUARE, so the outskirts fall away and the dense middle stays; and from INSIDE it, only a ray that
// passes near the centre carries any (the closest approach of the forward ray), so the camera in a
// galaxy sees its bright middle and no screen-wide haze over the side the panels are on.
float holderShape( float E, vec3 ro, vec3 rd ) {
  float tc = max( 0.0, -dot( ro, rd ) );
  float dmin = length( ro + rd * tc );
  float inside = 1.0 - smoothstep( 0.85, 1.0, length( ro ) );
  float centre = 1.0 - smoothstep( 0.0, 0.6, dmin );
  float shaped = E * E;
  return mix( shaped, shaped * centre * centre, inside );
}
vec4 gasOut( float C, float T, vec3 ro, vec3 rd ) {
  float E = C * uNorm;
  if ( uHolder > 0.5 ) E = holderShape( E, ro, rd );
  E *= uGain * uShare;
  // a soft shoulder, so an edge-on disc is bright and not a white bar (no tone mapping here)
  vec3 col = uColour * ( E / ( 1.0 + 0.35 * E ) ) * 0.34;
#ifdef GAS_ABSORB
  return vec4( col, 1.0 - T );   // premultiplied over: what is behind is kept by T
#else
  return vec4( col, 1.0 );       // additive (SrcAlpha, One): alpha 1, or the light is multiplied away
#endif
}
`;

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

const MARCH_FRAG = /* glsl */ `
uniform int uSteps;
${COMMON_GLSL}
#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  if ( uShare <= 0.0 ) discard;
  vec3 ro = uCamObj;
  vec3 rd = normalize( vObj - ro );
  float b = dot( ro, rd );
  float h = b * b - ( dot( ro, ro ) - 1.0 );
  if ( h <= 0.0 ) discard;
  h = sqrt( h );
  float t0 = max( 0.0, -b - h );
  float t1 = -b + h;
  if ( t1 <= t0 ) discard;
  float lenScale = length( uObjLen * rd );
  float dt = ( t1 - t0 ) / float( uSteps );
  // a static per-pixel offset (interleaved gradient noise): no banding, no temporal state
  float jitter = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
  float T = 1.0;
  float C = 0.0;
  for ( int i = 0; i < ${MAX_STEPS}; i++ ) {
    if ( i >= uSteps ) break;
    vec3 p = ro + rd * ( t0 + ( float( i ) + jitter ) * dt );
    float rho = rhoAt( p );
    float ds = dt * lenScale;
    C += T * rho * ds;
    T *= exp( -uSigma * rho * ds );
    if ( T < 0.02 ) break;
  }
  gl_FragColor = gasOut( C, T, ro, rd );
}
`;

// T0 and the latch: no march and NO LAYERS. Nested shells banded on a phone (the look of 2026-10-14,
// internal #845), so the soft profile exp(-3.2 r²)(1 - r²) is integrated along the ray in closed form,
// once per pixel on the bounding sphere's back faces: the same smooth column the march approximates, with
// nothing in it that could show as a ring. (A kind's finer shape, a ring or a nucleus, waits for T1.)
const SOFT_FRAG = /* glsl */ `
${COMMON_GLSL}
#include <common>
#include <logdepthbuf_pars_fragment>
float erfA( float x ) { // Abramowitz and Stegun 7.1.26, |error| < 1.5e-7
  float s = sign( x );
  x = abs( x );
  float t = 1.0 / ( 1.0 + 0.3275911 * x );
  float y = 1.0 - ( ( ( ( 1.061405429 * t - 1.453152027 ) * t + 1.421413741 ) * t - 0.284496736 ) * t + 0.254829592 ) * t * exp( -x * x );
  return s * y;
}
// The integral of exp(-k (b2 + s²)) (1 - b2 - s²) ds from s0 to s1, k = 3.2: softColumnJs mirrors it.
float softColumn( float b2, float s0, float s1 ) {
  float k = 3.2;
  float sk = sqrt( k );
  float i0 = 0.5 * sqrt( PI / k ) * ( erfA( sk * s1 ) - erfA( sk * s0 ) );
  float i2 = 0.5 / k * i0 - 0.5 / k * ( s1 * exp( -k * s1 * s1 ) - s0 * exp( -k * s0 * s0 ) );
  return exp( -k * b2 ) * ( ( 1.0 - b2 ) * i0 - i2 );
}
void main() {
  #include <logdepthbuf_fragment>
  if ( uShare <= 0.0 ) discard;
  vec3 ro = uCamObj;
  vec3 rd = normalize( vObj - ro );
  float tc = -dot( ro, rd );
  float b2 = dot( ro, ro ) - tc * tc;
  if ( b2 >= 1.0 ) discard;
  float h = sqrt( 1.0 - b2 );
  float s0 = max( -h, -tc );      // the camera is at s = -tc: nothing behind it counts
  if ( h <= s0 ) discard;
  float C = max( 0.0, softColumn( b2, s0, h ) ) * length( uObjLen * rd );
  gl_FragColor = gasOut( C, 1.0, ro, rd );
}
`;

let noiseTex = null;
let noiseSize = 0;
/** The shared 3D noise: 32³ (33 kB) on T0, 64³ (262 kB) above; built once per size. */
export function noiseTexture(THREE, size = 64) {
  if (noiseTex && noiseSize === size) return noiseTex;
  if (noiseTex) noiseTex.dispose();
  const tex = new THREE.Data3DTexture(noiseVolume(size), size, size, size);
  tex.format = THREE.RedFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  noiseTex = tex;
  noiseSize = size;
  return tex;
}
export function disposeNoise() { if (noiseTex) noiseTex.dispose(); noiseTex = null; noiseSize = 0; }

function uniformsFor(THREE, opts) {
  return {
    uCamObj: { value: new THREE.Vector3(0, 0, 3) },
    uObjLen: { value: new THREE.Matrix3() },
    uColour: { value: new THREE.Color().setRGB(...(opts.colour || [1, 1, 1]), THREE.NoColorSpace) },
    uKind: { value: Number(opts.kind) || 0 },
    uGain: { value: 1 },
    uShare: { value: 0 },
    uNorm: { value: 1 },
    uSigma: { value: Number(opts.sigma) || 0 },
    uNoiseAmp: { value: 0 },
    uTime: { value: 0 },
    uSeed: { value: Number(opts.seed) || 0 },
    uHolder: { value: opts.holder ? 1 : 0 },
    uNoise: { value: opts.noise || null },
  };
}

function blendingFor(THREE, opts, material) {
  // The two blends need two alphas (gasOut): 1 - T for "over", 1 for additive. Found by the first
  // look (2026-10-14): additive with alpha 1 - T = 0 drew every holder black.
  if (opts.absorbing) material.defines = { ...(material.defines || {}), GAS_ABSORB: '' };
  if (opts.absorbing) {
    material.blending = THREE.CustomBlending;
    material.blendSrc = THREE.OneFactor;
    material.blendDst = THREE.OneMinusSrcAlphaFactor;
  } else material.blending = THREE.AdditiveBlending;
  return material;
}

/** The march. `opts`: {colour, kind, sigma, absorbing, depthTest, noise, seed, steps}. */
export function createGasMaterial(THREE, opts = {}) {
  const m = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: MARCH_FRAG,
    uniforms: { ...uniformsFor(THREE, opts), uSteps: { value: Math.max(1, Math.min(MAX_STEPS, opts.steps || 8)) } },
    transparent: COLOUR_POLICY.transparent, depthTest: !!opts.depthTest, depthWrite: COLOUR_POLICY.depthWrite,
    toneMapped: COLOUR_POLICY.toneMapped, side: THREE.BackSide,
  });
  m.name = 'deep-gas';
  return blendingFor(THREE, opts, m);
}

/** T0 and the latch: the soft column in closed form, the same uniforms, no loop and no layers. */
export function createSoftMaterial(THREE, opts = {}) {
  const m = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: SOFT_FRAG,
    uniforms: uniformsFor(THREE, opts),
    transparent: COLOUR_POLICY.transparent, depthTest: !!opts.depthTest, depthWrite: COLOUR_POLICY.depthWrite,
    toneMapped: COLOUR_POLICY.toneMapped, side: THREE.BackSide,
  });
  m.name = 'deep-gas-soft';
  return blendingFor(THREE, opts, m);
}
/** The T0 fallback's first name (design §7 called it shells); kept so callers and tests still find it. */
export const createShellMaterial = createSoftMaterial;

// The bounding sphere: an icosahedron's faces lie inside the sphere through its vertices, so it is
// drawn a little larger and the fragment's own intersection says where the sphere really is.
const OUTSET = 1.09;
let sphereGeo = null;
function boundingGeometry(THREE) {
  if (!sphereGeo) sphereGeo = new THREE.IcosahedronGeometry(OUTSET, 2);
  return sphereGeo;
}
/**
 * One volume: a mesh whose world matrix maps the unit sphere onto the object's ellipsoid (in scene
 * units). `march` false draws the soft column in closed form (T0, the latch). Returns {mesh, material, setCamera(camera), setLook(look,
 * reduced, frozen), setSteps(n), dispose()}.
 */
export function createGasMesh(THREE, opts = {}) {
  const march = opts.march !== false;
  const material = march ? createGasMaterial(THREE, opts) : createSoftMaterial(THREE, opts);
  const mesh = new THREE.Mesh(boundingGeometry(THREE), material);
  mesh.name = opts.name || 'deep-gas';
  mesh.frustumCulled = false; // the coordinator decides what is in view; the camera may be inside it
  mesh.renderOrder = Number.isFinite(opts.renderOrder) ? opts.renderOrder : -1; // with the deep-sky glows
  const _inv = new THREE.Matrix4();
  const _cam = new THREE.Vector3();
  let clock = 0;
  return {
    mesh, material, march,
    /** The camera in object space and the lengths along a ray, from the mesh's world matrix. */
    setCamera(camera, radiusScene) {
      mesh.updateMatrixWorld();
      _inv.copy(mesh.matrixWorld).invert();
      _cam.copy(camera.position).applyMatrix4(_inv);
      material.uniforms.uCamObj.value.copy(_cam);
      const len = material.uniforms.uObjLen.value.setFromMatrix4(mesh.matrixWorld);
      if (radiusScene > 0) len.multiplyScalar(1 / radiusScene);
    },
    /** The look (scene/exposure.js): noise only under Film, time held under Measured, ?look=1, reduced motion. */
    setLook(look, { reduced = false, frozen = false, dtMs = 0 } = {}) {
      material.uniforms.uNoiseAmp.value = opts.noisy && drawnUnder(look, UNDER_MEASURED.noise) ? 1 : 0;
      const still = frozen || reduced || stillUnder(look, UNDER_MEASURED.drift);
      // At most 1 % of a feature's size a minute (design §7): the noise lattice drifts that slowly.
      if (!still) clock += (dtMs / 60000) * 0.01;
      material.uniforms.uTime.value = clock;
    },
    setSteps(n) { if (march) material.uniforms.uSteps.value = Math.max(1, Math.min(MAX_STEPS, Math.round(n))); },
    dispose() { material.dispose(); if (mesh.parent) mesh.parent.remove(mesh); },
  };
}

/** The shader sources, for tests/test_gasmat.mjs (the densities above are mirrored from these). */
export const SHADERS = { vertex: VERT, march: MARCH_FRAG, shell: SOFT_FRAG, soft: SOFT_FRAG, density: DENSITY_GLSL };

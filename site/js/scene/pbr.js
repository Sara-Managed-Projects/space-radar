// Real models in their own materials: the physically based look (release 1.3.0, internal #967).
//
// WHY. Every loaded spacecraft went through the toon ramp of scene/models.js: three flat steps of
// light, whatever the surface. That ramp is right for the procedural shapes, which are drawings, and
// it flattened the files that are not: crinkled gold blanket, bare aluminium, white beta cloth and
// cells under glass all came out as the same flat tone with one highlight. Release 1.3.0 wave 1 met
// the limit head on: SLIM (public #1134) was rebuilt with every feature JAXA's model shows and still
// read as "a yellow box", and Gaia's sunshield washed pale in full Sun.
//
// WHAT. A model whose file carries real materials -- each part named for its surface by
// scripts/bake-own-colours.mjs or the model builders (`body`, `foil`, `solar-panel`) and painted in
// its own colours -- is drawn with three.js's MeshStandardMaterial: metalness and roughness per
// surface, lit by the same Sun direction, the same world's light and the same world's shadow as the
// toon models, tone mapped once by the renderer as everything else is. Two more things the ramp
// could not carry: crinkled foil (a height field of small flat facets, bump mapped) and the grid of a
// solar array. Both are worked out in the material from the model's own coordinates, because the
// files carry no texture coordinates (the bake removes them).
//
// WHAT IS MEASURED AND WHAT IS OURS. The geometry and the colours are the files' own (measured or
// read off photographs, as each registry row says). The surface each colour is (gold blanket, white
// cloth, cells) is READ from its part's name and its colour by `finishOf` below, and the metalness and
// roughness of each finish are typical values for that kind of surface, chosen by this project:
// modelled, not measured on the craft. The folds and the cell grid are ILLUSTRATIVE: drawn at a size
// the eye can read at the app's framing (CRINKLE_PERIODS, GRID_PERIODS across the model), not the size
// of the real folds or cells. The fill light (FILL) is ours too, as the toon ramp's shade step was:
// in space the side of a craft away from the Sun and the world is black, and a model nobody can see
// says nothing.
//
// THE CONTRACT (tests/test_contract.mjs). No pass after the frame, no render target, no environment
// map baked on the GPU: the environment is computed in the material itself (`srEnv` below), from the
// only three things in a spacecraft's sky -- the Sun (the scene's one directional light), the world
// beside it (its disc, lit by its phase, as planet-shine already is) and black space with our small
// fill. The crinkle's height field is made once on the CPU (crinkleTexture, 128 x 128, 32 kB).
//
// TIERS. Tier 0 keeps the toon look; tiers 1 and 2 get this one, and the frame-rate latch takes it
// off again (wantPbr: the same switch as the models' surface terms, which scene/heroes.js sets every
// frame). Each part carries both materials and changes between them on the frame after the switch
// moves (pairLooks), so a device that drops to the plain look drops these too.
//
// THE SWITCH PER MODEL. registry/models.yaml `look: pbr | toon` on a `real_models` row, generated into
// data/modellooks.js (scripts/gen_model_looks_js.py). A row without one gets `pbr` when its file
// carries real materials (lookOf below) and `toon` otherwise: the older NASA files whose parts have
// no surface names, the palette files, the textured worlds.
import * as THREE from '../../vendor/three.module.min.js';
import { lightUniforms, surfaceTermsOn, SUN_ANGULAR_RADIUS, NIGHT_FLOOR, SUN_RIM_EXPONENT } from './models.js';
import { AIR_TINT_GLSL } from './airtint.js';

// UNDER THE MEASURED LOOK (scene/exposure.js MEASURED_RULES, tests/test_look_setting.mjs). The folds and the cell grid
// (and the cells' small unevenness, `srVar`) are illustrative detail on a model's own surface, not weather or grain laid
// over a world: they stay drawn the same, as the model's shape and colours do. Said here so a look that hides them is
// one line to change.
export const UNDER_MEASURED = { folds: 'same', grid: 'same' };

/** The two looks a real model can wear. */
export const LOOKS = ['pbr', 'toon'];

/**
 * Which look a file gets. `stated` is its registry row's `look:` (data/modellooks.js), or nothing.
 * Without one, a file carries real materials when its colours are its own (colourRoute 'own') and its
 * parts are named for their surfaces. A body with a map of its surface (Ceres, Vesta) is a world
 * drawn on the smooth ramp, never this.
 * @param {{stated?: string, route?: string, roles?: boolean, surface?: boolean}} o
 */
export function lookOf({ stated = null, route = 'class', roles = false, surface = false } = {}) {
  if (surface) return 'toon';
  if (LOOKS.includes(stated)) return stated;
  return route === 'own' && roles ? 'pbr' : 'toon';
}

/** A part named for its surface, as scripts/bake-own-colours.mjs and the builders name them. */
export function roleOf(name) {
  const n = String(name || '');
  return /panel|solar|array|cells/i.test(n) ? 'panel' : /foil|mli|kapton|blanket/i.test(n) ? 'foil' : /body/i.test(n) ? 'body' : null;
}

// --------------------------------------------------------------------------- the finishes

/**
 * THE FINISHES. What each kind of surface is in metalness and roughness (three.js's metallic-roughness
 * model, glTF's), the strength of its folds and whether it carries a cell grid. Ours: typical values
 * for each kind of surface, not measurements of any craft.
 *   gold-foil      aluminised Kapton seen through its amber film: a metal, crinkled. Partly metallic
 *                  (0.7), because a blanket crumpled finer than a pixel throws some light back in
 *                  every direction, which a single smooth metal would not.
 *   silver-foil    aluminised blanket or tape, crinkled.
 *   white-cloth    beta cloth and white blanket: a woven glass fabric, matt, softly folded.
 *   black-blanket  carbon-loaded Kapton and black beta cloth: dark, a soft sheen, folded.
 *   foil           a blanket of another colour (copper, blue): between metal and cloth.
 *   cells          cells under cover glass: a dielectric with a sharp highlight, and the grid.
 *   array-back     the back of an array or its Kapton substrate: orange-brown film, a soft sheen.
 *   frame          an array's silver frame and hinges: bare metal.
 *   white-paint    white thermal paint (radiators, the white skin of a module).
 *   bare-metal     unpainted aluminium and titanium structure, struts, nozzles.
 *   dark           black paint, anodised parts, openings.
 *   paint          any other painted colour.
 *   gold-body      a gold part the builder named structure (a gold rim, a gilded box).
 */
export const FINISHES = {
  'gold-foil': { metalness: 0.7, roughness: 0.42, crinkle: 1.0, grid: false },
  'silver-foil': { metalness: 0.75, roughness: 0.36, crinkle: 1.0, grid: false },
  'white-cloth': { metalness: 0.0, roughness: 0.72, crinkle: 0.45, grid: false },
  'black-blanket': { metalness: 0.0, roughness: 0.5, crinkle: 0.7, grid: false },
  foil: { metalness: 0.45, roughness: 0.45, crinkle: 0.8, grid: false },
  cells: { metalness: 0.0, roughness: 0.2, crinkle: 0.0, grid: true },
  'array-back': { metalness: 0.1, roughness: 0.5, crinkle: 0.0, grid: false },
  frame: { metalness: 0.6, roughness: 0.4, crinkle: 0.0, grid: false },
  'white-paint': { metalness: 0.0, roughness: 0.58, crinkle: 0.0, grid: false },
  'bare-metal': { metalness: 0.55, roughness: 0.42, crinkle: 0.0, grid: false },
  dark: { metalness: 0.0, roughness: 0.5, crinkle: 0.0, grid: false },
  paint: { metalness: 0.0, roughness: 0.55, crinkle: 0.0, grid: false },
  'gold-body': { metalness: 0.6, roughness: 0.4, crinkle: 0.0, grid: false },
};

/** Hue (degrees), saturation (0..1, HSV) and value (0..1) of a #rrggbb colour, as written (sRGB). */
export function hsvOf(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return { h: 0, s: 0, v: 0 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return { h: (h + 360) % 360, s: max > 0 ? d / max : 0, v: max };
}

/**
 * Which finish a part is, from its surface role and its colour. Pure; tests/test_pbr.mjs holds it to
 * the colours the shipped files use (ISS, Hubble, Webb, Gaia, Tiangong, the landers).
 * @param {'body'|'foil'|'panel'|null} role
 * @param {string} hex '#rrggbb'
 */
export function finishOf(role, hex) {
  const { h, s, v } = hsvOf(hex);
  const golden = h >= 18 && h <= 62 && s >= 0.3 && v >= 0.35;
  const grey = s < 0.16;
  if (role === 'foil') {
    if (v < 0.24) return 'black-blanket';
    if (golden) return 'gold-foil';
    if (grey && v >= 0.86) return 'white-cloth';
    if (s < 0.22 && v >= 0.45) return 'silver-foil';
    if (s < 0.22) return 'black-blanket';
    return 'foil';
  }
  if (role === 'panel') {
    if (golden || (h >= 10 && h <= 40 && s >= 0.3)) return 'array-back';
    if (grey && v >= 0.55) return 'frame';
    return 'cells';
  }
  // Structure (and a part with no role, which only a stated `look: pbr` brings here).
  if (golden && s >= 0.4) return 'gold-body';
  if (grey && v >= 0.8) return 'white-paint';
  if (grey && v >= 0.36) return 'bare-metal';
  if (v < 0.24) return 'dark';
  return 'paint';
}

// --------------------------------------------------------------------------- the light

/**
 * FILL: the radiance of everything in the sky that is not the Sun or the world, as this app draws it.
 * Black space is 0; 0.12 is ours, so a face turned from both is a shape and not a hole (the toon
 * ramp's shade step was 0.35 of the lit colour, which is why the toon models never looked dark).
 * Its tint is the app's sky blue, faint.
 */
export const FILL = 0.12;
export const FILL_TINT = [0.86, 0.92, 1.0];
/** The same faint sky as a mirror sees it, stronger than as a wall does: a metal in a black sky is black
 * wherever the Sun's highlight is not, and the first pictures (2026-10-20) drew Webb's gold mirror and
 * Hubble's silver skin dark brown and slate. 0.35 is ours: a metal then keeps its own colour in shade. */
export const FILL_SPECULAR = 0.35;
/** The world's disc as a mirror sees it: its radiance per unit of models.js's planet-shine colour
 * (albedo x SHINE_GAIN x the world's tint). A Lambertian disc under the Sun lamp of intensity 3 sends
 * albedo x 3 / pi; divided by SHINE_GAIN 1.2 that is 0.8. */
export const WORLD_RADIANCE = 0.8;
/** The faint rim the toon models have (models.js uRim 0.35), at less than half: a silhouette against
 * black space still needs one, a lit metal does not need to glow. Ours. */
export const PBR_RIM = 0.15;
/** How many fold periods and cell periods across the model's longest side. Ours: what reads at the
 * app's close-up framing (a facet of about 20 px when the model fills 800 px: a period holds about seven
 * facets across), not the real size. 40 periods, the first try, drew facets of 3 px, which the screen
 * turned into fine diagonal stripes. */
export const CRINKLE_PERIODS = 6;
export const GRID_PERIODS = 110;
/** The slope of the folds, as a multiple of the height field's own (crinkleTexture: up to 0.35). */
export const CRINKLE_DEPTH = 1.0;

/**
 * THE ENVIRONMENT, in JS: what a mirror at the surface sees along `cosToWorld` (the cosine between its
 * reflected ray and the direction to the world's centre), for a world of angular radius `alpha` and a
 * surface of `roughness`. The shader's srEnv is the same sum. Returns the weight of the world's disc,
 * 0..1; the radiance is that times WORLD_RADIANCE times the world's lit share.
 */
export function worldMirrorWeight(cosToWorld, alpha, roughness) {
  const spread = 0.12 + 1.1 * Math.max(0, Math.min(1, roughness));
  const lo = Math.cos(Math.min(alpha + spread, Math.PI));
  const hi = Math.cos(Math.max(alpha - spread, 0));
  const t = Math.min(1, Math.max(0, (cosToWorld - lo) / Math.max(1e-6, hi - lo)));
  return t * t * (3 - 2 * t);
}

// --------------------------------------------------------------------------- the switch

let mode = 'auto';
/**
 * Which look the models wear: 'auto' (the device's tier: wantPbr), or 'pbr' / 'toon' held for a tool
 * (the look probes photograph a model both ways). Returns the mode now in force.
 */
export function setModelLook(next) {
  mode = next === 'pbr' || next === 'toon' ? next : 'auto';
  return mode;
}
export function modelLook() { return mode; }
/** Tier 1 and up and not latched (models.js surface terms, set by scene/heroes.js every frame). */
export function wantPbr() {
  if (mode === 'pbr') return true;
  if (mode === 'toon') return false;
  return surfaceTermsOn();
}

// Each part's two materials, keyed by either. A WeakMap and not material.userData, because three.js
// copies userData through JSON, and two materials naming each other would never finish.
const TWINS = new WeakMap();
/** The swap, on the frame after the switch moves: three.js calls it with the object being drawn. */
function follow(renderer, scene, camera, geometry, object) {
  const pair = TWINS.get(this);
  if (!pair || !object || object.material !== this) return;
  const want = wantPbr() ? pair.pbr : pair.toon;
  if (want === this) return;
  // The hero layer fades a model in by writing opacity on whatever it wears: carry the fade across.
  want.opacity = this.opacity;
  want.transparent = this.transparent;
  object.material = want;
}
/**
 * Give one part both looks and put on the one the device wants now. A toon material that already has
 * a twin keeps it (two parts of one colour and surface share both materials, as they shared the one),
 * so `make` is called only for a toon material met for the first time. Returns the pair.
 * @param {THREE.Mesh} mesh
 * @param {THREE.Material} toon the part's toon material (realmodels.js applyToon)
 * @param {() => THREE.Material} make builds the physically based one
 */
export function pairLooks(mesh, toon, make) {
  if (!mesh || !toon) return null;
  let pair = TWINS.get(toon);
  if (!pair) {
    const pbr = make();
    if (!pbr) return null;
    pair = { toon, pbr };
    TWINS.set(toon, pair);
    TWINS.set(pbr, pair);
    toon.onBeforeRender = follow;
    pbr.onBeforeRender = follow;
  }
  mesh.material = wantPbr() ? pair.pbr : pair.toon;
  return pair;
}
/** The other look of a material, for the tools; null when it has none. */
export function twinOf(material) {
  const pair = TWINS.get(material);
  return pair ? (pair.pbr === material ? pair.toon : pair.pbr) : null;
}

// --------------------------------------------------------------------------- the folds

// 32-bit integer hash -> [0,1). Deterministic: there is no Math.random in this project.
function hash01(n) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export const CRINKLE_SIZE = 128;
export const CRINKLE_CELLS = 46;
export const CRINKLE_SLOPE = 0.35;
/** The height range the 8-bit field spans, in tile units: the shader multiplies back by it. */
export const CRINKLE_RANGE = 0.12;
/**
 * The folds as numbers: a tileable field of flat facets (each cell of a Voronoi pattern a small
 * tilted plane, so the light breaks at every crease as it does on crumpled blanket) in red, and a
 * smooth tileable patchiness in green (the uneven sheen of a blanket, a few per cent of its colour).
 * Pure, deterministic: tests/test_pbr.mjs holds that it tiles.
 * @returns {Uint8Array} size x size x 2
 */
export function crinkleField(size = CRINKLE_SIZE, cells = CRINKLE_CELLS) {
  const seeds = [];
  for (let i = 0; i < cells; i++) {
    seeds.push({
      x: hash01(i * 7 + 1), y: hash01(i * 7 + 2),
      gx: (hash01(i * 7 + 3) * 2 - 1) * CRINKLE_SLOPE, gy: (hash01(i * 7 + 4) * 2 - 1) * CRINKLE_SLOPE,
      b: (hash01(i * 7 + 5) * 2 - 1) * 0.02,
    });
  }
  // The patchiness: a 6 x 6 lattice of values, smoothly interpolated, wrapping.
  const L = 6;
  const lat = (i, j) => hash01(1000 + ((i + L) % L) * 31 + ((j + L) % L) * 977);
  const smooth = (t) => t * t * (3 - 2 * t);
  const out = new Uint8Array(size * size * 2);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const u = (px + 0.5) / size, v = (py + 0.5) / size;
      let best = Infinity, h = 0;
      for (const s of seeds) {
        let dx = u - s.x, dy = v - s.y;
        dx -= Math.round(dx); dy -= Math.round(dy);   // the nearest copy of the seed on the torus
        const d = dx * dx + dy * dy;
        if (d < best) { best = d; h = s.b + s.gx * dx + s.gy * dy; }
      }
      const fx = u * L, fy = v * L, ix = Math.floor(fx), iy = Math.floor(fy);
      const tx = smooth(fx - ix), ty = smooth(fy - iy);
      const a = lat(ix, iy) + (lat(ix + 1, iy) - lat(ix, iy)) * tx;
      const c = lat(ix, iy + 1) + (lat(ix + 1, iy + 1) - lat(ix, iy + 1)) * tx;
      const k = (py * size + px) * 2;
      out[k] = Math.max(0, Math.min(255, Math.round((h / CRINKLE_RANGE + 0.5) * 255)));
      out[k + 1] = Math.round((a + (c - a) * ty) * 255);
    }
  }
  return out;
}
let crinkleTex = null;
/** The folds' texture, made once (32 kB, mipmapped, repeating). */
export function crinkleTexture() {
  if (crinkleTex) return crinkleTex;
  crinkleTex = new THREE.DataTexture(crinkleField(), CRINKLE_SIZE, CRINKLE_SIZE, THREE.RGFormat, THREE.UnsignedByteType);
  crinkleTex.wrapS = THREE.RepeatWrapping;
  crinkleTex.wrapT = THREE.RepeatWrapping;
  crinkleTex.magFilter = THREE.LinearFilter;
  crinkleTex.minFilter = THREE.LinearMipmapLinearFilter;
  crinkleTex.generateMipmaps = true;
  crinkleTex.needsUpdate = true;
  return crinkleTex;
}

// --------------------------------------------------------------------------- the material

const f4 = (n) => Number(n).toFixed(4);

/** The vertex additions: the part's own coordinates and normal, for the folds and the grid. */
const VERT_PARS = 'varying vec3 vSrPos;\nvarying vec3 vSrNrm;\n';
const VERT_MAIN = '#include <begin_vertex>\nvSrPos = transformed;\nvSrNrm = objectNormal;\n';

const FRAG_PARS = [
  'varying vec3 vSrPos;',
  'varying vec3 vSrNrm;',
  'uniform sampler2D uSrFold;',
  'uniform float uSrFoldScale;',
  'uniform float uSrFoldDepth;',
  'uniform float uSrGridScale;',
  'uniform float uSrFill;',
  'uniform vec3 uSunDir;',
  'uniform vec3 uRimSun;',
  'uniform vec3 uRimShade;',
  'uniform vec3 uShineCentre;',
  'uniform float uShineRadius;',
  'uniform vec3 uShineCol;',
  'uniform float uShadeRadius;',
  'uniform vec3 uNightCol;',
  'uniform float uFlood;',
  'uniform float uSunRim;',
  'uniform float uAirH;',
  AIR_TINT_GLSL,
  // The three planar projections of the part's own coordinates, weighted by its normal.
  'vec3 srTriWeights( vec3 n ) {',
  '  vec3 w = pow( abs( n ), vec3( 6.0 ) );',
  '  return w / max( w.x + w.y + w.z, 1e-5 );',
  '}',
  'vec2 srFold( vec3 p, vec3 w ) {',
  '  return texture2D( uSrFold, p.yz ).rg * w.x + texture2D( uSrFold, p.zx ).rg * w.y + texture2D( uSrFold, p.xy ).rg * w.z;',
  '}',
].join('\n');

/** After the colour, roughness and metalness are read: the patchiness, and the cell grid. */
function fragSurface(f) {
  const lines = ['#include <metalnessmap_fragment>', '{'];
  lines.push('  vec3 srW = srTriWeights( normalize( vSrNrm ) );');
  // A blanket's uneven sheen, a few per cent of its colour; structure a little less.
  lines.push(`  float srPatch = srFold( vSrPos * uSrFoldScale * 0.5, srW ).g;`);
  lines.push(`  diffuseColor.rgb *= ${f4(f.crinkle > 0 ? 0.9 : 0.95)} + ${f4(f.crinkle > 0 ? 0.2 : 0.1)} * srPatch;`);
  if (f.grid) {
    lines.push(
      // The grid on the plane the part mostly faces: cells a little uneven, silver between them, the
      // lines fading out before they are finer than a pixel (no shimmer).
      '  vec3 srA = abs( normalize( vSrNrm ) );',
      '  vec2 srG = ( srA.x > srA.y && srA.x > srA.z ? vSrPos.yz : ( srA.y > srA.z ? vSrPos.zx : vSrPos.xy ) ) * uSrGridScale;',
      '  vec2 srFw = fwidth( srG );',
      '  vec2 srD = abs( fract( srG ) - 0.5 );',
      '  vec2 srL = smoothstep( vec2( 0.44 ) - srFw, vec2( 0.44 ) + srFw, srD );',
      '  float srLine = max( srL.x, srL.y ) * ( 1.0 - smoothstep( 0.12, 0.35, max( srFw.x, srFw.y ) ) );',
      '  vec2 srCell = floor( srG );',
      '  float srVar = fract( sin( dot( srCell, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );',
      '  diffuseColor.rgb *= 0.9 + 0.2 * srVar;',
      '  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.62, 0.64, 0.68 ), srLine * 0.55 );',
      '  metalnessFactor = mix( metalnessFactor, 0.85, srLine );',
      '  roughnessFactor = mix( roughnessFactor, 0.38, srLine );',
    );
  }
  lines.push('}');
  return lines.join('\n');
}

/** The folds: a bump from the height field, its slope the same whatever size the model is drawn. */
const FRAG_FOLDS = [
  '#include <normal_fragment_maps>',
  '#ifdef SR_FOLDS',
  '{',
  '  vec3 srP = vSrPos * uSrFoldScale;',
  '  float srH = srFold( srP, srTriWeights( normalize( vSrNrm ) ) ).r;',
  '  vec3 srDpx = dFdx( - vViewPosition );',
  '  vec3 srDpy = dFdy( - vViewPosition );',
  // View units per fold period along each screen axis: the height is in periods, the bump in view units.
  '  float srSx = length( srDpx ) / max( length( dFdx( srP ) ), 1e-7 );',
  '  float srSy = length( srDpy ) / max( length( dFdy( srP ) ), 1e-7 );',
  `  vec2 srDB = vec2( dFdx( srH ) * srSx, dFdy( srH ) * srSy ) * uSrFoldDepth * ${f4(CRINKLE_RANGE)};`,
  '  vec3 srR1 = cross( srDpy, normal );',
  '  vec3 srR2 = cross( normal, srDpx );',
  '  float srDet = dot( srDpx, srR1 ) * faceDirection;',
  '  vec3 srGrad = sign( srDet ) * ( srDB.x * srR1 + srDB.y * srR2 );',
  '  vec3 srN = abs( srDet ) * normal - srGrad;',
  '  if ( dot( srN, srN ) > 0.0 ) normal = normalize( srN );',
  '}',
  '#endif',
].join('\n');

/** The environment, after three.js's own (it has none here): the fill, and the world's disc and light. */
const FRAG_ENV = [
  '#include <lights_fragment_maps>',
  '{',
  `  vec3 srFill = vec3( ${FILL_TINT.map(f4).join(', ')} ) * uSrFill;`,
  '  irradiance += PI * srFill;',
  `  radiance += vec3( ${FILL_TINT.map(f4).join(', ')} ) * ${f4(FILL_SPECULAR)};`,
  '  if ( uShineRadius > 0.0 ) {',
  '    vec3 L = normalize( ( viewMatrix * vec4( uSunDir, 0.0 ) ).xyz );',
  '    vec3 toC = ( viewMatrix * vec4( uShineCentre, 1.0 ) ).xyz + vViewPosition;',
  '    float dC = max( length( toC ), 1e-9 );',
  '    vec3 D = toC / dC;',
  '    float cover = min( uShineRadius / dC, 1.0 );',
  '    float cA = clamp( dot( -D, L ), -1.0, 1.0 );',
  '    float aA = acos( cA );',
  '    float phase = max( ( sin( aA ) + ( PI - aA ) * cA ) / PI, 0.0 );',
  '    float day = mix( phase, smoothstep( -0.15, 0.55, cA ), cover * cover );',
  // The world's light on the faces turned to it (models.js planet-shine, the same three terms).
  '    float facing = 0.5 + 0.5 * dot( geometryNormal, D );',
  '    irradiance += PI * uShineCol * cover * cover * day * facing * facing;',
  // And the world's disc in a mirror (pbr.js worldMirrorWeight): blurred by the roughness.
  '    vec3 Rr = reflect( - geometryViewDir, geometryNormal );',
  '    float alpha = asin( cover );',
  '    float spread = 0.12 + 1.1 * material.roughness;',
  '    float lo = cos( min( alpha + spread, PI ) );',
  '    float hi = cos( max( alpha - spread, 0.0 ) );',
  `    radiance += uShineCol * ${f4(WORLD_RADIANCE)} * day * smoothstep( lo, hi, dot( Rr, D ) );`,
  '  }',
  '}',
].join('\n');

/** Last: the rim, the world's shadow, the night floor and the card's lamp, as the toon models have them. */
const FRAG_TAIL = [
  '{',
  '  vec3 V = normalize( vViewPosition );',
  '  vec3 L = normalize( ( viewMatrix * vec4( uSunDir, 0.0 ) ).xyz );',
  '  float lit = smoothstep( -0.25, 0.35, dot( normal, L ) );',
  '  float fr = pow( 1.0 - clamp( dot( normal, V ), 0.0, 1.0 ), 2.5 );',
  `  outgoingLight += mix( uRimShade, uRimSun, lit ) * fr * ${f4(PBR_RIM)};`,
  '  if ( uSunRim > 0.0 ) {',
  '    float back = clamp( dot( -V, L ), 0.0, 1.0 );',
  `    float fs = pow( 1.0 - clamp( dot( normal, V ), 0.0, 1.0 ), ${SUN_RIM_EXPONENT.toFixed(1)} );`,
  '    outgoingLight += uRimSun * fs * back * back * smoothstep( -0.6, 0.1, dot( normal, L ) ) * uSunRim * 0.5;',
  '  }',
  '  if ( uShadeRadius > 0.0 ) {',
  '    vec3 rel = -( ( viewMatrix * vec4( uShineCentre, 1.0 ) ).xyz + vViewPosition );',
  '    float along = dot( rel, L );',
  '    if ( along < 0.0 ) {',
  '      float perp = sqrt( max( dot( rel, rel ) - along * along, 0.0 ) );',
  `      float pen = max( -along * ${SUN_ANGULAR_RADIUS}, 1e-9 );`,
  '      float sunlit = smoothstep( uShadeRadius - pen, uShadeRadius + pen, perp );',
  '      if ( uAirH > 0.0 ) outgoingLight *= srAirTint( ( perp - uShadeRadius ) / uAirH );',
  '      float dR = max( length( rel ), 1e-9 );',
  '      float coverN = min( uShadeRadius / dR, 1.0 );',
  '      float facingN = 0.5 - 0.5 * dot( normal, rel / dR );',
  `      vec3 night = diffuseColor.rgb * ( vec3( ${NIGHT_FLOOR} ) + uNightCol * coverN * coverN * facingN * facingN );`,
  '      outgoingLight = mix( night, outgoingLight, sunlit );',
  '    }',
  '  }',
  '  if ( uFlood > 0.0 ) {',
  '    float head = 0.55 + 0.45 * clamp( dot( normal, V ), 0.0, 1.0 );',
  '    outgoingLight = max( outgoingLight, diffuseColor.rgb * head * uFlood );',
  '  }',
  '}',
  '#include <opaque_fragment>',
].join('\n');

/**
 * The fragment shader's text for a finish, from three.js's own: pure string work, so
 * tests/test_pbr.mjs can check every hook was found (a `replace` that matches nothing is silent).
 * @returns {{vertex: string, fragment: string, missing: string[]}}
 */
export function patchShaders(vertexShader, fragmentShader, finish) {
  const f = FINISHES[finish] || FINISHES.paint;
  const missing = [];
  const swap = (src, from, to, name) => {
    if (!src.includes(from)) { missing.push(name); return src; }
    return src.replace(from, to);
  };
  let v = swap(vertexShader, 'void main() {', VERT_PARS + 'void main() {', 'vertex main');
  v = swap(v, '#include <begin_vertex>', VERT_MAIN, 'begin_vertex');
  let fr = swap(fragmentShader, 'void main() {', FRAG_PARS + '\nvoid main() {', 'fragment main');
  fr = swap(fr, '#include <metalnessmap_fragment>', fragSurface(f), 'metalnessmap_fragment');
  fr = swap(fr, '#include <normal_fragment_maps>', FRAG_FOLDS, 'normal_fragment_maps');
  fr = swap(fr, '#include <lights_fragment_maps>', FRAG_ENV, 'lights_fragment_maps');
  fr = swap(fr, '#include <opaque_fragment>', FRAG_TAIL, 'opaque_fragment');
  return { vertex: v, fragment: fr, missing };
}

/**
 * One part's physically based material. Made once per toon material of a model (pairLooks), so a
 * model's clones share it, exactly as they share the toon one.
 * @param {string} hex the part's own colour
 * @param {string} finish a key of FINISHES (finishOf)
 * @param {{foldScale?: number, gridScale?: number, side?: number}} [o] pattern periods per unit of
 *   the part's own coordinates (realmodels.js works them out from the model's size), and the side
 *   its toon twin draws
 */
export function pbrMaterial(hex, finish, o = {}) {
  const foldScale = Number(o.foldScale) > 0 ? o.foldScale : 1;
  const gridScale = Number(o.gridScale) > 0 ? o.gridScale : 1;
  const f = FINISHES[finish] || FINISHES.paint;
  const m = new THREE.MeshStandardMaterial({ color: hex, metalness: f.metalness, roughness: f.roughness });
  if (o.side !== undefined) m.side = o.side;
  m.userData.kind = finish;
  m.userData.look = 'pbr';
  m.userData.perModel = true;
  if (f.crinkle > 0) m.defines = { SR_FOLDS: '' };
  const shared = lightUniforms();
  m.onBeforeCompile = (shader) => {
    for (const k of ['uSunDir', 'uRimSun', 'uRimShade', 'uShineCentre', 'uShineRadius', 'uShineCol', 'uShadeRadius', 'uNightCol', 'uFlood', 'uSunRim', 'uAirH']) shader.uniforms[k] = shared[k];
    shader.uniforms.uSrFold = { value: crinkleTexture() };
    shader.uniforms.uSrFoldScale = { value: foldScale };
    shader.uniforms.uSrFoldDepth = { value: f.crinkle * CRINKLE_DEPTH };
    shader.uniforms.uSrGridScale = { value: gridScale };
    shader.uniforms.uSrFill = { value: FILL };
    const patched = patchShaders(shader.vertexShader, shader.fragmentShader, finish);
    if (patched.missing.length) console.warn(`pbr material: three.js's shader has no ${patched.missing.join(', ')}`);
    shader.vertexShader = patched.vertex;
    shader.fragmentShader = patched.fragment;
  };
  // One program per kind of finish (folds or none, grid or none), whatever the colour.
  m.customProgramCacheKey = () => `sr-pbr-${f.crinkle > 0 ? 'f' : ''}${f.grid ? 'g' : ''}`;
  return m;
}

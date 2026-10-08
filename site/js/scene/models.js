// scene/models.js — the drawn objects.
//
// v1 has no GLB pipeline: every model is built here from three.js primitives. Cartoon objects on a
// realistic setting means simplified geometry with TRUE proportions, two or three flat tones, a
// soft Fresnel rim, one sharp specular on panels only, and no outline anywhere on 3D.
//
// Scale convention: each model is built so its longest dimension is about 1 unit, and carries
// `userData.realSizeM`, the real longest dimension in metres. The caller scales the Object3D to
// whatever the stage wants; nothing here assumes a stage unit.
//
// THE ONE UNIT IS THE PART THAT IS LOAD-BEARING, and it is now a test. Every builder divides real
// metres by its own span, so "1 unit" is what keeps a wing's length honest against its own hull --
// and when a model quietly built 0.62 of a unit, as JWST did, it was because the mirror was more
// than twice its true share of the sunshield. tests/test_station_shapes.mjs measures it.
//
// `realSizeM` itself is read by NOTHING. scene/heroes.js sizes every hero from a pixel target
// (`obj.scale.setScalar((px * 2 * d) / (h * f))`), and the card's size chip reads `sizeM` off the
// RECORD's metadata in ui/cards.js, not off the model. It is the same situation as the `generic`
// flag below: a true number that no caller has ever asked for. It is kept because it is what each
// builder divides by, so it is the model's own statement of what it is drawing, and the test above
// holds the geometry to it.
//
// Local frame convention, so updateModelAttitude() can aim them:
//   +Z  nadir (toward the world) for orbiting things; the dish/instrument boresight
//   +X  the panel / truss axis
//   +Y  the panel normal at zero rotation, and "up" for a rocket
//
// No Math.random: the asteroid and the debris shards are displaced by a seeded integer hash, so
// the same object is the same shape on every machine and on every reload.

import * as THREE from '../../vendor/three.module.min.js';
import { CLASS_COLOURS, PALETTE } from './glyphatlas.js';
// A data TABLE, not a data source: the rows a rocket is composed from, generated from
// registry/rockets.yaml. Same direction glyphatlas.js is already imported in.
import { ROCKET_BY_ID, GENERIC_ROCKET } from '../data/rocketmatch.js';
import { attachedOdditiesFor } from '../data/attached.js';

// ------------------------------------------------------------------ the one toon material family

// Three tones: shadow (base x 0.55 with a hue shift toward blue, which the ramp's blue-lifted
// darkest step stands in for), base, highlight (base x 1.25). NearestFilter or the steps blur.
const RAMP_STEPS = new Uint8Array([88, 178, 255]);
let rampTexture = null;
function gradientMap() {
  if (rampTexture) return rampTexture;
  rampTexture = new THREE.DataTexture(RAMP_STEPS, RAMP_STEPS.length, 1, THREE.RedFormat);
  rampTexture.minFilter = THREE.NearestFilter;
  rampTexture.magFilter = THREE.NearestFilter;
  rampTexture.generateMipmaps = false;
  rampTexture.needsUpdate = true;
  return rampTexture;
}
// A WORLD IS NOT A TOY (2026-10-07, internal #382). A small body that wears a photographic map --
// Ceres, Vesta -- is shaded by the same material with a smooth ramp instead of the three steps:
// three flat bands across a mosaic of craters read as a printing fault, and the map's own
// shadows already say "rock". The same three levels as the steps (RAMP_STEPS: 88, 178, 255 of 255),
// joined by a smooth curve, so a mapped body is as bright as every other model beside it and its
// night side is as readable: SEEN 2026-10-07 with a true cosine and a floor of 6 %, Ceres and
// Vesta arrived as two black discs with a thin lit edge, because a model is met from wherever the
// camera was and not from its lit side. The night side is lighter than it is, like every model's.
let worldRampTexture = null;
function worldRamp() {
  if (worldRampTexture) return worldRampTexture;
  const n = 64;
  const data = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const cos = (2 * (i + 0.5)) / n - 1;   // MeshToonMaterial reads the ramp at dot(N, L) / 2 + 1/2
    const s = Math.max(0, Math.min(1, (cos + 0.5) / 1.2));   // night's level until 30 degrees past the terminator, full by 45 from the Sun
    data[i] = Math.round(RAMP_STEPS[0] + (RAMP_STEPS[2] - RAMP_STEPS[0]) * s * s * (3 - 2 * s));
  }
  worldRampTexture = new THREE.DataTexture(data, n, 1, THREE.RedFormat);
  worldRampTexture.minFilter = THREE.LinearFilter;
  worldRampTexture.magFilter = THREE.LinearFilter;
  worldRampTexture.generateMipmaps = false;
  worldRampTexture.needsUpdate = true;
  return worldRampTexture;
}

// One shared uniform object, so a single write in updateModelAttitude() reaches every material.
const SHARED = {
  uFlood: { value: 0 },
  uSunDir: { value: new THREE.Vector3(1, 0, 0) },
  uRimSun: { value: new THREE.Color('#FFF6EC') },
  uRimShade: { value: new THREE.Color(PALETTE.atmosphere) },
  // Planet-shine (setPlanetShine below): the world a model is beside, as a second, soft light.
  uShineCentre: { value: new THREE.Vector3() },
  uShineRadius: { value: 0 },
  uShineCol: { value: new THREE.Color(0, 0, 0) },
  // The same world's shadow (worldShadowLit below): its radius as drawn, 0 for "no world near",
  // and the little light there is on its night side.
  uShadeRadius: { value: 0 },
  uNightCol: { value: new THREE.Color(0, 0, 0) },
  // The Sun's rim and the panels' glint (setLightTier below): 0 on the tier that has neither.
  uSunRim: { value: 0 },
  uGlint: { value: 0 },
  // The two surface terms (surfaceTermsGLSL below): 1 on a device that can afford them, else 0.
  uSurface: { value: 0 },
};

/**
 * PLANET-SHINE: THE LIGHT A WORLD THROWS BACK AT WHAT FLIES OVER IT (issue #266, spec 0057 task 3).
 *
 * WHY. The Sun was the only thing lighting a model, so the side of the ISS that faces the Earth --
 * the side every photograph of it shows glowing blue-white -- was the toon ramp's shadow step and
 * nothing else, and a lander stood on sunlit ground that lit nothing. In low orbit the planet is
 * the second-brightest thing in the sky by a wide margin and it fills almost half of it.
 *
 * WHAT IS MEASURED AND WHAT IS OURS. `albedo` is each world's Bond albedo, the fraction of
 * sunlight it sends back, from the NSSDC planetary fact sheets
 * (https://nssdc.gsfc.nasa.gov/planetary/factsheet/, each world's own sheet, read 2026-10-05). `colour` is ours: the tint
 * of that world's daylit face as this app draws it. So is SHINE_GAIN, and so is the shape of the
 * three terms below -- they are the right KIND of thing (more shine close in, none over the night
 * side, most on the faces turned to the ground) and not a radiative-transfer result. Illustrative.
 *
 * The three terms, which the shader in toonMaterial repeats and tests/test_model_colour.mjs holds:
 *   cover  = (R / d)^2       how much sky the world fills: 0.88 for the ISS, 0.02 at geostationary
 *                            height, 1 for a rover -- so a lander is lit by its own ground
 *   day    = shineDay(up . sun, R / d)   the ground under it in daylight, near; the world's
 *                            phase as the craft sees it, far (lambertPhase below)
 *   facing = (0.5 + 0.5 n . down)^2              wrapped, so it fades round the hull, never cuts
 */
export const PLANET_SHINE = {
  mercury: { albedo: 0.068, colour: '#B9B2A8' },
  venus: { albedo: 0.77, colour: '#F1E3C0' },
  earth: { albedo: 0.294, colour: '#A9C8FF', night: PALETTE.nightLights },
  moon: { albedo: 0.11, colour: '#CFCDC8' },
  mars: { albedo: 0.25, colour: '#E0A070' },
  jupiter: { albedo: 0.343, colour: '#E3CDA8' },
  saturn: { albedo: 0.342, colour: '#EBDDB0' },
  uranus: { albedo: 0.3, colour: '#BFE6EA' },
  neptune: { albedo: 0.29, colour: '#9DB8F5' },
};
/** Ours, not measured: how far the fill is turned up so it reads through a three-step ramp. */
export const SHINE_GAIN = 1.2;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * THE WORLD'S PHASE AS THE CRAFT SEES IT (public #266). How much of its full light a diffuse
 * sphere sends towards a viewer at phase angle a (Sun - world - craft):
 *
 *   phase(a) = ( sin a + (pi - a) cos a ) / pi
 *
 * 1 at full, 1/pi at quarter phase, 0 at new: Wikipedia "Absolute magnitude", section "Planets as
 * diffuse spheres" (read 2026-10-08: "A quarter phase has 1/pi as much light as full phase"). It is
 * the far view: a craft at the Moon's distance looking back at a gibbous Earth. Close in, the
 * craft sees only the ground under it and the old local term is the right one, so the day term
 * below is the phase far out and the local one near the ground, blended by how much sky the world
 * fills (cover squared): 88 % local for the ISS, 2 % at geostationary height.
 * @param {number} cosA cosine of the phase angle = (world -> craft) . (world -> Sun)
 */
export function lambertPhase(cosA) {
  const c = Math.min(1, Math.max(-1, cosA));
  if (c <= -1) return 0;
  if (c >= 1) return 1;
  const a = Math.acos(c);
  return Math.max(0, (Math.sin(a) + (Math.PI - a) * c) / Math.PI);
}
/** The day term: local near the ground, the world's phase far out. Pure; the shader's twin. */
export function shineDay(dayDot, radiusOverDistance) {
  const k = Math.min(1, Math.max(0, radiusOverDistance));
  const local = smooth(-0.15, 0.55, dayDot);
  return lambertPhase(dayDot) * (1 - k * k) + local * k * k;
}

/**
 * THE SUN'S RIM AND THE PANELS' GLINT (public #266). Two small terms in the model's own material;
 * there is no environment map and no pass after the frame (tests/test_contract.mjs refuses one).
 *
 * RIM. With the Sun behind a craft, the edges turned towards it catch its light: the Fresnel edge
 * the material already has, times how nearly the camera looks into the Sun (squared), on the faces
 * the Sun can reach. Nothing with the Sun behind the camera. SUN_RIM is ours, a drawing choice.
 *
 * GLINT. A solar array is close to a flat mirror: it flashes when its normal is the half-way
 * direction between the Sun and the eye, and not otherwise. The Sun is 0.53 degrees across, so a
 * perfect mirror would flash over about a quarter of a degree; an array is cells, cover glass and
 * a frame that is not flat, and GLINT_HALF_DEG = 2 is our width for it, illustrative. The lobe is
 * cos^n with n chosen so the flash is half as bright GLINT_HALF_DEG off the mirror direction.
 *
 * TIERS (scene/quality.js): 0 has neither (a phone that boots low, or the frame-rate latch), 1 the
 * rim, 2 the rim and the glint. The phase term above costs nothing and is on every tier.
 */
export const SUN_RIM = 0.9;
export const GLINT_GAIN = 2.4;
export const GLINT_HALF_DEG = 2;
export const GLINT_POWER = Math.round(Math.log(0.5) / Math.log(Math.cos(GLINT_HALF_DEG * Math.PI / 180)));
export const LIGHT_TIERS = [
  { rim: 0, glint: 0 },
  { rim: SUN_RIM, glint: 0 },
  { rim: SUN_RIM, glint: GLINT_GAIN },
];
/** Set what the models' material adds for this device tier. Returns the row used. */
export function setLightTier(tier) {
  const row = LIGHT_TIERS[Math.min(LIGHT_TIERS.length - 1, Math.max(0, Math.floor(Number(tier) || 0)))];
  SHARED.uSunRim.value = row.rim;
  SHARED.uGlint.value = row.glint;
  return row;
}
/**
 * The rim on one pixel. Pure; the shader's twin.
 * @param {{fresnel:number, intoSun:number, facingSun:number}} o  fresnel = (1 - n.v)^2.5, intoSun =
 *   (camera's line of sight) . (direction to the Sun), facingSun = n . (direction to the Sun)
 */
export function sunRimStrength({ fresnel, intoSun, facingSun }, rim = SUN_RIM) {
  const back = Math.min(1, Math.max(0, intoSun));
  return rim * Math.min(1, Math.max(0, fresnel)) * back * back * smooth(-0.6, 0.1, facingSun);
}
/** The glint on a panel whose normal is `offDeg` from the Sun-eye half-way direction. Pure. */
export function glintStrength(offDeg, gain = GLINT_GAIN) {
  const c = Math.cos(Math.min(90, Math.abs(offDeg)) * Math.PI / 180);
  return gain * Math.pow(Math.max(0, c), GLINT_POWER);
}

/**
 * The strength of the fill on one face, 0..albedo * SHINE_GAIN. Pure; the same arithmetic as the
 * shader, kept here so a test can hold the numbers without a GPU.
 * @param {{albedo:number, radiusOverDistance:number, dayDot:number, facingDot:number}} o
 *   dayDot = (direction away from the world) . (direction to the Sun); facingDot = normal . (direction to the world)
 */
export function planetShineStrength({ albedo, radiusOverDistance, dayDot, facingDot }) {
  const k = Math.min(1, Math.max(0, radiusOverDistance));
  const facing = 0.5 + 0.5 * Math.min(1, Math.max(-1, facingDot));
  return albedo * SHINE_GAIN * k * k * shineDay(dayDot, k) * facing * facing;
}

const _shineCol = new THREE.Color();
/**
 * Which world shines on the models this frame. ONE world for every model on screen, because the
 * uniforms are shared: the stage's own, or the nearest drawn one on the Sun's stage (heroes.js
 * chooses). `null`, an unknown id or a zero radius turns it off -- far from everything, a probe is
 * lit by the Sun alone, which is true.
 * @param {string|null} worldId
 * @param {{x:number,y:number,z:number}} [centre] scene space
 * @param {number} [radius] scene units, as drawn
 */
export function setPlanetShine(worldId, centre, radius) {
  const row = worldId ? PLANET_SHINE[worldId] : null;
  const there = !!centre && radius > 0;
  // THE SHADOW NEEDS NO ROW: any world that is drawn can stand between a model and the Sun, whether
  // or not this file has an albedo for it.
  SHARED.uShadeRadius.value = there ? radius : 0;
  if (there) SHARED.uShineCentre.value.set(centre.x, centre.y, centre.z);
  SHARED.uNightCol.value.setRGB(0, 0, 0);
  if (!row || !there) { SHARED.uShineRadius.value = 0; return false; }
  SHARED.uShineRadius.value = radius;
  SHARED.uShineCol.value.copy(_shineCol.set(row.colour)).multiplyScalar(row.albedo * SHINE_GAIN);
  if (row.night) SHARED.uNightCol.value.set(row.night).multiplyScalar(NIGHT_GLOW);
  return true;
}

/**
 * A WORLD'S SHADOW ON A MODEL (internal #388).
 *
 * A model was lit by the Sun's direction and nothing asked whether a world was in the way: the ISS
 * in the Earth's shadow was as bright as at noon, and a lander stood sunlit on ground that was
 * black to the horizon. This is the missing question, asked per fragment, and it is the SAME
 * geometry scene/shadow.js earthShadowLit already uses for the dots and the pass predictions: a
 * shadow as wide as the world, running straight back from it, with an edge as soft as the Sun is
 * wide (its angular radius, 0.00465 rad, seen from 1 au). tests/test_model_colour.mjs holds the
 * two functions to the same answers, so a dot and the model that replaces it go dark together.
 *
 * It covers the night SIDE as well as the shadow behind: a point on the surface past the
 * terminator is inside the same cylinder.
 *
 * WHAT IS LEFT IN THE DARK is ours and illustrative: NIGHT_FLOOR of the surface's own colour, so a
 * silhouette is still a shape (starlight, and a screen), plus over the Earth a warm glow on the
 * faces turned to the ground, in the colour this app draws city lights. Other worlds have no row
 * for that and get the floor alone.
 * @returns {number} 1 in full sunlight, 0 in the umbra
 */
export const SUN_ANGULAR_RADIUS = 0.00465;
export const NIGHT_FLOOR = 0.012;
export const NIGHT_GLOW = 0.035;
export function worldShadowLit(p, centre, sunDir, radius) {
  if (!(radius > 0)) return 1;
  const x = p.x - centre.x, y = p.y - centre.y, z = p.z - centre.z;
  const along = x * sunDir.x + y * sunDir.y + z * sunDir.z;
  if (along >= 0) return 1; // on the Sun's side of the world
  const perp = Math.sqrt(Math.max(0, x * x + y * y + z * z - along * along));
  const pen = Math.max(1e-9, -along * SUN_ANGULAR_RADIUS);
  return smooth(radius - pen, radius + pen, perp);
}

// specular family per class of surface: panels sharp, foil and radiators broad and soft, bodies none
const SPECULAR = {
  body: { spec: 0.0, power: 1.0 },
  panel: { spec: 0.55, power: 220.0 },
  foil: { spec: 0.14, power: 14.0 },
  radiator: { spec: 0.1, power: 10.0 },
};

/**
 * THE TWO SURFACE TERMS (internal #161, spec 0057 task 2): AN ANISOTROPIC GLINT ON PANELS AND A
 * SHEEN ON FOIL. In their own function, and added to the shader in one line, so the rest of the
 * model's light (the ramp, the rim, the planet-shine, the shadow) can change without touching them.
 *
 * WHY. A solar array is rows of cells under glass with a grid of conductors: its highlight is not a
 * round spot but a streak, long across the grid and narrow along it. Crinkled multi-layer
 * insulation is the opposite of a mirror: thousands of small facets, which together throw light
 * back most strongly near grazing angles, in the foil's own colour. The single round specular this
 * file had (SPECULAR above) says neither. Voyager's bus and the Apollo lunar module's descent stage
 * are foil; every array is a panel.
 *
 * THE MATHS, both standard and both cheap (one exp or one pow per fragment, no texture, no tangent
 * attribute):
 *   - panel: Ward's anisotropic lobe, exp( -( (H.T / ax)^2 + (H.B / ay)^2 ) / (N.H)^2 ), with the
 *     tangent T taken across the scene's up axis on the panel's own plane (the meshes carry no
 *     tangents, and a flat array has one direction that stays put as the camera moves round it).
 *   - foil: the "Charlie" sheen distribution (Estevez and Kulla 2017, the one glTF's
 *     KHR_materials_sheen names), D = (2 + 1/r) sin(theta_h)^(1/r) / (2 pi), times the foil's own
 *     colour.
 * Both are multiplied by the same `lit` the round specular uses and added BEFORE the world's
 * shadow, which takes away everything that comes from the Sun.
 *
 * TIERED. `uSurface` is 0 until setSurfaceTerms(true): scene/heroes.js switches it on for a device
 * of tier 1 and up that has not latched to the plain look, so a phone on the lowest tier runs the
 * shader it ran before (the branch is a uniform test). wardLobe() and charlieSheen() are the same
 * sums in JS, for tests/test_small_issues.mjs.
 */
export const SURFACE_TERMS = {
  panel: { strength: 0.3, along: 0.07, across: 0.45 },
  foil: { strength: 0.5, roughness: 0.5 },
};
export function setSurfaceTerms(on) {
  SHARED.uSurface.value = on ? 1 : 0;
  return SHARED.uSurface.value > 0;
}
export function surfaceTermsOn() {
  return SHARED.uSurface.value > 0;
}
/** Ward's lobe: `nh`, `th`, `bh` are the half vector against the normal, the tangent and the bitangent. */
export function wardLobe(nh, th, bh, along = SURFACE_TERMS.panel.along, across = SURFACE_TERMS.panel.across) {
  if (!(nh > 1e-4)) return 0;
  return Math.exp(-(((th / along) ** 2) + ((bh / across) ** 2)) / (nh * nh));
}
/** The Charlie sheen distribution at a half vector `nh` from the normal. */
export function charlieSheen(nh, roughness = SURFACE_TERMS.foil.roughness) {
  const inv = 1 / roughness;
  const c = Math.min(1, Math.max(0, nh));
  return ((2 + inv) * (Math.sqrt(1 - c * c) ** inv)) / (2 * Math.PI);
}
/** The GLSL for a kind's term, as lines for toonMaterial's patch; empty for a kind that has none. */
export function surfaceTermsGLSL(kind) {
  const f = (n) => Number(n).toFixed(4);
  if (kind === 'panel') {
    const p = SURFACE_TERMS.panel;
    return [
      '  if ( uSurface > 0.0 ) {',
      '    vec3 Hs = normalize( L + V );',
      '    vec3 Ts = cross( normal, normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz ) );',
      '    float tl = length( Ts );',
      '    float nh = dot( normal, Hs );',
      '    if ( tl > 1e-3 && nh > 1e-4 ) {',
      '      Ts /= tl;',
      '      vec3 Bs = cross( normal, Ts );',
      `      float th = dot( Hs, Ts ) / ${f(p.along)};`,
      `      float bh = dot( Hs, Bs ) / ${f(p.across)};`,
      `      outgoingLight += vec3( ${f(p.strength)} ) * exp( -( th * th + bh * bh ) / ( nh * nh ) ) * lit * uSurface;`,
      '    }',
      '  }',
    ];
  }
  if (kind === 'foil') {
    const s = SURFACE_TERMS.foil;
    const inv = 1 / s.roughness;
    return [
      '  if ( uSurface > 0.0 ) {',
      '    vec3 Hs = normalize( L + V );',
      '    float nh = clamp( dot( normal, Hs ), 0.0, 1.0 );',
      `    float Ds = ${f(2 + inv)} * pow( sqrt( max( 1.0 - nh * nh, 0.0 ) ), ${f(inv)} ) * 0.1592;`,
      `    outgoingLight += diffuseColor.rgb * ${f(s.strength)} * Ds * lit * uSurface;`,
      '  }',
    ];
  }
  return [];
}

const materials = new Map();

// Materials are shared inside ONE model and never between two, because the near-model layer fades
// a model in by writing material.opacity: one shared instance would fade every station at once.
// The compiled program is still shared -- customProgramCacheKey is per kind, not per material --
// so this costs a few uniform uploads and nothing else.
let modelMaterials = null;

/**
 * A toon material: 3-step ramp, Fresnel rim at 0.35, optional single specular. No outline.
 * @param {string} colour hex
 * @param {'body'|'panel'|'foil'|'radiator'} kind
 * @param {Map} [pool] where to cache it; defaults to the process-wide pool
 */
export function toonMaterial(colour, kind = 'body', pool = materials, map = null) {
  const key = `${colour}|${kind}${map ? `|${map.uuid}` : ''}`;
  const hit = pool.get(key);
  if (hit) return hit;
  const s = SPECULAR[kind] || SPECULAR.body;
  const m = new THREE.MeshToonMaterial({ color: colour, gradientMap: kind === 'world' ? worldRamp() : gradientMap(), map });
  m.userData.kind = kind;
  m.userData.perModel = pool !== materials;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDir = SHARED.uSunDir;
    shader.uniforms.uRimSun = SHARED.uRimSun;
    shader.uniforms.uRimShade = SHARED.uRimShade;
    shader.uniforms.uShineCentre = SHARED.uShineCentre;
    shader.uniforms.uShineRadius = SHARED.uShineRadius;
    shader.uniforms.uShineCol = SHARED.uShineCol;
    shader.uniforms.uShadeRadius = SHARED.uShadeRadius;
    shader.uniforms.uNightCol = SHARED.uNightCol;
    shader.uniforms.uFlood = SHARED.uFlood;
    shader.uniforms.uSunRim = SHARED.uSunRim;
    shader.uniforms.uGlint = SHARED.uGlint;
    shader.uniforms.uSurface = SHARED.uSurface;
    // A mapped world has no air to glow at its limb: a third of the models' rim, enough to part it from the sky.
    shader.uniforms.uRim = { value: kind === 'world' ? 0.12 : 0.35 };
    shader.uniforms.uSpec = { value: s.spec };
    shader.uniforms.uSpecPower = { value: s.power };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        [
          'uniform vec3 uSunDir;',
          'uniform vec3 uRimSun;',
          'uniform vec3 uRimShade;',
          'uniform float uRim;',
          'uniform float uSpec;',
          'uniform float uSpecPower;',
          'uniform vec3 uShineCentre;',
          'uniform float uShineRadius;',
          'uniform vec3 uShineCol;',
          'uniform float uShadeRadius;',
          'uniform vec3 uNightCol;',
          'uniform float uFlood;',
          'uniform float uSunRim;',
          'uniform float uGlint;',
          'uniform float uSurface;',
          'void main() {',
        ].join('\n')
      )
      .replace(
        '#include <opaque_fragment>',
        [
          '{',
          '  vec3 V = normalize( vViewPosition );',
          '  vec3 L = normalize( ( viewMatrix * vec4( uSunDir, 0.0 ) ).xyz );',
          '  float lit = smoothstep( -0.25, 0.35, dot( normal, L ) );',
          '  float f = pow( 1.0 - clamp( dot( normal, V ), 0.0, 1.0 ), 2.5 );',
          '  outgoingLight += mix( uRimShade, uRimSun, lit ) * f * uRim;',
          '  if ( uSpec > 0.0 ) {',
          '    vec3 H = normalize( L + V );',
          '    outgoingLight += vec3( uSpec ) * pow( max( dot( normal, H ), 0.0 ), uSpecPower ) * lit;',
          // The glint (GLINT above): panels only, a narrow lobe on the mirror direction.
          `    if ( uGlint > 0.0 && uSpec > 0.3 ) outgoingLight += uRimSun * uGlint * pow( max( dot( normal, H ), 0.0 ), ${GLINT_POWER}.0 ) * step( 0.0, dot( normal, L ) );`,
          '  }',
          // The Sun's rim (sunRimStrength above): the Sun behind the craft, on the edges turned to it.
          '  if ( uSunRim > 0.0 ) {',
          '    float back = clamp( dot( -V, L ), 0.0, 1.0 );',
          '    outgoingLight += uRimSun * f * back * back * smoothstep( -0.6, 0.1, dot( normal, L ) ) * uSunRim;',
          '  }',
          // The anisotropic glint on panels and the sheen on foil (internal #161), in their own function.
          ...surfaceTermsGLSL(kind),
          // Planet-shine: see PLANET_SHINE above, and planetShineStrength for the same sum in JS.
          // Halved on a face the Sun already lights, so the day side does not wash out.
          '  if ( uShineRadius > 0.0 ) {',
          '    vec3 toC = ( viewMatrix * vec4( uShineCentre, 1.0 ) ).xyz + vViewPosition;',
          '    float dC = max( length( toC ), 1e-9 );',
          '    vec3 D = toC / dC;',
          '    float cover = min( uShineRadius / dC, 1.0 );',
          '    float cA = clamp( dot( -D, L ), -1.0, 1.0 );',
          '    float aA = acos( cA );',
          '    float phase = max( ( sin( aA ) + ( 3.14159265 - aA ) * cA ) / 3.14159265, 0.0 );',
          '    float day = mix( phase, smoothstep( -0.15, 0.55, cA ), cover * cover );',
          '    float facing = 0.5 + 0.5 * dot( normal, D );',
          '    outgoingLight += diffuseColor.rgb * uShineCol * cover * cover * day * facing * facing * ( 1.0 - 0.5 * lit );',
          '  }',
          // The world's shadow, LAST, because it takes away everything above -- the lamp, the rim,
          // the glint and the planet-shine all come from the Sun. worldShadowLit is the same sum.
          '  if ( uShadeRadius > 0.0 ) {',
          '    vec3 rel = -( ( viewMatrix * vec4( uShineCentre, 1.0 ) ).xyz + vViewPosition );',
          '    float along = dot( rel, L );',
          '    if ( along < 0.0 ) {',
          '      float perp = sqrt( max( dot( rel, rel ) - along * along, 0.0 ) );',
          `      float pen = max( -along * ${SUN_ANGULAR_RADIUS}, 1e-9 );`,
          '      float sunlit = smoothstep( uShadeRadius - pen, uShadeRadius + pen, perp );',
          '      float dR = max( length( rel ), 1e-9 );',
          '      float coverN = min( uShadeRadius / dR, 1.0 );',
          '      float facingN = 0.5 - 0.5 * dot( normal, rel / dR );',
          `      vec3 night = diffuseColor.rgb * ( vec3( ${NIGHT_FLOOR} ) + uNightCol * coverN * coverN * facingN * facingN );`,
          '      outgoingLight = mix( night, outgoingLight, sunlit );',
          '    }',
          '  }',
          // The flood light (setFloodLight below), after the shadow, because it is not the Sun's:
          // an even lamp at the camera, so a craft on a night side or with its back to the Sun
          // can be looked at. It only ever lifts a pixel, never darkens one.
          '  if ( uFlood > 0.0 ) {',
          '    float head = 0.55 + 0.45 * clamp( dot( normal, V ), 0.0, 1.0 );',
          '    outgoingLight = max( outgoingLight, diffuseColor.rgb * head * uFlood );',
          '  }',
          '}',
          '#include <opaque_fragment>',
        ].join('\n')
      );
  };
  m.customProgramCacheKey = () => `sr-toon-${kind}`;
  pool.set(key, m);
  return m;
}

/**
 * THE FLOOD LIGHT (internal #272). NOT THE REAL LIGHT, and the card that switches it on says so.
 * A craft in a world's shadow is drawn dark because it is dark (worldShadowLit above); this is the
 * lamp a planetarium turns on to show the model anyway. One shared uniform: every toon material
 * reads it, so it lights whichever model is on screen and costs nothing when it is 0.
 * FLOOD_LEVEL is the lamp's strength where the surface faces the camera; 0.9 keeps a white hull
 * under the bright step of the sunlit ramp, so "lit for viewing" never reads brighter than day.
 */
export const FLOOD_LEVEL = 0.9;
export function setFloodLight(on) {
  SHARED.uFlood.value = on ? FLOOD_LEVEL : 0;
  return SHARED.uFlood.value > 0;
}
export function floodLightOn() {
  return SHARED.uFlood.value > 0;
}
/** The same sum as the shader's, for the tests: what a pixel of `albedo` facing `facing` shows. */
export function floodLit(outgoing, albedo, facing, flood = SHARED.uFlood.value) {
  if (!(flood > 0)) return outgoing;
  return Math.max(outgoing, albedo * (0.55 + 0.45 * Math.min(1, Math.max(0, facing))) * flood);
}

/** Update the Sun direction every material's rim and specular use. Scene space, unit, toward the Sun. */
export function setSunDirection(v) {
  if (!v) return;
  SHARED.uSunDir.value.set(v.x, v.y, v.z).normalize();
}

// ------------------------------------------------------------------------------ small helpers

// 32-bit integer hash -> [0,1). Deterministic, and there is no Math.random in this project.
function hash01(n) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
function seedOf(s) {
  let h = 2166136261;
  const str = String(s ?? '');
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mesh(geometry, colour, kind, name) {
  const m = new THREE.Mesh(geometry, toonMaterial(colour, kind, modelMaterials || materials));
  m.name = name || '';
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}
function box(w, h, d, colour, kind, name) {
  return mesh(new THREE.BoxGeometry(w, h, d), colour, kind, name);
}
function cyl(rTop, rBottom, h, seg, colour, kind, name) {
  return mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), colour, kind, name);
}
/** A shallow parabolic dish, open toward +Z. */
function dish(radius, depth, seg, colour, kind, name) {
  const pts = [];
  const N = 6;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const r = radius * t;
    pts.push(new THREE.Vector2(Math.max(r, 0.001), -depth * t * t));
  }
  const g = new THREE.LatheGeometry(pts, seg);
  g.rotateX(-Math.PI / 2); // lathe is around +Y; point the mouth at +Z
  return mesh(g, colour, kind, name);
}
/** A solar array wing: a thin slab plus its mast, in the layer's panel material. */
function panelWing(length, width, colour, name) {
  const g = new THREE.Group();
  const slab = box(length, 0.004, width, '#2E4E8C', 'panel', 'panel');
  slab.position.x = length / 2;
  g.add(slab);
  const mast = box(length, 0.008, 0.008, colour, 'foil', 'mast');
  mast.position.x = length / 2;
  g.add(mast);
  g.name = name || 'wing';
  return g;
}

/** A cylinder or frustum along Z, centred at `z`: `rFront` is the +Z end. */
function zcyl(rFront, rBack, len, z, seg, colour, kind, name) {
  const c = cyl(rFront, rBack, len, seg, colour, kind, name);
  c.rotation.x = Math.PI / 2;
  c.position.z = z;
  return c;
}
/**
 * A hull as a table. Rows are [rAft, rFront, length, colour, kind, name] IN METRES, stacked nose to
 * tail along +Z from `z0`, so the lengths in a builder add up to the published length on the page
 * and nowhere else. `S` is the builder's one division. Returns the z reached, in metres.
 */
function zstack(g, z0, S, seg, rows) {
  let z = z0;
  for (const [rAft, rFront, len, colour, kind, name] of rows) {
    g.add(zcyl(rFront * S, rAft * S, len * S, (z + len / 2) * S, seg, colour, kind || 'body', name));
    z += len;
  }
  return z;
}
/** Several boxes as ONE mesh and one draw call: rows are [w, h, d, x, y, z]. */
function slabs(rows, colour, kind, name) {
  const pos = [];
  const nor = [];
  for (const [w, h, d, x, y, z] of rows) {
    const b = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    b.translate(x, y, z);
    for (const v of b.attributes.position.array) pos.push(v);
    for (const v of b.attributes.normal.array) nor.push(v);
    b.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return mesh(geo, colour, kind, name);
}
/** Several struts as ONE mesh and one draw call: rows are [ax, ay, az, bx, by, bz]. */
function tubes(rows, r, seg, colour, kind, name) {
  const pos = [];
  const nor = [];
  const up = new THREE.Vector3(0, 1, 0);
  const d = new THREE.Vector3();
  const q = new THREE.Quaternion();
  for (const [ax, ay, az, bx, by, bz, rr] of rows) {
    d.set(bx - ax, by - ay, bz - az);
    const len = d.length();
    if (!(len > 0)) continue;
    const c = new THREE.CylinderGeometry(rr || r, rr || r, len, seg).toNonIndexed();
    c.applyQuaternion(q.setFromUnitVectors(up, d.normalize()));
    c.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    for (const v of c.attributes.position.array) pos.push(v);
    for (const v of c.attributes.normal.array) nor.push(v);
    c.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return mesh(geo, colour, kind, name);
}
/**
 * A solar wing drawn as the panels it folds into: `n` slabs along +X from the root with a hair of
 * gap between them, on a spine, behind a short bare yoke. The outer edge is at exactly `length`,
 * so a builder can still derive the wing from the published span.
 */
function segWing(length, width, n, name, colour = PANEL_BLUE) {
  const g = new THREE.Group();
  const yoke = length * 0.06;
  const cell = (length - yoke) / n;
  const gap = Math.min(cell * 0.08, width * 0.06);
  const cells = [];
  for (let i = 0; i < n; i++) cells.push([cell - gap, 0.004, width, yoke + cell * (i + 0.5) + gap / 2, 0, 0]);
  g.add(slabs(cells, colour, 'panel', 'panel'));
  const spine = box(length, 0.007, Math.min(0.007, width * 0.2), METAL, 'foil', 'mast');
  spine.position.x = length / 2;
  g.add(spine);
  g.name = name || 'wing';
  return g;
}
/** Every other gore of a round fanfold array in the XZ plane, both faces: two of these make a fan. */
function goreFan(r, n, parity, colour, name) {
  const pos = [];
  for (let i = parity; i < n; i += 2) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    const x0 = Math.cos(a0) * r, z0 = Math.sin(a0) * r, x1 = Math.cos(a1) * r, z1 = Math.sin(a1) * r;
    pos.push(0, 0, 0, x1, 0, z1, x0, 0, z0, 0, 0, 0, x0, 0, z0, x1, 0, z1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return mesh(geo, colour, 'panel', name);
}
/** A named group the proportion test measures: the pressure hull or bus, without wings and booms. */
function hullGroup() {
  const h = new THREE.Group();
  h.name = 'hull';
  return h;
}

const PANEL_BLUE = '#2E4E8C'; // dark blue cells; not a palette token because it is a material, not a class
const FOIL = '#C9B27A'; // gold multi-layer insulation
const METAL = '#B9C2CE';
const HULL_WHITE = '#E6EAF0'; // painted or beta-cloth white
const HULL_GREY = '#C3C9D1';
const BLANKET = '#5E645B'; // the grey-olive thermal blanket a Soyuz and a Progress fly in
const RADIATOR = '#EEF1F4';
const CHARRED = '#2B2624'; // a heat shield
const DARK_GLASS = '#1B2430';

// ------------------------------------------------------------------------------------ station

// Proportions from the ISS: 109 m truss, 8 solar wings of 34 x 12 m, a 51 m module stack across the
// truss, 24 m radiators. Normalised by the 109 m truss, so the panels really are longer than the
// modules and the whole thing is wider than it is long, as it is.
function buildStation() {
  const g = new THREE.Group();
  g.userData.realSizeM = 109;

  const truss = box(1.0, 0.035, 0.035, METAL, 'body', 'truss');
  g.add(truss);

  // pressurised modules, across the truss along Z
  const moduleColour = CLASS_COLOURS.station;
  const mods = [
    [0.0, 0.24, 0.055],
    [0.0, 0.06, 0.055],
    [0.0, -0.13, 0.05],
    [0.0, -0.3, 0.045],
    [0.09, 0.13, 0.04],
    [-0.09, 0.13, 0.04],
  ];
  for (let i = 0; i < mods.length; i++) {
    const [x, z, r] = mods[i];
    const len = i < 4 ? 0.2 : 0.12;
    const m = cyl(r, r, len, 12, moduleColour, 'body', `module${i}`);
    m.rotation.x = Math.PI / 2; // cylinder runs +Y; lay it along Z
    m.position.set(x, 0, z);
    if (i >= 4) {
      m.rotation.x = 0;
      m.rotation.z = Math.PI / 2; // the two side modules run along X
    }
    g.add(m);
  }

  // four wing pairs, on pivots that turn about the truss axis to face the Sun
  const pivots = [];
  for (const x of [-0.46, -0.34, 0.34, 0.46]) {
    const pivot = new THREE.Group();
    pivot.position.x = x;
    pivot.name = 'panelPivot';
    const wingLen = 0.31; // 34 m
    const wingWidth = 0.11; // 12 m
    const a = panelWing(wingLen, wingWidth, METAL, 'wing+');
    a.rotation.y = 0;
    a.position.z = 0.02;
    const b = panelWing(wingLen, wingWidth, METAL, 'wing-');
    b.rotation.y = Math.PI;
    b.position.z = -0.02;
    // wings extend along ±Z from the truss; rotate the whole wing 90° about Y
    a.rotation.y = -Math.PI / 2;
    b.rotation.y = Math.PI / 2;
    pivot.add(a, b);
    g.add(pivot);
    pivots.push(pivot);
  }
  g.userData.panelPivots = pivots;

  // radiators, broad soft specular
  for (const x of [-0.2, 0.2]) {
    const rad = box(0.07, 0.004, 0.22, '#D8DEE7', 'radiator', 'radiator');
    rad.position.set(x, 0.03, 0);
    g.add(rad);
  }

  return g;
}

// ----------------------------------------------------------------------------------- satellite

// Three variants and no more: a beginner needs to see that these are not all the same thing.
function buildSatelliteComms() {
  const g = new THREE.Group();
  g.userData.realSizeM = 30;
  const bus = box(0.22, 0.24, 0.28, '#E3E8EF', 'body', 'bus');
  g.add(bus);
  // On the bus's Earth face, not hovering 4 % of the model in front of it, which is where the
  // dish and its feed used to sit: one object, two clusters. tests/test_station_shapes.mjs.
  const d = dish(0.2, 0.06, 16, '#EDF1F6', 'foil', 'dish');
  d.position.z = 0.14;
  d.name = 'dish';
  g.add(d);
  const feed = cyl(0.012, 0.012, 0.12, 8, METAL, 'body', 'feed');
  feed.rotation.x = Math.PI / 2;
  feed.position.z = 0.2;
  g.add(feed);
  const pivot = new THREE.Group();
  pivot.name = 'panelPivot';
  const right = panelWing(0.38, 0.16, METAL, 'wing+');
  right.position.x = 0.11;
  const left = panelWing(0.38, 0.16, METAL, 'wing-');
  left.rotation.y = Math.PI;
  left.position.x = -0.11;
  pivot.add(right, left);
  g.add(pivot);
  g.userData.panelPivots = [pivot];
  return g;
}

// -------------------------------------------------------------------------------------- debris

// ONE SHARD PER FRAGMENT. Debris is drawn in crowds more than anything else in the app, and a
// crowd of IDENTICAL shards reads as a rendering bug rather than as a field of fragments -- which
// is the same complaint the docked-vehicle test above exists to answer. A fragment has no published
// size and this invents none; only the seed changes.
function buildDebris(variant, opts = {}) {
  const record = opts.record || null;
  const seed = seedOf(`debris:${variant || (record && record.id) || 0}`);
  const g = new THREE.Group();
  g.userData.realSizeM = 0.3;
  const geo = new THREE.IcosahedronGeometry(0.5, 0);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 0.45 + 1.15 * hash01(seed + i * 977);
    v.multiplyScalar(k);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  // a shard, not a pebble: squash one axis hard
  geo.scale(1.0, 0.35 + 0.4 * hash01(seed + 3), 0.6 + 0.5 * hash01(seed + 7));
  geo.computeVertexNormals();
  g.add(mesh(geo, CLASS_COLOURS.debris, 'body', 'shard'));
  return g;
}

// --------------------------------------------------------------------------- soyuz and progress

/**
 * Soyuz MS, Progress MS, Shenzhou and Tianzhou: four vehicles on one plan -- modules in a line and
 * one pair of wings on the service module -- each built from its own published metres.
 *
 * WHAT IS PUBLISHED (read 2026-10-06 from each vehicle's Wikipedia infobox, which cites the
 * operator: RSC Energia for the two Russian craft, CMSA papers for the two Chinese ones):
 *   Soyuz MS     7.48 m long, 2.72 m across the service module's skirt, 10.7 m across the wings.
 *                Orbital module 2.26 m, descent module 2.17 m.
 *   Progress MS  7.23 m long (Energia; the infobox rounds to 7.4), 2.72 m, 10.6 m across.
 *   Shenzhou     9.25 m long, 2.8 m across, about 17 m across the wings.
 *   Tianzhou     10.6 m long, 3.35 m across the cargo module, 14.9 m across the wings.
 * How each length is SHARED between the modules is read off photographs (Wikimedia Commons
 * categories "Soyuz MS", "Progress MS", "Shenzhou spacecraft", "Tianzhou spacecraft") and is ours:
 * the rows below add up to the published total, and tests/test_station_shapes.mjs holds the three
 * overall numbers to 6 %.
 *
 * THE RECOGNITION. Soyuz: a ball, a bell and a drum -- the descent module is the only bell-shaped
 * crew cabin that visits a station, and the white radiator band round the drum is what a
 * photograph of one shows first. Progress: the same drum and wings with a blunt cargo can and NO
 * bell. Shenzhou: the same plan a fifth larger, a cylinder where Soyuz has a ball; its orbital
 * module lost its own pair of wings with Shenzhou 8 (2011), so the two pairs this used to draw
 * were a spacecraft that last flew in 2008. Tianzhou: one fat white cylinder and a narrower
 * engine section.
 */
const SOYUZ_FAMILY = {
  soyuz: {
    len: 7.48, span: 10.7, wing: [1.4, 4], wingAt: [1.1, 1.61],
    rows: [
      [1.36, 1.1, 0.96, HULL_GREY, 'foil', 'skirt'],
      [1.1, 1.1, 1.3, RADIATOR, 'radiator', 'service'],
      [1.085, 1.085, 0.18, CHARRED, 'body', 'heatshield'],
      [1.085, 0.62, 2.06, '#6F746C', 'body', 'descent'],
    ],
    ball: 1.13, // the orbital module, a sphere 2.26 m across
    nose: [[0.4, 0.4, 0.5, METAL, 'body', 'docking'], [0.1, 0.06, 0.22, METAL, 'body', 'probe']],
  },
  progress: {
    len: 7.23, span: 10.6, wing: [1.4, 4], wingAt: [1.1, 1.83],
    rows: [
      [1.36, 1.1, 0.96, HULL_GREY, 'foil', 'skirt'],
      [1.1, 1.1, 1.75, RADIATOR, 'radiator', 'service'],
      [1.1, 1.0, 1.5, '#4C514B', 'body', 'tanks'],
      [1.1, 1.1, 1.6, BLANKET, 'body', 'cargo'],
      [1.1, 0.75, 0.7, BLANKET, 'body', 'cargo-dome'],
    ],
    nose: [[0.4, 0.4, 0.5, METAL, 'body', 'docking'], [0.1, 0.06, 0.22, METAL, 'body', 'probe']],
  },
  shenzhou: {
    len: 9.25, span: 17, wing: [2.0, 4], wingAt: [1.25, 1.92],
    rows: [
      [1.4, 1.25, 0.9, HULL_GREY, 'foil', 'skirt'],
      [1.25, 1.25, 2.04, HULL_WHITE, 'radiator', 'service'],
      [1.26, 1.26, 0.15, CHARRED, 'body', 'heatshield'],
      [1.26, 0.75, 2.35, '#8E9196', 'body', 'descent'],
      [1.125, 1.125, 2.8, HULL_WHITE, 'body', 'orbital'],
    ],
    nose: [[0.6, 0.6, 0.7, METAL, 'body', 'docking'], [0.45, 0.4, 0.31, METAL, 'body', 'probe']],
  },
  tianzhou: {
    len: 10.6, span: 14.9, wing: [2.2, 3], wingAt: [1.4, 1.65],
    rows: [
      [1.4, 1.4, 3.3, HULL_GREY, 'radiator', 'service'],
      [1.4, 1.675, 0.6, HULL_WHITE, 'body', 'shoulder'],
      [1.675, 1.675, 5.7, HULL_WHITE, 'body', 'cargo'],
      [1.675, 0.8, 0.5, HULL_WHITE, 'body', 'cargo-dome'],
    ],
    nose: [[0.6, 0.6, 0.35, METAL, 'body', 'docking'], [0.45, 0.4, 0.15, METAL, 'body', 'probe']],
  },
};
function buildSoyuzFamily(variant) {
  const f = SOYUZ_FAMILY[variant] || SOYUZ_FAMILY.soyuz;
  const g = new THREE.Group();
  g.userData.realSizeM = f.span; // across the wings, the longest dimension
  const S = 1 / f.span; // metres -> the unit box
  const hull = hullGroup();
  g.add(hull);
  const z0 = -f.len / 2;
  let z = zstack(hull, z0, S, 16, f.rows);
  if (f.ball) {
    // Soyuz's orbital module: a ball, and a small dish for the Kurs rendezvous radio on top of it.
    const ball = mesh(new THREE.SphereGeometry(f.ball * S, 16, 12), BLANKET, 'body', 'orbital');
    ball.position.z = (z + f.ball) * S;
    hull.add(ball);
    const kurs = dish(0.2 * S, 0.07 * S, 10, METAL, 'foil', 'antenna');
    kurs.position.set(0, (f.ball - 0.02) * S, (z + f.ball + 0.3) * S);
    hull.add(kurs);
    z += f.ball * 2;
  }
  zstack(hull, z, S, 12, f.nose);
  // The wings, rooted ON the service module and derived from the published span: 2 x (hull radius
  // + wing) is the span by construction, so the two cannot drift apart (they once had, by 27 %).
  const [rootR, rootZ] = f.wingAt;
  const [wingW, panels] = f.wing;
  for (const side of [-1, 1]) {
    const w = segWing((f.span / 2 - rootR) * S, wingW * S, panels, side > 0 ? 'wing+' : 'wing-');
    if (side < 0) w.rotation.y = Math.PI;
    w.position.set(side * rootR * S, 0, (z0 + rootZ) * S);
    g.add(w);
  }
  return g;
}

// -------------------------------------------------------------------------------------- iridium

/**
 * A solar sail, drawn for ACS3 -- NASA's Advanced Composite Solar Sail System, NORAD 59588, on the
 * `visual` layer because a sail is a very large very bright flat thing and that is the whole point
 * of it.
 *
 * NASA rejected its own model for this. `3D Models/Solar Sail Concept` is public domain and ships
 * an OCTAGON; ACS3 is a square with booms along the diagonals, and an octagon is not a square. A
 * procedural shape built from NASA's own published numbers is closer to the object than NASA's own
 * drawing of a different object, which is the whole argument requirement 3 is making.
 *
 * PUBLISHED NUMBERS (nasa.gov/mission/acs3): the sail is "approximately 860 square feet (80 square
 * meters)", "approximately 30 feet (about 9 meters) on a side", spread by composite booms "spanning
 * the diagonal of the square (23 feet or about 7 meters in length)", from a bus the size of a
 * microwave. So: a 9 m square, four boom arms to the corners, and a bus small enough that the sail
 * is the object.
 *
 * `realSizeM` is the DIAGONAL, 12.73 m, because that is the longest dimension and every other
 * builder here reports the longest dimension. The side is the number a person can feel and it is
 * on the card from the record, not from here.
 */
const SAIL_SIDE_M = 9;
function buildSolarSail() {
  const g = new THREE.Group();
  const diagonal = SAIL_SIDE_M * Math.SQRT2;
  g.userData.realSizeM = diagonal;
  // Normalised on the DIAGONAL, so the diagonal is 1 and the side is 1/sqrt(2).
  const side = 1 / Math.SQRT2;

  // The film, as four triangular quadrants rather than one square, because that is how a square
  // sail is actually made and the seams between them are the only thing on it to see. Each
  // quadrant is a right triangle from the centre to one edge.
  for (const a of [0, 1, 2, 3]) {
    const tri = new THREE.Shape();
    tri.moveTo(0, 0);
    tri.lineTo(side / 2, side / 2);
    tri.lineTo(-side / 2, side / 2);
    tri.closePath();
    // Extruded rather than a flat ShapeGeometry, so it is a closed solid with two faces. A
    // single-sided plane is invisible from behind, and a sail is a sheet a camera goes round.
    const geo = new THREE.ExtrudeGeometry(tri, { depth: 0.004, bevelEnabled: false });
    const quad = mesh(geo, '#E8E4D8', 'foil', 'quadrant');
    quad.rotation.z = (a * Math.PI) / 2;
    quad.position.z = a % 2 ? 0.0025 : -0.0025; // a hair apart, so the seams read as seams
    g.add(quad);
  }

  // TWO booms, spanning the diagonals -- NASA's own words. Each runs corner to corner, so each is
  // the full diagonal, which is 1 by construction. They sit proud of the film on the sunward side.
  for (const a of [0, 1]) {
    const boom = cyl(0.007, 0.007, 1, 6, '#4A4A52', 'body', 'boom');
    boom.rotation.z = Math.PI / 2;
    const pivot = new THREE.Group();
    pivot.rotation.z = Math.PI / 4 + (a * Math.PI) / 2;
    pivot.position.z = 0.008;
    pivot.add(boom);
    g.add(pivot);
  }
  // The bus: a 12U CubeSat, about 0.2 x 0.2 x 0.3 m against a 9 m sail, so it is a speck. Drawn a
  // little larger than true because one pixel is not a spacecraft -- and that exaggeration is the
  // same one every model here makes, since size on screen encodes class and never true size.
  const bus = box(0.075, 0.075, 0.05, FOIL, 'foil', 'bus');
  bus.position.z = -0.03;
  g.add(bus);
  return g;
}

/**
 * A OneWeb, as a family shape: a small box bus between two wings, with flat horn apertures on the
 * Earth face and -- again -- NO PARABOLIC DISH.
 *
 * 651 objects, the largest population left after Starlink, and every one of them was drawn as
 * buildSatelliteComms, whose silhouette is roughly forty per cent parabolic dish. OneWeb's user
 * link is Ku-band through fixed horn apertures on the nadir face, with small steerable Ka-band
 * gateway antennas beside them; there is no big dish on it to draw.
 *
 * THE SOURCING HERE IS WEAKER THAN ANYWHERE ELSE IN THIS FILE, and that is why this paragraph is
 * long. Airbus publishes the Arrow platform without dimensions. What is reported, consistently but
 * always hedged, is a box "approximately 1 m x 1 m x 1.3 m", about 150 kg, and two deployable
 * panels spanning "approximately 6 m". The 2021 AMOS paper that characterised the constellation
 * photometrically (Johnson et al.) declined to give numbers at all, saying only that "the OneWeb
 * Arrow satellite bus has a more complex prismatic shape compared to the Starlink satellite".
 *
 * So the METRES below are approximate and the comment says so rather than letting them harden into
 * fact by being in the geometry. What is NOT approximate, and is the whole reason this shape
 * exists, is the silhouette: a box, two wings, a flat Earth-facing antenna face, and no dish.
 * `generic: true`, and the card says "the kind of thing, not this exact one".
 */
const ONEWEB_SPAN_M = 6; // approximate -- see above
function buildOneWeb() {
  const g = new THREE.Group();
  g.userData.realSizeM = ONEWEB_SPAN_M;
  const S = 1 / ONEWEB_SPAN_M;

  // The bus, roughly 1 x 1 x 1.3 m, long axis at the world so the antenna face is nadir.
  const bus = box(1.0 * S, 1.0 * S, 1.3 * S, '#E6EAF0', 'body', 'bus');
  g.add(bus);
  // The Earth face: two rectangular Ku-band horn apertures, and two small steerable Ka-band
  // reflectors beside them. Small ones: a gateway dish on this spacecraft is the size of a dinner
  // plate, not the half-metre parabola the generic comms shape was giving it.
  for (const x of [-0.26, 0.26]) {
    const horn = box(0.38 * S, 0.5 * S, 0.16 * S, '#2C323C', 'panel', 'ku-horn');
    horn.position.set(x * S, 0, 0.72 * S);
    g.add(horn);
  }
  for (const x of [-0.3, 0.3]) {
    const gw = dish(0.14 * S, 0.05 * S, 10, '#C9CFD8', 'foil', 'ka-gateway');
    gw.position.set(x * S, 0.36 * S, 0.7 * S);
    g.add(gw);
  }

  // Two wings to the ~6 m span: (6 - 1.0) / 2 = 2.5 m each.
  const pivot = new THREE.Group();
  pivot.name = 'panelPivot';
  for (const side of [-1, 1]) {
    const w = segWing(2.5 * S, 1.0 * S, 3, side > 0 ? 'wing+' : 'wing-');
    if (side < 0) w.rotation.y = Math.PI;
    w.position.set(side * 0.5 * S, 0, 0);
    pivot.add(w);
  }
  g.add(pivot);
  g.userData.panelPivots = [pivot];
  return g;
}

/**
 * A Starlink, in its two generations -- 11 131 objects in the catalogue the app fetches, sixty-seven
 * per cent of everything in it, and until now every one of them was a box with a parabolic dish.
 *
 * SPEC 0027 PUT THIS OUT OF SCOPE and gave a reason: "the only model found is CC BY on Sketchfab
 * behind a login and is the one-wing v1; 7 059 active are two-wing v2 Mini ... it needs Ivan's
 * download and a launch-date gate." The download was only ever needed for REAL GEOMETRY. A Starlink
 * is a flat rectangle and a solar array; drawing it procedurally needs nobody's licence, and the
 * launch-date gate is the other half, which is below.
 *
 * WHAT IS PUBLISHED, AND BY WHOM
 *   v1.0 / v1.5   "a flat panel design with a single solar panel", about 260 kg (Gunter's Space
 *                 Page, Starlink Block v1.0). ONE array is the fact that matters.
 *   v2 Mini       a body "over 4.1 meters wide", TWO arrays unfurling to "about 100 feet (30
 *                 meters)", each 52.5 m^2, 800 kg (Spaceflight Now, 2023-02-26). Gunter's adds that
 *                 the bus is "twice the size of the Starlink Block v1.5 satellites".
 *
 * THE ONE NUMBER HERE THAT NOBODY PUBLISHES is v1.5's span. SpaceX gives the v2 Mini's 30 m and not
 * its predecessor's. Nine metres is what this project draws it at, from the chassis plus the single
 * array; it is the least-sourced figure in this file and it is written down here rather than
 * quietly rounded into the geometry.
 *
 * THE SHAPE IS THE ABSENCE OF A SHAPE. There is no bus, no dish, no boom and no body: a Starlink is
 * a flat rectangle with a bigger flat rectangle hinged to it, which is why they stack like pizza
 * boxes inside a fairing and why a train of them looks like a string of beads rather than a string
 * of spacecraft. The phased-array panels tiling the chassis underside are the only feature on it.
 */
const STARLINK = {
  // [along the span, along the hinge]. THE ARRAY HANGS OFF THE LONG EDGE: SpaceX's v2 Mini figures
  // only close that way -- (30 - 2.7) / 2 = 13.65 m of array, and 13.65 x 3.85 m is the 52.5 m^2
  // Spaceflight Now quotes for each. Drawn off the short edge, as this was, the array came out
  // 4.2 m wide on a 2.7 m edge and 54 m^2. v1.5's numbers are still this project's own (above).
  v1: { span: 9, chassis: [1.4, 2.8], arrays: 1, arrayWidth: 2.6, panels: 12 },
  v2: { span: 30, chassis: [2.7, 4.1], arrays: 2, arrayWidth: 3.85, panels: 10 },
};
// THE ARRAY LENGTH IS DERIVED FROM THE SPAN, not written beside it: (span - chassis) / arrays.
for (const s of Object.values(STARLINK)) s.array = [(s.span - s.chassis[0]) / s.arrays, s.arrayWidth];
function buildStarlink(variant) {
  const g = new THREE.Group();
  const s = STARLINK[variant === 'starlink-v1' ? 'v1' : 'v2'];
  g.userData.realSizeM = s.span;
  const S = 1 / s.span;
  const [cw, cd] = s.chassis;
  const hull = hullGroup();
  g.add(hull);

  // The chassis: a slab lying flat to the Earth (+Z), thin enough that edge-on it nearly
  // disappears, which is true of the object.
  hull.add(box(cw * S, cd * S, 0.22 * S, '#E7EBF1', 'body', 'chassis'));
  // The Earth face: four phased-array tiles, and a small steerable gateway dish at each end.
  for (const [i, j] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const tile = box(cw * 0.44 * S, cd * 0.34 * S, 0.03 * S, '#242A34', 'panel', 'phased-array');
    tile.position.set(i * cw * 0.24 * S, j * cd * 0.19 * S, 0.125 * S);
    hull.add(tile);
  }
  for (const j of [-1, 1]) {
    const gw = dish(cd * 0.055 * S, cd * 0.02 * S, 10, '#C9CFD8', 'foil', 'ka-gateway');
    gw.position.set(0, j * cd * 0.435 * S, 0.14 * S);
    hull.add(gw);
  }

  // The array, or arrays: the whole difference between the generations and the reason for the
  // gate in realmodels.js. Drawn as the panels it unfolds from, because a Starlink in a
  // photograph is a ladder of dark rectangles before it is anything else.
  const pivot = new THREE.Group();
  pivot.name = 'panelPivot';
  const [al, aw] = s.array;
  for (const side of s.arrays === 2 ? [-1, 1] : [1]) {
    const wing = segWing(al * S, aw * S, s.panels, side > 0 ? 'wing+' : 'wing-');
    if (side < 0) wing.rotation.y = Math.PI;
    wing.position.set(side * cw * 0.5 * S, 0, 0);
    pivot.add(wing);
  }
  g.add(pivot);
  g.userData.panelPivots = [pivot];
  return g;
}

/**
 * A navigation satellite, as a family shape: a small box between two long wings, with a flat plate
 * of little horns on the Earth face and NO DISH ANYWHERE.
 *
 * THE MISSING DISH IS THE RECOGNITION. A communications satellite points a dish at one place and
 * pours a beam into it. A navigation satellite does the opposite: it has to be heard by everything
 * in view of it at once, so it carries a flat array of L-band elements covering the whole disc of
 * the Earth beneath it and nothing that concentrates. Until now all 130 of them were drawn as
 * buildSatelliteComms, whose whole silhouette is its parabolic dish -- the one feature these
 * spacecraft are defined by not having.
 *
 * ONE SHAPE, FOUR CONSTELLATIONS: 54 BeiDou, 32 GPS, 35 Galileo, 7 IRNSS, 5 QZSS, plus GLONASS by
 * id below. They differ -- GLONASS-M is a pressurised drum, GPS IIF is nearly twice Galileo's size,
 * BeiDou flies from geostationary as well as medium orbit -- and they agree about the box, the two
 * long wings and the flat array, which is what a family shape is for.
 *
 * PROPORTIONS from Galileo's Full Operational Capability satellite, the one ESA publishes plainly:
 * body "2.7 x 1.1 x 1.2 m", solar array span "13m" deployed, launch mass "700kg", an L-band antenna
 * for "the navigation signals in the 1200-1600 MHz frequency range". GPS Block IIF is larger and
 * GLONASS-M is a different shape entirely; the card says "the kind of thing, not this exact one".
 *
 * Source: ESA, "Galileo satellites" (esa.int).
 */
const NAV_SPAN_M = 13;
/**
 * ONE BUILDER, SIX SHAPES (public #429, 2026-10-08). The family box above was Galileo's and stood
 * for every constellation; GLONASS-M is a drum and a GPS IIF is half as big again, which is the
 * issue. Each row is [x across the wing roots, y, z along the Earth axis] of the body in metres,
 * the tip-to-tip span, and the wing's width and panel count.
 *
 * WHAT WAS READ ON 2026-10-08, AND HOW GOOD EACH NUMBER IS
 *   Galileo FOC   ESA, "Galileo satellites": "Spacecraft bus dimensions 2.7 x 1.1 x 1.2 m",
 *                 "Solar array span 13m". The maker's own page. Unchanged from the family shape.
 *   GPS IIF       body from the US Space Force fact sheet "GPS IIF" (losangeles.spaceforce.mil;
 *                 the page refuses a plain fetch, so its "Size: 98 in wide, 80 in deep, 88 in high"
 *                 and "3-Panel ... Solar Arrays" were read in a search engine's extract): 2.49 x
 *                 2.03 x 2.24 m. SPAN 18 m from keeptrack.space/satellite/37753, a catalogue
 *                 site and not the maker: "spans 18 meters when its solar arrays are deployed".
 *   GPS III       body from the same service's "GPS III" fact sheet, read the same way: "97 in
 *                 wide, 70 in deep, 134 in high", 2.46 x 1.78 x 3.40 m. SPAN 14 m from
 *                 keeptrack.space/satellite/46826 ("a span of 14 meters"), catalogue again.
 *   GLONASS-M     a pressurised DRUM. ESA's table of radiating areas (Dilssner et al., IGS
 *                 Workshop 2018, files.igs.org/pub/resource/pubs/workshop/2018/IGSWS-2018-PY02-03.pdf,
 *                 slide 4) gives "GLONASS-M 4.20 [x-panel, m2] 1.66 [z-panel, m2]": an end of 1.66
 *                 m2 is a circle 1.45 m across, and a side of 4.20 m2 is then 2.9 m long. That
 *                 arithmetic is ours. keeptrack.space/satellite/43687 says "a diameter of 1.5
 *                 meters and a span of 7.8 meters", which agrees on the drum and gives the span.
 *   GLONASS-K     an unpressurised box. keeptrack.space/satellite/40315 only: "a length of 2
 *                 meters, diameter of 1 meter, and span of 5 meters". The weakest row here.
 *   BeiDou-3 MEO  (the CAST build) the same ESA slide: "BDS-3M CAST 1.22 [x] 2.25 [z]" and
 *                 "Rectangular shape with a ratio of about 2:1 for main body axes";
 *                 keeptrack.space/satellite/43707 gives "2.2 meters in length ... a span of 10
 *                 meters". A 2.2 x 1.02 x 1.19 m box has both of ESA's areas; the split is ours.
 * The wings' WIDTHS are not on any of these pages and are drawn in proportion. GPS IIR, BeiDou's
 * geostationary and inclined craft, IRNSS and QZSS have no row and keep the family box. Every
 * route to these says `generic: true`, so the card still reads "the kind of thing".
 */
const NAV_SHAPES = {
  navigation: { span: NAV_SPAN_M, bus: [1.1, 1.2, 2.7], wingW: 1.4, panels: 0 },
  'navigation-gps-iif': { span: 18, bus: [2.03, 2.49, 2.24], wingW: 2.0, panels: 3 },
  'navigation-gps-iii': { span: 14, bus: [1.78, 2.46, 3.4], wingW: 2.1, panels: 4 },
  'navigation-glonass-m': { span: 7.8, drum: [1.45, 2.9], wingW: 1.5, panels: 3 },
  'navigation-glonass-k': { span: 5, bus: [1, 1, 2], wingW: 0.95, panels: 2 },
  'navigation-beidou-meo': { span: 10, bus: [1.02, 2.2, 1.19], wingW: 1.5, panels: 3 },
};
function buildNavSatellite(variant) {
  const row = (typeof variant === 'string' && Object.prototype.hasOwnProperty.call(NAV_SHAPES, variant) && NAV_SHAPES[variant]) || NAV_SHAPES.navigation;
  const g = new THREE.Group();
  g.userData.realSizeM = row.span;
  const S = 1 / row.span;
  const hull = hullGroup();
  g.add(hull);

  // The body, long axis along Z so the Earth face is where the attitude puts it.
  const [bx, by, bz] = row.drum ? [row.drum[0], row.drum[0], row.drum[1]] : row.bus;
  if (row.drum) {
    hull.add(zcyl(bx / 2 * S, bx / 2 * S, bz * S, 0, 18, '#D9DEE6', 'body', 'drum'));
    // The band of thermal louvres round a pressurised bus: the one mark a plain drum has.
    hull.add(zcyl(bx / 2 * 1.02 * S, bx / 2 * 1.02 * S, bz * 0.22 * S, -bz * 0.12 * S, 18, '#9BA6B4', 'foil', 'louvres'));
  } else {
    hull.add(box(bx * S, by * S, bz * S, '#E4E9F0', 'body', 'bus'));
  }

  // The navigation antenna: a dark plate on the Earth face (+Z) carrying a ring of short helical
  // elements. Twelve, which is GPS's count; the others' arrays are a different pattern and the
  // same idea, and neither is legible at hero size (amendment 3 to spec 0027 has the measurement).
  const pw = Math.min(bx, by) * 0.9;
  const plate = row.drum
    ? zcyl(pw / 2 * S, pw / 2 * S, 0.12 * S, (bz / 2 + 0.05) * S, 18, '#2B313C', 'body', 'l-band')
    : box(bx * 0.91 * S, by * 0.88 * S, 0.12 * S, '#2B313C', 'body', 'l-band');
  if (!row.drum) plate.position.z = (bz / 2 + 0.05) * S;
  g.add(plate);
  const horns = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const ring = (i < 4 ? 0.2 : 0.38) * pw;
    horns.push([Math.cos(a) * ring * S, Math.sin(a) * ring * S, (bz / 2 + 0.1) * S, Math.cos(a) * ring * S, Math.sin(a) * ring * S, (bz / 2 + 0.44) * S]);
  }
  g.add(tubes(horns, 0.05 * pw * S, 5, METAL, 'foil', 'element'));

  // Two wings out to the published span.
  const each = (row.span - bx) / 2;
  const pivot = new THREE.Group();
  pivot.name = 'panelPivot';
  for (const side of [-1, 1]) {
    const w = row.panels
      ? segWing(each * S, row.wingW * S, row.panels, side > 0 ? 'wing+' : 'wing-')
      : panelWing(each * S, row.wingW * S, METAL, side > 0 ? 'wing+' : 'wing-');
    if (side < 0) w.rotation.y = Math.PI;
    w.position.set(side * (bx / 2) * S, 0, 0);
    pivot.add(w);
  }
  g.add(pivot);
  g.userData.panelPivots = [pivot];
  return g;
}

/**
 * A 1U and a 2U CubeSat at the specification's own size (public #422, 2026-10-08).
 *
 * The CubeSat Design Specification rev. 14.1 (cubesat.org, the PDF of 2022-02-09, read
 * 2026-10-08) gives the length of a 1U as "113.5 +/-0.1mm" and of a 2U as "227.0 +/-0.2mm" on a
 * 100 x 100 mm section, and says "Rails shall have a minimum width of 8.5mm". That is the whole
 * shape: a body, four rails, cells on the four long faces. No wings and no antenna are drawn,
 * because the standard has none and no operator's 1U is being claimed.
 *
 * NASA's "CubeSat - 1 RU Generic" and "2 RU Generic" meshes were asked for. No record on the map
 * is a 1U or a 2U today (Flock and Lemur are 3U, Starling is 6U), so nothing routes here: these
 * two are in the builder table for the first record that is one, and on the shape sheet.
 */
function buildCubeSatSmall(variant) {
  const len = variant === 'cubesat-2u' ? 0.227 : 0.1135;
  const g = new THREE.Group();
  g.userData.realSizeM = len;
  const S = 1 / len;
  const hull = hullGroup();
  g.add(hull);
  hull.add(box(0.1 * S, 0.1 * S, len * S, '#DCE2EA', 'body', 'bus'));
  const rails = [];
  for (const [x, y] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) rails.push([0.0085 * S, 0.0085 * S, len * S, x * 0.04625 * S, y * 0.04625 * S, 0]);
  hull.add(slabs(rails.map(([w, h, d, x, y, z]) => [w * 1.08, h * 1.08, d, x, y, z]), METAL, 'foil', 'rail'));
  // Cells on the four long faces, one pane a unit, set a hair proud of the skin.
  const cells = [];
  const units = Math.round(len / 0.1135);
  for (let u = 0; u < units; u++) {
    const z = (-len / 2 + 0.1135 * (u + 0.5)) * S;
    for (const sgn of [-1, 1]) {
      cells.push([0.074 * S, 0.003 * S, 0.096 * S, 0, sgn * 0.0505 * S, z]);
      cells.push([0.003 * S, 0.074 * S, 0.096 * S, sgn * 0.0505 * S, 0, z]);
    }
  }
  hull.add(slabs(cells, PANEL_BLUE, 'panel', 'body-cells'));
  return g;
}

/**
 * A 3U CubeSat, and this is the one shape in this file that needs no fudging: a CubeSat is a
 * STANDARD, not a style. One unit is a 10 cm cube; a 3U is three of them in a row, 10 x 10 x 30 cm,
 * and every one that flies has to fit a dispenser built to that drawing. Where every other family
 * shape here is an average of spacecraft that merely resemble each other, this is the specification.
 *
 * 164 OF THEM, and they were all drawn as a 30-metre communications satellite with a parabolic dish.
 * Planet's Flock -- 94 Doves and SuperDoves imaging the whole land surface daily -- and Spire's 70
 * Lemurs are both 3U, and between them they are the largest population in this app outside Starlink.
 * The error was not subtle: the drawing was a hundred times the length of the object.
 *
 * THE RECOGNITION IS THE RATIO. A 3U is three times as long as it is wide, and the deployed panels
 * are bigger than the body, which is what makes it read as a brick with two flaps rather than as a
 * small satellite. The body is drawn at exactly 1:1:3 and is not rounded to look better.
 *
 * THE PANELS ARE NOT PART OF THE STANDARD, and that is the one thing here that is a choice rather
 * than a specification. The bus is fixed by the dispenser; what an operator hangs off it is not.
 * Doves and Lemurs both fly two deployable wings and neither publishes their size, so they are
 * drawn as a common double-deployable, 2U x 3U a side. Saying so here is the point -- the card
 * calls this "the kind of thing, not this exact one", and this paragraph is which part of it is
 * the kind of thing.
 *
 * `realSizeM` is the deployed span that follows from those numbers, 0.50 m, because every builder
 * here reports its longest dimension. The 30 cm body is the number a person can feel and it
 * belongs on the card.
 *
 * Sources: the CubeSat Design Specification's 100 x 100 x 113.5 mm unit; Planet's Dove and SuperDove
 * and Spire's LEMUR-2 are each published as 3U.
 */
function buildCubeSat(variant) {
  const g = new THREE.Group();
  // 3U: one unit across. 6U: two 3U stacks side by side, 0.2 m across (the CubeSat Design
  // Specification rev. 14's 6U is 100 x 226.3 x 366 mm; drawn on the same rounded 10 cm unit as
  // the 3U beside it, so the pair stay exactly 1 : 2).
  const six = variant === 'cubesat-6u';
  const bx = six ? 0.2 : 0.1;
  const SPAN_M = bx + 0.4; // the body plus a 0.20 m panel each side, deployed flat
  g.userData.realSizeM = SPAN_M;
  const S = 1 / SPAN_M;
  const hull = hullGroup();
  g.add(hull);

  // The body, long axis along Z so `sun-panels` attitude puts its end at the world -- which is
  // where the camera on a Dove points.
  hull.add(box(bx * S, 0.1 * S, 0.3 * S, '#DCE2EA', 'body', 'bus'));
  // The rails that make it a CubeSat rather than a box: the dispenser runs on them.
  for (const [x, y] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const rail = box(0.014 * S, 0.014 * S, 0.3 * S, METAL, 'foil', 'rail');
    rail.position.set(x * (bx / 2 - 0.007) * S, y * 0.043 * S, 0);
    hull.add(rail);
  }
  // Body-mounted cells on the two faces the wings do not cover, set a hair into the skin.
  for (const y of [-1, 1]) {
    const cells = box((bx - 0.034) * S, 0.004 * S, 0.27 * S, PANEL_BLUE, 'panel', 'body-cells');
    cells.position.y = y * 0.048 * S;
    hull.add(cells);
  }
  // The optic, on one end: the only feature on the body worth drawing.
  const optic = cyl(0.035 * S, 0.035 * S, 0.01 * S, 10, '#2A2E36', 'body', 'boresight');
  optic.rotation.x = Math.PI / 2;
  optic.position.z = 0.145 * S;
  hull.add(optic);

  // Two deployed panels, each 2U x 3U, flat out from the long sides.
  const pivot = new THREE.Group();
  pivot.name = 'panelPivot';
  for (const side of [-1, 1]) {
    const wing = segWing(0.2 * S, 0.3 * S, 2, side > 0 ? 'wing+' : 'wing-');
    if (side < 0) wing.rotation.y = Math.PI;
    wing.position.set(side * (bx / 2) * S, 0, 0);
    pivot.add(wing);
  }
  g.add(pivot);
  g.userData.panelPivots = [pivot];

  // A whip antenna, because a CubeSat's radio is a tape measure and it is the only thing sticking
  // out. Kept inside the body's own width so the box the test measures is still the body.
  const whip = cyl(0.004 * S, 0.004 * S, 0.09 * S, 5, METAL, 'body', 'antenna');
  whip.rotation.z = Math.PI / 2;
  whip.position.set(0, 0.03 * S, -0.14 * S);
  g.add(whip);
  return g;
}

/**
 * The OTHER kind of radar imager: a small bus under a big ribbed umbrella.
 *
 * buildRadarImager draws the flat side-looking blade that twenty-seven rows share. These twenty-five
 * spacecraft do the same job by the opposite means -- Capella, Umbra and iQPS each unfurl a
 * PARABOLIC MESH REFLECTOR on radial ribs, which is a dish, and giving them the blade would be the
 * same error as giving a navigation satellite a dish, run backwards. #105 left them deliberately
 * generic and said the umbrella was a shape nobody had drawn here yet. This is it.
 *
 * THE RIBS ARE WHY IT IS NOT THE COMMS DISH. A communications parabola is a solid, smooth,
 * Earth-pointing shell. This is a mesh stretched over spokes, folded like an umbrella for launch
 * and sprung open in orbit, and it is offset-fed -- the feed sits out to the side on a boom rather
 * than in the middle of the aperture. At 84 px the spokes and the off-centre feed are what separate
 * it from bus-ssl1300's dish, so both are drawn and neither is decoration.
 *
 * SIZE from Capella, the one published plainly: "a 3.5 meter deployed mesh-based reflector
 * antenna". iQPS describes a "deployable wrapped-rib parabolic mesh reflector" without giving its
 * diameter, and Umbra publishes neither, so 3.5 m is Capella's number standing for the family and
 * `generic: true` says as much on every card.
 */
const MESH_REFLECTOR_M = 3.5;
function buildMeshReflector() {
  const g = new THREE.Group();
  g.userData.realSizeM = MESH_REFLECTOR_M;
  const S = 1 / MESH_REFLECTOR_M;

  // The reflector, facing +Z, which the `sun-panels` attitude points at the world. Darker than a
  // communications parabola because it is a mesh: it scatters where a solid shell would glare.
  const shell = dish(1.75 * S, 0.5 * S, 18, '#9AA3AF', 'foil', 'reflector');
  shell.position.z = 0.2 * S;
  g.add(shell);
  // Radial ribs, twelve of them, lying ON the face and running a little past the rim -- a
  // wrapped-rib reflector really does have its rib tips proud of the mesh. In front of the shell
  // rather than behind it: the first version put them at z below the dish's own surface and they
  // were invisible, which is the whole feature gone.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rib = box(1.9 * S, 0.05 * S, 0.05 * S, '#EEF2F7', 'body', 'rib');
    rib.position.set(Math.cos(a) * 0.95 * S, Math.sin(a) * 0.95 * S, 0.42 * S);
    rib.rotation.z = a;
    g.add(rib);
  }
  // The hub the ribs spring from.
  const hub = cyl(0.14 * S, 0.18 * S, 0.16 * S, 10, METAL, 'body', 'hub');
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.28 * S;
  g.add(hub);

  // The bus, behind the reflector and much smaller: these are 100 kg class spacecraft whose
  // antenna is most of what there is.
  const bus = box(0.55 * S, 0.55 * S, 0.7 * S, FOIL, 'foil', 'bus');
  bus.position.z = -0.55 * S;
  g.add(bus);
  // The deployment mast the reflector rides on. Without it the reflector, its ribs, its hub and
  // its feed were one object and the bus and its wing were another, 0.4 m apart with nothing
  // drawn between them -- and a reflector this size really does stand off its bus on a stem.
  const stem = cyl(0.07 * S, 0.07 * S, 0.45 * S, 8, METAL, 'body', 'stem');
  stem.rotation.x = Math.PI / 2;
  g.add(stem);

  // The feed, OFF TO THE SIDE on a boom -- an offset feed, not a centre one. This is the detail
  // that says "radar" rather than "television".
  const boom = cyl(0.025 * S, 0.025 * S, 1.3 * S, 6, METAL, 'body', 'feed-boom');
  boom.rotation.x = Math.PI / 2;
  boom.position.set(-0.8 * S, 0, 0.55 * S);
  g.add(boom);
  const feed = cyl(0.11 * S, 0.16 * S, 0.22 * S, 10, '#3A4048', 'body', 'feed');
  feed.rotation.x = -Math.PI / 2;
  feed.position.set(-0.8 * S, 0, 1.15 * S);
  g.add(feed);

  // One wing. A Capella carries its cells on a single deployed panel behind the reflector.
  const pivot = new THREE.Group();
  pivot.name = 'panelPivot';
  const wing = panelWing(1.5 * S, 0.55 * S, METAL, 'wing');
  wing.position.set(0.3 * S, 0, -0.55 * S);
  pivot.add(wing);
  g.add(pivot);
  g.userData.panelPivots = [pivot];
  return g;
}

/**
 * A radar-imaging satellite, as a family shape: a long flat blade of an antenna, a small bus behind
 * it, and the blade AIMED OFF TO ONE SIDE rather than straight down.
 *
 * THE SIDEWAYS LOOK IS THE RECOGNITION, and it is not decoration. A synthetic-aperture radar cannot
 * image what is directly beneath it -- the returns from left and right of the ground track would
 * arrive at the same instant and could not be told apart -- so every SAR ever flown squints. That
 * one fact is why these spacecraft all look alike and why none of them looks like the box-with-a-
 * dish they were all drawn as until now.
 *
 * Ninety-odd of them are in the catalogue and they span forty-eight years. SEASAT, 1978, is the
 * first civilian synthetic-aperture radar ever flown and its antenna is "a 10.74-m by 2.16-m planar
 * array"; Sentinel-1's, in 2014, is 12.3 x 0.821 m. Between them: RADARSAT-1, -2 and the RCM trio,
 * TerraSAR-X, TanDEM-X, PAZ, COSMO-SkyMed and its Second Generation, ALOS, ALOS-2, ALOS-4, SAOCOM,
 * ERS-1, Envisat, NovaSAR, Gaofen-3, and the commercial microsatellite fleets -- ICEYE at 3.25 m on
 * 85 kg, Synspective's StriX at about 5 m. They differ in how wide the blade is and how many wings
 * are behind it, and they agree about the blade, so one shape serves them all and the card says
 * "the kind of thing, not this exact one".
 *
 * THE ONES THAT DO NOT AGREE GET buildMeshReflector() INSTEAD -- Capella, Umbra, iQPS and the
 * RISAT-2B family unfurl a dish. Radar imaging is the job; the blade is one of two ways to do it.
 *
 * PROPORTIONS from Sentinel-1's C-SAR, the one ESA publishes plainly: 12.3 m x 0.821 m, on a
 * 2 300 kg spacecraft. That is 15:1, and it is the narrow end of the family -- ALOS-2's PALSAR-2 is
 * 9.9 x 2.9 m and RADARSAT-2's is 15 x 1.5 m -- so the blade here is drawn at Sentinel-1's length
 * and a little over its width, which is the compromise that still reads as a blade at 84 px
 * instead of vanishing into a line. Said here because the card cannot say it.
 *
 * Source: Copernicus SentiWiki, Sentinel-1 mission -- "12.3 m x 0.821 m" and "approximately
 * 2 300 kg".
 */
const SAR_ANTENNA_M = 12.3;
const SAR_SQUINT = 0.55; // radians off nadir -- about 31 degrees, the middle of the usual range
function buildRadarImager() {
  const g = new THREE.Group();
  g.userData.realSizeM = SAR_ANTENNA_M;
  const S = 1 / SAR_ANTENNA_M;

  // Everything that squints lives under one pivot, so the antenna and its spine stay parallel.
  const look = new THREE.Group();
  look.name = 'boresight';
  look.rotation.x = SAR_SQUINT;

  // The blade. Every length below is metres times S, so the numbers read as the spacecraft:
  // 12.3 m long, 0.06 m thick, and 1.2 m wide against Sentinel-1's published 0.821 -- see header.
  const panel = box(12.3 * S, 0.06 * S, 1.2 * S, '#D5DAE2', 'body', 'antenna');
  look.add(panel);
  // Three seams across it: a SAR antenna is a row of identical transmit/receive tiles, and that is
  // the only thing on its face.
  for (const t of [-3.1, 0, 3.1]) {
    const seam = box(0.12 * S, 0.08 * S, 1.26 * S, METAL, 'foil', 'seam');
    seam.position.set(t * S, 0.02 * S, 0);
    look.add(seam);
  }
  g.add(look);

  // The bus, on the sky side of the blade and much smaller than it.
  const bus = box(3.9 * S, 2.2 * S, 2.2 * S, FOIL, 'foil', 'bus');
  bus.position.y = -1.6 * S;
  g.add(bus);

  // Two wings, on the sky side, perpendicular to the blade so the silhouette is a cross rather
  // than a sheet: that is what tells a radar imager from the BlueBird sheet at a glance.
  const pivot = new THREE.Group();
  pivot.name = 'panelPivot';
  for (const side of [-1, 1]) {
    // panelWing builds along +X, so -90 degrees about Y sends it to +Z and +90 to -Z. Started
    // from the outside of the bus, or the first 2 m of wing is buried inside it.
    const w = panelWing(4.6 * S, 1.8 * S, METAL, side > 0 ? 'wing+' : 'wing-');
    w.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    w.position.set(0, -1.6 * S, side * 1.25 * S);
    pivot.add(w);
  }
  g.add(pivot);
  g.userData.panelPivots = [pivot];
  return g;
}

/**
 * A laser-ranging geodetic sphere: a solid ball studded with retroreflectors, no wings, no
 * antenna, no instrument, nothing that moves. Nine of them are up, they are the only spheres in
 * the catalogue, and until now every one was drawn as a box bus with a dish and two panels.
 *
 * AJISAI is on the `visual` layer and is the reason this exists: 2.15 m across and carrying 318
 * mirrors as well as its corner cubes, it FLASHES as it rotates, which is why a person outside can
 * see it. The rest -- LAGEOS 1 and 2, Starlette, Stella, LARES, Etalon 1 and 2, WESTPAC -- share
 * the plan and differ only in size, and size on screen encodes class here rather than metres, so
 * one shape serves all nine honestly.
 *
 * THE FACETS ARE THE MODEL. A smooth sphere reads as a moon. A faceted one reads as an object
 * built out of flat reflectors, which is exactly what these are, so the geometry is left
 * deliberately coarse and flat-shaded rather than smoothed.
 *
 * Sources: AJISAI 2.15 m and 318 mirrors from eoPortal's EGS page; the family's diameters from
 * their own mission pages. `realSizeM` is AJISAI's, the largest and the only one on `visual`.
 */
function buildGeodeticSphere() {
  const g = new THREE.Group();
  g.userData.realSizeM = 2.15;
  // IcosahedronGeometry at detail 1 is 80 flat faces -- enough to read as faceted at 84 px and a
  // twentieth of the triangles a smooth sphere would cost.
  const ball = mesh(new THREE.IcosahedronGeometry(0.5, 1), '#C9CED6', 'body', 'ball');
  g.add(ball);
  // A scatter of brighter corner-cube panels over it, so it is a ball MADE OF reflectors rather
  // than a ball painted grey. Twelve, at the icosahedron's own vertices, which is where a real
  // one's arrays cluster too.
  const t = (1 + Math.sqrt(5)) / 2;
  const verts = [];
  for (const [a, b] of [[1, t], [-1, t], [1, -t], [-1, -t]]) {
    verts.push([0, a, b], [a, b, 0], [b, 0, a]);
  }
  const r = 0.5 / Math.hypot(1, t);
  for (const v of verts) {
    const face = mesh(new THREE.CircleGeometry(0.075, 6), '#F2F5FA', 'panel', 'reflector');
    face.position.set(v[0] * r, v[1] * r, v[2] * r).multiplyScalar(1.02);
    face.lookAt(face.position.clone().multiplyScalar(2));
    g.add(face);
  }
  return g;
}

/**
 * An AST SpaceMobile BlueBird, as a family shape -- and the one shape on the visible layer whose
 * recognition is SIZE and FLATNESS rather than parts. There is no dish, no wing sticking out and
 * no bus worth seeing: it is a sheet. Nothing else a person can see from a garden looks like that.
 *
 * THE TWO FACES ARE THE WHOLE MODEL, and they are different on purpose. AST's own description of
 * the array: it is assembled from identical modules they call Microns -- 148 of them on Block 1 --
 * and "solar cells collect energy on one side, and on the other side, many small antennas form a
 * phased array". So the Earth-facing side is pale antenna tiling and the space-facing side is dark
 * blue cells, which is the reverse of every other satellite here, where the cells face the Sun on
 * wings and the Earth-facing side carries the instrument. Drawing both faces the same colour would
 * throw away the one thing that makes this spacecraft what it is.
 *
 * WHICH WAY IT FACES IS NOT A DRAWING CHOICE. updateModelAttitude points a satellite's body +Z at
 * the world, and these really do fly with the antenna at the phones, so +Z is the antenna side.
 *
 * PUBLISHED NUMBERS, and which one this is drawn from. Block 1 (SPACEMOBILE-001 to -005, launched
 * 2024-09-12) unfolds 64.38 m^2; the next-generation Block 2 unfolds "nearly 2,400 square feet",
 * about 223 m^2. Nine are on the visible layer today and they are NOT all the same size, so this
 * is the family shape at Block 1's published area and the card says "the kind of thing, not this
 * exact one". A Block 2 drawn at Block 1's metres would put a wrong number on the size chip, which
 * is worse than a family shape that admits what it is.
 *
 * THE SIDE IS DERIVED, NOT PUBLISHED: AST states the AREA, so 64.38 m^2 is drawn as a square
 * 8.02 m on a side. The array is built from identical square modules, so a square is the right
 * idealisation -- but it is ours, and this sentence is where that is admitted.
 *
 * Sources: BlueBird Block 1 on Gunter's Space Page (space.skyrocket.de/doc_sdat/bluebird-1.htm)
 * for 64.38 m^2 and ~1500 kg; ast-science.com/bluebird-1-5 for the 148 Microns and the two faces;
 * ast-science.com/next-gen-bluebird for the Block 2 area.
 */
const BLUEBIRD_SIDE_M = 8.02; // sqrt(64.38 m^2): the Block 1 array, as a square
const BLUEBIRD_ANTENNA = '#D7DDE6'; // the phased-array face: pale, matte, Earth-facing
function buildSpaceMobile() {
  const g = new THREE.Group();
  g.userData.realSizeM = BLUEBIRD_SIDE_M;

  // Two slabs back to back rather than one box, because the two faces are different materials and
  // a box has one. Together they are 24 mm thick on an 8 m square -- which is roughly true, and is
  // why this reads as a sheet from every angle except dead edge-on.
  const antenna = box(1, 1, 0.012, BLUEBIRD_ANTENNA, 'body', 'antenna-face');
  antenna.position.z = 0.006;
  g.add(antenna);
  const cells = box(1, 1, 0.012, PANEL_BLUE, 'panel', 'solar-face');
  cells.position.z = -0.006;
  g.add(cells);

  // The module grid, on the antenna side. Three ribs each way reads as "tiled" at 84 px; drawing
  // all 148 Microns would be 148 boxes nobody can resolve and a budget spent on nothing.
  for (let i = 1; i <= 3; i++) {
    const t = i / 4 - 0.5;
    const across = box(1, 0.016, 0.026, METAL, 'foil', 'rib');
    across.position.set(0, t, 0.012);
    g.add(across);
    const down = box(0.016, 1, 0.026, METAL, 'foil', 'rib');
    down.position.set(t, 0, 0.012);
    g.add(down);
  }
  // The frame, so the sheet has an edge instead of fading into the sky when it is near edge-on.
  for (const [x, y, w, h] of [[0, 0.5, 1, 0.028], [0, -0.5, 1, 0.028], [0.5, 0, 0.028, 1], [-0.5, 0, 0.028, 1]]) {
    const edge = box(w, h, 0.05, METAL, 'body', 'frame');
    edge.position.set(x, y, 0);
    g.add(edge);
  }

  // The bus, on the solar side: small, and that ratio is the recognition as much as the square is.
  // AST describe the stowed spacecraft as a phone booth and the deployed array as a studio flat.
  const bus = box(0.15, 0.15, 0.10, FOIL, 'foil', 'bus');
  bus.position.z = -0.062;
  g.add(bus);
  const boom = cyl(0.008, 0.008, 0.16, 6, METAL, 'body', 'boom');
  boom.rotation.x = Math.PI / 2;
  boom.position.z = -0.16;
  g.add(boom);
  return g;
}

/**
 * An Iridium NEXT satellite (Thales Alenia Space, 66 in service plus spares). Published by
 * Iridium's own fact sheet: a bus 3.1 x 2.4 x 1.5 m and 9.4 m across the two wings. What makes it
 * an Iridium is the main mission antenna, one large flat L-band panel covering the Earth face --
 * drawn on +Z, which is the face `sun-panels` attitude turns to the world. (It used to hang off
 * -Y, the side away from the Sun, pointing at nothing.) Which bus edge is which is read off
 * Thales's renders (Commons, "Iridium NEXT"): the 1.5 m is the depth under the antenna.
 * The first-generation birds still up shared the plan, so one shape serves the family and the
 * card says so.
 */
function buildIridium() {
  const g = new THREE.Group();
  g.userData.realSizeM = 9.4;
  const S = 1 / 9.4;
  const hull = hullGroup();
  g.add(hull);
  hull.add(box(2.4 * S, 3.1 * S, 1.5 * S, FOIL, 'foil', 'bus'));
  // The main mission antenna, and the two Ka-band feeder dishes beside it.
  const mma = box(1.9 * S, 2.9 * S, 0.1 * S, '#D5DAE1', 'body', 'antenna');
  mma.position.z = 0.8 * S;
  g.add(mma);
  for (const y of [-1, 1]) {
    const ka = dish(0.22 * S, 0.08 * S, 10, '#C9CFD8', 'foil', 'ka-feeder');
    ka.position.set(1.05 * S, y * 1.2 * S, 0.83 * S);
    g.add(ka);
  }
  // 2 x (1.2 + 3.5) is the published 9.4 m, so the wing is the one that starts at the bus.
  const pivot = new THREE.Group();
  pivot.name = 'panelPivot';
  for (const side of [-1, 1]) {
    const w = segWing(3.5 * S, 1.4 * S, 3, side > 0 ? 'wing+' : 'wing-');
    if (side < 0) w.rotation.y = Math.PI;
    w.position.set(side * 1.2 * S, 0, 0);
    pivot.add(w);
  }
  g.add(pivot);
  g.userData.panelPivots = [pivot];
  return g;
}

// --------------------------------------------------------------------------------------- dragon

/**
 * SpaceX's Dragon 2, crew or cargo: a blunt capsule on a trunk, and no wings at all -- the solar
 * cells are on the trunk's skin, which is the one thing that tells it from every other visitor.
 *
 * WHAT IS PUBLISHED. SpaceX (spacex.com/vehicles/dragon): 8.1 m tall with the trunk, 4 m across.
 * The trunk is 3.7 m long and 3.7 m across, which leaves 4.4 m of capsule (the Dragon 2 infobox on
 * Wikipedia, read 2026-10-06, gives 4.5 m for the capsule alone). The sidewall's 15 degrees is
 * read off NASA's photographs of the capsule docked (Commons, "Crew Dragon"), and so is where the
 * four engine pods and the windows sit.
 *
 * CREW AND CARGO DIFFER BY WHAT IS BOLTED ON, and both differences are visible from the station:
 * the crew vehicle has four SuperDraco pods standing proud of the sidewall, two windows between
 * them and four fins on the trunk for an abort; the cargo vehicle flies without the escape
 * engines, and so without the pods and the fins. No logo is drawn on either.
 */
function buildDragon(variant) {
  const cargo = variant === 'dragon-cargo';
  const g = new THREE.Group();
  g.userData.realSizeM = 8.1;
  const S = 1 / 8.1;
  const white = '#F1F3F6';
  const hull = hullGroup();
  g.add(hull);
  const z = zstack(hull, -4.05, S, 20, [
    [1.85, 1.85, 3.7, '#E9EDF2', 'radiator', 'trunk'],
    [2.0, 2.0, 0.2, CHARRED, 'body', 'heatshield'],
    [2.0, 1.22, 2.9, white, 'body', 'capsule'],
  ]);
  // The nose cone, closed: a dome 1.3 m tall on the 2.44 m hatch ring.
  const dome = new THREE.SphereGeometry(1.22 * S, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, 1.3 / 1.22, 1);
  const nose = mesh(dome, white, 'body', 'nose');
  nose.rotation.x = Math.PI / 2;
  nose.position.z = z * S;
  hull.add(nose);
  // Half the trunk's skin is solar cells -- the half turned to the Sun (+Y) -- a hair outside it.
  const cells = mesh(new THREE.CylinderGeometry(1.87 * S, 1.87 * S, 3.4 * S, 20, 1, true, Math.PI / 2, Math.PI), '#1F3A5F', 'panel', 'solar');
  cells.rotation.x = Math.PI / 2;
  cells.position.z = -2.2 * S;
  hull.add(cells);
  if (cargo) return g;
  // Things on the sidewall lean with it: a spoke turned to the right angle, and the part tipped
  // 15 degrees on the spoke.
  const onWall = (angle, part, r, zc) => {
    const spoke = new THREE.Group();
    spoke.rotation.z = angle;
    part.position.set(r * S, 0, zc * S);
    part.rotation.y = -0.262;
    spoke.add(part);
    g.add(spoke);
  };
  for (const a of [0.25, 0.75, 1.25, 1.75]) {
    onWall(a * Math.PI, box(0.34 * S, 0.7 * S, 1.9 * S, white, 'body', 'superdraco-pod'), 1.66, 1.05);
    const fin = box(0.45 * S, 0.06 * S, 1.4 * S, '#B9BFC7', 'foil', 'fin');
    const spoke = new THREE.Group();
    spoke.rotation.z = a * Math.PI;
    fin.position.set(2.075 * S, 0, -3.3 * S);
    spoke.add(fin);
    g.add(spoke);
  }
  for (const a of [0.42, 0.58]) onWall(a * Math.PI, box(0.06 * S, 0.3 * S, 0.36 * S, DARK_GLASS, 'panel', 'window'), 1.535, 1.6);
  return g;
}

// --------------------------------------------------------------------------------------- cygnus

/**
 * Northrop Grumman's Cygnus, the Enhanced vehicle: a pressurised drum, a short service module
 * behind it and two ROUND solar arrays -- the UltraFlex fans nothing else at the station has,
 * which is the whole recognition.
 *
 * WHAT IS PUBLISHED. Northrop Grumman's Cygnus fact sheet, as the Cygnus infobox on Wikipedia
 * cites it (read 2026-10-06): 6.39 m long and 3.07 m across for the Enhanced vehicle (the
 * Standard one was 5.14 m; Cygnus XL, flying since 2025, is 8 m and is NOT what this draws). The
 * fans are "an accordion fanfold array"; their 3.7 m diameter and the 11.5 m tip to tip are the
 * figures this file has carried since spec 0027 and are not on the page read today, so they are
 * the least-sourced numbers here. How the 6.39 m is shared between the modules is read off NASA's
 * photographs of it berthed (Commons, "Cygnus (spacecraft)").
 *
 * THE FANS ARE DRAWN AS GORES. A flat disc reads as a coin; an UltraFlex is twenty pleated
 * wedges, and alternating two blues is what makes it a fan at forty pixels (issue #423).
 */
function buildCygnus() {
  const g = new THREE.Group();
  g.userData.realSizeM = 11.5; // across the fans, the longest dimension
  const S = 1 / 11.5;
  const hull = hullGroup();
  g.add(hull);
  const z0 = -6.39 / 2;
  const svcZ = z0 + 0.65;
  hull.add(zcyl(1.1 * S, 1.1 * S, 1.3 * S, svcZ * S, 8, '#B9BFC7', 'foil', 'service'));
  zstack(hull, z0 + 1.3, S, 18, [
    [1.1, 1.535, 0.35, HULL_WHITE, 'body', 'aft-cone'],
    [1.535, 1.535, 3.89, HULL_WHITE, 'body', 'cargo'],
    [1.535, 1.0, 0.5, HULL_WHITE, 'body', 'fwd-cone'],
    [1.0, 1.0, 0.35, METAL, 'body', 'hatch'],
  ]);
  // Two seams round the drum: the module is welded from rings, and they are what a photograph shows.
  for (const dz of [1.3, 2.6]) hull.add(zcyl(1.548 * S, 1.548 * S, 0.07 * S, (z0 + 1.65 + dz) * S, 18, METAL, 'foil', 'seam'));
  // The fans, on short booms off the service module, turning about the boom to face the Sun.
  // 2 x (1.1 hull + 0.95 boom + 3.7 fan) is the 11.5 m tip to tip.
  const pivot = new THREE.Group();
  pivot.name = 'panelPivot';
  pivot.position.z = svcZ * S;
  for (const side of [-1, 1]) {
    const boom = cyl(0.06 * S, 0.06 * S, 0.95 * S, 6, METAL, 'body', 'boom');
    boom.rotation.z = Math.PI / 2;
    boom.position.x = side * 1.575 * S;
    pivot.add(boom);
    for (const parity of [0, 1]) {
      const fan = goreFan(1.85 * S, 20, parity, parity ? '#2B4C7E' : '#1F3A5F', side > 0 ? 'wing+' : 'wing-');
      fan.position.x = side * 3.9 * S;
      pivot.add(fan);
    }
  }
  g.add(pivot);
  g.userData.panelPivots = [pivot];
  return g;
}

// ------------------------------------------------------------------------------------- tiangong

/**
 * China's Tiangong: a T of three modules. Tianhe, the core, runs fore and aft; Wentian and
 * Mengtian, the two laboratories, stand out port and starboard from the docking hub at its front,
 * each carrying a pair of very long wings on a truss at its far end.
 *
 * WHAT IS PUBLISHED (the modules' and the station's Wikipedia infoboxes, read 2026-10-06, which
 * cite CMSA and the 2022 configuration paper in Spacecraft Engineering):
 *   Tianhe    16.6 m long, 4.2 m across its large section
 *   Wentian   17.9 m long, 4.2 m across; Mengtian the same
 *   the laboratories' wings   "a wingspan of over 55 m", 110 m^2 of cells each side
 *   the station               about 55.6 m one way and about 39 m the other
 * So 55.6 m is the wings, tip to tip, and the 39 m is two laboratories and the hub between them:
 * 2 x 17.9 + 2.8 = 38.6. The model is built to those two numbers and the test holds them.
 *
 * WHAT IS NOT PUBLISHED AND IS READ OFF PICTURES (Commons, "Tiangong space station" and "Tianhe
 * core module"; CMSA's own renders are not copied, only looked at): how each module's length is
 * shared between its sections, the 2.8 m of the narrow sections and the hub, where along the core
 * its own shorter pair of wings sits, and their 12.6 x 5 m. Those are ours and approximate.
 *
 * CelesTrak catalogues the three modules as three objects at one position -- CSS (TIANHE),
 * CSS (WENTIAN), CSS (MENGTIAN) -- so the core draws the whole station and a lab, when it is not
 * swallowed by the station's radius, draws as a single module. Visiting Shenzhou and Tianzhou
 * are catalogue objects of their own and are not drawn on it twice.
 *
 * Every wing is on a pivot about the axis it really turns on: the laboratories' pair swing round
 * the laboratories' own axis, which is the model's X.
 */
const TIANGONG_SPAN_M = 55.6;
/** One laboratory, built outward along +Z from the hub's skin at z = 1.4 m. Metres x S. */
function tiangongLab(S, name) {
  const lab = hullGroup();
  lab.name = name;
  zstack(lab, 1.4, S, 18, [
    [1.0, 1.0, 0.5, METAL, 'body', 'docking'],
    [1.5, 2.1, 0.4, '#DDE1E6', 'body', 'shoulder'],
    [2.1, 2.1, 9.3, '#DDE1E6', 'body', 'work-cabin'],
    [2.1, 1.5, 0.4, '#DDE1E6', 'body', 'shoulder'],
    [1.5, 1.5, 4.0, HULL_GREY, 'radiator', 'airlock'],
    [0.9, 0.9, 3.3, '#8A9099', 'foil', 'truss'],
  ]);
  return lab;
}
function buildTiangong(variant) {
  const g = new THREE.Group();
  g.userData.realSizeM = TIANGONG_SPAN_M;
  const S = 1 / TIANGONG_SPAN_M;
  const TRUSS_Z = 1.4 + 17.9 - 1.65; // the middle of a laboratory's truss, from the hub's centre
  const WING = TIANGONG_SPAN_M / 2 - 0.9; // from the truss's skin to the published tip
  if (variant === 'tiangong-module') {
    // One laboratory on its own, centred, with its wings out along X.
    const lab = tiangongLab(S, 'hull');
    lab.position.z = -(1.4 + 17.9 / 2) * S;
    g.add(lab);
    for (const side of [-1, 1]) {
      const w = segWing(WING * S, 4.2 * S, 8, side > 0 ? 'wing+' : 'wing-');
      if (side < 0) w.rotation.y = Math.PI;
      w.position.set(side * 0.9 * S, 0, (TRUSS_Z - 1.4 - 17.9 / 2) * S);
      g.add(w);
    }
    return g;
  }
  const hull = hullGroup();
  g.add(hull);
  // Tianhe, from its aft port forward: 13.3 m of sections, the 2.8 m hub and its 0.5 m forward
  // port are the published 16.6.
  zstack(hull, 1.9 - 16.6, S, 18, [
    [1.0, 1.0, 0.6, METAL, 'body', 'aft-port'],
    [1.4, 1.4, 2.4, HULL_GREY, 'radiator', 'resource'],
    [1.4, 2.1, 0.6, HULL_WHITE, 'body', 'shoulder'],
    [2.1, 2.1, 5.9, HULL_WHITE, 'body', 'tianhe'],
    [2.1, 1.4, 0.6, HULL_WHITE, 'body', 'shoulder'],
    [1.4, 1.4, 3.2, HULL_WHITE, 'body', 'tianhe-small'],
  ]);
  hull.add(mesh(new THREE.SphereGeometry(1.4 * S, 16, 12), HULL_WHITE, 'body', 'node'));
  hull.add(zcyl(1.0 * S, 1.0 * S, 0.5 * S, 1.65 * S, 12, METAL, 'body', 'forward-port'));
  for (const y of [-1, 1]) {
    const port = cyl(1.0 * S, 1.0 * S, 0.5 * S, 12, METAL, 'body', y > 0 ? 'zenith-port' : 'nadir-port');
    port.position.y = y * 1.65 * S;
    hull.add(port);
  }
  // The station's arm, stowed along the large section.
  const arm = box(0.22 * S, 0.22 * S, 5.5 * S, METAL, 'foil', 'arm');
  arm.position.set(0.7 * S, 2.1 * S, -8.15 * S);
  hull.add(arm);
  // The laboratories, and their wings on one pivot about the laboratories' axis.
  const labPivot = new THREE.Group();
  labPivot.name = 'panelPivot';
  for (const side of [-1, 1]) {
    const lab = tiangongLab(S, side > 0 ? 'mengtian' : 'wentian');
    lab.rotation.y = side * Math.PI / 2; // +Z -> +-X
    g.add(lab);
    for (const dz of [-1, 1]) {
      const w = segWing(WING * S, 4.2 * S, 8, `labwing${side}${dz}`);
      w.rotation.y = -dz * Math.PI / 2; // +X -> +-Z
      w.position.set(side * TRUSS_Z * S, 0, dz * 0.9 * S);
      labPivot.add(w);
    }
  }
  // The core's own shorter pair, on its own pivot.
  const corePivot = new THREE.Group();
  corePivot.name = 'panelPivot';
  corePivot.position.z = -4.9 * S;
  for (const side of [-1, 1]) {
    const w = segWing(12.6 * S, 5 * S, 4, `corewing${side > 0 ? '+' : '-'}`);
    if (side < 0) w.rotation.y = Math.PI;
    w.position.x = side * 1.4 * S;
    corePivot.add(w);
  }
  g.add(labPivot, corePivot);
  g.userData.panelPivots = [labPivot, corePivot];
  return g;
}

// -------------------------------------------------------------------------------------- rocket
//
// A rocket is not a shape in this file any more: it is a row in registry/rockets.yaml, mirrored
// into data/rockets.js and matched to a launch in data/rocketmatch.js. buildRocket(variant) reads
// that row and composes it, so adding a rocket is a row and never a change here.
//
// THE ONE IDEA: everything below is built in METRES -- real fairing diameters, real booster
// lengths, a real 18 m Electron next to a real 121 m Starship -- and normalised by a single
// `1 / height_m` at the end. That is why the proportions come out right with nothing tuned per
// family, and it is most of what "realistic" reads as at 84 px.
//
// The shading stays a lie everyone can see: the same three-tone toon ramp, the same rim light.
// The silhouette is the truth claim; the card says whether it is this vehicle, its family, or a
// stand-in with no dimensions behind it at all.

const ROCKET_BODY = '#EEF2F7'; // the neutral white a `livery: unknown` row draws in
const ROCKET_FOIL = '#9BA6B4';
const ROCKET_NOZZLE = '#A9825C';

const CORE_SEG = 16;
const BOOSTER_SEG = 12;
const BELL_SEG = 8;

/**
 * Which colour goes on which zone. A row with `livery: unknown` -- 34 of the 49 rows here, and
 * that is a real gap and not a soft one -- gets the neutral default everywhere, and the card
 * says NOTHING about colour. We do not write "colour unknown" on a card; we never claim one.
 */
function liveryOf(s) {
  const l = s.livery && typeof s.livery === 'object' ? s.livery : {};
  const hex = (v) => (typeof v === 'string' && v.charAt(0) === '#' ? v : null);
  const body = hex(l.body) || ROCKET_BODY;
  return {
    body,
    nose: hex(l.nose) || body,
    tail: hex(l.tail),
    interstage: hex(l.interstage) || ROCKET_FOIL,
    boosters: hex(l.boosters) || body,
  };
}

/** A nose cone of `len` metres sitting on top of `y`, radius `r`. */
function coneUp(r, len, seg, colour, name) {
  const c = cyl(0.02 * r, r, len, seg, colour, 'body', name);
  return c;
}

/**
 * What sits on top. Returns the metres it consumed, so the core knows where to stop.
 * `top.dia_m` absent means the fairing is flush with the body, which is the common case; only
 * `taper: hammerhead` is the claim that it is wider, and the registry refuses that claim without
 * a diameter. `top.len_m` absent draws a class-typical 2.2:1 nose rather than inventing a figure.
 */
function addTop(m, s, paint, H) {
  const kind = (s.top && s.top.kind) || 'fairing';
  if (kind === 'none') return 0;
  const dia = (s.top && s.top.dia_m) || s.core_dia_m;
  const r = dia / 2;

  if (kind === 'integrated_ship') {
    // No fairing at all: the upper stage IS the spacecraft, and it is the whole point of the
    // silhouette. 42% of the stack, from Starship's 52 m ship on a 121 m vehicle.
    const len = H * 0.42;
    const barrel = len * 0.62;
    const body = cyl(r, r, barrel, CORE_SEG, paint.nose, 'body', 'ship');
    body.position.y = H - len + barrel / 2;
    m.add(body);
    const nose = coneUp(r, len - barrel, CORE_SEG, paint.nose, 'ship-nose');
    nose.position.y = H - (len - barrel) / 2;
    m.add(nose);
    for (const side of [-1, 1]) {
      const flap = box(r * 0.9, len * 0.16, r * 0.16, paint.nose, 'body', 'flap');
      flap.position.set(side * r * 0.95, H - len * 0.1, 0);
      m.add(flap);
    }
    return len;
  }

  if (kind === 'capsule' || kind === 'capsule_tower') {
    // A crew capsule, not a fairing. Drawing a fairing on an Atlas V N22 or an SLS would be the
    // app asserting a configuration that does not fly.
    const capLen = (s.top && s.top.len_m) || dia * 1.15;
    const cap = cyl(r * 0.55, r, capLen, CORE_SEG, paint.nose, 'body', 'capsule');
    cap.position.y = H - capLen / 2 - (kind === 'capsule_tower' ? dia * 1.4 : 0);
    m.add(cap);
    if (kind !== 'capsule_tower') return capLen;
    const tower = cyl(r * 0.1, r * 0.16, dia * 1.4, BELL_SEG, paint.interstage, 'foil', 'abort-tower');
    tower.position.y = H - (dia * 1.4) / 2;
    m.add(tower);
    return capLen + dia * 1.4;
  }

  // a payload fairing: a barrel and an ogive nose
  const len = Math.min((s.top && s.top.len_m) || dia * 2.2, H * 0.5);
  const barrel = len * 0.55;
  const shell = cyl(r, r, barrel, CORE_SEG, paint.nose, 'body', 'fairing');
  shell.position.y = H - len + barrel / 2;
  m.add(shell);
  const nose = coneUp(r, len - barrel, CORE_SEG, paint.nose, 'nose');
  nose.position.y = H - (len - barrel) / 2;
  m.add(nose);
  return len;
}

/** The body, from the pad to wherever the top starts. Returns the core's length in metres. */
function addCore(m, s, paint, coreLen) {
  const r = s.core_dia_m / 2;

  if (s.taper === 'stepped' && Array.isArray(s.sections) && s.sections.length > 1) {
    // A real step in the body, bottom section first -- Nuri's 3.5 m first stage under a 2.6 m
    // upper. Section lengths are almost never published, so absent ones share the core evenly.
    const stated = s.sections.reduce((a, sec) => a + (sec.len_m || 0), 0);
    const blank = s.sections.filter((sec) => !sec.len_m).length;
    const each = blank ? Math.max(0, coreLen - stated) / blank : 0;
    let y = 0;
    s.sections.forEach((sec, i) => {
      const len = sec.len_m || each;
      const seg = cyl(sec.dia_m / 2, sec.dia_m / 2, len, CORE_SEG, paint.body, 'body', `stage-${i + 1}`);
      seg.position.y = y + len / 2;
      m.add(seg);
      y += len;
    });
  } else if (s.taper === 'tapered') {
    // Neutron: one continuous cone, widest at the base, which is what it lands on.
    const body = cyl(r * 0.55, r, coreLen, CORE_SEG, paint.body, 'body', 'body');
    body.position.y = coreLen / 2;
    m.add(body);
  } else {
    const body = cyl(r, r, coreLen, CORE_SEG, paint.body, 'body', 'body');
    body.position.y = coreLen / 2;
    m.add(body);
    // The interstage band. On a Falcon 9 it is black carbon composite and it is the one piece of
    // livery that reads at this size; everywhere else it is the neutral foil ring.
    const band = cyl(r * 1.02, r * 1.02, coreLen * 0.045, CORE_SEG, paint.interstage, 'foil', 'interstage');
    // Where the first stage ends, when the row publishes its length (`stage1_len_m`, public
    // #427): Falcon 9's 41.2 m of 70, Electron's 12.1 of 18. Otherwise the class-typical 62 %.
    const s1 = Number.isFinite(s.stage1_len_m) ? Math.min(s.stage1_len_m, coreLen * 0.97) : null;
    band.position.y = s1 != null ? s1 - coreLen * 0.0225 : coreLen * 0.62;
    m.add(band);
    addRecovery(m, s, paint, s1 != null ? s1 : coreLen * 0.62);
  }

  if (paint.tail) {
    // Soyuz, and only Soyuz: a documented orange tail section under a grey body.
    const tail = cyl(r * 1.01, r * 1.01, coreLen * 0.12, CORE_SEG, paint.tail, 'body', 'tail');
    tail.position.y = coreLen * 0.06;
    m.add(tail);
  }
  return coreLen;
}

/**
 * What a booster that flies back carries (public #427): `recovery: {legs, grid_fins}` on the row.
 * The COUNTS are the row's and sourced there. The sizes are not published anywhere reached: a
 * stowed leg is drawn as a slim fairing 0.19 of the first stage long lying against its base, and
 * a grid fin as a small plate folded flat under the interstage. Both in the interstage's colour,
 * which on a Block 5 is the black thermal layer its legs wear too. One mesh each.
 */
function addRecovery(m, s, paint, stage1Len) {
  const rec = s.recovery;
  if (!rec || typeof rec !== 'object') return;
  const r = s.core_dia_m / 2;
  const at = (n, fn) => { const rows = []; for (let i = 0; i < n; i++) rows.push(fn(((i + 0.5) / n) * Math.PI * 2)); return rows; };
  const legs = Math.max(0, Math.min(8, rec.legs | 0));
  if (legs) {
    const len = stage1Len * 0.19;
    const rows = at(legs, (a) => {
      const x = Math.cos(a), z = Math.sin(a);
      // A wedge leaning on the body: foot out at the base, tip in against the tank.
      return [x * (r + r * 0.34), 0, z * (r + r * 0.34), x * (r + r * 0.04), len, z * (r + r * 0.04), r * 0.2];
    });
    m.add(tubes(rows, r * 0.2, 5, paint.interstage, 'body', 'landing-legs'));
  }
  const fins = Math.max(0, Math.min(8, rec.grid_fins | 0));
  if (fins) {
    const y = stage1Len - s.height_m * 0.045;
    const rows = at(fins, (a) => {
      const x = Math.cos(a), z = Math.sin(a);
      return [x * (r + r * 0.03), y - r * 0.55, z * (r + r * 0.03), x * (r + r * 0.03), y, z * (r + r * 0.03), r * 0.26];
    });
    m.add(tubes(rows, r * 0.26, 4, paint.interstage, 'body', 'grid-fins'));
  }
}

/**
 * The strap-ons: the strongest discriminator at 40 px, and the reason the enum is closed. Soyuz's
 * four cones, Ariane's two fat solids against a wider core, Falcon Heavy's three bodies and
 * Proton's flared six-lobed base are all this one switch.
 */
function addBoosters(m, s, paint, coreLen) {
  const b = s.boosters || {};
  const n = b.shape && b.shape !== 'none' ? Math.max(0, Math.min(8, b.count || 0)) : 0;
  if (!n || !b.dia_m) return;

  const coreR = s.core_dia_m / 2;
  const br = b.dia_m / 2;
  const len = b.len_m || coreLen * 0.62;
  const ring = coreR + br * 0.94; // just touching the core, not floating beside it
  const bells = [];

  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * ring;
    const z = Math.sin(a) * ring;
    let bodyLen = len;
    let noseLen = 0;
    let parts = [];

    switch (b.shape) {
      case 'liquid_conical': {
        // Soyuz. Tapered OUTWARD at the base, with a long cone above: the one silhouette in the
        // world nobody confuses with anything else.
        bodyLen = len * 0.62;
        noseLen = len - bodyLen;
        parts.push(cyl(br * 0.42, br, bodyLen, BOOSTER_SEG, paint.boosters, 'body', 'booster'));
        parts.push(cyl(br * 0.03, br * 0.42, noseLen, BOOSTER_SEG, paint.nose, 'body', 'booster-nose'));
        break;
      }
      case 'liquid_core_clone': {
        // Falcon Heavy, Angara A5, Delta IV Heavy: full-size copies of the centre core.
        bodyLen = len * 0.9;
        noseLen = len - bodyLen;
        parts.push(cyl(br, br, bodyLen, BOOSTER_SEG, paint.boosters, 'body', 'booster'));
        parts.push(cyl(br * 0.04, br, noseLen, BOOSTER_SEG, paint.boosters, 'body', 'booster-nose'));
        break;
      }
      case 'flared_base': {
        // Proton, and only Proton: six outboard tanks that make the base wider than everything
        // above it. They stop low; there is nothing beside the upper body.
        bodyLen = coreLen * 0.42;
        parts.push(cyl(br, br * 1.06, bodyLen, BOOSTER_SEG, paint.boosters, 'body', 'outboard-tank'));
        break;
      }
      case 'solid_clustered': {
        bodyLen = len * 0.82;
        noseLen = len - bodyLen;
        parts.push(cyl(br, br, bodyLen, BOOSTER_SEG, paint.boosters, 'body', 'booster'));
        parts.push(cyl(br * 0.05, br, noseLen, BOOSTER_SEG, paint.boosters, 'body', 'booster-nose'));
        break;
      }
      default: {
        // solid_slim, solid_fat, liquid_cylindrical: a cylinder and a nose cap. The only thing
        // separating a Vulcan's 1.6 m GEM from an Ariane's 3.4 m P120C is dia_m from the row,
        // which is exactly the point -- no per-family tuning.
        bodyLen = len * 0.86;
        noseLen = len - bodyLen;
        parts.push(cyl(br, br, bodyLen, BOOSTER_SEG, paint.boosters, 'body', 'booster'));
        parts.push(cyl(br * 0.06, br, noseLen, BOOSTER_SEG, paint.boosters, 'body', 'booster-nose'));
      }
    }

    parts[0].position.set(x, bodyLen / 2, z);
    m.add(parts[0]);
    if (parts[1]) {
      parts[1].position.set(x, bodyLen + noseLen / 2, z);
      m.add(parts[1]);
    }
    bells.push([x, z, br]);
  }

  // One bell per strap-on, while there are few enough for them to read as separate objects.
  if (n <= 6 && b.shape !== 'flared_base') {
    for (const [x, z, r] of bells) {
      const bell = cyl(r * 0.5, r * 0.78, r * 1.3, BELL_SEG, ROCKET_NOZZLE, 'foil', 'booster-nozzle');
      bell.position.set(x, -r * 0.65, z);
      m.add(bell);
    }
  }
}

/**
 * NOZZLE PATTERNS. The drawn count is a silhouette and the true count goes in the row: at 84 px
 * nine bells already merge into a cluster and thirty-three would be mush, so `dense_ring` draws
 * 25 of Super Heavy's 33 and says nothing about it on the card.
 *
 * `unknown` is the honest degradation where the count is sourced and the ARRANGEMENT is not --
 * Long March 2D, Long March 12A, Nuri, New Glenn, Neutron, Terran R. It draws an engine skirt
 * with no individual bells rather than inventing a geometry.
 */
function nozzlePositions(pattern) {
  const ring = (n, rad, phase = 0) =>
    Array.from({ length: n }, (_, i) => {
      const a = phase + (i / n) * Math.PI * 2;
      return [Math.cos(a) * rad, Math.sin(a) * rad];
    });
  switch (pattern) {
    case 'twin':
      return { r: 0.36, at: [[-0.42, 0], [0.42, 0]] };
    case 'quad':
      return { r: 0.3, at: [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]] };
    case 'octaweb':
      return { r: 0.21, at: [[0, 0], ...ring(8, 0.6)] };
    case 'ring':
      return { r: 0.16, at: ring(10, 0.66) };
    case 'dense_ring':
      return { r: 0.13, at: [...ring(3, 0.16), ...ring(10, 0.45), ...ring(12, 0.78)] };
    case 'single':
      return { r: 0.42, at: [[0, 0]] };
    default:
      return null; // 'unknown'
  }
}

function addNozzles(m, s, paint) {
  const eng = s.engines || {};
  const coreR = s.core_dia_m / 2;
  const pat = nozzlePositions(eng.pattern);
  if (!pat) {
    const skirt = cyl(coreR, coreR * 1.04, s.height_m * 0.022, CORE_SEG, paint.interstage, 'foil', 'engine-skirt');
    skirt.position.y = -s.height_m * 0.011;
    m.add(skirt);
    return;
  }
  const br = coreR * pat.r;
  const len = br * 2.4;
  for (const [x, z] of pat.at) {
    const bell = cyl(br * 0.6, br, len, BELL_SEG, ROCKET_NOZZLE, 'foil', 'nozzle');
    bell.position.set(x * coreR, -len / 2, z * coreR);
    m.add(bell);
  }
}

/**
 * The exhaust. Hidden until the propagator says the vehicle is in its ascent phase, and it grows
 * with altitude because that is what a vacuum-expanding exhaust does. Illustrative, and it sits
 * inside an arc the card already calls illustrative.
 *
 * A pivot group at the nozzle plane, so scaling it grows the plume DOWNWARD instead of sliding it.
 */
function buildPlume(s) {
  const pivot = new THREE.Group();
  pivot.name = 'plume';
  const coreR = s.core_dia_m / 2;
  const n = (s.engines && s.engines.count) || 1;
  const r = coreR * (0.62 + 0.34 * Math.min(1, n / 9));
  const len = s.height_m * 0.4;
  const material = new THREE.MeshBasicMaterial({
    color: PALETTE.nightLights,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  // This material never went through toonMaterial(), so it is not in the model's pool and
  // disposeModels() would leave it behind -- one leaked material per launch record, every time
  // the camera moved away. `perModel` is the flag that check reads.
  material.userData.perModel = true;
  // ...and the fade-in loop multiplies by this instead of overwriting it, so a faded-in rocket
  // keeps the 0.55 it was designed with rather than being stamped to a hard 1.
  material.userData.baseOpacity = 0.55;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r, len, BELL_SEG * 2, 1, true), material);
  cone.name = 'plume-cone';
  cone.rotation.z = Math.PI; // taper away from the nozzles
  cone.position.y = -len / 2;
  pivot.add(cone);
  pivot.visible = false;
  return pivot;
}

/**
 * A launch vehicle, from its registry row.
 * @param {string} [variant] a registry/rockets.yaml row id. Anything else draws the generic
 *   rocket, which is what a launch with no matching row gets and what the card calls it.
 */
function buildRocket(variant) {
  const s = (typeof variant === 'string' && ROCKET_BY_ID[variant]) || GENERIC_ROCKET;
  const g = new THREE.Group();
  g.userData.realSizeM = s.height_m; // finally a true number, and finally read
  g.userData.shapeId = s.id;
  g.userData.drawsAs = s.stands_for;

  const m = new THREE.Group(); // everything below is in METRES
  m.name = 'metres';
  const paint = liveryOf(s);
  const topLen = addTop(m, s, paint, s.height_m);
  const coreLen = Math.max(s.height_m * 0.2, s.height_m - topLen);
  addCore(m, s, paint, coreLen);
  addBoosters(m, s, paint, coreLen);
  addNozzles(m, s, paint);
  m.add(buildPlume(s));

  m.scale.setScalar(1 / s.height_m); // ONE division: the whole vehicle becomes 1 unit
  m.position.y = -0.5; // base at -0.5, nose at +0.5, +Y is up
  g.add(m);
  g.userData.plume = m.getObjectByName('plume');
  return g;
}

// --------------------------------------------------------------------------- a spent upper stage

/**
 * A spent upper stage, as a class shape: a tank, two domes, one engine bell, and nothing on top --
 * the payload left. This replaces NASA's Space Shuttle solid rocket booster, which stood in for
 * every catalogue name with R/B in it (issue #410): a booster is a long segmented tube with a
 * nose cone, and it is not what is tumbling up there.
 *
 * THE NUMBERS ARE ONE REAL STAGE'S, because a class has none of its own: the single-engine
 * Centaur III, 12.68 m long and 3.05 m across (United Launch Alliance, Atlas V Launch Services
 * User's Guide, 2010, as the Centaur infobox on Wikipedia cites it; read 2026-10-06). A Falcon 9
 * second stage is fatter with a far bigger bell, a Long March or SL stage is plainer; the card
 * says "the kind of thing, not this exact one" for every one of them, and `generic: true` on the
 * route is what makes it. How the 12.68 m is shared between tank, domes and engine is read off
 * NASA's photographs of a Centaur (Commons, "Centaur (rocket stage)").
 *
 * +Y is the stage's axis, as it is for a rocket, and the engine is at -Y. It TUMBLES
 * (updateModelAttitude `tumble`): a dead stage has no attitude control, and the slow end-over-end
 * turn is why one flashes in the sky. The rate is ours and illustrative.
 */
const STAGE_LEN_M = 12.68;
function buildUpperStage() {
  const g = new THREE.Group();
  g.userData.realSizeM = STAGE_LEN_M;
  g.userData.attitude = 'tumble';
  g.userData.drawsAs = 'class';
  const S = 1 / STAGE_LEN_M;
  const hull = hullGroup();
  g.add(hull);
  let y = -STAGE_LEN_M / 2;
  // [rBottom, rTop, length, colour, kind, name], bottom to top, in metres.
  for (const [rb, rt, len, colour, kind, name] of [
    [0.6, 0.16, 1.6, '#5A5F66', 'foil', 'nozzle'],
    [0.35, 0.35, 0.6, METAL, 'body', 'engine'],
    [0.6, 1.525, 0.9, '#C9CED6', 'foil', 'aft-dome'],
    [1.525, 1.525, 7.4, ROCKET_BODY, 'body', 'tank'],
    [1.525, 0.9, 0.9, '#C9CED6', 'foil', 'forward-dome'],
    [0.9, 0.8, 1.28, ROCKET_FOIL, 'foil', 'adapter'],
  ]) {
    const part = cyl(rt * S, rb * S, len * S, 16, colour, kind, name);
    part.position.y = (y + len / 2) * S;
    hull.add(part);
    y += len;
  }
  // Two helium bottles tucked beside the engine, inside the tank's own width.
  for (const side of [-1, 1]) {
    const bottle = mesh(new THREE.SphereGeometry(0.3 * S, 10, 8), '#D8DCE2', 'foil', 'bottle');
    bottle.position.set(side * 0.75 * S, (-STAGE_LEN_M / 2 + 2.45) * S, 0);
    hull.add(bottle);
  }
  return g;
}

/**
 * One BUILDERS key per registry row, so modelFor()'s honesty check keeps working unchanged: a
 * known rocket is correctly not `generic`, and a variant that is not a row -- a typo, or a row
 * somebody deleted -- correctly is.
 */
function rocketVariants() {
  const row = { default: buildRocket };
  for (const id of Object.keys(ROCKET_BY_ID)) row[id] = buildRocket;
  // Not a launch vehicle and not a registry row: what is left in orbit afterwards (buildUpperStage).
  row.stage = buildUpperStage;
  return row;
}


// --------------------------------------------------------------------------------------- probe

function buildProbe() {
  const g = new THREE.Group();
  g.userData.realSizeM = 6;
  const bus = box(0.2, 0.18, 0.2, FOIL, 'foil', 'bus');
  g.add(bus);
  // Mounted ON the bus. It used to stand 5.8 % of the model clear of it, with the feed carried
  // along, so the high-gain antenna was a separate object flying alongside the spacecraft.
  const hga = dish(0.26, 0.08, 18, '#EDF1F6', 'foil', 'dish');
  hga.position.z = 0.1;
  hga.name = 'dish';
  g.add(hga);
  const feed = cyl(0.01, 0.01, 0.14, 8, METAL, 'body', 'feed');
  feed.rotation.x = Math.PI / 2;
  feed.position.z = 0.16;
  g.add(feed);
  // The magnetometer boom: the thing that says "this is a probe" at a glance, and the part that
  // sets the model's length. It was 0.55 long, which built the whole shape to 0.855 of a unit --
  // every other vehicle in the file is 1.00 within a few per cent, and a generic probe being 15 %
  // short is 15 % of a boom that a real probe carries metres of. At the declared 6 m, 0.62 is a
  // 3.7 m boom, which is the modest end of the real range.
  // 0.63 at -0.405 rather than 0.62 at -0.41: the boom then OVERLAPS the bus by a hundredth of a
  // unit instead of meeting it at exactly zero, which is the difference between a joint and a
  // coincidence. The connectivity check in tests/test_station_shapes.mjs is what noticed.
  const boom = cyl(0.008, 0.008, 0.63, 6, METAL, 'body', 'boom');
  boom.rotation.z = Math.PI / 2;
  boom.position.x = -0.405;
  g.add(boom);
  const rtg = cyl(0.035, 0.035, 0.16, 10, '#6E7784', 'body', 'rtg');
  rtg.rotation.z = Math.PI / 2;
  rtg.position.set(0.2, -0.06, 0);
  g.add(rtg);
  return g;
}

// ----------------------------------------------------------------------------------- telescope

/**
 * THE HEX VARIANT IS JWST, AND IT IS BUILT IN METRES. NASA publishes the numbers plainly: the
 * sunshield is "21.2 m by 14.2 m ... about the size of a tennis court" and the primary is a 6.5 m
 * segmented mirror of eighteen hexagons, 7.3 m corner to corner (jwst.nasa.gov).
 *
 * It used to be hand-tuned in normalised units and both proportions were wrong in opposite
 * directions: the shade came out 0.62 of the unit box, so a telescope declaring 21 m was drawn
 * 13 m across, and the mirror was 77 % of the shade's width where the real one is 34 %. A 16 m
 * mirror, in other words. Dividing real metres by one 1 / 21.2 is what the rest of this file
 * does and it gets both right with nothing tuned.
 */
/**
 * JWST, DRAWN SO IT READS AS JWST.
 *
 * Ivan, 2026-09-20: "isnt james web to big? garbage model could be better?" -- and he was right
 * about the model. NASA's own file was shipped decimated to 13 000 triangles, and beside Hubble it
 * was a brown lump: no kite, no segmented mirror, no tower.
 *
 * The mesh was not the problem. scene/realmodels.js retextures every loaded file with ONE toon
 * colour for its class, because a downloaded model's own materials are not this project's palette.
 * Hubble survives that -- a tube with two wings is a silhouette. JWST does not: what makes it
 * recognisable is the CONTRAST between a gold mirror, a silver shield and a dark bus, and a
 * single-colour mesh throws all of it away. A procedural shape can carry its own colours, which is
 * why Gaia and Solar Orbiter read at 84 px and a 204 kB download did not.
 *
 * Nor is it drawn too big: no deep-space record carries `meta.sizeM`, so every hero in that layer
 * is the same 84 px (260 selected). What made it look big is that normalising by the longest part
 * fits the 21.2 m sunshield to that budget -- and the shield really is most of JWST.
 *
 * Published, in metres (jwst.nasa.gov, NASA fact sheets):
 *   sunshield  21.197 x 14.162 m, five layers, "about the size of a tennis court"
 *   primary    6.5 m across, EIGHTEEN hexagonal segments, each 1.32 m flat to flat, no centre one
 *   secondary  0.74 m, on a tripod in front of the primary
 * Divided by the 21.2 m the row declares, so the proportions come out right by construction.
 */
function buildJwst() {
  const g = new THREE.Group();
  const M = 21.197;
  g.userData.realSizeM = M;
  const S = 1 / M;
  const SHIELD = '#C9CEDA';   // silvered kapton, cool against the gold
  const GOLD = '#E6C86A';
  const DARK = '#3A4049';

  // The sunshield: five kite layers, largest at the bottom, a hand's breadth apart. A kite rather
  // than a rectangle because that is its shape -- two triangles per layer, which is also the
  // cheapest thing in this file.
  for (let i = 0; i < 5; i++) {
    const k = 1 - i * 0.06;
    const half = (21.197 / 2) * k * S;
    const wide = (14.162 / 2) * k * S;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -half, 0, 0, 0, 0, -wide, half, 0, 0,
      -half, 0, 0, half, 0, 0, 0, 0, wide,
    ]), 3));
    geo.computeVertexNormals();
    const layer = mesh(geo, SHIELD, 'radiator', `shield-${i + 1}`);
    // A sheet has two sides and both are seen: from above the shield hides the bus, from below it
    // hides the optics. The toon material draws front faces only, and the first version of this
    // wound the kite face-down -- five layers, all culled, a JWST with no sunshield at all.
    layer.material.side = THREE.DoubleSide;
    layer.position.y = (-1.6 + i * 0.34) * S;
    g.add(layer);
  }

  // The primary: eighteen 1.32 m segments on a hexagonal grid, and no centre segment -- the hole is
  // where the secondary's light goes through, and it is the detail that makes the mirror read as
  // THIS mirror rather than a gold disc.
  const flat = 1.32;
  const r = flat / Math.sqrt(3);
  const step = flat + 0.02;
  const axial = [];
  for (let q = -2; q <= 2; q++) {
    for (let rr = -2; rr <= 2; rr++) {
      const sCoord = -q - rr;
      const ring = Math.max(Math.abs(q), Math.abs(rr), Math.abs(sCoord));
      if (ring === 1 || ring === 2) axial.push([q, rr]);
    }
  }
  for (const [q, rr] of axial.slice(0, 18)) {
    const x = step * (q + rr / 2);
    const z = step * (rr * Math.sqrt(3) / 2);
    const seg = cyl(r * S, r * S, 0.08 * S, 6, GOLD, 'radiator', 'segment');
    seg.position.set(x * S, 1.9 * S, z * S);
    g.add(seg);
  }
  // Named for the attitude code, which points `boresight` at what the telescope is looking at.
  const hub = cyl(0.2 * S, 0.2 * S, 0.1 * S, 6, DARK, 'body', 'boresight');
  hub.position.y = 1.9 * S;
  g.add(hub);

  // The secondary, on its tripod, forward of the primary.
  const secondary = cyl(0.37 * S, 0.37 * S, 0.08 * S, 10, GOLD, 'radiator', 'secondary');
  secondary.position.y = 6.6 * S;
  g.add(secondary);
  for (const a of [0, 2.094, 4.189]) {
    const strut = cyl(0.06 * S, 0.06 * S, 4.9 * S, 5, METAL, 'body', 'strut');
    strut.position.set(Math.cos(a) * 1.5 * S, 4.2 * S, Math.sin(a) * 1.5 * S);
    strut.rotation.z = Math.atan2(Math.cos(a) * 1.5, 4.9) * -1;
    strut.rotation.x = Math.atan2(Math.sin(a) * 1.5, 4.9);
    g.add(strut);
  }

  // The bus, under the shield where the sunlight is: instruments, wheels, the antenna.
  const bus = box(3.5 * S, 1.8 * S, 3.0 * S, DARK, 'body', 'bus');
  bus.position.y = -2.6 * S;
  g.add(bus);
  const panel = box(5.9 * S, 0.06 * S, 1.9 * S, PANEL_BLUE, 'panel', 'panel');
  panel.position.set(-4.0 * S, -3.2 * S, 0);
  g.add(panel);
  const dish = cyl(0.6 * S, 0.6 * S, 0.08 * S, 12, '#DDE3EC', 'foil', 'antenna');
  dish.position.set(2.4 * S, -3.1 * S, 0);
  dish.rotation.z = 0.5;
  g.add(dish);
  // The deployable tower: it carries the bus's load up through the shield to the mirror's
  // backplane, so it has to REACH the mirror (bottom -1.5 m, top 1.9 m, where the segments sit).
  // Stopping it short left the optics floating as a second, unattached object.
  const tower = box(0.8 * S, 3.4 * S, 0.8 * S, METAL, 'body', 'tower');
  tower.position.y = 0.2 * S;
  g.add(tower);
  return g;
}

function buildTelescope(variant) {
  const g = new THREE.Group();
  g.userData.realSizeM = 13;
  {
    const tube = cyl(0.15, 0.15, 0.5, 16, '#DCE3EC', 'foil', 'tube');
    tube.rotation.x = Math.PI / 2;
    tube.name = 'boresight';
    g.add(tube);
    const hood = cyl(0.155, 0.155, 0.1, 16, '#9BA6B4', 'body', 'hood');
    hood.rotation.x = Math.PI / 2;
    hood.position.z = 0.28;
    g.add(hood);
    const back = cyl(0.12, 0.15, 0.06, 16, '#9BA6B4', 'body', 'back');
    back.rotation.x = Math.PI / 2;
    back.position.z = -0.27;
    g.add(back);
    const pivot = new THREE.Group();
    pivot.name = 'panelPivot';
    // 0.34, not 0.30: the wings are what this shape's width is, and at 0.30 the model built to
    // 0.92 of a unit against a convention every other vehicle holds to within a few per cent.
    const a = panelWing(0.34, 0.18, METAL, 'wing+');
    a.position.x = 0.16;
    const b = panelWing(0.34, 0.18, METAL, 'wing-');
    b.rotation.y = Math.PI;
    b.position.x = -0.16;
    pivot.add(a, b);
    g.add(pivot);
    g.userData.panelPivots = [pivot];
  }
  return g;
}

/**
 * THE THREE NAMED SPACECRAFT THE DEEP-SPACE LAYER WAS DRAWING AS SOMETHING ELSE.
 *
 * `deep-space` holds ten records. Seven have a real NASA model; Gaia, Solar Orbiter and New
 * Horizons fell through to the generic probe and telescope shapes -- so an app whose whole point is
 * that a named object looks like itself drew Gaia, which is a ten-metre disc, as a tube.
 *
 * All three are built the way buildTelescope's `hex` variant is: in PUBLISHED METRES divided by the
 * size the row declares, so nothing is hand-tuned and the proportions come out right by
 * construction. The numbers, and where each one comes from:
 *
 *   Gaia (ESA)            sunshield 10.2 m across; body (payload + service module) 4.3 m wide and
 *                         2.3 m high; toroidal optical bench about 3 m in diameter.
 *                         sci.esa.int/web/gaia -- spacecraft, service module, deployable sunshield.
 *   Solar Orbiter (ESA)   body 2.5 x 3.1 x 2.7 m; six panels of 2.1 x 1.2 m in two arrays, 18 m
 *                         tip to tip deployed; heat shield about 3.1 x 2.4 m; a 4.40 m instrument
 *                         boom and three 6.50 m RPW antennae.
 *                         esa.int Solar Orbiter factsheet; cosmos.esa.int/web/solar-orbiter.
 *   New Horizons (APL)    2.1 m high-gain antenna; primary structure 0.7 m tall, 2.1 m long,
 *                         2.7 m at its widest; about 2.2 x 2.7 x 3.2 m overall with the RTG.
 *                         pluto.jhuapl.edu -- spacecraft systems and components.
 *
 * Each is normalised by its OVERALL published size -- 10.2, 18 and 3.2 m -- which is also what
 * `realSizeM` carries, so the one-unit convention holds without a fudge factor.
 */

// Gaia is a sunshade with a telescope sitting on it: a 10.2 m twelve-sided skirt, and a body only
// 4.3 m across on top. The skirt is nearly two and a half times the width of everything else, which
// is the whole silhouette and exactly what the generic telescope had no way to show.
function buildGaia() {
  const g = new THREE.Group();
  const M = 10.2;
  g.userData.realSizeM = M;
  const S = 1 / M;

  // The deployable sunshield: twelve panels, 10.2 m across, solar cells on the sun-facing side.
  // Drawn as one twelve-sided plate rather than twelve, because at 84 px the seams are not there.
  const shield = cyl(5.1 * S, 5.1 * S, 0.12 * S, 12, PANEL_BLUE, 'panel', 'sunshield');
  shield.position.y = -0.9 * S;
  g.add(shield);
  // The rim the panels fold back against, in foil rather than cell blue so the disc reads as a
  // made thing and not a coin.
  const rim = cyl(5.1 * S, 5.1 * S, 0.30 * S, 12, FOIL, 'foil', 'shield-rim');
  rim.position.y = -1.08 * S;
  g.add(rim);

  // The service module: 4.3 m across, the lower half of the 2.3 m body.
  const svc = cyl(2.15 * S, 2.15 * S, 1.0 * S, 8, METAL, 'body', 'service-module');
  svc.position.y = -0.3 * S;
  g.add(svc);
  // The payload module: a thermal tent over a toroidal optical bench about 3 m in diameter.
  const tent = cyl(1.5 * S, 2.05 * S, 1.3 * S, 8, '#D8DEE7', 'foil', 'payload-tent');
  tent.position.y = 0.85 * S;
  g.add(tent);
  // The two telescopes look out through apertures in the tent, 106.5 degrees apart -- the basic
  // angle that makes the whole survey work, and the one detail worth a face each.
  for (const deg of [-53.25, 53.25]) {
    const port = box(0.9 * S, 0.7 * S, 0.05 * S, '#2B3340', 'body', 'aperture');
    const a = (deg * Math.PI) / 180;
    port.position.set(Math.sin(a) * 1.7 * S, 0.85 * S, Math.cos(a) * 1.7 * S);
    port.rotation.y = a;
    g.add(port);
  }
  // The phased-array antenna that sent the catalogue home, on the underside of the service module.
  const antenna = cyl(0.8 * S, 0.8 * S, 0.12 * S, 8, '#8E98A6', 'body', 'antenna');
  antenna.position.y = -0.85 * S;
  g.add(antenna);
  return g;
}

// Solar Orbiter is a heat shield with a spacecraft hiding behind it. Everything it does is arranged
// around staying in that shadow, so the shield is drawn proud of the bus on the sun side and the
// arrays are swept back from it.
function buildSolarOrbiter() {
  const g = new THREE.Group();
  const M = 18; // tip to tip with the arrays deployed
  g.userData.realSizeM = M;
  const S = 1 / M;

  // The bus: 2.5 m across the array axis, 2.7 m tall, 3.1 m deep. +Z is the Sun.
  const bus = box(2.5 * S, 2.7 * S, 3.1 * S, FOIL, 'foil', 'bus');
  g.add(bus);
  // The heat shield: 3.1 x 2.4 m of titanium foil and calcium phosphate, standing off the bus on
  // struts. It overhangs the bus on purpose -- that is what casts the shadow the rest lives in.
  const shield = box(3.1 * S, 2.4 * S, 0.14 * S, '#3A3F47', 'body', 'heat-shield');
  shield.position.z = 1.85 * S;
  g.add(shield);
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const strut = cyl(0.05 * S, 0.05 * S, 0.55 * S, 6, METAL, 'body', 'shield-strut');
      strut.rotation.x = Math.PI / 2;
      strut.position.set(sx * 1.0 * S, sy * 0.9 * S, 1.6 * S);
      g.add(strut);
    }
  }
  // Two arrays of three 2.1 x 1.2 m panels, 18 m tip to tip. Each wing therefore reaches
  // (18 - 2.5) / 2 = 7.75 m from the side of the bus.
  const pivot = new THREE.Group();
  pivot.name = 'panelPivot';
  const wingA = panelWing(7.75 * S, 1.2 * S, METAL, 'wing+');
  wingA.position.x = 1.25 * S;
  const wingB = panelWing(7.75 * S, 1.2 * S, METAL, 'wing-');
  wingB.rotation.y = Math.PI;
  wingB.position.x = -1.25 * S;
  pivot.add(wingA, wingB);
  g.add(pivot);
  g.userData.panelPivots = [pivot];

  // The 4.40 m instrument boom, out of the shadow side where the magnetometers can work.
  const boom = cyl(0.045 * S, 0.045 * S, 4.4 * S, 6, METAL, 'body', 'boom');
  boom.rotation.x = Math.PI / 2;
  boom.position.z = -3.75 * S;
  g.add(boom);
  // Three 6.50 m RPW antennae, swept back so the longest thing on the model stays the array span.
  for (const [ax, ay] of [[0.85, 0.5], [-0.85, 0.5], [0, -1]]) {
    const ant = cyl(0.03 * S, 0.03 * S, 6.5 * S, 5, METAL, 'body', 'rpw-antenna');
    const len = Math.hypot(ax, ay) || 1;
    const ux = ax / len, uy = ay / len;
    ant.rotation.z = Math.atan2(uy, ux) - Math.PI / 2;
    ant.position.set(ux * 3.4 * S, uy * 3.4 * S, -1.4 * S);
    g.add(ant);
  }
  return g;
}

// New Horizons is a 2.1 m dish with a triangle behind it and the RTG stuck out one side -- which is
// why it looks lopsided in every photograph, and why drawing it symmetrically would be wrong.
function buildNewHorizons() {
  const g = new THREE.Group();
  const M = 3.2; // overall length, RTG included
  g.userData.realSizeM = M;
  const S = 1 / M;

  // The primary structure: 2.1 m long, 2.7 m at its widest, 0.7 m thick.
  //
  // A three-sided prism is the honest primitive and costs eight triangles, but an EQUILATERAL one
  // cannot be both 2.1 long and 2.7 wide -- a 3-gon of circumradius r is 1.5r long and r*sqrt(3)
  // across, so matching the length gives 2.42 m of width. The spacecraft's own triangle is not
  // equilateral either, so the prism is built to the published length and then widened to the
  // published width rather than one number being quietly dropped.
  // Rotated upright, the prism's LENGTH runs along +Y and its width along X; measured, not assumed.
  const R = 1.4 * S; // 1.5 * R = the published 2.1 m length
  const bus = cyl(R, R, 0.7 * S, 3, FOIL, 'foil', 'bus');
  bus.rotation.x = Math.PI / 2;
  bus.scale.x = 2.7 / (1.4 * Math.sqrt(3)); // 2.42 m across -> the published 2.7 m
  g.add(bus);
  // The 2.1 m high-gain antenna, on the front face and pointed at Earth.
  const hga = dish(1.05 * S, 0.30 * S, 20, '#EDF1F6', 'foil', 'dish');
  hga.position.z = 0.35 * S;
  hga.name = 'dish';
  g.add(hga);
  const feed = cyl(0.03 * S, 0.03 * S, 0.5 * S, 8, METAL, 'body', 'feed');
  feed.rotation.x = Math.PI / 2;
  feed.position.z = 0.75 * S;
  g.add(feed);
  // The RTG: one GPHS unit, 0.42 m across and 1.13 m long, cantilevered off one corner. Placed so
  // the overall length is the published 3.2 m.
  // The RTG hangs off the BASE of the triangle, on the length axis -- "externally mounted at one
  // end of the triangular structure", and it is what makes the spacecraft 3.2 m long rather than
  // the 2.1 m the bus alone would be. The dish reaches +1.05 m, so the RTG's far end sits at
  // 1.05 - 3.2 = -2.15 m. Offset in X because the real one is: New Horizons is visibly lopsided,
  // and centring it would tidy away the most recognisable thing about the shape.
  const RTG_Y = -1.585 * S;
  const RTG_X = -0.35 * S;
  const rtg = cyl(0.21 * S, 0.21 * S, 1.13 * S, 10, '#6E7784', 'body', 'rtg');
  rtg.position.set(RTG_X, RTG_Y, 0);
  g.add(rtg);
  const fins = cyl(0.30 * S, 0.30 * S, 0.9 * S, 6, '#5C646F', 'body', 'rtg-fins');
  fins.position.set(RTG_X, RTG_Y, 0);
  g.add(fins);
  return g;
}

// Mars 2020 in cruise (internal #424): what flew from Earth to Mars was not a rover but a closed
// capsule under a ring of solar panels, spinning. NASA publishes the rover as a mesh and not this.
//
// ONE LENGTH IS PUBLISHED AND THE REST ARE OURS. The heat shield is 4.5 m across ("the 4.5 m (15 ft)
// diameter heat shield, which is the largest heat shield ever flown in space": the Mars Science
// Laboratory aeroshell, which Mars 2020 flew again; Wikipedia's Mars Science Laboratory article,
// read 2026-10-07). The heights, the slope of the backshell and the 4 m of the cruise stage are
// read off NASA's pictures of the stacked spacecraft before launch and are this project's.
function buildMars2020Cruise() {
  const g = new THREE.Group();
  const M = 4.5; // the published diameter, and the longest thing on the model
  g.userData.realSizeM = M;
  const S = 1 / M;
  const R = 2.25 * S;
  // The heat shield: a blunt cone, tan (the colour of its ablator before entry), nose towards -Y.
  const shield = cyl(R, 0.35 * S, 0.75 * S, 28, '#B58E63', 'body', 'heat-shield');
  shield.position.y = -0.95 * S;
  g.add(shield);
  const nose = cyl(0.35 * S, 0.02 * S, 0.1 * S, 16, '#B58E63', 'body', 'heat-shield-nose');
  nose.position.y = -1.375 * S;
  g.add(nose);
  // The backshell: white, narrowing in two steps to the parachute cone.
  const back = cyl(1.05 * S, R, 1.35 * S, 28, HULL_WHITE, 'body', 'backshell');
  back.position.y = 0.1 * S;
  g.add(back);
  const cone = cyl(0.45 * S, 1.05 * S, 0.35 * S, 20, HULL_WHITE, 'body', 'parachute-cone');
  cone.position.y = 0.95 * S;
  g.add(cone);
  // The cruise stage: a 4 m ring on top, solar cells on its outward face, radiators round its rim.
  const ring = cyl(2.0 * S, 2.0 * S, 0.3 * S, 28, HULL_GREY, 'body', 'cruise-stage');
  ring.position.y = 1.275 * S;
  g.add(ring);
  const cells = cyl(1.9 * S, 1.9 * S, 0.02 * S, 28, PANEL_BLUE, 'panel', 'solar-panel');
  cells.position.y = 1.435 * S;
  g.add(cells);
  const hub = cyl(0.6 * S, 0.6 * S, 0.12 * S, 16, FOIL, 'foil', 'hub');
  hub.position.y = 1.485 * S;
  g.add(hub);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const rad = box(0.5 * S, 0.24 * S, 0.03 * S, RADIATOR, 'radiator', 'radiator');
    rad.position.set(Math.cos(a) * 2.02 * S, 1.275 * S, Math.sin(a) * 2.02 * S);
    rad.rotation.y = Math.PI / 2 - a;
    g.add(rad);
  }
  return g;
}

// ------------------------------------------------------------------------------------ asteroid

/**
 * ONE ROCK PER ROCK, AND ROUNDER WHEN IT IS BIG.
 *
 * This builder always took a seed, and nothing ever passed one: `meta.modelVariant` is null for
 * every asteroid, so `seedOf('asteroid:0')` ran ten times and the asteroid layer drew ten named
 * objects as ONE identical lump. Measured 2026-09-17 -- Ceres, a 939 km dwarf planet that is
 * visibly round, had the same 540 vertices in the same places as Itokawa, a 330 m rubble pile.
 *
 * So the seed now comes from the record's own id, and the shape from its measured size. Bodies
 * hold whatever shape an impact left them in until they are heavy enough to pull themselves round:
 * below about 10 km a rock is as irregular as it likes, by a few hundred km self-gravity has
 * flattened most of it away, and Ceres is round enough to be a dwarf planet. `relax` is that,
 * interpolated on a log scale between those two ends, and it damps every lump and crater below.
 *
 * The card still says "drawn as a generic asteroid -- the kind of thing, not this exact one",
 * because that is still true: this is the right SHAPE FAMILY for a body that size, not a shape
 * model of that body. Bennu is the one with a real one, and it comes from a file.
 */
function relaxationOf(diameterKm) {
  if (!Number.isFinite(diameterKm) || diameterKm <= 0) return 0;
  const lo = Math.log10(10);   // irregular: no size limit on how lumpy
  const hi = Math.log10(900);  // round: Ceres is 939 km and is a sphere to the eye
  return Math.min(1, Math.max(0, (Math.log10(diameterKm) - lo) / (hi - lo)));
}

function buildAsteroid(variant, opts = {}) {
  const record = opts.record || null;
  const key = variant || (record && record.id) || 0;
  const seed = seedOf(`asteroid:${key}`);
  const g = new THREE.Group();
  const diameterKm = record && record.meta ? Number(record.meta.diameterKm) : NaN;
  g.userData.realSizeM = Number.isFinite(diameterKm) && diameterKm > 0 ? diameterKm * 1000 : 500;
  const relax = relaxationOf(diameterKm);
  const lump = 1 - relax; // 1 = a potato, 0 = a ball
  const geo = new THREE.IcosahedronGeometry(0.5, 2);
  const p = geo.attributes.position;

  // three craters: seeded directions, pushed in over an angular radius
  const craters = [];
  for (let c = 0; c < 3; c++) {
    const u = hash01(seed + c * 101);
    const w = hash01(seed + c * 211 + 5);
    const theta = Math.acos(2 * u - 1);
    const phi = 2 * Math.PI * w;
    craters.push({
      dir: new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(theta)
      ),
      radius: 0.35 + 0.25 * hash01(seed + c * 307),
      depth: (0.1 + 0.06 * hash01(seed + c * 401)) * lump,
    });
  }

  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    // lumpy potato: three low-frequency bumps from the seeded hash
    let r =
      1 +
      lump * (
        0.16 * (hash01(seed + Math.round(n.x * 97) * 31 + Math.round(n.y * 97)) - 0.5) +
        0.1 * Math.sin(3.1 * n.x + seed % 7) * Math.cos(2.7 * n.y + (seed % 11)) +
        0.07 * Math.sin(4.3 * n.z + (seed % 13))
      );
    for (const c of craters) {
      const d = n.dot(c.dir); // 1 at the crater centre
      const t = Math.max(0, (d - (1 - c.radius * c.radius * 0.5)) / (c.radius * c.radius * 0.5 + 1e-6));
      if (t > 0) r -= c.depth * t * t * (3 - 2 * t);
    }
    v.copy(n).multiplyScalar(0.5 * r);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  // Potatoes are not spheres, and planets are: the same interpolation, so Ceres comes out round
  // and a kilometre-wide rock keeps its 1 : 0.86 : 0.72 axes.
  geo.scale(1.0, 1 - 0.14 * lump, 1 - 0.28 * lump);
  geo.computeVertexNormals();
  g.add(mesh(geo, CLASS_COLOURS.asteroid, 'body', 'body'));
  return g;
}

// --------------------------------------------------------------------------------------- comet

/** A tapered ribbon along +X, `bend` units of curve in Y. */
function tailRibbon(length, width, bend, colour, opacity, name) {
  const N = 10;
  const pos = new Float32Array((N + 1) * 2 * 3);
  const idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = length * t;
    const y = bend * t * t;
    const w = width * (0.35 + 0.65 * (1 - t)) * (0.35 + t * 0.65);
    pos[i * 6 + 0] = x;
    pos[i * 6 + 1] = y - w;
    pos[i * 6 + 2] = 0;
    pos[i * 6 + 3] = x;
    pos[i * 6 + 4] = y + w;
    pos[i * 6 + 5] = 0;
    if (i < N) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.MeshBasicMaterial({
    color: colour,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh2 = new THREE.Mesh(g, m);
  mesh2.name = name;
  return mesh2;
}

// ONE NUCLEUS PER COMET. The same miss as the asteroids: this took a seed, nothing passed one, and
// sixty comets shared a single rock. There is no roundness rule here -- MPCORB publishes elements,
// not nucleus dimensions, so the app does not know how big any of these are and does not pretend
// to. The seed is all that changes, and that is enough for sixty different rocks.
function buildComet(variant, opts = {}) {
  const record = opts.record || null;
  const seed = seedOf(`comet:${variant || (record && record.id) || 0}`);
  const g = new THREE.Group();
  g.userData.realSizeM = 4000;
  const geo = new THREE.IcosahedronGeometry(0.12, 1);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.multiplyScalar(0.8 + 0.45 * hash01(seed + i * 613));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  g.add(mesh(geo, '#8E9AA6', 'body', 'nucleus'));

  // Two ribbons, both anti-sunward along +X of this group. Dust is warm and curved; the ion tail is
  // straight and bluer. The direction is real; the shape is drawn.
  const tails = new THREE.Group();
  tails.name = 'tails';
  tails.add(tailRibbon(1.1, 0.13, 0.16, '#F3E4CF', 0.4, 'dust'));
  tails.add(tailRibbon(1.35, 0.07, 0.0, CLASS_COLOURS.comet, 0.35, 'ion'));
  const ion = tails.children[1];
  ion.rotation.x = Math.PI / 2; // cross the two ribbons so they read in 3D
  g.add(tails);
  g.userData.tails = tails;
  return g;
}

// ------------------------------------------------------------------------------------ ground sites

function buildSitePad() {
  const g = new THREE.Group();
  g.userData.realSizeM = 100;
  g.add(box(0.5, 0.04, 0.5, '#6E7784', 'body', 'pad'));
  const tower = box(0.09, 0.6, 0.09, CLASS_COLOURS.site, 'body', 'tower');
  tower.position.set(-0.14, 0.32, 0);
  g.add(tower);
  const arm = box(0.18, 0.03, 0.03, CLASS_COLOURS.site, 'body', 'arm');
  arm.position.set(-0.02, 0.5, 0);
  g.add(arm);
  for (const s of [-1, 1]) {
    const strut = box(0.02, 0.34, 0.02, '#8E99A8', 'body', 'strut');
    strut.position.set(-0.14, 0.2, s * 0.1);
    strut.rotation.x = s * 0.25;
    g.add(strut);
  }
  return g;
}

function buildSiteDish() {
  const g = new THREE.Group();
  g.userData.realSizeM = 34;
  const base = cyl(0.09, 0.13, 0.12, 12, '#6E7784', 'body', 'base');
  base.position.y = 0.06;
  g.add(base);
  const mast = cyl(0.04, 0.04, 0.26, 10, '#8E99A8', 'body', 'mast');
  mast.position.y = 0.25;
  g.add(mast);
  const d = dish(0.28, 0.09, 20, '#E3E8EF', 'foil', 'dish');
  d.position.y = 0.42;
  d.rotation.x = -0.9; // tilted up at the sky, as they sit
  d.name = 'boresight';
  g.add(d);
  return g;
}

function buildSiteDome() {
  const g = new THREE.Group();
  g.userData.realSizeM = 20;
  const drum = cyl(0.26, 0.28, 0.2, 16, '#DCE3EC', 'body', 'drum');
  drum.position.y = 0.1;
  g.add(drum);
  const domeGeo = new THREE.SphereGeometry(0.26, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = mesh(domeGeo, '#EDF1F6', 'foil', 'dome');
  dome.position.y = 0.2;
  g.add(dome);
  const slit = box(0.06, 0.28, 0.02, '#3A4250', 'body', 'slit');
  slit.position.set(0, 0.32, 0.24);
  slit.rotation.x = 0.5;
  g.add(slit);
  return g;
}

/**
 * A rover: a box body on six wheels with a camera mast. Drawn for every landing site whose
 * `shape:` in registry/sites.yaml is `rover` -- Spirit, Opportunity, Curiosity, Zhurong and the
 * two Lunokhods -- as the kind of thing, not any one of them.
 *
 * THE PARTS ARE BUILT SMALL AND SCALED UP TO ONE UNIT. This builder sat in the table unreachable
 * until 2026-09-22 (models.yaml said `for: {site_class: surface}` and nothing routed a surface
 * site to it), and it built 0.41 of a unit. heroes.js sizes every hero by a pixel target on the
 * assumption that a model is one unit across -- realmodels.js normalises the GLBs to exactly that
 * -- so a rover at 0.41 would have been drawn at two fifths of the size of the lander beside it.
 * The inner group carries the scale because heroes.js overwrites the outer group's.
 */
function buildSiteRover() {
  const g = new THREE.Group();
  g.userData.realSizeM = 3;
  const inner = new THREE.Group();
  inner.name = 'rover-parts';
  g.add(inner);
  const body = box(0.34, 0.12, 0.22, '#DCE3EC', 'body', 'body');
  body.position.y = 0.14;
  inner.add(body);
  const deck = box(0.24, 0.02, 0.18, PANEL_BLUE, 'panel', 'deck');
  deck.position.y = 0.21;
  inner.add(deck);
  const mast = cyl(0.012, 0.012, 0.18, 8, '#8E99A8', 'body', 'mast');
  mast.position.set(0.12, 0.29, 0);
  inner.add(mast);
  const head = box(0.06, 0.04, 0.05, CLASS_COLOURS.site, 'body', 'head');
  head.position.set(0.12, 0.39, 0);
  inner.add(head);
  for (const x of [-0.12, 0, 0.12]) {
    for (const z of [-0.13, 0.13]) {
      const wheel = cyl(0.06, 0.06, 0.05, 10, '#6E7784', 'body', 'wheel');
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.06, z);
      inner.add(wheel);
    }
  }
  // Measured rather than hard-coded, so a part added later cannot quietly undo it.
  const size = new THREE.Box3().setFromObject(inner).getSize(new THREE.Vector3());
  inner.scale.setScalar(1 / Math.max(size.x, size.y, size.z));
  return g;
}

/**
 * A lander standing on another world: a foil-wrapped body on four splayed legs with round
 * footpads, and a dish on a short mast. Drawn for every landing site whose `shape:` in
 * registry/sites.yaml is `lander` -- Surveyor, Luna, Viking, Phoenix, Chang'e, Vikram, SLIM and
 * the rest -- none of which has a public model this project ships. It is the KIND of thing
 * (the card says "drawn as a lander -- the kind of thing, not this exact one"), so it copies no
 * one craft: Surveyor was a tripod, Luna 16 a stack of spheres, Viking a hexagon on three legs.
 * Four legs because that is what most of them have and what reads as "lander" at 40 px.
 *
 * Built to the one-unit convention: the footpads span one unit tip to tip, and realSizeM is the
 * three metres a Surveyor or a Chang'e lander measures across its legs.
 */
function buildSiteLander() {
  const g = new THREE.Group();
  g.userData.realSizeM = 3;
  const body = cyl(0.24, 0.24, 0.2, 8, FOIL, 'foil', 'body');
  body.position.y = 0.38;
  g.add(body);
  const deck = cyl(0.25, 0.25, 0.02, 8, METAL, 'body', 'deck');
  deck.position.y = 0.49;
  g.add(deck);
  const top = new THREE.Vector3();
  const foot = new THREE.Vector3();
  const along = new THREE.Vector3();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const cx = Math.cos(a);
    const cz = Math.sin(a);
    // From inside the body's lower edge down and out to the pad. Starting INSIDE the body is what
    // keeps each leg joined to it: tests/test_station_shapes.mjs refuses a part floating free.
    top.set(0.2 * cx, 0.3, 0.2 * cz);
    foot.set(0.44 * cx, 0.03, 0.44 * cz);
    along.subVectors(foot, top);
    const leg = cyl(0.018, 0.018, along.length(), 6, '#8E99A8', 'body', 'leg');
    leg.position.addVectors(top, foot).multiplyScalar(0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.normalize());
    g.add(leg);
    const pad = cyl(0.055, 0.065, 0.03, 10, '#6E7784', 'body', 'footpad');
    pad.position.set(0.44 * cx, 0.015, 0.44 * cz);
    g.add(pad);
  }
  const mast = cyl(0.012, 0.012, 0.14, 6, '#8E99A8', 'body', 'mast');
  mast.position.y = 0.57;
  g.add(mast);
  const d = dish(0.1, 0.03, 12, '#E3E8EF', 'foil', 'dish');
  d.position.y = 0.66;
  d.rotation.x = -0.9; // tilted up at the sky, as buildSiteDish's is
  g.add(d);
  return g;
}

/**
 * Surveyor, from the one paragraph NASA's catalogue gives it (public #267, 2026-10-08).
 *
 * NSSDCA, "Surveyor 1" (nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-045A, read
 * 2026-10-08): "a tripod of thin-walled aluminum tubing and interconnecting braces"; "A central
 * mast extended about one meter above the apex of the tripod"; "Three hinged landing legs were
 * attached to the lower corners of the structure ... and terminated in footpads"; "The three
 * footpads extended out 4.3 meters from the center of the Surveyor. The spacecraft was about 3
 * meters tall"; "A 0.855 square meter array of 792 solar cells was mounted on a positioner on
 * top of the mast"; "a movable large planar array high gain antenna mounted near the top of the
 * central mast"; "two omnidirectional conical antennas mounted on the ends of folding booms";
 * "Two thermally controlled compartments"; "three throttlable vernier rocket engines"; "The TV
 * survey camera was mounted near the top of the tripod"; thermal control by "white paint".
 *
 * DRAWN FROM THOSE SENTENCES AND NOTHING ELSE. 4.3 m is taken as the circle the footpads stand
 * on, across, which is how a 3 m craft with those legs has to be read; the planar antenna is
 * drawn the size of the solar panel (0.92 m square is 0.855 m2) because the page gives it no
 * size; where each box sits on the frame is ours. The generic lander before this was a foil
 * drum on four legs, and the header of buildSiteLander says Surveyor was a tripod.
 */
function buildSurveyor() {
  const g = new THREE.Group();
  g.userData.realSizeM = 4.3;
  const m = new THREE.Group(); // metres
  m.name = 'metres';
  const R = 2.15;      // footpads: 4.3 m across
  const FR = 0.75;     // the frame's lower corners
  const FY = 0.95;     // and their height
  const APEX = 2.0;    // mast top is 1 m above this: 3 m tall
  const struts = [];
  const corner = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const x = Math.cos(a), z = Math.sin(a);
    corner.push([x * FR, FY, z * FR]);
    struts.push([x * FR, FY, z * FR, 0, APEX, 0]);                       // the tripod
    struts.push([x * FR, FY, z * FR, x * R, 0.12, z * R, 0.035]);          // the hinged leg
    struts.push([x * FR * 0.55, FY + 0.62, z * FR * 0.55, x * R * 0.72, 0.42, z * R * 0.72, 0.03]); // its shock absorber
    const pad = cyl(0.17, 0.2, 0.12, 10, '#C9CED6', 'foil', 'footpad');
    pad.position.set(x * R, 0.06, z * R);
    m.add(pad);
    const vernier = cyl(0.05, 0.11, 0.2, 6, '#5A5F66', 'foil', 'vernier');
    vernier.position.set(x * FR * 0.8, FY - 0.14, z * FR * 0.8);
    m.add(vernier);
  }
  for (let i = 0; i < 3; i++) {
    const [ax, ay, az] = corner[i];
    const [bx, by, bz] = corner[(i + 1) % 3];
    struts.push([ax, ay, az, bx, by, bz]);                               // the braces between corners
  }
  struts.push([0, APEX - 0.05, 0, 0, 2.9, 0, 0.04]);                     // the mast
  // The two omnidirectional antennas on their booms.
  struts.push([corner[0][0], FY + 0.3, corner[0][2], corner[0][0] * 2.1, 2.05, corner[0][2] * 2.1, 0.018]);
  struts.push([corner[1][0], FY + 0.3, corner[1][2], corner[1][0] * 2.1, 2.05, corner[1][2] * 2.1, 0.018]);
  m.add(tubes(struts, 0.028, 6, '#D8DCE2', 'body', 'frame'));
  for (const c of [corner[0], corner[1]]) {
    const omni = cyl(0.02, 0.08, 0.16, 6, '#E6EAF0', 'body', 'omni');
    omni.position.set(c[0] * 2.1, 2.13, c[2] * 2.1);
    m.add(omni);
  }
  // Two thermal compartments, white, on two sides of the frame; the fuel and helium as spheres.
  m.add(slabs([[0.62, 0.5, 0.36, 0, FY + 0.3, 0.52], [0.5, 0.56, 0.34, -0.5, FY + 0.33, -0.3]], HULL_WHITE, 'body', 'compartment'));
  for (const [x, z] of [[0.42, -0.3], [-0.1, -0.55], [-0.48, 0.2]]) {
    const tank = mesh(new THREE.SphereGeometry(0.21, 10, 8), '#C9CED6', 'foil', 'tank');
    tank.position.set(x, FY + 0.1, z);
    m.add(tank);
  }
  // On the mast: the solar panel and the planar antenna, back to back and tilted to the sky.
  const sun = box(0.92, 0.035, 0.93, PANEL_BLUE, 'panel', 'solar-panel');
  sun.position.set(0.5, 2.82, 0);
  sun.rotation.z = -0.5;
  m.add(sun);
  const hga = box(0.96, 0.05, 0.96, '#B9C2CE', 'foil', 'planar-antenna');
  hga.position.set(-0.52, 2.72, 0);
  hga.rotation.z = 0.62;
  m.add(hga);
  // The television camera near the top of the tripod, looking down its mirror at the ground.
  const cam = cyl(0.075, 0.075, 0.42, 8, HULL_WHITE, 'body', 'tv-camera');
  cam.position.set(0.3, 1.72, 0.26);
  cam.rotation.z = 0.28;
  m.add(cam);
  m.scale.setScalar(1 / 4.3);
  g.add(m);
  return g;
}

/**
 * The ground a lander stands on, as a child of its model (public #386: the lunar module "hovers").
 * scene/heroes.js adds it under a landing site's vehicle on the Moon, with the contact shadow.
 * Illustrative: the regolith's own grey, a darker patch where the descent engine and the boots
 * disturbed it, a few stones. One unit across, so heroes.js sizes it from the model's reach.
 */
function buildGroundPatch() {
  const g = new THREE.Group();
  // MARE_DUST, not REGOLITH: measured in headless Chrome on 2026-10-08, the oddities' lighter grey
  // drew as a beige plate on the dark map of the Sea of Tranquility. This is the tone of that map
  // in sunlight, so the patch reads as disturbed ground and not as a mat.
  g.add(regolith(0.5, '#55544F', 28));
  return g;
}

// ------------------------------------------------------------------------- odd things we sent

// registry/oddities.yaml gives every row a `shape.build`, and this is where the eight names in
// that set become geometry. Adding a ninth is a row there and a function here -- the same two
// edits `stands_for` already documents -- and check_registry.py refuses a row naming a build this
// table does not have, because a card that names a shape nobody drew is the defect this layer
// exists to prevent.
//
// ONE DETAIL PER OBJECT, and it is the detail rather than the object that carries the recognition
// at 40 px: the fourteen-ray pulsar starburst on the record's cover, the warp in Duke's print,
// the six-iron head lashed to a sample scoop, the tardigrade's reversed rear leg pair, Starman's
// elbow out of the window. Every one of them is drawn here on purpose and named in the row's
// `shape.departure:` where the drawing knowingly differs from the object.
//
// NO TEXTURES ANYWHERE IN THIS FILE, and that is not an oversight: tests/test_contract.mjs
// imports this module in node to measure every shape against its budget, so a builder that
// touched `document` or loaded an image could not be measured at all. Everything below is
// primitives and the one shared toon material family.

// Every colour here is INFERRED. No hex is published for the Golden Record's gold plating, the
// Roadster's "midnight cherry", Starman's suit, the milled aluminium of the Juno figures or
// Beresheet's nickel -- so these are ours, the card never states a colour, and registry/
// rockets.yaml applies exactly this rule to the 34 rows with no sourced livery.
const GOLD = '#D4AF37';
const ALUMINIUM = '#C8CCD0';
const ENGRAVED = '#7C838F';
const NICKEL = '#C6C9CC';
const REGOLITH = '#8A8A85';
const BALL_WHITE = '#F2F2EF';
const PRINT_WHITE = '#E9E4D8';
const SUIT_WHITE = '#EDEFF2';
const VISOR = '#20242C';
const CHERRY = '#8C1220';
const TYRE = '#2A2D33';

/** A flat filled circle facing +Z. */
function discFlat(r, seg, colour, kind, name) {
  return mesh(new THREE.CircleGeometry(r, seg), colour, kind, name);
}
/** A flat annulus facing +Z: the cheapest way to draw an engraved circle. */
function ringFlat(rInner, rOuter, seg, colour, kind, name) {
  return mesh(new THREE.RingGeometry(rInner, rOuter, seg), colour, kind, name);
}
/** A flat rectangle facing +Z. Two triangles, and it is how every engraved bar here is drawn. */
function plate(w, h, colour, kind, name) {
  return mesh(new THREE.PlaneGeometry(w, h), colour, kind, name);
}
/** An open-ended cylinder: a band round something, with no caps to pay for. */
function band(r, h, seg, colour, kind, name) {
  return mesh(new THREE.CylinderGeometry(r, r, h, seg, 1, true), colour, kind, name);
}

/**
 * THE detail on the Golden Record: the fourteen-ray pulsar map, the same diagram as the Pioneer
 * plaques. Each ray is one triangle from a shared hub, and the lengths differ because the real
 * ones do -- seeded by the ray index, so the same starburst appears on every machine.
 *
 * It is GEOMETRY and not a texture on purpose. A texture detail dies at distance; an extruded one
 * survives, and this asterisk is the most legible mark on the whole object.
 */
function starburst(rays, rMax, colour, name) {
  const pos = [];
  const half = 0.055; // half the angular width of a ray at the hub
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const len = rMax * (0.5 + 0.5 * hash01(i + 1));
    pos.push(0, 0, 0);
    pos.push(Math.cos(a - half) * len, Math.sin(a - half) * len, 0);
    pos.push(Math.cos(a + half) * len, Math.sin(a + half) * len, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return mesh(g, colour, 'panel', name);
}

/**
 * A patch of ground, so a thing lying on the Moon reads as lying on something. It was one flat
 * disc with a hard round edge, which public #267 called a decal: now a ragged outline, a darker
 * scuffed patch inside it and a few stones, each from the same seeded noise on every machine.
 * Three draw calls. The tangent plane touches the sphere exactly at the origin, hence the lift.
 */
function ragged(r, n, seed, y, colour, name) {
  const pos = [];
  const rim = (i) => r * (0.74 + 0.26 * hash01(seed + (i % n) * 31));
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    const r0 = rim(i), r1 = rim(i + 1);
    pos.push(0, y, 0, Math.cos(a1) * r1, y, Math.sin(a1) * r1, Math.cos(a0) * r0, y, Math.sin(a0) * r0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return mesh(geo, colour, 'body', name);
}
function regolith(r, colour, seg) {
  const col = colour || REGOLITH;
  const dark = `#${new THREE.Color(col).multiplyScalar(0.74).getHexString()}`;
  const g = new THREE.Group();
  g.name = 'ground';
  const n = Math.max(14, seg || 18);
  g.add(ragged(r, n, 11, 0.002, col, 'ground'));
  g.add(ragged(r * 0.56, Math.max(9, n >> 1), 53, 0.0035, dark, 'ground-scuffed'));
  const pos = [];
  const nor = [];
  for (let i = 0; i < 6; i++) {
    const a = hash01(i * 97 + 5) * Math.PI * 2;
    const d = r * (0.5 + 0.38 * hash01(i * 41 + 3));
    const stone = new THREE.OctahedronGeometry(r * (0.018 + 0.022 * hash01(i * 13 + 1)), 0).toNonIndexed();
    stone.scale(1, 0.6, 1.3);
    stone.rotateY(a * 3);
    stone.translate(Math.cos(a) * d, r * 0.012, Math.sin(a) * d);
    stone.computeVertexNormals();
    for (const v of stone.attributes.position.array) pos.push(v);
    for (const v of stone.attributes.normal.array) nor.push(v);
    stone.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.add(mesh(geo, dark, 'body', 'stones'));
  return g;
}

// 1. The Voyager Golden Record -- 30 cm gold-plated copper disc, aluminium cover engraved in four
// quadrants. The cover diagram's layout is published corner by corner; the starburst's SIZE is
// ours, drawn two to three times over, which is what the row's `departure:` says out loud.
function buildGoldenRecord() {
  const g = new THREE.Group();
  g.userData.realSizeM = 0.3;

  const record = new THREE.Group();
  record.name = 'record';
  const face = cyl(0.34, 0.34, 0.012, 32, GOLD, 'panel', 'disc');
  face.rotation.x = Math.PI / 2; // the axis is +Z, so the face looks at the camera
  record.add(face);
  const grooves = ringFlat(0.13, 0.30, 20, '#C09A2E', 'panel', 'grooves');
  grooves.position.z = 0.007;
  record.add(grooves);
  const spindle = discFlat(0.022, 10, '#6E5A18', 'body', 'spindle');
  spindle.position.z = 0.008;
  record.add(spindle);
  record.position.x = -0.30;
  g.add(record);

  // The cover, hinged open beside it so both faces of the object are visible at once.
  const cover = new THREE.Group();
  cover.name = 'cover';
  const coverPlate = box(0.74, 0.74, 0.014, ALUMINIUM, 'panel', 'cover-plate');
  cover.add(coverPlate);

  // upper left: the record and its stylus, in the starting position
  const mini = ringFlat(0.045, 0.075, 12, ENGRAVED, 'panel', 'diagram-record');
  mini.position.set(-0.18, 0.18, 0.008);
  cover.add(mini);
  const stylus = plate(0.11, 0.012, ENGRAVED, 'panel', 'diagram-stylus');
  stylus.position.set(-0.12, 0.22, 0.008);
  stylus.rotation.z = -0.5;
  cover.add(stylus);

  // upper right: how to build a picture from the signal -- the scan lines
  for (let i = 0; i < 3; i++) {
    const line = plate(0.17, 0.012, ENGRAVED, 'panel', 'diagram-scan');
    line.position.set(0.18, 0.24 - i * 0.055, 0.008);
    cover.add(line);
  }

  // lower left: THE detail
  const burst = starburst(14, 0.20, ENGRAVED, 'diagram-pulsars');
  burst.position.set(-0.18, -0.17, 0.009);
  cover.add(burst);

  // lower right: the hydrogen atom in its two lowest states
  // Two circles, one above the other and clearly separate: side by side with a bar between them
  // they read as a second record-and-stylus, which is the upper-left quadrant's mark.
  for (const dy of [-0.062, 0.062]) {
    const atom = ringFlat(0.030, 0.044, 10, ENGRAVED, 'panel', 'diagram-hydrogen');
    atom.position.set(0.19, -0.17 + dy, 0.008);
    cover.add(atom);
  }
  const bond = plate(0.010, 0.038, ENGRAVED, 'panel', 'diagram-bond');
  bond.position.set(0.19, -0.17, 0.008);
  cover.add(bond);

  cover.position.set(0.30, 0, -0.06);
  cover.rotation.y = -0.52; // about 30 degrees, hinged open
  g.add(cover);
  return g;
}

// 2. Charlie Duke's family photograph -- a 3 x 5 inch print sealed in clear plastic, lying face-up
// in the dust at Descartes. THE detail is the warp: sources describe it as crumpled from riding in
// a suit pocket, and a flat quad reads as a texture swatch where a warped one reads as an object.
//
// The picture itself is not drawn. It is the Duke family's photograph, of four people who did not
// publish it for this, and the row's `departure:` says the print is blank on purpose.
function buildWrappedPhoto() {
  const g = new THREE.Group();
  g.userData.realSizeM = 0.127;

  const printGeom = new THREE.PlaneGeometry(0.68, 0.42, 4, 3);
  warpS(printGeom, 0.022);
  const print = mesh(printGeom, PRINT_WHITE, 'panel', 'print');
  print.rotation.x = -Math.PI / 2;
  print.position.y = 0.012;
  g.add(print);

  // THE SAME segmentation and THE SAME amplitude as the print, or the two warped surfaces are
  // sampled differently and the inset pokes through the card in jagged steps -- which is exactly
  // what it did in the browser at 2 x 2.
  const imageGeom = new THREE.PlaneGeometry(0.56, 0.32, 4, 3);
  warpS(imageGeom, 0.022);
  const image = mesh(imageGeom, '#B9A98F', 'body', 'image-area');
  image.rotation.x = -Math.PI / 2;
  image.position.y = 0.019;
  g.add(image);

  // The specular streak off the plastic. One white highlight does more work than any picture
  // content would at this size.
  const glint = plate(0.34, 0.026, '#FFFFFF', 'panel', 'glint');
  glint.rotation.x = -Math.PI / 2;
  glint.rotation.z = 0.55;
  glint.position.set(-0.13, 0.03, -0.07);
  g.add(glint);

  g.add(regolith(0.45, null, 12));
  return g;
}

/** Displace a plane's interior rows in a shallow S, so it reads as crumpled rather than flat. */
function warpS(geometry, amp) {
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, Math.sin(x * 6.0) * amp + Math.cos(y * 4.5) * amp * 0.6);
  }
  p.needsUpdate = true;
  geometry.computeVertexNormals();
}

// 3. The Beresheet lunar library and a tardigrade. Two objects, one card: 25 nickel discs 120 mm
// across and 1 mm thick, and the dried tuns of the animals laid between them.
//
// TWO deliberate departures, both in the row: a 120:1 disc drawn at 120:1 has an invisible edge,
// so the stack is thickened and the lamination is drawn as four bands rather than twenty-five;
// and a half-millimetre animal beside a 12 cm disc would be four pixels, so it is not to scale.
// THE detail is the tardigrade's rear leg pair, which points BACKWARDS while the first three
// point down. That is the anatomical tell and it survives to a very small size.
function buildDiscStack() {
  const g = new THREE.Group();
  g.userData.realSizeM = 0.12;

  const stack = new THREE.Group();
  stack.name = 'stack';
  const body = cyl(0.30, 0.30, 0.075, 24, NICKEL, 'panel', 'discs');
  body.position.y = 0.038;
  stack.add(body);
  for (let i = 0; i < 4; i++) {
    const b = band(0.306, 0.008, 16, '#9AA0A6', 'body', 'lamination');
    b.position.y = 0.014 + i * 0.019;
    stack.add(b);
  }
  stack.position.x = -0.22;
  g.add(stack);

  const t = new THREE.Group();
  t.name = 'tardigrade';
  const barrel = mesh(new THREE.CapsuleGeometry(0.085, 0.20, 3, 10), '#E6E2D6', 'body', 'barrel');
  barrel.rotation.z = Math.PI / 2; // the body runs along X, head at +X
  barrel.position.y = 0.085;
  t.add(barrel);
  for (const x of [0.055, 0.0, -0.055]) {
    const ridge = band(0.088, 0.012, 10, '#D4CFC0', 'body', 'ridge');
    ridge.rotation.z = Math.PI / 2;
    ridge.position.set(x, 0.085, 0);
    t.add(ridge);
  }
  const snout = cyl(0.028, 0.055, 0.06, 7, '#DED9CA', 'body', 'snout');
  snout.rotation.z = -Math.PI / 2;
  snout.position.set(0.175, 0.085, 0);
  t.add(snout);
  // Eight stubby legs. The first three pairs point down; THE REAR PAIR POINTS BACKWARDS.
  for (const [x, back] of [[0.10, false], [0.035, false], [-0.03, false], [-0.115, true]]) {
    for (const z of [-0.058, 0.058]) {
      const leg = box(0.03, 0.075, 0.03, '#DED9CA', 'body', back ? 'leg-rear' : 'leg');
      leg.position.set(x, 0.05, z);
      if (back) {
        leg.position.set(x - 0.03, 0.07, z);
        leg.rotation.z = 0.95; // swung back along the body, which is the tell
      }
      t.add(leg);
    }
  }
  t.position.set(0.30, 0, 0);
  t.scale.setScalar(0.85);
  g.add(t);

  g.add(regolith(0.48));
  return g;
}

// 4. Alan Shepard's two golf balls, and the six-iron head he screwed to a contingency sample
// scoop. Two white spheres are two white spheres; THE detail is the club, because a golf club
// head bolted to a geology tool is the actual story and it is unmistakable.
//
// The balls really are 24 and 40 yards apart. At map scale that is smaller than a pixel, so they
// are drawn side by side and the row's `departure:` says so.
function buildGolfBalls() {
  const g = new THREE.Group();
  // The conforming golf ball, 42.67 mm. The club's length is not published anywhere reached, so
  // the size claim is the ball's and only the ball's.
  g.userData.realSizeM = 0.0427;

  // THE BALLS AGAINST THE CLUB (public #267: "the golf balls are bigger than the club"). A ball is
  // 42.67 mm and the iron's head beside it is 0.26 units, so at 0.07 units of radius the ball is a
  // little over half the head's length, which is how a ball sits against an iron. The head's own
  // length is not published for Shepard's club, so this is a proportion and not a measurement.
  for (const [x, z] of [[-0.24, 0.15], [-0.09, -0.19]]) {
    const ball = mesh(new THREE.SphereGeometry(0.07, 12, 8), BALL_WHITE, 'panel', 'ball');
    ball.position.set(x, 0.07, z);
    g.add(ball);
  }

  const club = new THREE.Group();
  club.name = 'club';
  // Bigger than scale and darker than the dust on purpose: at 0.16 x 0.10 the head vanished
  // behind a golf ball in the browser, and the head is the entire story.
  const head = box(0.26, 0.15, 0.07, '#77808E', 'panel', 'iron-head');
  head.rotation.z = 0.30; // the loft of a six iron, which is what makes it read as an iron
  head.position.set(0.0, 0.075, 0);
  club.add(head);
  const hosel = cyl(0.022, 0.022, 0.10, 6, '#77808E', 'body', 'hosel');
  hosel.position.set(0.11, 0.15, 0);
  hosel.rotation.z = -0.35;
  club.add(hosel);
  const handle = cyl(0.018, 0.024, 0.50, 8, '#D8D2C4', 'body', 'scoop-handle');
  handle.position.set(0.23, 0.32, 0);
  handle.rotation.z = -0.35;
  club.add(handle);
  // the lashing: he screwed the head onto the handle, and it was famously not a tidy job
  for (const t of [0.0, 0.05]) {
    const lash = band(0.028, 0.025, 6, '#3C424C', 'body', 'lashing');
    lash.position.set(0.135 + t * 0.35, 0.20 + t, 0);
    lash.rotation.z = -0.35;
    club.add(lash);
  }
  club.position.set(0.16, 0, 0.16);
  club.rotation.y = -0.75;
  g.add(club);

  // A SMALL disc: selected in the browser at 260 px, a 0.5 ground read as a grey blob with two
  // dots on it. The dust is context for the objects, not the object.
  g.add(regolith(0.38));
  return g;
}

// 5. The three aluminium figures bolted to Juno's deck: Galileo, Jupiter, and Juno. Milled from
// solid aluminium, 4 cm tall, unpainted.
//
// THE detail is the props, because three identical bodies differ ONLY by what is in the hand:
// Juno's magnifying glass, Jupiter's lightning bolt, Galileo's telescope and globe. They are
// drawn at about twice scale or the group is three silver blobs, and the row says so.
//
// The bodies are deliberately blocky and low-detail: the minifigure SHAPE is a registered
// trademark independent of any model's copyright, so this draws the idea and never the wordmark.
function buildMinifigures() {
  const g = new THREE.Group();
  g.userData.realSizeM = 0.04;

  const deck = box(0.9, 0.03, 0.34, '#9AA3B0', 'panel', 'deck');
  deck.position.y = -0.015;
  g.add(deck);

  const props = ['glass', 'bolt', 'telescope'];
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Group();
    f.name = `figure-${props[i]}`;
    const legs = box(0.13, 0.14, 0.09, '#B8BCC0', 'panel', 'legs');
    legs.position.y = 0.07;
    f.add(legs);
    const torso = box(0.15, 0.15, 0.085, '#B8BCC0', 'panel', 'torso');
    torso.position.y = 0.215;
    f.add(torso);
    const head = cyl(0.05, 0.05, 0.09, 6, '#C4C8CC', 'panel', 'head');
    head.position.y = 0.335;
    f.add(head);
    const stud = cyl(0.022, 0.022, 0.022, 6, '#C4C8CC', 'body', 'stud');
    stud.position.y = 0.39;
    f.add(stud);
    for (const s of [-1, 1]) {
      const arm = box(0.045, 0.13, 0.05, '#B8BCC0', 'panel', 'arm');
      arm.position.set(s * 0.095, 0.225, 0.01);
      arm.rotation.z = s * 0.28;
      f.add(arm);
      const hand = band(0.026, 0.03, 6, '#C4C8CC', 'body', 'hand');
      hand.position.set(s * 0.125, 0.155, 0.02);
      f.add(hand);
    }
    f.add(buildFigureProp(props[i]));
    f.position.set(-0.3 + i * 0.3, 0, 0);
    f.scale.setScalar(0.92);
    g.add(f);
  }
  return g;
}

/** One prop per figure, drawn at about twice scale so the three are told apart at all. */
function buildFigureProp(which) {
  const p = new THREE.Group();
  p.name = `prop-${which}`;
  if (which === 'glass') {
    const lens = ringFlat(0.05, 0.072, 10, '#DCE3EC', 'panel', 'lens-rim');
    lens.position.set(0.17, 0.30, 0.02);
    p.add(lens);
    const grip = box(0.022, 0.11, 0.022, '#C4C8CC', 'body', 'grip');
    grip.position.set(0.145, 0.20, 0.02);
    grip.rotation.z = 0.3;
    p.add(grip);
  } else if (which === 'bolt') {
    const strokes = [
      [0.15, 0.30, 0.55, 0.13, 0.05],
      [0.19, 0.21, -0.7, 0.12, 0.05],
      [0.15, 0.12, 0.55, 0.11, 0.05],
    ];
    for (const [x, y, rot, len, w] of strokes) {
      const s = box(w, len, 0.028, '#DFE6F0', 'panel', 'bolt');
      s.position.set(x, y, 0.02);
      s.rotation.z = rot;
      p.add(s);
    }
  } else {
    const tube = cyl(0.026, 0.036, 0.20, 6, '#C4C8CC', 'panel', 'telescope');
    tube.position.set(0.16, 0.26, 0.02);
    tube.rotation.z = -0.6;
    p.add(tube);
    // Held forward rather than out to the side: at x = -0.16 the globe sat between two figures
    // and read as the neighbour's prop.
    const globe = mesh(new THREE.SphereGeometry(0.05, 6, 4), '#B8BCC0', 'body', 'globe');
    globe.position.set(-0.13, 0.17, 0.16);
    p.add(globe);
  }
  return p;
}

// 6. The Roadster, and the man in it. The car is 3 946 x 1 873 x 1 127 mm on a 2 352 mm wheelbase
// -- a very short wheelbase for that width, which is half the recognition -- and every one of
// those numbers is published.
//
// THE detail is not the car. Starman's pose is documented: right hand on the wheel, LEFT ELBOW
// RESTING ON THE OPEN WINDOW SILL. At 40 px the read is a white head and shoulders sticking out
// of a low red wedge, and if the elbow is not out it is a car with a doll in it.
function buildRoadster() {
  const g = new THREE.Group();
  g.userData.realSizeM = 3.946;

  // Everything below is in METRES and divided once at the end, exactly as buildRocket() does, so
  // the published dimensions stay readable in the source: 3 946 long, 1 873 wide, 1 127 tall, on
  // a 2 352 mm wheelbase. That wheelbase is very short for that width and it is half the read.
  const m = new THREE.Group();
  m.name = 'metres';

  // The side profile: nose at +X, tail at -X, and THE COCKPIT IS AN OPENING IN THE OUTLINE rather
  // than a dark box dropped on top of a solid wedge. That matters -- the silhouette has to be
  // open-topped, or the white head and shoulders above it read as a doll glued to a car.
  const side = new THREE.Shape();
  side.moveTo(1.973, 0.30);
  side.lineTo(1.973, 0.46);   // nose
  side.lineTo(1.55, 0.60);
  side.lineTo(0.62, 0.645);   // the long bonnet
  side.lineTo(0.30, 1.00);    // windscreen, raked hard back
  side.lineTo(0.14, 1.00);
  side.lineTo(0.08, 0.66);    // down into the footwell: the cockpit opening starts here
  side.lineTo(-0.58, 0.62);
  side.lineTo(-0.74, 0.88);   // the hump behind the seats
  side.lineTo(-1.12, 0.74);
  side.lineTo(-1.90, 0.56);
  side.lineTo(-1.973, 0.34);  // tail
  side.lineTo(-1.973, 0.16);
  side.lineTo(-0.95, 0.10);
  side.lineTo(0.95, 0.10);
  side.lineTo(1.90, 0.16);
  side.closePath();
  // 1 450 across the body, so the wheels stand proud of it and the whole car measures the
  // published 1 873 across the tyres. At 1 720 the wheels were INSIDE the bodywork and the two
  // surfaces z-fought, which is what a browser check is for.
  const bodyGeom = new THREE.ExtrudeGeometry(side, {
    depth: 1.45,
    bevelEnabled: true,
    bevelSize: 0.075,
    bevelThickness: 0.06,
    bevelSegments: 2,
    curveSegments: 1,
  });
  bodyGeom.translate(0, 0, -0.725); // extruded along +Z; centre it on the car's own axis
  const body = mesh(bodyGeom, CHERRY, 'panel', 'body');
  m.add(body);

  // The sills, riding on the outer edges of the cockpit notch. The LEFT one is load-bearing:
  // it is the window sill Starman's elbow rests on, and without it the elbow rests on air.
  for (const z of [-0.715, 0.715]) {
    const sill = box(1.14, 0.15, 0.15, CHERRY, 'panel', 'sill');
    sill.position.set(-0.28, 0.70, z);
    m.add(sill);
  }
  // The floor of the well, dark, so the opening reads as a hole and not as a gap in the mesh.
  const floor = box(1.05, 0.06, 1.35, '#3A1116', 'body', 'cockpit-floor');
  floor.position.set(-0.28, 0.58, 0);
  m.add(floor);

  // No separate windscreen mesh: the raked face between (0.62, 0.645) and (0.30, 1.00) in the
  // profile above IS the screen, and a box laid over it was buried inside the body.

  // Four wheels at the corners of the 2 352 mm wheelbase.
  for (const x of [-1.176, 1.176]) {
    for (const z of [-0.815, 0.815]) {
      const wheel = cyl(0.335, 0.335, 0.24, 16, TYRE, 'body', 'wheel');
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.335, z);
      m.add(wheel);
      const hub = discFlat(0.17, 10, '#9AA3B0', 'panel', 'hub');
      hub.position.set(x, 0.335, z + Math.sign(z) * 0.125);
      hub.rotation.y = z > 0 ? 0 : Math.PI;
      m.add(hub);
    }
  }

  // Lamps, lying on the sloped bonnet and the tail the way the donor Elise's do. They tell the
  // front from the back at a glance, which a symmetrical wedge otherwise does not, and they sit
  // ON the surface rather than inside it -- the first pass buried them in the nose.
  for (const [x, y, colour] of [[1.63, 0.615, '#F2EEDF'], [-1.66, 0.60, '#8E1B1B']]) {
    for (const z of [-0.40, 0.40]) {
      const lamp = box(0.26, 0.05, 0.22, colour, 'panel', 'lamp');
      lamp.position.set(x, y, z);
      lamp.rotation.z = x > 0 ? -0.08 : 0.16;
      m.add(lamp);
    }
  }

  // The sign on the dash. THE WORDS ARE NOT DRAWN: a blank plate is what this is, and the row's
  // `departure:` says so rather than letting two bars of geometry stand in for two words.
  const sign = box(0.02, 0.15, 0.30, '#E8E4DA', 'panel', 'dash-sign');
  sign.position.set(0.16, 0.82, 0.16);
  sign.rotation.z = 0.5;
  m.add(sign);

  // The steering wheel, in front of the driver -- who sits on the LEFT, at -Z.
  const rim = ringFlat(0.13, 0.175, 12, '#2A2D33', 'body', 'steering-wheel');
  rim.position.set(0.02, 0.88, -0.40);
  rim.rotation.set(0, Math.PI / 2, 0);
  rim.rotateX(-0.95);
  m.add(rim);

  // THE ART PASS (public #432, 2026-10-08). No licensed mesh of this car exists, so the silhouette
  // has to come from the parts a person knows it by: a glass screen in a body-colour frame, two
  // high-backed seats, door mirrors, the air scoop cut into each flank behind the door, the dark
  // mouth under the nose, a lip on the tail. Positions are read off photographs and are ours; the
  // four published numbers above are unchanged. Three meshes.
  const glass = box(0.03, 0.44, 1.26, DARK_GLASS, 'panel', 'windscreen');
  glass.position.set(0.485, 0.845, 0);
  glass.rotation.z = 0.733; // along the raked face of the profile, a hair proud of it
  m.add(glass);
  m.add(slabs([
    [0.13, 0.5, 0.4, -0.56, 0.9, 0.36], [0.11, 0.16, 0.26, -0.6, 1.2, 0.36],      // the passenger seat
    [0.13, 0.5, 0.4, -0.56, 0.9, -0.36], [0.11, 0.16, 0.26, -0.6, 1.2, -0.36],    // the driver's, behind him
    [0.46, 0.15, 0.03, -0.78, 0.47, 0.741], [0.46, 0.15, 0.03, -0.78, 0.47, -0.741], // the side scoops
    [0.03, 0.11, 0.86, 1.985, 0.3, 0],                                              // the mouth under the nose
    [0.03, 0.1, 1.0, -1.985, 0.24, 0],                                              // the diffuser
  ], '#1D1F24', 'body', 'trim'));
  m.add(slabs([
    [0.1, 0.07, 0.15, 0.3, 0.99, 0.8], [0.1, 0.07, 0.15, 0.3, 0.99, -0.8],          // door mirrors
    [0.05, 0.03, 0.1, 0.3, 0.95, 0.72], [0.05, 0.03, 0.1, 0.3, 0.95, -0.72],        // and their stalks
    [0.14, 0.035, 1.3, -1.9, 0.6, 0],                                               // the lip on the tail
    [0.035, 0.4, 0.05, 0.47, 0.84, 0.655], [0.035, 0.4, 0.05, 0.47, 0.84, -0.655],  // the screen's pillars
  ], CHERRY, 'panel', 'brightwork'));

  m.add(buildStarman());

  m.scale.setScalar(1 / 3.946); // ONE division: the whole car becomes 1 unit
  m.position.y = -0.14;
  g.add(m);
  return g;
}

/**
 * The figure in the driving seat, in metres, in the car's frame: nose at +X, up at +Y, and the
 * driver's own left hand side at -Z.
 *
 * THE POSE IS THE OBJECT. It is documented -- right hand on the wheel, left elbow resting on the
 * open window sill -- and at 40 px the read is a white head and shoulders out of a low red wedge
 * with one arm hooked over the side. Get the pose, not the panel gaps.
 */
function buildStarman() {
  const s = new THREE.Group();
  s.name = 'starman';
  const Z = -0.36; // the driver's seat, left of centre

  const torso = mesh(new THREE.CapsuleGeometry(0.20, 0.34, 3, 10), SUIT_WHITE, 'panel', 'torso');
  torso.position.set(-0.34, 1.02, Z);
  torso.rotation.z = -0.16;
  s.add(torso);

  const head = mesh(new THREE.SphereGeometry(0.175, 12, 8), SUIT_WHITE, 'panel', 'helmet');
  head.position.set(-0.29, 1.42, Z);
  s.add(head);
  // The visor: a cap of the same sphere, turned to face forward and down the road.
  // 0.182 against the helmet's 0.175: a visor drawn SMALLER than the helmet is a visor inside
  // the helmet, which is what the first browser check showed -- a plain white ball.
  const visor = mesh(
    new THREE.SphereGeometry(0.182, 10, 6, 0, Math.PI * 0.95, 0.62, 1.05), VISOR, 'panel', 'visor'
  );
  visor.position.copy(head.position);
  visor.rotation.y = -1.05; // looking down the road, which is +X
  s.add(visor);

  for (const z of [Z - 0.19, Z + 0.19]) {
    const sh = box(0.20, 0.13, 0.14, '#2C3038', 'panel', 'shoulder');
    sh.position.set(-0.33, 1.20, z);
    s.add(sh);
  }

  // RIGHT HAND ON THE WHEEL. Upper arm down and forward, forearm across to the rim.
  const upperR = cyl(0.062, 0.062, 0.32, 8, SUIT_WHITE, 'panel', 'arm-r-upper');
  upperR.position.set(-0.24, 1.02, Z + 0.16);
  upperR.rotation.set(0, 0, -0.75);
  s.add(upperR);
  const foreR = cyl(0.055, 0.055, 0.34, 8, SUIT_WHITE, 'panel', 'arm-r-fore');
  foreR.position.set(-0.05, 0.92, Z + 0.06);
  foreR.rotation.set(0.35, 0, -1.30);
  s.add(foreR);
  const handR = mesh(new THREE.SphereGeometry(0.07, 6, 4), SUIT_WHITE, 'panel', 'hand-r');
  handR.position.set(0.06, 0.88, Z);
  s.add(handR);

  // LEFT ELBOW OUT OF THE WINDOW, resting on the sill. This is the silhouette everybody on Earth
  // already has in their head, and it is the one thing here that must not be got wrong.
  const upperL = cyl(0.062, 0.062, 0.34, 8, SUIT_WHITE, 'panel', 'arm-l-upper');
  upperL.position.set(-0.37, 1.00, Z - 0.27);
  upperL.rotation.set(1.15, 0, 0.20);
  s.add(upperL);
  const elbow = mesh(new THREE.SphereGeometry(0.09, 6, 4), '#2C3038', 'panel', 'elbow');
  elbow.position.set(-0.40, 0.80, Z - 0.50); // past the sill at 0.715: what "out" means
  s.add(elbow);
  const foreL = cyl(0.055, 0.055, 0.36, 8, SUIT_WHITE, 'panel', 'arm-l-fore');
  foreL.position.set(-0.22, 0.78, Z - 0.50);
  foreL.rotation.set(0, 0, -1.35);
  s.add(foreL);

  return s;
}

// 7. The Graflex 3-cell press-camera flash handle the Return of the Jedi prop was built on.
//
// THE detail is that it must read as a camera part and NOT as a lightsaber: the ribbed grip and
// the clamp, no emitter and no blade. The hilt's design, the name and the object are not ours to
// draw, and the row says that in its `departure:` rather than leaving a visitor to wonder why the
// famous shape is missing.
function buildFlashHandle() {
  const g = new THREE.Group();
  // No published length for a 3-cell Graflex handle was reached, so this model states no size.
  // The field is a real measurement here or it is absent.

  const grip = cyl(0.10, 0.10, 0.62, 12, '#AEB5BE', 'panel', 'grip');
  g.add(grip);
  for (let i = 0; i < 6; i++) {
    const rib = band(0.116, 0.028, 8, '#8E97A2', 'body', 'rib');
    rib.position.y = -0.20 + i * 0.08;
    g.add(rib);
  }
  const base = cyl(0.115, 0.125, 0.06, 12, '#8E97A2', 'panel', 'base');
  base.position.y = -0.34;
  g.add(base);
  // The clamp: the part that held it to a press camera, and the reason this is not a hilt.
  const jaw = box(0.09, 0.10, 0.20, '#C8CCD0', 'panel', 'clamp');
  jaw.position.set(0.13, 0.26, 0);
  g.add(jaw);
  const screw = cyl(0.02, 0.02, 0.10, 6, '#8E97A2', 'body', 'clamp-screw');
  screw.rotation.z = Math.PI / 2;
  screw.position.set(0.19, 0.22, 0);
  g.add(screw);
  return g;
}

// 8. The placeholder, and it is deliberately not a thing. A row may always say `build: generic`;
// it draws this and the card says, in words, that we have no shape for the object. Anything
// prettier here would be a guess wearing a shape.
function buildOddityGeneric() {
  const g = new THREE.Group();
  const core = mesh(new THREE.OctahedronGeometry(0.34, 0), '#8E93A8', 'body', 'placeholder');
  g.add(core);
  return g;
}

/**
 * One BUILDERS key per `shape.build` value registry/oddities.yaml allows, exactly as
 * rocketVariants() does for the rockets: a row naming a shape this table does not have would be
 * drawn `generic` by modelFor() with nothing on the card saying so, and check_registry.py refuses
 * that row instead. `default` is the placeholder, because a class that must always answer should
 * answer with the honest shape rather than a plausible one.
 */
const ODDITY_BUILDERS = {
  default: buildOddityGeneric,
  generic: buildOddityGeneric,
  'golden-record': buildGoldenRecord,
  'wrapped-photo': buildWrappedPhoto,
  'disc-stack': buildDiscStack,
  'golf-balls': buildGolfBalls,
  minifigures: buildMinifigures,
  roadster: buildRoadster,
  'flash-handle': buildFlashHandle,
};

// ------------------------------------------------------------------------------------- registry

// One row per model. Adding a shape is a row here, not a change to modelFor().
const BUILDERS = {
  station: { default: buildStation, iss: buildStation, soyuz: buildSoyuzFamily, progress: buildSoyuzFamily, shenzhou: buildSoyuzFamily, tianzhou: buildSoyuzFamily, cygnus: buildCygnus, dragon: buildDragon, 'dragon-cargo': buildDragon, tiangong: buildTiangong, 'tiangong-module': buildTiangong },
  satellite: {
    default: buildSatelliteComms,
    comms: buildSatelliteComms,
    iridium: buildIridium,
    spacemobile: buildSpaceMobile,
    solarsail: buildSolarSail,
    sphere: buildGeodeticSphere,
    radar: buildRadarImager,
    'radar-mesh': buildMeshReflector,
    cubesat: buildCubeSat,
    'cubesat-6u': buildCubeSat,
    'cubesat-1u': buildCubeSatSmall,
    'cubesat-2u': buildCubeSatSmall,
    oneweb: buildOneWeb,
    'starlink-v1': buildStarlink,
    'starlink-v2': buildStarlink,
    navigation: buildNavSatellite,
    'navigation-gps-iif': buildNavSatellite,
    'navigation-gps-iii': buildNavSatellite,
    'navigation-glonass-m': buildNavSatellite,
    'navigation-glonass-k': buildNavSatellite,
    'navigation-beidou-meo': buildNavSatellite,
    // The telescope tube, for records whose klass is `satellite` -- the catalogue does not call
    // anything a telescope, so an observatory arrives as a satellite and needs a satellite variant
    // to be drawn as one. buildTelescope treats any variant but `hex` as the tube.
    'space-telescope': buildTelescope,
  },
  debris: { default: buildDebris },
  rocket: rocketVariants(),
  probe: { default: buildProbe, 'new-horizons': buildNewHorizons, 'solar-orbiter': buildSolarOrbiter, 'mars-2020-cruise': buildMars2020Cruise },
  telescope: { default: buildTelescope, tube: buildTelescope, hex: buildJwst, jwst: buildJwst, gaia: buildGaia },
  asteroid: { default: buildAsteroid },
  comet: { default: buildComet },
  site: {
    default: buildSitePad,
    pad: buildSitePad,
    dish: buildSiteDish,
    dome: buildSiteDome,
    rover: buildSiteRover,
    lander: buildSiteLander,
    surveyor: buildSurveyor,
    'ground-moon': buildGroundPatch,
  },
  oddity: ODDITY_BUILDERS,
  world: { default: () => new THREE.Group() }, // worlds.js owns the worlds; this keeps modelFor total
};

/**
 * Procedural cartoon geometry for a visual class.
 * @param {string} klass station|satellite|debris|rocket|probe|telescope|asteroid|comet|site|world
 * @param {string} [variant] a key of that class's row, or any string for the seeded shapes
 * @returns {THREE.Object3D} always an Object3D; unknown classes fall back to a generic satellite
 *   and set userData.generic. THE CARD SAYS SO, and this line used to claim it did not: spec 0026
 *   item 3's derivedDrawingLine() in ui/cards.js prints "drawn as a generic satellite -- the kind
 *   of thing, not this exact one" from COPY.drawing.classShape for every class that reaches it.
 *   It does not read THIS flag -- it re-derives the same fact from scene/realmodels.js -- so the
 *   flag itself is still read by nothing, and that is the accurate version of the old sentence.
 */
/**
 * The class whose registry row holds `variant`, preferring `klass` itself.
 *
 * realmodels.js routes a record to a builder by name, and gates the route by the record's klass:
 * `'crew dragon'` accepts a station OR a satellite, because CelesTrak files a visiting vehicle
 * under whichever it likes. But the builders live in one row -- `dragon`, `soyuz`, `progress`,
 * `cygnus`, `shenzhou` and `tianzhou` are all under `station` -- so a Progress the catalogue calls
 * a satellite asked `satellite` for `progress`, found nothing, and was drawn as a comms satellite
 * with a dish. Measured on the live stations layer 2026-09-21: six visiting vehicles, all six.
 *
 * This does not AUTHORISE anything; the route already did, and that gate is what keeps 1279 Gaia
 * the asteroid from wearing a telescope's sunshield. It only says where the builder lives. A
 * variant no row holds returns `klass` unchanged, and modelFor() falls back as it always has.
 */
export function builderKlass(klass, variant) {
  if (variant == null || typeof variant !== 'string') return klass;
  const has = (k) => Object.prototype.hasOwnProperty.call(BUILDERS, k) &&
    Object.prototype.hasOwnProperty.call(BUILDERS[k], variant);
  if (has(klass)) return klass;
  for (const k of Object.keys(BUILDERS)) if (has(k)) return k;
  return klass;
}

export function modelFor(klass, variant, opts = {}) {
  // Own-property lookups only: a record whose klass or variant happened to be "constructor" or
  // "toString" would otherwise pull a function off Object.prototype and crash on the next line.
  const own = (o, k) => (typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
  const row = own(BUILDERS, klass);
  const generic = !row;
  const use = row || BUILDERS.satellite;
  const named = own(use, variant);
  const build = named || use.default;
  const pool = new Map();
  const outer = modelMaterials;
  modelMaterials = pool;
  let obj;
  try {
    // `opts` is additive and every other builder ignores it: it exists so a shape can be drawn
    // from the record's own measurements -- the asteroids are the first to need that.
    obj = build(variant, opts);
  } finally {
    modelMaterials = outer;
  }
  obj.userData.materials = [...pool.values()];
  obj.name = `model:${klass}${variant ? `:${variant}` : ''}`;
  obj.userData.klass = generic ? 'satellite' : klass;
  obj.userData.variant = variant || 'default';
  // "generic" means the shape may not be named as the object: an unknown class, or a variant that
  // was asked for and does not exist. (The card prints the equivalent sentence -- see above.)
  // Asking for NO variant gets the class's own default model, which
  // is not generic -- and heroes.js passes no variant for almost every record, so the old
  // `!use[variant]` marked every model in the app generic.
  obj.userData.generic = generic || (variant != null && !named);
  // A builder may say how its object flies (a spent stage tumbles); otherwise the class does.
  obj.userData.attitude = obj.userData.attitude || DEFAULT_ATTITUDE[klass] || 'fixed';
  return obj;
}

/**
 * Hang whatever rides on this record onto its model, as children.
 *
 * The Golden Record and Juno's three LEGO figures are not objects in space; they are parts of
 * objects in space. Drawing them as their own records would put a second dot under the first
 * (data/attached.js says why at length), so they are children of the carrier's model instead:
 * one dot in the sky, one tap, one card, and the part is there when you get close enough to see
 * the machine it is bolted to.
 *
 * THE CHILD IS IN THE CARRIER'S UNITS AND THE CARRIER OWNS EVERYTHING ELSE. Every model this app
 * draws -- procedural or a normalised glTF -- is about one unit across, and scene/heroes.js
 * writes the world scale, the position and the attitude onto the ROOT. A child inherits all
 * three, so this function sets a local offset and a local scale and nothing more. That is also
 * why it is safe to call twice: heroes.js calls it once on the procedural model and again on the
 * real one when NASA's file arrives, and the second call is on a different object.
 *
 * Both numbers are the registry's, both are drawing choices, and `mount_class: illustrative` on
 * the row is what makes the card say so.
 *
 * @param {THREE.Object3D} carrierObj the model from modelFor() or realmodels.js
 * @param {string} recordId the CARRIER's record id
 * @returns {THREE.Object3D[]} the children added, for a test to measure. Empty for almost
 *   everything, which is the normal case.
 */
export function attachOddityModels(carrierObj, recordId) {
  if (!carrierObj) return [];
  const made = [];
  for (const entry of attachedOdditiesFor(recordId)) {
    const child = modelFor('oddity', entry.build);
    child.position.set(entry.mount.x, entry.mount.y, entry.mount.z);
    child.scale.setScalar(entry.mount.scale);
    // Read by nothing that draws. It is here so a scene graph in a debugger, or a test, can say
    // which registry row a piece of geometry came from.
    child.userData.attachedOddity = entry.id;
    child.userData.carrierId = recordId;
    carrierObj.add(child);
    made.push(child);
  }
  return made;
}

/** The classes and variants modelFor() knows, for a test page or a registry check. */
export function modelVariants() {
  const out = {};
  for (const [k, row] of Object.entries(BUILDERS)) out[k] = Object.keys(row);
  return out;
}

// ------------------------------------------------------------------------------------ attitude

const DEFAULT_ATTITUDE = {
  station: 'sun-panels',
  satellite: 'sun-panels',
  telescope: 'sun-panels',
  probe: 'earth-dish',
  rocket: 'ascent',
  debris: 'fixed',
  asteroid: 'fixed',
  comet: 'anti-sun',
  site: 'up',
  // An oddity answers for itself: a photograph lying in lunar dust and a museum case both stand
  // on a surface (`meta.attitude: 'up'`, written by the emitter), while a car in heliocentric
  // orbit points nowhere in particular and gets the seeded constant below.
  oddity: 'fixed',
  world: 'fixed',
};

const _sun = new THREE.Vector3();
const _nadir = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _fallback = new THREE.Vector3(0, 1, 0);
const lessMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function toVec(out, v, fallback) {
  if (!v || (v.x === 0 && v.y === 0 && v.z === 0)) return out.copy(fallback);
  out.set(v.x, v.y, v.z);
  const l = out.length();
  return l > 1e-9 ? out.multiplyScalar(1 / l) : out.copy(fallback);
}

/** Right-handed basis with +Z along `zDir` and +X as close to `xHint` as it can be. */
function orient(obj, zDir, xHint) {
  _z.copy(zDir);
  _x.copy(xHint).addScaledVector(_z, -xHint.dot(_z));
  if (_x.lengthSq() < 1e-10) {
    _x.set(0, 0, 1).cross(_z);
    if (_x.lengthSq() < 1e-10) _x.set(1, 0, 0);
  }
  _x.normalize();
  _y.crossVectors(_z, _x).normalize();
  _m4.makeBasis(_x, _y, _z);
  obj.quaternion.setFromRotationMatrix(_m4);
}

/**
 * Aim a model. Called each frame for the <= 20 models on screen; cheap, and it is the difference
 * between a model that looks placed and one that looks correct.
 *
 * @param {THREE.Object3D} obj    from modelFor()
 * @param {object} record         the Record; record.meta.attitude overrides the class default
 * @param {{x,y,z}} sunDirScene   unit vector from the object TOWARD the Sun, scene space
 * @param {{x,y,z}} nadirScene    unit vector from the object TOWARD the world's centre, scene space
 * @param {number} [tMs]          the time being drawn; only a tumbling object reads it
 */
export function updateModelAttitude(obj, record, sunDirScene, nadirScene, tMs) {
  if (!obj) return;
  toVec(_sun, sunDirScene, _fallback);
  toVec(_nadir, nadirScene, new THREE.Vector3(0, -1, 0));
  setSunDirection(_sun);

  const meta = (record && record.meta) || {};
  const mode = meta.attitude || obj.userData.attitude || DEFAULT_ATTITUDE[obj.userData.klass] || 'fixed';

  switch (mode) {
    case 'sun-panels':
    case 'nadir':
    case 'earth-dish': {
      // body +Z at the world, +X along the panel axis, perpendicular to the Sun
      _v.crossVectors(_sun, _nadir);
      if (_v.lengthSq() < 1e-8) _v.set(1, 0, 0);
      orient(obj, _nadir, _v.normalize());
      break;
    }
    case 'ascent': {
      // BODY +Y ALONG THE DIRECTION OF TRAVEL, and the plume trails behind it.
      //
      // This used to aim +Y along the LOCAL VERTICAL, which is right for about the first second of
      // a flight and wrong for all the rest of it: propagate/ascent.js's own curve leaves the pad
      // vertical and arrives horizontal, so the vertical is 87.5 degrees off the direction of
      // travel at 90 % of the arc. Rockets stood bolt upright through insertion, and the plume --
      // which hangs off -Y -- pointed at the ground from halfway up. Spec 0022 measured the 87.5
      // and left the fix as its own change; this is it.
      //
      // `userData.climb` is per-frame state written by scene/heroes.js from the tangent the
      // propagator now returns, converted into scene space with stage.dirToScene(). When it is
      // absent -- any caller that is not heroes.js, or a record whose propagator has no tangent --
      // the local vertical is still the fallback, which is the old behaviour and correct on the pad.
      // `up` is the axis the body's +Y is aimed along -- the climb direction when we have one and
      // the local vertical when we do not. Written into _v either way, and named `up` for what it
      // does rather than for what it used to be.
      const climb = obj.userData && obj.userData.climb;
      const up = _v;
      if (climb && Number.isFinite(climb.x) && climb.x * climb.x + climb.y * climb.y + climb.z * climb.z > 1e-8) {
        up.set(climb.x, climb.y, climb.z).normalize();
      } else {
        up.copy(_nadir).multiplyScalar(-1);
      }
      _x.crossVectors(_sun, up);
      if (_x.lengthSq() < 1e-8) _x.set(1, 0, 0);
      _x.normalize();
      _z.crossVectors(_x, up).normalize();
      _m4.makeBasis(_x, up, _z);
      obj.quaternion.setFromRotationMatrix(_m4);
      break;
    }
    case 'anti-sun': {
      // +X is the tail axis: away from the Sun, always
      _v.copy(_sun).multiplyScalar(-1);
      _z.crossVectors(_v, _nadir);
      if (_z.lengthSq() < 1e-8) _z.set(0, 0, 1);
      _z.normalize();
      _y.crossVectors(_z, _v).normalize();
      _m4.makeBasis(_v, _y, _z);
      obj.quaternion.setFromRotationMatrix(_m4);
      break;
    }
    case 'up': {
      // ground sites stand on the surface: +Y away from the centre
      const up = _v.copy(_nadir).multiplyScalar(-1);
      _x.set(0, 0, 1).cross(up);
      if (_x.lengthSq() < 1e-8) _x.set(1, 0, 0);
      _x.normalize();
      _z.crossVectors(_x, up).normalize();
      _m4.makeBasis(_x, up, _z);
      obj.quaternion.setFromRotationMatrix(_m4);
      break;
    }
    case 'tumble': {
      // A dead stage turns end over end. The axis and the period are seeded by the id, so the
      // same stage is the same tumble on every machine, and the angle is a function of the time
      // being DRAWN -- scrub the clock and it turns with it. 90 to 240 s a turn, which is ours:
      // nobody publishes a tumble rate for a catalogue number. Illustrative, and still without a
      // clock (any caller that passes no time) or when the visitor asked for less motion.
      const s = seedOf((record && record.id) || obj.name);
      if (!obj.userData.tumble) {
        const a = hash01(s + 5) * Math.PI * 2;
        obj.userData.tumble = {
          base: new THREE.Quaternion().setFromEuler(new THREE.Euler(hash01(s) * Math.PI * 2, hash01(s + 1) * Math.PI * 2, 0)),
          axis: new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), // across the stage's own long axis
          periodMs: (90 + 150 * hash01(s + 9)) * 1000,
        };
      }
      const tu = obj.userData.tumble;
      const angle = Number.isFinite(tMs) && !lessMotion() ? ((tMs % tu.periodMs) / tu.periodMs) * Math.PI * 2 : 0;
      obj.quaternion.copy(tu.base).multiply(_q.setFromAxisAngle(tu.axis, angle));
      break;
    }
    default: {
      // unknown attitude: a pleasant constant, seeded by the id so it never changes or spins.
      // The card says nothing about which way it points, because we do not know.
      if (!obj.userData.fixedQuat) {
        const s = seedOf((record && record.id) || obj.name);
        _q.setFromEuler(
          new THREE.Euler(
            hash01(s) * Math.PI * 2,
            hash01(s + 1) * Math.PI * 2,
            hash01(s + 2) * Math.PI * 2
          )
        );
        obj.userData.fixedQuat = _q.clone();
      }
      obj.quaternion.copy(obj.userData.fixedQuat);
      break;
    }
  }

  // panels track the Sun about the model's +X axis
  const pivots = obj.userData.panelPivots;
  if (pivots && pivots.length) {
    _q.copy(obj.quaternion).invert();
    _v.copy(_sun).applyQuaternion(_q); // the Sun, in the model's own frame
    const angle = Math.atan2(_v.z, _v.y);
    for (const p of pivots) p.rotation.x = angle;
  }

  // THE PLUME. It exists only while the vehicle is actually climbing, and it grows with
  // altitude, because a vacuum-expanding exhaust does. `userData.burn` is written each frame by
  // heroes.js from the propagator's own `phase` and `f` -- the signal ascent() has computed
  // since the day it was written and that nothing ever read. `meta.burning` still works.
  const plume = obj.userData.plume;
  if (plume) {
    const burn = obj.userData.burn;
    const on = burn ? !!burn.on : !!meta.burning;
    plume.visible = on;
    if (on) {
      const f = burn && Number.isFinite(burn.f) ? Math.min(1, Math.max(0, burn.f)) : 0;
      // Illustrative, and it sits inside an arc the card already calls illustrative: a tight
      // bright column low down, blooming wide by insertion.
      plume.scale.set(1 + 1.6 * f, 1 + 2.2 * f, 1 + 1.6 * f);
    }
  }

  // comet tails: already anti-sunward from the basis above; scale with heliocentric distance
  if (obj.userData.tails) {
    const au = Number(meta.rAu);
    const len = Number.isFinite(au) ? Math.min(2.5, Math.max(0.35, 1 / (au * au))) : 1;
    obj.userData.tails.scale.set(len, 1, 1);
    obj.userData.tails.visible = !Number.isFinite(au) || au < 1.5 || !!meta.selected;
  }
}

/** Free every geometry and the shared materials. For a page teardown or a test. */
export function disposeModels(root) {
  if (root) {
    root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && o.material.userData && o.material.userData.perModel) o.material.dispose();
    });
    return;
  }
  for (const m of materials.values()) m.dispose();
  materials.clear();
  if (rampTexture) rampTexture.dispose();
  rampTexture = null;
}

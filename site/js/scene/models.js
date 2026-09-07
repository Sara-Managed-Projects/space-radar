// scene/models.js — the drawn objects.
//
// v1 has no GLB pipeline: every model is built here from three.js primitives. Cartoon objects on a
// realistic setting means simplified geometry with TRUE proportions, two or three flat tones, a
// soft Fresnel rim, one sharp specular on panels only, and no outline anywhere on 3D.
//
// Scale convention: each model is built so its longest dimension is about 1 unit, and carries
// `userData.realSizeM` (the real longest dimension, in metres) for the card's comparison chip. The
// caller scales the Object3D to whatever the stage wants; nothing here assumes a stage unit.
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

// One shared uniform object, so a single write in updateModelAttitude() reaches every material.
const SHARED = {
  uSunDir: { value: new THREE.Vector3(1, 0, 0) },
  uRimSun: { value: new THREE.Color('#FFF6EC') },
  uRimShade: { value: new THREE.Color(PALETTE.atmosphere) },
};

// specular family per class of surface: panels sharp, foil and radiators broad and soft, bodies none
const SPECULAR = {
  body: { spec: 0.0, power: 1.0 },
  panel: { spec: 0.55, power: 220.0 },
  foil: { spec: 0.14, power: 14.0 },
  radiator: { spec: 0.1, power: 10.0 },
};

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
export function toonMaterial(colour, kind = 'body', pool = materials) {
  const key = `${colour}|${kind}`;
  const hit = pool.get(key);
  if (hit) return hit;
  const s = SPECULAR[kind] || SPECULAR.body;
  const m = new THREE.MeshToonMaterial({ color: colour, gradientMap: gradientMap() });
  m.userData.kind = kind;
  m.userData.perModel = pool !== materials;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDir = SHARED.uSunDir;
    shader.uniforms.uRimSun = SHARED.uRimSun;
    shader.uniforms.uRimShade = SHARED.uRimShade;
    shader.uniforms.uRim = { value: 0.35 };
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

const PANEL_BLUE = '#2E4E8C'; // dark blue cells; not a palette token because it is a material, not a class
const FOIL = '#C9B27A'; // gold multi-layer insulation
const METAL = '#B9C2CE';

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
  const d = dish(0.2, 0.06, 16, '#EDF1F6', 'foil', 'dish');
  d.position.z = 0.18;
  d.name = 'dish';
  g.add(d);
  const feed = cyl(0.012, 0.012, 0.12, 8, METAL, 'body', 'feed');
  feed.rotation.x = Math.PI / 2;
  feed.position.z = 0.24;
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

function buildSatelliteWeather() {
  const g = new THREE.Group();
  g.userData.realSizeM = 4;
  const drum = cyl(0.2, 0.2, 0.34, 16, '#DCE3EC', 'foil', 'drum');
  drum.rotation.x = Math.PI / 2; // the spin axis points at nadir
  g.add(drum);
  const cap = cyl(0.2, 0.17, 0.05, 16, '#B7C1CE', 'body', 'cap');
  cap.rotation.x = Math.PI / 2;
  cap.position.z = -0.19;
  g.add(cap);
  // instrument aperture, pointed at the sub-satellite point
  const scope = cyl(0.07, 0.09, 0.1, 12, '#8E99A8', 'body', 'aperture');
  scope.rotation.x = Math.PI / 2;
  scope.position.z = 0.2;
  scope.name = 'boresight';
  g.add(scope);
  const pivot = new THREE.Group();
  pivot.name = 'panelPivot';
  const wing = panelWing(0.3, 0.14, METAL, 'wing');
  wing.position.x = 0.2;
  pivot.add(wing);
  g.add(pivot);
  g.userData.panelPivots = [pivot];
  return g;
}

function buildSatelliteFlat() {
  const g = new THREE.Group();
  g.userData.realSizeM = 3;
  const slab = box(0.5, 0.02, 0.32, '#E3E8EF', 'body', 'slab');
  g.add(slab);
  const pivot = new THREE.Group();
  pivot.name = 'panelPivot';
  const wing = panelWing(0.48, 0.3, METAL, 'wing');
  wing.position.set(0.02, 0.03, 0);
  wing.rotation.y = Math.PI / 2;
  pivot.add(wing);
  pivot.position.z = 0.02;
  g.add(pivot);
  g.userData.panelPivots = [pivot];
  const ant = cyl(0.01, 0.01, 0.14, 6, METAL, 'body', 'antenna');
  ant.rotation.x = Math.PI / 2;
  ant.position.z = 0.1;
  g.add(ant);
  return g;
}

// -------------------------------------------------------------------------------------- debris

function buildDebris(variant) {
  const seed = seedOf(`debris:${variant || 0}`);
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
 * Which colour goes on which zone. A row with `livery: unknown` -- 14 of the families here, and
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
    band.position.y = coreLen * 0.62;
    m.add(band);
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

/**
 * One BUILDERS key per registry row, so modelFor()'s honesty check keeps working unchanged: a
 * known rocket is correctly not `generic`, and a variant that is not a row -- a typo, or a row
 * somebody deleted -- correctly is.
 */
function rocketVariants() {
  const row = { default: buildRocket };
  for (const id of Object.keys(ROCKET_BY_ID)) row[id] = buildRocket;
  return row;
}


// --------------------------------------------------------------------------------------- probe

function buildProbe() {
  const g = new THREE.Group();
  g.userData.realSizeM = 6;
  const bus = box(0.2, 0.18, 0.2, FOIL, 'foil', 'bus');
  g.add(bus);
  const hga = dish(0.26, 0.08, 18, '#EDF1F6', 'foil', 'dish');
  hga.position.z = 0.16;
  hga.name = 'dish';
  g.add(hga);
  const feed = cyl(0.01, 0.01, 0.14, 8, METAL, 'body', 'feed');
  feed.rotation.x = Math.PI / 2;
  feed.position.z = 0.22;
  g.add(feed);
  // the magnetometer boom: the thing that says "this is a probe" at a glance
  const boom = cyl(0.008, 0.008, 0.55, 6, METAL, 'body', 'boom');
  boom.rotation.z = Math.PI / 2;
  boom.position.x = -0.3;
  g.add(boom);
  const rtg = cyl(0.035, 0.035, 0.16, 10, '#6E7784', 'body', 'rtg');
  rtg.rotation.z = Math.PI / 2;
  rtg.position.set(0.2, -0.06, 0);
  g.add(rtg);
  return g;
}

// ----------------------------------------------------------------------------------- telescope

function buildTelescope(variant) {
  const g = new THREE.Group();
  g.userData.realSizeM = variant === 'hex' ? 21 : 13;
  if (variant === 'hex') {
    // segmented mirror plus a flat sunshade, JWST's silhouette
    const mirror = cyl(0.24, 0.24, 0.02, 6, '#E6C86A', 'radiator', 'mirror');
    mirror.rotation.x = Math.PI / 2;
    mirror.position.z = 0.1;
    mirror.name = 'boresight';
    g.add(mirror);
    const spine = box(0.03, 0.03, 0.18, METAL, 'body', 'spine');
    g.add(spine);
    const shade = box(0.62, 0.012, 0.44, '#8FA0B8', 'radiator', 'sunshade');
    shade.position.z = -0.14;
    shade.rotation.z = 0.12;
    g.add(shade);
    for (const s of [-1, 1]) {
      const boom = cyl(0.008, 0.008, 0.3, 6, METAL, 'body', 'boom');
      boom.rotation.z = Math.PI / 2;
      boom.position.set(s * 0.16, 0, -0.06);
      g.add(boom);
    }
  } else {
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
    const a = panelWing(0.3, 0.18, METAL, 'wing+');
    a.position.x = 0.16;
    const b = panelWing(0.3, 0.18, METAL, 'wing-');
    b.rotation.y = Math.PI;
    b.position.x = -0.16;
    pivot.add(a, b);
    g.add(pivot);
    g.userData.panelPivots = [pivot];
  }
  return g;
}

// ------------------------------------------------------------------------------------ asteroid

function buildAsteroid(variant) {
  const seed = seedOf(`asteroid:${variant || 0}`);
  const g = new THREE.Group();
  g.userData.realSizeM = 500;
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
      depth: 0.1 + 0.06 * hash01(seed + c * 401),
    });
  }

  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    // lumpy potato: three low-frequency bumps from the seeded hash
    let r =
      1 +
      0.16 * (hash01(seed + Math.round(n.x * 97) * 31 + Math.round(n.y * 97)) - 0.5) +
      0.1 * Math.sin(3.1 * n.x + seed % 7) * Math.cos(2.7 * n.y + (seed % 11)) +
      0.07 * Math.sin(4.3 * n.z + (seed % 13));
    for (const c of craters) {
      const d = n.dot(c.dir); // 1 at the crater centre
      const t = Math.max(0, (d - (1 - c.radius * c.radius * 0.5)) / (c.radius * c.radius * 0.5 + 1e-6));
      if (t > 0) r -= c.depth * t * t * (3 - 2 * t);
    }
    v.copy(n).multiplyScalar(0.5 * r);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.scale(1.0, 0.86, 0.72); // potatoes are not spheres
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

function buildComet(variant) {
  const seed = seedOf(`comet:${variant || 0}`);
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

function buildSiteRover() {
  const g = new THREE.Group();
  g.userData.realSizeM = 3;
  const body = box(0.34, 0.12, 0.22, '#DCE3EC', 'body', 'body');
  body.position.y = 0.14;
  g.add(body);
  const deck = box(0.24, 0.02, 0.18, PANEL_BLUE, 'panel', 'deck');
  deck.position.y = 0.21;
  g.add(deck);
  const mast = cyl(0.012, 0.012, 0.18, 8, '#8E99A8', 'body', 'mast');
  mast.position.set(0.12, 0.29, 0);
  g.add(mast);
  const head = box(0.06, 0.04, 0.05, CLASS_COLOURS.site, 'body', 'head');
  head.position.set(0.12, 0.39, 0);
  g.add(head);
  for (const x of [-0.12, 0, 0.12]) {
    for (const z of [-0.13, 0.13]) {
      const wheel = cyl(0.06, 0.06, 0.05, 10, '#6E7784', 'body', 'wheel');
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.06, z);
      g.add(wheel);
    }
  }
  return g;
}

// ------------------------------------------------------------------------------------- registry

// One row per model. Adding a shape is a row here, not a change to modelFor().
const BUILDERS = {
  station: { default: buildStation, iss: buildStation },
  satellite: {
    default: buildSatelliteComms,
    comms: buildSatelliteComms,
    weather: buildSatelliteWeather,
    flat: buildSatelliteFlat,
  },
  debris: { default: buildDebris },
  rocket: rocketVariants(),
  probe: { default: buildProbe },
  telescope: { default: buildTelescope, tube: buildTelescope, hex: buildTelescope },
  asteroid: { default: buildAsteroid },
  comet: { default: buildComet },
  site: {
    default: buildSitePad,
    pad: buildSitePad,
    dish: buildSiteDish,
    dome: buildSiteDome,
    rover: buildSiteRover,
  },
  world: { default: () => new THREE.Group() }, // worlds.js owns the worlds; this keeps modelFor total
};

/**
 * Procedural cartoon geometry for a visual class.
 * @param {string} klass station|satellite|debris|rocket|probe|telescope|asteroid|comet|site|world
 * @param {string} [variant] a key of that class's row, or any string for the seeded shapes
 * @returns {THREE.Object3D} always an Object3D; unknown classes fall back to a generic satellite
 *   and set userData.generic, which is what the card means by "drawn as a generic satellite".
 */
export function modelFor(klass, variant) {
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
    obj = build(variant);
  } finally {
    modelMaterials = outer;
  }
  obj.userData.materials = [...pool.values()];
  obj.name = `model:${klass}${variant ? `:${variant}` : ''}`;
  obj.userData.klass = generic ? 'satellite' : klass;
  obj.userData.variant = variant || 'default';
  // "generic" means the card may not name the shape: an unknown class, or a variant that was
  // asked for and does not exist. Asking for NO variant gets the class's own default model, which
  // is not generic -- and heroes.js passes no variant for almost every record, so the old
  // `!use[variant]` marked every model in the app generic.
  obj.userData.generic = generic || (variant != null && !named);
  obj.userData.attitude = DEFAULT_ATTITUDE[klass] || 'fixed';
  return obj;
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
 */
export function updateModelAttitude(obj, record, sunDirScene, nadirScene) {
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
      // body +Y along the climb; the plume trails below it
      const up = _v.copy(_nadir).multiplyScalar(-1);
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

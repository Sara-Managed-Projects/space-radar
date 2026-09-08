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

// --------------------------------------------------------------------------- soyuz and progress

/**
 * The Soyuz hull, as a family shape. Three modules in a line and two long wings: that silhouette
 * has flown since 1967 and is what a Progress shares with a Soyuz, which is why one builder draws
 * both. Published dimensions (RSC Energia): Soyuz MS 7.48 m long, 10.7 m across the wings, orbital
 * module 2.26 m across, descent module 2.17 m, instrument module 2.72 m. Progress MS 7.23 m long,
 * 10.6 m across, a cargo drum where the crew module is and a tank section where the descent
 * module is. The card says "the kind of thing, not this exact one", because it is.
 *
 * The one recognition detail: the descent module is a BELL, not a cylinder -- Soyuz is the only
 * visiting vehicle with that waist -- and the Progress has no bell, which is how the two differ
 * at forty pixels.
 */
function buildSoyuzFamily(variant) {
  const g = new THREE.Group();
  const progress = variant === 'progress' || variant === 'tianzhou';
  // Shenzhou: the same three-module plan at 9.25 m, wings on BOTH the orbital and service
  // modules (CMSA), about 17 m across. Tianzhou: a 10.6 m cargo cylinder 3.35 m across with one
  // pair of wings, about 14.9 m across -- a Progress at half again the size.
  const shenzhou = variant === 'shenzhou';
  const tianzhou = variant === 'tianzhou';
  const span = shenzhou ? 17 : tianzhou ? 14.9 : progress ? 10.6 : 10.7;
  g.userData.realSizeM = span; // across the wings, the longest dimension
  const green = tianzhou ? '#D9DDE3' : shenzhou ? '#C9CCD1' : '#6E7E62'; // Chinese hulls are white-grey
  const body = 'body';
  const S = 1 / span; // metres -> unit box along the wingspan
  const R = tianzhou ? 1.675 : 1.36; // hull radius

  // Instrument and propulsion module, aft: a plain cylinder, both variants.
  const svc = cyl(R * S, R * S, (tianzhou ? 3.2 : 2.3) * S, 16, green, body, 'service');
  svc.rotation.x = Math.PI / 2;
  svc.position.z = -2.4 * S;
  g.add(svc);
  const nozzle = cyl(0.3 * S, 0.45 * S, 0.5 * S, 12, '#4A4F57', 'foil', 'nozzle');
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.z = -3.8 * S;
  g.add(nozzle);

  if (progress) {
    // Refuelling section where the bell would be, then the cargo drum where the crew would be.
    const tank = cyl((R - 0.16) * S, R * S, 1.6 * S, 16, green, body, 'tanks');
    tank.rotation.x = Math.PI / 2;
    tank.position.z = -0.45 * S;
    g.add(tank);
    const cargo = cyl((tianzhou ? R : 1.13) * S, (tianzhou ? R : 1.13) * S, (tianzhou ? 5.4 : 2.6) * S, 16, green, body, 'cargo');
    cargo.rotation.x = Math.PI / 2;
    cargo.position.z = (tianzhou ? 3.05 : 1.65) * S;
    g.add(cargo);
  } else {
    // The bell: wide at the heat shield, narrow at the hatch to the orbital module.
    const bell = cyl(0.8 * S, 1.08 * S, 2.1 * S, 16, '#8C8F93', body, 'descent');
    bell.rotation.x = Math.PI / 2;
    bell.position.z = -0.2 * S;
    g.add(bell);
    // Soyuz's orbital module is a sphere; Shenzhou's is a cylinder with a docking ring, and it
    // carries its own pair of wings, which is the one thing that tells the two apart.
    const orbital = shenzhou
      ? cyl(1.13 * S, 1.13 * S, 2.8 * S, 16, green, body, 'orbital')
      : new THREE.Mesh(new THREE.SphereGeometry(1.13 * S, 16, 12), toonMaterial(green, body));
    orbital.name = 'orbital';
    if (shenzhou) orbital.rotation.x = Math.PI / 2;
    orbital.position.z = (shenzhou ? 2.1 : 1.75) * S;
    g.add(orbital);
    if (shenzhou) {
      for (const side of [-1, 1]) {
        const w = panelWing(2.6 * S, 1.2 * S, METAL, side > 0 ? 'fwdwing+' : 'fwdwing-');
        w.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        w.position.set(side * (1.13 * S + 1.3 * S), 0, 2.1 * S);
        g.add(w);
      }
    }
  }
  // Docking probe at the front.
  const probe = cyl(0.12 * S, 0.12 * S, 0.5 * S, 8, METAL, body, 'probe');
  probe.rotation.x = Math.PI / 2;
  probe.position.z = (tianzhou ? 6.0 : shenzhou ? 3.7 : progress ? 3.2 : 3.1) * S;
  g.add(probe);

  // Two wings off the service module, in the plane of the hull.
  const wingLen = (tianzhou ? 5.0 : shenzhou ? 5.5 : 3.7) * S;
  const wingWidth = (tianzhou ? 2.2 : 1.4) * S;
  for (const side of [-1, 1]) {
    const w = panelWing(wingLen, wingWidth, METAL, side > 0 ? 'wing+' : 'wing-');
    w.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    w.position.set(side * (R * S + wingLen / 2), 0, -2.4 * S);
    g.add(w);
  }
  return g;
}

// --------------------------------------------------------------------------------------- dragon

/**
 * SpaceX's Dragon 2, crew or cargo, as a family shape: a blunt capsule on a trunk, and no wings at
 * all -- the solar cells are on the trunk's skin, which is the one thing that tells it from every
 * other visitor. Published dimensions (SpaceX): 4.0 m across, 8.1 m tall with the trunk, the
 * trunk 3.7 m across. A CC BY model exists on Sketchfab (spec 0027, Ivan's list); this is the honest
 * shape until it is downloaded.
 */
function buildDragon() {
  const g = new THREE.Group();
  g.userData.realSizeM = 8.1;
  const S = 1 / 8.1;
  const body = 'body';
  // Capsule: a truncated cone, wide at the heat shield, with a rounded nose cap.
  const capsule = cyl(1.3 * S, 2.0 * S, 3.2 * S, 20, '#F1F3F6', body, 'capsule');
  capsule.rotation.x = Math.PI / 2;
  capsule.position.z = 2.4 * S;
  g.add(capsule);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.3 * S, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toonMaterial('#F1F3F6', body));
  nose.name = 'nose';
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 4.0 * S;
  g.add(nose);
  const shield = cyl(2.0 * S, 1.9 * S, 0.3 * S, 20, '#3B2F2A', 'foil', 'heatshield');
  shield.rotation.x = Math.PI / 2;
  shield.position.z = 0.65 * S;
  g.add(shield);
  // Trunk: a cylinder, half white, half dark blue solar cells, with four small fins.
  const trunk = cyl(1.85 * S, 1.85 * S, 3.7 * S, 20, '#E9EDF2', body, 'trunk');
  trunk.rotation.x = Math.PI / 2;
  trunk.position.z = -1.35 * S;
  g.add(trunk);
  // Half the trunk's skin is cells: an open half-cylinder, a hair outside the trunk so it reads.
  const cells = mesh(new THREE.CylinderGeometry(1.87 * S, 1.87 * S, 3.5 * S, 20, 1, true, Math.PI, Math.PI), '#1F3A5F', 'panel', 'solar');
  cells.rotation.x = Math.PI / 2;
  cells.position.z = -1.35 * S;
  g.add(cells);
  for (const a of [0.25, 0.75, 1.25, 1.75]) {
    const fin = box(0.05 * S, 0.9 * S, 1.6 * S, '#B9BFC7', 'foil', 'fin');
    fin.position.set(Math.cos(a * Math.PI) * 2.2 * S, Math.sin(a * Math.PI) * 2.2 * S, -2.3 * S);
    fin.rotation.z = a * Math.PI;
    g.add(fin);
  }
  return g;
}

// --------------------------------------------------------------------------------------- cygnus

/**
 * Northrop Grumman's Cygnus, as a family shape: a stubby pressurised drum with a boxy service
 * module behind it and two ROUND solar wings -- the UltraFlex fans that nothing else at the
 * station has, which is the whole recognition. Published dimensions (Northrop Grumman fact
 * sheet, enhanced Cygnus): pressurised cargo module 3.07 m across and 6.4 m long including the
 * service module, UltraFlex arrays 3.7 m in diameter each; about 11.5 m tip to tip. No free model
 * with a licence exists (spec 0027 hunt), so the card says "the kind of thing, not this exact one".
 */
function buildCygnus() {
  const g = new THREE.Group();
  g.userData.realSizeM = 11.5; // across the wings, the longest dimension
  const S = 1 / 11.5;
  const white = '#E9EDF2'; // the cargo module's blankets
  const body = 'body';
  const drum = cyl(1.535 * S, 1.535 * S, 4.6 * S, 18, white, body, 'cargo');
  drum.rotation.x = Math.PI / 2;
  drum.position.z = 0.9 * S;
  g.add(drum);
  const svc = box(2.6 * S, 2.6 * S, 1.8 * S, '#B9BFC7', 'foil', 'service');
  svc.position.z = -2.3 * S;
  g.add(svc);
  const hatch = cyl(0.5 * S, 0.5 * S, 0.3 * S, 12, METAL, body, 'hatch');
  hatch.rotation.x = Math.PI / 2;
  hatch.position.z = 3.35 * S;
  g.add(hatch);
  // The fans: two thin discs on short booms off the service module, facing +Y like every wing here.
  for (const side of [-1, 1]) {
    const boom = cyl(0.08 * S, 0.08 * S, 1.6 * S, 6, METAL, body, 'boom');
    boom.rotation.z = Math.PI / 2;
    boom.position.set(side * 2.1 * S, 0, -2.3 * S);
    g.add(boom);
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(1.85 * S, 1.85 * S, 0.04 * S, 24), toonMaterial('#1F3A5F', 'panel'));
    fan.name = side > 0 ? 'wing+' : 'wing-';
    fan.position.set(side * 4.75 * S, 0, -2.3 * S);
    g.add(fan);
  }
  return g;
}

// ------------------------------------------------------------------------------------- tiangong

/**
 * China's Tiangong, as a family shape: a T of three cylinders. Tianhe, the core, runs fore-aft
 * (16.6 m long, 4.2 m across, CMSA); Wentian and Mengtian, the two laboratory modules (17.9 m,
 * 4.2 m), sit port and starboard at the forward node, each with a pair of long wings; the core
 * carries a shorter pair aft. About 55 m across the labs' wings, which is the longest dimension.
 * CelesTrak catalogues the three modules as three objects at one position -- CSS (TIANHE),
 * CSS (WENTIAN), CSS (MENGTIAN) -- so the core draws the whole station and a lab, when it is
 * not swallowed by the station's radius, draws as a single module. The card says the family
 * shape either way. A CC BY model of the core exists (spec 0027); this is the honest shape until it
 * is downloaded.
 */
function buildTiangong(variant) {
  const g = new THREE.Group();
  const S = 1 / 55;
  const white = '#E6EAF0';
  const gold = '#C9A45C'; // the labs' blanket colour reads warm in photographs
  const body = 'body';
  const module = (len, colour, name) => {
    const c = cyl(2.1 * S, 2.1 * S, len * S, 18, colour, body, name);
    return c;
  };
  const wingPair = (span, width, z, x0, name) => {
    for (const side of [-1, 1]) {
      const w = panelWing(span * S, width * S, METAL, `${name}${side > 0 ? '+' : '-'}`);
      w.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      w.position.set(side * (x0 + span / 2) * S, 0, z * S);
      g.add(w);
    }
  };
  if (variant === 'tiangong-module') {
    g.userData.realSizeM = 56; // one lab across its wings
    const lab = module(17.9, gold, 'lab');
    lab.rotation.x = Math.PI / 2;
    g.add(lab);
    wingPair(26, 6, -6.5, 2.1, 'wing');
    return g;
  }
  g.userData.realSizeM = 55;
  const core = module(16.6, white, 'tianhe');
  core.rotation.x = Math.PI / 2;
  core.position.z = -4 * S;
  g.add(core);
  const node = new THREE.Mesh(new THREE.SphereGeometry(2.4 * S, 16, 12), toonMaterial(white, body));
  node.name = 'node';
  node.position.z = 5.2 * S;
  g.add(node);
  for (const side of [-1, 1]) {
    const lab = module(17.9, gold, side > 0 ? 'mengtian' : 'wentian');
    lab.rotation.z = Math.PI / 2; // along X
    lab.position.set(side * (2.4 + 17.9 / 2) * S, 0, 5.2 * S);
    g.add(lab);
    // Each lab's wings fold out at its far end, fore and aft of the lab's axis.
    for (const dz of [-1, 1]) {
      const w = panelWing(15 * S, 5 * S, METAL, `labwing${side}${dz}`);
      w.rotation.y = dz > 0 ? 0 : Math.PI;
      w.rotation.z = Math.PI / 2;
      w.position.set(side * (2.4 + 17.9 + 0.5) * S, 0, (5.2 + dz * 8) * S);
      g.add(w);
    }
  }
  // The core's shorter pair, aft.
  wingPair(12.6, 4.5, -10, 2.1, 'corewing');
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

/** A disc of ground, so a thing lying on the Moon reads as lying on something. */
function regolith(r, colour, seg) {
  const d = discFlat(r, seg || 16, colour || REGOLITH, 'body', 'ground');
  d.rotation.x = -Math.PI / 2;
  d.position.y = 0.002; // the tangent plane touches the sphere exactly at the origin
  return d;
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

  for (const [x, z] of [[-0.24, 0.15], [-0.09, -0.19]]) {
    const ball = mesh(new THREE.SphereGeometry(0.115, 12, 8), BALL_WHITE, 'panel', 'ball');
    ball.position.set(x, 0.115, z);
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
  station: { default: buildStation, iss: buildStation, soyuz: buildSoyuzFamily, progress: buildSoyuzFamily, shenzhou: buildSoyuzFamily, tianzhou: buildSoyuzFamily, cygnus: buildCygnus, dragon: buildDragon, tiangong: buildTiangong, 'tiangong-module': buildTiangong },
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
  oddity: ODDITY_BUILDERS,
  world: { default: () => new THREE.Group() }, // worlds.js owns the worlds; this keeps modelFor total
};

/**
 * Procedural cartoon geometry for a visual class.
 * @param {string} klass station|satellite|debris|rocket|probe|telescope|asteroid|comet|site|world
 * @param {string} [variant] a key of that class's row, or any string for the seeded shapes
 * @returns {THREE.Object3D} always an Object3D; unknown classes fall back to a generic satellite
 *   and set userData.generic. NOTHING READS THAT FLAG YET: the card's "what you are looking at"
 *   line (COPY.drawing) is written from a launch's registry row in data/parsers.js and is not
 *   printed for any other class, so a generic satellite is drawn without the card saying so.
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
  // "generic" means the shape may not be named as the object: an unknown class, or a variant that
  // was asked for and does not exist. (The card does not print this yet -- see above.)
  // Asking for NO variant gets the class's own default model, which
  // is not generic -- and heroes.js passes no variant for almost every record, so the old
  // `!use[variant]` marked every model in the app generic.
  obj.userData.generic = generic || (variant != null && !named);
  obj.userData.attitude = DEFAULT_ATTITUDE[klass] || 'fixed';
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

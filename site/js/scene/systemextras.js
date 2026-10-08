// scene/systemextras.js -- what a GENERATED star system draws beyond its star, planets and orbits
// (internal #466, #280): the habitable-zone band, and our own planets' orbits for scale.
//
// Contract: decorate(built, group, tools) -> extra, update(built, camera, starScene),
//   frameAu(system) -- and the pure parts for tests/test_systems_table.mjs: scaleOrbits(system),
//   OUR_ORBITS_AU.
//
// NOT ON THE FIRST VISIT. scene/systems.js imports this with data/systems-table.js, the first time
// one of the thirty-nine generated systems is asked for; TRAPPIST-1's typed row never needs it.
//
// THE BAND IS COMPUTED, AND SAYS SO IN THE PICTURE. Its two radii are the row's `zone`
// (scripts/build-systems.py: Kopparapu et al. 2014, runaway greenhouse to maximum greenhouse, from
// the star's temperature and luminosity). It is drawn in the plane the orbits are drawn in, with
// its label on it. A system with no `zone` -- a star hotter or cooler than the formula covers, a
// pulsar -- has no band, and the star's card says why.
//
// THE DASHED RINGS ARE NOT ORBITS ANYTHING THERE HAS. They are Mercury's, Earth's, Jupiter's or
// Neptune's, drawn round the other star so a visitor can see that LHS 1140's planets fit inside
// Mercury's orbit and HR 8799's lie beyond Neptune's. Dashed, labelled "for scale". Which are drawn
// is a rule, not a choice per system: each of ours that lies between 0.15 and 1 times the outermost
// planet's orbit, and the smallest of ours that holds the whole system when it is under six times
// that orbit.
import * as THREE from '../../vendor/three.module.min.js';
import { COPY } from '../copy/en.js';
import '../copy/en.later.js';
import { AU_KM } from './systems.js';

// Mean distances from the Sun in millions of km: NASA Planetary Fact Sheet,
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/ (read 2026-10-08): 57.9, 149.6, 778.5, 4515.0.
export const OUR_ORBITS_AU = [
  { id: 'mercury', au: 57.9e6 / AU_KM },
  { id: 'earth', au: 149.6e6 / AU_KM },
  { id: 'jupiter', au: 778.5e6 / AU_KM },
  { id: 'neptune', au: 4515.0e6 / AU_KM },
];
const INSIDE_MIN = 0.15;
const HOLDER_MAX = 6;
// What the whole-system shot makes room for beyond the outermost orbit: the band's outer edge or
// the ring that holds the system, when either is within this many times that orbit.
const FRAME_MAX = 2.5;
const BAND_SEGMENTS = 128;
const BAND_OPACITY = 0.1;
const EDGE_OPACITY = 0.4;
const LABEL_HEIGHT = 0.026; // of the view's height

/** Which of our orbits are drawn round this system, by the rule above. Pure. */
export function scaleOrbits(system) {
  const outer = Math.max(...system.planets.map((p) => p.aAu));
  const out = OUR_ORBITS_AU.filter((o) => o.au <= outer && o.au >= INSIDE_MIN * outer);
  const holder = OUR_ORBITS_AU.find((o) => o.au > outer);
  if (holder && holder.au <= HOLDER_MAX * outer) out.push(holder);
  return out;
}

/** The radius, au, the whole-system shot should hold. Pure. */
export function frameAu(system) {
  const outer = Math.max(...system.planets.map((p) => p.aAu));
  let r = outer;
  if (system.zone && system.zone.outerAu <= FRAME_MAX * outer) r = Math.max(r, system.zone.outerAu);
  for (const o of scaleOrbits(system)) if (o.au <= FRAME_MAX * outer) r = Math.max(r, o.au);
  return r;
}

function bandGeometry(inner, outer, basis) {
  const { u, v } = basis;
  const pos = new Float32Array((BAND_SEGMENTS + 1) * 6);
  const idx = [];
  for (let i = 0; i <= BAND_SEGMENTS; i++) {
    const th = (i / BAND_SEGMENTS) * 2 * Math.PI;
    const c = Math.cos(th), s = Math.sin(th);
    for (let k = 0; k < 2; k++) {
      const r = k ? outer : inner;
      pos[(i * 2 + k) * 3] = (c * u.x + s * v.x) * r;
      pos[(i * 2 + k) * 3 + 1] = (c * u.y + s * v.y) * r;
      pos[(i * 2 + k) * 3 + 2] = (c * u.z + s * v.z) * r;
    }
    if (i < BAND_SEGMENTS) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

/**
 * Add the band and the scale rings to a built system's group. `tools` are scene/systems.js's own
 * helpers (its ring geometry, its text sprite, its colour reader), passed in so there is one of each.
 */
export function decorate(built, group, tools) {
  const { system, basisScene } = built;
  const { unit, textSprite, cssColour, ringGeometry } = tools;
  const toUnits = (au) => (au * AU_KM) / unit;
  const labels = [];
  const add = (text, colour, radius, turn) => {
    const sprite = textSprite(text, colour);
    if (!sprite) return;
    sprite.name = 'systems:label';
    sprite.userData.radius = radius;
    sprite.userData.turn = turn;
    group.add(sprite);
    labels.push(sprite);
  };
  let band = null;
  if (system.zone) {
    const colour = new THREE.Color(cssColour('--sr-ok', '#9ef0d8'));
    const inner = toUnits(system.zone.innerAu), outer = toUnits(system.zone.outerAu);
    band = new THREE.Mesh(
      bandGeometry(inner, outer, basisScene),
      new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: BAND_OPACITY, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
    );
    band.name = 'systems:zone';
    band.renderOrder = -1;
    group.add(band);
    for (const r of [inner, outer]) {
      const edge = new THREE.LineLoop(ringGeometry(r, basisScene), new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: EDGE_OPACITY, depthWrite: false }));
      edge.name = 'systems:zone-edge';
      band.add(edge);
    }
    add(COPY.starSystem.zoneLabel, cssColour('--sr-ok', '#9ef0d8'), outer, 0);
  }
  const dim = cssColour('--sr-text-dim', '#9aa4b2');
  const rings = [];
  scaleOrbits(system).forEach((o, i) => {
    const r = toUnits(o.au);
    const ring = new THREE.LineLoop(
      ringGeometry(r, basisScene),
      new THREE.LineDashedMaterial({ color: new THREE.Color(dim), transparent: true, opacity: 0.55, dashSize: r / 40, gapSize: r / 48, depthWrite: false }),
    );
    ring.computeLineDistances();
    ring.name = `systems:scale:${o.id}`;
    group.add(ring);
    rings.push(ring);
    // Each label a sixth of a turn further round than the last, so two rings of nearly one size do
    // not print their names on top of each other, or on the band's.
    add(COPY.starSystem.orbitOf[o.id], dim, r, (i + 1) * (Math.PI / 3) * (i % 2 ? -1 : 1));
  });
  return { band, rings, labels };
}

const _d = new THREE.Vector3();
/** Per frame: the band and rings follow the star; each label sits on its ring's far side, upright. */
export function update(built, camera, starScene) {
  const extra = built.extra;
  if (!extra) return;
  if (extra.band) extra.band.position.copy(starScene);
  for (const ring of extra.rings) ring.position.copy(starScene);
  if (!camera) return;
  const { u, v } = built.basisScene;
  _d.copy(camera.position).sub(starScene);
  const a = _d.x * u.x + _d.y * u.y + _d.z * u.z;
  const b = _d.x * v.x + _d.y * v.y + _d.z * v.z;
  const far = Math.atan2(-b, -a);
  const h = LABEL_HEIGHT * Math.min(1, (camera.aspect || 1) * 1.5);
  for (const label of extra.labels) {
    const th = far + label.userData.turn;
    const r = label.userData.radius;
    const c = Math.cos(th) * r, s = Math.sin(th) * r;
    label.position.set(starScene.x + c * u.x + s * v.x, starScene.y + c * u.y + s * v.y, starScene.z + c * u.z + s * v.z);
    label.scale.set(h * label.userData.aspect, h, 1);
  }
}

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
// planet's orbit; and, when none does, the smallest of ours that holds the whole system, if it is
// under four and a half times that orbit -- then the whole-system shot makes room for it, because
// "all of it inside Mercury's orbit" is the one thing that ring is for.
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
const HOLDER_MAX = 4.5;
// The whole-system shot also makes room for the band's outer edge when it is within this many
// times the outermost orbit (WASP-12 b is at 0.02 au and its star's zone at 3: not in one picture).
const FRAME_MAX = 2.5;
// The band is a sheet in the orbits' plane. From beside a planet the camera is almost in that plane
// and looks along the sheet: it washed the whole sky grey-green at Kepler-186 f and cut LHS 1140 b
// in half (measured 2026-10-08). It fades out as the camera comes down to the plane: gone under the
// first of these fractions of the band's outer radius above it, whole over the second.
const BAND_FADE = [0.02, 0.15];
// A label wider than this many times its ring's radius on the screen is not drawn: on a phone a
// small band's name covered the band, the star and the planet in it.
const LABEL_MAX_OF_RADIUS = 1.2;
const BAND_SEGMENTS = 128;
const BAND_OPACITY = 0.1;
const EDGE_OPACITY = 0.4;
const LABEL_HEIGHT = 0.026; // of the view's height

/** Which of our orbits are drawn round this system, by the rule above. Pure. */
export function scaleOrbits(system) {
  const outer = Math.max(...system.planets.map((p) => p.aAu));
  const out = OUR_ORBITS_AU.filter((o) => o.au <= outer && o.au >= INSIDE_MIN * outer);
  const holder = OUR_ORBITS_AU.find((o) => o.au > outer);
  if (!out.length && holder && holder.au <= HOLDER_MAX * outer) out.push(holder);
  return out;
}

/** The radius, au, the whole-system shot should hold. Pure. */
export function frameAu(system) {
  const outer = Math.max(...system.planets.map((p) => p.aAu));
  let r = outer;
  if (system.zone && system.zone.outerAu <= FRAME_MAX * outer) r = Math.max(r, system.zone.outerAu);
  for (const o of scaleOrbits(system)) r = Math.max(r, o.au);
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
  const add = (text, colour, radius, turn, middle = false) => {
    const sprite = textSprite(text, colour);
    if (!sprite) return;
    sprite.name = 'systems:label';
    sprite.userData.radius = radius;
    sprite.userData.turn = turn;
    if (middle) sprite.center.set(0.5, 0.5);
    group.add(sprite);
    labels.push(sprite);
  };
  let band = null;
  let bandOuter = 0;
  let zoneLabel = null;
  if (system.zone) {
    bandOuter = toUnits(system.zone.outerAu);
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
    // In the band itself, a quarter turn round from the far side: there the band is seen at its
    // full width, and the star's own label and the planets' are not.
    add(COPY.starSystem.zoneLabel, cssColour('--sr-ok', '#9ef0d8'), (inner + outer) / 2, -Math.PI / 2, true);
    zoneLabel = labels[0] || null;
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
    // On the near side of its ring, which is the bottom of the picture and clear of the star's and
    // the planets' own labels; each a little further round than the last, so two rings of nearly
    // one size do not print their names on top of each other.
    add(COPY.starSystem.orbitOf[o.id], dim, r, Math.PI + i * (Math.PI / 7));
  });
  return { band, bandOuter, zoneLabel, rings, labels };
}

const _d = new THREE.Vector3();
/** Per frame: the band and rings follow the star; each label sits on its ring's far side, upright. */
export function update(built, camera, starScene) {
  const extra = built.extra;
  if (!extra) return;
  if (extra.band) {
    extra.band.position.copy(starScene);
    let fade = 1;
    if (camera) {
      const { u, v } = built.basisScene;
      _d.copy(camera.position).sub(starScene);
      // The plane's normal is u x v; the camera's height over the plane is its part along it.
      const height = Math.abs(_d.x * (u.y * v.z - u.z * v.y) + _d.y * (u.z * v.x - u.x * v.z) + _d.z * (u.x * v.y - u.y * v.x));
      fade = Math.min(1, Math.max(0, (height / extra.bandOuter - BAND_FADE[0]) / (BAND_FADE[1] - BAND_FADE[0])));
    }
    extra.fade = fade;
    extra.band.material.opacity = BAND_OPACITY * fade;
    for (const edge of extra.band.children) edge.material.opacity = EDGE_OPACITY * fade;
  }
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
    // The ring's radius as a share of the view's height, against the label's width in the same.
    const shown = r / (camera.position.distanceTo(label.position) * 2 * Math.tan(((camera.fov || 45) * Math.PI) / 360));
    label.visible = h * label.userData.aspect <= LABEL_MAX_OF_RADIUS * shown && (label !== extra.zoneLabel || extra.fade > 0.5);
  }
}

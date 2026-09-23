// scene/orbitrings.js -- the planets' paths round the Sun, and a dot for each planet, on the Sun
// stage while a trip asks for them (registry/tours.yaml `orbits:`).
//
// Contract: createOrbitRings(scene, { renderer }) -> { update(tMs, ids), visible(), dispose() }
// Pure and exported for the test: ringTimes(periodMs, t0Ms, n), periodMsOfWorld(id)
//
// WHY, measured 2026-09-23 (headless Chrome, 1280 x 800). "A year in a minute" runs on the Sun
// stage, which squeezes nothing (scene/worlds.js compressesFrom), and looks down from 700 million
// km. At true size every planet there is a fraction of a pixel -- the Earth 0.009 px in radius at
// the first stop, Jupiter 0.024 px at the last -- and the picture was a Sun, some names and the
// craft glyphs of whatever orbits Mercury, the Earth and Mars. The one thing the trip exists to
// show, the planets going round, was not on the screen. With the paths and the dots: 37 to 55
// pixels change round each planet, every stop, and in 16 s of real time (9 days of clock at
// SwiftShader's frame rate; a real browser runs 60) Mercury's dot moved 42 px along its path.
//
// Two additions, and neither moves anything:
//   1. THE PATH. One lap of each planet, from the same ephemeris the disc is drawn from
//      (worlds.js positionOf, Astronomy Engine's VSOP87), sampled evenly in time over its own
//      sidereal period. It is where the planet will be, not a circle somebody drew.
//   2. A DOT AT THE TRUE PLACE, MARKER_PX across whatever the distance. The one exaggeration, and it
//      is size only: its centre is the planet's centre, so direction and place stay measured. It
//      sits at the centre of the true disc and is depth-tested, so once the disc is bigger than
//      the dot (the Earth stop, from 2.5 million km) the disc covers it and nothing is enlarged.
//      The trip frame prints COPY.trip.orbitsLine on every stop, "drawn larger than they are",
//      and the first card says it in its own words -- the house rule: size may be exaggerated if
//      the card says so; direction and place never.
//
// Only on the Sun stage. Everywhere else the planets are already floored by worlds.js, and a
// second dot beside a compressed disc would be two answers to where Mars is.

import * as THREE from '../../vendor/three.module.min.js';
import * as Astronomy from '../../vendor/astronomy.js';
import { WORLDS, positionOf } from './worlds.js';
import { stage } from './stage.js';

export const RING_SAMPLES = 240;
/**
 * The dot, in CSS pixels across. Seven: the craft glyphs that sit on Mercury, the Earth and Mars
 * from this stage (scene/glyphs.js, about 16 px) hid a five-pixel dot entirely, measured
 * 2026-09-23, so the dot is drawn after them (RENDER_ORDER) with a dark rim and wide enough to read
 * as the thing in the middle of their rings.
 */
export const MARKER_PX = 7;
/** After the glyphs (scene/glyphs.js RENDER_ORDER_GLYPH = 10), so a craft at a planet cannot cover it. */
const RENDER_ORDER = 11;
const DAY = 86400e3;
/** Only the Sun stage draws these (the header says why). */
const STAGE = 'sun';
/**
 * Rebuild a path after this much clock time. A planet's path round the Sun changes by arc-seconds
 * a century, so this is about the frame conversion being made at a recent instant, not about the
 * orbit; at 525 600x it is one rebuild every half-minute of real time.
 */
const REBUILD_MS = 365.25 * DAY / 2;

const BY_ID = new Map(WORLDS.map((w) => [w.id, w]));

/** A planet's sidereal period in ms (Astronomy Engine's table), or null for anything else. */
export function periodMsOfWorld(id) {
  const w = BY_ID.get(id);
  if (!w || w.parent !== 'sun' || !w.body) return null;
  try {
    const days = Astronomy.PlanetOrbitalPeriod(Astronomy.Body[w.body]);
    return Number.isFinite(days) && days > 0 ? days * DAY : null;
  } catch {
    return null;
  }
}

/** n times spread evenly over one period from t0 (the last lap point is the first, so not repeated). */
export function ringTimes(periodMs, t0Ms, n = RING_SAMPLES) {
  const out = new Float64Array(n);
  for (let k = 0; k < n; k++) out[k] = t0Ms + (periodMs * k) / n;
  return out;
}

/** A round dot for the markers, drawn once. Null outside a browser. */
function dotTexture() {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) return null;
  // White, so the vertex colour is the planet's tint, inside a black rim that stays black whatever
  // it is multiplied by and parts the dot from a glyph ring behind it.
  g.fillStyle = '#000000';
  g.beginPath();
  g.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createOrbitRings(scene, { renderer } = {}) {
  const group = new THREE.Group();
  group.name = 'orbit-rings';
  group.visible = false;
  if (scene) scene.add(group);

  const rings = new Map(); // id -> { line, geometry, material, builtAt, builtStage }
  const planets = WORLDS.filter((w) => w.parent === 'sun' && periodMsOfWorld(w.id));

  // One Points object for every dot, packed in the order asked and drawn up to that count.
  const tint = new Map(planets.map((w) => [w.id, new THREE.Color(w.look && w.look.tint !== undefined ? w.look.tint : 0xe8ecf2)]));
  const dotGeometry = new THREE.BufferGeometry();
  const dotPos = new Float32Array(planets.length * 3);
  const dotCol = new Float32Array(planets.length * 3);
  dotGeometry.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
  dotGeometry.setAttribute('color', new THREE.BufferAttribute(dotCol, 3));
  dotGeometry.setDrawRange(0, 0);
  const map = dotTexture();
  const dotMaterial = new THREE.PointsMaterial({
    size: MARKER_PX,
    sizeAttenuation: false, // a size in pixels, not in km: this is the exaggeration, named
    vertexColors: true,
    map,
    alphaTest: map ? 0.5 : 0,
    // Transparent only to be drawn in the glyphs' list: three.js draws every opaque object first,
    // whatever its renderOrder, so an opaque dot sat under every glyph.
    transparent: true,
    depthTest: true, // behind a true disc bigger than itself, so the disc wins (header)
    depthWrite: false,
  });
  const dots = new THREE.Points(dotGeometry, dotMaterial);
  dots.name = 'orbit-dots';
  dots.frustumCulled = false;
  dots.renderOrder = RENDER_ORDER;
  group.add(dots);

  const _v = new THREE.Vector3();

  function ringFor(id) {
    let r = rings.get(id);
    if (r) return r;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((RING_SAMPLES + 1) * 3), 3));
    geometry.setDrawRange(0, 0);
    const w = BY_ID.get(id);
    const material = new THREE.LineBasicMaterial({
      color: w && w.look && w.look.tint !== undefined ? w.look.tint : 0xe8ecf2,
      transparent: true,
      opacity: 0.55, // the selection's orbit line's (scene/orbitline.js)
      depthTest: true,
      depthWrite: false,
    });
    const line = new THREE.Line(geometry, material);
    line.name = `orbit-ring-${id}`;
    line.frustumCulled = false;
    line.renderOrder = 1;
    group.add(line);
    r = { line, geometry, material, builtAt: NaN, builtStage: null };
    rings.set(id, r);
    return r;
  }

  // Every sample converted round TODAY's Sun (frameT = tMs), as orbitline.js does for a whole
  // path: the line is the path in space, and on the Sun stage the origin is the Sun anyway.
  function build(r, id, tMs) {
    const period = periodMsOfWorld(id);
    const pos = r.geometry.attributes.position.array;
    let n = 0;
    if (period) {
      for (const t of ringTimes(period, tMs)) {
        const p = positionOf(id, t);
        if (!p || !stage.toSceneInto(p, p.frame, _v, tMs)) continue;
        pos[n * 3] = _v.x; pos[n * 3 + 1] = _v.y; pos[n * 3 + 2] = _v.z;
        n += 1;
      }
    }
    if (n >= 4) { // close the loop
      pos[n * 3] = pos[0]; pos[n * 3 + 1] = pos[1]; pos[n * 3 + 2] = pos[2];
      n += 1;
    }
    r.geometry.attributes.position.needsUpdate = true;
    r.geometry.setDrawRange(0, n >= 5 ? n : 0);
    r.geometry.computeBoundingSphere();
    r.builtAt = tMs;
    r.builtStage = stage.worldId;
  }

  /** `ids`: the planets the running trip asks for, or an empty list / null for none. */
  function update(tMs, ids) {
    const want = stage.worldId === STAGE && Array.isArray(ids) && ids.length ? ids : null;
    group.visible = !!want;
    if (!want) return;
    dotMaterial.size = MARKER_PX * (renderer && renderer.getPixelRatio ? renderer.getPixelRatio() : 1);
    for (const [id, r] of rings) r.line.visible = want.includes(id);
    let n = 0;
    for (const id of want) {
      const c = tint.get(id);
      if (!c) continue; // not a planet of the Sun: nothing to draw
      const r = ringFor(id);
      r.line.visible = true;
      if (!Number.isFinite(r.builtAt) || Math.abs(tMs - r.builtAt) > REBUILD_MS || r.builtStage !== stage.worldId) build(r, id, tMs);
      const p = positionOf(id, tMs);
      if (!p || !stage.toSceneInto(p, p.frame, _v, tMs)) continue;
      dotPos[n * 3] = _v.x; dotPos[n * 3 + 1] = _v.y; dotPos[n * 3 + 2] = _v.z;
      dotCol[n * 3] = c.r; dotCol[n * 3 + 1] = c.g; dotCol[n * 3 + 2] = c.b;
      n += 1;
    }
    dotGeometry.setDrawRange(0, n);
    dotGeometry.attributes.position.needsUpdate = true;
    dotGeometry.attributes.color.needsUpdate = true;
  }

  function dispose() {
    for (const r of rings.values()) { r.geometry.dispose(); r.material.dispose(); }
    dotGeometry.dispose();
    dotMaterial.dispose();
    if (map) map.dispose();
    if (scene) scene.remove(group);
  }

  return { update, dispose, group, visible: () => group.visible, planets: () => planets.map((w) => w.id) };
}

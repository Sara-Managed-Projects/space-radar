// scene/orbitrings.js -- the planets' paths round the Sun, and a dot for each planet, on the Sun
// stage while a trip asks for them (registry/tours.yaml `orbits:`).
//
// Contract: createOrbitRings(scene, { renderer, camera }) -> { update(tMs, ids), visible(), setDotScale(k), setLineScale(k), lines(), dispose() }
// Pure and exported for the test: ringTimes(periodMs, t0Ms, n), periodMsOfWorld(id), litShare(n, sun)
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
// TRUE SIZE (public #296, ui/scalebadge.js). setDotScale(k) draws the planets' dots k times
// MARKER_PX across, and at 0 not at all: what is left is each planet at the size it is, which from
// here is under a pixel, with its path and its name. The badge that asks for it says how much
// wider than the planet the dot is, from MARKER_PX and the camera, and what is lost without it.
// The Earth's and the Moon's lit dots belong to a trip's stop and are not touched.
//
// Only on the Sun stage. Everywhere else the planets are already floored by worlds.js, and a
// second dot beside a compressed disc would be two answers to where Mars is.
//
// AND THE MOON'S PATH ROUND THE EARTH (2026-10-06, internal #401). "Why the Moon changes shape"
// opens a million km above the north pole with the Moon's whole month in frame. Both worlds are
// drawn true there, and true is an Earth nine pixels wide and a Moon of two: the stop that is
// meant to show why a phase is a point of view showed two specks. So a trip on the Earth's stage
// may ask for `orbits: [moon]`, and while the camera is further from the Earth than
// MOON_PATH_FROM_KM (outside the Moon's orbit, looking in) it gets:
//   - the Moon's path: one sidereal month of worlds.js positionOf, the same ephemeris as the disc;
//   - a dot at the Earth and a dot at the Moon, EARTH_DOT_PX and MOON_DOT_PX across, each shaded
//     as a ball lit by the Sun from where the Sun really is (litShare below is the shader's rule):
//     the half that faces the Sun is bright and the other is dark, so from above the pole every
//     dot is a half disc turned the same way, and the frame says they are drawn larger than life.
// Nearer than that the worlds are discs in their own right and nothing here is drawn, so the
// stops that look at the Moon from the Earth's side are untouched.

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
/** The Moon's path and the two lit dots, on the Earth's stage (the header says why). */
const MOON_STAGE = 'earth';
export const MOON_PATH_FROM_KM = 600000;
export const SIDEREAL_MONTH_MS = 27.321661 * 86400e3;
export const EARTH_DOT_PX = 30;
export const MOON_DOT_PX = 14;
const EARTH_DOT_COLOUR = 0x5b8fd6;
const MOON_DOT_COLOUR = 0xc9c5c1;
/** How bright the side of a dot that faces away from the Sun is drawn, as a share of the lit side. */
export const DOT_NIGHT = 0.07;

/**
 * How lit a point of a ball is: 1 where its normal faces the Sun, DOT_NIGHT where it faces away,
 * with a soft edge 0.08 of the radius wide at the terminator. The dots' shader is this, per pixel.
 */
export function litShare(nx, ny, nz, sx, sy, sz) {
  const d = nx * sx + ny * sy + nz * sz;
  const t = Math.min(1, Math.max(0, (d + 0.04) / 0.08));
  return DOT_NIGHT + (1 - DOT_NIGHT) * t * t * (3 - 2 * t);
}

const LIT_VERT = /* glsl */`
attribute float aSize;
attribute vec3 color;
varying vec3 vColour;
uniform float uPixelRatio;
void main() {
  vColour = color;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  gl_PointSize = aSize * uPixelRatio;
}
`;
const LIT_FRAG = /* glsl */`
uniform vec3 uSunView;
varying vec3 vColour;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  p.y = -p.y;
  float r2 = dot( p, p );
  if ( r2 > 1.0 ) discard;
  vec3 n = vec3( p, sqrt( 1.0 - r2 ) );
  float lit = ${DOT_NIGHT.toFixed(3)} + ${(1 - DOT_NIGHT).toFixed(3)} * smoothstep( -0.04, 0.04, dot( n, uSunView ) );
  // A dark rim one pixel in from the edge, as the planets' dots have, so the night half of a dot
  // still reads as a ball against black space.
  float rim = smoothstep( 0.80, 0.97, r2 );
  gl_FragColor = vec4( mix( vColour * lit, vec3( 0.16, 0.18, 0.22 ), rim * ( 1.0 - lit ) * 0.9 ), 1.0 );
  #include <colorspace_fragment>
}
`;
/**
 * Rebuild a path after this much clock time. A planet's path round the Sun changes by arc-seconds
 * a century, so this is about the frame conversion being made at a recent instant, not about the
 * orbit; at 525 600x it is one rebuild every half-minute of real time.
 */
const REBUILD_MS = 365.25 * DAY / 2;

const BY_ID = new Map(WORLDS.map((w) => [w.id, w]));

/**
 * THE PATHS' WIDTH, in CSS pixels (internal #444, #454). A THREE.Line is one DEVICE pixel wide
 * whatever is asked, so five paths on black lit 1.1 % of the year trip's picture and were a third
 * of a CSS pixel on a phone. scene/fatline.js draws the same points as quads this wide; it is
 * fetched the first time a path is asked for and the one-pixel line is drawn until it lands.
 * Width is a drawing choice: the points are the ephemeris's and are not moved.
 */
export const PATH_PX = 2;

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

export function createOrbitRings(scene, { renderer, camera } = {}) {
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
  const _s = new THREE.Vector3();

  // The Earth's and the Moon's lit dots: two points and one direction to the Sun.
  const litGeometry = new THREE.BufferGeometry();
  const litPos = new Float32Array(6);
  const litCol = new Float32Array(6);
  new THREE.Color(EARTH_DOT_COLOUR).toArray(litCol, 0);
  new THREE.Color(MOON_DOT_COLOUR).toArray(litCol, 3);
  litGeometry.setAttribute('position', new THREE.BufferAttribute(litPos, 3));
  litGeometry.setAttribute('color', new THREE.BufferAttribute(litCol, 3));
  litGeometry.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array([EARTH_DOT_PX, MOON_DOT_PX]), 1));
  const litMaterial = new THREE.ShaderMaterial({
    uniforms: { uSunView: { value: new THREE.Vector3(1, 0, 0) }, uPixelRatio: { value: 1 } },
    vertexShader: LIT_VERT,
    fragmentShader: LIT_FRAG,
    transparent: true, // drawn in the glyphs' list, as the planets' dots are
    // depthTest stays ON (scripts/check-drawn.mjs refuses a transparent object with it off: it would
    // paint over every model and world). The true discs are smaller than these dots from here, so a
    // disc hides only the middle of its own dot.
    depthTest: true,
    depthWrite: false,
  });
  const litDots = new THREE.Points(litGeometry, litMaterial);
  litDots.name = 'orbit-lit-dots';
  litDots.frustumCulled = false;
  litDots.renderOrder = RENDER_ORDER;
  litDots.visible = false;
  group.add(litDots);

  // The wide paths (PATH_PX above): scene/fatline.js, never at boot.
  let fatMod = null;
  let fatAsked = false;
  let fatWarned = false;
  let lineScale = 1;
  function fatten(r) {
    if (r.fat || !fatMod) return;
    r.fat = fatMod.createFatLine(r.geometry.attributes.position.array, { colour: r.material.color.getHex(), opacity: r.material.opacity, renderOrder: 1 });
    r.fat.name = `${r.line.name}-wide`;
    r.fat.setCount(r.geometry.drawRange.count);
    group.add(r.fat);
  }
  function wantFat() {
    if (fatAsked || typeof window === 'undefined') return;
    fatAsked = true;
    import('./fatline.js').then((m) => { fatMod = m; for (const r of rings.values()) fatten(r); })
      .catch((e) => { console.warn('the wide paths did not load; the one-pixel lines stay', e); });
  }
  /** Once a frame: the wide path stands in for the line it was built from, at today's buffer size. */
  function syncFat() {
    if (!fatMod) return;
    const dpr = renderer && renderer.getPixelRatio ? renderer.getPixelRatio() : 1;
    const el = renderer && renderer.domElement;
    const w = el ? el.width : 1;
    const h = el ? el.height : 1;
    for (const r of rings.values()) {
      if (!r.fat) continue;
      // A shader this GPU will not compile draws nothing: the one-pixel line comes back for good.
      if (r.fat.broken(renderer) === true) {
        group.remove(r.fat); r.fat.dispose(); r.fat = null; fatMod = null;
        if (!fatWarned) { fatWarned = true; console.warn('the wide paths did not compile here; the one-pixel lines stay'); }
        continue;
      }
      r.fat.visible = r.line.visible;
      if (r.fat.visible) { r.fat.setWidth(PATH_PX * lineScale * dpr, w, h); r.line.visible = false; }
    }
  }
  /** A picture may ask for wider paths (ui/trippics.js: a share picture is seen at half its size). */
  function setLineScale(k) { lineScale = Number.isFinite(k) && k > 0 ? Math.min(4, k) : 1; }

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
    r = { line, geometry, material, fat: null, builtAt: NaN, builtStage: null };
    rings.set(id, r);
    wantFat();
    if (fatMod) fatten(r);
    return r;
  }

  // Every sample converted round TODAY's Sun (frameT = tMs), as orbitline.js does for a whole
  // path: the line is the path in space, and on the Sun stage the origin is the Sun anyway.
  function build(r, id, tMs) {
    const period = id === 'moon' ? SIDEREAL_MONTH_MS : periodMsOfWorld(id);
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
    if (r.fat) { r.fat.setCount(r.geometry.drawRange.count); r.fat.touch(); }
    r.builtAt = tMs;
    r.builtStage = stage.worldId;
  }

  /** How wide the planets' dots are drawn, as a share of MARKER_PX: 1 by default, 0 for true size. */
  let dotScale = 1;
  function setDotScale(k) {
    dotScale = Number.isFinite(k) ? Math.min(1, Math.max(0, k)) : 1;
    dotMaterial.size = MARKER_PX * dotScale * (renderer && renderer.getPixelRatio ? renderer.getPixelRatio() : 1);
    if (stage.worldId !== MOON_STAGE) dots.visible = dotScale > 0;
  }

  /** `ids`: the planets the running trip asks for, or an empty list / null for none. */
  function update(tMs, ids) {
    if (stage.worldId === MOON_STAGE) return updateMoon(tMs, ids);
    litDots.visible = false;
    dots.visible = dotScale > 0;
    const want = stage.worldId === STAGE && Array.isArray(ids) && ids.length ? ids : null;
    group.visible = !!want;
    if (!want) return;
    dotMaterial.size = MARKER_PX * dotScale * (renderer && renderer.getPixelRatio ? renderer.getPixelRatio() : 1);
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
    syncFat();
  }

  /** The Earth's stage: the Moon's path and the two lit dots, from outside the Moon's orbit only. */
  function updateMoon(tMs, ids) {
    const asked = Array.isArray(ids) && ids.includes('moon');
    const far = !!camera && camera.position.length() * stage.unitKm > MOON_PATH_FROM_KM;
    group.visible = asked && far;
    if (!group.visible) return;
    dots.visible = false;
    litDots.visible = true;
    for (const [id, r] of rings) r.line.visible = id === 'moon';
    const r = ringFor('moon');
    r.line.visible = true;
    // A month's path is rebuilt every few days of clock: the Moon's orbit turns in space, slowly.
    if (!Number.isFinite(r.builtAt) || Math.abs(tMs - r.builtAt) > 3 * DAY || r.builtStage !== stage.worldId) build(r, 'moon', tMs);
    const m = positionOf('moon', tMs);
    const sun = positionOf('sun', tMs);
    if (!m || !stage.toSceneInto(m, m.frame, _v, tMs)) { litDots.visible = false; return; }
    litPos[0] = 0; litPos[1] = 0; litPos[2] = 0; // the Earth is this stage's origin
    litPos[3] = _v.x; litPos[4] = _v.y; litPos[5] = _v.z;
    litGeometry.attributes.position.needsUpdate = true;
    if (sun && stage.toSceneInto(sun, sun.frame, _s, tMs) && _s.lengthSq() > 0) {
      // The Sun's direction in the camera's own axes, which are the axes a point sprite is drawn in.
      _s.normalize().transformDirection(camera.matrixWorldInverse);
      litMaterial.uniforms.uSunView.value.copy(_s);
    }
    litMaterial.uniforms.uPixelRatio.value = renderer && renderer.getPixelRatio ? renderer.getPixelRatio() : 1;
    syncFat();
  }

  function dispose() {
    litGeometry.dispose();
    litMaterial.dispose();
    for (const r of rings.values()) { r.geometry.dispose(); r.material.dispose(); if (r.fat) r.fat.dispose(); }
    dotGeometry.dispose();
    dotMaterial.dispose();
    if (map) map.dispose();
    if (scene) scene.remove(group);
  }

  return {
    update, setDotScale, setLineScale, dispose, group,
    visible: () => group.visible,
    planets: () => planets.map((w) => w.id),
    /** What draws each path now: 'wide' once scene/fatline.js has landed, 'line' before. */
    lines: () => [...rings.entries()].map(([id, r]) => ({ id, by: r.fat ? 'wide' : 'line', points: r.geometry.drawRange.count, shown: r.fat ? r.fat.visible : r.line.visible })),
  };
}

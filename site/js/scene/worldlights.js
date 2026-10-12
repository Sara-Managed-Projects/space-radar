// scene/worldlights.js -- planets and moons shine by their real brightness (spec 0072 requirement 1).
//
// Contract: createWorldLights({ scene, worlds, camera, renderer, magLimit }) ->
//             { update(tMs), setMagLimit(m), setVisible(on), state(), points, dispose() }
//           planetMagnitude(id, rAu, dAu, alphaDeg, opts), moonMagnitude(rAu, dKm, alphaDeg),
//           reflectedMagnitude(radiusKm, albedo, rAu, dKm, alphaDeg), lambertPhase(alphaRad),
//           apparentMagnitude(id, geometry), starSprite(m, magLimit), discFade(px), discCover(...)
//           GEOMETRIC_ALBEDO, LIGHT_FADE_PX, SUN_APPARENT_MAG, WORLDLIGHT_VERT, WORLDLIGHT_FRAG
//
// WHY. Ivan, 2026-10-12: "maybe stars, planets, whatever should shine a bit brighter if it is
// realistic". A star brighter than magnitude 2.5 has a glow and one past -1.5 a glare
// (scene/stars3d.js), while a planet was a small lit disc and nothing else: Sirius had a glow and
// Venus, which outshines it by three magnitudes, had none. So a world whose drawn disc is small on
// screen gets ONE sprite of the stars' own kind (scene/stretch.js STAR_LIGHT_GLSL: a peak and a soft
// skirt, no spikes), in the body's colour, with the size and alpha the star shader gives a star of
// that apparent magnitude. All the lights are one THREE.Points: one draw call, additive. There is no
// pass over the frame and nothing is rendered to a texture (tests/test_contract.mjs refuses both).
//
// THE MAGNITUDE IS COMPUTED, per frame, on the CPU, for the thirty worlds of scene/worlds.js:
//
//   the eight planets   Mallama and Hilton (2018), "Computing apparent planetary magnitudes for The
//                       Astronomical Almanac", Astronomy and Computing 25, 10 (arXiv:1808.01973):
//                       V = 5 log10(r d) + a polynomial in the phase angle, one per planet. The
//                       coefficients were read from Skyfield's magnitudelib.py (Brandon Rhodes, MIT
//                       licence), which transcribes the paper's own Ap_Mag_V3.f90, on 2026-10-12.
//                       Left out, as Skyfield leaves it out: which face of Mars is turned to the
//                       observer (up to 0.06 mag). Saturn's rings are in (equation 10) where the
//                       paper has them: a phase angle of 6.5 degrees or less, with the tilt held at
//                       27 degrees at most. Past that phase angle nobody has published the rings'
//                       light, so the globe alone is used (equation 12) and Saturn is drawn up to a
//                       magnitude fainter than it is. The tilt is the planet's own: its pole is read
//                       from its mesh, which scene/worlds.js turns by the IAU axis.
//   the Moon            the curve astronomy-engine uses in Illumination() (Don Cross, MIT licence,
//                       site/vendor/astronomy.js MoonMagnitude): -12.717 + 1.49 |a| + 0.0431 a^4,
//                       a in radians, scaled by distance. A Lambert ball is wrong for the Moon by
//                       over a magnitude at the quarters (it has a strong opposition surge), so the
//                       measured curve is used. astronomy-engine's own PLANET magnitudes are an
//                       older fit made for the Earth's sky and are not used here.
//   the other moons,    a Lambert sphere: m = m_sun - 2.5 log10( p (R / d)^2 phi(a) ) + 5 log10(r),
//   and Pluto           phi(a) = ( sin a + (pi - a) cos a ) / pi, p the visual geometric albedo
//                       (GEOMETRIC_ALBEDO below: the numbers registry/worlds.yaml quotes from NASA's
//                       fact sheets, held equal by tests/test_worldlights.mjs) and R the row's
//                       radius. A SIMPLE PHASE LAW, NOT A MEASURED ONE: icy moons surge at opposition
//                       and Iapetus has two faces; expect a few tenths of a magnitude.
//
// THE OBSERVER IS THE CAMERA'S TRUE PLACE, not the Earth, and not the drawn picture's:
//
//   on a world's stage  the stage world's true heliocentric position plus the camera's offset from
//                       the scene's origin, times the stage's unit_km. In scene units that is just
//                       the camera's position, because stage.toSceneInto() gives every world's TRUE
//                       position in the same units about the same origin. The squeeze (PLANET_VIEW:
//                       another planet is drawn along its true direction but far nearer and
//                       enlarged) does not enter: the Sun-world distance, the world-camera distance
//                       and the phase angle (Sun, world, camera) are all taken from true positions.
//                       Only the sprite's PLACE is the drawn one, on the disc it belongs to.
//   on the Sun's stage  the same arithmetic; the origin is the Sun and nothing is squeezed, so the
//                       drawn place is the true one.
//   on a ladder rung, or a star system's stage
//                       the whole Solar System is one point (or is forty light-years away): no
//                       world has a light there. The Sun as a star is scene/stars3d.js's.
//
// The Sun is not part of this: it has its own glow in scene/worlds.js.
//
// THE FADE. The light is full while the drawn disc is LIGHT_FADE_PX[0] CSS pixels across or less
// and gone at LIGHT_FADE_PX[1] and more, so a planet close up is its own lit surface and nothing
// else. In between both are drawn, the sprite fading as the disc grows.
//
// DEPTH. The renderer has a logarithmic depth buffer (scene/renderer.js). The sprite is depth-tested
// and writes no depth, and it is placed a little over one drawn radius nearer the camera than the
// world's centre: in front of its own disc (so it cannot z-fight it) and behind anything nearer, so
// a nearer world covers it pixel by pixel. That alone would leave half a glow standing on the limb
// of the Earth when the planet itself has set behind it, which no camera records: a point that is
// hidden throws no glare. So the share of the world's disc that a nearer world's disc covers is
// worked out on the CPU too (discCover) and takes the light down with it.
//
// NOT IN v1: a world in another world's shadow. A moon in eclipse keeps its light here, and so does
// the Moon during a lunar eclipse; the Earth's light on the Moon's night side is not added either.
//
// EXPOSURE. Eye, Camera and Deep change the faintest star drawn (scene/exposure.js starLimit), and
// the same limit holds here: Neptune, at 7.8, has no light at any of them, as it has none to an eye.
//
// COST. Thirty worlds: a few hundred multiplications and under a thousand cheap pair tests a frame,
// no allocation, one draw call of at most thirty points. It does not follow the frame latch
// (scene/quality.js) because there is nothing to save. Loaded after the first visit (main.js).

import * as THREE from '../../vendor/three.module.min.js';
import { stage, SUN_INERTIAL, isLadderStage, isSystemStage } from './stage.js';
import { STAR_LIGHT_GLSL } from './stretch.js';
import { WORLDS } from './worlds.js';

const DEG = Math.PI / 180;
const KM_PER_AU = 1.495978707e8;

/**
 * The Sun's apparent visual magnitude at 1 au, from its absolute magnitude (IAU 2015 B2: 4.83, the
 * number scene/stars3d.js draws the Sun as a star with): 4.83 + 5 log10( 1 au / 10 pc ) = -26.74.
 */
export const SUN_APPARENT_MAG = 4.83 + 5 * Math.log10(KM_PER_AU / (10 * 30856775814913.67));

/** Full light at the first number of CSS pixels of disc diameter and under, none at the second and over. */
export const LIGHT_FADE_PX = [8, 16];

/**
 * Visual geometric albedos for the worlds drawn as Lambert spheres. Each is the number
 * registry/worlds.yaml quotes under `facts.albedo` (NASA NSSDCA fact sheets, read 2026-09-22);
 * tests/test_worldlights.mjs refuses a number here that the registry's sentence does not contain.
 * Iapetus's sheet prints two, 0.05 for the leading side and 0.5 for the trailing one: the mean is
 * used, so its light is right on average and wrong by up to a magnitude at either elongation.
 */
export const GEOMETRIC_ALBEDO = {
  pluto: 0.52, charon: 0.42,
  io: 0.62, europa: 0.68, ganymede: 0.44, callisto: 0.19,
  phobos: 0.07, deimos: 0.08,
  mimas: 0.6, enceladus: 1.0, tethys: 0.8, dione: 0.7, rhea: 0.7, titan: 0.22, iapetus: 0.275,
  miranda: 0.32, ariel: 0.39, umbriel: 0.21, titania: 0.27, oberon: 0.23,
  triton: 0.72,
};

/**
 * The Earth's colour as a light. Every other world takes its map's measured mean colour (WORLDS
 * `look.tint`); the Earth has its own shader and no such number, so this one is CHOSEN: the pale
 * blue of the pictures taken of it from Mars and beyond.
 */
const EARTH_LIGHT_COLOUR = 0x9dbcff;

// The phase angles each of the paper's polynomials was fitted over, in degrees. Past one the angle
// is held at its end: a sixth-degree polynomial is not a law outside its data.
const PHASE_MAX = { mercury: 170, venus: 179, earth: 170, mars: 150, jupiter: 130, saturn: 150, uranus: 154, neptune: 133 };

const log10 = Math.log10;
const clamp01 = (x) => Math.min(1, Math.max(0, x));

/**
 * A planet's apparent visual magnitude: Mallama and Hilton (2018), coefficients as in Skyfield's
 * magnitudelib.py (MIT). Pure.
 *
 * @param {string} id        mercury .. neptune
 * @param {number} rAu       the planet's distance from the Sun, au
 * @param {number} dAu       the planet's distance from the observer, au
 * @param {number} alphaDeg  the phase angle: Sun, planet, observer
 * @param {Object} [opts]    subSunLatDeg, subObsLatDeg: the latitude on the planet under the Sun and
 *                           under the observer (Saturn's rings and Uranus's pole; planetocentric,
 *                           where the paper's Uranus term is planetographic: under 0.002 mag apart);
 *                           year: Neptune brightened between 1980 and 2000. Without the latitudes
 *                           Saturn is the globe alone and Uranus its mean.
 * @returns {number} NaN for a world that is not one of the eight
 */
export function planetMagnitude(id, rAu, dAu, alphaDeg, opts = {}) {
  if (!(rAu > 0) || !(dAu > 0) || !(id in PHASE_MAX)) return NaN;
  const a = Math.min(Math.max(0, Number(alphaDeg) || 0), PHASE_MAX[id]);
  const dist = 5 * log10(rAu * dAu);
  switch (id) {
    case 'mercury':
      return -0.613 + dist + a * (6.3280e-02 + a * (-1.6336e-03 + a * (3.3644e-05 + a * (-3.4265e-07 + a * (1.6893e-09 + a * -3.0334e-12)))));
    case 'venus':
      return a < 163.7
        ? -4.384 + dist + a * (-1.044e-03 + a * (3.687e-04 + a * (-2.814e-06 + a * 8.938e-09)))
        : 236.05828 + dist + a * (-2.81914 + a * 8.39034e-03);
    case 'earth':
      return -3.99 + dist + a * (-1.060e-03 + a * 2.054e-04);
    case 'mars':
      return a <= 50
        ? -1.601 + dist + a * (2.267e-02 + a * -1.302e-04)
        : -0.367 + dist + a * (-0.02573 + a * 0.0003445);
    case 'jupiter': {
      if (a <= 12) return -9.395 + dist + a * (-3.7e-04 + a * 6.16e-04);
      const x = a / 180;
      return -9.428 + dist - 2.5 * log10(1.0 + x * (-1.507 + x * (-0.363 + x * (-0.062 + x * (2.809 + x * -1.876)))));
    }
    case 'saturn': {
      const s = Number(opts.subSunLatDeg);
      const o = Number(opts.subObsLatDeg);
      if (a <= 6.5 && Number.isFinite(s) && Number.isFinite(o)) {
        // Equation 10, globe and rings: the tilt is the geometric mean of the Sun's and the observer's
        // latitudes, and nothing when they are on opposite sides of the ring plane.
        const beta = Math.min(27, s * o >= 0 ? Math.sqrt(s * o) : 0);
        const sb = Math.sin(beta * DEG);
        return -8.914 + dist - 1.825 * sb + 0.026 * a - 0.378 * sb * Math.exp(-2.25 * a);
      }
      // The globe alone: equation 11 near opposition, equation 12 beyond it.
      return a <= 6.5
        ? -8.95 + dist + a * (-3.7e-04 + a * 6.16e-04)
        : -8.94 + dist + a * (2.446e-04 + a * (2.672e-04 + a * (-1.506e-06 + a * 4.767e-09)));
    }
    case 'uranus': {
      const s = Number(opts.subSunLatDeg);
      const o = Number(opts.subObsLatDeg);
      const lat = Number.isFinite(s) && Number.isFinite(o) ? (Math.abs(s) + Math.abs(o)) / 2 : 0;
      return -7.110 + dist - 0.00084 * lat + (a > 3.1 ? a * (6.587e-03 + a * 1.045e-04) : 0);
    }
    case 'neptune': {
      const year = Number.isFinite(Number(opts.year)) ? Number(opts.year) : 2026;
      const base = Math.min(-6.89, Math.max(-7.00, -6.89 - 0.0054 * (year - 1980)));
      return base + dist + (a > 1.9 ? a * (7.944e-03 + a * 9.617e-05) : 0);
    }
    default:
      return NaN;
  }
}

/**
 * The Moon: astronomy-engine's MoonMagnitude (MIT), with the observer's distance in km. Pure.
 */
export function moonMagnitude(rAu, dKm, alphaDeg) {
  if (!(rAu > 0) || !(dKm > 0)) return NaN;
  const a = Math.abs(Number(alphaDeg) || 0) * DEG;
  const a2 = a * a;
  return -12.717 + 1.49 * a + 0.0431 * a2 * a2 + 5 * log10(rAu * (dKm / 385000.6));
}

/** A Lambert sphere's phase function: 1 face on, 1/pi at the quarter, 0 from behind. Pure. */
export function lambertPhase(alphaRad) {
  const a = Math.min(Math.PI, Math.max(0, Number(alphaRad) || 0));
  const phi = (Math.sin(a) + (Math.PI - a) * Math.cos(a)) / Math.PI;
  return phi > 1e-12 ? phi : 0; // from exactly behind, nothing: not the rounding's 1e-17
}

/**
 * A ball of a known radius and geometric albedo, lit by the Sun and seen at a phase angle, as a
 * Lambert sphere. Infinity (no light) from exactly behind. Pure.
 */
export function reflectedMagnitude(radiusKm, albedo, rAu, dKm, alphaDeg) {
  if (!(radiusKm > 0) || !(albedo > 0) || !(rAu > 0) || !(dKm > 0)) return NaN;
  const share = albedo * (radiusKm / dKm) * (radiusKm / dKm) * lambertPhase((Number(alphaDeg) || 0) * DEG);
  if (!(share > 0)) return Infinity;
  return SUN_APPARENT_MAG - 2.5 * log10(share) + 5 * log10(rAu);
}

const RADIUS_KM = new Map(WORLDS.map((w) => [w.id, w.radiusKm]));

/**
 * Any world's apparent magnitude from where the observer is. `g` is { rKm, dKm, alphaDeg } (the
 * world from the Sun, the world from the observer, the angle Sun-world-observer) and, for Saturn and
 * Uranus, subSunLatDeg and subObsLatDeg; for Neptune, year. NaN for the Sun and for a world with no
 * law here. Pure.
 */
export function apparentMagnitude(id, g) {
  if (!g) return NaN;
  const rAu = g.rKm / KM_PER_AU;
  if (id in PHASE_MAX) return planetMagnitude(id, rAu, g.dKm / KM_PER_AU, g.alphaDeg, g);
  if (id === 'moon') return moonMagnitude(rAu, g.dKm, g.alphaDeg);
  const p = GEOMETRIC_ALBEDO[id];
  return p ? reflectedMagnitude(RADIUS_KM.get(id), p, rAu, g.dKm, g.alphaDeg) : NaN;
}

/**
 * What scene/stars3d.js's vertex shader makes of a star of apparent magnitude m: the sprite's size
 * in CSS pixels, the core's share of it, the glow and the glare (0..1 each) and the alpha. THE SAME
 * ARITHMETIC, number for number; tests/test_worldlights.mjs reads the shader and holds them equal.
 * Pure.
 */
export function starSprite(m, magLimit = 7.5) {
  if (!Number.isFinite(m)) return { sizePx: 0, core: 1, glow: 0, glare: 0, alpha: 0 };
  const tt = clamp01((6.5 - m) / 8.0);
  let core = 1.0 + 5.0 * Math.pow(tt, 1.6);
  const glare = clamp01((-1.5 - m) / 6.0);
  const glow = clamp01((2.5 - m) / 4.0);
  core *= 1.0 + 0.8 * glow;
  const sizePx = core * (1.0 + 4.0 * glow) + 26.0 * glare;
  return { sizePx, core: core / sizePx, glow, glare, alpha: m > magLimit ? 0 : 0.35 + 0.65 * tt };
}

/** How much of its light a world keeps at a drawn disc `px` CSS pixels across: 1 .. 0, smoothly. Pure. */
export function discFade(px) {
  const [full, none] = LIGHT_FADE_PX;
  if (!(px > full)) return 1;
  if (px >= none) return 0;
  const k = (px - full) / (none - full);
  return 1 - k * k * (3 - 2 * k);
}

/**
 * The share of a small disc (angular radius `own`) left showing past a nearer disc (angular radius
 * `other`) whose centre is `sep` away: 1 clear of it, 0 wholly behind it, linear between. All in
 * radians. Pure.
 */
export function discCover(sep, own, other) {
  if (!(own > 0)) return sep >= other ? 1 : 0;
  return clamp01((sep - (other - own)) / (2 * own));
}

export const WORLDLIGHT_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aColour;
attribute vec4 aSprite;   // size in CSS px, the core's share of it, glow, glare
attribute float aAlpha;
uniform float uPixelRatio;
varying vec3 vColour;
varying float vAlpha;
varying float vCore;
varying float vGlow;
varying float vGlare;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSprite.x * uPixelRatio;
  vCore = aSprite.y;
  vGlow = aSprite.z;
  vGlare = aSprite.w;
  vAlpha = aAlpha;
  vColour = aColour;
  #include <logdepthbuf_vertex>
}
`;

// scene/stars3d.js's fragment shader without the stretch: a world's light is never a streak.
export const WORLDLIGHT_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
varying vec3 vColour;
varying float vAlpha;
varying float vCore;
varying float vGlow;
varying float vGlare;
${STAR_LIGHT_GLSL}
void main() {
  if ( vAlpha <= 0.0 ) discard;
  #include <logdepthbuf_fragment>
  float d = length( gl_PointCoord - vec2( 0.5 ) );
  vec2 light = starLight( d, vCore, vGlow );
  float a = light.x + light.y;
  if ( vGlare > 0.0 ) {
    float e = 1.0 - clamp( d / 0.5, 0.0, 1.0 );
    a = max( a, vGlare * 0.8 * e * e );
  }
  if ( a <= 0.003 ) discard;
  gl_FragColor = vec4( mix( vColour, vec3( 1.0 ), 0.4 * light.x * max( vGlow, vGlare ) ), a * vAlpha );
  #include <colorspace_fragment>
}
`;

/**
 * The lights. `worlds` is scene/worlds.js's object (truePositionOf, drawnPositionOf,
 * drawnRadiusUnits, meshFor); the Points is added to `scene`.
 */
export function createWorldLights(opts = {}) {
  const { scene, worlds, camera, renderer } = opts;
  const rows = WORLDS.filter((w) => w.id !== 'sun');
  const all = WORLDS;
  const n = rows.length;

  const position = new Float32Array(n * 3);
  const colour = new Float32Array(n * 3);
  const sprite = new Float32Array(n * 4);
  const alpha = new Float32Array(n);
  const geometry = new THREE.BufferGeometry();
  const attr = (array, size) => {
    const a = new THREE.BufferAttribute(array, size);
    a.setUsage(THREE.DynamicDrawUsage);
    return a;
  };
  geometry.setAttribute('position', attr(position, 3));
  geometry.setAttribute('aColour', attr(colour, 3));
  geometry.setAttribute('aSprite', attr(sprite, 4));
  geometry.setAttribute('aAlpha', attr(alpha, 1));
  geometry.setDrawRange(0, 0);

  // Hue only: the map's mean colour is scaled by the world's albedo (scripts/build-textures.py), and
  // how bright the light is belongs to the magnitude, so the brightest channel is taken to 1.
  const c = new THREE.Color();
  const tints = rows.map((w) => {
    c.setHex(w.look && w.look.earth ? EARTH_LIGHT_COLOUR : (w.look && w.look.tint) || 0xffffff, THREE.SRGBColorSpace);
    const top = Math.max(c.r, c.g, c.b) || 1;
    return [c.r / top, c.g / top, c.b / top];
  });

  const uniforms = { uPixelRatio: { value: 1 } };
  const material = new THREE.ShaderMaterial({
    vertexShader: WORLDLIGHT_VERT,
    fragmentShader: WORLDLIGHT_FRAG,
    uniforms,
    // After every opaque disc, so the depth test sees them; additive, so the order among the
    // transparent things (air shells and rings at renderOrder 1, the aurora at 2) changes nothing
    // but what a ring drawn later would dim.
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'world-lights';
  points.frustumCulled = false;
  points.renderOrder = 3;
  points.visible = false;
  if (scene) scene.add(points);

  let magLimit = Number.isFinite(opts.magLimit) ? opts.magLimit : 7.5;
  let on = true;
  /** id -> { mag, alpha, sizePx, discPx, fade, cover }: this frame's, for the probes and the test. */
  const last = new Map();

  const _cam = new THREE.Vector3();
  const _sun = new THREE.Vector3();
  const _true = new THREE.Vector3();
  const _drawn = new THREE.Vector3();
  const _pole = new THREE.Vector3();
  const _toSun = new THREE.Vector3();
  const _toCam = new THREE.Vector3();
  const SUN_ORIGIN = { x: 0, y: 0, z: 0 };
  // Every drawn disc as the camera sees it: direction, distance, angular radius. Reused.
  const discs = all.map((w) => ({ id: w.id, x: 0, y: 0, z: 0, dist: 0, rad: 0, r: 0, seen: false }));
  const discOf = new Map(discs.map((d) => [d.id, d]));

  /** The latitude on a world under a direction from it (scene axes), from its mesh's own pole. */
  function subLatDeg(mesh, dir) {
    _pole.set(0, 1, 0).applyQuaternion(mesh.quaternion);
    const len = dir.length();
    return len > 0 ? Math.asin(Math.max(-1, Math.min(1, _pole.dot(dir) / len))) / DEG : NaN;
  }

  function update(tMs) {
    last.clear();
    const onLadder = isLadderStage(stage.worldId) || isSystemStage(stage.worldId);
    if (!on || onLadder || !worlds || !camera) { points.visible = false; geometry.setDrawRange(0, 0); return 0; }
    camera.getWorldPosition(_cam);
    if (!stage.toSceneInto(SUN_ORIGIN, SUN_INERTIAL, _sun, tMs)) { points.visible = false; geometry.setDrawRange(0, 0); return 0; }
    const unitKm = stage.unitKm;
    const el = renderer && renderer.domElement;
    const heightPx = (el && (el.clientHeight || (el.height / (renderer.getPixelRatio() || 1)))) || 800;
    const tanHalfFov = Math.tan(((camera.fov || 45) * Math.PI) / 360);
    uniforms.uPixelRatio.value = renderer && renderer.getPixelRatio ? renderer.getPixelRatio() : 1;
    const year = 1970 + tMs / 31557600000;

    // 1. Every drawn disc from the camera, the Sun and the stage's own world among them: they hide too.
    for (const d of discs) {
      d.seen = false;
      if (!worlds.drawnPositionOf(d.id, _drawn)) continue;
      _drawn.sub(_cam);
      const dist = _drawn.length();
      const r = worlds.drawnRadiusUnits(d.id);
      if (!(dist > 0) || !(r > 0)) continue;
      d.x = _drawn.x / dist; d.y = _drawn.y / dist; d.z = _drawn.z / dist;
      d.dist = dist;
      d.rad = r < dist ? Math.asin(r / dist) : Math.PI / 2;
      d.r = r;
      d.seen = true;
    }

    // 2. A light for each world whose disc is small.
    let count = 0;
    for (let i = 0; i < n; i++) {
      const w = rows[i];
      const d = discOf.get(w.id);
      if (!d.seen) continue;
      const discPx = (d.r / d.dist / tanHalfFov) * heightPx;
      const fade = discFade(discPx);
      if (!(fade > 0)) continue;
      const p = worlds.truePositionOf(w.id);
      if (!p || !stage.toSceneInto(p, p.frame, _true, tMs)) continue;
      _toSun.copy(_sun).sub(_true);
      _toCam.copy(_cam).sub(_true);
      const rKm = _toSun.length() * unitKm;
      const dKm = _toCam.length() * unitKm;
      if (!(rKm > 0) || !(dKm > 0)) continue;
      const alphaDeg = Math.acos(Math.max(-1, Math.min(1, _toSun.dot(_toCam) / (_toSun.length() * _toCam.length())))) / DEG;
      const g = { rKm, dKm, alphaDeg, year };
      if (w.id === 'saturn' || w.id === 'uranus') {
        const mesh = worlds.meshFor(w.id);
        if (mesh) { g.subSunLatDeg = subLatDeg(mesh, _toSun); g.subObsLatDeg = subLatDeg(mesh, _toCam); }
      }
      const mag = apparentMagnitude(w.id, g);
      const s = starSprite(mag, magLimit);
      if (!(s.alpha > 0)) { last.set(w.id, { mag, alpha: 0, sizePx: 0, discPx, fade, cover: 1 }); continue; }

      // Hidden behind a nearer disc, wholly or in part.
      let cover = 1;
      for (const o of discs) {
        if (!o.seen || o === d || o.dist >= d.dist) continue;
        const dot = d.x * o.x + d.y * o.y + d.z * o.z;
        if (dot < 0) continue;
        const sep = Math.acos(Math.min(1, dot));
        if (sep >= o.rad + d.rad) continue;
        cover = Math.min(cover, discCover(sep, d.rad, o.rad));
        if (cover === 0) break;
      }
      const a = s.alpha * fade * cover;
      last.set(w.id, { mag, alpha: a, sizePx: s.sizePx, discPx, fade, cover });
      if (!(a > 0)) continue;

      // In front of its own disc, by a little over its radius (and never less than the depth
      // buffer can tell apart), along the line of sight.
      const pull = Math.min(0.5 * d.dist, Math.max(1.05 * d.r, 2e-5 * d.dist));
      const at = d.dist - pull;
      const k = count * 3;
      position[k] = _cam.x + d.x * at; position[k + 1] = _cam.y + d.y * at; position[k + 2] = _cam.z + d.z * at;
      colour[k] = tints[i][0]; colour[k + 1] = tints[i][1]; colour[k + 2] = tints[i][2];
      const q = count * 4;
      sprite[q] = s.sizePx; sprite[q + 1] = s.core; sprite[q + 2] = s.glow; sprite[q + 3] = s.glare;
      alpha[count] = a;
      count += 1;
    }
    geometry.setDrawRange(0, count);
    points.visible = count > 0;
    if (count > 0) for (const name of ['position', 'aColour', 'aSprite', 'aAlpha']) geometry.attributes[name].needsUpdate = true;
    return count;
  }

  return {
    update,
    points,
    /** The faintest magnitude drawn: the stars' own limit (scene/exposure.js starLimit). */
    setMagLimit(m) { if (Number.isFinite(m)) magLimit = m; },
    setVisible(v) { on = v !== false; if (!on) points.visible = false; },
    /** This frame's lights by world id: { mag, alpha, sizePx, discPx, fade, cover }. */
    state() { return Object.fromEntries(last); },
    dispose() {
      if (points.parent) points.parent.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };
}

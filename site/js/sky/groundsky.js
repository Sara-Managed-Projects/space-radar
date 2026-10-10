// sky/groundsky.js -- the sky as it looks from the ground, drawn for the sky view (pub #454;
// internal #351 zoom, #352 the air, #353 fainter stars, #356 grids, #357 how dark the sky is).
//
// Contract: createGroundSky(ctx, env) -> { update(frame), setOptions(o), showPass(track, marks),
//             clearPass(), mark(azDeg, altDeg), apparentOf(id), apparentOfEq(dirEq), pickAt(x, y, camera),
//             whatAt(x, y, camera, rect), showTag(what, text, onOpen), hideTag(), meteorNow(),
//             stats(), pictures(), otherLight(), dispose(), ready }
//   env:   { group, radius, observer, domElement, options }   group is sky/skyview.js's local frame
//   frame: { tMs, fovDeg, sunAltDeg, sunAzDeg, moonBright, camera, renderer, showers }
// Loaded by sky/skyview.js with a dynamic import the first time the sky view opens: none of this,
// and none of the data it reads, is on the first visit.
//
// WHY IT IS ITS OWN LAYER. The orbital scene's sky (scene/starfield.js) is 5 044 stars at fixed
// sizes on a sphere that knows nothing of the ground: no air, no horizon, one field of view. And
// scene/worlds.js draws the planets 0.4 degrees wide so they can be found from orbit. From the
// ground both are wrong, so while this layer is up sky/skyview.js veils them and this draws:
//
//   the Milky Way   the scene's own panorama, turned with the stars, faded by the Moon, twilight,
//                   the horizon's air and the kind of sky chosen
//   the stars       ONE draw call: points with a shader. To magnitude 6 at once (data/stars.bin,
//                   80 kB, already in the cache), then to 7 (data/skystars-1.bin, 82 kB), and the
//                   rest of HYG v4.4's 109 389 (data/skystars-2.bin, 754 kB) only once the field
//                   has closed enough to show one of them; past those, AT-HYG's stars to magnitude
//                   10.5 in HEALPix tiles by where the view looks (sky/startiles.js, internal #353):
//                   compact files of direction, magnitude
//                   and colour that scripts/build-skystars.py cuts from stars3d.bin (internal
//                   #392: the sky view used to fetch that file's 2.6 MB on entry).
//                   The limit is sky/skymath.js limitingMagnitude(): the eye's in a wide field,
//                   deeper as the field narrows. The shader lifts each star by refraction, dims and
//                   reddens it by its air mass, and makes it twinkle near the horizon.
//   the bodies      the Sun, the Moon and seven planets from sky/skybodies.js: a point while small,
//                   a disc at its true apparent size once the field is narrow enough, lit from
//                   where the Sun really is, turned by its IAU rotation model; Saturn's rings at
//                   their real tilt; Jupiter's four moons as points.
//   lines           the 89 figures, and on request the Sun's path, the sky's equator and two grids
//                   with the sky's pole marked on them. Another people's figures instead of the
//                   western ones, the IAU borders and the constellation pictures come from
//                   sky/skyculture.js, imported when a visitor asks for one of them.
//   meteors         a shower's streaks at the rate this sky would show (sky/meteors.js, imported
//                   the first time a shower is active): illustrative, and off under reduced motion.
//   what is that    a tap names the nearest star, planet or deep-sky object in a small tag
//                   (whatAt, showTag); the tag, or a second tap, opens its card.
//   the deep sky    the 27 photographs of nebulae and galaxies (sky/groundpictures.js, imported
//                   when idle): at their true places and sizes, as faint as the sky makes them.
//   other light     the sky in infrared, microwaves or gamma rays (scene/otherlight.js, imported
//                   when a visitor picks a band): over the Milky Way, under the stars.
//   names           HTML over the canvas: figures, the brightest stars, the bodies, the pictures.
//                   ONE placement: the scene's own labels (ui/labels.js, a selected satellite) are
//                   placed first and every name here keeps clear of them (internal #393).
//
// WHAT IS MEASURED, COMPUTED, DRAWN. Star positions, magnitudes and colours are catalogue
// measurements. Planet positions, sizes, phases and the ring tilt are computed (Astronomy Engine).
// Refraction, extinction and the limiting magnitude are models of an average clear night
// (sky/skymath.js says which). Twinkling is drawn: it is the right kind of flicker in the right
// place, not a simulation of tonight's air. The figures are a convention. copy/en.js says so in
// one line under the controls.

import * as THREE from '../../vendor/three.module.min.js';
import * as Astronomy from '../../vendor/astronomy.js';
import { bvToKelvin, kelvinToRgb } from '../scene/starfield.js';
import { STAR_LIGHT_GLSL } from '../scene/stretch.js';
import { COPY, t } from '../copy/en.js';
import '../copy/en.later.js';
import {
  GLSL_AIR, DARKNESS, DEFAULT_DARKNESS, refractionDeg, airmass, extinctionTint, flattening,
  limitingMagnitude, fovName, pixelsPerDegree, bodyFieldDeg, FOV,
} from './skymath.js';
import { BODIES, bodyView, jupiterMoons, eqjToLocal, localOf, altAzOf } from './skybodies.js';
import { eclToEq, eclipticRing } from './figures.js';
import { GLSL_SKY, exposureFor, twilightFloor } from './skyair.js';
import { createLandscape, landscapeKind, sampleSea, seedOf, seaWords } from './landscape.js';
import { horizonGlowStrength } from './skyview.js';

const DEG = Math.PI / 180;
const EXT_K = 0.2;
const RO = { dome: -100, milkyway: -99, otherLight: -98.8, art: -98.6, pictures: -98.5, stars: -98, lines: -97, points: -96, discs: -95, meteors: -94, arc: 99 };
// The constellation pictures: how strong at night in a wide field, and the fields they fade out over.
const ART_GAIN = 0.42;
// The figures' lines: under the stars they join, not over them (internal #447; it was 0.34).
const FIGURE_LINE = 0.16;
const TAG_MS = 9000;
const LABEL_POOL = 44;
const BODY_REFRESH_MS = 1000; // of the clock; a tenth of that once the field is narrow
const LABEL_REFRESH_MS = 250; // of the wall clock: which names are shown, not where
const MILKY_WAY_GAIN = 0.5;

// What a body looks like before (or without) its map: one flat colour, and whether it shines.
const LOOK = {
  sun: { colour: [1.0, 0.96, 0.86], emissive: 1, limb: 0.55 },
  moon: { colour: [0.72, 0.71, 0.69], map: '2k_moon.webp', limb: 0 },
  mercury: { colour: [0.62, 0.6, 0.58], limb: 0 },
  venus: { colour: [0.96, 0.93, 0.84], limb: 0.2 },
  mars: { colour: [0.82, 0.48, 0.3], map: '2k_mars.webp', limb: 0.1 },
  jupiter: { colour: [0.84, 0.76, 0.66], map: '2k_jupiter.webp', limb: 0.45 },
  saturn: { colour: [0.88, 0.8, 0.62], map: '2k_saturn.webp', limb: 0.45, rings: true },
  uranus: { colour: [0.66, 0.86, 0.9], limb: 0.4 },
  neptune: { colour: [0.36, 0.5, 0.94], limb: 0.4 },
};
// A map is fetched only once its disc is this many pixels across: before that it is a dot.
const MAP_AT_PX = 10;

// ------------------------------------------------------------------------------------ shaders

const STAR_VERT = /* glsl */ `
attribute float aMag;
attribute vec3 aColour;
uniform mat3 uEqToLocal;
uniform float uLimit, uPx, uTime, uTwinkle, uExtK, uAir, uRadius, uBelow;
varying vec3 vColour;
varying float vAlpha;
varying float vGlare;
varying float vCore;
varying float vGlow;
${GLSL_AIR}
void main() {
  vec3 d = airLift(uEqToLocal * position, uAir);
  float x = airMass(d.y) - 1.0;
  // Seen through the ground (uBelow far down): no air to dim it, it is a mark of where it is.
  if (d.y < 0.0 && uBelow < -0.5) x = 1.5;
  float f = uLimit - (aMag + uExtK * x);
  float alpha = clamp((f + 0.6) / 1.8, 0.0, 1.0);
  float size = min(16.0, 2.4 * pow(1.42, max(f, 0.0)));
  float glare = clamp((f - 4.5) / 4.0, 0.0, 1.0);
  float ph = fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2832;
  float amp = uTwinkle * clamp(0.05 * x, 0.0, 0.5);
  alpha *= 1.0 + amp * sin(uTime * (7.0 + ph) + ph * 3.0) * sin(uTime * 3.1 + ph);
  vColour = aColour * vec3(1.0, exp(-0.045 * x), exp(-0.11 * x));
  vAlpha = alpha;
  vGlare = glare;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(d * uRadius, 1.0);
  // A STAR'S LIGHT (scene/stretch.js, public #271): the core is a peak at most 7 to 12 px across
  // (5 to 10 until the evening of 2026-10-08, when Rigel's core was 3 px beside 8 px marks)
  // however bright the star, and the brightness past that is a glow in the rest of the sprite.
  // Until 2026-10-08 the core grew with the sprite and Sirius was a flat white counter.
  float bright = clamp((size - 5.0) / 9.0, 0.0, 1.0);
  float spritePx = max(1.5, size * (1.0 + 0.9 * bright + 2.2 * glare) * uPx);
  float corePx = min(size, 7.0 + 5.0 * glare) * uPx;
  vCore = clamp(corePx / spritePx, 0.05, 1.0);
  vGlow = max(glare, bright);
  gl_PointSize = spritePx;
  // Under the horizon, or too faint to see: off the screen, so it costs no fragments.
  if (alpha <= 0.004 || d.y < uBelow) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const STAR_FRAG = /* glsl */ `
varying vec3 vColour;
varying float vAlpha;
varying float vGlare;
varying float vCore;
varying float vGlow;
${STAR_LIGHT_GLSL}
void main() {
  vec2 light = starLight(length(gl_PointCoord - 0.5), vCore, vGlow);
  float core = light.x;
  float a = (core + light.y) * vAlpha;
  if (a <= 0.002) discard;
  // A star is a light: its colour is a tint on white, not a paint (B-V of 1.5 is still mostly white to the eye).
  gl_FragColor = vec4(mix(vColour, vec3(1.0), 0.1 + core * 0.35 * vGlare), a);
  #include <colorspace_fragment>
}
`;

// The dome: sky/skyair.js's single scattering, summed at each vertex and shaded at each pixel, then
// the light that model lacks (the blue hour and the night's floor), the town's glow and the Moon's.
const DOME_VERT = /* glsl */ `
uniform vec3 uSun;
varying vec3 vDir;
varying vec3 vR;
varying vec3 vM;
${GLSL_SKY}
void main() {
  vDir = normalize(position);
  vec3 sumR;
  vec3 sumM;
  skyScatter(vDir, uSun, sumR, sumM);
  vR = sumR;
  vM = sumM;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const DOME_FRAG = /* glsl */ `
uniform vec3 uSun; uniform vec3 uMoonDir; uniform vec3 uFloorZ; uniform vec3 uFloorH;
uniform vec3 uPollution; uniform vec3 uMoonGlow;
uniform float uExposure; uniform float uHorizonGlow; uniform float uMoonBright;
varying vec3 vDir;
varying vec3 vR;
varying vec3 vM;
${GLSL_SKY}
void main() {
  vec3 d = normalize(vDir);
  float t = clamp(d.y, 0.0, 1.0);
  vec3 c = skyShade(vR, vM, dot(normalize(vec3(d.x, max(d.y, 0.0), d.z)), uSun), uExposure);
  c += mix(uFloorH, uFloorZ, pow(t, 0.5));
  // A town's light hugs the whole horizon; the Moon lifts the whole dome and most around itself.
  c = mix(c, uPollution, clamp(uHorizonGlow * pow(1.0 - t, 8.0), 0.0, 0.85));
  float toMoon = max(dot(d, normalize(uMoonDir)), 0.0);
  c = mix(c, uMoonGlow, uMoonBright * (0.05 + 0.06 * pow(toMoon, 6.0) + 0.1 * pow(toMoon, 300.0)));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}
`;

// Star trails: each bright star's last hour, as an hour's exposure would record it. The arc is the
// star's own place turned back about the sky's pole (aK of uSpan), then through the same air.
const TRAIL_VERT = /* glsl */ `
attribute float aMag;
attribute vec3 aColour;
attribute float aK;
uniform mat3 uEqToLocal;
uniform float uLimit, uSpan, uAir, uRadius, uExtK;
varying vec3 vColour;
varying float vAlpha;
${GLSL_AIR}
void main() {
  float a = aK * uSpan;
  float c = cos(a);
  float s = sin(a);
  vec3 p = vec3(position.x * c - position.y * s, position.x * s + position.y * c, position.z);
  vec3 d = airLift(uEqToLocal * p, uAir);
  float x = airMass(d.y) - 1.0;
  float f = uLimit - (aMag + uExtK * x);
  vAlpha = clamp((f + 0.6) / 2.2, 0.0, 1.0) * (0.3 + 0.5 * clamp(f / 5.0, 0.0, 1.0)) * (1.0 - 0.7 * aK);
  if (d.y < -0.03) vAlpha = 0.0;
  vColour = aColour * vec3(1.0, exp(-0.045 * x), exp(-0.11 * x));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(d * uRadius, 1.0);
}
`;
const TRAIL_FRAG = /* glsl */ `
varying vec3 vColour;
varying float vAlpha;
void main() {
  if (vAlpha <= 0.003) discard;
  gl_FragColor = vec4(vColour, vAlpha);
  #include <colorspace_fragment>
}
`;
/** How long an exposure the trails stand for, in hours, and how faint a star leaves one. */
export const TRAIL_HOURS = 1;
export const TRAIL_MAG = 4.6;
const TRAIL_STEPS = 12;

const LINE_VERT = /* glsl */ `
uniform mat3 uEqToLocal;
uniform float uUseEq, uAir, uRadius;
varying float vY;
${GLSL_AIR}
void main() {
  vec3 d = uUseEq > 0.5 ? airLift(uEqToLocal * position, uAir) : position;
  vY = d.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(d * uRadius, 1.0);
}
`;
const LINE_FRAG = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity;
varying float vY;
void main() {
  float a = uOpacity * smoothstep(-0.01, 0.04, vY);
  if (a <= 0.002) discard;
  gl_FragColor = vec4(uColour, a);
  #include <colorspace_fragment>
}
`;

const MW_VERT = /* glsl */ `
uniform mat3 uRot;
uniform float uRadius;
varying vec2 vUv;
varying float vY;
void main() {
  vUv = uv;
  vec3 d = uRot * position;
  vY = d.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(d * uRadius, 1.0);
}
`;
const MW_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uGain;
uniform vec2 uTexel;
varying vec2 vUv;
varying float vY;
void main() {
  vec3 c = texture2D(uMap, vUv).rgb;
  // THE 2k PANORAMA HAS THE STARS BAKED IN (internal #547, 2026-10-10): Sirius, Mirzam and the rest are
  // two or three texels of light, which at a 14 degree field are soft tilted squares beside the true
  // stars. A spike is cut to what its four neighbours three texels away say, plus a little (a plain
  // minimum of the five took the noise of the map with it and the whole faint glow went): what is
  // narrower than six texels and brighter than its surroundings by more than a hair is not the Milky
  // Way. uTexel is zero for the 4k map, which NASA made without the stars.
  if (uTexel.x > 0.0) {
    vec3 cl = texture2D(uMap, vUv - vec2(3.0 * uTexel.x, 0.0)).rgb;
    vec3 cr = texture2D(uMap, vUv + vec2(3.0 * uTexel.x, 0.0)).rgb;
    vec3 cu = texture2D(uMap, vUv + vec2(0.0, 3.0 * uTexel.y)).rgb;
    vec3 cd = texture2D(uMap, vUv - vec2(0.0, 3.0 * uTexel.y)).rgb;
    c = min(c, 0.25 * (cl + cr + cu + cd) + 0.015);
  }
  // The panorama's floor is a dim brown everywhere; only what stands above it is the Milky Way.
  c = max(c - 0.012, 0.0);
  // The air: nothing of it survives the last few degrees above the horizon.
  float air = smoothstep(0.0, 0.3, vY);
  gl_FragColor = vec4(c * uGain * air, 1.0);
  #include <colorspace_fragment>
}
`;

// One body as a sphere seen from far away, drawn on a square that faces the visitor. vP is the
// position on that square in body radii; the sphere's normal, the Sun's direction and the body's
// own axes are all in the square's frame (x right, y up, z towards the visitor).
const DISC_VERT = /* glsl */ `
uniform vec3 uCentre, uRight, uUp;
uniform float uHalf, uExtent, uSquash;
varying vec2 vP;
void main() {
  vP = position.xy * uExtent;
  vec3 p = uCentre + (uRight * position.x + uUp * position.y * uSquash) * uHalf;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;
const DISC_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uUseMap, uEmissive, uLimb, uRings, uOpacity, uCover, uGain;
uniform vec3 uColour, uSun, uTint;
uniform mat3 uBody; // columns: the body's x, y, z axes
varying vec2 vP;
const float PI = 3.141592653589793;
float ringDensity(float r) {
  // Saturn's main rings in Saturn radii: C, B, the Cassini division, A.
  float c = smoothstep(1.235, 1.26, r) * (1.0 - smoothstep(1.50, 1.53, r)) * 0.18;
  float b = smoothstep(1.50, 1.55, r) * (1.0 - smoothstep(1.93, 1.95, r)) * 0.95;
  float a = smoothstep(2.02, 2.04, r) * (1.0 - smoothstep(2.25, 2.27, r)) * 0.7;
  return c + b + a;
}
void main() {
  float r2 = dot(vP, vP);
  float px = fwidth(vP.x) * 1.5;
  vec3 col = vec3(0.0);
  float cover = 0.0;
  float zSphere = -1e9;
  if (r2 < 1.0) {
    float z = sqrt(1.0 - r2);
    zSphere = z;
    vec3 n = vec3(vP, z);
    vec3 albedo = uColour;
    if (uUseMap > 0.5) {
      vec3 nb = vec3(dot(uBody[0], n), dot(uBody[1], n), dot(uBody[2], n));
      vec2 uv = vec2(atan(nb.y, nb.x) / (2.0 * PI) + 0.5, asin(clamp(nb.z, -1.0, 1.0)) / PI + 0.5);
      albedo = texture2D(uMap, uv).rgb;
    }
    float lit = smoothstep(-0.02, 0.12, dot(n, uSun)) * mix(1.0, max(dot(n, uSun), 0.0), 0.6);
    float limb = 1.0 - uLimb * (1.0 - z);
    col = albedo * limb * mix(lit + 0.012, 1.0, uEmissive);
    cover = 1.0 - smoothstep(1.0 - px, 1.0, sqrt(r2));
  }
  if (uRings > 0.5) {
    vec3 n = uBody[2];
    float nz = abs(n.z) < 1e-4 ? 1e-4 : n.z;
    float z = -(vP.x * n.x + vP.y * n.y) / nz;
    vec3 q = vec3(vP, z);
    float dens = ringDensity(length(q));
    // Behind the globe, or in its shadow (the Sun is behind the planet as the ring sees it).
    if (z < zSphere) dens = 0.0;
    float along = dot(q, uSun);
    if (along < 0.0 && length(q - along * uSun) < 1.0) dens *= 0.08;
    vec3 ringCol = vec3(0.86, 0.8, 0.66) * (0.55 + 0.45 * smoothstep(1.5, 1.95, length(q)));
    col = mix(col, ringCol, dens);
    cover = max(cover, dens);
  }
  if (cover <= 0.002) discard;
  // Premultiplied: light is added, and what is behind is hidden only where uCover says (the Sun).
  gl_FragColor = vec4(col * uTint * uGain * cover * uOpacity, cover * uCover * uOpacity);
  #include <colorspace_fragment>
}
`;

// ------------------------------------------------------------------------------------ helpers

function radecDir(raDeg, decDeg) {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const c = Math.cos(dec);
  return [c * Math.cos(ra), c * Math.sin(ra), Math.sin(dec)];
}

function localFromAltAz(azDeg, altDeg) {
  const a = azDeg * DEG;
  const h = altDeg * DEG;
  const c = Math.cos(h);
  return [Math.sin(a) * c, Math.sin(h), -Math.cos(a) * c];
}

/** A true local direction lifted by refraction: what the eye sees. */
function lift(l) {
  const { altDeg, azDeg } = altAzOf(l);
  return localFromAltAz(azDeg, altDeg + refractionDeg(altDeg));
}

function starColour(bv, out, i) {
  // The black-body colour, whole (public #271): held 20 % towards white until 2026-10-08, and
  // then washed a quarter more in the shader, Antares and Spica were the same white.
  const rgb = kelvinToRgb(bvToKelvin(Number.isFinite(bv) ? bv : 0.6));
  _c.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
  out[i * 3] = _c.r;
  out[i * 3 + 1] = _c.g;
  out[i * 3 + 2] = _c.b;
}
const _c = new THREE.Color();

/** How many of an ascending magnitude list are at or under `mag`. */
/**
 * How many constellation pictures (the western figures) and deep-sky pictures the sky from the ground
 * keeps on the GPU at once, by the device's tier and the window (internal #447 / #345). A 512 to 768 px
 * picture with its mipmaps is 1.4 to 3 MiB: a tier-0 phone holds 4 of each (about 12 MiB at most), a
 * laptop 8 (24), a capable desktop 12 and 10 (36 and 30). A window narrower than 900 px never holds more
 * than 6, whatever its tier. Pure; an unknown tier is read as a laptop.
 */
export const GROUND_PICTURE_TIERS = [{ art: 4, pictures: 4 }, { art: 8, pictures: 8 }, { art: 12, pictures: 10 }];
export function groundPictureCaps(tier, width) {
  const t = Number(tier);
  const row = GROUND_PICTURE_TIERS[Number.isFinite(t) ? Math.min(2, Math.max(0, Math.trunc(t))) : 1];
  const narrow = Number.isFinite(width) && width < 900;
  return { art: narrow ? Math.min(6, row.art) : row.art, pictures: narrow ? Math.min(6, row.pictures) : row.pictures };
}

/**
 * The texel size (in uv) the Milky Way shader opens the panorama by, or [0, 0] for none. The 2k panorama of
 * Solar System Scope has the stars baked in (they show as soft squares in a narrow field); the 4k one
 * (NASA SVS Deep Star Maps 2020) was made without them. A map at most 2048 wide gets the opening.
 */
export function openingTexel(width, height) {
  const w = Number(width), h = Number(height);
  if (!(w > 0) || !(h > 0) || w > 2048) return [0, 0];
  return [1 / w, 1 / h];
}

export function countBrighter(mags, mag) {
  let lo = 0;
  let hi = mags.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (mags[mid] <= mag) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** data/stars.bin: ra, dec, mag, B-V as four floats a star. Returns arrays sorted by magnitude. */
export function parseNakedEye(buffer) {
  const f = new Float32Array(buffer);
  const n = Math.floor(f.length / 4);
  const rows = [];
  for (let i = 0; i < n; i += 1) rows.push({ dir: radecDir(f[i * 4], f[i * 4 + 1]), mag: f[i * 4 + 2], bv: f[i * 4 + 3] });
  return packStars(rows);
}

/**
 * data/stars3d.bin (scripts/build-stars3d.py): position in light-years on the ecliptic J2000 axes,
 * apparent magnitude, B-V. Only the direction is used here. `fainterThan` drops what the naked-eye
 * file already has, so no star is drawn twice.
 */
export function parseDeep(buffer, fainterThan = -Infinity) {
  const dv = new DataView(buffer);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'SR3D') throw new Error('stars3d.bin: not the file this was written for');
  const count = dv.getUint32(8, true);
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const o = 16 + i * 24;
    const mag = dv.getFloat32(o + 16, true);
    if (!(mag > fainterThan)) continue;
    const x = dv.getFloat32(o, true);
    const y = dv.getFloat32(o + 4, true);
    const z = dv.getFloat32(o + 8, true);
    const n = Math.hypot(x, y, z);
    if (!(n > 0)) continue;
    const ci = dv.getInt16(o + 20, true);
    rows.push({ dir: eclToEq([x / n, y / n, z / n]), mag, bv: ci === -32768 ? NaN : ci / 1000 });
  }
  return packStars(rows);
}

/**
 * data/skystars-1.bin and -2.bin (scripts/build-skystars.py): eight bytes a star, brightest first.
 * Right ascension and declination as 24-bit steps, magnitude in steps of 0.08 from -1.5, B-V in
 * steps of 0.02 from -0.5 (255 = not measured).
 */
export function parseSkyStars(buffer) {
  const dv = new DataView(buffer);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'SRSK' || dv.getUint16(6, true) !== 8) throw new Error('skystars: not the file this was written for');
  const count = dv.getUint32(8, true);
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const o = 16 + i * 8;
    const ra = (dv.getUint8(o) | (dv.getUint8(o + 1) << 8) | (dv.getUint8(o + 2) << 16)) / 16777216 * 360;
    const dec = (dv.getUint8(o + 3) | (dv.getUint8(o + 4) << 8) | (dv.getUint8(o + 5) << 16)) / 16777215 * 180 - 90;
    const bv = dv.getUint8(o + 7);
    rows.push({ dir: radecDir(ra, dec), mag: dv.getUint8(o + 6) / 12.5 - 1.5, bv: bv === 255 ? NaN : bv / 50 - 0.5 });
  }
  return packStars(rows);
}

function packStars(rows) {
  rows.sort((a, b) => a.mag - b.mag);
  const n = rows.length;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const mag = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const r = rows[i];
    pos[i * 3] = r.dir[0];
    pos[i * 3 + 1] = r.dir[1];
    pos[i * 3 + 2] = r.dir[2];
    mag[i] = r.mag;
    starColour(r.bv, col, i);
  }
  return { pos, col, mag, count: n };
}

function joinStars(a, b) {
  // Both are sorted and every star of b is fainter than every star of a, so the join is sorted.
  const n = a.count + b.count;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const mag = new Float32Array(n);
  pos.set(a.pos); pos.set(b.pos, a.count * 3);
  col.set(a.col); col.set(b.col, a.count * 3);
  mag.set(a.mag); mag.set(b.mag, a.count);
  return { pos, col, mag, count: n };
}

// ------------------------------------------------------------------------------------ the layer

export function createGroundSky(ctx, env) {
  const group = env.group;
  const R = env.radius;
  const observer = env.observer;
  const observerA = new Astronomy.Observer(observer.latDeg, observer.lonDeg, (observer.altKm || 0) * 1000);
  const here = import.meta.url;
  const url = (p) => new URL(p, here);
  const options = { figures: true, names: true, grid: false, starGrid: false, sunPath: false, equator: false, art: false, bounds: false, meteors: true, trails: false, seeThrough: false, lights: null, culture: 'western', darkness: DEFAULT_DARKNESS, ...(env.options || {}) };
  const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let disposed = false;
  const stats = { stars: 0, drawn: 0, limit: 0, bytes: 0, deep: false, tier: 0, labels: 0 };

  const root = new THREE.Group();
  root.name = 'ground-sky';
  group.add(root);

  const eqToLocal = new THREE.Matrix3();
  let m9 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

  // ---- the air and the land (sky/skyair.js, sky/landscape.js) -----------------------------------
  // Rings of the dome crowd towards the horizon, where the colour changes within a degree.
  const dome = (() => {
    const seg = 96;
    const alts = [-4, -1.5];
    for (let j = 0; j <= 38; j += 1) alts.push(90 * Math.pow(j / 38, 2.2));
    const pos = [];
    const idx = [];
    for (const alt of alts) for (let i = 0; i <= seg; i += 1) pos.push(...localFromAltAz((i / seg) * 360, alt).map((v) => v * R));
    for (let j = 0; j + 1 < alts.length; j += 1) {
      for (let i = 0; i < seg; i += 1) {
        const a = j * (seg + 1) + i;
        const b = a + seg + 1;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      vertexShader: DOME_VERT, fragmentShader: DOME_FRAG,
      uniforms: {
        uSun: { value: new THREE.Vector3(0, -1, 0) }, uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
        uFloorZ: { value: new THREE.Vector3() }, uFloorH: { value: new THREE.Vector3() },
        uPollution: { value: new THREE.Color(0x9a6a40) }, uMoonGlow: { value: new THREE.Color(0xaab6d8) },
        uExposure: { value: 0 }, uHorizonGlow: { value: 0 }, uMoonBright: { value: 0 },
      },
      // In the transparent pass although it is opaque: that pass is the one render orders sort, and
      // this must be drawn before the orbital scene's own sky is veiled by it.
      side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    }));
    mesh.name = 'ground-dome';
    mesh.frustumCulled = false;
    mesh.renderOrder = RO.dome;
    root.add(mesh);
    return mesh;
  })();
  const land = createLandscape({ root, radius: R * 0.99, glsl: GLSL_SKY });
  const landSeed = seedOf(observer.latDeg, observer.lonDeg);
  let sea = null;
  const HAZE = { city: 0.5, town: 0.38, dark: 0.26 };
  function updateAir(frame) {
    const sun = localFromAltAz(frame.sunAzDeg, frame.sunAltDeg);
    const exposure = exposureFor(frame.sunAltDeg);
    const floor = twilightFloor(frame.sunAltDeg);
    const glow = horizonGlowStrength(frame.sunAltDeg, options.darkness, options.lights);
    stats.glow = glow;
    const u = dome.material.uniforms;
    u.uSun.value.set(sun[0], sun[1], sun[2]);
    u.uExposure.value = exposure;
    u.uFloorZ.value.set(floor.zenith[0], floor.zenith[1], floor.zenith[2]);
    u.uFloorH.value.set(floor.horizon[0], floor.horizon[1], floor.horizon[2]);
    u.uHorizonGlow.value = glow;
    u.uMoonBright.value = frame.moonBright || 0;
    const moon = discs.get('moon');
    if (moon && moon.apparent) u.uMoonDir.value.set(moon.apparent.local[0], moon.apparent.local[1], moon.apparent.local[2]);
    const kind = landscapeKind({ darkness: options.darkness, sea });
    land.set(kind, landSeed, sea);
    const day = Math.max(0, Math.min(1, (frame.sunAltDeg + 8) / 14));
    land.update({ sun, exposure, floorHorizon: floor.horizon, day, glow, see: options.seeThrough ? 0.4 : 1, haze: (HAZE[options.darkness] || HAZE.dark) * (1 - 0.6 * day) });
    stats.landscape = kind;
    stats.sea = kind === 'coast' ? seaWords(sea) : -1;
  }

  // ---- stars -----------------------------------------------------------------------------------
  const starUniforms = {
    uEqToLocal: { value: eqToLocal },
    uLimit: { value: 6.5 },
    uPx: { value: 1 },
    uTime: { value: 0 },
    uTwinkle: { value: reducedMotion ? 0 : 1 },
    uExtK: { value: EXT_K },
    uAir: { value: 1 },
    uRadius: { value: R * 0.985 },
    uBelow: { value: -0.03 },
  };
  const pointMaterial = (uniforms) => new THREE.ShaderMaterial({
    vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, uniforms,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  let stars = null; // { points, mag }
  let nakedEye = null;
  function setStars(data) {
    if (disposed) return;
    if (stars) { stars.points.geometry.dispose(); root.remove(stars.points); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.pos, 3));
    geo.setAttribute('aColour', new THREE.BufferAttribute(data.col, 3));
    geo.setAttribute('aMag', new THREE.BufferAttribute(data.mag, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R * 2);
    const points = new THREE.Points(geo, stars ? stars.points.material : pointMaterial(starUniforms));
    points.name = 'ground-stars';
    points.frustumCulled = false;
    points.renderOrder = RO.stars;
    root.add(points);
    stars = { points, mag: data.mag };
    stats.stars = data.count;
  }

  async function fetchBytes(path) {
    const r = await fetch(String(url(path)));
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    const buf = await r.arrayBuffer();
    stats.bytes += buf.byteLength;
    return buf;
  }
  async function fetchJson(path) {
    const r = await fetch(String(url(path)));
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    const text = await r.text();
    stats.bytes += text.length;
    return JSON.parse(text);
  }

  // The faint stars, in two tiers (internal #392). Tier 1 is everything a dark sky shows before
  // any zoom; tier 2 the rest, asked for only when the limit reaches past what tier 1 holds.
  const tiers = [null, null];
  const tierAsked = [false, false];
  const TIER_FILES = ['../../data/skystars-1.bin', '../../data/skystars-2.bin'];
  function askTier(i) {
    if (tierAsked[i] || disposed || !nakedEye || (i === 1 && !tiers[0])) return;
    tierAsked[i] = true;
    fetchBytes(TIER_FILES[i]).then((buf) => {
      if (disposed) return;
      tiers[i] = parseSkyStars(buf);
      let all = joinStars(nakedEye, tiers[0]);
      if (tiers[1]) all = joinStars(all, tiers[1]);
      setStars(all);
      stats.deep = true;
      stats.tier = tiers[1] ? 2 : 1;
    }).catch((e) => { tierAsked[i] = false; console.warn('ground sky: the faint stars did not load', e); });
  }
  const tierFaintest = (i) => (tiers[i] ? tiers[i].mag[tiers[i].count - 1] : Infinity);

  // The stars HYG does not have, to magnitude 10.5 (sky/startiles.js): tiles asked for by where
  // the view looks, once the sky is deep enough to show one. Never on a data-saving connection.
  let starTiles = null;
  let starTilesAsked = false;
  function askStarTiles() {
    if (starTilesAsked || disposed || saving) return;
    starTilesAsked = true;
    import('./startiles.js').then((m) => {
      if (disposed) return;
      starTiles = m.createStarTiles({
        root, radius: R, renderOrder: RO.stars, material: () => pointMaterial(starUniforms), fetchBytes, colour: starColour,
        cap: typeof innerWidth === 'number' && innerWidth < 900 ? 24 : 60,
      });
    }).catch((e) => { starTilesAsked = false; console.warn('ground sky: the star tiles did not load', e); });
  }

  // Star trails (check 15): built the first time they are switched on, from the naked-eye file.
  let trails = null;
  function buildTrails() {
    if (trails || !nakedEye || disposed) return;
    const n = countBrighter(nakedEye.mag, TRAIL_MAG);
    const per = TRAIL_STEPS * 2;
    const pos = new Float32Array(n * per * 3);
    const col = new Float32Array(n * per * 3);
    const mag = new Float32Array(n * per);
    const k = new Float32Array(n * per);
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < per; j += 1) {
        const o = i * per + j;
        pos.set(nakedEye.pos.subarray(i * 3, i * 3 + 3), o * 3);
        col.set(nakedEye.col.subarray(i * 3, i * 3 + 3), o * 3);
        mag[o] = nakedEye.mag[i];
        k[o] = ((j >> 1) + (j & 1)) / TRAIL_STEPS;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColour', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aMag', new THREE.BufferAttribute(mag, 1));
    geo.setAttribute('aK', new THREE.BufferAttribute(k, 1));
    trails = new THREE.LineSegments(geo, new THREE.ShaderMaterial({
      vertexShader: TRAIL_VERT, fragmentShader: TRAIL_FRAG,
      uniforms: { uEqToLocal: { value: eqToLocal }, uLimit: starUniforms.uLimit, uSpan: { value: TRAIL_HOURS * 15 * DEG }, uAir: { value: 1 }, uRadius: { value: R * 0.984 }, uExtK: { value: EXT_K } },
      transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    trails.name = 'ground-trails';
    trails.frustumCulled = false;
    trails.renderOrder = RO.stars - 0.1;
    root.add(trails);
    stats.trails = n;
  }

  // Which constellation (sky/constellation.js): the one under the centre of the view is drawn
  // brighter and named first, and a tap's tag says which one it fell in.
  let conMod = null;
  const conNames = new Map();
  const conVerts = new Map();
  const hereCon = { id: null, obj: null };
  function showHere(id) {
    if (id === hereCon.id) return;
    if (hereCon.obj) { hereCon.obj.geometry.dispose(); hereCon.obj.material.dispose(); root.remove(hereCon.obj); hereCon.obj = null; }
    hereCon.id = id;
    const v = id ? conVerts.get(id) : null;
    if (v && v.length) hereCon.obj = lineObject('sky-figure-here', v, 0xe8ecf2, 0.4, true, RO.lines + 0.5);
  }

  // ---- lines -----------------------------------------------------------------------------------
  const lineMaterial = (colour, opacity, useEq) => new THREE.ShaderMaterial({
    vertexShader: LINE_VERT, fragmentShader: LINE_FRAG,
    uniforms: {
      uEqToLocal: { value: eqToLocal },
      uUseEq: { value: useEq ? 1 : 0 },
      uAir: { value: 1 },
      uRadius: { value: R * 0.98 },
      uColour: { value: new THREE.Color(colour) },
      uOpacity: { value: opacity },
    },
    transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
  });
  function lineObject(name, verts, colour, opacity, useEq, order = RO.lines) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const obj = new THREE.LineSegments(geo, lineMaterial(colour, opacity, useEq));
    obj.name = name;
    obj.frustumCulled = false;
    obj.renderOrder = order;
    obj.userData.opacity = opacity;
    root.add(obj);
    return obj;
  }
  const ringVerts = (fn, n) => {
    const v = [];
    for (let i = 0; i < n; i += 1) { v.push(...fn(i / n), ...fn((i + 1) / n)); }
    return v;
  };
  const lines = {};
  // The Sun's path: the ecliptic, in the catalogue's frame. sky/figures.js has the ring.
  lines.sunPath = lineObject('sky-sun-path', (() => {
    const pts = eclipticRing(180);
    const v = [];
    for (let i = 0; i < pts.length; i += 1) v.push(...pts[i], ...pts[(i + 1) % pts.length]);
    return v;
  })(), 0xffc98a, 0.5, true);
  lines.equator = lineObject('sky-equator', ringVerts((k) => radecDir(k * 360, 0), 180), 0x6ec3ff, 0.45, true);
  lines.starGrid = lineObject('sky-star-grid', (() => {
    const v = [];
    for (let ra = 0; ra < 360; ra += 30) for (let d = -80; d < 80; d += 4) v.push(...radecDir(ra, d), ...radecDir(ra, d + 4));
    for (let dec = -60; dec <= 60; dec += 30) { if (dec === 0) continue; v.push(...ringVerts((k) => radecDir(k * 360, dec), 120)); }
    return v;
  })(), 0x6ec3ff, 0.2, true);
  lines.grid = lineObject('sky-grid', (() => {
    const v = [];
    for (let az = 0; az < 360; az += 30) for (let h = 0; h < 88; h += 4) v.push(...localFromAltAz(az, h), ...localFromAltAz(az, Math.min(88, h + 4)));
    for (let alt = 15; alt <= 75; alt += 15) v.push(...ringVerts((k) => localFromAltAz(k * 360, alt), 120));
    return v;
  })(), 0x9aa4b2, 0.22, false);
  // The north-south line overhead, part of the grid: where everything is highest.
  lines.meridian = lineObject('sky-meridian', (() => {
    const v = [];
    for (let h = 0; h < 180; h += 3) {
      const a = h <= 90 ? [180, h] : [0, 180 - h];
      const b = h + 3 <= 90 ? [180, h + 3] : [0, 180 - (h + 3)];
      v.push(...localFromAltAz(a[0], a[1]), ...localFromAltAz(b[0], b[1]));
    }
    return v;
  })(), 0x9aa4b2, 0.4, false);
  // The pole of the sky, on either grid (internal #356): a small cross where the sky turns, as
  // high as the place's latitude, due north (or due south, below the equator). Of date, not J2000.
  const poleAlt = Math.abs(observer.latDeg) + refractionDeg(Math.abs(observer.latDeg));
  const poleAz = observer.latDeg >= 0 ? 0 : 180;
  const poleLocal = localFromAltAz(poleAz, poleAlt);
  lines.pole = lineObject('sky-pole', (() => {
    const arm = 0.5;
    const wide = arm / Math.max(0.05, Math.cos(poleAlt * DEG));
    return [
      ...localFromAltAz(poleAz - wide, poleAlt), ...localFromAltAz(poleAz + wide, poleAlt),
      ...localFromAltAz(poleAz, poleAlt - arm), ...localFromAltAz(poleAz, Math.min(89.9, poleAlt + arm)),
    ];
  })(), 0xe8ecf2, 0.7, false);
  let arc = null;

  // ---- another people's figures, the borders, the pictures (sky/skyculture.js) -------------------
  // `western` is filled by the first data below; every other culture is a file fetched when chosen.
  const cultures = new Map([['western', { obj: null, names: [] }]]);
  const cultureAsked = new Set(['western']);
  let cultureShown = 'western';
  let cultureMod = null;
  let cultureModAsked = null;
  const withCulture = () => {
    if (!cultureModAsked) cultureModAsked = import('./skyculture.js').then((m) => { cultureMod = m; return m; });
    return cultureModAsked;
  };
  function askCulture(id) {
    if (cultureAsked.has(id) || disposed || !/^[a-z]{2,24}$/.test(id)) return;
    cultureAsked.add(id);
    Promise.all([withCulture(), fetchJson(`../../data/skycultures/${id}.json`)]).then(([m, doc]) => {
      if (disposed) return;
      const f = m.cultureFigures(doc);
      cultures.set(id, { obj: lineObject(`sky-figures-${id}`, f.verts, 0x9aa4b2, FIGURE_LINE, true), names: f.names });
      labels.at = -Infinity;
    }).catch((e) => { cultureAsked.delete(id); cultureModAsked = cultureMod ? cultureModAsked : null; console.warn('ground sky: that sky culture did not load', e); });
  }
  let boundsAsked = false;
  function askBounds() {
    if (boundsAsked || disposed) return;
    boundsAsked = true;
    Promise.all([withCulture(), fetchBytes('../../data/constellation-bounds.bin')]).then(([m, buf]) => {
      if (disposed) return;
      // Quiet: the moon-glow blue at a fifth, under the figures it fences.
      lines.bounds = lineObject('sky-bounds', m.parseBounds(buf), 0xaab6d8, 0.2, true);
    }).catch((e) => { boundsAsked = false; cultureModAsked = cultureMod ? cultureModAsked : null; console.warn('ground sky: the borders did not load', e); });
  }
  let art = null;
  let artAsked = false;
  function askArt() {
    if (artAsked || disposed || typeof document === 'undefined') return;
    artAsked = true;
    withCulture().then((m) => {
      if (disposed) return;
      // A phone holds fewer: a 512 px picture with its mipmaps is 1.4 MiB of GPU memory.
      art = m.createSkyArt({ root, radius: R * 0.987, eqToLocal, renderOrder: RO.art, cap: groundPictureCaps(ctx.quality && ctx.quality.tier, typeof innerWidth === 'number' ? innerWidth : NaN).art });
    }).catch((e) => { artAsked = false; cultureModAsked = null; console.warn('ground sky: the constellation pictures did not load', e); });
  }

  // ---- meteors (sky/meteors.js): only once a shower is active, never under reduced motion --------
  let meteors = null;
  let meteorsMod = null;
  let meteorsAsked = false;
  let sources = [];
  let sourcesAt = -Infinity;
  function askMeteors() {
    if (meteorsAsked || disposed || reducedMotion || typeof document === 'undefined') return;
    meteorsAsked = true;
    import('./meteors.js').then((m) => {
      if (disposed) return;
      meteorsMod = m;
      meteors = m.createMeteors({ root, radius: R * 0.972, renderOrder: RO.meteors });
    }).catch((e) => { meteorsAsked = false; console.warn('ground sky: the meteors did not load', e); });
  }

  // ---- the Milky Way ----------------------------------------------------------------------------
  let milkyWay = null;
  const galBasis = new THREE.Matrix3();
  {
    const gc = new THREE.Vector3(...radecDir(266.405, -28.936)); // galactic centre
    const pole = new THREE.Vector3(...radecDir(192.85948, 27.12825)); // galactic north pole
    const x = gc.clone().addScaledVector(pole, -gc.dot(pole)).normalize();
    const south = pole.clone().negate(); // the panorama's top is galactic south (scene/starfield.js)
    const z = new THREE.Vector3().crossVectors(x, south).normalize();
    galBasis.set(x.x, south.x, z.x, x.y, south.y, z.y, x.z, south.z, z.z);
  }
  function buildMilkyWay() {
    const map = ctx.starfield && ctx.starfield.state && ctx.starfield.state.milkyway && ctx.starfield.state.milkyway.material && ctx.starfield.state.milkyway.material.map;
    if (!map || milkyWay || disposed) return;
    const mat = new THREE.ShaderMaterial({
      vertexShader: MW_VERT, fragmentShader: MW_FRAG,
      uniforms: { uMap: { value: map }, uGain: { value: 0 }, uTexel: { value: new THREE.Vector2(0, 0) }, uRot: { value: new THREE.Matrix3() }, uRadius: { value: R * 0.99 } },
      side: THREE.BackSide, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    milkyWay = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
    milkyWay.name = 'ground-milkyway';
    milkyWay.frustumCulled = false;
    milkyWay.renderOrder = RO.milkyway;
    root.add(milkyWay);
  }

  // ---- the bodies -------------------------------------------------------------------------------
  const bodyUniforms = { ...starUniforms, uTwinkle: { value: 0 }, uEqToLocal: { value: eqToLocal }, uBelow: { value: -0.03 } };
  const POINTS = BODIES.length + 4; // seven planets (the Sun and the Moon are never points) and four moons
  const bodyGeo = new THREE.BufferGeometry();
  bodyGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(POINTS * 3), 3));
  bodyGeo.setAttribute('aColour', new THREE.BufferAttribute(new Float32Array(POINTS * 3).fill(1), 3));
  bodyGeo.setAttribute('aMag', new THREE.BufferAttribute(new Float32Array(POINTS).fill(99), 1));
  const bodyPoints = new THREE.Points(bodyGeo, pointMaterial(bodyUniforms));
  bodyPoints.name = 'ground-bodies';
  bodyPoints.frustumCulled = false;
  bodyPoints.renderOrder = RO.points;
  root.add(bodyPoints);

  const loader = typeof document !== 'undefined' ? new THREE.TextureLoader() : null;
  const discs = new Map();
  const quad = new THREE.PlaneGeometry(2, 2);
  for (const b of BODIES) {
    const look = LOOK[b.id];
    const mat = new THREE.ShaderMaterial({
      vertexShader: DISC_VERT, fragmentShader: DISC_FRAG,
      uniforms: {
        uCentre: { value: new THREE.Vector3() }, uRight: { value: new THREE.Vector3(1, 0, 0) }, uUp: { value: new THREE.Vector3(0, 1, 0) },
        uHalf: { value: 0 }, uExtent: { value: look.rings ? 2.4 : 1.08 }, uSquash: { value: 1 },
        uMap: { value: null }, uUseMap: { value: 0 }, uEmissive: { value: look.emissive || 0 }, uLimb: { value: look.limb || 0 },
        uRings: { value: look.rings ? 1 : 0 }, uOpacity: { value: 1 }, uCover: { value: 1 }, uGain: { value: 1 },
        uColour: { value: new THREE.Color().setRGB(look.colour[0], look.colour[1], look.colour[2], THREE.SRGBColorSpace) },
        uSun: { value: new THREE.Vector3(0, 0, 1) }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uBody: { value: new THREE.Matrix3() },
      },
      transparent: true, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const mesh = new THREE.Mesh(quad, mat);
    mesh.name = `ground-${b.id}`;
    mesh.frustumCulled = false;
    mesh.renderOrder = RO.discs + (b.id === 'sun' ? 0 : 0.1);
    mesh.visible = false;
    root.add(mesh);
    discs.set(b.id, { mesh, look, mapAsked: false, view: null, apparent: null, diameterPx: 0 });
  }
  let bodiesAt = -Infinity;
  let moons = [];

  function solveBodies(tMs, fovDeg) {
    const every = fovDeg < 5 ? BODY_REFRESH_MS / 10 : BODY_REFRESH_MS;
    if (Math.abs(tMs - bodiesAt) < every) return;
    bodiesAt = tMs;
    const date = new Date(tMs);
    for (const b of BODIES) {
      const d = discs.get(b.id);
      d.view = bodyView(b.id, date, observerA);
    }
    moons = jupiterMoons(date, observerA);
  }

  const _f = new THREE.Vector3();
  const _x = new THREE.Vector3();
  const _y = new THREE.Vector3();
  const _z = new THREE.Vector3();
  const _v = new THREE.Vector3();
  const _bx = new THREE.Vector3();
  const _by = new THREE.Vector3();
  const _bz = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const toSquare = (v3, out) => out.set(v3.dot(_x), v3.dot(_y), v3.dot(_z));

  function placeBodies(frame, pxPerDeg) {
    const pos = bodyGeo.attributes.position;
    const mag = bodyGeo.attributes.aMag;
    const col = bodyGeo.attributes.aColour;
    let i = 0;
    for (const b of BODIES) {
      const d = discs.get(b.id);
      const view = d.view;
      const u = d.mesh.material.uniforms;
      if (!view) { d.mesh.visible = false; d.apparent = null; if (b.id !== 'sun' && b.id !== 'moon') { mag.array[i] = 99; i += 1; } continue; }
      const trueLocal = localOf(m9, view.dir);
      const aa = altAzOf(trueLocal);
      const altApp = aa.altDeg + refractionDeg(aa.altDeg);
      const l = localFromAltAz(aa.azDeg, altApp);
      d.apparent = { azDeg: aa.azDeg, altDeg: altApp, local: l };
      d.diameterPx = view.diameterDeg * pxPerDeg;
      const isLight = b.id === 'sun' || b.id === 'moon';
      // The point: a planet's, until its disc is wide enough to take over.
      if (!isLight) {
        pos.array[i * 3] = view.dir[0]; pos.array[i * 3 + 1] = view.dir[1]; pos.array[i * 3 + 2] = view.dir[2];
        const fade = Math.max(0, Math.min(1, (d.diameterPx - 3) / 5));
        mag.array[i] = view.mag + fade * 25;
        col.array[i * 3] = d.look.colour[0]; col.array[i * 3 + 1] = d.look.colour[1]; col.array[i * 3 + 2] = d.look.colour[2];
        i += 1;
      }
      // The disc. The Sun and the Moon are always one; a planet from two pixels up.
      const minPx = isLight ? 0 : 2;
      const show = (altApp > -1.5 || !!options.seeThrough) && d.diameterPx >= minPx;
      d.mesh.visible = show;
      if (!show) continue;
      _f.set(l[0], l[1], l[2]);
      _z.copy(_f).negate();
      _y.copy(UP).addScaledVector(_f, -UP.dot(_f)).normalize();
      _x.crossVectors(_y, _z).normalize();
      // Never thinner than a pixel and a half: the Moon in a wide field is still a visible Moon.
      const radiusDeg = Math.max(view.diameterDeg / 2, isLight ? 0.75 / pxPerDeg : 0);
      u.uCentre.value.copy(_f).multiplyScalar(R * 0.975);
      u.uRight.value.copy(_x);
      u.uUp.value.copy(_y);
      u.uHalf.value = R * 0.975 * Math.tan(radiusDeg * DEG) * u.uExtent.value;
      u.uSquash.value = flattening(aa.altDeg);
      toSquare(_v.set(...localOf(m9, view.toSun)), u.uSun.value).normalize();
      const fr = view.frame;
      const bx = toSquare(_v.set(...localOf(m9, fr.x)), _bx);
      const by = toSquare(_v.set(...localOf(m9, fr.y)), _by);
      const bz = toSquare(_v.set(...localOf(m9, fr.z)), _bz);
      u.uBody.value.set(bx.x, by.x, bz.x, bx.y, by.y, bz.y, bx.z, by.z, bz.z);
      const tint = extinctionTint(Math.max(0, altApp));
      const dim = Math.pow(10, -0.4 * EXT_K * (airmass(Math.max(0, altApp)) - 1));
      u.uTint.value.set(tint[0], tint[1], tint[2]);
      // The Sun through 38 air masses is a dull red ball you can look at; the model's dimming is
      // kept gentle for it so it does not vanish before it sets.
      u.uGain.value = b.id === 'sun' ? 0.55 + 0.45 * Math.sqrt(dim) : 0.35 + 0.65 * dim;
      u.uOpacity.value = isLight ? 1 : Math.max(0, Math.min(1, (d.diameterPx - 2) / 3));
      // Light is added to the sky. Only the Sun hides what is behind it: the unlit part of the
      // Moon is the colour of the sky it stands in, by day and by moonlight alike.
      u.uCover.value = b.id === 'sun' ? 1 : 0;
      if (!d.mapAsked && d.look.map && loader && d.diameterPx >= MAP_AT_PX) {
        d.mapAsked = true;
        loader.load(String(url(`../../textures/${d.look.map}`)), (tex) => {
          if (disposed) { tex.dispose(); return; }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
          u.uMap.value = tex;
          u.uUseMap.value = 1;
        }, undefined, () => { d.mapAsked = false; });
      }
    }
    // Jupiter's moons: points beside the disc, shown from the moment the field could split them.
    const jup = discs.get('jupiter');
    for (const m of moons) {
      pos.array[i * 3] = m.dir[0]; pos.array[i * 3 + 1] = m.dir[1]; pos.array[i * 3 + 2] = m.dir[2];
      const splitPx = jup && jup.view ? m.offsetRadii * (jup.diameterPx / 2) : 0;
      mag.array[i] = m.hidden || splitPx < 5 ? 99 : m.mag;
      col.array[i * 3] = 1; col.array[i * 3 + 1] = 0.97; col.array[i * 3 + 2] = 0.9;
      i += 1;
    }
    for (; i < POINTS; i += 1) mag.array[i] = 99;
    pos.needsUpdate = true;
    mag.needsUpdate = true;
    col.needsUpdate = true;
  }

  // ---- the deep sky: photographs (sky/groundpictures.js) ----------------------------------------
  const saving = typeof navigator !== 'undefined' && !!(navigator.connection && navigator.connection.saveData);
  let pictures = null;
  let picturesAsked = false;
  let lastPxPerDeg = 10;
  let lastFov = FOV.eye;
  const dsoRecords = new Map();
  /** The deep-sky record of a picture, once the layer's records have landed (they do, on or off). */
  function dsoRecord(id) {
    if (dsoRecords.has(id)) return dsoRecords.get(id);
    const list = typeof ctx.recordsFor === 'function' ? ctx.recordsFor('deep-sky') : [];
    if (!list || !list.length) return null;
    for (const r of list) if (r && typeof r.id === 'string') dsoRecords.set(r.id.slice(4), r);
    return dsoRecords.get(id) || null;
  }
  const plainName = (id) => (/^(m|ngc|ic)\d+$/.test(id) ? id.replace(/^([a-z]+)(\d+)$/, (_, a, b) => `${a.toUpperCase()} ${b}`) : id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
  function askPictures() {
    if (picturesAsked || disposed || typeof document === 'undefined') return;
    picturesAsked = true;
    import('./groundpictures.js').then((m) => {
      if (disposed) return;
      pictures = m.createGroundPictures({
        root, radius: R * 0.986, eqToLocal, renderOrder: RO.pictures, saveData: saving,
        // A phone holds fewer: 27 pictures at 512 to 768 px would be 40 MiB of GPU memory (#345).
        cap: groundPictureCaps(ctx.quality && ctx.quality.tier, typeof innerWidth === 'number' ? innerWidth : NaN).pictures,
        exposure: () => (ctx.exposure && typeof ctx.exposure.look === 'function' ? ctx.exposure.look() : null),
        nameOf: (id) => { const r = dsoRecord(id); return (r && r.name) || plainName(id); },
        magOf: (id) => { const r = dsoRecord(id); return r && r.meta && Number.isFinite(r.meta.mag) ? r.meta.mag : NaN; },
      });
      labels.at = -Infinity;
    }).catch((e) => { picturesAsked = false; console.warn('ground sky: the deep-sky pictures did not load', e); });
  }

  // ---- other light (scene/otherlight.js): only once a visitor has picked a band ------------------
  let other = null;
  let otherAsked = false;
  const _look = new THREE.Vector3();
  const _inv = new THREE.Quaternion();
  /** Where the camera looks, as a J2000 direction (the air's lift is ignored: it is under a degree). */
  function lookEq(camera, ndcX = 0, ndcY = 0) {
    if (ndcX === 0 && ndcY === 0) camera.getWorldDirection(_look);
    else _look.set(ndcX, ndcY, 0.5).unproject(camera).sub(camera.position).normalize();
    _look.applyQuaternion(_inv.copy(group.quaternion).invert());
    // m9 is a rotation: its transpose takes the ground's frame back to the catalogue's.
    return [
      m9[0] * _look.x + m9[3] * _look.y + m9[6] * _look.z,
      m9[1] * _look.x + m9[4] * _look.y + m9[7] * _look.z,
      m9[2] * _look.x + m9[5] * _look.y + m9[8] * _look.z,
    ];
  }
  function updateOtherLight(frame, w, h) {
    const ol = ctx.otherLight;
    if (!ol) return;
    if (ol.band && !other && !otherAsked) {
      otherAsked = true;
      import('../scene/otherlight.js').then((m) => {
        if (disposed) return;
        other = m.createOtherLight({ parent: root, rot: eqToLocal, radius: R * 0.988, ground: true, transparent: true, renderOrder: RO.otherLight, saveData: saving });
      }).catch((e) => { otherAsked = false; console.warn('ground sky: the other-light layer did not load', e); });
    }
    if (!other) return;
    other.set(ol.band);
    other.setMix(ol.mix);
    other.update({ dirEq: lookEq(frame.camera), fovDeg: frame.fovDeg, heightPx: h, aspect: w / Math.max(1, h) });
  }

  // ---- names ------------------------------------------------------------------------------------
  const labels = { host: null, pool: [], fov: null, mark: null, eyepiece: null, cands: [], at: -Infinity, markUntil: 0, markDir: null };
  const tag = { node: null, name: null, sub: null, what: null, dir: null, until: 0, onOpen: null };
  let starNames = [];
  const passMarks = [];
  if (typeof document !== 'undefined') {
    const host = document.createElement('div');
    host.className = 'sr-skylabels';
    host.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < LABEL_POOL; i += 1) {
      const s = document.createElement('span');
      s.className = 'sr-skylabel';
      s.hidden = true;
      host.appendChild(s);
      labels.pool.push({ node: s, text: '', kind: '' });
    }
    labels.fov = document.createElement('div');
    labels.fov.className = 'sr-skyfov sr-num';
    host.appendChild(labels.fov);
    labels.mark = document.createElement('div');
    labels.mark.className = 'sr-skymark';
    labels.mark.hidden = true;
    host.appendChild(labels.mark);
    // The eyepiece (internal #351): at a telescope's field the sky is seen through a round stop.
    labels.eyepiece = document.createElement('div');
    labels.eyepiece.className = 'sr-skyeyepiece';
    labels.eyepiece.hidden = true;
    host.insertBefore(labels.eyepiece, host.firstChild);
    // "What is that": a real button, so it is outside the labels' aria-hidden layer.
    tag.node = document.createElement('button');
    tag.node.type = 'button';
    tag.node.className = 'sr-skytag sr-float';
    tag.node.hidden = true;
    tag.name = document.createElement('span');
    tag.name.className = 'sr-skytag__name';
    tag.sub = document.createElement('span');
    tag.sub.className = 'sr-skytag__sub sr-num';
    tag.node.append(tag.name, tag.sub);
    tag.node.addEventListener('click', () => { const open = tag.onOpen; if (open) open(tag.what); });
    // In the scene labels' own layer (index.html #labels), so the panels, the veil and H treat them alike.
    (document.getElementById('labels') || document.body).appendChild(host);
    labels.host = host;
    // Beside the labels' layer, not in it: that layer takes no pointer and is hidden from a reader.
    (host.parentNode && host.parentNode.parentNode ? host.parentNode.parentNode : document.body).appendChild(tag.node);
  }

  const _w = new THREE.Vector3();
  const _fwd = new THREE.Vector3();
  /** A local direction (already as the eye sees it) to screen pixels, or null when out of view. */
  function toScreen(l, camera, w, h) {
    _w.set(l[0], l[1], l[2]).applyQuaternion(group.quaternion);
    if (_w.dot(_fwd) <= 0.05) return null;
    _w.multiplyScalar(R).add(camera.position).project(camera);
    if (_w.x < -1.05 || _w.x > 1.05 || _w.y < -1.05 || _w.y > 1.05) return null;
    return { x: (_w.x * 0.5 + 0.5) * w, y: (-_w.y * 0.5 + 0.5) * h };
  }

  function starNameLimit(fovDeg) {
    if (fovDeg >= 90) return 1.2;
    if (fovDeg >= 50) return 1.8;
    if (fovDeg >= 25) return 2.8;
    if (fovDeg >= 8) return 4.2;
    return 6.5;
  }

  /** Which names are candidates now: bodies first, then stars by brightness, then the figures. */
  function gatherLabels(frame) {
    const out = [];
    const limit = starUniforms.uLimit.value;
    const B = COPY.sky.bodies || {};
    for (const b of BODIES) {
      const d = discs.get(b.id);
      if (!d.view || !d.apparent || (d.apparent.altDeg < 0.3 && !options.seeThrough)) continue;
      if (b.id !== 'sun' && b.id !== 'moon' && d.view.mag > limit + 0.3 && d.diameterPx < 3) continue;
      const off = Math.max(8, d.diameterPx / 2 * (d.look.rings ? 2.3 : 1) + 6);
      out.push({ kind: 'body', text: B[b.id] || b.body, local: d.apparent.local, pri: 1000 - d.view.mag, dy: off });
    }
    for (const m of passMarks) out.push({ kind: 'pass', text: m.text, local: localFromAltAz(m.azDeg, m.altDeg + refractionDeg(m.altDeg)), pri: 900, dy: 10 });
    if (options.names) {
      const nameLimit = Math.min(starNameLimit(frame.fovDeg), limit - 0.5);
      for (const s of starNames) {
        if (s.mag > nameLimit) break;
        const l = localOf(m9, s.dir);
        if (l[1] < 0.03) continue;
        out.push({ kind: 'star', text: s.name, local: lift(l), pri: 500 - s.mag * 10, dy: 9 });
      }
      if (pictures) pictures.labels(out, limit, lastPxPerDeg);
      if (frame.fovDeg >= 8) {
        for (const c of (cultures.get(cultureShown) || cultures.get('western')).names) {
          // The constellation the view is centred in is named first, and brighter, at any field.
          const isHere = cultureShown === 'western' && c.id && c.id === hereCon.id;
          if (!isHere && frame.fovDeg < 20) continue;
          const l = localOf(m9, c.dir);
          if (l[1] < 0.1) continue;
          out.push({ kind: isHere ? 'con sr-skylabel--here' : 'con', text: c.name, local: l, pri: isHere ? 650 : 100, dy: 0 });
        }
      }
    }
    // Where the view is centred, for the figure drawn brighter (frame.camera is this frame's).
    const centre = conMod ? conMod.constellationAt(lookEq(frame.camera)) : null;
    stats.con = centre;
    showHere(options.figures && cultureShown === 'western' ? centre : null);
    const L = COPY.sky.lines || {};
    const lineLabel = (on, text, ring) => {
      if (!on || !text) return;
      // Named once, where the line is 12 degrees up on the side it rises.
      let best = null;
      for (const p of ring) {
        const l = localOf(m9, p);
        const alt = Math.asin(l[1]) / DEG;
        if (l[0] <= 0 || alt < 4) continue;
        if (!best || Math.abs(alt - 12) < best.err) best = { err: Math.abs(alt - 12), l };
      }
      if (best) out.push({ kind: 'line', text, local: best.l, pri: 300, dy: 10 });
    };
    if ((options.grid || options.starGrid) && L.poleNorth) out.push({ kind: 'line', text: observer.latDeg >= 0 ? L.poleNorth : L.poleSouth, local: poleLocal, pri: 520, dy: -30 });
    lineLabel(options.sunPath, L.sunPath, eclRing);
    lineLabel(options.equator, L.equator, eqRing);
    labels.cands = out.sort((a, b) => b.pri - a.pri);
  }
  const eclRing = eclipticRing(72);
  const eqRing = Array.from({ length: 72 }, (_, i) => radecDir(i * 5, 0));

  function paintLabels(frame, w, h) {
    if (!labels.host) return;
    const camera = frame.camera;
    camera.getWorldDirection(_fwd);
    const now = performance.now();
    if (now - labels.at > LABEL_REFRESH_MS) { labels.at = now; gatherLabels(frame); }
    // The field-of-view line has its place first; no name is drawn under it.
    const fovTop = labels.fov.offsetTop || 24;
    const placed = [{ x0: w / 2 - 110, x1: w / 2 + 110, y0: fovTop - 8, y1: fovTop + 26 }];
    // The scene's own names (ui/labels.js: the selection, a station) were placed before these and
    // keep their place; a figure's or a star's name gives way (internal #393 finding 2).
    const theirs = ctx.labels && typeof ctx.labels.boxes === 'function' ? ctx.labels.boxes() : [];
    for (const b of theirs) placed.push({ x0: b.left - 4, x1: b.right + 4, y0: b.top - 2, y1: b.bottom + 2 });
    const reserved = placed.length;
    const cap = (w < 600 ? 16 : 30) + reserved - 1;
    let slot = 0;
    for (const c of labels.cands) {
      if (slot >= labels.pool.length || placed.length >= cap) break;
      const p = toScreen(c.local, camera, w, h);
      if (!p) continue;
      const tw = c.text.length * (c.kind.startsWith('con') ? 8.2 : 7.2) + 8;
      const box = { x0: p.x - tw / 2, x1: p.x + tw / 2, y0: p.y + c.dy - 2, y1: p.y + c.dy + 18 };
      if (box.x0 < 4 || box.x1 > w - 4 || box.y1 > h - 4 || box.y0 < 4) continue;
      let clash = false;
      for (const q of placed) { if (box.x0 < q.x1 && box.x1 > q.x0 && box.y0 < q.y1 && box.y1 > q.y0) { clash = true; break; } }
      if (clash) continue;
      placed.push(box);
      const s = labels.pool[slot];
      slot += 1;
      if (s.text !== c.text) { s.node.textContent = c.text; s.text = c.text; }
      if (s.kind !== c.kind) { s.node.className = `sr-skylabel sr-skylabel--${c.kind}`; s.kind = c.kind; }
      s.node.hidden = false;
      s.node.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y + c.dy)}px) translateX(-50%)`;
    }
    for (; slot < labels.pool.length; slot += 1) if (!labels.pool[slot].node.hidden) labels.pool[slot].node.hidden = true;
    stats.labels = placed.length - reserved;

    // The field of view, one mono line: the number is the hero (docs/ui-guide.md principle 4).
    const F = COPY.sky.fov || {};
    const field = fovName(frame.fovDeg);
    const name = (F.names || {})[field] || '';
    // Through a telescope the field is the round one an eyepiece shows: a circle nine tenths of
    // the screen's short side, and the number is the width of that circle, not of the screen.
    const eyepiece = field === 'telescope';
    const stopPx = Math.round(0.9 * Math.min(w, h));
    const shownDeg = eyepiece ? frame.fovDeg * stopPx / h : frame.fovDeg;
    const text = shownDeg >= 1
      ? t(F.degrees || '{deg}°', { deg: shownDeg >= 10 ? Math.round(shownDeg) : shownDeg.toFixed(1), name })
      : t(F.arcmin || '{min}′', { min: Math.round(shownDeg * 60), name });
    if (labels.fov.textContent !== text) labels.fov.textContent = text;
    if (labels.eyepiece.hidden === eyepiece) labels.eyepiece.hidden = !eyepiece;
    if (eyepiece && labels.eyepiece.dataset.px !== String(stopPx)) {
      labels.eyepiece.dataset.px = String(stopPx);
      labels.eyepiece.style.width = `${stopPx}px`;
      labels.eyepiece.style.height = `${stopPx}px`;
    }
    stats.eyepiece = eyepiece ? shownDeg : 0;

    // The tag of what was tapped: under the thing itself, for a few seconds, while it is in view.
    if (tag.node && tag.what) {
      const p = now < tag.until && tag.dir ? toScreen(tag.dir(), camera, w, h) : null;
      if (!p) hideTag();
      else {
        const tw = tag.node.offsetWidth || Math.max(120, 7.4 * Math.max(tag.name.textContent.length, tag.sub.textContent.length) + 26);
        const x = Math.max(8 + tw / 2, Math.min(w - 8 - tw / 2, p.x));
        const below = p.y + 14 + 48 < h - 8;
        tag.node.style.transform = `translate(${Math.round(x)}px, ${Math.round(below ? p.y + 14 : p.y - 14 - 48)}px) translateX(-50%)`;
        // Shown only once it has a place: until this frame it would sit in the page's corner.
        if (tag.node.hidden) tag.node.hidden = false;
      }
    }

    // The mark: a ring on what "show me" turned to, for a few seconds.
    if (labels.markDir && now < labels.markUntil) {
      const p = toScreen(labels.markDir(), camera, w, h);
      labels.mark.hidden = !p;
      if (p) labels.mark.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -50%)`;
    } else if (!labels.mark.hidden) {
      labels.mark.hidden = true;
      labels.markDir = null;
    }
  }

  function hideTag() {
    if (!tag.node || !tag.what) return;
    tag.what = null;
    tag.dir = null;
    tag.node.hidden = true;
  }

  // ---- what is that (check 6 against Stellarium) ------------------------------------------------
  const dsoDirs = new Map();
  function dsoDir(r) {
    let d = dsoDirs.get(r.id);
    if (d === undefined) {
      const p = r.pos;
      const n = p ? Math.hypot(p.x, p.y, p.z) : 0;
      // `sun-inertial` is ecliptic J2000; the catalogue frame here is equatorial J2000.
      d = n > 0 ? eclToEq([p.x / n, p.y / n, p.z / n]) : null;
      dsoDirs.set(r.id, d);
    }
    return d;
  }
  /**
   * The nearest thing this layer draws to a point of the screen: a body, a star, or a deep-sky
   * object, within a finger's reach (26 px, never under 0.6 or over 4 degrees). A body wins a tie,
   * then the brighter star. Returns { kind, id, name, mag, dirEq, sepDeg } or null.
   */
  function whatAt(clientX, clientY, camera, rect) {
    if (!camera || !rect || !(rect.width > 0)) return null;
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
    _look.set(ndcX, ndcY, 0.5).unproject(camera).sub(camera.position).normalize().applyQuaternion(_inv.copy(group.quaternion).invert());
    const seen = [_look.x, _look.y, _look.z];
    if (seen[1] < -0.01 && !options.seeThrough) return null; // the ground
    const reach = Math.min(4, Math.max(0.6, 26 / Math.max(1, lastPxPerDeg)));
    const sepOf = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) / DEG;
    let best = null;
    const offer = (score, what) => { if (!best || score < best.score) best = { score, what }; };
    const B = COPY.sky.bodies || {};
    for (const b of BODIES) {
      const d = discs.get(b.id);
      if (!d.view || !d.apparent || (d.apparent.altDeg < -0.5 && !options.seeThrough)) continue;
      const sep = Math.max(0, sepOf(seen, d.apparent.local) - d.view.diameterDeg / 2);
      if (sep > reach) continue;
      if (b.id !== 'sun' && b.id !== 'moon' && d.view.mag > starUniforms.uLimit.value + 1.5 && d.diameterPx < 3) continue;
      offer(sep / reach - 0.35, { kind: 'body', id: b.id, name: B[b.id] || b.body, mag: d.view.mag, dirEq: d.view.dir, sepDeg: sep });
    }
    // The point as the catalogue has it: the air's lift taken off, then back to J2000.
    const aa = altAzOf(seen);
    const tl = localFromAltAz(aa.azDeg, aa.altDeg - refractionDeg(aa.altDeg));
    const eq = [m9[0] * tl[0] + m9[3] * tl[1] + m9[6] * tl[2], m9[1] * tl[0] + m9[4] * tl[1] + m9[7] * tl[2], m9[2] * tl[0] + m9[5] * tl[1] + m9[8] * tl[2]];
    const cosReach = Math.cos(reach * DEG);
    const scan = (pos, mags, n) => {
      for (let i = 0; i < n; i += 1) {
        const c = pos[i * 3] * eq[0] + pos[i * 3 + 1] * eq[1] + pos[i * 3 + 2] * eq[2];
        if (c < cosReach) continue;
        const sep = Math.acos(Math.min(1, c)) / DEG;
        const dir = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
        offer(sep / reach + Math.max(0, mags[i] - 1.5) * 0.07, { kind: 'star', id: null, name: null, mag: mags[i], dirEq: dir, sepDeg: sep });
      }
    };
    if (stars) scan(stars.points.geometry.attributes.position.array, stars.mag, Math.min(stats.drawn || 0, stars.mag.length));
    if (starTiles) starTiles.each(scan);
    const dsos = typeof ctx.recordsFor === 'function' ? ctx.recordsFor('deep-sky') : [];
    for (const r of dsos || []) {
      const d = r && dsoDir(r);
      if (!d) continue;
      const mag = r.meta && Number.isFinite(r.meta.mag) ? r.meta.mag : NaN;
      // Named only when this sky could show it: within three magnitudes of the faintest star drawn.
      if (!(mag <= starUniforms.uLimit.value + 3)) continue;
      const sep = sepOf(eq, d);
      if (sep > reach) continue;
      offer(sep / reach + 0.25, { kind: 'dso', id: r.id, name: r.name, mag, dirEq: d, sepDeg: sep });
    }
    const con = conMod ? conMod.constellationAt(best ? best.what.dirEq : eq) : null;
    const conName = con ? (conNames.get(con) || con) : '';
    if (!best) {
      // Nothing within reach: the tap still fell in a constellation, and the tag says which.
      if (!con) return null;
      const C = COPY.tonight.skybar.con;
      return { kind: 'sky', id: con, name: conName, mag: NaN, dirEq: eq, con, conName, words: { name: conName, sub: C.kind, label: t(C.label, { name: conName }), title: '' } };
    }
    const what = best.what;
    what.con = con;
    what.conName = conName;
    if (what.kind === 'star') {
      // A proper name, when the star has one (the 549 of skystars.names.json).
      for (const s of starNames) {
        if (s.mag > what.mag + 0.6) break;
        if (sepOf(s.dir, what.dirEq) < 0.05) { what.name = s.name; break; }
      }
    }
    return what;
  }

  // ---- data -------------------------------------------------------------------------------------
  const ready = (async () => {
    const jobs = [
      fetchBytes('../../data/stars.bin').then((buf) => { nakedEye = parseNakedEye(buf); if (!stats.deep) setStars(nakedEye); }),
      fetchJson('../../data/constellations.lines.json').then((json) => {
        if (disposed || !json || !Array.isArray(json.features)) return;
        const v = [];
        for (const f of json.features) {
          const g = f && f.geometry;
          const multi = !g ? [] : g.type === 'MultiLineString' ? g.coordinates : g.type === 'LineString' ? [g.coordinates] : [];
          const own = [];
          for (const line of multi) for (let i = 0; i + 1 < line.length; i += 1) own.push(...radecDir(line[i][0], line[i][1]), ...radecDir(line[i + 1][0], line[i + 1][1]));
          for (const x of own) v.push(x);
          if (f.id) conVerts.set(f.id, (conVerts.get(f.id) || []).concat(own));
        }
        cultures.get('western').obj = lineObject('sky-figures', v, 0x9aa4b2, FIGURE_LINE, true);
      }),
      fetchJson('../../data/constellation-names.json').then((rows) => {
        if (!Array.isArray(rows)) return;
        cultures.get('western').names = rows.filter((r) => r && typeof r.ra === 'number').map((r) => ({ id: r.id, name: r.name, dir: radecDir(r.ra, r.dec) }));
        for (const r of rows) if (r && r.id && !conNames.has(r.id)) conNames.set(r.id, r.name);
      }),
    ];
    await Promise.allSettled(jobs);
    buildMilkyWay();
    // The names of the stars and the faint stars come after the first sky is on screen.
    const later = () => {
      if (disposed) return;
      // The proper names only: [name, raDeg, decDeg, mag], brightest first (15 kB, not 288).
      fetchJson('../../data/skystars.names.json').then((json) => {
        const rows = (json && json.rows) || [];
        starNames = rows.filter((r) => r && r[0] && Number.isFinite(r[3])).map((r) => ({ name: r[0], mag: r[3], dir: radecDir(r[1], r[2]) })).sort((a, b) => a.mag - b.mag);
      }).catch(() => {});
      if (!saving) askTier(0);
      import('./constellation.js').then((m) => { if (!disposed) conMod = m; }).catch(() => {});
      // Where the water is, for the horizon: the Earth's own water mask, read at this place.
      if (!saving) sampleSea(String(url('../../textures/4k/earth_water.webp')), observer.latDeg, observer.lonDeg).then((got) => { if (!disposed && got) sea = got; });
      askPictures();
    };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(later, { timeout: 1500 });
    else setTimeout(later, 300);
    return stats;
  })();

  // ---- per frame --------------------------------------------------------------------------------
  function update(frame) {
    if (disposed) return;
    const date = new Date(frame.tMs);
    m9 = eqjToLocal(date, observerA);
    eqToLocal.set(m9[0], m9[1], m9[2], m9[3], m9[4], m9[5], m9[6], m9[7], m9[8]);

    const size = frame.renderer && frame.renderer.domElement ? frame.renderer.domElement : null;
    const w = (size && size.clientWidth) || (typeof innerWidth === 'number' ? innerWidth : 1280);
    const h = (size && size.clientHeight) || (typeof innerHeight === 'number' ? innerHeight : 800);
    const dpr = frame.renderer && frame.renderer.getPixelRatio ? Math.min(2, frame.renderer.getPixelRatio()) : 1;
    const pxPerDeg = pixelsPerDegree(frame.fovDeg, h);
    const sky = DARKNESS[options.darkness] || DARKNESS[DEFAULT_DARKNESS];
    const limit = limitingMagnitude({ fovDeg: frame.fovDeg, darkness: options.darkness, sunAltDeg: frame.sunAltDeg, moon: frame.moonBright });
    stats.limit = limit;
    starUniforms.uLimit.value = limit;
    starUniforms.uPx.value = dpr;
    bodyUniforms.uBelow.value = options.seeThrough ? -2 : -0.03;
    starUniforms.uTime.value = (performance.now() / 1000) % 3600;
    if (stars) {
      const n = countBrighter(stars.mag, limit + 0.6);
      stars.points.geometry.setDrawRange(0, n);
      stats.drawn = n;
    }
    if (!tierAsked[0] && frame.fovDeg < 40) askTier(0);
    // The rest of the catalogue, once the sky is deep enough to show a star tier 1 does not have.
    if (tiers[0] && !tierAsked[1] && limit + 0.3 > tierFaintest(0)) askTier(1);
    if (!starTilesAsked && limit > 7.3) askStarTiles();
    if (starTiles) {
      // The cone the screen's corners reach, and a degree for the air's lift.
      const half = Math.atan(Math.tan(frame.fovDeg / 2 * DEG) * Math.hypot(1, w / Math.max(1, h))) / DEG + 1;
      stats.tileStars = starTiles.update(lookEq(frame.camera), half, limit);
    }
    if (!picturesAsked && frame.fovDeg < 40) askPictures();
    lastPxPerDeg = pxPerDeg;
    lastFov = frame.fovDeg;
    if (pictures) pictures.update(frame, m9, limit, pxPerDeg, group);
    updateOtherLight(frame, w, h);

    // How much of a night it is: 1 once the Sun is 16 degrees down, 0 from 8 degrees down.
    const night = Math.max(0, Math.min(1, (-8 - frame.sunAltDeg) / 8));
    if (!milkyWay) buildMilkyWay();
    if (milkyWay) {
      const u = milkyWay.material.uniforms;
      u.uRot.value.copy(eqToLocal).multiply(galBasis);
      const img = u.uMap.value && u.uMap.value.image;
      const tx = openingTexel(img && img.width, img && img.height);
      u.uTexel.value.set(tx[0], tx[1]);
      const exposure = ctx.exposure && typeof ctx.exposure.look === 'function' ? (ctx.exposure.look().milkyWay || 1) : 1;
      // A 2k panorama is a wash once the field is a few degrees: it leaves as the field closes.
      const wide = Math.max(0, Math.min(1, (frame.fovDeg - 4) / 16));
      u.uGain.value = MILKY_WAY_GAIN * exposure * sky.milkyWay * night * (1 - 0.85 * frame.moonBright) * wide;
      milkyWay.visible = u.uGain.value > 0.004;
    }

    // Lines go with the stars they join: faint in twilight, a trace by day.
    const lineNight = Math.max(0.15, Math.min(1, (-4 - frame.sunAltDeg) / 10));
    const setLine = (obj, on) => {
      if (!obj) return;
      obj.visible = !!on;
      obj.material.uniforms.uOpacity.value = obj.userData.opacity * lineNight;
    };
    // The figures of the people chosen; until their file lands, the ones that were up stay up.
    const wantCulture = cultureAsked.has(options.culture) || /^[a-z]{2,24}$/.test(options.culture || '') ? options.culture : 'western';
    if (cultures.has(wantCulture)) cultureShown = wantCulture;
    else askCulture(wantCulture);
    for (const [id, c] of cultures) setLine(c.obj, options.figures && id === cultureShown);
    if (options.bounds && !boundsAsked) askBounds();
    setLine(lines.bounds, options.bounds);
    setLine(lines.pole, options.grid || options.starGrid);
    // The pictures belong to the western figures; they leave as the field closes on one star.
    const artOn = !!options.art && cultureShown === 'western';
    if (artOn && !artAsked) askArt();
    if (art) art.update({ on: artOn, dirEq: lookEq(frame.camera), fovDeg: frame.fovDeg, aspect: w / Math.max(1, h), strength: ART_GAIN * lineNight * Math.max(0, Math.min(1, (frame.fovDeg - 4) / 10)) });
    // Meteors: at the rate the naked eye would count under this sky, whatever the zoom.
    // Every source the IMO lists as active tonight, at tonight's rate (sky/meteors.js sourcesAt);
    // a trip stop's own shower (frame.showers, held whatever the date) at its peak rate.
    const meteorsOn = options.meteors && !reducedMotion;
    if (meteorsOn && night > 0.05 && !meteorsAsked) askMeteors();
    if (meteors && meteorsMod) {
      const eye = limitingMagnitude({ fovDeg: FOV.eye, darkness: options.darkness, sunAltDeg: frame.sunAltDeg, moon: frame.moonBright });
      if (Math.abs(frame.tMs - sourcesAt) > 60e3) {
        sourcesAt = frame.tMs;
        sources = meteorsOn ? meteorsMod.sourcesAt(frame.tMs, observer) : [];
        for (const sh of (meteorsOn && Array.isArray(frame.showers) ? frame.showers : [])) {
          if (!sh.held) continue;
          const at = sources.findIndex((x) => x.id === sh.id);
          // The stop's shower goes first (meteorNow(0) is its), at its peak rate whatever the date.
          const own = at >= 0 ? sources.splice(at, 1)[0] : null;
          sources.unshift({ ...(own || {}), ...sh, r: own ? own.r : undefined, peakZhr: sh.zhr, activity: 1 });
        }
      }
      const up = [];
      for (const sh of sources) if (sh.altDeg > 0) up.push(Object.assign(sh, { local: localFromAltAz(sh.azDeg, sh.altDeg) }));
      meteors.update({ showers: meteorsOn ? up : [], limitMag: eye, pxPerDeg, strength: night });
      // What the controls say: the strongest source that is up, or the strongest one that is down.
      const named = sources.filter((x) => !x.sporadic);
      const best = (list) => list.slice().sort((p, q) => (q.perHour || 0) - (p.perHour || 0) || q.zhr - p.zhr)[0] || null;
      const lead = best(named.filter((x) => x.altDeg > 0)) || best(named) || best(sources.filter((x) => x.altDeg > 0));
      const st = meteors.state();
      stats.meteorNote = lead ? { showers: [lead.display], down: !(lead.altDeg > 0), perHour: st.perHour, drawn: st.drawn, last: st.last, activity: lead.activity, sporadic: !!lead.sporadic, sources: sources.map((x) => ({ id: x.id, zhr: x.zhr, r: x.r, altDeg: x.altDeg })) } : null;
    }
    setLine(hereCon.obj, options.figures && cultureShown === 'western' && frame.fovDeg >= 8);
    if (options.trails && !trails) buildTrails();
    if (trails) trails.visible = !!options.trails && night > 0.05;
    setLine(lines.sunPath, options.sunPath);
    setLine(lines.equator, options.equator);
    setLine(lines.starGrid, options.starGrid);
    setLine(lines.grid, options.grid);
    setLine(lines.meridian, options.grid);

    solveBodies(frame.tMs, frame.fovDeg);
    placeBodies(frame, pxPerDeg);
    updateAir(frame);
    paintLabels(frame, w, h);
  }

  return {
    ready,
    update,
    setOptions(o) {
      Object.assign(options, o || {});
      labels.at = -Infinity;
      sourcesAt = -Infinity;
    },
    /** Where a body is as the eye sees it: {azDeg, altDeg} with the air's lift, or null. */
    apparentOf(id) {
      const d = discs.get(id);
      if (!d) return null;
      return d.apparent ? { azDeg: d.apparent.azDeg, altDeg: d.apparent.altDeg, diameterDeg: d.view.diameterDeg, mag: d.view.mag } : null;
    },
    /**
     * The planet or the Moon nearest the centre of the view (within `withinDeg`), with the width of
     * the round field that frames it: { id, fieldDeg } or null. For the Telescope button (#351).
     */
    bodyNear(az, alt, withinDeg = 3) {
      let best = null;
      for (const [id, d] of discs) {
        if (id === 'sun' || !d.apparent || !d.view || !(d.view.diameterDeg > 0)) continue;
        const dAz = ((d.apparent.azDeg - az + 540) % 360) - 180;
        const sep = Math.hypot(dAz * Math.cos(alt * Math.PI / 180), d.apparent.altDeg - alt);
        if (sep <= withinDeg && (!best || sep < best.sep)) best = { id, sep, diameterDeg: d.view.diameterDeg };
      }
      if (!best) return null;
      const span = best.id === 'jupiter' ? moons.reduce((m, x) => (x.hidden ? m : Math.max(m, x.offsetRadii)), 0) : 0;
      return { id: best.id, fieldDeg: bodyFieldDeg(best.id, best.diameterDeg, span) };
    },
    /** Where a J2000 direction is as the eye sees it now: {azDeg, altDeg, local}, the air's lift included. */
    apparentOfEq(dirEq) {
      const l = lift(localOf(m9, dirEq));
      return { ...altAzOf(l), local: l };
    },
    /** What of this layer is under a tap (client pixels): a deep-sky picture's record id, or null. */
    pickAt(clientX, clientY, camera, rect) {
      if (!pictures || !camera || !rect || !(rect.width > 0)) return null;
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
      const id = pictures.pickEq(lookEq(camera, ndcX, ndcY));
      // A tap on a picture frames it (internal #358): the field closes until the picture fills a third of it.
      const f = id && typeof pictures.frameOf === 'function' ? pictures.frameOf(id.slice(4)) : null;
      if (f && typeof env.pointAt === 'function' && lastFov > f.fovDeg * 1.4) env.pointAt({ raDeg: f.raDeg, decDeg: f.decDeg }, { fovDeg: f.fovDeg, mark: false });
      return id;
    },
    /** The field that frames a picture, and where it is: { raDeg, decDeg, fovDeg } or null. */
    frameOf: (id) => (pictures && typeof pictures.frameOf === 'function' ? pictures.frameOf(id) : null),
    whatAt,
    /** Name what was tapped: `dir` is a function giving its local direction now; `onOpen(what)` on a press. */
    showTag(what, text, onOpen) {
      if (!tag.node || !what) return;
      tag.what = what;
      tag.onOpen = onOpen || null;
      tag.dir = what.kind === 'body'
        ? () => { const d = discs.get(what.id); return d && d.apparent ? d.apparent.local : null; }
        : () => lift(localOf(m9, what.dirEq));
      tag.until = performance.now() + TAG_MS;
      // "You are in Orion": the constellation the thing is in, after what it is.
      const inCon = what.kind !== 'sky' && what.conName ? t(COPY.tonight.skybar.con.inside, { name: what.conName }) : '';
      tag.name.textContent = text.name;
      tag.sub.textContent = inCon ? `${text.sub} · ${inCon}` : text.sub;
      tag.node.setAttribute('aria-label', inCon ? `${text.label} ${inCon}.` : text.label);
      tag.node.title = text.title || '';
      tag.node.hidden = true; // paintLabels() shows it where the thing is, on the next frame
    },
    hideTag,
    /** What the tag is naming now, or null. */
    tagged: () => tag.what,
    /** One meteor now, from the first active shower: for the probe and a trip stop. Null when none can be drawn. */
    meteorNow: (i = 0, opts) => (meteors ? meteors.spawn(i, opts) : null),
    pictures: () => (pictures ? pictures.state() : null),
    otherLight: () => (other ? other.state() : null),
    /** A pass across the sky: `track` [{azDeg, altDeg, lit}], `marks` [{azDeg, altDeg, text}]. */
    showPass(track, marks) {
      this.clearPass();
      if (!Array.isArray(track) || track.length < 2) return;
      const lit = [];
      const dark = [];
      for (let i = 0; i + 1 < track.length; i += 1) {
        const a = track[i];
        const b = track[i + 1];
        // Where the eye sees it: the air lifts a satellite as it lifts a star (internal #393).
        (a.lit && b.lit ? lit : dark).push(...localFromAltAz(a.azDeg, a.altDeg + refractionDeg(a.altDeg)), ...localFromAltAz(b.azDeg, b.altDeg + refractionDeg(b.altDeg)));
      }
      arc = [];
      if (lit.length) arc.push(lineObject('sky-pass-lit', lit, 0xe8ecf2, 0.9, false, RO.arc));
      if (dark.length) arc.push(lineObject('sky-pass-shadow', dark, 0x9aa4b2, 0.4, false, RO.arc));
      for (const m of marks || []) passMarks.push(m);
      labels.at = -Infinity;
    },
    clearPass() {
      for (const o of arc || []) { o.geometry.dispose(); o.material.dispose(); root.remove(o); }
      arc = null;
      passMarks.length = 0;
      labels.at = -Infinity;
    },
    /** Ring a point of the sky for a few seconds. `dir` is a function so a moving thing stays ringed. */
    mark(dir, ms = 6000) {
      labels.markDir = typeof dir === 'function' ? dir : () => dir;
      labels.markUntil = performance.now() + ms;
    },
    stats: () => ({ ...stats, tiles: starTiles ? starTiles.state() : null, culture: cultureShown, bounds: !!lines.bounds, art: art ? art.state() : null, meteors: meteors ? meteors.state() : null }),
    dispose() {
      disposed = true;
      if (pictures) { pictures.dispose(); pictures = null; }
      if (art) { art.dispose(); art = null; }
      if (meteors) { meteors.dispose(); meteors = null; }
      if (starTiles) { starTiles.dispose(); starTiles = null; }
      if (tag.node) tag.node.remove();
      if (other) { other.dispose(); other = null; }
      root.traverse((o) => {
        if (o.geometry && o.geometry !== quad) o.geometry.dispose();
        if (o.material) {
          const map = o.material.uniforms && o.material.uniforms.uMap && o.material.uniforms.uMap.value;
          // The Milky Way's map is the scene's; a body's map is this layer's own.
          if (map && o !== milkyWay) map.dispose();
          o.material.dispose();
        }
      });
      quad.dispose();
      group.remove(root);
      if (labels.host) labels.host.remove();
      land.dispose();
    },
  };
}

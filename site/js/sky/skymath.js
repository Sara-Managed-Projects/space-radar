// sky/skymath.js -- the air and the eye, as numbers (internal #351, #352, #353, #357).
//
// Contract: refractionDeg(trueAltDeg), airmass(altDeg), extinctionMag(altDeg, k),
//           extinctionTint(altDeg), flattening(altDeg), twilightPhase(sunAltDeg),
//           twilightDrop(sunAltDeg), limitingMagnitude({fovDeg, darkness, sunAltDeg, moon}),
//           fovName(fovDeg), clampFov(fovDeg), zoomFov(fovDeg, factor), pixelsPerDegree(fovDeg, hPx),
//           DARKNESS, FOV, GLSL_AIR
// Pure: no DOM, no three, no clock, no ephemeris. sky/groundsky.js draws with these and its
// shaders carry the same formulas as GLSL_AIR, which tests/test_skymath.mjs holds to the JS.
//
// WHAT IS A MEASUREMENT AND WHAT IS A MODEL. Refraction is Saemundsson's formula (Sky & Telescope
// 1986) for 10 C and 1010 hPa, the one Astronomy Engine uses for 'normal': 29 arcminutes on the
// horizon, a third of a degree at 2 degrees up. Air mass is Kasten and Young (Applied Optics 28,
// 1989). Extinction is 0.2 magnitudes per air mass in V, a clear sea-level night; the real number
// changes with the weather and nobody measures it for the visitor, so every drawing made with it is
// a model and says so. The limiting magnitudes are round numbers for three kinds of sky, not a
// reading of the visitor's own.

const DEG = Math.PI / 180;

/** Field of view, vertical, in degrees: the widest, the eye's, the two named instruments, the narrowest. */
export const FOV = { max: 120, eye: 72, binoculars: 7, telescope: 1, min: 0.05 };

/**
 * Three kinds of sky (internal #357), in words rather than Bortle numbers: the faintest star at the
 * zenith with no Moon, how strong the glow on the horizon is, and how much of the Milky Way is left.
 */
export const DARKNESS = {
  city: { limit: 4.0, glow: 1.0, milkyWay: 0.0 },
  town: { limit: 5.3, glow: 0.55, milkyWay: 0.35 },
  dark: { limit: 6.5, glow: 0.04, milkyWay: 1.0 },
};
export const DARKNESS_IDS = ['city', 'town', 'dark'];

/**
 * How strong the glow on the horizon is at a place, 0 to 1, from its night-lights reading
 * (sky/skyglow.js, 0 to 1): nothing under 0.1 (a dark place), a trace at a dark-sky town's 0.2 to
 * 0.3, the city's whole glow from 0.9. Squared, because a town's light falls away faster than its
 * pixel's brightness. Drawn from an estimate: the map is upward light, not sky brightness.
 */
export function glowOfLights(lights) {
  if (!Number.isFinite(lights)) return 0;
  const x = Math.max(0, Math.min(1, (lights - 0.1) / 0.8));
  return x * x;
}
/** The sky cultures a visitor can choose (registry/skycultures.yaml; scripts/build-skycultures.py --check holds the two together). */
export const CULTURE_IDS = ['western', 'chinese', 'maori', 'hawaiian'];
export const DEFAULT_DARKNESS = 'dark';

/**
 * How far the air lifts something, in degrees, from its TRUE altitude in degrees (Saemundsson).
 * 0.48 on the horizon, 0.16 at 5 degrees, 0.017 at 45, nothing at the zenith. Below -1 degree the
 * formula is not meant to be used; it is tapered to nothing at the nadir, as Astronomy Engine does.
 */
export function refractionDeg(trueAltDeg) {
  if (!Number.isFinite(trueAltDeg)) return 0;
  const h = Math.max(-1, Math.min(90, trueAltDeg));
  let r = 1.02 / Math.tan((h + 10.3 / (h + 5.11)) * DEG) / 60;
  if (trueAltDeg < -1) r *= (trueAltDeg + 90) / 89;
  return Math.max(0, r);
}

/** Air masses looked through at an apparent altitude (Kasten and Young 1989): 1 overhead, 38 on the horizon. */
export function airmass(altDeg) {
  if (!Number.isFinite(altDeg)) return 38;
  const h = Math.max(0, Math.min(90, altDeg));
  return 1 / (Math.sin(h * DEG) + 0.50572 * Math.pow(h + 6.07995, -1.6364));
}

/** Magnitudes lost to the air, beyond what the zenith already costs. `k` is magnitudes per air mass. */
export function extinctionMag(altDeg, k = 0.2) {
  return k * (airmass(altDeg) - 1);
}

/**
 * The colour the air leaves, as three factors on red, green and blue, 1 overhead. Blue is
 * scattered out first, which is why a star or the Moon low down is orange. Brightness is
 * extinctionMag's job; this only moves the colour.
 */
export function extinctionTint(altDeg) {
  const x = airmass(altDeg) - 1;
  return [1, Math.exp(-0.045 * x), Math.exp(-0.11 * x)];
}

/**
 * How squashed a disc on the horizon looks, 0.83 on it and 1 from a few degrees up: refraction
 * lifts the lower limb more than the upper. The slope of refractionDeg, taken over one degree.
 */
export function flattening(altDeg) {
  if (!Number.isFinite(altDeg) || altDeg > 30) return 1;
  const a = Math.max(-1, altDeg);
  const slope = refractionDeg(a + 0.5) - refractionDeg(a - 0.5);
  return Math.max(0.7, Math.min(1, 1 + slope));
}

/**
 * The Sun's altitude in the words the twilight definitions use. 'golden' is the design's, the rest
 * are astronomy's: civil to -6, nautical to -12, astronomical to -18, night below.
 */
export function twilightPhase(sunAltDeg) {
  if (!Number.isFinite(sunAltDeg)) return null;
  if (sunAltDeg >= 6) return 'day';
  if (sunAltDeg >= 0) return 'golden';
  if (sunAltDeg >= -6) return 'civil';
  if (sunAltDeg >= -12) return 'nautical';
  if (sunAltDeg >= -18) return 'astronomical';
  return 'night';
}

// How many magnitudes of stars the Sun's own light takes away, by its altitude. Night costs
// nothing; at the end of civil twilight only first-magnitude stars are left; by day only the Sun
// and the Moon, which are drawn as discs and do not go through this.
const TWILIGHT_DROP = [
  [-18, 0],
  [-12, 1.0],
  [-6, 3.6],
  [-3, 5.6],
  [0, 8.0],
  [6, 12.0],
];

/** Magnitudes lost to twilight at this Sun altitude (0 at night, 12 by day), piecewise linear. */
export function twilightDrop(sunAltDeg) {
  if (!Number.isFinite(sunAltDeg)) return 0;
  const T = TWILIGHT_DROP;
  if (sunAltDeg <= T[0][0]) return T[0][1];
  if (sunAltDeg >= T[T.length - 1][0]) return T[T.length - 1][1];
  for (let i = 0; i + 1 < T.length; i += 1) {
    if (sunAltDeg <= T[i + 1][0]) {
      const k = (sunAltDeg - T[i][0]) / (T[i + 1][0] - T[i][0]);
      return T[i][1] + (T[i + 1][1] - T[i][1]) * k;
    }
  }
  return 0;
}

/** Field of view kept inside what the view offers. */
export function clampFov(fovDeg) {
  if (!Number.isFinite(fovDeg)) return FOV.eye;
  return Math.max(FOV.min, Math.min(FOV.max, fovDeg));
}

/** One wheel notch or pinch step: the field times a factor, clamped. Zoom is multiplicative. */
export function zoomFov(fovDeg, factor) {
  return clampFov(fovDeg * (Number.isFinite(factor) && factor > 0 ? factor : 1));
}

/** What a field this wide is called: the eye above 30 degrees, binoculars to 3, a telescope under. */
export function fovName(fovDeg) {
  if (!(fovDeg < 30)) return 'eye';
  return fovDeg >= 3 ? 'binoculars' : 'telescope';
}

/** Screen pixels to a degree at the centre of a perspective view `hPx` tall. */
export function pixelsPerDegree(fovDeg, hPx) {
  return hPx / 2 / Math.tan((clampFov(fovDeg) / 2) * DEG) * DEG;
}

/**
 * The faintest star drawn (internal #351, #353, #357). The kind of sky sets it for the eye; the
 * Moon takes up to two magnitudes and twilight up to all of them; and a narrower field stands for
 * a bigger lens, three magnitudes for every ten times narrower: 6.5 for the eye in a dark place,
 * 9.3 in a 7 degree binocular field, 11.8 in a 1 degree telescope field.
 * `moon` is sky/skyview.js moonBrightness(), 0 to 1.
 */
export function limitingMagnitude({ fovDeg = FOV.eye, darkness = DEFAULT_DARKNESS, sunAltDeg = -90, moon = 0 } = {}) {
  const sky = DARKNESS[darkness] || DARKNESS[DEFAULT_DARKNESS];
  const f = clampFov(fovDeg);
  const zoom = f < 60 ? 3 * Math.log10(60 / f) : 0;
  const m = Math.max(0, Math.min(1, Number(moon) || 0));
  return sky.limit + zoom - 2 * m - twilightDrop(sunAltDeg);
}

/**
 * How big a star of magnitude `mag` is drawn when the limit is `limit`, in CSS pixels, and how
 * strongly: the same curve the vertex shader runs. A star at the limit is a 2.4 px speck at a
 * third strength; three magnitudes brighter it is 7 px and solid; the very brightest get a glare.
 * (2026-10-08, internal #447: it was 1.5 px growing by 1.32 a magnitude, and at a 72 degree field
 * the constellation lines read before the stars they join. Stars first, lines second.)
 */
export function starLook(mag, limit) {
  const f = limit - mag;
  const size = Math.min(16, 2.4 * Math.pow(1.42, Math.max(0, f)));
  const alpha = Math.max(0, Math.min(1, (f + 0.6) / 1.8));
  const glare = Math.max(0, Math.min(1, (f - 4.5) / 4));
  return { size, alpha, glare };
}

/**
 * The same air, for the vertex shaders (stars, lines, grids): `airLift(dir)` takes a unit
 * direction in the view's local frame (+Y up) and returns it lifted by refraction, `airMass(sinAlt)`
 * is Kasten and Young. Angles in the shader are radians except inside the two formulas, which are
 * written in the degrees their papers use.
 */
export const GLSL_AIR = /* glsl */ `
float airRefractionDeg(float hDeg) {
  float h = clamp(hDeg, -1.0, 90.0);
  float r = 1.02 / tan(radians(h + 10.3 / (h + 5.11))) / 60.0;
  if (hDeg < -1.0) r *= (hDeg + 90.0) / 89.0;
  return max(0.0, r);
}
vec3 airLift(vec3 d, float on) {
  float altDeg = degrees(asin(clamp(d.y, -1.0, 1.0)));
  float lifted = radians(altDeg + on * airRefractionDeg(altDeg));
  vec2 h = d.xz;
  float hl = length(h);
  if (hl < 1e-6) return d;
  h /= hl;
  return vec3(h.x * cos(lifted), sin(lifted), h.y * cos(lifted));
}
float airMass(float sinAlt) {
  float hDeg = degrees(asin(clamp(sinAlt, 0.0, 1.0)));
  return 1.0 / (sin(radians(hDeg)) + 0.50572 * pow(hDeg + 6.07995, -1.6364));
}
`;

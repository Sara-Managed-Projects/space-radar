// scene/orrery.js -- the Planets tab's two sliders as numbers: how much larger the worlds are drawn,
// and how far the distances from the Sun are squeezed (forge #145).
//
// Contract, every export pure (no THREE, no DOM; tests/test_orrery.mjs holds each):
//   SIZE_MAX, SIZE_STEPS, DIST_STEPS, DIST_LOG, SUN_ROOM, MOON_GAP
//   sizeFromU(u) -> k, an integer from 1 to SIZE_MAX;  uFromSize(k) -> u in [0, 1]
//   logKm(rKm) -> the logarithmic map's distance from the Sun, km
//   radialKm(rKm, d) -> the drawn distance from the Sun, km, for a Distance slider at d in [0, 1]
//   trueRadialKm(drawnKm, d) -> and back: the true distance a drawn one stands for (bisection; the map is monotonic)
//   sunSize(k, d) -> how many times larger the Sun is drawn (never more than k, never under 1)
//   moonOffsetKm(dKm, envKm, rKm, k) -> a moon's drawn distance from its planet's centre, km
//   parseSize(text), parseDist(text) -> the slider value a URL key names, or null
//   sizeValue(k), distValue(d) -> the URL key's value, '' for the default (true)
//   viewOf({ size, dist }) -> null when both are true, else the object scene/worlds.js setOrrery takes
//
// WHY TWO SLIDERS. The Sun's stage draws the Solar System as it is: every planet at its true size
// and its true distance, which makes every planet a fraction of a pixel and the inner four a knot
// round the Sun (scene/orbitrings.js measured it). The dots and the honest badge (ui/scalebadge.js)
// say how much larger than life the dots are; nothing let a visitor CHOOSE how much, and nothing could
// spread the inner planets out. Solar System Scope's two "schematic to realistic" sliders are the best
// liked control of any competitor (internal spec 0081). These are those two, with the rule this
// map has always kept: SIZE AND DISTANCE MAY BE EXAGGERATED IF THE PICTURE SAYS SO; DIRECTION NEVER.
//
// SIZE. k from 1 (true) to 2 000, exponential in the slider so each tenth of its travel is the same
// factor (2 000^0.1 = 2.1), and rounded to two significant figures so the badge's "×N" is the number
// the scene was drawn with, not a rounding of it. Every world of the Sun's system takes k. The Sun
// takes k too, but never so much that it reaches halfway to Mercury's perihelion as drawn (SUN_ROOM):
// at k = 2 000 and true distances the Sun would be 9.3 AU across and Mercury would be inside it. The
// badge prints the Sun's own factor whenever it differs from the planets'.
//
// DISTANCE. d = 0 is the truth. d = 1 is a logarithmic map, fixed at DIST_LOG.fixKm (50 AU, past
// Pluto's aphelion of 49.3) so the Kuiper belt and everything beyond -- Voyager, the heliosphere
// (scene/heliosphere.js), the stars -- is never moved:
//
//     logKm(r) = fix * ln(1 + r / inner) / ln(1 + fix / inner)     for r < fix, r beyond
//
// with inner = 0.2 AU, which puts Mercury at 9.8 AU, the Earth at 16.2, Jupiter at 29.8 and Neptune
// at 45.4: the classroom picture of eight evenly spread circles, still in order and still in their
// true directions. Between the two the slider blends geometrically, r^(1-d) * logKm(r)^d, which is
// monotonic for every d (a product of increasing positive functions to positive powers), so no world
// ever passes another on its way.
//
// MOONS STAY OUTSIDE THEIR PLANETS. A moon is placed round its planet's DRAWN centre, in its TRUE
// direction from the planet, at
//
//     (env + r) * (k + MOON_GAP * (k - 1))  +  max(0, d - env - r) * sqrt(k)
//
// where d is its true distance from the planet's centre, r its radius and env the planet's radius or,
// with rings, the rings' outer edge. At k = 1 that is d exactly. Above, the first term clears the
// enlarged planet (and its rings) and the enlarged moon with a tenth to spare, and the second keeps
// the moons in their order with their gaps grown by sqrt(k), the most that keeps the Moon short of
// the drawn Venus at k = 2 000 (0.22 AU from the Earth). Scaling the whole system by k instead would
// keep its shape and put Callisto 25 AU from Jupiter; clamping each moon to the planet's edge would
// stack all four Galileans in one place.
//
// The picture says so: ui/orrery.js puts these numbers in each world's card note, and the badge
// (ui/scalebadge.js viewWords) adds the Sun's factor and the distance word to its line.

const KM_PER_AU = 1.495978707e8;
/** The Sun's radius, km (IAU 2015 nominal, as registry/worlds.yaml has it). */
const SUN_RADIUS_KM = 695700;
/** Mercury's perihelion, km: NASA NSSDCA Mercury Fact Sheet, 46.0 million km. */
const MERCURY_Q_KM = 46.0e6;

/** The largest size factor: Solar System Scope's slider tops out near this, and Jupiter is then 0.93 AU across. */
export const SIZE_MAX = 2000;
/** The size slider's travel, in steps: the keyboard's arrow moves one, Page Up a tenth. */
export const SIZE_STEPS = 1000;
/** The distance slider's travel: a percent each. */
export const DIST_STEPS = 100;
/** The logarithmic map's two lengths (the header says why these). */
export const DIST_LOG = { innerKm: 0.2 * KM_PER_AU, fixKm: 50 * KM_PER_AU };
/** The Sun may reach this share of the way to Mercury's drawn perihelion, and no further. */
export const SUN_ROOM = 0.5;
/** The tenth of the enlarged sizes a moon is kept clear by. */
export const MOON_GAP = 0.1;

const clamp01 = (u) => (Number.isFinite(u) ? Math.min(1, Math.max(0, u)) : 0);

/** Two significant figures, as an integer, never under 1. */
function twoFigures(n) {
  if (!(n > 1)) return 1;
  const mag = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1);
  return Math.max(1, Math.round(n / mag) * mag);
}

/** The slider's place (0..1) -> the size factor k. Exponential, rounded to two figures. */
export function sizeFromU(u) {
  return Math.min(SIZE_MAX, twoFigures(SIZE_MAX ** clamp01(u)));
}

/** And back: the slider place that draws k (for a URL's `size=` and the preset buttons). */
export function uFromSize(k) {
  if (!(k > 1)) return 0;
  return clamp01(Math.log(Math.min(SIZE_MAX, k)) / Math.log(SIZE_MAX));
}

/** The logarithmic map's distance from the Sun, km; the identity at and beyond DIST_LOG.fixKm. */
export function logKm(rKm) {
  const { innerKm, fixKm } = DIST_LOG;
  if (!(rKm > 0)) return 0;
  if (rKm >= fixKm) return rKm;
  return (fixKm * Math.log1p(rKm / innerKm)) / Math.log1p(fixKm / innerKm);
}

/** The drawn distance from the Sun for a Distance slider at d: the truth at 0, logKm at 1. */
export function radialKm(rKm, d) {
  const u = clamp01(d);
  if (!(rKm > 0)) return 0;
  if (u === 0 || rKm >= DIST_LOG.fixKm) return rKm;
  return Math.exp((1 - u) * Math.log(rKm) + u * Math.log(logKm(rKm)));
}

/**
 * The true distance from the Sun that a drawn distance stands for: radialKm's inverse, by bisection (the
 * map is monotonic and has no closed inverse between its two ends). scene/heliosphere.js asks it where the
 * camera TRULY is, so the 50 AU rule holds in any distance mode.
 */
export function trueRadialKm(drawnKm, d) {
  const u = clamp01(d);
  if (!(drawnKm > 0)) return 0;
  if (u === 0 || drawnKm >= DIST_LOG.fixKm) return drawnKm;
  let lo = 0; let hi = DIST_LOG.fixKm;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (radialKm(mid, u) < drawnKm) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** How many times larger the Sun is drawn: k, held to SUN_ROOM of the way to Mercury's drawn perihelion. */
export function sunSize(k, d) {
  if (!(k > 1)) return 1;
  const room = (SUN_ROOM * radialKm(MERCURY_Q_KM, d)) / SUN_RADIUS_KM;
  return Math.max(1, Math.min(k, Math.floor(room)));
}

/**
 * A moon's drawn distance from its planet's centre, km (the header's formula). `envKm` is the planet's
 * radius, or its rings' outer edge when it has rings; `rKm` the moon's radius; `k` the size factor.
 */
export function moonOffsetKm(dKm, envKm, rKm, k) {
  if (!(dKm > 0)) return 0;
  if (!(k > 1)) return dKm;
  const env = envKm > 0 ? envKm : 0;
  const r = rKm > 0 ? rKm : 0;
  const clear = (env + r) * (k + MOON_GAP * (k - 1));
  return clear + Math.max(0, dKm - env - r) * Math.sqrt(k);
}

/** `#size=` -> k, or null for a value that is not one. `1` and `true` are the default. */
export function parseSize(text) {
  const s = String(text == null ? '' : text).trim().toLowerCase();
  if (s === 'true') return 1;
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  if (!(n >= 1)) return null;
  return Math.min(SIZE_MAX, twoFigures(n));
}

/** `#dist=` -> d in [0, 1], or null. `true` is 0 and `log` is 1; a number between is a share. */
export function parseDist(text) {
  const s = String(text == null ? '' : text).trim().toLowerCase();
  if (s === 'true') return 0;
  if (s === 'log') return 1;
  if (!/^(0(\.\d+)?|1(\.0+)?)$/.test(s)) return null;
  return Math.round(Number(s) * DIST_STEPS) / DIST_STEPS;
}

/** k -> the `size=` value; '' at true size, so a link to the true picture carries no key. */
export function sizeValue(k) {
  return k > 1 ? String(Math.min(SIZE_MAX, twoFigures(k))) : '';
}

/** d -> the `dist=` value: '' at the truth, `log` at the far end, two decimals between. */
export function distValue(d) {
  const u = Math.round(clamp01(d) * DIST_STEPS) / DIST_STEPS;
  if (u === 0) return '';
  if (u === 1) return 'log';
  return String(u);
}

/**
 * What scene/worlds.js setOrrery() takes: the factors and the two maps, or null when the sliders are
 * both at the truth (and the worlds then run the arithmetic they always have, to the last digit).
 */
export function viewOf({ size = 1, dist = 0 } = {}) {
  const k = size > 1 ? Math.min(SIZE_MAX, twoFigures(size)) : 1;
  const d = Math.round(clamp01(dist) * DIST_STEPS) / DIST_STEPS;
  if (k === 1 && d === 0) return null;
  return {
    sizeK: k,
    sunK: sunSize(k, d),
    dist: d,
    radialKm: (rKm) => radialKm(rKm, d),
    trueKm: (drawnKm) => trueRadialKm(drawnKm, d),
    moonOffsetKm: (dKm, envKm, rKm) => moonOffsetKm(dKm, envKm, rKm, k),
  };
}

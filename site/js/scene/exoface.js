// scene/exoface.js -- a face for a planet nobody has seen (internal plan 2026-10-08 section 4.2,
// issue #466 phase B).
//
// Contract:
//   faceFor(row) -> face                 PURE: the same row gives the same face, in node or a browser
//   rowOf(planet, star) -> row           a registry/systems.yaml planet and its star, as a row
//   imaginedWorld(n) -> { n, name, row, face }   an invented, labelled world from the same pipeline
//   faceLabel(face) -> { tag, measured, imagined, line }   the words that go wherever a face is drawn
//   faceWhy(face) -> string              "Drawn as a super-Earth, mild enough for seas: worked out, not seen."
//   createFace(face, { tier }) -> { mesh, material, halo, tag, update(o), setTier(n), dispose() }
//   applyFace(mesh, face, { tier }) -> handle    dress an existing unit-sphere mesh (scene/systems.js)
//
// NO TELESCOPE HAS RESOLVED THE SURFACE OF ANY EXOPLANET. Everything this file draws is an
// illustration, and the label is part of the object: createFace() carries an on-canvas tag that
// says "Artist's impression", and faceLabel() gives the card its line, generated from the row:
// "Measured: 1.7 Earth radii, a 25-day year. The surface is imagined." (an estimated radius is
// "Estimated: 1.0 Earth radii. Measured: an 11-day year.", a minimum mass "At least 1.1 Earth
// masses. Measured: an 11-day year."; internal #538). No moons are invented and no
// rings are drawn (none is reported for any planet in the table).
//
// WHAT IS MEASURED, WHAT IS WORKED OUT, WHAT IS IMAGINED.
//   measured    the row: radius, mass, period, the star's temperature and radius (NASA Exoplanet
//               Archive). A missing radius or orbit size is worked out and the face says so
//               (`estimated`), never printed as measured.
//   worked out  the class, from radius and bulk density; the light the planet receives, from the
//               star's temperature and radius and the orbit; the climate, from that light against
//               the habitable-zone limits of Kopparapu et al. 2014 (ApJ 787 L29, recent Venus to
//               early Mars); an equilibrium temperature at a STATED Bond albedo of 0.3 (the Earth's)
//               with heat spread over the whole globe; whether the planet probably keeps one face
//               to its star (a year of 60 days or less; Kasting, Whitmire and Reynolds 1993 put the
//               limit near 0.5 au x (M*/Msun)^(1/3), which Kepler's third law turns into a year of
//               about 130 days, and 60 is the cautious half of that).
//   imagined    every feature: where the land is, the clouds, the storms, the colours. A seed from
//               the planet's NAME places them, so the same planet always looks the same.
//
// THE LIGHT. A 2 600 K star is orange. A camera, like an eye, balances most of that away, so the
// light used is 60 % of the way from white to the star's own colour (LIGHT_ADAPT): a red dwarf's
// world is plainly warmer than a Sun-like star's, and an ocean under it is still an ocean.
//
// COST. Nothing at boot: scene/systems.js imports this file the first time a system's stage is
// entered, scene/exostage.js for `#imagine=N`. No texture files: the picture is noise in the
// fragment shader. Three tiers (scene/quality.js): 0 is ONE draw call, four octaves, no cloud
// shadows; 1 adds the warped coasts, cyclones, cloud shadows, relief and the limb's glow (a second,
// additive draw); 2 adds two octaves and finer storms. No post-processing pass (tests/test_contract.mjs).

import * as THREE from '../../vendor/three.module.min.js';
import { COPY, t } from '../copy/en.js';
import '../copy/en.later.js';

// --- the pure part -------------------------------------------------------------------------------

/** The Bond albedo the equilibrium temperature assumes: the Earth's. Stated on the face. */
export const ALBEDO = 0.3;
/** How far the light is taken from white toward the star's colour (0 = white, 1 = the star's). */
export const LIGHT_ADAPT = 0.6;
/** A year this short, or shorter, and the planet is drawn keeping one face to its star. */
export const LOCK_PERIOD_DAYS = 60;
const SUN_RADIUS_AU = 695700 / 149597870.7;
const SUN_TEFF_K = 5772; // IAU 2015 B3 nominal
/** Where rock is taken to be molten under the star: the hottest point of the day side, kelvin. */
export const LAVA_SUBSTELLAR_K = 1300;

export const CLASSES = ['rock', 'superEarth', 'water', 'miniNeptune', 'iceGiant', 'gasGiant'];
export const CLIMATES = ['lava', 'desert', 'temperate', 'snowball'];
export const DECKS = ['ammonia', 'water', 'clear', 'alkali', 'silicate'];

/** FNV-1a, 32 bits: the seed a name gives. */
export function seedOf(name) {
  let h = 2166136261;
  const s = String(name == null ? '' : name).trim().toLowerCase();
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** mulberry32: a small generator, so a face's every choice follows from its seed. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

/**
 * A black body's colour, linear RGB, brightest channel 1 (Tanner Helland's fit to Mitchell
 * Charity's table, 1 000 to 40 000 K, then sRGB to linear). Good to a few per cent: a tint.
 */
export function starRgb(teffK) {
  const T = clamp(num(teffK) || SUN_TEFF_K, 1000, 40000) / 100;
  let r, g, b;
  if (T <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(T) - 161.1195681661;
    b = T <= 19 ? 0 : 138.5177312231 * Math.log(T - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * (T - 60) ** -0.1332047592;
    g = 288.1221695283 * (T - 60) ** -0.0755148492;
    b = 255;
  }
  const lin = (v) => { const c = clamp(v, 0, 255) / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const out = [lin(r), lin(g), lin(b)];
  const m = Math.max(out[0], out[1], out[2]) || 1;
  return out.map((v) => v / m);
}

// Kopparapu et al. 2014, table 1: S_eff = S0 + aT + bT^2 + cT^3 + dT^4, T = Teff - 5780 K, good
// from 2 600 to 7 200 K (the temperature is held to that range outside it).
const HZ_RECENT_VENUS = [1.776, 2.136e-4, 2.533e-8, -1.332e-11, -3.097e-15];
const HZ_EARLY_MARS = [0.32, 5.547e-5, 1.526e-9, -2.874e-12, -5.011e-16];
function hzFlux(c, teffK) {
  const T = clamp(teffK, 2600, 7200) - 5780;
  return c[0] + c[1] * T + c[2] * T * T + c[3] * T ** 3 + c[4] * T ** 4;
}
/** The light, in Earths, at the inner (recent Venus) and outer (early Mars) edge for this star. */
export function habitableFlux(teffK) {
  return { inner: hzFlux(HZ_RECENT_VENUS, teffK), outer: hzFlux(HZ_EARLY_MARS, teffK) };
}

/** A radius from a mass where none is measured (Chen and Kipping 2017's broken power law, rounded). */
export function radiusFromMass(massEarths) {
  if (massEarths < 2.04) return massEarths ** 0.279;
  if (massEarths < 132) return 0.808 * massEarths ** 0.589;
  return 14.3 * massEarths ** -0.044;
}

/** A main-sequence star's mass from its radius, when the row has none: R ~ M^0.8 (Sun-like), R ~ M below 0.6. */
function starMassFromRadius(rSuns) {
  return rSuns < 0.6 ? rSuns : rSuns ** 1.25;
}

/** A registry/systems.yaml planet and its system's star, as the row faceFor() reads. */
export function rowOf(planet, star) {
  return {
    name: planet.name || planet.id,
    radiusEarths: planet.radiusEarths,
    massEarths: planet.massEarths,
    periodDays: planet.periodDays,
    aAu: planet.aAu,
    // How the table knows each number (measured / estimated / least): the label says "Measured"
    // only of a measured one (internal #538). `method` is read when there is no `*From`.
    method: planet.method,
    radiusFrom: planet.radiusFrom,
    massFrom: planet.massFrom,
    starTeffK: star ? star.teffK : null,
    starRadiusSuns: star ? star.radiusSuns : null,
    starMassSuns: star ? star.massSuns : null,
  };
}

/**
 * The face of a planet, from its measured row. PURE.
 *
 * @param {object} row  { name, radiusEarths, massEarths, periodDays, aAu?, starTeffK, starRadiusSuns,
 *                        starMassSuns? } -- the names an exoplanet record's `meta` already uses
 *                        (data/parsers.js), with `name` beside them; `method` (the discovery
 *                        method) is read when it is there.
 * @returns {object} face: { name, seed, cls, climate, locked, eyeball, teqK, fluxEarths, warmth,
 *                           albedo, estimated: {radius, orbit}, measured: {...}, star: {teffK, rgb,
 *                           light}, kind: 'rocky'|'giant', look: {...uniform values} }
 */
export function faceFor(row) {
  const r = row || {};
  const name = String(r.name || '');
  const seed = seedOf(r.seedName || name);
  let massEarths = num(r.massEarths);
  let measuredRadius = num(r.radiusEarths);
  // WHEN THE ROW SAYS HOW EACH NUMBER IS KNOWN (`radiusFrom`, `massFrom`, as the generated systems
  // table carries them) THE ROW DECIDES, and the guess below is not made. An estimated radius is
  // kept apart (`radiusGuess`) so it can be drawn and said as "Estimated"; an estimated mass is a
  // forecast from the radius and is dropped; a least mass (`massFrom: least`) is a measured
  // minimum and is said as "at least".
  const known = r.radiusFrom !== undefined || r.massFrom !== undefined;
  let radiusGuess = null;
  let massKind = massEarths ? 'measured' : null;
  if (known) {
    if (r.radiusFrom !== undefined && r.radiusFrom !== 'measured') { radiusGuess = measuredRadius; measuredRadius = null; }
    if (r.massFrom === 'estimated') { massEarths = null; massKind = null; }
    else if (r.massFrom === 'least' && massEarths) massKind = 'least';
  }
  // THE ARCHIVE'S COMPOSITE TABLE FILLS A MISSING MASS OR RADIUS FROM THE OTHER (Chen and Kipping's
  // relation) and the slimmed table carries no flag for it. A pair that sits on that relation to
  // 3 % is one number and its forecast: the forecast is dropped, so it is neither printed as
  // measured nor allowed to decide the class. Found by radial velocity, the mass is the measured
  // one; otherwise the radius is.
  if (!known && massEarths && measuredRadius && Math.abs(radiusFromMass(massEarths) / measuredRadius - 1) < 0.03) {
    if (/radial velocity/i.test(String(r.method || ''))) measuredRadius = null;
    else massEarths = null;
  }
  const radiusEarths = measuredRadius || (massEarths ? radiusFromMass(massEarths) : radiusGuess || 1);
  const periodDays = num(r.periodDays);
  const teffK = num(r.starTeffK) || SUN_TEFF_K;
  const starRadiusSuns = num(r.starRadiusSuns) || 1;
  const starMassSuns = num(r.starMassSuns) || starMassFromRadius(starRadiusSuns);
  // The orbit's size: the row's, or Kepler's third law on the period and the star's mass.
  const measuredA = num(r.aAu);
  const aAu = measuredA || (periodDays ? Math.cbrt(starMassSuns * (periodDays / 365.25) ** 2) : 1);

  // The light it receives, in Earths, and the temperature that balances it.
  const fluxEarths = (starRadiusSuns * starRadiusSuns * (teffK / SUN_TEFF_K) ** 4) / (aAu * aAu);
  const teqK = teffK * Math.sqrt((starRadiusSuns * SUN_RADIUS_AU) / (2 * aAu)) * (1 - ALBEDO) ** 0.25;
  const substellarK = teqK * Math.SQRT2; // no heat carried away from under the star
  const hz = habitableFlux(teffK);

  // The class. Rock packs tighter under more weight (R ~ M^0.27), so the density a rocky planet of
  // this mass would have is M^0.19 Earths; `packing` is the planet's own against that.
  const density = massEarths ? massEarths / radiusEarths ** 3 : null;
  const packing = density === null ? null : density / massEarths ** 0.19;
  let cls;
  if (radiusEarths >= 7 || (massEarths !== null && massEarths >= 95 && !measuredRadius)) cls = 'gasGiant';
  else if (radiusEarths >= 3.5) cls = 'iceGiant';
  else if (packing !== null && radiusEarths >= 1.25 && packing < 0.4) cls = 'miniNeptune';
  else if (packing !== null && radiusEarths >= 1.25 && packing < 0.75) cls = 'water';
  else if (packing === null && radiusEarths >= 1.8) cls = 'miniNeptune'; // over the radius valley
  else if (radiusEarths >= 2.6) cls = 'miniNeptune';
  else cls = radiusEarths >= 1.25 ? 'superEarth' : 'rock';
  const kind = cls === 'miniNeptune' || cls === 'iceGiant' || cls === 'gasGiant' ? 'giant' : 'rocky';

  // The climate, by the light: over the recent-Venus limit it is hot (and molten where the rock
  // under the star would melt), under the early-Mars limit it is frozen, between them mild.
  // A giant has no ground to be any of these: it gets a cloud deck by its temperature instead.
  let climate = null;
  if (kind === 'giant') climate = null;
  else if (fluxEarths > hz.inner) climate = substellarK >= LAVA_SUBSTELLAR_K ? 'lava' : 'desert';
  else if (fluxEarths < hz.outer) climate = 'snowball';
  else climate = 'temperate';
  const deck = kind !== 'giant' ? null : teqK < 150 ? 'ammonia' : teqK < 250 ? 'water' : teqK < 900 ? 'clear' : teqK < 1500 ? 'alkali' : 'silicate';
  // 0 at the cold edge of the mild range, 1 at the warm edge (in the logarithm of the light).
  const warmth = clamp(Math.log(fluxEarths / hz.outer) / Math.log(hz.inner / hz.outer), 0, 1);

  const locked = periodDays !== null && periodDays <= LOCK_PERIOD_DAYS;
  const eyeball = kind === 'rocky' && locked && (climate === 'temperate' || climate === 'snowball');

  const rgb = starRgb(teffK);
  const light = mix3([1, 1, 1], rgb, LIGHT_ADAPT);
  const face = {
    name, seed, cls, kind, climate, deck, locked, eyeball,
    teqK, substellarK, fluxEarths, warmth, albedo: ALBEDO,
    density, packing,
    estimated: { radius: !measuredRadius, orbit: !measuredA },
    measured: { radiusEarths: measuredRadius, massEarths, massKind, periodDays },
    radiusGuess,
    radiusEarths, aAu,
    star: { teffK, radiusSuns: starRadiusSuns, rgb, light },
    imagined: false,
  };
  face.look = kind === 'giant' ? giantLook(face) : rockyLook(face);
  return face;
}

const jitter = (c, rnd, k) => c.map((v) => clamp(v * (1 + (rnd() - 0.5) * 2 * k), 0, 1));

/** Rayleigh's blue, of the star's own light: what a thin air scatters toward the camera. */
function skyColour(face, tint = [0.16, 0.42, 1.0]) {
  const s = face.star.light;
  return [tint[0] * s[0], tint[1] * s[1], tint[2] * s[2]];
}

function cyclones(rnd, count, locked) {
  // xyz: the eye, a unit vector in the cloud frame; w: the twist in radians, signed by hemisphere.
  const out = [];
  for (let i = 0; i < 5; i++) {
    if (i >= count) { out.push([0, 1, 0, 0]); continue; }
    if (locked && i === 0) { out.push([1, 0, 0, 1.5]); continue; } // the storm under the star
    const south = i % 2 === 1;
    const lat = (0.42 + rnd() * 0.5) * (south ? -1 : 1); // 24 to 53 degrees
    const lon = rnd() * Math.PI * 2;
    const c = Math.cos(lat);
    out.push([c * Math.cos(lon), Math.sin(lat), c * Math.sin(lon), (0.8 + rnd() * 0.7) * (south ? -1 : 1)]);
  }
  return out;
}

function rockyLook(face) {
  const rnd = rng(face.seed ^ 0x9e3779b9);
  const { climate, cls, warmth, locked } = face;
  const look = {
    seed: [rnd() * 61 + 1, rnd() * 61 + 1, rnd() * 61 + 1],
    locked: locked ? 1 : 0,
    tiltDeg: locked ? 0 : rnd() * 28,
    spin0: rnd() * Math.PI * 2,
    lava: 0,
    cyclones: cyclones(rnd, 5, locked),
    cloudCol: [0.93, 0.94, 0.95],
    gain: 1,
  };
  if (climate === 'temperate') {
    const water = cls === 'water';
    look.ocean = water ? 0.86 + rnd() * 0.12 : 0.5 + rnd() * 0.2; // the share of the globe under sea
    look.cloud = 0.4 + rnd() * 0.14 + (water ? 0.05 : 0);
    // Not locked: caps from the poles. Locked: ice from the night side, creeping past the terminator
    // when the planet is cold (`cold` runs 0 under the star, 0.5 at the terminator, 1 at midnight).
    look.ice = locked ? lerp(0.3, 0.56, warmth) : lerp(0.62, 0.93, warmth);
    look.oceanDeep = jitter([0.003, 0.018, 0.085], rnd, 0.15);
    look.oceanShallow = jitter([0.01, 0.1, 0.2], rnd, 0.15);
    const lush = rnd();
    look.landLow = jitter(mix3([0.02, 0.085, 0.018], [0.05, 0.085, 0.016], lush), rnd, 0.12);
    look.landDry = jitter(mix3([0.34, 0.24, 0.13], [0.3, 0.17, 0.09], rnd()), rnd, 0.1);
    look.landHigh = jitter([0.19, 0.14, 0.1], rnd, 0.1);
    look.green = lerp(0.75, 0.3, Math.max(0, warmth - 0.6) / 0.4); // the warm edge is drier
    look.iceCol = [0.82, 0.88, 0.94];
    look.atm = skyColour(face);
    look.atmK = 1;
    look.spec = 1;
    look.bump = 1;
  } else if (climate === 'snowball') {
    look.ocean = 0.6;
    look.cloud = 0.2 + rnd() * 0.12;
    // A locked snowball close to the mild range keeps a thawed pond under its star.
    look.ice = locked && face.fluxEarths > 0.7 * habitableFlux(face.star.teffK).outer ? 0.07 : -1;
    look.oceanDeep = [0.004, 0.03, 0.1];
    look.oceanShallow = [0.015, 0.12, 0.2];
    look.landLow = jitter([0.3, 0.3, 0.32], rnd, 0.08);
    look.landDry = jitter([0.36, 0.33, 0.3], rnd, 0.08);
    look.landHigh = [0.5, 0.52, 0.56];
    look.green = 0;
    look.iceCol = jitter([0.78, 0.86, 0.95], rnd, 0.04);
    look.atm = skyColour(face);
    look.atmK = 0.7;
    look.spec = 0.6;
    look.bump = 0.8;
  } else if (climate === 'desert') {
    look.ocean = 0;
    look.cloud = 0.1 + rnd() * 0.16;
    look.ice = 9; // never
    const k = rnd();
    look.landLow = jitter(mix3([0.36, 0.2, 0.09], [0.3, 0.25, 0.17], k), rnd, 0.12);
    look.landDry = jitter(mix3([0.46, 0.31, 0.16], [0.42, 0.36, 0.27], k), rnd, 0.12);
    look.landHigh = jitter(mix3([0.17, 0.09, 0.06], [0.16, 0.14, 0.12], k), rnd, 0.12);
    look.oceanDeep = look.landHigh; look.oceanShallow = look.landHigh;
    look.green = 0;
    look.iceCol = [0.8, 0.8, 0.8];
    look.cloudCol = mix3([0.9, 0.86, 0.78], [0.93, 0.93, 0.93], rnd());
    look.atm = skyColour(face, [0.5, 0.42, 0.34]); // dust, not blue
    look.atmK = 0.55;
    look.spec = 0;
    look.bump = 1.4;
  } else { // lava
    look.ocean = 0.34 + rnd() * 0.16; // the share that is open magma, more of it under the star
    look.cloud = 0.06;
    look.ice = 9;
    look.lava = clamp((face.substellarK - 900) / 1600, 0.45, 1);
    look.landLow = [0.035, 0.03, 0.028];
    look.landDry = [0.07, 0.055, 0.045];
    look.landHigh = [0.02, 0.018, 0.018];
    look.oceanDeep = [0.03, 0.006, 0.002]; look.oceanShallow = [0.05, 0.012, 0.004];
    look.green = 0;
    look.iceCol = [0.8, 0.8, 0.8];
    look.cloudCol = [0.2, 0.16, 0.14];
    look.atm = skyColour(face, [0.9, 0.36, 0.12]); // rock vapour, lit from below
    look.atmK = 0.35;
    look.spec = 0;
    look.bump = 1.6;
  }
  // The thin high deck and a snowball's frost come from a second stream of the seed, so the looks
  // drawn above are the looks they always were.
  const r2 = rng(face.seed ^ 0x2545f491);
  const high = r2();
  look.high = climate === 'temperate' ? 0.35 + high * 0.55 : climate === 'snowball' ? 0.15 + high * 0.3 : climate === 'desert' ? 0.1 + high * 0.2 : 0;
  look.frost = climate === 'snowball' ? 0.75 + r2() * 0.25 : 0;
  return look;
}

// A giant's colours by temperature: the cloud decks Sudarsky, Burrows and Pinto 2000 worked out
// (ApJ 538 885) -- ammonia cloud under 150 K, water cloud to 250 K, clear and blue to 900 K, dark
// with alkali metals to 1 500 K, silicate cloud above. A model's colour family; the pattern is imagined.
function giantLook(face) {
  const rnd = rng(face.seed ^ 0x85ebca6b);
  const { cls, teqK, locked } = face;
  const look = {
    seed: [rnd() * 61 + 1, rnd() * 61 + 1, rnd() * 61 + 1],
    locked: locked ? 1 : 0,
    tiltDeg: locked ? 0 : rnd() * 26,
    spin0: rnd() * Math.PI * 2,
    gain: 1,
    glow: [0, 0, 0],
    streak: 0,
  };
  const storms = [];
  const nStorms = cls === 'gasGiant' ? 1 + Math.floor(rnd() * 3) : cls === 'iceGiant' ? 1 : 0;
  for (let i = 0; i < 3; i++) {
    if (i >= nStorms) { storms.push([0, 1, 0, 0]); continue; }
    const lat = (0.2 + rnd() * 0.5) * (rnd() < 0.5 ? -1 : 1);
    const lon = rnd() * Math.PI * 2;
    const c = Math.cos(lat);
    storms.push([c * Math.cos(lon), Math.sin(lat), c * Math.sin(lon), 0.09 + rnd() * 0.1]);
  }
  look.storms = storms;
  if (cls === 'gasGiant') {
    look.bandFreq = 7 + rnd() * 6;
    look.turb = 0.7 + rnd() * 0.5;
    look.haze = 0.08;
    if (teqK < 150) { // ammonia cloud: cream, tan, rust
      look.bandA = jitter([0.62, 0.52, 0.38], rnd, 0.1); look.bandB = jitter([0.3, 0.17, 0.09], rnd, 0.15);
      look.bandC = jitter([0.74, 0.7, 0.62], rnd, 0.06); look.stormCol = [0.5, 0.14, 0.06];
      look.atm = skyColour(face, [0.5, 0.5, 0.6]);
    } else if (teqK < 250) { // water cloud: white and pale blue
      look.bandA = jitter([0.74, 0.77, 0.8], rnd, 0.05); look.bandB = jitter([0.22, 0.32, 0.5], rnd, 0.1);
      look.bandC = jitter([0.5, 0.5, 0.48], rnd, 0.06); look.stormCol = [0.92, 0.92, 0.92];
      look.atm = skyColour(face, [0.3, 0.5, 0.9]);
    } else if (teqK < 900) { // no cloud: deep blue
      look.bandA = jitter([0.05, 0.12, 0.36], rnd, 0.12); look.bandB = jitter([0.02, 0.05, 0.2], rnd, 0.12);
      look.bandC = jitter([0.12, 0.22, 0.46], rnd, 0.1); look.stormCol = [0.4, 0.5, 0.7];
      look.atm = skyColour(face, [0.2, 0.42, 1.0]);
    } else if (teqK < 1500) { // alkali metals: dark cobalt and slate
      look.bandA = jitter([0.04, 0.1, 0.34], rnd, 0.12); look.bandB = jitter([0.01, 0.022, 0.1], rnd, 0.12);
      look.bandC = jitter([0.14, 0.22, 0.42], rnd, 0.1); look.stormCol = [0.55, 0.62, 0.75];
      look.atm = skyColour(face, [0.2, 0.4, 1.0]);
    } else { // silicate cloud, and its own heat showing
      look.bandA = jitter([0.16, 0.1, 0.08], rnd, 0.1); look.bandB = jitter([0.05, 0.035, 0.035], rnd, 0.1);
      look.bandC = jitter([0.3, 0.17, 0.1], rnd, 0.1); look.stormCol = [0.5, 0.22, 0.1];
      look.atm = skyColour(face, [0.8, 0.45, 0.3]);
      const k = clamp((teqK - 1500) / 1500, 0.15, 1);
      look.glow = [0.5 * k, 0.09 * k, 0.012 * k];
    }
    look.pole = mix3(look.bandB, [0.05, 0.07, 0.12], 0.4);
    look.contrast = 1;
    look.atmK = 0.8;
  } else if (cls === 'iceGiant') {
    look.bandFreq = 4 + rnd() * 3;
    look.turb = 0.3;
    const warm = clamp((teqK - 120) / 500, 0, 1);
    look.bandA = jitter(mix3([0.2, 0.46, 0.62], [0.42, 0.5, 0.58], warm), rnd, 0.08);
    look.bandB = jitter(mix3([0.1, 0.26, 0.5], [0.24, 0.32, 0.44], warm), rnd, 0.08);
    look.bandC = jitter(mix3([0.3, 0.56, 0.66], [0.56, 0.6, 0.62], warm), rnd, 0.06);
    look.pole = mix3(look.bandB, [0.06, 0.12, 0.3], 0.5);
    look.stormCol = [0.03, 0.08, 0.22];
    look.contrast = 0.4;
    look.haze = 0.3;
    look.streak = 0.5;
    look.atm = skyColour(face, [0.25, 0.55, 1.0]);
    look.atmK = 1;
  } else { // a mini-Neptune: a deep, hazy air and little to see through it
    look.bandFreq = 3 + rnd() * 3;
    look.turb = 0.35;
    let a, b;
    if (teqK < 350) { a = [0.5, 0.64, 0.7]; b = [0.26, 0.42, 0.56]; } // pale, cold and blue-white
    else if (teqK < 800) { a = [0.36, 0.4, 0.56]; b = [0.2, 0.22, 0.4]; } // grey-blue to mauve haze
    else { a = [0.5, 0.33, 0.2]; b = [0.28, 0.16, 0.11]; } // soot and tan
    look.bandA = jitter(a, rnd, 0.1); look.bandB = jitter(b, rnd, 0.1);
    look.bandC = mix3(look.bandA, [0.7, 0.7, 0.72], 0.35);
    look.pole = mix3(look.bandB, [0.1, 0.1, 0.16], 0.3);
    look.stormCol = look.bandC;
    look.contrast = 0.3;
    look.haze = 0.62 + rnd() * 0.2;
    look.streak = 0.15;
    look.atm = skyColour(face, teqK < 800 ? [0.3, 0.5, 1.0] : [0.8, 0.5, 0.3]);
    look.atmK = 1.25;
  }
  look.hazeCol = mix3(mix3(look.bandA, look.bandC, 0.5), look.atm.map((v) => v * 0.9), 0.35);
  return look;
}

/**
 * An invented world, from a number: the same pipeline as a real one, fed an invented row. It is
 * ALWAYS named "An imagined world no. N" and its face says `imagined`; it is never given a real
 * planet's name, and nothing of it is printed as measured.
 */
export function imaginedWorld(n) {
  const no = clamp(Math.round(Number(n)) || 1, 1, 99999);
  const rnd = rng(seedOf('imagined world ' + no));
  // Weighted to the worlds people stop for: seas, land and cloud under a Sun-like star.
  const pick = rnd();
  let teffK, radiusEarths, massEarths, flux, periodHint;
  const sunLike = () => 4700 + rnd() * 1600;
  const dwarf = () => 2700 + rnd() * 900;
  const mild = (lo, hi) => (T) => { const hz = habitableFlux(T); return Math.exp(lerp(Math.log(hz.outer), Math.log(hz.inner), lerp(lo, hi, rnd()))); };
  let fluxOf;
  if (pick < 0.56) { teffK = sunLike(); radiusEarths = 0.8 + rnd() * 0.8; fluxOf = mild(0.3, 0.75); }
  else if (pick < 0.68) { teffK = dwarf(); radiusEarths = 0.8 + rnd() * 0.7; fluxOf = mild(0.3, 0.8); }
  else if (pick < 0.76) { teffK = sunLike(); radiusEarths = 1.6 + rnd() * 0.6; massEarths = radiusEarths ** 3 * 0.6 * 1.25; fluxOf = mild(0.35, 0.7); }
  else if (pick < 0.84) { teffK = sunLike(); radiusEarths = 9 + rnd() * 4; massEarths = 100 + rnd() * 300; fluxOf = () => 0.02 + rnd() * rnd() * 3; }
  else if (pick < 0.89) { teffK = sunLike(); radiusEarths = 2.2 + rnd() * 1; massEarths = 5 + rnd() * 4; fluxOf = () => 0.5 + rnd() * 20; }
  else if (pick < 0.94) { teffK = rnd() < 0.5 ? sunLike() : dwarf(); radiusEarths = 0.7 + rnd() * 0.9; fluxOf = (T) => habitableFlux(T).outer * (0.2 + rnd() * 0.7); }
  else if (pick < 0.97) { teffK = sunLike(); radiusEarths = 0.9 + rnd() * 0.9; fluxOf = () => 900 + rnd() * 2500; }
  else { teffK = sunLike(); radiusEarths = 0.6 + rnd() * 0.9; fluxOf = (T) => habitableFlux(T).inner * (1.5 + rnd() * 20); }
  flux = fluxOf(teffK);
  if (!massEarths) massEarths = radiusEarths ** 3.7; // rock, packed as rock packs
  // A main-sequence star of that temperature (R ~ T^1.5 about the Sun; M dwarfs smaller still).
  const starRadiusSuns = teffK < 3900 ? 0.12 + ((teffK - 2700) / 1200) * 0.45 : (teffK / SUN_TEFF_K) ** 1.5;
  const starMassSuns = starMassFromRadius(starRadiusSuns);
  const aAu = Math.sqrt((starRadiusSuns * starRadiusSuns * (teffK / SUN_TEFF_K) ** 4) / flux);
  periodHint = 365.25 * Math.sqrt(aAu ** 3 / starMassSuns);
  const name = t(COPY.exoface.imaginedName, { n: no });
  const row = { name, radiusEarths, massEarths, periodDays: periodHint, aAu, starTeffK: teffK, starRadiusSuns, starMassSuns };
  const face = faceFor(row);
  face.imagined = true;
  face.measured = { radiusEarths: null, massEarths: null, periodDays: null };
  return { n: no, name, row, face };
}

// --- the words -----------------------------------------------------------------------------------

/** Two figures, as the source supports: 1.7, 0.92, 25, 385. */
export function twoFigures(x) {
  if (!(x > 0)) return COPY.exoface.missing;
  if (x >= 9.95) return String(Math.round(x));
  if (x >= 0.995) return x.toFixed(1);
  return String(Math.round(x * 100) / 100);
}

function yearWords(periodDays) {
  const E = COPY.exoface;
  // "an 8-day year", "an 11-day year", "an 18-hour year": the number as it is said.
  const a = (n) => (/^(8|11(\D|$)|18(\D|$))/.test(n) ? E.an : E.a);
  if (periodDays < 2) { const n = String(Math.round(periodDays * 24)); return t(E.yearHours, { a: a(n), n }); }
  if (periodDays < 1000) { const n = twoFigures(periodDays); return t(E.yearDays, { a: a(n), n }); }
  return t(E.yearYears, { n: twoFigures(periodDays / 365.25) });
}

/**
 * The words that go wherever a face is drawn, generated from the row and never typed.
 * { tag: "Artist's impression", measured: "Measured: 1.7 Earth radii, a 25-day year.",
 *   imagined: "The surface is imagined.", line: the three as one sentence run for a card }
 */
export function faceLabel(face) {
  const E = COPY.exoface;
  if (face.imagined) return { tag: E.tag, measured: E.nothingMeasured, imagined: E.whole, line: [E.tag + COPY.punctuation.dot, E.nothingMeasured, E.whole].join(' ') };
  // Only a measured number is printed after "Measured". A measured minimum mass is "At least N
  // Earth masses"; a number the Archive only estimated is "Estimated: ...". The year is measured
  // either way, so it keeps its own "Measured" sentence (internal #538).
  const m = face.measured;
  const year = m.periodDays ? yearWords(m.periodDays) : null;
  let lead = null;
  if (m.radiusEarths) lead = { measured: true, text: t(E.radius, { n: twoFigures(m.radiusEarths) }) };
  else if (m.massEarths && m.massKind !== 'least') lead = { measured: true, text: t(E.mass, { n: twoFigures(m.massEarths) }) };
  else if (m.massEarths) lead = { text: t(E.least, { n: twoFigures(m.massEarths) }) };
  else if (face.radiusGuess) lead = { text: t(E.estimated, { parts: t(E.radius, { n: twoFigures(face.radiusGuess) }) }) };
  let measured;
  if (lead && lead.measured) measured = t(E.measured, { parts: [lead.text, year].filter(Boolean).join(E.join) });
  else if (lead) measured = year ? [lead.text, t(E.measured, { parts: year })].join(' ') : lead.text;
  else measured = year ? t(E.measured, { parts: year }) : E.nothingMeasured;
  const imagined = face.kind === 'giant' ? E.clouds : E.surface;
  return { tag: E.tag, measured, imagined, line: [E.tag + COPY.punctuation.dot, measured, imagined].join(' ') };
}

/** Why it is drawn this way: the class and the climate, said as worked out. */
export function faceWhy(face) {
  const E = COPY.exoface;
  const cls = E.cls[face.cls];
  if (face.kind === 'giant') return t(E.whyGiant, { cls });
  return t(E.why, { cls, climate: E.climate[face.eyeball ? 'eyeball' : face.climate] });
}

// --- the shader ----------------------------------------------------------------------------------

export const FACE_VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vN;
varying vec3 vW;
varying vec3 vC;
varying float vR;
void main() {
  vec4 w = modelMatrix * vec4( position, 1.0 );
  vW = w.xyz;
  vN = normalize( mat3( modelMatrix ) * position );
  vC = modelMatrix[3].xyz;
  vR = length( modelMatrix[0].xyz );
  gl_Position = projectionMatrix * viewMatrix * w;
  #include <logdepthbuf_vertex>
}
`;

// THE NOISE IS A LATTICE BUILT AT RUN TIME, not a file: 64 x 64 x 64 random bytes in four channels
// (noiseTexture() below, 1 MB on the GPU, shared by every face). One filtered look-up is one value
// of noise, where hashing the eight corners in the shader cost a 2017 laptop's graphics 61 ms a
// frame for a face that filled a 1440 x 900 screen (measured 2026-10-08, run 1).
const NOISE_GLSL = /* glsl */`
precision highp sampler3D;
uniform sampler3D uNoise;
vec4 n4( vec3 x ) {
  vec3 i = floor( x );
  vec3 f = fract( x );
  f = f * f * ( 3.0 - 2.0 * f );
  return texture( uNoise, ( i + f + 0.5 ) / 64.0 );
}
float vnoise( vec3 x ) { return n4( x ).r; }
// Each octave is turned as well as doubled, so the lattice of one never lines up with the next.
const mat3 OCT_M = mat3( 0.00, 1.60, 1.20, -1.60, 0.72, -0.96, -1.20, -0.96, 1.28 );
float fbm( vec3 p ) {
  float a = 0.5, s = 0.0, n = 0.0;
  for ( int i = 0; i < OCT; i++ ) { s += a * vnoise( p ); n += a; p = OCT_M * p + 11.7; a *= 0.5; }
  return s / n;
}
float fbm3( vec3 p ) {
  float a = 0.5, s = 0.0;
  for ( int i = 0; i < 3; i++ ) { s += a * vnoise( p ); p = OCT_M * p + 5.3; a *= 0.5; }
  return s / 0.875;
}
// Three independent noises for the price of one: the lattice's other channels.
vec3 fbm3v( vec3 p ) {
  float a = 0.5; vec3 s = vec3( 0.0 );
  for ( int i = 0; i < 3; i++ ) { s += a * n4( p ).gba; p = OCT_M * p + 5.3; a *= 0.5; }
  return s / 0.875;
}
vec3 turn( vec3 p, vec3 axis, float ang ) {
  float c = cos( ang ), s = sin( ang );
  return p * c + cross( axis, p ) * s + axis * dot( axis, p ) * ( 1.0 - c );
}
`;

const COMMON_UNIFORMS_GLSL = /* glsl */`
uniform vec3 uSunDir;      // from the planet to its star, scene axes
uniform vec3 uLight;       // the star's light, part balanced (LIGHT_ADAPT)
uniform vec3 uAtm;         // what the air scatters
uniform float uAtmK;
uniform float uGain;
uniform mat3 uFrame;       // scene axes -> the surface's own
uniform mat3 uCloudFrame;  // scene axes -> the clouds', which drift over the surface
uniform vec3 uSeed;
uniform float uLocked;
uniform float uDetail;     // 0..1, grows with the disc's size on screen: the fine octaves of a close-up (detailFor)
varying vec3 vN;
varying vec3 vW;
varying vec3 vC;
varying float vR;
`;

// The air seen against the disc: a thin veil everywhere on the day side, thick at the limb, warm
// where the light has come the long way round at the terminator.
const AIR_GLSL = /* glsl */`
vec3 duskTint( vec3 atm ) { return atm.bgr * vec3( 1.5, 0.8, 0.55 ) + vec3( 0.08, 0.02, 0.0 ) * uLight; }
vec3 air( vec3 col, float mu, float nv ) {
  float rim = pow( 1.0 - nv, 3.4 );
  float dayA = smoothstep( -0.14, 0.22, mu );
  float dusk = exp( -abs( mu + 0.02 ) * 13.0 );
  vec3 scat = mix( uAtm, duskTint( uAtm ), dusk * 0.45 );
  float k = ( 0.03 + 0.97 * rim ) * dayA * uAtmK;
  return col * ( 1.0 - 0.5 * k ) + scat * k * 1.25 * uGain;
}
`;

export const ROCKY_FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
${COMMON_UNIFORMS_GLSL}
uniform float uSea;        // the height the sea stands at, in the terrain's own 0..1
uniform float uIce;        // where the ice begins, in the cold coordinate
uniform float uCloud;      // the share of the sky under cloud
uniform float uLava;
uniform float uGreen;
uniform float uSpec;
uniform float uBump;
uniform vec3 uOceanDeep;
uniform vec3 uOceanShallow;
uniform vec3 uLandLow;
uniform vec3 uLandDry;
uniform vec3 uLandHigh;
uniform vec3 uIceCol;
uniform vec3 uCloudCol;
uniform vec4 uCyc[ 5 ];
uniform mat3 uCloudFrame2; // the high deck's own frame: it drifts at another speed
uniform float uHigh;       // the share of the sky under the thin high deck (tier 2); 0 = none
uniform float uFrost;      // 0..1: a snowball's cracks, blue ice and scoured rock (tiers 1 and 2); 0 = none
${NOISE_GLSL}
${AIR_GLSL}

// The ground's height, 0..1, and (tiers 1 and 2) the height a short step toward the star: the
// difference is the slope the light sees. NOT the screen-space derivative of the height: a
// filtered look-up moves in 1/256 steps of a lattice cell, and close up its derivative is a
// stipple of two-pixel blocks (seen 2026-10-08, run 3). The step is a long one for the same reason:
// over a short step the two look-ups differ by a few of those steps and the slope comes out in
// ripples (run 6); over a long one it is the lie of the land, which is what a globe shows.
const float STRETCH = 1.8;
float terrain( vec3 q, vec3 toStar, out float ahead ) {
  vec3 w = q * 1.2 + uSeed;
  #if TIER >= 1
  w += 0.6 * ( fbm3v( w * 1.4 + 11.0 ) - 0.5 );
  #endif
  float h = fbm( w );
  ahead = h;
  #if TIER >= 1
  ahead = fbm( w + toStar * 0.05 );
  #endif
  #if TIER >= 2
  h += 0.03 * ( fbm3( q * 21.0 + uSeed.yzx ) - 0.5 );
  #endif
  ahead = ( ahead - 0.5 ) * STRETCH + 0.5;
  return ( h - 0.5 ) * STRETCH + 0.5;
}

// The clouds' own coordinate: wound up round each storm's eye, and thicker there.
vec3 wind( vec3 c, out float storm ) {
  storm = 0.0;
  #if TIER >= 1
  for ( int i = 0; i < NCYC; i++ ) {
    float d = 1.0 - dot( c, uCyc[ i ].xyz );
    float near = exp( -d / 0.03 );
    c = turn( c, uCyc[ i ].xyz, uCyc[ i ].w * near );
    storm += 0.17 * exp( -d / 0.016 ) * step( 0.01, abs( uCyc[ i ].w ) );
  }
  #endif
  return c;
}

float cloudAt( vec3 c, float extra ) {
  float storm;
  c = wind( c, storm );
  vec3 w = c * 1.9 + uSeed.zxy;
  #if TIER >= 1
  w += 0.8 * ( fbm3v( w * 0.9 + 5.0 ) - 0.5 );
  #endif
  float n = fbm( w ) + 0.17 * ( fbm3( w * 4.3 + 3.0 ) - 0.5 );
  #if TIER >= 2
  n += 0.07 * ( fbm3( w * 13.0 + 7.0 ) - 0.5 );
  // Cells: the ridges of a second, finer noise stand for the edges of cumulus cells.
  n += 0.045 * ( 1.0 - abs( 2.0 * vnoise( w * 9.0 + 2.0 ) - 1.0 ) - 0.5 );
  #endif
  #if TIER >= 1
  // Close up the deck is drawn finer still: two more octaves, only once the disc is large.
  if ( uDetail > 0.001 ) {
    n += uDetail * ( 0.07 * ( vnoise( w * 31.0 + 9.0 ) - 0.5 ) + 0.045 * ( vnoise( w * 79.0 + 2.0 ) - 0.5 ) );
  }
  #endif
  // Storm tracks: more cloud along the middle latitudes and the equator, less in the dry belts.
  float belts = 0.5 + 0.5 * cos( c.y * 8.4 );
  float cover = uCloud + mix( ( belts - 0.5 ) * 0.16, 0.0, uLocked ) + extra + storm;
  // Thin at the edge, solid only where the deck is deep: a soft toe, not a cut-out.
  float d = max( n - ( 0.75 - 0.44 * cover ), 0.0 ) / 0.12;
  return 1.0 - exp( -d * d * 1.6 );
}

#if TIER >= 1
// The same deck, coarser: what throws the shade.
float cloudShade( vec3 c, float extra ) {
  float storm;
  c = wind( c, storm );
  vec3 w = c * 1.9 + uSeed.zxy;
  w += 0.8 * ( fbm3v( w * 0.9 + 5.0 ) - 0.5 );
  float n = fbm( w );
  float belts = 0.5 + 0.5 * cos( c.y * 8.4 );
  float cover = uCloud + mix( ( belts - 0.5 ) * 0.16, 0.0, uLocked ) + extra + storm;
  float d = max( n - ( 0.73 - 0.44 * cover ), 0.0 ) / 0.14;
  return 1.0 - exp( -d * d * 1.6 );
}
#endif

#if TIER >= 2
// A thin high deck over the thick low one: drawn out along the parallels into wisps, and seen
// through its own height, so against the limb it slides over the low deck.
float highDeck( vec3 c ) {
  vec3 w = vec3( c.x * 2.6, c.y * 8.5, c.z * 2.6 ) + uSeed.yxz * 1.7;
  float n = fbm3( w ) + 0.22 * ( fbm3( w * 3.1 + 4.0 ) - 0.5 );
  return smoothstep( 0.62 - 0.3 * uHigh, 0.86, n );
}
#endif

void main() {
  #include <logdepthbuf_fragment>
  vec3 N = normalize( vN );
  vec3 V = normalize( cameraPosition - vW );
  vec3 L = normalize( uSunDir );
  vec3 q = uFrame * N;
  float mu0 = dot( N, L );

  // The ground.
  float sea = uSea;
  vec3 Lq = uFrame * L;
  float ahead;
  float h = terrain( q, Lq - q * dot( q, Lq ), ahead );
  // Close up: ground finer than the lattice's first cells. Two octaves at 70 and 170 times the globe,
  // and a third a step toward the star for the slope, all off (and unpaid for) while the disc is small.
  float dt = 0.0;
  float dSlope = 0.0;
  #if TIER >= 1
  if ( uDetail > 0.001 ) {
    vec3 dq = q * 70.0 + uSeed.xzy;
    float d1 = vnoise( dq );
    float d2 = vnoise( OCT_M * dq * 2.4 + 3.1 );
    dt = uDetail * ( ( d1 - 0.5 ) * 0.6 + ( d2 - 0.5 ) * 0.4 );
    dSlope = uDetail * ( d1 - vnoise( dq + ( Lq - q * dot( q, Lq ) ) * 0.35 ) );
    h += dt * 0.03;
  }
  #endif
  float edge = 0.003 + fwidth( h ) * 0.75;
  float land = smoothstep( sea - edge, sea + edge, h );
  float elev = clamp( ( h - sea ) / max( 1.0 - sea, 0.05 ), 0.0, 1.0 );
  float depth = clamp( ( sea - h ) / 0.2, 0.0, 1.0 );
  vec3 mm = fbm3v( q * 2.4 + uSeed.yzx + 40.0 );
  float m = mm.x;
  float fine = fbm3( q * 9.0 + uSeed.zxy );

  // Cold: latitude on a turning world, the way round from the star on a locked one.
  float cold = mix( abs( q.y ), 0.5 - 0.5 * q.x, uLocked ) + ( m - 0.5 ) * 0.2 + ( fine - 0.5 ) * 0.07;
  float ice = smoothstep( uIce, uIce + 0.03, cold + elev * 0.12 * land );

  // Dry belts either side of the equator on a turning world; green where it is wet and low.
  float wet = m - 0.24 * exp( -pow( ( abs( q.y ) - 0.4 ) / 0.13, 2.0 ) ) * ( 1.0 - uLocked );
  float green = smoothstep( 0.34, 0.52, wet ) * ( 1.0 - smoothstep( 0.1, 0.6, elev ) ) * uGreen;
  vec3 landCol = mix( uLandDry, uLandLow, green );
  landCol = mix( landCol, uLandHigh, smoothstep( 0.55, 0.95, elev ) );
  landCol *= ( 0.72 + 0.56 * fine ) * ( 1.0 + 0.7 * dt );
  // The sea: pale over the shelf, then deep, and never one flat blue.
  vec3 seaCol = mix( uOceanShallow, uOceanDeep, smoothstep( 0.0, 0.3, depth ) );
  seaCol = mix( seaCol, uOceanShallow * vec3( 0.7, 1.25, 1.1 ), ( 1.0 - smoothstep( 0.0, 0.06, depth ) ) * 0.7 );
  seaCol *= 0.8 + 0.4 * mm.y;
  vec3 surf = mix( seaCol, landCol, land );
  // Ice: bluer over the sea, with leads opening in it and old grey floes.
  float lead = pow( 1.0 - abs( 2.0 * fbm3( q * 5.5 + uSeed ) - 1.0 ), 22.0 ) * ( 1.0 - land );
  vec3 iceCol = uIceCol * ( 0.8 + 0.3 * fine ) * mix( vec3( 0.8, 0.9, 1.0 ) * ( 0.84 + 0.3 * mm.z ), vec3( 1.0 ), land );
  iceCol = mix( iceCol, uOceanShallow * 1.6 + uIceCol * 0.15, lead * 0.5 );
  #if TIER >= 1
  if ( uFrost > 0.001 ) {
    // A snowball: a net of cracks across the whole shell, ice blued where it is old and deep, and
    // the high ground scoured down to rock. Each is a fraction of the ice's own colour.
    float crack = pow( 1.0 - abs( 2.0 * fbm3( q * 3.4 + uSeed.zyx ) - 1.0 ), 14.0 );
    crack = max( crack, 0.6 * pow( 1.0 - abs( 2.0 * vnoise( q * 11.0 + uSeed.xyz ) - 1.0 ), 18.0 ) );
    float blue = smoothstep( 0.5, 0.78, mm.x );
    iceCol = mix( iceCol, vec3( 0.46, 0.66, 0.92 ) * uIceCol, 0.45 * blue * uFrost );
    iceCol = mix( iceCol, uIceCol * vec3( 0.2, 0.28, 0.42 ), 0.55 * crack * uFrost );
    iceCol = mix( iceCol, uLandDry * 0.85, 0.6 * uFrost * land * smoothstep( 0.72, 0.95, elev ) );
    iceCol *= 1.0 + 0.5 * dt * uFrost;
  }
  #endif
  surf = mix( surf, iceCol, ice );
  float water = ( 1.0 - land ) * ( 1.0 - ice );

  // Relief: ground that rises toward the star faces away from it. The sea is flat, the ice smoother.
  float relief = 0.0;
  #if TIER >= 1
  relief = ( max( ahead, sea ) - max( h, sea ) ) * 3.2 * uBump * ( 1.0 - ice * 0.5 );
  relief += dSlope * 1.1 * uBump * land * ( 1.0 - ice * 0.5 );
  #endif

  // The clouds, and the shade they throw toward the night side.
  vec3 c = uCloudFrame * N;
  float under = uLocked * 0.22 * smoothstep( 0.45, 1.0, q.x ); // the deck under the star
  float cl = cloudAt( c, under );
  float shade = 1.0;
  float clSun = cl;
  #if TIER >= 1
  {
    vec3 Lc = uCloudFrame * L;
    clSun = cloudShade( normalize( c + Lc * 0.028 ), under );
    shade = 1.0 - 0.62 * clSun * ( 1.0 - cl * 0.5 );
  }
  #endif

  // Light. A hard terminator, a little twilight carried round by the air.
  float lit = max( mu0, 0.0 ) * clamp( 1.0 - relief, 0.5, 1.4 );
  float dusk = smoothstep( -0.1, 0.03, mu0 ) * ( 1.0 - smoothstep( 0.0, 0.22, mu0 ) );
  vec3 sun = uLight * uGain * mix( vec3( 1.0 ), vec3( 1.0, 0.62, 0.38 ), uAtmK * exp( -max( mu0, 0.0 ) * 9.0 ) * 0.75 );
  vec3 col = surf * sun * ( lit * shade + 0.03 * dusk * uAtmK );

  // The star's glint on open water, wide and soft with a bright heart.
  float nv = max( dot( N, V ), 0.0 );
  if ( uSpec > 0.0 ) {
    vec3 H = normalize( L + V );
    float nh = max( dot( N, H ), 0.0 );
    float glint = pow( nh, 420.0 ) * 2.2 + pow( nh, 48.0 ) * 0.2;
    float fres = 0.04 + 0.96 * pow( 1.0 - nv, 5.0 );
    col += sun * water * uSpec * ( 1.0 - cl ) * shade * smoothstep( 0.0, 0.12, mu0 ) * ( glint + fres * 0.10 * lit );
    #if TIER >= 1
    // Smooth old ice shines faintly, a broad lobe and no heart.
    col += sun * ice * uFrost * 0.07 * pow( nh, 22.0 ) * ( 1.0 - cl ) * shade * smoothstep( 0.0, 0.12, mu0 );
    #endif
  }

  // Molten rock gives its own light, day or night: seams between the plates of a dark crust, and
  // open pools where the star stands highest.
  if ( uLava > 0.0 ) {
    float pn = fbm( q * 4.2 + uSeed.zyx + 9.0 );
    float seam = pow( 1.0 - abs( 2.0 * pn - 1.0 ), 9.0 );
    float pool = smoothstep( 0.56, 0.7, pn + uLocked * ( q.x - 0.35 ) * 0.2 + ( uLava - 0.7 ) * 0.12 );
    float seaHot = max( pool, seam * 0.85 );
    float landHot = seam * ( 1.0 - smoothstep( 0.1, 0.8, elev ) ) * 0.8;
    float hot = mix( seaHot, landHot, land ) * ( 0.75 + 0.5 * fine );
    vec3 glow = mix( vec3( 0.7, 0.045, 0.0 ), vec3( 1.25, 0.36, 0.04 ), smoothstep( 0.25, 0.85, hot ) );
    glow = mix( glow, vec3( 1.5, 0.9, 0.36 ), smoothstep( 0.9, 1.15, hot ) * pool );
    col += glow * hot * uLava * 1.1;
  }

  // Cloud over all of it: bright where it faces the star, grey in its own shade.
  float cloudLit = clamp( 0.74 + 1.1 * ( cl - clSun ), 0.4, 1.12 );
  vec3 cloudCol = uCloudCol * sun * ( max( mu0, 0.0 ) * cloudLit + 0.04 * dusk * uAtmK );
  col = mix( col, cloudCol, cl * 0.97 );

  #if TIER >= 2
  if ( uHigh > 0.001 ) {
    // Seen through its height: the ray to this point crosses the high deck a little to the side.
    vec3 Np = normalize( N + V * ( 0.02 / max( nv, 0.2 ) ) );
    float hi = highDeck( uCloudFrame2 * Np ) * 0.5 * uHigh * ( 0.6 + 0.4 * uHigh );
    // High up it keeps the light a little past the terminator, and it is white, not shaded.
    vec3 hiCol = uCloudCol * sun * ( max( mu0 + 0.07, 0.0 ) * 0.95 + 0.02 * dusk * uAtmK );
    col = mix( col, hiCol, hi );
  }
  #endif

  col = air( col, mu0, nv );
  gl_FragColor = vec4( col, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const GIANT_FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
${COMMON_UNIFORMS_GLSL}
uniform float uBandFreq;
uniform float uTurb;
uniform float uContrast;
uniform float uHaze;
uniform float uStreak;
uniform vec3 uBandA;
uniform vec3 uBandB;
uniform vec3 uBandC;
uniform vec3 uPole;
uniform vec3 uHazeCol;
uniform vec3 uStormCol;
uniform vec3 uGlow;
uniform vec4 uStorm[ 3 ];
${NOISE_GLSL}
${AIR_GLSL}

void main() {
  #include <logdepthbuf_fragment>
  vec3 N = normalize( vN );
  vec3 V = normalize( cameraPosition - vW );
  vec3 L = normalize( uSunDir );
  vec3 q = uCloudFrame * N;
  float mu = dot( N, L );
  float nv = max( dot( N, V ), 0.0 );

  // Storms turn the air round them before the bands are read, so a band bends past an oval.
  float spot = 0.0;
  for ( int i = 0; i < 3; i++ ) {
    vec4 s = uStorm[ i ];
    if ( s.w <= 0.0 ) continue;
    vec3 d3 = q - s.xyz;
    float d = length( vec3( d3.x, d3.y * 1.9, d3.z ) ) / s.w;
    float inside = exp( -d * d );
    #if TIER >= 1
    q = turn( q, s.xyz, 2.4 * inside );
    #endif
    spot = max( spot, smoothstep( 0.35, 0.8, inside ) );
  }

  // Bands: latitude, pushed about by slow turbulence, read through two scales of noise.
  float swirl = fbm3( vec3( q.x * 2.6, q.y * 7.0, q.z * 2.6 ) + uSeed );
  #if TIER >= 1
  float fest = fbm( vec3( q.x * 7.0, q.y * 16.0, q.z * 7.0 ) + uSeed.zxy );
  #else
  float fest = swirl;
  #endif
  float lat = q.y + uTurb * ( ( swirl - 0.5 ) * 0.1 + ( fest - 0.5 ) * 0.06 );
  #if TIER >= 1
  // Eddies along the edges of the bands: the latitude itself is stirred at a finer scale.
  vec3 eddy = fbm3v( vec3( q.x * 6.0, q.y * 13.0, q.z * 6.0 ) + uSeed.yxz );
  lat += uTurb * ( eddy.x - 0.5 ) * 0.05 * ( 0.4 + 1.2 * eddy.y );
  #endif
  float b1 = vnoise( vec3( uSeed.x, lat * uBandFreq, uSeed.z ) );
  float b2 = vnoise( vec3( uSeed.y, lat * uBandFreq * 2.9, uSeed.x ) );
  float b3 = vnoise( vec3( uSeed.z, lat * uBandFreq * 0.55, uSeed.y ) );
  float b4 = vnoise( vec3( uSeed.z, lat * uBandFreq * 7.3, uSeed.x ) );
  float band = smoothstep( 0.4, 0.6, b1 * 0.56 + b2 * 0.28 + b4 * 0.16 );
  band = mix( 0.5, band, uContrast );
  vec3 col = mix( uBandB, uBandA, band );
  col = mix( col, uBandC, smoothstep( 0.55, 0.85, b3 ) * 0.7 * uContrast );
  // Streaks drawn out along the bands, and bright cloud on the cold giants.
  float streak = fbm( vec3( q.x * 3.0, lat * 46.0, q.z * 3.0 ) + uSeed.yzx );
  col *= 0.86 + 0.28 * streak * ( 0.4 + 0.6 * uContrast );
  #if TIER >= 1
  // Close up: finer streaks along the bands, only once the disc is large.
  if ( uDetail > 0.001 ) {
    col *= 1.0 + uDetail * ( 0.34 * ( vnoise( vec3( q.x * 30.0, lat * 190.0, q.z * 30.0 ) + uSeed.zxy ) - 0.5 ) + 0.2 * ( vnoise( vec3( q.x * 80.0, lat * 420.0, q.z * 80.0 ) + uSeed.yzx ) - 0.5 ) );
  }
  #endif
  col += vec3( 0.5 ) * uStreak * smoothstep( 0.66, 0.8, fbm3( vec3( q.x * 4.0, lat * 30.0, q.z * 4.0 ) + uSeed ) );
  col = mix( col, uPole, smoothstep( 0.72, 0.98, abs( q.y ) ) * 0.8 );
  col = mix( col, uStormCol, spot * 0.85 );
  col += uBandC * 0.25 * smoothstep( 0.05, 0.3, spot ) * ( 1.0 - smoothstep( 0.3, 0.7, spot ) );
  col = mix( col, uHazeCol, uHaze * ( 0.5 + 0.5 * pow( 1.0 - nv, 1.5 ) ) );

  // A deep air darkens toward the limb and lets the terminator in softly.
  float lit = smoothstep( -0.06, 1.0, mu );
  lit = pow( lit, 0.9 ) * ( 0.62 + 0.38 * nv );
  vec3 sun = uLight * uGain * mix( vec3( 1.0 ), vec3( 1.0, 0.66, 0.42 ), exp( -max( mu, 0.0 ) * 5.0 ) * 0.7 );
  vec3 outCol = col * sun * lit;
  // Its own heat, on the hottest: brightest where the star stands overhead.
  outCol += uGlow * ( 0.35 + 0.9 * band ) * ( 0.3 + 0.7 * smoothstep( -0.9, 0.8, mix( 0.0, dot( N, L ), uLocked ) ) );
  outCol = air( outCol, mu, nv );
  gl_FragColor = vec4( outCol, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// The limb's glow, outside the disc: a shell a little larger than the planet, added to the sky.
// For each pixel, how near the line of sight passes the surface decides how much air it crosses.
export const HALO_SCALE = 1.07;
export const HALO_FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uSunDir;
uniform vec3 uAtm;
uniform vec3 uLight;
uniform float uAtmK;
uniform float uGain;
uniform float uThick;
varying vec3 vW;
varying vec3 vC;
varying float vR;
void main() {
  #include <logdepthbuf_fragment>
  float R = vR / ${HALO_SCALE.toFixed(2)};
  vec3 D = normalize( vW - cameraPosition );
  vec3 cc = cameraPosition - vC;
  vec3 near = cc - dot( cc, D ) * D;          // the point of the line of sight nearest the centre
  float b = length( near ) / R;               // ... in planet radii
  float h = b - 1.0;
  float glow = h >= 0.0 ? exp( -h / uThick ) : exp( h / ( uThick * 0.3 ) );
  glow *= 1.0 - smoothstep( ${(1 + (HALO_SCALE - 1) * 0.45).toFixed(4)}, ${HALO_SCALE.toFixed(2)}, b );
  float mu = dot( normalize( near ), normalize( uSunDir ) );
  float dayA = smoothstep( -0.2, 0.14, mu );
  float dusk = exp( -abs( mu + 0.03 ) * 11.0 );
  vec3 scat = mix( uAtm, uAtm.bgr * vec3( 1.5, 0.8, 0.55 ) + vec3( 0.08, 0.02, 0.0 ) * uLight, dusk * 0.45 );
  vec3 col = scat * glow * dayA * uAtmK * uGain * 1.9;
  gl_FragColor = vec4( col, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// --- the object ----------------------------------------------------------------------------------

/** What each tier compiles: octaves, cyclones, and whether the limb's glow (a second draw) exists. */
export const FACE_TIERS = [
  { tier: 0, octaves: 4, cyclones: 0, halo: false, drawCalls: 1 },
  { tier: 1, octaves: 5, cyclones: 3, halo: true, drawCalls: 2 },
  { tier: 2, octaves: 6, cyclones: 5, halo: true, drawCalls: 2 },
];

let NOISE = null;
/** The lattice the shaders read: 64^3 random bytes in four channels, built once, never fetched. */
export function noiseTexture() {
  if (NOISE) return NOISE;
  const n = 64;
  const data = new Uint8Array(n * n * n * 4);
  const rnd = rng(0x5eed1e55);
  for (let i = 0; i < data.length; i++) data[i] = (rnd() * 256) | 0;
  NOISE = new THREE.Data3DTexture(data, n, n, n);
  NOISE.format = THREE.RGBAFormat;
  NOISE.type = THREE.UnsignedByteType;
  NOISE.minFilter = THREE.LinearFilter;
  NOISE.magFilter = THREE.LinearFilter;
  NOISE.wrapS = NOISE.wrapT = NOISE.wrapR = THREE.RepeatWrapping;
  NOISE.unpackAlignment = 1;
  NOISE.needsUpdate = true;
  return NOISE;
}

const GEOMETRY = {};
/** One unit sphere per level of detail, shared by every face: near (a disc that fills the screen) and far. */
export function faceGeometry(near) {
  const key = near === 'halo' ? 'halo' : near ? 'near' : 'far';
  if (!GEOMETRY[key]) GEOMETRY[key] = near === 'halo' ? new THREE.SphereGeometry(1, 64, 32) : near ? new THREE.SphereGeometry(1, 160, 80) : new THREE.SphereGeometry(1, 32, 16);
  return GEOMETRY[key];
}
/**
 * How much of the fine octaves a disc of this radius, in pixels, shows: 0 below DETAIL_FROM_PX, 1 from
 * DETAIL_FULL_PX, a smoothstep between. The shader's `uDetail`; its fine lattice is 70 and 170 cells
 * to the globe, which is a few pixels a cell only once the disc is this large.
 */
export const DETAIL_FROM_PX = 160;
export const DETAIL_FULL_PX = 520;
export function detailFor(radiusPx) {
  const x = clamp((Number(radiusPx) - DETAIL_FROM_PX) / (DETAIL_FULL_PX - DETAIL_FROM_PX), 0, 1);
  return Number.isFinite(x) ? x * x * (3 - 2 * x) : 0;
}

/** A disc this many pixels in radius, or more, is drawn with the near sphere. */
export const NEAR_RADIUS_PX = 40;
/** The on-canvas tag shows once the disc is this many pixels in radius. */
export const TAG_RADIUS_PX = 56;

const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const v4 = (a) => new THREE.Vector4(a[0], a[1], a[2], a[3]);

/** The sea's height in the terrain's 0..1 for a share of the globe under water (fitted to terrain()). */
export function seaLevelFor(share) {
  if (share <= 0) return 0;
  // terrain() is a stretched fbm: its median is 0.5 and a tenth of the globe lies above 0.77.
  return clamp(0.5 + (share - 0.5) * 0.53, 0.02, 0.98);
}

export function faceUniforms(face) {
  const k = face.look;
  const u = {
    uSunDir: { value: new THREE.Vector3(1, 0, 0) },
    uLight: { value: v3(face.star.light) },
    uAtm: { value: v3(k.atm) },
    uAtmK: { value: k.atmK },
    uGain: { value: 1.55 * (k.gain || 1) },
    uFrame: { value: new THREE.Matrix3() },
    uCloudFrame: { value: new THREE.Matrix3() },
    uSeed: { value: v3(k.seed) },
    uLocked: { value: k.locked },
    uDetail: { value: 0 },
    uNoise: { value: noiseTexture() },
  };
  if (face.kind === 'giant') {
    Object.assign(u, {
      uBandFreq: { value: k.bandFreq }, uTurb: { value: k.turb }, uContrast: { value: k.contrast },
      uHaze: { value: k.haze }, uStreak: { value: k.streak },
      uBandA: { value: v3(k.bandA) }, uBandB: { value: v3(k.bandB) }, uBandC: { value: v3(k.bandC) },
      uPole: { value: v3(k.pole) }, uHazeCol: { value: v3(k.hazeCol) }, uStormCol: { value: v3(k.stormCol) },
      uGlow: { value: v3(k.glow) }, uStorm: { value: k.storms.map(v4) },
    });
  } else {
    Object.assign(u, {
      uSea: { value: seaLevelFor(k.ocean) }, uIce: { value: k.ice }, uCloud: { value: k.cloud },
      uLava: { value: k.lava }, uGreen: { value: k.green }, uSpec: { value: k.spec }, uBump: { value: k.bump },
      uOceanDeep: { value: v3(k.oceanDeep) }, uOceanShallow: { value: v3(k.oceanShallow) },
      uLandLow: { value: v3(k.landLow) }, uLandDry: { value: v3(k.landDry) }, uLandHigh: { value: v3(k.landHigh) },
      uIceCol: { value: v3(k.iceCol) }, uCloudCol: { value: v3(k.cloudCol) }, uCyc: { value: k.cyclones.map(v4) },
      uCloudFrame2: { value: new THREE.Matrix3() }, uHigh: { value: k.high || 0 }, uFrost: { value: k.frost || 0 },
    });
  }
  return u;
}

function faceMaterial(face, tier) {
  const T = FACE_TIERS[clamp(tier | 0, 0, 2)];
  return new THREE.ShaderMaterial({
    name: 'exoface-' + face.kind + '-t' + T.tier,
    vertexShader: FACE_VERT,
    fragmentShader: face.kind === 'giant' ? GIANT_FRAG : ROCKY_FRAG,
    uniforms: faceUniforms(face),
    defines: { TIER: T.tier, OCT: T.octaves, NCYC: Math.max(1, T.cyclones) },
  });
}

function haloMesh(face, material) {
  const u = material.uniforms;
  const mat = new THREE.ShaderMaterial({
    name: 'exoface-halo',
    vertexShader: FACE_VERT,
    fragmentShader: HALO_FRAG,
    uniforms: {
      uSunDir: u.uSunDir, uAtm: u.uAtm, uLight: u.uLight, uAtmK: u.uAtmK, uGain: u.uGain,
      uThick: { value: face.cls === 'miniNeptune' ? 0.022 : face.kind === 'giant' ? 0.014 : 0.011 },
    },
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  // Its own edge is where the glow has already faded to nothing, so a coarse sphere will do.
  const mesh = new THREE.Mesh(faceGeometry('halo'), mat);
  mesh.name = 'exoface:halo';
  mesh.scale.setScalar(HALO_SCALE);
  mesh.renderOrder = 2;
  return mesh;
}

function cssVar(name, fallback) {
  try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback; } catch { return fallback; }
}

/** "Artist's impression", on the canvas, in the label face with the scene labels' dark halo. */
function tagSprite(text) {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const canvas = document.createElement('canvas');
  const c0 = canvas.getContext && canvas.getContext('2d');
  if (!c0) return null;
  const px = 26; // drawn at twice the 13 px it is shown at
  const font = `500 ${px}px ${cssVar('--sr-font', 'Inter, system-ui, sans-serif')}`;
  c0.font = font;
  canvas.width = Math.ceil(c0.measureText(text).width) + 16;
  canvas.height = px + 16;
  const c = canvas.getContext('2d');
  c.font = font;
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = 4;
  c.strokeStyle = cssVar('--sr-space', '#0b0e14');
  c.strokeText(text, 8, canvas.height / 2);
  c.fillStyle = cssVar('--sr-text', '#e8ecf2');
  c.fillText(text, 8, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, sizeAttenuation: false }));
  sprite.name = 'exoface:tag';
  sprite.userData.aspect = canvas.width / canvas.height;
  sprite.userData.cssPx = canvas.height / 2;
  sprite.center.set(0.5, 1);
  sprite.renderOrder = 5;
  sprite.visible = false;
  return sprite;
}

const _ex = new THREE.Vector3();
const _ey = new THREE.Vector3();
const _ez = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _up = new THREE.Vector3();

/** Seconds for the ground to turn once, and the clouds' drift over it: illustrative, by the wall clock. */
export const SPIN_SECONDS = 360;
export const CLOUD_DRIFT_SECONDS = 1500;
/** The thin high deck drifts faster than the thick low one, which is what lets the two part at the limb. */
export const HIGH_DRIFT_SECONDS = 900;

function setFrame(m3, ex, ey, ez) {
  m3.set(ex.x, ex.y, ex.z, ey.x, ey.y, ey.z, ez.x, ez.y, ez.z);
}

/**
 * Dress a unit-sphere mesh in a face. The mesh keeps its place and scale; this gives it the face's
 * material and geometry and, as children, the limb's glow (tiers 1 and 2) and the tag.
 * `update({ camera, sunDir, north, timeS, viewportH })` is called once a frame.
 */
export function applyFace(mesh, face, opts = {}) {
  let tier = clamp(opts.tier | 0, 0, 2);
  const label = faceLabel(face);
  let material = faceMaterial(face, tier);
  let halo = FACE_TIERS[tier].halo ? haloMesh(face, material) : null;
  const tag = opts.tag === false ? null : tagSprite(label.tag);
  mesh.material = material;
  mesh.geometry = faceGeometry(false);
  if (halo) mesh.add(halo);
  if (tag) mesh.add(tag);
  mesh.userData.exoface = { face, label };
  const k = face.look;
  const tilt = (k.tiltDeg * Math.PI) / 180;

  function update(o = {}) {
    const u = material.uniforms;
    const L = o.sunDir || u.uSunDir.value;
    if (o.sunDir) u.uSunDir.value.copy(L).normalize();
    const north = o.north || _up.set(0, 1, 0);
    const still = !!o.still;
    const timeS = still ? 0 : Number(o.timeS) || 0;
    if (k.locked) {
      // One face to the star: x is the star, y the orbit's pole squared off against it.
      _ex.copy(u.uSunDir.value);
      _ey.copy(north).addScaledVector(_ex, -north.dot(_ex));
      if (_ey.lengthSq() < 1e-8) _ey.set(0, 0, 1).addScaledVector(_ex, -_ex.z);
      _ey.normalize();
      _ez.crossVectors(_ex, _ey);
      setFrame(u.uFrame.value, _ex, _ey, _ez);
      // The air turns slowly about the line to the star.
      const a = (timeS / CLOUD_DRIFT_SECONDS) * Math.PI * 2;
      _a.copy(_ey).multiplyScalar(Math.cos(a)).addScaledVector(_ez, Math.sin(a));
      _b.crossVectors(_ex, _a);
      setFrame(u.uCloudFrame.value, _ex, _a, _b);
      if (u.uCloudFrame2) {
        const a2 = (timeS / HIGH_DRIFT_SECONDS) * Math.PI * 2 + 1.1;
        _a.copy(_ey).multiplyScalar(Math.cos(a2)).addScaledVector(_ez, Math.sin(a2));
        _b.crossVectors(_ex, _a);
        setFrame(u.uCloudFrame2.value, _ex, _a, _b);
      }
    } else {
      // A pole tipped from the orbit's by the seed's tilt, and a turn about it.
      _ey.copy(north).normalize();
      _a.set(1, 0, 0); if (Math.abs(_ey.x) > 0.9) _a.set(0, 0, 1);
      _ex.copy(_a).addScaledVector(_ey, -_a.dot(_ey)).normalize();
      _ey.multiplyScalar(Math.cos(tilt)).addScaledVector(_ex, Math.sin(tilt)).normalize();
      _ex.copy(_a).addScaledVector(_ey, -_a.dot(_ey)).normalize();
      _ez.crossVectors(_ex, _ey);
      const spin = k.spin0 + (timeS / SPIN_SECONDS) * Math.PI * 2;
      _a.copy(_ex).multiplyScalar(Math.cos(spin)).addScaledVector(_ez, Math.sin(spin));
      _b.crossVectors(_a, _ey);
      setFrame(u.uFrame.value, _a, _ey, _b);
      const drift = spin + (timeS / CLOUD_DRIFT_SECONDS) * Math.PI * 2;
      _a.copy(_ex).multiplyScalar(Math.cos(drift)).addScaledVector(_ez, Math.sin(drift));
      _b.crossVectors(_a, _ey);
      setFrame(u.uCloudFrame.value, _a, _ey, _b);
      if (u.uCloudFrame2) {
        const drift2 = spin + (timeS / HIGH_DRIFT_SECONDS) * Math.PI * 2 + 1.1;
        _a.copy(_ex).multiplyScalar(Math.cos(drift2)).addScaledVector(_ez, Math.sin(drift2));
        _b.crossVectors(_a, _ey);
        setFrame(u.uCloudFrame2.value, _a, _ey, _b);
      }
    }
    const cam = o.camera;
    if (cam) {
      const dist = Math.max(cam.position.distanceTo(mesh.position), 1e-9);
      const viewportH = o.viewportH || 800;
      const lens = 2 * Math.tan(((cam.fov || 45) * Math.PI) / 360) / (cam.zoom || 1);
      const pxPerRad = viewportH / lens;
      const radiusPx = (mesh.scale.x / dist) * pxPerRad;
      const near = radiusPx >= NEAR_RADIUS_PX;
      const g = faceGeometry(near);
      if (mesh.geometry !== g) mesh.geometry = g;
      if (halo) halo.visible = near;
      if (tag) {
        tag.visible = o.tag !== false && radiusPx >= TAG_RADIUS_PX;
        if (tag.visible) {
          // Under the disc, on the screen: the camera's own "down", in the mesh's units.
          _a.set(0, 1, 0).applyQuaternion(cam.quaternion);
          tag.position.copy(_a).multiplyScalar(-(HALO_SCALE + 0.03));
          // A sprite that keeps its size is scaled by its parent all the same: divide that out.
          const hh = ((tag.userData.cssPx / viewportH) * lens) / mesh.scale.x;
          tag.scale.set(hh * tag.userData.aspect, hh, 1);
        }
      }
      handle.radiusPx = radiusPx;
      if (u.uDetail) u.uDetail.value = detailFor(radiusPx);
    }
  }

  function setTier(n) {
    const next = clamp(n | 0, 0, 2);
    if (next === tier) return;
    tier = next;
    const old = material;
    material = faceMaterial(face, tier);
    for (const key of ['uSunDir', 'uFrame', 'uCloudFrame', 'uCloudFrame2']) if (old.uniforms[key]) material.uniforms[key].value.copy(old.uniforms[key].value);
    material.uniforms.uDetail.value = old.uniforms.uDetail.value;
    mesh.material = material;
    old.dispose();
    if (halo) { mesh.remove(halo); halo.material.dispose(); halo = null; }
    if (FACE_TIERS[tier].halo) { halo = haloMesh(face, material); mesh.add(halo); }
    handle.material = material;
    handle.halo = halo;
  }

  function dispose() {
    material.dispose();
    if (halo) { mesh.remove(halo); halo.material.dispose(); }
    if (tag) { mesh.remove(tag); tag.material.map.dispose(); tag.material.dispose(); }
    delete mesh.userData.exoface;
  }

  const handle = { mesh, face, label, material, halo, tag, update, setTier, dispose, radiusPx: 0, get tier() { return tier; }, get drawCalls() { return 1 + (halo && halo.visible ? 1 : 0); } };
  update({});
  return handle;
}

/** A face on a mesh of its own: a unit sphere to place and scale. */
export function createFace(face, opts = {}) {
  const mesh = new THREE.Mesh(faceGeometry(false), undefined);
  mesh.name = 'exoface:' + (face.name || 'world');
  return applyFace(mesh, face, opts);
}

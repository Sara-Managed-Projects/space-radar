// sky/lookfor.js -- what is up from one place at one instant, for a trip stop that looks at it.
//
// Exports (all pure: a place, an instant, numbers out; no DOM, no three.js, no clock of its own):
//   deepNightMs(place, nowMs)          the first full dark of that night (the Sun 18 degrees down)
//   midnightMs(place, nowMs)           the middle of that night
//   tonightMs(place, nowMs)            the instant "tonight" means from here: now when the sky is
//                                      already dark, else the coming dusk
//   nightWindow(place, ms)             { fromMs, untilMs } of the dark that holds, or follows, ms
//   altAzOfBody(id, place, ms)         { altDeg, azDeg } of the Sun, the Moon or a planet
//   altAzOfSky(raDeg, decDeg, place, ms)
//   moonAt(place, ms)                  { altDeg, azDeg, percent, riseMs }
//   planetTonight(id, place, ms)       when and where one planet is in that night's dark sky
//   bestPlanet / bestStar / bestFigure the one a beginner should be pointed at, at that instant
//   bestMilkyWay(place, ms)            the stretch of the Milky Way best placed at that instant
//   lookTarget(look, place, ms, pass)  a stop's `look:` resolved to where the head turns
//
// WHY IT EXISTS (2026-10-06). Two trips end, or happen, on the visitor's own ground: "Tonight from
// your street" and "The planets tonight". Their stops cannot be written as places in the sky,
// because the sky over Lagos at nine is not the sky over Oslo at nine, and a registry row is the
// same row for both. So a stop says WHAT to look for (`look: {world: moon}`, `{best: planet}`) and
// this file answers where that is, for whoever is asking. ui/trip.js turns the answer into the
// sky view's heading and into the generated line under the stop's words.
//
// Everything is astronomy-engine's (vendor/astronomy.js), the library sky/skyview.js and
// sky/tonight.js already solve the Sun and the Moon with, so the three cannot disagree. Refraction
// is `normal`, as theirs is. The stars' places are J2000 (twenty-six years of precession is a
// third of a degree, far inside a head turn).

import * as Astronomy from '../../vendor/astronomy.js';

const DEG = 180 / Math.PI;
const HOUR = 3600e3;
const DAY = 24 * HOUR;

/** Civil dusk: the Sun six degrees down. sky/tonight.js darkness() draws the same line. */
export const DARK_SUN_ALT_DEG = -6;
/** Lower than this and a planet is in the murk a beginner will not find it in. */
export const LOW_ALT_DEG = 8;
/** Nearer the Sun than this and a planet is lost in its glare whatever the hour. */
export const GLARE_ELONGATION_DEG = 12;
const SAMPLE_MS = 10 * 60e3;

/** The planets a `look:` or a `live_note: tonight` may name, in order from the Sun. */
export const PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
/** The ones a person can find with their eyes: the others are never offered as "the bright one". */
export const NAKED_EYE_PLANETS = ['venus', 'jupiter', 'mars', 'saturn', 'mercury'];

const BODY = {
  sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter',
  saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune',
};

// The brightest stars of both hemispheres, brightest first: name, J2000 right ascension and
// declination in degrees, visual magnitude (Hipparcos, as in site/data/stars3d.names.json).
export const BRIGHT_STARS = [
  { name: 'Sirius', ra: 101.287, dec: -16.716, mag: -1.46 },
  { name: 'Canopus', ra: 95.988, dec: -52.696, mag: -0.74 },
  { name: 'Alpha Centauri', ra: 219.902, dec: -60.834, mag: -0.27 },
  { name: 'Arcturus', ra: 213.915, dec: 19.182, mag: -0.05 },
  { name: 'Vega', ra: 279.235, dec: 38.784, mag: 0.03 },
  { name: 'Capella', ra: 79.172, dec: 45.998, mag: 0.08 },
  { name: 'Rigel', ra: 78.634, dec: -8.202, mag: 0.13 },
  { name: 'Procyon', ra: 114.825, dec: 5.225, mag: 0.34 },
  { name: 'Achernar', ra: 24.429, dec: -57.237, mag: 0.46 },
  { name: 'Betelgeuse', ra: 88.793, dec: 7.407, mag: 0.5 },
  { name: 'Hadar', ra: 210.956, dec: -60.373, mag: 0.61 },
  { name: 'Altair', ra: 297.696, dec: 8.868, mag: 0.77 },
  { name: 'Aldebaran', ra: 68.98, dec: 16.509, mag: 0.85 },
  { name: 'Antares', ra: 247.352, dec: -26.432, mag: 0.96 },
  { name: 'Spica', ra: 201.298, dec: -11.161, mag: 0.97 },
  { name: 'Pollux', ra: 116.329, dec: 28.026, mag: 1.14 },
  { name: 'Fomalhaut', ra: 344.413, dec: -29.622, mag: 1.16 },
  { name: 'Deneb', ra: 310.358, dec: 45.28, mag: 1.25 },
  { name: 'Regulus', ra: 152.093, dec: 11.967, mag: 1.35 },
];

// The figures a beginner can find, each by the middle of its bright stars. `id` is the IAU
// abbreviation site/data/constellations.lines.json uses, so the sky view's own lines are these.
export const FAMOUS_FIGURES = [
  { id: 'Ori', name: 'Orion', ra: 83.8, dec: 0 },
  { id: 'UMa', name: 'the Plough', ra: 186, dec: 56 },
  { id: 'Cas', name: 'Cassiopeia', ra: 15, dec: 60 },
  { id: 'Sco', name: 'the Scorpion', ra: 253, dec: -32 },
  { id: 'Cru', name: 'the Southern Cross', ra: 187, dec: -60 },
  { id: 'Leo', name: 'the Lion', ra: 160, dec: 17 },
  { id: 'Cyg', name: 'the Swan', ra: 307, dec: 40 },
  { id: 'Tau', name: 'the Bull', ra: 66, dec: 18 },
  { id: 'Gem', name: 'the Twins', ra: 107, dec: 25 },
  { id: 'Sgr', name: 'the Teapot', ra: 283, dec: -28 },
  { id: 'Peg', name: 'the Great Square of Pegasus', ra: 345, dec: 20 },
  { id: 'CMa', name: 'the Great Dog', ra: 104, dec: -22 },
];

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** An astronomy-engine observer for a place written any of the ways the app writes one, or null. */
export function observerOf(place) {
  if (!place) return null;
  const lat = isNum(place.latDeg) ? place.latDeg : isNum(place.latRad) ? place.latRad * DEG : NaN;
  const lon = isNum(place.lonDeg) ? place.lonDeg : isNum(place.lonRad) ? place.lonRad * DEG : NaN;
  if (!isNum(lat) || !isNum(lon)) return null;
  return new Astronomy.Observer(lat, lon, 0);
}

function horizonOf(body, obs, date) {
  const eq = Astronomy.Equator(body, date, obs, true, true);
  const h = Astronomy.Horizon(date, obs, eq.ra, eq.dec, 'normal');
  return { altDeg: h.altitude, azDeg: h.azimuth };
}

/** Where the Sun, the Moon or a planet is from `place` at `ms`, or null for a name it does not know. */
export function altAzOfBody(id, place, ms) {
  const obs = observerOf(place);
  const body = BODY[String(id || '').toLowerCase()];
  if (!obs || !body || !isNum(ms)) return null;
  try {
    return horizonOf(Astronomy.Body[body], obs, new Date(ms));
  } catch {
    return null;
  }
}

/** Where a direction on the sky (J2000 degrees) is from `place` at `ms`. */
export function altAzOfSky(raDeg, decDeg, place, ms) {
  const obs = observerOf(place);
  if (!obs || !isNum(raDeg) || !isNum(decDeg) || !isNum(ms)) return null;
  try {
    const h = Astronomy.Horizon(new Date(ms), obs, (((raDeg % 360) + 360) % 360) / 15, decDeg, 'normal');
    return { altDeg: h.altitude, azDeg: h.azimuth };
  } catch {
    return null;
  }
}

/**
 * The dark that holds `ms`, or the next one: from the Sun passing six degrees down in the evening
 * to its coming back up through it. `never: true` where the Sun does not get that low within a day
 * (a high-latitude summer), and then the window is the day from `ms`, said so.
 */
export function nightWindow(place, ms) {
  const obs = observerOf(place);
  if (!obs || !isNum(ms)) return null;
  const at = new Date(ms);
  try {
    const sun = horizonOf(Astronomy.Body.Sun, obs, at);
    if (sun.altDeg < DARK_SUN_ALT_DEG) {
      const dawn = Astronomy.SearchAltitude(Astronomy.Body.Sun, obs, +1, at, 1, DARK_SUN_ALT_DEG);
      const dusk = Astronomy.SearchAltitude(Astronomy.Body.Sun, obs, -1, new Date(ms - DAY), 1, DARK_SUN_ALT_DEG);
      return {
        fromMs: dusk ? Math.min(dusk.date.getTime(), ms) : ms,
        untilMs: dawn ? dawn.date.getTime() : ms + 12 * HOUR,
        darkNow: true,
        never: false,
      };
    }
    const dusk = Astronomy.SearchAltitude(Astronomy.Body.Sun, obs, -1, at, 1, DARK_SUN_ALT_DEG);
    if (!dusk) return { fromMs: ms, untilMs: ms + DAY, darkNow: false, never: true };
    const dawn = Astronomy.SearchAltitude(Astronomy.Body.Sun, obs, +1, dusk.date, 1, DARK_SUN_ALT_DEG);
    return {
      fromMs: dusk.date.getTime(),
      untilMs: dawn ? dawn.date.getTime() : dusk.date.getTime() + 12 * HOUR,
      darkNow: false,
      never: false,
    };
  } catch {
    return null;
  }
}

/**
 * "Tonight", as an instant: now when the sky is already dark, else three quarters of an hour into
 * the coming dark (the Sun six degrees down is dusk, and the first stars need a little longer).
 * Where it never gets dark this week, now: the stop shows the sky that is there.
 */
export function tonightMs(place, nowMs) {
  const w = nightWindow(place, nowMs);
  if (!w || w.darkNow || w.never) return isNum(nowMs) ? nowMs : null;
  return Math.min(w.fromMs + 45 * 60e3, (w.fromMs + w.untilMs) / 2);
}

/** Full night: the Sun eighteen degrees down, when the sky is as dark as that place gets. */
export const DEEP_SUN_ALT_DEG = -18;

/**
 * "The dead of tonight", as an instant: the first moment of the coming night (or of this one, when
 * it is already dark) with the Sun eighteen degrees down, and where it never gets that far (a
 * summer night at 55 degrees north) the moment the Sun is lowest. For a stop about how dark a sky
 * can be: at dusk, which is what `tonight` means, the Milky Way is not out yet anywhere.
 */
export function deepNightMs(place, nowMs) {
  const start = tonightMs(place, nowMs);
  if (!isNum(start) || !observerOf(place)) return isNum(nowMs) ? nowMs : null;
  let best = null;
  for (let ms = start; ms <= start + 14 * HOUR; ms += SAMPLE_MS) {
    const sun = altAzOfBody('sun', place, ms);
    if (!sun) break;
    if (sun.altDeg <= DEEP_SUN_ALT_DEG) return ms;
    if (!best || sun.altDeg < best.alt) best = { ms, alt: sun.altDeg };
    else if (sun.altDeg > best.alt + 2) break; // past the bottom of the night and climbing
  }
  return best ? best.ms : start;
}

/**
 * The middle of the coming night (or of this one): for a meteor shower, whose radiant is highest,
 * and whose side of the Earth faces the way it travels, in the small hours. Where it never gets
 * dark this week, now.
 */
export function midnightMs(place, nowMs) {
  const w = nightWindow(place, nowMs);
  if (!w || w.never) return isNum(nowMs) ? nowMs : null;
  const mid = (w.fromMs + w.untilMs) / 2;
  return w.darkNow && isNum(nowMs) && nowMs > mid ? nowMs : mid;
}

/** The Moon from `place` at `ms`: where, how much of it is lit, and when it next rises if it is down. */
export function moonAt(place, ms) {
  const obs = observerOf(place);
  const at = altAzOfBody('moon', place, ms);
  if (!obs || !at) return null;
  let percent = null;
  let riseMs = null;
  try {
    percent = Math.round(Astronomy.Illumination(Astronomy.Body.Moon, new Date(ms)).phase_fraction * 100);
    if (at.altDeg <= 0) {
      const rise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, obs, +1, new Date(ms), 1.2);
      riseMs = rise ? rise.date.getTime() : null;
    }
  } catch { /* the place and the instant are still good; the phase is left out */ }
  return { ...at, percent, riseMs, up: at.altDeg > 0 };
}

/**
 * One planet in the night that holds, or follows, `ms`: `{ visible, fromMs, untilMs, bestMs,
 * bestAltDeg, bestAzDeg, mag, elongationDeg, why }`. Visible means above LOW_ALT_DEG at some
 * moment of the dark and farther than GLARE_ELONGATION_DEG from the Sun; when it is not, `why`
 * is 'glare' or 'down'. Sampled every ten minutes: a rise time to ten minutes is what a person
 * walking outside needs, and it is a hundred cheap solves rather than a root search per planet.
 */
export function planetTonight(id, place, ms) {
  const obs = observerOf(place);
  const name = BODY[String(id || '').toLowerCase()];
  const w = nightWindow(place, ms);
  if (!obs || !name || !w || !PLANETS.includes(String(id).toLowerCase())) return null;
  const body = Astronomy.Body[name];
  const out = { id: String(id).toLowerCase(), visible: false, fromMs: null, untilMs: null, bestMs: null, bestAltDeg: null, bestAzDeg: null, mag: null, elongationDeg: null, why: null, never: w.never };
  try {
    const mid = new Date((w.fromMs + w.untilMs) / 2);
    out.elongationDeg = Astronomy.AngleFromSun(body, mid);
    out.mag = Astronomy.Illumination(body, mid).mag;
    if (out.elongationDeg < GLARE_ELONGATION_DEG) {
      out.why = 'glare';
      return out;
    }
    for (let t = w.fromMs; t <= w.untilMs; t += SAMPLE_MS) {
      const d = new Date(t);
      // In a night that never gets dark the window is the whole day: only its sunless part counts.
      if (w.never && horizonOf(Astronomy.Body.Sun, obs, d).altDeg > 0) continue;
      const h = horizonOf(body, obs, d);
      if (h.altDeg < LOW_ALT_DEG) continue;
      if (out.fromMs === null) out.fromMs = t;
      out.untilMs = t;
      if (out.bestAltDeg === null || h.altDeg > out.bestAltDeg) {
        out.bestAltDeg = h.altDeg;
        out.bestAzDeg = h.azDeg;
        out.bestMs = t;
      }
    }
  } catch {
    return null;
  }
  out.visible = out.bestMs !== null;
  if (!out.visible) out.why = 'down';
  return out;
}

/** The brightest naked-eye planet above LOW_ALT_DEG from `place` at `ms`, or null. */
export function bestPlanet(place, ms) {
  let best = null;
  for (const id of NAKED_EYE_PLANETS) {
    const at = altAzOfBody(id, place, ms);
    if (!at || at.altDeg < LOW_ALT_DEG) continue;
    let mag = 0;
    let far = 180;
    try {
      const d = new Date(ms);
      mag = Astronomy.Illumination(Astronomy.Body[BODY[id]], d).mag;
      far = Astronomy.AngleFromSun(Astronomy.Body[BODY[id]], d);
    } catch { /* ranked as magnitude 0 */ }
    if (far < GLARE_ELONGATION_DEG) continue;
    if (!best || mag < best.mag) best = { id, ...at, mag };
  }
  return best;
}

/** The brightest of BRIGHT_STARS above LOW_ALT_DEG from `place` at `ms`, or null (never, in practice). */
export function bestStar(place, ms) {
  for (const star of BRIGHT_STARS) {
    const at = altAzOfSky(star.ra, star.dec, place, ms);
    if (at && at.altDeg >= LOW_ALT_DEG) return { name: star.name, mag: star.mag, ...at };
  }
  return null;
}

/** The FAMOUS_FIGURES row highest in the sky from `place` at `ms`, if one is 15 degrees up; or null. */
export function bestFigure(place, ms) {
  let best = null;
  for (const fig of FAMOUS_FIGURES) {
    const at = altAzOfSky(fig.ra, fig.dec, place, ms);
    if (!at || at.altDeg < 15) continue;
    // The highest that is not straight overhead: a figure at the zenith is the hardest to face.
    const score = at.altDeg > 75 ? 150 - at.altDeg : at.altDeg;
    if (!best || score > best.score) best = { id: fig.id, name: fig.name, score, ...at };
  }
  return best;
}

// The Milky Way's band, as the stretches a person can be pointed at: a figure it runs through and
// a point on the galactic equator there (J2000 degrees). `rich` is how much there is to see, the
// centre in Sagittarius most and the thin outer band through Auriga least; it breaks a tie between
// two stretches that are both well up, and never lifts one that is low over one that is high.
export const MILKY_WAY = [
  { name: 'Sagittarius', ra: 271, dec: -24, rich: 3 },
  { name: 'the Eagle', ra: 287, dec: 6, rich: 2 },
  { name: 'the Swan', ra: 306, dec: 40, rich: 2.5 },
  { name: 'Cassiopeia', ra: 10, dec: 62, rich: 1.5 },
  { name: 'Perseus and the Charioteer', ra: 75, dec: 42, rich: 1 },
  { name: 'Orion\u2019s raised arm and the Twins\u2019 feet', ra: 95, dec: 18, rich: 1 },
  { name: 'the Stern, east of the Great Dog', ra: 118, dec: -27, rich: 1.5 },
  { name: 'the Keel', ra: 160, dec: -59, rich: 2.5 },
  { name: 'the Southern Cross', ra: 190, dec: -62, rich: 2.5 },
  { name: 'the Scorpion\u2019s tail', ra: 255, dec: -40, rich: 3 },
];

/** The MILKY_WAY stretch best placed from `place` at `ms`, if one is 20 degrees up; or null. */
export function bestMilkyWay(place, ms) {
  let best = null;
  for (const part of MILKY_WAY) {
    const at = altAzOfSky(part.ra, part.dec, place, ms);
    if (!at || at.altDeg < 20) continue;
    const score = Math.min(at.altDeg, 60) + 8 * part.rich;
    if (!best || score > best.score) best = { name: part.name, score, ...at };
  }
  return best;
}

/**
 * A stop's `look:` as a place to turn the head to: `{ kind, id, name, azDeg, altDeg, up, ... }`.
 * `up: false` means the thing asked for is under the horizon (or there is none): the heading is
 * then where it will rise or, with nothing to aim at, the half of the sky the planets keep to
 * (south from the north of the world, north from the south), and the stop's line says so.
 * `pass` is a sky/passes.js pass for `{pass: true}`, which ui/trip.js has already found.
 */
export function lookTarget(look, place, ms, pass = null) {
  if (!look || !observerOf(place) || !isNum(ms)) return null;
  const lat = isNum(place.latDeg) ? place.latDeg : place.latRad * DEG;
  const fallback = { azDeg: lat >= 0 ? 180 : 0, altDeg: 30 };
  if (look.world) {
    const id = String(look.world).toLowerCase();
    const at = id === 'moon' ? moonAt(place, ms) : altAzOfBody(id, place, ms);
    if (!at) return null;
    return { kind: 'world', id, ...at, up: at.altDeg > 0 };
  }
  if (Array.isArray(look.sky)) {
    const at = altAzOfSky(look.sky[0], look.sky[1], place, ms);
    return at ? { kind: 'sky', id: null, ...at, up: at.altDeg > 0 } : null;
  }
  // "The brightest one up" is a question about a dark sky. With the Sun up (a summer near the
  // pole, where tonight never gets dark) there is nothing to point at, and the line says why.
  if (look.best) {
    const sun = altAzOfBody('sun', place, ms);
    if (sun && sun.altDeg > -4) return { kind: String(look.best), id: null, ...fallback, up: false, daylight: true };
  }
  if (look.best === 'planet') {
    const p = bestPlanet(place, ms);
    return p ? { kind: 'planet', ...p, up: true } : { kind: 'planet', id: null, ...fallback, up: false };
  }
  if (look.best === 'star') {
    const s = bestStar(place, ms);
    return s ? { kind: 'star', id: null, ...s, up: true } : { kind: 'star', id: null, ...fallback, up: false };
  }
  if (look.best === 'milky-way') {
    const m = bestMilkyWay(place, ms);
    return m ? { kind: 'milky-way', id: null, ...m, up: true } : { kind: 'milky-way', id: null, ...fallback, altDeg: 45, up: false };
  }
  if (look.best === 'figure') {
    const f = bestFigure(place, ms);
    return f ? { kind: 'figure', ...f, up: true } : { kind: 'figure', id: null, ...fallback, up: false };
  }
  if (look.pass === true) {
    // sky/passes.js gives the top of the arc as `peakAz` in radians and `peakElDeg` in degrees.
    const az = !pass ? null : isNum(pass.peakAzDeg) ? pass.peakAzDeg : isNum(pass.peakAz) ? pass.peakAz * DEG : null;
    const el = !pass ? null : isNum(pass.peakElDeg) ? pass.peakElDeg : isNum(pass.peakEl) ? pass.peakEl * DEG : null;
    if (az === null || el === null) return { kind: 'pass', id: null, ...fallback, up: false };
    return { kind: 'pass', id: null, azDeg: az, altDeg: el, up: true };
  }
  return null;
}

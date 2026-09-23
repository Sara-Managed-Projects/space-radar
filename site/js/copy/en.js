// copy/en.js -- every user-visible string in the app, in English.
//
// Spec 0013 requirement 9: copy strings live here, not in templates. A string literal in
// ui/cards.js, ui/controls.js or ui/status.js is a CI finding (spec 0018 requirement 2).
//
// Rules this file obeys, because check_copy.py will enforce them:
//   * a card's first sentence is <= 160 characters (the builders in cards.js measure it);
//   * at most three comparisons per card;
//   * the word "danger" appears only where a sourced risk field exists -- so nowhere in v1;
//   * every glossary term used on a card is in GLOSSARY below, ported from
//     registry/glossary.yaml, which is the source of truth.
//
// Contract exports: COPY, compare(kind, value), GLOSSARY.
// Additional exports (t, fmt, plural, ageInWords, ...) are formatting helpers. They are
// language-specific, so they belong with the language file rather than in a template; see the
// note in the build report.

// ---------------------------------------------------------------------------------------
// Formatting primitives
// ---------------------------------------------------------------------------------------

const NNBSP = '\u202F'; // narrow no-break space: "35 786 km", per docs/design-language.md
const NBSP = '\u00A0';

/** Interpolate {key} placeholders. A missing key yields an empty string, never "{key}". */
export function t(template, vars) {
  if (typeof template !== 'string') return '';
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] === undefined || vars[k] === null ? '' : String(vars[k]),
  );
}

function groupDigits(intText) {
  let out = '';
  for (let i = 0; i < intText.length; i += 1) {
    const fromEnd = intText.length - i;
    if (i > 0 && fromEnd % 3 === 0) out += NNBSP;
    out += intText[i];
  }
  return out;
}

/** "35 786", "1 234.5". Groups with a narrow no-break space, never a comma. */
function num(value, decimals = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const fixed = Math.abs(n).toFixed(decimals);
  const [intPart, frac] = fixed.split('.');
  // True minus sign, not a hyphen -- and never in front of a value that has rounded to zero.
  // A rocket still on its pad has an altitude of a few metres, and "−0 km" is not a number.
  const sign = n < 0 && Number(fixed) !== 0 ? '−' : '';
  return sign + groupDigits(intPart) + (frac ? `.${frac}` : '');
}

/** Round to a sensible number of decimals for the magnitude of the value. */
function smart(value) {
  const n = Math.abs(Number(value));
  if (!Number.isFinite(n)) return '';
  if (n >= 100) return num(value, 0);
  if (n >= 10) return num(value, 1);
  if (n >= 1) return num(value, 2);
  return num(value, 3);
}

/**
 * A length in metres, written the way a person writes one.
 *
 * `smart` is tuned for astronomical units and pads to three significant figures below 1, which
 * turned a lander surveyed to 0.4 m into "0.400 m" and a 20 m error ellipse into "20.0 m". A
 * precision is a rounded quantity already; trailing zeroes on it claim digits nobody measured.
 */
function metres(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  if (Math.abs(n) >= 10) return num(n, 0);
  if (Math.abs(n) >= 1) return num(n, Number.isInteger(n) ? 0 : 1);
  return num(n, 1);
}

export const fmt = {
  num,
  smart,
  metres,
  int: (v) => num(v, 0),
  nbsp: NBSP,
  /** "4 minutes" / "1 minute" */
  plural(n, one, many) {
    return Math.abs(Number(n)) === 1 ? one : many;
  },
};

export function plural(n, one, many) {
  return fmt.plural(n, one, many);
}

// ---------------------------------------------------------------------------------------
// compare(kind, value) -- spec 0013's comparison table, as data.
// A missing number yields null. Never a placeholder.
// ---------------------------------------------------------------------------------------

const LUNAR_DISTANCE_KM = 384400; // registry/glossary.yaml: "about 384 000 km"
const LIGHT_KM_PER_S = 299792.458;
const LIGHT_MINUTE_KM = LIGHT_KM_PER_S * 60; // 17 987 547.48 km
const AU_KM = 149597870.7;

// Ascending `upto` bands, exactly the shape of spec 0013's comparisons.yaml.
const SIZE_BANDS = [
  { upto: 0.6, say: 'about the size of a toaster' },
  { upto: 2, say: 'about the size of a washing machine' },
  { upto: 5, say: 'about the size of a car' },
  { upto: 12, say: 'about the size of a bus' },
  { upto: 30, say: 'about the size of a house' },
  // MEASURED 2026-09-08: a 46 m Soyuz and a 70 m Falcon 9 both read "a football field", which
  // is a length lying on the ground for a thing that stands up. Storeys are what a person
  // sees a tall thing as; a storey is about three metres.
  { upto: 50, say: 'about as tall as a 15-storey building' },
  { upto: 75, say: 'about as tall as a 25-storey building' },
  { upto: 110, say: 'about the size of a football field' },
  { upto: 130, say: 'about as tall as a 40-storey tower' },
  { upto: 350, say: 'about the size of a cruise ship' },
  { upto: 900, say: 'about as tall as the tallest building on Earth' },
  { upto: 5000, say: 'about the size of a small mountain' },
  { upto: Infinity, say: 'about the size of a city' },
];

// The usual naked-eye limit from a dark site. ONE number for every sentence that answers "can I see
// it": the chip's band stopped at 6 while the "See it from here" line used 6.5, so an object at 6.5
// was "too faint to see without a telescope" and "Bright enough to see with your own eyes" on the
// same card (found 2026-09-22 adding NGC objects at 6.5).
export const NAKED_EYE_LIMIT = 6.5;

const MAGNITUDE_BANDS = [
  { upto: -11, say: 'as bright as the full Moon' },
  { upto: -6, say: 'brighter than any star or planet' },
  { upto: -3.5, say: 'as bright as Venus' },
  // The twenty-odd first-magnitude stars run to about 1.5 (Regulus 1.35); Betelgeuse at 0.5 was being
  // called an ordinary star (live, 2026-09-09).
  { upto: 1.5, say: 'as bright as the brightest stars' },
  { upto: 3, say: 'as bright as an ordinary star' },
  { upto: NAKED_EYE_LIMIT, say: 'just visible from a dark place' },
  { upto: Infinity, say: 'too faint to see without a telescope' },
];

const SPEED_BANDS = [
  { upto: 130, say: '{n} km/h, motorway speed' },
  { upto: 1100, say: '{n} km/h, about the speed of an airliner' },
  { upto: 4500, say: '{n} km/h, faster than a rifle bullet' },
  { upto: Infinity, say: '{n} km/h, about {m} km every minute' },
];

function bandFor(bands, n) {
  for (const band of bands) if (n <= band.upto) return band;
  return null;
}

function compareSize(m) {
  if (!(m > 0)) return null;
  const band = bandFor(SIZE_BANDS, m);
  return band ? band.say : null;
}

/** Drop trailing zeros so a comparison reads "3.9×", never "3.90×". */
function trim(text) {
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}

/** Two significant-ish decimals, trimmed: 46.8, 3.9, 0.26, 1. */
function ratio(v) {
  return trim(v >= 10 ? num(v, 1) : num(v, 2));
}

function compareDistance(km) {
  // Below a kilometre there is nothing to compare: MEASURED, a launch pad at 0 km printed
  // "0 km up, about 1 hour of driving if the road went straight up".
  if (!(km >= 1)) return null;
  if (km < 2000) {
    // Spec 0013's row reads "a two-hour drive, straight up". Two hours is only true near
    // 200 km, so the hours are derived at 100 km/h rather than fixed: a wrong number a
    // beginner CAN check is worse than no comparison at all.
    const hours = Math.max(1, Math.round(km / 100));
    return t('{n} km up, about {h} {word} of driving if the road went straight up', {
      n: num(km, 0),
      h: hours,
      word: fmt.plural(hours, 'hour', 'hours'),
    });
  }
  if (km < LUNAR_DISTANCE_KM * 0.1) {
    return t('{n} km up', { n: num(km, 0) });
  }
  if (km < LIGHT_MINUTE_KM) {
    return t("{ld}× the Moon's distance", { ld: ratio(km / LUNAR_DISTANCE_KM) });
  }
  const lt = km / LIGHT_MINUTE_KM;
  if (lt < 90) {
    return t('{lt} light-minutes away', { lt: ratio(lt) });
  }
  return t('{lh} light-hours away', { lh: ratio(lt / 60) });
}

function compareSpeed(kmh) {
  if (!(kmh > 0)) return null;
  const band = bandFor(SPEED_BANDS, kmh);
  if (!band) return null;
  return t(band.say, { n: num(kmh, 0), m: num(kmh / 60, 0) });
}

function compareMagnitude(mag) {
  if (!Number.isFinite(mag)) return null;
  const band = bandFor(MAGNITUDE_BANDS, mag);
  return band ? band.say : null;
}

const COMPARE_KINDS = {
  sizeM: compareSize,
  size_m: compareSize,
  distanceKm: compareDistance,
  distance_km: compareDistance,
  altitudeKm: compareDistance,
  speedKmh: compareSpeed,
  speed_kmh: compareSpeed,
  magnitude: compareMagnitude,
  brightness_mag: compareMagnitude,
};

/**
 * A comparison a beginner can hold, or null when there is no number to compare.
 * Never returns a placeholder: a card drops the chip instead.
 */
/** The indefinite article for a type phrase: "an ultra-faint dwarf galaxy", "a spiral galaxy". English only. */
export function article(phrase) {
  const text = String(phrase || '').trim();
  // An initialism is said letter by letter, so it is the LETTER's sound that counts: "an H II
  // region" (aitch), "an M dwarf", "a UV source". A card read "a h ii region" (2026-09-22).
  const first = text.split(/\s+/)[0] || '';
  if (/^[A-Z]{1,4}$/.test(first)) return /^[AEFHILMNORSX]/.test(first) ? 'an' : 'a';
  return /^[aeiou]/i.test(text) ? 'an' : 'a';
}

// Names inside a type description that stay capitalised when the description goes mid-sentence.
const PROPER_IN_TYPES = ['Milky Way', 'Large Magellanic Cloud', 'Small Magellanic Cloud', 'Local Group'];

/**
 * A catalogue's type words, lowered for the middle of a sentence -- but not wholesale. Lowering
 * everything printed "a h ii region nebula" and "an emission nebula in the large magellanic cloud"
 * (read on the live site, 2026-09-22). Short all-capital tokens (H, II, HII) and the few proper
 * names above keep their capitals; every other word is lowered.
 */
export function typeWords(text) {
  let s = String(text || '');
  PROPER_IN_TYPES.forEach((name, i) => { s = s.split(name).join(`\u0000${i}\u0000`); });
  s = s.split(/(\s+)/).map((w) => (/^[A-Z0-9]{1,3}$/.test(w) ? w : w.toLowerCase())).join('');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => PROPER_IN_TYPES[Number(i)]);
}

export function compare(kind, value) {
  const fn = COMPARE_KINDS[kind];
  if (!fn) return null;
  const n = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(n)) return null;
  return fn(n);
}

/** The constants the comparisons are built on, so no other module hard-codes them. */
export const UNITS = {
  LUNAR_DISTANCE_KM,
  LIGHT_KM_PER_S,
  LIGHT_MINUTE_KM,
  AU_KM,
};

// ---------------------------------------------------------------------------------------
// Words for numbers a beginner cannot feel in figures
// ---------------------------------------------------------------------------------------

const SMALL_WORDS = [
  'no',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];

const COMPASS_16 = [
  'north',
  'north-north-east',
  'north-east',
  'east-north-east',
  'east',
  'east-south-east',
  'south-east',
  'south-south-east',
  'south',
  'south-south-west',
  'south-west',
  'west-south-west',
  'west',
  'west-north-west',
  'north-west',
  'north-north-west',
];

/** A compass direction in words. Takes DEGREES: this is the UI boundary. */
export function compassWords(azDeg) {
  const n = Number(azDeg);
  if (!Number.isFinite(n)) return null;
  const idx = Math.round((((n % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS_16[idx];
}

/**
 * Height above the horizon in fists, the one change that makes a sky chart usable by
 * someone who has never used one. Takes DEGREES.
 */
export function fistsWords(elDeg) {
  const n = Number(elDeg);
  if (!Number.isFinite(n)) return null;
  if (n < 5) return COPY.sky.fistsHorizon;
  if (n > 72) return COPY.sky.fistsOverhead;
  const fists = Math.max(1, Math.round(n / 10));
  const word = SMALL_WORDS[fists] || String(fists);
  return t(fists === 1 ? COPY.sky.fistsOne : COPY.sky.fistsMany, { n: word });
}

/** "just now" / "4 minutes ago" / "3 hours ago". ageMs null means we never looked. */
export function ageInWords(ageMs) {
  if (ageMs === null || ageMs === undefined || !Number.isFinite(Number(ageMs))) {
    return COPY.status.ageNever;
  }
  const ms = Math.max(0, Number(ageMs));
  const minutes = ms / 60000;
  if (minutes < 1) return COPY.time.justNow;
  if (minutes < 2) return COPY.time.aMinuteAgo;
  if (minutes < 60) return t(COPY.time.minutesAgo, { n: Math.round(minutes) });
  const hours = minutes / 60;
  if (hours < 2) return COPY.time.anHourAgo;
  if (hours < 24) return t(COPY.time.hoursAgo, { n: Math.round(hours) });
  const days = hours / 24;
  if (days < 2) return COPY.time.aDayAgo;
  return t(COPY.time.daysAgo, { n: Math.round(days) });
}

/** "in 4 minutes" / "in 3 hours" / "in 2 days". Negative means it already happened. */
export function inWords(deltaMs) {
  const ms = Number(deltaMs);
  if (!Number.isFinite(ms)) return null;
  const past = ms < 0;
  const minutes = Math.abs(ms) / 60000;
  let body;
  // The singular has its own string, exactly as ageInWords does: "in 1 hours" is the kind of
  // sentence that tells a reader nobody read the page.
  if (minutes < 1) body = COPY.time.lessThanAMinute;
  else if (minutes < 60) {
    const n = Math.round(minutes);
    body = n === 1 ? COPY.time.aMinute : t(COPY.time.minutes, { n });
  } else if (minutes < 1440) {
    const n = Math.round(minutes / 60);
    body = n === 1 ? COPY.time.anHour : t(COPY.time.hours, { n });
  } else {
    const n = Math.round(minutes / 1440);
    body = n === 1 ? COPY.time.aDay : t(COPY.time.days, { n });
  }
  return t(past ? COPY.time.ago : COPY.time.inFuture, { d: body });
}

// ---------------------------------------------------------------------------------------
// Time display
// ---------------------------------------------------------------------------------------

const utcTimeFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});
const utcDateFmt = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  timeZone: 'UTC',
});
const localTimeFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});
const localDateFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  month: 'short',
  day: '2-digit',
});
// A date whose YEAR is the point. `localDate` is "Mon 19 Mar", which is right for a pass tonight
// and wrong for the last time anybody photographed the Tesla Roadster: measured in the browser it
// printed "the last time anybody saw it was Mon 19 Mar" about March 2018.
const longDateFmt = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
const clockFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export const timeText = {
  utcTime: (ms) => utcTimeFmt.format(new Date(ms)),
  utcDate: (ms) => utcDateFmt.format(new Date(ms)),
  localTime: (ms) => localTimeFmt.format(new Date(ms)),
  localDate: (ms) => localDateFmt.format(new Date(ms)),
  /** "19 March 2018" -- for a date far enough away that the year carries the meaning. */
  longDate: (ms) => longDateFmt.format(new Date(ms)),
  /**
   * The short form within ~half a year of `nowMs`, the long form beyond it. A comet card read
   * "Hale-Bopp ... closest to the Sun on Fri 28 Mar": that was 1997, and without the year it says
   * next March -- the Roadster mistake above, in a template nobody had moved to longDate.
   */
  dateNear: (ms, nowMs) =>
    Number.isFinite(nowMs) && Math.abs(ms - nowMs) < 180 * 86400e3
      ? localDateFmt.format(new Date(ms))
      : longDateFmt.format(new Date(ms)),
  /** "21:14" -- the form used inside a sentence. */
  hhmm: (ms) => clockFmt.format(new Date(ms)),
  /** "Fri 12 Sep, 21:14" */
  dayAndTime: (ms) =>
    `${localDateFmt.format(new Date(ms))}${COPY.punctuation.comma}${clockFmt.format(new Date(ms))}`,
  timeZoneName: () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || COPY.controls.localTimeFallback;
    } catch {
      return COPY.controls.localTimeFallback;
    }
  },
};

// ---------------------------------------------------------------------------------------
// A trip stop's clock (spec 0030): "Shown at 2 Aug 2027, 10:07 UTC, running ten minutes a second"
// ---------------------------------------------------------------------------------------

// The instant, in UTC and in words a visitor reads: the stop's time is a fact about the world, so
// it is not converted to anybody's local clock.
const shownAtFmt = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});
const shownOnFmt = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
// At an hour a second the minutes turn over sixty times a second, which is a flicker and not a
// reading, so from there up the line gives the day alone.
const SHOWN_DAY_ONLY_FROM_RATE = 3600;

/**
 * "600 times faster than life" is true and means nothing; "ten minutes a second" is a picture.
 * The named rates are COPY.trip.rateWords, the rest the number grouped the way every other number
 * here is (fmt.int: a narrow no-break space, never a comma).
 */
export function formatRate(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n) || n <= 0) return '';
  const named = COPY.trip.rateWords[n];
  return named || t(COPY.trip.rateGeneric, { n: fmt.int(n) });
}

/** The stop's instant for the "Shown at" line: "2 Aug 2027, 10:07 UTC", or the day alone. */
export function formatShownAt(ms, rate) {
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return '';
  if (Number(rate) >= SHOWN_DAY_ONLY_FROM_RATE) return shownOnFmt.format(d);
  return t(COPY.trip.shownAtUtc, { when: shownAtFmt.format(d) });
}

// ---------------------------------------------------------------------------------------
// COPY -- every user-visible string
// ---------------------------------------------------------------------------------------

export const COPY = {
  app: {
    name: 'Space Radar',
    tagline: 'Everything in motion around Earth, where it really is, right now.',
  },

  punctuation: {
    comma: ', ',
    dot: '.',
    separator: ' · ',
    listJoin: ', ',
    dash: ' — ',
    colon: ': ',
    ellipsis: '…',
    sentenceJoin: '. ',
  },

  // The visual class of a record, in words. Record.klass -> a badge on the card.
  // The worlds, by the id every registry row and every frame name uses. A card that names the
  // world a rover is standing on reads this; there is no second list.
  worlds: {
    sun: 'the Sun',
    mercury: 'Mercury',
    venus: 'Venus',
    earth: 'Earth',
    moon: 'the Moon',
    mars: 'Mars',
    jupiter: 'Jupiter',
    saturn: 'Saturn',
    uranus: 'Uranus',
    neptune: 'Neptune',
    pluto: 'Pluto',
    io: 'Io',
    europa: 'Europa',
    ganymede: 'Ganymede',
    callisto: 'Callisto',
    phobos: 'Phobos',
    deimos: 'Deimos',
    enceladus: 'Enceladus',
    titan: 'Titan',
    triton: 'Triton',
    charon: 'Charon',
  },

  // PLUTO AND JUPITER'S FOUR BIG MOONS are the worlds that came with sourced facts instead of a
  // texture (registry/worlds.yaml, `facts:` on each row, with the URL and the day it was read).
  // `cite` is the card's source line; scene/worlds.js puts it on the record, because the positions
  // are not computed the way the other worlds' are and WORLD_CITE there would say the wrong thing
  // about them (VSOP87 is not how Astronomy Engine does Pluto or the moons).
  worldFacts: {
    cite: {
      pluto: 'position computed with Astronomy Engine (Don Cross, MIT licence), which follows Pluto under the pull of the Sun and the giant planets; radius from Wikipedia’s Pluto infobox, what it is from NASA Science, its colour and how to see it from Wikipedia, all read 2026-09-22',
      io: 'position computed with Astronomy Engine (Don Cross, MIT licence): Jupiter, plus the L1.2 theory of its moons (Lainey, Duriez and Vienne); radius from NASA’s Jovian satellite fact sheet, what it is from NASA Science, its colour and how to see it from Wikipedia, all read 2026-09-22',
      europa: 'position computed with Astronomy Engine (Don Cross, MIT licence): Jupiter, plus the L1.2 theory of its moons (Lainey, Duriez and Vienne); radius from NASA’s Jovian satellite fact sheet, what it is from NASA Science, its colour and how to see it from Wikipedia, all read 2026-09-22',
      ganymede: 'position computed with Astronomy Engine (Don Cross, MIT licence): Jupiter, plus the L1.2 theory of its moons (Lainey, Duriez and Vienne); radius from NASA’s Jovian satellite fact sheet, what it is from NASA Science, its colour and how to see it from Wikipedia, all read 2026-09-22',
      callisto: 'position computed with Astronomy Engine (Don Cross, MIT licence): Jupiter, plus the L1.2 theory of its moons (Lainey, Duriez and Vienne); radius from NASA’s Jovian satellite fact sheet, what it is from NASA Science, its colour and how to see it from Wikipedia, all read 2026-09-22',
      // The six whose orbits were fitted to JPL Horizons (propagate/moons.js). "Within" is the
      // worst error measured there over 2000 to 2050, at instants the fit never saw.
      phobos: 'position: Mars from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 6 km over 2000 to 2050; radius from JPL’s satellite physical parameters, brightness from NASA’s Mars fact sheet, what it is and its colour from NASA Science, all read 2026-09-22',
      deimos: 'position: Mars from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 120 km over 2000 to 2050; radius from JPL’s satellite physical parameters, brightness from NASA’s Mars fact sheet, what it is and its colour from NASA Science, all read 2026-09-22',
      enceladus: 'position: Saturn from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 1 480 km over 2000 to 2050; radius from JPL’s satellite physical parameters, what it is and its colour from NASA Science, how to see it from Wikipedia, all read 2026-09-22',
      titan: 'position: Saturn from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 840 km over 2000 to 2050; radius from JPL’s satellite physical parameters, what it is from NASA Science, the Huygens landing, its colour and how to see it from Wikipedia, all read 2026-09-22',
      triton: 'position: Neptune from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 10 km over 2000 to 2050; radius from JPL’s satellite physical parameters, what it is from NASA Science, its colour and brightness from Wikipedia, all read 2026-09-22',
      charon: 'position: Pluto from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 1 km over 2000 to 2050; radius from JPL’s satellite physical parameters, brightness from NASA’s Pluto fact sheet, what it is and its colour from NASA Science, all read 2026-09-22',
      // Ten more, the same day and the same way. Each "within" is that moon's own worst error over
      // 2000 to 2050, measured in propagate/moons.js at instants the fit never saw.
      mimas: 'position: Saturn from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 700 km over 2000 to 2050; radius from JPL’s satellite physical parameters, albedo from NASA’s Saturnian satellite fact sheet, what it is and its colour from NASA Science, brightness from Wikipedia, all read 2026-09-22',
      tethys: 'position: Saturn from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 120 km over 2000 to 2050; radius from JPL’s satellite physical parameters, albedo from NASA’s Saturnian satellite fact sheet, what it is from NASA Science, its colour and brightness from Wikipedia, all read 2026-09-22',
      dione: 'position: Saturn from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 240 km over 2000 to 2050; radius from JPL’s satellite physical parameters, albedo from NASA’s Saturnian satellite fact sheet, its colour from NASA Science, what it is and its brightness from Wikipedia, all read 2026-09-22',
      rhea: 'position: Saturn from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 200 km over 2000 to 2050; radius from JPL’s satellite physical parameters, albedo from NASA’s Saturnian satellite fact sheet, what it is and its colour from NASA Science, brightness from Wikipedia, all read 2026-09-22',
      iapetus: 'position: Saturn from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 6 800 km over 2000 to 2050, which is 0.19 per cent of its orbit; radius from JPL’s satellite physical parameters, both albedos from NASA’s Saturnian satellite fact sheet, what it is and its colour from NASA Science, brightness from Wikipedia, all read 2026-09-22',
      miranda: 'position: Uranus from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 120 km over 2000 to 2050; radius from JPL’s satellite physical parameters, albedo from NASA’s Uranian satellite fact sheet, what it is from NASA Science, its colour and brightness from Wikipedia, all read 2026-09-22',
      ariel: 'position: Uranus from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 120 km over 2000 to 2050; radius from JPL’s satellite physical parameters, albedo from NASA’s Uranian satellite fact sheet, what it is and its colour from NASA Science, brightness from Wikipedia, all read 2026-09-22',
      umbriel: 'position: Uranus from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 410 km over 2000 to 2050; radius from JPL’s satellite physical parameters, albedo from NASA’s Uranian satellite fact sheet, what it is from NASA Science, its colour and brightness from Wikipedia, all read 2026-09-22',
      titania: 'position: Uranus from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 1 000 km over 2000 to 2050; radius from JPL’s satellite physical parameters, albedo from NASA’s Uranian satellite fact sheet, what it is and its colour from NASA Science, brightness from Wikipedia, all read 2026-09-22',
      oberon: 'position: Uranus from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 1 230 km over 2000 to 2050; radius from JPL’s satellite physical parameters, albedo from NASA’s Uranian satellite fact sheet, what it is from NASA Science, its colour and brightness from Wikipedia, all read 2026-09-22',
    },
  },

  // scene/worlds.js viewScale(id).note for a moon drawn around a planet that is itself drawn nearer
  // and larger than it is: Jupiter's, Saturn's, Mars's, Neptune's and Pluto's moons, seen from any
  // stage outside their own planet's system. {n}
  // is how many times wider than the real one the planet is drawn on the sky, and the gap between
  // them is widened by the same factor. The second sentence is added only when the moon's own disc
  // had to be enlarged again to be seen at all.
  worldView: {
    withParent: '{parent} is drawn {n} times wider on the sky than it looks, so you can find it, and {name} is drawn around it at the same scale: its gap from {parent} is widened just as much.',
    withParentFloor: '{name} itself is drawn bigger still, or it would be too small to see.',
    // From a stage outside the planets, everything nearer the Sun crowds into a few degrees of sky,
    // and the enlargement that makes one planet findable draws it over the next one. The disc stops
    // short instead, and this is the card saying so (scene/worlds.js, the block at the top).
    crowded: '{name} is not drawn as wide as that: {near} is only {deg} degrees away in this sky, and a disc that size would cover it.',
  },

  klass: {
    station: 'Station',
    satellite: 'Satellite',
    debris: 'Debris',
    rocket: 'Rocket',
    probe: 'Probe',
    telescope: 'Telescope',
    asteroid: 'Asteroid',
    comet: 'Comet',
    site: 'Ground site',
    world: 'World',
    star: 'Star',
    exoplanet: 'Planet of another star',
    dso: 'Deep-sky object',
    exotic: 'Extreme object',
    // Not a physical class -- a curatorial one. A golf ball, a car and a photograph have nothing
    // in common except that somebody sent them and nobody had to.
    oddity: 'Oddity',
    unknown: 'Object',
  },

  // The card's badge for the far-bodies layer, whose records are filed under the asteroid and comet
  // classes for their glyph and model (ui/cards.js klassLabel).
  klassFar: {
    dwarf: 'Dwarf planet',
    interstellar: 'Interstellar object',
  },

  moments: {
    title: 'What are you here for',
    wonder: {
      id: 'wonder',
      label: 'Wonder',
      hint: 'Fly around and tap anything.',
    },
    now: {
      id: 'now',
      label: 'Now',
      hint: 'What is above your head this minute.',
    },
    next: {
      id: 'next',
      label: 'Next',
      hint: 'What is coming, and when.',
    },
  },

  // The long-press list (spec 0028 req 4): what is under a finger when several things are.
  // A star without a name in any catalogue people use: its HYG row is what we can say.
  stars: {
    unnamed: 'An unnamed star (HYG {n})',
    notPlaced: '{n} more have no measured distance and are not drawn.',
  },
  // A star system at its own scale (spec 0040, scene/systems.js). The one piece of text drawn IN the
  // scene: the dashed ring on the trip's last stop is not an orbit anything has, and it says so.
  systems: {
    mercuryRing: 'Mercury’s orbit, for scale',
  },
  // The scale ladder's breadcrumb (spec 0028 req 11): eight places, each further out, and the
  // honesty line under them.
  ladder: {
    title: 'How far',
    intro: 'Each step is farther than the last. Tap one to go there.',
    notLoaded: 'still loading',
    weShowTitle: 'What this map draws of what is known',
    weShowRow: '{n} {what} — of {of}',
  },
  // The Next moment's list (spec 0026 req 6): what is coming, from records already loaded.
  // ui/scenenote.js: the one line on the scene when no satellite could be read at all.
  sceneNote: {
    refused: 'No satellites on the map right now: CelesTrak, which publishes their orbits, could not be read from this connection. The Moon, the planets, the stars and the trips that do not need satellites still work.',
    why: 'What could not be read',
    close: '×',
    closeTitle: 'Close this note',
  },
  // A deep link (spec 0032) that names something this map does not have. Said once, on the scene,
  // through the same note; the default view is what is shown, and the line says so rather than
  // leaving a visitor to wonder why a link to the Moon opened on the Earth.
  link: {
    unknownVersion: 'This link was made by a newer version of the map; showing the default view.',
    unknownTrip: 'That trip is not on this map any more; showing the default view.',
    unknownAt: 'That object is not on this map; showing the default view.',
    unknownStage: 'That place is not a centre this map can take; showing the default view.',
  },
  // Sharing (spec 0033): a link that reopens this exact view, and a picture of it with its caption.
  // The picture's caption is the card's own lines (ui/postcard.js); only the frame words are here.
  share: {
    link: 'Share',
    linkTitle: 'Share a link that opens this exact view',
    picture: 'Save a picture',
    pictureTitle: 'A picture of this view with its caption, saved to your device',
    copied: 'Link copied',
    making: 'Making the picture',
    saved: 'Picture saved',
    failed: 'The picture could not be made just now',
    // `{id}` is the object's or the trip's id, `{date}` the day the sky in the picture is from.
    fileName: 'space-radar-{id}-{date}.png',
    mark: 'spaceradar.ai',
    // The place-and-time line on the picture: the card's first "right now" row, then the instant.
    row: '{label}: {value}',
    when: '{date}, {time} UTC',
  },
  nextList: {
    // Two rows can name different objects the same way -- CelesTrak calls dozens of stages "SL-8
    // R/B" -- and two identical rows read as a bug. The catalogue number tells them apart.
    sameName: '{name} ({id})',
    title: 'Coming up',
    hint: 'From what the app has loaded: launches, close approaches, comets, meteor showers, storms that bring auroras and passes over you; and the next eclipses, worked out here.',
    now: 'about now',
    inMinutes: 'in {n} minutes',
    inHours: 'in {n} hours',
    todayAt: 'today at {time}',
    tomorrowAt: 'tomorrow at {time}',
    launch: '{name} lifts off {when}',
    launchRough: '{name} lifts off {when}, give or take — the date is not fixed yet',
    approach: '{name} passes Earth {when}, {ld}× the Moon’s distance away',
    approachNoDistance: '{name} passes Earth {when}',
    perihelion: '{name} is closest to the Sun {when}',
    pass: '{name} comes over you {when}',
    train: 'A train of {n} satellites comes over you {when}',
    // ZHR is the rate under a perfect sky with the radiant overhead, so it is "up to", never "you will see".
    // NOAA's own storm scale, in kpWords' words ("a minor storm — aurora possible in the far north
    // and south"). No latitude line: the rules of thumb disagree, and the words already say where.
    aurora: 'NOAA forecasts {word}, from {when} (Kp {kp})',
    auroraNow: 'A geomagnetic storm is under way: {word} (Kp {kp})',
    shower: 'The {name} meteor shower peaks around {date}, up to {zhr} an hour under a dark sky',
    showerMoon: 'The {name} meteor shower peaks around {date}, up to {zhr} an hour under a dark sky, with the Moon {pct}% lit that night',
    showerNoMoon: 'The {name} meteor shower peaks around {date}, up to {zhr} an hour under a dark sky, and the Moon is nearly new',
    // With a place set: where the radiant is that night, 20:00 to 06:00 local. Meteors come only
    // while it is up, and more the higher it is.
    radiantHigh: 'From where you are its radiant is highest around {time}',
    radiantLow: 'From where you are its radiant stays low all night, so expect far fewer',
    radiantNeverUp: 'From where you are its radiant stays below the horizon that night',
    // Eclipses (spec 0031, 2026-09-23): computed here with astronomy-engine, a year or more ahead,
    // so the row gives the date, never "in 312 days". The words are the eclipse vocabulary of spec
    // 0043: shadow, path, totality (registry/glossary.yaml explains annular, penumbra, umbra and
    // totality). A solar eclipse's place is where its shadow is deepest, told by the nearest
    // bundled city and how far off it is, because that point is as often at sea as not.
    eclipseKinds: { total: 'Total', annular: 'Annular', partial: 'Partial', hybrid: 'Hybrid', penumbral: 'Penumbral' },
    solarEclipseTitle: '{kind} solar eclipse',
    lunarEclipseTitle: '{kind} lunar eclipse',
    solarEclipse: '{kind} solar eclipse on {date}: the Moon’s shadow falls deepest {where}',
    solarEclipseGrazing: '{kind} solar eclipse on {date}, seen only from far north or far south',
    lunarEclipse: '{kind} lunar eclipse on {date}, the Moon in the Earth’s shadow for everyone who can see it',
    lunarEclipsePenumbral: '{kind} lunar eclipse on {date}: the Moon only dims a little, in the Earth’s outer shadow',
    eclipseNear: 'near {city}',
    eclipseFrom: 'about {km} km from {city}',
    // With a place set (spec 0031 req 6). Times are the visitor's own clock, as every row's are.
    eclipseLocal: 'From where you are: begins {begin}, deepest {peak} with {pct}% of the Sun covered, ends {end}',
    eclipseLocalTotal: 'From where you are: begins {begin}, totality at {peak}, ends {end}',
    eclipseNotVisible: 'Not visible from where you are',
    eclipseBelowHorizon: 'From where you are the Sun is below the horizon while it happens',
    // WHAT EACH TIME IS (spec 0031 req 7): one small line under every row. A launch's time is a
    // plan; an eclipse's is worked out to the minute; a pass is only as good as its elements.
    classOf: {
      launch: 'A plan: the time the launch provider is aiming for, which can move',
      approach: 'Worked out by NASA JPL from the asteroid’s measured orbit',
      perihelion: 'Worked out from the comet’s published orbit',
      shower: 'The usual yearly date; the peak moves by about a day',
      aurora: 'NOAA’s forecast, three hours at a time',
      auroraNow: 'Measured by NOAA in the last few hours',
      pass: 'Worked out here from orbital elements measured {age}',
      passNoAge: 'Worked out here from orbital elements',
      eclipse: 'Worked out here to the minute from the motion of the Sun and Moon',
    },
    none: 'Nothing is scheduled in what the app has loaded.',
    notLoaded: 'Not loaded, so not listed: {layers}.',
    noObserver: 'Set where you are and passes over you join the list.',
  },
  // Colour keys (spec 0026 req 11).
  colourKey: {
    title: 'Colour by',
    unknown: 'not known for these',
  },
  // The card's trajectory chart (spec 0026 req 14).
  trajectory: {
    label: 'Its path, the next lap and a half',
    ariaLabel: 'Height over time, and the ground track on a flat map',
    km: '{n} km',
    now: 'now',
    laps: '1½ laps later',
    north: 'N',
    south: 'S',
    note: 'Worked out from the same elements as the dot; the map is the ground directly below it.',
  },
  // A launch's satellites as one thing (spec 0026 req 17).
  train: {
    label: 'In a train',
    oneOf: 'One of {n} launched together ({designator}).',
    youLead: 'This one leads.',
    leads: '{name} leads; this one is {position} in the line.',
    stillRaising: 'Still climbing as one line, about {alt} km up — the string of lights people report.',
    spreadOut: 'Spread out now, about {alt} km up; no longer a line in the sky.',
  },
  // One line of space weather (spec 0026 req 16). Kp is NOAA's 0-9 planetary index; the words are
  // NOAA's own scale names made plain, and G1..G5 are its storm grades from Kp 5 upward.
  spaceWeather: {
    level: 'Kp {kp}, {word}',
    levelWithScale: 'Kp {kp}, {word} ({scale})',
    measured: 'Space weather: {level} — measured {age}, {via}.',
    forecastOnly: 'Space weather: {level} — a forecast, not a measurement; {via}.',
    stale: 'That reading is older than NOAA promises; treat it as a guess.',
    stormComing: 'NOAA forecasts it rising to Kp {kp}.',
    couldNotLook: 'Space weather: could not look — {why}',
    couldNotLook0: 'Space weather: could not look.',
    justNow: 'just now',
    currentBin: 'for the current three-hour period',
    aMinuteAgo: 'a minute ago',
    minutesAgo: '{n} minutes ago',
    anHourAgo: 'an hour ago',
    hoursAgo: '{n} hours ago',
    aDayAgo: 'a day ago',
    daysAgo: '{n} days ago',
    ageUnknown: 'at a time NOAA did not say',
    viaLive: 'NOAA SWPC, read live',
    viaSnapshot: 'NOAA SWPC, from our copy',
    words: {
      unknown: 'no reading',
      quiet: 'quiet',
      unsettled: 'unsettled',
      active: 'active',
      minorStorm: 'a minor storm — aurora possible in the far north and south',
      moderateStorm: 'a moderate storm — aurora likely at high latitudes',
      strongStorm: 'a strong storm — aurora far from the poles, satellites nudged off course',
      severeStorm: 'a severe storm',
      extremeStorm: 'an extreme storm',
    },
  },
  chooser: {
    label: 'Things under your finger',
    hint: '{n} here. Tap one, or tap the sky to close.',
  },
  card: {
    // A PHOTOGRAPH OF THE OBJECT, where one exists and is free to ship. CC BY 4.0 asks for the
    // credit "in a clear and readable manner ... with the wording unaltered", so this is one line
    // under the picture and not a tooltip: {credit} is whose it is, {licence} the terms.
    photoCredit: '{credit} · {licence}',
    close: 'Close',
    closeTitle: 'Close this card',
    makeCentre: 'Make {name} the centre of the map',
    isCentre: 'This is the centre of the map',
    comparisonsLabel: 'To give you a feel for it',
    rightNowLabel: 'Right now',
    seeItLabel: 'See it from here',
    actionsLabel: 'What you can do',
    sourceLabel: 'Where this comes from',
    unknownName: 'Unnamed object',

    rows: {
      altitude: 'Height above the ground',
      speed: 'Speed',
      groundPoint: 'Passing over',
      distanceFromEarth: 'Distance from Earth',
      distanceFromSun: 'Distance from the Sun',
      lightLeft: 'Its light left it',
      sunlight: 'Right now it is',
      hostStar: 'Its star',
      across: 'Across',
      mass: 'Mass',
      spin: 'One turn takes',
      source: 'Read from',
      // A famous star's one line (registry/stars-notable.yaml) and the page it came from. Not
      // `source`: on a star card every other row is HYG's, and "Read from" would claim them too.
      whySource: 'Why it is known, read from',
      distanceNote: 'About that distance',
      objectType: 'What it is',
      constellation: 'Constellation',
      distanceRange: 'Distance, best estimates',
      planetRadius: 'Width, in Earths',
      planetMass: 'Mass, in Earths',
      yearLength: 'One year there',
      found: 'Found',
      catalogueCopy: 'Catalogue copy',
      spectralType: 'Type of star',
      brightness: 'How bright it looks',
      luminosity: 'Light output',
      catalogue: 'Catalogue',
      lightTime: 'Radio time each way',
      nextPass: 'Next pass over you',
      crew: 'People aboard',
      operator: 'Operated by',
      launched: 'Launched',
      period: 'One lap takes',
      location: 'Where it stands',
      onWorld: 'Standing on',
      // A craft in orbit round another world (data/sample.js construction D).
      orbiting: 'In orbit round',
      heightAbove: 'Height above {world}',
      closestApproach: 'Closest to Earth',
      // A dwarf planet's known moons, by name (data/sample.js farBodies, each from its article's
      // infobox). An empty list is a fact too: Ceres and Sedna have none that anyone has found.
      moons: 'Moons',
      missDistance: 'Miss distance',
      perihelion: 'Closest to the Sun',
      magnitude: 'Brightness',
      phase: 'Phase',
      liftoff: 'Lift-off',
      pad: 'From',
      destination: 'Heading for',
      // For a record with no position at all. "Height above the ground: could not work this out"
      // would say we tried and failed at arithmetic; the truth is that nobody has ever known.
      whereabouts: 'Where it is',
      lastSeen: 'Last known',
      toFindOut: 'To find out',
    },

    values: {
      km: '{n} km',
      kmh: '{n} km/h',
      kmPerS: '{n} km/s',
      au: '{n} astronomical units',
      lightYears: '{n} light-years',
      inSunlight: 'in sunlight',
      inShadow: 'in Earth’s shadow',
      yearsAgo: '{n} years ago',
      monthsAgo: '{n} months ago',
      suns: '{n}× the Sun',
      earths: '{n}× Earth',
      lightYearsRange: '{lo} to {hi} light-years',
      // Sedna's width is 906 km, +314 / -258: nobody has weighed or resolved it, so the card
      // gives the range rather than a middle that reads as a measurement.
      kmRange: '{lo} to {hi} km',
      noMoonsKnown: 'none known',
      sunsRange: '{lo} to {hi}× the Sun',
      millionSuns: '{n} million Suns',
      billionSuns: '{n} billion Suns',
      milliseconds: '{n} milliseconds',
      billionYearsAgo: '{n} billion years ago',
      millionYearsAgo: '{n} million years ago',
      days: '{n} days',
      hours: '{n} hours',
      yearByMethod: '{year}, {method}',
      asOf: 'as of {date}',
      magnitude: 'magnitude {n}',
      lunar: "{n}× the Moon's distance",
      minutes: '{n} minutes',
      seconds: '{n} seconds',
      degrees: '{n}°',
      people: '{n}',
      latLon: '{lat}, {lon}',
      // A latitude on another world. The plain `latLon` is Earth's, and printing it for a lunar
      // site is exactly the bug that put Tranquility Base in the Central African Republic.
      latLonOn: '{lat}, {lon} on {world}',
      north: '{n}° N',
      south: '{n}° S',
      east: '{n}° E',
      west: '{n}° W',
    },

    // "I could not look" is a third answer, and it is not "fine".
    couldNotLook: 'Could not work this out',
    nobodyKnows: 'Nobody knows',
    wouldNeed: 'It would take {wouldNeed}.',
    oftenSaidLabel: 'Often said',
    notApplicable: 'Not something this object has',
    noPosition: 'There is no position for this object right now.',

    actions: {
      flyTo: 'Fly to it',
      flyToTitle: 'Move the camera to this object',
      seeFromHere: 'See it from here',
      seeFromHereTitle: 'Look up from your own place on Earth',
      tellMeBefore: 'Tell me before',
      // Honest, because the feature does not exist yet (specs 0015 and 0016).
      tellMeBeforeDisabled:
        'Reminders are not built yet. There is no sign-up and no email behind this button, so it is switched off rather than pretending.',
    },
  },

  // Spec 0013 requirement 4, and spec 0001 principle 2 made visible.
  cls: {
    label: 'How we know where it is',
    measured: 'measured position',
    inferred: 'position propagated from elements {n} {unit} old',
    inferredUnknownAge: 'position propagated from elements of unknown age',
    // For a record with NO elements at all: a surface object drawn at a surveyed point near it.
    // "Position propagated from elements of unknown age" was printed under Alan Shepard's golf
    // balls, which have no elements and were never propagated from anything.
    inferredNoElements: 'position worked out rather than measured',
    illustrative: 'drawn to show where it goes; the real track is not public',
    sample: 'bundled sample data, not a live position',
    // spec 0026 req 15: a fresh launch the public catalogue has not numbered yet.
    provisional: 'not yet in the public catalogue — these are the operator’s own elements, published through CelesTrak; a permanent number comes when Space-Track lists it',
    unknown: 'we cannot say how this position was worked out',
    // A record with no position at all -- not a failed calculation, an absent fact. It reads
    // where the class line reads for everything else, so the card never has an empty honesty slot.
    unplaced: 'nobody knows where this is, so nothing is drawn for it',
    // The ADDITION to the inferred line, for a set of elements whose last observation is much
    // older than the epoch they are integrated from. The Roadster's elements are stated at a 2026
    // epoch and rest on 374 photographs that stopped in March 2018.
    inferredArc: 'the last time anybody saw it was {date}, and {caveat}',
    // Two numbers for two things. "The golf balls are at the Apollo 14 site (+/- 0.4 m)" is
    // false; this is the sentence that is true.
    precisionSplit:
      "{anchorName} is measured to {anchorM} m; this was {how} and is placed to within {objectM} m",
    precisionSplitUnknown:
      '{anchorName} is measured to {anchorM} m; this object itself has never been surveyed',
    // The THIRD case, and the golf balls are the reason. Somebody did find them -- Saunders, in
    // enhanced film -- and nobody published how closely. "never been surveyed" throws away the
    // finding; a metre figure invents the error bar. This says both halves and neither more.
    precisionSplitHowOnly:
      '{anchorName} is measured to {anchorM} m; this object was {how}, and nobody has published '
      + 'how closely',
    precisionOwn: 'located to within {objectM} m, {how}',
    // For a thing that is bolted to another thing. It has no position of its own and never will:
    // the class line above already printed the CARRIER's class, because the carrier's fields are
    // what was propagated. This says whose position that was, so the card is never surer of
    // itself than the spacecraft it is riding on.
    aboard: 'this is {carrier}’s own position, because the object is bolted to the outside of it and goes where it goes',
    how: {
      surveyed: 'surveyed from orbit',
      photogrammetric: 'found in photographs',
      orbital_imaging: 'found in orbital images',
      unsurveyed: 'never surveyed',
      map_reference: 'taken from a map',
    },
    hourWord: 'hour',
    hoursWord: 'hours',
    dayWord: 'day',
    daysWord: 'days',
    minuteWord: 'minute',
    minutesWord: 'minutes',
    yearWord: 'year',
    yearsWord: 'years',
  },

  // Things that ride on other things. Two rows in registry/oddities.yaml are `attached`: they
  // are not objects in space, they are parts of objects in space, so they have no dot of their
  // own and are reached from the carrier's card instead. These two blocks are the two ends of
  // that link -- "also aboard" on the spacecraft, "riding on" on the part.
  aboard: {
    label: 'Also aboard',
    openTitle: 'Open the card for this',
    // Said once, on the carrier's card, because it is true of every row in the list and the
    // alternative is a visitor wondering why they cannot tap the thing they can see.
    note: 'These have no dot of their own. They are exactly where this spacecraft is, because they are bolted to it.',
    ridingLabel: 'Riding on',
    backTitle: 'Open the card for the spacecraft carrying this',
  },

  // The myth block. On this subject the debunk is reliably the better story: Alan Shepard's golf
  // shot was 40 yards and not 200, the Roadster never goes near the asteroid belt, and the
  // tardigrades on the Moon are dehydrated tuns in epoxy. Every correction in the registry
  // carries a source, because a debunk with no source is a rumour going the other way.
  myth: {
    label: 'Often said',
    line: '{claim} — {correction}',
    // For a myth that is not settled. The Beatles story is disputed by the man who produced the
    // Golden Record; saying "wrong" would be making the same mistake in the other direction.
    contested: 'Often said, and genuinely disputed: {claim} — {correction}',
  },

  // For a record with no position. It is reachable from search and it opens a card; what it does
  // not have is a dot, because a dot on this map is a claim and every other layer honours that.
  // The class line above already says nothing is drawn for it, so this only says WHY -- measured
  // in the browser, the two together read "Nobody knows where this is, so it is not on the map.
  // Nobody knows where this is, so it is not on the map."
  unplaced: {
    why: '{whyUnknown}',
  },

  // WHAT YOU ARE LOOKING AT. It sits in the footer beside the position class, because "the
  // shape is a stand-in" is the same category of claim as "the track is a sketch".
  //
  // SCOPED TO LAUNCHES, and that is a gap and not a finished feature. Two comments in the
  // scene code used to describe a line "the card says" for satellites and sites; the card has
  // never said it, and those comments now say so instead of asserting it. A GEO record drawn
  // with the SSL-1300 bus and a pad drawn with NASA's mobile launcher are stand-ins the card
  // is still silent about. Covering them needs the stand-in's name to reach the card's meta,
  // which is resolved in the scene today -- a different change, not a copy key.
  //
  // Colour is deliberately absent. 34 of the 49 rows in registry/rockets.yaml have no sourced
  // livery; they draw in the neutral default and the card says nothing at all about colour. We
  // do not write "colour unknown" -- we simply never claim one. (This read 14 in three places,
  // which was the inverse: 15 rows DO have a colour. check_registry.py prints the live figure.)
  drawing: {
    // The orbit line under the selection (spec 0026 req 13): the same elements as the dot, one lap ahead.
    orbitLine: 'The line is one lap ahead, worked out from the same elements as the dot.',
    orbitLineYear: 'The line is the coming year of its path, worked out from the same elements as the dot.',
    // The far bodies draw their WHOLE path (scene/orbitline.js wholePathTimes): the coming year is
    // a sliver of Eris's 560-year lap and less than a hair of Sedna's. A hyperbola has no lap.
    orbitLineWhole: 'The line is its whole orbit around the Sun, worked out from the same elements as the dot.',
    orbitLinePassage: 'The line is its one pass through the Solar System, in and out, worked out from the same elements as the dot.',
    variant: 'drawn from published dimensions for {name}',
    // "and height": the size chip beside this line is the matched row's height_m, and on a
    // family match that is the family's figure -- 63 m for an H3 that may be flying the 57 m
    // S fairing, 98 m for an SLS Block 1B. One sentence has to cover both or the drawing is
    // hedged and the number beside it is not.
    family: 'drawn as {name} — the family shape and height, not this exact version',
    generic: 'drawn as a generic rocket; we have no dimensions for {name}',
    genericUnnamed: 'drawn as a generic rocket; we have no dimensions for this vehicle',
    disputed: 'sources disagree on its height ({disputed})',

    // THE CLASS-NEUTRAL TRIPLE. The three keys above say "rocket" out loud, which is right for
    // the only class that has ever printed them and wrong for a lapel pin. These are the same
    // three claims with the vehicle taken out of the words.
    //
    // PRINTED, since the builders landed: data/sample.js writes `meta.drawsAs` from each
    // registry/oddities.yaml row's own `shape.stands_for`, and drawingLine() picks this triple
    // for any record that is not a launch. The sentence a row's `shape.departure:` adds after it
    // is the row's own words, not a string here -- only the row knows what its builder
    // exaggerated to make the object read at 40 pixels.
    objectVariant: 'drawn from published dimensions for {name}',
    // ...and the one for a record whose shape is a FILE rather than a builder, because those are
    // two different claims and one string was making both. A rocket really is built in
    // scene/models.js from registry/rockets.yaml's metres, so "published dimensions" is exactly
    // what happened to it. Hubble, Chandra and Terra are NASA's own CAD, loaded and retextured --
    // nobody derived them from a dimension, and a card that says otherwise overstates how the
    // drawing was made. Source-agnostic on purpose: the next one of these may be a CC BY model
    // from somebody else, and CREDITS.md is where whose it is belongs.
    objectModel: 'drawn from a published model of {name}',
    objectFamily: 'drawn as {name} — the kind of thing, not this exact one',
    objectGeneric: 'drawn as a generic object; we have no shape for {name}',
    // The procedural shape a class falls back to when nothing more specific is known. Used
    // with objectFamily: "drawn as a generic satellite -- the kind of thing, not this exact one".
    classShape: {
      satellite: 'a generic satellite',
      station: 'a generic space station',
      debris: 'a piece of debris',
      rocket: 'a generic rocket',
      probe: 'a generic probe',
      telescope: 'a generic telescope',
      asteroid: 'a generic asteroid',
      // A dwarf planet is round by definition, and scene/models.js buildAsteroid draws anything over
      // about 900 km as a ball. Haumea, which is not, says so in its own row's `departure`.
      dwarf: 'a plain round body of its measured size',
      comet: 'a generic comet',
      site: 'a generic ground site',
      star: 'a point of light, sized by how bright it looks from where you are',
      exoplanet: 'a mark at its star — the orbit itself is far too small to draw',
      dso: 'a soft glow at its measured distance, as wide as it measures; its true shape is not drawn',
      exotic: 'a ring at its measured distance; a black hole has no shape to draw and a pulsar is far too small',
      exoticStar: 'a ring at its measured distance; the star itself is a point at this scale',
    },
    // Where an attached object sits on its carrier's model is our arrangement, AND SO IS HOW BIG
    // IT IS. The disc really is bolted to the side of the bus; the centimetre we chose is ours,
    // and so is the size -- a 30 cm record on a 13 m spacecraft is one or two pixels at the size
    // a model is drawn here, and three 4 cm figures on Juno are less than one. Both are drawn
    // far larger, and the sentence that says so has to cover both, so it belongs here rather
    // than in either registry row's `departure:`.
    // Pluto and Jupiter's four big moons ship no surface map (registry/worlds.yaml `look.flat`).
    // The colour is a hue from a published description, darker or lighter in the order of the
    // measured albedo; nobody averaged a photograph for it, and the line does not pretend so.
    worldFlat: 'drawn as a plain ball: there is no surface map of {name} here, and its one colour is chosen from published descriptions, not measured',
    // ...and Phobos and Deimos are not balls at all. Phobos is 27 by 22 by 18 km and Deimos is
    // "small and lumpy" (NASA Science, registry/worlds.yaml `facts.shape`); each is drawn as a ball
    // of its mean radius (JPL), and the card says the shape on screen is not theirs.
    worldFlatIrregular: 'drawn as a plain ball the size of its average radius: there is no surface map of {name} here, its one colour is chosen from published descriptions, not measured, and {name} is really a lumpy rock whose true shape is not drawn',
    mount: 'where we hang it on the model is our own arrangement, and it is drawn far bigger than it is — at true size it would be too small to see',
  },

  // A GUIDED TRIP. The stop's own words are NOT here -- they live in registry/tours.yaml, with
  // the stop they belong to, because a trip is a row and copy that lived in this file would make
  // adding one two edits in two languages of file. What is here is the CHROME: the language-
  // specific furniture that never changes when somebody adds a trip.
  trip: {
    // The count is stated AFTER the stops are resolved, so it is a fact and not a hope. This is
    // what a row says when the trip cannot reach its own floor: greyed with its reason, never
    // hidden -- a missing feature and a broken one look identical when you hide one.
    notEnoughStops:
      'Only {count} of the stops on this trip can be found right now, and it needs {min}.',
    // A stop that resolved and then stopped having a position. It never advances on its own: a
    // failure that scrolls past is a failure nobody can report.
    heldBody: 'We could not find this one just now. Everything else on the trip still works.',
    heldTitle: 'We could not find this one',
    stopOf: '{n} of {count}',

    // --- the row in the left panel -------------------------------------------------------
    sectionTitle: 'Trips',
    sectionHint: 'The camera flies it for you. Escape leaves at any time, and the view stays.',
    // Stated only AFTER the stops have been resolved. Before that the row says it is still
    // working it out, because a count printed before resolution is a guess wearing a fact's
    // clothes -- and this app's whole argument is that those are different things.
    planning: 'Working out what can be shown…',
    shape: '{count} stops · about {mins} minutes',
    shapeOneMinute: '{count} stops · about a minute',
    startTitle: 'Fly this trip',
    // --- the picker (spec 0029, ui/trippicker.js) ------------------------------------------
    // One <select> with a heading per group; the heading text itself is the registry's
    // `display` (TOUR_GROUPS), printed as it is, with its count folded in here because a native
    // <optgroup> has one label and no second line. A trip that cannot run today keeps its option
    // and gets the mark, never `disabled`: iOS draws a disabled option as grey text with nothing
    // attached, and the reason is printed in the details block under the select instead.
    pickerLabel: 'Choose a trip',
    groupCount: '{display} · {count} trips',
    groupCountOne: '{display} · 1 trip',
    cannotRunMark: '· cannot run today',
    // An event trip's next occurrence under its title (spec 0031 task 5): the date its first
    // `{event:}` stop resolves to, computed here like the Next list's eclipse rows.
    nextEventLine: 'Next: {date}',

    // --- the intro card ------------------------------------------------------------------
    // It sets the expectation, it makes the trip a decision rather than an ambush, and it gives
    // the scene a beat to settle before the first flight.
    introStart: 'Start',
    introSkip: 'Not now',
    droppedOne: 'One stop cannot be shown today and is not counted above.',
    droppedMany: '{n} stops cannot be shown today and are not counted above.',
    clockClamped: 'Time has been set back to normal speed for this trip.',
    // Spec 0030: a trip whose stops set the clock says so before it starts, and the end card says
    // what leaving will do. A visitor is never surprised to find the map a year on.
    clockMoves: 'This trip moves the clock. It is put back when you leave.',
    clockRestored: 'Leaving puts the clock back where you had it.',
    // The line under the trip's title while a stop owns the clock. Built from ui/tripframe.js's
    // reading of the clock, never from the registry, so it cannot disagree with what is drawn.
    stopTimeNow: 'Shown now',
    stopTimeAt: 'Shown at {when}',
    stopTimeRate: 'Shown at {when}, running {rate}',
    stopTimePaused: 'Shown at {when}, held while the trip is paused',
    shownAtUtc: '{when} UTC',
    // Spec 0037: the eclipse stops' honesty line, under the instant. Generated, never typed in the
    // registry. The first is the shader drawing; the second is the frame latch having turned it off
    // on a slow device (scene/quality.js), where the timing is still right and the picture is not.
    eclipseLine: "Shadow computed from the Moon's and the Sun's positions; timing from Astronomy Engine, to about a minute.",
    eclipseLineLatched: 'The shadow is not drawn on this device; the timing is right.',
    // The copper of a totally eclipsed Moon is a constant tint (scene/worlds.js uUmbraTint), not
    // sunlight bent through the Earth's air, and the lunar stop says so.
    eclipseColour: 'The colour is an illustration; the shadow is computed.',
    // A trip with `orbits:` on the Sun stage (scene/orbitrings.js, 2026-09-23): the dots are the one
    // exaggeration, size only. Under the instant on every stop, generated, never typed in a card.
    orbitsLine: 'Planets drawn larger than they are, as dots; their places and paths are computed.',
    // Spec 0040 req 8: every card on a star system's own stage says what is measured and what is
    // drawn. Generated (ui/cards.js drawingLine), never typed in the registry. {phase} is empty when
    // every planet's place on its orbit comes from a transit time (scene/systems.js
    // phaseIsMeasured), and systemPhaseUnknown when one of them is illustrative.
    systemLine: 'Sizes and orbits from the NASA Exoplanet Archive; the colours{phase} and the tilt of the orbits are illustrative.',
    systemPhaseUnknown: ', the planets’ places on their orbits',
    rateWords: {
      10: 'ten times faster than life',
      60: 'a minute a second',
      600: 'ten minutes a second',
      3600: 'an hour a second',
      36000: 'ten hours a second',
      // 525 600 s is 6.08 days: a day every 0.164 s.
      525600: 'a day every sixth of a second',
    },
    rateGeneric: '{n} times faster than life',
    // Spec 0038: a trip that starts from the visitor's own place (`target: {observer: true}`).
    // The place is GENERATED, never typed in the registry, and it says how it was got: a place
    // set by hand, one the device gave, or a guess from the clock, which says it is one.
    yourPlace: 'Your place',
    observerSet: 'Your place: {place}, set by you.',
    observerDevice: 'Your place: where your device says you are.',
    observerGuess: 'Your place is a guess from your clock’s time zone: {place}. Set it under Where you are for a better one.',
    needsPlace: 'Needs a place. Set where you are first.',
    // Recomputed while the stop is up: the station moves eight kilometres every second.
    stationFromYou: 'Right now it is {km} km from you.',
    // `px` is scene/heroes.js SELECTED_PX, interpolated so the sentence cannot outlive the number.
    drawnAtClassSize: 'The model is drawn {px} pixels wide whatever the distance; the real station would be a bright dot.',
    // Whether the pass the stop shows is one you could see: the station sunlit AND your sky dark
    // (sky/passes.js `visible`). A night pass in the Earth's shadow is not, so neither word is
    // "night" or "day" alone.
    passNight: 'On this pass it is sunlit against a dark sky: you could see it, weather allowing.',
    passDay: 'You would not see this pass: your sky is too light, or the station is in the Earth’s shadow.',

    // --- the letterbox -------------------------------------------------------------------
    frameLabel: 'guided trip',
    stopRole: 'stop',
    liveLabel: '{n} of {count}: {title}',
    pause: 'Pause',
    pauseTitle: 'Pause the trip',
    play: 'Play',
    playTitle: 'Carry on with the trip',
    back: 'Back',
    backTitle: 'The stop before this one',
    next: 'Next',
    nextTitle: 'The next stop',
    replay: 'Replay',
    replayTitle: 'Fly this move again',
    collapse: 'Hide card',
    collapseTitle: 'Fold the card away and watch (c)',
    expand: 'Show card',
    expandTitle: 'Bring the card back (c)',
    leave: 'Leave',
    leaveTitle: 'Leave the trip. The camera stays exactly where it is. (Escape)',
    // ...WHICH IS NOT TRUE OF A TRIP THAT MOVED THE MAP'S CENTRE (2026-09-22). A trip may be flown
    // on another world's stage or on a rung of the ladder, and leaving puts the centre back where
    // the visitor had it: one scene unit is a different distance there, so the camera cannot stay.
    // ui/trip.js says whether that happened (`state.stageChanged`) and ui/tripframe.js picks the
    // line. The end card said "The camera stays where it is" over a camera that was about to fly
    // 4.5 billion km home.
    leaveTitleStage: 'Leave the trip. The map goes back to the world it was centred on before, which moves the camera. (Escape)',
    progressLabel: 'How far through the trip you are',
    controlsLabel: 'Trip controls',

    // The chip that replaces the progress row when a hand lands on the camera. Not a modal: a
    // modal is what makes people feel caught, and the whole point is that grabbing the camera
    // never ends the trip.
    pausedChip: 'Trip paused',
    resume: 'Resume',
    resumeTitle: 'Fly back to the stop and carry on',

    // --- the end card --------------------------------------------------------------------
    // An unmarked ending is indistinguishable from a crash. Three offers, and not a menu.
    endTitle: 'That is the end of the trip.',
    endBody: 'The camera stays where it is. Nothing here goes back.',
    endBodyStage: 'Leaving puts the map back on the world it was centred on before the trip, because out here one step of the map is a different distance. Nothing else goes back.',
    endExplore: 'Explore from here',
    endExploreTitle: 'Keep this view and carry on by yourself',
    endExploreTitleStage: 'Carry on by yourself, back on the map you started from',
    endReplay: 'Watch it again',
    endNext: 'Next: {title}',

    docTitle: 'Space Radar — {title} — {n} of {count}',
  },

  source: {
    prefix: 'Source',
    unknown: 'Source not recorded',
    fetched: 'read {age}',
  },

  sky: {
    // A shower's radiant, marked in the sky view for the nights around its peak (sky/radiants.js).
    radiant: '{name} radiant',
    // The copy pattern that is the actual feature (docs/design-language.md).
    lookLine: 'Look {dir}, {fists}, at {time}. It moves for about {mins} minutes.',
    lookLineNoDuration: 'Look {dir}, {fists}, at {time}.',
    sunlit: 'It is still catching sunlight, which is what makes it visible.',
    notSunlit: 'It is in the Earth’s shadow on this pass, so you will not see it.',
    fistsHorizon: 'just above the horizon',
    fistsOverhead: 'almost straight up',
    fistsOne: 'about one fist above the horizon',
    fistsMany: 'about {n} fists above the horizon',
    noObserver: 'Set where you are and this line will tell you where to look.',
    noPass: 'It does not come above your horizon in the next 24 hours.',
    notVisibleFromGround: 'This one is too far away to pick out by eye.',
    // Stars, nebulae, galaxies: the question is brightness, not distance. Magnitude 6.5 is the
    // usual naked-eye limit from a dark site.
    nakedEye: 'Bright enough to see with your own eyes from a dark place.',
    needsTelescope: 'Too faint for the eye; a telescope, or a long photograph, shows it.',
    starOnly: 'Only its star can be seen, and only through a telescope; the planet itself is far too faint.',
    onTheGround: 'This one stands on the ground, so there is nothing to look up for.',
    onAnotherWorld:
      'This one is standing on {world}. You will not pick it out by eye from here, however clear the night.',
    worldRise: 'From where you are it comes up at {time}.',
    // Rise and set for a world needs 0014's sky maths. Say that, rather than imply it is
    // invisible: the Moon and the planets are the easiest things in the sky to find.
    worldNoRise:
      'You can see this one with your own eyes. Working out when it rises from your place is not in this version yet.',
    // ...which is not true of Pluto or of Jupiter's moons, so they say what IS true. Sources in
    // registry/worlds.yaml `facts.seen`: the moons are "readily seen with common binoculars" and
    // lost to the eye in Jupiter's glare (Wikipedia, Galilean moons); Pluto is magnitude 13.65 to
    // 16.3, mean 15.1 (Wikipedia's infobox) -- 8.6 magnitudes past the 6.5 this file calls the eye's
    // limit, which is 10^(0.4 x 8.6) = 2 750 times fainter.
    worldSee: {
      pluto: 'Not by eye, and not with binoculars: Pluto is nearly 3 000 times fainter than the faintest star you can see, so it takes a telescope.',
      io: 'Common binoculars show it as a point of light beside Jupiter; by eye it is lost in Jupiter’s glare.',
      europa: 'Common binoculars show it as a point of light beside Jupiter; by eye it is lost in Jupiter’s glare.',
      ganymede: 'Common binoculars show it as a point of light beside Jupiter; by eye it is lost in Jupiter’s glare.',
      callisto: 'Common binoculars show it as a point of light beside Jupiter; by eye it is lost in Jupiter’s glare.',
      // Six more moons, and Neptune (2026-09-22). Every magnitude is registry/worlds.yaml
      // `facts.seen` on that row; "times fainter" is against the same 6.5 limit, 10^(0.4 x the
      // difference): Triton 13.47 is 7.0 past it, 614 times; Charon 16.8 is 10.3 past it, 13 000.
      // Neptune is Wikipedia's 7.67 to 7.89 and "too faint to be visible to the naked eye", which
      // is why it no longer gets worldNoRise's "your own eyes". Uranus, 5.38 to 6.03 by the same
      // article, is at the eye's limit and keeps it.
      titan: 'Not by eye: Titan is magnitude 8.2 at its brightest, so it takes a small telescope or strong binoculars, and Saturn’s glare beside it makes even that hard.',
      enceladus: 'Not by eye: Enceladus is magnitude 11.7, and so close to bright Saturn and its rings that it is hard to see even through a small telescope.',
      triton: 'Not by eye or binoculars: Triton is magnitude 13.5, about 600 times fainter than the faintest star you can see, so it takes a telescope.',
      charon: 'Barely: Charon is magnitude 16.8, 13 000 times fainter than the faintest star you can see, and so close to Pluto that amateurs split the pair in 2008 by photographing them through a 14-inch telescope.',
      phobos: 'Not by eye: Phobos is magnitude 11.3 at its best and hugs Mars, whose glare drowns it; it was found in 1877 with a 26-inch telescope.',
      deimos: 'Not by eye: Deimos is magnitude 12.4 at its best and close to Mars, whose glare drowns it; it was found in 1877 with a 26-inch telescope.',
      neptune: 'Not by eye: Neptune is magnitude 7.7 to 7.9, too faint to see without help. Strong binoculars or a telescope show it as a small blue disc.',
      // Ten more (2026-09-22). Every magnitude is that row's `facts.seen` in registry/worlds.yaml:
      // Wikipedia's infobox for all ten. Saturn's five are the reachable ones, Uranus's five are
      // not: at magnitude 13.9 Titania is already 1 000 times fainter than the 6.5 this file calls
      // the eye's limit, and Miranda at 16.6 is 25 000 times.
      mimas: 'Not by eye: Mimas is magnitude 12.9 and hugs Saturn, so it takes a large telescope and a steady night.',
      tethys: 'Not by eye: Tethys is magnitude 10.2, within reach of a small telescope, though Saturn’s glare beside it makes it hard.',
      dione: 'Not by eye: Dione is magnitude 10.4, within reach of a small telescope, though Saturn’s glare beside it makes it hard.',
      rhea: 'Not by eye: Rhea is magnitude 10, the brightest of Saturn’s moons after Titan, and a small telescope will show it.',
      iapetus: 'Not by eye: Iapetus runs from magnitude 10.2 to 11.9 as its bright side and its dark side take turns facing us, so a small telescope catches it at its best.',
      miranda: 'Barely: Miranda is magnitude 16.6, lost in Uranus’s glare, and invisible to many amateur telescopes.',
      ariel: 'Not by eye or binoculars: Ariel is magnitude 14.8, about as faint as Pluto near its closest, so it takes a good telescope and a dark sky.',
      umbriel: 'Not by eye or binoculars: Umbriel is magnitude 15.1, the faintest of Uranus’s big four, so it takes a good telescope and a dark sky.',
      titania: 'Not by eye: Titania is magnitude 13.9, the brightest of Uranus’s moons, and still needs a telescope of some size.',
      oberon: 'Not by eye: Oberon is magnitude 14.1 and sits farthest out from Uranus of the five, so it takes a telescope and a steady night.',
    },
    couldNotLook: 'Could not work out a pass from here.',
    nowhereToLook: 'Nobody knows where this one is, so there is nowhere to look.',
  },

  controls: {
    title: 'Controls',
    layersTitle: 'What to show',
    layerCount: '{n}',
    layerCountLoading: 'counting',
    layerCountEmpty: 'nothing loaded',
    layerWaits: 'loads when switched on',
    // A layer whose members are in more than one state says so on its own tick. Zero parts are
    // dropped, so a layer that grows out of a state stops mentioning it without a code change.
    layerCountParts: {
      onMap: '{n} on the map',
      riding: '{n} riding on something else',
      unplaceable: '{n} we cannot place',
    },
    layersEmpty: 'No layers are loaded yet.',
    clockTitle: 'Time',
    play: 'Play',
    pause: 'Pause',
    playTitle: 'Let time run',
    pauseTitle: 'Hold time still',
    speedTitle: 'Speed',
    speedLabel: '{n}×',
    nowButton: 'Now',
    nowTitle: 'Jump back to the real time',
    scrubTitle: 'Drag to move through time',
    scrubbing: 'Scrubbing',
    live: 'Live',
    utcLabel: 'UTC',
    localLabel: 'Your time',
    localTimeFallback: 'local',
    locationTitle: 'Where you are',
    locationPlaceholder: 'Type a city',
    locationSearchLabel: 'Find a city',
    locationUseMine: 'Use my location',
    locationUseMineTitle: 'Ask the browser where you are',
    // This WILL be the state on the first S3 test, so the explanation has to be good.
    locationInsecure:
      'The browser only shares your location with pages served over https. This page is on plain http, so the button is switched off. Pick a city instead, or open the https address once there is one.',
    locationUnsupported: 'This browser has no location service. Pick a city instead.',
    locationDenied: 'The browser said no. Pick a city instead; nothing else changes.',
    locationFailed: 'The browser could not work out where you are. Pick a city instead.',
    locationAsking: 'Asking the browser',
    locationNone: 'Not set',
    locationSet: '{name}',
    locationCleared: 'Cleared',
    locationClear: 'Clear',
    locationCoords: '{lat}, {lon}',
    locationNoMatch: 'No city in the bundled list matches that.',
    locationHint: 'A rough position is enough. It is only used in your browser.',
    // The Now moment's first screen guesses a place from the clock and says so, in words that a
    // person reads, not in a tooltip: a guess about where you are is held to the same rule as a
    // guess about an orbit.
    locationGuessed: 'We guessed {name} from your clock’s time zone. Set where you are if that is wrong.',
    locationGuessedByOffset: 'We guessed {name} from your clock’s offset from UTC, which is rough. Set where you are.',
    tonightTitle: 'Coming over tonight',
    tonightHint: 'The next twelve hours, from where you are. Only passes bright enough to see.',
    tonightRow: '{name} at {time}, {dir}, {fists}',
    tonightNone: 'Nothing bright comes over in the next twelve hours.',
    tonightNoObserver: 'Set where you are, or open the Now door, and this will list what comes over.',
    tonightCouldNotLook: 'Could not look: the satellite catalogue has not loaded.',
    tonightShowerTail: 'The sky view marks its radiant.',
  },

  // ui/search.js. The footer strings are the honest ones: a layer nobody has read has no size,
  // so the search says how many objects it IS looking at and refuses to guess at the rest.
  search: {
    title: 'Find an object',
    placeholder: 'Type a name or a catalogue number',
    inputLabel: 'Search for an object by name or catalogue number',
    listLabel: 'Matching objects',
    fly: 'Fly to it',
    flyTitle: 'Move the camera to the highlighted object and open its card',
    hint: 'Two letters is enough. Enter picks the top one.',
    noMatch: 'Nothing that has loaded matches that.',
    more: '{n} more match. Type a little more to narrow it.',
    searching: 'Searching {n} objects.',
    searchingOne: 'Searching one object.',
    empty: 'Nothing has loaded yet, so there is nothing to search.',
    notLoaded: 'Not loaded, so not searched: {layers}.',
    stillLoading: 'Still loading, so not searched yet: {layers}.',
    loadsWhenOn: 'Loaded only when you switch them on, to save data, so not searched yet: {layers}.',
    couldNotRead: 'Could not be read, so not searched: {layers}.',
    fallback: 'Nothing starts with that, so these merely contain it.',
    switchedOn: 'Switched on {layer} so you can see it.',
    notLoadedCount: 'How many objects that leaves out cannot be known until they load.',
  },

  // Data-saver and the frame-rate latch (spec 0026 req 18): two things the app decided for the visitor, said out loud.
  quality: {
    dataSaver: 'Your connection asked for data-saving, so the two biggest catalogues wait until you switch them on.',
    lowered: 'Frames were taking {ms} ms, so the picture is drawn at one pixel per pixel without the Milky Way backdrop.',
  },

  status: {
    title: 'What the app could and could not read',
    intro:
      'Every source it reads, how old that reading is, and where it comes from. Nothing here is hidden in a footer.',
    stateOk: 'ok',
    stateStale: 'stale',
    stateUnknown: 'could not look',
    stateOkTitle: 'Read recently and inside its freshness window.',
    stateStaleTitle: 'We have a copy, but it is older than this source promises.',
    stateUnknownTitle:
      'We have never had a good read from this source in this browser. This is not the same as fine, and it is not the same as an error on a copy we hold.',
    ageNever: 'never read',
    ageLabel: 'last read {age}',
    // A source we have never had a good copy from needs its own line, not "last read
    // never read": the point of the third state is that it does not read like the others.
    ageNeverLine: 'no good copy in this browser yet',
    // Provenance, one line per source (spec 0003 amendment 1 §4). {age} is ageInWords.
    viaSnapshotLine: 'from our snapshot, fetched {age}',
    viaLiveLine: 'read live from {publisher} {age}',
    snapshotOverdue: 'a fresher copy is overdue',
    couldNotLookLine: 'could not look: {reason}',
    reasonNoRoute: '{why}, and a browser cannot read {publisher} directly',
    // Why our snapshot was not the source, keyed by the code data/sources.js reports.
    snapshotWhy: {
      'no-index': 'our snapshot index could not be read',
      'not-in-index': 'our snapshots do not include this source',
      refused: 'the last harvest of it was refused',
      error: 'the last harvest of it failed',
      skipped: 'the harvester skipped it',
      unreadable: 'our snapshot of it could not be read',
    },
    // The manifest's own line at the head of the panel.
    harvestUnchecked: 'Our snapshots: not checked yet.',
    harvestUnavailable:
      'Our snapshots are not available right now, so every source below is read live from its publisher, or not at all.',
    harvestLine: 'Our snapshots: written {age} · {ok} sources ok · {refused} refused · {error} failed',
    errorLabel: 'Last error',
    attributionTitle: 'Credits',
    attributionIntro: 'The data on this map is other people’s work.',
    layersTitle: 'Live or bundled',
    layersIntro:
      'Live is read from its publisher, or worked out for this moment, as you watch. A catalogue ships with the app: stars, galaxies and the dishes and landing sites on the ground do not move while you look. A bundled sample stands in for a source a browser cannot call at all.',
    layerLive: 'live',
    // Stars, galaxies, black holes and the exoplanet table are positions from a catalogue that ships
    // with the app. The panel called them "live" beside "NASA Exoplanet Archive: could not look".
    layerCatalogue: 'catalogue',
    layerSample: 'bundled sample',
    layerIllustrative: 'drawn, not tracked',
    layerMixed: 'mixed',
    layerEmpty: 'nothing loaded',
    layerCountLabel: '{n} shown',
    sourcesEmpty: 'No sources have been declared.',
    notAsked: '{n} more sources are read only when a layer that needs them is switched on.',
    refresh: 'Read again',
    refreshTitle: 'Ask every source that is due for a fresh copy',
  },

  time: {
    justNow: 'just now',
    aMinuteAgo: 'a minute ago',
    minutesAgo: '{n} minutes ago',
    anHourAgo: 'an hour ago',
    hoursAgo: '{n} hours ago',
    aDayAgo: 'a day ago',
    daysAgo: '{n} days ago',
    lessThanAMinute: 'less than a minute',
    aMinute: 'a minute',
    minutes: '{n} minutes',
    anHour: 'an hour',
    hours: '{n} hours',
    aDay: 'a day',
    days: '{n} days',
    inFuture: 'in {d}',
    ago: '{d} ago',
  },

  // The phone's bottom bar. It lives in ui/mobile.js, which wrote these three strings itself
  // until scripts/check_copy.py was finally written and found them on its first run.
  //
  // `close` / `closeTitle` are the sticky Close row at the top of each drawer. The drawer is 62%
  // of a phone screen and z-orders OVER the bar that opened it, so before this row the only way
  // out was to reload: tapping where "Layers" is drawn hit a layer checkbox underneath and
  // silently turned a layer off. `closeTitle` takes the panel's own label so that adding a
  // drawer stays one row in ui/mobile.js's PANELS table.
  //
  // `controls` names the drawer that holds the trips, the Wonder/Now/Next switch and the layer
  // list, in that order. It used to say "Layers", which is the LAST thing in it: on a desktop the
  // trips are the first panel anyone sees, and on a phone -- measured 2026-09-21 at 390 x 844 --
  // they were behind a button that did not mention them, so a first visit showed the Earth and two
  // buttons called Layers and Sources, and nothing that said there was a guided trip to take.
  mobile: {
    barLabel: 'Panels',
    controls: 'Trips & layers',
    sources: 'Sources',
    close: 'Close',
    closeTitle: 'Close {panel}',
  },

  // The GitHub mark in the top corner. `href` is here rather than in ui/github.js for the same
  // reason the words are: it is the one line a human edits when the repository moves, and it
  // should not be hunted for inside a module.
  mark: {
    label: 'Source on GitHub',
    title: 'Space Radar source code on GitHub',
    href: 'https://github.com/Sara-Managed-Projects/space-radar',
  },

  glossary: {
    title: 'Words on this page',
    hint: 'Tap a term for a plain sentence.',
  },

  // ------------------------------------------------------------------------------------
  // The ten class templates. Each is a lead plus optional clauses; cards.js adds clauses
  // in order while the sentence stays under 160 characters, and never invents a number.
  // The "why now" clause is first in every list, per spec 0013's template table.
  // ------------------------------------------------------------------------------------
  templates: {
    exotic: {
      leadBlackhole: '{name} is a black hole {dist} light-years away',
      leadPulsar: '{name} is a pulsar {dist} light-years away',
      leadMagnetar: '{name} is a magnetar {dist} light-years away',
      leadStar: '{name} is a star {dist} light-years away',
      leadRange: '{name} is {a} {kind} somewhere between {lo} and {hi} light-years away',
      mass: 'weighing {n} Suns',
      massRange: 'weighing between {lo} and {hi} Suns',
      massMillions: 'weighing {n} million Suns',
      massBillions: 'weighing {n} billion Suns',
      spins: 'turning {n} times a second',
      spinsSlow: 'turning once every {n} seconds',
      kinds: { blackhole: 'black hole', pulsar: 'pulsar', magnetar: 'magnetar', star: 'star' },
    },
    dso: {
      leadHome: '{name} is the galaxy we live in; its centre is {dist} light-years away',
      lead: '{name} is {a} {type} {dist} light-years away',
      leadRange: '{name} is {a} {type} somewhere between {lo} and {hi} light-years away',
      leadUntyped: '{name} is {dist} light-years away',
      size: 'about {n} light-years across',
      // A participle, so it hangs off the sentence: "..., the light you see left it 2.54 million
      // years ago" was a second sentence joined with a comma.
      seenAs: 'seen as it was {n} years ago',
      seenAsMillions: 'seen as it was {n} million years ago',
      constellation: 'in {con}',
      // OpenNGC type codes -> words, for the sentence. The card's row prints the source's own words.
      kinds: { galaxy: 'galaxy', nebula: 'nebula', cluster: 'star cluster', other: 'deep-sky object' },
    },
    exoplanet: {
      lead: '{name} is a planet around the star {host}, {dist} light-years away',
      leadNoHost: '{name} is a planet around another star, {dist} light-years away',
      size: 'about {n} times as wide as Earth',
      sizeSmaller: 'about {n} of Earth’s width',
      mass: '{n} times Earth’s mass',
      year: 'its year lasts {n} days',
      yearHours: 'its year lasts {n} hours',
      found: 'found in {year} by the {method} method',
      foundYear: 'found in {year}',
      asOf: 'from a copy of the catalogue as of {date}',
    },
    star: {
      lead: '{name} is a star {dist} light-years away',
      // The colour goes in the lead: "Proxima Centauri is a star 4.23 light-years away, one of the
      // nearest there are, a red star, the light you see left it 4 years ago" said "star" twice
      // and ran two sentences together with a comma (read on a trip card, 2026-09-22).
      // {a} is article(colour): "an orange star". A literal 'a' printed "Arcturus is ... a orange star".
      leadColour: '{name} is {a} {colour} star {dist} light-years away',
      near: 'one of the nearest there are',
      seenAs: 'seen as it was {n} years ago',
      seenAsMonths: 'seen as it was {n} months ago',
      luminosity: 'shining {n} times as bright as the Sun',
      dimmer: 'shining at {n} of the Sun’s brightness',
      // Spectral class letter -> the colour a person would see. The letters are the physics; the
      // words are what the eye reports, and they are the whole reason to print the class at all.
      colours: { O: 'blue', B: 'blue-white', A: 'white', F: 'yellow-white', G: 'yellow', K: 'orange', M: 'red' },
    },
    station: {
      lead: '{name} is a crewed space station circling Earth',
      whyPass: 'crossing your sky at {time}',
      crew: 'with {crew} people aboard',
      altitude: '{alt} km up',
      speed: 'going round once every {period} minutes',
    },
    satellite: {
      lead: '{name} is a satellite going round the Earth',
      // {kind} is the model route's own name for the type -- "a Dragon spacecraft", "a Starlink V2
      // Mini", "a GLONASS navigation satellite" -- where the route knows one.
      leadKind: '{name} is {kind} going round the Earth',
      // Within DOCKED_KM of a crewed station, right now: measured 2026-09-22, the vehicles at the ISS
      // and Tiangong sit 0.00 to 0.43 km from them and everything else is over 1 600 km away.
      leadDocked: '{name} is {kind} docked at the {station}',
      aSpacecraft: 'a spacecraft',
      // A route for one named telescope (Hubble, Chandra, TESS) carries a proper name, not a type;
      // its class says what it is.
      aTelescope: 'a space telescope',
      whyLaunchedDays: 'launched {n} days ago',
      whyLaunchedYear: 'launched in {year}',
      operator: 'flown by {operator}',
      purpose: '{purpose}',
      altitude: '{alt} km up',
      whyPass: 'crossing your sky at {time}',
    },
    debris: {
      lead: '{name} is a tracked piece of debris',
      origin: 'left over from {origin}',
      brokeUp: 'which broke up in {year}',
      decay: 'expected to fall back into the atmosphere around {date}',
      altitude: '{alt} km up',
      burnsUp: 'almost all of it burns up on the way down',
    },
    rocket: {
      lead: '{name} is a rocket launch',
      leadWithPad: '{name} is a rocket launch from {pad}',
      // A rocket BODY in orbit is catalogued as klass rocket too -- SL-8 R/B, ATLAS CENTAUR 2 -- and
      // the card called a 1970s upper stage "a rocket launch". Spent stages are among the brightest
      // things in the visual layer, so it was one of the commonest cards to be wrong.
      leadStage: '{name} is a spent rocket stage going round the Earth',
      stageLaunched: 'launched in {year}',
      whyCountdown: 'lifting off {when}',
      whyFlown: 'which lifted off {when}',
      destination: 'heading for {destination}',
      payload: 'carrying {payload}',
      illustrative: 'the track drawn here is a sketch of the climb, not a measured path',
    },
    probe: {
      lead: '{name} is a spacecraft out in the solar system',
      // A craft round another world (#215): "out in the solar system" was all its card said of
      // where it is, while the rows under it read "In orbit round: Mars" (2026-09-22).
      leadOrbits: '{name} is a spacecraft circling {world}',
      destination: 'on its way to {destination}',
      lightTime: 'far enough that a radio message takes {mins} minutes each way',
      // Under a minute, seconds: LRO's card said "0.022 minutes each way" (2026-09-22).
      lightTimeSeconds: 'near enough that a radio message takes {secs} seconds each way',
      // Past two hours, hours: "1431 minutes each way" was Voyager 1, a day away (2026-09-22).
      lightTimeHours: 'far enough that a radio message takes {hours} hours each way',
      distanceSun: '{au} astronomical units from the Sun',
      milestone: 'with {milestone} due on {date}',
    },
    telescope: {
      lead: '{name} is a space telescope',
      observing: 'pointed at {target} this week',
      station: 'parked at {station}',
      altitude: '{alt} km up',
      sees: 'it sees in {band}',
    },
    asteroid: {
      lead: '{name} is a near-Earth object on its own orbit around the Sun',
      // Ceres, Vesta and Pallas are in the layer too, and each carries `neo: false`: perihelia of
      // 2.1 to 2.5 au, nowhere near Earth. The card called all of them near-Earth objects.
      leadMainBelt: '{name} is an asteroid in the main belt, between Mars and Jupiter',
      // The far-bodies layer (2026-09-22). Its first sentence has to be true of a world 95 au out,
      // and "a near-Earth object" or "in the main belt" is true of none of them but Ceres. Which
      // of these a card uses is decided from the record's own perihelion and aphelion
      // (ui/cards.js farRegion), never from a label somebody typed.
      leadDwarf: '{name} is a dwarf planet on its own orbit around the Sun',
      leadDwarfBelt: '{name} is a dwarf planet in the asteroid belt, between Mars and Jupiter',
      leadDwarfBeyond: '{name} is a dwarf planet beyond Neptune',
      leadDwarfFarBeyond: '{name} is a dwarf planet far beyond Neptune',
      // 'Oumuamua: not bound to the Sun (e 1.20). Which way it is going is the clock's to say --
      // a visitor can wind the app back to before 9 September 2017.
      leadInterstellarOut: '{name} came from another star and is on its way out of the Solar System',
      leadInterstellarIn: '{name} came from another star and is falling in towards the Sun',
      distanceSun: '{au} astronomical units from the Sun',
      whyApproach: "passing Earth on {date} at {ld}× the Moon's distance",
      size: '{size}',
      // Only written when a named source says so (spec 0013 requirement 6).
      willNotHit: 'it will not hit Earth',
    },
    comet: {
      lead: '{name} is a comet on a long loop around the Sun',
      // A periodic comet -- 123P, Halley's -- comes back every few years or decades. "A long loop"
      // was right only for the C/ comets, and the card said it of 123P/West-Hartley, period 7.6 years.
      leadPeriodic: '{name} is a comet that comes round the Sun every {n} years',
      // 2I/Borisov (e 3.36): "a long loop around the Sun" would be the one thing it is not.
      leadInterstellarOut: '{name} is a comet from another star, on its way out of the Solar System',
      leadInterstellarIn: '{name} is a comet from another star, falling in towards the Sun',
      whyPerihelion: 'closest to the Sun on {date}',
      nakedEye: 'bright enough to find without a telescope',
      faint: 'too faint to see without a telescope',
      distanceSun: '{au} astronomical units out',
    },
    // The one plain sentence for an oddity is the registry row's own `fact:`, capped at the
    // card's 160 characters where it is WRITTEN (scripts/check_registry.py) rather than truncated
    // here where it is read. `fallback` is for a row with no fact, which the validator refuses --
    // it exists so the card degrades to a true sentence rather than to an empty one.
    oddity: {
      lead: '{fact}',
      fallback: '{name} is one of the odd things people have sent off the planet',
    },
    site: {
      lead: '{name} is a place on the ground that works with spacecraft',
      leadKind: '{name} is {a} {kind}', // {a}: "an observatory"
      where: 'in {where}',
      whyDsn: 'talking to {spacecraft} right now',
      whyLaunch: 'with {launch} due {when}',
      kinds: {
        pad: 'launch pad',
        dish: 'radio dish',
        observatory: 'observatory',
        tracking: 'tracking station',
      },
    },
    world: {
      lead: '{name} is a world in the solar system',
      leadMoon: '{name} is the Earth’s own moon',
      // The worlds layer holds the Sun too, and "The Sun is a world in the solar system" is wrong.
      leadSun: '{name} is the star at the centre of the solar system',
      // The Moon's distance in kilometres: the comparison chooser picks "x the Moon's distance" for
      // anything in lunar range, and printed "The Moon ... 1.02x the Moon's distance" about itself.
      distanceKm: '{n} km away',
      whyPhase: '{phase} tonight',
      whyRise: 'rising from where you are at {time}',
      distance: '{distance}',
      diameter: 'about {n} km across',
      // What a world IS, where "a world in the solar system" says too little. Only the worlds that
      // came with sourced facts carry a line (registry/worlds.yaml `facts.what` names the page each
      // was read from); the rest keep `lead`. Short on purpose: the distance and the size have to
      // fit after it inside the card's 160 characters.
      leadWhat: '{name} is {what}',
      what: {
        pluto: 'a dwarf planet beyond Neptune, counted as the ninth planet until 2006',
        io: 'one of Jupiter’s four big moons, and the most volcanic world in the solar system',
        europa: 'one of Jupiter’s four big moons, with a salt-water ocean under its ice',
        ganymede: 'Jupiter’s biggest moon and the biggest in the solar system, larger than Mercury',
        callisto: 'one of Jupiter’s four big moons, and the most heavily cratered object in the solar system',
        // Six more (2026-09-22), each from its NASA Science page (registry/worlds.yaml `facts.what`;
        // Titan's landing from `facts.landing`).
        titan: 'Saturn’s biggest moon, under thick orange haze, with methane lakes; Huygens landed there in 2005',
        enceladus: 'a small icy moon of Saturn whose geysers spray the ocean under its ice out into space',
        triton: 'Neptune’s biggest moon; it orbits backwards and is probably a captured Kuiper Belt object',
        charon: 'Pluto’s biggest moon, half Pluto’s size; the two always turn the same faces to each other',
        phobos: 'the larger of Mars’s two moons, a lumpy rock spiralling in towards Mars by 1.8 m a century',
        deimos: 'the smaller of Mars’s two moons, a small lumpy rock covered in craters',
        // Ten more (2026-09-22), each from its NASA Science page or its Wikipedia article, as
        // registry/worlds.yaml `facts.what` records. Short, because the distance and the size have
        // to fit after it: Titania's leaves 60 characters spare at the widest the distance gets.
        mimas: 'Saturn’s innermost round moon, marked by a crater a third as wide as the moon itself',
        tethys: 'Saturn’s fifth largest moon, almost pure water ice, split by a chasm and a huge crater',
        dione: 'an icy moon of Saturn whose trailing side is laced with a network of bright ice cliffs',
        rhea: 'Saturn’s second largest moon, a frozen dirty snowball of ice and rock',
        iapetus: 'Saturn’s third largest moon: one side as dark as coal, the other ten times brighter',
        miranda: 'the smallest of Uranus’s five big moons, with canyons up to 12 times the Grand Canyon’s depth',
        ariel: 'the brightest and youngest-looking of Uranus’s five big moons, cut across by fault valleys',
        umbriel: 'the darkest of Uranus’s big moons, reflecting about a fifth of the light that reaches it',
        titania: 'Uranus’s largest moon, neutral grey, split by fault valleys nearly 1 600 km long',
        oberon: 'Uranus’s second largest moon, dark, cratered, and carrying a mountain 6 km high',
      },
    },
  },
};

// ---------------------------------------------------------------------------------------
// GLOSSARY -- the 32 terms from registry/glossary.yaml, verbatim. A term used on a card
// that is not here fails CI (spec 0013 requirement 7).
// ---------------------------------------------------------------------------------------

export const GLOSSARY = {
  orbit:
    'A path around something, held by gravity. Fast enough sideways and you keep falling past the Earth instead of into it.',
  'low Earth orbit':
    'The busy shell from about 200 to 2000 km up. The station, most satellites and most of the debris are here.',
  geostationary:
    'An orbit 35 786 km up where one lap takes exactly one day, so the satellite seems to hang over one spot.',
  'polar orbit':
    'An orbit over the poles. The Earth turns underneath, so the satellite eventually sees every part of it.',
  elements:
    'Six numbers plus a date that describe an orbit. Feed them to the right maths and you get a position.',
  epoch:
    'The moment a set of orbital elements was true. The further you are from it, the less exact the answer.',
  apogee: 'The high point of an orbit around Earth.',
  perigee: 'The low point of an orbit around Earth.',
  perihelion: 'The point where something orbiting the Sun comes closest to it.',
  inclination:
    'How tilted an orbit is compared with the equator. Ninety degrees goes over the poles.',
  propagated: 'Worked forward from an older measurement. Not a fresh observation, and it drifts.',
  'lunar distance':
    'The distance from Earth to the Moon, about 384 000 km. A handy ruler for asteroid passes.',
  'astronomical unit': 'The distance from Earth to the Sun, about 150 million km.',
  'light-time':
    'How long light takes to cross a distance. It is also how long a radio message takes.',
  magnitude: 'How bright something looks. The scale runs backwards: smaller numbers are brighter.',
  azimuth: 'A compass direction in degrees. Zero is north, 90 is east.',
  elevation: 'How high something is above the horizon, in degrees. Ninety is straight up.',
  terminator: 'The line between day and night on a world.',
  twilight:
    'The time after sunset when the sky is not yet fully dark. Satellites are easiest to see then.',
  sunlit:
    'Still catching sunlight even though the ground below is dark. That is what makes a satellite visible.',
  radiant: 'The point in the sky a meteor shower seems to come from.',
  ZHR: 'Roughly how many meteors an hour you would see under a perfect dark sky with the radiant overhead. Usually you see fewer.',
  'close approach':
    'When an asteroid passes near Earth. Near in astronomy usually means further than the Moon.',
  'near-Earth object': "An asteroid or comet whose orbit brings it close to Earth's.",
  reentry: 'When something falls back into the atmosphere. Most of it burns up on the way down.',
  debris:
    'Dead satellites, spent rocket stages and fragments. Tens of thousands of pieces are tracked.',
  constellation:
    'A pattern of stars people named long ago. The stars in one are usually nowhere near each other.',
  L1: 'A balance point between the Earth and the Sun, about 1.5 million km sunward. Good for watching the Sun.',
  L2: 'A balance point 1.5 million km from Earth on the side away from the Sun, where a telescope can keep the Earth and Sun behind it and stay cold.',
  transit: 'When one thing passes in front of another as seen from where you stand.',
  conjunction: 'When two things appear close together in the sky. They are not close in space.',
  ephemeris: 'A table of where something will be, worked out in advance.',
};

// ---------------------------------------------------------------------------------------
// A bundled city list, so the app is usable with geolocation refused or unavailable.
// Coordinates are city-centre, to four decimals; a rough position is all a pass needs.
// ---------------------------------------------------------------------------------------

export const CITIES = [
  { name: 'Amsterdam', country: 'Netherlands', latDeg: 52.3676, lonDeg: 4.9041 },
  { name: 'Anchorage', country: 'United States', latDeg: 61.2181, lonDeg: -149.9003 },
  { name: 'Auckland', country: 'New Zealand', latDeg: -36.8485, lonDeg: 174.7633 },
  { name: 'Bangkok', country: 'Thailand', latDeg: 13.7563, lonDeg: 100.5018 },
  { name: 'Beijing', country: 'China', latDeg: 39.9042, lonDeg: 116.4074 },
  { name: 'Berlin', country: 'Germany', latDeg: 52.52, lonDeg: 13.405 },
  { name: 'Bogota', country: 'Colombia', latDeg: 4.711, lonDeg: -74.0721 },
  { name: 'Buenos Aires', country: 'Argentina', latDeg: -34.6037, lonDeg: -58.3816 },
  { name: 'Cairo', country: 'Egypt', latDeg: 30.0444, lonDeg: 31.2357 },
  { name: 'Cape Town', country: 'South Africa', latDeg: -33.9249, lonDeg: 18.4241 },
  { name: 'Chicago', country: 'United States', latDeg: 41.8781, lonDeg: -87.6298 },
  { name: 'Delhi', country: 'India', latDeg: 28.6139, lonDeg: 77.209 },
  { name: 'Dhaka', country: 'Bangladesh', latDeg: 23.8103, lonDeg: 90.4125 },
  { name: 'Dubai', country: 'United Arab Emirates', latDeg: 25.2048, lonDeg: 55.2708 },
  { name: 'Helsinki', country: 'Finland', latDeg: 60.1699, lonDeg: 24.9384 },
  { name: 'Hong Kong', country: 'China', latDeg: 22.3193, lonDeg: 114.1694 },
  { name: 'Honolulu', country: 'United States', latDeg: 21.3069, lonDeg: -157.8583 },
  { name: 'Istanbul', country: 'Turkey', latDeg: 41.0082, lonDeg: 28.9784 },
  { name: 'Jakarta', country: 'Indonesia', latDeg: -6.2088, lonDeg: 106.8456 },
  { name: 'Johannesburg', country: 'South Africa', latDeg: -26.2041, lonDeg: 28.0473 },
  { name: 'Karachi', country: 'Pakistan', latDeg: 24.8607, lonDeg: 67.0011 },
  { name: 'Kolkata', country: 'India', latDeg: 22.5726, lonDeg: 88.3639 },
  { name: 'Lagos', country: 'Nigeria', latDeg: 6.5244, lonDeg: 3.3792 },
  { name: 'Lima', country: 'Peru', latDeg: -12.0464, lonDeg: -77.0428 },
  { name: 'London', country: 'United Kingdom', latDeg: 51.5074, lonDeg: -0.1278 },
  { name: 'Los Angeles', country: 'United States', latDeg: 34.0522, lonDeg: -118.2437 },
  { name: 'Madrid', country: 'Spain', latDeg: 40.4168, lonDeg: -3.7038 },
  { name: 'Manila', country: 'Philippines', latDeg: 14.5995, lonDeg: 120.9842 },
  { name: 'Melbourne', country: 'Australia', latDeg: -37.8136, lonDeg: 144.9631 },
  { name: 'Mexico City', country: 'Mexico', latDeg: 19.4326, lonDeg: -99.1332 },
  // Added 2026-09-23 for the Miami kiosk (spec 0038's trip starts from the visitor's own place):
  // its time zone is America/New_York, so the guess says New York, and the box could not find it.
  { name: 'Miami', country: 'United States', latDeg: 25.7617, lonDeg: -80.1918 },
  { name: 'Moscow', country: 'Russia', latDeg: 55.7558, lonDeg: 37.6173 },
  { name: 'Mumbai', country: 'India', latDeg: 19.076, lonDeg: 72.8777 },
  { name: 'Nairobi', country: 'Kenya', latDeg: -1.2921, lonDeg: 36.8219 },
  { name: 'New York', country: 'United States', latDeg: 40.7128, lonDeg: -74.006 },
  { name: 'Osaka', country: 'Japan', latDeg: 34.6937, lonDeg: 135.5023 },
  { name: 'Paris', country: 'France', latDeg: 48.8566, lonDeg: 2.3522 },
  { name: 'Reykjavik', country: 'Iceland', latDeg: 64.1466, lonDeg: -21.9426 },
  { name: 'Rio de Janeiro', country: 'Brazil', latDeg: -22.9068, lonDeg: -43.1729 },
  { name: 'Rome', country: 'Italy', latDeg: 41.9028, lonDeg: 12.4964 },
  { name: 'San Francisco', country: 'United States', latDeg: 37.7749, lonDeg: -122.4194 },
  { name: 'Santiago', country: 'Chile', latDeg: -33.4489, lonDeg: -70.6693 },
  { name: 'Sao Paulo', country: 'Brazil', latDeg: -23.5505, lonDeg: -46.6333 },
  { name: 'Seoul', country: 'South Korea', latDeg: 37.5665, lonDeg: 126.978 },
  { name: 'Shanghai', country: 'China', latDeg: 31.2304, lonDeg: 121.4737 },
  { name: 'Singapore', country: 'Singapore', latDeg: 1.3521, lonDeg: 103.8198 },
  { name: 'Stockholm', country: 'Sweden', latDeg: 59.3293, lonDeg: 18.0686 },
  { name: 'Sydney', country: 'Australia', latDeg: -33.8688, lonDeg: 151.2093 },
  { name: 'Tehran', country: 'Iran', latDeg: 35.6892, lonDeg: 51.389 },
  { name: 'Tokyo', country: 'Japan', latDeg: 35.6762, lonDeg: 139.6503 },
  { name: 'Toronto', country: 'Canada', latDeg: 43.6532, lonDeg: -79.3832 },
  { name: 'Vancouver', country: 'Canada', latDeg: 49.2827, lonDeg: -123.1207 },
  { name: 'Warsaw', country: 'Poland', latDeg: 52.2297, lonDeg: 21.0122 },
];

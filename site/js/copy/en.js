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
  } else if (minutes < 1440 * 90) {
    const n = Math.round(minutes / 1440);
    body = n === 1 ? COPY.time.aDay : t(COPY.time.days, { n });
  } else if (minutes < 1440 * 730) {
    // Past three months a count of days is a sum nobody does ("in 300 days"); past two years, months are.
    body = t(COPY.time.months, { n: Math.round(minutes / (1440 * 30.44)) });
  } else {
    body = t(COPY.time.years, { n: Math.round(minutes / (1440 * 365.25)) });
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
const utcLongFmt = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});
const clockFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const pillFmt = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
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
  /**
   * "29 SEP 21:14 UTC" -- the time pill's readout (spec 0061 §7). en-US for the month because en-GB
   * now writes "Sept", and the pill is set in capitals where a four-letter month is one too many.
   */
  pillUtc: (ms, nowMs) => {
    const parts = {};
    for (const p of pillFmt.formatToParts(new Date(ms))) parts[p.type] = p.value;
    // More than half a year from now the year is the point: "05 MAR 12:05" for Voyager at Jupiter
    // would read as last spring (the Roadster mistake, dateNear above).
    const far = Number.isFinite(nowMs) && Math.abs(ms - nowMs) > 180 * 86400e3;
    const day = `${parts.day} ${String(parts.month || '').toUpperCase()}`;
    return t(COPY.timePill.when, {
      date: far ? `${day} ${new Date(ms).getUTCFullYear()}` : day,
      time: `${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}`,
    });
  },
  /** "5 March 1979", in UTC: a mission's event (ui/missions.js), a dated card (ui/today.js). */
  utcLong: (ms) => utcLongFmt.format(new Date(ms)),
  /** "21:30", in UTC: a tick on the timeline (ui/scrubber.js). */
  utcHm: (ms) => {
    const parts = {};
    for (const p of pillFmt.formatToParts(new Date(ms))) parts[p.type] = p.value;
    return `${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}`;
  },
  /** "07 Oct", in UTC: a day on the timeline and on a dated card (set in capitals by their CSS). */
  utcDay: (ms) => {
    const parts = {};
    for (const p of pillFmt.formatToParts(new Date(ms))) parts[p.type] = p.value;
    return `${parts.day} ${parts.month || ''}`;
  },
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

// THE WORDS OF WHAT LOADS LATER ARE IN copy/en.later.js (2026-10-06, internal #405): the card's
// templates and class sentences, the Tonight tab, the debris view, the keys hint and the other
// sections only a module outside the first visit reads -- 45 kB that every first visit carried.
// A module that reads one of those sections imports that file beside this one
// (tests/test_boot_diet.mjs refuses a reader that does not, and a boot module that does).
export const COPY = {
  app: {
    name: 'Space Radar',
    tagline: 'Everything in motion around Earth, where it really is, right now.',
    // The canvas's spoken name while something is selected (public #315): one sentence, changed
    // on selection and never per frame. With nothing selected it is the sentence index.html wrote.
    sceneSelected: 'A map of space drawn at real positions, with {name} selected: its card, in the panel beside the map, says what it is.',
  },


  // "Six storms are turning": a count a person reads as a word (ui/explore.js Right now).
  numberWords: SMALL_WORDS,

  // THE SHELL (spec 0061, ui/shell.js): the sidebar's own words. Everything in it is a label; the
  // explanations live in a card's About or the sources sheet (0061 req 11).
  shell: {
    sideLabel: 'Explore',
    back: 'Explore',
    backLabel: 'Back to Explore',
    backChevron: '‹',
    openChevron: '›',
    handleMark: 'S',
    expand: 'Show the panel',
    collapse: 'Hide the panel',
    // The phone's top bar: the search, What to show and the More menu, and the live line.
    topLabel: 'Search and tools',
  },
  // The four tabs (0061 req 3): places, not settings. Choosing one flies there.
  tabs: {
    label: 'Where',
    earth: 'Earth',
    planets: 'Planets',
    stars: 'Stars',
    tonight: 'Tonight',
  },
  // Right now (0061 design §2): at most three lines from live state; a missing one is left out.
  rightNow: {
    title: 'Right now',
    storms: '{n} storms are turning, {name} the strongest.',
    stormOne: 'One storm is turning: {name}.',
    clouds: 'Today’s clouds',
    people: 'People in space',
    iss: 'ISS',
    tiangong: 'Tiangong',
    // Open Notify's headcount (data/parsers.js parseAstros), once it has loaded; a station named
    // with no count yet (or Open Notify unreachable) falls back to its bare name.
    crewAt: '{n} on {name}',
  },
  // The one line at the sidebar's foot: how the sources are, and how old the oldest reading is.
  statusLine: {
    reading: 'Reading the sources',
    read: '{n} sources read',
    readOne: 'One source read',
    stale: '{n} stale',
    failed: '{n} could not be read',
    oldest: 'oldest {age}',
    open: 'Open the sources',
    label: '{text}. Open the sources',
    // No network (ui/offline.js): what is drawn comes from copies kept on this device, and the age
    // is the oldest of them. Said in words, with the stale dot: an old copy is not a failure.
    offline: 'Offline: showing saved copies from {age}',
    offlineNone: 'Offline: no saved copies on this device',
  },
  // A mission's events on its card (ui/missions.js; the events and their sentences are
  // registry/missions.yaml's). The notes are the honest part: what the map did with the clock.
  mission: {
    title: 'Its mission',
    count: '{i} of {n}',
    navLabel: 'The events of {name}',
    prev: 'Earlier event',
    next: 'Later event',
    when: '{date}, {time} UTC',
    // An event that has not happened yet (Apophis in 2029): a date somebody worked out.
    predicted: '{when} (predicted)',
    go: 'Go to this moment',
    goTitle: 'Set the clock to this moment and frame it',
    here: 'The clock is at this moment. Live brings it back.',
    noteSite: 'The map can show this place on that day, in that day’s light.',
    notePath: 'The map holds its path for that day.',
    noteCruise: 'No path of ours for that day: {name} is drawn on the straight line back from where it is measured now, good to about one astronomical unit.',
    noteNone: 'The map has no path for {name} on that day, so the clock stays where it is.',
    noteNoneWorld: 'The map has no path for {name} on that day, so the clock stays where it is. The world it met is drawn for any date.',
    seeWorld: 'See {world} that day',
    seeWorldTitle: 'Set the clock to that day and go to {world}. {name} itself is not drawn there',
    all: 'All {n} events',
    fewer: 'Hide the list',
    source: 'Dates and figures: ',
    unknown: 'That link names an event this map does not have.',
  },
  // A trip as a card (0061 design §2): the title and one line under it.
  tripCard: {
    title: 'Trips',
    meta: '{n} stops · {m} min',
    metaOne: 'One stop · {m} min',
    planning: 'Working out the stops',
    // On the card that was just pressed, until its trip opens (ui/explore.js `starting`).
    starting: 'Starting…',
    cannotRun: 'Cannot run right now',
    all: 'All {n} trips',
    fewer: 'Fewer trips',
    // Under the cards: the trips one after another, hands off (ui/autopilot.js, spec 0036).
    onItsOwn: 'Play on its own',
    onItsOwnTitle: 'Trips one after another until you take the controls',
    // The reels the button opens (registry/autopilot.yaml), each with one lap's length.
    justWatch: 'Just watch',
    reelLength: '{m} min a lap',
  },
  // The Planets and Stars tabs' lists.
  explore: {
    worldsTitle: 'The worlds',
    // Under the Planets tab's list: the view it opens on draws each planet's path and a dot at
    // its place (scene/orbitrings.js), and a dot is the one thing drawn larger than it is.
    worldsDrawn: 'Planets drawn as dots, larger than they are.',
    farTitle: 'Far places',
    systemsTitle: 'Star systems',
    lightYears: '{n} ly',
    au: '{n} AU',
  },
  // The tool rail (0061 req 5, ui/rail.js). Keys in brackets, as the clear screen's own label has.
  rail: {
    label: 'Tools',
    show: 'What to show (L)',
    // P, because S is the camera's (held, it moves the camera back: scene/camera.js CAMERA_KEYS).
    share: 'Share (P)',
    // The phone's top bar (spec 0061 task 3): What to show stays, the rest folds into one menu.
    more: 'More tools',
    moreLabel: 'More',
    menuShare: 'Share',
    menuHide: 'Hide the panels',
    menuGitHub: 'Source on GitHub',
  },
  // The time pill (0061 §7, ui/timepill.js).
  timePill: {
    label: 'Time',
    when: '{date} {time} UTC',
    live: 'LIVE · {when}',
    held: '{when} · held',
    away: '{when} · {off}',
    unknown: 'Time unknown',
    prev: '‹',
    next: '›',
    prevTitle: 'Back in time',
    nextTitle: 'Forward in time',
    backToLive: 'Live',
    backToLiveTitle: 'Back to the real time, now',
    rate: '{n}×',
    rateTitle: 'Speed {n}×. Press for {next}×',
    hold: 'Click to hold time still, drag to move through it',
    run: 'Click to let time run, drag to move through it',
    localTitle: 'Your time {time}, {zone}. {hold}',
    readLabel: '{text}. {hold}',
    // The step ‹ and › take (ui/timepill.js): a button that cycles a minute, an hour, a day, and
    // sets how far the timeline shows (ui/scrubber.js: two hours, a day, a month).
    units: { minute: '1 min', hour: '1 h', day: '1 day', event: 'Event' },
    unitWords: { minute: 'one minute', hour: 'one hour', day: 'one day', event: 'one event' },
    // With the step at "Event", ‹ and › go to the mark before and after on the timeline.
    prevEvent: 'The event before',
    nextEvent: 'The next event',
    noEventBack: 'No earlier event on the timeline.',
    noEventOn: 'No later event on the timeline.',
    // A mark for one of the Moon's four named phases (ui/scrubber.js moonMarks).
    moonMark: 'The Moon is {phase}, {date}',
    // Sunrise and sunset at the visitor's place (ui/scrubber.js sunMarks); a guessed place says so.
    sunMark: '{what} where you are, {date}',
    sunMarkGuess: '{what} at the place guessed for you, {date}',
    sunWords: { sunrise: 'Sunrise', sunset: 'Sunset' },
    unitTitle: 'Steps of {unit}. Press for {next}',
    // The timeline (ui/scrubber.js). It is a slider: its value is the readout's words.
    tapeLabel: 'Timeline. Drag it, or use the arrow keys',
    tapeTitle: 'Drag to move through time',
    now: 'now',
    nowTitle: 'Back to now',
    rough: 'rougher',
    roughTitle: 'Past a week from now a satellite’s place on its orbit is rough',
    roughSay: 'Satellite places are rough this far from now.',
    worlds: 'Planets and moons hold for centuries.',
    markTitle: '{what}. Press to go there',
    endTitle: 'The timeline ends here: a month back, a year on',
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
      enceladus: 'position: Saturn from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 1 480 km over 2000 to 2050; radius from JPL’s satellite physical parameters, what it is and its colour from NASA Science, how to see it from Wikipedia, all read 2026-09-22',
      titan: 'position: Saturn from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 840 km over 2000 to 2050; radius from JPL’s satellite physical parameters, what it is from NASA Science, the Huygens landing, its colour and how to see it from Wikipedia, all read 2026-09-22',
      triton: 'position: Neptune from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 10 km over 2000 to 2050; radius from JPL’s satellite physical parameters, what it is from NASA Science, its colour and brightness from Wikipedia, all read 2026-09-22',
      charon: 'position: Pluto from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 1 km over 2000 to 2050; radius from JPL’s satellite physical parameters, brightness from NASA’s Pluto fact sheet, what it is and its colour from NASA Science, all read 2026-09-22',
      // Ten more, the same day and the same way. Each "within" is that moon's own worst error over
      // 2000 to 2050, measured in propagate/moons.js at instants the fit never saw.
      mimas: 'position: Saturn from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 700 km over 2000 to 2050; radius from JPL’s satellite physical parameters, albedo from NASA’s Saturnian satellite fact sheet, what it is and its colour from NASA Science, brightness from Wikipedia, all read 2026-09-22',
      tethys: 'position: Saturn from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 120 km over 2000 to 2050; radius from JPL’s satellite physical parameters, albedo from NASA’s Saturnian satellite fact sheet, what it is from NASA Science, its colour and brightness from Wikipedia, all read 2026-09-22',
      dione: 'position: Saturn from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 240 km over 2000 to 2050; radius from JPL’s satellite physical parameters, albedo from NASA’s Saturnian satellite fact sheet, its colour from NASA Science, what it is and its brightness from Wikipedia, all read 2026-09-22',
      rhea: 'position: Saturn from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 200 km over 2000 to 2050; radius from JPL’s satellite physical parameters, albedo from NASA’s Saturnian satellite fact sheet, what it is and its colour from NASA Science, brightness from Wikipedia, all read 2026-09-22',
      iapetus: 'position: Saturn from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 6 800 km over 2000 to 2050, which is 0.19 per cent of its orbit; radius from JPL’s satellite physical parameters, both albedos from NASA’s Saturnian satellite fact sheet, what it is and its colour from NASA Science, brightness from Wikipedia, all read 2026-09-22',
      miranda: 'position: Uranus from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 120 km over 2000 to 2050; radius from JPL’s satellite physical parameters, albedo from NASA’s Uranian satellite fact sheet, what it is from NASA Science, its colour and brightness from Wikipedia, all read 2026-09-22',
      ariel: 'position: Uranus from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 120 km over 2000 to 2050; radius from JPL’s satellite physical parameters, albedo from NASA’s Uranian satellite fact sheet, what it is and its colour from NASA Science, brightness from Wikipedia, all read 2026-09-22',
      umbriel: 'position: Uranus from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 410 km over 2000 to 2050; radius from JPL’s satellite physical parameters, albedo from NASA’s Uranian satellite fact sheet, what it is from NASA Science, its colour and brightness from Wikipedia, all read 2026-09-22',
      titania: 'position: Uranus from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 1 000 km over 2000 to 2050; radius from JPL’s satellite physical parameters, albedo from NASA’s Uranian satellite fact sheet, what it is and its colour from NASA Science, brightness from Wikipedia, all read 2026-09-22',
      oberon: 'position: Uranus from Astronomy Engine (Don Cross, MIT licence), plus an orbit fitted to JPL Horizons and checked against it to within 1 230 km over 2000 to 2050; radius from JPL’s satellite physical parameters, albedo from NASA’s Uranian satellite fact sheet, what it is from NASA Science, its colour and brightness from Wikipedia, all read 2026-09-22',
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
    notLoaded: 'still loading',
    weShowTitle: 'What this map draws of what is known',
    weShowRow: '{n} {what} — of {of}',
    // One flight without a cut (scene/climb.js): two rows at the head of the far places.
    edge: 'The edge of the map',
    edgeHow: 'fly out',
    edgeTitle: 'One flight from here out to the edge of what this map draws',
    home: 'The Earth',
    homeHow: 'fly home',
    homeTitle: 'One flight from here back down to the Earth',
    flightOff: 'Not from this place: go to Earth, Planets or Stars first',
  },
  // The Next moment's list (spec 0026 req 6): what is coming, from records already loaded.
  // ui/scenenote.js: the one line on the scene when no satellite could be read at all.
  sceneNote: {
    // One line and one action, as a toast is (docs/ui-guide.md section 3.14, spec 0061 req 11). Who
    // publishes the orbits and what still works is the sources sheet's to say; the button goes there.
    refused: 'Satellites could not be read.',
    refusedTitle: 'CelesTrak, which publishes the orbits, could not be read from this connection. The Moon, the planets, the stars and the trips that need no satellites still work.',
    why: 'Sources',
    close: '×',
    closeTitle: 'Close this note',
  },
  // A deep link (spec 0032) that names something this map does not have. Said once, on the scene,
  // through the same note; the default view is what is shown, and the line says so rather than
  // leaving a visitor to wonder why a link to the Moon opened on the Earth.
  link: {
    unknownVersion: 'This link is from a newer map. Showing the default view.',
    unknownTrip: 'That trip is gone from this map. Showing the default view.',
    unknownAt: 'That object is not on this map; showing the default view.',
    unknownStage: 'This map cannot centre on that place. Showing the default.',
  },
  // Sharing (spec 0033, spec 0061 task 8): one sheet, ui/sharesheet.js, with the postcard, the link
  // and the text. The text itself is the card's words and Wikipedia's; only the sheet's own words
  // are here. Button labels are two words at most; the titles say the rest.
  share: {
    // The trip bar's button, and every Share's tooltip.
    link: 'Share',
    linkTitle: 'Share this view: the postcard, the link and a few lines about it',
    title: 'Share',
    close: 'Close',
    pictureAlt: 'The postcard: this view drawn again at print size, with its caption',
    drawing: 'Drawing the postcard…',
    noPicture: 'The postcard could not be drawn just now.',
    withTag: 'Tag on the selection',
    linkLabel: 'Link',
    copyLink: 'Copy the link',
    textLabel: 'Text',
    lookingUp: 'Looking it up on Wikipedia…',
    wikiSource: 'The Wikipedia article this quotes',
    // The empty state: one line where the article's link would be.
    noWiki: 'No Wikipedia text here: the post is shorter.',
    // CC BY-SA asks for the source and the licence beside a quote; the sheet links the article.
    attribution: 'From Wikipedia, CC BY-SA 4.0',
    native: 'Share…',
    nativeTitle: 'Your device\'s own share, with the postcard where it can take a picture',
    nativeFailed: 'The share did not open; copy or download instead',
    copy: 'Copy text',
    copyTitle: 'Copy the text and the link, ready to paste into a post',
    copied: 'Text and link copied',
    linkCopied: 'Link copied',
    copyRefused: 'Copying was refused; the text is selected to copy',
    jpeg: 'Download JPEG',
    jpegTitle: 'Save the postcard as a JPEG picture, 6 by 4 inches at 300 dots per inch',
    pdf: 'Download PDF',
    pdfTitle: 'Save the postcard as a one-page PDF, 6 by 4 inches, for printing',
    email: 'Email',
    emailTitle: 'Write an email with the text and the link',
    // A mailto: link cannot carry a file: said once, plainly, under the buttons.
    emailNote: 'Email takes no picture: Share… or download it.',
    networksLabel: 'Post to',
    networkTitle: 'Open {network} with this post, in a new tab',
    // The link's spoken name: "X" alone is one letter to a screen reader (internal #375).
    networkLabel: 'Post to {network}',
    networks: { x: 'X', facebook: 'Facebook', linkedin: 'LinkedIn', whatsapp: 'WhatsApp', telegram: 'Telegram', reddit: 'Reddit' },
    // The email's subject when something is selected; with nothing, the app's name alone.
    subject: '{name}, on Space Radar',
    failed: 'Sharing could not open just now',
    mark: 'spaceradar.ai',
    // Photo mode and the embed (public #288, #439), the sheet's last two actions.
    photo: 'Photo mode',
    photoTitle: 'Compose a picture: everything hidden, a frame, a caption',
    embed: 'Embed',
    embedTitle: 'Copy the code that puts this live view in a web page',
    embedCopied: 'Embed code copied',
    embedRefused: 'Copying was refused just now',
    // {name} is what the frame shows; a screen reader in the host page reads this.
    embedFrameTitle: '{name}, live on Space Radar',
    // The disclosure row over the post's words; closed, the sheet fits a laptop without scrolling.
    textRow: 'Post text',
  },
  // The embed (public #439, ui/embed.js): `?embed=1&at=<id>` in someone else's page.
  embed: {
    open: 'Open in Space Radar',
    openTitle: 'Open this view in the full map, in a new tab',
    barLabel: 'Space Radar, embedded',
  },
  // Spec 0045 req 10: how tightly the panels are set. Automatic is Compact on a window 800 px tall
  // or less; the note under the row says which one Automatic picked.
  density: {
    panelTitle: 'Density',
    regular: 'Regular',
    compact: 'Compact',
    auto: 'Automatic',
    autoCompact: 'Compact now, because this window is short.',
    autoRegular: 'Regular now; Compact when the window is 800 px tall or less.',
  },
  nextList: {
    // The last seven days, asked for by a press (ui/justhappened.js, internal #134).
    justHappened: 'Just happened',
    justHappenedTitle: 'Launches and re-entries of the last seven days',
    // Add to calendar (public #235, data/ics.js): one .ics file for the row, made in the browser.
    calendar: 'Calendar',
    calendarTitle: 'Add “{title}” to your calendar: downloads one .ics file',
    calendarSaved: 'Saved {file}',
    calendarFailed: 'The calendar file could not be made',
    // Two rows can name different objects the same way -- CelesTrak calls dozens of stages "SL-8
    // R/B" -- and two identical rows read as a bug. The catalogue number tells them apart.
    sameName: '{name} ({id})',
    title: 'Coming up',
    // The explore view's list shows five rows and expands in place (spec 0061 design §2).
    showAll: 'Show all {n}',
    showFewer: 'Show fewer',
    now: 'about now',
    inMinutes: 'in {n} minutes',
    inHours: 'in {n} hours',
    todayAt: 'today at {time}',
    tomorrowAt: 'tomorrow at {time}',
    launch: '{name} lifts off {when}',
    launchRough: '{name} lifts off {when}, give or take — the date is not fixed yet',
    approach: '{name} passes Earth {when}, {ld}× the Moon’s distance away',
    approachNoDistance: '{name} passes Earth {when}',
    // How big (public #313): measured where the catalogue has it, else the range its brightness allows.
    sizeM: 'It is {n} m across',
    sizeKm: 'It is {n} km across',
    sizeRangeM: 'About {lo} to {hi} m across, judged from its brightness',
    sizeRangeKm: 'About {lo} to {hi} km across, judged from its brightness',
    sizeMixed: 'About {lo} m to {hi} km across, judged from its brightness',
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
    // The turns of the year (data/events.js seasons, internal #384): the instant is the same for
    // everybody; which day is long depends on the hemisphere, so the row says both.
    seasonTitles: { march: 'March equinox', june: 'June solstice', september: 'September equinox', december: 'December solstice' },
    seasons: {
      march: 'March equinox on {date}: day and night are near equal everywhere',
      june: 'June solstice on {date}: the north’s longest day, the south’s shortest',
      september: 'September equinox on {date}: day and night are near equal everywhere',
      december: 'December solstice on {date}: the south’s longest day, the north’s shortest',
    },
    solstice: '{title} on {date}',
    equinox: '{title} on {date}',
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
      season: 'Worked out here to the minute from where the Sun stands',
    },
    // THE ROW AS DRAWN (spec 0061 task 5, ui/next.js rowParts): a title, then one line. The
    // sentences above are the row's tooltip and its accessible name; these are what fits a 320 px
    // column on one line each. A launch's line keeps "planned": its time is the one that can move.
    row: {
      launch: 'Lifts off {when} · planned',
      launchRough: 'Around {when} · date not fixed',
      approach: 'Passes Earth {when}',
      approachValue: '{ld}× Moon',
      approachSized: 'Passes Earth {when} · {size}',
      sizeM: '{n} m',
      sizeKm: '{n} km',
      sizeRangeM: 'about {lo} to {hi} m',
      sizeRangeKm: 'about {lo} to {hi} km',
      perihelion: 'Closest to the Sun {when}',
      pass: 'Comes over you {when}',
      trainTitle: 'Starlink train of {n}',
      auroraTitle: 'Aurora forecast',
      auroraNowTitle: 'Geomagnetic storm now',
      aurora: 'NOAA forecast, from {when}',
      auroraNow: 'Measured by NOAA in the last hours',
      kp: 'Kp {kp}',
      showerTitle: '{name} meteors',
      shower: 'Peaks around {date} · up to {zhr} an hour',
      eclipse: '{date} · worked out to the minute',
      eclipseHere: '{date} · from here {begin} to {end}',
      eclipseNotHere: '{date} · not visible from here',
    },
    // The empty state: one line (docs/ui-guide.md section 3). Which feed is missing is its tooltip.
    none: 'Nothing coming up in what has loaded.',
    notLoaded: 'Not loaded, so not listed: {layers}.',
  },
  // Spec 0048 req 3 and 8: the followed object's track on the globe, and riding along with it.
  groundTrack: {
    // The minute offset on every third five-minute tick of the track (scene/groundtrack.js).
    tick: '+{n} min',
    label: 'Follow it',
    rideAlong: 'Ride along',
    rideAlongTitle: 'Put the camera just behind it, looking ahead along its track. Drag to stop.',
    // Under reduced motion the camera cuts there instead of flying, and the button says so.
    lookBeside: 'Look from beside it',
    showTrack: 'Draw its ground track',
    hideTrack: 'Hide its ground track',
    // Why a high orbit has no track until asked: it barely moves over the ground.
    highNote: 'Its track over the ground is not drawn by itself this high up: it barely moves.',
    trackNote: 'The line on the globe is the ground below it, 45 minutes back (dashed) and 90 ahead, with a tick every 5 minutes.',
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
    closeTitle: 'Close this card (Escape)',
    // Under a stop title that already named the object, its first sentence does not name it again.
    it: 'It',
    articles: ['The', 'the'],
    leadVerbs: ['is', 'was'],
    makeCentre: 'Make {name} the centre of the map',
    isCentre: 'This is the centre of the map',
    // The card view's short form, a button inside "About it" (spec 0061 §4: no sentence-long
    // control on the card); the long one is its tooltip.
    centreShort: 'Centre the map here',
    // Internal #199: the last line of About it, where the deploy built a page for this object.
    ownPage: 'Its own page',
    ownPageTitle: 'A page about it you can link to, in a new tab',
    isCentreShort: 'Centred here',
    comparisonsLabel: 'To give you a feel for it',
    rightNowLabel: 'Right now',
    seeItLabel: 'See it from here',
    actionsLabel: 'What you can do',
    sourceLabel: 'Where this comes from',
    unknownName: 'Unnamed object',
    // A record whose klass matches none of COPY.klass -- a bad feed row, a typo in a registry
    // entry -- has no template to build a sentence from. The card used to borrow the satellite
    // template's lead and tell a visitor it was "going round the Earth", which is exactly the
    // invention the honesty rule forbids: true of nothing that is not actually a satellite.
    unknownKind: '{name} is on the map, but we do not know what kind of object it is',

    rows: {
      altitude: 'Height above the ground',
      speed: 'Speed',
      groundPoint: 'Passing over',
      // Spec 0048 req 2: the country or sea under it, from an offline Natural Earth raster
      // (sky/overplace.js). Within 50 km of a border it names both rather than guess one.
      below: 'Below it now',
      // Spec 0047: the straight line from the place set (or guessed) to the object, through the
      // ground if need be. The tracked object's tag prints this row's number, so the card states it.
      fromYou: 'Distance from you',
      // The Now moment's place may be a guess from the clock (sky/guessplace.js); the row says whose.
      fromGuess: 'Distance from {place}, our guess at your place',
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
      starWidth: 'Width',
      catalogue: 'Catalogue',
      lightTime: 'Radio time each way',
      nextPass: 'Next pass over you',
      crew: 'People aboard',
      operator: 'Operated by',
      launched: 'Launched',
      ended: 'Ended',
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
      // A tropical cyclone (2026-09-28, data/parsers.js parseGdacsCyclones says what each number is).
      stormNow: 'At the latest advisory',
      stormWind: 'Strongest wind on its track',
      stormAdvisory: 'Latest advisory',
      stormCentre: 'Its centre',
      stormAgency: 'Advised by',
      stormAlert: 'GDACS alert level',
    },

    values: {
      km: '{n} km',
      kmh: '{n} km/h',
      belowBorder: 'near the border of {a} and {b}',
      // Natural Earth's disputed and indeterminate areas: the ground, never a flag.
      belowLand: 'land',
      belowWater: 'open water',
      // GDACS's one wind number is the highest anywhere on the track, forecast included, so it says so.
      stormWind: '{n} km/h, forecast included',
      stormWindCategory: '{n} km/h, Category {cat}, forecast included',
      stormAdvisory: '{time} UTC, {ago}',
      // The advisory's own date, when the clock stands on another day (public #330).
      stormAdvisoryDated: '{date}, {time} UTC, {ago}',
      stormStatus: {
        hurricane: 'hurricane strength',
        typhoon: 'typhoon strength',
        cyclone: 'cyclone strength',
        storm: 'tropical storm',
        depression: 'tropical depression',
      },
      stormAlert: { green: 'green', orange: 'orange', red: 'red' },
      kmPerS: '{n} km/s',
      // The days first, so the card's three numbers read the count and not the day of the month.
      launchedAgo: '{n} days ago, on {date}',
      au: '{n} astronomical units',
      lightYears: '{n} light-years',
      inSunlight: 'in sunlight',
      inShadow: 'in Earth’s shadow',
      yearsAgo: '{n} years ago',
      monthsAgo: '{n} months ago',
      suns: '{n}× the Sun',
      // A star's width worked out from its brightness and colour, not measured (scene/stars3d.js).
      sunsWide: '{n}× the Sun, estimated',
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
    // In place of the three numbers, on the card of a craft whose mission is over.
    endedLine: 'Its mission ended on {date}. Its events, below, go back to it.',
    noPosition: 'There is no position for this object right now.',

    actions: {
      flyTo: 'Fly to it',
      flyToTitle: 'Move the camera to this object',
      flyEnded: 'It ended on {date}. Choose an event of its mission to go there',
      flyNowhere: 'There is no position for this object at this moment',
      seeFromHere: 'See it from here',
      seeFromHereTitle: 'Look up from your own place on Earth',
      tellMeBefore: 'Tell me before',
      // Honest, because the feature does not exist yet (specs 0015 and 0016).
      tellMeBeforeDisabled:
        'Reminders are not built yet. There is no sign-up and no email behind this button, so it is switched off rather than pretending.',
      // The card view's one row of four (spec 0061 §4, docs/ui-guide.md §3.10). Two words at most
      // on a button; the title says the rest.
      follow: 'Follow',
      followTitle: 'Fly to it and keep it in the middle of the view',
      ride: 'Ride along',
      // Under 360 px a quarter of the row is 64 px and "Ride along" ends in an ellipsis there
      // (docs/ui-guide.md §5, narrow: icon and one word). Row D's phone card says it this way.
      rideShort: 'Ride',
      seeShort: 'See it',
      postcard: 'Postcard',
      share: 'Share',
    },

    // THE CARD VIEW (spec 0061 §4). Above the numbers: what it is and where, in four words at most,
    // set in capitals by the stylesheet (the one microlabel style). Below them: the sections that
    // open in place.
    micro: '{klass} · {regime}',
    microKlass: {
      planet: 'Planet',
      moon: 'Moon',
      dwarf: 'Dwarf planet',
      ourStar: 'Star',
      exoplanet: 'Exoplanet',
    },
    regime: {
      // Earth orbits by height: under 2 000 km is low, the geostationary ring is 35 786 km up.
      leo: 'Low Earth orbit',
      meo: 'Medium Earth orbit',
      geo: 'Geostationary orbit',
      heo: 'High Earth orbit',
      inner: 'Inner solar system',
      outer: 'Outer solar system',
      // A body whose whole orbit lies between Mars's and Jupiter's (ui/cards.js farRegion): Ceres, Vesta.
      belt: 'Asteroid belt',
      beyondNeptune: 'Beyond Neptune',
      round: 'Round {world}',
      inCon: 'In {con}',
      onWorld: 'On {world}',
      centre: 'Centre of the solar system',
      nearby: 'Among the nearest',
    },
    // The three numbers: each one is a row the card prints (ui/cards.js heroNumbers), and under it
    // its unit and what it measures, as short as row D's "km up". `{u}` is the row's own unit,
    // shortened by `units`.
    hero: {
      label: 'In three numbers',
      missing: '—',
      captions: {
        altitude: '{u} up',
        away: '{u} away',
        speed: '{u}',
        period: '{u} a lap',
        distanceFromSun: '{u} from Sun',
        distanceFromEarth: '{u} from Earth',
        lightTime: '{u} each way',
        spin: '{u} a turn',
        yearLength: '{u} a year',
        brightness: 'magnitude',
        spectralType: 'star class',
        across: '{u} across',
        lightLeft: '{u} away',
        launched: 'days in space',
        fromYou: '{u} from you',
        heightAbove: '{u} up',
        other: '{u}',
      },
      units: {
        'minutes': 'min',
        'hours': 'h',
        'days': 'days',
        'seconds': 's',
        'milliseconds': 'ms',
        'astronomical units': 'AU',
        'light-years': 'ly',
        'years ago': 'ly',
        'million years ago': 'million ly',
        'billion years ago': 'billion ly',
        'months ago': 'light-months',
      },
    },
    sections: {
      label: 'More about it',
      see: 'When you can see it',
      path: 'Its path',
      aboard: 'Who is aboard',
      ridingOn: 'What it rides on',
      about: 'About it',
      sources: 'Sources for this record',
      // The hint at the right of "When you can see it", one or two words.
      placeGuessed: 'place guessed',
      needsPlace: 'needs your place',
      passAt: '{time} UTC',
    },
  },


  // For a record with no position. It is reachable from search and it opens a card; what it does
  // not have is a dot, because a dot on this map is a claim and every other layer honours that.
  // The class line above already says nothing is drawn for it, so this only says WHY -- measured
  // in the browser, the two together read "Nobody knows where this is, so it is not on the map.
  // Nobody knows where this is, so it is not on the map."
  // The Earth's clouds (2026-09-28, scene/liveclouds.js). One line on the Earth's card, and the
  // credits NASA and the satellite operators ask for in the Sources panel.
  // The Sun close up (scene/sun.js). The spots' line is on the Sun's card while NOAA's list for
  // today is drawn; {n} groups, {date} the list's own day (UTC). The credit is for the Sources panel.
  sun: {
    spots: '{n} sunspot groups are drawn, from NOAA’s list for {date}: each as one round spot at its reported place and size, carried round by the Sun’s turning since then.',
    spotsOne: 'One sunspot group is drawn, from NOAA’s list for {date}: as one round spot at its reported place and size, carried round by the Sun’s turning since then.',
    regionsCredit: 'Today’s sunspot groups: NOAA Space Weather Prediction Center, solar region summary',
  },

  clouds: {
    live: 'Clouds: seen {when}, {ago}, in infrared by {satellites}, through NASA GIBS. Over Europe, Africa, the Indian Ocean and the poles, which none of those satellites sees, they are illustrative.',
    at: 'at {time} UTC',
    between: 'between {from} and {to} UTC',
    // The picture's own DATE (public #330), said whenever the day on the clock, or today, is not the
    // day the picture was taken: "seen at 21:20 UTC" beside a clock on another day is a wrong date.
    atDated: 'on {date} at {time} UTC',
    betweenDated: 'on {date} between {from} and {to} UTC',
    // And when the clock is not now: the weather does not follow it. After the live line.
    clockElsewhere: ' The clock is at {time} UTC on {date}; the clouds stay as that picture saw them.',
    and: ' and ',
    illustrative: 'Clouds: illustrative. This is one picture of a day in the past, drifting slowly; it is not today’s weather.',
    illustrativeSaveData: 'Clouds: illustrative. Today’s satellite pictures are not fetched on a connection that saves data.',
    illustrativeScrubbed: 'Clouds: illustrative, because the clock is more than 12 hours from the latest satellite picture, of {date} at {time} UTC.',
    // Verbatim, as NASA asks on the GIBS API page (read 2026-09-28). Do not reword it.
    gibsAcknowledgement: "We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS).",
    satelliteCredit: 'Live clouds: GOES-East and GOES-West infrared imagery, NOAA; Himawari infrared imagery, Japan Meteorological Agency (JMA).',
  },

  // The aurora (2026-09-30, scene/aurora.js, spec 0053 task 3). One line on the Earth's card in the
  // clouds line's style, the credit in the Sources panel, and the explore view's "Right now" line at
  // a storm. The band is NOAA's MODEL of the next hour, and every live sentence says it is not a
  // photograph; where the folds inside it are drawn, it says that too.
  aurora: {
    live: 'Aurora: where NOAA’s OVATION model expects it in the next hour (its forecast for {time} UTC, made {ago}), not a photograph. The fine folds in it are drawn.',
    liveNoFolds: 'Aurora: where NOAA’s OVATION model expects it in the next hour (its forecast for {time} UTC, made {ago}), not a photograph.',
    waiting: 'Aurora: NOAA’s forecast has not arrived yet.',
    failed: 'Aurora: NOAA’s forecast could not be read just now, so none is drawn.',
    far: 'Aurora: not drawn, because the clock is more than three hours from NOAA’s latest forecast.',
    saveData: 'Aurora: NOAA’s forecast is not fetched on a connection that saves data.',
    switchedOff: 'Aurora: switched off in the layers.',
    // NOAA SWPC's products are works of the US Government and in the public domain; credited all the same.
    credit: 'Aurora: forecast by the NOAA Space Weather Prediction Center’s OVATION Prime model (public domain).',
    // The explore view's "Right now" line at Kp 5 and above (scene/aurora.js auroraRightNow): the
    // words on the left, Kp in the value column (docs/ui-guide.md 3.4). One line at the sidebar's
    // width, so no "tonight" and no sentence: the tap flies there, which says the rest.
    rightNow: 'Aurora likely near the poles',
    rightNowReach: 'Aurora likely as far as {lat}° latitude',
    rightNowValue: 'Kp {kp}',
    // Its tooltip: the tap is a "Show me" (ui/explore.js showAurora).
    showMe: 'Fly to the aurora on the night side',
  },

  // Weather on every world (spec 0066, scene/weather/). ONE LINE A WORLD, and each says which of
  // three things it is (registry/weather.yaml `class`): MEASURED today, MODELLED from published
  // numbers, or ILLUSTRATIVE of the season. The Earth's line is written like its clouds and aurora
  // lines; the other worlds' sit under the note about how the world is drawn.
  weather: {
    lightning: {
      live: 'Lightning: about {n} strikes a minute where NOAA’s map reaches, the Americas and the Pacific (its count to {time}, {ago}). Where and how often are measured; the instant of each flash is drawn, and larger than life.',
      quiet: 'Lightning: almost none where NOAA’s map reaches, the Americas and the Pacific (its count to {time}, {ago}).',
      waiting: 'Lightning: NOAA’s map has not arrived yet.',
      failed: 'Lightning: NOAA’s map could not be read just now, so none is drawn.',
      away: 'Lightning: not drawn, because the clock is more than an hour from NOAA’s latest map.',
      off: 'Lightning: not fetched on this device or connection.',
      reducedMotion: 'Lightning: not drawn, because this device asks for less motion.',
      switchedOff: 'Lightning: switched off in the layers.',
      // NOAA's products are works of the US Government and in the public domain; credited all the same.
      credit: 'Lightning: strike density from NOAA nowCOAST, made by the NWS Ocean Prediction Center from the ground networks NLDN and GLD360 (public domain).',
    },
    // {season} is one of `seasons` below, by Mars's own calendar (scene/weather/flow.js marsLs).
    worlds: {
      jupiter: 'Weather: the bands slide past each other at the wind speeds measured from Hubble, and the Great Red Spot turns. Modelled motion: no cloud is drawn where it is today.',
      saturn: 'Weather: the bands move at the wind speeds Cassini measured. Modelled motion, not today’s clouds. The hexagon at the north pole is drawn at its measured place; its look is illustrative.',
      venus: 'Weather: the cloud deck goes round in about four days, as Venus Express measured, sixty times faster than the ground. Modelled motion, not today’s clouds.',
      uranus: 'Weather: the air drifts round at the wind speeds measured from Keck and Gemini. Modelled motion, not today’s clouds.',
      neptune: 'Weather: the air streams round at the wind speeds Voyager 2 measured, the fastest on any planet. Modelled motion, not today’s clouds.',
      mars: 'Weather: it is {season} on Mars. The frost caps and the dust haze are what that season typically brings: illustrative, not this week’s pictures.',
    },
    seasons: ['northern spring', 'northern summer', 'northern autumn', 'northern winter'],
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
    // 2026-10-07 (internal #382): a small body whose shape model wears a map (scene/realmodels.js
    // `mapped`). Dawn's Framing Camera mosaics of Ceres (2015) and Vesta (2011 to 2012), made by DLR:
    // black-and-white photographs, so the shadows in them are the Sun's on the days of the pictures
    // and do not move with the Sun drawn here; the grey is chosen (scripts/build-textures.py).
    objectMapped: {
      dawn: 'its surface is the Dawn spacecraft’s black-and-white mosaic, tinted in a grey we chose; the shadows in its craters are the ones Dawn photographed and do not move with the Sun here',
    },
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
    // A storm is not an object with a shape: the mark is where its centre is, the storm is cloud.
    storm: 'drawn as a mark at its centre; the storm itself is the cloud around it',
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
    // 2026-10-05: Phobos and Deimos are bent to their published shapes (scene/moonshape.js). Deimos
    // still has no map here: no public-domain mosaic of it was found.
    worldFlatShaped: 'drawn in its measured shape and in one colour: there is no surface map of {name} here, and the colour is chosen from published descriptions, not measured',
    worldShaped: 'drawn in its measured shape',
    // What kind of picture a moon's map is (scene/worlds.js `mapKind`; CREDITS.md section 2 has
    // every source). `colour` maps (Io) say nothing: the mosaic's own colours are what is drawn.
    worldMap: {
      tinted: 'its surface is a black-and-white mosaic, tinted in a colour chosen from published descriptions',
      toned: 'its colours come from infrared, green and ultraviolet pictures, toned down toward what an eye would see',
      // 2026-10-06: New Horizons' colour camera had red and blue filters and no green one (Pluto, Charon).
      redblue: 'its colours come from New Horizons’ red and blue pictures, with green taken halfway between them and the colour made half as strong again; the parts photographed only in black and white are given the map’s average colour',
      // Voyager 2's map of Triton, whose published version has a green cast (USGS, P. Schenk).
      balanced: 'its colours come from orange, green and blue pictures, balanced to its published colour and toned down toward what an eye would see',
      infrared: 'its surface is a near-infrared map made through the haze, tinted and softened; in visible light the haze hides the ground',
    },
    // The side nobody has photographed is left one plain colour, and the card says which side.
    worldCoverage: {
      miranda: 'only the southern half was photographed, by Voyager 2 in 1986; the rest is left plain, not guessed',
      ariel: 'only the southern half was photographed, by Voyager 2 in 1986; the rest is left plain, not guessed',
      umbriel: 'only the southern half was photographed, by Voyager 2 in 1986; the rest is left plain, not guessed',
      titania: 'only the southern half was photographed, by Voyager 2 in 1986; the rest is left plain, not guessed',
      oberon: 'only the southern half was photographed, by Voyager 2 in 1986; the rest is left plain, not guessed',
      triton: 'Voyager 2 photographed part of it in 1989; the rest is left plain, not guessed',
      pluto: 'the far south was in winter darkness when New Horizons passed in 2015 and is left plain, not guessed',
      charon: 'the far south was in winter darkness when New Horizons passed in 2015 and is left plain, not guessed',
    },
    // Spec 0054 requirement 2: every world but the Earth and the Sun is drawn as bright as a
    // photograph of it would be, not dimmed by its distance from the Sun (Saturn gets 1/90 of the
    // Earth's sunlight). scene/worlds.js says why; this is the card saying it.
    worldLit: 'lit as a camera exposed for its own sunlight would show it',
    // ...and the Moon's night side, lit by the Earth (scene/worlds.js earthshineShare), is drawn
    // brighter than that camera would catch it. {n} is EARTHSHINE_GAIN.
    worldEarthshine: 'its dark side glows with earthshine, the Earth’s own light, drawn {n} times brighter than that camera would catch it, about as the eye sees it',
    // Spec 0054 task 3: the air on Mars, Venus and Titan (scene/atmosphere.js). Its height, pressure
    // and optical depth are measured; how much thicker it is drawn, and the colour of its dust or
    // haze, are not, and the card says both. {n} is the row's heightGain.
    worldAir: 'its air is drawn {n} times thicker than it is so that it shows at this size, and the colour of its haze is illustrative',
    worldAirTrue: 'its haze is drawn at its measured height, and its colour is illustrative',
    // The narrow rings of Uranus and Neptune (scene/worlds.js URANUS_RINGS, NEPTUNE_RINGS): the radii
    // are measured; {w} times wider, {d} times more opaque and the brightness are so that they show.
    worldRings: 'its rings are at their measured distances, drawn {w} times wider and far brighter than they are so that they show: the real ones are threads as dark as charcoal',
    worldRingsDense: 'its rings are at their measured distances, drawn {w} times wider, {d} times more opaque and far brighter than they are so that they show: the real ones are faint threads as dark as charcoal',
    // The Sun close up (scene/sun.js, spec 0055 task 3): which parts of the picture are a model and
    // which are there to be seen.
    worldSun: 'close up, its edge darkens and reddens as a model of its atmosphere says it should; the grain stands for its churning surface and is drawn far coarser than the real granules; the corona is illustrative, and drawn far brighter than it is so that it can be seen',
    // Spec 0065 requirement 4 (internal #337): while a close world is drawn from map tiles, the card
    // names the mosaic under the camera. {title} is the registry row's (registry/tilesets.yaml), {res}
    // the metres one pixel of the finest tiles on screen covers. `Detail`: Mars, where the mosaic is
    // grey and only sharpens our own colour map.
    worldMosaic: 'Under the camera now: {title}, drawn here at about {res} a pixel.',
    worldMosaicDetail: 'Under the camera now: {title}, sharpening the colour map at about {res} a pixel.',
    // ...and what the relief is (spec 0065 task 3). The shaded-relief mosaic has one light; only the
    // slopes along that light are in it. {n} is the row's `gain`; `True` is for a gain of 1.
    worldRelief: 'Its relief is from {title}: a drawing of slopes under one fixed light. The slopes along that light are lit again by the Sun where it is now, {n} times steeper than measured; slopes across it are not drawn.',
    worldReliefTrue: 'Its relief is from {title}: a drawing of slopes under one fixed light. The slopes along that light are lit again by the Sun where it is now; slopes across it are not drawn.',
    worldReliefBaked: 'Its hills are shaded into this map under a fixed light, not by the Sun where it is now.',
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
    stopOf: 'stop {n} of {count}',

    // --- the trip's shape line (ui/tripframe.js shapeLine) ------------------------------------
    // Stated only AFTER the stops have been resolved. Before that the row says it is still
    // working it out, because a count printed before resolution is a guess wearing a fact's
    // clothes -- and this app's whole argument is that those are different things.
    planning: 'Working out what can be shown…',
    // Mono and short since spec 0061 task 7, the trip cards' own shape: the minutes are still
    // ROUNDED UP (ui/tripframe.js shapeLine), so "2 min" is never a promise the trip breaks.
    shape: '{count} stops · {mins} min',
    shapeOneMinute: '{count} stops · 1 min',
    startTitle: 'Fly this trip',
    // An event trip's next occurrence under its title (spec 0031 task 5): the date its first
    // `{event:}` stop resolves to, computed here like the Next list's eclipse rows.
    nextEventLine: 'Next: {date}',

    // --- the intro card ------------------------------------------------------------------
    // It sets the expectation, it makes the trip a decision rather than an ambush, and it gives
    // the scene a beat to settle before the first flight.
    introStart: 'Start',
    introSkip: 'Not now',
    // The intro sheet's microlabel (spec 0061 task 7): what this sheet is, in the sidebar's caps.
    introMicro: 'Guided trip',
    // The resolved stops, listed under Start: a row starts the trip at that stop.
    stopsLabel: 'Stops',
    startAtTitle: 'Start the trip at stop {n}',
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
    // `orbits: [moon]` on the Earth's stage (2026-10-06): the same exaggeration, and the dots are lit.
    moonPathLine: 'The Earth and the Moon are drawn larger than they are, as dots, each lit on the side that faces the Sun. The Moon’s place and its path are computed.',
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
    observerDevice: 'Your place: near where your device says you are.',
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
    // 2026-10-06: a stop seen from the visitor's own ground (`look:` in registry/tours.yaml). What
    // the view turned to is worked out for their place and the stop's instant (sky/lookfor.js), so
    // these are GENERATED and the card above them never names a planet or a star. {alt} and {az}
    // are sky/skyview.js's own words ("about two fists above the horizon", "south-west").
    lookMoonUp: 'The Moon is {pct}% lit, {alt} in the {az}.',
    lookMoonDown: 'The Moon is below your horizon at this hour. It rises at {time}.',
    lookMoonDownNoRise: 'The Moon is below your horizon at this hour.',
    lookWorldUp: '{name} is {alt} in the {az}.',
    lookWorldDown: '{name} is below your horizon at this hour.',
    lookPlanet: 'The brightest planet up at this hour is {name}: {alt} in the {az}.',
    lookNoPlanet: 'No planet you could see by eye is up at this hour. The view faces where they will pass.',
    lookStar: 'The brightest star up at this hour is {name}: {alt} in the {az}.',
    lookFigure: 'Best placed at this hour: {name}, {alt} in the {az}.',
    lookNoFigure: 'None of the well-known figures is well placed at this hour.',
    lookNoPass: 'No pass of the station over your place was found in the next week.',
    lookDaylight: 'Your sky is not dark at this hour, so there is nothing to pick out yet.',
    // 2026-10-06, the remaining shows. The Milky Way's best-placed stretch (sky/lookfor.js
    // MILKY_WAY names it), and the next meteor shower (registry/showers.yaml: its name, its peak
    // date and its best hourly rate, which is under a dark sky with the radiant overhead).
    lookMilkyWay: 'The view faces the Milky Way where it runs through {name}, {alt} in the {az}. The three skies are a model of an average clear night.',
    lookNoMilkyWay: 'The Milky Way is low on your horizon at this hour, so the view faces high in the sky instead.',
    lookShower: 'The next shower is the {name}, at its best around {date}.',
    lookShowerUp: 'Its radiant is {alt} in the {az} at this hour.',
    lookShowerDown: 'Its radiant is below your horizon at this hour; the view faces where it will rise.',
    lookShowerRate: 'At the peak, from a dark place with the radiant high: about {rate} meteors an hour.',
    // The Moon on the night of the peak (sky/lookfor.js showerMoon): its lit share, and what that does.
    lookShowerMoon: {
      dark: 'The Moon is {pct}% lit that night, so the sky stays dark.',
      some: 'The Moon is {pct}% lit that night and will hide some of the faint ones.',
      bright: 'The Moon is {pct}% lit that night and will hide all but the bright ones.',
    },
    // `live_note: close-approach` and `live_note: satellites`: counted from the records on screen.
    approachNext: 'Next in NASA JPL\u2019s table: {name}, on {date}, at {ld} times the Moon\u2019s distance.',
    approachNextFar: 'Next in NASA JPL\u2019s table: {name}, on {date}.',
    approachNone: 'NASA JPL\u2019s table of close passes has not loaded, so no next pass is named.',
    satellitesCount: '{n} working satellites in the catalogue this page loaded from CelesTrak, {starlink} of them Starlink.',
    satellitesLoading: 'The catalogue is still loading; the count appears when it has.',
    // Under a stop at a nebula or a galaxy with a photograph, and under a black hole's portrait.
    pictureLine: 'A real photograph, placed where it is in the sky. Picture: {credit} \u00b7 {licence}, edges faded and sky darkened by us.',
    portraitLine: 'The ring is the Event Horizon Telescope\u2019s picture, made with radio waves. It is drawn far larger than it would look from here; the place is measured. Picture: {credit} \u00b7 {licence}, sky darkened and edges faded by us.',
    // `live_note: tonight` under a stop about a planet: when and where it is in the visitor's sky
    // in the coming dark, by their device's clock, or why it is not there.
    tonightUp: 'From {place} tonight: up from {begin} to {end}, highest at {time}, {alt} in the {az}.',
    tonightGlare: 'From {place} tonight: {name} is too close to the Sun to be seen.',
    tonightDown: 'From {place} tonight: {name} is not above the horizon while the sky is dark.',

    // --- the frame (spec 0061 task 7) ---------------------------------------------------------
    // A glass toolbar at the foot of the scene with icon buttons, the stop card in the sidebar, and
    // a thin top bar with the trip's title and Leave. Every icon-only button's name is `label`
    // (aria-label); its tooltip, `title`, names the key that does the same thing.
    frameLabel: 'guided trip',
    stopRole: 'stop',
    liveLabel: 'stop {n} of {count}: {title}',
    // The stop card's microlabel, above the stop's title (ui/cards.js, caps in CSS).
    stopMicro: 'Stop {n} of {count}',
    // The counter inside the toolbar. Mono, tabular; the readable form is `stopOf`.
    progressShort: '{n} / {count}',
    pause: 'Pause',
    pauseTitle: 'Pause (Space)',
    play: 'Play',
    playTitle: 'Play (Space)',
    resume: 'Resume',
    resumeTitle: 'Fly back to the stop and carry on (Space)',
    back: 'Previous stop',
    backTitle: 'Previous stop (←)',
    next: 'Next stop',
    nextTitle: 'Next stop (→)',
    replay: 'Replay',
    replayTitle: 'Fly this move again (R)',
    share: 'Share',
    shareTitle: 'Share a link to this stop',
    collapse: 'Hide card',
    collapseTitle: 'Hide the card and watch (C)',
    expand: 'Show card',
    expandTitle: 'Bring the card back (C)',
    soundOn: 'Sound',
    // The volume beside it (public #298), and the voice offered on a trip's start card (public #446).
    volume: 'Volume',
    volumeTitle: 'Volume of the music, the sounds and the voice',
    volumeValue: '{pct} percent',
    voiceWill: 'A voice will read this. It is synthetic.',
    voiceCan: 'A synthetic voice can read this: press Voice.',
    soundOnTitle: 'Music and sounds are on: turn them off (M)',
    soundOffTitle: 'Music and sounds are off: turn them on (M)',
    // Spec 0069: the voice that reads each stop. It is synthetic and the control says so, every
    // time, because a visitor should know before they wonder (the Sources panel names the model).
    voice: 'Voice',
    voiceOnTitle: 'A synthetic voice is reading each stop: turn it off and keep the music (V)',
    voiceOffTitle: 'Have each stop read aloud by a synthetic voice (V)',
    // PRESENT MODE (public #441, 2026-10-06): one trip for a room. The sidebar goes, the words are
    // set large over the scene, and the person with the clicker decides when to go on.
    present: 'Present',
    presentTitle: 'Show this trip to a room: large words, no panels, you press Next',
    presentOffTitle: 'Leave present mode and bring the panels back',
    presentAuto: 'Autoplay',
    presentAutoOffTitle: 'Each stop waits for Next: let the trip move on by itself (A)',
    presentAutoOnTitle: 'The trip moves on by itself: make each stop wait for Next (A)',
    fullScreen: 'Full screen',
    fullScreenTitle: 'Fill the whole screen (F)',
    fullScreenOffTitle: 'Leave the full screen (F)',
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

    // Said to a screen reader when a hand on the camera, or Pause, holds the trip. On screen the
    // play button turns ember: the one thing to press. Not a modal: grabbing the camera never ends
    // the trip, and spec 0003 keeps the stop counter visible with it.
    pausedChip: 'Trip paused',

    // --- the end card --------------------------------------------------------------------
    // An unmarked ending is indistinguishable from a crash. One named next trip, never a menu.
    endMicro: 'End of the trip',
    endBody: 'The camera stays where it is. Nothing here goes back.',
    endBodyStage: 'Keep flying stays out here. Go home puts the map back on the world it was centred on before the trip.',
    // "Keep flying" (public #447): the camera stays where the trip ended. After a trip that moved
    // the map's centre that means staying out there, and the way home is the button beside it.
    endExplore: 'Keep flying',
    endExploreTitle: 'Keep this view and carry on by yourself',
    endStayTitleStage: 'Stay out here and fly on from where the trip ended',
    endHome: 'Go home',
    endExploreTitleStage: 'Carry on by yourself, back on the map you started from',
    // The picture to send (public #444): the share sheet's postcard of the view the camera holds.
    endSend: 'Send picture',
    endSendTitle: 'Make a postcard of where the trip ended, with its words and a link',
    endReplay: 'Watch again',
    endReplayTitle: 'Watch this trip again from the start',
    endShareTitle: 'Share a link to this trip',
    endNextMicro: 'Next trip',
    endNext: 'Next: {title}',

    docTitle: 'Space Radar — {title} — stop {n} of {count}',
  },


  sky: {
    // A shower's radiant, marked in the sky view for the nights around its peak (sky/radiants.js).
    radiant: '{name} radiant',
    // The sky from the ground (sky/groundsky.js): the names drawn on it.
    bodies: { sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune' },
    // The field of view, one mono line over the sky; under a degree it is in arcminutes (U+2032).
    fov: {
      degrees: '{deg}° field · {name}',
      arcmin: '{min}′ field · {name}',
      names: { eye: 'eye', binoculars: 'binoculars', telescope: 'telescope' },
    },
    // A line is named once, in plain words, where it climbs from the horizon (internal #356).
    lines: { sunPath: 'Path of the Sun', equator: 'Sky equator', poleNorth: 'North pole of the sky', poleSouth: 'South pole of the sky' },
    // "What is that" (sky/skyview.js tapSky): the tag under what was tapped. `mag` is its
    // magnitude now; `open` and `plain` are the tag's accessible name, with and without a card.
    what: {
      star: 'Star',
      starMag: 'star · mag {mag}',
      planet: 'planet · mag {mag}',
      sun: 'our star',
      moon: 'Earth’s moon',
      dso: 'deep sky',
      dsoMag: '{kind} · mag {mag}',
      open: '{name}, {sub}. Open its card.',
      plain: '{name}, {sub}.',
      openTitle: 'Open its card',
    },
    // Sixteen compass points as a pass row spells them (sky/tonightbest.js compassShort).
    compassShort: ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'],
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
    storm: 'From the ground it is the weather itself. From orbit it is a spiral of cloud hundreds of kilometres across.',
    onAnotherWorld:
      'This one is standing on {world}. You will not pick it out by eye from here, however clear the night.',
    worldRise: 'From where you are it comes up at {time}.',
    // Rises, highest and sets from the visitor's place (internal #299; sky/riseset.js). {place} is
    // the place's name or `worldHere`; {alt} is altitudeInWords(); directions are compass words.
    // Longer than a line of chrome: it is the card's see-it sentence, not a label.
    worldHere: 'where you are',
    worldFrom: {
      down: 'From {place}: rises {rise} in the {riseDir}, highest {highTime}, {highAlt}; sets {set} in the {setDir}.',
      downNoSet: 'From {place}: rises {rise} in the {riseDir}, highest {highTime}, {highAlt}.',
      up: 'From {place}: up now, {alt}, in the {dir}. Highest {highTime}, {highAlt}; sets {set} in the {setDir}.',
      upPast: 'From {place}: up now, {alt}, in the {dir}. Past its highest; sets {set} in the {setDir}.',
      never: 'From {place} it does not rise in the next day and a half.',
      always: 'From {place}: up now, {alt}, in the {dir}. It does not set today.',
      honest: 'Worked out for a sea-level horizon; hills and houses are not in it.',
    },
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
      pluto: 'Not by eye, and not with binoculars: Pluto is nearly 3 000 times fainter than the faintest star you can see, so it takes a telescope.',
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
      charon: 'Barely: Charon is magnitude 16.8, 13 000 times fainter than the faintest star you can see, and so close to Pluto that amateurs split the pair in 2008 by photographing them through a 14-inch telescope.',
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
    // Three silences, three short words beside the name (spec 0061 req 11: the row is one line at
    // 390 and at 1440); each one's tooltip is the sentence it stands for.
    layerCountEmpty: 'empty',
    layerCountEmptyTitle: 'This layer came back with nothing: its source could not be read, or holds nothing now.',
    layerWaits: 'not yet',
    layerWaitsTitle: 'Loaded when you switch it on, to save data.',
    // The error state, one line with its one action (docs/ui-guide.md section 3): layers that are
    // on and came back empty. The button opens the sources sheet, where each source says why.
    layersFailed: '{n} layers came back empty.',
    layersFailedOne: 'One layer came back empty.',
    layersFailedWhy: 'See sources',
    // A layer whose members are in more than one state says so on its own tick. Zero parts are
    // dropped, so a layer that grows out of a state stops mentioning it without a code change.
    layerCountParts: {
      onMap: '{n} on the map',
      riding: '{n} riding on something else',
      unplaceable: '{n} we cannot place',
      // The aurora layer's one number: the highest probability in NOAA's forecast (scene/aurora.js peak()).
      auroraPeak: 'up to {n} % likely',
      // The lightning layer's one number: strikes a minute in NOAA's latest map (scene/weather/lightning.js).
      lightningPerMin: '{n} strikes a minute',
    },
    layersEmpty: 'No layers are loaded yet.',
    // The headings What to show folds the layers under (registry/layers.yaml `groups:`, spec 0068
    // task 3), in microlabel case. A group the registry names and this does not shows its id.
    groups: {
      'around-earth': 'Around Earth',
      earth: 'Weather and ground',
      'solar-system': 'Solar system',
      beyond: 'Stars and beyond',
    },
    // How many of a group's layers are on, beside its heading, in mono.
    groupCount: '{on} of {n}',
    groupAll: 'All',
    groupNone: 'None',
    groupAllLabel: 'Show every layer in {group}',
    groupNoneLabel: 'Hide every layer in {group}',
    layerFilter: 'Find a layer',
    layerFilterEmpty: 'No layer by that name.',
    // The row that reopens the controls hint (ui/keyhint.js, issue #321): keys on a keyboard,
    // gestures on a touch screen.
    keysRow: 'Keys',
    keysRowTouch: 'Gestures',
    keysRowTitle: 'Show the keys that move the view',
    keysRowTitleTouch: 'Show the gestures that move the view',
    // What to show's swatches are the key to the dots (spec 0061 req 10). A layer drawn in many
    // colours (the stars by temperature, the planets as discs) has a ring, not a colour it is not.
    swatchMixed: 'Drawn in its own colours',
    // While "Colour by" is not "What it is", the dots are the key's colours, not the layers'.
    keyedNote: 'Dots coloured by {key}: the key is below.',
    localTimeFallback: 'local',
    locationPlaceholder: 'Type a city',
    locationSearchLabel: 'Find a city',
    locationUseMine: 'Use my location',
    locationUseMineTitle: 'Ask the browser where you are',
    // This WILL be the state on the first S3 test, so the explanation has to be good.
    locationInsecure:
      'The browser only shares your location with pages served over https. This page is on plain http, so the button is switched off. Pick a city instead, or open the https address once there is one.',
    locationUnsupported: 'This browser has no location service. Pick a city instead.',
    locationDenied: 'The browser said no. Pick a city instead.',
    locationFailed: 'The browser could not find you. Pick a city instead.',
    locationAsking: 'Asking the browser',
    locationClear: 'Clear',
    locationNoMatch: 'No city in the bundled list matches that.',
    tonightCouldNotLook: 'Could not look: no satellites have loaded.',
  },

  // ui/search.js. The footer strings are the honest ones: a layer nobody has read has no size,
  // so the search says how many objects it IS looking at and refuses to guess at the rest.
  search: {
    title: 'Find an object',
    placeholder: 'Search planets, stars, satellites',
    // The phone's top bar leaves the field 250 px at 390 (row D's HybridPhone): the long one ends
    // mid-word there, and a cut label is a broken one.
    placeholderPhone: 'Search space',
    inputLabel: 'Search for an object by name or catalogue number',
    listLabel: 'Matching objects',
    fly: 'Fly to it',
    flyTitle: 'Move the camera to the highlighted object and open its card',
    hint: 'Two letters is enough. Enter picks the top one.',
    // The empty state (docs/ui-guide.md section 3.2): the query quoted back, then the nearest names.
    noMatch: 'Nothing called “{q}” here.',
    closest: 'Closest names',
    more: '{n} more match. Type more to narrow it.',
    // One line under the results (spec 0061 req 11). The layers and their reasons are its tooltip.
    searching: '{n} objects searched.',
    searchingOne: 'One object searched.',
    searchingBut: '{n} objects searched, {m} layers not yet.',
    searchingButOne: '{n} objects searched, one layer not yet.',
    empty: 'Nothing has loaded yet to search.',
    // The field's tooltip names its key, as the rail's buttons do.
    inputTitle: 'Search (/)',
    key: '/',
    notLoaded: 'Not loaded, so not searched: {layers}.',
    stillLoading: 'Still loading, so not searched yet: {layers}.',
    loadsWhenOn: 'Loaded only when you switch them on, to save data, so not searched yet: {layers}.',
    couldNotRead: 'Could not be read, so not searched: {layers}.',
    fallback: 'Nothing starts with that. These contain it.',
    switchedOn: 'Switched on: {layer}.',
    // From the ground, a thing found that the sky cannot be turned to (ui/search.js).
    belowHorizon: '{name} is under the horizon.',
    notLoadedCount: 'How many objects that leaves out cannot be known until they load.',
  },

  // Data-saver and the frame-rate latch (spec 0026 req 18): two things the app decided for the visitor, said out loud.
  quality: {
    // One line each in the popover (spec 0061 req 11).
    dataSaver: 'Data saver on: the two biggest lists wait.',
    lowered: 'Slow frames ({ms} ms): a simpler picture.',
    // The device tier (scene/quality.js, 2026-09-28): which maps this device wears, and why.
    tierPhone: 'Surface maps at 2k, sized for a phone.',
    tierSaver: 'Surface maps at 2k, to save data.',
    tierSmall: 'Surface maps at 2k, sized for this device.',
    tierLatched: 'Surface maps back at 2k: frames were slow.',
    tier1: 'Surface maps at 4k, fetched when idle.',
    tier2: 'Surface maps at 4k, more worlds kept sharp.',
    promoted: 'Raised a step after fast frames.',
    // The Sources panel's credits: the maps the scene is wearing on this device right now.
    mapsWorn: 'Maps on this device: {credits}.',
  },

  status: {
    // Spec 0061 design §6: the sheet is titled "Sources"; its intro still says what it is for.
    title: 'Sources',
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
    snapshotChecking: '(checking for a newer one)',
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
    cloudsTitle: 'Clouds',
    auroraTitle: 'Aurora',
    weatherTitle: 'Lightning',
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
    months: '{n} months',
    years: '{n} years',
    inFuture: 'in {d}',
    ago: '{d} ago',
  },

  // The phone's sheet (spec 0061 task 3, ui/sheet.js): the sidebar's views at three heights. The
  // handle is a button named for what it changes; its description says the height it is at.
  // (Until 2026-10-02 the phone had a bar of two buttons, Explore and Sources, under two drawers;
  // the sheet replaced both, and its tabs say what Explore had to say in one word.)
  sheet: {
    handle: 'Sheet height',
    closed: 'closed',
    peek: 'lowered',
    half: 'half open',
    full: 'fully open',
    state: '{height}. Up and down arrows change it',
    title: 'Sheet height: {height}. Tap or drag to change it',
  },

  // The GitHub mark in the top corner. `href` is here rather than in ui/github.js for the same
  // reason the words are: it is the one line a human edits when the repository moves, and it
  // should not be hunted for inside a module.
  // ui/printcompose.js: the screen as a printable postcard (Ivan, 2026-09-28), 6 x 4 in at 300 dpi.
  // The card's Postcard saves it; the share sheet shows it and saves it as a JPEG or a PDF.
  print: {
    title: 'Save this view as a 6 by 4 inch postcard (JPEG)',
    making: 'Making the postcard',
    saved: 'Postcard saved',
    failed: 'The postcard could not be made just now',
    // `{id}` from what the view shows, `{date}` the day the sky is from, `{ext}` jpg or pdf.
    fileName: 'space-radar-postcard-{id}-{date}.{ext}',
    when: '{date}, {time} UTC',
    mark: 'spaceradar.ai',
    // Internal #376: the caption names the shutter when it is not the default (Camera).
    exposure: { eye: 'As the eye sees it', deep: 'Deep stretch: faint light lifted' },
  },
  // ui/cleanview.js: the button beside the GitHub mark, and its keyboard hint (H).
  // Spec 0047: the tracked object's HUD (ui/hud.js). Its numbers and its honesty line are the
  // card's own strings (ui/cards.js tagLines); these are only the words the tag adds around them.
  hud: {
    // After a readout's unit: "1 240 km from you". A guessed place is named, never passed off as yours.
    fromYou: 'from you',
    fromPlace: 'from {place}',
    // Line 2 gains this when a world is between the camera and the object (ui/labels.js behindWorld).
    behind: 'behind {world}',
    // The chevron at the edge of the screen when the selection is outside the view.
    offScreen: '{name}, {distance} away, off screen: fly to it',
    // What the polite live region says, and only when a value's first digit changes.
    live: '{name}: {readouts}',
  },
  clean: {
    hide: 'Hide all panels (H)',
    show: 'Show the panels again (H or Escape)',
    // Said once a visit, the first time the panels go (ui/cleanview.js).
    hint: 'H or Escape for the panels. Shift+H keeps labels and time',
  },
  mark: {
    label: 'Source on GitHub',
    title: 'Space Radar source code on GitHub',
    href: 'https://github.com/Sara-Managed-Projects/space-radar',
    press: 'Press kit',
    pressTitle: 'What it is, pictures and the mark to use',
    pressHref: 'press/index.html',
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
    'An orbit 35 786 km up where one lap takes exactly one day, so the satellite seems to hang over one spot.',
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
    'The distance from Earth to the Moon, about 384 000 km. A handy ruler for asteroid passes.',
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
  { name: 'Adelaide', country: 'Australia', latDeg: -34.9285, lonDeg: 138.6007, zone: 'Australia/Adelaide' },
  { name: 'Amsterdam', country: 'Netherlands', latDeg: 52.3676, lonDeg: 4.9041, zone: 'Europe/Amsterdam' },
  { name: 'Anchorage', country: 'United States', latDeg: 61.2181, lonDeg: -149.9003, zone: 'America/Anchorage' },
  { name: 'Auckland', country: 'New Zealand', latDeg: -36.8485, lonDeg: 174.7633, zone: 'Pacific/Auckland' },
  { name: 'Bangkok', country: 'Thailand', latDeg: 13.7563, lonDeg: 100.5018, zone: 'Asia/Bangkok' },
  { name: 'Beijing', country: 'China', latDeg: 39.9042, lonDeg: 116.4074, zone: 'Asia/Shanghai' },
  { name: 'Berlin', country: 'Germany', latDeg: 52.52, lonDeg: 13.405, zone: 'Europe/Berlin' },
  { name: 'Bogota', country: 'Colombia', latDeg: 4.711, lonDeg: -74.0721, zone: 'America/Bogota' },
  { name: 'Brisbane', country: 'Australia', latDeg: -27.4698, lonDeg: 153.0251, zone: 'Australia/Brisbane' },
  { name: 'Buenos Aires', country: 'Argentina', latDeg: -34.6037, lonDeg: -58.3816, zone: 'America/Argentina/Buenos_Aires' },
  { name: 'Cairo', country: 'Egypt', latDeg: 30.0444, lonDeg: 31.2357, zone: 'Africa/Cairo' },
  { name: 'Cape Town', country: 'South Africa', latDeg: -33.9249, lonDeg: 18.4241, zone: 'Africa/Johannesburg' },
  { name: 'Caracas', country: 'Venezuela', latDeg: 10.4806, lonDeg: -66.9036, zone: 'America/Caracas' },
  { name: 'Chicago', country: 'United States', latDeg: 41.8781, lonDeg: -87.6298, zone: 'America/Chicago' },
  { name: 'Darwin', country: 'Australia', latDeg: -12.4634, lonDeg: 130.8456, zone: 'Australia/Darwin' },
  { name: 'Delhi', country: 'India', latDeg: 28.6139, lonDeg: 77.209, zone: 'Asia/Kolkata' },
  { name: 'Denver', country: 'United States', latDeg: 39.7392, lonDeg: -104.9903, zone: 'America/Denver' },
  { name: 'Dhaka', country: 'Bangladesh', latDeg: 23.8103, lonDeg: 90.4125, zone: 'Asia/Dhaka' },
  { name: 'Dubai', country: 'United Arab Emirates', latDeg: 25.2048, lonDeg: 55.2708, zone: 'Asia/Dubai' },
  { name: 'Eucla', country: 'Australia', latDeg: -31.6773, lonDeg: 128.8893, zone: 'Australia/Eucla' },
  { name: 'Halifax', country: 'Canada', latDeg: 44.6488, lonDeg: -63.5752, zone: 'America/Halifax' },
  { name: 'Helsinki', country: 'Finland', latDeg: 60.1699, lonDeg: 24.9384, zone: 'Europe/Helsinki' },
  { name: 'Hong Kong', country: 'China', latDeg: 22.3193, lonDeg: 114.1694, zone: 'Asia/Hong_Kong' },
  { name: 'Honolulu', country: 'United States', latDeg: 21.3069, lonDeg: -157.8583, zone: 'Pacific/Honolulu' },
  { name: 'Istanbul', country: 'Turkey', latDeg: 41.0082, lonDeg: 28.9784, zone: 'Europe/Istanbul' },
  { name: 'Jakarta', country: 'Indonesia', latDeg: -6.2088, lonDeg: 106.8456, zone: 'Asia/Jakarta' },
  { name: 'Johannesburg', country: 'South Africa', latDeg: -26.2041, lonDeg: 28.0473, zone: 'Africa/Johannesburg' },
  { name: 'Kabul', country: 'Afghanistan', latDeg: 34.5553, lonDeg: 69.2075, zone: 'Asia/Kabul' },
  { name: 'Karachi', country: 'Pakistan', latDeg: 24.8607, lonDeg: 67.0011, zone: 'Asia/Karachi' },
  { name: 'Kathmandu', country: 'Nepal', latDeg: 27.7172, lonDeg: 85.324, zone: 'Asia/Kathmandu' },
  { name: 'Kiritimati', country: 'Kiribati', latDeg: 1.8721, lonDeg: -157.4278, zone: 'Pacific/Kiritimati' },
  { name: 'Kolkata', country: 'India', latDeg: 22.5726, lonDeg: 88.3639, zone: 'Asia/Kolkata' },
  { name: 'Lagos', country: 'Nigeria', latDeg: 6.5244, lonDeg: 3.3792, zone: 'Africa/Lagos' },
  { name: 'Lima', country: 'Peru', latDeg: -12.0464, lonDeg: -77.0428, zone: 'America/Lima' },
  { name: 'London', country: 'United Kingdom', latDeg: 51.5074, lonDeg: -0.1278, zone: 'Europe/London' },
  { name: 'Lord Howe Island', country: 'Australia', latDeg: -31.5553, lonDeg: 159.0821, zone: 'Australia/Lord_Howe' },
  { name: 'Los Angeles', country: 'United States', latDeg: 34.0522, lonDeg: -118.2437, zone: 'America/Los_Angeles' },
  { name: 'Madrid', country: 'Spain', latDeg: 40.4168, lonDeg: -3.7038, zone: 'Europe/Madrid' },
  { name: 'Manila', country: 'Philippines', latDeg: 14.5995, lonDeg: 120.9842, zone: 'Asia/Manila' },
  { name: 'Melbourne', country: 'Australia', latDeg: -37.8136, lonDeg: 144.9631, zone: 'Australia/Melbourne' },
  { name: 'Mexico City', country: 'Mexico', latDeg: 19.4326, lonDeg: -99.1332, zone: 'America/Mexico_City' },
  // Added 2026-09-23 for the Miami kiosk (spec 0038's trip starts from the visitor's own place):
  // its time zone is America/New_York, so the guess says New York, and the box could not find it.
  { name: 'Miami', country: 'United States', latDeg: 25.7617, lonDeg: -80.1918, zone: 'America/New_York' },
  { name: 'Moscow', country: 'Russia', latDeg: 55.7558, lonDeg: 37.6173, zone: 'Europe/Moscow' },
  { name: 'Mumbai', country: 'India', latDeg: 19.076, lonDeg: 72.8777, zone: 'Asia/Kolkata' },
  { name: 'Nairobi', country: 'Kenya', latDeg: -1.2921, lonDeg: 36.8219, zone: 'Africa/Nairobi' },
  { name: 'New York', country: 'United States', latDeg: 40.7128, lonDeg: -74.006, zone: 'America/New_York' },
  { name: 'Noronha', country: 'Brazil', latDeg: -3.8403, lonDeg: -32.4297, zone: 'America/Noronha' },
  { name: 'Noumea', country: 'New Caledonia', latDeg: -22.2758, lonDeg: 166.458, zone: 'Pacific/Noumea' },
  { name: 'Nuku\'alofa', country: 'Tonga', latDeg: -21.1394, lonDeg: -175.2049, zone: 'Pacific/Tongatapu' },
  { name: 'Nuuk', country: 'Greenland', latDeg: 64.1814, lonDeg: -51.6941, zone: 'America/Nuuk' },
  { name: 'Osaka', country: 'Japan', latDeg: 34.6937, lonDeg: 135.5023, zone: 'Asia/Tokyo' },
  { name: 'Pago Pago', country: 'American Samoa', latDeg: -14.2756, lonDeg: -170.702, zone: 'Pacific/Pago_Pago' },
  { name: 'Paris', country: 'France', latDeg: 48.8566, lonDeg: 2.3522, zone: 'Europe/Paris' },
  { name: 'Phoenix', country: 'United States', latDeg: 33.4484, lonDeg: -112.074, zone: 'America/Phoenix' },
  { name: 'Ponta Delgada', country: 'Portugal', latDeg: 37.7412, lonDeg: -25.6756, zone: 'Atlantic/Azores' },
  { name: 'Praia', country: 'Cape Verde', latDeg: 14.933, lonDeg: -23.5133, zone: 'Atlantic/Cape_Verde' },
  { name: 'Reykjavik', country: 'Iceland', latDeg: 64.1466, lonDeg: -21.9426, zone: 'Atlantic/Reykjavik' },
  { name: 'Rikitea', country: 'French Polynesia', latDeg: -23.1203, lonDeg: -134.9692, zone: 'Pacific/Gambier' },
  { name: 'Rio de Janeiro', country: 'Brazil', latDeg: -22.9068, lonDeg: -43.1729, zone: 'America/Sao_Paulo' },
  { name: 'Rome', country: 'Italy', latDeg: 41.9028, lonDeg: 12.4964, zone: 'Europe/Rome' },
  { name: 'San Francisco', country: 'United States', latDeg: 37.7749, lonDeg: -122.4194, zone: 'America/Los_Angeles' },
  { name: 'San Juan', country: 'Puerto Rico', latDeg: 18.4655, lonDeg: -66.1057, zone: 'America/Puerto_Rico' },
  { name: 'Santiago', country: 'Chile', latDeg: -33.4489, lonDeg: -70.6693, zone: 'America/Santiago' },
  { name: 'Sao Paulo', country: 'Brazil', latDeg: -23.5505, lonDeg: -46.6333, zone: 'America/Sao_Paulo' },
  { name: 'Seoul', country: 'South Korea', latDeg: 37.5665, lonDeg: 126.978, zone: 'Asia/Seoul' },
  { name: 'Shanghai', country: 'China', latDeg: 31.2304, lonDeg: 121.4737, zone: 'Asia/Shanghai' },
  { name: 'Singapore', country: 'Singapore', latDeg: 1.3521, lonDeg: 103.8198, zone: 'Asia/Singapore' },
  { name: 'St. John\'s', country: 'Canada', latDeg: 47.5615, lonDeg: -52.7126, zone: 'America/St_Johns' },
  { name: 'Stockholm', country: 'Sweden', latDeg: 59.3293, lonDeg: 18.0686, zone: 'Europe/Stockholm' },
  { name: 'Suva', country: 'Fiji', latDeg: -18.1416, lonDeg: 178.4419, zone: 'Pacific/Fiji' },
  { name: 'Sydney', country: 'Australia', latDeg: -33.8688, lonDeg: 151.2093, zone: 'Australia/Sydney' },
  { name: 'Taiohae', country: 'French Polynesia', latDeg: -8.9119, lonDeg: -140.0992, zone: 'Pacific/Marquesas' },
  { name: 'Tehran', country: 'Iran', latDeg: 35.6892, lonDeg: 51.389, zone: 'Asia/Tehran' },
  { name: 'Tokyo', country: 'Japan', latDeg: 35.6762, lonDeg: 139.6503, zone: 'Asia/Tokyo' },
  { name: 'Toronto', country: 'Canada', latDeg: 43.6532, lonDeg: -79.3832, zone: 'America/Toronto' },
  { name: 'Vancouver', country: 'Canada', latDeg: 49.2827, lonDeg: -123.1207, zone: 'America/Vancouver' },
  { name: 'Waitangi', country: 'New Zealand', latDeg: -43.9535, lonDeg: -176.5597, zone: 'Pacific/Chatham' },
  { name: 'Warsaw', country: 'Poland', latDeg: 52.2297, lonDeg: 21.0122, zone: 'Europe/Warsaw' },
  { name: 'Yangon', country: 'Myanmar', latDeg: 16.8409, lonDeg: 96.1735, zone: 'Asia/Yangon' },
];

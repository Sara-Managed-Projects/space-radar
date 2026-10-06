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
  pillUtc: (ms) => {
    const parts = {};
    for (const p of pillFmt.formatToParts(new Date(ms))) parts[p.type] = p.value;
    return t(COPY.timePill.when, {
      date: `${parts.day} ${String(parts.month || '').toUpperCase()}`,
      time: `${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}`,
    });
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

export const COPY = {
  app: {
    name: 'Space Radar',
    tagline: 'Everything in motion around Earth, where it really is, right now.',
  },

  // ui/subscribe.js (issue #251): email-only alerts for upcoming launches and meteor shower
  // peaks -- the same for every subscriber, never a per-location pass alert (that is issue #290).
  subscribe: {
    // The row's label under Coming up: one line in a 320 px column (spec 0061 req 11).
    heading: 'Email me launches and showers',
    emailLabel: 'Your email address',
    emailPlaceholder: 'you@example.com',
    pickOne: 'Tick at least one of the two.',
    launchesLabel: 'Upcoming launches',
    showersLabel: 'Meteor shower peaks',
    submit: 'Subscribe',
    sending: 'Sending…',
    pending: 'Check your email to confirm.',
    couldNotReach: 'Could not reach the subscription service.',
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
  // The service worker's one line (ui/offline.js): a newer build is installed and waiting.
  offline: {
    updateReady: 'A newer version is ready',
    reload: 'Reload',
  },
  // A trip as a card (0061 design §2): the title and one line under it.
  tripCard: {
    title: 'Trips',
    meta: '{n} stops · {m} min',
    metaOne: 'One stop · {m} min',
    planning: 'Working out the stops',
    cannotRun: 'Cannot run right now',
    all: 'All {n} trips',
    fewer: 'Fewer trips',
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
    storm: 'Tropical cyclone',
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
    notLoaded: 'still loading',
    weShowTitle: 'What this map draws of what is known',
    weShowRow: '{n} {what} — of {of}',
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
  // Sound (spec 0035): off until the visitor turns it on, and remembered once they have. The words
  // say the state, not the action, on the toggle ("Sound: off"), and the action on the mute in the
  // bars ("Mute"), because a bar button is pressed mid-trip by somebody who already hears it.
  audio: {
    on: 'Sound: on',
    off: 'Sound: off',
    toggleTitle: 'Music and sounds. Off until you turn it on; remembered on this device.',
    mute: 'Mute',
    unmute: 'Sound',
    muteTitle: 'Turn the music and sounds off',
    unmuteTitle: 'Turn the music and sounds on',
    panelTitle: 'Sound',
    panelNote: 'A quiet score for the map and its trips. Nothing is downloaded until you turn it on.',
    creditsLine: 'Music and sounds: {credits}',
    // Spec 0069 task 5. The registry's own line (registry/narration.yaml `voice.credit`, carried
    // by CREDITS.md section 9b): tests/test_narration.mjs holds the three to one string.
    narrationCredit: 'Narration: a synthetic voice, Kokoro-82M (bf_emma), Apache-2.0',
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
  // Spec 0067: the shutter. The gas clouds in space pictures are real and faint; a photograph's
  // colour is minutes of collected light, and sometimes single gases mapped to colours an eye would
  // not see. The control's line says which exposure is on; the card's lines say how this object's
  // picture was made (`colours` in registry/nebulae.yaml picks the sentence, `filters` fills it).
  exposure: {
    panelTitle: 'Exposure',
    modes: { eye: 'Eye', camera: 'Camera', deep: 'Deep' },
    notes: {
      eye: 'What you would see from a dark place: faint and grey.',
      camera: 'A long exposure: minutes of light, as a camera keeps it.',
      deep: 'An observatory\u2019s stretch: the faintest gas lifted.',
    },
    real: 'The gas is real, and faint: to the eye at a telescope it is a grey glow, because the night eye sees no colour. The picture on the sky is a long exposure.',
    colours: {
      broadband: 'It was taken through broad colour filters ({filters}), so the colours are close to what a far more sensitive eye would see.',
      mixed: 'It was taken through broad colour filters with a narrow one for glowing hydrogen added ({filters}), so the red gas is stronger here than an eye would find it.',
      narrowband: 'Its colours are mapped: each one is the light of a single gas through a narrow filter ({filters}), chosen to show the structure, not what an eye would see.',
      unstated: 'Its archive does not say which filters were used, so we do not say whether these are the colours an eye would see.',
    },
    creditLead: 'Picture: ',
    creditTail: ' \u00b7 {licence}, edges faded and sky darkened by us',
  },
  // The sky in other light (registry/otherlight.yaml, scene/otherlight.js): the chooser in What to
  // show. Each note is the honest line: which light, and that its colours are not an eye's.
  otherLight: {
    panelTitle: 'Other light',
    bands: { visible: 'Visible', infrared: 'Infrared', microwave: 'Microwave', gamma: 'Gamma rays' },
    notes: {
      visible: 'The sky as eyes and cameras see it.',
      infrared: 'The sky in infrared, false colour: warm dust and cool stars.',
      microwave: 'Microwaves, as brightness: the Galaxy over the oldest light.',
      gamma: 'Gamma rays, false colour: pulsars, blazars, cosmic-ray glow.',
    },
    // What the survey's own composite shows as red, green and blue (the buttons' tooltips).
    colours: {
      infrared: 'Red is 22 µm, green 4.6 µm, blue 3.4 µm (WISE)',
      microwave: 'One band, 94 GHz, drawn as brightness (WMAP)',
      gamma: 'Red is 0.3 to 1 GeV, green 1 to 3, blue above 3 (Fermi)',
    },
    mixLabel: 'From the visible sky to {band}',
    mixValue: '{pct} % {band}',
    loading: 'Fetching the picture of the whole sky.',
    failed: 'That picture did not arrive. The sky is as it was.',
    creditLead: 'Survey: ',
    creditTail: '. Tiles: CDS, Strasbourg.',
  },
  // Earth data overlays (registry/overlays.yaml, scene/earthoverlay.js): one measured map over the
  // globe, with its legend, the day it is of and whose data it is.
  overlay: {
    panelTitle: 'Earth data',
    none: 'None',
    loading: 'Asking NASA for the picture.',
    failed: 'That picture did not arrive. The globe is as it was.',
    noEarth: 'Shown on the Earth, when it is in view.',
    // {what} is the registry row's own sentence; {date} "3 October 2026" or "June 2026".
    line: '{what} {dated} {made} {credit}',
    dated: { daily: 'The picture is of {date}.', monthly: 'The picture is the mean of {date}.' },
    made: {
      measured: 'Measured from orbit; clear where nothing was seen.',
      analysed: 'Measured, with the gaps filled in.',
      modelled: 'A weather model fed with measurements, not a direct picture.',
    },
    credit: 'Data: {credit}, through NASA GIBS. A map of data, not a photograph.',
    legendAria: '{title}, from {low} to {high} {unit}',
    legendHigh: '{high} {unit}',
  },
  // Constellation figures that draw themselves (scene/figures3d.js): the line under a stop.
  figures: {
    line: 'The figures are a tradition, drawn by us; the stars at their corners are at their measured distances.',
    lineSky: 'The figures are a tradition, drawn by us, over the stars as they are seen from Earth.',
    ecliptic: 'The dashed line is the ecliptic, the Sun\u2019s path through the year.',
  },
  nextList: {
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
    // THE ROW AS DRAWN (spec 0061 task 5, ui/next.js rowParts): a title, then one line. The
    // sentences above are the row's tooltip and its accessible name; these are what fits a 320 px
    // column on one line each. A launch's line keeps "planned": its time is the one that can move.
    row: {
      launch: 'Lifts off {when} · planned',
      launchRough: 'Around {when} · date not fixed',
      approach: 'Passes Earth {when}',
      approachValue: '{ld}× Moon',
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
  // Colour keys (spec 0026 req 11).
  colourKey: {
    title: 'Colour by',
    unknown: 'not known for these',
    scope: 'Counting what is drawn from here, on the layers that are on.',
    // "What it is": a dot is drawn in its LAYER's colour (a rocket body on "Bright enough to see"
    // is sky blue), so the class rows are counts, and the layer swatches above are the key.
    byLayer: 'Each dot is its layer’s colour, as above.',
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
  // Spec 0048: the next ninety minutes of an Earth orbiter, in time (sky/timefacts.js). Every
  // number here is worked out from the same elements as the dot, and the orbit count says it is
  // inferred because it carries a catalogue count forward.
  timeFacts: {
    label: 'The next 90 minutes',
    barLabel: 'Sunlight and shadow over the next 90 minutes: {parts}',
    barSunlit: '{mins} min in sunlight',
    barShadow: '{mins} min in Earth’s shadow',
    now: 'now',
    end: '+90 min',
    // Counting down in the clock's own time: at 1x that is yours; scrubbed, it is the time shown.
    entersShadowIn: 'Enters Earth’s shadow in {mins}',
    entersSunlightIn: 'Comes out into sunlight in {mins}',
    // Faster than a minute a second, a countdown is a blur; the clock time of the event is not.
    entersShadowAt: 'Enters Earth’s shadow at {time}',
    entersSunlightAt: 'Comes out into sunlight at {time}',
    allSunlit: 'In sunlight for all of the next 90 minutes',
    allShadow: 'In Earth’s shadow for all of the next 90 minutes',
    minutes: '{n} min',
    underAMinute: 'under a minute',
    // A lap runs from one northbound equator crossing to the next (sky/timefacts.js).
    lapIn: 'Completes this lap in {mmss}',
    lapAt: 'Completes this lap at {time}',
    orbit: 'Orbit {n} since launch',
    orbitNote: 'Inferred: the catalogue’s count at the elements’ epoch, plus the laps since.',
    // The year from the international designator ("1998-067A"); the day comes with SATCAT (task 2).
    launched: 'Launched in {year}',
    // The bar's own two lines on the card view (spec 0061 §4, row D): the light now on the left, the
    // next change on the right, and under the bar where the lap ends. Short, because they sit beside
    // a bar 320 px wide; the full sentences above stay in "Its path".
    nowSunlit: 'In sunlight',
    nowShadow: 'In Earth’s shadow',
    shadowIn: 'shadow in {mins}',
    sunlightIn: 'sunlight in {mins}',
    shadowAt: 'shadow at {time}',
    sunlightAt: 'sunlight at {time}',
    lapEndsIn: 'lap ends in {mmss}',
    lapEndsAt: 'lap ends at {time}',
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
    // A storm's centre is measured, at one moment; this is the half of the line that says which.
    stormAdvisory: 'its centre at the {time} UTC advisory, {ago}; a storm moves, so it has moved since',
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
    and: ' and ',
    illustrative: 'Clouds: illustrative. This is one picture of a day in the past, drifting slowly; it is not today’s weather.',
    illustrativeSaveData: 'Clouds: illustrative. Today’s satellite pictures are not fetched on a connection that saves data.',
    illustrativeScrubbed: 'Clouds: illustrative, because the clock is more than 12 hours from the latest satellite picture.',
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

  source: {
    prefix: 'Source',
    unknown: 'Source not recorded',
    fetched: 'read {age}',
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
    lines: { sunPath: 'Path of the Sun', equator: 'Sky equator' },
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
    locationTitle: 'Where you are',
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
    locationNone: 'Not set',
    locationSet: '{name}',
    locationClear: 'Clear',
    locationCoords: '{lat}, {lon}',
    locationNoMatch: 'No city in the bundled list matches that.',
    // The Now moment's first screen guesses a place from the clock and says so, in words that a
    // person reads, not in a tooltip: a guess about where you are is held to the same rule as a
    // guess about an orbit.
    locationGuessed: 'We guessed {name} from your clock’s time zone. Set where you are if that is wrong.',
    locationGuessedByOffset: 'We guessed {name} from your clock’s offset from UTC, which is rough. Set where you are.',
    tonightTitle: 'Coming over tonight',
    tonightRow: '{name} at {time}, {dir}, {fists}',
    tonightNone: 'Nothing bright comes over in the next twelve hours.',
    tonightNoObserver: 'Set where you are, or open the Now door, and this will list what comes over.',
    tonightCouldNotLook: 'Could not look: no satellites have loaded.',
    tonightShowerTail: 'The sky view marks its radiant.',
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
  // Photo mode (public #288, ui/photomode.js): Share's "Photo mode". Everything off the screen, a
  // frame in one of four shapes, and the picture saved through the postcard's own path.
  photo: {
    title: 'Compose a picture',
    barLabel: 'Picture',
    shapesLabel: 'Shape',
    shapes: { '16:9': '16:9', '1:1': '1:1', '4:5': '4:5', '9:16': '9:16' },
    shapeTitle: 'Frame the picture at {shape}',
    caption: 'Caption',
    captionTitle: 'The strip with the name, the date and the address',
    save: 'Save picture',
    saveTitle: 'Save what is inside the frame as a JPEG',
    done: 'Leave photo mode',
    making: 'Making the picture',
    saved: 'Picture saved',
    failed: 'The picture could not be made just now',
    // The strip's last line: a composed picture travels without the card that says how it was drawn.
    honesty: 'Drawn from measured positions, not a photograph',
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
  // Spec 0051: what you can see tonight (sky/tonight.js tonightWords). The place is a guess from the
  // device's time zone unless the visitor set one, and says so; the Tonight tab (spec 0061) shows it.
  tonight: {
    title: 'Tonight',
    // One line each in the sidebar (spec 0061 req 11).
    placeGuess: 'Near {place}, guessed from your time zone',
    placeSet: 'From {place}',
    placeShared: 'From {place}, shared with you',
    noPlace: 'Set where you are to see what passes over.',
    coords: '{lat}, {lon}',
    working: 'Working out tonight’s passes…',
    // "International Space Station · 21:03 · from SW to NE, about five fists above the horizon at
    // its highest (52°) · 5 min": direction and fist words are the card's own (copy/en.js above).
    passLine: '{name} · {time} · from {from} to {to}, {fists} at its highest ({deg}°) · {mins} min',
    startsIn: 'Starts in {countdown}',
    // Scrubbed, a countdown from a clock that is not now would count to nothing: the clock time.
    startsAt: 'Starts at {time}',
    upNow: 'Up now, look {dir}',
    showMe: 'Show me',
    showMeTitle: 'Open the sky from your place, facing where it rises',
    guessCaveat: 'Times can be a few minutes off where you are.',
    // THE PASS AS DRAWN (spec 0061 task 5, ui/tonight.js): the name, three numbers with their
    // units under them, and the way it goes. passLine above stays the whole account: the block's
    // accessible name and a list row's tooltip.
    unitRises: 'rises',
    unitHigh: 'at its highest',
    unitLong: 'min in view',
    degrees: '{deg}°',
    path: 'From {from} to {to}',
    rowDetail: '{time} · {deg} up · {mins} min',
    // Nothing tonight: the empty line, and the next one on a line of its own.
    nothingTonight: 'Nothing bright passes over tonight.',
    nextPass: 'Next: {when} · {name}',
    nothingAtAll: 'Nothing bright passes over for three days.',
    darkFrom: 'Dark from {time}',
    darkUntil: 'Dark until {time}',
    darkNow: 'Dark now',
    neverDark: 'It does not get dark tonight',
    moonRises: 'Moon {pct} %, rises {time}',
    moonUp: 'Moon {pct} %, up now',
    moonDown: 'Moon {pct} %, below the horizon',
    more: 'More passes',
    fewer: 'Fewer passes',
    arcLabel: 'Its path across the sky: rises in the {from}, highest {deg}° up, sets in the {to}',
    // The arc's compass letters (ui/skyarc.js), as the trajectory chart spells its N and S.
    cardinals: { N: 'N', E: 'E', S: 'S', W: 'W' },
    // TONIGHT'S BEST (internal #358, sky/tonightbest.js): one ranked list, one line a row. A pass
    // is its three moments in one mono line (pub #448): appears, highest, gone.
    best: {
      title: 'Tonight’s best',
      nothing: 'Nothing stands out tonight.',
      rowTitle: 'Show it on the sky',
      passLine: '{t0} {d0} · {t1} {deg}° {d1} · {t2} {d2}',
      // Brightness, at the right of a row's name: lower is brighter, and a dash is "not known".
      mag: 'mag {mag}',
      passAria: '{name}: appears {t0} {d0}, highest {t1} at {deg}° {d1}, gone {t2} {d2}, magnitude {mag}.',
      fades: 'It fades into the Earth’s shadow before it sets.',
      appears: 'It comes out of the Earth’s shadow part-way up.',
      notVisible: 'Not visible: the sky is bright or it is in shadow.',
      rocket: 'Rocket body · {name}',
      debris: 'Debris · {name}',
      planetLine: 'best {time} · {deg}° up, {dir}',
      moonTitle: 'Moon · {phase} · {pct} %',
      moonSets: 'sets {time}',
      moonRises: 'rises {time}',
      moonAllNight: 'up all night',
      phases: {
        new: 'new', waxingCrescent: 'waxing crescent', firstQuarter: 'first quarter', waxingGibbous: 'waxing gibbous',
        full: 'full', waningGibbous: 'waning gibbous', lastQuarter: 'last quarter', waningCrescent: 'waning crescent',
      },
      showerLine: 'up to {zhr} an hour · best {time}, {dir}',
      darkHours: 'Dark {from} to {to}',
      moonless: 'no Moon, a dark night',
      moonBright: 'Moon {pct} % hides faint stars',
      moonFaint: 'Moon {pct} %, little light',
      neverDark: 'It does not get dark tonight.',
      // The three names drawn on a pass's arc across the sky.
      markEnds: '{time} {dir}',
      markPeak: '{time} {deg}°',
      honesty: 'Computed for your place. Brightness is an estimate.',
    },
    // THE SKY'S CONTROLS (internal #351, #356, #357; pub #454), in the Tonight view: the field of
    // view, what is drawn over the stars, how dark the visitor's own sky is, and red light.
    skybar: {
      title: 'The sky',
      field: 'Field of view',
      fields: { eye: 'Eye', binoculars: 'Binoculars', telescope: 'Telescope' },
      fieldNotes: {
        eye: 'As wide as you see. Scroll or pinch to zoom.',
        binoculars: 'A 7° field: fainter stars come out.',
        telescope: 'A 1° field: planets become discs.',
      },
      show: 'Lines and names',
      toggles: { figures: 'Figures', names: 'Names', sunPath: 'Sun’s path', equator: 'Equator', grid: 'Grid', starGrid: 'Star grid' },
      toggleTitles: {
        figures: 'The constellation figures',
        names: 'Names of constellations and bright stars',
        sunPath: 'The path the Sun, the Moon and the planets keep to',
        equator: 'The sky’s equator, above the Earth’s',
        grid: 'Height and direction, with the north-south line',
        starGrid: 'The grid the stars are mapped on',
      },
      darkness: 'Your sky',
      darknessModes: { city: 'City', town: 'Town', dark: 'Dark place' },
      darknessNotes: {
        city: 'City: stars to magnitude 4, no Milky Way.',
        town: 'Town edge: stars to magnitude 5.3.',
        dark: 'Dark place: stars to 6.5 and the Milky Way.',
      },
      red: 'Red light',
      redTitle: 'Turn the page red to keep your eyes used to the dark',
      honesty: 'Stars measured, planets computed; air and skyline drawn.',
    },
  },
  clean: {
    hide: 'Hide all panels (H)',
    show: 'Show the panels again (H or Escape)',
  },
  // The controls hint (spec 0068 task 2, ui/keyhint.js): once per visitor, bottom-right. Each
  // keycap is a key the app really answers (tests/test_keyhint.mjs holds them to the code); what a
  // row does is one or two words, how else to do it one word under it.
  keyHint: {
    title: 'Controls',
    titleTouch: 'Gestures',
    label: 'Keys that move the view',
    labelTouch: 'Gestures that move the view',
    close: 'Close',
    closeTitle: 'Close (Escape)',
    does: {
      turn: 'Turn',
      zoom: 'Closer, farther',
      pan: 'Move sideways',
      pick: 'Choose a thing',
      search: 'Search',
      hide: 'Hide all',
      show: 'What to show',
      share: 'Share',
      esc: 'Close',
    },
    how: {
      drag: 'Drag',
      wheel: 'Scroll',
      pinch: 'Pinch',
      two: 'Two fingers',
      tap: 'Tap',
    },
    caps: {
      up: '↑',
      left: '←',
      down: '↓',
      right: '→',
      w: 'W',
      s: 'S',
      plus: '+',
      minus: '−',
      slash: '/',
      pgUp: 'PgUp',
      pgDn: 'PgDn',
      h: 'H',
      l: 'L',
      p: 'P',
      esc: 'Esc',
    },
  },
  mark: {
    label: 'Source on GitHub',
    title: 'Space Radar source code on GitHub',
    href: 'https://github.com/Sara-Managed-Projects/space-radar',
  },
  // The film (spec 0070, ui/rendermode.js): title card, lower third, end card, thumbnail.
  render: {
    eyebrow: 'Space Radar · a trip',
    site: 'spaceradar.ai',
    fly: 'Fly it yourself',
    music: 'Music: John Bartmann, CC0. Full credits at spaceradar.ai.',
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
    // A tropical cyclone's first sentence (2026-09-28). "whose centre was here" and not "is here":
    // the point is the latest advisory's, and the card's honesty line says how old that is.
    storm: {
      lead: '{name} is {a} {status} whose centre was here {ago}',
      leadUnknown: '{name} is a tropical cyclone whose centre was here {ago}',
      // The clock in the six hours before the advisory: "was here in 2 hours" read as nonsense.
      leadBefore: '{name} is {a} {status} whose centre reaches here {ago}',
      leadBeforeUnknown: '{name} is a tropical cyclone whose centre reaches here {ago}',
      wind: 'the strongest winds on its track, forecast included, reach {n} km/h',
      statuses: {
        hurricane: 'hurricane',
        typhoon: 'typhoon',
        cyclone: 'tropical cyclone',
        storm: 'tropical storm',
        depression: 'tropical depression',
      },
    },
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
      missionType: 'a {missionType} mission',
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

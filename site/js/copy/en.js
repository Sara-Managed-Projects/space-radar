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

const MAGNITUDE_BANDS = [
  { upto: -11, say: 'as bright as the full Moon' },
  { upto: -6, say: 'brighter than any star or planet' },
  { upto: -3.5, say: 'as bright as Venus' },
  { upto: 0, say: 'as bright as the brightest stars' },
  { upto: 3, say: 'as bright as an ordinary star' },
  { upto: 6, say: 'just visible from a dark place' },
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
  nextList: {
    title: 'Coming up',
    hint: 'From what the app has loaded: launches, close approaches, comets, and passes over you.',
    now: 'about now',
    inMinutes: 'in {n} minutes',
    inHours: 'in {n} hours',
    todayAt: 'today at {time}',
    tomorrowAt: 'tomorrow at {time}',
    launch: '{name} lifts off {when}',
    launchRough: '{name} lifts off {when}, give or take -- the date is not fixed yet',
    approach: '{name} passes Earth {when}, {ld}× the Moon’s distance away',
    approachNoDistance: '{name} passes Earth {when}',
    perihelion: '{name} is closest to the Sun {when}',
    pass: '{name} comes over you {when}',
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
  chooser: {
    label: 'Things under your finger',
    hint: '{n} here. Tap one, or tap the sky to close.',
  },
  card: {
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
      closestApproach: 'Closest to Earth',
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
      comet: 'a generic comet',
      site: 'a generic ground site',
      star: 'a point of light, sized by how bright it looks from where you are',
      exoplanet: 'a mark at its star -- the orbit itself is far too small to draw',
      dso: 'a soft mark at its measured distance; its true shape is not drawn',
      exotic: 'a ring at its measured distance; a black hole has no shape to draw and a pulsar is far too small',
    },
    // Where an attached object sits on its carrier's model is our arrangement, AND SO IS HOW BIG
    // IT IS. The disc really is bolted to the side of the bus; the centimetre we chose is ours,
    // and so is the size -- a 30 cm record on a 13 m spacecraft is one or two pixels at the size
    // a model is drawn here, and three 4 cm figures on Juno are less than one. Both are drawn
    // far larger, and the sentence that says so has to cover both, so it belongs here rather
    // than in either registry row's `departure:`.
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

    // --- the intro card ------------------------------------------------------------------
    // It sets the expectation, it makes the trip a decision rather than an ambush, and it gives
    // the scene a beat to settle before the first flight.
    introStart: 'Start',
    introSkip: 'Not now',
    droppedOne: 'One stop cannot be shown today and is not counted above.',
    droppedMany: '{n} stops cannot be shown today and are not counted above.',
    clockClamped: 'Time has been set back to normal speed for this trip.',

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
    endExplore: 'Explore from here',
    endExploreTitle: 'Keep this view and carry on by yourself',
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
    couldNotLook: 'Could not work out a pass from here.',
    nowhereToLook: 'Nobody knows where this one is, so there is nowhere to look.',
  },

  controls: {
    title: 'Controls',
    layersTitle: 'What to show',
    layerCount: '{n}',
    layerCountLoading: 'counting',
    layerCountEmpty: 'nothing loaded',
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
    couldNotRead: 'Could not be read, so not searched: {layers}.',
    fallback: 'Nothing starts with that, so these merely contain it.',
    switchedOn: 'Switched on {layer} so you can see it.',
    notLoadedCount: 'How many objects that leaves out cannot be known until they load.',
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
      'Some classes ship as bundled sample data in this version, because their source cannot be called from a browser at all.',
    layerLive: 'live',
    layerSample: 'bundled sample',
    layerIllustrative: 'drawn, not tracked',
    layerMixed: 'mixed',
    layerEmpty: 'nothing loaded',
    layerCountLabel: '{n} shown',
    sourcesEmpty: 'No sources have been declared.',
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
  mobile: {
    barLabel: 'Panels',
    layers: 'Layers',
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
      leadRange: '{name} is a {kind} somewhere between {lo} and {hi} light-years away',
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
      lead: '{name} is a {type} {dist} light-years away',
      leadRange: '{name} is a {type} somewhere between {lo} and {hi} light-years away',
      leadUntyped: '{name} is {dist} light-years away',
      size: 'about {n} light-years across',
      seenAs: 'the light you see left it {n} years ago',
      seenAsMillions: 'the light you see left it {n} million years ago',
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
      leadNear: '{name} is a star {dist} light-years away, one of the nearest there are',
      colour: 'a {colour} star',
      seenAs: 'the light you see left it {n} years ago',
      seenAsMonths: 'the light you see left it {n} months ago',
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
      whyCountdown: 'lifting off {when}',
      whyFlown: 'which lifted off {when}',
      destination: 'heading for {destination}',
      payload: 'carrying {payload}',
      illustrative: 'the track drawn here is a sketch of the climb, not a measured path',
    },
    probe: {
      lead: '{name} is a spacecraft out in the solar system',
      destination: 'on its way to {destination}',
      lightTime: 'far enough that a radio message takes {mins} minutes each way',
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
      whyApproach: "passing Earth on {date} at {ld}× the Moon's distance",
      size: '{size}',
      // Only written when a named source says so (spec 0013 requirement 6).
      willNotHit: 'it will not hit Earth',
    },
    comet: {
      lead: '{name} is a comet on a long loop around the Sun',
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
      leadKind: '{name} is a {kind}',
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
      whyPhase: '{phase} tonight',
      whyRise: 'rising from where you are at {time}',
      distance: '{distance}',
      diameter: 'about {n} km across',
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
    'The busy shell from about 200 to 2000 km up. The station, most satellites and nearly all the debris are here.',
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
  L2: 'A balance point 1.5 million km away from the Sun, where a telescope can keep the Earth and Sun behind it and stay cold.',
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

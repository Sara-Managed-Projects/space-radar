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

export const fmt = {
  num,
  smart,
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
  { upto: 110, say: 'about the size of a football field' },
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
  if (!(km > 0)) return null;
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

  card: {
    close: 'Close',
    closeTitle: 'Close this card',
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
      lightTime: 'Radio time each way',
      nextPass: 'Next pass over you',
      crew: 'People aboard',
      operator: 'Operated by',
      launched: 'Launched',
      period: 'One lap takes',
      location: 'Where it stands',
      closestApproach: 'Closest to Earth',
      missDistance: 'Miss distance',
      perihelion: 'Closest to the Sun',
      magnitude: 'Brightness',
      phase: 'Phase',
      liftoff: 'Lift-off',
      pad: 'From',
      destination: 'Heading for',
    },

    values: {
      km: '{n} km',
      kmh: '{n} km/h',
      kmPerS: '{n} km/s',
      au: '{n} astronomical units',
      lunar: "{n}× the Moon's distance",
      minutes: '{n} minutes',
      seconds: '{n} seconds',
      degrees: '{n}°',
      people: '{n}',
      latLon: '{lat}, {lon}',
      north: '{n}° N',
      south: '{n}° S',
      east: '{n}° E',
      west: '{n}° W',
    },

    // "I could not look" is a third answer, and it is not "fine".
    couldNotLook: 'Could not work this out',
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
    illustrative: 'drawn to show where it goes; the real track is not public',
    sample: 'bundled sample data, not a live position',
    unknown: 'we cannot say how this position was worked out',
    hourWord: 'hour',
    hoursWord: 'hours',
    dayWord: 'day',
    daysWord: 'days',
    minuteWord: 'minute',
    minutesWord: 'minutes',
  },

  // WHAT YOU ARE LOOKING AT. Two comments in the scene code -- scene/models.js and
  // scene/realmodels.js -- describe "the card means by 'drawn as a generic satellite'". The card
  // never said it. This is that line, and it sits in the footer beside the position class,
  // because "the shape is a stand-in" is the same category of claim as "the track is a sketch".
  //
  // Colour is deliberately absent. 14 of the families in registry/rockets.yaml have no sourced
  // livery; they draw in the neutral default and the card says nothing at all about colour. We
  // do not write "colour unknown" -- we simply never claim one.
  drawing: {
    variant: 'drawn from published dimensions for {name}',
    family: 'drawn as {name} — the family shape, not this exact version',
    generic: 'drawn as a generic rocket; we have no dimensions for {name}',
    genericUnnamed: 'drawn as a generic rocket; we have no dimensions for this vehicle',
    disputed: 'sources disagree on its height ({disputed})',
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
    onTheGround: 'This one stands on the ground, so there is nothing to look up for.',
    worldRise: 'From where you are it comes up at {time}.',
    // Rise and set for a world needs 0014's sky maths. Say that, rather than imply it is
    // invisible: the Moon and the planets are the easiest things in the sky to find.
    worldNoRise:
      'You can see this one with your own eyes. Working out when it rises from your place is not in this version yet.',
    couldNotLook: 'Could not work out a pass from here.',
  },

  controls: {
    title: 'Controls',
    layersTitle: 'What to show',
    layerCount: '{n}',
    layerCountLoading: 'counting',
    layerCountEmpty: 'nothing loaded',
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

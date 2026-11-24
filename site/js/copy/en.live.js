// The words of the research train "live" (the awesome-space research of 2026-11-23; forge #547, #548, #544, #546):
// a catalogue's day on its object's card and in the top bar's chip (ui/releaseday.js), the space weather on the
// Earth's and the Sun's cards (ui/spacepanel.js), the live camera of the station (ui/isscam.js) and the home's
// day card (ui/daycard.js).
//
// WHY A FILE OF ITS OWN. Every one of them is built after the first visit has settled, by a module that is not in
// the boot graph (the card, the launch chip, the dated cards): their words are not a first visit's bytes, as
// copy/en.later.js's are not. ADDED TO THE SAME `COPY` OBJECT; no module in the boot graph imports it
// (tests/test_boot_diet.mjs). The facts in these sentences are the registries' and their sources are named there:
// registry/events.yaml (data-release), registry/links.yaml (iss-live), registry/sources.yaml (swpc-kp).
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  // A big catalogue's day (forge #547). The chip counts in days, never in hours: the agency gives no hour.
  releaseDay: {
    chipDays: '{name} · in {n} days',
    chipTomorrow: '{name} · tomorrow',
    chipToday: '{name} · today',
    chipOut: '{name} is out',
    chipLabel: '{name} goes public on {date}. Opens {object}’s card',
    section: '{name}, {date}',
    inDays: 'Out in {n} days, on {date}, the day the agency gives. No hour is published.',
    tomorrow: 'Out tomorrow, {date}, the day the agency gives. No hour is published.',
    today: 'Out today, {date}. The agency publishes no hour.',
    out: 'Out since {date}.',
    hintDays: 'in {n} days',
    hintTomorrow: 'tomorrow',
    hintToday: 'today',
    hintOut: 'out',
    sources: 'Date and contents: {publisher}, read {date}.',
    sourceLink: 'The agency’s page',
    journal: 'Read about it in the Journal',
    // One block of words per date of registry/events.yaml `data-release`, by its id.
    dates: {
      'gaia-dr4': {
        what: 'Gaia DR4 is ESA’s fourth Gaia catalogue: 66 months of measurements, from July 2014 to January 2020, of about 2.8 billion stars and other sources. Most of its 400 terabytes are the single measurements behind the averages.',
        stars: 'Nothing changes on this map on the day. Its 2.5 million stars in 3D come from the HYG and AT-HYG catalogues, whose distances are mostly from Gaia DR3, the release before this one.',
        after: 'After the day we will read the new data and its terms, then decide what to refresh, star distances and motions first. Until that is done and said here, the stars stay as they are.',
        where: 'Gaia itself was switched off in March 2025 and pushed away from L2 onto an orbit of its own round the Sun. This card shows where it is now.',
        publisher: 'ESA',
      },
    },
  },

  // The space weather on the Earth's and the Sun's cards (forge #548): NOAA SWPC's Kp, measured and forecast,
  // kept apart and labelled; what a storm does, from NOAA's own scale; and the aurora layer, one press away.
  spacePanel: {
    section: 'Space weather',
    hintKp: 'Kp {kp}',
    hintNone: 'NOAA’s Kp index',
    measuredHead: 'Measured',
    forecastHead: 'Forecast, next three days',
    day: '{day}',
    dayValue: 'up to Kp {kp}',
    dayWords: '{word}',
    noForecast: 'NOAA’s file holds no forecast for the days ahead.',
    kindNote: 'Measured is NOAA’s reading of the last three-hour bins; the days ahead are its forecast, made three hours at a time, and they can change.',
    stormHead: 'What a storm does',
    storm: {
      satellites: 'Satellites: from G2 the drag on low orbits changes and their predicted paths drift; from G3 low satellites sink faster.',
      navigation: 'Navigation: from G3 satellite navigation can fail now and then; at G4 and G5 it is degraded for hours, even days.',
      radio: 'Radio: shortwave fades near the poles from G2, and at G5 may be gone for a day or two.',
      aurora: 'Aurora: a G1 storm is seen in the far north and south; each step brings it about 5 degrees of magnetic latitude closer to the equator, to about 40 at G5.',
    },
    aurora: 'Show the aurora on the globe',
    auroraTitle: 'The aurora layer: NOAA’s forecast of the next 30 to 90 minutes',
    sources: 'Kp: NOAA SWPC, public domain. What a storm does: NOAA’s space weather scales, read {date}.',
    scalesLink: 'NOAA’s scales',
    none: 'Could not read NOAA’s space weather just now.',
  },

  // The live camera of the station (forge #544). The stream is NASA's, played by YouTube in its privacy-enhanced
  // mode, and nothing of YouTube's is asked for until the visitor presses the button.
  issCam: {
    section: 'Live camera',
    hint: 'NASA’s stream',
    lead: 'NASA streams the view from cameras on the station. It loads only when you ask for it, from YouTube.',
    watch: 'Watch live from the station',
    watchTitle: 'Opens NASA’s live video beside the map; it connects to YouTube',
    privacy: 'Pressing it connects to YouTube in its privacy-enhanced mode; from then on YouTube’s own terms and privacy policy apply.',
    dark: 'The picture is often black, blue or a test card: the station spends more than a third of most orbits in the Earth’s shadow, and the feed drops when it loses contact with the ground.',
    sunlit: 'Right now the station is in sunlight: if the feed is up, it may show the day side.',
    shadow: 'Right now the station is in the Earth’s shadow: expect a dark picture, city lights at best.',
    title: 'Live from the station',
    close: 'Close the live camera',
    frameTitle: 'NASA live video from the International Space Station, on YouTube',
    loading: 'Asking YouTube for NASA’s stream…',
    credit: 'Video: NASA, on YouTube. The globe beside it is our map, not the camera.',
    onYoutube: 'Open on YouTube',
    nasaLive: 'NASA Live',
    checked: 'Stream link checked {date}.',
  },

  // The home's day card (forge #546): this day in space, the Earth today, the sky today, each a way into the map.
  dayCard: {
    thisDayKicker: 'On this day · {year}',
    nearKicker: '{date} {year}',
    thisDayTitle: '{mission}: {event}',
    earthKicker: 'Earth today',
    earthTitleNorth: 'The Sun is overhead at {deg}° N',
    earthTitleSouth: 'The Sun is overhead at {deg}° S',
    earthLine: '{n} days to the {season}.',
    earthLineOne: 'The {season} is tomorrow.',
    earthLineToday: 'The {season} is today.',
    skyKicker: 'The sky today',
    skyTitle: 'Moon {phase}, {pct}% lit',
    skyMorning: 'Before dawn: {list}.',
    skyEvening: 'After dusk: {list}.',
    skyNoPlanets: 'No bright planet is clear of the Sun’s glare.',
    share: 'Share today',
    shareTitle: 'Share today’s card: the link, the words and a picture',
    shareName: 'Today in space, {date}',
    sources: 'Sources: {list}.',
    sourceMission: '{name}',
    sourceSky: 'the Sun, Moon and planets worked out here (Astronomy Engine)',
  },
});

// The sections this file added, in the visitor's language when a translation has it (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

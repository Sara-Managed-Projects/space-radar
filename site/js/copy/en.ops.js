// The words of the research train "ops" (the awesome-space research of 2026-11-23; forge #558, #561, #562, #563): the live
// operations view of the sidebar (ui/ops.js) and its four panes, State of Space (ui/opsstate.js), re-entries and close
// calls (ui/opsreentry.js), the Deep Space Network's contacts (ui/opsdsn.js) and Earth events (ui/opsevents.js), and the
// doors into it on the explore view's tabs (ui/opsentry.js).
//
// WHY A FILE OF ITS OWN. Everything here is built after the first visit has settled, by modules outside the boot graph:
// these words are not a first visit's bytes (tests/test_boot_diet.mjs). ADDED TO THE SAME `COPY` OBJECT. The facts are
// the sources' and are named beside each sentence; the numbers themselves are never typed here, they are read.
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  ops: {
    label: 'Live operations',
    tabs: { state: 'Numbers', reentry: 'Close calls', dsn: 'Deep Space', events: 'Earth' },
    titles: {
      state: 'State of Space',
      reentry: 'Re-entries and close calls',
      dsn: 'Who is talking to whom',
      events: 'Earth events',
    },
    loading: 'Reading our copy…',
    couldNot: 'Could not look: our copy of this is not there yet.',
    retry: 'Try again',
    asOf: 'As of {date}',
    read: 'read {ago}',
    source: 'Source: {source}',
    flyTo: 'Fly there',
    openCard: 'Open its card',

    // The doors on the explore view's tabs (ui/opsentry.js).
    entry: {
      title: 'Live',
      state: 'State of Space',
      reentry: 'Re-entries and close calls',
      dsn: 'Deep Space Network now',
      events: 'Fires, storms, volcanoes, floods',
    },

    // State of Space (forge #558).
    state: {
      lead: 'What is up there, counted from public catalogues.',
      live: 'Live',
      frozen: 'Frozen {quarter}',
      quarter: '{year} Q{n}',
      heroLabel: 'The three numbers',
      labels: {
        earth_orbit: 'Objects in Earth orbit',
        payloads: 'Satellites in Earth orbit',
        working_payloads: 'Satellites still working',
        rocket_bodies: 'Spent rocket stages',
        debris: 'Pieces of debris tracked',
        starlink: 'Starlink satellites up',
        owners: 'Countries and groups owning one',
        launches_year: 'Orbital launches in {year}',
        beyond_earth: 'Craft beyond Earth orbit',
        beyond_working: 'Of them, still working',
        came_down_30d: 'Came down in the last 30 days',
        people: 'People on the space stations',
        dsn_now: 'Craft talking to the DSN now',
      },
      short: { earth_orbit: 'objects in Earth orbit', people: 'people on the stations', launches_year: 'orbital launches in {year}' },
      ownersHead: 'Satellites by owner',
      ownersOther: 'Everyone else',
      sparkHead: 'Since 2016, a point a quarter',
      sparkPayloads: 'Satellites in orbit',
      sparkDebris: 'Debris tracked',
      sparkLaunches: 'Launches a quarter',
      howLive: 'Counted from CelesTrak’s catalogue read {date}.',
      howBack: 'Counted back to {date} from today’s catalogue.',
      peopleSource: 'Launch Library 2, The Space Devs',
      dsnSource: 'NASA’s DSN Now',
      cite: 'Cite this',
      citeText: 'Space Radar, “State of Space”, {quarter}, frozen {frozen}, spaceradar.ai/state-of-space/ (data: CelesTrak SATCAT).',
      copied: 'Copied',
      pageLink: 'The page, with every quarter',
      owners: {
        US: 'United States', PRC: 'China', CIS: 'Russia and the former USSR', UK: 'United Kingdom', JPN: 'Japan', TBD: 'Owner not yet known',
        FR: 'France', IND: 'India', IT: 'Italy', GER: 'Germany', ITSO: 'Intelsat', ESA: 'European Space Agency', CA: 'Canada', SKOR: 'South Korea',
      },
      note: 'A launch counts when it reached orbit. Working means CelesTrak lists it as working.',
    },

    // Re-entries and close calls (forge #561).
    reentry: {
      recentHead: 'Came down in the last 30 days',
      recentNone: 'Nothing in the catalogue came down in the last 30 days.',
      recentRow: '{kind}, {owner} · down {date}',
      lowestHead: 'Lowest now',
      lowestLead: 'The {n} lowest of {total} whole orbits under {km} km: next to come down.',
      lowestRow: '{peri} to {apo} km',
      noPrediction: 'No date is given: the catalogue says how low, not when. Space-Track’s windows need an account.',
      closeHead: 'Closest approaches this week',
      closeLead: 'CelesTrak’s predictions, highest chance first. We compute none.',
      closeRow: '{range} m apart · {speed} km/s',
      closeWhen: '{date} UTC',
      closeChance: '1 in {n}',
      closeChanceHigh: 'over 1 in 10',
      closeNote: 'CelesTrak’s chance assumes nobody steers. Most working pairs are Starlinks that can move aside.',
      filters: { all: 'All', debris: 'With debris', rocket: 'With a rocket stage', working: 'Two working' },
      filterLabel: 'Show close approaches',
      closeNone: 'None of this kind in CelesTrak’s list.',
      closeCouldNot: 'Could not look: our copy of CelesTrak’s list is not there yet.',
      kinds: { payload: 'Satellite', rocket_body: 'Rocket stage', debris: 'Debris', unknown: 'Unknown' },
      momentHead: '2009: the first collision of two satellites',
      moment: 'Watch Iridium 33 and Kosmos 2251',
      momentHint: 'A Moment: the hit, and the two clouds over the years',
      sources: 'The catalogue: CelesTrak SATCAT, read {date}. Close approaches: CelesTrak SOCRATES Plus, read {close}.',
    },

    // The Deep Space Network (forge #562).
    dsn: {
      lead: 'Which dish is talking to which craft, from NASA’s DSN Now.',
      lines: 'Lines on the map',
      linesTitle: 'Draw a line from each dish to the craft it hears',
      linesNote: 'A line is drawn only to a craft the map shows; lines need Probes and telescopes on.',
      none: 'No craft is in contact right now.',
      stale: 'The feed is {ago} old: these contacts may have ended.',
      row: '{dishes} · {dir}',
      both: 'both ways',
      down: 'sending to Earth',
      up: 'hearing Earth',
      light: '{t} one way',
      lightS: '{n} s',
      lightMin: '{m} min {s} s',
      lightH: '{h} h {m} min',
      notDrawn: 'not on this map',
      sites: { gdscc: 'Goldstone', mdscc: 'Madrid', cdscc: 'Canberra' },
      sources: 'NASA Deep Space Network, DSN Now, read {ago}. An unofficial feed with no terms of its own.',
    },

    // Earth events (forge #563).
    events: {
      lead: 'Open events NASA tracks, with their last reported place.',
      filterLabel: 'Show events',
      kinds: { all: 'All', wildfire: 'Fires', storm: 'Storms', volcano: 'Volcanoes', flood: 'Floods' },
      kindOne: { wildfire: 'Fire', storm: 'Storm', volcano: 'Volcano', flood: 'Flood' },
      row: '{kind} · {date}',
      none: 'No open event of this kind in NASA’s list.',
      map: 'With the map of {map}',
      noMap: 'No daily map of this here',
      mapOff: 'Map off',
      disclaimer: 'NASA’s EONET: for looking, not an official record of where or when.',
      sources: 'NASA EONET, read {ago}. Maps: NASA GIBS.',
    },
  },
});

// The sections this file added, in the visitor's language when a translation has it (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

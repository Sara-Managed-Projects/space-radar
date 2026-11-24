// The launch archive's words (ui/launcharchive.js, scene/launcharcs.js; forge #551): every orbital launch attempt since
// 1957 from GCAT, its table, its filters and its replay on the globe. ADDED TO THE SAME `COPY` OBJECT, imported by
// ui/launcharchive.js alone: nothing reads them before the archive is opened (tests/test_boot_diet.mjs).
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  launchArchive: {
    lead: '{n} orbital launch attempts since Sputnik 1. Choose one to fly to its launch site.',
    tableLabel: 'Orbital launch attempts',
    columns: { date: 'Date (UTC)', vehicle: 'Rocket', site: 'Site', payload: 'Payload', outcome: 'Outcome' },
    // GCAT's outcome letters (its LaunchCode's second letter).
    outcome: { S: 'Success', F: 'Failure', P: 'Partial', E: 'Pad explosion', A: 'Pad abort', U: 'Unknown' },
    partial: 'Partial, {pct} %',
    outcomeTitle: 'GCAT credits it {pct} % in its reliability counts',
    filters: { outcome: 'Outcome', when: 'When', country: 'Launch site in', text: 'Rocket, payload or site' },
    outcomeChips: { all: 'All', S: 'Success', F: 'Failure', P: 'Partial', other: 'Other' },
    whenAny: 'Any year',
    decades: 'Decades',
    years: 'Years',
    decade: 'The {d}s',
    countryAll: 'Anywhere',
    elsewhere: 'Elsewhere',
    // GCAT's code SU has no country of today: the name is written here, not asked of the browser.
    soviet: 'Soviet Union',
    noPlace: 'GCAT gives no place for this site yet, so the globe cannot go there.',
    flewTo: 'On the globe: {site}, pad {pad}',
    flewToNoPad: 'On the globe: {site}',
    replay: {
      title: 'Replay on the globe',
      play: 'Replay',
      pause: 'Pause',
      playTitle: 'Replay every launch from {year} on, two years a second',
      year: 'Year',
      yearValue: '{year}: {n} launch attempts',
      reduced: 'Motion is reduced: move the slider to step through the years.',
      note: 'Illustrative arcs: each starts at the real launch site and heads as the planned orbit allows, toward the equator; due east where GCAT gives no orbit. A failure stops short.',
    },
    sourceName: 'GCAT, Jonathan McDowell',
    licence: 'CC BY 4.0',
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

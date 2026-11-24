// The words the catalogues share (ui/catalogue.js, ui/catalogkit.js, ui/catalogueentry.js; research train "catalogues", forge
// #551, #553, #560, #564): the view's head, the rows on the explore tabs that open it, and the table's and the filters' own words.
// Each catalogue's words are its own file (copy/en.launches.js, en.skycalendar.js, en.neo.js, en.exoexplorer.js), fetched
// with its module.
//
// ADDED TO THE SAME `COPY` OBJECT, as copy/en.find.js is, and imported by those modules only: nothing reads them before a
// catalogue is opened or its rows are drawn after the first visit (tests/test_boot_diet.mjs).
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  // ui/catalogueentry.js: the rows on the explore tabs.
  catalogueEntry: {
    title: 'Catalogues',
    launches: 'Every launch since 1957',
    calendar: 'Sky calendar',
    eclipse: 'Eclipse of 2 August 2027: will I see it?',
    asteroids: 'Near-Earth asteroids',
    exoplanets: 'Exoplanet explorer',
  },

  // ui/catalogue.js and ui/catalogkit.js: the view and what every catalogue in it shares.
  catalogue: {
    label: 'Catalogues',
    titles: {
      launches: 'Every launch since 1957',
      calendar: 'Sky calendar',
      eclipse: 'Eclipse of 2 August 2027',
      asteroids: 'Near-Earth asteroids',
      exoplanets: 'Exoplanet explorer',
    },
    loading: 'Reading the catalogue…',
    failed: 'Could not load this catalogue. Try again later.',
    retry: 'Try again',
    // The table (ui/catalogkit.js buildTable), on Find's own table.
    sortTitle: 'Sort by {col}',
    rowTitle: 'Go to {name}',
    showing: 'Showing {shown} of {n}',
    showingAll: '{n} rows',
    none: 'Nothing matches these filters.',
    more: 'Show {n} more',
    // The filters (ui/catalogkit.js chipGroup), the Lab's and Find's chips.
    all: 'All',
    search: 'Filter by name',
    clear: 'Clear filters',
    // The line under every catalogue: where the rows come from and how old they are.
    sourceLabel: 'Source',
    licenceLabel: 'Licence',
    // After the source's name: ". CC BY 4.0. Our saved copy, read 23 November 2026".
    sourceTail: '. {text}',
    asOf: 'As of {date}',
    savedCopy: 'Our saved copy, read {date}',
    bundledCopy: 'The copy bundled with the map, read {date}',
    unknown: '—',
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

// The words of three controls of release 1.3.0 stage W3-e (internal spec 0077): "How we know", the confidence filter in What to
// show (ui/confidence.js, internal i#886), the arrival views in the share sheet (ui/bookmarks.js, i#882) and its photo presets
// (ui/photopresets.js, i#905). ADDED TO THE SAME `COPY` OBJECT as copy/en.later.js's sections and imported by those modules
// only: nothing reads them until What to show or the share sheet is opened, so a first visit does not fetch them (the budget
// `after_first_visit_bytes`, registry/budgets.yaml). The three ways in (COPY.entrances) are copy/en.later.js's: the welcome
// is on screen in the first minute.
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  // ui/confidence.js (internal i#886, SR-PLAN-085): the section "How we know" in What to show. The four words are the
  // card's (copy/en.facts.js truth.hints), their sentences the legend's (r12Truth.position): no second set.
  confidence: {
    title: 'How we know',
    onlyMeasured: 'Measured only',
    onlyMeasuredTitle: 'Show only the dots seen by an instrument at a known time',
    all: 'All',
    allTitle: 'Show every dot again',
    status: 'Showing {n} of {m} dots',
    scope: 'Filters the dots; the star field stays as it is.',
    railNote: 'Some dots are hidden: How we know',
  },

  // ui/bookmarks.js (internal i#882, SR-PLAN-081): arrival views, in the share sheet.
  views: {
    row: 'Arrival views',
    label: 'Views of this place',
    curatedLabel: 'From the sheet',
    savedLabel: 'Saved here',
    act: '{act}: {what}',
    go: 'Go',
    copy: 'Copy',
    remove: 'Remove',
    save: 'Save this view',
    saveTitle: 'Keeps where the camera stands, in this browser only',
    saved: 'View saved in this browser.',
    savedPage: 'Kept until this page closes.',
    full: 'Twelve views are saved. Remove one first.',
    copied: 'Link to this view copied.',
    copyRefused: 'Could not copy. The link is in the address bar.',
    none: 'Nothing saved yet.',
    goTitle: 'Fly there and stand where it was framed',
    copyTitle: 'A link that opens this view',
    removeTitle: 'Forget this view',
    pose: '{az}\u00b0 round, {pol}\u00b0 from the pole, {km} km',
    away: '{km} km out',
    // The poses are the camera's, not a measurement of the thing: what each one does, in the words of what it is.
    curated: {
      above: 'From above the plane',
      inPlane: 'In the plane',
    },
    aboveTitle: 'From above the plane of the planets: looking down on the Solar System\u2019s north side',
    inPlaneTitle: 'In the plane of the planets: level with their orbits, from the side',
  },

  // ui/sharesheet.js (internal i#905, SR-PLAN-134): photo presets, each a shape, a lens, a shutter and a look, set for
  // one kind of picture and put back when photo mode is left. None is a grade: no bloom, no post pass (D2, public #261).
  presets: {
    row: 'Photo presets',
    label: 'Photo presets',
    go: 'Open',
    science: 'Science frame',
    scienceNote: 'Measured look, caption on',
    cinematic: 'Cinematic frame',
    cinematicNote: 'Wide, long lens, deep shutter',
    telescope: 'Telescope view',
    telescopeNote: 'Narrowest lens, square',
    card: 'Object card',
    cardNote: 'Portrait, tag on the saved picture',
    title: '{name}: {note}',
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

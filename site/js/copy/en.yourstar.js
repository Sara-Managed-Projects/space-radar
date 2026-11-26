// The words of the star of your year (ui/yourstar.js, forge internal #545): a birthday, the star whose light left that year,
// the sky on the day, and a card to share. ADDED TO THE SAME `COPY` OBJECT as copy/en.later.js's sections and imported by
// ui/yourstar.js only, so nothing reads them until the panel is asked for (a first visit does not fetch them). The search
// row that opens it is copy/en.later.js's (searchRows.yourStar), with the search's own words.
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  yourStar: {
    title: 'The star of your year',
    close: 'Close the star of your year',
    lede: 'Light takes a year to cross a light-year. So the star as many light-years away as you are years old is seen tonight by light that left it when you were born.',
    dateLabel: 'Birthday',
    placeLabel: 'Town, for that night’s sky (optional)',
    placeHint: 'London, Lagos, Lima…',
    placeUnknown: 'That town is not in the list, so the sky is worked out for 9 pm on your clock.',
    go: 'Find my star',
    finding: 'Looking through the named stars…',
    needDate: 'Type a birthday first.',
    badDate: 'That is not a day the panel can read. Pick one from 1900 to today.',
    future: 'That day has not come yet. Pick a day in the past.',
    noStars: 'The stars have not loaded. Try again in a moment.',
    eyebrow: 'The star of your year',
    eyebrowOnWay: 'Your star’s light is on its way',
    where: 'In {constellation}, {ly} light-years away',
    distance: '{ly} light-years away',
    left: 'The light you see from it tonight left it in {when}, when you were born.',
    leftNear: 'The light you see from it tonight left it in {when}: no named star is exactly as far as you are old, and this is the nearest.',
    leftYear: 'The light you see from it tonight left it in {when}, about when you were born in {year}.',
    band: 'Its distance is known to about {err} light-years either way, so that light set off between {from} and {to}.',
    // A month after a preposition, for the languages that decline it there (ui/yourstar.js monthYearText): twelve
    // space-separated forms for {when} (monthsIn) and for {from}/{to} (monthsFrom), joined to the year by monthYear.
    // English leaves both empty, and the browser writes "August 1990".
    monthsIn: '',
    monthsFrom: '',
    monthYear: '{month} {year}',
    onItsWay: 'No star is that close yet. The light that left {name} on your birthday is still crossing the {ly} light-years: it arrives in {when}.',
    errFrom: {
      gaia: 'The error is Gaia’s: the star’s parallax and its own uncertainty.',
      range: 'The error is the range the catalogue gives for this star.',
      modelled: 'The error is modelled from Hipparcos’s precision (half a milliarcsecond); the catalogue gives none for this star.',
    },
    skyOn: 'The sky on {date}',
    moon: 'The Moon: {phase}, {pct} % lit',
    planetsPlace: 'Up after dusk from {place}: {list}',
    planetsClock: 'In the evening sky: {list}',
    planetsNone: 'No bright planet was in the evening sky.',
    formatLabel: 'Card shape',
    formats: { landscape: 'Wide', square: 'Square', story: 'Story' },
    share: 'Share',
    shareTitle: 'Share the card and its link',
    download: 'Download',
    downloadTitle: 'Save the card as a PNG picture',
    copyLink: 'Copy link',
    copyLinkTitle: 'A link that opens this card again',
    fly: 'Fly to the star',
    flyTitle: 'Close this and fly to the star in the 3D map',
    sky: 'See that night',
    skyTitle: 'Stand on the ground and look at the sky of that evening',
    copied: 'Link copied',
    copyRefused: 'Copying was refused just now',
    shareFailed: 'Sharing did not work here. Download the card instead.',
    cardAlt: 'A card: {name}, the star whose light left the year you were born, with the stars around it.',
    privacy: 'Nothing is stored or sent. The date stays in this page, and in the link only if you share it; the town never does.',
    footer: 'SPACERADAR.AI · A LIVE MAP OF SPACE',
  },
});

// The section this file added, in the visitor's language when a translation has it (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

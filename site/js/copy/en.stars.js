// The words of release 2.0.0 batch f3-stars: the sky of another millennium (ui/deeptime.js, forge #141), the
// variable stars' light curves (ui/varcurve.js, forge #142) and the turning black holes (ui/holespin.js, forge #149).
// ADDED TO THE SAME `COPY` OBJECT as copy/en.later.js's sections, and imported by those modules only: nothing reads
// them before the sky's controls, a star's card or a black hole's card is opened, so a first visit does not fetch them.
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  // ui/deeptime.js: the sky's deep-time row and its readout.
  deepTime: {
    title: 'Deep time',
    back: '−{n} years',
    on: '+{n} years',
    backTitle: 'Go {n} years back, keeping the date and the hour',
    onTitle: 'Go {n} years on, keeping the date and the hour',
    presetsLabel: 'Other pole stars',
    presets: { thuban: 'Thuban, 2800 BC', vega: 'Vega, AD 13 700', far: 'AD 50 000' },
    presetTitles: {
      thuban: 'When the pyramids were built, Thuban in Draco was the pole star',
      vega: 'About AD 13 700 the pole comes within 6.5° of Vega',
      far: 'The sky fifty thousand years from now',
    },
    yearAd: 'AD {n}',
    yearBc: '{n} BC',
    moved: 'The sky of {year}: every star moved by its own measured motion.',
    far: 'No Moon or planets are drawn this far from now, and the Sun is where the calendar puts it.',
    pole: 'Pole star: {name}, {deg}° from the pole.',
    noPole: 'No bright star marks the pole: the nearest, {name}, is {deg}° away.',
    unnamed: 'a star of magnitude {mag}',
    honest: 'The motions are measured (Hipparcos and Gaia, through HYG); carrying them in straight lines for millennia is modelled. The turning of the Earth’s axis: Vondrák, Capitaine and Wallace 2011.',
  },

  // ui/varcurve.js: a variable star's light curve on its card.
  variables: {
    label: 'How its light changes',
    types: {
      eclipse: 'An eclipsing pair: two stars that pass in front of each other.',
      binary: 'A close pair pulled out of round, so its light never stays still.',
      pulse: 'A pulsating star: it swells and shrinks.',
      sine: 'A small, fast pulsating star.',
      sr: 'A semi-regular giant: its period and range are measured, but not where in its cycle it is, so the curve is a sketch.',
      irregular: 'An irregular variable: no clock can say how bright it is, so the sky keeps the catalogue’s brightness.',
    },
    periodDays: 'Period {n} days.',
    periodYears: 'Period {n} years.',
    aria: 'Light curve of {name}, from magnitude {bright} to {faint}; now {now}.',
    now: 'now',
    nowLine: 'Now magnitude {mag} ({band}); it ranges from {bright} to {faint}.',
    range: 'It ranges from magnitude {bright} to {faint} ({band}).',
    far: 'Its curve is not carried more than {years} years from now; it ranges from magnitude {bright} to {faint} ({band}).',
    nextMin: 'Next minimum: {when}',
    measured: 'Measured: the dated magnitudes of the Great Dimming. Elements: {cite}.',
    modelled: 'Modelled: the shape is drawn from the catalogue’s period, epoch and range ({cite}).',
    notes: {
      'alf-ori': 'In 2019 and 2020 it faded to magnitude 1.6, the Great Dimming: a cloud of dust it had thrown off hid part of it.',
      'omi-cet': 'Mira’s maxima come weeks early or late from one cycle to the next, so these dates can be out by that much.',
      'bet-lyr': 'Its period grows by 19 seconds a year; the curve follows the quadratic ephemeris of Harmanec and Scholz (1993).',
      'bet-per': 'Algol’s eclipses keep to the minute: it fades for about ten hours every 2.87 days.',
      'eps-aur': 'Eclipsed for nearly two years every 27 years by a dark disc round its companion; the last eclipse ran from 2009 to 2011.',
      'eta-car': 'In its Great Eruption of the 1840s it became the second-brightest star in the sky.',
      't-crb': 'A recurrent nova: it flared to magnitude 2 in 1866 and in 1946.',
    },
  },

  // ui/holespin.js: the spin a black hole is drawn with.
  blackHoleSpin: {
    spin: 'Drawn turning, with spin a = {a}: the shadow has the shape a turning hole casts (Bardeen 1973), pushed away from the side that comes towards us. {why} The light round it is still traced without spin, so the shape is modelled.',
    spinWhy: {
      'm87-star': 'The spin is chosen: the best-fitting models of EHT 2019 paper V turn at 0.94.',
      'sgr-a-star': 'The spin is chosen: EHT 2022 paper V favours 0.5 to 0.94.',
    },
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

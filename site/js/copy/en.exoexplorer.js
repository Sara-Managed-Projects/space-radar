// The exoplanet explorer's words (ui/exoexplorer.js; forge #564, research train "catalogues"). ADDED TO THE SAME `COPY` OBJECT,
// as copy/en.catalogues.js is, and imported by that module only: nothing reads them before the explorer is opened.
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  exoExplorer: {
    lead: 'Every confirmed planet around another star, any two numbers against each other. Tap a dot to go there.',
    views: 'Views',
    presets: {
      periodRadius: 'Year length and size',
      zone: 'Starlight and star (habitable zone)',
      massRadius: 'Mass and size',
      years: 'Found each year',
    },
    xLabel: 'Across',
    yLabel: 'Up',
    scaleLabel: '{axis} scale',
    linear: 'Linear',
    log: 'Log',
    // The columns, as a select and an axis say them, and the unit after a value.
    axes: {
      period: 'Year length',
      radius: 'Size',
      mass: 'Mass',
      distance: 'Distance',
      year: 'Year found',
      starTeff: 'Star temperature',
      starRadius: 'Star size',
      aAu: 'Orbit size',
      insol: 'Starlight received',
      teq: 'Planet temperature',
      starMass: 'Star mass',
    },
    units: {
      period: 'days',
      radius: 'Earths',
      mass: 'Earths',
      distance: 'ly',
      year: '',
      starTeff: 'K',
      starRadius: 'Suns',
      aAu: 'au',
      insol: 'Earth = 1',
      teq: 'K',
      starMass: 'Suns',
    },
    axisTitle: '{name} ({unit})',
    methods: 'Found by',
    method: {
      transit: 'Transit',
      rv: 'Wobble',
      microlensing: 'Microlensing',
      imaging: 'Imaging',
      other: 'Other ways',
    },
    methodTitle: 'Show or hide the planets found by {method}',
    // The count line: what is drawn, and what is not and why. Never a planet dropped without a word.
    drawn: '{n} planets drawn.',
    missing: '{n} have no value on one of the two axes.',
    nonPositive: '{n} have a value of zero or less, which a log scale cannot place.',
    hidden: '{n} are hidden by the "Found by" chips.',
    canvasLabel: '{y} against {x}: {n} planets. Arrow keys step through them, Enter opens one.',
    readout: '{name}: {x}, {y}. {method}',
    readoutHint: 'Point at a dot, or focus the plot and use the arrow keys.',
    open: 'Open {name}',
    noRecord: '{name} is not on the map yet.',
    // The habitable zone, when an axis can show it.
    zoneBoth: 'Green band: where liquid water could last, for each star temperature (Kopparapu et al. 2014). Lighter: the wider, optimistic band.',
    zoneSun: 'Green band: the habitable zone for a star like the Sun (Kopparapu et al. 2014). Cooler stars have it at less starlight.',
    zoneNone: 'Choose Starlight received on one axis to see the habitable zone.',
    zoneLab: 'Try the habitable zone in the Lab',
    // The honesty line under the plot.
    honesty: 'Measured values from the Archive’s composite table; orbit size, starlight, planet temperature and star mass are the Archive’s own, and some of them it worked out from the others. Masses and sizes given only as limits are left out.',
    extraMissing: 'The extra columns could not be read: orbit size, starlight, planet temperature and star mass have no values.',
    source: 'NASA Exoplanet Archive, composite table (DOI 10.26133/NEA13)',
    licence: 'Public; the Archive asks to be acknowledged',
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

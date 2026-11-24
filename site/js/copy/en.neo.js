// The words of the near-Earth asteroid catalogue (ui/neobrowser.js, data/neocat.js, scene/asteroidcloud.js; research train
// "catalogues", forge #560). ADDED TO THE SAME `COPY` OBJECT, imported by those modules only: nothing reads them before the
// catalogue is opened (tests/test_boot_diet.mjs).
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  neo: {
    lead: '{rows} of the {neo} known near-Earth asteroids: every hazardous one, every one about a kilometre across or larger, and every one passing within 0.05 AU in the next ten years.',
    tableLabel: 'Near-Earth asteroids',
    // The filters.
    whichLabel: 'Which',
    which: { all: 'All', pha: 'Hazardous', km: 'A kilometre or more', close: 'Passing close' },
    classLabel: 'Orbit',
    classes: { APO: 'Apollo', ATE: 'Aten', AMO: 'Amor', IEO: 'Atira' },
    classTitles: {
      APO: 'Crosses the Earth’s orbit from outside it',
      ATE: 'Crosses the Earth’s orbit from inside it',
      AMO: 'Comes near the Earth’s orbit from outside, never crosses it',
      IEO: 'Its whole orbit lies inside the Earth’s',
    },
    searchPlaceholder: 'Apophis, 2024 YR4, 433',
    // The columns.
    columns: { name: 'Name', size: 'Size', next: 'Next pass', dist: 'Distance', cls: 'Orbit', dv: 'Delta-v', moid: 'MOID' },
    km: '{n} km',
    m: '{n} m',
    range: '{min} to {max}',
    estimated: '{range} (estimated)',
    sizeMeasured: 'Measured by JPL',
    sizeEstimated: 'Estimated from its brightness (H {h}): a bright rock is the smaller size, a dark one the larger',
    ld: '{n} LD',
    ldTitle: '{n} times the Moon’s distance, {au} AU, at {kms} km/s',
    kms: '{n} km/s',
    au: '{n} AU',
    moidTitle: 'The closest the two orbits come to each other, not a pass',
    passes: '{n} passes in the next ten years',
    // The notes under the table.
    notes: {
      size: 'Sizes are JPL’s measurements where it has one, otherwise a range worked out from the brightness for a rock as bright as a stony asteroid or as dark as a carbon-rich one.',
      dv: 'Delta-v is an estimate of how hard a rock is to reach: the speed change from a low Earth orbit to meeting it (Shoemaker and Helin, 1978, as Lance Benner’s table works it). A real mission waits for a launch window.',
      place: 'Choosing a row flies to it and draws its orbit. Its place is worked out from JPL’s orbit by two-body motion, so it is inferred, and drifts from JPL’s with the months since the orbit’s date.',
      hazard: '“Hazardous” names an orbit that comes within 0.05 AU of the Earth’s and a rock bigger than about 140 metres. It is not a forecast.',
    },
    // The card of a rock the map had no layer record of (data/neocat.js recordFor).
    recordWhy: 'In the near-Earth asteroid catalogue because {reasons}. The orbit is JPL’s fit to real observations; where it is along that orbit is worked out here by two-body motion, so the place is inferred.',
    reasonJoin: ', and ',
    reasons: {
      pha: 'JPL lists it as potentially hazardous',
      km: 'it is about a kilometre across or larger',
      close: 'it passes within 0.05 AU of the Earth in the next ten years',
    },
    recordSource: 'NASA/JPL Small-Body Database and CNEOS close approaches, read {date}',
    // The point layer (scene/asteroidcloud.js).
    cloud: {
      title: 'All numbered asteroids',
      toggle: 'Show the brightest numbered asteroids as points',
      shown: '{shown} of {numbered} numbered asteroids, the brightest first (H {h} or brighter)',
      loading: 'Reading the points…',
      failed: 'Could not load the points.',
      more: 'Add {n} more',
      all: 'Every tier we keep is on',
      legend: { neo: 'Near-Earth', belt: 'Main belt', trojan: 'Jupiter’s Trojans', far: 'Beyond Jupiter' },
      note: 'Points only, worked out from JPL’s orbits by two-body motion and rounded to a ten-thousandth of their distance from the Sun. Not every asteroid: the faint ones are left out.',
    },
    sourceSbdb: 'NASA/JPL Small-Body Database (the orbits)',
    sourceCad: 'NASA/JPL CNEOS close approaches (the passes)',
    licence: 'Public domain (NASA/JPL)',
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

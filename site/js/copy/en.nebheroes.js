// The words of the emission nebulae's heroes (release 1.4.0 stage r14-neb-a, internal spec 0078: no photographs,
// realistic 3D): the Lagoon, the Trifid, the Eagle, the Omega, the Rosette, the California, the North America with the
// Pelican and the Cat's Paw, all drawn by scene/deep/emission.js. ADDED TO THE SAME `COPY` OBJECT as copy/en.later.js's
// sections, and imported by that hero module only: nothing reads them until a hero is near, so a first visit does not
// fetch them. ui/cardfacts.js honestyClause reads `card[heroId]` from the hero's own block (the coordinator stamps it
// from the hero's `card`); its caveat rows from `COPY[heroCopy].rows[recordId]` once a hero has drawn.
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

// The rows every one of these heroes shares: how its light and its shape were made, and the review.
const LIGHT_ROW = ['Its light', 'Measured: the light of each point of it is its photograph’s, with the stars taken out (the bright ones are drawn as stars). From our side the model shows exactly that light; turned, the same light lies on the reconstructed walls.'];
const REVIEW_ROW = ['Review', 'This model has not yet been reviewed by an astronomer.'];

Object.assign(COPY, {
  deepNebulae: {
    // The hero's own source, after the honesty line.
    card: {
      m8: 'Its light is its photograph’s (ESO); its shape reconstructed: glowing gas on the near face of its dark cloud, the Hourglass round Herschel 36, the dark lane in front and the cluster NGC 6530 before it (after Tothill and others, 2008). Not yet reviewed by an astronomer.',
      m20: 'Its light is its photograph’s (Rubin Observatory); its shape reconstructed: a young bubble of glowing gas round its O star, cut by three dark lanes in front, in the blue light its stars scatter off the dust round it (after Lefloch and Cernicharo, 2000). Not yet reviewed by an astronomer.',
      m16: 'Its light is its photograph’s (ESO); its shape reconstructed: the cavity the cluster NGC 6611 has blown in its cloud, its glowing far wall, and the Pillars of Creation standing in front with their tips toward the cluster (after Hester and others, 1996, and McLeod and others, 2015). Not yet reviewed by an astronomer.',
      m17: 'Its light is its photograph’s (ESO); its shape reconstructed: glowing gas on the edge of a giant dark cloud, its bright bar a front seen nearly edge-on (after Pellegrini and others, 2007). Not yet reviewed by an astronomer.',
      rosette: 'Its light is its photograph’s (NOIRLab); its shape reconstructed: a thick ring of glowing gas round the cavity the winds of the cluster NGC 2244 have blown in a thin, sheet-like cloud (after Wareing and others, 2018). Not yet reviewed by an astronomer.',
      california: 'Its light is its photograph’s (NOIRLab); its shape in depth is not measured: drawn as a long, shallow sheet of hydrogen lit by Xi Persei. Not yet reviewed by an astronomer.',
      'north-america': 'Its light is its photograph’s (NOIRLab); its shape reconstructed: one region of glowing gas round the Bajamar Star, which the dark cloud LDN 935 in front splits into the North America and the Pelican (after Kuhn and Hillenbrand, 2020). Not yet reviewed by an astronomer.',
      'cats-paw': 'Its light is its photograph’s (ESO); its shape reconstructed: bubbles of glowing gas blown along a dark filament some 50 parsecs long, the paw’s pads (after Arzoumanian and others, 2022). Not yet reviewed by an astronomer.',
    },
    // Rows under "Distance found by" on the card (ui/cardfacts.js, stage c's `rows` hook).
    rows: {
      'dso-m8': [
        ['Its shape in depth', 'Reconstructed. The glowing gas is on the near face of its dark cloud, deepest round the Hourglass; how deep has not been measured.'],
        ['In front of it', 'The dark lane that names it and the small dark globules are dust in front of the glow; how far in front is not measured. The cluster NGC 6530 is a seeded sample of its stars.'],
        LIGHT_ROW, REVIEW_ROW,
      ],
      'dso-m20': [
        ['Its shape in depth', 'Reconstructed. A bubble of glowing gas round its O star, part of its light drawn on the far side and part on the near side; neither depth has been measured. The blue light is drawn on the cloud behind it.'],
        ['In front of it', 'The three dark lanes are dust seen against the glow; how far in front is not measured.'],
        LIGHT_ROW, REVIEW_ROW,
      ],
      'dso-m16': [
        ['Its shape in depth', 'Reconstructed. The glow is drawn on the far wall of the cavity behind the cluster; how deep the cavity is has not been measured.'],
        ['The Pillars', 'Columns of dust and gas whose tips the cluster’s light is boiling away, as observed. They are drawn as dust in front of the glowing wall; their depths are not measured.'],
        LIGHT_ROW, REVIEW_ROW,
      ],
      'dso-m17': [
        ['Its shape in depth', 'Reconstructed. Glowing gas on the edge of a giant dark cloud to its west; its bright bar is where the gas meets the cloud, seen nearly edge-on, as observed. The depths are not measured.'],
        ['Its stars', 'Its cluster, NGC 6618, is mostly hidden by dust: a few of its hot stars are drawn at their measured places, the rest a seeded sample.'],
        LIGHT_ROW, REVIEW_ROW,
      ],
      'dso-rosette-nebula': [
        ['Its shape in depth', 'Reconstructed. A thick ring round a cavity blown by its cluster’s winds in a thin, sheet-like cloud; part of its light is drawn on the ring’s far face and part on its near face. Neither depth has been measured.'],
        ['Its stars', 'The cluster NGC 2244’s hot stars at their measured places, the rest a seeded sample; their depths are not measured.'],
        LIGHT_ROW, REVIEW_ROW,
      ],
      'dso-california-nebula': [
        ['Its shape in depth', 'Not measured. Drawn as a long, shallow sheet of glowing hydrogen whose relief follows its brightness: an illustration of its depth, not a measurement.'],
        ['Its star', 'Xi Persei, the hot star that makes it glow, at its measured place.'],
        LIGHT_ROW, REVIEW_ROW,
      ],
      'dso-north-america-nebula': [
        ['Its shape in depth', 'Reconstructed. The North America and the Pelican are one region of glowing gas round the Bajamar Star; the glow is drawn on its far side, at a depth that has not been measured.'],
        ['In front of it', 'The dark cloud LDN 935 lies in front of the glow and splits it in two on our sky; how far in front is not measured.'],
        LIGHT_ROW, REVIEW_ROW,
      ],
      'dso-cats-paw-nebula': [
        ['Its shape in depth', 'Reconstructed. Each pad is a bubble of glowing gas along a dark filament; their sizes are measured on the sky, their depths are not.'],
        LIGHT_ROW, REVIEW_ROW,
      ],
    },
    // "How astronomers reconstructed its 3D form": two sentences, sourced, for a card disclosure or a trip.
    how: 'A photograph records how much light comes from each point of a nebula, but not how far along our line it lies. These models keep each nebula’s light and lay it on walls whose shape follows what astronomers measured: a blister, a cavity, a ring or bubbles, with the dust they saw in front.',
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

// The words of the deep-space heroes of release 1.3.0 (internal spec 0077 stage W2-e): the Carina Nebula
// (scene/deep/carina.js) and the Small Magellanic Cloud with the Magellanic Bridge and Stream (scene/deep/smc.js,
// scene/deep/magellanic.js). ADDED TO THE SAME `COPY` OBJECT as copy/en.later.js's sections, and imported by those
// hero modules only: nothing reads them until a hero is near, so a first visit does not fetch them (the budget
// `after_first_visit_bytes`, registry/budgets.yaml). ui/cardfacts.js honestyClause reads `card[heroId]` from the blocks
// it lists, these among them; its caveat rows from `COPY[heroCopy].rows[recordId]` once a hero has drawn.
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  deepCarina: {
    // The hero's own source, after the honesty line.
    card: {
      carina: 'Its light is taken from ESO’s photograph, its shape reconstructed after Smith and others (2000) and Smith and Brooks (2008): a cavity of two lobes blown by its clusters, its glowing wall behind Eta Carinae and the dark V-shaped lane of dust in front. Not yet reviewed by an astronomer.',
    },
    // Rows under "Distance found by" on the card (ui/cardfacts.js, stage c's `rows` hook).
    rows: {
      'dso-carina-nebula': [
        ['Its shape in depth', 'Reconstructed. On the largest scale the nebula is a cavity of two lobes about 40 parsecs across, along an axis square to the Milky Way’s plane. The glow is drawn on the cavity’s far wall; how deep each lobe is has not been measured.'],
        ['In front of it', 'The dark V-shaped lane is dust and molecular gas in front of the glowing gas, as observed. How far in front is not measured: it is drawn 20 light-years before the clusters.'],
        ['Its stars', 'Eta Carinae and fourteen of its brightest hot stars at their measured places; their depths are not measured, so they stand in one plane. The clusters Trumpler 14 and 16 are a seeded sample of their stars.'],
        ['Review', 'This model has not yet been reviewed by an astronomer.'],
      ],
    },
    // "How astronomers reconstructed its 3D form": two sentences, sourced, for a card disclosure or a trip.
    how: 'Infrared pictures of the whole nebula show one structure, a bubble with two lobes blown out of the Milky Way’s plane by the clusters at its waist (Smith and others, 2000). Eta Carinae is inside it: its light is reflected across the Keyhole, and the dust round it hides glowing gas behind it but not in front.',
  },
  deepSmc: {
    card: {
      smc: 'This model is built from its photograph and Gaia’s counts of its own stars, as deep along our line as its pulsating Cepheids and old red giants are measured to be (Ripepi and others, 2017; Scowcroft and others, 2016; Tatton and others, 2021). Not yet reviewed by an astronomer.',
    },
    rows: {
      'dso-smc': [
        ['Its shape in depth', 'Not a flat disc: its young stars stretch more than 25 000 parsecs along our line, the north-eastern end nearest us, and its old stars lie near a plane tilted about 40°. Measured as trends; each drawn star’s depth is a model, never a measurement.'],
        ['Round it', 'The Magellanic Bridge and Stream: hydrogen gas pulled out of the Clouds, mapped by its radio glow (HI4PI). No eye or camera sees it, so it is drawn faint, in false colour. Where it lies along our line is a model: only its end at the Clouds is anchored.'],
        ['Review', 'This model has not yet been reviewed by an astronomer.'],
      ],
    },
    how: 'Astronomers measured the distances of hundreds of its Cepheids, stars whose pulsing gives away how bright they are. They lie along a streak more than 25 000 parsecs long pointing nearly at us, the north-eastern end nearest: the Small Cloud is being pulled apart by the Large one (Ripepi and others, 2017).',
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

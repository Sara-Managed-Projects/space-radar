// The words of the deep-space objects built from published 3D data (the deep-space review of 2026-11-16): the
// Homunculus Nebula round Eta Carinae (scene/deep/homunculus.js).
// ADDED TO THE SAME `COPY` OBJECT as copy/en.later.js's sections, and imported by those lazy modules only: a first visit
// does not fetch them. ui/cardfacts.js honestyClause reads `card[heroId]` from the hero's own block, and its rows from
// `COPY[heroCopy].rows[recordId]` once the hero has drawn. Drafted in every language (copy/<code>.js).
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  deepHomunculus: {
    // The hero's own source, after the honesty line.
    card: {
      homunculus: 'Its shape is a published 3D model, built from the measured speed of every part of the nebula (Steffen and others, 2014), turned and sized by Smith’s measurements (2006). Its brightness and mottling are illustrative. Model: NASA’s Goddard Space Flight Center/Ed Campion & UNAM/W. Steffen, from ESO. Not yet reviewed by an astronomer.',
    },
    // Rows under "Distance found by" on the card (ui/cardfacts.js, stage c's `rows` hook).
    rows: {
      'dso-homunculus-nebula': [
        ['Its shape', 'Measured. A 3D model built from the Doppler shift of its hydrogen gas, read along 92 strips across the nebula with ESO’s Very Large Telescope (Steffen and others, 2014). The hole at each pole, the trench round it and the two bumps near the waist are in the data.'],
        ['Its tilt and size', 'Measured. The far lobe points north-west, 41° away from our line of sight; the near one points at us by as much. In 2005 each pole was 21 690 times the Earth–Sun distance from the star (Smith, 2006).'],
        ['It grows', 'Every part has flown straight out at its own speed since the eruption of the 1840s, so its size follows the clock’s date. Before the eruption it is not drawn.'],
        ['Its surface', 'Illustrative. The brightness and the mottling stand for dust lit from inside by the star; the model holds only the shape. The Measured look takes the mottling off.'],
        ['3D model', 'NASA’s Goddard Space Flight Center/Ed Campion & UNAM/W. Steffen, from ESO (CC BY 4.0). No point of it was moved.'],
        ['Review', 'This drawing has not yet been reviewed by an astronomer.'],
      ],
    },
    // "How astronomers reconstructed its 3D form": two sentences, sourced, for a card disclosure or a trip.
    how: 'Gas coming toward us shifts its light to the blue and gas going away to the red, and the Homunculus has expanded evenly since the 1840s, so a point’s speed along our line also says how far in front of the star or behind it that point is. Astronomers read the speed of its hydrogen along 92 strips across the nebula and built its shape from that (Steffen and others, 2014).',
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

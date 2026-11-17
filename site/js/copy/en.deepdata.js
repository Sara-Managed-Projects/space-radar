// The words of the deep-space objects built from published 3D data (the deep-space review of 2026-11-16): the
// Homunculus Nebula round Eta Carinae (scene/deep/homunculus.js) and Cassiopeia A (scene/deep/casa.js).
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
  deepCasA: {
    // The hero's own source, after the honesty line.
    card: {
      casa: 'Each point is a place where that gas was measured: its speed toward or away from us gives its depth (DeLaney and others, 2010). The colours are a legend, not what an eye would see. Model: NASA/CXC/MIT/T. Delaney and others. Not yet reviewed by an astronomer.',
    },
    // Rows under "Distance found by" on the card (ui/cardfacts.js, stage c's `rows` hook).
    rows: {
      'dso-cassiopeia-a': [
        ['Green', 'Iron, seen in X-rays by the Chandra telescope. Measured places.'],
        ['Yellow', 'Argon and silicon, seen in X-rays and in infrared light, with the two jets and the outer knots seen in visible light. Measured places.'],
        ['Red', 'Cold silicon in the middle, seen in infrared light by the Spitzer telescope: debris the inward shock has not yet heated. Measured places.'],
        ['Blue shell', 'The outer blast wave, 153 arcseconds from the centre. Modelled: a plain sphere of the measured size, a stand-in for the real filaments, as in Chandra’s own model.'],
        ['White point', 'The neutron star the explosion left. Its place on the sky is measured; its depth is not.'],
        ['How its depth is known', 'The debris has flown straight out from one point since the explosion, so gas moving toward us is in front of that point and gas moving away is behind it: every 1 000 km/s is 22 arcseconds of depth.'],
        ['It grows', 'On the clock, each part at its own measured rate: 0.3 % a year for the free debris, 0.2 % for the slowed X-ray gas, about 4 900 km/s for the blast wave. Before 1671 it is not drawn.'],
        ['Brightness', 'Not in the model. Every point of one colour is equally bright, and its size is the sharpness of the data, not the size of a clump.'],
        ['3D model', 'NASA/CXC/MIT/T. Delaney and others, from the Chandra X-ray Center’s files. Thinned to 24 219 points.'],
        ['Review', 'This drawing has not yet been reviewed by an astronomer.'],
      ],
    },
    // "How astronomers reconstructed its 3D form": two sentences, sourced, for a card disclosure or a trip.
    how: 'Each chemical element glows at its own colours, and gas moving toward us or away shifts them, so a telescope that splits the light finds how fast each patch of iron, silicon or argon moves along our line. Because all of it left one point about 350 years ago, that speed is also a distance in front of that point or behind it: Chandra’s X-rays and Spitzer’s infrared light together gave the first 3D map of an exploded star (DeLaney and others, 2010).',
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

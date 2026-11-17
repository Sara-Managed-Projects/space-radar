// The words of the deep-space objects built from published 3D data (the deep-space review of 2026-11-16): the
// Homunculus Nebula round Eta Carinae (scene/deep/homunculus.js), Cassiopeia A (scene/deep/casa.js), SN 1987A's rings
// (scene/deep/sn1987a.js), the Vela pulsar wind nebula (scene/deep/vela.js) and the Cat's Eye (scene/deep/catseye.js).
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
  deepSn1987a: {
    // The hero's own source, after the honesty line.
    card: {
      sn1987a: 'The rings are drawn at the sizes and tilts astronomers measured from the light echoes of the explosion and the rings’ own motion (Sugerman and others, 2005; Panagia, 2003; Tziamtzis and others, 2011). The points that mark them and the colours are illustrative. Not yet reviewed by an astronomer.',
    },
    // Rows under "Distance found by" on the card (ui/cardfacts.js, stage c's `rows` hook).
    rows: {
      'dso-sn-1987a': [
        ['Equatorial ring', 'Measured. About 0.8 arcseconds in radius, which at 51.4 thousand parsecs is about two-thirds of a light-year, tilted 43° from face-on with its north edge nearest us (Panagia, 2003; Sugerman and others, 2005).'],
        ['Outer rings', 'Measured. Two larger rings, about 1.4 and 1.6 light-years in radius, one on each side of the star’s plane, tilted about 45° and 38° (Sugerman and others, 2005; Tziamtzis and others, 2011). The southern one is not exactly an ellipse.'],
        ['How far away', 'The delay of the inner ring’s glow after the explosion gives its true size; its size on the sky then gives the distance to the supernova: 51.4 ± 1.2 thousand parsecs (Panagia, 2003).'],
        ['Not drawn', 'The ring’s bright knots, the debris inside it, the larger nebulae farther out, and the ring’s slow growth (about 10 km/s).'],
        ['Points and colours', 'Illustrative. Each ring is drawn as a plane ellipse of points; the warm and pale-blue colours only tell the rings apart.'],
        ['Review', 'This drawing has not yet been reviewed by an astronomer.'],
      ],
    },
    // "How astronomers placed the rings": sourced, for a card disclosure or a trip.
    how: 'The explosion’s flash lit the rings, and its glow reached us later from the ring’s far side than from its near side. That delay gives the ring’s real size, and the size it covers on the sky gives the distance. The outer rings are placed from echoes of the flash off nearby gas (Sugerman and others, 2005).',
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
  deepVela: {
    // The hero's own source, after the honesty line.
    card: {
      vela: 'Two rings of X-ray light and a pair of jets, drawn from the geometry fitted to Chandra’s picture (Ng and Romani, 2004 and 2008). The jets’ length and which end of the axis is nearer are modelled; the colour is illustrative. Not yet reviewed by an astronomer.',
    },
    rows: {
      'dso-vela-pulsar-wind-nebula': [
        ['The two rings', 'Measured. Fitted to Chandra’s X-ray picture: each ring 21.25 arcseconds in radius, the spin axis tilted 63.6° from our line of sight and at position angle 130.6° on the sky, the rings 11.61 arcseconds apart as we see them (Ng and Romani, 2004, 2008).'],
        ['Why one side is brighter', 'Measured. The flow along each ring moves at 0.44 of the speed of light, which brightens the side coming toward the camera; the pattern changes as the view turns.'],
        ['The jets', 'Their speed is measured (0.45 of light’s). Their length and brightness are modelled: the real jet bends and changes from year to year.'],
        ['Which end is near', 'Modelled. The papers do not say which end of the axis points toward us.'],
        ['Colour', 'Illustrative. X-rays are not light an eye sees; they are drawn violet-blue.'],
        ['Review', 'This drawing has not yet been reviewed by an astronomer.'],
      ],
    },
  },
  deepCatsEye: {
    // The hero's own source, after the honesty line.
    card: {
      catseye: 'Its parts, angles and speeds come from a published 3D model (Clairmont, Steffen and Koning, 2022); the sizes are read off Hubble’s picture. The colours are illustrative. Not yet reviewed by an astronomer.',
    },
    rows: {
      'dso-cats-eye-nebula': [
        ['Its parts', 'Measured. An egg-shaped inner shell inside an outer shell of two round lobes, a ring round the waist, two clumps on the axis and two jets: a model fitted to Hubble’s picture and five maps of the gas’s speed (Clairmont and others, 2022).'],
        ['The two partial rings', 'Measured. Each is the base of a cone 38° from the axis, leaning 17°, open over 300° of its turn: the trace of a jet that wobbled and never finished one circle. Where each gap lies is modelled.'],
        ['Speeds', 'Measured. Everything moves straight out: the outer shell at 25 to 33.5 km/s, the waist ring at 24, the clumps at 44, the jets at 72. The model’s age is 2 136 years, at 4 272 light-years (Gaia).'],
        ['Sizes and axis', 'Read off Hubble’s picture by Space Radar, to about a tenth: the paper shows its model in pictures, not in a table.'],
        ['Tilt', 'Modelled. The paper says only that the axis is slightly tilted; it is drawn 80° from our line of sight, the north end toward us.'],
        ['Colour', 'Illustrative. Hubble’s false colour, which the model does not have. The Measured look shows grey.'],
        ['Review', 'This drawing has not yet been reviewed by an astronomer.'],
      ],
    },
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

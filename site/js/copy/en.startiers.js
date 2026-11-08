// The words of release 2.0.0 batch f10-stars3d: the 3D star map's AT-HYG tier (scene/stars3dtiles.js, forge #140).
// ADDED TO THE SAME `COPY` OBJECT as copy/en.later.js's sections, and imported by that lazy module only: a first visit
// does not fetch them.
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  starTiers: {
    // A star AT-HYG numbers itself (no Tycho-2 number): its card's name.
    unnamed: 'An unnamed star (AT-HYG {n})',
    // The card's source line. {dist} is one of `from` below.
    cite: 'AT-HYG v4.0 (CC BY-SA 4.0, David Nash): Tycho-2’s place and brightness, {dist} distance',
    from: {
      'gaia-dr3': 'Gaia DR3’s',
      'gaia-dr2': 'Gaia DR2’s',
      hipparcos: 'Hipparcos’s',
      gliese: 'the Gliese catalogue’s',
      other: 'an older catalogue’s',
    },
    // The card's honesty line: what is known of the distance's error.
    error: 'Distance good to about ±{pct} % (parallax over its error about {poe}): modelled from the mission’s typical error at this brightness ({mas} milliarcseconds), because AT-HYG does not carry this star’s own error',
    noError: 'AT-HYG gives no error for this distance',
    guess: 'This distance is a guess: past 3 kpc (about 10 000 light-years) a parallax is a few tenths of a milliarcsecond, and the star’s own error is not in AT-HYG, which only keeps a parallax larger than its error',
    // What to show, under the device's tier line.
    lineHyg: 'Stars in 3D: HYG’s 109 389.',
    lineAthyg: 'Stars in 3D: HYG’s 109 389 and AT-HYG’s {n} million, fetched round the camera on a rung of the ladder (up to {k} million at once).',
    why: { low: 'Low quality draws HYG only.', latched: 'The frame rate was low: HYG only.', saver: 'Data saver: HYG only.', none: '' },
    gaiaHeld: 'Gaia DR3 is not a tier: ESA licenses its archive’s data for non-commercial use only (CC BY-NC 3.0 IGO).',
    // The line under the time bar while the stars are moved (scene/stardeep.js).
    farTime: 'The AT-HYG stars are drawn at today’s date only: the far-time view uses HYG only.',
  },
});

// The section this file added, in the visitor's language when a translation has it (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

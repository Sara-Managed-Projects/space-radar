// The words of a constellation seen from the side (ui/figureside.js; registry/sideviews.yaml; the 2026-11-16
// deep-space review, idea 6): the button on a figure's story card, the row in the search field, and the panel.
// ADDED TO THE SAME `COPY` OBJECT as copy/en.later.js's sections, and imported by those lazy modules only: a first
// visit does not fetch them.
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  figureSide: {
    // ui/skystory.js: the button under a western figure's story; {name} is the figure.
    open: 'See it from the side',
    openTitle: 'Leave the Sun and watch {name} come apart',
    // ui/searchrows.js: a row of the search field for each figure of registry/sideviews.yaml.
    searchRow: '{name} from the side',
    searchSub: 'Leave the Sun and watch the figure come apart',
    // The panel. {name} is the figure.
    title: '{name} from the side',
    loading: 'Fetching the stars’ distances…',
    lede: 'From the Sun these stars make one figure. Each is at its own distance, so from the side the figure comes apart.',
    angle: 'How far round to the side',
    // The line under the slider and its spoken value: {deg} degrees off our line of sight, {ly} light-years from the Sun.
    where: '{deg}° to the side, {ly} light-years from the Sun',
    home: 'At the Sun: the figure as we see it',
    // {near} and {far}: the nearest and the farthest corner star, in light-years.
    range: 'Its stars are {near} to {far} light-years away.',
    play: 'Fly out',
    playTitle: 'Leave the Sun and swing round to the side, in twenty seconds',
    pause: 'Pause',
    // Under reduced motion nothing flies: the same button goes there at once.
    jump: 'Go to the side',
    back: 'Back to the Sun',
    another: 'Another figure',
    honest: 'Measured: where each star is, from its parallax (Hipparcos and Gaia, HYG catalogue); the farthest are the least certain. Tradition: the lines between them.',
    // {n} corners of the figure are not a star of the 3D catalogue.
    unplaced: '{n} of its corners have no star with a measured distance: they are drawn at the figure’s middle distance.',
    close: 'Close the side view',
    unknown: 'No star figure by that name is drawn here.',
    inTrip: 'Leave the trip first to see a figure from the side.',
    failed: 'The stars’ distances did not load. Try again in a moment.',
    // An asterism's name (registry/sideviews.yaml `asterism.name`).
    names: {
      bigDipper: 'Big Dipper',
    },
    // One more sentence about a figure, where its source gives one (registry/sideviews.yaml `asterism.note`).
    notes: {
      bigDipper: 'Five of its seven stars do travel together, about 80 light-years away. The two at the ends, Dubhe and Alkaid, do not.',
    },
  },
});
// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

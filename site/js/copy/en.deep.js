// The words of release 2.0.0 batch c2-deep: the 3D stars over deep time (scene/stardeep.js, forge #141), the variable
// stars worth going out for (sky/varevents.js, forge #142), the black holes held against the EHT's pictures
// (ui/holespin.js, forge #149) and the cards read in the trips' voice (ui/wikicard.js, forge #151).
// ADDED TO THE SAME `COPY` OBJECT as copy/en.later.js's sections, and imported by those lazy modules only: a first visit
// does not fetch them.
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  // scene/stardeep.js: the line under the time bar while the 3D stars are moved.
  starDeep: {
    moved: 'The stars of {year}: each moved by its own measured motion (Hipparcos and Gaia, through HYG); carrying them in straight lines for so long is modelled.',
    hidden: 'Stars with no measured motion are not drawn this far from now.',
  },

  // sky/varevents.js rows, in Coming up and in Tonight.
  varEvents: {
    min: '{name} at minimum',
    max: '{name} near its brightest',
    minLine: 'Down to magnitude {mag}, {alt}° up in the {dir}.',
    maxLine: 'About magnitude {mag}, {alt}° up in the {dir}.',
    minClass: 'Timed from its measured minima (Kreiner 2004), carried forward by its period: about right to the quarter hour.',
    maxClass: 'Modelled from the catalogue’s period and epoch: a Mira’s maxima come weeks early or late.',
    aria: '{title}, {when}. {line}',
  },

  // ui/holespin.js: a black hole held against the Event Horizon Telescope's pictures.
  holeCompare: {
    fromEarth: 'Seen from Earth',
    fromEarthTitle: 'Stand on the line from the hole to Earth, north up and east to the left, as the EHT pictures are printed',
    compare: 'Compare with the EHT picture',
    compareTitle: 'Show the Event Horizon Telescope’s picture beside the drawn hole, both seen from Earth with north up',
    hide: 'Hide the EHT picture',
    caption: 'EHT, {date}',
    orient: 'North up, east to the left, as the hole is drawn now.',
    credit: 'Pictures: EHT Collaboration, CC BY 4.0.',
    source: 'Source',
    alt: 'The Event Horizon Telescope’s picture of {name}, {date}: an orange ring of light round a dark centre.',
    brightest: 'Seen from Earth with north up, the drawn ring is brightest at a position angle of about {ours}° (measured on the drawing); the EHT’s picture of {date} is brightest at about {theirs}°.',
    approx: {
      'm87-star': 'Matched: the tilt (17° from our line of sight) and the jet’s angle on the sky (288°) are measured (Walker et al. 2018), and with the flow turning clockwise (EHT 2019, paper V) the approaching, brighter side falls in the south. Approximated: the light is traced as round a hole that does not spin and the gas is a thin disc, not the hot, thick flow of the EHT’s models, so our bright side is about one and a half times as bright as the faint one where theirs is about four times (2017) to six times (2018); and our picture is sharp where theirs is blurred to 20 µas by a telescope the size of the Earth. Their bright spot moved about 30° in a year; ours does not move.',
      'sgr-a-star': 'Matched: seen 30° from its axis, as the best-fitting models of EHT 2022 paper V are, turning clockwise as the GRAVITY flares do. Chosen: where the axis points on the sky, which nobody has measured; it is turned so the brighter side lands where the EHT picture is brightest. Approximated: the light is traced round a hole that does not spin, round a thin disc; the EHT picture is an average over a night of a flow that changes within minutes, and its three bright knots are not all real, its makers say.',
    },
  },

  // ui/wikicard.js: Read aloud in the trips' voice.
  cardVoice: {
    readTitle: 'Read this card aloud: the quoted Wikipedia text in the trips’ synthetic voice',
    credit: 'Voice: Kokoro-82M (af_heart), a synthetic voice, Apache-2.0; the words are Wikipedia’s (CC BY-SA 4.0).',
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

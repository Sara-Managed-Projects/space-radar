// The words of release 2.0.0 batch f6-learn: the daily challenges (ui/play.js, forge #160). ADDED TO THE SAME `COPY`
// OBJECT as copy/en.later.js's sections, and imported by ui/play.js only: nothing reads them before a `#play=` link
// is opened, so a first visit does not fetch them. A world's name is COPY.worlds (copy/en.js); a deep-sky object's is
// its catalogue name, as the map prints it.
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  play: {
    label: 'Daily challenge',
    close: 'Close',
    day: 'The puzzle of {day} (UTC), the same for everyone today.',
    games: {
      'find-earth': { title: 'Find Earth', blurb: 'From the galaxies down to our planet, in as few picks as you can.' },
      'which-world': { title: 'Which world is this?', blurb: 'A close-up of a real map: pick the world from four.' },
      'guess-distance': { title: 'Guess the distance', blurb: 'Slide to how many light-years away it is.' },
    },
    other: 'Other challenges',
    loading: 'The map is still loading; the challenge starts when it is ready.',
    // Find Earth: four rungs of the map's own ladder, each with four lettered marks on real objects.
    rung: 'Step {n} of {of}: {where}',
    rungs: { 'local-group': 'the Local Group', galaxy: 'the Milky Way', stellar: "the Sun's neighbourhood", sun: 'the Solar System' },
    ask: { 'local-group': 'Which mark is our galaxy, the Milky Way?', galaxy: 'Which mark is the Sun?', stellar: 'Which mark is the Sun?', sun: 'Which mark is the Earth?' },
    hints: {
      'local-group': 'Ours has two small companions close beside it, the Magellanic Clouds.',
      galaxy: 'The Sun is about 27,000 light-years from the black hole at the centre, out in a quiet arm.',
      stellar: 'The nearest stars to the Sun are dim red dwarfs and Alpha Centauri, 4.4 light-years away.',
      sun: 'The Earth is the third world out from the Sun.',
    },
    hint: 'Clue (costs a try)',
    mark: 'Mark {letter}, {where}',
    places: { tl: 'upper left', tc: 'top', tr: 'upper right', ml: 'left', mc: 'middle', mr: 'right', bl: 'lower left', bc: 'bottom', br: 'lower right' },
    milkyWay: 'the Milky Way',
    sunName: 'the Sun',
    tries: 'Pick {n} of {max}',
    wrong: 'Not that one: {letter} is {name}.',
    right: 'Yes, {name}. Zooming in.',
    found: 'You found the Earth in {n} picks.',
    lost: 'Out of picks. The Earth was the third world out.',
    honest: 'The marks sit where the map draws each object. On the Solar System step the worlds are drawn nearer than they are, as everywhere on that stage.',
    // Which world is this?
    round: 'Round {n} of {of}',
    worldAsk: 'Which world is this close-up of?',
    more: 'Show more of the map',
    worldRight: 'Yes: {name}.',
    worldWrong: 'No: it was {name}.',
    credit: 'Map: {credit}',
    worldPicture: 'A close-up of a real map of one world in the Solar System',
    // Guess the distance
    distAsk: 'How far away is {name}?',
    slider: 'Distance in light-years',
    guess: 'Guess',
    reveal: '{name} is {value} away: you were {off}.',
    offs: { hit: 'within a quarter', near: 'within two times', far: 'within five times', miss: 'more than five times off' },
    source: 'Distance: {source}',
    units: { ly: '{n} light-years', kly: '{n} thousand light-years', mly: '{n} million light-years', bly: '{n} billion light-years' },
    next: 'Next',
    // The end of a challenge
    scores: { 'find-earth': '{n} of 10 picks', 'which-world': '{n} of 3 worlds', 'guess-distance': '{n} of 3 within two times' },
    shareTitle: 'Space Radar: {game}',
    share: 'Share the result',
    copied: 'Copied. Paste it anywhere.',
    copyFailed: 'Could not copy: select the text above.',
    played: 'Done for today. A new one comes at midnight UTC.',
    streak: '{n} days in a row',
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

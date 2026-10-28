// The words of a Moment, a mission replayed as a 3D story (internal spec 0079, stage C1: site/js/moments/).
// ADDED TO THE SAME `COPY` OBJECT as copy/en.later.js's sections and imported by moments/player.js only, which is
// fetched for a `#moment=` link and never at boot, so a first visit carries none of it.
//
// TWO SECTIONS. `momentPlayer` is the player's own chrome (not `moments`, the doors of en.later.js). `momentStories` holds each story's words by moment id: its
// title and blurb, its chapters, captions, quotes and sources, under the keys its file in site/data/moments/ names
// (docs/MOMENTS.md). A story written later may bring its words in its own file beside this one and name it in its
// moment's `wordsFile`; the player imports that file before it plays.
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  momentPlayer: {
    micro: 'Moment',
    play: 'Play',
    pause: 'Pause',
    replay: 'Play again',
    close: 'Close the moment',
    chapters: 'Chapters',
    chaptersTitle: 'Jump to a chapter',
    share: 'Copy a link to this second',
    copied: 'Link copied',
    copyFailed: 'Copy this link: {url}',
    director: 'Director',
    directorTitle: 'Hand the camera back to the director',
    freeNote: 'Your camera. Drag to look round; Director hands it back.',
    scrubber: 'Mission time',
    met: 'Mission elapsed time',
    rateTitle: 'Time here runs {rate} as fast as it did',
    realTime: 'Real time',
    loading: 'Loading the moment…',
    missing: 'There is no moment called {id}.',
    unreachable: 'This moment did not load. It is saved on this device only after it has been opened once online.',
    modelMissing: 'The {model} model did not load; its path and its flames are still drawn.',
    chapterOf: 'Chapter {n} of {m}',
    quoteBy: '{who}, {at}',
    truthWords: {
      measured: 'Measured',
      reconstructed: 'Reconstructed',
      illustrative: 'Illustrative',
    },
    // The honesty line at the foot. `{path}` is the trajectory's own sentence from the story's words.
    truthLine: '{truth}: {path}',
    cutNote: 'Stages cut from one model until the split model arrives.',
    drawnNote: 'Flames, steam and parachutes are drawn, not measured.',
    groundNote: 'Ground near the pad illustrative; Earth map: Solar System Scope, CC BY 4.0.',
    keys: 'Space plays or pauses, arrows step, Escape closes',
  },

  momentStories: {
    // A short demonstration of the engine (internal spec 0079 C1): the first three minutes of Apollo 11's
    // Saturn V. The full Apollo 11 story is stage C6's.
    'demo-saturn': {
      title: 'Saturn V: ignition to staging',
      blurb: 'The first three minutes of Apollo 11, 16 July 1969, from the pad at Launch Complex 39A.',
      chIgnition: 'Ignition',
      chLiftoff: 'Lift-off',
      chClimb: 'Through max Q',
      chStaging: 'Staging',
      ignition: 'T−8.9 s: the ignition sequence starts the five F-1 engines, centre first, then the outboard pairs.',
      holddown: 'The hold-down arms keep the stack on the pad until all five engines are at full thrust.',
      liftoff: 'Lift-off, 13:32:00.6 UTC: five F-1s, some 33 800 kN, lifting nearly 3 000 tonnes.',
      tower: 'Clear of the tower, the stack rolls onto its flight azimuth, 72 degrees east of north.',
      maxq: 'Past the speed of sound a minute in; then max Q, the air pushing hardest: 35 kPa (735 lb/ft²).',
      ceco: 'T+135 s: the centre engine shuts down, to keep the acceleration under 4 g.',
      staging: 'T+161.7 s: the outboard engines cut off. Some 67 km up the S-IC falls away, its retro-rockets firing.',
      sii: 'T+163.0 s: the S-II\'s five J-2 engines light. Hydrogen burns pale and nearly clear.',
      interstage: 'The interstage ring drops away; at T+197.9 s the escape tower goes. Parking orbit is 8.5 minutes on.',
      pathAscent: 'event times from the Apollo 11 Mission Report; heights and distances between them approximate',
      sources: 'Apollo 11 Mission Report, NASA MSC-00171, 1969 (Table 3-I, sequence of events; section 7.1, launch)',
    },
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

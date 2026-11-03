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
    truthLine: '{truth}: {path}.',
    cutNote: 'Stages cut from one model for now.',
    drawnNote: 'Flames, steam, parachutes and the glow of an entry are drawn.',
    groundNoteMars: 'Ground near the site illustrative; Mars map Solar System Scope, CC BY 4.0.',
    groundNote: 'Ground near the pad illustrative; Earth map Solar System Scope, CC BY 4.0.',
    keys: 'Space plays or pauses, arrows step, Escape closes',
  },

  // Where a moment is offered (moments/shelf.js): the section of the Earth pane, and the card's one row.
  momentShelf: {
    title: 'Moments',
    note: 'Missions replayed on one clock, with the real event times. Paths are reconstructed and say so.',
    minutes: '{m} min',
    replay: 'Replay this moment',
    replayTitle: 'Replay {title} on the mission clock',
    replayNamed: 'Replay {title}',
    cards: {
      'apollo-11': { title: 'Apollo 11', when: '16 to 24 July 1969', blurb: 'Pad 39A to the Pacific by way of Tranquility Base: lift-off, the Moon, the landing, the ascent, home.' },
      'apollo-13': { title: 'Apollo 13', when: '11 to 17 April 1970', blurb: 'Pad 39A to the Pacific: the Moon landing that did not happen, an oxygen tank that burst, and the lunar module as the lifeboat.' },
      'artemis-ii': { title: 'Artemis II', when: '1 to 10 April 2026', blurb: 'Pad 39B to the Pacific off San Diego, round the far side of the Moon. What was flown is said to be, and what was planned.' },
      'sputnik-1': { title: 'Sputnik 1', when: '4 October 1957', blurb: 'Baikonur to a first lap of the Earth: the first artificial satellite, a polished sphere of 585 mm, and its beep.' },
      'voskhod-2': { title: 'Voskhod 2', when: '18 to 19 March 1965', blurb: 'Alexei Leonov steps out of an inflatable airlock into space for twelve minutes, and the crew land by hand in the taiga, far from their field.' },
      'sts-1': { title: 'STS-1', when: '12 to 14 April 1981', blurb: 'The first Space Shuttle: Columbia from pad 39A, the boosters and the tank, 54 hours in orbit and a glide onto the Edwards lakebed.' },
      'curiosity-edl': { title: 'Curiosity landing', when: '6 August 2012', blurb: 'The seven minutes from the top of the Martian air to Gale crater: the heat shield, the parachute, the rocket backpack and the sky crane, on JPL\'s own clock.' },
      'new-horizons-pluto': { title: 'New Horizons at Pluto', when: '14 July 2015', blurb: 'The first visit to Pluto: from six hours out to the pass at 13.8 km/s on JPL\'s own track, Pluto and Charon as discs, the crescent left behind.' },
      'vostok-1': { title: 'Vostok 1', when: '12 April 1961', blurb: 'Yuri Gagarin, once round the Earth in 108 minutes, from Baikonur to a field near Smelovka.' },
    },
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
      liftoff: 'Lift-off, 13:32:00.6 UTC: five F-1s, some 33 800 kN, lifting nearly 3 000 tonnes.',
      tower: 'Clear of the tower, the stack rolls onto its flight azimuth, 72 degrees east of north.',
      maxq: 'Past the speed of sound a minute in; then max Q, the air pushing hardest: 35 kPa (735 lb/ft²).',
      ceco: 'T+135 s: the centre engine shuts down, to keep the acceleration under 4 g.',
      staging: 'T+161.7 s: the outboard engines cut off. Some 67 km up the S-IC falls away, its retro-rockets firing.',
      sii: 'T+163.0 s: the S-II\'s five J-2 engines light. Hydrogen burns pale and nearly clear.',
      interstage: 'The interstage ring drops away; at T+197.9 s the escape tower goes. Parking orbit is 8.5 minutes on.',
      pathAscent: 'Apollo 11 Mission Report times, heights between them approximate',
      sources: 'Apollo 11 Mission Report, NASA MSC-00171, 1969 (Table 3-I, sequence of events; section 7.1, launch)',
    },
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

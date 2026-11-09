// The words of release 2.0.0 batch f7-ground: standing on a landing site (scene/groundstage.js, forge #146) and the sky
// from another world (forge #147). ADDED TO THE SAME `COPY` OBJECT as copy/en.later.js's sections, and imported by that
// module only: nothing reads them before `#ground=` or `#sky=` opens the stage, so a first visit does not fetch them.
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  // scene/groundstage.js: the stage, its card, its buttons and its sky panel.
  ground: {
    stageLabel: 'Standing on another world',
    tagGround: 'On the ground · {world}',
    tagSky: 'The sky from {world}',
    kindMeasured: 'measured ground',
    kindPlain: 'ground not measured',
    kindModelled: 'modelled',
    placeAt: '{world}, {lat}°, {lon}° east',
    worlds: { moon: 'the Moon', mars: 'Mars', titan: 'Titan', europa: 'Europa', earth: 'the Earth', 'proxima-b': 'Proxima Centauri b', 'trappist-1e': 'TRAPPIST-1 e' },
    measuredGround: 'Measured: the heights are the stereo terrain model at true scale, the ground is the orbiter\'s own picture (its shadows are the day it was taken). No boulder or crater is invented.',
    plainGround: 'The ground here is not drawn from measurements: a plain to the horizon. The sky is computed.',
    modelLine: 'At the landing coordinates: {what}. Which way it faces is not from an image.',
    timeLine: '{local} local solar time · {utc} · the Sun {sun}°',
    timeLineStar: '{utc} · {star} {sun}° up, where it always is',
    drive: 'Drive the rover',
    walk: 'Walk',
    driving: 'Driving, about {x} times faster than the rover can go.',
    walking: 'Walking.',
    skyOpen: 'The sky',
    skyClose: 'Hide the sky',
    leave: 'Leave',
    sources: 'Sources and licences',
    padLabel: 'Walk: push the thumb the way to go',
    keys: 'W A S D or the arrows to walk, Q and E to turn, R and F to look up and down, Shift to run, + and - to zoom, Esc to leave.',
    // 2.0.1: driving said where it can be seen.
    padDrive: 'Drive: push the thumb up to go, down to back up, to the side to steer',
    keysDrive: 'W or the up arrow to drive, S or down to back up, A and D or the side arrows to steer, R and F to look up and down, Shift for speed, Esc to leave.',
    howtoKeys: 'You are driving. W or ↑ to go, S or ↓ to back up, A and D or ← and → to steer. Drag to look around.',
    howtoTouch: 'You are driving. Push the round pad up to go, down to back up, to the side to steer. Drag the sky to look around.',
    driveHint: 'This rover can be driven: press Drive the rover.',
    tripDriveTitle: 'Leave the trip here and drive this rover',
    skyTitle: 'This sky',
    poleStar: 'Pole star: {name}, {sep}° from the pole (magnitude {mag}).',
    noPoleStar: 'No star brighter than magnitude 4.5 within 10° of this world\'s pole.',
    unnamedStar: 'a star with no common name',
    poleLabel: '{name} (pole star)',
    rises: '{name} rises at {local} local solar time ({utc}).',
    sets: '{name} sets at {local} local solar time ({utc}).',
    neverSets: '{name} neither rises nor sets from here: it hangs in the same part of the sky.',
    notToday: '{name} neither rises nor sets in the time searched.',
    transit: '{front} crosses the face of the Sun at {local} local solar time ({utc}), for {s} seconds.',
    noTransit: 'No crossing of the Sun by Phobos or Deimos from here in the next {days} sols.',
    working: 'Working out the rises and sets…',
    earthNow: 'The Earth: {alt}° up, bearing {az}°, {lit} % lit, magnitude {mag}.',
    airNotes: {
      mars: 'Measured colours: the day sky from Spirit\'s true-colour panorama (PIA07882), the blue sunset from Curiosity\'s in Gale (PIA19400).',
      moon: 'No air, so the sky is black at noon. A real eye, dazzled by the sunlit ground, would see few of these stars.',
      europa: 'No air, so the sky is black at noon. Jupiter hangs still in the sky of the side that faces it.',
      titan: 'Illustrative colour: the orange haze hides the stars and Saturn from the eye; they are drawn faint where they are.',
      earth: '',
      'proxima-b': 'Modelled: Proxima b is assumed to keep one face to its star, as its discoverers expect (Anglada-Escudé et al. 2016); its orbit\'s tilt and where it and Proxima d are along their orbits are not known, so they are assumed. The sky\'s colour is illustrative: nobody knows if it has air. Alpha Centauri A and B are where they are; the other stars are drawn as the Sun sees them.',
      'trappist-1e': 'Modelled: TRAPPIST-1 e is assumed to keep one face to its star (Gillon et al. 2017); its sister planets are where their measured transit times put them, on circular orbits in one plane turned an assumed way about our line of sight. The sky\'s colour is illustrative: nobody knows if it has air. The other stars are drawn as the Sun sees them.',
    },
    parentNote: 'This moon keeps one face to its planet, so the planet neither rises nor sets.',
    starNote: 'This planet is assumed to keep one face to its star, so the star neither rises nor sets.',
    discNote: 'The Sun, the Earth, Phobos and the other wide bodies are discs of their true size and phase in plain colours, not their maps or shapes.',
    frameNote: 'Rotation: the IAU WGCCRE 2015 report (Archinal et al. 2018). Positions: the app\'s own ephemeris.',
    compass: { N: 'N', E: 'E', S: 'S', W: 'W' },
    bodies: {
      sun: 'The Sun', mercury: 'Mercury', venus: 'Venus', earth: 'The Earth', moon: 'The Moon', mars: 'Mars', phobos: 'Phobos',
      deimos: 'Deimos', jupiter: 'Jupiter', io: 'Io', europa: 'Europa', ganymede: 'Ganymede', callisto: 'Callisto', saturn: 'Saturn',
      titan: 'Titan', uranus: 'Uranus', neptune: 'Neptune',
      proxima: 'Proxima Centauri', 'proxima-d': 'Proxima d', 'alpha-cen-a': 'Alpha Centauri A', 'alpha-cen-b': 'Alpha Centauri B',
      'trappist-1': 'TRAPPIST-1', 'trappist-1b': 'TRAPPIST-1 b', 'trappist-1c': 'TRAPPIST-1 c', 'trappist-1d': 'TRAPPIST-1 d',
      'trappist-1f': 'TRAPPIST-1 f', 'trappist-1g': 'TRAPPIST-1 g', 'trappist-1h': 'TRAPPIST-1 h',
    },
    earthAndMoon: 'The Earth and the Moon',
    unknownGround: 'There is no terrain model for that site yet.',
    unknownSky: 'That place is not one this map can stand on yet: the Moon, Mars, Titan, Europa, Proxima b or TRAPPIST-1 e.',
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));

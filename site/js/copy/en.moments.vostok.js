// The words of the Moment `vostok-1` (internal spec 0079 C5): Yuri Gagarin's flight of 12 April 1961. Named by the
// moment's `wordsFile`; imported by moments/player.js only, never at boot. Times are the ones the Soviet reports
// and the standard accounts give (to the minute; a few to the second): see the sources and the path's own sentence.
// The radio exchange is captions, not sound: no recording with a clear licence was found.
import { COPY } from './en.js';
import './en.moments.js';

Object.assign(COPY.momentStories, {
  'vostok-1': {
    title: 'Vostok 1: the first person in space',
    blurb: 'Yuri Gagarin, 12 April 1961: from Baikonur once round the Earth to a field near Smelovka, on the mission clock, in 108 minutes.',
    chPad: 'Gagarin\'s Start',
    chAscent: 'Ascent',
    chOrbit: 'One orbit',
    chRetro: 'Retrofire',
    chEntry: 'Entry',
    chEject: 'Ejection',
    chLand: 'Landing',
    ready: 'Baikonur, Site 1, 06:07 UTC. Yuri Gagarin, 27, is in the capsule on top of the R-7 rocket.',
    korolev: 'Sergei Korolev on the radio: “Preliminary stage… intermediate… main… lift-off!”',
    liftoff: 'Lift-off. Gagarin: “Poyekhali!”, “Let\'s go!”',
    boosters: 'T+119 s: the four strap-on boosters burn out and fall away.',
    shroud: 'T+156 s: the shroud over the capsule is jettisoned.',
    core: 'T+300 s: the core stage is spent and falls away; the last stage lights.',
    earth: 'About T+6 min, Gagarin: “I can see the Earth. The visibility is good.”',
    kosberg: 'About T+10 min the last stage shuts down. Gagarin: “Kosberg has worked!”, after the designer of its engine.',
    orbit: 'In orbit: 181 by 327 km, tilted 64.95 degrees to the equator, 89.1 minutes a lap. The capsule separates from the stage.',
    retro: 'T+1 h 18 min, over the west coast of Africa: the retro-rocket fires for about 42 seconds. Its time and place are published; its size here is fitted to the landing.',
    wires: 'The instrument module should part ten seconds after retrofire. A bundle of wires holds it; the two tumble together into the air.',
    entry: 'The wires burn through and the sphere settles heat shield first. Gagarin later reported more than 10 g.',
    eject: 'At 7 km the hatch is blown off and the seat fires Gagarin out. Vostok\'s sphere landed too hard for a person inside it.',
    chutes: 'At 2.5 km the capsule\'s main canopy opens, 27 m across; the pilot\'s own canopy opened almost at once. The seat falls free.',
    landing: 'T+1 h 48 min: Gagarin lands 26 km south-west of Engels, Saratov Oblast, 108 minutes after the launch. Sources differ by ten minutes on the landing.',
    pathAscent: 'the climb is the published event times joined by smooth curves; heights and distances between them are ours',
    pathOrbit: 'the orbit, the retrofire and the entry are two-body arcs fitted to the published times and the landing field, not tracking data',
    pathPilot: 'the descent under the pilot\'s canopy is drawn; no source gives the distance to the capsule',
    srcWiki: 'Wikipedia, Vostok 1 (event times, orbit, quotations; read 2 November 2026)',
    srcNssdc: 'NASA NSSDCA, Vostok 1 (orbit, spacecraft)',
  },
});

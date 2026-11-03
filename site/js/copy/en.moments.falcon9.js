// The words of the Moment `falcon9-og2-2` (internal #1058 and #867, release 1.7.6): Falcon 9 flight 20, ORBCOMM OG2 Mission 2, 22 December 2015 UTC, and the first landing of
// its first stage on Landing Zone 1. Named by the moment's `wordsFile`; imported by moments/player.js only, never at boot. The event times are the published ones (SpaceX's press
// kit and Spaceflight101's reconstruction of the webcast); what is ours is said in the caption where it is shown. Another Falcon 9 flight made with
// tools/moments-build/falcon9-flight.mjs has the same keys in a file of its own.
import { COPY } from './en.js';
import './en.moments.js';
import { HOOK } from './lang.js';

Object.assign(COPY.momentStories, {
  'falcon9-og2-2': {
    title: 'The first Falcon 9 landing',
    blurb: 'Cape Canaveral, 21 December 2015: Falcon 9 flight 20 lifts 11 ORBCOMM satellites away and its first stage comes back to Landing Zone 1, the first landing of an orbital rocket\'s first stage.',
    chPad: 'Launch Complex 40',
    chAscent: 'Lift-off',
    chSep: 'Cut-off and separation',
    chReturn: 'Boostback',
    chEntry: 'The way down',
    chLanding: 'Landing Zone 1',
    ready: 'T−10 s, Space Launch Complex 40, Cape Canaveral, 8:29 p.m. on 21 December 2015: Falcon 9 Full Thrust, 70 m tall, on its first flight, carrying 11 ORBCOMM satellites. It is night; the rocket is drawn in a lamp\'s light of ours. SpaceX calls the landing "a secondary test objective".',
    ignition: 'T−3 s: the nine Merlin engines of the first stage start.',
    liftoff: 'Lift-off at 01:29:00 UTC on 22 December. The first stage is 41 m of the 70.',
    mach1: 'T+1:05: Mach 1, as the reconstruction of the webcast has it.',
    maxq: 'T+1:13: max Q, the moment the air presses hardest; the engines were throttled back for it.',
    meco: 'T+2:23: main engine cut-off at 75 km and 1.67 km/s (the reconstruction of the webcast; SpaceX had planned T+2:20). The rocket is going nearly straight up, a steep climb that is ours to draw.',
    sep: 'T+2:25: the stages separate. The first stage turns tail-first on its cold-gas thrusters, which is drawn over about half a minute; how long it took is ours.',
    s2: 'T+2:34: the second stage\'s vacuum engine lights and it pulls away. Its path is drawn only a little way, and is ours.',
    fairing: 'T+2:48: the two halves of the fairing, 5.2 m across, are let go.',
    boostback: 'T+3:47: three of the first stage\'s engines light for the boostback burn, which turns its path round toward the Cape. How long they burn is ours: about 35 seconds in this drawing.',
    fins: 'The four grid fins swing out to steer the stage through the air. When they did is ours.',
    coast: 'The stage coasts over the top, about 190 km up in this drawing (ours), and starts down.',
    entry: 'T+8:01: three engines light again for the entry burn, to slow the stage before the thick air.',
    entryEnd: 'T+8:21: the entry burn is over. Falling through the air, the stage steers by its fins.',
    landingBurn: 'T+9:11: one engine lights for the landing burn, which has to stop the stage on the pad. It lasts 33 seconds.',
    legs: 'The four landing legs, folded up the side for the flight, swing down a few seconds before touchdown. When is ours.',
    touch: 'T+9:44, 01:38:44 UTC: the first stage stands on Landing Zone 1, a round pad 86 m across with a cross on it, some 9 km south of the pad it left. No first stage of an orbital rocket had landed before.',
    sats: 'Meanwhile the second stage deploys the 11 satellites, from T+14:26 to T+19:05 (not drawn), and then relights its engine to show it can, for a later flight.',
    pathAscent: 'the published event times, and the published height and speed at main engine cut-off, with the climb between them ours; the rocket flew in the dark and is drawn lit by a lamp',
    pathBooster: 'the published burn times and the landing place, with the arc, its speeds and the boostback\'s length flown by us as a point mass; drawn lit by a lamp',
    pathStage2: 'the second stage from separation, pushed on by us along the way it was going; it stops where the picture does',
    srcKit: 'SpaceX, ORBCOMM-2 Mission press kit, 21 December 2015 (the plan: the times, the burns, the landing as a secondary test objective)',
    srcRecon: 'Spaceflight101, "Reconstruction: Milestone Falcon 9 Flight with eleven OG2 Satellites" (the event times from the webcast, MECO at 75 km and 1.67 km/s)',
    srcWiki: 'Falcon 9 flight 20, Wikipedia (the launch time, the payload, the relight of the second stage)',
    srcLz: 'Landing Zones 1 and 2, Wikipedia (the place, and the 282 ft pads marked with an X)',
  },
});

// The story's words in the visitor's language when a translation has them (copy/lang.js; the other sections are localised by en.moments.js).
if (HOOK.localise) HOOK.localise({ COPY }, ['momentStories']);

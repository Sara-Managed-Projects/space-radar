// The words of the Moment `sts-1` (internal #1058, release 1.7.1): the first Space Shuttle flight, 12 to 14 April 1981. Named by the moment's
// `wordsFile`; imported by moments/player.js only, never at boot. Every time is the published one (Wikipedia, "STS-1", from NASA's mission
// documents); the sources say so. What is ours is said in the caption where it is shown.
import { COPY } from './en.js';
import './en.moments.js';
import { HOOK } from './lang.js';

Object.assign(COPY.momentStories, {
  'sts-1': {
    title: 'STS-1: Columbia\'s first flight',
    blurb: 'Kennedy, 12 April 1981: John Young and Robert Crippen take the first Space Shuttle from Launch Complex 39A to orbit and, 54 hours later, glide it onto the lakebed at Edwards.',
    chPad: 'Launch Complex 39A',
    chAscent: 'Lift-off',
    chSrb: 'The boosters',
    chMeco: 'Main engines off',
    chOrbit: 'Orbit',
    chHome: 'The way home',
    chEntry: 'Entry',
    chLand: 'Runway 23',
    ready: 'T−10 s at Launch Complex 39A, Kennedy Space Center: Columbia, a white external tank and two solid rocket boosters. 12:00:04 UTC on 12 April 1981, twenty years to the day after Vostok 1. STS-1 and STS-2 flew the tank painted white.',
    ignition: 'T−6.6 s: the three main engines start, and the whole stack rocks forward, towards the crew\'s feet, and back.',
    liftoff: 'Lift-off: the boosters light as the stack comes back to the vertical. Crippen likened it to a steam catapult. The pad is drawn plain and the flame trench is ours.',
    roll: 'Clear of the tower, the stack rolls to its heading, 067 degrees, and pitches heads-down, the orbiter under the tank, to spare its wings. (Drawn already on the heading.)',
    maxq: 'T+56 s: Max Q, at Mach 1.06 and 29 kPa. The main engines have been throttled back to 65 percent to get through it.',
    srb: 'T+2 min 12 s: the boosters, which performed better than expected, are let go at 53 km, 2.8 km higher than planned. They fall into the Atlantic on parachutes.',
    meco: 'T+8 min 34 s: main engine cut-off at 118 km.',
    tank: '18 seconds later the external tank is let go. It breaks up in the air and falls into the Indian Ocean.',
    oms1: 'T+10 min 34 s: the first OMS burn, 86 seconds, with the two engines in the orbiter\'s tail pods (not drawn: the flame is nearly invisible).',
    oms2: 'T+44 min 2 s: the second burn, 75 seconds, at the top of the climb: 246 by 248 km, 40.3 degrees, 89.9 minutes. The clock of the apogee is the report\'s; the path to it is ours.',
    doors: 'The payload bay doors open to let the radiators work, before the end of the second orbit or the crew would have had to come home. The clock is ours. They see tiles lost from the OMS pods on the television.',
    oms3: 'T+6 h 20 min 46 s and 7 h 05 min 32 s: two single-engine burns raise the orbit to 274 km. The crew spend about 53 hours in orbit testing the machine.',
    wake: 'Day 3: breakfast, stowing, the ejection suits, and the bay doors shut for entry. Young and Crippen strap in. Their orbit has made 35 laps.',
    deorbit: 'In the 36th orbit, over the southern Indian Ocean, a 160-second burn of both OMS engines. Its clock and place are ours, about 55 minutes before the field. Young pitches Columbia up to the nose-high entry attitude.',
    entry: 'Entry interface at 120 km, some 8 110 km from the field at 28 240 km/h. The angle of attack is 40 degrees until the worst of the heating is over. This reconstruction puts the interface over the western Pacific; the report says the eastern.',
    blackout: 'A pink glow at 100 km; both men lower their visors. About 21 minutes without radio, 16 of them for the ionised air. Most of the entry is flown by the computers, with roll reversals at Mach 18.5 and 9.8.',
    bigsur: 'The California coast near Big Sur at Mach 7 and 41 km. Columbia has flown 583 km across its orbit\'s track to reach the field, which is drawn.',
    hac: 'Young takes the controls. Mach 4.8 and 2.8 reversals done, a wide left turn onto the lakebed runway 23, a T-38 chase plane joining. The size of the turn is ours.',
    touch: 'T+54 h 20 m 53 s, 18:20:57 UTC: the main gear touch down at 339 km/h, slower and about 800 m further down the runway than planned, at Edwards, runway 23. The gear\'s lowering is drawn a few seconds before.',
    stop: 'Young: "This is the world\'s greatest all-electric flying machine. I\'ll tell you that. That was super!" 36 orbits, 1 729 348 km, 2 days 6 hours 20 minutes 53 seconds.',
    pathAscent: 'the published event times and heights, with the distances between them approximate',
    pathOrbit: 'the published burns and orbits joined by arcs, the deorbit burn, entry and the approach drawn between; the clocks and places we chose are said in the captions',
    srcWiki: 'STS-1, Wikipedia (event times and heights, the orbits, the burns, the entry and the landing), from NASA\'s mission documents',
    srcNssdc: 'STS-1 Columbia, NASA NSSDCA Master Catalog (launch and landing)',
  },
});

// The story's words in the visitor's language when a translation has them (copy/lang.js; the other sections are localised by en.moments.js).
if (HOOK.localise) HOOK.localise({ COPY }, ['momentStories']);

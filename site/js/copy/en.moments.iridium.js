// The words of the Moment `iridium-cosmos-2009` (research train (ops), forge internal #561): the first accidental collision of two
// whole satellites, Iridium 33 and Kosmos 2251, on 10 February 2009, and the two clouds it made. Named by the moment's `wordsFile`;
// imported by moments/player.js only, never at boot. Written by hand; scripts/build_moment_iridium_cosmos.py writes the moment.
//
// MEASURED AND MODELLED. Every number in a caption is measured and the caption names where it is from: the second and the predicted
// miss are CelesTrak's analysis of the collision (https://celestrak.org/events/collision/), as are the dry masses and the counts of June
// 2012; the height is NASA's Orbital Debris Quarterly News 13(2); the peninsula and Kosmos 2251's years of service are Jonathan's Space
// Report 606; the closing speed is the figure Wikipedia's article gives from the press of the day; today's counts are CelesTrak's
// satellite catalogue (SATCAT) read on 2026-11-23, which is the pieces files' own count. The paths, the point on the peninsula and the
// PICTURE of the spread are modelled, and `pathIridium`, `pathKosmos` and `cloudNote`, on the player's foot line, say how.
// No voice is rendered for this story: the captions are read, and the pace gives each chapter time for it.
import { COPY } from './en.js';
import './en.moments.js';
import { HOOK } from './lang.js';

Object.assign(COPY.momentStories, {
  'iridium-cosmos-2009': {
    title: '2009: Iridium 33 and Kosmos 2251',
    blurb: 'Two satellites meet by accident 789 km over Siberia, and each becomes a cloud of pieces that still circles the Earth.',
    chBefore: 'Two satellites',
    chClose: 'Closing in',
    chHit: 'The collision',
    chRing: 'Two rings',
    chDays: 'Days',
    chFan: 'Fanning out',
    chShell: 'Three years on',
    chToday: 'Today',
    c1a: '10 February 2009, a quarter of an hour before. Iridium 33, a working satellite of the Iridium phone network, 556 kg, flies north over the Arctic about 789 km up.',
    c1b: 'Kosmos 2251, a Russian military satellite of 900 kg, flies south on an orbit tilted 74 degrees. It went out of service in 1995 and had no engine to move with.',
    c2a: 'Their paths cross above the Taymyr Peninsula in Siberia. CelesTrak\'s screening that day predicted they would pass 584 m apart, and it was not the closest pass on its list.',
    c2b: 'This is the Iridium family\'s shape, drawn to size: a bus 3.1 m long with wings 9.4 m across. Kosmos 2251 has no model here; seen from afar, it is a ringed mark.',
    c3a: '16:55:59 UTC: they meet at nearly a right angle, closing at about 11.7 km/s, and both break apart.',
    c4a: 'Two clouds, not one: each satellite\'s pieces stay near its own orbit, so two rings form, crossing where the satellites did.',
    c5a: 'A higher piece takes longer to go round. Lap after lap each cloud strings out along its orbit.',
    c6a: 'The Earth\'s bulge turns every plane at a rate set by its height and tilt. Kosmos 2251\'s pieces, tilted 74 degrees, fan out about four times faster than the polar Iridium\'s.',
    c7a: 'By 22 June 2012 CelesTrak counted 598 pieces of Iridium 33, 93 already fallen, and 1 603 of Kosmos 2251, 222 fallen.',
    c8a: 'Today the catalogue holds 656 pieces of Iridium 33 and 1 714 of Kosmos 2251; 115 and 604 are still in orbit, more than seventeen years on.',
    c8b: 'The counts are measured. The picture is a model: today\'s survivors on today\'s orbits, spread back to the moment of the collision.',
    pathIridium: 'Iridium 33 as a circle 789 km up (NASA ODQN 13(2)), tilted 86.4 degrees and northbound (CelesTrak), through a point we chose in the Taymyr Peninsula; its real orbit was within about 15 km of it',
    pathKosmos: 'Kosmos 2251 as a circle at the same height, tilted 74.0 degrees and southbound, through the same point: the two meet at 101.5 degrees and 11.55 km/s, about the published 11.7',
    cloudNote: 'The pieces are the 115 of Iridium 33 and 604 of Kosmos 2251 the catalogue still holds, on the orbits it gives today, spread from the point of the collision by a model (two-body motion and the drift the Earth\'s bulge causes); pieces that have fallen are not drawn, and the counts in the captions are measured. At the event each piece starts at its own lowest point of today, so each cloud begins as a short line, not a point: drag has lowered many orbits since 2009.',
    drawnNote: 'Illustrative: Iridium 33 wears the Iridium family\'s shape (the first satellites\' own bus differed), Kosmos 2251 is a ringed mark and every piece a dot of one size; the collision itself is not drawn.',
    drawnNoteLamp: 'Illustrative: the collision happened in the Earth\'s shadow, so Iridium 33 is lit by a lamp to be seen; it wears the Iridium family\'s shape (the first satellites\' own bus differed), Kosmos 2251 is a ringed mark and every piece a dot of one size; the collision itself is not drawn.',
    footMore: 'More',
    footLess: 'Less',
    srcOdqn09: 'NASA Orbital Debris Quarterly News 13(2), April 2009: the collision and its height',
    srcCelestrak: 'CelesTrak, Iridium 33/Cosmos 2251 Collision: the second, which way each flew, the masses, the predicted miss, the counts of 2012',
    srcJsr: 'Jonathan\'s Space Report 606: the Taymyr Peninsula, and Kosmos 2251 out of service since 1995 with no engine',
    srcSatcat: 'CelesTrak satellite catalogue (SATCAT), read 2026-11-23: today\'s counts and every piece\'s orbit',
    srcWiki: 'Wikipedia, 2009 satellite collision: the closing speed of about 11.7 km/s',
  },
});

// The story's words in the visitor's language when a translation has them (copy/lang.js; the other sections are localised by en.moments.js).
if (HOOK.localise) HOOK.localise({ COPY }, ['momentStories']);

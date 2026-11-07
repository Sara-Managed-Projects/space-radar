// The words of the Moment `fengyun-1c` (forge #153): China's anti-satellite test of 11 January 2007 and the cloud it made, from one
// point to a shell round the Earth. Named by the moment's `wordsFile`; imported by moments/player.js only, never at boot.
//
// MEASURED AND MODELLED. Every number in a caption is measured and the caption names where it is from: the orbit and the counts of
// 2007 to 2014 are NASA's Orbital Debris Quarterly News (ODQN), the minute is CelesTrak's analysis of the test, today's count is
// CelesTrak's satellite catalogue (SATCAT) read on 2026-11-07. The PICTURE of the spread is modelled (data/clouds.js spreadAt) and
// `cloudNote`, on the player's foot line, says how.
//
// THE CAPTIONS ARE WHAT THE VOICE SAYS. The `v…` keys are said, in this order and word for word, by the trips' voice
// (scripts/narrate-moments.py, registry/moment-voices.yaml says which keys make which clip); a caption is shown from the second its
// sentence starts in the clip. Change one and `python3 scripts/narrate-moments.py --check` fails until its clip is rendered again.
// In another language the captions are that language's and the English voice is not played (moments/voice.js).
import { COPY } from './en.js';
import './en.moments.js';
import { HOOK } from './lang.js';

Object.assign(COPY.momentStories, {
  'fengyun-1c': {
    title: '2007: Fengyun-1C',
    blurb: 'A Chinese missile destroys an old weather satellite 865 km up, and its pieces spread from one point into a shell round the Earth that is still there.',
    chBefore: 'Fengyun-1C',
    chHit: 'The test',
    chRing: 'A ring',
    chMonths: 'Two months',
    chYear: 'The first year',
    chShell: 'A shell',
    chToday: 'Today',
    v1a: 'The evening of 11 January 2007. Fengyun-1C, a retired Chinese weather satellite of 960 kg, circles the Earth over the poles, 845 to 865 km up.',
    v1b: 'A missile launched from near Xichang is climbing to meet it. Its path was never published, so it is not drawn.',
    v2a: '22:26 UTC: the interceptor hits the satellite head on, closing at about 8 km/s, and breaks it into thousands of pieces.',
    v2b: 'Each piece flies on a little faster or slower than the rest, so each is on an orbit of its own.',
    v3a: 'A higher orbit takes longer to go round. Lap after lap the pieces string out along the old orbit, and within days they close into a ring.',
    v4a: 'The Earth\'s bulge turns every orbit\'s plane, a little faster or slower for each height and tilt, so the ring starts to fan out.',
    v4b: 'Two months after the test, more than 1 200 pieces had been catalogued and nearly 400 more were being tracked, NASA\'s Orbital Debris Quarterly News reported.',
    v5a: 'By the end of 2007 the catalogue held 2 317 pieces, and only 22 had fallen back. NASA estimated at least 150 000 pieces of a centimetre or more, too small to track.',
    v6a: 'Year by year the planes spread all the way round. By January 2013 the cloud is a shell round the Earth: 3 378 pieces catalogued, 3 076 still in orbit.',
    v6b: 'Satellites have to dodge them. The International Space Station moved out of the way of one in January 2012.',
    v7a: 'Today the catalogue holds 3 531 pieces of Fengyun-1C, and 2 310 are still up, nearly twenty years on. On 10 November 2021 the station moved again to dodge one.',
    v7b: 'The counts are measured. The picture is a model: today\'s survivors on today\'s orbits, spread back to the moment of the test.',
    pathSat: 'Fengyun-1C\'s orbit of 845 by 865 km at 98.6 degrees (NASA ODQN, April 2007) as a conic; where on it the satellite was struck is illustrative',
    cloudNote: 'The pieces are the 2 310 the catalogue still holds, on the orbits it gives today, spread from one point by a model (two-body motion and the drift the Earth\'s bulge causes); pieces that have fallen are not drawn, and the counts in the captions are measured. At the event each piece starts at its own lowest point of today, so the cloud begins as a line below the satellite, not a point: drag has lowered many orbits since 2007.',
    srcOdqn07: 'NASA Orbital Debris Quarterly News 11(2), April 2007: the satellite, its orbit, the first counts',
    srcOdqn08: 'NASA Orbital Debris Quarterly News 12(1), January 2008: the count at the end of 2007',
    srcOdqn13: 'NASA Orbital Debris Quarterly News 17(1), January 2013: catalogued, decayed and still in orbit',
    srcOdqn14: 'NASA Orbital Debris Quarterly News 18(1), January 2014: the station\'s manoeuvre of January 2012',
    srcOdqn22: 'NASA Orbital Debris Quarterly News 26(1), March 2022: the station\'s manoeuvre of 10 November 2021',
    srcCelestrak: 'CelesTrak, Chinese ASAT test: the most likely time of the event, 22:26:10 UTC',
    srcSatcat: 'CelesTrak satellite catalogue (SATCAT), read 2026-11-07: today\'s count and every piece\'s orbit',
    srcWiki: 'Wikipedia, 2007 Chinese anti-satellite missile test: the closing speed',
  },
});

// The story's words in the visitor's language when a translation has them (copy/lang.js; the other sections are localised by en.moments.js).
if (HOOK.localise) HOOK.localise({ COPY }, ['momentStories']);

// tools/moments-build/falcon9-og2-2.mjs -- the first landing of a Falcon 9 first stage: ORBCOMM OG2 Mission 2 (Falcon 9 flight 20), lift-off from Space Launch Complex
// 40 at 01:29:00 UTC on 22 December 2015 (8:29 p.m. EST, 21 December), the booster B1019 down on Landing Zone 1 at T+9:44. Release 1.7.6, internal #1058 and #867.
// `node tools/moments-build/falcon9-og2-2.mjs` writes site/data/moments/falcon9-og2-2.json and its two paths; the work is falcon9-flight.mjs's, which any other
// Falcon 9 flight can use with its own record like this one.
//
// WHAT IS PUBLISHED (read 3 November 2026):
//  * SpaceX's own ORBCOMM-2 press kit (archived 23 December 2015): lift-off from SLC-40; max Q at about T+1:00; main engine cut-off T+2:20 and stage separation
//    T+2:24 (both planned); second stage ignition T+2:35; fairing deployment T+3:00; boostback burn about T+4:00; re-entry burn about T+8:00; landing about T+10:00; the 11
//    satellites deployed T+15 to T+20; the first stage's landing "a secondary test objective", "its first attempt to land a first stage on land".
//  * the Spaceflight101 reconstruction of the flight from the webcast (archived 2017): Mach 1 at T+1:05, "MaxQ displayed on Webcast" T+1:13, MECO T+2:23 at 75 km and
//    1.67 km/s, stage separation T+2:25, second stage ignition T+2:34, fairing T+2:48, BOOST-BACK START T+3:47, ENTRY BURN T+8:01 to T+8:21, LANDING BURN START T+9:11,
//    FIRST STAGE LANDING AT LZ-1 T+9:44, the 11 satellites from T+14:26 to T+19:05 (six steps).
//  * Landing Zone 1, 28 degrees 29 minutes 9 seconds N 80 degrees 32 minutes 40 seconds W, two round pads 282 ft across marked with an X (Wikipedia, "Landing Zones 1
//    and 2"); Space Launch Complex 40, 28.5619 N 80.5772 W (Wikipedia coordinates).
// OURS: the path between those (the heights and ranges, apogee, the boostback's length, the legs' and fins' clocks, every speed but MECO's), where the lamp is; the second
// stage's path after separation (it is drawn to 330 s); the launch azimuth (47 degrees, ours: the orbit was 47 degrees at 750 km); the booster's flip.
import { buildFalcon9Moment } from './falcon9-flight.mjs';
const OUT = new URL('../../site/data/moments/', import.meta.url).pathname;

const flight = {
  id: 'falcon9-og2-2', wordsFile: 'falcon9', name: 'Falcon 9 flight 20, ORBCOMM OG2 Mission 2',
  epoch: '2015-12-22T01:29:00Z', end: 614,
  pad: { name: 'Space Launch Complex 40, Cape Canaveral', lat: 28.5619, lon: -80.5772, azimuth: 47, shoreBearing: 90, shoreM: 1100 },
  landing: { name: 'Landing Zone 1, Cape Canaveral', lat: 28.48583, lon: -80.54444, altM: 3, azimuth: 90, shoreBearing: 90, shoreM: 2300 },
  events: { towerClear: 7, mach1: 65, maxq: 73, meco: 143, sep: 145, s2ignite: 154, fairing: 168, boostback: 227, entry: [481, 501], landingBurn: [551, 584], touch: 584,
    finsOut: 276, legsDown: 569, stage2End: 330, placeAt: 440 },
  meco: { altKm: 75, speedKmS: 1.67, pathDeg: 62 },
  ballistic: 1500, boostbackAccel: 38, entryAccel: 80, boostbackLead: 0, landingBurnH: 3500,
  pace: [[-10, 0, 1], [0, 30, 3], [30, 120, 6], [120, 139, 3], [139, 152, 1], [152, 224, 12], [224, 280, 3.5], [280, 440, 30], [440, 477, 5], [477, 505, 1.4], [505, 547, 7], [547, 600, 1], [600, 614, 1]],
  sources: {
    ascent: 'the event times of the Spaceflight101 reconstruction of the webcast (Mach 1 at 65 s, max Q at 73 s, MECO at 143 s at 75 km and 1.67 km/s) and SpaceX\'s press kit; the heights and ranges between them, and the launch azimuth, are ours',
    booster: 'the Spaceflight101 reconstruction (boostback from T+3:47, entry burn T+8:01 to T+8:21, landing burn from T+9:11, landing at Landing Zone 1 at T+9:44) and Landing Zone 1\'s published place; the arc is flown by tools/moments-build/falcon9-flight.mjs as a point mass, and its heights, speeds, the boostback\'s length and the clocks of the fins and legs are ours',
    stage2: 'the second stage\'s ignition and the fairing\'s release at the published seconds; its path after separation is ours and ends where the picture does',
  },
  sourceList: [
    { say: 'srcKit', url: 'https://web.archive.org/web/20151223213343/http://www.spacex.com/sites/spacex/files/spacex_orbcomm_press_kit_final2.pdf' },
    { say: 'srcRecon', url: 'https://web.archive.org/web/2016/https://spaceflight101.com/falcon-9-orbcomm-flight2/?p=297' },
    { say: 'srcWiki', url: 'https://en.wikipedia.org/wiki/Falcon_9_flight_20' },
    { say: 'srcLz', url: 'https://en.wikipedia.org/wiki/Landing_Zones_1_and_2' },
  ],
  audioNote: 'No recording plays. SpaceX\'s webcast of the flight is SpaceX\'s and is not licensed for reuse here; the words are captions.',
  camera: (E, TL) => [
    { t: -10, shot: 'pad', at: [210, -150, 5], lookY: 30, fov: 40, vehicle: 'booster-up' },
    { t: -3, shot: 'pad', at: [150, -105, 4], lookY: 24, fov: 50, vehicle: 'booster-up' },
    { t: 4, shot: 'track', at: [-1500, -1100, 10], lookY: 30, fill: 0.55, fovMin: 0.6, fovMax: 20, vehicle: 'booster-up' },
    { t: 30, shot: 'chase', offset: [180, -30, 140], lookY: 30, fov: 40, vehicle: 'booster-up', blend: 1.5 },
    { t: E.maxq - 6, shot: 'chase', offset: [110, -50, 90], lookY: 30, fov: 44, vehicle: 'booster-up', blend: 2 },
    { t: E.meco - 10, shot: 'orbit', az: 120, el: 6, dist: 150, lookY: 38, fov: 42, vehicle: 'booster-up', blend: 2 },
    { t: E.sep + 1, shot: 'orbit', az: 100, el: 8, dist: 190, lookY: 50, fov: 44, vehicle: 'booster' },
    { t: E.sep + 10, shot: 'orbit', az: 70, el: 10, dist: 85, lookY: 24, fov: 44, vehicle: 'booster', blend: 2 },
    { t: E.s2ignite + 6, shot: 'orbit', az: 40, el: 14, dist: 130, lookY: 12, fov: 42, vehicle: 'stage2', blend: 3 },
    { t: E.fairing - 8, shot: 'chase', offset: [50, -20, 60], lookY: 20, fov: 46, vehicle: 'stage2', blend: 2 },
    { t: E.boostback - 25, shot: 'orbit', az: 60, el: 8, dist: 85, lookY: 22, fov: 44, vehicle: 'booster', blend: 3 },
    { t: E.boostback + 20, shot: 'orbit', az: 130, el: 4, dist: 70, lookY: 6, fov: 44, vehicle: 'booster', blend: 2 },
    { t: E.finsOut - 6, shot: 'orbit', az: 30, el: 20, dist: 38, lookY: 42, fov: 46, vehicle: 'booster', blend: 2 },
    { t: 300, shot: 'globe', altKm: 1400, backKm: 900, fov: 46, vehicle: 'booster', blend: 3 },
    { t: E.entry[0] - 14, shot: 'orbit', az: 90, el: 6, dist: 60, lookY: 12, fov: 46, vehicle: 'booster', blend: 3 },
    { t: E.entry[1] + 8, shot: 'orbit', az: 200, el: 10, dist: 90, lookY: 20, fov: 46, vehicle: 'booster', blend: 3 },
    { t: E.landingBurn[0] - 8, shot: 'chase', offset: [62, 16, 40], lookY: 14, fov: 44, vehicle: 'booster', blend: 2 },
    { t: TL - 9, shot: 'pad', at: [-95, 70, 2.5], lookY: 9, fov: 38, vehicle: 'booster', blend: 2 },
    { t: TL + 2, shot: 'orbit', az: 220, el: 5, dist: 105, lookY: 21, fov: 44, vehicle: 'booster', blend: 1.5 },
  ],
  captions: (E, TL, run) => [
    { t: -10, say: 'ready' }, { t: -5.5, say: 'ignition' }, { t: 0.5, say: 'liftoff' }, { t: E.mach1 - 3, say: 'mach1' }, { t: E.maxq - 1, say: 'maxq' }, { t: E.meco - 6, say: 'meco' },
    { t: E.sep + 2, say: 'sep' }, { t: E.s2ignite + 4, say: 's2' }, { t: E.fairing - 4, say: 'fairing' }, { t: E.boostback - 8, say: 'boostback' }, { t: E.finsOut - 2, say: 'fins' },
    { t: 330, say: 'coast' }, { t: E.entry[0] - 12, say: 'entry' }, { t: E.entry[1] + 4, say: 'entryEnd' }, { t: E.landingBurn[0] - 6, say: 'landingBurn' }, { t: E.legsDown - 2, say: 'legs' },
    { t: TL - 3, say: 'touch' }, { t: TL + 8, say: 'sats' },
  ],
  chapters: (E, TL) => [{ t: -10, say: 'chPad' }, { t: 0.5, say: 'chAscent' }, { t: E.meco - 6, say: 'chSep' }, { t: E.boostback - 8, say: 'chReturn' }, { t: E.entry[0] - 12, say: 'chEntry' }, { t: E.landingBurn[0] - 6, say: 'chLanding' }],
};
buildFalcon9Moment(flight, OUT);

// tests/test_flightpath.mjs -- the flight editor's path as data (forge #155, ui/flightpath.js).
//
//   node tests/test_flightpath.mjs
//
// THE EASING MATHS: each curve starts at 0 and ends at 1, never goes back, `smooth` is symmetric about its middle,
// `constant` is the identity, and `cruise` is a straight line through its middle 70 % (equal steps of time are equal
// steps of travel there). THE TIMELINE: keys are reached at the sums of their flights; a scrub inside a flight is
// that flight's ease. THE CAMERA: angles go the short way round (350 to 10 is 20 degrees, not 340), distance in its
// logarithm (half way from 10 to 1000 km is 100 km). THE CLOCK: a key with an instant is eased to; a key without
// runs at its rate; a path of live keys starts at Play. THE LINK round-trips, deflated and plain, and refuses junk;
// a three-key path is a short link. THE DRAFT TRIP has the fields registry/tours.yaml asks for, and leaves out a
// key with no target, saying why. tests/test_flight_draft.py holds the draft against scripts/check_registry.py.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = await import(pathToFileURL(join(ROOT, 'site/js/ui/flightpath.js')).href);
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// --- the easing maths ---------------------------------------------------------------------------------------
for (const name of P.EASINGS) {
  check(near(P.easeAt(name, 0), 0) && near(P.easeAt(name, 1), 1), `${name}: 0 -> 0 and 1 -> 1`);
  let last = -1;
  let mono = true;
  for (let i = 0; i <= 200; i += 1) {
    const v = P.easeAt(name, i / 200);
    if (v < last - 1e-9) mono = false;
    last = v;
  }
  check(mono, `${name} never goes back`);
  check(near(P.easeAt(name, -1), 0) && near(P.easeAt(name, 2), 1), `${name} is clamped outside 0..1`);
}
for (const x of [0.1, 0.25, 0.4]) check(near(P.easeAt('smooth', x) + P.easeAt('smooth', 1 - x), 1, 1e-5), `smooth is symmetric at ${x}`);
check(P.easeAt('smooth', 0.1) < 0.1 && P.easeAt('smooth', 0.9) > 0.9, 'smooth starts and stops slowly');
for (const x of [0.13, 0.5, 0.77]) check(near(P.easeAt('constant', x), x), `constant is the identity at ${x}`);
const c = (x) => P.easeAt('cruise', x);
check(near(c(0.3) - c(0.2), c(0.8) - c(0.7), 1e-9) && near(c(0.5), 0.5, 1e-9), 'cruise is a straight line through its middle');
check(c(0.05) < 0.05 && c(0.95) > 0.95, 'cruise accelerates and decelerates at its ends');
check(near(P.easeAt('no-such', 0.3), P.easeAt('smooth', 0.3)), 'an unknown ease is smooth');

// --- keys ---------------------------------------------------------------------------------------------------
const cam = (az, pol, km) => ({ azimuthDeg: az, polarDeg: pol, distanceKm: km });
const T0 = Date.UTC(2026, 10, 7, 12, 0, 0);
const earth = P.makeKey({ at: 'earth', stage: 'earth', cam: cam(350, 60, 10), t: null, rate: 1 });
const iss = P.makeKey({ at: 'sat-25544', stage: 'earth', cam: cam(10, 80, 1000), rate: 60, ease: 'constant', ms: 2000 });
const saturn = P.makeKey({ at: 'saturn', stage: 'saturn', cam: cam(40, 70, 300000), t: T0, rate: 36000, ease: 'smooth', ms: 6000 });
check(earth && iss && saturn, 'three keys are made');
check(P.makeKey({ stage: 'earth', cam: cam(0, 90, 10) }) === null, 'a key with no target is refused');
check(P.makeKey({ at: 'x', stage: 'earth', cam: cam(0, 90, 0) }) === null, 'a key with no distance is refused');
check(P.makeKey({ at: 'x', stage: 'Earth!', cam: cam(0, 90, 1) }) === null, 'a key with a malformed stage is refused');
check(P.makeKey({ at: 'x', stage: 'earth', cam: cam(0, 90, 1), rate: 7 }).rate === 1, 'a rate the clock has not is 1');
check(P.makeKey({ at: 'x', stage: 'earth', cam: cam(0, 90, 1), ms: 10 }).ms === P.MIN_MS, 'a flight is at least MIN_MS');
check(P.makeKey({ at: 'x', stage: 'earth', cam: cam(0, 90, 1), ms: 1e9 }).ms === P.MAX_MS, 'a flight is at most MAX_MS');
const point = P.makeKey({ xyz: [1, 2, 3.123456], stage: 'sun', cam: cam(0, 90, 5) });
check(point && point.xyz[2] === 3.123 && !point.at, 'a view of a point keeps the point, to four figures');

// --- the timeline -------------------------------------------------------------------------------------------
const path = { keys: [earth, iss, saturn] };
check(JSON.stringify(P.startsOf(path)) === '[0,2000,8000]' && P.totalMs(path) === 8000, 'keys are reached at the sums of their flights');
const s1 = P.segmentAt(path, 1000);
check(s1.i === 1 && near(s1.k, 0.5) && near(s1.e, 0.5), 'half way into a constant flight is half way');
const s2 = P.segmentAt(path, 2000 + 1500);
check(s2.i === 2 && near(s2.k, 0.25) && near(s2.e, P.easeAt('smooth', 0.25)), 'a quarter into a smooth flight is its ease');
check(P.segmentAt(path, 0).i === 0 && P.segmentAt(path, 99999).i === 2 && P.segmentAt(path, 99999).e === 1, 'before and after the path');

// --- the camera ---------------------------------------------------------------------------------------------
const p1 = P.poseAt(path, 1000);
check(near(p1.azimuthDeg, 0, 1e-9) || near(p1.azimuthDeg, 360, 1e-9), `350 to 10 degrees goes through 0 (${p1.azimuthDeg})`);
check(near(p1.polarDeg, 70) && near(p1.distanceKm, 100, 1e-6), `half way from 10 to 1000 km is 100 km (${p1.distanceKm})`);
check(P.poseAt(path, 3000).stage === 'saturn', 'a key on another map is flown on that map');
check(P.poseAt({ keys: [] }, 0) === null, 'no keys, no pose');
// Two things far apart: the camera rises through 1.2 times their separation at the middle, and ends where it should.
const apart = P.poseAt(path, 1000, 1e6);
check(Math.abs(apart.distanceKm - 1.2e6) / 1.2e6 < 1e-9, `half way between things a million km apart the camera is 1.2 million km out (${apart.distanceKm})`);
check(Math.abs(P.poseAt(path, 2000, 1e6).distanceKm - 1000) < 1e-6 && Math.abs(P.poseAt(path, 1, 1e6).distanceKm - 10) < 1, 'and lands at each key\'s own distance');
check(Math.abs(P.poseAt(path, 1000, 50).distanceKm - 100) < 1e-6, 'two things close together: straight in the logarithm');
let rising = true;
for (let k = 1; k <= 10; k += 1) if (P.logDistanceAt(10, 1000, 1e6, k / 20) < P.logDistanceAt(10, 1000, 1e6, (k - 1) / 20)) rising = false;
check(rising, 'the apex curve climbs from the first key to the middle');

// --- the clock ----------------------------------------------------------------------------------------------
const start = Date.UTC(2026, 0, 1);
const T = P.clockTimes(path, start);
check(T[0] === start && T[1] === start + 60 * 2000 && T[2] === T0, 'a key with no instant carries the clock on at its rate');
const k1 = P.clockAt(path, 1000, start);
check(k1.t === start + 60 * 1000 && k1.rate === 60 && !k1.driven, 'into a key with no instant the clock runs at its rate');
const k2 = P.clockAt(path, 2000 + 3000, start);
check(k2.driven && k2.rate === 36000 && k2.t === Math.round(T[1] + (T0 - T[1]) * P.easeAt('smooth', 0.5)), 'into a key with an instant the clock is eased there');
check(P.clockAt(path, 8000, start).t === T0, 'the clock is at the key\'s instant when the key is reached');
const live = { keys: [earth, P.makeKey({ ...iss, rate: 1 })] };
check(P.clockAt(live, 2000, start).t === start + 2000, 'a path of live keys runs from Play at one second a second');

// --- the link -----------------------------------------------------------------------------------------------
const packed = P.packPath(path);
check(JSON.stringify(P.unpackPath(packed)) === JSON.stringify(path), 'pack and unpack round-trip');
const z = await P.encodePath(path);
check(z.startsWith('z') && z.length < 200, `a three-key path is a short link (${z.length} characters)`);
check(JSON.stringify(await P.decodePath(z)) === JSON.stringify(path), 'the deflated link round-trips');
const j = await P.encodePath(path, {});
check(j.startsWith('j') && JSON.stringify(await P.decodePath(j)) === JSON.stringify(path), 'the plain link round-trips where there is no CompressionStream');
check(await P.decodePath('') === null && await P.decodePath('zzzz!') === null && await P.decodePath('zAAAAAAAA') === null, 'junk is null, not a throw');
check(await P.decodePath(`j${btoa('[2,[]]')}`) === null, 'another version is null');
check(await P.decodePath(`j${btoa('[1,[["x","earth",0,90,-5,0,1,0,40]]]')}`) === null, 'a key the editor could not make is refused');
const many = { keys: Array.from({ length: 40 }, (_, i) => P.makeKey({ at: `sat-${i}`, stage: 'earth', cam: cam(i, 60, 1000 + i) })) };
check((await P.decodePath(await P.encodePath(many))).keys.length === P.MAX_KEYS, 'a link carries MAX_KEYS keys at most');

// --- the draft trip -----------------------------------------------------------------------------------------
const draft = P.tripDraft({ keys: [earth, iss, saturn, point] }, { worlds: ['earth', 'saturn'], names: { 'sat-25544': 'ISS (ZARYA)' }, id: 'draft-test', today: '2026-11-07' });
for (const want of ['  - id: draft-test', '    stage: earth', '        target: {world: earth}', '        target: {record: sat-25544}', '        target: {world: saturn}',
  '        stage: saturn', '        ease: linear', '        ease: inout', '        time: "2026-11-07T12:00:00Z"', '        rate: 36000', '        # ISS (ZARYA)', 'key 4 looks at a point']) {
  check(draft.includes(want), `the draft has ${JSON.stringify(want)}`);
}
check((draft.match(/^ {6}- id: k\d$/gm) || []).length === 3, 'one stop per key with a target');

if (problems.length) {
  console.error(`test_flightpath: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('test_flightpath: the easings, the timeline, the camera, the clock, the #path= link and the draft trip hold');

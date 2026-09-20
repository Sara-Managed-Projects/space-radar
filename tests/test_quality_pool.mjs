// The adaptive hero pool (scene/heroes.js nextHeroCap): how many models a device has earned.
//   node tests/test_quality_pool.mjs
//
// Ivan, 2026-09-20: "if user PC or mobile is fast enough, render more 3d objects, and render more
// gradually if it not moving ... but more and better to load real models and not cubes."
//
// Eight was a fixed budget every device paid. The rule below spends headroom and takes it back, and
// it is pure BECAUSE the machine it was written on renders in software: headless Chrome never has
// the headroom to grow the pool, so the growth path could not be tested in a browser at all.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { nextHeroCap } = await import(join(JS, 'scene/heroes.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const FLOOR = 8;
const CEIL = 16;
// A still camera on a fast machine, one model at a time.
const fast = { cap: FLOOR, medianFrameMs: 12, stillMs: 900, sinceGrowMs: 500 };
check(nextHeroCap(fast) === FLOOR + 1, `a fast, still frame adds one model (got ${nextHeroCap(fast)})`);
check(nextHeroCap({ ...fast, sinceGrowMs: 100 }) === FLOOR, 'models arrive gradually: not two in the same 400 ms');
check(nextHeroCap({ ...fast, stillMs: 200 }) === FLOOR, 'a camera that has only just stopped does not grow the pool');
check(nextHeroCap({ ...fast, medianFrameMs: 24 }) === FLOOR, '24 ms a frame is not headroom, so nothing is added');
// Growth walks up to the ceiling and stops.
let cap = FLOOR;
for (let i = 0; i < 40; i += 1) cap = nextHeroCap({ cap, medianFrameMs: 10, stillMs: 5000, sinceGrowMs: 500 });
check(cap === CEIL, `growth stops at the ceiling (got ${cap})`);
// The safety valve: slow frames give the budget back in twos, even while moving, down to the floor.
check(nextHeroCap({ cap: CEIL, medianFrameMs: 40, stillMs: 0, sinceGrowMs: 0 }) === CEIL - 2, 'slow frames give two slots back');
let falling = CEIL;
for (let i = 0; i < 20; i += 1) falling = nextHeroCap({ cap: falling, medianFrameMs: 40 });
check(falling === FLOOR, `the pool falls no further than the floor (got ${falling})`);
// What the device has already admitted about itself.
check(nextHeroCap({ ...fast, cap: CEIL, latched: true }) === FLOOR, 'a latched scene goes straight back to the floor');
check(nextHeroCap({ ...fast, cap: CEIL, saveData: true }) === FLOOR, 'a metered connection keeps the floor: every model is a file');
// Before there are enough frames to take a median of, there is no evidence of headroom.
check(nextHeroCap({ ...fast, medianFrameMs: 0 }) === FLOOR, 'no frame history yet means no growth');
// Rubbish in must not move the cap.
check(nextHeroCap({}) === FLOOR, 'no information at all leaves the floor');
check(nextHeroCap({ cap: NaN, medianFrameMs: NaN }) === FLOOR, 'NaN does not become a pool size');

if (problems.length) { console.error('quality pool FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`quality pool ok: ${FLOOR} models by default, up to ${CEIL} earned one at a time while still and fast, given back in twos when not`);

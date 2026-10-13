// tests/test_drift_pace.mjs -- the drift's long flights are easy on the eyes (ui/driftplan.js
// planFlight, scene/camera.js flyTo `path`).
//
// Ivan, 2026-10-14: "speed of camera movements should be calculated based on distances between
// objects, because if it is 2 satellites on the Earth it goes smoothly, but then it travels far to
// Mars or even more and it is super fast for this distance, so eyes are tired".
//
// What tires an eye is how fast the picture turns, how fast a body in it sweeps across it and how
// fast it grows. tests/helpers/drift_flights.mjs reads the three off the real camera rig, flown a
// sixtieth of a second at a time, for the hops he named. Held here:
//
//   1. THE CAUSE, as measured on the flight the drift flew until that day: a long hop changed the
//      picture's scale about three times e every second, twice the short hop's worst moment, and a
//      flight between two stars ended in a jump.
//   2. SHORT HOPS ARE AS THEY WERE: the same flight, to the frame.
//   3. EVERY OTHER HOP IS INSIDE THE BOUNDS (ui/driftplan.js COMFORT), whatever the distance, and
//      lands exactly where the old flight landed. Under the ceiling, a flight between stars is over
//      them by what the plan itself says and no more.
//   4. THE LENGTH grows with the logarithm of the distance, never past the ceiling; calm is slower.
//   5. THE CURVE: starts and ends at rest on the two framings, never steps, never goes back.
//   6. 240 HOPS NOBODY CHOSE hold the same bounds.
//   7. THE SEAMS: main.js hands the path on; the drift sets its clock by the plan.
//
// `node tests/test_drift_pace.mjs --table` prints the before-and-after table a pull request quotes.
// NO HUMAN EYE IS IN THIS TEST: the bounds are numbers chosen from the hop he likes and from film
// practice, and whether they feel right is for a person to say.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { HOPS, fly, flightBefore, flightNow, randomHops, seeded } from './helpers/drift_flights.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = await import(join(ROOT, 'site/js/ui/driftplan.js'));
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };

const rows = HOPS.map((hop) => ({ hop, before: fly(hop, flightBefore), now: fly(hop, flightNow) }));
const fmt = (r) => `${r.seconds.toFixed(1)} s | ${r.turnDegS.toFixed(0)} | ${r.sweepDegS.toFixed(0)} | ${r.loomPerS.toFixed(2)}`;

if (process.argv.includes('--table')) {
  console.log('| hop | class | before: length | turn, deg/s | sweep, deg/s | scale, times e a second | now: length | turn | sweep | scale |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.hop.name} | ${r.hop.klass} | ${fmt(r.before)} | ${fmt(r.now)} |`);
  process.exit(0);
}

const { loom: LOOM, turnDeg: TURN } = P.COMFORT;
/** A body at the edge of the picture moves this fast when the scale changes at LOOM and the pan is at its bound. */
const SWEEP = 46;
const SLACK = 1.04;
const RANDOM = {};

// --- 1. the cause --------------------------------------------------------------------------------
{
  const short = rows.filter((r) => r.hop.klass === 'short');
  const longer = rows.filter((r) => r.hop.klass !== 'short');
  const shortWorst = Math.max(...short.map((r) => r.before.loomPerS));
  check(shortWorst < 1.8, `the hop he likes changed scale at most ${shortWorst.toFixed(2)} times e a second`);
  for (const r of longer) check(r.before.loomPerS > 2, `before, "${r.hop.name}" changed scale ${r.before.loomPerS.toFixed(2)} times e a second (the cause: over 2)`);
  const stars = rows[rows.length - 1];
  check(stars.before.jump > 1 && stars.before.loomPerS > 100, `before, the flight between two stars ended in a jump (${stars.before.jump.toFixed(1)} times its distance in a frame)`);
}

// --- 2. short hops are as they were --------------------------------------------------------------
for (const r of rows.filter((x) => x.hop.klass === 'short')) {
  const same = ['seconds', 'turnDegS', 'sweepDegS', 'loomPerS'].every((k) => r.before[k] === r.now[k]);
  check(same, `"${r.hop.name}" flies as it did (${fmt(r.before)} | now ${fmt(r.now)})`);
  check(r.now.seconds <= 6.6 && r.now.turnDegS < 40 && r.now.loomPerS < 1.8, `"${r.hop.name}" is the short hop it was`);
}

// --- 3. every other hop is inside the bounds -----------------------------------------------------
const sameEnd = (a, b) => a.target.every((v, i) => Math.abs(v - b.target[i]) <= 1e-9 * (1 + Math.abs(v)))
  && Math.abs(a.distance / b.distance - 1) < 1e-9 && Math.abs(Math.sin(a.azimuth) - Math.sin(b.azimuth)) < 1e-6
  && Math.abs(Math.cos(a.azimuth) - Math.cos(b.azimuth)) < 1e-6 && Math.abs(a.polar - b.polar) < 1e-6;
for (const r of rows.filter((x) => x.hop.klass !== 'short')) {
  const n = r.now;
  const name = r.hop.name;
  check(n.landed && sameEnd(n.end, r.before.end), `"${name}" lands exactly where the old flight landed`);
  check(n.jump < 0.06, `"${name}": the camera never steps (${n.jump.toFixed(3)} of its distance in a frame)`);
  check(n.seconds <= P.FLIGHT_MOST_MS / 1000 + 0.05, `"${name}" is no longer than the ceiling (${n.seconds.toFixed(1)} s)`);
  check(n.seconds > r.before.seconds, `"${name}" takes longer than it did (${r.before.seconds.toFixed(1)} s, now ${n.seconds.toFixed(1)} s)`);
  if (/Sirius/.test(name)) continue;
  check(n.loomPerS <= LOOM * SLACK, `"${name}": the scale changes at most ${LOOM} times e a second (${n.loomPerS.toFixed(2)})`);
  check(n.turnDegS <= TURN * SLACK, `"${name}": the picture turns at most ${TURN} degrees a second (${n.turnDegS.toFixed(1)})`);
  check(n.sweepDegS <= SWEEP, `"${name}": a body in the picture sweeps at most ${SWEEP} degrees a second (${n.sweepDegS.toFixed(1)})`);
  check(n.loomPerS < r.before.loomPerS / 2, `"${name}": the scale changes less than half as fast as it did`);
}
{
  // Between two stars: the ceiling, and over the bounds by what the plan says, which is still
  // under the short hop's own worst moment.
  const r = rows[rows.length - 1];
  let plan = null;
  fly(r.hop, (hop, rig) => ({ ...flightBefore(hop, rig), path: (info) => (plan = P.planFlight(info)) }), 10);
  check(plan && plan.over > 1.2 && plan.over < 1.6, `between two stars the plan says it is over the bounds (${plan && plan.over.toFixed(2)} times)`);
  check(Math.abs(r.now.seconds - P.FLIGHT_MOST_MS / 1000) < 0.05, `and takes the ceiling (${r.now.seconds.toFixed(1)} s)`);
  check(r.now.loomPerS <= LOOM * plan.over * SLACK && r.now.loomPerS < 1.6, `its scale changes ${r.now.loomPerS.toFixed(2)} times e a second: no more than the plan says, less than the short hop's 1.7`);
  check(r.now.sweepDegS <= SWEEP * plan.over * SLACK, `and a star in the picture sweeps ${r.now.sweepDegS.toFixed(0)} degrees a second, no more than the plan says`);
}

// --- 4. the length -------------------------------------------------------------------------------
{
  const plan = (sep, extra = {}) => P.planFlight({ sep, from: 1, to: 1, ...extra });
  check(plan(10) === null && plan(P.SHORT_SPAN) === null, 'a crossing of up to SHORT_SPAN distances is a short hop: not planned');
  check(P.planFlight({ sep: 3, from: 1, to: 20 }) === null && P.planFlight({ sep: 3, from: 1, to: 40 }) !== null, 'a change of distance past SHORT_SPAN is planned, even with no crossing');
  check(P.planFlight({ sep: 0, from: 1, to: 1e6 }).ms > 0, 'a pure change of distance has a plan');
  check(P.planFlight({ sep: NaN, from: 1, to: 1 }) === null && P.planFlight({ sep: 5, from: 0, to: 1 }) === null && P.planFlight(null) === null, 'nonsense has none');
  const a = plan(100).ms;
  const b = plan(1000).ms;
  const c = plan(10000).ms;
  check(a < b && b < c, 'a longer hop takes longer');
  check(Math.abs((c - b) - (b - a)) < 60, `ten times the distance adds the same time again, not ten times the time (${b - a} ms, then ${c - b} ms)`);
  check(Math.abs((b - a) / 1000 - (2 * Math.log(10)) / (P.COMFORT.loom * (1 - P.RAMP))) < 0.1, 'and that time is two logarithms of ten at the loom bound');
  check(plan(1e12).ms === P.FLIGHT_MOST_MS && plan(1e12).over > 1, 'nobody waits past the ceiling, and the plan says it is over');
  check(a >= P.FLIGHT_MS[0], 'no planned flight is shorter than the shortest flight');
  check(plan(1000, { pace: 'calm' }).ms > b && plan(1000, { pace: 'brisk' }).ms < b, 'calm is slower and brisk faster');
  check(Math.abs(plan(1000, { pace: 'calm' }).ms / b - P.PACES.calm.flight) < 0.01, 'by the pace\'s own factor');
  check(P.FLIGHT_MOST_MS <= 40000 && P.FLIGHT_MOST_MS * P.PACES.calm.flight < 60000, 'the ceiling is well under a minute at every pace');
  // Calm on the real rig: the bounds come down with the pace.
  const calm = fly(HOPS[3], (hop, rig) => flightNow(hop, rig, 'calm'));
  check(calm.loomPerS <= (LOOM / P.PACES.calm.flight) * SLACK && calm.turnDegS <= (TURN / P.PACES.calm.flight) * SLACK, `calm to Mars: ${calm.loomPerS.toFixed(2)} times e and ${calm.turnDegS.toFixed(1)} degrees a second`);
  // A slow device: the flight is as long at ten frames a second.
  const slow = fly(HOPS[3], flightNow, 10);
  check(Math.abs(slow.seconds - rows[3].now.seconds) <= 0.11 && sameEnd(slow.end, rows[3].now.end), 'at ten frames a second the flight is as long and lands on the same pose');
}

// --- 5. the curve --------------------------------------------------------------------------------
{
  const unit = (x, y, z) => { const n = Math.hypot(x, y, z); return { x: x / n, y: y / n, z: z / n }; };
  const hop = { sep: 2200, from: 0.7, to: 27, fromDir: unit(0.3, 0.2, 0.9), toDir: unit(-1, -0.1, 0.05), along: unit(1, 0.1, 0), up: unit(0, 0, 1) };
  const plan = P.planFlight(hop);
  const first = plan.at(0);
  const last = plan.at(1);
  check(first.pan === 0 && Math.abs(first.distance / hop.from - 1) < 1e-9, 'the curve starts on the place it leaves, at its distance');
  check(last.pan === 1 && last.distance === hop.to && last.dir === plan.at(2).dir, 'and ends on the next, at its distance, on the side the app chose');
  let back = 0;
  let step = 0;
  let top = 0;
  let nearestLine = Math.PI;
  const N = 4000;
  let prev = first;
  for (let i = 1; i <= N; i++) {
    const p = plan.at(i / N);
    if (p.pan < prev.pan - 1e-12) back += 1;
    step = Math.max(step, Math.abs(Math.log(p.distance / prev.distance)));
    top = Math.max(top, p.distance);
    // In the middle of the crossing the camera is side-on to it.
    if (i / N > 0.5 && i / N < 0.6) nearestLine = Math.min(nearestLine, Math.acos(Math.abs(p.dir.x * hop.along.x + p.dir.y * hop.along.y + p.dir.z * hop.along.z)));
    prev = p;
  }
  check(back === 0, 'the look-at point never goes back');
  check(step < (plan.ms / 1000 / N) * P.COMFORT.loom * 1.01 / (1 - P.RAMP) + 1e-9, 'the distance never changes faster than the loom bound, anywhere on the curve');
  check(top > hop.sep && top < hop.sep * 2, `at the top both places are in one picture (${(top / hop.sep).toFixed(2)} crossings away)`);
  check(nearestLine >= P.SIDE_ON - 1e-6, `this arrival looks along the line of travel, so mid-crossing the camera is side-on to it (${(nearestLine * 180 / Math.PI).toFixed(0)} degrees off the line)`);
  check(plan.swings[0] > 0 && plan.swings[1] > 0, 'and its swing is in two parts: early, and late');
  const straight = P.planFlight({ ...hop, toDir: unit(0.1, 1, 0.2) });
  check(straight.swings[1] === 0, 'an arrival that is side-on already has no late swing: straight in');
}

// --- 6. hops nobody chose ------------------------------------------------------------------------
{
  // First with no globe on the stage: the curve alone. Then with the Earth where it is: the plan
  // knows the two places and nothing else, so a camera path that happens to cross the Earth is
  // pushed round it by the rig's own keep-out (scene/camera.js clearWorld), which is not paced.
  // That is rare and it is counted here, not hidden: under a hundredth of the hops, and even then
  // well under what every long hop did before.
  const hops = randomHops(240, seeded(20261014));
  let worst = { loom: 0, turn: 0, sweep: 0, jump: 0, seconds: 0 };
  let planned = 0;
  let crossed = 0;
  let crossedWorst = 0;
  for (const hop of hops) {
    let plan = null;
    const path = (h, rig) => ({ ...flightBefore(h, rig), path: (info) => (plan = P.planFlight(info)) });
    const r = fly({ ...hop, world: 0 }, path, 30);
    if (!plan) continue;
    planned += 1;
    const k = 1 / Math.max(1, plan.over);
    worst = { loom: Math.max(worst.loom, r.loomPerS * k), turn: Math.max(worst.turn, r.turnDegS * k), sweep: Math.max(worst.sweep, r.sweepDegS * k), jump: Math.max(worst.jump, r.jump), seconds: Math.max(worst.seconds, r.seconds) };
    if (!r.landed) problems.push(`${hop.name} never landed`);
    const real = fly(hop, path, 30);
    if (!real.landed) problems.push(`${hop.name} never landed with the Earth on the stage`);
    if (real.loomPerS * k > LOOM * SLACK || real.sweepDegS * k > SWEEP * 1.1) { crossed += 1; crossedWorst = Math.max(crossedWorst, real.loomPerS); }
  }
  check(planned > 200, `most of 240 random hops between low orbit and far worlds are planned (${planned})`);
  check(worst.loom <= LOOM * SLACK, `random hops: the scale changes at most ${worst.loom.toFixed(2)} times e a second`);
  check(worst.turn <= TURN * SLACK, `random hops: the picture turns at most ${worst.turn.toFixed(1)} degrees a second`);
  check(worst.sweep <= SWEEP * 1.1, `random hops: a body in the picture sweeps at most ${worst.sweep.toFixed(1)} degrees a second`);
  check(worst.jump < 0.12, `random hops: the camera never steps (${worst.jump.toFixed(3)} of its distance in a thirtieth of a second)`);
  check(worst.seconds <= P.FLIGHT_MOST_MS / 1000 + 0.1, `random hops: none is past the ceiling (${worst.seconds.toFixed(1)} s)`);
  check(crossed <= planned / 100 && crossedWorst < 2, `with the Earth on the stage ${crossed} of ${planned} cross it and are pushed round (worst ${crossedWorst.toFixed(2)} times e a second)`);
  RANDOM.planned = planned;
  RANDOM.crossed = crossed;
  RANDOM.crossedWorst = crossedWorst;
}

// --- 7. the seams --------------------------------------------------------------------------------
{
  const main = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
  check(/path: flight\.path/.test(main), 'main.js flyToRecord hands the drift\'s path to the rig');
  const drift = readFileSync(join(ROOT, 'site/js/ui/drift.js'), 'utf8');
  check(/planFlight\(\{ \.\.\.hop, pace: options\.pace \}\)/.test(drift) && /apexFor, path \}/.test(drift), 'ui/drift.js plans each hop at its pace, and keeps the old flight for the short ones');
  const camera = readFileSync(join(ROOT, 'site/js/scene/camera.js'), 'utf8');
  check(/if \(cut\) \{[\s\S]*?\n    let path = null;/.test(camera), 'scene/camera.js: reduced motion is still a cut, decided before any path is asked for');
}

if (problems.length) {
  console.error(`test_drift_pace: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
const mars = rows[3];
console.log(`drift pace ok: short hops as they were; to Mars ${mars.before.seconds.toFixed(1)} s at ${mars.before.loomPerS.toFixed(1)} times e a second before, ${mars.now.seconds.toFixed(1)} s at ${mars.now.loomPerS.toFixed(2)} now; ${rows.length} named hops and ${RANDOM.planned} random ones (${RANDOM.crossed} pushed round the Earth, ${RANDOM.crossedWorst.toFixed(2)} at worst) inside ${LOOM} times e, ${TURN} and ${SWEEP} degrees a second`);

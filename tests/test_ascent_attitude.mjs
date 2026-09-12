// Spec 0022, the item its tasks.md left open: point the rocket where it is going.
//   node tests/test_ascent_attitude.mjs
//
// The defect this locks down was measured before it was fixed. scene/models.js's `ascent` attitude
// case aimed the vehicle's +Y along the LOCAL VERTICAL, and propagate/ascent.js's own curve leaves
// the pad vertical and arrives horizontal -- so the vertical was 87.5 degrees off the direction of
// travel at 90 % of the arc. Rockets stood bolt upright through insertion, and the plume, which
// hangs off -Y, pointed at the ground from halfway up.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { ascent, ascentClimbAngleDeg } = await import(join(ROOT, 'site/js/propagate/ascent.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// A Falcon-9-shaped LEO flight from the Cape: the profile spec 0022 measured against.
const rec = { id: 'l1', ascent: { padLatDeg: 28.5, padLonDeg: -80.6, orbit: 'leo', t0Ms: 0 } };

// 1. The curve's two end conditions, which are the whole reason the arc is shaped as it is.
check(near(ascentClimbAngleDeg(rec, 0), 90, 0.01), `leaves the pad vertical: ${ascentClimbAngleDeg(rec, 0)}`);
check(near(ascentClimbAngleDeg(rec, 1), 0, 0.01), `arrives at insertion horizontal: ${ascentClimbAngleDeg(rec, 1)}`);

// 2. THE MEASURED DEFECT. 87.5 is the number spec 0022 recorded for how far the old attitude was
// out at 90 % of the arc, and it is the difference between 90 (what it drew) and the truth.
const at90 = ascentClimbAngleDeg(rec, 0.9);
check(near(at90, 2.5, 0.1), `at 90 % of the arc the climb is 2.5 deg above horizontal, not ${at90}`);
check(near(90 - at90, 87.5, 0.1), `so aiming along the local vertical is 87.5 deg out, measured ${90 - at90}`);

// 3. Monotonic: a launch tips over and never tips back. A sign error or a wrong reference frame
// shows up here rather than as a rocket that looks slightly odd.
let prev = Infinity;
for (let i = 0; i <= 20; i++) {
  const a = ascentClimbAngleDeg(rec, i / 20);
  check(a <= prev + 1e-9, `the climb angle never increases (f=${i / 20} gave ${a} after ${prev})`);
  check(a >= -0.01 && a <= 90.01, `the climb angle stays between 0 and 90 (f=${i / 20} gave ${a})`);
  prev = a;
}

// 4. The propagator hands the tangent out, it is a unit vector, and on the pad it is straight up.
// f = 0 is the one place dP/df vanishes, so the direction there is a limit rather than a value.
const mid = ascent(rec, 0.5 * 510 * 1000);
check(mid && mid.tangent, 'ascent() returns a tangent');
const len = Math.hypot(mid.tangent.x, mid.tangent.y, mid.tangent.z);
check(near(len, 1, 1e-9), `the tangent is a unit vector, measured ${len}`);
const pad = ascent(rec, -60_000);
check(pad.f === 0, 'before T0 the vehicle is at f = 0');
const padLen = Math.hypot(pad.tangent.x, pad.tangent.y, pad.tangent.z);
check(near(padLen, 1, 1e-9), `the tangent on the pad is a unit vector and not (0,0,0), measured ${padLen}`);
check(near(ascentClimbAngleDeg(rec, 0), 90, 0.01), 'and it points straight up');

// 5. The steepness is insertion altitude over downrange, and the orbit classes disagree about it
// in the direction they should. SSO inserts at 550 km over 24 degrees and is the steepest; GTO
// inserts into a LOW parking orbit, 250 km over 28 degrees, and is shallower than LEO -- which is
// counter-intuitive until you remember the arc ends at the parking orbit and not at 35 786 km.
// This assertion was written the other way round first, from an assumption, and the numbers said
// no; it is here in the corrected form because that is the kind of mistake worth pinning down.
const climbAt = (orbit, f) => ascentClimbAngleDeg({ id: `x-${orbit}`, ascent: { padLatDeg: 28.5, padLonDeg: -80.6, orbit, t0Ms: 0 } }, f);
const sso = climbAt('sso', 0.5);
const leo = climbAt('leo', 0.5);
const gto = climbAt('gto', 0.5);
check([sso, leo, gto].every(Number.isFinite), 'every orbit class gives a climb angle');
check(sso > leo && leo > gto, `steepness follows insertion altitude over downrange: sso ${sso.toFixed(2)} > leo ${leo.toFixed(2)} > gto ${gto.toFixed(2)}`);

if (problems.length) {
  console.log(`ascent attitude: ${problems.length} problem(s)`);
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
console.log(
  `ascent attitude ok: the arc leaves the pad at 90 deg and arrives at 0; at 90 % of it the climb is ` +
    `${at90.toFixed(2)} deg, so the local vertical it used to be drawn along was ${(90 - at90).toFixed(1)} deg out`
);

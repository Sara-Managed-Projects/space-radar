// scene/handoff.js -- the pose-preserving hand-off between two stages, as pure functions
// (internal #410, public #451). No scene, no rig, no DOM: tests/test_handoff.mjs holds every number.
//
// Never at boot: scene/climb.js imports this, and main.js imports climb.js the first time a visitor
// dollies a long way out (tests/test_boot_diet.mjs).
//
// WHY. A stage decides what one scene unit is and where the origin sits (scene/stage.js). Changing
// stage used to throw the camera away: main.js ctx.setStage framed the new stage's world from a
// stock distance, so every join of the ladder -- Earth to Sun, Sun to the stellar rung, to the
// galaxy, to the Local Group -- was a cut. Here the camera's position, its look-at point and its up
// are carried across in KILOMETRES, through the same frame conversion everything drawn goes
// through (propagate/frames.js toStage), so the picture on both sides of a join is the same picture:
// the thing shrinking in the middle of one stage is the dot in the middle of the next.
//
// Contract:
//   JOINS                              the chain, mirrored from registry/stages.yaml `joins:`
//   convertPose(pose, from, to, tMs)   {position, target, up} in `from`'s scene units -> `to`'s
//   stageAfter(stageId, upKm, downKm)  the stage a camera at those distances belongs on, or null
//   stageForDistance(dKm, cameFrom)    the chain's stage for a distance from home
//   climbDistance(d0, d1, k)           the distance k of the way along a logarithmic climb
//   climbMs(d0, d1, msPerDecade)       how long that climb takes at a constant rate per decade
//   easeTrapezoid(k, ramp)             rest to rest with a constant-speed middle
//   targetShare(dKm, offKm, nearKm, farKm)  how far the look-at point has moved to the far stop's subject

import { toStage } from '../propagate/frames.js';

/**
 * The chain of stages one flight passes through, and where each join is. Mirrors
 * registry/stages.yaml `joins:`; scripts/check_registry.py refuses drift.
 *
 *   out_km  going out on `from`: past this distance from `from`'s centre the camera belongs to `to`
 *   in_km   coming back on `to`: nearer than this to `anchor` the camera belongs to `from`
 *
 * out_km is larger than in_km on every row (hysteresis), so a camera resting between the two
 * never flips back and forth.
 */
export const JOINS = [
  { from: 'earth', to: 'sun', anchor: 'earth', out_km: 1400000, in_km: 900000 },
  { from: 'sun', to: 'stellar', anchor: 'sun', out_km: 1000000000000, in_km: 600000000000 },
  { from: 'stellar', to: 'galaxy', anchor: 'sun', out_km: 94607304725808000, in_km: 56764382835484800 },
  { from: 'galaxy', to: 'local-group', anchor: 'sun', out_km: 2838219141774240000, in_km: 1892146094516160000 },
];

/** The stages of the chain, innermost first. */
export const CHAIN = [JOINS[0].from, ...JOINS.map((j) => j.to)];

/** How far out "the edge" control flies, km: the microwave background's shell is in the picture. */
export const EDGE_KM = 1.6e24;

const finite3 = (v) => v && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);

/** Scene units -> km in the stage's own frame (the inverse of stage.toScene's remap). */
function sceneToKm(v, st) {
  const o = st.originKm || { x: 0, y: 0, z: 0 };
  return { x: v.x * st.unitKm + o.x, y: -v.z * st.unitKm + o.y, z: v.y * st.unitKm + o.z, frame: st.frame };
}

/** km in the stage's own frame -> scene units. */
function kmToScene(p, st) {
  const o = st.originKm || { x: 0, y: 0, z: 0 };
  const dx = (p.x - o.x) / st.unitKm;
  const dy = (p.y - o.y) / st.unitKm;
  const dz = (p.z - o.z) / st.unitKm;
  return { x: dx, y: dz, z: -dy };
}

/** A point in `from`'s frame, km, expressed in `to`'s frame at `tMs`. Null when it cannot be. */
function reframe(pKm, from, to, tMs) {
  if (from.frame === to.frame) return { x: pKm.x, y: pKm.y, z: pKm.z };
  const r = toStage(null, { x: pKm.x, y: pKm.y, z: pKm.z, frame: from.frame }, { frame: to.frame, tMs }, tMs);
  return finite3(r) ? { x: r.x, y: r.y, z: r.z } : null;
}

/**
 * Carry a camera pose from one stage to another.
 *
 * @param {{position, target, up}} pose  scene units and scene axes of `from`
 * @param {{frame, unitKm, originKm}} from
 * @param {{frame, unitKm, originKm}} to
 * @param {number} tMs  the instant: earth-inertial to sun-inertial moves with the Earth
 * @returns {{position, target, up, distance, distanceKm}|null} in `to`'s scene units, or null when
 *   the frames cannot be converted (the caller then cuts, as before)
 */
export function convertPose(pose, from, to, tMs) {
  if (!pose || !finite3(pose.position) || !finite3(pose.target) || !from || !to) return null;
  if (!(from.unitKm > 0) || !(to.unitKm > 0)) return null;
  const camKm = reframe(sceneToKm(pose.position, from), from, to, tMs);
  const tgtKm = reframe(sceneToKm(pose.target, from), from, to, tMs);
  if (!camKm || !tgtKm) return null;
  const position = kmToScene(camKm, to);
  const target = kmToScene(tgtKm, to);
  // The up is a DIRECTION: converted as the difference of two points a fixed arm apart, so only the
  // frames' rotation reaches it (scene/stage.js dirToScene does the same, for the same reason).
  let up = { x: 0, y: 1, z: 0 };
  if (finite3(pose.up)) {
    const arm = Math.max(1, Math.hypot(camKm.x - tgtKm.x, camKm.y - tgtKm.y, camKm.z - tgtKm.z));
    const tip = {
      x: pose.position.x + (pose.up.x * arm) / from.unitKm,
      y: pose.position.y + (pose.up.y * arm) / from.unitKm,
      z: pose.position.z + (pose.up.z * arm) / from.unitKm,
    };
    const tipKm = reframe(sceneToKm(tip, from), from, to, tMs);
    if (tipKm) {
      const t = kmToScene(tipKm, to);
      const n = Math.hypot(t.x - position.x, t.y - position.y, t.z - position.z);
      if (n > 0) up = { x: (t.x - position.x) / n, y: (t.y - position.y) / n, z: (t.z - position.z) / n };
    }
  }
  const distanceKm = Math.hypot(camKm.x - tgtKm.x, camKm.y - tgtKm.y, camKm.z - tgtKm.z);
  return { position, target, up, distance: distanceKm / to.unitKm, distanceKm };
}

/**
 * Which stage a camera belongs on next, or null to stay.
 *
 * @param {string} stageId  the stage it is on
 * @param {number} upKm     its distance from this stage's centre (the outward join reads this)
 * @param {number} downKm   its distance from the inward join's anchor (the inward join reads this)
 */
export function stageAfter(stageId, upKm, downKm, joins = JOINS) {
  const up = joins.find((j) => j.from === stageId);
  if (up && upKm > up.out_km) return up.to;
  const down = joins.find((j) => j.to === stageId);
  if (down && downKm < down.in_km) return down.from;
  return null;
}

/**
 * The chain's stage for a camera `dKm` from home that got there from `cameFrom` (a stage id, or
 * null for "from the inside"). Walks stageAfter until it settles, so it is the same rule.
 */
export function stageForDistance(dKm, cameFrom = null, joins = JOINS) {
  let id = cameFrom && (joins.some((j) => j.from === cameFrom || j.to === cameFrom)) ? cameFrom : joins[0].from;
  for (let i = 0; i <= joins.length; i++) {
    const next = stageAfter(id, dKm, dKm, joins);
    if (!next) break;
    id = next;
  }
  return id;
}

/** The band of distances a stage holds whichever way it was entered: [out of the join below, in of the join above]. */
export function restBand(stageId, joins = JOINS) {
  const below = joins.find((j) => j.to === stageId);
  const above = joins.find((j) => j.from === stageId);
  return { minKm: below ? below.out_km : 0, maxKm: above ? above.in_km : Infinity };
}

/**
 * Rest to rest, with a constant-speed middle: the integral of a trapezoid. `ramp` is the share of
 * the time spent speeding up, and again slowing down. In the middle equal steps of k are equal
 * steps of the result, which on a logarithmic climb is equal RATIOS of distance: the speed that
 * feels constant whether the step is a thousand kilometres or a thousand light-years.
 */
export function easeTrapezoid(k, ramp = 0.12) {
  const x = Math.min(1, Math.max(0, Number(k) || 0));
  const a = Math.min(0.5, Math.max(1e-6, ramp));
  const v = 1 / (1 - a); // the middle's speed, so the whole integrates to 1
  if (x < a) return (v * x * x) / (2 * a);
  if (x > 1 - a) return 1 - (v * (1 - x) * (1 - x)) / (2 * a);
  return v * (x - a / 2);
}

/** The distance `e` (0..1, already eased) of the way from d0 to d1, by ratio and not by difference. */
export function climbDistance(d0Km, d1Km, e) {
  if (!(d0Km > 0) || !(d1Km > 0)) return d1Km;
  const x = Math.min(1, Math.max(0, Number(e) || 0));
  return d0Km * Math.pow(d1Km / d0Km, x);
}

/** How long a climb takes at `msPerDecade` a factor of ten, held between a floor and a ceiling. */
export function climbMs(d0Km, d1Km, msPerDecade = 900, minMs = 1200, maxMs = 24000) {
  if (!(d0Km > 0) || !(d1Km > 0)) return minMs;
  const decades = Math.abs(Math.log10(d1Km / d0Km));
  return Math.min(maxMs, Math.max(minMs, decades * msPerDecade));
}

const smooth = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

/**
 * A climb between two stops looks at one thing when it leaves and at another when it arrives (the
 * Earth, then the Sun; the Sun, then the galaxy's centre). Moving the look-at point across at a
 * constant rate would swing the view while the camera is still close: 150 million km of pan from
 * 30 000 km out. So the share depends on the DISTANCE and nothing else: none while the camera is
 * nearer than two gaps between the two subjects (from there the gap is under 27 degrees wide), all
 * of it by two hundred gaps out (or by the far stop, when that is nearer): two factors of ten of
 * flight for the turn. A function of distance alone, so the way back retraces the way out.
 *
 * @param {number} dKm     the camera's distance from its look-at point now
 * @param {number} offKm   the gap between the two subjects
 * @param {number} nearKm  the distance at the near stop
 * @param {number} farKm   the distance at the far stop
 * @returns {number} 0 = the near stop's subject, 1 = the far stop's
 */
export function targetShare(dKm, offKm, nearKm, farKm) {
  if (!(farKm > nearKm) || !(dKm > 0)) return dKm >= farKm ? 1 : 0;
  if (dKm <= nearKm) return 0;
  if (dKm >= farKm) return 1;
  let lo = nearKm;
  let hi = farKm;
  if (offKm > 0) {
    hi = Math.min(farKm, Math.max(nearKm * 1.0001, 200 * offKm));
    lo = Math.max(nearKm, Math.min(2 * offKm, hi / 10));
  }
  if (!(hi > lo)) return dKm >= hi ? 1 : 0;
  return smooth(Math.log(dKm / lo) / Math.log(hi / lo));
}

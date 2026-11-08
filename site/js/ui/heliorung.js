// ui/heliorung.js -- the distance ladder's heliosphere rung (forge #148): one flight out to 300 AU from the
// Sun, then one turn round it to the side of the bubble, so the termination shock, the heliopause and the
// bow wave that scene/heliosphere.js draws are seen whole, nose and tail.
//
// Contract: goHeliosphere(ctx) -> Promise<boolean>   whether the flight was started
// Pure, for tests/test_heliorung.mjs: HELIO_RUNG, rungAu(aspect), rungDirEcl(), rungDirScene()
//
// Never at boot: the pad's and the headset's ladder step (ui/gamepad.js goRung) and the Stars tab's far-places
// row (ui/explore.js) import this on the press. It brings scene/heliosphere.js with it, which the frame loop
// would fetch at 40 AU anyway (main.js b200-f2-worlds).
//
// WHY 300 AU. The bubble is drawn whole from 60 AU (heliosphere.js FADE_AU), but from inside it the shells are
// all round the camera and say nothing; the heliopause's tail is drawn to twice its nose, about 240 AU, so 300
// AU is the nearest place the camera stands outside the two fitted surfaces, inside the illustrative bow wave
// (415 AU out to the side), and the issue's look run is from there. 300 AU is 4.5e10 km: on the Sun's stage,
// well inside its rest band (scene/handoff.js JOINS: the stellar rung starts at 1e12 km).
//
// PHONES: FARTHER ON A TALL SCREEN. Seen from the side the bubble is wide, not tall: from the heliopause's nose
// (115 AU) to its drawn tail (240) along the screen's width. A 1440 x 900 screen at 300 AU holds 200 AU either side
// of the Sun; a 390 x 844 phone held upright holds 57, and its look run (2026-11-07) at 300 AU showed the inner planets
// inside a wash of shell with all four crossings off its edges. So on a screen narrower than HELIO_RUNG.aspectFull wide to
// tall the camera stands back by that share (rungAu), to at most HELIO_RUNG.maxAu: a phone upright is 844 AU out, where the nose and the four marks fit and the
// bubble is still drawn whole (heliosphere.js has no far fade). Landscape screens are at 300 AU.
//
// WHY FROM THE SIDE, 30 DEGREES UP. Seen down the nose the bubble is three concentric rings and its shape, the
// thing the model is about, is gone; seen edge-on to the ecliptic the planets' orbits are one line. So the
// camera stands square to the nose (IBEX's upwind direction, heliosphere.js HELIO.nose), raised 30 degrees
// towards the ecliptic's north: the nose on the left, the tail on the right, the Sun's arrow pointing left,
// both Voyagers' crossings in sight (Voyager 1 went out 35 degrees north, Voyager 2 36 south). The direction is
// fixed against the stars and not the date, so the picture is the same picture every visit.
//
// LESS MOTION. scene/climb.js makes its flight one cut under one fade, and the rig's flyTo makes the turn a cut
// (scene/camera.js, prefers-reduced-motion): the visitor arrives without a sweep.
//
// HONESTY. Nothing new is drawn here; the shells carry their own "modelled" chip and legend with the sources.

import { stage, SUN_INERTIAL, isLadderStage } from '../scene/stage.js';
import { KM_PER_AU, HELIO, eclDir, toScene } from '../scene/heliosphere.js';

export const HELIO_RUNG = {
  /** The camera's distance from the Sun on a screen at least aspectFull wide to tall, AU. */
  au: 300,
  /** Narrower than this (width over height), the camera stands back by the share it is narrower. */
  aspectFull: 1.3,
  /** And no farther than this, AU. */
  maxAu: 1000,
  /** Raised this far from square to the nose, towards the ecliptic's north, degrees. */
  upDeg: 30,
  /** The turn round the Sun after the flight, ms (none under reduced motion). */
  turnMs: 2400,
  /** The layer the bubble is drawn with: the Voyagers' own (heliosphere.js update). */
  layer: 'deep-space',
};

/** The camera's distance from the Sun for a screen `aspect` (width over height) wide, AU. Pure. */
export function rungAu(aspect) {
  const a = Number(aspect);
  if (!(a > 0)) return HELIO_RUNG.au;
  return Math.min(HELIO_RUNG.maxAu, HELIO_RUNG.au * Math.max(1, HELIO_RUNG.aspectFull / a));
}

/** From the Sun towards the camera, an ecliptic unit vector: square to the nose, raised `upDeg` north. Pure. */
export function rungDirEcl(nose = eclDir(HELIO.nose.lonDeg, HELIO.nose.latDeg), upDeg = HELIO_RUNG.upDeg) {
  // side = north x nose: in the ecliptic, square to the nose; seen from it with north up, the nose is on the left.
  const sx = -nose[1]; const sy = nose[0];
  const s = Math.hypot(sx, sy) || 1;
  // north, less its share along the nose, so the raise stays square to the nose as well.
  const nx = -nose[2] * nose[0]; const ny = -nose[2] * nose[1]; const nz = 1 - nose[2] * nose[2];
  const n = Math.hypot(nx, ny, nz) || 1;
  const c = Math.cos((upDeg * Math.PI) / 180); const k = Math.sin((upDeg * Math.PI) / 180);
  const v = [c * sx / s + k * nx / n, c * sy / s + k * ny / n, k * nz / n];
  const m = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / m, v[1] / m, v[2] / m];
}

/** The same direction on the Sun's stage, as {x, y, z} scene axes. Pure. */
export function rungDirScene() {
  const [x, y, z] = toScene(rungDirEcl());
  return { x, y, z };
}

const onChain = (id) => id === 'earth' || id === 'sun' || isLadderStage(id);

/** Fly to the heliosphere rung. Resolves true once the flight is under way, false when it could not start. */
export async function goHeliosphere(ctx) {
  if (!ctx || typeof ctx.wantClimb !== 'function') return false;
  if (typeof ctx.selected === 'function' && ctx.selected() && typeof ctx.deselect === 'function') ctx.deselect();
  // From the ground there is no flight (main.js select): the rung is a journey, so it leaves the ground first.
  if (ctx.skyView && ctx.skyView.active && typeof ctx.skyView.exit === 'function') ctx.skyView.exit();
  if (typeof ctx.isLayerOn === 'function' && !ctx.isLayerOn(HELIO_RUNG.layer) && typeof ctx.setLayerOn === 'function') ctx.setLayerOn(HELIO_RUNG.layer, true);
  if (typeof ctx.wantHeliosphere === 'function') ctx.wantHeliosphere();
  // A planet's own stage or a star system's is off the chain the climb runs along: the Sun's is one rung, a cut.
  if (!onChain(stage.worldId) && typeof ctx.setStage === 'function') ctx.setStage('sun');
  const climb = await ctx.wantClimb();
  if (!climb) return false;
  const rig = ctx.cameraRig;
  const now = () => (ctx.clock && typeof ctx.clock.now === 'function' ? ctx.clock.now() : Date.now());
  const sunAt = () => stage.toScene({ x: 0, y: 0, z: 0 }, SUN_INERTIAL, now());
  const cam = ctx.camera || null;
  const km = rungAu(cam && cam.aspect) * KM_PER_AU;
  return climb.to({
    distanceKm: km,
    stage: 'sun',
    toPos: sunAt,
    onArrive: (reason) => {
      if (reason !== 'done' || !rig || stage.worldId !== 'sun') return;
      const at = sunAt();
      if (!at) return;
      rig.flyTo({ targetScene: at, distance: km / stage.unitKm, offset: rungDirScene(), ms: HELIO_RUNG.turnMs, ease: 'inout', targetDelay: 0 });
    },
  });
}

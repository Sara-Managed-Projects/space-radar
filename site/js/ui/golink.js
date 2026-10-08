// ui/golink.js -- `#go=<id>`: the place a short link names is met by one slow push-in, and then
// the controls are the visitor's (internal #466).
//
// Contract: land(ctx, id) -> boolean      whether the push-in started
//           landingPlan({ distance, reducedMotion }) -> { from, to, ms, turn, ease } | null,  zoomAt(u)
//
// A short video of a world ends on "Fly there: spaceradar.ai", and its post carries `#go=europa`.
// Somebody who follows it should meet the thing they just watched: the world a point among the
// stars, then growing until it is where the app's own arrival puts it, with its card open beside
// it. So the END of the move is the app's (main.js flyToRecord: the lit face, the free part of the
// screen, a station against the limb) and only the way there is this file's (landingPlan, below).
//
// THE CONTROLS ARE THE VISITOR'S THE WHOLE TIME. The move is one camera flight, and the rig ends
// a flight the moment the canvas is touched (scene/camera.js). Nothing is locked and nothing waits.
//
// REDUCED MOTION: no travel. The visitor is put at the arrival, as every other link does.
//
// Imported by main.js only for a link that says `go=`.

/** How many times the arrival distance the camera starts from, for how long, and how far it turns. */
export const LAND_FROM = 40;
export const LAND_MS = 6500;
export const LAND_TURN_RAD = 0.5;
/** The power the way in is bent by: quick out of the dot, at rest on arrival. */
export const ZOOM_POWER = 2.2;

/** How far along the way in, 0..1, at `u` of the move's time. Pure. */
export function zoomAt(u) {
  return 1 - (1 - Math.min(1, Math.max(0, u))) ** ZOOM_POWER;
}

/** The move, or null under reduced motion (the visitor is put there and the camera does not travel). Pure. */
export function landingPlan({ distance, reducedMotion = false } = {}) {
  if (reducedMotion || !(distance > 0)) return null;
  return { from: distance * LAND_FROM, to: distance, ms: LAND_MS, turn: LAND_TURN_RAD, ease: zoomAt };
}

export function land(ctx, id) {
  const rig = ctx.cameraRig;
  // The app's own way in: the layer switched on, the stage chosen, the card opened, the camera sent.
  ctx.openAt(id);
  const record = ctx.selected && ctx.selected();
  // Nothing by that name yet (a planet whose table lands later is opened when it has): the app's
  // own flight stands, and its note says so when nothing ever answers to the name.
  if (!record || !rig || !rig.state.flying) return false;
  const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  rig.finishFlight();
  const end = { azimuth: rig.state.azimuth, polar: rig.state.polar, distance: rig.state.distance };
  const plan = landingPlan({ distance: end.distance, reducedMotion: reduced });
  if (!plan) return false;
  rig.flyTo({ distance: plan.from, azimuth: end.azimuth - plan.turn, polar: end.polar, ms: 0 });
  rig.flyTo({
    distance: plan.to, azimuth: end.azimuth, polar: end.polar, ms: plan.ms, ease: plan.ease, targetDelay: 0,
    // A squeezed planet is drawn larger from far away (scene/worlds.js): once there, the app's own
    // arrival is asked for again, and moves the camera only if the framing is off.
    onArrive: (reason) => { if (reason === 'done' && ctx.selected() === record) ctx.flyToRecord(record, 500); },
    onCancel: () => {},
  });
  return true;
}

// scene/gestures.js -- the small rules of pointer, wheel and key input, pure so a test can hold each one
// (internal #433-#440, review of 16 Nov 2026). camera.js and main.js take their numbers and decisions from here.
import { TAP_SLOP_PX } from './pickrank.js';

/**
 * How far a pointer travels before it is a drag. It IS the tap's slop, so one gesture is a tap or a drag and never
 * both: a click that slips 3 px used to select AND turn the camera, and cancelled a flight at the first pixel.
 */
export const DRAG_START_PX = TAP_SLOP_PX;

/** A trackpad pinch arrives as wheel events with ctrlKey set and deltas of a few units each (a mouse notch is 100): scale them. */
export const PINCH_WHEEL_GAIN = 10;
/** No single wheel event moves the log distance more than this (a fast flick or a page-sized line delta). */
export const WHEEL_MAX_LOG = 0.7;

/** 'touch' for a finger; a mouse and a pen are exact. */
export const pointerKind = (pointerType) => (pointerType === 'touch' ? 'touch' : 'mouse');

/** Has a pointer that went down travelled far enough to be a drag? `dist` in CSS px. */
export function dragStarted(pointerType, dist) {
  return dist > DRAG_START_PX[pointerKind(pointerType)];
}

/** Only the primary button taps. A right or middle click does nothing on the map (a right drag is still the pan). */
export function isPrimaryPress(e) {
  return !!e && (e.button === 0 || e.button === undefined) && e.isPrimary !== false;
}

/** The change in log distance one wheel event asks for (positive is farther). */
export function wheelLogDelta(e) {
  // deltaMode 1 is lines, 2 is pages.
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
  const raw = ((e.deltaY || 0) * unit * (e.ctrlKey ? PINCH_WHEEL_GAIN : 1)) / 600;
  return Math.max(-WHEEL_MAX_LOG, Math.min(WHEEL_MAX_LOG, raw));
}

/**
 * Do the camera keys belong to the map right now? Only when the key lands on the canvas or the page itself;
 * inside a panel, dialog or list (a button, a link, a scrolling region) the keys are that panel's.
 */
export function keysBelongToMap(target, canvas) {
  if (!target || !target.tagName) return true; // the window or the document
  if (canvas && target === canvas) return true;
  const tag = String(target.tagName).toLowerCase();
  return tag === 'body' || tag === 'html' || tag === 'canvas';
}

/** The shift of the target, in the units of one pixel at the target plane, that keeps the point under the pointer under it. */
export function zoomPanFraction(logDelta) {
  return 1 - Math.exp(logDelta);
}

/**
 * Selecting WITHOUT a flight (a mission's event step, Undo, a trip's stop) used to follow the object at once, a
 * cut from wherever the camera was (25 billion km away, in the review). It follows only when the object is already
 * about where the camera looks: within `FOLLOW_REACH` camera distances of the target. Farther away the camera stays,
 * and the HUD's chevron points the way.
 */
export const FOLLOW_REACH = 6;
export function followIsNear(objectToTarget, cameraDistance) {
  if (!(objectToTarget >= 0) || !(cameraDistance > 0)) return true; // unknown: do what was always done
  return objectToTarget <= cameraDistance * FOLLOW_REACH;
}

/**
 * Where to stand to meet a craft that orbits a planet, with the planet in the picture. `generic` is the
 * deep-space arrival (350 000 km); `r` the craft's distance from the planet's centre and `R` the planet's
 * drawn radius, in one unit. Three times the larger of the two puts the planet's whole disc and the
 * craft in view; never farther than the generic arrival. Null when the pair is not credible (the planet is
 * drawn somewhere else than the craft, as for a far planet in an enlarged view): the caller keeps `generic`.
 */
export function orbiterArrival({ generic, r, R }) {
  if (!(R > 0) || !(r > 0) || !(generic > 0)) return null;
  if (r > 60 * R) return null;
  return Math.min(generic, 3 * Math.max(r, R));
}

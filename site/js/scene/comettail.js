// scene/comettail.js -- how bright a comet's tail is drawn against its distance from the Sun (internal #47). Pure and tiny on purpose:
// scene/models.js (the model ribbons) and scene/cometfield.js (the field's tails) both read it, and neither may import the other
// (models.js is not in the first visit; cometfield.js would pull it and its imports in with it).

/**
 * A tail's brightness against the comet's distance from the Sun (internal #47, public #550). Sunlight on the tail
 * falls as the inverse square of the distance, so the tail is drawn at full strength inside COMET_TAIL_NEAR_AU
 * and dims as (NEAR / au)^2 beyond it, down to COMET_TAIL_FLOOR, so a selected comet far out is still seen.
 * ILLUSTRATIVE: the law's two numbers are ours (a real tail also brightens steeply as the ice turns to gas),
 * and the card already says the tail's shape is drawn. NaN (no known distance) is full strength. Pure.
 */
export const COMET_TAIL_NEAR_AU = 0.8;
export const COMET_TAIL_FLOOR = 0.2;
export function cometTailGain(au) {
  if (!Number.isFinite(au)) return 1;
  const g = au > 0 ? (COMET_TAIL_NEAR_AU / au) ** 2 : 1;
  return Math.min(1, Math.max(COMET_TAIL_FLOOR, g));
}


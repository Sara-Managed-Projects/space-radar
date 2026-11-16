// One mark per object. An object with a 3D model on screen is drawn as that model; without one,
// as its dot. The maintainer, 2026-09-20: "we shouldn't repeat the dot with 3d object if 3d object rendered
// on screen, if not - dot". Pure functions, so the rule can be tested without a GPU.

/**
 * How much of a record's model is on screen, 0..1.
 * @param {{obj?: {visible?: boolean}, fadeStart?: number|null}|undefined} entry heroes.js's entry
 * @param {boolean} layerVisible whether the whole hero layer is drawn
 * @param {number} tMs the frame's clock
 * @param {number} fadeMs the fade-in length
 */
export function modelOpacity(entry, layerVisible, tMs, fadeMs) {
  if (!layerVisible || !entry || !entry.obj || !entry.obj.visible) return 0;
  if (entry.fadeStart == null) return 1;
  if (!(fadeMs > 0)) return 1;
  return Math.min(1, Math.abs(tMs - entry.fadeStart) / fadeMs);
}

/** The dot's opacity once it has yielded to its model. Garbage in is "no model": the dot stays. */
export function dotOpacity(base, model) {
  const m = Number.isFinite(model) ? Math.min(1, Math.max(0, model)) : 0;
  return base * (1 - m);
}

// ---------------------------------------------------------------------------------------------------------------
// THE PLANETS WIN ON THE SUN'S STAGE (internal #441, the review of 2026-11-16).
//
// MEASURED on the Planets tab at 1440x900 with the whole Solar System framed: about sixty comet, asteroid and
// spacecraft marks, each 9 or 10 px across whatever the zoom, lay inside a circle 120 px wide over Mercury, Venus,
// the Earth and Mars (discs of a pixel), "Earth" was printed across white comet glyphs and a comet's name ran through
// the pile. From that far the small bodies are one crowd at the Sun, and the view is the planets'.
//
// So a small-body or spacecraft mark on the Sun's stage gives way by HOW FAR FROM THE SUN IT STANDS ON THE SCREEN:
// its distance from the Sun over its distance from the camera, in pixels. Inside CROWD_PX[0] it is a faint speck
// (CROWD_FLOOR of its size and opacity), from CROWD_PX[1] out it is drawn whole; wheel in and the crowd spreads,
// so the marks come back by themselves. Voyager, 160 AU out, is never in the crowd. The mark stays where it is and
// can still be tapped, searched and switched in What to show; the selection is always drawn whole.
// A display rule, ours: illustrative, like every mark's size (scene/glyphs.js GLYPH_SIZE_PX).
// ---------------------------------------------------------------------------------------------------------------

/** The layers whose marks give way to the planets on the Sun's stage (data/layers.js ids). */
export const CROWD_LAYERS = new Set(['comets', 'asteroids', 'pha', 'deep-space']);
/** A mark's distance from the Sun on the screen, CSS px: [a speck up to here, whole from here]. */
export const CROWD_PX = [150, 450];
/** What is left of a mark in the crowd: its share of its own size and of its own opacity. */
export const CROWD_FLOOR = { size: 0.45, opacity: 0.35 };
/** A name is printed only for a mark drawn at least this whole (ui/labels.js). */
export const CROWD_NAMED_FROM = 0.5;

/**
 * How whole a mark is drawn, 0 (in the crowd at the Sun) to 1 (clear of it). Pure.
 * `sunUnits` is its distance from the Sun and `camUnits` from the camera, in the same units; `focalPx` the
 * camera's focal length in CSS px (half the viewport's height over tan(fov / 2)). Garbage in is 1: drawn whole.
 */
export function crowdShare(sunUnits, camUnits, focalPx) {
  if (!(sunUnits >= 0) || !(camUnits > 0) || !(focalPx > 0)) return 1;
  const px = (sunUnits / camUnits) * focalPx;
  const u = Math.min(1, Math.max(0, (px - CROWD_PX[0]) / (CROWD_PX[1] - CROWD_PX[0])));
  return u * u * (3 - 2 * u);
}

/** A crowd share as the factor on a mark's size or opacity (`floor` is CROWD_FLOOR's). Pure. */
export function crowdFactor(share, floor) {
  return floor + (1 - floor) * Math.min(1, Math.max(0, share));
}

// One mark per object. An object with a 3D model on screen is drawn as that model; without one,
// as its dot. Ivan, 2026-09-20: "we shouldn't repeat the dot with 3d object if 3d object rendered
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

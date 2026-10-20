// ui/photopresets.js -- photo presets (0077 W3-e, internal i#905, SR-PLAN-134), the table and the way to wear one.
//
// Contract: PHOTO_PRESETS, PRESET_IDS, presetOf(id), applyPhotoPreset(ctx, preset) -> restore()
//
// Not at boot, and not in scene/exposure.js with the shutter and the look it sets: the boot graph's byte budget
// (registry/budgets.yaml deployed_boot_js_bytes) has no room for four presets nobody has asked for yet, so ui/sharesheet.js
// imports this when the sheet opens. The shutter's and the look's `hold` and `release` are in scene/exposure.js.
import { EXPOSURES, DRAWN } from '../scene/exposure.js';

// WHAT A PRESET IS.
//
// A named way to set up one kind of picture: the frame's shape, the lens, the shutter, the look and whether the
// object's tag is on it. Each is a handful of the settings photo mode already has (ui/photomode.js: shape, lens,
// caption, the tag) and the two scene/exposure.js owns (Eye, Camera, Deep; Measured or Film). Nothing is a new effect:
// "a cinematic grade with bloom" is Ivan's decision D2 (public #261) and the design contract refuses a post
// pass (tests/test_contract.mjs), so the cinematic frame is a wide frame, a long lens and the Deep shutter, and
// the caption still says it is a drawing, as every picture's does.
//
//   science    16:9, the map's own lens, Camera, Measured: nothing generated, what is measured and modelled.
//   cinematic  16:9, a long lens (28 degrees), Deep, Film: the stretch an observatory gives a press picture.
//   telescope  square, the longest lens (15 degrees), Camera, Measured: the narrow field a telescope frames.
//   card       4:5, the map's own lens, as it is, the tag on: an object, its name and its facts, for one post.
//
// `lens: null` is the map's own and `exposure`/`look: null` leave what the visitor has. A preset is WORN while photo
// mode is open (the shutter by `hold`, the look by `set(look, false)`) and put back by the function applyPhotoPreset returns;
// neither is stored, so leaving by any way leaves the visitor's own settings as they were.
export const PHOTO_PRESETS = {
  science: { shape: '16:9', lens: null, exposure: 'camera', look: 'measured', tag: false },
  cinematic: { shape: '16:9', lens: 28, exposure: 'deep', look: 'film', tag: false },
  telescope: { shape: '1:1', lens: 15, exposure: 'camera', look: 'measured', tag: false },
  card: { shape: '4:5', lens: null, exposure: null, look: null, tag: true },
};
export const PRESET_IDS = Object.keys(PHOTO_PRESETS);

/** A preset by id, or null. Pure. */
export function presetOf(id) {
  return Object.prototype.hasOwnProperty.call(PHOTO_PRESETS, id) ? { id, ...PHOTO_PRESETS[id] } : null;
}

/**
 * Wear a preset's shutter and look. Returns the function that puts both back (safe to call twice). The shape, the lens, the caption
 * and the tag are photo mode's own and go through its options (ui/sharesheet.js hands them over). The shutter is held (the trip stop's
 * own mechanism: never stored, released); the look is set for the page without writing it (`set(look, false)`), and set back the same way.
 */
export function applyPhotoPreset(ctx, preset) {
  let held = false;
  let was = null;
  if (preset && ctx && ctx.exposure && typeof ctx.exposure.hold === 'function' && EXPOSURES.includes(preset.exposure)) held = ctx.exposure.hold(preset.exposure);
  if (preset && ctx && ctx.drawn && DRAWN.includes(preset.look) && ctx.drawn.mode() !== preset.look) {
    was = ctx.drawn.mode();
    ctx.drawn.set(preset.look, false);
  }
  let done = false;
  return () => {
    if (done) return;
    done = true;
    if (held && typeof ctx.exposure.release === 'function') ctx.exposure.release();
    if (was) ctx.drawn.set(was, false);
  };
}

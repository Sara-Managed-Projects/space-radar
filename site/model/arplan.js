// The viewer's "View in your room" (forge #559): which way into AR this device has, and at what size. Pure, so
// tests/test_model_ar.mjs can hold every branch without a phone; site/model/ar.js runs the session itself.
//
// THE WAYS IN, AND THE ONES NOT TAKEN (checked 2026-11-24):
//   webxr     the browser's own WebXR `immersive-ar` session with `hit-test` (Chrome on Android with Google Play
//             Services for AR), drawn by the page's own three.js: nothing is fetched that the viewer did not
//             already have, and nothing at all from anyone else.
//   open-top  the same, when the viewer is in a frame that may not use the camera (an <iframe> without
//             allow="xr-spatial-tracking"): the button opens the viewer on its own page, where the phone may.
//   ios       iPhone and iPad: Safari has no WebXR AR, and AR Quick Look reads only USDZ (or Reality) files. Space
//             Radar makes none yet, so there is no button that would fail: a note says so. The plan for USDZ is
//             internal spec "USDZ for Quick Look" (forge #559).
//   how       anything else (a computer, a phone without Google Play Services for AR): a note says where it works.
//   Scene Viewer (Google's AR app, by an intent:// link) is NOT offered: its documentation lists glTF 2.0 with
//   KHR_materials_unlit and KHR_texture_transform as the extensions it reads
//   (https://developers.google.com/ar/develop/scene-viewer, read 2026-11-24), and every file of ours requires
//   KHR_mesh_quantization and almost every one EXT_meshopt_compression. A link that opens an app which then
//   refuses the file is worse than no link.
//
// THE SIZE. glTF's unit is the metre (the glTF 2.0 specification, section 3.4), and our builders build in metres:
// a CubeSat 1U is 0.11 m across, AEHF 29.8 m over its wings. So "real size" is the file as it is, scale 1. The
// catalog's published size (`size_m`, scripts/models_catalog.py) is what lets the page SAY "real size": a model with
// one is checked against it by the test (no file is ten times off), a model without one is "the size we built it".
// A craft bigger than ROOM_SWITCH_M can also be drawn ROOM_M across, and the line says how many times smaller.

export const ROOM_M = 1.5;
export const ROOM_SWITCH_M = 2;

/** iPhone, iPad, iPod, or an iPad that says it is a Mac (iPadOS 13+ asks for desktop pages). */
export function isIOS(ua = '', platform = '', touchPoints = 0) {
  return /\b(iPhone|iPad|iPod)\b/.test(ua) || (platform === 'MacIntel' && touchPoints > 1);
}

/**
 * The way in: 'webxr' | 'open-top' | 'ios' | 'how'.
 * `xr`: what navigator.xr.isSessionSupported('immersive-ar') answered (false when it threw or there is no xr);
 * `framed`: the page is in a frame; `allowed`: the frame may use xr-spatial-tracking (true when the browser cannot say);
 * `android`: an Android browser.
 */
export function arWay({ xr = false, ios = false, android = false, framed = false, allowed = true } = {}) {
  if (xr && (!framed || allowed)) return 'webxr';
  if (framed && !allowed && android) return 'open-top';
  if (ios) return 'ios';
  return 'how';
}

/** The largest side of a box's size {x, y, z}, in the file's units (metres). */
export const widest = (size) => Math.max(Math.abs(size.x) || 0, Math.abs(size.y) || 0, Math.abs(size.z) || 0);

/** Whether the room size is offered: only a craft that would not fit as it is. */
export const offersRoom = (widestM) => widestM > ROOM_SWITCH_M;

/** The scale to draw at: 1 for 'real'; 'room' brings the widest side to ROOM_M (never makes a thing bigger). */
export function arScale(mode, widestM) {
  if (mode !== 'room' || !(widestM > 0)) return 1;
  return Math.min(1, ROOM_M / widestM);
}

/**
 * Whether a file agrees with the size the catalog publishes: the published number (often a body's length, not the
 * wings') is no more than a quarter over the file's widest side and no less than a twelfth of it. A file built in
 * centimetres, or in "one unit across", fails by a factor of ten or more.
 */
export function agrees(sizeM, widestM) {
  if (!(sizeM > 0) || !(widestM > 0)) return false;
  return sizeM <= widestM * 1.25 && sizeM >= widestM / 12;
}

/**
 * The line under the size switch, as {key, m, k}: words.js `arSizeReal` (a published size backs it),
 * `arSizeOwn` (none does) or `arSizeRoom` (drawn smaller: k times).
 */
export function sizeLine(mode, widestM, sizeM) {
  const s = arScale(mode, widestM);
  if (s < 1) return { key: 'arSizeRoom', m: widestM * s, k: Math.round(1 / s) };
  return { key: sizeM > 0 ? 'arSizeReal' : 'arSizeOwn', m: widestM, k: 1 };
}

/** The viewer's own address with ar=1, for the 'open-top' way (it opens on its own page, ready to press). */
export function topUrl(href) {
  const u = new URL(href);
  u.searchParams.set('ar', '1');
  return u.href;
}

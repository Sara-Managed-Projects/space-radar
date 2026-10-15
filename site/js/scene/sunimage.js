// scene/sunimage.js -- the Sun's face of the day: SDO's picture laid on the sphere (internal spec 0076 W1-d, #916).
//
// Contract: loadSunImage({ tier, load?, decode?, saveData? }) -> Promise<{ texture, observedMs, wavelengthA, file,
//             radiusUv, side, gpuBytes, dispose() } | null>
//           imageFrame(observedMs, earth, tMs, out?) -> { c, w, n }   where the picture was taken from, in the Sun's axes
//           imageUv(p, frame, radiusUv) -> [u, v]                     where a place on the sphere is in the picture
//           imageWeight(p, frame) -> 0..1                              how much of a place the picture covers
//           cropOf(sizePx, radiusPx, tier) -> { sx, sy, side, out }
//
// DEFERRED. scene/sun.js imports this the first time its detail comes on (never at boot,
// tests/test_boot_diet.mjs), and this reads the saved copy (data/sunactivity.js readSunImage) once.
//
// WHAT IS DRAWN, AND WHAT KIND OF CLAIM IT IS: MEASURED. The Solar Dynamics Observatory's AIA takes the
// whole Sun every twelve seconds in each of its channels; the browse archive keeps a 1 024-pixel JPEG of
// each channel every few minutes, and our harvester saves the newest 171 angstrom one (harvest/parsers/
// sdo_aia.py). 171 angstrom is extreme ultraviolet light from iron ions in gas near a million degrees: the
// loops and the bright active regions over the surface, not the surface itself. Its colour is SDO's own
// FALSE colour for that channel (the gold). It is drawn on the half of the Sun that faced the Earth at the
// moment it was taken (SDO circles the Earth, so its view is ours, north up as SDO publishes it), and
// turns with the Sun from there (data/sunregions.js spotDirection, the turning the spots already use).
// The far side, which no picture saw, stays the modelled photosphere (scene/sun.js), and the two are
// cross-faded over IMAGE_EDGE of the picture's own limb, where its pixels are stretched thinnest.
//
// THE PICTURE'S GEOMETRY. The Sun's radius in the picture is its angular radius that day over AIA's plate
// scale (data/sunactivity.js imageRadiusPx: 401 pixels in October); the picture is centred on the Sun to a
// few pixels (measured on the picture of 2026-10-15 16:56:58: the limb's brightest ring at 402 to 405 pixels
// from the middle in every direction). A place p on the unit sphere is at x = p.w, y = p.n in Sun radii,
// with c the direction it was seen from, w = n x c to the right (west) and n the Sun's north laid square
// to c. Orthographic: from 1 au the Sun is a quarter of a degree and a perspective would differ by 1/215.
//
// WHAT IS DONE TO IT. Cropped to the disc and a margin (cropOf), so the texture is 832 pixels square
// (3.7 MB with its mipmaps; 512 at tier 0, 1.4 MB); drawn IMAGE_GAIN times brighter than the JPEG so that
// it sits beside the drawn far side (the JPEG is already stretched for a screen by SDO; it is not a
// measurement of brightness). The card says when it was taken, in which light, and whose it is.
//
// OFFLINE, OR NO COPY: null, and scene/sun.js draws the modelled disc it drew before. Nothing is fetched
// from SDO by a visitor's browser.

import * as THREE from '../../vendor/three.module.min.js';
import { readSunImage, parseSunImage, imageRadiusPx } from '../data/sunactivity.js';
import { spotDirection } from '../data/sunregions.js';

/** Pixels kept round the disc when it is cropped, so the limb's own ring is not cut. */
export const IMAGE_MARGIN_PX = 14;
/** The side of the texture at tier 0, pixels (the disc is resized to it). */
export const IMAGE_PHONE_PX = 512;
/** How much brighter than SDO's JPEG the picture is drawn (a JPEG stretched for a screen, not a measurement). */
export const IMAGE_GAIN = 1.8;
/** The picture fades in between these cosines from the place it was seen from: its own limb, stretched thinnest. */
export const IMAGE_EDGE = [0.1, 0.32];

const RAD = Math.PI / 180;

/** Where to cut the disc out of a picture `sizePx` square: a square `side` about its middle, drawn `out` square. Pure. */
export function cropOf(sizePx, radiusPx, tier = 1) {
  const side = Math.min(sizePx, 2 * Math.ceil(radiusPx + IMAGE_MARGIN_PX));
  const sx = Math.floor((sizePx - side) / 2);
  return { sx, sy: sx, side, out: tier <= 0 ? Math.min(IMAGE_PHONE_PX, side) : side };
}

/** GPU bytes of a square RGBA texture with its mipmaps. */
export function textureBytes(side) { return Math.round(side * side * 4 * 4 / 3); }

/**
 * Where the picture of `observedMs` was taken from, in the Sun's own axes at `tMs` (+Y its north): `c` the
 * direction toward SDO then, `w` the picture's right (west), `n` its up (north, square to c). `earth` is
 * the Earth's direction now in the same axes (scene/sun.js `_e`), with its latitude: the picture's middle
 * is the place under the Earth when it was taken, carried round by the turning since. Pure.
 */
export function imageFrame(observedMs, earth, tMs, out = { c: [0, 0, 1], w: [1, 0, 0], n: [0, 1, 0] }) {
  const latDeg = Math.asin(Math.max(-1, Math.min(1, earth[1]))) / RAD;
  const c = spotDirection({ observedMs, latDeg, eastDeg: 0 }, earth, tMs, out.c);
  if (!c) return null;
  // n: the Sun's north (0, 1, 0) less its part along c; w = n x c.
  let nx = -c[1] * c[0], ny = 1 - c[1] * c[1], nz = -c[1] * c[2];
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len; ny /= len; nz /= len;
  out.n[0] = nx; out.n[1] = ny; out.n[2] = nz;
  out.w[0] = ny * c[2] - nz * c[1];
  out.w[1] = nz * c[0] - nx * c[2];
  out.w[2] = nx * c[1] - ny * c[0];
  return out;
}

/** Where a place `p` on the unit sphere is in the picture, as texture coordinates (top row at v 0). Twin of the GLSL. */
export function imageUv(p, frame, radiusUv) {
  const x = p[0] * frame.w[0] + p[1] * frame.w[1] + p[2] * frame.w[2];
  const y = p[0] * frame.n[0] + p[1] * frame.n[1] + p[2] * frame.n[2];
  return [0.5 + radiusUv * x, 0.5 - radiusUv * y];
}

/** How much of the place `p` the picture covers: 0 on the far side and at its own limb, 1 toward its middle. Twin of the GLSL. */
export function imageWeight(p, frame) {
  const seen = p[0] * frame.c[0] + p[1] * frame.c[1] + p[2] * frame.c[2];
  const k = Math.min(1, Math.max(0, (seen - IMAGE_EDGE[0]) / (IMAGE_EDGE[1] - IMAGE_EDGE[0])));
  return k * k * (3 - 2 * k);
}

function bytesOf(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** The browser's own decoder: the crop and the resize in one step, off the main thread where it can be. */
async function decodeInBrowser(bytes, contentType, crop) {
  if (typeof createImageBitmap !== 'function' || typeof Blob !== 'function') return null;
  const blob = new Blob([bytes], { type: contentType });
  return createImageBitmap(blob, crop.sx, crop.sy, crop.side, crop.side,
    { resizeWidth: crop.out, resizeHeight: crop.out, resizeQuality: 'high', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
}

/**
 * Read the saved picture and make its texture. Resolves null (never rejects) when there is no copy, it is
 * not one, the connection asked to save data, or the browser cannot decode it: the modelled disc then stays.
 * @param {object} [opts]
 * @param {number} [opts.tier]
 * @param {Function} [opts.load]     data/sources.js load, for tests
 * @param {Function} [opts.decode]   (bytes, contentType, crop) -> Promise<ImageBitmap-like>, for tests
 * @param {boolean} [opts.saveData]  the connection asked to save data (default: navigator.connection.saveData)
 */
export async function loadSunImage(opts = {}) {
  const tier = Number.isFinite(opts.tier) ? opts.tier : 1;
  const saveData = opts.saveData != null ? !!opts.saveData
    : !!(typeof navigator !== 'undefined' && navigator.connection && navigator.connection.saveData);
  if (saveData) return null;
  let pic = null;
  try { pic = parseSunImage(await readSunImage(opts.load ? { load: opts.load } : {})); } catch { pic = null; }
  if (!pic) return null;
  const radiusPx = imageRadiusPx(pic.observedMs, pic.sizePx);
  const crop = cropOf(pic.sizePx, radiusPx, tier);
  let bitmap = null;
  try { bitmap = await (opts.decode || decodeInBrowser)(bytesOf(pic.base64), pic.contentType, crop); } catch { bitmap = null; }
  if (!bitmap) return null;
  const texture = new THREE.Texture(bitmap);
  texture.name = 'sun-sdo-' + pic.wavelengthA;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false; // an ImageBitmap is uploaded as it is: its top row is v 0 (imageUv)
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return {
    texture,
    observedMs: pic.observedMs,
    wavelengthA: pic.wavelengthA,
    instrument: pic.instrument,
    file: pic.file,
    // The Sun's radius as a share of the texture's side: the crop is about the picture's middle.
    radiusUv: radiusPx / crop.side,
    side: crop.out,
    bytes: pic.bytes,
    gpuBytes: textureBytes(crop.out),
    dispose() {
      texture.dispose();
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
    },
  };
}

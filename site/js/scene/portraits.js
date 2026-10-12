// scene/portraits.js -- the one real picture of a black hole, drawn at the black hole's place.
//
// Contract: createPortraits(scene) -> { show(record), clear(), update(camera, tMs, frameMs),
//   shown(), state(), dispose() }
// Pure, for tests/test_remaining_trips.mjs: portraitScale(share, fovDeg), PORTRAIT_SHARE,
//   feather(r), BLACK_POINT
//
// WHY. Two rows of registry/exotics.yaml carry the Event Horizon Telescope's picture (Sagittarius
// A* and M87*, CC BY 4.0, credited in CREDITS.md), and until this file it was on the object's card
// and nowhere in the scene: a trip about black holes flew to a mark in a field of stars (public
// #426, internal #366). A trip stop that says `portrait: true` (registry/tours.yaml) now has the
// picture drawn where the hole is, for as long as the stop is up.
//
// WHAT IT IS NOT, and the line under the card says each of these (ui/trip.js noteFor,
// copy/en.js trip.portraitLine):
//   - NOT TO SCALE. M87*'s ring is 42 millionths of an arcsecond across from Earth, a hundredth of
//     a light-year at its distance; from the stop's camera, hundreds of thousands of light-years
//     off, it would be far below a pixel. The picture is drawn at a fixed share of the view's
//     height instead (PORTRAIT_SHARE), whatever the distance, the way scene/heroes.js draws a
//     spacecraft at a constant angular size. That is the one exaggeration, and it is size only:
//     the CENTRE is the registry's measured place.
//   - NOT A VIEW FROM HERE. It is the picture as taken from Earth, in radio waves, turned to face
//     whichever way the camera looks.
//   - NOT LENSING. Nothing here bends the stars behind it; nothing in this app knows how to.
// And it is pasted on nothing else: check_registry.py refuses `portrait:` on a row with no image.
//
// NOTHING AT BOOT. main.js imports this file when a trip that has such a stop reaches its intro,
// and a picture's file (40 to 63 kB) is fetched when its stop arrives.

import * as THREE from '../../vendor/three.module.min.js';
import { propagate } from '../propagate/index.js';
import { stage } from './stage.js';

/** The picture's height as a share of the view's. */
export const PORTRAIT_SHARE = 0.4;
/** Display values at or under this are sky, and are taken to black, so adding the picture adds the ring and not a rectangle. */
export const BLACK_POINT = 14;
const FADE_MS = 700;
const BAKED_PX = 512;

/**
 * A sprite with `sizeAttenuation: false` is scaled by its distance in the shader, so `scale` is the
 * tangent of the angle it spans: this is the scale that makes it `share` of a view `fovDeg` tall.
 */
export function portraitScale(share, fovDeg) {
  return share * 2 * Math.tan((fovDeg * Math.PI) / 360);
}

/** The edge: whole inside 62 % of the half-width, gone at the rim. `r` is 0 at the centre, 1 at the rim. */
export function feather(r) {
  const k = Math.min(1, Math.max(0, (1 - r) / 0.38));
  return k * k * (3 - 2 * k);
}

/** The picture with its sky taken to black and its edge faded, as a canvas (null with no DOM). */
function bake(image) {
  if (typeof document === 'undefined') return null;
  const aspect = image.width / image.height || 1;
  const w = aspect >= 1 ? BAKED_PX : Math.round(BAKED_PX * aspect);
  const h = aspect >= 1 ? Math.round(BAKED_PX / aspect) : BAKED_PX;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(image, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h);
  const d = px.data;
  const half = Math.min(w, h) / 2;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const edge = feather(Math.hypot(x - w / 2, y - h / 2) / half);
      for (let c = 0; c < 3; c += 1) d[i + c] = Math.max(0, d[i + c] - BLACK_POINT) * (255 / (255 - BLACK_POINT)) * edge;
      d[i + 3] = 255;
    }
  }
  g.putImageData(px, 0, 0);
  return canvas;
}

export function createPortraits(scene) {
  const root = new THREE.Group();
  root.name = 'portraits';
  scene.add(root);
  const loader = new THREE.ImageLoader();
  const textures = new Map(); // file -> { texture, aspect } once loaded
  let record = null;
  let sprite = null;
  let opacity = 0;
  let want = 0;
  let status = 'off';

  function ensureSprite() {
    if (sprite) return sprite;
    // Additive, depth test off, like every other light on the sky (scene/nebulae.js THE BLEND).
    const material = new THREE.SpriteMaterial({
      transparent: true, opacity: 0, depthTest: false, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: false,
    });
    sprite = new THREE.Sprite(material);
    sprite.renderOrder = 4;
    sprite.frustumCulled = false;
    sprite.visible = false;
    root.add(sprite);
    return sprite;
  }

  function wear(entry) {
    const s = ensureSprite();
    s.material.map = entry.texture;
    s.material.needsUpdate = true;
    s.userData.aspect = entry.aspect;
    status = 'shown';
  }

  /** Draw `rec`'s picture at its place, fading in. A record with no `meta.image` shows nothing. */
  function show(rec) {
    const image = rec && rec.meta && rec.meta.image;
    if (!image || !image.file) { clear(); return false; }
    record = rec;
    want = 1;
    const file = String(image.file).replace(/^site\//, '');
    const have = textures.get(file);
    if (have) { wear(have); return true; }
    status = 'loading';
    loader.load(file, (img) => {
      const canvas = bake(img);
      if (!canvas) { status = 'failed'; return; }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const entry = { texture, aspect: canvas.width / canvas.height };
      textures.set(file, entry);
      if (record === rec) wear(entry);
    }, undefined, () => { if (record === rec) status = 'failed'; });
    return true;
  }

  /** Fade the picture out; it is gone, and its record forgotten, when the fade ends. */
  function clear() {
    want = 0;
  }

  function update(camera, tMs, frameMs) {
    if (!sprite) return;
    const step = Math.min(1, Math.max(0, Number(frameMs) || 16) / FADE_MS);
    opacity += Math.sign(want - opacity) * Math.min(Math.abs(want - opacity), step);
    const p = record && status === 'shown' ? propagate(record, tMs) : null;
    const pos = p ? stage.toScene(p, p.frame, tMs) : null;
    if (!pos || opacity <= 0) {
      sprite.visible = false;
      if (want === 0 && opacity <= 0) { record = null; if (status === 'shown') status = 'off'; }
      return;
    }
    sprite.position.copy(pos);
    const s = portraitScale(PORTRAIT_SHARE, camera && camera.fov ? camera.fov : 45);
    sprite.scale.set(s * (sprite.userData.aspect || 1), s, 1);
    sprite.material.opacity = opacity;
    sprite.visible = true;
  }

  return {
    show,
    clear,
    update,
    shown: () => (record && want === 1 ? record.id : null),
    state: () => ({ id: record ? record.id : null, status, opacity: +opacity.toFixed(3) }),
    dispose() {
      for (const entry of textures.values()) entry.texture.dispose();
      textures.clear();
      if (sprite) { sprite.material.dispose(); root.remove(sprite); sprite = null; }
      scene.remove(root);
    },
    root,
  };
}

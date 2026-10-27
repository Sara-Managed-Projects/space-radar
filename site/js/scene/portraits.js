// scene/portraits.js -- a black hole drawn where it is, in 3D (release 1.4.0, r14-mw-bh; until then the Event
// Horizon Telescope's photograph on a sprite).
//
// Contract: createPortraits(scene, opts) -> { show(record), clear(), update(camera, tMs, frameMs), shown(),
//   state(), dispose(), root }
// Pure, for tests/test_remaining_trips.mjs and tests/test_blackhole.mjs: portraitScale(share, fovDeg),
//   PORTRAIT_SHARE, isBlackHole(record)
//
// WHAT. A trip stop that says `portrait: true` (registry/tours.yaml), and a black hole's own card on a rung
// of the ladder, draw the hole at its place: scene/blackhole.js's shadow, photon ring and lensed, beamed disc,
// M87*'s jet, Cygnus X-1's supergiant. Every black hole and quasar in registry/exotics.yaml has one; there is
// no photograph in the scene. The card keeps the EHT's photograph of the two that have one, as the
// photograph beside the model (ui/cards.js).
//
// WHAT IT IS NOT, and the line under a trip stop says each (copy/en.js trip.portraitLine):
//   - NOT TO SCALE, from where a visitor stands. M87*'s shadow is 42 millionths of an arcsecond across from
//     Earth and Sagittarius A*'s 52; from a trip's camera, thousands of light-years off, either is far below a
//     pixel. So the hole is drawn at PORTRAIT_SHARE of the view's height when its true size is smaller, and
//     at its true size when the camera is near enough (scene/blackhole.js `magnification`). The PLACE is the
//     registry's measured one, and M87*'s long jet is also drawn at its true length, in its galaxy.
//   - NOT A PHOTOGRAPH: a model (the shadow and the bending are the mass's, the disc is modelled).
//   - THE STARS BEHIND ARE NOT BENT: that would need the sky drawn into a texture first (a render target).
//
// NOTHING AT BOOT. main.js imports this file when a trip that has such a stop reaches its intro or a black
// hole's card opens.

import * as THREE from '../../vendor/three.module.min.js';
import { stage } from './stage.js';
import { createBlackHole } from './blackhole.js';

/** The drawn hole's frame (its inner disc, or Cygnus X-1's orbit) as a share of the view's height. */
export const PORTRAIT_SHARE = 0.32;
const FADE_MS = 700;
const SUN_INERTIAL = 'sun-inertial';

/** The scale of something `share` of a view `fovDeg` tall, at unit distance (kept for the trip tests). */
export function portraitScale(share, fovDeg) {
  return share * 2 * Math.tan((fovDeg * Math.PI) / 360);
}

/** A record drawn by this file: a black hole or a quasar of registry/exotics.yaml. */
export function isBlackHole(record) {
  const k = record && record.klass === 'exotic' && record.meta ? record.meta.kind : null;
  return k === 'blackhole' || k === 'quasar';
}

export function createPortraits(scene, opts = {}) {
  const root = new THREE.Group();
  root.name = 'portraits';
  scene.add(root);
  const tier = () => (typeof opts.tier === 'function' ? opts.tier() : Number.isFinite(opts.tier) ? opts.tier : 1);
  const _out = new THREE.Vector3();
  const place = {
    tier: tier(),
    toScene: (km, out) => stage.toSceneInto(km, SUN_INERTIAL, out || _out),
    dirToScene: (v, out) => stage.dirToScene({ x: v[0], y: v[1], z: v[2] }, SUN_INERTIAL, out || new THREE.Vector3()),
    unitKm: () => stage.unitKm,
  };
  // The one drawn now and, while it fades out, the one before.
  let current = null; // { record, hole, opacity, want }
  const leaving = [];
  let status = 'off';

  /** Draw `rec` at its place, fading in. Anything but a black hole or a quasar shows nothing. */
  function show(rec) {
    if (!isBlackHole(rec) || !rec.pos) { clear(); return false; }
    if (current && current.record.id === rec.id) { current.want = 1; status = 'shown'; return true; }
    clear();
    let hole;
    try { hole = createBlackHole(rec, { ...place, tier: tier() }); } catch (e) { console.warn('black hole: could not draw', rec.id, e); status = 'failed'; return false; }
    root.add(hole.group);
    root.add(hole.trueGroup);
    current = { record: rec, hole, opacity: 0, want: 1 };
    status = 'shown';
    return true;
  }

  /** Fade it out; it is gone, and its record forgotten, when the fade ends. */
  function clear() {
    if (!current) return;
    current.want = 0;
    leaving.push(current);
    current = null;
  }

  function step(entry, frameMs) {
    const k = Math.min(1, Math.max(0, Number(frameMs) || 16) / FADE_MS);
    entry.opacity += Math.sign(entry.want - entry.opacity) * Math.min(Math.abs(entry.want - entry.opacity), k);
    entry.hole.setOpacity(entry.opacity);
  }

  function update(camera, tMs, frameMs) {
    if (!camera) return;
    for (let i = leaving.length - 1; i >= 0; i--) {
      const e = leaving[i];
      step(e, frameMs);
      if (e.opacity <= 0) { e.hole.dispose(); leaving.splice(i, 1); continue; }
      e.hole.update({ camera, share: PORTRAIT_SHARE, tMs });
    }
    if (!current) { if (status === 'shown') status = 'off'; return; }
    step(current, frameMs);
    current.hole.update({ camera, share: PORTRAIT_SHARE, tMs });
  }

  return {
    show,
    clear,
    update,
    shown: () => (current && current.want === 1 ? current.record.id : null),
    state: () => ({
      id: current ? current.record.id : null, status, opacity: current ? +current.opacity.toFixed(3) : 0,
      drawn: current ? current.hole.stats() : null,
    }),
    /** How many times larger than life the shown hole is drawn (1 = its true size). */
    magnification: () => (current ? current.hole.magnification() : 1),
    dispose() {
      if (current) current.hole.dispose();
      for (const e of leaving) e.hole.dispose();
      current = null; leaving.length = 0;
      scene.remove(root);
    },
    root,
  };
}

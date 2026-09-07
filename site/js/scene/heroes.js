// The near half of the two-renderings rule: glyphs when far, a cartoon model when close.
//
// scene/glyphs.js draws every object as a billboarded quad. This draws the handful the camera is
// actually near -- plus whatever is selected -- as real geometry from scene/models.js.
//
// THE SCALE PROBLEM, stated once because it decides the whole design:
// at the Earth stage one scene unit is 1000 km, so the station's real 109 m is 1.09e-7 units.
// Drawn true, every object in this app is invisible; drawn at a fixed unit size, an object near
// the camera swallows the planet. So a model is scaled to a constant ANGULAR size -- it occupies
// about the same number of pixels whatever the distance -- and the card carries the real size as
// a comparison chip instead ("about the size of a football field"). docs/design-language.md calls
// this out under "Distance": never show true size; show a real-size chip.
//
// That is a drawing decision, not a lie about position: the model's CENTRE is the propagated
// position, to the metre. Only its apparent size is chosen.

import * as THREE from '../../vendor/three.module.min.js';
import { modelFor, updateModelAttitude, setSunDirection, disposeModels } from './models.js';
import { propagate } from '../propagate/index.js';
import { stage } from './stage.js';

/** How many pixels tall a hero model should read as. Big enough to see it is a thing with parts. */
const TARGET_PX = 84;
const SELECTED_PX = 130;

/** How many models may exist at once. Each is a few draw calls; this is the phone budget. */
const POOL = 8;

/** Fade a model in over this, so it never pops. */
const FADE_MS = 200;

const _v = new THREE.Vector3();
const _camPos = new THREE.Vector3();

export function createHeroes(scene, ctx) {
  const root = new THREE.Group();
  root.name = 'heroes';
  // Heroes draw after the glyph layers so a model sits over its own dot rather than behind it.
  root.renderOrder = 10;
  scene.add(root);

  /** id -> {obj, record, fadeStart} */
  const live = new Map();

  function acquire(record) {
    const existing = live.get(record.id);
    if (existing) return existing;
    const obj = modelFor(record.klass, record.meta && record.meta.modelVariant);
    obj.userData.recordId = record.id;
    obj.visible = false;
    root.add(obj);
    const entry = { obj, record, fadeStart: null };
    live.set(record.id, entry);
    return entry;
  }

  function release(id) {
    const entry = live.get(id);
    if (!entry) return;
    root.remove(entry.obj);
    disposeModels(entry.obj);
    live.delete(id);
  }

  /**
   * Which records deserve geometry this frame: the selection always, then the nearest few inside
   * their layer's nearKm. Cheap because it only ever considers records already on screen.
   */
  function candidates(tMs) {
    const camera = ctx.camera;
    camera.getWorldPosition(_camPos);
    const selected = ctx.selected();
    const out = [];
    const seen = new Set();

    const consider = (record, forced) => {
      if (!record || seen.has(record.id)) return;
      const p = propagate(record, tMs);
      if (!p) return;
      const pos = stage.toScene(p, p.frame, tMs);
      const d = pos.distanceTo(_camPos);
      const layer = ctx.layers.find((l) => l.id === record.layer);
      const nearUnits = ((layer && layer.nearKm) || 2000) / stage.unitKm;
      if (!forced && d > nearUnits) return;
      seen.add(record.id);
      out.push({ record, pos, d, forced });
    };

    if (selected) consider(selected, true);
    for (const layer of ctx.layers) {
      if (!ctx.isLayerOn(layer.id)) continue;
      // A layer with thousands of members is not worth scanning for proximity every frame; the
      // glyph is the right drawing at that density anyway.
      const recs = ctx.recordsFor(layer.id);
      if (recs.length > 600) continue;
      for (const r of recs) consider(r, false);
      if (out.length > POOL * 3) break;
    }

    out.sort((a, b) => (b.forced ? 1 : 0) - (a.forced ? 1 : 0) || a.d - b.d);
    return out.slice(0, POOL);
  }

  function update(tMs) {
    const camera = ctx.camera;
    if (!camera) return;

    // Not in the sky view. From the ground a satellite IS a moving point of light -- drawing a
    // metre-accurate model of one hanging over the horizon would be a picture of something nobody
    // has ever seen, which is the failure this whole product is organised against. The glyph is
    // the honest drawing there.
    if (ctx.skyView && ctx.skyView.active) {
      for (const id of [...live.keys()]) release(id);
      return;
    }

    const sun = ctx.worlds && ctx.worlds.sunDirScene ? ctx.worlds.sunDirScene() : null;
    if (sun) setSunDirection(sun);

    const want = candidates(tMs);
    const wanted = new Set(want.map((c) => c.record.id));
    for (const id of [...live.keys()]) if (!wanted.has(id)) release(id);

    // pixels = (size / distance) * (viewportHeight / 2) * f, with f = 1 / tan(fovY / 2).
    const f = camera.projectionMatrix.elements[5];
    const h = (ctx.renderer && ctx.renderer.domElement && ctx.renderer.domElement.clientHeight) || 800;
    const selectedId = ctx.selected() ? ctx.selected().id : null;

    for (const c of want) {
      const entry = acquire(c.record);
      const obj = entry.obj;
      obj.position.copy(c.pos);

      const px = c.record.id === selectedId ? SELECTED_PX : TARGET_PX;
      const size = (px * 2 * c.d) / (h * f);
      obj.scale.setScalar(size);

      // Attitude wants the nadir direction: from the object toward the world's centre, which in
      // the stage frame is the origin.
      _v.copy(c.pos).multiplyScalar(-1).normalize();
      updateModelAttitude(obj, c.record, sun, _v);

      if (!obj.visible) {
        obj.visible = true;
        entry.fadeStart = tMs;
      }
      // Fade by opacity where the material allows it; a model that pops is the tell that this is
      // a swap rather than an approach.
      if (entry.fadeStart != null) {
        const k = Math.min(1, Math.abs(tMs - entry.fadeStart) / FADE_MS);
        obj.traverse((n) => {
          if (n.material && n.material.transparent !== undefined) {
            n.material.transparent = k < 1;
            n.material.opacity = k;
          }
        });
        if (k >= 1) entry.fadeStart = null;
      }
    }
  }

  return {
    update,
    count: () => live.size,
    setVisible(b) { root.visible = !!b; },
    dispose() {
      for (const id of [...live.keys()]) release(id);
      scene.remove(root);
    },
  };
}

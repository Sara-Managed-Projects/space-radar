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
import { modelFor, updateModelAttitude, setSunDirection, disposeModels, attachOddityModels } from './models.js';
import { realModelFor, loadRealModel } from './realmodels.js';
import { propagate } from '../propagate/index.js';
import { stage } from './stage.js';

/** How many pixels tall a hero model should read as. Big enough to see it is a thing with parts. */
const TARGET_PX = 84;
// The selected object is the one you flew across the solar system to look at, and now that the
// geometry is real there is something to look AT -- the station's trusses and radiators, Hubble's
// door, Voyager's dish and boom. 130 px showed a shape; 260 shows a machine.
const SELECTED_PX = 260;

/**
 * SIZE ON SCREEN, for launches only.
 *
 * Every hero is 84 px today whatever it is, which is the deliberate decision the header states.
 * For a rocket that throws away the one comparison a beginner can actually feel: an 18 m Electron
 * and a 121 m Starship are 6.7x apart, and drawing them identically is its own small untruth.
 *
 * Drawn true, one of them is unreadable -- Electron becomes a 12 px smudge, or Starship becomes
 * 560 px and swallows half the viewport and, through the docked-vehicle test below, every
 * neighbour with it. So the ratio is COMPRESSED by a square root and clamped: a true 6.7x range
 * becomes a drawn 2.3x. Starship is visibly the biggest thing in the sky and an Electron is still
 * an object with parts.
 *
 * The square root is a compression, not a measurement, and the precise claim goes where it
 * belongs: the card's size chip carries the true metres. A record with no `meta.sizeM` -- every
 * station, satellite, probe and telescope, and any launch drawn as a generic rocket -- returns
 * exactly the constant it returns today, so nothing but the launches layer changes.
 */
const REF_M = 60; // roughly the Falcon 9 / Ariane 6 median
function heroPixels(record, selected) {
  const base = selected ? SELECTED_PX : TARGET_PX;
  const m = record && record.meta && record.meta.sizeM;
  if (!Number.isFinite(m)) return base;
  return base * Math.min(1.45, Math.max(0.62, Math.sqrt(m / REF_M)));
}

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

  /** Records not drawn this frame because they sit inside another model (docked vehicles). */
  let lastHidden = [];

  function acquire(record) {
    const existing = live.get(record.id);
    if (existing) return existing;
    // A real-model entry may name a procedural shape (`build:`) instead of a file: that variant
    // is drawn now and there is nothing to upgrade to. Otherwise the record's own variant, if any.
    const early = realModelFor(record);
    const variant = early && early.build ? early.build : record.meta && record.meta.modelVariant;
    const obj = modelFor(record.klass, variant);
    obj.userData.recordId = record.id;
    obj.visible = false;
    // Whatever rides on this thing, as children of it. Two records in the app carry anything at
    // all, so this is a no-op for the rest -- but it is here rather than in the upgrade branch
    // below because a visitor on a slow connection should see the Golden Record on the
    // procedural Voyager too, not only on the one that finished downloading.
    attachOddityModels(obj, record.id);
    root.add(obj);
    const entry = { obj, record, fadeStart: null, upgraded: false };
    live.set(record.id, entry);

    // If NASA publishes this exact object, fetch it and swap it in when it arrives. The procedural
    // model is on screen in the meantime, so nothing waits and nothing pops into an empty orbit.
    const real = early;
    if (real && real.file) {
      entry.upgrading = true;
      loadRealModel(real).then((loaded) => {
        entry.upgrading = false;
        // The camera may have moved on while the file was in flight; if this entry was released,
        // throw the clone away rather than adding an orphan to the scene.
        if (!loaded || live.get(record.id) !== entry) return;
        const clone = loaded.clone(true);
        clone.userData.recordId = record.id;
        clone.userData.realModel = true;
        clone.position.copy(entry.obj.position);
        clone.scale.copy(entry.obj.scale);
        clone.quaternion.copy(entry.obj.quaternion);
        clone.visible = entry.obj.visible;
        root.remove(entry.obj);
        disposeModels(entry.obj);
        root.add(clone);
        entry.obj = clone;
        entry.upgraded = true;
        // Again, on the new object. The children went with the old one -- root.remove and
        // disposeModels take the whole subtree -- and `loaded` is the CACHED parse that every
        // Voyager clone comes from, so attaching to it instead would put the Golden Record on
        // Voyager 2 as a side effect of Voyager 1 being drawn.
        attachOddityModels(clone, record.id);
        window.dispatchEvent(new CustomEvent('sr:model-upgraded', {
          detail: { id: record.id, name: real.name },
        }));
      });
    }
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
      // A LAYER MAY DECLINE TO HAVE GEOMETRY, and this is the only honest way to say so.
      // modelFor() falls back to a comms satellite for a class it has never heard of and sets
      // userData.generic, which nothing reads -- so a record whose class has no builder would be
      // drawn as a satellite with the card saying nothing about it. Checked before the distance
      // test AND before `forced`, because the selection is exactly when it would be seen.
      //
      // NO LAYER SETS IT TODAY: `oddities`, which it was written for, now has a builder per row.
      // It stays because the next layer to arrive without geometry needs it on the day it lands,
      // and the alternative -- a satellite bus drawn on the Moon -- is what it prevented once.
      const own = ctx.layers.find((l) => l.id === record.layer);
      if (own && own.noModel) return;
      const p = propagate(record, tMs);
      if (!p) return;
      const pos = stage.toScene(p, p.frame, tMs);
      if (!pos) return; // stage.js could not express this frame: no model, no glyph, no guess
      const d = pos.distanceTo(_camPos);
      const layer = ctx.layers.find((l) => l.id === record.layer);
      const nearUnits = ((layer && layer.nearKm) || 2000) / stage.unitKm;
      if (!forced && d > nearUnits) return;
      seen.add(record.id);
      out.push({ record, pos, d, forced, p });
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

    // DOCKED VEHICLES. A Dragon, two Progresses and a Cygnus berthed to the station really are at
    // the station's position -- the catalogue is right and so is the propagation. Drawing each of
    // them as its own model puts five overlapping spacecraft at one point, which reads as a
    // rendering bug and was reported as one.
    //
    // So a candidate inside an already-accepted model's drawn radius is skipped. At this scale it
    // would be *inside* that model, and a shape you cannot see is not worth a draw call. The
    // selection is never skipped: if you asked for the Dragon, you get the Dragon.
    const f = camera.projectionMatrix.elements[5];
    const h = (ctx.renderer && ctx.renderer.domElement && ctx.renderer.domElement.clientHeight) || 800;
    const kept = [];
    const hidden = [];
    for (const c of out) {
      // The SAME heroPixels() as the scale below, or a big Starship is drawn large and still
      // swallows its neighbours as though it were small. One function, two call sites.
      const px = heroPixels(c.record, c.forced);
      c.drawnRadius = (px * c.d) / (h * f); // half the drawn size, in world units
      const swallowedBy = c.forced ? null : kept.find((k) => k.pos.distanceTo(c.pos) < k.drawnRadius);
      if (swallowedBy) {
        hidden.push({ record: c.record, insideOf: swallowedBy.record });
        continue;
      }
      kept.push(c);
      if (kept.length >= POOL) break;
    }
    // What was hidden is worth knowing rather than silently dropping: the card layer can say
    // "4 vehicles are docked here" from this, and today it at least makes the behaviour findable.
    lastHidden = hidden;
    return kept;
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

      const px = heroPixels(c.record, c.record.id === selectedId);
      const size = (px * 2 * c.d) / (h * f);
      obj.scale.setScalar(size);

      // The burn signal. propagate() already returned `phase` and `f` for this record a few
      // lines ago in candidates(); ascent() has computed both since it was written and nothing
      // has ever read them, so a rocket's plume has never once been visible. This is that wire.
      // It is per-frame state, which is why it goes on the object and not into parse-time meta.
      if (c.p && c.p.phase) obj.userData.burn = { on: c.p.phase === 'ascent', f: c.p.f };

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
            // A material that was DESIGNED translucent -- the additive plume at 0.55 -- keeps
            // its own opacity as the ceiling. Writing k straight in stamped that 0.55 to a hard
            // 1 the moment the fade finished, and turned its transparency off with it.
            const ceiling = n.material.userData && n.material.userData.baseOpacity;
            const top = Number.isFinite(ceiling) ? ceiling : 1;
            n.material.transparent = k < 1 || top < 1;
            n.material.opacity = k * top;
          }
        });
        if (k >= 1) entry.fadeStart = null;
      }
    }
  }

  return {
    update,
    count: () => live.size,
    /** [{record, insideOf}] -- vehicles docked to something that is drawn. */
    hidden: () => lastHidden,
    setVisible(b) { root.visible = !!b; },
    dispose() {
      for (const id of [...live.keys()]) release(id);
      scene.remove(root);
    },
  };
}

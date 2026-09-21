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
import { modelFor, updateModelAttitude, setSunDirection, disposeModels, attachOddityModels, builderKlass } from './models.js';
import { realModelFor, loadRealModel } from './realmodels.js';
import { propagate } from '../propagate/index.js';
import { stage } from './stage.js';
import { modelOpacity } from './onemark.js';
import { WORLDS } from './worlds.js';

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

/**
 * A HERO IS NEVER DRAWN BIGGER THAN ITS OWN ALTITUDE, so it cannot sink into the world it orbits.
 *
 * The constant-angular-size rule above buys readability with world size: a model's drawn radius is
 * `px * d / (h * f)`, which grows LINEARLY with how far away the camera is. Near the object that is
 * the whole point. Far from it the number runs away, and on 2026-09-17 Ivan reported what that
 * looks like -- "in the tour with stations, stations inside the earth".
 *
 * He was looking at the opening stop of `people-in-space`, which parks 32 000 km back so that "the
 * planet reads as a planet". The trip SELECTS its subject at every stop (ui/trip.js), and a
 * selection is drawn at 260 px and skips the nearKm gate below, so at h = 800 the ISS was drawn
 * with a radius of 4 308 km. It orbits 6 791 km from the centre of a 6 371 km planet. The model
 * therefore reached 3 888 km BELOW the surface -- more than half way to the core.
 *
 * The honest ceiling is the object's own height above the ground: a spacecraft drawn no larger
 * than its altitude cannot touch the surface, whatever the camera does. CLEARANCE keeps a tenth of
 * that gap so it does not graze either. When the cap bites the model gets smaller with distance
 * again, which is what being far away is supposed to look like. MEASURED in headless Chrome at
 * 1280x800 on 2026-09-17: at that opening stop the ISS now reaches 362 km, its lowest point is
 * 253 km clear of the surface and it reads as 22 px, with the glyph -- fixed size, never wrong
 * about position -- carrying it. At the 3 000 km stop it still reads 233 px, so the close-up the
 * 260 px budget exists for is untouched.
 *
 * Objects at or below the surface -- ground sites, launch pads -- are left alone. A pad marker is
 * MEANT to touch the ground, and capping it at an altitude of zero would delete it.
 *
 * THE MODEL IS MEASURED, NOT ASSUMED. Every shape this app draws is "about one unit across" and
 * `tests/test_station_shapes.mjs` holds the procedural ones to it within 6 %, but the imported
 * .glb files are only normalised approximately -- `iss.glb` reaches 1.15 units. Capping the scale
 * as though every model were exactly one unit left the station 20 km inside the Earth when it was
 * measured in a browser, which is small but is still the bug. So each model reports how far it
 * actually reaches from its own origin, and the cap is computed from that.
 */
const CLEARANCE = 0.9;
const _worldRadius = new Map();
function stageRadiusUnits() {
  const id = stage.worldId;
  if (!_worldRadius.has(id)) {
    const w = WORLDS.find((x) => x.id === id);
    _worldRadius.set(id, w && w.radiusKm > 0 ? w.radiusKm : 0);
  }
  // Not cached in units: unitKm is per stage and a stage change must not be served a stale scale.
  const km = _worldRadius.get(id);
  return km > 0 ? km / stage.unitKm : 0;
}

/**
 * How far an unscaled model reaches from its own origin, in model units -- so a scale can be turned
 * into a real world radius. Invisible parts are skipped for the same reason the one-unit test skips
 * them: a rocket's plume hangs 0.4 units below the nozzle and is only shown during a burn, and
 * counting it would shrink every rocket by a third for a shape nobody is looking at.
 */
const _reachBox = new THREE.Box3();
const _reachV = new THREE.Vector3();
function unitReachOf(obj) {
  obj.updateMatrixWorld(true);
  _reachBox.makeEmpty();
  obj.traverse((n) => {
    if (!n.isMesh) return;
    // STRICTLY BELOW THE ROOT. A hero is created invisible and faded in, so testing the root's own
    // visibility skipped every mesh, left the box empty and silently returned the 0.5 fallback --
    // which is how the ISS came out 20 km inside the Earth with the cap apparently working.
    for (let p = n; p && p !== obj; p = p.parent) if (!p.visible) return;
    _reachBox.expandByObject(n);
  });
  if (_reachBox.isEmpty()) return 0.5; // the convention: one unit across, so half a unit of reach
  // The farthest corner from the model's ORIGIN, which is where the record's position goes -- not
  // the box's own centre, because a model whose mass sits off to one side still hangs off to one
  // side when it is drawn.
  let reach = 0;
  for (const x of [_reachBox.min.x, _reachBox.max.x]) {
    for (const y of [_reachBox.min.y, _reachBox.max.y]) {
      for (const z of [_reachBox.min.z, _reachBox.max.z]) reach = Math.max(reach, _reachV.set(x, y, z).length());
    }
  }
  return reach > 0 ? reach : 0.5;
}

/**
 * The scale a hero is drawn at -- the one place that decides it, because the docked-vehicle test
 * and the scale below must agree or a model swallows a neighbour it is no longer big enough to hide.
 *
 * @param {number} px    pixels the model should read as, from heroPixels()
 * @param {number} d     distance from the camera, scene units
 * @param {number} h     viewport height in CSS pixels
 * @param {number} f     projectionMatrix[5], i.e. 1 / tan(fovY / 2)
 * @param {THREE.Vector3} pos  the record's position -- the stage world is the origin, at true size
 * @param {number} reach how far this model reaches from its origin at scale 1
 */
function heroScale(px, d, h, f, pos, reach) {
  const want = (px * 2 * d) / (h * f);
  const R = stageRadiusUnits();
  if (!(R > 0) || !pos) return want;
  const altitude = pos.length() - R;
  if (!(altitude > 0)) return want;
  const r = reach > 0 ? reach : 0.5;
  return Math.min(want, (altitude * CLEARANCE) / r);
}

/**
 * HOW MANY MODELS MAY EXIST AT ONCE -- a floor, and a ceiling the device earns.
 *
 * Ivan, 2026-09-20: "if user PC or mobile is fast enough, render more 3d objects, and render more
 * gradually if it not moving, not much to not kill the visibility and show garbage, but more and
 * better to load real models and not cubes, the idea is to show more 3D."
 *
 * Eight was a fixed phone budget: a few draw calls each, and every device paid the same. The rules
 * below spend a fast device's headroom and take it straight back when it is gone.
 *
 *   - GROW ONLY WHEN STILL. A model appearing mid-flight is a thing that pops into an already
 *     moving picture, and building one costs a frame. The camera has to have been still for half a
 *     second, and then models arrive one every 400 ms -- gradually, as asked.
 *   - GROW ONLY WITH ROOM TO SPARE. The median of recent frames must be under 20 ms (50 fps). The
 *     budget is given back in twos the moment the median passes 28 ms, whether the camera is moving
 *     or not, because that is the safety valve.
 *   - NEVER ABOVE THE LATCH. If scene/quality.js has latched the scene to its low setting, the
 *     device has already told us it cannot keep up: the pool stays at the floor.
 *   - NEVER ON A METERED CONNECTION. Every extra model is a file to fetch, so `saveData` and a 2g
 *     or 3g connection keep the floor too.
 *
 * The ceiling is 16 rather than something grander because `docs/toolkit.md` budgets 60 draw calls
 * at 60 fps on a phone and a model is a few each. Frame time is the real arbiter -- the ceiling is
 * there so a machine that is fast for one second cannot commit the next ten to redrawing.
 */
const POOL = 8;
const POOL_MAX = 16;
const GROW_EVERY_MS = 400;
const STILL_BEFORE_GROWING_MS = 500;
const FRAME_FAST_MS = 20;
const FRAME_SLOW_MS = 28;

/**
 * The next pool size, from what the last second looked like. Pure, so the rule can be tested
 * without a GPU -- which matters here, because the machine this was written on renders in software
 * and would never grow the pool at all.
 *
 * @param {Object} at
 * @param {number} at.cap            the cap now
 * @param {number} at.medianFrameMs  median of the recent frames, 0 when not enough are known yet
 * @param {number} at.stillMs        how long the camera has been still
 * @param {number} at.sinceGrowMs    how long since the last model was added
 * @param {boolean} at.latched       quality.js has dropped the scene to its low setting
 * @param {boolean} at.saveData      the connection is metered or slow
 */
export function nextHeroCap(at = {}) {
  const cap = Number.isFinite(at.cap) ? at.cap : POOL;
  const median = Number.isFinite(at.medianFrameMs) ? at.medianFrameMs : 0;
  if (at.latched || at.saveData) return POOL;
  if (median > FRAME_SLOW_MS) return Math.max(POOL, cap - 2);
  if (cap >= POOL_MAX) return POOL_MAX;
  const still = Number.isFinite(at.stillMs) ? at.stillMs : 0;
  const since = Number.isFinite(at.sinceGrowMs) ? at.sinceGrowMs : 0;
  // A median of 0 means fewer frames than the window: not yet evidence of headroom.
  if (median > 0 && median < FRAME_FAST_MS && still >= STILL_BEFORE_GROWING_MS && since >= GROW_EVERY_MS) {
    return cap + 1;
  }
  return cap;
}

/** Fade a model in over this, so it never pops. */
const FADE_MS = 200;

const _v = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _climb = new THREE.Vector3();

export function createHeroes(scene, ctx) {
  const root = new THREE.Group();
  root.name = 'heroes';
  // Heroes draw after the glyph layers so a model sits over its own dot rather than behind it.
  root.renderOrder = 10;
  scene.add(root);

  /** The last update()'s clock, so drawnOpacity() reads the same fade the frame drew. */
  let lastTMs = 0;
  /** id -> {obj, record, fadeStart} */
  const live = new Map();
  // The adaptive pool (nextHeroCap above): the cap the device has earned, how long the camera has
  // been still, and a window of recent frame times to take the median of.
  let cap = POOL;
  let stillSince = null;
  let lastGrowAt = 0;
  const frameWindow = [];
  const _camWas = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), had: false };
  const medianFrame = () => {
    if (frameWindow.length < 20) return 0;
    const a2 = frameWindow.slice().sort((x, y) => x - y);
    const h2 = a2.length >> 1;
    return a2.length % 2 ? a2[h2] : (a2[h2 - 1] + a2[h2]) / 2;
  };

  /** Records not drawn this frame because they sit inside another model (docked vehicles). */
  let lastHidden = [];

  function acquire(record) {
    const existing = live.get(record.id);
    if (existing) return existing;
    // A real-model entry may name a procedural shape (`build:`) instead of a file: that variant
    // is drawn now and there is nothing to upgrade to. Otherwise the record's own variant, if any.
    const early = realModelFor(record);
    const variant = early && early.build ? early.build : record.meta && record.meta.modelVariant;
    // A routed build is drawn from the row that holds it (models.js builderKlass): a Progress the
    // catalogue files as a satellite is still a Progress.
    const klass = early && early.build ? builderKlass(record.klass, variant) : record.klass;
    const obj = modelFor(klass, variant, { record });
    obj.userData.recordId = record.id;
    obj.visible = false;
    // Whatever rides on this thing, as children of it. Two records in the app carry anything at
    // all, so this is a no-op for the rest -- but it is here rather than in the upgrade branch
    // below because a visitor on a slow connection should see the Golden Record on the
    // procedural Voyager too, not only on the one that finished downloading.
    attachOddityModels(obj, record.id);
    root.add(obj);
    const entry = { obj, record, fadeStart: null, upgraded: false, reach: unitReachOf(obj) };
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
        // MEASURED BEFORE THE SCALE IS COPIED ON. unitReachOf() walks world matrices, so asking it
        // after the line below would return a reach already multiplied by the drawn scale -- and
        // the clearance cap would then be computed from a number in the wrong units entirely.
        entry.reach = unitReachOf(clone);
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

    // THE EXTRA SLOTS PREFER A REAL MODEL. The first POOL are the nearest, which is the honest
    // ordering and the one a person expects: what you have flown to is what gets geometry. Above
    // that the pool is a bonus the device has earned, and Ivan asked for it to be spent well --
    // "more and better to load real models and not cubes". So among the candidates beyond the
    // floor, the ones with a file of their own come first, and distance breaks the tie.
    if (out.length > POOL) {
      const head = out.slice(0, POOL);
      const tail = out.slice(POOL);
      const real = (c) => { const e = realModelFor(c.record); return e && e.file ? 0 : 1; };
      tail.sort((a, b) => real(a) - real(b) || a.d - b.d);
      out.length = 0;
      out.push(...head, ...tail);
    }

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
      // The model may not exist yet on the frame it is first considered; half a unit is the
      // convention every shape is built to, and this only decides which neighbour is hidden.
      const reach = (live.get(c.record.id) || {}).reach || 0.5;
      c.drawnRadius = heroScale(px, c.d, h, f, c.pos, reach) * reach; // how far it reaches, in world units
      const swallowedBy = c.forced ? null : kept.find((k) => k.pos.distanceTo(c.pos) < k.drawnRadius);
      if (swallowedBy) {
        hidden.push({ record: c.record, insideOf: swallowedBy.record });
        continue;
      }
      kept.push(c);
      if (kept.length >= cap) break;
    }
    // What was hidden is worth knowing rather than silently dropping: the card layer can say
    // "4 vehicles are docked here" from this, and today it at least makes the behaviour findable.
    lastHidden = hidden;
    return kept;
  }

  function update(tMs, at = {}) {
    lastTMs = tMs;
    const camera = ctx.camera;
    if (!camera) return;

    // How much room is there, and is the picture holding still? The frame duration comes from the
    // loop that called us; stillness is measured here, from the camera itself, because that is the
    // thing that would make a new model pop into a moving picture.
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (Number.isFinite(at.frameMs) && at.frameMs > 0) {
      frameWindow.push(Math.min(at.frameMs, 1000));
      if (frameWindow.length > 30) frameWindow.shift();
    }
    camera.getWorldPosition(_camPos);
    const moved = !_camWas.had
      || _camPos.distanceToSquared(_camWas.pos) > 1e-12
      || Math.abs(camera.quaternion.dot(_camWas.quat)) < 0.9999999;
    _camWas.pos.copy(_camPos);
    _camWas.quat.copy(camera.quaternion);
    _camWas.had = true;
    if (moved) stillSince = null;
    else if (stillSince === null) stillSince = nowMs;
    const next = nextHeroCap({
      cap,
      medianFrameMs: medianFrame(),
      stillMs: stillSince === null ? 0 : nowMs - stillSince,
      sinceGrowMs: nowMs - lastGrowAt,
      latched: at.latched === true,
      saveData: at.saveData === true,
    });
    if (next > cap) lastGrowAt = nowMs;
    cap = next;

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
      const size = heroScale(px, c.d, h, f, c.pos, entry.reach);
      obj.scale.setScalar(size);

      // The burn signal. propagate() already returned `phase` and `f` for this record a few
      // lines ago in candidates(); ascent() has computed both since it was written and nothing
      // has ever read them, so a rocket's plume has never once been visible. This is that wire.
      // It is per-frame state, which is why it goes on the object and not into parse-time meta.
      if (c.p && c.p.phase) obj.userData.burn = { on: c.p.phase === 'ascent', f: c.p.f };

      // WHERE IT IS GOING. propagate/ascent.js returns the unit tangent of the arc it draws, in
      // the arc's own frame; stage.dirToScene() turns that into a scene direction, because a frame
      // change is a rotation and a translation and only the rotation applies to a direction.
      // models.js aims the vehicle's +Y along it. Per-frame state on the object, exactly as `burn`
      // is, and absent for every record whose propagator returns no tangent -- which is all of
      // them except a launch, and which the attitude code falls back for.
      if (c.p && c.p.tangent) {
        const dir = stage.dirToScene(c.p.tangent, c.p.frame, _climb, tMs);
        obj.userData.climb = dir ? { x: dir.x, y: dir.y, z: dir.z } : null;
      } else if (obj.userData.climb) {
        obj.userData.climb = null;
      }

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
    /** The cap the device has earned, for the status panel and for a browser check. */
    poolCap: () => cap,
    /** [{record, insideOf}] -- vehicles docked to something that is drawn. */
    hidden: () => lastHidden,
    /**
     * How much of this record's MODEL is on screen right now, 0..1. The dot layer multiplies its
     * own opacity by (1 - this), so an object is drawn once: as its model while the model is
     * there, as its dot otherwise. 0 when there is no model, when it is docked inside a neighbour
     * and hidden, when the whole hero layer is off, and rising with the fade-in rather than
     * snapping -- a dot that vanishes before the model has arrived is an object that blinks.
     * Ivan, 2026-09-20: "we shouldn't repeat the dot with 3d object if 3d object rendered on
     * screen, if not - dot".
     */
    drawnOpacity(id) {
      return modelOpacity(live.get(id), root.visible, lastTMs, FADE_MS);
    },
    setVisible(b) { root.visible = !!b; },
    dispose() {
      for (const id of [...live.keys()]) release(id);
      scene.remove(root);
    },
  };
}

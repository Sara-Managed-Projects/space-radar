// Boot and the render loop. This file owns the order things happen in and nothing else:
// every piece of behaviour lives in a module named by tests/test_contract.mjs.
//
// The order matters and is deliberate. The world draws BEFORE any network call finishes, because
// a visitor on a slow phone should see Earth in the first second and watch the satellites arrive,
// rather than watch a spinner and then get everything at once. Spec 0005's budget says the same
// thing in numbers.

import * as THREE from '../vendor/three.module.min.js';
import { clock } from './clock.js';
import { createRenderer } from './scene/renderer.js';
import { stage } from './scene/stage.js';
import { propagate } from './propagate/index.js';
import { createWorlds, WORLDS } from './scene/worlds.js';
import { createStarfield } from './scene/starfield.js';
import { createGlyphLayer } from './scene/glyphs.js';
import { createHeroes } from './scene/heroes.js';
import { createCameraRig } from './scene/camera.js';
import { readMoment, writeMoment } from './ui/urlstate.js';
import { guessObserver } from './sky/guessplace.js';
import { CITIES } from './copy/en.js';
import { LAYERS, loadLayer } from './data/layers.js';
import * as sources from './data/sources.js';
import { createSkyView } from './sky/skyview.js';
import { showCard, hideCard } from './ui/cards.js';
import { createControls } from './ui/controls.js';
import { createStatus } from './ui/status.js';
import { createMobileUI } from './ui/mobile.js';
import { createGitHubMark } from './ui/github.js';
import { createTrip } from './ui/trip.js';
import { createTripFrame } from './ui/tripframe.js';
import { rankPick, rankAll } from './scene/pickrank.js';
import { createLod } from './scene/lod.js';
import { createStars3d } from './scene/stars3d.js';
import { createGalaxy } from './scene/galaxy.js';
import { isLadderStage } from './scene/stage.js';
import { SUN_INERTIAL, STAGES } from './scene/stage.js';
import { showChooser, hideChooser } from './ui/chooser.js';
import { createLabels } from './ui/labels.js';
import { createOrbitLine } from './scene/orbitline.js';
import { createFrameLatch, shouldSaveData } from './scene/quality.js';
import { keyById, bucketOf } from './data/colorkeyrules.js';

const MOMENTS = ['wonder', 'now', 'next'];

export async function boot({ setStatus } = {}) {
  const say = setStatus || (() => {});
  const canvas = document.getElementById('stage');

  say('Building the sky…');
  const rendererApi = createRenderer(canvas);
  const { renderer, scene, camera, resize, render } = rendererApi;
  const cameraRig = createCameraRig(camera, canvas);

  const worlds = createWorlds(scene);
  const starfield = createStarfield(scene, {
    starsBin: 'data/stars.bin',
    linesJson: 'data/constellations.lines.json',
    namesJson: 'data/constellation-names.json',
    milkyWayTexture: 'textures/2k_stars_milky_way.jpg',
  });

  // Records, keyed by layer id. Layers fill in as their data lands; the loop reads whatever is
  // there. A layer that never loads is simply absent -- it never blocks a frame.
  const layerRecords = new Map();
  const glyphLayers = new Map();
  let selected = null;
  let observer = null;
  let moment = readMomentFromHash();

  const ctx = {
    clock, stage, scene, camera, cameraRig, worlds, renderer, rendererApi, sources,
    layers: LAYERS,
    records: () => [...layerRecords.values()].flat(),
    recordsFor: (id) => layerRecords.get(id) || [],
    recordById: (id) => ctx.records().find((r) => r.id === id) || null,
    selected: () => selected,
    select,
    deselect,
    get observer() { return observer; },
    setObserver: (o) => { observer = o; window.dispatchEvent(new CustomEvent('sr:observer', { detail: o })); },
    get moment() { return moment; },
    setMoment,
    isSecure: window.isSecureContext === true,
  };

  // The scale ladder's level of detail (spec 0028 req 10): a table in registry/lod.yaml, hooks here.
  const stars3d = createStars3d(scene);
  ctx.stars3d = stars3d;
  const galaxy = createGalaxy(scene);
  ctx.galaxy = galaxy;
  const lod = createLod({
    'sky-panorama': (k) => starfield.setSkyOpacity && starfield.setSkyOpacity(k),
    'stars-3d': (k) => stars3d.setOpacity(k),
    'galaxy-model': (k) => galaxy.setOpacity(k),
  });
  window.addEventListener('sr:stage', () => { stars3d.rebuild(); galaxy.rebuild(); });
  ctx.lod = lod;
  ctx.skyView = createSkyView(ctx);
  const heroes = createHeroes(scene, ctx);
  // Constructed BEFORE the layers load, because the trip counts which layers have landed by
  // listening for `sr:layer` -- and a layer that landed before anybody was listening is a layer
  // the trip would then wait eight seconds for.
  ctx.trip = createTrip(ctx);

  say('Placing Earth…');
  // One frame before any data: the world, the stars, the light.
  worlds.update(clock.now());
  // The camera rig knows nothing about worlds; it is told the radius so it can clamp, and where
  // to look. Earth's radius in scene units is 6371 / unitKm.
  cameraRig.setWorldRadius(6371 / stage.unitKm);
  cameraRig.setWorldCentre({ x: 0, y: 0, z: 0 });
  cameraRig.setTarget({ x: 0, y: 0, z: 0 });
  cameraRig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: 22, ms: 0 });
  render();
  revealUI();

  say('Reading the catalogues…');
  createControls(ctx);
  createStatus(ctx);
  ctx.mobile = createMobileUI();
  createGitHubMark();
  // The cinematic frame, after the panels and the mobile bar exist: it hides all three, and it
  // reads ctx.mobile to close a phone drawer that is standing open when a trip starts.
  ctx.tripFrame = createTripFrame(ctx);
  // Names over the scene (spec 0026 req 5): the selection, its train, the nearest notable things.
  const labels = createLabels(ctx, document.getElementById('labels'));
  ctx.labels = labels;
  // One lap of the selection's orbit (spec 0026 req 13), from the same elements as the dot.
  const orbitLine = createOrbitLine(scene, ctx);
  ctx.orbitLine = orbitLine;
  setMoment(moment, { silent: true });

  // Data arrives in the background, layer by layer, slowest last. Nothing here is awaited by the
  // render loop.
  loadAllLayers(ctx, layerRecords, glyphLayers, scene).then(() => {
    window.dispatchEvent(new CustomEvent('sr:layers-ready'));
  });

  startLoop({ ctx, resize, render, worlds, glyphLayers, cameraRig, starfield, heroes, lod });
  fadeBoot();

  // --- interaction ----------------------------------------------------------

  canvas.addEventListener('pointerdown', onPointerDown);
  let downAt = null;
  function onPointerDown(e) { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; }
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    const held = performance.now() - downAt.t;
    downAt = null;
    // A drag is a camera move, not a tap. 6 px is the usual threshold.
    if (moved > 6) return;
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    hideChooser();
    if (held > 400) {
      // A long press on a crowded spot lists everything within reach instead of guessing.
      const all = candidatesAt(ndcX, ndcY, rect);
      const list = rankAll(all.glyphs, all.discs, 6);
      if (list.length > 1) { showChooser(list, e.clientX, e.clientY, (rec) => select(rec), { layers: LAYERS }); return; }
      if (list.length === 1) { select(list[0].record); return; }
      deselect();
      return;
    }
    const hit = pick(ndcX, ndcY, rect);
    if (hit) select(hit);
    else deselect();
  });

  /** Everything within the forgiveness rule, from every layer that is on, unranked. */
  function candidatesAt(ndcX, ndcY, rect) {
    const glyphs = [];
    for (const layer of LAYERS) {
      if (!isLayerDrawable(layer)) continue;
      const gl = glyphLayers.get(layer.id);
      if (!gl || !gl.pickAll) continue;
      for (const c of gl.pickAll(ndcX, ndcY, 6)) glyphs.push(c);
    }
    if (isLayerOn('stars') && ctx.stars3d) {
      for (const c of ctx.stars3d.pickAll(ndcX, ndcY, camera, { w: rect.width, h: rect.height }, 6)) glyphs.push(c);
    }
    const discs = isLayerOn('worlds') && worlds.pickAll
      ? worlds.pickAll(ndcX, ndcY, camera, { w: rect.width, h: rect.height })
      : [];
    return { glyphs, discs };
  }

  function pick(ndcX, ndcY, rect) {
    // One decision across every layer (scene/pickrank.js): the smaller thing wins. A glyph within
    // 24 px beats any world's disc, the nearest glyph beats the rest (debris penalised), and a disc
    // is chosen by its rim and its size. The layer draw order no longer decides between glyphs.
    const all = candidatesAt(ndcX, ndcY, rect || canvas.getBoundingClientRect());
    return rankPick(all.glyphs, all.discs);
  }

  /**
   * @param {Object} record
   * @param {{fly?: boolean}} [opts]  `fly: false` keeps everything else -- the card, the glyph
   *   highlight, `follow`, and the real `sr:select` that ui/mobile.js uses to close the phone
   *   drawers -- and suppresses only the 900 ms flight. A guided trip is already on its way to
   *   this object with a flight of its own, and two flights fighting over the camera is what
   *   selecting from inside one used to look like.
   */
  function select(record, opts = {}) {
    // A star is a place on the stellar rung: from a world stage its true position is past the far
    // plane, so selecting one recentres on the Sun at one unit = one light-year first.
    if (record && ['star', 'exoplanet', 'dso', 'exotic'].includes(record.klass) && !isLadderStage(stage.worldId) && opts.fly !== false) ctx.setStage('stellar');
    selected = record;
    for (const gl of glyphLayers.values()) if (gl.setSelected) gl.setSelected(record ? record.id : null);
    showCard(record, ctx);
    if (ctx.orbitLine) ctx.orbitLine.setRecord(record);
    const pos = positionOfRecord(record);
    if (pos && opts.fly !== false) cameraRig.flyTo({ targetScene: pos, distance: arrivalDistance(record), ms: 900 });
    cameraRig.follow(() => positionOfRecord(record));
    window.dispatchEvent(new CustomEvent('sr:select', { detail: record }));
  }

  function deselect() {
    selected = null;
    if (ctx.orbitLine) ctx.orbitLine.setRecord(null);
    for (const gl of glyphLayers.values()) if (gl.setSelected) gl.setSelected(null);
    hideCard();
    cameraRig.stopFollow();
    window.dispatchEvent(new CustomEvent('sr:select', { detail: null }));
  }

  function positionOfRecord(record) {
    // A world is drawn where scene/worlds.js put its DISC -- nearer than it is for the planets
    // (PLANET_VIEW, and the card says so). Flying to the true position would arrive at empty sky.
    if (record && record.klass === 'world') return worlds.drawnPositionOf(record.id);
    // Deliberately NOT asking the glyph layer: it owns a packed position buffer for drawing, and
    // exposing a per-record lookup would make the camera depend on a layer being visible. The
    // contract's propagate + stage.toScene answers this for any record, drawn or not.
    const p = propagate(record, clock.now());
    if (!p) return null;
    return stage.toScene(p, p.frame, clock.now());
  }

  function arrivalDistance(record) {
    if (record && record.klass === 'world') return Math.max(0.05, worlds.drawnRadiusUnits(record.id) * 3.5);
    if (record && record.klass === 'star') return 0.4; // a point of light: close, but not inside it
    if (record && record.klass === 'exoplanet') return 0.4;
    if (record && record.klass === 'exotic') return 0.4;
    if (record && record.klass === 'dso') {
      // Frame the object by its own size: a galaxy 200 000 ly across wants the camera well back.
      const sizeLy = record.meta && Number.isFinite(record.meta.sizeLy) ? record.meta.sizeLy : 20;
      return Math.max(1, (sizeLy * 9460730472580.8 * 2.5) / stage.unitKm);
    }
    const layer = LAYERS.find((l) => l.id === record.layer);
    const nearKm = (layer && layer.nearKm) || 2000;
    return Math.max(0.05, (nearKm * 0.35) / stage.unitKm);
  }

  /**
   * Is this layer drawn right now? On, and -- for a layer that lives on the ladder's rungs (planets
   * around other stars, deep-sky objects, black holes) -- only when the stage is a rung. From a
   * world stage their true positions are past the far plane and, MEASURED 2026-09-08 in the browser,
   * the glyph shader drew them anyway as a green rash over Earth's sky. The layer stays "on" in the
   * panel; it simply has nothing honest to draw from here, and its records still count and search.
   */
  function isLayerDrawable(layer) {
    if (!layer || !isLayerOn(layer.id)) return false;
    if (layer.ladderOnly && !isLadderStage(stage.worldId)) return false;
    return true;
  }
  ctx.isLayerDrawable = isLayerDrawable;

  function isLayerOn(id) {
    const layer = LAYERS.find((l) => l.id === id);
    if (!layer) return false;
    if (layer.forcedOff) return false;
    return layer.on !== undefined ? layer.on : !!(layer.moments && layer.moments[moment]);
  }
  ctx.isLayerOn = isLayerOn;
  ctx.setLayerOn = (id, on) => {
    const layer = LAYERS.find((l) => l.id === id);
    if (layer) layer.on = on;
    if (layer && on && layer.deferred && typeof ctx.loadLayerNow === 'function') ctx.loadLayerNow(layer);
    const gl = glyphLayers.get(id);
    if (gl) gl.setVisible(on);
    if (id === 'worlds') worlds.setVisible(on);
    if (id === 'stars' && ctx.stars3d) ctx.stars3d.setVisible(on);
    if (id === 'galaxy' && ctx.galaxy) ctx.galaxy.setVisible(on);
  };

  /**
   * Make a world the centre of the map (spec 0006 req 5, spec 0028 req 2). The stage's floating
   * origin moves to it, its neighbourhood draws at true scale, and the camera is told the new
   * ground. Offered from the world card; not yet done on every select, because the Now moment's
   * sky view still assumes Earth underfoot.
   */
  /**
   * Colour every dot by a key (spec 0026 req 11): registry/colorkeys.yaml's rows through
   * data/colorkeyrules.js. `class` (or an unknown id) puts the class colours back. Layers that load
   * later pick the key up in setRecords through the same function.
   */
  let colourKeyId = 'class';
  ctx.setColourKey = (id) => {
    colourKeyId = id || 'class';
    const key = colourKeyId === 'class' ? null : keyById(colourKeyId);
    const fn = key ? (record) => { const b = bucketOf(key, record); return b ? b.colour : null; } : null;
    for (const gl of glyphLayers.values()) if (gl.recolour) gl.recolour(fn);
    ctx.colourKeyFn = fn;
  };
  ctx.colourKey = () => colourKeyId;

  ctx.setStage = (stageId) => {
    if (!STAGES[stageId] || stage.worldId === stageId) return false;
    // A world, or a rung of the ladder (stellar, galaxy, local-group: registry/stages.yaml). A rung
    // has no ground, so the camera's clearance sphere is switched off and it arrives a few units out.
    const w = WORLDS.find((x) => x.id === stageId);
    stage.setWorld(stageId);
    worlds.update(clock.now());
    const r = w ? w.radiusKm / stage.unitKm : 0;
    cameraRig.setWorldRadius(r);
    cameraRig.setWorldCentre({ x: 0, y: 0, z: 0 });
    cameraRig.stopFollow();
    cameraRig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: w ? r * 3.5 : 5, ms: 0 });
    return true;
  };

  function setMoment(next, { silent } = {}) {
    if (!MOMENTS.includes(next)) next = 'wonder';
    moment = next;
    for (const layer of LAYERS) layer.on = !!(layer.moments && layer.moments[moment]);
    for (const [id, gl] of glyphLayers) gl.setVisible(isLayerOn(id));
    // The Now door with nothing set used to do nothing (measured). A guessed place, marked as a
    // guess, opens the dome; the panel says the guess out loud and a real place replaces it.
    if (moment === 'now' && !observer) {
      const guess = guessObserver(CITIES);
      if (guess) ctx.setObserver(guess);
    }
    if (moment === 'now' && observer) ctx.skyView.enter(observer);
    else if (ctx.skyView.active) ctx.skyView.exit();
    if (!silent) writeMoment(moment);
    window.dispatchEvent(new CustomEvent('sr:moment', { detail: moment }));
  }

  window.addEventListener('sr:observer', () => {
    if (moment === 'now' && observer) ctx.skyView.enter(observer);
  });
  window.addEventListener('hashchange', () => setMoment(readMomentFromHash(), { silent: true }));

  // The one global worth having: it makes the app inspectable from a console on a real phone,
  // which is the only debugger available on the device that matters.
  window.spaceRadar = ctx;
  return ctx;
}

// --- the loop ----------------------------------------------------------------

function startLoop({ ctx, resize, render, worlds, glyphLayers, cameraRig, starfield, heroes, lod }) {
  let last = performance.now();
  let sinceLayerUpdate = 0;
  // The frame-rate latch (spec 0026 req 18): twenty-frame median over 33 ms for three seconds ->
  // one device pixel per CSS pixel and no Milky Way picture, once, said in the panel.
  const latch = createFrameLatch();

  function frame(nowReal) {
    requestAnimationFrame(frame);
    const frameMs = nowReal - last;             // the real duration, before the clamp below
    const dt = Math.min(100, frameMs);           // a backgrounded tab must not lurch on return
    last = nowReal;
    if (!document.hidden && latch.push(frameMs, nowReal)) {
      if (ctx.renderer && ctx.rendererApi && ctx.rendererApi.setQuality) ctx.rendererApi.setQuality('low');
      if (starfield && starfield.setDetail) starfield.setDetail('low');
      window.dispatchEvent(new CustomEvent('sr:quality', { detail: { level: 'low', medianMs: Math.round(latch.median()) } }));
    }

    clock.tick(dt);
    const t = clock.now();
    stage.setTime(t);   // every frame conversion this tick reads it; set it before anything does

    resize();
    cameraRig.update(dt);
    worlds.update(t);

    // Glyph positions are the expensive part. At 1x they need no more than ~10 Hz to look
    // continuous at orbital speeds; while scrubbing they need every frame or the motion stutters.
    sinceLayerUpdate += dt;
    const interval = clock.mode === 'live' && clock.rate === 1 ? 100 : 0;
    if (sinceLayerUpdate >= interval) {
      sinceLayerUpdate = 0;
      for (const [id, gl] of glyphLayers) {
        const layer = LAYERS.find((l) => l.id === id);
        const drawable = ctx.isLayerDrawable ? ctx.isLayerDrawable(layer) : ctx.isLayerOn(id);
        if (layer && layer.ladderOnly && gl.setVisible) gl.setVisible(drawable);
        if (drawable) gl.update(t, ctx.camera);
      }
    }

    // Labels ride the same tick as the glyphs they sit over, so the two never drift apart.
    if (ctx.labels && sinceLayerUpdate === 0) ctx.labels.update(t);
    if (ctx.orbitLine) ctx.orbitLine.update(t);

    // The ladder's level of detail, on the same tick: how far the camera is from the Sun, in km.
    if (lod && sinceLayerUpdate === 0) {
      const camKm = stage.fromScene(ctx.camera.position);
      const sunKm = stage.toStageFrame({ x: 0, y: 0, z: 0 }, SUN_INERTIAL, t);
      if (camKm && sunKm) lod.apply(Math.hypot(camKm.x - sunKm.x, camKm.y - sunKm.y, camKm.z - sunKm.z));
    }

    if (heroes) heroes.update(t);
    if (starfield && starfield.update) starfield.update(ctx.camera);
    if (ctx.stars3d) ctx.stars3d.update(ctx.camera, ctx.renderer);
    if (ctx.galaxy) ctx.galaxy.update(ctx.camera, ctx.renderer);
    if (ctx.skyView.active) ctx.skyView.update(t);
    render();
  }
  requestAnimationFrame(frame);
}

// --- data --------------------------------------------------------------------

async function loadAllLayers(ctx, layerRecords, glyphLayers, scene) {
  // Cheapest and most interesting first: the station is fifteen objects and it is what people
  // came for. The eleven-thousand-object catalogue is last and off by default.
  // The registry's `enabled: false` (spec 0026 req 8): the layer is not created, not loaded, not listed.
  // Data-saver (spec 0026 req 18): on a slow or metered connection the heavy catalogue files wait
  // until the visitor asks for the layer. The layer stays in the panel, off, and the panel says why.
  const saveData = typeof navigator !== 'undefined' && shouldSaveData(navigator.connection);
  for (const l of LAYERS) l.deferred = !!(saveData && l.heavy);
  if (saveData) window.dispatchEvent(new CustomEvent('sr:quality', { detail: { level: 'data-saver' } }));
  const ordered = [...LAYERS].filter((l) => l.enabled !== false).sort((a, b) => (a.priority || 50) - (b.priority || 50));

  // The glyph layers are created up front, in priority order, so the scene's draw order is the
  // priority order whatever order the network answers in. Each one starts empty and fills when
  // its records arrive.
  for (const layer of ordered) {
    // A layer another module already draws (the worlds' discs) gets no glyph layer: two marks for
    // one planet would be two places to tap and one of them wrong.
    if (layer.draw === 'worlds' || layer.draw === 'galaxy' || layer.draw === 'stars3d') continue;
    const gl = createGlyphLayer(scene, layer);
    gl.setRecords([]);
    // Hidden until its records arrive; one() then sets the real visibility. This loop runs
    // before the first await, and ctx.isLayerOn is attached to ctx after this function is
    // called -- MEASURED: calling it here threw and no layer ever loaded.
    gl.setVisible(false);
    glyphLayers.set(layer.id, gl);
  }

  // Two lanes. MEASURED 2026-09-08: one-at-a-time, the map spent 150 s on two CelesTrak files
  // while the launches layer's snapshot sat ready on our own origin; a three-slot pool alone did
  // not help, because the three highest-priority layers are all CelesTrak-backed and all three
  // slots hung together. So: a layer that is bundled, or whose every source has a usable snapshot
  // in the harvester's manifest, loads in the LOCAL lane at once -- same origin, cheap, no host to
  // wait for. Everything else goes through a small UPSTREAM pool, where priority still decides who
  // starts first and a slow host delays only its own layer. sources.js caps any one live fetch at
  // 20 s besides, so "slow" is bounded.
  const idsOf = (l) => (Array.isArray(l.sources) ? l.sources : l.source ? [l.source] : []);
  const local = [];
  const upstream = [];
  for (const layer of ordered) {
    if (layer.deferred) continue; // loads when the visitor switches it on (ctx.loadLayerNow)
    const srcs = idsOf(layer);
    // One cached manifest read behind these, not a request per layer.
    const snaps = srcs.length ? await Promise.all(srcs.map((id) => sources.snapshotAvailable(id))) : [];
    (srcs.length === 0 || snaps.every(Boolean) ? local : upstream).push(layer);
  }

  ctx.loadLayerNow = (layer) => { if (layer && layer.deferred) { layer.deferred = false; return one(layer); } return Promise.resolve(); };

  async function one(layer) {
    const gl = glyphLayers.get(layer.id);
    try {
      const records = layer.draw === 'stars3d' ? await ctx.stars3d.load() : await loadLayer(layer, clock.now());
      layerRecords.set(layer.id, records || []);
      if (layer.draw === 'stars3d') {
        // The panel's count is the number DRAWN, not the number of named records.
        layer.count = () => ctx.stars3d.count() ?? (records || []).length;
        ctx.stars3d.setVisible(ctx.isLayerOn(layer.id));
      }
      if (gl) {
        if (ctx.colourKeyFn && gl.recolour) gl.recolour(ctx.colourKeyFn);
        gl.setRecords(records || []);
        gl.setVisible(ctx.isLayerOn(layer.id));
      }
      window.dispatchEvent(new CustomEvent('sr:layer', { detail: { id: layer.id, count: (records || []).length } }));
    } catch (err) {
      // A layer that fails is a layer that is absent, never a page that is broken.
      console.warn(`layer ${layer.id} did not load`, err);
      layerRecords.set(layer.id, []);
      window.dispatchEvent(new CustomEvent('sr:layer', { detail: { id: layer.id, count: 0, error: String(err) } }));
    }
  }
  function pool(list, size) {
    let next = 0;
    const worker = async () => {
      while (next < list.length) await one(list[next++]);
    };
    return Promise.all(Array.from({ length: Math.min(size, list.length) }, worker));
  }
  await Promise.all([pool(local, 6), pool(upstream, 3)]);
}

// --- small helpers -----------------------------------------------------------

function readMomentFromHash() {
  return readMoment(MOMENTS) || 'wonder';
}

function revealUI() {
  // The UI modules append their own roots when they are constructed, so there is nothing to
  // un-hide. Kept as the one place that would change if that ever stops being true.
}

function fadeBoot() {
  const boot = document.getElementById('boot');
  if (!boot) return;
  boot.classList.add('gone');
  setTimeout(() => boot.remove(), 700);
}

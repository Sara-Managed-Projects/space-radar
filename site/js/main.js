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
import { showChooser, hideChooser } from './ui/chooser.js';

const MOMENTS = ['wonder', 'now', 'next'];

export async function boot({ setStatus } = {}) {
  const say = setStatus || (() => {});
  const canvas = document.getElementById('stage');

  say('Building the sky…');
  const { renderer, scene, camera, resize, render } = createRenderer(canvas);
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
    clock, stage, scene, camera, cameraRig, worlds, renderer, sources,
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
  setMoment(moment, { silent: true });

  // Data arrives in the background, layer by layer, slowest last. Nothing here is awaited by the
  // render loop.
  loadAllLayers(ctx, layerRecords, glyphLayers, scene).then(() => {
    window.dispatchEvent(new CustomEvent('sr:layers-ready'));
  });

  startLoop({ ctx, resize, render, worlds, glyphLayers, cameraRig, starfield, heroes });
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
      if (!isLayerOn(layer.id)) continue;
      const gl = glyphLayers.get(layer.id);
      if (!gl || !gl.pickAll) continue;
      for (const c of gl.pickAll(ndcX, ndcY, 6)) glyphs.push(c);
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
    selected = record;
    for (const gl of glyphLayers.values()) if (gl.setSelected) gl.setSelected(record ? record.id : null);
    showCard(record, ctx);
    const pos = positionOfRecord(record);
    if (pos && opts.fly !== false) cameraRig.flyTo({ targetScene: pos, distance: arrivalDistance(record), ms: 900 });
    cameraRig.follow(() => positionOfRecord(record));
    window.dispatchEvent(new CustomEvent('sr:select', { detail: record }));
  }

  function deselect() {
    selected = null;
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
    const layer = LAYERS.find((l) => l.id === record.layer);
    const nearKm = (layer && layer.nearKm) || 2000;
    return Math.max(0.05, (nearKm * 0.35) / stage.unitKm);
  }

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
    const gl = glyphLayers.get(id);
    if (gl) gl.setVisible(on);
    if (id === 'worlds') worlds.setVisible(on);
  };

  /**
   * Make a world the centre of the map (spec 0006 req 5, spec 0028 req 2). The stage's floating
   * origin moves to it, its neighbourhood draws at true scale, and the camera is told the new
   * ground. Offered from the world card; not yet done on every select, because the Now moment's
   * sky view still assumes Earth underfoot.
   */
  ctx.setStage = (worldId) => {
    const w = WORLDS.find((x) => x.id === worldId);
    if (!w || stage.worldId === worldId) return false;
    stage.setWorld(worldId);
    worlds.update(clock.now());
    const r = w.radiusKm / stage.unitKm;
    cameraRig.setWorldRadius(r);
    cameraRig.setWorldCentre({ x: 0, y: 0, z: 0 });
    cameraRig.stopFollow();
    cameraRig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: r * 3.5, ms: 0 });
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

function startLoop({ ctx, resize, render, worlds, glyphLayers, cameraRig, starfield, heroes }) {
  let last = performance.now();
  let sinceLayerUpdate = 0;

  function frame(nowReal) {
    requestAnimationFrame(frame);
    const dt = Math.min(100, nowReal - last);   // a backgrounded tab must not lurch on return
    last = nowReal;

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
        if (ctx.isLayerOn(id)) gl.update(t, ctx.camera);
      }
    }

    if (heroes) heroes.update(t);
    if (starfield && starfield.update) starfield.update(ctx.camera);
    if (ctx.skyView.active) ctx.skyView.update(t);
    render();
  }
  requestAnimationFrame(frame);
}

// --- data --------------------------------------------------------------------

async function loadAllLayers(ctx, layerRecords, glyphLayers, scene) {
  // Cheapest and most interesting first: the station is fifteen objects and it is what people
  // came for. The eleven-thousand-object catalogue is last and off by default.
  const ordered = [...LAYERS].sort((a, b) => (a.priority || 50) - (b.priority || 50));

  // The glyph layers are created up front, in priority order, so the scene's draw order is the
  // priority order whatever order the network answers in. Each one starts empty and fills when
  // its records arrive.
  for (const layer of ordered) {
    // A layer another module already draws (the worlds' discs) gets no glyph layer: two marks for
    // one planet would be two places to tap and one of them wrong.
    if (layer.draw === 'worlds') continue;
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
    const srcs = idsOf(layer);
    // One cached manifest read behind these, not a request per layer.
    const snaps = srcs.length ? await Promise.all(srcs.map((id) => sources.snapshotAvailable(id))) : [];
    (srcs.length === 0 || snaps.every(Boolean) ? local : upstream).push(layer);
  }

  async function one(layer) {
    const gl = glyphLayers.get(layer.id);
    try {
      const records = await loadLayer(layer, clock.now());
      layerRecords.set(layer.id, records || []);
      if (gl) {
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

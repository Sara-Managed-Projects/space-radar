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
import { createWorlds } from './scene/worlds.js';
import { createStarfield } from './scene/starfield.js';
import { createGlyphLayer } from './scene/glyphs.js';
import { createHeroes } from './scene/heroes.js';
import { createCameraRig } from './scene/camera.js';
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
    // A drag is a camera move, not a tap. 6 px and 400 ms are the usual thresholds.
    if (moved > 6 || held > 400) return;
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const hit = pick(ndcX, ndcY);
    if (hit) select(hit);
    else deselect();
  });

  function pick(ndcX, ndcY) {
    // Each layer's pick() already applies the 24 px forgiveness rule and returns its own nearest
    // record, or null. Across layers we take the first hit in draw order, which puts stations and
    // named objects ahead of a debris cloud -- the layer order is the priority.
    for (const layer of LAYERS) {
      if (!isLayerOn(layer.id)) continue;
      const gl = glyphLayers.get(layer.id);
      if (!gl) continue;
      const hit = gl.pick(ndcX, ndcY);
      if (hit) return hit;
    }
    return null;
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
    // Deliberately NOT asking the glyph layer: it owns a packed position buffer for drawing, and
    // exposing a per-record lookup would make the camera depend on a layer being visible. The
    // contract's propagate + stage.toScene answers this for any record, drawn or not.
    const p = propagate(record, clock.now());
    if (!p) return null;
    return stage.toScene(p, p.frame, clock.now());
  }

  function arrivalDistance(record) {
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
  };

  function setMoment(next, { silent } = {}) {
    if (!MOMENTS.includes(next)) next = 'wonder';
    moment = next;
    for (const layer of LAYERS) layer.on = !!(layer.moments && layer.moments[moment]);
    for (const [id, gl] of glyphLayers) gl.setVisible(isLayerOn(id));
    if (moment === 'now' && observer) ctx.skyView.enter(observer);
    else if (ctx.skyView.active) ctx.skyView.exit();
    if (!silent) history.replaceState(null, '', `#${moment}`);
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
  for (const layer of ordered) {
    try {
      const records = await loadLayer(layer, clock.now());
      layerRecords.set(layer.id, records || []);
      const gl = createGlyphLayer(scene, layer);
      gl.setRecords(records || []);
      gl.setVisible(ctx.isLayerOn(layer.id));
      glyphLayers.set(layer.id, gl);
      window.dispatchEvent(new CustomEvent('sr:layer', { detail: { id: layer.id, count: (records || []).length } }));
    } catch (err) {
      // A layer that fails is a layer that is absent, never a page that is broken.
      console.warn(`layer ${layer.id} did not load`, err);
      layerRecords.set(layer.id, []);
      window.dispatchEvent(new CustomEvent('sr:layer', { detail: { id: layer.id, count: 0, error: String(err) } }));
    }
  }
}

// --- small helpers -----------------------------------------------------------

function readMomentFromHash() {
  const h = (location.hash || '').replace('#', '').split('/')[0];
  return MOMENTS.includes(h) ? h : 'wonder';
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

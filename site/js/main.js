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
import { parseFrame } from './propagate/frames.js';
import { createWorlds, WORLDS } from './scene/worlds.js';
import { createStarfield } from './scene/starfield.js';
import { createGlyphLayer } from './scene/glyphs.js';
import { createHeroes, closeUpDistance } from './scene/heroes.js';
import { createCameraRig, worldFramingDistance } from './scene/camera.js';
import { createViewShift } from './scene/viewshift.js';
import { readMoment, writeMoment, bootLink, laterLink, write as writeUrlState, clear as clearUrlState, stopIndex } from './ui/urlstate.js';
import { guessObserver } from './sky/guessplace.js';
import { COPY, CITIES } from './copy/en.js';
import { LAYERS, loadLayer } from './data/layers.js';
import * as sources from './data/sources.js';
import { createSkyView } from './sky/skyview.js';
import { showCard, hideCard } from './ui/cards.js';
import { createControls } from './ui/controls.js';
import { createStatus } from './ui/status.js';
import { createMobileUI } from './ui/mobile.js';
import { createSceneNote } from './ui/scenenote.js';
import { createGitHubMark } from './ui/github.js';
import { createTrip } from './ui/trip.js';
import { createTripFrame } from './ui/tripframe.js';
import { createVeil } from './ui/veil.js';
import { rankPick, rankAll } from './scene/pickrank.js';
import { createLod } from './scene/lod.js';
import { createStars3d } from './scene/stars3d.js';
import { createGalaxy } from './scene/galaxy.js';
import { createDsoGlow } from './scene/dsoglow.js';
import { isLadderStage } from './scene/stage.js';
import { SUN_INERTIAL, STAGES } from './scene/stage.js';
import { showChooser, hideChooser } from './ui/chooser.js';
import { createLabels } from './ui/labels.js';
import { createOrbitLine } from './scene/orbitline.js';
import { createOrbitRings } from './scene/orbitrings.js';
import { createFrameLatch, shouldSaveData } from './scene/quality.js';
import { keyById, bucketOf } from './data/colorkeyrules.js';

const MOMENTS = ['wonder', 'now', 'next'];

export async function boot({ setStatus } = {}) {
  const say = setStatus || (() => {});
  const canvas = document.getElementById('stage');

  say('Building the sky…');
  const rendererApi = createRenderer(canvas);
  const { renderer, scene, camera, resize, render } = rendererApi;
  // The arrow keys fly the camera (scene/camera.js). Not during a trip: ui/tripframe.js gives the
  // arrows to the stops there -- left and right are previous and next -- and one key doing two
  // things at once is how a control stops being trusted.
  const cameraRig = createCameraRig(camera, canvas, {
    keysEnabled: () => !(ctx && ctx.trip && ctx.trip.state && ctx.trip.state.phase !== 'idle'),
  });
  // A phone's card is a sheet over the lower half of the canvas; this keeps the centre of the view
  // in the part left uncovered (scene/viewshift.js says why and how).
  const viewShift = createViewShift(camera, canvas);

  // The camera is how worlds.js decides a planet is near enough to be worth its map; without it the
  // eight planets, the Moon and the Sun would stay in their mean colours for good.
  const worlds = createWorlds(scene, { camera });
  const starfield = createStarfield(scene, {
    starsBin: 'data/stars.bin',
    linesJson: 'data/constellations.lines.json',
    namesJson: 'data/constellation-names.json',
    milkyWayTexture: 'textures/2k_stars_milky_way.webp',
  });

  // Records, keyed by layer id. Layers fill in as their data lands; the loop reads whatever is
  // there. A layer that never loads is simply absent -- it never blocks a frame.
  const layerRecords = new Map();
  const glyphLayers = new Map();
  let selected = null;
  let observer = null;
  let moment = readMomentFromHash();
  // The link, read NOW, before any of the app's own writers below can touch the hash; its clock
  // keys are applied here and the rest waits for the layers (ui/urlstate.js bootLink says why).
  const link = bootLink(clock);

  const ctx = {
    clock, stage, scene, camera, cameraRig, viewShift, worlds, renderer, rendererApi, sources,
    layers: LAYERS,
    records: () => [...layerRecords.values()].flat(),
    recordsFor: (id) => layerRecords.get(id) || [],
    recordById: (id) => ctx.records().find((r) => r.id === id) || null,
    selected: () => selected,
    select,
    deselect,
    flyToRecord: (record, ms) => flyToRecord(record, ms),
    get observer() { return observer; },
    setObserver: (o) => { observer = o; window.dispatchEvent(new CustomEvent('sr:observer', { detail: o })); },
    get moment() { return moment; },
    setMoment,
    isSecure: window.isSecureContext === true,
  };

  // The scale ladder's level of detail (spec 0028 req 10): a table in registry/lod.yaml, hooks here.
  const stars3d = createStars3d(scene);
  ctx.stars3d = stars3d;
  // The naked-eye sky, on ctx for one reader: ui/trip.js stretches both star draws on a ladder
  // flight (spec 0034), and the two must never disagree during the lod crossfade between them.
  ctx.starfield = starfield;
  const galaxy = createGalaxy(scene);
  ctx.galaxy = galaxy;
  // Deep-sky objects as big as they are, when that is bigger than their dot (scene/dsoglow.js).
  const dsoGlow = createDsoGlow(scene);
  ctx.dsoGlow = dsoGlow;
  window.addEventListener('sr:layer', (e) => { if (e.detail && e.detail.id === 'deep-sky') dsoGlow.setRecords(ctx.recordsFor('deep-sky')); });
  const lod = createLod({
    'sky-panorama': (k) => starfield.setSkyOpacity && starfield.setSkyOpacity(k),
    'stars-3d': (k) => stars3d.setOpacity(k),
    'galaxy-model': (k) => galaxy.setOpacity(k),
  });
  window.addEventListener('sr:stage', () => { stars3d.rebuild(); galaxy.rebuild(); dsoGlow.rebuild(); });
  ctx.lod = lod;
  ctx.skyView = createSkyView(ctx);
  const heroes = createHeroes(scene, ctx);
  ctx.heroes = heroes; // the status panel reads count(); a browser check reads poolCap()
  // Constructed BEFORE the layers load, because the trip counts which layers have landed by
  // listening for `sr:layer` -- and a layer that landed before anybody was listening is a layer
  // the trip would then wait eight seconds for.
  // THE ONE BLACK (spec 0034 req 1): over the canvas and the labels, under every panel, the card
  // and the trip's letterbox. A stage change in a trip goes through it; the reduced-motion
  // cross-fade is it. Mounted on <body> beside the canvas, because the trip frame is a stacking
  // context of its own and anything inside it sits over the card.
  ctx.veil = createVeil(document.body, {
    reducedMotion: () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
  });
  ctx.trip = createTrip(ctx);

  say('Placing Earth…');
  // One frame before any data: the world, the stars, the light.
  worlds.update(clock.now());
  // The camera rig knows nothing about worlds; it is told the radius so it can clamp, and where
  // to look. Earth's radius in scene units is 6371 / unitKm.
  cameraRig.setWorldRadius(6371 / stage.unitKm);
  cameraRig.setWorldCentre({ x: 0, y: 0, z: 0 });
  cameraRig.setTarget({ x: 0, y: 0, z: 0 });
  // 3.5 radii (22 units), or further on a screen too narrow to show the whole globe at that.
  cameraRig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: worldFramingDistance(6371 / stage.unitKm, camera.fov, camera.aspect), ms: 0 });
  render();
  revealUI();

  // The layer switches, BEFORE the panel that presses them. createControls() applies the moment's
  // defaults to every layer as it builds, through ctx.setLayerOn; until 2026-09-22 that was
  // attached 260 lines below, so the panel's fallback wrote `layer.enabled = false` on every layer
  // off in Wonder -- and `enabled: false` means "the registry switched this layer off": no glyph
  // layer, never loaded, and the box did nothing. "Everything active", the geostationary ring,
  // the famous debris and the reentries read "nothing loaded" on every visit for that reason.
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

  say('Reading the catalogues…');
  createControls(ctx);
  createStatus(ctx);
  ctx.mobile = createMobileUI();
  // One line on the scene when no satellite could be read at all (ui/scenenote.js).
  ctx.sceneNote = createSceneNote(ctx);
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
  // The planets' paths and a dot at each, on the Sun stage while a trip names them (`orbits:` in
  // registry/tours.yaml; scene/orbitrings.js says why "A year in a minute" needs them).
  ctx.orbitRings = createOrbitRings(scene, { renderer });
  setMoment(moment, { silent: true });

  // The rest of the link is applied ONCE the layers have landed (spec 0032 req 2): a trip
  // resolves its stops against records and `at` names one, so before this there is nothing to
  // apply it to. The moment and the clock were applied at boot already, and what is applied here
  // is the link as it was read then, not the hash as it is now (2026-09-23: the hash by now holds
  // the app's own clock, up to a second stale, and re-applying it undid a visitor's first scrub).
  // Registered before the load starts so the event cannot be missed.
  // A trip the visitor has already started by then outranks the link (ui/urlstate.js laterLink).
  window.addEventListener('sr:layers-ready', () => {
    const tripRunning = !!(ctx.trip && ctx.trip.state && ctx.trip.state.phase !== 'idle');
    applyUrlState(ctx, laterLink(link, tripRunning));
  }, { once: true });

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
    // And back: a thing inside the Solar System, chosen on a rung (from search, or the Next list),
    // sits inside the Sun's pixel there and its layer does not draw (isLayerDrawable above), so the
    // camera would fly into one pixel and show nothing. It goes home to the Earth stage first. The
    // Sun is a place on the ladder and stays.
    else if (record && isLadderStage(stage.worldId) && opts.fly !== false
      && !['star', 'exoplanet', 'dso', 'exotic'].includes(record.klass) && !(record.klass === 'world' && record.id === 'sun')) ctx.setStage('earth');
    selected = record;
    // Start the map now, not when the disc grows past the threshold mid-flight: a selected world is
    // about to fill the screen, and a trip's own flight (fly: false) needs it just as much.
    if (record && record.klass === 'world') worlds.preload(record.id);
    for (const gl of glyphLayers.values()) if (gl.setSelected) gl.setSelected(record ? record.id : null);
    showCard(record, ctx);
    if (ctx.orbitLine) ctx.orbitLine.setRecord(record);
    if (opts.fly !== false) flyToRecord(record);
    else cameraRig.follow(() => positionOfRecord(record));
    window.dispatchEvent(new CustomEvent('sr:select', { detail: record }));
  }

  /**
   * Fly to a record and follow it. THE one definition: select() uses it, and so does the card's
   * "Fly to it" button through ctx.flyToRecord.
   *
   * The card used to have its own: the record's TRUE position through stage.toScene, at 2 % of its
   * distance. For a satellite that is a different framing of the same place. For a planet it is
   * empty sky -- worlds.js draws Mars along its true direction but ~115x nearer, so the button
   * that says "Fly to it" on Mars's own card flew 1.8 au past the disc and stopped there, looking
   * at nothing. positionOfRecord below says why in as many words; the card never asked it.
   */
  function flyToRecord(record, ms = 900) {
    if (!record) return false;
    if (record.klass === 'world') worlds.preload(record.id);
    const on = teachRigWorld(record);
    const pos = positionOfRecord(record);
    if (pos) cameraRig.flyTo({ targetScene: pos, distance: arrivalDistance(record, pos), ms });
    // Following something standing on the Moon is following the Moon, which crosses its own
    // radius in about half an hour, so its centre is re-taught with every tick of the target.
    cameraRig.follow(on
      ? () => {
        const c = worlds.drawnPositionOf(on);
        if (c) cameraRig.setWorldCentre(c);
        return positionOfRecord(record);
      }
      : () => positionOfRecord(record));
    return !!pos;
  }

  /**
   * The world a record stands on, when that is not the stage's own: a landing site on the Moon or
   * Mars, seen from the Earth stage. Null for everything else, the stage's own ground included.
   */
  function surfaceWorldOf(record) {
    const f = record && record.propagator === 'fixed' ? parseFrame(record.frame) : null;
    if (!f || f.kind !== 'fixed' || f.world === stage.worldId) return null;
    return worlds.drawnPositionOf(f.world) ? f.world : null;
  }

  /**
   * Tell the rig which world the camera must stay out of, and which way is "outward" when it frames
   * a flight. It was told once, at boot, and kept the stage's world for good -- so every flight to
   * a site on the Moon's near side was framed outward from EARTH's centre, along a line that runs
   * on into the Moon. Measured 2026-09-22 in headless Chrome: Apollo 12, selected, parked the camera
   * 231 km under the lunar surface, drawing the lunar module against the stars; the four older
   * Apollo sites did the same. ui/trip.js already re-teaches the rig at every stop (composeShot); a
   * plain selection now does too, and puts the stage's world back for anything that is not on
   * another world's ground. Returns the world it taught, or null.
   */
  function teachRigWorld(record) {
    const on = surfaceWorldOf(record);
    if (on) {
      cameraRig.setWorldRadius(worlds.drawnRadiusUnits(on));
      cameraRig.setWorldCentre(worlds.drawnPositionOf(on));
      return on;
    }
    const w = WORLDS.find((x) => x.id === stage.worldId);
    cameraRig.setWorldRadius(w ? w.radiusKm / stage.unitKm : 0);
    cameraRig.setWorldCentre({ x: 0, y: 0, z: 0 });
    return null;
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

  function arrivalDistance(record, pos) {
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
    // No farther than the selected model can be drawn at full size (scene/heroes.js
    // closeUpDistance): at 35 % of the stations layer's nearKm the camera parked 7 000 km from
    // Tiangong, and the altitude cap drew the station smaller than the satellites around it.
    const el = ctx.renderer && ctx.renderer.domElement;
    const h = el && el.clientHeight > 0 ? el.clientHeight : window.innerHeight;
    const f = ctx.camera ? ctx.camera.projectionMatrix.elements[5] : 0;
    const close = pos ? closeUpDistance(pos, h, f) : Infinity;
    return Math.max(0.05, Math.min((nearKm * 0.35) / stage.unitKm, close));
  }

  /**
   * Is this layer drawn right now? On, and -- for a layer that lives on the ladder's rungs (planets
   * around other stars, deep-sky objects, black holes) -- only when the stage is a rung. From a
   * world stage their true positions are past the far plane and, MEASURED 2026-09-08 in the browser,
   * the glyph shader drew them anyway as a green rash over Earth's sky. The layer stays "on" in the
   * panel; it simply has nothing honest to draw from here, and its records still count and search.
   */
  // A TRIP NO LONGER HIDES THE LAYERS AROUND ITS SUBJECT, and the reason is worth keeping.
  //
  // Ivan reported "stations inside the earth" in the stations tour, and asked for the crowd to be
  // hidden while a stop is zoomed in. That was shipped here on 2026-09-17 (public #125) as: while
  // a trip holds still inside the subject's own layer nearKm, draw only the subject's layer.
  //
  // It was measured against the tour afterwards and it was wrong at both ends. `nearKm` is the
  // distance at which scene/heroes.js starts giving a record REAL GEOMETRY -- 20 000 km for the
  // stations layer, deliberately generous so the model exists before you arrive. It is not a
  // statement about framing. So the rule:
  //   - did not fire at the stop Ivan was describing (`far`, 32 000 km, outside the 20 000);
  //   - did fire at `iss` and `tiangong` (3 000 km), which were never the problem,
  // and the result was the next thing he reported: "i dont see many objects now at all".
  //
  // The stations really were inside the Earth, and not because of the crowd: a selected hero is
  // drawn at 260 px whatever the distance, so at 32 000 km the ISS was 4 308 km in radius and
  // reached most of the way to the planet's core. That is fixed where it is caused, in
  // scene/heroes.js (`heroScale`), and this predicate goes back to answering only what it can
  // answer honestly: is the layer on, and does it have anything true to draw from this stage.
  // On a rung of the ladder the whole Solar System is one pixel. A layer of things inside it stacks
  // every glyph on the Sun: measured 2026-09-22, the probes and oddities drew one purple ringed blob
  // where the Sun should be, and with live data every satellite would sit on that pixel for a tap
  // near the Sun to pick. There only the ladder's own layers draw, and the worlds, which keep the
  // Sun's name; stars3d draws the Sun itself as a star.
  const LADDER_SCALE_LAYERS = new Set(['stars', 'galaxy', 'worlds']);
  function isLayerDrawable(layer) {
    if (!layer || !isLayerOn(layer.id)) return false;
    const ladder = isLadderStage(stage.worldId);
    if (layer.ladderOnly && !ladder) return false;
    if (ladder && !layer.ladderOnly && !LADDER_SCALE_LAYERS.has(layer.id)) return false;
    return true;
  }
  ctx.isLayerDrawable = isLayerDrawable;


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
    cameraRig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: w ? worldFramingDistance(r, camera.fov, camera.aspect) : 5, ms: 0 });
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

  // THE URL IS THE STATE (spec 0017's rule, spec 0032's keys). Two more writers beside the moment,
  // both through ui/urlstate.js so the format has one owner; the trip writes its own keys from
  // ui/trip.js. replaceState throughout: nothing here adds a history entry.
  //
  // `at` is what is selected (req 4). Not the trip's own select of a stop's subject: `trip` and
  // `stop` already say where, and `at` on top would name the same thing twice and outlive it.
  window.addEventListener('sr:select', (e) => {
    const record = e && e.detail;
    if (!record) { clearUrlState(['at']); return; }
    if (ctx.trip && ctx.trip.currentRecordId() === record.id) return;
    writeUrlState({ at: record.id });
  });
  // `t` and `rate`, only when the clock is not live (req 5): a link never carries `t=now`, and
  // `t` absent means now. Trailing-edge throttle at one write a second, because a scrub is a
  // goTo() per pointer event and replaceState a hundred times a second is what browsers rate-limit.
  let clockWroteAt = -Infinity;
  let clockWriteTimer = 0;
  const writeClock = () => {
    clockWriteTimer = 0;
    clockWroteAt = performance.now();
    if (clock.mode === 'live') { clearUrlState(['t', 'rate']); return; }
    const ms = clock.now();
    if (!Number.isFinite(ms)) return;
    writeUrlState({
      t: new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z'),
      rate: clock.rate === 1 ? null : String(clock.rate),
    });
  };
  clock.onChange(() => {
    if (clockWriteTimer) return;
    const wait = 1000 - (performance.now() - clockWroteAt);
    if (wait <= 0) writeClock();
    else clockWriteTimer = setTimeout(writeClock, wait);
  });

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
  function degrade() {
    if (ctx.renderer && ctx.rendererApi && ctx.rendererApi.setQuality) ctx.rendererApi.setQuality('low');
    if (starfield && starfield.setDetail) starfield.setDetail('low');
    window.dispatchEvent(new CustomEvent('sr:quality', { detail: { level: 'low', medianMs: Math.round(latch.median()) } }));
  }
  // Read by ui/trip.js, which keeps the star-stretch at 0 on a latched device (spec 0034 req 6),
  // and forced from a console or a browser check the way a slow device would trip it.
  ctx.latch = {
    get latched() { return latch.latched; },
    force() { if (latch.force()) degrade(); return latch.latched; },
  };
  // Read once: every extra hero model is a file to fetch, so a metered or slow connection keeps
  // the model pool at its floor (scene/heroes.js, nextHeroCap).
  const saveData = typeof navigator !== 'undefined' && shouldSaveData(navigator.connection);
  // Spec 0037: the eclipse shaders. They were gated on the frame latch as the spec asked, and on
  // 2026-09-23 the live "Chasing the solar eclipse" trip said "The shadow is not drawn on this
  // device" -- on exactly the slow phones the latch trips on, which is a trip about a shadow with
  // no shadow. The cost does not justify it: #228 measured no difference above noise with the
  // shadow on or off (SwiftShader, Earth filling the screen), and the branch runs only while the
  // Moon is within 1.7 degrees of the Sun from the Earth, i.e. only at an eclipse. So the shadow
  // draws whatever the latch says. ctx.eclipseOverride (true / false / null) stays for probes and
  // tests; nothing in the app sets it, and the "not drawn here" line is reached only through it.
  ctx.latched = () => latch.latched;
  ctx.eclipseOverride = null;
  ctx.eclipseDrawn = () => ctx.eclipseOverride !== false;

  function frame(nowReal) {
    requestAnimationFrame(frame);
    // Never negative. requestAnimationFrame stamps a frame with the time it BEGAN, which can be
    // earlier than the performance.now() `last` was set from -- and a negative first step was added
    // to the 10 Hz accumulator below, holding the glyph and label updates back until real time paid
    // it off: over a minute in headless Chrome (found 2026-09-22 by the famous-stars work), and the
    // "glyph layers read zero for ~20 s after boot" that earlier probes put down to a race. It also
    // nudged the clock backwards and fed the frame-rate latch a negative frame.
    const frameMs = Math.max(0, nowReal - last); // the real duration, before the clamp below
    const dt = Math.min(100, frameMs);           // a backgrounded tab must not lurch on return
    last = nowReal;
    if (!document.hidden && latch.push(frameMs, nowReal)) degrade();

    clock.tick(dt);
    const t = clock.now();
    stage.setTime(t);   // every frame conversion this tick reads it; set it before anything does

    resize();
    if (ctx.viewShift) ctx.viewShift.update(dt);
    cameraRig.update(dt);
    worlds.setEclipseAllowed(ctx.eclipseDrawn());
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
        // EVERY layer, not only the ladder's. This used to be `ladderOnly &&`, which was enough
        // when the ladder was the only reason a layer that is ON is not drawn. It is the only
        // reason again now that the trip's focus is gone, but asking every layer costs a boolean
        // and stops the next reason from arriving as a layer that never comes back.
        if (gl.setVisible) gl.setVisible(drawable);
        if (drawable) gl.update(t, ctx.camera);
      }
    }

    // Labels ride the same tick as the glyphs they sit over, so the two never drift apart.
    if (ctx.labels && sinceLayerUpdate === 0) ctx.labels.update(t);
    if (ctx.orbitLine) ctx.orbitLine.update(t);
    if (ctx.orbitRings) {
      const st = ctx.trip && ctx.trip.state;
      ctx.orbitRings.update(t, st && st.phase !== 'idle' ? st.orbits : null);
    }

    // The ladder's level of detail, on the same tick: how far the camera is from the Sun, in km.
    if (lod && sinceLayerUpdate === 0) {
      const camKm = stage.fromScene(ctx.camera.position);
      const sunKm = stage.toStageFrame({ x: 0, y: 0, z: 0 }, SUN_INERTIAL, t);
      if (camKm && sunKm) lod.apply(Math.hypot(camKm.x - sunKm.x, camKm.y - sunKm.y, camKm.z - sunKm.z));
    }

    // What the frame cost and what the device has already admitted about itself: scene/heroes.js
    // spends a fast machine's headroom on more models and gives it back when the frames say so.
    if (heroes) heroes.update(t, { frameMs, latched: latch.latched, saveData });
    if (starfield && starfield.update) starfield.update(ctx.camera);
    if (ctx.stars3d) ctx.stars3d.update(ctx.camera, ctx.renderer);
    if (ctx.galaxy) ctx.galaxy.update(ctx.camera, ctx.renderer);
    if (ctx.dsoGlow) ctx.dsoGlow.update(ctx.camera, ctx.renderer, ctx.isLayerDrawable(LAYERS.find((l) => l.id === 'deep-sky')));
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
  // `load: 'on-demand'` (registry/layers.yaml) is the same wait by design: the active catalogue
  // is 7 MB for 16 587 objects, and nobody asked for it until they ticked the box.
  for (const l of LAYERS) l.deferred = !!(saveData && l.heavy) || l.load === 'on-demand';
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
    // One mark per object: the dot fades out as that record's 3D model fades in.
    // Read through ctx at call time: this function has no `heroes` of its own (the first version
    // named one, and the browser check said `heroes is not defined` -- no unit test could).
    gl.setModelOpacity((id) => (ctx.heroes ? ctx.heroes.drawnOpacity(id) : 0));
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
  // A source that answers AFTER its layers have drawn -- a live file arriving behind a saved copy,
  // or a background refresh once a cadence has passed (data/sources.js) -- redraws those layers.
  // sources.onUpdate() existed and nothing listened, so a refresh reached the cache and never the
  // map. A layer still on its first load is skipped: its own load is about to draw the same data.
  const drawnAt = new Map();
  sources.onUpdate((sourceId, result) => {
    if (!result || result.data == null) return;
    const stamp = result.fetchedAt || 0;
    if (drawnAt.get(sourceId) === stamp) return;
    drawnAt.set(sourceId, stamp);
    for (const layer of ordered) {
      if (layer.deferred || !layerRecords.has(layer.id)) continue;
      if (idsOf(layer).includes(sourceId)) one(layer);
    }
  });

  function pool(list, size) {
    let next = 0;
    const worker = async () => {
      while (next < list.length) await one(list[next++]);
    };
    return Promise.all(Array.from({ length: Math.min(size, list.length) }, worker));
  }
  await Promise.all([pool(local, 6), pool(upstream, 3)]);
}

// --- the link ------------------------------------------------------------------
//
// A deep link (spec 0032): `#trip=moon-landings&stop=3`, `#at=europa`, `#t=2027-08-02T10:00:00Z`,
// `#stage=saturn`, in any combination. Read once, at boot. The clock is applied then (every
// position is a function of it, and it needs nothing loaded: ui/urlstate.js bootLink); the rest
// once the layers land, in this order: the stage first (a record is selected on the
// map it is drawn on), then EITHER a trip OR a selection -- a trip selects its own stops, so `at`
// beside `trip` would fight it. A key that names nothing known is ignored and the scene says so
// in one line (ui/scenenote.js); the rest of the link still applies, and the dead key leaves the
// address bar so a link copied from here does not carry it on.

function linkNote(ctx, line, deadKeys) {
  if (ctx.sceneNote && typeof ctx.sceneNote.say === 'function') ctx.sceneNote.say(line);
  if (deadKeys) clearUrlState(deadKeys);
}

function applyUrlState(ctx, st) {
  if (!st) return;
  // A newer format: this reader cannot tell what the keys it does recognise mean in it, so it
  // applies none of them rather than half of a link.
  if (st.unknownVersion) { linkNote(ctx, COPY.link.unknownVersion); return; }
  // `t` and `rate` are not here: ui/urlstate.js bootLink() applied them at boot, and took them out.
  if (st.stage) {
    if (STAGES[st.stage]) ctx.setStage(st.stage);
    else linkNote(ctx, COPY.link.unknownStage, ['stage']);
  }
  // A trip that is not on this map is ignored like any other unknown key: `at` still applies.
  if (st.trip && openTrip(ctx, st)) return;
  if (st.at) openAt(ctx, st.at);
}

/** @returns {boolean} whether the link named a trip this map has (and so is starting it). */
function openTrip(ctx, st) {
  const tour = ctx.trip.tours().find((x) => x.id === st.trip);
  if (!tour) { linkNote(ctx, COPY.link.unknownTrip, ['trip', 'stop']); return false; }
  const index = stopIndex(tour, st.stop);
  // Through start(), so the intro card and its count are honest: a link into stop 3 still shows
  // "10 stops, about four minutes" and Start -- a decision rather than an ambush (spec 0025 §4) --
  // and Start then flies to stop 3 (ui/trip.js jumpTo). A trip that cannot reach its own minimum
  // today is refused by start() and the panel row says why; nothing to add here.
  ctx.trip.start(tour.id).then((plan) => {
    if (!plan || plan.offerable === false) return;
    if (index > 0) ctx.trip.jumpTo(index);
  });
  return true;
}

function openAt(ctx, id) {
  const record = ctx.recordById(id);
  if (!record) { linkNote(ctx, COPY.link.unknownAt, ['at']); return; }
  // Spec 0021's rule, as ui/search.js: a record whose layer is off has no mark and no model, so
  // flying to it arrives at empty sky. The layer goes on first, and the panel is told (it paints
  // its checkboxes from its own state, and ignores an event with no `from` as its own echo).
  if (record.layer && !ctx.isLayerOn(record.layer)) {
    ctx.setLayerOn(record.layer, true);
    document.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id: record.layer, on: true, handled: true, from: 'link' } }));
  }
  ctx.select(record, { fly: true });
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

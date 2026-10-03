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
import { createWorlds, WORLDS, positionOf } from './scene/worlds.js';
import { createStarfield } from './scene/starfield.js';
import { createGlyphLayer } from './scene/glyphs.js';
import { createHeroes, closeUpDistance, SELECTED_PX } from './scene/heroes.js';
import { limbFraming, fitDistance, discDistance } from './scene/framing.js';
import { createCameraRig, worldFramingDistance } from './scene/camera.js';
import { createViewShift, MAX_SHIFT_FRACTION } from './scene/viewshift.js';
import { readMoment, writeMoment, bootLink, laterLink, read as readUrlKeys, write as writeUrlState, clear as clearUrlState, stopIndex } from './ui/urlstate.js';
import { guessObserver } from './sky/guessplace.js';
import { COPY, CITIES } from './copy/en.js';
import { LAYERS, loadLayer } from './data/layers.js';
import * as sources from './data/sources.js';
import { createSkyView } from './sky/skyview.js';
import { showCard, hideCard } from './ui/cards.js';
import { createShell } from './ui/shell.js';
import { createExplore } from './ui/explore.js';
import { createRail } from './ui/rail.js';
import { createTimePill } from './ui/timepill.js';
import { createSceneNote } from './ui/scenenote.js';
import { buildIndex, findMatches, LINK_MIN_SCORE } from './ui/search.js';
import { createDensity } from './ui/density.js';
import { createTrip } from './ui/trip.js';
import { createVeil } from './ui/veil.js';
import { createAudio } from './audio/engine.js';
import { createLoader } from './audio/load.js';
import { createBeds } from './audio/beds.js';
import { createStings } from './audio/stings.js';
import { rungOf } from './audio/pick.js';
import { AUDIO } from './data/audio.js';
import { rankPick, rankAll } from './scene/pickrank.js';
import { createLod } from './scene/lod.js';
import { createStars3d, NAMED_STARS } from './scene/stars3d.js';
import { createGalaxy } from './scene/galaxy.js';
import { createDsoGlow } from './scene/dsoglow.js';
import { createExposure } from './scene/exposure.js';
import { isLadderStage, isSystemStage } from './scene/stage.js';
import { createSystems } from './scene/systems.js';
import { SUN_INERTIAL, STAGES } from './scene/stage.js';
import { showChooser, hideChooser } from './ui/chooser.js';
import { createLabels } from './ui/labels.js';
import { createHud } from './ui/hud.js';
import { createOrbitLine } from './scene/orbitline.js';
import { createGroundTrack } from './scene/groundtrack.js';
import { createTrackLabels } from './ui/tracklabels.js';
import { createOrbitRings, periodMsOfWorld } from './scene/orbitrings.js';
import { createFrameLatch, shouldSaveData, chooseTier, createTierPromoter } from './scene/quality.js';
import { createLiveClouds } from './scene/liveclouds.js';
import { createTextureTiers } from './scene/texturetiers.js';
import { setEarthMap, earthMapsSettled } from './scene/earth.js';
import { keyById, bucketOf } from './data/colorkeyrules.js';

const MOMENTS = ['wonder', 'now', 'next'];
/** How long after sr:layers-ready the aurora's module is fetched (OFF THE FIRST VISIT, in boot). */
const AURORA_IMPORT_MS = 4000;

/**
 * ctx.aurora until scene/aurora.js has loaded, and for good on a connection that saves data: the
 * same calls the card, the Sources sheet, the layers panel and the frame loop make, answered with
 * what is true before any forecast is held. Its words are the real module's (copy/en.js COPY.aurora).
 */
function auroraStandIn(saveData, layerOn) {
  const A = COPY.aurora;
  const api = {
    failed: false,
    start() {},
    tick() {},
    setTier() {},
    state: () => ({ phase: saveData ? 'off' : api.failed ? 'failed' : 'waiting', reason: saveData ? 'saveData' : null, summary: null, visible: false }),
    line: () => (saveData ? A.saveData : !layerOn() ? A.switchedOff : api.failed ? A.failed : A.waiting),
    credit: () => [A.credit],
    peak: () => (saveData || api.failed ? 0 : undefined),
    rightNow: () => null,
    showMe: () => null,
  };
  return api;
}

/** How long after sr:layers-ready the weather's modules are fetched (OFF THE FIRST VISIT, in boot). */
const WEATHER_IMPORT_MS = 4500;

/**
 * ctx.weather until scene/weather/index.js has loaded, and for good where weather is not drawn: at
 * tier 0 and on a connection that saves data (spec 0066 requirement 8). The same calls the card, the
 * Sources sheet, the layers panel and the frame loop make. A world's line is null -- nothing is
 * drawn for it yet, so there is nothing to say; the Earth's says why there is no lightning.
 */
function weatherStandIn(off, layerOn) {
  const L = COPY.weather.lightning;
  const api = {
    failed: false,
    start() {},
    tick() {},
    latch() {},
    state: () => ({ phase: off ? 'off' : api.failed ? 'failed' : 'waiting' }),
    line: (worldId) => (worldId !== 'earth' ? null : off ? L.off : !layerOn() ? L.switchedOff : api.failed ? L.failed : L.waiting),
    credit: () => [L.credit],
    perMinute: () => (off || api.failed ? 0 : undefined),
  };
  return api;
}

/**
 * OFF THE FIRST VISIT (2026-10-01, internal #188). The named stars (data/stars3d.names.json, 288 kB)
 * and the exoplanet table (data/exoplanets.csv, 582 kB, the fallback CI and a visit without our
 * snapshot read) are drawn only from the ladder's rungs and a star system's stage, never on the
 * Earth the first screen shows. They were 870 kB of the 6.35 MB first visit all the same. They now
 * load LATER_LAYERS_MS after sr:layers-ready, in an idle moment (past the two seconds
 * tests/test_first_visit_bytes.mjs lets the first visit settle), or at once when something needs
 * them sooner: a ladder or system stage, the search box, a trip or an `at` the map cannot resolve
 * without them (ctx.loadAfterFirstVisit).
 */
const LATER_LAYERS = new Set(['stars', 'exoplanets']);
const LATER_LAYERS_MS = 3000;
/** How long after sr:layers-ready the controls hint is imported and may show (ui/keyhint.js): after
 * the later layers and the aurora, when the first view has settled and before a visitor gives up. */
const KEYHINT_MS = 5000;
// The email row under Coming up (ui/subscribe.js) is asked for this long after the layers settle,
// as the trip pictures are: below the sidebar's fold, and not a first visit's cost.
const SUBSCRIBE_MS = 3000;

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
  window.addEventListener('sr:layer', (e) => {
    if (!e.detail || e.detail.id !== 'deep-sky') return;
    dsoGlow.setRecords(ctx.recordsFor('deep-sky'));
    if (ctx.nebulae) ctx.nebulae.setRecords(ctx.recordsFor('deep-sky'));
  });
  // THE SHUTTER (spec 0067, scene/exposure.js): Eye, Camera or Deep, remembered. The Milky Way wears
  // it from the first frame; the photographs of the nebulae (scene/nebulae.js) wear it when they
  // exist, which on a first visit they do not: the module and its pictures are fetched on a rung
  // of the ladder, when a deep-sky object is selected, or when the visitor moves the shutter.
  const exposure = createExposure();
  ctx.exposure = exposure;
  starfield.setExposure(exposure.look().milkyWay);
  let skyStrength = 1;
  let nebulaeImport = null;
  ctx.wantNebulae = () => {
    if (nebulaeImport) return nebulaeImport;
    nebulaeImport = import('./scene/nebulae.js').then((m) => {
      const nebulae = m.createNebulae(scene, {
        skyGroup: starfield.group,
        look: exposure.look(),
        saveData: typeof navigator !== 'undefined' && shouldSaveData(navigator.connection),
        onPicture: () => dsoGlow.setPictured(nebulae.loaded()),
      });
      nebulae.setSkyOpacity(skyStrength);
      nebulae.setSkyVisible(!(ctx.latch && ctx.latch.latched));
      nebulae.setRecords(ctx.recordsFor('deep-sky'));
      const s = ctx.selected();
      nebulae.want(s ? s.id : null);
      ctx.nebulae = nebulae;
      return nebulae;
    }).catch((e) => { console.warn('the nebula pictures did not load', e); nebulaeImport = null; return null; });
    return nebulaeImport;
  };
  exposure.onChange((mode, look, byVisitor) => {
    starfield.setExposure(look.milkyWay);
    if (ctx.nebulae) ctx.nebulae.setExposure(look);
    else if (byVisitor) ctx.wantNebulae();
    window.dispatchEvent(new CustomEvent('sr:exposure', { detail: { mode } }));
  });
  window.addEventListener('sr:select', (e) => {
    const record = e && e.detail;
    if (record && record.klass === 'dso') ctx.wantNebulae().then((n) => { if (n) n.want(record.id); });
    else if (ctx.nebulae) ctx.nebulae.want(null);
  });
  const lod = createLod({
    'sky-panorama': (k) => {
      skyStrength = k;
      if (starfield.setSkyOpacity) starfield.setSkyOpacity(k);
      if (ctx.nebulae) ctx.nebulae.setSkyOpacity(k);
    },
    'stars-3d': (k) => stars3d.setOpacity(k),
    'galaxy-model': (k) => galaxy.setOpacity(k),
  });
  // A star and its planets at the system's own scale (spec 0040, scene/systems.js): built when its
  // stage is entered, dropped when it is left, nothing at boot.
  const systems = createSystems(scene, ctx);
  ctx.systems = systems;
  window.addEventListener('sr:stage', (e) => {
    stars3d.rebuild(); galaxy.rebuild(); dsoGlow.rebuild();
    const id = e && e.detail ? e.detail.worldId : stage.worldId;
    if (ctx.nebulae) ctx.nebulae.rebuild();
    else if (isLadderStage(id)) ctx.wantNebulae();
    if (isSystemStage(id)) systems.enter(id);
    else systems.leave();
  });
  ctx.lod = lod;
  ctx.skyView = createSkyView(ctx);
  const heroes = createHeroes(scene, ctx);
  ctx.heroes = heroes; // the status panel reads count(); a browser check reads poolCap()
  // Constructed BEFORE the layers load, because the trip counts which layers have landed by
  // listening for `sr:layer` -- and a layer that landed before anybody was listening is a layer
  // the trip would then wait eight seconds for.
  // THE ONE BLACK (spec 0034 req 1): over the canvas and the labels, under every panel, the card
  // and the trip's own bars. A stage change in a trip goes through it; the reduced-motion
  // cross-fade is it. Mounted on <body> beside the canvas, because the trip frame is a stacking
  // context of its own and anything inside it sits over the card.
  ctx.veil = createVeil(document.body, {
    reducedMotion: () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
  });
  ctx.trip = createTrip(ctx);
  // Sound (spec 0035): built now so the panels below can put its button in, and silent until a
  // visitor presses one. Creating it makes no AudioContext and fetches nothing (wireSound).
  ctx.audio = wireSound(ctx);
  // Regular or Compact (spec 0045 req 10), set on <html> before any panel is built.
  ctx.density = createDensity();

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

  // The layer switches, BEFORE the panel that presses them (createRail, whose What to show paints
  // from them). The old panel applied the moment's defaults as it built, through ctx.setLayerOn; until 2026-09-22 that was
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
    if (id === 'systems' && ctx.systems) ctx.systems.setVisible(on);
  };

  // TODAY'S CLOUDS (2026-09-28, scene/liveclouds.js): NASA GIBS's geostationary pictures, composed
  // in a worker and cross-faded onto the Earth. Created now so the card and the Sources panel can
  // ask it what the clouds are; it fetches nothing until START_DELAY_MS after the layers are ready, and
  // nothing at all on a connection that saves data.
  ctx.liveClouds = createLiveClouds({
    earth: () => worlds.meshFor('earth'),
    saveData: typeof navigator !== 'undefined' && shouldSaveData(navigator.connection),
    // An open Earth card rewrites its clouds line on this (ui/cards.js): the card repaints on the
    // clock, and at 1x nothing else would tell it the pictures arrived.
    onChange: () => window.dispatchEvent(new CustomEvent('sr:clouds')),
  });
  // Started once the catalogues have landed, not from here (below, on sr:layers-ready): a fixed
  // delay from boot let the ~600 kB of GIBS pictures fall inside a slow first visit. MEASURED
  // 2026-10-01 on CI with the new shell: 758 kB from other hosts, 594 kB of it GIBS, which took the
  // first visit to 6 810 227 B, over first_visit_bytes. The map's own data comes first, the weather
  // after it.

  // THE AURORA (2026-09-30, scene/aurora.js, spec 0053 task 3): NOAA's OVATION forecast of the next
  // hour, drawn on the night side. It fetches nothing until the layers have landed, builds no mesh
  // and compiles no shader until a forecast has arrived, and never runs on a connection that saves
  // data. Its box is the `aurora` layer (data/layers.js `draw: 'aurora'`).
  //
  // OFF THE FIRST VISIT (2026-10-01, internal #192 item 6). scene/aurora.js and data/ovation.js are
  // 19.5 kB gzip that nothing on the first screen draws, and they were in the boot graph (and its
  // modulepreload block) all the same. They now arrive by a dynamic import AURORA_IMPORT_MS after
  // sr:layers-ready, in an idle moment: after the catalogues and the two seconds
  // tests/test_first_visit_bytes.mjs lets the first visit settle, and before the forecast's first
  // look (data/ovation.js START_DELAY_MS, 8 s after the same event, which start() keeps). Until then
  // ctx.aurora is auroraStandIn (above boot), so the Earth card, the Sources sheet and the layers panel ask
  // it what they always asked and are told "waiting". The import replaces it and says so on
  // sr:aurora, which they already repaint on. On a connection that saves data the module is never
  // fetched: the stand-in says why there is no aurora, which is all the real one would say there.
  const auroraSaveData = typeof navigator !== 'undefined' && shouldSaveData(navigator.connection);
  ctx.aurora = auroraStandIn(auroraSaveData, () => isLayerOn('aurora'));
  function loadAuroraLater() {
    if (auroraSaveData) return;
    const readyAt = performance.now();
    const load = () => import('./scene/aurora.js').then((m) => {
      const aurora = m.createAurora({
        earth: () => worlds.meshFor('earth'),
        renderer,
        camera,
        scene,
        saveData: false,
        // The Earth card rewrites its aurora line on this, as it does its clouds line on sr:clouds.
        onChange: () => window.dispatchEvent(new CustomEvent('sr:aurora')),
      });
      ctx.aurora = aurora;
      aurora.start({ elapsedMs: performance.now() - readyAt });
      window.dispatchEvent(new CustomEvent('sr:aurora'));
    }).catch((e) => {
      ctx.aurora.failed = true;
      console.warn('the aurora module did not load', e);
      window.dispatchEvent(new CustomEvent('sr:aurora'));
    });
    setTimeout(() => {
      if (typeof requestIdleCallback === 'function') requestIdleCallback(load, { timeout: 4000 });
      else load();
    }, AURORA_IMPORT_MS);
  }
  window.addEventListener('sr:layers-ready', loadAuroraLater, { once: true });
  {
    const layer = LAYERS.find((l) => l.id === 'aurora');
    if (layer) {
      // The panel's number for this layer is the forecast's peak probability (copy/en.js
      // controls.layerCountParts.auroraPeak), not a count of records: it has none.
      layer.count = () => ctx.aurora.peak();
      layer.counts = () => [{ key: 'auroraPeak', n: ctx.aurora.peak() }];
    }
  }

  // WEATHER ON EVERY WORLD (2026-10-03, spec 0066, scene/weather/): the Earth's lightning from
  // NOAA's map, the giants' and Venus's air in motion, Mars's season. OFF THE FIRST VISIT like the
  // aurora -- one dynamic import WEATHER_IMPORT_MS after sr:layers-ready -- and NEVER at tier 0 or on
  // a connection that saves data: there ctx.weather stays the stand-in, every world keeps
  // scene/worlds.js's own shader and nothing is fetched. The tier is the boot tier (ctx.quality is
  // made below, before the layers land); a device promoted later keeps what it booted with.
  ctx.weather = weatherStandIn(auroraSaveData, () => isLayerOn('lightning'));
  function loadWeatherLater() {
    const off = auroraSaveData || !ctx.quality || ctx.quality.bootTier < 1;
    if (off) {
      ctx.weather = weatherStandIn(true, () => isLayerOn('lightning'));
      window.dispatchEvent(new CustomEvent('sr:weather'));
      return;
    }
    const readyAt = performance.now();
    const load = () => import('./scene/weather/index.js').then((m) => {
      const weather = m.createWeather({
        worlds,
        camera,
        reducedMotion: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
        // A world's card rewrites its weather line on this, as the Earth's does its clouds line.
        onChange: () => window.dispatchEvent(new CustomEvent('sr:weather')),
      });
      if (ctx.latch && ctx.latch.latched) weather.latch();
      ctx.weather = weather;
      weather.start({ elapsedMs: performance.now() - readyAt });
      window.dispatchEvent(new CustomEvent('sr:weather'));
    }).catch((e) => {
      ctx.weather.failed = true;
      console.warn('the weather modules did not load', e);
      window.dispatchEvent(new CustomEvent('sr:weather'));
    });
    setTimeout(() => {
      if (typeof requestIdleCallback === 'function') requestIdleCallback(load, { timeout: 4000 });
      else load();
    }, WEATHER_IMPORT_MS);
  }
  window.addEventListener('sr:layers-ready', loadWeatherLater, { once: true });
  {
    const layer = LAYERS.find((l) => l.id === 'lightning');
    if (layer) {
      // The panel's number for this layer is strikes a minute in NOAA's latest map (copy/en.js
      // controls.layerCountParts.lightningPerMin), not a count of records: it has none.
      layer.count = () => ctx.weather.perMinute();
      layer.counts = () => [{ key: 'lightningPerMin', n: ctx.weather.perMinute() }];
    }
  }

  say('Reading the catalogues…');
  // THE LAYOUT (spec 0061): one sidebar, one tool rail, one time pill. The shell builds the boxes;
  // each module below fills its own. The explore view (wordmark, search, the four tabs, Right now,
  // Trips, Coming up, the status line) is the sidebar's home; the sources sheet is a view of it; the
  // card is seated in it by the shell (ui/shell.js says how). The rail holds What to show (the
  // layers), the postcard and Hide (H); the pill is the clock.
  // The sources sheet is built on first opening (ui/shell.js ensureSources says why).
  const shell = createShell(ctx, { loadSources: (host) => import('./ui/status.js').then((m) => m.createStatus(ctx, host)) });
  createExplore(ctx, shell.host('home'));
  // The Tonight tab (spec 0051 task 2): your sky tonight, the next pass you can see and its countdown.
  // Imported the first time the tab is shown (explore.mountTab runs it then), so it costs a first
  // visit nothing.
  ctx.explore.mountTab('tonight', (host) => {
    import('./ui/tonight.js').then((m) => m.renderTonight(host, ctx)).catch((e) => console.warn('the Tonight tab did not load', e));
  }, { replace: true });
  createRail(ctx, shell.railHost);
  // Issue #251: email alerts, a row that opens in place under Coming up (ui/subscribe.js says why
  // it is there and not over the scene). Imported once the layers have settled: the row is below
  // the fold of the sidebar, and a first visit's bytes are the map's.
  const subscribeLater = () => setTimeout(() => {
    import('./ui/subscribe.js').then((m) => m.createSubscribe({ parent: ctx.explore.subscribeHost })).catch((e) => console.warn('the subscribe row did not load', e));
  }, SUBSCRIBE_MS);
  if (window.__srLayersReady) subscribeLater();
  else window.addEventListener('sr:layers-ready', subscribeLater, { once: true });
  createTimePill(ctx, shell.timeHost);
  // THE CONTROLS HINT (spec 0068 task 2, ui/keyhint.js): once per visitor, bottom-right, the keys
  // and the gestures that move the camera. Imported KEYHINT_MS after sr:layers-ready, so the first
  // visit's bytes are the map's; it decides for itself whether to show (not seen before, not a
  // trip, not a link). ctx.keyhint.show() opens it on request and imports it if it has to.
  const arrivedByLink = !!(link && (link.trip || link.at || link.stage)) || location.hash === '#sources';
  const keyHint = () => import('./ui/keyhint.js').then((m) => m.createKeyHint(ctx, { deepLink: arrivedByLink }));
  ctx.keyhint = { show: () => keyHint().then((api) => api.show()) };
  const hintLater = () => setTimeout(() => keyHint().then((api) => api.maybeShow()).catch((e) => console.warn('the controls hint did not load', e)), KEYHINT_MS);
  window.addEventListener('sr:layers-ready', hintLater, { once: true });
  // One line on the scene when no satellite could be read at all (ui/scenenote.js).
  ctx.sceneNote = createSceneNote(ctx);
  // `#sources` opens the sheet (design §6): a link to "what could this page read" is worth having.
  const openSourcesFromHash = () => { if (location.hash === '#sources') shell.openSources(); };
  openSourcesFromHash();
  window.addEventListener('hashchange', openSourcesFromHash);
  // The trip's frame (the intro, the toolbar, the top bar, the end), after the shell exists: it
  // seats its sheet in the sidebar (the phone's sheet under 900 px) and hides the rail, the pill
  // and the phone's top bar. IMPORTED WHEN THE FIRST TRIP
  // STARTS, not at boot (spec 0061 task 7): it is 50 kB a visitor who never takes a trip need not
  // download, and the first visit was 160 bytes inside its budget before the frame was rebuilt.
  // The frame paints the state it finds when it is made, so nothing a trip did while it loaded is
  // lost; its keys work from then on (Escape before it lands is the card's, as it always was).
  let framing = null;
  const offFrame = ctx.trip.onChange((st) => {
    if (framing || !st || st.phase === 'idle') return;
    framing = import('./ui/tripframe.js')
      .then((m) => { ctx.tripFrame = m.createTripFrame(ctx); offFrame(); })
      .catch((e) => { framing = null; console.warn('the trip frame did not load', e); });
  });
  // Names over the scene (spec 0026 req 5): the selection, its train, the nearest notable things.
  const labels = createLabels(ctx, document.getElementById('labels'));
  ctx.labels = labels;
  // The tracked object's reticle, tick, tag and off-screen chevron (spec 0047, ui/hud.js). It asks
  // for the selection's position through ctx.positionOfRecord, the same function follow() reads,
  // so the brackets and the camera can never be on two different answers.
  ctx.positionOfRecord = (record) => positionOfRecord(record);
  ctx.hud = createHud(ctx, document.body);
  // One lap of the selection's orbit (spec 0026 req 13), from the same elements as the dot.
  const orbitLine = createOrbitLine(scene, ctx);
  ctx.orbitLine = orbitLine;
  // The followed object's track over the ground, on the globe (spec 0048 req 3), and its minute
  // marks as names over the scene. Three draw calls while something low is followed, none otherwise.
  ctx.groundTrack = createGroundTrack(scene, ctx);
  ctx.trackLabels = createTrackLabels(ctx, document.getElementById('labels'), ctx.groundTrack);
  // RIDE ALONG (spec 0048 req 8): the camera 60 km behind and 20 km above, looking 400 km ahead
  // along the velocity, which is the same one-second central difference the card's speed row uses.
  ctx.rideAlong = (record) => {
    if (!record) return false;
    const at = (tMs) => { const p = propagate(record, tMs); return p ? stage.toScene(p, p.frame, tMs) : null; };
    const getVel = () => {
      const t = clock.now();
      const a = at(t - 500);
      const b = at(t + 500);
      return a && b ? b.sub(a) : null;
    };
    const u = stage.unitKm;
    return cameraRig.rideAlong(() => positionOfRecord(record), getVel, { back: 60 / u, up: 20 / u, lookAhead: 400 / u, ms: 800 });
  };
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
    const apply = () => applyUrlState(ctx, laterLink(link, tripRunning));
    // A trip's stops may be stars or exoplanets (OFF THE FIRST VISIT): those land first. An `at`
    // waits only if it does not resolve without them (openAt).
    if (link && link.trip && ctx.loadAfterFirstVisit) ctx.loadAfterFirstVisit().then(apply, apply);
    else apply();
    // Today's clouds: their first look is START_DELAY_MS after this, never during the first visit.
    ctx.liveClouds.start();
  }, { once: true });

  // Data arrives in the background, layer by layer, slowest last. Nothing here is awaited by the
  // render loop.
  loadAllLayers(ctx, layerRecords, glyphLayers, scene).then(() => {
    // A flag as well as the event, for a probe that attaches after it fired: the first-visit byte
    // test (spec 0044) waits on it.
    window.__srLayersReady = true;
    window.dispatchEvent(new CustomEvent('sr:layers-ready'));
    setTimeout(() => {
      if (typeof requestIdleCallback === 'function') requestIdleCallback(() => ctx.loadAfterFirstVisit(), { timeout: 3000 });
      else ctx.loadAfterFirstVisit();
    }, LATER_LAYERS_MS);
  });
  // A rung of the ladder or a star system's stage draws them: no waiting for the idle moment.
  window.addEventListener('sr:stage', (e) => {
    const id = e && e.detail ? e.detail.worldId : stage.worldId;
    if ((isLadderStage(id) || isSystemStage(id)) && ctx.loadAfterFirstVisit) ctx.loadAfterFirstVisit();
  });

  // The device tier (scene/quality.js, 2026-09-28), decided before the first frame and acted on
  // only after it: the boot set is the same for every device, and a laptop swaps sharper maps in
  // when the browser is idle (scene/texturetiers.js).
  ctx.quality = createQuality(ctx, renderer, starfield, worlds);

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
    // A star system's own star and planets, on its stage (spec 0040): the same exo-... records.
    if (ctx.systems && ctx.systems.active) {
      for (const c of ctx.systems.pickAll(ndcX, ndcY, camera, { w: rect.width, h: rect.height }, 6)) glyphs.push(c);
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
   *   highlight, `follow`, and the real `sr:select` the rest of the page listens for -- and
   *   suppresses only the 900 ms flight. A guided trip is already on its way to
   *   this object with a flight of its own, and two flights fighting over the camera is what
   *   selecting from inside one used to look like.
   */
  function select(record, opts = {}) {
    // A planet with a registry/systems.yaml row, or its host star, is a place on its SYSTEM's stage
    // (spec 0040 req 6), where it is drawn at its own size on its orbit; everywhere else it is a mark
    // at its star. The same rule as a star recentring on the stellar rung below, one scale further in.
    const systemStage = ctx.systems ? ctx.systems.stageOfRecord(record) : null;
    const offWorld = stage.worldId !== 'sun' && (isLadderStage(stage.worldId) || isSystemStage(stage.worldId));
    if (systemStage && opts.fly !== false) ctx.setStage(systemStage);
    // A star is a place on the stellar rung: from a world stage its true position is past the far
    // plane, so selecting one recentres on the Sun at one unit = one light-year first. From a star
    // system's stage too: there the rest of the sky is a shell of directions.
    else if (record && ['star', 'exoplanet', 'dso', 'exotic'].includes(record.klass) && !isLadderStage(stage.worldId) && opts.fly !== false) ctx.setStage('stellar');
    // And back: a thing inside the Solar System, chosen on a rung (from search, or the Next list),
    // sits inside the Sun's pixel there and its layer does not draw (isLayerDrawable above), so the
    // camera would fly into one pixel and show nothing. It goes home to the Earth stage first. The
    // Sun is a place on the ladder and stays. From a star system's stage, where nothing of ours is
    // drawn at all, the Sun goes home too.
    else if (record && offWorld && opts.fly !== false
      && !['star', 'exoplanet', 'dso', 'exotic'].includes(record.klass)
      && !(record.klass === 'world' && record.id === 'sun' && isLadderStage(stage.worldId))) ctx.setStage('earth');
    selected = record;
    // Start the map now, not when the disc grows past the threshold mid-flight: a selected world is
    // about to fill the screen, and a trip's own flight (fly: false) needs it just as much.
    if (record && record.klass === 'world') worlds.preload(record.id);
    for (const gl of glyphLayers.values()) if (gl.setSelected) gl.setSelected(record ? record.id : null);
    if (ctx.hud) ctx.hud.select(record);
    showCard(record, ctx);
    if (ctx.orbitLine) ctx.orbitLine.setRecord(record);
    if (ctx.groundTrack) ctx.groundTrack.set(record);
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
    if (pos) {
      const distance = arrivalDistance(record, pos);
      const limb = limbPose(record, pos, distance, on);
      // A deep-sky object is approached FROM THE SUN'S SIDE, looking out along the line we see it
      // on (spec 0067). The rig's default arrival is from beyond the subject, looking back at its
      // world, which is right for a satellite and here would show a nebula's photograph from
      // behind, mirrored -- and scene/nebulae.js rightly draws no picture off the line it was
      // taken along. Pi less a few degrees: the same framing, turned around.
      const fromHere = record.klass === 'dso' && isLadderStage(stage.worldId) ? Math.PI - 0.1 : undefined;
      cameraRig.flyTo({ targetScene: pos, distance: limb ? limb.distance : distance, tilt: limb ? limb.tilt : fromHere, ms });
    }
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
    // On a star system's stage the ground the camera must stay out of is the star at the origin.
    const r = w ? w.radiusKm / stage.unitKm : ctx.systems && ctx.systems.active ? ctx.systems.starRadiusUnits() : 0;
    cameraRig.setWorldRadius(r);
    cameraRig.setWorldCentre({ x: 0, y: 0, z: 0 });
    return null;
  }

  /**
   * @param {{keepCard?: boolean}} [opts]  `keepCard: true` puts the selection down -- `follow`, the
   *   highlight, the HUD, the 260 px model -- and leaves the card where it is. ui/trip.js lets go of
   *   a stop's subject as the flight away from it starts, and the old card stays up until the next
   *   stop's title replaces it.
   */
  function deselect(opts = {}) {
    selected = null;
    if (ctx.orbitLine) ctx.orbitLine.setRecord(null);
    if (ctx.groundTrack) ctx.groundTrack.set(null);
    for (const gl of glyphLayers.values()) if (gl.setSelected) gl.setSelected(null);
    if (ctx.hud) ctx.hud.clear();
    if (!opts || opts.keepCard !== true) hideCard();
    cameraRig.stopFollow();
    window.dispatchEvent(new CustomEvent('sr:select', { detail: null }));
  }

  function positionOfRecord(record) {
    // A world is drawn where scene/worlds.js put its DISC -- nearer than it is for the planets
    // (PLANET_VIEW, and the card says so). Flying to the true position would arrive at empty sky.
    if (record && record.klass === 'world') return worlds.drawnPositionOf(record.id);
    // A member of the star system whose stage this is: where its orbit puts it (scene/systems.js).
    const onSystem = record && ctx.systems ? ctx.systems.drawnPositionOf(record.id) : null;
    if (onSystem) return onSystem;
    // Deliberately NOT asking the glyph layer: it owns a packed position buffer for drawing, and
    // exposing a per-record lookup would make the camera depend on a layer being visible. The
    // contract's propagate + stage.toScene answers this for any record, drawn or not.
    const p = propagate(record, clock.now());
    if (!p) return null;
    return stage.toScene(p, p.frame, clock.now());
  }

  function arrivalDistance(record, pos) {
    if (record && record.klass === 'world') {
      // 3.5 radii, or farther when the free part of the screen is narrower than that disc
      // (scene/framing.js discDistance: the Moon on a phone was wider than the phone).
      const radius = worlds.drawnRadiusUnits(record.id);
      const el = ctx.renderer && ctx.renderer.domElement;
      const room = freeRoom(el);
      const w = el && el.clientWidth > 0 ? el.clientWidth : window.innerWidth;
      const h = el && el.clientHeight > 0 ? el.clientHeight : window.innerHeight;
      const shareV = room ? Math.min(room.above, room.below) / (h / 2) : 1;
      const shareH = (w - 2 * Math.abs(viewShift.shiftXPx())) / w;
      return Math.max(0.05, radius * 3.5, discDistance(radius, { fovDeg: camera.fov, aspect: w / h, shareV, shareH }));
    }
    // On its system's stage a planet is a ball of its own size: eight radii, the trip's framing; the
    // host star is the whole system, every orbit in the picture.
    const inSystem = ctx.systems && ctx.systems.active && ctx.systems.stageOfRecord(record) === stage.worldId;
    if (inSystem) return ctx.systems.arrivalDistanceUnits(record);
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
   * The arrival's distance and tilt with the limb of the world below in the picture (spec 0061 req
   * 9, scene/framing.js says why): for anything over or on a world's ground, from the Earth's
   * satellites to a site on the Moon. Null for everything else -- a world, a star, a probe far from
   * any world -- whose arrival stays as arrivalDistance and camera.js FRAMING_TILT have it.
   * `onWorld` is the world teachRigWorld chose (a site on another world's ground), else the stage's.
   */
  function limbPose(record, pos, distance, onWorld) {
    if (!record || !pos || record.klass === 'world') return null;
    if (['star', 'exoplanet', 'dso', 'exotic'].includes(record.klass)) return null;
    if (ctx.systems && ctx.systems.active) return null; // a star system's stage frames its own way
    const worldId = onWorld || stage.worldId;
    const w = WORLDS.find((x) => x.id === worldId);
    if (!w || !(w.radiusKm > 0)) return null;
    const centre = onWorld ? worlds.drawnPositionOf(onWorld) : { x: 0, y: 0, z: 0 };
    if (!centre) return null;
    const R = onWorld ? worlds.drawnRadiusUnits(onWorld) : w.radiusKm / stage.unitKm;
    const r = Math.hypot(pos.x - centre.x, pos.y - centre.y, pos.z - centre.z);
    if (!(r > 0)) return null;
    // Where the camera's up is, seen from the subject: framing.js keeps the world below on screen.
    const up = camera.up;
    const upLen = Math.hypot(up.x, up.y, up.z) || 1;
    const upDot = ((pos.x - centre.x) * up.x + (pos.y - centre.y) * up.y + (pos.z - centre.z) * up.z) / (r * upLen);
    const el = ctx.renderer && ctx.renderer.domElement;
    const h = el && el.clientHeight > 0 ? el.clientHeight : window.innerHeight;
    const layer = LAYERS.find((l) => l.id === record.layer);
    // A model's bounding circle is drawn MODEL_SPAN times SELECTED_PX across: MEASURED 2026-10-02,
    // the ISS's reticle 356 px at 1440x900 and 351 at 390x844, which is the drawn diameter + 12
    // (ui/hud.js reticleBox). A thing with no model is its dot inside the reticle.
    const subjectPx = layer && layer.noModel ? 40 : SELECTED_PX * MODEL_SPAN;
    return limbFraming({ r, R, distance, fovDeg: camera.fov, heightPx: h, subjectPx, upDot, room: freeRoom(el) });
  }

  /**
   * Pixels from where the subject will sit to the nearest chrome above and below it: the phone's
   * sheet or card along the bottom, its top bar. The limb is placed inside them (scene/framing.js).
   * MEASURED 2026-10-02 at 390x844 with the ISS card up: the limb was solved for the whole height,
   * landed 177 px under the station, and that was under the card. Where the subject sits is the
   * middle of the free band, capped, which is the rule scene/viewshift.js moves the picture by;
   * it is asked of the page here because the shift itself is still easing in when a flight starts.
   *
   * AND THE CARD IS STILL SLIDING IN. A deep link selects at boot, and the card's box is measured
   * mid-slide, below the screen: MEASURED with `#at=25544` at 390x844, nothing was found covering
   * the bottom, the limb was put 177 px above a subject that then sat at y = 171, and the station
   * arrived with the night side filling the whole screen. A selection always opens the card, and
   * on a phone the card opens at half (docs/ui-guide.md §3.11, 48 % of the height), so that much is
   * taken as covered whatever the box says this frame.
   */
  const MODEL_SPAN = 1.32;
  const BAND_CHROME = '#sr-side, #sr-card, #sr-top';
  const PHONE_CARD_SHARE = 0.48;
  function freeRoom(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return null;
    const c = el.getBoundingClientRect();
    const h = c.height;
    if (!(h > 0)) return null;
    let top = 0;
    let bottom = 0;
    for (const node of document.querySelectorAll(BAND_CHROME)) {
      if (node.hidden) continue;
      const r = node.getBoundingClientRect();
      // A bar or a sheet spans the view; the desktop's sidebar is a column, and covers neither.
      if (!(r.width >= c.width * 0.8 && r.height > 0)) continue;
      if (getComputedStyle(node).visibility === 'hidden') continue;
      const t = r.top - c.top;
      const b = r.bottom - c.top;
      if (b >= h - 4 && t > 0) bottom = Math.max(bottom, h - t);
      else if (t <= h * 0.25 && b < h * 0.5) top = Math.max(top, b);
    }
    const cap = h * MAX_SHIFT_FRACTION;
    if (c.width < 900) {
      // The card is half the height at least; it may be more, and then the subject rides as high as
      // the shift's cap allows, so the room above is counted from there: the limb is then nearer
      // the subject than planned, never off the top (MEASURED at 390x844 with today's card, 62 %
      // of the height: the subject sat at y = 169, the cap, not at 220).
      bottom = Math.max(bottom, h * PHONE_CARD_SHARE);
      const centre = h / 2 - Math.max(-cap, Math.min(cap, (bottom - top) / 2));
      const highest = h / 2 - cap;
      return { above: Math.max(0, highest - top), below: h - bottom - centre };
    }
    const centre = h / 2 - Math.max(-cap, Math.min(cap, (bottom - top) / 2));
    return { above: centre - top, below: h - bottom - centre };
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
  // ON A STAR SYSTEM'S STAGE (spec 0040) the only things drawn are the system itself and the stars as
  // a sky of directions from it. The exoplanet glyphs for this system would sit on its star, where
  // scene/systems.js already draws the same records at their true places; every other glyph layer is
  // a Solar System thing forty light-years behind the camera.
  const SYSTEM_SCALE_LAYERS = new Set(['stars', 'systems']);
  function isLayerDrawable(layer) {
    if (!layer || !isLayerOn(layer.id)) return false;
    if (isSystemStage(stage.worldId)) return SYSTEM_SCALE_LAYERS.has(layer.id);
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
    // A star system's stage (spec 0040): the ground is its star, and the camera arrives with every
    // orbit in the picture. sr:stage (above) has already built the system.
    const system = isSystemStage(stageId) && ctx.systems && ctx.systems.active;
    const r = w ? w.radiusKm / stage.unitKm : system ? ctx.systems.starRadiusUnits() : 0;
    cameraRig.setWorldRadius(r);
    cameraRig.setWorldCentre({ x: 0, y: 0, z: 0 });
    cameraRig.stopFollow();
    const distance = w ? worldFramingDistance(r, camera.fov, camera.aspect) : system ? ctx.systems.framingDistanceUnits(stageId) : 5;
    cameraRig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance, ms: 0 });
    return true;
  };
  // The Planets tab (spec 0061, ui/explore.js): the Sun's stage with every planet in the picture.
  //
  // It was a fixed 700 million km, the year trip's first stop, measured to hold Mars's orbit on a
  // 1280 x 800 screen. MEASURED 2026-10-02 at 1440x900: Jupiter projected to y = -36 (off the top),
  // Saturn to x = 3 088 and Neptune to x = 8 351 -- five of the nine worlds the tab lists were off
  // the screen it opens on, and on a phone's narrow width Mars went too. So the distance is SOLVED:
  // the camera looks down on the Sun from SYSTEM_POLAR off the pole of the planets' plane, keeps the
  // side it is on, and stands back exactly far enough for Neptune's whole path, every planet and
  // Pluto to be inside the part of the screen the chrome leaves (viewshift's band), with a margin
  // (scene/framing.js fitDistance). The paths are drawn here (SYSTEM_RINGS, below), so the fit is to
  // the outermost one, not to where Neptune happens to be. The inner planets are close to the Sun
  // at that size, and that is the honest shape of the Solar System; the labels rank all eight
  // planets first on this stage (ui/labels.js).
  const SYSTEM_IDS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const OUTER_PATH_SAMPLES = 24;
  /** Points along the outermost drawn path, one lap from now. */
  const outerPath = (tMs) => {
    const period = periodMsOfWorld('neptune');
    const out = [];
    if (!period) return out;
    for (let k = 0; k < OUTER_PATH_SAMPLES; k++) {
      const t = tMs + (period * k) / OUTER_PATH_SAMPLES;
      const p = positionOf('neptune', t);
      const v = p ? stage.toScene(p, p.frame, tMs) : null;
      if (v) out.push(v);
    }
    return out;
  };
  const SYSTEM_POLAR = 0.6; // radians off the pole: the orbits read as ellipses, not as a line
  const _fitCam = new THREE.PerspectiveCamera();
  const _fitQ = new THREE.Quaternion();
  const _fitU = new THREE.Vector3();
  const _fitV = new THREE.Vector3();
  ctx.frameSolarSystem = () => {
    if (stage.worldId !== 'sun') return false;
    const pts = SYSTEM_IDS.map((id) => worlds.drawnPositionOf(id)).filter(Boolean).map((p) => p.clone())
      .concat(outerPath(clock.now()));
    const azimuth = Number.isFinite(cameraRig.state.azimuth) ? cameraRig.state.azimuth : 0;
    // The rig's own offset direction for (azimuth, SYSTEM_POLAR), in its up's basis.
    _fitQ.setFromUnitVectors(new THREE.Vector3(0, 1, 0), camera.up.clone().normalize());
    _fitU.set(Math.sin(SYSTEM_POLAR) * Math.sin(azimuth), Math.cos(SYSTEM_POLAR), Math.sin(SYSTEM_POLAR) * Math.cos(azimuth)).applyQuaternion(_fitQ);
    _fitCam.fov = camera.fov;
    _fitCam.aspect = camera.aspect;
    _fitCam.near = camera.near;
    _fitCam.far = camera.far;
    _fitCam.up.copy(camera.up);
    _fitCam.updateProjectionMatrix();
    const project = (p, d) => {
      _fitCam.position.copy(_fitU).multiplyScalar(d);
      _fitCam.lookAt(0, 0, 0);
      _fitCam.updateMatrixWorld();
      _fitV.copy(p).project(_fitCam);
      return _fitV.z < 1 ? { x: _fitV.x, y: _fitV.y } : null;
    };
    const el = renderer.domElement;
    const vw = el.clientWidth || window.innerWidth;
    const vh = el.clientHeight || window.innerHeight;
    const band = {
      w: Math.max(0.3, (vw - 2 * Math.abs(viewShift.shiftXPx())) / vw),
      h: Math.max(0.3, (vh - 2 * Math.abs(viewShift.shiftPx())) / vh),
    };
    const fit = pts.length ? fitDistance(pts, project, { lo: 50, hi: 2e5, band }) : null;
    const distance = Number.isFinite(fit) ? fit : 700e6 / stage.unitKm;
    cameraRig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance, azimuth, polar: SYSTEM_POLAR, ms: 0 });
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
  window.addEventListener('hashchange', () => {
    setMoment(readMomentFromHash(), { silent: true });
    // `at` too, not only at boot: a link opened in a tab that is already running must fly there.
    // The app's own writes use replaceState, which fires no hashchange, so this cannot echo.
    const at = readUrlKeys().at;
    const current = typeof ctx.selected === 'function' ? ctx.selected() : null;
    if (at && (!current || current.id !== at)) openAt(ctx, at);
  });

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

// --- the device tier ---------------------------------------------------------

/** A world's disc, as a share of half the view's height, at which its map tiles' module is fetched. */
const PLANET_TILES_AT = 0.5;

function createQuality(ctx, renderer, starfield, worlds) {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const mm = (q) => !!(window.matchMedia && window.matchMedia(q).matches);
  const scr = typeof screen !== 'undefined' ? screen : {};
  const pick = chooseTier({
    maxTextureSize: renderer.capabilities && renderer.capabilities.maxTextureSize,
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
    connection: nav.connection,
    // A touch screen with no mouse or trackpad anywhere: a laptop with a touch screen is not a phone.
    coarsePointer: mm('(pointer: coarse)') && !mm('(any-pointer: fine)'),
    screenW: scr.width,
    screenH: scr.height,
  });
  // `?tier=0|1|2` pins the tier (2026-09-29): to compare the tiers on one machine, and for the probes,
  // whose headless SwiftShader would otherwise always read as a T1 laptop. A query key, not the hash:
  // it is not view state and ui/urlstate.js never sees it.
  const forced = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('tier') : null;
  if (forced !== null && /^[012]$/.test(forced)) {
    pick.tier = Number(forced);
    pick.ceiling = pick.tier;
    pick.reasons = ['pinned by ?tier=' + forced];
  }
  const promoter = createTierPromoter({ tier: pick.tier, ceiling: pick.ceiling });
  const aniso = renderer.capabilities && renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 8;
  const loader = new THREE.TextureLoader();
  const earthMesh = () => worlds.meshFor('earth');
  const tiers = createTextureTiers({
    tier: pick.tier,
    month: () => new Date(clock.now()).getUTCMonth() + 1,
    // decode() before the texture is handed over: Chrome otherwise decodes a 4k image on the main
    // thread inside the upload, in the middle of a frame.
    load: (url, file) => loader.loadAsync(url).then((tex) => {
      const img = tex.image;
      return img && typeof img.decode === 'function' ? img.decode().then(() => tex, () => tex) : tex;
    }).then((tex) => {
      // One grey channel (the water mask, the night lights) goes up as R8: a quarter of RGBA's GPU
      // memory. Its bytes stay as encoded; earth.js decodes the night map itself.
      if (file.format === 'mono') {
        tex.format = THREE.RedFormat;
        tex.colorSpace = THREE.NoColorSpace;
      } else {
        tex.colorSpace = THREE.SRGBColorSpace;
      }
      tex.anisotropy = aniso;
      tex.needsUpdate = true;
      return tex;
    }),
    targets: {
      earth: {
        ready: () => !!earthMesh() && earthMapsSettled(earthMesh()),
        set: (slot, tex, file) => setEarthMap(earthMesh(), slot, tex, { mono: !!(file && file.format === 'mono') }),
      },
      sky: {
        ready: () => !!(starfield.state && starfield.state.milkyway) && !(ctx.latch && ctx.latch.latched),
        set: (tex) => starfield.setMilkyWayMap(tex),
      },
      worlds: {
        ready: (id) => worlds.hasMap(id),
        set: (id, tex) => worlds.setMap(id, tex),
        // Device pixels of radius: the share of half the view's height, times half the drawing buffer.
        px: (id) => worlds.discShare(id) * (renderer.domElement ? renderer.domElement.height / 2 : 400),
        selected: () => {
          const s = ctx.selected();
          return s && s.klass === 'world' ? s.id : null;
        },
      },
    },
  });
  const say = () => window.dispatchEvent(new CustomEvent('sr:tier', { detail: api.describe() }));
  // Spec 0065: a close world drawn from the missions' own map tiles. OFF THE FIRST VISIT, like the
  // aurora: scene/tiles.js and its two helpers are imported only once a world other than the Earth
  // is PLANET_TILES_AT of half the view tall -- nobody boots there -- and never at tier 0, on a
  // connection that saves data, or after the latch. Until then this costs one loop a second.
  let planetTiles = null;
  let planetTilesAsked = false;
  // Read ONCE, as the tier was: Chromium's effectiveType is a running estimate, and a headless boot
  // that began on "4g" read "3g" twenty seconds later (measured 2026-10-03). A layer that came and
  // went with the estimate would be the flapping the latch exists to prevent.
  const tilesSaveData = shouldSaveData(nav.connection);
  function planetTilesWanted() {
    if (planetTilesAsked || tilesSaveData || tiers.latched || tiers.tier < 1) return;
    if (!worlds.ids().some((id) => id !== 'earth' && id !== 'sun' && worlds.discShare(id) >= PLANET_TILES_AT)) return;
    planetTilesAsked = true;
    import('./scene/tiles.js').then((m) => {
      planetTiles = m.createPlanetTiles({
        worlds,
        camera: ctx.camera,
        viewport: () => (renderer.domElement ? renderer.domElement.height : 800),
        tier: tiers.tier,
        anisotropy: aniso,
        onChange: say, // the Sources panel prints the mosaic's credit while its tiles are on screen
      });
      if (tiers.latched) planetTiles.latch();
    }).catch(() => { /* the globe's own map is what is on screen; nothing else depends on this */ });
  }
  const api = {
    get tier() { return tiers.tier; },
    bootTier: pick.tier,
    ceiling: pick.ceiling,
    reasons: pick.reasons,
    get promoted() { return promoter.promoted; },
    textures: () => tiers.state(),
    tiles: () => (planetTiles ? planetTiles.state() : null),
    credits: () => tiers.credits().concat(planetTiles ? planetTiles.credits() : []),
    describe: () => ({ tier: tiers.tier, bootTier: pick.tier, promoted: promoter.promoted, latched: tiers.latched, reasons: pick.reasons }),
    /** After the first frame (startLoop). */
    start() { tiers.start(); say(); },
    /** Every frame, from startLoop, after the latch has been fed. */
    frame(frameMs, nowMs, latched) {
      const up = promoter.push(frameMs, nowMs, latched);
      if (up !== null) { tiers.setTier(up); if (planetTiles) planetTiles.setTier(up); say(); }
      if (planetTiles) planetTiles.frame(nowMs);
    },
    tick(nowMs) { tiers.tick(nowMs); planetTilesWanted(); },
    /** The frame latch tripped: back to the boot maps, for good. */
    latch() { tiers.latch(); if (planetTiles) planetTiles.latch(); say(); },
  };
  return api;
}

// --- the loop ----------------------------------------------------------------

/**
 * The paths the Sun's stage draws outside a trip: the planets'. Not Pluto's: it runs out to 49 AU,
 * past the frame the whole of Neptune's path is fitted to, and was cut off by the screen's edge.
 * Pluto keeps its name where it is.
 */
const SYSTEM_RINGS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

function startLoop({ ctx, resize, render, worlds, glyphLayers, cameraRig, starfield, heroes, lod }) {
  let last = performance.now();
  let sinceLayerUpdate = 0;
  // The frame-rate latch (spec 0026 req 18): twenty-frame median over 33 ms for three seconds ->
  // one device pixel per CSS pixel and no Milky Way picture, once, said in the panel.
  const latch = createFrameLatch();
  // Read every frame by the aurora's folds; one query object, not a matchMedia call a frame.
  const reducedMotionQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function degrade() {
    if (ctx.renderer && ctx.rendererApi && ctx.rendererApi.setQuality) ctx.rendererApi.setQuality('low');
    if (starfield && starfield.setDetail) starfield.setDetail('low');
    if (ctx.nebulae) ctx.nebulae.setSkyVisible(false);
    // Spec 0054: earthshine goes off with the latch (scene/worlds.js setLatched).
    if (worlds && worlds.setLatched) worlds.setLatched(true);
    // The tier falls with the latch and only with it: every world back on its boot map.
    if (ctx.quality) ctx.quality.latch();
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
    if (ctx.quality && !document.hidden) {
      ctx.quality.frame(frameMs, nowReal, latch.latched);
      if (nowReal - lastTierTick >= 1000) { lastTierTick = nowReal; ctx.quality.tick(nowReal); }
    }

    clock.tick(dt);
    const t = clock.now();
    stage.setTime(t);   // every frame conversion this tick reads it; set it before anything does

    resize();
    if (ctx.viewShift) ctx.viewShift.update(dt);
    cameraRig.update(dt);
    worlds.setEclipseAllowed(ctx.eclipseDrawn());
    worlds.update(t);
    // Live or static clouds, by how far the clock is from the picture (data/gibs.js cloudMode).
    if (ctx.liveClouds) ctx.liveClouds.tick(t);
    // The aurora after the Earth's update (it reads the Earth's rotation and Sun): its box, the
    // latch (fewer steps, no folds), reduced motion (the folds hold still), the tier, and how big
    // the Earth is drawn (no draw call for a dot).
    if (ctx.aurora) {
      ctx.aurora.setTier(ctx.quality ? ctx.quality.tier : 1);
      ctx.aurora.tick(t, {
        on: ctx.isLayerOn('aurora'),
        latched: latch.latched,
        reducedMotion: !!(reducedMotionQuery && reducedMotionQuery.matches),
        discShare: worlds.discShare ? worlds.discShare('earth') : 1,
      });
    }
    // The weather after the worlds' update too: the clock's time into the bands, and this second's
    // lightning (scene/weather/). The stand-in's tick is empty.
    if (ctx.weather) {
      ctx.weather.tick(t, {
        on: ctx.isLayerOn('lightning'),
        latched: latch.latched,
        reducedMotion: !!(reducedMotionQuery && reducedMotionQuery.matches),
        discShare: worlds.discShare ? worlds.discShare('earth') : 1,
        viewportH: ctx.renderer && ctx.renderer.domElement ? ctx.renderer.domElement.height : 800,
        pixelRatio: ctx.renderer && ctx.renderer.getPixelRatio ? ctx.renderer.getPixelRatio() : 1,
      });
    }

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
    if (ctx.groundTrack) ctx.groundTrack.update(t);
    if (ctx.orbitRings) {
      const st = ctx.trip && ctx.trip.state;
      const tripping = st && st.phase !== 'idle';
      // Outside a trip the Sun's stage IS the Planets tab, framed on the whole system
      // (frameSolarSystem): at true size every planet there is under a pixel, so their paths and
      // dots are drawn, and the tab's list says the dots are larger than the planets.
      ctx.orbitRings.update(t, tripping ? st.orbits : stage.worldId === 'sun' ? SYSTEM_RINGS : null);
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
    if (ctx.systems) {
      ctx.systems.setVisible(ctx.isLayerOn('systems'));
      ctx.systems.update(t, ctx.camera);
    }
    if (ctx.galaxy) ctx.galaxy.update(ctx.camera, ctx.renderer);
    if (ctx.dsoGlow) ctx.dsoGlow.update(ctx.camera, ctx.renderer, ctx.isLayerDrawable(LAYERS.find((l) => l.id === 'deep-sky')));
    if (ctx.nebulae) {
      ctx.nebulae.update(ctx.camera, ctx.renderer, ctx.isLayerOn('deep-sky'), ctx.isLayerDrawable(LAYERS.find((l) => l.id === 'deep-sky')));
      // Andromeda's photograph and her stand-in model never draw over each other (scene/galaxy.js).
      if (ctx.galaxy) ctx.galaxy.setAndromedaShare(1 - ctx.nebulae.drawn('dso-m31'));
    }
    if (ctx.skyView.active) ctx.skyView.update(t);
    render();
    // After render(), because render() is what brings the camera's matrices up to this frame: placed
    // before it, the brackets trailed the station by one frame of camera motion.
    if (ctx.hud) ctx.hud.frame(t);
    // The track's minute marks, on this frame's camera (render() brought its matrices up to date).
    if (ctx.trackLabels) ctx.trackLabels.update();
    // The first frame is on screen: from now on the sharper maps may come, when the browser is idle.
    if (!tiersStarted && ctx.quality) { tiersStarted = true; ctx.quality.start(); }
  }
  let tiersStarted = false;
  let lastTierTick = 0;
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
    if (layer.draw === 'worlds' || layer.draw === 'galaxy' || layer.draw === 'stars3d' || layer.draw === 'systems' || layer.draw === 'aurora' || layer.draw === 'lightning') continue;
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
  const later = [];
  for (const layer of ordered) {
    if (layer.deferred) continue; // loads when the visitor switches it on (ctx.loadLayerNow)
    // OFF THE FIRST VISIT (LATER_LAYERS, top of this file): after sr:layers-ready, or when asked.
    if (LATER_LAYERS.has(layer.id)) { later.push(layer); continue; }
    // The aurora has no records to load: scene/aurora.js fetches its own forecast, once the layers have landed.
    if (layer.draw === 'aurora' || layer.draw === 'lightning') continue;
    const srcs = idsOf(layer);
    // One cached manifest read behind these, not a request per layer.
    const snaps = srcs.length ? await Promise.all(srcs.map((id) => sources.snapshotAvailable(id))) : [];
    (srcs.length === 0 || snaps.every(Boolean) ? local : upstream).push(layer);
  }

  ctx.loadLayerNow = (layer) => { if (layer && layer.deferred) { layer.deferred = false; return one(layer); } return Promise.resolve(); };
  let laterLoad = null;
  ctx.laterLayersLoaded = () => later.length === 0 || (laterLoad !== null && later.every((l) => layerRecords.has(l.id)));
  ctx.loadAfterFirstVisit = () => {
    if (!laterLoad) {
      laterLoad = Promise.all(later.map((l) => one(l))).then(() => {
        window.dispatchEvent(new CustomEvent('sr:later-layers', { detail: { ids: later.map((l) => l.id) } }));
      });
    }
    return laterLoad;
  };
  // The Stars layer's number before its names have landed: the count the names file holds, shipped
  // in scene/stars3d.js (NAMED_STARS, which tests/test_stars3d.mjs holds to the file), so What to
  // show says "3 390" from the first frame rather than "loading" for a layer that is there.
  for (const layer of later) if (layer.draw === 'stars3d') layer.count = () => ctx.stars3d.count() ?? NAMED_STARS;

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

// --- sound ---------------------------------------------------------------------
//
// Spec 0035, 2026-09-23. The engine, its beds and stings, and the four events they follow. Every
// hook is a listener on something the app already says out loud -- `sr:stage`, `sr:veil`, the
// trip's own onChange -- so no module that moves the camera knows sound exists, and each of them
// still runs in node without it.

function wireSound(ctx) {
  const audio = createAudio();
  const loader = createLoader(audio);
  audio.beds = createBeds(audio, AUDIO, { loader });
  audio.stings = createStings(audio, audio.beds, AUDIO, { loader });
  const here = () => rungOf(ctx.stage.worldId, isLadderStage);
  // Turned on (or the first gesture of a visit that remembered "on"): the bed for where we are.
  // Turned off: the engine ramps the master down and suspends; the bed is kept for next time.
  audio.onChange((on) => { if (on) audio.beds.enter(here()); });
  window.addEventListener('sr:stage', () => audio.beds.enter(here()));
  // The stage sting lands in the black, where the change of room is (spec 0034's veil).
  document.addEventListener('sr:veil', (e) => {
    if (e && e.detail && e.detail.phase === 'covered') audio.stings.play('stage');
  });
  // `arrive` when a stop's flight lands (ui/trip.js arrived() is the only way into `settle`), `end`
  // when the end card shows. Read from phase edges, so a render that repeats a phase is not a
  // second chime, and a Next that collapses a flight still lands exactly once.
  let phase = 'idle';
  if (ctx.trip && typeof ctx.trip.onChange === 'function') {
    ctx.trip.onChange((st) => {
      const next = st && st.phase;
      if (next === phase) return;
      // The arrival chime stands down for a stop that is read aloud (spec 0069): the voice is the
      // arrival, and a chime under its first words is two things at once. `narration` is put on
      // the engine by ui/tripframe.js, which is loaded by the time any flight lands.
      const read = audio.narration && audio.narration.willSpeak(`${st.tourId}/${st.stopId}`);
      if (next === 'settle') { if (!read) audio.stings.play('arrive'); }
      else if (next === 'outro') audio.stings.play('end');
      phase = next;
    });
  }
  return audio;
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

/**
 * What `#at=` names. A record id first (`sat-25544`, `europa`), then a bare catalogue number
 * (`25544`), then what a person would type (`iss`, `hubble`), through the same index and alias
 * table as the search box. Only a whole-name, name-prefix or word-prefix match counts: a
 * letters-inside-a-word hit is a guess, and a link must not fly somewhere it did not name.
 */
function resolveAt(ctx, id) {
  const text = String(id || '').trim();
  if (!text) return null;
  const direct = ctx.recordById(text);
  if (direct) return direct;
  if (/^[0-9]+$/.test(text)) {
    const sat = ctx.recordById(`sat-${text}`);
    if (sat) return sat;
  }
  const records = typeof ctx.records === 'function' ? ctx.records() : [];
  const found = findMatches(buildIndex(records, ctx.layers || []), text.replace(/[-_+]+/g, ' '), 1);
  const hit = found.hits[0];
  return hit && !found.fallback && hit.score >= LINK_MIN_SCORE ? hit.record : null;
}

function openAt(ctx, id) {
  const record = resolveAt(ctx, id);
  // A star or an exoplanet before its layer has landed (OFF THE FIRST VISIT): load it, then look again.
  if (!record && ctx.loadAfterFirstVisit && !ctx.laterLayersLoaded()) {
    ctx.loadAfterFirstVisit().then(() => openAt(ctx, id), () => openAt(ctx, id));
    return;
  }
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

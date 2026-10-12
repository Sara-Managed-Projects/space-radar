// js/embedlite.js -- the light embed: `?embed=1&at=<a world or a station>` boots only what it draws
// (internal #396, spec 0059 requirement 8).
//
// WHY A SECOND ENTRY. ui/embed.js said "an embed boots the same module graph (a second, smaller app
// would be a second thing to keep honest)", and skipped what the map fetches after its first view.
// Measured 2026-10-06 that was still the whole first visit: 163 requests and about 9.6 MB
// uncompressed for a 600 x 400 frame of the ISS, because main.js's static graph alone is 2.2 MB and
// index.html preloads every module of it. Nothing inside main.js can be skipped by a flag: an
// import is fetched before a line of it runs. So an embed whose link names something cheap to find
// is booted HERE, by the page's own boot script, and main.js is never asked for.
//
// WHAT KEEPS IT HONEST. This file draws nothing itself. Every piece is the app's own module,
// called as main.js calls it: the renderer, the stage, the worlds (and their ephemerides), the
// star sphere, the camera rig, the glyph layer and its catalogue loader (data/layers.js: CelesTrak,
// then the saved copy, then the bundled stand-in), the labels, the tag (ui/hud.js, whose lines are
// the card's own "right now" rows, from ui/cardfacts.js) and the embed's bar (ui/embed.js). What is NOT here is said in
// docs/EMBEDDING.md: no clouds, no Milky Way panorama, no 3D model of the object (its mark and its
// tag instead), and 1024-pixel maps of the Earth and the Moon, which is what a 600 x 400 frame can
// show. "Open in Space Radar" is the whole map, one press away.
//
// WHICH LINKS. `at` alone (liteTarget): a world's id (`moon`, `mars`) or a crewed station by its
// catalogue number (`25544`, `sat-25544`). Anything else -- a trip, a stage, a moment, an exposure,
// a name to search for, a satellite that is not in the stations' list -- is the full app, as
// before: bootLite() answers false and the page boots main.js.
//
// Contract:
//   liteTarget(search) -> {kind: 'world', id} | {kind: 'station', id} | null     pure
//   embedMapFor(url)   -> the light map for a texture's address, null to skip it, or the address  pure
//   bootLite() -> Promise<boolean>   false: nothing was built, boot the full app

import * as THREE from '../vendor/three.module.min.js';
import { clock } from './clock.js';
import { createRenderer } from './scene/renderer.js';
import { stage } from './scene/stage.js';
import { propagate } from './propagate/index.js';
import { createWorlds, WORLDS } from './scene/worlds.js';
import { createStarfield } from './scene/starfield.js';
import { createGlyphLayer } from './scene/glyphs.js';
import { createCameraRig, worldFramingDistance } from './scene/camera.js';
import { litOffset } from './scene/framing.js';
import { LAYERS, loadLayer } from './data/layers.js';
import * as sources from './data/sources.js';
import { createLabels } from './ui/labels.js';
import { createHud } from './ui/hud.js';
import { wantFacts } from './ui/cardgate.js';
import { installEmbed, embedLink } from './ui/embed.js';
import { COPY } from './copy/en.js';

/** The light maps (registry/textures.yaml tier -1), by the tier-0 file each stands in for. `null`: not drawn. */
export const EMBED_MAPS = {
  '2k_earth_daymap.webp': 'embed/earth_day.webp',
  '2k_earth_nightmap.webp': 'embed/earth_night.webp',
  '2k_moon.webp': 'embed/moon.webp',
  '2k_earth_clouds.webp': null,
};

/** The address the light embed fetches instead of `url`; null when it draws without that map. */
export function embedMapFor(url) {
  const s = String(url || '');
  const name = s.slice(s.lastIndexOf('/') + 1);
  if (!(name in EMBED_MAPS)) return s;
  return EMBED_MAPS[name] === null ? null : s.slice(0, s.length - name.length) + EMBED_MAPS[name];
}

const WORLD_IDS = new Set(WORLDS.map((w) => w.id));

/** What a link asks for, when the light embed can show it. Pure. */
export function liteTarget(search) {
  if (!/[?&]embed=1(?:&|$)/.test(String(search || ''))) return null;
  const link = embedLink(search);
  const keys = Object.keys(link);
  if (keys.length !== 1 || keys[0] !== 'at') return null; // a trip, a stage, a moment: the full app
  const at = String(link.at).toLowerCase();
  if (WORLD_IDS.has(at)) return { kind: 'world', id: at };
  const m = /^(?:sat-)?(\d{1,9})$/.exec(at);
  return m ? { kind: 'station', id: `sat-${Number(m[1])}` } : null;
}

export async function bootLite() {
  // The app's own hash wins over the query (ui/urlstate.js): a link made by hand is the full app's.
  if (typeof location === 'undefined' || (location.hash && location.hash.length > 1)) return false;
  const target = liteTarget(location.search);
  if (!target) return false;

  // The record first, before anything is built: a number that is not a station's is the full app's.
  const layerRecords = new Map();
  const worldsLayer = LAYERS.find((l) => l.id === 'worlds');
  const stationsLayer = LAYERS.find((l) => l.id === 'stations');
  let record = null;
  try {
    if (worldsLayer) layerRecords.set('worlds', await loadLayer(worldsLayer, clock.now()) || []);
    if (target.kind === 'station' && stationsLayer) layerRecords.set('stations', await loadLayer(stationsLayer, clock.now()) || []);
    record = [...layerRecords.values()].flat().find((r) => r.id === target.id) || null;
  } catch {
    record = null;
  }
  // The stations' list could not be read at all (CelesTrak said no and there is no saved copy): the
  // whole app could not find the station either, and would cost four megabytes to say so. The frame
  // shows the Earth, which is where the station is. A list that WAS read and does not hold the
  // number is another matter: the object may be in another catalogue, and that is the full app's.
  let note = '';
  if (!record && target.kind === 'station' && !(layerRecords.get('stations') || []).length) {
    note = COPY.embed.stationUnread; // and the frame says why it shows the Earth (internal #429)
    record = (layerRecords.get('worlds') || []).find((r) => r.id === 'earth') || null;
  }
  if (!record) return false;

  const embed = await installEmbed(location.search);
  const canvas = document.getElementById('stage');
  canvas.classList.add('sr-scene'); // css/embed.css hides every child of <body> that is not the scene
  const rendererApi = createRenderer(canvas);
  const { renderer, scene, camera, resize, render } = rendererApi;
  const cameraRig = createCameraRig(camera, canvas, {});
  const loader = new THREE.TextureLoader();
  const worlds = createWorlds(scene, {
    camera,
    textureBase: 'textures/',
    // The light maps, and no clouds: a texture this returns null for is a map the world draws without.
    loadTexture: (url, onLoad) => { const u = embedMapFor(url); return u ? loader.load(u, onLoad) : null; },
  });
  // The naked-eye stars; no constellation lines, no names and no panorama (each `false` is "none").
  const starfield = createStarfield(scene, { starsBin: 'data/stars.bin', linesJson: false, namesJson: false, milkyWayTexture: false });

  const glyphLayers = new Map();
  let selected = null;
  const shown = new Set(layerRecords.keys());
  const ctx = {
    clock, stage, scene, camera, cameraRig, worlds, renderer, rendererApi, sources,
    layers: LAYERS,
    records: () => [...layerRecords.values()].flat(),
    recordsFor: (id) => layerRecords.get(id) || [],
    glyphLayers,
    recordById: (id) => ctx.records().find((r) => r.id === id) || null,
    selected: () => selected,
    isLayerOn: (id) => shown.has(id),
    isLayerDrawable: (layer) => !!layer && shown.has(layer.id),
    observer: null,
    moment: 'wonder',
    starfield,
    // The pieces of the whole map that are not here; each reader already asks before it uses one.
    trip: { state: { phase: 'idle' }, onChange() {} },
    heroes: null, systems: null, skyView: null, lite: true,
  };
  ctx.positionOfRecord = (r) => {
    if (r && r.klass === 'world') return worlds.drawnPositionOf(r.id);
    const p = propagate(r, clock.now());
    return p ? stage.toScene(p, p.frame, clock.now()) : null;
  };

  if (stationsLayer && layerRecords.has('stations')) {
    const gl = createGlyphLayer(scene, stationsLayer);
    gl.setRecords(layerRecords.get('stations'));
    gl.setVisible(true);
    glyphLayers.set('stations', gl);
  }

  worlds.update(clock.now());
  const earthRadius = 6371 / stage.unitKm;
  cameraRig.setWorldRadius(earthRadius);
  cameraRig.setWorldCentre({ x: 0, y: 0, z: 0 });
  cameraRig.setTarget({ x: 0, y: 0, z: 0 });

  /** Frame the object: a world whole and on its lit side, a station with the Earth's limb behind it. */
  function frameIt(ms) {
    const pos = ctx.positionOfRecord(record);
    if (!pos) return false;
    if (record.klass === 'world') {
      const r = worlds.drawnRadiusUnits(record.id);
      const on = record.id !== 'earth';
      cameraRig.setWorldRadius(r);
      cameraRig.setWorldCentre(on ? pos : { x: 0, y: 0, z: 0 });
      const lit = record.id === 'sun' ? null : litOffset(worlds.sunDirOf(record.id), camera.up);
      cameraRig.flyTo({ targetScene: pos, distance: worldFramingDistance(r, camera.fov, camera.aspect), offset: lit || undefined, ms });
    } else {
      // Four thousand kilometres back: the station's mark with the curve of the Earth under it.
      cameraRig.flyTo({ targetScene: pos, distance: 4000 / stage.unitKm, ms });
    }
    cameraRig.follow(() => ctx.positionOfRecord(record));
    return true;
  }
  ctx.flyToRecord = () => frameIt(700);

  selected = record;
  if (record.klass === 'world') worlds.preload(record.id);
  frameIt(0);
  for (const gl of glyphLayers.values()) if (gl.setSelected) gl.setSelected(record.id);
  ctx.labels = createLabels(ctx, document.getElementById('labels'));
  ctx.hud = createHud(ctx, document.body);
  ctx.hud.select(record);
  embed.attach(ctx, note);
  if (typeof window !== 'undefined') window.spaceRadar = ctx;

  let last = performance.now();
  let sinceSlow = Infinity;
  function frame(nowReal) {
    requestAnimationFrame(frame);
    const frameMs = Math.max(0, nowReal - last);
    const dt = Math.min(100, frameMs);
    last = nowReal;
    clock.tick(dt);
    const t = clock.now();
    stage.setTime(t);
    resize();
    cameraRig.update(dt);
    worlds.update(t);
    sinceSlow += dt;
    if (sinceSlow >= 100) {
      sinceSlow = 0;
      for (const gl of glyphLayers.values()) gl.update(t, camera);
      ctx.labels.update(t);
    }
    if (starfield.update) starfield.update(camera);
    render();
    ctx.hud.frame(t);
  }
  requestAnimationFrame(frame);

  const boot = document.getElementById('boot');
  if (boot) { boot.classList.add('gone'); setTimeout(() => boot.remove(), 700); }
  // The tag's words are the card's own rows (ui/cardfacts.js: the rows without the card, which a
  // frame with no card never needs), fetched now that the scene is drawing.
  // The same two signals the full app gives a probe and the byte count: the layers are in.
  wantFacts().finally(() => {
    window.__srLayersReady = true;
    window.dispatchEvent(new CustomEvent('sr:layers-ready'));
  });
  return true;
}

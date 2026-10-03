// scene/tiles.js -- a world drawn from map tiles when the camera is close (spec 0065 tasks 1-2).
//
// Contract: createPlanetTiles(opts) -> { frame(nowMs), setTier(n), latch(), state(), credits(), dispose() }
//
// Ivan, 2026-10-02: "maybe we can load better planet quality on zooming in". A world wears one map,
// 4096 pixels round the equator on a laptop: 2.7 km a texel on the Moon, 5.2 km on Mars. From a few
// hundred kilometres up a screen pixel is a few hundred METRES of ground, and the map is a blur.
// NASA's Solar System Treks serves the missions' own mosaics as map tiles, with CORS open (measured
// 2026-10-03, registry/tilesets.yaml): the Moon to 83 m a pixel, Mars to 162 m. This module fetches
// the tiles under the camera, at the level the screen can show, and draws them over the globe.
//
// HOW A TILE IS DRAWN. Each tile is a small patch of the unit sphere, a CHILD of the world's mesh,
// so it turns, moves and scales with the world for free -- libration, the compressed view, all of
// it. Its material is the world's own shader pair (scene/worlds.js WORLD_VERT / WORLD_FRAG) with two
// lines changed, and it SHARES the globe's uniform objects: the Sun's direction, earthshine, an
// eclipse, Minnaert's k arrive in the patch on the frame they arrive in the globe, because they are
// the same objects. So a tile is lit exactly as the ground round it, and the only thing that changes
// when one arrives is the sharpness (and the mosaic: see THE TONE, below).
//
// WHY PATCHES AND NOT A TEXTURE ATLAS IN THE GLOBE'S SHADER. An atlas would be one more sampler and
// a window test in a shader every world and every star system's planets share, and re-uploading a
// 2048-pixel canvas each time a 256-pixel tile lands is a 16 MB upload in the middle of a frame.
// A patch is 25 to 625 vertices and one 256-pixel texture, uploaded once.
//
// DEPTH, the one subtle thing. The globe is 64 x 48 flat facets and a patch is finer, so the two
// surfaces are not the same surface: they cross. A patch therefore does not write depth, is drawn
// in the transparent pass after every opaque thing (the globe has laid its depth down by then), and
// is pulled a thousandth of its distance towards the camera in the logarithmic depth it is TESTED
// with -- enough to clear the facets, never enough to come in front of a spacecraft, which is
// opaque, nearer, and already in the depth buffer. Landing-site marks and labels are drawn later
// (scene/glyphs.js renderOrder 5 and 10; a patch is under 1) against the globe's depth, as before.
//
// THE RULES, each one a budget (spec 0065 requirement 3):
//   - NOTHING AT BOOT. main.js imports this module only when a world with a tile set is big on
//     screen, and frame() asks for nothing until the ground under the camera wants `startLevel`.
//     A default first visit makes zero tile requests: measured in headless Chrome 2026-10-03, and
//     counted in CI's real boot (tests/test_first_visit_bytes.mjs, planet_tile_requests_first_visit).
//   - NOT ON A PHONE, NOT ON DATA-SAVER, NOT AFTER THE LATCH. Tier 0 has no tiles (scene/quality.js);
//     latch() frees every one for good, like the 4k maps.
//   - SIX FETCHES AT ONCE, nearest first, and a tile the view has left is aborted.
//   - A CACHE WITH A CEILING. CACHE_TILES per tier, least recently used out first, texture and
//     geometry disposed. A 256-pixel RGBA tile with mipmaps is 0.33 MiB on the GPU. When the camera
//     leaves, the layer fades out and EVERY tile is freed; coming back refetches from the HTTP cache.
//   - A HOST THAT FAILS IS LEFT ALONE. Six failures in a row and nothing is asked for five minutes;
//     the globe's own map is simply what is on screen. No console noise of ours.
//
// COLOUR OR DETAIL. The Moon's mosaic is the ground's picture and replaces the map (graded to its
// tone). Mars has no seamless colour mosaic: Viking's MDIM 2.1 shows its frames as hard edges and
// tone steps (shot and rejected 2026-10-03). So Mars's tiles are THEMIS's daytime infrared mosaic,
// grey and seamless, used as DETAIL: the colour stays our own map's and the tile only multiplies
// its brightness (tileFragment). The mosaic is already flattened -- its 11-degree means stay within
// 1.7 % of the global one -- so there is no tone for it to bring.
//
// THE TONE. A mission mosaic is not graded like the Solar System Scope map under it, so where tiles
// stopped there would be an edge. Two things keep it off the screen: the whole visible ground is
// covered at `minLevel` or finer (scene/tilemath.js selectTiles), and that coarse cover -- three or
// four tiles -- is fetched first, so the mosaic changes once, in a fade, and everything after only
// sharpens it.

import * as THREE from '../../vendor/three.module.min.js';
import { WORLD_VERT, WORLD_FRAG } from './worlds.js';
import { TILESETS } from '../data/tilesets.js';
import {
  selectTiles, drawSet, underlay, nadirLevel, createLru, tileBounds, tileUrl,
  patchArrays, patchSegments, lonLatFromUnit, unitFromLonLat,
} from './tilemath.js';

/** Tiles on screen at once, per tier. Over it the whole selection is redone one notch coarser. */
export const DRAW_TILES = [0, 128, 256];
/**
 * Tiles kept, per tier: 53 MiB and 128 MiB of GPU memory. T1's maps measured 182.6 MiB with Mars at
 * 4k against a 250 MiB budget (registry/budgets.yaml tier1_texture_gpu_mib); tests/test_tiles.mjs
 * holds the sum.
 */
export const CACHE_TILES = [0, 160, 384];
/** One cached tile on the GPU: 256 x 256 RGBA8 with its mipmaps. */
export const TILE_GPU_MIB = (256 * 256 * 4 * 4 / 3) / (1024 * 1024);
/** Fetches in flight at once: what a browser gives one HTTP/1.1 host anyway. */
export const MAX_FETCHES = 6;
/** A tile's fade-in, and the fade of the whole layer in and out. */
export const FADE_MS = 450;
/** The selection is redone this often; the fades run every frame. */
export const SELECT_EVERY_MS = 125;
/** A detail tile brightens or darkens the world's map by no more than this (scene/tiles.js tileFragment). */
export const DETAIL_MIN = 0.35;
export const DETAIL_MAX = 2.2;
/** Failures in a row before the host is left alone, and for how long. */
export const FAILS_TO_PAUSE = 6;
export const PAUSE_MS = 5 * 60 * 1000;
/** How much of its distance a patch is pulled towards the camera in the depth test. */
export const DEPTH_PULL = 0.001;
/** The frustum test's slack, as a share of a tile's size: a small pan finds its tiles already there. */
export const VIEW_MARGIN = 0.25;
/** Once on, the layer stays until the camera is this much farther than where it started. */
export const STOP_HYSTERESIS = 1.2;

const FRAG_OUT = 'gl_FragColor = vec4( colour, 1.0 );';
const FRAG_BASE = 'vec3 base = mix( uTint, texture2D( uMap, vUv ).rgb * uTint, uHasMap );';
const VERT_DEPTH = '#include <logdepthbuf_vertex>';
const VERT_UV = 'vUv = uv;';

/**
 * The world's fragment shader with a fade, and with the two ways a tile is the ground's colour:
 *   colour (uDetail 0): the tile's own picture times the grade -- the Moon's WAC mosaic;
 *   detail (uDetail 1): the WORLD'S OWN MAP for the colour, times the tile's brightness over the
 *     mosaic's mean (uTint.r = 1 / mean) -- Mars, where the only seamless global mosaic is grey.
 *     The colour never jumps, because it is still our map's; the tile adds what the map is too
 *     coarse to hold. The factor is clamped so a no-data hole or a saturated texel is a dull spot,
 *     not a black or a white one.
 * Throws if the lines it rewrites have moved.
 */
export function tileFragment(src = WORLD_FRAG) {
  if (!src.includes(FRAG_OUT)) throw new Error('scene/tiles.js: WORLD_FRAG no longer ends in ' + FRAG_OUT);
  if (!src.includes(FRAG_BASE)) throw new Error('scene/tiles.js: WORLD_FRAG no longer reads its map with ' + FRAG_BASE);
  return src.replace(FRAG_OUT, 'gl_FragColor = vec4( colour, uFade );')
    .replace(FRAG_BASE, `vec3 tile = texture2D( uMap, vUv ).rgb;
  vec3 base = uDetail > 0.5
    ? texture2D( uBaseMap, vUvGlobe ).rgb * clamp( dot( tile, vec3( 0.2126, 0.7152, 0.0722 ) ) * uTint.r, ${DETAIL_MIN.toFixed(2)}, ${DETAIL_MAX.toFixed(2)} )
    : tile * uTint;`)
    .replace('uniform sampler2D uMap;', 'uniform sampler2D uMap;\nuniform sampler2D uBaseMap;\nuniform float uDetail;\nuniform float uFade;\nvarying vec2 vUvGlobe;');
}

/** The world's vertex shader with the depth pull (DEPTH, above) and the point's place on the world's own map. */
export function tileVertex(src = WORLD_VERT) {
  if (!src.includes(VERT_DEPTH)) throw new Error('scene/tiles.js: WORLD_VERT no longer includes the log depth chunk');
  if (!src.includes(VERT_UV)) throw new Error('scene/tiles.js: WORLD_VERT no longer sets ' + VERT_UV);
  return src.replace(VERT_UV, VERT_UV + '\n  vUvGlobe = uvGlobe;')
    .replace('varying vec2 vUv;', 'varying vec2 vUv;\nattribute vec2 uvGlobe;\nvarying vec2 vUvGlobe;')
    .replace(VERT_DEPTH, VERT_DEPTH + `
  #ifdef USE_LOGARITHMIC_DEPTH_BUFFER
    vFragDepth = 1.0 + gl_Position.w * ${(1 - DEPTH_PULL).toFixed(4)};
  #endif`);
}

/**
 * Fetch one tile and decode it off the main thread: `{ image, bytes, flipped }`. Rejects on anything
 * but a picture. An ImageBitmap ignores a texture's flipY, so its rows are turned over at decode
 * (`flipped: true`); a browser whose createImageBitmap will not take the option (Safari before 15)
 * gets an <img> from the same bytes, which three turns over itself.
 */
async function fetchTile(url, signal) {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit', signal });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const blob = await res.blob();
  if (typeof createImageBitmap === 'function') {
    try {
      const image = await createImageBitmap(blob, { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
      return { image, bytes: blob.size, flipped: true };
    } catch { /* the <img> below */ }
  }
  const src = URL.createObjectURL(blob);
  const image = new Image();
  image.src = src;
  try { await image.decode(); } finally { URL.revokeObjectURL(src); }
  return { image, bytes: blob.size, flipped: false };
}

/**
 * @param {object} opts
 * @param {object}   opts.worlds     scene/worlds.js: meshFor(id), hasMap(id)
 * @param {object}   opts.camera     the THREE camera
 * @param {Function} opts.viewport   () -> the drawing buffer's height in device pixels
 * @param {number}   opts.tier       the device tier now (scene/quality.js)
 * @param {boolean}  [opts.saveData] the connection asked to save data: no tiles, ever
 * @param {number}   [opts.anisotropy]
 * @param {Function} [opts.onChange] called when the set of mosaics on screen changes (the credit)
 * @param {object[]} [opts.sets]     TILESETS by default
 * @param {Function} [opts.loadTile] (url, signal) -> Promise<{image, bytes}>; a test's stand-in
 */
export function createPlanetTiles(opts = {}) {
  const worlds = opts.worlds;
  const camera = opts.camera;
  const sets = opts.sets || TILESETS;
  const loadTile = opts.loadTile || fetchTile;
  const onChange = typeof opts.onChange === 'function' ? opts.onChange : () => {};
  const anisotropy = Math.min(4, opts.anisotropy || 1);
  const saveData = !!opts.saveData;
  let tier = Number.isFinite(opts.tier) ? opts.tier : 0;
  let latched = false;
  let lastFrame = 0;
  let inFlight = 0;
  let failsInRow = 0;
  let pausedUntil = 0;
  const stats = { requests: 0, bytes: 0, loaded: 0, failed: 0, aborted: 0, evicted: 0 };
  const dead = new Set(); // urls that would not load: never asked for twice
  const vertexShader = tileVertex();
  const fragmentShader = tileFragment();

  // One layer per tile set, built the first time its world comes close.
  const layers = new Map();
  for (const set of sets) {
    // `grade` (registry/tilesets.yaml): the mosaic multiplied to the tone of the map under it, in
    // linear light -- uTint's own job in the world's shader, so it costs nothing. A Color past 1 is fine.
    const g = Array.isArray(set.grade) ? set.grade : [1, 1, 1];
    layers.set(set.id, {
      set, tint: new THREE.Color().setRGB(g[0], g[1], g[2], THREE.LinearSRGBColorSpace), group: null, tiles: new Map(), lru: createLru(1), drawn: new Set(), wanted: [], queue: [],
      on: false, master: 0, lastSelect: -Infinity, detail: 1, level: null, showing: false,
    });
  }

  const _cam = new THREE.Vector3();
  const _local = new THREE.Vector3();
  const _inv = new THREE.Matrix4();
  const _frustum = new THREE.Frustum();
  const _sphere = new THREE.Sphere();
  const _p = [0, 0, 0];

  function allowed() { return !latched && !saveData && tier >= 1; }

  function capacity() { return CACHE_TILES[Math.min(tier, CACHE_TILES.length - 1)] || 0; }
  function drawCap() { return DRAW_TILES[Math.min(tier, DRAW_TILES.length - 1)] || 0; }

  /** The camera as the world's own mesh sees it: sub-point, distance in radii, one pixel's angle. */
  function viewOf(mesh) {
    mesh.updateWorldMatrix(true, false);
    camera.getWorldPosition(_cam);
    _local.copy(_cam);
    mesh.worldToLocal(_local);
    const at = lonLatFromUnit(_local.x, _local.y, _local.z);
    const h = Math.max(1, Number(opts.viewport ? opts.viewport() : 800) || 800);
    const pixelRad = (2 * Math.tan(((camera.fov || 45) * Math.PI) / 360)) / h;
    return { lonDeg: at.lonDeg, latDeg: at.latDeg, dist: at.dist, pixelRad };
  }

  /** The frustum test selectTiles() asks of each tile: its bounding sphere, with VIEW_MARGIN of slack. */
  function frustumTest(mesh) {
    _inv.copy(camera.matrixWorld).invert();
    _frustum.setFromProjectionMatrix(_inv.premultiply(camera.projectionMatrix));
    const scale = mesh.scale.x;
    return (b) => {
      unitFromLonLat((b.west + b.east) / 2, (b.south + b.north) / 2, _p);
      _sphere.center.set(_p[0], _p[1], _p[2]);
      // The farthest corner from the middle is on the edge nearer the equator.
      const lat = Math.abs(b.south) < Math.abs(b.north) ? b.south : b.north;
      unitFromLonLat(b.west, lat, _p);
      const r = Math.hypot(_p[0] - _sphere.center.x, _p[1] - _sphere.center.y, _p[2] - _sphere.center.z);
      _sphere.radius = r * (1 + VIEW_MARGIN) * scale;
      _sphere.center.applyMatrix4(mesh.matrixWorld);
      return _frustum.intersectsSphere(_sphere);
    };
  }

  function build(layer, t, got) {
    const b = tileBounds(t.z, t.x, t.y, layer.set.matrix);
    const arrays = patchArrays(b, patchSegments(t.z, layer.set.matrix));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arrays.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(arrays.positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(arrays.uvs, 2));
    geo.setAttribute('uvGlobe', new THREE.BufferAttribute(arrays.globe, 2));
    geo.setIndex(new THREE.BufferAttribute(arrays.indices, 1));
    const tex = new THREE.Texture(got.image);
    tex.flipY = got.flipped === false;       // an ImageBitmap was turned over at decode (fetchTile)
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = anisotropy;
    tex.needsUpdate = true;
    const base = layer.mesh.material.uniforms;
    const fade = { value: 0 };
    const material = new THREE.ShaderMaterial({
      name: 'world-tile',
      vertexShader,
      fragmentShader,
      // The globe's own uniform OBJECTS, so its light is this patch's light; four are the patch's own.
      // uBaseMap is the globe's own uMap OBJECT: when the 4k map replaces the 2k one, a detail tile sees it.
      uniforms: {
        ...base, uMap: { value: tex }, uHasMap: { value: 1 }, uTint: { value: layer.tint }, uFade: fade,
        uBaseMap: base.uMap, uDetail: { value: layer.set.mode === 'detail' ? 1 : 0 },
      },
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = layer.set.id + ':' + t.key;
    mesh.frustumCulled = false; // selectTiles() already did it, with a margin
    mesh.renderOrder = 0.5 + t.z * 0.01; // after the globe, before air (1) and marks (5+); finer last
    mesh.visible = false;
    mesh.userData.kind = 'world-tile';
    layer.group.add(mesh);
    return { mesh, tex, fade };
  }

  function free(layer, key) {
    const e = layer.tiles.get(key);
    if (!e) return;
    layer.tiles.delete(key);
    layer.lru.delete(key);
    layer.drawn.delete(key);
    if (e.abort) { try { e.abort.abort(); } catch { /* already settled */ } }
    if (e.mesh) {
      layer.group.remove(e.mesh);
      e.mesh.geometry.dispose();
      e.mesh.material.dispose();
    }
    if (e.tex) {
      e.tex.dispose();
      if (e.tex.image && typeof e.tex.image.close === 'function') e.tex.image.close();
    }
  }

  function clear(layer) {
    for (const key of [...layer.tiles.keys()]) free(layer, key);
    layer.wanted = [];
    layer.queue = [];
    layer.drawn.clear();
    layer.master = 0;
    layer.on = false;
    layer.level = null;
    if (layer.group && layer.group.parent) layer.group.parent.remove(layer.group);
    layer.group = null;
    layer.mesh = null;
  }

  function request(layer, t) {
    const url = tileUrl(layer.set.url, t.z, t.x, t.y);
    if (dead.has(url)) return;
    const abort = typeof AbortController === 'function' ? new AbortController() : null;
    const entry = { key: t.key, z: t.z, x: t.x, y: t.y, state: 'loading', abort, fadeV: 0 };
    layer.tiles.set(t.key, entry);
    inFlight += 1;
    stats.requests += 1;
    let p;
    try { p = Promise.resolve(loadTile(url, abort ? abort.signal : undefined)); } catch (e) { p = Promise.reject(e); }
    p.then((got) => {
      inFlight -= 1;
      // The view may have moved on, or the latch tripped, while the bytes were in flight.
      if (layer.tiles.get(t.key) !== entry || !layer.group || !allowed()) {
        if (got && got.image && typeof got.image.close === 'function') got.image.close();
        return;
      }
      const made = build(layer, t, got);
      entry.state = 'ready';
      entry.abort = null;
      entry.mesh = made.mesh;
      entry.tex = made.tex;
      entry.fade = made.fade;
      layer.lru.touch(t.key);
      stats.loaded += 1;
      stats.bytes += got.bytes || 0;
      failsInRow = 0;
      pump(layer, lastFrame); // the freed slot is refilled now, not a frame later: on a slow device a frame is long
    }, (err) => {
      inFlight -= 1;
      const gone = layer.tiles.get(t.key) !== entry;
      if (!gone) layer.tiles.delete(t.key);
      // An abort is ours, not the host's: it is not a failure and the tile may be asked for again.
      if ((err && err.name === 'AbortError') || gone) { stats.aborted += 1; return; }
      stats.failed += 1;
      dead.add(url);
      failsInRow += 1;
      if (failsInRow >= FAILS_TO_PAUSE) { pausedUntil = lastFrame + PAUSE_MS; failsInRow = 0; }
      pump(layer, lastFrame);
    });
  }

  function select(layer, view, nowMs) {
    layer.lastSelect = nowMs;
    const set = layer.set;
    const picked = selectTiles({ ...view, inView: frustumTest(layer.mesh) }, set, { maxTiles: drawCap() });
    layer.wanted = picked.tiles;
    layer.detail = picked.detail;
    layer.level = picked.tiles.reduce((m, t) => Math.max(m, t.z), 0);
    // The coarse cover first, then the view's own tiles nearest first.
    const under = underlay(picked.tiles, set.minLevel);
    layer.queue = under.concat(picked.tiles);
    const keep = new Set(layer.queue.map((t) => t.key));
    // A fetch the view has left is aborted: on a pan across Mars it would otherwise hold a slot.
    for (const [key, e] of layer.tiles) if (e.state === 'loading' && !keep.has(key)) free(layer, key);
    for (const t of layer.queue) if (layer.tiles.has(t.key)) layer.lru.touch(t.key);
    const isReady = (key) => { const e = layer.tiles.get(key); return !!e && e.state === 'ready'; };
    const isSolid = (key) => { const e = layer.tiles.get(key); return !!e && e.fadeV >= 1; };
    const next = drawSet(picked.tiles, isReady, isSolid, layer.drawn, set.minLevel);
    for (const key of next) layer.lru.touch(key);
    layer.drawn = next;
    layer.lru.setCapacity(capacity());
    for (const key of layer.lru.trim((k) => next.has(k) || keep.has(k))) { free(layer, key); stats.evicted += 1; }
  }

  function pump(layer, nowMs) {
    if (nowMs < pausedUntil || !layer.on || !layer.group || !allowed()) return;
    // After a failure, no more in flight than the failures left before the pause: a host that is
    // down is asked FAILS_TO_PAUSE times in all, not that many and a queue's worth behind them.
    const room = Math.min(MAX_FETCHES, FAILS_TO_PAUSE - failsInRow);
    for (const t of layer.queue) {
      if (inFlight >= room) return;
      if (!layer.tiles.has(t.key)) request(layer, t);
    }
  }

  function frameLayer(layer, nowMs, dt) {
    const set = layer.set;
    const mesh = allowed() && worlds ? worlds.meshFor(set.world) : null;
    const usable = !!mesh && mesh.visible && !!mesh.material && !!mesh.material.uniforms
      && (!worlds.hasMap || worlds.hasMap(set.world));
    let view = null;
    let want = false;
    if (usable) {
      view = viewOf(mesh);
      if (view.dist > 1) {
        // On when the ground under the camera asks for startLevel; off a little farther out.
        const far = layer.on ? { ...view, dist: 1 + (view.dist - 1) / STOP_HYSTERESIS } : view;
        want = nadirLevel(far, set) >= set.startLevel;
      }
    }
    layer.on = want;
    if (!want && layer.master <= 0) {
      if (layer.group) clear(layer);
      return;
    }
    if (!layer.group) {
      layer.mesh = mesh;
      layer.group = new THREE.Group();
      layer.group.name = set.id + '-tiles';
      mesh.add(layer.group);
    }
    if (want && nowMs - layer.lastSelect >= SELECT_EVERY_MS) select(layer, view, nowMs);
    if (want) pump(layer, nowMs);
    layer.master = Math.min(1, Math.max(0, layer.master + (want ? dt : -dt) / FADE_MS));
    let shown = 0;
    for (const e of layer.tiles.values()) {
      if (e.state !== 'ready') continue;
      const on = layer.drawn.has(e.key);
      if (on) e.fadeV = Math.min(1, e.fadeV + dt / FADE_MS);
      e.mesh.visible = on && layer.master > 0;
      // Smoothstep, so a tile neither starts nor lands with a jerk.
      const k = e.fadeV * e.fadeV * (3 - 2 * e.fadeV);
      e.fade.value = k * layer.master;
      if (e.mesh.visible) shown += 1;
    }
    const showing = shown > 0;
    if (showing !== layer.showing) { layer.showing = showing; try { onChange(); } catch { /* a listener's trouble */ } }
  }

  return {
    /** Every frame, after the camera and the worlds have moved. */
    frame(nowMs) {
      const now = Number(nowMs) || 0;
      const dt = lastFrame ? Math.min(100, Math.max(0, now - lastFrame)) : 0;
      lastFrame = now;
      for (const layer of layers.values()) frameLayer(layer, now, dt);
    },
    /** A promotion (scene/quality.js). Up only; latch() is the way down. */
    setTier(n) { if (!latched && n > tier) tier = n; return tier; },
    /** The frame latch tripped: every tile freed, and none fetched again. */
    latch() {
      if (latched) return;
      latched = true;
      for (const layer of layers.values()) {
        const was = layer.showing;
        clear(layer);
        layer.showing = false;
        if (was) { try { onChange(); } catch { /* a listener's trouble */ } }
      }
    },
    /** The credit lines of the mosaics on screen now, for the Sources panel. */
    credits() {
      const out = [];
      for (const layer of layers.values()) if (layer.showing && layer.set.credit) out.push(layer.set.credit);
      return out;
    },
    /** For window.spaceRadar and the probes. */
    state() {
      const per = {};
      for (const layer of layers.values()) {
        let ready = 0;
        let loading = 0;
        for (const e of layer.tiles.values()) { if (e.state === 'ready') ready += 1; else loading += 1; }
        per[layer.set.id] = {
          world: layer.set.world, on: layer.on, showing: layer.showing, master: layer.master,
          level: layer.level, detail: layer.detail, wanted: layer.wanted.length, drawn: layer.drawn.size,
          cached: ready, loading,
          // The wanted tiles that are not on screen yet, and why: for a probe that asks what is stuck.
          waiting: layer.wanted.filter((t) => !layer.drawn.has(t.key)).slice(0, 8)
            .map((t) => t.key + ' ' + (layer.tiles.has(t.key) ? layer.tiles.get(t.key).state : dead.has(tileUrl(layer.set.url, t.z, t.x, t.y)) ? 'dead' : 'not asked')),
          levels: layer.wanted.reduce((m, t) => { m[t.z] = (m[t.z] || 0) + 1; return m; }, {}),
        };
      }
      return { tier, latched, saveData, inFlight, paused: lastFrame < pausedUntil, ...stats, sets: per };
    },
    dispose() { for (const layer of layers.values()) clear(layer); },
  };
}

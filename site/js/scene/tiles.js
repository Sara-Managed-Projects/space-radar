// scene/tiles.js -- a world drawn from map tiles when the camera is close (spec 0065 tasks 1-2).
//
// Contract: createPlanetTiles(opts) -> { frame(nowMs), setTier(n), setQuality(n, stripped), latch(), state(), credits(), dispose() }
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
// THE EARTH (2026-10-06, spec 0065 task 4). NASA GIBS serves Blue Marble -- cloud-free, 500 m, with
// shaded relief (and, since 2026-10-13, WITHOUT the sea floor: THE SEA, below) -- on its own grid (scene/tilemath.js, A SECOND GRID). The Earth's
// shader is not the world's: it mixes day and night, water, clouds, the Moon's shadow. So an Earth
// patch is the EARTH'S OWN shader pair (scene/earth.js SURFACE_VERT / SURFACE_FRAG) with one line
// changed -- the day map's colour, where the ground is lit -- and the globe's own uniform objects.
// Night lights, clouds and their shadows, the glint, the eclipse and the limb's air are computed in
// the patch exactly as in the globe; only the daylit ground is sharper. It differs from a world's
// patch in three ways: it lies on the WGS84 ellipsoid (the Earth's mesh does), it is OPAQUE and
// fades by mixing the tile into the day map inside the shader (so it sorts with the globe and every
// transparent thing -- orbits, the aurora, the overlays of #465 -- draws over it as over the globe),
// and its grade is a gain and, on water texels chosen from the tile's own colour, a lift, because
// Blue Marble's sea is far darker than our day map's and its land is not (registry/tilesets.yaml).
//
// THE SEA (2026-10-13). The first layer was Blue Marble WITH shaded bathymetry, and its water was
// multiplied 5 to 8 times to reach the map's blue: the sea floor's fracture zones were long straight
// streaks and the edges of the surveys behind it were rectangles, over open ocean. The layer is now
// the same Blue Marble without the sea floor (its deep water is one flat colour), and a water texel
// is `grade` times the tile plus `sea_lift`, which puts that flat colour at the map's blue and
// leaves the shallows as bright against the land as NASA drew them (earthTileColour is the twin).
//
// RELIEF (2026-10-06, spec 0065 task 3, first step). A row may name a second pyramid, `relief`: a
// SHADED-RELIEF mosaic made from the laser altimeters (LOLA on the Moon, MOLA and HRSC on Mars).
// It is a picture of slopes under ONE fixed light, whose direction was measured against the
// elevation tiles (the row says how). From it the patch takes the slope ALONG that light's
// direction and re-lights it with the real Sun: a slope that faces the Sun's side brightens, one
// that faces away darkens, more as the Sun sinks -- so craters cast their shading the right way
// round at the terminator. The slope across that direction is not in the picture and is not drawn;
// the card says so, and by how much the slopes are exaggerated (copy/en.js drawing.worldRelief).
// A relief tile is shared by the sixteen colour tiles inside it (RELIEF_COARSER), is one channel on
// the GPU, and is fetched after its colour tile through the same six slots.
//
// THE TONE. A mission mosaic is not graded like the Solar System Scope map under it, so where tiles
// stopped there would be an edge. Two things keep it off the screen: the whole visible ground is
// covered at `minLevel` or finer (scene/tilemath.js selectTiles), and that coarse cover -- three or
// four tiles -- is fetched first, so the mosaic changes once, in a fade, and everything after only
// sharpens it.
//
// CAST SHADOWS (release 1.2.0 stage W2-a, internal #864). The relief above is a slope under the
// Sun; it cannot make a crater's rim throw its shadow across the floor. A row with `height` (the
// Moon: LOLA's elevation pyramid, registry/tilesets.yaml) gets real ones. A WINDOW of heights round
// the view -- one 1024-texel square on the plane that touches the ground where the camera looks,
// read point by point from the elevation tiles (gnomonic: straight lines on the ground are straight
// in it, and the poles are no different from the equator) -- goes up as ONE height texture shared
// by every patch. From each sunlit point the patch marches toward the Sun in it and finds the
// tallest thing in the way, as the tangent of its angle over this point's horizon on the ball; past
// the Sun's own elevation the direct light goes (earthshine stays). Exactly the march Mars's globe
// does (scene/worlds.js MARS_RELIEF), with three differences:
//   - true heights, not exaggerated: at 666 m a texel a crater's walls are many texels wide;
//   - the edge is the Sun's own width (its half-angle, 0.27 degrees, is 0.0047 as a tangent), not
//     a soft blend: a shadow on the Moon is sharp-edged because there is no air;
//   - the noise is taken out in HEIGHT, not in angle: Trek's elevation is one byte a texel, 77 m a
//     step, so a mare is flat terraces with a 77 m step at each contour. Every rise is counted one
//     byte lower than it reads (CAST.marginCounts), so a contour can never shade the plain below it
//     at any Sun, and a 3.8 km rim loses 2 % of its shadow's length, not the 40 % an angle bias of
//     the same safety would cost at an 8 degree Sun.
// The window is rebuilt, a few rows a frame, when the view has moved a third of it or zoomed by a
// factor of two; the old one draws until the new one is whole. Off the window's edge the shadows
// fade (CAST.edgeFade). Tier 1 and up (the tiles' own rule), never after the latch.

import * as THREE from '../../vendor/three.module.min.js';
import { WORLD_VERT, WORLD_FRAG, WORLDS } from './worlds.js';
import { SURFACE_VERT, SURFACE_FRAG, WGS84_A_KM, WGS84_B_KM } from './earth.js';
import { TILESETS } from '../data/tilesets.js';
import { COPY } from '../copy/en.js';
import '../copy/en.later.js';
import {
  selectTiles, drawSet, underlay, nadirLevel, createLru, tileBounds, tileUrl,
  patchArrays, patchSegments, lonLatFromUnit, unitFromLonLat, gridOf, tileKey,
  levelForFootprint, wrapLon,
} from './tilemath.js';

/** Tiles on screen at once, per tier. Over it the whole selection is redone one notch coarser. */
export const DRAW_TILES = [0, 128, 256];
/**
 * Tiles kept, per tier: 53 MiB and 128 MiB of GPU memory. T1's maps measured 182.6 MiB with Mars at
 * 4k against a 250 MiB budget (registry/budgets.yaml tier1_texture_gpu_mib); tests/test_tiles.mjs
 * holds the sum.
 */
export const CACHE_TILES = [0, 160, 384];
/**
 * DRAW_TILES and CACHE_TILES are counted in 256-pixel tiles: a set of 512-pixel tiles (the Earth's)
 * draws and keeps a quarter as many, which is the same pixels on screen and the same memory.
 */
export function tileShare(set) {
  const px = (set && set.tilePx) || 256;
  // A set with relief keeps a fifth fewer: at worst every colour tile has a relief tile of its own,
  // one channel and so a quarter of its memory, and 0.8 x 1.25 is the same ceiling.
  return (256 / px) ** 2 * (set && set.relief ? 0.8 : 1);
}
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

/** The re-lit relief brightens or darkens the ground by no more than this (RELIEF, above). */
export const RELIEF_MIN = 0.3;
export const RELIEF_MAX = 2.2;
/**
 * A relief tile is this many levels coarser than the colour tile over it: one relief tile under
 * sixteen colour tiles. MEASURED 2026-10-06, 300 km over the Moon at 1440 x 900: with a relief tile
 * at the colour tile's own level (to the pyramid's last) the view asked for 44 relief tiles on top
 * of 92 colour ones and 6.1 MB in all, twice what the picture alone costs. The relief is a broad
 * shading under a photograph that already holds the fine detail; two levels coarser it is a tenth
 * of the bytes.
 */
export const RELIEF_COARSER = 2;
/** The Sun's height (its cosine to the vertical) below which the re-lighting stops growing. */
export const RELIEF_SUN_FLOOR = 0.1;
/** WGS84's first eccentricity squared: the Earth's patches lie on the ellipsoid its mesh is. */
export const EARTH_E2 = 1 - (WGS84_B_KM / WGS84_A_KM) ** 2;

/**
 * CAST SHADOWS (above). `texels` the window's side; `cover` its half-width over the half-width of
 * the ground in view; `minHalf`/`maxHalf` that half-width's bounds on the tangent plane, in radii
 * (0.25 radii: 434 km on the Moon, where the plane is still within 6 % of the ground); `maxTiles`
 * the elevation tiles one window may read (a coarser level when more); `steps` the march by tier;
 * `firstTexels` and `firstMinRad` its first step; `reachRad` its last (104 km on the Moon: a 5 km
 * wall's shadow at a 3 degree Sun); `marginCounts` the rise not counted, in the source's bytes;
 * `soft` the edge, as a tangent (the Sun's half-width); `depth` how much of the direct light a
 * shadow takes; `maxSun` the Sun's height (its sine) past which nothing is marched (no lunar wall
 * stands 37 degrees); `edgeFade` the share of the window over which shadows fade at its edge;
 * `recentre` the share of the half-width the view may move, and `rescale` the factor it may zoom,
 * before the window is rebuilt; `rowsPerFrame` how much of a rebuild one frame does.
 */
export const CAST = {
  texels: 1024, cover: 1.4, minHalf: 0.004, maxHalf: 0.25, maxTiles: 40,
  steps: [0, 16, 24], firstTexels: 1.5, firstMinRad: 0.0003, reachRad: 0.06,
  marginCounts: 1, soft: 0.0047, depth: 0.94, maxSun: 0.6, edgeFade: 0.12,
  recentre: 0.3, rescale: 2, rowsPerFrame: 16, budgetMs: 6, smoothMax: 8,
};
/** An elevation tile's texel at level `z`, in radians: its north-south side. Pure. */
export function castSourceTexel(z) { return Math.PI / (2 ** z * 256); }
/**
 * The worlds whose landing sites have traced rover traverses (registry/sites.yaml `traverses:`):
 * scene/traverse.js is imported the first time one of these worlds' tiles is on screen.
 * tests/test_traverse.mjs holds it to the data.
 */
export const TRAVERSE_WORLDS = ['moon'];
/** The cast shadows for probes and before pictures: true draws them where a row has heights. */
let castWanted = true;
export function setCastShadows(on) { castWanted = !!on; return castWanted; }
export function castShadowsOn() { return castWanted; }

/** Steps of the march between its first and last, growing by a constant ratio. Pure. */
export function castGrowth(firstRad, steps, reachRad = CAST.reachRad) {
  return steps > 1 && firstRad > 0 && reachRad > firstRad ? Math.pow(reachRad / firstRad, 1 / (steps - 1)) : 1;
}

/**
 * How much of the direct light reaches a point: the JS twin of the patch's march. `heightAt(s)` is
 * the ground's height in radii a distance `s` (radians) toward the Sun, 0 being the point; `tanSun`
 * the tangent of the Sun's elevation there; `marginRadii` the rise not counted. Pure.
 */
export function castLight(heightAt, tanSun, { steps = CAST.steps[1], firstRad = CAST.firstMinRad, marginRadii = 0, soft = CAST.soft, depth = CAST.depth } = {}) {
  const g = castGrowth(firstRad, steps);
  const h0 = heightAt(0);
  let s = firstRad;
  let horizon = -1;
  for (let j = 0; j < steps; j++) {
    horizon = Math.max(horizon, (heightAt(s) - h0 - marginRadii) / s - 0.5 * s);
    s *= g;
  }
  const x = Math.min(1, Math.max(0, (horizon - (tanSun - soft)) / (2 * soft)));
  return 1 - depth * x * x * (3 - 2 * x);
}

/**
 * The height window for a view (CAST SHADOWS, above). `cam` the camera and `dir` its forward
 * direction, both in the world mesh's own axes (the ball is radius 1); `tanHalfFov` the vertical
 * half-angle's tangent, `aspect` width over height. Returns the window's centre and its east and
 * north on the plane that touches it, and its half-width in radii, rounded to a power of the square
 * root of two so a slow zoom does not rebuild it every frame. Pure.
 */
export function castWindowFor(cam, dir, tanHalfFov, aspect, opts = CAST) {
  const cl = Math.hypot(cam[0], cam[1], cam[2]);
  if (!(cl > 1)) return null;
  const dl = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const d = [dir[0] / dl, dir[1] / dl, dir[2] / dl];
  // Where the line of sight meets the ball; past the limb, the point under the camera.
  const b = cam[0] * d[0] + cam[1] * d[1] + cam[2] * d[2];
  const c = cl * cl - 1;
  const disc = b * b - c;
  let p;
  let dist;
  if (b < 0 && disc > 0) {
    dist = -b - Math.sqrt(disc);
    p = [cam[0] + d[0] * dist, cam[1] + d[1] * dist, cam[2] + d[2] * dist];
  } else {
    dist = cl - 1;
    p = [cam[0] / cl, cam[1] / cl, cam[2] / cl];
  }
  const pl = Math.hypot(p[0], p[1], p[2]);
  const u = [p[0] / pl, p[1] / pl, p[2] / pl];
  // East is the pole's axis (+y) across the vertical; at a pole any east will do.
  let e = [u[2], 0, -u[0]];
  let el = Math.hypot(e[0], e[1], e[2]);
  if (el < 1e-6) { e = [1, 0, 0]; el = 1; }
  e = [e[0] / el, e[1] / el, e[2] / el];
  const n = [u[1] * e[2] - u[2] * e[1], u[2] * e[0] - u[0] * e[2], u[0] * e[1] - u[1] * e[0]];
  const want = opts.cover * dist * tanHalfFov * Math.max(1, aspect || 1);
  const half = Math.min(opts.maxHalf, Math.max(opts.minHalf, Math.SQRT2 ** Math.round(2 * Math.log2(Math.max(1e-9, want)))));
  return { u, e, n, half };
}

/** Does the window `w` still serve the view's window `v`, or must it be rebuilt? Pure. */
export function castWindowStale(w, v, opts = CAST) {
  if (!w) return !!v;
  if (!v) return false;
  const cosA = w.u[0] * v.u[0] + w.u[1] * v.u[1] + w.u[2] * v.u[2];
  const moved = Math.acos(Math.min(1, Math.max(-1, cosA)));
  return moved > opts.recentre * w.half || v.half >= w.half * opts.rescale || v.half <= w.half / opts.rescale;
}

/** A point of the window -- (x, y) on its plane, in radii -- as east longitude and latitude, degrees. Pure. */
export function castPointLonLat(w, x, y) {
  const px = w.u[0] + x * w.e[0] + y * w.n[0];
  const py = w.u[1] + x * w.e[1] + y * w.n[1];
  const pz = w.u[2] + x * w.e[2] + y * w.n[2];
  return lonLatFromUnit(px, py, pz);
}

/**
 * The elevation tiles a window reads, and their level: the finest no finer than the window's own
 * texel and no more than `maxTiles` of them. A window over a pole takes every column of the rows it
 * covers. Pure.
 */
export function castTilesFor(w, height, opts = CAST) {
  const texel = (2 * w.half) / opts.texels;
  let z = Math.max(0, Math.min(height.maxLevel, levelForFootprint(texel)));
  // A pole inside the window: its rows are needed whole.
  const poleIn = (sign) => {
    const ww = sign * w.u[1];
    if (ww <= 0) return false;
    return Math.abs(sign * w.e[1] / ww) <= w.half && Math.abs(sign * w.n[1] / ww) <= w.half;
  };
  const north = poleIn(1);
  const south = poleIn(-1);
  for (; z >= 0; z--) {
    const keys = new Map();
    const span = 180 / 2 ** z;
    const cols = 2 * 2 ** z;
    const rows = 2 ** z;
    const add = (lonDeg, latDeg) => {
      const x = Math.min(cols - 1, Math.max(0, Math.floor((wrapLon(lonDeg) + 180) / span)));
      const y = Math.min(rows - 1, Math.max(0, Math.floor((90 - latDeg) / span)));
      keys.set(tileKey(z, x, y), { z, x, y });
    };
    const k = 24;
    let latMin = 90;
    let latMax = -90;
    for (let i = 0; i <= k; i++) {
      for (let j = 0; j <= k; j++) {
        const ll = castPointLonLat(w, (2 * i / k - 1) * w.half, (2 * j / k - 1) * w.half);
        add(ll.lonDeg, ll.latDeg);
        latMin = Math.min(latMin, ll.latDeg);
        latMax = Math.max(latMax, ll.latDeg);
      }
    }
    if (north) { for (let x = 0; x < cols; x++) for (let lat = latMin; lat <= 90; lat += span) add(-180 + (x + 0.5) * span, Math.min(89.999, lat)); }
    if (south) { for (let x = 0; x < cols; x++) for (let lat = latMax; lat >= -90; lat -= span) add(-180 + (x + 0.5) * span, Math.max(-89.999, lat)); }
    if (keys.size <= opts.maxTiles || z === 0) return { z, tiles: [...keys.values()] };
  }
  return { z: 0, tiles: [] };
}

/**
 * Bilinear height in metres at a longitude and latitude from elevation tiles of level `z`:
 * `pixels(z, x, y)` gives a tile's bytes (256 x 256, row 0 north) or null. Null where a tile is
 * missing. Pure.
 */
export function castSample(pixels, z, lonDeg, latDeg, height) {
  const n = 2 * 2 ** z * 256;
  const m = 2 ** z * 256;
  const px = ((wrapLon(lonDeg) + 180) / 360) * n - 0.5;
  const py = ((90 - latDeg) / 180) * m - 0.5;
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const fx = px - x0;
  const fy = py - y0;
  let sum = 0;
  for (let k = 0; k < 4; k++) {
    const X = (((x0 + (k & 1)) % n) + n) % n;
    const Y = Math.min(m - 1, Math.max(0, y0 + (k >> 1)));
    const t = pixels(z, X >> 8, Y >> 8);
    if (!t) return null;
    const v = t[(Y & 255) * 256 + (X & 255)];
    sum += v * ((k & 1) ? fx : 1 - fx) * ((k >> 1) ? fy : 1 - fy);
  }
  return sum * height.metresPerCount + height.offsetM;
}

const FRAG_OUT = 'gl_FragColor = vec4( colour, 1.0 );';
const FRAG_LIT = 'vec3 colour = base * direct * uSunIrradiance * ringShade;';
const EARTH_GROUND = 'vec3 ground = dayTex * (';
// Where WORLD_FRAG says which point of the world's own map a fragment is (its relief and its cast
// shadow are read there). A tile's vUv is the TILE's; the globe's is vUvGlobe.
const FRAG_RELIEF_UV = 'vec2 reliefUv = vUv; float slopeShare = 1.0;';
/**
 * Which of an Earth tile's texels are water (linear light). Two tests, the larger wins:
 *   blue    blue more than `blueOverRed` times red, in full `full` past it: the flat deep sea
 *           (0.006 past) and every shallow.
 *   murk    beside a coast Blue Marble's water is ocean-colour data in blocks of a few kilometres,
 *           nearly black and as often green as blue (sRGB 0, 6, 4; 2, 8, 4; 0, 6, 0 off Dakar): no red
 *           to speak of (`murkRed`: all of it under the first, none past the second), dark
 *           (`murkGreen`), and not black (`murkSome` of green or blue: a shadow in a valley is
 *           black and is land). Without it those blocks kept the land's grade and were a dark
 *           patchwork along the shore (the first two looks, off Senegal).
 */
export const TILE_SEA = { blueOverRed: 1.6, full: 0.002, murkRed: [0.0006, 0.0015], murkGreen: [0.004, 0.008], murkSome: [0.0006, 0.0012] };
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
  if (!src.includes(FRAG_LIT)) throw new Error('scene/tiles.js: WORLD_FRAG no longer lights its ground with ' + FRAG_LIT);
  if (!src.includes(FRAG_RELIEF_UV)) throw new Error('scene/tiles.js: WORLD_FRAG no longer places its relief with ' + FRAG_RELIEF_UV);
  return src.replace(FRAG_OUT, 'gl_FragColor = vec4( colour, uFade );')
    // THE GLOBE'S OWN RELIEF UNDER A TILE (Mars, 2026-10-12): read at the globe's uv; its slope
    // gives way to the tile's finer relief as that fades in (or both would shade the same hill),
    // while the shadow cast from the globe's height map stays, which no tile brings.
    .replace(FRAG_RELIEF_UV, 'vec2 reliefUv = vUvGlobe; float slopeShare = 1.0 - uRelief.x;')
    // RELIEF: the shaded-relief picture's slope along its own light, re-lit by the real Sun.
    // uReliefLight is (east, north) of the direction TO the picture's light and its height's sine;
    // h / flat = 1 - slope . light_h / light_up, so the slope toward the light is q x up / |h|.
    .replace(FRAG_LIT, `float relief = 1.0;
  if ( uRelief.x > 0.0 && d > 0.0 ) {
    vec3 up = normalize( vPosL );
    vec3 east = normalize( cross( vec3( 0.0, 1.0, 0.0 ), up ) );
    vec3 north = cross( up, east );
    float lvl = uReliefLight.z;
    float q = ( texture2D( uReliefMap, vUv * uReliefXf.xy + uReliefXf.zw ).r - lvl ) / lvl;
    float slope = q * lvl / sqrt( 1.0 - lvl * lvl ) * uRelief.y;
    float along = dot( vSunL, east ) * uReliefLight.x + dot( vSunL, north ) * uReliefLight.y;
    relief = mix( 1.0, clamp( 1.0 + slope * along / max( dot( vSunL, up ), ${RELIEF_SUN_FLOOR.toFixed(2)} ), ${RELIEF_MIN.toFixed(2)}, ${RELIEF_MAX.toFixed(2)} ), uRelief.x );
  }
  // CAST SHADOWS (scene/tiles.js CAST): toward the Sun in the window of heights, the tallest
  // thing in the way. uHtWin: (uv per radian, steps, first step, growth); uHtMarch: (window texel
  // in radians, the edge, the rise not counted, the depth); heights are stored in km.
  float castLit = 1.0;
  if ( uHtOn > 0.0 ) {
    vec3 upC = normalize( vPosL );
    vec3 sunC = normalize( vSunL );
    float sinSun = dot( upC, sunC );
    float wC = dot( upC, uHtU );
    if ( sinSun > 0.0 && sinSun < ${CAST.maxSun.toFixed(2)} && wC > 0.5 ) {
      vec2 uv0 = vec2( dot( upC, uHtE ), dot( upC, uHtN ) ) / wC * uHtWin.x + 0.5;
      vec2 edgeC = min( uv0, 1.0 - uv0 );
      float inWin = smoothstep( 0.0, ${CAST.edgeFade.toFixed(2)}, min( edgeC.x, edgeC.y ) );
      vec3 shC = sunC - upC * sinSun;
      vec2 dirC = vec2( dot( shC, uHtE ), dot( shC, uHtN ) );
      float dlC = length( dirC );
      if ( inWin > 0.0 && dlC > 1e-5 ) {
        dirC /= dlC;
        float tanSun = sinSun / max( length( shC ), 1e-5 );
        float h0 = textureLod( uHtMap, uv0, 0.0 ).r * uHtScale;
        float s = uHtWin.z;
        float horizon = -1.0;
        for ( int j = 0; j < ${CAST.steps[2]}; j++ ) {
          if ( float( j ) >= uHtWin.y ) break;
          vec2 uvS = uv0 + dirC * ( s * uHtWin.x );
          if ( uvS.x < 0.0 || uvS.y < 0.0 || uvS.x > 1.0 || uvS.y > 1.0 ) break;
          float lod = max( log2( s * ( uHtWin.w - 1.0 ) / uHtMarch.x ), 0.0 );
          float h = textureLod( uHtMap, uvS, lod ).r * uHtScale;
          horizon = max( horizon, ( h - h0 - uHtMarch.z ) / s - 0.5 * s );
          s *= uHtWin.w;
        }
        castLit = 1.0 - uHtMarch.w * uHtOn * inWin * smoothstep( tanSun - uHtMarch.y, tanSun + uHtMarch.y, horizon );
      }
    }
  }
  vec3 colour = base * direct * uSunIrradiance * ringShade * relief * castLit;`)
    .replace(FRAG_BASE, `vec3 tile = texture2D( uMap, vUv ).rgb;
  vec3 base = uDetail > 0.5
    ? texture2D( uBaseMap, vUvGlobe ).rgb * clamp( dot( tile, vec3( 0.2126, 0.7152, 0.0722 ) ) * uTint.r, ${DETAIL_MIN.toFixed(2)}, ${DETAIL_MAX.toFixed(2)} )
    : tile * uTint;`)
    .replace('uniform sampler2D uMap;', 'uniform sampler2D uMap;\nuniform sampler2D uBaseMap;\nuniform float uDetail;\nuniform float uFade;\nvarying vec2 vUvGlobe;\nuniform sampler2D uReliefMap;\nuniform vec4 uReliefXf;\nuniform vec3 uReliefLight;\nuniform vec2 uRelief;'
      + '\nuniform sampler2D uHtMap;\nuniform float uHtOn;\nuniform float uHtScale;\nuniform vec3 uHtE;\nuniform vec3 uHtN;\nuniform vec3 uHtU;\nuniform vec4 uHtWin;\nuniform vec4 uHtMarch;');
}

/**
 * The EARTH'S fragment shader with the daylit ground read from a tile (THE EARTH, above). The tile
 * is multiplied by the grade and its water texels lifted (THE SEA, above), water chosen per texel
 * from the tile itself: Blue Marble's water is blue past its red (b - 1.6 r is +0.006 in linear
 * light over its flat deep sea, more over shallows, and negative over every land and ice mean
 * measured, registry/tilesets.yaml). Everything else -- the water mask and
 * the glint, night lights, clouds, the eclipse -- still reads the globe's own maps at vUv.
 * Throws if the line it rewrites has moved.
 */
export function earthTileFragment(src = SURFACE_FRAG) {
  if (!src.includes(EARTH_GROUND)) throw new Error('scene/tiles.js: SURFACE_FRAG no longer lights its ground with ' + EARTH_GROUND);
  return src.replace(EARTH_GROUND, `vec3 tile = texture2D( uTile, vUvTile ).rgb;
  float tileSea = max( smoothstep( 0.0, ${TILE_SEA.full.toFixed(3)}, tile.b - ${TILE_SEA.blueOverRed.toFixed(1)} * tile.r ),
    ( 1.0 - smoothstep( ${TILE_SEA.murkRed[0].toFixed(4)}, ${TILE_SEA.murkRed[1].toFixed(4)}, tile.r ) ) * ( 1.0 - smoothstep( ${TILE_SEA.murkGreen[0].toFixed(3)}, ${TILE_SEA.murkGreen[1].toFixed(3)}, tile.g ) ) * smoothstep( ${TILE_SEA.murkSome[0].toFixed(4)}, ${TILE_SEA.murkSome[1].toFixed(4)}, max( tile.g, tile.b ) ) );
  vec3 ground = mix( dayTex, tile * uTileGrade + uTileSeaLift * tileSea, uFade ) * (`)
    .replace('uniform sampler2D uDay;', 'uniform sampler2D uDay;\nuniform sampler2D uTile;\nuniform vec3 uTileGrade;\nuniform vec3 uTileSeaLift;\nuniform float uFade;\nvarying vec2 vUvTile;');
}

/**
 * The JS twin of the Earth patch's ground colour: a tile's texel (linear light) as it is drawn.
 * Land is the texel times `grade`; a water texel is that plus `seaLift`.
 * @returns {{ rgb: number[], sea: number }}
 */
export function earthTileColour(rgb, grade, seaLift = [0, 0, 0]) {
  const ss = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const S = TILE_SEA;
  const sea = Math.max(ss(0, S.full, rgb[2] - S.blueOverRed * rgb[0]),
    (1 - ss(S.murkRed[0], S.murkRed[1], rgb[0])) * (1 - ss(S.murkGreen[0], S.murkGreen[1], rgb[1])) * ss(S.murkSome[0], S.murkSome[1], Math.max(rgb[1], rgb[2])));
  return { rgb: [0, 1, 2].map((i) => rgb[i] * grade[i] + seaLift[i] * sea), sea };
}

/** The Earth's vertex shader with the depth pull and the tile's own uv (`uv` stays the globe's). */
export function earthTileVertex(src = SURFACE_VERT) {
  if (!src.includes(VERT_DEPTH)) throw new Error('scene/tiles.js: SURFACE_VERT no longer includes the log depth chunk');
  if (!src.includes(VERT_UV)) throw new Error('scene/tiles.js: SURFACE_VERT no longer sets ' + VERT_UV);
  return src.replace(VERT_UV, VERT_UV + '\n  vUvTile = uvTile;')
    .replace('varying vec2 vUv;', 'varying vec2 vUv;\nattribute vec2 uvTile;\nvarying vec2 vUvTile;')
    .replace(VERT_DEPTH, VERT_DEPTH + `
  #ifdef USE_LOGARITHMIC_DEPTH_BUFFER
    vFragDepth = 1.0 + gl_Position.w * ${(1 - DEPTH_PULL).toFixed(4)};
  #endif`);
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
 * Fetch one ELEVATION tile and read its bytes: `{ pixels, bytes }`, the grey channel of a 256 x 256
 * picture, row 0 at the north (not turned over: these are numbers, not a texture). Rejects on
 * anything but a picture of that size.
 */
async function fetchHeights(url, signal) {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit', signal });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const blob = await res.blob();
  const image = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  try {
    if (image.width !== 256 || image.height !== 256) throw new Error('an elevation tile is not 256 x 256');
    const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(256, 256) : Object.assign(document.createElement('canvas'), { width: 256, height: 256 });
    const g = canvas.getContext('2d', { willReadFrequently: true });
    g.drawImage(image, 0, 0);
    const rgba = g.getImageData(0, 0, 256, 256).data;
    const pixels = new Uint8Array(256 * 256);
    for (let i = 0; i < pixels.length; i++) pixels[i] = rgba[i * 4];
    return { pixels, bytes: blob.size };
  } finally {
    if (typeof image.close === 'function') image.close();
  }
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
  const loadHeights = opts.loadHeights || fetchHeights;
  // The traverses' module, fetched the first time a world that has them is close (TRAVERSE_WORLDS).
  const importTraverses = opts.importTraverses || (() => import('./traverse.js'));
  let traverseModule = null;
  let traverseAsked = false;
  const onChange = typeof opts.onChange === 'function' ? opts.onChange : () => {};
  const anisotropy = Math.min(4, opts.anisotropy || 1);
  const saveData = !!opts.saveData;
  let tier = Number.isFinite(opts.tier) ? opts.tier : 0;
  let latched = false;
  let lastFrame = 0;
  let inFlight = 0;
  let failsInRow = 0;
  let pausedUntil = 0;
  const stats = { requests: 0, bytes: 0, loaded: 0, failed: 0, aborted: 0, evicted: 0, heightRequests: 0, heightBytes: 0 };
  const dead = new Set(); // urls that would not load: never asked for twice
  const vertexShader = tileVertex();
  const fragmentShader = tileFragment();
  // The Earth's pair, built the first time an Earth patch is.
  let earthShaders = null;
  const blankRelief = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
  blankRelief.needsUpdate = true;
  // The cast-shadow uniforms of a set without heights: off.
  const noCast = castUniforms(1);
  function castUniforms(radiusKm) {
    return {
      uHtMap: { value: blankRelief }, uHtOn: { value: 0 }, uHtScale: { value: 1 / radiusKm },
      uHtE: { value: new THREE.Vector3(1, 0, 0) }, uHtN: { value: new THREE.Vector3(0, 0, -1) }, uHtU: { value: new THREE.Vector3(0, 1, 0) },
      uHtWin: { value: new THREE.Vector4(0.5, 0, CAST.firstMinRad, 1) }, uHtMarch: { value: new THREE.Vector4(1, CAST.soft, 0, CAST.depth) },
    };
  }
  const castSteps = () => CAST.steps[Math.min(Math.max(0, tier), CAST.steps.length - 1)] || 0;

  // One layer per tile set, built the first time its world comes close.
  const layers = new Map();
  for (const set of sets) {
    // `grade` (registry/tilesets.yaml): the mosaic multiplied to the tone of the map under it, in
    // linear light -- uTint's own job in the world's shader, so it costs nothing. A Color past 1 is fine.
    const g = Array.isArray(set.grade) ? set.grade : [1, 1, 1];
    const sl = Array.isArray(set.seaLift) ? set.seaLift : [0, 0, 0];
    const rel = set.relief && set.relief.url ? set.relief : null;
    const az = rel ? (Number(rel.lightAzimuthDeg) || 0) * Math.PI / 180 : 0;
    const ht = set.height && set.height.url ? set.height : null;
    const world = WORLDS.find((w) => w.id === set.world) || null;
    layers.set(set.id, {
      set, grid: gridOf(set), share: tileShare(set),
      tint: new THREE.Color().setRGB(g[0], g[1], g[2], THREE.LinearSRGBColorSpace),
      seaLift: new THREE.Color().setRGB(sl[0], sl[1], sl[2], THREE.LinearSRGBColorSpace),
      group: null, tiles: new Map(), lru: createLru(1), drawn: new Set(), wanted: [], queue: [],
      on: false, master: 0, lastSelect: -Infinity, detail: 1, level: null, showing: false,
      // RELIEF: the row's second pyramid, its tiles by key (each shared by the patches inside it),
      // and the ones waiting for a fetch slot. `reliefOn` is true once one is on screen.
      relief: rel, reliefs: new Map(), reliefQueue: [], reliefOn: false,
      reliefLight: rel ? new THREE.Vector3(Math.sin(az), Math.cos(az), Number(rel.flat) || 0.7) : null,
      // CAST SHADOWS: the row's heights, the uniforms every patch of this set shares, and the
      // window (`win` drawn, `next` being built) with the elevation tiles it reads.
      height: ht && world ? ht : null,
      trav: null,
      radiusKm: world ? world.radiusKm : 1,
      castU: ht && world ? castUniforms(world.radiusKm) : null,
      cast: { win: null, tex: null, next: null, tiles: new Map(), fade: 0, showing: false },
    });
  }

  const _cam = new THREE.Vector3();
  const _local = new THREE.Vector3();
  const _inv = new THREE.Matrix4();
  const _frustum = new THREE.Frustum();
  const _sphere = new THREE.Sphere();
  const _p = [0, 0, 0];

  function allowed() { return !latched && !saveData && tier >= 1; }

  function capacity(layer) { return Math.floor((CACHE_TILES[Math.min(tier, CACHE_TILES.length - 1)] || 0) * layer.share); }
  function drawCap(layer) { return Math.floor((DRAW_TILES[Math.min(tier, DRAW_TILES.length - 1)] || 0) * layer.share); }

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
    const base = layer.mesh.material.uniforms;
    const earth = !!base.uDay; // the Earth's own shader (scene/earth.js), not the world's
    const b = tileBounds(t.z, t.x, t.y, layer.grid);
    const arrays = patchArrays(b, patchSegments(t.z, layer.grid), earth ? EARTH_E2 : 0);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arrays.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(arrays.normals, 3));
    // A world's shader reads the tile at `uv`; the Earth's reads its own maps there and the tile at `uvTile`.
    geo.setAttribute('uv', new THREE.BufferAttribute(earth ? arrays.globe : arrays.uvs, 2));
    geo.setAttribute(earth ? 'uvTile' : 'uvGlobe', new THREE.BufferAttribute(earth ? arrays.uvs : arrays.globe, 2));
    geo.setIndex(new THREE.BufferAttribute(arrays.indices, 1));
    const tex = new THREE.Texture(got.image);
    tex.flipY = got.flipped === false;       // an ImageBitmap was turned over at decode (fetchTile)
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = anisotropy;
    tex.needsUpdate = true;
    const fade = { value: 0 };
    let material;
    let relief = null;
    if (earth) {
      if (!earthShaders) earthShaders = { vertexShader: earthTileVertex(), fragmentShader: earthTileFragment() };
      material = new THREE.ShaderMaterial({
        name: 'earth-tile',
        ...earthShaders,
        // The globe's own uniform OBJECTS: its Sun, clouds, night lights, water and eclipse are this patch's.
        uniforms: { ...base, uTile: { value: tex }, uTileGrade: { value: layer.tint }, uTileSeaLift: { value: layer.seaLift }, uFade: fade },
        // Opaque: the fade is a mix inside the shader (THE EARTH, above). It still never writes depth.
        transparent: false,
        depthWrite: false,
      });
    } else {
      relief = layer.relief ? reliefFor(layer, t) : null;
      material = new THREE.ShaderMaterial({
        name: 'world-tile',
        vertexShader,
        fragmentShader,
        // The globe's own uniform OBJECTS, so its light is this patch's light; the rest are the patch's own.
        // uBaseMap is the globe's own uMap OBJECT: when the 4k map replaces the 2k one, a detail tile sees it.
        uniforms: {
          ...base, uMap: { value: tex }, uHasMap: { value: 1 }, uTint: { value: layer.tint }, uFade: fade,
          uBaseMap: base.uMap, uDetail: { value: layer.set.mode === 'detail' ? 1 : 0 },
          uReliefMap: { value: relief && relief.entry.tex ? relief.entry.tex : blankRelief },
          uReliefXf: { value: new THREE.Vector4(...(relief ? relief.xf : [1, 1, 0, 0])) },
          uReliefLight: { value: layer.reliefLight || new THREE.Vector3(0, 1, 0.7) },
          // x: how much of the relief is in (it fades in when its tile lands); y: the exaggeration.
          uRelief: { value: new THREE.Vector2(0, layer.relief ? Number(layer.relief.gain) || 1 : 0) },
          // The cast shadows' uniform OBJECTS, one set for every patch of the layer (CAST SHADOWS).
          ...(layer.castU || noCast),
        },
        transparent: true,
        depthWrite: false,
      });
    }
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = layer.set.id + ':' + t.key;
    mesh.frustumCulled = false; // selectTiles() already did it, with a margin
    mesh.renderOrder = 0.5 + t.z * 0.01; // after the globe, before air (1) and marks (5+); finer last
    mesh.visible = false;
    mesh.userData.kind = 'world-tile';
    layer.group.add(mesh);
    return { mesh, tex, fade, relief: relief ? relief.entry : null };
  }

  /**
   * The relief tile over a colour tile: its ancestor RELIEF_COARSER levels up (never past the relief
   * pyramid's last level), and where the colour tile sits inside it (scale, then offset, in uv
   * with v = 0 at the south edge). One entry per relief tile, counted by the patches that use it.
   */
  function reliefFor(layer, t) {
    const rz = Math.max(0, Math.min(t.z - RELIEF_COARSER, layer.relief.maxLevel));
    const up = t.z - rz;
    const rx = t.x >> up;
    const ry = t.y >> up;
    const key = tileKey(rz, rx, ry);
    const n = 2 ** up;
    const xf = [1 / n, 1 / n, (t.x - rx * n) / n, 1 - (t.y - ry * n + 1) / n];
    let entry = layer.reliefs.get(key);
    if (!entry) {
      entry = { key, z: rz, x: rx, y: ry, state: 'waiting', refs: 0, tex: null, abort: null };
      layer.reliefs.set(key, entry);
      layer.reliefQueue.push(entry);
    }
    entry.refs += 1;
    return { entry, xf };
  }

  function requestRelief(layer, entry) {
    const url = tileUrl(layer.relief.url, entry.z, entry.x, entry.y);
    if (dead.has(url)) { entry.state = 'dead'; return; }
    entry.abort = typeof AbortController === 'function' ? new AbortController() : null;
    entry.state = 'loading';
    inFlight += 1;
    stats.requests += 1;
    let p;
    try { p = Promise.resolve(loadTile(url, entry.abort ? entry.abort.signal : undefined)); } catch (e) { p = Promise.reject(e); }
    p.then((got) => {
      inFlight -= 1;
      if (layer.reliefs.get(entry.key) !== entry || !layer.group || !allowed()) {
        if (got && got.image && typeof got.image.close === 'function') got.image.close();
        return;
      }
      // One channel, as the bytes are: a shaded-relief picture is a quantity, not a colour, and R8
      // is a quarter of RGBA's memory (the Earth's water mask goes up the same way, main.js).
      const tex = new THREE.Texture(got.image);
      tex.flipY = got.flipped === false;
      tex.format = THREE.RedFormat;
      tex.colorSpace = THREE.NoColorSpace;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.needsUpdate = true;
      entry.tex = tex;
      entry.state = 'ready';
      entry.abort = null;
      stats.loaded += 1;
      stats.bytes += got.bytes || 0;
      failsInRow = 0;
      for (const e of layer.tiles.values()) if (e.relief === entry && e.mesh) e.mesh.material.uniforms.uReliefMap.value = tex;
      pump(layer, lastFrame);
    }, (err) => {
      inFlight -= 1;
      const gone = layer.reliefs.get(entry.key) !== entry;
      if ((err && err.name === 'AbortError') || gone) { stats.aborted += 1; return; }
      // The ground is simply drawn without relief there; the host's failures are counted as any tile's.
      entry.state = 'dead';
      stats.failed += 1;
      dead.add(url);
      failsInRow += 1;
      if (failsInRow >= FAILS_TO_PAUSE) { pausedUntil = lastFrame + PAUSE_MS; failsInRow = 0; }
      pump(layer, lastFrame);
    });
  }

  function dropRelief(layer, entry) {
    entry.refs -= 1;
    if (entry.refs > 0) return;
    layer.reliefs.delete(entry.key);
    if (entry.abort) { try { entry.abort.abort(); } catch { /* already settled */ } }
    if (entry.tex) {
      entry.tex.dispose();
      if (entry.tex.image && typeof entry.tex.image.close === 'function') entry.tex.image.close();
    }
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
    if (e.relief) dropRelief(layer, e.relief);
  }

  function clear(layer) {
    for (const key of [...layer.tiles.keys()]) free(layer, key);
    layer.wanted = [];
    layer.queue = [];
    layer.reliefQueue = [];
    layer.reliefOn = false;
    layer.drawn.clear();
    layer.master = 0;
    layer.on = false;
    layer.level = null;
    if (layer.group && layer.group.parent) layer.group.parent.remove(layer.group);
    layer.group = null;
    if (layer.trav) { layer.trav.hide(); if (layer.trav.group.parent) layer.trav.group.parent.remove(layer.trav.group); }
    layer.mesh = null;
    freeCast(layer);
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
      entry.relief = made.relief;
      entry.reliefV = 0;
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
    const picked = selectTiles({ ...view, inView: frustumTest(layer.mesh) }, set, { maxTiles: drawCap(layer) });
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
    layer.lru.setCapacity(capacity(layer));
    for (const key of layer.lru.trim((k) => next.has(k) || keep.has(k))) { free(layer, key); stats.evicted += 1; }
  }

  function pump(layer, nowMs) {
    if (nowMs < pausedUntil || !layer.on || !layer.group || !allowed()) return;
    // After a failure, no more in flight than the failures left before the pause: a host that is
    // down is asked FAILS_TO_PAUSE times in all, not that many and a queue's worth behind them.
    const room = Math.min(MAX_FETCHES, FAILS_TO_PAUSE - failsInRow);
    // Relief for the tiles already on screen goes first: it finishes a picture that is there.
    while (layer.reliefQueue.length) {
      if (inFlight >= room) return;
      const entry = layer.reliefQueue.shift();
      if (entry.state === 'waiting' && layer.reliefs.get(entry.key) === entry) requestRelief(layer, entry);
    }
    for (const t of layer.queue) {
      if (inFlight >= room) return;
      if (!layer.tiles.has(t.key)) request(layer, t);
    }
    // The elevation tiles of the window being built come after the picture's.
    const next = layer.cast.next;
    if (next) {
      for (const t of next.tiles) {
        if (inFlight >= room) return;
        if (!layer.cast.tiles.has(t.key)) requestHeight(layer, t);
      }
    }
  }

  // --- CAST SHADOWS: the window of heights (see the head of this file) ----------------------------
  const _dir = new THREE.Vector3();
  const _invMesh = new THREE.Matrix4();

  function requestHeight(layer, t) {
    const cast = layer.cast;
    const url = tileUrl(layer.height.url, t.z, t.x, t.y);
    if (dead.has(url)) { cast.tiles.set(t.key, { state: 'dead', px: null }); return; }
    const abort = typeof AbortController === 'function' ? new AbortController() : null;
    const entry = { state: 'loading', px: null, abort };
    cast.tiles.set(t.key, entry);
    inFlight += 1;
    stats.requests += 1;
    stats.heightRequests += 1;
    let p;
    try { p = Promise.resolve(loadHeights(url, abort ? abort.signal : undefined)); } catch (e) { p = Promise.reject(e); }
    const fail = () => {
      // No shadows from a window with a hole in it: the ground is drawn as before.
      entry.state = 'dead';
      entry.abort = null;
      stats.failed += 1;
      dead.add(url);
      failsInRow += 1;
      if (failsInRow >= FAILS_TO_PAUSE) { pausedUntil = lastFrame + PAUSE_MS; failsInRow = 0; }
    };
    p.then((got) => {
      inFlight -= 1;
      if (cast.tiles.get(t.key) !== entry) return;
      if (!got || !got.pixels || got.pixels.length !== 256 * 256) { fail(); return; }
      entry.px = got.pixels;
      entry.state = 'ready';
      entry.abort = null;
      stats.bytes += got.bytes || 0;
      stats.heightBytes += got.bytes || 0;
      failsInRow = 0;
      pump(layer, lastFrame);
    }, (err) => {
      inFlight -= 1;
      if ((err && err.name === 'AbortError') || cast.tiles.get(t.key) !== entry) { stats.aborted += 1; return; }
      fail();
    });
  }

  function freeCast(layer) {
    const cast = layer && layer.cast;
    if (!cast) return;
    for (const e of cast.tiles.values()) if (e.abort) { try { e.abort.abort(); } catch { /* settled */ } }
    cast.tiles.clear();
    if (cast.tex) cast.tex.dispose();
    cast.tex = null;
    cast.win = null;
    cast.next = null;
    cast.fade = 0;
    if (layer.castU) { layer.castU.uHtOn.value = 0; layer.castU.uHtMap.value = blankRelief; }
    if (cast.showing) { cast.showing = false; try { onChange(); } catch { /* a listener's trouble */ } }
  }

  /** The window the view wants now, in the world mesh's own axes. */
  function castView(layer) {
    const mesh = layer.mesh;
    mesh.updateWorldMatrix(true, false);
    camera.getWorldPosition(_cam);
    _local.copy(_cam);
    mesh.worldToLocal(_local);
    camera.getWorldDirection(_dir);
    _invMesh.copy(mesh.matrixWorld).invert();
    _dir.transformDirection(_invMesh);
    const tanHalf = Math.tan(((camera.fov || 45) * Math.PI) / 360);
    return castWindowFor([_local.x, _local.y, _local.z], [_dir.x, _dir.y, _dir.z], tanHalf, camera.aspect || 1);
  }

  /** A share of the window's rows read from the elevation tiles; true when the last is done. */
  function castRows(layer, next) {
    const N = CAST.texels;
    const ht = layer.height;
    const z = next.z;
    const cast = layer.cast;
    // The window's tiles by column and row as one number: a string key a sample would cost a
    // million strings a window.
    if (!next.grid) {
      next.grid = new Map();
      for (const t of next.tiles) { const e = cast.tiles.get(t.key); if (e && e.state === 'ready') next.grid.set(t.y * 4096 + t.x, e.px); }
    }
    const grid = next.grid;
    let missing = null;
    const px = (zz, x, y) => { const t = grid.get(y * 4096 + x); if (!t && !missing) missing = { z: zz, x, y }; return t || null; };
    const w = next.w;
    const step = (2 * w.half) / N;
    // A share of the rows a frame: at least `rowsPerFrame`, more while the frame has had under CAST.budgetMs of it.
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    let j = next.row;
    for (; j < N; j++) {
      if (j - next.row >= CAST.rowsPerFrame && (typeof performance === 'undefined' || performance.now() - t0 > CAST.budgetMs)) break;
      // Row 0 of the texture is its v = 0 edge: the window's SOUTH (-north) side.
      const y = -w.half + (j + 0.5) * step;
      for (let i = 0; i < N; i++) {
        const x = -w.half + (i + 0.5) * step;
        const ll = castPointLonLat(w, x, y);
        const m = castSample(px, z, ll.lonDeg, ll.latDeg, ht);
        if (m === null) {
          // An elevation tile the window's corners missed (castTilesFor samples a grid of points):
          // add it, fetch it, and carry on from this row when it is here.
          next.row = j;
          if (!missing || next.tiles.length >= CAST.maxTiles + 12) return null;
          const key = tileKey(missing.z, missing.x, missing.y);
          if (!next.tiles.some((t) => t.key === key)) next.tiles.push({ ...missing, key });
          next.grid = null;
          return false;
        }
        next.km[j * N + i] = m / 1000;
      }
    }
    next.row = j;
    return j >= N;
  }

  /**
   * The window smoothed to its source's own sharpness, a share of it a frame: a box of `r` window
   * texels run twice along the rows, then twice down the columns (nearly a Gaussian), `r` the
   * source's texel (its north-south side, the longer one near a pole) over the window's. Without it
   * a close view magnifies 666 m texels into facets with straight edges, and near a pole, where the
   * map's texels are 2.7 km north to south and metres east to west, its shadows are radial streaks
   * (both seen in the first previews, 2026-10-16).
   */
  function castSmooth(layer, next) {
    const N = CAST.texels;
    const w = next.w;
    const winTexel = (2 * w.half) / N;
    const r = Math.min(CAST.smoothMax, Math.max(0, Math.round(castSourceTexel(next.z) / winTexel)));
    if (!next.blurred) next.blurred = 0;
    if (r < 1) { next.blurred = 2 * N; return; }
    const km = next.km;
    const line = new Float32Array(N);
    const box = (get, set) => {
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < N; i++) line[i] = get(i);
        let acc = 0;
        for (let i = -r; i <= r; i++) acc += line[Math.min(N - 1, Math.max(0, i))];
        for (let i = 0; i < N; i++) {
          set(i, acc / (2 * r + 1));
          acc += line[Math.min(N - 1, i + r + 1)] - line[Math.max(0, i - r)];
        }
      }
    };
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    let end = next.blurred;
    for (let k = next.blurred; k < 2 * N; k++) {
      if (k - next.blurred >= CAST.rowsPerFrame * 2 && (typeof performance === 'undefined' || performance.now() - t0 > CAST.budgetMs)) break;
      end = k + 1;
      if (k < N) { const o = k * N; box((i) => km[o + i], (i, v) => { km[o + i] = v; }); }
      else { const c = k - N; box((i) => km[i * N + c], (i, v) => { km[i * N + c] = v; }); }
    }
    next.blurred = end;
  }

  /** The window's heights as a half-float texture with its mipmaps (a mean of four, level by level). */
  function castTexture(km) {
    const N = CAST.texels;
    const toHalf = THREE.DataUtils.toHalfFloat;
    const half = (f) => { const u = new Uint16Array(f.length); for (let i = 0; i < f.length; i++) u[i] = toHalf(f[i]); return u; };
    const mipmaps = [{ data: half(km), width: N, height: N }];
    let f = km;
    for (let n = N >> 1; n >= 1; n >>= 1) {
      const g = new Float32Array(n * n);
      const m = n * 2;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const a = 2 * j * m + 2 * i;
        g[j * n + i] = 0.25 * (f[a] + f[a + 1] + f[a + m] + f[a + m + 1]);
      }
      mipmaps.push({ data: half(g), width: n, height: n });
      f = g;
    }
    const tex = new THREE.DataTexture(mipmaps[0].data, N, N, THREE.RedFormat, THREE.HalfFloatType);
    tex.mipmaps = mipmaps;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  /** The finished window on screen: its texture and its plane in the shared uniforms. */
  function castSwap(layer, next) {
    const cast = layer.cast;
    const u = layer.castU;
    const tex = castTexture(next.km);
    if (cast.tex) cast.tex.dispose();
    cast.tex = tex;
    cast.win = { ...next.w, z: next.z, keys: new Set(next.tiles.map((t) => t.key)) };
    cast.next = null;
    const w = next.w;
    const texel = (2 * w.half) / CAST.texels;
    const steps = castSteps();
    const first = Math.max(CAST.firstTexels * texel, CAST.firstMinRad);
    u.uHtMap.value = tex;
    u.uHtE.value.set(w.e[0], w.e[1], w.e[2]);
    u.uHtN.value.set(w.n[0], w.n[1], w.n[2]);
    u.uHtU.value.set(w.u[0], w.u[1], w.u[2]);
    u.uHtWin.value.set(1 / (2 * w.half), steps, first, castGrowth(first, steps));
    u.uHtMarch.value.set(texel, CAST.soft, (CAST.marginCounts * layer.height.metresPerCount) / 1000 / layer.radiusKm, CAST.depth);
    // The elevation tiles no window reads any more go; the HTTP cache has them if the view comes back.
    for (const key of [...cast.tiles.keys()]) if (!cast.win.keys.has(key)) cast.tiles.delete(key);
  }

  function castFrame(layer, layerWanted, dt) {
    const cast = layer.cast;
    const want = layerWanted && castWanted && castSteps() > 0 && allowed();
    if (want) {
      const v = castView(layer);
      // After a window with a missing tile, five seconds before another is tried.
      const resting = cast.failedAt !== undefined && lastFrame - cast.failedAt < 5000;
      if (v && !cast.next && !resting && castWindowStale(cast.win, v)) {
        const pick = castTilesFor(v, layer.height);
        cast.next = { w: v, z: pick.z, tiles: pick.tiles.map((t) => ({ ...t, key: tileKey(t.z, t.x, t.y) })), row: 0, blurred: 0, km: null };
      }
      const next = cast.next;
      if (next) {
        let ready = true;
        let dead_ = false;
        for (const t of next.tiles) {
          const e = cast.tiles.get(t.key);
          if (!e || e.state === 'loading') ready = false;
          else if (e.state === 'dead') dead_ = true;
        }
        if (dead_) { cast.next = null; cast.failedAt = lastFrame; }
        else if (ready) {
          if (!next.km) next.km = new Float32Array(CAST.texels * CAST.texels);
          if (next.row < CAST.texels) {
            if (castRows(layer, next) === null) { cast.next = null; cast.failedAt = lastFrame; }
          } else if (next.blurred < 2 * CAST.texels) {
            castSmooth(layer, next);
          } else castSwap(layer, next);
        }
      }
    }
    // The shadows fade in when a window is first there and out when the layer or the switch goes.
    const on = want && !!cast.tex;
    cast.fade = Math.min(1, Math.max(0, cast.fade + (on ? dt : -dt) / FADE_MS));
    if (layer.castU) {
      layer.castU.uHtOn.value = cast.fade * cast.fade * (3 - 2 * cast.fade) * layer.master;
      // The steps follow the tier as it changes.
      if (cast.tex) layer.castU.uHtWin.value.y = castSteps();
    }
    const showing = cast.fade > 0 && !!cast.tex;
    if (showing !== cast.showing) { cast.showing = showing; try { onChange(); } catch { /* a listener's trouble */ } }
    if (!want && cast.fade <= 0 && (cast.tex || cast.next || cast.tiles.size)) freeCast(layer);
  }

  function castState(layer) {
    const c = layer.cast;
    let ready = 0;
    let loading = 0;
    let deadN = 0;
    for (const e of c.tiles.values()) { if (e.state === 'ready') ready += 1; else if (e.state === 'loading') loading += 1; else deadN += 1; }
    return {
      wanted: castWanted, showing: c.showing, fade: Math.round(c.fade * 1000) / 1000,
      level: c.win ? c.win.z : null, halfKm: c.win ? Math.round(c.win.half * layer.radiusKm) : null,
      texelM: c.win ? Math.round((2 * c.win.half / CAST.texels) * layer.radiusKm * 1000) : null,
      steps: layer.castU ? layer.castU.uHtWin.value.y : 0,
      building: c.next ? { level: c.next.z, tiles: c.next.tiles.length, row: c.next.row, smoothed: c.next.blurred || 0 } : null,
      tiles: { ready, loading, dead: deadN },
    };
  }

  /** The traverses on a world whose tiles are up: built once the module is here, faded by distance. */
  function traverseFrame(layer, showing) {
    if (!showing) { if (layer.trav) layer.trav.hide(); return; }
    if (!traverseModule) {
      if (!traverseAsked) {
        traverseAsked = true;
        Promise.resolve().then(importTraverses).then((m) => { traverseModule = m; }, () => { /* no traverses: the sites are still there */ });
      }
      return;
    }
    if (!layer.trav) layer.trav = traverseModule.createTraverses({ world: layer.set.world });
    if (layer.trav.group.parent !== layer.mesh) layer.mesh.add(layer.trav.group);
    layer.mesh.updateWorldMatrix(true, false);
    camera.getWorldPosition(_cam);
    _local.copy(_cam);
    layer.mesh.worldToLocal(_local);
    const h = Math.max(1, Number(opts.viewport ? opts.viewport() : 800) || 800);
    const cssH = typeof innerHeight === 'number' && innerHeight > 0 ? innerHeight : h;
    const before = layer.trav.credits().length;
    layer.trav.frame(_local, layer.radiusKm || 1, [h * (camera.aspect || 1), h], h / cssH);
    if (layer.trav.credits().length !== before) { try { onChange(); } catch { /* a listener's trouble */ } }
  }

  function frameLayer(layer, nowMs, dt) {
    const set = layer.set;
    const mesh = allowed() && worlds ? worlds.meshFor(set.world) : null;
    // The Earth's own map is ready when its day slot is (scene/earth.js); a world's when worlds says so.
    const u0 = mesh && mesh.material ? mesh.material.uniforms : null;
    const usable = !!mesh && mesh.visible && !!u0
      && (u0.uDay ? !!u0.uHasDay && u0.uHasDay.value >= 1 : (!worlds.hasMap || worlds.hasMap(set.world)));
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
    if (layer.height) castFrame(layer, want, dt);
    if (want) pump(layer, nowMs);
    layer.master = Math.min(1, Math.max(0, layer.master + (want ? dt : -dt) / FADE_MS));
    let shown = 0;
    let reliefShown = false;
    for (const e of layer.tiles.values()) {
      if (e.state !== 'ready') continue;
      const on = layer.drawn.has(e.key);
      if (on) e.fadeV = Math.min(1, e.fadeV + dt / FADE_MS);
      if (e.relief && e.relief.state === 'ready') {
        e.reliefV = Math.min(1, e.reliefV + dt / FADE_MS);
        e.mesh.material.uniforms.uRelief.value.x = e.reliefV * e.reliefV * (3 - 2 * e.reliefV);
        if (on) reliefShown = true;
      }
      e.mesh.visible = on && layer.master > 0;
      // Smoothstep, so a tile neither starts nor lands with a jerk.
      const k = e.fadeV * e.fadeV * (3 - 2 * e.fadeV);
      e.fade.value = k * layer.master;
      if (e.mesh.visible) shown += 1;
    }
    const showing = shown > 0;
    reliefShown = reliefShown && showing;
    if (TRAVERSE_WORLDS.includes(set.world)) traverseFrame(layer, showing);
    if (showing !== layer.showing || reliefShown !== layer.reliefOn) {
      layer.showing = showing;
      layer.reliefOn = reliefShown;
      try { onChange(); } catch { /* a listener's trouble */ }
    }
  }

  /** Every tile off the screen and out of memory (the latch, or a quality that draws none). */
  function takeOff() {
    for (const layer of layers.values()) {
      const was = layer.showing;
      clear(layer);
      layer.showing = false;
      layer.reliefOn = false;
      if (was) { try { onChange(); } catch { /* a listener's trouble */ } }
    }
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
      takeOff();
    },
    /**
     * The visitor's own choice of quality (scene/quality.js qualityPlan; main.js keeps the real latch
     * away from here): any tier, up or down, and the latch's removal put on (`stripped`) or let go.
     * Below tier 1, or stripped, the tiles on screen are freed as the latch frees them; the caches of a
     * lower tier are smaller and empty themselves by their own rule.
     */
    setQuality(n, stripped = false) {
      tier = Math.max(0, Number(n) || 0);
      latched = !!stripped;
      if (latched || tier < 1) takeOff();
      return tier;
    },
    /** The credit lines of the mosaics on screen now, for the Sources panel. */
    credits() {
      const out = [];
      for (const layer of layers.values()) {
        if (layer.showing && layer.set.credit) out.push(layer.set.credit);
        if (layer.reliefOn && layer.relief.credit) out.push(layer.relief.credit);
        if (layer.cast.showing && layer.height.credit) out.push(layer.height.credit);
        if (layer.trav && layer.showing) out.push(...layer.trav.credits());
      }
      return out;
    },
    /**
     * The mosaics on screen now, for a world's card (ui/cards.js, internal #337): what the registry
     * row says each is, the finest level drawn and its metres per pixel, and the relief when it is in.
     */
    mosaics() {
      const out = [];
      for (const layer of layers.values()) {
        if (!layer.showing) continue;
        const set = layer.set;
        const finer = Math.max(0, (set.maxLevel || 0) - (layer.level === null ? set.maxLevel : layer.level));
        out.push({
          id: set.id, world: set.world, title: set.title, mode: set.mode || 'colour', level: layer.level,
          metresPerPixel: set.resolutionM ? set.resolutionM * 2 ** finer : null,
          relief: layer.reliefOn ? { title: layer.relief.title, gain: Number(layer.relief.gain) || 1 } : null,
          castShadows: layer.cast.showing ? {
            title: layer.height.title,
            words: COPY.r12Nearby && COPY.r12Nearby.castShadows ? COPY.r12Nearby.castShadows.replace('{title}', layer.height.title) : null,
          } : null,
          bakedRelief: set.bakedRelief === true,
        });
      }
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
          cached: ready, loading, relief: layer.reliefOn, reliefs: layer.reliefs.size,
          // The wanted tiles that are not on screen yet, and why: for a probe that asks what is stuck.
          waiting: layer.wanted.filter((t) => !layer.drawn.has(t.key)).slice(0, 8)
            .map((t) => t.key + ' ' + (layer.tiles.has(t.key) ? layer.tiles.get(t.key).state : dead.has(tileUrl(layer.set.url, t.z, t.x, t.y)) ? 'dead' : 'not asked')),
          levels: layer.wanted.reduce((m, t) => { m[t.z] = (m[t.z] || 0) + 1; return m; }, {}),
          cast: layer.height ? castState(layer) : null,
          traverses: layer.trav ? layer.trav.state() : null,
        };
      }
      return { tier, latched, saveData, inFlight, paused: lastFrame < pausedUntil, ...stats, sets: per };
    },
    dispose() { for (const layer of layers.values()) { clear(layer); if (layer.trav) layer.trav.dispose(); layer.trav = null; } },
  };
}

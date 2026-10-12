// scene/otherlight.js -- the sky in light an eye cannot see: infrared, microwaves, gamma rays
// (public #456; internal #283 the bands, #284 the crossfade, #286 the HiPS reader).
//
// Contract: createOtherLight(opts) -> { set(bandId | null), setMix(k), update(view), band(),
//             state(), dispose(), group }
//   opts: { parent, rot?: THREE.Matrix3, radius?: number, ground?: boolean, transparent?: boolean,
//           renderOrder?: number, bands?, base?, load?, saveData?, tileCap? }
//   view: { dirEq: [x, y, z], fovDeg, heightPx, aspect, strength? }
// Pure, for tests/test_otherlight.mjs: bandOf(id), skyUv(dirEq), stretch(v, gain)
//
// NOTHING AT BOOT. main.js and sky/groundsky.js import this file the first time a visitor picks a
// band in What to show; the picture of a band is fetched then, and a survey's own tiles only when
// the field has closed past what the picture can show. A first visit downloads none of it.
//
// TWO SKIES, ONE LAYER. `parent` is a frame whose axes are equatorial J2000 (scene/starfield.js's
// group, in orbit and on the ladder) or the ground's own (+Y up), with `rot` the matrix that turns
// the catalogue's frame into it (sky/groundsky.js's). Either way the layer is a sphere of
// directions around the camera, drawn after the Milky Way and before the stars.
//
// WHAT IS DRAWN.
//   the whole sky   one 2048 x 1024 picture per band, baked by scripts/build_otherlight.py from
//                   the survey's order-3 HiPS tiles, in equatorial J2000. The fragment shader
//                   turns each pixel's direction into right ascension and declination, so there
//                   is no seam to stitch and no pole to pinch.
//   the tiles       for a survey that goes deeper (WISE to order 8), the survey's own tiles from
//                   CDS over the picture, chosen by sky/hips.js from where the camera looks and
//                   how narrow the field is, held in a least-recently-used cache.
//
// THE CROSSFADE (#284). `setMix(k)`: 0 is the visible sky untouched, 1 the other light alone. The
// layer is drawn OVER the Milky Way with that opacity (not added to it), so at 1 the panorama is
// gone and in between the two are a true mix; the stars stay, because they are how a visitor
// keeps their bearings.
//
// HONESTY. Every band is a false-colour picture: the survey's own choice of which wavelength is
// shown as red, green and blue (registry/otherlight.yaml `colours`). `gain` is a display stretch,
// a look and not photometry. ui/otherlight.js says both where the band is chosen.

import * as THREE from '../../vendor/three.module.min.js';
import { OTHER_LIGHT } from '../data/otherlight.js';
import { tileGrid, tilesInCone, orderFor, tileUrl, frameToEq, eqToFrame, rotate, createLru } from '../sky/hips.js';

const DEG = Math.PI / 180;
const TILES_UNDER_FOV = 45;   // wider than this the baked picture is sharper than the screen
const TILE_REFRESH_MS = 300;
const TILE_PARALLEL = 4;
const TILES_PER_VIEW = 36;

export const bandOf = (id, bands = OTHER_LIGHT) => bands.find((b) => b.id === id) || null;

/** Where a J2000 direction is in a baked picture: u from RA 0 at the left, v from the south pole. Pure. */
export function skyUv(d) {
  const n = Math.hypot(d[0], d[1], d[2]) || 1;
  const ra = Math.atan2(d[1], d[0]);
  return { u: ((ra / (2 * Math.PI)) % 1 + 1) % 1, v: Math.asin(Math.max(-1, Math.min(1, d[2] / n))) / Math.PI + 0.5 };
}

/** The display stretch: 0 stays 0, 1 stays 1, the faint parts are lifted `gain` times. Pure. */
export function stretch(v, gain) {
  return (v * gain) / (1 + v * (gain - 1));
}

const VERT = /* glsl */ `
uniform mat3 uRot;
uniform float uRadius;
varying vec3 vDir;
varying vec2 vUv;
varying float vY;
void main() {
  vDir = position;
  vUv = uv;
  vec3 d = uRot * position;
  vY = d.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(d * uRadius, 1.0);
  // The depth test is off, so the depth is free; zero is inside every clip volume.
  gl_Position.z = 0.0;
}
`;

const FRAG_HEAD = /* glsl */ `
uniform sampler2D map;
uniform float uMix, uGain, uGround;
varying vec3 vDir;
varying vec2 vUv;
varying float vY;
vec4 shade(vec3 c) {
  c = (c * uGain) / (1.0 + c * (uGain - 1.0));
  // From the ground nothing of the sky is under the horizon, and the last degrees are air.
  float a = uMix * mix(1.0, smoothstep(-0.01, 0.06, vY), uGround);
  return vec4(c, a);
}
`;
const FRAG_SKY = /* glsl */ `${FRAG_HEAD}
void main() {
  vec3 d = normalize(vDir);
  vec2 uv = vec2(fract(atan(d.y, d.x) / 6.283185307179586), asin(clamp(d.z, -1.0, 1.0)) / 3.141592653589793 + 0.5);
  vec4 o = shade(texture2D(map, uv).rgb);
  if (o.a <= 0.002) discard;
  gl_FragColor = o;
}
`;
const FRAG_TILE = /* glsl */ `${FRAG_HEAD}
void main() {
  vec4 o = shade(texture2D(map, vUv).rgb);
  if (o.a <= 0.002) discard;
  gl_FragColor = o;
}
`;

export function createOtherLight(opts = {}) {
  const bands = opts.bands || OTHER_LIGHT;
  const base = opts.base || new URL('../../', import.meta.url);
  const loader = opts.load || ((url) => {
    const l = new THREE.TextureLoader();
    l.setCrossOrigin('anonymous');
    return l.loadAsync(url);
  });
  const renderOrder = Number.isFinite(opts.renderOrder) ? opts.renderOrder : -2.9;
  const group = new THREE.Group();
  group.name = 'other-light';
  if (opts.parent) opts.parent.add(group);
  let disposed = false;

  // One set of uniforms for the sphere and every tile: a slider move is one write.
  const shared = {
    uRot: { value: opts.rot || new THREE.Matrix3() },
    uRadius: { value: opts.radius || 1 },
    uMix: { value: 0 },
    uGain: { value: 1 },
    uGround: { value: opts.ground ? 1 : 0 },
  };
  const material = (frag) => new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: frag,
    uniforms: { map: { value: null }, ...shared },
    // In orbit the sky is in the OPAQUE list (scene/starfield.js says why: a transparent sky
    // paints over the Earth); a custom blend is honoured there. On the ground everything of the
    // sky is in the transparent list, in renderOrder.
    transparent: opts.transparent === true, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });

  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), material(FRAG_SKY));
  sphere.name = 'other-light-sky';
  sphere.frustumCulled = false;
  sphere.renderOrder = renderOrder;
  sphere.visible = false;
  group.add(sphere);

  let band = null;      // the registry row drawn now
  let wanted = null;    // the id asked for; the picture may still be on its way
  let mix = 1;
  let strength = 1;
  let skyTex = null;
  let state = 'idle';
  let asked = 0;

  // ---- the survey's own tiles -------------------------------------------------------------------
  const tiles = createLru(Number.isFinite(opts.tileCap) ? opts.tileCap : 72, (key, t) => {
    if (!t || !t.mesh) return;
    group.remove(t.mesh);
    t.mesh.geometry.dispose();
    t.mesh.material.dispose();
    if (t.tex) t.tex.dispose();
  });
  const pending = new Set();
  const failed = new Set();
  let tileAt = -Infinity;
  let tileOrder = 0;
  let tilesWanted = 0;
  const stats = { tileFetches: 0, tileBytesKnown: 0 };

  function clearTiles() {
    for (const k of tiles.keys()) { const t = tiles.get(k); tiles.delete(k); if (t && t.mesh) { group.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); if (t.tex) t.tex.dispose(); } }
    pending.clear();
    failed.clear();
  }

  function fetchTile(b, order, npix, key) {
    pending.add(key);
    stats.tileFetches += 1;
    let p;
    try { p = Promise.resolve(loader(tileUrl(b.base, order, npix, b.format))); } catch (e) { p = Promise.reject(e); }
    p.then((tex) => {
      pending.delete(key);
      if (disposed || band !== b) { if (tex && tex.dispose) tex.dispose(); return; }
      tex.colorSpace = THREE.NoColorSpace;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = false;
      tex.minFilter = tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      const g = tileGrid(order, npix, order >= 5 ? 2 : 4, b.frame === 'galactic' ? frameToEq('galactic') : null, 0.5 / (b.tile_width || 512));
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(g.positions, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(g.uvs, 2));
      geo.setIndex(new THREE.BufferAttribute(g.index, 1));
      const mat = material(FRAG_TILE);
      mat.uniforms.map.value = tex;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `other-light-tile-${order}-${npix}`;
      mesh.frustumCulled = false;
      mesh.renderOrder = renderOrder + 0.001 * (order + 1);
      mesh.visible = false;
      group.add(mesh);
      tiles.set(key, { mesh, tex, order, npix });
    }).catch(() => {
      // A survey has holes, and a tile that is not there is not an error: the picture under it stays.
      pending.delete(key);
      failed.add(key);
    });
  }

  function updateTiles(view, now) {
    const b = band;
    const streaming = !!(b && b.stream && !opts.saveData && view.fovDeg < TILES_UNDER_FOV && mix * strength > 0.02);
    if (!streaming) {
      if (tilesWanted) { for (const k of tiles.keys()) { const t = tiles.get(k); if (t) t.mesh.visible = false; } tilesWanted = 0; }
      return;
    }
    if (now - tileAt < TILE_REFRESH_MS) return;
    tileAt = now;
    const order = orderFor(view.fovDeg, view.heightPx || 800, b.tile_width || 512, 3, b.max_order || 3);
    tileOrder = order;
    const radius = (view.fovDeg / 2) * Math.hypot(1, view.aspect || 1.6) * DEG;
    const dir = rotate(eqToFrame(b.frame), view.dirEq);
    const want = tilesInCone(order, dir, radius, TILES_PER_VIEW);
    tilesWanted = want.length;
    const wantKeys = new Set();
    for (const npix of want) {
      const key = `${b.id}/${order}/${npix}`;
      wantKeys.add(key);
      if (tiles.has(key)) { tiles.get(key); continue; } // touched: it is the most recently used
      if (pending.has(key) || failed.has(key) || pending.size >= TILE_PARALLEL) continue;
      fetchTile(b, order, npix, key);
    }
    // What is drawn: the tiles of this order that the view asks for, over any coarser tile still
    // held (so a field that has just closed is not a hole while the finer tiles arrive).
    for (const k of tiles.keys()) {
      const t = tiles.get(k);
      if (!t) continue;
      t.mesh.visible = k.startsWith(`${b.id}/`) && (wantKeys.has(k) || t.order < order);
    }
  }

  // ---- the band ---------------------------------------------------------------------------------
  function set(id) {
    const next = id ? bandOf(id, bands) : null;
    const nextId = next ? next.id : null;
    if (nextId === wanted) return;
    wanted = nextId;
    const mine = ++asked;
    if (!next) {
      band = null;
      state = 'idle';
      sphere.visible = false;
      clearTiles();
      if (skyTex) { skyTex.dispose(); skyTex = null; sphere.material.uniforms.map.value = null; }
      return;
    }
    state = 'loading';
    const url = String(new URL(String(next.file).replace(/^site\//, ''), base));
    let p;
    try { p = Promise.resolve(loader(url)); } catch (e) { p = Promise.reject(e); }
    p.then((tex) => {
      if (disposed || mine !== asked) { if (tex && tex.dispose) tex.dispose(); return; }
      // Display values in, display values out, as the nebula pictures: no sRGB round trip.
      tex.colorSpace = THREE.NoColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      // No mipmaps: the shader's own right ascension jumps from 1 to 0 on one meridian, and a
      // mipmap would draw that jump as a line.
      tex.generateMipmaps = false;
      tex.minFilter = tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      clearTiles();
      if (skyTex) skyTex.dispose();
      skyTex = tex;
      band = next;
      sphere.material.uniforms.map.value = tex;
      shared.uGain.value = Number(next.gain) || 1;
      state = 'ready';
    }).catch((e) => {
      if (mine !== asked) return;
      state = 'failed';
      wanted = band ? band.id : null;
      console.warn('other light:', nextId, e && e.message ? e.message : e);
    });
  }

  function update(view = {}) {
    if (disposed) return;
    strength = Number.isFinite(view.strength) ? Math.min(1, Math.max(0, view.strength)) : 1;
    shared.uMix.value = mix * strength;
    sphere.visible = !!band && state !== 'idle' && !!skyTex && shared.uMix.value > 0.002;
    if (band && view.dirEq && Number.isFinite(view.fovDeg)) updateTiles(view, typeof performance !== 'undefined' ? performance.now() : Date.now());
  }

  return {
    set,
    setMix(k) { mix = Math.min(1, Math.max(0, Number(k) || 0)); },
    update,
    band: () => (band ? band.id : null),
    group,
    state: () => ({
      wanted, band: band ? band.id : null, state, mix, strength, drawn: sphere.visible,
      tiles: tiles.size(), tilesDrawn: tiles.keys().filter((k) => { const t = tiles.get(k); return t && t.mesh.visible; }).length,
      tileOrder, tilesWanted, pending: pending.size, failed: failed.size, tileFetches: stats.tileFetches,
    }),
    dispose() {
      disposed = true;
      clearTiles();
      if (skyTex) skyTex.dispose();
      sphere.geometry.dispose();
      sphere.material.dispose();
      if (opts.parent) opts.parent.remove(group);
    },
  };
}

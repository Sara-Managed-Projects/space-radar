// scene/galaxy.js -- the Milky Way as a place, and honestly a model (spec 0028 step 6).
//
// Contract: createGalaxy(scene, opts) -> { ensureGeometry, setVisible, setOpacity, setAndromedaShare,
//   rebuild, update, count, dispose, mode }
//
// site/data/galaxy.bin is a point cloud built by scripts/build-galaxy.py from PUBLISHED NUMBERS --
// Reid et al. 2019's fitted spiral arms and R0, the disc's measured size, the debated bar taken at
// the middle of its range -- and it is an ILLUSTRATION: nobody has seen our galaxy from outside.
// registry/models.yaml says so (`cls: illustrative`), the layer's sentence says so, and the record
// for the galaxy says so on its card. The stars around the Sun (scene/stars3d.js) are the measured
// layer; this is the shape they sit in.
//
// ANDROMEDA IS HER OWN (internal spec 0075 stage d, 2026-10-14). From 2026-09-22 Andromeda off her
// photograph's line was this same point cloud, moved and scaled: our galaxy's arms standing in for hers,
// and close up a blown-out copy of the Milky Way (the deep-space baseline's scenes 13 and 14). She is
// now drawn from her own published structure by scene/deep/spiral.js's generator: the coordinator's hero
// (scene/deep/deepsky.js) when she is large on screen, and below that THIS file's small copy of the same
// model (ANDROMEDA_FAR points, same pose, same exposure), fetched with the cloud and drawn wherever
// neither the hero nor her photograph is. The three share one number: what the photograph leaves
// (setAndromedaShare) the hero takes in proportion to its own share, and this copy the rest.
//
// THE MILKY WAY, EXPOSED BY ITS PROJECTED DENSITY (same stage). From outside it was white (scene 15):
// 140 000 additive points of one brightness pile up in the bulge. Each point is now a patch of light of
// a fixed size whose brightness on screen does not change with distance (held at its minimum size, its
// light is divided by the area it was given), its light is divided by the face-on density round it to
// the power STRETCH (a photograph's stretch, so the bulge is a few times brighter than the disc and not
// a hundred), and seen from outside the disc an edge-on view keeps only part of its longer path. The
// brightest face-on patch is normalised to PEAK.
//
// Static like the stars: one buffer, rebuilt only when the stage changes (140 292 conversions,
// float64, no allocation), and registry/lod.yaml fades it in as the camera leaves the stellar
// neighbourhood (`galaxy-model`). It is never drawn from a world stage: from Earth it would be a
// 2 MB download to paint a wisp behind the Moon, and the sky panorama already IS the view from here.

import * as THREE from '../../vendor/three.module.min.js';
import { stage, isLadderStage } from './stage.js';
import { eclDirection } from './clusters.js';
import { spread, defaultSchedule } from './spread.js';

export const KPC_KM = 30856775814913670; // one kiloparsec (1 pc = 3.0857e13 km; the first draft wrote the parsec here)
const HEADER = 12;
const STRIDE = 16;
const SUN_INERTIAL = 'sun-inertial';
// kind -> colour: disc pale, bulge warm, bar amber, arms blue-white (young stars)
const KIND_RGB = [
  [0.78, 0.80, 0.92],
  [1.0, 0.86, 0.66],
  [1.0, 0.78, 0.52],
  [0.72, 0.84, 1.0],
];

// Andromeda's place and size are the M31 row's (site/data/dso.json; test_galaxy checks they agree); her
// shape is registry/deepsky-heroes/m31.yaml's, with its sources, drawn by scene/deep/spiral.js.
export const ANDROMEDA = {
  id: 'dso-m31',
  raDeg: 10.68479,
  decDeg: 41.26906,
  distLy: 2540000,
  majAxArcmin: 177.83,    // OpenNGC, via the M31 row
};
// The far copy: few points, because below the hero's threshold she is at most a few hundred px across.
export const ANDROMEDA_FAR = { points: [5000, 8000, 8000], dust: 0.3, seed: 31 };

/**
 * What Andromeda's three drawings tell each other, every frame: how much her photograph is drawn
 * (main.js through setAndromedaShare), how much the hero is (scene/deep/spiral.js), and the shutter.
 */
export const ANDROMEDA_LINK = { photo: 0, heroShare: 0, exposure: 1 };

/** The diameter the M31 card prints: its major axis at its distance (data/parsers.js sizeLy). */
export function andromedaDiameterLy(g = ANDROMEDA) {
  return g.distLy * (g.majAxArcmin / 60) * (Math.PI / 180);
}

/** Andromeda's centre in sun-inertial km. Pure. */
export function andromedaKm(g = ANDROMEDA) {
  const a = g.raDeg * D2R, d = g.decDeg * D2R;
  const v = eqToSun([Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]);
  const r = g.distLy * LY_KM;
  return { x: v[0] * r, y: v[1] * r, z: v[2] * r };
}

const LY_KM = 9460730472580.8;
const OBLIQUITY = 23.4392911 * (Math.PI / 180);
const D2R = Math.PI / 180;
const eqToSun = (v) => [v[0], v[1] * Math.cos(OBLIQUITY) + v[2] * Math.sin(OBLIQUITY), -v[1] * Math.sin(OBLIQUITY) + v[2] * Math.cos(OBLIQUITY)];

// The Milky Way's exposure (the head of this file) is scene/deep/spiral.js's exposeByDensity, fetched
// with the cloud like Andromeda's model, so none of it is in the boot bytes.
const PATCH_KPC = 0.15;

// The model's point shaders are scene/deep/spiral.js's MW_SHADERS, fetched with the cloud (not boot bytes).

// --- the dust lanes (public #428) ------------------------------------------------------------------
//
// AN ILLUSTRATION, LABELLED AS ONE (the galaxy's card says so, data/layers.js). Every spiral seen
// from outside shows dark lanes of dust along the inner edges of its arms and, edge on, one dark
// line through the middle of its disc. Ours has not been mapped that way from where we sit, so
// nothing here is a measurement of the Milky Way's dust: the lanes are DERIVED from the model's own
// arm points, each DUST_EVERY-th one moved DUST_INSET_KPC towards the centre and flattened to
// DUST_FLATTEN of its height above the plane, and drawn as a patch that dims what is behind it.
// The plane is the real one: its pole is the IAU's north galactic pole, RA 12h 51.4m, Dec +27.13
// degrees (J2000; Wikipedia "Galactic coordinate system", read 2026-10-08).
//
// The three numbers are ours. No file: the lanes are made from galaxy.bin when it is built, and
// cost one more draw of a third of the arms' points.
export const NORTH_GALACTIC_POLE = { raDeg: 192.85, decDeg: 27.13 }; // 12h 51.4m = 192.85 degrees
export const DUST_EVERY = 3;
export const DUST_INSET_KPC = 0.35;
export const DUST_FLATTEN = 0.3;
export const DUST_DIM = 0.16;

/**
 * The dust patches' positions, in the model's own kiloparsecs. Pure.
 * @returns {{ posKpc: Float32Array, count: number, normal: number[] }}
 */
export function dustLanes(posKpc, kind, count, centreKpc, every = DUST_EVERY) {
  const n = eclDirection(NORTH_GALACTIC_POLE.raDeg, NORTH_GALACTIC_POLE.decDeg);
  const out = [];
  let seen = 0;
  for (let i = 0; i < count; i++) {
    if (kind[i] !== 3) continue;
    if (seen++ % every) continue;
    const x = posKpc[i * 3] - centreKpc[0], y = posKpc[i * 3 + 1] - centreKpc[1], z = posKpc[i * 3 + 2] - centreKpc[2];
    const h = x * n[0] + y * n[1] + z * n[2];
    const px = x - h * n[0], py = y - h * n[1], pz = z - h * n[2];
    const r = Math.hypot(px, py, pz);
    if (r < 1e-6) continue;
    const k = Math.max(0, r - DUST_INSET_KPC) / r;
    const hh = h * DUST_FLATTEN;
    out.push(centreKpc[0] + px * k + hh * n[0], centreKpc[1] + py * k + hh * n[1], centreKpc[2] + pz * k + hh * n[2]);
  }
  return { posKpc: new Float32Array(out), count: out.length / 3, normal: n };
}

const DUST_VERT = /* glsl */ `
uniform float uPixelRatio;
uniform float uUnitsPerKpc;
uniform float uPatchKpc;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  float dKpc = max( 1e-6, -mv.z / uUnitsPerKpc );
  gl_PointSize = clamp( uPatchKpc / dKpc * 900.0, 2.0, 9.0 ) * uPixelRatio;
}
`;
// Drawn with (0, 1 - alpha): the patch adds no light, it takes a share of what is there.
const DUST_FRAG = /* glsl */ `
uniform float uDust;
void main() {
  if ( uDust <= 0.0 ) discard;
  float d = length( gl_PointCoord - vec2( 0.5 ) );
  float a = 1.0 - smoothstep( 0.05, 0.5, d );
  if ( a <= 0.0 ) discard;
  gl_FragColor = vec4( 0.0, 0.0, 0.0, a * uDust );
}
`;

/** Parse the binary. Exported for the test. */
export function parseGalaxy(buffer) {
  const dv = new DataView(buffer);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'SRGX') throw new Error(`galaxy.bin: bad magic ${JSON.stringify(magic)}`);
  const version = dv.getUint32(4, true);
  const count = dv.getUint32(8, true);
  if (buffer.byteLength !== HEADER + count * STRIDE) throw new Error('galaxy.bin: length does not match its count');
  const posKpc = new Float32Array(count * 3);
  const kind = new Uint8Array(count);
  const weight = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const o = HEADER + i * STRIDE;
    posKpc[i * 3] = dv.getFloat32(o, true);
    posKpc[i * 3 + 1] = dv.getFloat32(o + 4, true);
    posKpc[i * 3 + 2] = dv.getFloat32(o + 8, true);
    kind[i] = dv.getUint8(o + 12);
    weight[i] = dv.getUint8(o + 13) / 255;
  }
  return { version, count, posKpc, kind, weight };
}

export function createGalaxy(scene, opts = {}) {
  const here = typeof import.meta !== 'undefined' ? import.meta.url : undefined;
  const src = opts.bin ?? (here ? new URL('../../data/galaxy.bin', here) : 'data/galaxy.bin');
  const group = new THREE.Group();
  group.name = 'galaxy';
  group.renderOrder = -1;
  if (scene) scene.add(group);

  let data = null;
  let geometry = null;
  let points = null;
  let layerOn = true;
  let opacity = 0;
  let builtFor = null;
  let loading = null;
  let norm = 1;            // exposeByDensity's gain: the brightest face-on patch at its PEAK
  let S = null;            // scene/deep/spiral.js, fetched with the cloud
  let centreKpc = [0, 0, 0];
  const uniforms = {
    uPixelRatio: { value: 1 }, uGain: { value: 0 }, uUnitsPerKpc: { value: 1 }, uPatchKpc: { value: PATCH_KPC },
    uViewH: { value: 900 }, uOutside: { value: 0 }, uNormalW: { value: new THREE.Vector3(0, 1, 0) },
  };
  let dustGeometry = null;
  let dustPoints = null;
  let dustKpc = null;
  const dustUniforms = { uPixelRatio: uniforms.uPixelRatio, uUnitsPerKpc: uniforms.uUnitsPerKpc, uPatchKpc: uniforms.uPatchKpc, uDust: { value: 0 } };
  // Andromeda off her photograph's line and below the hero's threshold (the head of this file).
  let far = null;
  let farLoading = null;
  let farPlacedFor = null;
  let farAxes = null;
  const farKm = andromedaKm();
  const tier = () => (Number.isFinite(opts.tier) ? opts.tier : 1);

  function ensureGeometry() {
    if (loading) return loading;
    loading = (opts.binBuffer
      ? Promise.resolve(opts.binBuffer)
      // `no-cache` = revalidate: the name never changes, the bytes do; unchanged, the answer is a 304.
      : fetch(String(src), { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(`${src}: HTTP ${r.status}`); return r.arrayBuffer(); }))
      .then((buf) => Promise.resolve(opts.spiral || import('./deep/spiral.js')).then((m) => { S = m; return buf; }))
      .then((buf) => {
        data = parseGalaxy(buf);
        // Built in pieces, one per turn (scene/spread.js): the points, the dust lanes, Andromeda,
        // then the positions. All in one task was the three-second stall on the galaxy rung.
        return spread([buildPoints, buildDust, buildAndromeda, () => { builtFor = null; rebuild(); }], opts.schedule || defaultSchedule).then(() => data);
      })
      .catch((err) => { console.warn('galaxy: could not load', err); loading = null; data = null; return null; });
    return loading;
  }

  /**
   * Fetch, build and compile ahead of the rung that draws it (main.js calls this on the stellar rung,
   * in an idle moment). The shaders are compiled with every part shown for one compile and put back,
   * so the first frame on the galaxy rung finds them ready. `renderer.compileAsync` waits for the
   * driver's parallel compile where it has one; without it nothing is compiled early and the first
   * frame pays as before.
   */
  function prewarm(renderer, camera) {
    return ensureGeometry().then(() => farLoading).then(() => {
      const d = data;
      if (!d || !renderer || !camera || typeof renderer.compileAsync !== 'function' || !scene) return d;
      const shown = [points, dustPoints, far && far.group].filter(Boolean);
      for (const p of shown) p.visible = true;
      return Promise.resolve(renderer.compileAsync(scene, camera)).catch(() => {}).then(() => { applyVisibility(); return d; });
    });
  }

  function bulgeCentre() {
    let cx = 0, cy = 0, cz = 0, nb = 0;
    for (let i = 0; i < data.count; i++) if (data.kind[i] === 1) { cx += data.posKpc[i * 3]; cy += data.posKpc[i * 3 + 1]; cz += data.posKpc[i * 3 + 2]; nb++; }
    return nb ? [cx / nb, cy / nb, cz / nb] : [0, 0, 0];
  }

  function buildPoints() {
    const n = data.count;
    centreKpc = bulgeCentre();
    const pole = eclDirection(NORTH_GALACTIC_POLE.raDeg, NORTH_GALACTIC_POLE.decDeg);
    const exposed = S.exposeByDensity(data.posKpc, data.weight, n, centreKpc, pole);
    norm = exposed.gain;
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geometry.setAttribute('aWeight', new THREE.BufferAttribute(exposed.weight, 1));
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const c = KIND_RGB[data.kind[i]] || KIND_RGB[0];
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    geometry.setAttribute('aColour', new THREE.BufferAttribute(col, 3));
    const material = new THREE.ShaderMaterial({
      vertexShader: S.MW_SHADERS.vert, fragmentShader: S.MW_SHADERS.frag, uniforms,
      transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    points = new THREE.Points(geometry, material);
    points.name = 'galaxy';
    points.frustumCulled = false;
    points.renderOrder = -1;
    group.add(points);
  }

  function buildDust() {
    // The dust lanes (dustLanes above): after the galaxy's own points and before everything else.
    dustKpc = dustLanes(data.posKpc, data.kind, data.count, centreKpc);
    dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(dustKpc.count * 3), 3));
    dustPoints = new THREE.Points(dustGeometry, new THREE.ShaderMaterial({
      vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, uniforms: dustUniforms,
      transparent: false, depthTest: false, depthWrite: false, toneMapped: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    }));
    dustPoints.name = 'galaxy:dust';
    dustPoints.frustumCulled = false;
    dustPoints.renderOrder = -0.9;
    group.add(dustPoints);
  }

  /** Andromeda's far copy: the generator and her profile are fetched now, never at boot. */
  function buildAndromeda() {
    if (farLoading || opts.andromeda === false) return;
    farLoading = import('../data/hero-m31.js').then((P) => {
      if (!data) return;
      const profile = P.HERO;
      const record = { id: ANDROMEDA.id, pos: farKm, meta: { sizeLy: andromedaDiameterLy(), posAngDeg: profile.frame && profile.frame.pa_deg } };
      const params0 = S.paramsFor(profile, record);
      farAxes = S.discAxes(farKm, params0.frame);
      const params = S.resolveSky(params0, farKm, farAxes);
      const t = Math.min(2, Math.max(0, Math.trunc(tier())));
      far = S.createGalaxyPoints(THREE, params, { count: ANDROMEDA_FAR.points[t], dust: ANDROMEDA_FAR.dust, seed: ANDROMEDA_FAR.seed, name: 'galaxy:andromeda' });
      group.add(far.group);
      farPlacedFor = null;
      placeAndromeda();
      applyVisibility();
    }).catch((err) => { console.warn('galaxy: Andromeda’s model did not load', err); far = null; });
  }
  function placeAndromeda() {
    if (!far || !isLadderStage(stage.worldId) || farPlacedFor === stage.worldId) return;
    if (far.place(farKm, farAxes, 'full')) farPlacedFor = stage.worldId;
  }

  const _km = { x: 0, y: 0, z: 0 };
  const _v = new THREE.Vector3();
  const _c = new THREE.Vector3();

  /** Positions for the current stage. Only a rung draws the model; on a world stage it is hidden. */
  function rebuild() {
    if (!data || !geometry) return;
    const key = stage.worldId;
    if (key === builtFor) return;
    builtFor = key;
    if (!isLadderStage(stage.worldId)) { applyVisibility(); return; }
    const tMs = stage.tMs;
    // One matrix for the whole cloud (stage.affineFrom, internal #549), the exact call per point where the stage bends positions.
    const A = stage.affineFrom(SUN_INERTIAL, tMs);
    const fill = (src, geo, count = data.count) => {
      const pos = geo.getAttribute('position').array;
      for (let i = 0; i < count; i++) {
        const kx = src[i * 3] * KPC_KM, ky = src[i * 3 + 1] * KPC_KM, kz = src[i * 3 + 2] * KPC_KM;
        if (A) {
          pos[i * 3] = A.o[0] + A.x[0] * kx + A.y[0] * ky + A.z[0] * kz;
          pos[i * 3 + 1] = A.o[1] + A.x[1] * kx + A.y[1] * ky + A.z[1] * kz;
          pos[i * 3 + 2] = A.o[2] + A.x[2] * kx + A.y[2] * ky + A.z[2] * kz;
          continue;
        }
        _km.x = kx; _km.y = ky; _km.z = kz;
        if (!stage.toSceneInto(_km, SUN_INERTIAL, _v, tMs)) { pos[i * 3] = pos[i * 3 + 1] = pos[i * 3 + 2] = 0; continue; }
        pos[i * 3] = _v.x; pos[i * 3 + 1] = _v.y; pos[i * 3 + 2] = _v.z;
      }
      geo.getAttribute('position').needsUpdate = true;
    };
    fill(data.posKpc, geometry);
    if (dustGeometry && dustKpc) fill(dustKpc.posKpc, dustGeometry, dustKpc.count);
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30 * KPC_KM / stage.unitKm);
    uniforms.uUnitsPerKpc.value = KPC_KM / stage.unitKm;
    // The galactic pole and centre in the scene, for the edge-on term (update below).
    const pole = eclDirection(NORTH_GALACTIC_POLE.raDeg, NORTH_GALACTIC_POLE.decDeg);
    if (A) {
      uniforms.uNormalW.value.set(A.x[0] * pole[0] + A.y[0] * pole[1] + A.z[0] * pole[2], A.x[1] * pole[0] + A.y[1] * pole[1] + A.z[1] * pole[2], A.x[2] * pole[0] + A.y[2] * pole[1] + A.z[2] * pole[2]).normalize();
      const kx = centreKpc[0] * KPC_KM, ky = centreKpc[1] * KPC_KM, kz = centreKpc[2] * KPC_KM;
      _c.set(A.o[0] + A.x[0] * kx + A.y[0] * ky + A.z[0] * kz, A.o[1] + A.x[1] * kx + A.y[1] * ky + A.z[1] * kz, A.o[2] + A.x[2] * kx + A.y[2] * ky + A.z[2] * kz);
    }
    placeAndromeda();
    applyVisibility();
  }

  let exposure = 1;
  function applyVisibility() {
    const on = layerOn && opacity > 0 && isLadderStage(stage.worldId);
    if (points) points.visible = on;
    if (dustPoints) dustPoints.visible = on;
    // By the model's opacity alone: dust is not light, and the shutter does not brighten it.
    dustUniforms.uDust.value = DUST_DIM * opacity;
    uniforms.uGain.value = opacity * exposure * norm;
    ANDROMEDA_LINK.exposure = exposure;
    if (far) {
      // What her photograph and her hero leave (scene/deep/spiral.js), at the model's opacity.
      far.setShare(on ? opacity * (1 - ANDROMEDA_LINK.photo) * (1 - ANDROMEDA_LINK.heroShare) : 0, exposure);
    }
  }
  /**
   * The shutter (scene/exposure.js `milkyWay`: 0.55 Eye, 1 Camera, 1.7 Deep): the model is the same
   * faint light as the panorama it takes over from, and wears the same number (internal #343).
   */
  function setExposure(k) { exposure = Number.isFinite(k) && k > 0 ? k : 1; applyVisibility(); }
  function setVisible(on) { layerOn = on !== false; applyVisibility(); if (layerOn && opacity > 0 && isLadderStage(stage.worldId)) ensureGeometry(); }
  /** registry/lod.yaml's `galaxy-model` hook, 0..1. */
  function setOpacity(k) {
    opacity = Math.min(1, Math.max(0, Number(k) || 0));
    applyVisibility();
    if (layerOn && opacity > 0 && isLadderStage(stage.worldId)) ensureGeometry();
  }
  /** 1 = the models draw Andromeda; 0 = her photograph does (scene/nebulae.js drawn), and they wait. */
  function setAndromedaShare(k) {
    ANDROMEDA_LINK.photo = 1 - Math.min(1, Math.max(0, Number(k)));
    applyVisibility();
  }
  const _cam = new THREE.Vector3();
  function update(camera, renderer) {
    if (!points) return;
    const dpr = renderer && typeof renderer.getPixelRatio === 'function' ? Math.min(2, Math.max(0.5, renderer.getPixelRatio())) : 1;
    uniforms.uPixelRatio.value = dpr;
    const h = renderer && renderer.domElement ? renderer.domElement.height : 0;
    if (h > 0) uniforms.uViewH.value = h;
    if (camera) {
      // Outside the disc (past about twice its radius from the centre) an edge-on view is compressed.
      _cam.setFromMatrixPosition(camera.matrixWorld);
      const kpc = _cam.distanceTo(_c) / Math.max(1e-30, uniforms.uUnitsPerKpc.value);
      const t = Math.min(1, Math.max(0, (kpc - 16) / 14));
      uniforms.uOutside.value = t * t * (3 - 2 * t);
    }
    if (far) {
      placeAndromeda();
      applyVisibility();
      if (far.group.visible) far.update(camera, uniforms.uViewH.value, dpr, tier());
    }
  }
  function dispose() {
    if (geometry) geometry.dispose();
    if (points && points.material) points.material.dispose();
    if (dustGeometry) dustGeometry.dispose();
    if (dustPoints && dustPoints.material) dustPoints.material.dispose();
    if (far) far.dispose();
    far = null; farLoading = null;
    dustGeometry = null; dustPoints = null; dustKpc = null;
    if (scene) scene.remove(group);
    data = null; geometry = null; points = null; builtFor = null; loading = null;
  }
  return {
    ensureGeometry, prewarm, setVisible, setOpacity, setExposure, setAndromedaShare, rebuild, update, dispose, group,
    count: () => (data ? data.count : null),
    dustCount: () => (dustKpc ? dustKpc.count : null),
    /** Andromeda's far copy, once fetched: {points, dust, share} (null before). */
    andromeda: () => (far ? { ...far.stats(), share: far.share() } : null),
    andromedaReady: () => farLoading || Promise.resolve(),
    exposureGain: () => norm,
    mode: () => (points && points.visible ? 'drawn' : 'hidden'),
  };
}

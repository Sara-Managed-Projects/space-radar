// sky/groundpictures.js -- the photographs of the nebulae and galaxies, in the sky from the ground
// (internal #393 finding 6, #345; row 17 of the Stellarium table in docs/research).
//
// Contract: createGroundPictures(env) -> { update(frame, m9, limit), labels(out, m9, limit, fovDeg),
//             pickEq(dirEq), state(), dispose() }
//   env: { root, radius, eqToLocal (THREE.Matrix3, shared with the stars), renderOrder,
//          rows?, base?, load?, nameOf?(id), magOf?(id), exposure?(), cap?, saveData? }
// Pure, for tests/test_groundpictures.mjs: pictureThreshold(vmag), pictureStrength(o), pictureHit(row, dirEq)
//
// Loaded by sky/groundsky.js when the browser is idle after the sky view has opened: none of this
// is on a first visit, and none of it is needed for the first sky.
//
// WHY ITS OWN FILE. scene/nebulae.js lays the same 27 pictures (registry/nebulae.yaml) on the
// orbital scene's star sphere and at their places on the ladder. From the ground that sphere is
// under the sky view's veil, with no air and no horizon, so until this file a visitor who looked
// up at Orion saw no nebula. Here each picture is a small grid on the ground sky's own sphere, in
// the catalogue's frame, turned with the stars by the same matrix and lifted by the same air.
//
// HOW FAINT. These are long exposures of faint things; drawn at full strength in a wide field they
// would be the lie scene/exposure.js exists not to tell. So a picture's strength is a MODEL with
// three parts, and the sky view's honesty line says so:
//   the sky     the limiting magnitude sky/skymath.js already works out (how dark the place is,
//               the Moon, twilight, how far the field has closed) against the object's own
//               magnitude: Andromeda and the Orion Nebula come in a dark wide field, the Crab
//               needs binoculars' field, and in a city none of them shows until a telescope's.
//   the size    nothing under about ten pixels wide: a picture appears as you zoom.
//   the air     dimmed and reddened by its air mass, gone at the horizon.
// And the shutter (Eye, Camera, Deep) stretches what is left, exactly as it does in space: with
// "Eye" the brightest cores are grey smudges, which is what an eye at a telescope sees.
//
// GPU MEMORY (#345). A picture is fetched when it is 32 px wide in view, at most two at a time,
// and at most `cap` are kept: the one seen longest ago is disposed when another arrives.

import * as THREE from '../../vendor/three.module.min.js';
import { NEBULAE } from '../data/nebulae.js';
import { pictureBasis, pictureHalfExtent } from '../scene/nebulae.js';
import { GLSL_AIR, airmass, extinctionTint, refractionDeg } from './skymath.js';

const DEG = Math.PI / 180;
const WANT_PX = 32;
const SHOW_FROM_PX = 10;
const SHOW_FULL_PX = 40;
const EXT_K = 0.2;
const PARALLEL = 2;

const smooth = (x, a, b) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

/**
 * The limiting magnitude at which an object's picture begins to show. A nebula's catalogue
 * magnitude is its whole light spread over its whole area, so it needs a sky about a magnitude
 * deeper than a star of the same number; nothing shows before the naked-eye limit of a
 * suburb, and an object with no magnitude (a dark nebula) is taken as a faint one.
 */
export function pictureThreshold(vmag) {
  const m = Number.isFinite(vmag) ? vmag : 8.5;
  return Math.min(10, Math.max(5.5, m + 1));
}

/** 0..1: how strongly a picture is drawn. `o` = { limit, vmag, widthPx, altDeg }. Pure. */
export function pictureStrength(o) {
  if (!(o.altDeg > -0.5)) return 0;
  const thr = pictureThreshold(o.vmag);
  const sky = smooth(o.limit, thr - 0.5, thr + 1.5);
  const size = smooth(o.widthPx, SHOW_FROM_PX, SHOW_FULL_PX);
  const air = Math.pow(10, -0.4 * EXT_K * (airmass(Math.max(0, o.altDeg)) - 1));
  return sky * size * air;
}

/**
 * Whether a J2000 direction falls on a picture: its place in the picture (u, v in -1..1) when it
 * is inside the feathered oval the shader draws, else null. Pure.
 */
export function pictureHit(row, dirEq) {
  const { centre, right, up } = pictureBasis(row);
  const along = dirEq[0] * centre[0] + dirEq[1] * centre[1] + dirEq[2] * centre[2];
  if (!(along > 1e-6)) return null;
  const h = pictureHalfExtent(row);
  const u = (dirEq[0] * right[0] + dirEq[1] * right[1] + dirEq[2] * right[2]) / along / h.x;
  const v = (dirEq[0] * up[0] + dirEq[1] * up[1] + dirEq[2] * up[2]) / along / h.y;
  return Math.hypot(u, v) <= 0.9 ? { u, v } : null;
}

const VERT = /* glsl */ `
uniform mat3 uEqToLocal;
uniform vec3 uCentre, uRight, uUp;
uniform float uAir, uRadius;
varying vec2 vUv;
varying float vY;
${GLSL_AIR}
void main() {
  vUv = uv;
  // A camera's picture is a plane seen from the middle of the sphere: each corner of the grid is a
  // direction, turned to the ground's frame and lifted by the air like the stars around it.
  vec3 e = normalize(uCentre + uRight * position.x + uUp * position.y);
  vec3 d = airLift(uEqToLocal * e, uAir);
  vY = d.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(d * uRadius, 1.0);
}
`;

// The stretch and the feather are scene/nebulae.js's, so one shutter means one thing in both skies.
const FRAG = /* glsl */ `
uniform sampler2D map;
uniform float uAlpha, uGain, uGamma, uSaturation;
uniform vec3 uTint;
varying vec2 vUv;
varying float vY;
void main() {
  if (uAlpha <= 0.0) discard;
  vec3 c = pow(texture2D(map, vUv).rgb, vec3(uGamma)) * uGain;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l) * vec3(0.86, 0.96, 1.0), c, uSaturation);
  vec2 q = abs(vUv * 2.0 - 1.0);
  float e = pow(pow(q.x, 3.0) + pow(q.y, 3.0), 1.0 / 3.0);
  float f = 1.0 - smoothstep(0.5, 0.98, e);
  float air = smoothstep(-0.005, 0.03, vY);
  gl_FragColor = vec4(c * uTint * (f * f * uAlpha * air), 1.0);
}
`;

export function createGroundPictures(env) {
  const rows = env.rows || NEBULAE;
  const R = env.radius;
  const base = env.base || new URL('../../', import.meta.url);
  const loader = env.load || ((url) => new THREE.TextureLoader().loadAsync(url));
  const cap = Number.isFinite(env.cap) ? env.cap : 8;
  const shared = { uGain: { value: 1 }, uGamma: { value: 1 }, uSaturation: { value: 1 } };
  const geometry = new THREE.PlaneGeometry(2, 2, 4, 4);
  const group = new THREE.Group();
  group.name = 'ground-pictures';
  env.root.add(group);
  let disposed = false;
  let loading = 0;
  let tick = 0;

  const pictures = rows.map((row) => {
    const basis = pictureBasis(row);
    const half = pictureHalfExtent(row);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: {
        uEqToLocal: { value: env.eqToLocal },
        uCentre: { value: new THREE.Vector3(...basis.centre) },
        uRight: { value: new THREE.Vector3(...basis.right).multiplyScalar(half.x) },
        uUp: { value: new THREE.Vector3(...basis.up).multiplyScalar(half.y) },
        uAir: { value: 1 }, uRadius: { value: R },
        map: { value: null }, uAlpha: { value: 0 }, uTint: { value: new THREE.Vector3(1, 1, 1) },
        ...shared,
      },
      transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.name = `ground-picture-${row.id}`;
    mesh.frustumCulled = false;
    mesh.renderOrder = env.renderOrder;
    mesh.visible = false;
    group.add(mesh);
    return {
      row, basis, mesh, widthDeg: row.width_arcmin / 60, heightDeg: row.height_arcmin / 60,
      radiusDeg: Math.hypot(row.width_arcmin, row.height_arcmin) / 120,
      tex: null, state: 'idle', seen: 0, strength: 0, widthPx: 0, altDeg: -90, local: null, inView: false,
    };
  });

  function drop(p) {
    if (p.tex) p.tex.dispose();
    p.tex = null;
    p.mesh.material.uniforms.map.value = null;
    p.mesh.visible = false;
    p.state = 'idle';
  }

  function fetchPicture(p) {
    if (p.state !== 'idle' || loading >= PARALLEL || disposed) return;
    p.state = 'loading';
    loading += 1;
    const url = String(new URL(String(p.row.file).replace(/^site\//, ''), base));
    let asked;
    try { asked = Promise.resolve(loader(url)); } catch (err) { asked = Promise.reject(err); }
    asked.then((tex) => {
      loading -= 1;
      if (disposed) { if (tex && tex.dispose) tex.dispose(); return; }
      // Display values in, display values out (FRAG), as scene/nebulae.js: no sRGB decode.
      tex.colorSpace = THREE.NoColorSpace;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
      p.tex = tex;
      p.mesh.material.uniforms.map.value = tex;
      p.state = 'ready';
      p.seen = tick;
      // Over the cap: the picture seen longest ago goes, never one in view.
      const held = pictures.filter((q) => q.state === 'ready');
      if (held.length > cap) {
        const old = held.filter((q) => !q.inView).sort((a, b) => a.seen - b.seen)[0];
        if (old) drop(old);
      }
    }).catch((err) => {
      loading -= 1;
      p.state = 'failed';
      console.warn('ground pictures:', p.row.id, err && err.message ? err.message : err);
    });
  }

  const _fwd = new THREE.Vector3();
  const _d = new THREE.Vector3();
  const _q = new THREE.Quaternion();

  /**
   * Per frame. `m9` is sky/skybodies.js eqjToLocal's matrix, `limit` the limiting magnitude the
   * stars were drawn with, `frame` sky/groundsky.js's own (camera, fovDeg, renderer).
   */
  function update(frame, m9, limit, pxPerDeg, viewGroup) {
    if (disposed) return;
    tick += 1;
    const look = typeof env.exposure === 'function' ? env.exposure() : null;
    if (look) {
      shared.uGain.value = Number(look.nebulaGain);
      shared.uGamma.value = Number(look.nebulaGamma);
      shared.uSaturation.value = Number(look.nebulaSaturation);
    }
    // Where the visitor looks, in the ground's own frame, and how far from there anything shows.
    frame.camera.getWorldDirection(_fwd);
    _fwd.applyQuaternion(_q.copy(viewGroup.quaternion).invert());
    const aspect = frame.camera.aspect || 1.6;
    const reachDeg = (frame.fovDeg / 2) * Math.hypot(1, aspect) + 1;
    for (const p of pictures) {
      const c = p.basis.centre;
      const l = [
        m9[0] * c[0] + m9[1] * c[1] + m9[2] * c[2],
        m9[3] * c[0] + m9[4] * c[1] + m9[5] * c[2],
        m9[6] * c[0] + m9[7] * c[1] + m9[8] * c[2],
      ];
      const trueAlt = Math.asin(Math.max(-1, Math.min(1, l[1]))) / DEG;
      p.altDeg = trueAlt + refractionDeg(trueAlt);
      const ca = Math.cos(p.altDeg * DEG);
      const hl = Math.hypot(l[0], l[2]) || 1;
      p.local = [l[0] / hl * ca, Math.sin(p.altDeg * DEG), l[2] / hl * ca];
      const off = Math.acos(Math.max(-1, Math.min(1, _d.set(p.local[0], p.local[1], p.local[2]).dot(_fwd)))) / DEG;
      p.inView = off < reachDeg + p.radiusDeg && p.altDeg > -p.radiusDeg;
      p.widthPx = p.widthDeg * pxPerDeg;
      p.strength = p.inView ? pictureStrength({ limit, vmag: env.magOf ? env.magOf(p.row.id) : NaN, widthPx: p.widthPx, altDeg: p.altDeg }) : 0;
      if (p.inView && p.state === 'ready') p.seen = tick;
      if (p.inView && p.state === 'idle' && !env.saveData && p.widthPx >= WANT_PX && p.strength > 0.02) fetchPicture(p);
      const u = p.mesh.material.uniforms;
      u.uAlpha.value = p.strength;
      const tint = extinctionTint(Math.max(0, p.altDeg));
      u.uTint.value.set(tint[0], tint[1], tint[2]);
      p.mesh.visible = p.strength > 0.004 && p.state === 'ready';
    }
  }

  return {
    update,
    /**
     * The names worth showing now, as sky/groundsky.js label candidates: a picture that is drawn,
     * or one a field or two away from showing, so a visitor knows where zooming pays.
     */
    labels(out, limit, pxPerDeg) {
      for (const p of pictures) {
        if (!p.inView || !p.local || p.altDeg < 0.5) continue;
        const vmag = env.magOf ? env.magOf(p.row.id) : NaN;
        if (limit < pictureThreshold(vmag) - 1.5) continue;
        const text = env.nameOf ? env.nameOf(p.row.id) : p.row.id;
        if (!text) continue;
        out.push({ kind: 'dso', text, local: p.local, pri: 470 - (Number.isFinite(vmag) ? vmag : 9) * 10, dy: Math.max(8, (p.heightDeg * pxPerDeg) / 2 * 0.7 + 4) });
      }
      return out;
    },
    /** The picture under a J2000 direction, smallest first (a tap wants the thing, not its field): `dso-<id>` or null. */
    pickEq(dirEq) {
      let best = null;
      for (const p of pictures) {
        if (!p.inView || p.widthPx < SHOW_FROM_PX) continue;
        if (!(p.strength > 0.05) && p.widthPx < 24) continue;
        if (!pictureHit(p.row, dirEq)) continue;
        if (!best || p.widthDeg < best.widthDeg) best = p;
      }
      return best ? `dso-${best.row.id}` : null;
    },
    state: () => pictures.map((p) => ({ id: p.row.id, state: p.state, strength: p.strength, widthPx: Math.round(p.widthPx), altDeg: p.altDeg, inView: p.inView, drawn: p.mesh.visible })),
    held: () => pictures.filter((p) => p.state === 'ready').length,
    dispose() {
      disposed = true;
      for (const p of pictures) { if (p.tex) p.tex.dispose(); p.mesh.material.dispose(); }
      geometry.dispose();
      env.root.remove(group);
    },
  };
}

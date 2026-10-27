// sky/groundpictures.js -- the nebulae and galaxies in the sky from the ground, as soft glows of their measured size
// (internal #393 finding 6, #345; row 17 of the Stellarium table in docs/research; release 1.4.0 stage r14-neb-b).
//
// Contract: createGroundPictures(env) -> { update(frame, m9, limit), labels(out, m9, limit, fovDeg),
//             pickEq(dirEq), frameOf(id), state(), held(), dispose() }
//   env: { root, radius, eqToLocal (THREE.Matrix3, shared with the stars), renderOrder,
//          rows?, recordOf?(id), nameOf?(id), magOf?(id), exposure?() }
// Pure, for tests/test_groundpictures.mjs: pictureThreshold(vmag), pictureStrength(o), pictureHit(row, dirEq), glowShape(row, record)
//
// Loaded by sky/groundsky.js when the browser is idle after the sky view has opened: none of this
// is on a first visit, and none of it is needed for the first sky.
//
// NO PHOTOGRAPHS (Ivan, 2026-10-26: "no photos only realistic 3ds"). Until release 1.4.0 each of the 30
// objects of registry/nebulae.yaml was its photograph here, laid on the ground sky's sphere. From the ground
// a 3D model at hundreds of light-years is a point, so each is now what scene/dsoglow.js draws in space: a
// soft glow as long and as wide as the catalogue says, turned as it says, coloured by what the thing is
// (glowFor), at the catalogue's place. No file is fetched. The registry's rows still say where to frame each
// one (frameOf) and what a tap on it finds (pickEq); the sky view's names are unchanged.
//
// HOW FAINT. These are faint things; drawn at full strength in a wide field they would be the lie
// scene/exposure.js exists not to tell. So a glow's strength is a MODEL with three parts:
//   the sky     the limiting magnitude sky/skymath.js already works out (how dark the place is,
//               the Moon, twilight, how far the field has closed) against the object's own
//               magnitude: Andromeda and the Orion Nebula come in a dark wide field, the Crab
//               needs binoculars' field, and in a city none of them shows until a telescope's.
//   the size    nothing under about ten pixels wide: a glow appears as you zoom.
//   the air     dimmed and reddened by its air mass, gone at the horizon.
// And the shutter (Eye, Camera, Deep) stretches what is left: with "Eye" it is a grey smudge.

import * as THREE from '../../vendor/three.module.min.js';
import { NEBULAE } from '../data/nebulae.js';
import { pictureBasis, pictureHalfExtent, ellipseInPicture, eclToEq } from '../scene/nebulae.js';
import { glowFor } from '../scene/dsoglow.js';
import { GLSL_AIR, airmass, extinctionTint, refractionDeg } from './skymath.js';

const DEG = Math.PI / 180;
const SHOW_FROM_PX = 10;
const SHOW_FULL_PX = 40;
const EXT_K = 0.2;
const GLOW_COLOUR = [1.0, 0.92, 0.86]; // a record not landed yet, or one dsoglow.js gives no glow of its own

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

/**
 * The glow's ellipse in the picture's own coordinates (scene/nebulae.js ellipseInPicture) and its colour, from
 * the deep-sky record: its catalogue axes and angle where it has them, round at its major axis where it has only
 * that, and a circle of a third of the frame before the record has landed. Pure.
 */
export function glowShape(row, record) {
  const m = record && record.meta ? record.meta : null;
  const g = record ? glowFor(record) : null;
  // A dark nebula (the Horsehead) gives off no light, so it gets no glow; Andromeda, which dsoglow.js leaves to her
  // model in space, glows here as a galaxy does.
  const dark = !!(m && m.typeCode === 'DrkN');
  const colour = g && g.colour ? g.colour.slice(0, 3) : dark ? [0, 0, 0] : m && m.kind === 'galaxy' ? [1.0, 0.92, 0.82] : GLOW_COLOUR;
  const p = record && record.pos ? record.pos : null;
  const l = p ? Math.hypot(p.x, p.y, p.z) : 0;
  const maj = m && m.majAxArcmin > 0 ? m.majAxArcmin : 0;
  if (maj > 0 && l > 0) {
    const e = eclToEq([p.x / l, p.y / l, p.z / l]);
    const ra = (Math.atan2(e[1], e[0]) / DEG + 360) % 360, dec = Math.asin(Math.max(-1, Math.min(1, e[2]))) / DEG;
    const min = m.minAxArcmin > 0 ? Math.min(maj, m.minAxArcmin) : maj;
    const ell = ellipseInPicture(row, ra, dec, maj, min, Number.isFinite(m.posAngDeg) ? m.posAngDeg : 0);
    if (ell) return { ell, colour };
  }
  const k = 1 / (Math.min(row.width_arcmin, row.height_arcmin) / 3 / 2);
  return { ell: { u: 0.5, v: 0.5, x: [k * row.width_arcmin, 0], y: [0, k * row.height_arcmin] }, colour };
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

// A soft glow on the catalogue's ellipse (r = 1 at its edge): a bright middle, a gentle shoulder, gone by
// 1.6 times the catalogue's size, and the frame feathered as before so no edge is ever a line. The shutter's
// stretch and saturation as scene/dsoglow.js and the deep-sky heroes wear them.
const FRAG = /* glsl */ `
uniform float uAlpha, uGain, uGamma, uSaturation;
uniform vec3 uTint, uColour;
uniform vec2 uEllC, uEllX, uEllY;
varying vec2 vUv;
varying float vY;
void main() {
  if (uAlpha <= 0.0) discard;
  vec2 d = vUv - uEllC;
  float r = length(vec2(dot(uEllX, d), dot(uEllY, d)));
  float g = (0.55 * exp(-6.0 * r * r) + 0.45 * exp(-1.8 * r * r)) * (1.0 - smoothstep(0.9, 1.6, r));
  vec3 c = uColour * pow(g, uGamma) * 0.6 * uGain;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l) * vec3(0.86, 0.96, 1.0), c, uSaturation);
  vec2 q = abs(vUv * 2.0 - 1.0);
  float e = pow(pow(q.x, 3.0) + pow(q.y, 3.0), 1.0 / 3.0);
  float f = 1.0 - smoothstep(0.7, 0.99, e);
  float air = smoothstep(-0.005, 0.03, vY);
  gl_FragColor = vec4(c * uTint * (f * uAlpha * air), 1.0);
}
`;

export function createGroundPictures(env) {
  const rows = env.rows || NEBULAE;
  const R = env.radius;
  const shared = { uGain: { value: 1 }, uGamma: { value: 1 }, uSaturation: { value: 1 } };
  const geometry = new THREE.PlaneGeometry(2, 2, 4, 4);
  const group = new THREE.Group();
  group.name = 'ground-pictures';
  env.root.add(group);
  let disposed = false;

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
        uAlpha: { value: 0 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uColour: { value: new THREE.Vector3(...GLOW_COLOUR) },
        uEllC: { value: new THREE.Vector2(0.5, 0.5) }, uEllX: { value: new THREE.Vector2(3, 0) }, uEllY: { value: new THREE.Vector2(0, 3) },
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
      shaped: false, strength: 0, widthPx: 0, altDeg: -90, local: null, inView: false,
    };
  });

  /** The glow's shape and colour from its record, once the record has landed (sky/groundsky.js dsoRecord). */
  function shape(p) {
    if (p.shaped) return;
    const record = typeof env.recordOf === 'function' ? env.recordOf(p.row.id) : null;
    const { ell, colour } = glowShape(p.row, record);
    const u = p.mesh.material.uniforms;
    u.uEllC.value.set(ell.u, ell.v); u.uEllX.value.set(ell.x[0], ell.x[1]); u.uEllY.value.set(ell.y[0], ell.y[1]);
    u.uColour.value.set(colour[0], colour[1], colour[2]);
    p.shaped = !!record;
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
    const look = typeof env.exposure === 'function' ? env.exposure() : null;
    if (look) {
      shared.uGain.value = Number(look.milkyWay);
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
      if (p.inView && p.strength > 0.004) shape(p);
      const u = p.mesh.material.uniforms;
      u.uAlpha.value = p.strength;
      const tint = extinctionTint(Math.max(0, p.altDeg));
      u.uTint.value.set(tint[0], tint[1], tint[2]);
      p.mesh.visible = p.strength > 0.004;
    }
  }

  return {
    update,
    /**
     * The names worth showing now, as sky/groundsky.js label candidates: a glow that is drawn,
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
    /** The field of view that frames a picture (three times its longer side, never under a third of a degree), and its place. */
    frameOf(id) {
      const p = pictures.find((q) => q.row.id === id);
      if (!p) return null;
      const side = Math.max(p.row.width_arcmin, p.row.height_arcmin) / 60;
      return { raDeg: p.row.ra_deg, decDeg: p.row.dec_deg, fovDeg: Math.max(0.33, Math.min(40, side * 3)) };
    },
    state: () => pictures.map((p) => ({ id: p.row.id, strength: p.strength, widthPx: Math.round(p.widthPx), altDeg: p.altDeg, inView: p.inView, drawn: p.mesh.visible, shaped: p.shaped })),
    /** Textures held on the GPU: none, since there are no photographs (0078 r14-neb-b). */
    held: () => 0,
    dispose() {
      disposed = true;
      for (const p of pictures) p.mesh.material.dispose();
      geometry.dispose();
      env.root.remove(group);
    },
  };
}

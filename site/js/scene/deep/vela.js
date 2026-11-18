// scene/deep/vela.js -- the Vela pulsar's wind nebula as Chandra and a fit to it show it: two tori of X-ray light, one above
// and one below the pulsar's equator, a pair of jets along its spin axis, and the pulsar (the deep-space review of
// 2026-11-16, idea 8). Fetched by scene/deep/deepsky.js when the nebula is near (scene/deep/heroes.js); never at boot.
// scene/deep/helix.js says what a hero answers:
//   createHero(THREE, env) -> { group, levels, setLevel(level, share), frame(info), ready(), stats(), card, dispose() }
// Pure, for tests/test_vela.mjs: torusOf, ringFrame, setOf, thetaTorus, lookFor, UNDER_MEASURED, COPY_BLOCK, DRAWN.
//
// WHAT IS MEASURED (registry/deepsky-heroes/vela.yaml holds every number). Ng & Romani 2004 (ApJ 601, 479) fitted a thin
// torus to Chandra's X-ray picture of this nebula, two of them spaced symmetrically above and below the pulsar, and
// got: the axis' position angle 130.63 degrees, its tilt 63.60 degrees from our line of sight, the tori's radius 21.25
// arcseconds, their thickness (fixed in the fit) 3.0 arcseconds, the flow speed that brightens their near side, 0.44 of
// light's, and the tori's separation on the sky, 11.61 arcseconds. Ng & Romani 2008 (ApJ 673, 411) added the systematic
// errors, which dominate for Vela (the tilt +/- 0.6 degrees, the radius +/- 0.5 arcseconds). The jets' speed, 0.45 of
// light's, is Pavlov and others' (2003) jet spectrum as Ng & Romani 2004 turn it into a speed.
// WHAT IS MODELLED. Which end of the axis is toward us (the fit's sign is not stated in the papers' text: taken as the
// north-western-facing convention scene/deep/crab.js uses), the jets' LENGTH and brightness along it (the real jet
// bends and changes from year to year, Ng & Romani 2008), and the dots a torus is made of (a seeded scatter: the
// fit is a smooth emissivity, not points).
// WHAT IS ILLUSTRATIVE. The colour: X-rays are not light an eye sees; they are drawn violet-blue.
//
// HOW IT IS DRAWN. One call (scene/deep/softpoints.js): soft additive points, each brightened or dimmed by the Doppler
// factor of its flow toward the CAMERA, so the tori's near side is the bright one and the pattern changes as the view
// turns. The sky frame (x west, y north, z toward the Sun) is placed at the record; lengths are light-years.
import { stage } from '../stage.js';
import { drawnUnder } from '../exposure.js';
import { placeSky } from './skyplace.js';
import { pointsMesh, packPoints, seeded, cameraIn } from './softpoints.js';
import '../../copy/en.deepdata.js'; // the card's words (deepVela), fetched with the hero

export const COPY_BLOCK = 'deepVela';
export const DRAWN = { 'dso-vela-pulsar-wind-nebula': ['reconstruction', 'model'] };
/** Under the Measured look the jets (their length is modelled) and the scatter's extra detail go; the fitted tori stay. */
export const UNDER_MEASURED = { tori: 'same', jets: 'hidden', pulsar: 'same' };
const D2R = Math.PI / 180;
const ARCSEC = D2R / 3600;
const part = (P, k) => ((P && P.layers) || []).find((l) => l && l.part === k) || {};
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

/** A fitted torus' frame in the sky frame from its position angle and tilt (Ng & Romani 2004's x', y', z'): as crab.js. Pure. */
export function ringFrame(paDeg, inclDeg) {
  const pa = paDeg * D2R, incl = inclDeg * D2R;
  const axis = norm([-Math.sin(pa) * Math.sin(incl), Math.cos(pa) * Math.sin(incl), Math.cos(incl)]);
  const e1 = norm([Math.cos(pa), Math.sin(pa), 0]);
  return { axis, e1, e2: cross(axis, e1) };
}

/**
 * The tori in light-years: radius, thickness (the fit's blur), each torus' offset along the axis (half the separation
 * seen from the pulsar: the sky separation d is the axis' length times sin(tilt)), the flow's speed and the axis.
 * Pure.
 */
export function torusOf(profile) {
  const t = part(profile, 'tori');
  const dist = num(profile && profile.frame && profile.frame.distance_ly, 959);
  const F = ringFrame(num(t.pa_deg, 0), num(t.incl_deg, 0));
  const ly = (arcsec) => arcsec * ARCSEC * dist;
  const sinZ = Math.sin(num(t.incl_deg, 0) * D2R);
  return {
    ...F, distanceLy: dist, beta: num(t.beta, 0.44), gamma: num(t.photon_index, 1.5),
    rLy: ly(num(t.r_arcsec, 20)), blurLy: ly(num(t.blur_arcsec, 3)),
    halfSepLy: ly(num(t.sep_arcsec, 0)) / (2 * Math.max(0.05, sinZ)),
  };
}

/** Where on the torus' sphere the two tori sit, as a co-latitude in degrees: atan(2 r sin(tilt) / d) (Ng & Romani 2004). Pure. */
export function thetaTorus(profile) {
  const t = part(profile, 'tori');
  return Math.atan2(2 * num(t.r_arcsec, 20) * Math.sin(num(t.incl_deg, 0) * D2R), num(t.sep_arcsec, 1)) / D2R;
}

/**
 * The nebula as points about the pulsar, light-years: `points` a torus' share each of two tori (a Gaussian tube of
 * the fit's thickness round the circle, the flow radial in the torus' plane), the jets along the axis (modelled
 * length) and the pulsar. Returns packPoints' set plus { tori, count }. Pure.
 */
export function setOf(profile, { detail = 1 } = {}) {
  const T = torusOf(profile);
  const tp = part(profile, 'tori'), jt = part(profile, 'jets'), pl = part(profile, 'pulsar');
  const lk = part(profile, 'look');
  const rnd = seeded(num(lk.seed, 833));
  const gauss = () => { const u = Math.max(1e-9, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const colX = (Array.isArray(lk.colour) ? lk.colour : [0.56, 0.58, 1]).map(Number);
  const list = [];
  const n = Math.round(num(tp.points, 900) * (0.5 + 0.5 * detail));
  for (const sign of [1, -1]) {
    for (let i = 0; i < n; i++) {
      const ph = rnd() * 2 * Math.PI, c = Math.cos(ph), s = Math.sin(ph);
      const radial = add([T.e1[0] * c, T.e1[1] * c, T.e1[2] * c], T.e2, s);
      const rr = T.rLy + gauss() * T.blurLy, zz = sign * T.halfSepLy + gauss() * T.blurLy;
      list.push({ p: add([radial[0] * rr, radial[1] * rr, radial[2] * rr], T.axis, zz), v: radial, size: Math.max(T.blurLy * 2.2, T.rLy * 0.05), beta: T.beta, amp: num(tp.amp, 1), col: colX, kind: 'torus' });
    }
  }
  const len = num(jt.length_r, 2.4) * T.rLy, from = num(jt.from_r, 0.4) * T.rLy, nj = Math.round(num(jt.points, 300) * (0.5 + 0.5 * detail));
  const u = norm(cross(T.axis, [0, 1, 0])), w = cross(T.axis, u);
  for (const sign of [1, -1]) {
    for (let i = 0; i < nj; i++) {
      const t = rnd(), z = from + (len - from) * t, wide = num(jt.width_r, 0.12) * T.rLy * (0.5 + 1.2 * t);
      const p = add(add([T.axis[0] * z * sign, T.axis[1] * z * sign, T.axis[2] * z * sign], u, gauss() * wide * 0.5), w, gauss() * wide * 0.5);
      list.push({ p, v: [T.axis[0] * sign, T.axis[1] * sign, T.axis[2] * sign], size: wide * 1.6, beta: num(jt.beta, 0.45), amp: num(jt.amp, 0.5) * (1 - 0.6 * t), col: colX, kind: 'jet' });
    }
  }
  list.push({ p: [0, 0, 0], v: [0, 0, 1], size: num(pl.size_r, 0.1) * T.rLy, beta: 0, amp: num(pl.amp, 3), col: [1, 1, 1], kind: 'pulsar' });
  return { ...packPoints(list), kinds: list.map((q) => q.kind), tori: T };
}

/** The look's switches: the jets' length is modelled, so the Measured look takes them off. Pure. */
export function lookFor(chosen) {
  const look = chosen || 'film';
  return { tori: drawnUnder(look, UNDER_MEASURED.tori) ? 1 : 0, jets: drawnUnder(look, UNDER_MEASURED.jets) ? 1 : 0, pulsar: drawnUnder(look, UNDER_MEASURED.pulsar) ? 1 : 0 };
}

export function createHero(THREE, env = {}) {
  const profile = env.profile || {};
  const group = new THREE.Group();
  group.name = 'deep-hero-vela';
  const sky = new THREE.Group();
  sky.name = `${group.name}-sky`;
  sky.matrixAutoUpdate = false;
  group.add(sky);
  let basisFor = null;
  const q0 = typeof env.quality === 'function' ? env.quality() || {} : {};
  const detail = q0.tier >= 1 && !q0.latched ? 1 : 0.5;
  const set = setOf(profile, { detail });
  // The Measured look hides the jets: three draws are not needed, so a second set holds only the rest.
  const keep = (k) => set.kinds.map((x, i) => (x === k ? i : -1)).filter((i) => i >= 0);
  const sub = (idx) => {
    const o = { pos: new Float32Array(idx.length * 3), vel: new Float32Array(idx.length * 3), size: new Float32Array(idx.length), beta: new Float32Array(idx.length), amp: new Float32Array(idx.length), col: new Float32Array(idx.length * 3), count: idx.length };
    idx.forEach((i, j) => { o.pos.set(set.pos.subarray(i * 3, i * 3 + 3), j * 3); o.vel.set(set.vel.subarray(i * 3, i * 3 + 3), j * 3); o.size[j] = set.size[i]; o.beta[j] = set.beta[i]; o.amp[j] = set.amp[i]; o.col.set(set.col.subarray(i * 3, i * 3 + 3), j * 3); });
    return o;
  };
  const fitted = pointsMesh(THREE, sub([...keep('torus'), ...keep('pulsar')]), { name: 'vela-fit', minPx: num(part(profile, 'look').min_px, 1.6) });
  const jets = pointsMesh(THREE, sub(keep('jet')), { name: 'vela-jets', minPx: num(part(profile, 'look').min_px, 1.6) });
  for (const p of [fitted, jets]) { p.material.uniforms.uIndex.value = 1 + set.tori.gamma; sky.add(p.mesh); }
  let level = 0, levelShare = 0, last = { jets: 1 };
  const _inv = new THREE.Matrix4(), _id = new THREE.Matrix4(), _cam = new THREE.Vector3();
  const viewH = () => ((typeof globalThis.innerHeight === 'number' && globalThis.innerHeight) || 800) * Math.min(2, (typeof globalThis.devicePixelRatio === 'number' && globalThis.devicePixelRatio) || 1);
  return {
    group,
    levels: [2, 3],
    latchSafe: true, // two instanced draws of about two thousand points
    card: { copy: COPY_BLOCK, drawn: DRAWN },
    setLevel(n, share = 1) {
      level = n;
      levelShare = n >= 2 ? clamp(share, 0, 1) : 0;
      group.visible = levelShare > 0;
    },
    frame(info = {}) {
      if (basisFor !== stage.worldId) { basisFor = stage.worldId; placeSky(THREE, sky, env.record, stage); }
      const lk = lookFor(info.look);
      const gain = clamp(Number.isFinite(info.gain) ? info.gain : 1, 0.6, 1.6) * num(part(profile, 'look').gain, 1);
      const vh = viewH();
      for (const [p, on] of [[fitted, lk.tori], [jets, lk.jets]]) {
        p.material.uniforms.uShare.value = levelShare * on;
        p.material.uniforms.uGain.value = gain;
        p.material.uniforms.uViewH.value = vh;
        p.mesh.visible = levelShare * on > 0.002;
      }
      if (info.camera) {
        cameraIn(group, sky, info.camera, _cam, _inv, _id);
        fitted.material.uniforms.uCam.value.copy(_cam);
        jets.material.uniforms.uCam.value.copy(_cam);
      }
      last = { jets: lk.jets };
    },
    ready: () => true,
    stats: () => ({ level, share: Math.round(levelShare * 100) / 100, meshes: 2, textures: 0, points: set.count, jets: last.jets, bytes: fitted.bytes + jets.bytes }),
    dispose() {
      fitted.geometry.dispose(); fitted.material.dispose(); jets.geometry.dispose(); jets.material.dispose();
      if (group.parent) group.parent.remove(group);
    },
  };
}

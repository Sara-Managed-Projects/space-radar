// scene/deep/catseye.js -- the Cat's Eye Nebula (NGC 6543) from its published morpho-kinematic model: an inner ellipsoid,
// a bipolar outer shell, an equatorial ring, two partial rings and two ansae (the deep-space review of 2026-11-16, idea
// 14). Fetched by scene/deep/deepsky.js when the nebula is near (scene/deep/heroes.js); never at boot.
// scene/deep/helix.js says what a hero answers:
//   createHero(THREE, env) -> { group, levels, setLevel(level, share), frame(info), ready(), stats(), card, dispose() }
// Pure, for tests/test_catseye.mjs: frameOf, setOf, ringArc, arcsecLy, lookFor, UNDER_MEASURED, COPY_BLOCK, DRAWN.
//
// WHAT IS MEASURED (registry/deepsky-heroes/catseye.yaml holds every number). Clairmont, Steffen & Koning 2022 (MNRAS,
// arXiv:2209.01313) built a 3D model of the nebula in the code SHAPE from Hubble's [N II] picture and five
// position-velocity diagrams, and found: the SHAPES (an inner prolate ellipsoid, an outer shell of two nearly spherical
// lobes, an equatorial ring, two ansae on the axis, two jets whose axis is 26 degrees off it) and the two PARTIAL RINGS
// round the outer shell, point-symmetric to each other, each the base of a cone of half-opening 38 degrees whose axis is
// 17 degrees from the nebula's, open over 300 of the 360 degrees (a precessing jet that never finished a turn); the
// SPEEDS (the outer shell 33.5 km/s at its poles and 25 at its waist, the equatorial ring 24, the ansae 44, the
// jets 72, the partial rings about 20: every part moving straight out, "homologous"); and the distance, 1.31 kpc from Gaia
// (Chornay & Walton 2021). The north end of the axis comes toward us and the south end goes away (their section 3.1).
// WHAT SPACE RADAR READ OFF HUBBLE'S PICTURE (heic0414a, the same nebula the model was fitted to): the axis' position angle
// (the two ansae lie within a degree of north-south) and the SIZES of the parts, in arcseconds from the star. The paper
// publishes its model as pictures, not as a table of sizes; these are read to about a tenth, and the card says so.
// WHAT IS MODELLED. The axis' tilt (the paper says only "slightly tilted"), where the partial rings' gaps lie and
// which way their cone tilts, the jets' direction round the axis, and every dot (a seeded scatter of points on each
// surface; the model is a mesh). ILLUSTRATIVE: the colours (Hubble's own false colour, the picture's makers'; the model
// has none).
//
// HOW IT IS DRAWN. One call (scene/deep/softpoints.js): soft additive points on each surface, so a shell seen along its
// skin is brighter than one seen face on, and the camera may go inside. The sky frame (x west, y north, z toward the Sun)
// is placed at the record.
import { stage } from '../stage.js';
import { drawnUnder } from '../exposure.js';
import { placeSky, axisOnSky } from './skyplace.js';
import { pointsMesh, packPoints, seeded, cameraIn } from './softpoints.js';
import '../../copy/en.deepdata.js'; // the card's words (deepCatsEye), fetched with the hero

export const COPY_BLOCK = 'deepCatsEye';
export const DRAWN = { 'dso-cats-eye-nebula': ['reconstruction', 'model'] };
/** Under the Measured look the colours (Hubble's false colour, which the model does not have) go to grey; shapes stay. */
export const UNDER_MEASURED = { shells: 'same', rings: 'same', ansae: 'same', colour: 'hidden' };
const D2R = Math.PI / 180;
const ARCSEC = D2R / 3600;
const part = (P, k) => ((P && P.layers) || []).find((l) => l && l.part === k) || {};
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);

/** Light-years in an arcsecond at a distance. Pure. */
export const arcsecLy = (distLy) => distLy * ARCSEC;

/**
 * The nebula's own frame in the sky frame: `up` the axis' end that comes toward us (the north end), `e1`, `e2` across it.
 * The axis lies `incl` degrees from our line of sight; its far end points to position angle `pa`. Pure.
 */
export function frameOf(profile) {
  const ax = part(profile, 'axis');
  const far = axisOnSky(num(ax.incl_deg, 80), num(ax.pa_deg, 181));
  const up = norm([-far[0], -far[1], -far[2]]);
  const e1 = norm(cross(up, [0, 0, 1])), e2 = cross(up, e1);
  return { up, e1, e2, distanceLy: num(profile && profile.frame && profile.frame.distance_ly, 4272) };
}

/** A partial ring: `n` points round a cone of half-opening `alphaDeg` about an axis `betaDeg` off `up`, slant `L`, open over `spanDeg`. Pure. */
export function ringArc(F, { L, alphaDeg, betaDeg, spanDeg, tiltAzDeg = 0, startDeg = 0 }, n, jitter = () => 0) {
  const ca = Math.cos(alphaDeg * D2R), sa = Math.sin(alphaDeg * D2R), cb = Math.cos(betaDeg * D2R), sb = Math.sin(betaDeg * D2R);
  const az = tiltAzDeg * D2R;
  // the cone's axis: `up` tipped by beta toward the azimuth
  const tip = add(scale(F.e1, Math.cos(az)), F.e2, Math.sin(az));
  const axis = norm(add(scale(F.up, cb), tip, sb));
  const u = norm(cross(axis, F.e2)), w = cross(axis, u);
  const out = [];
  for (let i = 0; i < n; i++) {
    const th = (startDeg + (i / Math.max(1, n - 1)) * spanDeg) * D2R;
    const dir = add(add(scale(axis, ca), u, sa * Math.cos(th)), w, sa * Math.sin(th));
    out.push(scale(norm(add(dir, [jitter(), jitter(), jitter()], 0.02)), L));
  }
  return out;
}

/** The profile's points about the star, light-years, in the sky frame. Pure: { ...packPoints, kinds, frame }. */
export function setOf(profile, { detail = 1 } = {}) {
  const F = frameOf(profile);
  const k = arcsecLy(F.distanceLy);
  const lk = part(profile, 'look');
  const rnd = seeded(num(lk.seed, 6543));
  const gauss = () => { const u = Math.max(1e-9, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const at = (x, y, z) => add(add(scale(F.e1, x * k), F.e2, y * k), F.up, z * k); // arcsec in the nebula's frame -> ly in the sky frame
  const n = (c) => Math.max(8, Math.round(c * (0.5 + 0.5 * detail)));
  const col = lk.colours || {};
  const C = (key, d) => (Array.isArray(col[key]) ? col[key].map(Number) : d);
  const list = [];
  const sphere = () => { const z = 2 * rnd() - 1, ph = 2 * Math.PI * rnd(), r = Math.sqrt(1 - z * z); return [r * Math.cos(ph), r * Math.sin(ph), z]; };
  const push = (p, kind, size, amp, c) => list.push({ p, v: [0, 0, 1], size: size * k, beta: 0, amp, col: c, kind });

  const sh = part(profile, 'outer'), inn = part(profile, 'inner'), eq = part(profile, 'equatorial'), pr = part(profile, 'partial_rings'), an = part(profile, 'ansae'), jt = part(profile, 'jets');
  // the outer shell: two nearly spherical lobes joined at the waist; a lobe's surface is the half of its sphere on its own side
  const R = num(sh.lobe_radius_arcsec, 10.7), c0 = num(sh.lobe_centre_arcsec, 4.7);
  for (const sign of [1, -1]) {
    let made = 0;
    const want = n(num(sh.points, 1800));
    while (made < want) {
      const s = sphere();
      if (s[2] * sign < 0) continue;
      push(at(R * s[0], R * s[1], sign * c0 + R * s[2]), 'outer', num(sh.size_arcsec, 0.55), num(sh.amp, 0.5), C('outer', [0.95, 0.62, 0.88]));
      made++;
    }
  }
  // the inner shell: a prolate ellipsoid, nested inside
  const ia = num(inn.semi_axis_arcsec, 5.9), ib = num(inn.semi_across_arcsec, 4.7);
  for (let i = 0, m = n(num(inn.points, 1400)); i < m; i++) {
    const s = sphere();
    push(at(ib * s[0], ib * s[1], ia * s[2]), 'inner', num(inn.size_arcsec, 0.4), num(inn.amp, 0.7), C('inner', [0.58, 0.78, 1]));
  }
  // the equatorial ring of knots at the waist
  for (let i = 0, m = n(num(eq.points, 500)); i < m; i++) {
    const ph = rnd() * 2 * Math.PI, r = num(eq.radius_arcsec, 8.5) + gauss() * num(eq.tube_arcsec, 0.7);
    push(at(r * Math.cos(ph), r * Math.sin(ph), gauss() * num(eq.tube_arcsec, 0.7)), 'ring', num(eq.size_arcsec, 0.5), num(eq.amp, 0.9), C('ring', [1, 0.64, 0.3]));
  }
  // the two partial rings, point-symmetric to each other (the south one is the north one through the star)
  const arc = { L: num(pr.slant_arcsec, 12), alphaDeg: num(pr.half_opening_deg, 38), betaDeg: num(pr.tilt_deg, 17), spanDeg: num(pr.span_deg, 300), tiltAzDeg: num(pr.tilt_azimuth_deg, 0), startDeg: num(pr.gap_after_deg, 30) };
  const nr = n(num(pr.points, 700));
  const north = ringArc(F, arc, nr, () => gauss()); // arcseconds, sky frame
  north.forEach((p, i) => {
    const tube = num(pr.tube_arcsec, 0.6);
    const q = add(p, [gauss() * tube, gauss() * tube, gauss() * tube]);
    list.push({ p: scale(q, k), v: [0, 0, 1], size: num(pr.size_arcsec, 0.55) * k, beta: 0, amp: num(pr.amp, 1), col: C('ring', [1, 0.64, 0.3]), kind: 'partial' });
    list.push({ p: scale(q, -k), v: [0, 0, 1], size: num(pr.size_arcsec, 0.55) * k, beta: 0, amp: num(pr.amp, 1), col: C('ring', [1, 0.64, 0.3]), kind: 'partial' });
  });
  // the ansae: a clump on the axis beyond each lobe
  for (const sign of [1, -1]) {
    for (let i = 0, m = n(num(an.points, 160)); i < m; i++) {
      push(at(gauss() * num(an.width_arcsec, 1.1), gauss() * num(an.width_arcsec, 1.1), sign * num(an.at_arcsec, 21.5) + gauss() * num(an.length_arcsec, 1.8)), 'ansa', num(an.size_arcsec, 0.6), num(an.amp, 1.1), C('ansa', [1, 0.5, 0.26]));
    }
  }
  // the jets: knots along an axis 26 degrees off the nebula's, out to 19 arcseconds (their length is the paper's)
  const jb = num(jt.tilt_deg, 26) * D2R, jaz = num(jt.azimuth_deg, 90) * D2R;
  const jdir = [Math.sin(jb) * Math.cos(jaz), Math.sin(jb) * Math.sin(jaz), Math.cos(jb)];
  for (const sign of [1, -1]) {
    for (let i = 0, m = n(num(jt.points, 120)); i < m; i++) {
      const t = num(jt.from_arcsec, 12) + rnd() * (num(jt.to_arcsec, 19) - num(jt.from_arcsec, 12));
      push(at(sign * jdir[0] * t + gauss() * 0.4, sign * jdir[1] * t + gauss() * 0.4, sign * jdir[2] * t), 'jet', num(jt.size_arcsec, 0.5), num(jt.amp, 0.9), C('jet', [1, 0.45, 0.3]));
    }
  }
  list.push({ p: [0, 0, 0], v: [0, 0, 1], size: 0.35 * k, beta: 0, amp: num(lk.star_amp, 3), col: [1, 1, 1], kind: 'star' });
  return { ...packPoints(list), kinds: list.map((q) => q.kind), frame: F };
}

/** The look's switches: the colours are illustrative, so the Measured look takes them to grey. Pure. */
export function lookFor(chosen) {
  const look = chosen || 'film';
  return { mono: drawnUnder(look, UNDER_MEASURED.colour) ? 0 : 1 };
}

export function createHero(THREE, env = {}) {
  const profile = env.profile || {};
  const group = new THREE.Group();
  group.name = 'deep-hero-catseye';
  const sky = new THREE.Group();
  sky.name = `${group.name}-sky`;
  sky.matrixAutoUpdate = false;
  group.add(sky);
  let basisFor = null;
  const q0 = typeof env.quality === 'function' ? env.quality() || {} : {};
  const detail = q0.tier >= 1 && !q0.latched ? 1 : 0.5;
  const set = setOf(profile, { detail });
  const pts = pointsMesh(THREE, set, { name: 'catseye', minPx: num(part(profile, 'look').min_px, 1.5) });
  sky.add(pts.mesh);
  let level = 0, levelShare = 0;
  const viewH = () => ((typeof globalThis.innerHeight === 'number' && globalThis.innerHeight) || 800) * Math.min(2, (typeof globalThis.devicePixelRatio === 'number' && globalThis.devicePixelRatio) || 1);
  return {
    group,
    levels: [2, 3],
    latchSafe: true, // one instanced draw
    card: { copy: COPY_BLOCK, drawn: DRAWN },
    setLevel(n, share = 1) {
      level = n;
      levelShare = n >= 2 ? clamp(share, 0, 1) : 0;
      group.visible = levelShare > 0;
    },
    frame(info = {}) {
      if (basisFor !== stage.worldId) { basisFor = stage.worldId; placeSky(THREE, sky, env.record, stage); }
      const u = pts.material.uniforms;
      u.uShare.value = levelShare;
      u.uGain.value = clamp(Number.isFinite(info.gain) ? info.gain : 1, 0.6, 1.6) * num(part(profile, 'look').gain, 1);
      u.uViewH.value = viewH();
      u.uMono.value = lookFor(info.look).mono;
      pts.mesh.visible = levelShare > 0.002;
    },
    ready: () => true,
    stats: () => ({ level, share: Math.round(levelShare * 100) / 100, meshes: 1, textures: 0, points: set.count, bytes: pts.bytes }),
    dispose() {
      pts.geometry.dispose(); pts.material.dispose();
      if (group.parent) group.parent.remove(group);
    },
  };
}

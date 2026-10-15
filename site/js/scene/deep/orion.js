// scene/deep/orion.js -- the Orion Nebula (M42) with M43 as a hero: the blister and the Trapezium (internal
// spec 0076 stage W1-a, internal #782; spec 0075 task 27). Fetched by scene/deep/deepsky.js when M42 is near
// (scene/deep/heroes.js); never at boot. scene/deep/helix.js says what a hero answers:
//   createHero(THREE, env) -> { group, levels, setLevel(level, share), frame(info), ready(), stats(), card, dispose() }
// Pure, for tests/test_hero_orion.mjs: geometryOf, skyFrame, uvOf, coverAt, readFront, sampleFront, columnJs,
//   samplesFor, sharesFor, paletteFor, starLook, sparkleLook, clusterOf, pixelHash, SHAPE, UNDER_MEASURED, DRAWN.
//
// WHAT IT IS. The Orion Nebula is a BLISTER (Wen & O'Dell 1995; O'Dell 2001): a thin layer of ionised gas on the
// near face of the molecular cloud OMC-1, lit by theta1 Ori C, the brightest of the Trapezium's four stars, which
// stands about 0.2 pc (0.65 ly) in front of it (O'Dell et al. 2009). The cloud is behind it, so seen from behind
// the nebula is dark. In front of both is the Veil, neutral gas 1 to 3 pc toward us (Abel et al. 2004), whose
// shadow is the Dark Bay north-east of the Trapezium. M43 is a smaller blister on the same cloud, lit by NU Ori.
//
// ITS SHAPE IS RECONSTRUCTED; ITS LIGHT IS THE PHOTOGRAPH'S. scripts/build_deep_orion.py bakes, on the
// photograph's own (u, v), the FRONT's height z (light-years toward the Sun, theta1 Ori C at 0): 0.2 pc behind
// the star where that is measured, a bowl opening toward us beyond it, the Bright Bar where it turns toward us,
// its relief by Wen & O'Dell's rule (brighter is nearer the star) and M43's dimple round NU Ori; the CLOUD's
// column behind it; and the Veil's optical depth where the Dark Bay is. The front glows with ESO's photograph
// (eso1723a, its stars removed) at the place it covers on the sky as seen from the Sun, ONCE where a view ray
// crosses it: from our side the model IS the photograph (a test holds the column to 5 %), and turned it is that
// light on the reconstructed sheet, crisp at any number of steps because the crossing is found exactly.
//
// HOW IT IS DRAWN (no pass, no render target, no bloom; gasmat.js COLOUR_POLICY). Two meshes, two draw calls,
// in the SKY FRAME (x west, y north, z toward the Sun, light-years about theta1 Ori C):
//   gas    a box round the photograph's footprint, drawn by its back faces. The fragment marches a few coarse
//          steps through the front's slab of heights (8 on T0, 12 at level 2, half the coordinator's at level 3),
//          and where the ray changes side of the front it finds the crossing by bisection and adds the light
//          there, limb-brightened by 1 / |cos| up to a cap and faded at grazing (the Tarantula's exact front,
//          spec 0075 design 14.2). Behind the front the cloud absorbs; the Veil is a plane that absorbs its
//          Dark Bay, and the front behind it was given that light back, so on our line the two cancel.
//          Premultiplied "over": the cloud darkens the stars behind it.
//   stars  one Points draw: the Trapezium's four stars and NU Ori at their SIMBAD places, by the catalogue
//          stars' own curve (scene/stars3d.js: their magnitude at the camera); and a seeded sample of the Orion
//          Nebula Cluster (core 0.18 pc, elongated north-south: Hillenbrand & Hartmann 1998) as pinpoints
//          whose summed light is the same at every tier and which never grow close up. A star behind the
//          front is dimmed by the cloud between it and the camera (looked up in the vertex shader).
// The photograph is the truth from our side: the gas and the stars give way to it by its own share
// (info.photo); the point glow gives way to the hero (deepsky.js heroShares). As the nebula fills the view
// its light is scaled down (to SHAPE.adapt), the eye's adaptation, in the material.
//
// LOOKS. Nothing in it moves. The light has the exposure's own stretch, as the photograph has (Deep is
// ENHANCED and the registry says so). Under Measured nothing changes: every part is a reconstruction or
// a seeded sample of measured numbers, and the card says which.

import { stage } from '../stage.js';
import { exposureLook, EXPOSURES, drawnUnder } from '../exposure.js';
import { STAR_LIGHT_GLSL } from '../stretch.js';
import { kelvinToRgb, STAR_CHROMA } from '../starfield.js';
import { setExtraHole } from '../starholes.js';
import { HERO as PROFILE } from '../../data/hero-orion.js';
import { NEBULAE } from '../../data/nebulae.js';

export const UNDER_MEASURED = { front: 'same', cluster: 'same', motion: 'still' };
// The card's words block (copy/en.later.js deepOrion) and what is drawn for the record and its child.
export const COPY_BLOCK = 'deepOrion';
export const DRAWN = { 'dso-m42': ['reconstruction'], 'dso-m43': ['reconstruction'] };

const D2R = Math.PI / 180;
const OBLIQUITY = 23.4392911 * D2R;
const POLE = [0, Math.sin(OBLIQUITY), Math.cos(OBLIQUITY)];
const MAX_N = 32;          // coarse steps at most (level 3 on T2)
const BISECT = 4;          // halvings at a crossing, then a secant step: a 2 ly step is found to well under a cell
const LIGHT_URL = '../../../images/deep/orion/orion-light.webp';
const FRONT_URL = '../../../data/deep/orion-front.bin';
const DETAIL_URL = '../../../images/deep/orion/orion-detail.webp';
const CLUSTER_BY_TIER = [400, 900, 1600];
// ONE table for the light and the march: the GLSL below is written from it.
export const SHAPE = {
  limbCap: 0.5,     // the limb's 1 / |cos| stops growing at cos 0.5 (twice): a fold seen edge on is a bright line
                    // of gas, as an ionisation front is (the Bright Bar), never a dark arc
  detailEdge: 0.85, // the sharp map blends in from its square's edge to 0.85 of its half-width
  meshStep: 2,      // the T0 sheet's vertices: every second cell of the front's map
  shoulder: 1.0,    // a soft shoulder over 1 (only a limb-brightened edge reaches it; our line never does)
  adapt: 0.45,      // what is left of its light when it fills the view (the eye's adaptation)
  sparkleCap: 0.6,  // the brightest a cluster pinpoint is drawn (a crowd of them close up is a field of faint points, not snow)
  sparklePx: 1.6,   // a cluster pinpoint's size, CSS px; down to 0.6 of it close up (never grown)
  clusterV: 7.0,    // the drawn cluster's summed light: that of a star of V = 7 from here (a model)
  slabPad: 0.05,    // light-years over the front's highest point (the march's slab)
};
const f3 = (x) => Number(x).toFixed(3);
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const neg = (a) => [-a[0], -a[1], -a[2]];
const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/** A static per-pixel offset in [0, 1) (helix.js pixelHash; GAS_FRAG's). Pure. */
export function pixelHash(x, y) {
  const fr = (v) => v - Math.floor(v);
  let a = fr(x * 0.1031), b = fr(y * 0.1031), c = fr(x * 0.1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d; b += d; c += d;
  return fr((a + b) * c);
}

/** The sky frame at an object, in sun-inertial: west, north, and toward the Sun (helix.js skyFrame). Pure. */
export function skyFrame(posKm) {
  const u = norm([posKm.x, posKm.y, posKm.z]);
  const east = norm(cross(POLE, u));
  const north = cross(u, east);
  return { west: neg(east), north, toward: neg(u) };
}

// ----------------------------------------------------------------------------------- the geometry

/**
 * The photograph's (u, v) as a linear map of the sky frame's (x west, y north) in light-years: u = u0 + x ux[0]
 * + y uy[0], v = v0 + x ux[1] + y uy[1]. The picture's own centre and turn (registry/nebulae.yaml, north_deg:
 * north turned that far LEFT of the picture's up, scene/nebulae.js pictureBasis). Pure; the bake's uv_map.
 */
export function uvOf(row, starRaDec, distLy) {
  const lyPerArcmin = distLy * Math.PI / (180 * 60);
  const [ra0, dec0] = starRaDec;
  const cw = -(row.ra_deg - ra0) * Math.cos(dec0 * D2R) * 60, cn = (row.dec_deg - dec0) * 60;
  const r = (row.north_deg || 0) * D2R, W = row.width_arcmin, H = row.height_arcmin;
  // right = w cos r - n sin r; up = w sin r + n cos r (arcmin); u = 0.5 + right / W, v = 0.5 + up / H
  const ux = [Math.cos(r) / W / lyPerArcmin, Math.sin(r) / H / lyPerArcmin];
  const uy = [-Math.sin(r) / W / lyPerArcmin, Math.cos(r) / H / lyPerArcmin];
  const u0 = 0.5 + (-cw * Math.cos(r) + cn * Math.sin(r)) / W;
  const v0 = 0.5 + (-cw * Math.sin(r) - cn * Math.cos(r)) / H;
  // the footprint's corners back in light-years, for the box
  const det = ux[0] * uy[1] - uy[0] * ux[1];
  const xyOf = (u, v) => { const du = u - u0, dv = v - v0; return [(du * uy[1] - uy[0] * dv) / det, (ux[0] * dv - du * ux[1]) / det]; };
  return { u0, v0, ux, uy, xyOf };
}

/** The photograph's feather, as scene/nebulae.js draws it (a superellipse faded over its outer half, squared). Pure. */
export function coverAt(u, v) {
  const qx = Math.abs(u * 2 - 1), qy = Math.abs(v * 2 - 1);
  const e = Math.cbrt(qx ** 3 + qy ** 3);
  const f = 1 - smooth(e, 0.5, 0.98);
  return f * f;
}

const part = (P, k) => (P.layers || []).find((l) => l && l.part === k) || {};
const isOurs = (p) => p && Array.isArray(p.layers) && p.layers.some((l) => l && l.part === 'front');
const offset = (ra0, dec0, ra, dec) => [-(ra - ra0) * Math.cos(dec0 * D2R) * 60, (dec - dec0) * 60];

/** The profile's numbers in light-years, about theta1 Ori C, in the sky frame. Pure. */
export function geometryOf(profile = PROFILE) {
  const P = isOurs(profile) ? profile : PROFILE;
  const dist = (P.frame && P.frame.distance_ly) || 1344;
  const lyA = dist * Math.PI / (180 * 60);
  const star = [Number(P.frame.ra_deg), Number(P.frame.dec_deg)];
  const row = NEBULAE.find((r) => r.id === 'm42') || { ra_deg: 83.78771, dec_deg: -5.48198, width_arcmin: 59.95, height_arcmin: 46.56, north_deg: 0.28 };
  const uv = uvOf(row, star, dist);
  const front = part(P, 'front'), cloud = part(P, 'cloud'), veil = part(P, 'veil'), m43 = part(P, 'm43'), trap = part(P, 'trapezium'), onc = part(P, 'onc');
  const d0 = (Number(front.star_in_front_pc) || 0.2) * 3.26156;
  const rim = Number(front.bowl && front.bowl.rim_ly) || 4;
  const corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => uv.xyOf(u, v));
  const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
  const at = (s, z) => { const [w, n] = offset(star[0], star[1], s.ra_deg, s.dec_deg); return [w * lyA, n * lyA, z]; };
  const dim = m43.dimple || {};
  const stars = (trap.stars || []).map((s) => ({ id: s.id, pos: at(s, Number(s.z_ly) || 0), v: s.v_mag, temp: s.temp_k, catalogueLy: s.catalogue_ly || null }));
  if (m43.star) {
    // NU Ori stands star_in_front_ly before the floor of its dimple: the bowl's height there (the bake's formula,
    // without the relief), less the dimple's depth
    const b = front.bowl || {};
    const [w, n] = offset(star[0], star[1], m43.star.ra_deg, m43.star.dec_deg);
    const rho = Math.hypot(w, n) * lyA, rs = Number(b.rho_s_ly) || 2;
    let zb = -d0 + (Number(b.slope) || 0.55) * (Math.sqrt(rs * rs + rho * rho) - rs);
    if (zb > 0) zb = rim * Math.tanh(zb / rim);
    stars.push({ id: m43.star.id, pos: at(m43.star, zb - (Number(dim.depth_ly) || 0) + (Number(dim.star_in_front_ly) || 0.3)), v: m43.star.v_mag, temp: m43.star.temp_k });
  }
  const cloudLy = Number(cloud.thickness_ly) || 3;
  // the sharp map's square in the photograph's (u, v): u0, v0, u1, v1 (the bake's own arithmetic)
  const D = part(P, 'light').detail || null;
  let detailBox = null;
  if (D) {
    const [x, y] = [-Number(D.centre_east_arcmin) * lyA, Number(D.centre_north_arcmin) * lyA];
    const uc = uv.u0 + x * uv.ux[0] + y * uv.uy[0], vc = uv.v0 + x * uv.ux[1] + y * uv.uy[1];
    const du = D.size_arcmin / 2 / row.width_arcmin, dv = D.size_arcmin / 2 / row.height_arcmin;
    detailBox = [uc - du, vc - dv, uc + du, vc + dv];
  }
  return {
    detailBox,
    distanceLy: dist, lyPerArcmin: lyA, uv, d0,
    // the box reaches up to the Veil's plane (so a view through it is drawn); the march's slab only to just over
    // the front's rim
    box: { min: [Math.min(...xs), Math.min(...ys), -d0 - cloudLy - 0.3], max: [Math.max(...xs), Math.max(...ys), (Number(veil.z_ly) || 6.5) + 0.1] },
    slabTop: Math.max(rim * 1.25, 1) + SHAPE.slabPad,
    cloudLy, sigma: Number(cloud.sigma_per_ly) || 3,
    veilZ: Number(veil.z_ly) || 6.5,
    stars,
    cluster: {
      core: (Number(onc.core_pc) || 0.18) * 3.26156, e: Number(onc.ellipticity) || 0.3, pa: (Number(onc.pa_deg) || 0) * D2R,
      radius: (Number(onc.radius_pc) || 2.5) * 3.26156, count: onc.count_drawn || CLUSTER_BY_TIER, members: Number(onc.members) || 2000,
    },
  };
}

// --------------------------------------------------------------------- the front's map (data/deep)

const halfToFloat = (h) => {
  const s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 0x1f, f = h & 0x3ff;
  if (e === 0) return s * 2 ** -14 * (f / 1024);
  if (e === 31) return f ? NaN : s * Infinity;
  return s * 2 ** (e - 15) * (1 + f / 1024);
};

/**
 * scripts/build_deep_orion.py's front: a 16-byte header (b"SROR", u16 version, nx, ny, channels) and nx * ny
 * cells of four half floats (z, cloud, veil tau, 1), row 0 at v = 0. Returns {nx, ny, half: Uint16Array (for
 * the GPU), data: Float32Array (for JS)}. Pure.
 */
export function readFront(buffer) {
  const dv = new DataView(buffer);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'SROR') throw new Error('orion-front.bin: not a front map');
  const nx = dv.getUint16(6, true), ny = dv.getUint16(8, true), ch = dv.getUint16(10, true);
  if (ch !== 4 || buffer.byteLength !== 16 + nx * ny * 8) throw new Error('orion-front.bin: unexpected size');
  const half = new Uint16Array(buffer.slice(16));
  const data = new Float32Array(half.length);
  for (let i = 0; i < half.length; i++) data[i] = halfToFloat(half[i]);
  return { nx, ny, half, data };
}

/** The front's four channels at (u, v), as the GPU's linear filter with clamp-to-edge reads them. Pure. */
export function sampleFront(front, u, v) {
  const { nx, ny, data } = front;
  const fx = clamp(u * nx - 0.5, 0, nx - 1), fy = clamp(v * ny - 0.5, 0, ny - 1);
  const x0 = Math.min(nx - 2, Math.floor(fx)), y0 = Math.min(ny - 2, Math.floor(fy));
  const tx = fx - x0, ty = fy - y0;
  const out = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const a = data[(y0 * nx + x0) * 4 + c], b = data[(y0 * nx + x0 + 1) * 4 + c];
    const d = data[((y0 + 1) * nx + x0) * 4 + c], e = data[((y0 + 1) * nx + x0 + 1) * 4 + c];
    out[c] = (a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty;
  }
  return out;
}

// --------------------------------------------------------------- the march along a ray (in GLSL too)

/**
 * The colour and transmission along ro + t rd (unit rd, sky frame, ly). `light(u, v)` -> the stretched
 * photograph [r, g, b] at (u, v); n coarse steps through the slab with offset j in [0, 1). Returns {rgb, T,
 * crossings}, before the share and the gain. GAS_FRAG's main(), the same arithmetic. Pure.
 */
export function columnJs(g, front, ro, rd, { n = 12, j = 0.5, light = () => [0, 0, 0] } = {}) {
  const uvAt = (x, y) => [g.uv.u0 + x * g.uv.ux[0] + y * g.uv.uy[0], g.uv.v0 + x * g.uv.ux[1] + y * g.uv.uy[1]];
  const fAt = (p) => { const [u, v] = uvAt(p[0], p[1]); return sampleFront(front, u, v); };
  const P = (t) => [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t];
  const out = { rgb: [0, 0, 0], T: 1, crossings: 0 };
  // the slab: the box, up to the front's rim
  let t0 = 0, t1 = Infinity;
  const top = [g.box.max[0], g.box.max[1], g.slabTop];
  for (let k = 0; k < 3; k++) {
    if (Math.abs(rd[k]) < 1e-9) { if (ro[k] < g.box.min[k] || ro[k] > top[k]) { t1 = -1; break; } continue; }
    const a = (g.box.min[k] - ro[k]) / rd[k], b = (top[k] - ro[k]) / rd[k];
    t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b));
  }
  let T = 1;
  const C = [0, 0, 0];
  // the Veil: a plane over the box; on our line its Dark Bay is the front's light given back and taken again
  const tv = Math.abs(rd[2]) > 1e-6 ? (g.veilZ - ro[2]) / rd[2] : -1;
  const veil = () => { const p = P(tv); const [u, v] = uvAt(p[0], p[1]); return Math.exp(-sampleFront(front, u, v)[2] * Math.sqrt(coverAt(u, v))); };
  if (tv > 0 && rd[2] < 0) T *= veil();
  if (t1 > t0) {
    const dt = (t1 - t0) / n;
    let ta = t0, fa = fAt(P(ta)), ga = P(ta)[2] - fa[0];
    const cloudW = (gz) => (gz < 0 ? 1 - smooth(-gz, 0.6 * g.cloudLy, g.cloudLy) : 0);
    const cloudOf = (f, p, gz) => { const [u, v] = uvAt(p[0], p[1]); return g.sigma * f[1] * coverAt(u, v) * cloudW(gz); };
    for (let i = 0; i <= n; i++) {
      const tb = Math.min(t1, t0 + (i + j) * dt);
      if (tb <= ta) continue;
      const pb = P(tb), fb = fAt(pb), gb = pb[2] - fb[0];
      const kb = cloudOf(fb, pb, gb), ka = cloudOf(fa, P(ta), ga);
      if ((ga > 0) !== (gb > 0)) {
        // the crossing, by halving then one secant step
        let lo = ta, hi = tb, glo = ga, ghi = gb;
        for (let b = 0; b < BISECT; b++) {
          const tm = 0.5 * (lo + hi), pm = P(tm), gm = pm[2] - fAt(pm)[0];
          if ((gm > 0) === (glo > 0)) { lo = tm; glo = gm; } else { hi = tm; ghi = gm; }
        }
        const tc = lo + (hi - lo) * glo / (glo - ghi || 1e-9);
        const pc = P(tc), fc = fAt(pc);
        // the cloud on the ray's way in, if it started behind the front
        if (ga < 0) T *= Math.exp(-0.5 * (ka + g.sigma * fc[1] * coverAt(...uvAt(pc[0], pc[1]))) * (tc - ta));
        const [u, v] = uvAt(pc[0], pc[1]);
        const cov = coverAt(u, v);
        if (cov > 0) {
          const h = 1 / front.nx / Math.hypot(g.uv.ux[0], g.uv.ux[1]); // one cell, in ly
          const zx = (fAt([pc[0] + h, pc[1]])[0] - fc[0]) / h;
          const zy = (fAt([pc[0], pc[1] + h])[0] - fc[0]) / h;
          const len = Math.hypot(zx, zy, 1);
          const mu = Math.abs(rd[2] - zx * rd[0] - zy * rd[1]) / len;
          const limb = 1 / (Math.max(mu, SHAPE.limbCap) * len);
          const lc = light(u, v);
          const k = cov * Math.exp(fc[2] * Math.sqrt(cov)) * limb;
          for (let c = 0; c < 3; c++) C[c] += T * lc[c] * k;
        }
        out.crossings += 1;
        if (ga > 0) T *= Math.exp(-0.5 * (g.sigma * fc[1] * cov + kb) * (tb - tc));
      } else if (ga < 0) {
        T *= Math.exp(-0.5 * (ka + kb) * (tb - ta));
      }
      ta = tb; fa = fb; ga = gb;
      if (T < 0.005 || tb >= t1) break;
    }
  }
  if (tv > 0 && rd[2] > 0) T *= veil(); // looking from behind, the Veil is the last thing crossed
  out.rgb = C; out.T = T;
  return out;
}

// ------------------------------------------------------------------------------- tiers and shares

/** Coarse steps through the slab: 8 on T0, 12 at level 2, half the march's steps above (12 to 32). Pure. */
export function samplesFor({ tier = 1, steps = 0, slow = false } = {}) {
  if (!(tier >= 1)) return 8;
  const n = Math.max(12, Math.min(MAX_N, Math.round((Number(steps) || 0) / 2)));
  return slow ? Math.max(8, Math.round(n / 2)) : n;
}

/** How much of each part draws (helix.js sharesFor): the gas and the stars give way to the photograph. Pure. */
export function sharesFor({ level = 0, rPx = 0, photo = 0, viewH = 800 } = {}) {
  const lv = clamp(Number(level) || 0, 0, 1);
  const ph = clamp(Number(photo) || 0, 0, 1);
  const fill = Number.isFinite(rPx) ? Math.max(0, Number(rPx) || 0) / Math.max(1, viewH / 2) : Infinity;
  const light = 1 - (1 - SHAPE.adapt) * (Number.isFinite(fill) ? smooth(fill, 0.7, 2) : 1);
  return { gas: lv * (1 - ph), stars: lv * (1 - ph), light };
}

/** The exposure (scene/exposure.js) from the coordinator's gain: the photograph's stretch. Pure. */
export function paletteFor(gain = 1, profile = PROFILE) {
  const P = isOurs(profile) ? profile : PROFILE;
  const mode = EXPOSURES.find((m) => Math.abs(exposureLook(m).milkyWay - gain) < 1e-6) || 'camera';
  const L = exposureLook(mode);
  return { mode, enhanced: mode === 'deep' && !!(P.colours && P.colours.enhanced), gain: L.nebulaGain, gamma: L.nebulaGamma, saturation: L.nebulaSaturation };
}

/** A star's colour on the screen from its temperature, as scene/starfield.js starTint makes it from B-V. Pure. */
export function tintOf(kelvin, chroma = STAR_CHROMA) {
  const rgb = kelvinToRgb(kelvin);
  const mean = (rgb[0] + rgb[1] + rgb[2]) / 3;
  const out = rgb.map((v) => clamp(mean + (v - mean) * chroma, 0, 1));
  const max = Math.max(...out) || 1;
  return out.map((v) => v / max);
}

/**
 * A catalogued star at the camera (STAR_VERT's kind 0): a small hard core and a compact halo, its size on screen
 * capped at about 9 CSS px however bright (a brighter star is whiter and more intense, never a bigger blob). Pure.
 */
export function starLook(m) {
  const tt = clamp((6.5 - m) / 8, 0, 1), over = clamp((-1.5 - m) / 6, 0, 1);
  const core = 1.2 + 1.6 * tt, size = core * (2 + 1.2 * over);
  return { size, core: core / size, glow: 0.35 + 0.65 * Math.max(tt, over), alpha: m > 7.5 ? 0 : (0.35 + 0.65 * tt) * (1 + 1.5 * over) };
}

/** A cluster pinpoint: its size (CSS px) and per-pixel brightness, from its flux and its distance (ly). Pure. */
export function sparkleLook(flux, dLy) {
  const size = SHAPE.sparklePx * clamp(dLy / 3, 0.6, 1);
  return { size, bright: Math.min(SHAPE.sparkleCap, flux * (SHAPE.sparklePx / size) ** 2) };
}

/**
 * The cluster, seeded: n stars of a King-like cloud (a Plummer sphere of the core radius, cut at `radius`),
 * squashed on the sky by the ellipticity along its position angle, the depth axis the mean of the two.
 * Fluxes (relative to a V = 6.5 star seen from here, times 0.35, scene/stars3d.js's faintest alpha) sum to a
 * V = SHAPE.clusterV star at every n. {pos: Float32Array(3n), flux: Float32Array(n), temp: Float32Array(n)}. Pure.
 */
export function clusterOf(g, n, seed = 1976) {
  let a = seed >>> 0;
  const rand = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const K = g.cluster;
  const pos = new Float32Array(3 * n), flux = new Float32Array(n), temp = new Float32Array(n);
  const q = 1 - K.e, sq = Math.sqrt(q);
  const maj = 1 / sq, mnr = sq; // equal area on the sky
  const along = [-Math.sin(K.pa), Math.cos(K.pa)]; // PA east of north -> (west, north)
  const acrossV = [along[1], -along[0]];
  let sum = 0;
  for (let i = 0; i < n; i++) {
    let r;
    do { r = K.core / Math.sqrt(rand() ** (-2 / 3) - 1); } while (!(r < K.radius));
    const ct = 2 * rand() - 1, st = Math.sqrt(1 - ct * ct), ph = 2 * Math.PI * rand();
    const lx = r * st * Math.cos(ph) * maj, ly = r * st * Math.sin(ph) * mnr, lz = r * ct;
    pos.set([lx * along[0] + ly * acrossV[0], lx * along[1] + ly * acrossV[1], lz], 3 * i);
    // a young cluster's stars: most are faint red ones, a few are bright and blue (a drawn luminosity function)
    const u = rand();
    const L = 0.02 * Math.pow(1 - 0.999 * u, -1.1);
    flux[i] = L; sum += L;
    temp[i] = 3100 + 9000 * Math.min(1, Math.pow(L / 5, 0.5)) * (0.7 + 0.3 * rand());
  }
  const want = Math.pow(10, -0.4 * (SHAPE.clusterV - 6.5)) * 0.35;
  for (let i = 0; i < n; i++) flux[i] *= want / sum;
  return { pos, flux, temp };
}

// -------------------------------------------------------------------------------------- the GLSL

const COMMON = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
`;

const GAS_VERT = /* glsl */ `
varying vec3 vObj;
${COMMON}
void main() {
  vObj = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  #include <logdepthbuf_vertex>
}
`;

// The front's map and the light, shared by the gas and the stars' vertex shader.
const FRONT_GLSL = /* glsl */ `
uniform sampler2D uFront;  // z, cloud, veil tau, 1 (scripts/build_deep_orion.py), half floats, linear
uniform vec2 uUv0;         // the photograph's (u, v) = uUv0 + x uUx + y uUy (x west, y north, ly)
uniform vec2 uUx;
uniform vec2 uUy;
uniform float uSigma;      // the cloud's opacity per ly at full column
uniform float uCloudLy;    // its thickness behind the front
vec2 uvAt( vec2 xy ) { return uUv0 + xy.x * uUx + xy.y * uUy; }
vec4 frontAt( vec2 xy ) { return texture2D( uFront, uvAt( xy ) ); }
float coverAt( vec2 uv ) {
  vec2 q = abs( uv * 2.0 - 1.0 );
  float e = pow( pow( q.x, 3.0 ) + pow( q.y, 3.0 ), 1.0 / 3.0 );
  float f = 1.0 - smoothstep( 0.5, 0.98, e );
  return f * f;
}
float cloudW( float g ) { return g < 0.0 ? 1.0 - smoothstep( 0.6 * uCloudLy, uCloudLy, -g ) : 0.0; }
float cloudAt( vec4 f, vec3 p ) { return uSigma * f.g * coverAt( uvAt( p.xy ) ) * cloudW( p.z - f.r ); }
`;

// The light: the 640 px photograph, and near the Trapezium the sharp map of the same photograph, blended in from its
// square's edge, and only where its texels are larger than a pixel (it has no mipmaps: GPU memory).
const LIGHT_GLSL = /* glsl */ `
uniform sampler2D uLight;  // the photograph without its stars (display values, gasmat.js COLOUR_POLICY)
uniform sampler2D uDetail; // the sharp map near the Trapezium (scripts/build_deep_orion.py bake_detail)
uniform vec4 uDetBox;      // its square in the photograph's (u, v): u0, v0, u1, v1
uniform float uDetOn;      // 1 once it has landed
uniform float uDetPx;      // its side, texels
uniform float uGamma;      // the exposure's stretch, as scene/nebulae.js gives the photograph
uniform float uSat;
vec3 rawLight( vec2 uv, float uvPerPx ) {
  vec3 t = texture2D( uLight, uv ).rgb;
  if ( uDetOn > 0.0 ) {
    vec2 q = ( uv - uDetBox.xy ) / ( uDetBox.zw - uDetBox.xy );
    float e = max( abs( q.x * 2.0 - 1.0 ), abs( q.y * 2.0 - 1.0 ) );
    // a texel of the sharp map against a pixel: blended in only once it is at least half a pixel
    float texel = ( uDetBox.z - uDetBox.x ) / uDetPx;
    float w = ( 1.0 - smoothstep( ${f3(SHAPE.detailEdge)}, 1.0, e ) ) * smoothstep( 0.25, 0.5, texel / max( uvPerPx, 1e-9 ) );
    if ( w > 0.0 ) t = mix( t, texture2D( uDetail, clamp( q, 0.0, 1.0 ) ).rgb, w );
  }
  return t;
}
vec3 stretchLight( vec3 t ) {
  vec3 c = pow( max( t, vec3( 0.0 ) ), vec3( uGamma ) );
  float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  return mix( vec3( l ) * vec3( 0.86, 0.96, 1.0 ), c, uSat );
}
`;

const GAS_FRAG = /* glsl */ `
#define MAX_N ${MAX_N}
uniform vec3 uCam;         // the camera in the sky frame, ly (CPU, float64, each frame)
uniform vec3 uBoxMin;
uniform vec3 uBoxMax;
uniform float uVeilZ;
uniform float uSlabTop;    // the front's rim and a little: the march stops there (the Veil is a plane above)
uniform float uCell;       // one cell of the front's map, ly (for its slope)
uniform int uN;            // coarse steps
uniform float uPixAng;     // a pixel's angle, radians (the sharp map's blend)
uniform float uShare;
uniform float uGain;
varying vec3 vObj;
${FRONT_GLSL}
${LIGHT_GLSL}
#include <common>
#include <logdepthbuf_pars_fragment>

float pixelHash( vec2 p ) {
  vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
  p3 += dot( p3, p3.yzx + 33.33 );
  return fract( ( p3.x + p3.y ) * p3.z );
}
float veilT( vec3 ro, vec3 rd, float tv ) {
  vec2 uv = uvAt( ( ro + rd * tv ).xy );
  return exp( -texture2D( uFront, uv ).b * sqrt( coverAt( uv ) ) );
}

void main() {
  #include <logdepthbuf_fragment>
  if ( uShare <= 0.0 ) discard;
  vec3 ro = uCam;
  vec3 rd = normalize( vObj - ro );
  // the slab: the box round the photograph's footprint, from the cloud's back to the front's rim
  vec3 inv = 1.0 / ( abs( rd ) + 1e-9 ) * sign( rd + 1e-12 );
  vec3 ta3 = ( uBoxMin - ro ) * inv;
  vec3 tb3 = ( vec3( uBoxMax.xy, uSlabTop ) - ro ) * inv;
  vec3 tn = min( ta3, tb3 );
  vec3 tf = max( ta3, tb3 );
  float t0 = max( max( tn.x, tn.y ), max( tn.z, 0.0 ) );
  float t1 = min( min( tf.x, tf.y ), tf.z );
  float T = 1.0;
  vec3 C = vec3( 0.0 );
  float tv = abs( rd.z ) > 1e-6 ? ( uVeilZ - ro.z ) / rd.z : -1.0;
  if ( tv > 0.0 && rd.z < 0.0 ) T *= veilT( ro, rd, tv );
  if ( t1 > t0 ) {
    float j = pixelHash( gl_FragCoord.xy );   // a static per-pixel offset: grain, never bands
    float dt = ( t1 - t0 ) / float( uN );
    float ta = t0;
    vec3 pa = ro + rd * ta;
    vec4 fa = frontAt( pa.xy );
    float ga = pa.z - fa.r;
    float ka = cloudAt( fa, pa );
    for ( int i = 0; i <= MAX_N; i++ ) {
      if ( i > uN ) break;
      float tb = min( t1, t0 + ( float( i ) + j ) * dt );
      if ( tb <= ta ) continue;
      vec3 pb = ro + rd * tb;
      vec4 fb = frontAt( pb.xy );
      float gb = pb.z - fb.r;
      float kb = cloudAt( fb, pb );
      if ( ( ga > 0.0 ) != ( gb > 0.0 ) ) {
        // the crossing, exactly: halvings, then one secant step
        float lo = ta, hi = tb, glo = ga, ghi = gb;
        for ( int b = 0; b < ${BISECT}; b++ ) {
          float tm = 0.5 * ( lo + hi );
          vec3 pm = ro + rd * tm;
          float gm = pm.z - frontAt( pm.xy ).r;
          if ( ( gm > 0.0 ) == ( glo > 0.0 ) ) { lo = tm; glo = gm; } else { hi = tm; ghi = gm; }
        }
        float tc = lo + ( hi - lo ) * glo / ( abs( glo - ghi ) > 1e-9 ? glo - ghi : 1e-9 );
        vec3 pc = ro + rd * tc;
        vec4 fc = frontAt( pc.xy );
        vec2 uv = uvAt( pc.xy );
        float cov = coverAt( uv );
        float sc = uSigma * fc.g * cov;
        if ( ga < 0.0 ) T *= exp( -0.5 * ( ka + sc ) * ( tc - ta ) );
        if ( cov > 0.0 ) {
          float zx = ( frontAt( pc.xy + vec2( uCell, 0.0 ) ).r - fc.r ) / uCell;
          float zy = ( frontAt( pc.xy + vec2( 0.0, uCell ) ).r - fc.r ) / uCell;
          float len = length( vec3( zx, zy, 1.0 ) );
          float mu = abs( rd.z - zx * rd.x - zy * rd.y ) / len;
          // limb-brightened as a thin layer is, but a grazing ray fades: a thin edge, not a glass rim
          float limb = 1.0 / ( max( mu, ${f3(SHAPE.limbCap)} ) * len );
          // the Veil's Dark Bay given back here and taken again on our line (the plane above)
          // how much of the photograph one pixel spans here: the crossing's distance times a pixel's angle
          float uvPerPx = tc * uPixAng * length( uUx );
          C += T * stretchLight( rawLight( uv, uvPerPx ) ) * ( cov * exp( fc.b * sqrt( cov ) ) * limb );
        }
        if ( ga > 0.0 ) T *= exp( -0.5 * ( sc + kb ) * ( tb - tc ) );
      } else if ( ga < 0.0 ) {
        T *= exp( -0.5 * ( ka + kb ) * ( tb - ta ) );
      }
      ta = tb; fa = fb; ga = gb; ka = kb;
      if ( T < 0.005 || tb >= t1 ) break;
    }
  }
  if ( tv > 0.0 && rd.z > 0.0 ) T *= veilT( ro, rd, tv );
  vec3 col = C * uGain * uShare;
  // a soft shoulder over 1: only a limb-brightened edge reaches it, never our line
  float mx = max( col.r, max( col.g, col.b ) );
  if ( mx > ${f3(SHAPE.shoulder)} ) col *= ( ${f3(SHAPE.shoulder)} + ( 1.0 - exp( -( mx - ${f3(SHAPE.shoulder)} ) ) ) * 0.5 ) / mx;
  // premultiplied over: the light adds, and the cloud and the Veil keep T of what is behind them
  gl_FragColor = vec4( col, ( 1.0 - T ) * uShare );
}
`;

// The stars: aKind 0 a catalogued star (scene/stars3d.js's curve at the camera), 1 a cluster pinpoint.
// Both dimmed by the cloud between them and the camera (six samples along the way, in the front's map).
const STAR_VERT = /* glsl */ `
attribute vec4 aStar;      // colour (rgb); w: V seen from the Sun (a catalogued star) or flux (a pinpoint)
attribute float aKind;
uniform vec3 uCam;
uniform vec3 uBoxMin;
uniform vec3 uBoxMax;
uniform float uDistLy;     // the record's distance: where the magnitudes are from
uniform float uPixelRatio;
uniform float uShare;
uniform float uGain;
varying vec3 vColour;
varying float vAlpha;
varying float vCore;
varying float vGlow;
varying float vGlare;
varying float vKind;
${FRONT_GLSL}
${COMMON}
float cloudTau( vec3 a, vec3 b ) {
  // the part of a -> b inside the box, six samples
  vec3 d = b - a;
  float len = length( d );
  if ( len < 1e-6 ) return 0.0;
  vec3 rd = d / len;
  vec3 inv = 1.0 / ( abs( rd ) + 1e-9 ) * sign( rd + 1e-12 );
  vec3 t0 = ( uBoxMin - a ) * inv, t1 = ( uBoxMax - a ) * inv;
  float lo = max( max( min( t0.x, t1.x ), min( t0.y, t1.y ) ), max( min( t0.z, t1.z ), 0.0 ) );
  float hi = min( min( max( t0.x, t1.x ), max( t0.y, t1.y ) ), min( max( t0.z, t1.z ), len ) );
  if ( hi <= lo ) return 0.0;
  float tau = 0.0;
  for ( int i = 0; i < 6; i++ ) {
    vec3 p = a + rd * mix( lo, hi, ( float( i ) + 0.5 ) / 6.0 );
    tau += cloudAt( frontAt( p.xy ), p );
  }
  return tau * ( hi - lo ) / 6.0;
}
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
  float d = max( 1e-4, length( position - uCam ) );
  float ext = exp( -cloudTau( position, uCam ) );
  vKind = aKind;
  vColour = aStar.rgb;
  if ( aKind < 0.5 ) {
    // its magnitude at the CAMERA; drawn as a SMALL HARD POINT with a compact halo whose size on screen is capped
    // (at most about 9 CSS px across on any screen): brighter is whiter and more intense, never a bigger blob
    float m = aStar.w + 5.0 * log( d / uDistLy ) / log( 10.0 ) - 2.5 * log( max( ext, 1e-6 ) ) / log( 10.0 );
    float tt = clamp( ( 6.5 - m ) / 8.0, 0.0, 1.0 );
    float over = clamp( ( -1.5 - m ) / 6.0, 0.0, 1.0 );
    float core = 1.2 + 1.6 * tt;
    float size = core * ( 2.0 + 1.2 * over );
    gl_PointSize = mv.z < 0.0 ? size * uPixelRatio : 0.0;
    vCore = core / size;
    vGlow = 0.35 + 0.65 * max( tt, over );
    vGlare = 0.0;
    vAlpha = ( m > 7.5 ? 0.0 : ( 0.35 + 0.65 * tt ) * ( 1.0 + 1.5 * over ) ) * uShare * uGain;
  } else {
    // a pinpoint: its flux falls as 1 / d^2 from the record's distance; close up it gets SMALLER (its light in
    // fewer pixels), capped, never grown (spec 0075's lesson)
    float flux = aStar.w * ( uDistLy / d ) * ( uDistLy / d ) * ext;
    float size = ${f3(SHAPE.sparklePx)} * clamp( d / 3.0, 0.6, 1.0 );
    float bright = min( ${f3(SHAPE.sparkleCap)}, flux * ( ${f3(SHAPE.sparklePx)} / size ) * ( ${f3(SHAPE.sparklePx)} / size ) );
    gl_PointSize = mv.z < 0.0 ? size * uPixelRatio : 0.0;
    vCore = 1.0; vGlow = 0.0; vGlare = 0.0;
    vAlpha = bright * uShare * uGain;
  }
}
`;

const STAR_FRAG = /* glsl */ `
varying vec3 vColour;
varying float vAlpha;
varying float vCore;
varying float vGlow;
varying float vGlare;
varying float vKind;
#include <common>
#include <logdepthbuf_pars_fragment>
${STAR_LIGHT_GLSL}
void main() {
  #include <logdepthbuf_fragment>
  if ( vAlpha <= 0.002 ) discard;
  vec2 c = gl_PointCoord - 0.5;
  float d = length( c );
  float a;
  vec3 col = vColour;
  if ( vKind < 0.5 ) {
    vec2 light = starLight( d, vCore, vGlow );
    a = light.x + light.y;
    col = mix( vColour, vec3( 1.0 ), 0.5 * light.x );
  } else {
    a = exp( -10.0 * d * d ) * ( 1.0 - smoothstep( 0.4, 0.5, d ) );
  }
  if ( a <= 0.003 ) discard;
  gl_FragColor = vec4( col * a * vAlpha, 1.0 );
}
`;

// THE CHEAP PATH (T0 and the frame latch, Low included): the front as a MESH, the same sheet the march finds,
// one texture lookup a pixel. Seen from the star's side it glows with the light (limb as the march's); seen from the
// cloud's side its light comes through the cloud's column, so from behind the thin outer parts show and the
// thick middle is dark. Its alpha is the cloud's: what is behind the sheet is hidden as by the march's cloud.
const SHEET_VERT = /* glsl */ `
attribute vec2 aUv;
attribute vec3 aNormal;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vP;
${COMMON}
void main() {
  vUv = aUv; vN = aNormal; vP = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  #include <logdepthbuf_vertex>
}
`;
const SHEET_FRAG = /* glsl */ `
uniform vec3 uCam;
uniform float uVeilZ;
uniform float uPixAng;
uniform float uShare;
uniform float uGain;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vP;
${FRONT_GLSL}
${LIGHT_GLSL}
#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  if ( uShare <= 0.0 ) discard;
  float cov = coverAt( vUv );
  if ( cov <= 0.0 ) discard;
  vec3 toCam = uCam - vP;
  float dist = length( toCam );
  vec3 v = toCam / dist;
  vec3 n = normalize( vN );
  float side = dot( n, v );
  float mu = abs( side );
  vec4 f = texture2D( uFront, vUv );
  float limb = n.z / max( mu, ${f3(SHAPE.limbCap)} );
  vec3 e = stretchLight( rawLight( vUv, dist * uPixAng * length( uUx ) ) ) * cov * exp( f.b * sqrt( cov ) ) * limb;
  // the Veil, if it lies between the camera and here (on our line it takes back what the front was given)
  float T = 1.0;
  if ( ( uCam.z - uVeilZ ) * ( vP.z - uVeilZ ) < 0.0 ) {
    vec3 pv = uCam + ( vP - uCam ) * ( ( uVeilZ - uCam.z ) / ( vP.z - uCam.z ) );
    vec2 uvv = uvAt( pv.xy );
    T = exp( -texture2D( uFront, uvv ).b * sqrt( coverAt( uvv ) ) );
  }
  // the cloud behind the sheet: its column along the view, capped at three thicknesses
  float Tc = exp( -uSigma * f.g * cov * min( uCloudLy / max( mu, 0.05 ), 3.0 * uCloudLy ) );
  vec3 col = ( side < 0.0 ? e * Tc : e ) * T * uGain * uShare;
  float mx = max( col.r, max( col.g, col.b ) );
  if ( mx > ${f3(SHAPE.shoulder)} ) col *= ( ${f3(SHAPE.shoulder)} + ( 1.0 - exp( -( mx - ${f3(SHAPE.shoulder)} ) ) ) * 0.5 ) / mx;
  gl_FragColor = vec4( col, ( 1.0 - Tc * T ) * uShare );
}
`;

/** The T0 sheet's vertices from the front's map: every `step`-th cell; sky-frame positions, (u, v) and normals. Pure. */
export function sheetOf(g, front, step = SHAPE.meshStep) {
  const nx = Math.floor((front.nx - 1) / step) + 1, ny = Math.floor((front.ny - 1) / step) + 1;
  const pos = new Float32Array(nx * ny * 3), uv = new Float32Array(nx * ny * 2), nrm = new Float32Array(nx * ny * 3);
  const cx = 1 / (front.nx * g.uv.ux[0]), cy = 1 / (front.ny * g.uv.uy[1]);
  const z = (i, j) => front.data[(Math.min(front.ny - 1, Math.max(0, j)) * front.nx + Math.min(front.nx - 1, Math.max(0, i))) * 4];
  for (let b = 0; b < ny; b++) for (let a = 0; a < nx; a++) {
    const i = Math.min(front.nx - 1, a * step), j = Math.min(front.ny - 1, b * step);
    const u = (i + 0.5) / front.nx, v = (j + 0.5) / front.ny;
    const [x, y] = g.uv.xyOf(u, v);
    const k = b * nx + a;
    pos.set([x, y, z(i, j)], 3 * k);
    uv.set([u, v], 2 * k);
    const zx = (z(i + 1, j) - z(i - 1, j)) / (2 * cx), zy = (z(i, j + 1) - z(i, j - 1)) / (2 * cy);
    const l = Math.hypot(zx, zy, 1);
    nrm.set([-zx / l, -zy / l, 1 / l], 3 * k);
  }
  const index = [];
  for (let b = 0; b < ny - 1; b++) for (let a = 0; a < nx - 1; a++) {
    const k = b * nx + a;
    index.push(k, k + 1, k + nx, k + 1, k + nx + 1, k + nx);
  }
  return { pos, uv, nrm, index, nx, ny };
}

/** The shader sources, for tests/test_hero_orion.mjs (columnJs mirrors GAS_FRAG). */
export const SHADERS = { gasVertex: GAS_VERT, gas: GAS_FRAG, starVertex: STAR_VERT, star: STAR_FRAG, sheetVertex: SHEET_VERT, sheet: SHEET_FRAG };

// -------------------------------------------------------------------------------------- the hero

function material(THREE, { vertexShader, fragmentShader, uniforms, absorbing, side }) {
  // gasmat.js COLOUR_POLICY: display values, opaque list, no depth write; additive for light and
  // premultiplied "over" (GAS_ABSORB) for what absorbs.
  const m = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: false, depthTest: false, depthWrite: false, toneMapped: false, side: side || THREE.DoubleSide });
  if (absorbing) {
    m.defines = { GAS_ABSORB: '' };
    m.blending = THREE.CustomBlending;
    m.blendSrc = THREE.OneFactor;
    m.blendDst = THREE.OneMinusSrcAlphaFactor;
  } else m.blending = THREE.AdditiveBlending;
  return m;
}

export function createHero(THREE, env = {}) {
  const group = new THREE.Group();
  group.name = 'deep-hero-orion';
  const profile = isOurs(env.profile) ? env.profile : PROFILE;
  const g = geometryOf(profile);
  const sky = new THREE.Group();
  sky.name = `${group.name}-sky`;
  sky.matrixAutoUpdate = false;
  group.add(sky);
  let basisFor = null;
  function placeSky() {
    const rec = env.record;
    basisFor = stage.worldId;
    if (!rec || !rec.pos) return;
    const f = skyFrame(rec.pos);
    const c = new THREE.Vector3(), tip = new THREE.Vector3();
    if (!stage.toSceneInto(rec.pos, 'sun-inertial', c, stage.tMs)) return;
    const k = 1e12;
    const dir = (v) => {
      stage.toSceneInto({ x: rec.pos.x + v[0] * k, y: rec.pos.y + v[1] * k, z: rec.pos.z + v[2] * k }, 'sun-inertial', tip, stage.tMs);
      return tip.clone().sub(c).normalize();
    };
    const x = dir(f.west), y = dir(f.north);
    const z = new THREE.Vector3().crossVectors(x, y).normalize();
    y.crossVectors(z, x).normalize();
    sky.matrix.makeBasis(x, y, z);
    sky.matrixWorldNeedsUpdate = true;
  }

  // --- what it fetches: the light map, the sharp map near the Trapezium, and the front's map
  let lightTex = null, lightState = 'none', detailTex = null, detailState = 'none', frontTex = null, frontState = 'none', frontBytes = 0;
  const browser = typeof document !== 'undefined';
  const loadTex = (url, mip, done) => {
    const t = new THREE.TextureLoader().load(new URL(url, import.meta.url).href, () => done('ready'), undefined, (e) => { done('failed'); console.warn('deep: an Orion map did not load', url, e); });
    t.colorSpace = THREE.NoColorSpace; // display values, as the photographs (gasmat.js COLOUR_POLICY)
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.generateMipmaps = mip;
    t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    return t;
  };
  if (browser && THREE.TextureLoader) {
    lightState = 'loading';
    lightTex = loadTex(LIGHT_URL, true, (st) => { lightState = st; });
    // the sharp map has no mipmaps (GPU memory): the shader uses it only where its texels are at least half a pixel
    detailState = 'loading';
    detailTex = loadTex(DETAIL_URL, false, (st) => { detailState = st; for (const m of [gasMat, sheetMat]) m.uniforms.uDetOn.value = st === 'ready' ? 1 : 0; });
  }
  const DET = part(profile, 'light').detail || {};
  const blank = new THREE.DataTexture(new Uint16Array([0, 0, 0, 0x3c00]), 1, 1, THREE.RGBAFormat, THREE.HalfFloatType);
  blank.needsUpdate = true;

  const pal0 = paletteFor(1, profile);
  const V3 = (v) => new THREE.Vector3(...v);
  const V2 = (v) => new THREE.Vector2(...v);
  const front = () => ({
    uFront: { value: blank }, uUv0: { value: new THREE.Vector2(g.uv.u0, g.uv.v0) }, uUx: { value: V2(g.uv.ux) }, uUy: { value: V2(g.uv.uy) },
    uSigma: { value: g.sigma }, uCloudLy: { value: g.cloudLy }, uBoxMin: { value: V3(g.box.min) }, uBoxMax: { value: V3(g.box.max) },
  });
  const camU = { value: new THREE.Vector3(0, 0, 50) };
  const lightU = () => ({
    uLight: { value: lightTex }, uDetail: { value: detailTex }, uDetBox: { value: new THREE.Vector4(...(g.detailBox || [0, 0, 1, 1])) }, uDetOn: { value: 0 }, uDetPx: { value: Number(DET.px) || 704 },
    uGamma: { value: pal0.gamma }, uSat: { value: pal0.saturation },
  });
  // --- the gas: the box round the footprint, by its back faces (T1 and up)
  const size = g.box.max.map((v, i) => v - g.box.min[i]);
  const gasGeo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  gasGeo.translate(...g.box.max.map((v, i) => (v + g.box.min[i]) / 2));
  const gasMat = material(THREE, {
    vertexShader: GAS_VERT, fragmentShader: GAS_FRAG, absorbing: true, side: THREE.BackSide,
    uniforms: {
      ...front(), ...lightU(), uCam: camU, uVeilZ: { value: g.veilZ }, uSlabTop: { value: g.slabTop }, uCell: { value: 0.15 }, uN: { value: 12 },
      uPixAng: { value: 0.001 }, uShare: { value: 0 }, uGain: { value: 1 },
    },
  });
  gasMat.name = 'deep-orion-gas';
  const gas = new THREE.Mesh(gasGeo, gasMat);
  gas.name = `${group.name}-shells`; // the contract's draw-order check knows a deep mesh by `-shells`
  gas.renderOrder = -1;
  sky.add(gas);
  // --- the sheet: the same front as a mesh (T0 and the latch), built once the front's map has landed
  const sheetMat = material(THREE, {
    vertexShader: SHEET_VERT, fragmentShader: SHEET_FRAG, absorbing: true, side: THREE.DoubleSide,
    uniforms: { ...front(), ...lightU(), uCam: camU, uVeilZ: { value: g.veilZ }, uPixAng: gasMat.uniforms.uPixAng, uShare: { value: 0 }, uGain: { value: 1 } },
  });
  sheetMat.name = 'deep-orion-sheet';
  let sheet = null, sheetBytes = 0;

  const useFront = (f) => {
    frontTex = new THREE.DataTexture(f.half, f.nx, f.ny, THREE.RGBAFormat, THREE.HalfFloatType);
    frontTex.minFilter = frontTex.magFilter = THREE.LinearFilter;
    frontTex.wrapS = frontTex.wrapT = THREE.ClampToEdgeWrapping;
    frontTex.generateMipmaps = false;
    frontTex.needsUpdate = true;
    frontBytes = f.half.byteLength;
    for (const m of [gasMat, starMat, sheetMat]) m.uniforms.uFront.value = frontTex;
    gasMat.uniforms.uCell.value = 1 / f.nx / Math.hypot(g.uv.ux[0], g.uv.ux[1]);
    const sh = sheetOf(g, f);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(sh.pos, 3));
    geo.setAttribute('aUv', new THREE.Float32BufferAttribute(sh.uv, 2));
    geo.setAttribute('aNormal', new THREE.Float32BufferAttribute(sh.nrm, 3));
    geo.setIndex(sh.index);
    sheet = new THREE.Mesh(geo, sheetMat);
    sheet.name = `${group.name}-sheet`;
    sheet.renderOrder = -1;
    sheet.visible = false;
    sky.add(sheet);
    sheetBytes = sh.pos.byteLength + sh.uv.byteLength + sh.nrm.byteLength + sh.index.length * 4;
    frontState = 'ready';
  };
  if (browser || env.fetchBin) {
    frontState = 'loading';
    const load = env.fetchBin || ((url) => fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`)))));
    Promise.resolve().then(() => load(new URL(FRONT_URL, import.meta.url).href)).then((buf) => useFront(readFront(buf)))
      .catch((e) => { frontState = 'failed'; console.warn('deep: the Orion front did not load', e); });
  }

  // --- the stars: the Trapezium, theta2 Ori A and NU Ori, and the cluster (built for the tier)
  const starMat = material(THREE, {
    vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
    uniforms: { ...front(), uCam: camU, uDistLy: { value: g.distanceLy }, uPixelRatio: { value: 1 }, uShare: { value: 0 }, uGain: { value: 1 } },
  });
  starMat.name = 'deep-orion-stars';
  let stars = null, starTier = -1, starCount = 0, starBytes = 0;
  function buildStars(tier) {
    if (stars && starTier === tier) return;
    if (stars) { sky.remove(stars); stars.geometry.dispose(); }
    const n = (Array.isArray(g.cluster.count) ? g.cluster.count : CLUSTER_BY_TIER)[clamp(tier | 0, 0, 2)] | 0;
    const cl = clusterOf(g, n);
    const m = g.stars.length;
    const pos = new Float32Array(3 * (m + n)), star = new Float32Array(4 * (m + n)), kind = new Float32Array(m + n);
    g.stars.forEach((s, i) => { pos.set(s.pos, 3 * i); star.set([...tintOf(s.temp), s.v], 4 * i); });
    for (let i = 0; i < n; i++) {
      pos.set(cl.pos.subarray(3 * i, 3 * i + 3), 3 * (m + i));
      star.set([...tintOf(cl.temp[i]), cl.flux[i]], 4 * (m + i));
      kind[m + i] = 1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aStar', new THREE.Float32BufferAttribute(star, 4));
    geo.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
    stars = new THREE.Points(geo, starMat);
    stars.name = `${group.name}-stars`;
    stars.frustumCulled = false;
    stars.renderOrder = -0.96;
    sky.add(stars);
    starTier = tier; starCount = m + n; starBytes = pos.byteLength + star.byteLength + kind.byteLength;
  }
  buildStars(1);
  // A catalogue star the hero draws itself (theta2 Ori A): the catalogue's copy, at its own distance, steps aside
  // while the hero's is drawn (scene/starholes.js, the M42 hole).
  const twins = g.stars.filter((s) => Array.isArray(s.catalogueLy)).map((s) => ({ id: `orion:${s.id}`, km: s.catalogueLy.map((v) => v * 9460730472580.8) }));
  const _tw = new THREE.Vector3();
  const holeOff = () => { for (const t of twins) setExtraHole(t.id, null); };

  let level = 0, levelShare = 0, samples = 12, tierNow = 1, slowMs = 0, cheap = false, last = { gas: 0, stars: 0, photo: 0, light: 1 }, palette = pal0;
  const _inv = new THREE.Matrix4();
  const _id = new THREE.Matrix4();
  const _cam = new THREE.Vector3();

  return {
    group,
    levels: [2, 3],
    // The cheap path (the sheet) costs about what the holder it replaces does: the coordinator may keep it drawn under
    // the frame latch and Low (internal spec 0076 W1-a).
    latchSafe: true,
    // (spec 0075 stage c's hook) the card's rows come from this block; M42 and M43 are drawn as a reconstruction
    card: { copy: COPY_BLOCK, drawn: DRAWN },
    setLevel(n, share = 1) {
      level = n;
      levelShare = n >= 2 ? clamp(share, 0, 1) : 0;
      group.visible = levelShare > 0;
      if (!group.visible) holeOff();
    },
    frame(info = {}) {
      if (basisFor !== stage.worldId) placeSky();
      const tier = Number.isFinite(info.tier) ? info.tier : 1;
      if (tier !== tierNow || !stars) { tierNow = tier; buildStars(tier); }
      const q = typeof env.quality === 'function' ? env.quality() || {} : {};
      cheap = !(tier >= 1) || !!q.latched;
      const vh = (typeof globalThis.innerHeight === 'number' && globalThis.innerHeight) || 800;
      const sh = sharesFor({ level: levelShare, rPx: info.rPx, photo: info.photo, viewH: vh });
      last = { ...sh, photo: Number(info.photo) || 0 };
      // slow frames halve the coarse steps before the governor would lower the pixel ratio (spec 0075 task 44)
      const dt = Number(info.dtMs) || 0;
      if (!(info.frozen || info.reduced)) slowMs = slowMs * 0.9 + dt * 0.1;
      samples = cheap ? 0 : samplesFor({ tier, steps: level >= 3 ? info.steps : 0, slow: slowMs > 24 });
      const gain = Number.isFinite(info.gain) ? info.gain : 1;
      if (gain !== palette.gainIn) {
        palette = { ...paletteFor(gain, profile), gainIn: gain };
        for (const m of [gasMat, sheetMat]) { m.uniforms.uGamma.value = palette.gamma; m.uniforms.uSat.value = palette.saturation; }
      }
      // Under Measured nothing changes and nothing moves (UNDER_MEASURED): every part is measured, reconstructed or seeded.
      const look = info.look || 'film';
      const keep = drawnUnder(look, UNDER_MEASURED.front) ? 1 : 0;
      const lit = lightState === 'ready' && frontState === 'ready';
      const gu = gasMat.uniforms, su = sheetMat.uniforms;
      gu.uShare.value = lit && !cheap ? sh.gas * keep : 0;
      su.uShare.value = lit && cheap ? sh.gas * keep : 0;
      gu.uN.value = Math.max(1, samples);
      gu.uGain.value = su.uGain.value = palette.gain * sh.light;
      starMat.uniforms.uShare.value = frontState === 'ready' ? sh.stars : 0;
      starMat.uniforms.uPixelRatio.value = (typeof globalThis.devicePixelRatio === 'number' && globalThis.devicePixelRatio) || 1;
      gas.visible = gu.uShare.value > 0.002;
      if (sheet) sheet.visible = su.uShare.value > 0.002;
      stars.visible = starMat.uniforms.uShare.value > 0.002;
      if (info.camera) {
        if (group.parent) group.parent.updateWorldMatrix(true, false);
        _inv.multiplyMatrices(group.parent ? group.parent.matrixWorld : _id, group.matrix).multiply(sky.matrix).invert();
        _cam.copy(info.camera.position).applyMatrix4(_inv);
        camU.value.copy(_cam);
        const P = info.camera.projectionMatrix.elements;
        gu.uPixAng.value = 2 / Math.max(1, P[5] * vh);
        // the catalogue twin's direction in view space, and a cone of about 16 px round it
        info.camera.updateMatrixWorld();
        for (const t of twins) {
          const k = starMat.uniforms.uShare.value;
          if (k > 0.003 && stage.toSceneInto({ x: t.km[0], y: t.km[1], z: t.km[2] }, 'sun-inertial', _tw, stage.tMs)) {
            _tw.applyMatrix4(info.camera.matrixWorldInverse).normalize();
            setExtraHole(t.id, { dir: [_tw.x, _tw.y, _tw.z], radius: 16 * gu.uPixAng.value, k });
          } else setExtraHole(t.id, null);
        }
      }
    },
    ready: () => lightState !== 'loading' && frontState !== 'loading' && detailState !== 'loading',
    stats: () => ({
      level, share: Math.round(last.gas * 100) / 100, photo: Math.round(last.photo * 100) / 100, stars: Math.round(last.stars * 100) / 100,
      light: lightState, detail: detailState, front: frontState, path: cheap ? 'sheet' : 'march', samples, tier: tierNow, palette: palette.mode, points: starCount, meshes: 2,
      textures: (lightTex ? 1 : 0) + (detailTex ? 1 : 0) + (frontTex ? 1 : 0),
      bytes: starBytes + sheetBytes + gasGeo.getAttribute('position').array.byteLength + frontBytes + (lightTex ? Math.round(640 * 497 * 4 * 4 / 3) : 0) + (detailTex ? (Number(DET.px) || 704) ** 2 * 4 : 0),
      camLy: [Math.round(_cam.x * 100) / 100, Math.round(_cam.y * 100) / 100, Math.round(_cam.z * 100) / 100],
    }),
    dispose() {
      holeOff();
      if (stars) stars.geometry.dispose();
      if (sheet) sheet.geometry.dispose();
      gasGeo.dispose();
      gasMat.dispose(); starMat.dispose(); sheetMat.dispose();
      for (const t of [lightTex, detailTex, frontTex]) if (t) t.dispose();
      blank.dispose();
      stars = null; sheet = null;
      if (group.parent) group.parent.remove(group);
    },
  };
}

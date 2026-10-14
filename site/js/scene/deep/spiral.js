// scene/deep/spiral.js -- galaxies from their measured structure: the morphology generator, Andromeda (M31)
// and the Triangulum Galaxy (M33) as heroes (internal spec 0075 stage d, #789; DS-C03 #814, DS-C04 #815).
//
// Contract (the hero shape scene/deep/helix.js's head describes; the coordinator calls nothing else):
//   createHero(THREE, env) -> { group, levels, setLevel(n, share), frame(info), ready(), stats(), dispose() }
//     env = { profile, record, gas }: profile is registry/deepsky-heroes/<id>.yaml (site/js/data/hero-<id>.js)
// and, for scene/galaxy.js (Andromeda at every distance the coordinator does not draw her) and the tests:
//   paramsFor(profile, record) -> params       the profile's sourced layers, or a morphology's defaults
//   generateGalaxy(params, {count, dust, seed}) -> {light, dust, gain, dustGain, rMaxKpc}   pure, seeded
//   discAxes(posKm, frame) -> {major, across, normal, sense}   sun-inertial; `sense` the rotation's sign
//   inDisc(posKm, axes, raDeg, decDeg) -> [x, y] kpc            where a line of sight meets the disc
//   createGalaxyPoints(THREE, params, opts) -> {group, setShare, update, place, dispose, stats}
//   DEFAULTS, SPRITE_AREA, KPC_UNITS
//
// WHY. Until this file Andromeda close up was the Milky Way's own point cloud moved and scaled (the
// deep-space baseline's scenes 13 and 14): somebody else's arms, blown out, labelled Andromeda. Now a
// galaxy is drawn from ITS OWN published numbers. A light profile per part -- a Sersic bulge (deprojected
// after Prugniel & Simien 1997), an exponential disc, logarithmic-spiral arms in segments, a ring of star
// formation, H II knots -- and dust as a second point set that takes light away. Every number is in the
// hero's registry file with its source, or labelled `assumed` or `illustrative` there when nobody has
// published it (the arms' pitch, the disc's thickness). The stars are STATISTICAL: 24 000 to 90 000
// points stand for a few hundred billion, each a patch of the galaxy's light, never a star of its own.
//
// ONE POSE, THREE DRAWINGS, NO POP. Far off it is a point (the mark); along our line of sight it is its
// photograph (scene/nebulae.js), which fades as the camera leaves that line or comes too close; the model
// takes over by exactly the share the photograph gives up, at the same place, size and tilt (the disc's
// position angle and inclination are the photograph's own, so the hand-over keeps the pose). Circling it
// shows the disc foreshorten as a disc does, because it is one: points in three dimensions, not a card.
//
// EXPOSED BY PROJECTED DENSITY. A point is a patch of light of a fixed physical size, so the surface
// brightness on screen is the same at every distance (the patch's size in pixels follows 1/d; when it is
// held at a minimum size its light is divided by the area it was given, and the faintest are thinned at
// random rather than lost in an 8-bit framebuffer). The dynamic range is compressed like a photograph's
// stretch: each point's light is divided by a power of the face-on density round it, so a bulge a hundred
// times brighter than its disc draws a few times brighter, not a white disc. A disc seen edge on is
// brighter by its path length; that is kept in part (the power 0.6 of |cos|), so the dust line still
// reads. The light is normalised so the brightest face-on patch draws at 0.85 of white, under the
// shutter's own number (scene/exposure.js `milkyWay`, as the Milky Way model and the glows).
//
// DUST IN FRONT, NOT BEHIND. The light is two buffers split by the disc's mid-plane, drawn far half,
// then the dust (CustomBlending One / OneMinusSrcAlpha with no colour: it only takes light away), then the
// near half. So the dust lanes darken the bulge's far half and not its near half, and the near side of an
// inclined disc reads darker, as photographs show. Three draw calls; no pass, no render target.
//
// Under the Measured look (scene/exposure.js) a model is drawn as it is: UNDER_MEASURED is `same`.
import { stage } from '../stage.js';
import { discFrame } from '../../data/deepsky.js';
import { ANDROMEDA_LINK } from '../galaxy.js';

export const UNDER_MEASURED = 'same';
const D2R = Math.PI / 180;
const LY_KM = 9460730472580.8;
export const KPC_KM = 30856775814913670;
export const KPC_LY = KPC_KM / LY_KM;
export const KPC_UNITS = KPC_LY / 100;          // the hero's object units (100 ly) in a kiloparsec
const OBLIQUITY = 23.4392911 * D2R;
const PATCH_MAX_KPC = 0.6;                      // aMeta.x is a patch's size as a share of this
const SPRITE_SIGMA = 0.18;
/** The integral of the sprite's Gaussian over its point, as a share of the point's square. */
export const SPRITE_AREA = 2 * Math.PI * SPRITE_SIGMA * SPRITE_SIGMA * (1 - Math.exp(-0.25 / (2 * SPRITE_SIGMA * SPRITE_SIGMA)));
const PEAK = 0.85;                              // the brightest face-on patch, of white
const DUST_PEAK = 0.55;                         // the darkest face-on dust patch takes this share
const STRETCH = 0.6;                            // light divided by (face-on density)^STRETCH
const VIEW_POWER = 0.6;                         // the edge-on path length kept: |cos|^-(1-VIEW_POWER)
const ALPHA_FLOOR = 0.02;                       // below this a point is drawn at it with that chance
const KNOT_KINDS = new Set(['knots', 'landmark']);

// ------------------------------------------------------------------------------------------ geometry
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const comb = (a, ka, b, kb) => [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
/** RA and Dec (J2000) to a sun-inertial (ecliptic J2000) unit vector, as data/parsers.js does. */
export function eqUnit(raDeg, decDeg) {
  const a = raDeg * D2R, d = decDeg * D2R;
  const x = Math.cos(d) * Math.cos(a), y = Math.cos(d) * Math.sin(a), z = Math.sin(d);
  return [x, y * Math.cos(OBLIQUITY) + z * Math.sin(OBLIQUITY), -y * Math.sin(OBLIQUITY) + z * Math.cos(OBLIQUITY)];
}
const compass = (u, word) => {
  const POLE = [0, Math.sin(OBLIQUITY), Math.cos(OBLIQUITY)];
  const east = unit(cross(POLE, u));
  const north = cross(u, east);
  const w = String(word || '').toUpperCase();
  return comb(north, w.includes('N') ? 1 : w.includes('S') ? -1 : 0, east, w.includes('E') ? 1 : w.includes('W') ? -1 : 0);
};

/**
 * The disc's axes in sun-inertial: x the line of nodes (`major`), z the disc's axis (`normal`), y across
 * (z cross x... so x, y, z are right-handed). `sense` is +1 when the disc turns from x toward y, -1 the
 * other way, from the side named as approaching us (`frame.approaching`, a compass word); 0 if unknown.
 */
export function discAxes(posKm, frame = {}) {
  const f = discFrame(posKm, frame.pa_deg, frame.incl_deg, frame.near_side);
  const major = unit(f.major), normal = unit(f.normal);
  const across = cross(normal, major);
  let sense = 0;
  const u = unit([posKm.x, posKm.y, posKm.z]);
  const toward = compass(u, frame.approaching);
  if (Math.hypot(...toward) > 0) {
    const p = comb(toward, 1, normal, -dot(toward, normal));          // the approaching half, in the disc
    const back = [-u[0], -u[1], -u[2]];
    const v = comb(back, 1, normal, -dot(back, normal));              // its motion: toward us, in the disc
    sense = Math.sign(dot(cross(p, v), normal)) || 0;
  }
  return { major, across, normal, sense };
}

/** Where the line of sight to (raDeg, decDeg) meets the disc, in the disc's own kpc (x along the nodes). */
export function inDisc(posKm, axes, raDeg, decDeg) {
  const w = eqUnit(raDeg, decDeg);
  const c = [posKm.x, posKm.y, posKm.z];
  const t = dot(c, axes.normal) / dot(w, axes.normal);
  const d = comb(w, t, c, -1);
  return [dot(d, axes.major) / KPC_KM, dot(d, axes.across) / KPC_KM];
}

// --------------------------------------------------------------------------------------- the profiles
/**
 * A morphology's defaults, in units of R25 (half the catalogue's major axis): so no galaxy is a copy of
 * another, and a galaxy with no profile of its own still gets its kind's shape, size and tilt. These are
 * ILLUSTRATIVE shapes of a kind, not any galaxy's measurement.
 */
export const DEFAULTS = {
  spiral: [
    { kind: 'bulge', sersic_n: 2.5, re: 0.06, q: 0.8, light: 0.2, colour: '#ffd9b0' },
    { kind: 'disc', scale: 0.27, height: 0.025, r_max: 1.3, light: 0.55, arm_contrast: 0.2, colour: '#e6e0d6' },
    { kind: 'arms', count: 2, pitch_deg: 15, r_from: 0.12, r_to: 1.0, width: 0.035, height: 0.012, segments: 0.7, light: 0.2, colour: '#b4c8ff' },
    { kind: 'knots', count: 300, in_ring: 0, size: 0.004, light: 0.03, colour: '#ff8c9c' },
    { kind: 'dust-lanes', inset: 0.02, width: 0.02, height: 0.006, weight: 0.7 },
    { kind: 'dust-disc', scale: 0.35, height: 0.006, weight: 0.3 },
  ],
  'barred-spiral': [
    { kind: 'bulge', sersic_n: 2, re: 0.05, q: 0.8, light: 0.15, colour: '#ffd9b0' },
    { kind: 'bar', length: 0.3, width: 0.07, light: 0.1, colour: '#ffe2bd' },
    { kind: 'disc', scale: 0.27, height: 0.025, r_max: 1.3, light: 0.5, arm_contrast: 0.2, colour: '#e6e0d6' },
    { kind: 'arms', count: 2, pitch_deg: 14, r_from: 0.3, r_to: 1.0, width: 0.035, height: 0.012, segments: 0.8, light: 0.22, colour: '#b4c8ff' },
    { kind: 'knots', count: 300, in_ring: 0, size: 0.004, light: 0.03, colour: '#ff8c9c' },
    { kind: 'dust-lanes', inset: 0.02, width: 0.02, height: 0.006, weight: 0.8 },
  ],
  lenticular: [
    { kind: 'bulge', sersic_n: 3, re: 0.1, q: 0.75, light: 0.45, colour: '#ffd6a8' },
    { kind: 'disc', scale: 0.3, height: 0.05, r_max: 1.2, light: 0.55, arm_contrast: 0, colour: '#f2e2cc' },
    { kind: 'dust-disc', scale: 0.2, height: 0.005, weight: 0.2 },
  ],
  elliptical: [
    { kind: 'bulge', sersic_n: 4, re: 0.35, q: 0.7, light: 1, colour: '#ffd3a2' },
  ],
  irregular: [
    { kind: 'disc', scale: 0.4, height: 0.12, r_max: 1.1, light: 0.55, arm_contrast: 0, colour: '#dfe2ee' },
    { kind: 'clumps', count: 9, size: 0.12, light: 0.37, colour: '#c2d2ff' },
    { kind: 'knots', count: 200, in_ring: 0, size: 0.006, light: 0.08, colour: '#ff8c9c' },
    { kind: 'dust-disc', scale: 0.5, height: 0.05, weight: 0.15 },
  ],
};
DEFAULTS['barred-irregular'] = DEFAULTS.irregular;
DEFAULTS['dwarf-spheroidal'] = [{ kind: 'bulge', sersic_n: 1, re: 0.5, q: 0.8, light: 1, colour: '#f3dcc0' }];

const SCALED = ['re', 'scale', 'height', 'r_max', 'r_from', 'r_to', 'width', 'size', 'length', 'inset', 'radius'];
const recordR25Kpc = (record) => {
  const md = (record && record.meta) || {};
  return md.sizeLy > 0 ? md.sizeLy / 2 / KPC_LY : 15;
};

/**
 * The generator's input: the hero profile's own layers (in kpc, with their sources) when it has them,
 * else the defaults of the record's morphology scaled to its catalogue size and tilted as its catalogue
 * ellipse implies. Pure.
 */
export function paramsFor(profile, record) {
  const md = (record && record.meta) || {};
  const own = profile && Array.isArray(profile.layers) ? profile.layers.filter((l) => l && l.kind && l.kind !== 'gas' && l.kind !== 'satellites') : [];
  const frame = { ...((profile && profile.frame) || {}) };
  if (!Number.isFinite(frame.pa_deg)) frame.pa_deg = Number.isFinite(md.posAngDeg) ? md.posAngDeg : 0;
  if (!Number.isFinite(frame.incl_deg)) {
    const q = md.majAxArcmin > 0 && md.minAxArcmin > 0 ? Math.min(1, md.minAxArcmin / md.majAxArcmin) : 1;
    frame.incl_deg = Math.acos(Math.max(0.1, q)) / D2R;
  }
  const lv = (profile && profile.levels) || {};
  const points = Array.isArray(lv.points) ? lv.points : null;
  if (own.length) return { id: (profile && profile.id) || (record && record.id) || 'galaxy', layers: own, frame, points };
  const morph = DEFAULTS[md.morphology] ? md.morphology : 'spiral';
  const R = recordR25Kpc(record);
  const layers = DEFAULTS[morph].map((l) => {
    const o = { ...l };
    for (const k of SCALED) if (Number.isFinite(o[k])) o[`${k}_kpc`] = o[k] * R;
    return o;
  });
  return { id: (record && record.id) || (profile && profile.id) || 'galaxy', layers, frame, morphology: morph, points };
}

// ------------------------------------------------------------------------------------- the generator
function prng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hexRgb = (h) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(h || ''));
  if (!m) return [0.9, 0.9, 0.9];
  const n = parseInt(m[1], 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const kpc = (l, k, dflt) => (Number.isFinite(l[`${k}_kpc`]) ? l[`${k}_kpc`] : dflt);

/** The Sersic index's constants: b_n (Prugniel & Simien 1997) and the deprojection's p (Lima Neto et al. 1999). */
export function sersicConstants(n) {
  return { b: 2 * n - 1 / 3 + 0.009876 / n, p: 1 - 0.6097 / n + 0.05463 / (n * n) };
}
/** A sampler of the 3D radius of a Prugniel-Simien spheroid (whose projection is Sersic n, Re). */
function spheroidRadius(n, re) {
  const { b, p } = sersicConstants(n);
  const N = 1024, rMax = 8 * re;
  const cdf = new Float64Array(N + 1);
  for (let i = 1; i <= N; i++) {
    const r = (i / N) * rMax;
    const x = r / re;
    cdf[i] = cdf[i - 1] + Math.pow(x, 2 - p) * Math.exp(-b * Math.pow(x, 1 / n));
  }
  for (let i = 0; i <= N; i++) cdf[i] /= cdf[N];
  return (u) => {
    let lo = 0, hi = N;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cdf[m] < u) lo = m; else hi = m; }
    const t = (u - cdf[lo]) / Math.max(1e-12, cdf[hi] - cdf[lo]);
    return ((lo + t) / N) * rMax;
  };
}

/**
 * Generate a galaxy's points from its params. Pure and seeded: the same params and seed give the same
 * bytes. Positions in the disc's own kiloparsecs (x the line of nodes, z the disc's axis).
 *   light: {pos Float32Array(3n), col Uint8Array(4n) rgb + light, meta Uint8Array(4n) patch, disc-ness,
 *           a random byte (for thinning), kind index; count; kinds: the layer kind per index}
 *   dust:  {pos, meta (patch, 1, random, 0), tau Uint8Array(n); count}
 *   gain, dustGain: the normalisation (face-on, brightest patch at PEAK, darkest dust at DUST_PEAK)
 */
export function generateGalaxy(params, { count = 60000, dust = 0.3, seed = 7 } = {}) {
  const rnd = prng(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(Math.max(1e-12, rnd()))) * Math.cos(2 * Math.PI * rnd());
  const laplace = (h) => (rnd() < 0.5 ? -1 : 1) * h * -Math.log(Math.max(1e-12, rnd()));
  const sense = params.sense || 1;
  const lightLayers = params.layers.filter((l) => !String(l.kind).startsWith('dust'));
  const dustLayers = params.layers.filter((l) => String(l.kind).startsWith('dust'));
  const armsLayer = lightLayers.find((l) => l.kind === 'arms') || null;
  const ringLayer = lightLayers.find((l) => l.kind === 'ring') || null;
  const discLayer = lightLayers.find((l) => l.kind === 'disc') || null;
  let rMax = 0;
  for (const l of lightLayers) rMax = Math.max(rMax, kpc(l, 'r_max', 0), kpc(l, 'r_to', 0) * 1.1, (kpc(l, 'radius', 0) + 3 * kpc(l, 'width', 0)) || 0, kpc(l, 're', 0) * 6);
  rMax = Math.max(rMax, 1);
  const arm = armsLayer ? {
    m: Math.max(1, Math.round(armsLayer.count || 2)),
    tanP: Math.tan(Math.max(2, Number(armsLayer.pitch_deg) || 12) * D2R),
    r0: Math.max(0.1, kpc(armsLayer, 'r_from', 1)),
    phase: Number.isFinite(armsLayer.phase_deg) ? armsLayer.phase_deg * D2R : 0,
  } : null;
  const armPhi = (R, k) => arm.phase + (2 * Math.PI * k) / arm.m - sense * Math.log(Math.max(1e-3, R) / arm.r0) / arm.tanP;
  // the ring's split (an M32 encounter, Gordon et al. 2006) and its centre's offset
  const ring = ringLayer ? {
    R: kpc(ringLayer, 'radius', 10), w: kpc(ringLayer, 'width', 0.7),
    off: params.ringOffset || [0, 0],
    splitPhi: Number.isFinite(params.ringSplitPhi) ? params.ringSplitPhi : null,
    splitHalf: (Number(ringLayer.split_half_deg) || 35) * D2R, splitSep: kpc(ringLayer, 'split_sep', 1.6),
  } : null;
  const ringPoint = (narrow = 1) => {
    const phi = rnd() * 2 * Math.PI;
    let R = ring.R + gauss() * ring.w * narrow;
    if (ring.splitPhi !== null) {
      let dphi = Math.atan2(Math.sin(phi - ring.splitPhi), Math.cos(phi - ring.splitPhi));
      if (Math.abs(dphi) < ring.splitHalf) {
        const open = Math.cos((dphi / ring.splitHalf) * Math.PI / 2);
        R += (rnd() < 0.5 ? -1 : 1) * 0.5 * ring.splitSep * open;
      }
    }
    return [ring.off[0] + R * Math.cos(phi), ring.off[1] + R * Math.sin(phi)];
  };
  const armPoint = (rFrom, rTo, scale, width, segments) => {
    for (let tries = 0; tries < 64; tries++) {
      const R = rFrom + (rTo - rFrom) * rnd();
      if (rnd() > Math.exp(-(R - rFrom) / scale)) continue;
      const k = Math.floor(rnd() * arm.m);
      // in segments (Gordon et al. 2006: "not continuous but composed of spiral segments")
      if (segments < 1) {
        const s = (Math.log(R / arm.r0) * 2.2 + k * 0.37 + (params.segmentSeed || 0)) % 1;
        if ((s + 1) % 1 > segments) continue;
      }
      const phi = armPhi(R, k);
      const x = R * Math.cos(phi), y = R * Math.sin(phi);
      const nx = Math.cos(phi), ny = Math.sin(phi);
      const off = gauss() * width;
      return [x + nx * off, y + ny * off, R, phi];
    }
    return null;
  };

  // How many points each part gets: light^0.7, so faint parts are not left as a scatter.
  const own = lightLayers.map((l) => ({ l, n: Number.isFinite(l.count) && KNOT_KINDS.has(l.kind) ? Math.round(l.count) : 0 }));
  const fixed = own.reduce((s, o) => s + o.n, 0);
  const free = own.filter((o) => !o.n && o.l.kind !== 'clumps');
  const clumps = own.filter((o) => o.l.kind === 'clumps');
  const wsum = [...free, ...clumps].reduce((s, o) => s + Math.pow(Math.max(1e-4, o.l.light || 0.1), 0.7), 0) || 1;
  const rest = Math.max(0, count - Math.min(fixed, count * 0.2));
  for (const o of [...free, ...clumps]) o.n = Math.max(50, Math.round(rest * Math.pow(Math.max(1e-4, o.l.light || 0.1), 0.7) / wsum));
  for (const o of own) if (KNOT_KINDS.has(o.l.kind)) o.n = Math.min(o.n, Math.round(count * 0.2));
  const n = own.reduce((s, o) => s + o.n, 0);
  const pos = new Float32Array(n * 3);
  const col = new Uint8Array(n * 4);
  const meta = new Uint8Array(n * 4);
  const f0 = new Float64Array(n);
  const patchKpc = new Float32Array(n);
  const isKnot = new Uint8Array(n);
  const kinds = [];
  let i = 0;
  const put = (x, y, z, rgb, flux, patch, disc, kind, knot = 0) => {
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    const jitter = 0.94 + 0.12 * rnd();
    col[i * 4] = Math.min(255, Math.round(rgb[0] * jitter * 255));
    col[i * 4 + 1] = Math.min(255, Math.round(rgb[1] * jitter * 255));
    col[i * 4 + 2] = Math.min(255, Math.round(rgb[2] * jitter * 255));
    f0[i] = flux; patchKpc[i] = patch; isKnot[i] = knot;
    meta[i * 4] = Math.max(1, Math.min(255, Math.round((patch / PATCH_MAX_KPC) * 255)));
    meta[i * 4 + 1] = disc ? 255 : 0;
    meta[i * 4 + 2] = Math.floor(rnd() * 256);
    meta[i * 4 + 3] = kind;
    i += 1;
  };
  const mean = (rMax / 60);   // a disc patch: about a sixtieth of the galaxy's radius
  for (const { l, n: m } of own) {
    const rgb = hexRgb(l.colour);
    const flux = (l.light || 0.1) / m;
    const kind = kinds.length; kinds.push(l.kind);
    if (l.kind === 'bulge') {
      const re = kpc(l, 're', 1), q = Number(l.q) || 0.8;
      const sample = spheroidRadius(Number(l.sersic_n) || 2, re);
      for (let j = 0; j < m; j++) {
        const r = sample(rnd());
        const cz = 2 * rnd() - 1, ph = 2 * Math.PI * rnd(), sz = Math.sqrt(1 - cz * cz);
        put(r * sz * Math.cos(ph), r * sz * Math.sin(ph), r * cz * q, rgb, flux, Math.max(0.03, Math.min(mean, re * 0.25 + r * 0.08)), 0, kind);
      }
    } else if (l.kind === 'bar') {
      const len = kpc(l, 'length', 3), w = kpc(l, 'width', 0.7);
      for (let j = 0; j < m; j++) put(gauss() * len * 0.5, gauss() * w, gauss() * w * 0.6, rgb, flux, mean * 0.8, 1, kind);
    } else if (l.kind === 'disc') {
      const rd = kpc(l, 'scale', 5), hz = kpc(l, 'height', 0.4), rm = kpc(l, 'r_max', 4 * rd), A = Number(l.arm_contrast) || 0;
      for (let j = 0; j < m; j++) {
        let x = 0, y = 0;
        for (let t = 0; t < 32; t++) {
          const R = -rd * Math.log(Math.max(1e-12, rnd() * rnd()));
          if (R > rm) continue;
          const phi = 2 * Math.PI * rnd();
          if (arm && A > 0) {
            const w = Math.cos(arm.m * (phi - armPhi(R, 0)));
            if (rnd() * (1 + A) > 1 + A * w) continue;
          }
          x = R * Math.cos(phi); y = R * Math.sin(phi); break;
        }
        put(x, y, laplace(hz), rgb, flux, mean, 1, kind);
      }
    } else if (l.kind === 'arms' && arm) {
      const from = kpc(l, 'r_from', 2), to = kpc(l, 'r_to', 15), w = kpc(l, 'width', 0.6), hz = kpc(l, 'height', 0.2);
      const scale = kpc(l, 'scale', discLayer ? kpc(discLayer, 'scale', 5) * 1.3 : 6);
      const seg = Number.isFinite(l.segments) ? l.segments : 1;
      for (let j = 0; j < m; j++) {
        const p = armPoint(from, to, scale, w, seg) || [0, 0];
        put(p[0], p[1], laplace(hz), rgb, flux, mean * 0.7, 1, kind);
      }
    } else if (l.kind === 'ring' && ring) {
      const hz = kpc(l, 'height', 0.2);
      for (let j = 0; j < m; j++) { const p = ringPoint(); put(p[0], p[1], laplace(hz), rgb, flux, mean * 0.7, 1, kind); }
    } else if (l.kind === 'clumps') {
      const cn = Math.max(1, Math.round(l.count || 6)), size = kpc(l, 'size', 1);
      const rd = discLayer ? kpc(discLayer, 'scale', 3) : 3;
      const centres = [];
      for (let c = 0; c < cn; c++) { const R = -rd * Math.log(Math.max(1e-6, rnd() * rnd())) * 0.8; const ph = 2 * Math.PI * rnd(); centres.push([R * Math.cos(ph), R * Math.sin(ph), size * (0.5 + rnd())]); }
      for (let j = 0; j < m; j++) { const c = centres[j % cn]; put(c[0] + gauss() * c[2], c[1] + gauss() * c[2], gauss() * c[2] * 0.4, rgb, flux, mean * 0.7, 1, kind); }
    } else if (KNOT_KINDS.has(l.kind)) {
      // H II regions: in the ring and along the arms (catalogue statistics), or one named landmark
      const size = kpc(l, 'size', 0.05), hz = kpc(l, 'height', 0.05);
      const at = l.kind === 'landmark' && Array.isArray(params.landmarks) ? params.landmarks.find((p) => p.name === l.name) : null;
      for (let j = 0; j < m; j++) {
        let p;
        if (at) { const rad = kpc(l, 'radius', 0.2); p = [at.xy[0] + gauss() * rad * 0.5, at.xy[1] + gauss() * rad * 0.5]; }
        else if (ring && rnd() < (Number(l.in_ring) || 0)) p = ringPoint(0.6);
        else if (arm) { const a = armPoint(kpc(armsLayer, 'r_from', 2), kpc(armsLayer, 'r_to', 15), kpc(armsLayer, 'scale', 6), kpc(armsLayer, 'width', 0.6) * 0.6, 1); p = a || [0, 0]; }
        else { const R = (discLayer ? kpc(discLayer, 'scale', 3) : 3) * -Math.log(Math.max(1e-9, rnd() * rnd())); const ph = 2 * Math.PI * rnd(); p = [R * Math.cos(ph), R * Math.sin(ph)]; }
        put(p[0], p[1], laplace(hz), rgb, flux, size, 1, kind, 1);
      }
    }
  }

  // EXPOSED BY PROJECTED DENSITY: a face-on grid of light x patch area, smoothed, then each point's light
  // divided by its cell's to the power STRETCH (the knots keep their own light times the local factor).
  const G = 96, cell = (2 * rMax) / G, area = cell * cell;
  const cellOf = (x, y) => { const cx = Math.floor((x + rMax) / cell), cy = Math.floor((y + rMax) / cell); return cx >= 0 && cy >= 0 && cx < G && cy < G ? cy * G + cx : -1; };
  const raw = new Float64Array(G * G);
  for (let j = 0; j < n; j++) { if (isKnot[j]) continue; const c = cellOf(pos[j * 3], pos[j * 3 + 1]); if (c >= 0) raw[c] += f0[j] * patchKpc[j] * patchKpc[j] / area; }
  const smooth = new Float64Array(G * G);
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
    let s = 0, k = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= G || yy >= G) continue; s += raw[yy * G + xx]; k++; }
    smooth[y * G + x] = s / k;
  }
  const nz = [...smooth].filter((v) => v > 0).sort((a, b) => a - b);
  const ref = nz.length ? nz[Math.floor(nz.length / 2)] : 1;
  const flux = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    const c = cellOf(pos[j * 3], pos[j * 3 + 1]);
    const s = c >= 0 && smooth[c] > 0 ? smooth[c] : ref;
    flux[j] = f0[j] * Math.min(6, Math.max(0.05, Math.pow(s / ref, -STRETCH)));
  }
  // The normalisation: the brightest face-on patch (99.5th percentile of the cells) at PEAK.
  const shown = new Float64Array(G * G);
  for (let j = 0; j < n; j++) { const c = cellOf(pos[j * 3], pos[j * 3 + 1]); if (c >= 0) shown[c] += SPRITE_AREA * flux[j] * patchKpc[j] * patchKpc[j] / area; }
  const lit = [...shown].filter((v) => v > 0).sort((a, b) => a - b);
  const top = lit.length ? lit[Math.min(lit.length - 1, Math.floor(lit.length * 0.995))] : 1;
  const fmax = flux.reduce((m, v) => Math.max(m, v), 0) || 1;
  for (let j = 0; j < n; j++) col[j * 4 + 3] = Math.max(1, Math.round((flux[j] / fmax) * 255));
  const gain = (PEAK / top) * fmax;

  // DUST: in the mid-plane, along the arms' inner edges, in rings, and a thin disc.
  const dn = dustLayers.length ? Math.round(n * dust) : 0;
  const dpos = new Float32Array(dn * 3), dmeta = new Uint8Array(dn * 4), dtau = new Uint8Array(dn);
  const wsumD = dustLayers.reduce((s, l) => s + (Number(l.weight) || 0.3), 0) || 1;
  let di = 0;
  const dpatch = mean * 1.4;
  const dput = (x, y, z, tau = 1) => {
    if (di >= dn) return;
    dpos[di * 3] = x; dpos[di * 3 + 1] = y; dpos[di * 3 + 2] = z;
    dmeta[di * 4] = Math.max(1, Math.min(255, Math.round((dpatch / PATCH_MAX_KPC) * 255)));
    dmeta[di * 4 + 1] = 255; dmeta[di * 4 + 2] = Math.floor(rnd() * 256); dmeta[di * 4 + 3] = 0;
    dtau[di] = Math.max(1, Math.min(255, Math.round(tau * 200)));
    di += 1;
  };
  for (const l of dustLayers) {
    const m = Math.round(dn * (Number(l.weight) || 0.3) / wsumD);
    const hz = kpc(l, 'height', 0.1);
    for (let j = 0; j < m; j++) {
      if (l.kind === 'dust-lanes' && arm) {
        const p = armPoint(kpc(armsLayer, 'r_from', 2), kpc(armsLayer, 'r_to', 15), kpc(armsLayer, 'scale', 6), kpc(l, 'width', 0.3), 1);
        if (!p) continue;
        const inset = kpc(l, 'inset', 0.4);
        dput(p[0] - Math.cos(p[3]) * inset, p[1] - Math.sin(p[3]) * inset, laplace(hz));
      } else if (l.kind === 'dust-ring') {
        const radii = Array.isArray(l.radius_kpc) ? l.radius_kpc : [kpc(l, 'radius', 10)];
        const R0 = radii[j % radii.length], w = kpc(l, 'width', 0.6);
        const off = Array.isArray(l.offset_xy_kpc) ? l.offset_xy_kpc : (ring && Math.abs(R0 - ring.R) < 2 ? ring.off : [0, 0]);
        const ph = 2 * Math.PI * rnd(), R = R0 + gauss() * w;
        dput(off[0] + R * Math.cos(ph), off[1] + R * Math.sin(ph), laplace(hz), Number(l.strength) || 1);
      } else if (l.kind === 'dust-disc') {
        const rd = kpc(l, 'scale', 5), rm = discLayer ? kpc(discLayer, 'r_max', 4 * rd) : 4 * rd;
        let R = -rd * Math.log(Math.max(1e-12, rnd() * rnd()));
        if (R > rm) R = rm * rnd();
        const ph = 2 * Math.PI * rnd();
        dput(R * Math.cos(ph), R * Math.sin(ph), laplace(hz), 0.6);
      }
    }
  }
  let dustGain = 0;
  if (di > 0) {
    const dcell = new Float64Array(G * G);
    for (let j = 0; j < di; j++) { const c = cellOf(dpos[j * 3], dpos[j * 3 + 1]); if (c >= 0) dcell[c] += SPRITE_AREA * (dtau[j] / 255) * dpatch * dpatch / area; }
    const dv = [...dcell].filter((v) => v > 0).sort((a, b) => a - b);
    const dtop = dv.length ? dv[Math.min(dv.length - 1, Math.floor(dv.length * 0.97))] : 1;
    dustGain = DUST_PEAK / dtop;
  }
  return {
    light: { pos, col, meta, count: n, kinds },
    dust: { pos: dpos.subarray(0, di * 3), meta: dmeta.subarray(0, di * 4), tau: dtau.subarray(0, di), count: di },
    gain, dustGain, rMaxKpc: rMax,
  };
}

// ------------------------------------------------------------------------- the Milky Way's exposure
// scene/galaxy.js's model of our own galaxy (140 292 points from galaxy.bin, not this generator) exposed
// the same way: a stretch by its face-on density, the brightest patch at `peak` (the head of galaxy.js).
export const MW_EXPOSURE = { stretch: 0.5, peak: 0.8, patchKpc: 0.15 };

/**
 * Each point's light, exposed by the face-on density round it: weight x (density / median)^-STRETCH,
 * and the gain that puts the brightest face-on patch (99.5th percentile of 0.25 kpc cells) at PEAK. Pure.
 */
export function exposeByDensity(posKpc, weight, count, centreKpc, normal, { stretch = MW_EXPOSURE.stretch, peak = MW_EXPOSURE.peak, patchKpc = MW_EXPOSURE.patchKpc } = {}) {
  const u = unit(cross(normal, Math.abs(normal[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
  const v = cross(normal, u);
  const G = 128, half = 16, cell = (2 * half) / G, area = cell * cell;
  const cellOf = (i) => {
    const x = posKpc[i * 3] - centreKpc[0], y = posKpc[i * 3 + 1] - centreKpc[1], z = posKpc[i * 3 + 2] - centreKpc[2];
    const a = x * u[0] + y * u[1] + z * u[2], b = x * v[0] + y * v[1] + z * v[2];
    const cx = Math.floor((a + half) / cell), cy = Math.floor((b + half) / cell);
    return cx >= 0 && cy >= 0 && cx < G && cy < G ? cy * G + cx : -1;
  };
  const cells = new Int32Array(count);
  const raw = new Float64Array(G * G);
  for (let i = 0; i < count; i++) { const c = cellOf(i); cells[i] = c; if (c >= 0) raw[c] += weight[i]; }
  const sm = new Float64Array(G * G);
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
    let s = 0, k = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= G || yy >= G) continue; s += raw[yy * G + xx]; k++; }
    sm[y * G + x] = s / k;
  }
  const nz = [...sm].filter((t) => t > 0).sort((p, q) => p - q);
  const ref = nz.length ? nz[Math.floor(nz.length / 2)] : 1;
  const out = new Float32Array(count);
  const shown = new Float64Array(G * G);
  for (let i = 0; i < count; i++) {
    const c = cells[i];
    const k = c >= 0 && sm[c] > 0 ? Math.min(4, Math.max(0.02, Math.pow(sm[c] / ref, -stretch))) : 1;
    out[i] = weight[i] * k;
    if (c >= 0) shown[c] += SPRITE_AREA * out[i] * patchKpc * patchKpc / area;
  }
  const lit = [...shown].filter((t) => t > 0).sort((p, q) => p - q);
  const top = lit.length ? lit[Math.min(lit.length - 1, Math.floor(lit.length * 0.995))] : 1;
  return { weight: out, gain: peak / top, ref };
}


// ------------------------------------------------------------------------------------------ the shaders
const LIGHT_VERT = /* glsl */ `
attribute vec4 aCol;
attribute vec4 aMeta;
uniform float uGain;
uniform float uViewH;
uniform float uMinPx;
uniform float uMaxPx;
uniform float uOutside;
uniform vec3 uNormalW;
varying vec3 vCol;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  float scale = length( modelViewMatrix[0].xyz );
  float d = max( 1e-9, -mv.z );
  float focal = projectionMatrix[1][1] * 0.5 * uViewH;
  float ideal = aMeta.x * ${PATCH_MAX_KPC.toFixed(3)} * scale / d * focal;
  float s = clamp( ideal, uMinPx, uMaxPx );
  // a patch held bigger than it is keeps its light, spread wider; one held smaller does not grow brighter
  float a = aCol.a * uGain * min( 1.0, ( ideal * ideal ) / ( s * s ) );
  // the edge-on path length, kept in part (the head of scene/deep/spiral.js)
  vec3 nV = normalize( ( viewMatrix * vec4( uNormalW, 0.0 ) ).xyz );
  float c = abs( dot( normalize( mv.xyz ), nV ) );
  a *= mix( 1.0, pow( max( c, 0.06 ), ${VIEW_POWER.toFixed(2)} ), aMeta.y * uOutside );
  // too faint for the framebuffer's 8 bits: drawn at the floor, by chance in proportion
  if ( a < ${ALPHA_FLOOR.toFixed(3)} ) a = aMeta.z * ${ALPHA_FLOOR.toFixed(3)} < a ? ${ALPHA_FLOOR.toFixed(3)} : 0.0;
  vA = min( a, 1.0 );
  vCol = aCol.rgb;
  gl_PointSize = s;
  if ( vA <= 0.0 ) gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 );
}
`;
// Display values, as the deep materials' colour policy says (scene/deep/gasmat.js COLOUR_POLICY).
const LIGHT_FRAG = /* glsl */ `
varying vec3 vCol;
varying float vA;
void main() {
  vec2 q = gl_PointCoord - vec2( 0.5 );
  float r2 = dot( q, q );
  if ( r2 > 0.25 ) discard;
  // additive with alpha 1 (COLOUR_POLICY): the light is in the colour
  gl_FragColor = vec4( vCol * ( vA * exp( -r2 / ${(2 * SPRITE_SIGMA * SPRITE_SIGMA).toFixed(4)} ) ), 1.0 );
}
`;
const DUST_VERT = /* glsl */ `
attribute vec4 aMeta;
attribute float aTau;
uniform float uDust;
uniform float uViewH;
uniform float uMinPx;
uniform float uMaxPx;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  float scale = length( modelViewMatrix[0].xyz );
  float d = max( 1e-9, -mv.z );
  float focal = projectionMatrix[1][1] * 0.5 * uViewH;
  float ideal = aMeta.x * ${PATCH_MAX_KPC.toFixed(3)} * scale / d * focal;
  float s = clamp( ideal, uMinPx, uMaxPx );
  float a = aTau * uDust * min( 1.0, ( ideal * ideal ) / ( s * s ) );
  if ( a < ${ALPHA_FLOOR.toFixed(3)} ) a = aMeta.z * ${ALPHA_FLOOR.toFixed(3)} < a ? ${ALPHA_FLOOR.toFixed(3)} : 0.0;
  vA = min( a, 0.7 );
  gl_PointSize = s;
  if ( vA <= 0.0 ) gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 );
}
`;
// No light of its own: (One, OneMinusSrcAlpha) with black takes a share of what is behind.
const DUST_FRAG = /* glsl */ `
varying float vA;
void main() {
  vec2 q = gl_PointCoord - vec2( 0.5 );
  float r2 = dot( q, q );
  if ( r2 > 0.25 ) discard;
  gl_FragColor = vec4( 0.0, 0.0, 0.0, vA * exp( -r2 / ${(2 * SPRITE_SIGMA * SPRITE_SIGMA).toFixed(4)} ) );
}
`;
export const SHADERS = { light: LIGHT_VERT + LIGHT_FRAG, dust: DUST_VERT + DUST_FRAG };

// scene/galaxy.js's Milky Way points (its head says why): a patch of fixed size, held small it gives up
// its light, from outside the disc an edge-on view keeps part of its path. Not a deep material: the
// model has always drawn through the colour-space chunk, and still does.
const MW_VERT = /* glsl */ `
attribute float aWeight;
attribute vec3 aColour;
uniform float uPixelRatio;
uniform float uGain;
uniform float uUnitsPerKpc;
uniform float uPatchKpc;
uniform float uViewH;
uniform float uOutside;
uniform vec3 uNormalW;
varying vec3 vColour;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  // A point is a patch of galaxy ~150 pc across, its size on screen from the camera's own focal length:
  // held at 1.5 px it gives up the light of the area it lost, held at 6 px it does not grow brighter.
  float d = max( 1e-9, -mv.z );
  float focal = projectionMatrix[1][1] * 0.5 * uViewH;
  float ideal = uPatchKpc * uUnitsPerKpc / d * focal;
  float s = clamp( ideal, 1.5 * uPixelRatio, 6.0 * uPixelRatio );
  float a = aWeight * uGain * min( 1.0, ( ideal * ideal ) / ( s * s ) );
  // From outside the disc, an edge-on view keeps only part of its longer path (the head of this file).
  vec3 nV = normalize( ( viewMatrix * vec4( uNormalW, 0.0 ) ).xyz );
  a *= mix( 1.0, pow( max( abs( dot( normalize( mv.xyz ), nV ) ), 0.06 ), 0.6 ), uOutside );
  // Too faint for an 8-bit framebuffer: drawn at the floor, by chance in proportion.
  if ( a < 0.02 ) a = fract( float( gl_VertexID ) * 0.6180339887 ) * 0.02 < a ? 0.02 : 0.0;
  vAlpha = min( a, 1.0 );
  vColour = aColour;
  gl_PointSize = s;
  if ( vAlpha <= 0.0 ) gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 );
}
`;
const MW_FRAG = /* glsl */ `
varying vec3 vColour;
varying float vAlpha;
#include <common>
void main() {
  vec2 q = gl_PointCoord - vec2( 0.5 );
  float r2 = dot( q, q );
  if ( r2 > 0.25 ) discard;
  gl_FragColor = vec4( vColour, vAlpha * exp( -r2 / ${(2 * SPRITE_SIGMA * SPRITE_SIGMA).toFixed(4)} ) );
  #include <colorspace_fragment>
}
`;

export const MW_SHADERS = { vert: MW_VERT, frag: MW_FRAG };

// ------------------------------------------------------------------------------- placing in the scene
/** Scene-space unit vectors of sun-inertial directions, on the current stage. */
function sceneDirs(dirs) {
  const A = stage.affineFrom('sun-inertial', stage.tMs);
  if (!A) return null;
  return dirs.map((d) => unit([A.x[0] * d[0] + A.y[0] * d[1] + A.z[0] * d[2], A.x[1] * d[0] + A.y[1] * d[1] + A.z[1] * d[2], A.x[2] * d[0] + A.y[2] * d[1] + A.z[2] * d[2]]));
}

/**
 * The points of one galaxy as three draws (far half, dust, near half) under one oriented group in
 * kiloparsecs. `place(posKm, axes, mode)`: mode 'rotate' sets only the turn (the hero's parent is placed
 * and scaled by the coordinator), 'full' also the place and the scale on the stage (scene/galaxy.js).
 */
export function createGalaxyPoints(THREE, params, { count = 60000, dust = 0.3, seed = 7, name = 'galaxy' } = {}) {
  const g = generateGalaxy(params, { count, dust, seed });
  const group = new THREE.Group();
  group.name = name;
  group.matrixAutoUpdate = false;
  const shared = { uViewH: { value: 900 }, uMinPx: { value: 1.5 }, uMaxPx: { value: 40 } };
  const lightU = { ...shared, uGain: { value: 0 }, uOutside: { value: 1 }, uNormalW: { value: new THREE.Vector3(0, 0, 1) } };
  const dustU = { ...shared, uDust: { value: 0 } };
  const halves = [];
  const L = g.light;
  for (const sign of [1, -1]) {
    let m = 0;
    for (let j = 0; j < L.count; j++) if ((L.pos[j * 3 + 2] >= 0) === (sign > 0)) m++;
    const p = new Float32Array(m * 3), c = new Uint8Array(m * 4), t = new Uint8Array(m * 4);
    let k = 0;
    for (let j = 0; j < L.count; j++) {
      if ((L.pos[j * 3 + 2] >= 0) !== (sign > 0)) continue;
      p.set(L.pos.subarray(j * 3, j * 3 + 3), k * 3); c.set(L.col.subarray(j * 4, j * 4 + 4), k * 4); t.set(L.meta.subarray(j * 4, j * 4 + 4), k * 4);
      k++;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    geo.setAttribute('aCol', new THREE.BufferAttribute(c, 4, true));
    geo.setAttribute('aMeta', new THREE.BufferAttribute(t, 4, true));
    const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
      vertexShader: LIGHT_VERT, fragmentShader: LIGHT_FRAG, uniforms: lightU,
      transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    pts.name = `${name}:light${sign > 0 ? '+' : '-'}`;
    pts.frustumCulled = false;
    halves.push({ sign, pts, count: m });
    group.add(pts);
  }
  const D = g.dust;
  let dustPts = null;
  if (D.count) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(D.pos.slice(), 3));
    geo.setAttribute('aMeta', new THREE.BufferAttribute(D.meta.slice(), 4, true));
    geo.setAttribute('aTau', new THREE.BufferAttribute(D.tau.slice(), 1, true));
    dustPts = new THREE.Points(geo, new THREE.ShaderMaterial({
      vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, uniforms: dustU, defines: { GAS_ABSORB: 1 },
      transparent: false, depthTest: false, depthWrite: false, toneMapped: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    }));
    dustPts.name = `${name}:dust`;
    dustPts.frustumCulled = false;
    dustPts.renderOrder = -0.85;
    group.add(dustPts);
  }
  const _m = new THREE.Matrix4();
  const _inv = new THREE.Matrix4();
  const _cam = new THREE.Vector3();
  let share = 0;
  function place(posKm, axes, mode = 'rotate') {
    const dirs = sceneDirs([axes.major, axes.across, axes.normal]);
    if (!dirs) return false;
    const [x, y, z] = dirs;
    _m.set(x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, 0, 0, 0, 1);
    if (mode === 'full') {
      const v = new THREE.Vector3();
      if (!stage.toSceneInto(posKm, 'sun-inertial', v, stage.tMs)) return false;
      const s = KPC_KM / stage.unitKm;
      group.matrix.copy(_m).scale(new THREE.Vector3(s, s, s)).setPosition(v);
    } else {
      group.matrix.copy(_m).scale(new THREE.Vector3(KPC_UNITS, KPC_UNITS, KPC_UNITS));
    }
    group.matrixWorldNeedsUpdate = true;
    lightU.uNormalW.value.set(z[0], z[1], z[2]);
    return true;
  }
  function setShare(k, exposure = 1) {
    share = Math.min(1, Math.max(0, Number(k) || 0));
    lightU.uGain.value = g.gain * share * exposure;
    dustU.uDust.value = g.dustGain * share;
    group.visible = share > 0.002;
  }
  /** Per frame while drawn: the framebuffer's height, the sizes, and which half is in front. */
  function update(camera, viewH, dpr = 1) {
    if (Number.isFinite(viewH) && viewH > 0) shared.uViewH.value = viewH;
    shared.uMinPx.value = 1.5 * dpr;
    shared.uMaxPx.value = 40 * dpr;
    if (!camera) return;
    group.updateMatrixWorld();
    // the normal in the world, for the edge-on term
    const e = group.matrixWorld.elements;
    lightU.uNormalW.value.set(e[8], e[9], e[10]).normalize();
    _inv.copy(group.matrixWorld).invert();
    _cam.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(_inv);
    const above = _cam.z >= 0;
    for (const h of halves) h.pts.renderOrder = (h.sign > 0) === above ? -0.84 : -0.86;
  }
  function dispose() {
    for (const h of halves) { h.pts.geometry.dispose(); h.pts.material.dispose(); }
    if (dustPts) { dustPts.geometry.dispose(); dustPts.material.dispose(); }
    if (group.parent) group.parent.remove(group);
  }
  const bytes = L.count * 20 + D.count * 21;
  return {
    group, place, setShare, update, dispose,
    share: () => share,
    generated: g,
    stats: () => ({ points: L.count, dust: D.count, meshes: dustPts ? 3 : 2, textures: 0, bytes }),
  };
}

// ---------------------------------------------------------------------------------------------- hero
/** How many points on this device's tier: the profile's own table, else the design's (section 8). */
export function pointsFor(params, tier) {
  const t = Math.min(2, Math.max(0, Math.trunc(Number(tier)) || 0));
  const row = params.points;
  if (row && Number.isFinite(row[t])) return row[t];
  return [24000, 60000, 90000][t];
}
/** The parts of a profile that need a place on the sky turned into the disc's own kiloparsecs. */
export function resolveSky(params, posKm, axes) {
  const out = { ...params, sense: axes.sense || params.frame.winding || 1 };
  const ring = params.layers.find((l) => l.kind === 'ring');
  if (ring && ring.split_toward && Number.isFinite(ring.split_toward.ra_deg)) {
    const p = inDisc(posKm, axes, ring.split_toward.ra_deg, ring.split_toward.dec_deg);
    out.ringSplitPhi = Math.atan2(p[1], p[0]);
    const off = Number(ring.offset_kpc) || 0;
    out.ringOffset = [Math.cos(out.ringSplitPhi) * off, Math.sin(out.ringSplitPhi) * off];
  }
  out.landmarks = params.layers.filter((l) => l.kind === 'landmark' && Number.isFinite(l.ra_deg)).map((l) => ({ name: l.name, xy: inDisc(posKm, axes, l.ra_deg, l.dec_deg) }));
  return out;
}
const tierNow = () => { try { const q = globalThis.spaceRadar && globalThis.spaceRadar.quality; const d = q && q.describe ? q.describe() : null; return d && Number.isFinite(d.tier) ? d.tier : 1; } catch (e) { return 1; } };
const viewHNow = () => { try { const r = globalThis.spaceRadar && globalThis.spaceRadar.renderer; return r && r.domElement ? r.domElement.height || 900 : 900; } catch (e) { return 900; } };
const dprNow = () => { try { const r = globalThis.spaceRadar && globalThis.spaceRadar.renderer; return r && r.getPixelRatio ? r.getPixelRatio() : 1; } catch (e) { return 1; } };
/** How much of a record's photograph is drawn now (scene/nebulae.js drawn()); Andromeda's through scene/galaxy.js. */
function photoShare(id) {
  if (id === 'dso-m31') return ANDROMEDA_LINK.photo;
  try { const n = globalThis.spaceRadar && globalThis.spaceRadar.nebulae; return n && n.drawn ? Number(n.drawn(id)) || 0 : 0; } catch (e) { return 0; }
}

export function createHero(THREE, env = {}) {
  const profile = env.profile || {};
  const record = env.record || null;
  const group = new THREE.Group();
  group.name = `deep-hero-${profile.id || 'stub'}`;
  const params0 = paramsFor(profile, record);
  const posKm = record && record.pos ? record.pos : { x: 1e18, y: 0, z: 0 };
  const axes = discAxes(posKm, params0.frame);
  const params = resolveSky(params0, posKm, axes);
  const seed = (profile.levels && profile.levels.seed) || 7;
  const g = createGalaxyPoints(THREE, params, { count: pointsFor(params, tierNow()), dust: profile.levels && Number.isFinite(profile.levels.dust_share) ? profile.levels.dust_share : 0.3, seed, name: group.name });
  group.add(g.group);
  let placedFor = null;
  const orient = () => { if (placedFor !== stage.worldId && g.place(posKm, axes, 'rotate')) placedFor = stage.worldId; };
  orient();
  // A `gas` layer, as the stub heroes build one (scene/deep/gasmat.js): none in M31's or M33's profile.
  const parts = [];
  for (const layer of profile.layers || []) {
    if (!layer || layer.kind !== 'gas' || !env.gas) continue;
    const v = env.gas.createGasMesh(THREE, { name: `${group.name}-${layer.what || 'gas'}`, kind: Number(layer.profile) || 0, colour: layer.colour || [1, 1, 1], noisy: !!layer.noisy });
    group.add(v.mesh);
    parts.push(v);
  }
  const id = profile.record || (record && record.id) || null;
  let level = 0, share = 0;
  return {
    group,
    levels: [2, 3],
    setLevel(n, s = 1) {
      level = n;
      share = n >= 2 ? Math.min(1, Math.max(0, s)) : 0;
      orient();
      // the model draws what the photograph leaves (scene/nebulae.js drawn): the two always sum to one
      g.setShare(share * (1 - Math.min(1, Math.max(0, photoShare(id)))), ANDROMEDA_LINK.exposure);
      if (id === 'dso-m31') ANDROMEDA_LINK.heroShare = share;
      for (const v of parts) v.material.uniforms.uShare.value = share;
      group.visible = share > 0;
    },
    frame(info = {}) {
      g.update(info.camera, viewHNow(), dprNow());
      for (const v of parts) { if (info.camera) v.setCamera(info.camera, 1); v.setLook(info.look, info); }
    },
    ready: () => true,
    stats: () => ({ level, share: Math.round(g.share() * 100) / 100, ...g.stats() }),
    dispose() {
      g.dispose();
      for (const v of parts) v.dispose();
      parts.length = 0;
      if (id === 'dso-m31') ANDROMEDA_LINK.heroShare = 0;
    },
  };
}

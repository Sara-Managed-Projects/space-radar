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
// brighter by its path length; that is kept in part (the power 0.8 of |cos|), so the dust line still
// reads. The light is normalised so the brightest face-on patch draws at 0.7 of white, under the
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
const PATCH_MAX_KPC = 3;                        // aMeta.x is a patch's size as a share of this
const OVERLAP = 10;                             // patches covering any spot of the disc, about
const SPRITE_SIGMA = 0.18;
/** The integral of the sprite's Gaussian over its point, as a share of the point's square. */
export const SPRITE_AREA = 2 * Math.PI * SPRITE_SIGMA * SPRITE_SIGMA * (1 - Math.exp(-0.25 / (2 * SPRITE_SIGMA * SPRITE_SIGMA)));
const PEAK = 0.7;                               // the brightest face-on patch, of white
const DUST_PEAK = 0.55;                         // the darkest face-on dust patch takes this share
const STRETCH = 0.6;                            // light above the median divided by its excess^STRETCH
const VIEW_POWER = 0.8;                         // the edge-on path length kept: |cos|^-(1-VIEW_POWER)
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

  // EXPOSED BY PROJECTED DENSITY (the head of this file). On a face-on grid: how many points stand on
  // each cell (each point's patch is sized so about OVERLAP patches cover any spot: smooth where the
  // points are sparse, fine where they crowd), and how much light (its parts above the median divided by
  // their excess to the power STRETCH, so the bulge is a few times the disc and not a hundred; nothing
  // fainter is lifted, so the outskirts fade as they do). A point's flux is its light over its patch's
  // area, since a patch's light on screen is its alpha times its size squared.
  const G = 96, cell = (2 * rMax) / G, area = cell * cell;
  const cellOf = (x, y) => { const cx = Math.floor((x + rMax) / cell), cy = Math.floor((y + rMax) / cell); return cx >= 0 && cy >= 0 && cx < G && cy < G ? cy * G + cx : -1; };
  const smooth3 = (raw) => {
    const out = new Float64Array(G * G);
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      let t = 0, k = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= G || yy >= G) continue; t += raw[yy * G + xx]; k++; }
      out[y * G + x] = t / k;
    }
    return out;
  };
  const counts = new Float64Array(G * G), lightRaw = new Float64Array(G * G);
  for (let j = 0; j < n; j++) { if (isKnot[j]) continue; const c = cellOf(pos[j * 3], pos[j * 3 + 1]); if (c >= 0) { counts[c] += 1; lightRaw[c] += f0[j] / area; } }
  const perKpc2 = smooth3(counts).map((v) => v / area);
  const sb = smooth3(lightRaw);
  const nz = [...sb].filter((v) => v > 0).sort((x, y) => x - y);
  const ref = nz.length ? nz[Math.floor(nz.length / 2)] : 1;
  const pMin = rMax / 200, pMax = PATCH_MAX_KPC;
  const lum = new Float32Array(n);
  const fl = new Float32Array(n);
  for (let j = 0; j < n; j++) {
    const c = cellOf(pos[j * 3], pos[j * 3 + 1]);
    if (!isKnot[j]) {
      const dens = c >= 0 && perKpc2[c] > 0 ? perKpc2[c] : 1 / area;
      patchKpc[j] = Math.min(pMax, Math.max(pMin, Math.sqrt(OVERLAP / dens)));
    }
    const k = c >= 0 && sb[c] > ref ? Math.pow(sb[c] / ref, -STRETCH) : 1;
    lum[j] = f0[j] * k;
    fl[j] = lum[j] / (patchKpc[j] * patchKpc[j]);
    meta[j * 4] = Math.max(1, Math.min(255, Math.round((patchKpc[j] / PATCH_MAX_KPC) * 255)));
    patchKpc[j] = (meta[j * 4] / 255) * PATCH_MAX_KPC;          // as the GPU will read it
    fl[j] = lum[j] / (patchKpc[j] * patchKpc[j]);
  }
  // The normalisation: the brightest face-on patch (99.5th percentile of the cells) at PEAK.
  const shown = new Float64Array(G * G);
  for (let j = 0; j < n; j++) { const c = cellOf(pos[j * 3], pos[j * 3 + 1]); if (c >= 0) shown[c] += SPRITE_AREA * lum[j] / area; }
  const lit = [...smooth3(shown)].filter((v) => v > 0).sort((x, y) => x - y);
  const top = lit.length ? lit[Math.min(lit.length - 1, Math.floor(lit.length * 0.995))] : 1;
  const gain = PEAK / top;
  for (let j = 0; j < n; j++) col[j * 4 + 3] = 255;

  // DUST: in the mid-plane, along the arms' inner edges, in rings, and a thin disc.
  const dn = dustLayers.length ? Math.round(n * dust) : 0;
  const dpos = new Float32Array(dn * 3), dmeta = new Uint8Array(dn * 4), dtau = new Float32Array(dn);
  const wsumD = dustLayers.reduce((t, l) => t + (Number(l.weight) || 0.3), 0) || 1;
  let di = 0;
  const dput = (x, y, z, tau = 1) => {
    if (di >= dn) return;
    dpos[di * 3] = x; dpos[di * 3 + 1] = y; dpos[di * 3 + 2] = z;
    dmeta[di * 4 + 1] = 255; dmeta[di * 4 + 2] = Math.floor(rnd() * 256); dmeta[di * 4 + 3] = 0;
    dtau[di] = tau;
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
  // The dust's patches the same way (sized by its own crowding), its depth over the patch's area, and
  // the darkest face-on patch (97th percentile) taking DUST_PEAK.
  let dustGain = 0;
  if (di > 0) {
    const dc = new Float64Array(G * G);
    for (let j = 0; j < di; j++) { const c = cellOf(dpos[j * 3], dpos[j * 3 + 1]); if (c >= 0) dc[c] += 1; }
    const dd = smooth3(dc).map((v) => v / area);
    const dcell = new Float64Array(G * G);
    for (let j = 0; j < di; j++) {
      const c = cellOf(dpos[j * 3], dpos[j * 3 + 1]);
      const pk = Math.min(pMax, Math.max(pMin, Math.sqrt(OVERLAP / (c >= 0 && dd[c] > 0 ? dd[c] : 1 / area))));
      dmeta[j * 4] = Math.max(1, Math.min(255, Math.round((pk / PATCH_MAX_KPC) * 255)));
      const p2 = (dmeta[j * 4] / 255) * PATCH_MAX_KPC;
      if (c >= 0) dcell[c] += SPRITE_AREA * dtau[j] / area;
      dtau[j] = dtau[j] / (p2 * p2);
    }
    const dv = [...smooth3(dcell)].filter((v) => v > 0).sort((x, y) => x - y);
    const dtop = dv.length ? dv[Math.min(dv.length - 1, Math.floor(dv.length * 0.97))] : 1;
    dustGain = DUST_PEAK / dtop;
  }
  return {
    light: { pos, col, meta, flux: fl, lum, count: n, kinds },
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
attribute float aFlux;
uniform float uGain;
uniform float uViewH;
uniform float uMinPx;
uniform float uMaxPx;
uniform float uOutside;
uniform float uAlphaCap;
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
  float a = aFlux * uGain * min( 1.0, ( ideal * ideal ) / ( s * s ) );
  // the edge-on path length, kept in part (the head of scene/deep/spiral.js)
  vec3 nV = normalize( ( viewMatrix * vec4( uNormalW, 0.0 ) ).xyz );
  float c = abs( dot( normalize( mv.xyz ), nV ) );
  a *= mix( 1.0, pow( max( c, 0.06 ), ${VIEW_POWER.toFixed(2)} ), aMeta.y * uOutside );
  // too faint for the framebuffer's 8 bits: drawn at the floor, by chance in proportion
  if ( a < ${ALPHA_FLOOR.toFixed(3)} ) a = aMeta.z * ${ALPHA_FLOOR.toFixed(3)} < a ? ${ALPHA_FLOOR.toFixed(3)} : 0.0;
  vA = min( a, uAlphaCap );
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
export const SHADERS_LAYER = {};

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

// ------------------------------------------------------------------------- the integrated light
// THE SMOOTH LAYER (2026-10-15, after the first close-up read as a blotchy carpet). Most of a galaxy's
// light is unresolved: a disc mesh in the disc's own plane carries it as a surface brightness -- the
// exponential disc with the arms and the ring as gentle modulation, the dust rings and the lanes on the
// arms' inner edges as darker bands (stronger in Film than under Measured) -- and a billboard at the
// centre carries the bulge's projected Sersic profile, round from any side. Both are shaded in display
// values through the same stretch, S^LAYER_POWER. The points then add only SPARKLE of the light, as
// small capped dots. Edge on, where a flat layer is a line, the layer gives way to the points and their
// dust, which carry the edge-on view as before.
export const LAYER_POWER = 0.45;
export const LAYER_DISC_AT_RD = 0.2;      // the layer's face-on brightness one scale length out
export const SPARKLE = 0.2;               // the points' share of the light where the layer is drawn
const lanczos = (z) => {
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * lanczos(1 - z));
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
};
/**
 * The layer's numbers from the same params the points come from. Pure. Surface brightnesses are in
 * light per kpc^2 for a galaxy of total light 1 (the layers' `light` shares).
 */
export function layerProfile(params) {
  const L = params.layers;
  const bulge = L.find((l) => l.kind === 'bulge'), disc = L.find((l) => l.kind === 'disc');
  const arms = L.find((l) => l.kind === 'arms'), ring = L.find((l) => l.kind === 'ring');
  const rd = disc ? kpc(disc, 'scale', 5) : 5;
  const rMax = disc ? kpc(disc, 'r_max', 4 * rd) : 4 * rd;
  const i0 = disc ? (disc.light || 0.5) / (2 * Math.PI * rd * rd) : 0;
  let b = null;
  if (bulge) {
    const n = Number(bulge.sersic_n) || 2, re = kpc(bulge, 're', 1);
    const { b: bn } = sersicConstants(n);
    const ie = (bulge.light || 0.2) / (2 * Math.PI * n * re * re * Math.exp(bn) * Math.pow(bn, -2 * n) * lanczos(2 * n));
    b = { n, re, b: bn, ie, colour: hexRgb(bulge.colour) };
  }
  const r = ring ? { r: kpc(ring, 'radius', 10), w: kpc(ring, 'width', 0.7), i: (ring.light || 0.1) / (2 * Math.PI * kpc(ring, 'radius', 10) * kpc(ring, 'width', 0.7) * Math.sqrt(2 * Math.PI)), off: params.ringOffset || [0, 0], split: Number.isFinite(params.ringSplitPhi) ? params.ringSplitPhi : 99, half: (Number(ring.split_half_deg) || 35) * D2R, sep: kpc(ring, 'split_sep', 1.6), colour: hexRgb(ring.colour) } : null;
  const a = arms ? { m: Math.max(1, Math.round(arms.count || 2)), tanP: Math.tan(Math.max(2, Number(arms.pitch_deg) || 12) * D2R), r0: kpc(arms, 'r_from', 1), r1: kpc(arms, 'r_to', rMax), phase: Number.isFinite(arms.phase_deg) ? arms.phase_deg * D2R : 0, contrast: Math.min(2, Math.max(0.3, 3 * (arms.light || 0.1) / Math.max(0.05, disc ? disc.light : 0.5))), segments: Number.isFinite(arms.segments) ? arms.segments : 1, colour: hexRgb(arms.colour) } : null;
  const dl = L.filter((l) => l.kind === 'dust-ring');
  const radii = [], widths = [], amps = [];
  for (const l of dl) for (const R of (Array.isArray(l.radius_kpc) ? l.radius_kpc : [kpc(l, 'radius', 10)])) { if (radii.length < 4 && R > 1.5) { radii.push(R); widths.push(kpc(l, 'width', 0.6)); amps.push(Math.min(1, (Number(l.weight) || 0.3) * 1.6)); } }
  while (radii.length < 4) { radii.push(-100); widths.push(1); amps.push(0); }
  const lanes = L.find((l) => l.kind === 'dust-lanes');
  const gain = i0 > 0 ? LAYER_DISC_AT_RD / Math.pow(i0 * Math.exp(-1), LAYER_POWER) : 1;
  return {
    rd, rMax, i0, bulge: b, ring: r, arms: a, gain, sense: params.sense || 1,
    dust: { radii, widths, amps, lane: lanes ? Math.min(1, (Number(lanes.weight) || 0.4) * 1.5) : 0, inset: lanes ? kpc(lanes, 'inset', 0.4) : 0.4 },
    colours: { inner: hexRgb(disc && disc.colour), outer: hexRgb(disc && (disc.colour_outer || disc.colour)) },
    segSeed: params.segmentSeed || 0,
  };
}
/** The layer's face-on light (before the stretch) and its dust share at (x, y) kpc: the GLSL mirrored. */
export function layerAt(prof, x, y, dustK = 1) {
  const R = Math.hypot(x, y), phi = Math.atan2(y, x);
  let light = prof.i0 * Math.exp(-R / prof.rd) * Math.min(1, Math.max(0, (prof.rMax - R) / (0.2 * prof.rMax)));
  let armShape = 0, lane = 0;
  if (prof.arms) {
    const A = prof.arms;
    const win = Math.min(1, Math.max(0, (R - A.r0 * 0.7) / (A.r0 * 0.3))) * Math.min(1, Math.max(0, (A.r1 * 1.1 - R) / (A.r1 * 0.2)));
    for (let k = 0; k < A.m; k++) {
      const ph = A.phase + (2 * Math.PI * k) / A.m - prof.sense * Math.log(Math.max(1e-3, R) / A.r0) / A.tanP;
      const ph2 = A.phase + (2 * Math.PI * k) / A.m - prof.sense * Math.log(Math.max(1e-3, R + prof.dust.inset) / A.r0) / A.tanP;
      const sv = (((Math.log(Math.max(1e-3, R) / A.r0) * 2.2 + k * 0.37 + prof.segSeed) % 1) + 1) % 1;
      const seg = A.segments < 1 ? (sv < A.segments ? 1 : 0.35) : 1;
      armShape += Math.pow(Math.max(0, Math.cos(phi - ph)), 6) * seg;
      lane += Math.pow(Math.max(0, Math.cos(phi - ph2)), 12) * seg;
    }
    armShape *= win; lane *= win;
    light *= 1 + A.contrast * armShape;
  }
  if (prof.ring) {
    const G = prof.ring;
    const rx = x - G.off[0], ry = y - G.off[1], Rr = Math.hypot(rx, ry);
    const dphi = Math.atan2(Math.sin(Math.atan2(ry, rx) - G.split), Math.cos(Math.atan2(ry, rx) - G.split));
    const open = Math.abs(dphi) < G.half ? Math.cos((dphi / G.half) * Math.PI / 2) : 0;
    const g = (d) => Math.exp(-(d * d) / (2 * G.w * G.w));
    light += G.i * (open > 0 ? 0.5 * (g(Rr - G.r - 0.5 * G.sep * open) + g(Rr - G.r + 0.5 * G.sep * open)) : g(Rr - G.r));
  }
  let rings = 0;
  for (let k = 0; k < 4; k++) { const d = R - prof.dust.radii[k]; rings += prof.dust.amps[k] * Math.exp(-(d * d) / (2 * prof.dust.widths[k] * prof.dust.widths[k])); }
  const dust = Math.min(0.75, dustK * (0.45 * rings + 0.55 * prof.dust.lane * lane));
  return { light, dust, armShape };
}

const LAYER_VERT = /* glsl */ `
varying vec2 vLocal;
varying vec3 vView;
void main() {
  vLocal = position.xy;
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vView = cameraPosition - wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
const LAYER_FRAG = /* glsl */ `
uniform float uGain;
uniform float uI0;
uniform float uRd;
uniform float uRMax;
uniform float uSense;
uniform float uArmM;
uniform float uArmTanP;
uniform float uArmR0;
uniform float uArmR1;
uniform float uArmPhase;
uniform float uArmC;
uniform float uArmSeg;
uniform float uSegSeed;
uniform vec4 uRing;          // radius, width, peak, split half-angle
uniform vec4 uRing2;         // offset x, y, split azimuth, split separation
uniform vec4 uDustR;
uniform vec4 uDustW;
uniform vec4 uDustA;
uniform vec2 uLane;          // strength, inset
uniform float uDustK;
uniform vec3 uNormalW;
uniform vec3 uInner;
uniform vec3 uOuter;
uniform vec3 uArmCol;
uniform vec3 uRingCol;
varying vec2 vLocal;
varying vec3 vView;
float armPhi( float R, float k ) { return uArmPhase + 6.2831853 * k / uArmM - uSense * log( max( 1e-3, R ) / uArmR0 ) / uArmTanP; }
void main() {
  float R = length( vLocal );
  if ( R > uRMax ) discard;
  float phi = atan( vLocal.y, vLocal.x );
  float light = uI0 * exp( -R / uRd ) * clamp( ( uRMax - R ) / ( 0.2 * uRMax ), 0.0, 1.0 );
  float arm = 0.0, lane = 0.0;
  if ( uArmM > 0.0 ) {
    float win = clamp( ( R - uArmR0 * 0.7 ) / ( uArmR0 * 0.3 ), 0.0, 1.0 ) * clamp( ( uArmR1 * 1.1 - R ) / ( uArmR1 * 0.2 ), 0.0, 1.0 );
    for ( int k = 0; k < 4; k++ ) {
      if ( float( k ) >= uArmM ) break;
      float kf = float( k );
      float sv = fract( log( max( 1e-3, R ) / uArmR0 ) * 2.2 + kf * 0.37 + uSegSeed );
      float seg = uArmSeg < 1.0 ? mix( 0.35, 1.0, smoothstep( uArmSeg + 0.06, uArmSeg - 0.06, sv ) ) : 1.0;
      arm += pow( max( 0.0, cos( phi - armPhi( R, kf ) ) ), 6.0 ) * seg;
      lane += pow( max( 0.0, cos( phi - armPhi( R + uLane.y, kf ) ) ), 12.0 ) * seg;
    }
    arm *= win; lane *= win;
    light *= 1.0 + uArmC * arm;
  }
  float ring = 0.0;
  if ( uRing.z > 0.0 ) {
    vec2 q = vLocal - uRing2.xy;
    float Rr = length( q );
    float d = atan( sin( atan( q.y, q.x ) - uRing2.z ), cos( atan( q.y, q.x ) - uRing2.z ) );
    float open = abs( d ) < uRing.w ? cos( d / uRing.w * 1.5707963 ) : 0.0;
    float w2 = 2.0 * uRing.y * uRing.y;
    float a = Rr - uRing.x - 0.5 * uRing2.w * open, b = Rr - uRing.x + 0.5 * uRing2.w * open;
    ring = uRing.z * ( open > 0.0 ? 0.5 * ( exp( -a * a / w2 ) + exp( -b * b / w2 ) ) : exp( -( Rr - uRing.x ) * ( Rr - uRing.x ) / w2 ) );
    light += ring;
  }
  vec4 dr = R - uDustR;
  float rings = dot( uDustA, exp( -( dr * dr ) / ( 2.0 * uDustW * uDustW ) ) );
  float dust = min( 0.75, uDustK * ( 0.45 * rings + 0.55 * uLane.x * lane ) );
  // a flat layer seen edge on is a line: it gives way to the points (the head of this section)
  float c = abs( dot( normalize( vView ), uNormalW ) );
  float path = pow( max( c, 0.08 ), ${(VIEW_POWER - 1).toFixed(2)} ) * smoothstep( 0.04, 0.15, c );
  float v = uGain * pow( max( light, 0.0 ), ${LAYER_POWER.toFixed(2)} ) * ( 1.0 - dust ) * path;
  float t = clamp( R / ( 2.5 * uRd ), 0.0, 1.0 );
  vec3 col = mix( uInner, uOuter, t );
  col = mix( col, uArmCol, clamp( 0.6 * arm, 0.0, 0.6 ) );
  col = mix( col, uRingCol, clamp( ring / max( 1e-9, light ), 0.0, 0.6 ) );
  gl_FragColor = vec4( col * v, 1.0 );
}
`;
const BULGE_VERT = /* glsl */ `
varying vec2 vR;
void main() {
  vec4 c = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
  float scale = length( modelViewMatrix[0].xyz );
  vR = position.xy;
  gl_Position = projectionMatrix * ( c + vec4( position.xy * scale, 0.0, 0.0 ) );
}
`;
const BULGE_FRAG = /* glsl */ `
uniform float uGain;
uniform float uIe;
uniform float uRe;
uniform float uN;
uniform float uB;
uniform vec3 uCol;
varying vec2 vR;
void main() {
  float r = length( vR );
  if ( r > 6.0 * uRe ) discard;
  float S = uIe * exp( -uB * ( pow( r / uRe, 1.0 / uN ) - 1.0 ) );
  float v = uGain * pow( S, ${LAYER_POWER.toFixed(2)} ) * smoothstep( 6.0 * uRe, 3.5 * uRe, r );
  gl_FragColor = vec4( uCol * min( v, 1.2 ), 1.0 );
}
`;
SHADERS_LAYER.layer = LAYER_VERT + LAYER_FRAG;
SHADERS_LAYER.bulge = BULGE_VERT + BULGE_FRAG;

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
  const lightU = { ...shared, uGain: { value: 0 }, uOutside: { value: 1 }, uAlphaCap: { value: 0.9 }, uNormalW: { value: new THREE.Vector3(0, 0, 1) } };
  const dustU = { ...shared, uDust: { value: 0 } };
  const halves = [];
  const L = g.light;
  for (const sign of [1, -1]) {
    let m = 0;
    for (let j = 0; j < L.count; j++) if ((L.pos[j * 3 + 2] >= 0) === (sign > 0)) m++;
    const p = new Float32Array(m * 3), c = new Uint8Array(m * 4), t = new Uint8Array(m * 4), f = new Float32Array(m);
    let k = 0;
    for (let j = 0; j < L.count; j++) {
      if ((L.pos[j * 3 + 2] >= 0) !== (sign > 0)) continue;
      p.set(L.pos.subarray(j * 3, j * 3 + 3), k * 3); c.set(L.col.subarray(j * 4, j * 4 + 4), k * 4); t.set(L.meta.subarray(j * 4, j * 4 + 4), k * 4);
      f[k] = L.flux[j];
      k++;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    geo.setAttribute('aCol', new THREE.BufferAttribute(c, 4, true));
    geo.setAttribute('aMeta', new THREE.BufferAttribute(t, 4, true));
    geo.setAttribute('aFlux', new THREE.BufferAttribute(f, 1));
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
    geo.setAttribute('aTau', new THREE.BufferAttribute(D.tau.slice(), 1));
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
  // The integrated light (the section above): a disc in the disc's plane and the bulge facing the camera.
  const prof = layerProfile(params);
  const v3 = (c) => new THREE.Vector3(c[0], c[1], c[2]);
  const ringCol = prof.ring ? prof.ring.colour : prof.colours.outer;
  const armCol = prof.arms ? prof.arms.colour : prof.colours.outer;
  const layerU = {
    uGain: { value: 0 }, uI0: { value: prof.i0 }, uRd: { value: prof.rd }, uRMax: { value: prof.rMax }, uSense: { value: prof.sense },
    uArmM: { value: prof.arms ? prof.arms.m : 0 }, uArmTanP: { value: prof.arms ? prof.arms.tanP : 1 }, uArmR0: { value: prof.arms ? prof.arms.r0 : 1 },
    uArmR1: { value: prof.arms ? prof.arms.r1 : 1 }, uArmPhase: { value: prof.arms ? prof.arms.phase : 0 }, uArmC: { value: prof.arms ? prof.arms.contrast : 0 },
    uArmSeg: { value: prof.arms ? prof.arms.segments : 1 }, uSegSeed: { value: prof.segSeed },
    uRing: { value: new THREE.Vector4(prof.ring ? prof.ring.r : 0, prof.ring ? prof.ring.w : 1, prof.ring ? prof.ring.i : 0, prof.ring ? prof.ring.half : 0) },
    uRing2: { value: new THREE.Vector4(prof.ring ? prof.ring.off[0] : 0, prof.ring ? prof.ring.off[1] : 0, prof.ring ? prof.ring.split : 99, prof.ring ? prof.ring.sep : 0) },
    uDustR: { value: new THREE.Vector4(...prof.dust.radii) }, uDustW: { value: new THREE.Vector4(...prof.dust.widths) }, uDustA: { value: new THREE.Vector4(...prof.dust.amps) },
    uLane: { value: new THREE.Vector2(prof.dust.lane, prof.dust.inset) }, uDustK: { value: 1 },
    uNormalW: lightU.uNormalW, uInner: { value: v3(prof.colours.inner) }, uOuter: { value: v3(prof.colours.outer) }, uArmCol: { value: v3(armCol) }, uRingCol: { value: v3(ringCol) },
  };
  const layerMesh = new THREE.Mesh(new THREE.CircleGeometry(prof.rMax, 160), new THREE.ShaderMaterial({
    vertexShader: LAYER_VERT, fragmentShader: LAYER_FRAG, uniforms: layerU, side: THREE.DoubleSide,
    transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  layerMesh.name = `${name}:layer`;
  layerMesh.frustumCulled = false;
  layerMesh.renderOrder = -0.855;
  group.add(layerMesh);
  let bulgeMesh = null;
  const bulgeU = { uGain: { value: 0 }, uIe: { value: prof.bulge ? prof.bulge.ie : 0 }, uRe: { value: prof.bulge ? prof.bulge.re : 1 }, uN: { value: prof.bulge ? prof.bulge.n : 1 }, uB: { value: prof.bulge ? prof.bulge.b : 1 }, uCol: { value: v3(prof.bulge ? prof.bulge.colour : [1, 1, 1]) } };
  if (prof.bulge) {
    const R6 = 6 * prof.bulge.re;
    bulgeMesh = new THREE.Mesh(new THREE.PlaneGeometry(2 * R6, 2 * R6), new THREE.ShaderMaterial({
      vertexShader: BULGE_VERT, fragmentShader: BULGE_FRAG, uniforms: bulgeU,
      transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    bulgeMesh.name = `${name}:bulge`;
    bulgeMesh.frustumCulled = false;
    bulgeMesh.renderOrder = -0.853;
    group.add(bulgeMesh);
  }
  const _m = new THREE.Matrix4();
  const _inv = new THREE.Matrix4();
  const _cam = new THREE.Vector3();
  let share = 0, exposureNow = 1, faceOn = 1, small = false;
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
  // How much the layer is drawn (1 face on, 0 edge on), from the camera's line to the centre; the points
  // and their dust carry the rest, so the light is the same from every side.
  function apply() {
    const lay = smoothstepJs(0.04, 0.15, faceOn);
    const pts = SPARKLE + (1 - SPARKLE) * (1 - lay);
    lightU.uGain.value = g.gain * share * exposureNow * pts;
    dustU.uDust.value = g.dustGain * share * (0.3 + 0.7 * (1 - lay));
    layerU.uGain.value = prof.gain * share * exposureNow;
    bulgeU.uGain.value = prof.gain * share * exposureNow * lay;
    layerU.uDustK.value = lookNow() === 'measured' ? 0.6 : 1;
    // close up the points are small, capped dots (sparkle), never a carpet; edge on they are patches again
    const cap = (small ? 1.8 : 2.6) * dprNow;
    shared.uMaxPx.value = cap + (40 * dprNow - cap) * (1 - lay);
    shared.uMinPx.value = Math.min(1.2 * dprNow, shared.uMaxPx.value);
    lightU.uAlphaCap.value = 0.9;
  }
  let dprNow = 1;
  function setShare(k, exposure = 1) {
    share = Math.min(1, Math.max(0, Number(k) || 0));
    exposureNow = exposure;
    apply();
    group.visible = share > 0.002;
  }
  /** Per frame while drawn: the framebuffer's height, the sizes, which half is in front, how face on. */
  function update(camera, viewH, dpr = 1, tier = 1) {
    if (Number.isFinite(viewH) && viewH > 0) shared.uViewH.value = viewH;
    dprNow = dpr;
    small = tier === 0;
    if (!camera) { apply(); return; }
    group.updateMatrixWorld();
    // the normal in the world, for the edge-on term
    const e = group.matrixWorld.elements;
    lightU.uNormalW.value.set(e[8], e[9], e[10]).normalize();
    _inv.copy(group.matrixWorld).invert();
    _cam.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(_inv);
    const above = _cam.z >= 0;
    faceOn = Math.abs(_cam.z) / Math.max(1e-9, _cam.length());
    for (const h of halves) h.pts.renderOrder = (h.sign > 0) === above ? -0.84 : -0.86;
    apply();
  }
  function dispose() {
    layerMesh.geometry.dispose(); layerMesh.material.dispose();
    if (bulgeMesh) { bulgeMesh.geometry.dispose(); bulgeMesh.material.dispose(); }
    for (const h of halves) { h.pts.geometry.dispose(); h.pts.material.dispose(); }
    if (dustPts) { dustPts.geometry.dispose(); dustPts.material.dispose(); }
    if (group.parent) group.parent.remove(group);
  }
  const bytes = L.count * 24 + D.count * 20;
  return {
    group, place, setShare, update, dispose,
    share: () => share,
    generated: g,
    stats: () => ({ points: L.count, dust: D.count, meshes: group.children.length, textures: 0, bytes }),
    profile: prof,
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
const smoothstepJs = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lookNow = () => { try { const sr = globalThis.spaceRadar; return sr && typeof sr.look === 'function' ? sr.look() : 'film'; } catch (e) { return 'film'; } };
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
  const tier = tierNow();
  const g = createGalaxyPoints(THREE, params, { count: pointsFor(params, tier), dust: profile.levels && Number.isFinite(profile.levels.dust_share) ? profile.levels.dust_share : 0.3, seed, name: group.name });
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
      g.update(info.camera, viewHNow(), dprNow(), tier);
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

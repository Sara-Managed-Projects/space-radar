// scene/deep/helix.js -- the Helix Nebula (NGC 7293) as a hero: the first flagship of the deep sky
// (internal spec 0075 stage b, #787; DS-B02, B03, B04, B07). Fetched by scene/deep/deepsky.js when the
// Helix is near (scene/deep/heroes.js); never at boot.
//
// WHAT A HERO ANSWERS (the coordinator calls nothing else):
//   createHero(THREE, env) -> { group, levels, setLevel(level, share), frame(info), ready(), stats(), dispose() }
//   env  = { profile, record, gas }       profile: registry/deepsky-heroes/helix.yaml (data/hero-helix.js)
//   info = { camera, rPx, steps, look, reduced, frozen, dtMs, photo, tier, gain }   once a frame while drawn
// Pure, for tests/test_hero_helix.mjs and the preview: geometryOf, skyFrame, ringAxis, layerSpan,
//   shellSpan, discAt, ringAt, outerAt, columnJs, knotsOf, paletteFor, samplesFor, sharesFor, UNDER_MEASURED
//
// THE SHAPE IS PUBLISHED, NOT GUESSED (O'Dell, McCullough & Meixner 2004, AJ 128, 2339; "OMM04"). The
// main ring is two things: an inner disc 499″ across and about 100″ thick, its plane tilted 23° out of
// the plane of the sky with its near side toward PA 288°, and an outer ring (a torus) 742″ across,
// tilted 53° with its near side toward PA 168°: two rings "almost perpendicular" (66° between their
// axes with these numbers). NASA's animation of the Helix (NASA, ESA, A. Feild, STScI) is this model.
// Beyond it the outermost ring, 1 500″ across, of which the paper gives only the size: drawn round and
// faint. Angles are the paper's; lengths are its arcseconds at OUR distance (the Gaia parallax, 655 ly,
// registry/dso-hand.yaml), so the size on the sky stays the measured one. The knots: the paper and
// Meixner et al. 2005 count thousands (about 23 000 by NICMOS), Matsuura et al. 2009 finds them 2.2′ to
// 6.4′ from the star, the brightest on the inner edge of the ring; each head is at least twice the size
// of the Solar System and its tail points away from the star (STScI release 1996-13). We draw a seeded
// SAMPLE of 600 to 2 400 at those radii: the count and the radii are measured, the places are not, and
// the card says so. The white dwarf: about 100 000 K (103 600 ± 5 500 K, Napiwotzki 1999 and Traulsen
// et al. 2005 as Marshall et al. 2023 quote them; later fits reach 120 000 K).
//
// HOW IT IS DRAWN (design sections 1, 5 and 7; no pass, no render target, no bloom). Three meshes, three
// draw calls, all in the group's SKY FRAME: x west, y north, z toward the Sun (where we see it from), in
// light-years about the white dwarf.
//   gas    one bounding sphere drawn by its back faces. Its fragment finds, for each LAYER, the part of
//          the view ray inside that layer's own slab and annulus (layerSpan: the inner disc's slab, the
//          outer ring's torus box, the outermost shell), and spends its few samples only there. So a
//          disc seen face on is sampled through its 0.3 ly thickness, not through 6 ly of empty sphere:
//          no rings of a nested-sphere fallback, no plane edge seen edge on, no banding (the offset is
//          a static per-pixel noise). Emission in two declared line colours, [O III] (+ the He II core)
//          blue-green inside, Hα + [N II] red at the disc's rim, in the outer ring and the outermost
//          ring; the rim's molecular gas absorbs a little (premultiplied "over"). Samples: 4 a layer on
//          T0 (no noise volume read), 8 at level 2, and from level 3 half the coordinator's march steps
//          a layer (12-48 by tier: gasmat.js marchSteps).
//   knots  one instanced quad per knot (one draw call): a dark head that absorbs what is behind it, a
//          bright cusp on the star's side, a tail away from it. Drawn at their true size; under a pixel
//          and a half they are drawn a pixel and a half across with their absorption spread over it, so
//          the sum of their darkness stays the true one.
//   star   the white dwarf: a point of a fixed few pixels with a soft halo in the material (no bloom).
//          It stays at the centre of the frame from every side (DS-B02).
// The photograph (scene/nebulae.js) is the truth from our side: the gas and the knots give way to it by
// its own share (info.photo), so on the line of sight the ESO picture is what is drawn, and 25 to 50°
// off it the reconstruction takes over (design section 8). They also take over from the point glow by
// its own fade, 110 to 210 px in radius, as the coordinator's holder does.
//
// LOOKS. Eye / Camera draw the line colours as the ESO photograph (broadband B, V, R) shows them; Deep
// draws the ENHANCED narrowband palette, declared as such in the registry (DS-B07). Under the Measured
// look the generated texture of the gas goes (UNDER_MEASURED.noise) and nothing moves; under Film the
// noise drifts at most 1 % of its size a minute ("barely perceptible", package §5.1), and never under
// reduced motion or ?look=1. The knots stay under Measured: their number and radii are measured.

import { stage } from '../stage.js';
import { drawnUnder, stillUnder, exposureLook, EXPOSURES } from '../exposure.js';
import { HERO as PROFILE } from '../../data/hero-helix.js';

export const UNDER_MEASURED = { noise: 'hidden', drift: 'still', knots: 'same' };

const D2R = Math.PI / 180;
const OBLIQUITY = 23.4392911 * D2R;
const POLE = [0, Math.sin(OBLIQUITY), Math.cos(OBLIQUITY)]; // the north celestial pole, sun-inertial (ecliptic J2000)
const AU_LY = 1 / 63241.077;
const SPAN = 2.6;          // a layer's box reaches 2.6 of its Gaussian width: exp(-6.8) is under 0.2 % of its peak
const MAX_N = 24;          // samples a layer at most (48 march steps at Ultra)
const DISC_OUT = 1.6;      // the disc's box, in its radii: the rim's Gaussian is under 0.2 % of its peak there
const KNOTS_BY_TIER = [600, 1500, 2400];
// The profiles inside the layers (a model, shaped to the paper's zones and the photograph's colours), and
// each line's soft shoulder. ONE table: the GLSL below is written from it, so the two cannot drift.
export const SHAPE = {
  o3Floor: 0.18, o3Shift: 0.25, o3W: 0.4,    // [O III]: a floor, and a bump outward of the paper's 110″ density peak (the photograph's blue peaks near 200″)
  heW: 0.25,                                // He II: the core, within a fifth of the disc's radius
  rimQ: 1.08, rimIn: 0.12, rimW: 0.26, rimAmp: 0.95, // Hα + [N II] at the rim, the ionisation front (q in disc radii): sharp inside, soft outside
  haFloor: 0.06,                            // and faint through the disc
  ringAmp: 0.7, outerAmp: 0.012,            // the outer ring and the outermost ring, against the rim
  kO3: 2.4, kHe: 1.2, kHa: 2.0, kRing: 2.0, // the shoulders: 1 - exp(-k C), C in light-years
  knee: 0.7,                                // and one soft knee above this, so an edge-on disc is not a white bar
  sigma: 1.2,                               // the rim's dust, per light-year of rim
};
const f3 = (x) => Number(x).toFixed(3);
/** A static per-pixel offset in [0, 1): a hash of the pixel (no pattern, no temporal state). FRAG's pixelHash(). Pure. */
export function pixelHash(x, y) {
  const fr = (v) => v - Math.floor(v);
  let a = fr(x * 0.1031), b = fr(y * 0.1031), c = fr(x * 0.1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d; b += d; c += d;
  return fr((a + b) * c);
}

const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const neg = (a) => [-a[0], -a[1], -a[2]];
const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hexRgb = (h) => { const n = parseInt(String(h).replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

// --------------------------------------------------------------------------------- the geometry

/** The sky frame at an object, in sun-inertial: west, north, and toward the Sun (right-handed). Pure. */
export function skyFrame(posKm) {
  const u = norm([posKm.x, posKm.y, posKm.z]);
  const east = norm(cross(POLE, u));
  const north = cross(u, east);
  return { west: neg(east), north, toward: neg(u) };
}

/**
 * A ring's axis in the sky frame from its tilt out of the plane of the sky and the position angle (east
 * of north) of its NEAR side. The near side of a tilted circle is where the FAR end of its axis points
 * on the sky, which is how OMM04 states the same angles in its sections 3.1 and 4.4. Pure.
 */
export function ringAxis(inclDeg, nearPaDeg) {
  const i = inclDeg * D2R, pa = nearPaDeg * D2R;
  return [-Math.sin(pa) * Math.sin(i), Math.cos(pa) * Math.sin(i), -Math.cos(i)];
}

/** The profile's numbers in light-years, about the white dwarf, in the sky frame. Pure. */
export function geometryOf(profile = PROFILE) {
  const P = profile && Array.isArray(profile.layers) && profile.layers.some((l) => l && l.part === 'disc') ? profile : PROFILE;
  const dist = (P.frame && P.frame.distance_ly) || 655;
  const ly = (arcsec) => (Number(arcsec) || 0) * dist * Math.PI / 648000;
  const part = (k) => P.layers.find((l) => l && l.part === k) || {};
  const disc = part('disc'), ring = part('ring'), outer = part('outer'), knots = part('knots'), star = part('star');
  const g = {
    distanceLy: dist,
    R1: ly(disc.diameter_arcsec / 2), H1: ly(disc.thickness_arcsec / 2), a1: ringAxis(disc.tilt_deg, disc.near_pa_deg),
    o3Peak: (Number(disc.oiii_peak_arcsec) || 110) / ((Number(disc.diameter_arcsec) || 499) / 2),
    R2: ly(ring.diameter_arcsec / 2), W2: ly(ring.tube_arcsec), a2: ringAxis(ring.tilt_deg, ring.near_pa_deg),
    Ro: ly(outer.diameter_arcsec / 2), Wo: ly(outer.width_arcsec),
    knots: {
      from: ly((Number(knots.from_arcmin) || 2.2) * 60), to: ly((Number(knots.to_arcmin) || 6.4) * 60),
      head: (Number(knots.head_au) || 200) / 2 * AU_LY, tail: (Number(knots.tail_au) || 1000) * AU_LY,
      inRing: Number(knots.share_in_ring) || 0.2, count: knots.count_drawn || KNOTS_BY_TIER,
    },
    starK: Number(star.temp_k) || 103600,
  };
  g.bound = g.Ro + SPAN * g.Wo;
  g.axesDeg = Math.acos(Math.abs(dot(g.a1, g.a2))) / D2R;
  return g;
}

// --------------------------------------------------------- the layers along a ray (mirrored in GLSL)

/**
 * The part of the ray ro + t·rd, t in [t0, t1], inside a layer about axis `a`: |z| <= h and rIn <= ρ <=
 * rOut, ρ the distance from the axis. Up to two pieces, [lo1, hi1, lo2, hi2] (a piece with hi <= lo is
 * empty), or null. rd is a unit vector. Pure; FRAG's layerSpan() is the same arithmetic.
 */
export function layerSpan(ro, rd, a, h, rIn, rOut, t0, t1) {
  const z0 = dot(ro, a), dz = dot(rd, a);
  let lo = t0, hi = t1;
  if (Math.abs(dz) > 1e-6) {
    const ta = (-h - z0) / dz, tb = (h - z0) / dz;
    lo = Math.max(lo, Math.min(ta, tb)); hi = Math.min(hi, Math.max(ta, tb));
  } else if (Math.abs(z0) > h) return null;
  const op = [ro[0] - a[0] * z0, ro[1] - a[1] * z0, ro[2] - a[2] * z0];
  const dp = [rd[0] - a[0] * dz, rd[1] - a[1] * dz, rd[2] - a[2] * dz];
  const A = dot(dp, dp), B = dot(op, dp), C = dot(op, op);
  if (A > 1e-9) {
    let D = B * B - A * (C - rOut * rOut);
    if (D <= 0) return null;
    D = Math.sqrt(D);
    lo = Math.max(lo, (-B - D) / A); hi = Math.min(hi, (-B + D) / A);
  } else if (C > rOut * rOut) return null;
  if (hi <= lo) return null;
  if (rIn > 0) {
    if (A > 1e-9) {
      let D = B * B - A * (C - rIn * rIn);
      if (D > 0) { D = Math.sqrt(D); return [lo, Math.min(hi, (-B - D) / A), Math.max(lo, (-B + D) / A), hi]; }
    } else if (C < rIn * rIn) return null;
  }
  return [lo, hi, hi, hi];
}

/** The same for a spherical shell rIn <= r <= rOut about the centre. Pure; FRAG's shellSpan(). */
export function shellSpan(ro, rd, rIn, rOut, t0, t1) {
  const b = dot(ro, rd), c = dot(ro, ro);
  let D = b * b - (c - rOut * rOut);
  if (D <= 0) return null;
  D = Math.sqrt(D);
  const lo = Math.max(t0, -b - D), hi = Math.min(t1, -b + D);
  if (hi <= lo) return null;
  let E = b * b - (c - rIn * rIn);
  if (E > 0) { E = Math.sqrt(E); return [lo, Math.min(hi, -b - E), Math.max(lo, -b + E), hi]; }
  return [lo, hi, hi, hi];
}

// The emissivities, per unit length (light-years), before the colours. FRAG's discAt/ringAt/outerAt.
// Profiles across the disc, in units of its radius q: [O III] from the paper's density peak at 110″
// (q 0.44) outward, a faint floor inside; He II in the core ("filled with doubly ionised helium",
// O'Dell 2005); Hα + [N II] faint throughout and strong at the ionisation front, the rim (q ≈ 1.04,
// where the photograph's red begins and the knots are), whose molecular gas is the dust.
/** The inner disc at p: {o3, he, ha, dust}. Pure. */
export function discAt(g, p) {
  const z = dot(p, g.a1);
  const q = Math.hypot(p[0] - g.a1[0] * z, p[1] - g.a1[1] * z, p[2] - g.a1[2] * z) / g.R1;
  const k = Math.exp(-((z / g.H1) ** 2));
  const S = SHAPE;
  const fade = 1 - smooth(q, 0.9, 1.35);
  const o3 = (S.o3Floor + Math.exp(-(((q - g.o3Peak - S.o3Shift) / S.o3W) ** 2))) * fade;
  const he = Math.exp(-((q / S.heW) ** 2));
  const rim = Math.exp(-(((q - S.rimQ) / (q < S.rimQ ? S.rimIn : S.rimW)) ** 2));
  return { o3: k * o3, he: k * he, ha: k * (S.haFloor * (1 - smooth(q, 0.95, 1.4)) + S.rimAmp * rim), dust: k * rim };
}
/** The outer ring at p (a torus of tube W2): Hα + [N II] only, "of lower ionization" (OMM04). Pure. */
export function ringAt(g, p) {
  const z = dot(p, g.a2);
  const r = Math.hypot(p[0] - g.a2[0] * z, p[1] - g.a2[1] * z, p[2] - g.a2[2] * z);
  return { ring: SHAPE.ringAmp * Math.exp(-(((r - g.R2) ** 2 + z * z) / (g.W2 * g.W2))) };
}
/** The outermost ring at p: drawn as a faint round shell (the paper gives its size, not its shape). Pure. */
export function outerAt(g, p) {
  const r = Math.hypot(p[0], p[1], p[2]);
  return { ring: SHAPE.outerAmp * Math.exp(-(((r - g.Ro) / g.Wo) ** 2)) };
}

/** The spans of the three layers along a ray already clipped to the bounding sphere [t0, t1]. Pure. */
export function spansOf(g, ro, rd, t0, t1) {
  return {
    disc: layerSpan(ro, rd, g.a1, SPAN * g.H1, 0, DISC_OUT * g.R1, t0, t1),
    ring: layerSpan(ro, rd, g.a2, SPAN * g.W2, Math.max(0, g.R2 - SPAN * g.W2), g.R2 + SPAN * g.W2, t0, t1),
    outer: shellSpan(ro, rd, Math.max(0, g.Ro - SPAN * g.Wo), g.Ro + SPAN * g.Wo, t0, t1),
  };
}
const spanLen = (s) => (s ? Math.max(0, s[1] - s[0]) + Math.max(0, s[3] - s[2]) : 0);
const spanT = (s, u) => { const l1 = Math.max(0, s[1] - s[0]); return u < l1 ? s[0] + u : s[2] + (u - l1); };

/**
 * The columns along a ray from ro (unit rd), n samples a main layer, offset j in [0, 1): {o3, he, ha,
 * dust} of the inner disc and `ring` of the two outer rings (drawn in the [N II]-red). FRAG's main(). Pure.
 */
export function columnJs(g, ro, rd, n = 8, j = 0.5) {
  const b = dot(ro, rd), h = b * b - (dot(ro, ro) - g.bound * g.bound);
  const out = { o3: 0, he: 0, ha: 0, dust: 0, ring: 0 };
  if (h <= 0) return out;
  const t0 = Math.max(0, -b - Math.sqrt(h)), t1 = -b + Math.sqrt(h);
  if (t1 <= t0) return out;
  const s = spansOf(g, ro, rd, t0, t1);
  const walk = (span, m, f) => {
    const L = spanLen(span);
    if (!(L > 0)) return;
    const dt = L / m;
    for (let i = 0; i < m; i++) {
      const t = spanT(span, (i + j) * dt);
      const e = f(g, [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t]);
      for (const k of Object.keys(e)) out[k] += e[k] * dt;
    }
  };
  walk(s.disc, n, discAt);
  walk(s.ring, n, ringAt);
  walk(s.outer, Math.max(3, Math.floor(n / 2)), outerAt);
  return out;
}

/** A column's display colour (before the share and the exposure's gain), as FRAG: [r, g, b]. Pure. */
export function colourOf(c, pal) {
  const S = SHAPE, sh = (k, C) => 1 - Math.exp(-k * C);
  const col = [0, 1, 2].map((i) => pal.o3[i] * sh(S.kO3, c.o3) + pal.he[i] * sh(S.kHe, c.he) + pal.ha[i] * sh(S.kHa, c.ha) + pal.nii[i] * sh(S.kRing, c.ring || 0));
  const m = Math.max(col[0], col[1], col[2]);
  const k = m > S.knee ? (S.knee + (1 - S.knee) * (1 - Math.exp(-(m - S.knee) / (1 - S.knee)))) / m : 1;
  return col.map((x) => x * k);
}

// ----------------------------------------------------------------------------- tiers and shares

/** Samples a main layer: 4 on T0 (no noise volume read), 8 at level 2, half the march's steps above. Pure. */
export function samplesFor({ tier = 1, steps = 0 } = {}) {
  if (!(tier >= 1)) return 4;
  return Math.max(8, Math.min(MAX_N, Math.round((Number(steps) || 0) / 2)));
}

/**
 * How much of each part draws. `level` is the coordinator's level share (its 300 ms fade), `rPx` the
 * record's radius on screen, `photo` how much of its photograph is drawn now. The gas and the knots
 * take over from the point glow as its own fade goes (110 to 210 px, scene/dsoglow.js) and give way to
 * the photograph; the star stays, at half strength over the photograph, whose star it doubles. Pure.
 */
export function sharesFor({ level = 0, rPx = 0, photo = 0 } = {}) {
  const lv = Math.min(1, Math.max(0, Number(level) || 0));
  const ph = Math.min(1, Math.max(0, Number(photo) || 0));
  const ramp = Number.isFinite(rPx) ? smooth(rPx, 110, 210) : 1;
  const gas = lv * ramp * (1 - ph);
  return { gas, knots: gas, star: lv * (1 - 0.5 * ph) };
}

/**
 * The line colours for an exposure (scene/exposure.js). Eye and Camera: the profile's `lines`, the
 * photograph's own colours, brightness and saturation as the photographs are shown; Deep: the declared
 * `enhanced` palette. `gain` is the coordinator's (the exposure's milkyWay number). Pure.
 */
export function paletteFor(gain = 1, profile = PROFILE) {
  const P = profile && profile.colours && profile.colours.lines ? profile : PROFILE;
  const mode = EXPOSURES.find((m) => Math.abs(exposureLook(m).milkyWay - gain) < 1e-6) || 'camera';
  const L = exposureLook(mode);
  const set = mode === 'deep' && P.colours.enhanced ? P.colours.enhanced : P.colours;
  const sat = (c) => { const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; return c.map((x) => y + (x - y) * L.nebulaSaturation); };
  const pick = (k, d) => sat(hexRgb(set.lines[k] || P.colours.lines[k] || d));
  return { mode, enhanced: set.mode === 'enhanced', gain: L.nebulaGain, o3: pick('OIII', '#5cc8d6'), he: pick('HeII', '#c4dcff'), ha: pick('Ha', '#ff8a5a'), nii: pick('NII', '#ff6a4a'), star: pick('star', '#cfe0ff') };
}

/** The knots, seeded: {pos: Float32Array(3n), knot: Float32Array(4n) [head, tail, opacity, seed]}. Pure. */
export function knotsOf(g, n, seed = 7293) {
  let a = seed >>> 0;
  const rand = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const basis = (ax) => { const e1 = norm(cross(ax, Math.abs(ax[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0])); return [e1, cross(ax, e1)]; };
  const [d1, d2] = basis(g.a1), [r1, r2] = basis(g.a2);
  const pos = new Float32Array(3 * n), knot = new Float32Array(4 * n);
  const K = g.knots;
  for (let i = 0; i < n; i++) {
    let p;
    for (let tries = 0; tries < 20; tries++) {
      const phi = 2 * Math.PI * rand();
      if (rand() < K.inRing) {
        const r = g.R2 + gauss() * 0.5 * g.W2, z = gauss() * 0.5 * g.W2;
        p = [0, 1, 2].map((c) => (r1[c] * Math.cos(phi) + r2[c] * Math.sin(phi)) * r + g.a2[c] * z);
      } else {
        // Most on the inner edge of the ring (the rim, q ≈ 1.0), thinning inward to the paper's 2.2′.
        const q = 1.02 - Math.abs(gauss()) * 0.17 + gauss() * 0.04;
        const z = gauss() * 0.45 * g.H1;
        p = [0, 1, 2].map((c) => (d1[c] * Math.cos(phi) + d2[c] * Math.sin(phi)) * q * g.R1 + g.a1[c] * z);
      }
      const r = Math.hypot(p[0], p[1], p[2]);
      if (r >= K.from && r <= K.to) break;
    }
    pos.set(p, 3 * i);
    knot.set([K.head * (0.6 + 0.8 * rand()), K.tail * (0.5 + rand()), 0.55 + 0.4 * rand(), rand()], 4 * i);
  }
  return { pos, knot };
}

// ------------------------------------------------------------------------------------- the GLSL

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

const GAS_FRAG = /* glsl */ `
precision highp sampler3D;
#define MAX_N ${MAX_N}
#define SPAN ${SPAN.toFixed(1)}
uniform vec3 uCam;        // the camera in the sky frame, light-years (CPU, float64, each frame)
uniform vec3 uA1;         // the inner disc's axis
uniform vec3 uA2;         // the outer ring's axis
uniform vec4 uDisc;       // R1, H1, the [O III] peak in units of R1, 0
uniform vec4 uRing;       // R2, W2, Ro, Wo
uniform float uBound;
uniform int uN;           // samples a main layer
uniform vec3 uColO3;      // display values (gasmat.js COLOUR_POLICY)
uniform vec3 uColHe;
uniform vec3 uColHa;
uniform vec3 uColNii;
uniform float uShare;
uniform float uGain;
uniform float uSigma;
uniform float uNoiseAmp;  // 0 under Measured and on T0 (UNDER_MEASURED.noise)
uniform float uTime;      // still under Measured, reduced motion and ?look=1 (UNDER_MEASURED.drift)
uniform sampler3D uNoise;
varying vec3 vObj;
#include <common>
#include <logdepthbuf_pars_fragment>

// The part of the ray inside a layer about axis a: |z| <= h, rIn <= rho <= rOut. Two pieces (lo1, hi1,
// lo2, hi2); a piece with hi <= lo is empty. helix.js layerSpan() is the same arithmetic.
vec4 layerSpan( vec3 ro, vec3 rd, vec3 a, float h, float rIn, float rOut, float t0, float t1 ) {
  float z0 = dot( ro, a );
  float dz = dot( rd, a );
  float lo = t0;
  float hi = t1;
  if ( abs( dz ) > 1e-6 ) {
    float ta = ( -h - z0 ) / dz;
    float tb = ( h - z0 ) / dz;
    lo = max( lo, min( ta, tb ) );
    hi = min( hi, max( ta, tb ) );
  } else if ( abs( z0 ) > h ) return vec4( 0.0 );
  vec3 op = ro - a * z0;
  vec3 dp = rd - a * dz;
  float A = dot( dp, dp );
  float B = dot( op, dp );
  float C = dot( op, op );
  if ( A > 1e-9 ) {
    float D = B * B - A * ( C - rOut * rOut );
    if ( D <= 0.0 ) return vec4( 0.0 );
    D = sqrt( D );
    lo = max( lo, ( -B - D ) / A );
    hi = min( hi, ( -B + D ) / A );
  } else if ( C > rOut * rOut ) return vec4( 0.0 );
  if ( hi <= lo ) return vec4( 0.0 );
  if ( rIn > 0.0 ) {
    if ( A > 1e-9 ) {
      float E = B * B - A * ( C - rIn * rIn );
      if ( E > 0.0 ) {
        E = sqrt( E );
        return vec4( lo, min( hi, ( -B - E ) / A ), max( lo, ( -B + E ) / A ), hi );
      }
    } else if ( C < rIn * rIn ) return vec4( 0.0 );
  }
  return vec4( lo, hi, hi, hi );
}

vec4 shellSpan( vec3 ro, vec3 rd, float rIn, float rOut, float t0, float t1 ) {
  float b = dot( ro, rd );
  float c = dot( ro, ro );
  float D = b * b - ( c - rOut * rOut );
  if ( D <= 0.0 ) return vec4( 0.0 );
  D = sqrt( D );
  float lo = max( t0, -b - D );
  float hi = min( t1, -b + D );
  if ( hi <= lo ) return vec4( 0.0 );
  float E = b * b - ( c - rIn * rIn );
  if ( E > 0.0 ) {
    E = sqrt( E );
    return vec4( lo, min( hi, -b - E ), max( lo, -b + E ), hi );
  }
  return vec4( lo, hi, hi, hi );
}

float pixelHash( vec2 p ) {
  vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
  p3 += dot( p3, p3.yzx + 33.33 );
  return fract( ( p3.x + p3.y ) * p3.z );
}

float spanLen( vec4 s ) { return max( 0.0, s.y - s.x ) + max( 0.0, s.w - s.z ); }
float spanT( vec4 s, float u ) { float l1 = max( 0.0, s.y - s.x ); return u < l1 ? s.x + u : s.z + ( u - l1 ); }

float gasGrain( vec3 p ) {
  if ( uNoiseAmp <= 0.0 ) return 1.0;
  float n = texture( uNoise, p * 0.55 + vec3( 0.5 + uTime, 0.5 + uTime * 0.37, 0.5 ) ).r;
  return mix( 1.0, 0.35 + 1.3 * n, uNoiseAmp * 0.7 );
}

void main() {
  #include <logdepthbuf_fragment>
  if ( uShare <= 0.0 ) discard;
  vec3 ro = uCam;
  vec3 rd = normalize( vObj - ro );
  float b = dot( ro, rd );
  float h = b * b - ( dot( ro, ro ) - uBound * uBound );
  if ( h <= 0.0 ) discard;
  h = sqrt( h );
  float t0 = max( 0.0, -b - h );
  float t1 = -b + h;
  if ( t1 <= t0 ) discard;
  // a static per-pixel offset: grain, never bands, and no temporal state. A hash, not interleaved
  // gradient noise: with 3 to 8 samples IGN's diagonal pattern shows (the CPU preview, 2026-10-15).
  float j = pixelHash( gl_FragCoord.xy );
  float R1 = uDisc.x;
  float H1 = uDisc.y;
  float R2 = uRing.x;
  float W2 = uRing.y;
  float Ro = uRing.z;
  float Wo = uRing.w;
  float o3 = 0.0;
  float he = 0.0;
  float ha = 0.0;
  float dust = 0.0;
  float ring = 0.0;
  // the inner disc: [O III], the He II core, Hα + [N II] at its rim, the rim's dust
  vec4 s = layerSpan( ro, rd, uA1, SPAN * H1, 0.0, ${DISC_OUT.toFixed(2)} * R1, t0, t1 );
  float L = spanLen( s );
  if ( L > 0.0 ) {
    float dt = L / float( uN );
    for ( int i = 0; i < MAX_N; i++ ) {
      if ( i >= uN ) break;
      vec3 p = ro + rd * spanT( s, ( float( i ) + j ) * dt );
      float z = dot( p, uA1 );
      float q = length( p - uA1 * z ) / R1;
      float k = exp( -( z / H1 ) * ( z / H1 ) ) * gasGrain( p ) * dt;
      float fade = 1.0 - smoothstep( 0.9, 1.35, q );
      float dq = ( q - uDisc.z - ${f3(SHAPE.o3Shift)} ) / ${f3(SHAPE.o3W)};
      float rq = ( q - ${f3(SHAPE.rimQ)} ) / ( q < ${f3(SHAPE.rimQ)} ? ${f3(SHAPE.rimIn)} : ${f3(SHAPE.rimW)} );
      float hq = q / ${f3(SHAPE.heW)};
      float rim = exp( -rq * rq );
      o3 += k * ( ${f3(SHAPE.o3Floor)} + exp( -dq * dq ) ) * fade;
      he += k * exp( -hq * hq );
      ha += k * ( ${f3(SHAPE.haFloor)} * ( 1.0 - smoothstep( 0.95, 1.4, q ) ) + ${f3(SHAPE.rimAmp)} * rim );
      dust += k * rim;
    }
  }
  // the outer ring, a torus: Hα + [N II], of lower ionisation
  s = layerSpan( ro, rd, uA2, SPAN * W2, max( 0.0, R2 - SPAN * W2 ), R2 + SPAN * W2, t0, t1 );
  L = spanLen( s );
  if ( L > 0.0 ) {
    float dt = L / float( uN );
    for ( int i = 0; i < MAX_N; i++ ) {
      if ( i >= uN ) break;
      vec3 p = ro + rd * spanT( s, ( float( i ) + j ) * dt );
      float z = dot( p, uA2 );
      float r = length( p - uA2 * z ) - R2;
      ring += ${f3(SHAPE.ringAmp)} * exp( -( r * r + z * z ) / ( W2 * W2 ) ) * gasGrain( p ) * dt;
    }
  }
  // the outermost ring: faint, round
  s = shellSpan( ro, rd, max( 0.0, Ro - SPAN * Wo ), Ro + SPAN * Wo, t0, t1 );
  L = spanLen( s );
  if ( L > 0.0 ) {
    int n = max( 3, uN / 2 );
    float dt = L / float( n );
    for ( int i = 0; i < MAX_N; i++ ) {
      if ( i >= n ) break;
      vec3 p = ro + rd * spanT( s, ( float( i ) + j ) * dt );
      float r = ( length( p ) - Ro ) / Wo;
      ring += ${f3(SHAPE.outerAmp)} * exp( -r * r ) * dt;
    }
  }
  // Each line has its own soft shoulder, so an edge-on disc is bright and not a white bar.
  vec3 col = uColO3 * ( 1.0 - exp( -${f3(SHAPE.kO3)} * o3 ) ) + uColHe * ( 1.0 - exp( -${f3(SHAPE.kHe)} * he ) )
           + uColHa * ( 1.0 - exp( -${f3(SHAPE.kHa)} * ha ) ) + uColNii * ( 1.0 - exp( -${f3(SHAPE.kRing)} * ring ) );
  float mx = max( col.r, max( col.g, col.b ) );
  if ( mx > ${f3(SHAPE.knee)} ) col *= ( ${f3(SHAPE.knee)} + ${f3(1 - SHAPE.knee)} * ( 1.0 - exp( -( mx - ${f3(SHAPE.knee)} ) / ${f3(1 - SHAPE.knee)} ) ) ) / mx;
  float T = exp( -uSigma * dust );
  // premultiplied over: the light adds, and the rim's dust keeps T of what is behind it
  gl_FragColor = vec4( col * uGain * uShare, ( 1.0 - T ) * uShare );
}
`;

// A knot: a quad from the head back along the line from the star, screen-aligned. position.x is -1 at
// the star's side and +1 at the tail's end, position.y across it.
const KNOT_VERT = /* glsl */ `
attribute vec3 aPos;
attribute vec4 aKnot;     // head radius (ly), tail length (ly), opacity, seed
uniform float uViewH;     // the view's height, CSS px
uniform float uMinPx;     // the smallest head drawn, CSS px (the absorption is spread over it)
varying vec2 vUv;         // in head radii: x away from the star, y across
varying float vTail;      // the tail's length in head radii
varying float vAlpha;
${COMMON}
void main() {
  vec4 c = modelViewMatrix * vec4( aPos, 1.0 );
  vec4 s = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
  float zc = max( 1e-6, -c.z );
  vec2 away = c.xy / zc - s.xy / max( 1e-6, -s.z );
  away = dot( away, away ) > 1e-14 ? normalize( away ) : vec2( 1.0, 0.0 );
  vec2 side = vec2( -away.y, away.x );
  float headPx = aKnot.x * projectionMatrix[ 1 ][ 1 ] * 0.5 * uViewH / zc;
  float grow = max( 1.0, uMinPx / max( headPx, 1e-6 ) );
  float head = aKnot.x * grow;
  float tail = aKnot.y * grow;
  float along = position.x < 0.0 ? -1.3 * head : tail;
  vUv = vec2( position.x < 0.0 ? -1.3 : tail / head, position.y * 1.3 );
  vTail = tail / head;
  vAlpha = aKnot.z / ( grow * grow );
  c.xy += away * along + side * position.y * 1.3 * head;
  gl_Position = projectionMatrix * c;
  #include <logdepthbuf_vertex>
}
`;

const KNOT_FRAG = /* glsl */ `
uniform vec3 uCusp;
uniform float uShare;
uniform float uGain;
varying vec2 vUv;
varying float vTail;
varying float vAlpha;
#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  if ( uShare <= 0.0 ) discard;
  float d = length( vUv );
  float headA = 1.0 - smoothstep( 0.55, 1.1, d );
  float u = clamp( vUv.x / max( vTail, 1e-3 ), 0.0, 1.0 );
  float w = 1.0 - 0.7 * u;
  float tailA = vUv.x > 0.0 ? ( 1.0 - smoothstep( 0.3 * w, w, abs( vUv.y ) ) ) * ( 1.0 - u ) * 0.5 : 0.0;
  float cr = ( d - 0.95 ) / 0.25;
  float cusp = exp( -cr * cr ) * ( 1.0 - smoothstep( -0.7, 0.2, vUv.x / max( d, 1e-3 ) ) ); // edges in order (GLSL)
  float a = vAlpha * max( headA, tailA );
  if ( a <= 0.002 && cusp <= 0.002 ) discard;
  gl_FragColor = vec4( uCusp * cusp * vAlpha * 0.8 * uGain * uShare, a * uShare );
}
`;

// The white dwarf: a point of a fixed size on screen, with its halo, at the centre of the frame.
const STAR_VERT = /* glsl */ `
uniform vec2 uView;       // the view's width and height, CSS px
uniform float uPx;        // the sprite's half size, CSS px
varying vec2 vPx;
${COMMON}
void main() {
  vPx = position.xy * uPx;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
  gl_Position.xy += position.xy * uPx * 2.0 / uView * gl_Position.w;
  #include <logdepthbuf_vertex>
}
`;

const STAR_FRAG = /* glsl */ `
uniform vec3 uColour;
uniform float uShare;
varying vec2 vPx;
#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  float d = length( vPx );
  float core = exp( -( d / 1.3 ) * ( d / 1.3 ) );
  float halo = 0.22 * exp( -d / 4.5 ) * ( 1.0 - smoothstep( 14.0, 20.0, d ) );
  float k = ( core + halo ) * uShare;
  if ( k <= 0.002 ) discard;
  gl_FragColor = vec4( uColour * k, 1.0 );
}
`;

/** The shader sources, for tests/test_hero_helix.mjs (the JS above mirrors GAS_FRAG). */
export const SHADERS = { gasVertex: GAS_VERT, gas: GAS_FRAG, knotVertex: KNOT_VERT, knot: KNOT_FRAG, starVertex: STAR_VERT, star: STAR_FRAG };

// ------------------------------------------------------------------------------------- the hero

function material(THREE, { vertexShader, fragmentShader, uniforms, absorbing, side }) {
  // gasmat.js COLOUR_POLICY: display values, opaque list, no depth write, additive for light and
  // premultiplied "over" (with GAS_ABSORB) for what absorbs.
  const m = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: false, depthTest: false, depthWrite: false, toneMapped: false, side: side || THREE.FrontSide });
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
  group.name = `deep-hero-${(env.profile && env.profile.id) || 'helix'}`;
  const profile = env.profile && Array.isArray(env.profile.layers) && env.profile.layers.some((l) => l && l.part === 'disc') ? env.profile : PROFILE;
  const g = geometryOf(profile);
  // The sky frame: west, north, toward the Sun. Set from the record's direction when the stage changes.
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
    const k = 1e12; // km: far enough to be a direction, near enough for float64
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

  const noise = env.gas && env.gas.noiseTexture ? env.gas.noiseTexture(THREE, 64) : null;
  const pal0 = paletteFor(1, profile);
  // --- the gas
  const gasGeo = new THREE.IcosahedronGeometry(g.bound * 1.09, 3);
  const gasMat = material(THREE, {
    vertexShader: GAS_VERT, fragmentShader: GAS_FRAG, absorbing: true, side: THREE.BackSide,
    uniforms: {
      uCam: { value: new THREE.Vector3(0, 0, 10) },
      uA1: { value: new THREE.Vector3(...g.a1) }, uA2: { value: new THREE.Vector3(...g.a2) },
      uDisc: { value: new THREE.Vector4(g.R1, g.H1, g.o3Peak, 0) }, uRing: { value: new THREE.Vector4(g.R2, g.W2, g.Ro, g.Wo) },
      uBound: { value: g.bound }, uN: { value: 8 },
      uColO3: { value: new THREE.Color().setRGB(...pal0.o3, THREE.NoColorSpace) }, uColHe: { value: new THREE.Color().setRGB(...pal0.he, THREE.NoColorSpace) },
      uColHa: { value: new THREE.Color().setRGB(...pal0.ha, THREE.NoColorSpace) }, uColNii: { value: new THREE.Color().setRGB(...pal0.nii, THREE.NoColorSpace) },
      uShare: { value: 0 }, uGain: { value: 1 }, uSigma: { value: SHAPE.sigma }, uNoiseAmp: { value: 0 }, uTime: { value: 0 }, uNoise: { value: noise },
    },
  });
  gasMat.name = 'deep-helix-gas';
  // `-shells` for the T0 path's name in the contract's draw-order check (tests/test_contract.mjs).
  const gas = new THREE.Mesh(gasGeo, gasMat);
  gas.name = `${group.name}-shells`;
  gas.renderOrder = -1;
  sky.add(gas);

  // --- the knots (built for the tier; rebuilt if the tier changes)
  const quad = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
  const knotMat = material(THREE, {
    vertexShader: KNOT_VERT, fragmentShader: KNOT_FRAG, absorbing: true,
    uniforms: { uViewH: { value: 800 }, uMinPx: { value: 1.5 }, uCusp: { value: new THREE.Color().setRGB(...pal0.ha, THREE.NoColorSpace) }, uShare: { value: 0 }, uGain: { value: 1 } },
  });
  knotMat.name = 'deep-helix-knots';
  let knots = null, knotTier = -1, knotCount = 0, knotBytes = 0;
  function buildKnots(tier) {
    const n = (Array.isArray(g.knots.count) ? g.knots.count : KNOTS_BY_TIER)[Math.max(0, Math.min(2, tier | 0))] | 0;
    if (knots && knotTier === tier) return;
    if (knots) { sky.remove(knots); knots.geometry.dispose(); }
    const { pos, knot } = knotsOf(g, n);
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(quad, 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3));
    geo.setAttribute('aKnot', new THREE.InstancedBufferAttribute(knot, 4));
    geo.instanceCount = n;
    knots = new THREE.Mesh(geo, knotMat);
    knots.name = `${group.name}-knots`;
    knots.frustumCulled = false; // the instances are not in the quad's bounds
    knots.renderOrder = -0.98;
    sky.add(knots);
    knotTier = tier; knotCount = n; knotBytes = pos.byteLength + knot.byteLength;
  }
  buildKnots(1);

  // --- the white dwarf
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(quad, 3));
  starGeo.setIndex([0, 1, 2, 0, 2, 3]);
  const starMat = material(THREE, {
    vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
    uniforms: { uView: { value: new THREE.Vector2(1280, 800) }, uPx: { value: 20 }, uColour: { value: new THREE.Color().setRGB(...pal0.star, THREE.NoColorSpace) }, uShare: { value: 0 } },
  });
  starMat.name = 'deep-helix-star';
  const star = new THREE.Mesh(starGeo, starMat);
  star.name = `${group.name}-star`;
  star.frustumCulled = false;
  star.renderOrder = -0.96;
  sky.add(star);

  let level = 0, levelShare = 0, clock = 0, samples = 8, tierNow = 1, last = { gas: 0, knots: 0, star: 0, photo: 0 }, palette = pal0;
  const _inv = new THREE.Matrix4();
  const _id = new THREE.Matrix4();
  const _cam = new THREE.Vector3();
  const setColour = (u, c) => u.value.setRGB(c[0], c[1], c[2], THREE.NoColorSpace);

  return {
    group,
    levels: [2, 3],
    setLevel(n, share = 1) {
      level = n;
      levelShare = n >= 2 ? Math.min(1, Math.max(0, share)) : 0;
      group.visible = levelShare > 0;
    },
    frame(info = {}) {
      if (basisFor !== stage.worldId) placeSky();
      const tier = Number.isFinite(info.tier) ? info.tier : 1;
      if (tier !== tierNow || !knots) { tierNow = tier; buildKnots(tier); }
      const sh = sharesFor({ level: levelShare, rPx: info.rPx, photo: info.photo });
      last = { ...sh, photo: Number(info.photo) || 0 };
      samples = samplesFor({ tier, steps: info.steps });
      const gain = Number.isFinite(info.gain) ? info.gain : 1;
      if (gain !== palette.gainIn) {
        palette = { ...paletteFor(gain, profile), gainIn: gain };
        const u = gasMat.uniforms;
        setColour(u.uColO3, palette.o3); setColour(u.uColHe, palette.he); setColour(u.uColHa, palette.ha); setColour(u.uColNii, palette.nii);
        setColour(knotMat.uniforms.uCusp, palette.ha); setColour(starMat.uniforms.uColour, palette.star);
        u.uGain.value = palette.gain; knotMat.uniforms.uGain.value = palette.gain;
      }
      const look = info.look || 'film';
      const still = !!(info.frozen || info.reduced) || stillUnder(look, UNDER_MEASURED.drift);
      // At most 1 % of the noise's size a minute (design section 7): barely perceptible, never under Measured.
      if (!still) clock += ((Number(info.dtMs) || 0) / 60000) * 0.01;
      const gu = gasMat.uniforms;
      gu.uShare.value = sh.gas;
      gu.uN.value = samples;
      gu.uNoiseAmp.value = tier >= 1 && noise && drawnUnder(look, UNDER_MEASURED.noise) ? 1 : 0;
      gu.uTime.value = clock;
      knotMat.uniforms.uShare.value = drawnUnder(look, UNDER_MEASURED.knots) ? sh.knots : 0;
      starMat.uniforms.uShare.value = sh.star;
      gas.visible = sh.gas > 0.002;
      knots.visible = knotMat.uniforms.uShare.value > 0.002;
      star.visible = sh.star > 0.002;
      const vw = (typeof globalThis.innerWidth === 'number' && globalThis.innerWidth) || 1280;
      const vh = (typeof globalThis.innerHeight === 'number' && globalThis.innerHeight) || 800;
      knotMat.uniforms.uViewH.value = vh;
      starMat.uniforms.uView.value.set(vw, vh);
      if (info.camera) {
        // The sky frame's world matrix from the matrices themselves (the coordinator places the group
        // with matrixAutoUpdate off; its parent, the deep-sky group, sits at the origin).
        if (group.parent) group.parent.updateWorldMatrix(true, false);
        _inv.multiplyMatrices(group.parent ? group.parent.matrixWorld : _id, group.matrix).multiply(sky.matrix).invert();
        _cam.copy(info.camera.position).applyMatrix4(_inv);
        gu.uCam.value.copy(_cam);
      }
    },
    ready: () => true,
    stats: () => ({
      level, share: Math.round(last.gas * 100) / 100, photo: Math.round(last.photo * 100) / 100, star: Math.round(last.star * 100) / 100,
      samples, tier: tierNow, palette: palette.mode, knots: knotCount, meshes: 3, points: knotCount, textures: 0,
      bytes: knotBytes + gasGeo.getAttribute('position').array.byteLength + quad.byteLength * 2,
    }),
    dispose() {
      if (knots) knots.geometry.dispose();
      gasGeo.dispose(); starGeo.dispose();
      gasMat.dispose(); knotMat.dispose(); starMat.dispose();
      knots = null;
      if (group.parent) group.parent.remove(group);
    },
  };
}

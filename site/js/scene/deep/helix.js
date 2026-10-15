// scene/deep/helix.js -- the Helix Nebula (NGC 7293) as a hero: the first flagship of the deep sky
// (internal spec 0075 stage b, #787; DS-B02, B03, B04, B07). Fetched by scene/deep/deepsky.js when the
// Helix is near (scene/deep/heroes.js); never at boot.
//
// WHAT A HERO ANSWERS (the coordinator calls nothing else):
//   createHero(THREE, env) -> { group, levels, setLevel(level, share), frame(info), ready(), stats(), dispose() }
//   env  = { profile, record, gas }       profile: registry/deepsky-heroes/helix.yaml (data/hero-helix.js)
//   info = { camera, rPx, steps, look, reduced, frozen, dtMs, photo, tier, gain }   once a frame while drawn
// Pure, for tests/test_hero_helix.mjs and the preview: geometryOf, skyFrame, ringAxis, layerSpan, uvOf,
//   discShare, lightStretch, columnJs, knotsOf, paletteFor, samplesFor, sharesFor, pixelHash, SHAPE, UNDER_MEASURED
//
// ITS SHAPE IS PUBLISHED; ITS LIGHT IS THE PHOTOGRAPH'S.
//   The shape (O'Dell, McCullough & Meixner 2004, AJ 128, 2339; "OMM04"): an inner disc 499″ across
//   and about 100″ thick, its plane tilted 23° out of the plane of the sky with its near side toward PA
//   288°, and an outer ring 742″ across, tilted 53° with its near side toward PA 168°: two rings
//   "almost perpendicular" (66° between their axes with these numbers). NASA's animation of the Helix
//   (NASA, ESA, A. Feild, STScI) is this model. Lengths are the paper's arcseconds at OUR distance (the
//   Gaia parallax, 655 ly), so the size on the sky stays the measured one.
//   The light: ESO's photograph (eso0907a, CC BY 4.0), the one scene/nebulae.js shows, with its stars
//   taken out (scripts/build_deep_helix.py -> images/deep/helix/helix-light.webp). Each point of each
//   ring glows with the photograph's colour at the place it covers on the sky, as seen from the Sun,
//   and each sky point's light is shared between the two rings: the inner disc takes it inside its
//   own outline as seen from here (discShare), the outer ring the rest. Divided by the ring's depth
//   along our line, so that FROM OUR SIDE THE MODEL IS THE PHOTOGRAPH, and turned it is the same
//   structure foreshortened. The edges are the photograph's own and each slab is crisp (a fourth-power
//   profile, not a Gaussian), so seen edge on a ring is a thin sharp band and not a blur.
//   Fine radial streaks, seeded, where the photograph is coarser than the view (Film only, UNDER_MEASURED).
//   The knots: the paper and Meixner et al. 2005 count thousands (about 23 000 by NICMOS), Matsuura et al.
//   2009 finds them 2.2′ to 6.4′ from the star, the brightest on the inner edge of the ring; each head at
//   least twice the Solar System, its tail pointing away from the star (STScI release 1996-13). We draw a
//   seeded SAMPLE of 500 to 1 600 on the inner rim, drawn at least 2.2 px wide with their darkness
//   exaggerated so they can be seen at mid distance (the registry says so). The white dwarf: about
//   100 000 K (103 600 ± 5 500 K, Napiwotzki 1999 and Traulsen et al. 2005 as Marshall et al. 2023 quote them).
//
// HOW IT IS DRAWN (design sections 1, 5 and 7; no pass, no render target, no bloom). Three meshes, three
// draw calls, in the group's SKY FRAME: x west, y north, z toward the Sun, light-years about the star.
//   gas    one bounding sphere drawn by its back faces. For each ring the fragment finds the part of the
//          view ray inside that ring's slab (layerSpan) and spends its samples only there. Along that
//          stretch the gas emits and also absorbs its own light (a little, as an optical depth of about 1
//          face on, compensated so the column on our line is still the photograph's): seen edge on a ring
//          shows its near side's colour and does not add up to white. The two rings' light adds. Samples: 4 a ring on T0, 8 at level 2, half the march's steps from level 3.
//   knots  one instanced quad per knot: a dark head that absorbs, a bright cusp toward the star, a tail away.
//   star   the white dwarf: a point of a few pixels with a soft halo in its material, at the frame's centre.
// The photograph is the truth from our side: the gas and the knots give way to it by its own share
// (info.photo), so on our line of sight the ESO picture is drawn, and 25 to 50° off it the
// reconstruction, whose light is that picture's, takes over. The point glow gives way to the hero
// (main.js, deepsky.js heroShares). As the nebula grows past the view its light is scaled down (to 45 %
// inside), the eye's adaptation, in the material.
//
// LOOKS. The light is shown with the exposure's own stretch, as the photograph is (scene/exposure.js:
// Eye dim and grey, Camera as taken, Deep lifted and saturated: ENHANCED, and the registry says so).
// Under Measured the streaks go and nothing moves; under Film the streaks drift at most 1 % of their
// width a minute, never under reduced motion or ?look=1. The knots stay: their count and radii are measured.

import { stage } from '../stage.js';
import { drawnUnder, stillUnder, exposureLook, EXPOSURES } from '../exposure.js';
import { HERO as PROFILE } from '../../data/hero-helix.js';
import { NEBULAE } from '../../data/nebulae.js';

export const UNDER_MEASURED = { streaks: 'hidden', drift: 'still', knots: 'same' };

const D2R = Math.PI / 180;
const OBLIQUITY = 23.4392911 * D2R;
const POLE = [0, Math.sin(OBLIQUITY), Math.cos(OBLIQUITY)]; // the north celestial pole, sun-inertial (ecliptic J2000)
const AU_LY = 1 / 63241.077;
const MAX_N = 24;          // samples a ring at most (48 march steps at Ultra)
const KNOTS_BY_TIER = [500, 1000, 1600];
const QUARTIC = 1.8128049541109541; // ∫ exp(-u⁴) du over the line, 2 Γ(5/4)
const LIGHT_URL = '../../../images/deep/helix/helix-light.webp';
// The shape of the light inside the rings. ONE table: the GLSL below is written from it.
export const SHAPE = {
  slab: 1.6,                // a ring's box reaches 1.6 of its half-thickness: exp(-1.6⁴) is 0.15 % of its middle
  discOut: 1.25,            // the inner disc's box, in its radii
  discIn: 0.92, discEdge: 1.12, // a sky point's light belongs to the disc inside this (its outline as seen from here)
  ringFade: 1.25, ringOut: 1.5, // the outer ring's light fades out between these, in its radii (the faint haze beyond is the photograph's alone)
  kappa: 2.5,               // self-absorption: optical depth per unit of the light's luminance; edge on a ring saturates at about 1/kappa of its colour, not white
  knee: 0.8,                // one soft knee over the brightest channel, hue kept
  rimQ: 1.04, rimW: 0.12,   // the rim's dust (the knots' molecular gas), in disc radii
  sigma: 0.5,               // its extinction
  streakCells: 95.5,        // radial streaks: cells per radian (about 600 round)
  streakAmp: 0.45,
  exposure: 1.0,            // the whole, against the photograph's own levels (its light IS the photograph's)
  adapt: 0.45,              // what is left of its light when it fills the view (the eye's adaptation)
};
const f3 = (x) => Number(x).toFixed(3);

const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const neg = (a) => [-a[0], -a[1], -a[2]];
const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hexRgb = (h) => { const n = parseInt(String(h).replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

/** A static per-pixel offset in [0, 1): a hash of the pixel (no pattern, no temporal state). FRAG's pixelHash(). Pure. */
export function pixelHash(x, y) {
  const fr = (v) => v - Math.floor(v);
  let a = fr(x * 0.1031), b = fr(y * 0.1031), c = fr(x * 0.1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d; b += d; c += d;
  return fr((a + b) * c);
}

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

const planeBasis = (ax) => { const e1 = norm(cross(ax, Math.abs(ax[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0])); return [e1, cross(ax, e1)]; };

/**
 * The light map's place on the sky: u = u0 + x / W, v = v0 + y / H (x west, y north, light-years; the
 * picture is north up, east left). The picture's centre is its measured one (registry/nebulae.yaml),
 * not the star's. Pure.
 */
export function uvOf(row, recordRaDec, distLy) {
  const asLy = (arcmin) => arcmin * 60 * distLy * Math.PI / 648000;
  const W = asLy(row.width_arcmin), H = asLy(row.height_arcmin);
  const [ra, dec] = recordRaDec;
  const eastArcmin = (row.ra_deg - ra) * Math.cos(dec * D2R) * 60, northArcmin = (row.dec_deg - dec) * 60;
  return { u0: 0.5 + asLy(eastArcmin) / W, v0: 0.5 - asLy(northArcmin) / H, W, H };
}

/** The profile's numbers in light-years, about the white dwarf, in the sky frame. Pure. */
export function geometryOf(profile = PROFILE) {
  const P = profile && Array.isArray(profile.layers) && profile.layers.some((l) => l && l.part === 'disc') ? profile : PROFILE;
  const dist = (P.frame && P.frame.distance_ly) || 655;
  const ly = (arcsec) => (Number(arcsec) || 0) * dist * Math.PI / 648000;
  const part = (k) => P.layers.find((l) => l && l.part === k) || {};
  const disc = part('disc'), ring = part('ring'), knots = part('knots'), star = part('star');
  const row = NEBULAE.find((r) => r.id === 'helix-nebula') || { ra_deg: 337.4106, dec_deg: -20.8371, width_arcmin: 28.02, height_arcmin: 25.94 };
  const g = {
    distanceLy: dist,
    R1: ly(disc.diameter_arcsec / 2), H1: ly(disc.thickness_arcsec / 2), a1: ringAxis(disc.tilt_deg, disc.near_pa_deg),
    R2: ly(ring.diameter_arcsec / 2), H2: ly(ring.thickness_arcsec / 2), a2: ringAxis(ring.tilt_deg, ring.near_pa_deg),
    uv: uvOf(row, [Number(P.frame && P.frame.ra_deg) || 337.4106, Number(P.frame && P.frame.dec_deg) || -20.8371], dist),
    knots: {
      from: ly((Number(knots.from_arcmin) || 2.2) * 60), to: ly((Number(knots.to_arcmin) || 6.4) * 60),
      head: (Number(knots.head_au) || 200) / 2 * AU_LY, tail: (Number(knots.tail_au) || 1000) * AU_LY,
      inRing: Number(knots.share_in_ring) || 0, count: knots.count_drawn || KNOTS_BY_TIER, minPx: Number(knots.min_px) || 2.2,
    },
    starK: Number(star.temp_k) || 103600,
  };
  // Each ring's depth along our line (the sky frame's z): what one sky point's light is divided by.
  g.N1 = QUARTIC * g.H1 / Math.abs(g.a1[2]);
  g.N2 = QUARTIC * g.H2 / Math.abs(g.a2[2]);
  [g.d1, g.d2] = planeBasis(g.a1);
  [g.r1, g.r2] = planeBasis(g.a2);
  g.bound = Math.hypot(SHAPE.ringOut * g.R2, SHAPE.slab * g.H2) * 1.02;
  g.axesDeg = Math.acos(Math.abs(dot(g.a1, g.a2))) / D2R;
  return g;
}

// ------------------------------------------------------------ the rings along a ray (mirrored in GLSL)

/**
 * The part of the ray ro + t·rd, t in [t0, t1], inside a slab about axis `a`: |z| <= h and rIn <= ρ <=
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
const spanLen = (s) => (s ? Math.max(0, s[1] - s[0]) + Math.max(0, s[3] - s[2]) : 0);
const spanT = (s, u) => { const l1 = Math.max(0, s[1] - s[0]); return u < l1 ? s[0] + u : s[2] + (u - l1); };

/** Of the light along our line at sky point (x, y), the inner disc's share: inside its outline as seen from here. Pure. */
export function discShare(g, x, y) {
  const zc = -(x * g.a1[0] + y * g.a1[1]) / g.a1[2];
  const q = Math.hypot(x, y, zc) / g.R1;
  return 1 - smooth(q, SHAPE.discIn, SHAPE.discEdge);
}

/** The exposure's stretch on a display colour, as scene/nebulae.js shows the photograph: gamma, then saturation. Pure. */
export function lightStretch(c, gamma = 1, sat = 1) {
  const s = c.map((x) => Math.max(0, x) ** gamma);
  const y = 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
  return { rgb: s.map((x) => y + (x - y) * sat), lum: y };
}

/**
 * The colour along a ray from ro (unit rd): `light(x, y)` -> stretched [r, g, b] (or null outside the
 * picture), n samples a ring, offset j in [0, 1). Returns {rgb, dust} before the share and the gain.
 * FRAG's main(), without the streaks. Pure.
 */
export function columnJs(g, ro, rd, n = 8, j = 0.5, light = () => [0, 0, 0]) {
  const S = SHAPE;
  const b = dot(ro, rd), h = b * b - (dot(ro, ro) - g.bound * g.bound);
  const zero = { rgb: [0, 0, 0], dust: 0 };
  if (h <= 0) return zero;
  const t0 = Math.max(0, -b - Math.sqrt(h)), t1 = -b + Math.sqrt(h);
  if (t1 <= t0) return zero;
  let dust = 0;
  const ring = (a, H, N, rOut, share, fadeOf) => {
    const s = layerSpan(ro, rd, a, S.slab * H, 0, rOut, t0, t1);
    const L = spanLen(s);
    const C = [0, 0, 0];
    let T = 1;
    if (!(L > 0)) return { C, T };
    const dt = L / n;
    for (let i = 0; i < n; i++) {
      const t = spanT(s, (i + j) * dt);
      const p = [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t];
      const z = dot(p, a), u = z / H;
      const lc = light(p[0], p[1]);
      if (!lc) continue;
      const lum = 0.2126 * lc[0] + 0.7152 * lc[1] + 0.0722 * lc[2];
      const ip = [p[0] - a[0] * z, p[1] - a[1] * z, p[2] - a[2] * z];
      const sh = share(p[0], p[1]) * fadeOf(Math.hypot(ip[0], ip[1], ip[2]));
      const rho = Math.exp(-(u ** 4)) / N * sh;
      const tau = S.kappa * lum * sh;
      const comp = tau > 1e-4 ? tau / (1 - Math.exp(-tau)) : 1;
      // each step integrated exactly for a constant density across it (no over-shoot where it is dense)
      const ab = S.kappa * lum * rho * dt;
      const w = ab > 1e-5 ? (1 - Math.exp(-ab)) / (S.kappa * lum) : rho * dt;
      for (let c = 0; c < 3; c++) C[c] += T * lc[c] * comp * w;
      T *= Math.exp(-ab);
      if (a === g.a1) { const rq = (Math.hypot(ip[0], ip[1], ip[2]) / g.R1 - S.rimQ) / S.rimW; dust += Math.exp(-(u ** 4)) * Math.exp(-rq * rq) * dt; }
    }
    return { C, T };
  };
  const one = () => 1;
  const d = ring(g.a1, g.H1, g.N1, S.discOut * g.R1, (x, y) => discShare(g, x, y), one);
  const r = ring(g.a2, g.H2, g.N2, S.ringOut * g.R2, (x, y) => 1 - discShare(g, x, y), (rr) => 1 - smooth(rr / g.R2, S.ringFade, S.ringOut));
  // The two rings add: each absorbs only its own light, so on our line their sum is the picture's.
  let rgb = [0, 1, 2].map((c) => d.C[c] + r.C[c]);
  const m = Math.max(...rgb);
  if (m > S.knee) { const k = (S.knee + (1 - S.knee) * (1 - Math.exp(-(m - S.knee) / (1 - S.knee)))) / m; rgb = rgb.map((x) => x * k); }
  return { rgb, dust };
}

// ----------------------------------------------------------------------------- tiers and shares

/** Samples a ring: 4 on T0, 8 at level 2, half the march's steps above. Pure. */
export function samplesFor({ tier = 1, steps = 0 } = {}) {
  if (!(tier >= 1)) return 4;
  return Math.max(8, Math.min(MAX_N, Math.round((Number(steps) || 0) / 2)));
}

/**
 * How much of each part draws. `level` is the coordinator's level share (its 300 ms fade), `rPx` the
 * record's radius on screen and `viewH` the view's height (CSS px), `photo` how much of its photograph
 * is drawn now. The gas and the knots give way to the photograph (the point glow gives way to the hero:
 * main.js, deepsky.js heroShares); the star stays, at half strength over the photograph, whose star it
 * doubles. `light` is the eye's adaptation: as the nebula grows past the view its light is scaled down,
 * to SHAPE.adapt from inside, so a camera in the gas sees the gas round it and not a white screen. Pure.
 */
export function sharesFor({ level = 0, rPx = 0, photo = 0, viewH = 800 } = {}) {
  const lv = Math.min(1, Math.max(0, Number(level) || 0));
  const ph = Math.min(1, Math.max(0, Number(photo) || 0));
  const gas = lv * (1 - ph);
  const fill = Number.isFinite(rPx) ? Math.max(0, Number(rPx) || 0) / Math.max(1, viewH / 2) : Infinity;
  const light = 1 - (1 - SHAPE.adapt) * (Number.isFinite(fill) ? smooth(fill, 0.7, 2) : 1);
  return { gas, knots: gas, star: lv * (1 - 0.5 * ph), light };
}

/**
 * The exposure (scene/exposure.js), from the coordinator's gain (the exposure's milkyWay number): the
 * light's stretch as the photographs have it (gain, gamma, saturation), and the knots' cusp and the
 * star's colours: the profile's under Eye and Camera, its declared `enhanced` set under Deep. Pure.
 */
export function paletteFor(gain = 1, profile = PROFILE) {
  const P = profile && profile.colours && profile.colours.lines ? profile : PROFILE;
  const mode = EXPOSURES.find((m) => Math.abs(exposureLook(m).milkyWay - gain) < 1e-6) || 'camera';
  const L = exposureLook(mode);
  const set = mode === 'deep' && P.colours.enhanced ? P.colours.enhanced : P.colours;
  const sat = (c) => { const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; return c.map((x) => y + (x - y) * L.nebulaSaturation); };
  const pick = (k, d) => sat(hexRgb((set.lines && set.lines[k]) || P.colours.lines[k] || d));
  return { mode, enhanced: set.mode === 'enhanced', gain: L.nebulaGain, gamma: L.nebulaGamma, saturation: L.nebulaSaturation, cusp: pick('Ha', '#f59a62'), star: pick('star', '#cfdcff') };
}

/** The knots, seeded: {pos: Float32Array(3n), knot: Float32Array(4n) [head, tail, opacity, seed]}. Pure. */
export function knotsOf(g, n, seed = 7293) {
  let a = seed >>> 0;
  const rand = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const pos = new Float32Array(3 * n), knot = new Float32Array(4 * n);
  const K = g.knots;
  for (let i = 0; i < n; i++) {
    let p;
    for (let tries = 0; tries < 20; tries++) {
      const phi = 2 * Math.PI * rand();
      if (rand() < K.inRing) {
        const r = g.R2 + gauss() * 0.4 * g.H2, z = gauss() * 0.4 * g.H2;
        p = [0, 1, 2].map((c) => (g.r1[c] * Math.cos(phi) + g.r2[c] * Math.sin(phi)) * r + g.a2[c] * z);
      } else {
        // On the inner edge of the ring (the rim, q ≈ 1.0), thinning inward to the paper's 2.2′.
        const q = 1.0 - Math.abs(gauss()) * 0.12 + gauss() * 0.03;
        const z = gauss() * 0.4 * g.H1;
        p = [0, 1, 2].map((c) => (g.d1[c] * Math.cos(phi) + g.d2[c] * Math.sin(phi)) * q * g.R1 + g.a1[c] * z);
      }
      const r = Math.hypot(p[0], p[1], p[2]);
      if (r >= K.from && r <= K.to) break;
    }
    pos.set(p, 3 * i);
    knot.set([K.head * (0.6 + 0.8 * rand()), K.tail * (0.4 + 0.5 * rand()), 0.4 + 0.25 * rand(), rand()], 4 * i);
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
#define MAX_N ${MAX_N}
uniform vec3 uCam;        // the camera in the sky frame, light-years (CPU, float64, each frame)
uniform vec3 uA1;         // the inner disc's axis, and two directions in its plane
uniform vec3 uD1;
uniform vec3 uD2;
uniform vec3 uA2;         // the outer ring's axis, and two directions in its plane
uniform vec3 uE1;
uniform vec3 uE2;
uniform vec4 uDisc;       // R1, H1, N1 (its depth along our line), its box in radii
uniform vec4 uRing;       // R2, H2, N2, its box in radii
uniform vec4 uUv;         // the light map: u0, v0, 1 / W, 1 / H (x west -> u, y north -> v)
uniform float uBound;
uniform int uN;           // samples a ring
uniform sampler2D uLight; // the photograph without its stars (display values, gasmat.js COLOUR_POLICY)
uniform float uGamma;     // the exposure's stretch, as scene/nebulae.js gives the photograph
uniform float uSat;
uniform float uShare;
uniform float uGain;
uniform float uStreak;    // 0 under Measured (UNDER_MEASURED.streaks)
uniform float uTime;      // still under Measured, reduced motion and ?look=1 (UNDER_MEASURED.drift)
varying vec3 vObj;
#include <common>
#include <logdepthbuf_pars_fragment>

// The part of the ray inside a slab about axis a: |z| <= h, rIn <= rho <= rOut. Two pieces (lo1, hi1,
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

float pixelHash( vec2 p ) {
  vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
  p3 += dot( p3, p3.yzx + 33.33 );
  return fract( ( p3.x + p3.y ) * p3.z );
}
float spanLen( vec4 s ) { return max( 0.0, s.y - s.x ) + max( 0.0, s.w - s.z ); }
float spanT( vec4 s, float u ) { float l1 = max( 0.0, s.y - s.x ); return u < l1 ? s.x + u : s.z + ( u - l1 ); }

// The photograph's colour at sky point (x, y), stretched as the exposure stretches the photograph.
vec3 lightAt( vec2 xy ) {
  vec2 uv = uUv.xy + xy * uUv.zw;
  if ( uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0 ) return vec3( 0.0 );
  vec3 c = pow( max( texture2D( uLight, uv ).rgb, vec3( 0.0 ) ), vec3( uGamma ) );
  float y = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  return vec3( y ) + ( c - vec3( y ) ) * uSat;
}
// Of the light along our line at (x, y), the inner disc's share (helix.js discShare).
float discShare( vec2 xy ) {
  float zc = -( xy.x * uA1.x + xy.y * uA1.y ) / uA1.z;
  float q = length( vec3( xy, zc ) ) / uDisc.x;
  return 1.0 - smoothstep( ${f3(SHAPE.discIn)}, ${f3(SHAPE.discEdge)}, q );
}
// Seeded radial streaks in a ring's plane (Film only): finer than the photograph, drifting at most
// 1 % of a streak's width a minute.
float hash1( float n ) { return fract( sin( mod( n, 1000.0 ) * 12.9898 ) * 43758.5453 ); }
float streak( vec2 e, float r ) {
  if ( uStreak <= 0.0 ) return 1.0;
  float a = atan( e.y, e.x ) * ${f3(SHAPE.streakCells)} + 3.0 * sin( r * 2.3 ) + uTime;
  float i = floor( a );
  float f = fract( a );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix( 1.0, 0.55 + 0.9 * mix( hash1( i ), hash1( i + 1.0 ), f ), uStreak );
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
  // a static per-pixel offset: grain, never bands, and no temporal state
  float j = pixelHash( gl_FragCoord.xy );
  float dust = 0.0;
  // ---- the inner disc: the light inside its outline, emitted and self-absorbed along the slab
  vec3 C1 = vec3( 0.0 );
  float T1 = 1.0;
  vec4 s = layerSpan( ro, rd, uA1, ${f3(SHAPE.slab)} * uDisc.y, 0.0, uDisc.w * uDisc.x, t0, t1 );
  float L = spanLen( s );
  if ( L > 0.0 ) {
    float dt = L / float( uN );
    for ( int i = 0; i < MAX_N; i++ ) {
      if ( i >= uN ) break;
      vec3 p = ro + rd * spanT( s, ( float( i ) + j ) * dt );
      float z = dot( p, uA1 );
      float u = z / uDisc.y;
      float g = exp( -u * u * u * u );
      vec3 ip = p - uA1 * z;
      float r = length( ip );
      vec3 lc = lightAt( p.xy );
      float lum = dot( lc, vec3( 0.2126, 0.7152, 0.0722 ) );
      float sh = discShare( p.xy );
      float rho = g / uDisc.z * sh;
      float tau = ${f3(SHAPE.kappa)} * lum * sh;
      float comp = tau > 1e-4 ? tau / ( 1.0 - exp( -tau ) ) : 1.0;
      // each step integrated exactly for a constant density across it
      float ab = ${f3(SHAPE.kappa)} * lum * rho * dt;
      float w = ab > 1e-5 ? ( 1.0 - exp( -ab ) ) / ( ${f3(SHAPE.kappa)} * lum ) : rho * dt;
      C1 += T1 * lc * comp * w * streak( vec2( dot( ip, uD1 ), dot( ip, uD2 ) ), r );
      T1 *= exp( -ab );
      float rq = ( r / uDisc.x - ${f3(SHAPE.rimQ)} ) / ${f3(SHAPE.rimW)};
      dust += g * exp( -rq * rq ) * dt;
    }
  }
  // ---- the outer ring: the rest of the light, out to its fade
  vec3 C2 = vec3( 0.0 );
  float T2 = 1.0;
  s = layerSpan( ro, rd, uA2, ${f3(SHAPE.slab)} * uRing.y, 0.0, uRing.w * uRing.x, t0, t1 );
  L = spanLen( s );
  if ( L > 0.0 ) {
    float dt = L / float( uN );
    for ( int i = 0; i < MAX_N; i++ ) {
      if ( i >= uN ) break;
      vec3 p = ro + rd * spanT( s, ( float( i ) + j ) * dt );
      float z = dot( p, uA2 );
      float u = z / uRing.y;
      vec3 ip = p - uA2 * z;
      float r = length( ip );
      vec3 lc = lightAt( p.xy );
      float lum = dot( lc, vec3( 0.2126, 0.7152, 0.0722 ) );
      float sh = ( 1.0 - discShare( p.xy ) ) * ( 1.0 - smoothstep( ${f3(SHAPE.ringFade)}, ${f3(SHAPE.ringOut)}, r / uRing.x ) );
      float rho = exp( -u * u * u * u ) / uRing.z * sh;
      float tau = ${f3(SHAPE.kappa)} * lum * sh;
      float comp = tau > 1e-4 ? tau / ( 1.0 - exp( -tau ) ) : 1.0;
      float ab = ${f3(SHAPE.kappa)} * lum * rho * dt;
      float w = ab > 1e-5 ? ( 1.0 - exp( -ab ) ) / ( ${f3(SHAPE.kappa)} * lum ) : rho * dt;
      C2 += T2 * lc * comp * w * streak( vec2( dot( ip, uE1 ), dot( ip, uE2 ) ), r );
      T2 *= exp( -ab );
    }
  }
  // the two rings add: each absorbs only its own light, so on our line their sum is the photograph
  vec3 col = C1 + C2;
  float mx = max( col.r, max( col.g, col.b ) );
  if ( mx > ${f3(SHAPE.knee)} ) col *= ( ${f3(SHAPE.knee)} + ${f3(1 - SHAPE.knee)} * ( 1.0 - exp( -( mx - ${f3(SHAPE.knee)} ) / ${f3(1 - SHAPE.knee)} ) ) ) / mx;
  float T = exp( -${f3(SHAPE.sigma)} * dust );
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
uniform float uMinPx;     // the smallest head drawn, CSS px
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
  // Drawn bigger than it is, a knot keeps more darkness than its area would: exaggerated so it can be
  // seen at mid distance (helix.yaml says so), and still fading with its true size.
  vAlpha = aKnot.z * min( 1.0, 1.0 / sqrt( grow ) );
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
  float tailA = vUv.x > 0.0 ? ( 1.0 - smoothstep( 0.3 * w, w, abs( vUv.y ) ) ) * ( 1.0 - u ) * 0.25 : 0.0;
  float cr = ( d - 0.95 ) / 0.25;
  float cusp = exp( -cr * cr ) * ( 1.0 - smoothstep( -0.7, 0.2, vUv.x / max( d, 1e-3 ) ) ); // edges in order (GLSL)
  float a = vAlpha * max( headA, tailA );
  if ( a <= 0.002 && cusp <= 0.002 ) discard;
  gl_FragColor = vec4( uCusp * cusp * vAlpha * 1.4 * uGain * uShare, a * uShare );
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

  // --- the light: the photograph without its stars (scripts/build_deep_helix.py). Fetched with the hero.
  let lightTex = null, lightState = 'none';
  if (typeof document !== 'undefined' && THREE.TextureLoader) {
    lightState = 'loading';
    lightTex = new THREE.TextureLoader().load(new URL(LIGHT_URL, import.meta.url).href,
      () => { lightState = 'ready'; },
      undefined,
      (e) => { lightState = 'failed'; console.warn('deep: the Helix light map did not load', e); });
    lightTex.colorSpace = THREE.NoColorSpace; // display values, as the photographs (gasmat.js COLOUR_POLICY)
    lightTex.wrapS = lightTex.wrapT = THREE.ClampToEdgeWrapping;
    lightTex.minFilter = THREE.LinearMipmapLinearFilter;
    lightTex.magFilter = THREE.LinearFilter;
  }
  const pal0 = paletteFor(1, profile);
  // --- the gas
  const gasGeo = new THREE.IcosahedronGeometry(g.bound * 1.09, 3);
  const V3 = (v) => new THREE.Vector3(...v);
  const gasMat = material(THREE, {
    vertexShader: GAS_VERT, fragmentShader: GAS_FRAG, absorbing: true, side: THREE.BackSide,
    uniforms: {
      uCam: { value: new THREE.Vector3(0, 0, 10) },
      uA1: { value: V3(g.a1) }, uD1: { value: V3(g.d1) }, uD2: { value: V3(g.d2) },
      uA2: { value: V3(g.a2) }, uE1: { value: V3(g.r1) }, uE2: { value: V3(g.r2) },
      uDisc: { value: new THREE.Vector4(g.R1, g.H1, g.N1, SHAPE.discOut) }, uRing: { value: new THREE.Vector4(g.R2, g.H2, g.N2, SHAPE.ringOut) },
      uUv: { value: new THREE.Vector4(g.uv.u0, g.uv.v0, 1 / g.uv.W, 1 / g.uv.H) },
      uBound: { value: g.bound }, uN: { value: 8 }, uLight: { value: lightTex },
      uGamma: { value: pal0.gamma }, uSat: { value: pal0.saturation },
      uShare: { value: 0 }, uGain: { value: 1 }, uStreak: { value: 0 }, uTime: { value: 0 },
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
    uniforms: { uViewH: { value: 800 }, uMinPx: { value: g.knots.minPx }, uCusp: { value: new THREE.Color().setRGB(...pal0.cusp, THREE.NoColorSpace) }, uShare: { value: 0 }, uGain: { value: 1 } },
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

  let level = 0, levelShare = 0, clock = 0, samples = 8, tierNow = 1, last = { gas: 0, knots: 0, star: 0, photo: 0, light: 1 }, palette = pal0;
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
      const vw = (typeof globalThis.innerWidth === 'number' && globalThis.innerWidth) || 1280;
      const vh = (typeof globalThis.innerHeight === 'number' && globalThis.innerHeight) || 800;
      const sh = sharesFor({ level: levelShare, rPx: info.rPx, photo: info.photo, viewH: vh });
      last = { ...sh, photo: Number(info.photo) || 0 };
      samples = samplesFor({ tier, steps: info.steps });
      const gain = Number.isFinite(info.gain) ? info.gain : 1;
      if (gain !== palette.gainIn) {
        palette = { ...paletteFor(gain, profile), gainIn: gain };
        setColour(knotMat.uniforms.uCusp, palette.cusp); setColour(starMat.uniforms.uColour, palette.star);
        gasMat.uniforms.uGamma.value = palette.gamma; gasMat.uniforms.uSat.value = palette.saturation;
      }
      const look = info.look || 'film';
      const still = !!(info.frozen || info.reduced) || stillUnder(look, UNDER_MEASURED.drift);
      // At most 1 % of a streak's width a minute (design section 7): barely perceptible, never under Measured.
      if (!still) clock += ((Number(info.dtMs) || 0) / 60000) * 0.01;
      const gu = gasMat.uniforms;
      const lit = lightState === 'ready';
      gu.uShare.value = lit ? sh.gas : 0;
      gu.uN.value = samples;
      gu.uStreak.value = drawnUnder(look, UNDER_MEASURED.streaks) ? SHAPE.streakAmp : 0;
      gu.uTime.value = clock;
      gu.uGain.value = palette.gain * SHAPE.exposure * sh.light;
      knotMat.uniforms.uGain.value = palette.gain * sh.light;
      knotMat.uniforms.uShare.value = drawnUnder(look, UNDER_MEASURED.knots) ? sh.knots : 0;
      starMat.uniforms.uShare.value = sh.star;
      gas.visible = gu.uShare.value > 0.002;
      knots.visible = knotMat.uniforms.uShare.value > 0.002;
      star.visible = sh.star > 0.002;
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
    // The light map is the one thing it fetches: ready once it has landed (or failed, and said so).
    ready: () => lightState !== 'loading',
    stats: () => ({
      level, share: Math.round(last.gas * 100) / 100, photo: Math.round(last.photo * 100) / 100, star: Math.round(last.star * 100) / 100,
      light: lightState, samples, tier: tierNow, palette: palette.mode, knots: knotCount, meshes: 3, points: knotCount, textures: lightTex ? 1 : 0,
      bytes: knotBytes + gasGeo.getAttribute('position').array.byteLength + quad.byteLength * 2 + (lightTex ? Math.round(512 * 474 * 4 * 4 / 3) : 0),
    }),
    dispose() {
      if (knots) knots.geometry.dispose();
      gasGeo.dispose(); starGeo.dispose();
      gasMat.dispose(); knotMat.dispose(); starMat.dispose();
      if (lightTex) lightTex.dispose();
      knots = null;
      if (group.parent) group.parent.remove(group);
    },
  };
}

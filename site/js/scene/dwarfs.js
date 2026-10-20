// scene/dwarfs.js -- each far dwarf planet's own look, and what is not known about it (internal #865,
// spec 0077 W1-f).
//
// Contract: DWARF_LOOKS, dwarfLook(id), dwarfColour(look) -> '#rrggbb', dwarfBrightness(albedo),
//           buildDwarf(look, { THREE, mesh, record }) -> THREE.Group  (scene/models.js buildAsteroid
//           calls it for a record that has a row here), dwarfFacts(id) -> the card's words' inputs
//
// Until 1.3.0 Eris, Haumea, Makemake, Sedna, Gonggong, Quaoar and Orcus were the generic asteroid at
// their size: the same brown ball for all seven, the class colour of the asteroid layer. None of
// them has ever been resolved into a map, so what can be drawn of each is what is measured of it as
// a point of light, and nothing more (the package's guardrail: "Unobserved hemisphere should not be
// falsely detailed"):
//
//   COLOUR. Each one's colour indices, B-V and V-R, are its reflectance at three wavelengths against
//     the Sun's (B-V 0.67, V-R 0.36 for the Sun, the values the surveys of these bodies' colours
//     divide by: Hainaut and Delsanti 2002, A&A 389, 641). Reflectance over the Sun's in B, V and R is
//     10^(-0.4 (index - the Sun's)) in each step, and B, V and R
//     are taken as blue, green and red (dwarfColour). So Sedna and Gonggong come out red, Eris and
//     Orcus nearly grey, and that is what the telescopes say.
//   BRIGHTNESS. The geometric albedo, from 0.12 (Quaoar) to 0.96 (Eris). The house's rule for small
//     bodies drawn as models (scripts/build-textures.py SMALL_BODY_TINT: Ceres's grey for 0.09,
//     Vesta's for 0.42) is extended on a line in log albedo through those two (dwarfBrightness): the
//     ORDER is kept and the CONTRAST is squeezed, from 7.7 to 1 down to 1.8 to 1, so the darkest is
//     not coal on a black sky. The card says the brightness is squeezed.
//   SHAPE. Where it is measured: Haumea's egg, 2 122 x 1 688 x 1 036 km, from its light curve and
//     the 2017 occultation; Quaoar's 1 167 x 1 111 x 1 020 km and Makemake's 1 434 x 1 420 km from
//     occultations; Eris round (its 2010 occultation). The other three are drawn round because
//     nothing says otherwise, and the card says their shape is not known.
//   RINGS. Haumea's, at 2 287 km from its centre, 70 km wide, opacity 0.5, in its equator (Ortiz et
//     al. 2017, Nature 550, 219), drawn at all three. Quaoar's two are as thin as 0.004 in optical
//     depth: at their real opacity they would not show, and they are not drawn bolder than they are;
//     the card names them instead.
//   SURFACE. Nothing: a smooth ball in one colour, no craters, no spots, no ice caps. Haumea's dark
//     red spot (Lacerda 2009) is left out too: one team's light curve, never seen again.
//
// What is NOT drawn and the card says: their spins (Haumea's day is 3.9 hours; the model holds
// still, as every asteroid here does), the tilt of Haumea's ring on the sky, and Sedna's size, known
// only to +314 / -258 km (its row's own range, sample.js).
//
// Sources (every number below, read 2026-10-20): the Wikipedia article of each, its infobox and the
// papers it cites by name in the row: https://en.wikipedia.org/wiki/Eris_(dwarf_planet), /Haumea,
// /Makemake, /90377_Sedna, /225088_Gonggong, /50000_Quaoar, /90482_Orcus.

/**
 * One row per far dwarf planet (data/sample.js FAR_BODIES ids). Lengths in km. `bv`, `vr`: colour
 * indices; `albedo`: geometric albedo; `axes`: the measured shape's three diameters (a >= b >= c, c
 * the spin axis), or null for round; `ring`: radius, width (km), opacity; `faintRings`: rings not
 * drawn; `known`: what kind of picture there is of it (the card's word); `src`: whose numbers.
 */
export const DWARF_LOOKS = {
  'dwarf-eris': { albedo: 0.96, bv: 0.78, vr: 0.45, axes: null, round: 'measured', known: 'point', src: 'albedo Sicardy et al. 2011; colour Snodgrass et al. 2010; round from the 2010 occultation' },
  'dwarf-haumea': { albedo: 0.51, bv: 0.64, vr: 0.33, axes: [2122, 1688, 1036], ring: { radiusKm: 2287, widthKm: 70, opacity: 0.5 }, known: 'point', src: 'albedo and ring Ortiz et al. 2017; colour Snodgrass et al. 2010; shape Proudfoot et al. 2026' },
  'dwarf-makemake': { albedo: 0.82, bv: 0.868, vr: 0.449, axes: [1434, 1434, 1420], known: 'point', src: 'albedo Hromakina et al. 2019; colour Alvarez-Candal et al. 2020; shape Brown 2013' },
  'dwarf-sedna': { albedo: 0.41, bv: 1.24, vr: 0.78, axes: null, round: 'unknown', known: 'point', src: 'albedo Lellouch et al. 2013; colour Tegler 2006' },
  'dwarf-gonggong': { albedo: 0.14, bv: 1.38, vr: 0.86, axes: null, round: 'unknown', known: 'point', src: 'albedo Kiss et al. 2019; colour Boehnhardt et al. 2014' },
  'dwarf-quaoar': { albedo: 0.124, bv: 0.94, vr: 0.64, axes: [1166.6, 1110.6, 1020], faintRings: 2, known: 'point', src: 'albedo and rings Pereira et al. 2023; colour Tegler 2007; shape Proudfoot et al. 2025' },
  'dwarf-orcus': { albedo: 0.231, bv: 0.68, vr: 0.37, axes: null, round: 'unknown', known: 'point', src: 'albedo Fornasier et al. 2013; colour de Bergh et al. 2005' },
};

/** The Sun's own colour indices (Hainaut and Delsanti 2002). */
export const SUN_BV = 0.67;
export const SUN_VR = 0.36;
/** The two anchors of the small bodies' brightness rule (scripts/build-textures.py SMALL_BODY_TINT). */
export const SMALL_BODY_ANCHORS = [[0.09, '#8a8580'], [0.42, '#b0aaa0']];

/** The row for a record id, or null. */
export function dwarfLook(id) {
  return Object.prototype.hasOwnProperty.call(DWARF_LOOKS, id) ? DWARF_LOOKS[id] : null;
}

const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const lum = (rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
function hexLin(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => toLin(v / 255));
}

/**
 * The linear luminance a body of geometric albedo `albedo` is drawn at: on a straight line in log
 * albedo through Ceres's and Vesta's greys (SMALL_BODY_ANCHORS), held between 0.05 and 0.75. Pure.
 */
export function dwarfBrightness(albedo) {
  const [[a0, h0], [a1, h1]] = SMALL_BODY_ANCHORS;
  const l0 = lum(hexLin(h0));
  const l1 = lum(hexLin(h1));
  const t = (Math.log10(albedo) - Math.log10(a0)) / (Math.log10(a1) - Math.log10(a0));
  return Math.min(0.75, Math.max(0.05, l0 + t * (l1 - l0)));
}

/** Reflectance in blue, green and red over the Sun's, from B-V and V-R, green 1. Pure. */
export function relativeReflectance(bv, vr) {
  return [10 ** (0.4 * (vr - SUN_VR)), 1, 10 ** (-0.4 * (bv - SUN_BV))];
}

/** The colour a row is drawn in, sRGB hex: its colour indices at its brightness. Pure. */
export function dwarfColour(look) {
  const rel = relativeReflectance(look.bv, look.vr);
  const k = dwarfBrightness(look.albedo) / lum(rel);
  let rgb = rel.map((c) => c * k);
  const top = Math.max(...rgb);
  if (top > 1) rgb = rgb.map((c) => c / top);
  return '#' + rgb.map((c) => Math.round(toSrgb(Math.min(1, Math.max(0, c))) * 255).toString(16).padStart(2, '0')).join('');
}

/** What the card needs to say what is measured and what is not about this body's drawing. Pure. */
export function dwarfFacts(id) {
  const L = dwarfLook(id);
  if (!L) return null;
  return {
    shape: L.axes && L.axes[0] / L.axes[2] > 1.3 ? 'egg' : L.axes || L.round === 'measured' ? 'measured' : 'unknown',
    ring: !!L.ring,
    faintRings: L.faintRings || 0,
    red: relativeReflectance(L.bv, L.vr)[0] > 1.4,
    albedo: L.albedo,
    src: L.src,
  };
}

/**
 * The body, about one unit across (scene/models.js's convention): the measured ellipsoid or a ball,
 * smooth, in its colour, with Haumea's ring in its equator. +Y is the spin axis. `mesh` is
 * models.js's own maker, so the body wears the same light as Ceres beside it ('world': the smooth
 * ramp a mapped small body uses).
 */
export function buildDwarf(look, { THREE, mesh, record }) {
  const g = new THREE.Group();
  const diameterKm = record && record.meta ? Number(record.meta.diameterKm) : NaN;
  const axes = look.axes || [diameterKm, diameterKm, diameterKm].map((v) => (Number.isFinite(v) ? v : 1000));
  const ringOuter = look.ring ? 2 * (look.ring.radiusKm + look.ring.widthKm / 2) : 0;
  const span = Math.max(axes[0], ringOuter);
  const geo = new THREE.SphereGeometry(0.5, 64, 48);
  geo.scale(axes[0] / span, axes[2] / span, axes[1] / span);
  const body = mesh(geo, dwarfColour(look), 'world', 'body');
  g.add(body);
  if (look.ring) {
    const inner = (look.ring.radiusKm - look.ring.widthKm / 2) / span;
    const outer = (look.ring.radiusKm + look.ring.widthKm / 2) / span;
    const rg = new THREE.RingGeometry(inner, outer, 256, 1);
    rg.rotateX(-Math.PI / 2);    // into the equator, the XZ plane
    // Its colour is not measured: the body's, a little darker. A colour no other part uses, so its
    // material (made transparent below) is its own in the model's pool.
    const ring = mesh(rg, '#8c8a86', 'world', 'ring');
    ring.material.transparent = true;
    ring.material.opacity = look.ring.opacity;
    ring.material.side = THREE.DoubleSide;
    ring.material.depthWrite = false;
    g.add(ring);
  }
  g.userData.realSizeM = span * 1000;
  g.userData.dwarf = true;
  return g;
}

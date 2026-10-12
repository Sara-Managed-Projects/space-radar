// scene/atmosphere.js -- the air on Mars, Venus and Titan (spec 0054 task 3, 2026-09-29).
//
// Contract: ATMO_PARAMS, atmosphereCoefficients(params), scatter(params, ro, rd, sunDir),
//           createAirShell(key) -> THREE.Mesh, AIR_SHELL_FRAG
//
// THE EARTH'S SHELL, GENERALISED. Public #317 gave the Earth a single-scattering shell (scene/earth.js
// ATMO_FRAG): the view ray is marched through the air between the shell and the ground, and at each
// step the ray to the Sun, Rayleigh for the molecules and Mie for the particles. The spec (0054
// requirement 4) asks for the same thing on the three other worlds with air, each with its own
// numbers, and names "0053's scene/atmosphere.js" as where it lives. 0053 has not been built, so this
// is that module, holding the three worlds; the Earth keeps its own shader in earth.js untouched,
// which is what #317 shipped and what this PR does not touch.
//
// WHAT IS DIFFERENT FROM THE EARTH'S, and why:
//   - PARTICLES THAT ABSORB. The Earth's Mie is white and nearly conservative. Mars's dust and
//     Titan's haze absorb blue, which is WHY the one is butterscotch and the other orange: each
//     world's Mie scattering is its extinction times a single-scattering albedo per colour.
//   - A PHASE PER COLOUR. The blue sunset on Mars is its dust sending blue light forward more
//     narrowly than red (the grains are ~1.5 um: large next to blue light). Three Henyey-Greenstein
//     asymmetries, one per channel, draw exactly that: a blue aureole around the Sun and butterscotch
//     everywhere else, from one set of numbers and no special case. That blue is seen from the
//     ground, inside the air, within a few degrees of the Sun; from orbit Mars is never blue (below).
//   - LIGHT SCATTERED MORE THAN ONCE, on Mars only (internal #187, 2026-10-01). Single scattering
//     with a big light gain drew a backlit Mars as a white-blue ring: at 160 degrees of phase the
//     forward lobe, times a gain fitted for the day side, swamped everything and clipped to white.
//     Backlit Mars in MAVEN, Mars Express and Hope images is a reddish-brown crescent with a thin
//     pale haze at its edge, because a limb ray crosses tens of optical depths of dust and most of
//     what comes out has been scattered many times, losing blue each time. So Mars's row draws the
//     single-scattered light at its own small gain and adds the diffuse light: at each step, the
//     sunlight the dust took out of the beam on its way there, dying with depth at the diffusion
//     rate sqrt(3 (1 - albedo)(1 - albedo g)) per colour, spread evenly, and met by the albedo at
//     least twice. Deep in the air that is red; high up, where little was taken out, the thin
//     single-scattered haze is what is left, and pale. Over the disc it is drawn only for the slant
//     share of the path, as the dimming is (the map was photographed through the rest). Venus and
//     Titan have no `multiple` and draw exactly what #342 drew.
//   - OVER THE DISC TOO. The Earth's shell is BackSide, so its disc behind is hidden by depth and only
//     the limb pays. This shell is drawn from its FRONT while the camera is outside it: the same
//     number of fragments (the log depth buffer writes gl_FragDepth, so no early-z culls the hidden
//     back half anyway), and the ray from the front face to the ground is the haze IN FRONT of the
//     disc -- Mars's limb goes pale, Titan's disc goes fuzzy at the edge -- which the back face can
//     never draw. Inside the shell (a camera below Titan's haze top) it switches to its back face.
//   - IT DIMS WHAT IS BEHIND IT. Blending is src + dst x T, T the grey transmittance along the view
//     ray: the haze hides the ground and the stars behind the limb as much as it glows.
//
// TWILIGHT (public #417, 2026-10-08), on a row that has it. Single scattering has a geometric
// shadow: a step of the view ray either sees the Sun or does not, and the glow stops dead at the
// terminator. In a deep, bright haze it does not: light that has been scattered many times creeps
// round. That is not computed here. A row with `twilight` lights the steps inside the shadow too,
// by exp(-depth / twilight), depth being how far inside the shadow's cylinder the step is, with
// the light path of a Sun on the horizon; so the glow thins out round the night side instead of
// ending. How far it reaches is CHOSEN, to look like the pictures, and the card says so
// (copy/en.js drawing.worldDeparture.venus). A row without it draws exactly what it drew.
//
// THE EARTH'S SHELL COUNTS A MISS AS A HIT. Its sphere() returns (1e9, -1e9) when a ray misses, and
// its shadow test is `sphere( p, uSunDir, 1.0 ).x > 0.0`, which a miss passes: every step whose ray to
// the Sun clears the Earth -- the ordinary sunlit case -- is skipped as shadowed, and only steps inside
// the cylinder behind the day side (where the backward line crosses the globe) are lit. It reads as a
// glow brightest under the Sun and fading toward the terminator, which is why nobody saw it. Found
// writing this twin; the two tests here are bounded (`< 1e8`). earth.js is #317's and not this PR's,
// so it is reported, not changed.
//
// HONESTY. The scale heights, pressures and optical depths below are published figures, and each
// row's comment says whose. Two things are not: the drawn thickness of the air (`heightGain`, the same
// device as the Earth's ATMO_HEIGHT_GAIN: at the sizes these discs are drawn a real 11 km of Martian
// air is under a pixel) and the particle colours and asymmetries, which are chosen to match
// photographs, not measured -- and the card says so (copy/en.js drawing.airIllustrative).
//
// COST. 12 view steps, as the Earth's, and no light steps (chapman() below) per fragment of the shell. A shell is drawn only
// when its world's disc is big enough to show air (AIR_AT_HALF_VIEW), so from the default view none
// of the three adds a draw call, and the frame latch turns them off for good and brings #318's rims
// back (scene/worlds.js).

import * as THREE from '../../vendor/three.module.min.js';

/** View steps: the Earth's (scene/earth.js ATMO_FRAG). The light path has no steps: see chapman(). */
export const VIEW_STEPS = 12;

/**
 * THE LIGHT PATH, WITHOUT MARCHING IT. The Earth's shell marches 4 steps toward the Sun from each of
 * its 12 view steps: 48 exponentials a fragment. In an exponential atmosphere the optical depth from a
 * point toward the Sun is a closed form times the Chapman grazing-incidence function, and Schuler's
 * approximation of that (GPU Pro 3, 2012), written here with c = sqrt(pi/2 (X + h)) so it is exact
 * straight up and right at the horizon, is one sqrt and one exp. Measured against a 20 000-step
 * integration over every elevation from overhead to 6 degrees below the horizon and three scale
 * heights: within 12 %, and within 6 % above 30 degrees (tests/test_air.mjs). The 4-step march it
 * replaces is not closer than that on a grazing path, and this cut the shell's cost by about a
 * third in software rendering (the PR's numbers).
 *
 *   X      the world's radius over the scale height
 *   h      the point's height over the scale height
 *   cosChi the cosine of the Sun's zenith angle there; below the horizon the path is folded through
 *          its lowest point, where the function is known, and the far half subtracted
 * @returns the column toward the Sun, in scale heights of air at the ground: times beta H it is tau
 */
export function chapman(X, h, cosChi) {
  if (cosChi >= 0) return chapmanUp(X, h, cosChi) * Math.exp(-h);
  const x0 = Math.sqrt(1 - cosChi * cosChi) * (X + h);
  return 2 * chapmanUp(x0, 0, 0) * Math.exp(X - x0) - chapmanUp(X, h, -cosChi) * Math.exp(-h);
}
function chapmanUp(X, h, cosChi) {
  const c = Math.sqrt((Math.PI / 2) * (X + h));
  return c / ((c - 1) * cosChi + 1);
}

/**
 * A world's air, in the units the shader wants: lengths in the world's own radius.
 *
 *   radiusKm     the body's mean radius (the mesh's unit)
 *   topKm        the height the shell is drawn to, before heightGain
 *   gasHKm       the gas scale height, km
 *   gasBeta      Rayleigh scattering at the reference level, per metre, R G B (680, 550, 440 nm)
 *   dustHKm      the particles' scale height, km
 *   dustTau      the particles' vertical optical depth above the reference level (visible)
 *   dustAlbedo   single-scattering albedo, R G B: the share of the particles' extinction that is scattering
 *   dustG        Henyey-Greenstein asymmetry, R G B
 *   heightGain   how much thicker the air is drawn than it is (illustrative, as the Earth's 2.5)
 *   sun          light gain: the shell's brightness against the disc's, fitted by eye
 *   twilight     (optional, Venus) how far light is carried into the world's shadow, in radii: see
 *                TWILIGHT in the header. Illustrative, and the card says so.
 *   multiple     (optional) the diffuse light's gain, fitted by eye; with it, what is seen through
 *                the air is dimmed by the transport extinction ext x (1 - albedo g), the similarity
 *                relation, since the light scattered forward is drawn back in by this term
 */
export const ATMO_PARAMS = {
  // MARS. Surface pressure 610 Pa at 210 K: 2.1e23 molecules per m^3, 0.0084 of the Earth's sea level;
  // CO2's Rayleigh cross-section is 2.4x air's (refractivity 4.5e-4 against 2.9e-4, squared). So the
  // gas scatters 0.020 of the Earth's sea-level air: the Earth's (5.8, 13.5, 33.1)e-6 per m times that.
  // Scale height 11.1 km (NASA Mars fact sheet). Dust: optical depth 0.5 in a clear season (the rovers'
  // Pancam tau record runs 0.3 to 1 outside storms), in the gas's scale height; single-scattering
  // albedo 0.97 red to 0.72 blue, and a forward lobe narrower in blue (illustrative: chosen so the
  // sunlit limb comes out butterscotch and the air toward the Sun blue, as the rovers' skies are).
  // The light (internal #187): single scattering at 0.3 and the diffuse light at 12, both fitted by
  // eye in headless Chrome at 0, 90 and 160 degrees of phase, so the day-side limb keeps #342's
  // butterscotch (B/R 0.51 against 0.47) and the backlit limb is a warm crescent under a pale rim
  // with nothing clipped to white. Drawn 1.5 times as thick as it is, not 3: the rim is a line, not
  // a band (at 3 the full-phase limb was a khaki ring a tenth of the radius wide).
  mars: {
    radiusKm: 3389.5,
    topKm: 60,
    gasHKm: 11.1,
    gasBeta: [5.8e-6 * 0.020, 13.5e-6 * 0.020, 33.1e-6 * 0.020],
    dustHKm: 11.1,
    dustTau: 0.5,
    dustAlbedo: [0.97, 0.88, 0.72],
    dustG: [0.62, 0.66, 0.74],
    heightGain: 1.5,
    sun: 0.3,
    multiple: 12,
  },
  // VENUS. The map is the cloud tops, about 70 km up; the shell is what lies above them. CO2 at the
  // cloud tops: about 3 kPa at 230 K (Venus International Reference Atmosphere), 0.038 of the Earth's
  // sea-level number density, times CO2's 2.4 -- 0.09 of the Earth's Rayleigh. Scale height there
  // 4.9 km (kT / mg at 230 K). The upper haze of sulfuric-acid droplets above the clouds, nearly
  // conservative, pale yellow (the unknown UV absorber), forward-scattering -- the bright ring a
  // backlit Venus shows at inferior conjunction.
  //
  // A THICK AIR, DRAWN THICK (public #417, 2026-10-08). #342 drew this row as a thin lit line: 0.2 of
  // optical depth in 4 km, three times its height, a shell 1.5 % of the radius deep, and a shadow
  // with a knife's edge. Venus is the one world here whose air is 90 bar of CO2 under 20 km of
  // cloud, and what a camera sees of that is (a) a limb that is soft, not an edge, and (b) light
  // carried well past the terminator: the cusps of the crescent reach round, and near inferior
  // conjunction they close into a ring (Russell 1899; every Akatsuki and Pioneer Venus limb
  // picture). So the haze above the cloud tops is drawn to 60 km over them with a 12 km scale
  // height and an optical depth of 0.5 (ILLUSTRATIVE, all three: the measured upper haze thins out
  // by about 90 to 100 km altitude with scale heights of a few km, and its depth above the tops
  // is a few tenths), six times as thick as that -- a shell 6 % of the radius deep -- and
  // `twilight`, which is not physics at all: light is let into the planet's shadow, dying by e
  // for every 0.04 of a radius of depth into the shadow's cylinder (TWILIGHT in the header).
  // Cream, not white: the albedo falls toward blue. The numbers were set on the JS twin
  // (scatter()) and then by one frame each at 75, 120 and 150 degrees of phase: about 0.2 of the
  // disc's light along the sunlit limb, 0.05 ten to fifteen degrees past the terminator, under
  // 0.01 at thirty.
  venus: {
    radiusKm: 6051.8,
    topKm: 60,
    gasHKm: 4.9,
    gasBeta: [5.8e-6 * 0.09, 13.5e-6 * 0.09, 33.1e-6 * 0.09],
    dustHKm: 12.0,
    dustTau: 0.5,
    dustAlbedo: [0.995, 0.96, 0.84],
    // 0.45, not #342's 0.6: with this much haze a 0.6 lobe made the backlit ring 8.5 times the disc.
    dustG: [0.45, 0.45, 0.45],
    heightGain: 6.0,
    sun: 9.0,
    twilight: 0.04,
  },
  // TITAN. The ball is the haze as it looks (its row's tint); the shell is the upper haze over it,
  // which Cassini photographed extending hundreds of km above the disc, with a detached layer near
  // 500 km. Nitrogen at 1.5 bar and 94 K is 4.4x the Earth's sea-level density, but by the upper haze
  // the gas is thin: the scattering that turns the limb's top blue is small haze particles, drawn as a
  // Rayleigh-like term at 0.006 of the Earth's sea-level air with a long scale height, 80 km, so it
  // wins only near the top (illustrative, both numbers). The orange haze: scale height 45 km, optical
  // depth 1.0 above the drawn ball (chosen: the ball already IS the haze as seen), single-scattering albedo 0.95 red to 0.3 blue (it absorbs blue,
  // which is the orange), forward-scattering (the ring of light a backlit Titan shows). Drawn at its
  // true height (heightGain 1): Titan's air is thick enough to see at any size this map draws it.
  titan: {
    radiusKm: 2574.76,
    topKm: 520,
    gasHKm: 80,
    gasBeta: [5.8e-6 * 0.006, 13.5e-6 * 0.006, 33.1e-6 * 0.006],
    dustHKm: 45,
    dustTau: 1.0,
    dustAlbedo: [0.95, 0.68, 0.3],
    dustG: [0.62, 0.62, 0.6],
    heightGain: 1.0,
    sun: 12.0,
  },
};

/**
 * The shader's numbers from a row: everything per body radius.
 * @returns {{top:number, hR:number, hM:number, betaR:number[], betaM:number[], extM:number[], g:number[], sun:number}}
 */
export function atmosphereCoefficients(p) {
  const R = p.radiusKm;
  const gain = p.heightGain || 1;
  const hR = (p.gasHKm * gain) / R;
  const hM = (p.dustHKm * gain) / R;
  const Rm = R * 1000;
  // The gas: the sea-level coefficient per metre, per body radius. The drawn scale height is gain x
  // the real one, so the drawn column holds gain x the real gas; dividing by the gain keeps the
  // vertical optical depth -- how much the air dims and glows -- the measured one.
  const betaR = p.gasBeta.map((b) => (b * Rm) / gain);
  // The particles: a vertical optical depth tau over a scale height H means beta(0) = tau / H, and in
  // body radii with the drawn height, tau / hM.
  const ext = p.dustTau / hM;
  const extM = [ext, ext, ext];
  const betaM = p.dustAlbedo.map((a) => a * ext);
  // LIGHT SCATTERED MORE THAN ONCE (header), for a row with `multiple` (its gain; 0 without): how
  // fast the diffuse light dies with depth in each colour. Blue, absorbed more, dies first.
  const multi = p.multiple ? p.multiple : 0;
  const kappa = p.dustAlbedo.map((a, k) => Math.sqrt(3 * (1 - a) * (1 - a * p.dustG[k])));
  // What is seen through the particles is dimmed by their extinction less the light they send on
  // forward (the similarity relation). Only for a row with `multiple`, whose scattered light is
  // drawn back in; a row without keeps the plain extinction.
  const extT = multi ? p.dustAlbedo.map((a, k) => ext * (1 - a * p.dustG[k])) : extM.slice();
  return { top: 1 + (p.topKm * gain) / R, hR, hM, betaR, betaM, extM, extT, g: p.dustG.slice(), sun: p.sun, multi, kappa, tauUp: p.dustTau, albedo: p.dustAlbedo.slice(), twilight: p.twilight || 0 };
}

/**
 * The optical depth straight up from the ground to the top of the shell, in channel k: beta H (1 -
 * exp(-(top - 1) / H)) for the gas and the particles. A world's map is a mosaic of pictures taken
 * from orbit THROUGH its air, so the air's straight-down dimming is already in the map, and the shell
 * takes it back out over the disc: what it dims there is the extra of a slanting path, which grows
 * toward the limb. Beyond the limb nothing is taken back, and the stars behind the air dim by all of it.
 */
export function verticalDepth(c, k) {
  const span = c.top - 1;
  return c.betaR[k] * c.hR * (1 - Math.exp(-span / c.hR)) + c.extT[k] * c.hM * (1 - Math.exp(-span / c.hM));
}

function sphere(ro, rd, r) {
  const b = ro[0] * rd[0] + ro[1] * rd[1] + ro[2] * rd[2];
  const c = ro[0] * ro[0] + ro[1] * ro[1] + ro[2] * ro[2] - r * r;
  const d = b * b - c;
  if (d < 0) return [1e9, -1e9];
  const s = Math.sqrt(d);
  return [-b - s, -b + s];
}

function hg(mu, g) {
  const g2 = g * g;
  return (3 / (8 * Math.PI)) * ((1 - g2) * (1 + mu * mu)) / ((2 + g2) * Math.pow(1 + g2 - 2 * g * mu, 1.5));
}

/**
 * The JS twin of AIR_SHELL_FRAG: the light scattered toward `ro` along `rd` (unit), and the grey
 * transmittance, for a sun direction `sunDir` (unit), all in body radii with the body at the origin.
 * Pure; tests/test_air.mjs holds its colours to the photographs' and its geometry to the shader's.
 * @returns {{rgb: number[], T: number}}
 */
export function scatter(p, ro, rd, sunDir) {
  const c = atmosphereCoefficients(p);
  const shell = sphere(ro, rd, c.top);
  const t0 = Math.max(shell[0], 0);
  let t1 = shell[1];
  const ground = sphere(ro, rd, 1);
  if (ground[0] > 0) t1 = Math.min(t1, ground[0]);
  if (!(t1 > t0)) return { rgb: [0, 0, 0], T: 1 };
  const ds = (t1 - t0) / VIEW_STEPS;
  let odR = 0; let odM = 0;
  const sumR = [0, 0, 0]; const sumM = [0, 0, 0]; const sumMS = [0, 0, 0];
  for (let i = 0; i < VIEW_STEPS; i++) {
    const tt = t0 + (i + 0.5) * ds;
    const q = [ro[0] + rd[0] * tt, ro[1] + rd[1] * tt, ro[2] + rd[2] * tt];
    const h = Math.max(Math.hypot(q[0], q[1], q[2]) - 1, 0);
    const dR = Math.exp(-h / c.hR) * ds;
    const dM = Math.exp(-h / c.hM) * ds;
    odR += dR; odM += dM;
    // In the world's shadow: the ray to the Sun meets the ground AHEAD. A miss returns 1e9, which is
    // not a hit (THE EARTH'S SHELL, in the header).
    const sh = sphere(q, sunDir, 1);
    const r = Math.hypot(q[0], q[1], q[2]);
    let cosChi = (q[0] * sunDir[0] + q[1] * sunDir[1] + q[2] * sunDir[2]) / r;
    let lit = 1;
    if (sh[0] > 0 && sh[0] < 1e8) {
      if (!(c.twilight > 0)) continue;
      // TWILIGHT (header): how deep this step is inside the shadow's cylinder, in radii.
      const along = q[0] * sunDir[0] + q[1] * sunDir[1] + q[2] * sunDir[2];
      const depth = 1 - Math.sqrt(Math.max(r * r - along * along, 0));
      lit = Math.exp(-depth / c.twilight);
    }
    // A twilight row's light path is never longer than a Sun on the horizon's, lit or shadowed, so
    // the glow falls smoothly through the terminator instead of dipping just before it.
    if (c.twilight > 0) cosChi = Math.max(cosChi, 0);
    const lR = c.hR * chapman(1 / c.hR, h / c.hR, cosChi);
    const lM = c.hM * chapman(1 / c.hM, h / c.hM, cosChi);
    for (let k = 0; k < 3; k++) {
      const att = Math.exp(-(c.betaR[k] * (odR + lR) + c.extM[k] * (odM + lM)));
      sumR[k] += dR * att * lit;
      sumM[k] += dM * att * lit;
      // LIGHT SCATTERED MORE THAN ONCE (header): the sunlight the dust took out of the beam on its way here, less
      // what died diffusing this deep (kappa), seen from here on.
      if (c.multi > 0) sumMS[k] += dM * Math.exp(-(c.betaR[k] * odR + c.extM[k] * odM)) * (1 - Math.exp(-c.extM[k] * lM)) * Math.exp(-c.kappa[k] * c.extM[k] * lM);
    }
  }
  const mu = rd[0] * sunDir[0] + rd[1] * sunDir[1] + rd[2] * sunDir[2];
  const phaseR = (3 / (16 * Math.PI)) * (1 + mu * mu);
  // Over the disc, only the SLANT dims: the map is a photograph taken through this air, so the
  // straight-down column's dimming is already in it (see verticalDepth below).
  const hitsGround = ground[0] > 0 && ground[0] < 1e8; // a miss is (1e9, -1e9), not a hit
  // And its glow: the diffuse light is drawn only for the share of the path that is slant.
  const slant = hitsGround ? Math.max(0, Math.min(1, 1 - c.tauUp / Math.max(c.extM[0] * odM, 1e-6))) : 1;
  const rgb = [0, 1, 2].map((k) => c.sun * (sumR[k] * c.betaR[k] * phaseR + sumM[k] * c.betaM[k] * hg(mu, c.g[k]))
    + c.multi * slant * sumMS[k] * c.betaM[k] * c.albedo[k] / (4 * Math.PI));
  const Tk = [0, 1, 2].map((k) => Math.exp(-(c.betaR[k] * odR + c.extT[k] * odM) + (hitsGround ? verticalDepth(c, k) : 0)));
  return { rgb, T: Math.min(1, (Tk[0] + Tk[1] + Tk[2]) / 3) };
}

const AIR_SHELL_VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vPosW;
varying vec3 vCentre;
varying float vShellR;
void main() {
  vec4 worldPos = modelMatrix * vec4( position, 1.0 );
  vPosW = worldPos.xyz;
  vCentre = ( modelMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
  vShellR = length( modelMatrix[0].xyz );
  gl_Position = projectionMatrix * viewMatrix * worldPos;
  #include <logdepthbuf_vertex>
}
`;

/** The shell's fragment shader: scene/earth.js ATMO_FRAG with each world's numbers as uniforms. */
export const AIR_SHELL_FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3  uSunDir;
uniform float uTop;       // shell radius / ground radius
uniform float uHR;        // gas scale height, ground radii
uniform float uHM;        // particle scale height, ground radii
uniform vec3  uBetaR;     // gas scattering at the ground, per ground radius
uniform vec3  uBetaM;     // particle scattering
uniform vec3  uExtM;      // particle extinction
uniform vec3  uExtT;      // particle extinction for what is seen THROUGH the air (atmosphereCoefficients extT)
uniform vec3  uG;         // particle asymmetry, per colour
uniform float uSun;
uniform vec3  uVertical;  // the straight-down optical depth, per colour (verticalDepth)
uniform float uMulti;     // the light scattered more than once: its gain, or 0 (LIGHT SCATTERED MORE THAN ONCE)
uniform vec3  uKappa;     // how fast it dies with depth, per colour
uniform vec3  uAlbedo;    // the particles' albedo: diffuse light has met it at least twice
uniform float uTauUp;     // the particles' optical depth straight up
uniform float uTwilight;  // how far light is carried into the shadow, in radii (TWILIGHT); 0: a hard shadow
varying vec3 vPosW;
varying vec3 vCentre;
varying float vShellR;
const int VIEW_STEPS = ${VIEW_STEPS};

// chapman() in scene/atmosphere.js: the column toward the Sun, with no march.
float chapmanUp( float X, float h, float cosChi ) {
  float c = sqrt( 0.5 * PI * ( X + h ) );
  return c / ( ( c - 1.0 ) * cosChi + 1.0 );
}
float chapman( float X, float h, float cosChi ) {
  if ( cosChi >= 0.0 ) return chapmanUp( X, h, cosChi ) * exp( -h );
  float x0 = sqrt( 1.0 - cosChi * cosChi ) * ( X + h );
  return 2.0 * chapmanUp( x0, 0.0, 0.0 ) * exp( X - x0 ) - chapmanUp( X, h, -cosChi ) * exp( -h );
}

vec2 sphere( vec3 ro, vec3 rd, float r ) {
  float b = dot( ro, rd );
  float c = dot( ro, ro ) - r * r;
  float d = b * b - c;
  if ( d < 0.0 ) return vec2( 1e9, -1e9 );
  d = sqrt( d );
  return vec2( -b - d, -b + d );
}

vec3 hg( float mu, vec3 g ) {
  vec3 g2 = g * g;
  return 3.0 / ( 8.0 * PI ) * ( ( 1.0 - g2 ) * ( 1.0 + mu * mu ) ) / ( ( 2.0 + g2 ) * pow( 1.0 + g2 - 2.0 * g * mu, vec3( 1.5 ) ) );
}

void main() {
  #include <logdepthbuf_fragment>
  float groundR = vShellR / uTop;
  vec3 ro = ( cameraPosition - vCentre ) / groundR;   // in ground radii, the world at the origin
  vec3 rd = normalize( vPosW - cameraPosition );
  vec2 shell = sphere( ro, rd, uTop );
  float t0 = max( shell.x, 0.0 );
  float t1 = shell.y;
  vec2 ground = sphere( ro, rd, 1.0 );
  if ( ground.x > 0.0 ) t1 = min( t1, ground.x );
  if ( t1 <= t0 ) discard;

  float ds = ( t1 - t0 ) / float( VIEW_STEPS );
  float odR = 0.0, odM = 0.0;
  vec3 sumR = vec3( 0.0 ), sumM = vec3( 0.0 ), sumMS = vec3( 0.0 );
  for ( int i = 0; i < VIEW_STEPS; i++ ) {
    vec3 p = ro + rd * ( t0 + ( float( i ) + 0.5 ) * ds );
    float h = max( length( p ) - 1.0, 0.0 );
    float dR = exp( -h / uHR ) * ds;
    float dM = exp( -h / uHM ) * ds;
    odR += dR;
    odM += dM;
    // In the world's shadow, this step sees no Sun: the ray to it meets the ground ahead. A miss is
    // (1e9, -1e9), which is not a hit, so the test is bounded above too.
    float sh = sphere( p, uSunDir, 1.0 ).x;
    float cosChi = dot( p, uSunDir ) / length( p );
    float lit = 1.0;
    if ( sh > 0.0 && sh < 1e8 ) {
      if ( uTwilight <= 0.0 ) continue;
      // TWILIGHT in scene/atmosphere.js: how deep this step is inside the shadow's cylinder, in radii.
      float along = dot( p, uSunDir );
      float depth = 1.0 - sqrt( max( dot( p, p ) - along * along, 0.0 ) );
      lit = exp( -depth / uTwilight );
    }
    if ( uTwilight > 0.0 ) cosChi = max( cosChi, 0.0 );
    float lR = uHR * chapman( 1.0 / uHR, h / uHR, cosChi );
    float lM = uHM * chapman( 1.0 / uHM, h / uHM, cosChi );
    vec3 att = exp( -( uBetaR * ( odR + lR ) + uExtM * ( odM + lM ) ) );
    sumR += dR * att * lit;
    sumM += dM * att * lit;
    // LIGHT SCATTERED MORE THAN ONCE in scene/atmosphere.js: the sunlight taken out of the beam on its way here.
    if ( uMulti > 0.0 ) sumMS += dM * exp( -( uBetaR * odR + uExtM * odM ) ) * ( 1.0 - exp( -uExtM * lM ) ) * exp( -uKappa * uExtM * lM );
  }

  float mu = dot( rd, uSunDir );
  float phaseR = 3.0 / ( 16.0 * PI ) * ( 1.0 + mu * mu );
  bool hitsGround = ground.x > 0.0 && ground.x < 1e8;
  float slant = hitsGround ? clamp( 1.0 - uTauUp / max( uExtM.x * odM, 1e-6 ), 0.0, 1.0 ) : 1.0;
  vec3 colour = uSun * ( sumR * uBetaR * phaseR + sumM * uBetaM * hg( mu, uG ) ) + uMulti * slant * sumMS * uBetaM * uAlbedo / ( 4.0 * PI );
  // Over the disc only the slant dims (verticalDepth() in scene/atmosphere.js says why): the map was
  // photographed through the straight-down column already.
  vec3 T = exp( -( uBetaR * odR + uExtT * odM ) + ( ground.x > 0.0 && ground.x < 1e8 ? uVertical : vec3( 0.0 ) ) );
  T = min( T, vec3( 1.0 ) );

  // src + dst x T (CustomBlending: One, SrcAlpha): the haze glows and dims what is behind it.
  gl_FragColor = vec4( colour, ( T.r + T.g + T.b ) / 3.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * The shell for a world whose row names `look.air`. A child of the world's unit sphere, scaled to
 * the drawn top of its air. worlds.js turns it on and off and keeps its sun direction.
 */
export function createAirShell(key) {
  const p = ATMO_PARAMS[key];
  if (!p) return null;
  const c = atmosphereCoefficients(p);
  const material = new THREE.ShaderMaterial({
    name: `air-${key}`,
    vertexShader: AIR_SHELL_VERT,
    fragmentShader: AIR_SHELL_FRAG,
    uniforms: {
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uTop: { value: c.top },
      uHR: { value: c.hR },
      uHM: { value: c.hM },
      uBetaR: { value: new THREE.Vector3(...c.betaR) },
      uBetaM: { value: new THREE.Vector3(...c.betaM) },
      uExtM: { value: new THREE.Vector3(...c.extM) },
      uExtT: { value: new THREE.Vector3(...c.extT) },
      uG: { value: new THREE.Vector3(...c.g) },
      uSun: { value: c.sun },
      uVertical: { value: new THREE.Vector3(verticalDepth(c, 0), verticalDepth(c, 1), verticalDepth(c, 2)) },
      uMulti: { value: c.multi },
      uKappa: { value: new THREE.Vector3(...c.kappa) },
      uTauUp: { value: c.tauUp },
      uTwilight: { value: c.twilight },
      uAlbedo: { value: new THREE.Vector3(...c.albedo) },
    },
    side: THREE.FrontSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.SrcAlphaFactor,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), material);
  mesh.scale.setScalar(c.top);
  mesh.name = `${key}-air`;
  mesh.renderOrder = 1;
  mesh.userData.kind = 'atmosphere';
  mesh.userData.top = c.top;
  return mesh;
}

// =================================================================================================
// THE EARTH'S AIR (spec 0053 tasks 1 and 2, internal #143 and #144, 2026-10-08)
// =================================================================================================
//
// Contract: EARTH_AIR, EARTH_LUT, earthColumn(h, mu), buildEarthLut(), lutColumns(lut, h, mu),
//           earthShell(ro, rd, sunDir, opts), createEarthAir(opts), setEarthAirSteps(mesh, n),
//           EARTH_AIR_FRAG, EARTH_AERIAL_GLSL, aerialAirmass(mu), aerialSun(mu, share), aerial(...)
//
// The Earth's shell was #317's ATMO_FRAG in scene/earth.js. It lives here now, and three things
// about it changed, each on purpose:
//
//   1. THE LIGHT PATH IS LOOKED UP, NOT MARCHED. From each of its view steps the old shader marched
//      4 steps toward the Sun: 48 pairs of exponentials a fragment. The air between a point and the
//      Sun depends on two numbers only -- the point's height and the Sun's zenith angle there -- so
//      it is a table: EARTH_LUT, 96 x 48, each texel the column of gas and the column of particles
//      from that height along that direction to the top of the shell. One fetch a step. The table
//      is BUILT IN THE PAGE (buildEarthLut: 4 608 texels x 48 steps, 5 to 50 ms, once, in an idle
//      moment after the first frame; the shell fades in when it is there, as the maps do), not
//      shipped as a picture: no bytes on the first visit, nothing to licence, nothing that can
//      drift from the shader's numbers, because both read EARTH_AIR. It holds COLUMNS, not
//      transmittance, in two half-float channels: the three colours' transmittances are then
//      exp(-(betaR col.r + betaM col.g)), exact for every colour from one fetch.
//      tests/test_atmo_lut.mjs holds the table within 2 % of a 20 000-step integration at five
//      angles, and the build deterministic.
//
//   2. A STEP THAT SEES THE SUN IS LIT. The old shadow test, `sphere( p, uSunDir, 1.0 ).x > 0.0`,
//      counted a miss (1e9) as a hit, so every step whose ray to the Sun CLEARED the Earth was
//      skipped as shadowed and only the steps over the day side's own cylinder were lit (found
//      writing the other worlds' twin, in the header above). The glow was right toward the Sun and
//      missing everywhere else: at full phase the Earth had no air outside its limb at all. The
//      table has no such test in it: a ray that dips under the ground meets air growing denser
//      without limit (the column is integrated through negative heights and capped), so the light
//      dies smoothly over the few kilometres past the horizon, which is the Earth's own penumbra
//      in its air, and is zero behind the planet. What is new on screen is the limb to either
//      side of the Sun's own, toward the poles of the terminator.
//
//   3. EACH STEP IS A SLAB, AND THE STEPS GO BY TIER. 8 view steps at tier 0, 12 at tier 1, 16 at
//      tier 2, and 6 for good once the frame latch has tripped (setEarthAirSteps; main.js tells it
//      with the other tier switches). That is only honest if 6 steps draw what 16 do, and #317's
//      sum did not: it moved by a factor of two between 6 steps and 64 (earthShell() says why and
//      what replaced it). The converged light is half again as bright near the ground as #317's
//      12 steps made it, so EARTH_AIR.sun is 11 where #317 had 14: within a quarter of the old
//      green from 10 to 60 km up on the limb toward the Sun, whiter at the bottom (the old sum
//      lost blue first), a little thinner at the top. Fitted by eye, as it was.
//
// AERIAL PERSPECTIVE (task 2) is the same air seen from above, over the disc: the ground is seen
// THROUGH it and the air between the camera and the ground is itself lit. Over the disc the path
// is one slant through a thin layer, so there is no march: the airmass along the view and toward
// the Sun are each one Chapman function (chapmanUp above, at the Earth's REAL 8 km scale height),
// and single scattering along the slant has a closed form (aerial() below, and EARTH_AERIAL_GLSL,
// which scene/earth.js splices into the surface shader). Three things follow from it and are no
// longer separate inventions in the surface shader:
//     - the low Sun's daylight turns gold, by the air its beam crossed and the sky's light that
//       comes back down (it was a fixed warm tint);
//     - distant land takes the air's colour toward the limb, and the limb itself is pale;
//     - the lit air over the night side of the terminator is a thin twilight.
// The day map is NASA's Blue Marble, which is surface reflectance with the air taken out, so the
// air is put back whole -- except straight down under a high Sun, where the map is left exactly as
// it is (the airmass enters as m - 1): the map's colours were graded as the look at the middle
// of the disc, and they stay that.
//
// HONESTY. The scattering coefficients and scale heights are the standard published ones (sea
// level Rayleigh 5.8, 13.5, 33.1 per Mm at 680, 550, 440 nm; 8 km; Mie 21 per Mm, 1.2 km). The
// SHELL is drawn 2.5 times as tall as the air is (heightGain, #317's device, so the limb reads at
// the size the globe is drawn) and its brightness is fitted by eye; the surface term uses the real
// heights and no gain.

export const EARTH_AIR = {
  radiusKm: 6371,
  shellScale: 1.025,                 // shell radius / ground radius (scene/earth.js ATMOSPHERE_SCALE)
  heightGain: 2.5,                   // the shell's scale heights are drawn this many times taller
  betaR: [5.8e-6, 13.5e-6, 33.1e-6], // Rayleigh scattering at sea level, per metre, R G B
  betaM: 21e-6,                      // Mie scattering at sea level, per metre
  mieExt: 1.1,                       // Mie extinction over scattering
  gasHKm: 8,
  mieHKm: 1.2,
  mieG: 0.76,
  sun: 11.0,                         // the shell's light gain, fitted by eye (point 3 above; #317's was 14)
  steps: [8, 12, 16],                // view steps by tier
  latchedSteps: 6,
  maxSteps: 16,
};

/** The table's shape. `muMin`: below it every ray is deep in the ground's shadow. `cap`: radii. */
export const EARTH_LUT = { width: 96, height: 48, muMin: -0.3, steps: 48, cap: 1.0 };

const earthHR = () => (EARTH_AIR.gasHKm * EARTH_AIR.heightGain) / EARTH_AIR.radiusKm;
const earthHM = () => (EARTH_AIR.mieHKm * EARTH_AIR.heightGain) / EARTH_AIR.radiusKm;
const muF = (m) => Math.sign(m) * Math.sqrt(Math.abs(m));

/**
 * The air from a point `h` radii above the ground along a direction whose zenith cosine is `mu`,
 * out to the top of the shell: [gas column, particle column], in radii of sea-level air. A ray
 * that goes under the ground keeps going, through air that thickens as exp(depth / H): the ground
 * is not a wall here but the same exponential carried on down, which closes the light off within
 * a few kilometres of depth and has no edge to alias (point 2 in the header). `n` steps, spaced
 * as the square of the distance so the first are short where the air is thickest.
 */
export function earthColumn(h, mu, n = EARTH_LUT.steps) {
  const r = 1 + h;
  const top = EARTH_AIR.shellScale;
  const disc = r * r * mu * mu - r * r + top * top;
  if (!(disc > 0)) return [0, 0];
  const sMax = -r * mu + Math.sqrt(disc);
  if (!(sMax > 0)) return [0, 0];
  const hR = earthHR();
  const hM = earthHM();
  let cR = 0;
  let cM = 0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const s = sMax * t * t;
    const ds = (sMax * 2 * t) / n;
    const hh = Math.sqrt(r * r + s * s + 2 * r * s * mu) - 1;
    cR += Math.exp(Math.min(-hh / hR, 40)) * ds;
    cM += Math.exp(Math.min(-hh / hM, 40)) * ds;
  }
  return [Math.min(cR, EARTH_LUT.cap), Math.min(cM, EARTH_LUT.cap)];
}

/** Texel coordinates (fractional, 0 .. size-1) of a height and a zenith cosine: the GLSL's lutUv(). */
export function lutCoord(h, mu) {
  const span = EARTH_AIR.shellScale - 1;
  const v = Math.sqrt(Math.min(1, Math.max(0, h / span)));
  const f0 = muF(EARTH_LUT.muMin);
  const u = Math.min(1, Math.max(0, (muF(Math.max(mu, EARTH_LUT.muMin)) - f0) / (1 - f0)));
  return [u * (EARTH_LUT.width - 1), v * (EARTH_LUT.height - 1)];
}

let _lut = null;
/** The table: Float32Array, width x height x 2, row 0 the ground. Built once; the same every time. */
export function buildEarthLut() {
  if (_lut) return _lut;
  const { width: W, height: H, muMin } = EARTH_LUT;
  const span = EARTH_AIR.shellScale - 1;
  const f0 = muF(muMin);
  const out = new Float32Array(W * H * 2);
  for (let j = 0; j < H; j++) {
    const v = j / (H - 1);
    const h = v * v * span;
    for (let i = 0; i < W; i++) {
      const f = f0 + (i / (W - 1)) * (1 - f0);
      const mu = Math.sign(f) * f * f;
      const c = earthColumn(h, mu);
      out[(j * W + i) * 2] = c[0];
      out[(j * W + i) * 2 + 1] = c[1];
    }
  }
  _lut = out;
  return out;
}

/** The table read as the GPU reads it: bilinear between texel centres. */
export function lutColumns(lut, h, mu) {
  const { width: W, height: H } = EARTH_LUT;
  const [x, y] = lutCoord(h, mu);
  const x0 = Math.min(W - 2, Math.floor(x));
  const y0 = Math.min(H - 2, Math.floor(y));
  const fx = x - x0;
  const fy = y - y0;
  const at = (i, j, k) => lut[(j * W + i) * 2 + k];
  const out = [0, 0];
  for (let k = 0; k < 2; k++) {
    out[k] = (at(x0, y0, k) * (1 - fx) + at(x0 + 1, y0, k) * fx) * (1 - fy) + (at(x0, y0 + 1, k) * (1 - fx) + at(x0 + 1, y0 + 1, k) * fx) * fy;
  }
  return out;
}

function hg1(mu, g) {
  const g2 = g * g;
  return (3 / (8 * Math.PI)) * ((1 - g2) * (1 + mu * mu)) / ((2 + g2) * Math.pow(1 + g2 - 2 * g * mu, 1.5));
}

/**
 * The JS twin of EARTH_AIR_FRAG: the light the shell sends toward `ro` along `rd`, R G B, lengths in
 * Earth radii with the Earth at the origin. `light: 'old'` is #317's formula as it shipped, shadow
 * test and all, with `sun` 14: kept so the refit can be held against it.
 */
export function earthShell(ro, rd, sunDir, { steps = 12, light = 'lut', sun = EARTH_AIR.sun, lut = null } = {}) {
  const top = EARTH_AIR.shellScale;
  const hR = earthHR();
  const hM = earthHM();
  const bR = EARTH_AIR.betaR.map((b) => b * EARTH_AIR.radiusKm * 1000);
  const bM = EARTH_AIR.betaM * EARTH_AIR.radiusKm * 1000;
  const shell = sphere(ro, rd, top);
  const t0 = Math.max(shell[0], 0);
  let t1 = shell[1];
  const ground = sphere(ro, rd, 1);
  if (ground[0] > 0) t1 = Math.min(t1, ground[0]);
  if (!(t1 > t0)) return [0, 0, 0];
  const table = light === 'lut' ? (lut || buildEarthLut()) : null;
  const mu = rd[0] * sunDir[0] + rd[1] * sunDir[1] + rd[2] * sunDir[2];
  const phaseR = (3 / (16 * Math.PI)) * (1 + mu * mu);
  const phaseM = hg1(mu, EARTH_AIR.mieG);
  const ds = (t1 - t0) / steps;
  if (light === 'old') {
    let odR = 0; let odM = 0;
    const sumR = [0, 0, 0]; const sumM = [0, 0, 0];
    for (let i = 0; i < steps; i++) {
      const tt = t0 + (i + 0.5) * ds;
      const p = [ro[0] + rd[0] * tt, ro[1] + rd[1] * tt, ro[2] + rd[2] * tt];
      const h = Math.max(Math.hypot(p[0], p[1], p[2]) - 1, 0);
      const dR = Math.exp(-h / hR) * ds;
      const dM = Math.exp(-h / hM) * ds;
      odR += dR; odM += dM;
      if (sphere(p, sunDir, 1)[0] > 0) continue;   // #317's test: a miss (1e9) passes it
      const lds = sphere(p, sunDir, top)[1] / 4;
      let lR = 0; let lM = 0;
      for (let j = 0; j < 4; j++) {
        const q = (j + 0.5) * lds;
        const lh = Math.max(Math.hypot(p[0] + sunDir[0] * q, p[1] + sunDir[1] * q, p[2] + sunDir[2] * q) - 1, 0);
        lR += Math.exp(-lh / hR) * lds;
        lM += Math.exp(-lh / hM) * lds;
      }
      for (let k = 0; k < 3; k++) {
        const att = Math.exp(-(bR[k] * (odR + lR) + bM * EARTH_AIR.mieExt * (odM + lM)));
        sumR[k] += dR * att;
        sumM[k] += dM * att;
      }
    }
    return [0, 1, 2].map((k) => sun * (sumR[k] * bR[k] * phaseR + sumM[k] * bM * phaseM));
  }
  // EACH STEP IS A SLAB, NOT A POINT. #317 took the air at a step's middle, dimmed by everything
  // before it and half of nothing of itself: along a limb ray, where one step can be several
  // optical depths of blue, that answer moved by a factor of two between 6 steps and 64. Here a
  // step's own light is integrated through its own dimming in closed form,
  //   light += seenThrough x source x (1 - exp(-ext ds)) / ext,   seenThrough x= exp(-ext ds)
  // (the usual energy-conserving step), so a thick step can send no more than it holds, and 6
  // steps are within a few per cent of 400 (tests/test_atmo_lut.mjs): the tiers differ in cost,
  // not in look.
  const seen = [1, 1, 1];
  const out = [0, 0, 0];
  for (let i = 0; i < steps; i++) {
    const tt = t0 + (i + 0.5) * ds;
    const p = [ro[0] + rd[0] * tt, ro[1] + rd[1] * tt, ro[2] + rd[2] * tt];
    const r = Math.hypot(p[0], p[1], p[2]);
    const h = Math.max(r - 1, 0);
    const dR = Math.exp(-h / hR);
    const dM = Math.exp(-h / hM);
    const c = lutColumns(table, h, (p[0] * sunDir[0] + p[1] * sunDir[1] + p[2] * sunDir[2]) / r);
    for (let k = 0; k < 3; k++) {
      const ext = bR[k] * dR + bM * EARTH_AIR.mieExt * dM;
      const sunT = Math.exp(-(bR[k] * c[0] + bM * EARTH_AIR.mieExt * c[1]));
      const step = Math.exp(-ext * ds);
      out[k] += seen[k] * sunT * (bR[k] * dR * phaseR + bM * dM * phaseM) * ((1 - step) / Math.max(ext, 1e-9));
      seen[k] *= step;
    }
  }
  return out.map((x) => x * sun);
}

const EARTH_AIR_VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vPosW;
varying vec3 vCentre;
varying float vShellR;
void main() {
  vec4 worldPos = modelMatrix * vec4( position, 1.0 );
  vPosW = worldPos.xyz;
  vCentre = ( modelMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
  vShellR = length( modelMatrix[0].xyz );
  gl_Position = projectionMatrix * viewMatrix * worldPos;
  #include <logdepthbuf_vertex>
}
`;

/** The Earth's shell (THE EARTH'S AIR, above). BackSide, depth-tested: the disc hides what is behind it. */
export const EARTH_AIR_FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>

uniform vec3  uSunDir;
uniform float uIntensity;
uniform float uShellScale;    // shell radius / ground radius
uniform float uHeightGain;
uniform sampler2D uLut;       // EARTH_LUT: r the gas column toward the Sun, g the particles'
uniform int   uSteps;

varying vec3 vPosW;
varying vec3 vCentre;
varying float vShellR;

const int MAX_STEPS = ${EARTH_AIR.maxSteps};
// Sea-level scattering coefficients per metre times 6 371 000 m: per Earth radius.
const vec3  BETA_R = vec3( ${EARTH_AIR.betaR.map((b) => b.toExponential(2)).join(', ')} ) * 6371000.0;
const float BETA_M = ${EARTH_AIR.betaM.toExponential(2)} * 6371000.0;
const float MIE_G = ${EARTH_AIR.mieG.toFixed(2)};
const float MU_F0 = ${muF(EARTH_LUT.muMin).toFixed(6)};

vec2 sphere( vec3 ro, vec3 rd, float r ) {
  float b = dot( ro, rd );
  float c = dot( ro, ro ) - r * r;
  float d = b * b - c;
  if ( d < 0.0 ) return vec2( 1e9, -1e9 );
  d = sqrt( d );
  return vec2( -b - d, -b + d );
}

// lutCoord() in scene/atmosphere.js, to texel centres.
vec2 lutUv( float h, float mu ) {
  float v = sqrt( clamp( h / ( uShellScale - 1.0 ), 0.0, 1.0 ) );
  float m = max( mu, ${EARTH_LUT.muMin.toFixed(2)} );
  float u = clamp( ( sign( m ) * sqrt( abs( m ) ) - MU_F0 ) / ( 1.0 - MU_F0 ), 0.0, 1.0 );
  return vec2( ( u * ${(EARTH_LUT.width - 1).toFixed(1)} + 0.5 ) / ${EARTH_LUT.width.toFixed(1)}, ( v * ${(EARTH_LUT.height - 1).toFixed(1)} + 0.5 ) / ${EARTH_LUT.height.toFixed(1)} );
}

void main() {
  #include <logdepthbuf_fragment>

  float groundR = vShellR / uShellScale;
  vec3 ro = ( cameraPosition - vCentre ) / groundR;   // in Earth radii, Earth at the origin
  vec3 rd = normalize( vPosW - cameraPosition );
  float top = uShellScale;
  float hR = ${EARTH_AIR.gasHKm.toFixed(1)} / 6371.0 * uHeightGain;
  float hM = ${EARTH_AIR.mieHKm.toFixed(1)} / 6371.0 * uHeightGain;

  vec2 shell = sphere( ro, rd, top );
  float t0 = max( shell.x, 0.0 );
  float t1 = shell.y;
  vec2 ground = sphere( ro, rd, 1.0 );
  if ( ground.x > 0.0 && ground.x < 1e8 ) t1 = min( t1, ground.x );
  if ( t1 <= t0 ) discard;

  float mu = dot( rd, uSunDir );
  float phaseR = 3.0 / ( 16.0 * PI ) * ( 1.0 + mu * mu );
  float g2 = MIE_G * MIE_G;
  float phaseM = 3.0 / ( 8.0 * PI ) * ( ( 1.0 - g2 ) * ( 1.0 + mu * mu ) ) / ( ( 2.0 + g2 ) * pow( 1.0 + g2 - 2.0 * MIE_G * mu, 1.5 ) );

  // Each step is a slab (EACH STEP IS A SLAB, earthShell() in scene/atmosphere.js): its own light
  // through its own dimming, in closed form.
  float ds = ( t1 - t0 ) / float( uSteps );
  float odR = 0.0;
  vec3 seen = vec3( 1.0 );
  vec3 sum = vec3( 0.0 );
  for ( int i = 0; i < MAX_STEPS; i++ ) {
    if ( i >= uSteps ) break;
    vec3 p = ro + rd * ( t0 + ( float( i ) + 0.5 ) * ds );
    float r = length( p );
    float h = max( r - 1.0, 0.0 );
    float dR = exp( -h / hR );
    float dM = exp( -h / hM );
    odR += dR * ds;
    // The air between this step and the Sun, from the table: no march, and no shadow test -- a ray
    // that goes under the ground comes back with a column nothing gets through.
    vec2 l = texture2D( uLut, lutUv( h, dot( p, uSunDir ) / r ) ).rg;
    vec3 ext = BETA_R * dR + BETA_M * ${EARTH_AIR.mieExt.toFixed(1)} * dM;
    vec3 sunT = exp( -( BETA_R * l.r + BETA_M * ${EARTH_AIR.mieExt.toFixed(1)} * l.g ) );
    vec3 slab = exp( -ext * ds );
    sum += seen * sunT * ( BETA_R * dR * phaseR + BETA_M * dM * phaseM ) * ( 1.0 - slab ) / max( ext, vec3( 1e-9 ) );
    seen *= slab;
  }
  vec3 colour = ${EARTH_AIR.sun.toFixed(2)} * sum * uIntensity;

  // Airglow: a faint green line on the night-side limb, which is real (oxygen at ~95 km).
  float dark = 1.0 - clamp( length( sum ) * 2.0, 0.0, 1.0 );
  colour += vec3( 0.012, 0.045, 0.022 ) * clamp( odR * 6.0, 0.0, 1.0 ) * dark * uIntensity;

  gl_FragColor = vec4( colour, 1.0 );

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

let _lutTexture = null;
/** The table as a texture: two half-float channels, filtered. One for the page. */
function earthLutTexture() {
  if (_lutTexture) return _lutTexture;
  const tex = new THREE.DataTexture(new Uint16Array(EARTH_LUT.width * EARTH_LUT.height * 2), EARTH_LUT.width, EARTH_LUT.height, THREE.RGFormat, THREE.HalfFloatType);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.NoColorSpace;
  tex.userData.filled = false;
  _lutTexture = tex;
  return tex;
}
function fillEarthLut(tex) {
  if (tex.userData.filled) return;
  const data = buildEarthLut();
  const half = tex.image.data;
  for (let i = 0; i < data.length; i++) half[i] = THREE.DataUtils.toHalfFloat(data[i]);
  tex.userData.filled = true;
  tex.needsUpdate = true;
}

/** How long the shell takes to come up once its table is built, as a map does (scene/earth.js MAP_FADE_MS). */
export const EARTH_AIR_FADE_MS = 400;

/**
 * The Earth's shell: a child for the Earth's mesh (scene/earth.js createEarth adds it), scaled to
 * the top of the drawn air. scene/earth.js updateEarth keeps its sun direction.
 * @param {{segments?: {width:number,height:number}, gain?: number, steps?: number}} [opts]
 */
export function createEarthAir(opts = {}) {
  const seg = opts.segments || { width: 72, height: 48 };
  const material = new THREE.ShaderMaterial({
    name: 'earth-atmosphere',
    vertexShader: EARTH_AIR_VERT,
    fragmentShader: EARTH_AIR_FRAG,
    uniforms: {
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uIntensity: { value: 0 },
      uShellScale: { value: EARTH_AIR.shellScale },
      uHeightGain: { value: EARTH_AIR.heightGain },
      uLut: { value: earthLutTexture() },
      uSteps: { value: opts.steps || EARTH_AIR.steps[1] },
    },
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, seg.width, seg.height), material);
  mesh.name = 'earth-atmosphere';
  mesh.scale.setScalar(EARTH_AIR.shellScale);
  mesh.renderOrder = 1;
  mesh.userData.kind = 'atmosphere';
  mesh.userData.gain = Number.isFinite(opts.gain) ? opts.gain : 1;
  // The table is built in an idle moment (NOTHING AT BOOT: the first frame does not wait for it),
  // and at once where there is no page to keep waiting (a test). Until it is there the shell is
  // not drawn; settleEarthAir() brings it up.
  mesh.visible = false;
  const lut = material.uniforms.uLut.value;
  const fill = () => fillEarthLut(lut);
  if (lut.userData.filled || typeof document === 'undefined') fill();
  else if (typeof requestIdleCallback === 'function') requestIdleCallback(fill, { timeout: 1500 });
  else setTimeout(fill, 60);
  return mesh;
}

/** Once a frame (scene/earth.js updateEarth): the shell comes up over EARTH_AIR_FADE_MS once its table is built. */
export function settleEarthAir(shell, nowMs) {
  const d = shell && shell.userData;
  const u = shell && shell.material && shell.material.uniforms;
  if (!d || !u || d.settled) return;
  if (!u.uLut.value.userData.filled) return;
  if (d.fadeFrom === undefined) { d.fadeFrom = nowMs; shell.visible = true; }
  const k = Math.min(1, (nowMs - d.fadeFrom) / EARTH_AIR_FADE_MS);
  u.uIntensity.value = d.gain * k;
  if (k >= 1) d.settled = true;
}

/**
 * How finely the shell is marched: EARTH_AIR.steps for a tier, EARTH_AIR.latchedSteps under the
 * frame latch (which is for good: a later tier does not raise it again).
 * @param {THREE.Mesh} shell   createEarthAir()'s mesh (the Earth's mesh.userData.atmosphere)
 */
export function setEarthAirSteps(shell, tier, latched = false) {
  const u = shell && shell.material && shell.material.uniforms;
  if (!u || !u.uSteps) return 0;
  if (latched) shell.userData.latched = true;
  const t = Math.min(EARTH_AIR.steps.length - 1, Math.max(0, tier | 0));
  u.uSteps.value = shell.userData.latched ? EARTH_AIR.latchedSteps : EARTH_AIR.steps[t];
  return u.uSteps.value;
}

// ---- aerial perspective: the air over the disc (task 2) -------------------------------------------

/**
 * The real air, straight down: optical depth per colour for the gas (beta x 8 km) and for the
 * particles (beta x 1.2 km x the extinction ratio). `sun`: pi, the irradiance under which a white
 * matte ground has radiance 1, which is the unit the surface shader's daylight is in. `gain`
 * scales the lit air and nothing else. `cloudShare`: the share of the gas column that is above a
 * cloud deck at 8 km (exp(-1)) and above a storm top at 15 km (exp(-15/8)).
 */
export const AERIAL = {
  tauR: EARTH_AIR.betaR.map((b) => b * EARTH_AIR.gasHKm * 1000),
  tauM: EARTH_AIR.betaM * EARTH_AIR.mieHKm * 1000 * EARTH_AIR.mieExt,
  mieAlbedo: 1 / EARTH_AIR.mieExt,
  X: EARTH_AIR.radiusKm / EARTH_AIR.gasHKm,
  sun: Math.PI,
  gain: 0.7,
  // THE SKY'S OWN LIGHT. What the gas scatters out of the Sun's beam is not lost to the ground:
  // about half of it comes down as skylight, which is why a low Sun's daylight is gold and not
  // the deep red of its disc. `sky` of what the gas took out is given back, less as the Sun
  // nears the horizon (`skyLow` of it there, all of it from `skyFullAt` up), where the air that
  // would scatter it is itself in the Earth's shadow. Both numbers are chosen (first frames with
  // the direct beam alone ended the day well before the terminator).
  sky: 0.45,
  skyLow: 0.25,
  skyFullAt: 0.25,
  // Toward the limb the lit air is drawn brighter, by up to this: the shell just outside the limb
  // is 3.5 times as bright as this unit makes air (EARTH_AIR.sun 11 against pi), and a limb twice
  // as bright as computed is what lets the disc's edge meet it without a dark seam. Fitted by eye.
  limbGain: 2.6,
  limbFrom: 0.35,
  deckShare: Math.exp(-1),
  topShare: Math.exp(-15 / 8),
};

/** The airmass toward a zenith cosine, 1 straight up and 35 at the horizon; held there below it. */
export function aerialAirmass(mu) {
  return chapmanUp(AERIAL.X, 0, Math.max(mu, 0));
}

/**
 * Sunlight's colour on the ground against what it is under an overhead Sun: exp(-tau (m - 1)).
 * `share` of the gas only, for a thing that stands above most of the air (a cloud deck, a storm top).
 */
export function aerialSun(mu, share = null) {
  const m = aerialAirmass(mu) - 1;
  return [0, 1, 2].map((k) => Math.exp(-(share === null ? AERIAL.tauR[k] + AERIAL.tauM : AERIAL.tauR[k] * share) * m));
}

/**
 * Daylight's colour on the ground against an overhead Sun's: the direct beam (aerialSun) and the
 * sky's own light (THE SKY'S OWN LIGHT, in AERIAL). White overhead, gold a few degrees up, a dim
 * warm grey at the horizon.
 */
export function aerialDaylight(mu) {
  const m = aerialAirmass(mu) - 1;
  const t = Math.min(1, Math.max(0, mu / AERIAL.skyFullAt));
  const low = AERIAL.skyLow + (1 - AERIAL.skyLow) * t * t * (3 - 2 * t);
  return [0, 1, 2].map((k) => Math.exp(-(AERIAL.tauR[k] + AERIAL.tauM) * m) + AERIAL.sky * low * (1 - Math.exp(-AERIAL.tauR[k] * m)));
}

/** 1 over the middle of the disc, AERIAL.limbGain at the limb. */
export function aerialLimbGain(muV) {
  const t = Math.min(1, Math.max(0, (AERIAL.limbFrom - muV) / AERIAL.limbFrom));
  return 1 + (AERIAL.limbGain - 1) * t * t * (3 - 2 * t);
}

/**
 * What the air does to a ground colour: [colour x T + L]. muV: the view's zenith cosine at the
 * ground; muS: the Sun's; cosGamma: the cosine between the view ray and the Sun; lit: 0..1, how
 * much of the Sun this air sees (the terminator, an eclipse); above: the share of the air that is
 * above what is seen (1 the ground). Single scattering along a slant through a layer whose
 * airmass toward the Sun is the same all the way: per colour,
 *   L = sun x (tauR pR + albedo tauM pM) / tau x mV / (mS + mV) x (1 - exp(-tau (mS + mV)))
 * and the ground is seen through exp(-tau (mV - 1)): the straight-down column is the map's own.
 * @returns {{T: number[], L: number[]}}
 */
export function aerial(muV, muS, cosGamma, lit = 1, above = 1) {
  const mV = aerialAirmass(muV);
  const mS = aerialAirmass(muS);
  const pR = (3 / (16 * Math.PI)) * (1 + cosGamma * cosGamma);
  const pM = hg1(cosGamma, EARTH_AIR.mieG);
  const T = [0, 0, 0];
  const L = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const tR = AERIAL.tauR[k] * above;
    const tM = AERIAL.tauM * above;
    const tau = tR + tM;
    T[k] = Math.exp(-tau * (mV - 1));
    L[k] = aerialLimbGain(muV) * AERIAL.gain * AERIAL.sun * lit * ((tR * pR + AERIAL.mieAlbedo * tM * pM) / tau) * (mV / (mS + mV)) * (1 - Math.exp(-tau * (mS + mV)));
  }
  return { T, L };
}

/** aerialAirmass(), aerialSun() and aerial() for a fragment shader that includes <common> (PI). */
export const EARTH_AERIAL_GLSL = /* glsl */`
// ---- aerial perspective (scene/atmosphere.js EARTH_AERIAL_GLSL) ----
const vec3  AER_TAU_R = vec3( ${AERIAL.tauR.map((x) => x.toFixed(5)).join(', ')} );
const float AER_TAU_M = ${AERIAL.tauM.toFixed(5)};
const float AER_C = ${Math.sqrt((Math.PI / 2) * AERIAL.X).toFixed(4)};   // sqrt( pi/2 x R/H ): the airmass at the horizon
float aerAirmass( float mu ) { return AER_C / ( ( AER_C - 1.0 ) * max( mu, 0.0 ) + 1.0 ); }
vec3 aerSun( float mu ) { return exp( -( AER_TAU_R + AER_TAU_M ) * ( aerAirmass( mu ) - 1.0 ) ); }
vec3 aerDaylight( float mu ) {
  float m = aerAirmass( mu ) - 1.0;
  float low = ${AERIAL.skyLow.toFixed(2)} + ${(1 - AERIAL.skyLow).toFixed(2)} * smoothstep( 0.0, ${AERIAL.skyFullAt.toFixed(2)}, mu );
  return exp( -( AER_TAU_R + AER_TAU_M ) * m ) + ${AERIAL.sky.toFixed(2)} * low * ( 1.0 - exp( -AER_TAU_R * m ) );
}
vec3 aerSunAbove( float mu, float share ) { return exp( -AER_TAU_R * share * ( aerAirmass( mu ) - 1.0 ) ); }
vec3 aerial( vec3 colour, float muV, float muS, float cosGamma, float lit, float above ) {
  float mV = aerAirmass( muV );
  float mS = aerAirmass( muS );
  float pR = 3.0 / ( 16.0 * PI ) * ( 1.0 + cosGamma * cosGamma );
  float pM = 3.0 / ( 8.0 * PI ) * ( ${(1 - EARTH_AIR.mieG ** 2).toFixed(4)} * ( 1.0 + cosGamma * cosGamma ) ) / ( ${(2 + EARTH_AIR.mieG ** 2).toFixed(4)} * pow( ${(1 + EARTH_AIR.mieG ** 2).toFixed(4)} - ${(2 * EARTH_AIR.mieG).toFixed(2)} * cosGamma, 1.5 ) );
  vec3 tR = AER_TAU_R * above;
  float tM = AER_TAU_M * above;
  vec3 tau = tR + tM;
  float limbGain = 1.0 + ${(AERIAL.limbGain - 1).toFixed(2)} * smoothstep( ${AERIAL.limbFrom.toFixed(2)}, 0.0, muV );
  vec3 L = limbGain * ${(AERIAL.gain * AERIAL.sun).toFixed(4)} * lit * ( tR * pR + ${AERIAL.mieAlbedo.toFixed(4)} * tM * pM ) / tau * ( mV / ( mS + mV ) ) * ( 1.0 - exp( -tau * ( mS + mV ) ) );
  return colour * exp( -tau * ( mV - 1.0 ) ) + L;
}
// ---- end of aerial perspective ----
`;

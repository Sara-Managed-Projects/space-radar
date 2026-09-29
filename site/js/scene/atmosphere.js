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
//     everywhere else, from one set of numbers and no special case.
//   - OVER THE DISC TOO. The Earth's shell is BackSide, so its disc behind is hidden by depth and only
//     the limb pays. This shell is drawn from its FRONT while the camera is outside it: the same
//     number of fragments (the log depth buffer writes gl_FragDepth, so no early-z culls the hidden
//     back half anyway), and the ray from the front face to the ground is the haze IN FRONT of the
//     disc -- Mars's limb goes pale, Titan's disc goes fuzzy at the edge -- which the back face can
//     never draw. Inside the shell (a camera below Titan's haze top) it switches to its back face.
//   - IT DIMS WHAT IS BEHIND IT. Blending is src + dst x T, T the grey transmittance along the view
//     ray: the haze hides the ground and the stars behind the limb as much as it glows.
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
 */
export const ATMO_PARAMS = {
  // MARS. Surface pressure 610 Pa at 210 K: 2.1e23 molecules per m^3, 0.0084 of the Earth's sea level;
  // CO2's Rayleigh cross-section is 2.4x air's (refractivity 4.5e-4 against 2.9e-4, squared). So the
  // gas scatters 0.020 of the Earth's sea-level air: the Earth's (5.8, 13.5, 33.1)e-6 per m times that.
  // Scale height 11.1 km (NASA Mars fact sheet). Dust: optical depth 0.5 in a clear season (the rovers'
  // Pancam tau record runs 0.3 to 1 outside storms), in the gas's scale height; single-scattering
  // albedo 0.97 red to 0.72 blue, and a forward lobe narrower in blue (illustrative: chosen so the
  // sunlit limb comes out butterscotch and the air toward the Sun blue, as the rovers' skies are).
  mars: {
    radiusKm: 3389.5,
    topKm: 60,
    gasHKm: 11.1,
    gasBeta: [5.8e-6 * 0.020, 13.5e-6 * 0.020, 33.1e-6 * 0.020],
    dustHKm: 11.1,
    dustTau: 0.5,
    dustAlbedo: [0.97, 0.88, 0.72],
    dustG: [0.62, 0.66, 0.74],
    heightGain: 3.0,
    sun: 9.0,
  },
  // VENUS. The map is the cloud tops, about 70 km up; the shell is what lies above them. CO2 at the
  // cloud tops: about 3 kPa at 230 K (Venus International Reference Atmosphere), 0.038 of the Earth's
  // sea-level number density, times CO2's 2.4 -- 0.09 of the Earth's Rayleigh. Scale height there
  // 4.9 km (kT / mg at 230 K). The upper haze of sulfuric-acid droplets above the clouds: optical depth
  // about 0.2 in the visible over a 4 km scale height, nearly conservative, pale yellow (the unknown
  // UV absorber), forward-scattering -- the bright ring a backlit Venus shows at inferior conjunction.
  venus: {
    radiusKm: 6051.8,
    topKm: 30,
    gasHKm: 4.9,
    gasBeta: [5.8e-6 * 0.09, 13.5e-6 * 0.09, 33.1e-6 * 0.09],
    dustHKm: 4.0,
    dustTau: 0.2,
    dustAlbedo: [0.99, 0.95, 0.8],
    dustG: [0.6, 0.6, 0.6],
    heightGain: 3.0,
    sun: 9.0,
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
  return { top: 1 + (p.topKm * gain) / R, hR, hM, betaR, betaM, extM, g: p.dustG.slice(), sun: p.sun };
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
  return c.betaR[k] * c.hR * (1 - Math.exp(-span / c.hR)) + c.extM[k] * c.hM * (1 - Math.exp(-span / c.hM));
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
  const sumR = [0, 0, 0]; const sumM = [0, 0, 0];
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
    if (sh[0] > 0 && sh[0] < 1e8) continue;
    const r = Math.hypot(q[0], q[1], q[2]);
    const cosChi = (q[0] * sunDir[0] + q[1] * sunDir[1] + q[2] * sunDir[2]) / r;
    const lR = c.hR * chapman(1 / c.hR, h / c.hR, cosChi);
    const lM = c.hM * chapman(1 / c.hM, h / c.hM, cosChi);
    for (let k = 0; k < 3; k++) {
      const att = Math.exp(-(c.betaR[k] * (odR + lR) + c.extM[k] * (odM + lM)));
      sumR[k] += dR * att;
      sumM[k] += dM * att;
    }
  }
  const mu = rd[0] * sunDir[0] + rd[1] * sunDir[1] + rd[2] * sunDir[2];
  const phaseR = (3 / (16 * Math.PI)) * (1 + mu * mu);
  const rgb = [0, 1, 2].map((k) => c.sun * (sumR[k] * c.betaR[k] * phaseR + sumM[k] * c.betaM[k] * hg(mu, c.g[k])));
  // Over the disc, only the SLANT dims: the map is a photograph taken through this air, so the
  // straight-down column's dimming is already in it (see verticalDepth below).
  const hitsGround = ground[0] > 0 && ground[0] < 1e8; // a miss is (1e9, -1e9), not a hit
  const Tk = [0, 1, 2].map((k) => Math.exp(-(c.betaR[k] * odR + c.extM[k] * odM) + (hitsGround ? verticalDepth(c, k) : 0)));
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
uniform vec3  uG;         // particle asymmetry, per colour
uniform float uSun;
uniform vec3  uVertical;  // the straight-down optical depth, per colour (verticalDepth)
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
  vec3 sumR = vec3( 0.0 ), sumM = vec3( 0.0 );
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
    if ( sh > 0.0 && sh < 1e8 ) continue;
    float cosChi = dot( p, uSunDir ) / length( p );
    float lR = uHR * chapman( 1.0 / uHR, h / uHR, cosChi );
    float lM = uHM * chapman( 1.0 / uHM, h / uHM, cosChi );
    vec3 att = exp( -( uBetaR * ( odR + lR ) + uExtM * ( odM + lM ) ) );
    sumR += dR * att;
    sumM += dM * att;
  }

  float mu = dot( rd, uSunDir );
  float phaseR = 3.0 / ( 16.0 * PI ) * ( 1.0 + mu * mu );
  vec3 colour = uSun * ( sumR * uBetaR * phaseR + sumM * uBetaM * hg( mu, uG ) );
  // Over the disc only the slant dims (verticalDepth() in scene/atmosphere.js says why): the map was
  // photographed through the straight-down column already.
  vec3 T = exp( -( uBetaR * odR + uExtM * odM ) + ( ground.x > 0.0 && ground.x < 1e8 ? uVertical : vec3( 0.0 ) ) );
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
      uG: { value: new THREE.Vector3(...c.g) },
      uSun: { value: c.sun },
      uVertical: { value: new THREE.Vector3(verticalDepth(c, 0), verticalDepth(c, 1), verticalDepth(c, 2)) },
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

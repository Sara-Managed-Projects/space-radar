// sky/skyair.js -- the colour of the sky, from the air itself (check 2 against Stellarium).
//
// Contract (pure: no DOM, no three, no clock):
//   AIR                                  the constants, one place for the JS and the shader
//   phaseRayleigh(mu), phaseMie(mu, g)   the two phase functions, each 1 over the whole sphere
//   chapman(x, cosChi)                   air masses along a ray in an exponential atmosphere
//   slantDepth(rKm, cosChi)              -> [rayleigh, mie, ozone] optical depths to space, per colour
//   inscatter(view, sun, steps)          -> { r: [3], m: [3] } what one scattering sends down a line of sight
//   skyRadiance(view, sun)               -> [r, g, b], linear, before the eye
//   exposureFor(sunAltDeg)               -> how far the eye has opened
//   skyColour(view, sun, sunAltDeg)      -> [r, g, b] linear display values, 0 to 1
//   twilightFloor(sunAltDeg)             -> { zenith: [3], horizon: [3] } linear: the light this model lacks
//   GLSL_SKY                             the same model for the dome's shaders
// Loaded with sky/groundsky.js (a static import of a module that is itself fetched only when the
// sky view opens): none of this is on a first visit.
//
// WHAT IT IS. Until 2026-10-07 the dome was a painter's gradient between five stops. This is the
// textbook model instead: sunlight scattered ONCE on its way to the eye, by the air's molecules
// (Rayleigh: blue far more than red, evenly in all directions) and by haze (Mie: all colours alike,
// mostly forwards), with the ozone layer taking some orange out (which is what keeps the zenith
// blue at dusk). View and Sun are unit vectors in the sky view's frame (+Y up). The eye stands on
// the ground; the line of sight is walked in SKY_STEPS steps to the top of the air, and at each
// step the sunlight arriving there has already crossed the air on ITS way in, which is where the
// red of a low Sun and the Earth's shadow at dusk both come from: nothing is painted for them.
//
// THE NUMBERS are the ones the graphics literature has used since Nishita et al. 1993 and
// Bruneton and Neyret 2008 (the scattering coefficients at 680, 550 and 440 nm, scale heights of
// 8 km and 1.2 km, the ozone absorption of Hillaire 2020), for a clear standard atmosphere. The
// light's own path uses the Chapman function in Schuler's closed form (GPU Pro 3, 2012) rather
// than a second walk. tests/test_skyair.mjs holds the limits: the vertical optical depth is the
// coefficient times the scale height, the horizon is 35 air masses, each phase function sums to
// one, no Sun is no light, noon is blue overhead and pale at the horizon, sunset is red on the
// Sun's side only, and the sky darkens without a step as the Sun goes down.
//
// WHAT IT IS NOT. A model of an average clear day, not of today's weather: no clouds, one haze.
// Single scattering goes dark too fast once the Sun is more than about eight degrees down (the
// real late twilight is light scattered twice), so the eye's exposure (exposureFor) is a drawn
// curve that follows the twilight phases, and twilightFloor() is a drawn stand-in for that second
// scattering: the deep blue of the "blue hour", strongest with the Sun four to eight degrees down,
// ending in the night's own near-black. The three numbers are also not three screen primaries (a
// screen's blue is far less pure than 440 nm), so the last step widens the colour a little
// (SATURATION). The controls say "air and skyline drawn".

const DEG = Math.PI / 180;

export const AIR = Object.freeze({
  earthKm: 6371,
  topKm: 80,
  eyeKm: 0.002,
  // per kilometre, at 680, 550 and 440 nm
  rayleigh: [5.802e-3, 13.558e-3, 33.1e-3],
  rayleighScaleKm: 8,
  mie: 3.996e-3,
  mieExtinction: 4.44e-3,
  mieScaleKm: 1.2,
  mieG: 0.8,
  ozone: [0.65e-3, 1.881e-3, 0.085e-3],
  ozoneMidKm: 25,
  ozoneHalfKm: 15,
  sun: 22,
});
export const SKY_STEPS = 16;

export function phaseRayleigh(mu) {
  return (3 / (16 * Math.PI)) * (1 + mu * mu);
}

/** Henyey and Greenstein's forward-peaked phase function. */
export function phaseMie(mu, g = AIR.mieG) {
  return (1 - g * g) / (4 * Math.PI * Math.pow(1 + g * g - 2 * g * mu, 1.5));
}

/**
 * Air masses along a ray, against the vertical, in an air that thins exponentially: `x` is the
 * distance from the Earth's centre in scale heights, `cosChi` the cosine of the ray's angle from
 * straight up. 1 overhead, sqrt(pi x / 2) on the horizon; below it the ray dips to a nearest point
 * and climbs out again, which is twice the horizon's value there less the part behind the eye.
 */
export function chapman(x, cosChi) {
  const c = Math.sqrt(Math.PI / 2 * x);
  if (cosChi >= 0) return c / ((c - 1) * cosChi + 1);
  const x0 = x * Math.sqrt(Math.max(0, 1 - cosChi * cosChi));
  const c0 = Math.sqrt(Math.PI / 2 * x0);
  return 2 * c0 * Math.exp(Math.min(60, x - x0)) - c / ((c - 1) * -cosChi + 1);
}

/** Optical depth to space from `rKm` from the Earth's centre along a ray `cosChi` from the vertical: three colours. */
export function slantDepth(rKm, cosChi) {
  const A = AIR;
  const h = Math.max(0, rKm - A.earthKm);
  const dR = A.rayleighScaleKm * Math.exp(-h / A.rayleighScaleKm) * chapman(rKm / A.rayleighScaleKm, cosChi);
  const dM = A.mieScaleKm * Math.exp(-h / A.mieScaleKm) * chapman(rKm / A.mieScaleKm, cosChi);
  // Ozone: a thin shell at 25 km, crossed once on the way up, twice by a ray that dips under it.
  const sinChi = Math.sqrt(Math.max(0, 1 - cosChi * cosChi));
  const rO = A.earthKm + A.ozoneMidKm;
  const k = Math.min(0.9995, (rKm * sinChi) / rO);
  const crossings = cosChi >= 0 ? (rKm < rO ? 1 : 0) : (rKm * sinChi < rO ? (rKm < rO ? 1 : 2) : 0);
  const dO = crossings * A.ozoneHalfKm / Math.sqrt(1 - k * k);
  return [0, 1, 2].map((i) => A.rayleigh[i] * dR + A.mieExtinction * dM + A.ozone[i] * dO);
}

/** What single scattering sends down a line of sight: the Rayleigh and the Mie sums, before their phase functions. */
export function inscatter(view, sun, steps = SKY_STEPS) {
  const A = AIR;
  const vy = Math.max(0, view[1]);
  const vn = Math.hypot(view[0], vy, view[2]) || 1;
  const v = [view[0] / vn, vy / vn, view[2] / vn];
  const r0 = A.earthKm + A.eyeKm;
  const rTop = A.earthKm + A.topKm;
  const b = r0 * v[1];
  const len = -b + Math.sqrt(b * b - r0 * r0 + rTop * rTop);
  const r = [0, 0, 0];
  const m = [0, 0, 0];
  let dR = 0;
  let dM = 0;
  let dO = 0;
  for (let i = 0; i < steps; i += 1) {
    // Steps grow with distance: the air near the eye is the thick air.
    const t0 = len * (i / steps) ** 2;
    const t1 = len * ((i + 1) / steps) ** 2;
    const t = len * ((i + 0.5) / steps) ** 2;
    const dt = t1 - t0;
    const p = [v[0] * t, r0 + v[1] * t, v[2] * t];
    const rr = Math.hypot(p[0], p[1], p[2]);
    const h = Math.max(0, rr - A.earthKm);
    const rhoR = Math.exp(-h / A.rayleighScaleKm);
    const rhoM = Math.exp(-h / A.mieScaleKm);
    const rhoO = Math.max(0, 1 - Math.abs(h - A.ozoneMidKm) / A.ozoneHalfKm);
    dR += rhoR * dt * 0.5; dM += rhoM * dt * 0.5; dO += rhoO * dt * 0.5;
    const cosChi = (p[0] * sun[0] + p[1] * sun[1] + p[2] * sun[2]) / rr;
    const light = slantDepth(rr, cosChi);
    for (let c = 0; c < 3; c += 1) {
      const T = Math.exp(-(A.rayleigh[c] * dR + A.mieExtinction * dM + A.ozone[c] * dO) - light[c]);
      r[c] += T * rhoR * dt;
      m[c] += T * rhoM * dt;
    }
    dR += rhoR * dt * 0.5; dM += rhoM * dt * 0.5; dO += rhoO * dt * 0.5;
  }
  return { r, m };
}

/** The sky's light in a direction, linear, as it arrives: before any eye or screen. */
export function skyRadiance(view, sun) {
  const s = inscatter(view, sun);
  const vy = Math.max(0, view[1]);
  const vn = Math.hypot(view[0], vy, view[2]) || 1;
  const mu = (view[0] * sun[0] + vy * sun[1] + view[2] * sun[2]) / vn;
  const pR = phaseRayleigh(mu);
  const pM = phaseMie(mu);
  return [0, 1, 2].map((c) => AIR.sun * (AIR.rayleigh[c] * pR * s.r[c] + AIR.mie * pM * s.m[c]));
}

// How far the eye has opened, by the Sun's altitude: 1 by day, wider through each twilight. Drawn,
// not derived: it keeps the sunset its colour and lets civil twilight be the deep blue it is to
// an eye, then closes on the night, whose light is not the Sun's. Astronomical twilight's end is 0.
const EXPOSURE = [
  [-18, 0],
  [-14, 900],
  [-12, 700],
  [-9, 150],
  [-6, 28],
  [-3, 5.5],
  [0, 1.8],
  [3, 1.15],
  [8, 1],
];

export function exposureFor(sunAltDeg) {
  if (!Number.isFinite(sunAltDeg)) return 0;
  const T = EXPOSURE;
  if (sunAltDeg <= T[0][0]) return T[0][1];
  if (sunAltDeg >= T[T.length - 1][0]) return T[T.length - 1][1];
  for (let i = 0; i + 1 < T.length; i += 1) {
    if (sunAltDeg <= T[i + 1][0]) {
      const k = (sunAltDeg - T[i][0]) / (T[i + 1][0] - T[i][0]);
      // In ratio between the stops: an exposure is a multiplier.
      if (T[i][1] <= 0) return T[i + 1][1] * k * k;
      return T[i][1] * Math.pow(T[i + 1][1] / T[i][1], k);
    }
  }
  return 1;
}

/** The sky as the screen shows it: the radiance through the eye's exposure and a soft shoulder. Linear, 0 to 1. */
export function skyColour(view, sun, sunAltDeg) {
  const e = exposureFor(Number.isFinite(sunAltDeg) ? sunAltDeg : Math.asin(Math.max(-1, Math.min(1, sun[1]))) / DEG);
  const c = skyRadiance(view, sun).map((x) => 1 - Math.exp(-x * e));
  const y = LUMA[0] * c[0] + LUMA[1] * c[1] + LUMA[2] * c[2];
  return c.map((x) => Math.max(0, y + (x - y) * SATURATION));
}
export const SATURATION = 1.35;
const LUMA = [0.2126, 0.7152, 0.0722];

// The light the model lacks, by the Sun's altitude: [altitude, weight of the blue hour]. The two
// blues are the old dome's civil-twilight stops (0x12284e overhead, 0x3d5c8c at the horizon), the
// night's are its night stops (0x04060b, 0x0a0e17), all as linear values.
const BLUE_HOUR = [[-18, 0], [-12, 0.3], [-8, 0.85], [-4, 1], [0, 0.6], [3, 0.25], [6, 0]];
const BLUE_ZENITH = [0.006, 0.021, 0.076];
const BLUE_HORIZON = [0.047, 0.107, 0.262];
const NIGHT_ZENITH = [0.0012, 0.0018, 0.0033];
const NIGHT_HORIZON = [0.003, 0.0044, 0.0086];

/** What is added to the scattered light: the blue hour's stand-in, then the night's floor. Linear. */
export function twilightFloor(sunAltDeg) {
  const a = Number.isFinite(sunAltDeg) ? sunAltDeg : -90;
  let w = 0;
  const T = BLUE_HOUR;
  if (a > T[0][0] && a < T[T.length - 1][0]) {
    for (let i = 0; i + 1 < T.length; i += 1) {
      if (a <= T[i + 1][0]) { w = T[i][1] + (T[i + 1][1] - T[i][1]) * (a - T[i][0]) / (T[i + 1][0] - T[i][0]); break; }
    }
  }
  const night = Math.max(0, Math.min(1, (-4 - a) / 10));
  return {
    zenith: [0, 1, 2].map((c) => BLUE_ZENITH[c] * w + NIGHT_ZENITH[c] * night),
    horizon: [0, 1, 2].map((c) => BLUE_HORIZON[c] * w + NIGHT_HORIZON[c] * night),
  };
}

const f = (x) => (Number.isInteger(x) ? `${x}.0` : String(x));
const v3 = (a) => `vec3(${a.map(f).join(', ')})`;

/**
 * The same model for a vertex shader: `skyScatter(view, sun, outR, outM)` fills the two sums, and
 * `skyShade(r, m, mu, exposure)` in a fragment shader applies the phase functions per pixel, so
 * the Sun's aureole is sharp although the sums are carried between vertices.
 */
export const GLSL_SKY = /* glsl */ `
const float SKY_RE = ${f(AIR.earthKm)};
const float SKY_TOP = ${f(AIR.topKm)};
const float SKY_EYE = ${f(AIR.eyeKm)};
const vec3 SKY_BR = ${v3(AIR.rayleigh)};
const float SKY_HR = ${f(AIR.rayleighScaleKm)};
const float SKY_BM = ${f(AIR.mie)};
const float SKY_EM = ${f(AIR.mieExtinction)};
const float SKY_HM = ${f(AIR.mieScaleKm)};
const float SKY_G = ${f(AIR.mieG)};
const vec3 SKY_BO = ${v3(AIR.ozone)};
const float SKY_OMID = ${f(AIR.ozoneMidKm)};
const float SKY_OHALF = ${f(AIR.ozoneHalfKm)};
const float SKY_SUN = ${f(AIR.sun)};
float skyChapman(float x, float cosChi) {
  float c = sqrt(1.5707963 * x);
  if (cosChi >= 0.0) return c / ((c - 1.0) * cosChi + 1.0);
  float x0 = x * sqrt(max(0.0, 1.0 - cosChi * cosChi));
  float c0 = sqrt(1.5707963 * x0);
  return 2.0 * c0 * exp(min(60.0, x - x0)) - c / ((c - 1.0) * -cosChi + 1.0);
}
vec3 skySlant(float r, float cosChi) {
  float h = max(0.0, r - SKY_RE);
  float dR = SKY_HR * exp(-h / SKY_HR) * skyChapman(r / SKY_HR, cosChi);
  float dM = SKY_HM * exp(-h / SKY_HM) * skyChapman(r / SKY_HM, cosChi);
  float sinChi = sqrt(max(0.0, 1.0 - cosChi * cosChi));
  float rO = SKY_RE + SKY_OMID;
  float k = min(0.9995, r * sinChi / rO);
  float crossings = cosChi >= 0.0 ? (r < rO ? 1.0 : 0.0) : (r * sinChi < rO ? (r < rO ? 1.0 : 2.0) : 0.0);
  float dO = crossings * SKY_OHALF / sqrt(1.0 - k * k);
  return SKY_BR * dR + vec3(SKY_EM * dM) + SKY_BO * dO;
}
void skyScatter(vec3 view, vec3 sun, out vec3 sumR, out vec3 sumM) {
  vec3 v = normalize(vec3(view.x, max(0.0, view.y), view.z));
  float r0 = SKY_RE + SKY_EYE;
  float rTop = SKY_RE + SKY_TOP;
  float b = r0 * v.y;
  float len = -b + sqrt(b * b - r0 * r0 + rTop * rTop);
  sumR = vec3(0.0);
  sumM = vec3(0.0);
  float dR = 0.0; float dM = 0.0; float dO = 0.0;
  for (int i = 0; i < ${SKY_STEPS}; i++) {
    float a0 = float(i) / ${f(SKY_STEPS)};
    float a1 = (float(i) + 1.0) / ${f(SKY_STEPS)};
    float am = (float(i) + 0.5) / ${f(SKY_STEPS)};
    float t = len * am * am;
    float dt = len * (a1 * a1 - a0 * a0);
    vec3 p = vec3(v.x * t, r0 + v.y * t, v.z * t);
    float rr = length(p);
    float h = max(0.0, rr - SKY_RE);
    float rhoR = exp(-h / SKY_HR);
    float rhoM = exp(-h / SKY_HM);
    float rhoO = max(0.0, 1.0 - abs(h - SKY_OMID) / SKY_OHALF);
    dR += rhoR * dt * 0.5; dM += rhoM * dt * 0.5; dO += rhoO * dt * 0.5;
    vec3 T = exp(-(SKY_BR * dR + vec3(SKY_EM * dM) + SKY_BO * dO) - skySlant(rr, dot(p, sun) / rr));
    sumR += T * rhoR * dt;
    sumM += T * rhoM * dt;
    dR += rhoR * dt * 0.5; dM += rhoM * dt * 0.5; dO += rhoO * dt * 0.5;
  }
}
vec3 skyShade(vec3 sumR, vec3 sumM, float mu, float exposure) {
  float pR = 0.0596831 * (1.0 + mu * mu);
  float pM = (1.0 - SKY_G * SKY_G) / (12.5663706 * pow(1.0 + SKY_G * SKY_G - 2.0 * SKY_G * mu, 1.5));
  vec3 L = SKY_SUN * (SKY_BR * pR * sumR + SKY_BM * pM * sumM);
  vec3 c = vec3(1.0) - exp(-L * exposure);
  float y = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return max(vec3(0.0), vec3(y) + (c - vec3(y)) * ${f(SATURATION)});
}
`;

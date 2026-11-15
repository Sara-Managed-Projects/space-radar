// scene/stardisc.js -- a star as a place: a disc of its own size and colour once the camera is near
// enough to see one (public #436).
//
// Contract: createStarDisc(scene) -> { set(record | null, physical | null), update(camera, renderer),
//             state(), dispose(), mesh }
//   physical: { radiusKm, teffK, how, rotator? }   scene/stars3d.js starPhysical() or the Exoplanet Archive's row
//   rotator: { polarOverEq, teffPoleK, teffEqK, inclinationDeg, poleAngleDeg }  a star an interferometer has measured to be flattened
//             by its spin (registry/stars-notable.yaml `rotator:`, internal #276)
// Pure, for tests/test_stardisc.mjs: limbDarkening(mu, teffK), limbAt(mu, teffK, nm), discOpacity(radiusPx), HIDE_POINT_PX
//   and for tests/test_rotators.mjs: rotatorLaw(), rotatorPoint(), poleDirection()
//
// WHY. On the stellar rung a star was a point at any distance: fly to Sirius and the camera parked
// 0.4 light-years off a dot. A star is a ball of gas with a width, and that width is known (or can
// be worked out, which the card says): Sirius is 1.7 Suns across, Betelgeuse several hundred. So
// the selected star, and the host of a selected planet, is drawn as what it is: a sphere of its
// radius at its measured place, in the colour of its temperature, darker toward the limb as every
// star is. main.js flies to twelve radii, where it is a disc a fifth of the screen wide.
//
// WHAT IS MEASURED AND WHAT IS NOT. The place is the catalogue's. The colour is the black-body
// colour of its temperature, the path every star takes (scene/starfield.js). The radius is the
// Archive's for a planet's host; for a catalogue star it is WORKED OUT from its brightness and
// colour (scene/stars3d.js starPhysical), which the card prints as "estimated". The limb darkening
// is MODELLED FROM THE STAR'S OWN TEMPERATURE (internal #277; it was the Sun's linear law for every star): a grey
// atmosphere in radiative equilibrium (Eddington), whose temperature at optical depth tau is T^4 = 3/4 Teff^4 (tau +
// 2/3), seen at an angle of cosine mu from tau = mu (Eddington-Barbier), so each colour's brightness at mu over its
// brightness at the centre is Planck's law at T(mu) over Planck's law at T(1). The same three exponentials as the Sun's
// (scene/sun.js, checked there against the measured 550 nm law), now at each star's Teff: a cool star's edge is
// darker and redder than a hot star's. A real atmosphere is not grey; the card still calls the disc a model.
// There is no surface: no spots, no granules, nothing anybody has seen. A star other than the Sun
// has never been photographed as more than a few pixels, and this draws no more than that.
//
// THE ROTATORS (internal #276). A few stars have been imaged by interferometers (CHARA, VLTI) and are measurably not round: they spin
// so fast that the equator bulges, and gravity darkening makes the equator cooler and dimmer than the poles (Vega, Altair, Regulus,
// Rasalhague). Their rows in registry/stars-notable.yaml carry a `rotator:` block read from the paper: the polar radius, the
// temperature at the pole and at the equator, and the angles the axis is seen at. What is drawn from them:
//   * the shape: an oblate spheroid through the measured polar and equatorial radii, so both extents are the papers'. The papers' own
//     models are Roche surfaces, which differ from a spheroid between the pole and the equator: by up to 0.6 % of the radius for Vega,
//     1.6 % for Rasalhague, 3.2 % for Altair and 3.7 % for Regulus, the fastest (tests/test_rotators.mjs computes it). MEASURED
//     at the pole and at the equator; between them a drawing convenience.
//   * the brightness: T = Tpole * (g / gpole)^beta with g the effective gravity of a Roche model at that point, i.e. von Zeipel's law
//     of gravity darkening. beta is NOT assumed: it is the exponent that makes the equator come out at the paper's equator temperature
//     (the papers' own fitted betas, where they give one, agree with it to 0.01; the test checks). MODELLED from the paper's fit.
//   * the axis: from the paper's inclination and position angle, so the star is turned as it is in the sky. It is a fixed direction in
//     space, so orbiting the star shows it from the side. MEASURED (the sense of the spin, pole or antipode, is not drawn).
// Seen from 12 radii the disc is drawn as if from far away (orthographic); at the nearest allowed stop the edge is a little too wide.

const DEG = Math.PI / 180;
/** The obliquity of the ecliptic at J2000 (IAU 1976), radians: turns the celestial pole into the sun-inertial frame. */
const OBLIQUITY = 23.4392911 * DEG;

/**
 * The shape and the darkening law of a rotator, from the three numbers a paper gives. Units: the pole radius 1, G M 1.
 * `k` = polar over equatorial radius; `c` is the Roche surface's constant (1/r + c r^2 sin^2 = 1, so omega^2 / 6.75 for omega
 * in units of the breakup rate); `beta` is the von Zeipel exponent that gives the paper's equator temperature. Pure.
 */
export function rotatorLaw(polarOverEq, teffPoleK, teffEqK) {
  const q = 1 / polarOverEq;
  const c = (1 - 1 / q) / (q * q);
  const gEq = 1 / (q * q) - 2 * c * q;
  const beta = Math.log(teffEqK / teffPoleK) / Math.log(gEq);
  return { k: polarOverEq, c, beta, gEq };
}

/**
 * What a view ray sees of a rotator at a point (x, y) of the picture, in equatorial radii, looking down -z in view space with the
 * spin axis `pole` (unit, view space). Null outside the star. Otherwise { z, mu, g, teffK }: the depth, the cosine between the
 * surface normal and the line of sight, the effective gravity in the pole's, and the local effective temperature. The GLSL in
 * FRAG is this function line for line. Pure.
 */
export function rotatorPoint(x, y, pole, law, teffPoleK) {
  const m = 1 / (law.k * law.k) - 1;
  const s0 = x * pole[0] + y * pole[1];
  const d = x * x + y * y;
  const A = 1 + m * pole[2] * pole[2];
  const B = m * s0 * pole[2];
  const C = d + m * s0 * s0 - 1;
  const disc = B * B - A * C;
  if (!(disc > 0)) return null;
  const z = (-B + Math.sqrt(disc)) / A;
  const dp = x * pole[0] + y * pole[1] + z * pole[2];
  let nx = x + m * dp * pole[0], ny = y + m * dp * pole[1], nz = z + m * dp * pole[2];
  const nl = Math.hypot(nx, ny, nz);
  const mu = Math.max(0, nz / nl);
  // physical units: the pole radius 1, so the point is v / k
  const px = x / law.k, py = y / law.k, pz = z / law.k;
  const r = Math.hypot(px, py, pz);
  const pp = px * pole[0] + py * pole[1] + pz * pole[2];
  const gx = -px / (r * r * r) + 2 * law.c * (px - pp * pole[0]);
  const gy = -py / (r * r * r) + 2 * law.c * (py - pp * pole[1]);
  const gz = -pz / (r * r * r) + 2 * law.c * (pz - pp * pole[2]);
  const g = Math.hypot(gx, gy, gz);
  return { z, mu, g, teffK: teffPoleK * Math.pow(g, law.beta) };
}

/**
 * The spin axis as a unit vector in the sun-inertial frame (heliocentric ecliptic J2000), the pole that faces the Sun: from the
 * direction from the Sun to the star `u` (any length), the axis's inclination to the line of sight and its position angle on the
 * sky, east of north, both in degrees as the papers give them. Pure.
 */
export function poleDirection(u, inclinationDeg, positionAngleDeg) {
  const n = Math.hypot(u.x, u.y, u.z);
  const ux = u.x / n, uy = u.y / n, uz = u.z / n;
  // the celestial north pole in ecliptic coordinates
  const cp = [0, Math.sin(OBLIQUITY), Math.cos(OBLIQUITY)];
  const dot = cp[0] * ux + cp[1] * uy + cp[2] * uz;
  let north = [cp[0] - dot * ux, cp[1] - dot * uy, cp[2] - dot * uz];
  const nl = Math.hypot(...north);
  north = north.map((v) => v / nl);
  // east = north pole x line of sight (the direction of increasing right ascension)
  let east = [cp[1] * uz - cp[2] * uy, cp[2] * ux - cp[0] * uz, cp[0] * uy - cp[1] * ux];
  const el = Math.hypot(...east);
  east = east.map((v) => v / el);
  const pa = positionAngleDeg * DEG, inc = inclinationDeg * DEG;
  const sky = [Math.cos(pa) * north[0] + Math.sin(pa) * east[0], Math.cos(pa) * north[1] + Math.sin(pa) * east[1], Math.cos(pa) * north[2] + Math.sin(pa) * east[2]];
  const toSun = [-ux, -uy, -uz];
  return { x: Math.cos(inc) * toSun[0] + Math.sin(inc) * sky[0], y: Math.cos(inc) * toSun[1] + Math.sin(inc) * sky[1], z: Math.cos(inc) * toSun[2] + Math.sin(inc) * sky[2] };
}
//
// NOTHING AT BOOT: main.js imports this the first time a star or a planet of another star is
// selected. One quad, one draw call, no texture.
//
// PRECISION. On the stellar rung one unit is a light-year and Sirius is 1.3e-7 units across, 8.6
// units from the origin: far below what a float32 vertex can hold. So the quad's corners are built
// in VIEW space, from the model-view matrix three.js multiplies in double precision on the CPU:
// the centre is (camera to star), a small number, and the corners are added to it there. The depth
// is written as zero (the depth test is off) because the star is nearer than the near plane.

import * as THREE from '../../vendor/three.module.min.js';
import { stage } from './stage.js';
import { kelvinToRgb } from './starfield.js';

const SUN_INERTIAL = 'sun-inertial';
// The quad reaches this many radii out: the disc, and a glow that is gone by the edge.
const EXTENT = 3.0;
// Under this many pixels of radius the star is its point (scene/stars3d.js); the disc fades in above.
const SHOW_FROM_PX = 1.5;
const SHOW_FULL_PX = 4;
/** From this radius on screen the catalogue's point for the same star is switched off. */
export const HIDE_POINT_PX = 3;

/** The Sun's nominal effective temperature (IAU 2015 Resolution B3): a star with no temperature is drawn as the Sun. */
const SUN_TEFF_K = 5772;
/** The three colours' wavelengths in nm (red, green, blue) as scene/sun.js, and hc / k in nm K. */
export const LIMB_NM = [610, 550, 465];
const HC_OVER_K = 1.438777e7;
const planck = (nm, t) => 1 / (Math.exp(HC_OVER_K / (nm * t)) - 1);
/** Brightness at cosine `mu` over the centre's, at `nm`, for a star of effective temperature `teffK` (grey atmosphere). Pure. */
export function limbAt(mu, teffK = SUN_TEFF_K, nm = LIMB_NM[1]) {
  const teff = teffK > 0 ? teffK : SUN_TEFF_K;
  const t = (m) => teff * Math.pow(0.75 * (Math.max(0, Math.min(1, m)) + 2 / 3), 0.25);
  return planck(nm, t(mu)) / planck(nm, t(1));
}
/** Limb darkening in visible (green) light: 1 at the centre, about 0.33 at the Sun's edge, less for cooler stars. Pure. */
export function limbDarkening(mu, teffK = SUN_TEFF_K) {
  return limbAt(mu, teffK, LIMB_NM[1]);
}

/** How much of the disc is drawn at a radius on screen: nothing while it would be a speck. Pure. */
export function discOpacity(radiusPx) {
  const k = Math.max(0, Math.min(1, (radiusPx - SHOW_FROM_PX) / (SHOW_FULL_PX - SHOW_FROM_PX)));
  return k * k * (3 - 2 * k);
}

const VERT = /* glsl */ `
uniform float uSize;
varying vec2 vP;
void main() {
  vP = position.xy * ${EXTENT.toFixed(1)};
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * uSize;
  gl_Position = projectionMatrix * mv;
  gl_Position.z = 0.0;
}
`;
const FRAG = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity;
uniform float uTeff;
// A rotator (internal #276): 1.0 for a flattened star. k = polar over equatorial radius, c = the Roche constant, beta = the darkening
// exponent, pole = the spin axis in view space. All zero for a round star, and then nothing below the first branch runs.
uniform float uRot;
uniform float uK;
uniform float uC;
uniform float uBeta;
uniform vec3 uPole;
varying vec2 vP;
const float HC_OVER_K = ${HC_OVER_K.toExponential(6)};
float planck(float nm, float T) { return 1.0 / (exp(HC_OVER_K / (nm * T)) - 1.0); }
// Limb darkening of a grey atmosphere, per colour: a surface whose effective temperature is tLoc, seen at cosine mu, over the
// brightness of the centre of a star of effective temperature tRef (the JS twin is limbAt).
vec3 limbT(float mu, float tLoc, float tRef) {
  float T = tLoc * pow(0.75 * (mu + 2.0 / 3.0), 0.25);
  float T1 = tRef * pow(0.75 * (1.0 + 2.0 / 3.0), 0.25);
  return vec3(planck(${LIMB_NM[0].toFixed(1)}, T) / planck(${LIMB_NM[0].toFixed(1)}, T1),
              planck(${LIMB_NM[1].toFixed(1)}, T) / planck(${LIMB_NM[1].toFixed(1)}, T1),
              planck(${LIMB_NM[2].toFixed(1)}, T) / planck(${LIMB_NM[2].toFixed(1)}, T1));
}
void main() {
  float r = length(vP);
  float cover;
  vec3 disc;
  float edge = 1.0; // the radius of the silhouette in this direction, in equatorial radii
  if (uRot < 0.5) {
    float px = fwidth(r) * 1.5;
    cover = 1.0 - smoothstep(1.0 - px, 1.0, r);
    float mu = sqrt(max(0.0, 1.0 - r * r));
    // Limb darkening at the star's own temperature; the limb is redder than the centre because each colour darkens by its own law.
    disc = uColour * limbT(mu, uTeff, uTeff);
  } else {
    // The oblate spheroid through the measured radii: JS twin rotatorPoint().
    float m = 1.0 / (uK * uK) - 1.0;
    float s0 = dot(vP, uPole.xy);
    float A = 1.0 + m * uPole.z * uPole.z;
    float B = m * s0 * uPole.z;
    float C = dot(vP, vP) + m * s0 * s0 - 1.0;
    float D = B * B - A * C;
    float px = fwidth(D) * 1.5;
    cover = px > 0.0 ? smoothstep(0.0, px, D) : step(0.0, D);
    float z = (-B + sqrt(max(D, 0.0))) / A;
    vec3 v = vec3(vP, z);
    float dp = dot(v, uPole);
    vec3 n = normalize(v + m * dp * uPole);
    float mu = max(0.0, n.z);
    vec3 P = v / uK;
    float rr = length(P);
    vec3 g = -P / (rr * rr * rr) + 2.0 * uC * (P - dot(P, uPole) * uPole);
    float tLoc = uTeff * pow(length(g), uBeta);
    disc = uColour * limbT(mu, tLoc, uTeff);
    // The ellipse the spheroid casts: semi-minor b along the axis's shadow on the picture, 1 across it.
    float b = sqrt(uPole.z * uPole.z + uK * uK * (1.0 - uPole.z * uPole.z));
    float l = length(uPole.xy);
    float cu = (l > 1e-4 && r > 1e-6) ? dot(vP, uPole.xy) / (l * r) : 0.0;
    edge = 1.0 / sqrt(cu * cu / (b * b) + (1.0 - cu * cu));
  }
  // The glow: light scattered in the eye or the lens, not a corona anybody measured.
  float glow = 0.22 * exp(-3.2 * max(0.0, r - edge)) * (1.0 - smoothstep(${(EXTENT - 0.6).toFixed(1)}, ${EXTENT.toFixed(1)}, r));
  vec3 col = disc * cover + uColour * glow * (1.0 - cover);
  float a = max(cover, glow * 0.0);
  if (cover <= 0.002 && glow <= 0.002) discard;
  // Premultiplied: the disc hides the stars behind it, the glow is added to them.
  gl_FragColor = vec4(col * uOpacity, a * uOpacity);
  #include <colorspace_fragment>
}
`;

export function createStarDisc(scene) {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: {
      uSize: { value: 0 }, uColour: { value: new THREE.Color(1, 1, 1) }, uOpacity: { value: 0 }, uTeff: { value: SUN_TEFF_K },
      uRot: { value: 0 }, uK: { value: 1 }, uC: { value: 0 }, uBeta: { value: 0 }, uPole: { value: new THREE.Vector3(0, 0, 1) },
    },
    transparent: true, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.name = 'star-disc';
  mesh.frustumCulled = false;
  // Over the marks of things far behind it (the glyph layers): twelve radii out nothing is in front of a star.
  mesh.renderOrder = 60;
  mesh.visible = false;
  if (scene) scene.add(mesh);

  let record = null;
  let physical = null;
  let radiusUnits = 0;
  let radiusPx = 0;
  let placedFor = '';
  const _v = new THREE.Vector3();
  const _pole = new THREE.Vector3();
  let poleScene = null; // the spin axis of a rotator, a unit vector in the scene

  function place() {
    const key = `${record ? record.id : ''}:${stage.worldId}`;
    if (key === placedFor) return;
    placedFor = key;
    radiusUnits = 0;
    if (!record || !physical || !record.pos || stage.worldId !== 'stellar') return;
    if (!stage.toSceneInto(record.pos, record.frame || SUN_INERTIAL, _v, stage.tMs)) return;
    mesh.position.copy(_v);
    mesh.updateMatrixWorld(true);
    radiusUnits = physical.radiusKm / stage.unitKm;
    const rgb = kelvinToRgb(physical.teffK);
    material.uniforms.uColour.value.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
    material.uniforms.uSize.value = radiusUnits * EXTENT;
    material.uniforms.uTeff.value = physical.teffK > 0 ? physical.teffK : SUN_TEFF_K;
    // A flattened star: the shape, the darkening law and the axis, as the paper has them. A frame other than the Sun's is not drawn flat.
    poleScene = null;
    material.uniforms.uRot.value = 0;
    const rot = physical.rotator;
    if (rot && rot.polarOverEq > 0 && rot.polarOverEq < 1 && (record.frame || SUN_INERTIAL) === SUN_INERTIAL && record.pos) {
      const u = poleDirection(record.pos, rot.inclinationDeg, rot.poleAngleDeg);
      const law = rotatorLaw(rot.polarOverEq, rot.teffPoleK, rot.teffEqK);
      if (Number.isFinite(u.x) && Number.isFinite(law.beta)) {
        poleScene = new THREE.Vector3(u.x, u.z, -u.y); // the axis remap of scene/stage.js
        material.uniforms.uRot.value = 1;
        material.uniforms.uK.value = law.k;
        material.uniforms.uC.value = law.c;
        material.uniforms.uBeta.value = law.beta;
      }
    }
  }

  return {
    mesh,
    /** The selected star (or the star a selected planet goes round), or null. */
    set(next, phys) {
      record = next && phys && phys.radiusKm > 0 ? next : null;
      physical = record ? phys : null;
      placedFor = '';
      if (!record) { mesh.visible = false; radiusPx = 0; }
    },
    update(camera, renderer) {
      radiusPx = 0;
      if (!record) { mesh.visible = false; return; }
      place();
      if (!(radiusUnits > 0)) { mesh.visible = false; return; }
      if (poleScene) { camera.updateMatrixWorld(); _pole.copy(poleScene).transformDirection(camera.matrixWorldInverse); material.uniforms.uPole.value.copy(_pole); }
      const d = _v.copy(mesh.position).sub(camera.position).length();
      const h = renderer && renderer.domElement ? (renderer.domElement.clientHeight || 800) : 800;
      radiusPx = d > 0 ? (radiusUnits / d) * camera.projectionMatrix.elements[5] * 0.5 * h : 0;
      const k = d > radiusUnits * 1.05 ? discOpacity(radiusPx) : 0; // and never from inside it
      material.uniforms.uOpacity.value = k;
      mesh.visible = k > 0.003;
    },
    /** The drawn disc as a sphere in scene units {id, x, y, z, r}, or null while it is not drawn: the labels' layer hides what lies behind it (internal #275). */
    sphere: () => (mesh.visible && radiusUnits > 0 && record ? { id: record.id, x: mesh.position.x, y: mesh.position.y, z: mesh.position.z, r: radiusUnits } : null),
    /** Radius on screen in pixels: main.js switches the catalogue's point off past HIDE_POINT_PX. */
    radiusPx: () => radiusPx,
    state: () => ({ id: record ? record.id : null, flattened: material.uniforms.uRot.value > 0.5, radiusKm: physical ? physical.radiusKm : null, teffK: physical ? physical.teffK : null, how: physical ? physical.how : null, radiusPx, drawn: mesh.visible, opacity: material.uniforms.uOpacity.value }),
    dispose() {
      if (scene) scene.remove(mesh);
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}

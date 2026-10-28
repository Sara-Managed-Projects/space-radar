// moments/stage.js -- the world a Moment plays in: sky, Earth, ground, Sun, Moon and stars (internal spec 0079 C1).
//
// HOW IT DRAWS. The app's renderer, with a scene and a camera of its own, as the imagined-world stage does
// (scene/exostage.js): while a moment is up the map's scene is hidden and main.js calls the player's render() after
// its own, so one render loop draws one picture. Nothing here is a pass, a render target or a full-screen quad: the
// sky is a sphere round the camera, the haze is a term in the ground's own shader (tests/test_contract.mjs).
//
// THE FRAME. Positions are metres in the Earth's inertial frame (TEME axes, propagate/frames.js), turned into
// three.js's axes by eciToThree: the Earth's north pole is +Y. The Earth turns under it by the sidereal angle of the
// mission clock. FLOATING ORIGIN: the frame is drawn relative to the camera, so a bolt on a rocket 6 400 km from the
// Earth's centre is still drawn to the millimetre (float32 keeps seven digits; the subtraction is done in doubles).
//
// THE GROUND. Near the moment's place, a cap of the round Earth in the place's own east-up-south axes, its vertices
// close to the place, so the pad does not shimmer: inside 25 km an ILLUSTRATIVE ground (scrub, sand and sea from the
// moment's `ground`, the pad's concrete and its flame trench), beyond it the Earth's map (Solar System Scope, CC BY
// 4.0, as on the map). The whole Earth is a sphere 3 km under the cap for the views from orbit and from the Moon.
// The Sun and the Moon stand where they were at the mission's second (propagate/body.js, astronomy-engine).

import * as THREE from '../../vendor/three.module.min.js';
import { EARTH_R } from './trajectory.js';

export const eciToThree = (v) => [v[0], v[2], -v[1]];
const TEX = new URL('../../textures/', import.meta.url);
const LOG_V = '#include <common>\n#include <logdepthbuf_pars_vertex>\n';
const LOG_F = '#include <common>\n#include <logdepthbuf_pars_fragment>\n';
const OUT_F = '#include <tonemapping_fragment>\n#include <colorspace_fragment>\n';
const GLOBE_DROP_M = 3000;
const LOCAL_R = 25000;
const AIR_H = 8000;

/** What the air does at a camera `altM` up with the Sun `sunUp` (sine of its elevation): sky light, haze, stars. */
export function airAt(altM, sunUp) {
  const density = Math.exp(-Math.max(0, altM) / AIR_H);
  const day = Math.min(1, Math.max(0, (sunUp + 0.1) / 0.35));
  return {
    density,
    day,
    // The sky's light: full on the ground in daylight, gone by ~60 km up.
    sky: day * Math.pow(density, 0.45),
    stars: Math.max(0, 1 - 2.2 * day * Math.pow(density, 0.25)),
    hazeK: density / 22000,
  };
}

const SKY_V = `${LOG_V}
varying vec3 vDir;
void main() {
  vDir = (modelMatrix * vec4(position, 0.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #include <logdepthbuf_vertex>
}`;
const SKY_F = `${LOG_F}
uniform vec3 uSun, uUp;
uniform float uSky, uDensity, uHorizon, uSunUp;
varying vec3 vDir;
void main() {
  #include <logdepthbuf_fragment>
  vec3 d = normalize(vDir);
  float mu = dot(d, uUp);
  float x = clamp((mu - uHorizon) / (1.0 - uHorizon), 0.0, 1.0);
  vec3 zen = mix(vec3(0.015, 0.03, 0.09), vec3(0.11, 0.27, 0.64), pow(uDensity, 0.3));
  vec3 hor = vec3(0.64, 0.75, 0.88);
  vec3 c = mix(hor, zen, pow(x, 0.42));
  float low = 1.0 - smoothstep(0.0, 0.35, uSunUp);
  c = mix(c, vec3(0.95, 0.56, 0.32), (1.0 - x) * (1.0 - x) * low * 0.65);
  float sd = max(dot(d, uSun), 0.0);
  c += vec3(1.0, 0.9, 0.76) * (0.22 * pow(sd, 5.0) + 0.55 * pow(sd, 48.0)) * uDensity;
  c *= uSky;
  if (mu < uHorizon) c = mix(c, hor * uSky * 0.8, 0.5);
  gl_FragColor = vec4(c, 1.0);
  ${OUT_F}
}`;

const GROUND_V = `${LOG_V}
#ifdef CAP
attribute vec2 aLL;
#endif
varying vec2 vLL;
varying vec3 vObj;
varying vec3 vN;
varying float vDist;
void main() {
  vObj = position;
#ifdef CAP
  vLL = aLL;
#else
  vLL = vec2(0.0);
#endif
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}`;
const GROUND_F = `${LOG_F}
uniform sampler2D uDay;
uniform vec3 uSun, uHaze, uShore;
uniform float uHazeK, uKind, uPad, uLocalR, uLift;
varying vec2 vLL;
varying vec3 vObj;
varying vec3 vN;
varying float vDist;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  #include <logdepthbuf_fragment>
#ifdef CAP
  vec2 ll = vLL;
#else
  float r = length(vObj);
  vec2 ll = vec2(asin(clamp(vObj.y / r, -1.0, 1.0)), atan(-vObj.z, vObj.x));
#endif
  vec2 uv = vec2(ll.y / 6.2831853 + 0.5, ll.x / 3.1415927 + 0.5);
  vec2 uv2 = vec2(fract(uv.x + 0.5), uv.y);
  vec2 dx = dFdx(uv), dy = dFdy(uv);
  if (abs(dx.x) > 0.25 || abs(dy.x) > 0.25) { dx = dFdx(uv2); dy = dFdy(uv2); }
  vec3 albedo = textureGrad(uDay, uv, dx, dy).rgb;
#ifdef CAP
  vec2 q = vec2(vObj.x, vObj.z);
  float w = 1.0 - smoothstep(uLocalR * 0.3, uLocalR, length(q));
  if (w > 0.0) {
    float n1 = noise(q * 0.0035), n2 = noise(q * 0.031), n3 = noise(q * 0.21);
    vec3 scrub = mix(vec3(0.19, 0.23, 0.12), vec3(0.40, 0.39, 0.27), n1 * 0.65 + n2 * 0.25 + n3 * 0.1);
    vec3 sea = mix(vec3(0.035, 0.11, 0.17), vec3(0.06, 0.16, 0.22), n2);
    vec3 sand = vec3(0.70, 0.64, 0.50) * (0.9 + 0.1 * n3);
    vec3 local = scrub;
    if (uKind > 1.5) local = sea;
    else if (uKind < 0.5) {
      float d = dot(q, uShore.xy) - uShore.z;
      local = mix(scrub, sand, smoothstep(-70.0, -40.0, d));
      local = mix(local, sea, smoothstep(10.0, 40.0, d));
    }
    if (uPad > 0.5) {
      float rr = length(q);
      vec3 concrete = vec3(0.56, 0.56, 0.53) * (0.92 + 0.08 * n3);
      local = mix(local, vec3(0.47, 0.46, 0.42), 1.0 - smoothstep(150.0, 210.0, rr));
      local = mix(local, concrete, 1.0 - smoothstep(118.0, 124.0, rr));
      float trench = (1.0 - smoothstep(8.0, 9.5, abs(q.x))) * (1.0 - smoothstep(70.0, 72.0, abs(q.y)));
      local = mix(local, vec3(0.09, 0.09, 0.09), trench);
    }
    albedo = mix(albedo, local, w);
  }
#endif
  float lit = max(dot(normalize(vN), uSun), 0.0);
  vec3 c = albedo * (lit * 1.2 + 0.025 + uLift);
  float h = 1.0 - exp(-vDist * uHazeK);
  c = mix(c, uHaze, h);
  gl_FragColor = vec4(c, 1.0);
  ${OUT_F}
}`;

const RIM_F = `${LOG_F}
uniform vec3 uSun;
uniform float uOn;
varying vec3 vN;
varying vec3 vV;
void main() {
  #include <logdepthbuf_fragment>
  float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  float day = smoothstep(-0.25, 0.3, dot(normalize(vN), uSun));
  gl_FragColor = vec4(vec3(0.35, 0.6, 1.0) * pow(f, 3.5) * day * uOn * 1.4, 1.0);
  ${OUT_F}
}`;
const RIM_V = `${LOG_V}
varying vec3 vN;
varying vec3 vV;
void main() {
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vV = cameraPosition - wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
  #include <logdepthbuf_vertex>
}`;

/** The cap of the round Earth round a place, in its east-up-south axes, with each vertex's latitude and longitude. */
function capGeometry(frame, segments) {
  const rings = [0];
  for (let s = 12; s < 2.6e6; s *= 1.13) rings.push(s);
  rings.push(2.6e6);
  const pos = [], ll = [], nor = [], index = [];
  for (let i = 0; i < rings.length; i += 1) {
    const th = rings[i] / EARTH_R;
    const n = i === 0 ? 1 : segments;
    for (let j = 0; j < n; j += 1) {
      const az = (j / segments) * Math.PI * 2;
      const hz = EARTH_R * Math.sin(th);
      const x = hz * Math.cos(az), z = hz * Math.sin(az), y = EARTH_R * Math.cos(th) - EARTH_R;
      pos.push(x, y, z);
      nor.push(x / EARTH_R, (y + EARTH_R) / EARTH_R, z / EARTH_R);
      // local -> ENU (x east, -z north, y up) -> Earth-fixed, for the map's latitude and longitude.
      const ex = frame.ecef[0] + frame.e[0] * x - frame.n[0] * z + frame.u[0] * y;
      const ey = frame.ecef[1] + frame.e[1] * x - frame.n[1] * z + frame.u[1] * y;
      const ez = frame.ecef[2] + frame.e[2] * x - frame.n[2] * z + frame.u[2] * y;
      ll.push(Math.atan2(ez, Math.hypot(ex, ey)), Math.atan2(ey, ex));
    }
  }
  const start = (i) => (i === 0 ? 0 : 1 + (i - 1) * segments);
  for (let j = 0; j < segments; j += 1) index.push(0, start(1) + ((j + 1) % segments), start(1) + j);
  for (let i = 1; i < rings.length - 1; i += 1) {
    for (let j = 0; j < segments; j += 1) {
      const a = start(i) + j, b = start(i) + ((j + 1) % segments), c = start(i + 1) + j, d = start(i + 1) + ((j + 1) % segments);
      index.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('aLL', new THREE.Float32BufferAttribute(ll, 2));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

/**
 * The stage. `place` = the moment's place with its `frame` (trajectory.js placeFrame); `ground` its ground.
 * update({ origin, sidereal, sunDir, moon, pose, aspect }) once a frame, then render().
 */
export function createStage(renderer, { tier = 1, place, frame }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0e14);
  const camera = new THREE.PerspectiveCamera(40, 1.6, 0.1, 1e12);
  const loader = new THREE.TextureLoader();
  const textures = [];
  const tex = (name, then) => {
    const t = loader.load(new URL(name, TEX).href, (x) => { if (then) then(x); });
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = tier > 0 ? 4 : 1;
    textures.push(t);
    return t;
  };
  const day = tex('2k_earth_daymap.webp');

  const sun = new THREE.DirectionalLight(0xfff4e6, 3.0);
  const hemi = new THREE.HemisphereLight(0x9cc2ff, 0x6a5e48, 0);
  const fill = new THREE.AmbientLight(0x2a3550, 0.35);
  scene.add(sun, sun.target, hemi, fill);

  // The sky, round the camera, first.
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: new THREE.Vector3(0, 1, 0) }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uSky: { value: 1 }, uDensity: { value: 1 }, uHorizon: { value: 0 }, uSunUp: { value: 1 } },
    vertexShader: SKY_V, fragmentShader: SKY_F, side: THREE.BackSide, depthTest: false, depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -100;
  sky.scale.setScalar(1e4);
  scene.add(sky);

  const starTex = tex('2k_stars_milky_way.webp');
  const starMat = new THREE.MeshBasicMaterial({ map: starTex, side: THREE.BackSide, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x000000 });
  const stars = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), starMat);
  stars.frustumCulled = false;
  stars.renderOrder = -99;
  stars.scale.setScalar(2e4);
  scene.add(stars);

  // The Earth: a turning group for the globe, a posed group for the place.
  const earth = new THREE.Group();
  scene.add(earth);
  const groundUniforms = () => ({
    uDay: { value: day }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uHaze: { value: new THREE.Color(0.6, 0.7, 0.8) },
    uHazeK: { value: 0 }, uShore: { value: new THREE.Vector3(1, 0, 800) }, uKind: { value: 1 }, uPad: { value: 0 },
    uLocalR: { value: LOCAL_R }, uLift: { value: 0 },
  });
  const globeMat = new THREE.ShaderMaterial({ uniforms: groundUniforms(), vertexShader: GROUND_V, fragmentShader: GROUND_F });
  const seg = tier > 0 ? 160 : 96;
  const globe = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R - GLOBE_DROP_M, seg, seg / 2), globeMat);
  globe.frustumCulled = false;
  earth.add(globe);
  const rimMat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: new THREE.Vector3(0, 1, 0) }, uOn: { value: 0 } },
    vertexShader: RIM_V, fragmentShader: RIM_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const rim = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R + 70000, 96, 48), rimMat);
  rim.frustumCulled = false;
  earth.add(rim);

  const placeGroup = new THREE.Group();
  placeGroup.matrixAutoUpdate = false;
  scene.add(placeGroup);
  const capMat = new THREE.ShaderMaterial({ uniforms: groundUniforms(), vertexShader: GROUND_V, fragmentShader: GROUND_F, defines: { CAP: '' } });
  const g = place.ground || {};
  capMat.uniforms.uKind.value = g.kind === 'coast' ? 0 : g.kind === 'sea' ? 2 : 1;
  capMat.uniforms.uPad.value = g.pad ? 1 : 0;
  if (g.kind === 'coast') {
    // Seaward: square to the shore's bearing, on its east side; in the cap's (east, south) axes.
    const b = ((Number(g.shoreBearing) || 0) + 90) * Math.PI / 180;
    capMat.uniforms.uShore.value.set(Math.sin(b), -Math.cos(b), Number(g.shoreM) || 800);
  }
  const cap = new THREE.Mesh(capGeometry(frame, tier > 0 ? 128 : 72), capMat);
  cap.frustumCulled = false;
  placeGroup.add(cap);

  // The Moon, the Sun.
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1737400, 64, 32), new THREE.MeshLambertMaterial({ map: tex('2k_moon.webp') }));
  moon.frustumCulled = false;
  scene.add(moon);
  const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xfff8ea, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  const disc = document.createElement('canvas');
  disc.width = disc.height = 64;
  { const x = disc.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); x.arc(32, 32, 30, 0, Math.PI * 2); x.fill(); }
  sunDisc.material.map = new THREE.CanvasTexture(disc);
  sunDisc.renderOrder = 2;
  scene.add(sunDisc);

  const m4 = new THREE.Matrix4();
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
  const state = { altM: 0, air: airAt(0, 1), capCentre: [0, 0, 0] };

  /**
   * Pose everything for one frame. `origin` (stage metres) is where the camera is; `placeBasis` the place's east,
   * up and south axes and its position in the stage frame now; `sunDir` unit; `moon` stage metres.
   */
  function update({ origin, sidereal, sunDir, moonPos, placeNow, pose, aspect }) {
    const o = origin;
    earth.position.set(-o[0], -o[1], -o[2]);
    earth.rotation.set(0, sidereal, 0);
    const { e, u, s, p } = placeNow;
    m4.makeBasis(v1.set(e[0], e[1], e[2]), v2.set(u[0], u[1], u[2]), v3.set(s[0], s[1], s[2]));
    m4.setPosition(p[0] - o[0], p[1] - o[1], p[2] - o[2]);
    placeGroup.matrix.copy(m4);
    placeGroup.matrixWorldNeedsUpdate = true;
    // The cap is a sphere of EARTH_R under the place: the altitude the air is read at.
    const cc = [p[0] - u[0] * EARTH_R, p[1] - u[1] * EARTH_R, p[2] - u[2] * EARTH_R];
    state.capCentre = cc;
    const rel = [pose.pos[0] - cc[0], pose.pos[1] - cc[1], pose.pos[2] - cc[2]];
    const r = Math.hypot(rel[0], rel[1], rel[2]);
    const up = [rel[0] / r, rel[1] / r, rel[2] / r];
    const altM = r - EARTH_R;
    const sunUp = up[0] * sunDir[0] + up[1] * sunDir[1] + up[2] * sunDir[2];
    const air = airAt(altM, sunUp);
    state.altM = altM;
    state.air = air;
    // Sky.
    skyMat.uniforms.uSun.value.set(...sunDir);
    skyMat.uniforms.uUp.value.set(...up);
    skyMat.uniforms.uSky.value = air.sky;
    skyMat.uniforms.uDensity.value = air.density;
    skyMat.uniforms.uSunUp.value = sunUp;
    skyMat.uniforms.uHorizon.value = -Math.sqrt(Math.max(0, 2 * altM / EARTH_R));
    starMat.color.setScalar(air.stars * 0.85);
    // Ground and globe.
    const haze = new THREE.Color(0.64, 0.75, 0.88).multiplyScalar(air.sky * 0.95);
    for (const m of [capMat, globeMat]) {
      m.uniforms.uSun.value.set(...sunDir);
      m.uniforms.uHaze.value.copy(haze);
      m.uniforms.uHazeK.value = air.hazeK;
      m.uniforms.uLift.value = 0.05 * air.sky;
    }
    rimMat.uniforms.uSun.value.set(...sunDir);
    rimMat.uniforms.uOn.value = Math.min(1, Math.max(0, (altM - 20000) / 80000));
    // Lights: the Sun, and the sky's fill while there is air.
    sun.position.set(sunDir[0], sunDir[1], sunDir[2]);
    sun.target.position.set(0, 0, 0);
    hemi.intensity = 1.1 * air.sky;
    hemi.position.set(up[0], up[1], up[2]);
    fill.intensity = 0.35 * (1 - air.sky * 0.5);
    // Moon and Sun.
    if (moonPos) { moon.visible = true; moon.position.set(moonPos[0] - o[0], moonPos[1] - o[1], moonPos[2] - o[2]); } else moon.visible = false;
    const D = 1e10;
    sunDisc.position.set(sunDir[0] * D, sunDir[1] * D, sunDir[2] * D);
    const k = 0.0093 * D * (1.6 + 2.4 * air.density);
    sunDisc.scale.set(k, k, 1);
    sunDisc.material.opacity = 0.9;
    // Camera at the origin.
    camera.position.set(0, 0, 0);
    camera.up.set(pose.up[0], pose.up[1], pose.up[2]);
    camera.lookAt(pose.look[0] - o[0], pose.look[1] - o[1], pose.look[2] - o[2]);
    camera.fov = pose.fov;
    const d = Math.hypot(pose.look[0] - o[0], pose.look[1] - o[1], pose.look[2] - o[2]);
    camera.near = Math.min(50, Math.max(0.05, d * 0.002));
    camera.far = 1e12;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    sky.position.set(0, 0, 0);
    stars.position.set(0, 0, 0);
    return state;
  }

  function dispose() {
    for (const t of textures) t.dispose();
    scene.traverse((n) => {
      if (n.geometry) n.geometry.dispose();
      if (n.material) { if (n.material.map && !textures.includes(n.material.map)) n.material.map.dispose(); n.material.dispose(); }
    });
  }

  return { scene, camera, update, dispose, state, placeGroup };
}

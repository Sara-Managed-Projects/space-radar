// moments/effects.js -- engine flames, the exhaust cloud at the pad, separation motors, parachutes and the plasma of an
// entry, drawn procedurally inside the design contract (internal spec 0079 C1).
//
// INSIDE THE CONTRACT. No bloom, no post-processing pass, no render target, no lens flare, no diffraction spike
// (tests/test_contract.mjs). Fire, plasma and heat are EMISSIVE GEOMETRY with additive blending, as the black holes'
// discs are, and the one soft glow at a nozzle is an additive sprite. Steam is lit points with ordinary blending.
//
// EVERY EFFECT IS A FUNCTION OF THE MISSION CLOCK. A flame's flicker, a cloud's billow and a canopy's breathing are
// computed from `time` (mission seconds), never accumulated frame by frame, so a scrub, a share link at a time and a
// paused frame all show the same picture. Under reduced motion `still` holds the flicker and the breathing.
//
// HONESTY. The colours follow the propellants (kerosene burns orange and sooty, hydrogen nearly invisible and
// violet, solids white-hot, hypergols a pale orange); the shapes, the lengths and the way a plume widens with
// height are ILLUSTRATIVE, and the player's honesty line says the effects are drawn, not measured.

import * as THREE from '../../vendor/three.module.min.js';

const LOG_V = '#include <common>\n#include <logdepthbuf_pars_vertex>\n';
const LOG_F = '#include <common>\n#include <logdepthbuf_pars_fragment>\n';
const OUT_F = '#include <tonemapping_fragment>\n#include <colorspace_fragment>\n';

/** Colour ramps (core, middle, tail), brightness, length in nozzle radii at sea level, and shock diamonds. */
export const FLAME_KINDS = {
  kerolox: { core: [1.0, 0.92, 0.66], mid: [1.0, 0.52, 0.14], tail: [0.55, 0.14, 0.03], gain: 1.7, length: 9, diamonds: 0 },
  hydrolox: { core: [0.9, 0.84, 1.0], mid: [0.55, 0.42, 0.9], tail: [0.22, 0.12, 0.42], gain: 0.55, length: 7, diamonds: 1 },
  solid: { core: [1.0, 0.97, 0.88], mid: [1.0, 0.78, 0.45], tail: [0.8, 0.42, 0.18], gain: 2.1, length: 12, diamonds: 0 },
  hypergolic: { core: [1.0, 0.78, 0.48], mid: [0.92, 0.46, 0.2], tail: [0.42, 0.15, 0.05], gain: 0.85, length: 6, diamonds: 1 },
};

/** How a plume opens with height: 1 at sea level, falling with the air's pressure (scale height 7.5 km). */
export function ambient(altM) {
  return Math.exp(-Math.max(0, altM) / 7500);
}

const FLAME_V = `${LOG_V}
uniform float uR0, uR1, uL;
varying float vS;
varying float vA;
varying float vEdge;
void main() {
  float s = -position.y;                       // 0 at the nozzle exit, 1 at the tail
  float r = mix(uR0, uR1, pow(s, 0.55));
  vec3 p = vec3(position.x * r, -s * uL, position.z * r);
  vS = s;
  vA = atan(position.z, position.x);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec3 n = normalize(normalMatrix * vec3(position.x, 0.0, position.z));
  vEdge = abs(dot(n, normalize(-mv.xyz)));
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}`;

const FLAME_F = `${LOG_F}
uniform vec3 uCore, uMid, uTail;
uniform float uOn, uGain, uTime, uDiamonds, uL, uR0, uStill;
varying float vS;
varying float vA;
varying float vEdge;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  #include <logdepthbuf_fragment>
  float s = vS;
  vec3 c = s < 0.25 ? mix(uCore, uMid, s / 0.25) : mix(uMid, uTail, (s - 0.25) / 0.75);
  float body = pow(1.0 - s, 1.6) * smoothstep(0.0, 0.04, s + 0.02);
  float edge = pow(vEdge, 1.3);
  float t = uTime * (1.0 - uStill);
  float flick = 0.78 + 0.44 * noise(vec2(vA * 2.0 + 7.0, s * 9.0 - t * 14.0));
  float dia = 1.0 + uDiamonds * 0.55 * (1.0 - s) * pow(0.5 + 0.5 * cos(s * uL / max(uR0 * 2.4, 0.01) * 6.2832), 6.0);
  float k = uOn * uGain * body * edge * flick * dia;
  gl_FragColor = vec4(c * k, 1.0);
  ${OUT_F}
}`;

let flameGeo = null;
function unitCone() {
  if (flameGeo) return flameGeo;
  // A unit open cylinder from y = 0 down to y = -1, radius 1: the shader shapes it.
  flameGeo = new THREE.CylinderGeometry(1, 1, 1, 20, 12, true);
  flameGeo.translate(0, -0.5, 0);
  return flameGeo;
}

let glowTex = null;
/** A soft round glow (a radial ramp, no rays, no rings: not a flare), made once on a canvas. */
export function glowTexture() {
  if (glowTex || typeof document === 'undefined') return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  r.addColorStop(0.6, 'rgba(255,255,255,0.1)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

function flameMaterial(kind, core) {
  const k = FLAME_KINDS[kind] || FLAME_KINDS.kerolox;
  const col = (a, w) => new THREE.Vector3(...a.map((x) => Math.min(1, x * w + (1 - w))));
  return new THREE.ShaderMaterial({
    uniforms: {
      uR0: { value: 1 }, uR1: { value: 1 }, uL: { value: 1 },
      uCore: { value: core ? col(k.core, 0.6) : new THREE.Vector3(...k.core) },
      uMid: { value: new THREE.Vector3(...k.mid) },
      uTail: { value: new THREE.Vector3(...k.tail) },
      uOn: { value: 0 }, uGain: { value: k.gain * (core ? 1.4 : 1) }, uTime: { value: 0 },
      uDiamonds: { value: k.diamonds }, uStill: { value: 0 },
    },
    vertexShader: FLAME_V,
    fragmentShader: FLAME_F,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

/**
 * The flames of one part's engines: `points` nozzle exits (metres, in the part's frame, plumes along -Y), `kind`, the
 * exit diameter. set({ on: 0..1, altM, time, still }) each frame. Tier 0 draws one cone an engine and no glow.
 */
export function createFlames({ points, kind = 'kerolox', exitM = 2, tier = 1, dir = [0, -1, 0] }) {
  const group = new THREE.Group();
  group.name = 'flames';
  const k = FLAME_KINDS[kind] || FLAME_KINDS.kerolox;
  const outer = flameMaterial(kind, false);
  const inner = tier > 0 ? flameMaterial(kind, true) : null;
  const along = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(...dir).normalize());
  for (const p of points) {
    const holder = new THREE.Group();
    holder.position.set(p[0], p[1], p[2]);
    holder.quaternion.copy(along);
    const o = new THREE.Mesh(unitCone(), outer);
    o.frustumCulled = false;
    o.renderOrder = 5;
    holder.add(o);
    if (inner) { const i = new THREE.Mesh(unitCone(), inner); i.frustumCulled = false; i.renderOrder = 6; holder.add(i); }
    group.add(holder);
  }
  let glow = null;
  if (tier > 0 && glowTexture()) {
    const c = new THREE.Vector3(); for (const p of points) c.add(new THREE.Vector3(...p)); c.divideScalar(points.length);
    glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(...k.core), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    glow.position.copy(c);
    glow.renderOrder = 7;
    group.add(glow);
  }
  const R = exitM / 2;
  let spread = 1;
  if (points.length > 1) { let m = 0; for (const p of points) m = Math.max(m, Math.hypot(p[0], p[2])); spread = 1 + m / R; }
  group.visible = false;
  return {
    group,
    set({ on = 0, altM = 0, time = 0, still = false, throttle = 1 }) {
      const v = Math.max(0, Math.min(1, on)) * throttle;
      group.visible = v > 0.002;
      if (!group.visible) return;
      const a = ambient(altM);
      const lenM = R * k.length * (1 + 2.6 * (1 - a));
      const r1 = R * (1.1 + 5.5 * (1 - a));
      for (const m of inner ? [outer, inner] : [outer]) {
        const core = m === inner;
        m.uniforms.uR0.value = R * (core ? 0.55 : 0.92);
        m.uniforms.uR1.value = core ? R * 0.35 + r1 * 0.25 : r1;
        m.uniforms.uL.value = core ? lenM * 0.45 : lenM;
        m.uniforms.uOn.value = v;
        m.uniforms.uTime.value = time;
        m.uniforms.uStill.value = still ? 1 : 0;
      }
      if (glow) { const s = R * spread * (2.6 + 2 * (1 - a)); glow.scale.set(s, s, 1); glow.material.opacity = Math.min(1, v * (kind === 'hydrolox' ? 0.25 : 0.7)); }
    },
    dispose() { outer.dispose(); if (inner) inner.dispose(); if (glow) glow.material.dispose(); },
  };
}

/** Separation motors (retro or ullage rockets): short solid-fuel plumes at `points` along `dir`, for `dur` seconds. */
export function createPuffs({ points, dir = [0, 1, 0], exitM = 0.35, dur = 0.8, tier = 1 }) {
  const f = createFlames({ points, kind: 'solid', exitM, tier: Math.min(tier, 1) ? 1 : 0, dir });
  return {
    group: f.group,
    set(age, { altM = 0, time = 0, still = false } = {}) {
      const on = age >= 0 && age <= dur ? Math.min(1, age / 0.08) * (1 - Math.pow(age / dur, 3)) : 0;
      f.set({ on, altM: altM + 30000, time, still });
    },
    dispose: f.dispose,
  };
}

// --- the exhaust cloud at the pad --------------------------------------------------------------------------------

const CLOUD_V = `${LOG_V}
attribute vec4 aSeed;        // birth (mission s), lobe angle (rad), speed (m/s), size factor
uniform float uTime, uScale, uLife;
uniform vec3 uAxis, uSide;   // the trench's two ways out (unit, in the cloud's frame) and across it
varying float vAlpha;
varying float vHot;
varying float vLit;
uniform vec3 uSun;
void main() {
  float age = uTime - aSeed.x;
  float alive = step(0.0, age) * step(age, uLife);
  float tau = 5.0;
  float d = aSeed.z * tau * (1.0 - exp(-max(age, 0.0) / tau));
  vec3 dir = normalize(uAxis * cos(aSeed.y) + uSide * sin(aSeed.y) * 0.45);
  vec3 p = dir * d;
  // Rise: the hot cloud climbs, slowly, and spreads.
  p += vec3(0.0, 1.0, 0.0) * (3.0 + 1.6 * max(age, 0.0) + 0.08 * d);
  float size = (10.0 + 2.2 * max(age, 0.0) + 0.09 * d) * aSeed.w;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = alive * size * uScale / max(-mv.z, 1.0);
  vAlpha = alive * smoothstep(0.0, 0.8, age) * (1.0 - smoothstep(uLife * 0.55, uLife, age));
  vHot = alive * (1.0 - smoothstep(0.0, 2.5, age));
  vLit = 0.62 + 0.38 * clamp(dot(normalize(dir + vec3(0.0, 0.6, 0.0)), uSun) * 0.5 + 0.5, 0.0, 1.0);
  #include <logdepthbuf_vertex>
}`;

const CLOUD_F = `${LOG_F}
varying float vAlpha;
varying float vHot;
varying float vLit;
uniform vec3 uTint;
void main() {
  #include <logdepthbuf_fragment>
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r = dot(q, q);
  if (r > 1.0) discard;
  float a = vAlpha * (1.0 - r) * (1.0 - r) * 0.55;
  vec3 steam = uTint * vLit;
  vec3 c = mix(steam, vec3(1.0, 0.62, 0.25) * 1.4, vHot * 0.7);
  gl_FragColor = vec4(c, a);
  ${OUT_F}
}`;

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/**
 * The steam and exhaust thrown out of the flame trench at ignition: `from` to `to` mission seconds of births, out
 * along `axis` both ways (a split deflector sends it two ways). Lives in the PLACE's frame (y up), so it stays on the
 * ground as the rocket leaves. set({ time, sunUp: [x, y, z] in the same frame, scale: px per unit at 1 m }).
 */
export function createExhaustCloud({ from, to, axis = [0, 0, 1], count = 400, ways = 2, seed = 7 }) {
  const rnd = rng(seed);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < count; i += 1) {
    const way = ways > 1 && i % 2 ? Math.PI : 0;
    seeds[i * 4] = from + (to - from) * Math.pow(rnd(), 0.8);
    seeds[i * 4 + 1] = way + (rnd() - 0.5) * 0.9;
    seeds[i * 4 + 2] = 25 + 85 * rnd();
    seeds[i * 4 + 3] = 0.6 + 0.9 * rnd();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  const ax = new THREE.Vector3(...axis).normalize();
  const side = new THREE.Vector3(0, 1, 0).cross(ax).normalize();
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: -1e9 }, uScale: { value: 600 }, uLife: { value: 60 },
      uAxis: { value: ax }, uSide: { value: side }, uSun: { value: new THREE.Vector3(0, 1, 0) },
      uTint: { value: new THREE.Color(0.93, 0.93, 0.92) },
    },
    vertexShader: CLOUD_V,
    fragmentShader: CLOUD_F,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 4;
  return {
    group: points,
    set({ time, sunUp, scale, light = 1 }) {
      mat.uniforms.uTime.value = time;
      if (sunUp) mat.uniforms.uSun.value.set(sunUp[0], sunUp[1], sunUp[2]);
      if (scale) mat.uniforms.uScale.value = scale;
      mat.uniforms.uTint.value.setRGB(0.93 * light, 0.93 * light, 0.92 * light);
      points.visible = time >= from - 0.5;
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}

// --- parachutes -----------------------------------------------------------------------------------------------------

/**
 * One or several canopies on risers from a point: `diameterM` each, `count` (Apollo's three mains, Vostok's one),
 * `lineM` from the canopy's rim to the confluence, gores in two alternating colours. The group's +Y points from the
 * payload to the canopies; the player turns it against the airflow. set(k, time, still): k 0 packed, to 0.3 lines
 * out and streaming, to 0.6 reefed, 1 open.
 */
export function createChutes({ diameterM = 20, count = 1, lineM, gores = 24, colours = ['#e2622a', '#f1efe9'], spreadDeg = 14 }) {
  const D = diameterM, L = Number(lineM) > 0 ? lineM : D * 1.1;
  const group = new THREE.Group();
  group.name = 'chutes';
  const prof = [];
  for (let i = 0; i <= 10; i += 1) {
    const u = i / 10;
    const r = Math.max(0.035, Math.sin(u * Math.PI / 2)) * 0.5;      // a dome from a small vent to the skirt
    const h = Math.cos(u * Math.PI / 2) * 0.36;
    prof.push(new THREE.Vector2(r, h));
  }
  const canopy = new THREE.LatheGeometry(prof, gores);
  const cols = new Float32Array(canopy.attributes.position.count * 3);
  const a = new THREE.Color(colours[0]), b = new THREE.Color(colours[1] || colours[0]);
  const pos = canopy.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const ang = Math.atan2(pos.getX(i), pos.getZ(i)) + Math.PI;
    const gore = Math.floor(ang / (Math.PI * 2) * gores + 1e-4) % gores;
    const c = gore % 2 ? b : a;
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  canopy.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const cloth = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const lineMat = new THREE.LineBasicMaterial({ color: 0xd9d4c8, transparent: true, opacity: 0.8 });
  const rims = [];
  const canopies = [];
  for (let c = 0; c < count; c += 1) {
    const tilt = count > 1 ? spreadDeg * Math.PI / 180 : 0;
    const az = (c / count) * Math.PI * 2;
    const holder = new THREE.Group();
    holder.rotation.set(Math.sin(az) * tilt, 0, -Math.cos(az) * tilt);
    const mesh = new THREE.Mesh(canopy, cloth);
    holder.add(mesh);
    const lg = new THREE.BufferGeometry();
    const n = Math.max(6, gores / 2);
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
    const lines = new THREE.LineSegments(lg, lineMat);
    lines.frustumCulled = false;
    holder.add(lines);
    group.add(holder);
    canopies.push({ holder, mesh, lines, n });
    rims.push(n);
  }
  group.visible = false;
  return {
    group,
    set(k, time = 0, still = false) {
      group.visible = k > 0.001;
      if (!group.visible) return;
      const out = Math.min(1, k / 0.3);                       // lines paying out
      const open = k < 0.3 ? 0.06 : k < 0.6 ? 0.06 + 0.3 * (k - 0.3) / 0.3 : 0.36 + 0.64 * (k - 0.6) / 0.4;
      const breathe = still ? 1 : 1 + 0.025 * Math.sin(time * 2.1);
      for (const c of canopies) {
        const dist = L * out + D * 0.1;
        const w = D * open * breathe;
        c.mesh.scale.set(w, D * (0.25 + 0.75 * Math.min(1, open * 1.6)), w);
        c.mesh.position.set(0, dist, 0);
        const arr = c.lines.geometry.attributes.position.array;
        for (let i = 0; i < c.n; i += 1) {
          const ang = (i / c.n) * Math.PI * 2;
          arr[i * 6] = 0; arr[i * 6 + 1] = 0; arr[i * 6 + 2] = 0;
          arr[i * 6 + 3] = Math.sin(ang) * w * 0.5; arr[i * 6 + 4] = dist; arr[i * 6 + 5] = Math.cos(ang) * w * 0.5;
        }
        c.lines.geometry.attributes.position.needsUpdate = true;
      }
    },
    dispose() { canopy.dispose(); cloth.dispose(); lineMat.dispose(); for (const c of canopies) c.lines.geometry.dispose(); },
  };
}

// --- the plasma of an entry ----------------------------------------------------------------------------------------

const PLASMA_F = `${LOG_F}
uniform float uOn, uTime, uStill;
varying float vEdge;
varying float vY;
void main() {
  #include <logdepthbuf_fragment>
  float t = uTime * (1.0 - uStill);
  float glow = pow(1.0 - vEdge, 1.5) * 0.6 + pow(vEdge, 3.0) * 0.5;
  float wob = 0.85 + 0.15 * sin(vY * 9.0 - t * 20.0);
  vec3 c = mix(vec3(1.0, 0.42, 0.22), vec3(1.0, 0.86, 0.72), vEdge);
  gl_FragColor = vec4(c * glow * uOn * wob * 1.6, 1.0);
  ${OUT_F}
}`;
const PLASMA_V = `${LOG_V}
varying float vEdge;
varying float vY;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vEdge = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
  vY = position.y;
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}`;

/**
 * The glowing shock layer in front of a capsule's heat shield and its wake: +Y is the direction of flight in the
 * group's frame (the player turns it along the velocity). set(k, time, still), k the brightness 0..1.
 */
export function createPlasma({ radiusM = 2 }) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uOn: { value: 0 }, uTime: { value: 0 }, uStill: { value: 0 } },
    vertexShader: PLASMA_V, fragmentShader: PLASMA_F,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const group = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(radiusM * 1.25, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), mat);
  shell.position.y = -radiusM * 0.55;
  const wake = new THREE.Mesh(new THREE.ConeGeometry(radiusM * 1.1, radiusM * 9, 20, 6, true), mat);
  wake.rotation.x = Math.PI;
  wake.position.y = -radiusM * 5;
  group.add(shell, wake);
  group.visible = false;
  return {
    group,
    set(k, time = 0, still = false) {
      group.visible = k > 0.003;
      mat.uniforms.uOn.value = k;
      mat.uniforms.uTime.value = time;
      mat.uniforms.uStill.value = still ? 1 : 0;
    },
    dispose() { mat.dispose(); shell.geometry.dispose(); wake.geometry.dispose(); },
  };
}

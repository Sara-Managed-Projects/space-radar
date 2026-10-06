// sky/meteors.js -- a shower's meteors, streaking from its radiant at the rate this sky would show
// (internal #352, check 14 against Stellarium).
//
// Contract:
//   visibleRate({ zhr, radiantAltDeg, limitMag, r }) -> meteors an hour one watcher would count (pure)
//   meteorPath(radiant, start, vKms)                 -> { from, to, seconds, lengthDeg } or null (pure)
//   drawMagnitude(limitMag, u, r)                    -> the magnitude of one meteor, from a uniform u (pure)
//   createMeteors(env) -> { update(frame), spawn(i, { from, mag, slow }), state(), dispose() }
//     env:   { root, radius, renderOrder, random }
//     frame: { showers: [{ id, zhr, vKms, local: [x, y, z], altDeg }], limitMag, pxPerDeg, strength }
// Loaded by sky/groundsky.js with a dynamic import, the first time a shower is active while the
// sky view is open; never under prefers-reduced-motion.
//
// WHAT IS COMPUTED AND WHAT IS DRAWN. The RATE is the observers' own formula, turned round (ZHR is
// defined by it; Wikipedia "Zenithal hourly rate", read 2026-10-06):
//     seen per hour = ZHR x sin(radiant altitude) x r ^ (limiting magnitude - 6.5)
// with the shower's ZHR from registry/showers.yaml, the radiant's altitude now, and this sky's
// limiting magnitude (sky/skymath.js: the kind of sky, twilight, the Moon). `r`, the population
// index, is 2.5 for every shower: the IMO's per-shower values run from about 2.1 to 3.0 and its
// site was down for rebuilding on 2026-10-06, so no table could be read and cited (an issue says so).
// The ZHR is the peak's; the registry holds no activity curve, so within the days a shower is
// marked the rate is its peak rate, and the note under the controls says "at its peak".
//
// Each STREAK is random within the geometry: it starts somewhere above the horizon, runs along the
// great circle away from the radiant, and is as long and as quick as a body entering at the
// shower's speed and burning from 100 km down to 78 km would look from where it is seen (longer
// far from the radiant, a point at it). Which meteor falls where, and when, is invented: this is
// an illustration of a shower at its rate, not a record of one, and the copy says so.
//
// The clock's speed is ignored on purpose: at 600 times real time a true rate would be a storm.

import * as THREE from '../../vendor/three.module.min.js';

const DEG = Math.PI / 180;
export const POPULATION_INDEX = 2.5;
export const BEGIN_KM = 100;
export const END_KM = 78;
const POOL = 8;
const FADE_S = 0.35;

export function visibleRate({ zhr, radiantAltDeg, limitMag, r = POPULATION_INDEX } = {}) {
  if (!(zhr > 0) || !(radiantAltDeg > 0) || !Number.isFinite(limitMag)) return 0;
  return zhr * Math.sin(Math.min(90, radiantAltDeg) * DEG) * Math.pow(r, limitMag - 6.5);
}

/** Meteors are many and faint: each magnitude fainter holds r times as many. u in (0, 1]. */
export function drawMagnitude(limitMag, u, r = POPULATION_INDEX) {
  return limitMag + Math.log(Math.max(1e-6, Math.min(1, u))) / Math.log(r);
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };

/** `p` turned by `angle` about the unit `axis` (Rodrigues). */
function turn(p, axis, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const x = cross(axis, p);
  const d = dot(axis, p) * (1 - c);
  return [p[0] * c + x[0] * s + axis[0] * d, p[1] * c + x[1] * s + axis[1] * d, p[2] * c + x[2] * s + axis[2] * d];
}

/**
 * One meteor's track on the sky. `radiant` and `start` are unit vectors in the view's local frame
 * (+Y up). The body comes down the radiant's direction through BEGIN_KM to END_KM; seen from the
 * side that is a line of `lengthDeg` away from the radiant, crossed in `seconds`.
 */
export function meteorPath(radiant, start, vKms) {
  if (!(vKms > 0) || !(start[1] > 0)) return null;
  const sinR = Math.max(0.2, radiant[1]);
  const lengthKm = (BEGIN_KM - END_KM) / sinR;
  const rangeKm = BEGIN_KM / Math.max(0.17, start[1]);
  const D = Math.acos(Math.max(-1, Math.min(1, dot(radiant, start))));
  if (D < 2 * DEG || D > 178 * DEG) return null; // head on: a point that flares, not a streak
  const theta = Math.atan2(lengthKm * Math.sin(D), rangeKm - lengthKm * Math.cos(D));
  if (!(theta > 0)) return null;
  const axis = norm(cross(radiant, start));
  const to = turn(start, axis, theta);
  return { from: start, to, axis, theta, seconds: lengthKm / vKms, lengthDeg: theta / DEG };
}

const VERT = /* glsl */ `
attribute vec2 aUv;
attribute float aAlpha;
varying vec2 vUv;
varying float vAlpha;
void main() {
  vUv = aUv;
  vAlpha = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const FRAG = /* glsl */ `
varying vec2 vUv;
varying float vAlpha;
void main() {
  float along = pow(clamp(vUv.x, 0.0, 1.0), 1.6);
  float across = pow(max(0.0, 1.0 - abs(vUv.y)), 1.5);
  float a = vAlpha * along * across;
  if (a <= 0.003) discard;
  gl_FragColor = vec4(vec3(1.0, 0.97, 0.9) * a, a);
  #include <colorspace_fragment>
}
`;

export function createMeteors(env) {
  const R = env.radius;
  const random = typeof env.random === 'function' ? env.random : Math.random;
  const pos = new Float32Array(POOL * 4 * 3);
  const uv = new Float32Array(POOL * 4 * 2);
  const alpha = new Float32Array(POOL * 4);
  const index = [];
  for (let i = 0; i < POOL; i += 1) {
    const k = i * 4;
    index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    // tail left, tail right, head left, head right
    uv.set([0, -1, 0, 1, 1, -1, 1, 1], k * 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aUv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  geo.setIndex(index);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'sky-meteors';
  mesh.frustumCulled = false;
  mesh.renderOrder = env.renderOrder;
  mesh.visible = false;
  env.root.add(mesh);

  const live = []; // { path, bornS, mag, slot }
  const stats = { perHour: null, alive: 0, drawn: 0, last: null };
  let lastS = NaN;
  let frameNow = null;

  function freeSlot() {
    for (let s = 0; s < POOL; s += 1) if (!live.some((m) => m.slot === s)) return s;
    return -1;
  }

  /** One meteor of shower `sh`, now. Returns what was drawn (for the probe and the test), or null. */
  function spawnFrom(sh, limitMag, nowS, opts = {}) {
    const slot = freeSlot();
    if (slot < 0 || !sh || !Array.isArray(sh.local)) return null;
    for (let tries = 0; tries < 12; tries += 1) {
      // Somewhere in the sky above five degrees, even by solid angle.
      const y = 0.087 + random() * (1 - 0.087);
      const az = random() * Math.PI * 2;
      const h = Math.sqrt(1 - y * y);
      const path = meteorPath(sh.local, Array.isArray(opts.from) ? opts.from : [Math.sin(az) * h, y, -Math.cos(az) * h], sh.vKms || 45);
      if (!path || path.to[1] < 0.02) continue;
      // `opts` is the probe's and a trip stop's: where it starts, its magnitude, and a track slowed `slow` times.
      if (opts.slow > 1) path.seconds *= opts.slow;
      const m = { path, bornS: nowS, mag: Number.isFinite(opts.mag) ? opts.mag : drawMagnitude(limitMag, 1 - random()), slot, shower: sh.id };
      live.push(m);
      stats.drawn += 1;
      stats.last = { shower: sh.id, mag: m.mag, lengthDeg: path.lengthDeg, seconds: path.seconds, from: path.from, to: path.to };
      return stats.last;
    }
    return null;
  }

  function place(m, nowS, limitMag, pxPerDeg, strength) {
    const age = nowS - m.bornS;
    const k = Math.min(1, age / m.path.seconds);
    const fade = age <= m.path.seconds ? 1 : Math.max(0, 1 - (age - m.path.seconds) / FADE_S);
    const head = turn(m.path.from, m.path.axis, m.path.theta * k);
    // The wake is what the eye holds on to: at most a little over half the track.
    const tail = turn(m.path.from, m.path.axis, m.path.theta * Math.max(0, k - 0.6));
    const bright = Math.max(0, limitMag - m.mag);
    const widthPx = Math.min(5, 1.6 + 0.55 * bright);
    const half = Math.tan((widthPx / 2 / Math.max(1, pxPerDeg)) * DEG) * R;
    // The track's plane has `axis` for its normal, so across the track is along the axis.
    const side = m.path.axis;
    const a = Math.min(1, 0.4 + 0.2 * bright) * fade * strength;
    const o = m.slot * 12;
    const put = (i, p, sgn) => {
      pos[o + i * 3] = p[0] * R + side[0] * half * sgn;
      pos[o + i * 3 + 1] = p[1] * R + side[1] * half * sgn;
      pos[o + i * 3 + 2] = p[2] * R + side[2] * half * sgn;
    };
    put(0, tail, -1); put(1, tail, 1); put(2, head, -1); put(3, head, 1);
    alpha.fill(a, m.slot * 4, m.slot * 4 + 4);
    return fade > 0;
  }

  function update(frame) {
    frameNow = frame;
    const nowS = performance.now() / 1000;
    const dt = Number.isFinite(lastS) ? Math.min(0.25, Math.max(0, nowS - lastS)) : 0;
    lastS = nowS;
    let perHour = 0;
    for (const sh of frame.showers || []) {
      const rate = visibleRate({ zhr: sh.zhr, radiantAltDeg: sh.altDeg, limitMag: frame.limitMag });
      perHour += rate;
      if (frame.strength > 0.05 && random() < (rate / 3600) * dt) spawnFrom(sh, frame.limitMag, nowS);
    }
    stats.perHour = perHour;
    alpha.fill(0);
    for (let i = live.length - 1; i >= 0; i -= 1) {
      if (!place(live[i], nowS, frame.limitMag, frame.pxPerDeg, frame.strength)) live.splice(i, 1);
    }
    stats.alive = live.length;
    mesh.visible = live.length > 0;
    if (mesh.visible) {
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aAlpha.needsUpdate = true;
    }
  }

  return {
    update,
    /** Draw one now, from shower `i` of the last frame: for the probe, a trip stop and the test. */
    spawn(i = 0, opts = {}) {
      const f = frameNow;
      if (!f || !f.showers || !f.showers[i]) return null;
      return spawnFrom(f.showers[i], f.limitMag, performance.now() / 1000, opts);
    },
    state: () => ({ ...stats }),
    dispose() {
      geo.dispose();
      mat.dispose();
      env.root.remove(mesh);
      live.length = 0;
    },
  };
}

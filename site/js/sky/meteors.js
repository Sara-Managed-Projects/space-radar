// sky/meteors.js -- a shower's meteors, streaking from its radiant at the rate this sky would show
// (internal #352, check 14 against Stellarium).
//
// Contract:
//   visibleRate({ zhr, radiantAltDeg, limitMag, r }) -> meteors an hour one watcher would count (pure)
//   solarLongitude(tMs)                              -> the Sun's longitude, degrees, equinox 2000.0
//   showerActivity(row, tMs)                         -> 0 to 1: tonight's ZHR as a share of the peak's (pure)
//   antihelionRadiant(tMs)                           -> a J2000 unit vector, or null out of its season
//   sourcesAt(tMs, observer)                         -> every source active now, with tonight's ZHR, its r and where its radiant is
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
// index, is each shower's own, from the IMO's working list (2027 Meteor Shower Calendar, Table 5,
// read 2026-10-07; registry/showers.yaml, mirrored to data/showers-activity.js): 2.1 for the
// Quadrantids, whose meteors are bright, to 2.8 for the Ursids.
//
// THE ACTIVITY CURVE (internal #416). A shower is drawn over the whole activity period the IMO
// lists, not only at its peak. The list gives three dates and one rate: the period's first and
// last day, the Sun's longitude at the maximum, and the ZHR there. Between them this file draws
// the simplest curve observers use (Jenniskens 1994: a shower's rate falls off exponentially on
// each side of its peak, ZHR = ZHRmax x 10^(-B |sun's longitude - peak's|)), with the slope B on
// each side set so the rate is ONE an hour on the period's first and last day. That is a MODEL:
// the IMO publishes no slopes, real profiles have a broad base and a sharp core (so this one is
// too generous a few days from a sharp peak like the Quadrantids'), and outbursts are not in it.
// The peak's hour is right, because it is tied to the Sun's longitude and not to a calendar date.
//
// SPORADICS. The same table's first row is the antihelion source: a wide, weak radiant 15 degrees
// east of the point opposite the Sun, active from 10 December to 20 September, ZHR 4, r 3.0,
// 30 km/s. It is drawn as that. The truly random background (a few an hour more, most before
// dawn) is NOT drawn: no rate for it was found in a source read today.
//
// Each STREAK is random within the geometry: it starts somewhere above the horizon, runs along the
// great circle away from the radiant, and is as long and as quick as a body entering at the
// shower's speed and burning from 100 km down to 78 km would look from where it is seen (longer
// far from the radiant, a point at it). Which meteor falls where, and when, is invented: this is
// an illustration of a shower at its rate, not a record of one, and the copy says so.
//
// The clock's speed is ignored on purpose: at 600 times real time a true rate would be a storm.

import * as THREE from '../../vendor/three.module.min.js';
import * as Astronomy from '../../vendor/astronomy.js';
import { SHOWERS } from '../data/showers.js';
import { SHOWER_ACTIVITY, ANTIHELION } from '../data/showers-activity.js';
import { radiantAltAz } from './radiants.js';

const DEG = Math.PI / 180;
const DAY = 86400000;
const OBLIQUITY = 23.4392911 * DEG;
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

/** The Sun's ecliptic longitude at an instant, in degrees, on the equinox of 2000.0 (the IMO's). */
export function solarLongitude(tMs) {
  const date = new Date(tMs);
  // Astronomy Engine gives the longitude of date; general precession is 50.29 arcseconds a year.
  const years = (tMs - Date.UTC(2000, 0, 1, 12)) / (365.25 * DAY);
  return (((Astronomy.SunPosition(date).elon - 0.013969 * years) % 360) + 360) % 360;
}

const wrap180 = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
function monthDay(text) {
  const m = /^(\d{2})-(\d{2})$/.exec(String(text || ''));
  return m ? [Number(m[1]) - 1, Number(m[2])] : null;
}
const ACTIVITY = new Map(SHOWER_ACTIVITY.map((a) => [a.id, a]));

/**
 * How active a shower is at an instant, 0 to 1 of its peak ZHR. `row` is a registry row with the
 * IMO's numbers merged in: { zhr, active_from, active_to, sol }. Nothing outside the activity
 * period; 1 at the Sun's longitude of the maximum; one an hour on the period's first and last day.
 */
export function showerActivity(row, tMs) {
  const from = monthDay(row && row.active_from);
  const to = monthDay(row && row.active_to);
  if (!from || !to || !Number.isFinite(row.sol) || !(row.zhr > 0)) return 0;
  const now = solarLongitude(tMs);
  const year = new Date(tMs).getUTCFullYear();
  // The Sun's longitude on the period's two days, in the year that puts them either side of the peak.
  const lonOf = (md) => solarLongitude(Date.UTC(year, md[0], md[1], 12));
  const before = -wrap180(lonOf(from) - row.sol); // degrees from the first day to the peak
  const after = wrap180(lonOf(to) - row.sol);
  const d = wrap180(now - row.sol);
  if (!(before > 0) || !(after > 0) || d < -before - 0.5 || d > after + 0.5) return 0;
  const decades = Math.log10(Math.max(1.5, row.zhr));
  const B = d < 0 ? decades / before : decades / after;
  return Math.pow(10, -B * Math.abs(d));
}

/** Where the antihelion source's radiant is (J2000 unit vector): on the ecliptic, `ahead_deg` from the Sun. Null out of season. */
export function antihelionRadiant(tMs, ant = ANTIHELION) {
  const from = monthDay(ant && ant.active_from);
  const to = monthDay(ant && ant.active_to);
  if (!from || !to) return null;
  const d = new Date(tMs);
  const md = d.getUTCMonth() * 100 + d.getUTCDate();
  const a = from[0] * 100 + from[1];
  const b = to[0] * 100 + to[1];
  const inSeason = a <= b ? (md >= a && md <= b) : (md >= a || md <= b);
  if (!inSeason) return null;
  const lon = (solarLongitude(tMs) + ant.ahead_deg) * DEG;
  return [Math.cos(lon), Math.sin(lon) * Math.cos(OBLIQUITY), Math.sin(lon) * Math.sin(OBLIQUITY)];
}

/**
 * Every source of meteors active at an instant, for a place: the showers inside their activity
 * period with tonight's ZHR, and the antihelion source. Each `{ id, display, zhr, peakZhr, r, vKms,
 * altDeg, azDeg, activity }`; `observer` is `{ latDeg, lonDeg }`.
 */
export function sourcesAt(tMs, observer, showers = SHOWERS) {
  const where = { latRad: observer.latDeg * DEG, lonRad: observer.lonDeg * DEG };
  const out = [];
  for (const sh of showers) {
    const imo = ACTIVITY.get(sh.id);
    if (!imo) continue;
    const activity = showerActivity({ ...sh, ...imo }, tMs);
    if (!(activity > 0)) continue;
    const aa = radiantAltAz(sh, tMs, where);
    if (!aa) continue;
    out.push({ id: sh.id, display: sh.display, zhr: sh.zhr * activity, peakZhr: sh.zhr, r: imo.r, vKms: sh.v_kms, altDeg: aa.altDeg, azDeg: aa.azDeg, activity });
  }
  const ant = antihelionRadiant(tMs);
  if (ant) {
    const ra = Math.atan2(ant[1], ant[0]) / DEG / 15;
    const aa = radiantAltAz({ ra_h: (ra + 24) % 24, dec: Math.asin(ant[2]) / DEG }, tMs, where);
    if (aa) out.push({ id: 'antihelion', display: ANTIHELION.display, zhr: ANTIHELION.zhr, peakZhr: ANTIHELION.zhr, r: ANTIHELION.r, vKms: ANTIHELION.v_kms, altDeg: aa.altDeg, azDeg: aa.azDeg, activity: 1, sporadic: true });
  }
  return out;
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
      const m = { path, bornS: nowS, mag: Number.isFinite(opts.mag) ? opts.mag : drawMagnitude(limitMag, 1 - random(), sh.r || POPULATION_INDEX), slot, shower: sh.id };
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
      const rate = visibleRate({ zhr: sh.zhr, radiantAltDeg: sh.altDeg, limitMag: frame.limitMag, r: sh.r || POPULATION_INDEX });
      sh.perHour = rate;
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

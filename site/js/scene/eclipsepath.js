// scene/eclipsepath.js -- where the axis of the Moon's shadow meets the Earth, and the path it
// draws across it (public #273, 2026-10-08).
//
// Contract (the first four are pure and run in node):
//   axisPoint(tMs)              -> {tMs, latDeg, lonDeg, ecefKm, umbraKm, penumbraKm} | null
//   centralPath(tMs, opts)      -> [axisPoint, ...] the whole central eclipse round tMs, or []
//   ribbon(points, opts)        -> {positions: Float32Array, index: Uint16Array|Uint32Array, edges: Float32Array}
//   ecefToEarthLocal(ecefKm, out) -> the Earth mesh's own axes, in equatorial radii
//   createEclipsePath(THREE, earthMesh) -> {update(tMs, on), state(), dispose()}
//
// WHY. The eclipse trip showed the shadow where it is at one instant, and nothing of where it has
// been or is going: the one thing an eclipse map is for. The path of totality (or of the ring, at
// an annular eclipse) is the track of the shadow's AXIS -- the line from the Sun's centre through
// the Moon's -- over the ground, as wide as the shadow's core is there.
//
// THE SAME ARITHMETIC AS THE LIBRARY. Astronomy Engine finds the instant of greatest eclipse and
// gives one point (SearchGlobalSolarEclipse -> latitude, longitude). Its MoonShadow() and
// GeoidIntersect() are not exported, so this file does what they do, with the library's own public
// calls and constants (astronomy.js, read 2026-10-08): the Sun from the Earth's centre with light
// time and aberration, the geocentric Moon, both turned to the equator of date, the z axis
// stretched by the Earth's flattening so the geoid is a sphere, the nearer root of the line and
// that sphere, and Greenwich apparent sidereal time for the longitude. tests/test_eclipse_path.mjs
// holds the point at the library's own peak to the library's own latitude and longitude, to a
// hundredth of a degree, for the next total and the next annular eclipse.
//
// WHAT THE RIBBON'S WIDTH IS. The core's radius ACROSS THE AXIS (scene/eclipse.js shadowRadiiKm),
// laid on the ground either side of the track. Where the Sun is low the shadow lies down and the
// path on the ground is wider than that; the ribbon does not widen for it, and the shadow drawn by
// the Earth's own shader -- which has no such shortcut -- is the truth beside it. Never drawn
// narrower than MIN_HALF_KM, or the 2027 path (258 km) would be under two pixels from the trip's
// first stop: where that floor applies the ribbon is wider than the path, which the note says.
//
// NOTHING AT BOOT. scene/worlds.js imports this file the first time an eclipse is being drawn.

import * as Astronomy from '../../vendor/astronomy.js';
import { shadowRadiiKm } from './eclipse.js';

const KM_PER_AU = Astronomy.KM_PER_AU;
/** Astronomy Engine's EARTH_FLATTENING and EARTH_EQUATORIAL_RADIUS_KM (astronomy.js, read 2026-10-08). */
export const EARTH_FLATTENING = 0.996647180302104;
export const EARTH_EQUATORIAL_RADIUS_KM = 6378.1366;
/** The ribbon's least half-width, km, and how far above the ellipsoid it is laid (over the clouds' shell). */
export const MIN_HALF_KM = 45;
export const LIFT = 1.004;
const DEG = Math.PI / 180;

/**
 * Where the shadow's axis meets the Earth at tMs, or null when it misses (no central eclipse then).
 * `umbraKm` is signed as shadowRadiiKm's: positive under a total eclipse, negative under an annular one.
 */
export function axisPoint(tMs) {
  const time = Astronomy.MakeTime(new Date(tMs));
  const s = Astronomy.GeoVector(Astronomy.Body.Sun, time, true);
  const m = Astronomy.GeoMoon(time);
  const rot = Astronomy.Rotation_EQJ_EQD(time);
  // The axis: from the Sun's centre through the Moon's. The Earth's centre, from the Moon's.
  const v = Astronomy.RotateVector(rot, new Astronomy.Vector(m.x - s.x, m.y - s.y, m.z - s.z, time));
  const e = Astronomy.RotateVector(rot, new Astronomy.Vector(-m.x, -m.y, -m.z, time));
  const vx = v.x * KM_PER_AU, vy = v.y * KM_PER_AU, vz = (v.z * KM_PER_AU) / EARTH_FLATTENING;
  const ex = e.x * KM_PER_AU, ey = e.y * KM_PER_AU, ez = (e.z * KM_PER_AU) / EARTH_FLATTENING;
  const R = EARTH_EQUATORIAL_RADIUS_KM;
  const A = vx * vx + vy * vy + vz * vz;
  const B = -2 * (vx * ex + vy * ey + vz * ez);
  const C = ex * ex + ey * ey + ez * ez - R * R;
  const radic = B * B - 4 * A * C;
  if (!(radic > 0)) return null;
  const u = (-B - Math.sqrt(radic)) / (2 * A);
  const px = u * vx - ex;
  const py = u * vy - ey;
  const pz = (u * vz - ez) * EARTH_FLATTENING;
  const proj = Math.hypot(px, py) * EARTH_FLATTENING * EARTH_FLATTENING;
  const latDeg = proj === 0 ? (pz > 0 ? 90 : -90) : Math.atan(pz / proj) / DEG;
  const gast = Astronomy.SiderealTime(time) * 15 * DEG;
  let lonDeg = (Math.atan2(py, px) / DEG - gast / DEG) % 360;
  if (lonDeg <= -180) lonDeg += 360; else if (lonDeg > 180) lonDeg -= 360;
  // Earth-fixed: the equator-of-date vector turned back by the sidereal angle.
  const c = Math.cos(gast), sn = Math.sin(gast);
  const ecefKm = { x: px * c + py * sn, y: -px * sn + py * c, z: pz };
  return { tMs, latDeg, lonDeg, ecefKm, ...shadowRadiiKm(u) };
}

/**
 * The whole central eclipse that tMs belongs to: one point every `stepS` seconds from the first
 * instant the axis touches the Earth to the last, looked for within `reachMin` minutes either side
 * (a central eclipse lasts up to about five and a half hours end to end, and the shader's gate
 * opens the drawing about two hours before the axis arrives). [] when there is none in reach.
 */
export function centralPath(tMs, { stepS = 60, reachMin = 330 } = {}) {
  const step = stepS * 1000;
  const reach = Math.round((reachMin * 60000) / step);
  const t0 = Math.round(tMs / step) * step;
  let hit = null;
  for (let k = 0; k <= reach && hit === null; k++) {
    if (axisPoint(t0 + k * step)) hit = t0 + k * step;
    else if (k && axisPoint(t0 - k * step)) hit = t0 - k * step;
  }
  if (hit === null) return [];
  const out = [axisPoint(hit)];
  for (let t = hit - step, p; (p = axisPoint(t)) && out.length < 600; t -= step) out.unshift(p);
  for (let t = hit + step, p; (p = axisPoint(t)) && out.length < 1200; t += step) out.push(p);
  return out;
}

/** Earth-fixed km -> the Earth mesh's local axes (scene/earth.js: ECEF remapped x, z, -y), in equatorial radii. */
export function ecefToEarthLocal(ecefKm, out = [0, 0, 0]) {
  out[0] = ecefKm.x / EARTH_EQUATORIAL_RADIUS_KM;
  out[1] = ecefKm.z / EARTH_EQUATORIAL_RADIUS_KM;
  out[2] = -ecefKm.y / EARTH_EQUATORIAL_RADIUS_KM;
  return out;
}

/**
 * The path as a strip of triangles in the Earth mesh's axes: two vertices per point, either side of
 * the track by the core's radius there, and the two edges as line segments' vertices.
 */
export function ribbon(points, { minHalfKm = MIN_HALF_KM, lift = LIFT } = {}) {
  const n = points.length;
  const positions = new Float32Array(n * 2 * 3);
  const edges = new Float32Array(n * 2 * 3);
  const index = new (n * 2 > 65535 ? Uint32Array : Uint16Array)(Math.max(0, n - 1) * 6);
  const c = [0, 0, 0], a = [0, 0, 0], b = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    ecefToEarthLocal(points[i].ecefKm, c);
    ecefToEarthLocal(points[Math.max(0, i - 1)].ecefKm, a);
    ecefToEarthLocal(points[Math.min(n - 1, i + 1)].ecefKm, b);
    const t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    // Across the track, on the ground: the track's direction crossed with the way up.
    let sx = t[1] * c[2] - t[2] * c[1], sy = t[2] * c[0] - t[0] * c[2], sz = t[0] * c[1] - t[1] * c[0];
    const sl = Math.hypot(sx, sy, sz) || 1;
    const half = Math.max(Math.abs(points[i].umbraKm), minHalfKm) / EARTH_EQUATORIAL_RADIUS_KM;
    sx = (sx / sl) * half; sy = (sy / sl) * half; sz = (sz / sl) * half;
    for (let side = 0; side < 2; side++) {
      const k = side ? -1 : 1;
      const o = (i * 2 + side) * 3;
      positions[o] = (c[0] + k * sx) * lift; positions[o + 1] = (c[1] + k * sy) * lift; positions[o + 2] = (c[2] + k * sz) * lift;
      const eo = (side * n + i) * 3;
      edges[eo] = positions[o]; edges[eo + 1] = positions[o + 1]; edges[eo + 2] = positions[o + 2];
    }
    if (i < n - 1) index.set([i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2], i * 6);
  }
  return { positions, index, edges };
}

/**
 * The ribbon on the globe: a child of the Earth's mesh, so it turns with the ground. `update(tMs,
 * on)` every frame an eclipse is drawn; the path is worked out once per eclipse (about 300 axis
 * points, a few milliseconds) and again only when the clock leaves it.
 */
export function createEclipsePath(THREE, earthMesh) {
  const group = new THREE.Group();
  group.name = 'eclipse-path';
  group.visible = false;
  earthMesh.add(group);
  const fill = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({
    color: 0xfff1d6, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  }));
  const lineMat = new THREE.LineBasicMaterial({ color: 0xfff1d6, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false });
  const lines = [new THREE.Line(new THREE.BufferGeometry(), lineMat), new THREE.Line(new THREE.BufferGeometry(), lineMat)];
  for (const o of [fill, ...lines]) { o.frustumCulled = false; o.renderOrder = 2; group.add(o); }
  let from = NaN, to = NaN, points = [], lookedAt = NaN;

  function build(tMs) {
    lookedAt = tMs;
    points = centralPath(tMs);
    if (!points.length) { from = to = NaN; return; }
    from = points[0].tMs; to = points[points.length - 1].tMs;
    const r = ribbon(points);
    fill.geometry.dispose();
    fill.geometry = new THREE.BufferGeometry();
    fill.geometry.setAttribute('position', new THREE.BufferAttribute(r.positions, 3));
    fill.geometry.setIndex(new THREE.BufferAttribute(r.index, 1));
    const n = points.length;
    lines.forEach((line, side) => {
      line.geometry.dispose();
      line.geometry = new THREE.BufferGeometry();
      line.geometry.setAttribute('position', new THREE.BufferAttribute(r.edges.subarray(side * n * 3, (side + 1) * n * 3), 3));
    });
  }

  return {
    update(tMs, on) {
      if (!on) { group.visible = false; return; }
      // Inside the path's own span, or within the search's reach of where it was last looked for.
      const inside = tMs >= from - 4 * 3600e3 && tMs <= to + 4 * 3600e3;
      if (!inside && !(Math.abs(tMs - lookedAt) < 3600e3)) build(tMs);
      group.visible = points.length > 1;
    },
    state: () => ({ points: points.length, from, to, visible: group.visible, kind: points.length ? (points[points.length >> 1].umbraKm > 0 ? 'total' : 'annular') : null }),
    dispose() { earthMesh.remove(group); fill.geometry.dispose(); fill.material.dispose(); lineMat.dispose(); lines.forEach((l) => l.geometry.dispose()); },
  };
}

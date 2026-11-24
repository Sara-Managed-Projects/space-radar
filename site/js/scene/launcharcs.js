// scene/launcharcs.js -- the launch archive's replay on the globe (forge #551): each launch an arc rising from its site.
//
// Contract: createLaunchArcs(ctx) -> { draw(items), clear(), dispose(), state() }
//   items: [{ lat, lon, inc, k (0..1, how much of the arc is drawn), alpha (0..1), fail }]
// Pure, exported for tests/test_launch_archive.mjs:
//   launchAzimuth(latDeg, incDeg) -> degrees from north     the heading the inclination allows, toward the equator
//   destination(latDeg, lonDeg, azDeg, km) -> {lat, lon}    a great circle on a sphere of the Earth's mean radius
//   arcPoints(lat, lon, inc, k, fail) -> [{lat, lon, altKm}]
//
// AN ILLUSTRATION, SAID SO. GCAT gives where a rocket left from and, for a fifth of the launches, the orbit's planned
// inclination; it gives no trajectory. So the arc starts at the real site and climbs to ARC_TOP_KM over ARC_RANGE_KM of
// ground, heading as the inclination allows (sin az = cos i / cos lat): east for a prograde orbit, west for a retrograde one,
// north or south toward the equator, because which of the two a rocket took is not in the list; due east where GCAT gives
// no inclination. A failure's arc stops at FAIL_SHARE of the way: it did not get there. The page says all of this under the
// slider (copy/en.launches.js replay.note).
//
// ONE DRAW CALL: every arc of the frame is one LineSegments with RGBA vertex colours, rebuilt only when the UI hands new
// items (a year chosen, a replay step). It turns with the Earth (GMST of the clock, as scene/groundtrack.js does) and is
// drawn on the Earth's stage only. Fetched with the archive (ui/launcharchive.js), never at boot.

import * as THREE from '../../vendor/three.module.min.js';
import { gmst, geodeticToEcef } from '../propagate/frames.js';
import { stage } from './stage.js';
import { CLASS_COLOURS, PALETTE } from './glyphatlas.js';

export const ARC_RANGE_KM = 1800;
export const ARC_TOP_KM = 350;
export const ARC_POINTS = 12;
export const FAIL_SHARE = 0.4;
const LIFT_KM = 6;
const R_KM = 6371.0088;
const DEG = Math.PI / 180;

/** Degrees from north. East for a prograde orbit, west for a retrograde one, toward the equator; due east without one. */
export function launchAzimuth(latDeg, incDeg) {
  if (!Number.isFinite(incDeg) || !Number.isFinite(latDeg)) return 90;
  const c = Math.cos(incDeg * DEG) / Math.cos(latDeg * DEG);
  const s = Math.max(-1, Math.min(1, c));
  const az = Math.asin(s) / DEG;           // -90..90: positive east, negative west, measured from north
  // Toward the equator: a northern site heads south of east (or west), a southern one north of it.
  return latDeg >= 0 ? 180 - az : (az + 360) % 360;
}

export function destination(latDeg, lonDeg, azDeg, km) {
  const d = km / R_KM;
  const p1 = latDeg * DEG;
  const l1 = lonDeg * DEG;
  const th = azDeg * DEG;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(th));
  const l2 = l1 + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return { lat: p2 / DEG, lon: ((l2 / DEG + 540) % 360) - 180 };
}

export function arcPoints(lat, lon, inc, k = 1, fail = false) {
  const az = launchAzimuth(lat, inc);
  const upTo = Math.max(0, Math.min(1, k)) * (fail ? FAIL_SHARE : 1);
  const out = [];
  for (let i = 0; i < ARC_POINTS; i++) {
    const s = (i / (ARC_POINTS - 1)) * upTo;
    const g = destination(lat, lon, az, s * ARC_RANGE_KM);
    out.push({ lat: g.lat, lon: g.lon, altKm: LIFT_KM + ARC_TOP_KM * (1 - (1 - s) * (1 - s)) });
  }
  return out;
}

export function createLaunchArcs(ctx) {
  const group = new THREE.Group();
  group.name = 'launcharcs';
  group.visible = false;
  const scene = ctx && ctx.scene;
  if (scene) scene.add(group);
  const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
  const lines = new THREE.LineSegments(new THREE.BufferGeometry(), mat);
  lines.frustumCulled = false;
  lines.renderOrder = 2;
  group.add(lines);
  const ok = new THREE.Color(CLASS_COLOURS.rocket);
  const bad = new THREE.Color(PALETTE.textDim);
  const _p = new THREE.Vector3();
  const _c = new THREE.Vector3();
  let count = 0;
  let raf = 0;

  function local(lat, lon, altKm, out) {
    const e = geodeticToEcef(lat * DEG, lon * DEG, altKm);
    const u = stage.unitKm;
    return out.set(e.x / u, e.z / u, -e.y / u);
  }

  function draw(items) {
    const pos = [];
    const col = [];
    count = 0;
    for (const it of items || []) {
      if (!Number.isFinite(it.lat) || !Number.isFinite(it.lon) || !(it.k > 0) || !(it.alpha > 0)) continue;
      const pts = arcPoints(it.lat, it.lon, it.inc, it.k, it.fail);
      const c = it.fail ? bad : ok;
      for (let i = 1; i < pts.length; i++) {
        local(pts[i - 1].lat, pts[i - 1].lon, pts[i - 1].altKm, _p);
        pos.push(_p.x, _p.y, _p.z);
        local(pts[i].lat, pts[i].lon, pts[i].altKm, _p);
        pos.push(_p.x, _p.y, _p.z);
        // brighter at the head: the newest part of the climb
        const a0 = it.alpha * (0.35 + 0.65 * ((i - 1) / (pts.length - 1)));
        const a1 = it.alpha * (0.35 + 0.65 * (i / (pts.length - 1)));
        col.push(c.r, c.g, c.b, a0, c.r, c.g, c.b, a1);
      }
      count += 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    lines.geometry.dispose();
    lines.geometry = g;
    place();
    if (count && !raf) loop();
  }

  /** Turn with the Earth and sit where it is drawn; only on the Earth's stage. */
  function place() {
    const on = count > 0 && stage.worldId === 'earth';
    group.visible = on;
    if (!on) return;
    const t = ctx && ctx.clock && typeof ctx.clock.now === 'function' ? ctx.clock.now() : Date.now();
    group.rotation.y = gmst(new Date(t));
    const c = ctx && ctx.worlds && ctx.worlds.drawnPositionOf ? ctx.worlds.drawnPositionOf('earth', _c) : null;
    if (c) group.position.copy(c); else group.position.set(0, 0, 0);
  }

  function loop() {
    if (typeof requestAnimationFrame !== 'function') return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      place();
      if (count) loop();
    });
  }

  function clear() {
    count = 0;
    group.visible = false;
    if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
    raf = 0;
  }

  function dispose() {
    clear();
    lines.geometry.dispose();
    mat.dispose();
    if (scene) scene.remove(group);
  }

  return { draw, clear, dispose, state: () => ({ arcs: count, visible: group.visible }), group };
}

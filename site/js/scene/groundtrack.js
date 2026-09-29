// scene/groundtrack.js -- the followed object's track over the ground, drawn on the globe (spec 0048
// req 3): 45 minutes back, dashed; 90 minutes ahead, solid and fading; a tick every five minutes.
//
// Contract: createGroundTrack(scene, ctx) -> { set(record), update(tMs), clear(), dispose(), state() }
// Pure and exported for tests/test_groundtrack.mjs: trackTimes(t0), trackPoints(record, t0),
// tickTimes(t0), wantsTrack(record, tMs), fadeColour(k)
//
// WHY. orbitalradar.com's follow mode draws the ground track: past dashed, future fading, 5-minute
// ticks. The review found it did not render in their own headless run; ours had the track only as a
// flat chart on the card (ui/trajectory.js, spec 0026 req 14) and the globe drew the orbit in
// inertial space (scene/orbitline.js), which is a ring in the sky and not the ground under it.
//
// HOW. Every point is sampled from the record's own propagator at its own time, turned into the
// Earth-fixed frame (GMST at that instant, the same frames.js code the card's "Passing over" row
// uses), lifted 15 km above the ellipsoid -- above the cloud deck's 8 km shell, so the clouds never
// cover it -- and put in a group that turns with the Earth (rotation.y = GMST now, the rotation
// scene/earth.js gives the globe). So the track stays on the ground under it between rebuilds, and a
// rebuild is needed only because the future moves on: every 10 s of clock time, and at once on a
// scrub. On the globe a track does not break at the date line; that split is for a flat map.
//
// COST. Three draw calls: the dashed past, the fading future, the ticks. 271 points and 28 ticks,
// rebuilt at most every 10 s of clock time: ~300 propagations. Drawn on the Earth stage only (on
// any other the Earth is a compressed disc and a 15 km lift means nothing), for an Earth orbiter
// below 2 000 km: a geostationary track is a dot.

import * as THREE from '../../vendor/three.module.min.js';
import { propagate } from '../propagate/index.js';
import { gmst, eciToEcef, ecefToGeodetic, geodeticToEcef } from '../propagate/frames.js';
import { stage } from './stage.js';
import { PALETTE } from './glyphatlas.js';

export const PAST_MIN = 45;
export const AHEAD_MIN = 90;
export const STEP_S = 30;
export const TICK_MIN = 5;
/** Every third tick carries its minute offset: +15, +30 ... */
export const LABEL_EVERY = 3;
export const LIFT_KM = 15;
/** Above this, off by default: a high orbit's track barely moves and a GEO track is a dot. */
export const MAX_ALT_KM = 2000;
export const REBUILD_MS = 10e3;
/** Half a tick's length on the ground, km. */
const TICK_HALF_KM = 40;
const DEG = 180 / Math.PI;

/** Sample times from 45 min back to 90 min ahead, every 30 s: 271 of them, t0 among them. */
export function trackTimes(t0, pastMin = PAST_MIN, aheadMin = AHEAD_MIN, stepS = STEP_S) {
  const out = [];
  const step = stepS * 1e3;
  for (let t = t0 - pastMin * 60e3; t <= t0 + aheadMin * 60e3 + 1; t += step) out.push(t);
  return out;
}

/** Tick times every 5 minutes from -45 to +90, t0 included: 28 of them. */
export function tickTimes(t0, pastMin = PAST_MIN, aheadMin = AHEAD_MIN, everyMin = TICK_MIN) {
  const out = [];
  for (let m = -pastMin; m <= aheadMin; m += everyMin) out.push({ tMs: t0 + m * 60e3, minutes: m });
  return out;
}

/** The sub-satellite point at tMs: {tMs, latDeg, lonDeg, altKm, ecef} or null. */
export function subPoint(record, tMs) {
  let p = null;
  try { p = propagate(record, tMs); } catch { p = null; }
  if (!p || !Number.isFinite(p.x)) return null;
  const ecef = p.frame === 'earth-fixed' ? p : eciToEcef(p, gmst(new Date(tMs)));
  const gd = ecefToGeodetic(ecef);
  if (!gd || !Number.isFinite(gd.latRad)) return null;
  return { tMs, latDeg: gd.latRad * DEG, lonDeg: gd.lonRad * DEG, altKm: gd.altKm };
}

/** The track's points, each on the ground below the object at its own time. */
export function trackPoints(record, t0, times = trackTimes(t0)) {
  const out = [];
  for (const t of times) {
    const s = subPoint(record, t);
    if (s) out.push(s);
  }
  return out;
}

/** Should this record have a track drawn now? An Earth orbiter under 2 000 km, or one asked for. */
export function wantsTrack(record, tMs, forced = false) {
  if (!record || record.propagator !== 'sgp4') return false;
  if (record.frame !== 'earth-inertial' && record.frame !== 'earth-fixed') return false;
  if (forced) return true;
  const s = subPoint(record, tMs);
  return !!s && s.altKm < MAX_ALT_KM;
}

/** The future's colour at share k of the way out (0 = now): ember fading to the dim text. */
const EMBER = new THREE.Color(PALETTE.ember);
const DIM = new THREE.Color(PALETTE.textDim);
export function fadeColour(k, out = new THREE.Color()) {
  return out.copy(EMBER).lerp(DIM, Math.min(1, Math.max(0, k)));
}

/** Earth-fixed km -> the group's local scene units (the stage's axis remap, before GMST). */
function toLocal(ecef, out) {
  const u = stage.unitKm;
  return out.set(ecef.x / u, ecef.z / u, -ecef.y / u);
}

function groundAt(latDeg, lonDeg, liftKm) {
  return geodeticToEcef(latDeg / DEG, lonDeg / DEG, liftKm);
}

export function createGroundTrack(scene, ctx) {
  const group = new THREE.Group();
  group.name = 'groundtrack';
  group.visible = false;
  if (scene) scene.add(group);

  const pastMat = new THREE.LineDashedMaterial({ color: PALETTE.ember, dashSize: 0.06, gapSize: 0.05, transparent: true, opacity: 0.4, depthWrite: false });
  const futureMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
  const tickMat = new THREE.LineBasicMaterial({ color: PALETTE.textDim, transparent: true, opacity: 0.8, depthWrite: false });
  const past = new THREE.Line(new THREE.BufferGeometry(), pastMat);
  const future = new THREE.Line(new THREE.BufferGeometry(), futureMat);
  const ticks = new THREE.LineSegments(new THREE.BufferGeometry(), tickMat);
  for (const o of [past, future, ticks]) { o.frustumCulled = false; o.renderOrder = 2; group.add(o); }

  let record = null;
  let forced = false;
  let builtAt = NaN;
  let builtUnit = NaN;
  let labels = [];            // [{minutes, local: Vector3}] every third future tick, for the DOM labels
  let lastBuild = { points: 0, ticks: 0, ms: 0 };
  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const _n = new THREE.Vector3();
  const _t = new THREE.Vector3();
  const _c = new THREE.Color();

  function set(next, opts = {}) {
    record = next || null;
    forced = !!opts.forced;
    builtAt = NaN;
    if (!record) clear();
  }

  function clear() {
    group.visible = false;
    labels = [];
  }

  function build(t0) {
    const started = typeof performance !== 'undefined' ? performance.now() : 0;
    const pts = trackPoints(record, t0);
    const pastPos = [];
    const futPos = [];
    const futCol = [];
    for (const s of pts) {
      toLocal(groundAt(s.latDeg, s.lonDeg, LIFT_KM), _a);
      if (s.tMs <= t0) pastPos.push(_a.x, _a.y, _a.z);
      if (s.tMs >= t0) {
        futPos.push(_a.x, _a.y, _a.z);
        fadeColour((s.tMs - t0) / (AHEAD_MIN * 60e3), _c);
        futCol.push(_c.r, _c.g, _c.b);
      }
    }
    setGeom(past, pastPos);
    past.computeLineDistances();
    setGeom(future, futPos, futCol);
    // A tick across the track at each five minutes: along east-west x north-south, on the ground.
    const tickPos = [];
    labels = [];
    for (const tk of tickTimes(t0)) {
      const s = subPoint(record, tk.tMs);
      const s2 = subPoint(record, tk.tMs + 10e3);
      if (!s || !s2) continue;
      toLocal(groundAt(s.latDeg, s.lonDeg, LIFT_KM), _a);
      toLocal(groundAt(s2.latDeg, s2.lonDeg, LIFT_KM), _b);
      _t.copy(_b).sub(_a).normalize();          // along the track
      _n.copy(_a).normalize().cross(_t).normalize(); // across it, on the ground
      const h = TICK_HALF_KM / stage.unitKm;
      tickPos.push(_a.x - _n.x * h, _a.y - _n.y * h, _a.z - _n.z * h, _a.x + _n.x * h, _a.y + _n.y * h, _a.z + _n.z * h);
      if (tk.minutes > 0 && (tk.minutes / TICK_MIN) % LABEL_EVERY === 0) labels.push({ minutes: tk.minutes, local: _a.clone() });
    }
    setGeom(ticks, tickPos);
    builtAt = t0;
    builtUnit = stage.unitKm;
    lastBuild = { points: pts.length, ticks: tickPos.length / 6, ms: (typeof performance !== 'undefined' ? performance.now() : 0) - started };
  }

  function setGeom(obj, pos, col) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (col) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    obj.geometry.dispose();
    obj.geometry = g;
  }

  /** Every frame: turn with the Earth; rebuild on a 10 s clock step, a scrub, or a new stage. */
  function update(tMs) {
    const on = !!record && stage.worldId === 'earth' && !!(ctx && ctx.cameraRig && ctx.cameraRig.state && (ctx.cameraRig.state.following || ctx.cameraRig.state.riding));
    if (!on) { if (group.visible) group.visible = false; return; }
    if (!Number.isFinite(builtAt) || builtUnit !== stage.unitKm || tMs < builtAt || tMs - builtAt >= REBUILD_MS) {
      if (!wantsTrack(record, tMs, forced)) { group.visible = false; builtAt = tMs; return; }
      build(tMs);
    }
    // The ground under the track turns with the Earth: GMST now, about the scene's Y (earth.js).
    group.rotation.y = gmst(new Date(tMs));
    const c = ctx && ctx.worlds && ctx.worlds.drawnPositionOf ? ctx.worlds.drawnPositionOf('earth', _b) : null;
    if (c) group.position.copy(c); else group.position.set(0, 0, 0);
    group.visible = labels.length > 0 || past.geometry.attributes.position.count > 0;
  }

  /** The labelled ticks in scene coordinates now, for ui/hud.js or a probe: [{minutes, pos}]. */
  function labelPoints() {
    if (!group.visible) return [];
    group.updateMatrixWorld();
    return labels.map((l) => ({ minutes: l.minutes, pos: l.local.clone().applyMatrix4(group.matrixWorld) }));
  }

  function dispose() {
    for (const o of [past, future, ticks]) o.geometry.dispose();
    pastMat.dispose(); futureMat.dispose(); tickMat.dispose();
    if (scene) scene.remove(group);
  }

  return {
    set,
    update,
    clear,
    dispose,
    labelPoints,
    /** For a probe: what is drawn, and what the last rebuild cost. */
    state: () => ({ id: record ? record.id : null, visible: group.visible, builtAt, forced, ...lastBuild, labels: labels.map((l) => l.minutes) }),
    group,
  };
}

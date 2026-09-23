// scene/systems.js -- a star and its planets at the system's own scale (spec 0040, 2026-09-23).
//
// Contract: createSystems(scene, ctx) -> { enter(stageId), leave(), update(tMs, camera), active,
//   records(), drawnPositionOf(id, out), pickAll(ndcX, ndcY, camera, viewport, limit),
//   subjectFor(record), stageOfRecord(record), framingDistanceUnits(stageId), lightScene(out),
//   setScaleRing(on), stats(), dispose() }
// and the pure parts, exported for tests/test_systems.mjs: planetPosition(), systemBasis(),
// hostPositionKm(), illustrativePhase(), keplerMismatch(), floorRadiusUnits(), systemOfRecordId().
//
// WHY A STAGE OF ITS OWN. The map places 6 332 planets around other stars AT their stars (spec 0028
// step 4): 1 au at 10 parsecs is a tenth of an arcsecond, so on the stellar rung a planet and its star
// are one point and the card says so. A tour of a system needs the one thing the ladder cannot give:
// the star and its planets drawn at the system's own scale. One unit is 100 000 km here
// (scene/stage.js), the origin is the host star, and nothing of the Solar System is drawn.
//
// THE PLANETS ARE THE EXOPLANET LAYER'S OWN RECORDS. This file draws the same `exo-...` ids the layer
// already holds, at the place their orbit puts them; main.js hides that layer's glyphs on a system
// stage, and picking, labels, the trip and the card all ask drawnPositionOf() here. One planet, one
// card.
//
// WHAT IS MEASURED AND WHAT IS NOT, which the card prints (COPY.trip.systemLine):
//   - sizes: the star's radius and each planet's, true, with the one-pixel floor #214 set for moons
//     (MOON_VIEW.MIN_ANGULAR_RADIUS_RAD, measured from the camera) so a planet 0.3 px across in the
//     whole-system shot is a dot rather than nothing;
//   - orbits: circles of the Archive's semi-major axis, run at its period (the seven TRAPPIST-1
//     eccentricities are 0.005 to 0.010, a hundredth of a radius, below a pixel in every shot here);
//   - the place on the orbit: REAL when the row has a transit time. A transit is the planet crossing
//     the line from its star to us, so at that instant it is on the star-Earth line on the near side,
//     and it goes round from there at its period. Without one, illustrativePhase() hashes the id so
//     the picture is stable and never claims to be a measurement;
//   - the orbit's orientation: NOT KNOWN beyond this. A transiting planet's orbit is seen edge-on,
//     so the plane is drawn containing our line of sight, as a transit requires; how far it is
//     turned about that line (its position angle on the sky) nobody has measured, and it is drawn
//     level with the ecliptic. The card says the tilt is illustrative;
//   - colours: the star's from its temperature (starfield.js kelvinToRgb, the path the stars use),
//     the planets' one neutral tint. Nothing is known of their surfaces.
//
// COST. Nothing at boot but the origin registration below. Geometry is built when a system stage is
// entered and disposed when it is left: one star sphere, one corona sprite, seven planet spheres and
// seven rings, 8 928 triangles for TRAPPIST-1 (stats(), under spec 0040's 10 000).

import * as THREE from '../../vendor/three.module.min.js';
import { stage, STAGES, setSystemOrigin, SUN_INERTIAL } from './stage.js';
import { celMaterial, coronaSprite, MOON_VIEW } from './worlds.js';
import { kelvinToRgb } from './starfield.js';
import { skyToSunInertialKm } from '../data/parsers.js';
import { SYSTEMS } from '../data/systems.js';
import { COPY } from '../copy/en.js';

export const AU_KM = 149597870.7; // IAU 2012 B2, exactly
// The IAU 2015 B3 nominal solar radius, and the Earth's mean radius: the Archive gives radii in
// these units ("Earth radius", "Solar radius") without saying which Earth radius; the mean and the
// equatorial differ by 0.1 %, a thousandth of a planet already drawn one pixel wide.
export const SUN_RADIUS_KM = 695700;
export const EARTH_RADIUS_KM = 6371.0;
const DAY_MS = 86400000;
const JD_UNIX_EPOCH = 2440587.5;
// Mercury's semi-major axis, 57.909 million km (NASA planetary fact sheet,
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/, read 2026-09-23): 0.387 au. The last stop of the
// trip draws a dashed ring this size around the star, labelled as Mercury's orbit, for scale.
export const MERCURY_A_AU = 57.909e6 / AU_KM;

/** The floor, from the camera: a ball is never drawn under one pixel of radius (#214's rule). */
export const SYSTEM_VIEW = { MIN_ANGULAR_RADIUS_RAD: MOON_VIEW.MIN_ANGULAR_RADIUS_RAD };

// Geometry, chosen against the 10 000-triangle budget: 48 x 24 for the star (it can fill the
// screen), 32 x 16 for a planet (it is framed at eight radii at the closest, a quarter of the screen).
const STAR_SEGMENTS = [48, 24];
const PLANET_SEGMENTS = [32, 16];
const RING_SEGMENTS = 256;
const RING_OPACITY = 0.18;
const PLANET_TINT = 0xb9b2a6; // a neutral warm grey: nothing is known of these surfaces
const PICK_PX = 24;

// --- the pure parts ------------------------------------------------------------------------------

const BY_ID = new Map(SYSTEMS.map((s) => [s.id, s]));
const BY_STAGE = new Map(SYSTEMS.map((s) => [s.stage, s]));
const MEMBER = new Map();
for (const s of SYSTEMS) {
  MEMBER.set(s.hostId, { system: s, planet: null });
  for (const p of s.planets) MEMBER.set(p.id, { system: s, planet: p });
}

/** {system, planet} for a record id that belongs to a system (planet null for the host), else null. */
export function systemOfRecordId(id) {
  return MEMBER.get(id) || null;
}

export function systemForStage(stageId) {
  return BY_STAGE.get(stageId) || null;
}

export function systemById(id) {
  return BY_ID.get(id) || null;
}

/** The host star's heliocentric position, km, sun-inertial: the planets' own row of the table. */
export function hostPositionKm(system) {
  const h = system.hostSky;
  return skyToSunInertialKm(h.raDeg, h.decDeg, h.distPc);
}

/**
 * The orbit plane, as two unit vectors in sun-inertial: `u` from the star toward us (a transit is the
 * planet on this line), `v` level with the ecliptic and square to it, and `n = u x v` the plane's
 * normal. The Earth's 1 au from the Sun is 4e-7 rad at TRAPPIST-1's 12.4 pc; the Sun stands for it.
 */
export function systemBasis(hostKm) {
  const r = Math.hypot(hostKm.x, hostKm.y, hostKm.z);
  const u = { x: -hostKm.x / r, y: -hostKm.y / r, z: -hostKm.z / r };
  // v = z_ecliptic x u, normalised: horizontal, so the plane is as level as the line of sight lets it be.
  let vx = -u.y, vy = u.x;
  const vl = Math.hypot(vx, vy);
  if (vl < 1e-9) { vx = 1; vy = 0; } else { vx /= vl; vy /= vl; }
  const v = { x: vx, y: vy, z: 0 };
  const n = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
  return { u, v, n };
}

/** A stable angle in [0, 2 pi) from an id: the illustrative phase of a planet with no transit time. */
export function illustrativePhase(id) {
  let h = 2166136261;
  const s = String(id);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) / 4294967296) * 2 * Math.PI;
}

/** Is this planet's place on its orbit a measurement (a transit time) or an illustration? */
export function phaseIsMeasured(planet) {
  return Number.isFinite(planet && planet.transitMidJd);
}

/**
 * Where a planet is at `tMs`, km from its star, sun-inertial axes, on a circle of `aAu` in the plane
 * systemBasis() gives. At the transit instant it is on +u: between the star and us.
 * @returns {{x:number, y:number, z:number}}
 */
export function planetPosition(planet, tMs, basis, out = { x: 0, y: 0, z: 0 }) {
  const P = planet.periodDays * DAY_MS;
  const measured = phaseIsMeasured(planet);
  const t0 = measured ? (planet.transitMidJd - JD_UNIX_EPOCH) * DAY_MS : 0;
  const phase0 = measured ? 0 : illustrativePhase(planet.id);
  // The fraction of a lap, reduced before it becomes an angle: ten years of TRAPPIST-1 b is 2 400
  // laps, and an angle that large keeps fewer good digits than the fraction does.
  let f = (tMs - t0) / P;
  f -= Math.floor(f);
  const th = phase0 + 2 * Math.PI * f;
  const a = planet.aAu * AU_KM;
  const c = Math.cos(th) * a, s = Math.sin(th) * a;
  const { u, v } = basis;
  out.x = c * u.x + s * v.x;
  out.y = c * u.y + s * v.y;
  out.z = c * u.z + s * v.z;
  return out;
}

/** Kepler's third law: a^3 / P^2 (au, years) against the star's mass, as a signed fraction. */
export function keplerMismatch(planet, massSuns) {
  const pYr = planet.periodDays / 365.25;
  return (planet.aAu ** 3 / (pYr * pYr)) / massSuns - 1;
}

/** A radius in units, never under the one-pixel floor from a camera `viewUnits` away. */
export function floorRadiusUnits(trueUnits, viewUnits) {
  return Math.max(trueUnits, viewUnits * SYSTEM_VIEW.MIN_ANGULAR_RADIUS_RAD);
}

/** How far out a camera must sit, in units, to hold a circle of `radiusUnits` seen at co-latitude `polar`. */
export function fitDistanceUnits(radiusUnits, fovDeg, aspect, polar = 0, fill = 0.85) {
  const halfV = Math.tan((fovDeg * Math.PI) / 360);
  const halfH = halfV * aspect;
  // Seen from `polar` off the orbit's axis, the circle is an ellipse cos(polar) as tall as it is wide,
  // and its near edge is r sin(polar) closer to the camera than the star, so it is drawn larger:
  // measured 2026-09-23 at 1280 x 800, the outer ring ran off the bottom of the frame until the
  // near edge was counted (the far edge only makes it smaller).
  const nearer = radiusUnits * Math.sin(polar);
  const needH = radiusUnits / (fill * halfH) + nearer;
  const needV = (radiusUnits * Math.max(Math.cos(polar), 0.2)) / (fill * halfV) + nearer;
  return Math.max(needH, needV);
}

// Every system's origin, registered once at import: a star forty light-years away does not move at
// any clock rate this app runs (scene/stage.js setSystemOrigin says why this is not per tick).
for (const s of SYSTEMS) setSystemOrigin(s.stage, hostPositionKm(s));

// --- the drawing ---------------------------------------------------------------------------------

function cssColour(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

function ringGeometry(radiusUnits, basisScene) {
  const pts = new Float32Array(RING_SEGMENTS * 3);
  const { u, v } = basisScene;
  for (let i = 0; i < RING_SEGMENTS; i++) {
    const th = (i / RING_SEGMENTS) * 2 * Math.PI;
    const c = Math.cos(th) * radiusUnits, s = Math.sin(th) * radiusUnits;
    pts[i * 3] = c * u.x + s * v.x;
    pts[i * 3 + 1] = c * u.y + s * v.y;
    pts[i * 3 + 2] = c * u.z + s * v.z;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  return g;
}

function textSprite(text, colour) {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const canvas = document.createElement('canvas');
  const px = 28;
  const c2 = canvas.getContext('2d');
  if (!c2) return null;
  c2.font = `${px}px system-ui, -apple-system, sans-serif`;
  const w = Math.ceil(c2.measureText(text).width) + 16;
  canvas.width = w; canvas.height = px + 16;
  const c = canvas.getContext('2d');
  c.font = `${px}px system-ui, -apple-system, sans-serif`;
  c.fillStyle = colour;
  c.textBaseline = 'middle';
  c.fillText(text, 8, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, sizeAttenuation: false }));
  // sizeAttenuation off: the scale is a fraction of the view's height, whatever the distance, set
  // per frame (update) so a phone held upright, twice as tall as it is wide, does not print it twice
  // as large. Centred over its point on the ring: measured 2026-09-23 at 390 x 844, a label hung to
  // the right of the ring's far point ran off the screen at "for s".
  sprite.userData.aspect = canvas.width / canvas.height;
  sprite.center.set(0.5, 0);
  return sprite;
}

export function createSystems(scene, ctx = {}) {
  const group = new THREE.Group();
  group.name = 'systems';
  group.visible = false;
  scene.add(group);

  let current = null; // { system, basis, basisScene, starMesh, planets: [{planet, mesh}], rings, mercury }
  let layerOn = true;
  let scaleRingOn = false;
  const _v = new THREE.Vector3();
  const _p = new THREE.Vector3();
  const _km = { x: 0, y: 0, z: 0 };
  const _off = { x: 0, y: 0, z: 0 };

  function sceneDir(d) {
    // sun-inertial axes -> scene axes, the stage's remap (x, z, -y). A direction has no origin.
    return { x: d.x, y: d.z, z: -d.y };
  }

  function build(system) {
    const hostKm = hostPositionKm(system);
    const basis = systemBasis(hostKm);
    const basisScene = { u: sceneDir(basis.u), v: sceneDir(basis.v) };
    const unit = stage.unitKm;
    const rgb = kelvinToRgb(system.star.teffK);
    const starColour = new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);

    const starMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, STAR_SEGMENTS[0], STAR_SEGMENTS[1]),
      new THREE.MeshBasicMaterial({ color: starColour, toneMapped: false }),
    );
    starMesh.name = `systems:${system.hostId}`;
    starMesh.userData.recordId = system.hostId;
    starMesh.userData.trueRadiusUnits = (system.star.radiusSuns * SUN_RADIUS_KM) / unit;
    const halo = coronaSprite();
    if (halo) { halo.material.color = starColour.clone(); starMesh.add(halo); }
    group.add(starMesh);

    const ringColour = new THREE.Color(cssColour('--sr-text-dim', '#9aa4b2'));
    const rings = [];
    const planets = [];
    for (const planet of system.planets) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, PLANET_SEGMENTS[0], PLANET_SEGMENTS[1]), celMaterial(null, PLANET_TINT));
      mesh.name = `systems:${planet.id}`;
      mesh.userData.recordId = planet.id;
      mesh.userData.trueRadiusUnits = (planet.radiusEarths * EARTH_RADIUS_KM) / unit;
      group.add(mesh);
      planets.push({ planet, mesh });
      const ring = new THREE.LineLoop(
        ringGeometry((planet.aAu * AU_KM) / unit, basisScene),
        new THREE.LineBasicMaterial({ color: ringColour, transparent: true, opacity: RING_OPACITY, depthWrite: false }),
      );
      ring.name = `systems:ring:${planet.id}`;
      group.add(ring);
      rings.push(ring);
    }

    // Mercury's orbit, for scale: dashed, so it reads as a different kind of line from the real ones.
    const mercuryGeom = ringGeometry((MERCURY_A_AU * AU_KM) / unit, basisScene);
    const mercury = new THREE.LineLoop(
      mercuryGeom,
      new THREE.LineDashedMaterial({ color: ringColour, transparent: true, opacity: 0.55, dashSize: 6, gapSize: 5, depthWrite: false }),
    );
    mercury.computeLineDistances();
    mercury.name = 'systems:mercury-ring';
    mercury.visible = false;
    const label = textSprite(COPY.systems.mercuryRing, cssColour('--sr-text-dim', '#9aa4b2'));
    if (label) {
      label.name = 'systems:mercury-label';
      const r = (MERCURY_A_AU * AU_KM) / unit;
      // On the ring, on the side away from us, so it does not sit on the planets.
      label.position.set(-basisScene.u.x * r, -basisScene.u.y * r, -basisScene.u.z * r);
      mercury.add(label);
    }
    group.add(mercury);

    return { system, hostKm, basis, basisScene, starMesh, planets, rings, mercury };
  }

  function disposeCurrent() {
    if (!current) return;
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
    group.clear();
    current = null;
  }

  function enter(stageId) {
    const system = systemForStage(stageId);
    if (!system) { leave(); return false; }
    if (current && current.system === system) return true;
    disposeCurrent();
    current = build(system);
    applyVisibility();
    return true;
  }

  function leave() {
    disposeCurrent();
    group.visible = false;
  }

  function isActive() {
    return !!current && stage.worldId === current.system.stage;
  }

  function applyVisibility() {
    group.visible = isActive() && layerOn;
    if (current) current.mercury.visible = scaleRingOn;
  }

  function setVisible(on) { layerOn = on !== false; applyVisibility(); }
  function setScaleRing(on) { scaleRingOn = !!on; applyVisibility(); }

  /** Scene position of a member of the active system, or null. */
  function drawnPositionOf(id, out = new THREE.Vector3()) {
    if (!isActive()) return null;
    if (id === current.system.hostId) return stage.toSceneInto(current.hostKm, SUN_INERTIAL, out);
    const hit = current.planets.find((x) => x.planet.id === id);
    if (!hit) return null;
    planetPosition(hit.planet, stage.tMs, current.basis, _off);
    _km.x = current.hostKm.x + _off.x; _km.y = current.hostKm.y + _off.y; _km.z = current.hostKm.z + _off.z;
    return stage.toSceneInto(_km, SUN_INERTIAL, out);
  }

  // MERCURY'S RING IS A STOP'S, NOT THE STAGE'S (spec 0040 req 7, stop 11). A trip stop may say
  // `mercury_ring: true` (registry/tours.yaml; check_registry.py allows it only on a system stage),
  // and the ring is drawn while that stop is up and never otherwise. Read from the trip's own state,
  // by stop id, so ui/trip.js carries no knowledge of it.
  let tripWatched = false;
  function watchTrip() {
    if (tripWatched || !ctx.trip || typeof ctx.trip.onChange !== 'function') return;
    tripWatched = true;
    const phases = new Set(['veil', 'flight', 'settle', 'dwell', 'held', 'paused']);
    ctx.trip.onChange((st) => {
      let on = false;
      if (st && st.tourId && st.stopId && phases.has(st.phase)) {
        const tours = typeof ctx.trip.tours === 'function' ? ctx.trip.tours() : [];
        const tour = tours.find((x) => x.id === st.tourId);
        const stop = tour && tour.stops.find((x) => x.id === st.stopId);
        on = !!(stop && stop.mercury_ring);
      }
      setScaleRing(on);
    });
  }

  function update(tMs, camera) {
    watchTrip();
    applyVisibility();
    if (!group.visible || !current) return;
    const cam = camera || ctx.camera;
    const star = current.starMesh;
    drawnPositionOf(current.system.hostId, _p);
    star.position.copy(_p);
    const camStar = cam ? cam.position.distanceTo(_p) : 0;
    star.scale.setScalar(floorRadiusUnits(star.userData.trueRadiusUnits, camStar));
    for (const ring of current.rings) ring.position.copy(_p);
    current.mercury.position.copy(_p);
    const label = current.mercury.getObjectByName('systems:mercury-label');
    if (label && cam && current.mercury.visible) {
      const h = 0.03 * Math.min(1, (cam.aspect || 1) * 1.5);
      label.scale.set(h * label.userData.aspect, h, 1);
      // On the far side of the ring from the camera, which is its top edge on the screen: a fixed
      // point on the ring sat under the desktop card or off a phone's edge as the camera turned.
      const { u, v } = current.basisScene;
      _v.copy(cam.position).sub(_p);
      const a = _v.x * u.x + _v.y * u.y + _v.z * u.z;
      const b = _v.x * v.x + _v.y * v.y + _v.z * v.z;
      const l = Math.hypot(a, b) || 1;
      const r = (MERCURY_A_AU * AU_KM) / stage.unitKm;
      label.position.set(-(a * u.x + b * v.x) / l * r, -(a * u.y + b * v.y) / l * r, -(a * u.z + b * v.z) / l * r);
    }
    for (const { planet, mesh } of current.planets) {
      if (!drawnPositionOf(planet.id, _v)) { mesh.visible = false; continue; }
      mesh.visible = true;
      mesh.position.copy(_v);
      const view = cam ? cam.position.distanceTo(_v) : 0;
      mesh.scale.setScalar(floorRadiusUnits(mesh.userData.trueRadiusUnits, view));
      // Lit by its own star: the direction from the planet to the star, in scene axes.
      const u = mesh.material.uniforms && mesh.material.uniforms.uSunDir;
      if (u) u.value.copy(_p).sub(_v).normalize();
    }
  }

  function memberRecords() {
    if (!current) return [];
    const byId = typeof ctx.recordById === 'function' ? ctx.recordById : () => null;
    const out = [];
    const host = byId(current.system.hostId);
    if (host) out.push(host);
    for (const { planet } of current.planets) {
      const r = byId(planet.id);
      if (r) out.push(r);
    }
    return out;
  }

  /** The members drawn right now, as records: the host and its planets, when the stage is theirs. */
  function records() {
    return isActive() && group.visible ? memberRecords() : [];
  }

  const _m = new THREE.Matrix4();
  function pickAll(ndcX, ndcY, camera, viewport, limit = 6) {
    if (!isActive() || !group.visible || !camera || !viewport) return [];
    camera.updateMatrixWorld();
    _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const out = [];
    const halfW = viewport.w * 0.5, halfH = viewport.h * 0.5;
    const pxPerRad = viewport.h / ((camera.fov * Math.PI) / 180);
    for (const rec of memberRecords()) {
      const p = drawnPositionOf(rec.id, _v);
      if (!p) continue;
      const dist = camera.position.distanceTo(p);
      const mesh = rec.id === current.system.hostId ? current.starMesh : (current.planets.find((x) => x.planet.id === rec.id) || {}).mesh;
      const radiusPx = mesh ? (mesh.scale.x / Math.max(dist, 1e-9)) * pxPerRad : 0;
      p.applyMatrix4(_m);
      if (p.z > 1 || p.z < -1) continue;
      const px = Math.hypot((p.x - ndcX) * halfW, (p.y - ndcY) * halfH);
      if (px > Math.max(PICK_PX, radiusPx + 8)) continue;
      out.push({ record: rec, px: Math.max(0, px - radiusPx), score: Math.max(0, px - radiusPx) });
    }
    out.sort((a, b) => a.px - b.px);
    return out.slice(0, Math.max(1, limit));
  }

  /** The system stage a record is drawn on, or null: a planet with a system row, or its host. */
  function stageOfRecord(record) {
    const m = record && systemOfRecordId(record.id);
    return m ? m.system.stage : null;
  }

  /** How far out a camera sits to hold every orbit of the system, on this screen. */
  function framingDistanceUnits(stageId, opts = {}) {
    const system = systemForStage(stageId);
    if (!system) return 5;
    const unitKm = STAGES[stageId].unitKm;
    const outer = Math.max(...system.planets.map((p) => p.aAu)) * AU_KM;
    const radiusKm = opts.mercury ? Math.max(outer, MERCURY_A_AU * AU_KM) : outer;
    const cam = ctx.camera;
    const fov = cam && cam.fov ? cam.fov : 45;
    const aspect = cam && cam.aspect ? cam.aspect : 1.6;
    return fitDistanceUnits(radiusKm / unitKm, fov, aspect, opts.polar ?? OVERVIEW_POLAR);
  }

  /**
   * A trip's subject for a member (ui/trip.js). Its position is the drawn one; its radius is true
   * (frame_radii frames the planet itself); its `ground` is the star, which the camera may not enter;
   * `fitKm(stop)` is the least distance at which the whole system, or Mercury's ring on the stop
   * that draws it, fits this screen; `polar` looks down on the orbits for the star's own stops.
   */
  function subjectFor(record) {
    const m = record && systemOfRecordId(record.id);
    if (!m) return null;
    const { system, planet } = m;
    const starRadiusKm = system.star.radiusSuns * SUN_RADIUS_KM;
    return {
      kind: 'record',
      id: record.id,
      name: record.name || record.id,
      record,
      layerId: record.layer,
      worldId: null,
      systemStage: system.stage,
      radiusKm: planet ? planet.radiusEarths * EARTH_RADIUS_KM : starRadiusKm,
      position(tMs) {
        if (stage.worldId !== system.stage) return null;
        const out = drawnPositionOf(record.id, new THREE.Vector3());
        return out || null;
      },
      ground: {
        radiusKm: starRadiusKm,
        centre: () => (stage.worldId === system.stage ? stage.toScene(hostPositionKm(system), SUN_INERTIAL) : null),
      },
      // The host's stops are overviews: from 40 degrees off the orbits' axis the rings read as rings.
      polar: planet ? null : OVERVIEW_POLAR,
      fitKm(stop) {
        if (planet) return 0;
        return framingDistanceUnits(system.stage, { mercury: !!(stop && stop.mercury_ring) }) * STAGES[system.stage].unitKm;
      },
    };
  }

  /** The active system's star radius in units (the ground the camera rig keeps out of), or 0. */
  function starRadiusUnits() {
    return current ? current.starMesh.userData.trueRadiusUnits : 0;
  }

  /**
   * Where a plain selection parks the camera (main.js arrivalDistance): eight radii from a planet,
   * the trip's own framing, and far enough from the host to hold every orbit.
   */
  function arrivalDistanceUnits(record) {
    const m = record && systemOfRecordId(record.id);
    if (!m) return 5;
    if (!m.planet) return framingDistanceUnits(m.system.stage);
    return ((m.planet.radiusEarths * EARTH_RADIUS_KM) / STAGES[m.system.stage].unitKm) * 8;
  }

  /** The light on a system stage: the host star's scene position. Null elsewhere. */
  function lightScene(out = new THREE.Vector3()) {
    if (!isActive()) return null;
    return drawnPositionOf(current.system.hostId, out);
  }

  function stats() {
    let triangles = 0;
    let meshes = 0;
    group.traverse((o) => {
      if (o.isMesh && o.geometry) {
        meshes += 1;
        const g = o.geometry;
        triangles += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
      }
    });
    return { active: isActive(), system: current ? current.system.id : null, meshes, triangles, rings: current ? current.rings.length : 0, scaleRing: scaleRingOn };
  }

  function dispose() {
    leave();
    scene.remove(group);
  }

  return {
    enter,
    leave,
    update,
    get active() { return isActive(); },
    setVisible,
    setScaleRing,
    records,
    drawnPositionOf,
    pickAll,
    subjectFor,
    stageOfRecord,
    framingDistanceUnits,
    arrivalDistanceUnits,
    starRadiusUnits,
    lightScene,
    stats,
    dispose,
    group,
  };
}

// The camera's co-latitude over the orbits for the whole-system shots: the same 40 degrees
// ui/trip.js looks down on the Sun's planets from (SUN_OVERVIEW_POLAR).
export const OVERVIEW_POLAR = (40 * Math.PI) / 180;

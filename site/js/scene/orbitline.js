// scene/orbitline.js -- one lap of the selection's orbit, drawn from the same elements (spec 0026 req 13).
//
// Contract: createOrbitLine(scene, ctx) -> { setRecord(record), update(tMs), dispose() }
// Pure and exported for the test: sampleOrbit(positionAt, t0Ms, periodMs, n) -> Float64Array xyz
//
// Every study converged on it: a dot means nothing until you see the path it is on. The line is
// the record's own propagator run round one period from now -- SGP4 for a satellite, Kepler for an
// asteroid or comet, the ephemeris for a world -- so it is INFERRED from the same elements the dot
// is, no more and no less true, and the card says so. It is rebuilt when the selection changes, when
// the stage changes (scene units change under it), and every thirty seconds of clock time (an SGP4
// orbit precesses; a static line would slowly part from its dot). 240 samples: smooth at any zoom
// the app allows, and cheaper than one glyph tick.
//
// Things that do not lap -- a launch on its way up, a fixed site, a star -- get no line.

import * as THREE from '../../vendor/three.module.min.js';
import { propagate } from '../propagate/index.js';
import { stage } from './stage.js';
import { CLASS_COLOURS } from './glyphatlas.js';

export const SAMPLES = 240;
const REBUILD_MS = 30e3;
const DAY = 86400e3;
const PERIODIC = new Set(['sgp4', 'kepler', 'body']);

/** How long one lap takes, in ms, or null when the record does not lap. */
export function periodMsOf(record) {
  if (!record || !PERIODIC.has(record.propagator)) return null;
  const m = record.meta || {};
  if (Number.isFinite(m.periodMin) && m.periodMin > 0) return m.periodMin * 60e3;
  if (record.satrec && Number.isFinite(record.satrec.no) && record.satrec.no > 0) return (2 * Math.PI / record.satrec.no) * 60e3; // no is rad/min
  if (Number.isFinite(m.periodDays) && m.periodDays > 0) return m.periodDays * DAY;
  if (Number.isFinite(m.periodYears) && m.periodYears > 0) return m.periodYears * 365.25 * DAY;
  if (record.propagator === 'kepler') {
    const el = record.elements || record.kepler || m.elements || null;
    const a = el && Number.isFinite(el.aAu) ? el.aAu : el && Number.isFinite(el.a) ? el.a : null;
    if (a && a > 0) return Math.sqrt(a * a * a) * 365.25 * DAY; // Kepler's third law, au and years
  }
  return null;
}

/**
 * Sample one lap. `positionAt(tMs)` returns {x,y,z} (any frame, any unit) or null; a null sample is
 * skipped and the line simply has fewer points. Returns a flat array of the samples that worked,
 * the first repeated at the end so the loop closes.
 */
export function sampleOrbit(positionAt, t0Ms, periodMs, n = SAMPLES) {
  const out = [];
  let first = null;
  for (let k = 0; k < n; k++) {
    const p = positionAt(t0Ms + (periodMs * k) / n);
    if (!p || !Number.isFinite(p.x)) continue;
    if (!first) first = [p.x, p.y, p.z];
    out.push(p.x, p.y, p.z);
  }
  if (first && out.length >= 6) out.push(first[0], first[1], first[2]);
  return Float64Array.from(out);
}

export function createOrbitLine(scene, ctx) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array((SAMPLES + 1) * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthTest: true, depthWrite: false });
  const line = new THREE.Line(geometry, material);
  line.name = 'orbit-line';
  line.frustumCulled = false;
  line.visible = false;
  line.renderOrder = 1;
  if (scene) scene.add(line);

  let record = null;
  let builtAt = NaN;
  let builtStage = null;
  const _v = new THREE.Vector3();

  function positionScene(tMs) {
    const p = propagate(record, tMs);
    if (!p) return null;
    return stage.toSceneInto(p, p.frame || record.frame, _v, tMs) ? { x: _v.x, y: _v.y, z: _v.z } : null;
  }

  function rebuild(tMs) {
    const periodMs = periodMsOf(record);
    if (!periodMs) { line.visible = false; return; }
    // Long orbits (a comet's century) are drawn as the coming year, not the whole loop.
    const span = Math.min(periodMs, 365.25 * DAY);
    const pts = sampleOrbit((t) => positionScene(t), tMs, span, SAMPLES);
    const n = pts.length / 3;
    if (n < 4) { line.visible = false; return; }
    for (let i = 0; i < n * 3; i++) positions[i] = pts[i];
    geometry.attributes.position.needsUpdate = true;
    geometry.setDrawRange(0, n);
    geometry.computeBoundingSphere();
    material.color.set(CLASS_COLOURS[record.klass] || '#E8ECF2');
    line.visible = true;
    builtAt = tMs;
    builtStage = stage.worldId;
  }

  function setRecord(next) {
    record = next && PERIODIC.has(next.propagator) ? next : null;
    builtAt = NaN;
    if (!record) line.visible = false;
  }

  function update(tMs) {
    if (!record) return;
    if (!Number.isFinite(builtAt) || Math.abs(tMs - builtAt) > REBUILD_MS || builtStage !== stage.worldId) rebuild(tMs);
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    if (scene) scene.remove(line);
  }

  return { setRecord, update, dispose, line, hasLine: () => line.visible };
}

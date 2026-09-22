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
//
// THE WHOLE PATH, for a record that asks (`meta.wholePath`, the far-bodies layer, 2026-09-22). The
// coming year is a sliver of Eris's 560-year lap and a hair of Sedna's ~11 400, and a hyperbola
// has no lap at all, so those draw every point of the conic instead: the whole ellipse, or the
// passage in and out. Sampled evenly in the eccentric (hyperbolic) anomaly, not in time -- evenly in
// time, Sedna's 240 points would bunch at aphelion and leave perihelion a single corner. And the
// frame conversion uses the CURRENT time for every sample: the line is the path in space, drawn
// round today's origin, not where the dot would be drawn in AD 8000 from an Earth that has moved.

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
 * 'orbit' or 'passage' for a record that asks to be drawn whole, else null. Exported for the card,
 * which says which of the two the line is.
 */
export function wholePathKind(record) {
  if (!record || record.propagator !== 'kepler' || !(record.meta && record.meta.wholePath)) return null;
  const e = record.elements ? Number(record.elements.e) : NaN;
  if (!(e >= 0) || Math.abs(e - 1) < 1e-6) return null; // a parabola has neither
  return e < 1 ? 'orbit' : 'passage';
}

/** The span of a passage, in hyperbolic anomaly, when the object is too near perihelion to set one. */
const PASSAGE_MIN_AU = 5;
/** How far past its present distance a passage is drawn, as a factor on the hyperbolic anomaly. */
const PASSAGE_AHEAD = 1.15;
const KM_PER_AU = 149597870.7;
const GM_SUN = 1.32712440018e11;

/**
 * The sample times of the whole path, in ms, or null when the record does not ask for one. Pure.
 *
 * Ellipse: one lap, n points evenly in the eccentric anomaly E, t = tp + (E - e sin E) / n.
 * Hyperbola: H from -Hmax to +Hmax, t = tp + (e sinh H - H) / n, where Hmax is where the object is
 * now, or five au out if that is further, and a little past it -- so the line comes in from as far
 * out as the object has since gone, through perihelion, and ends just ahead of the dot. A visitor
 * who winds the clock on sees the line grow with it.
 *
 * PLUS ONE: the present moment, in its place in the order, so the line passes THROUGH the dot.
 * Without it, measured in the browser on 2026-09-22, Eris's nearest vertex was 17 million km off
 * and the chord past it bowed half a million km from the true arc -- from the 175 000 km the
 * camera stands at, the line crossed the screen nowhere near Eris. n + 1 times come back.
 */
export function wholePathTimes(record, tMs, n = SAMPLES) {
  const kind = wholePathKind(record);
  if (!kind || !Number.isFinite(tMs)) return null;
  const el = record.elements;
  const e = Number(el.e);
  const q = Number.isFinite(el.qKm) ? el.qKm : Number.isFinite(el.aKm) ? el.aKm * (1 - e) : NaN;
  const mu = Number.isFinite(el.muKm3S2) ? el.muKm3S2 : GM_SUN;
  if (!(q > 0)) return null;
  const a = q / Math.abs(1 - e); // |a|, km
  const nRad = Math.sqrt(mu / (a * a * a)); // rad/s
  let tp = Number.isFinite(el.tpMs) ? el.tpMs : NaN;
  if (!Number.isFinite(tp) && Number.isFinite(el.maRad) && Number.isFinite(el.epochMs)) tp = el.epochMs - (el.maRad / nRad) * 1000;
  if (!Number.isFinite(tp)) return null;
  const out = new Float64Array(n);
  if (kind === 'orbit') {
    for (let k = 0; k < n; k++) {
      const E = -Math.PI + (2 * Math.PI * k) / n; // from aphelion, round through perihelion
      out[k] = tp + ((E - e * Math.sin(E)) / nRad) * 1000;
    }
    // Today, moved by whole laps into this one (two-body motion repeats exactly).
    const P = ((2 * Math.PI) / nRad) * 1000;
    let now = tMs - tp;
    now -= Math.round(now / P) * P; // into [-P/2, P/2], the lap sampled above
    return withTime(out, tp + now);
  }
  // Where it is now, as a hyperbolic anomaly: M = n (t - tp), solved by bisection on the monotone
  // e sinh H - H (propagate/kepler.js solves the same equation; this only needs the bound).
  const M = Math.abs((nRad * (tMs - tp)) / 1000);
  let lo = 0, hi = Math.max(1, Math.asinh(M / e) + 1);
  while (e * Math.sinh(hi) - hi < M && hi < 50) hi *= 2;
  for (let i = 0; i < 80; i++) {
    const mid = 0.5 * (lo + hi);
    if (e * Math.sinh(mid) - mid < M) lo = mid; else hi = mid;
  }
  const hNow = 0.5 * (lo + hi);
  const hMin = Math.acosh(((PASSAGE_MIN_AU * KM_PER_AU) / a + 1) / e);
  const hMax = Math.max(hNow, Number.isFinite(hMin) ? hMin : 0) * PASSAGE_AHEAD;
  for (let k = 0; k < n; k++) {
    const H = -hMax + (2 * hMax * k) / (n - 1);
    out[k] = tp + ((e * Math.sinh(H) - H) / nRad) * 1000;
  }
  return withTime(out, tMs);
}

/** `times` (ascending) with `t` inserted in order: n + 1 values. */
function withTime(times, t) {
  const out = new Float64Array(times.length + 1);
  let j = 0;
  let placed = false;
  for (let k = 0; k < times.length; k++) {
    if (!placed && t <= times[k]) { out[j++] = t; placed = true; }
    out[j++] = times[k];
  }
  if (!placed) out[j] = t;
  return out;
}

/**
 * Sample one lap. `positionAt(tMs)` returns {x,y,z} (any frame, any unit) or null; a null sample is
 * skipped and the line simply has fewer points. Returns a flat array of the samples that worked,
 * the first repeated at the end so the loop closes.
 */
export function sampleOrbit(positionAt, t0Ms, periodMs, n = SAMPLES) {
  const times = new Float64Array(n);
  for (let k = 0; k < n; k++) times[k] = t0Ms + (periodMs * k) / n;
  return sampleAt(positionAt, times, true);
}

/** The same, at given times; `close` repeats the first point at the end. Pure. */
export function sampleAt(positionAt, times, close) {
  const out = [];
  let first = null;
  for (let k = 0; k < times.length; k++) {
    const p = positionAt(times[k]);
    if (!p || !Number.isFinite(p.x)) continue;
    if (!first) first = [p.x, p.y, p.z];
    out.push(p.x, p.y, p.z);
  }
  if (close && first && out.length >= 6) out.push(first[0], first[1], first[2]);
  return Float64Array.from(out);
}

export function createOrbitLine(scene, ctx) {
  const geometry = new THREE.BufferGeometry();
  // SAMPLES, plus the present moment on a whole path, plus the point that closes a loop.
  const positions = new Float32Array((SAMPLES + 2) * 3);
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

  // `frameT` is the time the frame conversion is made at: the sample's own for a lap (where the
  // dot WILL be drawn), today's for a whole path (the path in space, round today's origin).
  function positionScene(tMs, frameT = tMs) {
    const p = propagate(record, tMs);
    if (!p) return null;
    return stage.toSceneInto(p, p.frame || record.frame, _v, frameT) ? { x: _v.x, y: _v.y, z: _v.z } : null;
  }

  function rebuild(tMs) {
    let pts;
    const whole = wholePathTimes(record, tMs, SAMPLES);
    if (whole) {
      pts = sampleAt((t) => positionScene(t, tMs), whole, wholePathKind(record) === 'orbit');
    } else {
      const periodMs = periodMsOf(record);
      if (!periodMs) { line.visible = false; return; }
      // Long orbits (a comet's century) are drawn as the coming year, not the whole loop.
      const span = Math.min(periodMs, 365.25 * DAY);
      pts = sampleOrbit((t) => positionScene(t), tMs, span, SAMPLES);
    }
    const n = pts.length / 3;
    if (n < 4) { line.visible = false; return; }
    // A LOCAL ORIGIN AT THE DOT. The vertices are float32, and at Eris -- 1.4e7 scene units from
    // an Earth stage -- float32 spacing is a whole unit, 1 000 km, half of Eris; close up, the line
    // stood visibly off its own dot. The object's position carries the big number in float64
    // instead (three.js builds modelViewMatrix in float64 on the CPU), and the vertices hold only
    // the offsets, which are small exactly where the camera is looking.
    const here = positionScene(tMs);
    const ox = here ? here.x : 0, oy = here ? here.y : 0, oz = here ? here.z : 0;
    line.position.set(ox, oy, oz);
    for (let i = 0; i < n * 3; i += 3) {
      positions[i] = pts[i] - ox;
      positions[i + 1] = pts[i + 1] - oy;
      positions[i + 2] = pts[i + 2] - oz;
    }
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

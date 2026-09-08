// ui/trajectory.js -- the card's chart: height, latitude and longitude over the next lap and a half
// (spec 0026 req 14; satellitetracker3d's first take). Pure SGP4 already run.
//
// Contract: trajectorySection(record, tMs) -> Element | null
// Pure and exported for the test:
//   sampleTrajectory(record, tMs, laps, n) -> [{tMs, altKm, latDeg, lonDeg}] (Earth-orbiting records only)
//   splitAtWrap(points) -> arrays of points, broken where the longitude jumps across the date line
//
// Two small panels in one inline SVG: height over time (the current moment marked), and the ground
// track on a flat map (longitude across, latitude up). No library: 120 samples and two polylines.
// Every word on it comes from copy/en.js; the numbers come from the record's own propagator through
// the same frame code the card's rows use.

import { COPY, t, fmt } from '../copy/en.js';
import { propagate } from '../propagate/index.js';
import { eciToEcef, ecefToGeodetic, gmst } from '../propagate/frames.js';

const DEG = 180 / Math.PI;
const W = 300, H_ALT = 70, H_MAP = 90, PAD = 22;
const SVG_NS = 'http://www.w3.org/2000/svg';

/** One lap in ms for an SGP4 record: its period in minutes, or the satrec's mean motion (rad/min). */
export function periodMsOfSgp4(record) {
  const m = (record && record.meta) || {};
  if (Number.isFinite(m.periodMin) && m.periodMin > 0) return m.periodMin * 60e3;
  if (record && record.satrec && Number.isFinite(record.satrec.no) && record.satrec.no > 0) return (2 * Math.PI / record.satrec.no) * 60e3;
  return null;
}

export function sampleTrajectory(record, tMs, laps = 1.5, n = 120) {
  if (!record || record.propagator !== 'sgp4') return [];
  const period = periodMsOfSgp4(record);
  if (!period) return [];
  const out = [];
  for (let k = 0; k <= n; k++) {
    const t0 = tMs + (period * laps * k) / n;
    let p;
    try { p = propagate(record, t0); } catch { p = null; }
    if (!p || !Number.isFinite(p.x)) continue;
    try {
      const ecef = p.frame === 'earth-fixed' ? p : eciToEcef(p, gmst(new Date(t0)));
      const gd = ecefToGeodetic(ecef);
      if (!gd || !Number.isFinite(gd.altKm)) continue;
      out.push({ tMs: t0, altKm: gd.altKm, latDeg: gd.latRad * DEG, lonDeg: gd.lonRad * DEG });
    } catch { /* a sample that cannot be placed is left out */ }
  }
  return out;
}

/** Break a ground track where it crosses the date line, so the map never draws a line across the world. */
export function splitAtWrap(points) {
  const runs = [];
  let run = [];
  for (let i = 0; i < points.length; i++) {
    if (run.length && Math.abs(points[i].lonDeg - points[i - 1].lonDeg) > 180) { runs.push(run); run = []; }
    run.push(points[i]);
  }
  if (run.length) runs.push(run);
  return runs;
}

function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, String(v));
  return node;
}

function text(x, y, str, cls) {
  const node = svgEl('text', { x, y, class: cls || 'sr-traj__label' });
  node.textContent = str;
  return node;
}

/** The section, or null for a record the chart cannot draw. */
export function trajectorySection(record, tMs) {
  if (typeof document === 'undefined') return null;
  const pts = sampleTrajectory(record, tMs);
  if (pts.length < 8) return null;
  const T = COPY.trajectory;
  const section = document.createElement('section');
  section.className = 'sr-card__block sr-card__traj';
  const h = document.createElement('h3');
  h.className = 'sr-card__label';
  h.textContent = T.label;
  section.appendChild(h);

  const total = H_ALT + H_MAP + PAD * 2 + 10;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${total}`, class: 'sr-traj', role: 'img' });
  svg.setAttribute('aria-label', T.ariaLabel);

  // --- height over time -------------------------------------------------------------------
  const alts = pts.map((p) => p.altKm);
  const aMin = Math.min(...alts), aMax = Math.max(...alts);
  const span = Math.max(aMax - aMin, 1);
  const lo = aMin - span * 0.15, hi = aMax + span * 0.15;
  const x0 = PAD + 8, x1 = W - 6, y0 = 8, y1 = y0 + H_ALT;
  const xAt = (i) => x0 + ((x1 - x0) * i) / (pts.length - 1);
  const yAt = (a) => y1 - ((y1 - y0) * (a - lo)) / (hi - lo);
  svg.appendChild(svgEl('line', { x1: x0, y1: y1, x2: x1, y2: y1, class: 'sr-traj__axis' }));
  svg.appendChild(svgEl('polyline', { points: pts.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.altKm).toFixed(1)}`).join(' '), class: 'sr-traj__line' }));
  svg.appendChild(svgEl('circle', { cx: xAt(0), cy: yAt(pts[0].altKm), r: 3, class: 'sr-traj__now' }));
  svg.appendChild(text(2, y0 + 8, t(T.km, { n: fmt.int(aMax) }), 'sr-traj__label'));
  svg.appendChild(text(2, y1, t(T.km, { n: fmt.int(aMin) }), 'sr-traj__label'));
  svg.appendChild(text(x0, y1 + 12, T.now, 'sr-traj__label'));
  svg.appendChild(text(x1 - 60, y1 + 12, T.laps, 'sr-traj__label'));

  // --- the ground track ---------------------------------------------------------------------
  const my0 = y1 + PAD + 4, my1 = my0 + H_MAP;
  const mx = (lon) => x0 + ((x1 - x0) * (lon + 180)) / 360;
  const my = (lat) => my1 - ((my1 - my0) * (lat + 90)) / 180;
  svg.appendChild(svgEl('rect', { x: x0, y: my0, width: x1 - x0, height: my1 - my0, class: 'sr-traj__map' }));
  svg.appendChild(svgEl('line', { x1: x0, y1: my(0), x2: x1, y2: my(0), class: 'sr-traj__equator' }));
  for (const run of splitAtWrap(pts)) {
    if (run.length < 2) continue;
    svg.appendChild(svgEl('polyline', { points: run.map((p) => `${mx(p.lonDeg).toFixed(1)},${my(p.latDeg).toFixed(1)}`).join(' '), class: 'sr-traj__line' }));
  }
  svg.appendChild(svgEl('circle', { cx: mx(pts[0].lonDeg), cy: my(pts[0].latDeg), r: 3, class: 'sr-traj__now' }));
  svg.appendChild(text(2, my0 + 8, T.north, 'sr-traj__label'));
  svg.appendChild(text(2, my1, T.south, 'sr-traj__label'));
  section.appendChild(svg);
  const note = document.createElement('p');
  note.className = 'sr-card__note';
  note.textContent = T.note;
  section.appendChild(note);
  return section;
}

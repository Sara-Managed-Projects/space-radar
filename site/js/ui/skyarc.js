// ui/skyarc.js -- a pass across the sky, drawn small (spec 0051 req 4): the horizon, the path from
// where it rises to where it sets with its peak height, solid while sunlit and dashed in the Earth's
// shadow (the design language's pass drawing), and N, E, S, W where they fall inside the span.
//
// Contract: arcSvg(pass, w = 96, h = 48) -> an SVG string. Pure string building, no DOM, so a test
// can read it and the Tonight card and its list rows share one drawing.
//
// THE MAPPING. Azimuth runs left to right around the pass's own middle, so every pass is centred
// whichever way it crosses; the span shown is the pass's own plus a margin. Height is elevation,
// 0 at the horizon line and 90 degrees at the top. The path is 24 samples of a curve through the
// rise, the peak and the set -- the pass's three measured points -- which is the shape of a real
// pass to within a pixel at this size; the lit share comes from the pass's own sunlit times.
//
// Every value in the string is a number this function computed, or one of copy/en.js's four compass
// letters; no text from a record goes in.

import { COPY } from '../copy/en.js';

const DEG = 180 / Math.PI;
const N = 24;

const wrap180 = (a) => ((((a + 180) % 360) + 360) % 360) - 180;

export function arcSvg(pass, w = 96, h = 48) {
  if (!pass || !Number.isFinite(pass.startAz) || !Number.isFinite(pass.endAz) || !Number.isFinite(pass.peakEl)) return '';
  const a0 = pass.startAz * DEG;
  const span = wrap180(pass.endAz * DEG - a0); // the short way round, signed
  const mid = a0 + span / 2;
  const half = Math.max(60, Math.abs(span) / 2 + 20); // degrees either side of the middle shown
  const pad = 4;
  const base = h - 6; // the horizon line
  const top = pad;
  const x = (az) => pad + ((wrap180(az - mid) + half) / (2 * half)) * (w - 2 * pad);
  const y = (el) => base - (Math.max(0, Math.min(90, el)) / 90) * (base - top);
  const peak = pass.peakEl * DEG;
  // Samples along the pass: azimuth linear from rise to set, height a sine hump to the peak.
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const k = i / N;
    pts.push([x(a0 + span * k), y(peak * Math.sin(Math.PI * k))]);
  }
  const t0 = pass.startMs;
  const t1 = pass.endMs;
  const dur = Number.isFinite(t0) && Number.isFinite(t1) && t1 > t0 ? t1 - t0 : 0;
  const litFrom = dur && Number.isFinite(pass.sunlitStartMs) ? (pass.sunlitStartMs - t0) / dur : pass.sunlit === false ? 1 : 0;
  const litTo = dur && Number.isFinite(pass.sunlitEndMs) ? (pass.sunlitEndMs - t0) / dur : pass.sunlit === false ? 1 : 1;
  const seg = (fromK, toK) => {
    const i0 = Math.max(0, Math.floor(fromK * N));
    const i1 = Math.min(N, Math.ceil(toK * N));
    if (i1 <= i0) return '';
    return pts.slice(i0, i1 + 1).map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join('');
  };
  const parts = [];
  parts.push(`<line class="sr-arc__horizon" x1="${pad}" y1="${base}" x2="${w - pad}" y2="${base}"/>`);
  const C = (COPY.tonight && COPY.tonight.cardinals) || {};
  for (const [key, az] of [['N', 0], ['E', 90], ['S', 180], ['W', 270]]) {
    const label = String(C[key] || key).replace(/[<>&"]/g, '');
    if (Math.abs(wrap180(az - mid)) > half) continue;
    const cx = x(az).toFixed(1);
    parts.push(`<line class="sr-arc__tick" x1="${cx}" y1="${base}" x2="${cx}" y2="${base + 3}"/>`);
    parts.push(`<text class="sr-arc__cardinal" x="${cx}" y="${h - 0.5}" text-anchor="middle">${label}</text>`);
  }
  const before = seg(0, litFrom);
  const lit = seg(litFrom, litTo);
  const after = seg(litTo, 1);
  if (before) parts.push(`<path class="sr-arc__shadow" d="${before}"/>`);
  if (lit) parts.push(`<path class="sr-arc__lit" d="${lit}"/>`);
  if (after) parts.push(`<path class="sr-arc__shadow" d="${after}"/>`);
  const [px, py] = pts[Math.round(N / 2)];
  parts.push(`<circle class="sr-arc__peak" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="1.5"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="sr-arc" aria-hidden="true" focusable="false">${parts.join('')}</svg>`;
}

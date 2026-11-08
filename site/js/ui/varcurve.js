// ui/varcurve.js -- a variable star's light curve on its card, with the clock's point on it (forge #142).
//
// Contract: variableFor(rows, record) -> row | null        pure: by Hipparcos number, then by name
//           chartOf(c, w, h) -> { d, nowX, nowY } | null    pure: sky/variables.js curve() as an SVG path, brighter up
//           mountVarCurve(box, record, ctx)                 fills `box` (hidden until a row is found)
// Imported by ui/cards.js the first time a star's card opens; data/variables.json is fetched once.
//
// WHAT IT SAYS. The curve over two periods (one, for a period over a year; 400 days for Betelgeuse, whose
// Great Dimming is drawn from measurements), the magnitude now, the type in words, and whether the value is
// measured or modelled (sky/variables.js honesty), with the GCVS cited. An irregular star gets its range,
// not a curve: the clock cannot say where in it the star is. Static: it is drawn when the card is, and
// reduced motion has nothing to stop.

import { COPY, t, fmt, timeText } from '../copy/en.js';
import '../copy/en.stars.js';
import { curve, honesty, nextMinimum, VAR_YEARS } from '../sky/variables.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const W = 320;
const H = 64;
const YEAR_MS = 365.25 * 86400e3;

/** The row of data/variables.json for a star's record: its Hipparcos number, or its name. */
export function variableFor(rows, record) {
  if (!record || !Array.isArray(rows)) return null;
  const md = record.meta || {};
  const hip = Number(md.hip || (/^hip-(\d+)$/.exec(String(record.id || '')) || [])[1]);
  if (hip > 0) { const r = rows.find((x) => x.hip === hip); if (r) return r; }
  const name = String(record.name || '').trim().toLowerCase();
  return name ? rows.find((x) => x.name.toLowerCase() === name) || null : null;
}

/** sky/variables.js curve() as a path in a w x h box, the brightest magnitude at the top. */
export function chartOf(c, w = W, h = H) {
  if (!c || c.points.length < 2) return null;
  const pad = 4;
  const span = Math.max(0.05, c.faint - c.bright);
  const x = (ms) => ((ms - c.fromMs) / (c.toMs - c.fromMs)) * w;
  const y = (m) => pad + ((m - c.bright) / span) * (h - 2 * pad);
  const d = c.points.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join('');
  const mid = (c.fromMs + c.toMs) / 2;
  return { d, nowX: x(mid), nowY: c.now === null ? null : y(c.now) };
}

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}

function svgNode(tag, attrs) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

export function mountVarCurve(box, record, ctx) {
  // b200-s3-suite: data/variablerows.js keeps the one load per page (and asks again after a failed one).
  import('../data/variablerows.js').then((m) => m.variableRows()).catch(() => []).then((rows) => {
    const row = variableFor(rows, record);
    if (!row || !box.isConnected) return;
    paint(box, row, ctx && ctx.clock ? ctx.clock.now() : Date.now(), ctx);
  });
}

function paint(box, row, nowMs, ctx) {
  const K = COPY.variables;
  box.textContent = '';
  box.className = 'sr-card__block sr-spark sr-varcurve';
  box.appendChild(el('h3', 'sr-card__label', K.label));
  const kind = K.types[row.shape] || K.types.irregular;
  const far = Math.abs(nowMs - Date.now()) > VAR_YEARS * YEAR_MS;
  const c = far ? null : curve(row, nowMs);
  const g = chartOf(c);
  if (g) {
    const svg = svgNode('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', class: 'sr-spark__svg', role: 'img' });
    const nowWords = c.now === null ? '' : fmt.num(c.now, 2);
    svg.setAttribute('aria-label', t(K.aria, { name: row.name, bright: fmt.num(c.bright, 1), faint: fmt.num(c.faint, 1), now: nowWords }));
    svg.appendChild(svgNode('line', { x1: 0, y1: H - 1, x2: W, y2: H - 1, class: 'sr-spark__base', 'vector-effect': 'non-scaling-stroke' }));
    svg.appendChild(svgNode('line', { x1: g.nowX, y1: 0, x2: g.nowX, y2: H, class: 'sr-spark__now', 'vector-effect': 'non-scaling-stroke' }));
    svg.appendChild(svgNode('path', { d: g.d, class: 'sr-spark__path', 'vector-effect': 'non-scaling-stroke' }));
    if (g.nowY !== null) svg.appendChild(svgNode('circle', { cx: g.nowX, cy: g.nowY, r: 3, class: 'sr-varcurve__dot' }));
    box.appendChild(svg);
    const axis = el('div', 'sr-light__axis');
    axis.append(el('span', '', timeText.utcDate(c.fromMs)), el('span', '', K.now), el('span', '', timeText.utcDate(c.toMs)));
    box.appendChild(axis);
    box.appendChild(el('p', 'sr-card__aboardnote', t(K.nowLine, { mag: fmt.num(c.now, 2), band: row.band, bright: fmt.num(row.max, 2), faint: fmt.num(row.min, 2) })));
  } else {
    box.appendChild(el('p', 'sr-card__aboardnote', t(far ? K.far : K.range, { bright: fmt.num(row.max, 2), faint: fmt.num(row.min, 2), band: row.band, years: fmt.int(VAR_YEARS) })));
  }
  const period = row.quadratic ? row.quadratic.p0 : row.periodD;
  const periodWords = period > 0 ? t(period >= 365 ? K.periodYears : K.periodDays, { n: fmt.num(period >= 365 ? period / 365.25 : period, period < 2 ? 3 : period >= 365 ? 1 : 2) }) : '';
  box.appendChild(el('p', 'sr-card__aboardnote', [kind, periodWords].filter(Boolean).join(' ')));
  const nm = !far && nextMinimum(row, nowMs);
  if (nm) {
    const go = el('button', 'sr-btn sr-btn--quiet sr-card__inline sr-spark__go', t(K.nextMin, { when: timeText.dayAndTime(nm) }));
    go.type = 'button';
    go.disabled = !(ctx && ctx.clock && typeof ctx.clock.goTo === 'function');
    go.addEventListener('click', () => { try { ctx.clock.goTo(nm); } catch { /* the clock stays */ } });
    box.appendChild(go);
  }
  const special = K.notes[row.id];
  if (special) box.appendChild(el('p', 'sr-card__aboardnote', special));
  box.appendChild(el('p', 'sr-card__aboardnote', t(honesty(row, nowMs) === 'measured' ? K.measured : K.modelled, { cite: row.quadratic ? row.quadratic.cite : 'GCVS 5.1' })));
  box.hidden = false;
}

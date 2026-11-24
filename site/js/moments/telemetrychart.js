// moments/telemetrychart.js -- the flight-data panel of a Moment: a launch's published heights and speeds, with a cursor on the
// moment's clock (forge #571). Fetched by moments/player.js only for a moment that names `telemetry`, so it is never at boot.
//
// Contract: createTelemetryPanel({ doc, main, compare, seek, time, reduced }) -> { root, toggle, update(t), setOpen(on), destroy() }
//   main, compare  series from moments/telemetry.js toSeries(): the moment's own flight and other flights of the same rocket
//   seek(t)        moves the moment to mission second t (a dot chosen on the chart)
//   time(t)        the mission clock as the player prints it ("T+00:01:23")
//
// WHAT IS DRAWN, AND WHAT IS NOT. Two small charts that share the time axis (height, then speed over the Earth: two measures,
// two charts, never two scales on one). Each published row is a dot; the line between two dots is a straight line and the
// panel says so. The comparison flight is drawn dashed and grey, behind. The readout is the last row the clock has passed,
// with its own time, never a value between rows. Max Q and the two stagings are marked. Nothing moves but the cursor, and
// the cursor is the clock: under reduced motion the moment opens paused and the cursor stands still with it.
//
// The panel sits in the dock above the strip, where the chapters open (internal docs/ui-guide.md: no new floating window);
// the strip's "Flight data" button opens and closes it, open at first on a wide screen and shut on a phone. Words are
// COPY.momentTelemetry (copy/en.moments.telemetry.js); colours, sizes and type are the map's tokens (css/moments.css).
import { COPY, t as fillT, fmt } from '../copy/en.js';
import '../copy/en.moments.telemetry.js';
import { axesOf, linePath, rowAt, nearestRow, MARKED } from './telemetry.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 340;          // the charts' width in their own units, about a phone panel's in CSS px, so the 13 px labels stay 13 px or more
const H = 72;           // one chart's plotting height
const L = 32, R = 4, TOP = 16, GAP = 26, BOTTOM = 20;
const PDF = 'https://www.nasa.gov/wp-content/uploads/2023/04/sp-4029.pdf';

function el(doc, tag, cls, text) {
  const n = doc.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
function sv(doc, tag, attrs = {}, cls = '') {
  const n = doc.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (cls) n.setAttribute('class', cls);
  return n;
}

export function createTelemetryPanel({ doc = document, main, compare = [], seek = () => {}, time = (s) => String(s) } = {}) {
  const C = COPY.momentTelemetry;
  const all = [main, ...compare];
  const ax = axesOf(all);
  const x = (s) => L + ((W - L - R) * Math.max(0, Math.min(ax.tMax, s))) / ax.tMax;
  const charts = [
    { key: 'altKm', label: C.height, unit: C.unitKm, max: ax.altMax, y0: TOP },
    { key: 'speedKms', label: C.speed, unit: C.unitKms, max: ax.speedMax, y0: TOP + H + GAP },
  ];
  const HT = TOP + 2 * H + GAP + BOTTOM;
  const flightName = (s) => (C.flights && C.flights[s.flight]) || s.serial || s.id;

  const root = el(doc, 'section', 'sr-moment__telemetry sr-float');
  root.id = 'sr-moment-telemetry';
  root.hidden = true;
  root.setAttribute('aria-label', C.title);
  const head = el(doc, 'div', 'sr-moment__telhead');
  const title = el(doc, 'h3', 'sr-moment__teltitle', `${C.title} · ${(C.rocket && C.rocket[main.rocket]) || main.serial}`);
  const legend = el(doc, 'ul', 'sr-moment__tellegend');
  for (const s of all) {
    const li = el(doc, 'li', s === main ? 'sr-moment__telkey' : 'sr-moment__telkey sr-moment__telkey--compare');
    li.append(el(doc, 'span', 'sr-moment__telswatch'), el(doc, 'span', '', s === main ? flightName(s) : fillT(C.legendCompare, { flight: flightName(s) })));
    legend.append(li);
  }
  head.append(title, legend);
  const readout = el(doc, 'p', 'sr-moment__telread');

  const svg = sv(doc, 'svg', { viewBox: `0 0 ${W} ${HT}`, role: 'img', 'aria-label': `${C.height}, ${C.speed}` }, 'sr-moment__telchart');
  const cursorLines = [];
  const dotsByFlight = new Map();
  for (const c of charts) {
    const y = (v) => c.y0 + H - (H * Math.max(0, v)) / c.max;
    c.y = y;
    const g = sv(doc, 'g');
    // The frame: a baseline, a middle and a top line, recessive, with their values.
    for (const f of [0, 0.5, 1]) {
      const yy = y(c.max * f);
      g.append(sv(doc, 'line', { x1: L, x2: W - R, y1: yy, y2: yy }, f === 0 ? 'sr-moment__telbase' : 'sr-moment__telgrid'));
      const lab = sv(doc, 'text', { x: L - 4, y: yy + 4.5, 'text-anchor': 'end' }, 'sr-moment__telaxis');
      lab.textContent = fmt.tidy(c.max * f, 1);
      g.append(lab);
    }
    const name = sv(doc, 'text', { x: L, y: c.y0 - 4 }, 'sr-moment__telname');
    name.textContent = `${c.label}, ${c.unit}`;
    g.append(name);
    // The marked rows of the moment's own flight: max Q above the height, the stagings at its foot (where the lines are not).
    if (c.key === 'altKm') {
      for (const p of main.points) {
        const kind = MARKED[p.event];
        if (!kind) continue;
        g.append(sv(doc, 'line', { x1: x(p.t), x2: x(p.t), y1: c.y0, y2: c.y0 + H }, 'sr-moment__telmark'));
        const lab = sv(doc, 'text', { x: x(p.t) + 3, y: kind === 'maxQ' ? c.y0 + 12 : c.y0 + H - 4 }, 'sr-moment__telmarklabel');
        lab.textContent = kind === 'maxQ' ? C.events.maxQ : C.markStaging;
        g.append(lab);
      }
    } else {
      for (const p of main.points) if (MARKED[p.event]) g.append(sv(doc, 'line', { x1: x(p.t), x2: x(p.t), y1: c.y0, y2: c.y0 + H }, 'sr-moment__telmark'));
    }
    // The flights, the comparison first so the moment's own is on top.
    for (const s of [...compare, main]) {
      const cls = s === main ? '' : ' sr-moment__telline--compare';
      g.append(sv(doc, 'path', { d: linePath(s.points, x, y, c.key) }, `sr-moment__telline${cls}`));
      const dots = [];
      for (const p of s.points) {
        const d = sv(doc, 'circle', { cx: x(p.t), cy: y(p[c.key]), r: s === main ? 3.2 : 2.4 }, `sr-moment__teldot${s === main ? '' : ' sr-moment__teldot--compare'}`);
        const tip = sv(doc, 'title');
        tip.textContent = `${flightName(s)} · ${C.events[p.event] || p.event} · ${time(p.t)} · ${fmt.tidy(p.altKm, 1)} ${C.unitKm} · ${fmt.tidy(p.speedKms, 2)} ${C.unitKms}`;
        d.append(tip);
        g.append(d);
        dots.push(d);
      }
      if (!dotsByFlight.has(s)) dotsByFlight.set(s, []);
      dotsByFlight.get(s).push(dots);
    }
    const cur = sv(doc, 'line', { x1: x(0), x2: x(0), y1: c.y0, y2: c.y0 + H }, 'sr-moment__telcursor');
    g.append(cur);
    cursorLines.push(cur);
    svg.append(g);
  }
  // The time axis under the lower chart, in minutes.
  const lowY = TOP + 2 * H + GAP;
  for (let s = 0; s <= ax.tMax; s += 120) {
    const lab = sv(doc, 'text', { x: x(s), y: lowY + 15, 'text-anchor': s === 0 ? 'start' : s === ax.tMax ? 'end' : 'middle' }, 'sr-moment__telaxis');
    lab.textContent = s === ax.tMax ? C.unitMin : fmt.int(s / 60); // the unit where the last number would be, clear of the others
    svg.append(lab);
  }

  const maxQ = el(doc, 'p', 'sr-moment__telnote');
  if (main.maxQ) maxQ.textContent = fillT(C.maxQLine, { kpa: fmt.tidy(main.maxQ.kPa, 1), time: time(main.maxQ.t), height: fmt.tidy(main.maxQ.altKm, 1) });
  const how = el(doc, 'p', 'sr-moment__telnote', `${C.dots} ${C.truth} `);
  const pages = [...new Set(all.flatMap((s) => Object.values(s.sources).map((q) => q.page)))].sort((a, b) => a - b).join(', ');
  const link = el(doc, 'a', 'sr-moment__tellink', C.source);
  link.href = PDF;
  link.target = '_blank';
  link.rel = 'noopener';
  link.title = fillT(C.sourceTitle, { pages });
  how.append(link);

  // The same rows as a table, for a screen reader (the chart is a picture to it).
  const table = el(doc, 'table', 'sr-moment__vh');
  const cap = el(doc, 'caption', '', fillT(C.tableCaption, { flight: flightName(main) }));
  const hr = el(doc, 'tr');
  for (const h of [C.colTime, C.colEvent, C.colHeight, C.colSpeed]) hr.append(el(doc, 'th', '', h));
  table.append(cap, hr);
  for (const p of main.points) {
    const tr = el(doc, 'tr');
    tr.append(el(doc, 'td', '', time(p.t)), el(doc, 'td', '', C.events[p.event] || p.event), el(doc, 'td', '', fmt.tidy(p.altKm, 1)), el(doc, 'td', '', fmt.tidy(p.speedKms, 2)));
    table.append(tr);
  }
  root.append(head, readout, svg, maxQ, how, table);

  // The strip's button: opens and closes the panel.
  const toggle = el(doc, 'button', 'ui-btn sr-moment__text sr-moment__telbtn', C.button);
  toggle.type = 'button';
  toggle.title = C.buttonTitle;
  toggle.setAttribute('aria-controls', root.id);
  toggle.setAttribute('aria-expanded', 'false');
  const setOpen = (on) => {
    root.hidden = !on;
    toggle.setAttribute('aria-expanded', String(!!on));
  };
  toggle.addEventListener('click', () => setOpen(root.hidden));

  // A pointer over the charts reads the nearest row of the moment's flight; a press goes to its second.
  let hover = -1;
  const tOfPointer = (e) => {
    const r = svg.getBoundingClientRect();
    if (!(r.width > 0)) return null;
    const u = ((e.clientX - r.left) / r.width) * W;
    return ((u - L) / (W - L - R)) * ax.tMax;
  };
  svg.addEventListener('pointermove', (e) => {
    const s = tOfPointer(e);
    if (s === null) return;
    hover = nearestRow(main.points, s);
    paint(hover, true);
  });
  svg.addEventListener('pointerleave', () => { hover = -1; paint(last, false); });
  svg.addEventListener('click', (e) => {
    const s = tOfPointer(e);
    if (s === null) return;
    const i = nearestRow(main.points, s);
    if (i >= 0) seek(main.points[i].t);
  });
  svg.setAttribute('aria-description', C.seekHint);

  let last = -2;
  let lastT = NaN;
  function paint(i, hovering) {
    for (const [s, sets] of dotsByFlight) {
      if (s !== main) continue;
      for (const dots of sets) dots.forEach((d, k) => d.setAttribute('aria-current', k === i ? 'true' : 'false'));
    }
    if (i < 0) { readout.textContent = C.before; return; }
    const p = main.points[i];
    const lastRow = main.points[main.points.length - 1];
    if (!hovering && i === main.points.length - 1 && lastT > lastRow.t + 30) { readout.textContent = fillT(C.after, { time: time(lastRow.t) }); return; }
    const text = fillT(C.readout, { event: C.events[p.event] || p.event, time: time(p.t), height: fmt.tidy(p.altKm, 1), speed: fmt.tidy(p.speedKms, 2) });
    readout.textContent = p.commanded ? `${text} ${C.commanded}` : text;
  }

  /** Follow the moment's clock: the cursor at mission second t and the readout at the last row passed. */
  function update(tt) {
    if (tt === lastT) return;
    const wasAfter = lastT > main.points[main.points.length - 1].t + 30;
    lastT = tt;
    const cx = x(tt).toFixed(1);
    for (const c of cursorLines) { c.setAttribute('x1', cx); c.setAttribute('x2', cx); }
    const i = rowAt(main.points, tt);
    const isAfter = tt > main.points[main.points.length - 1].t + 30;
    if (hover < 0 && (i !== last || wasAfter !== isAfter)) { last = i; paint(i, false); }
    else last = i;
  }

  function destroy() {
    root.remove();
    toggle.remove();
  }

  return { root, toggle, update, setOpen, destroy };
}

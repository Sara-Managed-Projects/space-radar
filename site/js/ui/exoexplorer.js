// ui/exoexplorer.js -- the exoplanet explorer, a catalogue of ui/catalogue.js (forge #564; research train "catalogues").
//
// Contract: mountExoExplorer(pane, ctx, api) -> { show(arg), hide() }   (`#cat=exoplanets:<x>,<y>[,<scales>]`)
// Also exported, pure, for tests/test_exo_explorer.mjs:
//   AXES, AXIS_IDS, PRESETS, METHOD_GROUPS, METHOD_TOKENS
//   methodGroup(method)                 -> 'transit' | 'rv' | 'microlensing' | 'imaging' | 'other'
//   parseArg(arg) / argOf(state)        the link's value and back: {x, y, xLog, yLog}
//   makeScale(lo, hi, log, px0, px1)    -> {map(v), ticks(), log}; a log scale of a non-positive value maps to NaN
//   plotRows(rows, x, y, opts)          -> {points, missing, nonPositive, hidden, lo/hi per axis}
//   hzInsolation(teffK)                 -> {inner, outer, wideInner, wideOuter} in Earth's starlight, or null
//   joinExtra(records, extra)           -> rows: the layer's planets with the side file's four columns
//
// THE DATA IS THE MAP'S. The planets are the exoplanet layer's own records (data/parsers.js parseExoplanets: our weekly copy
// of the NASA Exoplanet Archive's composite table first, the bundled copy without it), so a dot and the planet's card are
// one record. Four columns the layer does not carry (the orbit's size, the starlight, the planet's temperature and the star's
// mass) come from site/data/exoplanets-explorer.json, the Archive's own values, fetched when the explorer opens
// (scripts/build-exo-explorer.py). A mass or a size the Archive gives only as a limit is not plotted as a value.
//
// NOTHING IS DROPPED IN SILENCE. The count line says how many dots are drawn, how many planets lack a value on either axis,
// how many a log scale cannot place (zero or less), and how many the "Found by" chips hide.
//
// THE HABITABLE ZONE is Kopparapu et al. (2014, ApJ Letters 787, L29), the coefficients ui/findcore.js and
// scripts/build-systems.py already use: the effective starlight at the runaway-greenhouse and maximum-greenhouse limits
// (the conservative band) and at the recent-Venus and early-Mars limits (the optimistic one), for a star of 2 600 to 7 200 K.
// With starlight on one axis and the star's temperature on the other the band is drawn for every temperature; with
// starlight against anything else it is the band for a star like the Sun, and the note says so.
//
// ONE DRAW. Six thousand dots are one pass over a canvas, redrawn only when a choice changes; the pointer and the arrow keys
// find the nearest dot by a scan, no per-dot element. Nothing moves, so reduced motion has nothing to stop.

import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.exoexplorer.js';
import { el, button, readJsonCopy, sourceLine } from './catalogkit.js';
import { habitableZone } from './findcore.js';

const EARTH_TEFF = 5780;
const DOT = 2.5;
const HIT_PX = 10;

/** The columns. `get(row)` is the value; `side` marks the four from the side file. */
export const AXES = {
  period: { get: (r) => r.periodDays, log: true },
  radius: { get: (r) => (r.radiusLimit ? null : r.radiusEarths), log: true },
  mass: { get: (r) => (r.massLimit ? null : r.massEarths), log: true },
  distance: { get: (r) => r.distLy, log: true },
  year: { get: (r) => r.discYear, log: false, noLog: true },
  starTeff: { get: (r) => r.starTeffK, log: false },
  starRadius: { get: (r) => r.starRadiusSuns, log: true },
  aAu: { get: (r) => r.aAu, log: true, side: true },
  insol: { get: (r) => r.insol, log: true, side: true },
  teq: { get: (r) => r.teqK, log: false, side: true },
  starMass: { get: (r) => r.starMassSuns, log: true, side: true },
};
export const AXIS_IDS = Object.keys(AXES);

/** The one-tap views. The first is what the explorer opens on. */
export const PRESETS = [
  { id: 'periodRadius', x: 'period', y: 'radius' },
  { id: 'zone', x: 'insol', y: 'starTeff' },
  { id: 'massRadius', x: 'mass', y: 'radius' },
  { id: 'years', x: 'year', y: 'distance' },
];

export const METHOD_GROUPS = ['transit', 'rv', 'microlensing', 'imaging', 'other'];
/** Each group's colour: a class colour of the palette (css/ui.css :root), read from the page when the canvas draws. */
export const METHOD_TOKENS = { transit: '--sr-exoplanet', rv: '--sr-probe', microlensing: '--sr-launch', imaging: '--sr-site', other: '--sr-unknown' };

/** The Archive's `discoverymethod` as one of five groups. Pure. */
export function methodGroup(method) {
  const m = String(method || '').toLowerCase();
  if (m === 'transit') return 'transit';
  if (m === 'radial velocity') return 'rv';
  if (m === 'microlensing') return 'microlensing';
  if (m === 'imaging') return 'imaging';
  return 'other';
}

/** `insol,starTeff` or `insol,starTeff,ln` (x log, y linear) -> state; anything unknown falls back to the first view. Pure. */
export function parseArg(arg) {
  const [x, y, s] = String(arg || '').split(',');
  const p = PRESETS[0];
  const ok = (a) => AXIS_IDS.includes(a);
  const X = ok(x) ? x : p.x;
  const Y = ok(y) && y !== X ? y : (X === p.y ? p.x : p.y);
  const flag = (c, axis) => (c === 'l' ? !AXES[axis].noLog : c === 'n' ? false : AXES[axis].log);
  return { x: X, y: Y, xLog: flag(s && s[0], X), yLog: flag(s && s[1], Y) };
}

/** The state as the link's value: the two axes, and the scales only when they differ from the columns' own. Pure. */
export function argOf(st) {
  const base = `${st.x},${st.y}`;
  if (st.xLog === AXES[st.x].log && st.yLog === AXES[st.y].log) return base;
  return `${base},${st.xLog ? 'l' : 'n'}${st.yLog ? 'l' : 'n'}`;
}

function niceStep(span) {
  const raw = span / 5;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
}

/** A scale from [lo, hi] to pixels. A log scale maps a value of zero or less to NaN (the caller counts it). Pure. */
export function makeScale(lo, hi, log, px0, px1) {
  let a = lo, b = hi;
  if (!(b > a)) { a = log ? a / 2 : a - 1; b = log ? b * 2 : b + 1; }
  const f = log ? (v) => (v > 0 ? Math.log10(v) : NaN) : (v) => v;
  const fa = f(a), fb = f(b);
  const map = (v) => {
    const fv = f(v);
    return Number.isFinite(fv) ? px0 + ((fv - fa) / (fb - fa)) * (px1 - px0) : NaN;
  };
  const ticks = () => {
    const out = [];
    if (log) {
      for (let e = Math.floor(fa); e <= Math.ceil(fb); e += 1) { const v = 10 ** e; if (v >= a * 0.999 && v <= b * 1.001) out.push(v); }
      return out;
    }
    const step = niceStep(b - a);
    for (let v = Math.ceil(a / step) * step; v <= b + step * 1e-9; v += step) out.push(Math.round(v / step) * step);
    return out;
  };
  return { map, ticks, log, lo: a, hi: b };
}

/**
 * The dots for two axes. `opts.hidden` is a Set of method groups not drawn; `opts.xLog`, `opts.yLog`. Every planet is in one
 * of: points, missing (no value on an axis), nonPositive (a log axis and a value <= 0), hidden. Pure.
 */
export function plotRows(rows, x, y, opts = {}) {
  const gx = AXES[x].get, gy = AXES[y].get;
  const hidden = opts.hidden || new Set();
  const out = { points: [], missing: 0, nonPositive: 0, hidden: 0, xLo: Infinity, xHi: -Infinity, yLo: Infinity, yHi: -Infinity };
  for (const r of rows) {
    const vx = gx(r), vy = gy(r);
    if (!Number.isFinite(vx) || !Number.isFinite(vy) || vx === null || vy === null) { out.missing += 1; continue; }
    if ((opts.xLog && vx <= 0) || (opts.yLog && vy <= 0)) { out.nonPositive += 1; continue; }
    const g = methodGroup(r.method);
    if (hidden.has(g)) { out.hidden += 1; continue; }
    out.points.push({ r, vx, vy, g });
    if (vx < out.xLo) out.xLo = vx;
    if (vx > out.xHi) out.xHi = vx;
    if (vy < out.yLo) out.yLo = vy;
    if (vy > out.yHi) out.yHi = vy;
  }
  return out;
}

/** Kopparapu et al. (2014): the starlight (Earth = 1) at the four limits, for a star of this temperature; null outside 2 600-7 200 K. Pure. */
export function hzInsolation(teffK) {
  const hz = habitableZone(teffK, 1);
  if (!hz) return null;
  const s = (au) => 1 / (au * au);
  return { inner: s(hz.inner), outer: s(hz.outer), wideInner: s(hz.wideInner), wideOuter: s(hz.wideOuter) };
}

/** The layer's records as the explorer's rows, with the side file's columns joined by the planet's name. Pure. */
export function joinExtra(records, extra) {
  const by = new Map();
  if (extra && Array.isArray(extra.rows) && Array.isArray(extra.cols)) {
    const i = (k) => extra.cols.indexOf(k);
    const [ia, is, it, im] = ['aAu', 'insol', 'teqK', 'starMassSuns'].map(i);
    for (const row of extra.rows) by.set(row[0], { aAu: row[ia], insol: row[is], teqK: row[it], starMassSuns: row[im] });
  }
  return (records || []).filter((r) => r && r.klass === 'exoplanet').map((rec) => {
    const m = rec.meta || {};
    const x = by.get(rec.name) || {};
    return {
      id: rec.id, name: rec.name, host: m.host || null, method: m.method || null,
      periodDays: m.periodDays, radiusEarths: m.radiusEarths, massEarths: m.massEarths, radiusLimit: m.radiusLimit, massLimit: m.massLimit,
      distLy: m.distLy, discYear: m.discYear, starTeffK: m.starTeffK, starRadiusSuns: m.starRadiusSuns,
      aAu: x.aAu ?? null, insol: x.insol ?? null, teqK: x.teqK ?? null, starMassSuns: x.starMassSuns ?? null,
    };
  });
}

function valueText(axis, v) {
  if (!Number.isFinite(v)) return COPY.catalogue.unknown;
  if (axis === 'year') return String(Math.round(v));
  const unit = COPY.exoExplorer.units[axis];
  const n = Math.abs(v) >= 100 ? fmt.int(Math.round(v)) : fmt.smart(Number(v.toPrecision(3)));
  return unit ? `${n}${fmt.nbsp}${unit}` : n;
}
function tickText(axis, v) {
  if (axis === 'year') return String(Math.round(v));
  return Math.abs(v) >= 1000 ? fmt.int(v) : fmt.smart(Number(v.toPrecision(3)));
}

export function mountExoExplorer(pane, ctx, api) {
  const X = COPY.exoExplorer;
  const C = COPY.catalogue;
  const st = parseArg('');
  st.hidden = new Set();
  let rows = [];
  let plot = null; // {pts, sx, sy}
  let focusIdx = -1;
  let extraOk = true;

  pane.classList.add('sr-exo');
  pane.appendChild(el('p', 'sr-cat__lead', X.lead));

  // --- the views, and the two axes -------------------------------------------------------------------------------------
  const presetBox = el('div', 'sr-cat__filter');
  const presetHead = el('p', 'sr-cat__filterlabel', X.views);
  presetHead.id = 'sr-exo-views';
  const presetRow = el('div', 'sr-find__chips sr-cat__chips');
  presetRow.setAttribute('role', 'group');
  presetRow.setAttribute('aria-labelledby', presetHead.id);
  const presetBtns = new Map();
  for (const p of PRESETS) {
    const b = button('ui-chip', X.presets[p.id]);
    b.addEventListener('click', () => { st.x = p.x; st.y = p.y; st.xLog = AXES[p.x].log; st.yLog = AXES[p.y].log; changed(); });
    presetRow.appendChild(b);
    presetBtns.set(p.id, b);
  }
  presetBox.append(presetHead, presetRow);
  pane.appendChild(presetBox);

  const axesBox = el('div', 'sr-exo__axes');
  const axisCtl = {};
  for (const which of ['x', 'y']) {
    const row = el('div', 'sr-exo__axis');
    const id = `sr-exo-${which}`;
    const label = el('label', 'sr-cat__filterlabel', which === 'x' ? X.xLabel : X.yLabel);
    label.htmlFor = id;
    const sel = el('select', 'ui-select ui-select--sm sr-exo__select');
    sel.id = id;
    for (const a of AXIS_IDS) {
      const o = el('option', '', X.axes[a]);
      o.value = a;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => {
      const other = which === 'x' ? 'y' : 'x';
      if (sel.value === st[other]) { st[other] = st[which]; st[`${other}Log`] = AXES[st[other]].log; } // a swap, never the same column twice
      st[which] = sel.value;
      st[`${which}Log`] = AXES[sel.value].log;
      changed();
    });
    const seg = el('div', 'ui-seg sr-exo__seg');
    seg.setAttribute('role', 'group');
    const lin = button('ui-seg__btn', X.linear);
    const log = button('ui-seg__btn', X.log);
    lin.addEventListener('click', () => { st[`${which}Log`] = false; changed(); });
    log.addEventListener('click', () => { if (!AXES[st[which]].noLog) { st[`${which}Log`] = true; changed(); } });
    seg.append(lin, log);
    row.append(label, sel, seg);
    axesBox.appendChild(row);
    axisCtl[which] = { sel, seg, lin, log };
  }
  pane.appendChild(axesBox);

  // --- the plot ----------------------------------------------------------------------------------------------------------
  const figure = el('div', 'sr-exo__figure');
  const canvas = el('canvas', 'sr-exo__canvas');
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-describedby', 'sr-exo-read');
  figure.appendChild(canvas);
  pane.appendChild(figure);
  const readout = el('div', 'sr-exo__readout');
  const readText = el('p', 'sr-exo__readtext', X.readoutHint);
  readText.id = 'sr-exo-read';
  readText.setAttribute('aria-live', 'polite');
  const openBtn = button('ui-btn ui-btn--sm ui-btn--secondary sr-exo__open');
  openBtn.hidden = true;
  readout.append(readText, openBtn);
  pane.appendChild(readout);
  const count = el('p', 'sr-cat__count sr-exo__count');
  count.setAttribute('role', 'status');
  pane.appendChild(count);

  // --- found by ----------------------------------------------------------------------------------------------------------
  const methodBox = el('div', 'sr-cat__filter');
  const methodHead = el('p', 'sr-cat__filterlabel', X.methods);
  methodHead.id = 'sr-exo-methods';
  const methodRow = el('div', 'sr-find__chips sr-cat__chips');
  methodRow.setAttribute('role', 'group');
  methodRow.setAttribute('aria-labelledby', methodHead.id);
  const methodBtns = new Map();
  for (const g of METHOD_GROUPS) {
    const b = button('ui-chip sr-exo__method', '', t(X.methodTitle, { method: X.method[g] }));
    const sw = el('span', `sr-exo__sw sr-exo__sw--${g}`);
    sw.setAttribute('aria-hidden', 'true');
    b.append(sw, document.createTextNode(X.method[g]));
    b.addEventListener('click', () => { if (st.hidden.has(g)) st.hidden.delete(g); else st.hidden.add(g); draw(); paintChips(); });
    methodRow.appendChild(b);
    methodBtns.set(g, b);
  }
  methodBox.append(methodHead, methodRow);
  pane.appendChild(methodBox);

  // --- the zone's note, the Lab, the honesty and the source ------------------------------------------------------------
  const zoneNote = el('p', 'sr-sect__note sr-exo__zone');
  pane.appendChild(zoneNote);
  const lab = el('a', 'sr-mission__link sr-exo__lab', X.zoneLab);
  lab.href = new URL('../../lab/habitable-zone-slider/', import.meta.url).href;
  lab.target = '_blank';
  lab.rel = 'noopener';
  const labP = el('p', 'sr-exo__labline');
  labP.appendChild(lab);
  pane.appendChild(labP);
  const honesty = el('p', 'sr-sect__note sr-exo__honesty', X.honesty);
  pane.appendChild(honesty);
  let srcLine = null;

  function paintChips() {
    for (const [g, b] of methodBtns) b.setAttribute('aria-pressed', st.hidden.has(g) ? 'false' : 'true');
  }
  function paintControls() {
    for (const which of ['x', 'y']) {
      const c = axisCtl[which];
      c.sel.value = st[which];
      const isLog = st[`${which}Log`];
      c.lin.setAttribute('aria-pressed', isLog ? 'false' : 'true');
      c.log.setAttribute('aria-pressed', isLog ? 'true' : 'false');
      c.log.disabled = !!AXES[st[which]].noLog;
      c.seg.setAttribute('aria-label', t(X.scaleLabel, { axis: X.axes[st[which]] }));
    }
    for (const p of PRESETS) presetBtns.get(p.id).setAttribute('aria-pressed', p.x === st.x && p.y === st.y ? 'true' : 'false');
    paintChips();
  }

  function changed() {
    focusIdx = -1;
    paintControls();
    draw();
    api.writeLink(argOf(st));
  }

  // --- drawing -----------------------------------------------------------------------------------------------------------
  const tokens = {};
  function token(name) {
    if (!(name in tokens)) {
      try { tokens[name] = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch { tokens[name] = ''; }
    }
    return tokens[name];
  }

  function zoneKind() {
    const pair = new Set([st.x, st.y]);
    if (!pair.has('insol')) return 'none';
    return pair.has('starTeff') ? 'both' : 'sun';
  }

  function draw() {
    const w = Math.max(240, Math.round(figure.clientWidth || pane.clientWidth || 320));
    const h = Math.round(Math.min(360, Math.max(240, w * 0.85)));
    const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const g = canvas.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const fontPx = parseFloat(token('--sr-fs-sm')) || 13;
    const font = `${fontPx}px ${token('--sr-font-mono') || 'monospace'}`;
    const pad = { l: 52, r: 10, t: 10, b: 40 };
    const res = plotRows(rows, st.x, st.y, { xLog: st.xLog, yLog: st.yLog, hidden: st.hidden });
    const ok = res.points.length > 0;
    const sy = makeScale(ok ? res.yLo : 1, ok ? res.yHi : 10, st.yLog, h - pad.b, pad.t);
    // The left margin holds the widest tick number and, beside it, the turned title: measured, so the two never overlap.
    g.font = font;
    const tickW = Math.max(0, ...sy.ticks().map((v) => g.measureText(tickText(st.y, v)).width));
    pad.l = Math.ceil(tickW + 6 + fontPx + 8);
    const sx = makeScale(ok ? res.xLo : 1, ok ? res.xHi : 10, st.xLog, pad.l, w - pad.r);
    // The habitable zone, under the dots.
    const zk = zoneKind();
    if (zk !== 'none') {
      const green = token('--sr-exoplanet');
      g.save();
      g.beginPath();
      g.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
      g.clip();
      g.fillStyle = green;
      const band = (lo, hi, alpha) => {
        g.globalAlpha = alpha;
        g.beginPath();
        if (zk === 'sun') {
          const z = hzInsolation(EARTH_TEFF);
          const a = z[lo], b = z[hi];
          if (st.x === 'insol') { const x0 = sx.map(a), x1 = sx.map(b); g.rect(Math.min(x0, x1), pad.t, Math.abs(x1 - x0), h - pad.t - pad.b); } else { const y0 = sy.map(a), y1 = sy.map(b); g.rect(pad.l, Math.min(y0, y1), w - pad.l - pad.r, Math.abs(y1 - y0)); }
        } else {
          const temps = [];
          for (let T = 2600; T <= 7200; T += 100) temps.push(T);
          const pt = (T, s) => (st.x === 'insol' ? [sx.map(s), sy.map(T)] : [sx.map(T), sy.map(s)]);
          temps.forEach((T, i) => { const [px, py] = pt(T, hzInsolation(T)[lo]); if (i) g.lineTo(px, py); else g.moveTo(px, py); });
          for (const T of temps.slice().reverse()) { const [px, py] = pt(T, hzInsolation(T)[hi]); g.lineTo(px, py); }
          g.closePath();
        }
        g.fill();
      };
      band('wideInner', 'wideOuter', 0.1);
      band('inner', 'outer', 0.18);
      g.restore();
    }
    // The axes and their ticks.
    g.globalAlpha = 1;
    g.strokeStyle = token('--sr-line-strong');
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(pad.l, pad.t);
    g.lineTo(pad.l, h - pad.b);
    g.lineTo(w - pad.r, h - pad.b);
    g.stroke();
    g.fillStyle = token('--sr-text-dim');
    g.font = font;
    g.textBaseline = 'top';
    g.textAlign = 'center';
    const xt = sx.ticks();
    const xStep = Math.max(1, Math.ceil((xt.length * 44) / (w - pad.l - pad.r)));
    xt.forEach((v, i) => { if (i % xStep) return; const px = sx.map(v); g.fillText(tickText(st.x, v), px, h - pad.b + 4); });
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    for (const v of sy.ticks()) g.fillText(tickText(st.y, v), pad.l - 6, sy.map(v));
    g.fillStyle = token('--sr-text-soft');
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.fillText(axisTitle(st.x), (pad.l + w - pad.r) / 2, h - 2);
    g.save();
    g.translate(fontPx / 2 + 2, (pad.t + h - pad.b) / 2);
    g.rotate(-Math.PI / 2);
    g.textBaseline = 'middle';
    g.fillText(axisTitle(st.y), 0, 0);
    g.restore();
    // The dots: one pass per colour.
    const pts = [];
    for (const grp of METHOD_GROUPS) {
      g.fillStyle = token(METHOD_TOKENS[grp]);
      g.globalAlpha = 0.75;
      g.beginPath();
      for (const p of res.points) {
        if (p.g !== grp) continue;
        const px = sx.map(p.vx), py = sy.map(p.vy);
        if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
        g.moveTo(px + DOT, py);
        g.arc(px, py, DOT, 0, Math.PI * 2);
        pts.push({ ...p, px, py });
      }
      g.fill();
    }
    g.globalAlpha = 1;
    pts.sort((a, b) => a.px - b.px || a.py - b.py);
    plot = { pts, sx, sy, w, h };
    if (focusIdx >= pts.length) focusIdx = -1;
    if (focusIdx >= 0) ring(pts[focusIdx]);
    // The count line, every planet accounted for.
    const parts = [t(X.drawn, { n: fmt.int(pts.length) })];
    if (res.missing) parts.push(t(X.missing, { n: fmt.int(res.missing) }));
    if (res.nonPositive) parts.push(t(X.nonPositive, { n: fmt.int(res.nonPositive) }));
    if (res.hidden) parts.push(t(X.hidden, { n: fmt.int(res.hidden) }));
    count.textContent = parts.join(' ');
    canvas.setAttribute('aria-label', t(X.canvasLabel, { x: X.axes[st.x], y: X.axes[st.y], n: fmt.int(pts.length) }));
    zoneNote.textContent = zk === 'both' ? X.zoneBoth : zk === 'sun' ? X.zoneSun : X.zoneNone;
    zoneNote.classList.toggle('sr-exo__zone--on', zk !== 'none');
  }

  function axisTitle(a) {
    const unit = X.units[a];
    return unit ? t(X.axisTitle, { name: X.axes[a], unit }) : X.axes[a];
  }

  function ring(p) {
    const g = canvas.getContext('2d');
    if (!g || !p) return;
    g.save();
    g.strokeStyle = token('--sr-atmosphere');
    g.lineWidth = 2;
    g.beginPath();
    g.arc(p.px, p.py, DOT + 4, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }

  function say(p) {
    if (!p) { readText.textContent = X.readoutHint; openBtn.hidden = true; return; }
    readText.textContent = t(X.readout, { name: p.r.name, x: valueText(st.x, p.vx), y: valueText(st.y, p.vy), method: X.method[p.g] });
    openBtn.hidden = false;
    openBtn.textContent = t(X.open, { name: p.r.name });
    openBtn.onclick = () => go(p);
  }

  function nearest(mx, my) {
    if (!plot) return -1;
    let best = -1, bd = HIT_PX * HIT_PX;
    plot.pts.forEach((p, i) => { const d = (p.px - mx) ** 2 + (p.py - my) ** 2; if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function point(e) {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  function focusOn(i) {
    focusIdx = i;
    draw();
    say(i >= 0 ? plot.pts[i] : null);
  }

  let systems = null;
  const systemsLoad = () => systems || (systems = import('../data/systems-index.js').then((m) => m.SYSTEM_INDEX).catch(() => { systems = null; return []; }));

  /** Open the planet's card, in its own drawn system when the map has one. */
  async function go(p) {
    const rec = typeof ctx.recordById === 'function' ? ctx.recordById(p.r.id) : null;
    if (!rec) { readText.textContent = t(X.noRecord, { name: p.r.name }); return; }
    const index = await systemsLoad();
    const sys = (index || []).find((s) => (s.planets || []).some((q) => q.id === p.r.id));
    if (sys && typeof ctx.setStage === 'function') {
      try { ctx.setStage(sys.stage); } catch { /* the planet's card still opens where it is */ }
    }
    ctx.select(rec);
  }

  canvas.addEventListener('pointermove', (e) => {
    const [mx, my] = point(e);
    const i = nearest(mx, my);
    if (i !== focusIdx) focusOn(i);
  });
  canvas.addEventListener('click', (e) => {
    const [mx, my] = point(e);
    const i = nearest(mx, my);
    if (i >= 0) { focusOn(i); go(plot.pts[i]); }
  });
  canvas.addEventListener('keydown', (e) => {
    if (!plot || !plot.pts.length) return;
    const n = plot.pts.length;
    let i = focusIdx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = i < 0 ? 0 : Math.min(n - 1, i + (e.shiftKey ? 10 : 1));
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = i < 0 ? 0 : Math.max(0, i - (e.shiftKey ? 10 : 1));
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = n - 1;
    else if (e.key === 'Enter' && i >= 0) { e.preventDefault(); go(plot.pts[i]); return; }
    else return;
    e.preventDefault();
    focusOn(i);
  });

  // --- the data: the layer's planets, and the side file --------------------------------------------------------------------
  function whenLayer(id) {
    if (typeof ctx.layerLanded === 'function' && ctx.layerLanded(id) && (ctx.recordsFor(id) || []).length) return Promise.resolve();
    if (typeof ctx.loadAfterFirstVisit === 'function') ctx.loadAfterFirstVisit();
    const l = (ctx.layers || []).find((x) => x.id === id);
    if (l && typeof ctx.loadLayerNow === 'function') ctx.loadLayerNow(l);
    return new Promise((resolve) => {
      const on = (e) => { if (e.detail && e.detail.id === id) { window.removeEventListener('sr:layer', on); resolve(); } };
      window.addEventListener('sr:layer', on);
      setTimeout(() => { window.removeEventListener('sr:layer', on); resolve(); }, 30000);
    });
  }
  const wait = el('p', 'sr-cat__wait', C.loading);
  figure.before(wait);
  const ready = Promise.all([
    whenLayer('exoplanets'),
    readJsonCopy([{ url: new URL('../../data/exoplanets-explorer.json', import.meta.url).href, via: 'bundled' }]),
  ]).then(([, extra]) => {
    extraOk = !!(extra && extra.data);
    rows = joinExtra(ctx.recordsFor('exoplanets') || [], extraOk ? extra.data : null);
    wait.remove();
    if (!rows.length) { count.textContent = C.failed; return; }
    if (!extraOk) honesty.after(el('p', 'sr-sect__note sr-exo__honesty', X.extraMissing));
    const meta = (ctx.recordsFor('exoplanets')[0] || { meta: {} }).meta || {};
    const live = typeof meta.liveAsOf === 'number' ? meta.liveAsOf : typeof meta.liveAsOf === 'string' ? Date.parse(meta.liveAsOf) : NaN;
    const readMs = Number.isFinite(live) ? live : meta.asOf ? Date.parse(`${meta.asOf}T00:00:00Z`) : NaN;
    srcLine = sourceLine({ source: X.source, url: 'https://exoplanetarchive.ipac.caltech.edu/', licence: X.licence, readMs, via: Number.isFinite(live) ? 'snapshot' : 'bundled' });
    pane.appendChild(srcLine);
    draw();
  });

  let ro = null;
  if (typeof ResizeObserver === 'function') ro = new ResizeObserver(() => { if (plot && !pane.hidden) draw(); });

  paintControls();
  return {
    show(arg) {
      const s = parseArg(arg);
      Object.assign(st, s);
      paintControls();
      if (ro) ro.observe(figure);
      ready.then(() => draw());
    },
    hide() { if (ro) ro.disconnect(); },
  };
}

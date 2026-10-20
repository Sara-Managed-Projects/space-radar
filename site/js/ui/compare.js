// ui/compare.js -- Compare, and the comparison lab (internal i#885 and i#909, release 1.3.0).
//
// Contract: mountCompare(box, record, ctx) fills `box` (the panel of a world card's "Compare" row) and
// returns { destroy() }. Also exported, pure, for tests/test_compare.mjs:
//   BODY, ORDER, canCompare(id), defaultWith(id)
//   cell(prop, body) -> { num, unit, note, text }   one value as the card prints it
//   rowsFor(a, b) -> [{ prop, label, a, b }]         the side-by-side table
//   widerSentence(a, b)                              "Jupiter is 11 times as wide as Earth."
//   layout(a, b, mode, w, h) -> { bodies: [...] }    where each disc and ring is drawn
//   labRows(prop, openId) -> [{ id, value, frac, ... }]
//
// WHAT IT IS. One module for two questions a card cannot answer by itself: "how does this world sit
// beside that one?" (two discs at one scale, or at one width, and a table of what NASA's fact sheets say of
// both) and "where do all of them stand on one measure?" (the lab: eleven bars, longest first, the open
// world marked; pressing a row makes it the other body of the pair). It lives in the card's own disclosure
// row, which is an existing host (docs/ui-guide.md principle 2): no panel, no new view.
//
// WHAT IS TRUE IN IT. The numbers are NASA's (registry/compare.yaml, read on COMPARE_READ, each body's page
// named); nothing is worked out but units and ratios. The discs are circles of each body's volumetric mean
// radius: the real giants are flattened (Saturn by a tenth), and the picture says it is not a photograph. A
// ring's radii are the planet's Rings Fact Sheet; its brightness is the picture's and says so. A body that
// would be under a pixel is drawn as a dot and the card says so. "Same width" is not to scale and says that
// too. Nothing here is remembered, written to a URL or sent anywhere.
//
// FETCHED when a world card's Compare row is opened; never at boot (tests/test_boot_diet.mjs).

import { COPY, t, fmt, timeText } from '../copy/en.js';
import '../copy/en.later.js';
import { COMPARE_BODIES, COMPARE_READ } from '../data/compare.js';
import { loadCss } from './latercss.js';

const AU_KM = 149597870.7;
/** The view of a ring plane: the height of a ring's ellipse over its width. Illustrative (about 17 degrees up). */
export const TILT = 0.3;
const SVG = 'http://www.w3.org/2000/svg';
const SPACE = ' ';

export const BODY = new Map(COMPARE_BODIES.map((b) => [b.world, b]));
export const ORDER = COMPARE_BODIES.map((b) => b.world);
export const canCompare = (id) => BODY.has(id);

/** Who a world is set beside first: the Earth, and for the Earth itself the Moon. Never itself. */
export function defaultWith(id) {
  return id === 'earth' ? 'moon' : 'earth';
}

// ------------------------------------------------------------------------------------------------
// Numbers, as the card writes them
// ------------------------------------------------------------------------------------------------

/** Three significant figures, no trailing zeros, digits grouped: 25.92 -> "25.9", 274 -> "274", 0.0553 -> "0.0553". */
export function sig(value, digits = 3) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  if (n === 0) return '0';
  const r = Number(Math.abs(n).toPrecision(digits));
  const dec = Math.min(8, Math.max(0, digits - 1 - Math.floor(Math.log10(r))));
  const text = fmt.num(Math.sign(n) * r, dec);
  return dec > 0 ? text.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') : text;
}

/** What a measure's number is, in km, Earths, m/s2 ...: the value as a plain number for ordering and ratios. null where the body has none. */
export function valueOf(prop, b) {
  if (!b) return null;
  switch (prop) {
    case 'across': return 2 * b.radius_km;
    case 'mass': return Number.isFinite(b.mass_e) ? b.mass_e : null;
    case 'gravity': return Number.isFinite(b.gravity) ? b.gravity : null;
    case 'temp': {
      const c = Array.isArray(b.temp_c) ? (b.temp_c[0] + b.temp_c[1]) / 2 : b.temp_c;
      return Number.isFinite(c) ? c + 273.15 : null; // kelvin, so a ratio and a logarithm mean something
    }
    case 'spin': return Number.isFinite(b.spin_h) ? b.spin_h : null;
    case 'year': return Number.isFinite(b.year_d) ? b.year_d : null;
    case 'dist': return Number.isFinite(b.sun_mkm) && b.sun_mkm > 0 ? (b.sun_mkm * 1e6) / AU_KM : null;
    case 'moons': return Number.isFinite(b.moons) ? b.moons : null;
    default: return null;
  }
}

/** The measures the lab orders by, in the order its picker lists them. `log`: the bar is on a logarithmic scale. */
export const PROPS = [
  { id: 'across', log: true },
  { id: 'mass', log: true },
  { id: 'gravity', log: true },
  { id: 'temp', log: true },
  { id: 'spin', log: true },
  { id: 'year', log: true },
  { id: 'dist', log: true },
  { id: 'moons', log: false },
];

/** The rows of the side-by-side table, in the order they are read. */
export const TABLE_PROPS = ['across', 'mass', 'gravity', 'temp', 'spin', 'year', 'dist', 'air', 'pressure', 'moons', 'rings'];

const NONE = { num: '', unit: '', note: '', text: '' };
const dash = () => ({ ...NONE, text: COPY.compare.missing, missing: true });
const withText = (c) => ({ ...c, text: c.unit ? t(COPY.compare.numUnit, { num: c.num, unit: c.unit }) : c.num });

/** One value as the table prints it: a number (set in mono) and its unit, or words, and a note under it. */
export function cell(prop, b) {
  const C = COPY.compare;
  if (!b) return dash();
  switch (prop) {
    case 'across': return withText({ num: fmt.int(2 * b.radius_km), unit: C.units.km, note: b.temp_at === 'bar1' ? C.notes.flattened : '' });
    case 'mass': {
      const e = b.mass_e;
      return withText({ num: sig(e), unit: e === 1 ? C.units.earthOne : C.units.earths, note: '' });
    }
    case 'gravity': {
      const note = b.temp_at === 'bar1' ? C.notes.bar1 : b.temp_at === 'effective' ? C.notes.edge : '';
      return withText({ num: sig(b.gravity), unit: C.units.g, note });
    }
    case 'temp': {
      const note = b.temp_at === 'bar1' ? C.notes.bar1 : b.temp_at === 'effective' ? C.notes.photosphere : Array.isArray(b.temp_c) ? C.notes.range : C.notes.average;
      const num = Array.isArray(b.temp_c) ? t(C.range, { a: fmt.int(b.temp_c[0]), b: fmt.int(b.temp_c[1]) }) : fmt.int(b.temp_c);
      return withText({ num, unit: C.units.c, note });
    }
    case 'spin': {
      if (!Number.isFinite(b.spin_h)) return dash();
      const h = b.spin_h;
      const note = b.world === 'sun' ? C.notes.sunSpin : b.retro ? C.notes.retro : '';
      return withText(h < 48 ? { num: sig(h), unit: C.units.hours, note } : { num: sig(h / 24), unit: C.units.days, note });
    }
    case 'year': {
      if (!Number.isFinite(b.year_d)) return dash();
      const d = b.year_d;
      return withText(d < 1000 ? { num: sig(d), unit: C.units.days, note: '' } : { num: sig(d / 365.25), unit: C.units.years, note: '' });
    }
    case 'dist': {
      const au = valueOf('dist', b);
      if (au === null) return dash();
      return withText({ num: sig(au), unit: C.units.au, note: b.world === 'moon' ? C.notes.withEarth : '' });
    }
    case 'air': {
      if (b.exosphere) return { ...NONE, text: C.air.almostNone, note: C.notes.exosphere };
      if (!b.air || !b.air.length) return dash();
      const parts = b.air.map(([gas, share]) => t(C.air.part, { share: sig(share), gas: C.gas[gas] || gas }));
      return { ...NONE, text: parts.join(C.air.join), note: b.world === 'sun' ? C.notes.photosphereAir : '' };
    }
    case 'pressure': {
      if (b.exosphere) return { ...NONE, text: C.air.almostNone, note: '' };
      if (b.air_bar === null || b.air_bar === undefined) return { ...NONE, text: C.air.noSurface, note: '' };
      const bar = b.air_bar;
      if (bar < 0.001) return withText({ num: sig(bar * 1e6, 2), unit: C.units.microbar, note: '' });
      return withText({ num: sig(bar, bar < 1 ? 2 : 3), unit: C.units.bar, note: '' });
    }
    case 'moons': {
      if (!Number.isFinite(b.moons)) return dash();
      return b.moons === 0 ? { ...NONE, text: C.none } : withText({ num: fmt.int(b.moons), unit: '', note: '' });
    }
    case 'rings': return { ...NONE, text: b.rings ? C.yes : C.no };
    default: return dash();
  }
}

/** The table: one row for each measure. */
export function rowsFor(a, b) {
  return TABLE_PROPS.map((prop) => ({ prop, label: COPY.compare.rows[prop], a: cell(prop, a), b: cell(prop, b) }));
}

const nameOf = (id) => COPY.compare.names[id] || id;
const theName = (id) => COPY.compare.the[id] || nameOf(id);
const upFirst = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** "Jupiter is 11 times as wide as Earth." From the wider one's side, always. */
export function widerSentence(a, b) {
  const C = COPY.compare;
  const ra = a.radius_km;
  const rb = b.radius_km;
  const ratio = Math.max(ra, rb) / Math.min(ra, rb);
  if (ratio < 1.05) return upFirst(t(C.same, { a: theName(a.world), b: theName(b.world) }));
  const [big, small] = ra >= rb ? [a, b] : [b, a];
  const n = ratio >= 10 ? fmt.int(Math.round(ratio)) : sig(ratio, 2);
  return upFirst(t(C.wider, { big: theName(big.world), n, small: theName(small.world) }));
}

// ------------------------------------------------------------------------------------------------
// The picture: where each disc and ring is drawn
// ------------------------------------------------------------------------------------------------

/** How far a body reaches from its centre, in km: its rings if it has them. */
export function extentKm(b) {
  const out = (b.ring_bands || []).reduce((m, r) => Math.max(m, r[1]), 0);
  return Math.max(b.radius_km, out);
}

/**
 * Two bodies in a box `w` by `h` px. `mode` 'true': one scale for both (px per km), as big as fits. 'same':
 * both radii the same, each body's rings in the same proportion to its own radius; not to scale. A body
 * under MIN_R px is drawn at MIN_R and flagged `tiny`. Pure.
 */
export const MIN_R = 1.5;
const MARGIN = 12;
/** The picture's own box. It is a vector drawing scaled to the card's width, so the layout does not depend on the screen. */
export const VIEW_W = 320;
export const VIEW_H = 148;
export function layout(a, b, mode, w = 320, h = 150, gap = 24) {
  // A margin round the picture, so nothing touches the frame it is drawn in.
  const inW = w - 2 * MARGIN;
  const inH = h - 2 * MARGIN;
  const ea = extentKm(a);
  const eb = extentKm(b);
  let sa;
  let sb;
  if (mode === 'same') {
    const k = Math.min(inH / 2, (inW - gap) / (2 * (ea / a.radius_km + eb / b.radius_km)));
    sa = k / a.radius_km;
    sb = k / b.radius_km;
  } else {
    const tallest = Math.max(a.radius_km, b.radius_km, ea * TILT, eb * TILT);
    sa = sb = Math.min((inW - gap) / (2 * (ea + eb)), inH / 2 / tallest);
  }
  // A body under MIN_R px is drawn as a dot of MIN_R, so the dot's width is what the pair is centred on.
  const widthA = 2 * Math.max(ea * sa, MIN_R);
  const widthB = 2 * Math.max(eb * sb, MIN_R);
  const space = Math.max(0, Math.min(gap, inW - widthA - widthB));
  const x0 = (w - (widthA + space + widthB)) / 2;
  const one = (body, s, cx) => {
    const r = body.radius_km * s;
    return {
      id: body.world,
      cx,
      cy: h / 2,
      r: Math.max(r, MIN_R),
      tiny: r < MIN_R,
      bands: (body.ring_bands || []).map(([i, o, weight]) => ({ inner: i * s, outer: o * s, weight })),
    };
  };
  return { w, h, mode, bodies: [one(a, sa, x0 + widthA / 2), one(b, sb, x0 + widthA + space + widthB / 2)] };
}

// ------------------------------------------------------------------------------------------------
// The lab: every world on one measure
// ------------------------------------------------------------------------------------------------

/**
 * The bodies that have a value for `prop`, longest bar first. `frac` is the bar's share of the box
 * (never under 0.03, so a small value is still a mark); on a logarithmic scale it runs from the smallest
 * value to the largest. Pure.
 */
export function labRows(prop, openId = null) {
  const spec = PROPS.find((p) => p.id === prop) || PROPS[0];
  const rows = ORDER.map((id) => ({ id, body: BODY.get(id), value: valueOf(prop, BODY.get(id)) })).filter((r) => r.value !== null);
  const pos = rows.map((r) => r.value).filter((v) => v > 0);
  const lo = Math.min(...pos);
  const hi = Math.max(...pos);
  for (const r of rows) {
    let f;
    if (spec.log) f = hi > lo && r.value > 0 ? (Math.log(r.value) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) : 1;
    else f = hi > 0 ? r.value / hi : 0;
    r.frac = Math.max(0.03, Math.min(1, f));
    r.cell = cell(prop, r.body);
    r.open = r.id === openId;
  }
  return rows.sort((x, y) => (y.value - x.value) || ORDER.indexOf(x.id) - ORDER.indexOf(y.id));
}

// ------------------------------------------------------------------------------------------------
// DOM
// ------------------------------------------------------------------------------------------------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, String(v));
  return node;
}

/** A value in a cell: the number in mono, the unit in the sans, the note under it in the dim grey. */
function paintCell(td, c) {
  if (c.num) {
    td.appendChild(el('span', 'sr-vs__num', c.num));
    if (c.unit) td.append(document.createTextNode(SPACE), el('span', 'sr-vs__unit', c.unit));
  } else {
    td.appendChild(el('span', c.missing ? 'sr-vs__dash' : 'sr-vs__words', c.text));
  }
  if (c.note) td.appendChild(el('span', 'sr-vs__note', c.note));
}

let uid = 0;

/** The picture of two bodies as an SVG: back half of any rings, the discs, front half of the rings. */
export function drawPair(lay, roles) {
  const C = COPY.compare;
  uid += 1;
  const svg = svgEl('svg', { class: 'sr-vs__svg', viewBox: `0 0 ${lay.w} ${lay.h}`, role: 'img', focusable: 'false' });
  svg.setAttribute('aria-label', t(C.figure, { a: theName(roles[0]), b: theName(roles[1]), how: lay.mode === 'same' ? C.figureSame : C.figureTrue }));
  const defs = svgEl('defs');
  const back = svgEl('clipPath', { id: `sr-vs-back-${uid}` });
  back.appendChild(svgEl('rect', { x: 0, y: 0, width: lay.w, height: lay.h / 2 }));
  const front = svgEl('clipPath', { id: `sr-vs-front-${uid}` });
  front.appendChild(svgEl('rect', { x: 0, y: lay.h / 2, width: lay.w, height: lay.h / 2 }));
  defs.append(back, front);
  svg.appendChild(defs);
  const ringShape = (body, band) => {
    const { cx, cy } = body;
    const ell = (rad) => `M${cx - rad},${cy}a${rad},${rad * TILT} 0 1,0 ${2 * rad},0a${rad},${rad * TILT} 0 1,0 ${-2 * rad},0Z`;
    if (band.outer - band.inner < 1) {
      return svgEl('ellipse', { cx, cy, rx: band.outer, ry: band.outer * TILT, class: 'sr-vs__ring sr-vs__ring--line', 'stroke-opacity': Math.min(1, band.weight + 0.2) });
    }
    return svgEl('path', { d: `${ell(band.outer)}${ell(band.inner)}`, 'fill-rule': 'evenodd', class: 'sr-vs__ring', 'fill-opacity': band.weight });
  };
  lay.bodies.forEach((body, i) => {
    const g = svgEl('g', { 'data-world': body.id });
    const rings = body.bands.length ? body.bands.map((band) => ringShape(body, band)) : [];
    if (rings.length) {
      const g1 = svgEl('g', { 'clip-path': `url(#sr-vs-back-${uid})` });
      for (const r of rings) g1.appendChild(r.cloneNode(true));
      g.appendChild(g1);
    }
    g.appendChild(svgEl('circle', { cx: body.cx, cy: body.cy, r: body.r, class: `sr-vs__disc ${i === 0 ? 'is-this' : 'is-with'}` }));
    if (rings.length) {
      const g2 = svgEl('g', { 'clip-path': `url(#sr-vs-front-${uid})` });
      for (const r of rings) g2.appendChild(r.cloneNode(true));
      g.appendChild(g2);
    }
    svg.appendChild(g);
  });
  return svg;
}

const PERSIST = new Map(); // record id -> { mode, withId, scale, prop }: kept while the page lives, written nowhere

/**
 * Fill `box` for the card of the world `record`. The state (which other body, which view) outlives a
 * repaint of the card, and nothing outlives the page.
 */
export function mountCompare(box, record, ctx = null) {
  const C = COPY.compare;
  const id = String(record && record.id || '');
  const a = BODY.get(id);
  if (!a) return { destroy() {} };
  // Its rules come with it (css/compare.css), and are not a first visit's bytes. A stand-in document has no head to put them in.
  Promise.resolve().then(() => loadCss('compare')).catch(() => {});
  const state = PERSIST.get(id) || { mode: 'pair', withId: defaultWith(id), scale: 'true', prop: 'across' };
  PERSIST.set(id, state);
  let live = true;

  function choice(labelText, options, current, onPick, group) {
    const row = el('div', 'sr-card__sky sr-vs__choice');
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', labelText);
    for (const [value, text] of options) {
      const b = el('button', 'sr-card__tool', text);
      b.type = 'button';
      b.dataset.value = value;
      b.setAttribute('aria-pressed', value === current ? 'true' : 'false');
      if (group) b.dataset.group = group;
      b.addEventListener('click', () => onPick(value));
      row.appendChild(b);
    }
    return row;
  }

  function select(labelText, options, current, onPick) {
    const wrap = el('label', 'sr-vs__field');
    wrap.appendChild(el('span', 'sr-vs__fieldlabel', labelText));
    const s = document.createElement('select');
    s.className = 'sr-vs__select';
    for (const [value, text] of options) {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = text;
      if (value === current) o.selected = true;
      s.appendChild(o);
    }
    s.addEventListener('change', () => onPick(s.value));
    wrap.appendChild(s);
    return wrap;
  }

  function foot(parts) {
    const p = el('p', 'sr-vs__source');
    p.textContent = parts.filter(Boolean).join(' ');
    return p;
  }

  function sourceLine() {
    return t(C.source, { date: timeText.utcLong(Date.parse(`${COMPARE_READ}T00:00:00Z`)) });
  }

  function paint(focusSel) {
    if (!live) return;
    box.textContent = '';
    box.classList.add('sr-vs');
    box.appendChild(choice(C.modeLabel, [['pair', C.modes.pair], ['lab', C.modes.lab]], state.mode, (v) => { state.mode = v; paint('[data-group="mode"][aria-pressed="true"]'); }, 'mode'));
    if (state.mode === 'pair') paintPair(); else paintLab();
    if (focusSel) { const f = box.querySelector(focusSel); if (f) f.focus(); }
  }

  function paintPair() {
    const b = BODY.get(state.withId) || BODY.get(defaultWith(id));
    const others = ORDER.filter((w) => w !== id);
    box.appendChild(select(C.withLabel, others.map((w) => [w, nameOf(w)]), b.world, (v) => { state.withId = v; paint('.sr-vs__select'); }));
    box.appendChild(el('p', 'sr-vs__sentence', widerSentence(a, b)));
    const lay = layout(a, b, state.scale, VIEW_W, VIEW_H);
    const fig = el('figure', 'sr-vs__figure');
    fig.appendChild(drawPair(lay, [id, b.world]));
    box.appendChild(fig);
    const names = el('div', 'sr-vs__legend');
    for (const [w, cls] of [[id, 'is-this'], [b.world, 'is-with']]) {
      const n = el('span', `sr-vs__name ${cls}`);
      n.appendChild(el('span', 'sr-vs__swatch'));
      n.appendChild(document.createTextNode(nameOf(w)));
      names.appendChild(n);
    }
    box.appendChild(names);
    box.appendChild(choice(C.scaleLabel, [['true', C.scales.true], ['same', C.scales.same]], state.scale, (v) => { state.scale = v; paint('[data-group="scale"][aria-pressed="true"]'); }, 'scale'));
    const drawn = [state.scale === 'same' ? C.drawnSame : C.drawnTrue];
    for (const body of lay.bodies) if (body.tiny) drawn.push(t(C.tiny, { name: theName(body.id) }));
    if ((a.rings || b.rings)) drawn.push(C.ringsDrawn);
    box.appendChild(el('p', 'sr-vs__drawn', drawn.join(' ')));
    const table = el('div', 'sr-vs__table');
    table.setAttribute('role', 'table');
    table.setAttribute('aria-label', t(C.tableLabel, { a: theName(id), b: theName(b.world) }));
    const head = el('div', 'sr-vs__head');
    head.setAttribute('role', 'row');
    head.append(el('span', 'sr-vs__colname is-this', nameOf(id)), el('span', 'sr-vs__colname is-with', nameOf(b.world)));
    for (const h of head.children) h.setAttribute('role', 'columnheader');
    table.appendChild(head);
    for (const row of rowsFor(a, b)) {
      const r = el('div', 'sr-vs__row');
      r.setAttribute('role', 'row');
      const label = el('div', 'sr-vs__key', row.label);
      label.setAttribute('role', 'rowheader');
      const ca = el('div', 'sr-vs__cell');
      ca.setAttribute('role', 'cell');
      paintCell(ca, row.a);
      const cb = el('div', 'sr-vs__cell');
      cb.setAttribute('role', 'cell');
      paintCell(cb, row.b);
      r.append(label, ca, cb);
      table.appendChild(r);
    }
    box.appendChild(table);
    const giants = [a, b].some((x) => x.temp_at === 'bar1');
    box.appendChild(foot([sourceLine(), giants ? C.giantNote : '', C.moonsNote]));
  }

  function paintLab() {
    box.appendChild(select(C.propLabel, PROPS.map((p) => [p.id, C.rows[p.id]]), state.prop, (v) => { state.prop = v; paint('.sr-vs__select'); }));
    const rows = labRows(state.prop, id);
    const list = el('ul', 'sr-vs__lab');
    for (const r of rows) {
      const li = el('li', 'sr-vs__labrow');
      const mine = r.id === id;
      const b = el('button', `sr-vs__labbtn${mine ? ' is-this' : ''}${r.id === state.withId ? ' is-with' : ''}`);
      b.type = 'button';
      b.dataset.world = r.id;
      if (mine) { b.setAttribute('aria-disabled', 'true'); b.title = C.thisCard; } else b.title = t(C.labTitle, { name: theName(r.id) });
      const top = el('span', 'sr-vs__labtop');
      top.appendChild(el('span', 'sr-vs__labname', nameOf(r.id)));
      const val = el('span', 'sr-vs__labval');
      paintCell(val, { ...r.cell, note: '' });
      top.appendChild(val);
      const bar = el('span', 'sr-vs__bar');
      const fill = el('span', 'sr-vs__fill');
      fill.style.width = `${(r.frac * 100).toFixed(1)}%`;
      bar.appendChild(fill);
      b.append(top, bar);
      if (!mine) b.addEventListener('click', () => { state.withId = r.id; state.mode = 'pair'; paint('.sr-vs__select'); });
      li.appendChild(b);
      list.appendChild(li);
    }
    box.appendChild(list);
    const spec = PROPS.find((p) => p.id === state.prop) || PROPS[0];
    const notes = [spec.log ? C.labLog : C.labLinear];
    if (state.prop === 'temp' || state.prop === 'gravity') notes.push(C.giantNote);
    if (state.prop === 'spin') notes.push(C.spinNote);
    box.appendChild(foot([sourceLine(), ...notes, state.prop === 'moons' ? C.moonsNote : '']));
  }

  paint();
  return { destroy() { live = false; box.textContent = ''; } };
}

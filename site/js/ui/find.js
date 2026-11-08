// ui/find.js -- Find: by property, by country and operator, by debris cloud and constellation (forge #150, #152, #153).
//
// Contract: createFind(ctx, host) -> { root, open(tab, opts), openLink(keys), close() }
//   host       the shell's `find` view (ui/shell.js host('find')): on a desktop the sidebar, on a phone the sheet at half
//   open       'property' | 'country' | 'clouds', with opts {find, owner, operator, debris, constellation, mode, chart}
//   openLink   the keys of the address that asked for it: {find, owner, operator, debris, constellation}
//
// ONE FAMILY OF PANELS. Find is a view of the sidebar like the card and the sources sheet, with the explore
// view's own tabs, rows and chips (ui.css .sr-tabs, .sr-list, .sr-chip): three tabs, one question each.
//   By property        a kind, its ranges and boxes, the questions as chips; the answer is a sortable table, and a
//                      tap on a row goes there. A planet's row opens its system side by side, to scale.
//   By country         the catalogue's owners with their flags and counts, the operators, the balance points and
//                      what has no public path; a tap lights that group on the globe (ui/findmap.js).
//   Debris and fleets  the four named breakups and nine constellations as chips; a cloud can be watched spreading.
// Every choice is a link: `#find=`, `#owner=`, `#operator=`, `#debris=`, `#constellation=` (ui/urlstate.js).
//
// THE WORK IS IN A WORKER (ui/find.worker.js): the rows of each layer are sent once, the catalogue once, and a
// question is one message. The page only draws what comes back.
//
// THE DATA IS WHAT THE MAP HAS. Stars and planets are the layers' own records; comets are the Small-Body
// Database's snapshot the comet layer reads; satellites and owners are CelesTrak's catalogue (the 7 MB the
// debris view reads, fetched when one of these is first asked for, never before).

import { COPY, t, fmt, timeText } from '../copy/en.js';
import '../copy/en.find.js';
import { loadCss } from './latercss.js';
import { load } from '../data/sources.js';
import { parseFind, findText, PRESETS, COLUMNS, FIND_KINDS, SOLAR_SYSTEM, EARTH_RADIUS_KM, chartScale } from './findcore.js';
import { ownerOf, flagHref, OPERATORS, operatorById, COUNTRY_SLUG } from '../data/owners.js';
import { CLOUDS, CONSTELLATIONS, cloudById, constellationById, recordInCloud, recordInConstellation } from '../data/clouds.js';
import { EPHEMERIDES } from '../data/ephemerides.js';
import { createHighlight } from './findmap.js';
import * as urlstate from './urlstate.js';

const TABS = ['property', 'country', 'clouds'];
const MODES = ['countries', 'operators', 'points', 'nopath'];
const LY_KM = 9460730472580.8;
const ROWS_SHOWN = 100;
const OWNERS_SHOWN = 120;
const LINK_KEYS = ['find', 'owner', 'operator', 'debris', 'constellation'];
const SVG_NS = 'http://www.w3.org/2000/svg';
const STEP_MS = { event: 0, week: 7 * 86400e3, year: 365.25 * 86400e3 };
const PLAY_MS = 20000;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}
function button(className, text, title) {
  const b = el('button', className, text);
  b.type = 'button';
  if (title) b.title = title;
  return b;
}
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const lang = () => (document.documentElement.lang || 'en');

/** A country's name in the visitor's language, from its ISO code; the catalogue's English where the browser has none. */
function regionName(iso, fallback) {
  try { return new Intl.DisplayNames([lang(), 'en'], { type: 'region' }).of(iso) || fallback; } catch { return fallback; }
}
/** What an owner is called on screen. */
function ownerName(owner) {
  if (!owner) return COPY.owners.unknown;
  if (owner.kind === 'country') return regionName(owner.iso, owner.name);
  if (owner.kind === 'joint' && owner.parts.length === 2) return t(COPY.owners.joint, { a: regionName(owner.parts[0], owner.parts[0]), b: regionName(owner.parts[1], owner.parts[1]) });
  if (owner.kind === 'unknown') return COPY.owners.unknown;
  return owner.name;
}
function flags(owner) {
  const wrap = el('span', 'sr-find__flags');
  wrap.setAttribute('aria-hidden', 'true');
  const isos = owner ? (owner.kind === 'joint' ? owner.parts : owner.kind === 'country' ? [owner.iso] : []) : [];
  for (const iso of isos) {
    const href = flagHref(iso);
    if (!href) continue;
    const img = document.createElement('img');
    img.className = 'sr-find__flag';
    img.src = new URL(`../../${href}`, import.meta.url).href;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 21;
    img.height = 14;
    wrap.appendChild(img);
  }
  if (!wrap.childElementCount) wrap.appendChild(el('span', 'sr-find__noflag'));
  return wrap;
}
/** The present: the time pill's last live instant (the map never reads the wall clock but through ctx.clock). */
function presentFor(ctx) {
  const a = ctx.timePill && typeof ctx.timePill.anchor === 'function' ? ctx.timePill.anchor() : NaN;
  return Number.isFinite(a) ? a : ctx.clock.now();
}
const normName = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function createFind(ctx, host) {
  const F = COPY.find;
  const O = COPY.owners;
  const B = COPY.breakups;
  loadCss('find');
  const hl = createHighlight(ctx);
  const presentMs = () => presentFor(ctx);
  const root = el('div', 'sr-find');
  root.setAttribute('aria-label', F.label);
  (host || document.body).appendChild(root);

  // --- the worker ---------------------------------------------------------------------------------
  let worker = null;
  let seq = 0;
  const waiting = new Map();
  function ask(msg) {
    if (!worker) {
      worker = new Worker(new URL('./find.worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        const w = waiting.get(e.data && e.data.id);
        if (!w) return;
        waiting.delete(e.data.id);
        if (e.data.ok) w.resolve(e.data); else w.reject(new Error(e.data.error));
      };
      worker.onerror = (e) => { for (const w of waiting.values()) w.reject(e); waiting.clear(); worker = null; sent.clear(); catalogueAsk = null; };
    }
    const id = ++seq;
    return new Promise((resolve, reject) => { waiting.set(id, { resolve, reject }); worker.postMessage({ ...msg, id }); });
  }

  // --- the data, sent once each ---------------------------------------------------------------------
  const sent = new Map();
  let catalogueAsk = null;
  let catalogueAsOf = null;
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
  const slim = {
    stars: (r) => ({ id: r.id, name: r.name, pos: r.pos, meta: { distLy: r.meta && r.meta.distLy, spect: r.meta && r.meta.spect, mag: r.meta && r.meta.mag, lum: r.meta && r.meta.lum } }),
    exoplanets: (r) => { const m = r.meta || {}; return { id: r.id, name: r.name, pos: r.pos, meta: { host: m.host, distLy: m.distLy, radiusEarths: m.radiusEarths, massEarths: m.massEarths, periodDays: m.periodDays, starTeffK: m.starTeffK, starRadiusSuns: m.starRadiusSuns, discYear: m.discYear } }; },
  };
  function catalogue() {
    if (catalogueAsk) return catalogueAsk;
    catalogueAsk = load('celestrak-satcat', { await: true }).then((res) => {
      const csv = res && typeof res.data === 'string' ? res.data : null;
      if (!csv) throw new Error('no catalogue');
      catalogueAsOf = Number.isFinite(res.fetchedAt) ? res.fetchedAt : ctx.clock.now();
      return ask({ type: 'catalogue', csv });
    }).catch((e) => { catalogueAsk = null; throw e; });
    return catalogueAsk;
  }
  function ensureKind(kind) {
    if (sent.has(kind)) return sent.get(kind);
    let p;
    if (kind === 'satellites') p = catalogue();
    else if (kind === 'comets') {
      p = load('jpl-sbdb-comets', { await: true }).then((res) => import('../data/parsers.js').then((P) => {
        const recs = P.parseComets(res && res.data);
        return ask({ type: 'rows', kind, items: recs.map((r) => ({ id: r.id, name: r.name, meta: { qAu: r.meta.qAu, perihelionMs: r.meta.perihelionMs, eccentricity: r.meta.eccentricity, periodDays: r.meta.periodDays } })) });
      }));
    } else p = whenLayer(kind).then(() => ask({ type: 'rows', kind, items: (ctx.recordsFor(kind) || []).map(slim[kind]) }));
    p = p.catch((e) => { sent.delete(kind); throw e; });
    sent.set(kind, p);
    return p;
  }

  // --- the head: title and tabs -------------------------------------------------------------------
  const head = el('div', 'sr-find__head');
  head.appendChild(el('h2', 'sr-micro', F.title));
  const tabs = el('div', 'sr-tabs sr-find__tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', F.label);
  head.appendChild(tabs);
  root.appendChild(head);
  const panes = new Map();
  const tabBtns = new Map();
  for (const id of TABS) {
    const b = button('sr-tabs__tab', F.tabs[id]);
    b.setAttribute('role', 'tab');
    b.id = `sr-find-tab-${id}`;
    b.setAttribute('aria-controls', `sr-find-pane-${id}`);
    b.addEventListener('click', () => setTab(id));
    tabs.appendChild(b);
    tabBtns.set(id, b);
    const pane = el('div', 'sr-find__pane');
    pane.id = `sr-find-pane-${id}`;
    pane.setAttribute('role', 'tabpanel');
    pane.setAttribute('aria-labelledby', b.id);
    pane.hidden = true;
    root.appendChild(pane);
    panes.set(id, pane);
  }
  tabs.addEventListener('keydown', (e) => {
    const i = TABS.indexOf(st.tab);
    const to = e.key === 'ArrowRight' ? TABS[(i + 1) % TABS.length] : e.key === 'ArrowLeft' ? TABS[(i + TABS.length - 1) % TABS.length] : e.key === 'Home' ? TABS[0] : e.key === 'End' ? TABS[TABS.length - 1] : null;
    if (!to) return;
    e.preventDefault();
    setTab(to);
    tabBtns.get(to).focus();
  });

  const st = { tab: null, q: parseFind(PRESETS[0].find), mode: 'countries', lists: null, owner: null, cloud: null, fleet: null, play: 0, chart: null };

  function setTab(id) {
    if (!TABS.includes(id)) return;
    st.tab = id;
    for (const [k, b] of tabBtns) {
      const on = k === id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      panes.get(k).hidden = !on;
    }
    if (id === 'property') paintProperty();
    else if (id === 'country') paintCountry();
    else paintClouds();
  }

  function writeLink(patch) {
    const clear = {};
    for (const k of LINK_KEYS) clear[k] = null;
    try { urlstate.write({ ...clear, ...patch }); } catch { /* the panel works without the address bar */ }
  }

  // ===================================================================================================
  // BY PROPERTY
  // ===================================================================================================
  const prop = panes.get('property');
  const kindRow = el('div', 'sr-find__kinds');
  kindRow.setAttribute('role', 'radiogroup');
  kindRow.setAttribute('aria-label', F.kindsLabel);
  const kindBtns = new Map();
  for (const k of FIND_KINDS) {
    const b = button('sr-chip sr-find__kind', F.kinds[k]);
    b.setAttribute('role', 'radio');
    b.addEventListener('click', () => { st.q = { kind: k }; if (k === 'exoplanets' || k === 'stars') st.q.withinLy = k === 'stars' ? 20 : 100; paintProperty(); run(); });
    kindRow.appendChild(b);
    kindBtns.set(k, b);
  }
  prop.appendChild(kindRow);
  const presetHead = el('h3', 'sr-micro', F.presetsLabel);
  const presetRow = el('div', 'sr-find__chips');
  for (const p of PRESETS) {
    const b = button('sr-chip sr-find__preset', F.presets[p.id]);
    b.dataset.preset = p.id;
    b.addEventListener('click', () => { st.q = parseFind(p.find); paintProperty(); run(); });
    presetRow.appendChild(b);
  }
  prop.append(presetHead, presetRow);
  // The answer comes before the knobs: a question's chips, then what it found, then the ranges to refine it.
  const status = el('p', 'sr-find__status');
  status.setAttribute('role', 'status');
  prop.appendChild(status);
  const tableWrap = el('div', 'sr-find__tablewrap');
  prop.appendChild(tableWrap);
  const chartHost = el('div', 'sr-find__chart');
  chartHost.hidden = true;
  prop.appendChild(chartHost);
  const refine = el('details', 'sr-find__refine');
  refine.appendChild(el('summary', 'sr-micro', F.refine));
  const form = el('div', 'sr-find__form');
  refine.appendChild(form);
  prop.appendChild(refine);
  const honesty = el('p', 'sr-sect__note sr-find__honesty');
  prop.appendChild(honesty);
  const linkBtn = button('sr-btn sr-btn--quiet sr-find__link', F.copyLink);
  linkBtn.addEventListener('click', () => {
    const url = `${location.origin}${location.pathname}#find=${encodeURIComponent(findText(st.q))}`;
    const done = () => { linkBtn.textContent = F.copied; setTimeout(() => { linkBtn.textContent = F.copyLink; }, 1600); };
    try { navigator.clipboard.writeText(url).then(done, done); } catch { done(); }
  });
  prop.appendChild(linkBtn);

  function rangeField(key, label, step = 'any') {
    const wrap = el('div', 'sr-find__field');
    const id = `sr-find-${key}`;
    const lab = el('span', 'sr-find__label', label);
    lab.id = `${id}-label`;
    wrap.appendChild(lab);
    const r = Array.isArray(st.q[key]) ? st.q[key] : [null, null];
    const pair = el('span', 'sr-find__pair');
    const mk = (i, word) => {
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.inputMode = 'decimal';
      inp.step = step;
      inp.className = 'sr-find__num';
      inp.setAttribute('aria-label', t(F.fields.range, { label, word }));
      inp.placeholder = word;
      inp.value = r[i] === null || r[i] === undefined ? '' : String(r[i]);
      inp.addEventListener('change', () => {
        const v = inp.value.trim() === '' ? null : Number(inp.value);
        const next = Array.isArray(st.q[key]) ? [...st.q[key]] : [null, null];
        next[i] = Number.isFinite(v) ? v : null;
        if (next[0] === null && next[1] === null) delete st.q[key]; else st.q[key] = next;
        run();
      });
      return inp;
    };
    pair.append(mk(0, F.fields.from), el('span', 'sr-find__dash', '–'), mk(1, F.fields.to));
    wrap.appendChild(pair);
    return wrap;
  }
  function boxField(key, label) {
    const lab = el('label', 'sr-find__box');
    const inp = document.createElement('input');
    inp.type = 'checkbox';
    inp.checked = !!st.q[key];
    inp.addEventListener('change', () => { if (inp.checked) st.q[key] = true; else delete st.q[key]; run(); });
    lab.append(inp, el('span', null, label));
    return lab;
  }
  function withinField() {
    const wrap = el('div', 'sr-find__field');
    const lab = el('label', 'sr-find__label', F.fields.within);
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.min = '0';
    inp.step = 'any';
    inp.inputMode = 'decimal';
    inp.className = 'sr-find__num';
    inp.id = 'sr-find-within';
    lab.htmlFor = inp.id;
    inp.value = st.q.withinLy ? String(st.q.withinLy) : '';
    inp.addEventListener('change', () => { const v = Number(inp.value); if (v > 0) st.q.withinLy = v; else delete st.q.withinLy; run(); });
    wrap.append(lab, inp);
    return wrap;
  }
  function selectField(key, label, options) {
    const wrap = el('div', 'sr-find__field');
    const lab = el('label', 'sr-find__label', label);
    const sel = document.createElement('select');
    sel.className = 'sr-find__select';
    sel.id = `sr-find-${key}`;
    lab.htmlFor = sel.id;
    const any = document.createElement('option');
    any.value = '';
    any.textContent = F.fields.any;
    sel.appendChild(any);
    for (const [value, text] of options) {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = text;
      sel.appendChild(o);
    }
    sel.value = st.q[key] || '';
    sel.addEventListener('change', () => { if (sel.value) st.q[key] = sel.value; else delete st.q[key]; run(); });
    wrap.append(lab, sel);
    return wrap;
  }

  function paintProperty() {
    const q = st.q;
    for (const [k, b] of kindBtns) { b.setAttribute('aria-checked', k === q.kind ? 'true' : 'false'); b.classList.toggle('is-on', k === q.kind); }
    const text = findText(q);
    // The questions of this kind only; a question asked opens no knobs, one typed into them keeps them open.
    let asked = false;
    for (const b of presetRow.children) {
      const p = PRESETS.find((x) => x.id === b.dataset.preset);
      const on = p.find === text;
      asked = asked || on;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.hidden = parseFind(p.find).kind !== q.kind;
    }
    presetHead.hidden = ![...presetRow.children].some((b) => !b.hidden);
    if (!asked && !refine.open && Object.keys(q).length > 2) refine.open = true;
    form.textContent = '';
    if (q.kind === 'stars' || q.kind === 'exoplanets') { form.appendChild(withinField()); form.appendChild(boxField('fromCamera', F.fields.fromHere)); }
    if (q.kind === 'exoplanets') {
      form.append(rangeField('radius', F.fields.radius), rangeField('mass', F.fields.mass), rangeField('teq', F.fields.teq), rangeField('insol', F.fields.insol));
      form.append(boxField('zone', F.fields.zone), boxField('zoneWide', F.fields.zoneWide), boxField('rocky', F.fields.rocky));
    }
    if (q.kind === 'satellites') {
      const owners = (st.lists ? st.lists.owners : []).slice(0, OWNERS_SHOWN).map((g) => [g.key, ownerName(g.owner)]);
      form.append(selectField('owner', F.fields.owner, owners), selectField('operator', F.fields.operator, OPERATORS.map((o) => [o.id, o.name])));
      form.append(rangeField('height', F.fields.height, '1'), rangeField('year', F.fields.year, '1'), boxField('working', F.fields.working));
    }
    if (q.kind === 'comets') form.appendChild(rangeField('perihelion', F.fields.perihelion, '1'));
    honesty.textContent = q.kind === 'satellites' ? t(F.honesty.satellites, { date: catalogueAsOf ? timeText.utcLong(catalogueAsOf) : '…' }) : F.honesty[q.kind];
  }

  /** Where "within N ly of the camera" is measured from: the camera on a rung of the ladder, else the Sun. */
  function origin() {
    try {
      if (ctx.stage && ctx.stage.frame === 'sun-inertial' && ctx.camera) {
        const p = ctx.stage.fromScene(ctx.camera.position);
        return { x: p.x / LY_KM, y: p.y / LY_KM, z: p.z / LY_KM };
      }
    } catch { /* the Sun, then */ }
    return { x: 0, y: 0, z: 0 };
  }

  let runSeq = 0;
  async function run() {
    const mine = ++runSeq;
    const q = st.q;
    writeLink({ find: findText(q) });
    status.textContent = F.loading;
    try {
      await ensureKind(q.kind);
      if (mine !== runSeq) return;
      if (q.kind === 'satellites' && !st.lists) { st.lists = await ask({ type: 'owners' }); paintProperty(); }
      status.textContent = F.looking;
      const res = await ask({ type: 'query', q, origin: origin(), limit: ROWS_SHOWN });
      if (mine !== runSeq) return;
      paintTable(q, res);
      status.textContent = !res.total ? F.none : res.total > res.rows.length ? t(F.statusSome, { n: fmt.int(res.total), shown: fmt.int(res.rows.length) }) : t(F.status, { n: fmt.int(res.total) });
    } catch (e) {
      if (mine !== runSeq) return;
      console.warn('find did not run', e);
      status.textContent = F.failed;
    }
  }

  function cell(q, row, key) {
    const v = row[key];
    if (key === 'name') return row.name;
    if (v === null || v === undefined) return '–';
    if (key === 'dist') return fmt.num(v, v < 10 ? 2 : 1);
    if (key === 'radius' || key === 'insol') return fmt.smart(v) + (row.how === 'modelled' && key === 'insol' ? '*' : '');
    if (key === 'teq') return fmt.int(v) + (row.how === 'modelled' ? '*' : '');
    if (key === 'zone') return (F.zones[v] || v) + (row.how === 'modelled' ? '*' : '');
    if (key === 'owner') return ownerName(ownerOf(v));
    if (key === 'height') return fmt.int(v);
    if (key === 'year') return String(v);
    if (key === 'perihelion') return row.perihelionMs ? timeText.utcLong(row.perihelionMs) : '–';
    if (key === 'qAu') return fmt.num(v, 3);
    if (key === 'mag') return fmt.num(v, 2);
    return String(v);
  }

  function goToRow(q, row) {
    const id = q.kind === 'satellites' ? `sat-${row.norad}` : row.id;
    const rec = typeof ctx.recordById === 'function' ? ctx.recordById(id) : null;
    const go = (r) => {
      if (r.layer && typeof ctx.isLayerOn === 'function' && !ctx.isLayerOn(r.layer) && typeof ctx.setLayerOn === 'function') {
        ctx.setLayerOn(r.layer, true);
        document.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id: r.layer, on: true, handled: true, from: 'find' } }));
      }
      ctx.select(r);
    };
    if (rec) { go(rec); return true; }
    if (q.kind === 'satellites') {
      whenLayer('active').then(() => { const r = ctx.recordById(id); if (r) go(r); else status.textContent = t(F.rowTitle, { name: row.name }) + COPY.punctuation.sentenceJoin + F.noRecord; });
      return true;
    }
    status.textContent = F.noRecord;
    return false;
  }

  function paintTable(q, res) {
    tableWrap.textContent = '';
    if (!res.rows.length) return;
    const cols = COLUMNS[q.kind];
    const table = el('table', 'sr-find__table');
    table.setAttribute('aria-label', F.tableLabel);
    const thead = el('thead');
    const hr = el('tr');
    const sortKey = q.sort || (q.kind === 'satellites' ? 'height' : q.kind === 'comets' ? 'perihelion' : 'dist');
    for (const c of cols) {
      const th = el('th');
      th.scope = 'col';
      const b = button('sr-find__sort', F.columns[c.key], t(F.sortTitle, { col: F.columns[c.key] }));
      if (c.key === sortKey) th.setAttribute('aria-sort', q.desc ? 'descending' : 'ascending');
      b.addEventListener('click', () => {
        if (st.q.sort === c.key || (!st.q.sort && c.key === sortKey)) { if (st.q.desc) delete st.q.desc; else st.q.desc = true; }
        else { st.q.sort = c.key; delete st.q.desc; }
        run().then(() => { const again = tableWrap.querySelectorAll('.sr-find__sort')[cols.indexOf(c)]; if (again) again.focus({ preventScroll: true }); });
      });
      th.appendChild(b);
      hr.appendChild(th);
    }
    thead.appendChild(hr);
    table.appendChild(thead);
    const tbody = el('tbody');
    for (const row of res.rows) {
      const tr = el('tr');
      for (const c of cols) {
        const td = el(c.key === 'name' ? 'th' : 'td');
        if (c.key === 'name') {
          td.scope = 'row';
          const b = button('sr-find__go', row.name, t(F.rowTitle, { name: row.name }));
          b.addEventListener('click', (e) => { e.stopPropagation(); goToRow(q, row); });
          td.appendChild(b);
          if (q.kind === 'exoplanets' && row.host) {
            const ch = button('sr-find__chartbtn', F.chart.open, t(F.chart.openTitle, { host: row.host }));
            ch.addEventListener('click', (e) => { e.stopPropagation(); openChart(row.host, row.id); });
            td.appendChild(ch);
          }
        } else {
          td.textContent = cell(q, row, c.key);
          if (row.how === 'modelled' && (c.key === 'teq' || c.key === 'zone' || c.key === 'insol')) td.title = F.modelled;
        }
        tr.appendChild(td);
      }
      tr.addEventListener('click', () => goToRow(q, row));
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    tableWrap.appendChild(table);
  }

  // --- the system chart: side by side, to one scale -------------------------------------------------
  async function openChart(host, focusId) {
    chartHost.textContent = '';
    chartHost.hidden = false;
    let bodies;
    let title;
    if (!host) {
      title = F.chart.ours;
      const names = Object.fromEntries((ctx.records ? ctx.records() : []).filter((r) => r.klass === 'world').map((r) => [r.id, r.name]));
      bodies = SOLAR_SYSTEM.map((b) => ({ id: b.id, name: names[b.id] || b.id, radiusEarths: b.radiusKm / EARTH_RADIUS_KM, aAu: b.aAu }));
    } else {
      title = host;
      const res = await ask({ type: 'query', q: { kind: 'exoplanets', sort: 'aAu' }, limit: 100000 }).catch(() => ({ rows: [] }));
      bodies = res.rows.filter((r) => r.host === host).map((r) => ({ id: r.id, name: r.name, radiusEarths: r.radius, aAu: r.aAu }));
      // The Earth beside them, at the same scale, so "1.3 Earths" can be seen; its name is the map's own record's.
      const earth = typeof ctx.recordById === 'function' ? ctx.recordById('earth') : null;
      bodies.push({ id: 'earth', name: earth ? earth.name : '', radiusEarths: 1, reference: true });
    }
    const W = 320;
    const maxR = 34;
    const placed = chartScale(bodies, { maxR, gap: 8 });
    const width = Math.max(W, placed.length ? placed[placed.length - 1].xPx + placed[placed.length - 1].rPx + 8 : W);
    const H = maxR * 2 + 44;
    const head = el('div', 'sr-find__charthead');
    head.appendChild(el('h3', 'sr-micro', t(F.chart.title, { host: title })));
    const close = button('sr-find__chartclose', '×', F.chart.close);
    close.setAttribute('aria-label', F.chart.close);
    close.addEventListener('click', () => { chartHost.hidden = true; chartHost.textContent = ''; st.chart = null; });
    head.appendChild(close);
    chartHost.appendChild(head);
    const scroll = el('div', 'sr-find__chartscroll');
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${H}`);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(H));
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', t(F.chart.label, { host: title }));
    const base = maxR + 6;
    bodies.forEach((b, i) => {
      const p = placed[i];
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', (p.xPx + 4).toFixed(1));
      c.setAttribute('cy', (base + maxR - p.rPx).toFixed(1));
      c.setAttribute('r', p.rPx.toFixed(1));
      c.setAttribute('class', `sr-find__body${p.guessed ? ' is-guessed' : ''}${b.id === focusId ? ' is-focus' : ''}${b.reference ? ' is-reference' : ''}`);
      svg.appendChild(c);
      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', (p.xPx + 4).toFixed(1));
      label.setAttribute('y', String(base + maxR + 16));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'sr-find__bodyname');
      const short = host && b.name.startsWith(host) ? b.name.slice(host.length).trim() || b.name : b.name;
      label.textContent = short;
      svg.appendChild(label);
      const sub = document.createElementNS(SVG_NS, 'text');
      sub.setAttribute('x', (p.xPx + 4).toFixed(1));
      sub.setAttribute('y', String(base + maxR + 30));
      sub.setAttribute('text-anchor', 'middle');
      sub.setAttribute('class', 'sr-find__bodysub');
      sub.textContent = b.aAu > 0 ? t(COPY.card.values.au, { n: fmt.smart(b.aAu) }) : '';
      svg.appendChild(sub);
    });
    scroll.appendChild(svg);
    chartHost.appendChild(scroll);
    chartHost.appendChild(el('p', 'sr-sect__note', F.chart.note));
    st.chart = host || 'sun';
  }

  // ===================================================================================================
  // BY COUNTRY
  // ===================================================================================================
  const country = panes.get('country');
  const modeRow = el('div', 'sr-find__chips sr-find__modes');
  modeRow.setAttribute('role', 'radiogroup');
  modeRow.setAttribute('aria-label', O.modesLabel);
  const modeBtns = new Map();
  for (const m of MODES) {
    const b = button('sr-chip', O.modes[m]);
    b.setAttribute('role', 'radio');
    b.addEventListener('click', () => { st.mode = m; paintCountry(); });
    modeRow.appendChild(b);
    modeBtns.set(m, b);
  }
  country.appendChild(modeRow);
  // The chosen group's detail sits above the list: on a phone the sheet at half does not scroll, and what was
  // tapped (or what a link named) must be what is in sight.
  const detail = el('div', 'sr-find__detail');
  detail.hidden = true;
  country.appendChild(detail);
  const countryBody = el('div', 'sr-find__countrybody');
  country.appendChild(countryBody);
  const countrySource = el('p', 'sr-sect__note');
  country.appendChild(countrySource);

  async function lists() {
    if (st.lists) return st.lists;
    await catalogue();
    st.lists = await ask({ type: 'owners' });
    return st.lists;
  }

  async function paintCountry() {
    for (const [m, b] of modeBtns) { b.setAttribute('aria-checked', m === st.mode ? 'true' : 'false'); b.classList.toggle('is-on', m === st.mode); }
    if (!st.lists) {
      countryBody.textContent = '';
      const p = el('p', 'sr-find__status', O.reading);
      p.setAttribute('role', 'status');
      countryBody.appendChild(p);
      try { await lists(); } catch {
        countryBody.textContent = '';
        countryBody.appendChild(el('p', 'sr-find__status', O.failed));
        const again = button('sr-more', O.retry);
        again.addEventListener('click', () => paintCountry());
        countryBody.appendChild(again);
        return;
      }
    }
    countrySource.textContent = t(O.source, { date: catalogueAsOf ? timeText.utcLong(catalogueAsOf) : '…' });
    countryBody.textContent = '';
    const L = st.lists;
    if (st.mode === 'countries') {
      countryBody.appendChild(el('p', 'sr-find__lead', t(O.lead, { n: fmt.int(L.owners.length), total: fmt.int(L.total) })));
      const list = el('ul', 'sr-list sr-find__owners');
      for (const g of L.owners.slice(0, OWNERS_SHOWN)) list.appendChild(groupRow(g, 'owner', g.key, ownerName(g.owner), g.owner));
      countryBody.appendChild(list);
    } else if (st.mode === 'operators') {
      const list = el('ul', 'sr-list sr-find__owners');
      for (const g of L.operators) {
        const op = operatorById(g.key);
        if (!op) continue;
        const li = groupRow(g, 'operator', g.key, op.name, null);
        if (!op.owners) { const tag = el('span', 'sr-find__tag', O.byName); tag.title = O.byNameTitle; li.querySelector('.sr-find__rowname').appendChild(tag); }
        list.appendChild(li);
      }
      countryBody.appendChild(list);
    } else if (st.mode === 'points') {
      for (const p of L.lagrange) {
        const sect = el('section', 'sr-find__point');
        sect.appendChild(el('h3', 'sr-find__pointname', O.points[p.id]));
        sect.appendChild(el('p', 'sr-sect__note', O.points[`${p.id}Why`]));
        const list = el('ul', 'sr-list');
        if (!p.rows.length) list.appendChild(el('li', 'sr-list__row sr-list__static', O.points.empty));
        for (const r of p.rows) list.appendChild(craftRow(r, r.launchMs ? String(new Date(r.launchMs).getUTCFullYear()) : ''));
        sect.appendChild(list);
        countryBody.appendChild(sect);
      }
    } else {
      const all = [];
      for (const g of L.owners) if (g.noPath) all.push(g);
      const n = all.reduce((s, g) => s + g.noPath, 0);
      countryBody.appendChild(el('p', 'sr-find__lead', t(O.nopathLead, { n: fmt.int(n) })));
      const list = el('ul', 'sr-list sr-find__owners');
      for (const g of all.sort((a, b) => b.noPath - a.noPath)) {
        const li = groupRow({ ...g, total: g.noPath }, 'owner', g.key, ownerName(g.owner), g.owner, true);
        list.appendChild(li);
      }
      countryBody.appendChild(list);
    }
  }

  function groupRow(g, by, key, name, owner, noPathCount = false) {
    const li = el('li', 'sr-list__row');
    const b = button('sr-list__btn sr-find__ownerbtn');
    b.title = t(O.rowTitle, { name });
    b.dataset[by] = key;
    b.appendChild(flags(owner));
    const text = el('span', 'sr-find__rowtext');
    text.appendChild(el('span', 'sr-list__name sr-find__rowname', name));
    if (!noPathCount) text.appendChild(el('span', 'sr-find__rowsub', t(O.rowSub, { working: fmt.int(g.working), debris: fmt.int(g.debris) })));
    b.appendChild(text);
    b.appendChild(el('span', 'sr-list__value', noPathCount ? fmt.int(g.total) : t(O.row, { n: fmt.int(g.total) })));
    b.addEventListener('click', () => showGroup(by, key, name, owner));
    li.appendChild(b);
    return li;
  }

  /** A row for one craft: tapping it flies there when the map draws it. */
  function craftRow(r, value, why) {
    const rec = recordForNorad(r.norad, r.name);
    const li = el('li', 'sr-list__row');
    const node = rec ? button('sr-list__btn') : el('div', 'sr-list__static');
    const text = el('span', 'sr-find__rowtext');
    text.appendChild(el('span', 'sr-list__name', r.name));
    if (why) text.appendChild(el('span', 'sr-find__rowsub', why));
    node.append(text, el('span', 'sr-list__value', value || ''));
    if (rec) { node.title = t(F.rowTitle, { name: r.name }); node.addEventListener('click', () => ctx.select(rec)); }
    li.appendChild(node);
    return li;
  }

  let byNorad = null;
  window.addEventListener('sr:layer', () => { byNorad = null; });
  function recordForNorad(norad, name) {
    if (typeof ctx.recordById === 'function') { const r = ctx.recordById(`sat-${norad}`); if (r) return r; }
    if (!byNorad) {
      byNorad = new Map();
      for (const r of (ctx.records ? ctx.records() : [])) {
        const n = r.meta && (r.meta.noradId || r.meta.norad);
        if (n) byNorad.set(Number(n), r);
      }
    }
    if (byNorad.has(norad)) return byNorad.get(norad);
    // A craft beyond Earth orbit is a deep-space record with its own path file, matched by its name.
    const want = normName(name);
    for (const [id, e] of Object.entries(EPHEMERIDES)) {
      const have = normName(e.name);
      if (want && have && (want === have || want.startsWith(have) || have.startsWith(want))) { const r = ctx.recordById(id); if (r) return r; }
    }
    return null;
  }

  async function showGroup(by, key, name, owner) {
    detail.hidden = false;
    detail.textContent = '';
    st.owner = { by, key, name };
    writeLink({ [by]: key });
    const head = el('div', 'sr-find__detailhead');
    head.appendChild(flags(owner));
    head.appendChild(el('h3', 'sr-find__detailname', name));
    detail.appendChild(head);
    if (owner && owner.note === 'ussr') detail.appendChild(el('p', 'sr-sect__note', O.ussr));
    const res = await ask({ type: 'members', by, key }).catch(() => null);
    if (!res || st.owner.key !== key) return;
    const k = res.kinds;
    detail.appendChild(el('p', 'sr-find__kinds2', t(O.kinds, { working: fmt.int(k.working), dead: fmt.int(k.dead), rocket: fmt.int(k.rocket), debris: fmt.int(k.debris) })));
    const litLine = el('p', 'sr-sect__note', '');
    litLine.setAttribute('role', 'status');
    detail.appendChild(litLine);
    const actions = el('div', 'sr-find__actions');
    const ids = new Set(res.ids);
    const test = (r) => { const m = r.meta || {}; const n = Number(m.noradId || m.catalogueNumber); return ids.has(n); };
    const show = button('sr-btn sr-btn--quiet', O.show);
    show.addEventListener('click', () => {
      litLine.textContent = COPY.breakups.loadingActive;
      hl.set({ name, test, layers: ['active'] }).then((n) => { litLine.textContent = n ? t(O.lit, { n: fmt.int(n) }) : O.litNone; });
    });
    const clear = button('sr-btn sr-btn--quiet', O.clear);
    clear.addEventListener('click', () => { hl.clear(); litLine.textContent = ''; writeLink({}); });
    actions.append(show, clear);
    if (owner && owner.kind === 'country') {
      const a = el('a', 'sr-mission__link', t(O.page, { name }));
      a.href = new URL(`../../country/${COUNTRY_SLUG(owner.iso)}/`, import.meta.url).href;
      actions.appendChild(a);
    }
    detail.appendChild(actions);
    show.click();
    const np = res.noPath;
    detail.appendChild(el('h4', 'sr-micro', t(O.noPathTitle, { n: fmt.int(np.length) })));
    if (!np.length) detail.appendChild(el('p', 'sr-sect__note', O.noPathNone));
    const list = el('ul', 'sr-list sr-find__nopath');
    for (const r of np.slice(0, 60)) {
      const rec = r.why === 'deep-space' ? recordForNorad(r.norad, r.name) : null;
      const why = O.why[rec ? 'deep-drawn' : r.why];
      list.appendChild(craftRow(r, r.launchMs ? String(new Date(r.launchMs).getUTCFullYear()) : '', why));
    }
    detail.appendChild(list);
    if (typeof detail.scrollIntoView === 'function') detail.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
  }

  // ===================================================================================================
  // DEBRIS AND FLEETS
  // ===================================================================================================
  const cloudsPane = panes.get('clouds');
  cloudsPane.appendChild(el('h3', 'sr-micro', B.cloudsTitle));
  const cloudRow = el('div', 'sr-find__chips');
  const cloudBtns = new Map();
  for (const c of CLOUDS) {
    const b = button('sr-chip', B.names[c.id]);
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => (st.cloud === c.id ? clearCloud() : showCloud(c.id)));
    cloudRow.appendChild(b);
    cloudBtns.set(c.id, b);
  }
  cloudsPane.appendChild(cloudRow);
  const cloudDetail = el('div', 'sr-find__detail');
  cloudDetail.hidden = true;
  cloudsPane.appendChild(cloudDetail);
  cloudsPane.appendChild(el('h3', 'sr-micro', B.fleetsTitle));
  const fleetRow = el('div', 'sr-find__chips');
  const fleetBtns = new Map();
  for (const c of CONSTELLATIONS) {
    const b = button('sr-chip', B.fleets[c.id]);
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => (st.fleet === c.id ? clearFleet() : showFleet(c.id)));
    fleetRow.appendChild(b);
    fleetBtns.set(c.id, b);
  }
  cloudsPane.appendChild(fleetRow);
  const fleetLine = el('p', 'sr-sect__note');
  fleetLine.setAttribute('role', 'status');
  cloudsPane.appendChild(fleetLine);
  cloudsPane.appendChild(el('p', 'sr-sect__note', B.fleetNote));

  function paintClouds() {
    for (const [id, b] of cloudBtns) { b.setAttribute('aria-pressed', st.cloud === id ? 'true' : 'false'); b.classList.toggle('is-on', st.cloud === id); }
    for (const [id, b] of fleetBtns) { b.setAttribute('aria-pressed', st.fleet === id ? 'true' : 'false'); b.classList.toggle('is-on', st.fleet === id); }
  }

  function stopPlay() {
    if (st.play) cancelAnimationFrame(st.play);
    st.play = 0;
  }

  function clearCloud() {
    stopPlay();
    st.cloud = null;
    cloudDetail.hidden = true;
    hl.clear();
    writeLink({});
    paintClouds();
  }
  function clearFleet() {
    st.fleet = null;
    fleetLine.textContent = '';
    hl.clear();
    writeLink({});
    paintClouds();
  }

  async function showCloud(id, opts = {}) {
    const c = cloudById(id);
    if (!c) return;
    stopPlay();
    st.cloud = id;
    st.fleet = null;
    fleetLine.textContent = '';
    paintClouds();
    writeLink({ debris: id });
    cloudDetail.hidden = false;
    cloudDetail.textContent = '';
    cloudDetail.appendChild(el('h3', 'sr-find__detailname', B.names[id]));
    cloudDetail.appendChild(el('p', 'sr-find__why', B.why[id]));
    const counts = el('p', 'sr-find__kinds2', '');
    cloudDetail.appendChild(counts);
    const lit = el('p', 'sr-sect__note', B.loadingDebris);
    lit.setAttribute('role', 'status');
    cloudDetail.appendChild(lit);
    hl.set({ name: B.names[id], test: (r) => recordInCloud(r, c), layers: ['debris-field'] }).then((n) => { if (st.cloud === id) lit.textContent = t(B.lit, { n: fmt.int(n) }); });
    lists().then((L) => {
      const k = L.clouds.find((x) => x.id === id);
      if (k && st.cloud === id) counts.textContent = t(B.counts, { up: fmt.int(k.up), catalogued: fmt.int(k.catalogued) });
    }).catch(() => {});

    cloudDetail.appendChild(el('h4', 'sr-micro', B.spreadTitle));
    const steps = el('div', 'sr-find__chips');
    const goStep = (ms) => {
      stopPlay();
      hl.spread(c);
      try { ctx.clock.goTo(ms); } catch { /* the pill says where the clock is */ }
      if (ctx.timePill) ctx.timePill.paint();
    };
    for (const k of ['event', 'week', 'year']) {
      const b = button('sr-chip', B.steps[k]);
      b.addEventListener('click', () => goStep(c.eventMs + STEP_MS[k]));
      steps.appendChild(b);
    }
    const today = button('sr-chip', B.steps.today);
    today.addEventListener('click', () => goStep(presentMs()));
    steps.appendChild(today);
    if (!reduced()) {
      const play = button('sr-chip', B.play);
      play.addEventListener('click', () => {
        if (st.play) { stopPlay(); play.textContent = B.play; return; }
        hl.spread(c);
        const from = c.eventMs;
        const to = presentMs();
        const t0 = performance.now();
        play.textContent = B.stop;
        const tick = () => {
          const k = Math.min(1, (performance.now() - t0) / PLAY_MS);
          // Eased in time as the eye needs it: the first days, when the cloud strings out, take as long as the years.
          const ms = from + (to - from) * k ** 3;
          try { ctx.clock.goTo(ms); } catch { /* nothing */ }
          if (ctx.timePill) ctx.timePill.paint();
          if (k < 1 && st.cloud === id) st.play = requestAnimationFrame(tick); else { st.play = 0; play.textContent = B.play; }
        };
        st.play = requestAnimationFrame(tick);
      });
      steps.appendChild(play);
    }
    const back = button('sr-chip sr-chip--quiet', B.places);
    back.addEventListener('click', () => { stopPlay(); hl.spread(null); try { ctx.clock.live(); } catch { /* nothing */ } if (ctx.timePill) ctx.timePill.paint(); });
    steps.appendChild(back);
    cloudDetail.appendChild(steps);
    cloudDetail.appendChild(el('p', 'sr-sect__note', B.spreadNote));
    const src = el('p', 'sr-sect__note');
    src.appendChild(el('span', 'sr-find__srclabel', B.source));
    const a = el('a', 'sr-mission__link', c.source.name);
    a.href = c.source.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    src.appendChild(a);
    cloudDetail.appendChild(src);
    if (opts.atEvent) goStep(c.eventMs);
  }

  function showFleet(id) {
    const c = constellationById(id);
    if (!c) return;
    stopPlay();
    st.fleet = id;
    st.cloud = null;
    cloudDetail.hidden = true;
    paintClouds();
    writeLink({ constellation: id });
    fleetLine.textContent = B.loadingActive;
    hl.set({ name: B.fleets[id], test: (r) => recordInConstellation(r, c), layers: ['active'] }).then((n) => { if (st.fleet === id) fleetLine.textContent = t(B.fleetLit, { n: fmt.int(n) }); });
  }

  // ===================================================================================================
  // opening
  // ===================================================================================================
  function open(tab, opts = {}) {
    if (ctx.shell && typeof ctx.shell.show === 'function') ctx.shell.show('find');
    setTab(TABS.includes(tab) ? tab : st.tab || 'property');
    if (opts.find) { const q = parseFind(opts.find); if (q) { st.q = q; setTab('property'); paintProperty(); run(); } }
    else if (st.tab === 'property' && opts.run !== false) { paintProperty(); run(); }
    if (opts.chart) openChart(opts.chart === 'sun' ? null : opts.chart);
    if (opts.mode && MODES.includes(opts.mode)) { st.mode = opts.mode; if (st.tab === 'country') paintCountry(); }
    if (opts.owner || opts.operator) {
      const by = opts.owner ? 'owner' : 'operator';
      const key = opts.owner ? String(opts.owner).toUpperCase() : String(opts.operator).toLowerCase();
      st.mode = by === 'owner' ? 'countries' : 'operators';
      lists().then(() => {
        paintCountry();
        const ow = by === 'owner' ? ownerOf(key) : null;
        const op = by === 'operator' ? operatorById(key) : null;
        if (ow || op) showGroup(by, key, ow ? ownerName(ow) : op.name, ow);
      }).catch(() => paintCountry());
    }
    if (opts.debris) showCloud(String(opts.debris).toLowerCase(), { atEvent: !!opts.atEvent });
    if (opts.constellation) showFleet(String(opts.constellation).toLowerCase());
    const first = panes.get(st.tab).querySelector('button, input, select');
    if (first && opts.focus !== false) first.focus({ preventScroll: true });
  }

  /** The keys of a link, as the address bar had them. */
  function openLink(keys = {}) {
    // A link is not a hand on the panel: the focus stays where the page put it.
    if (keys.find) return open('property', { find: keys.find, focus: false });
    if (keys.owner) return open('country', { owner: keys.owner, focus: false });
    if (keys.operator) return open('country', { operator: keys.operator, focus: false });
    if (keys.debris) return open('clouds', { debris: keys.debris, focus: false });
    if (keys.constellation) return open('clouds', { constellation: keys.constellation, focus: false });
    return open('property', { focus: false });
  }

  // Leaving the view stops a play; the highlight stays until its pill's × or Clear, and its key stays in the
  // address with it (the link shows what is lit). A question with nothing lit leaves the address with the view.
  window.addEventListener('sr:shell', (e) => {
    if (!e.detail || e.detail.view === 'find') return;
    stopPlay();
    if (!hl.current()) writeLink({});
  });
  window.addEventListener('sr:find-highlight', (e) => {
    if (e.detail && e.detail.on) return;
    st.cloud = null;
    st.fleet = null;
    cloudDetail.hidden = true;
    fleetLine.textContent = '';
    paintClouds();
    writeLink(ctx.shell && ctx.shell.view() === 'find' && st.tab === 'property' ? { find: findText(st.q) } : {});
  });

  const api = { root, open, openLink, close: () => { stopPlay(); if (ctx.shell) ctx.shell.back(); }, highlight: hl };
  ctx.find = api;
  return api;
}
